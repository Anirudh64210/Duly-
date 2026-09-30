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

/** Where the canvas landmarks are kept (specs/design-1/SPEC.md 14.1). */
export function designLandmarks(root: string): string {
  return join(root, "tests", "design", "landmarks.json");
}

/**
 * The canvas screen in tests/design/landmarks.json that each built screen is drawn from.
 * A built screen with no canvas screen (Your case, Settings, Feedback) has no landmark, so
 * its shot is never counted as drawn (resolutions point 16).
 */
export const SHOT_CANVAS: Readonly<Record<string, string>> = {
  "/welcome": "Onboarding",
  "/": "Main",
  "/timeline": "Timeline",
  "/checklists": "Checklist",
  "/updates": "Updates",
};

/**
 * A screen's own landmark: the first landmark its canvas screen draws in its largest type,
 * the screen's heading. It is found on the page by its type (size, weight and letter
 * spacing) and by its heading text, the landmark's label (resolutions point 17), so a
 * screen that draws another screen's heading in the same type is not counted. Colour is
 * left out, since dark shots take the dark tokens.
 */
export interface ScreenLandmark {
  canvas: string;
  index: number;
  text: string;
  fontSize: number;
  fontWeight: string;
  letterSpacing: number;
}

const WEIGHTS: Readonly<Record<string, string>> = { normal: "400", bold: "700" };

function weight(value: string): string {
  return WEIGHTS[value] ?? value;
}

function pixels(value: string): number | null {
  const match = /^(-?\d*\.?\d+)px$/.exec(value.trim());
  return match === null ? null : Number(match[1]);
}

/** Letter spacing in pixels at a font size: "normal" is 0, em is a share of the size. */
export function spacing(value: string, fontSize: number): number | null {
  const text = value.trim();
  if (text === "normal") return 0;
  const em = /^(-?\d*\.?\d+)em$/.exec(text);
  if (em !== null) return Number(em[1]) * fontSize;
  return pixels(text);
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Text as it reads: runs of white space are one space, and none at either end. */
export function words(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * The landmark of a built screen, read from the parsed tests/design/landmarks.json, or null
 * when the screen has no canvas screen, the file does not hold it, or no type can be read.
 */
export function screenLandmark(landmarks: unknown, screen: string): ScreenLandmark | null {
  const canvas = SHOT_CANVAS[screen];
  if (canvas === undefined) return null;
  const marks = record(record(record(landmarks)?.screens)?.[canvas])?.landmarks;
  if (!Array.isArray(marks)) return null;
  let found: ScreenLandmark | null = null;
  for (const [index, mark] of marks.entries()) {
    const type = record(record(mark)?.type);
    const label = words(text(record(mark)?.label) ?? "");
    const size = pixels(text(type?.["font-size"]) ?? "");
    const fontWeight = text(type?.["font-weight"]);
    if (size === null || fontWeight === null) continue;
    const letterSpacing = spacing(text(type?.["letter-spacing"]) ?? "normal", size);
    if (letterSpacing === null) continue;
    if (found === null || size > found.fontSize) {
      found = {
        canvas,
        index,
        text: label,
        fontSize: size,
        fontWeight: weight(fontWeight),
        letterSpacing,
      };
    }
  }
  return found?.text === "" ? null : found;
}

/** How a landmark is named in shots.json and on stderr. */
export function landmarkName(landmark: ScreenLandmark | null): string | null {
  return landmark === null ? null : `${landmark.canvas} landmark ${String(landmark.index)}`;
}

/** The type of one element on the page that draws text of its own, as the page computed it. */
export interface PageText {
  text: string;
  fontSize: string;
  fontWeight: string;
  letterSpacing: string;
  width: number;
  height: number;
}

/** Type may differ by rounding only; boxes are the landmark check's business, not this one's. */
const TYPE_TOLERANCE_PX = 0.05;

/**
 * Whether the page holds the landmark: a visible text that reads as the landmark's heading
 * text, in exactly the landmark's type.
 */
export function holdsLandmark(
  texts: readonly PageText[],
  landmark: ScreenLandmark | null,
): boolean {
  if (landmark === null) return false;
  return texts.some((drawn) => {
    const size = pixels(drawn.fontSize);
    if (size === null || drawn.width <= 0 || drawn.height <= 0) return false;
    const letters = spacing(drawn.letterSpacing, size);
    return (
      words(drawn.text) === landmark.text &&
      Math.abs(size - landmark.fontSize) <= TYPE_TOLERANCE_PX &&
      weight(drawn.fontWeight) === landmark.fontWeight &&
      letters !== null &&
      Math.abs(letters - landmark.letterSpacing) <= TYPE_TOLERANCE_PX
    );
  });
}

/** The page script's answer as a list of PageText, or null when it is anything else. */
export function pageTexts(value: unknown): PageText[] | null {
  if (!Array.isArray(value)) return null;
  const texts: PageText[] = [];
  for (const item of value) {
    const entry = record(item);
    const drawnText = text(entry?.text);
    const fontSize = text(entry?.fontSize);
    const fontWeight = text(entry?.fontWeight);
    const letterSpacing = text(entry?.letterSpacing);
    const width = entry?.width;
    const height = entry?.height;
    if (
      drawnText === null ||
      fontSize === null ||
      fontWeight === null ||
      letterSpacing === null ||
      typeof width !== "number" ||
      typeof height !== "number"
    ) {
      return null;
    }
    texts.push({ text: drawnText, fontSize, fontWeight, letterSpacing, width, height });
  }
  return texts;
}

/**
 * Run inside the page. It sets the theme the way the design shots use it (SPEC 3, the
 * `data-theme` attribute), waits for the webfont and two frames, and gives back the text and
 * type of every visible element under the root that draws text of its own. Whether that holds the
 * screen's landmark is decided outside the page (holdsLandmark), so an error screen is never
 * counted as drawn.
 */
export function drawScript(theme: ShotTheme): string {
  return `(async () => {
  document.documentElement.setAttribute("data-theme", ${JSON.stringify(theme)});
  await document.fonts.ready;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  const root = document.getElementById("root");
  if (root === null) return [];
  const texts = [];
  for (const element of root.querySelectorAll("*")) {
    const own = Array.from(element.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "",
    );
    if (!own) continue;
    const style = getComputedStyle(element);
    if (style.visibility !== "visible" || Number(style.opacity) === 0) continue;
    const box = element.getBoundingClientRect();
    texts.push({
      text: element.textContent ?? "",
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      width: box.width,
      height: box.height,
    });
  }
  return texts;
})()`;
}

export interface ShotResult {
  file: string;
  screen: string;
  sample: string;
  theme: ShotTheme;
  landmark: string | null;
  drawn: boolean;
}

/** shots.json: what each shot was, the landmark it looked for, and whether it held it. */
export function shotsJson(results: readonly ShotResult[]): string {
  const report = {
    size: SHOT_SIZE,
    shots: results.map(({ file, screen, sample, theme, landmark, drawn }) => ({
      file,
      screen,
      sample,
      theme,
      landmark,
      drawn,
    })),
  };
  return `${JSON.stringify(report, null, 2)}\n`;
}

/** 0 when every planned shot held its landmark, 1 when none were planned or any did not. */
export function shotsExitCode(results: readonly ShotResult[]): 0 | 1 {
  return results.length > 0 && results.every((result) => result.drawn) ? 0 : 1;
}
