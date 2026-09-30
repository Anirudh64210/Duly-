import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { BrowserWindow } from "electron";

import {
  READ_SCREEN,
  SMOKE_POLL_MS,
  SMOKE_WAIT_MS,
  headingShown,
  screenJson,
  smokeExitCode,
  toScreenRead,
  type ScreenRead,
} from "./screen";

async function readScreen(window: BrowserWindow): Promise<ScreenRead> {
  try {
    return toScreenRead(await window.webContents.executeJavaScript(READ_SCREEN, false));
  } catch {
    return toScreenRead(null);
  }
}

/**
 * Waits for the verdict heading, then writes window.png and screen.json into the folder.
 * Gives the exit code: 0 when the heading appeared, 1 when it did not within 40 seconds.
 */
export async function runSmoke(window: BrowserWindow, folder: string): Promise<number> {
  const start = Date.now();
  let read = await readScreen(window);
  while (!headingShown(read) && Date.now() - start < SMOKE_WAIT_MS) {
    await new Promise((done) => setTimeout(done, SMOKE_POLL_MS));
    read = await readScreen(window);
  }
  const shown = headingShown(read);
  await mkdir(folder, { recursive: true });
  try {
    const picture = await window.webContents.capturePage();
    await writeFile(join(folder, "window.png"), picture.toPNG());
  } catch (error) {
    process.stderr.write(`smoke: no picture: ${String(error)}\n`);
  }
  await writeFile(join(folder, "screen.json"), screenJson(read));
  return smokeExitCode(shown);
}
