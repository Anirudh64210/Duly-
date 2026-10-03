import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import stemNext from "../../samples/path-stem-next.json";
import { engineOutputSchema, type EngineOutput } from "../lib/compute";
import { STATUS } from "../lib/fixtures";
import { shotStatus } from "../lib/shots";
import { CaseProvider, type AppCase } from "./caseStore";
import { heldCase } from "./heldCase";
import { createAppRouter } from "./Shell";

// specs/ui-1/SPEC.md points 1, 3, 4, 5, 6 and 8, as the founder sees the screens.

const output: EngineOutput = engineOutputSchema.parse(stemNext);

function mount(props: { path: string; held?: AppCase | null; status?: () => Promise<unknown> }) {
  vi.stubGlobal(
    "fetch",
    props.status ??
      (() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(STATUS) })),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter(createMemoryHistory({ initialEntries: [props.path] }));
  render(
    <QueryClientProvider client={client}>
      <CaseProvider
        initial={props.held === undefined ? heldCase() : props.held}
        compute={() => Promise.resolve(output)}
      >
        <RouterProvider router={router} />
      </CaseProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const lines = (root: HTMLElement) =>
  [...root.querySelectorAll(".reason-line")].map((line) => line.textContent ?? "");

// Every id the sample holds, in each form a screen could show it: as is, with dots or
// underscores turned into spaces, or both (point 5).
function idForms(): string[] {
  const ids = new Set<string>();
  for (const question of output.questions) {
    ids.add(question.id);
    if (question.record !== undefined) ids.add(question.record);
    for (const reason of question.because) ids.add(reason.slice(reason.indexOf(":") + 1));
  }
  for (const reason of output.verdict.reasons) ids.add(reason.slice(reason.indexOf(":") + 1));
  return [...ids].flatMap((id) => [
    id,
    id.replaceAll(".", " "),
    id.replaceAll("_", " "),
    id.replaceAll(/[._]/g, " "),
  ]);
}

// Point 6: what Why reads on path-stem-next, written out, one line for each reason.
const WHY_LINES = [
  "No document is attached to these dates yet.",
  "Did you type these dates from your documents?",
  // SPEC-W2 points 45 P4 and 50 (W2-P2): the sample's address list is not yet stated whole.
  "Is this every address in the US, through today?",
  "Permission to work 1: Day the DSO signed or entered the recommendation",
  "Program of study 1: Was one full academic year done before the training began?",
  "Program of study 1: Does the program require CPT from the start?",
  "Program of study 1: Was every term a full course of study?",
  "Program of study 1: Did online classes stay within the school's limit each term?",
  "Trip abroad 1: Day of the DSO's travel signature on that Form I-20",
  "Trip abroad 1: Was there a job to return to?",
  "Trip abroad 1: What was the trip?",
  "A court paused a change to a rule that applies here, and the two rules give different dates.",
  "Something in what you entered needs an answer.",
];

describe("Home with the path-stem-next sample (points 1, 5, 6 and 8)", () => {
  it("says under the headline how many answers are open", async () => {
    mount({ path: "/" });
    const hero = await screen.findByRole("region", { name: "Verdict" });
    // SPEC-W2 points 45 P4 and 50 (W2-P2): the sample's address list is not yet stated whole.
    expect(lines(hero)).toEqual(["10 answers would let Duly go on with your dates."]);
  });

  it("shows each reason once under Why, in its own words", async () => {
    mount({ path: "/" });
    const hero = await screen.findByRole("region", { name: "Verdict" });
    fireEvent.click(within(hero).getByRole("button", { name: /^Why/ }));
    expect(lines(hero).slice(1)).toEqual(WHY_LINES);
  });

  it("shows no id in any form, anywhere on Home", async () => {
    mount({ path: "/" });
    const hero = await screen.findByRole("region", { name: "Verdict" });
    fireEvent.click(within(hero).getByRole("button", { name: /^Why/ }));
    const text = document.body.textContent ?? "";
    for (const form of idForms()) {
      expect(text).not.toMatch(new RegExp(`(^|[^\\w])${form.replaceAll(".", "\\.")}($|[^\\w])`));
    }
    expect(text).not.toMatch(/\b[a-z]+_[a-z_]+\b/);
    expect(text).not.toContain("Duly has a question about what you entered.");
    expect(text).not.toContain("Duly is waiting for your answer to a question below.");
  });

  it("gives each question on Home its own title and a because line in words", async () => {
    mount({ path: "/" });
    const section = await screen.findByRole("region", { name: "QUESTIONS FOR YOU" });
    const titles = [...section.querySelectorAll(".row-title")].map((t) => t.textContent);
    // SPEC-W2 points 45 P4 and 50 (W2-P2): the sample's address list is not yet stated whole.
    expect(new Set(titles).size).toBe(10);
    expect(
      within(section).getAllByText("Asked because nothing is entered for it yet."),
    ).toHaveLength(8);
    // A list not stated whole waits (SPEC-W2-UNKNOWN point 14). SPEC-W2 points 45 P4 and 50
    // (W2-P2): the sample states every list whole but the address list, so one waits.
    expect(
      within(section).queryAllByText("Asked because Duly waits for your answer before it goes on."),
    ).toHaveLength(1);
    expect(
      within(section).getByText("Asked because some dates you typed are not checked yet."),
    ).toBeInTheDocument();
  });

  it("follows the canvas: headline, calm line, the metrics, then Your next move", async () => {
    mount({ path: "/" });
    const hero = await screen.findByRole("region", { name: "Verdict" });
    const order = [
      within(hero).getByRole("heading", { level: 1 }),
      // SPEC-W2 points 45 P4 and 50 (W2-P2): one more answer, the address list.
      within(hero).getByText(/^10 answers/),
      screen.getByRole("region", { name: "Counts" }),
      screen.getByRole("region", { name: "YOUR NEXT MOVE" }),
      screen.getByRole("region", { name: "QUESTIONS FOR YOU" }),
    ];
    for (let index = 1; index < order.length; index += 1) {
      const before = order[index - 1] as Node;
      expect(
        before.compareDocumentPosition(order[index] as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("has a Your next move row that goes to the questions on Home", async () => {
    mount({ path: "/" });
    const move = await screen.findByRole("region", { name: "YOUR NEXT MOVE" });
    fireEvent.click(within(move).getByRole("button", { name: "Answer Duly's questions" }));
    const questions = document.getElementById("questions");
    expect(questions).not.toBeNull();
    expect(questions?.contains(document.activeElement)).toBe(true);
  });
});

describe("Your case with no answers (point 3)", () => {
  it("says where the open questions are, with a link to Home", async () => {
    mount({ path: "/case" });
    await screen.findByRole("heading", { name: "YOUR ANSWERS" });
    expect(screen.getByText(/^No answers given yet\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home →" })).toHaveAttribute("href", "#/");
  });
});

describe("Onboarding step 1 when the rule list cannot be read (point 4)", () => {
  it("says so and offers Try again, never Another status alone", async () => {
    let calls = 0;
    mount({
      path: "/welcome",
      held: null,
      status: () => {
        calls += 1;
        return Promise.reject(new TypeError("offline"));
      },
    });
    expect(await screen.findByText(/^Duly could not load its rules/)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Another status" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(calls).toBe(2));
  });

  it("lists the statuses once the rule list is read", async () => {
    mount({ path: "/welcome", held: null });
    expect(await screen.findByRole("radio", { name: "F-1" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Another status" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("is shot with the statuses from the sample", () => {
    const status = shotStatus(output);
    expect(status.rulepacks.map((pack) => pack.category)).toEqual(
      output.rulepacks.map((pack) => pack.category),
    );
  });
});
