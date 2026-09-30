import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  BRIDGE_SCHEMA_ID,
  CASE_CHANNEL,
  CASE_FILE,
  PROBLEM_LENGTH,
  createCaseBridge,
  loadChecker,
  mayUseCase,
  nodeDisk,
  type Cipher,
  type Disk,
} from "./casefile";

const ROOT = join(__dirname, "..", "..");
const checker = loadChecker(ROOT);

/** Stands in for safeStorage: AES-GCM with a key of its own, as the keychain holds one. */
function testCipher(key: Buffer = randomBytes(32)): Cipher {
  return {
    available: () => true,
    encrypt(text) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), body]);
    },
    decrypt(data) {
      const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
      decipher.setAuthTag(data.subarray(12, 28));
      return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
    },
  };
}

const A_CASE = {
  categories: ["f1"],
  time_zone: "America/New_York",
  facts: { status: "f1", program_end: "2027-02-09" },
  records: [
    {
      id: "a1",
      kind: "authorization",
      fields: {
        type: "post_completion_opt",
        periods: [{ start: "2026-02-10", end: "2027-02-09" }],
      },
    },
  ],
  complete: { authorization: { on: "2026-09-29" } },
  confirmations: { "step.stem.i983": { answer: true, on: "2026-09-28" } },
};
const DATES = ["2027-02-09", "2026-02-10", "2026-09-29", "2026-09-28"];

const read = { version: "v1", call: "case.read" };
const clear = { version: "v1", call: "case.clear" };
const write = (value: unknown) => ({ version: "v1", call: "case.write", case: value });

let folder: string;
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "duly-case-"));
});
afterEach(() => rmSync(folder, { recursive: true, force: true }));

describe("the case bridge", () => {
  it("writes a case, reads it back, and clears it", async () => {
    const bridge = createCaseBridge({ folder, cipher: testCipher(), checker });
    expect(await bridge(read)).toEqual({ version: "v1", call: "case.read", ok: true, case: null });
    expect(await bridge(write(A_CASE))).toEqual({ version: "v1", call: "case.write", ok: true });
    expect(await bridge(read)).toEqual({
      version: "v1",
      call: "case.read",
      ok: true,
      case: A_CASE,
    });
    expect(await bridge(clear)).toEqual({ version: "v1", call: "case.clear", ok: true });
    expect(await bridge(read)).toEqual({ version: "v1", call: "case.read", ok: true, case: null });
  });

  it("keeps one file, readable by its owner only, with no plaintext date in it", async () => {
    const bridge = createCaseBridge({ folder, cipher: testCipher(), checker });
    await bridge(write(A_CASE));
    expect(readdirSync(folder)).toEqual([CASE_FILE]);
    const bytes = readFileSync(join(folder, CASE_FILE));
    const asText = bytes.toString("latin1");
    for (const date of DATES) expect(asText).not.toContain(date);
    expect(asText).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(asText).not.toContain("America/New_York");
    expect(statSync(join(folder, CASE_FILE)).mode & 0o777).toBe(0o600);
  });

  it("clear removes the file, and clearing again is not an error", async () => {
    const bridge = createCaseBridge({ folder, cipher: testCipher(), checker });
    await bridge(write(A_CASE));
    writeFileSync(join(folder, `${CASE_FILE}.writing`), "left from a crash");
    expect(await bridge(clear)).toMatchObject({ ok: true });
    expect(existsSync(join(folder, CASE_FILE))).toBe(false);
    expect(readdirSync(folder)).toEqual([]);
    expect(await bridge(clear)).toMatchObject({ ok: true });
  });

  it("refuses a case that fails the contract, and keeps the one saved", async () => {
    const bridge = createCaseBridge({ folder, cipher: testCipher(), checker });
    await bridge(write(A_CASE));
    const hostile = [
      { ...A_CASE, time_zone: "../../etc/passwd" },
      { ...A_CASE, facts: { status: Number.NaN } },
      { ...A_CASE, facts: { born: new Date(0) } },
      { ...A_CASE, path: "/Users/someone/elsewhere" },
      { ...A_CASE, complete: { authorization: { on: "2026-13-01" } } },
      JSON.parse('{"__proto__": {"polluted": true}}') as unknown,
      "a case",
      null,
      undefined,
    ];
    for (const value of hostile) {
      const reply = await bridge(write(value));
      expect(reply).toMatchObject({
        version: "v1",
        call: "case.write",
        ok: false,
        refused: "not_a_case",
      });
      expect(checker.problem(`${BRIDGE_SCHEMA_ID}#/$defs/write_reply`, reply)).toBeNull();
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(await bridge(read)).toMatchObject({ ok: true, case: A_CASE });
  });

  it("names where the case fails, and never a value from it", async () => {
    const bridge = createCaseBridge({ folder, cipher: testCipher(), checker });
    const reply = await bridge(write({ ...A_CASE, "1990-01-01 A12345678": "x" }));
    expect(reply).toMatchObject({
      refused: "not_a_case",
      first_problem: "/*: additionalProperties",
    });
    expect(JSON.stringify(reply)).not.toContain("1990");
    expect(JSON.stringify(reply)).not.toContain("A12345678");
    const long = await bridge(write({ ...A_CASE, time_zone: 3 }));
    expect(long).toMatchObject({ first_problem: "/time_zone: type" });
    expect(String((long as { first_problem?: string }).first_problem).length).toBeLessThanOrEqual(
      PROBLEM_LENGTH,
    );
  });

  it("refuses a case on disk that fails the contract, and leaves it where it is", async () => {
    const cipher = testCipher();
    writeFileSync(join(folder, CASE_FILE), cipher.encrypt(JSON.stringify({ ...A_CASE, facts: 1 })));
    const bridge = createCaseBridge({ folder, cipher, checker });
    expect(await bridge(read)).toEqual({
      version: "v1",
      call: "case.read",
      ok: false,
      refused: "not_a_case",
      first_problem: "/facts: type",
    });
    writeFileSync(join(folder, CASE_FILE), cipher.encrypt("not json"));
    expect(await bridge(read)).toMatchObject({ refused: "not_a_case", first_problem: "/: JSON" });
    expect(existsSync(join(folder, CASE_FILE))).toBe(true);
  });

  it("refuses a file the keychain's key cannot open", async () => {
    await createCaseBridge({ folder, cipher: testCipher(), checker })(write(A_CASE));
    const other = createCaseBridge({ folder, cipher: testCipher(), checker });
    const reply = await other(read);
    expect(reply).toEqual({
      version: "v1",
      call: "case.read",
      ok: false,
      refused: "cannot_decrypt",
    });
    expect(checker.problem(`${BRIDGE_SCHEMA_ID}#/$defs/read_reply`, reply)).toBeNull();
    writeFileSync(join(folder, CASE_FILE), JSON.stringify(A_CASE));
    expect(await other(read)).toMatchObject({ refused: "cannot_decrypt" });
  });

  it("writes nothing when the keychain cannot encrypt", async () => {
    const cipher = { ...testCipher(), available: () => false };
    const bridge = createCaseBridge({ folder, cipher, checker });
    expect(await bridge(write(A_CASE))).toMatchObject({
      ok: false,
      refused: "keychain_unavailable",
    });
    expect(await bridge(read)).toMatchObject({ ok: false, refused: "keychain_unavailable" });
    expect(readdirSync(folder)).toEqual([]);
    const throwing = {
      ...testCipher(),
      encrypt: () => {
        throw new Error("locked");
      },
    };
    const second = createCaseBridge({ folder, cipher: throwing, checker });
    expect(await second(write(A_CASE))).toMatchObject({ refused: "keychain_unavailable" });
    expect(readdirSync(folder)).toEqual([]);
  });

  it("says cannot_store when the disk fails", async () => {
    const failing: Disk = {
      read: () => Promise.reject(new Error("io")),
      write: () => Promise.reject(new Error("full")),
      remove: () => Promise.reject(new Error("busy")),
    };
    const bridge = createCaseBridge({ folder, cipher: testCipher(), checker, disk: failing });
    const replies = [await bridge(write(A_CASE)), await bridge(clear), await bridge(read)];
    expect(replies.map((reply) => (reply.ok ? "ok" : reply.refused))).toEqual([
      "cannot_store",
      "cannot_store",
      "cannot_decrypt",
    ]);
    for (const reply of replies) expect(checker.problem(BRIDGE_SCHEMA_ID, reply)).toBeNull();
  });

  it("leaves no half-written file when the write fails", async () => {
    const missing = join(folder, "gone", CASE_FILE);
    await expect(nodeDisk.write(missing, Buffer.from("x"))).rejects.toThrow();
    expect(readdirSync(folder)).toEqual([]);
    await expect(nodeDisk.read(folder)).rejects.toThrow();
  });

  it("answers calls one at a time, in the order they came", async () => {
    const bridge = createCaseBridge({ folder, cipher: testCipher(), checker });
    const second = { ...A_CASE, time_zone: "UTC" };
    const replies = await Promise.all([
      bridge(write(A_CASE)),
      bridge(write(second)),
      bridge(read),
      bridge(clear),
      bridge(read),
    ]);
    expect(replies[2]).toMatchObject({ case: second });
    expect(replies[4]).toMatchObject({ case: null });
  });

  it("gives every reply in the contract's shape", async () => {
    const bridge = createCaseBridge({ folder, cipher: testCipher(), checker });
    for (const message of [write(A_CASE), read, clear, read]) {
      expect(checker.problem(BRIDGE_SCHEMA_ID, message)).toBeNull();
      expect(checker.problem(BRIDGE_SCHEMA_ID, await bridge(message))).toBeNull();
    }
  });
});

describe("the page can name no path", () => {
  const bridge = () => createCaseBridge({ folder, cipher: testCipher(), checker });

  it("refuses a call with anything more than the contract gives", async () => {
    const refused = [
      { ...read, path: "/etc/passwd" },
      { ...clear, file: "../../duly.db" },
      { ...write(A_CASE), folder: "/tmp" },
      { ...read, case: A_CASE },
      { version: "v1", call: "case.write" },
      { version: "v2", call: "case.read" },
      { version: "v1", call: "case.move", to: "/tmp" },
      "case.read",
      null,
      [read],
    ];
    for (const message of refused) {
      await expect(bridge()(message)).rejects.toThrow("not a case bridge call");
    }
    expect(readdirSync(folder)).toEqual([]);
  });

  it("keeps the file in the folder main gives, under its own name", async () => {
    await bridge()(write(A_CASE));
    expect(readdirSync(folder)).toEqual([CASE_FILE]);
  });

  it("lets only the app's own page, in the main frame, use the bridge", () => {
    expect(mayUseCase("duly://app/index.html", true)).toBe(true);
    expect(mayUseCase("duly://app/index.html", false)).toBe(false);
    expect(mayUseCase("https://www.uscis.gov/", true)).toBe(false);
    expect(mayUseCase("file:///etc/passwd", true)).toBe(false);
    expect(mayUseCase(undefined, true)).toBe(false);
  });

  it("asks on the same channel the preload uses", () => {
    const preload = readFileSync(join(__dirname, "preload.ts"), "utf8");
    expect(preload).toContain(`export const CASE_CHANNEL = ${JSON.stringify(CASE_CHANNEL)};`);
  });

  it("is wired in main with the app's data folder and safeStorage, and nothing from the page", () => {
    const main = readFileSync(join(__dirname, "main.ts"), "utf8");
    expect(main).toContain('folder: app.getPath("userData")');
    expect(main).toContain("safeStorage.encryptString");
    expect(main).toContain("mayUseCase(");
    expect(main).not.toMatch(/localStorage|sessionStorage|indexedDB/);
  });
});
