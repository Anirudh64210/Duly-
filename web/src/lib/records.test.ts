import { describe, expect, it } from "vitest";

import { CaseRefused } from "./compute";
import { OUTPUT } from "./fixtures";
import { buildRecordsCase, computeCase, nextId, typedDates, type Draft } from "./records";

// resolutions point 1 and programs.md section 10: the case POST /v1/compute takes.

const draft: Draft = {
  records: [
    {
      id: "p1",
      kind: "program",
      fields: {
        where: "us_on_f1",
        school_name: " State University ",
        level: "",
        start_date: "2024-08-20",
        end_date: "5/15/2026",
        dual_with: "p9",
      },
    },
    {
      id: "w1",
      kind: "work",
      fields: {
        under: "a1",
        start: "2026-06-20",
        hours_per_week: "40",
        change_start: "2026-07-01",
        change_hours: "x",
        hours_changes: [],
      },
    },
    { id: "a1", kind: "authorization", fields: { type: "cpt", program: "p1" } },
    { id: "w2", kind: "work", fields: { hours_per_week: "many" } },
  ],
  complete: { program: { on: "2026-09-29" } },
};

describe("buildRecordsCase", () => {
  it("leaves out every field not known, never sending it as no, none or zero", () => {
    const body = buildRecordsCase(draft, "America/New_York", {});
    expect(body.categories).toEqual(["f1"]);
    expect(body.facts).toEqual({});
    expect(body.confirmations).toBeUndefined();
    expect(body.records[0]?.fields).toEqual({
      where: "us_on_f1",
      school_name: "State University",
      start_date: "2024-08-20",
    });
    expect(body.records[1]?.fields).toEqual({
      under: "a1",
      start: "2026-06-20",
      hours_per_week: 40,
    });
    expect(body.records[3]?.fields).toEqual({});
    expect(body.complete).toEqual({ program: { on: "2026-09-29" } });
  });

  it("carries the person's answers when there are any", () => {
    const answers = { "typed_dates.from_documents": { answer: true, on: "2026-09-29" } };
    expect(buildRecordsCase(draft, "UTC", answers).confirmations).toEqual(answers);
  });

  it("names every typed date as the engine does", () => {
    const body = buildRecordsCase(draft, "UTC", {});
    expect(typedDates(body)).toEqual({ "p1.start_date": "2024-08-20", "w1.start": "2026-06-20" });
  });

  it("gives the next free id for a kind", () => {
    expect(nextId(draft.records, "program")).toBe("p2");
    expect(nextId(draft.records, "trip")).toBe("t1");
  });
});

describe("computeCase", () => {
  const reply = (status: number, body: unknown, ok = status < 400) =>
    Promise.resolve({ ok, status, json: () => Promise.resolve(body) } as Response);

  it("posts the case to /v1/compute and reads the engine's output", async () => {
    const seen: string[] = [];
    const post = ((url: string, init: RequestInit) => {
      seen.push(url, String(init.body));
      return reply(200, OUTPUT);
    }) as typeof fetch;
    const body = buildRecordsCase(draft, "UTC", {});
    const output = await computeCase(body, post);
    expect(output.verdict.state).toBe(OUTPUT.verdict.state);
    expect(seen[0]).toBe("api/v1/compute");
    expect(JSON.parse(seen[1] ?? "")).toEqual(body);
  });

  it("carries the server's words when it refuses a case", async () => {
    const body = buildRecordsCase(draft, "UTC", {});
    await expect(
      computeCase(body, (() => reply(422, { detail: "records[0]" })) as typeof fetch),
    ).rejects.toEqual(new CaseRefused("records[0]"));
    const refused = computeCase(body, (() => reply(422, {})) as typeof fetch);
    await expect(refused).rejects.toBeInstanceOf(CaseRefused);
    const unread = computeCase(body, (() =>
      Promise.resolve({
        ok: false,
        status: 422,
        json: () => Promise.reject(new Error("no body")),
      } as Response)) as typeof fetch);
    await expect(unread).rejects.toHaveProperty("problem", null);
    await expect(computeCase(body, (() => reply(500, {})) as typeof fetch)).rejects.toThrow(
      "status 500",
    );
  });
});
