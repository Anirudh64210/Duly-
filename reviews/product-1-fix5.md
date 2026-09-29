# Review: product round 1, fix 5

Reviewer: L-review, run l-review-271b0fb1e7, 2026-09-29. I started with no context and edited no code.

Scope: every merge since reviews/product-1-fix4.md (fa1837d..ccfdcbb): the f1 pack's plain words (point 54), engine/f1.py (points 55 and 56), web drafts.ts, labels.ts and Result.tsx (points 55 and 57), and the tests of the round. Checked against specs/product-1/SPEC-resolutions.md points 54 to 57, specs/plain-1/SPEC.md, PRINCIPLES.md, BOUNDARY.md and CLAUDE.md. The commit reviewed is ccfdcbb662f1c5e03f71f0945d20c3cfb5f2d186.

Every case below went through `POST /v1/compute/f1` with TestClient and a FixedClock at 18:00 UTC, time zone America/Los_Angeles, today 2026-09-29 unless a line says otherwise. Each case has `degree_level: master`, `documents_count: 2` and `cpt_full_time_days: 0`, and each period is 40 hours a week and reported, unless a line says otherwise. "Answered in full" means each question was answered yes, with its own `about`, dated today, until none was left. The exceptions are `opt.earlier_at_this_level` and `.new_employer`, answered no, and any answer a line names. The probe scripts are under TMPDIR and were not committed.

## What was run

| Check | Result |
|---|---|
| `uv run pytest tests/unit/engine tests/unit/api tests/unit/assistant tests/unit/support -q` | exit 0 |
| `uv run pytest tests/holdout -q` | exit 0 |
| `python -m tools.sources.plain rulepacks --require f1` | "every plain text is general, calm, readable and grounded" |
| `python -m tools.sources.verify rulepacks` | "4 pack(s) checked, every quote found" |
| `python -m tools.gates.engine_literals` | "every number has a source" |
| `python tools/copy_lint/lint.py` | "copy lint: clean" |
| web vitest on a scratch copy of HEAD under TMPDIR (`--configLoader runner`) | 11 files, 296 tests passed |

Not run: `make test` as a whole, gates 3 and 6, the stack, a browser. I printed the drafts by calling `dsoDraft` and `stemDraft` from a scratch vitest file in the TMPDIR copy, on api outputs. I read the screen components in code and did not see them.

## The findings of reviews/product-1-fix4.md, sent again

- Finding 1 (CPT plain words). Program end 2026-05-15, OPT card 2026-06-01 to 2027-05-31, `cpt_full_time_days` 400, period open from 2026-06-01. `rules` carries both CPT rows: "The rule says a student who has had one year or more of full-time curricular practical training (CPT) cannot have post-completion academic training. Duly reads that term as OPT after study, and one year as 12 months [365 days]. This is how Duly reads the rule, not its exact words." The rule's term is kept and the reading is said in words. Closed.
- Finding 2 (four plain texts). `opt.latest_start_after_days` no longer adds the next sentence. Closed. `stem.validation_interval_months` no longer says short. Closed. `grace.after_completion_days` (30) now names all three starting points, but it swaps a term (finding 1 below). `stem.min_hours_per_week` now keeps the limit on leave, but it swaps "U.S. workers" (finding 1 below). Two of the four are closed, and the other two now carry a new fault.
- Finding 3 (status in the drafts). Program end 2005-05-15, card 2005-06-01 to 2006-05-31, period 2005-06-01 to 2006-05-31, answered in full: talk_to_dso `rule_not_in_force_on_event_day`. The draft opens "I have a question about my F-1 record." No draft of the 17 below says "I am". Closed.
- Finding 4 (new Form I-983 not made). Program end 2025-02-15, OPT card 2025-03-13 to 2026-03-12, STEM card 2026-03-13 to 2028-03-12, periods 2025-03-13 to 2026-06-30 and 2026-07-01 open, `employment.2.new_employer` yes, `stem.new_plan_due.2.made` no. talk_to_dso `stem.new_plan_due.2.not_made`. The draft says "I did not submit my new Form I-983 for employment period 2." Closed, but see finding 4 below.
- Finding 5 (null alternates). Point 27's case (program end 2026-05-22, rec 2025-12-01, filed 2025-12-10, card 2026-01-15 to 2026-05-14, no employment) unanswered: no item carries an alternate. `CourtLine` (Result.tsx line 204) drops null alternates and returns nothing when none is left. Closed; the screen part was read in code.
- Finding 6 (past clock). The OPT case (card 2026-06-01 to 2027-05-31, period open) with the clock at 2016-10-01, 2024-09-01, 2025-05-18 and 2025-05-19 gives 200 and cannot_tell with questions. Closed for those clocks. Other clocks still give a 500 (finding 2 below).
- Finding 7 (hours draft). Period from 2026-06-01 at 10 hours a week, answered in full: "Could you tell me how your office reads my weeks at 10 hours a week?" With periods at 10 and 15.5: "my weeks at 10 and 15.5 hours a week". No comparison. Closed.

## Points 55 to 57, each sent through the api

| Point | Input | What happens | Hand check |
|---|---|---|---|
| 55 | point 27's case unanswered, and answered in full | no alternate on any item; talk_to_dso `opt.ead_end.not_after_program_end` answered | |
| 56 | OPT card 2024-06-01 to 2025-05-31, period from 2024-06-01 ending 2025-05-18, end answered not reported | `employment.1.end_report_by` null, talk_to_dso `rule_not_in_force_on_event_day` | row starts 2025-05-19 |
| 56 | the same, ending 2025-05-19 / 2025-05-20 | 2025-05-29 / 2025-05-30, needs_you `report_employer` | +10 days |
| 56 | the OPT case above, clock on each 15 January and 15 June from 1990 to 2026 | 200 from 2003 on; 500 before 2003 | finding 2 |
| 56 | STEM case (program end 2025-02-15, OPT card 2025-03-13 to 2026-03-12, STEM card 2026-03-13 to 2028-03-12, period open), clock every 5 days 2002 to 2026 | 500 on every clock before 2016-05-10 | finding 2 |
| 56 | program end 2015-05-15, card 2015-06-01 to 2016-05-31, period 2015-06-01 to 2016-05-31 with `employer_reported` false | needs_you `report_employer`, `employment.periods_not_reported` 1 from `opt.report_employer_within_days` | finding 3 |
| 57 | every draft below | opening fixed, new plan named, hours as entered | |

## Every plain text beside its quote

I printed all 53 rows and both regimes with quote, note and plain side by side and read each. These pass: both regimes and every row not named here or in finding 1. The CPT rows now keep "post-completion academic training" and mark the reading. Each reading row says it is Duly's reading. No plain text speaks to "you" or gives an instruction.

These do not pass (finding 1):
- `stem.min_hours_per_week` (one of the texts point 54 names): the quote's "the employer's similarly situated U.S. workers" becomes "the employer's similarly situated workers in the United States". A U.S. worker and a worker in the United States are not the same class. The saved text uses "similarly situated U.S. workers" as its own term three times in (f)(10)(ii)(C)(8), and the pack's own `stem.requires.duties_hours_and_compensation` keeps "U.S. workers".
- `stem.requires.employer_attests_no_replacement`: "will not replace a ... U.S. worker" becomes "a ... worker in the United States". It is the same swap.
- `capgap.end_month_day` (from 2025-01-17): the quote limits the extension to "an H-1B petition subject to section 214(g)(1)(A) of the Act". The plain words say "an F-1 student with an H-1B petition to change status" and drop that limit, so they say more than the quote. The last sentence, "if the petition meets the terms the rule lists", points at the conditions after the colon, not at this one.
- `stem.requires.previously_obtained_degree`: the quote says "conferred from a U.S. educational institution that is accredited and SEVP-certified". The plain words say "that degree's school must be accredited and SEVP-certified" and drop "U.S.". The text before this round had "school in the United States".
- `stem.requires.accreditation`: "an accrediting agency recognized by the Department of Education at the time of application" becomes "A group the Department of Education accepts at the time of application has accredited it". Recognized becomes accepts. The plain words also tie "at the time of application" to the recognition and leave "has accredited" with no time, which settles the quote's open reading one way. The row's reading mark covers only "as one of the listed requirements".
- `grace.after_completion_days` (30, paused, one of the texts point 54 names): "the 4 year maximum period of admission" becomes "the 4 year maximum stay". Period of admission is the rule's term, and the paused regime's own plain words use it ("a fixed period of admission").

Notes, not vetoed on their own:
- `stem.new_plan_due_days`: "A student may begin training with a new employer during the 24-month extension." The quote begins "If a student initiates"; it states a condition, not a permission.
- `grace.after_completion_days` (60): "or to transfer" drops "in accordance with paragraph (f)(8)", and "any authorized practical training" becomes "any approved training".

## Every DSO draft the screen can build

I built a talk_to_dso output for every reason in `ASKS` except `report_employer` (the engine gives that one as needs_you), for `hours_under_threshold`, for two reports answered not made (validation 1 and the new plan), for three conflicts answered yes (point 27, point 43, and a STEM card after a card ending before the program end), for the 2005 case and for the STEM step draft. That is 17 drafts. Each opens "I have a question about my F-1 record.", is in the first person and ends "Thank you," and "[Your name]". None has the word Duly, a computed date, the words "I am", or a comparison with a rule. "I did not submit", "I used OPT before", "I did not have a period of post-completion OPT" and "I did not have a period of OPT or STEM OPT" each repeat an answer the student gave (engine/f1.py lines 1630 to 1639 add those reasons only on the answer). Two are wanting: finding 4 and note 5.

## Tests changed in this round

tests/unit/engine/test_f1_fixes.py: `assert "grace.ends" in found` became `("grace.ends" in found) == (grace.ends is not None)`, and the latest start the same way, marked point 55, with a new assertion that no alternate is null. That follows point 55 and loosens nothing else. labels.test.ts adds the new plan's name. drafts.test.ts adds the opening, the names and the hours. No assertion is loosened without a point.

## Findings

### 1. Blocking. Six plain texts swap or drop the rule's own terms

- File: rulepacks/f1-us/v2026.09/parameters.yaml, field `plain` of `stem.min_hours_per_week`, `stem.requires.employer_attests_no_replacement`, `capgap.end_month_day` (2025-01-17), `stem.requires.previously_obtained_degree`, `stem.requires.accreditation` and `grace.after_completion_days` (30).
- Input: program end 2025-05-15, OPT card 2025-06-01 to 2026-05-31 (rec 2025-04-01, filed 2025-04-10), period open from 2025-06-01, cap-gap petition filed 2026-04-01, start 2026-10-01, pending, change of status, answered in full. The output is talk_to_dso `grace_with_cap_gap`, and `rules` carries `capgap.end_month_day`, `stem.requires.accreditation`, `stem.requires.previously_obtained_degree` and `stem.requires.employer_attests_no_replacement` with the words above. The STEM case (program end 2025-02-15, OPT card 2025-03-13 to 2026-03-12, STEM card 2026-03-13 to 2028-03-12, period open, answered in full) carries `stem.min_hours_per_week`. The paused 30-day row is in the pack and not in `rules` today.
- What happens: each is listed in the section above. Two turn "U.S. worker" into "worker in the United States". One drops the cap-subject limit. One drops "U.S.". One turns "recognized" into "accepts" and moves "at the time of application". One turns "period of admission" into "stay". None is marked as Duly's reading. The plain gate passes all six, because it checks numbers, words and grade, not meaning.
- Rule: point 54: "the plain words use the rule's word ... nothing is added from outside the quote and nothing the quote limits is dropped". Plain-1 section 1. The mission says to veto any plain text that says more, less or other than its quote.
- Asked for: L-content keeps "U.S. worker(s)", "subject to section 214(g)(1)(A) of the Act" (for example "an H-1B petition under the annual cap, section 214(g)(1)(A)"), "U.S. educational institution", "recognized", the time of application as the quote places it, and "period of admission".

### 2. Should fix. Some clocks still make the engine fail with a 500

- File: engine/f1.py `_rule` line 361, reached from `whole_rule` line 293 through `_judgement_items` line 1403 (`cpt.full_time_bar_days`) and through `whole_rule(interval)` line 837 (`stem.validation_interval_months`).
- Input: the STEM case above with the clock at 2016-05-09, or program end 2012-02-15, OPT card 2012-03-13 to 2013-03-12, STEM card 2013-03-13 to 2014-07-12 with the clock at 2014-01-15: 500 `RulepackError: stem.validation_interval_months: no rule in force on ...`. The OPT case above with the clock at 2002-12-31: 500 `cpt.full_time_bar_days: no rule in force on 2002-12-31`. With `cpt_full_time_days` null the same clock gives 200.
- What happens: point 56 fixed the report row, but other rules are still looked up only for the clock's day and raise when the pack has no row on it. A scan every 5 days from 2002 to 2026 found 1049 failing clocks for each STEM case and 73 for the OPT case, all before 2016-05-10 or 2003-01-01.
- Rule: point 56: "never an error: no clock and no case makes the engine fail". The SystemClock never gives such a day, so no person reaches it today. A replay or a test with a past clock does.
- Asked for: `whole_rule`, `value_of` and `show` give null with the step back when no row is in force, as `_row_shown` does. The property of test_holdout_fix5.py line 273 draws clocks from 2009 on and OPT cases only, so it cannot catch this.

### 3. Should fix. The count of unreported periods reads a 2025 guidance row for a 2015 period

- File: engine/f1.py `_add_counts`, the `employment.periods_not_reported` item (line 817), with `_open_items` line 1422.
- Input: program end 2015-05-15, OPT card 2015-06-01 to 2016-05-31, period 2015-06-01 to 2016-05-31 with `employer_reported` false, answered in full, today 2026-09-29.
- What happens: needs_you `report_employer`. The item `employment.periods_not_reported` has value 1 and `rule_ids` `["opt.report_employer_within_days"]`, whose row starts 2025-05-19 (SEVP page, last updated 2025-05-19). The end date of the same period is looked up for its day and steps back (point 56). The count is not.
- Rule: point 56: "Every rule is looked up for the day of the event it governs". Point 28: Duly never measures from a rule that took effect after the event.
- Asked for: look up the count's rule for each period's start. With no row in force, give null with `rule_not_in_force_on_event_day`, as the end report does.

### 4. Should fix. The new-plan draft names "employment period 2" but gives no dates for it

- File: web/src/lib/drafts.ts `askFor`, the `not_made` branch, which sets `topics: ["stem"]`.
- Input: the case of fix 4 finding 4 above.
- What happens: the draft gives only the STEM card lines, then "I did not submit my new Form I-983 for employment period 2." The periods the student entered are not in the draft, so the DSO cannot tell which period is meant. `stem.concluding_evaluation_due.<n>` gets the same.
- Rule: plain-1 section 4, a draft is "built from the facts behind its reasons".
- Asked for: add "employment" to the topics when the report names a period.

### 5. Note. The cap-gap grace draft says "my cap-gap period"

Program end 2025-05-15, card 2025-06-01 to 2026-05-31, period open, cap-gap pending (the finding 1 case): "Could you tell me what comes after my cap-gap period, and whether a grace period follows it?" The student entered a pending petition, not a cap-gap period. Whether the petition gives one is the engine's reading. Plain-1 section 4 says a draft never characterises the student's status. "What comes after my petition's requested start date" would state only what was entered.

## The standing checks

- A conclusion about a person: none in the engine; the draft wording in note 5.
- A number or date from a model: none. No model is called.
- Time read outside an injected clock: none.
- User data to an outside model: none.
- A quiet verdict on a gap or a conflict: none found. Point 27 and point 43 answered each way still ask or step back.
- A fact assumed and not asked: none found.
- Duly's reading shown as the law's words: finding 1. Six texts change the rule's terms without a reading mark.
- A rule with no primary source: none. Every quote is found and the numbers have sources.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 3 | Points 55 and 57 do what they say on their cases and beside them. Point 56 dates the report for its end, checked by hand at 2025-05-18/19/20. But a clock before 2016-05-10 with a STEM card, or before 2003 with CPT days, still gives a 500, which point 56 rules out (finding 2), and the unreported count still reads a 2025 row for a 2015 period (finding 3) |
| sourced | 2 | Every quote is found. The CPT texts are fixed. But six plain texts, five of them in outputs today, swap or drop terms of their quotes (finding 1). Two of those are texts point 54 asked to rewrite |
| never_assumes | 5 | Point 27, 39 and 43 answered each way, periods after the card, reports not made, cap-gap alone and denied. Each gap is a question or a step back |
| inside_the_boundary | 4 | The status opening is gone from every draft, and no draft has a comparison or the word Duly. "My cap-gap period" still states the engine's reading (note 5) |
| secure | 4 | No crash with a real clock and no 422 or 500 on any case sent today. A past clock gives a 500 (finding 2) |
| tested | 3 | The new tests catch point 55 and the report row, and the draft tests catch the opening and the names. None would fail on finding 1, 2 or 4: the plain gate checks no meaning, and the clock property starts in 2009 with OPT cases only |

## Decision

Fix 4's findings on the CPT texts, the drafts' status line, the new plan, null alternates and the hours draft are closed. The plain words still fail the test this round was for: six texts say more or other than their quotes, two of them texts point 54 named. Sourced is 2 and correct and tested are 3, below the minimum of 4, and the mean is 3.5.

VETO
