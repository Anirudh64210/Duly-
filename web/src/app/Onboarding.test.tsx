import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { engineOutputSchema, type EngineOutput, type F1Case } from "../lib/compute";
import { ASKING, CONFLICT, NEXT, STATUS } from "../lib/fixtures";
import { CaseProvider, type AppCase } from "./caseStore";
import { createAppRouter } from "./Shell";

// design-1 section 5: a student walks Onboarding from the first view to Home.

const parse = (output: unknown): EngineOutput => engineOutputSchema.parse(output);

function mount(props: {
  compute?: (body: F1Case) => Promise<EngineOutput>;
  status?: unknown;
  held?: AppCase | null;
}) {
  const status = props.status ?? STATUS;
  vi.stubGlobal("fetch", () =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(status) }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter(createMemoryHistory({ initialEntries: ["/welcome"] }));
  const compute = props.compute ?? (() => Promise.resolve(parse(NEXT)));
  render(
    <QueryClientProvider client={client}>
      <CaseProvider initial={props.held ?? null} compute={compute}>
        <RouterProvider router={router} />
      </CaseProvider>
    </QueryClientProvider>,
  );
  return router;
}

afterEach(() => {
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

async function chooseF1() {
  await screen.findByText("Which visa status do you hold now?");
  await screen.findByRole("radio", { name: "F-1" });
  pick("F-1");
  next();
}

describe("Onboarding for F-1, every view in order (design-1 section 5)", () => {
  it("walks two programs, CPT, OPT, STEM OPT, cap-gap and two jobs to Home", async () => {
    const compute = vi.fn<(body: F1Case) => Promise<EngineOutput>>(() =>
      Promise.resolve(parse(NEXT)),
    );
    const router = mount({ compute });
    await chooseF1();

    // Programs: the latest first.
    expect(title()).toBe("What level is your latest program?");
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose the level on your I-20.");
    pick("Master's");
    next();
    expect(title()).toBe("When does your Master's program run?");
    next();
    expect(problems()).toEqual([
      "Enter the start date on your I-20.",
      "Enter the program end date on your I-20.",
    ]);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter the start date on your I-20.");
    expect(document.activeElement).toBe(input("f-start"));
    typeDate("f-start", "2024-08-20");
    typeDate("f-end", "2026-02-30");
    next();
    expect(problems()).toEqual(["Enter the program end date on your I-20."]);
    typeDate("f-end", "2026-05-15");
    next();
    expect(title()).toBe("What do you call it?");
    type("f-name", "  MS Data Science  ");
    next();
    expect(title()).toBe("Before MS Data Science, did you study in another program in the US?");
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose Yes or No.");
    pick("Yes");
    next();

    // The program before it.
    expect(title()).toBe("What level was the program before MS Data Science?");
    pick("Bachelor's");
    next();
    typeDate("f-start", "2020-08-20");
    typeDate("f-end", "2024-05-15");
    next();
    next();
    expect(title()).toBe(
      "Before your Bachelor's program, did you study in another program in the US?",
    );
    pick("No");
    next();

    // Practical training.
    expect(title()).toBe("Did you have CPT during MS Data Science?");
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument();
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose Yes or No.");
    pick("Yes");
    next();
    expect(title()).toBe("How many days of full-time CPT did you have?");
    type("f-days", "twelve");
    next();
    expect(problems()).toContain("Enter the days as a whole number, 0 or more.");
    type("f-days", "12");
    next();
    expect(title()).toBe("Did you have CPT during your Bachelor's program?");
    pick("No");
    next();

    expect(title()).toBe("Did you apply for post-completion OPT after MS Data Science?");
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose Yes or No.");
    pick("Yes");
    next();
    expect(title()).toBe("Your DSO's recommendation and your I-765");
    type("f-recommended", "4");
    next();
    expect(problems()).toContain("Enter the recommendation date as a date, or leave it empty.");
    typeDate("f-recommended", "2026-04-01");
    typeDate("f-filed", "2026-04-10");
    next();
    expect(title()).toBe("Your OPT card");
    type("f-card-end", "13");
    next();
    expect(problems()).toContain("Enter the card end date as a date, or leave it empty.");
    typeDate("f-card-start", "2026-06-01");
    typeDate("f-card-end", "2027-05-31");
    next();

    expect(title()).toBe("Did you apply for a STEM OPT extension after MS Data Science?");
    pick("Yes");
    next();
    expect(title()).toBe("Your DSO's recommendation and your STEM OPT I-765");
    type("f-filed", "9");
    next();
    expect(problems()).toContain("Enter the I-765 filed date as a date, or leave it empty.");
    type("f-filed-year", "");
    type("f-filed", "");
    next();
    expect(title()).toBe("Your STEM OPT card");
    type("f-card-start", "2");
    next();
    expect(problems()).toContain("Enter the card start date as a date, or leave it empty.");
    type("f-card-start", "");
    next();

    expect(title()).toBe("Did an employer file an H-1B petition for you?");
    pick("Yes");
    next();
    expect(title()).toBe("The petition");
    next();
    expect(problems()).toContain("Enter the date the petition was filed.");
    expect(problems()).toContain("Enter the requested start date.");
    typeDate("f-filed", "2027-04-01");
    typeDate("f-requested", "2027-10-01");
    next();
    expect(title()).toBe("What is the petition's status?");
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose the petition status.");
    const statuses = within(screen.getByRole("radiogroup")).getAllByRole("radio");
    expect(statuses.map((radio) => radio.textContent)).toEqual([
      "Pending",
      "Approved",
      "Denied",
      "Rejected",
      "Withdrawn",
      "Revoked",
    ]);
    pick("Pending");
    next();
    expect(title()).toBe("Does the petition ask for a change of status?");
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose Yes or No.");
    pick("Yes");
    next();

    // Jobs.
    expect(title()).toBe("Did you have a job during OPT or STEM OPT?");
    expect(screen.getByText("Step 4 of 5")).toBeInTheDocument();
    pick("Yes");
    next();
    expect(title()).toBe("Your job");
    next();
    expect(problems()).toContain("Enter the day the job started.");
    expect(problems()).toContain(
      "Enter the day the job ended, or choose that you still work here.",
    );
    typeDate("f-start", "2026-06-20");
    typeDate("f-end", "2026-08-01");
    pick("I still work here");
    expect(input("f-end")).toBeNull();
    next();
    expect(title()).toBe("How many hours a week?");
    type("f-hours", "200");
    next();
    expect(problems()).toContain("Enter the hours a week as a number from 0 to 168.");
    type("f-hours", "40");
    next();
    expect(title()).toBe("Did you report this job to your school?");
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose Yes or No.");
    pick("Yes");
    next();
    expect(title()).toBe("Another job?");
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose Yes or No.");
    pick("Yes");
    next();
    expect(title()).toBe("Your job");
    typeDate("f-start", "2026-01-05");
    pick("It ended");
    typeDate("f-end", "2026-03-01");
    next();
    type("f-hours", "20.5");
    next();
    pick("No");
    next();
    pick("No");
    next();

    // NEXT asks nothing, so the last view is Done.
    expect(title()).toBe("What you entered");
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("Every answer is in.")).toBeInTheDocument();
    expect(screen.getByText("F-1")).toBeInTheDocument();
    expect(screen.getByText(/^MS Data Science · /)).toBeInTheDocument();
    expect(screen.getByText(/^your Bachelor's program · /)).toBeInTheDocument();
    expect(await screen.findByText(/^Duly computes: /)).toBeInTheDocument();
    expect(
      screen.getByText("Everything lives in Your case and can be changed any time."),
    ).toBeInTheDocument();

    const sent = compute.mock.calls.at(-1)?.[0] as F1Case;
    expect(sent.degree_level).toBe("master");
    expect(sent.program_end_date).toBe("2026-05-15");
    expect(sent.cpt_full_time_days).toBe(12);

    fireEvent.click(screen.getByRole("button", { name: "Open Duly" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(await screen.findByRole("navigation", { name: "Duly" })).toBeInTheDocument();
  });

  it("drops the earlier program and every job when the answer turns to No", async () => {
    mount({});
    await chooseF1();
    pick("Doctorate");
    next();
    typeDate("f-start", "2022-08-20");
    typeDate("f-end", "2027-05-15");
    next();
    next();
    pick("Yes");
    next();
    expect(title()).toBe("What level was the program before your Doctorate program?");
    back();
    pick("No");
    next();
    expect(title()).toBe("Did you have CPT during your Doctorate program?");
    pick("No");
    next();
    pick("Yes");
    next();
    next();
    next();
    pick("No");
    next();
    pick("No");
    next();
    expect(title()).toBe("Did you have a job during OPT or STEM OPT?");
    pick("Yes");
    next();
    expect(title()).toBe("Your job");
    back();
    pick("No");
    next();
    expect(title()).toBe("What you entered");
  });

  it("skips the job views when there is no OPT, and names a program by its end date", async () => {
    mount({});
    await chooseF1();
    next();
    pick("Bachelor's");
    back();
    next();
    next();
    typeDate("f-start", "2022-08-20");
    typeDate("f-end", "2026-05-15");
    next();
    next();
    pick("No");
    next();
    pick("No");
    next();
    pick("No");
    next();
    expect(title()).toBe("Did an employer file an H-1B petition for you?");
    pick("No");
    next();
    expect(title()).toBe("What you entered");
  });

  it("changes the time zone on the first view", async () => {
    mount({});
    await screen.findByText("Which visa status do you hold now?");
    expect(document.getElementById("f-zone")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    const zone = document.getElementById("f-zone") as HTMLSelectElement;
    fireEvent.change(zone, { target: { value: "America/New_York" } });
    expect(screen.getByText(/Dates are counted in America\/New York\./)).toBeInTheDocument();
  });

  it("disables Back on the first view", async () => {
    mount({});
    await screen.findByText("Which visa status do you hold now?");
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  });
});

describe("Onboarding asks Duly's questions before Done (design-1 section 5)", () => {
  async function walkToQuestions() {
    await chooseF1();
    pick("Master's");
    next();
    typeDate("f-start", "2024-08-20");
    typeDate("f-end", "2026-05-15");
    next();
    next();
    pick("No");
    next();
    pick("No");
    next();
    pick("No");
    next();
    pick("No");
    // The engine answers before the student reads the last view.
    await settle();
    next();
  }

  it("asks the engine's question, needs an answer, then records it and moves on", async () => {
    const compute = vi.fn((body: F1Case) =>
      Promise.resolve(parse(Object.keys(body.confirmations ?? {}).length > 0 ? NEXT : ASKING)),
    );
    mount({ compute });
    await walkToQuestions();
    await screen.findByText("Step 5 of 5");
    expect(title()).not.toBe("Duly's questions");
    expect(screen.getByText(/^Why we ask: nothing entered/)).toBeInTheDocument();
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose an answer.");
    fireEvent.click(within(screen.getByRole("radiogroup")).getAllByRole("radio")[1] as HTMLElement);
    next();
    expect(title()).toBe("What you entered");
    await waitFor(() => expect(compute.mock.calls.length).toBeGreaterThan(1));
    const sent = compute.mock.calls.at(-1)?.[0] as F1Case;
    expect(Object.keys(sent.confirmations ?? {})).toEqual(["held_post_completion_opt"]);
  });

  it("stays on the questions view while the answer is computed, with two questions", async () => {
    let answered = false;
    let release: () => void = () => undefined;
    const compute = vi.fn(() => {
      if (!answered) return Promise.resolve(parse(CONFLICT));
      return new Promise<EngineOutput>((resolve) => {
        release = () => resolve(parse({ ...CONFLICT, questions: CONFLICT.questions.slice(1) }));
      });
    });
    mount({ compute });
    await walkToQuestions();
    await screen.findByText("Step 5 of 5");
    const first = title();
    fireEvent.click(within(screen.getByRole("radiogroup")).getAllByRole("radio")[0] as HTMLElement);
    answered = true;
    next();
    await waitFor(() => expect(compute.mock.calls.length).toBeGreaterThan(1));
    expect(title()).not.toBe("Which visa status do you hold now?");
    expect(screen.getByText("Working it out from your dates.")).toBeInTheDocument();
    release();
    await waitFor(() => expect(title()).not.toBe(first));
    expect(screen.getByText("Step 5 of 5")).toBeInTheDocument();
  });
});

describe("Onboarding for a status that is not F-1 (design-1 section 5)", () => {
  it("names another status in the person's words and never computes", async () => {
    const compute = vi.fn<(body: F1Case) => Promise<EngineOutput>>(() =>
      Promise.resolve(parse(NEXT)),
    );
    mount({ compute });
    await screen.findByRole("radio", { name: "Another status" });
    pick("Another status");
    next();
    expect(title()).toBe("What is your status called?");
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    type("f-name", "  J-1  ");
    next();
    expect(title()).toBe("What you entered");
    expect(screen.getByText("J-1")).toBeInTheDocument();
    expect(screen.getByText("Duly holds no rules for the status you named.")).toBeInTheDocument();
    expect(compute).not.toHaveBeenCalled();
  });

  it("leaves the name out when another status is left unnamed", async () => {
    mount({});
    await screen.findByRole("radio", { name: "Another status" });
    pick("Another status");
    next();
    next();
    expect(screen.getByText("Duly holds no rules for the status you named.")).toBeInTheDocument();
    expect(document.querySelectorAll(".done-line")).toHaveLength(1);
  });

  it("offers each category /v1/status serves once, and has no rules for one without dates", async () => {
    const status = {
      ...STATUS,
      rulepacks: [
        ...STATUS.rulepacks,
        { category: "h1b", version: "v2026.09", parameters: 0 },
        { category: "h1b", version: "v2026.10", parameters: 0 },
      ],
    };
    mount({ status });
    await screen.findByRole("radio", { name: "H-1B" });
    const radios = screen.getAllByRole("radio").map((radio) => radio.textContent);
    expect(radios).toEqual(["F-1", "H-1B", "Another status"]);
    pick("H-1B");
    next();
    expect(title()).toBe("What you entered");
    expect(screen.getByText("Duly holds no rules for H-1B dates.")).toBeInTheDocument();
  });
});
