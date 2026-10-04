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
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
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

// The W2-P4 review (reviews/w2-p4.md) and DECISIONS.md D96, which amends SPEC-W2 points 16
// and 17 and contracts/desktop_documents_bridge.schema.json (2d46965). Each test names its
// finding. Written before the fixes: these cannot pass yet.
//
// Two layouts the SPEC leaves open are read here as docstore.ts writes them today, so a test
// can plant an index at a limit and open a chunk by hand. If either moves, the test fails at
// the helper, loudly, never quietly:
// - documents.bin: a 12-byte nonce, the GCM tag, then the index JSON under D, with
//   "duly documents.bin v1" as additional data; the JSON holds rows (each with its document)
//   and history.
// - a chunk's additional data: the document id in latin1, the chunk index as a UInt32BE and
//   one byte, 1 for the last chunk and 0 for any other. Point 15 names the three; their bytes
//   are not in the SPEC (see disputes in tests/REPORT.json).

const INDEX_AAD = Buffer.from("duly documents.bin v1");

interface PlantedIndex {
  rows: { document: Document }[];
  history: HistoryLine[];
}

/** D: the one 32-byte draw the keychain was asked to wrap. */
function documentKey(draws: readonly Buffer[]): Buffer {
  const wrapped = draws.filter(
    (draw) =>
      draw.length === 32 &&
      keychain.wrapped.some((text) =>
        keyForms(draw).some((form) => text.includes(form.toString())),
      ),
  );
  expect(wrapped).toHaveLength(1);
  return wrapped[0] as Buffer;
}

function openIndex(key: Buffer): PlantedIndex {
  const bytes = readFileSync(join(folder, "documents.bin"));
  const aes = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
  aes.setAAD(INDEX_AAD);
  aes.setAuthTag(bytes.subarray(12, 28));
  const text = Buffer.concat([aes.update(bytes.subarray(28)), aes.final()]).toString("utf8");
  const index = JSON.parse(text) as PlantedIndex;
  expect(Array.isArray(index.rows) && Array.isArray(index.history)).toBe(true);
  return index;
}

function plantIndex(key: Buffer, index: PlantedIndex): void {
  const nonce = randomBytes(12);
  const aes = createCipheriv("aes-256-gcm", key, nonce);
  aes.setAAD(INDEX_AAD);
  const body = Buffer.concat([aes.update(JSON.stringify(index), "utf8"), aes.final()]);
  writeFileSync(join(folder, "documents.bin"), Buffer.concat([nonce, aes.getAuthTag(), body]));
}

/** Point 15's nonce: the file's 64-bit prefix, then the 32-bit chunk counter. */
function chunkNonce(prefix: Buffer, counter: number): Buffer {
  const nonce = Buffer.alloc(12);
  prefix.copy(nonce, 0, 0, 8);
  nonce.writeUInt32BE(counter, 8);
  return nonce;
}

/** Point 15's additional data: the document id, the chunk index and the last-chunk flag. */
function chunkData(id: string, index: number, last: boolean): Buffer {
  const data = Buffer.alloc(id.length + 5);
  data.write(id, 0, "latin1");
  data.writeUInt32BE(index, id.length);
  data.writeUInt8(last ? 1 : 0, id.length + 4);
  return data;
}

/** One chunk opened by hand, or null when GCM refuses it. */
function openChunk(
  key: Buffer,
  nonce: Buffer,
  data: Buffer,
  sealed: Buffer, // the chunk's ciphertext, then its 16-byte tag
): Buffer | null {
  try {
    const aes = createDecipheriv("aes-256-gcm", key, nonce);
    aes.setAAD(data);
    aes.setAuthTag(sealed.subarray(sealed.length - 16));
    return Buffer.concat([aes.update(sealed.subarray(0, sealed.length - 16)), aes.final()]);
  } catch {
    return null;
  }
}

/** A whole file in point 15's layout: the prefix, then each chunk's ciphertext and tag. */
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

/** The documents.bin bytes and every file in files/, to show that nothing changed. */
function snapshot(): { index: Buffer | null; files: Map<string, Buffer> } {
  const indexPath = join(folder, "documents.bin");
  return {
    index: existsSync(indexPath) ? readFileSync(indexPath) : null,
    files: existsSync(join(folder, "files")) ? filesUnder(join(folder, "files")) : new Map(),
  };
}

describe("the W2-P4 review's findings on the store (reviews/w2-p4.md, D96)", () => {
  it("review_w2p4_1: a missing documents.bin is index_missing and deletes no file", async () => {
    // Finding 1 (blocking): two documents added, documents.bin moved out of the folder with
    // keys.bin kept, then a relaunch: the launch sweep deleted both files ("files before: 2",
    // "after relaunch: 0"). Point 16 as D96 amends it: "a missing documents.bin while keys.bin
    // or a file in files/ remains is refused as index_missing, and nothing is read, written or
    // deleted". Contract refusal index_missing. Fails if a relaunch deletes either file, if
    // list, add or open answers anything but index_missing, or if a new documents.bin is made.
    // With documents.bin put back, both open with their own bytes: nothing was lost.
    const first = await open();
    const one = studentFile("i20.pdf", 900);
    const two = studentFile("passport.jpg", CHUNK + 3);
    const a = await addOne(first, one.path);
    const b = await addOne(first, two.path);
    const files = filesUnder(join(folder, "files"));
    expect([...files.keys()].sort()).toEqual([a.id, b.id].sort());
    const keys = readFileSync(join(folder, "keys.bin"));
    const away = join(outside, "documents.bin");
    renameSync(join(folder, "documents.bin"), away);

    for (let launch = 0; launch < 2; launch += 1) {
      const relaunched = await open();
      const list = await relaunched.list();
      expect(list).toMatchObject({ ok: false, refused: "index_missing" });
      inContract("list", list, "list_reply");
      const added = await relaunched.add([studentFile(`new-${launch}.pdf`, 700).path]);
      expect(added).toMatchObject({ ok: false, refused: "index_missing" });
      inContract("add", added, "add_reply");
      const opened = await relaunched.read(a.id);
      expect(opened).toMatchObject({ ok: false, refused: "index_missing" });
      inContract("open", opened, "open_reply");

      expect(filesUnder(join(folder, "files"))).toEqual(files);
      expect(readFileSync(join(folder, "keys.bin"))).toEqual(keys);
      expect(existsSync(join(folder, "documents.bin"))).toBe(false);
    }

    renameSync(away, join(folder, "documents.bin"));
    const restored = await open();
    for (const [document, file] of [
      [a, one],
      [b, two],
    ] as const) {
      const back = await restored.read(document.id);
      expect(back.ok && back.bytes.equals(file.bytes)).toBe(true);
    }
  });

  it("review_w2p4_1: with nothing stored at all, a first launch still lists and adds", async () => {
    // Finding 1's fix must not lock out a new student: no keys.bin, no documents.bin and no
    // files/ is a first launch, not a missing index. Fails if it is refused as index_missing.
    expect(readdirSync(folder)).toEqual([]);
    const opened = await open();
    expect(await listed(opened)).toMatchObject({ documents: [], history: [] });
    const document = await addOne(opened, studentFile("i20.pdf", 900).path);
    expect((await listed(await open())).documents.map((one) => one.id)).toEqual([document.id]);
  });

  it("review_w2p4_2: a second document replacing the same one is bad_replaces", async () => {
    // Finding 2: update(c, {replaces: old}) when b already replaces old made a fork, and
    // versions() then dropped c. Point 17 as D96 amends it: "a chain stays a single line (a
    // second document replacing the same one ... is bad_replaces)". Contract bad_replaces: "a
    // document another document already replaces". Fails if the update is answered ok, or if
    // versions(old) is anything but b then old, or if c changes.
    const opened = await open();
    const old = await addOne(opened, studentFile("i20-2025.pdf", 900).path);
    const b = await addOne(opened, studentFile("i20-2026.pdf", 901).path, old.id);
    const c = await addOne(opened, studentFile("i20-travel.pdf", 902).path);
    const before = snapshot();

    const reply = await opened.update(c.id, { replaces: old.id });
    expect(reply).toMatchObject({ ok: false, refused: "bad_replaces" });
    inContract("update", reply, "update_reply");

    const versions = await opened.versions(old.id);
    inContract("versions", versions, "versions_reply");
    expect(((versions as Reply).versions as Document[]).map((one) => one.id)).toEqual([
      b.id,
      old.id,
    ]);
    const cNow = (await listed(opened)).documents.find((one) => one.id === c.id);
    expect(cNow?.replaces ?? null).toBeNull();
    expect(snapshot()).toEqual(before);
  });

  it("review_w2p4_2: a chain at 200 versions refuses the 201st as bad_replaces", async () => {
    // Finding 5 (a chain of 201 versions breaks versions maxItems 200) and D96: "so is a
    // chain past 200 versions". 200 real adds, each replacing the one before: versions gives
    // all 200 inside the contract. A 201st, by add with replaces and by update of a document
    // on its own, is bad_replaces and nothing changes. Hand count: 1 first + 199 replacing = 200.
    const opened = await open();
    let head = await addOne(opened, studentFile("v-1.pdf", 64).path);
    for (let at = 2; at <= 200; at += 1) {
      head = await addOne(opened, studentFile(`v-${at}.pdf`, 64).path, head.id);
    }
    const chain = await opened.versions(head.id);
    inContract("versions", chain, "versions_reply");
    expect((chain as Reply).versions).toHaveLength(200);
    const alone = await addOne(opened, studentFile("alone.pdf", 64).path);
    const before = snapshot();

    const byAdd = await opened.add([studentFile("v-201.pdf", 64).path], head.id);
    expect(byAdd).toMatchObject({ ok: false, refused: "bad_replaces" });
    inContract("add", byAdd, "add_reply");
    const byUpdate = await opened.update(alone.id, { replaces: head.id });
    expect(byUpdate).toMatchObject({ ok: false, refused: "bad_replaces" });
    inContract("update", byUpdate, "update_reply");

    expect(snapshot()).toEqual(before);
    expect(((await opened.versions(head.id)) as Reply).versions).toHaveLength(200);
  }, 120_000);

  it("review_w2p4_5: an index of 20000 history lines keeps the newest 20000", async () => {
    // Finding 5: with 20001 history lines every list was "not a documents bridge reply", so
    // Documents was dead from then on. D96 and the contract's list_reply history: "The index
    // keeps the newest 20000 lines; older lines are dropped as new ones are written."
    // Planted: 20000 exported lines, newest first, line k (k = 0 newest) with count k + 1.
    // One more event (a remove) makes 20001; the oldest, count 20000, is dropped. Working:
    // history[0] is the remove, history[1] count 1, history[19999] count 19999. Fails if list
    // is refused or outside the contract, or the lines are not the newest, newest first.
    const kept = keptRandom();
    const first = await open({ random: kept.random });
    const document = await addOne(first, studentFile("ead.pdf", 900).path);
    const key = documentKey(kept.draws);
    const index = openIndex(key);
    index.history = Array.from({ length: 20000 }, (_, k) => ({
      on: TODAY,
      event: "exported",
      count: k + 1,
    }));
    plantIndex(key, index);

    const opened = await open();
    expect((await listed(opened)).history).toHaveLength(20000);
    inContract("remove", await opened.remove(document.id), "done_reply");
    for (const seen of [await listed(opened), await listed(await open())]) {
      expect(seen.history).toHaveLength(20000);
      expect(seen.history[0]).toEqual({ on: TODAY, event: "removed", document: document.id });
      expect(seen.history[1]).toEqual({ on: TODAY, event: "exported", count: 1 });
      expect(seen.history[19999]).toEqual({ on: TODAY, event: "exported", count: 19999 });
    }
  }, 120_000);

  it("review_w2p4_5: with 5000 documents held, add is store_full and nothing changes", async () => {
    // Finding 5 (at 5001 documents list is outside list_reply documents maxItems 5000) and
    // D96: "the store at most 5000 documents". Contract store_full: "nothing is added".
    // Planted: the one real row and 4999 copies under other ids, 5000 in all. Fails if the
    // add is answered ok, if documents.bin or files/ change, or if list stops answering.
    const kept = keptRandom();
    const first = await open({ random: kept.random });
    await addOne(first, studentFile("i20.pdf", 900).path);
    const key = documentKey(kept.draws);
    const index = openIndex(key);
    const row = index.rows[0] as { document: Document };
    index.rows = Array.from({ length: 5000 }, (_, k) =>
      k === 0
        ? row
        : { ...row, document: { ...row.document, id: k.toString(16).padStart(32, "0") } },
    );
    plantIndex(key, index);

    const opened = await open();
    expect((await listed(opened)).documents).toHaveLength(5000);
    const before = snapshot();
    const reply = await opened.add([studentFile("one-more.pdf", 900).path]);
    expect(reply).toMatchObject({ ok: false, refused: "store_full" });
    inContract("add", reply, "add_reply");
    expect(snapshot()).toEqual(before);
    expect((await listed(await open())).documents).toHaveLength(5000);
  }, 120_000);

  it("review_w2p4_6: each chunk has its own nonce and opens only as its own chunk", async () => {
    // Finding 6: mutants M3 (one nonce for every chunk), M1 (last-chunk flag dropped) and M2
    // (chunk index out of the additional data) passed every test, since the whole-file SHA-256
    // caught each fault first. Point 15: "each chunk's nonce a random 64-bit file prefix plus a
    // 32-bit counter, with the document id, chunk index and a last-chunk flag as additional
    // data". The file: chunk 0 and chunk 1 the same 1 MiB of bytes, then 4321 of them again,
    // so 3 chunks; size 8 + 2 * (1048576 + 16) + 4321 + 16 = 2101529.
    // - Nonces differ: under one key and nonce, the same bytes give the same ciphertext. Two
    //   different nonces agree on about 1 byte in 256 (4096 of 1048576; 17 of 4321); the test
    //   allows 1 in 64 (16384; 540). Fails on M3.
    // - Each chunk opens with its own counter, index and flag, and with no other. Fails on M1,
    //   M2 and M3.
    const kept = keptRandom();
    const opened = await open({ random: kept.random });
    const same = randomBytes(CHUNK);
    const plain = Buffer.concat([same, same, same.subarray(0, 4321)]);
    const path = join(outside, "three-chunks.pdf");
    writeFileSync(path, plain);
    const document = await addOne(opened, path);
    const stored = readFileSync(join(folder, "files", document.id));
    expect(stored.length).toBe(8 + 2 * (CHUNK + 16) + 4321 + 16);

    const d = documentKey(kept.draws);
    const fileKeys = kept.draws.filter((draw) => draw.length === 32 && !draw.equals(d));
    expect(fileKeys).toHaveLength(1);
    const f = fileKeys[0] as Buffer;
    const prefix = stored.subarray(0, 8);
    expect(kept.draws.some((draw) => draw.length === 8 && draw.equals(prefix))).toBe(true);
    const sealed = [
      stored.subarray(8, 8 + CHUNK + 16),
      stored.subarray(8 + CHUNK + 16, 8 + 2 * (CHUNK + 16)),
      stored.subarray(8 + 2 * (CHUNK + 16)),
    ];
    const plainChunks = [same, same, same.subarray(0, 4321)];

    const agree = (x: Buffer, y: Buffer): number => {
      let count = 0;
      for (let at = 0; at < Math.min(x.length, y.length); at += 1) if (x[at] === y[at]) count += 1;
      return count;
    };
    const body = (index: number) => (sealed[index] as Buffer).subarray(0, -16);
    expect(agree(body(0), body(1))).toBeLessThan(CHUNK / 64);
    expect(agree(body(0), body(2))).toBeLessThan(4321 / 8);
    expect(agree(body(1), body(2))).toBeLessThan(4321 / 8);

    for (let index = 0; index < 3; index += 1) {
      const last = index === 2;
      const own = sealed[index] as Buffer;
      const back = openChunk(
        f,
        chunkNonce(prefix, index),
        chunkData(document.id, index, last),
        own,
      );
      expect(back?.equals(plainChunks[index] as Buffer)).toBe(true);
      for (const other of [0, 1, 2].filter((one) => one !== index)) {
        const data = chunkData(document.id, index, last);
        expect(openChunk(f, chunkNonce(prefix, other), data, own)).toBeNull();
        const wrongIndex = chunkData(document.id, other, last);
        expect(openChunk(f, chunkNonce(prefix, index), wrongIndex, own)).toBeNull();
      }
      const wrongFlag = chunkData(document.id, index, !last);
      expect(openChunk(f, chunkNonce(prefix, index), wrongFlag, own)).toBeNull();
    }
  });

  it("review_w2p4_7: a file that reads back as other bytes is skipped, nothing kept", async () => {
    // Finding 7: mutant M6, the decrypt-back and SHA-256 comparison of an add removed, passed
    // every test, since the crash test throws in step() and never reaches it. Point 15:
    // "decrypts back and compares the SHA-256 before the index row is written; on any failure
    // nothing half-added remains". After the rename, the stored file is put in place as
    // (1) a whole, valid encryption of other bytes of the same length under the same F,
    // prefix and id, so GCM passes and only the SHA-256 differs, and (2) the same with one
    // byte changed, so GCM fails. Each: skipped as cannot_store, files/ and documents.bin as
    // before. Fails on M6, or on a check of GCM alone for (1).
    const kept = keptRandom();
    const held = await addOne(await open({ random: kept.random }), studentFile("a.pdf", 900).path);
    const d = documentKey(kept.draws);
    for (const how of ["other bytes", "one byte changed"]) {
      const before = snapshot();
      const file = studentFile(`b ${how}.pdf`, CHUNK + 5);
      const crooked = await open({
        random: kept.random,
        step: (name) => {
          if (name !== "renamed") return;
          const id = readdirSync(join(folder, "files")).find(
            (one) => one !== held.id && !one.endsWith(".part"),
          ) as string;
          const target = join(folder, "files", id);
          const f = [...kept.draws].reverse().find((draw) => draw.length === 32 && !draw.equals(d));
          const prefix = readFileSync(target).subarray(0, 8);
          const other = sealFile(id, f as Buffer, prefix, randomBytes(file.bytes.length));
          writeFileSync(target, how === "other bytes" ? other : flip(other));
        },
      });
      const reply = await crooked.add([file.path]);
      inContract("add", reply, "add_reply");
      expect(reply).toMatchObject({
        ok: true,
        added: [],
        skipped: [{ name: `b ${how}.pdf`, refused: "cannot_store" }],
      });
      expect(snapshot()).toEqual(before);
      expect((await listed(await open())).documents.map((one) => one.id)).toEqual([held.id]);
    }
  });

  it("review_w2p4_7: a file over the size limit is too_large without being read", async () => {
    // Finding 7: mutant M17, the size check from stat removed, passed "refuses a file over the
    // size limit before reading it", since the check after reading caught the same file. Here
    // the file is MAX_FILE_BYTES + 1 (sparse) and nobody may read it (mode 000), so only a
    // check made before reading can name it too_large; a read gives cannot_store. Fails on M17.
    const opened = await open();
    const path = join(outside, "huge.pdf");
    writeFileSync(path, "");
    truncateSync(path, store.MAX_FILE_BYTES + 1);
    chmodSync(path, 0o000);
    try {
      const reply = await opened.add([path]);
      inContract("add", reply, "add_reply");
      expect(reply).toMatchObject({
        ok: true,
        added: [],
        skipped: [{ name: "huge.pdf", refused: "too_large" }],
      });
    } finally {
      chmodSync(path, 0o600);
    }
  });

  it("review_w2p4_10: an empty file is skipped as empty", async () => {
    // Finding 10 (an empty image could not be opened inside the contract) and D96: "an empty
    // file is skipped". Contract skipped refused empty: "the file holds no bytes". Fails if
    // it is added, or anything for it is left in files/ or the index.
    const opened = await open();
    const held = await addOne(opened, studentFile("a.pdf", 900).path);
    const before = snapshot();
    const reply = await opened.add([studentFile("empty.png", 0).path]);
    inContract("add", reply, "add_reply");
    expect(reply).toMatchObject({
      ok: true,
      added: [],
      skipped: [{ name: "empty.png", refused: "empty" }],
    });
    expect(snapshot()).toEqual(before);
    expect((await listed(opened)).documents.map((one) => one.id)).toEqual([held.id]);
  });
});

// The second W2-P4 review (reviews/w2-p4.md, run l-review-5f14d86b05) and the contract as of
// 444fa86: index_missing only when a file in files/ would lose its name ("keys.bin with no file
// in files/ is not index_missing: no document can be lost, so a new empty index is written"),
// and store_full counts only the files an add would store. Each test names its finding. Written
// before the fixes: these cannot pass yet.

/** 4999 or 5000 documents: the one real row, then copies of it under other ids. */
function plantRows(key: Buffer, count: number): void {
  const index = openIndex(key);
  const row = index.rows[0] as { document: Document };
  index.rows = Array.from({ length: count }, (_, k) =>
    k === 0 ? row : { ...row, document: { ...row.document, id: k.toString(16).padStart(32, "0") } },
  );
  plantIndex(key, index);
}

/** After a relaunch: list answers ok with no documents, and a new add stores a file. */
async function startsEmpty(): Promise<void> {
  const relaunched = await open();
  expect((await listed(relaunched)).documents).toEqual([]);
  const file = studentFile("i20.pdf", 900);
  const document = await addOne(relaunched, file.path);
  const again = await open();
  expect((await listed(again)).documents.map((one) => one.id)).toEqual([document.id]);
  const back = await again.read(document.id);
  expect(back.ok && back.bytes.equals(file.bytes)).toBe(true);
}

describe("the second W2-P4 review's findings on the store (reviews/w2-p4.md, 444fa86)", () => {
  // Finding 1 (blocking): a new student's first add stored nothing, but load had written
  // keys.bin and no documents.bin was written, so every later launch was index_missing (N1).
  // Point 16 as D96 amends it and the contract: keys.bin with no file in files/ is not
  // index_missing. Each fails while keys.bin alone after a relaunch is refused.
  const firsts: [string, string, string, () => string][] = [
    ["one empty file", "empty.pdf", "empty", () => studentFile("empty.pdf", 0).path],
    [
      "one folder",
      "scans",
      "not_a_file",
      () => {
        const path = join(outside, "scans");
        mkdirSync(path);
        return path;
      },
    ],
    [
      "one file over the size limit",
      "huge.pdf",
      "too_large",
      () => {
        const path = join(outside, "huge.pdf");
        writeFileSync(path, "");
        truncateSync(path, store.MAX_FILE_BYTES + 1);
        return path;
      },
    ],
  ];
  for (const [what, name, refused, make] of firsts) {
    it(`review2_w2p4_1: a first add of ${what} is skipped and Documents opens after a relaunch`, async () => {
      expect(readdirSync(folder)).toEqual([]);
      const reply = await (await open()).add([make()]);
      inContract("add", reply, "add_reply");
      expect(reply).toMatchObject({ ok: true, added: [], skipped: [{ name, refused }] });
      await startsEmpty();
    });
  }

  it("review2_w2p4_1: a first add whose index write fails once stores nothing, and Duly relaunches", async () => {
    // Finding 1, N2: the first write of documents.bin throws once, so the add stores nothing
    // (the file skipped as cannot_store, or the add refused as cannot_store: "the index or a
    // file could not be written"), and files/ holds nothing half added. Then a relaunch with a
    // working disk lists no documents and adds. Fails while that relaunch is index_missing.
    let failed = false;
    const failsOnce: Disk = {
      read: nodeDisk.read,
      write: (path, data) => {
        if (failed || !path.endsWith("documents.bin")) return nodeDisk.write(path, data);
        failed = true;
        return Promise.reject(new Error("full"));
      },
      remove: nodeDisk.remove,
    };
    const reply = await (await open({ disk: failsOnce })).add([studentFile("a.pdf", 900).path]);
    inContract("add", reply, "add_reply");
    expect(failed).toBe(true);
    expect(reply.ok ? reply.added : []).toEqual([]);
    expect(JSON.stringify(reply)).toContain('"cannot_store"');
    const files = join(folder, "files");
    expect(existsSync(files) ? readdirSync(files) : []).toEqual([]);
    await startsEmpty();
  });

  it("review2_w2p4_4: a file in files/ with no documents.bin and no keys.bin is index_missing", async () => {
    // Finding 4, N1b: index_missing checked only with keys.bin present survived every test.
    // Contract: "index_missing: documents.bin is missing while a file in files/ is there ...
    // nothing is read, written or deleted". The file stays byte for byte, and neither
    // documents.bin nor keys.bin is made. (With keys.bin kept: review_w2p4_1 above.)
    const a = await addOne(await open(), studentFile("i20.pdf", 900).path);
    rmSync(join(folder, "documents.bin"));
    rmSync(join(folder, "keys.bin"));
    const files = filesUnder(join(folder, "files"));
    expect([...files.keys()]).toEqual([a.id]);

    const relaunched = await open();
    const replies = [
      ["list", await relaunched.list(), "list_reply"],
      ["add", await relaunched.add([studentFile("b.pdf", 700).path]), "add_reply"],
      ["open", await relaunched.read(a.id), "open_reply"],
    ] as const;
    for (const [call, reply, define] of replies) {
      expect(reply).toMatchObject({ ok: false, refused: "index_missing" });
      inContract(call, reply, define);
    }
    expect(filesUnder(join(folder, "files"))).toEqual(files);
    expect(readdirSync(folder)).toEqual(["files"]);
  });

  it("review2_w2p4_4: keys.bin with no file in files/ and no documents.bin starts an empty index", async () => {
    // Finding 4, N1c, and the contract as of 444fa86: "keys.bin with no file in files/ is not
    // index_missing: no document can be lost, so a new empty index is written". A document
    // added, removed and deleted for good leaves files/ empty; then documents.bin goes. Once
    // with files/ empty and once with files/ gone: list answers ok with no documents, a
    // documents.bin is written, and a new add stores a file. Fails if either is index_missing.
    for (const filesGone of [false, true]) {
      const opened = await open();
      const gone = await addOne(opened, studentFile(`gone-${filesGone}.pdf`, 900).path);
      await opened.remove(gone.id);
      expect(await opened.delete(gone.id)).toEqual({ ok: true });
      expect(readdirSync(join(folder, "files"))).toEqual([]);
      rmSync(join(folder, "documents.bin"));
      if (filesGone) rmSync(join(folder, "files"), { recursive: true });

      const relaunched = await open();
      expect((await listed(relaunched)).documents).toEqual([]);
      expect(existsSync(join(folder, "documents.bin"))).toBe(true);
      const kept = await addOne(relaunched, studentFile(`kept-${filesGone}.pdf`, 901).path);
      expect((await listed(await open())).documents.map((one) => one.id)).toEqual([kept.id]);
      await relaunched.clear();
    }
  });

  it("review2_w2p4_4: update keeps the 200 cap on a document that already has newer versions", async () => {
    // Finding 4, N4c: counting only the document itself above the join (above = 1) survived,
    // since every update test joined a document with nothing newer. Point 17 as D96 amends it:
    // a chain past 200 versions is bad_replaces. Two chains by real adds: x1 <- ... <- x150
    // and y1 <- ... <- y51 (y51 newest). Working:
    // - update(y1, replaces x150): y1 and the 50 above it (y2 to y51) are 51, x150 to x1 are
    //   150; 51 + 150 = 201 > 200: bad_replaces, nothing changes. With N4c: 1 + 150 = 151, ok.
    // - update(y2, replaces x150): y2 to y51 are 50; 50 + 150 = 200, the cap itself: ok, and
    //   versions(y51) is y51 down to y2, then x150 down to x1, 200 in all.
    const opened = await open();
    const chainOf = async (tag: string, length: number): Promise<Document[]> => {
      const made = [await addOne(opened, studentFile(`${tag}-1.pdf`, 64).path)];
      for (let at = 2; at <= length; at += 1) {
        const below = made[made.length - 1] as Document;
        made.push(await addOne(opened, studentFile(`${tag}-${at}.pdf`, 64).path, below.id));
      }
      return made;
    };
    const x = await chainOf("x", 150);
    const y = await chainOf("y", 51);
    const x150 = x[149] as Document;
    const before = snapshot();

    const over = await opened.update((y[0] as Document).id, { replaces: x150.id });
    expect(over).toMatchObject({ ok: false, refused: "bad_replaces" });
    inContract("update", over, "update_reply");
    expect(snapshot()).toEqual(before);

    const atCap = await opened.update((y[1] as Document).id, { replaces: x150.id });
    inContract("update", atCap, "update_reply");
    expect(atCap.ok).toBe(true);
    const chain = await opened.versions((y[50] as Document).id);
    inContract("versions", chain, "versions_reply");
    const ids = ((chain as Reply).versions as Document[]).map((one) => one.id);
    const expected = [...y.slice(1).reverse(), ...[...x].reverse()].map((one) => one.id);
    expect(expected).toHaveLength(200);
    expect(ids).toEqual(expected);
  }, 120_000);

  it("review2_w2p4_3: with 4999 held, a new file beside a duplicate is stored and makes 5000", async () => {
    // Finding 3 (S1): add([new.pdf, a duplicate]) at 4999 was store_full, since the store
    // counted paths, not files it would store. Contract store_full as of 444fa86: "the files
    // this add would store would take the store past 5000 documents ... Files skipped (a
    // duplicate, an empty file) do not count." Working: 4999 + 1 stored = 5000, not past 5000.
    // The duplicate is skipped as duplicate. Fails while the store counts paths (4999 + 2).
    const kept = keptRandom();
    const held = studentFile("i20.pdf", 900);
    await addOne(await open({ random: kept.random }), held.path);
    plantRows(documentKey(kept.draws), 4999);
    const copy = join(outside, "i20 copy.pdf");
    writeFileSync(copy, held.bytes);

    const opened = await open();
    expect((await listed(opened)).documents).toHaveLength(4999);
    const reply = await opened.add([studentFile("new.pdf", 700).path, copy]);
    inContract("add", reply, "add_reply");
    expect(reply).toMatchObject({
      ok: true,
      added: [{ name: "new.pdf" }],
      skipped: [{ name: "i20 copy.pdf", refused: "duplicate" }],
    });
    expect((reply as Reply).added).toHaveLength(1);
    expect((await listed(await open())).documents).toHaveLength(5000);
  }, 120_000);

  it("review2_w2p4_3: with 5000 held, any add that would store a file is store_full", async () => {
    // Contract store_full: "nothing is added". At 5000, a new file alone and a new file beside a
    // duplicate would each make 5001: store_full, documents.bin and files/ as before. A
    // duplicate alone stores nothing, so 5000 + 0 is not past 5000: answered ok with it
    // skipped. Fails if any of the first two is answered ok, or if the third is store_full.
    const kept = keptRandom();
    const held = studentFile("i20.pdf", 900);
    await addOne(await open({ random: kept.random }), held.path);
    plantRows(documentKey(kept.draws), 5000);
    const copy = join(outside, "i20 copy.pdf");
    writeFileSync(copy, held.bytes);

    const opened = await open();
    const before = snapshot();
    for (const paths of [
      [studentFile("one-more.pdf", 700).path],
      [studentFile("two-more.pdf", 700).path, copy],
    ]) {
      const reply = await opened.add(paths);
      expect(reply).toMatchObject({ ok: false, refused: "store_full" });
      inContract("add", reply, "add_reply");
      expect(snapshot()).toEqual(before);
    }
    const onlyCopy = await opened.add([copy]);
    inContract("add", onlyCopy, "add_reply");
    expect(onlyCopy).toMatchObject({
      ok: true,
      added: [],
      skipped: [{ name: "i20 copy.pdf", refused: "duplicate" }],
    });
    expect((await listed(await open())).documents).toHaveLength(5000);
  }, 120_000);

  it("review2_w2p4_8: an index already over 20000 history lines lists at once, newest 20000", async () => {
    // Note 8: an index of more than 20000 lines, which only a build before D96 wrote, made list
    // fail until the next write trimmed it. The contract's list_reply history: "The index keeps
    // the newest 20000 lines". Planted: 20001 exported lines, newest first, line k (k = 0
    // newest) with count k + 1. Working: with no write first, list keeps lines 0..19999, so
    // history[0] is count 1, history[19999] count 20000; the oldest, count 20001, is dropped.
    // Fails if load does not trim (list then gives 20001 lines, outside list_reply).
    const kept = keptRandom();
    await addOne(await open({ random: kept.random }), studentFile("ead.pdf", 900).path);
    const key = documentKey(kept.draws);
    const index = openIndex(key);
    index.history = Array.from({ length: 20001 }, (_, k) => ({
      on: TODAY,
      event: "exported",
      count: k + 1,
    }));
    plantIndex(key, index);

    const seen = await listed(await open());
    expect(seen.documents).toHaveLength(1);
    expect(seen.history).toHaveLength(20000);
    expect(seen.history[0]).toEqual({ on: TODAY, event: "exported", count: 1 });
    expect(seen.history[19999]).toEqual({ on: TODAY, event: "exported", count: 20000 });
  }, 120_000);
});

function flip(bytes: Buffer): Buffer {
  const copy = Buffer.from(bytes);
  copy[100] = (copy[100] ?? 0) ^ 0xff;
  return copy;
}
