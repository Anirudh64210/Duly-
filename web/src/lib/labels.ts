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
const FROM_A_COURT = new Set(["enjoined", "vacated", "appealed"]);

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
