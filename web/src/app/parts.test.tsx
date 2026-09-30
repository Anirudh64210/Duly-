import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { engineOutputSchema, type ComputedItem, type ShownRule } from "../lib/compute";
import { OUTPUT } from "../lib/fixtures";
import { EXACT_BUTTON, READING_LABEL, READING_TAG, VERBATIM_LINE } from "../lib/labels";
import {
  CompletionMark,
  DateField,
  Disclose,
  DraftPill,
  DraftView,
  HeroMark,
  OptionCards,
  Row,
  RuleBlock,
  RuleBlocks,
  TextField,
  Working,
  splitDate,
} from "./parts";

// design-1 section 3.11: the parts the canvas did not draw, used as a student uses them.

const output = engineOutputSchema.parse(OUTPUT);

const RULE: ShownRule = {
  value: 90,
  unit: "days",
  status: "settled",
  citation: "8 CFR 214.2(f)(10)(ii)(E)",
  url: "https://www.ecfr.gov/current/title-8/section-214.2",
  checked_on: "2026-09-29",
  quote: "may not accrue an aggregate of more than 90 days of unemployment",
  derivation: "verbatim",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Row and Disclose", () => {
  it("opens and closes a row on its own, with only the header toggling", () => {
    render(
      <Row id="r" title="A row" meta="Its meta">
        <p>Inside</p>
      </Row>,
    );
    const head = screen.getByRole("button", { name: /A row/ });
    expect(screen.getByText("Its meta")).toBeInTheDocument();
    expect(screen.queryByText("Inside")).toBeNull();
    fireEvent.click(head);
    expect(head).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByText("Inside"));
    expect(head).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(head);
    expect(screen.queryByText("Inside")).toBeNull();
  });

  it("opens a disclosure in place and closes it again", () => {
    render(
      <Disclose label="More" className="box">
        <p>Hidden words</p>
      </Disclose>,
    );
    const button = screen.getByRole("button", { name: "More" });
    fireEvent.click(button);
    expect(screen.getByText("Hidden words")).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(button);
    expect(screen.queryByText("Hidden words")).toBeNull();
  });
});

describe("RuleBlock (D56)", () => {
  it("shows the quote, the verbatim line, the source and the check day with no plain words", () => {
    render(<RuleBlock rule={RULE} />);
    expect(screen.getByText(RULE.quote as string)).toBeInTheDocument();
    expect(screen.getByText(VERBATIM_LINE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: RULE.citation })).toHaveAttribute("href", RULE.url);
    expect(screen.getByText("Checked Sep 29, 2026.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: EXACT_BUTTON })).toBeNull();
  });

  it("puts plain words first and the exact words one tap away, with a reading's note", () => {
    const reading: ShownRule = {
      ...RULE,
      value: true,
      unit: "flag",
      derivation: "reading",
      note: "The words say is, not must.",
      plain: "You may be unemployed for up to 90 days.",
    };
    render(<RuleBlock rule={reading} />);
    expect(screen.getByText(reading.plain as string)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(READING_TAG))).toBeInTheDocument();
    expect(screen.queryByText(READING_LABEL)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: EXACT_BUTTON }));
    expect(screen.getByText(READING_LABEL)).toBeInTheDocument();
    expect(screen.getByText("The words say is, not must.")).toBeInTheDocument();
    expect(screen.queryByText(VERBATIM_LINE)).toBeNull();
  });

  it("shows a reading with no note and no quote", () => {
    const bare: ShownRule = { ...RULE, derivation: "reading" };
    delete bare.quote;
    render(<RuleBlock rule={bare} />);
    expect(screen.getByText(READING_LABEL)).toBeInTheDocument();
    expect(document.querySelector("blockquote")).toBeNull();
    expect(document.querySelector(".note")).toBeNull();
  });

  it("shows each rule once and skips an id the output does not hold", () => {
    const [id] = Object.keys(output.rules) as [string];
    render(<RuleBlocks ids={[id, id, "not.a.rule"]} output={output} />);
    expect(document.querySelectorAll(".rule-block")).toHaveLength(1);
  });
});

describe("Working (design-1 section 3.11)", () => {
  it("names every input the item read, in plain values", () => {
    const [first] = output.computed as [ComputedItem];
    const item: ComputedItem = {
      ...first,
      inputs: {
        program_end_date: "2026-05-15",
        time_zone: "America/Los_Angeles",
        cpt_full_time_days: 12,
        employer_reported: true,
        opt: null,
        stem: undefined,
        employment: [],
      },
    };
    render(<Working item={item} output={output} />);
    expect(screen.getByText("Inputs used")).toBeInTheDocument();
    const values = [...document.querySelectorAll(".inputs dd")].map((dd) => dd.textContent);
    expect(values).toEqual([
      "May 15, 2026",
      "America/Los_Angeles",
      "12",
      "true",
      "Not entered",
      "Not entered",
      "Entered",
    ]);
    expect(screen.getByText("Rules used")).toBeInTheDocument();
  });

  it("leaves out the inputs heading when the item read none", () => {
    const [first] = output.computed as [ComputedItem];
    render(<Working item={{ ...first, inputs: {} }} output={output} />);
    expect(screen.queryByText("Inputs used")).toBeNull();
  });
});

describe("the DSO draft (D57)", () => {
  it("opens under its pill, takes edits and copies what was typed", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<DraftPill text="Dear DSO," />);
    const pill = screen.getByRole("button", { name: "Draft the question for your DSO" });
    fireEvent.click(pill);
    expect(pill).toHaveAttribute("aria-expanded", "true");
    const box = screen.getByRole("textbox", { name: "An email you can send to your DSO" });
    fireEvent.change(box, { target: { value: "Dear DSO, a question." } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy the email" }));
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith("Dear DSO, a question.");
    expect(screen.getByRole("status")).toHaveTextContent("Copied.");
    fireEvent.change(box, { target: { value: "Dear DSO" } });
    expect(screen.getByRole("status")).toHaveTextContent("");
    fireEvent.click(pill);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("says what to do when the browser refuses the copy", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: () => Promise.reject(new Error("denied")) },
    });
    render(<DraftView text="Dear DSO," />);
    fireEvent.click(screen.getByRole("button", { name: "Copy the email" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "The browser did not allow the copy. Select the words above.",
      ),
    );
  });
});

function Cards() {
  const [value, setValue] = useState<"a" | "b" | "c" | "">("");
  return (
    <OptionCards
      label="Pick one"
      options={[
        { value: "a", title: "First", line: "The first line" },
        { value: "b", title: "Second" },
        { value: "c", title: "Third" },
      ]}
      value={value}
      onChange={setValue}
    />
  );
}

describe("OptionCards (design-1 section 3.10)", () => {
  it("makes the first card the tab stop until one is chosen", () => {
    render(<Cards />);
    const [first, second] = screen.getAllByRole("radio") as [HTMLElement, HTMLElement];
    expect(first).toHaveAttribute("tabindex", "0");
    expect(second).toHaveAttribute("tabindex", "-1");
    expect(screen.getByText("The first line")).toBeInTheDocument();
  });

  it("moves with the arrow keys, wrapping at both ends, and ignores other keys", () => {
    render(<Cards />);
    const radios = () => screen.getAllByRole("radio");
    const checked = () => radios().findIndex((r) => r.getAttribute("aria-checked") === "true");
    fireEvent.click(radios()[0] as HTMLElement);
    fireEvent.keyDown(radios()[0] as HTMLElement, { key: "ArrowDown" });
    expect(checked()).toBe(1);
    expect(document.activeElement).toBe(radios()[1]);
    fireEvent.keyDown(radios()[1] as HTMLElement, { key: "ArrowRight" });
    expect(checked()).toBe(2);
    fireEvent.keyDown(radios()[2] as HTMLElement, { key: "ArrowDown" });
    expect(checked()).toBe(0);
    fireEvent.keyDown(radios()[0] as HTMLElement, { key: "ArrowUp" });
    expect(checked()).toBe(2);
    fireEvent.keyDown(radios()[2] as HTMLElement, { key: "ArrowLeft" });
    expect(checked()).toBe(1);
    fireEvent.keyDown(radios()[1] as HTMLElement, { key: "Enter" });
    expect(checked()).toBe(1);
    expect(radios()[1]).toHaveAttribute("tabindex", "0");
    expect(radios()[0]).toHaveAttribute("tabindex", "-1");
  });
});

function Dated() {
  const [value, setValue] = useState("2026-05-15");
  return (
    <>
      <DateField id="d" label="A day" value={value} problem="Enter a day." onChange={setValue} />
      <p data-testid="held">{value}</p>
    </>
  );
}

describe("DateField and TextField", () => {
  it("splits an ISO day into its parts and composes them back", () => {
    render(<Dated />);
    const month = document.getElementById("d") as HTMLInputElement;
    expect(month.value).toBe("5");
    expect((document.getElementById("d-day") as HTMLInputElement).value).toBe("15");
    expect((document.getElementById("d-year") as HTMLInputElement).value).toBe("2026");
    expect(month).toHaveAttribute("aria-describedby", "d-problem");
    expect(screen.getByText("Enter a day.")).toBeInTheDocument();
    fireEvent.change(month, { target: { value: "1a" } });
    expect(screen.getByTestId("held")).toHaveTextContent("1a/15/2026");
    expect(month.value).toBe("1a");
    fireEvent.change(month, { target: { value: "6" } });
    expect(screen.getByTestId("held")).toHaveTextContent("2026-06-15");
  });

  it("splits text that is not yet a day, and nothing at all", () => {
    expect(splitDate("4//")).toEqual(["4", "", ""]);
    expect(splitDate("")).toEqual(["", "", ""]);
    expect(splitDate("2026-01-09")).toEqual(["1", "9", "2026"]);
  });

  it("links a text field to its problem, and to nothing without one", () => {
    const onChange = vi.fn();
    render(
      <TextField
        id="t"
        label="Hours a week"
        value=""
        inputMode="decimal"
        maxLength={5}
        narrow
        problem="Enter the hours."
        onChange={onChange}
      />,
    );
    const box = screen.getByLabelText("Hours a week");
    expect(box).toHaveAttribute("aria-describedby", "t-problem");
    expect(box).toHaveAttribute("maxlength", "5");
    expect(box).toHaveClass("narrow");
    fireEvent.change(box, { target: { value: "40" } });
    expect(onChange).toHaveBeenCalledWith("40");
    cleanup();
    render(<TextField id="u" label="Name" value="" onChange={onChange} />);
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-describedby");
  });
});

describe("the marks (design-1 sections 3.6 and 3.10)", () => {
  it("names each hero mark by its headline and draws its own shape", () => {
    const shapes: Record<string, string> = {
      needs_you: "circle.mark-fill",
      talk_to_dso: "text.mark-text",
      cannot_tell: "path.mark-bar",
      no_open_items: "circle.mark-ring",
    };
    for (const [state, shape] of Object.entries(shapes)) {
      render(<HeroMark state={state} name={`Mark ${state}`} />);
      const mark = screen.getByRole("img", { name: `Mark ${state}` });
      expect(mark.querySelector(shape)).not.toBeNull();
      cleanup();
    }
    render(<HeroMark state="no_open_items" name="Quiet" />);
    expect(screen.getByRole("img", { name: "Quiet" }).querySelectorAll("*")).toHaveLength(1);
  });

  it("draws the completion check as an SVG hidden from readers", () => {
    render(<CompletionMark />);
    const mark = document.querySelector("svg.completion");
    expect(mark).toHaveAttribute("aria-hidden", "true");
    expect(mark?.querySelector("path.completion-check")).not.toBeNull();
  });
});
