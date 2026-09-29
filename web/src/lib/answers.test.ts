import { describe, expect, it } from "vitest";

import { answerFits, fittingAnswers } from "./answers";
import { engineOutputSchema, type F1Case } from "./compute";
import { CASE, OUTPUT } from "./fixtures";

// SPEC-resolutions point 33, with point 7: an answer holds for the values it was given for.

const ON = "2026-09-29";

describe("an answer and the facts entered", () => {
  it("fits while every value it was given for is entered as it was", () => {
    const given = {
      answer: true,
      on: ON,
      about: { "opt.i765_filed_date": "2026-04-10", "opt.ead_start": "2026-06-01" },
    };
    expect(answerFits(given, CASE)).toBe(true);
  });

  it("does not fit once one of those values changes", () => {
    const given = { answer: true, on: ON, about: { "opt.ead_start": "2026-06-01" } };
    const changed: F1Case = {
      ...CASE,
      opt: {
        dso_recommendation_date: null,
        i765_filed_date: null,
        ead_start: "2026-06-02",
        ead_end: null,
      },
    };
    expect(answerFits(given, changed)).toBe(false);
  });

  it("never fits with no about", () => {
    expect(answerFits({ answer: false, on: ON }, CASE)).toBe(false);
  });

  it("reads a whole block as true when entered and null when not", () => {
    const given = { answer: false, on: ON, about: { stem: true, opt: null } };
    expect(answerFits(given, { ...CASE, opt: null, stem: CASE.opt })).toBe(true);
    expect(answerFits(given, CASE)).toBe(false);
  });

  it("reads a field of a block that is not entered as null", () => {
    const given = { answer: true, on: ON, about: { employment: [], "opt.ead_start": null } };
    expect(answerFits(given, { ...CASE, opt: null, employment: [] })).toBe(true);
    expect(answerFits(given, { ...CASE, employment: [] })).toBe(false);
  });

  it("reads an employment period by its number, as entered", () => {
    const given = {
      answer: true,
      on: ON,
      about: { "employment.1.start": "2026-06-20", "employment.1.end": null },
    };
    expect(answerFits(given, CASE)).toBe(true);
    expect(answerFits(given, { ...CASE, employment: [] })).toBe(false);
  });

  it("does not take a number that could not be read as the null of nothing entered", () => {
    const given = { answer: false, on: ON, about: { cpt_full_time_days: null } };
    expect(answerFits(given, { ...CASE, cpt_full_time_days: null })).toBe(true);
    expect(answerFits(given, { ...CASE, cpt_full_time_days: Number.NaN })).toBe(false);
    expect(answerFits(given, CASE)).toBe(false);
  });

  it("leaves a key that is not a fact to the engine, and checks it against an output", () => {
    const output = engineOutputSchema.parse(OUTPUT);
    const [item] = output.computed.filter((entry) => typeof entry.value === "string");
    if (!item) throw new Error("no dated item");
    const given = { answer: true, on: ON, about: { [item.id]: item.value } };
    expect(answerFits(given, CASE)).toBe(true);
    expect(answerFits(given, CASE, output)).toBe(true);
    const moved = { answer: true, on: ON, about: { [item.id]: "1999-01-01" } };
    expect(answerFits(moved, CASE, output)).toBe(false);
    const gone = { answer: true, on: ON, about: { "stem.not_an_item": "2026-01-01" } };
    expect(answerFits(gone, CASE, output)).toBe(false);
  });

  it("keeps the answers that fit and drops the rest", () => {
    const kept = { answer: true, on: ON, about: { program_end_date: "2026-05-15" } };
    const dropped = { answer: true, on: ON, about: { program_end_date: "2026-05-16" } };
    expect(fittingAnswers({ a: kept, b: dropped }, CASE)).toEqual({ a: kept });
  });
});
