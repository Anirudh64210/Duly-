// What the three desktop test files share (specs/step-w/SPEC-W2.md point 52). The modules under
// test are written by L-desktop after these tests, so each is loaded by load() through a path
// the type checker does not follow: this folder type-checks before they exist, and a missing
// module or export fails the test that needs it, never skips it.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import type { Cipher } from "../../desktop/src/casefile";
import { Checker } from "../../desktop/src/schema";

export const ROOT = join(__dirname, "..", "..");
export const SRC = join(ROOT, "desktop", "src");

/** A module of desktop/src by its file name, typed as the test expects it. */
export async function load<T>(name: string): Promise<T> {
  return (await import(join(SRC, name))) as T;
}

/**
 * One checker over the named contracts, such as "case" for contracts/case.schema.json, made
 * with desktop's own Checker, as main checks them.
 */
export function contractChecker(names: readonly string[]): Checker {
  const read = (name: string): unknown =>
    JSON.parse(readFileSync(join(ROOT, "contracts", `${name}.schema.json`), "utf8"));
  return new Checker(names.map(read));
}

export const ENGINE_BRIDGE = "https://duly.local/contracts/desktop_engine_bridge.schema.json";
export const STATE_BRIDGE = "https://duly.local/contracts/desktop_state_bridge.schema.json";
export const DOCUMENTS_BRIDGE = "https://duly.local/contracts/desktop_documents_bridge.schema.json";

/**
 * Stands in for safeStorage, as desktop/src/casefile.test.ts does: AES-GCM under a key of its
 * own, so nothing it wraps is on disk in the clear. It keeps every text it was asked to wrap.
 */
export function fakeKeychain(): { cipher: Cipher; wrapped: string[] } {
  const key = randomBytes(32);
  const wrapped: string[] = [];
  const cipher: Cipher = {
    available: () => true,
    encrypt(text) {
      wrapped.push(text);
      const iv = randomBytes(12);
      const aes = createCipheriv("aes-256-gcm", key, iv);
      const body = Buffer.concat([aes.update(text, "utf8"), aes.final()]);
      return Buffer.concat([iv, aes.getAuthTag(), body]);
    },
    decrypt(data) {
      const aes = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
      aes.setAuthTag(data.subarray(12, 28));
      return Buffer.concat([aes.update(data.subarray(28)), aes.final()]).toString("utf8");
    },
  };
  return { cipher, wrapped };
}

/** Every file under a folder, by its path from the folder, with its bytes. */
export function filesUnder(folder: string, prefix = ""): Map<string, Buffer> {
  const found = new Map<string, Buffer>();
  for (const name of readdirSync(join(folder, prefix))) {
    const path = join(prefix, name);
    if (statSync(join(folder, path)).isDirectory()) {
      for (const [inner, bytes] of filesUnder(folder, path)) found.set(inner, bytes);
    } else {
      found.set(path, readFileSync(join(folder, path)));
    }
  }
  return found;
}

/** The forms a key could be written in: its bytes, hex and base64. */
export function keyForms(key: Buffer): Buffer[] {
  return [
    key,
    Buffer.from(key.toString("hex")),
    Buffer.from(key.toString("base64")),
    Buffer.from(key.toString("base64url")),
  ];
}
