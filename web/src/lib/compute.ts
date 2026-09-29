import { z } from "zod";

import type { paths } from "./api-types";
import { VERDICT_STATES } from "./status";

export const ITEM_STATUSES = ["settled", "guidance", "litigated", "proposed", "school"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const DEGREE_LEVELS = ["bachelor", "master", "doctorate"] as const;
export type DegreeLevel = (typeof DEGREE_LEVELS)[number];

export const PETITION_STATUSES = [
  "pending",
  "approved",
  "denied",
  "rejected",
  "withdrawn",
  "revoked",
] as const;
export type PetitionStatus = (typeof PETITION_STATUSES)[number];

// Mirrors contracts/case_f1.schema.json.
export type EadBlock = {
  dso_recommendation_date: string | null;
  i765_filed_date: string | null;
  ead_start: string | null;
  ead_end: string | null;
};

export type EmploymentPeriod = {
  start: string;
  end: string | null;
  hours_per_week: number;
  employer_reported: boolean;
};

export type CapGap = {
  petition_filed_on: string;
  requested_start: string;
  change_of_status: boolean;
  status: PetitionStatus;
};

export type F1Case = {
  program_end_date: string;
  degree_level: DegreeLevel;
  documents_count: number;
  cpt_full_time_days: number;
  opt: EadBlock | null;
  stem: EadBlock | null;
  employment: EmploymentPeriod[];
  cap_gap: CapGap | null;
};

const valueSchema = z.union([z.number(), z.string(), z.null()]);

// Mirrors contracts/engine_output.schema.json.
export const engineOutputSchema = z
  .strictObject({
    verdict: z.strictObject({
      state: z.enum(VERDICT_STATES),
      reasons: z.array(z.string()),
    }),
    scope: z.strictObject({
      documents_count: z.number().int().nonnegative(),
      rules_checked_on: z.string().nullable(),
    }),
    computed: z.array(
      z.strictObject({
        id: z.string(),
        value: valueSchema,
        unit: z.string(),
        inputs: z.record(z.string(), z.unknown()),
        rule_ids: z.array(z.string()).min(1),
        status: z.enum(ITEM_STATUSES),
        alternates: z
          .array(
            z.strictObject({
              regime: z.string(),
              legal_status: z.string(),
              value: valueSchema,
            }),
          )
          .optional(),
        // The regime the item's value was computed under, and its legal status from the pack.
        operative: z.strictObject({ regime: z.string(), legal_status: z.string() }).optional(),
      }),
    ),
    rulepacks: z.array(z.strictObject({ category: z.string(), version: z.string() })),
    rules: z.record(
      z.string(),
      z.strictObject({
        value: z.union([z.number(), z.string(), z.boolean()]),
        unit: z.string(),
        status: z.string(),
        citation: z.string(),
        url: z.string(),
        checked_on: z.string(),
        quote: z.string().optional(),
        regime: z.string().optional(),
      }),
    ),
  })
  // An item is never shown without the source of every rule it used.
  .refine(
    (output) =>
      output.computed.every((item) => item.rule_ids.every((id) => Object.hasOwn(output.rules, id))),
    { message: "a computed item names a rule that has no source" },
  )
  // A value beside alternates is never shown without the legal status the pack gives it.
  .refine(
    (output) =>
      output.computed.every(
        (item) => (item.alternates ?? []).length === 0 || item.operative !== undefined,
      ),
    { message: "an item with alternates does not name its operative regime" },
  );

export type EngineOutput = z.infer<typeof engineOutputSchema>;
export type ComputedItem = EngineOutput["computed"][number];
export type Alternate = NonNullable<ComputedItem["alternates"]>[number];
export type ShownRule = EngineOutput["rules"][string];

const COMPUTE_PATH = "/v1/compute/f1" satisfies keyof paths;

/** The server read the case and refused it. Carries the server's own words, if any. */
export class CaseRefused extends Error {
  readonly problem: string | null;

  constructor(problem: string | null) {
    super("case refused");
    this.name = "CaseRefused";
    this.problem = problem;
  }
}

async function problemIn(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "detail" in body) {
      const { detail } = body;
      if (typeof detail === "string" && detail.length > 0) return detail;
    }
  } catch {
    // No readable body: the refusal stands without the server's words.
  }
  return null;
}

export async function computeF1(body: F1Case, post: typeof fetch = fetch): Promise<EngineOutput> {
  const response = await post(`/api${COMPUTE_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 422) throw new CaseRefused(await problemIn(response));
  if (!response.ok) throw new Error(`status ${response.status}`);
  return engineOutputSchema.parse(await response.json());
}
