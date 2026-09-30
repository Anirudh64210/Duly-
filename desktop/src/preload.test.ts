import { describe, expect, it, vi } from "vitest";

const exposed = vi.hoisted(() => [] as [string, unknown][]);

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: (key: string, value: unknown) => exposed.push([key, value]),
  },
}));

describe("the preload", () => {
  it("exposes the version and the platform, and nothing else", async () => {
    const argv = process.argv;
    process.argv = [...argv, "--duly-version=1.2.3"];
    try {
      const { versionFrom } = await import("./preload");
      expect(versionFrom(["--duly-version=0.4.0"])).toBe("0.4.0");
      expect(versionFrom([])).toBe("");
    } finally {
      process.argv = argv;
    }
    expect(exposed).toHaveLength(1);
    const [key, value] = exposed[0] ?? ["", null];
    expect(key).toBe("duly");
    expect(value).toEqual({ version: "1.2.3", platform: process.platform });
    expect(Object.isFrozen(value)).toBe(true);
  });
});
