import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = join(__dirname, "..", "scripts", "build-python.sh");
const RUNTIME = JSON.parse(
  readFileSync(join(__dirname, "..", "python", "runtime.json"), "utf8"),
) as { url: string; asset: string; sha256: string };

let root: string;

function put(rel: string, text = "x"): void {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

/** A fake repository: the two json files, the allowlisted sources, and what is left out. */
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "duly-build-"));
  put("desktop/python/runtime.json", JSON.stringify(RUNTIME));
  put(
    "desktop/python/bundle.json",
    JSON.stringify({
      include: [
        "engine",
        "api/case.py",
        "desktop/python/duly_engine.py",
        "rulepacks/*/v*/parameters.yaml",
      ],
    }),
  );
  put("desktop/python/duly_engine.py");
  put("engine/path.py");
  put("engine/data/table.yaml");
  put("engine/__pycache__/path.cpython-312.pyc");
  put("api/case.py");
  put("api/main.py");
  put("rulepacks/f1-us/v2026.09/parameters.yaml");
  put("rulepacks/f1-us/v2026.09/sources/fr.xml");
  put("assistant/providers.py");
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function build(...args: string[]) {
  return spawnSync("bash", [SCRIPT, ...args], {
    env: { ...process.env, DULY_ROOT: root },
    encoding: "utf8",
  });
}

describe("build-python.sh --dry-run (point 15)", () => {
  it("prints the five steps in order and changes nothing", () => {
    const run = build("--dry-run");
    expect(run.status, run.stderr).toBe(0);
    const out = run.stdout;
    const steps = ["step 1", "step 2", "step 3", "step 4", "step 5"].map((s) => out.indexOf(s));
    expect(steps.every((at) => at >= 0)).toBe(true);
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
    expect(out).toContain(RUNTIME.url);
    expect(out).toContain(`would check SHA-256 ${RUNTIME.sha256}`);
    expect(out).toContain("--frozen --only-group desktop");
    expect(out).toContain("--require-hashes --only-binary :all: --no-deps");
    expect(out).toContain("-m compileall");
    expect(out).toContain("manifest.mjs");
    expect(existsSync(join(root, "desktop", "build"))).toBe(false);
  });

  it("copies exactly the allowlisted files, keeping their paths, the launcher at the top", () => {
    const copies = build("--dry-run")
      .stdout.split("\n")
      .filter((line) => line.startsWith("copy "));
    expect(copies).toEqual([
      "copy engine/data/table.yaml -> engine-root/engine/data/table.yaml",
      "copy engine/path.py -> engine-root/engine/path.py",
      "copy api/case.py -> engine-root/api/case.py",
      "copy desktop/python/duly_engine.py -> engine-root/duly_engine.py",
      "copy rulepacks/f1-us/v2026.09/parameters.yaml -> engine-root/rulepacks/f1-us/v2026.09/parameters.yaml",
    ]);
  });

  it("fails loudly on a pattern that matches no file", () => {
    put(
      "desktop/python/bundle.json",
      JSON.stringify({ include: ["engine", "api/desktop_main.py"] }),
    );
    const run = build("--dry-run");
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("api/desktop_main.py, which matches no file");
  });

  it("copies an optional pattern's files when it matches, and passes when it matches none", () => {
    // D96: pipeline/published/*.json is optional, as the folder is empty until an update is
    // approved. An include pattern that matches nothing still fails (the test above).
    const bundle = (optional: string[]) =>
      put("desktop/python/bundle.json", JSON.stringify({ include: ["api/case.py"], optional }));
    bundle(["pipeline/published/*.json"]);
    const empty = build("--dry-run");
    expect(empty.status, empty.stderr).toBe(0);
    expect(empty.stdout).not.toContain("pipeline/");

    put("pipeline/published/an-update.json", "{}");
    put("pipeline/drafts/a-draft.json", "{}");
    const copies = build("--dry-run")
      .stdout.split("\n")
      .filter((line) => line.startsWith("copy "));
    expect(copies).toEqual([
      "copy api/case.py -> engine-root/api/case.py",
      "copy pipeline/published/an-update.json -> engine-root/pipeline/published/an-update.json",
    ]);
  });

  it("leaves out every PROGRESS.md and REPORT.json, an agent's work log", () => {
    // Audit 2026-10-03: engine/PROGRESS.md shipped inside the app with the engine folder.
    put("engine/PROGRESS.md", "notes");
    put("engine/data/REPORT.json", "{}");
    const run = build("--dry-run");
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).not.toContain("PROGRESS.md");
    expect(run.stdout).not.toContain("REPORT.json");
    expect(run.stdout).toContain("copy engine/path.py -> engine-root/engine/path.py");
  });

  it("refuses a download whose SHA-256 differs from runtime.json, and unpacks nothing", () => {
    put(`desktop/build/download/${RUNTIME.asset}`, "not the runtime");
    const run = build();
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain(`runtime.json says ${RUNTIME.sha256}`);
    expect(existsSync(join(root, "desktop", "build", "download", RUNTIME.asset))).toBe(false);
    expect(existsSync(join(root, "desktop", "build", "python"))).toBe(false);
  });

  it("takes no other argument", () => {
    expect(build("--fast").status).toBe(2);
  });
});
