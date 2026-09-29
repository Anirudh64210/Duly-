import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { fetchOpsAccess } from "./lib/ops";

const reply = (status: number, body: unknown = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});

function show(status: number, body: unknown = {}) {
  vi.stubGlobal("fetch", () => Promise.resolve(reply(status, body)));
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

describe("Ops placeholder", () => {
  it("shows the caller and the allowed networks", async () => {
    show(200, { caller: "203.0.113.7", allowlist: ["203.0.113.0/24"] });
    expect(await screen.findByText("You are connected from 203.0.113.7.")).toBeDefined();
    expect(screen.getByText("203.0.113.0/24")).toBeDefined();
  });

  it("shows nothing of Ops to a network that is not on the list", async () => {
    show(403);
    expect(
      await screen.findByRole("heading", { name: "This network is not on the list" }),
    ).toBeDefined();
    expect(screen.queryByText("Allowed network")).toBeNull();
  });

  it("says so when the server is down", async () => {
    show(500);
    expect(
      await screen.findByRole("heading", { name: "Ops could not reach the server" }),
    ).toBeDefined();
  });

  it("refuses a body that does not match the contract", async () => {
    const get = (() => Promise.resolve(reply(200, { caller: 7 }))) as unknown as typeof fetch;
    await expect(fetchOpsAccess(get)).rejects.toThrow();
  });
});
