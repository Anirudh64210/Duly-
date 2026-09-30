import { describe, expect, it } from "vitest";
import { z } from "zod";

import { CaseRefused } from "../lib/compute";
import { calmProblems } from "../lib/calm";
import { refusalLines } from "./refusal";

// design-1 section 3.11: every refusal is said in plain words, never the quiet state.

describe("refusalLines", () => {
  it("says the server did not accept the case, with its reason", () => {
    expect(refusalLines(new CaseRefused("program_end_date: not a date"))).toEqual([
      "The server did not accept the case.",
      "program_end_date: not a date",
    ]);
  });

  it("says only that when the server gave no reason", () => {
    expect(refusalLines(new CaseRefused(null))).toEqual(["The server did not accept the case."]);
  });

  it("says the answer could not be read when it does not match the contract", () => {
    const parsed = z.strictObject({ verdict: z.string() }).safeParse({});
    expect(parsed.success).toBe(false);
    expect(refusalLines(parsed.error as Error)).toEqual([
      "Duly could not read the answer from its server.",
    ]);
  });

  it("says the server could not be reached for any other failure", () => {
    expect(refusalLines(new TypeError("Failed to fetch"))).toEqual([
      "Duly could not reach its server.",
    ]);
    expect(refusalLines(new Error("status 500"))).toEqual(["Duly could not reach its server."]);
  });

  it("keeps every line calm", () => {
    const lines = [
      ...refusalLines(new CaseRefused(null)),
      ...refusalLines(Object.assign(new Error("x"), { name: "ZodError" })),
      ...refusalLines(new Error("x")),
    ];
    expect(calmProblems(lines.join("\n"))).toEqual([]);
  });
});
