# Review: product round 1, fix 6

Reviewer: L-review, run l-review-1280065922, 2026-09-29. I started with no context and edited no code.

Scope: every merge since reviews/product-1-fix5.md (17a53ac..d9442be): the plain_terms contract and the plain-first gate (tools/sources/plain.py), the f1 pack's plain words and terms (point 58), engine/f1.py (points 59 and 60), web drafts.ts (point 61), and the tests of the round. Checked against specs/product-1/SPEC-resolutions.md points 58 to 61, specs/plain-1/SPEC.md, PRINCIPLES.md, BOUNDARY.md and CLAUDE.md. The commit reviewed is d9442bea2497fcfa8b991c7b0ba207c31e6b1f5a.

Every case below went through `POST /v1/compute/f1` with TestClient and a FixedClock at 18:00 UTC, time zone America/Los_Angeles, today 2026-09-29 unless a line says otherwise. Each case has `degree_level: master`, `documents_count: 2` and `cpt_full_time_days: 0`, and each period is 40 hours a week and reported, unless a line says otherwise. "Answered in full" means each question was answered yes, with its own `about`, dated the clock's day, until none was left. The exceptions are `.earlier_at_this_level` and `.new_employer`, answered no, and any answer a line names. The probe scripts are under TMPDIR and were not committed.

## What was run

| Check | Result |
|---|---|
| `uv run pytest tests/unit/engine tests/unit/api tests/unit/assistant tests/unit/support -q` | exit 0 |
| `uv run pytest tests/holdout -q` | exit 0 |
| `uv run pytest tests/unit/tools/test_plain.py -q` | 11 passed |
| `python -m tools.sources.plain rulepacks --require f1` | "every plain text is general, calm, readable and grounded" |
| `python -m tools.sources.verify rulepacks` | "4 pack(s) checked, every quote found" |
| `python -m tools.gates.engine_literals` | "every number has a source" |
| `python tools/copy_lint/lint.py` | "copy lint: clean" |
| mypy engine/f1.py, ruff engine tools/sources | clean |
| web vitest on a scratch copy of HEAD under TMPDIR (`--configLoader runner`) | 11 files, 299 tests passed |

Not run: `make test` as a whole, gates 3 and 6, the stack, a browser. I printed the drafts by calling `dsoDraft` and `stemDraft` from a scratch vitest file in the TMPDIR copy, on api outputs. I read the screen code and did not see it.

## The findings of reviews/product-1-fix5.md, sent again

- Finding 1 (six plain texts). Program end 2025-05-15, OPT card 2025-06-01 to 2026-05-31 (rec 2025-04-01, filed 2025-04-10), period open, cap-gap filed 2026-04-01, start 2026-10-01, pending, change of status, answered in full: talk_to_dso `grace_with_cap_gap`. `stem.requires.employer_attests_no_replacement` keeps "U.S. worker". `stem.requires.previously_obtained_degree` and `stem.requires.accreditation` keep "U.S. educational institution", and accreditation keeps "recognized"; its relative clause now mirrors the quote's, so the open reading stays open. The STEM case (program end 2025-02-15, OPT card 2025-03-13 to 2026-03-12, STEM card 2026-03-13 to 2028-03-12, period open) carries `stem.min_hours_per_week` with "similarly situated U.S. workers in the area of employment". The paused 30-day row keeps "period of admission". `capgap.end_month_day` (2025-01-17) now says "under the yearly cap, as Duly reads it", which the note supports. The gate refuses the section number (see disputes). The six term swaps are closed, but the same two cap-gap texts now drop other limits (finding 1).
- Finding 2 (past clocks). The STEM case with the clock at 2016-05-09 gives 200, talk_to_dso with `rule_not_in_force_on_event_day`. Program end 2012-02-15, OPT card 2012-03-13 to 2013-03-12, STEM card 2013-03-13 to 2014-07-12, period from 2012-03-13, clock 2014-01-15: 200, the four `stem.validation_n_due` are null, and the step back is given. The OPT case (card 2026-06-01 to 2027-05-31, period open) at 2002-12-31: 200, `cpt.full_time_days_used` null, and the step back is given. With `cpt_full_time_days` null: 200, cannot_tell `missing:cpt_full_time_days`. I called `compute_f1` directly on nine cases (OPT, CPT 400, STEM, the 2012 STEM case, cap-gap, 2015, no job, before OPT, a 2001 card), answered in full on the clock's day. The clock ran every 29 days from 1990 to 2027 and every 97 days from 1950 to 1990 and from 2027 to 2099: no error on any clock. Closed.
- Finding 3 (2015 count). Program end 2015-05-15, card 2015-06-01 to 2016-05-31, period 2015-06-01 to 2016-05-31 not reported, answered in full: `employment.periods_not_reported` is null, and the verdict is talk_to_dso `rule_not_in_force_on_event_day`. Closed.
- Finding 4 (new-plan draft). Fix 4's finding 4 case: "My employment period 2 started on Jul 1, 2026 and has no end date." then "I did not submit my new Form I-983 for employment period 2." The engine numbers periods in the order entered (engine/f1.py line 987), and the draft reads `sent.employment[period - 1]`, so the dates match. Closed.
- Finding 5 (cap-gap draft). "Could you tell me what comes after my petition's requested start date, and whether a grace period follows it?" No draft says "my cap-gap period". Closed.

## Points 59 to 61, each sent through the api

| Point | Input | What happens | Hand check |
|---|---|---|---|
| 59 | the clocks of fix 5 finding 2 and the scans above | 200 every time; null values with the step back | |
| 60 | program end 2025-04-15, card 2025-05-01 to 2026-04-30, one reported period 2025-05-18 to 2025-06-30 | count null, `rule_not_in_force_on_event_day` | row starts 2025-05-19 |
| 60 | the same, period from 2025-05-19, not reported | count 1 | on the row's first day |
| 60 | periods from 2025-05-19 (reported) and 2025-07-01 (not) | count 1, needs_you `report_employer` | |
| 60 | periods 2025-07-01 (not reported) and 2025-05-18 (reported), entered in that order | count null, step back | the earliest start is found in any order |
| 61 | every draft below | period dates for a numbered report; the petition's requested start date | |

## Every plain text beside its quote and its plain_terms

I printed both regimes and all 53 rows with quote, note, plain and plain_terms side by side and read each. These pass: the regime ds_2012 and every row not named here. The rows for the apply dates, the CPT bar, the unemployment limits, the evaluations, the reports, the new plan, the holidays, the fiscal year and the listed requirements for the list, the designated list, the related opportunity, E-Verify, training plan, duties and the three attestations say what their quotes say, keep their terms and use everyday words. The reading rows other than the two in finding 2 say in words that they are Duly's reading.

These do not pass (finding 1 for meaning, finding 2 for plainness):
- `capgap.end_month_day` (2025-01-17) and (2008-04-08): the quote extends "any employment authorization granted under 8 CFR 274a.12(c)(3)(i)(B) or (C)". The plain words say "employment authorization", with no limit. The note of the 2025 row says "the plain words say only the employment authorization the rule names", but they do not. The texts before this round said "the work permission the rule named". This says more than the quote.
- `capgap.end_month_day` (2025-01-17): "until the validity start date of the approved petition, whichever is earlier" becomes "or the petition's start date if sooner". It drops "approved" and "validity". The start date on a pending petition is the requested start date, and the draft now uses that same phrase for it ("my petition's requested start date"). The text before this round said "until the approved petition starts".
- `capgap.end_month_day` (2008-04-08): "and from 2016 only for a petition under the cap". Its note says that reading "subject to section 214(g)(1)(A)" as "under the yearly H-1B cap" is Duly's reading of the preambles. This row is `verbatim`, and its plain words do not say it is a reading. The 2025 row says "as Duly reads it". This one is shown today for a 2024 petition. Program end 2023-05-15, card 2023-06-01 to 2024-05-31, petition filed 2024-04-02 for 2024-10-01, pending: `rules` carries it.
- `stem.requires.employer_reporting`: the quote has the employer report the termination or departure "if the termination or departure is prior to the end of the authorized period of OPT". The plain words say the employer agrees "to tell the DSO of the student's departure, or the end of the job, before the authorized period of OPT ends". That makes the time limit a limit on when the employer tells, not a condition on when the student leaves. The text before this round had it right: "if the student leaves or is let go before OPT ends".
- `stem.requires.employer_reporting` and `stem.requires.self_evaluation` (both `reading`): each ends "Duly joins this to the rule's words just before it." Plain-1 section 1 asks that a reading say "this is how Duly reads the rule, in those words". This sentence does not, and an average student would need to read it twice. The gate does not check the reading sentence.
- `stem.requires.dhs_approved_degree`: "the Secretary's designee", with plain_terms ["designee"]. "Designee" is legal phrasing. "A person the Secretary names" covers the same people, and it was the text before this round. The row's own note still says "the plain words say a person the Secretary names". Point 58 says legal phrasing is refused in plain words and refused as a term.
- `opt.apply_after_days` (60, in force): "the last day ... is 60 days after the program end date. Filing may begin 90 days before that date." "That date" can be read as the last day, which would open filing 30 days before the program end date. The text before this round said "90 days before the program end date".
- `stem.extension_months`: "The extension lasts 24 months for the first degree that meets the STEM terms for which the student has completed all course requirements, apart from a thesis or its equivalent." It is one sentence with two relative clauses in a row, and a student has to read it twice to see which clause goes with which noun.
- `stem.requires.previously_obtained_degree`: one 51-word sentence with three "must" clauses. It ends "granted in the 10 years before", before what is left to the reader. The text before this round said "before the DSO's recommendation".

Notes, not vetoed on their own:
- Regime `fixed_admission_2026`: "for students and some other visitors". The rule's title in the note names exchange visitors and representatives of foreign information media. Media representatives are not visitors.
- `grace.after_completion_days` (30, paused): "the end date of the approved employment authorization for post-completion OPT or STEM OPT, as applicable" becomes "the end of post-completion OPT or STEM OPT".
- plain_terms that are not terms of art: `resources` (stem.requires.employer_attests_resources) and `individualized` (stem.requires.training_plan). They do no harm, but point 58 keeps the list for terms whose everyday word would change who is covered.

## Every DSO draft the screen can build

From api outputs, I built drafts for every reason in `ASKS` except `report_employer`, which the engine gives as needs_you. I also built `hours_under_threshold` with one period and with two, three reports answered not made (validation 1, the new plan on either side of the report row, and the final evaluation), two conflicts answered yes (point 27, and a STEM card after a card that ends before the program end), the 2005 and 2015 cases, the STEM case of point 60, and the STEM step draft. That is 20 drafts. Each opens "I have a question about my F-1 record.", is in the first person, and ends "Thank you," and "[Your name]". None has the word Duly, a computed date, a status, or a comparison with a rule. Each numbered report states that period's dates as entered. One is wanting (finding 3).

## Tests changed in this round

- tests/unit/engine/test_f1_fix2.py and test_f1_fix4.py: two cases lose their employment period, marked point 60. The period started before 2025-05-19 and now steps back through the count. The assertions stay as they were: the step back is absent from the OPT window rows and the cap-gap rows.
- tests/unit/engine/test_f1_fix5.py: the period that ends on the row's first day now also starts on it, marked point 60, so the end report is still tested alone.

None of the three loosens an assertion without a point. tests/unit/engine/test_f1_fix6.py and tests/holdout/test_holdout_fix6.py add points 59 and 60. tests/unit/tools/test_plain.py adds the terms, citation and legal phrasing checks. drafts.test.ts adds point 61.

## Findings

### 1. Blocking. Three plain texts say more or other than their quotes, and three of those faults are new this round

- File: rulepacks/f1-us/v2026.09/parameters.yaml line 453 (`capgap.end_month_day`, 2025-01-17), line 437 (`capgap.end_month_day`, 2008-04-08), line 709 (`stem.requires.employer_reporting`).
- Input: the cap-gap case above (talk_to_dso `grace_with_cap_gap`). Its `rules` carries the 2025 cap-gap row and `stem.requires.employer_reporting`. The 2024 petition case above carries the 2008 cap-gap row.
- What happens: listed in the section above. Both cap-gap rows drop the limit to employment authorization under 274a.12(c)(3)(i)(B) or (C). The 2025 row turns "validity start date of the approved petition" into "the petition's start date". The 2008 row states "under the cap" as the rule's words, and it is Duly's reading. The employer-reporting row moves "before the authorized period of OPT ends" from the departure to the telling. The texts before this round had the first, second and fourth right. The gate passes all of them, because the terms each row lists are kept.
- Rule: point 58, meaning drift: "a limit dropped, something added, or a reading shown as the rule's words". Plain-1 section 1. The mission says to veto any plain text that says more, less or other than its quote.
- Asked for: L-content says "the OPT or STEM OPT employment authorization the rule names", or words that keep that limit and that the note supports. Keep "approved petition" (for example "the start date of the approved petition"). Mark "under the cap" as Duly's reading in the 2008 row. Say "if the student leaves or the job is ended before the authorized period of OPT ends".

### 2. Blocking. Five plain texts are not plain, and two readings are not said to be readings

- File: rulepacks/f1-us/v2026.09/parameters.yaml lines 709 and 757 (`stem.requires.employer_reporting`, `stem.requires.self_evaluation`), 629 (`stem.requires.dhs_approved_degree`), 63 (`opt.apply_after_days`, 60), 226 (`stem.extension_months`), 661 (`stem.requires.previously_obtained_degree`).
- Input: the cap-gap case above carries every one of these in `rules` except `stem.extension_months`, which the STEM case above carries.
- What happens: listed in the section above. The two reading rows close with "Duly joins this to the rule's words just before it", which does not say it is Duly's reading, and a student would need to read it twice. "Designee" is legal phrasing, and it is kept as a term. "That date" has two antecedents. Two texts are single long sentences that a student would need to read twice.
- Rule: point 58, legalese: legal phrasing "an everyday word can carry without changing who or what is covered" is refused in plain words and as a term. Plain-1 section 1: "keep a reading a reading ... in those words". The mission says to veto any text that is not plain.
- Asked for: L-content ends each of the two reading rows with "This is Duly's reading, not the rule's exact words." Say "a person the Secretary names" and empty that row's plain_terms. Say "90 days before the program end date". Split the other two into shorter sentences, and name the DSO's recommendation as the end of the 10 years.

### 3. Should fix. The draft for a step back caused by an employment period leaves that period out

- File: web/src/lib/drafts.ts line 115, `rule_not_in_force_on_event_day` with topics `[...CARDS, "cap_gap"]`.
- Input: the STEM case above (period from 2025-03-13, reported), answered in full: talk_to_dso `rule_not_in_force_on_event_day`, from `employment.periods_not_reported` (point 60). The 2015 case gives the same reason.
- What happens: the draft lists the program end and both cards, then "Could you tell me which rules apply to these dates in my case?" The period start that caused the step back is not in the draft, so the DSO cannot see the date the question is about. In the 2015 case the period and its unreported end are missing too.
- Rule: plain-1 section 4, a draft is "built from the facts behind its reasons". Point 60 makes the employment period a cause of this reason.
- Asked for: add "employment" to that reason's topics.

### 4. Should fix. A pack that lacks the validation interval or the extension length gives a quiet verdict

- File: engine/f1.py `_validation_reports` line 870 (`return iter(())`), through `whole_shown` and `_row_shown`, which set no step back.
- Input: the test file's STEM_CASE (tests/unit/engine/test_f1_fix6.py) on `pack_dict(TODAY, leave_out=("stem.validation_interval_months",))`, or with `stem.extension_months` left out, answered no in full.
- What happens: no validation report is listed and the verdict is `no_open_items` with no reasons. The same case on a pack that lacks `cpt.full_time_bar_days` or `opt.report_employer_within_days` gives talk_to_dso `rule_not_in_force_on_event_day`. The shipped pack holds both rows, so no person reaches this today.
- Rule: CLAUDE.md, "A verdict never falls back to the quiet state. Missing ... means cannot_tell". Point 59: where no row is in force, null "with the step back".
- Asked for: set the step back when `whole_shown` finds no row. The test `test_point_59_a_pack_without_the_interval_lists_no_validation_report` checks only that no report is listed. It should also check that the verdict is not the quiet state (a test-lane change).

## The standing checks

- A conclusion about a person: none. No draft states a status.
- A number or date from a model: none. No model is called.
- Time read outside an injected clock: none.
- User data to an outside model: none.
- A quiet verdict on a gap or a conflict: only finding 4, on a pack that lacks a rule.
- A fact assumed and not asked: none found.
- Duly's reading shown as the law's words: finding 1 (the 2008 cap-gap row) and finding 2 (two reading rows without the words).
- A rule with no primary source: none. Every quote is found and the numbers have sources.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 4 | Points 59, 60 and 61 do what they say on their inputs and beside them. There was no error on any clock from 1950 to 2099, the point 60 edges fit at 2025-05-18 and 2025-05-19 in either order, and the period dates are in the drafts. Wanting: the step-back draft leaves out the period that caused it (finding 3) |
| sourced | 2 | Every quote is found, and fix 5's six term swaps are closed. But four texts shown today say more or other than their quotes: a limit is dropped, "approved" is dropped, the time limit is moved, and a reading is shown as the rule's words (finding 1). Three of these were right before this round |
| never_assumes | 4 | Every gap sent through the api asks or steps back. A pack that lacks a rule gives no_open_items (finding 4) |
| inside_the_boundary | 5 | All 20 drafts ask and state only what was entered, with no status, no computed date and no Duly. No plain text speaks to "you" or instructs |
| secure | 5 | No 500 and no exception on any clock or case tried, including clocks before every row and after 2027 |
| tested | 3 | The new tests catch points 59 to 61 on their cases. None would fail on finding 1 or 2, because the gate checks terms and not meaning. None would fail on finding 3. The missing-interval test enshrines finding 4 |

## Decision

Fix 5's findings are closed: the term swaps, the past clocks, the 2015 count, the new-plan draft and the cap-gap draft. The engine no longer fails on any clock. But the plain words still fail the test this round was for. Four texts shown today say more or other than their quotes, three of them after being right before, and five are not plain. Sourced is 2 and tested is 3, below the minimum of 4, and the mean is 3.83, below 4.3.

VETO
