import { describe, expect, it, vi } from "vitest";

import { CaseRefused, computeF1, engineOutputSchema } from "./compute";
import { CASE, OUTPUT } from "./fixtures";

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
