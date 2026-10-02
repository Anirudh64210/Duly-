import { describe, expect, it } from "vitest";

import { becauseLine, shownValue } from "./labels";

// SPEC-W2-UNKNOWN point 38: the question line and a withheld value, in the words of
// unreadableLine, undecidedLine and waitingLine.
describe("the words for an unknown value on screen (point 38)", () => {
  it("shows an unreadable value back as entered on the question line", () => {
    // Kills: the value as entered dropped, or the reason read as missing.
    const line = becauseLine(["unreadable:w1.hours_per_week"], { "w1.hours_per_week": "forty" });
    expect(line).toBe(
      "Duly could not read what was entered for Job 1, Hours a week: forty. Check it and enter it again.",
    );
  });

  it("says the person was not sure, and names the DSO", () => {
    expect(becauseLine(["undecided:w1.end"])).toBe(
      "You said you were not sure about Job 1, Last day of the job. Add it when you know. Your DSO can tell you.",
    );
  });

  it("keeps the words as today for an absent value", () => {
    expect(becauseLine(["missing:w1.end"])).toBe("Asked because nothing is entered for it yet.");
  });

  it("shows a withheld number as waiting, never a number and never 0", () => {
    // Kills: a withheld count shown as 0 or as Not computed.
    const words = shownValue({ value: null, unit: "days", waits_on: ["w1.hours_per_week"] });
    expect(words).toBe("Waiting for Job 1, Hours a week");
    expect(words).not.toMatch(/\b0\b/);
  });

  it("reads a pending entry as after the event", () => {
    expect(shownValue({ value: null, unit: "date", waits_on: ["pending:w1.end"] })).toBe(
      "After Job 1, Last day of the job",
    );
  });

  it("shows a known value as before", () => {
    expect(shownValue({ value: 30, unit: "", waits_on: undefined })).toBe("30");
  });
});
