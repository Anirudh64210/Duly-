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

export const CASE_SCHEMA_ID = "https://duly.local/contracts/case.schema.json";
export const BRIDGE_SCHEMA_ID = "https://duly.local/contracts/desktop_case_bridge.schema.json";

/** How long first_problem may be, from the bridge contract. */
export const PROBLEM_LENGTH = 240;

/** A bridge over one encrypted file: the case bridge here, the state bridge in statefile.ts. */
export interface FileKind {
  /** The calls are `${name}.read`, `.write` and `.clear`; a write carries the value as `name`. */
  name: "case" | "state";
  file: string;
  /** The schema every value read or written is checked against. */
  valueSchema: string;
  bridgeSchema: string;
  /** The least a value can be, put in its place while only the call's shape is checked. */
  shapeOnly: object;
}

export interface Refusal {
  version: "v1";
  call: string;
  ok: false;
  refused: string;
  first_problem?: string;
}

export type Reply = { version: "v1"; call: string; ok: true; [value: string]: unknown } | Refusal;

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
    const writing = `${path}.writing`;
    try {
      await writeFile(writing, data, { mode: 0o600 });
      await rename(writing, path);
    } catch (error) {
      await rm(writing, { force: true });
      throw error;
    }
  },
  async remove(path) {
    await rm(`${path}.writing`, { force: true });
    await rm(path, { force: true });
  },
};

/** The contracts a bridge checks against, from the contracts folder paths.ts gives. */
export function loadChecker(
  contracts: string,
  names: readonly string[] = ["case.schema.json", "desktop_case_bridge.schema.json"],
): Checker {
  const read = (name: string): unknown => JSON.parse(readFileSync(join(contracts, name), "utf8"));
  return new Checker(names.map(read));
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

const CASE: FileKind = {
  name: "case",
  file: CASE_FILE,
  valueSchema: CASE_SCHEMA_ID,
  bridgeSchema: BRIDGE_SCHEMA_ID,
  shapeOnly: { categories: ["f1"], time_zone: "UTC", facts: {}, records: [], complete: {} },
};

export function createCaseBridge(deps: CaseStoreDeps): (message: unknown) => Promise<Reply> {
  return createFileBridge(CASE, deps);
}

function refusal(call: string, refused: string, problem?: string): Refusal {
  const reply: Refusal = { version: "v1", call, ok: false, refused };
  if (problem !== undefined) reply.first_problem = problem.slice(0, PROBLEM_LENGTH);
  return reply;
}

type Verb = "read" | "write" | "clear";

/**
 * Answers one call from the page. A message that is not one of the three calls is not
 * answered: the promise is rejected, and nothing is read or written.
 */
export function createFileBridge(
  kind: FileKind,
  deps: CaseStoreDeps,
): (message: unknown) => Promise<Reply> {
  const disk = deps.disk ?? nodeDisk;
  const file = join(deps.folder, kind.file);
  const { checker, cipher } = deps;
  const notA = `not_a_${kind.name}`;
  const verbs = new Map<unknown, Verb>(
    (["read", "write", "clear"] as const).map((verb) => [`${kind.name}.${verb}`, verb]),
  );
  let queue: Promise<unknown> = Promise.resolve();

  const read = async (call: string): Promise<Reply> => {
    if (!cipher.available()) return refusal(call, "keychain_unavailable");
    let data: Buffer | null;
    try {
      data = await disk.read(file);
    } catch {
      return refusal(call, "cannot_decrypt");
    }
    if (data === null) return { version: "v1", call, ok: true, [kind.name]: null };
    let text: string;
    try {
      text = cipher.decrypt(data);
    } catch {
      return refusal(call, "cannot_decrypt");
    }
    let saved: unknown;
    try {
      saved = JSON.parse(text);
    } catch {
      return refusal(call, notA, "/: JSON");
    }
    const problem = checker.problem(kind.valueSchema, saved);
    if (problem !== null) return refusal(call, notA, problem);
    return { version: "v1", call, ok: true, [kind.name]: saved };
  };

  const write = async (call: string, value: unknown): Promise<Reply> => {
    const problem = checker.problem(kind.valueSchema, value);
    if (problem !== null) return refusal(call, notA, problem);
    if (!cipher.available()) return refusal(call, "keychain_unavailable");
    let data: Buffer;
    try {
      data = cipher.encrypt(JSON.stringify(value));
    } catch {
      return refusal(call, "keychain_unavailable");
    }
    try {
      await disk.write(file, data);
    } catch {
      return refusal(call, "cannot_store");
    }
    return { version: "v1", call, ok: true };
  };

  const clear = async (call: string): Promise<Reply> => {
    try {
      await disk.remove(file);
    } catch {
      return refusal(call, "cannot_store");
    }
    return { version: "v1", call, ok: true };
  };

  return (message: unknown) => {
    const isObject = typeof message === "object" && message !== null;
    const call = isObject ? (message as { call?: unknown }).call : undefined;
    const verb = verbs.get(call);
    if (verb === undefined || typeof call !== "string") {
      return Promise.reject(new Error(`not a ${kind.name} bridge call`));
    }
    // A write's value is checked on its own, so a value that fails is refused as not_a_<name>.
    // The rest of the message must be the call exactly as the contract gives it.
    const { [kind.name]: value, ...shape } = message as Record<string, unknown>;
    const hasValue = Object.hasOwn(message as object, kind.name);
    const fits =
      hasValue === (verb === "write") &&
      checker.problem(`${kind.bridgeSchema}#/$defs/${verb}_call`, {
        ...shape,
        ...(hasValue ? { [kind.name]: kind.shapeOnly } : {}),
      }) === null;
    if (!fits) return Promise.reject(new Error(`not a ${kind.name} bridge call`));
    const run = (): Promise<Reply> =>
      verb === "read" ? read(call) : verb === "write" ? write(call, value) : clear(call);
    const next = queue.then(run, run);
    queue = next.catch(() => undefined);
    return next;
  };
}
