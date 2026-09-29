import type { ComputedItem, Confirmation, ItemStatus } from "./compute";
import { reasonLine } from "./status";

// Every word a user reads about a computed item. Names state what the item is,
// never what it means.

export const GROUPS = [
  "OPT",
  "Unemployment",
  "STEM OPT",
  "Grace period",
  "Cap-gap",
  "CPT",
  "Other",
] as const;
export type Group = (typeof GROUPS)[number];

const GROUP_OF: ReadonlyMap<string, Group> = new Map(
  Object.entries({
    opt: "OPT",
    unemployment: "Unemployment",
    employment: "Unemployment",
    stem: "STEM OPT",
    grace: "Grace period",
    capgap: "Cap-gap",
    cpt: "CPT",
  }),
);

export function groupOf(itemId: string): Group {
  return GROUP_OF.get(itemId.split(".")[0] ?? "") ?? "Other";
}

const ITEM_NAMES: ReadonlyMap<string, string> = new Map(
  Object.entries({
    "opt.apply_window_opens": "OPT filing window opens",
    "opt.apply_window_closes": "OPT filing window closes",
    "opt.file_by": "Last OPT filing day after the DSO recommendation",
    "opt.latest_start": "Latest OPT start date",
    "opt.complete_by": "Date OPT is to be completed by",
    "unemployment.limit": "Unemployment day limit",
    "unemployment.days_used": "Days with no employment period",
    "unemployment.days_remaining": "Limit minus days with no employment period",
    "employment.days_under_hours": "Days under the weekly hours rule",
    "employment.periods_not_reported": "Employment periods not marked as reported",
    "grace.ends": "Grace period ends",
    "stem.apply_window_opens": "STEM OPT filing window opens",
    "stem.apply_window_closes": "STEM OPT filing window closes",
    "stem.file_by": "Last STEM OPT filing day after the DSO recommendation",
    "stem.evaluation_12_month_due": "12-month evaluation due",
    "stem.final_evaluation_due_from_ead_end": "Final evaluation due, counted from the EAD end date",
    "cpt.full_time_days_used": "Full-time CPT days entered",
    "capgap.ends": "Cap-gap period ends",
  }),
);

const VALIDATION = /^stem\.validation_(\d+)_due$/;

function plain(code: string): string {
  const words = code.replaceAll(/[._:]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function itemName(itemId: string): string {
  const known = ITEM_NAMES.get(itemId);
  if (known) return known;
  const report = VALIDATION.exec(itemId);
  if (report) return `Validation report ${report[1]} due`;
  return plain(itemId) || "Item";
}

const INPUT_NAMES: ReadonlyMap<string, string> = new Map(
  Object.entries({
    program_end_date: "Program end date",
    opt: "OPT dates",
    stem: "STEM OPT dates",
    cap_gap: "Cap-gap petition",
    "opt.dso_recommendation_date": "OPT DSO recommendation date",
    "opt.ead_start": "OPT EAD start date",
    "opt.ead_end": "OPT EAD end date",
    "stem.dso_recommendation_date": "STEM OPT DSO recommendation date",
    "stem.ead_start": "STEM OPT EAD start date",
    "stem.ead_end": "STEM OPT EAD end date",
    today: "Date of the computation",
    employment: "Employment periods",
    cpt_full_time_days: "Full-time CPT days",
    "cap_gap.requested_start": "Requested start date",
    "cap_gap.status": "Petition status",
    "cap_gap.change_of_status": "Change of status requested",
    duly_settings: "Duly settings used, which are not law",
  }),
);

// Mirrors the meaning lines in contracts/product_settings.yaml.
const SETTING_NAMES: ReadonlyMap<string, string> = new Map(
  Object.entries({
    "product.open_item_lookahead_days": "How far ahead a dated item is listed as an open item",
    "product.opt_start_earliest_years_before_program_end":
      "How early an OPT start date is read as a likely typing mistake",
  }),
);

export function settingName(settingId: string): string {
  return SETTING_NAMES.get(settingId) ?? (plain(settingId) || "Setting");
}

// A whole part of the case that the engine found absent.
const MISSING_PARTS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    opt: "Duly needs the OPT dates.",
    stem: "Duly needs the STEM OPT dates.",
    employment: "Duly needs the employment periods that are not entered yet.",
  }),
);

export function inputName(key: string): string {
  return INPUT_NAMES.get(key) ?? (plain(key) || "Input");
}

const STATUS_TAGS: Record<Exclude<ItemStatus, "settled">, string> = {
  guidance: "Guidance",
  litigated: "Before a court",
  proposed: "Proposed",
  school: "School policy",
};

/** The tag for a status, or null for settled, which carries no tag. */
export function statusTag(status: string): string | null {
  if (status === "settled") return null;
  if (status in STATUS_TAGS && Object.hasOwn(STATUS_TAGS, status)) {
    return STATUS_TAGS[status as keyof typeof STATUS_TAGS];
  }
  return plain(status) || "Status not given";
}

const LEGAL_STATUS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    effective: "in effect",
    enjoined: "blocked by a court",
    vacated: "set aside by a court",
    appealed: "under appeal",
    final: "final, not applied",
    proposed: "proposed",
  }),
);

export function legalStatusWords(legalStatus: string): string {
  return LEGAL_STATUS.get(legalStatus) ?? (plain(legalStatus).toLowerCase() || "status not given");
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_DAY = /^(\d{2})-(\d{2})$/;

/** An ISO date in words. Formats the text the engine gave; never reads the clock. */
export function formatDate(iso: string): string {
  const parts = ISO_DATE.exec(iso);
  if (!parts) return iso;
  const made = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
  return made.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" });
}

function formatMonthDay(text: string): string {
  const parts = MONTH_DAY.exec(text);
  if (!parts) return text;
  const made = new Date(Date.UTC(2000, Number(parts[1]) - 1, Number(parts[2])));
  return made.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

const UNIT_WORDS: ReadonlyMap<string, readonly [string, string]> = new Map(
  Object.entries({
    days: ["day", "days"],
    months: ["month", "months"],
    business_days: ["business day", "business days"],
    hours_per_week: ["hour a week", "hours a week"],
  }),
);

export const NOT_COMPUTED = "Not computed";

/** A value from the engine or a rule, with its unit, as the user reads it. */
export function formatValue(value: number | string | boolean | null, unit: string): string {
  if (value === null) return NOT_COMPUTED;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    if (unit === "date") return ISO_DATE.test(value) ? formatDate(value) : formatMonthDay(value);
    return value;
  }
  const words = UNIT_WORDS.get(unit);
  if (!words) return String(value);
  return `${value} ${Math.abs(value) === 1 ? words[0] : words[1]}`;
}

const CONFLICTS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    opt_end: "The OPT EAD end date is before its start date.",
    stem_end: "The STEM OPT EAD end date is before its start date.",
    opt_start: "The OPT EAD start date and the program end date do not fit together.",
    stem_start: "The STEM OPT EAD start date is on or before the OPT EAD end date.",
  }),
);

const EMPLOYMENT_CONFLICT = /^employment_(\d+)_end$/;

const FINDINGS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    hours_under_threshold:
      "Some days are under the weekly hours rule. Whether they count is a question for your DSO.",
    unemployment_at_or_over_limit: "The days with no employment period are at or over the limit.",
    cpt_full_time_at_or_over_bar:
      "The full-time CPT days entered are at or over the number in the rule.",
    cap_gap_petition_not_active:
      "The petition entered is not pending or approved with a change of status.",
    report_employer: "An employment period is not marked as reported.",
    stem_without_post_completion_opt:
      "You answered that you had no period of post-completion OPT before the STEM OPT period. The words of the rule are shown below. This part depends on your own situation, so it is a question for your DSO.",
    cap_gap_without_training:
      "You answered that you had no period of OPT or STEM OPT. This part depends on your own situation, so it is a question for your DSO.",
  }),
);

export type QuestionCopy = {
  /** What Duly asks. It asks what happened, never what to do. */
  ask: string;
  /** The button and the recorded words for each answer. */
  yes: string;
  no: string;
};

// The answer yes is sent as true and the answer no as false. What each one means
// to the engine is in specs/phase-2/SPEC-context.md, section 4.
const QUESTIONS: ReadonlyMap<string, QuestionCopy> = new Map(
  Object.entries({
    held_post_completion_opt: {
      ask: "STEM OPT dates are entered and OPT dates are not. Did you have a period of post-completion OPT before the STEM OPT period?",
      yes: "Yes, I had one",
      no: "No, I did not",
    },
    no_employment_to_record: {
      ask: "No employment period is entered. Is that the whole record, with no employment since the OPT EAD start date?",
      yes: "Yes, there is none",
      no: "No, there is some to add",
    },
    cap_gap_without_training: {
      ask: "A cap-gap petition is entered, and OPT and STEM OPT dates are not. Did you have a period of OPT or STEM OPT that is not entered here?",
      yes: "Yes, I had one",
      no: "No, I did not",
    },
  }),
);

/** The words for a question, or null for one this screen has no words for. */
export function questionCopy(questionId: string): QuestionCopy | null {
  return QUESTIONS.get(questionId) ?? null;
}

export const QUESTION_NOT_SHOWN =
  "Duly has a question that this screen does not have the words for yet.";

export function becauseLine(because: readonly string[]): string {
  return `Asked because of: ${because.map(inputName).join(", ")}.`;
}

/** The person's own statement, as recorded. */
export function answerLine(copy: QuestionCopy, given: Confirmation): string {
  return `You answered "${given.answer ? copy.yes : copy.no}" on ${formatDate(given.on)}.`;
}

export function todayLine(date: string, timeZone: string): string {
  return `Today is ${formatDate(date)} in ${zoneName(timeZone)}.`;
}

/** An IANA name as the person reads it. */
export function zoneName(timeZone: string): string {
  return timeZone.replaceAll("_", " ");
}

export const SOURCE_WORDS = "Words of the source";
export const VERBATIM_LINE = "The value is written in the quoted words.";
export const READING_TAG = "Duly's reading";
export const READING_LABEL = "Duly's reading of the quoted words, not the words of the source";

/** One verdict reason in plain words. Never a raw code, never an empty line. */
export function reasonText(reason: string, computed: readonly ComputedItem[] = []): string {
  const finding = FINDINGS.get(reason);
  if (finding) return finding;

  const item = computed.find((candidate) => candidate.id === reason);
  if (item && item.value !== null) {
    return `${itemName(item.id)}: ${formatValue(item.value, item.unit)}.`;
  }

  const split = reason.indexOf(":");
  const kind = split < 0 ? "" : reason.slice(0, split);
  const name = split < 0 ? "" : reason.slice(split + 1);
  if (kind === "unconfirmed") return "Duly is waiting for your answer to a question below.";
  if (kind === "missing") {
    const part = MISSING_PARTS.get(name);
    if (part) return part;
  }
  if (kind === "missing" && INPUT_NAMES.has(name)) {
    return `Duly needs the ${inputName(name)}.`;
  }
  if (kind === "conflict") {
    const known = CONFLICTS.get(name);
    if (known) return known;
    const period = EMPLOYMENT_CONFLICT.exec(name);
    if (period) return `Employment period ${period[1]} ends before it starts.`;
  }
  return reasonLine(reason);
}

export function scopeLine(documentsCount: number, rulesCheckedOn: string | null): string {
  const documents = documentsCount === 1 ? "1 document" : `${documentsCount} documents`;
  const rules =
    rulesCheckedOn === null
      ? "The rules have not been checked yet."
      : `Rules checked ${formatDate(rulesCheckedOn)}.`;
  return `Based on ${documents} you added. ${rules}`;
}
