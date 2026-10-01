import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import * as script from "../scripts/manifest.mjs";
import { checkRuntime, firstDifference, treeHashes } from "./manifest";

let base: string;

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), "duly-manifest-"));
  mkdirSync(join(base, "python", "bin"), { recursive: true });
  mkdirSync(join(base, "engine-root", "engine"), { recursive: true });
  writeFileSync(join(base, "python", "bin", "python3.12"), "interpreter");
  symlinkSync("python3.12", join(base, "python", "bin", "python3"));
  writeFileSync(join(base, "engine-root", "duly_engine.py"), "launcher");
  writeFileSync(join(base, "engine-root", "engine", "path.py"), "engine");
});

afterEach(() => rmSync(base, { recursive: true, force: true }));

const written = async () => {
  await script.writeManifest(base, "2025.2");
  return join(base, "python-manifest.json");
};

describe("the runtime check (point 17)", () => {
  it("passes the files as listed", async () => {
    expect(await checkRuntime(await written())).toBeNull();
  });

  it("refuses a changed byte", async () => {
    const manifest = await written();
    writeFileSync(join(base, "engine-root", "engine", "path.py"), "enginE");
    expect(await checkRuntime(manifest)).toBe(
      "A file of Duly's engine has changed: engine-root/engine/path.py",
    );
  });

  it("refuses a missing file", async () => {
    const manifest = await written();
    rmSync(join(base, "engine-root", "duly_engine.py"));
    expect(await checkRuntime(manifest)).toBe(
      "A file of Duly's engine is missing: engine-root/duly_engine.py",
    );
  });

  it("refuses an extra file", async () => {
    const manifest = await written();
    writeFileSync(join(base, "python", "bin", "sitecustomize.py"), "x");
    expect(await checkRuntime(manifest)).toBe(
      "A file that is not Duly's is in its engine: python/bin/sitecustomize.py",
    );
  });

  it("refuses a link pointed elsewhere", async () => {
    const manifest = await written();
    rmSync(join(base, "python", "bin", "python3"));
    symlinkSync("/usr/bin/python3", join(base, "python", "bin", "python3"));
    expect(await checkRuntime(manifest)).toBe(
      "A file of Duly's engine has changed: python/bin/python3",
    );
  });

  it("refuses a missing or unreadable list, and a missing folder", async () => {
    expect(await checkRuntime(join(base, "python-manifest.json"))).toMatch(/could not read/);
    writeFileSync(join(base, "python-manifest.json"), '{"files":{"a":1}}');
    expect(await checkRuntime(join(base, "python-manifest.json"))).toMatch(/could not read/);
    const manifest = await written();
    rmSync(join(base, "engine-root"), { recursive: true });
    expect(await checkRuntime(manifest)).toBe("A folder of Duly's engine is missing.");
  });

  it("walks the tree exactly as the script that writes the list", async () => {
    const ours = await treeHashes(base);
    expect(await script.treeHashes(base)).toEqual(ours);
    expect(Object.keys(ours)).toEqual([
      "python/bin/python3",
      "python/bin/python3.12",
      "engine-root/duly_engine.py",
      "engine-root/engine/path.py",
    ]);
    expect(ours["python/bin/python3"]).toBe("link:python3.12");
  });

  it("names the first difference in a stable order", () => {
    expect(firstDifference({ a: "1", b: "2" }, { a: "1", b: "2" })).toBeNull();
    expect(firstDifference({ a: "1", b: "2" }, { b: "3" })).toMatch(/missing: a$/);
  });
});
