import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { randomBytes } from "node:crypto";

import type { EngineView } from "./pages";
import type { EngineCommand } from "./paths";
import { TOKEN_HEADER, fetchOverSocket, type SocketFetch } from "./protocol";
import type { SocketCheck } from "./socket";

/** How long the window waits for the engine to answer /health (SPEC-W1 point 23). */
export const HEALTH_WAIT_MS = 30_000;
/** The first launch after an install or an update: the runtime is new to this Mac. */
export const FIRST_HEALTH_WAIT_MS = 60_000;
export const HEALTH_POLL_MS = 250;

/** How many of the engine's last printed lines Copy details holds. */
export const LAST_LINES = 20;

/** Point 11: no Windows code in W1. */
export const NOT_ON_WINDOWS = "Duly's engine does not run on Windows yet.";
export const SOCKET_REFUSED =
  "The engine's socket is not this user's alone, so Duly did not use it.";

export function healthWaitMs(firstLaunch: boolean): number {
  return firstLaunch ? FIRST_HEALTH_WAIT_MS : HEALTH_WAIT_MS;
}

/** A token of 32 random bytes for this launch. */
export function makeToken(random: (size: number) => Uint8Array = randomBytes): string {
  const bytes = random(32);
  if (bytes.length !== 32) throw new Error("the token needs 32 random bytes");
  return Buffer.from(bytes).toString("hex");
}

/** Keeps the last lines the engine printed, for Copy details. */
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
  socket: string;
  token: string;
  fetch: SocketFetch;
  /** lstat and the checks of point 8, before every request. */
  check: () => SocketCheck;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  alive: () => boolean;
  timeoutMs?: number;
  pollMs?: number;
  /** Called once, when the socket is first there and safe. */
  onSocket?: () => void;
}

export type Health = "ok" | "gave_up" | "refused";

/** Waits until /health answers 200 over a socket that passes the checks, or gives up. */
export async function waitForHealth(wait: HealthWait): Promise<Health> {
  const timeout = wait.timeoutMs ?? HEALTH_WAIT_MS;
  const poll = wait.pollMs ?? HEALTH_POLL_MS;
  const start = wait.now();
  let seen = false;
  while (wait.alive() && wait.now() - start < timeout) {
    const check = wait.check();
    if (check === "refused") return "refused";
    if (check === "safe") {
      if (!seen) wait.onSocket?.();
      seen = true;
      try {
        const answer = await wait.fetch(wait.socket, "/health", {
          headers: { [TOKEN_HEADER]: wait.token },
          signal: AbortSignal.timeout(Math.max(1, Math.min(2_000, timeout))),
        });
        if (answer.status === 200) return "ok";
      } catch {
        // not listening yet
      }
    }
    await wait.sleep(poll);
  }
  return "gave_up";
}

export type Spawn = (command: string, args: string[], options: SpawnOptions) => ChildProcess;

export type EngineStep = "engine_spawned" | "socket_ready" | "health_ok";

export interface EngineDeps {
  command: EngineCommand;
  socket: string;
  check: () => SocketCheck;
  /** Checks the runtime before each start; a line refuses the start (point 17). */
  preflight?: () => Promise<string | null>;
  platform?: NodeJS.Platform;
  spawn?: Spawn;
  fetch?: SocketFetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  token?: () => string;
  timeoutMs?: number;
  /** The launch milestones the engine reaches (point 24). */
  step?: (name: EngineStep) => void;
}

export interface Engine {
  view(): EngineView;
  /** Resolves when the current start is ready or could not start. */
  readonly ready: Promise<EngineView>;
  /** Called each time the engine becomes ready, could not start, or ended on its own. */
  onChange(listener: (view: EngineView) => void): void;
  /** Try again: ends what is left of the last start and starts again. */
  restart(): void;
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

/** Starts the engine on this machine and follows it until it ends. */
export function startEngine(deps: EngineDeps): Engine {
  const spawn = deps.spawn ?? nodeSpawn;
  let current: EngineView = { state: "starting" };
  let child: ChildProcess | null = null;
  let stopping = false;
  const listeners: ((view: EngineView) => void)[] = [];

  const settle = (view: EngineView): EngineView => {
    current = view;
    for (const listener of listeners) listener(view);
    return view;
  };

  const attempt = async (): Promise<EngineView> => {
    if ((deps.platform ?? process.platform) === "win32") {
      return settle({ state: "failed", lines: [NOT_ON_WINDOWS] });
    }
    const refused = (await deps.preflight?.()) ?? null;
    if (refused !== null) return settle({ state: "failed", lines: [refused] });
    if (stopping) return current;

    const printed = new LastLines();
    const token = (deps.token ?? makeToken)();
    const run = deps.command;
    let mine: ChildProcess;
    try {
      mine = spawn(run.command, run.args, {
        cwd: run.cwd,
        env: run.env,
        stdio: ["pipe", "pipe", "pipe"],
        detached: true,
      });
    } catch (error) {
      return settle({ state: "failed", lines: [String(error)] });
    }
    child = mine;
    deps.step?.("engine_spawned");
    let exited = false;
    // Point 9: the token is the first line of stdin, never an argument or the environment.
    mine.stdin?.on("error", () => undefined);
    mine.stdin?.end(`${token}\n`);
    mine.stdout?.setEncoding("utf8");
    mine.stderr?.setEncoding("utf8");
    mine.stdout?.on("data", (chunk: string) => printed.push(chunk));
    mine.stderr?.on("data", (chunk: string) => printed.push(chunk));
    mine.on("error", (error) => {
      printed.push(`${String(error)}\n`);
      exited = true;
    });
    mine.on("exit", () => {
      exited = true;
      if (stopping || child !== mine) return;
      if (current.state === "ready") settle({ state: "ended", lines: printed.lines() });
    });
    const health = await waitForHealth({
      socket: deps.socket,
      token,
      fetch: deps.fetch ?? fetchOverSocket,
      check: deps.check,
      now: deps.now ?? Date.now,
      sleep: deps.sleep ?? ((ms) => new Promise((done) => setTimeout(done, ms))),
      alive: () => !exited && !stopping && child === mine,
      onSocket: () => deps.step?.("socket_ready"),
      ...(deps.timeoutMs === undefined ? {} : { timeoutMs: deps.timeoutMs }),
    });
    if (child !== mine) return current;
    if (health === "ok" && !exited && !stopping) {
      deps.step?.("health_ok");
      return settle({ state: "ready", socket: deps.socket, token });
    }
    endGroup(mine, "SIGTERM");
    const lines = health === "refused" ? [...printed.lines(), SOCKET_REFUSED] : printed.lines();
    return settle({ state: "failed", lines });
  };

  let ready = attempt();

  const end = (): void => {
    if (child === null) return;
    const running = child;
    endGroup(running, "SIGTERM");
    setTimeout(() => endGroup(running, "SIGKILL"), 5_000).unref();
  };

  return {
    view: () => current,
    get ready() {
      return ready;
    },
    onChange: (listener) => {
      listeners.push(listener);
    },
    restart: () => {
      if (stopping || current.state === "starting" || current.state === "ready") return;
      end();
      child = null;
      current = { state: "starting" };
      ready = attempt();
    },
    stop: () => {
      stopping = true;
      end();
    },
  };
}
