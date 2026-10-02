import { describe, expect, it } from "vitest";

import { engineOutputSchema, type EngineOutput, type Stage } from "../compute";
import { STATUS } from "../fixtures";
import stemNext from "../../../samples/path-stem-next.json";
import windowOpen from "../../../samples/path-window-open.json";
import type { Status } from "../status";
import { B2_LINE, currentStage, stageEyebrow, stagesOf } from "./stages";
import { MARK_NAMES, TIMELINE_META, timelineView, type TimelineRow } from "./timeline";

// Engine output made by engine/path.py with fixed clocks, from the cases saved beside them
// (path-stem-next.case.json on 2026-09-29, path-window-open.case.json on 2026-12-01).
const NEXT = engineOutputSchema.parse(stemNext);
const OPEN = engineOutputSchema.parse(windowOpen);

function row(rows: readonly TimelineRow[], key: string): TimelineRow {
  const found = rows.find((entry) => entry.key === key);
  if (found === undefined) throw new Error(`no row ${key}`);
  return found;
}

function withStages(output: EngineOutput, change: (stage: Stage) => Stage): EngineOutput {
  return { ...output, stages: stagesOf(output).map(change) };
}

describe("timelineView (design-1 section 7)", () => {
  it("parses real engine output that holds stages and checklists", () => {
    expect(stagesOf(NEXT).length).toBeGreaterThan(0);
    expect(NEXT.checklists?.length).toBeGreaterThan(0);
  });

  it("gives one row for each stage, in the engine's order, with CPT as one row", () => {
    const keys = timelineView(NEXT, null).rows.map((entry) => entry.key);
    expect(keys).toEqual([
      "program.p1",
      "cpt:cpt.a1",
      "opt_post.a2",
      "stem.a2",
      "grace.p1",
      "trip.t1",
      // SPEC-W2 point 45 P3: the report window on a job's start is a stage of its own.
      "opt_job_start.w1",
    ]);
  });

  it("marks each row by the engine's state, with the accessible names of 7", () => {
    const marks = timelineView(NEXT, null).rows.map((entry) => MARK_NAMES[entry.mark]);
    // SPEC-W2 point 45 P3: the job-start report row is done.
    expect(marks).toEqual(["Done", "Done", "Now", "Next", "Later", "Done", "Done"]);
  });

  it("puts the question mark in place of NOW while a reason rests on the current stage", () => {
    const output = withStages(NEXT, (stage) =>
      stage.state === "current" ? { ...stage, reasons: ["grace_with_cap_gap"] } : stage,
    );
    const current = row(timelineView(output, null).rows, "opt_post.a2");
    expect(MARK_NAMES[current.mark]).toBe("A question for your DSO");
    expect(stageEyebrow(output)).toBe("F-1");
  });

  it("reads the current row's day numbers from the engine", () => {
    const stage = currentStage(NEXT) as Stage;
    const current = row(timelineView(NEXT, null).rows, stage.id);
    expect(current.bar).toEqual({ days_in: stage.days_in, days_total: stage.days_total });
    expect(current.meta).toBe(
      `Day ${stage.days_in} of ${stage.days_total} · card Feb 10, 2026 to Feb 9, 2027`,
    );
    const moved = withStages(NEXT, (entry) =>
      entry.id === stage.id ? { ...entry, days_in: 7001, days_total: 7002 } : entry,
    );
    expect(row(timelineView(moved, null).rows, stage.id).meta).toContain("Day 7001 of 7002");
  });

  it("shows the application dates only as entered", () => {
    const current = row(timelineView(NEXT, null).rows, "opt_post.a2");
    expect(current.application).toBe("Filed Oct 10, 2025 · Decided Dec 20, 2025");
  });

  it("shows a done stage's facts plainly, with no mark and no repeated tail", () => {
    const program = row(timelineView(NEXT, null).rows, "program.p1");
    expect(program.title).toBe("Computer Science, State University");
    expect(program.meta).toBe("Aug 21, 2023 to Dec 13, 2025");
    expect(program.lines).toContain("Program end date: Dec 13, 2025");
    for (const line of program.lines) {
      expect(line).not.toMatch(/as you entered it/u);
      expect(line).not.toContain(String.fromCodePoint(0x2713));
    }
  });

  it("lists each CPT authorization as entered, with no count", () => {
    const cpt = row(timelineView(NEXT, null).rows, "cpt:cpt.a1");
    expect(cpt.title).toBe("CPT");
    expect(cpt.lines).toEqual(["Jun 1, 2024 to Aug 15, 2024, part-time"]);
  });

  it("gives the next row the window, the engine's count, the B2 line and the checklist", () => {
    const next = row(timelineView(NEXT, null).rows, "stem.a2");
    expect(next.meta).toBe(
      "Filing window in the rule opens Nov 11, 2026 · 0 of 11 confirmed by you",
    );
    expect(next.lines).toContain(B2_LINE);
    const months = NEXT.rules["stem.extension_months"]?.value;
    expect(next.lines[0]).toMatch(
      new RegExp(`^The rule allows a ${String(months)} month extension\\. Filing window`, "u"),
    );
    expect(next.checklist).toBe(true);
  });

  it("says opened once the engine's days away fall below zero", () => {
    const next = row(timelineView(OPEN, null).rows, "stem.a2");
    expect(next.meta).toBe(
      "Filing window in the rule opened Nov 11, 2026 · 2 of 11 confirmed by you",
    );
  });

  it("writes no count of its own: every digit run comes from the sources", () => {
    const text = timelineView(NEXT, null)
      .rows.flatMap((entry) => [entry.title, entry.meta, ...entry.lines, entry.application ?? ""])
      .join(" ");
    const sources = JSON.stringify(NEXT);
    const days = new Set<string>();
    for (const stage of stagesOf(NEXT)) {
      for (const day of [stage.starts, stage.ends, ...(stage.windows ?? []).map((w) => w.opens)]) {
        if (day) days.add(day);
      }
    }
    const shown = text.match(/\d+/gu) ?? [];
    for (const run of shown) {
      const inDates = [...days].some((day) => day.includes(run.padStart(2, "0")));
      expect(sources.includes(run) || inDates).toBe(true);
    }
    expect(TIMELINE_META).toBe("From the dates you entered");
  });

  it("claims nothing is maintained, verified or matched", () => {
    const text = JSON.stringify(timelineView(NEXT, STATUS as Status));
    expect(text).not.toMatch(/maintained|verified|match/iu);
  });

  it("adds Beyond only for another category's pack that holds a rule", () => {
    const status = {
      ...STATUS,
      rulepacks: [
        { category: "f1", version: "v", parameters: 3 },
        { category: "h1b", version: "v", parameters: 2 },
        { category: "o1", version: "v", parameters: 0 },
      ],
    } as Status;
    const beyond = row(timelineView(NEXT, status).rows, "beyond");
    expect(beyond.meta).toBe("H-1B");
    expect(beyond.settings).toBe(true);
    expect(timelineView(NEXT, null).rows.some((entry) => entry.key === "beyond")).toBe(false);
  });

  it("gives no rows when the output holds no stages", () => {
    expect(timelineView({ ...NEXT, stages: [] }, null).rows).toEqual([]);
  });
});

describe("the stage eyebrow (design-1 section 6, B1)", () => {
  it("names the current stage with its scope", () => {
    expect(stageEyebrow(NEXT)).toBe("F-1 · POST-COMPLETION OPT, FROM THE DATES YOU ENTERED");
  });

  it("is F-1 alone when no stage is current", () => {
    const output = withStages(NEXT, (stage) =>
      stage.state === "current" ? { ...stage, state: "done" } : stage,
    );
    expect(stageEyebrow(output)).toBe("F-1");
  });
});
