# Review: product round 1, fix 2

Reviewer: L-review, run l-review-54de1b7f57, 2026-09-29. I started with no context and edited no code.

Scope: every merge since reviews/product-1-fix1.md (149170e..e71c8c9): the contract change for `confirmations`, engine/f1.py, api/main.py, the f1 pack, tests/ and web/. I checked them against specs/product-1/SPEC-resolutions.md points 27 to 38, PRINCIPLES.md, BOUNDARY.md and CLAUDE.md. The commit reviewed is e71c8c91d057cac50d9c765dbcb7589b224d6265.

Every case below went through `POST /v1/compute/f1` with TestClient. The clock was a FixedClock at 2026-09-29 18:00 UTC in America/Los_Angeles, so today is 2026-09-29 unless a line says otherwise. Each case has `degree_level: master`, `documents_count: 2` and `cpt_full_time_days: 0` unless a line says otherwise, and each period is 40 hours a week and reported. "Answered in full" means I sent the case again with each question the engine asked answered, with its own `about`, dated 2026-09-29, until no question was left. The probe scripts are under TMPDIR and were not committed.

## What was run

| Check | Result |
|---|---|
| `uv run pytest tests/unit/engine tests/unit/api tests/unit/assistant tests/unit/support -q` | exit 0 |
| `uv run pytest tests/holdout -q --tb=no` | exit 0 |
| web vitest, on a scratch copy of HEAD under TMPDIR (`--configLoader runner`) | 8 files, 242 tests passed |
| `python -m tools.sources.verify rulepacks` | "sources: 4 pack(s) checked, every quote found" |
| `python -m tools.gates.engine_literals` | "engine literals: every number has a source" |
| copy lint | "copy lint: clean" |
| mypy engine api / ruff check engine api tests | no issues / all checks passed |

Not run: `make test` as a whole, gates 3 and 6, the stack, and a browser. For the screen I rendered `Questions` with a scratch vitest file in the TMPDIR copy, and I read `reasonText` output there. I ran tests/holdout with `--tb=no` and read its diff for the audit of changed tests.

## The findings of reviews/product-1-fix1.md

- Finding 1 (a passed new Form I-983). Program end 2025-02-15. OPT rec 2025-02-10, filed 2025-02-20, card 2025-03-13 to 2026-03-12. STEM rec 2026-01-10, filed 2026-01-15, card 2026-03-13 to 2028-03-12. Periods 2025-03-13 to 2026-06-30 and 2026-07-01 open. With `employment.2.new_employer` yes, `stem.new_plan_due.2` is 2026-07-11 (2026-07-01 plus 10). On 2026-07-05 it is needs_you. On 2026-07-11, its own day, it is not asked about, and the concluding evaluation of 2026-07-10 is. On 2026-07-12 and on 2026-09-29 the verdict is cannot_tell, and `stem.new_plan_due.2.made` is asked with `about` `{"stem.new_plan_due.2": "2026-07-11"}`. Yes gives no_open_items. No gives talk_to_dso with `stem.new_plan_due.2.not_made`. `stem.concluding_evaluation_due.1` (2026-07-10) is asked the same way. Closed.
- Finding 2 (seven periods). The same cards as the fix 1 review, seven periods. The engine now asks 29 questions, six more than before because point 36 adds a `.made` for each passed new plan. All 29 answers are taken, and the verdict is no_open_items. Fifty periods of 14 days each inside the STEM card, answered in full, take 207 answers in 0.1 s. 256 answers give 200 and 257 give 422. Closed.
- Finding 3 (point 16 nulls the items that use `program_end_date`) is now point 37.

## Points 27 to 38, each sent through the api

| Point | Input | What happens | Hand check |
|---|---|---|---|
| 27 | Program end 2026-05-22. OPT rec 2025-12-01, filed 2025-12-10, card 2026-01-15 to 2026-05-14 (four months, ending eight days before the program end). No employment | cannot_tell with `conflict:opt.ead_end.not_after_program_end`. Its `about` holds the program end and both card dates. The window, latest start, complete-by, grace and unemployment items are null. `lists` and `upcoming` are empty. `opt.post_completion_definition` is in `rules` | |
| 27 | The same, answered in full with yes | talk_to_dso with `opt.ead_end.not_after_program_end`, **and** `unemployment_at_or_over_limit`, with the STEM extension list as the next step. See finding 1 | Jan 15 to May 14 is 17 + 28 + 31 + 30 + 14 = 120 days |
| 27 | The same, with the conflict answered no | cannot_tell, the items stay null | |
| 27 | Card end on the program end (2026-05-22) / the day after (2026-05-23) | raised / not raised | |
| 27 | Card end 2026-05-01, no card start | raised, `about` carries `opt.ead_start: null`, and `missing:opt.ead_start` | |
| 28 | The shipped pack, program end 2026-06-01, card 2026-06-15 to 2027-06-14 | unchanged | |
| 28 | The same case with the regimes flipped in memory (the blocked rule operative) | `opt.apply_window_closes` and `opt.latest_start` null, talk_to_dso with `rule_not_in_force_on_event_day`. `grace.ends` 2027-07-14 with the ds_2012 alternate 2027-08-13 | 2027-06-14 + 30 = 2027-07-14; + 60 = 2027-08-13 |
| 28 | The shipped pack, program end 2005-05-15 | window items null, talk_to_dso with `rule_not_in_force_on_event_day`. See note 6 | the rows start 2008-04-08 |
| 30 | pack | the quote is the whole sentence with its exception. I found it verbatim in sources/ecfr-8cfr214.2-2026-09-14.xml | |
| 35 | `GET /v1/status` | each pack carries `rules_checked_on`, f1 "2026-09-28", and the landing says "Server status read", not "Checked". See finding 4 | |
| 36 | as finding 1 above | closed | |
| 37 | Program end 2025-07-14, card 2025-09-16 to 2026-09-15 | `conflict:opt.ead_end.after_complete_by`; `opt.apply_window_opens`, `opt.apply_window_closes`, `opt.complete_by` and `grace.ends` are null | |
| 38 | 256 and 257 answers | 200 and 422 | |

The SEVP quote of point 27 is on the saved page sits-f1-opt-2026-09-28.html, whose sha256 matches the pack, and the page prints "Last updated: May 19, 2025", which is the row's `effective_from`. The row is guidance, and its note says that using the card end as the test is Duly's reading. The screen line for the conflict says the same.

Every `rule_ids` entry in `upcoming` was in the output's `rules` on five cases (OPT only, STEM with periods, cap-gap, point 27 answered, an empty case). `UpcomingRow` opens to `RuleCard`, which shows the value, the words, the citation link, and the pack's note under "Duly's reading" for a reading (point 32). For point 29, the only item that carries an answer among its inputs is `cpt.full_time_days_used` (`full_time_cpt_used: {"answer": false, "on": ...}`). It is shown as "You answered No on ..." and named "Full-time CPT days (your answer)". For point 34, a period in a question is shown as "Jun 2, 2025 to Jul 1, 2026" or "Starts Jul 2, 2026".

## Tests changed in the reconcile round

The reconcile round is 67625a6. 5b6b683 changed two older test files and added new ones. I read every removed or changed assertion, holdout and web included.
- test_holdout_f1: the program-end-after-every-card test no longer expects grace 2027-02-16 and 0 unemployment days. It expects point 27's conflict, cannot_tell, and both items null. It names point 27 and point 4. This change is forced by the point.
- test_f1 and test_f1_sourcing, the conflict table and the lookback rows: `False` became the exact list of conflicts (`[]` or `[POINT_27]`). The `True` rows now need a conflict other than point 27's. Both are stricter, and each names point 27 with the working that no facts on those rows avoid it. I checked that claim: a card of at most 12 months that begins a year or more before the program end ends on or before it.
- test_holdout_sourcing: the same, stricter, and it names point 27.
- test_compute_context: the refused count is 257, and the test names point 38.
- labels.test: `opt.latest_start` is taken out of the modal-word check, because point 31 names it "Latest start date a student may request". In its place is an exact check of those words and a check for "you" and "your". It names point 31. It is one narrower check, and it is justified.
- Result.test: "Employment period 1 end date" became the two spans of point 34, which names it. App.test: one conflict test now enters the facts the conflict was raised for, because point 33 drops an answer that does not fit (the helper names 33).

I found no loosened assertion that lacks a point to justify it. What the tests miss is in the findings: nothing answers point 27 yes and then looks at the next step or the unemployment count. No web test covers the new judgement item of point 28. And the status test checks a field that the status contract does not hold.

## Findings

### 1. Blocking. Point 27 answered yes: Duly takes the card as post-completion OPT

- File: engine/f1.py lines 1307 to 1315 and 1363. `pre_completion` is true only while the conflict is unsettled (unanswered or no). Once it is answered yes, the OPT step is marked done and `_add_next_step` runs, and the unemployment count treats the card as post-completion OPT.
- Input: program end 2026-05-22. OPT rec 2025-12-01, filed 2025-12-10, card 2026-01-15 to 2026-05-14. No employment. Answered in full, all yes (`no_employment_to_record`, `opt.ead_end.not_after_program_end`).
- What happens: 200, verdict `talk_to_dso` with reasons `["unemployment_at_or_over_limit", "opt.ead_end.not_after_program_end"]`. `unemployment.days_used` is 120 and `unemployment.days_remaining` is -30 against `opt.unemployment_limit_days` 90. `lists` holds `stem.extension.what_the_regulation_lists`, which is the STEM extension placed as the next step. The 120 days are every day of a card that lies wholly before the program end.
- Rule: point 27, "Duly never takes such a card as post-completion OPT". The limit quoted is 8 CFR 214.2(f)(10)(ii)(E), "during any post-completion OPT period", and the pack's own guidance row defines such days as pre-completion. The engine states a count and a limit crossing about the person on a reading the point forbids, and it shows the next step that the point's own case names as the fault ("the STEM extension as the next step").
- Asked for: keep `pre_completion` while the fact stands either way (open or confirmed). With yes, the verdict carries the judgement item and nothing that assumes post-completion OPT: no OPT step done, no STEM step next, and unemployment not counted against the post-completion limit. Also a test that answers yes and checks all three.

### 2. Blocking (older than this diff; the gap is in SPEC.md). An open work period that begins after the last card has ended gives "No open items"

- File: engine/f1.py lines 1043 to 1052 (`final = min(today, last_end)`). It follows specs/product-1/SPEC.md line 27: "other than days after the last card ends while the period is open".
- Input: program end 2025-05-15. OPT rec 2025-04-01, filed 2025-04-10, card 2025-06-01 to 2026-05-31. Periods 2025-06-01 to 2026-05-31 and 2026-07-01 open. Answered in full.
- What happens: `{"state": "no_open_items", "reasons": []}`. `grace.ends` is 2026-07-30 (2026-05-31 + 60), two months before today. The record says the person has worked since 2026-07-01 with no card, and nothing is asked. The same period closed on 2026-09-20 gives talk_to_dso with `employment.period_outside_cards`. An open period that begins 2026-05-15 also gives no_open_items. The base commit 149170e gives the same three answers, so this diff did not cause it.
- Rule: CLAUDE.md, "Confirm, never assume". The engine assumes that work stopped when the card ended.
- Asked for: a resolution of SPEC section 1 so that an open period with days after the last card end (at least one that begins after it) is a conflict or a question, and a test for this input.

### 3. Should fix. The judgement item of point 28 has no line on the screen

- File: web/src/lib/labels.ts, `reasonText`. `rule_not_in_force_on_event_day` is named nowhere in web/src.
- Input: the shipped pack with program end 2005-05-15, OPT rec 2005-04-01, filed 2005-04-10, card 2005-06-01 to 2006-05-31, answered in full. Or any case of point 28 with the blocked rule operative.
- What happens: the verdict is talk_to_dso with `rule_not_in_force_on_event_day`, and `reasonText` gives "Something in what you entered needs an answer." There is no question to answer, and the matter is the rule's date, not the entry.
- Asked for: a line for the item that says the rule used was not in force on the day it counts from, and a test.

### 4. Should fix. `/v1/status` no longer matches its contract

- File: api/main.py line 82. Contract: contracts/openapi.yaml, `RulepackRef`, which has `additionalProperties: false`.
- Input: `GET /v1/status`.
- What happens: each entry of `rulepacks` carries `rules_checked_on`. Checking the body against the `Status` schema gives "Additional properties are not allowed ('rules_checked_on' was unexpected)". Point 35 says this field "needs a field in the status contract; that is for the founder and lands first and alone". tests/unit/api/test_status_rules.py says the same in its header and still asserts the field.
- Asked for: the contract change first and alone, or the field taken out until it lands.

### 5. Should fix. An answer the engine no longer reads is shown as standing

- File: web/src/lib/answers.ts `answerFits`, used by web/src/components/Result.tsx lines 387 to 390. An answer counts as standing when every value in its `about` matches the facts. The engine can stop asking the question for a fact that is not in the `about`.
- Input: finding 1's STEM case of the fix 1 review, answered in full. Then the STEM card end is changed to 2026-06-30 and the case is sent again with the same answers.
- What happens: the engine no longer asks `employment.2.new_employer` and gives no `stem.new_plan_due.2`, because period 2 (from 2026-07-01) is outside the card. The screen still lists it under "Your answers, sent with these dates": "Employment period 2 begins inside the STEM OPT EAD dates. Is this period with a new employer? You answered "Yes, a new employer" on Sep 29, 2026." That line is false for the dates entered.
- Rule: point 33, "the screen never shows an answer as standing that the engine did not read".
- Asked for: count an answer as read only when the engine names it (for example, a list of the answers it used in the output, which is a contract change), or show every answer the engine did not ask about again under "Answers Duly did not read".

### 6. Note. Point 28 changes the shipped pack's answer for a program that ended before 2008-04-08

The case of finding 3 gives null windows and talk_to_dso. The rows start on 2008-04-08 because that is the earliest saved document, and their notes say "The rule is older than this start date". This is on the safe side. It still contradicts "With the shipped pack this changes nothing". This is for the founder: either the point or the rows' start dates.

### 7. Note (older than this diff). A STEM card shorter than the rule's months still gets validations after its end

With the STEM card 2026-03-13 to 2026-06-30 (input of finding 5), `upcoming` holds validations 2 to 4 up to 2028-03-27, and `stem.validation_1_due` 2026-09-25 is asked about. None of these falls within the card. Nothing asks about the short card.

### 8. Note. `rule_in_litigation` comes from alternates of null items

In point 27's case with the conflict open, `opt.apply_window_closes`, `opt.latest_start` and `grace.ends` are null, and each still carries an alternate whose value is null. The verdict carries `rule_in_litigation` on that basis. Point 25 speaks of "an item shown" that carries an alternate. A null alternate on a null item gives no second answer.

## The standing checks

- A conclusion about a person or a number from a model: none. No model is called. Finding 1 is a count the engine states on a reading the SPEC forbids.
- Time outside an injected clock: none in the diff. The point 28 lookups use the event's own day. The status reads its clock.
- User data to an outside model: none.
- A quiet verdict on a gap or a conflict: yes, finding 2 (older than the diff).
- A fact assumed and not asked: finding 1 (a post-completion card after yes) and finding 2 (work stopped at the card end).
- Duly's reading shown as the law's words: the point 27 flag is guidance, and its note and the screen line both say the card-end test is Duly's reading. The point 30 quote is verbatim.
- A rule with no primary source: none. SEVP guidance is a secondary agency source and is tagged guidance, as the SPEC asks.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 2 | Points 28 and 30 to 38 give what they say on their cases, checked by hand. Point 27 unanswered is right, but its own case answered yes shows the STEM step next and counts 120 pre-completion days against the 90-day limit (finding 1). The screen shows an unread answer as standing (finding 5) |
| sourced | 4 | Every quote found, both new quotes read in the saved copies, and the literals gate passes. The pack's 2008 start dates make point 28 null out the windows of an older program on the pack's saving date, not the rule's (note 6) |
| never_assumes | 2 | An open period after every card gives no_open_items (finding 2). A card answered yes is taken as post-completion OPT (finding 1) |
| inside_the_boundary | 4 | Copy lint clean. No line says late or missed. The reading is marked. The new judgement item is shown as "Something in what you entered needs an answer" when nothing was entered wrongly (finding 3). Not seen in a browser |
| secure | 4 | No crash found. Fifty periods with 207 answers run in 0.1 s, and 257 answers give 422. The status body breaks its own contract (finding 4) |
| tested | 3 | The reconcile changes name their points and are stricter, apart from one narrower check that point 31 justifies. No test answers point 27 yes and checks what follows. No web test covers `rule_not_in_force_on_event_day`. The status test asserts a field outside the contract |

## Decision

Findings 1 and 2 of the fix 1 review are closed, and points 28 and 30 to 38 work on their cases. Point 27's own case, answered yes, still places the STEM extension next and counts pre-completion days against the post-completion limit. An open period after the last card gives "No open items". Both are blocking, and three lines are below the minimum of 4.

VETO
