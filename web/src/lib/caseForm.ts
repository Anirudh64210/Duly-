import {
  isZoneName,
  type CapGap,
  type Confirmations,
  type DegreeLevel,
  type EadBlock,
  type EmploymentPeriod,
  type F1Case,
  type PetitionStatus,
} from "./compute";

// What the form holds: text as typed. buildCase turns it into the case contract.

export type EadFields = {
  dso_recommendation_date: string;
  i765_filed_date: string;
  ead_start: string;
  ead_end: string;
};

export type PeriodFields = {
  key: number;
  start: string;
  end: string;
  hours_per_week: string;
  employer_reported: boolean;
};

export type CapGapFields = {
  petition_filed_on: string;
  requested_start: string;
  change_of_status: boolean;
  status: PetitionStatus;
};

export type CaseFields = {
  program_end_date: string;
  degree_level: DegreeLevel;
  documents_count: string;
  cpt_full_time_days: string;
  opt_on: boolean;
  opt: EadFields;
  stem_on: boolean;
  stem: EadFields;
  employment: PeriodFields[];
  next_key: number;
  cap_gap_on: boolean;
  cap_gap: CapGapFields;
  time_zone: string;
  confirmations: Confirmations;
};

/** The id of the time zone field, so the result can send the person to it. */
export const ZONE_FIELD = "time-zone";

const EMPTY_EAD: EadFields = {
  dso_recommendation_date: "",
  i765_filed_date: "",
  ead_start: "",
  ead_end: "",
};

export const EMPTY_CASE: CaseFields = {
  program_end_date: "",
  degree_level: "bachelor",
  documents_count: "0",
  cpt_full_time_days: "0",
  opt_on: false,
  opt: EMPTY_EAD,
  stem_on: false,
  stem: EMPTY_EAD,
  employment: [],
  next_key: 1,
  cap_gap_on: false,
  cap_gap: {
    petition_filed_on: "",
    requested_start: "",
    change_of_status: false,
    status: "pending",
  },
  time_zone: "",
  confirmations: {},
};

/** The zone the browser reports, or empty when it reports none the contract takes. */
export function reportedZone(): string {
  try {
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isZoneName(zone) ? zone : "";
  } catch {
    return "";
  }
}

/** Every zone offered in the list: what the browser knows, UTC, and the zone held now. */
export function zoneChoices(held: string): string[] {
  let known: string[] = [];
  try {
    known = Intl.supportedValuesOf("timeZone");
  } catch {
    // The browser gives no list. The zone held now and UTC are still offered.
  }
  const choices = new Set([...known, "UTC", ...(held === "" ? [] : [held])]);
  return [...choices].filter(isZoneName).sort();
}

/** The person's answer, with the day Duly used as today when it asked. */
export function answer(
  fields: CaseFields,
  question: string,
  given: boolean,
  on: string,
): CaseFields {
  return {
    ...fields,
    confirmations: { ...fields.confirmations, [question]: { answer: given, on } },
  };
}

export function withdrawAnswer(fields: CaseFields, question: string): CaseFields {
  const confirmations = Object.fromEntries(
    Object.entries(fields.confirmations).filter(([id]) => id !== question),
  );
  return { ...fields, confirmations };
}

export function addPeriod(fields: CaseFields): CaseFields {
  const period: PeriodFields = {
    key: fields.next_key,
    start: "",
    end: "",
    hours_per_week: "",
    employer_reported: false,
  };
  return {
    ...fields,
    employment: [...fields.employment, period],
    next_key: fields.next_key + 1,
  };
}

export function removePeriod(fields: CaseFields, key: number): CaseFields {
  return { ...fields, employment: fields.employment.filter((p) => p.key !== key) };
}

export type Built = { ok: true; body: F1Case } | { ok: false; problems: string[] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const WHOLE = /^\d+$/;
const NUMBER = /^\d+(\.\d+)?$/;
const MAX_HOURS = 168;

function isDate(text: string): boolean {
  if (!ISO_DATE.test(text)) return false;
  const [year = 0, month = 0, day = 0] = text.split("-").map(Number);
  const made = new Date(Date.UTC(year, month - 1, day));
  return (
    made.getUTCFullYear() === year && made.getUTCMonth() === month - 1 && made.getUTCDate() === day
  );
}

export function buildCase(fields: CaseFields): Built {
  const problems: string[] = [];

  const required = (text: string, name: string): string => {
    if (!isDate(text)) problems.push(`Enter ${name}.`);
    return text;
  };
  const optional = (text: string, name: string): string | null => {
    if (text === "") return null;
    if (!isDate(text)) problems.push(`Enter ${name} as a date, or leave it empty.`);
    return text;
  };
  const whole = (text: string, name: string): number => {
    const trimmed = text.trim();
    if (!WHOLE.test(trimmed)) problems.push(`Enter ${name} as a whole number, 0 or more.`);
    return Number(trimmed);
  };
  const ead = (block: EadFields, part: string): EadBlock => ({
    dso_recommendation_date: optional(
      block.dso_recommendation_date,
      `the ${part} DSO recommendation date`,
    ),
    i765_filed_date: optional(block.i765_filed_date, `the ${part} I-765 filed date`),
    ead_start: optional(block.ead_start, `the ${part} EAD start date`),
    ead_end: optional(block.ead_end, `the ${part} EAD end date`),
  });
  const period = (entered: PeriodFields, number: number): EmploymentPeriod => {
    const hours = entered.hours_per_week.trim();
    if (!NUMBER.test(hours) || Number(hours) > MAX_HOURS) {
      problems.push(
        `Enter the hours per week for period ${number} as a number from 0 to ${MAX_HOURS}.`,
      );
    }
    return {
      start: required(entered.start, `the start date for period ${number}`),
      end: optional(entered.end, `the end date for period ${number}`),
      hours_per_week: Number(hours),
      employer_reported: entered.employer_reported,
    };
  };
  const capGap = (entered: CapGapFields): CapGap => ({
    petition_filed_on: required(entered.petition_filed_on, "the date the petition was filed"),
    requested_start: required(entered.requested_start, "the requested start date"),
    change_of_status: entered.change_of_status,
    status: entered.status,
  });

  const body: F1Case = {
    program_end_date: required(fields.program_end_date, "the program end date"),
    degree_level: fields.degree_level,
    documents_count: whole(fields.documents_count, "the documents added"),
    cpt_full_time_days: whole(fields.cpt_full_time_days, "the full-time CPT days"),
    opt: fields.opt_on ? ead(fields.opt, "OPT") : null,
    stem: fields.stem_on ? ead(fields.stem, "STEM OPT") : null,
    employment: fields.employment.map((entered, index) => period(entered, index + 1)),
    cap_gap: fields.cap_gap_on ? capGap(fields.cap_gap) : null,
    time_zone: fields.time_zone,
    confirmations: fields.confirmations,
  };
  if (!isZoneName(fields.time_zone)) problems.push("Choose your time zone.");

  return problems.length > 0 ? { ok: false, problems } : { ok: true, body };
}
