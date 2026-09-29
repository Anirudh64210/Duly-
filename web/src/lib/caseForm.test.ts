import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { EMPTY_CASE, addPeriod, buildCase, removePeriod, type CaseFields } from "./caseForm";

const filled: CaseFields = {
  ...EMPTY_CASE,
  program_end_date: "2026-05-15",
  degree_level: "master",
  documents_count: "3",
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
    expect(problems(EMPTY_CASE)).toEqual(["Enter the program end date."]);
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
