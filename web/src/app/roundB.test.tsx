import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { engineOutputSchema, type EngineOutput } from "../lib/compute";
import { STATUS } from "../lib/fixtures";
import stemNext from "../../samples/path-stem-next.json";
import { B2_LINE, TIMELINE_LINK } from "../lib/views/stages";
import { CaseProvider } from "./caseStore";
import { heldCase } from "./heldCase";
import type { RecordsCase } from "../lib/records";
import { createAppRouter } from "./Shell";

// design-1 sections 6 (round B), 7 and 8, on engine output made by engine/path.py.
const NEXT = engineOutputSchema.parse(stemNext);

function mount(path: string, compute: (body: RecordsCase) => Promise<EngineOutput>) {
  vi.stubGlobal("fetch", () =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(STATUS) }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  render(
    <QueryClientProvider client={client}>
      <CaseProvider initial={heldCase()} compute={compute}>
        <RouterProvider router={router} />
      </CaseProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Timeline (design-1 section 7)", () => {
  it("opens the current phase by default and names every mark", async () => {
    mount("/timeline", () => Promise.resolve(NEXT));
    expect(await screen.findByText("APPLICATION")).toBeInTheDocument();
    expect(screen.getByText("From the dates you entered")).toBeInTheDocument();
    // SPEC-W2 point 45 P3: the job-start report row adds a fourth Done.
    expect(screen.getAllByRole("img", { name: "Done" })).toHaveLength(4);
    expect(screen.getByRole("img", { name: "Now" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Next" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Later" })).toBeInTheDocument();
  });

  it("keeps one row open at a time, and a second click closes it", async () => {
    mount("/timeline", () => Promise.resolve(NEXT));
    await screen.findByText("APPLICATION");
    const next = screen.getByRole("button", { name: /STEM OPT extension/u });
    fireEvent.click(next);
    expect(screen.queryByText("APPLICATION")).not.toBeInTheDocument();
    expect(screen.getByText(B2_LINE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the checklist →" })).toBeInTheDocument();
    fireEvent.click(next);
    expect(screen.queryByText(B2_LINE)).not.toBeInTheDocument();
  });

  it("claims nothing is maintained, verified or matched", async () => {
    mount("/timeline", () => Promise.resolve(NEXT));
    await screen.findByText("APPLICATION");
    expect(document.body.textContent).not.toMatch(/maintained|verified|match/iu);
  });
});

describe("Checklists (design-1 section 8)", () => {
  it("shows the next filing's steps with the B2 line and the reading mark", async () => {
    mount("/checklists", () => Promise.resolve(NEXT));
    expect(await screen.findByRole("heading", { name: "STEM OPT extension" })).toBeInTheDocument();
    expect(screen.getByText(B2_LINE)).toBeInTheDocument();
    expect(
      screen.getByText("0 of 11 confirmed by you · Duly's reading of the rules cited on each step"),
    ).toBeInTheDocument();
    const chip = screen.getByRole("button", { name: "STEM OPT extension" });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveAttribute("data-next", "true");
  });

  it("draws the finished path's chip check as an SVG, never a character", async () => {
    mount("/checklists", () => Promise.resolve(NEXT));
    const chip = await screen.findByRole("button", { name: "CPT" });
    expect(chip.querySelector("svg.chip-check")).not.toBeNull();
    expect(chip.textContent).not.toContain(String.fromCodePoint(0x2713));
  });

  it("records a tick with the engine's day and computes again", async () => {
    const compute = vi.fn<(body: RecordsCase) => Promise<EngineOutput>>(() =>
      Promise.resolve(NEXT),
    );
    mount("/checklists", compute);
    const box = await screen.findByRole("checkbox", {
      name: "A completed and signed Form I-983, the training plan",
    });
    fireEvent.click(box);
    await waitFor(() => expect(compute).toHaveBeenCalledTimes(2));
    const sent = compute.mock.calls[1]?.[0];
    expect(sent?.confirmations?.["step.stem_opt.i983"]).toEqual({
      answer: true,
      on: NEXT.today.date,
    });
  });

  it("puts the school line in the caution colour with a draft for the DSO", async () => {
    mount("/checklists", () => Promise.resolve(NEXT));
    const line = await screen.findByText(
      "This step varies by university. Your school's process is the authority here.",
    );
    expect(line).toHaveClass("caution-line");
    const step = line.closest(".step") as HTMLElement;
    fireEvent.click(within(step).getByRole("button", { name: "Draft the question for your DSO" }));
    const draft = within(step).getByRole("textbox");
    expect((draft as HTMLTextAreaElement).value).not.toMatch(/Duly/u);
    expect((draft as HTMLTextAreaElement).value).not.toMatch(/Nov 11, 2026|2026-11-11/u);
  });

  it("shows no completion moment on a finished CPT view", async () => {
    mount("/checklists", () => Promise.resolve(NEXT));
    fireEvent.click(await screen.findByRole("button", { name: "CPT" }));
    expect(screen.getByText("The authorizations, with the dates you entered.")).toBeInTheDocument();
    expect(document.querySelector(".completion")).toBeNull();
  });
});

describe("Home, round B (design-1 section 6)", () => {
  it("names the current stage in the eyebrow with its scope", async () => {
    mount("/", () => Promise.resolve(NEXT));
    expect(
      await screen.findByText("F-1 · POST-COMPLETION OPT, FROM THE DATES YOU ENTERED"),
    ).toBeInTheDocument();
  });

  it("shows the card end from the current stage, with the engine's days", async () => {
    mount("/", () => Promise.resolve(NEXT));
    expect(await screen.findByText("EAD CARD ENDS")).toBeInTheDocument();
    expect(screen.getByText("Feb 9, 2027")).toBeInTheDocument();
    const days = NEXT.stages?.find((stage) => stage.state === "current")?.ends_days_away;
    expect(screen.getByText(`${String(days)} days from today`)).toBeInTheDocument();
  });

  it("gives each next stage a row with the B2 line, the count and the checklist", async () => {
    mount("/", () => Promise.resolve(NEXT));
    const row = await screen.findByRole("button", { name: /STEM OPT extension/u });
    fireEvent.click(row);
    expect(screen.getByText(B2_LINE)).toBeInTheDocument();
    expect(screen.getByText("0 of 11 confirmed by you in the list.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the checklist →" })).toBeInTheDocument();
  });

  it("sends every date and count to Timeline", async () => {
    mount("/", () => Promise.resolve(NEXT));
    expect(await screen.findByRole("link", { name: TIMELINE_LINK })).toHaveAttribute(
      "href",
      "#/timeline",
    );
  });
});
