import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { About, Confirmations, EadBlock, EngineOutput } from "../lib/compute";
import type { Sent } from "../lib/drafts";
import { checkinRecord } from "../lib/labels";
import {
  buildRecordsCase,
  computeCase,
  type Draft,
  type DraftRecord,
  type RecordsCase,
} from "../lib/records";

// design-1 section 4 and resolutions point 1: one case, kept in memory while the window
// is open, built from Onboarding's records and computed by POST /v1/compute, once per
// change, by one query keyed by the case.

export type AppCase = {
  /** A category id from /v1/status, or "other" for a status Duly holds no pack for. */
  status: string;
  /** The person's own name for another status. Never sent. */
  statusName: string;
  /** The records Onboarding built, and the lists the person stated whole. */
  draft: Draft;
  time_zone: string;
  confirmations: Confirmations;
  /** Onboarding's answers that the case contract does not hold, by view. */
  flow: Record<string, string>;
  /** True once the person has reached Onboarding's last view. */
  onboarded: boolean;
};

export function newCase(zone: string): AppCase {
  return {
    status: "",
    statusName: "",
    draft: {
      records: [{ id: "p1", kind: "program", fields: { where: "us_on_f1" } }],
      complete: {},
    },
    time_zone: zone,
    confirmations: {},
    flow: {},
    onboarded: false,
  };
}

/** Whether the case is sent. Only F-1 has a path to compute (design-1 section 4). */
export function sendsF1(held: AppCase): boolean {
  return held.status === "f1";
}

/** The case POST /v1/compute takes, or null when the case is not sent. */
export function caseBody(held: AppCase | null): RecordsCase | null {
  if (held === null || !sendsF1(held)) return null;
  return buildRecordsCase(held.draft, held.time_zone, held.confirmations);
}

function text(record: DraftRecord | undefined, name: string): string {
  const value = record?.fields[name];
  return typeof value === "string" ? value.trim() : "";
}

function orNull(value: string): string | null {
  return value === "" ? null : value;
}

function block(record: DraftRecord | undefined): EadBlock | null {
  if (record === undefined) return null;
  return {
    dso_recommendation_date: orNull(text(record, "dso_on")),
    i765_filed_date: orNull(text(record, "filed_on")),
    ead_start: orNull(text(record, "card_start")),
    ead_end: orNull(text(record, "card_end")),
  };
}

/**
 * The student's own facts that a drafted DSO question may state: the latest program and
 * its training, as entered. Nothing here is sent; the case above is.
 */
export function sentFacts(held: AppCase): Sent {
  const records = held.draft.records;
  const latest = records.find((record) => record.kind === "program");
  const auth = (type: string) =>
    records.find(
      (record) =>
        record.kind === "authorization" &&
        text(record, "type") === type &&
        text(record, "program") === latest?.id,
    );
  const opt = auth("opt_post_completion");
  const stem = records.find(
    (record) =>
      record.kind === "authorization" &&
      text(record, "type") === "stem_extension" &&
      text(record, "extends") === opt?.id,
  );
  const petition = records.find((record) => record.kind === "petition");
  const employment = records
    .filter((record) => record.kind === "work" && text(record, "start") !== "")
    .map((record) => ({
      start: text(record, "start"),
      end: orNull(text(record, "end")),
      hours_per_week: Number(text(record, "hours_per_week") || "0"),
      employer_reported: false,
    }));
  const outcome = text(petition, "outcome");
  return {
    program_end_date: text(latest, "end_date"),
    degree_level: text(latest, "level"),
    documents_count: 0,
    cpt_full_time_days: null,
    opt: block(opt),
    stem: block(stem),
    employment,
    cap_gap:
      petition === undefined
        ? null
        : {
            petition_filed_on: text(petition, "filed_on"),
            requested_start: text(petition, "requested_start"),
            change_of_status: text(petition, "change_of_status") === "yes",
            status: (outcome === "" ? "pending" : outcome) as NonNullable<
              Sent["cap_gap"]
            >["status"],
          },
    time_zone: held.time_zone,
    confirmations: held.confirmations,
  };
}

/** The calendar day in a zone, read only to date the person's own statements (D33). */
export function zoneDay(now: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  } catch {
    return "";
  }
}

// reviews/w2-p2.md finding 6: the kinds whose confirmed day the app records, never typed.
const CONFIRMED_KINDS: ReadonlySet<string> = new Set(["work", "petition"]);

function withoutConfirmed(record: DraftRecord): string {
  return JSON.stringify({ ...record.fields, confirmed_on: undefined });
}

/**
 * The case as saved: a job or a petition the person entered or changed, or the ids given,
 * is confirmed on the day given. A record left as it was keeps its day.
 */
export function confirmRecords(
  before: AppCase | null,
  changed: AppCase,
  day: string,
  ids: readonly string[] = [],
): AppCase {
  if (day === "") return changed;
  const old = new Map((before?.draft.records ?? []).map((record) => [record.id, record]));
  const records = changed.draft.records.map((record) => {
    if (!CONFIRMED_KINDS.has(record.kind)) return record;
    const was = old.get(record.id);
    const same = was !== undefined && withoutConfirmed(was) === withoutConfirmed(record);
    if (same && !ids.includes(record.id)) return record;
    return { ...record, fields: { ...record.fields, confirmed_on: day } };
  });
  return { ...changed, draft: { ...changed.draft, records } };
}

type Store = {
  held: AppCase | null;
  body: RecordsCase | null;
  sent: Sent | null;
  output: EngineOutput | undefined;
  busy: boolean;
  error: Error | null;
  /** The person's calendar day, to date a statement they make now. */
  today: () => string;
  save: (changed: AppCase) => void;
  clear: () => void;
  answer: (question: string, given: boolean, about: About | undefined) => void;
  withdraw: (question: string) => void;
  retry: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (store === null) throw new Error("useStore outside CaseProvider");
  return store;
}

export function CaseProvider(props: {
  children: ReactNode;
  initial?: AppCase | null;
  compute?: (body: RecordsCase) => Promise<EngineOutput>;
  now?: () => Date;
}) {
  const compute = props.compute ?? ((body: RecordsCase) => computeCase(body));
  const now = props.now ?? (() => new Date());
  const [held, setHeld] = useState<AppCase | null>(props.initial ?? null);
  // The day the case was last computed for, changed only when the window comes back on
  // a new day in the case's zone.
  const [day, setDay] = useState("");
  const body = useMemo(() => caseBody(held), [held]);
  const sent = useMemo(
    () => (held === null || body === null ? null : sentFacts(held)),
    [held, body],
  );
  const query = useQuery({
    queryKey: ["compute", body, day],
    queryFn: () => compute(body as RecordsCase),
    enabled: body !== null,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const output = query.data;

  useEffect(() => {
    const onFocus = () => {
      if (output === undefined) return;
      const today = zoneDay(now(), output.today.time_zone);
      if (today !== "" && today !== output.today.date) setDay(today);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  });

  const today = () => output?.today.date ?? zoneDay(now(), held?.time_zone ?? "UTC");
  const store: Store = {
    held,
    body,
    sent,
    output,
    busy: body !== null && query.isPending,
    error: query.error,
    today,
    save: (changed) => setHeld(confirmRecords(held, changed, today())),
    clear: () => setHeld(null),
    answer: (question, given, about) => {
      if (held === null || output === undefined) return;
      const on = output.today.date;
      const record = checkinRecord(question);
      if (record !== null && given) {
        setHeld(confirmRecords(held, held, on, [record]));
        return;
      }
      const recorded = about === undefined ? { answer: given, on } : { answer: given, on, about };
      setHeld({ ...held, confirmations: { ...held.confirmations, [question]: recorded } });
    },
    withdraw: (question) => {
      if (held === null) return;
      const confirmations = Object.fromEntries(
        Object.entries(held.confirmations).filter(([id]) => id !== question),
      );
      setHeld({ ...held, confirmations });
    },
    retry: () => void query.refetch(),
  };
  return <StoreContext.Provider value={store}>{props.children}</StoreContext.Provider>;
}
