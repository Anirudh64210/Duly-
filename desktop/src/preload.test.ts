import { describe, expect, it, vi } from "vitest";

const exposed = vi.hoisted(() => [] as [string, unknown][]);
const asked = vi.hoisted(() => [] as unknown[][]);

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: (key: string, value: unknown) => exposed.push([key, value]),
  },
  ipcRenderer: {
    invoke: (...args: unknown[]) => {
      asked.push(args);
      return Promise.resolve({ ok: true });
    },
  },
}));

interface Exposed {
  version: string;
  platform: string;
  case: {
    read: () => Promise<unknown>;
    write: (value: unknown, ...more: unknown[]) => Promise<unknown>;
    clear: (...more: unknown[]) => Promise<unknown>;
  };
}

describe("the preload", () => {
  it("exposes the version, the platform and the case, engine and state bridges, and nothing else", async () => {
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
    expect(Object.keys(value as object).sort()).toEqual([
      "case",
      "engine",
      "platform",
      "state",
      "version",
    ]);
    const duly = value as Exposed;
    expect(duly.version).toBe("1.2.3");
    expect(duly.platform).toBe(process.platform);
    expect(Object.keys(duly.case).sort()).toEqual(["clear", "read", "write"]);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(duly.case)).toBe(true);
  });

  it("sends only the contract's calls, whatever else the page passes", async () => {
    const { CASE_CHANNEL } = await import("./preload");
    const duly = (exposed[0] ?? ["", null])[1] as Exposed;
    asked.length = 0;
    await duly.case.read();
    await duly.case.write({ categories: ["f1"] }, "/etc/passwd");
    await duly.case.clear("../duly.db");
    expect(asked).toEqual([
      [CASE_CHANNEL, { version: "v1", call: "case.read" }],
      [CASE_CHANNEL, { version: "v1", call: "case.write", case: { categories: ["f1"] } }],
      [CASE_CHANNEL, { version: "v1", call: "case.clear" }],
    ]);
  });
});
