import type { F1Case } from "./compute";

// Test data only. The values are made up for the tests; they are not rule values.

const ECFR = "https://www.ecfr.gov/current/title-8/section-214.2";

export const CASE: F1Case = {
  program_end_date: "2026-05-15",
  degree_level: "master",
  documents_count: 3,
  cpt_full_time_days: 0,
  opt: {
    dso_recommendation_date: "2026-04-01",
    i765_filed_date: "2026-04-10",
    ead_start: "2026-06-01",
    ead_end: "2027-05-31",
  },
  stem: null,
  employment: [{ start: "2026-06-20", end: null, hours_per_week: 40, employer_reported: true }],
  cap_gap: null,
  time_zone: "America/Los_Angeles",
  confirmations: {},
};

export const OUTPUT = {
  verdict: { state: "needs_you", reasons: ["opt.file_by"] },
  scope: { documents_count: 3, rules_checked_on: "2026-09-28" },
  computed: [
    {
      id: "opt.file_by",
      value: "2026-05-01",
      unit: "date",
      inputs: { "opt.dso_recommendation_date": "2026-04-01" },
      rule_ids: ["opt.file_within_days_of_recommendation"],
      status: "settled",
    },
    {
      id: "unemployment.days_used",
      value: 19,
      unit: "days",
      inputs: {
        "opt.ead_start": "2026-06-01",
        "opt.ead_end": "2027-05-31",
        today: "2026-09-28",
        employment: [
          { start: "2026-06-20", end: null, hours_per_week: 40, employer_reported: true },
        ],
      },
      rule_ids: ["opt.unemployment_limit_days"],
      status: "settled",
    },
    {
      id: "employment.days_under_hours",
      value: 0,
      unit: "days",
      inputs: { "opt.ead_start": "2026-06-01", employment: [] },
      rule_ids: ["opt.min_hours_per_week"],
      status: "guidance",
    },
    {
      id: "grace.ends",
      value: "2027-07-30",
      unit: "date",
      inputs: { program_end_date: "2026-05-15", "opt.ead_end": "2027-05-31" },
      rule_ids: ["grace.after_completion_days"],
      status: "litigated",
      alternates: [
        { regime: "fixed_admission_2026", legal_status: "enjoined", value: "2027-06-30" },
      ],
      operative: { regime: "ds_2012", legal_status: "effective" },
    },
    {
      id: "cpt.full_time_days_used",
      value: 0,
      unit: "days",
      inputs: { cpt_full_time_days: 0 },
      rule_ids: ["cpt.full_time_months_bar"],
      status: "settled",
    },
  ],
  rulepacks: [{ category: "f1", version: "v2026.09" }],
  rules: {
    "opt.file_within_days_of_recommendation": {
      value: 30,
      unit: "days",
      status: "settled",
      citation: "8 CFR 214.2(f)(11)(i)(B)",
      url: ECFR,
      checked_on: "2026-09-28",
      quote: "within 30 days of the date the DSO enters the recommendation",
      derivation: "verbatim",
    },
    "opt.unemployment_limit_days": {
      value: 90,
      unit: "days",
      status: "settled",
      citation: "8 CFR 214.2(f)(10)(ii)(E)",
      url: ECFR,
      checked_on: "2026-09-28",
      quote: "an aggregate of 90 days",
    },
    "opt.min_hours_per_week": {
      value: 20,
      unit: "hours_per_week",
      status: "guidance",
      citation: "SEVP OPT policy guidance",
      url: "https://www.ice.gov/sevis",
      checked_on: "2026-09-27",
      quote: "at least 20 hours per week",
    },
    "grace.after_completion_days": {
      value: 60,
      unit: "days",
      status: "litigated",
      citation: "8 CFR 214.2(f)(5)(iv), text of 2026-09-14",
      url: ECFR,
      checked_on: "2026-09-28",
      quote: "60 days to prepare for departure",
      regime: "ds_2012",
    },
    "cpt.full_time_months_bar": {
      value: 12,
      unit: "months",
      status: "settled",
      citation: "8 CFR 214.2(f)(10)(i)",
      url: ECFR,
      checked_on: "2026-09-28",
      quote: "one year or more of full time curricular practical training",
      derivation: "reading",
      note: "Reading: the source says one year or more, and the pack holds one year as 12 months.",
    },
  },
  questions: [] as { id: string; because: string[] }[],
  today: { date: "2026-09-28", time_zone: "America/Los_Angeles" },
};

// STEM OPT dates with no OPT dates, before the person has answered.
export const ASKING = {
  ...OUTPUT,
  verdict: { state: "cannot_tell", reasons: ["unconfirmed:held_post_completion_opt"] },
  computed: [],
  rules: {},
  questions: [{ id: "held_post_completion_opt", because: ["stem", "opt"] }],
};

// The same case after the answer no. The rule is named by no item.
export const ANSWERED_NO = {
  ...ASKING,
  verdict: { state: "talk_to_dso", reasons: ["stem_without_post_completion_opt"] },
  rules: {
    "stem.requires_post_completion_opt": {
      value: true,
      unit: "flag",
      status: "settled",
      citation: "8 CFR 214.2(f)(10)(ii)(C)",
      url: ECFR,
      checked_on: "2026-09-29",
      quote: "while in a valid period of post-completion OPT",
      derivation: "reading",
      note: "Reading: made up for the tests.",
    },
  },
  questions: [],
};

export const STATUS = {
  database: "ok",
  rulepacks: [{ category: "f1", version: "v2026.09", parameters: 0 }],
  verdict: { state: "cannot_tell", reasons: ["no_documents"] },
  checked_at: "2026-09-28T12:00:00+00:00",
};
