import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  EMPTY_CASE,
  answer as answerFields,
  buildCase,
  keepFitting,
  withdrawAnswer,
  type CaseFields,
} from "../lib/caseForm";
import {
  computeF1,
  type About,
  type DegreeLevel,
  type EngineOutput,
  type F1Case,
} from "../lib/compute";

// design-1 section 4: one case, kept in memory while the window is open, computed once
// by one query keyed by its facts, its answers and its zone.

/** A program as the student entered it. The first is the latest, newest first. */
export type Program = {
  key: number;
  level: DegreeLevel | "";
  start: string;
  end: string;
  name: string;
  /** Null until the student answers. */
  cpt: boolean | null;
  cptDays: string;
  /** "Before this program, did you study in another program in the US?" */
  earlier: boolean | null;
};

export type AppCase = {
  /** A category id from /v1/status, or "other" for a status Duly holds no pack for. */
  status: string;
  /** The person's own name for another status. Never sent. */
  statusName: string;
  programs: Program[];
  fields: CaseFields;
  /** Onboarding's yes and no answers that the case contract does not hold. */
  flow: Record<string, boolean>;
  /** True once the person has reached Onboarding's last view. */
  onboarded: boolean;
};

export function emptyProgram(key: number): Program {
  return { key, level: "", start: "", end: "", name: "", cpt: null, cptDays: "", earlier: null };
}

export function newCase(zone: string): AppCase {
  return {
    status: "",
    statusName: "",
    programs: [emptyProgram(1)],
    fields: { ...EMPTY_CASE, time_zone: zone },
    flow: {},
    onboarded: false,
  };
}

/** Whether the case is sent to /v1/compute/f1. Round A sends F-1 only (design-1 section 4). */
export function sendsF1(held: AppCase): boolean {
  return held.status === "f1";
}

/**
 * The fields case_f1 takes, from the case as entered. The latest program is the one
 * case_f1 holds. With F12's recommendation documents_count is 0, which is true: nothing
 * can be attached to Duly before documents-1.
 */
export function caseFields(held: AppCase): CaseFields {
  const latest = held.programs[0];
  const cptDays = latest?.cpt === true ? latest.cptDays : latest?.cpt === false ? "0" : "";
  return {
    ...held.fields,
    program_end_date: latest?.end ?? "",
    degree_level: latest?.level === "" || latest === undefined ? "bachelor" : latest.level,
    documents_count: "0",
    cpt_full_time_days: cptDays,
  };
}

/** The body sent, or null when the case is not sent or does not build. */
export function caseBody(held: AppCase | null): F1Case | null {
  if (held === null || !sendsF1(held)) return null;
  const built = buildCase(caseFields(held));
  return built.ok ? built.body : null;
}

/** The calendar day in a zone, read only to choose whether to compute again (D33). */
export function zoneDay(now: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  } catch {
    return "";
  }
}

type Store = {
  held: AppCase | null;
  body: F1Case | null;
  output: EngineOutput | undefined;
  busy: boolean;
  error: Error | null;
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
  compute?: (body: F1Case) => Promise<EngineOutput>;
  now?: () => Date;
}) {
  const compute = props.compute ?? ((body: F1Case) => computeF1(body));
  const now = props.now ?? (() => new Date());
  const [held, setHeld] = useState<AppCase | null>(props.initial ?? null);
  // The day the case was last computed for, changed only when the window comes back on
  // a new day in the case's zone.
  const [day, setDay] = useState("");
  const body = useMemo(() => caseBody(held), [held]);
  const query = useQuery({
    queryKey: ["compute", body, day],
    queryFn: () => compute(body as F1Case),
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

  const save = useCallback((changed: AppCase) => {
    setHeld({ ...changed, fields: keepFitting(changed.fields) });
  }, []);
  const store: Store = {
    held,
    body,
    output,
    busy: body !== null && query.isPending,
    error: query.error,
    save,
    clear: () => setHeld(null),
    answer: (question, given, about) => {
      if (held === null || output === undefined) return;
      const fields = answerFields(held.fields, question, given, output.today.date, about);
      setHeld({ ...held, fields });
    },
    withdraw: (question) => {
      if (held === null) return;
      setHeld({ ...held, fields: withdrawAnswer(held.fields, question) });
    },
    retry: () => void query.refetch(),
  };
  return <StoreContext.Provider value={store}>{props.children}</StoreContext.Provider>;
}
