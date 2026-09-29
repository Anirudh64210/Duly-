import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import {
  ANSWERED_NO,
  ASKING,
  CONFIRMED,
  CONFLICT,
  CPT_OVER,
  NEXT,
  NOTHING_ENTERED,
  OUTPUT,
  STATUS,
} from "./lib/fixtures";

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

/** Serves each reply in turn to the compute path, and the last one from then on. */
function serve(...replies: [Reply, ...Reply[]]) {
  const posted: unknown[] = [];
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
    const compute = replies[Math.min(posted.length, replies.length - 1)] ?? replies[0];
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

const ZONE = "Your time zone, which sets the day Duly counts as today";

async function computed() {
  enter("Program end date", "2026-05-15");
  enter(ZONE, "America/Los_Angeles");
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
        cpt_full_time_days: null,
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
        time_zone: "America/Los_Angeles",
        confirmations: {},
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
    const row = screen.getByRole("button", { name: /Unemployment days used/ });
    expect(within(row).getByText("19 days")).toBeDefined();
  });

  it("tags a status only when it is not settled", async () => {
    serve({ status: 200, body: OUTPUT });
    await computed();
    const guidance = screen.getByRole("button", { name: /Days under the weekly hours rule/ });
    expect(within(guidance).getByText("Guidance")).toBeDefined();
    const settled = screen.getByRole("button", { name: /Unemployment days used/ });
    expect(settled.querySelector(".tag")).toBeNull();
  });

  it("shows one value, the one in force, and one line for the rule change", async () => {
    serve({ status: 200, body: OUTPUT });
    await computed();
    const row = screen.getByRole("button", { name: /Grace period ends/ });
    expect(within(row).getByText("Jul 30, 2027")).toBeDefined();
    expect(within(row).queryByText("Jun 30, 2027")).toBeNull();
    expect(within(row).getByText("Before a court")).toBeDefined();
    const change = screen.getByRole("button", {
      name: "A rule change is blocked by a court. See what it would change.",
    });
    expect(change.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Jun 30, 2027")).toBeNull();
  });

  it("opens the rule change: the other value, the pack's legal status, and the rule", async () => {
    serve({ status: 200, body: OUTPUT });
    await computed();
    const change = screen.getByRole("button", {
      name: "A rule change is blocked by a court. See what it would change.",
    });
    fireEvent.click(change);
    expect(change.getAttribute("aria-expanded")).toBe("true");
    const item = change.closest("li");
    if (!item) throw new Error("no item");
    const panel = within(item);
    expect(panel.getByText("Jun 30, 2027")).toBeDefined();
    expect(panel.getByText("Legal status in the rule pack: enjoined")).toBeDefined();
    expect(panel.getByText("Legal status in the rule pack: effective")).toBeDefined();
    expect(panel.getByText("60 days to prepare for departure")).toBeDefined();
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
    fireEvent.click(screen.getByRole("button", { name: /A rule change is blocked by a court/ }));
    expect(screen.getByText("Legal status in the rule pack: appealed")).toBeDefined();
    expect(screen.queryByText("Legal status in the rule pack: effective")).toBeNull();
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

  it("shows the Duly settings an item used by name", async () => {
    const withSetting = {
      ...OUTPUT,
      computed: OUTPUT.computed.map((item) =>
        item.id === "opt.file_by"
          ? {
              ...item,
              inputs: { ...item.inputs, duly_settings: ["product.open_item_lookahead_days"] },
            }
          : item,
      ),
    };
    serve({ status: 200, body: withSetting });
    await computed();
    const row = screen.getByRole("button", { name: /Last OPT filing day/ });
    fireEvent.click(row);
    const item = row.closest("li");
    if (!item) throw new Error("no item");
    const working = within(item);
    expect(working.getByText("Duly settings used, which are not law")).toBeDefined();
    expect(working.getByText("How far ahead a dated item is listed as an open item")).toBeDefined();
    expect(working.queryByText("This entry could not be shown.")).toBeNull();
  });

  it("shows the working when the row is clicked, and hides it again", async () => {
    serve({ status: 200, body: OUTPUT });
    await computed();
    const row = screen.getByRole("button", { name: /Unemployment days used/ });
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

function browserReports(timeZone: string) {
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    timeZone,
  } as Intl.ResolvedDateTimeFormatOptions);
}

function zoneField() {
  return screen.getByLabelText(ZONE) as HTMLSelectElement;
}

describe("the person's own day", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the zone the browser reports", async () => {
    browserReports("Asia/Kolkata");
    const posted = serve({ status: 200, body: OUTPUT });
    expect(zoneField().value).toBe("Asia/Kolkata");
    enter("Program end date", "2026-05-15");
    compute();
    await screen.findByRole("heading", { name: "One thing needs you" });
    expect(posted).toMatchObject([{ time_zone: "Asia/Kolkata" }]);
  });

  it("asks for the zone and posts nothing when the browser reports none it can send", () => {
    browserReports("not a zone");
    const posted = serve({ status: 200, body: OUTPUT });
    expect(zoneField().value).toBe("");
    enter("Program end date", "2026-05-15");
    compute();
    expect(screen.getByRole("alert").textContent).toBe("Choose your time zone.");
    expect(posted).toEqual([]);
  });

  it("shows the day and the zone the engine used, beside the scope line", async () => {
    serve({
      status: 200,
      body: { ...OUTPUT, today: { date: "2026-09-29", time_zone: "Asia/Kolkata" } },
    });
    const heading = await computed();
    const verdict = heading.closest("section");
    if (!verdict) throw new Error("no verdict");
    const scope = within(verdict).getByText(/^Based on 3 documents/);
    expect(scope.nextElementSibling?.textContent).toContain(
      "Today is Sep 29, 2026 in Asia/Kolkata.",
    );
  });

  it("lets the person change the zone, and sends the one they chose", async () => {
    browserReports("America/Los_Angeles");
    const posted = serve({ status: 200, body: OUTPUT });
    enter("Program end date", "2026-05-15");
    compute();
    await screen.findByRole("heading", { name: "One thing needs you" });

    fireEvent.click(screen.getByRole("button", { name: "Change the time zone" }));
    expect(document.activeElement).toBe(zoneField());
    // A zone the list of the test runtime holds under this name.
    enter(ZONE, "Asia/Tokyo");
    // The result was computed for another day. It goes.
    expect(screen.queryByRole("heading", { name: "One thing needs you" })).toBeNull();
    expect(screen.queryByText(/^Today is/)).toBeNull();

    compute();
    await screen.findByRole("heading", { name: "One thing needs you" });
    expect(posted).toMatchObject([
      { time_zone: "America/Los_Angeles" },
      { time_zone: "Asia/Tokyo" },
    ]);
  });

  it("shows the server's own words when it refuses the zone", async () => {
    const words = "time_zone: the value sent is not a time zone Duly knows";
    serve({ status: 422, body: { detail: words } });
    enter("Program end date", "2026-05-15");
    enter(ZONE, "UTC");
    compute();
    expect(await screen.findByText(words)).toBeDefined();
    expect(screen.getByRole("heading", { name: "Can't tell yet" })).toBeDefined();
  });
});

const HELD = /Did you have a period of post-completion OPT before the STEM OPT period\?$/;

async function asked() {
  enter("Program end date", "2026-05-15");
  enter("Documents added", "3");
  enter(ZONE, "America/Los_Angeles");
  compute();
  return screen.findByRole("heading", { name: "Questions for you" });
}

describe("questions", () => {
  it("shows an open question in plain words, with two answers and what raised it", async () => {
    serve({ status: 200, body: ASKING });
    const heading = await asked();
    const section = heading.closest("section");
    if (!section) throw new Error("no questions");
    expect(within(section).getByText(HELD)).toBeDefined();
    expect(within(section).getByText("Asked because of: STEM OPT dates, OPT dates.")).toBeDefined();
    expect(
      within(section)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Yes, I had one", "No, I did not"]);
    expect(screen.getByRole("heading", { name: "Can't tell yet" })).toBeDefined();
    expect(screen.getByText("Duly is waiting for your answer to a question below.")).toBeDefined();
  });

  it("never fills an answer in: the first case goes out with none", async () => {
    const posted = serve({ status: 200, body: ASKING });
    await asked();
    expect(posted).toMatchObject([{ confirmations: {} }]);
  });

  for (const [button, given] of [
    ["Yes, I had one", true],
    ["No, I did not", false],
  ] as const) {
    it(`records "${button}" with the engine's day and computes again`, async () => {
      const posted = serve({ status: 200, body: ASKING }, { status: 200, body: ANSWERED_NO });
      await asked();
      fireEvent.click(screen.getByRole("button", { name: button }));
      await screen.findByRole("heading", { name: "A question for your DSO" });
      expect(posted).toHaveLength(2);
      expect(posted[1]).toMatchObject({
        program_end_date: "2026-05-15",
        time_zone: "America/Los_Angeles",
        confirmations: { held_post_completion_opt: { answer: given, on: "2026-09-28" } },
      });
    });
  }

  it("takes the day of an answer from the engine, never from the clock of the browser", async () => {
    vi.useFakeTimers({ now: new Date("2031-01-01T00:00:00Z"), toFake: ["Date"] });
    try {
      const posted = serve({ status: 200, body: ASKING }, { status: 200, body: ANSWERED_NO });
      await asked();
      fireEvent.click(screen.getByRole("button", { name: "No, I did not" }));
      await screen.findByRole("heading", { name: "A question for your DSO" });
      expect(posted[1]).toMatchObject({
        confirmations: { held_post_completion_opt: { on: "2026-09-28" } },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the answer as the person's own statement, with its day", async () => {
    serve({ status: 200, body: ASKING }, { status: 200, body: ANSWERED_NO });
    await asked();
    fireEvent.click(screen.getByRole("button", { name: "No, I did not" }));
    const heading = await screen.findByRole("heading", {
      name: "Your answers, sent with these dates",
    });
    const section = heading.closest("section");
    if (!section) throw new Error("no answers");
    expect(within(section).getByText(HELD)).toBeDefined();
    expect(
      within(section).getByText('You answered "No, I did not" on Sep 28, 2026.'),
    ).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Questions for you" })).toBeNull();
  });

  it("shows the words of the rule beside the verdict, as a reading, and no conclusion", async () => {
    serve({ status: 200, body: ASKING }, { status: 200, body: ANSWERED_NO });
    await asked();
    fireEvent.click(screen.getByRole("button", { name: "No, I did not" }));
    const heading = await screen.findByRole("heading", { name: "What the rule says" });
    const section = heading.closest("section");
    if (!section) throw new Error("no rule");
    expect(
      within(section).getByText("while in a valid period of post-completion OPT"),
    ).toBeDefined();
    expect(within(section).getByText("8 CFR 214.2(f)(10)(ii)(C)")).toBeDefined();
    expect(
      within(section).getByText("Duly's reading of the quoted words, not the words of the source"),
    ).toBeDefined();
    // A flag is its words. It has no value to show.
    expect(within(section).queryByText("Yes")).toBeNull();
    expect(screen.getByText(/so it is a question for your DSO\.$/)).toBeDefined();
  });

  it("lets an answer be changed", async () => {
    const posted = serve(
      { status: 200, body: ASKING },
      { status: 200, body: ANSWERED_NO },
      { status: 200, body: OUTPUT },
    );
    await asked();
    fireEvent.click(screen.getByRole("button", { name: "No, I did not" }));
    fireEvent.click(
      await screen.findByRole("button", { name: 'Change the answer to "Yes, I had one"' }),
    );
    await screen.findByText('You answered "Yes, I had one" on Sep 28, 2026.');
    expect(posted[2]).toMatchObject({
      confirmations: { held_post_completion_opt: { answer: true, on: "2026-09-28" } },
    });
  });

  it("lets an answer be removed, and asks again", async () => {
    const posted = serve(
      { status: 200, body: ASKING },
      { status: 200, body: ANSWERED_NO },
      { status: 200, body: ASKING },
    );
    await asked();
    fireEvent.click(screen.getByRole("button", { name: "No, I did not" }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove the answer" }));
    await screen.findByRole("heading", { name: "Questions for you" });
    expect(posted[2]).toMatchObject({ confirmations: {} });
    expect(screen.queryByText(/^You answered/)).toBeNull();
  });

  it("keeps an answer when a date is changed afterwards", async () => {
    const posted = serve({ status: 200, body: ASKING }, { status: 200, body: ANSWERED_NO });
    await asked();
    fireEvent.click(screen.getByRole("button", { name: "No, I did not" }));
    await screen.findByRole("heading", { name: "A question for your DSO" });
    enter("Program end date", "2026-05-16");
    compute();
    await screen.findByRole("heading", { name: "A question for your DSO" });
    expect(posted[2]).toMatchObject({
      program_end_date: "2026-05-16",
      confirmations: { held_post_completion_opt: { answer: false, on: "2026-09-28" } },
    });
  });

  it("offers no answers to a question it has no words for", async () => {
    serve({
      status: 200,
      body: {
        ...ASKING,
        verdict: { state: "cannot_tell", reasons: ["unconfirmed:some_new_question"] },
        questions: [{ id: "some_new_question", because: ["stem"] }],
      },
    });
    const heading = await asked();
    const section = heading.closest("section");
    if (!section) throw new Error("no questions");
    expect(
      within(section).getByText(
        "Duly has a question that this screen does not have the words for yet.",
      ),
    ).toBeDefined();
    expect(within(section).queryAllByRole("button")).toEqual([]);
    expect(section.textContent).not.toContain("some_new_question");
  });

  it("shows no items when a question is open and the verdict is not Can't tell yet", async () => {
    serve({
      status: 200,
      body: { ...ASKING, verdict: { state: "no_open_items", reasons: [] } },
    });
    enter("Program end date", "2026-05-15");
    compute();
    expect(
      await screen.findByText("Duly could not read the answer from its server."),
    ).toBeDefined();
    expect(screen.getByRole("heading", { name: "Can't tell yet" })).toBeDefined();
    expect(screen.queryByText(/No open items/)).toBeNull();
  });
});

describe("rules shown with their derivation", () => {
  async function working(row: RegExp) {
    serve({ status: 200, body: OUTPUT });
    await computed();
    fireEvent.click(screen.getByRole("button", { name: row }));
    const rules = screen.getByRole("heading", { name: "Rules used" }).nextElementSibling;
    if (!(rules instanceof HTMLElement)) throw new Error("no rules");
    return rules;
  }

  it("shows a reading as a reading: the quoted words, then the note, labelled", async () => {
    const rules = await working(/Full-time CPT days entered/);
    const text = rules.textContent ?? "";
    const words = text.indexOf("one year or more of full time curricular practical training");
    const label = text.indexOf("Duly's reading of the quoted words, not the words of the source");
    const note = text.indexOf("Reading: the source says one year or more");
    expect(words).toBeGreaterThan(-1);
    expect(label).toBeGreaterThan(words);
    expect(note).toBeGreaterThan(label);
    expect(within(rules).getByText("Words of the source")).toBeDefined();
    expect(within(rules).getByText("Duly's reading")).toBeDefined();
    expect(within(rules).queryByText("The value is written in the quoted words.")).toBeNull();
  });

  it("shows a verbatim rule as the words of the source, with no reading", async () => {
    const rules = await working(/Last OPT filing day/);
    expect(within(rules).getByText("Words of the source")).toBeDefined();
    expect(within(rules).getByText("The value is written in the quoted words.")).toBeDefined();
    expect(rules.textContent).not.toContain("Duly's reading");
  });

  it("says neither of a rule that carries no derivation", async () => {
    const rules = await working(/Unemployment days used/);
    expect(within(rules).getByText("an aggregate of 90 days")).toBeDefined();
    expect(rules.textContent).not.toContain("Duly's reading");
    expect(rules.textContent).not.toContain("The value is written");
  });
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

/** Enters the smallest case, computes, and waits for the headline of the reply. */
async function computeTo(headline: string) {
  enter("Program end date", "2026-05-15");
  enter("Documents added", "3");
  enter(ZONE, "America/Los_Angeles");
  compute();
  return screen.findByRole("heading", { name: headline });
}

function sectionOf(element: HTMLElement): HTMLElement {
  const section = element.closest("section");
  if (!section) throw new Error("no section");
  return section;
}

const SAME_DATES = "Are these the dates on your documents?";

describe("SPEC section 1: facts that do not fit", () => {
  it("says what does not fit, asks one thing, and shows the values entered", async () => {
    serve({ status: 200, body: CONFLICT });
    const verdict = sectionOf(await computeTo("Can't tell yet"));
    expect(within(verdict).getByText("The OPT I-765 filed date is after today.")).toBeDefined();
    const questions = sectionOf(screen.getByRole("heading", { name: "Questions for you" }));
    expect(within(questions).getAllByText(SAME_DATES)).toHaveLength(2);
    expect(
      within(questions).getByText("The OPT I-765 filed date is after the OPT EAD start date."),
    ).toBeDefined();
    expect(within(questions).getAllByText("OPT I-765 filed date")).toHaveLength(2);
    expect(within(questions).getAllByText("Oct 10, 2026")).toHaveLength(2);
    expect(within(questions).getByText("Jun 1, 2026")).toBeDefined();
    expect(verdict.textContent).not.toMatch(/wrong|mistake/i);
  });

  it("sends the answer yes with the engine's day and the values it was given for", async () => {
    const posted = serve({ status: 200, body: CONFLICT }, { status: 200, body: CONFIRMED });
    await computeTo("Can't tell yet");
    const [first] = screen.getAllByRole("button", {
      name: "Yes, they are the dates on my documents",
    });
    if (!first) throw new Error("no answer");
    fireEvent.click(first);
    await screen.findByRole("heading", { name: "A question for your DSO" });
    expect(posted[1]).toMatchObject({
      confirmations: {
        "opt.i765_filed_date.after_today": {
          answer: true,
          on: "2026-09-28",
          about: { "opt.i765_filed_date": "2026-10-10" },
        },
      },
    });
  });

  it("reads a confirmed conflict as a question for the DSO", async () => {
    serve({ status: 200, body: CONFIRMED });
    const verdict = sectionOf(await computeTo("A question for your DSO"));
    expect(
      within(verdict).getByText(
        "The OPT I-765 filed date is after today. You answered that these are the dates on your documents. What they mean is a question for your DSO.",
      ),
    ).toBeDefined();
  });

  it("keeps the values with an answer when it is changed", async () => {
    const posted = serve(
      { status: 200, body: CONFLICT },
      { status: 200, body: CONFIRMED },
      { status: 200, body: CONFLICT },
    );
    await computeTo("Can't tell yet");
    const [first] = screen.getAllByRole("button", {
      name: "Yes, they are the dates on my documents",
    });
    if (!first) throw new Error("no answer");
    fireEvent.click(first);
    const change = await screen.findByRole("button", {
      name: 'Change the answer to "No, I will correct them"',
    });
    fireEvent.click(change);
    await waitFor(() => expect(posted).toHaveLength(3));
    expect(posted[2]).toMatchObject({
      confirmations: {
        "opt.i765_filed_date.after_today": {
          answer: false,
          about: { "opt.i765_filed_date": "2026-10-10" },
        },
      },
    });
  });
});

describe("SPEC section 2: nothing entered is not nothing to record", () => {
  it("sends the full-time CPT days as null when the field is empty", async () => {
    const posted = serve({ status: 200, body: NOTHING_ENTERED });
    await computeTo("Can't tell yet");
    expect(posted).toMatchObject([{ cpt_full_time_days: null, opt: null, stem: null }]);
  });

  it("asks both questions and fills no answer in", async () => {
    serve({ status: 200, body: NOTHING_ENTERED });
    await computeTo("Can't tell yet");
    const questions = sectionOf(screen.getByRole("heading", { name: "Questions for you" }));
    expect(
      within(questions)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([
      "Yes, there is nothing more",
      "No, there is more to add",
      "Yes, I used some",
      "No, I used none",
    ]);
    expect(within(questions).getByText("Asked because of: Full-time CPT days.")).toBeDefined();
  });

  it("records the answer no on CPT with its values", async () => {
    const posted = serve({ status: 200, body: NOTHING_ENTERED });
    await computeTo("Can't tell yet");
    fireEvent.click(screen.getByRole("button", { name: "No, I used none" }));
    await waitFor(() => expect(posted).toHaveLength(2));
    expect(posted[1]).toMatchObject({
      confirmations: {
        full_time_cpt_used: {
          answer: false,
          on: "2026-09-28",
          about: { cpt_full_time_days: null },
        },
      },
    });
  });
});

describe("SPEC section 5: a reading is marked wherever it is shown", () => {
  it("marks the row of an item that rests on a reading", async () => {
    serve({ status: 200, body: OUTPUT });
    await computed();
    const cpt = screen.getByRole("button", { name: /Full-time CPT days entered/ });
    expect(within(cpt).getByText("Duly's reading")).toBeDefined();
    const other = screen.getByRole("button", { name: /Last OPT filing day/ });
    expect(within(other).queryByText("Duly's reading")).toBeNull();
  });

  it("marks the verdict line and shows the regulation's own words beside Duly's count", async () => {
    serve({ status: 200, body: CPT_OVER });
    const verdict = sectionOf(await computeTo("A question for your DSO"));
    expect(within(verdict).getByText(/at or over Duly's count of one year in days/)).toBeDefined();
    expect(within(verdict).getByText("Duly's reading")).toBeDefined();
    expect(within(verdict).getByText("Words of the regulation")).toBeDefined();
    expect(
      within(verdict).getByText("one year or more of full time curricular practical training"),
    ).toBeDefined();
    expect(within(verdict).getByRole("link", { name: "8 CFR 214.2(f)(10)(i)" })).toBeDefined();
    expect(verdict.textContent).not.toContain("number in the rule");
  });

  it("opens the row to the quoted words and the note", async () => {
    serve({ status: 200, body: CPT_OVER });
    await computeTo("A question for your DSO");
    fireEvent.click(screen.getByRole("button", { name: /Full-time CPT days entered/ }));
    expect(screen.getAllByText("Reading: made up for the tests.").length).toBeGreaterThan(0);
  });

  it("marks a date ahead that rests on a reading", async () => {
    serve({ status: 200, body: NEXT });
    await computeTo("No open items in what you've added");
    const next = sectionOf(screen.getByRole("heading", { name: "What comes next" }));
    const closes = within(next).getByText("STEM OPT filing window closes").closest("li");
    const opens = within(next).getByText("STEM OPT filing window opens").closest("li");
    if (!closes || !opens) throw new Error("no rows");
    expect(within(closes).getByText("Duly's reading")).toBeDefined();
    expect(within(opens).queryByText("Duly's reading")).toBeNull();
  });
});

describe("SPEC section 6: what comes next", () => {
  it("comes under the verdict, with the dates soonest first", async () => {
    serve({ status: 200, body: NEXT });
    const heading = await computeTo("No open items in what you've added");
    const next = screen.getByRole("heading", { name: "What comes next" });
    expect(heading.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    const rows = [...sectionOf(next).querySelectorAll("ol.upcoming > li .item-name")].map(
      (name) => name.firstChild?.textContent,
    );
    expect(rows).toEqual([
      "STEM OPT filing window opens",
      "STEM OPT filing window closes",
      "OPT EAD card ends",
      "Grace period ends",
    ]);
  });

  it("shows one value for a date with a rule change, and the line to open it", async () => {
    serve({ status: 200, body: NEXT });
    await computeTo("No open items in what you've added");
    const next = sectionOf(screen.getByRole("heading", { name: "What comes next" }));
    expect(within(next).getByText("Jul 30, 2027")).toBeDefined();
    expect(within(next).queryByText("Jun 30, 2027")).toBeNull();
    fireEvent.click(
      within(next).getByRole("button", {
        name: "A rule change is blocked by a court. See what it would change.",
      }),
    );
    expect(within(next).getByText("Jun 30, 2027")).toBeDefined();
  });

  it("shows the regulation's own words with the line above, each with its citation", async () => {
    serve({ status: 200, body: NEXT });
    await computeTo("No open items in what you've added");
    const next = sectionOf(screen.getByRole("heading", { name: "What comes next" }));
    expect(
      within(next).getByText(
        "This is what the regulation says. Whether it applies to you is a question for your DSO.",
      ),
    ).toBeDefined();
    expect(
      within(next).getByText("\u201ca made up line about the training plan\u201d"),
    ).toBeDefined();
    const link = within(next).getByRole("link", { name: "8 CFR 214.2(f)(10)(ii)(C)(7)(i)" });
    expect(link.getAttribute("href")).toContain("ecfr.gov");
    expect(within(next).getByText("STEM OPT filing window opens: Mar 2, 2027")).toBeDefined();
  });

  it("does not show the listed rules a second time as the words beside the verdict", async () => {
    serve({ status: 200, body: NEXT });
    await computeTo("No open items in what you've added");
    expect(screen.queryByRole("heading", { name: "What the rule says" })).toBeNull();
  });

  it("drafts a question for the DSO from the person's dates, which the person can copy", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const posted = serve({ status: 200, body: NEXT });
    fireEvent.click(screen.getByLabelText("Include OPT"));
    enter("OPT EAD start date", "2026-06-01");
    enter("OPT EAD end date", "2027-05-31");
    await computeTo("No open items in what you've added");
    const draft = document.querySelector("pre.draft");
    expect(draft?.textContent).toContain("My OPT EAD card runs from Jun 1, 2026 to May 31, 2027.");
    expect(draft?.textContent).toContain("Could you tell me whether 8 CFR 214.2(f)(10)(ii)(C)");
    expect(screen.getByText("Duly drafted it from your dates. Duly never sends it.")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Copy the question" }));
    expect(await screen.findByText("Copied.")).toBeDefined();
    expect(writeText).toHaveBeenCalledWith(draft?.textContent);
    // Nothing is sent anywhere but the compute path.
    expect(posted).toHaveLength(1);
  });

  it("says so when the browser refuses the copy", async () => {
    const writeText = vi.fn(() => Promise.reject(new Error("denied")));
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    serve({ status: 200, body: NEXT });
    await computeTo("No open items in what you've added");
    fireEvent.click(screen.getByRole("button", { name: "Copy the question" }));
    expect(
      await screen.findByText("The browser did not allow the copy. Select the words above."),
    ).toBeDefined();
  });

  it("shows nothing ahead when the engine sends nothing ahead", async () => {
    serve({ status: 200, body: OUTPUT });
    await computed();
    expect(screen.queryByRole("heading", { name: "What comes next" })).toBeNull();
  });
});

describe("SPEC section 7: words on the screen", () => {
  it("names the unemployment items as a person would", async () => {
    serve({ status: 200, body: OUTPUT });
    await computed();
    expect(screen.getByRole("button", { name: /Unemployment days used/ })).toBeDefined();
    expect(screen.queryByText(/Days with no employment period/)).toBeNull();
  });
});
