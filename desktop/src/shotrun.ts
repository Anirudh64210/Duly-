import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { BrowserWindow } from "electron";

import { webPreferences } from "./guard";
import {
  SHOTS_PAGE,
  SHOT_SIZE,
  SHOT_WAIT_MS,
  SHOT_WINDOWS,
  drawScript,
  fitsWindows,
  holdsLandmark,
  landmarkSelector,
  pageMarks,
  pageWidth,
  planShots,
  sampleNames,
  shotsExitCode,
  shotsJson,
  widthScript,
  type PageMark,
  type PageWidth,
  type Shot,
  type ShotResult,
} from "./shots";

export interface ShotsRun {
  folder: string;
  webDist: string;
  samples: string;
  preload: string;
  version: string;
}

/** Each landmark mark the page drew, or null when the page did not load or answer. */
async function drawnMarks(window: BrowserWindow, shot: Shot): Promise<PageMark[] | null> {
  try {
    await window.loadURL(shot.url);
    const waited = new Promise<null>((done) => setTimeout(() => done(null), SHOT_WAIT_MS));
    const draw = window.webContents
      .executeJavaScript(drawScript(shot.theme), false)
      .then((value: unknown) => pageMarks(value));
    return await Promise.race([draw, waited]);
  } catch (error) {
    process.stderr.write(`shots: ${shot.file} did not load: ${String(error)}\n`);
    return null;
  }
}

/**
 * The page's width in each shot window (specs/ui-1/SPEC.md point 7), then the window back at
 * the shot size. A window whose page does not answer is left out, so the shot does not fit.
 */
async function measuredWidths(window: BrowserWindow, shot: Shot): Promise<PageWidth[]> {
  const widths: PageWidth[] = [];
  try {
    for (const { width, height } of SHOT_WINDOWS) {
      window.setContentSize(width, height);
      const waited = new Promise<null>((done) => setTimeout(() => done(null), SHOT_WAIT_MS));
      const measure = window.webContents
        .executeJavaScript(widthScript(), false)
        .then((value: unknown) => pageWidth(value, width));
      const measured = await Promise.race([measure, waited]);
      if (measured !== null) widths.push(measured);
    }
  } catch (error) {
    process.stderr.write(`shots: ${shot.file} was not measured: ${String(error)}\n`);
  } finally {
    window.setContentSize(SHOT_SIZE.width, SHOT_SIZE.height);
  }
  return widths;
}

/**
 * Draws every planned shot in a hidden window of the shot size, writes each picture and
 * shots.json into the folder, and gives the exit code. A shot counts as drawn only when the
 * page holds the element the app marks as its screen's landmark (resolutions point 18), and
 * it fits only when no window it is measured in scrolls sideways (specs/ui-1/SPEC.md point 7).
 */
export async function runShots(run: ShotsRun): Promise<number> {
  if (!existsSync(join(run.webDist, SHOTS_PAGE))) {
    process.stderr.write(`shots: ${SHOTS_PAGE} is not in ${run.webDist}\n`);
    return 1;
  }
  const shots = planShots(sampleNames(await readdir(run.samples)));
  await mkdir(run.folder, { recursive: true });
  const window = new BrowserWindow({
    ...SHOT_SIZE,
    useContentSize: true,
    resizable: false,
    show: false,
    webPreferences: webPreferences(run.preload, run.version),
  });
  const results: ShotResult[] = [];
  try {
    for (const shot of shots) {
      const landmark = landmarkSelector(shot.screen);
      const marks = await drawnMarks(window, shot);
      let ok = marks !== null && holdsLandmark(marks, shot.screen);
      if (marks !== null && !ok) {
        process.stderr.write(`shots: ${shot.file} does not hold ${landmark}\n`);
      }
      if (marks !== null) {
        try {
          const picture = await window.webContents.capturePage();
          await writeFile(join(run.folder, shot.file), picture.toPNG());
        } catch (error) {
          process.stderr.write(`shots: no picture for ${shot.file}: ${String(error)}\n`);
          ok = false;
        }
      }
      const widths = marks !== null ? await measuredWidths(window, shot) : [];
      if (marks !== null && !fitsWindows(widths)) {
        process.stderr.write(
          `shots: ${shot.file} is wider than its window: ${JSON.stringify(widths)}\n`,
        );
      }
      const { file, screen, sample, theme } = shot;
      results.push({ file, screen, sample, theme, landmark, drawn: ok, widths });
    }
  } finally {
    window.destroy();
  }
  await writeFile(join(run.folder, "shots.json"), shotsJson(results));
  return shotsExitCode(results);
}
