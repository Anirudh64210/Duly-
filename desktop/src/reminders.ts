/**
 * Local notifications for planned reminders (SPEC-W2 point 22). The page plans each reminder
 * with a date from engine.schedule and its words; main shows it as one Notification at the
 * reminder time of day on that date, while Duly runs. Nothing here counts a day: main gives
 * this Mac's local date and time, and a reminder is shown when they reach its own.
 */
import { Notification } from "electron";

/** The reminders part of a saved state, already checked against $defs/state. */
interface Planned {
  on?: boolean;
  time_of_day?: string;
  planned?: readonly { id: string; on: string; title: string; body: string }[];
}

export function createReminders(): {
  set(reminders: unknown): void;
  tick(now: { date: string; time: string }): void;
} {
  let plan: Planned = {};
  // By id and date, so a plan saved again shows nothing twice, and a moved one shows again.
  const shown = new Set<string>();
  return {
    set(reminders) {
      plan = (reminders ?? {}) as Planned;
    },
    tick({ date, time }) {
      // With no time of day saved there is no planned time, so nothing is shown.
      if (plan.on !== true || plan.time_of_day === undefined || time < plan.time_of_day) return;
      if (!Notification.isSupported()) return;
      for (const reminder of plan.planned ?? []) {
        const key = `${reminder.id} ${reminder.on}`;
        if (reminder.on !== date || shown.has(key)) continue;
        shown.add(key);
        new Notification({ title: reminder.title, body: reminder.body }).show();
      }
    },
  };
}
