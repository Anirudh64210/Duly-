import { useId, useState, type ReactNode } from "react";
import { z } from "zod";

import type {
  About,
  Alternate,
  ComputedItem,
  Confirmation,
  Confirmations,
  EngineOutput,
  F1Case,
  Regimes,
  ShownRule,
  Upcoming,
} from "../lib/compute";
import { answerFits } from "../lib/answers";
import { dsoDraft, stemDraft } from "../lib/drafts";
import {
  ANSWER_NOT_SHOWN,
  CHANGE_VALUE,
  EXACT_BUTTON,
  GROUPS,
  LIST_LINE,
  NEXT_HEADING,
  QUESTION_NOT_SHOWN,
  READING_LABEL,
  READING_TAG,
  SOURCE_WORDS,
  VERBATIM_LINE,
  PLAIN_HEADING,
  answerLine,
  becauseLine,
  changeButton,
  changeLine,
  computedName,
  conflictLine,
  conflictQuestionCopy,
  factLine,
  factRule,
  formatDate,
  formatValue,
  givenLine,
  groupOf,
  inputName,
  itemName,
  legalStatusWords,
  listName,
  needsAnswer,
  periodDay,
  periodSpan,
  questionCopy,
  reasonItem,
  reasonText,
  scopeLine,
  settingName,
  showsAbout,
  sourceLink,
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

// SPEC-resolutions point 29: an answer among an item's inputs, as the engine gives it.
const givenSchema = z.strictObject({ answer: z.boolean(), on: z.string() });

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
  const given = givenSchema.safeParse(value);
  if (given.success) return <>{givenLine(given.data.answer, given.data.on)}</>;
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

/** The exact words of a rule: the quote, how the value was read, the citation and the day. */
function ExactWords({ rule }: { rule: ShownRule }) {
  const reading = rule.derivation === "reading";
  return (
    <>
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
    </>
  );
}

/**
 * plain-1 section 2: a rule shows its plain words first, and the exact words one tap
 * away. A rule with no plain words shows its exact words as they are.
 */
function RuleCard({ id, rule }: { id: string; rule: ShownRule }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const reading = rule.derivation === "reading";
  return (
    <li className="rule">
      <p className="rule-head">
        {/* A flag has no value to read: the rule is its words. */}
        {rule.unit !== "flag" && (
          <span className="rule-value">{formatValue(rule.value, rule.unit)}</span>
        )}
        <span className="rule-id">{id}</span>
        <span className="tag">{statusTag(rule.status)}</span>
        {reading && <span className="tag">{READING_TAG}</span>}
      </p>
      {rule.plain ? (
        <>
          <div className="plain">
            <p className="plain-label">{PLAIN_HEADING}</p>
            <p>{rule.plain}</p>
          </div>
          <button
            type="button"
            className="quiet"
            aria-expanded={open}
            aria-controls={panel}
            onClick={() => setOpen(!open)}
          >
            {EXACT_BUTTON}
          </button>
          {open && (
            <div className="exact" id={panel}>
              <ExactWords rule={rule} />
            </div>
          )}
        </>
      ) : (
        <ExactWords rule={rule} />
      )}
    </li>
  );
}

/**
 * plain-1 section 3: a value that depends on a rule that is not simply in effect shows
 * what is true today first, with that rule's plain words and a link to its source. What
 * the other rule would change is one tap away. The legal status code is never shown.
 */
function CourtLine(props: {
  alternates: readonly Alternate[];
  operative: { regime: string; legal_status: string } | undefined;
  unit: string;
  regimes: Regimes | undefined;
}) {
  const { alternates, operative, unit, regimes } = props;
  const [open, setOpen] = useState(false);
  const panel = useId();
  const involved = new Map<string, string>();
  if (operative && operative.legal_status !== "effective") {
    involved.set(operative.regime, operative.legal_status);
  }
  for (const alternate of alternates) involved.set(alternate.regime, alternate.legal_status);
  const [first] = alternates;
  if (involved.size === 0) return null;
  return (
    <div className="rule-change">
      {[...involved].map(([id, legalStatus]) => {
        const regime = regimes?.[id];
        return (
          <div className="court" key={id}>
            <p>{regime?.plain ?? changeLine(legalStatus)}</p>
            {regime && (
              <p>
                <a href={regime.url} target="_blank" rel="noreferrer">
                  {sourceLink(legalStatus)}
                </a>
              </p>
            )}
          </div>
        );
      })}
      {first && (
        <>
          <button
            type="button"
            className="quiet"
            aria-expanded={open}
            aria-controls={panel}
            onClick={() => setOpen(!open)}
          >
            {changeButton(first.legal_status)}
          </button>
          {open && (
            <div className="working" id={panel}>
              <dl>
                {alternates.map((alternate) => (
                  <div key={alternate.regime}>
                    <dt>
                      {alternate.legal_status === "enjoined"
                        ? CHANGE_VALUE
                        : `Under the rule ${legalStatusWords(alternate.legal_status)}`}
                    </dt>
                    <dd>
                      <span className="value">{formatValue(alternate.value, unit)}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Marks({ status, reading }: { status: string; reading: boolean }) {
  return (
    <>
      <span className="tag">{statusTag(status)}</span>
      {reading && <span className="tag reading-tag">{READING_TAG}</span>}
    </>
  );
}

function ItemRow(props: {
  item: ComputedItem;
  rules: EngineOutput["rules"];
  regimes: Regimes | undefined;
}) {
  const { item, rules, regimes } = props;
  const [open, setOpen] = useState(false);
  const panel = useId();

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
          {computedName(item)}
          <Marks status={item.status} reading={item.reading} />
        </span>
        <span className="value">{formatValue(item.value, item.unit)}</span>
      </button>
      <CourtLine
        alternates={item.alternates ?? []}
        operative={item.operative}
        unit={item.unit}
        regimes={regimes}
      />
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

// SPEC section 5: where the verdict turns on Duly's count, the words of the regulation
// are shown beside it.
const COUNT_BESIDE: ReadonlyMap<string, string> = new Map(
  Object.entries({
    cpt_full_time_at_or_over_bar: "cpt.full_time_bar_days",
    unemployment_opt_card_at_or_over_limit: "opt.unemployment_limit_days",
  }),
);

export function Verdict(props: { output: EngineOutput; onChangeZone: () => void }) {
  const { verdict, scope, computed, today, rules } = props.output;
  // Two reasons may read the same. Each line is shown once.
  const lines = new Map<string, { reading: boolean; beside: string | undefined }>();
  // plain-1 section 5: what is known and settled first, then what needs an answer.
  const ordered = [
    ...verdict.reasons.filter((reason) => !needsAnswer(reason)),
    ...verdict.reasons.filter(needsAnswer),
  ];
  for (const reason of ordered) {
    const text = reasonText(reason, computed);
    const reading = reasonItem(reason, computed)?.reading ?? false;
    const beside = COUNT_BESIDE.get(reason);
    const held = lines.get(text);
    lines.set(text, {
      reading: reading || (held?.reading ?? false),
      beside: beside ?? held?.beside,
    });
  }
  return (
    <section className="verdict" data-state={verdict.state}>
      <h1>{headline(verdict.state)}</h1>
      {[...lines].map(([line, { reading, beside }]) => {
        const rule = beside === undefined ? undefined : rules[beside];
        return (
          <div className="verdict-line" key={line}>
            <p>
              {line}
              {reading && (
                <>
                  {" "}
                  <span className="tag reading-tag">{READING_TAG}</span>
                </>
              )}
            </p>
            {beside !== undefined && rule && (
              <ul className="rules">
                <RuleCard id={beside} rule={rule} />
              </ul>
            )}
          </div>
        );
      })}
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

/**
 * The values entered that raised a question, as the engine gave them. An employment
 * period is shown as its start and end (SPEC-resolutions point 34); an end the question
 * does not hold is taken from the case the question came from.
 */
function AboutValues({ about, entered }: { about: About; entered: F1Case | undefined }) {
  const rows: { key: string; name: string; shown: ReactNode }[] = [];
  const periods = new Set<number>();
  for (const [key, value] of Object.entries(about)) {
    const day = periodDay(key);
    if (day === null) {
      rows.push({ key, name: inputName(key), shown: <InputValue value={value} /> });
      continue;
    }
    if (periods.has(day.period)) continue;
    periods.add(day.period);
    const held = entered?.employment[day.period - 1];
    const start = about[`employment.${day.period}.start`] ?? held?.start;
    const endKey = `employment.${day.period}.end`;
    const end = Object.hasOwn(about, endKey) ? about[endKey] : held?.end;
    rows.push({
      key,
      name: `Employment period ${day.period}`,
      shown: periodSpan(start, end),
    });
  }
  return (
    <dl className="about">
      {rows.map(({ key, name, shown }) => (
        <div key={key}>
          <dt>{name}</dt>
          <dd>{shown}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Questions(props: {
  output: EngineOutput;
  /** The answers sent with the case this result was computed from. */
  sent: Confirmations;
  /** The case this result was computed from. */
  entered?: F1Case;
  busy: boolean;
  /** about: the values the question was raised for. The answer is kept with them. */
  onAnswer: (question: string, given: boolean, about: About | undefined) => void;
  onWithdraw: (question: string) => void;
}) {
  const { output, sent, entered, busy, onAnswer, onWithdraw } = props;
  const open = new Set(output.questions.map((question) => question.id));
  const reasons = output.verdict.reasons;
  // SPEC-resolutions point 33: an answer given for values that are not the ones the
  // engine read is never shown as standing.
  // Point 46: where the engine names the answers it read, only those stand.
  const read = output.answers_read;
  const fits = ([id, given]: [string, Confirmation]) => {
    if (read !== undefined) return read.includes(id);
    return entered === undefined ? given.about !== undefined : answerFits(given, entered, output);
  };
  const sentOnly = Object.entries(sent).filter(([id]) => !open.has(id));
  const answered = sentOnly.filter(fits);
  const unread = sentOnly.filter((entry) => !fits(entry));
  if (open.size === 0 && sentOnly.length === 0) return null;

  return (
    <>
      {output.questions.length > 0 && (
        <section className="questions" aria-labelledby="questions-open">
          <h3 id="questions-open">Questions for you</h3>
          <ul>
            {output.questions.map((question) => {
              const copy = conflictQuestionCopy(question.id, reasons);
              const fact = conflictLine(question.id, reasons);
              const ruleId = factRule(question.id);
              const rule = ruleId === null ? undefined : output.rules[ruleId];
              return (
                <li className="question" key={question.id}>
                  {fact && <p className="fact">{fact}</p>}
                  <p className="ask">{copy ? copy.ask : QUESTION_NOT_SHOWN}</p>
                  {(fact || showsAbout(question.id)) && question.about ? (
                    <AboutValues about={question.about} entered={entered} />
                  ) : (
                    <p className="because">{becauseLine(question.because)}</p>
                  )}
                  {ruleId !== null && rule && (
                    <ul className="rules">
                      <RuleCard id={ruleId} rule={rule} />
                    </ul>
                  )}
                  {copy && (
                    <div className="answers" role="group" aria-label={copy.ask}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onAnswer(question.id, true, question.about)}
                      >
                        {copy.yes}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onAnswer(question.id, false, question.about)}
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
              if (!copy) {
                return (
                  <li className="question" key={id}>
                    <p className="ask">{ANSWER_NOT_SHOWN}</p>
                    <div className="answers">
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
              }
              return (
                <li className="question" key={id}>
                  <AnsweredFact id={id} reasons={reasons} />
                  <p className="ask">{copy.ask}</p>
                  <p className="given">{answerLine(copy, given)}</p>
                  <div className="answers" role="group" aria-label={copy.ask}>
                    <button
                      type="button"
                      className="quiet"
                      disabled={busy}
                      onClick={() => onAnswer(id, !given.answer, given.about)}
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
      {unread.length > 0 && (
        <section className="questions" aria-labelledby="questions-unread">
          <h3 id="questions-unread">Answers not used for the facts entered now</h3>
          <p>{UNREAD_LINE}</p>
          <ul>
            {unread.map(([id]) => (
              <li className="question" key={id}>
                <p className="ask">{questionCopy(id)?.ask ?? ANSWER_NOT_SHOWN}</p>
                <div className="answers">
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
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

const UNREAD_LINE =
  "Duly did not use these answers for the facts entered now. They are not shown as your answers.";

/**
 * The line of a conflict the person answered. It is said in the present tense only
 * while the verdict still holds the conflict (SPEC-resolutions point 33).
 */
function AnsweredFact({ id, reasons }: { id: string; reasons: readonly string[] }) {
  const line = factLine(id);
  if (line === null) return null;
  if (reasons.includes(id) || reasons.includes(`conflict:${id}`)) {
    return <p className="fact">{line}</p>;
  }
  return <p className="fact">{FACT_WHEN_ASKED}</p>;
}

const FACT_WHEN_ASKED = "When Duly asked this, some of the dates entered did not fit together.";

/** Rules the engine sent that no item names: the words that go with the verdict. */
export function VerdictRules({ output }: { output: EngineOutput }) {
  const named = new Set(
    [...output.computed, ...output.upcoming, ...output.lists].flatMap((entry) => entry.rule_ids),
  );
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
                <ItemRow key={item.id} item={item} rules={output.rules} regimes={output.regimes} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

const DRAFT_LINE =
  "Duly drafted it from the dates you entered, in your words. It holds no date Duly computed. Duly never sends it.";

function DraftBlock({ draft }: { draft: string }) {
  return (
    <>
      <h4>An email you can send to your DSO</h4>
      <p>{DRAFT_LINE}</p>
      <pre className="draft">{draft}</pre>
      <CopyButton text={draft} />
    </>
  );
}

/** plain-1 section 4: the draft for a talk_to_dso verdict. */
export function DsoDraft(props: { output: EngineOutput; sent: F1Case }) {
  const draft = dsoDraft(props.output, props.sent);
  if (draft === null) return null;
  return (
    <section className="group" aria-labelledby="draft-heading">
      <h3 id="draft-heading">Your question for your DSO</h3>
      <DraftBlock draft={draft} />
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState<boolean | null>(null);
  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };
  return (
    <p>
      <button type="button" onClick={copy}>
        Copy the email
      </button>{" "}
      {copied === true && <span role="status">Copied.</span>}
      {copied === false && (
        <span role="status">The browser did not allow the copy. Select the words above.</span>
      )}
    </p>
  );
}

/**
 * SPEC-resolutions point 32: a date ahead opens to its rules, with the value, the words,
 * the citation and the link, and for a reading the pack's note marked as Duly's reading.
 */
function UpcomingRow(props: {
  entry: Upcoming;
  rules: EngineOutput["rules"];
  regimes: Regimes | undefined;
}) {
  const { entry, rules, regimes } = props;
  const [open, setOpen] = useState(false);
  const panel = useId();
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
          {itemName(entry.id)}
          <Marks status={entry.status} reading={entry.reading} />
        </span>
        <span className="value">{formatDate(entry.date)}</span>
      </button>
      <CourtLine
        alternates={entry.alternates ?? []}
        operative={entry.operative}
        unit="date"
        regimes={regimes}
      />
      {open && (
        <div className="working" id={panel}>
          <h4>Rules used</h4>
          <ul className="rules">
            {entry.rule_ids.map((id) => {
              const rule = rules[id];
              return rule ? <RuleCard key={id} id={id} rule={rule} /> : null;
            })}
          </ul>
        </div>
      )}
    </li>
  );
}

/**
 * SPEC section 6: the dates that lie ahead, soonest first, then what the regulation
 * lists for the step the rules place next, and a drafted question for the DSO.
 */
export function WhatComesNext(props: { output: EngineOutput; sent: F1Case }) {
  const { upcoming, lists, rules } = props.output;
  if (upcoming.length === 0 && lists.length === 0) return null;
  const first = upcoming.find((entry) => entry.id.startsWith("next."));
  return (
    <section className="group next" aria-labelledby="next-heading">
      <h3 id="next-heading">{NEXT_HEADING}</h3>
      {upcoming.length > 0 && (
        <ol className="items upcoming">
          {upcoming.map((entry) => (
            <UpcomingRow
              key={entry.id}
              entry={entry}
              rules={rules}
              regimes={props.output.regimes}
            />
          ))}
        </ol>
      )}
      {lists.map((list) => {
        const shown = list.rule_ids.flatMap((id) => {
          const rule = rules[id];
          return rule ? [{ id, rule }] : [];
        });
        const citation = shown[0]?.rule.citation ?? "the regulation";
        const draft = stemDraft(props.sent, citation);
        return (
          <div className="list" key={list.id}>
            <h4>{listName(list.id)}</h4>
            {first && (
              <p className="beside">
                {itemName(first.id)}: {formatDate(first.date)}
              </p>
            )}
            <p className="list-line">{LIST_LINE}</p>
            <ol className="listed rules">
              {shown.map(({ id, rule }) => (
                <RuleCard key={id} id={id} rule={rule} />
              ))}
            </ol>
            <DraftBlock draft={draft} />
          </div>
        );
      })}
    </section>
  );
}
