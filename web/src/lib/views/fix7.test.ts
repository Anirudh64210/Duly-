import { describe, expect, it } from "vitest";

import { caseBody, newCase, type AppCase } from "../../app/caseStore";
import { engineOutputSchema, type EngineOutput } from "../compute";
import { appReasonLine, reasonText } from "../labels";
import stemNext from "../../../samples/path-stem-next.json";
import { NOT_SURE, applyFlow, onboardingSteps, setField, type View } from "./onboarding";
import { currentStage, stageEyebrow } from "./stages";
import { timelineView, type TimelineRow } from "./timeline";

// Written by lane L-tests for web/src/lib/views/fix7.test.ts (plan-fix7, round tests). The
// lane owns tests/ only, so it is kept here; its imports are relative to web/src/lib/views,
// where it is to be copied unchanged.
//
// specs/product-2/resolutions.md points 22, 24 and 26 (reviews/product-2-fix6.md findings 1,
// 3 and 5), read from the views. The engine output is the saved sample made by engine/path.py
// (path-stem-next.json: program.p1 done, cpt.a1 done, opt_post.a2 current 2026-02-10 to
// 2027-02-09, stem.a2 next, grace.p1 later 2027-02-10 to 2027-04-10, trip.t1 done), changed
// only as contracts/engine_output.schema.json allows: a stage whose dates point 19 makes null
// has starts null, ends null and state "unknown", and the verdict carries cap_gap.for_dso.
// Point 22b: the nulled stage also carries cap_gap.for_dso in its own reasons.
// Each output goes through engineOutputSchema, so the web's copy of the contract must take
// the state "unknown". Not expected to pass before the build round of plan-fix7.

const STEP_BACK = "cap_gap.for_dso";
const DSO_DATES = "Your DSO can tell you these dates";

type RawStage = { id: string; state: string; [field: string]: unknown };
type RawOutput = { stages: RawStage[]; verdict: { state: string; reasons: string[] } };

/** A stage point 19 made null: no start, no end, no day counts, state unknown. */
function nulled(stage: RawStage): RawStage {
  return {
    ...stage,
    state: "unknown",
    starts: null,
    ends: null,
    ends_days_away: null,
    days_in: null,
    days_total: null,
    // Point 22b (specs/product-2/resolutions.md): the engine puts the step back in the
    // reasons of the stage a petition nulled, and the Timeline reads it from there only.
    reasons: [STEP_BACK],
  };
}

/** The sample with its stages changed, carrying the step back, parsed as the contract says. */
function shaped(change: (stages: RawStage[]) => RawStage[]): EngineOutput {
  const raw = structuredClone(stemNext) as unknown as RawOutput;
  return engineOutputSchema.parse({
    ...raw,
    verdict: { ...raw.verdict, reasons: [...raw.verdict.reasons, STEP_BACK] },
    stages: change(raw.stages),
  });
}

/** J19's shape: the card runs now, and the grace that would follow it is null. */
function cardRuns(): EngineOutput {
  return shaped((stages) =>
    stages.map((stage) => (stage.id === "grace.p1" ? nulled(stage) : stage)),
  );
}

/** J12's shape: the card has ended, and the grace after it is null. No stage is current. */
function cardEnded(): EngineOutput {
  return shaped((stages) =>
    stages.map((stage) => {
      if (stage.id === "grace.p1") return nulled(stage);
      if (stage.id === "opt_post.a2") return { ...stage, state: "done" };
      return stage;
    }),
  );
}

/** The null grace placed before the current card, so it is the first stage not done. */
function unknownFirst(): EngineOutput {
  return shaped((stages) => {
    const grace = stages.find((stage) => stage.id === "grace.p1") as RawStage;
    const rest = stages.filter((stage) => stage.id !== "grace.p1");
    const at = rest.findIndex((stage) => stage.id === "opt_post.a2");
    return [...rest.slice(0, at), nulled(grace), ...rest.slice(at)];
  });
}

function row(rows: readonly TimelineRow[], key: string): TimelineRow {
  const found = rows.find((entry) => entry.key === key);
  if (found === undefined) throw new Error(`no row ${key}`);
  return found;
}

function rowText(entry: TimelineRow): string {
  return [entry.title, entry.meta, ...entry.lines, entry.application ?? ""].join(" ");
}

function nows(output: EngineOutput): string[] {
  return timelineView(output, null)
    .rows.filter((entry) => entry.mark === "now")
    .map((entry) => entry.key);
}

describe("point 22: a stage whose dates a petition makes null is unknown, never current", () => {
  it("takes the state unknown as the contract gives it", () => {
    // Kills: the web's copy of the contract left at done, current, next and later, which
    // would refuse every output that holds a petition.
    const grace = (cardRuns().stages ?? []).find((stage) => stage.id === "grace.p1");
    expect(grace?.state).toBe("unknown");
  });

  it("never takes an unknown stage as the current stage", () => {
    // Kills: an unknown stage read as current because it has no dates to place it.
    expect(currentStage(cardRuns())?.id).toBe("opt_post.a2");
    expect(currentStage(unknownFirst())?.id).toBe("opt_post.a2");
    expect(currentStage(cardEnded())).toBeNull();
  });

  it("never names an unknown stage in Home's eyebrow, and names none when none is current", () => {
    // Fix6 finding 1: J12, J13 and J14 gave "F-1 · TIME AFTER THE PROGRAM ENDS, FROM THE
    // DATES YOU ENTERED". The grace's label is "Time after the program ends".
    // Kills: the eyebrow fed from the first stage not done, or from an unknown stage.
    expect(stageEyebrow(cardEnded())).toBe("F-1");
    expect(stageEyebrow(unknownFirst())).not.toContain("TIME AFTER THE PROGRAM ENDS");
    expect(stageEyebrow(cardRuns())).not.toContain("TIME AFTER THE PROGRAM ENDS");
  });

  it("never marks an unknown stage now on the Timeline, and marks only the current one", () => {
    // J19 in the fix6 run: stem.a2 and grace.p2 both marked "now".
    // Kills: "now" given to a stage with no dates, or to any state but current.
    for (const output of [cardRuns(), unknownFirst(), cardEnded()]) {
      const grace = row(timelineView(output, null).rows, "grace.p1");
      expect(grace.mark).not.toBe("now");
      expect(grace.bar).toBeNull();
    }
    expect(nows(cardRuns())).toEqual(["opt_post.a2"]);
    expect(nows(unknownFirst())).toEqual(["opt_post.a2"]);
    expect(nows(cardEnded())).toEqual([]);
  });

  it("shows the unknown stage in place, with the DSO line and the step back", () => {
    // "the Timeline shows it in place with "Your DSO can tell you these dates" and the step
    // back". In place: the row keeps the engine's order.
    // Kills: the unknown stage dropped from the Timeline, moved, or shown with no words.
    const keys = timelineView(unknownFirst(), null).rows.map((entry) => entry.key);
    expect(keys).toEqual([
      "program.p1",
      "cpt:cpt.a1",
      "grace.p1",
      "opt_post.a2",
      "stem.a2",
      "trip.t1",
      // SPEC-W2 point 45 P3: the report window on a job's start is a stage of its own.
      "opt_job_start.w1",
    ]);
    for (const output of [cardRuns(), unknownFirst(), cardEnded()]) {
      const text = rowText(row(timelineView(output, null).rows, "grace.p1"));
      expect(text).toContain(DSO_DATES);
      expect(text).toContain(appReasonLine(STEP_BACK, output.computed));
    }
  });

  it("keeps a stage with its own dates as it was", () => {
    // "A stage that has its own dates keeps its state as before." The sample's marks:
    // Done, Done, Now, Next, Later, Done; only the grace changes.
    // Kills: every stage turned unknown or DSO-marked when the verdict carries the step back.
    const rows = timelineView(cardRuns(), null).rows;
    expect(row(rows, "opt_post.a2").mark).toBe("now");
    expect(row(rows, "stem.a2").mark).toBe("next");
    expect(row(rows, "program.p1").mark).toBe("done");
    expect(rowText(row(rows, "opt_post.a2"))).not.toContain(DSO_DATES);
  });
});

describe("point 24: the step-back words name what is taken away, and no kind not entered", () => {
  // Fix6 finding 3: the words said "An H-1B petition is entered" for a petition of any type,
  // and named the grace period, the counts and any cap-gap period, but not the STEM reports
  // and evaluations point 19 also makes null. The output holds no petition type, so the words
  // the web shows are the general ones.

  it("says a petition to change your status, not an H-1B petition", () => {
    // Kills: "An H-1B petition" said whatever the petition's type.
    const words = reasonText(STEP_BACK);
    expect(words).toContain("A petition to change your status");
    expect(words).not.toMatch(/an H-1B petition/i);
  });

  it("names every kind of date point 19 makes null", () => {
    // Kills: words that leave out a kind: the grace period, counts from the filing day, STEM
    // reports, evaluations, or any cap-gap period.
    const words = reasonText(STEP_BACK);
    expect(words).toMatch(/grace period/i);
    expect(words).toMatch(/counts? from the (day it was filed|filing day)/i);
    expect(words).toMatch(/STEM reports?/i);
    expect(words).toMatch(/evaluations?/i);
    expect(words).toMatch(/cap-gap period/i);
  });

  it("gives the same words on Home and the Timeline", () => {
    // Kills: a second, older copy of the words kept for one screen.
    expect(appReasonLine(STEP_BACK, [])).toBe(reasonText(STEP_BACK));
  });
});

/** A case with one H-1B petition from Acme, filed 2026-03-30, as Onboarding builds it. */
function withPetition(): AppCase {
  let held: AppCase = { ...newCase("America/New_York"), status: "f1" };
  held = applyFlow(held, "h1b", "yes", "2026-09-29");
  const petition = held.draft.records.find((record) => record.kind === "petition");
  expect(petition?.id).toBe("h1");
  held = setField(held, String(petition?.fields.employer), "name", "Acme");
  held = setField(held, "h1", "filed_on", "2026-03-30");
  return setField(held, "h1", "change_of_status", "yes");
}

function step(held: AppCase, id: string): View {
  const found = onboardingSteps(held, 0).find((view) => view.id === id);
  if (found === undefined) throw new Error(`no view ${id}`);
  return found;
}

describe("point 26: Onboarding does not require the petition's outcome", () => {
  it("offers I'm not sure on the outcome step", () => {
    // Fix6 finding 5: the outcome was a required choice with no "I'm not sure".
    // Kills: notSure left off the outcome view.
    expect(step(withPetition(), "outcome:h1").notSure).toBe(true);
  });

  it("says in its why line that Duly points to the DSO for these dates", () => {
    // Kills: the fix6 why line "Each outcome leads to different dates.", which points 19 and
    // 21 made untrue: every outcome gives the same step back.
    const why = step(withPetition(), "outcome:h1").why;
    expect(why).not.toBe("Each outcome leads to different dates.");
    expect(why).toContain("DSO");
  });

  it("sends not_sure when the student is not sure of the outcome", () => {
    // SPEC-W2-UNKNOWN points 4 and 43: not sure is undecided on every field, and is sent as
    // typed. Left out, the pack's when_absent none would read it as no outcome given.
    // Kills: the not-sure answer dropped and read as a statement the student did not make.
    const held = setField(withPetition(), "h1", "outcome", NOT_SURE);
    const petition = caseBody(held)?.records.find((record) => record.id === "h1");
    expect(petition).toBeDefined();
    expect(petition?.fields.outcome).toBe("not_sure");
  });

  it("still asks the requested start, which point 23 needs, and says what empty means", () => {
    // SPEC-W2-UNKNOWN point 2: the pack declares requested_start when_absent none, so left
    // empty it states the petition asks for no start date, in the pack's recorded words.
    // Kills: the requested start dropped from the view, or empty with no words.
    const fields = step(withPetition(), "petition:h1").fields ?? [];
    const start = fields.find((field) => field.name === "requested_start");
    expect(start).toBeDefined();
    expect(start?.empty).toBe("Leave empty if the petition asks for no start date.");
    expect(start?.notSure).not.toBe(true);
  });
});
