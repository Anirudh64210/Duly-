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
    "opt.latest_start": "Latest start date a student may request",
    "opt.complete_by": "Date OPT is to be completed by",
    "unemployment.limit": "Unemployment days allowed",
    "unemployment.days_used": "Unemployment days used",
    "unemployment.days_remaining": "Unemployment days remaining",
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
    "next.stem.apply_window_opens": "STEM OPT filing window opens",
    "next.stem.apply_window_closes": "STEM OPT filing window closes",
    "next.opt.card_ends": "OPT EAD card ends",
    "unemployment.opt_card_days_used": "Unemployment days used inside the OPT EAD dates",
  }),
);

const VALIDATION = /^stem\.validation_(\d+)_due$/;
// SPEC-resolutions points 20 and 22: items for one employment period, numbered as entered.
const NEW_PLAN = /^stem\.new_plan_due\.(\d+)$/;
const CONCLUDING = /^stem\.concluding_evaluation_due\.(\d+)$/;
const END_REPORT = /^employment\.(\d+)\.end_report_by$/;
const PERIOD_DAY = /^employment\.(\d+)\.(start|end)$/;

/** A name for an item whose id holds a number, or null. */
function numberedItem(itemId: string): string | null {
  const report = VALIDATION.exec(itemId);
  if (report) return `Validation report ${report[1]} due`;
  const plan = NEW_PLAN.exec(itemId);
  if (plan) return `New training plan (Form I-983) due for employment period ${plan[1]}`;
  const concluding = CONCLUDING.exec(itemId);
  if (concluding) return `Final evaluation due for employment period ${concluding[1]}`;
  const ended = END_REPORT.exec(itemId);
  if (ended) return `Day to report the end of employment period ${ended[1]}, from SEVP guidance`;
  return null;
}

function plain(code: string): string {
  const words = code.replaceAll(/[._:]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function itemName(itemId: string): string {
  const known = ITEM_NAMES.get(itemId);
  if (known) return known;
  return numberedItem(itemId) ?? (plain(itemId) || "Item");
}

const INPUT_NAMES: ReadonlyMap<string, string> = new Map(
  Object.entries({
    program_end_date: "Program end date",
    opt: "OPT dates",
    stem: "STEM OPT dates",
    cap_gap: "Cap-gap petition",
    "opt.dso_recommendation_date": "OPT DSO recommendation date",
    "opt.i765_filed_date": "OPT I-765 filed date",
    "stem.i765_filed_date": "STEM OPT I-765 filed date",
    "opt.ead_start": "OPT EAD start date",
    "opt.ead_end": "OPT EAD end date",
    "stem.dso_recommendation_date": "STEM OPT DSO recommendation date",
    "stem.ead_start": "STEM OPT EAD start date",
    "stem.ead_end": "STEM OPT EAD end date",
    today: "Date of the computation",
    employment: "Employment periods",
    cpt_full_time_days: "Full-time CPT days",
    "cap_gap.requested_start": "Requested start date",
    "cap_gap.petition_filed_on": "Petition filed date",
    full_time_cpt_used: "Your answer on full-time CPT",
    "cap_gap.status": "Petition status",
    "cap_gap.change_of_status": "Change of status requested",
    duly_settings: "Duly settings used, which are not law",
    degree_level: "Degree level",
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
    training: "Duly needs the OPT, STEM OPT, or cap-gap dates that are not entered yet.",
    cpt_full_time_days: "Duly needs the number of full-time CPT days.",
  }),
);

/** The number and the side of an employment period date named in an about, or null. */
export function periodDay(key: string): { period: number; side: "start" | "end" } | null {
  const day = PERIOD_DAY.exec(key);
  if (!day) return null;
  return { period: Number(day[1]), side: day[2] === "end" ? "end" : "start" };
}

/**
 * SPEC-resolutions point 34: an employment period as its start and end, so the person
 * can check the dates they are asked to confirm. end undefined: the end is not known here.
 */
export function periodSpan(start: unknown, end: unknown): string {
  const from = typeof start === "string" ? formatDate(start) : "no start date entered";
  if (typeof end === "string") return `${from} to ${formatDate(end)}`;
  if (end === null) return `${from}, no end date entered`;
  return `Starts ${from}`;
}

/** SPEC-resolutions point 29: an answer among an item's inputs, as the person's own. */
export function givenLine(answer: boolean, on: string): string {
  return `You answered ${answer ? "Yes" : "No"} on ${formatDate(on)}`;
}

/** SPEC-resolutions point 29: an item whose value comes from the person's answer says so. */
export function computedName(item: Pick<ComputedItem, "id" | "inputs">): string {
  if (item.id === "cpt.full_time_days_used" && Object.hasOwn(item.inputs, "full_time_cpt_used")) {
    return "Full-time CPT days (your answer)";
  }
  return itemName(item.id);
}

export function inputName(key: string): string {
  const known = INPUT_NAMES.get(key) ?? ITEM_NAMES.get(key) ?? numberedItem(key);
  if (known) return known;
  const day = PERIOD_DAY.exec(key);
  if (day) return `Employment period ${day[1]} ${day[2]} date`;
  return plain(key) || "Input";
}

// plain-1 section 3: the tag on an item or a rule names where the rule comes from, in
// plain words. The status code itself is never shown.
const STATUS_TAGS: Record<ItemStatus, string> = {
  settled: "Regulation",
  guidance: "Government guidance",
  school: "School policy",
  litigated: "A court paused a change",
  proposed: "Proposed, not in force",
};

/** The tag for a status. A status this screen has no words for is named as such. */
export function statusTag(status: string): string {
  if (Object.hasOwn(STATUS_TAGS, status)) return STATUS_TAGS[status as ItemStatus];
  return "Source type not named";
}

// SPEC-resolutions point 13 and plain-1 section 3: each legal status code in plain words.
const LEGAL_STATUS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    effective: "in effect",
    enjoined: "paused by a court",
    vacated: "set aside by a court",
    appealed: "under appeal",
    final: "final, not applied",
    proposed: "proposed, not in force",
  }),
);

export function legalStatusWords(legalStatus: string): string {
  return LEGAL_STATUS.get(legalStatus) ?? "not named on this screen";
}

// The legal statuses that come from a court's order.
const FROM_A_COURT = new Set(["enjoined", "stayed", "vacated", "appealed"]);

/** The link to a rule change's source: a court's order, or the source itself. */
export function sourceLink(legalStatus: string): string {
  return FROM_A_COURT.has(legalStatus) ? "Read the court's order" : "Read the source";
}

/** plain-1 section 3: the one tap that opens what the other rule would change. */
export function changeButton(legalStatus: string): string {
  if (legalStatus === "enjoined") return "What the paused rule would change";
  if (legalStatus === "proposed") return "What the proposed rule would change";
  return "What the other rule would change";
}

/** The line for a rule change whose source carries no plain words. */
export function changeLine(legalStatus: string): string {
  return `A rule change is ${legalStatusWords(legalStatus)}. The value shown is the one that applies today.`;
}

export const CHANGE_VALUE = "Under the paused rule";
export const PLAIN_HEADING = "In plain words";
export const EXACT_BUTTON = "Read the exact words";

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

// SPEC-W2-UNKNOWN point 2: what leaving a field empty means, as the words the pack's
// CHANGELOG records for each field it declares not_yet or none. Shown under the field, they
// make an empty field the person's own statement. A field a later CHANGELOG line turns to ask
// has none: D94 made petition.requested_start and validity_start ask, so empty is asked.
export const EMPTY_WORDS = {
  "work.end": "Leave empty if you still work there.",
  "authorization.filed_on": "Leave empty if Form I-765 has not been filed yet.",
  "authorization.decision": "Leave empty if no decision has come yet.",
  "move.registered_on": "Leave empty if you have not registered at the new school yet.",
  "move.release_date": "Leave empty if your record has not been released in SEVIS yet.",
  "move.contacted_new_dso_on":
    "Leave empty if you have not contacted the DSO at the new school yet.",
  "report.made_on": "Leave empty if you have not made this report yet.",
  "authorization.card_start": "Leave empty if no decision has come yet.",
  "authorization.card_end": "Leave empty if no decision has come yet.",
  "work.on_campus": "Leave empty if the job is not on campus.",
  "authorization.extends": "Leave empty if this permission does not extend an OPT.",
  "petition.outcome": "Leave empty if no outcome has been given.",
  "authorization.employer":
    "Leave empty if no employer is named on the Form I-20 for this permission.",
  "authorization.basis_program": "Leave empty unless this is a STEM extension.",
} as const satisfies Record<string, string>;

// SPEC-W2-UNKNOWN point 38: the words for a value Duly could not read, one the person was
// not sure about, and a number or date withheld until an answer comes.
export function unreadableLine(label: string, asEntered: string): string {
  return `Duly could not read what was entered for ${label}: ${asEntered}. Check it and enter it again.`;
}

export function undecidedLine(label: string): string {
  return `You said you were not sure about ${label}. Add it when you know. Your DSO can tell you.`;
}

export function waitingLine(label: string): string {
  return `Waiting for ${label}`;
}

/** A value withheld for a waits_on entry: never a number and never 0 (point 38). */
export function shownValue(item: {
  value: number | string | boolean | null;
  unit: string;
  waits_on?: readonly string[] | undefined;
}): string {
  if (item.waits_on === undefined) return formatValue(item.value, item.unit);
  const pending = item.waits_on.filter((entry) => entry.startsWith("pending:"));
  const waiting = item.waits_on.filter((entry) => !entry.startsWith("pending:"));
  if (waiting.length === 0) return `After ${pending.map(gapName).join(" and ")}`;
  return waitingLine(waiting.map(gapName).join(" and "));
}

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

// specs/product-1/SPEC.md, section 1: facts entered that do not fit. Each line says
// what does not fit, never which date is wrong or what it means.
const FACTS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    "opt.i765_filed_date.after_today": "The OPT I-765 filed date is after today.",
    "stem.i765_filed_date.after_today": "The STEM OPT I-765 filed date is after today.",
    "opt.dso_recommendation_date.after_today": "The OPT DSO recommendation date is after today.",
    "stem.dso_recommendation_date.after_today":
      "The STEM OPT DSO recommendation date is after today.",
    "cap_gap.petition_filed_on.after_today": "The petition filed date is after today.",
    "opt.i765_filed_date.after_card": "The OPT I-765 filed date is after the OPT EAD start date.",
    "stem.i765_filed_date.after_card":
      "The STEM OPT I-765 filed date is after the STEM OPT EAD start date.",
    "cap_gap.petition_filed_on.after_start":
      "The petition filed date is after the start date the petition asks for.",
    "cap_gap.requested_start.before_training":
      "The start date the petition asks for is before the first EAD start date.",
    "opt.card_longer_than_rule":
      "The OPT EAD dates run longer than the months the rule gives from the start date.",
    "stem.card_longer_than_rule":
      "The STEM OPT EAD dates run longer than the months the rule gives from the start date.",
    "stem.gap_after_opt":
      "The STEM OPT EAD start date is more than one day after the OPT EAD end date.",
    "employment.period_outside_cards":
      "An employment period has days outside the EAD dates entered.",
    // SPEC-resolutions points 11, 14, 15 and 16. The days are the rule's, shown beside
    // the question; no line says a filing was late.
    "opt.i765_filed_date.before_recommendation":
      "The OPT I-765 filed date is before the OPT DSO recommendation date.",
    "stem.i765_filed_date.before_recommendation":
      "The STEM OPT I-765 filed date is before the STEM OPT DSO recommendation date.",
    "opt.i765_filed_date.after_file_by":
      "The OPT I-765 filed date is more days after the OPT DSO recommendation date than the rule gives for filing.",
    "stem.i765_filed_date.after_file_by":
      "The STEM OPT I-765 filed date is more days after the STEM OPT DSO recommendation date than the rule gives for filing.",
    "stem.i765_filed_date.before_window_opens":
      "The STEM OPT I-765 filed date is more days before the OPT EAD end date than the rule gives for filing.",
    "opt.i765_filed_date.after_window_closes":
      "The OPT I-765 filed date is more days after the program end date than the rule gives for filing.",
    "opt.ead_end.after_complete_by":
      "The OPT EAD end date is after the date OPT is to be completed by. That date is Duly's count from the months in the rule, counted from the program end date.",
    // SPEC-resolutions point 27. Taking the EAD end date as the test is Duly's reading.
    "opt.ead_end.not_after_program_end":
      "The OPT EAD end date is on or before the program end date, so no day of these EAD dates is after it. The guidance below defines post-completion OPT by the program end date; taking the EAD end date as the test is Duly's reading.",
    // SPEC-resolutions point 43: what does not fit, and nothing about what it means.
    "employment.period_open_after_last_card":
      "An employment period has no end date, and today is after the last EAD end date entered, or after the cap-gap period when one is entered.",
  }),
);

// SPEC-resolutions point 26: the rule a conflict names is in the output's rules. The
// screen shows it beside the question, with its derivation.
const FACT_RULES: ReadonlyMap<string, string> = new Map(
  Object.entries({
    "opt.i765_filed_date.after_file_by": "opt.file_within_days_of_recommendation",
    "opt.i765_filed_date.before_recommendation": "opt.file_within_days_of_recommendation",
    "stem.i765_filed_date.after_file_by": "stem.file_within_days_of_recommendation",
    "stem.i765_filed_date.before_recommendation": "stem.file_within_days_of_recommendation",
    "stem.i765_filed_date.before_window_opens": "stem.apply_before_expiry_days",
    "opt.i765_filed_date.after_window_closes": "opt.apply_after_days",
    "opt.ead_end.after_complete_by": "opt.complete_within_months",
    "opt.ead_end.not_after_program_end": "opt.post_completion_definition",
  }),
);

/** The rule a conflict is checked against, or null. */
export function factRule(factId: string): string | null {
  return FACT_RULES.get(factId) ?? null;
}

/** SPEC section 1 for a conflict this screen has no words for. It is never shown as nothing. */
export const FACT_NOT_NAMED = "Some facts entered do not fit together.";

/** What does not fit, for a conflict of SPEC section 1, or null for another id. */
export function factLine(factId: string): string | null {
  return FACTS.get(factId) ?? null;
}

const CONFIRMED_FACT =
  "You answered that these are the dates on your documents. What they mean is a question for your DSO.";

const FINDINGS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    hours_under_threshold:
      "Some days are under the weekly hours rule. Whether they count is a question for your DSO.",
    unemployment_at_or_over_limit: "The days with no employment period are at or over the limit.",
    cpt_full_time_at_or_over_bar:
      "The full-time CPT days entered are at or over Duly's count of one year in days. The words of the regulation are beside this line.",
    cap_gap_petition_not_active:
      "The petition entered is not pending or approved with a change of status.",
    // SPEC-resolutions point 22: the days to report come from SEVP, not the regulation.
    report_employer:
      "An employment period, or its end, is not marked as reported to your DSO. The day to report it by is SEVP guidance, not the words of the regulation.",
    grace_with_cap_gap:
      "A cap-gap period is entered that runs past the last EAD end date. Duly shows no grace period end date with it. What comes after is a question for your DSO.",
    stem_without_post_completion_opt:
      "You answered that you had no period of post-completion OPT before the STEM OPT period. The words of the rule are shown below. This part depends on your own situation, so it is a question for your DSO.",
    cap_gap_without_training:
      "You answered that you had no period of OPT or STEM OPT. This part depends on your own situation, so it is a question for your DSO.",
    // SPEC-resolutions point 39: why Duly steps back, and nothing about what it means.
    "opt.months_at_this_level":
      "You answered that you used OPT before at this degree level. The EAD dates entered here do not show that earlier OPT, so Duly does not count the months. This is a question for your DSO.",
    // specs/product-2/resolutions.md point 19: Duly steps back from every date a petition
    // could change, and says why, and nothing about what the petition means.
    "cap_gap.for_dso":
      "A petition to change your status is entered. Such a petition can change these dates: the grace period, the counts from the day it was filed, the STEM reports and evaluations, and any cap-gap period. So Duly does not show them. Which dates it changes in your case is a question for your DSO. The rule is 8 CFR 214.2(f)(5)(vi).",
    // SPEC-resolutions points 40 and 44.
    rule_not_in_force_on_event_day:
      "The rule Duly would use was not yet in force on the day this counts from, so Duly does not compute the date. This is a question for your DSO.",
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
    nothing_more_to_record: {
      ask: "No OPT, STEM OPT, or cap-gap dates are entered. Is that the whole record, with no OPT, no STEM OPT, and no cap-gap petition to add?",
      yes: "Yes, there is nothing more",
      no: "No, there is more to add",
    },
    full_time_cpt_used: {
      ask: "No number of full-time CPT days is entered. Did you use any full-time CPT?",
      yes: "Yes, I used some",
      no: "No, I used none",
    },
    // SPEC-resolutions point 39: the EAD dates alone cannot show earlier OPT.
    "opt.earlier_at_this_level": {
      ask: "Did you use OPT before at this degree level, before your program ended or after another program at the same level?",
      yes: "Yes, I used OPT before at this level",
      no: "No, this is my first OPT at this level",
    },
  }),
);

// SPEC section 1: every conflict asks the same one thing.
const FACT_QUESTION: QuestionCopy = {
  ask: "Are these the dates on your documents?",
  yes: "Yes, they are the dates on my documents",
  no: "No, I will correct them",
};

const NEW_EMPLOYER = /^employment\.(\d+)\.new_employer$/;
const END_REPORTED = /^employment\.(\d+)\.end_reported$/;
const MADE = /^(.+)\.made$/;
const NOT_MADE = /^(.+)\.not_made$/;

// SPEC-resolutions point 21: the reports whose date can pass, by what they are.
export function reportName(itemId: string): string | null {
  if (itemId === "stem.evaluation_12_month_due") return "12-month evaluation";
  if (itemId === "stem.final_evaluation_due_from_ead_end") return "final evaluation";
  const report = VALIDATION.exec(itemId);
  if (report) return `validation report ${report[1]}`;
  // Point 57: every dated duty has a name, the new plan for a period included.
  const plan = NEW_PLAN.exec(itemId);
  if (plan) return `new Form I-983 for employment period ${plan[1]}`;
  const concluding = CONCLUDING.exec(itemId);
  if (concluding) return `final evaluation for employment period ${concluding[1]}`;
  return null;
}

/** SPEC-resolutions points 20, 21 and 22: questions whose id holds a number or an item. */
function numberedQuestion(questionId: string): QuestionCopy | null {
  const employer = NEW_EMPLOYER.exec(questionId);
  if (employer) {
    return {
      ask: `Employment period ${employer[1]} begins inside the STEM OPT EAD dates. Is this period with a new employer?`,
      yes: "Yes, a new employer",
      no: "No, the same employer",
    };
  }
  const ended = END_REPORTED.exec(questionId);
  if (ended) {
    return {
      ask: `Employment period ${ended[1]} has an end date. Has the end of this period been reported to your DSO?`,
      yes: "Yes, it has been reported",
      no: "No, it has not been reported",
    };
  }
  const made = MADE.exec(questionId);
  const report = made ? reportName(made[1] ?? "") : null;
  if (report) {
    return {
      ask: `The date for the ${report} is before today. Did you submit this report?`,
      yes: "Yes, I submitted it",
      no: "No, I did not submit it",
    };
  }
  return null;
}

/** The words for a question, or null for one this screen has no words for. */
export function questionCopy(questionId: string): QuestionCopy | null {
  if (FACTS.has(questionId)) return FACT_QUESTION;
  return QUESTIONS.get(questionId) ?? numberedQuestion(questionId);
}

// ui-1 point 5: the path's records, by kind. Mirrors path.records in the pack
// (rulepacks/f1-us/v2026.09/parameters.yaml): the letters of a record id, its name, and
// the words that ask whether the list of that kind is whole.
const RECORD_KINDS: ReadonlyMap<string, { prefix: string; name: string; whole: string }> = new Map(
  Object.entries({
    program: {
      prefix: "p",
      name: "Program of study",
      whole: "Is this every program of study, in the US or not?",
    },
    move: {
      prefix: "mv",
      name: "Move between programs",
      whole: "Is this every move between programs?",
    },
    end_date_change: {
      prefix: "ec",
      name: "Change of program end date",
      whole: "Is this every change of a program end date?",
    },
    authorization: {
      prefix: "a",
      name: "Permission to work",
      whole: "Is this every CPT, OPT and other work permission?",
    },
    employer: { prefix: "e", name: "Employer", whole: "Is this every employer?" },
    work: { prefix: "w", name: "Job", whole: "Is this every job, through today?" },
    report: {
      prefix: "r",
      name: "Report to the DSO",
      whole: "Is this every report made to the DSO, through today?",
    },
    trip: {
      prefix: "t",
      name: "Trip abroad",
      whole: "Is this every trip outside the US in the time asked?",
    },
    petition: {
      prefix: "h",
      name: "H-1B petition",
      whole: "Is this every H-1B petition filed for this person?",
    },
    withdrawal: {
      prefix: "wd",
      name: "Withdrawal from classes",
      whole: "Is this every withdrawal from classes?",
    },
    term: { prefix: "tm", name: "Term", whole: "Is this every term?" },
    reduced_load: {
      prefix: "rl",
      name: "Reduced course load",
      whole: "Is this every reduced course load?",
    },
    reinstatement: { prefix: "ri", name: "Reinstatement", whole: "Is this every reinstatement?" },
  }),
);

// ui-1 point 5: what Duly asks for each field of a record, keyed by the record's kind and
// the field. The pack's labels, with "it" named. Fields held only to translate an older
// case are never asked.
const FIELD_WORDS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    "program.where": "Where was the program, and on what status?",
    "program.school_name": "School name",
    "program.school_code": "School code, as printed on the Form I-20",
    "program.level": "Level, as the Form I-20 shows it",
    "program.field_name": "Field of study, as printed",
    "program.cip_code": "CIP code on the Form I-20",
    "program.stem_list": "Is the degree on the STEM Designated Degree Program List?",
    "program.start_date": "Program start date on the Form I-20",
    "program.end_date": "Program end date on the newest Form I-20",
    "program.state": "Where does the program stand?",
    "program.coursework_done_on":
      "Day all course requirements were done, apart from a thesis or its equivalent",
    "program.conferred_on": "Day the degree was conferred",
    "program.first_year_done_on": "Day the first full academic year was done, from the school",
    "program.first_year_before_training":
      "Was one full academic year done before the training began?",
    "program.immediate_cpt": "Does the program require CPT from the start?",
    "program.dual_with": "The other program of a dual degree",
    "program.full_course_each_term": "Was every term a full course of study?",
    "program.online_within_limit": "Did online classes stay within the school's limit each term?",
    "move.how": "How was the move made?",
    "move.from_program": "Program moved from",
    "move.to_program": "Program moved to",
    "move.told_school_on": "Day the school was told of the transfer",
    "move.release_date": "SEVIS release date",
    "move.i20_issued_on": "Day the new Form I-20 was issued",
    "move.contacted_new_dso_on": "Day the DSO at the new school was contacted",
    "move.registered_on": "Day of registration at the new school",
    "end_date_change.program": "Program whose end date changed",
    "end_date_change.change": "Was the end date extended or shortened?",
    "end_date_change.old_end": "End date before the change",
    "end_date_change.new_end": "End date after the change",
    "end_date_change.requested_on": "Day the extension was asked for",
    "end_date_change.granted_on": "Day the change was granted",
    "end_date_change.reason": "Reason on the Form I-20",
    "authorization.type": "Kind of permission",
    "authorization.program": "Program the permission rests on",
    "authorization.extends": "OPT the permission extends",
    "authorization.basis_program": "Degree the STEM extension rests on",
    "authorization.time": "Full or part time, as the Form I-20 shows it",
    "authorization.employer": "Employer on the Form I-20",
    "authorization.dso_on": "Day the DSO signed or entered the recommendation",
    "authorization.filed_on": "Day Form I-765 was filed",
    "authorization.decision": "Decision on the permission",
    "authorization.decided_on": "Day of the decision",
    "authorization.card_start": "Start date on the card, or on the Form I-20 for CPT",
    "authorization.card_end": "End date on the card, or on the Form I-20 for CPT",
    "authorization.split_noted": "Did the DSO note a split of OPT time in SEVIS?",
    "employer.name": "Employer name",
    "employer.e_verify": "Is the employer enrolled in E-Verify?",
    "work.employer": "Employer for the job",
    "work.under": "Permission the job was under",
    "work.on_campus": "Program whose school the on-campus job was at",
    "work.start": "First day of the job",
    "work.end": "Last day of the job",
    "work.hours_per_week": "Hours a week",
    "work.hours_changes": "Times the hours a week changed",
    "report.type": "Kind of report",
    "report.about": "Permission or job the report is about",
    "report.made_on": "Day the report was made",
    "trip.left_on": "Day of leaving the US",
    "trip.returned_on": "Day of return to the US",
    "trip.purpose": "What was the trip?",
    "trip.reentry_i20": "Program whose Form I-20 was shown on return",
    "trip.signature_on": "Day of the DSO's travel signature on that Form I-20",
    "trip.job_on_return": "Was there a job to return to?",
    "petition.type": "Kind of petition",
    "petition.cap_subject": "Is the petition under the yearly cap?",
    "petition.employer": "Employer on the petition",
    "petition.filed_on": "Day the petition was filed",
    "petition.receipt_on": "Receipt date",
    "petition.requested_start": "Start date asked for in the petition",
    "petition.change_of_status": "Does the petition ask for a change of status?",
    "petition.cos_ended_on": "Day the change of status was withdrawn or moved to a consulate",
    "petition.outcome": "Outcome of the petition",
    "petition.outcome_on": "Day of the outcome",
    "petition.validity_start": "Validity start date of the approved petition",
    "petition.h1b_began_on": "Day H-1B status began",
    "withdrawal.program": "Program withdrawn from",
    "withdrawal.on": "Day of the withdrawal",
    "withdrawal.dso_authorized": "Did the DSO authorize the withdrawal?",
    "term.program": "Program the term was in",
    "term.start": "First day of the term",
    "term.end": "Last day of the term",
    "term.type": "Kind of term",
    "term.credits": "Credits taken in the term",
    "term.online_credits": "Online credits taken in the term",
    "term.full_course_credits": "Credits the school counts as a full course",
    "reduced_load.program": "Program with the reduced course load",
    "reduced_load.reason": "Reason for the reduced course load",
    "reduced_load.starts": "First day of the reduced course load",
    "reduced_load.ends": "Last day of the reduced course load",
    "reduced_load.approved_on": "Day the DSO approved it",
    "reduced_load.credits": "Credits taken with the reduced course load",
    "reduced_load.resumed_on": "Day a full course resumed",
    "reinstatement.program": "Program the reinstatement is for",
    "reinstatement.filed_on": "Day the reinstatement was filed",
    "reinstatement.decided_on": "Day of the decision",
    "reinstatement.decision": "Decision on the reinstatement",
  }),
);

const RECORD_ID = /^([a-z]+)(\d+)$/;
const TYPED_DATES = "typed_dates.from_documents";
const CHECKED_DATE = /^typed_dates\.checked\.(.+)$/;
const ENDS_BEFORE_TODAY = "record.ends_before_today";
const UNCONFIRMED_TYPED = "unconfirmed:typed_dates";

/** A record id as the person reads it, "Trip abroad 1", or null for an id that is not one. */
function recordName(recordId: string): { kind: string; name: string } | null {
  const parts = RECORD_ID.exec(recordId);
  if (!parts) return null;
  for (const [kind, record] of RECORD_KINDS) {
    if (record.prefix === parts[1]) return { kind, name: `${record.name} ${parts[2]}` };
  }
  return null;
}

/** The words for a record's field, "Trip abroad 1: Was there a job to return to?", or null. */
function fieldTitle(key: string): string | null {
  const split = key.indexOf(".");
  const record = recordName(key.slice(0, split));
  const words = record && FIELD_WORDS.get(`${record.kind}.${key.slice(split + 1)}`);
  return record && words ? `${record.name}: ${words}` : null;
}

/** A gap named inside a line, "Job 1, Hours a week": a record's field, or the gap's own name. */
function gapName(entry: string): string {
  const key = entry.replace(/^(pending|future):/, "");
  const split = key.indexOf(".");
  const record = recordName(key.slice(0, split));
  const words = record && FIELD_WORDS.get(`${record.kind}.${key.slice(split + 1)}`);
  return record && words ? `${record.name}, ${words.replace(/\?$/, "")}` : inputName(key);
}

/** ui-1 point 5: the words for a question of the path, keyed by what it asks. */
function pathTitle(questionId: string): string | null {
  if (questionId === TYPED_DATES) return "Did you type these dates from your documents?";
  if (questionId === ENDS_BEFORE_TODAY) {
    return "Your record ends before today. Is there anything after it to add?";
  }
  const checked = CHECKED_DATE.exec(questionId);
  if (checked) {
    const field = fieldTitle(checked[1] ?? "");
    return field && `Check this date against your document. ${field}`;
  }
  if (questionId.startsWith("complete.")) {
    return RECORD_KINDS.get(questionId.slice("complete.".length))?.whole ?? null;
  }
  const parts = questionId.split(".");
  // A date entered that is after today: <record>.<field>.after_today.
  if (parts.length === 3 && parts[2] === "after_today") {
    const field = fieldTitle(`${parts[0]}.${parts[1]}`);
    return field && `${field}. The date entered is after today.`;
  }
  // A check that does not hold for a record: <check>.<record>.
  const last = recordName(parts[parts.length - 1] ?? "");
  if (parts.length > 1 && last !== null) return `${last.name}: ${FACT_NOT_NAMED}`;
  return fieldTitle(questionId);
}

/** The title a question is shown under, on every screen that lists it. */
export function questionTitle(questionId: string): string {
  return (
    questionCopy(questionId)?.ask ??
    pathTitle(questionId) ??
    "Duly has a question about what you entered."
  );
}

/**
 * The words for a question the verdict holds as a conflict. A conflict this screen
 * has no line for still asks the one thing every conflict asks.
 */
export function conflictQuestionCopy(
  questionId: string,
  reasons: readonly string[],
): QuestionCopy | null {
  if (reasons.includes(`conflict:${questionId}`)) return FACT_QUESTION;
  return questionCopy(questionId);
}

/** What does not fit, for a question the verdict holds as a conflict, or null. */
export function conflictLine(questionId: string, reasons: readonly string[]): string | null {
  const known = factLine(questionId);
  if (known) return known;
  return reasons.includes(`conflict:${questionId}`) ? FACT_NOT_NAMED : null;
}

const ABOUT_SHOWN = new Set(["opt.earlier_at_this_level"]);

/** Questions whose values are shown in place of the inputs that raised them. */
export function showsAbout(questionId: string): boolean {
  return (
    FACTS.has(questionId) || ABOUT_SHOWN.has(questionId) || numberedQuestion(questionId) !== null
  );
}

export const QUESTION_NOT_SHOWN =
  "Duly has a question that this screen does not have the words for yet.";

export const ANSWER_NOT_SHOWN =
  "You gave an answer that is sent with these dates. This screen does not have the words for its question yet.";

/** A judgement item this screen has no words for. It is never shown as nothing. */
export const JUDGEMENT_NOT_NAMED = "Something in what you entered needs an answer.";

// ui-1 point 5: why a question of the path is asked, by the kind of its reason.
const PATH_BECAUSE: ReadonlyMap<string, string> = new Map(
  Object.entries({
    missing: "nothing is entered for it yet",
    unconfirmed: "Duly waits for your answer before it goes on",
    conflict: "the dates entered do not fit together",
  }),
);

export function becauseLine(
  because: readonly string[],
  about: Readonly<Record<string, unknown>> = {},
): string {
  // SPEC-W2-UNKNOWN point 38: a value not read is shown back as entered; not sure says so.
  const own: string[] = [];
  const rest: string[] = [];
  for (const reason of because) {
    const id = reason.slice(reason.indexOf(":") + 1);
    const entered = about[id];
    if (reason.startsWith("unreadable:") && entered !== undefined) {
      const shown = typeof entered === "string" ? entered : JSON.stringify(entered);
      own.push(unreadableLine(gapName(id), shown));
    } else if (reason.startsWith("undecided:")) {
      own.push(undecidedLine(gapName(id)));
    } else {
      rest.push(reason);
    }
  }
  if (rest.length === 0) return own.join(" ");
  return [...own, restLine(rest)].join(" ");
}

function restLine(because: readonly string[]): string {
  const path = because.flatMap((reason) => {
    if (reason === UNCONFIRMED_TYPED) return ["some dates you typed are not checked yet"];
    const split = reason.indexOf(":");
    const words = PATH_BECAUSE.get(reason.slice(0, split));
    return words !== undefined && pathTitle(reason.slice(split + 1)) !== null ? [words] : [];
  });
  if (path.length > 0) return `Asked because ${[...new Set(path)].join(", and ")}.`;
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
  // A conflict the person answered yes to: the dates stand, and the matter is the DSO's.
  const confirmed = FACTS.get(reason);
  if (confirmed) return `${confirmed} ${CONFIRMED_FACT}`;
  const judgement = judgementLine(reason, computed);
  if (judgement) return judgement;

  const item = computed.find((candidate) => candidate.id === reason);
  if (item && item.value !== null) {
    return `${computedName(item)}: ${formatValue(item.value, item.unit)}.`;
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
    const known = CONFLICTS.get(name) ?? FACTS.get(name);
    if (known) return known;
    const period = EMPLOYMENT_CONFLICT.exec(name);
    if (period) return `Employment period ${period[1]} ends before it starts.`;
    if (name) return FACT_NOT_NAMED;
  }
  const known = reasonLine(reason);
  // A reason with no kind that nothing here names: a judgement item, an open item, or
  // a conflict the person confirmed. It is never shown as nothing.
  return kind === "" && known === reasonLine("") ? JUDGEMENT_NOT_NAMED : known;
}

/** SPEC-resolutions points 19 and 21: judgement items built from a count or an item. */
function judgementLine(reason: string, computed: readonly ComputedItem[]): string | null {
  if (reason === "unemployment_opt_card_at_or_over_limit") {
    const count = computed.find((item) => item.id === "unemployment.opt_card_days_used");
    const counted =
      count && count.value !== null ? `: ${formatValue(count.value, count.unit)}` : "";
    return `Unemployment days counted inside the OPT EAD dates${counted}. This is at or over the limit in the rule for the OPT period, shown below.`;
  }
  const notMade = NOT_MADE.exec(reason);
  const report = notMade ? reportName(notMade[1] ?? "") : null;
  if (report) {
    return `You answered that you did not submit the ${report}. What that means is a question for your DSO.`;
  }
  return null;
}

export function scopeLine(documentsCount: number, rulesCheckedOn: string | null): string {
  const documents = documentsCount === 1 ? "1 document" : `${documentsCount} documents`;
  const rules =
    rulesCheckedOn === null
      ? "The rules have not been checked yet."
      : `Rules checked ${formatDate(rulesCheckedOn)}.`;
  return `Based on ${documents} you added. ${rules}`;
}

/** The item a verdict reason rests on, so the line can carry the item's marks. */
export function reasonItem(
  reason: string,
  computed: readonly ComputedItem[],
): ComputedItem | undefined {
  const itemId = reason === "cpt_full_time_at_or_over_bar" ? "cpt.full_time_days_used" : reason;
  return computed.find((item) => item.id === itemId);
}

export const NEXT_HEADING = "What comes next";
export const LIST_LINE =
  "This is what the regulation says. Whether it applies to you is a question for your DSO.";

const LIST_NAMES: ReadonlyMap<string, string> = new Map(
  Object.entries({
    "stem.extension.what_the_regulation_lists":
      "What the regulation lists for the 24-month STEM OPT extension",
  }),
);

export function listName(listId: string): string {
  return LIST_NAMES.get(listId) ?? (plain(listId) || "What the regulation lists");
}

// The verdict reasons that wait on something: a fact, an answer, or the rules.
const WAITING = new Set([
  "no_documents",
  "rules_never_checked",
  "rules_stale",
  "rule_in_litigation",
]);
const WAITING_KINDS = new Set(["unconfirmed", "missing", "conflict"]);

/** plain-1 section 5: whether a verdict reason needs an answer, as opposed to a known matter. */
export function needsAnswer(reason: string): boolean {
  const split = reason.indexOf(":");
  return WAITING.has(reason) || (split > 0 && WAITING_KINDS.has(reason.slice(0, split)));
}

// design-1: the words the app screens add.

/** design-1 section 6: the date line, "Tuesday, September 29". Formats the engine's date. */
export function formatDay(iso: string): string {
  const parts = ISO_DATE.exec(iso);
  if (!parts) return iso;
  const made = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
  return made.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** design-1 section 14.1: form and category names that hold digits. The reviewer adds to it. */
export const FIXED_NAMES = [
  "I-20",
  "I-94",
  "I-765",
  "I-797",
  "I-983",
  "F-1",
  "H-1B",
  "O-1",
  "EB-1A",
] as const;

const CATEGORY_NAMES: ReadonlyMap<string, string> = new Map(
  Object.entries({ f1: "F-1", h1b: "H-1B", o1: "O-1", eb1a: "EB-1A" }),
);

/** A category id as its name. An id with no name here is shown by its letters. */
export function categoryName(category: string): string {
  return CATEGORY_NAMES.get(category.toLowerCase().replaceAll(/[^a-z0-9]/g, "")) ?? category;
}

const LEVEL_NAMES: ReadonlyMap<string, string> = new Map(
  Object.entries({
    associate: "Associate",
    bachelor: "Bachelor's",
    master: "Master's",
    doctorate: "Doctorate",
    // programs.md section 18 step 1 question 3 names the pack's language_training level so.
    language_training: "English language",
    other: "Other",
  }),
);

export function levelName(level: string): string {
  return LEVEL_NAMES.get(level) ?? plain(level);
}

/** design-1 section 12 row 2: the scope line until documents-1 section 8 rewrites it. */
export function datesScopeLine(rulesCheckedOn: string | null): string {
  const rules =
    rulesCheckedOn === null
      ? "The rules have not been checked yet."
      : `Rules checked ${formatDate(rulesCheckedOn)}.`;
  return `Based on the dates you entered. ${rules}`;
}

/** design-1 section 13: the reasons the app words differently from the bench. */
export function appReasonLine(reason: string, computed: readonly ComputedItem[] = []): string {
  if (reason === "no_documents") return "No document is attached to these dates yet.";
  const covered = /^category_not_covered:(.+)$/.exec(reason);
  if (covered) return `Duly holds no rules for ${categoryName(covered[1] ?? "")} dates.`;
  return reasonText(reason, computed);
}

export const NAMED_STATUS_LINE = "Duly holds no rules for the status you named.";
export const FOOTER_LINE =
  "Records and computations, not legal advice. Confirm with your DSO or an attorney.";
export const STEM_ROW_TITLE = "STEM OPT extension";
export const STEM_LIST_NAME = "What the regulation lists for the STEM OPT extension";

/** design-1 section 9: the words for all eleven legal statuses of updates and regimes. */
const UPDATE_STATUS_WORDS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    announced: "announced, not in force",
    proposed: "proposed, not in force",
    comment_period: "open for public comment, not in force",
    omb_review: "under review before publication, not in force",
    final: "final, not applied",
    effective: "in effect",
    enjoined: "paused by a court",
    stayed: "on hold",
    vacated: "set aside by a court",
    appealed: "under appeal",
    rescinded: "withdrawn",
  }),
);

export function updateStatusWords(legalStatus: string): string {
  return UPDATE_STATUS_WORDS.get(legalStatus) ?? legalStatusWords(legalStatus);
}
