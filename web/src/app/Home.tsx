import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { caseDraft, stemStepDraft } from "../lib/drafts";
import type { EngineOutput, F1Case } from "../lib/compute";
import {
  GROUPS,
  LIST_LINE,
  NAMED_STATUS_LINE,
  READING_TAG,
  STEM_LIST_NAME,
  STEM_ROW_TITLE,
  appReasonLine,
  becauseLine,
  categoryName,
  datesScopeLine,
  factRule,
  formatDate,
  formatDay,
  formatValue,
  groupOf,
  itemName,
  needsAnswer,
  questionCopy,
  reasonItem,
} from "../lib/labels";
import { headline, type VerdictState } from "../lib/status";
import { useStore } from "./caseStore";
import { Disclose, DraftPill, Footer, HeroMark, OneOpen, RuleBlocks, Row, Working } from "./parts";
import { refusalLines } from "./refusal";

const STEM_LIST = "stem.extension.what_the_regulation_lists";
const CARD_ENDS = "next.opt.card_ends";

/** The width of a bar: a picture of two engine values, never shown as a number. */
export function barShare(used: number, limit: number): number {
  if (!(limit > 0) || !(used >= 0)) return 0;
  return Math.min(1, used / limit);
}

function Hero(props: {
  state: VerdictState;
  eyebrow: string;
  lines: readonly string[];
  scope?: string;
  children?: ReactNode;
}) {
  const [every, setEvery] = useState(false);
  const title = headline(props.state);
  const shown = every || props.lines.length <= 3 ? props.lines : props.lines.slice(0, 2);
  return (
    <section className="hero rise d1" data-state={props.state} aria-label="Verdict">
      <div className="hero-top">
        <span className="mark-wrap">
          {props.state === "no_open_items" && <span className="halo" data-testid="halo" />}
          <HeroMark state={props.state} name={title} />
        </span>
        <span className="hero-eyebrow">{props.eyebrow}</span>
      </div>
      <h1 className="hero-headline">{title}</h1>
      {shown.map((line) => (
        <p key={line} className="reason-line">
          {line}
        </p>
      ))}
      {!every && props.lines.length > 3 && (
        <button type="button" className="text-button" onClick={() => setEvery(true)}>
          Show every reason
        </button>
      )}
      {props.scope !== undefined && <p className="scope-line">{props.scope}</p>}
      {props.children}
    </section>
  );
}

function Busy() {
  const [late, setLate] = useState(false);
  useTimeout(() => setLate(true), 300);
  if (!late) return <section className="hero" aria-busy="true" />;
  return (
    <section className="hero" aria-busy="true">
      <p className="busy-line">
        <span className="busy-mark" aria-hidden="true" />
        Working it out from your dates.
      </p>
    </section>
  );
}

function useTimeout(run: () => void, ms: number) {
  useEffect(() => {
    const timer = setTimeout(run, ms);
    return () => clearTimeout(timer);
    // Once for each mount: the busy state starts empty for its first 300ms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function Reasons({ output }: { output: EngineOutput }) {
  const reasons = [...output.verdict.reasons].sort(
    (a, b) => Number(needsAnswer(b)) - Number(needsAnswer(a)),
  );
  return (
    <>
      {reasons.map((reason) => {
        const item = reasonItem(reason.replace(/\.not_made$/, ""), output.computed);
        return (
          <div key={reason} className="reason">
            <p className="reason-line">
              {appReasonLine(reason, output.computed)}
              {item?.reading === true && <span className="reading"> · {READING_TAG}</span>}
            </p>
            {item !== undefined && (
              <Disclose label="How Duly counted">
                <p className="value-line">
                  {itemName(item.id)}: {formatValue(item.value, item.unit)}
                </p>
                <Working item={item} output={output} />
              </Disclose>
            )}
          </div>
        );
      })}
    </>
  );
}

function Metrics({ output }: { output: EngineOutput }) {
  const [open, setOpen] = useState<string | null>(null);
  const used = output.computed.find((item) => item.id === "unemployment.days_used");
  const limit = output.computed.find((item) => item.id === "unemployment.limit");
  const card = output.upcoming.find((entry) => entry.id === CARD_ENDS);
  if (used === undefined && card === undefined) return null;
  const toggle = (id: string) => setOpen((now) => (now === id ? null : id));
  const share =
    typeof used?.value === "number" && typeof limit?.value === "number"
      ? barShare(used.value, limit.value)
      : null;
  return (
    <section className="metrics rise d2" aria-label="Counts">
      <div className="metric-row">
        {used !== undefined && (
          <div className="metric">
            <button
              type="button"
              className="metric-eyebrow"
              aria-expanded={open === "unemployment"}
              onClick={() => toggle("unemployment")}
            >
              UNEMPLOYMENT COUNT
            </button>
            <p className="metric-value">{formatValue(used.value, "")}</p>
            {limit !== undefined && (
              <p className="metric-meta">of {formatValue(limit.value, "")} days in the rule</p>
            )}
            {share !== null && (
              <div className="bar" aria-hidden="true">
                <span className="bar-fill" style={{ width: `${share * 100}%` }} />
              </div>
            )}
          </div>
        )}
        {card !== undefined && (
          <div className="metric">
            <button
              type="button"
              className="metric-eyebrow"
              aria-expanded={open === "card"}
              onClick={() => toggle("card")}
            >
              EAD CARD ENDS
            </button>
            <p className="metric-value date-value">{formatDate(card.date)}</p>
          </div>
        )}
      </div>
      {open === "unemployment" && used !== undefined && (
        <div className="drop-in">
          <Working item={used} output={output} />
        </div>
      )}
      {open === "card" && card !== undefined && (
        <div className="drop-in working">
          <h4>Rules used</h4>
          <RuleBlocks ids={card.rule_ids} output={output} />
        </div>
      )}
    </section>
  );
}

function QuestionsSection({ output, sent }: { output: EngineOutput; sent: F1Case }) {
  const { answer } = useStore();
  if (output.questions.length === 0) return null;
  return (
    <section className="section rise d3" aria-labelledby="questions-heading" id="questions">
      <h2 className="eyebrow" id="questions-heading">
        QUESTIONS FOR YOU
      </h2>
      {output.questions.map((question) => {
        const copy = questionCopy(question.id);
        const rule = factRule(question.id);
        return (
          <Row
            key={question.id}
            id={`q:${question.id}`}
            title={copy?.ask ?? "Duly has a question about what you entered."}
            meta={becauseLine(question.because)}
          >
            {rule !== null && <RuleBlocks ids={[rule]} output={output} />}
            {copy !== null && (
              <div className="pill-row">
                <button
                  type="button"
                  className="pill-secondary"
                  onClick={() => answer(question.id, true, question.about)}
                >
                  {copy.yes}
                </button>
                <button
                  type="button"
                  className="pill-secondary"
                  onClick={() => answer(question.id, false, question.about)}
                >
                  {copy.no}
                </button>
              </div>
            )}
          </Row>
        );
      })}
      {output.verdict.state === "cannot_tell" && <DraftPill text={caseDraft(output, sent)} />}
      <p className="section-end">
        <a className="link" href="#/case">
          Your answers are in Your case →
        </a>
      </p>
    </section>
  );
}

function NextSection({ output, sent }: { output: EngineOutput; sent: F1Case }) {
  const opens = output.upcoming.find((entry) => entry.id === "next.stem.apply_window_opens");
  const closes = output.upcoming.find((entry) => entry.id === "next.stem.apply_window_closes");
  const list = output.lists.find((entry) => entry.id === STEM_LIST);
  const stemRow = list !== undefined || opens !== undefined || closes !== undefined;
  const dated = output.upcoming
    .filter((entry) => entry.id !== CARD_ENDS && !entry.id.startsWith("next.stem."))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (!stemRow && dated.length === 0) return null;
  const reading = opens?.reading === true || closes?.reading === true;
  let meta = "";
  if (opens !== undefined && closes !== undefined) {
    meta = `Filing window in the rule for your dates: ${formatDate(opens.date)} to ${formatDate(closes.date)}.`;
  } else if (closes !== undefined) {
    meta = `Filing window in the rule for your dates closes ${formatDate(closes.date)}.`;
  }
  if (reading) meta += ` · ${READING_TAG}`;
  const stemRules = [
    ...(opens?.rule_ids ?? []),
    ...(closes?.rule_ids ?? []),
    ...(list?.rule_ids ?? []),
  ];
  const citation = list ? (output.rules[list.rule_ids[0] ?? ""]?.citation ?? "") : "";
  return (
    <section className="section rise d3" aria-labelledby="next-heading">
      <h2 className="eyebrow" id="next-heading">
        WHAT COMES NEXT
      </h2>
      {stemRow && (
        <Row id="next:stem" title={STEM_ROW_TITLE} {...(meta === "" ? {} : { meta })}>
          <p>{LIST_LINE}</p>
          {list !== undefined && <p className="list-name">{STEM_LIST_NAME}</p>}
          <RuleBlocks ids={stemRules} output={output} />
          <DraftPill text={stemStepDraft(sent, citation || "the rule")} />
        </Row>
      )}
      {dated.map((entry) => (
        <Row
          key={entry.id}
          id={`next:${entry.id}`}
          title={itemName(entry.id)}
          meta={formatDate(entry.date) + (entry.reading ? ` · ${READING_TAG}` : "")}
        >
          <RuleBlocks ids={entry.rule_ids} output={output} />
        </Row>
      ))}
    </section>
  );
}

function periodLine(start: string, end: string | null, reported: boolean): string {
  const span =
    end === null ? `${formatDate(start)} onward` : `${formatDate(start)} to ${formatDate(end)}`;
  return `${span}: ${reported ? "marked as reported" : "not marked as reported"}`;
}

function DataSection({ output, sent }: { output: EngineOutput; sent: F1Case }) {
  const named = new Set<string>();
  for (const entry of [...output.computed, ...output.upcoming, ...output.lists]) {
    entry.rule_ids.forEach((id) => named.add(id));
  }
  for (const question of output.questions) {
    const rule = factRule(question.id);
    if (rule !== null) named.add(rule);
  }
  const other = Object.keys(output.rules).filter((id) => !named.has(id));
  const groups = GROUPS.map((group) => ({
    group,
    items: output.computed.filter((item) => groupOf(item.id) === group),
  })).filter((entry) => entry.items.length > 0);
  if (groups.length === 0 && other.length === 0) return null;
  return (
    <section className="section rise d3" aria-labelledby="data-heading">
      <h2 className="eyebrow" id="data-heading">
        DATES, COUNTS AND RULES
      </h2>
      {groups.map(({ group, items }) => (
        <Row
          key={group}
          id={`group:${group}`}
          title={group}
          meta={[...new Set(items.map((item) => itemName(item.id)))].join(" · ")}
        >
          {items.map((item) =>
            item.id === "employment.periods_not_reported" ? (
              sent.employment.map((period) => (
                <p key={period.start} className="item-line">
                  {periodLine(period.start, period.end, period.employer_reported)}
                </p>
              ))
            ) : (
              <div key={item.id} className="item">
                <p className="item-line">
                  <span className="item-name">{itemName(item.id)}</span>
                  <span className="item-value">
                    {formatValue(item.value, item.unit)}
                    {item.reading && <span className="reading"> · {READING_TAG}</span>}
                  </span>
                </p>
                <Disclose label="How Duly counted">
                  <Working item={item} output={output} />
                </Disclose>
              </div>
            ),
          )}
        </Row>
      ))}
      {other.length > 0 && (
        <Row id="rules:other" title="Other rules Duly read for this verdict">
          <RuleBlocks ids={other} output={output} />
        </Row>
      )}
    </section>
  );
}

export function Home() {
  const { held, body, output, busy, error, retry } = useStore();
  if (held !== null && !(held.status === "f1")) {
    const name = held.status === "other" ? "" : categoryName(held.status);
    return (
      <div className="page">
        <Hero
          state="cannot_tell"
          eyebrow={name || "YOUR STATUS"}
          lines={[
            name === "" ? NAMED_STATUS_LINE : appReasonLine(`category_not_covered:${held.status}`),
          ]}
        />
        <Footer />
      </div>
    );
  }
  if (error !== null) {
    return (
      <div className="page">
        <Hero state="cannot_tell" eyebrow="F-1" lines={refusalLines(error)}>
          <button type="button" className="pill-secondary" onClick={retry}>
            Try again
          </button>
        </Hero>
        <Footer />
      </div>
    );
  }
  if (busy || output === undefined || body === null) {
    return (
      <div className="page">
        <Busy />
        <Footer />
      </div>
    );
  }
  const state = output.verdict.state;
  const next = output.upcoming[0];
  const showNext = next !== undefined && (state === "no_open_items" || state === "needs_you");
  return (
    <OneOpen>
      <div className="page">
        <p className="date-line rise">{formatDay(output.today.date)}</p>
        <section className="hero rise d1" data-state={state} aria-label="Verdict">
          <div className="hero-top">
            <span className="mark-wrap">
              {state === "no_open_items" && <span className="halo" data-testid="halo" />}
              <HeroMark state={state} name={headline(state)} />
            </span>
            <span className="hero-eyebrow">F-1</span>
          </div>
          <h1 className="hero-headline">{headline(state)}</h1>
          <Reasons output={output} />
          <p className="scope-line">{datesScopeLine(output.scope.rules_checked_on)}</p>
          {showNext && (
            <p className="next-line">
              Next: {itemName(next.id)}, {formatDate(next.date)}.
              {next.reading && <span className="reading"> {READING_TAG}</span>}
            </p>
          )}
          {state === "talk_to_dso" && <DraftPill text={caseDraft(output, body)} />}
          {state === "cannot_tell" &&
            (output.questions.length > 0 ? (
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  document.querySelector<HTMLButtonElement>("#questions .row-head")?.focus()
                }
              >
                Answer Duly's questions
              </button>
            ) : (
              <DraftPill text={caseDraft(output, body)} />
            ))}
        </section>
        <Metrics output={output} />
        <QuestionsSection output={output} sent={body} />
        <NextSection output={output} sent={body} />
        <DataSection output={output} sent={body} />
        <div className="spacer" />
        <Footer />
      </div>
    </OneOpen>
  );
}
