import type { AppCase } from "./caseStore";

/** A case as entered, for tests: F-1, one master's program, OPT with a card, one job. */
export function heldCase(): AppCase {
  return {
    status: "f1",
    statusName: "",
    draft: {
      records: [
        {
          id: "p1",
          kind: "program",
          fields: {
            where: "us_on_f1",
            school_name: "State University",
            level: "master",
            start_date: "2024-08-20",
            end_date: "2026-05-15",
          },
        },
        {
          id: "a1",
          kind: "authorization",
          fields: {
            type: "opt_post_completion",
            program: "p1",
            dso_on: "2026-04-01",
            filed_on: "2026-04-10",
            decision: "approved",
            card_start: "2026-06-01",
            card_end: "2027-05-31",
          },
        },
        { id: "e1", kind: "employer", fields: { name: "Acme" } },
        {
          id: "w1",
          kind: "work",
          fields: { employer: "e1", under: "a1", start: "2026-06-20", hours_per_week: "40" },
        },
      ],
      complete: {},
    },
    time_zone: "America/Los_Angeles",
    confirmations: {},
    flow: {},
    onboarded: true,
  };
}
