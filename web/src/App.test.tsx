import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

const body = (state: string, reasons: string[]) => ({
  database: "ok",
  rulepacks: [{ category: "f1", version: "v2026.09", parameters: 0 }],
  verdict: { state, reasons },
  checked_at: "2026-09-28T12:00:00+00:00",
});

function show(response: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  vi.stubGlobal("fetch", () => Promise.resolve(response));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Home placeholder", () => {
  it("says it cannot tell for an empty case, with the reason", async () => {
    show({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body("cannot_tell", ["no_documents"])),
    });
    expect(await screen.findByRole("heading", { name: "Can't tell yet" })).toBeDefined();
    expect(screen.getByText("Nothing has been added yet.")).toBeDefined();
  });

  it("always carries the scope line and the footer", async () => {
    show({ ok: true, status: 200, json: () => Promise.resolve(body("no_open_items", [])) });
    expect(await screen.findByText(/Based on 0 documents you added/)).toBeDefined();
    expect(screen.getByText(/not legal advice/)).toBeDefined();
  });

  it("does not fall back to the quiet state when the server is down", async () => {
    show({ ok: false, status: 503, json: () => Promise.resolve({}) });
    expect(await screen.findByRole("heading", { name: "Can't tell yet" })).toBeDefined();
    expect(screen.queryByText(/No open items/)).toBeNull();
  });
});
