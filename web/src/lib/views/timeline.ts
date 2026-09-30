import type { EngineOutput, Stage } from "../compute";
import { appReasonLine, categoryName, formatDate, formatValue } from "../labels";
import type { Status } from "../status";
import {
  B2_LINE,
  CHECKLIST_LINK,
  confirmedWords,
  factLines,
  filingWindow,
  opensWords,
  spanWords,
  stageFact,
  stageKind,
  stageTitle,
  stagesOf,
  windowSpanLine,
} from "./stages";

// design-1 section 7: Timeline, one row for each stage the engine gives, in its order.

export const TIMELINE_META = "From the dates you entered";
export const TIMELINE_FOOTER = "Every phase keeps its dates and rules together.";
export const LIST_IN_CHECKLIST =
  "What the regulation lists for the extension is in the checklist, each with its citation.";
export const SETTINGS_LINK = "Open Settings →";

// SPEC-resolutions point 23a: an unknown stage's row carries no mark.
export type Mark = "done" | "now" | "next" | "later" | "dso" | "none";

export const MARK_NAMES: Record<Mark, string> = {
  done: "Done",
  now: "Now",
  next: "Next",
  later: "Later",
  dso: "A question for your DSO",
  none: "",
};

// SPEC-resolutions point 22: the words of a stage whose dates a petition makes null.
export const DSO_DATES_LINE = "Your DSO can tell you these dates";
export const STEP_BACK_REASON = "cap_gap.for_dso";

export type TimelineRow = {
  key: string;
  title: string;
  mark: Mark;
  meta: string;
  /** The open part's plain lines. */
  lines: string[];
  /** Ids of the stage's items, shown as item lines. */
  items: string[];
  /** The stage the items belong to. */
  stage: Stage | null;
  /** The current stage's bar: the engine's days in over its days in all. */
  bar: { days_in: number; days_total: number } | null;
  /** The current stage's application line, from the dates entered. */
  application: string | null;
  checklist: boolean;
  settings: boolean;
};

export type TimelineView = { rows: TimelineRow[] };

function markOf(stage: Stage): Mark {
  if (stage.state === "unknown") return "none";
  if (stage.state === "current") return (stage.reasons ?? []).length > 0 ? "dso" : "now";
  if (stage.state === "done") return "done";
  if (stage.state === "next") return "next";
  return "later";
}

function timeWords(stage: Stage): string {
  const time = stageFact(stage, "time");
  if (time === "full_time") return ", full-time";
  if (time === "part_time") return ", part-time";
  return "";
}

function cptRow(stages: Stage[]): TimelineRow {
  const spans = stages.map((stage) => spanWords(stage.starts, stage.ends)).filter(Boolean);
  const current = stages.find((stage) => stage.state === "current");
  const done = stages.every((stage) => stage.state === "done");
  return {
    key: `cpt:${stages[0]?.id ?? ""}`,
    title: "CPT",
    mark: current ? markOf(current) : done ? "done" : markOf(stages[0] as Stage),
    meta: spans.join(" · "),
    lines: stages
      .filter((stage) => spanWords(stage.starts, stage.ends) !== "")
      .map((stage) => spanWords(stage.starts, stage.ends) + timeWords(stage)),
    items: stages.flatMap((stage) => stage.items),
    stage: stages.length === 1 ? (stages[0] ?? null) : null,
    bar: null,
    application: null,
    checklist: false,
    settings: false,
  };
}

function applicationLine(stage: Stage): string | null {
  const parts: string[] = [];
  const filed = stageFact(stage, "filed_on");
  const decided = stageFact(stage, "decided_on");
  if (typeof filed === "string") parts.push(`Filed ${formatDate(filed)}`);
  if (typeof decided === "string") parts.push(`Decided ${formatDate(decided)}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function currentMeta(stage: Stage): string {
  const parts: string[] = [];
  if (typeof stage.days_in === "number" && typeof stage.days_total === "number") {
    parts.push(`Day ${stage.days_in} of ${stage.days_total}`);
  }
  const span = spanWords(stage.starts, stage.ends);
  if (span !== "") {
    const card = stageFact(stage, "card_start") !== undefined ? "card " : "";
    const lead = /^(From|To) /u.test(span) ? span.charAt(0).toLowerCase() + span.slice(1) : span;
    parts.push(card + lead);
  }
  return parts.join(" · ");
}

function stageRow(output: EngineOutput, stage: Stage): TimelineRow {
  const mark = markOf(stage);
  const row: TimelineRow = {
    key: stage.id,
    title: stageTitle(stage),
    mark,
    meta: spanWords(stage.starts, stage.ends),
    lines: [],
    items: stage.items,
    stage,
    bar: null,
    application: null,
    checklist: false,
    settings: false,
  };
  if (stage.state === "unknown") {
    row.meta = "";
    row.items = [];
    const stepBack = output.verdict.reasons.includes(STEP_BACK_REASON)
      ? appReasonLine(STEP_BACK_REASON, output.computed)
      : "";
    row.lines = [`${DSO_DATES_LINE}.`, stepBack].filter(Boolean);
  } else if (stage.state === "done") {
    row.lines = factLines(stage);
  } else if (stage.state === "current") {
    row.meta = currentMeta(stage);
    if (mark === "dso") {
      const first = (stage.reasons ?? [])[0];
      if (first !== undefined)
        row.meta = [appReasonLine(first), row.meta].filter(Boolean).join(" · ");
    }
    if (typeof stage.days_in === "number" && typeof stage.days_total === "number") {
      row.bar = { days_in: stage.days_in, days_total: stage.days_total };
    }
    row.application = applicationLine(stage);
  } else if (stage.state === "next") {
    const window = filingWindow(stage);
    const confirmed = confirmedWords(output, stage);
    const opens = window === null ? "" : `Filing window in the rule ${opensWords(window)}`;
    row.meta = [opens, confirmed].filter(Boolean).join(" · ");
    const months = stage.rule_ids.find((id) => id.endsWith("extension_months"));
    const rule = months === undefined ? undefined : output.rules[months];
    const allows =
      rule !== undefined && typeof rule.value === "number"
        ? `The rule allows a ${formatValue(rule.value, "")} month extension.`
        : "";
    const span = window === null ? "" : windowSpanLine(window);
    row.lines = [[allows, span].filter(Boolean).join(" "), B2_LINE].filter(Boolean);
    if ((stage.lists ?? []).length > 0 || stage.checklist) row.lines.push(LIST_IN_CHECKLIST);
    row.checklist = Boolean(stage.checklist);
    row.items = [];
  }
  return row;
}

/** Beyond: packs for other categories that hold at least one rule. No prediction. */
function beyondRow(output: EngineOutput, status: Status | null): TimelineRow | null {
  if (status === null) return null;
  const own = new Set(output.rulepacks.map((pack) => pack.category));
  const names = status.rulepacks
    .filter((pack) => !own.has(pack.category) && pack.parameters > 0)
    .map((pack) => categoryName(pack.category));
  if (names.length === 0) return null;
  const joined = names.join(", ");
  return {
    key: "beyond",
    title: "Beyond",
    mark: "later",
    meta: joined,
    lines: [`Duly holds rules for ${joined}, each with its source. They are listed in Settings.`],
    items: [],
    stage: null,
    bar: null,
    application: null,
    checklist: false,
    settings: true,
  };
}

export function timelineView(output: EngineOutput, status: Status | null): TimelineView {
  const rows: TimelineRow[] = [];
  const stages = stagesOf(output);
  const cpt = stages.filter((stage) => stageKind(stage) === "cpt");
  for (const stage of stages) {
    if (stageKind(stage) === "cpt") {
      if (stage === cpt[0]) rows.push(cptRow(cpt));
      continue;
    }
    rows.push(stageRow(output, stage));
  }
  const beyond = beyondRow(output, status);
  if (beyond !== null) rows.push(beyond);
  return { rows };
}

export { CHECKLIST_LINK };
