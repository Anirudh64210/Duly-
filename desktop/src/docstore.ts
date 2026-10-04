/**
 * The documents store (SPEC-W2 points 14 to 17), in main, with Node's crypto only and no
 * database. A random 256-bit document key D, wrapped by the keychain, sits in keys.bin. Each
 * file has its own random 256-bit key F, kept only in the index. Each file is files/<id>:
 * AES-256-GCM in 1 MiB chunks (documents-1 section 3). The index is documents.bin, one JSON
 * value under D, written in full or not at all. The student's original file is only read.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, open, readdir, readFile, realpath, rename, rm, stat } from "node:fs/promises";
import { basename, extname, join, sep } from "node:path";

import { nodeDisk, type Cipher, type Disk } from "./casefile";
import type { Checker } from "./schema";

export const DOCUMENTS_BRIDGE_ID =
  "https://duly.local/contracts/desktop_documents_bridge.schema.json";

export const KEYS_FILE = "keys.bin";
export const INDEX_FILE = "documents.bin";
export const FILES_FOLDER = "files";

/**
 * Duly's own size limit; no law states one. 50 MiB is vault.max_file_megabytes as proposed in
 * specs/documents-1/SPEC.md (Settings), which is not yet in contracts/product_settings.yaml.
 */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** The chunk size of point 15: 1 MiB. */
const CHUNK = 1024 * 1024;
const TAG = 16;
const PREFIX = 8;
const KEY = 32;
const INDEX_NONCE = 12;
const INDEX_AAD = Buffer.from("duly documents.bin v1");

const MEDIA_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".txt": "text/plain",
};

export interface Document {
  id: string;
  name: string;
  kind: string;
  label: string;
  group: string;
  labels?: string[];
  typed?: unknown[];
  replaces?: string | null;
  change?: string;
  media_type: string;
  size: number;
  added_on: string;
  removed: boolean;
  removed_on?: string;
}

export interface HistoryLine {
  on: string;
  event: string;
  document?: string;
  count?: number;
}

/** One row of the index: the document as the page sees it, and what only main keeps. */
interface Row {
  document: Document;
  /** F, in base64. */
  key: string;
  /** The SHA-256 of the original bytes, in hex. */
  sha256: string;
}

interface Index {
  rows: Row[];
  history: HistoryLine[];
}

export interface StoreRefusal {
  ok: false;
  refused: string;
  first_problem?: string;
}

export type StoreReply = ({ ok: true } & Record<string, unknown>) | StoreRefusal;

export interface Store {
  add(paths: readonly string[], replaces?: string): Promise<StoreReply>;
  list(): Promise<StoreReply>;
  read(id: string): Promise<{ ok: true; bytes: Buffer } | StoreRefusal>;
  versions(id: string): Promise<StoreReply>;
  update(id: string, changes: Record<string, unknown>): Promise<StoreReply>;
  remove(id: string): Promise<StoreReply>;
  restore(id: string): Promise<StoreReply>;
  delete(id: string): Promise<StoreReply>;
  clear(): Promise<StoreReply>;
}

export interface StoreDeps {
  /** The app's data folder. Never from the page. */
  folder: string;
  /** safeStorage in main. It wraps D, and only D. */
  cipher: Cipher;
  checker: Checker;
  /** This Mac's day, for added_on, removed_on and history. */
  today: () => string;
  random?: (size: number) => Buffer;
  /** Called as each step of an add is done; a throw there is a crash in that step. */
  step?: (name: string) => void;
  /** For keys.bin and documents.bin. */
  disk?: Disk;
}

const refuse = (refused: string, problem?: string): StoreRefusal =>
  problem === undefined ? { ok: false, refused } : { ok: false, refused, first_problem: problem };

/** The additional data of one chunk: the document id, the chunk index and the last-chunk flag. */
function chunkData(id: string, index: number, last: boolean): Buffer {
  const data = Buffer.alloc(id.length + 5);
  data.write(id, 0, "latin1");
  data.writeUInt32BE(index, id.length);
  data.writeUInt8(last ? 1 : 0, id.length + 4);
  return data;
}

function chunkNonce(prefix: Buffer, index: number): Buffer {
  const nonce = Buffer.alloc(PREFIX + 4);
  prefix.copy(nonce, 0);
  nonce.writeUInt32BE(index, PREFIX);
  return nonce;
}

/** The file: its 64-bit nonce prefix, then each chunk's ciphertext and tag. */
function sealFile(id: string, key: Buffer, prefix: Buffer, plain: Buffer): Buffer {
  const parts = [prefix];
  const count = Math.max(1, Math.ceil(plain.length / CHUNK));
  for (let index = 0; index < count; index += 1) {
    const aes = createCipheriv("aes-256-gcm", key, chunkNonce(prefix, index));
    aes.setAAD(chunkData(id, index, index === count - 1));
    parts.push(aes.update(plain.subarray(index * CHUNK, (index + 1) * CHUNK)), aes.final());
    parts.push(aes.getAuthTag());
  }
  return Buffer.concat(parts);
}

/** The plain bytes, or null when any chunk fails its check, is missing or is cut. */
function openFile(id: string, key: Buffer, sealed: Buffer): Buffer | null {
  if (sealed.length < PREFIX + TAG) return null;
  const prefix = sealed.subarray(0, PREFIX);
  const parts: Buffer[] = [];
  let offset = PREFIX;
  for (let index = 0; offset < sealed.length; index += 1) {
    const end = Math.min(offset + CHUNK + TAG, sealed.length);
    if (end - offset < TAG) return null;
    try {
      const aes = createDecipheriv("aes-256-gcm", key, chunkNonce(prefix, index));
      aes.setAAD(chunkData(id, index, end === sealed.length));
      aes.setAuthTag(sealed.subarray(end - TAG, end));
      parts.push(aes.update(sealed.subarray(offset, end - TAG)), aes.final());
    } catch {
      return null;
    }
    offset = end;
  }
  return Buffer.concat(parts);
}

const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");

/** The index's own shape; each document and line is also checked against the contract. */
function indexProblem(checker: Checker, value: unknown): string | null {
  if (typeof value !== "object" || value === null) return "/: object";
  const { rows, history } = value as Partial<Index>;
  if (!Array.isArray(rows)) return "/rows: array";
  if (!Array.isArray(history)) return "/history: array";
  for (const [at, row] of rows.entries()) {
    if (typeof row !== "object" || row === null) return `/rows/${at}: object`;
    if (typeof row.key !== "string" || Buffer.from(row.key, "base64").length !== KEY) {
      return `/rows/${at}/key: a 256-bit key`;
    }
    if (typeof row.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(row.sha256)) {
      return `/rows/${at}/sha256: a SHA-256`;
    }
    const problem = checker.problem(`${DOCUMENTS_BRIDGE_ID}#/$defs/document`, row.document);
    if (problem !== null) return `/rows/${at}/document${problem}`;
  }
  for (const [at, line] of history.entries()) {
    const problem = checker.problem(`${DOCUMENTS_BRIDGE_ID}#/$defs/history_line`, line);
    if (problem !== null) return `/history/${at}${problem}`;
  }
  return null;
}

/** Opens the store, and removes what a crash left in files/ that no index row names. */
export async function openStore(deps: StoreDeps): Promise<Store> {
  const { folder, cipher, checker, today } = deps;
  const random = deps.random ?? randomBytes;
  const step = deps.step ?? (() => undefined);
  const disk = deps.disk ?? nodeDisk;
  const keysPath = join(folder, KEYS_FILE);
  const indexPath = join(folder, INDEX_FILE);
  const files = join(folder, FILES_FOLDER);

  let loaded: { key: Buffer; index: Index } | null = null;

  /** D and the index, read once. With create, D is made at first use. */
  const load = async (create = false): Promise<{ key: Buffer; index: Index } | StoreRefusal> => {
    if (loaded !== null) return loaded;
    if (!cipher.available()) return refuse("keychain_unavailable");
    let wrapped: Buffer | null;
    let sealed: Buffer | null;
    try {
      wrapped = await disk.read(keysPath);
      sealed = await disk.read(indexPath);
    } catch {
      return refuse("cannot_decrypt");
    }
    let key: Buffer;
    if (wrapped === null) {
      // Without keys.bin an index that is there can never be read again: refuse, change nothing.
      if (sealed !== null) return refuse("cannot_decrypt");
      if (!create) return { key: Buffer.alloc(0), index: { rows: [], history: [] } };
      key = random(KEY);
      try {
        await disk.write(keysPath, cipher.encrypt(key.toString("base64")));
      } catch {
        return refuse("keychain_unavailable");
      }
    } else {
      try {
        key = Buffer.from(cipher.decrypt(wrapped), "base64");
      } catch {
        return refuse("cannot_decrypt");
      }
      if (key.length !== KEY) return refuse("cannot_decrypt");
    }
    let index: Index = { rows: [], history: [] };
    if (sealed !== null) {
      let value: unknown;
      try {
        const aes = createDecipheriv("aes-256-gcm", key, sealed.subarray(0, INDEX_NONCE));
        aes.setAAD(INDEX_AAD);
        aes.setAuthTag(sealed.subarray(INDEX_NONCE, INDEX_NONCE + TAG));
        const text = Buffer.concat([aes.update(sealed.subarray(INDEX_NONCE + TAG)), aes.final()]);
        value = JSON.parse(text.toString("utf8"));
      } catch {
        return refuse("index_damaged", "/: does not open under the document key");
      }
      const problem = indexProblem(checker, value);
      if (problem !== null) return refuse("index_damaged", problem);
      index = value as Index;
    }
    loaded = { key, index };
    return loaded;
  };

  /** Writes the index in full or not at all; the one in memory changes only once it is written. */
  const save = async (key: Buffer, index: Index): Promise<boolean> => {
    const nonce = random(INDEX_NONCE);
    const aes = createCipheriv("aes-256-gcm", key, nonce);
    aes.setAAD(INDEX_AAD);
    const body = Buffer.concat([aes.update(JSON.stringify(index), "utf8"), aes.final()]);
    try {
      await disk.write(indexPath, Buffer.concat([nonce, aes.getAuthTag(), body]));
    } catch {
      return false;
    }
    loaded = { key, index };
    return true;
  };

  const find = (index: Index, id: string): Row | undefined =>
    index.rows.find((row) => row.document.id === id);

  const line = (event: string, document?: string): HistoryLine =>
    document === undefined ? { on: today(), event } : { on: today(), event, document };

  const insideFolder = async (path: string): Promise<boolean> => {
    try {
      const [real, home] = await Promise.all([realpath(path), realpath(folder)]);
      return real === home || real.startsWith(home + sep);
    } catch {
      return false;
    }
  };

  /** Encrypts one file into files/<id>, checked, or leaves nothing and throws. */
  const store = async (id: string, key: Buffer, plain: Buffer): Promise<void> => {
    const part = join(files, `${id}.part`);
    const final = join(files, id);
    try {
      await mkdir(files, { recursive: true, mode: 0o700 });
      const handle = await open(part, "wx", 0o600);
      try {
        await handle.writeFile(sealFile(id, key, random(PREFIX), plain));
        step("part_written");
        await handle.sync();
        step("synced");
      } finally {
        await handle.close();
      }
      await rename(part, final);
      step("renamed");
      const back = openFile(id, key, await readFile(final));
      if (back === null || sha256(back) !== sha256(plain)) throw new Error("does not read back");
      step("checked");
    } catch (error) {
      await rm(part, { force: true });
      await rm(final, { force: true });
      throw error;
    }
  };

  const add = async (paths: readonly string[], replaces?: string): Promise<StoreReply> => {
    const ready = await load(true);
    if ("ok" in ready) return ready;
    if (replaces !== undefined && find(ready.index, replaces) === undefined) {
      return refuse("bad_replaces");
    }
    const added: Document[] = [];
    const skipped: Record<string, unknown>[] = [];
    for (const path of paths) {
      const name = basename(path);
      const skip = (refused: string, more: Record<string, unknown> = {}) =>
        skipped.push({ ...(name === "" ? {} : { name }), refused, ...more });
      let size: number;
      try {
        const found = await stat(path);
        if (!found.isFile()) {
          skip("not_a_file");
          continue;
        }
        size = found.size;
      } catch {
        skip("not_a_file");
        continue;
      }
      if (await insideFolder(path)) {
        skip("inside_data_folder");
        continue;
      }
      if (size > MAX_FILE_BYTES) {
        skip("too_large");
        continue;
      }
      const { key, index } = loaded ?? ready;
      let plain: Buffer;
      try {
        plain = await readFile(path);
      } catch {
        skip("cannot_store");
        continue;
      }
      if (plain.length > MAX_FILE_BYTES) {
        skip("too_large");
        continue;
      }
      const hash = sha256(plain);
      const held = index.rows.find((row) => row.sha256 === hash);
      if (held !== undefined) {
        skip("duplicate", { existing: held.document.id });
        continue;
      }
      const id = random(16).toString("hex");
      const fileKey = random(KEY);
      try {
        await store(id, fileKey, plain);
      } catch {
        skip("cannot_store");
        continue;
      }
      const document: Document = {
        id,
        name,
        kind: "other",
        label: name.slice(0, 120),
        group: "other",
        ...(replaces === undefined ? {} : { replaces }),
        media_type: MEDIA_TYPES[extname(name).toLowerCase()] ?? "application/octet-stream",
        size: plain.length,
        added_on: today(),
        removed: false,
      };
      const row: Row = { document, key: fileKey.toString("base64"), sha256: hash };
      const next: Index = {
        rows: [...index.rows, row],
        history: [line("added", id), ...index.history],
      };
      if (!(await save(key, next))) {
        await rm(join(files, id), { force: true });
        skip("cannot_store");
        continue;
      }
      added.push({ ...document });
    }
    return { ok: true, added, skipped };
  };

  /** Runs a change to one row, writes the index, and answers. */
  const change = async (
    id: string,
    apply: (index: Index, row: Row) => Index | StoreRefusal,
    answer: (index: Index) => StoreReply = () => ({ ok: true }),
  ): Promise<StoreReply> => {
    const ready = await load();
    if ("ok" in ready) return ready;
    const row = find(ready.index, id);
    if (row === undefined) return refuse("unknown_document");
    const next = apply(ready.index, row);
    if ("ok" in next) return next;
    if (!(await save(ready.key, next))) return refuse("cannot_store");
    return answer(next);
  };

  const withDocument = (index: Index, id: string, document: Document): Index => ({
    ...index,
    rows: index.rows.map((row) => (row.document.id === id ? { ...row, document } : row)),
  });

  /** Newest first: up to the newest that replaces it, then back down through replaces. */
  const chain = (index: Index, id: string): Document[] => {
    const replacedBy = new Map<string, string>();
    for (const row of index.rows) {
      if (typeof row.document.replaces === "string") {
        replacedBy.set(row.document.replaces, row.document.id);
      }
    }
    const seen = new Set<string>([id]);
    let head = id;
    for (let up = replacedBy.get(head); up !== undefined && !seen.has(up);) {
      seen.add(up);
      head = up;
      up = replacedBy.get(head);
    }
    const versions: Document[] = [];
    const walked = new Set<string>();
    for (let at: string | null | undefined = head; typeof at === "string" && !walked.has(at);) {
      walked.add(at);
      const row = find(index, at);
      if (row === undefined) break;
      versions.push({ ...row.document });
      at = row.document.replaces;
    }
    return versions;
  };

  const loops = (index: Index, id: string, replaces: string): boolean => {
    const seen = new Set<string>();
    for (let at: string | null | undefined = replaces; typeof at === "string";) {
      if (at === id) return true;
      if (seen.has(at)) return false;
      seen.add(at);
      at = find(index, at)?.document.replaces;
    }
    return false;
  };

  const UPDATABLE = ["kind", "label", "group", "labels", "typed", "replaces", "change"];

  const calls: Store = {
    add,

    async list() {
      const ready = await load();
      if ("ok" in ready) return ready;
      return {
        ok: true,
        documents: ready.index.rows.map((row) => ({ ...row.document })),
        history: ready.index.history.map((one) => ({ ...one })),
      };
    },

    async read(id) {
      const ready = await load();
      if ("ok" in ready) return ready;
      const row = find(ready.index, id);
      if (row === undefined) return refuse("unknown_document");
      let sealed: Buffer;
      try {
        sealed = await readFile(join(files, id));
      } catch {
        return refuse("file_damaged");
      }
      const bytes = openFile(id, Buffer.from(row.key, "base64"), sealed);
      if (bytes === null || sha256(bytes) !== row.sha256) return refuse("file_damaged");
      return { ok: true, bytes };
    },

    async versions(id) {
      const ready = await load();
      if ("ok" in ready) return ready;
      if (find(ready.index, id) === undefined) return refuse("unknown_document");
      return { ok: true, versions: chain(ready.index, id) };
    },

    update: (id, changes) =>
      change(
        id,
        (index, row) => {
          for (const field of Object.keys(changes)) {
            if (!UPDATABLE.includes(field)) throw new Error(`not a field to update: ${field}`);
          }
          const document = Object.fromEntries(
            Object.entries({ ...row.document, ...changes }).filter(([, value]) => value !== null),
          );
          const replaces = changes.replaces;
          if (
            typeof replaces === "string" &&
            (replaces === id || find(index, replaces) === undefined || loops(index, id, replaces))
          ) {
            return refuse("bad_replaces");
          }
          const problem = checker.problem(`${DOCUMENTS_BRIDGE_ID}#/$defs/document`, document);
          if (problem !== null) throw new Error(`not a document: ${problem}`);
          const event = typeof replaces === "string" ? "replaced" : "updated";
          const next = withDocument(index, id, document as unknown as Document);
          return { ...next, history: [line(event, id), ...index.history] };
        },
        (index) => ({ ok: true, document: { ...find(index, id)?.document } }),
      ),

    remove: (id) =>
      change(id, (index, row) => {
        const document = { ...row.document, removed: true, removed_on: today() };
        const next = withDocument(index, id, document);
        return { ...next, history: [line("removed", id), ...index.history] };
      }),

    restore: (id) =>
      change(id, (index, row) => {
        const document = { ...row.document, removed: false };
        delete document.removed_on;
        const next = withDocument(index, id, document);
        return { ...next, history: [line("restored", id), ...index.history] };
      }),

    async delete(id) {
      const reply = await change(id, (index, row) => {
        if (!row.document.removed) return refuse("not_in_removed");
        const replaced = row.document.replaces;
        // The row and F go; a later version now replaces what this one replaced; no line names it.
        const rows = index.rows
          .filter((one) => one.document.id !== id)
          .map((one): Row => {
            if (one.document.replaces !== id) return one;
            const document: Document = { ...one.document };
            if (typeof replaced === "string") document.replaces = replaced;
            else delete document.replaces;
            return { ...one, document };
          });
        const history = index.history.map((one) => {
          if (one.document !== id) return one;
          const kept = { ...one };
          delete kept.document;
          return kept;
        });
        return { rows, history: [line("deleted"), ...history] };
      });
      if (!reply.ok) return reply;
      try {
        await rm(join(files, id), { force: true });
      } catch {
        // The row is gone, so the next launch removes the file as one no row names.
        return refuse("cannot_store");
      }
      return reply;
    },

    async clear() {
      try {
        await rm(files, { recursive: true, force: true });
        await disk.remove(indexPath);
        await disk.remove(keysPath);
      } catch {
        return refuse("cannot_store");
      }
      loaded = null;
      return { ok: true };
    },
  };

  // One call at a time, as the case bridge does.
  let queue: Promise<unknown> = Promise.resolve();
  const inTurn =
    <A extends unknown[], R>(run: (...args: A) => Promise<R>) =>
    (...args: A): Promise<R> => {
      const next = queue.then(
        () => run(...args),
        () => run(...args),
      );
      queue = next.catch(() => undefined);
      return next;
    };

  // At launch: with the index read, anything in files/ no row names is what a crash left.
  const ready = await load();
  if (!("ok" in ready)) {
    const named = new Set(ready.index.rows.map((row) => row.document.id));
    const found = ready.key.length === KEY ? await readdir(files).catch(() => []) : [];
    for (const name of found) {
      if (!named.has(name)) await rm(join(files, name), { force: true, recursive: true });
    }
  }

  return {
    add: inTurn(calls.add),
    list: inTurn(calls.list),
    read: inTurn(calls.read),
    versions: inTurn(calls.versions),
    update: inTurn(calls.update),
    remove: inTurn(calls.remove),
    restore: inTurn(calls.restore),
    delete: inTurn(calls.delete),
    clear: inTurn(calls.clear),
  };
}
