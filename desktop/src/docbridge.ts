/**
 * The documents bridge (SPEC-W2 point 13): the page adds, lists, opens, changes, removes,
 * exports and clears its documents through window.duly.documents, and main keeps them in the
 * documents store (docstore.ts). Main checks each call and each reply against
 * contracts/desktop_documents_bridge.schema.json. The page never sends a path: a file comes
 * from main's own dialog, or from a real drop, whose paths the preload reads from the Files.
 * Plaintext leaves the store only where the student picked through a system dialog.
 */
import { open, rename, rm, type FileHandle } from "node:fs/promises";
import { extname, isAbsolute, join } from "node:path";
import { crc32 } from "node:zlib";

import { mayUseCase, PROBLEM_LENGTH } from "./casefile";
import {
  DOCUMENTS_BRIDGE_ID,
  openStore,
  type Document,
  type StoreDeps,
  type StoreReply,
} from "./docstore";

/** The channel the preload asks on. The preload holds its own copy; a test compares them. */
export const DOCUMENTS_CHANNEL = "duly:documents";

/** The contracts the documents bridge checks against: its own and the case it refers to. */
export const DOCUMENTS_CONTRACTS = [
  "case.schema.json",
  "desktop_documents_bridge.schema.json",
] as const;

const VERBS = [
  "add",
  "list",
  "open",
  "versions",
  "update",
  "remove",
  "restore",
  "delete",
  "export",
  "clear",
] as const;
type Verb = (typeof VERBS)[number];

/** The reply $defs of each call. */
const REPLIES: Record<Verb, string> = {
  add: "add_reply",
  list: "list_reply",
  open: "open_reply",
  versions: "versions_reply",
  update: "update_reply",
  remove: "done_reply",
  restore: "done_reply",
  delete: "done_reply",
  export: "export_reply",
  clear: "done_reply",
};

/** The images open shows, as the contract's data_url allows them. */
const SHOWN_IMAGES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

/** Main's own system dialogs. Each resolves to null when the student cancels. */
export interface Dialogs {
  files(): Promise<string[] | null>;
  folder(): Promise<string | null>;
  zip(): Promise<string | null>;
}

export interface DocumentsBridgeDeps extends StoreDeps {
  dialogs: Dialogs;
}

/** The same rule as the case bridge: only the app's own page, in the main frame. */
export function mayUseDocuments(frameUrl: string | undefined, isMainFrame: boolean): boolean {
  return mayUseCase(frameUrl, isMainFrame);
}

/** Opens the first free name in the folder, so no file of the student's is written over. */
async function openFree(folder: string, name: string): Promise<FileHandle> {
  const ext = extname(name);
  const stem = name.slice(0, name.length - ext.length);
  for (let at = 1; ; at += 1) {
    const candidate = at === 1 ? name : `${stem} (${String(at)})${ext}`;
    try {
      return await open(join(folder, candidate), "wx", 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || at >= 1000) throw error;
    }
  }
}

/** A name not yet in the zip. */
function freeName(taken: Set<string>, name: string): string {
  const ext = extname(name);
  const stem = name.slice(0, name.length - ext.length);
  let candidate = name;
  for (let at = 2; taken.has(candidate); at += 1) candidate = `${stem} (${String(at)})${ext}`;
  taken.add(candidate);
  return candidate;
}

/**
 * A .zip of stored entries (method 0; scans and PDFs are compressed already), written to a
 * .part file and renamed when whole.
 */
async function writeZip(
  path: string,
  next: () => Promise<{ name: string; bytes: Buffer } | null>,
): Promise<number> {
  const part = `${path}.part`;
  const handle = await open(part, "wx", 0o600);
  const central: Buffer[] = [];
  let offset = 0;
  let count = 0;
  try {
    const taken = new Set<string>();
    for (let entry = await next(); entry !== null; entry = await next()) {
      const name = Buffer.from(freeName(taken, entry.name), "utf8");
      const { bytes } = entry;
      if (offset + 30 + name.length + bytes.length > 0xffffffff) throw new Error("too big a zip");
      const crc = crc32(bytes);
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0x0800, 6); // the name is UTF-8
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(bytes.length, 18);
      local.writeUInt32LE(bytes.length, 22);
      local.writeUInt16LE(name.length, 26);
      await handle.write(Buffer.concat([local, name, bytes]));
      const head = Buffer.alloc(46);
      head.writeUInt32LE(0x02014b50, 0);
      head.writeUInt16LE(20, 4);
      head.writeUInt16LE(20, 6);
      head.writeUInt16LE(0x0800, 8);
      head.writeUInt32LE(crc, 16);
      head.writeUInt32LE(bytes.length, 20);
      head.writeUInt32LE(bytes.length, 24);
      head.writeUInt16LE(name.length, 28);
      head.writeUInt32LE(offset, 42);
      central.push(head, name);
      offset += 30 + name.length + bytes.length;
      count += 1;
    }
    const directory = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(count, 8);
    end.writeUInt16LE(count, 10);
    end.writeUInt32LE(directory.length, 12);
    end.writeUInt32LE(offset, 16);
    await handle.write(Buffer.concat([directory, end]));
    await handle.sync();
    await handle.close();
    await rename(part, path);
  } catch (error) {
    await handle.close().catch(() => undefined);
    await rm(part, { force: true });
    throw error;
  }
  return count;
}

/**
 * Answers one call from the page. A message outside the contract is not answered: the promise
 * is rejected, and nothing is read or written.
 */
export function createDocumentsBridge(
  deps: DocumentsBridgeDeps,
): (message: unknown) => Promise<Record<string, unknown>> {
  const { checker, dialogs } = deps;
  const opened = openStore(deps);

  const add = async (message: Record<string, unknown>): Promise<StoreReply> => {
    const replaces = message.replaces as string | undefined;
    let paths: string[];
    const skipped: Record<string, unknown>[] = [];
    if (message.from === "dialog") {
      const picked = await dialogs.files();
      if (picked === null || picked.length === 0) {
        return { ok: true, added: [], skipped: [], cancelled: true };
      }
      paths = picked;
    } else {
      // A File made in the page gives no path; only a whole path from webUtils is a drop.
      paths = [];
      for (const path of message.dropped as string[]) {
        if (isAbsolute(path)) paths.push(path);
        else skipped.push({ refused: "not_dropped" });
      }
    }
    if (paths.length === 0) return { ok: true, added: [], skipped };
    const reply = await (await opened).add(paths, replaces);
    if (!reply.ok) return reply;
    return { ...reply, skipped: [...skipped, ...(reply.skipped as unknown[])] };
  };

  const show = async (id: string): Promise<StoreReply> => {
    const store = await opened;
    const listed = await store.list();
    if (!listed.ok) return listed;
    const document = (listed.documents as Document[]).find((one) => one.id === id);
    if (document === undefined) return { ok: false, refused: "unknown_document" };
    // Every chunk is checked before anything is sent, whatever is shown.
    const read = await store.read(id);
    if (!read.ok) return read;
    if (!SHOWN_IMAGES.has(document.media_type)) return { ok: true, id, shown: "none" };
    const data_url = `data:${document.media_type};base64,${read.bytes.toString("base64")}`;
    return { ok: true, id, shown: "image", data_url };
  };

  const exportCopies = async (ids: string[], as: "folder" | "zip"): Promise<StoreReply> => {
    const store = await opened;
    const listed = await store.list();
    if (!listed.ok) return listed;
    const documents = listed.documents as Document[];
    const chosen: Document[] = [];
    for (const id of new Set(ids)) {
      const document = documents.find((one) => one.id === id);
      if (document === undefined) return { ok: false, refused: "unknown_document" };
      chosen.push(document);
    }
    const place = as === "folder" ? await dialogs.folder() : await dialogs.zip();
    if (place === null) return { ok: true, exported: 0, cancelled: true };
    let damaged: StoreReply | null = null;
    let at = 0;
    const next = async (): Promise<{ name: string; bytes: Buffer } | null> => {
      const document = chosen[at];
      if (document === undefined) return null;
      at += 1;
      const read = await store.read(document.id);
      if (!read.ok) {
        damaged = read;
        throw new Error("a document does not open");
      }
      return { name: document.name, bytes: read.bytes };
    };
    let exported = 0;
    try {
      if (as === "zip") {
        exported = await writeZip(place, next);
      } else {
        for (let entry = await next(); entry !== null; entry = await next()) {
          const handle = await openFree(place, entry.name);
          try {
            await handle.writeFile(entry.bytes);
          } finally {
            await handle.close();
          }
          exported += 1;
        }
      }
    } catch {
      if (exported > 0) await store.exported(exported);
      return damaged ?? { ok: false, refused: "cannot_store" };
    }
    const noted = await store.exported(exported);
    return noted.ok ? { ok: true, exported } : noted;
  };

  const run = async (verb: Verb, message: Record<string, unknown>): Promise<StoreReply> => {
    const id = message.id as string;
    switch (verb) {
      case "add":
        return add(message);
      case "list":
        return (await opened).list();
      case "open":
        return show(id);
      case "versions":
        return (await opened).versions(id);
      case "update": {
        const changes = Object.fromEntries(
          Object.entries(message).filter(([field]) => !["version", "call", "id"].includes(field)),
        );
        return (await opened).update(id, changes);
      }
      case "remove":
        return (await opened).remove(id);
      case "restore":
        return (await opened).restore(id);
      case "delete":
        return (await opened).delete(id);
      case "export":
        return exportCopies(message.ids as string[], message.as as "folder" | "zip");
      case "clear":
        return (await opened).clear();
    }
  };

  return async (message: unknown) => {
    const isObject = typeof message === "object" && message !== null && !Array.isArray(message);
    const call = isObject ? (message as { call?: unknown }).call : undefined;
    const verb = VERBS.find((one) => call === `documents.${one}`);
    if (
      verb === undefined ||
      checker.problem(`${DOCUMENTS_BRIDGE_ID}#/$defs/${verb}_call`, message) !== null
    ) {
      throw new Error("not a documents bridge call");
    }
    const answer = await run(verb, message as Record<string, unknown>);
    const reply: Record<string, unknown> = { version: "v1", call: `documents.${verb}`, ...answer };
    if (typeof reply.first_problem === "string") {
      reply.first_problem = reply.first_problem.slice(0, PROBLEM_LENGTH);
    }
    const problem = checker.problem(`${DOCUMENTS_BRIDGE_ID}#/$defs/${REPLIES[verb]}`, reply);
    if (problem !== null) throw new Error(`not a documents bridge reply: ${problem}`);
    return reply;
  };
}
