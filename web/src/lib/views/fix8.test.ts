import { describe, expect, it } from "vitest";

import { engineOutputSchema, type EngineOutput } from "../compute";
import { appReasonLine } from "../labels";
import stemNext from "../../../samples/path-stem-next.json";
import { DSO_DATES_LINE, STEP_BACK_REASON, timelineView, type TimelineRow } from "./timeline";

// specs/product-2/resolutions.md point 22b (review fix7 finding 1), read from the Timeline.
// The engine output is the saved sample path-stem-next.json, changed only as
// contracts/engine_output.schema.json allows. An unknown row keeps its own known dates and its
// items; only a stage whose reasons hold cap_gap.for_dso gets the DSO line and the petition's
// words.

type RawStage = { id: string; state: string; [field: string]: unknown };
type RawOutput = { stages: RawStage[]; verdict: { state: string; reasons: string[] } };

/** A J01-like transfer: released 2024-07-15, the new DSO not yet contacted, so no end. */
const TRANSFER: RawStage = {
  id: "transfer.mv1",
  stage: "transfer",
  record: "mv1",
  category: "f1",
  label: "School transfer",
  state: "unknown",
  starts: "2024-07-15",
  ends: null,
  ends_days_away: null,
  days_in: null,
  days_total: null,
  // A rule the sample holds with its source; the output refuses a rule id with none.
  rule_ids: ["opt.ends_on_transfer_or_new_level"],
  items: ["transfer.contact_new_dso.opens.mv1", "transfer.contact_new_dso.closes.mv1"],
  windows: [],
  facts: {},
};

/** The sample with its stages changed and the given verdict reasons added, as parsed. */
function shaped(change: (stages: RawStage[]) => RawStage[], extra: string[] = []): EngineOutput {
  const raw = structuredClone(stemNext) as unknown as RawOutput;
  return engineOutputSchema.parse({
    ...raw,
    verdict: { ...raw.verdict, reasons: [...raw.verdict.reasons, ...extra] },
    stages: change(raw.stages),
  });
}

/** A case with no petition: the transfer sits after the program, with no reasons. */
function withTransfer(): EngineOutput {
  return shaped((stages) => [...stages, structuredClone(TRANSFER)]);
}

/** A petition case: the grace a petition nulled carries the step back; the transfer does not. */
function withNulledGrace(): EngineOutput {
  return shaped(
    (stages) => [
      ...stages.map((stage) =>
        stage.id === "grace.p1"
          ? {
              ...stage,
              state: "unknown",
              starts: null,
              ends: null,
              ends_days_away: null,
              days_in: null,
              days_total: null,
              reasons: [STEP_BACK_REASON],
            }
          : stage,
      ),
      structuredClone(TRANSFER),
    ],
    [STEP_BACK_REASON],
  );
}

function row(rows: readonly TimelineRow[], key: string): TimelineRow {
  const found = rows.find((entry) => entry.key === key);
  if (found === undefined) throw new Error(`no row ${key}`);
  return found;
}

function rowText(entry: TimelineRow): string {
  return [entry.title, entry.meta, ...entry.lines, entry.application ?? ""].join(" ");
}

describe("point 22b: an unknown row keeps its own dates and items", () => {
  it("shows a transfer with a known start and no end from its start", () => {
    // Kills: the meta of an unknown row cleared, which hid "from Jul 15, 2024".
    const transfer = row(timelineView(withTransfer(), null).rows, "transfer.mv1");
    expect(transfer.meta).toBe("From Jul 15, 2024");
  });

  it("keeps the transfer's items, the question that would close it among them", () => {
    // Kills: the items of an unknown row emptied.
    const transfer = row(timelineView(withTransfer(), null).rows, "transfer.mv1");
    expect(transfer.items).toEqual(TRANSFER.items);
    expect(transfer.stage?.id).toBe("transfer.mv1");
  });

  it("gives the transfer no mark, neither now nor done", () => {
    // Point 23a: an unknown stage's row carries no mark.
    const transfer = row(timelineView(withTransfer(), null).rows, "transfer.mv1");
    expect(transfer.mark).toBe("none");
    expect(transfer.bar).toBeNull();
  });

  it("gives a row with no step back neither the DSO line nor the petition's words", () => {
    // Kills: every unknown row given the DSO line and the step back, whatever the cause
    // (review fix7 finding 1: J01's transfer and J14's job ends). Both outputs: with no
    // petition, and with a petition that nulled another stage.
    for (const output of [withTransfer(), withNulledGrace()]) {
      const text = rowText(row(timelineView(output, null).rows, "transfer.mv1"));
      expect(text).not.toContain(DSO_DATES_LINE);
      expect(text).not.toContain(appReasonLine(STEP_BACK_REASON, output.computed));
    }
  });
});

describe("point 22b: only a stage whose reasons hold the step back gets the DSO words", () => {
  it("gives the nulled grace the DSO line and the petition's words", () => {
    // Kills: the step back read from the verdict alone, or dropped from the stage's row.
    const output = withNulledGrace();
    const grace = row(timelineView(output, null).rows, "grace.p1");
    expect(grace.mark).toBe("none");
    expect(grace.lines).toContain(`${DSO_DATES_LINE}.`);
    expect(grace.lines).toContain(appReasonLine(STEP_BACK_REASON, output.computed));
  });

  it("gives the nulled grace no dates of its own", () => {
    // The petition made both its start and its end null, so there is no date to show.
    const grace = row(timelineView(withNulledGrace(), null).rows, "grace.p1");
    expect(grace.meta).toBe("");
    expect(grace.bar).toBeNull();
  });

  it("does not take the step back from the verdict for a stage that does not carry it", () => {
    // Kills: the fix7 rule, which gave every unknown row the step back when the verdict
    // held cap_gap.for_dso.
    const output = withNulledGrace();
    expect(output.verdict.reasons).toContain(STEP_BACK_REASON);
    const unknown = timelineView(output, null).rows.filter((entry) => entry.mark === "none");
    const carrying = unknown.filter((entry) => rowText(entry).includes(DSO_DATES_LINE));
    expect(carrying.map((entry) => entry.key)).toEqual(["grace.p1"]);
  });

  it("leaves the stages with their own dates as they were", () => {
    const rows = timelineView(withNulledGrace(), null).rows;
    expect(row(rows, "opt_post.a2").mark).toBe("now");
    expect(row(rows, "stem.a2").mark).toBe("next");
    expect(rowText(row(rows, "opt_post.a2"))).not.toContain(DSO_DATES_LINE);
  });
});
