# Product round 1: never the quiet verdict on a record that does not fit, and what comes next

Read PRINCIPLES.md and BOUNDARY.md first. Sources for this work: reviews/phase-2-second.md (findings 1 to 6), specs/product/BACKLOG.md (the founder's notes B1 to B4), DECISIONS.md D41.

The contracts are already changed on this branch. Lanes may not change them. Every value in this SPEC is a claim to check against the saved source, never a fact to copy.

## 1. Facts that do not fit

Duly cannot know which of two dates is wrong, and may not say what an unusual date means. It can say that two facts entered do not fit, and ask.

Each row below is a conflict. A conflict makes the verdict `cannot_tell` with the reason `conflict:<id>`, and raises a question with the same id, whose `about` holds the values that do not fit.

| id | The facts do not fit when |
|---|---|
| opt.i765_filed_date.after_today | The OPT filing is dated after today |
| stem.i765_filed_date.after_today | The STEM filing is dated after today |
| opt.dso_recommendation_date.after_today | The OPT recommendation is dated after today |
| stem.dso_recommendation_date.after_today | The STEM recommendation is dated after today |
| cap_gap.petition_filed_on.after_today | The petition is dated after today |
| opt.i765_filed_date.after_card | The OPT filing is dated after the OPT card begins |
| stem.i765_filed_date.after_card | The STEM filing is dated after the STEM card begins |
| cap_gap.petition_filed_on.after_start | The petition is dated after the start it asks for |
| cap_gap.requested_start.before_training | The start the petition asks for is before the first card begins |
| opt.card_longer_than_rule | The OPT card runs longer than `opt.max_months` from its start |
| stem.card_longer_than_rule | The STEM card runs longer than `stem.extension_months` from its start |
| stem.gap_after_opt | The STEM card begins more than one day after the OPT card ends |
| employment.period_outside_cards | An employment period has days outside every card, other than days after the last card ends while the period is open |

The question asks one thing: "Are these the dates on your documents?" The answers:

- No, or no answer yet: the verdict stays `cannot_tell`. The person corrects what they typed.
- Yes: the verdict is `talk_to_dso` with the judgement item `<id>`. Duly computes what it can and says nothing about what the dates mean.

While a conflict is open, the items that use the dates in it are returned with value null. Days between two cards are never counted as employed and never as unemployed: they are outside the counting window.

## 2. Nothing entered is not nothing to record (D41)

When `opt`, `stem` and `cap_gap` are all absent, the engine raises `nothing_more_to_record`. Until the person answers, the verdict is `cannot_tell`.

- Yes (there is nothing more to record): the verdict is decided on what was entered.
- No: `missing:training` and the verdict stays `cannot_tell`.

When `cpt_full_time_days` is absent or null, the engine raises `full_time_cpt_used`.

- No (none was used): the item `cpt.full_time_days_used` is 0 and its inputs show that this is the person's own statement and the day it was given.
- Yes: `missing:cpt_full_time_days`.

## 3. An answer holds for what it was given for, on the day it was given

- An answer dated after today is refused: ValueError in `parse_case`, 422 in plain words from the api.
- Each question carries `about`: the input values that raised it. An answer whose `about` differs from the question's is not an answer to this question, and the question is open again.
- `no_employment_to_record` covers the days through the day it was given. When today is later, the question is open again for the days since.

## 4. A date matters only while it can still matter

An item whose step is recorded as done is not an open item and is not in `upcoming`.

| Items | Done when |
|---|---|
| opt.apply_window_opens, opt.apply_window_closes, opt.file_by, opt.latest_start | `opt.i765_filed_date` or `opt.ead_start` is recorded |
| stem.apply_window_opens, stem.apply_window_closes, stem.file_by | `stem.i765_filed_date` or `stem.ead_start` is recorded |

## 5. A reading is marked wherever it is shown

Each computed item and each entry in `upcoming` carries `reading`: true when any rule it used has `derivation: reading`. The screen marks such an item on its row, in the verdict line, and in the list of what comes next, with the words "Duly's reading". Opening the row shows the quoted words and the note.

L-content: `cpt.full_time_bar_days` cites the regulation and no school's page, so it is not school policy. Tag it as what it is: a reading of the regulation. If the five status tags cannot say this honestly, keep the status the source supports and let `derivation: reading` carry the rest, and say what you chose in your progress log.

The screen never calls Duly's count "the number in the rule". Where the verdict turns on `cpt.full_time_bar_days`, the words say that the days entered are at or over Duly's count of one year in days, and show the regulation's own words beside it.

## 6. What comes next

The engine returns `upcoming`: every dated item that lies after today and is not done (section 4), soonest first.

With OPT entered and no STEM entered, `upcoming` also holds the dates of the step that the rules place next, computed from the OPT card:

| id | Formula | Rules |
|---|---|---|
| next.stem.apply_window_opens | `opt.ead_end` minus `stem.apply_before_expiry_days` | stem.apply_before_expiry_days |
| next.stem.apply_window_closes | `opt.ead_end` | stem.apply_window_closes_rule |
| next.opt.card_ends | `opt.ead_end` | none needed beyond the input; cite `opt.max_months` |
| next.grace.ends | as `grace.ends` | grace.after_completion_days |

These are dates and nothing more. The engine does not say whether the person may apply. The first of them sits beside the list below.

The engine returns `lists`, with one entry when OPT is entered and STEM is not:

- `stem.extension.what_the_regulation_lists`: the rules that state what the regulation requires for the 24-month extension.

L-content: find and source those rules in 8 CFR 214.2(f)(10)(ii)(C), one rule for each requirement the paragraph states, each a flag with the exact words. Expect among them the degree, the employer's enrolment in E-Verify, and the training plan. Record what the paragraph says, in the order it says it, and nothing it does not say. Ids begin `stem.requires.`.

The screen shows "What comes next" under the verdict: the dates in order, then, for the list, the regulation's own words in quotation, each with its citation and link. Above the list, one line: "This is what the regulation says. Whether it applies to you is a question for your DSO." Under it, the drafted question for the DSO, built from a template and the person's own dates, which the person can copy. Duly never sends it.

## 7. Words on the screen (the founder's notes)

| Item | Name on the screen |
|---|---|
| unemployment.days_remaining | Unemployment days remaining |
| unemployment.days_used | Unemployment days used |
| unemployment.limit | Unemployment days allowed |

Every item name says what the number is, in the words a person would use. The working stays behind the row.

Where a rule has two regimes, the row shows one value: the one in force. Under it, one line: "A rule change is blocked by a court. See what it would change." Opening it shows the other value, the rule, and the court's order from the saved source. The words for the legal status come from the pack, never from the screen.

All copy follows BOUNDARY.md and the copy linter. No reassurance, no urgency, nothing that tells the person what to do beyond asking their DSO.

## The tests (L-tests)

Tests for every section, in tests/unit and tests/holdout, written from this SPEC and the contracts. For each conflict in section 1: the input that raises it, the input one day to the safe side that does not, and the answer "yes" that moves the verdict to `talk_to_dso`. A property over generated cases: if any conflict or question is open, the verdict is `cannot_tell`; and no case gives `no_open_items` unless every part is either entered or answered for.

Turn each input in reviews/phase-2-second.md, findings 1, 4, 5 and 6, into a test.

## Done for the round

1. The offline gates pass, the hidden tests pass, every quote is found.
2. Clean CI passes on the pull request.
3. The reviewer approves, with every rubric line at or above the minimum.
