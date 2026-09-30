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
  planShots,
  sampleNames,
  shotsExitCode,
  shotsJson,
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

async function drawn(window: BrowserWindow, shot: Shot): Promise<boolean> {
  try {
    await window.loadURL(shot.url);
    const waited = new Promise<boolean>((done) => setTimeout(() => done(false), SHOT_WAIT_MS));
    const draw = window.webContents
      .executeJavaScript(drawScript(shot.theme), false)
      .then((value: unknown) => value === true);
    return await Promise.race([draw, waited]);
  } catch (error) {
    process.stderr.write(`shots: ${shot.file} did not load: ${String(error)}\n`);
    return false;
  }
}

/**
 * Draws every planned shot in a hidden window of the shot size, writes each picture and
 * shots.json into the folder, and gives the exit code.
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
      let ok = await drawn(window, shot);
      if (ok) {
        try {
          const picture = await window.webContents.capturePage();
          await writeFile(join(run.folder, shot.file), picture.toPNG());
        } catch (error) {
          process.stderr.write(`shots: no picture for ${shot.file}: ${String(error)}\n`);
          ok = false;
        }
      }
      const { file, screen, sample, theme } = shot;
      results.push({ file, screen, sample, theme, drawn: ok });
    }
  } finally {
    window.destroy();
  }
  await writeFile(join(run.folder, "shots.json"), shotsJson(results));
  return shotsExitCode(results);
}
