import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeManifest } from "../scripts/manifest.mjs";
import {
  FORBIDDEN_MODULES,
  allowedInEngineRoot,
  checkBundle,
  importProblems,
  readAllowlist,
} from "../scripts/verify-bundle.mjs";

const PATTERNS = readAllowlist();
let app: string;

function put(rel: string, text = "x"): void {
  const path = join(app, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

const RES = "Contents/Resources";

beforeEach(async () => {
  app = join(mkdtempSync(join(tmpdir(), "duly-bundle-")), "Duly.app");
  put("Contents/MacOS/Duly");
  put("Contents/Frameworks/Electron Framework.framework/Electron Framework");
  put(`${RES}/app.asar`);
  put(`${RES}/python/bin/python3.12`);
  put(`${RES}/python/site/fastapi/__init__.py`);
  put(`${RES}/python/site/fastapi-0.141.1.dist-info/METADATA`);
  put(`${RES}/python/site/pydantic_core/__init__.py`);
  put(`${RES}/engine-root/duly_engine.py`);
  put(`${RES}/engine-root/__pycache__/duly_engine.cpython-312.pyc`);
  put(`${RES}/engine-root/engine/path.py`);
  put(`${RES}/engine-root/engine/__pycache__/path.cpython-312.pyc`);
  put(`${RES}/engine-root/api/case.py`);
  put(`${RES}/engine-root/api/desktop_main.py`);
  put(`${RES}/engine-root/rulepacks/f1-us/v2026.09/parameters.yaml`);
  put(`${RES}/engine-root/contracts/case.schema.json`);
  await writeManifest(join(app, RES), "2026.4");
});

afterEach(() => rmSync(dirname(app), { recursive: true, force: true }));

/** Plants one file, then writes the manifest again so only the planted item is wrong. */
async function plant(rel: string): Promise<string[]> {
  put(rel);
  await writeManifest(join(app, RES), "2026.4");
  return checkBundle(app, PATTERNS);
}

describe("verify-bundle.mjs (point 25)", () => {
  it("passes a clean bundle", async () => {
    expect(await checkBundle(app, PATTERNS)).toEqual([]);
  });

  it.each([
    `${RES}/python/site/anthropic/__init__.py`,
    `${RES}/python/site/anthropic-0.70.0.dist-info/METADATA`,
    `${RES}/python/site/langgraph/graph.py`,
    `${RES}/python/site/langchain_core/__init__.py`,
    `${RES}/python/site/langchain-core.pth`,
    `${RES}/python/site/psycopg/__init__.py`,
    `${RES}/python/site/psycopg_binary-3.2.dist-info/METADATA`,
    `${RES}/python/site/SQLAlchemy-2.0.dist-info/METADATA`,
    `${RES}/python/site/sqlalchemy/__init__.py`,
    `${RES}/python/site/pydantic_settings/__init__.py`,
    `${RES}/engine-root/assistant/providers.py`,
    `${RES}/assistant/x.txt`,
    `${RES}/engine-root/api/main.py`,
    `${RES}/engine-root/api/settings.py`,
    `${RES}/engine-root/api/db.py`,
    `${RES}/engine-root/api/worker.py`,
    `${RES}/engine-root/pipeline/models.py`,
    `${RES}/engine-root/rulepacks/f1-us/v2026.09/sources/fr.xml`,
    `${RES}/engine-root/contracts/openapi.yaml`,
    `${RES}/engine-root/engine/duly_engine.py`,
  ])("fails with %s planted", async (rel) => {
    expect(await plant(rel)).not.toEqual([]);
  });

  it("fails when a file differs from python-manifest.json", async () => {
    put(`${RES}/python/site/fastapi/__init__.py`, "changed");
    expect(await checkBundle(app, PATTERNS)).toEqual([
      "python-manifest.json differs at python/site/fastapi/__init__.py",
    ]);
  });

  it("fails when a file is added after the manifest was written", async () => {
    put(`${RES}/python/site/sitecustomize.py`);
    expect(await checkBundle(app, PATTERNS)).toEqual([
      "python-manifest.json differs at python/site/sitecustomize.py",
    ]);
  });

  it("fails without a manifest or an engine-root", async () => {
    rmSync(join(app, RES, "python-manifest.json"));
    expect((await checkBundle(app, PATTERNS)).join("\n")).toMatch(/could not be checked/);
    rmSync(join(app, RES, "engine-root"), { recursive: true });
    expect((await checkBundle(app, PATTERNS)).join("\n")).toMatch(/no engine-root/);
  });

  it("reads compiled files as their sources", () => {
    expect(allowedInEngineRoot("engine/__pycache__/path.cpython-312.pyc", PATTERNS)).toBe(true);
    expect(allowedInEngineRoot("api/__pycache__/main.cpython-312.pyc", PATTERNS)).toBe(false);
    expect(allowedInEngineRoot("rulepacks/f1-us/v2026.09/parameters.yaml", PATTERNS)).toBe(true);
    expect(allowedInEngineRoot("rulepacks/f1-us/parameters.yaml", PATTERNS)).toBe(false);
    expect(allowedInEngineRoot("enginex/a.py", PATTERNS)).toBe(false);
  });

  it("lets in the optional published updates, and no agent's work log", () => {
    expect(allowedInEngineRoot("pipeline/published/an-update.json", PATTERNS)).toBe(true);
    expect(allowedInEngineRoot("pipeline/drafts/a-draft.json", PATTERNS)).toBe(false);
    expect(allowedInEngineRoot("engine/PROGRESS.md", PATTERNS)).toBe(false);
    expect(allowedInEngineRoot("engine/REPORT.json", PATTERNS)).toBe(false);
  });
});

describe("the import check (point 25 step 2)", () => {
  const fake = (status: number | null, error?: Error) => {
    const calls: string[][] = [];
    const run = (command: string, args: string[]) => {
      calls.push([command, ...args]);
      return { status, error };
    };
    return { calls, run: run as unknown as Parameters<typeof importProblems>[1] };
  };

  it("passes when every forbidden module fails to import, run isolated", () => {
    const { calls, run } = fake(1);
    expect(importProblems(app, run)).toEqual([]);
    expect(calls).toHaveLength(FORBIDDEN_MODULES.length);
    expect(calls[0]?.slice(0, 4)).toEqual([join(app, RES, "python/bin/python3"), "-I", "-B", "-c"]);
    expect(calls[0]?.[4]).toContain("engine-root");
    expect(calls[0]?.[4]).toMatch(/import anthropic$/);
  });

  it("fails when a module imports, or when python does not run", () => {
    expect(importProblems(app, fake(0).run)).toHaveLength(FORBIDDEN_MODULES.length);
    expect(importProblems(app, fake(null, new Error("ENOENT")).run)[0]).toMatch(/did not run/);
  });
});
