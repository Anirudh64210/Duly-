import type { AppCase } from "../app/caseStore";
import type { DraftRecord, RecordKind, RecordsCase } from "./records";

// resolutions point 11: each built screen, drawn at the canvas size from an engine sample
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
 * resolutions point 18: the value of data-landmark on a screen's own heading, the name the
 * shot run gives the screen ("/" is home, the others lose their slash). No error screen
 * carries one, so a shot that holds it drew the screen.
 */
export const LANDMARKS = {
  "/welcome": "welcome",
  "/": "home",
  "/timeline": "timeline",
  "/checklists": "checklists",
  "/updates": "updates",
  "/case": "case",
  "/settings": "settings",
  "/feedback": "feedback",
} as const satisfies Record<ShotScreen, string>;

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
