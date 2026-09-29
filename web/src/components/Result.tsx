import { useId, useState } from "react";
import { z } from "zod";

import type { ComputedItem, Confirmations, EngineOutput, ShownRule } from "../lib/compute";
import {
  GROUPS,
  QUESTION_NOT_SHOWN,
  READING_LABEL,
  READING_TAG,
  SOURCE_WORDS,
  VERBATIM_LINE,
  answerLine,
  becauseLine,
  formatDate,
  formatValue,
  groupOf,
  inputName,
  itemName,
  legalStatusWords,
  questionCopy,
  reasonText,
  scopeLine,
  settingName,
  statusTag,
  todayLine,
} from "../lib/labels";
import { headline } from "../lib/status";

const periodSchema = z.object({
  start: z.string(),
  end: z.string().nullable(),
  hours_per_week: z.number(),
  employer_reported: z.boolean(),
});

const NOT_ENTERED = "Not entered";

function periodLine(raw: unknown): string {
  const period = periodSchema.safeParse(raw);
  if (!period.success) return "This entry could not be shown.";
  const { start, end, hours_per_week, employer_reported } = period.data;
  const until = end === null ? "no end date" : `to ${formatDate(end)}`;
  const reported = employer_reported ? "reported" : "not marked as reported";
  return `${formatDate(start)}, ${until}, ${formatValue(hours_per_week, "hours_per_week")}, ${reported}`;
}

function InputValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <>{NOT_ENTERED}</>;
  if (typeof value === "string") return <>{formatDate(value)}</>;
  if (typeof value === "number") return <>{String(value)}</>;
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <>None entered</>;
    if (value.every((entry) => typeof entry === "string")) {
      return (
        <ul className="periods">
          {value.map((entry) => (
            <li key={entry}>{settingName(entry)}</li>
          ))}
        </ul>
      );
    }
    return (
      <ol className="periods">
        {value.map((entry, index) => (
          <li key={index}>{periodLine(entry)}</li>
        ))}
      </ol>
    );
  }
  return <>This entry could not be shown.</>;
}

function RuleCard({ id, rule }: { id: string; rule: ShownRule }) {
  const tag = statusTag(rule.status);
  const reading = rule.derivation === "reading";
  return (
    <li className="rule">
      <p className="rule-head">
        {/* A flag has no value to read: the rule is its words. */}
        {rule.unit !== "flag" && (
          <span className="rule-value">{formatValue(rule.value, rule.unit)}</span>
        )}
        <span className="rule-id">{id}</span>
        {tag && <span className="tag">{tag}</span>}
        {reading && <span className="tag">{READING_TAG}</span>}
      </p>
      {rule.quote && (
        <figure className="quote">
          <figcaption>{SOURCE_WORDS}</figcaption>
          <blockquote>{rule.quote}</blockquote>
        </figure>
      )}
      {rule.derivation === "verbatim" && <p className="derivation">{VERBATIM_LINE}</p>}
      {reading && (
        <div className="reading">
          <p className="reading-label">{READING_LABEL}</p>
          <p>{rule.note}</p>
        </div>
      )}
      <p>
        <a href={rule.url} target="_blank" rel="noreferrer">
          {rule.citation}
        </a>
      </p>
      <p className="checked">Checked {formatDate(rule.checked_on)}.</p>
    </li>
  );
}

function Values({ item }: { item: ComputedItem }) {
  const alternates = item.alternates ?? [];
  if (alternates.length === 0) {
    return <span className="value">{formatValue(item.value, item.unit)}</span>;
  }
  // The status is the one the engine read from the pack. The screen holds none of its own.
  const operative = item.operative?.legal_status ?? "";
  return (
    <span className="regimes">
      <span className="regime">
        <span className="value">{formatValue(item.value, item.unit)}</span>
        <span className="legal">{legalStatusWords(operative)}</span>
      </span>
      {alternates.map((alternate) => (
        <span className="regime" key={alternate.regime}>
          <span className="value">{formatValue(alternate.value, item.unit)}</span>
          <span className="legal">{legalStatusWords(alternate.legal_status)}</span>
        </span>
      ))}
    </span>
  );
}

function ItemRow({ item, rules }: { item: ComputedItem; rules: EngineOutput["rules"] }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const tag = statusTag(item.status);

  return (
    <li className="item">
      <button
        type="button"
        className="item-row"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen(!open)}
      >
        <span className="item-name">
          {itemName(item.id)}
          {tag && <span className="tag">{tag}</span>}
        </span>
        <Values item={item} />
      </button>
      {open && (
        <div className="working" id={panel}>
          <h4>Inputs used</h4>
          <dl>
            {Object.entries(item.inputs).map(([key, value]) => (
              <div key={key}>
                <dt>{inputName(key)}</dt>
                <dd>
                  <InputValue value={value} />
                </dd>
              </div>
            ))}
          </dl>
          <h4>Rules used</h4>
          <ul className="rules">
            {item.rule_ids.map((id) => {
              const rule = rules[id];
              return rule ? <RuleCard key={id} id={id} rule={rule} /> : null;
            })}
          </ul>
        </div>
      )}
    </li>
  );
}

export function Verdict(props: { output: EngineOutput; onChangeZone: () => void }) {
  const { verdict, scope, computed, today } = props.output;
  // Two reasons may read the same. Each line is shown once.
  const lines = [...new Set(verdict.reasons.map((reason) => reasonText(reason, computed)))];
  return (
    <section className="verdict" data-state={verdict.state}>
      <h1>{headline(verdict.state)}</h1>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p className="scope">{scopeLine(scope.documents_count, scope.rules_checked_on)}</p>
      <p className="scope">
        {todayLine(today.date, today.time_zone)}{" "}
        <button type="button" className="quiet" onClick={props.onChangeZone}>
          Change the time zone
        </button>
      </p>
    </section>
  );
}

export function Questions(props: {
  output: EngineOutput;
  /** The answers sent with the case this result was computed from. */
  sent: Confirmations;
  busy: boolean;
  onAnswer: (question: string, given: boolean) => void;
  onWithdraw: (question: string) => void;
}) {
  const { output, sent, busy, onAnswer, onWithdraw } = props;
  const open = new Set(output.questions.map((question) => question.id));
  const answered = Object.entries(sent).filter(([id]) => !open.has(id));
  if (open.size === 0 && answered.length === 0) return null;

  return (
    <>
      {output.questions.length > 0 && (
        <section className="questions" aria-labelledby="questions-open">
          <h3 id="questions-open">Questions for you</h3>
          <ul>
            {output.questions.map((question) => {
              const copy = questionCopy(question.id);
              return (
                <li className="question" key={question.id}>
                  <p className="ask">{copy ? copy.ask : QUESTION_NOT_SHOWN}</p>
                  <p className="because">{becauseLine(question.because)}</p>
                  {copy && (
                    <div className="answers" role="group" aria-label={copy.ask}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onAnswer(question.id, true)}
                      >
                        {copy.yes}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onAnswer(question.id, false)}
                      >
                        {copy.no}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {answered.length > 0 && (
        <section className="questions" aria-labelledby="questions-answered">
          <h3 id="questions-answered">Your answers, sent with these dates</h3>
          <ul>
            {answered.map(([id, given]) => {
              const copy = questionCopy(id);
              if (!copy) return null;
              return (
                <li className="question" key={id}>
                  <p className="ask">{copy.ask}</p>
                  <p className="given">{answerLine(copy, given)}</p>
                  <div className="answers" role="group" aria-label={copy.ask}>
                    <button
                      type="button"
                      className="quiet"
                      disabled={busy}
                      onClick={() => onAnswer(id, !given.answer)}
                    >
                      Change the answer to "{given.answer ? copy.no : copy.yes}"
                    </button>
                    <button
                      type="button"
                      className="quiet"
                      disabled={busy}
                      onClick={() => onWithdraw(id)}
                    >
                      Remove the answer
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

/** Rules the engine sent that no item names: the words that go with the verdict. */
export function VerdictRules({ output }: { output: EngineOutput }) {
  const named = new Set(output.computed.flatMap((item) => item.rule_ids));
  const beside = Object.entries(output.rules).filter(([id]) => !named.has(id));
  if (beside.length === 0) return null;
  return (
    <section className="group">
      <h3>What the rule says</h3>
      <ul className="rules">
        {beside.map(([id, rule]) => (
          <RuleCard key={id} id={id} rule={rule} />
        ))}
      </ul>
    </section>
  );
}

export function Items({ output }: { output: EngineOutput }) {
  return (
    <>
      {GROUPS.map((group) => {
        const items = output.computed.filter((item) => groupOf(item.id) === group);
        if (items.length === 0) return null;
        return (
          <section className="group" key={group}>
            <h3>{group}</h3>
            <ul className="items">
              {items.map((item) => (
                <ItemRow key={item.id} item={item} rules={output.rules} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
