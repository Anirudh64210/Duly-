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
