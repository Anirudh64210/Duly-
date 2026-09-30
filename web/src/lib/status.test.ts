import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { VERDICT_STATES, fetchStatus, headline, reasonLine, statusSchema } from "./status";

const good = {
  database: "ok",
  rulepacks: [{ category: "f1", version: "v2026.09", parameters: 0 }],
  verdict: { state: "cannot_tell", reasons: ["no_documents"] },
  checked_at: "2026-09-28T12:00:00+00:00",
};

const reply = (body: unknown, ok = true, status = 200) =>
  (() =>
    Promise.resolve({ ok, status, json: () => Promise.resolve(body) })) as unknown as typeof fetch;

describe("status parsing", () => {
  it("accepts the contract shape", () => {
    expect(statusSchema.parse(good)).toEqual(good);
  });

  it("refuses a verdict state the contract does not name", () => {
    expect(() =>
      statusSchema.parse({ ...good, verdict: { state: "all_clear", reasons: [] } }),
    ).toThrow();
  });

  it("refuses extra fields", () => {
    expect(() => statusSchema.parse({ ...good, advice: "apply now" })).toThrow();
  });

  it("fetches and parses", async () => {
    await expect(fetchStatus(reply(good))).resolves.toEqual(good);
  });

  it("asks for the status path relative to the page", async () => {
    const urls: unknown[] = [];
    const get = ((url: unknown) => {
      urls.push(url);
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(good) });
    }) as unknown as typeof fetch;
    await fetchStatus(get);
    expect(urls).toEqual(["api/v1/status"]);
  });

  it("throws on a failed response", async () => {
    await expect(fetchStatus(reply({}, false, 503))).rejects.toThrow("503");
  });

  it("throws on a malformed body", async () => {
    await expect(fetchStatus(reply({ database: "ok" }))).rejects.toThrow();
  });
});

describe("verdict copy", () => {
  it("has a headline for each of the four states", () => {
    expect(new Set(VERDICT_STATES.map(headline)).size).toBe(4);
  });

  it("scopes the quiet state to what the user added", () => {
    expect(headline("no_open_items")).toBe("No open items in what you've added");
  });

  it("names known reasons in plain words", () => {
    expect(reasonLine("no_documents")).toBe("Nothing has been added yet.");
    expect(reasonLine("rule_in_litigation")).toBe(
      "A court paused a change to a rule that applies here, and the two rules give different dates.",
    );
    expect(reasonLine("missing:ead_card")).toBe("Duly needs your ead card.");
    expect(reasonLine("conflict:program_end")).toBe("Two documents disagree on program end.");
  });

  it("does not mistake built-in object names for reasons", () => {
    for (const name of ["constructor", "valueOf", "toString", "__proto__", "hasOwnProperty"]) {
      expect(reasonLine(name)).toBe("Duly needs more before it can say.");
    }
  });

  it("never shows a raw code or an empty line, whatever the reason", () => {
    fc.assert(
      fc.property(fc.string(), (reason) => {
        const line = reasonLine(reason);
        expect(line.length).toBeGreaterThan(0);
        expect(line.endsWith(".")).toBe(true);
        expect(line).not.toContain("_");
      }),
    );
  });
});
