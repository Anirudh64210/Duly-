import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import stemNext from "../../samples/path-stem-next.json";
import { engineOutputSchema, type EngineOutput } from "../lib/compute";
import { STATUS } from "../lib/fixtures";
import { appReasonLine, openQuestionsLine, questionTitle } from "../lib/labels";
import { shotStatus } from "../lib/shots";
import { CaseProvider, type AppCase } from "./caseStore";
import { heldCase } from "./heldCase";
import { createAppRouter } from "./Shell";

// specs/ui-1/SPEC.md points 1, 3 and 4, as the founder sees the screens.

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

describe("Home with the path-stem-next sample (point 1)", () => {
  it("says under the headline how many answers are open, and never a field id", async () => {
    mount({ path: "/" });
    const hero = await screen.findByRole("region", { name: "Verdict" });
    expect(within(hero).getByText(openQuestionsLine(output.questions.length))).toBeVisible();
    expect(openQuestionsLine(output.questions.length)).toBe(
      `${output.questions.length} answers would let Duly go on with your dates.`,
    );
    fireEvent.click(within(hero).getByRole("button", { name: /^Why/ }));
    for (const question of output.questions) {
      expect(hero.textContent).not.toContain(question.id);
      expect(hero.textContent).not.toContain(question.id.replaceAll("_", " "));
    }
  });

  it("shows each reason line once, with every reason one tap away under Why", async () => {
    mount({ path: "/" });
    const hero = await screen.findByRole("region", { name: "Verdict" });
    expect(lines(hero)).toHaveLength(1);
    fireEvent.click(within(hero).getByRole("button", { name: /^Why/ }));
    const shown = lines(hero);
    expect(new Set(shown).size).toBe(shown.length);
    for (const reason of output.verdict.reasons) {
      const asked = output.questions.find((question) => question.because.includes(reason));
      const line = asked ? questionTitle(asked.id) : appReasonLine(reason, output.computed);
      expect(shown).toContain(line);
    }
    expect(shown).not.toContain("Duly is waiting for your answer to a question below.");
  });

  it("has a Your next move row that goes to the questions on Home", async () => {
    mount({ path: "/" });
    const hero = await screen.findByRole("region", { name: "Verdict" });
    expect(within(hero).getByText("YOUR NEXT MOVE")).toBeInTheDocument();
    fireEvent.click(within(hero).getByRole("button", { name: "Answer Duly's questions" }));
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
