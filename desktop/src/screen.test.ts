import { describe, expect, it } from "vitest";

import {
  READ_SCREEN,
  SMOKE_WAIT_MS,
  VERDICT_HEADING,
  headingShown,
  screenJson,
  smokeExitCode,
  smokeFolder,
  toScreenRead,
} from "./screen";

describe("the smoke folder", () => {
  it("is the argument after --smoke", () => {
    expect(smokeFolder(["electron", ".", "--smoke", "/tmp/out"])).toBe("/tmp/out");
    expect(smokeFolder(["electron", ".", "--smoke=/tmp/out"])).toBe("/tmp/out");
  });

  it("is null for a normal launch", () => {
    expect(smokeFolder(["electron", "."])).toBeNull();
  });

  it("is an error when the folder is missing", () => {
    expect(() => smokeFolder(["electron", ".", "--smoke"])).toThrow();
    expect(() => smokeFolder(["electron", ".", "--smoke", "--other"])).toThrow();
    expect(() => smokeFolder(["electron", ".", "--smoke="])).toThrow();
  });
});

describe("reading the screen", () => {
  it("waits 40 seconds for the verdict heading", () => {
    expect(SMOKE_WAIT_MS).toBe(40_000);
    expect(READ_SCREEN).toContain(JSON.stringify(VERDICT_HEADING));
  });

  it("takes what the page gave without trusting its shape", () => {
    expect(toScreenRead(null)).toEqual({ title: "", headings: [], footer: "", verdict: "" });
    expect(toScreenRead({ title: 3, headings: ["a", 4], footer: "f", verdict: "v" })).toEqual({
      title: "",
      headings: ["a", ""],
      footer: "f",
      verdict: "v",
    });
  });

  it("knows when the heading appeared", () => {
    expect(headingShown(toScreenRead({ verdict: "Can't tell yet" }))).toBe(true);
    expect(headingShown(toScreenRead({}))).toBe(false);
  });

  it("writes the title, the headings and the footer", () => {
    const read = toScreenRead({ title: "Duly", headings: ["h"], footer: "f", verdict: "h" });
    expect(JSON.parse(screenJson(read))).toEqual({ title: "Duly", headings: ["h"], footer: "f" });
  });

  it("exits 0 only when the heading appeared", () => {
    expect(smokeExitCode(true)).toBe(0);
    expect(smokeExitCode(false)).toBe(1);
  });
});
