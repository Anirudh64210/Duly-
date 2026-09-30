// @vitest-environment node
/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// resolutions points 16 and 17: the engine samples under web/samples are the engine's own
// output, made by web/samples/make.py through `make samples`. This test fails when a sample
// has drifted.
const root = fileURLToPath(new URL("../../..", import.meta.url));

describe("Engine samples", () => {
  it("are what the engine gives for their cases today", () => {
    const run = spawnSync("uv", ["run", "python", "web/samples/make.py", "--check"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(run.error).toBeUndefined();
    expect(run.stderr.split("\n").filter((line) => line.includes("web/samples/"))).toEqual([]);
    expect(run.status).toBe(0);
  }, 120_000);
});
