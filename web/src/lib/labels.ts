import type { ComputedItem, ItemStatus } from "./compute";
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
  }),
);

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
