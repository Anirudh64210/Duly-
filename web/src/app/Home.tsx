import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { caseDraft, stemStepDraft } from "../lib/drafts";
import type { EngineOutput } from "../lib/compute";
import type { Sent } from "../lib/drafts";
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
  shownValue,
  groupOf,
  itemName,
  needsAnswer,
  CHECKIN_ANSWERS,
  checkinRecord,
  questionCopy,
  questionTitle,
  reasonItem,
} from "../lib/labels";
import { LANDMARKS } from "../lib/shots";
import { headline, type VerdictState } from "../lib/status";
import { useStore } from "./caseStore";
import {
  Chevron,
  Disclose,
  DraftPill,
  Footer,
  HeroMark,
  OneOpen,
  RuleBlocks,
  Row,
  Working,
} from "./parts";
import { refusalLines } from "./refusal";
import {
  B2_LINE,
  CHECKLIST_LINK,
  TIMELINE_LINK,
  confirmedWords,
  currentStage,
  filingWindow,
  stageEyebrow,
  stageItemName,
  stageKind,
  stagesOf,
  windowSpanLine,
} from "../lib/views/stages";

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
  /** Only a verdict carries Home's landmark; the refusal hero never does. */
  landmark?: boolean;
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
      <h1 className="hero-headline" data-landmark={props.landmark ? LANDMARKS["/"] : undefined}>
        {title}
      </h1>
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

/**
 * ui-1 point 1: every verdict reason in plain words, each line once. A reason a question
 * was asked because of reads as that question does in the questions section.
 */
function Reasons({ output }: { output: EngineOutput }) {
  const records = useStore().body?.records ?? [];
  const reasons = [...output.verdict.reasons].sort(
    (a, b) => Number(needsAnswer(b)) - Number(needsAnswer(a)),
  );
  const lines = new Map<string, string>();
  for (const reason of reasons) {
    const asked = output.questions.find((question) => question.because.includes(reason));
    const line = asked ? questionTitle(asked.id, records) : appReasonLine(reason, output.computed);
    if (!lines.has(line)) lines.set(line, reason);
  }
  return (
    <>
      {[...lines].map(([line, reason]) => {
        const item = reasonItem(reason.replace(/\.not_made$/, ""), output.computed);
        return (
          <div key={line} className="reason">
            <p className="reason-line">
              {line}
              {item?.reading === true && <span className="reading"> · {READING_TAG}</span>}
            </p>
            {item !== undefined && (
              <Disclose label="How Duly counted">
                <p className="value-line">
                  {itemName(item.id)}: {shownValue(item)}
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
  const stage = currentStage(output);
  // Round B: the current stage's end; round A: next.opt.card_ends.
  const staged = stagesOf(output).length > 0;
  const upcomingCard = output.upcoming.find((entry) => entry.id === CARD_ENDS);
  const card = staged
    ? stage?.ends
      ? { date: stage.ends, rule_ids: stage.rule_ids, days: stage.ends_days_away ?? null }
      : undefined
    : upcomingCard && { date: upcomingCard.date, rule_ids: upcomingCard.rule_ids, days: null };
  const cpt =
    stage !== null && stageKind(stage) === "program"
      ? output.computed.find((item) => item.id === "cpt.full_time_days_used")
      : undefined;
  if (used === undefined && card === undefined && cpt === undefined) return null;
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
            <p className="metric-value">{shownValue({ ...used, unit: "" })}</p>
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
            {card.days !== null && <p className="metric-meta">{card.days} days from today</p>}
          </div>
        )}
        {cpt !== undefined && (
          <div className="metric">
            <button
              type="button"
              className="metric-eyebrow"
              aria-expanded={open === "cpt"}
              onClick={() => toggle("cpt")}
            >
              FULL-TIME CPT
            </button>
            <p className="metric-value">{shownValue({ ...cpt, unit: "" })}</p>
            <p className="metric-meta">days in what you entered</p>
          </div>
        )}
      </div>
      {open === "unemployment" && used !== undefined && (
        <div className="drop-in">
          <Working item={used} output={output} />
        </div>
      )}
      {open === "cpt" && cpt !== undefined && (
        <div className="drop-in">
          <Working item={cpt} output={output} />
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

function QuestionsSection({ output, sent }: { output: EngineOutput; sent: Sent }) {
  const { answer, body } = useStore();
  if (output.questions.length === 0) return null;
  return (
    <section className="section rise d3" aria-labelledby="questions-heading" id="questions">
      <h2 className="eyebrow" id="questions-heading">
        QUESTIONS FOR YOU
      </h2>
      {output.questions.map((question) => {
        const copy =
          questionCopy(question.id) ??
          (checkinRecord(question.id) === null ? null : CHECKIN_ANSWERS);
        const rule = factRule(question.id);
        return (
          <Row
            key={question.id}
            id={`q:${question.id}`}
            title={questionTitle(question.id, body?.records)}
            meta={becauseLine(question.because, question.about)}
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

/** design-1 section 6, round B: next-stage rows from the stages, then the current dates. */
function StagedNext({ output }: { output: EngineOutput }) {
  const next = stagesOf(output).filter((stage) => stage.state === "next");
  const current = currentStage(output);
  const own = new Set(current?.items ?? []);
  const dated = output.upcoming.filter((entry) => own.has(entry.id));
  if (next.length === 0 && dated.length === 0) return null;
  return (
    <section className="section rise d3" aria-labelledby="next-heading">
      <h2 className="eyebrow" id="next-heading">
        WHAT COMES NEXT
      </h2>
      {next.map((stage) => {
        const window = filingWindow(stage);
        const span = window === null ? "" : windowSpanLine(window);
        const confirmed = confirmedWords(output, stage);
        return (
          <Row
            key={stage.id}
            id={`next:${stage.id}`}
            title={stage.label}
            {...(span === "" ? {} : { meta: span })}
          >
            <p>{B2_LINE}</p>
            {confirmed !== null && <p>{confirmed} in the list.</p>}
            {window !== null && <RuleBlocks ids={window.rule_ids} output={output} />}
            {stage.checklist && (
              <a className="link" href="#/checklists">
                {CHECKLIST_LINK}
              </a>
            )}
          </Row>
        );
      })}
      {dated.map((entry) => (
        <Row
          key={entry.id}
          id={`next:${entry.id}`}
          title={current === null ? itemName(entry.id) : stageItemName(entry.id, current)}
          meta={formatDate(entry.date) + (entry.reading ? ` · ${READING_TAG}` : "")}
        >
          <RuleBlocks ids={entry.rule_ids} output={output} />
        </Row>
      ))}
    </section>
  );
}

function NextSection({ output, sent }: { output: EngineOutput; sent: Sent }) {
  if (stagesOf(output).length > 0) return <StagedNext output={output} />;
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

function DataSection({ output, sent }: { output: EngineOutput; sent: Sent }) {
  const named = new Set<string>();
  const stages = stagesOf(output);
  for (const entry of [
    ...output.computed,
    ...output.upcoming,
    ...output.lists,
    ...stages,
    ...stages.flatMap((stage) => stage.windows ?? []),
    ...(output.checklists ?? []).flatMap((list) => list.steps),
  ]) {
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
  if (stages.length > 0) {
    // Round B: Timeline holds every item under its stage (RQ-P3).
    return (
      <section className="section rise d3" aria-labelledby="data-heading">
        <h2 className="eyebrow" id="data-heading">
          DATES, COUNTS AND RULES
        </h2>
        <p className="section-end">
          <a className="link" href="#/timeline">
            {TIMELINE_LINK}
          </a>
        </p>
        {other.length > 0 && (
          <Row id="rules:other" title="Other rules Duly read for this verdict">
            <RuleBlocks ids={other} output={output} />
          </Row>
        )}
      </section>
    );
  }
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
                    {shownValue(item)}
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
  const { held, sent, output, busy, error, retry } = useStore();
  if (held !== null && !(held.status === "f1")) {
    const name = held.status === "other" ? "" : categoryName(held.status);
    return (
      <div className="page">
        <Hero
          state="cannot_tell"
          landmark
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
  if (busy || output === undefined || sent === null) {
    return (
      <div className="page">
        <Busy />
        <Footer />
      </div>
    );
  }
  const state = output.verdict.state;
  const next = output.upcoming[0];
  const asking = state === "cannot_tell" && output.questions.length > 0;
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
            <span className="hero-eyebrow">{stageEyebrow(output)}</span>
          </div>
          <h1 className="hero-headline" data-landmark={LANDMARKS["/"]}>
            {headline(state)}
          </h1>
          {asking ? (
            <>
              <p className="reason-line">
                {output.questions.length} {output.questions.length === 1 ? "answer" : "answers"}{" "}
                would let Duly go on with your dates.
              </p>
              <Disclose label="Why">
                <Reasons output={output} />
              </Disclose>
            </>
          ) : (
            <Reasons output={output} />
          )}
          <p className="scope-line">{datesScopeLine(output.scope.rules_checked_on)}</p>
          {showNext && (
            <p className="next-line">
              Next: {itemName(next.id)}, {formatDate(next.date)}.
              {next.reading && <span className="reading"> {READING_TAG}</span>}
            </p>
          )}
          {state === "talk_to_dso" && <DraftPill text={caseDraft(output, sent)} />}
          {state === "cannot_tell" && !asking && <DraftPill text={caseDraft(output, sent)} />}
          <Metrics output={output} />
          {asking && (
            <section className="section" aria-labelledby="next-move-heading">
              <h2 className="eyebrow" id="next-move-heading">
                YOUR NEXT MOVE
              </h2>
              <div className="row">
                <button
                  type="button"
                  className="row-head"
                  onClick={() =>
                    document.querySelector<HTMLButtonElement>("#questions .row-head")?.focus()
                  }
                >
                  <span className="row-text">
                    <span className="row-title">Answer Duly's questions</span>
                  </span>
                  <Chevron />
                </button>
              </div>
            </section>
          )}
        </section>
        <QuestionsSection output={output} sent={sent} />
        <NextSection output={output} sent={sent} />
        <DataSection output={output} sent={sent} />
        <div className="spacer" />
        <Footer />
      </div>
    </OneOpen>
  );
}
