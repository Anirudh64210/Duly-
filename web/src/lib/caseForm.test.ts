import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EMPTY_CASE,
  addPeriod,
  answer,
  buildCase,
  removePeriod,
  reportedZone,
  withdrawAnswer,
  zoneChoices,
  type CaseFields,
} from "./caseForm";
import { isZoneName } from "./compute";

const filled: CaseFields = {
  ...EMPTY_CASE,
  program_end_date: "2026-05-15",
  degree_level: "master",
  documents_count: "3",
  time_zone: "America/Los_Angeles",
};

function body(fields: CaseFields) {
  const built = buildCase(fields);
  if (!built.ok) throw new Error(built.problems.join(" "));
  return built.body;
}

function problems(fields: CaseFields) {
  const built = buildCase(fields);
  return built.ok ? [] : built.problems;
}

describe("buildCase", () => {
  it("builds the smallest case, with the parts that are off sent as null", () => {
    expect(body(filled)).toEqual({
      program_end_date: "2026-05-15",
      degree_level: "master",
      documents_count: 3,
      cpt_full_time_days: 0,
      opt: null,
      stem: null,
      employment: [],
      cap_gap: null,
      time_zone: "America/Los_Angeles",
      confirmations: {},
    });
  });

  it("sends an empty date inside a part that is on as null, never a guess", () => {
    const built = body({
      ...filled,
      opt_on: true,
      opt: { ...filled.opt, ead_start: "2026-06-01" },
    });
    expect(built.opt).toEqual({
      dso_recommendation_date: null,
      i765_filed_date: null,
      ead_start: "2026-06-01",
      ead_end: null,
    });
  });

  it("drops what was typed into a part that is switched off", () => {
    const built = body({
      ...filled,
      stem_on: false,
      stem: { ...filled.stem, ead_start: "2027-06-01" },
      cap_gap_on: false,
      cap_gap: { ...filled.cap_gap, requested_start: "2027-10-01" },
    });
    expect(built.stem).toBeNull();
    expect(built.cap_gap).toBeNull();
  });

  it("builds employment periods, with an open period ending in null", () => {
    const one = addPeriod(filled);
    const [period] = one.employment;
    if (!period) throw new Error("no period");
    const built = body({
      ...one,
      employment: [
        { ...period, start: "2026-06-20", hours_per_week: "22.5", employer_reported: true },
      ],
    });
    expect(built.employment).toEqual([
      { start: "2026-06-20", end: null, hours_per_week: 22.5, employer_reported: true },
    ]);
  });

  it("builds cap-gap", () => {
    const built = body({
      ...filled,
      cap_gap_on: true,
      cap_gap: {
        petition_filed_on: "2027-04-02",
        requested_start: "2027-10-01",
        change_of_status: true,
        status: "approved",
      },
    });
    expect(built.cap_gap).toEqual({
      petition_filed_on: "2027-04-02",
      requested_start: "2027-10-01",
      change_of_status: true,
      status: "approved",
    });
  });

  it("names every field it cannot use", () => {
    expect(problems(EMPTY_CASE)).toEqual(["Enter the program end date.", "Choose your time zone."]);
    expect(problems({ ...filled, documents_count: "" })).toEqual([
      "Enter the documents added as a whole number, 0 or more.",
    ]);
    expect(problems({ ...filled, documents_count: "-1" })).toHaveLength(1);
    expect(problems({ ...filled, cpt_full_time_days: "1.5" })).toEqual([
      "Enter the full-time CPT days as a whole number, 0 or more.",
    ]);
    expect(problems({ ...filled, cap_gap_on: true })).toEqual([
      "Enter the date the petition was filed.",
      "Enter the requested start date.",
    ]);
    expect(problems(addPeriod(filled))).toEqual([
      "Enter the hours per week for period 1 as a number from 0 to 168.",
      "Enter the start date for period 1.",
    ]);
  });

  it("refuses a date that is not on the calendar", () => {
    expect(problems({ ...filled, program_end_date: "2026-02-30" })).toHaveLength(1);
    expect(
      problems({ ...filled, opt_on: true, opt: { ...filled.opt, ead_end: "2026-13-01" } }),
    ).toEqual(["Enter the OPT EAD end date as a date, or leave it empty."]);
  });

  it("refuses hours outside a week", () => {
    const one = addPeriod(filled);
    const [period] = one.employment;
    if (!period) throw new Error("no period");
    for (const hours of ["169", "-1", "many", ""]) {
      const entered = { ...period, start: "2026-06-20", hours_per_week: hours };
      expect(problems({ ...one, employment: [entered] })).toHaveLength(1);
    }
  });

  it("never builds a case from text that is not a date", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const built = buildCase({ ...filled, program_end_date: text });
        if (built.ok) expect(built.body.program_end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }),
    );
  });
});

describe("employment periods", () => {
  it("adds with a fresh key and removes by key", () => {
    const three = addPeriod(addPeriod(addPeriod(EMPTY_CASE)));
    expect(three.employment.map((p) => p.key)).toEqual([1, 2, 3]);
    const two = removePeriod(three, 2);
    expect(two.employment.map((p) => p.key)).toEqual([1, 3]);
    expect(addPeriod(two).employment.map((p) => p.key)).toEqual([1, 3, 4]);
  });
});

describe("the time zone", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const reports = (timeZone: string) =>
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone,
    } as Intl.ResolvedDateTimeFormatOptions);

  it("starts from the zone the browser reports", () => {
    reports("Asia/Kolkata");
    expect(reportedZone()).toBe("Asia/Kolkata");
  });

  it("starts empty, never from a guess, when the browser reports none it can send", () => {
    reports("somewhere");
    expect(reportedZone()).toBe("");
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(() => {
      throw new Error("no zone");
    });
    expect(reportedZone()).toBe("");
  });

  it("sends the zone that is held, as it is", () => {
    expect(body({ ...filled, time_zone: "Asia/Kolkata" }).time_zone).toBe("Asia/Kolkata");
  });

  it("builds no case without a zone the contract takes", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const built = buildCase({ ...filled, time_zone: text });
        expect(built.ok).toBe(isZoneName(text));
        if (!built.ok) expect(built.problems).toEqual(["Choose your time zone."]);
      }),
    );
  });

  it("offers the zone held now, UTC, and what the browser knows, each once", () => {
    const choices = zoneChoices("Asia/Calcutta");
    expect(choices).toContain("Asia/Calcutta");
    expect(choices).toContain("UTC");
    expect(choices).toContain("America/Los_Angeles");
    expect(new Set(choices).size).toBe(choices.length);
    expect(choices.every(isZoneName)).toBe(true);
  });

  it("still offers a choice when the browser gives no list", () => {
    vi.spyOn(Intl, "supportedValuesOf").mockImplementation(() => {
      throw new RangeError("no list");
    });
    expect(zoneChoices("")).toEqual(["UTC"]);
    expect(zoneChoices("Asia/Kolkata")).toEqual(["Asia/Kolkata", "UTC"]);
  });
});

describe("answers", () => {
  it("starts with none", () => {
    expect(body(filled).confirmations).toEqual({});
  });

  it("records an answer with its day, and sends it as recorded", () => {
    const answered = answer(filled, "held_post_completion_opt", false, "2026-09-28");
    expect(body(answered).confirmations).toEqual({
      held_post_completion_opt: { answer: false, on: "2026-09-28" },
    });
    expect(filled.confirmations).toEqual({});
  });

  it("changes one answer and leaves the others as they were", () => {
    const two = answer(
      answer(filled, "held_post_completion_opt", false, "2026-09-27"),
      "no_employment_to_record",
      true,
      "2026-09-27",
    );
    const changed = answer(two, "held_post_completion_opt", true, "2026-09-28");
    expect(changed.confirmations).toEqual({
      held_post_completion_opt: { answer: true, on: "2026-09-28" },
      no_employment_to_record: { answer: true, on: "2026-09-27" },
    });
  });

  it("removes one answer and leaves the others as they were", () => {
    const two = answer(
      answer(filled, "held_post_completion_opt", false, "2026-09-27"),
      "no_employment_to_record",
      true,
      "2026-09-27",
    );
    expect(withdrawAnswer(two, "held_post_completion_opt").confirmations).toEqual({
      no_employment_to_record: { answer: true, on: "2026-09-27" },
    });
    expect(withdrawAnswer(filled, "held_post_completion_opt").confirmations).toEqual({});
  });
});
