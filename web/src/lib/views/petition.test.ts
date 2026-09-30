import { describe, expect, it } from "vitest";

import { newCase, type AppCase } from "../../app/caseStore";
import { applyFlow, fieldQuestion, petitionLabel, setField } from "./onboarding";

// resolutions point 18: whether a change-of-status petition belongs to the F-1 status held
// now turns on its outcome and its validity start. When either is missing the engine asks,
// and Duly asks the student, whether or not Onboarding showed the petition's views.

const OUTCOMES = ["pending", "approved", "denied", "rejected", "withdrawn", "revoked"];

/** A case with one H-1B petition from Acme, filed on 2026-03-30, and no outcome. */
function withPetition(views: boolean): AppCase {
  let held: AppCase = { ...newCase("America/New_York"), status: "f1" };
  held = applyFlow(held, "h1b", "yes", "2026-09-29");
  const petition = held.draft.records.find((r) => r.kind === "petition");
  const employer = petition?.fields.employer;
  expect(petition?.id).toBe("h1");
  expect(typeof employer).toBe("string");
  held = setField(held, String(employer), "name", "Acme");
  held = setField(held, "h1", "filed_on", "2026-03-30");
  held = setField(held, "h1", "change_of_status", "yes");
  // A case held from records alone, as the design shots hold one, has no Onboarding answers.
  return views ? held : { ...held, flow: {} };
}

describe("a petition's outcome and validity start, asked when missing (point 18)", () => {
  it("names a petition by its employer and filing day, as far as they are entered", () => {
    expect(petitionLabel(withPetition(false), "h1")).toBe(
      "H-1B petition, from Acme, filed Mar 30, 2026",
    );
    const bare = setField(setField(withPetition(false), "h1", "filed_on", ""), "e1", "name", "");
    expect(petitionLabel(bare, "h1")).toBe("H-1B petition");
  });

  it("asks for the outcome with every outcome and none chosen, with no Onboarding view", () => {
    const view = fieldQuestion(withPetition(false), "h1.outcome");
    expect(view).toMatchObject({
      id: "ask:h1.outcome",
      kind: "choice",
      title: "H-1B petition, from Acme, filed Mar 30, 2026: what has happened with it so far",
      record: "h1",
      field: "outcome",
      notSure: true,
    });
    expect(view?.options?.map((option) => option.value)).toEqual(OUTCOMES);
  });

  it("asks for the outcome in Onboarding's own view when Onboarding showed the petition", () => {
    const view = fieldQuestion(withPetition(true), "h1.outcome");
    expect(view).toMatchObject({ id: "ask:h1.outcome", kind: "choice", field: "outcome" });
    expect(view?.options?.map((option) => option.value)).toEqual(OUTCOMES);
  });

  it("asks for the validity start before the outcome is known, and it may stay unknown", () => {
    const view = fieldQuestion(withPetition(false), "h1.validity_start");
    expect(view?.kind).toBe("fields");
    expect(view?.title).toBe("The approved start date of the H-1B petition");
    expect(view?.fields).toEqual([
      {
        record: "h1",
        name: "validity_start",
        label: "The approved start date of the H-1B petition",
        type: "date",
        notSure: true,
      },
    ]);
    const shown = fieldQuestion(withPetition(true), "h1.validity_start");
    expect(shown?.fields?.[0]).toMatchObject({ name: "validity_start", notSure: true });
  });

  it("asks for the validity start of an approved petition in Onboarding's field, now required", () => {
    const held = setField(withPetition(true), "h1", "outcome", "approved");
    const view = fieldQuestion(held, "h1.validity_start");
    expect(view?.fields).toEqual([
      {
        record: "h1",
        name: "validity_start",
        label: "The approved start date",
        type: "date",
        optional: false,
        notSure: true,
      },
    ]);
  });

  it("names the petition's own filing day, never the I-765's", () => {
    const view = fieldQuestion(withPetition(false), "h1.filed_on");
    expect(view?.title).toBe("The day the H-1B petition was filed");
  });
});
