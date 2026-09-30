import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { engineOutputSchema, type EngineOutput } from "../lib/compute";
import { ASKING, OUTPUT, STATUS } from "../lib/fixtures";
import type { RecordsCase } from "../lib/records";
import { applyFlow, onboardingSteps, setField } from "../lib/views/onboarding";
import { CaseProvider, newCase, type AppCase } from "./caseStore";
import { createAppRouter } from "./Shell";

// design-1 section 5: a student walks Onboarding from the first view to Home.

const parse = (output: unknown): EngineOutput => engineOutputSchema.parse(output);

function mount(props: {
  compute?: (body: RecordsCase) => Promise<EngineOutput>;
  status?: unknown;
  held?: AppCase | null;
}) {
  const status = props.status ?? STATUS;
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
    if (url === "api/v1/compute") posted.push(JSON.parse(String(init?.body)) as RecordsCase);
    const body = url === "api/v1/compute" ? OUTPUT : status;
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter(createMemoryHistory({ initialEntries: ["/welcome"] }));
  render(
    <QueryClientProvider client={client}>
      <CaseProvider
        initial={props.held ?? null}
        {...(props.compute === undefined ? {} : { compute: props.compute })}
      >
        <RouterProvider router={router} />
      </CaseProvider>
    </QueryClientProvider>,
  );
  return router;
}

/** Every case the app posted to /v1/compute, in order. */
let posted: RecordsCase[] = [];

afterEach(() => {
  posted = [];
  cleanup();
  vi.unstubAllGlobals();
});

const next = () => fireEvent.click(screen.getByRole("button", { name: "Continue" }));
const back = () => fireEvent.click(screen.getByRole("button", { name: "Back" }));
const pick = (name: string) => fireEvent.click(screen.getByRole("radio", { name }));
const title = () => screen.getByRole("heading", { level: 1 }).textContent;
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const problems = () =>
  [...document.querySelectorAll("p.problem:not([role])")].map((line) => line.textContent);
const type = (id: string, text: string) => fireEvent.change(input(id), { target: { value: text } });

/** Lets the engine's answer reach the page, as it does before a student reads the view. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

/** Types an ISO day into the three parts of a date field, as a student would. */
function typeDate(id: string, iso: string) {
  const [year, month, day] = iso.split("-") as [string, string, string];
  type(id, String(Number(month)));
  type(`${id}-day`, String(Number(day)));
  type(`${id}-year`, year);
}

const flowTo = (text: string) => {
  expect(title()).toBe(text);
};

/** Step 1 questions 2 to 9 for a program, as the I-20 shows it. */
async function programFromI20(id: string, level: string, school: string, finished: boolean) {
  type(`f-${id}-school_name`, school);
  next();
  pick(level);
  next();
  type(`f-${id}-field_name`, "Computer Science");
  type(`f-${id}-cip_code`, "11.0701");
  next();
  pick("Yes");
  next();
  typeDate(`f-${id}-start_date`, finished ? "2020-08-20" : "2024-08-20");
  typeDate(`f-${id}-end_date`, finished ? "2024-05-15" : "2026-05-15");
  next();
  flowTo("Has your DSO changed this program's end date?");
  pick("No");
  next();
  pick(finished ? "Finished" : "Still studying");
  next();
  if (finished) {
    typeDate(`f-${id}-coursework_done_on`, "2024-05-10");
    next();
  }
  await settle();
}

describe("Onboarding (programs.md section 18)", () => {
  it("builds a records case with every program and posts it to /v1/compute", async () => {
    const router = mount({});
    fireEvent.click(await screen.findByRole("radio", { name: "F-1" }));
    next();
    flowTo("Add your current I-20.");
    pick("Add my I-20");
    expect(screen.getByText(/comes with documents/)).toBeInTheDocument();
    pick("Type it in");
    next();
    await programFromI20("p1", "Master's", "State University", false);
    flowTo("Is this program part of a dual degree?");
    pick("No");
    next();
    pick("Yes");
    next();
    pick("Yes");
    next();
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    pick("Yes");
    next();
    await programFromI20("p2", "Bachelor's", "City College", true);
    pick("No");
    next();
    pick("Yes");
    next();
    pick("Yes");
    next();
    expect(title()).toMatch(/^How did you move from City College, Bachelor's/);
    pick("New level at the same school");
    next();
    typeDate("f-mv1-i20_issued_on", "2024-06-01");
    next();
    pick("That's every program");
    next();
    flowTo(
      "Do you have a degree from a school outside the US, or from a US school while not on an F-1?",
    );
    pick("No");
    next();
    flowTo("Have you withdrawn from classes during a program on an F-1?");
    pick("No");
    next();
    // Step 3 for the current program: OPT after the program end, with its card.
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument();
    pick("No");
    next();
    pick("Yes");
    next();
    pick("After the program end date");
    next();
    typeDate("f-a1-dso_on", "2026-04-01");
    next();
    pick("Approved");
    next();
    typeDate("f-a1-decided_on", "2026-05-20");
    next();
    typeDate("f-a1-card_start", "2026-06-01");
    typeDate("f-a1-card_end", "2027-05-31");
    next();
    flowTo("Did you get a STEM extension after this OPT?");
    pick("No");
    next();
    pick("No");
    next();
    fireEvent.click(screen.getByRole("button", { name: "I'm not sure" }));
    next();
    pick("That's all");
    next();
    // The earlier program had CPT.
    flowTo("During City College, Bachelor's, did you have CPT?");
    pick("Yes");
    next();
    typeDate("f-a2-card_start", "2023-06-01");
    typeDate("f-a2-card_end", "2023-08-15");
    type("f-e1-name", "Acme");
    typeDate("f-a2-dso_on", "2023-05-20");
    next();
    pick("Part time");
    next();
    pick("No");
    next();
    pick("No");
    next();
    pick("Yes");
    next();
    pick("That's all");
    next();
    // Step 4: one job under the OPT card, no trips, no petition.
    expect(screen.getByText("Step 4 of 5")).toBeInTheDocument();
    pick("Yes");
    next();
    type("f-e2-name", "Acme");
    typeDate("f-w1-start", "2026-06-20");
    type("f-w1-hours_per_week", "40");
    next();
    pick("Still working here");
    next();
    pick("No");
    next();
    expect(screen.getByText("Its dates hold the start")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("radio", {
        name: /^OPT after the program end, Jun 1, 2026 to May 31, 2027/,
      }),
    );
    next();
    pick("That's every job");
    next();
    pick("No");
    next();
    pick("No");
    next();
    // Step 5: the record, the typed dates, the zone.
    expect(screen.getByText("Step 5 of 5")).toBeInTheDocument();
    expect(screen.getByText(/^State University, Master's/)).toBeInTheDocument();
    pick("This is everything");
    next();
    pick("Yes");
    next();
    fireEvent.click(screen.getAllByRole("radio", { name: /: checked$/ })[0] as HTMLElement);
    next();
    flowTo("Your time zone");
    next();
    await settle();
    flowTo("You're set.");
    fireEvent.click(screen.getByRole("button", { name: "Open Duly" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));

    const sent = posted.at(-1) as RecordsCase;
    expect(sent.categories).toEqual(["f1"]);
    const programs = sent.records.filter((r) => r.kind === "program");
    expect(programs.map((p) => [p.id, p.fields.level, p.fields.where])).toEqual([
      ["p1", "master", "us_on_f1"],
      ["p2", "bachelor", "us_on_f1"],
    ]);
    expect(programs[0]?.fields.basis_program).toBeUndefined();
    expect(JSON.stringify(sent)).not.toContain("degree_level");
    expect(sent.records.find((r) => r.id === "mv1")?.fields).toEqual({
      how: "change_of_level",
      from_program: "p2",
      to_program: "p1",
      i20_issued_on: "2024-06-01",
    });
    expect(sent.records.find((r) => r.id === "w1")?.fields).toMatchObject({
      under: "a1",
      hours_per_week: 40,
    });
    expect(sent.records.find((r) => r.id === "p1")?.fields.online_within_limit).toBe("yes");
    expect(sent.records.find((r) => r.id === "p1")?.fields.first_year_before_training).toBe(
      "not_sure",
    );
    expect(sent.records.find((r) => r.id === "p2")?.fields.first_year_before_training).toBe("yes");
    expect(Object.keys(sent.complete).sort()).toEqual([
      "authorization",
      "authorization:p1",
      "authorization:p2",
      "end_date_change",
      "move",
      "petition",
      "program",
      "trip",
      "withdrawal",
      "work",
    ]);
    expect(sent.complete.trip?.from).toBe("2020-08-20");
    const typed = sent.confirmations?.["typed_dates.from_documents"];
    expect(typed?.answer).toBe(true);
    expect(typed?.about).toMatchObject({
      "p1.start_date": "2024-08-20",
      "a1.card_end": "2027-05-31",
    });
    const checked = Object.keys(sent.confirmations ?? {}).filter((id) =>
      id.startsWith("typed_dates.checked."),
    );
    expect(checked).toHaveLength(1);
  });

  it("sends no level until the student chooses one, and offers every level", async () => {
    mount({});
    fireEvent.click(await screen.findByRole("radio", { name: "F-1" }));
    next();
    pick("Type it in");
    next();
    type("f-p1-school_name", "State University");
    next();
    await settle();
    for (const level of [
      "Associate",
      "Bachelor's",
      "Master's",
      "Doctorate",
      "English language",
      "Other",
    ]) {
      expect(screen.getByRole("radio", { name: level })).toHaveAttribute("aria-checked", "false");
    }
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose an answer.");
    expect(posted.every((body) => body.records.every((r) => r.fields.level === undefined))).toBe(
      true,
    );
    back();
    expect(input("f-p1-school_name").value).toBe("State University");
  });

  it("names each field left empty or typed wrong, and keeps the view", async () => {
    mount({});
    fireEvent.click(await screen.findByRole("radio", { name: "F-1" }));
    next();
    pick("Type it in");
    next();
    next();
    expect(problems()).toContain("Enter school name.");
    type("f-p1-school_name", "State University");
    type("f-p1-school_code", "");
    next();
    pick("Doctorate");
    next();
    type("f-p1-field_name", "Physics");
    type("f-p1-cip_code", "40");
    next();
    expect(problems()[0]).toMatch(/two digits, a point/);
  });

  it("asks Duly's questions one at a time and records the answer with its values", async () => {
    const compute = vi.fn<(body: RecordsCase) => Promise<EngineOutput>>(() =>
      Promise.resolve(parse(ASKING)),
    );
    const held = newCase("America/New_York");
    held.status = "f1";
    mount({ compute, held });
    await settle();
    const views = onboardingSteps(held, 1);
    expect(views.at(-2)?.kind).toBe("questions");
    expect(compute).toHaveBeenCalled();
  });

  it("goes from another status to Done with the name kept", async () => {
    mount({});
    fireEvent.click(await screen.findByRole("radio", { name: "Another status" }));
    next();
    type("f-name", "J-1");
    next();
    expect(screen.getByText("J-1")).toBeInTheDocument();
    expect(screen.getByText("Duly holds no rules for the status you named.")).toBeInTheDocument();
  });

  it("says when a category has no rules yet", async () => {
    mount({
      status: {
        ...STATUS,
        rulepacks: [
          ...STATUS.rulepacks,
          { category: "h1b", version: "v2026.09", parameters: 0 },
          { category: "h1b", version: "v2026.10", parameters: 0 },
        ],
      },
    });
    fireEvent.click(await screen.findByRole("radio", { name: "H-1B" }));
    next();
    expect(screen.getByText("Duly holds no rules for H-1B dates.")).toBeInTheDocument();
  });
});

describe("Onboarding's records (programs.md sections 10 and 18)", () => {
  const f1 = (): AppCase => ({ ...newCase("UTC"), status: "f1" });

  it("adds the record a Yes opens, and a No removes it and every record that links to it", () => {
    let held = applyFlow(f1(), "earlier", "yes", "2026-09-29");
    expect(held.draft.records.map((r) => r.id)).toEqual(["p1", "p2", "mv1"]);
    held = applyFlow(held, "cpt:p2", "yes", "2026-09-29");
    expect(held.draft.records.map((r) => r.id)).toEqual(["p1", "p2", "mv1", "e1", "a1"]);
    held = applyFlow(held, "earlier", "no", "2026-09-29");
    expect(held.draft.records.map((r) => r.id)).toEqual(["p1"]);
    expect(applyFlow(held, "earlier", "no", "2026-09-29")).toEqual({ ...held });
  });

  it("builds a dual degree, end date changes, STEM, trips and a petition", () => {
    let held = f1();
    held = setField(held, "p1", "school_name", "State University");
    held = setField(held, "p1", "level", "master");
    held = applyFlow(held, "dual:p1", "yes", "2026-09-29");
    expect(held.draft.records[1]?.fields).toMatchObject({
      school_name: "State University",
      dual_with: "p1",
    });
    expect(held.draft.records[0]?.fields.dual_with).toBe("p2");
    held = applyFlow(held, "ec:p1", "yes", "2026-09-29");
    held = applyFlow(held, "ec-more:ec1", "yes", "2026-09-29");
    expect(held.draft.records.filter((r) => r.kind === "end_date_change")).toHaveLength(2);
    held = applyFlow(held, "opt:p1", "yes", "2026-09-29");
    held = setField(held, "a1", "type", "opt_post_completion");
    held = applyFlow(held, "stem:a1", "yes", "2026-09-29");
    held = setField(held, "a2", "basis_program", "not_sure");
    expect(held.draft.records.find((r) => r.id === "a2")?.fields).toMatchObject({
      type: "stem_extension",
      extends: "a1",
      basis_program: "",
    });
    held = applyFlow(held, "jobs", "yes", "2026-09-29");
    held = setField(held, "w1", "under", "campus");
    held = setField(held, "w1", "change_start", "2026-07-01");
    held = setField(held, "w1", "change_hours", "20");
    expect(held.draft.records.find((r) => r.id === "w1")?.fields).toMatchObject({
      on_campus: "p1",
      hours_changes: [{ start: "2026-07-01", hours_per_week: 20 }],
    });
    held = applyFlow(held, "hours-changed:w1", "no", "2026-09-29");
    held = applyFlow(held, "trips", "yes", "2026-09-29");
    held = applyFlow(held, "h1b", "yes", "2026-09-29");
    held = applyFlow(held, "outside", "yes", "2026-09-29");
    held = applyFlow(held, "auth-all:p1", "opt", "2026-09-29");
    const kinds = held.draft.records.map((r) => r.kind);
    expect(kinds.filter((k) => k === "trip")).toHaveLength(1);
    expect(kinds.filter((k) => k === "petition")).toHaveLength(1);
    expect(held.flow["opt:p1"]).toBe("yes");
    held = {
      ...held,
      flow: { ...held.flow, jobs: "yes", trips: "yes", h1b: "yes", outside: "yes" },
    };
    held = setField(held, "a2", "decision", "approved");
    held = setField(held, "h1", "outcome", "approved");
    const ids = onboardingSteps(held, 0).map((view) => view.id);
    for (const id of [
      "school:p2",
      "ec-dates:ec2",
      "basis:a2",
      "card:a2",
      "trip:t1",
      "outcome-day:h1",
      "where:p3",
      "hours-change:w1",
    ].slice(0, 7)) {
      expect(ids).toContain(id);
    }
  });
});

/** A student who has answered every Onboarding view: one master's program, nothing else. */
function answered(): AppCase {
  let held: AppCase = { ...newCase("America/New_York"), status: "f1" };
  const fields: [string, string][] = [
    ["school_name", "State University"],
    ["level", "master"],
    ["field_name", "Physics"],
    ["stem_list", "on_list"],
    ["start_date", "2024-08-20"],
    ["end_date", "2026-12-15"],
    ["state", "in_progress"],
    ["full_course_each_term", "yes"],
    ["online_within_limit", "yes"],
  ];
  for (const [name, entered] of fields) held = setField(held, "p1", name, entered);
  const flows: [string, string][] = [
    ["i20", "type"],
    ["ec:p1", "no"],
    ["dual:p1", "no"],
    ["earlier", "no"],
    ["outside", "no"],
    ["withdrawals", "no"],
    ["cpt:p1", "yes"],
    ["cpt-more:a1", "no"],
    ["opt:p1", "no"],
    ["auth-all:p1", "all"],
    ["jobs", "no"],
    ["trips", "no"],
    ["h1b", "no"],
    ["review", "everything"],
    ["typed", "no"],
  ];
  for (const [key, given] of flows) held = applyFlow(held, key, given, "2026-09-29");
  for (const [name, entered] of [
    ["card_start", "2025-06-01"],
    ["card_end", "2025-08-15"],
    ["dso_on", "2025-05-20"],
    ["time", "part_time"],
  ] as const) {
    held = setField(held, "a1", name, entered);
  }
  held = setField(held, "e1", "name", "Acme");
  held = setField(held, "p1", "immediate_cpt", "no");
  return setField(held, "p1", "first_year_before_training", "yes");
}

describe("Duly's questions after Onboarding (programs.md sections 10 and 12)", () => {
  const asking = (ids: string[]) =>
    parse({
      ...OUTPUT,
      verdict: { state: "cannot_tell", reasons: ids.map((id) => `missing:${id}`) },
      questions: ids.map((id) => ({ id, because: [`missing:${id}`] })),
    });

  async function toQuestions(ids: string[]) {
    const compute = vi.fn<(body: RecordsCase) => Promise<EngineOutput>>(() =>
      Promise.resolve(asking(ids)),
    );
    mount({ compute, held: answered() });
    await settle();
    for (let n = 0; n < 40 && screen.queryByText("Step 5 of 5") === null; n += 1) next();
    for (let n = 0; n < 5 && title() !== "Your time zone"; n += 1) next();
    next();
    await settle();
    return compute;
  }

  it("asks for a record's field in the view that asks it, and sends the field", async () => {
    const compute = await toQuestions(["a1.decision", "p1.coursework_done_on"]);
    expect(title()).toBe("CPT, Jun 1, 2025 to Aug 15, 2025: the decision");
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose an answer.");
    pick("Approved");
    await settle();
    const sent = compute.mock.calls.at(-1)?.[0];
    expect(sent?.records.find((r) => r.id === "a1")?.fields.decision).toBe("approved");
    expect(sent?.confirmations?.["a1.decision"]).toBeUndefined();
  });

  it("asks for a date field Onboarding holds a view for", async () => {
    await toQuestions(["p1.coursework_done_on", "a1.decision"]);
    expect(title()).toBe("The day all course requirements were done");
    next();
    expect(problems()).toEqual(["Enter the day all course requirements were done."]);
    typeDate("f-p1-coursework_done_on", "2026-05-10");
    next();
  });

  it("lets a day the engine asks for stay unknown, and moves on", async () => {
    const compute = await toQuestions(["p1.coursework_done_on", "a1.decision"]);
    expect(title()).toBe("The day all course requirements were done");
    fireEvent.click(screen.getByRole("button", { name: "I'm not sure" }));
    next();
    await settle();
    expect(title()).toBe("You're set.");
    const sent = compute.mock.calls.at(-1)?.[0];
    expect(sent?.records.find((r) => r.id === "p1")?.fields.coursework_done_on).toBeUndefined();
  });

  it("asks whether a list is whole, and records the statement with the day", async () => {
    const compute = await toQuestions(["complete.report"]);
    expect(title()).toBe("Is every report made to your DSO in what you entered?");
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose an answer.");
    pick("Yes, every one is in");
    await settle();
    const sent = compute.mock.calls.at(-1)?.[0];
    expect(sent?.complete.report?.on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    next();
    expect(title()).toBe("You're set.");
  });

  it("leaves a list unstated when the student says not yet", async () => {
    await toQuestions(["complete.report"]);
    pick("Not yet");
    next();
    expect(title()).toBe("You're set.");
  });
});
