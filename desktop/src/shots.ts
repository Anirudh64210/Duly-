/**
 * What the design shots decide (specs/product-2/resolutions.md point 15, specs/design-1/SPEC.md
 * 14.4): which page each shot loads, in which theme and size, where its picture goes, and
 * the exit code. The drawing itself is web/src/shots.tsx, which holds the engine samples in
 * its own bundle, so no request made while shooting reaches an engine.
 */
import { join } from "node:path";

import { APP_ORIGIN } from "./about";
import type { EngineView } from "./pages";

/** The page size of every shot: the canvas frame (web/src/lib/shots.ts SHOT_SIZE). */
export const SHOT_SIZE = { width: 1280, height: 832 } as const;

/** The built screens, as web/src/lib/shots.ts SHOT_SCREENS lists them (a test compares). */
export const SHOT_SCREENS: readonly string[] = [
  "/welcome",
  "/",
  "/timeline",
  "/checklists",
  "/updates",
  "/case",
  "/settings",
  "/feedback",
];

export const SHOT_THEMES = ["light", "dark"] as const;
export type ShotTheme = (typeof SHOT_THEMES)[number];

/** The page in web/dist that draws one screen from one sample. */
export const SHOTS_PAGE = "shots.html";

/** The engine samples: each output beside the case it was computed from. */
export function webSamples(root: string): string {
  return join(root, "web", "samples");
}

/** How long one shot waits for its screen to be drawn. */
export const SHOT_WAIT_MS = 15_000;

/** No engine runs during the shots; the samples take its place inside the page. */
export const NO_ENGINE: EngineView = { state: "failed", lines: [] };

export interface Shot {
  screen: string;
  sample: string;
  theme: ShotTheme;
  url: string;
  file: string;
}

/**
 * The folder after `--shots` (or `--shots=<folder>`), or null when this is not a shots
 * run. `--shots` with no folder is an error, not a normal launch.
 */
export function shotsFolder(argv: readonly string[]): string | null {
  for (const [index, argument] of argv.entries()) {
    if (argument.startsWith("--shots=")) {
      const folder = argument.slice("--shots=".length);
      if (folder === "") throw new Error("--shots needs a folder");
      return folder;
    }
    if (argument === "--shots") {
      const folder = argv[index + 1];
      if (folder === undefined || folder === "" || folder.startsWith("--")) {
        throw new Error("--shots needs a folder");
      }
      return folder;
    }
  }
  return null;
}

/**
 * The sample names among the file names of web/samples: `<name>.json` beside its
 * `<name>.case.json`. An output with no case, or a case with no output, is left out.
 */
export function sampleNames(files: readonly string[]): string[] {
  const names = files
    .filter((file) => file.endsWith(".json") && !file.endsWith(".case.json"))
    .map((file) => file.slice(0, -".json".length))
    .filter((name) => /^[a-z0-9-]+$/.test(name) && files.includes(`${name}.case.json`));
  return [...new Set(names)].sort();
}

/** A screen's name in a file name: "/" is home, the others lose their slash. */
export function screenName(screen: string): string {
  const name = screen.replace(/^\//, "");
  return name === "" ? "home" : name;
}

export function shotUrl(screen: string, sample: string): string {
  const query = new URLSearchParams({ screen, sample });
  return `${APP_ORIGIN}/${SHOTS_PAGE}?${query.toString()}`;
}

export function shotFile(screen: string, sample: string, theme: ShotTheme): string {
  return `${screenName(screen)}-${sample}-${theme}.png`;
}

/** Every shot: each screen, from each sample, in light and in dark. */
export function planShots(samples: readonly string[]): Shot[] {
  const shots: Shot[] = [];
  for (const screen of SHOT_SCREENS) {
    for (const sample of samples) {
      for (const theme of SHOT_THEMES) {
        shots.push({
          screen,
          sample,
          theme,
          url: shotUrl(screen, sample),
          file: shotFile(screen, sample, theme),
        });
      }
    }
  }
  return shots;
}

/**
 * The shots page is served only in a shots run: in the app's own window, the request map
 * refuses it, so the samples never stand in for the engine there (SPEC 14.3).
 */
export function refusedInApp(relative: string): boolean {
  return relative === SHOTS_PAGE;
}

/** The attribute the app sets on the element it marks as a screen's landmark. */
export const LANDMARK_ATTRIBUTE = "data-landmark";

/**
 * A screen's landmark (resolutions points 18 and 20): the element the app marks with
 * data-landmark="<route>", the route the shot asks for, as web/src/lib/shots.ts LANDMARKS
 * writes it (a test joins the two). No error screen carries one. Text and type are not
 * compared (specs/design-1/SPEC.md 14.1).
 */
export function landmarkSelector(screen: string): string {
  return `[${LANDMARK_ATTRIBUTE}=${JSON.stringify(screen)}]`;
}

/** One marked element on the page: the screen it names and its box. */
export interface PageMark {
  landmark: string;
  width: number;
  height: number;
}

/** Whether the page holds the screen's landmark: a visible element marked with this screen. */
export function holdsLandmark(marks: readonly PageMark[], screen: string): boolean {
  return marks.some((mark) => mark.landmark === screen && mark.width > 0 && mark.height > 0);
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** The page script's answer as a list of PageMark, or null when it is anything else. */
export function pageMarks(value: unknown): PageMark[] | null {
  if (!Array.isArray(value)) return null;
  const marks: PageMark[] = [];
  for (const item of value) {
    const entry = record(item);
    const landmark = entry?.landmark;
    const width = entry?.width;
    const height = entry?.height;
    if (typeof landmark !== "string" || typeof width !== "number" || typeof height !== "number") {
      return null;
    }
    marks.push({ landmark, width, height });
  }
  return marks;
}

/**
 * Run inside the page. It sets the theme the way the design shots use it (SPEC 3, the
 * `data-theme` attribute), waits for the webfont and two frames, and gives back every visible
 * element under the root that carries a landmark mark, with the screen it names and its box.
 * Whether that holds the shot's own landmark is decided outside the page (holdsLandmark), so
 * an error screen is never counted as drawn.
 */
export function drawScript(theme: ShotTheme): string {
  return `(async () => {
  document.documentElement.setAttribute("data-theme", ${JSON.stringify(theme)});
  await document.fonts.ready;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  const root = document.getElementById("root");
  if (root === null) return [];
  const marks = [];
  for (const element of root.querySelectorAll("[${LANDMARK_ATTRIBUTE}]")) {
    const style = getComputedStyle(element);
    if (style.visibility !== "visible" || Number(style.opacity) === 0) continue;
    const box = element.getBoundingClientRect();
    marks.push({
      landmark: element.getAttribute("${LANDMARK_ATTRIBUTE}") ?? "",
      width: box.width,
      height: box.height,
    });
  }
  return marks;
})()`;
}

/**
 * The windows each drawn shot is measured in (specs/ui-1/SPEC.md point 7): the canvas frame,
 * and a phone 390 wide. No screen may be wider than either.
 */
export const SHOT_WINDOWS = [SHOT_SIZE, { width: 390, height: 844 }] as const;

/** One measure of a page: the window width asked, the page's inner width and its scroll width. */
export interface PageWidth {
  window: number;
  inner: number;
  scroll: number;
}

/** Run inside the page after the window is sized: the document's scroll width and the inner width. */
export function widthScript(): string {
  return `(async () => {
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  return { inner: window.innerWidth, scroll: document.documentElement.scrollWidth };
})()`;
}

/** The width script's answer, for the window width asked, or null when it is anything else. */
export function pageWidth(value: unknown, window: number): PageWidth | null {
  const entry = record(value);
  const inner = entry?.inner;
  const scroll = entry?.scroll;
  if (typeof inner !== "number" || typeof scroll !== "number") return null;
  return { window, inner, scroll };
}

/**
 * Whether the page fits every shot window: measured in each, at the width asked, and never
 * wider than it. A window not measured, or not at its width, does not count as fitting.
 */
export function fitsWindows(widths: readonly PageWidth[]): boolean {
  return SHOT_WINDOWS.every(({ width }) =>
    widths.some(
      (measure) =>
        measure.window === width && measure.inner === width && measure.scroll <= measure.inner,
    ),
  );
}

export interface ShotResult {
  file: string;
  screen: string;
  sample: string;
  theme: ShotTheme;
  landmark: string;
  drawn: boolean;
  widths: PageWidth[];
}

/**
 * shots.json: what each shot was, the landmark it looked for (its selector), whether it held
 * it, its widths in each window and whether it fits them.
 */
export function shotsJson(results: readonly ShotResult[]): string {
  const report = {
    size: SHOT_SIZE,
    windows: SHOT_WINDOWS,
    shots: results.map(({ file, screen, sample, theme, landmark, drawn, widths }) => ({
      file,
      screen,
      sample,
      theme,
      landmark,
      drawn,
      widths,
      fits: fitsWindows(widths),
    })),
  };
  return `${JSON.stringify(report, null, 2)}\n`;
}

/**
 * 0 when every planned shot held its landmark and fits every window, 1 when none were planned
 * or any did not.
 */
export function shotsExitCode(results: readonly ShotResult[]): 0 | 1 {
  return results.length > 0 && results.every((result) => result.drawn && fitsWindows(result.widths))
    ? 0
    : 1;
}
