# Review: product round 1, fix 1

Reviewer: L-review, run l-review-3d5eed74c2, 2026-09-29. I started with no context and edited no code.

Scope: `git diff product-1~1...HEAD` (the screen round, 4214f59) and every merge since the review in reviews/product-1.md (1060d1a..4214f59): engine/f1.py, engine/dates.py, the f1 pack, tests/ and web/. I checked them against specs/product-1/SPEC-resolutions.md points 11 to 26, PRINCIPLES.md, BOUNDARY.md and CLAUDE.md. The commit reviewed is 4214f5983056b7a8c02102274f4a1c20edc4d7e6.

Every input below went through `POST /v1/compute/f1` with TestClient. The clock was a FixedClock at 2026-09-29 18:00 UTC in America/Los_Angeles, so today is 2026-09-29 unless a line says otherwise. Each case has `degree_level: master`, `documents_count: 2` and `cpt_full_time_days: 0`, and each period is 40 hours and reported. "Answered" means each question asked was answered with its own `about`, dated 2026-09-29. I wrote the probe scripts under TMPDIR and did not commit them.

## What was run

| Check | Result |
|---|---|
| `uv run pytest tests/unit/engine tests/unit/api tests/unit/assistant tests/unit/support -q` | exit 0 |
| `uv run pytest tests/holdout -q --tb=no` | exit 0 |
| web vitest, on a scratch copy of HEAD under TMPDIR (`--configLoader runner`) | 7 files, 212 tests passed |
| `python -m tools.sources.verify rulepacks` | "sources: 4 pack(s) checked, every quote found" |
| `python -m tools.gates.engine_literals` | "engine literals: every number has a source" |
| copy lint | "copy lint: clean" |
| mypy engine api / ruff check engine api tests | no issues / all checks passed |

Not run: `make test` as a whole, gates 3 and 6, the stack, and a browser. I read the screen findings from the code and its tests. I ran tests/holdout with `--tb=no`, and I read its diff for the audit of changed tests.

## Finding 1 of reviews/product-1.md, the four inputs again

| Input | Before | Now |
|---|---|---|
| Program end 2023-09-15. OPT rec 2023-09-01, filed 2023-09-10, EAD 2023-11-01 to 2024-10-31. STEM rec 2024-09-20, filed 2024-09-10, EAD 2024-11-01 to 2026-10-31 | no_open_items | cannot_tell, `conflict:stem.i765_filed_date.before_recommendation`, question asked |
| The same, STEM rec 2024-06-01 | no_open_items | cannot_tell, `conflict:stem.i765_filed_date.after_file_by` |
| Program end 2025-09-15. OPT rec 2025-09-20, filed 2025-09-10, EAD 2025-11-01 to 2026-10-31 | no_open_items | cannot_tell, `conflict:opt.i765_filed_date.before_recommendation` |
| The same, OPT rec 2025-07-01 | no_open_items | cannot_tell, `conflict:opt.i765_filed_date.after_file_by` |

Answering yes to the fourth gives `talk_to_dso` with reason `opt.i765_filed_date.after_file_by`, and `opt.file_within_days_of_recommendation` in `rules`. Answering no keeps cannot_tell. Closed.

Edges of point 11, checked by hand against the pack's 30 and 60 days:
- OPT filed on the recommendation day (2025-09-10): fits.
- OPT rec 2025-08-11 with filing 2025-09-10 is day 30: fits. Rec 2025-08-10 is day 31: conflict.
- STEM rec 2024-07-12 with filing 2024-09-10 is day 60: fits. Rec 2024-07-11 is day 61: conflict.
- OPT recommendation null: nothing is raised, as the point says.

## Points 12 to 25, each sent through the api

| Point | Input | What happens | Hand check |
|---|---|---|---|
| 12 | OPT only, program end 2025-09-15, card 2025-11-01 to 2026-10-31 | `upcoming` holds `grace.ends` 2026-12-30 once and no `next.grace.ends` | 2026-10-31 + 60 = 2026-12-30 |
| 14 | OPT to 2026-07-31, STEM filed 2026-01-10 | `conflict:stem.i765_filed_date.before_window_opens` | window opens 2026-05-02; filed 2026-05-02 fits, 2026-05-01 conflicts |
| 15 | Program end 2025-05-15, OPT filed 2025-07-15 | `conflict:opt.i765_filed_date.after_window_closes`; filed 2025-07-14 does not raise it | 2025-05-15 + 60 = 2025-07-14 |
| 16 | Program end 2025-07-14, card 2025-09-16 to 2026-09-15 | `conflict:opt.ead_end.after_complete_by`, `opt.complete_by` null while open | 2025-07-14 + 14 months = 2026-09-14 |
| 17 | STEM filed, no card; OPT with no end | `grace.ends` null, `missing:` named | |
| 18 | Card to 2026-10-15, cap-gap pending, change of status, start 2027-01-15 | `grace.ends` null, `capgap.ends` 2027-01-15, talk_to_dso `grace_with_cap_gap`. With cap-gap start 2026-10-01: grace 2026-12-14 as before | |
| 19 | OPT 2025-06-01 to 2026-05-31, STEM from 2026-06-01, work from 2025-09-14 | `unemployment.opt_card_days_used` 105; answered: talk_to_dso `unemployment_opt_card_at_or_over_limit` | 2025-06-01 to 2025-09-13 is 105 days |
| 19 | Same cards, not working 2026-04-02 to 2026-07-14 | total 104, on the OPT card 60, no judgement | Apr 2 to May 31 is 60 days; the piece is split at the card end |
| 20 | STEM from 2026-03-13, period 2 from 2026-07-01 | `employment.2.new_employer` asked, about holds the start and `stem.ead_start`; yes gives `stem.new_plan_due.2` 2026-07-11 | 2026-07-01 + 10 |
| 20 | Period 1 ended 2026-06-30 on the STEM card | `stem.concluding_evaluation_due.1` 2026-07-10, `reading: true` | 2026-06-30 + 10 |
| 21 | STEM from 2026-03-13, today 2026-09-28 and 2026-09-29 | `stem.validation_1_due` 2026-09-25, `stem.validation_1_due.made` asked, cannot_tell. Yes gives no_open_items. No gives talk_to_dso `stem.validation_1_due.not_made`, and `stem.reporting_required` in rules | 2026-09-13 + 10 business days = 2026-09-25 |
| 22 | Period 1 ended 2026-06-30, end_reported no | needs_you `report_employer`, `employment.1.end_report_by` 2026-07-10, status guidance, rules `opt.report_employer_within_days` and `opt.report_interruption` | |
| 23/25 | Program end 2023-01-15, card to 2024-02-28, answered | no alternates, no `rule_in_litigation`, no_open_items | |
| 23/25 | Program end 2026-08-01, nothing else, answered | alternates on the window items and grace (2026-08-31 under the enjoined rule), `rule_in_litigation` | |
| 24 | STEM from 2025-12-26 | validations 2026-07-10, 2027-01-11, 2027-07-09, 2028-01-07 | counted by hand, skipping only the listed days: 2026-07-03 and 2027-07-05 are counted, and 2027-12-31 is counted. Each date is one business day earlier than the observed-day count, and none is later than the words |

No date I checked is later than the words it cites.

A STEM filing after the OPT card end (OPT to 2026-05-31, STEM filed 2026-06-05) is caught by the older row `stem.i765_filed_date.after_card`.

## Tests changed in the reconcile rounds

The reconcile rounds are a1a29b2 and 9f12504. I read every removed or changed assertion in them.
- Every changed case or assertion carries a comment that names the point that required it.
- Answers to the questions of points 20 to 22 come from `periods_answered`. That helper answers only those questions and keeps any answer the case already holds.
- The shuffle property now compares the numbered items apart from their numbers. The dates are still compared.
- The exact lists `conflicts(out) == ["opt.card_longer_than_rule"]` became two exact lists that also name `opt.ead_end.after_complete_by`.
- `test_f1_fixes` now expects `opt.apply_window_opens` and `opt.complete_by` null while point 16's conflict is open. Point 4 requires that, because the conflict's `about` holds `program_end_date`. It is on the safe side, though point 16 names only the items that use `opt.ead_end`.
- The two holdout tests moved from test_holdout_windows.py to test_holdout_periods_and_reports.py with every assertion kept.
- One check is wider. In test_f1_product.py, the property that every asked id is on a known list now lets through any id shaped like a period or report question. I call it a note: those questions have their own tests.

I found no assertion that was dropped or loosened with no point to justify it.

## The screen

No line says a filing was late or a report was missed. The new lines say:
- "is more days after ... than the rule gives for filing"
- "The date for the ... is before today. Did you submit this report?"
- "You answered that you did not submit the ... What that means is a question for your DSO."

The report day for an end is named "from SEVP guidance". The rule a conflict names is shown beside its question. The concluding evaluation carries the reading mark. Copy lint is clean. I read this from the code and its tests, not in a browser.

## Findings

### 1. Blocking. A new Form I-983 whose date has passed drops out, and the verdict is "No open items"

- File: engine/f1.py, `_add_periods` (line 783) and `_passed_reports` (line 835). `stem.new_plan_due.<n>` is never added to `work.reports`, so nobody asks whether it was made once its date passes.
- Input: program end 2025-02-15. OPT rec 2025-02-10, filed 2025-02-20, EAD 2025-03-13 to 2026-03-12. STEM rec 2026-01-10, filed 2026-01-15, EAD 2026-03-13 to 2028-03-12. Periods 2025-03-13 to 2026-06-30 and 2026-07-01 open. Every question is answered yes, including `employment.2.new_employer`.
- What happens: 200, `stem.new_plan_due.2` is 2026-07-11, and the verdict is `{"state": "no_open_items", "reasons": []}` with no question. On 2026-07-05 the same case is needs_you with that item open. From 2026-07-12 on, it is quiet.
- Rule: CLAUDE.md, "Confirm, never assume". PRINCIPLES.md ranks a quiet verdict on an unconfirmed record worst. The mission names this check: no no_open_items when a report date has passed unanswered. The engine dated this duty itself, from 8 CFR 214.2(f)(10)(ii)(C)(7)(iv), and then assumes it was met.
- Cause: point 21 lists only "validation or evaluation" items, so the code follows the SPEC. The gap is in the SPEC.
- Asked for: a resolution that adds `stem.new_plan_due.<n>` to point 21, so it is asked `.made` and a no gives talk_to_dso. Then the engine appends it to `work.reports`, and a test sends this input.
- Tests: none sends a passed new plan date.

### 2. Should fix. Seven employment periods make more questions than the contract lets a person answer, so the case can never leave cannot_tell

- File: contracts/case_f1.schema.json, `confirmations.maxProperties: 20`, against the questions points 20 to 22 add for each period.
- Input: OPT 2023-06-01 to 2024-05-31, STEM 2024-06-01 to 2026-05-31, and seven periods: one on the OPT card, five 100-day periods on the STEM card, one open.
- What happens: 23 questions. Sending all 23 answers returns 422 "confirmations: this does not match the contract". With six periods there are 20 questions, and answering them gives no_open_items. Thirteen periods (the contract allows 50) give 41 questions.
- This is on the safe side, but a record with more than about six periods stays cannot_tell forever.
- Asked for: a contract change, landing first and alone, that raises the limit to cover 50 periods.

### 3. Note. Point 16's conflict nulls the items that use program_end_date

`opt.apply_window_opens` and `opt.complete_by` are null while `opt.ead_end.after_complete_by` is open. Point 16 names the items that use `opt.ead_end`, and point 4 says the items that use its dates. The engine follows point 4, the safer reading. For the founder, to write one of them to match the other.

## The standing checks

- A conclusion about a person or a number from a model: none. No model is called.
- Time outside an injected clock: none in the diff. `_passed_reports` and the conflicts read `work.today`.
- User data to an outside model: none.
- A quiet verdict on a gap or a conflict: yes, finding 1. Every SPEC case above is cannot_tell, needs_you or talk_to_dso where the points say.
- Duly's reading shown as the law's words: the concluding evaluation is marked a reading. The report-by day is labelled guidance. `calendar.federal_holidays_law` stays a reading with the 6103(b) words in its note.
- A rule with no primary source: none. `opt.report_interruption` and `stem.reporting_required` quote (f)(12)(i) and (f)(12)(ii) verbatim, and the source check found both.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 3 | Every input points 11 to 25 name gives what the point says, and I checked the dates and counts by hand. Beyond them: finding 1 (quiet after a passed new I-983 date) and finding 2 (a record of seven periods can never be answered) |
| sourced | 5 | Every quote found, the literals gate passes, and the day counts come from the pack. The holiday change follows the saved 6103(b) words, and I checked four business-day dates by hand |
| never_assumes | 2 | A passed new-plan date the person was never asked about gives no_open_items (finding 1) |
| inside_the_boundary | 4 | Copy lint clean. No line says late or missed. SEVP guidance is named as guidance. Not seen in a browser |
| secure | 3 | No crash or 500 found. The answer limit of 20 stalls a record of seven periods at cannot_tell for good (finding 2) |
| tested | 3 | The reconcile changes name their points and loosen nothing I could find. No test sends a passed new-plan date or more than 20 answers |

## Decision

Finding 1 of the product round 1 review is closed on all four of its inputs, and points 11 to 25 work on the cases they name. One record still gets "No open items" while a duty the engine dated has passed with no answer. That breaks a hard rule, and three lines are below the minimum of 4.

VETO
