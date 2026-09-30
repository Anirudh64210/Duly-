import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { join, resolve } from "node:path";

import type { EngineView } from "./pages";
import { TOKEN_HEADER } from "./protocol";

/** The only address the engine ever binds. */
export const ENGINE_HOST = "127.0.0.1";

/** How long the window waits for the engine to answer /health. */
export const HEALTH_WAIT_MS = 30_000;
export const HEALTH_POLL_MS = 250;

/** How many of the engine's last printed lines the window shows when it could not start. */
export const LAST_LINES = 20;

/**
 * The repository root, from the app's own location. The app is the desktop folder,
 * and the root is the folder above it. Nothing is taken from the screen.
 */
export function repoRoot(appPath: string): string {
  return resolve(appPath, "..");
}

export function webDist(root: string): string {
  return join(root, "web", "dist");
}

/** A token of 32 random bytes for this launch. */
export function makeToken(random: (size: number) => Uint8Array = randomBytes): string {
  const bytes = random(32);
  if (bytes.length !== 32) throw new Error("the token needs 32 random bytes");
  return Buffer.from(bytes).toString("hex");
}

export interface EngineCommand {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string | undefined>;
}

/** The command that starts the api on this machine, on the given port, with this token. */
export function engineCommand(
  root: string,
  port: number,
  token: string,
  env: Readonly<Record<string, string | undefined>>,
): EngineCommand {
  return {
    command: "uv",
    args: ["run", "uvicorn", "api.main:app", "--host", ENGINE_HOST, "--port", String(port)],
    cwd: root,
    env: { ...env, DULY_ENV: "dev", DULY_LOCAL_TOKEN: token },
  };
}

/** A free port on 127.0.0.1, found by binding port 0 there and letting it go. */
export function pickFreePort(): Promise<number> {
  return new Promise((done, fail) => {
    const server = createServer();
    server.unref();
    server.once("error", fail);
    server.listen({ port: 0, host: ENGINE_HOST, exclusive: true }, () => {
      const address = server.address();
      server.close(() => {
        if (address !== null && typeof address === "object") done(address.port);
        else fail(new Error("no port was given"));
      });
    });
  });
}

/** Keeps the last lines the engine printed, for the page shown when it could not start. */
export class LastLines {
  private readonly kept: string[] = [];
  private partial = "";

  constructor(private readonly limit: number = LAST_LINES) {}

  push(chunk: string): void {
    const parts = (this.partial + chunk).split(/\r?\n/);
    this.partial = parts.pop() ?? "";
    for (const line of parts) this.keep(line);
  }

  lines(): string[] {
    return this.partial === "" ? [...this.kept] : [...this.kept, this.partial].slice(-this.limit);
  }

  private keep(line: string): void {
    this.kept.push(line);
    if (this.kept.length > this.limit) this.kept.shift();
  }
}

export interface HealthWait {
  port: number;
  token: string;
  fetch: (input: string, init: RequestInit) => Promise<Response>;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  alive: () => boolean;
  timeoutMs?: number;
  pollMs?: number;
}

/** Waits until /health answers 200, for at most 30 seconds, or until the process ends. */
export async function waitForHealth(wait: HealthWait): Promise<boolean> {
  const timeout = wait.timeoutMs ?? HEALTH_WAIT_MS;
  const poll = wait.pollMs ?? HEALTH_POLL_MS;
  const start = wait.now();
  const address = `http://${ENGINE_HOST}:${wait.port}/health`;
  while (wait.alive() && wait.now() - start < timeout) {
    try {
      const answer = await wait.fetch(address, {
        headers: { [TOKEN_HEADER]: wait.token },
        signal: AbortSignal.timeout(Math.max(1, Math.min(2_000, timeout))),
      });
      if (answer.status === 200) return true;
    } catch {
      // not listening yet
    }
    await wait.sleep(poll);
  }
  return false;
}

export type Spawn = (command: string, args: string[], options: SpawnOptions) => ChildProcess;

export interface EngineDeps {
  appPath: string;
  env: Readonly<Record<string, string | undefined>>;
  spawn?: Spawn;
  fetch?: HealthWait["fetch"];
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  port?: () => Promise<number>;
  token?: () => string;
  timeoutMs?: number;
}

export interface Engine {
  view(): EngineView;
  /** Resolves when the engine is ready or could not start. */
  ready: Promise<EngineView>;
  /** Called once if the process ends while nobody asked it to. */
  onEnded(listener: () => void): void;
  stop(): void;
}

function endGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

/** Starts the api on this machine and follows it until it ends. */
export function startEngine(deps: EngineDeps): Engine {
  const spawn = deps.spawn ?? nodeSpawn;
  const printed = new LastLines();
  let current: EngineView = { state: "starting" };
  let child: ChildProcess | null = null;
  let stopping = false;
  let exited = false;
  const listeners: (() => void)[] = [];

  const ready = (async (): Promise<EngineView> => {
    const port = await (deps.port ?? pickFreePort)();
    const token = (deps.token ?? makeToken)();
    const run = engineCommand(repoRoot(deps.appPath), port, token, deps.env);
    try {
      child = spawn(run.command, run.args, {
        cwd: run.cwd,
        env: run.env,
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
      });
    } catch (error) {
      current = { state: "failed", lines: [String(error)] };
      return current;
    }
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => printed.push(chunk));
    child.stderr?.on("data", (chunk: string) => printed.push(chunk));
    child.on("error", (error) => {
      printed.push(`${String(error)}\n`);
      exited = true;
    });
    child.on("exit", () => {
      exited = true;
      if (stopping) return;
      if (current.state === "ready") {
        current = { state: "ended", lines: printed.lines() };
        for (const listener of listeners.splice(0)) listener();
      }
    });
    const healthy = await waitForHealth({
      port,
      token,
      fetch: deps.fetch ?? fetch,
      now: deps.now ?? Date.now,
      sleep: deps.sleep ?? ((ms) => new Promise((done) => setTimeout(done, ms))),
      alive: () => !exited && !stopping,
      ...(deps.timeoutMs === undefined ? {} : { timeoutMs: deps.timeoutMs }),
    });
    if (healthy && !exited && !stopping) {
      current = { state: "ready", port, token };
    } else {
      if (child !== null) endGroup(child, "SIGTERM");
      current = { state: "failed", lines: printed.lines() };
    }
    return current;
  })();

  return {
    view: () => current,
    ready,
    onEnded: (listener) => {
      listeners.push(listener);
    },
    stop: () => {
      stopping = true;
      if (child === null) return;
      const running = child;
      endGroup(running, "SIGTERM");
      setTimeout(() => endGroup(running, "SIGKILL"), 5_000).unref();
    },
  };
}
