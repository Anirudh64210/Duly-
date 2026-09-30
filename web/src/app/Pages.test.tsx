import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EMPTY_CASE } from "../lib/caseForm";
import { engineOutputSchema, type EngineOutput, type F1Case } from "../lib/compute";
import { OUTPUT, STATUS } from "../lib/fixtures";
import { CaseProvider, newCase, type AppCase } from "./caseStore";
import { UPDATES_EMPTY, UPDATES_FOOTER, Updates } from "./Pages";
import { createAppRouter } from "./Shell";

// design-1 sections 9 and 10: Updates, Your case, Settings and Feedback, as a student uses them.

const parse = (output: unknown): EngineOutput => engineOutputSchema.parse(output);

// An about key the facts do not hold stays standing with no output (answers.ts).
const ABOUT = { asked_for: "tests" };

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
        name: "MS Data Science",
        cpt: false,
        cptDays: "",
        earlier: true,
      },
      {
        key: 2,
        level: "bachelor",
        start: "",
        end: "",
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
      stem_on: true,
      employment: [
        { key: 1, start: "2026-06-20", end: "", hours_per_week: "40", employer_reported: true },
        { key: 2, start: "", end: "2026-06-01", hours_per_week: "20", employer_reported: false },
      ],
      next_key: 3,
      confirmations: {
        held_post_completion_opt: { answer: true, on: "2026-09-29", about: ABOUT },
        no_employment_to_record: { answer: false, on: "2026-09-29", about: ABOUT },
        unknown_question: { answer: true, on: "2026-09-29", about: ABOUT },
      },
    },
    flow: {},
    onboarded: true,
  };
}

function mount(props: {
  path: string;
  held?: AppCase | null;
  compute?: (body: F1Case) => Promise<EngineOutput>;
  fetch?: () => Promise<unknown>;
}) {
  vi.stubGlobal(
    "fetch",
    props.fetch ??
      (() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(STATUS) })),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter(createMemoryHistory({ initialEntries: [props.path] }));
  const compute = props.compute ?? (() => Promise.resolve(parse(OUTPUT)));
  render(
    <QueryClientProvider client={client}>
      <CaseProvider initial={props.held === undefined ? heldCase() : props.held} compute={compute}>
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

const typeDate = (id: string, month: string, day: string, year: string) => {
  fireEvent.change(document.getElementById(id) as HTMLElement, { target: { value: month } });
  fireEvent.change(document.getElementById(`${id}-day`) as HTMLElement, { target: { value: day } });
  fireEvent.change(document.getElementById(`${id}-year`) as HTMLElement, {
    target: { value: year },
  });
};

describe("Updates (design-1 section 9)", () => {
  it("says how an update is published when there is none", () => {
    render(<Updates />);
    expect(screen.getByText(UPDATES_EMPTY)).toBeInTheDocument();
    expect(screen.getByText(UPDATES_FOOTER)).toBeInTheDocument();
  });

  it("lists published updates as rows, under EVERYTHING ELSE when some match", () => {
    const updates = [
      {
        id: "u1",
        headline: "A rule changed",
        plain: "The plain words.",
        source: "Federal Register",
      },
    ];
    render(<Updates response={{ updates, matching: 1 }} />);
    expect(screen.getByRole("heading", { name: "One update matches your status." })).toBeTruthy();
    expect(screen.getByText("EVERYTHING ELSE")).toBeInTheDocument();
    expect(screen.queryByText(UPDATES_EMPTY)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /A rule changed/ }));
    expect(screen.getByText("The plain words.")).toBeInTheDocument();
    cleanup();
    render(<Updates response={{ updates, matching: 0 }} />);
    expect(screen.getByText("PUBLISHED UPDATES")).toBeInTheDocument();
  });
});

describe("Your case (design-1 section 10)", () => {
  it("shows every program, with its name, level or no dates", async () => {
    mount({ path: "/case" });
    await screen.findByRole("heading", { name: "Your case" });
    expect(screen.getByText("F-1")).toBeInTheDocument();
    expect(screen.getByText("Dates are counted in America/Los Angeles.")).toBeInTheDocument();
    expect(screen.getByText("MS Data Science")).toBeInTheDocument();
    expect(screen.getByText("Aug 20, 2024 to May 15, 2026")).toBeInTheDocument();
    expect(screen.getByText("Bachelor's program")).toBeInTheDocument();
    expect(screen.getByText("Dates not entered")).toBeInTheDocument();
  });

  it("names a program with no level and no name Program", async () => {
    const held = heldCase();
    held.programs = [{ ...(held.programs[1] as AppCase["programs"][number]), level: "" }];
    mount({ path: "/case", held });
    expect(await screen.findByText("Program")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Change Program" }));
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
  });

  it("edits a program in place, and Cancel keeps what was there", async () => {
    mount({ path: "/case" });
    fireEvent.click(await screen.findByRole("button", { name: "Change MS Data Science" }));
    const name = screen.getByLabelText("The program's name, in your words");
    fireEvent.change(name, { target: { value: "MS Statistics" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("MS Data Science")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Change MS Data Science" }));
    fireEvent.change(screen.getByLabelText("The program's name, in your words"), {
      target: { value: "MS Statistics" },
    });
    typeDate("p-start-1", "9", "1", "2024");
    typeDate("p-end-1", "6", "1", "2026");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("MS Statistics")).toBeInTheDocument();
    expect(screen.getByText("Sep 1, 2024 to Jun 1, 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change MS Statistics" })).toBeInTheDocument();
  });

  it("asks before it removes a program, and Keep keeps it", async () => {
    mount({ path: "/case" });
    fireEvent.click(await screen.findByRole("button", { name: "Change Bachelor's program" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    const confirm = screen.getByRole("group", { name: "Remove this program?" });
    fireEvent.click(within(confirm).getByRole("button", { name: "Keep" }));
    expect(screen.queryByRole("group", { name: "Remove this program?" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "Remove this program?" })).getByRole("button", {
        name: "Remove",
      }),
    );
    expect(screen.queryByText("Bachelor's program")).toBeNull();
    expect(screen.getByText("MS Data Science")).toBeInTheDocument();
  });

  it("shows OPT and STEM OPT cards, and turning OPT off turns STEM OPT off", async () => {
    mount({ path: "/case" });
    await screen.findByRole("heading", { name: "Your case" });
    expect(screen.getByText("OPT card: Jun 1, 2026 to May 31, 2027")).toBeInTheDocument();
    expect(screen.getByText("STEM OPT card: Yes, card dates not entered")).toBeInTheDocument();
    const opt = screen.getByRole("radiogroup", { name: "Did you apply for post-completion OPT?" });
    fireEvent.click(within(opt).getByRole("radio", { name: "No" }));
    expect(screen.getByText("OPT card: No")).toBeInTheDocument();
    expect(screen.getByText("STEM OPT card: No")).toBeInTheDocument();
    const stem = screen.getByRole("radiogroup", {
      name: "Did you apply for a STEM OPT extension?",
    });
    fireEvent.click(within(stem).getByRole("radio", { name: "Yes" }));
    expect(screen.getByText("STEM OPT card: Yes, card dates not entered")).toBeInTheDocument();
    fireEvent.click(within(opt).getByRole("radio", { name: "Yes" }));
    expect(within(opt).getByRole("radio", { name: "Yes" })).toHaveAttribute("aria-checked", "true");
    const gap = screen.getByRole("radiogroup", {
      name: "Did an employer file an H-1B petition for you?",
    });
    fireEvent.click(within(gap).getByRole("radio", { name: "Yes" }));
    expect(within(gap).getByRole("radio", { name: "Yes" })).toHaveAttribute("aria-checked", "true");
  });

  it("shows each job as entered, and whether it is marked as reported", async () => {
    mount({ path: "/case" });
    await screen.findByRole("heading", { name: "Your case" });
    expect(screen.getByText("Job from Jun 20, 2026")).toBeInTheDocument();
    expect(screen.getByText("Still working here, marked as reported")).toBeInTheDocument();
    expect(screen.getByText("Job from a day not entered")).toBeInTheDocument();
    expect(screen.getByText("Ended Jun 1, 2026, not marked as reported")).toBeInTheDocument();
  });

  it("lists every answer before the output is in, and changes and removes one", async () => {
    mount({ path: "/case", compute: () => new Promise<EngineOutput>(() => undefined) });
    const row = await screen.findByRole("button", {
      name: /Did you have a period of post-completion OPT/,
    });
    expect(row).toHaveTextContent(/Your answer: .*"Yes, I had one"/);
    expect(screen.getByRole("button", { name: "An answer you gave" })).toBeInTheDocument();
    fireEvent.click(row);
    fireEvent.click(screen.getByRole("button", { name: "Change the answer to No, I did not" }));
    expect(row).toHaveTextContent(/Your answer: .*"No, I did not"/);
    fireEvent.click(screen.getByRole("button", { name: "Change the answer to Yes, I had one" }));
    expect(row).toHaveTextContent(/Your answer: .*"Yes, I had one"/);
    fireEvent.click(screen.getByRole("button", { name: "Remove the answer" }));
    expect(screen.queryByText(/Did you have a period of post-completion OPT/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "An answer you gave" }));
    fireEvent.click(screen.getByRole("button", { name: "Change the answer to No" }));
    fireEvent.click(screen.getByRole("button", { name: "Change the answer to Yes" }));
    expect(screen.getByRole("button", { name: "Change the answer to No" })).toBeInTheDocument();
  });

  it("sets apart the answers the engine did not read, and removes one", async () => {
    const output = parse({ ...OUTPUT, answers_read: ["held_post_completion_opt"] });
    const held = heldCase();
    held.fields.employment = held.fields.employment.slice(0, 1);
    mount({ path: "/case", held, compute: () => Promise.resolve(output) });
    const unread = await screen.findByRole("button", {
      name: "Answers not used for the facts entered now",
    });
    expect(screen.getByRole("button", { name: /post-completion OPT before/ })).toBeInTheDocument();
    fireEvent.click(unread);
    expect(screen.getByText(/No employment period is entered\./)).toBeInTheDocument();
    expect(screen.getByText(/^An answer you gave/)).toBeInTheDocument();
    const removes = screen.getAllByRole("button", { name: "Remove" });
    expect(removes).toHaveLength(2);
    fireEvent.click(removes[0] as HTMLElement);
    expect(screen.queryByText(/No employment period is entered\./)).toBeNull();
  });

  it("shows another status in the person's words, and no F-1 sections", async () => {
    mount({ path: "/case", held: { ...newCase("UTC"), status: "other", onboarded: true } });
    expect(await screen.findByText("Another status")).toBeInTheDocument();
    expect(screen.queryByText("PROGRAMS")).toBeNull();
    cleanup();
    mount({
      path: "/case",
      held: { ...newCase("UTC"), status: "other", statusName: "J-1", onboarded: true },
    });
    expect(await screen.findByText("J-1")).toBeInTheDocument();
  });
});

describe("Settings (design-1 section 10)", () => {
  it("changes the time zone and lists each rule pack with its check day", async () => {
    const status = {
      ...STATUS,
      rulepacks: [
        { category: "f1", version: "v2026.09", parameters: 0, rules_checked_on: "2026-09-28" },
        { category: "h1b", version: "v2026.10", parameters: 0 },
      ],
    };
    mount({
      path: "/settings",
      fetch: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(status) }),
    });
    expect(await screen.findByText("F-1 · v2026.09 · Checked Sep 28, 2026")).toBeInTheDocument();
    expect(screen.getByText("H-1B · v2026.10")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText("Time zone"), {
      target: { value: "America/New_York" },
    });
    expect(screen.getByText(/Dates are counted in America\/New York\./)).toBeInTheDocument();
  });

  it("says when the server cannot be reached", async () => {
    mount({ path: "/settings", fetch: () => Promise.reject(new TypeError("offline")) });
    expect(await screen.findByText("Duly could not reach its server.")).toBeInTheDocument();
  });

  it("keeps the case when Keep is chosen", async () => {
    mount({ path: "/settings" });
    fireEvent.click(await screen.findByRole("button", { name: "Delete what you entered" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(screen.queryByRole("group", { name: "Delete what you entered?" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });
});

describe("Feedback (design-1 section 10)", () => {
  it("copies the words, and says so", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    mount({ path: "/feedback" });
    const box = await screen.findByLabelText("Your feedback");
    fireEvent.change(box, { target: { value: "The timeline helps." } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy feedback" }));
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith("The timeline helps.");
    expect(screen.getByRole("status")).toHaveTextContent("Copied.");
    fireEvent.change(box, { target: { value: "More." } });
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("says what to do when the browser refuses the copy", async () => {
    const writeText = vi.fn(() => Promise.reject(new Error("denied")));
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    mount({ path: "/feedback" });
    fireEvent.click(await screen.findByRole("button", { name: "Copy feedback" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "The browser did not allow the copy. Select the words above.",
      ),
    );
  });
});
