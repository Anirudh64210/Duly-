import { describe, expect, it } from "vitest";

import { calmProblems } from "./calm";
import { engineOutputSchema, type EngineOutput, type F1Case } from "./compute";
import { dsoDraft, stemDraft } from "./drafts";
import { CASE, NEXT } from "./fixtures";
import { formatDate } from "./labels";
import courtPaused from "./samples/court-paused.json";

// plain-1 section 4: every draft is in the student's voice, holds no name of the tool
// and no computed date, and passes the checks the plain words pass.

const output = engineOutputSchema.parse(courtPaused);

const FULL: F1Case = {
  ...CASE,
  cpt_full_time_days: 200,
  opt: {
    dso_recommendation_date: "2026-03-01",
    i765_filed_date: "2026-03-10",
    ead_start: "2026-06-01",
    ead_end: "2027-05-31",
  },
  stem: {
    dso_recommendation_date: null,
    i765_filed_date: null,
    ead_start: "2027-06-01",
    ead_end: null,
  },
  employment: [
    { start: "2026-06-20", end: "2026-12-31", hours_per_week: 15, employer_reported: true },
    { start: "2027-01-10", end: null, hours_per_week: 40, employer_reported: false },
  ],
  cap_gap: {
    petition_filed_on: "2027-04-01",
    requested_start: "2027-10-01",
    change_of_status: true,
    status: "pending",
  },
};

const REASONS = [
  "hours_under_threshold",
  "unemployment_at_or_over_limit",
  "unemployment_opt_card_at_or_over_limit",
  "cpt_full_time_at_or_over_bar",
  "cap_gap_petition_not_active",
  "grace_with_cap_gap",
  "report_employer",
  "stem_without_post_completion_opt",
  "cap_gap_without_training",
  "opt.months_at_this_level",
  "rule_not_in_force_on_event_day",
  "stem.validation_1_due.not_made",
  "stem.new_plan_due.2.not_made",
  "opt.i765_filed_date.after_file_by",
  "employment.period_open_after_last_card",
  "some_new_judgement",
];

function talk(reasons: string[]): EngineOutput {
  return { ...output, verdict: { state: "talk_to_dso", reasons } };
}

/** Every date the engine computed, in the words a draft would use. */
function computedDates(shown: EngineOutput): string[] {
  const days = [
    ...shown.computed.flatMap((item) => (typeof item.value === "string" ? [item.value] : [])),
    ...shown.upcoming.map((entry) => entry.date),
    ...shown.computed.flatMap((item) => (item.alternates ?? []).map((a) => a.value)),
  ];
  return days.filter((day): day is string => typeof day === "string").map(formatDate);
}

/** Every date the student entered, in the same words. */
function enteredDates(sent: F1Case): Set<string> {
  const found = JSON.stringify(sent).match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  return new Set(found.map(formatDate));
}

function checkDraft(draft: string, sent: F1Case, shown: EngineOutput) {
  expect(draft).not.toMatch(/duly/i);
  expect(calmProblems(draft)).toEqual([]);
  expect(draft).toMatch(/^Subject: \S/);
  expect(draft).toMatch(/\nHello,\n/);
  expect(draft.endsWith("Thank you,\n[Your name]")).toBe(true);
  const entered = enteredDates(sent);
  for (const day of computedDates(shown)) {
    if (!entered.has(day)) expect(draft).not.toContain(day);
  }
}

describe("the draft for a talk_to_dso verdict", () => {
  for (const reason of REASONS) {
    it(`for ${reason}, speaks as the student and passes the checks`, () => {
      const shown = talk([reason]);
      const draft = dsoDraft(shown, FULL);
      if (draft === null) throw new Error("no draft");
      checkDraft(draft, FULL, shown);
      expect(draft).toMatch(/Could you (tell|look)/);
    });
  }

  it("is built from the facts behind its reasons, and only those", () => {
    const draft = dsoDraft(talk(["cpt_full_time_at_or_over_bar"]), FULL) ?? "";
    expect(draft).toContain("I have used 200 days of full-time CPT.");
    expect(draft).not.toContain("EAD card");
    const hours = dsoDraft(talk(["hours_under_threshold"]), FULL) ?? "";
    expect(hours).toContain("I worked from Jun 20, 2026 to Dec 31, 2026, at 15 hours a week.");
    expect(hours).toContain("I have worked since Jan 10, 2027, at 40 hours a week.");
    expect(hours).toContain("My OPT EAD card runs from Jun 1, 2026 to May 31, 2027.");
    expect(hours).toContain("My STEM OPT EAD card starts on Jun 1, 2027.");
  });

  it("states the student's cap-gap facts as entered", () => {
    const draft = dsoDraft(talk(["grace_with_cap_gap"]), FULL) ?? "";
    expect(draft).toContain(
      "An H-1B petition for me was filed on Apr 1, 2027, with a requested start date of Oct 1, 2027.",
    );
    expect(draft).toContain("The petition is pending, and it asks for a change of status.");
    const denied = dsoDraft(talk(["cap_gap_petition_not_active"]), {
      ...FULL,
      cap_gap: FULL.cap_gap && { ...FULL.cap_gap, status: "denied", change_of_status: false },
    });
    expect(denied).toContain("The petition is denied, and it does not ask for a change of status.");
  });

  it("asks each question once, whatever the number of reasons", () => {
    const draft = dsoDraft(talk(REASONS), FULL) ?? "";
    checkDraft(draft, FULL, talk(REASONS));
    expect(draft.match(/Could you look at my record/g)).toHaveLength(1);
    expect(draft).toContain("I did not submit my validation report 1.");
    expect(draft).toContain("I am in a master's program.");
  });

  it("names a doctoral and a bachelor's program in the student's words", () => {
    const doctoral = dsoDraft(talk(["opt.months_at_this_level"]), {
      ...FULL,
      degree_level: "doctorate",
    });
    expect(doctoral).toContain("I am in a doctoral program.");
    const bachelor = dsoDraft(talk(["opt.months_at_this_level"]), {
      ...FULL,
      degree_level: "bachelor",
    });
    expect(bachelor).toContain("I am in a bachelor's program.");
  });

  it("leaves out a fact that was not entered, and never fills one in", () => {
    const bare: F1Case = { ...CASE, cpt_full_time_days: null, opt: null, cap_gap: null };
    const draft =
      dsoDraft(talk(["cpt_full_time_at_or_over_bar", "grace_with_cap_gap"]), bare) ?? "";
    expect(draft).not.toContain("CPT.");
    expect(draft).not.toContain("petition for me");
    const ends = dsoDraft(talk(["hours_under_threshold"]), {
      ...CASE,
      opt: {
        dso_recommendation_date: null,
        i765_filed_date: null,
        ead_start: null,
        ead_end: "2027-05-31",
      },
      stem: null,
      employment: [],
    });
    expect(ends).toContain("My OPT EAD card ends on May 31, 2027.");
    const none = dsoDraft(talk(["report_employer"]), { ...CASE, employment: [] }) ?? "";
    expect(none).not.toContain("These are my dates");
  });

  it("opens with the question and states no status (point 57)", () => {
    for (const reason of REASONS) {
      const draft = dsoDraft(talk([reason]), FULL) ?? "";
      expect(draft).toContain("Hello,\n\nI have a question about my F-1 record.\n");
      expect(draft).not.toMatch(/\bI am an?\b/);
      expect(draft).not.toMatch(/\bstudent\b/i);
    }
  });

  it("names a new Form I-983 answered not made (point 57)", () => {
    const draft = dsoDraft(talk(["stem.new_plan_due.2.not_made"]), FULL) ?? "";
    expect(draft).toContain(
      "I did not submit my new Form I-983 for employment period 2. Could you tell me what your office needs from me?",
    );
    expect(draft).not.toContain("Could you look at my record");
  });

  it("gives every dated duty a name of its own (point 57)", () => {
    const duties = [
      "stem.validation_1_due",
      "stem.evaluation_12_month_due",
      "stem.final_evaluation_due_from_ead_end",
      "stem.new_plan_due.2",
      "stem.concluding_evaluation_due.2",
    ];
    for (const duty of duties) {
      const draft = dsoDraft(talk([`${duty}.not_made`]), FULL) ?? "";
      expect(draft).toMatch(/I did not submit my \S/);
      expect(draft).not.toContain("Could you look at my record");
    }
  });

  it("states the hours entered and no comparison with the rule (point 57)", () => {
    const draft = dsoDraft(talk(["hours_under_threshold"]), FULL) ?? "";
    expect(draft).toContain(
      "Could you tell me how your office reads my weeks at 15 and 40 hours a week?",
    );
    expect(draft).not.toMatch(/fewer|less|under|below|minimum|threshold|20 hours/i);
    const same = dsoDraft(talk(["hours_under_threshold"]), {
      ...FULL,
      employment: FULL.employment.map((period) => ({ ...period, hours_per_week: 10 })),
    });
    expect(same).toContain("how your office reads my weeks at 10 hours a week?");
    const none = dsoDraft(talk(["hours_under_threshold"]), { ...FULL, employment: [] });
    expect(none).toContain("how your office reads the hours a week I worked?");
  });

  it("is not drafted for any other verdict", () => {
    expect(dsoDraft(output, FULL)).toBeNull();
    expect(dsoDraft({ ...output, verdict: { state: "needs_you", reasons: [] } }, FULL)).toBeNull();
  });
});

describe("the draft for the STEM OPT step", () => {
  const next = engineOutputSchema.parse(NEXT);
  const draft = stemDraft(CASE, "8 CFR 214.2(f)(10)(ii)(C)");

  it("holds the student's own dates and no date the engine computed", () => {
    checkDraft(draft, CASE, next);
    expect(draft).toContain("My OPT EAD card runs from Jun 1, 2026 to May 31, 2027.");
    expect(draft).toContain("My program end date is");
    expect(draft).not.toContain("Mar 2, 2027");
    expect(draft).toContain("Could you tell me whether 8 CFR 214.2(f)(10)(ii)(C) applies");
  });

  it("names no card date that was not entered", () => {
    const bare = stemDraft({ ...CASE, opt: null }, "the regulation");
    expect(bare).not.toContain("EAD card");
    expect(bare).not.toContain("not entered");
  });

  it("states the dates of the employment period a report names (point 61)", () => {
    const plan = dsoDraft(talk(["stem.new_plan_due.2.not_made"]), FULL) ?? "";
    expect(plan).toContain("My employment period 2 started on Jan 10, 2027 and has no end date.");
    expect(plan).not.toContain("My employment period 1");
    const concluding = dsoDraft(talk(["stem.concluding_evaluation_due.1.not_made"]), FULL) ?? "";
    expect(concluding).toContain("My employment period 1 runs from Jun 20, 2026 to Dec 31, 2026.");
    expect(concluding).toContain("I did not submit my final evaluation for employment period 1.");
    checkDraft(concluding, FULL, talk(["stem.concluding_evaluation_due.1.not_made"]));
    const both = dsoDraft(
      talk(["stem.concluding_evaluation_due.1.not_made", "stem.new_plan_due.2.not_made"]),
      FULL,
    );
    expect(both).toMatch(/period 1 runs from[^]*period 2 started on/);
  });

  it("names no period dates for a report without a period, or a period not entered (point 61)", () => {
    const validation = dsoDraft(talk(["stem.validation_1_due.not_made"]), FULL) ?? "";
    expect(validation).not.toContain("My employment period");
    const missing = dsoDraft(talk(["stem.new_plan_due.3.not_made"]), FULL) ?? "";
    expect(missing).toContain("I did not submit my new Form I-983 for employment period 3.");
    expect(missing).not.toContain("My employment period");
  });

  it("states the petition's requested start date and never a cap-gap period of the student's (point 61)", () => {
    const draft = dsoDraft(talk(["grace_with_cap_gap"]), FULL) ?? "";
    expect(draft).toContain(
      "Could you tell me what comes after my petition's requested start date, and whether a grace period follows it?",
    );
    expect(draft).toContain("with a requested start date of Oct 1, 2027.");
    // Built from pieces so the done command's search of web/src finds only drafts.
    const reading = new RegExp(["my", "cap-gap", "period"].join(" "), "i");
    for (const reason of REASONS) {
      expect(dsoDraft(talk([reason]), FULL) ?? "").not.toMatch(reading);
    }
  });
});
