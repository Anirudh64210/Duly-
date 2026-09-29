import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { engineOutputSchema } from "./compute";
import { OUTPUT } from "./fixtures";
import {
  answerLine,
  becauseLine,
  formatDate,
  formatValue,
  groupOf,
  inputName,
  itemName,
  legalStatusWords,
  questionCopy,
  reasonText,
  scopeLine,
  settingName,
  statusTag,
  todayLine,
  zoneName,
} from "./labels";

const SPEC_ITEMS = [
  "opt.apply_window_opens",
  "opt.apply_window_closes",
  "opt.file_by",
  "opt.latest_start",
  "opt.complete_by",
  "unemployment.limit",
  "unemployment.days_used",
  "unemployment.days_remaining",
  "employment.days_under_hours",
  "employment.periods_not_reported",
  "grace.ends",
  "stem.apply_window_opens",
  "stem.apply_window_closes",
  "stem.file_by",
  "stem.validation_1_due",
  "stem.validation_2_due",
  "stem.validation_3_due",
  "stem.validation_4_due",
  "stem.evaluation_12_month_due",
  "stem.final_evaluation_due_from_ead_end",
  "cpt.full_time_days_used",
  "capgap.ends",
];

// BOUNDARY.md, the modal test, plus words that say what a number means.
const SIDE_B = /\b(should|can|may|must|will|safe|fine|you|your|late|overdue|deadline|expired)\b/i;

describe("item names", () => {
  it("names every item in the SPEC, each differently, in a named group", () => {
    const names = SPEC_ITEMS.map(itemName);
    expect(new Set(names).size).toBe(SPEC_ITEMS.length);
    for (const id of SPEC_ITEMS) {
      expect(itemName(id)).not.toMatch(/[_.]/);
      expect(groupOf(id)).not.toBe("Other");
    }
  });

  it("states what the item is, never what it means", () => {
    for (const id of SPEC_ITEMS) expect(itemName(id)).not.toMatch(SIDE_B);
  });

  it("groups the items the way the SPEC lists them", () => {
    expect(groupOf("opt.file_by")).toBe("OPT");
    expect(groupOf("unemployment.limit")).toBe("Unemployment");
    expect(groupOf("employment.days_under_hours")).toBe("Unemployment");
    expect(groupOf("stem.file_by")).toBe("STEM OPT");
    expect(groupOf("grace.ends")).toBe("Grace period");
    expect(groupOf("capgap.ends")).toBe("Cap-gap");
    expect(groupOf("cpt.full_time_days_used")).toBe("CPT");
    expect(groupOf("h1b.something")).toBe("Other");
    expect(groupOf("constructor")).toBe("Other");
  });

  it("never shows a raw code or an empty name, whatever the id", () => {
    fc.assert(
      fc.property(fc.string(), (id) => {
        for (const name of [itemName(id), inputName(id)]) {
          expect(name.length).toBeGreaterThan(0);
          expect(name).not.toContain("_");
        }
      }),
    );
  });
});

describe("status words", () => {
  it("gives settled no tag and every other status a plain one", () => {
    expect(statusTag("settled")).toBeNull();
    expect(statusTag("guidance")).toBe("Guidance");
    expect(statusTag("litigated")).toBe("Before a court");
    expect(statusTag("proposed")).toBe("Proposed");
    expect(statusTag("school")).toBe("School policy");
  });

  it("never hides a status it does not know", () => {
    expect(statusTag("under_review")).toBe("Under review");
    expect(statusTag("constructor")).toBe("Constructor");
    expect(statusTag("")).toBe("Status not given");
  });

  it("puts a regime's legal status in plain words", () => {
    expect(legalStatusWords("effective")).toBe("in effect");
    expect(legalStatusWords("enjoined")).toBe("blocked by a court");
    expect(legalStatusWords("vacated")).toBe("set aside by a court");
    expect(legalStatusWords("stayed_in_part")).toBe("stayed in part");
    expect(legalStatusWords("")).toBe("status not given");
  });
});

describe("values", () => {
  it("shows a date in words, without moving it across a time zone", () => {
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatDate("2026-12-31")).toBe("Dec 31, 2026");
    expect(formatDate("2028-02-29")).toBe("Feb 29, 2028");
    expect(formatDate("pending")).toBe("pending");
  });

  it("keeps the day the engine gave, for every date", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1990, max: 2100 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        (year, month, day) => {
          const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const shown = formatDate(iso);
          expect(shown).toContain(` ${day}, ${year}`);
        },
      ),
    );
  });

  it("shows a value with its unit", () => {
    expect(formatValue("2026-05-01", "date")).toBe("May 1, 2026");
    expect(formatValue("04-01", "date")).toBe("April 1");
    expect(formatValue(41, "days")).toBe("41 days");
    expect(formatValue(1, "days")).toBe("1 day");
    expect(formatValue(-3, "days")).toBe("-3 days");
    expect(formatValue(0, "days")).toBe("0 days");
    expect(formatValue(2, "count")).toBe("2");
    expect(formatValue(20, "hours_per_week")).toBe("20 hours a week");
    expect(formatValue(10, "business_days")).toBe("10 business days");
    expect(formatValue(14, "months")).toBe("14 months");
    expect(formatValue(true, "flag")).toBe("Yes");
    expect(formatValue("text", "words")).toBe("text");
  });

  it("never shows a missing value as a number or a date", () => {
    expect(formatValue(null, "date")).toBe("Not computed");
    expect(formatValue(null, "days")).toBe("Not computed");
  });
});

describe("reasons", () => {
  const { computed } = engineOutputSchema.parse(OUTPUT);

  it("keeps the lines the verdict already had", () => {
    expect(reasonText("no_documents")).toBe("Nothing has been added yet.");
    expect(reasonText("rule_in_litigation")).toBe("A rule that applies here is before a court.");
  });

  it("names a missing part of the case", () => {
    expect(reasonText("missing:opt")).toBe("Duly needs the OPT dates.");
    expect(reasonText("missing:stem")).toBe("Duly needs the STEM OPT dates.");
  });

  it("names a setting in plain words, and never as law", () => {
    expect(settingName("product.open_item_lookahead_days")).toBe(
      "How far ahead a dated item is listed as an open item",
    );
    expect(settingName("product.some_new_setting")).toBe("Product some new setting");
    expect(settingName("")).toBe("Setting");
    expect(inputName("duly_settings")).toBe("Duly settings used, which are not law");
  });

  it("names a missing input", () => {
    expect(reasonText("missing:opt.ead_start")).toBe("Duly needs the OPT EAD start date.");
    expect(reasonText("missing:stem.dso_recommendation_date")).toBe(
      "Duly needs the STEM OPT DSO recommendation date.",
    );
  });

  it("names a conflict", () => {
    expect(reasonText("conflict:opt_end")).toBe("The OPT EAD end date is before its start date.");
    expect(reasonText("conflict:employment_2_end")).toBe(
      "Employment period 2 ends before it starts.",
    );
    expect(reasonText("conflict:stem_start")).toBe(
      "The STEM OPT EAD start date is on or before the OPT EAD end date.",
    );
  });

  it("names an open item by its name and its value", () => {
    expect(reasonText("opt.file_by", computed)).toBe(
      "Last OPT filing day after the DSO recommendation: May 1, 2026.",
    );
    expect(reasonText("report_employer", computed)).toBe(
      "An employment period is not marked as reported.",
    );
  });

  it("hands the question of hours to the DSO", () => {
    expect(reasonText("hours_under_threshold")).toContain("a question for your DSO");
  });

  it("never shows a raw code or an empty line, whatever the reason", () => {
    fc.assert(
      fc.property(fc.string(), (reason) => {
        const line = reasonText(reason, computed);
        expect(line.length).toBeGreaterThan(0);
        expect(line.endsWith(".")).toBe(true);
        expect(line).not.toContain("_");
      }),
    );
  });
});

describe("scope line", () => {
  it("says what the verdict rests on", () => {
    expect(scopeLine(3, "2026-09-28")).toBe(
      "Based on 3 documents you added. Rules checked Sep 28, 2026.",
    );
    expect(scopeLine(1, "2026-09-28")).toBe(
      "Based on 1 document you added. Rules checked Sep 28, 2026.",
    );
    expect(scopeLine(0, null)).toBe(
      "Based on 0 documents you added. The rules have not been checked yet.",
    );
  });
});

// SPEC-context, section 4.
const QUESTION_IDS = [
  "held_post_completion_opt",
  "no_employment_to_record",
  "cap_gap_without_training",
];

// BOUNDARY.md, the modal test. A question asks what happened, never what to do.
const MODAL = /\b(should|can|may|must|will|safe|fine|need|needs|allowed|permitted)\b/i;

describe("questions", () => {
  const copies = QUESTION_IDS.map((id) => {
    const copy = questionCopy(id);
    if (!copy) throw new Error(`no words for ${id}`);
    return copy;
  });

  it("has words for every question in the SPEC, each different", () => {
    expect(new Set(copies.map((copy) => copy.ask)).size).toBe(QUESTION_IDS.length);
  });

  it("asks a question, with two answers that differ", () => {
    for (const copy of copies) {
      expect(copy.ask.endsWith("?")).toBe(true);
      expect(copy.yes).toMatch(/^Yes, /);
      expect(copy.no).toMatch(/^No, /);
    }
  });

  it("asks what happened, never what to do", () => {
    for (const copy of copies) {
      for (const text of [copy.ask, copy.yes, copy.no]) expect(text).not.toMatch(MODAL);
    }
  });

  it("has no words for a question it does not know, or for a built-in object name", () => {
    expect(questionCopy("some_new_question")).toBeNull();
    expect(questionCopy("constructor")).toBeNull();
  });

  it("names what raised a question", () => {
    expect(becauseLine(["stem", "opt"])).toBe("Asked because of: STEM OPT dates, OPT dates.");
    expect(becauseLine(["employment", "opt.ead_start"])).toBe(
      "Asked because of: Employment periods, OPT EAD start date.",
    );
    expect(becauseLine(["cap_gap", "opt", "stem"])).toBe(
      "Asked because of: Cap-gap petition, OPT dates, STEM OPT dates.",
    );
  });

  it("shows an answer as the person's own statement, with its day", () => {
    const [held] = copies;
    if (!held) throw new Error("no words");
    expect(answerLine(held, { answer: true, on: "2026-09-28" })).toBe(
      'You answered "Yes, I had one" on Sep 28, 2026.',
    );
    expect(answerLine(held, { answer: false, on: "2026-09-29" })).toBe(
      'You answered "No, I did not" on Sep 29, 2026.',
    );
  });

  it("says it is waiting while a question is open, and never shows the id", () => {
    for (const id of [...QUESTION_IDS, "some_new_question"]) {
      expect(reasonText(`unconfirmed:${id}`)).toBe(
        "Duly is waiting for your answer to a question below.",
      );
    }
  });

  it("hands the two judgements to the DSO and states no conclusion", () => {
    for (const reason of ["stem_without_post_completion_opt", "cap_gap_without_training"]) {
      const line = reasonText(reason);
      expect(line).toMatch(/^You answered that /);
      expect(line).toMatch(/so it is a question for your DSO\.$/);
      expect(line).not.toMatch(MODAL);
    }
  });

  it("names the employment that is still to be entered", () => {
    expect(reasonText("missing:employment")).toBe(
      "Duly needs the employment periods that are not entered yet.",
    );
  });
});

describe("the day", () => {
  it("shows the day and the zone the engine used", () => {
    expect(todayLine("2026-09-28", "America/Los_Angeles")).toBe(
      "Today is Sep 28, 2026 in America/Los Angeles.",
    );
    expect(todayLine("2026-09-29", "Asia/Kolkata")).toBe("Today is Sep 29, 2026 in Asia/Kolkata.");
  });

  it("keeps the day the engine gave, in every zone", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 28 }),
        fc.constantFrom("Pacific/Kiritimati", "Pacific/Pago_Pago", "UTC"),
        (day, zone) => {
          const iso = `2026-09-${String(day).padStart(2, "0")}`;
          expect(todayLine(iso, zone)).toContain(`Sep ${day}, 2026`);
        },
      ),
    );
  });

  it("shows a zone name with spaces", () => {
    expect(zoneName("America/Argentina/Buenos_Aires")).toBe("America/Argentina/Buenos Aires");
  });
});
