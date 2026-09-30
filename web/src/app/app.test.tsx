import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { calmProblems } from "../lib/calm";
import { EMPTY_CASE } from "../lib/caseForm";
import { engineOutputSchema, type EngineOutput, type F1Case } from "../lib/compute";
import { caseDraft } from "../lib/drafts";
import { ASKING, CONFLICT, CPT_OVER, NEXT, OUTPUT, STATUS } from "../lib/fixtures";
import { updateStatusWords } from "../lib/labels";
import { STORAGE_POINTER, STORAGE_SENTENCE } from "../lib/privacy";
import { onboardingSteps, stepLabel } from "../lib/views/onboarding";
import { updatesTitle } from "../lib/views/updates";
import { CaseProvider, caseBody, newCase, type AppCase } from "./caseStore";
import { barShare } from "./Home";
import { composeDate } from "./parts";
import { createAppRouter } from "./Shell";

const parse = (output: unknown): EngineOutput => engineOutputSchema.parse(output);

/** A case as entered: F-1, one master's program, OPT with a card, one job. */
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
      ],
      next_key: 2,
    },
    flow: {},
    onboarded: true,
  };
}

function mount(props: {
  path: string;
  held?: AppCase | null;
  compute?: (body: F1Case) => Promise<EngineOutput>;
  now?: () => Date;
}) {
  vi.stubGlobal("fetch", () =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(STATUS) }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter(createMemoryHistory({ initialEntries: [props.path] }));
  const compute = props.compute ?? (() => Promise.resolve(parse(OUTPUT)));
  render(
    <QueryClientProvider client={client}>
      <CaseProvider
        initial={props.held === undefined ? heldCase() : props.held}
        compute={compute}
        {...(props.now === undefined ? {} : { now: props.now })}
      >
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

describe("the shell (design-1 sections 3.1 and 14.2)", () => {
  // design-1 section 3.1: round B adds Timeline and Checklists in their canvas place.
  it("lists exactly the screens that exist, in canvas order, with Timeline and Checklists", async () => {
    mount({ path: "/" });
    const nav = await screen.findByRole("navigation", { name: "Duly" });
    const names = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(names).toEqual([
      "Home",
      "Timeline",
      "Checklists",
      "Updates",
      "Your case",
      "Settings",
      "Feedback",
    ]);
  });

  it("marks the active item with aria-current", async () => {
    mount({ path: "/updates" });
    const nav = await screen.findByRole("navigation", { name: "Duly" });
    expect(within(nav).getByRole("link", { name: "Updates" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("opens Onboarding with no case, and has no sidebar there", async () => {
    mount({ path: "/", held: null });
    expect(await screen.findByText("Which visa status do you hold now?")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Duly" })).toBeNull();
  });

  it("loads every round A route", async () => {
    const router = mount({ path: "/case" });
    expect(await screen.findByRole("heading", { name: "Your case" })).toBeInTheDocument();
    await act(() => router.navigate({ to: "/settings" }));
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    await act(() => router.navigate({ to: "/feedback" }));
    expect(await screen.findByRole("heading", { name: "Feedback" })).toBeInTheDocument();
    await act(() => router.navigate({ to: "/updates" }));
    expect(
      await screen.findByRole("heading", { name: "No published update matches your status." }),
    ).toBeInTheDocument();
  });

  it("opens Home on an unknown route", async () => {
    mount({ path: "/nowhere" });
    expect(await screen.findByRole("heading", { name: "One thing needs you" })).toBeTruthy();
  });
});

describe("Home (design-1 section 6)", () => {
  it("shows the verdict with its mark, eyebrow and scope, and the footer line", async () => {
    mount({ path: "/" });
    const hero = await screen.findByRole("region", { name: "Verdict" });
    expect(within(hero).getByRole("img", { name: "One thing needs you" })).toBeInTheDocument();
    expect(within(hero).getByText("F-1")).toBeInTheDocument();
    expect(within(hero).getByText(/^Based on the dates you entered\./)).toBeInTheDocument();
    expect(
      screen.getByText(
        "Records and computations, not legal advice. Confirm with your DSO or an attorney.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the halo only for no_open_items", async () => {
    mount({ path: "/", compute: () => Promise.resolve(parse(NEXT)) });
    await screen.findByRole("heading", { name: "No open items in what you've added" });
    expect(screen.getByTestId("halo")).toBeInTheDocument();
    cleanup();
    mount({ path: "/" });
    await screen.findByRole("heading", { name: "One thing needs you" });
    expect(screen.queryByTestId("halo")).toBeNull();
  });

  it("never holds a question or a rule in the hero", async () => {
    mount({ path: "/", compute: () => Promise.resolve(parse(ASKING)) });
    const hero = await screen.findByRole("region", { name: "Verdict" });
    expect(within(hero).queryByText("Read the exact words")).toBeNull();
    expect(within(hero).getByRole("button", { name: "Answer Duly's questions" })).toBeTruthy();
    expect(screen.getByText("QUESTIONS FOR YOU")).toBeInTheDocument();
  });

  it("offers the draft for a cannot_tell with no questions", async () => {
    const conflict = parse({ ...CONFLICT, questions: [] });
    mount({ path: "/", compute: () => Promise.resolve(conflict) });
    const hero = await screen.findByRole("region", { name: "Verdict" });
    expect(
      within(hero).getByRole("button", { name: "Draft the question for your DSO" }),
    ).toBeInTheDocument();
  });

  it("keeps one row open at a time across the page, and only the header toggles", async () => {
    mount({ path: "/", compute: () => Promise.resolve(parse(NEXT)) });
    await screen.findByText("WHAT COMES NEXT");
    const heads = screen
      .getAllByRole("button")
      .filter((button) => button.classList.contains("row-head"));
    expect(heads.length).toBeGreaterThan(1);
    const [first, second] = heads as [HTMLElement, HTMLElement];
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(first.getAttribute("aria-controls") ?? "");
    expect(panel).not.toBeNull();
    fireEvent.click(panel as HTMLElement);
    expect(first).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(second);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");
  });

  it("shows the STEM row with the B2 line from lists and next.stem entries", async () => {
    mount({ path: "/", compute: () => Promise.resolve(parse(NEXT)) });
    fireEvent.click(await screen.findByRole("button", { name: /STEM OPT extension/ }));
    expect(
      screen.getByText(
        "This is what the regulation says. Whether it applies to you is a question for your DSO.",
      ),
    ).toBeInTheDocument();
  });

  it("computes nothing on a focus on the same day, and again on a new day", async () => {
    const compute = vi.fn(() => Promise.resolve(parse(OUTPUT)));
    let now = new Date("2026-09-29T19:00:00Z");
    mount({ path: "/", compute, now: () => now });
    await screen.findByRole("heading", { name: "One thing needs you" });
    const today = parse(OUTPUT).today.date;
    now = new Date(`${today}T19:00:00Z`);
    const before = document.body.innerHTML;
    fireEvent.focus(window);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(document.body.innerHTML).toBe(before);
    now = new Date("2031-01-02T19:00:00Z");
    fireEvent.focus(window);
    await waitFor(() => expect(compute).toHaveBeenCalledTimes(2));
  });

  it("shows the client's fallback for a named status and never computes it", async () => {
    const compute = vi.fn(() => Promise.resolve(parse(OUTPUT)));
    mount({
      path: "/",
      held: { ...newCase("UTC"), status: "other", statusName: "J-1", onboarded: true },
      compute,
    });
    expect(await screen.findByText("Duly holds no rules for the status you named.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Can't tell yet" })).toBeInTheDocument();
    expect(compute).not.toHaveBeenCalled();
  });

  it("draws the bar from two engine values", () => {
    expect(barShare(45, 90)).toBe(0.5);
    expect(barShare(120, 90)).toBe(1);
    expect(barShare(1, 0)).toBe(0);
  });
});

describe("Onboarding (design-1 section 5)", () => {
  it("keeps each section's pip and label, and ends on Done", () => {
    const held = heldCase();
    const [latest] = held.programs as [AppCase["programs"][number]];
    held.programs = [
      { ...latest, earlier: true },
      { ...latest, key: 2, earlier: false },
    ];
    const views = onboardingSteps(held, 1);
    for (const view of views.filter((v) => v.kind === "level" || v.kind === "earlier")) {
      expect(stepLabel(view)).toBe("Step 2 of 5");
    }
    for (const view of views.filter((v) => v.kind === "cpt")) {
      expect(stepLabel(view)).toBe("Step 3 of 5");
    }
    expect(views.filter((v) => v.kind === "level")).toHaveLength(2);
    expect(views.at(-1)?.kind).toBe("done");
    expect(views.map(stepLabel).at(-1)).toBe("Done");
    expect(views.some((v) => /work type|field of/i.test(v.title))).toBe(false);
  });

  it("says where answers are stored once, on the first view", () => {
    const views = onboardingSteps(heldCase(), 1);
    const saying = views.filter((view) => view.why.includes(STORAGE_POINTER));
    expect(saying.map((view) => view.id)).toEqual(["status"]);
  });

  it("goes from another status straight to Done", () => {
    const views = onboardingSteps({ ...newCase("UTC"), status: "other" }, 0);
    expect(views.map((view) => view.kind)).toEqual(["status", "status-name", "done"]);
  });

  it("never sends a status that is not F-1", () => {
    expect(caseBody({ ...heldCase(), status: "other" })).toBeNull();
    expect(caseBody(heldCase())?.documents_count).toBe(0);
  });

  it("keeps answers across Back and Continue, and shows problems without red", async () => {
    mount({ path: "/welcome", held: null });
    expect(await screen.findByText("Step 1 of 5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose the status you hold now.");
    fireEvent.click(await screen.findByRole("radio", { name: "F-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("What level is your latest program?")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Master's" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("radio", { name: "F-1" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("radio", { name: "Master's" })).toHaveAttribute("aria-checked", "true");
  });

  it("composes typed dates into ISO dates", () => {
    expect(composeDate("5", "15", "2026")).toBe("2026-05-15");
    expect(composeDate("", "", "")).toBe("");
    expect(composeDate("x", "1", "2026")).toBe("x/1/2026");
  });
});

describe("Updates, Settings and words (design-1 sections 9, 10 and 12)", () => {
  it("titles Updates from matching, never from a list", () => {
    expect(updatesTitle(0)).toBe("No published update matches your status.");
    expect(updatesTitle(1)).toBe("One update matches your status.");
    expect(updatesTitle(3)).toBe("3 updates match your status.");
  });

  it("names all eleven legal statuses", () => {
    const all = [
      "announced",
      "proposed",
      "comment_period",
      "omb_review",
      "final",
      "effective",
      "enjoined",
      "stayed",
      "vacated",
      "appealed",
      "rescinded",
    ];
    for (const status of all)
      expect(updateStatusWords(status)).not.toBe("not named on this screen");
  });

  it("states where answers are stored in Settings, from privacy.ts", async () => {
    mount({ path: "/settings" });
    expect(await screen.findByText(STORAGE_SENTENCE)).toBeInTheDocument();
  });

  it("clears the case on Delete and opens Onboarding", async () => {
    mount({ path: "/settings" });
    fireEvent.click(await screen.findByRole("button", { name: "Delete what you entered" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Which visa status do you hold now?")).toBeInTheDocument();
  });

  it("drafts for every verdict without Duly or a computed date", () => {
    const sent = caseBody(heldCase()) as F1Case;
    for (const sample of [OUTPUT, ASKING, CONFLICT, CPT_OVER, NEXT]) {
      const output = parse(sample);
      const draft = caseDraft(output, sent);
      expect(draft).not.toMatch(/Duly/);
      expect(draft.trimEnd().endsWith("Thank you,\n[Your name]")).toBe(true);
      expect(calmProblems(draft)).toEqual([]);
    }
  });

  it("keeps every shown string calm", async () => {
    mount({ path: "/", compute: () => Promise.resolve(parse(NEXT)) });
    await screen.findByText("WHAT COMES NEXT");
    expect(calmProblems(document.body.textContent ?? "")).toEqual([]);
  });
});
