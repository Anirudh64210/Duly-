/**
 * The only bridge between the screen and this Mac. In this round it gives the screen the
 * app's version and the platform, and nothing else. A sandboxed preload may only load
 * electron itself, so this file imports nothing of its own.
 */
import { contextBridge } from "electron";

const VERSION_FLAG = "--duly-version=";

export function versionFrom(argv: readonly string[]): string {
  const found = argv.find((argument) => argument.startsWith(VERSION_FLAG));
  return found === undefined ? "" : found.slice(VERSION_FLAG.length);
}

contextBridge.exposeInMainWorld(
  "duly",
  Object.freeze({ version: versionFrom(process.argv), platform: process.platform }),
);
