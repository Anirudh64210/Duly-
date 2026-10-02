// specs/step-w/SPEC-W2-UNKNOWN.md point 43: the screen sends what was typed. cleanField and
// caseRecord in web/src/lib/records.ts drop a number or date that does not parse, and a link to
// no record, so the person is asked "missing" about something they typed. Both send the value
// as typed; the engine reads it and asks. An empty or whitespace-only value is sent as absent,
// never "".
import { describe, expect, it } from "vitest";

import { caseRecord, type DraftRecord } from "../../web/src/lib/records";

function work(fields: DraftRecord["fields"]): DraftRecord {
  return { id: "w1", kind: "work", fields };
}

const IDS = new Set(["a1", "e1"]);

describe("point 43, the screen sends what was typed", () => {
  it("a date that does not parse is sent as typed", () => {
    // Fails today: cleanField drops "08/03/2026" and the engine asks "missing".
    expect(caseRecord(work({ start: "08/03/2026" }), IDS).fields.start).toBe("08/03/2026");
    expect(caseRecord(work({ end: "2026-13-40" }), IDS).fields.end).toBe("2026-13-40");
  });

  it("a number that does not parse is sent as typed", () => {
    expect(caseRecord(work({ hours_per_week: "forty" }), IDS).fields.hours_per_week).toBe("forty");
  });

  it("a link to no record is sent as typed", () => {
    // Fails today: caseRecord drops a link to an id not in the case.
    expect(caseRecord(work({ under: "a9" }), IDS).fields.under).toBe("a9");
  });

  it("an empty or whitespace-only value is absent, never an empty string", () => {
    const fields = caseRecord(work({ start: "", end: "   ", employer: "" }), IDS).fields;
    expect("start" in fields).toBe(false);
    expect("end" in fields).toBe(false);
    expect("employer" in fields).toBe(false);
  });

  it("a value that reads is still sent", () => {
    const fields = caseRecord(work({ start: "2026-07-01", under: "a1" }), IDS).fields;
    expect(fields.start).toBe("2026-07-01");
    expect(fields.under).toBe("a1");
  });
});
