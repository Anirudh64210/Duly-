import { describe, expect, it } from "vitest";

import { engineOutputSchema, type Checklist, type EngineOutput } from "../compute";
import stemNext from "../../../samples/path-stem-next.json";
import windowOpen from "../../../samples/path-window-open.json";
import { calmProblems } from "../calm";
import {
  CHECKLIST_FOOTER,
  CPT_LINE,
  SCHOOL_LINE,
  checklistView,
  stepQuestion,
  type StepsView,
} from "./checklists";
import { B2_LINE } from "./stages";

const NEXT = engineOutputSchema.parse(stemNext);
const OPEN = engineOutputSchema.parse(windowOpen);

function steps(output: EngineOutput, selected: string | null): StepsView {
  const view = checklistView(output, selected).view;
  if (view === null || view.kind !== "steps") throw new Error("no steps view");
  return view;
}

function list(output: EngineOutput, id: string): Checklist {
  const found = (output.checklists ?? []).find((entry) => entry.id === id);
  if (found === undefined) throw new Error(`no checklist ${id}`);
  return found;
}

describe("checklistView (design-1 section 8)", () => {
  it("offers a chip for each stage with a checklist or a finished path, in order", () => {
    const { chips } = checklistView(NEXT, null);
    expect(chips.map((chip) => chip.label)).toEqual([
      "CPT",
      "Post-completion OPT",
      "STEM OPT extension",
    ]);
    expect(chips.find((chip) => chip.label === "CPT")?.finished).toBe(true);
  });

  it("selects the stage with the next filing by default and marks its chip", () => {
    const shown = checklistView(NEXT, null);
    expect(shown.selected).toBe("stem.a2");
    expect(shown.chips.filter((chip) => chip.nextFiling).map((chip) => chip.key)).toEqual([
      "stem.a2",
    ]);
  });

  it("gives the steps and the count exactly as the engine does", () => {
    const view = steps(NEXT, "stem.a2");
    const engine = list(NEXT, "stem_opt.a2");
    expect(view.steps.map((step) => step.label)).toEqual(engine.steps.map((step) => step.label));
    expect([view.confirmed, view.total]).toEqual([engine.confirmed, engine.total]);
    expect(view.barLine).toBe(
      `${engine.confirmed} of ${engine.total} confirmed by you · Duly's reading of the rules cited on each step`,
    );
  });

  it("carries the B2 line on a next stage, and not on the current one", () => {
    expect(steps(NEXT, "stem.a2").b2).toBe(true);
    expect(steps(NEXT, "opt_post.a2").b2).toBe(false);
    expect(B2_LINE).toBe("Whether it applies to you is a question for your DSO.");
  });

  it("reads opens or opened from the engine's days away", () => {
    expect(steps(NEXT, "stem.a2").eyebrow).toBe("FILING WINDOW IN THE RULE OPENS NOV 11, 2026");
    expect(steps(OPEN, "stem.a2").eyebrow).toBe("FILING WINDOW IN THE RULE OPENED NOV 11, 2026");
  });

  it("names the confirmation step.<checklist>.<step>, without the record", () => {
    expect(stepQuestion(list(NEXT, "stem_opt.a2"), "i983")).toBe("step.stem_opt.i983");
  });

  it("shows a confirmation as standing only when the engine read it", () => {
    const view = steps(OPEN, "stem.a2");
    expect(view.steps.find((step) => step.id === "i983")?.confirmedOn).toBe("2026-11-20");
    const unread = { ...OPEN, answers_read: [] };
    expect(steps(unread, "stem.a2").steps.every((step) => step.confirmedOn === null)).toBe(true);
  });

  it("marks each step with its status tag, citation and reading from the rules", () => {
    const view = steps(NEXT, "stem.a2");
    const i983 = view.steps.find((step) => step.id === "i983");
    const rule = NEXT.rules["stem.requires.training_plan"];
    expect(i983?.meta).toBe(`Regulation · ${rule?.citation ?? ""}`);
    expect(view.steps.find((step) => step.id === "dso_recommendation")?.school).toBe(true);
  });

  it("says nothing of all steps until the engine counts every one", () => {
    expect(steps(NEXT, "stem.a2").allConfirmed).toBeNull();
    const all = {
      ...NEXT,
      checklists: (NEXT.checklists ?? []).map((entry) =>
        entry.id === "stem_opt.a2" ? { ...entry, confirmed: entry.total } : entry,
      ),
    };
    const total = list(NEXT, "stem_opt.a2").total;
    expect(steps(all, "stem.a2").allConfirmed).toBe(
      `${total} of ${total} steps confirmed by you. The filing window in the rule opens Nov 11, 2026.`,
    );
  });

  it("gives a finished CPT path its spans, with no count and no completion", () => {
    const view = checklistView(NEXT, "cpt").view;
    expect(view).toEqual({
      kind: "finished",
      title: "CPT",
      line: CPT_LINE,
      lines: ["Jun 1, 2024 to Aug 15, 2024"],
    });
  });

  it("keeps every fixed string calm", () => {
    for (const text of [CHECKLIST_FOOTER, SCHOOL_LINE, CPT_LINE, B2_LINE]) {
      expect(calmProblems(text)).toEqual([]);
    }
  });

  it("offers nothing when the output holds no stages", () => {
    expect(checklistView({ ...NEXT, stages: [], checklists: [] }, null)).toEqual({
      chips: [],
      selected: null,
      view: null,
    });
  });
});
