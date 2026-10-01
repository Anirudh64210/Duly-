import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

import { describe, expect, it, vi } from "vitest";

import {
  FIRST_HEALTH_WAIT_MS,
  HEALTH_WAIT_MS,
  LastLines,
  NOT_ON_WINDOWS,
  SOCKET_REFUSED,
  healthWaitMs,
  makeToken,
  startEngine,
  waitForHealth,
  type EngineDeps,
  type Spawn,
} from "./engine";
import { appPaths, engineCommand } from "./paths";
import { TOKEN_HEADER } from "./protocol";
import type { SocketCheck } from "./socket";

const SOCK = "/Users/ani/Library/Application Support/Duly/run/engine.sock";
const RES = "/Applications/Duly.app/Contents/Resources";
const PACKAGED = engineCommand(
  appPaths({ packaged: true, appPath: `${RES}/app.asar`, resourcesPath: RES }),
  SOCK,
  { PATH: "/opt/homebrew/bin", HOME: "/Users/ani", TMPDIR: "/tmp/", DULY_ENV: "dev" },
);
const REPO = engineCommand(
  appPaths({ packaged: false, appPath: "/repo/desktop", resourcesPath: "/x" }),
  SOCK,
  { PATH: "/bin", HOME: "/Users/ani", DULY_ENV: "prod" },
);

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

const safe = (): SocketCheck => "safe";

describe("the health wait (point 23)", () => {
  it("is 30 seconds, and 60 for the first launch after an install or update", () => {
    expect(HEALTH_WAIT_MS).toBe(30_000);
    expect(FIRST_HEALTH_WAIT_MS).toBe(60_000);
    expect(healthWaitMs(false)).toBe(30_000);
    expect(healthWaitMs(true)).toBe(60_000);
  });

  it("is ready when /health answers 200 over the socket, and sends the token", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("refused"))
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response("", { status: 200 }));
    const onSocket = vi.fn();
    const ok = await waitForHealth({
      socket: SOCK,
      token: "tok",
      fetch: fetcher,
      check: safe,
      alive: () => true,
      onSocket,
      ...clock(),
    });
    expect(ok).toBe("ok");
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(onSocket).toHaveBeenCalledTimes(1);
    const [socket, path, init] = fetcher.mock.calls[0] as [string, string, RequestInit];
    expect(socket).toBe(SOCK);
    expect(path).toBe("/health");
    expect(init.headers).toEqual({ [TOKEN_HEADER]: "tok" });
  });

  it("gives up after 30 seconds, or 60 when asked", async () => {
    for (const timeoutMs of [undefined, 60_000]) {
      const time = clock();
      const fetcher = vi.fn().mockRejectedValue(new Error("refused"));
      const ok = await waitForHealth({
        socket: SOCK,
        token: "t",
        fetch: fetcher,
        check: safe,
        alive: () => true,
        ...time,
        ...(timeoutMs === undefined ? {} : { timeoutMs }),
      });
      const limit = timeoutMs ?? 30_000;
      expect(ok).toBe("gave_up");
      expect(time.now()).toBeGreaterThanOrEqual(limit);
      expect(time.now()).toBeLessThan(limit + 1_000);
    }
  });

  it("does not talk to a socket that is not there yet, nor to one that fails the checks", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
    const checks: SocketCheck[] = ["missing", "missing", "refused"];
    const ok = await waitForHealth({
      socket: SOCK,
      token: "t",
      fetch: fetcher,
      check: () => checks.shift() ?? "safe",
      alive: () => true,
      ...clock(),
    });
    expect(ok).toBe("refused");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("stops waiting when the process ends", async () => {
    const fetcher = vi.fn();
    const ok = await waitForHealth({
      socket: SOCK,
      token: "t",
      fetch: fetcher,
      check: safe,
      alive: () => false,
      ...clock(),
    });
    expect(ok).toBe("gave_up");
    expect(fetcher).not.toHaveBeenCalled();
  });
});

class FakeChild extends EventEmitter {
  stdin = new PassThrough();
  stdout = new PassThrough();
  stderr = new PassThrough();
  pid = 424242;
  exitCode: number | null = null;
  signalCode: string | null = null;
  killed: string[] = [];
  written = "";
  constructor() {
    super();
    this.stdin.on("data", (chunk: Buffer) => {
      this.written += chunk.toString();
    });
  }
  kill(signal: string) {
    this.killed.push(signal);
    return true;
  }
  end(code: number) {
    this.exitCode = code;
    this.emit("exit", code, null);
  }
}

function fakeSpawn(...children: FakeChild[]) {
  const calls: Parameters<Spawn>[] = [];
  const spawn: Spawn = (...args) => {
    calls.push(args);
    const next = children.shift();
    if (next === undefined) throw new Error("no more children");
    return next as unknown as ChildProcess;
  };
  return { spawn, calls };
}

function deps(spawn: Spawn, more: Partial<EngineDeps> = {}): EngineDeps {
  return {
    command: REPO,
    socket: SOCK,
    check: safe,
    platform: "darwin",
    spawn,
    fetch: async () => new Response("", { status: 200 }),
    token: () => "tok",
    ...clock(),
    ...more,
  };
}

describe("the engine process", () => {
  it("starts the command it is given and becomes ready on the socket", async () => {
    const child = new FakeChild();
    const { spawn, calls } = fakeSpawn(child);
    const steps: string[] = [];
    const engine = startEngine(deps(spawn, { step: (name) => steps.push(name) }));
    expect(engine.view()).toEqual({ state: "starting" });
    expect(await engine.ready).toEqual({ state: "ready", socket: SOCK, token: "tok" });
    const [command, args, options] = calls[0] ?? [];
    expect(command).toBe("uv");
    expect(args).toEqual(REPO.args);
    expect(options?.cwd).toBe("/repo");
    expect(options?.env).toEqual(REPO.env);
    expect(options?.env?.["DULY_ENV"]).toBe("dev");
    expect(steps).toEqual(["engine_spawned", "socket_ready", "health_ok"]);
  });

  it("starts the bundled engine with DULY_ENV=desktop when packaged (points 4 and 16)", async () => {
    const child = new FakeChild();
    const { spawn, calls } = fakeSpawn(child);
    await startEngine(deps(spawn, { command: PACKAGED })).ready;
    const [command, args, options] = calls[0] ?? [];
    expect(command).toBe(`${RES}/python/bin/python3`);
    expect(args).toEqual([
      "-I",
      "-B",
      `${RES}/engine-root/duly_engine.py`,
      "--mode",
      "packaged",
      "--socket",
      SOCK,
    ]);
    expect(options?.cwd).toBe(`${RES}/engine-root`);
    expect(options?.env).toEqual({
      PATH: "/usr/bin:/bin",
      HOME: "/Users/ani",
      TMPDIR: "/tmp/",
      DULY_ENV: "desktop",
    });
  });

  it("writes the token to stdin, closes it, and keeps it out of argv and env (point 9)", async () => {
    const child = new FakeChild();
    const { spawn, calls } = fakeSpawn(child);
    const secret = "ab".repeat(32);
    await startEngine(deps(spawn, { command: PACKAGED, token: () => secret })).ready;
    const [command, args, options] = calls[0] ?? [];
    expect(child.written).toBe(`${secret}\n`);
    expect(child.stdin.writableEnded).toBe(true);
    expect(options?.stdio).toEqual(["pipe", "pipe", "pipe"]);
    expect(JSON.stringify([command, args, options?.env])).not.toContain(secret);
  });

  it("refuses to start on Windows with a plain line, and spawns nothing (point 11)", async () => {
    const { spawn, calls } = fakeSpawn(new FakeChild());
    const engine = startEngine(deps(spawn, { platform: "win32" }));
    expect(await engine.ready).toEqual({ state: "failed", lines: [NOT_ON_WINDOWS] });
    expect(calls).toHaveLength(0);
  });

  it("refuses to start when the runtime check finds a difference (point 17)", async () => {
    const { spawn, calls } = fakeSpawn(new FakeChild());
    const engine = startEngine(
      deps(spawn, { preflight: async () => "A file of Duly's engine has changed: x" }),
    );
    expect(await engine.ready).toEqual({
      state: "failed",
      lines: ["A file of Duly's engine has changed: x"],
    });
    expect(calls).toHaveLength(0);
  });

  it("treats a socket that fails the checks as an engine that could not start (point 8)", async () => {
    const child = new FakeChild();
    const { spawn } = fakeSpawn(child);
    const fetcher = vi.fn();
    const kill = vi.spyOn(process, "kill").mockImplementation(() => true);
    try {
      const engine = startEngine(deps(spawn, { check: () => "refused", fetch: fetcher }));
      expect(await engine.ready).toEqual({ state: "failed", lines: [SOCKET_REFUSED] });
      expect(fetcher).not.toHaveBeenCalled();
      expect(kill).toHaveBeenCalledWith(-424242, "SIGTERM");
    } finally {
      kill.mockRestore();
    }
  });

  it("says it could not start, with the last lines, when /health never answers", async () => {
    const child = new FakeChild();
    const { spawn } = fakeSpawn(child);
    const kill = vi.spyOn(process, "kill").mockImplementation(() => true);
    let written = false;
    try {
      const engine = startEngine(
        deps(spawn, {
          fetch: async () => {
            if (!written) {
              written = true;
              child.stderr.write("ModuleNotFoundError: api\n");
            }
            await new Promise((done) => setImmediate(done));
            throw new Error("refused");
          },
          timeoutMs: 1_000,
        }),
      );
      const view = await engine.ready;
      expect(view).toEqual({ state: "failed", lines: ["ModuleNotFoundError: api"] });
      expect(kill).toHaveBeenCalledWith(-424242, "SIGTERM");
    } finally {
      kill.mockRestore();
    }
  });

  it("says it could not start when the process ends before it is ready", async () => {
    const child = new FakeChild();
    const { spawn } = fakeSpawn(child);
    const engine = startEngine(
      deps(spawn, {
        fetch: async () => {
          child.end(1);
          throw new Error("refused");
        },
      }),
    );
    expect((await engine.ready).state).toBe("failed");
  });

  it("says so when the process ends on its own after it was ready", async () => {
    const child = new FakeChild();
    const { spawn } = fakeSpawn(child);
    const engine = startEngine(deps(spawn));
    await engine.ready;
    const changed = vi.fn();
    engine.onChange(changed);
    child.stderr.write("killed\n");
    await new Promise((done) => setImmediate(done));
    child.end(137);
    expect(engine.view()).toEqual({ state: "ended", lines: ["killed"] });
    expect(changed).toHaveBeenCalledWith({ state: "ended", lines: ["killed"] });
  });

  it("starts again on Try again, after it could not start or ended (point 23)", async () => {
    const first = new FakeChild();
    const second = new FakeChild();
    const { spawn, calls } = fakeSpawn(first, second);
    const kill = vi.spyOn(process, "kill").mockImplementation(() => true);
    try {
      let answer = 503;
      const engine = startEngine(
        deps(spawn, {
          fetch: async () => new Response("", { status: answer }),
          timeoutMs: 1_000,
        }),
      );
      expect((await engine.ready).state).toBe("failed");
      const changed = vi.fn();
      engine.onChange(changed);
      answer = 200;
      engine.restart();
      expect(engine.view()).toEqual({ state: "starting" });
      expect(await engine.ready).toEqual({ state: "ready", socket: SOCK, token: "tok" });
      expect(calls).toHaveLength(2);
      expect(changed).toHaveBeenCalledWith({ state: "ready", socket: SOCK, token: "tok" });
      // the first child's late exit does not end the second start
      first.end(1);
      expect(engine.view().state).toBe("ready");
      // Try again does nothing while ready
      engine.restart();
      expect(calls).toHaveLength(2);
    } finally {
      kill.mockRestore();
    }
  });

  it("ends the process group when stopped, and does not call that an ending of its own", async () => {
    const child = new FakeChild();
    const { spawn } = fakeSpawn(child);
    const kill = vi.spyOn(process, "kill").mockImplementation(() => {
      throw new Error("no group");
    });
    try {
      const engine = startEngine(deps(spawn));
      await engine.ready;
      const changed = vi.fn();
      engine.onChange(changed);
      engine.stop();
      expect(kill).toHaveBeenCalledWith(-424242, "SIGTERM");
      expect(child.killed).toEqual(["SIGTERM"]);
      child.end(0);
      expect(changed).not.toHaveBeenCalled();
      expect(engine.view().state).toBe("ready");
      engine.restart();
      expect(engine.view().state).toBe("ready");
    } finally {
      kill.mockRestore();
    }
  });

  it("says it could not start when the command cannot be run", async () => {
    const engine = startEngine(
      deps(() => {
        throw new Error("spawn uv ENOENT");
      }),
    );
    expect(await engine.ready).toEqual({ state: "failed", lines: ["Error: spawn uv ENOENT"] });
  });
});
