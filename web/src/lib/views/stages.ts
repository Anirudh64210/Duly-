import type { EngineOutput, Stage, StageWindow } from "../compute";
import { READING_TAG, formatDate, itemName, levelName } from "../labels";

// design-1 sections 6, 7 and 8: what the screens read from the output's stages. Every
// date and number here is the engine's or the person's own; nothing is counted here.

export const B2_LINE = "Whether it applies to you is a question for your DSO.";
export const SCOPE_WORDS = "from the dates you entered";
export const CHECKLIST_LINK = "Open the checklist →";
export const TIMELINE_LINK = "Every date and count, by phase, is on Timeline →";

export function stagesOf(output: EngineOutput): readonly Stage[] {
  return output.stages ?? [];
}

/** The stage entered now, when the engine names one. */
export function currentStage(output: EngineOutput): Stage | null {
  return stagesOf(output).find((stage) => stage.state === "current") ?? null;
}

/** The stage's kind in the pack: its own id, or the id before its record. */
export function stageKind(stage: Pick<Stage, "id" | "stage">): string {
  return stage.stage ?? stage.id;
}

/**
 * B1: a stage is named only with its scope, and not while a verdict reason rests on it.
 * Round B's eyebrow: "F-1 · <STAGE>, FROM THE DATES YOU ENTERED", or "F-1" alone.
 */
export function stageEyebrow(output: EngineOutput): string {
  const stage = currentStage(output);
  if (stage === null || (stage.reasons ?? []).length > 0) return "F-1";
  return `F-1 · ${stage.label}, ${SCOPE_WORDS}`.toUpperCase();
}

/** The window whose opening day a next stage is known by: the first with an opening day. */
export function filingWindow(stage: Stage): StageWindow | null {
  return (stage.windows ?? []).find((window) => window.opens !== null) ?? null;
}

/** "opens <date>", or "opened <date>" once the engine's days away fall below zero (RQ-E6). */
export function opensWords(window: StageWindow): string {
  if (window.opens === null) return "";
  const verb = window.opens_days_away !== null && window.opens_days_away < 0 ? "opened" : "opens";
  return `${verb} ${formatDate(window.opens)}`;
}

/** "Filing window in the rule for your dates: <opens> to <closes>.", reading marked. */
export function windowSpanLine(window: StageWindow): string {
  if (window.opens === null || window.closes === null) return "";
  const closes = formatDate(window.closes) + (window.reading ? ` (${READING_TAG})` : "");
  return `Filing window in the rule for your dates: ${formatDate(window.opens)} to ${closes}.`;
}

/** "<confirmed> of <total> confirmed by you", from the engine's own count. */
export function confirmedWords(output: EngineOutput, stage: Stage): string | null {
  if (!stage.checklist) return null;
  const list = (output.checklists ?? []).find((entry) => entry.id === stage.checklist);
  if (list === undefined) return null;
  return `${list.confirmed} of ${list.total} confirmed by you`;
}

/** A span as entered or computed, with either end left out when it is not known. */
export function spanWords(starts: string | null | undefined, ends: string | null | undefined) {
  if (starts && ends) return `${formatDate(starts)} to ${formatDate(ends)}`;
  if (starts) return `From ${formatDate(starts)}`;
  if (ends) return `To ${formatDate(ends)}`;
  return "";
}

/**
 * The name of an item that belongs to a stage. An item of a window takes the window's
 * own label from the pack, so an id is never shown.
 */
export function stageItemName(itemId: string, stage: Stage): string {
  for (const window of stage.windows ?? []) {
    const record = window.record ? `.${window.record}` : "";
    const base = record && window.id.endsWith(record) ? window.id.slice(0, -record.length) : null;
    if (base === null || window.label === undefined) continue;
    if (itemId === `${base}.opens${record}`) return `${window.label}: opens`;
    if (itemId === `${base}.closes${record}`) return `${window.label}: closes`;
  }
  return itemName(itemId);
}

// Names of the fields a person entered, as the screens word them.
const FIELD_NAMES: ReadonlyMap<string, string> = new Map(
  Object.entries({
    school_name: "School",
    field_name: "Field of study",
    level: "Level",
    start_date: "Program start date",
    end_date: "Program end date",
    state: "Where the program stands",
    conferred_on: "Degree conferred",
    coursework_done_on: "Course requirements done",
    time: "Full-time or part-time",
    dso_on: "DSO recommendation",
    filed_on: "Form I-765 filed",
    decided_on: "Decided",
    card_start: "Card start",
    card_end: "Card end",
    left_on: "Left the US",
    returned_on: "Came back",
    release_date: "Release date",
    i20_issued_on: "Form I-20 issued",
  }),
);

const CHOICE_WORDS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    in_progress: "Still studying",
    completed: "Completed",
    left_before_completing: "Stopped before its end date",
    full_time: "Full-time",
    part_time: "Part-time",
  }),
);

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The stage's facts as plain lines, as entered: "Program end date: Dec 13, 2025". A field
 * with no name on this screen is left out rather than shown by its id.
 */
export function factLines(stage: Stage): string[] {
  const lines: string[] = [];
  for (const [path, value] of Object.entries(stage.facts ?? {})) {
    const field = path.slice(path.lastIndexOf(".") + 1);
    const name = FIELD_NAMES.get(field);
    if (name === undefined || value === null || value === undefined) continue;
    let shown: string;
    if (typeof value === "string" && ISO_DAY.test(value)) shown = formatDate(value);
    else if (field === "level" && typeof value === "string") shown = levelName(value);
    else if (typeof value === "string") shown = CHOICE_WORDS.get(value) ?? value;
    else continue;
    lines.push(`${name}: ${shown}`);
  }
  return lines;
}

/** A fact of the stage's own record, by field. */
export function stageFact(stage: Stage, field: string): unknown {
  const facts = stage.facts ?? {};
  const key = stage.record ? `${stage.record}.${field}` : field;
  return facts[key];
}

/** The title of a stage's row: the person's own name for it, else the pack's label. */
export function stageTitle(stage: Stage): string {
  if (stage.own_name) return stage.own_name;
  if (stageKind(stage) === "program") {
    const own = [stageFact(stage, "field_name"), stageFact(stage, "school_name")].filter(
      (part): part is string => typeof part === "string" && part !== "",
    );
    if (own.length > 0) return own.join(", ");
  }
  return stage.label;
}
