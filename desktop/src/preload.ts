/**
 * The only bridge between the screen and this Mac. It gives the screen the app's version,
 * the platform, the case bridge (RQ-K1), the engine bridge (SPEC-W2 point 5), the state
 * bridge (point 18) and the documents bridge (point 13), and nothing else. No call takes a path from the page, a socket or a token. A sandboxed preload may only load electron itself, so this file
 * imports nothing of its own.
 */
import { contextBridge, ipcRenderer, webUtils } from "electron";

const VERSION_FLAG = "--duly-version=";

/** The same channel as CASE_CHANNEL in casefile.ts; a test compares them. */
export const CASE_CHANNEL = "duly:case";
/** The same channel as ENGINE_CHANNEL in enginebridge.ts. */
export const ENGINE_CHANNEL = "duly:engine";
/** The same channel as STATE_CHANNEL in statefile.ts. */
export const STATE_CHANNEL = "duly:state";
/** The same channel as DOCUMENTS_CHANNEL in docbridge.ts. */
export const DOCUMENTS_CHANNEL = "duly:documents";

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

/** Only replaces, when the page gives a document id as a string. */
function replacing(options: { replaces?: unknown }): object {
  return typeof options.replaces === "string" ? { replaces: options.replaces } : {};
}

const documentCall = (call: string, rest: object = {}): Promise<unknown> =>
  ask(DOCUMENTS_CHANNEL, { ...rest, version: "v1", call: `documents.${call}` });

/**
 * window.duly.documents. add takes {from: "dialog"} or {from: "drop", files}; for a drop each
 * File becomes the path webUtils gives it, which is empty for a File made in the page. No call
 * passes a string from the page on as a path.
 */
export const documentsBridge = Object.freeze({
  add: async (options: {
    from?: unknown;
    files?: unknown;
    replaces?: unknown;
  }): Promise<unknown> => {
    if (options.from !== "drop")
      return documentCall("add", { from: "dialog", ...replacing(options) });
    const files = Array.isArray(options.files) ? (options.files as unknown[]) : [];
    const dropped = files.map((file) => webUtils.getPathForFile(file as File));
    return documentCall("add", { from: "drop", dropped, ...replacing(options) });
  },
  list: (): Promise<unknown> => documentCall("list"),
  open: (id: unknown): Promise<unknown> => documentCall("open", { id }),
  versions: (id: unknown): Promise<unknown> => documentCall("versions", { id }),
  update: (id: unknown, changes: object): Promise<unknown> =>
    documentCall("update", { ...changes, id }),
  remove: (id: unknown): Promise<unknown> => documentCall("remove", { id }),
  restore: (id: unknown): Promise<unknown> => documentCall("restore", { id }),
  delete: (id: unknown): Promise<unknown> => documentCall("delete", { id }),
  export: (ids: unknown, as: unknown): Promise<unknown> => documentCall("export", { ids, as }),
  clear: (): Promise<unknown> => documentCall("clear"),
});

contextBridge.exposeInMainWorld(
  "duly",
  Object.freeze({
    version: versionFrom(process.argv),
    platform: process.platform,
    case: caseBridge,
    engine: engineBridge,
    state: stateBridge,
    documents: documentsBridge,
  }),
);
