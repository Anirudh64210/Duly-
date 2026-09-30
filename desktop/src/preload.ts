/**
 * The only bridge between the screen and this Mac. It gives the screen the app's version,
 * the platform, and the case bridge (RQ-K1): read, write and clear, and nothing else. No
 * call takes a path. A sandboxed preload may only load electron itself, so this file
 * imports nothing of its own.
 */
import { contextBridge, ipcRenderer } from "electron";

const VERSION_FLAG = "--duly-version=";

/** The same channel as CASE_CHANNEL in casefile.ts; a test compares them. */
export const CASE_CHANNEL = "duly:case";

export function versionFrom(argv: readonly string[]): string {
  const found = argv.find((argument) => argument.startsWith(VERSION_FLAG));
  return found === undefined ? "" : found.slice(VERSION_FLAG.length);
}

function ask(message: object): Promise<unknown> {
  return ipcRenderer.invoke(CASE_CHANNEL, message);
}

export const caseBridge = Object.freeze({
  read: (): Promise<unknown> => ask({ version: "v1", call: "case.read" }),
  write: (value: unknown): Promise<unknown> =>
    ask({ version: "v1", call: "case.write", case: value }),
  clear: (): Promise<unknown> => ask({ version: "v1", call: "case.clear" }),
});

contextBridge.exposeInMainWorld(
  "duly",
  Object.freeze({
    version: versionFrom(process.argv),
    platform: process.platform,
    case: caseBridge,
  }),
);
