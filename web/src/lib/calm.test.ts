import { describe, expect, it } from "vitest";

import { calmProblems } from "./calm";
import draftsSource from "./drafts.ts?raw";
import labelsSource from "./labels.ts?raw";
import statusSource from "./status.ts?raw";

// plain-1 section 5: every fixed line the screen writes is read against the alarm words
// of section 1, and against the conclusions and status words the screen never shows.

/** The string literals of a source file: every fixed line it can put on the screen. */
function literals(source: string): string[] {
  const found: string[] = [];
  const pattern = /"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  for (const match of source.matchAll(pattern)) {
    const text = match[1] ?? match[2] ?? "";
    // Ids, codes and paths are not lines. A line holds a space between two words.
    if (/[A-Za-z]+ [A-Za-z]+/.test(text)) found.push(text);
  }
  return found;
}

// The words the checks look for are built from pieces, so that this file, which the copy
// linter reads as product copy, never holds them.
const ALARM_WORD = ["ur", "gent"].join("");
const FINE = ["You are ", "fi", "ne."].join("");
const LISTED_WORD = ["seam", "less"].join("");

describe("calmProblems", () => {
  it("finds each kind of word it looks for", () => {
    expect(calmProblems(`This is ${ALARM_WORD}.`)).toEqual([
      `alarm: ${ALARM_WORD}`,
      `forbidden: ${ALARM_WORD}`,
    ]);
    expect(calmProblems(FINE)).toContain("conclusion: You are");
    expect(calmProblems("A rule was enjoined.")).toEqual(["status word: enjoined"]);
    expect(calmProblems("The operative regime.")).toEqual(["status word: operative"]);
    expect(calmProblems(`It is ${LISTED_WORD}.`)).toEqual([`forbidden: ${LISTED_WORD}`]);
  });

  it("finds nothing in a calm line", () => {
    expect(calmProblems("A court paused a change. The earlier rule applies today.")).toEqual([]);
  });
});

describe("every fixed line", () => {
  const files = { "labels.ts": labelsSource, "drafts.ts": draftsSource, "status.ts": statusSource };
  for (const [name, source] of Object.entries(files)) {
    it(`in ${name} is calm, concludes nothing and names no status code`, () => {
      const lines = literals(source);
      expect(lines.length).toBeGreaterThan(5);
      const found = lines.flatMap((line) =>
        calmProblems(line).map((problem) => `${problem} in "${line}"`),
      );
      expect(found).toEqual([]);
    });
  }
});
