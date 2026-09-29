# Review: phase 2

Reviewer: L-review, 2026-09-28. Fresh context. No code was edited.

Scope: `git diff main...HEAD` (85 files) against specs/phase-2/SPEC.md, specs/phase-2/SPEC-sourcing.md, BOUNDARY.md, DECISIONS.md, and the hard rules in CLAUDE.md. tests/holdout/ was run but not read.

## What was run

| Check | Result |
|---|---|
| `uv run pytest tests/unit -q` | pass |
| `uv run pytest tests/holdout -q --tb=no` | pass |
| `uv run python -m tools.sources.verify rulepacks` | pass: "4 pack(s) checked, every quote found" |
| `uv run python -m tools.gates.engine_literals` | FAIL: 6 numbers with no source (f1.py lines 22, 23, 24, 25, 26, 28) |
| `uv run mypy`, `uv run ruff check .`, copy lint | pass |
| `npm test` | pass: 72 web tests, 4 ops tests |
| `uv run python -m tools.diff_policy.check --base main` | fails in this worktree only because the base is main and the branch holds every lane of the phase. Not a finding against the code |
| sha256 of five saved sources against parameters.yaml | all five match |

## Dates checked by hand

Case: program end 2024-05-17; OPT recommendation 2024-03-04, EAD 2024-07-01 to 2025-06-30; STEM recommendation 2025-04-10, EAD 2025-07-01 to 2027-06-30; one employment period from 2024-08-12, open, 40 hours; cap-gap petition pending, change of status, requested start 2026-10-01. Real pack, FixedClock at 2026-09-28.

Each rule's words were read in the saved copy (ecfr-8cfr214.2-2026-09-14.xml, and the 2026-09-15 copy for the blocked regime), then the arithmetic was done by hand.

| # | Item | Words in the saved source | By hand | Engine |
|---|---|---|---|---|
| 1 | opt.apply_window_opens | "up to 90 days prior to his or her program end date", (f)(11)(i)(B)(2) | May 17 back 17 is Apr 30, back 30 is Mar 31, back 31 is Feb 29 (leap year), back 12 is Feb 17 | 2024-02-17, match |
| 2 | opt.apply_window_closes | "no later than 60 days after his or her program end date"; 09-15 copy says 30 | May 31 is 14, Jun 30 is 44, Jul 16 is 60. Blocked regime: Jun 16 | 2024-07-16, alternate 2024-06-16, match |
| 3 | opt.file_by | "within 30 days of the date the DSO enters the recommendation" | Mar 4 plus 27 is Mar 31, plus 3 is Apr 3 | 2024-04-03, match |
| 4 | opt.complete_by | "within a 14-month period following the completion of study" | 2024-05 plus 14 months | 2025-07-17, match |
| 5 | grace.ends | 09-14 copy, (f)(5)(iv): "an additional 60-day period"; 09-15 copy, (f)(5)(v): "an additional 30-day period" | Jun 30 plus 31 is Jul 31, plus 29 is Aug 29. Blocked regime: Jul 30 | 2027-08-29, alternate 2027-07-30, match |
| 6 | stem.apply_window_opens | "up to 90 days prior to the expiration date of the student's current OPT employment authorization" | Jun 30 back 30 is May 31, back 31 is Apr 30, back 29 is Apr 1 | 2025-04-01, match |
| 7 | stem.file_by | "within 60 days of the date the DSO enters the recommendation for the OPT extension" | Apr 10 plus 20 is Apr 30, plus 31 is May 31, plus 9 is Jun 9 | 2025-06-09, match |
| 8 | stem.validation_1_due | "every six months" and "within 10 business days of each reporting date", (f)(12)(ii)(B) | Reporting date 2026-01-01, a Thursday holiday. Jan 2 is 1, Jan 5 to 9 are 2 to 6, Jan 12 to 15 are 7 to 10 | 2026-01-15, match |
| 9 | stem.validation_2_due | same | Reporting date 2026-07-01. Jul 2 is 1. Jul 3 is the observed holiday, since Jul 4 is a Saturday. Jul 6 to 10 are 2 to 6, Jul 13 to 16 are 7 to 10 | 2026-07-16, match |
| 10 | stem.validation_4_due | same | Reporting date 2027-07-01. Jul 2 is 1. Jul 5 is the observed holiday, since Jul 4 is a Sunday. Jul 6 to 9 are 2 to 5, Jul 12 to 16 are 6 to 10 | 2027-07-16, match |
| 11 | stem.evaluation_12_month_due | "no later than 10 days following the conclusion of the reporting period" | 2026-07-01 plus 10 | 2026-07-11, match |
| 12 | capgap.ends | "until April 1 of the fiscal year for which such H-1B status is being requested or until the validity start date of the approved petition, whichever is earlier" | Requested start 2026-10-01 is in fiscal year 2027, whose April 1 is 2027-04-01. The earlier is 2026-10-01 | 2026-10-01, match |
| 13 | unemployment.days_used | count | 2024-07-01 through 2024-08-11 is 31 plus 11 | 42, match |

Thirteen of thirteen match. The arithmetic is sound. The findings below are about what happens around it.

## The five standing checks

1. Conclusion about a user, or a number from a model: none found. No model is called anywhere in the diff. Item names and reason lines in web/src/lib/labels.ts state what an item is. See finding 7 for one hard-coded legal status.
2. Time read outside an injected clock: none in engine/, api/, or web/src. `formatDate` builds dates from the engine's text only. dashboard/ui.html line 318 reads the clock, but it is a developer tool and shows nothing to a user. See finding 6 for the day boundary.
3. User data to an outside model provider: none. No network client in engine/ or api/. The web posts only to /api/v1/compute/f1.
4. Verdict falling back to the quiet state: two inputs do this. Findings 1 and 2.
5. Primary source on every rule: every rule in the pack has one and every quote is in its saved copy. But three computed items show a source that does not state what the item says, and six numbers in the engine have no source at all. Findings 3 and 5.

## Findings

### 1. Blocking. STEM entered without OPT gives the quiet verdict and no unemployment count

- File: engine/f1.py lines 560 to 562 and 401 to 420.
- Input: `{"program_end_date":"2026-05-15","degree_level":"master","documents_count":2,"employment":[],"stem":{"dso_recommendation_date":"2026-04-01","i765_filed_date":null,"ead_start":"2026-06-01","ead_end":"2028-05-31"}}`, clock at 2026-09-28.
- What happens: 200, verdict `no_open_items`, no reasons. No unemployment item, no employment item, and no STEM filing window item is returned. With an empty employment list, about 120 days have passed since the STEM start with no employment period, and nothing counts them.
- Why it matters: the counting window starts at opt.ead_start, so with no OPT block the window cannot be known. That is a missing input. CLAUDE.md: missing means cannot_tell. DECISIONS.md D4: never falls back to green.
- Asked for: when stem is present and opt is absent, name the missing OPT dates in missing_inputs. The SPEC's list of missing inputs does not cover this case, so the SPEC needs the line too.

### 2. Blocking. NaN is accepted as hours per week and counts as employed

- File: api/main.py line 85 (`json.loads` accepts the bare token NaN), then engine/f1.py line 268.
- Input: a valid case with OPT from 2026-06-01, one open employment period from 2026-06-01, and the body text `"hours_per_week": NaN`.
- What happens: 200, verdict `no_open_items`, days_used 0, days_under_hours 0. The schema's minimum and maximum both pass because every comparison with NaN is false. In the engine `max(hours) < threshold` is false, so every day counts as employed at or above the threshold.
- Asked for: refuse NaN and Infinity at the door, for example `json.loads(..., parse_constant=...)` that raises, returning the 422.

### 3. Blocking. The sourcing addendum is on this branch and not done

specs/phase-2/SPEC-sourcing.md and tools/gates/engine_literals.py are both in this diff. The gate fails.

- engine/f1.py lines 22 to 28 still hold 4, 12, 12, 365, 14 and 10 as literals.
- rulepacks/f1-us/v2026.09/parameters.yaml has none of the five ids: stem.evaluation_interval_months, cpt.full_time_bar_days, capgap.fiscal_year_start_month_day, opt.report_employer_within_days, calendar.federal_holidays_law.
- `compute_f1` has no `settings` argument and no item lists `duly_settings`. contracts/product_settings.yaml is read by nothing.
- Inputs that show it:
  - Any case with one employment period with `employer_reported: false`: `employment.periods_not_reported` is returned with `rule_ids` of `opt.unemployment_limit_days` (f1.py line 387). The user who opens the row reads the 90 day unemployment quote as the source for a reporting item. The quote says nothing about reporting.
  - `cpt_full_time_days: 365`: the verdict becomes `talk_to_dso` on the number 365 (f1.py lines 25 and 536), which has no rule, no source and no status tag. The item cites the 12 month rule, whose quote says "one year or more".
  - Any STEM case: the business day items do not name a holiday rule, and the holiday list in engine/dates.py has no rule in the pack behind it.
- Why it matters: CLAUDE.md, every rule carries a primary source. SPEC, every number comes from the pack by id.
- Note: specs/phase-2/plan-sourcing.yaml shows rounds S and T were planned for this. They have not run on this branch. If the founder means the addendum to be reviewed apart from the phase, this finding moves to that review, and findings 1, 2 and 4 still block.

### 4. Blocking. One request can hold the whole api for most of a minute, and far dates return 500

- File: api/main.py line 78 (`async def` running the engine on the event loop), engine/f1.py lines 258 to 270, contracts/case_f1.schema.json (no bound on dates, no maxItems on employment).
- Input A: opt.ead_start `0001-01-01`, opt.ead_end `9999-12-31`, 2000 employment periods. What happens: 49 seconds of work on the event loop, during which no other request is served, then 500.
- Input B: `"program_end_date": "9999-12-01"` with nothing else unusual. What happens: 500 from an OverflowError, where the SPEC asks for a 422 in plain words. `0001-01-15` does the same.
- Asked for: bounds on dates and on the number of periods. That is a contract change, so it lands first and alone. The engine can also skip the day loop when the inputs already conflict.

### 5. Should fix. Two items show a paragraph that does not state them

- opt.latest_start, engine/f1.py lines 296 to 303. It cites opt.apply_after_days, quote "may properly file his or her Form I-765 ... no later than 60 days after his or her program end date". That is the filing rule. The start date rule is in the same saved copy at (f)(11)(i)(D): "A student may not request a start date that is more than 60 days after the student's program end date." Input: any case. The value is right today under both regimes, the source shown is not the source. It needs its own rule id, with a row under each regime, since rulepacks notes say the final rule changes (D) as well.
- stem.apply_window_closes, engine/f1.py lines 413 to 420. It cites stem.apply_before_expiry_days, whose quote gives the opening of the window only. Input: any case with OPT and STEM.
- stem.final_evaluation_due uses stem.ead_end. The source says "conclusion of his or her practical training opportunity", which can come earlier than the EAD end. The inputs shown do say stem.ead_end, so the working is honest, but the item name "Final evaluation due" reads wider than the arithmetic. Input: a STEM case whose job ended before the EAD end date.

### 6. Should fix. The day changes at midnight UTC, not where the user is

- File: api/main.py lines 25 and 26 with engine/clocks.py `SystemClock.today`.
- Input: OPT EAD start 2026-09-01, no employment, request sent at 18:30 Pacific on 2026-09-28, which is 01:30 UTC on 2026-09-29.
- What happens: days_used is 29. On the user's calendar it is still the 28th and 28 days have passed. The same shift moves items in and out of the 14 day open item window and can flip `depends_on_litigated_rule` a day early.
- The time is read through the clock, so the hard rule holds. The question of which calendar the day belongs to needs a founder decision.

### 7. Should fix. The screen writes "in effect" without being told

- File: web/src/components/Result.tsx line 84, `legalStatusWords("effective")`.
- Input: any engine output with alternates where the operative regime's legal status is not `effective`, for example a pack whose operative regime is `appealed`.
- What happens: the operative value is labelled "in effect" anyway. The output contract does not carry the operative regime's status, so the screen states a legal status that came from no source. True today, by luck of the data.
- Asked for: carry the operative regime and its status in the engine output. Contract change.

### 8. Note. The litigated flag is narrow, and it holds

The SPEC sets depends_on_litigated_rule only when today is after final_end, while opt.apply_window_closes, opt.latest_start and grace.ends are tagged litigated in every case. I looked for an input where the quiet verdict hides a date that differs by regime and is close. There is none: every such date is final_end or program_end_date plus 30 or more days, so while today is on or before final_end the nearest one is at least 30 days out, past the 14 day window. Once today passes final_end the verdict is cannot_tell. No finding. If a later pack adds a regime row that moves a date before final_end, this stops being true, and a test on that property would be worth having.

### 9. Note. Guarded files changed in this diff

.claude/hooks/guard_bash.py, tools/copy_lint/lint.py, tools/gates/engine_literals.py, contracts/ and .gitleaksignore change in this diff. All come from commits by the founder account (d30e23c, 207a162, 082326c, 8f92f1b), not from lane merges. The copy lint change skips saved sources only. The guard change narrows the project name check to docker compose calls. Neither weakens a check on lane work. No finding.

## What is good

- Every hand checked date matches, across a leap year, a holiday on the reporting date, and both Saturday and Sunday observed holidays.
- Every quote is in its saved copy and every hash matches.
- L-content found that the final rule also changes the OPT filing window from 60 to 30 days, which the SPEC had as settled, and recorded it under both regimes.
- The 422 words come from the contract and never from the value sent.
- Missing recommendation dates lead to cannot_tell, which is stricter than the SPEC asks.

## Requests for files I do not own

Recorded in reviews/PROGRESS.md: SPEC line for stem without opt, contract bounds for dates and employment count, operative regime status in the output contract, tests for findings 1, 2 and 4.

## Decision

Findings 1 and 2 return the quiet state on inputs that cannot support it. Finding 3 leaves numbers in the engine with no source and fails a gate that is on this branch. Finding 4 lets one request stop the service.

VETO
