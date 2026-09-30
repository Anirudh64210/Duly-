import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import stemNextCase from "../../samples/path-stem-next.case.json";
import stemNext from "../../samples/path-stem-next.json";
import windowOpenCase from "../../samples/path-window-open.case.json";
import windowOpen from "../../samples/path-window-open.json";
import { CaseRefused, engineOutputSchema, type EngineOutput } from "../lib/compute";
import { STATUS } from "../lib/fixtures";
import {
  LANDMARK_ATTRIBUTE,
  SHOT_SCREENS as RUN_SCREENS,
  holdsLandmark,
  landmarkSelector,
} from "../../../desktop/src/shots";
import type { RecordsCase } from "../lib/records";
import { LANDMARKS, SHOT_SCREENS, heldFromCase, type ShotScreen } from "../lib/shots";
import { CaseProvider } from "./caseStore";
import { createAppRouter } from "./Shell";

// resolutions points 18 and 20: the shot run counts a screen as drawn when the page holds the
// element marked data-landmark="<route>". Each screen marks its own heading, once, with its
// route, read from the table the router is built from, and no error or busy screen carries
// a landmark. The shot run's own selector and check (desktop/src/shots.ts) read the page.

const SAMPLES = {
  "path-stem-next": { output: stemNext, body: stemNextCase },
  "path-window-open": { output: windowOpen, body: windowOpenCase },
};

function mount(
  route: ShotScreen,
  sample: keyof typeof SAMPLES,
  compute?: () => Promise<EngineOutput>,
) {
  vi.stubGlobal("fetch", () =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(STATUS) }),
  );
  const { output, body } = SAMPLES[sample];
  const parsed = engineOutputSchema.parse(output);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter(createMemoryHistory({ initialEntries: [route] }));
  render(
    <QueryClientProvider client={client}>
      <CaseProvider
        initial={heldFromCase(body as RecordsCase)}
        compute={compute ?? (() => Promise.resolve(parsed))}
      >
        <RouterProvider router={router} />
      </CaseProvider>
    </QueryClientProvider>,
  );
}

const marked = () => [...document.querySelectorAll<HTMLElement>("[data-landmark]")];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("each screen's landmark (resolutions points 18 and 20)", () => {
  it("is the route, for every route the router is built from", () => {
    const router = createAppRouter(createMemoryHistory({ initialEntries: ["/"] }));
    const paths = Object.keys(router.routesByPath).filter((path) => path !== "__root__");
    expect(paths.sort()).toEqual([...SHOT_SCREENS].sort());
    for (const route of SHOT_SCREENS) expect(LANDMARKS[route]).toBe(route);
    expect(LANDMARKS["/timeline"]).toBe("/timeline");
  });

  it("is the same list of screens the shot run asks for", () => {
    expect([...SHOT_SCREENS]).toEqual([...RUN_SCREENS]);
  });

  for (const sample of Object.keys(SAMPLES) as (keyof typeof SAMPLES)[]) {
    for (const route of SHOT_SCREENS) {
      it(`marks the heading of ${route} drawn from ${sample}, and nothing else`, async () => {
        mount(route, sample);
        await waitFor(() => expect(marked()).toHaveLength(1));
        const [mark] = marked();
        expect(mark).toHaveAttribute("data-landmark", route);
        // The two sides joined: the shot run's selector finds it, and its check holds.
        expect(document.querySelector(landmarkSelector(route))).toBe(mark);
        const found = {
          landmark: mark?.getAttribute(LANDMARK_ATTRIBUTE) ?? "",
          width: 1,
          height: 1,
        };
        expect(holdsLandmark([found], route)).toBe(true);
        expect(mark?.tagName).toBe("H1");
        expect(mark?.textContent).not.toBe("");
      });
    }
  }

  it("puts no landmark on Home's refusal hero", async () => {
    mount("/", "path-stem-next", () => Promise.reject(new CaseRefused("time_zone: unknown")));
    expect(await screen.findByText("The server did not accept the case.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Can't tell yet");
    expect(marked()).toEqual([]);
  });

  it("puts no landmark on Home when the network fails", async () => {
    mount("/", "path-window-open", () => Promise.reject(new TypeError("Failed to fetch")));
    await screen.findByRole("button", { name: "Try again" });
    expect(marked()).toEqual([]);
  });

  it("puts no landmark on a screen still working it out", async () => {
    const never = () => new Promise<EngineOutput>(() => undefined);
    for (const route of ["/", "/timeline", "/checklists"] as const) {
      mount(route, "path-stem-next", never);
      await waitFor(() => expect(document.querySelector(".page")).not.toBeNull());
      expect(marked()).toEqual([]);
      cleanup();
    }
  });
});
