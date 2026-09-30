import "@testing-library/jest-dom/vitest";
import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STATUS } from "./lib/fixtures";

// The two pages' entry files: each mounts its app in #root, and refuses to run without one.

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("fetch", () =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(STATUS) }),
  );
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  window.location.hash = "";
  vi.unstubAllGlobals();
});

describe("main.tsx", () => {
  it("opens Onboarding in #root with no case entered", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await act(() => import("./main"));
    expect(await screen.findByText("Which visa status do you hold now?")).toBeInTheDocument();
  });

  it("refuses to start without a root element", async () => {
    await expect(import("./main")).rejects.toThrow("no root element");
  });
});

describe("bench.tsx (programs.md section 9)", () => {
  it("mounts the engine bench in #root", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await act(() => import("./bench"));
    expect(document.getElementById("root")?.childElementCount).toBeGreaterThan(0);
  });

  it("refuses to start without a root element", async () => {
    await expect(import("./bench")).rejects.toThrow("no root element");
  });
});
