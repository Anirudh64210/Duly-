import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  KEEP_LAUNCHES,
  MILESTONES,
  Milestones,
  keepLast,
  launchedBefore,
  recordLaunch,
  sinceStart,
} from "./launch";

describe("the launch line (point 24)", () => {
  it("holds the version and the milestones reached, as numbers, and nothing else", () => {
    let now = 100.04;
    const marks = new Milestones(() => now);
    for (const name of MILESTONES) {
      marks.mark(name);
      now += 250.55;
    }
    const line = JSON.parse(marks.line("0.0.0")) as Record<string, unknown>;
    expect(Object.keys(line)).toEqual(["version", ...MILESTONES]);
    expect(line["version"]).toBe("0.0.0");
    expect(line["app_ready"]).toBe(100);
    expect(line["first_page_loaded"]).toBe(1603.3);
    for (const name of MILESTONES) expect(typeof line[name]).toBe("number");
  });

  it("names the seven milestones of the SPEC, process start being zero", () => {
    expect(MILESTONES).toEqual([
      "app_ready",
      "window_shown",
      "runtime_checked",
      "engine_spawned",
      "socket_ready",
      "health_ok",
      "first_page_loaded",
    ]);
  });

  it("keeps the first time of each milestone and leaves out the ones not reached", () => {
    let now = 5;
    const marks = new Milestones(() => now);
    marks.mark("app_ready");
    now = 9;
    marks.mark("app_ready");
    expect(marks.has("health_ok")).toBe(false);
    expect(marks.line("1.2.3")).toBe('{"version":"1.2.3","app_ready":5}');
  });

  it("counts from the process start", () => {
    const first = sinceStart();
    expect(first).toBeGreaterThan(0);
    expect(sinceStart()).toBeGreaterThanOrEqual(first);
  });
});

describe("the launch file (point 24)", () => {
  it("keeps the last 20 lines", () => {
    expect(KEEP_LAUNCHES).toBe(20);
    let text = "";
    for (let i = 1; i <= 25; i += 1) text = keepLast(text, `{"n":${i}}`);
    const lines = text.trimEnd().split("\n");
    expect(lines).toHaveLength(20);
    expect(lines[0]).toBe('{"n":6}');
    expect(lines[19]).toBe('{"n":25}');
  });

  it("is written for this user only", async () => {
    const folder = mkdtempSync(join(tmpdir(), "duly-launch-"));
    try {
      const file = join(folder, "launch-times.jsonl");
      await recordLaunch(file, '{"version":"0.0.0"}');
      await recordLaunch(file, '{"version":"0.0.1"}');
      expect(readFileSync(file, "utf8")).toBe('{"version":"0.0.0"}\n{"version":"0.0.1"}\n');
      expect(statSync(file).mode & 0o077).toBe(0);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("tells a first launch of this version from a later one", () => {
    const text = '{"version":"0.0.0","app_ready":3}\nnot json\n';
    expect(launchedBefore(text, "0.0.0")).toBe(true);
    expect(launchedBefore(text, "0.0.1")).toBe(false);
    expect(launchedBefore("", "0.0.0")).toBe(false);
  });
});
