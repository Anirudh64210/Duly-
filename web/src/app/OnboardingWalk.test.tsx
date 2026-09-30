import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OUTPUT, STATUS } from "../lib/fixtures";
import type { RecordsCase } from "../lib/records";
import { applyFlow, onboardingSteps, setField } from "../lib/views/onboarding";
import { CaseProvider, newCase, type AppCase } from "./caseStore";
import { createAppRouter } from "./Shell";

// resolutions point 15 and reviews/product-2-fix1.md findings 2, 4 and 5, notes 4 and 5: a
// student presses Continue through every view of Onboarding, as the J08 journey reads, with
// an on-campus job and the days they do not know.

let posted: RecordsCase[] = [];

function mount(held: AppCase | null = null) {
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
    if (url === "api/v1/compute") posted.push(JSON.parse(String(init?.body)) as RecordsCase);
    const body = url === "api/v1/compute" ? OUTPUT : STATUS;
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter(createMemoryHistory({ initialEntries: ["/welcome"] }));
  render(
    <QueryClientProvider client={client}>
      <CaseProvider initial={held}>
        <RouterProvider router={router} />
      </CaseProvider>
    </QueryClientProvider>,
  );
  return router;
}

afterEach(() => {
  posted = [];
  cleanup();
  vi.unstubAllGlobals();
});

const next = () => fireEvent.click(screen.getByRole("button", { name: "Continue" }));
const pick = (name: string | RegExp) => {
  fireEvent.click(screen.getByRole("radio", { name }));
};
const title = () => screen.getByRole("heading", { level: 1 }).textContent ?? "";
const why = () => document.querySelector("p.why")?.textContent ?? "";
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const type = (id: string, text: string) => {
  fireEvent.change(input(id), { target: { value: text } });
};
const problems = () =>
  [...document.querySelectorAll("p.problem:not([role])")].map((line) => line.textContent);
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

/** The one input whose id matches, such as the school name of whichever program is shown. */
function idLike(pattern: RegExp): string {
  const found = [...document.querySelectorAll("input")].find((i) => pattern.test(i.id));
  if (found === undefined) throw new Error(`no input like ${String(pattern)} on "${title()}"`);
  return found.id;
}

function typeDate(id: string, iso: string) {
  const [year, month, day] = iso.split("-") as [string, string, string];
  type(id, String(Number(month)));
  type(`${id}-day`, String(Number(day)));
  type(`${id}-year`, year);
}

/** Presses "I'm not sure" beside one date field, found by its label. */
function notSureFor(label: string) {
  const group = screen.getByRole("group", { name: label });
  fireEvent.click(within(group).getByRole("button", { name: "I'm not sure" }));
}

describe("A student walks Onboarding as J08 reads (resolutions point 15)", () => {
  it("presses Continue through every view, with an on-campus job and days left unknown", async () => {
    const router = mount();
    fireEvent.click(await screen.findByRole("radio", { name: "F-1" }));
    const seen: { title: string; why: string }[] = [];
    let jobs = 0;
    let programs = 0;
    let finished = false;
    // Each view the student meets, by its title, with what they answer there.
    const answer = (at: string): void => {
      if (at === "Which visa status do you hold now?") return;
      if (at === "Add your current I-20.") return pick("Type it in");
      if (at === "Your school, as your I-20 shows it") {
        programs += 1;
        return type(idLike(/^f-p\d-school_name$/), "School A");
      }
      if (at === "Your education level, as your I-20 shows it") {
        return pick(programs === 1 ? "Master's" : "Bachelor's");
      }
      if (at === "Your major, as your I-20 shows it") {
        return type(idLike(/^f-p\d-field_name$/), programs === 1 ? "Statistics" : "Mathematics");
      }
      if (at === "Is this degree on the STEM Designated Degree Program List?") {
        if (programs === 1) {
          fireEvent.click(screen.getByRole("button", { name: "I'm not sure" }));
          return;
        }
        return pick("Yes");
      }
      if (at === "The program start and end dates on this I-20") {
        const [start, end] =
          programs === 1 ? ["2025-01-13", "2026-12-18"] : ["2020-08-24", "2024-05-10"];
        typeDate(idLike(/^f-p\d-start_date$/), start);
        return typeDate(idLike(/^f-p\d-end_date$/), end);
      }
      if (at === "Has your DSO changed this program's end date?") return pick("No");
      if (at === "Are you still in School A, Master's?") return pick("Still studying");
      if (at === "Are you still in School A, Bachelor's?") return pick("Finished");
      if (at === "When you finished") {
        // Finding 5: the student does not know the day the course requirements were done.
        next();
        expect(problems()).toEqual(["Enter the day all course requirements were done."]);
        notSureFor("The day all course requirements were done");
        finished = true;
        return typeDate("f-p2-conferred_on", "2024-05-10");
      }
      if (at === "Is this program part of a dual degree?") return pick("No");
      if (at.startsWith("In every term")) return pick("Yes");
      if (at === "Before this program, did you study in another program in the US on an F-1?") {
        return pick("Yes");
      }
      if (at === "How did you move from School A, Bachelor's to School A, Master's?") {
        return pick("New level at the same school");
      }
      if (at === "The dates of that move") {
        next();
        // Note 4: names in field problems keep their capitals.
        expect(problems()).toEqual(["Enter the new I-20's date."]);
        return notSureFor("The new I-20's date");
      }
      if (at === "Is that every program you studied in the US on an F-1?") {
        return pick("That's every program");
      }
      if (at.startsWith("Do you have a degree from a school outside the US")) return pick("No");
      if (at === "Have you withdrawn from classes during a program on an F-1?") return pick("No");
      if (at === "During School A, Master's, did you have CPT?") return pick("No");
      if (at === "During or after School A, Master's, did you have OPT?") return pick("No");
      if (at === "During School A, Bachelor's, did you have CPT?") return pick("No");
      if (at === "During or after School A, Bachelor's, did you have OPT?") return pick("Yes");
      if (at === "Was this OPT before or after the program end date?") {
        return pick("After the program end date");
      }
      if (at.endsWith(": the recommendation and the filing")) {
        next();
        expect(problems()).toEqual(["Enter the day your DSO recommended it."]);
        notSureFor("The day your DSO recommended it");
        return typeDate("f-a1-filed_on", "2024-03-01");
      }
      if (at === "What has happened with the application so far?") return pick("Approved");
      if (at === "The day of the decision") return notSureFor("Decision day");
      if (at === "The dates on your EAD card") {
        typeDate("f-a1-card_start", "2024-06-03");
        return typeDate("f-a1-card_end", "2025-06-02");
      }
      if (at === "Did you get a STEM extension after this OPT?") return pick("No");
      if (at === "Did you have another OPT for this program?") return pick("No");
      if (at === "Was one full academic year done before your training began?") return pick("Yes");
      if (at.startsWith("Is that all the CPT and OPT for")) return pick("That's all");
      if (at === "Have you had a job in the US?") return pick("Yes");
      if (at === "This job") {
        jobs += 1;
        const [employer, start, hours] =
          jobs === 1 ? ["Acme Analytics", "2024-07-08", "40"] : ["School A", "2025-01-13", "20"];
        type(idLike(/^f-e\d-name$/), employer);
        typeDate(idLike(/^f-w\d-start$/), start);
        return type(idLike(/^f-w\d-hours_per_week$/), hours);
      }
      if (at === "Do you still work here?") {
        return pick(jobs === 1 ? "It ended" : "Still working here");
      }
      if (at === "The last day of this job") return typeDate("f-w1-end", "2025-01-12");
      if (at === "Did the hours a week change during this job?") return pick("No");
      if (at === "Which permission was this job under?") {
        if (jobs === 1) {
          expect(screen.getByText("Its dates hold the start")).toBeInTheDocument();
          return pick(/^OPT after the program end, Jun 3, 2024 to Jun 2, 2025/);
        }
        // Finding 2: the master's began on the job's first day, so the bachelor's card is
        // not marked, and "A job on campus" at the master's moves on.
        expect(screen.queryByText("Its dates hold the start")).toBeNull();
        return pick(/^A job on campus.*Master's$/);
      }
      if (at.startsWith("Is that every job")) {
        return pick(jobs === 1 ? "Add another job" : "That's every job");
      }
      if (at === "Have you left the US since Aug 24, 2020?") return pick("No");
      if (at === "Has an employer filed an H-1B petition for you?") return pick("No");
      if (at === "Your record, in order") return pick("This is everything");
      if (at === "Did you type these dates from your documents?") return pick("No");
      if (at === "Your time zone") return;
      throw new Error(`a view the walk does not know: "${at}"`);
    };

    for (let n = 0; n < 120 && title() !== "You're set."; n += 1) {
      const at = title();
      seen.push({ title: at, why: why() });
      answer(at);
      next();
      await settle();
      expect(problems(), `after "${at}"`).toEqual([]);
      expect(screen.queryByRole("alert"), `after "${at}"`).toBeNull();
    }
    expect(title()).toBe("You're set.");
    expect(finished).toBe(true);
    expect(jobs).toBe(2);
    // Finding 4: every view has its why line.
    expect(seen.length).toBeGreaterThan(50);
    expect(seen.filter((view) => view.why.trim() === "")).toEqual([]);
    expect(why()).not.toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Open Duly" }));
    await settle();
    expect(router.state.location.pathname).toBe("/");

    const sent = posted.at(-1) as RecordsCase;
    const fields = (id: string) => sent.records.find((record) => record.id === id)?.fields;
    expect(fields("w2")).toEqual({
      employer: "e2",
      on_campus: "p1",
      start: "2025-01-13",
      hours_per_week: 20,
    });
    expect(fields("w1")).toMatchObject({ under: "a1", end: "2025-01-12" });
    // The days the student did not know are left out, never guessed; the engine asks later.
    expect(fields("p2")?.coursework_done_on).toBeUndefined();
    expect(fields("p2")?.conferred_on).toBe("2024-05-10");
    expect(fields("a1")).toMatchObject({ decision: "approved", filed_on: "2024-03-01" });
    expect(fields("a1")?.dso_on).toBeUndefined();
    expect(fields("a1")?.decided_on).toBeUndefined();
    expect(fields("mv1")).toEqual({ how: "change_of_level", from_program: "p2", to_program: "p1" });
    expect(fields("p1")?.stem_list).toBe("not_sure");
    // Note 5: the withdrawal list is asked and stated with the student's own day.
    expect(sent.complete.withdrawal?.on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(sent.records.some((record) => record.kind === "withdrawal")).toBe(false);
  });
});

/** Every view up to and including one program's own I-20 views, answered. */
function current(): AppCase {
  let held: AppCase = { ...newCase("America/New_York"), status: "f1" };
  for (const [name, entered] of [
    ["school_name", "State University"],
    ["level", "master"],
    ["field_name", "Physics"],
    ["stem_list", "on_list"],
    ["start_date", "2024-08-20"],
    ["end_date", "2026-12-15"],
    ["state", "in_progress"],
    ["full_course_each_term", "yes"],
    ["online_within_limit", "yes"],
  ] as const) {
    held = setField(held, "p1", name, entered);
  }
  for (const [key, given] of [
    ["i20", "type"],
    ["ec:p1", "no"],
    ["dual:p1", "no"],
  ] as const) {
    held = applyFlow(held, key, given, "2026-09-29");
  }
  return held;
}

async function walkTo(held: AppCase, at: string) {
  mount(held);
  await settle();
  for (let n = 0; n < 60 && title() !== at; n += 1) next();
  expect(title()).toBe(at);
}

describe("Days a student may not know (finding 5)", () => {
  it("lets each day of a transfer be left unknown, and names the DSO and the I-20 in capitals", async () => {
    let held = applyFlow(current(), "earlier", "yes", "2026-09-29");
    for (const [name, entered] of [
      ["school_name", "City College"],
      ["level", "bachelor"],
      ["field_name", "Physics"],
      ["stem_list", "on_list"],
      ["start_date", "2020-08-20"],
      ["end_date", "2024-05-15"],
      ["state", "completed"],
      ["coursework_done_on", "2024-05-10"],
      ["full_course_each_term", "yes"],
      ["online_within_limit", "yes"],
    ] as const) {
      held = setField(held, "p2", name, entered);
    }
    held = applyFlow(held, "ec:p2", "no", "2026-09-29");
    held = applyFlow(held, "dual:p2", "no", "2026-09-29");
    held = setField(held, "mv1", "how", "transfer");
    await walkTo(held, "The dates of that move");
    expect(why()).not.toBe("");
    next();
    expect(problems()).toEqual([
      "Enter the day you told the school.",
      "Enter the release date.",
      "Enter the new I-20's date.",
      "Enter the day you contacted the new DSO.",
    ]);
    for (const label of [
      "The day you told the school",
      "The release date",
      "The new I-20's date",
      "The day you contacted the new DSO",
    ]) {
      notSureFor(label);
    }
    expect(screen.getAllByRole("button", { name: "I'm not sure", pressed: true })).toHaveLength(4);
    // A day typed after "I'm not sure" takes its place.
    typeDate("f-mv1-release_date", "2024-05-20");
    expect(screen.getAllByRole("button", { name: "I'm not sure", pressed: true })).toHaveLength(3);
    next();
    expect(title()).toBe("Is that every program you studied in the US on an F-1?");
  });
});

describe("A withdrawal (note 5)", () => {
  it("asks which program, the day and the DSO's part, then whether the list is whole", async () => {
    let held = applyFlow(current(), "earlier", "no", "2026-09-29");
    held = applyFlow(held, "outside", "no", "2026-09-29");
    await walkTo(held, "Have you withdrawn from classes during a program on an F-1?");
    pick("Yes");
    next();
    expect(title()).toBe("Which program did you withdraw from?");
    expect(why()).not.toBe("");
    pick("State University, Master's");
    next();
    notSureFor("The day of the withdrawal");
    next();
    expect(title()).toBe("Did your DSO authorize the withdrawal?");
    fireEvent.click(screen.getByRole("button", { name: "I'm not sure" }));
    next();
    pick("Add another withdrawal");
    next();
    expect(title()).toBe("Which program did you withdraw from?");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await settle();
    pick("That's every withdrawal");
    next();
    // The second withdrawal's views are gone: the next view is step 3.
    expect(title()).toBe("During State University, Master's, did you have CPT?");
    await settle();
    // The store computes each distinct case once, so the case with one withdrawal was posted
    // before the second was added; going back to it is read from the cache.
    const one = posted.filter(
      (body) => body.records.filter((record) => record.kind === "withdrawal").length === 1,
    );
    expect(one.at(-1)?.records.find((record) => record.id === "wd1")).toEqual({
      id: "wd1",
      kind: "withdrawal",
      fields: { program: "p1", dso_authorized: "not_sure" },
    });
  });
});

describe("Why lines (finding 4)", () => {
  it("gives every view Onboarding can build a why line", () => {
    let held = current();
    const flows: [string, string][] = [
      ["ec:p1", "yes"],
      ["earlier", "yes"],
      ["outside", "yes"],
      ["withdrawals", "yes"],
      ["opt:p1", "yes"],
      ["cpt:p1", "yes"],
      ["jobs", "yes"],
      ["still:w1", "no"],
      ["hours-changed:w1", "yes"],
      ["trips", "yes"],
      ["h1b", "yes"],
      ["typed", "yes"],
    ];
    for (const [key, given] of flows) held = applyFlow(held, key, given, "2026-09-29");
    held = setField(held, "p1", "state", "completed");
    held = setField(held, "a1", "type", "opt_pre_completion");
    held = setField(held, "a1", "decision", "approved");
    held = applyFlow(held, "opt-more:a1", "yes", "2026-09-29");
    held = setField(held, "a3", "type", "opt_post_completion");
    held = applyFlow(held, "stem:a3", "yes", "2026-09-29");
    held = setField(held, "h1", "outcome", "approved");
    held = setField(held, "p3", "where", "us_other_status");
    const views = onboardingSteps(held, 1);
    const kinds = new Set(views.map((view) => view.id.split(":")[0]));
    for (const kind of ["ec-kind", "move-dates", "where", "wd-day", "cpt-time", "opt-time"]) {
      expect(kinds).toContain(kind);
    }
    for (const kind of ["basis", "decided", "card", "job-end", "hours-change", "purpose"]) {
      expect(kinds).toContain(kind);
    }
    for (const kind of ["outcome-day", "flow", "typed-check", "questions", "done"]) {
      expect(kinds).toContain(kind);
    }
    expect(views.filter((view) => view.why.trim() === "").map((view) => view.id)).toEqual([]);
  });

  it("holds an on-campus job as its program, with no permission", () => {
    let held = applyFlow(current(), "jobs", "yes", "2026-09-29");
    held = setField(held, "w1", "under", "campus:p1");
    expect(held.draft.records.find((r) => r.id === "w1")?.fields).toMatchObject({
      under: "",
      on_campus: "p1",
    });
    held = setField(held, "w1", "under", "a9");
    expect(held.draft.records.find((r) => r.id === "w1")?.fields).toMatchObject({
      under: "a9",
      on_campus: "",
    });
  });
});
