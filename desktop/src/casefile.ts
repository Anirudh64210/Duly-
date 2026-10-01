/**
 * The case bridge (RQ-K1): the page reads, writes and clears one case through
 * window.duly.case, and main keeps it in one file in the app's data folder, encrypted
 * with the keychain's key. Main checks the case against contracts/case.schema.json on
 * every read and every write, and refuses anything else. The page never names a path,
 * a file name or a key: they are fixed here.
 */
import { readFileSync } from "node:fs";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { insideTheApp } from "./about";
import { Checker } from "./schema";

/** The channel the preload asks on. The preload holds its own copy; a test compares them. */
export const CASE_CHANNEL = "duly:case";

/** The one file, in the app's data folder. documents-1 moves the case into duly.db. */
export const CASE_FILE = "case.bin";
const WRITING_FILE = `${CASE_FILE}.writing`;

export const CASE_SCHEMA_ID = "https://duly.local/contracts/case.schema.json";
export const BRIDGE_SCHEMA_ID = "https://duly.local/contracts/desktop_case_bridge.schema.json";

/** How long first_problem may be, from the bridge contract. */
export const PROBLEM_LENGTH = 240;

export type CallName = "case.read" | "case.write" | "case.clear";
export type Refused = "not_a_case" | "cannot_decrypt" | "keychain_unavailable" | "cannot_store";

export interface Refusal {
  version: "v1";
  call: CallName;
  ok: false;
  refused: Refused;
  first_problem?: string;
}

export type Reply =
  | { version: "v1"; call: "case.read"; ok: true; case: unknown }
  | { version: "v1"; call: "case.write" | "case.clear"; ok: true }
  | Refusal;

/** Encryption with the keychain's key. In main this is Electron's safeStorage. */
export interface Cipher {
  available(): boolean;
  encrypt(text: string): Buffer;
  decrypt(data: Buffer): string;
}

/** The file system, as the store uses it. Tests may pass their own. */
export interface Disk {
  /** The bytes, or null when there is no file. */
  read(path: string): Promise<Buffer | null>;
  /** Writes in full or not at all. */
  write(path: string, data: Buffer): Promise<void>;
  /** Removes the file; no file is not an error. */
  remove(path: string): Promise<void>;
}

export const nodeDisk: Disk = {
  async read(path) {
    try {
      return await readFile(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  },
  async write(path, data) {
    const writing = join(path, "..", WRITING_FILE);
    try {
      await writeFile(writing, data, { mode: 0o600 });
      await rename(writing, path);
    } catch (error) {
      await rm(writing, { force: true });
      throw error;
    }
  },
  async remove(path) {
    await rm(join(path, "..", WRITING_FILE), { force: true });
    await rm(path, { force: true });
  },
};

/** Reads the two contracts the bridge checks against, from the repository's contracts folder. */
/** The two schemas, from the contracts folder paths.ts gives. */
export function loadChecker(contracts: string): Checker {
  const read = (name: string): unknown => JSON.parse(readFileSync(join(contracts, name), "utf8"));
  return new Checker([read("case.schema.json"), read("desktop_case_bridge.schema.json")]);
}

/** Only the app's own page, in the window's main frame, may use the bridge. */
export function mayUseCase(frameUrl: string | undefined, isMainFrame: boolean): boolean {
  return isMainFrame && frameUrl !== undefined && insideTheApp(frameUrl);
}

export interface CaseStoreDeps {
  /** The app's data folder. Never from the page. */
  folder: string;
  cipher: Cipher;
  checker: Checker;
  disk?: Disk;
}

function refusal(call: CallName, refused: Refused, problem?: string): Refusal {
  const reply: Refusal = { version: "v1", call, ok: false, refused };
  if (problem !== undefined) reply.first_problem = problem.slice(0, PROBLEM_LENGTH);
  return reply;
}

function callName(message: unknown): CallName | null {
  if (typeof message !== "object" || message === null) return null;
  const call = (message as { call?: unknown }).call;
  return call === "case.read" || call === "case.write" || call === "case.clear" ? call : null;
}

/** The least a case can be, put in the case's place while only the call's shape is checked. */
const SHAPE_ONLY = { categories: ["f1"], time_zone: "UTC", facts: {}, records: [], complete: {} };

const CALL_SHAPES: Record<CallName, string> = {
  "case.read": "read_call",
  "case.write": "write_call",
  "case.clear": "clear_call",
};

/**
 * Answers one call from the page. A message that is not one of the three calls is not
 * answered: the promise is rejected, and nothing is read or written.
 */
export function createCaseBridge(deps: CaseStoreDeps): (message: unknown) => Promise<Reply> {
  const disk = deps.disk ?? nodeDisk;
  const file = join(deps.folder, CASE_FILE);
  const { checker, cipher } = deps;
  let queue: Promise<unknown> = Promise.resolve();

  const read = async (): Promise<Reply> => {
    if (!cipher.available()) return refusal("case.read", "keychain_unavailable");
    let data: Buffer | null;
    try {
      data = await disk.read(file);
    } catch {
      return refusal("case.read", "cannot_decrypt");
    }
    if (data === null) return { version: "v1", call: "case.read", ok: true, case: null };
    let text: string;
    try {
      text = cipher.decrypt(data);
    } catch {
      return refusal("case.read", "cannot_decrypt");
    }
    let saved: unknown;
    try {
      saved = JSON.parse(text);
    } catch {
      return refusal("case.read", "not_a_case", "/: JSON");
    }
    const problem = checker.problem(CASE_SCHEMA_ID, saved);
    if (problem !== null) return refusal("case.read", "not_a_case", problem);
    return { version: "v1", call: "case.read", ok: true, case: saved };
  };

  const write = async (value: unknown): Promise<Reply> => {
    const problem = checker.problem(CASE_SCHEMA_ID, value);
    if (problem !== null) return refusal("case.write", "not_a_case", problem);
    if (!cipher.available()) return refusal("case.write", "keychain_unavailable");
    let data: Buffer;
    try {
      data = cipher.encrypt(JSON.stringify(value));
    } catch {
      return refusal("case.write", "keychain_unavailable");
    }
    try {
      await disk.write(file, data);
    } catch {
      return refusal("case.write", "cannot_store");
    }
    return { version: "v1", call: "case.write", ok: true };
  };

  const clear = async (): Promise<Reply> => {
    try {
      await disk.remove(file);
    } catch {
      return refusal("case.clear", "cannot_store");
    }
    return { version: "v1", call: "case.clear", ok: true };
  };

  return (message: unknown) => {
    const call = callName(message);
    if (call === null) return Promise.reject(new Error("not a case bridge call"));
    // A write's case is checked on its own, so a case that fails is refused as not_a_case.
    // The rest of the message must be the call exactly as the contract gives it.
    const { case: value, ...shape } = message as { case?: unknown };
    const hasCase = Object.hasOwn(message as object, "case");
    const fits =
      hasCase === (call === "case.write") &&
      checker.problem(`${BRIDGE_SCHEMA_ID}#/$defs/${CALL_SHAPES[call]}`, {
        ...shape,
        ...(hasCase ? { case: SHAPE_ONLY } : {}),
      }) === null;
    if (!fits) return Promise.reject(new Error("not a case bridge call"));
    const run = (): Promise<Reply> =>
      call === "case.read" ? read() : call === "case.write" ? write(value) : clear();
    const next = queue.then(run, run);
    queue = next.catch(() => undefined);
    return next;
  };
}
