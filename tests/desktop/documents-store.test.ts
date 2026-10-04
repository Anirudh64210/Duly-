// specs/step-w/SPEC-W2.md points 14 to 17 (W2-P4, point 52): the documents store in main, under
// a document key D wrapped by safeStorage, a file key F per file, AES-256-GCM in 1 MiB chunks
// (specs/documents-1/SPEC.md section 3), the index documents.bin, versions and nothing lost.
// Replies are checked against contracts/desktop_documents_bridge.schema.json. Written before
// the store exists: these cannot pass yet.
//
// What L-desktop builds for these tests: desktop/src/docstore.ts with openStore(deps), which
// opens the store in deps.folder (the app's data folder) and, as a relaunch does, removes what
// a crash left in files/ that no index row names. Each call resolves to the contract's reply
// for it without version and call: add(paths, replaces?), list(), versions(id), update(id,
// changes), remove(id), restore(id), delete(id), clear(); and read(id), the decrypted bytes as
// { ok: true, bytes } or a refusal, which open and export use. The deps:
// - cipher: safeStorage, as casefile.ts's Cipher; it wraps D, and only D.
// - random(size): every random byte the store uses; D and each F are one random(32) each.
// - today(): this Mac's day, for added_on, removed_on and history.
// - step(name): called as each step of an add is done: "part_written", "synced", "renamed",
//   "checked" (decrypted back and the SHA-256 compared, before the row is written). A throw
//   there is a crash in that step.
// - disk: as casefile.ts's Disk, for keys.bin and documents.bin, written in full or not at all.
// It also exports MAX_FILE_BYTES, Duly's own size limit (no law states one).
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { nodeDisk, type Cipher, type Disk } from "../../desktop/src/casefile";
import type { Checker } from "../../desktop/src/schema";
import {
  DOCUMENTS_BRIDGE,
  contractChecker,
  fakeKeychain,
  filesUnder,
  keyForms,
  load,
} from "./support";

type Reply = { ok: true } & Record<string, unknown>;
type Refusal = { ok: false; refused: string; first_problem?: string };

interface Document {
  id: string;
  name: string;
  replaces?: string | null;
  removed: boolean;
  removed_on?: string;
}

interface HistoryLine {
  on: string;
  event: string;
  document?: string;
  count?: number;
}

interface Store {
  add(paths: readonly string[], replaces?: string): Promise<Reply | Refusal>;
  list(): Promise<Reply | Refusal>;
  read(id: string): Promise<{ ok: true; bytes: Buffer } | Refusal>;
  versions(id: string): Promise<Reply | Refusal>;
  update(id: string, changes: Record<string, unknown>): Promise<Reply | Refusal>;
  remove(id: string): Promise<Reply | Refusal>;
  restore(id: string): Promise<Reply | Refusal>;
  delete(id: string): Promise<Reply | Refusal>;
  clear(): Promise<Reply | Refusal>;
}

interface StoreDeps {
  folder: string;
  cipher: Cipher;
  checker: Checker;
  today: () => string;
  random?: (size: number) => Buffer;
  step?: (name: string) => void;
  disk?: Disk;
}

interface StoreModule {
  MAX_FILE_BYTES: number;
  openStore(deps: StoreDeps): Promise<Store>;
}

/** 1 MiB, the chunk size of point 15: 1024 * 1024 = 1048576 bytes. */
const CHUNK = 1024 * 1024;
const TODAY = "2026-10-03";
const ADD_STEPS = ["part_written", "synced", "renamed", "checked"];

let store: StoreModule;
let checker: Checker;
/** The keychain of this Mac for one test: every open and relaunch uses it unless told not to. */
let keychain: ReturnType<typeof fakeKeychain>;
let folder: string;
let outside: string;

beforeEach(async () => {
  checker = contractChecker(["case", "desktop_documents_bridge"]);
  keychain = fakeKeychain();
  folder = mkdtempSync(join(tmpdir(), "duly-data-"));
  outside = mkdtempSync(join(tmpdir(), "duly-student-"));
  store = await load<StoreModule>("docstore");
});
afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

/** The student's own file, outside the data folder, with random bytes of this size. */
function studentFile(name: string, size: number): { path: string; bytes: Buffer } {
  const bytes = randomBytes(size);
  const path = join(outside, name);
  writeFileSync(path, bytes);
  return { path, bytes };
}

/** A random source that keeps every draw. */
function keptRandom() {
  const draws: Buffer[] = [];
  const random = (size: number): Buffer => {
    const bytes = randomBytes(size);
    draws.push(bytes);
    return bytes;
  };
  return { random, draws };
}

const open = (deps: Partial<StoreDeps> = {}) =>
  store.openStore({
    folder,
    cipher: keychain.cipher,
    checker,
    today: () => TODAY,
    ...deps,
  });

/** The reply as the bridge sends it, checked against the contract's reply for the call. */
function inContract(call: string, reply: unknown, define: string): void {
  const message = { version: "v1", call: `documents.${call}`, ...(reply as object) };
  expect(checker.problem(`${DOCUMENTS_BRIDGE}#/$defs/${define}`, message)).toBeNull();
}

async function addOne(opened: Store, path: string, replaces?: string): Promise<Document> {
  const reply = await (replaces === undefined ? opened.add([path]) : opened.add([path], replaces));
  inContract("add", reply, "add_reply");
  expect(reply).toMatchObject({ ok: true, skipped: [] });
  const added = (reply as Reply).added as Document[];
  expect(added).toHaveLength(1);
  return added[0] as Document;
}

async function listed(opened: Store): Promise<{ documents: Document[]; history: HistoryLine[] }> {
  const reply = await opened.list();
  inContract("list", reply, "list_reply");
  expect(reply.ok).toBe(true);
  return reply as unknown as { documents: Document[]; history: HistoryLine[] };
}

describe("the keys (SPEC-W2 point 14)", () => {
  it("wraps D with the keychain into keys.bin and never writes D or any F unwrapped", async () => {
    // Point 14: D is "wrapped by safeStorage ... into <userData>/keys.bin"; each F is "kept
    // only inside the encrypted index". With the fake keychain and a random source that keeps
    // every draw, two adds draw at least three 32-byte keys (D, and F for each file). Fails if
    // any key, in bytes, hex or base64, is in any file under the data folder or in a reply,
    // or if an F is handed to the keychain.
    const kept = keptRandom();
    const opened = await open({ random: kept.random });
    const one = await addOne(opened, studentFile("i20.pdf", 5000).path);
    const two = await addOne(opened, studentFile("ead.jpg", CHUNK + 1).path);
    const replies = JSON.stringify([one, two, await opened.list(), await opened.versions(two.id)]);

    expect(existsSync(join(folder, "keys.bin"))).toBe(true);
    const keys = kept.draws.filter((draw) => draw.length === 32);
    expect(keys.length).toBeGreaterThanOrEqual(3);
    const onDisk = [...filesUnder(folder).values()];
    for (const key of keys) {
      for (const form of keyForms(key)) {
        for (const bytes of onDisk) expect(bytes.includes(form)).toBe(false);
        expect(replies.includes(form.toString("latin1"))).toBe(false);
      }
    }
    // Exactly one key is ever given to the keychain, and it is D: the rest are F.
    const wrappedKeys = keys.filter((key) =>
      keychain.wrapped.some((text) => keyForms(key).some((form) => text.includes(form.toString()))),
    );
    expect(wrappedKeys).toHaveLength(1);
  });

  it("refuses a keys.bin the keychain cannot open, and keeps it", async () => {
    // Contract refusal: "cannot_decrypt: keys.bin cannot be read with the keychain's key";
    // "keychain_unavailable: safeStorage cannot unwrap or wrap the document key".
    const first = await open();
    await addOne(first, studentFile("i20.pdf", 100).path);
    const keys = readFileSync(join(folder, "keys.bin"));
    const other = await open({ cipher: fakeKeychain().cipher });
    expect(await other.list()).toMatchObject({ ok: false, refused: "cannot_decrypt" });
    expect(readFileSync(join(folder, "keys.bin"))).toEqual(keys);

    const locked = await open({ cipher: { ...fakeKeychain().cipher, available: () => false } });
    expect(await locked.list()).toMatchObject({ ok: false, refused: "keychain_unavailable" });
    expect(readFileSync(join(folder, "keys.bin"))).toEqual(keys);
  });
});

describe("the files (SPEC-W2 point 15)", () => {
  it("round trips files on both sides of every chunk edge", async () => {
    // AES-256-GCM in 1 MiB chunks. Sizes: 1 byte; 1 MiB - 1 (1048575); 1 MiB (1048576, one
    // full chunk); 1 MiB + 1 (1048577, a second chunk of one byte); 2 MiB + 12345 (2109497,
    // three chunks). Fails on a chunk lost, repeated or cut at an edge. The encrypted file
    // never holds a run of the plain bytes.
    const opened = await open();
    for (const size of [1, CHUNK - 1, CHUNK, CHUNK + 1, 2 * CHUNK + 12345]) {
      const file = studentFile(`scan-${size}.pdf`, size);
      const document = await addOne(opened, file.path);
      expect(document).toMatchObject({ name: `scan-${size}.pdf`, size, added_on: TODAY });
      const back = await opened.read(document.id);
      expect(back.ok).toBe(true);
      expect((back as { bytes: Buffer }).bytes.equals(file.bytes)).toBe(true);
      const stored = readFileSync(join(folder, "files", document.id));
      if (size >= 64) expect(stored.includes(file.bytes.subarray(0, 64))).toBe(false);
    }
  });

  it("never moves or changes the student's own file", async () => {
    // Point 16: "The student's original file is never moved or deleted."
    const opened = await open();
    const file = studentFile("passport.jpg", 3000);
    const document = await addOne(opened, file.path);
    await opened.remove(document.id);
    await opened.delete(document.id);
    expect(readFileSync(file.path)).toEqual(file.bytes);
  });

  describe("a reordered, dropped or cut chunk fails and is reported, never opened", () => {
    // documents-1 section 3: "A file begins with a header. Then come its chunks." With the
    // chunk's ciphertext and its own overhead (tag, and anything else per chunk) the same T
    // bytes for every chunk, the layout is found from two files: one of 1 byte, one of exactly
    // 3 MiB (three full chunks). Sizes: e1 = H + 1 + T and e3 = H + 3 * CHUNK + 3 * T, so
    // T = (e3 - e1 - 3 * CHUNK + 1) / 2 and H = e1 - 1 - T.
    // Fails if the store opens any of the changed files, or gives back part of one.
    let opened: Store;
    let id: string;
    let original: Buffer;
    let header: number;
    let unit: number;

    beforeEach(async () => {
      opened = await open();
      const small = await addOne(opened, studentFile("small.pdf", 1).path);
      const big = await addOne(opened, studentFile("big.pdf", 3 * CHUNK).path);
      const e1 = readFileSync(join(folder, "files", small.id)).length;
      original = readFileSync(join(folder, "files", big.id));
      const overhead = (original.length - e1 - 3 * CHUNK + 1) / 2;
      expect(Number.isInteger(overhead)).toBe(true);
      expect(overhead).toBeGreaterThanOrEqual(16); // the GCM tag at least
      header = e1 - 1 - overhead;
      expect(header).toBeGreaterThanOrEqual(0);
      unit = CHUNK + overhead;
      expect(original.length).toBe(header + 3 * unit);
      id = big.id;
    });

    const chunk = (index: number) =>
      original.subarray(header + index * unit, header + (index + 1) * unit);
    const head = () => original.subarray(0, header);

    const changed: [string, () => Buffer][] = [
      ["chunks 0 and 1 swapped", () => Buffer.concat([head(), chunk(1), chunk(0), chunk(2)])],
      ["chunks 1 and 2 swapped", () => Buffer.concat([head(), chunk(0), chunk(2), chunk(1)])],
      ["the middle chunk dropped", () => Buffer.concat([head(), chunk(0), chunk(2)])],
      ["the last chunk dropped", () => Buffer.concat([head(), chunk(0), chunk(1)])],
      ["cut inside the last chunk", () => original.subarray(0, original.length - 100)],
      ["cut to the header", () => head()],
      ["one byte changed", () => Buffer.concat([head(), chunk(0), chunk(1), flip(chunk(2))])],
    ];

    for (const [what, make] of changed) {
      it(what, async () => {
        writeFileSync(join(folder, "files", id), make());
        const reply = await opened.read(id);
        expect(reply).toMatchObject({ ok: false, refused: "file_damaged" });
        expect(Object.hasOwn(reply, "bytes")).toBe(false);
        inContract("open", reply, "open_reply");
      });
    }
  });

  it("a crash in any step of an add leaves no row and no file", async () => {
    // Point 15: "Adding writes to .part, syncs, renames, decrypts back and compares the
    // SHA-256 before the index row is written; on any failure nothing half-added remains."
    // A throw in each step: the file is skipped as cannot_store, files/ holds only what was
    // there, and the same file adds cleanly after a relaunch (so it is not a duplicate).
    const kept = await addOne(await open(), studentFile("kept.pdf", 2000).path);
    for (const crashAt of ADD_STEPS) {
      const file = studentFile(`crash-${crashAt}.pdf`, CHUNK + 7);
      const crashing = await open({
        step: (name) => {
          if (name === crashAt) throw new Error(`crash at ${crashAt}`);
        },
      });
      const reply = await crashing.add([file.path]);
      inContract("add", reply, "add_reply");
      expect(reply).toMatchObject({
        ok: true,
        added: [],
        skipped: [{ name: `crash-${crashAt}.pdf`, refused: "cannot_store" }],
      });
      expect(readdirSync(join(folder, "files"))).toEqual([kept.id]);
      const relaunched = await open();
      expect((await listed(relaunched)).documents.map((one) => one.id)).toEqual([kept.id]);
      const again = await addOne(relaunched, file.path);
      await relaunched.remove(again.id);
      await relaunched.delete(again.id);
    }
  });

  it("removes at relaunch what a crash left in files/, and keeps every indexed file", async () => {
    // A crash kills the process, so no clean-up of the add runs: a .part and a renamed file
    // with no row are left. Opening the store again removes both. Fails if either stays, or
    // if a file the index names is touched.
    const opened = await open();
    const file = studentFile("i94.pdf", 4000);
    const kept = await addOne(opened, file.path);
    const orphan = randomBytes(16).toString("hex");
    writeFileSync(join(folder, "files", `${orphan}.part`), randomBytes(500));
    writeFileSync(join(folder, "files", orphan), randomBytes(500));
    const relaunched = await open();
    expect((await listed(relaunched)).documents.map((one) => one.id)).toEqual([kept.id]);
    expect(readdirSync(join(folder, "files"))).toEqual([kept.id]);
    const back = await relaunched.read(kept.id);
    expect(back.ok && back.bytes.equals(file.bytes)).toBe(true);
  });

  it("refuses a file over the size limit before reading it", async () => {
    // Duly's own limit, MAX_FILE_BYTES: one byte over is skipped as too_large. A sparse file,
    // so the test writes almost nothing.
    const opened = await open();
    const path = join(outside, "huge.pdf");
    writeFileSync(path, "");
    truncateSync(path, store.MAX_FILE_BYTES + 1);
    const reply = await opened.add([path]);
    inContract("add", reply, "add_reply");
    expect(reply).toMatchObject({
      ok: true,
      added: [],
      skipped: [{ name: "huge.pdf", refused: "too_large" }],
    });
  });
});

describe("the index (SPEC-W2 point 16)", () => {
  it("is written atomically: a failed write keeps the old index and leaves no file", async () => {
    // Point 16: "written atomically like case.bin". With a disk that fails every write of
    // documents.bin, an add is not made: the old index is byte for byte the same, no new file
    // is in files/, and a relaunch lists only the first document.
    const first = await addOne(await open(), studentFile("a.pdf", 900).path);
    const before = readFileSync(join(folder, "documents.bin"));
    const failing: Disk = {
      read: nodeDisk.read,
      write: (path, data) =>
        path.endsWith("documents.bin")
          ? Promise.reject(new Error("full"))
          : nodeDisk.write(path, data),
      remove: nodeDisk.remove,
    };
    const opened = await open({ disk: failing });
    const reply = await opened.add([studentFile("b.pdf", 900).path]);
    // Refused as cannot_store, or answered with the file skipped as cannot_store.
    expect(reply.ok ? reply.added : []).toEqual([]);
    expect(JSON.stringify(reply)).toContain('"cannot_store"');
    expect(readFileSync(join(folder, "documents.bin"))).toEqual(before);
    expect(readdirSync(join(folder, "files"))).toEqual([first.id]);
    const relaunched = await open();
    expect((await listed(relaunched)).documents.map((one) => one.id)).toEqual([first.id]);
    expect(readdirSync(folder).sort()).toEqual(["documents.bin", "files", "keys.bin"]);
  });

  it("refuses a bad index and keeps it, and touches no file while it is bad", async () => {
    // Point 16: "a bad index is refused and kept, never deleted". Contract: index_damaged,
    // "it is kept as it is, never deleted". Fails if documents.bin changes, or if an add,
    // a relaunch or a delete removes or writes anything.
    const first = await open();
    const document = await addOne(first, studentFile("a.pdf", 900).path);
    const bad = randomBytes(300);
    writeFileSync(join(folder, "documents.bin"), bad);
    const files = readdirSync(join(folder, "files"));

    const opened = await open();
    const replies = [
      ["list", await opened.list(), "list_reply"],
      ["add", await opened.add([studentFile("b.pdf", 900).path]), "add_reply"],
      ["remove", await opened.remove(document.id), "done_reply"],
      ["delete", await opened.delete(document.id), "done_reply"],
    ] as const;
    for (const [call, reply, define] of replies) {
      expect(reply).toMatchObject({ ok: false, refused: "index_damaged" });
      inContract(call, reply, define);
    }
    expect(readFileSync(join(folder, "documents.bin"))).toEqual(bad);
    expect(readdirSync(join(folder, "files"))).toEqual(files);
  });

  it("holds no name or date in the clear", async () => {
    const opened = await open();
    await addOne(opened, studentFile("I-20 Priya Sharma.pdf", 900).path);
    for (const name of ["documents.bin", "keys.bin"]) {
      const text = readFileSync(join(folder, name)).toString("latin1");
      expect(text).not.toContain("Priya");
      expect(text).not.toContain(TODAY);
    }
  });
});

describe("versions and nothing lost (SPEC-W2 point 17)", () => {
  it("chains a reissued document to the one it replaces, newest first", async () => {
    // Point 17: "A reissued I-20 is a new document that replaces the old one; the chain is
    // its versions, newest first." Three versions: first, second replaces first, third
    // replaces second. Asked from any of the three, the chain is third, second, first.
    const opened = await open();
    const first = await addOne(opened, studentFile("i20-2025.pdf", 900).path);
    const second = await addOne(opened, studentFile("i20-2026.pdf", 901).path, first.id);
    const third = await addOne(opened, studentFile("i20-travel.pdf", 902).path, second.id);
    expect([first.replaces ?? null, second.replaces, third.replaces]).toEqual([
      null,
      first.id,
      second.id,
    ]);
    for (const asked of [first, second, third]) {
      const reply = await opened.versions(asked.id);
      inContract("versions", reply, "versions_reply");
      const ids = ((reply as Reply).versions as Document[]).map((one) => one.id);
      expect(ids).toEqual([third.id, second.id, first.id]);
    }
  });

  it("refuses a replaces that names itself, an unknown document, or makes a loop", async () => {
    // Contract: "bad_replaces: replaces names the document itself, an unknown document, or
    // would make the chain loop." first <- second; first replacing second would loop.
    const opened = await open();
    const first = await addOne(opened, studentFile("a.pdf", 900).path);
    const second = await addOne(opened, studentFile("b.pdf", 901).path, first.id);
    for (const replaces of [first.id, second.id, "0".repeat(32)]) {
      const reply = await opened.update(first.id, { replaces });
      expect(reply).toMatchObject({ ok: false, refused: "bad_replaces" });
      inContract("update", reply, "update_reply");
    }
    const unknown = await opened.add([studentFile("c.pdf", 902).path], "f".repeat(32));
    expect(unknown).toMatchObject({ ok: false, refused: "bad_replaces" });
  });

  it("remove moves to Removed, put back returns it, and both are in the history", async () => {
    const opened = await open({ today: () => TODAY });
    const document = await addOne(opened, studentFile("ead.pdf", 900).path);
    const removed = await opened.remove(document.id);
    inContract("remove", removed, "done_reply");
    let seen = await listed(opened);
    expect(seen.documents).toMatchObject([{ id: document.id, removed: true, removed_on: TODAY }]);
    expect(seen.history[0]).toEqual({ on: TODAY, event: "removed", document: document.id });
    expect((await opened.read(document.id)).ok).toBe(true);

    const restored = await opened.restore(document.id);
    inContract("restore", restored, "done_reply");
    seen = await listed(opened);
    expect(seen.documents[0]?.removed).toBe(false);
    expect(Object.hasOwn(seen.documents[0] ?? {}, "removed_on")).toBe(false);
    expect(seen.history[0]).toEqual({ on: TODAY, event: "restored", document: document.id });
  });

  it("deletes for good only from Removed", async () => {
    // Contract: "not_in_removed: delete was asked for a document not in Removed";
    // "unknown_document: no document has this id".
    const opened = await open();
    const document = await addOne(opened, studentFile("ead.pdf", 900).path);
    expect(await opened.delete(document.id)).toMatchObject({
      ok: false,
      refused: "not_in_removed",
    });
    expect(existsSync(join(folder, "files", document.id))).toBe(true);
    for (const call of ["remove", "restore", "delete", "versions", "read"] as const) {
      const reply = await opened[call]("e".repeat(32));
      expect(reply).toMatchObject({ ok: false, refused: "unknown_document" });
    }
  });

  it("delete for good destroys the file and its key, and history keeps no name or id", async () => {
    // Point 17: "Delete for good destroys F and the file"; history keeps "A document was
    // deleted for good" without its name. Contract history_line: "when a document is deleted
    // for good, main takes its id off every line". Fails if the file stays, the document can
    // still be read, or its name or id is anywhere in what list gives.
    const opened = await open();
    const kept = await addOne(opened, studentFile("passport.jpg", 800).path);
    const gone = await addOne(opened, studentFile("Priya old visa.pdf", 900).path);
    await opened.update(gone.id, { label: "Old visa of Priya" });
    await opened.remove(gone.id);
    const reply = await opened.delete(gone.id);
    expect(reply).toEqual({ ok: true });
    inContract("delete", reply, "done_reply");

    expect(existsSync(join(folder, "files", gone.id))).toBe(false);
    expect(await opened.read(gone.id)).toMatchObject({ ok: false, refused: "unknown_document" });
    const seen = await listed(opened);
    expect(seen.documents.map((one) => one.id)).toEqual([kept.id]);
    expect(seen.history[0]).toEqual({ on: TODAY, event: "deleted" });
    const words = JSON.stringify(seen);
    expect(words).not.toContain(gone.id);
    expect(words).not.toContain("Priya");
    // The same after a relaunch, read back from documents.bin.
    const relaunched = JSON.stringify(await listed(await open()));
    expect(relaunched).not.toContain(gone.id);
    expect(relaunched).not.toContain("Priya");
  });

  it("clear deletes files/, documents.bin and keys.bin", async () => {
    // Contract clear_call: "Deletes files/, documents.bin and keys.bin." The student's own
    // file stays where it was.
    const opened = await open();
    const file = studentFile("i20.pdf", 900);
    await addOne(opened, file.path);
    const reply = await opened.clear();
    expect(reply).toEqual({ ok: true });
    inContract("clear", reply, "done_reply");
    for (const name of ["files", "documents.bin", "keys.bin"]) {
      expect(existsSync(join(folder, name))).toBe(false);
    }
    expect(readFileSync(file.path)).toEqual(file.bytes);
  });
});

function flip(bytes: Buffer): Buffer {
  const copy = Buffer.from(bytes);
  copy[100] = (copy[100] ?? 0) ^ 0xff;
  return copy;
}
