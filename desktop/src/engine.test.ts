import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { createServer } from "node:net";
import { PassThrough } from "node:stream";

import { describe, expect, it, vi } from "vitest";

import {
  ENGINE_HOST,
  HEALTH_WAIT_MS,
  LastLines,
  engineCommand,
  makeToken,
  pickFreePort,
  repoRoot,
  startEngine,
  waitForHealth,
  webDist,
  type Spawn,
} from "./engine";
import { TOKEN_HEADER } from "./protocol";

describe("the port", () => {
  it("is free on 127.0.0.1 and nowhere else", async () => {
    const port = await pickFreePort();
    expect(Number.isInteger(port)).toBe(true);
    expect(port).toBeGreaterThan(0);
    const server = createServer();
    await new Promise<void>((done) => server.listen(port, ENGINE_HOST, done));
    await new Promise<void>((done) => server.close(() => done()));
  });

  it("binds only 127.0.0.1", () => {
    expect(ENGINE_HOST).toBe("127.0.0.1");
  });
});

describe("the engine command", () => {
  it("runs the api from the repository root on this machine", () => {
    const run = engineCommand("/repo", 8123, "tok", { PATH: "/bin", DULY_ENV: "prod" });
    expect(run.command).toBe("uv");
    expect(run.args).toEqual([
      "run",
      "uvicorn",
      "api.main:app",
      "--host",
      "127.0.0.1",
      "--port",
      "8123",
    ]);
    expect(run.cwd).toBe("/repo");
    expect(run.env).toEqual({ PATH: "/bin", DULY_ENV: "dev", DULY_LOCAL_TOKEN: "tok" });
  });

  it("finds the root and the screen from the app's own location", () => {
    expect(repoRoot("/repo/desktop")).toBe("/repo");
    expect(webDist("/repo")).toBe("/repo/web/dist");
  });
});

describe("the token", () => {
  it("is 32 random bytes, new for each launch", () => {
    const one = makeToken();
    expect(one).toMatch(/^[0-9a-f]{64}$/);
    expect(makeToken()).not.toBe(one);
    expect(makeToken(() => new Uint8Array(32).fill(255))).toBe("ff".repeat(32));
  });

  it("refuses a short source of bytes", () => {
    expect(() => makeToken(() => new Uint8Array(16))).toThrow();
  });
});

describe("the last lines", () => {
  it("keeps only the last lines, across chunks", () => {
    const lines = new LastLines(3);
    lines.push("one\ntw");
    lines.push("o\nthree\r\nfour\nfi");
    expect(lines.lines()).toEqual(["three", "four", "fi"]);
    lines.push("ve\n");
    expect(lines.lines()).toEqual(["three", "four", "five"]);
  });
});

function clock() {
  let now = 0;
  return {
    now: () => now,
    sleep: async (ms: number) => {
      now += ms;
    },
  };
}

describe("waiting for /health", () => {
  it("is ready when /health answers 200, and sends the token", async () => {
    const time = clock();
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("refused"))
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response("", { status: 200 }));
    const ok = await waitForHealth({
      port: 9,
      token: "tok",
      fetch: fetcher,
      alive: () => true,
      ...time,
    });
    expect(ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
    const [address, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(address).toBe("http://127.0.0.1:9/health");
    expect(init.headers).toEqual({ [TOKEN_HEADER]: "tok" });
  });

  it("gives up after 30 seconds", async () => {
    expect(HEALTH_WAIT_MS).toBe(30_000);
    const time = clock();
    const fetcher = vi.fn().mockRejectedValue(new Error("refused"));
    const ok = await waitForHealth({
      port: 9,
      token: "t",
      fetch: fetcher,
      alive: () => true,
      ...time,
    });
    expect(ok).toBe(false);
    expect(time.now()).toBeGreaterThanOrEqual(30_000);
    expect(time.now()).toBeLessThan(31_000);
  });

  it("stops waiting when the process ends", async () => {
    const time = clock();
    const fetcher = vi.fn();
    const ok = await waitForHealth({
      port: 9,
      token: "t",
      fetch: fetcher,
      alive: () => false,
      ...time,
    });
    expect(ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

class FakeChild extends EventEmitter {
  stdout = new PassThrough();
  stderr = new PassThrough();
  pid = 424242;
  exitCode: number | null = null;
  signalCode: string | null = null;
  killed: string[] = [];
  kill(signal: string) {
    this.killed.push(signal);
    return true;
  }
  end(code: number) {
    this.exitCode = code;
    this.emit("exit", code, null);
  }
}

function fakeSpawn(child: FakeChild) {
  const calls: Parameters<Spawn>[] = [];
  const spawn: Spawn = (...args) => {
    calls.push(args);
    return child as unknown as ChildProcess;
  };
  return { spawn, calls };
}

const quick = { port: async () => 8123, token: () => "tok", ...clock() };

describe("the engine process", () => {
  it("starts the api and becomes ready", async () => {
    const child = new FakeChild();
    const { spawn, calls } = fakeSpawn(child);
    const engine = startEngine({
      appPath: "/repo/desktop",
      env: { PATH: "/bin" },
      spawn,
      fetch: async () => new Response("", { status: 200 }),
      ...quick,
    });
    expect(engine.view()).toEqual({ state: "starting" });
    expect(await engine.ready).toEqual({ state: "ready", port: 8123, token: "tok" });
    const [command, args, options] = calls[0] ?? [];
    expect(command).toBe("uv");
    expect(args).toContain("127.0.0.1");
    expect(options?.cwd).toBe("/repo");
    expect(options?.env?.["DULY_LOCAL_TOKEN"]).toBe("tok");
    expect(options?.env?.["DULY_ENV"]).toBe("dev");
  });

  it("says it could not start, with the last lines, when /health never answers", async () => {
    const child = new FakeChild();
    const { spawn } = fakeSpawn(child);
    const kill = vi.spyOn(process, "kill").mockImplementation(() => true);
    let written = false;
    try {
      const engine = startEngine({
        appPath: "/repo/desktop",
        env: {},
        spawn,
        fetch: async () => {
          if (!written) {
            written = true;
            child.stderr.write("ModuleNotFoundError: api\n");
          }
          await new Promise((done) => setImmediate(done));
          throw new Error("refused");
        },
        ...quick,
        timeoutMs: 1_000,
      });
      const view = await engine.ready;
      expect(view.state).toBe("failed");
      expect(view.state === "failed" && view.lines).toEqual(["ModuleNotFoundError: api"]);
      expect(kill).toHaveBeenCalledWith(-424242, "SIGTERM");
    } finally {
      kill.mockRestore();
    }
  });

  it("says it could not start when the process ends before it is ready", async () => {
    const child = new FakeChild();
    const { spawn } = fakeSpawn(child);
    const engine = startEngine({
      appPath: "/repo/desktop",
      env: {},
      spawn,
      fetch: async () => {
        child.end(1);
        throw new Error("refused");
      },
      ...quick,
    });
    expect((await engine.ready).state).toBe("failed");
  });

  it("says so when the process ends on its own after it was ready", async () => {
    const child = new FakeChild();
    const { spawn } = fakeSpawn(child);
    const engine = startEngine({
      appPath: "/repo/desktop",
      env: {},
      spawn,
      fetch: async () => new Response("", { status: 200 }),
      ...quick,
    });
    await engine.ready;
    const ended = vi.fn();
    engine.onEnded(ended);
    child.stderr.write("killed\n");
    await new Promise((done) => setImmediate(done));
    child.end(137);
    expect(engine.view()).toEqual({ state: "ended", lines: ["killed"] });
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it("ends the process group when stopped, and does not call that an ending of its own", async () => {
    const child = new FakeChild();
    const { spawn } = fakeSpawn(child);
    const kill = vi.spyOn(process, "kill").mockImplementation(() => {
      throw new Error("no group");
    });
    try {
      const engine = startEngine({
        appPath: "/repo/desktop",
        env: {},
        spawn,
        fetch: async () => new Response("", { status: 200 }),
        ...quick,
      });
      await engine.ready;
      const ended = vi.fn();
      engine.onEnded(ended);
      engine.stop();
      expect(kill).toHaveBeenCalledWith(-424242, "SIGTERM");
      expect(child.killed).toEqual(["SIGTERM"]);
      child.end(0);
      expect(ended).not.toHaveBeenCalled();
      expect(engine.view().state).toBe("ready");
    } finally {
      kill.mockRestore();
    }
  });

  it("says it could not start when the command cannot be run", async () => {
    const engine = startEngine({
      appPath: "/repo/desktop",
      env: {},
      spawn: () => {
        throw new Error("spawn uv ENOENT");
      },
      fetch: async () => new Response("", { status: 200 }),
      ...quick,
    });
    expect(await engine.ready).toEqual({ state: "failed", lines: ["Error: spawn uv ENOENT"] });
  });
});
