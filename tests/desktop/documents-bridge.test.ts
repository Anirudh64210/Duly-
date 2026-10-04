// specs/step-w/SPEC-W2.md point 13 (W2-P4, point 52): window.duly.documents, each call of
// contracts/desktop_documents_bridge.schema.json and each refusal, and point 17's "Delete
// everything on this Mac". Written before the bridge exists: these cannot pass yet.
//
// What L-desktop builds for these tests: desktop/src/docbridge.ts with DOCUMENTS_CHANNEL,
// mayUseDocuments(frameUrl, isMainFrame), and createDocumentsBridge(deps) answering one
// message, as createCaseBridge does. deps are docstore.ts's (folder, cipher, checker, today)
// and dialogs, main's own system dialogs: files() for add from the dialog, folder() and zip()
// for export; each resolves to null when the student cancels. The preload adds
// window.duly.documents, turning each dropped File into its path with webUtils.getPathForFile.
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Cipher } from "../../desktop/src/casefile";
import type { Checker } from "../../desktop/src/schema";
import { DOCUMENTS_BRIDGE, SRC, contractChecker, fakeKeychain, load } from "./support";

const exposed = vi.hoisted(() => [] as [string, unknown][]);
const asked = vi.hoisted(() => [] as unknown[][]);
const dropped = vi.hoisted(() => new Map<unknown, string>());

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: (key: string, value: unknown) => exposed.push([key, value]),
  },
  ipcRenderer: {
    invoke: (...args: unknown[]) => {
      asked.push(args);
      return Promise.resolve({ ok: true });
    },
  },
  // As Electron's: a File from a real drop has its path; a File made in the page has none.
  webUtils: {
    getPathForFile: (file: unknown) => {
      if (!(file instanceof File)) throw new TypeError("not a File");
      return dropped.get(file) ?? "";
    },
  },
}));

type Bridge = (message: unknown) => Promise<unknown>;

interface Dialogs {
  files(): Promise<string[] | null>;
  folder(): Promise<string | null>;
  zip(): Promise<string | null>;
}

interface DocBridgeModule {
  DOCUMENTS_CHANNEL: string;
  mayUseDocuments(frameUrl: string | undefined, isMainFrame: boolean): boolean;
  createDocumentsBridge(deps: {
    folder: string;
    cipher: Cipher;
    checker: Checker;
    today: () => string;
    dialogs: Dialogs;
  }): Bridge;
}

interface CaseBridgeModule {
  createCaseBridge(deps: { folder: string; cipher: Cipher; checker: Checker }): Bridge;
}

interface StateBridgeModule {
  createStateBridge(deps: { folder: string; cipher: Cipher; checker: Checker }): Bridge;
}

interface Document {
  id: string;
  name: string;
  media_type: string;
  size: number;
}

const TODAY = "2026-10-03";
// A 1x1 PNG, the smallest image the open call shows.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n");

let docs: DocBridgeModule;
let checker: Checker;
let keychain: ReturnType<typeof fakeKeychain>;
let folder: string;
let outside: string;
let picks: { files: string[] | null; folder: string | null; zip: string | null };

beforeEach(async () => {
  checker = contractChecker([
    "case",
    "desktop_ask_bridge",
    "desktop_case_bridge",
    "desktop_state_bridge",
    "desktop_documents_bridge",
  ]);
  keychain = fakeKeychain();
  folder = mkdtempSync(join(tmpdir(), "duly-data-"));
  outside = mkdtempSync(join(tmpdir(), "duly-student-"));
  picks = { files: null, folder: null, zip: null };
  docs = await load<DocBridgeModule>("docbridge");
});
afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

const dialogs: Dialogs = {
  files: () => Promise.resolve(picks.files),
  folder: () => Promise.resolve(picks.folder),
  zip: () => Promise.resolve(picks.zip),
};

/** The bridge, with every reply checked against the contract before the test reads it. */
function bridge(): Bridge {
  const answer = docs.createDocumentsBridge({
    folder,
    cipher: keychain.cipher,
    checker,
    today: () => TODAY,
    dialogs,
  });
  return async (message) => {
    const reply = await answer(message);
    expect(checker.problem(DOCUMENTS_BRIDGE, reply), JSON.stringify(reply)).toBeNull();
    return reply;
  };
}

function studentFile(name: string, bytes: Buffer): string {
  const path = join(outside, name);
  writeFileSync(path, bytes);
  return path;
}

const call = (name: string, rest: object = {}) => ({
  version: "v1",
  call: `documents.${name}`,
  ...rest,
});
const drop = (paths: string[], rest: object = {}) =>
  call("add", { from: "drop", dropped: paths, ...rest });

async function addDropped(answer: Bridge, path: string): Promise<Document> {
  const reply = (await answer(drop([path]))) as { added: Document[] };
  expect(reply).toMatchObject({ ok: true, skipped: [] });
  expect(reply.added).toHaveLength(1);
  return reply.added[0] as Document;
}

describe("each call of the documents bridge (SPEC-W2 point 13)", () => {
  it("add from main's own dialog adds what the student picked, or nothing when cancelled", async () => {
    const answer = bridge();
    expect(await answer(call("add", { from: "dialog" }))).toEqual({
      ...call("add"),
      ok: true,
      added: [],
      skipped: [],
      cancelled: true,
    });
    picks.files = [studentFile("I-20.pdf", PDF)];
    const reply = await answer(call("add", { from: "dialog" }));
    expect(reply).toMatchObject({
      ok: true,
      added: [{ name: "I-20.pdf", label: "I-20.pdf", media_type: "application/pdf" }],
      skipped: [],
    });
    expect((reply as { added: Document[] }).added[0]?.size).toBe(PDF.length);
  });

  it("add from a real drop adds each dropped file", async () => {
    const answer = bridge();
    const reply = await answer(drop([studentFile("card.png", PNG), studentFile("i983.pdf", PDF)]));
    expect(reply).toMatchObject({
      ok: true,
      added: [
        { name: "card.png", media_type: "image/png", added_on: TODAY, removed: false },
        { name: "i983.pdf", media_type: "application/pdf", added_on: TODAY, removed: false },
      ],
      skipped: [],
    });
  });

  it("list gives every document, Removed ones too, and the history newest first", async () => {
    const answer = bridge();
    const one = await addDropped(answer, studentFile("a.png", PNG));
    const two = await addDropped(answer, studentFile("b.pdf", PDF));
    await answer(call("remove", { id: one.id }));
    const reply = (await answer(call("list"))) as {
      documents: { id: string; removed: boolean }[];
      history: { event: string; document?: string }[];
    };
    expect(reply.documents.map((d) => [d.id, d.removed]).sort()).toEqual(
      [
        [one.id, true],
        [two.id, false],
      ].sort(),
    );
    expect(reply.history[0]).toEqual({ on: TODAY, event: "removed", document: one.id });
  });

  it("open shows an image as a data: URL of its own bytes, and a PDF as none", async () => {
    // Contract open_reply: image gives data_url; a PDF is never handed to Chromium's viewer,
    // and pages wait for the founder's approval of a viewer (point 62), so it is none.
    const answer = bridge();
    const image = await addDropped(answer, studentFile("card.png", PNG));
    const pdf = await addDropped(answer, studentFile("i20.pdf", PDF));
    expect(await answer(call("open", { id: image.id }))).toEqual({
      ...call("open"),
      ok: true,
      id: image.id,
      shown: "image",
      data_url: `data:image/png;base64,${PNG.toString("base64")}`,
    });
    expect(await answer(call("open", { id: pdf.id }))).toEqual({
      ...call("open"),
      ok: true,
      id: pdf.id,
      shown: "none",
    });
  });

  it("versions gives the chain newest first, and update sets only the fields given", async () => {
    const answer = bridge();
    const old = await addDropped(answer, studentFile("i20-old.pdf", PDF));
    const reply = await answer(
      drop([studentFile("i20-new.pdf", randomBytes(400))], { replaces: old.id }),
    );
    const added = (reply as { added: Document[] }).added[0] as Document;
    const versions = (await answer(call("versions", { id: old.id }))) as { versions: Document[] };
    expect(versions.versions.map((d) => d.id)).toEqual([added.id, old.id]);

    const typed = [{ record: "a1", kind: "program", fields: { program_end: "2027-02-09" } }];
    const updated = await answer(
      call("update", { id: old.id, kind: "i20", label: "I-20 for OPT", group: "school", typed }),
    );
    expect(updated).toMatchObject({
      ok: true,
      document: {
        id: old.id,
        name: "i20-old.pdf",
        kind: "i20",
        label: "I-20 for OPT",
        group: "school",
        typed,
      },
    });
    const again = await answer(call("update", { id: old.id, labels: ["opt"] }));
    expect(again).toMatchObject({
      document: { label: "I-20 for OPT", kind: "i20", labels: ["opt"] },
    });
  });

  it("remove, restore and delete answer done, and delete keeps no name in history", async () => {
    const answer = bridge();
    const one = await addDropped(answer, studentFile("visa.pdf", PDF));
    for (const name of ["remove", "restore", "remove", "delete"]) {
      expect(await answer(call(name, { id: one.id }))).toEqual({ ...call(name), ok: true });
    }
    const list = (await answer(call("list"))) as { documents: unknown[]; history: unknown[] };
    expect(list.documents).toEqual([]);
    expect(list.history[0]).toEqual({ on: TODAY, event: "deleted" });
    expect(JSON.stringify(list)).not.toContain("visa.pdf");
    expect(JSON.stringify(list)).not.toContain(one.id);
  });

  it("export writes decrypted copies only into the folder the student picked", async () => {
    // Point 13: "decrypted copies to a folder ... the student picks through the system
    // dialog". Fails if a copy differs from the original, is written anywhere else, or the
    // count is wrong. Cancelled writes nothing.
    const answer = bridge();
    const image = await addDropped(answer, studentFile("card.png", PNG));
    const pdf = await addDropped(answer, studentFile("i20.pdf", PDF));
    const ids = [image.id, pdf.id];
    expect(await answer(call("export", { ids, as: "folder" }))).toEqual({
      ...call("export"),
      ok: true,
      exported: 0,
      cancelled: true,
    });
    const picked = mkdtempSync(join(tmpdir(), "duly-share-"));
    try {
      picks.folder = picked;
      const before = readdirSync(outside).sort();
      expect(await answer(call("export", { ids, as: "folder" }))).toEqual({
        ...call("export"),
        ok: true,
        exported: 2,
      });
      expect(readdirSync(picked).sort()).toEqual(["card.png", "i20.pdf"]);
      expect(readFileSync(join(picked, "card.png"))).toEqual(PNG);
      expect(readFileSync(join(picked, "i20.pdf"))).toEqual(PDF);
      expect(readdirSync(outside).sort()).toEqual(before);
      const list = (await answer(call("list"))) as { history: unknown[] };
      expect(list.history[0]).toEqual({ on: TODAY, event: "exported", count: 2 });
    } finally {
      rmSync(picked, { recursive: true, force: true });
    }
    expect(await answer(call("export", { ids, as: "zip" }))).toEqual({
      ...call("export"),
      ok: true,
      exported: 0,
      cancelled: true,
    });
  });

  it("refuses an unknown id as unknown_document", async () => {
    const answer = bridge();
    for (const name of ["open", "versions", "update", "remove", "restore", "delete"]) {
      expect(await answer(call(name, { id: "a".repeat(32) }))).toMatchObject({
        ok: false,
        refused: "unknown_document",
      });
    }
    expect(await answer(call("export", { ids: ["a".repeat(32)], as: "folder" }))).toMatchObject({
      ok: false,
      refused: "unknown_document",
    });
  });
});

describe("each refusal of add (SPEC-W2 point 13)", () => {
  // Point 13, checked by: "each refusal (a path from the screen, a folder, a file inside the
  // data folder, a file over the size limit, a duplicate)". Contract skipped: not_dropped,
  // not_a_file, inside_data_folder, too_large, duplicate. Each is skipped by name, and the
  // file is not added; nothing about it is written in the data folder.

  it("a File with no path, as one made in the page gives, is not_dropped", async () => {
    const answer = bridge();
    expect(await answer(drop([""]))).toEqual({
      ...call("add"),
      ok: true,
      added: [],
      skipped: [{ refused: "not_dropped" }],
    });
  });

  it("a folder is not_a_file", async () => {
    const answer = bridge();
    const inside = join(outside, "Scans");
    mkdirSync(inside);
    expect(await answer(drop([inside]))).toMatchObject({
      added: [],
      skipped: [{ name: "Scans", refused: "not_a_file" }],
    });
  });

  it("a file inside the data folder is inside_data_folder, by any path to it", async () => {
    // The data folder's own files, by their path, by a path through .., and by a link from
    // outside. A link may be refused as not_a_file too; either way it is never added.
    const answer = bridge();
    await addDropped(answer, studentFile("a.pdf", PDF));
    writeFileSync(join(folder, "case.bin"), "case");
    const link = join(outside, "looks-like-mine.pdf");
    symlinkSync(join(folder, "keys.bin"), link);
    const paths = [
      join(folder, "keys.bin"),
      join(folder, "case.bin"),
      join(dirname(folder), "elsewhere", "..", basename(folder), "documents.bin"),
    ];
    for (const path of paths) {
      expect(await answer(drop([path]))).toMatchObject({
        added: [],
        skipped: [{ refused: "inside_data_folder" }],
      });
    }
    const viaLink = (await answer(drop([link]))) as {
      added: unknown[];
      skipped: { refused: string }[];
    };
    expect(viaLink.added).toEqual([]);
    expect(["inside_data_folder", "not_a_file"]).toContain(viaLink.skipped[0]?.refused);
    const files = readdirSync(join(folder, "files"));
    expect(files).toHaveLength(1);
  });

  it("a file over the size limit is too_large", async () => {
    // Duly's own limit, MAX_FILE_BYTES of docstore.ts (no law states one): one byte over.
    const { MAX_FILE_BYTES } = await load<{ MAX_FILE_BYTES: number }>("docstore");
    const answer = bridge();
    const path = join(outside, "huge.pdf");
    writeFileSync(path, "");
    truncateSync(path, MAX_FILE_BYTES + 1);
    expect(await answer(drop([path]))).toMatchObject({
      added: [],
      skipped: [{ name: "huge.pdf", refused: "too_large" }],
    });
  });

  it("the same bytes again are a duplicate, naming the document already held", async () => {
    const answer = bridge();
    const held = await addDropped(answer, studentFile("i20.pdf", PDF));
    expect(await answer(drop([studentFile("i20 copy.pdf", PDF)]))).toMatchObject({
      added: [],
      skipped: [{ name: "i20 copy.pdf", refused: "duplicate", existing: held.id }],
    });
  });

  it("a drop of good and bad files adds the good ones and skips each bad one", async () => {
    const answer = bridge();
    const reply = (await answer(
      drop([studentFile("ok.png", PNG), "", join(folder, "keys.bin"), outside]),
    )) as { added: Document[]; skipped: { refused: string }[] };
    expect(reply.added.map((d) => d.name)).toEqual(["ok.png"]);
    expect(reply.skipped.map((s) => s.refused).sort()).toEqual(
      ["inside_data_folder", "not_a_file", "not_dropped"].sort(),
    );
  });
});

describe("a path string from the screen is refused (SPEC-W2 point 13)", () => {
  it("main refuses any call outside the contract, and reads nothing", async () => {
    // Contract: "a string from the page is never taken as a path"; the dialog call carries
    // no path. Each message is outside desktop_documents_bridge.schema.json.
    const answer = docs.createDocumentsBridge({
      folder,
      cipher: keychain.cipher,
      checker,
      today: () => TODAY,
      dialogs,
    });
    const secret = studentFile("secret.pdf", PDF);
    const outsideCalls = [
      call("add", { from: "dialog", path: secret }),
      call("add", { from: "path", path: secret }),
      call("add", { from: "drop", dropped: secret }),
      call("add", { from: "drop", dropped: [] }),
      call("open", { id: "../../keys.bin" }),
      call("open", { id: "a".repeat(32), path: secret }),
      call("export", { ids: ["a".repeat(32)], as: "folder", to: outside }),
      call("export", { ids: [], as: "folder" }),
      call("list", { folder }),
      call("clear", { files: "/" }),
      call("read", { path: secret }),
      { version: "v2", call: "documents.list" },
      "documents.list",
      null,
    ];
    for (const message of outsideCalls) {
      await expect(answer(message)).rejects.toThrow();
    }
    expect(existsSync(join(folder, "files"))).toBe(false);
  });

  it("the preload sends only paths webUtils gives for dropped Files, never a string", async () => {
    // Contract add_call dropped: "Written by the preload, never by the page ... a File made in
    // the page has no path, so it gives an empty string". A string passed as a file never
    // reaches main as a path. Fails if "/etc/passwd" is in any message sent.
    const preload = await load<Record<string, unknown>>("preload");
    expect(preload.DOCUMENTS_CHANNEL).toBe(docs.DOCUMENTS_CHANNEL);
    const duly = (exposed.find(([key]) => key === "duly") ?? ["", null])[1] as {
      documents: Record<string, (...args: unknown[]) => Promise<unknown>>;
    };
    expect(Object.keys(duly.documents).sort()).toEqual([
      "add",
      "clear",
      "delete",
      "export",
      "list",
      "open",
      "remove",
      "restore",
      "update",
      "versions",
    ]);
    const real = new File([PDF], "i20.pdf");
    dropped.set(real, "/Users/someone/Downloads/i20.pdf");
    const made = new File([PDF], "made.pdf");
    asked.length = 0;
    await duly.documents.add?.({ from: "drop", files: [real, made] });
    await duly.documents.add?.({ from: "dialog", path: "/etc/passwd" });
    await duly.documents.list?.("/etc/passwd");
    await duly.documents.open?.("a".repeat(32), "/etc/passwd");
    await duly.documents.add?.({ from: "drop", files: ["/etc/passwd"] }).catch(() => undefined);
    const channel = docs.DOCUMENTS_CHANNEL;
    expect(asked.slice(0, 4)).toEqual([
      [channel, drop(["/Users/someone/Downloads/i20.pdf", ""])],
      [channel, call("add", { from: "dialog" })],
      [channel, call("list")],
      [channel, call("open", { id: "a".repeat(32) })],
    ]);
    expect(JSON.stringify(asked)).not.toContain("/etc/passwd");
  });

  it("lets only the app's own page, in the main frame, use the bridge", () => {
    const may = docs.mayUseDocuments;
    expect(may("duly://app/index.html", true)).toBe(true);
    expect(may("duly://app/index.html", false)).toBe(false);
    expect(may("https://www.uscis.gov/", true)).toBe(false);
    expect(may(undefined, true)).toBe(false);
  });

  it("is wired in main behind the frame check", () => {
    // Point 5's frame rule, "as the case bridge does today", holds for this bridge too; the
    // check lives in main's ipcMain handler, so this reads main.ts as bridges.test.ts does for
    // the engine and state bridges. Fails if the handler is added without mayUseDocuments.
    const main = readFileSync(join(SRC, "main.ts"), "utf8");
    expect(main).toContain("ipcMain.handle(DOCUMENTS_CHANNEL");
    expect(main).toContain("mayUseDocuments(");
    expect(main).toContain("createDocumentsBridge(");
  });
});

describe("Delete everything on this Mac (SPEC-W2 point 17)", () => {
  it("deletes files/, documents.bin, keys.bin, case.bin and state.bin", async () => {
    // Point 17: "deletes files/, documents.bin, keys.bin, case.bin and state.bin". The
    // contract's clear_call deletes the first three; "the page clears case.bin and state.bin
    // through their own bridges", so the three clears together leave none of the five, and
    // the student's own file stays.
    const answer = bridge();
    const own = studentFile("i20.pdf", PDF);
    await addDropped(answer, own);
    const { createCaseBridge } = await load<CaseBridgeModule>("casefile");
    const { createStateBridge } = await load<StateBridgeModule>("statefile");
    const caseBridge = createCaseBridge({ folder, cipher: keychain.cipher, checker });
    const stateBridge = createStateBridge({ folder, cipher: keychain.cipher, checker });
    const aCase = { categories: ["f1"], time_zone: "UTC", facts: {}, records: [], complete: {} };
    await caseBridge({ version: "v1", call: "case.write", case: aCase });
    await stateBridge({ version: "v1", call: "state.write", state: { slot: "own" } });
    expect(readdirSync(folder).sort()).toEqual([
      "case.bin",
      "documents.bin",
      "files",
      "keys.bin",
      "state.bin",
    ]);

    expect(await answer(call("clear"))).toEqual({ ...call("clear"), ok: true });
    for (const name of ["files", "documents.bin", "keys.bin"]) {
      expect(existsSync(join(folder, name))).toBe(false);
    }
    await caseBridge({ version: "v1", call: "case.clear" });
    await stateBridge({ version: "v1", call: "state.clear" });
    expect(readdirSync(folder)).toEqual([]);
    expect(readFileSync(own)).toEqual(PDF);
    expect(await answer(call("list"))).toEqual({
      ...call("list"),
      ok: true,
      documents: [],
      history: [],
    });
  });
});
