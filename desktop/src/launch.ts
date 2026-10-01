/**
 * Each launch measured on this Mac and kept here (SPEC-W1 point 24). One line per launch in
 * <userData>/launch-times.jsonl, the last 20 kept: the app version and milliseconds since the
 * process started, nothing else. Never sent anywhere.
 */
import { promises as fs } from "node:fs";

export const LAUNCH_FILE = "launch-times.jsonl";
export const KEEP_LAUNCHES = 20;

/** In the order they happen; process start is zero. */
export const MILESTONES = [
  "app_ready",
  "window_shown",
  "runtime_checked",
  "engine_spawned",
  "socket_ready",
  "health_ok",
  "first_page_loaded",
] as const;
export type Milestone = (typeof MILESTONES)[number];

// The process started this long before this module was loaded.
const ORIGIN = process.hrtime.bigint() - BigInt(Math.round(process.uptime() * 1e9));

/** Milliseconds since the process started, from process.hrtime. */
export function sinceStart(): number {
  return Number(process.hrtime.bigint() - ORIGIN) / 1e6;
}

export class Milestones {
  private readonly marks = new Map<Milestone, number>();

  constructor(private readonly now: () => number = sinceStart) {}

  /** The first time only: a restart does not move a milestone. */
  mark(name: Milestone): void {
    if (!this.marks.has(name)) this.marks.set(name, this.now());
  }

  has(name: Milestone): boolean {
    return this.marks.has(name);
  }

  /** One line: the version and each milestone reached, to a tenth of a millisecond. */
  line(version: string): string {
    const out: Record<string, string | number> = { version };
    for (const name of MILESTONES) {
      const at = this.marks.get(name);
      if (at !== undefined && Number.isFinite(at)) out[name] = Math.round(at * 10) / 10;
    }
    return JSON.stringify(out);
  }
}

/** The file's text with this line added and only the last 20 kept. */
export function keepLast(text: string, line: string, keep: number = KEEP_LAUNCHES): string {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  return `${[...lines, line].slice(-keep).join("\n")}\n`;
}

/** Has this version been launched before? Not, after an install or an update. */
export function launchedBefore(text: string, version: string): boolean {
  return text.split("\n").some((l) => {
    try {
      return (JSON.parse(l) as { version?: unknown }).version === version;
    } catch {
      return false;
    }
  });
}

export async function readLaunches(path: string): Promise<string> {
  try {
    return await fs.readFile(path, "utf8");
  } catch {
    return "";
  }
}

export async function recordLaunch(path: string, line: string): Promise<void> {
  await fs.writeFile(path, keepLast(await readLaunches(path), line), { mode: 0o600 });
}
