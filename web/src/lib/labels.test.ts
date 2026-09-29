import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { engineOutputSchema } from "./compute";
import { CASE, CPT_OVER, NEXT, OUTPUT } from "./fixtures";
import {
  answerLine,
  becauseLine,
  formatDate,
  formatValue,
  groupOf,
  inputName,
  itemName,
  dsoQuestion,
  factLine,
  legalStatusWords,
  listName,
  questionCopy,
  reasonItem,
  reasonText,
  regimeLine,
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

// specs/product-1/SPEC.md, section 1, the table of conflicts.
const FACT_IDS = [
  "opt.i765_filed_date.after_today",
  "stem.i765_filed_date.after_today",
  "opt.dso_recommendation_date.after_today",
  "stem.dso_recommendation_date.after_today",
  "cap_gap.petition_filed_on.after_today",
  "opt.i765_filed_date.after_card",
  "stem.i765_filed_date.after_card",
  "cap_gap.petition_filed_on.after_start",
  "cap_gap.requested_start.before_training",
  "opt.card_longer_than_rule",
  "stem.card_longer_than_rule",
  "stem.gap_after_opt",
  "employment.period_outside_cards",
];

describe("SPEC section 7: item names", () => {
  it("names the unemployment items as a person would", () => {
    expect(itemName("unemployment.days_remaining")).toBe("Unemployment days remaining");
    expect(itemName("unemployment.days_used")).toBe("Unemployment days used");
    expect(itemName("unemployment.limit")).toBe("Unemployment days allowed");
  });

  it("names every date of the next step", () => {
    expect(itemName("next.stem.apply_window_opens")).toBe("STEM OPT filing window opens");
    expect(itemName("next.stem.apply_window_closes")).toBe("STEM OPT filing window closes");
    expect(itemName("next.opt.card_ends")).toBe("OPT EAD card ends");
    expect(itemName("next.grace.ends")).toBe(
      "Grace period ends, counted from the OPT EAD end date",
    );
  });

  it("says a rule change is blocked by a court only for the status enjoined", () => {
    expect(regimeLine("enjoined")).toBe(
      "A rule change is blocked by a court. See what it would change.",
    );
    expect(regimeLine("proposed")).toBe("A rule change is proposed. See what it would change.");
  });
});

describe("SPEC section 1: facts that do not fit", () => {
  it("has a line for every conflict in the table, and none says which date is wrong", () => {
    for (const id of FACT_IDS) {
      const line = factLine(id);
      expect(line, id).not.toBeNull();
      expect(line).not.toMatch(/wrong|mistake|error|should|must/i);
    }
    expect(factLine("opt_end")).toBeNull();
  });

  it("asks one thing for every conflict", () => {
    for (const id of FACT_IDS) {
      expect(questionCopy(id)).toEqual({
        ask: "Are these the dates on your documents?",
        yes: "Yes, they are the dates on my documents",
        no: "No, I will correct them",
      });
    }
  });

  it("reads an open conflict as what does not fit", () => {
    expect(reasonText("conflict:opt.i765_filed_date.after_today")).toBe(
      "The OPT I-765 filed date is after today.",
    );
    expect(reasonText("conflict:stem.gap_after_opt")).toBe(
      "The STEM OPT EAD start date is more than one day after the OPT EAD end date.",
    );
  });

  it("reads a confirmed conflict as a question for the DSO, with no meaning of its own", () => {
    expect(reasonText("opt.i765_filed_date.after_card")).toBe(
      "The OPT I-765 filed date is after the OPT EAD start date. You answered that these are the dates on your documents. What they mean is a question for your DSO.",
    );
  });

  it("names the inputs a conflict holds", () => {
    expect(inputName("opt.i765_filed_date")).toBe("OPT I-765 filed date");
    expect(inputName("stem.i765_filed_date")).toBe("STEM OPT I-765 filed date");
    expect(inputName("cap_gap.petition_filed_on")).toBe("Petition filed date");
  });
});

describe("SPEC section 2: nothing entered is not nothing to record", () => {
  it("asks whether there is nothing more to record", () => {
    const copy = questionCopy("nothing_more_to_record");
    expect(copy?.yes).toBe("Yes, there is nothing more");
    expect(copy?.no).toBe("No, there is more to add");
  });

  it("asks whether full-time CPT was used", () => {
    const copy = questionCopy("full_time_cpt_used");
    expect(copy?.ask).toBe(
      "No number of full-time CPT days is entered. Did you use any full-time CPT?",
    );
    expect(copy?.no).toBe("No, I used none");
  });

  it("names what is missing after the answers", () => {
    expect(reasonText("missing:training")).toBe(
      "Duly needs the OPT, STEM OPT, or cap-gap dates that are not entered yet.",
    );
    expect(reasonText("missing:cpt_full_time_days")).toBe(
      "Duly needs the number of full-time CPT days.",
    );
    expect(inputName("full_time_cpt_used")).toBe("Your answer on full-time CPT");
  });
});

describe("SPEC section 5: Duly's count", () => {
  it("never calls Duly's count the number in the rule", () => {
    const line = reasonText("cpt_full_time_at_or_over_bar");
    expect(line).toContain("at or over Duly's count of one year in days");
    expect(line).not.toContain("number in the rule");
  });

  it("finds the item a reason rests on, so the line carries its reading mark", () => {
    const computed = engineOutputSchema.parse(CPT_OVER).computed;
    expect(reasonItem("cpt_full_time_at_or_over_bar", computed)?.id).toBe(
      "cpt.full_time_days_used",
    );
    const output = engineOutputSchema.parse(OUTPUT).computed;
    expect(reasonItem("opt.file_by", output)?.reading).toBe(false);
    expect(reasonItem("rules_stale", output)).toBeUndefined();
  });
});

describe("SPEC section 6: the question for the DSO", () => {
  const output = engineOutputSchema.parse(NEXT);
  const draft = dsoQuestion(CASE.opt, output.upcoming, "8 CFR 214.2(f)(10)(ii)(C)");

  it("is built from the person's own dates and the engine's dates", () => {
    expect(draft).toContain("My OPT EAD card runs from Jun 1, 2026 to May 31, 2027.");
    expect(draft).toContain("STEM OPT filing window opens: Mar 2, 2027");
    expect(draft).toContain(
      "STEM OPT filing window closes: May 31, 2027 (Duly's reading of the regulation)",
    );
    expect(draft).toContain("8 CFR 214.2(f)(10)(ii)(C)");
  });

  it("asks and states no conclusion", () => {
    expect(draft).toMatch(/Could you tell me whether/);
    expect(draft).not.toMatch(/\b(you (must|should|can|may)|I (can|may|must))\b/i);
    expect(draft).not.toContain("next.opt.card_ends");
  });

  it("says a date is not entered rather than guess it", () => {
    const bare = dsoQuestion(null, [], "the regulation");
    expect(bare).toContain("My OPT EAD card runs from not entered to not entered.");
    expect(bare).not.toContain("Duly, a record keeping tool, computed");
  });

  it("names the list in words", () => {
    expect(listName("stem.extension.what_the_regulation_lists")).toBe(
      "What the regulation lists for the 24-month STEM OPT extension",
    );
    expect(listName("h1b.something")).toBe("H1b something");
  });
});
