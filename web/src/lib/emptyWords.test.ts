// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { newCase, type AppCase } from "../app/caseStore";
import { EMPTY_WORDS } from "./labels";
import { applyFlow, onboardingSteps, setField } from "./views/onboarding";

// SPEC-W2-UNKNOWN point 2: each field the pack declares when_absent not_yet or none carries
// the screen words rulepacks/f1-us/v2026.09/CHANGELOG.md records for it, so that leaving it
// empty is the person's statement, not a guess. The declaration is the CHANGELOG as it stands:
// a later line that turns a field to ask (D94: petition.requested_start, validity_start)
// takes its words away, since an empty field the pack asks is never a statement.
const CHANGELOG = new URL("../../../rulepacks/f1-us/v2026.09/CHANGELOG.md", import.meta.url);
const LINE = /^- ([a-z_]+\.[a-z_]+): when_absent (\S+?)[.,]? (.*)$/;
const WORDS = /Screen words: "(.+)"$/;

function recorded(): Record<string, string> {
  const words = new Map<string, string>();
  for (const line of readFileSync(CHANGELOG, "utf8").split("\n")) {
    const found = LINE.exec(line);
    if (!found) continue;
    const field = found[1] ?? "";
    const said = WORDS.exec(found[3] ?? "");
    if (found[2] === "ask" || !said) words.delete(field);
    else words.set(field, said[1] ?? "");
  }
  return Object.fromEntries(words);
}

describe("the words for an empty field (point 2)", () => {
  it("are the words the pack's CHANGELOG records, for every field it names", () => {
    // Kills: a field left out of EMPTY_WORDS, or words that differ from the pack's.
    const words = recorded();
    expect(Object.keys(words).length).toBeGreaterThan(0);
    expect(words).not.toHaveProperty(["petition.requested_start"]);
    expect(words).not.toHaveProperty(["petition.validity_start"]);
    expect(EMPTY_WORDS).toEqual(words);
  });

  it("show under each field Onboarding lets the person leave empty", () => {
    // Kills: an Onboarding field with words that are not its own field's.
    let held: AppCase = { ...newCase("America/New_York"), status: "f1" };
    held = applyFlow(held, "h1b", "yes", "2026-09-29");
    held = setField(held, "h1", "outcome", "approved");
    const records = new Map(held.draft.records.map((record) => [record.id, record.kind]));
    const fields = onboardingSteps(held, 0).flatMap((view) => view.fields ?? []);
    const shown = fields.filter((field) => field.empty !== undefined);
    // D94: the petition's start dates are asked when empty, so they carry no words.
    // Kills: a petition start shown with words that say empty means it has none.
    const starts = fields.filter((field) =>
      ["requested_start", "validity_start"].includes(field.name),
    );
    expect(starts.map((field) => field.name)).toEqual(["requested_start", "validity_start"]);
    for (const field of starts) expect(field.empty).toBeUndefined();
    for (const field of shown) {
      const key = `${records.get(field.record) ?? ""}.${field.name}`;
      expect(field.empty).toBe((EMPTY_WORDS as Record<string, string>)[key]);
      expect(field.optional).toBe(true);
    }
  });
});
