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

## Iteration 3, 2026-09-29: answers to the phase 2 review

Work for findings 1, 2, 4, 5 and 7 in specs/phase-2/SPEC-fixes.md. Only engine/f1.py
changed.

### What was written

| Finding | What changed in engine/f1.py |
|---|---|
| 1 | The counts are added when any of opt, stem, cap_gap, or an employment period is entered. With no OPT block their value is null, their inputs hold `opt: null`, and `opt` is named as missing. The STEM filing window items are shown the same way when OPT is absent |
| 2 | `parse_case` raises ValueError for NaN, Infinity and -Infinity in documents_count, cpt_full_time_days, and hours_per_week of any period |
| 4 | `_pieces` cuts the window where a period starts, the day after one ends, and at stem.ead_start, and counts whole pieces. No loop over days is left. When the inputs conflict the counts are null and nothing is counted |
| 5 | opt.latest_start reads opt.latest_start_after_days. stem.apply_window_closes names stem.apply_window_closes_rule and is left out when the pack has no such rule in force. stem.final_evaluation_due is now stem.final_evaluation_due_from_ead_end |
| 7 | Every item with `alternates` carries `operative`: the regime id and its legal_status as the pack has them |

### What ran and what it printed

- Before: 57 failed in tests/unit/engine (47 in test_f1_fixes.py, 7 in test_f1.py, 3 in
  test_f1_sourcing.py). The gate, mypy and ruff passed.
- After, the done command, run as written with no pipe: pytest exit 0, every engine test
  passed, `engine literals: every number has a source`, mypy `no issues found in 34
  source files`, ruff check passed, 8 files already formatted, exit 0.
- `uv run python -m tools.copy_lint.lint` : copy lint: clean.
- Shipped pack by hand, clock at 2026-09-28. The reviewer's case from "Dates checked by
  hand": all thirteen values as in the review, days_used 42. opt.latest_start names
  opt.latest_start_after_days and shows the alternate 2024-06-16. The three items with
  alternates carry `operative` ds_2012, effective. The reviewer's input for finding 1:
  verdict cannot_tell, reasons `missing:opt`, the three counts null, stem.file_by
  2026-05-31, grace.ends 2028-07-30.
- `uv run pytest tests/unit -q`: 7 failed, all in tests/unit/api/test_compute_fixes.py.
  They wait for L-api. See the requests below.
- Not run: the hidden tests. `uv run pytest tests/holdout -q --tb=no` collected nothing
  in this worktree (exit 5). I did not open the directory.

### Test disputes

None.

### Decisions where the SPEC is open

Numbers follow the questions in tests/PROGRESS.md.

| # | Question | What the engine does | Why |
|---|---|---|---|
| 25 | What a missing OPT block is called | `opt`, once. The dates inside it are not named one by one | The SPEC says `missing_inputs` names `opt` |
| 26 | Counts when OPT is absent | Shown, with a null value | The reviewer noted that no count item came back. A null with the input named says why |
| 27 | Counts when the inputs conflict | Shown, with a null value. Nothing is named as missing; the conflict is in the verdict | A count over dates that conflict is not an item the engine can give |
| 28 | The renamed item as an open item | Still an open item inside the look-ahead. `_due_from_ead_end` is in OPEN_ITEM_ENDINGS, and the item lists product.open_item_lookahead_days | The rename changed a name. Dropping the item from the open items would make the verdict quieter, which no line of the SPEC asks for |
| 29 | stem.apply_window_closes_rule set to false | Nothing changes. The flag is cited, not read as a switch. A pack without the rule in force leaves the item out | Same reading as question 20 |
| 30 | Dates outside 1950 through 2099, or a 51st period, in `parse_case` | Not refused. The SPEC asks this of the api | The engine no longer walks days, so a wide window costs nothing. A last day of 9999-12-31 with a clock on that day would still overflow |
| 32 | `operative` on an item without alternates | Absent | The contract says "present with alternates" |

More readings:

- Employment entered with no OPT, no STEM and no cap-gap names `opt` as missing. The
  SPEC names only the STEM and cap-gap cases. The general rule covers this one: the
  counts would need the OPT dates. A case with none of the four has nothing missing.
- Which regime is `operative` for an item. The regimes named on the operative rows of
  the item's rules. When no row names a regime, the operative regimes of the pack. If
  that is not exactly one regime the engine raises RulepackError, since the contract
  holds one.
- An employment period whose end is before its start covers no day, as in the day by
  day count.

### Requests for files this lane does not own

- api/ (L-api): `parse_case` now raises ValueError for NaN and the infinities. Until the
  api refuses them at the door, that error reaches the handler. The 7 failures in
  tests/unit/api/test_compute_fixes.py are this and the event loop.
- web/ (L-web): the item id stem.final_evaluation_due is now
  stem.final_evaluation_due_from_ead_end, and items with alternates carry `operative`.
  Counts and the STEM filing window can be null with `opt` among the inputs.
- specs/phase-2/SPEC-fixes.md: questions 27 and 28, and employment entered with no OPT,
  each need a line.
- tests/ (L-tests): no test covers question 28 (the final evaluation inside the
  look-ahead), a pack with two operative regimes, or employment with no OPT.

## Lesson

- Failure: mypy printed "Cannot infer type of lambda" for a lambda in a loop that bound
  the loop variable as a default argument.
  Fix: a small function that takes the rule id and returns the formula.
  Evidence: engine/f1.py, `days_after` in `_add_program_items`; mypy then printed "no
  issues found in 34 source files".
- Failure: none seen, but close. Renaming an item whose id ended in `_due` would have
  taken it out of the open items without any test failing.
  Fix: when an item id changes, read OPEN_ITEM_ENDINGS and every other place that reads
  the id by its ending.
  Evidence: no test in tests/unit/engine fails with `_due_from_ead_end` removed from
  OPEN_ITEM_ENDINGS; question 28 in tests/PROGRESS.md.

## Iteration 4, 2026-09-29: the context round

Work for sections 2 to 5 of specs/phase-2/SPEC-context.md. engine/f1.py, engine/clocks.py
and engine/verdict.py changed.

### What was written

| Section | What changed |
|---|---|
| 2 | engine/clocks.py: `zone_named` and `day_in_zone`. Today is `clock.now()` seen from the zone of the case, then its date. `compute_f1` never reads `clock.today()`, and passes the day to `decide`, which takes `today` as a third argument and reads the clock only when none is given. `parse_case` keeps `time_zone` and raises ValueError for a name that is not among the zones of the system. The words of the error do not repeat the name. The output carries `today` |
| 3 | `_add_file_by` leaves the item out when the recommendation date is absent and a filing date or an EAD start is recorded. A filing date is read for nothing else and is never named |
| 4 | `compute_f1` raises the three questions, returns the open ones under `questions`, and `decide` gives `unconfirmed:<id>` for each. `parse_case` keeps `confirmations`. An answer is read only when its question is raised |
| 5 | `_show_rule` copies `derivation` from the pack, and `note` when the rule is a reading |

### What ran and what it printed

- Before: 157 failed in tests/unit/engine.
- After, the done command as written, output to a file, exit code read: exit 0.
  `556 passed`, `engine literals: every number has a source`, mypy `no issues found in
  34 source files`, ruff check passed, `8 files already formatted`.
- One failure on the way: mypy, "Generator has incompatible item type Sequence[str]" on
  the list of questions. Fixed with a type on the list.
- `uv run pytest tests/unit --tb=no`: `7 failed, 921 passed`. All 7 are in
  tests/unit/api/test_compute_context.py and are about a zone that does not exist. They
  wait for L-api. See the requests below.
- `uv run python -m tools.copy_lint.lint`: copy lint: clean.
- Shipped pack by hand, clock at 01:30 UTC on 2026-09-29.
  STEM alone in America/Los_Angeles: today 2026-09-28. No answer: cannot_tell,
  `unconfirmed:held_post_completion_opt`. Yes: cannot_tell, `missing:opt.ead_start`,
  `missing:opt.ead_end`. No: talk_to_dso, `stem_without_post_completion_opt`, and
  stem.requires_post_completion_opt is among the rules, as a reading with its note. The
  counts are null in all three. grace.ends 2028-07-30.
  Cap-gap alone in Asia/Kolkata: today 2026-09-29. No answer: cannot_tell,
  `unconfirmed:cap_gap_without_training`, grace.ends null. Yes: `missing:opt.ead_end`,
  grace.ends null. No: talk_to_dso, `cap_gap_without_training`, grace.ends 2027-02-16.
- Not run: the hidden tests. `uv run pytest tests/holdout --tb=no` collected nothing in
  this worktree (exit 5). I did not open the directory.

### Test disputes

None.

### Decisions where the SPEC is open

Numbers follow the questions in tests/PROGRESS.md where one exists.

| # | Question | What the engine does | Why |
|---|---|---|---|
| 34 | A recommendation date that is present beside a filing or an EAD | file_by is shown with its date, and is still an open item inside the look-ahead | The older tests require it. Needs the founder |
| 37 | The answer no to held_post_completion_opt | The counts and the STEM filing window are shown with a null value. OPT is not named as missing | The window cannot be known |
| 38 | no_employment_to_record open, or answered no | The three counts are null, and employment.periods_not_reported is null as well | A count over a list the person has not confirmed as whole is a guess |
| 39 | STEM without OPT and an empty list | Only the OPT question is asked. The same when opt.ead_start is absent | The first day of the window is not known |
| 40 | `because` | held_post_completion_opt: stem, opt. no_employment_to_record: employment, opt.ead_start. cap_gap_without_training: cap_gap, opt, stem | The inputs the condition reads |
| 42 | A zone in other letters | Refused. The name must be one of `zoneinfo.available_timezones()`, as written there | The same answer on macOS and Linux |
| 43 | An answer dated after today, or an id the engine does not know | The date is not checked. An unknown id is not read | Not in the SPEC. Needs a line |
| 45 | A verbatim rule with a note in the pack | The note is not shown | The SPEC says "for a reading, note". The shipped pack has a note on every rule |

More readings:

- The answer yes to a question about OPT: the engine takes the OPT block as held and not
  entered. held_post_completion_opt names opt.ead_start and opt.ead_end.
  cap_gap_without_training names opt.ead_end alone, as the SPEC's table has it, although
  the counts would need the start as well. opt.file_by is not added and the OPT
  recommendation date is not named: the SPEC names the EAD dates only.
- grace.ends with cap-gap alone. Until this round it was program_end_date plus the grace
  period. While the question is open, or answered yes, the last end date may be the end
  of an OPT that is not entered, so the value is now null. Open: `opt` is among the
  inputs and nothing is named. Yes: opt.ead_end is among the inputs. With the answer no
  the date is as before. No unit test covers this. If a hidden test expects the old date
  for a cap-gap case with no answer or the answer yes, that is a dispute to raise.
- Employment entered with no OPT, no STEM and no cap-gap still names `opt` as missing, as
  in iteration 3. No question of this round covers it, and the engine invents none.
- stem.requires_post_completion_opt is shown among the rules and named by no item. With
  the answer no and a pack without the rule in force the engine raises RulepackError.
- The rule is a reading in the shipped pack and verbatim in the test pack. The engine
  shows what the pack says.
- `unconfirmed:` reasons come after `no_documents` and before the `missing:` reasons.

### Requests for files this lane does not own

- api/ (L-api): `parse_case` raises ValueError for an unknown zone. The 7 failures in
  tests/unit/api/test_compute_context.py wait for the 422. api/main.py calls
  `decide(empty_case, clock)`, which still reads `clock.today()`; it can pass the
  person's day as the third argument.
- pyproject.toml: `tzdata` is not listed. Without zone files `available_timezones()` is
  empty and every case is refused. The same request as in tests/PROGRESS.md.
- web/ (L-web): `questions`, `today`, `derivation` and `note` are in the output. Counts,
  employment.periods_not_reported and grace.ends can be null. A file_by item can be
  absent.
- specs/phase-2/SPEC-context.md: questions 34, 43 and 45, and grace.ends with cap-gap
  alone, each need a line.
- tests/ (L-tests): no test covers grace.ends with cap-gap alone,
  employment.periods_not_reported while the employment question is open, a zone in other
  letters, or the answer no with a pack that lacks the rule.

## Lesson

- Failure: a date that was right before a question existed became a guess once the
  question existed. grace.ends for cap-gap alone was counted from the program end, which
  assumes there was no OPT. No test failed.
  Fix: when a question is added, read every item whose inputs include the part the
  question is about, and ask what the item assumes while the question is open.
  Evidence: the hand run above, grace.ends null for cap-gap alone with no answer.
- Failure: mypy read a list of dicts built from a tuple of a string and a list as
  `dict[str, Sequence[str]]`, and refused `question["id"]` as a string.
  Fix: give the list its type, `list[dict[str, Any]]`.
  Evidence: mypy then printed "no issues found in 34 source files".

## Run l-engine-5a03087828, 2026-09-29: is_weekend (specs/factory/e2e-SPEC.md)

### What was written

- engine/dates.py: `is_weekend(d: date) -> bool`, placed before `is_business_day`. It
  returns `d.weekday() >= SATURDAY`, with the SATURDAY name the module already holds. It
  takes a date only and reads no clock. Nothing else in the engine changed.

### What ran and what it printed

- tests/unit/engine/test_is_weekend.py is not in this worktree. It is in commit a58226f,
  on the branch work/factory-e2e, which is not an ancestor of this branch.
- The file was read from that commit into a scratch folder under TMPDIR and run there
  with PYTHONPATH set to the worktree: `10 passed in 0.09s`, exit 0. The scratch folder
  was then removed. Nothing was written under tests/.
- The done command, as written: 556 dots of passing tests under tests/unit/engine,
  `Success: no issues found in 53 source files`, `All checks passed!`,
  `8 files already formatted`, `engine literals: every number has a source`, exit 0.
  This run did not include test_is_weekend.py, since the file is not on this branch.

### Requests

- The orchestrator: bring commit a58226f (the L-tests file) onto the branch that this
  lane is merged with, so that the done command covers is_weekend.

## Run l-engine-b63b2c6ea2, 2026-09-29: product round 1, sections 1 to 6 (attempt 1)

Read: engine/PROGRESS.md, specs/product-1/SPEC.md, CLAUDE.md, the two contracts,
tests/unit/engine/test_f1_product.py, tests/support/f1_pack.py, tests/PROGRESS.md
(iteration 6). Only engine/f1.py changed.

### What was written

| Section | In engine/f1.py |
|---|---|
| 1 | `_facts`: the 13 rows of the table, in its order. Each is a conflict and a question with the same id, with `about` holding the values by input name. No or no answer: `conflict:<id>` stays. Yes: the id is a judgement item. While a conflict is open, every item with an input named in its `about` has the value null (`_Working.conflicted`). `_pieces` counts inside the cards only, so days between two cards are outside the window |
| 2 | `nothing_more_to_record` when opt, stem and cap_gap are all absent; no gives `missing:training`. `full_time_cpt_used` when cpt_full_time_days is absent or null; no gives the value 0 with the answer and its day in the inputs; yes gives `missing:cpt_full_time_days`. `parse_case` keeps days not entered as None |
| 3 | `parse_case(raw, clock=None)`: with a clock, an answer dated after the person's own day raises ValueError. `_answer` reads `about` and, for the yes to no_employment_to_record, the day it was given. Every question carries `about` |
| 4 | `STEPS` and `_Working.done`: a done item is no open item and is not in `upcoming`. Its date is still computed |
| 5 | `reading` on each computed item and each entry of `upcoming`, from `derivation` in the pack |
| 6 | `upcoming`, soonest first. The four `next.` dates with OPT entered and no STEM (`_add_next_step`). `lists` holds the rules of the pack whose ids begin `stem.requires.`, in the order of the pack (`_lists`) |

### What ran and what it printed

- The done command as written, twice: exit 1 both times, with the same 66 failed tests
  of 763 (697 passed). The four checks after pytest, run one by one: `engine literals:
  every number has a source`, `Success: no issues found in 54 source files`, `All
  checks passed!`, `8 files already formatted`.
- tests/unit/engine/test_f1_product.py: 2 failed, both disputes below. Before this run
  184 failed in that file.
- A scratch plugin under TMPDIR held the engine's conflicts against
  `conflicts_by_the_table` in tests/support/f1_pack.py for every case the suite
  computes: 3797 calls, 0 that differ. The folder was removed.
- The same plugin switched off one thing at a time to learn what each of the 64 older
  failures turns on: the pattern of the question id alone 22, a conflict of section 1
  in the older case 23, a done step of section 4 in the older case 11, the day of the
  answer of section 3 in the older case 4, more than one of these 6, `about` on an
  older question 1, days between two cards counted by the test's own reference 1.
  (Two of the 66 are in the product file.) None turns on a fault in the engine that I
  could find.
- The shipped pack by hand, today 2026-09-28: OPT 2026-06-01 to 2027-05-31 with no STEM
  gives no_open_items, the four next dates (2027-03-02, 2027-05-31, 2027-05-31,
  2027-07-30) and one list of 15 rules. A card through 2028-10-31 gives
  `conflict:opt.card_longer_than_rule` with the counts and grace.ends null.

### Disputes

1. contracts/engine_output.schema.json gives the id of a question the pattern
   `^[a-z0-9_]+$`. SPEC section 1 gives the question the id of the conflict, which
   holds dots. test_f1_product.py::test_the_output_of_a_conflict_follows_the_contract
   cannot pass, and neither can 22 older tests whose case now holds a conflict and
   which check the contract. The engine follows the SPEC.
2. test_f1_product.py::test_the_answer_yes_to_another_row_leaves_this_one_open
   [cap_gap.petition_filed_on.after_start]: the answer is dated 2026-10-05, the day of
   the row, and the case is run on the default day, 2026-09-28. SPEC section 3: "An
   answer dated after today is refused". parse_case raises ValueError, as the SPEC says.
3. test_f1.py::test_window_runs_from_ead_start_through_the_earlier_of_today_and_ead_end
   (4 cases): no employment, the yes to no_employment_to_record given 2026-09-28, today
   in 2027. SPEC section 3: "When today is later, the question is open again for the
   days since." The test expects a count.
4. Older tests whose case holds a fact of the table of section 1 and which expect dates
   or counts (29 tests, among them test_f1.py::test_a_period_covers_its_first_and_last_day
   with a period that begins before the card, test_f1_sourcing.py::
   test_a_shorter_extension_gives_fewer_reports with a card of 24 months under a pack
   of fewer, and test_f1_fixes.py::
   test_the_count_agrees_with_a_plain_day_by_day_count_on_small_windows, whose
   reference counts the days between two cards).
5. Older tests that expect opt.file_by or opt.apply_window_closes as an open item on a
   case with the filing or the card recorded (11 tests, among them test_f1.py::
   test_a_dated_item_from_today_through_14_days_on_is_an_open_item). SPEC section 4.
6. test_f1_context.py::test_the_question_names_the_inputs_that_raised_it expects a
   question to hold `id` and `because` only. SPEC section 3: "Each question carries
   `about`".

### Readings the SPEC leaves open

- An answer with no `about` is taken as an answer (tests lane question 47). The day of
  the answer is still checked. An api client that leaves `about` out skips the check of
  section 3 on values. Needs the founder.
- compute_f1 cannot refuse an answer: it takes a parsed case. An answer dated after
  today that reaches it (parse_case called with no clock) is read as given. The api has
  to pass its clock to parse_case.
- A card whose last day is the day the months end is not a conflict (question 49).
- The items that use the dates of a conflict are those with an input named in `about`.
  For employment.period_outside_cards `about` holds the periods with days outside and
  the dates of the cards, so grace.ends and the STEM dates are null too while it is
  open.
- The answer no to a conflict leaves the conflict and asks nothing again until a value
  in it changes.
- An open conflict gives the reason `conflict:<id>` and no `unconfirmed:<id>`.
- The answers to nothing_more_to_record and full_time_cpt_used have no last day. The
  SPEC gives one to no_employment_to_record only.
- unemployment.days_used on the STEM card names both limit rules, since the days of the
  OPT card are in the count. test_the_mark_comes_from_the_pack_and_from_nowhere_else
  expects the OPT rule on it.
- A pack that lacks a rule of a next date gives no such date. A pack that lacks
  opt.max_months or stem.extension_months gives no conflict on the length of the card.
- Conflict ids of earlier rounds (opt_start, stem_start and the rest) are as they were.

### Requests for files this lane does not own

- contracts/engine_output.schema.json: allow dots in the id of a question.
- tests/ (L-tests): bring the older cases in line with sections 1, 3 and 4, and date
  the answer of dispute 2 on the day the case is run.
- api/ (L-api): pass the clock to `parse_case(raw, clock)` and turn the ValueError
  into the 422.
- specs/product-1/SPEC.md: a line on an answer with no `about`.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Lesson

- Failure: 64 older tests failed beside the new ones, and nothing in the output said
  which were faults of the engine and which were older cases that the new SPEC reads
  another way.
  Fix: a scratch plugin under TMPDIR that switches off one new behaviour at a time, and
  one that holds the engine against the reference table the tests lane wrote.
  Evidence: 3797 calls, 0 that differ; each of the 64 tied to one section of the SPEC.
- Failure: a product test dated its answer on the day of its row and ran the case on
  the default day, so the answer was after today and parse_case refused it.
  Fix: read the day a test runs on beside the day of each answer before taking a
  refusal as a fault of the engine.
  Evidence: ValueError from parse_case, answer 2026-10-05, today 2026-09-28.

### After the stop hook

The stop hook ran the done command and printed the same 66 failures: the third time.
engine/ESCALATE.md written with what was tried and the failure tail. Nothing else
changed.

## Run l-engine-209410c52d (attempt 1): points 7 and 8 of SPEC-resolutions.md

- `git merge lane/L-engine/l-engine-b63b2c6ea2`: "Already up to date"; the branch is
  an ancestor of HEAD.
- Point 7: `_answer` in engine/f1.py treats an answer with no `about` as no answer; the
  question stays open. The 17 test_point_7 tests in test_f1_product.py now pass.
- Point 8: `parse_case(raw, clock)` already took the clock and refused an answer dated
  after the person's own day. The test_point_8 tests pass. The clock stays optional in
  the signature because older tests call `parse_case(case)` with no clock to check
  parsing alone.
- Done command, run as written: exit 1. engine_literals, mypy, ruff check and ruff
  format --check all pass on their own (exit 0). pytest: 7 failures, all present before
  the point 7 change, each an older test that contradicts a settled point:
  - test_f1_context::test_an_item_is_open_on_the_persons_own_day: CASE_A holds an OPT
    filing (2026-03-10), so the apply step is done and not an open item. Point 5.
  - test_f1_context::test_no_date_from_before_the_ead_blocks_a_case_that_holds_the_ead:
    the drawn case dates the STEM recommendation (2024-11-01) after today (2024-01-02),
    a conflict of SPEC section 1 row stem.dso_recommendation_date.after_today; emptying
    the date clears that conflict, so the verdict differs. Section 1, point 4.
  - test_f1_context::test_the_question_names_the_inputs_that_raised_it: expects keys
    {id, because}. Point 6 says id, because and about.
  - test_f1_context::test_the_answer_yes_counts_on_an_empty_list: `answered()` dates the
    answer 2026-09-28 and the case runs on 2026-08-01; parse_case refuses it. Point 2.
  - test_f1_fixes::test_the_largest_case_is_counted_right and
    test_the_largest_window_with_no_employment_is_counted_right: the cards run 75 years,
    conflicts opt/stem.card_longer_than_rule are open, so the counts are null. Point 4.
  - test_f1_fixes::test_the_count_agrees_with_a_plain_day_by_day_count_on_small_windows:
    the generator puts the STEM start 1 to 5 days after the OPT end; more than one day
    is stem.gap_after_opt, and the counts are null. Point 4.
- Also seen: every case built with tests/support/f1_pack.answered_yes carries answers
  with no `about`. Under point 7 those are not answers. They pass today only where the
  question is not raised.
- Status: escalated. No test was changed or worked around.

### After the stop hook

The stop hook ran the done command and printed the same 7 failures: the same failure a
second time. Status stays escalated; engine/ESCALATE.md and engine/REPORT.json stand.
Nothing else changed.

## Run l-engine-91e2117f32 (attempt 1): merge and pass

- `git merge --no-edit lane/L-engine/l-engine-209410c52d`: merge made; engine/f1.py
  (point 7 in `_answer`) and engine/PROGRESS.md came in. git printed "Operation not
  permitted" for tests/holdout/, which the sandbox closes to this lane; the merge went
  through.
- Done command, run as written with no pipe: exit 0. pytest all pass, engine literals
  "every number has a source", mypy "no issues found in 56 source files", ruff check
  "All checks passed!", ruff format "8 files already formatted".
- The seven tests named in the last run's disputes pass now that the tests round fixed
  them. No change to engine/ beyond the merge was needed.
- Status: done.

## Run l-engine-9492007270 (attempt 1): SPEC-resolutions.md points 11, 12, 14 to 19, 23, 24

### What was built

- Point 24 (engine/dates.py): `federal_holidays` lists the eleven days of 5 U.S.C.
  6103(a) on the days the law gives; the observed-day shift (`_observed`) is gone.
- Point 12: `next.grace.ends` removed; `grace.ends` is the one grace date in upcoming.
- Points 11, 14, 15, 16: `_window_facts` in engine/f1.py adds seven rows after the
  section 1 table: `<part>.i765_filed_date.before_recommendation`,
  `<part>.i765_filed_date.after_file_by`, `stem.i765_filed_date.before_window_opens`,
  `opt.i765_filed_date.after_window_closes` (operative value only),
  `opt.ead_end.after_complete_by`. Each day count is `work.whole_rule(id)`, read through
  Rulepack.value on today under the operative regime. Each shows its rule in `rules`.
  They go through the same `ask` path as every other fact: cannot_tell, question with
  about, the about inputs nulled, yes gives talk_to_dso with the id.
- Point 17: `grace.ends` needs every entered card end.
- Point 18: `_cap_gap_past_cards`: an active petition whose end is after the last card
  end (or held in a conflict) gives grace.ends null; with capgap.ends known the verdict
  carries `grace_with_cap_gap`.
- Point 19: item `unemployment.opt_card_days_used` (when a STEM block is entered), from
  the same pieces as days_used, cut at opt.ead_end, naming opt.unemployment_limit_days;
  judgement `unemployment_opt_card_at_or_over_limit` when the STEM card is entered and
  the count is at or over the rule's value.
- Point 23: `_alternates` drops a regime when the item's date is before that regime's
  own row's effective_from.

### What ran

- Done command parts, each run on its own with its exit code read: pytest exit 1
  (33 failed), engine_literals exit 0 "every number has a source", mypy exit 0 "no
  issues found in 56 source files", ruff check exit 0, ruff format --check exit 0.
- Every test in test_f1_windows.py, test_dates.py and test_f1_sourcing.py passes.
- The shipped pack by hand (f1 v2026.09): point 14 sweep case gives cannot_tell with
  conflict:stem.i765_filed_date.before_window_opens; point 18 case talk_to_dso
  grace_with_cap_gap, grace.ends null, capgap.ends 2027-01-15; point 19 case
  talk_to_dso unemployment_opt_card_at_or_over_limit, 105 used on the card, 45
  remaining; a late OPT filing gives conflict:opt.i765_filed_date.after_window_closes.

### Disputes: 33 older tests whose cases hold a row the SPEC now requires

- test_f1.py::test_file_by_is_no_open_item_once_the_filing_is_recorded (5): CASE_A files
  2026-03-10, the rows put the recommendation 2026-08-28 to 2026-09-13, after the filing.
  Point 11 raises opt.i765_filed_date.before_recommendation.
- test_f1_product.py facts rows [opt/stem.dso_recommendation_date.after_today] (5 tests
  each): the later recommendation is after the recorded filing, so point 11 raises
  before_recommendation beside after_today.
- test_f1_product.py facts rows [opt/stem.i765_filed_date.after_card] (5 tests each):
  the filing moved after the card is also past recommendation plus the rule's days, so
  point 11 raises after_file_by.
- test_f1_product.py::test_review_1_a_filing_dated_2030: 2030-01-01 is after the program
  window closes: point 15 raises opt.i765_filed_date.after_window_closes.
- test_f1_product.py::test_review_1_an_opt_card_of_three_years: the card through
  2028-10-31 runs past opt.complete_by: point 16 raises opt.ead_end.after_complete_by.
- test_f1_product.py::test_anything_open_is_cannot_tell_and_the_quiet_verdict_needs_every_part:
  tests/support/f1_pack.py conflicts_by_the_table does not know the seven new rows.
- test_f1_fixes.py::test_the_reviewers_far_dates_conflict_and_the_engine_does_not_walk_them:
  the card to 2099-12-31 raises point 16, whose about holds program_end_date, so the
  program items are null (test_f1_windows.py::test_a_new_window_conflict_nulls_the_items_that_use_its_dates
  requires exactly that).
- test_f1.py::test_case_b_has_every_item_once, test_dated_items_carry_the_date_unit_...[case_b],
  test_no_date_appears_that_the_pack_and_the_inputs_cannot_produce: ALL_IDS, UNITS and
  the expected set lack point 19's `unemployment.opt_card_days_used` (unit days).
- Point 16 says the conflict "carries reading"; a question has no field for it
  (additionalProperties false). The rule shown in `rules` carries the pack's derivation.

Status: escalated. No test was changed or worked around.

### After the stop hook

The stop hook ran the done command and printed the same failures: the second time.
engine/ESCALATE.md written. Status stays escalated. Nothing else changed.

## Run l-engine-5be53ef08a (attempt 1): merge points 11, 12, 14 to 19, 23, 24 and pass

- `git merge --no-edit lane/L-engine/l-engine-9492007270`: merge made; engine/dates.py,
  engine/f1.py and engine/PROGRESS.md came in. git printed "Operation not permitted" for
  tests/holdout/, which the sandbox closes to this lane; the merge went through.
- Done command, run as written with no pipe (output saved to a file under TMPDIR, exit
  code read from the shell): exit 0. pytest 220 passed, engine literals "every number
  has a source", mypy "no issues found in 56 source files", ruff check "All checks
  passed!", ruff format "8 files already formatted".
- Point 16 as clarified: the question `opt.ead_end.after_complete_by` carries id,
  because and about only; `note` in `_window_conflicts` calls `work.show`, so
  `opt.complete_within_months` is in `rules` with its derivation. Checked by hand
  against the shipped pack rulepacks/f1-us/v2026.09/parameters.yaml on 2026-10-20: card
  end on complete_by raises nothing; one day later raises the conflict, the question
  keys are [about, because, id], and rules holds the rule (value 14, months, settled,
  8 CFR 214.2(f)(10)(ii)(A)(3), derivation verbatim). The shipped pack also gave
  rules_stale on that day, which is expected: it was checked on 2026-09-28.
- No change to engine/ beyond the merge was needed.
- Status: done.

## Run l-engine-ac276e806b (attempt 1): points 20, 21, 22 and 25

### What was built (engine/f1.py)

- Point 20: `_add_periods` numbers the periods as the case lists them (from 1, as the
  conflict `employment_<n>_end` already does). A period that begins from `stem.ead_start`
  through `stem.ead_end` asks `employment.<n>.new_employer`, about the period's start and
  `stem.ead_start`. Yes gives `stem.new_plan_due.<n>` = start + `stem.new_plan_due_days`,
  an open item through the look-ahead (OPEN_ITEM_PREFIXES). A period on the STEM card
  whose end is recorded from the card start and before the card end gives
  `stem.concluding_evaluation_due.<n>` = end + `stem.evaluation_due_days`, reading true
  (new `reading` flag on `_Working.add`). Neither is asked or given while a STEM card date
  is missing or held in a conflict, or for a period whose end is before its start.
- Point 21: `_passed_reports` asks `<item>.made` for each validation, the 12-month
  evaluation, the final evaluation and each concluding evaluation whose date is before
  today, about {item id: date}. Yes marks the item done. No gives judgement
  `<item>.not_made`, and `stem.reporting_required` is shown in `rules` when the pack holds it.
- Point 22: each period with a recorded end asks `employment.<n>.end_reported`, about its
  start and end. No gives item `employment.<n>.end_report_by` = end +
  `opt.report_employer_within_days` (plus `opt.report_interruption` in rule_ids when the
  pack holds it; status stays guidance), and the open item `report_employer`.
- Point 25: rule_in_litigation only when today is after the last card end and a computed
  item or an upcoming entry carries alternates.

### What ran

- Done command as written, no pipe, output to a file: first exit 1 (mypy: tuple[str]
  assigned a two-tuple at the report rules); fixed with an annotation; second run exit 0:
  pytest all passed, "engine literals: every number has a source", mypy "no issues found
  in 56 source files", ruff "All checks passed!", "8 files already formatted".
- tests/unit on the worktree and on a git archive of HEAD under TMPDIR: 44 tests fail now
  that passed at HEAD, all on the new questions (list in REPORT.json disputes); 19 fail
  at HEAD and pass now. tests/unit/tools failures are the sandbox (sandbox_apply) in both.
- Shipped pack by hand (v2026.09) on the sweep case with a second period 2026-04-01 to
  2026-07-20: on 2026-09-28 the questions are new_employer, end_reported and
  concluding_evaluation_due.2.made (2026-07-30); on 2026-09-29 validation_1_due.made
  (2026-09-28) joins them. Verdict cannot_tell both days.

Status: done.

## Run l-engine-a61d663c4e (attempt 1): points 27, 28, 36 and 37

### What was built (engine/f1.py)

- Point 27: `_window_facts` raises `opt.ead_end.not_after_program_end` when the OPT card
  end is on or before `program_end_date`; about holds program_end_date, opt.ead_start and
  opt.ead_end, so point 4 nulls the items that use them. `opt.post_completion_definition`
  is shown in `rules` when the pack holds it. While it is open, no OPT step is marked done
  and `_add_next_step` and `_lists` are skipped. A yes goes to the judgement items as every
  conflict does.
- Point 28: `_Working.add` takes `on`, the day of the event a rule is measured from. The
  rule is looked up with `Rulepack.value(id, on)` under the operative regimes. With no row
  in force that day the item is null, carries no alternates, and the verdict carries
  `rule_not_in_force_on_event_day`. Used for opt.apply_window_opens, opt.apply_window_closes,
  opt.latest_start (on program_end_date) and grace.ends (on the last end). The point 15
  conflict also reads opt.apply_after_days on the program end.
- Point 36: `stem.new_plan_due.<n>` joins `work.reports`, so `_passed_reports` asks
  `<id>.made`. The concluding evaluation was already there.
- Point 37: already held (the point 16 conflict's about holds program_end_date); its tests
  passed before any change.

### What ran

- Target tests before the change: 19 failed (points 27, 28, 36). After: all passed.
- Done command as written, no pipe, output to a file: exit 0. "engine literals: every
  number has a source", mypy "no issues found in 56 source files", ruff "All checks
  passed!", "8 files already formatted".
- tests/unit/engine and tests/unit/api on the worktree and on a git archive of HEAD under
  TMPDIR: 11 failures now, 23 at HEAD. 8 fail now that passed at HEAD, all on the point 27
  conflict (cards that end on or before the program end): test_f1_sourcing.py
  test_the_earliest_opt_start_comes_from_the_settings (6 params), test_f1.py
  test_conflicting_dates_are_named_and_the_verdict_cannot_tell[opt_start_on_year_mark,
  opt_start_day_after_year_mark].
- Shipped pack by hand on A_WEEK_BEFORE: cannot_tell with the conflict, the rule shown as
  guidance; DAY_AFTER: no_open_items.

Status: done.

## Run l-engine-1c477e1c41 (attempt 1): points 39, 40, 42, 43, 46, 48, 49 and 50, plain words, regimes, answers_read

### What was built

- engine/f1.py
  - Point 39: the question `opt.earlier_at_this_level`, raised whenever an OPT block is
    entered, about degree_level, opt.ead_start and opt.ead_end. Yes gives the judgement
    item `opt.months_at_this_level` and shows `opt.max_months`.
  - Point 40: `_Working.add` takes `on` as one day or a day by rule id. Rules are looked
    up for the day of their event: the program end (window, latest start, complete_by),
    the recommendation (file_by and its conflicts), each card's start (unemployment
    limits, hours, card length, validations, evaluations, new plan, concluding
    evaluation), the OPT card end (STEM window), the period end (end report), the
    petition's filing day (capgap.ends). A row missing that day nulls the item and adds
    `rule_not_in_force_on_event_day`. For validations the holiday list must be in force on
    every day counted (`holidays_known`). Cap-gap: when `capgap.october_start_condition`
    is in force on the filing day, a requested start other than October 1 of the next
    fiscal year gives a null capgap.ends and the step back (no cap_gap_petition_not_active).
  - Point 42: a point 27 card answered yes is still pre-completion OPT: no OPT step is done,
    no STEM step, and no unemployment count.
  - Point 43: the conflict `employment.period_open_after_last_card` (about: each open
    period's start and the last card's end), raised after the last card and after an
    active cap-gap's end. The period still raises period_outside_cards for days outside
    the cards up to the last card end. Answered yes, grace.ends is null (my reading, as
    point 18; see REPORT.json disputes).
  - Point 46: `answers_read`, the ids whose answers `ask` read as yes or no.
  - Point 48: a validation or a 12-month evaluation dated after the STEM card's end is
    left out (`until`).
  - Point 49: rule_in_litigation only when an item and an alternate both hold values that
    differ.
  - Point 50: the end report of a period that ends on the STEM card uses
    `stem.report_change_within_days` (settled) when the pack holds it; otherwise the OPT
    guidance row, as before.
  - Contract: `rules[].plain` from the pack, and `regimes` for every regime an item or a
    date ahead names (legal_status, operative, plain, citation, url, checked_on).
- engine/dates.py: Juneteenth is listed only from 2021-06-17 (Pub. L. 117-17).
- engine/verdict.py: a cannot_tell verdict lists the judgement items after the blockers.
  The point 40 tests need `rule_not_in_force_on_event_day` in reasons beside
  rule_in_litigation.

### What ran

- test_f1_fix4.py: 43 failed before; all 57 pass after.
- Done command as written, output to a file, no pipe: exit 1. pytest: 45 failed, all in
  test_f1_fix2.py, test_f1_windows.py and test_f1_periods_and_reports.py, none in
  test_f1_fix4.py. engine_literals, mypy, ruff check and ruff format --check each pass
  when run alone ("every number has a source", "no issues found in 57 source files",
  "All checks passed!", "8 files already formatted").
- A scratch plugin under TMPDIR that leaves point 39 unasked and drops the point 43 fact:
  the three older files then pass in full (153). So every one of the 45 is a point 39 or
  point 43 collision.
- tests/unit/engine and tests/unit/api against a git archive of HEAD: 250 fail now that
  passed at HEAD, 42 pass now that failed. With points 39 and 43 off, 28 remain: the
  contract's two new output keys (15), point 48 (12) and the verdict's reasons (1).
- Shipped pack by hand: OPT_CASE and STEM_CASE settle to no_open_items; EARLY_STEM
  settles to talk_to_dso with rule_not_in_force_on_event_day.

Status: blocked. The done command needs the older tests reconciled.

Stop hook: the same 45 failures as the final run. That is the same failure twice, so the
status is escalated; see engine/ESCALATE.md.

## Run l-engine-f1008abd0f (attempt 1): merge of l-engine-1c477e1c41, points 51, 52 and 53

### What was done

- Merged lane/L-engine/l-engine-1c477e1c41 (points 39, 40, 42, 43, 46, 48, 49, 50, plain
  words, regimes, answers_read). No conflict.
- Point 51: kept. engine/verdict.py puts the blockers first, then the judgement items.
- Point 52: kept. engine/f1.py `grace_ends` is null while point 43 is answered yes.
- Point 53: engine/dates.py holds no date. `federal_holidays(year, juneteenth_listed=True)`,
  `is_business_day(d, is_holiday=None)`, `add_business_days(d, n, is_holiday=None)`.
  engine/f1.py `_Working.is_holiday(day)` reads the row of calendar.federal_holidays_law in
  force on each counted day; that row holds Juneteenth when its quote names the item
  "Juneteenth National Independence Day, June 19" as 6103(a) writes it. In the shipped pack
  the row from 2021-06-17 quotes the list and names it; the row to 2021-06-16 quotes the
  amendment note, which does not. The test pack's single row from 2000-01-01 has a
  placeholder quote, so it holds no Juneteenth, which is what
  test_point_40_a_2020_report_counts_june_19_as_a_business_day asks of the test pack.
  With no row in force, holidays_known nulls the date with the step back, as before.

### What ran

- Done command as written, no pipe, output to a file: exit 0. 57 passed in
  test_f1_fix4.py, "engine literals: every number has a source", mypy "no issues found in
  57 source files", ruff "All checks passed!", "8 files already formatted", no 2021 in
  engine/dates.py.
- tests/unit/engine and tests/unit/api: 250 fail now; 42 fail at ddb954d (all in
  test_f1_fix4.py, now passing). The same 250 fail at the merge commit 0d42c8b, before
  point 53, so point 53 changes no older test. The 250 come from the merged work: mostly
  the point 39 question opt.earlier_at_this_level, the new output keys answers_read and
  regimes, and point 48's validation count. Per file: test_f1_product 97, test_f1 54,
  test_f1_sourcing 28, test_f1_windows 24, test_f1_context 11, test_f1_periods_and_reports
  11, test_f1_fix2 10, api/test_compute_product 8, api/test_compute_context 3,
  api/test_compute 3, test_f1_fixes 1.

Status: done.

## Run l-engine-d51f38059e (attempt 1): points 55 and 56

### What was done

- Point 55: `_Working._alternates` skips a regime whose formula gives null, so an item
  carries an alternate only where the alternate holds a value. `regimes` follows, since it
  is built from the items' operative and alternates.
- Point 56: `_Working._item` no longer falls back to `_rule` (which raised RulepackError)
  when no row is in force on the event's day. The new `_row_shown(rule_id, day)` gives the
  row whose words the item shows: the row in force today, else the first operative row that
  takes effect after the event day (after today for an item with no event day, such as
  employment.periods_not_reported). A value measured from the event stays null and the
  verdict steps back with rule_not_in_force_on_event_day, as before. No number in code.

### What ran

- test_f1_fix5.py before: 12 failed (4 point 55, 8 point 56 with RulepackError on
  opt.report_employer_within_days at 2016-10-01 and 2024-09-01).
- Done command as written, output to a file, no pipe: exit 0. "engine literals: every
  number has a source", mypy "no issues found in 57 source files", ruff "All checks
  passed!", "8 files already formatted".
- tests/unit/engine and tests/unit/api against a git archive of HEAD: HEAD failed 12 (all
  test_f1_fix5.py); now 1 fails: test_f1_fixes.py::test_operative_always_comes_from_the_pack.
  Its drawn case (pending cap gap, STEM after OPT, clock 2024-01-02) has grace.ends null,
  and the test asks for grace.ends among the items with alternates; the line hit only by
  the failing case is the point 55 skip. A point 55 collision, for the next round.

Status: done.

## Run l-engine-746e3edbcc (attempt 1): points 59 and 60

### What was done

- Point 59: `_Working._rule` returns None and sets the step back instead of raising.
  `whole_rule` and `value_of` give None with the step back; `show` shows the nearest row's
  words (today's, else the first later, else the last earlier) and steps back.
  `_row_shown` no longer falls back to `_rule`: after the first later row it takes the
  last earlier one, and gives None only for a rule the pack does not hold at all, which
  `_item` drops (status then the last of STATUS_ORDER, value null, step back).
  `_item` reads a rule with no event day for today, so a rule with no row today gives
  null with the step back. `_validation_reports` counts the reports from the rows the
  items show (`whole_shown`, for the card's start), so each report is listed and null.
  `_judgement_items` skips the CPT bar when no row is in force today.
- Point 60: `employment.periods_not_reported` reads opt.report_employer_within_days for
  each period's start: the first start with no row in force gives null with the step
  back; else the row for the earliest start. No period: read for today. No number in code.

### What ran

- test_f1_fix6.py before: 13 failed (RulepackError on stem.validation_interval_months at
  2016-05-09, cpt.full_time_bar_days at 2002-12-31, and the point 60 counts).
- Done command as written, output to a file, no pipe: exit 0. 17 passed, "engine
  literals: every number has a source", mypy "no issues found in 57 source files", ruff
  "All checks passed!", "8 files already formatted".
- tests/unit/engine and tests/unit/api, a git archive of HEAD against now: HEAD 13 failed
  (all test_f1_fix6.py); now 3 fail, each a point 60 collision (a period that starts
  before 2025-05-19, the shipped row of opt.report_employer_within_days, so the verdict
  now carries rule_not_in_force_on_event_day):
  test_f1_fix2.py::test_point_28_the_shipped_pack_gives_a_program_that_ended_in_2024_its_dates
  (period from 2024-06-01),
  test_f1_fix4.py::test_point_40_a_petition_before_2025_01_17_for_october_1_is_read_with_the_october_row,
  test_f1_fix5.py::test_point_56_an_end_on_the_rows_first_day_is_dated. A spy plugin
  under TMPDIR showed the only lapsing item in all three is employment.periods_not_reported.

Status: done.

## l-engine-1f55dd3fc6 (attempt 1): remove the dead _Working.value_of

- Mission: gate 6 found untested changed lines in engine/f1.py; one is `_Working.value_of`,
  which nothing calls.
- `grep -rn value_of --include='*.py' .`: the only hits were the definition in engine/f1.py
  and a mention in the module docstring of tests/unit/engine/test_f1_fix6.py (text, not a call).
- Removed the method (5 lines). Nothing else changed.
- Done command as written, output to a file, no pipe: exit 0. pytest all dots, "engine
  literals: every number has a source", mypy "no issues found in 57 source files", ruff
  "All checks passed!", "8 files already formatted".

Status: done.

## l-engine-cb8e397e6a (attempt 1): point 63

### What was done

- `_Working.whole_shown` sets `not_in_force` when `_row_shown` finds no row (a rule the pack
  does not hold at all) and gives None, so the verdict carries
  rule_not_in_force_on_event_day. Its only callers are the interval and extension length in
  `_validation_reports`; no report is listed, as point 59 has it. No number in code.

### What ran

- Done command as written, output to a file, no pipe: exit 0. 12 passed, "engine literals:
  every number has a source", mypy "no issues found in 58 source files", ruff "All checks
  passed!", "8 files already formatted".
- tests/unit/engine and tests/unit/api, a git archive of HEAD against now: HEAD exit 1, 9
  failed (8 in test_f1_fix7.py, and test_f1_fix6.py::
  test_point_59_a_pack_without_the_interval_lists_no_validation_report, which already asked
  for point 63); now exit 0, none fail. No older test collides.

Status: done.

## l-engine-61ed2c8d55 (attempt 1): engine/path.py over records

### What was done

- engine/rulepack.py: `Rulepack` gains `path` (default None), and `validate_pack` keeps the
  pack's `path`. Nothing else in the loader changed.
- engine/path.py, new: `compute(case, packs, clock)`, the signature tests/unit/engine/test_path.py
  assumes. It reads the pack's path and names no kind, field, choice, stage, rule or category.
  It holds no number but 0 and 1 and no date.
  - Refuses a record whose kind or field the pack does not declare. The ValueError names the kind
    or field, never a value.
  - Stages: `for_each` over a selector, entered when every `entered_when` path is present. Id is
    `<stage>.<record>`, with `stage` and `record` in the output. State: done, current, later, next.
  - Dates (`when`): fact and paths through up to two links, `today`, `add` looked up with
    `Rulepack.value(id, on)` on the event day, earliest_of and latest_of with `optional`, `as_of`
    through a field's `history`, `in_year_of`, `in_fiscal_year_of` with `fiscal_year_rule`,
    `day_before`, `day_after`, `first`. Units: days, business_days, months, years.
  - A rule with no row on the event day gives `rule_not_in_force_on_event_day`, or
    `rule_copy_not_saved_for_event_day` when the first later row is `earliest_saved_copy`.
  - Windows: a computed item for opens and for closes, each with `record`. It goes into
    `upcoming` with `days_away` and `inputs` unless a `done_when` path is entered.
    Stage entries carry `windows` with days_away.
  - Next: `only_if` gives three answers. False hides the step. Unknown shows it: an absent field
    is asked as `<record>.<field>`, and not_sure gives `<record>.<field>.not_sure`. `bind` builds a
    record that is not entered yet. No question is asked about that record.
  - Conflicts: a happened date after today, a span that ends before it starts, a span longer than
    `longest`, and declared checks (conflict or judgement). The question id is the conflict id. A
    yes for the same `about` gives the judgement item.
  - Counters: days_without_qualifying_period (hours_rule, qualifying, not_qualifying),
    sum_of_days (each day once), sum_of_months, and count_of_records. Groups: record, chain,
    same_value, all. At or over the limit gives `<counter>.at_or_over_limit.<group>`.
  - Lists: every kind a selector or a history read uses needs `complete.<kind>`. For a kind that
    grows with time, a statement holds only on its own day.
  - `record.ends_before_today`, and D59 typed dates (`typed_dates.from_documents` with `about`,
    then `typed_dates.checked.<record>.<field>`).
  - Checklists from `path.checklists`, with confirmations `step.<checklist>.<step>`.
  - `category_not_covered:<id>` for a category with no pack, no path, or no stages.
- Verdict order: missing, conflict, list statements, stale or litigated rules, and category not
  covered all give cannot_tell. Next, judgement items give talk_to_dso. Next, the D59 reasons and
  record.ends_before_today give cannot_tell. Then open windows give needs_you. The two soft
  reasons come after judgement items because tests call for talk_to_dso while typed dates are
  unchecked (see REPORT disputes).

### What ran

- Done command as written, output to a file, no pipe: exit 0. 69 passed, "engine literals: every
  number has a source", mypy "no issues found in 61 source files", ruff "All checks passed!",
  "9 files already formatted".
- tests/unit/engine and tests/unit/api now, against a git archive of HEAD: HEAD 81 failed (55
  test_path, 12 test_typed_dates, 14 test_compute_generic). Now 14 fail, all in
  test_compute_generic.py (POST /v1/compute gives 404: an L-api route). No failure is new.
- By hand, the J01 case of programs.md with the shipped f1 pack on 2026-09-29: it computes,
  cannot_tell. The first run asked `missing:associate`, because `level_above: associate` names a
  choice and not a path. Fixed: a listed choice is taken as itself.

### Not done in this attempt

- compute_f1 as a translation (section 19): f1.py is unchanged. Parity over every older case is a
  round of its own.
- Regime alternates on path items, `ends_also`, `follows` or `gap_allowed`, periods outside a
  span, stage `lists`, and window_opens or window_closes references (these give null).

Status: done (done command). The translation is not done.
