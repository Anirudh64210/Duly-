import { describe, expect, it, vi } from "vitest";

import fc from "fast-check";

import { CaseRefused, computeF1, engineOutputSchema, isZoneName } from "./compute";
import { ANSWERED_NO, ASKING, CASE, OUTPUT } from "./fixtures";

const reply = (body: unknown, status = 200) =>
  vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  );

const asFetch = (mock: ReturnType<typeof reply>) => mock as unknown as typeof fetch;

describe("engine output parsing", () => {
  it("accepts the contract shape", () => {
    expect(engineOutputSchema.parse(OUTPUT)).toEqual(OUTPUT);
  });

  it("refuses a verdict state the contract does not name", () => {
    expect(() =>
      engineOutputSchema.parse({ ...OUTPUT, verdict: { state: "all_clear", reasons: [] } }),
    ).toThrow();
  });

  it("refuses extra fields", () => {
    expect(() => engineOutputSchema.parse({ ...OUTPUT, advice: "apply now" })).toThrow();
    const [first, ...rest] = OUTPUT.computed;
    expect(() =>
      engineOutputSchema.parse({ ...OUTPUT, computed: [{ ...first, meaning: "fine" }, ...rest] }),
    ).toThrow();
  });

  it("refuses an item status outside the five tags", () => {
    const [first, ...rest] = OUTPUT.computed;
    expect(() =>
      engineOutputSchema.parse({ ...OUTPUT, computed: [{ ...first, status: "certain" }, ...rest] }),
    ).toThrow();
  });

  it("refuses an item that names no rule", () => {
    const [first, ...rest] = OUTPUT.computed;
    expect(() =>
      engineOutputSchema.parse({ ...OUTPUT, computed: [{ ...first, rule_ids: [] }, ...rest] }),
    ).toThrow();
  });

  it("refuses an item whose rule has no source", () => {
    const [first, ...rest] = OUTPUT.computed;
    expect(() =>
      engineOutputSchema.parse({
        ...OUTPUT,
        computed: [{ ...first, rule_ids: ["opt.unknown_rule"] }, ...rest],
      }),
    ).toThrow();
    expect(() =>
      engineOutputSchema.parse({
        ...OUTPUT,
        computed: [{ ...first, rule_ids: ["constructor"] }, ...rest],
      }),
    ).toThrow();
  });

  it("keeps the operative regime and its legal status as the engine gave them", () => {
    const computed = OUTPUT.computed.map((item) =>
      item.id === "grace.ends"
        ? { ...item, operative: { regime: "ds_2012", legal_status: "appealed" } }
        : item,
    );
    const parsed = engineOutputSchema.parse({ ...OUTPUT, computed });
    const grace = parsed.computed.find((item) => item.id === "grace.ends");
    expect(grace?.operative).toEqual({ regime: "ds_2012", legal_status: "appealed" });
  });

  it("refuses alternates that come without the operative regime", () => {
    const computed = OUTPUT.computed.map(({ operative, ...item }) =>
      operative && item.id !== "grace.ends" ? { ...item, operative } : item,
    );
    expect(() => engineOutputSchema.parse({ ...OUTPUT, computed })).toThrow();
  });

  it("refuses an operative regime with no legal status or with extra fields", () => {
    const withOperative = (operative: unknown) =>
      OUTPUT.computed.map((item) => (item.id === "grace.ends" ? { ...item, operative } : item));
    expect(() =>
      engineOutputSchema.parse({ ...OUTPUT, computed: withOperative({ regime: "ds_2012" }) }),
    ).toThrow();
    expect(() =>
      engineOutputSchema.parse({
        ...OUTPUT,
        computed: withOperative({ regime: "ds_2012", legal_status: "effective", note: "fine" }),
      }),
    ).toThrow();
  });

  it("refuses a rule without a citation", () => {
    const rule = { value: 90, unit: "days", status: "settled", url: "u", checked_on: "2026-09-28" };
    expect(() =>
      engineOutputSchema.parse({
        ...OUTPUT,
        rules: { ...OUTPUT.rules, "opt.unemployment_limit_days": rule },
      }),
    ).toThrow();
  });
});

function without(record: Record<string, unknown>, key: string) {
  return Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));
}

describe("the context round", () => {
  const rule = OUTPUT.rules["cpt.full_time_months_bar"];
  const withRule = (changed: Record<string, unknown>) => ({
    ...OUTPUT,
    rules: { ...OUTPUT.rules, "cpt.full_time_months_bar": changed },
  });

  it("accepts an open question, and an answered case with a rule no item names", () => {
    expect(engineOutputSchema.parse(ASKING).questions).toEqual(ASKING.questions);
    expect(Object.keys(engineOutputSchema.parse(ANSWERED_NO).rules)).toEqual([
      "stem.requires_post_completion_opt",
    ]);
  });

  it("keeps the day and the zone as the engine gave them", () => {
    expect(engineOutputSchema.parse(OUTPUT).today).toEqual(OUTPUT.today);
  });

  it("refuses an answer with no day, no zone, or no list of questions", () => {
    const noToday = without(OUTPUT, "today");
    const noQuestions = without(OUTPUT, "questions");
    expect(() => engineOutputSchema.parse(noToday)).toThrow();
    expect(() => engineOutputSchema.parse(noQuestions)).toThrow();
    expect(() => engineOutputSchema.parse({ ...OUTPUT, today: { date: "2026-09-28" } })).toThrow();
    expect(() =>
      engineOutputSchema.parse({ ...OUTPUT, today: { ...OUTPUT.today, date: "Sep 28" } }),
    ).toThrow();
  });

  it("refuses a question with no id it can read or nothing that raised it", () => {
    for (const question of [
      { id: "Held OPT", because: ["stem"] },
      { id: "held_post_completion_opt", because: [] },
      { id: "held_post_completion_opt" },
      { id: "held_post_completion_opt", because: ["stem"], answer: true },
    ]) {
      expect(() => engineOutputSchema.parse({ ...ASKING, questions: [question] })).toThrow();
    }
  });

  it("refuses an open question beside any verdict other than cannot_tell", () => {
    fc.assert(
      fc.property(fc.constantFrom("no_open_items", "needs_you", "talk_to_dso"), (state) => {
        const output = { ...ASKING, verdict: { state, reasons: [] } };
        expect(() => engineOutputSchema.parse(output)).toThrow();
      }),
    );
  });

  it("keeps the derivation and the note of a rule", () => {
    const parsed = engineOutputSchema.parse(OUTPUT).rules["cpt.full_time_months_bar"];
    expect(parsed?.derivation).toBe("reading");
    expect(parsed?.note).toBe(rule.note);
  });

  it("refuses a derivation that is neither verbatim nor a reading", () => {
    expect(() => engineOutputSchema.parse(withRule({ ...rule, derivation: "summary" }))).toThrow();
  });

  it("refuses a reading without its note or without the words it was read from", () => {
    const noNote = without(rule, "note");
    const noQuote = without(rule, "quote");
    expect(() => engineOutputSchema.parse(withRule(noNote))).toThrow();
    expect(() => engineOutputSchema.parse(withRule({ ...rule, note: "" }))).toThrow();
    expect(() => engineOutputSchema.parse(withRule(noQuote))).toThrow();
  });
});

describe("zone names", () => {
  it("takes the names the case contract takes", () => {
    for (const zone of ["America/Los_Angeles", "Asia/Kolkata", "UTC", "America/Indiana/Knox"]) {
      expect(isZoneName(zone)).toBe(true);
    }
    for (const zone of ["", "PST", "utc", "Mars", "America/", "a/b/c/d", `A/${"b".repeat(64)}`]) {
      expect(isZoneName(zone)).toBe(false);
    }
  });
});

describe("computeF1", () => {
  it("posts the case as json to the compute path", async () => {
    const post = reply(OUTPUT);
    await expect(computeF1(CASE, asFetch(post))).resolves.toEqual(OUTPUT);
    expect(post).toHaveBeenCalledWith("/api/v1/compute/f1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(CASE),
    });
  });

  it("carries the server's words when the case is refused", async () => {
    const refused = computeF1(
      CASE,
      asFetch(reply({ detail: "program_end_date is not a date" }, 422)),
    );
    await expect(refused).rejects.toBeInstanceOf(CaseRefused);
    await expect(refused).rejects.toMatchObject({ problem: "program_end_date is not a date" });
  });

  it("carries nothing when the refusal has no plain words", async () => {
    for (const body of [{}, { detail: [{ loc: ["body"] }] }, { detail: "" }, null, "no"]) {
      await expect(computeF1(CASE, asFetch(reply(body, 422)))).rejects.toMatchObject({
        problem: null,
      });
    }
  });

  it("carries nothing when the refusal cannot be read", async () => {
    const post = (() =>
      Promise.resolve({
        ok: false,
        status: 422,
        json: () => Promise.reject(new Error("not json")),
      })) as unknown as typeof fetch;
    await expect(computeF1(CASE, post)).rejects.toMatchObject({ problem: null });
  });

  it("throws on a failed response", async () => {
    await expect(computeF1(CASE, asFetch(reply({}, 503)))).rejects.toThrow("503");
  });

  it("throws on a malformed body", async () => {
    await expect(computeF1(CASE, asFetch(reply({ verdict: {} })))).rejects.toThrow();
  });
});
