# L-engine progress

## Iteration 1, 2026-09-28

### What was written

| File | What it holds |
|---|---|
| engine/dates.py | `add_months`, `add_business_days`, `federal_holidays`, `is_business_day` |
| engine/rulepack.py | `Rulepack.value`, `Rulepack.rules_checked_on`, refusal of a rule that needs a quote and has none |
| engine/f1.py | `F1Case`, `EadBlock`, `EmploymentPeriod`, `CapGap`, `parse_case`, `compute_f1` |

### What ran and what it printed

- Before any code: `uv run pytest tests/unit/engine -q` stopped at collection with
  `ImportError: cannot import name 'f1' from 'engine'`. Expected.
- After dates.py and rulepack.py: test_dates.py, test_rulepack.py, and
  test_rulepack_values.py all passed. mypy: no issues in 30 files. ruff: clean.
- After f1.py, the done command:
  `bash -c 'uv run pytest tests/unit/engine -q && uv run mypy && uv run ruff check engine && uv run ruff format --check engine'`
  264 tests passed, mypy found no issues in 31 source files, ruff check passed,
  6 files already formatted, exit 0.
- `uv run python -m tools.copy_lint.lint` : copy lint: clean.
- `uvx semgrep scan --config security/semgrep --error` on engine/ : no findings, exit 0.
- Coverage of engine/ from tests/unit/engine: 97 percent. Lines not reached, all of them
  refusals: dates.py 80 (negative count), rulepack.py 51, 63, 130 (unknown regime named
  in a lookup, two operative regimes holding one rule, a pack file that is not a
  mapping), f1.py 123, 130, 138-139, 164 (a pack value of the wrong type, a rule not in
  force).
- Shipped pack, run by hand: Case B of the tests computed against
  rulepacks/f1-us/v2026.09 on 2026-09-28. The output matched
  contracts/engine_output.schema.json with no problems. opt.apply_window_closes and
  opt.latest_start came back with status litigated and an alternate under
  fixed_admission_2026, because the shipped pack records opt.apply_after_days under both
  regimes. grace.ends carried its alternate as well.
- Not run: gates 3, 5, and 6 over the whole repo. tests/unit/api is red until round C
  writes the route, so gate 5 cannot be green in round B.

### Test disputes

None. No test in tests/unit/engine contradicts the SPEC as I read it.

### Decisions where the SPEC is open

The numbers are the questions in tests/PROGRESS.md. Each is a reading, not a fact. Say so
if one is wrong.

| # | Question | What the engine does | Why |
|---|---|---|---|
| 1 | What `Rulepack.value` returns | The whole parameter, as a mapping | The engine needs the status and the source, not only the number |
| 2 | Nothing in force | Returns None. Raises RulepackError only for a regime name the pack does not hold, or when two operative regimes both hold the rule | None lets the engine ask about a second regime without catching errors. `compute_f1` raises RulepackError when a rule it needs is not in force |
| 3 | Which date goes to `Rulepack.value` | today, from the clock | DECISIONS.md D1: the default is what is operative today. The shipped pack has a closed row for capgap.end_month_day (10-01 until 2025-01-16), so this matters |
| 4 | `add_business_days(d, 0)` | Returns d. A negative count raises ValueError | Zero days on is the same day |
| 5 | `add_months` with a negative n | Works, with the same clamp. February 29 minus 12 months is February 28 | Used for program_end_date minus 1 year |
| 6 | New Year's Day on a Saturday | The observed date, December 31, is in the list of the year it falls in | `federal_holidays(year)` then holds exactly the dates of that calendar year |
| 7 | Inauguration Day | Left out | 5 U.S.C. 6103(c) applies to employees in the Washington, DC area only |
| 8 | Which part an item belongs to | By id for stem items: every stem item is left out when stem is null, and the two stem window items are also left out when opt is null. The four opt items computed from program_end_date alone are always shown | The literal reading of "items for a part that is absent are left out". The test for a case without opt expects the program items to stay |
| 9 | Counts when opt is null | The three unemployment items and the two employment items are left out | The counting window starts at opt.ead_start. No opt block, no window |
| 10 | Null recommendation date | file_by is null and the input is named in missing_inputs, so the verdict is cannot_tell | "Rules of the house" says the input is named. CLAUDE.md says missing means cannot_tell. The "Verdict inputs" table lists only the EAD dates. I took the two that agree. The founder should confirm |
| 11 | Names | Missing: `opt.ead_start`, `opt.ead_end`, `stem.ead_start`, `stem.ead_end`, `opt.dso_recommendation_date`, `stem.dso_recommendation_date`. Conflicts: `opt_end`, `stem_end`, `employment_N_end` (N from 1), `opt_start`, `stem_start` | The SPEC names only stem_start. The rest follow its pattern |
| 12 | A missing EAD date and the counts | days_used, days_remaining, and days_under_hours are null when any EAD date of a block that is present is missing | The window end or the day the threshold changes would be a guess |
| 13 | Rule ids of the counts | days_used, days_remaining, and periods_not_reported name the unemployment limit rule that applies (stem from stem.ead_start, else opt). days_under_hours names opt.min_hours_per_week, and stem.min_hours_per_week when stem is present. cpt.full_time_days_used names cpt.full_time_months_bar | The contract needs at least one. See the request to L-content below |
| 14 | The 6 in "6 times N" | Read from stem.validation_interval_months | "Every number comes from the pack by id" |

More readings, not in the list above:

- Alternates are general. Any item gets an alternate for each regime that is not
  operative and holds a row for one of the item's rules in force today. The SPEC names
  only grace.ends. The shipped pack gives opt.apply_window_closes and opt.latest_start a
  second regime, and they now show it.
- final_end is the latest among the dates present, as the SPEC says. If stem is present
  and stem.ead_end is null, grace.ends is computed from the dates that are there, and the
  verdict is cannot_tell because stem.ead_end is named as missing.
- Numbers in engine/f1.py that do not come from the pack. Each is written in the SPEC as
  part of a definition: 4 validation reports, 12 months for the 12 month evaluation,
  1 year for the opt.ead_start conflict, 365 days for cpt_full_time_at_or_over_bar,
  14 days for open items, and October as the first month of the fiscal year. The pack has
  cpt.full_time_months_bar (12 months), but the SPEC compares days with 365, and months
  do not turn into days without a start date. If any of these should come from the pack,
  the pack needs the rule first.
- An item's status uses the operative row of each rule. The rows of a regime that is not
  operative do not weaken it.

### Requests for files this lane does not own

- rulepacks/ (L-content): there is no rule about reporting an employer.
  employment.periods_not_reported names the unemployment limit rule only because the
  contract needs one rule id. A rule with the reporting duty and its source would let the
  item name the right one.
- tests/ (L-tests): the refusals listed under coverage have no test. Two operative
  regimes holding the same rule, an unknown regime name in a lookup, and a pack value of
  the wrong type are each worth one.
- specs/phase-2/SPEC.md: question 10 above needs a ruling, because the two SPEC lines
  disagree.

## Lesson

- Failure: piping pytest into `tail` or `grep` hid the result. The shell reported the
  exit code of the last command in the pipe, and a filter meant to drop the dots dropped
  every line.
  Fix: run the done command exactly as written, with no pipe, and read its exit code.
  Evidence: the first filtered run printed nothing from pytest; the unpiped run printed
  the dots and exit 0.
- Failure: the write hook reported engine/f1.py as unformatted after a new file was
  written, though ruff check passed.
  Fix: run `uv run ruff format engine` after writing a file, before the done command. A
  long lambda with a conditional is wrapped in brackets by the formatter.
  Evidence: .claude/hooks/lint_touched.py printed "1 file would be reformatted" for
  engine/f1.py at the 12 month evaluation item.
- Failure: none seen, but close. The shipped pack records a rule under two regimes that
  the SPEC table lists with none (opt.apply_after_days), and keeps a closed row for
  capgap.end_month_day. An engine that looks a rule up by id alone, or that ignores the
  date, reads the wrong row.
  Fix: always go through `Rulepack.value(id, today)`, and try the shipped pack by hand
  as well as the test pack.
  Evidence: rulepacks/f1-us/v2026.09/parameters.yaml, the rows for opt.apply_after_days
  and capgap.end_month_day.

## Iteration 2, 2026-09-28: every number has a source

Work under "The engine (L-engine)" and "Derived, not stored" in
specs/phase-2/SPEC-sourcing.md.

### What was written

| File | What changed |
|---|---|
| engine/settings.py | New. `load_settings` reads contracts/product_settings.yaml. `whole_setting` reads one value by id and raises SettingsError when the id is absent, repeated, or not a whole number of zero or more |
| engine/dates.py | `add_years`, and a comment on the holiday list that cites calendar.federal_holidays_law |
| engine/f1.py | The six numbers are gone. `compute_f1` takes the keyword argument `settings`; None means the shipped file |

Where each number went:

| Was | Now |
|---|---|
| 4 validation reports | stem.extension_months divided by stem.validation_interval_months, whole intervals only |
| 12 months to the evaluation | stem.evaluation_interval_months |
| 12 months back for opt.ead_start | product.opt_start_earliest_years_before_program_end, in years, through `add_years` |
| 365 days of full time CPT | cpt.full_time_bar_days |
| 14 days ahead | product.open_item_lookahead_days |
| month 10 | capgap.fiscal_year_start_month_day, compared as month and day |

### What ran and what it printed

- Before: the gate printed six numbers with no source in f1.py, lines 22 to 28, exit 1.
  Every test in test_f1_sourcing.py that calls the engine failed with
  `TypeError: compute_f1() got an unexpected keyword argument 'settings'`.
- After, the done command, run as written:
  `engine literals: every number has a source`, every engine test passed, mypy
  `no issues found in 34 source files`, ruff check passed, 8 files already formatted,
  exit 0.
- `uv run python -m tools.copy_lint.lint` : copy lint: clean.
- Shipped pack by hand: Case B of test_f1_sourcing.py against rulepacks/f1-us/v2026.09 on
  2026-09-28 with the shipped settings. No contract problems. Four validation reports,
  stem.evaluation_12_month_due 2026-07-11, capgap.ends 2026-10-01,
  employment.periods_not_reported with status guidance, cpt.full_time_days_used with
  status school.
- Not run: the hidden tests. `uv run pytest tests/holdout -q --tb=no` collected nothing
  in this worktree (exit 5). I did not open the directory. The SPEC's done line names
  the hidden tests, so someone who may run them should.

### Test disputes

None.

### Decisions where the SPEC is open

Numbers follow the questions in tests/PROGRESS.md.

| # | Question | What the engine does | Why |
|---|---|---|---|
| 16 | Shape of `settings` | The shape of contracts/product_settings.yaml once parsed | The tests pass that shape |
| 17 | Which item lists a setting | product.open_item_lookahead_days: every item with a date whose id ends in `_due`, `file_by`, or `window_closes`, because the look-ahead is applied to that date. product.opt_start_earliest_years_before_program_end: unemployment.days_used, unemployment.days_remaining, and employment.days_under_hours, because their inputs hold opt.ead_start, the date the setting is checked against. An item that used no setting has no `duly_settings` key | "The ids it used" |
| 18 | Which item names the CPT bar | cpt.full_time_days_used names cpt.full_time_months_bar and cpt.full_time_bar_days. Its status is now school | It is the only CPT item |
| 19 | An extension the interval does not divide | Whole intervals only: 24 and 5 give 4 reports | A report falls at the end of an interval that was reached |
| 20 | calendar.federal_holidays_law set to false | Nothing changes. The flag is cited, not read as a switch | The SPEC gives it no other meaning. A pack without the rule in force raises RulepackError |
| 22 | A setting the engine needs is absent | SettingsError | Never a silent default |
| 23 | Program end on February 29 | The earliest start is February 28 of the earlier year | Same clamp as `add_months` |

More readings:

- Each validation item names stem.extension_months as well as the interval, the business
  days rule, and the holiday law. Its date does not turn on the extension, but whether
  the item exists does, so the source is shown.
- employment.periods_not_reported names only opt.report_employer_within_days. The
  unemployment limit rule it named before was a stand-in.
- `add_years` holds the 12 months of a year in engine/dates.py. That is the calendar, not
  a rule, and it sits with the other calendar arithmetic.
- A value of zero or less for stem.validation_interval_months raises RulepackError.

### Requests for files this lane does not own

- api/ : a caller that wants settings other than the shipped file passes `settings=`.
  Nothing else changed in how `compute_f1` is called.
- tests/ (L-tests): questions 19, 20, 22, and 23 have no test. Each is worth one.

## Lesson

- Failure: none seen, but close. "One year back" written as `add_months(d, -12)` in
  engine/f1.py puts a 12 in a checked file, and the gate fails on it.
  Fix: calendar facts live in engine/dates.py (`add_years`). engine/f1.py holds only
  lookups, 0, 1, and -1.
  Evidence: `uv run python -m tools.gates.engine_literals` printed
  "every number has a source" after the change.
- Failure: `uv run pytest tests/holdout -q --tb=no | tail -1` printed an empty line, which
  reads like a pass.
  Fix: read pytest's own exit code (`${pipestatus[1]}` in zsh). Exit 5 means nothing
  was collected.
  Evidence: "pytest exit 5" in this worktree.
