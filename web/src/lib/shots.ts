import type { AppCase } from "../app/caseStore";
import type { EngineOutput } from "./compute";
import type { DraftRecord, RecordKind, RecordsCase } from "./records";
import type { Status } from "./status";

// resolutions point 11: each built screen, and the routes the router is built from, drawn at the canvas size from an engine sample
// (web/samples). desktop/src/shots.ts loads shots.html?screen=<route>&sample=<name> for
// each pair and captures the window.

export const SHOT_SIZE = { width: 1280, height: 832 } as const;

export const SHOT_SCREENS = [
  "/welcome",
  "/",
  "/timeline",
  "/checklists",
  "/updates",
  "/case",
  "/settings",
  "/feedback",
] as const;

export type ShotScreen = (typeof SHOT_SCREENS)[number];

/**
 * resolutions point 20: the value of data-landmark on a screen's own heading is its route,
 * read from SHOT_SCREENS, the table the router is built from (app/Shell.tsx). The shot run
 * (desktop/src/shots.ts) looks for [data-landmark="<route>"]. No error screen carries one,
 * so a shot that holds it drew the screen.
 */
export const LANDMARKS = Object.fromEntries(SHOT_SCREENS.map((route) => [route, route])) as {
  readonly [Route in ShotScreen]: Route;
};

/** The screen and sample a shot asks for, or null when either is not one Duly has. */
export function shotAsked(
  search: string,
  samples: readonly string[],
): { screen: ShotScreen; sample: string } | null {
  const query = new URLSearchParams(search);
  const screen = SHOT_SCREENS.find((route) => route === query.get("screen"));
  const sample = query.get("sample") ?? "";
  return screen === undefined || !samples.includes(sample) ? null : { screen, sample };
}

/** A sample case as the app holds it, as if the student had finished Onboarding. */
export function heldFromCase(body: RecordsCase): AppCase {
  const records: DraftRecord[] = body.records.map((record) => ({
    id: record.id,
    kind: record.kind as RecordKind,
    fields: Object.fromEntries(
      Object.entries(record.fields).map(([name, value]) => [
        name,
        Array.isArray(value) ? value : value === null ? "" : String(value),
      ]),
    ),
  }));
  return {
    status: body.categories[0] ?? "",
    statusName: "",
    draft: { records, complete: { ...body.complete } },
    time_zone: body.time_zone,
    confirmations: body.confirmations ?? {},
    flow: {},
    onboarded: true,
  };
}

/**
 * ui-1 point 4: the server status a shot draws with, from the sample, so Onboarding step 1
 * lists the statuses as a student sees them. No server answers during the shots. The
 * sample does not hold a parameter count, so none is claimed (0, as in lib/fixtures.ts).
 */
export function shotStatus(output: EngineOutput): Status {
  return {
    database: "ok",
    rulepacks: output.rulepacks.map((pack) => ({
      ...pack,
      parameters: 0,
      rules_checked_on: output.scope.rules_checked_on,
    })),
    verdict: output.verdict,
    checked_at: `${output.today.date}T00:00:00+00:00`,
  };
}
