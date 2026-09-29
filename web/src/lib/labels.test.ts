import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { engineOutputSchema } from "./compute";
import { CPT_OVER, OUTPUT } from "./fixtures";
import {
  FACT_NOT_NAMED,
  JUDGEMENT_NOT_NAMED,
  answerLine,
  becauseLine,
  computedName,
  givenLine,
  periodDay,
  periodSpan,
  conflictLine,
  conflictQuestionCopy,
  factRule,
  formatDate,
  formatValue,
  groupOf,
  inputName,
  itemName,
  changeButton,
  changeLine,
  factLine,
  legalStatusWords,
  needsAnswer,
  listName,
  questionCopy,
  reasonItem,
  reasonText,
  scopeLine,
  settingName,
  sourceLink,
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
    // SPEC-resolutions point 31 names this item by the rule's own subject, a student,
    // never the person: the modal test of BOUNDARY.md is about the user as the subject.
    for (const id of SPEC_ITEMS.filter((item) => item !== "opt.latest_start")) {
      expect(itemName(id)).not.toMatch(SIDE_B);
    }
    expect(itemName("opt.latest_start")).not.toMatch(/\b(you|your)\b/i);
  });

  it("names the latest start by the date a student may request (SPEC-resolutions point 31)", () => {
    expect(itemName("opt.latest_start")).toBe("Latest start date a student may request");
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

describe("status words (plain-1 section 3)", () => {
  it("tags each of the five statuses in the words of the SPEC", () => {
    expect(statusTag("settled")).toBe("Regulation");
    expect(statusTag("guidance")).toBe("Government guidance");
    expect(statusTag("school")).toBe("School policy");
    expect(statusTag("litigated")).toBe("A court paused a change");
    expect(statusTag("proposed")).toBe("Proposed, not in force");
  });

  it("never shows a status code it does not know", () => {
    expect(statusTag("under_review")).toBe("Source type not named");
    expect(statusTag("constructor")).toBe("Source type not named");
    expect(statusTag("")).toBe("Source type not named");
  });

  it("puts a legal status in plain words and never shows the code", () => {
    expect(legalStatusWords("effective")).toBe("in effect");
    expect(legalStatusWords("enjoined")).toBe("paused by a court");
    expect(legalStatusWords("vacated")).toBe("set aside by a court");
    expect(legalStatusWords("proposed")).toBe("proposed, not in force");
    expect(legalStatusWords("stayed_in_part")).toBe("not named on this screen");
  });

  it("links a court's order for a court's status, and the source otherwise", () => {
    expect(sourceLink("enjoined")).toBe("Read the court's order");
    expect(sourceLink("vacated")).toBe("Read the court's order");
    expect(sourceLink("proposed")).toBe("Read the source");
  });

  it("puts what the paused rule would change behind one named tap", () => {
    expect(changeButton("enjoined")).toBe("What the paused rule would change");
    expect(changeButton("proposed")).toBe("What the proposed rule would change");
    expect(changeButton("final")).toBe("What the other rule would change");
    expect(changeLine("final")).toBe(
      "A rule change is final, not applied. The value shown is the one that applies today.",
    );
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
    expect(reasonText("rule_in_litigation")).toBe(
      "A court paused a change to a rule that applies here, and the two rules give different dates.",
    );
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
      "An employment period, or its end, is not marked as reported to your DSO. The day to report it by is SEVP guidance, not the words of the regulation.",
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
  "opt.i765_filed_date.before_recommendation",
  "stem.i765_filed_date.before_recommendation",
  "opt.i765_filed_date.after_file_by",
  "stem.i765_filed_date.after_file_by",
  "stem.i765_filed_date.before_window_opens",
  "opt.i765_filed_date.after_window_closes",
  "opt.ead_end.after_complete_by",
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
  });

  it("has no name of its own for next.grace.ends, which the engine no longer gives", () => {
    // SPEC-resolutions point 12: upcoming holds grace.ends once.
    expect(itemName("next.grace.ends")).toBe("Next grace ends");
    expect(itemName("grace.ends")).toBe("Grace period ends");
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

describe("SPEC section 6: the list", () => {
  it("names the list in words", () => {
    expect(listName("stem.extension.what_the_regulation_lists")).toBe(
      "What the regulation lists for the 24-month STEM OPT extension",
    );
    expect(listName("h1b.something")).toBe("H1b something");
  });
});

describe("SPEC-resolutions points 11 to 24", () => {
  const NEW_FACTS = FACT_IDS.slice(-7);

  it("has a line for each new conflict that never says a filing was late or missed", () => {
    for (const id of NEW_FACTS) {
      const line = factLine(id) ?? "";
      expect(line, id).not.toMatch(/\blate\b|\bmiss|wrong|should|must|\b\d+ days?\b/i);
      expect(factRule(id), id).not.toBeNull();
    }
  });

  it("says the complete-by date is Duly's count from the rule (point 16)", () => {
    expect(factLine("opt.ead_end.after_complete_by")).toContain(
      "That date is Duly's count from the months in the rule",
    );
    expect(factRule("opt.ead_end.after_complete_by")).toBe("opt.complete_within_months");
  });

  it("reads a confirmed new conflict as a question for the DSO", () => {
    expect(reasonText("stem.i765_filed_date.before_window_opens")).toContain(
      "What they mean is a question for your DSO.",
    );
  });

  it("names the numbered items of points 20 and 22, and the OPT card count of point 19", () => {
    expect(itemName("stem.new_plan_due.3")).toBe(
      "New training plan (Form I-983) due for employment period 3",
    );
    expect(itemName("stem.concluding_evaluation_due.2")).toBe(
      "Final evaluation due for employment period 2",
    );
    expect(itemName("employment.4.end_report_by")).toBe(
      "Day to report the end of employment period 4, from SEVP guidance",
    );
    expect(itemName("unemployment.opt_card_days_used")).toBe(
      "Unemployment days used inside the OPT EAD dates",
    );
    expect(groupOf("stem.new_plan_due.3")).toBe("STEM OPT");
  });

  it("names the values a new question holds", () => {
    expect(inputName("employment.2.start")).toBe("Employment period 2 start date");
    expect(inputName("employment.2.end")).toBe("Employment period 2 end date");
    expect(inputName("stem.validation_1_due")).toBe("Validation report 1 due");
    expect(inputName("stem.evaluation_12_month_due")).toBe("12-month evaluation due");
  });

  it("asks whether each report whose date has passed was submitted (point 21)", () => {
    for (const [id, report] of [
      ["stem.validation_2_due.made", "validation report 2"],
      ["stem.evaluation_12_month_due.made", "12-month evaluation"],
      ["stem.final_evaluation_due_from_ead_end.made", "final evaluation"],
      ["stem.concluding_evaluation_due.1.made", "final evaluation for employment period 1"],
      // Point 57: the new plan has a name too.
      ["stem.new_plan_due.2.made", "new Form I-983 for employment period 2"],
    ] as const) {
      expect(questionCopy(id)?.ask).toBe(
        `The date for the ${report} is before today. Did you submit this report?`,
      );
      expect(reasonText(id.replace(/made$/, "not_made"))).toBe(
        `You answered that you did not submit the ${report}. What that means is a question for your DSO.`,
      );
    }
    expect(questionCopy("opt.file_by.made")).toBeNull();
  });

  it("asks about a new employer and the end of a period (points 20 and 22)", () => {
    expect(questionCopy("employment.7.new_employer")?.ask).toContain(
      "Is this period with a new employer?",
    );
    expect(questionCopy("employment.7.end_reported")?.ask).toContain(
      "Has the end of this period been reported to your DSO?",
    );
    expect(questionCopy("employment.x.end_reported")).toBeNull();
  });

  it("shows report_employer as SEVP guidance, not the regulation's words (point 22)", () => {
    expect(reasonText("report_employer")).toContain(
      "is SEVP guidance, not the words of the regulation",
    );
  });

  it("states no grace date beside an active cap-gap (point 18)", () => {
    const line = reasonText("grace_with_cap_gap");
    expect(line).toContain("Duly shows no grace period end date");
    expect(line).toContain("a question for your DSO");
  });

  it("says the count and the rule for unemployment on the OPT card (point 19)", () => {
    expect(reasonText("unemployment_opt_card_at_or_over_limit")).toBe(
      "Unemployment days counted inside the OPT EAD dates. This is at or over the limit in the rule for the OPT period, shown below.",
    );
  });

  it("names a legal status from one fixed list (point 13)", () => {
    expect(legalStatusWords("enjoined")).toBe("paused by a court");
  });
});

describe("an id with no words is never shown as nothing", () => {
  it("reads an unknown conflict as facts that do not fit", () => {
    expect(reasonText("conflict:opt.some_new_fact")).toBe(FACT_NOT_NAMED);
    expect(conflictLine("opt.some_new_fact", ["conflict:opt.some_new_fact"])).toBe(FACT_NOT_NAMED);
    expect(conflictLine("opt.some_new_fact", [])).toBeNull();
    expect(conflictQuestionCopy("opt.some_new_fact", ["conflict:opt.some_new_fact"])?.ask).toBe(
      "Are these the dates on your documents?",
    );
    expect(conflictQuestionCopy("opt.some_new_fact", [])).toBeNull();
  });

  it("reads an unknown judgement item as something that needs an answer", () => {
    expect(reasonText("some_new_judgement")).toBe(JUDGEMENT_NOT_NAMED);
    expect(reasonText("rule_in_litigation")).toBe(
      "A court paused a change to a rule that applies here, and the two rules give different dates.",
    );
  });

  it("gives every conflict id, known or not, a line with no code in it", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (id) => {
        const line = reasonText(`conflict:${id}`);
        expect(line.length).toBeGreaterThan(0);
        expect(line).not.toContain("_");
      }),
    );
  });
});

describe("SPEC-resolutions point 27: an OPT card that ends on or before the program end", () => {
  const id = "opt.ead_end.not_after_program_end";

  it("says what does not fit, never which date is wrong, and asks the one conflict question", () => {
    const line = factLine(id) ?? "";
    expect(line).toMatch(/^The OPT EAD end date is on or before the program end date/);
    expect(line).toContain("Duly's reading");
    expect(line).not.toMatch(/wrong|mistake|late|error/i);
    expect(questionCopy(id)?.ask).toBe("Are these the dates on your documents?");
    expect(reasonText(`conflict:${id}`)).toBe(line);
  });

  it("shows the guidance it is checked against beside the question", () => {
    expect(factRule(id)).toBe("opt.post_completion_definition");
  });
});

describe("SPEC-resolutions point 29: an answer among an item's inputs", () => {
  it("is the person's answer and its day", () => {
    expect(givenLine(false, "2026-09-29")).toBe("You answered No on Sep 29, 2026");
    expect(givenLine(true, "2026-09-28")).toBe("You answered Yes on Sep 28, 2026");
  });

  it("names the CPT days from the answer as the person's answer", () => {
    const answered = {
      id: "cpt.full_time_days_used",
      inputs: { cpt_full_time_days: null, full_time_cpt_used: { answer: false, on: "2026-09-29" } },
    };
    expect(computedName(answered)).toBe("Full-time CPT days (your answer)");
    expect(computedName({ id: "cpt.full_time_days_used", inputs: { cpt_full_time_days: 3 } })).toBe(
      "Full-time CPT days entered",
    );
  });
});

describe("SPEC-resolutions point 34: an employment period as its start and end", () => {
  it("reads the number and the side of a period date", () => {
    expect(periodDay("employment.2.end")).toEqual({ period: 2, side: "end" });
    expect(periodDay("employment.10.start")).toEqual({ period: 10, side: "start" });
    expect(periodDay("stem.ead_start")).toBeNull();
  });

  it("shows the start and the end", () => {
    expect(periodSpan("2025-12-01", "2026-06-30")).toBe("Dec 1, 2025 to Jun 30, 2026");
    expect(periodSpan("2025-12-01", null)).toBe("Dec 1, 2025, no end date entered");
    expect(periodSpan("2025-12-01", undefined)).toBe("Starts Dec 1, 2025");
  });
});

describe("plain-1 section 5: known matters before what needs an answer", () => {
  it("names the reasons that wait on an answer, a fact or the rules", () => {
    expect(needsAnswer("unconfirmed:opt.earlier_at_this_level")).toBe(true);
    expect(needsAnswer("missing:opt")).toBe(true);
    expect(needsAnswer("conflict:opt_end")).toBe(true);
    expect(needsAnswer("rule_in_litigation")).toBe(true);
    expect(needsAnswer("rules_stale")).toBe(true);
    expect(needsAnswer("hours_under_threshold")).toBe(false);
    expect(needsAnswer("rule_not_in_force_on_event_day")).toBe(false);
    expect(needsAnswer("stem.validation_1_due.not_made")).toBe(false);
  });
});

describe("SPEC-resolutions points 39, 40, 43 and 44", () => {
  it("asks about earlier OPT at the same level and shows the values asked about (39)", () => {
    const copy = questionCopy("opt.earlier_at_this_level");
    expect(copy?.ask).toBe(
      "Did you use OPT before at this degree level, before your program ended or after another program at the same level?",
    );
    expect(copy?.yes).toBe("Yes, I used OPT before at this level");
    expect(copy?.no).toBe("No, this is my first OPT at this level");
    expect(inputName("degree_level")).toBe("Degree level");
  });

  it("says why Duly steps back for earlier OPT, and nothing of what it means (39)", () => {
    const line = reasonText("opt.months_at_this_level");
    expect(line).toContain("You answered that you used OPT before at this degree level.");
    expect(line).toContain("Duly does not count the months");
    expect(line).toContain("a question for your DSO");
    expect(line).not.toMatch(/\bover\b|\bmore than\b|\bused up\b/);
  });

  it("gives the rule not yet in force its own words (40, 44)", () => {
    const line = reasonText("rule_not_in_force_on_event_day");
    expect(line).toBe(
      "The rule Duly would use was not yet in force on the day this counts from, so Duly does not compute the date. This is a question for your DSO.",
    );
    expect(line).not.toBe(JUDGEMENT_NOT_NAMED);
    expect(line).not.toContain("needs an answer");
  });

  it("names the open period after the last card as facts that do not fit (43)", () => {
    const id = "employment.period_open_after_last_card";
    expect(factLine(id)).toBe(
      "An employment period has no end date, and today is after the last EAD end date entered, or after the cap-gap period when one is entered.",
    );
    expect(questionCopy(id)?.ask).toBe("Are these the dates on your documents?");
    expect(reasonText(`conflict:${id}`)).toBe(factLine(id));
    expect(reasonText(id)).toContain("What they mean is a question for your DSO.");
    expect(factRule(id)).toBeNull();
  });
});
