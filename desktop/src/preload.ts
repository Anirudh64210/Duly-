/**
 * The only bridge between the screen and this Mac. It gives the screen the app's version,
 * the platform, the case bridge (RQ-K1), the engine bridge (SPEC-W2 point 5) and the state
 * bridge (point 18), and nothing else. No call takes a path, a socket or a token. A sandboxed preload may only load electron itself, so this file
 * imports nothing of its own.
 */
import { contextBridge, ipcRenderer } from "electron";

const VERSION_FLAG = "--duly-version=";

/** The same channel as CASE_CHANNEL in casefile.ts; a test compares them. */
export const CASE_CHANNEL = "duly:case";
/** The same channel as ENGINE_CHANNEL in enginebridge.ts. */
export const ENGINE_CHANNEL = "duly:engine";
/** The same channel as STATE_CHANNEL in statefile.ts. */
export const STATE_CHANNEL = "duly:state";

export function versionFrom(argv: readonly string[]): string {
  const found = argv.find((argument) => argument.startsWith(VERSION_FLAG));
  return found === undefined ? "" : found.slice(VERSION_FLAG.length);
}

function ask(channel: string, message: object): Promise<unknown> {
  return ipcRenderer.invoke(channel, message);
}

export const caseBridge = Object.freeze({
  read: (): Promise<unknown> => ask(CASE_CHANNEL, { version: "v1", call: "case.read" }),
  write: (value: unknown): Promise<unknown> =>
    ask(CASE_CHANNEL, { version: "v1", call: "case.write", case: value }),
  clear: (): Promise<unknown> => ask(CASE_CHANNEL, { version: "v1", call: "case.clear" }),
});

export const engineBridge = Object.freeze({
  compute: (value: unknown): Promise<unknown> =>
    ask(ENGINE_CHANNEL, { version: "v1", call: "engine.compute", case: value }),
  schedule: (value: unknown, requests: unknown): Promise<unknown> =>
    ask(ENGINE_CHANNEL, { version: "v1", call: "engine.schedule", case: value, requests }),
  updates: (): Promise<unknown> => ask(ENGINE_CHANNEL, { version: "v1", call: "engine.updates" }),
});

export const stateBridge = Object.freeze({
  read: (): Promise<unknown> => ask(STATE_CHANNEL, { version: "v1", call: "state.read" }),
  write: (value: unknown): Promise<unknown> =>
    ask(STATE_CHANNEL, { version: "v1", call: "state.write", state: value }),
  clear: (): Promise<unknown> => ask(STATE_CHANNEL, { version: "v1", call: "state.clear" }),
});

contextBridge.exposeInMainWorld(
  "duly",
  Object.freeze({
    version: versionFrom(process.argv),
    platform: process.platform,
    case: caseBridge,
    engine: engineBridge,
    state: stateBridge,
  }),
);
