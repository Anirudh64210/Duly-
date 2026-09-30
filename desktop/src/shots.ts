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

/**
 * Run inside the page. It sets the theme the way the design shots use it (SPEC 3, the
 * `data-theme` attribute), waits for the webfont and two frames, and says whether the
 * screen drew anything.
 */
export function drawScript(theme: ShotTheme): string {
  return `(async () => {
  document.documentElement.setAttribute("data-theme", ${JSON.stringify(theme)});
  await document.fonts.ready;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  const root = document.getElementById("root");
  return root !== null && root.childElementCount > 0;
})()`;
}

export interface ShotResult {
  file: string;
  screen: string;
  sample: string;
  theme: ShotTheme;
  drawn: boolean;
}

/** shots.json: what each shot was, and whether its screen drew. */
export function shotsJson(results: readonly ShotResult[]): string {
  const report = {
    size: SHOT_SIZE,
    shots: results.map(({ file, screen, sample, theme, drawn }) => ({
      file,
      screen,
      sample,
      theme,
      drawn,
    })),
  };
  return `${JSON.stringify(report, null, 2)}\n`;
}

/** 0 when every planned shot drew, 1 when none were planned or any did not draw. */
export function shotsExitCode(results: readonly ShotResult[]): 0 | 1 {
  return results.length > 0 && results.every((result) => result.drawn) ? 0 : 1;
}
