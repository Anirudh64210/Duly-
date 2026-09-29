import { z } from "zod";

import type { components } from "./api-types";

export const VERDICT_STATES = ["no_open_items", "needs_you", "talk_to_dso", "cannot_tell"] as const;
export type VerdictState = (typeof VERDICT_STATES)[number];

export const statusSchema = z.strictObject({
  database: z.enum(["ok", "unreachable"]),
  rulepacks: z.array(
    z.strictObject({
      category: z.string(),
      version: z.string(),
      parameters: z.number().int().nonnegative(),
      // SPEC-resolutions point 45: the oldest day the pack's rules were checked.
      rules_checked_on: z.string().nullable().exactOptional(),
    }),
  ),
  verdict: z.strictObject({
    state: z.enum(VERDICT_STATES),
    reasons: z.array(z.string()),
  }),
  checked_at: z.string(),
});

export type Status = z.infer<typeof statusSchema>;

// The contract and the parser must describe the same shape.
type Contract = components["schemas"]["Status"];
export const contractMatches: Status extends Contract ? true : never = true;

export async function fetchStatus(get: typeof fetch = fetch): Promise<Status> {
  const response = await get("/api/v1/status");
  if (!response.ok) throw new Error(`status ${response.status}`);
  return statusSchema.parse(await response.json());
}

const HEADLINES: Record<VerdictState, string> = {
  no_open_items: "No open items in what you've added",
  needs_you: "One thing needs you",
  talk_to_dso: "A question for your DSO",
  cannot_tell: "Can't tell yet",
};

const REASONS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    no_documents: "Nothing has been added yet.",
    rules_never_checked: "The rules have not been checked yet.",
    rules_stale: "The rules have not been checked this week.",
    rule_in_litigation:
      "A court paused a change to a rule that applies here, and the two rules give different dates.",
  }),
);

export function headline(state: VerdictState): string {
  return HEADLINES[state];
}

export function reasonLine(reason: string): string {
  const known = REASONS.get(reason);
  if (known) return known;
  const [kind, name] = reason.split(":");
  if (kind === "missing" && name) return `Duly needs your ${name.replaceAll("_", " ")}.`;
  if (kind === "conflict" && name) return `Two documents disagree on ${name.replaceAll("_", " ")}.`;
  return "Duly needs more before it can say.";
}

/**
 * SPEC-resolutions points 35 and 45: the oldest day the packs' rules were checked. Null
 * when any pack gives no day: a day is never shown for rules that were not all checked.
 */
export function rulesCheckedOn(status: Status): string | null {
  const days: string[] = [];
  for (const pack of status.rulepacks) {
    if (!pack.rules_checked_on) return null;
    days.push(pack.rules_checked_on);
  }
  return days.length === 0 ? null : days.reduce((oldest, day) => (day < oldest ? day : oldest));
}
