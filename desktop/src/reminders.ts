/**
 * Local notifications for planned reminders (SPEC-W2 point 22). The page plans each reminder
 * with a date from engine.schedule and its words; main shows it as one Notification at the
 * reminder time of day on that date, while Duly runs. Nothing here counts a day: main gives
 * this Mac's local date and time, and a reminder is shown when they reach its own.
 */
import { createHash } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Notification } from "electron";

/** Main's own file of the reminders it has shown (D96), never state.bin. */
export const SHOWN_FILE = "reminders-shown.json";

/** The reminders part of a saved state, already checked against $defs/state. */
interface Planned {
  on?: boolean;
  time_of_day?: string;
  planned?: readonly { id: string; on: string; title: string; body: string }[];
}

/** By id and date, hashed, so the file names no reminder and no date. */
function keyOf(reminder: { id: string; on: string }): string {
  return createHash("sha256").update(`${reminder.id} ${reminder.on}`).digest("hex");
}

/** The shown keys kept in folder; a missing or unreadable file is none shown yet. */
function readShown(folder: string): Set<string> {
  try {
    const kept = JSON.parse(readFileSync(join(folder, SHOWN_FILE), "utf8")) as unknown;
    return new Set(Array.isArray(kept) ? kept.filter((one) => typeof one === "string") : []);
  } catch {
    return new Set();
  }
}

/**
 * With a folder (main's userData), the shown keys outlast a relaunch, so a reminder is shown
 * once. Without one they are kept in memory only.
 */
export function createReminders(deps: { folder?: string } = {}): {
  set(reminders: unknown): void;
  tick(now: { date: string; time: string }): void;
} {
  const { folder } = deps;
  let plan: Planned = {};
  // A plan saved again shows nothing twice, and a moved one shows again.
  const shown = folder === undefined ? new Set<string>() : readShown(folder);
  const keep = () => {
    if (folder === undefined) return;
    // Only the keys of the plan as it is now, so the file never grows past it.
    const planned = new Set((plan.planned ?? []).map(keyOf));
    const path = join(folder, SHOWN_FILE);
    try {
      writeFileSync(`${path}.part`, JSON.stringify([...shown].filter((key) => planned.has(key))), {
        mode: 0o600,
      });
      renameSync(`${path}.part`, path);
    } catch {
      // Not kept: the reminder may show again after a relaunch, and nothing else is lost.
    }
  };
  return {
    set(reminders) {
      plan = (reminders ?? {}) as Planned;
    },
    tick({ date, time }) {
      // With no time of day saved there is no planned time, so nothing is shown.
      if (plan.on !== true || plan.time_of_day === undefined || time < plan.time_of_day) return;
      if (!Notification.isSupported()) return;
      let added = false;
      for (const reminder of plan.planned ?? []) {
        const key = keyOf(reminder);
        if (reminder.on !== date || shown.has(key)) continue;
        shown.add(key);
        added = true;
        new Notification({ title: reminder.title, body: reminder.body }).show();
      }
      if (added) keep();
    },
  };
}
