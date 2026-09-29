import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { OUTPUT, STATUS } from "./lib/fixtures";

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

const FOOTER = "Records and computations, not legal advice. Confirm with your DSO or an attorney.";

type Reply = { status: number; body: unknown };

function serve(compute: Reply) {
  const posted: unknown[] = [];
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
    const reply = url === "/api/v1/compute/f1" ? compute : { status: 200, body: STATUS };
    if (url === "/api/v1/compute/f1") posted.push(JSON.parse(String(init?.body)));
    return Promise.resolve({
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      json: () => Promise.resolve(reply.body),
    });
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
  return posted;
}

function enter(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function compute() {
  fireEvent.click(screen.getByRole("button", { name: "Compute" }));
}

async function computed() {
  enter("Program end date", "2026-05-15");
  enter("Documents added", "3");
  compute();
  return screen.findByRole("heading", { name: "One thing needs you" });
}

describe("the form", () => {
  it("has a field for every top level field in the case contract", async () => {
    serve({ status: 200, body: OUTPUT });
    for (const label of [
      "Program end date",
      "Degree level",
      "Documents added",
      "Full-time CPT days",
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined();
    }
    expect(screen.getByLabelText("Program end date").getAttribute("type")).toBe("date");
    expect(await screen.findByRole("heading", { name: "Can't tell yet" })).toBeDefined();
  });

  it("switches OPT, STEM OPT, and cap-gap on and off", () => {
    serve({ status: 200, body: OUTPUT });
    const parts = {
      "Include OPT": ["OPT EAD start date", "OPT EAD end date", "OPT I-765 filed date"],
      "Include STEM OPT": ["STEM OPT EAD start date", "STEM OPT DSO recommendation date"],
      "Include cap-gap": ["H-1B petition filed date", "Requested start date", "Petition status"],
    };
    for (const [toggle, labels] of Object.entries(parts)) {
      for (const label of labels) expect(screen.queryByLabelText(label)).toBeNull();
      fireEvent.click(screen.getByLabelText(toggle));
      for (const label of labels) expect(screen.getByLabelText(label)).toBeDefined();
      fireEvent.click(screen.getByLabelText(toggle));
      for (const label of labels) expect(screen.queryByLabelText(label)).toBeNull();
    }
  });

  it("adds and removes employment periods", () => {
    serve({ status: 200, body: OUTPUT });
    const add = screen.getByRole("button", { name: "Add an employment period" });
    fireEvent.click(add);
    fireEvent.click(add);
    enter("Period 1 start date", "2026-06-01");
    enter("Period 2 start date", "2026-08-01");
    fireEvent.click(screen.getByRole("button", { name: "Remove period 1" }));
    expect((screen.getByLabelText("Period 1 start date") as HTMLInputElement).value).toBe(
      "2026-08-01",
    );
    expect(screen.queryByLabelText("Period 2 start date")).toBeNull();
  });

  it("posts the case in the shape of the contract", async () => {
    const posted = serve({ status: 200, body: OUTPUT });
    fireEvent.change(screen.getByLabelText("Degree level"), { target: { value: "doctorate" } });
    fireEvent.click(screen.getByLabelText("Include OPT"));
    enter("OPT EAD start date", "2026-06-01");
    fireEvent.click(screen.getByRole("button", { name: "Add an employment period" }));
    enter("Period 1 start date", "2026-06-20");
    enter("Period 1 hours per week", "40");
    fireEvent.click(screen.getByLabelText("Period 1 employer has been reported"));
    fireEvent.click(screen.getByLabelText("Include cap-gap"));
    enter("H-1B petition filed date", "2027-04-02");
    enter("Requested start date", "2027-10-01");
    fireEvent.change(screen.getByLabelText("Petition status"), { target: { value: "approved" } });
    fireEvent.click(screen.getByLabelText("The petition asks for a change of status"));
    await computed();
    expect(posted).toEqual([
      {
        program_end_date: "2026-05-15",
        degree_level: "doctorate",
        documents_count: 3,
        cpt_full_time_days: 0,
        opt: {
          dso_recommendation_date: null,
          i765_filed_date: null,
          ead_start: "2026-06-01",
          ead_end: null,
        },
        stem: null,
        employment: [
          { start: "2026-06-20", end: null, hours_per_week: 40, employer_reported: true },
        ],
        cap_gap: {
          petition_filed_on: "2027-04-02",
          requested_start: "2027-10-01",
          change_of_status: true,
          status: "approved",
        },
      },
    ]);
  });

  it("posts nothing and names the field when a date is not entered", () => {
    const posted = serve({ status: 200, body: OUTPUT });
    compute();
    expect(screen.getByRole("alert").textContent).toBe("Enter the program end date.");
    expect(posted).toEqual([]);
  });
});

describe("the result", () => {
  it("shows the verdict first, with its reasons and its scope line", async () => {
    serve({ status: 200, body: OUTPUT });
    const heading = await computed();
    const verdict = heading.closest("section");
    if (!verdict) throw new Error("no verdict");
    expect(
      within(verdict).getByText("Last OPT filing day after the DSO recommendation: May 1, 2026."),
    ).toBeDefined();
    expect(
      within(verdict).getByText("Based on 3 documents you added. Rules checked Sep 28, 2026."),
    ).toBeDefined();
    const first = screen.getAllByRole("heading", { level: 3 })[0];
    if (!first) throw new Error("no groups");
    expect(heading.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it("groups the items in the order of the SPEC", async () => {
    serve({ status: 200, body: OUTPUT });
    await computed();
    const groups = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(groups).toEqual(["OPT", "Unemployment", "Grace period", "CPT"]);
  });

  it("shows each item as a row with its name and its value", async () => {
    serve({ status: 200, body: OUTPUT });
    await computed();
    const row = screen.getByRole("button", { name: /Days with no employment period/ });
    expect(within(row).getByText("19 days")).toBeDefined();
  });

  it("tags a status only when it is not settled", async () => {
    serve({ status: 200, body: OUTPUT });
    await computed();
    const guidance = screen.getByRole("button", { name: /Days under the weekly hours rule/ });
    expect(within(guidance).getByText("Guidance")).toBeDefined();
    const settled = screen.getByRole("button", { name: /Days with no employment period/ });
    expect(settled.querySelector(".tag")).toBeNull();
  });

  it("shows both regimes side by side, each with its legal status", async () => {
    serve({ status: 200, body: OUTPUT });
    await computed();
    const row = screen.getByRole("button", { name: /Grace period ends/ });
    const regimes = [...row.querySelectorAll(".regime")].map((r) => r.textContent);
    expect(regimes).toEqual(["Jul 30, 2027in effect", "Jun 30, 2027blocked by a court"]);
    expect(within(row).getByText("Before a court")).toBeDefined();
  });

  it("shows the legal status the engine gave for the value in use, whatever it is", async () => {
    const appealed = {
      ...OUTPUT,
      computed: OUTPUT.computed.map((item) =>
        item.id === "grace.ends"
          ? { ...item, operative: { regime: "ds_2012", legal_status: "appealed" } }
          : item,
      ),
    };
    serve({ status: 200, body: appealed });
    await computed();
    const row = screen.getByRole("button", { name: /Grace period ends/ });
    const regimes = [...row.querySelectorAll(".regime")].map((r) => r.textContent);
    expect(regimes).toEqual(["Jul 30, 2027under appeal", "Jun 30, 2027blocked by a court"]);
    expect(within(row).queryByText("in effect")).toBeNull();
  });

  it("shows no items when a value with alternates comes without its legal status", async () => {
    const bare = {
      ...OUTPUT,
      computed: OUTPUT.computed.map(({ operative, ...item }) =>
        operative && item.id !== "grace.ends" ? { ...item, operative } : item,
      ),
    };
    serve({ status: 200, body: bare });
    enter("Program end date", "2026-05-15");
    enter("Documents added", "3");
    compute();
    expect(
      await screen.findByText("Duly could not read the answer from its server."),
    ).toBeDefined();
    expect(screen.getByRole("heading", { name: "Can't tell yet" })).toBeDefined();
    expect(screen.queryByText("in effect")).toBeNull();
    expect(screen.queryByRole("button", { name: /Grace period ends/ })).toBeNull();
  });

  it("shows the working when the row is clicked, and hides it again", async () => {
    serve({ status: 200, body: OUTPUT });
    await computed();
    const row = screen.getByRole("button", { name: /Days with no employment period/ });
    expect(row.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Inputs used")).toBeNull();

    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded")).toBe("true");
    const item = row.closest("li");
    if (!item) throw new Error("no item");
    const working = within(item);
    expect(working.getByText("OPT EAD start date")).toBeDefined();
    expect(working.getByText("Jun 1, 2026")).toBeDefined();
    expect(working.getByText("Date of the computation")).toBeDefined();
    expect(working.getByText("Jun 20, 2026, no end date, 40 hours a week, reported")).toBeDefined();
    expect(working.getByText("90 days")).toBeDefined();
    expect(working.getByText("an aggregate of 90 days")).toBeDefined();
    const link = working.getByRole("link", { name: "8 CFR 214.2(f)(10)(ii)(E)" });
    expect(link.getAttribute("href")).toBe("https://www.ecfr.gov/current/title-8/section-214.2");
    expect(working.getByText("Checked Sep 28, 2026.")).toBeDefined();

    fireEvent.click(row);
    expect(screen.queryByText("Inputs used")).toBeNull();
  });

  it("shows a value that was not computed as not computed", async () => {
    const [first, ...rest] = OUTPUT.computed;
    const body = {
      ...OUTPUT,
      verdict: { state: "cannot_tell", reasons: ["missing:opt.dso_recommendation_date"] },
      computed: [
        { ...first, value: null, inputs: { "opt.dso_recommendation_date": null } },
        ...rest,
      ],
    };
    serve({ status: 200, body });
    enter("Program end date", "2026-05-15");
    compute();
    expect(await screen.findByText("Duly needs the OPT DSO recommendation date.")).toBeDefined();
    const row = screen.getByRole("button", { name: /Last OPT filing day/ });
    expect(within(row).getByText("Not computed")).toBeDefined();
    fireEvent.click(row);
    expect(screen.getByText("Not entered")).toBeDefined();
  });

  it("clears the result when a date is changed", async () => {
    serve({ status: 200, body: OUTPUT });
    await computed();
    enter("Program end date", "2026-05-16");
    await waitFor(() => expect(screen.queryByText("Grace period ends")).toBeNull());
    expect(screen.queryByRole("heading", { name: "One thing needs you" })).toBeNull();
  });
});

describe("when the computation fails", () => {
  const cases: [string, Reply, string][] = [
    ["the server is down", { status: 503, body: {} }, "Duly could not reach its server."],
    [
      "the answer is malformed",
      { status: 200, body: { ...OUTPUT, advice: "apply now" } },
      "Duly could not read the answer from its server.",
    ],
    [
      "the case is refused",
      { status: 422, body: { detail: "program_end_date is not a date" } },
      "program_end_date is not a date",
    ],
  ];

  for (const [name, reply, line] of cases) {
    it(`cannot tell when ${name}, and never falls back to the quiet state`, async () => {
      serve(reply);
      enter("Program end date", "2026-05-15");
      compute();
      expect(await screen.findByText(line)).toBeDefined();
      expect(screen.getByRole("heading", { name: "Can't tell yet" })).toBeDefined();
      expect(screen.queryByText(/No open items/)).toBeNull();
      expect(screen.queryAllByRole("heading", { level: 3 })).toEqual([]);
    });
  }
});

describe("the footer", () => {
  it("is on every view", async () => {
    serve({ status: 200, body: OUTPUT });
    expect(screen.getByText(FOOTER)).toBeDefined();
    await computed();
    expect(screen.getByText(FOOTER)).toBeDefined();
    cleanup();

    serve({ status: 503, body: {} });
    enter("Program end date", "2026-05-15");
    compute();
    await screen.findByText("Duly could not reach its server.");
    expect(screen.getByText(FOOTER)).toBeDefined();
  });
});
