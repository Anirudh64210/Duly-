// specs/step-w/SPEC-W2-UNKNOWN.md point 38: the words for an unknown value. Three new exports of
// web/src/lib/labels.ts. The exports are read through a namespace import, so this file
// type-checks before L-web adds them, and a missing export fails the test, never skips it.
import { describe, expect, it } from "vitest";

import * as labels from "../../web/src/lib/labels";

type Line = (...args: string[]) => string;

function line(name: string): Line {
  const found = (labels as Record<string, unknown>)[name];
  expect(typeof found, `${name} is exported from labels.ts`).toBe("function");
  return found as Line;
}

describe("point 38, the words for an unknown value", () => {
  it("unreadableLine shows the value back as entered", () => {
    // "Duly could not read what was entered for <label>: <value as entered>. Check it and
    // enter it again." Fails if the value is dropped, converted, or the words differ.
    expect(line("unreadableLine")("the start of your job", "2026-13-40")).toBe(
      "Duly could not read what was entered for the start of your job: 2026-13-40. Check it and enter it again.",
    );
  });

  it("undecidedLine names the DSO", () => {
    expect(line("undecidedLine")("the end of your program")).toBe(
      "You said you were not sure about the end of your program. Add it when you know. Your DSO can tell you.",
    );
  });

  it("waitingLine never shows a number or 0", () => {
    const words = line("waitingLine")("the hours of your job at Acme");
    expect(words).toBe("Waiting for the hours of your job at Acme");
    expect(words).not.toMatch(/\d/);
  });

  it("no line uses a long dash", () => {
    // CLAUDE.md copy rule: no long dashes.
    const all = [
      line("unreadableLine")("x", "y"),
      line("undecidedLine")("x"),
      line("waitingLine")("x"),
    ];
    for (const words of all) expect(words).not.toMatch(/[–—]/);
  });
});
