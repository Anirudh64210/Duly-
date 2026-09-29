import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { engineOutputSchema, type EngineOutput } from "../lib/compute";
import completeBy from "../lib/samples/complete-by.json";
import answered from "../lib/samples/stem-periods-answered.json";
import asked from "../lib/samples/stem-periods-asked.json";
import { Items, Questions, Verdict } from "./Result";

// The samples are the engine's own output for two cases, run on 2026-09-29 with the
// shipped pack, trimmed to the items and rules these tests read.

afterEach(cleanup);

function parsed(raw: unknown): EngineOutput {
  return engineOutputSchema.parse(raw);
}

function showQuestions(output: EngineOutput, onAnswer = vi.fn()) {
  render(
    <Questions output={output} sent={{}} busy={false} onAnswer={onAnswer} onWithdraw={vi.fn()} />,
  );
  return onAnswer;
}

function showVerdict(output: EngineOutput) {
  render(<Verdict output={output} onChangeZone={vi.fn()} />);
}

const FORBIDDEN = /late|missed|wrong|mistake|overdue|failed/i;

describe("the engine's samples", () => {
  it("are read by the parser", () => {
    expect(() => parsed(completeBy)).not.toThrow();
    expect(() => parsed(asked)).not.toThrow();
    expect(() => parsed(answered)).not.toThrow();
  });
});

describe("SPEC-resolutions point 16: an OPT card that ends after the day to complete OPT", () => {
  it("says what does not fit, that the date is Duly's count, and shows the rule", () => {
    const output = parsed(completeBy);
    showQuestions(output);
    const line = screen.getByText(/^The OPT EAD end date is after the date OPT is to be completed/);
    expect(line.textContent).toContain("Duly's count from the months in the rule");
    const question = line.closest("li");
    if (!question) throw new Error("no question");
    expect(within(question).getByText("Are these the dates on your documents?")).toBeDefined();
    expect(within(question).getByText("opt.complete_within_months")).toBeDefined();
    expect(within(question).getByText(/within a 14-month period/)).toBeDefined();
    expect(within(question).getByText("Aug 1, 2026")).toBeDefined();
    expect(question.textContent).not.toMatch(FORBIDDEN);
  });

  it("reads the open conflict in the verdict as what does not fit", () => {
    showVerdict(parsed(completeBy));
    expect(screen.getByText(/^The OPT EAD end date is after the date OPT/)).toBeDefined();
  });
});

describe("SPEC-resolutions points 20, 21 and 22: questions about a period and a report", () => {
  it("asks each question in plain words, with its values and two answers", () => {
    const onAnswer = showQuestions(parsed(asked));
    expect(
      screen.getByText(
        "Employment period 1 has an end date. Has the end of this period been reported to your DSO?",
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        "Employment period 2 begins inside the STEM OPT EAD dates. Is this period with a new employer?",
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        "The date for the final evaluation for employment period 1 is before today. Did you submit this report?",
      ),
    ).toBeDefined();
    expect(screen.getByText("Employment period 1 end date")).toBeDefined();
    expect(screen.getByText("Final evaluation due for employment period 1")).toBeDefined();
    expect(screen.getByText("Jul 11, 2026")).toBeDefined();
    expect(document.body.textContent).not.toMatch(FORBIDDEN);
    expect(document.body.textContent).not.toContain("employment.1");

    fireEvent.click(screen.getByRole("button", { name: "Yes, a new employer" }));
    expect(onAnswer).toHaveBeenCalledWith("employment.2.new_employer", true, {
      "employment.2.start": "2026-07-02",
      "stem.ead_start": "2026-06-01",
    });
    fireEvent.click(screen.getByRole("button", { name: "No, it has not been reported" }));
    expect(onAnswer).toHaveBeenLastCalledWith("employment.1.end_reported", false, {
      "employment.1.start": "2025-06-02",
      "employment.1.end": "2026-07-01",
    });
  });

  it("says Duly is waiting while the questions are open", () => {
    showVerdict(parsed(asked));
    expect(screen.getByText("Duly is waiting for your answer to a question below.")).toBeDefined();
  });

  it("hands a report the person did not submit to the DSO, and says nothing of what it means", () => {
    showVerdict(parsed(answered));
    const line = screen.getByText(
      "You answered that you did not submit the final evaluation for employment period 1. What that means is a question for your DSO.",
    );
    expect(line.closest("section")?.textContent).not.toMatch(FORBIDDEN);
  });

  it("names the items of each period, and marks the day to report as guidance", () => {
    render(<Items output={parsed(answered)} />);
    expect(
      screen.getByText("New training plan (Form I-983) due for employment period 2"),
    ).toBeDefined();
    const concluding = screen.getByText("Final evaluation due for employment period 1");
    expect(within(concluding).getByText("Duly's reading")).toBeDefined();
    const report = screen.getByText(
      "Day to report the end of employment period 1, from SEVP guidance",
    );
    expect(within(report).getByText("Guidance")).toBeDefined();
    fireEvent.click(report);
    expect(screen.getByText(/Study in the States/)).toBeDefined();
  });
});

describe("SPEC-resolutions point 22: report_employer is SEVP guidance", () => {
  it("says the day to report is SEVP guidance, not the words of the regulation", () => {
    const output = parsed(answered);
    showVerdict({ ...output, verdict: { state: "needs_you", reasons: ["report_employer"] } });
    const line = screen.getByText(/is not marked as reported to your DSO/);
    expect(line.textContent).toContain("SEVP guidance, not the words of the regulation");
  });
});

describe("SPEC-resolutions point 19: unemployment on the OPT card", () => {
  it("says the count and the rule, and shows the rule's words beside it", () => {
    const output = parsed(answered);
    showVerdict({
      ...output,
      verdict: { state: "talk_to_dso", reasons: ["unemployment_opt_card_at_or_over_limit"] },
    });
    expect(
      screen.getByText(
        "Unemployment days counted inside the OPT EAD dates: 1 day. This is at or over the limit in the rule for the OPT period, shown below.",
      ),
    ).toBeDefined();
    expect(screen.getByText("Words of the regulation")).toBeDefined();
  });
});

describe("an id the screen has no words for is never shown as nothing", () => {
  const output = parsed(completeBy);

  it("reads an unknown conflict as facts that do not fit, and asks the one conflict question", () => {
    const onAnswer = showQuestions({
      ...output,
      verdict: { state: "cannot_tell", reasons: ["conflict:opt.some_new_fact"] },
      questions: [
        {
          id: "opt.some_new_fact",
          because: ["opt.ead_end"],
          about: { "opt.ead_end": "2026-08-01" },
        },
      ],
    });
    expect(screen.getByText("Some facts entered do not fit together.")).toBeDefined();
    expect(screen.getByText("Are these the dates on your documents?")).toBeDefined();
    expect(document.body.textContent).not.toContain("some_new_fact");
    fireEvent.click(
      screen.getByRole("button", { name: "Yes, they are the dates on my documents" }),
    );
    expect(onAnswer).toHaveBeenCalledWith("opt.some_new_fact", true, {
      "opt.ead_end": "2026-08-01",
    });
  });

  it("shows a line in the verdict for an unknown conflict", () => {
    showVerdict({
      ...output,
      verdict: { state: "cannot_tell", reasons: ["conflict:opt.some_new_fact"] },
    });
    expect(screen.getByText("Some facts entered do not fit together.")).toBeDefined();
  });

  it("shows a line in the verdict for an unknown judgement item", () => {
    showVerdict({ ...output, verdict: { state: "talk_to_dso", reasons: ["some_new_judgement"] } });
    expect(screen.getByText("Something in what you entered needs an answer.")).toBeDefined();
    expect(document.body.textContent).not.toContain("some_new_judgement");
  });

  it("shows a line for an unknown question, with no answers to click", () => {
    showQuestions({
      ...output,
      verdict: { state: "cannot_tell", reasons: ["unconfirmed:some_new_question"] },
      questions: [{ id: "some_new_question", because: ["opt"] }],
    });
    expect(
      screen.getByText("Duly has a question that this screen does not have the words for yet."),
    ).toBeDefined();
    expect(screen.queryAllByRole("button")).toEqual([]);
  });

  it("shows an answer it has no words for, and lets the person remove it", () => {
    const onWithdraw = vi.fn();
    render(
      <Questions
        output={{ ...output, questions: [] }}
        sent={{ some_new_question: { answer: true, on: "2026-09-29", about: {} } }}
        busy={false}
        onAnswer={vi.fn()}
        onWithdraw={onWithdraw}
      />,
    );
    expect(screen.getByText(/does not have the words for its question yet/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Remove the answer" }));
    expect(onWithdraw).toHaveBeenCalledWith("some_new_question");
  });
});
