# Review: phase 2, second review

Reviewer: L-review, 2026-09-29. Fresh context. No code was edited.

Scope: `git diff main...HEAD` (135 files) against specs/phase-2/SPEC.md, SPEC-sourcing.md, SPEC-fixes.md and SPEC-context.md, PRINCIPLES.md, BOUNDARY.md, DECISIONS.md, and the hard rules in CLAUDE.md. tests/holdout/ was run with `--tb=no` and not read.

Every input below was sent through `POST /v1/compute/f1` with TestClient, or through `compute_f1` with the real pack, with a FixedClock. Unless a line says otherwise the clock is 2026-09-28 18:00 UTC and the time zone is America/Los_Angeles, so today is 2026-09-28.

## What was run

| Check | Result |
|---|---|
| `uv run pytest tests/unit -q` | pass, exit 0 |
| `uv run pytest tests/holdout -q --tb=no` | pass, exit 0 |
| `uv run python -m tools.sources.verify rulepacks` | pass: "sources: 4 pack(s) checked, every quote found" |
| `uv run python -m tools.gates.engine_literals` | pass: "engine literals: every number has a source". It failed in the first review |
| `uv run mypy`, `uv run ruff check .`, copy lint | pass: "no issues found in 34 source files", "All checks passed!", "copy lint: clean" |
| `npm test` | pass: 131 web tests, 4 ops tests |
| Three of the new quotes searched by hand in ecfr-8cfr214.2-2026-09-14.xml | each found once: (f)(11)(i)(D) on the start date, the first sentence of (f)(10)(ii)(C), and "within 12 months of the approved starting date" |
| Guarded paths in the diff (contracts/, tools/gates/, tools/copy_lint/, .claude/, DECISIONS.md) | every commit that touches them is a founder commit (d30e23c, 207a162, 082326c, 8f92f1b, 384dae2, 371e59c, 02da54a, 723537c, 6cd0f54). No lane merge touches them |

Not run: `make test` as a whole, and gates 3 and 6, because this worktree holds every lane and the base would be wrong. The stack was not started and the screen was not opened in a browser. The screen findings below come from reading web/src and from its tests.

## The thirteen dates from the first review

Same case, real pack, today 2026-09-28. All thirteen values match the hand arithmetic of the first review: 2024-02-17, 2024-07-16 (alternate 2024-06-16), 2024-04-03, 2025-07-17, 2027-08-29 (alternate 2027-07-30), 2025-04-01, 2025-06-09, 2026-01-15, 2026-07-16, 2027-07-16, 2026-07-11, 2026-10-01, and 42 days. The arithmetic was not done again by hand. The engine's values were compared with the values worked out by hand on 2026-09-28.

## The findings of the first review

| # | First review | Input sent again | What happens now | State |
|---|---|---|---|---|
| 1 | STEM without OPT gave the quiet verdict | The same case, with `time_zone` added | `cannot_tell`, reason `unconfirmed:held_post_completion_opt`, one question. With the answer yes: `cannot_tell`, `missing:opt.ead_start`, `missing:opt.ead_end`. With the answer no: `talk_to_dso`, `stem_without_post_completion_opt`, and `stem.requires_post_completion_opt` is in `rules`, marked a reading. No count is given in any of the three | Closed |
| 2 | NaN accepted as hours | `NaN`, `Infinity`, `-Infinity` and `1e999` as `hours_per_week` | 422 each time: "The body holds a number that is not a number. NaN, Infinity and numbers too large to hold are not read." `parse_case` refuses them too (engine/f1.py line 123) | Closed |
| 3 | Sourcing addendum not done | The literals gate; one period with `employer_reported: false`; `cpt_full_time_days: 365`; a STEM case | The gate passes. `employment.periods_not_reported` names `opt.report_employer_within_days`. The CPT item names `cpt.full_time_months_bar` and `cpt.full_time_bar_days`, both marked readings, status school. Each validation item names `calendar.federal_holidays_law`. All five ids are in the pack. Items list `duly_settings` | Closed. See new finding 3 for the words the screen puts on the 365 |
| 4 | One request held the api, far dates gave 500 | `9999-12-01`, `0001-01-15`, `2100-01-01`, `1949-12-31`; 51 periods; the widest case the contract allows (OPT 1950-01-01 to 2098-12-31, 50 periods) | 422 for each date and for 51 periods. The widest case answers in 0.003 seconds. The handler is a plain `def`. Counting is by intervals (engine/f1.py `_pieces`) | Closed |
| 5 | Two items showed a paragraph that does not state them | Any case with OPT and STEM | `opt.latest_start` names `opt.latest_start_after_days`, quote from (f)(11)(i)(D), a row under each regime (60 and 30). `stem.apply_window_closes` names `stem.apply_window_closes_rule`, marked a reading with a note that says the source names no date. The final evaluation is `stem.final_evaluation_due_from_ead_end` | Closed. See new finding 2 for how the reading is shown on the row |
| 6 | The day changed at midnight UTC | Clock at 2026-09-29 01:30 UTC, OPT from 2026-09-01, no employment, answer yes to `no_employment_to_record` | America/Los_Angeles: today 2026-09-28, 28 days. Asia/Kolkata: today 2026-09-29, 29 days. `Mars/Olympus` and `america/los_angeles`: 422 in plain words. No zone: 422, "time_zone is missing". D33 decided it | Closed |
| 7 | The screen wrote "in effect" on its own | The real pack with ds_2012 changed to `appealed` in memory | Each item with alternates carries `operative: {regime: ds_2012, legal_status: appealed}`. Result.tsx reads `item.operative.legal_status` and holds no status of its own. With none given it writes "status not given" | Closed |
| 8 | Note on the litigated flag | | Unchanged. No regime row moves a date before `final_end` | Stands as a note |
| 9 | Note on guarded files | | See "What was run" | Stands as a note |

All seven findings are closed.

## The five standing checks

1. Conclusion about a user, or a number from a model: no model is called anywhere in the diff. One line of copy says more than the source does. Finding 3.
2. Time read outside an injected clock: none. `datetime.now` appears once, in engine/clocks.py. The engine calls `day_in_zone(clock, zone)` and never `clock.today()`. The screen takes the day of an answer from the engine's `today`, not from the browser. `/v1/status` still calls `decide` without a day, which reads `clock.today()` in UTC. It holds no person's case.
3. User data to an outside model provider: none. No network client in engine/ or api/.
4. Verdict falling back to the quiet state: yes, on records whose facts do not fit. Finding 1.
5. Primary source on every rule: every rule has one, every quote is in its saved copy, every rule is marked verbatim or reading.

## New findings

### 1. Blocking. Facts that do not fit get the quiet verdict, and nobody is asked

- File: engine/f1.py lines 668 to 691 (`_conflicts`). `petition_filed_on` and `i765_filed_date` are read nowhere for fit. `opt.max_months` and the 24 months of `stem.extension_months` are never compared with the dates entered. The days between two EADs are counted as if they were inside one.
- Rule broken: CLAUDE.md, "A verdict never falls back to the quiet state. Missing, stale, conflicting, or litigated means cannot_tell", and "A gap or a conflict in a person's record becomes a question to that person, and the verdict is cannot_tell until they answer." PRINCIPLES.md section 2.
- Every input below has `degree_level: master`, `documents_count: 2`, and one open employment period at 40 hours, reported, from the OPT start date unless stated. Each returns 200 with `{"state": "no_open_items", "reasons": []}` and no question. The one exception is named in the last row.

| Input | What does not fit |
|---|---|
| Program end 2025-09-15. OPT EAD 2025-11-01 to 2026-10-31, `i765_filed_date: 2030-01-01` | The filing is dated more than three years after today and after the EAD it led to. Under D32 this date also decides whether the recommendation date still matters, so a date nobody checked changes the verdict |
| The same OPT, with `cap_gap: {petition_filed_on: 2027-03-01, requested_start: 2026-10-01, change_of_status: true, status: approved}` | A petition marked approved, filed five months after today and after its own requested start. `capgap.ends` is shown as 2026-10-01 |
| The same OPT, with `petition_filed_on: 2020-01-01, requested_start: 2020-10-01`, approved | `capgap.ends` is 2020-10-01, five years before the OPT began |
| Program end 2023-09-15. OPT 2023-11-01 to 2024-10-31. STEM EAD 2024-11-01 to 2029-10-31 | A STEM EAD of five years. The pack holds 24 months. Four validation dates are shown, then nothing for three years, and `grace.ends` is 2029-12-30 |
| Program end 2025-09-15. OPT EAD 2025-11-01 to 2028-10-31 | An OPT EAD of three years. The pack holds `opt.max_months` 12 and the engine never reads it |
| Program end 2024-09-15. OPT 2024-11-01 to 2025-10-31. STEM 2026-03-01 to 2028-02-29. One open period from 2024-11-01 | Four months between the two EADs. The days in between are counted as employed, `unemployment.days_used` is 0. With employment that stops at the OPT end and starts again at the STEM start, a 92 day hole (OPT to 2025-06-30, STEM from 2025-10-01) gives `days_used` 92, all of it outside both EADs. That second case returns `needs_you` for an evaluation date, not the quiet verdict, and still asks nothing about the hole |

- Why it matters: each of these is most likely a typing mistake, which is the same reason the engine already reports `opt_start` as a conflict. Here the mistake is carried into dates and counts and the verdict says there is nothing open. Duly cannot say what the right dates are, and under BOUNDARY.md it may not say what a long EAD means. It can say that two dates entered do not fit and ask.
- Asked for: a conflict or a question for each: a date of something recorded as done that is after today; a petition filed after its requested start; an EAD longer than the pack's months for that part; days between the OPT EAD end and the STEM EAD start. The SPEC list of conflicting inputs does not hold these, so the SPEC needs the lines first. This is a gap in the SPEC more than a fault of the engine lane, which built what the SPEC lists.

### 2. Should fix. A date that is Duly's reading is shown on the row and in the verdict with no mark

- File: web/src/components/Result.tsx from line 134 (`ItemRow`) and web/src/lib/labels.ts `reasonText`.
- Input: any case with OPT and STEM. For the verdict line: program end 2025-08-15, OPT 2025-10-05 to 2026-10-04, STEM 2026-10-05 to 2028-10-04, one open period at 40 hours. The engine returns `needs_you` with the reason `stem.apply_window_closes`.
- What happens, read from the code and not seen in a browser: the row reads "STEM OPT filing window closes" with a date and no tag, because the item's status is settled. The verdict reads "One thing needs you" and "STEM OPT filing window closes: Oct 4, 2026." The tag "Duly's reading" appears only after the row is opened. The pack's own note says the source names no date and that the window can close later than the EAD end.
- The same holds for `capgap.ends` (the fiscal year is a reading) and for the four validation dates (the holiday list is a reading).
- Rule: PRINCIPLES.md section 1, "A reading is marked as a reading everywhere it is shown". SPEC-context section 5 asks only for the rule card, and the rule card does it well: the quoted words, then the note under "Duly's reading of the quoted words, not the words of the source".
- Asked for: the engine output says on each item whether any rule it used is a reading, and the row and the verdict line carry the mark. Contract change.

### 3. Should fix. The screen calls 365 "the number in the rule"

- File: web/src/lib/labels.ts, FINDINGS, `cpt_full_time_at_or_over_bar`: "The full-time CPT days entered are at or over the number in the rule."
- Input: `cpt_full_time_days: 365`. Verdict `talk_to_dso`, and this line is shown under it.
- What happens: the pack's note on `cpt.full_time_bar_days` says "365 appears nowhere in the source". The rule says "one year or more". The line under the verdict gives Duly's count in days as the rule's number.
- Also: the row carries the tag "School policy". No school's page is cited. The source is the regulation and the value is Duly's reading of it. SPEC-sourcing asked for the tag, so this part is for the founder: D3 says a school rule cites that school's page.
- Asked for: words that say whose number it is, for example that the days entered are at or over Duly's count of one year in days.

### 4. Should fix. Full-time CPT days are taken as 0 when nobody said so

- File: engine/f1.py line 141, `raw.get("cpt_full_time_days", 0)`; contracts/case_f1.schema.json, `default: 0`; web/src/lib/caseForm.ts, EMPTY_CASE `cpt_full_time_days: "0"`.
- Input: `{"program_end_date":"2026-12-15","degree_level":"master","documents_count":2,"employment":[],"time_zone":"America/Los_Angeles"}`.
- What happens: `no_open_items`. The item `cpt.full_time_days_used` is 0 and its inputs show `cpt_full_time_days: 0`. The screen names it "Full-time CPT days entered". Nothing was entered.
- Rule: PRINCIPLES.md section 2, "Duly does not assume a person did something, or did not."
- The same case shows a second thing. OPT, STEM and cap-gap are all absent and the verdict is quiet. SPEC-context section 4 says no case with an absent part gives `no_open_items` without the part's dates or a confirmation. The unit test for that property (tests/unit/engine/test_f1_context.py line 913) checks only STEM without OPT and cap-gap alone. A student still in the program with nothing else to enter may be the case the founder means to allow. It needs a line in the SPEC either way.
- Asked for: the field is nullable, absent is shown as not entered, and the engine asks.

### 5. Should fix. The day of an answer is never read

- File: engine/f1.py lines 648 to 655 (`_answer`) and 162 to 165.
- Input: OPT EAD 2026-07-10 to 2027-07-09, no employment, `confirmations: {"no_employment_to_record": {"answer": true, "on": "X"}}`.
- What happens: for X of 2026-07-11, 1950-01-01 and 2099-12-31 alike: `no_open_items`, `days_used` 81, `days_remaining` 9. An answer given on the second day of OPT is taken to cover the eighty days after it. An answer dated before the OPT began, or seventy years from now, is taken too.
- Second input: the same answer, then `opt.ead_start` changed to 2026-07-01. The answer is kept and `days_used` becomes 90. The person answered about a different start date. The screen does the same: App.tsx `change` keeps `confirmations` when a field changes.
- Today the screen always sends the day of the last computation, so this is reached only through the api or a page left open overnight. It must be closed before anything is stored. PRINCIPLES.md section 3.
- Asked for: an answer dated after today is refused; an answer to a question about a span of days is open again when today has moved past the day it was given, or when an input named in `because` has changed.

### 6. Should fix. A filing window is an open item after the filing and the EAD are recorded

- File: engine/f1.py lines 708 to 716 (`_open_items`).
- Input: program end 2026-08-10, OPT with recommendation 2026-07-01, `i765_filed_date` 2026-07-05, EAD 2026-09-01 to 2027-08-31, one open period at 40 hours from 2026-09-01.
- What happens: `needs_you`, reason `opt.apply_window_closes`. The screen reads "One thing needs you" and "OPT filing window closes: Oct 9, 2026", for a person whose card is already in hand.
- Rule: PRINCIPLES.md section 3, "A date matters only while it can still matter." SPEC-context section 3 applies this to missing inputs only.
- Asked for: the table in section 3 gains the dated items, and an item whose filing is recorded is not listed as open.

### 7. Note. Employment entered with no OPT is answered with "Duly needs the OPT dates"

Input: no OPT, no STEM, one employment period. `cannot_tell`, `missing:opt`. The verdict is right. The words take it that OPT exists, where the other three gaps ask. A fourth question would fit.

### 8. Note. What the verbatim check cannot see

- tools/sources/verify.py line 101: a flag always counts as written, so a flag marked verbatim passes unread. All three flags in the real pack are marked readings, which is right. The test pack marks `stem.requires_post_completion_opt` verbatim (test_f1_context.py, last test), which disagrees with the real pack.
- `stem.evaluation_interval_months` is verbatim because "12" is in its quote. Its note says the regulation states no repeating interval. The date of `stem.evaluation_12_month_due` joins two quotes: twelve months from the start, then ten days after "the conclusion of the reporting period". That the reporting period ends at twelve months is Duly's reading, and no rule says so. Formulas that join rules have no derivation of their own.
- 8 CFR 274a.12(c)(3)(i)(B) is named in two quotes and was not saved or read. The pack says so.

## What is good

- Every finding of the first review is closed, each with the input that showed it.
- The content lane reported what the source does not say: no closing date for the STEM window, no number of days for one year, no interval for the evaluation, no definition of business days. Each is a reading with a note in plain words.
- Until a question is answered the engine does not name the part as missing, since that would be a guess that the part exists.
- The screen never reads the clock. An answer carries the engine's day.
- The refusals carry nothing the person sent.

## Requests for files I do not own

Recorded in reviews/PROGRESS.md: SPEC lines for facts that do not fit and for dated items that have stopped mattering; a contract field that marks an item as resting on a reading; `cpt_full_time_days` nullable; tests for each input in findings 1, 4, 5 and 6.

## Decision

The work asked for by the three addenda is done and checked. Finding 1 is a hard rule broken on inputs that a slip of the hand produces: a record whose dates contradict each other gets "No open items" and no question. Findings 2 to 6 should be fixed and do not block on their own.

VETO
