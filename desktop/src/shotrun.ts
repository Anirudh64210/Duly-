import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { BrowserWindow } from "electron";

import { webPreferences } from "./guard";
import {
  SHOTS_PAGE,
  SHOT_SIZE,
  SHOT_WAIT_MS,
  drawScript,
  holdsLandmark,
  landmarkSelector,
  pageMarks,
  planShots,
  sampleNames,
  shotsExitCode,
  shotsJson,
  type PageMark,
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
 * Draws every planned shot in a hidden window of the shot size, writes each picture and
 * shots.json into the folder, and gives the exit code. A shot counts as drawn only when the
 * page holds the element the app marks as its screen's landmark (resolutions point 18).
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
      const { file, screen, sample, theme } = shot;
      results.push({ file, screen, sample, theme, landmark, drawn: ok });
    }
  } finally {
    window.destroy();
  }
  await writeFile(join(run.folder, "shots.json"), shotsJson(results));
  return shotsExitCode(results);
}
