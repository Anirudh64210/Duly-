import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import stemNext from "../../samples/path-stem-next.json";
import { EMPTY_CASE } from "../lib/caseForm";
import { CaseRefused, engineOutputSchema, type EngineOutput, type F1Case } from "../lib/compute";
import { ASKING, NEXT, OUTPUT, STATUS } from "../lib/fixtures";
import { CaseProvider, newCase, type AppCase } from "./caseStore";
import { createAppRouter } from "./Shell";

// design-1 section 6: Home, in the states a student meets it in.

const parse = (output: unknown): EngineOutput => engineOutputSchema.parse(output);

function heldCase(): AppCase {
  return {
    status: "f1",
    statusName: "",
    programs: [
      {
        key: 1,
        level: "master",
        start: "2024-08-20",
        end: "2026-05-15",
        name: "",
        cpt: false,
        cptDays: "",
        earlier: false,
      },
    ],
    fields: {
      ...EMPTY_CASE,
      time_zone: "America/Los_Angeles",
      opt_on: true,
      opt: {
        dso_recommendation_date: "2026-04-01",
        i765_filed_date: "2026-04-10",
        ead_start: "2026-06-01",
        ead_end: "2027-05-31",
      },
      employment: [
        { key: 1, start: "2026-06-20", end: "", hours_per_week: "40", employer_reported: true },
        {
          key: 2,
          start: "2026-01-05",
          end: "2026-03-01",
          hours_per_week: "20",
          employer_reported: false,
        },
      ],
      next_key: 3,
    },
    flow: {},
    onboarded: true,
  };
}

function mount(props: { held?: AppCase; compute?: (body: F1Case) => Promise<EngineOutput> }) {
  vi.stubGlobal("fetch", () =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(STATUS) }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter(createMemoryHistory({ initialEntries: ["/"] }));
  const compute = props.compute ?? (() => Promise.resolve(parse(OUTPUT)));
  render(
    <QueryClientProvider client={client}>
      <CaseProvider initial={props.held ?? heldCase()} compute={compute}>
        <RouterProvider router={router} />
      </CaseProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Home while the case is computed, and when it is refused", () => {
  it("stays empty for its first moment, then says it is working", async () => {
    mount({ compute: () => new Promise<EngineOutput>(() => undefined) });
    await waitFor(() => expect(document.querySelector("[aria-busy='true']")).not.toBeNull());
    expect(screen.queryByText("Working it out from your dates.")).toBeNull();
    expect(await screen.findByText("Working it out from your dates.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Verdict" })).toBeNull();
  });

  it("says the server refused the case, never the quiet state, and tries again", async () => {
    const compute = vi.fn(() => Promise.reject(new CaseRefused("time_zone: unknown")));
    mount({ compute });
    const hero = await screen.findByRole("region", { name: "Verdict" });
    expect(within(hero).getByRole("heading", { name: "Can't tell yet" })).toBeInTheDocument();
    expect(within(hero).getByText("The server did not accept the case.")).toBeInTheDocument();
    expect(within(hero).getByText("time_zone: unknown")).toBeInTheDocument();
    expect(screen.queryByTestId("halo")).toBeNull();
    fireEvent.click(within(hero).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(compute).toHaveBeenCalledTimes(2));
  });

  it("says the server could not be reached", async () => {
    mount({ compute: () => Promise.reject(new TypeError("Failed to fetch")) });
    expect(await screen.findByText("Duly could not reach its server.")).toBeInTheDocument();
  });

  it("names a status Duly has a category for but no rules, and never computes it", async () => {
    const compute = vi.fn<(body: F1Case) => Promise<EngineOutput>>(() =>
      Promise.resolve(parse(OUTPUT)),
    );
    mount({ held: { ...newCase("UTC"), status: "h1b", onboarded: true }, compute });
    const hero = await screen.findByRole("region", { name: "Verdict" });
    expect(within(hero).getByText("H-1B")).toBeInTheDocument();
    expect(within(hero).getByRole("heading", { name: "Can't tell yet" })).toBeInTheDocument();
    expect(compute).not.toHaveBeenCalled();
  });
});

describe("Home's counts (design-1 section 6)", () => {
  it("opens the working of the unemployment count and the card's rules, one at a time", async () => {
    mount({ compute: () => Promise.resolve(parse(NEXT)) });
    const counts = await screen.findByRole("region", { name: "Counts" });
    const unemployment = within(counts).getByRole("button", { name: "UNEMPLOYMENT COUNT" });
    const card = within(counts).getByRole("button", { name: "EAD CARD ENDS" });
    fireEvent.click(unemployment);
    expect(unemployment).toHaveAttribute("aria-expanded", "true");
    expect(within(counts).getByText("Inputs used")).toBeInTheDocument();
    fireEvent.click(card);
    expect(unemployment).toHaveAttribute("aria-expanded", "false");
    expect(card).toHaveAttribute("aria-expanded", "true");
    expect(within(counts).queryByText("Inputs used")).toBeNull();
    expect(within(counts).getByText("Rules used")).toBeInTheDocument();
    fireEvent.click(card);
    expect(within(counts).queryByText("Rules used")).toBeNull();
  });

  it("shows full-time CPT while the program is the current stage, with its working", async () => {
    const cpt = OUTPUT.computed.find((item) => item.id === "cpt.full_time_days_used");
    const staged = {
      ...stemNext,
      stages: stemNext.stages.map((stage) =>
        stage.id === "program.p1"
          ? { ...stage, state: "current" }
          : stage.state === "current"
            ? { ...stage, state: "later" }
            : stage,
      ),
      computed: [...stemNext.computed, cpt],
      rules: {
        ...stemNext.rules,
        "cpt.full_time_months_bar": Object.values(stemNext.rules)[0],
      },
    };
    mount({ compute: () => Promise.resolve(parse(staged)) });
    const counts = await screen.findByRole("region", { name: "Counts" });
    const button = within(counts).getByRole("button", { name: "FULL-TIME CPT" });
    expect(within(counts).getByText("days in what you entered")).toBeInTheDocument();
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(within(counts).getByText("Inputs used")).toBeInTheDocument();
  });
});

describe("Home's questions (design-1 section 6)", () => {
  it("records a Yes from the question's own pill and computes again", async () => {
    const compute = vi.fn<(body: F1Case) => Promise<EngineOutput>>(() =>
      Promise.resolve(parse(ASKING)),
    );
    mount({ compute });
    fireEvent.click(await screen.findByRole("button", { name: /post-completion OPT before/ }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, I had one" }));
    await waitFor(() => expect(compute).toHaveBeenCalledTimes(2));
    const sent = compute.mock.calls.at(-1)?.[0] as F1Case;
    expect(sent.confirmations?.held_post_completion_opt?.answer).toBe(true);
  });

  it("records a No from the question's own pill", async () => {
    const compute = vi.fn<(body: F1Case) => Promise<EngineOutput>>(() =>
      Promise.resolve(parse(ASKING)),
    );
    mount({ compute });
    fireEvent.click(await screen.findByRole("button", { name: /post-completion OPT before/ }));
    fireEvent.click(screen.getByRole("button", { name: "No, I did not" }));
    await waitFor(() => expect(compute).toHaveBeenCalledTimes(2));
    const sent = compute.mock.calls.at(-1)?.[0] as F1Case;
    expect(sent.confirmations?.held_post_completion_opt?.answer).toBe(false);
  });

  it("takes the student from the hero to the first question", async () => {
    mount({ compute: () => Promise.resolve(parse(ASKING)) });
    const hero = await screen.findByRole("region", { name: "Verdict" });
    fireEvent.click(within(hero).getByRole("button", { name: "Answer Duly's questions" }));
    expect(document.activeElement).toHaveTextContent(/post-completion OPT before/);
  });
});

describe("Home's next dates and records (design-1 section 6)", () => {
  it("says when the STEM OPT filing window closes when the rule gives no opening", async () => {
    const closing = {
      ...NEXT,
      upcoming: NEXT.upcoming.filter((entry) => entry.id !== "next.stem.apply_window_opens"),
    };
    mount({ compute: () => Promise.resolve(parse(closing)) });
    expect(
      await screen.findByText(/^Filing window in the rule for your dates closes May 31, 2027\./),
    ).toBeInTheDocument();
  });

  it("lists every job as entered under the periods not marked as reported", async () => {
    const counted = {
      ...OUTPUT,
      computed: [
        ...OUTPUT.computed,
        {
          id: "employment.periods_not_reported",
          value: 1,
          unit: "count",
          inputs: {},
          rule_ids: ["opt.min_hours_per_week"],
          status: "guidance",
          reading: false,
        },
      ],
    };
    mount({ compute: () => Promise.resolve(parse(counted)) });
    const row = await screen.findByRole("button", {
      name: /Employment periods not marked as reported/,
    });
    fireEvent.click(row);
    expect(screen.getByText("Jun 20, 2026 onward: marked as reported")).toBeInTheDocument();
    expect(
      screen.getByText("Jan 5, 2026 to Mar 1, 2026: not marked as reported"),
    ).toBeInTheDocument();
  });
});
