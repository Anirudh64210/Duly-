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
  /** Null means nothing was entered. Duly never takes it as zero. */
  cpt_full_time_days: number | null;
  opt: EadBlock | null;
  stem: EadBlock | null;
  employment: EmploymentPeriod[];
  cap_gap: CapGap | null;
  time_zone: string;
  confirmations: Confirmations;
};

/** The input values a question was raised for, as the engine gave them. */
export type About = Record<string, unknown>;

/**
 * The person's own answer to a question Duly asked, the day it was given, and the
 * values it was given for. An answer without them is no answer to the engine.
 */
export type Confirmation = { answer: boolean; on: string; about?: About };
export type Confirmations = Record<string, Confirmation>;

// The pattern the case contract gives for time_zone.
const ZONE_NAME = /^[A-Za-z]+(\/[A-Za-z0-9_+-]+){1,2}$|^UTC$/;
const ZONE_MAX = 64;

export function isZoneName(text: string): boolean {
  return text.length <= ZONE_MAX && ZONE_NAME.test(text);
}

export const DERIVATIONS = ["verbatim", "reading"] as const;
export type Derivation = (typeof DERIVATIONS)[number];

const valueSchema = z.union([z.number(), z.string(), z.null()]);
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const alternatesSchema = z
  .array(
    z.strictObject({
      regime: z.string(),
      legal_status: z.string(),
      value: valueSchema,
    }),
  )
  .optional();
// The regime the value was computed under, and its legal status from the pack.
const operativeSchema = z.strictObject({ regime: z.string(), legal_status: z.string() }).optional();

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
        alternates: alternatesSchema,
        operative: operativeSchema,
        // True when a rule the item used is Duly's reading of the source.
        reading: z.boolean(),
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
        derivation: z.enum(DERIVATIONS).optional(),
        note: z.string().optional(),
      }),
    ),
    questions: z.array(
      z.strictObject({
        id: z.string().regex(/^[a-z0-9_.]+$/),
        because: z.array(z.string()).min(1),
        about: z.record(z.string(), z.unknown()).optional(),
      }),
    ),
    today: z.strictObject({ date: z.string().regex(ISO_DAY), time_zone: z.string() }),
    upcoming: z.array(
      z.strictObject({
        id: z.string(),
        date: z.string().regex(ISO_DAY),
        rule_ids: z.array(z.string()).min(1),
        status: z.enum(ITEM_STATUSES),
        reading: z.boolean(),
        alternates: alternatesSchema,
        operative: operativeSchema,
      }),
    ),
    lists: z.array(
      z.strictObject({
        id: z.string().regex(/^[a-z0-9_.]+$/),
        rule_ids: z.array(z.string()).min(1),
      }),
    ),
  })
  // An item is never shown without the source of every rule it used.
  .refine(
    (output) =>
      [...output.computed, ...output.upcoming, ...output.lists].every((entry) =>
        entry.rule_ids.every((id) => Object.hasOwn(output.rules, id)),
      ),
    { message: "an item, a date ahead, or a list names a rule that has no source" },
  )
  // A value beside alternates is never shown without the legal status the pack gives it.
  .refine(
    (output) =>
      [...output.computed, ...output.upcoming].every(
        (entry) => (entry.alternates ?? []).length === 0 || entry.operative !== undefined,
      ),
    { message: "an item with alternates does not name its operative regime" },
  )
  // A reading is never shown without the words it was read from and how it was read.
  .refine(
    (output) =>
      Object.values(output.rules).every(
        (rule) => rule.derivation !== "reading" || (Boolean(rule.quote) && Boolean(rule.note)),
      ),
    { message: "a reading does not carry its words and its note" },
  )
  // An open question and a verdict other than cannot_tell do not fit together.
  .refine((output) => output.questions.length === 0 || output.verdict.state === "cannot_tell", {
    message: "a question is open and the verdict is not cannot_tell",
  });

export type EngineOutput = z.infer<typeof engineOutputSchema>;
export type ComputedItem = EngineOutput["computed"][number];
export type Alternate = NonNullable<ComputedItem["alternates"]>[number];
export type ShownRule = EngineOutput["rules"][string];
export type Question = EngineOutput["questions"][number];
export type Upcoming = EngineOutput["upcoming"][number];
export type ListEntry = EngineOutput["lists"][number];

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
