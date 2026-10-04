import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { Checker, knownWords, plainProblem } from "./schema";

const CONTRACTS = join(__dirname, "..", "..", "contracts");
const contract = (name: string): unknown => JSON.parse(readFileSync(join(CONTRACTS, name), "utf8"));
const CASE_ID = "https://duly.local/contracts/case.schema.json";

describe("the words a schema may use", () => {
  it("covers every word in the contracts the bridges check", () => {
    for (const name of [
      "case.schema.json",
      "desktop_case_bridge.schema.json",
      "engine_output.schema.json",
      "schedule.schema.json",
      "update.schema.json",
      "desktop_engine_bridge.schema.json",
      "desktop_ask_bridge.schema.json",
      "desktop_state_bridge.schema.json",
    ]) {
      expect(() => knownWords(contract(name)), name).not.toThrow();
    }
  });

  it("refuses a word it does not know, so no check is skipped", () => {
    expect(() => knownWords({ type: "object", allOf: [] })).toThrow(/allOf/);
    expect(() => knownWords({ properties: { a: { if: {} } } })).toThrow(/if/);
    expect(() => knownWords({ format: "email" })).toThrow(/email/);
    expect(() => new Checker([{ type: "object" }])).toThrow(/\$id/);
  });
});

describe("oneOf and date-time", () => {
  const ID = "https://duly.local/test.schema.json";
  const checker = new Checker([
    {
      $id: ID,
      $defs: {
        one: { oneOf: [{ type: "integer" }, { type: "number" }] },
        when: { type: "string", format: "date-time" },
      },
    },
  ]);

  it("takes a value that matches exactly one choice, and no other", () => {
    expect(checker.problem(`${ID}#/$defs/one`, 1.5)).toBeNull();
    expect(checker.problem(`${ID}#/$defs/one`, 2)).toBe("/: oneOf");
    expect(checker.problem(`${ID}#/$defs/one`, "2")).toBe("/: oneOf");
  });

  it("takes a real date and time with an offset, and nothing else", () => {
    for (const good of ["2026-09-15T10:00:00Z", "2026-09-15T10:00:00.5-04:00"]) {
      expect(checker.problem(`${ID}#/$defs/when`, good), good).toBeNull();
    }
    for (const bad of [
      "2026-02-30T10:00:00Z",
      "2026-09-15T24:00:00Z",
      "2026-09-15T10:00:00",
      "x",
    ]) {
      expect(checker.problem(`${ID}#/$defs/when`, bad), bad).toBe("/: format");
    }
  });
});

describe("plain data", () => {
  it("takes JSON values", () => {
    expect(plainProblem({ a: [1, "b", true, null, { c: 2 }] })).toBeNull();
    expect(plainProblem(Object.create(null) as object)).toBeNull();
  });

  it("refuses what JSON could not carry", () => {
    expect(plainProblem({ a: Number.NaN })).toBe("/*: finite");
    expect(plainProblem([Number.POSITIVE_INFINITY])).toBe("/0: finite");
    expect(plainProblem({ a: new Date(0) })).toBe("/*: plain data");
    expect(plainProblem(new Map())).toBe(": plain data");
    expect(plainProblem({ a: undefined })).toBe("/*: plain data");
    expect(plainProblem(1n)).toBe(": plain data");
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(plainProblem(loop)).toBe("/*: plain data");
  });

  it("allows the same object twice when it is not a loop", () => {
    const shared = { a: 1 };
    expect(plainProblem([shared, shared])).toBeNull();
  });
});

describe("checking a value", () => {
  const checker = new Checker([
    contract("case.schema.json"),
    contract("desktop_case_bridge.schema.json"),
  ]);
  const good = {
    categories: ["f1"],
    time_zone: "America/Chicago",
    facts: { status: "f1" },
    records: [
      {
        id: "p1",
        kind: "program",
        fields: { end: "2027-05-15", periods: [{ start: "2026-01-02" }] },
      },
    ],
    complete: { program: { on: "2026-09-01" } },
  };

  it("passes a case that matches", () => {
    expect(checker.problem(CASE_ID, good)).toBeNull();
  });

  it("names where and which rule, never the value", () => {
    expect(checker.problem(CASE_ID, { ...good, time_zone: "Mars Base" })).toBe(
      "/time_zone: pattern",
    );
    expect(checker.problem(CASE_ID, { ...good, categories: [] })).toBe("/categories: minItems");
    const noRecords: Record<string, unknown> = { ...good };
    delete noRecords.records;
    expect(checker.problem(CASE_ID, noRecords)).toBe("/: required records");
  });

  it("writes a key the schema does not name as a star", () => {
    const secret = "passport_x1234567";
    const problem = checker.problem(CASE_ID, { ...good, [secret]: 1 });
    expect(problem).toBe("/*: additionalProperties");
    const facts = checker.problem(CASE_ID, { ...good, facts: { "Born 1990-01-01": 1 } });
    expect(facts).toBe("/facts/*: propertyNames");
  });

  it("refuses a date that is not a day on the calendar", () => {
    const bad = { ...good, complete: { program: { on: "2026-02-30" } } };
    expect(checker.problem(CASE_ID, bad)).toBe("/complete/*/on: format");
    const early = { ...good, complete: { program: { on: "1949-12-31" } } };
    expect(checker.problem(CASE_ID, early)).toBe("/complete/*/on: pattern");
  });

  it("follows anyOf, numbers and lists", () => {
    const high = { ...good, facts: { credits: 100001 } };
    expect(checker.problem(CASE_ID, high)).toBeNull();
    const hours = {
      ...good,
      records: [
        {
          id: "p1",
          kind: "program",
          fields: { periods: [{ start: "2026-01-02", hours_per_week: 200 }] },
        },
      ],
    };
    expect(checker.problem(CASE_ID, hours)).toBeNull();
    // anyOf still refuses: an empty string is no value a person typed (W2-U0 check).
    expect(checker.problem(CASE_ID, { ...good, facts: { x: "" } })).toBe("/facts/*: anyOf");
  });

  it("refuses NaN and a class before any rule", () => {
    expect(checker.problem(CASE_ID, { ...good, facts: { credits: Number.NaN } })).toBe(
      "/*/*: finite",
    );
  });

  it("follows a $ref into the other contract", () => {
    const address =
      "https://duly.local/contracts/desktop_case_bridge.schema.json#/$defs/write_call";
    expect(checker.problem(address, { version: "v1", call: "case.write", case: good })).toBeNull();
    expect(
      checker.problem(address, { version: "v1", call: "case.write", case: { ...good, facts: 1 } }),
    ).toBe("/case/facts: type");
    expect(checker.problem(address, { version: "v2", call: "case.write", case: good })).toBe(
      "/version: const",
    );
  });

  it("refuses an address it does not hold", () => {
    expect(() => checker.problem("https://duly.local/contracts/other.json", {})).toThrow();
    expect(() => checker.problem(`${CASE_ID}#/$defs/nothing`, {})).toThrow();
  });

  it("checks type lists, integers, enums and string lengths", () => {
    const small = new Checker([
      {
        $id: "https://duly.local/small.json",
        type: "object",
        properties: {
          a: { type: ["integer", "null"] },
          b: { enum: ["x", "y"] },
          c: { type: "string", minLength: 2, maxLength: 3 },
          d: { type: "array", maxItems: 1 },
          e: false,
          f: { type: "number", minimum: 1 },
          g: { type: "object", maxProperties: 1 },
        },
      },
    ]);
    const id = "https://duly.local/small.json";
    expect(small.problem(id, { a: 1, b: "x", c: "ab", d: [], f: 1, g: {} })).toBeNull();
    expect(small.problem(id, { a: 1.5 })).toBe("/a: type");
    expect(small.problem(id, { a: null, b: "z" })).toBe("/b: enum");
    expect(small.problem(id, { c: "a" })).toBe("/c: minLength");
    expect(small.problem(id, { c: "abcd" })).toBe("/c: maxLength");
    expect(small.problem(id, { d: [1, 2] })).toBe("/d: maxItems");
    expect(small.problem(id, { e: 1 })).toBe("/e: false");
    expect(small.problem(id, { f: 0 })).toBe("/f: minimum");
    expect(small.problem(id, { g: { a: 1, b: 2 } })).toBe("/g: maxProperties");
    expect(small.problem(id, [])).toBe("/: type");
  });
});
