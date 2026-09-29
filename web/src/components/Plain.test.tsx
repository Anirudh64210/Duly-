import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { calmProblems } from "../lib/calm";
import { engineOutputSchema, type EngineOutput } from "../lib/compute";
import { CASE, OUTPUT } from "../lib/fixtures";
import courtPaused from "../lib/samples/court-paused.json";
import { Items, Questions, Verdict, VerdictRules, WhatComesNext } from "./Result";

// court-paused.json is the engine's own output for a case with a program end date of
// 2026-12-15, run on 2026-09-29 with the shipped pack, trimmed to three items and their
// rules. It carries the regimes and the plain words of plain-1 section 1.

afterEach(cleanup);

const output: EngineOutput = engineOutputSchema.parse(courtPaused);
const PAUSED_PLAIN = output.regimes?.["fixed_admission_2026"]?.plain ?? "";

function showAll(shown: EngineOutput = output) {
  return render(
    <>
      <Verdict output={shown} onChangeZone={vi.fn()} />
      <WhatComesNext output={shown} sent={CASE} />
      <VerdictRules output={shown} />
      <Items output={shown} />
    </>,
  );
}

/** The row of a computed item. Items come after What comes next, so the last match. */
function rowOf(name: RegExp): HTMLElement {
  const row = screen.getAllByRole("button", { name }).at(-1)?.closest("li");
  if (!row) throw new Error("no row");
  return row;
}

describe("the engine's sample with plain words", () => {
  it("is read by the parser, with its regimes and the rules' plain words", () => {
    expect(output.regimes?.["fixed_admission_2026"]?.legal_status).toBe("enjoined");
    expect(PAUSED_PLAIN).toContain("A federal court paused it");
    expect(output.rules["grace.after_completion_days"]?.plain).toBeTruthy();
  });
});

describe("plain-1 section 2: plain words first, the exact words one tap away", () => {
  it("shows the plain words under their heading and keeps the quote behind one tap", () => {
    showAll();
    const row = rowOf(/^Grace period ends/);
    const [open] = within(row).getAllByRole("button", { name: /^Grace period ends/ });
    if (!open) throw new Error("no row button");
    fireEvent.click(open);
    const rule = output.rules["grace.after_completion_days"];
    if (!rule?.plain || !rule.quote) throw new Error("no rule");
    expect(within(row).getByText("In plain words")).toBeDefined();
    expect(within(row).getByText(rule.plain)).toBeDefined();
    expect(within(row).queryByText(rule.quote)).toBeNull();

    const exact = within(row).getByRole("button", { name: "Read the exact words" });
    expect(exact.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(exact);
    expect(exact.getAttribute("aria-expanded")).toBe("true");
    expect(within(row).getByText(rule.quote)).toBeDefined();
    const link = within(row).getByRole("link", { name: rule.citation });
    expect(link.getAttribute("href")).toBe(rule.url);
    expect(within(row).getByText("Checked Sep 28, 2026.")).toBeDefined();
  });

  it("puts the plain words before the exact words on the page", () => {
    showAll();
    const row = rowOf(/^OPT filing window opens/);
    fireEvent.click(within(row).getByRole("button", { name: /^OPT filing window opens/ }));
    const plain = within(row).getByText("In plain words");
    const exact = within(row).getByRole("button", { name: "Read the exact words" });
    expect(plain.compareDocumentPosition(exact) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it("shows a reading's note behind the tap, marked as Duly's reading", () => {
    const rule = output.rules["opt.apply_before_days"];
    if (!rule) throw new Error("no rule");
    const read = {
      ...output,
      rules: {
        ...output.rules,
        "opt.apply_before_days": {
          ...rule,
          derivation: "reading" as const,
          note: "A made up note.",
        },
      },
    };
    showAll(read);
    const row = rowOf(/^OPT filing window opens/);
    fireEvent.click(within(row).getByRole("button", { name: /^OPT filing window opens/ }));
    expect(within(row).queryByText("A made up note.")).toBeNull();
    fireEvent.click(within(row).getByRole("button", { name: "Read the exact words" }));
    expect(within(row).getByText("A made up note.")).toBeDefined();
    expect(
      within(row).getByText("Duly's reading of the quoted words, not the words of the source"),
    ).toBeDefined();
  });

  it("shows the quote as it is for a rule with no plain words", () => {
    render(<Items output={engineOutputSchema.parse(OUTPUT)} />);
    fireEvent.click(screen.getByRole("button", { name: /Grace period ends/ }));
    expect(screen.queryByRole("button", { name: "Read the exact words" })).toBeNull();
    expect(screen.getAllByText("Words of the source").length).toBeGreaterThan(0);
  });
});

describe("plain-1 section 3: what a court did, in plain words", () => {
  it("shows the paused rule's plain words, with a link to the court's order", () => {
    showAll();
    const row = rowOf(/^Grace period ends/);
    expect(within(row).getByText(PAUSED_PLAIN)).toBeDefined();
    const order = within(row).getByRole("link", { name: "Read the court's order" });
    expect(order.getAttribute("href")).toBe(output.regimes?.["fixed_admission_2026"]?.url);
  });

  it("says what is true today first, and the paused change only behind one tap", () => {
    showAll();
    const row = rowOf(/^Grace period ends/);
    expect(within(row).getByText("Feb 13, 2027")).toBeDefined();
    expect(within(row).queryByText("Jan 14, 2027")).toBeNull();
    const tap = within(row).getByRole("button", { name: "What the paused rule would change" });
    const today = within(row).getByText("Feb 13, 2027");
    expect(today.compareDocumentPosition(tap) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    fireEvent.click(tap);
    expect(within(row).getByText("Under the paused rule")).toBeDefined();
    expect(within(row).getByText("Jan 14, 2027")).toBeDefined();
  });

  it("gives a date ahead the same court line", () => {
    showAll();
    const next = screen.getByRole("heading", { name: "What comes next" }).closest("section");
    if (!next) throw new Error("no section");
    expect(within(next).getAllByText(PAUSED_PLAIN).length).toBeGreaterThan(0);
    expect(within(next).getAllByRole("link", { name: "Read the court's order" }).length).toBe(3);
  });

  it("never shows a status word, with every tap on the screen opened", () => {
    const { container } = showAll();
    for (let round = 0; round < 3; round += 1) {
      for (const button of screen.getAllByRole("button")) {
        if (button.getAttribute("aria-expanded") === "false") fireEvent.click(button);
      }
    }
    const text = container.textContent ?? "";
    expect(text).toContain("Jan 14, 2027");
    expect(text).not.toMatch(/\b(litigated|enjoined|regimes?|operative|alternates?)\b/i);
    expect(calmProblems(text).filter((found) => found.startsWith("status word"))).toEqual([]);
  });

  it("names the rule tags in the words of the SPEC", () => {
    showAll();
    expect(within(rowOf(/^Grace period ends/)).getByText("A court paused a change")).toBeDefined();
    expect(within(rowOf(/^OPT filing window opens/)).getByText("Regulation")).toBeDefined();
  });
});

describe("SPEC-resolutions points 39, 43 and 44 on the screen", () => {
  const base = engineOutputSchema.parse(OUTPUT);

  it("asks about earlier OPT at the same level and shows the values it was asked for (39)", () => {
    const onAnswer = vi.fn();
    const about = { degree_level: "master", "opt.ead_start": "2026-06-01", "opt.ead_end": null };
    render(
      <Questions
        output={{
          ...base,
          verdict: { state: "cannot_tell", reasons: ["unconfirmed:opt.earlier_at_this_level"] },
          questions: [{ id: "opt.earlier_at_this_level", because: Object.keys(about), about }],
        }}
        sent={{}}
        busy={false}
        onAnswer={onAnswer}
        onWithdraw={vi.fn()}
      />,
    );
    expect(
      screen.getByText(
        "Did you use OPT before at this degree level, before your program ended or after another program at the same level?",
      ),
    ).toBeDefined();
    expect(screen.getByText("Degree level")).toBeDefined();
    expect(screen.getByText("Jun 1, 2026")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Yes, I used OPT before at this level" }));
    expect(onAnswer).toHaveBeenCalledWith("opt.earlier_at_this_level", true, about);
  });

  it("says why Duly steps back for earlier OPT and for a rule not yet in force (39, 44)", () => {
    render(
      <Verdict
        output={{
          ...base,
          verdict: {
            state: "talk_to_dso",
            reasons: ["opt.months_at_this_level", "rule_not_in_force_on_event_day"],
          },
        }}
        onChangeZone={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/You answered that you used OPT before at this degree level/),
    ).toBeDefined();
    expect(
      screen.getByText(
        "The rule Duly would use was not yet in force on the day this counts from, so Duly does not compute the date. This is a question for your DSO.",
      ),
    ).toBeDefined();
    expect(screen.queryByText("Something in what you entered needs an answer.")).toBeNull();
  });

  it("names an open period after the last card as facts that do not fit, with its dates (43)", () => {
    const id = "employment.period_open_after_last_card";
    const about = { "employment.1.start": "2026-07-01", "opt.ead_end": "2026-05-31" };
    render(
      <Questions
        output={{
          ...base,
          verdict: { state: "cannot_tell", reasons: [`conflict:${id}`] },
          questions: [{ id, because: Object.keys(about), about }],
        }}
        sent={{}}
        entered={{
          ...CASE,
          employment: [
            { start: "2026-07-01", end: null, hours_per_week: 40, employer_reported: true },
          ],
        }}
        busy={false}
        onAnswer={vi.fn()}
        onWithdraw={vi.fn()}
      />,
    );
    expect(screen.getByText(/An employment period has no end date/)).toBeDefined();
    expect(screen.getByText("Are these the dates on your documents?")).toBeDefined();
    expect(screen.getByText("Jul 1, 2026, no end date entered")).toBeDefined();
    expect(screen.getByText("May 31, 2026")).toBeDefined();
  });
});

describe("plain-1 section 5: the verdict leads with what is known", () => {
  it("puts a known matter before a line that waits on an answer", () => {
    const base = engineOutputSchema.parse(OUTPUT);
    render(
      <Verdict
        output={{
          ...base,
          verdict: {
            state: "cannot_tell",
            reasons: ["unconfirmed:full_time_cpt_used", "rule_not_in_force_on_event_day"],
          },
        }}
        onChangeZone={vi.fn()}
      />,
    );
    const known = screen.getByText(/The rule Duly would use was not yet in force/);
    const waiting = screen.getByText("Duly is waiting for your answer to a question below.");
    expect(known.compareDocumentPosition(waiting) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    for (const line of [known.textContent ?? "", waiting.textContent ?? ""]) {
      expect(calmProblems(line)).toEqual([]);
    }
  });
});

describe("SPEC-resolutions point 46: only answers the engine read stand", () => {
  const base = engineOutputSchema.parse(OUTPUT);
  const sent = {
    full_time_cpt_used: { answer: false, on: "2026-09-28", about: { cpt_full_time_days: null } },
    no_employment_to_record: { answer: true, on: "2026-09-28", about: { employment: [] } },
  };

  it("shows as standing only the answers in answers_read, and lists the others as not used", () => {
    render(
      <Questions
        output={{ ...base, answers_read: ["full_time_cpt_used"] }}
        sent={sent}
        entered={{ ...CASE, cpt_full_time_days: null, employment: [] }}
        busy={false}
        onAnswer={vi.fn()}
        onWithdraw={vi.fn()}
      />,
    );
    const standing = screen
      .getByRole("heading", { name: "Your answers, sent with these dates" })
      .closest("section");
    const unused = screen
      .getByRole("heading", { name: "Answers not used for the facts entered now" })
      .closest("section");
    if (!standing || !unused) throw new Error("no sections");
    expect(within(standing).getByText(/Did you use any full-time CPT/)).toBeDefined();
    expect(within(standing).queryByText(/No employment period is entered/)).toBeNull();
    expect(within(unused).getByText(/No employment period is entered/)).toBeDefined();
    expect(within(unused).queryByText(/^You answered/)).toBeNull();
  });

  it("shows no answer as standing when the engine read none", () => {
    render(
      <Questions
        output={{ ...base, answers_read: [] }}
        sent={sent}
        entered={{ ...CASE, cpt_full_time_days: null, employment: [] }}
        busy={false}
        onAnswer={vi.fn()}
        onWithdraw={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("heading", { name: "Your answers, sent with these dates" }),
    ).toBeNull();
    expect(screen.getAllByRole("button", { name: "Remove the answer" })).toHaveLength(2);
  });
});
