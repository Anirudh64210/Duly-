import { apiPath } from "./api-path";
import type { paths } from "./api-types";
import { CaseRefused, engineOutputSchema, type Confirmations, type EngineOutput } from "./compute";

// resolutions point 1 and path-1 programs.md section 10: the case of facts and records that
// POST /v1/compute takes (contracts/case.schema.json). Onboarding fills a draft of records;
// this file turns the draft into the case. A field left empty is left out: not known, never
// no, none or zero.

/** A period of changed hours within a job (contracts/case.schema.json $defs.period). */
export type Period = { start: string; end?: string | null; hours_per_week?: number };

export type FieldValue = string | number | null | Period[];

/** A record as entered. Text fields hold "" until answered. */
export type DraftRecord = {
  id: string;
  kind: RecordKind;
  fields: Record<string, string | Period[]>;
};

export type RecordKind =
  | "program"
  | "move"
  | "end_date_change"
  | "authorization"
  | "employer"
  | "work"
  | "trip"
  | "petition";

export type CaseRecord = { id: string; kind: string; fields: Record<string, FieldValue> };

export type Statement = { on: string; from?: string };

export type RecordsCase = {
  categories: string[];
  time_zone: string;
  facts: Record<string, FieldValue>;
  records: CaseRecord[];
  complete: Record<string, Statement>;
  confirmations?: Confirmations;
};

// The id prefix of each kind, as the F-1 pack declares it.
export const PREFIX: Record<RecordKind, string> = {
  program: "p",
  move: "mv",
  end_date_change: "ec",
  authorization: "a",
  employer: "e",
  work: "w",
  trip: "t",
  petition: "h",
};

// The fields the F-1 pack declares as dates, by kind. D59 asks about each one typed.
const DATE_FIELDS: Record<RecordKind, readonly string[]> = {
  program: ["start_date", "end_date", "coursework_done_on", "conferred_on", "first_year_done_on"],
  move: [
    "told_school_on",
    "release_date",
    "i20_issued_on",
    "contacted_new_dso_on",
    "registered_on",
  ],
  end_date_change: ["old_end", "new_end", "requested_on", "granted_on"],
  authorization: ["dso_on", "filed_on", "decided_on", "card_start", "card_end"],
  employer: [],
  work: ["start", "end"],
  trip: ["left_on", "returned_on", "signature_on"],
  petition: [
    "filed_on",
    "receipt_on",
    "requested_start",
    "cos_ended_on",
    "outcome_on",
    "validity_start",
    "h1b_began_on",
  ],
};

// Onboarding's own inputs, kept in the draft and never sent: a job's change of hours is
// sent as its hours_changes period.
const DRAFT_ONLY = new Set(["change_start", "change_hours"]);

// Fields the pack declares as numbers.
const NUMBER_FIELDS = new Set(["hours_per_week"]);

export function isDateField(kind: RecordKind, name: string): boolean {
  return DATE_FIELDS[kind].includes(name);
}

/** The next free id for a kind, such as p3 after p1 and p2. */
export function nextId(records: readonly DraftRecord[], kind: RecordKind): string {
  const prefix = PREFIX[kind];
  const used = records
    .filter((record) => record.kind === kind)
    .map((record) => Number(record.id.slice(prefix.length)));
  return `${prefix}${Math.max(0, ...used) + 1}`;
}

function cleanField(
  kind: RecordKind,
  name: string,
  value: string | Period[],
): FieldValue | undefined {
  if (Array.isArray(value)) return value.length === 0 ? undefined : value;
  const text = value.trim();
  if (text === "") return undefined;
  if (NUMBER_FIELDS.has(name)) {
    const number = Number(text);
    return Number.isFinite(number) ? number : undefined;
  }
  if (isDateField(kind, name) && !/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  return text;
}

/** The record as the case holds it: empty fields and links to missing records left out. */
export function caseRecord(record: DraftRecord, ids: ReadonlySet<string>): CaseRecord {
  const fields: Record<string, FieldValue> = {};
  for (const [name, value] of Object.entries(record.fields)) {
    if (DRAFT_ONLY.has(name)) continue;
    const clean = cleanField(record.kind, name, value);
    if (clean === undefined) continue;
    if (LINKS.has(name) && typeof clean === "string" && !ids.has(clean)) continue;
    fields[name] = clean;
  }
  return { id: record.id, kind: record.kind, fields };
}

const LINKS = new Set([
  "dual_with",
  "from_program",
  "to_program",
  "program",
  "extends",
  "basis_program",
  "employer",
  "under",
  "on_campus",
  "reentry_i20",
]);

export type Draft = {
  records: DraftRecord[];
  complete: Record<string, Statement>;
};

/** The case POST /v1/compute takes, for an F-1 draft. */
export function buildRecordsCase(
  draft: Draft,
  timeZone: string,
  confirmations: Confirmations,
): RecordsCase {
  const ids = new Set(draft.records.map((record) => record.id));
  const records = draft.records.map((record) => caseRecord(record, ids));
  const body: RecordsCase = {
    categories: ["f1"],
    time_zone: timeZone,
    facts: {},
    records,
    complete: { ...draft.complete },
  };
  if (Object.keys(confirmations).length > 0) body.confirmations = confirmations;
  return body;
}

/** D59: every typed date in the case, named <record id>.<field>, as the engine names them. */
export function typedDates(body: RecordsCase): Record<string, string> {
  const typed: Record<string, string> = {};
  for (const record of body.records) {
    const kind = record.kind as RecordKind;
    for (const [name, value] of Object.entries(record.fields)) {
      if (typeof value === "string" && DATE_FIELDS[kind].includes(name)) {
        typed[`${record.id}.${name}`] = value;
      }
    }
  }
  return typed;
}

const RECORDS_PATH = "/v1/compute" satisfies keyof paths;

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

export async function computeCase(
  body: RecordsCase,
  post: typeof fetch = fetch,
): Promise<EngineOutput> {
  const response = await post(apiPath(RECORDS_PATH), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 422) throw new CaseRefused(await problemIn(response));
  if (!response.ok) throw new Error(`status ${response.status}`);
  return engineOutputSchema.parse(await response.json());
}
