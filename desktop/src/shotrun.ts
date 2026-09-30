import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { BrowserWindow } from "electron";

import { webPreferences } from "./guard";
import {
  SHOTS_PAGE,
  SHOT_SIZE,
  SHOT_WAIT_MS,
  drawScript,
  holdsLandmark,
  landmarkName,
  pageTexts,
  planShots,
  sampleNames,
  screenLandmark,
  shotsExitCode,
  shotsJson,
  type PageText,
  type Shot,
  type ShotResult,
} from "./shots";

export interface ShotsRun {
  folder: string;
  webDist: string;
  samples: string;
  landmarks: string;
  preload: string;
  version: string;
}

/** The type of each text the page drew, or null when the page did not load or answer. */
async function drawnTexts(window: BrowserWindow, shot: Shot): Promise<PageText[] | null> {
  try {
    await window.loadURL(shot.url);
    const waited = new Promise<null>((done) => setTimeout(() => done(null), SHOT_WAIT_MS));
    const draw = window.webContents
      .executeJavaScript(drawScript(shot.theme), false)
      .then((value: unknown) => pageTexts(value));
    return await Promise.race([draw, waited]);
  } catch (error) {
    process.stderr.write(`shots: ${shot.file} did not load: ${String(error)}\n`);
    return null;
  }
}

/**
 * Draws every planned shot in a hidden window of the shot size, writes each picture and
 * shots.json into the folder, and gives the exit code. A shot counts as drawn only when the
 * page holds its screen's landmark from tests/design/landmarks.json (resolutions point 16).
 */
export async function runShots(run: ShotsRun): Promise<number> {
  if (!existsSync(join(run.webDist, SHOTS_PAGE))) {
    process.stderr.write(`shots: ${SHOTS_PAGE} is not in ${run.webDist}\n`);
    return 1;
  }
  let landmarks: unknown;
  try {
    landmarks = JSON.parse(await readFile(run.landmarks, "utf8"));
  } catch (error) {
    process.stderr.write(`shots: cannot read ${run.landmarks}: ${String(error)}\n`);
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
      const landmark = screenLandmark(landmarks, shot.screen);
      const texts = await drawnTexts(window, shot);
      let ok = texts !== null && holdsLandmark(texts, landmark);
      if (landmark === null) {
        process.stderr.write(`shots: ${shot.screen} has no landmark in ${run.landmarks}\n`);
      } else if (texts !== null && !ok) {
        process.stderr.write(
          `shots: ${shot.file} does not hold ${String(landmarkName(landmark))}, ` +
            `${JSON.stringify(landmark.text)} in its type\n`,
        );
      }
      if (texts !== null) {
        try {
          const picture = await window.webContents.capturePage();
          await writeFile(join(run.folder, shot.file), picture.toPNG());
        } catch (error) {
          process.stderr.write(`shots: no picture for ${shot.file}: ${String(error)}\n`);
          ok = false;
        }
      }
      const { file, screen, sample, theme } = shot;
      results.push({ file, screen, sample, theme, landmark: landmarkName(landmark), drawn: ok });
    }
  } finally {
    window.destroy();
  }
  await writeFile(join(run.folder, "shots.json"), shotsJson(results));
  return shotsExitCode(results);
}
