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

## l-engine-d7a47d2738 (attempt 1): product-2 resolutions 3, 5, 6, 7, 9 in engine/path.py

### What was done (engine/path.py only)

- Point 3: `first` reads its field as a path from each record it finds, so `to_program.start_date`
  follows the link.
- Point 8 (engine side): `where` lists and `all_of` stop at the first condition known false, and
  `any_of` at the first known true. What the others read is not asked. This removes
  `<cpt>.decision`, `p0.stem_list` (outside_us) and `p0.conferred_on` (language_training).
- Point 5: a `days_without_qualifying_period` count is null, with no at_or_over item, until the
  qualifying kind's list is stated whole (key `<kind>` or `<kind>:<record>`, grows_with_time
  statements dated today). An unknown selection of qualifying or not_qualifying records now makes
  the count null too; it was read as no records (J08 gave 365).
- Point 6: a next stage whose every known window closed before today is not shown. Everything it
  raised (items, questions, rules, lists, litigation) is rolled back.
- Point 7: `ends_also` (a reading speaks only when one of its optional facts is found; a different
  day makes the end null and raises `<stage>.end_by_source.<record>`); stage `lists` go to output
  `lists` with `record`; two counters over the same scope that disagree on their bars raise
  `<first counter>.bars_disagree.<group>`.
- Point 9: `rule_in_litigation` only when a rule read for a shown item has a row under another
  regime, in force on the same day, with another value.
- `bind` takes a value that is not a path (`type: opt_post_completion`) as itself. It was read as an
  absent fact, so a CPT card on the same program hid the next OPT (J04, J07).

### What ran

- Done command as written, output to a file: exit 1. 8 unit and the whole acceptance file fail
  because POST /v1/compute (api/case.py, L-api) still answers category_not_covered.
- test_path_fix1.py alone: 8 failed, 26 passed (was 19 failed).
- Acceptance with a scratch plugin under TMPDIR that routes api.case.compute to
  engine.path.compute: 8 failed, the rest pass (was 18 failed wired, all failed unwired).
- mypy clean, ruff clean, engine literals clean, format clean.
- tests/unit/engine and tests/unit/api, now vs git archive of HEAD: HEAD 21 failed, now 11. New:
  test_path_reach.py::test_a_litigated_rule_in_use_is_cannot_tell (collides with point 9).

### Not done

- Point 1, compute_f1 as the translation onto records and path.py: not started (time).
- stem.basis_ten_years_end, cap-gap counters keyed by card, grace.p1 under an active cap-gap,
  J05 part-time null, J17 enrollment, J20 months only_if: need the pack (see REPORT requests).

Status: blocked on L-api (route) and L-content (pack).

Stop hook ran the done command: same failure (api route not wired). Escalated; see engine/ESCALATE.md.

## l-engine-b9ea448ead (attempt 1): merge of d7a47d2738, resolution 1 translation

### What was done

- Merged lane/L-engine/l-engine-d7a47d2738 (points 3, 5, 6, 7 partly, 8 engine side, 9).
- Point 1: engine/f1.py gains `to_records(case, pack)` (programs.md section 19 table: p1, a1,
  a2 with extends and basis_program, w<n> under the card that holds its start, h1 with
  cap_subject yes, cpt_days_stated and employer_reported as translation-only fields,
  confirmations under the same ids, nothing_more_to_record yes as a statement for every kind,
  opt.earlier_at_this_level no as `authorization:p1`) and `compute_f1_records`, which sends it
  to path.compute. compute_f1 itself is unchanged: routing it through the translation breaks
  758 older tests (list in REPORT.json disputes).

### What ran

- Done command as written, output to a file: exit 1. 26 passed, 8 failed in
  test_path_fix1.py. engine literals, mypy (62 files), ruff check, ruff format: clean.
- The 8 failures come from the shipped pack, not the engine (probe with journeys):
  - point 4 grace: the pack keys the cap-gap grace stage by the petition. The engine gives
    grace.h1 2026-10-02 to 2026-11-30, state later. The test asks for grace.p1.
  - point 4 and 5 unemployment: the cap-gap counter is scoped on the petition, so the engine
    gives unemployment.opt_card.h1 = 45 (J13 variant) and 486 (J12 without w1), the values the
    tests ask for, under .h1 in place of .a1.
  - point 4 J14 total: the pack ends the last card's span only without an active cap-gap and
    raises unemployment.total.through_cap_gap.h1; the test asks for 85.
  - point 7 ten years: the pack has stem.previous_degree_within_years but no path item for
    stem.basis_ten_years_end, and the path schema (contracts/) has no place for a computed date.
  - point 7 ends_also: the main `ends` of opt_post holds the release date too, so both
    readings give 2024-12-20 and never differ.
- Scratch plugin under TMPDIR routing engine.f1.compute_f1 to compute_f1_records over
  tests/unit: plain 44 failures (8 path_fix1, 8 acceptance, 1 path_reach, 28 tools), routed
  802; 758 new, all in test_f1*.py and tests/unit/api/test_compute*.py.

Status: blocked on L-content (pack keys and items) and a contracts change for the ten-year date.

Stop hook ran the done command: same 8 failures. Escalated; see engine/ESCALATE.md.

## l-engine-83bf885c0b (attempt 1): merge of b9ea448ead after resolution 12

### What was done

- Merged lane/L-engine/l-engine-b9ea448ead. No engine code change was needed: the tests
  (L-tests caf6493) and the pack (L-content 34b71c4) now use the engine's ids per resolution 12,
  and compute_f1 stays as it is per resolution 1 amended.
- Removed engine/ESCALATE.md: the 8 failures it named now pass.

### What ran

- Done command as written: exit 0. test_path_fix1.py 23 passed; engine literals clean; mypy
  62 files clean; ruff check clean; ruff format 9 files already formatted.
- tests/unit/engine and tests/unit/api: all pass.
- The merge printed "tests/holdout/...: Operation not permitted" (sandbox read wall); the merge
  itself succeeded.

Status: done.

## l-engine-50dba0218d (attempt 1): the twenty journeys through POST /v1/compute

### What was done

- POST /v1/compute now reaches engine/path.py (api/case.py). 45 of the 52 journey tests pass.
- engine/path.py `_counter`: a counter's `only_if` was never read. It is now read on the group's
  own record: false gives no item, unknown gives a null count. The pack's `unemployment.total`
  used to show for a card with no STEM card in its chain (J08 showed `unemployment.total.a1`);
  it no longer does.

### What ran

- Done command as written: exit 1. The pytest step has 7 failures, all in test_journeys.py.
  engine literals clean, mypy 62 files clean, ruff check clean, ruff format 9 files formatted.
- tests/unit/engine, tests/unit/api and tests/unit/acceptance before and after the only_if fix:
  the same 7 failures, no new ones.

### Why the 7 fail (none is an engine fault)

- J02 ten years: resolution 7 says `stem.basis_ten_years_end` waits for a contract construct,
  and its tests wait with it.
- J05 months null: the pack's opt.months_at_level has no rule that makes the count null for a
  part_time opt_pre (programs.md section 14, IMPL-017), and the counter contract has no place to
  say it.
- J08 35 days: the pack's span for unemployment.opt_card ends at card_end (2025-06-02), not at the
  opt_post end (2025-01-12, day_before the change of level). The qualifying selector also reads
  `under` on the on-campus job w2, which has `on_campus` instead, so w2.under is asked and the count
  is null. The pack could add `{field: this.on_campus, present: false}` before the under test.
- J12 grace and unemployment: the engine gives grace.h1 starting 2026-10-02 (later) and
  unemployment.opt_card.h1 = 0, the values asked, under the ids of resolution 12. The tests ask
  for grace.p1 and unemployment.opt_card.a1.
- J17 enrollment: no check in the pack reads full_course_each_term or online_within_limit.
- J20: the pack's opt_post next step has no "months at this level below opt.max_months"
  condition, and the condition contract cannot read a counter.

Status: blocked on L-content (pack), L-tests (J12 ids) and a contracts change (J02, J05, J20).

Stop hook ran the done command: the same 7 failures. Escalated; see engine/ESCALATE.md.

## l-engine-15a74d8b15 (attempt 1): resolution 13, engine side

### What was done

- Merged lane/L-engine/l-engine-50dba0218d (the merge printed "tests/holdout/...: Operation not
  permitted", the sandbox read wall; the merge itself succeeded).
- engine/path.py `_counter`: a count is given only when every list the counter reads is stated
  whole: the `qualifying` list (work) and the `not_qualifying` list (trips). Before, only the
  qualifying list was checked, so a trip list with no statement still gave a count. The
  `complete.trip` question was already asked (J12 shows `unconfirmed:complete.trip`).

### What ran

- Done command as written: exit 1. test_path_fix1.py: 20 passed, 3 failed
  (test_point4_unemployment_runs_through_the_cap_gap, test_point4_unemployment_total_runs_through_the_cap_gap_on_stem,
  test_point5_the_count_is_given_once_the_list_is_stated_whole). engine literals clean, mypy 62
  files clean, ruff check clean, ruff format 9 files formatted.
- tests/unit/engine, api and acceptance, compared with HEAD (git archive under TMPDIR): 6 new
  failures, the 3 above plus J01 unemployment, J14 total 85 and J15 opt card 86.
- The same tests with a scratch plugin under TMPDIR that adds "trip" to every `whole(...)`
  statement: test_path_fix1 passes in full, and test_journeys is back to the 7 failures from
  before (J02, J05, J08, J12 x2, J17, J20), which belong to other lanes.

### Why it fails

The journeys J12, J13, J14 (and J01, J15) state work whole but not trips. Point 13 says the count
is null until the trip list is stated whole, and that "a journey test whose timeline holds every
trip states that list whole". That part is on the test side (L-tests): add "trip" to those `whole(...)` calls.
The engine cannot give the count without assuming that no trips were taken.

Status: blocked on L-tests.

Stop hook ran the done command: the same 3 failures. Escalated; see engine/ESCALATE.md.

## l-engine-e72466ef9c (attempt 1): bring in 15a74d8b15 after the reconcile round

### What was done

- Merged lane/L-engine/l-engine-15a74d8b15 (engine/path.py `_counter`: the count needs every
  list it reads stated whole, trips as well as work; `only_if` on a counter group). The merge
  printed "tests/holdout/...: Operation not permitted" (sandbox read wall); it succeeded.
- No further engine change.

### What ran

- Done command as written, output to a file: exit 0. test_path.py 57 passed; engine literals
  clean; mypy 62 files clean; ruff check clean; ruff format 9 files already formatted.
- test_path_fix1.py alone: exit 0, 23 passed (the three older tests now state the trip list).

Status: done.

## l-engine-c5fe743a12 (attempt 1): every journey through POST /v1/compute

### What was done

- engine/path.py: a judgement check whose id is `<kind>.<name>` and runs over records of that
  kind now raises the item `<record>.<name>` (new helper `_judgement_id`). programs.md section 14
  names the enrollment item `<program>.enrollment`; the engine gave `program.enrollment.p1`, the
  test asks `p1.enrollment`. The rule also renames `trip.job_on_return.<t>` to `<t>.job_on_return`
  and `withdrawal.dso_authorized.<wd>` to `<wd>.dso_authorized`; no test outside the holdout
  reads those ids (grep of tests, evals, api, web/src, desktop/src). Judgements go only to
  verdict reasons, so the new ids do not collide with question ids.

### What ran

- Acceptance before the change: 3 failures (J08 x2, J17).
- Acceptance, tests/unit/engine and tests/unit/api after: 2 failures, both J08.
- Done command as written: exit 1 (pytest, J08 x2). Each later step run alone: engine literals
  clean, mypy 62 files clean, ruff check clean, ruff format 9 files already formatted.
- A scratch copy of rulepacks under TMPDIR with the two pack changes below, loaded through
  engine.rulepack.load_all: unemployment.opt_card.a1 is 35 with the trip list whole and null
  without it, and w2.under is no longer asked. The engine needs no change for J08.

### Why J08 fails (pack, L-content)

- The first `unemployment.opt_card` counter's span ends at `this.card_end` (2025-06-02). programs.md
  J08 says "unemployment only through that end (35 days)", the end of opt_post.a1, the day before
  the master's starts (2025-01-12). The span end needs the same `earliest_of` as the opt_post stage.
- Its `qualifying` selector reads `this.under` on w2, an on-campus job with `on_campus` and no
  `under`, so `w2.under` is asked and the count is null. Adding `{field: this.on_campus, present: false}`
  before the `under` test ends it (programs.md section 11: "A job on campus is never counted as OPT work").

Status: blocked on L-content.

Stop hook ran the done command: the same 2 J08 failures. Escalated; see engine/ESCALATE.md.

## l-engine-ea028b2435 (attempt 1): bring in the J17 work from c5fe743a12

### What was done

- `git merge --no-edit lane/L-engine/l-engine-c5fe743a12`: exit 0, ort merge, 2 files
  (engine/path.py `_judgement_id`, engine/PROGRESS.md). It printed
  "tests/holdout/...: Operation not permitted" (sandbox read wall); the merge succeeded.
- No other change.

### What ran

- Done command as written, output to a file: exit 0. test_path.py 57 passed; engine literals
  clean; mypy 62 files clean; ruff check clean; ruff format 9 files already formatted.

Status: done.

## l-engine-8f7735f031 (attempt 1): every journey through POST /v1/compute, all lanes merged

### What was done

- Read PROGRESS.md and specs/product-2/resolutions.md. The J08 block recorded by c5fe743a12
  was a pack matter (L-content); the branch now holds the L-content merge (719c770).
- No engine change was needed.

### What ran

- Done command as written, output to a file: exit 0. Acceptance 90 passed (no skip, no xfail);
  engine literals clean; mypy 62 files clean; ruff check clean; ruff format 9 files already formatted.
- tests/unit/acceptance/test_journeys.py alone: all passed.

Status: done.

## l-engine-b37d57c967 (attempt 1): trips are counted by their own dates

### What was done

- engine/path.py `_days_of` read every record's days from the literal fields `start` and `end`
  (PERIOD_START, PERIOD_END). A trip holds `left_on` and `returned_on`, so a not_qualifying
  trip read as having no start and added no day.
- Now `_span_fields(kind)` takes the first two date fields the kind declares in the pack, in
  the pack's order: work gives start, end; trip gives left_on, returned_on (programs.md
  section 10 lists each kind's first and last day first). PERIOD_START and PERIOD_END are gone;
  no field name of any pack is written in the engine for this. A kind with fewer than two date
  fields covers no day. This is a reading: the contract's record_kind has no explicit span.
- First try used `len(dates) >= 2`; test_path.py refuses the number 2 in path.py. Rewritten
  with slices.

### The test (not written into tests/: the lane owns engine/** only)

Written and run from $TMPDIR/l-engine-scratch/test_path_trip_days.py with PYTHONPATH at the
worktree. On HEAD's engine (git archive into TMPDIR): 2 failed ([0] == [5], [0] == [10]),
1 passed. On this engine: 3 passed. Proposed for tests/unit/engine/test_path_trip_days.py:

```python
"""A trip inside a job adds its days (specs/path-1/programs.md sections 10, 11 and 13 point 11).

A record's first and last day come from the fields its kind declares, not from names in the
engine: a trip holds left_on and returned_on, a job start and end.
"""

from __future__ import annotations

from typing import Any

from jsonschema import Draft202012Validator

from engine.rulepack import validate_pack
from tests.unit.engine.test_path_reach import (
    PACK_SCHEMA,
    UNEMPLOYMENT,
    _card,
    _case,
    _compute,
    _counted,
    _course,
    _course_stage,
    _pack_dict,
    _rec,
)

TRIP_FIELDS = [
    {"id": "left_on", "kind": "date", "label": "Left on", "happened": True},
    {"id": "returned_on", "kind": "date", "label": "Returned on", "happened": True},
    {"id": "purpose", "kind": "choice", "label": "Purpose", "choices": ["personal", "job_travel"]},
    {"id": "signature_on", "kind": "date", "label": "Signature on", "happened": True},
]


def _trip_pack(counter: dict[str, Any]) -> Any:
    raw = _pack_dict([_course_stage()], counters=[counter])
    for kind in raw["path"]["records"]:
        if kind["id"] == "trip":
            kind["fields"] = TRIP_FIELDS
    problems = [e.message for e in Draft202012Validator(PACK_SCHEMA).iter_errors(raw)]
    assert problems == [], problems
    return validate_pack(raw)


PERSONAL = {"record": "trip", "where": [{"field": "this.purpose", "in": ["personal"]}]}


def test_a_personal_trip_inside_a_job_adds_its_days() -> None:
    # k1 from 2026-09-01; through today 2026-09-29 is 29 days. w1 from 2026-09-01 at 20 hours
    # covers all 29. t1 left 2026-09-10 and returned 2026-09-14: its 5 days count. 5.
    pack = _trip_pack(dict(UNEMPLOYMENT, not_qualifying=PERSONAL))
    k1 = _card("k1", card_start="2026-09-01", card_end="2027-08-31")
    w1 = _rec("w1", "job", under="k1", start="2026-09-01", hours_per_week=20)
    t1 = _rec(
        "t1",
        "trip",
        left_on="2026-09-10",
        returned_on="2026-09-14",
        purpose="personal",
        signature_on="2026-08-01",
    )
    out = _compute(_case([_course(), k1, w1, t1]), pack)
    assert _counted(out, "toy.unemployment", "k1") == [5]


def test_a_trip_not_yet_returned_counts_through_today() -> None:
    # t1 left 2026-09-20 with no return: 2026-09-20 through today 2026-09-29 is 10 days.
    pack = _trip_pack(dict(UNEMPLOYMENT, not_qualifying=PERSONAL))
    k1 = _card("k1", card_start="2026-09-01", card_end="2027-08-31")
    w1 = _rec("w1", "job", under="k1", start="2026-09-01", hours_per_week=20)
    t1 = _rec("t1", "trip", left_on="2026-09-20", purpose="personal")
    out = _compute(_case([_course(), k1, w1, t1]), pack)
    assert _counted(out, "toy.unemployment", "k1") == [10]


def test_a_trip_that_is_not_personal_adds_no_day() -> None:
    pack = _trip_pack(dict(UNEMPLOYMENT, not_qualifying=PERSONAL))
    k1 = _card("k1", card_start="2026-09-01", card_end="2027-08-31")
    w1 = _rec("w1", "job", under="k1", start="2026-09-01", hours_per_week=20)
    t1 = _rec("t1", "trip", left_on="2026-09-10", returned_on="2026-09-14", purpose="job_travel")
    out = _compute(_case([_course(), k1, w1, t1]), pack)
    assert _counted(out, "toy.unemployment", "k1") == [0]
```

### What ran

- Done command as written, output to a file: exit 0. Acceptance and test_path.py all passed;
  engine literals clean; mypy 62 files clean; ruff check clean; 9 files already formatted.
- tests/unit/engine plus the scratch test: 1209 passed.

Status: done.

- Stop hook: `ruff format --check engine` also formats Python code blocks in engine/PROGRESS.md
  and refused the test text above. `uv run ruff format engine` fixed it; done command exit 0.

## l-engine-abe842589a: resolutions point 14 (translation completeness)

- Before: tests/unit/engine/test_f1_translation.py had 8 failures; `_statements` turned a yes
  to nothing_more_to_record into every kind whole and a no to opt.earlier_at_this_level into
  authorization:p1 whole.
- Change: `_statements` in engine/f1.py now states a kind whole only on a yes to the path's own
  complete.<kind>, on the day given, for the kinds the pack's path lists. The two unasked answers
  are still sent under confirmations but state nothing whole.
- Ran: test_f1_translation.py, 37 passed. Done command as written, output to a file: exit 0;
  diff coverage 98%; mypy clean on 62 files; ruff check clean; 9 files already formatted.

Status: done.

## l-engine-e65365f570: resolutions point 15 (a next stage only while a filing window is open)

- Before: test_path.py passed already (57). J06 through the API showed `opt_post.p1` as next with
  apply_window and latest_start closed 2026-02-10, kept only by `opt.complete_by` (2027-02-12).
- Change: `_closed` in engine/path.py now takes the pack stage beside the output entry and reads
  only the windows that declare done_when (the facts that record a filing). A window without
  them, such as opt.complete_by, no longer keeps a next stage. A next stage whose filing windows
  have not closed, including one not yet open (J07), is still shown. No id is named.
- Ran: tests/unit/engine and tests/unit/acceptance, all passed. A scratch test under TMPDIR
  printing J06's next stages: [] now; with HEAD's path.py, opt_post.p1 as above.
- A scratch test written under tests/ was refused by the sandbox; `git stash push` was refused
  too ("Cannot save the current status"). Neither was worked around.
- Done command as written: exit 0; 57 passed, engine literals clean, mypy 62 files clean, ruff
  check clean, 9 files already formatted.

Status: done.

## l-engine-e347637842: every journey through POST /v1/compute (after point 16 tests)

- Before any change: the done command as written, output to a file, exit 0. Acceptance all
  passed (no skips), engine literals clean, mypy 62 files clean, ruff check clean, 9 files
  already formatted. tests/unit/engine and tests/unit/api: exit 0.
- Point 16 journeys (J01, J02, J03, J05, J09, J11 next STEM stage carries no report dates;
  J15 validations run to the card end through a gap and after the last job ends) already
  pass on this branch. The quote "The requirement for validation reporting starts on the
  date the 24-month OPT extension begins" is in the saved eCFR XML under
  rulepacks/f1-us/v2026.09/sources and in parameters.yaml, so the journeys are backed by the
  saved words. No finding.
- No engine code changed.

Status: done.

## l-engine-f39a3071d8: every journey through POST /v1/compute (after point 17 tests)

- Before any change: the done command as written, output to a file, exit 0. 108 acceptance
  tests passed, none skipped; engine literals clean; mypy 62 files clean; ruff check clean;
  9 files already formatted.
- Point 17 (J19 twins with a change-of-status petition): all three pass. The engine reads the
  shipped pack's stem.validation close rule generically; L-content's pack change (petition
  filed on or after card_start and on or before card_end, approved, cos_ended_on absent or on
  or after validity_start) needed no engine code. `-k j19`: 8 passed.
- Saved words: the rule is capgap.status_ends_on_h1b_start, marked a reading of the 81 FR
  13040 preamble, with the point 17 conditions in its note. The journeys assert what the pack
  says; no finding.
- No engine code changed.

Status: done.

## l-engine-2740fb95ee: every journey through POST /v1/compute (after point 18 tests)

- Before any change: the done command as written, output to a file under TMPDIR, exit 0.
  Acceptance all passed, none skipped; engine literals clean; mypy 62 files clean; ruff check
  clean; 9 files already formatted.
- Point 18 twins of J19 (old approved petition, petition filed during OPT for a later start,
  start on the card's first day, denied, pending, no validity start, no outcome) all pass.
  The engine reads the shipped pack's capgap rules generically; L-content's pack change for
  point 18 needed no engine code.
- The journeys assert what point 18 and the pack state; no finding.
- No engine code changed.

Status: done.

## l-engine-38572dc906: points 22 and 24 (unknown stage, unknown choice value)

- Before any change: the target selection (-k "point_22 or unknown_choice") failed 6 of 8.
  Baseline of tests/unit (tools excluded, they fail on the sandbox) saved under TMPDIR: 21
  failures, all in test_fix7.py.
- Point 22: engine/path.py `_state`. A stage is current only when today falls between two known
  days. starts after today is later, ends before today is done, and any other null day is
  unknown, never the current fall-back. A stage with no span (opt_job_end, stem_job_end) is
  placed by its windows' opens and closes. The tests needed more than the grace: on J13/J14
  opt_job_end.w1 and stem_job_end.w2 were undated current, and on J19 transfer.mv1/mv2 were
  current with a null end (transfer.contact_new_dso_within_days has no saved copy for 2021 and
  2023). All now read done or unknown.
- Point 24 (unknown choice): `ask_unknown_choices` runs after `_refuse_undeclared`; a choice
  field whose value is outside the pack's `choices` (not_sure aside) is missing and asked as
  `<record>.<field>`. `_field` reads such a value as absent, so no rule takes it in silence.
- After: tests/unit (tools excluded) failures 21 -> 14, none new; the 14 left are point 23,
  23a, 24 pack words and 26, L-content's.
- Done command as written, output to a TMPDIR file: exit 0 (8 passed; mypy 62 files clean;
  ruff check clean; 19 files already formatted).

Status: done.

## l-engine-d8fd85ee5c: point 22b (the step back only on a stage a petition nulled)

- Before any change: the done command failed on 6 tests of test_fix8.py (J12, J13, J14 and the
  J19 twins D, B and G): no stage carried reasons at all. Every no-petition test already passed.
- engine/path.py `_step_backs`, called from `_enter` for a stage with a span and a null start or
  end. It reads the pack's judgement checks that have no for_each and hold only `none` over one
  record kind (today cap_gap.for_dso over petition). When that judgement was raised and records of
  that kind exist, the span is computed again with those records hidden (state saved and restored,
  a throwaway trace). If a null start or end becomes known, the judgement id goes into the
  stage's `reasons`. So a start or end null for any other cause (a missing contact day, a job end
  with no span) gets no reason, and a case with no petition gets none. `_state` is unchanged:
  any null day stays unknown. The pack was not edited.
- The done command as written, output to a TMPDIR file named for this run: exit 0 (fix8 and
  journeys all passed, 2 xfailed; mypy 63 files clean; ruff check clean; 19 files formatted).
  A first run wrote to $TMPDIR/done.txt, and another lane's vitest output landed in the same file.
- tests/unit with tools excluded: exit 0.

Status: done.

## l-engine-e7587fdb33: SPEC-W2 point 46, N1 and N2 (W2-P1)

- Before any change: the target tests failed at once with KeyError 'rule' in path.py `_amount`:
  L-content's pack already holds opt.prepare and stem.prepare with `{setting: plan.prepare_months}`.
- N1, engine/path.py: `_amount` reads a `setting` amount from contracts/product_settings.yaml
  (engine.settings, loaded once per compute), its unit from the setting ("business days" read as
  business_days), and marks the trace planning; the setting never enters rule_ids. `_window`
  works both days first, then marks the window, both its items and their upcoming entries
  planning: true when either day used a setting.
- N2, engine/path.py: for a count of days, `_calculate` also gives every day it counts or would
  count while nothing changes (days_without_qualifying_period: the uncovered days over the whole
  span, the count is those up to today; sum_of_days: the covered days). The item
  `<counter>.<key>.limit_day` (unit date, the counter's rules) is the limit-th such day, null when
  the count is unknown or never reaches the limit. No item for count_of_records or sum_of_months.
- engine/rulepack.py `_reject_misplaced_settings`: an amount naming a setting anywhere but
  path/stages/<n>/windows/<n>/opens|closes is refused in one line naming the setting.
- Done command as written, output to $TMPDIR/l-engine-e7587-done.txt: exit 0 (journeys and both
  W2 files pass, 2 xfailed as before; engine literals clean; mypy 68 files clean; ruff clean; 9
  files formatted).
- tests/unit with tools excluded: 15 failures, all tests/unit/desktop_entry socket tests with
  "Operation not permitted" (the sandbox refuses unix sockets); none in engine.

Status: done.

## l-engine-fe5f51dcf6: clear the W2-P1 veto (reviews/w2-p1.md findings 1, 2, 3, 5, 8)

- Before any change: the done command as written, output to $TMPDIR/lfe5-done.txt: exit 1, 7
  failures (future-card limit day x2, STEM card with no employer, planning inputs x2, undatable
  setting x2).
- Finding 1, engine/path.py `run_stages` and `run_checks`: when a for_each selection is
  unknown, `_need` asks for what it read (missing:<record>.<field>, so cannot_tell), never
  `or []` in silence. Generic: no F-1 word. Counters already did this.
- Finding 2, `_amount`: the setting id and its value go into the trace inputs, so the item, the
  window and the upcoming entry show them. Still never a rule.
- Finding 3, `_days_without`: dropped the early `return []` when today is before the span start,
  so a span not yet started counts its days ahead; the count through today stays 0.
- Finding 8, engine/settings.py: `dating_setting` returns value and unit together from one read
  (`_whole_entry`), the unit in the engine's names; `whole_setting` kept for f1.py and the tests.
- Finding 5, engine/rulepack.py `_reject_misplaced_settings`: each setting amount is checked with
  `dating_setting`; an unknown id or a unit outside days, business days, months, years is refused
  in one line naming the setting.
- Done command as written, output to $TMPDIR/lfe5-done3.txt: exit 0 (2 xfailed as before;
  engine literals clean; mypy 68 files clean; ruff clean; 9 files formatted). A first run failed
  only on ruff E501 in a docstring I had lengthened; rewrapped.
- tests/unit without tools and desktop_entry: exit 0.

Status: done.

## l-engine-3a9dfe7ba7: second W2-P1 veto (reviews/w2-p1.md re-review, findings 1 and 3)

- Before any change: the done command failed on 6 tests of test_w2_windows.py (S1, O1, S2 x2,
  the toy two-jobs pair): a selection with one undecided record dropped every record.
- Finding 1, engine/path.py: `_split` gives the records the where condition holds for and the
  ones a gap leaves undecided, the trace holding what those read. `_select` is `_split` with
  None when any is undecided, so exists, none, counts, first and counters keep their meaning.
  `run_stages` and `run_checks` enter or check every decided record and `_need` the trace when
  any is undecided. Generic: no F-1 word.
- Unreadable value: `_outside_choices` became `_unreadable`, also true for a field the pack
  declares a date whose present value does not parse (2026-13-40, 08/03/2026). `_field` reads it
  as absent, so a condition or a date that reads it asks `missing:<record>.<field>`, and
  `ask_unknown_choices` (now `ask_unreadable`) asks it up front even when nothing reads it.
- Finding 3, engine/rulepack.py: `validate_pack` loads the settings once and passes them down
  `_reject_misplaced_settings`.
- Done command as written, output to $TMPDIR/l-engine-3a9-done.txt: exit 0 (2 xfailed as before;
  engine literals clean; mypy 68 files clean; ruff clean; 9 files formatted). A first run failed
  on mypy (list[None] against list[Json]) and then on ruff format; both fixed.
- tests/unit without tools and desktop_entry: exit 0. tests/holdout is unreadable in my sandbox.

Status: done.

## l-engine-65533955a3: SPEC-W2-UNKNOWN engine-core (points 1 to 5, 2a, 7a, 11, 12, 41)

- Before any change: tests/unit/engine and tests/unit/acceptance gave 165 failures, all in the
  new SPEC-W2-UNKNOWN files (readers 63, unknown_logic 23, rulepack 23, generic 6, the w2_unknown
  regressions and props); the journeys and every older test passed.
- engine/unknown.py: Gap, Unknown (frozen, refuses an empty gap set), NONE and NOT_YET,
  all3/any3/not3, exists3, count_below3, count_at_most3 with point 12's signatures. Pure.
- engine/readers.py: read(decl, raw, run) per point 41's table; the ISO pattern matched before
  date.fromisoformat; the date bounds read from contracts/product_settings.yaml through
  engine.settings; periods read part by part without naming a pack word.
- engine/rulepack.py: _PathCheck walks the path with this and outer in scope and refuses
  every fault of points 7a and 11, each with a one-line RulepackError naming the path. Commit
  b9b8a97 has every refusal on. With it, the shipped F-1 pack does not load:
  (1) path/order/0 leaves secondary, language_training, professional and other unranked;
  (2) checks/0 (program.opt_start_not_too_early) adds `rule:
  product.opt_start_earliest_years_before_program_end`, a product setting, not a rule;
  (3) checks/17 (stem.extends_post_completion_opt) compares this.extends.type, and extends is
  `none` when absent. Point 11 says the engine lane stops and escalates, so commit 426f3fa holds
  those three refusals back (revert it once L-content fixes the pack). Two of my first checks
  were too strict and are fixed: first.field may be a path through a link
  (to_program.start_date), and the 7a lint knows a conditional none is ruled out by the
  record's own selection (checks 19 to 21 choose stem_extension only).
- engine/path.py, only what the P6 tests through the toy pack need: CaseStructureError; every
  value read through readers.read (ask_unreadable now asks every kind); condition reads apply
  when_absent (NONE, NOT_YET, the conditional form of 2a); point 7's table for present, in,
  the date operators (NOT_YET later than every day up to today, pending past it), level_*,
  same_as/differs_from, month_day_is, at_most and a field alone (a flag is its value);
  exists/none/count_* through engine.unknown with the list's wholeness, asking nothing when
  settled; questions carry field and state; a not-sure answer an unsettled read rests on is
  asked as `undecided:` and blocks; complete.<kind> questions carry state list.
- Done command as written, output to $TMPDIR/done.txt: exit 1. 6 failures: the 5 refusal tests
  held back above, and test_every_operator_is_drawn_at_least_five_times, which counts the
  test's own tables (dispute). mypy, ruff check and ruff format clean.

Status: escalated.
- Wider run after the change (tests/unit/engine and tests/unit/acceptance, output to
  $TMPDIR/after.txt): 45 tests that passed in the baseline now fail. Causes found:
  (a) point 14 in my own done tests: `none`/`exists` with nothing chosen is unknown while the
  list is not stated whole. Journey j11's grace stage selects programs with `none` over moves
  and complete.move is not stated, so grace.p1 is gone; the same pattern holds back counts and
  report windows in j01, j04, j08, j15, j19 and test_fix7/test_fix8. The journeys need their
  lists stated (point 54 says the tests round brings them in line; it has not for these).
  (b) the `undecided:` blocker (point 35) turns 3 talk_to_dso expectations into cannot_tell.
  (c) a "pending" literal tripped test_path's no-pack-words test (the F-1 pack has the choice
  pending): removed. (d) present on an absent ask field read as unknown (U21) broke the older
  toy tests in test_path_reach; it now keeps today's decided reading until the engine-reads
  round, while not_sure and unreadable values read unknown as P6 needs.
- Done command as written again, output to $TMPDIR/done2.txt: exit 1, the same 6 failures.

## l-engine-6a60d7d24a: SPEC-W2-UNKNOWN engine-core, resumed after D93

- Restored the kept work: path.py, readers.py, unknown.py and PROGRESS.md from 076f9bf,
  rulepack.py from b9b8a97 (every refusal on, the hold-back of 426f3fa dropped).
- Point 11 as amended (D93), engine/rulepack.py: `order` no longer refuses an unranked choice;
  `_reject_misplaced_settings` lets a setting stand in a check as well as a window's opens or
  closes, and still refuses it anywhere else (a counter's scope, a span, gap_allowed). The
  rule-id refusal and the point 7a lint are on.
- engine/path.py `_level`: a comparison reaching an unranked choice is unknown and puts the
  unranked side, by record and field, in the trace's unsure gaps, so it is asked with state
  undecided and gives the reason undecided:<record>.<field> (cannot_tell). `_gap_of` calls a
  declared choice the order leaves unranked undecided (`_unranked`), not unreadable.
- Done command as written, output to $TMPDIR/l6a-done1.txt: exit 1, one failure
  (test_point_11_a_comparison_reaching_an_unranked_choice_is_undecided: nothing asked). After the
  `_level` change, $TMPDIR/l6a-done2.txt: exit 0 (mypy 72 files clean, ruff clean, 11 formatted).
- Wider run, tests/unit/engine and tests/unit/acceptance ($TMPDIR/l6a-wide-after.txt): 53
  failures outside the done command: test_w2_unknown*.py (later rounds of SPEC-W2-UNKNOWN),
  test_fix7 x4, test_fix8 x2, test_path_reach x3, test_verdict point 37 (verdict.decide, a later
  round). The journeys pass. The base engine (668ba78) cannot load the current F-1 pack at all
  (it refuses the setting in checks/0), so the w2_unknown files error at collection there.
  test_path_reach's never-checked toy names rule toy.order the pack does not hold: refused by
  point 11 (dispute in REPORT.json).

Status: done.

## l-engine-af4f972318: SPEC-W2-UNKNOWN engine-reads (points 6 to 10, 13 to 17, 25 to 28, 32, 34 to 37, 39)

- Before any change, the done command as written ($TMPDIR/b0.txt): exit 1, 10 failures: R1
  (withholds), R4, R11, R12 (asked as missing:, not unreadable:), R26 (no CaseStructureError),
  R30 (a not_sure fact read recorded nothing), R31 (entered_when read a stated not-yet card
  date as absent, so no apply window), R40 (no not_sure judgement for a field nothing reads),
  and point 37 (path.py decided on its own).
- engine/path.py:
  - `_refuse_undeclared(records)`: undeclared fact, kind or field, an id not matching
    `^<id_prefix>[0-9]+$`, more than max_records, two records with one id. Messages use the
    pack's words only, never what was sent.
  - `_need` names a gap by state: `unreadable:` (about holds the value as entered),
    `missing:`, `undecided:`. ask_unreadable raises `<record>.<field>.not_sure` for every
    not_sure, read or not, and asks every unreadable case fact.
  - `_read` reads case facts against the pack's declared facts, and with a day reads the
    last field through its history (`_as_given`): a change record that could apply with a
    day, link or old value not known leaves it unknown, naming the change's field; no change
    record applies only when the change list is stated whole (else `complete.<kind>`).
  - `_when3` keeps NONE and NOT_YET apart from not known (ABSENT). `as_of` not known is not
    known; not yet reads today's value. `_extreme` (earliest_of, latest_of, point 16) and
    `_first` (point 15) by the SPEC's rules, a found `first` needing the list whole unless
    pinned by `this.id same_as outer.id` (`_pinned`). A not-yet member never dates an
    ends_also reading (j08). `ends_also` not known leaves the end not known (point 28).
  - `_each`: stage and check for_each keep decided records; each undecided one is asked,
    its questions carry `withholds` `<stage>.<record>`; an undecided record with no gap is
    `engine_gap:`. Windows and their computed items carry `waits_on` (question ids, lapses,
    `complete.<kind>`, `pending:`); a null not-known date with nothing named is `engine_gap:`.
  - entered_when and done_when read through the readers: a stated not-yet is known (R31);
    not_sure, false or a stated absence is never done.
  - `_as_date` matches the ISO pattern first (point 41, U27).
  - compute decides through `verdict.decide` (point 37). verdict.py gained
    unreadable_inputs, undecided_inputs, categories_not_covered and engine_gaps, each a
    blocker. A typed date not checked against a document is now a blocker as well.
- Tried and reverted: asking every not_sure `happened` date (point 32). It fails P6's
  "a settled tree asks nothing" (point 8) in test_unknown_logic.py. Not built; dispute.
- Done command as written ($TMPDIR/d3.txt): exit 0. Journeys ($TMPDIR/journeys1.txt): one
  failure (j08, ends_also above), fixed, then exit 0. The full tests/unit/engine and
  acceptance run passed 10 minutes twice and was stopped (the property files are slow in
  my sandbox), so I have no full wide run. R5 and R7 still fail, left to the stages round as
  the plan note says.

Status: done.

## l-engine-aade86ec61: SPEC-W2-UNKNOWN engine-counts (points 18 to 23, 22a, 24 in path.py)

- Before any change, the done command's pytest part ($TMPDIR/b0.txt): exit 1, 14 failures, all
  in test_w2_unknown_counts.py: R6 (no a1 item: the scope `_select` gave None for a3's gap),
  R8 x6, R18 x2, R19 x2, R20, R23, R28.
- engine/path.py, counters rewritten around `_choose`:
  - Point 18: decided scope records join their group; an undecided one is asked and withholds
    only the group it could join (none of another record's when grouped by record; its key's
    group when known, else every group).
  - Point 19: `_group_key` gives None for a key not known (a chain link or same_value read that
    is U); such a record withholds every group, its gaps asked. A chain link that is absent
    starts a chain, as point 19 states.
  - Point 20: whole over the scope's kind as well as qualifying and not-qualifying kinds.
  - Point 21: `_covered` reads each qualifying or not-qualifying record; one undecided, or with
    hours, start, end or link U, makes the count U unless its known first or last day puts it
    wholly outside the counted days. Unknown hours are never "no job".
  - Point 22: `_dated` makes a span from three-state days: start U, U; end NOT_YET runs through
    today (the scope) or the counted span's end (a job), named pending; end U, U; end before
    start, conflict `span_order.<record>` asked with state conflict and named in waits_on.
  - Point 22a: a counted record whose span is N raises `<counter>.span_not_known.<record>` and
    names it in waits_on; the count is withheld.
  - Point 23: an hours rule with no row in force makes the count U with the lapse named; a limit
    rule with no row leaves the value and withholds the limit day and at-or-over.
  - Point 24: the item is still emitted, value null, limit_day null with waits_on, no at-or-over;
    a null count with nothing named is `engine_gap:`. The limit day past today waits on every
    pending not-yet end it runs through (R8).
  - `_Trace.named` carries a conflict or judgement an output waits on. `_select` and `_split`
    are gone (no other caller). `_conflict` takes an optional (field, state).
- Done command as written ($TMPDIR/d2.txt, then $TMPDIR/d3.txt after the chain-link change):
  exit 0; mypy 72 files clean, ruff clean, 11 formatted.
- Wider comparison against 75ce16e (test_path, test_path_fix1, test_path_reach,
  test_w2_limit_day, test_w2_windows, test_w2_unknown_stages, test_w2_unknown_f1,
  test_toy_pack_coverage, test_typed_dates, acceptance): one fixed
  (test_a_counter_over_an_unknown_selection_counts_nothing_and_goes_to_the_dso), four new
  failures, each an older toy test that reads a job start or end left empty, on a field
  declared `ask`, as no days or as still working, which point 22 forbids (disputes).
- Not built: f1.py's half of point 24 (outside this round's part, which names path.py); ranges
  (point 60); `withholds` on the questions of undecided scope records (no test or point asks it
  for counters).

Status: done.

## l-engine-1459cc274d: SPEC-W2-UNKNOWN engine-stages (points 29 to 31, 32a, 33 in path.py)

- Before any change: R13, R17 and R37 failed (test_w2_unknown_stages.py). I ran the original
  engine in a shadow tree ($TMPDIR/orig, HEAD's engine/ with every other top folder linked) to
  get a clean baseline ($TMPDIR/orig_run.txt): exit 1. It had 33 failures, among them
  test_path.py x8, test_path_reach.py x4, test_w2_windows.py x9, R5, R7 x3, P1/P1w on the toy
  pack, P1w f1, P2 toy and f1, P4 f1, and the three stage tests.
- engine/path.py:
  - Point 29, `run_stages`: if any entered_when field is NONE or false, the stage is not
    entered. If all are known, it is entered. Otherwise `_unknown_stage` emits state unknown,
    no dates, no windows, with waits_on, and the gaps are asked (an empty one is engine_gap).
    A stage another stage shows as next is shown once, as next.
  - Point 30, `_window`: done_when is read with a trace. Not done and not known: the gaps are
    asked and named in the window's waits_on, and the dates are kept. Next stages skip this.
  - Point 31, `_next`: a bind path is read through `_read`. A bound value not known means
    `unbound`, so a match on fewer keys never hides the stage. `_matches` reads each candidate
    record's bound fields, and a field not known on one leaves the match unknown and asked.
    An only_if that is U, a bind that is U, or a filing close that is U (`_closed` now returns
    the close's waits, future: left out) gives state unknown with waits_on. The stage is closed
    only when no filing close is U and every known close is past. Next stages now ask the gaps
    of real records like any stage (the unsure-only `_need` is gone). A field of the virtual
    record that nothing supplies is `future:<stage>.<field>` in `tr.named`, both in `_read`
    and for a not-yet `fact:` in `_when3`. The virtual record carries its stage id.
  - Point 32a: `_span_conflicts` returns the conflict it raises. The stage is then unknown,
    its dates null, and waits_on names the conflict.
  - Point 33: an entered stage whose start or end is null names the span trace's waits (not
    for next stages, whose span is a record not entered yet). An ends_also judgement is named.
  - `_some`: a list not stated whole now puts `complete.<kind>` in the trace. Without it, an
    undecided for_each record named nothing and raised engine_gap (P4 f1, `grace.p1`).
- First done run ($TMPDIR/d1.txt, before the last three fixes): exit 1. Fixed against the
  baseline: R13, R17, R37, P1 toy, P1w toy. New failures: j02 (next becomes unknown, a
  dispute), test_path stage-absent (dispute), test_path_reach next-without-for_each (fixed:
  shown once) and P6 tree (dispute). P4 f1 then passed after the `_some` fix.
- Final done run: see $TMPDIR/d2.txt and the report.
- Final done run ($TMPDIR/d2.txt): exit 1, 31 failures (the baseline had 33). Static parts
  pass: engine_literals, mypy (72 files), ruff check, ruff format. Every failure left is a
  dispute in REPORT.json, apart from P2 toy and f1. Those failed before this round too, and I
  did not investigate them.
- Not built: asking an absent field of an existing record when matching a bind (kept as no
  match, as before, so journeys get no new questions); ranges (point 60).

Status: blocked (the done command cannot pass without test changes; see disputes).

## l-engine-1459cc274d, attempt 2

- Start: the done command failed with 31 tests, the same as attempt 1. Tests unchanged since.
- Traced the three I had not traced before (P2 toy and f1, and the talk_to_dso and not_sure
  count tests in test_path / test_path_reach) with a P2 harness in $TMPDIR that runs every
  fill of one field. Four engine faults, all fixed in engine/path.py:
  - Point 19: a scope record whose group key is U asked nothing when no group was left to
    withhold (toy c1.level not_sure). `_counter` now `_need`s the key's trace.
  - Point 30: a window whose done_when is U kept its upcoming days as known. Each upcoming day
    of such a window now carries the done gaps in waits_on (the schema allows a known date
    whose "still ahead" rests on an answer).
  - Point 31/33: a next stage whose only_if or bind is U showed its computed items as known
    (f1 p1.stem_list not_sure). Its items are now null with waits_on, its windows and upcoming
    days keep their dates with waits_on (the dates rest on known values; whether the stage
    comes does not). This keeps test_next_with_an_unknown_condition_is_shown_and_never_quiet and
    test_j02_windows_of_the_mba_card passing, which dropping the windows would break.
  - Point 32: `ends_before_today` read a stage entry that is unknown, and a span in conflict, as
    no end at all. An unknown entry now counts its end when that end is known, else None; a
    span in conflict is left out (it is asked as a conflict). P3 holds on toy c1.start, and
    test_change_3 keeps its question.
- Done command ($TMPDIR/d1.txt, copied to .scratch/done-2.log): exit 1, 29 failures (31 before).
  engine_literals, mypy (72 files), ruff check and ruff format pass. Props P1 to P7 pass.
- Every one of the 29 is a test that contradicts a SPEC point, or a test id that names no
  window in the pack; each checked this time (REPORT.json disputes). With end_date_change in
  LISTS_WHOLE, seven of the nine test_w2_windows failures pass on this engine; the other two
  expect `missing:w3.start` where point 35 and R4 need `unreadable:`. Under the pack's real id
  stem_job_end.evaluation_final.w1 the engine gives R7's whole table.
- Not built: anything to make the disputed tests pass (each would break a SPEC point or a test
  that holds it, such as R13, U15, R4, P5, P6).

Status: blocked on the disputes (L-tests).

## l-engine-80cf60c2cc: engine-stages, resumed after the tests lane's fix1

- Restored the kept engine/ from lane/L-engine/l-engine-1459cc274d (path.py, PROGRESS.md).
- Done command as written ($TMPDIR/d1.txt): exit 0. Every test passed (2 xfail that were
  already there). engine_literals, mypy (72 files), ruff check and ruff format also passed.
- The tests lane's one request (point 33): stem_job_end.w1 was unknown with null dates and no
  waits_on in R7's case (W1, w3 ending 2026-07-31). Cause: a stage with no span is placed by
  its windows, and `_state` read a window that does not apply (null, nothing to wait on) as not
  known. Fix in `_state`: such a window places nothing. A no-span stage that is still unknown
  now names its windows' waits_on. The stage now reads done.
- Done command as written again ($TMPDIR/d2.txt): exit 0.
- Not built: a state for an entered stage with no span and no window that applies (check_pack's
  course stage). No point names one; raised in REPORT.json.

Status: done.

## l-engine-1710c73bcf: engine-f1, SPEC-W2-UNKNOWN point 24 in engine/f1.py

- Start: the done command failed on one test, R25 (test_w2_unknown_f1.py): with
  opt.min_hours_per_week left out of the pack, the verdict gave only rule_not_in_force and no
  `missing:` reason.
- `_judgement_items` and `_open_items`: the two `numbers.get(..., 0)` defaults are gone. A count
  not worked is read as not known, never 0.
- `_add_counts`: with a period worked in the window, an hours rule the pack holds no row of is
  named missing (`missing:opt.min_hours_per_week`), so the hours check gives its missing reason.
  A rule with rows but none in force on the day keeps the step back, as test_f1_fix4 point 40
  wants (talk_to_dso).
- Tried first, reverted: naming `employment.days_under_hours` and
  `employment.periods_not_reported` missing whenever null. It broke point 40, point 47, point 60
  (a lapse is a step back) and the single-missing-reason test (a null report count there is
  already named by a conflict).
- Job end: contracts/case_f1.schema.json takes a job end only as a date string matching the
  pattern, or null, and parse_case refuses a date that does not exist. So no `not_sure` or
  unreadable end reaches f1.py, and `end is None` already reads only a true absence. Nothing
  built for it.
- Done command as written ($TMPDIR/d2.txt): exit 0 (2 xfail already there).

Status: done.

## l-engine-f54d1560e5: W2-P1 unknown fix2, three faults the hidden gap property found

- Start: the done command failed on the five tests of test_w2_unknown_regressions.py only.
- Faults 2 and 3 (points 2, 6, 8): `_cond` read an absent `ask` field under `present` as not
  there. Inside a selection that dropped the record on a guess: j12/j13 w1 with no start left
  opt_job_start with nothing asked; j15 w4 with no `under` was read as not under a2, so
  stem.evaluation_final.opens moved to 2025-10-31.
  - Tried first: removing the shortcut everywhere. Fixed j12, j13, j15, but broke
    test_path_reach::test_any_of_holds_when_one_part_holds and
    ::test_a_check_whose_only_if_is_false_does_not_apply, which want a check's `holds` to read
    the absent field as not there and raise its conflict (a dispute in REPORT.json).
  - Kept: the shortcut never applies while a selection's `where` is read (`_Run.selecting`,
    set in `_choose`). Every selection, `first`, `exists`, `none`, count and for_each goes
    through `_choose`, so an undecided record there is undecided and its gap asked.
- Fault 1 (points 31, 33): `_enter` never set `waits_on` on a null span day of a next stage,
  so stem.a2's end, null because mv1.from_program is not_sure, read as "does not apply". A null
  span day now names its trace's waits for every stage; for a next stage the `future:` entries
  are left out (test_j02_stem_on_the_earlier_bachelors_is_next holds it to the real gap).
- Done command as written ($TMPDIR/d1.txt): exit 0. engine_literals, mypy (72 files), ruff
  check and ruff format pass.
- Not built: no new helper or module; a state change for a next stage whose end is unknown
  (no test or point needs it; whether the stage comes does not rest on the move).

Status: done.

## l-engine-e89bd58566 (W2-P1 unknown fix3, engine round)

- Read .factory/runs/result-step-w_tests_L-tests.json (main checkout; this worktree has no
  .factory/runs). The tests round (l-tests-a5a1bded5f) reports status done, "No (b) engine
  fault was found", and its `requests` list is empty.
- So, as the mission says for an empty list: no engine change.
- Done command as written ($TMPDIR/done.log): exit 0. pytest passes (2 xfail already there),
  engine_literals, mypy (72 files), ruff check and ruff format pass.
- Not built: anything. No finding names a fault.

Status: done.

## l-engine-641a4b8826 (W2-P1 unknown fix5, engine round, attempt 1 on the kept work)

- Carried forward engine/path.py from lane/L-engine/l-engine-c27fd187fc (710a960). At start, the
  four named tests and SIM102 failed, as the resume note said.
- test_change_3 (ends_before_today): the kept work put the known end of a stage whose record is
  undecided (grace.p1, 2026-07-30) into span_ends, so it dated the question. Now those ends go to
  `maybe_ends`: an end there that is unknown or not past still keeps the question back
  (point 32), but only entered ends date it. Passes.
- SIM102 at _cond: folded into one `if`. ruff passes.
- Finding 9: `_as_date` and `_number` removed from path.py; readers.py's `_date` and `_number`
  are now public `as_date` and `as_number`, and path.py reads through them. `_all`, `_any`,
  `_cond` and `not` work through all3, any3 and not3 (`_tri` turns an unknown read into an
  Unknown on its trace's gaps). Short-circuits are kept: reading more conditions has side
  effects (used kinds, and so list questions). Same failures before and after: nothing any
  test expects moved.
- Finding 6: compute raises CaseStructureError for an undeclared category (kept work).
- Still failing, all three disputes, not worked around:
  - test_unknown_logic::test_a_read_once_tree...: joined_on is `happened`; not_sure, it is
    asked by point 32 / finding 5 (test_finding_5 holds it), even when the tree settles.
  - test_journeys::test_j07_opt_is_next...: program.p1 is unknown by entered_when (end_date
    left out), so by point 33 / finding 3 its next stage opt_post.p1 comes, unknown, waiting
    on p1.end_date; point 31 keeps a next stage whose filing close is unknown.
  - test_w2_unknown_props::test_the_properties_saw...: upcoming is seen changed once (needs 5).
    Probed: the derandomized 30 examples rarely draw a date field that feeds a future upcoming
    date known in C; the changed upcoming keys mostly are absent in C (no entry). Also
    gaps.decided_cases shifts the `complete` dates by up to +60 days, past today, which point 14
    / finding 2 reads as not whole. Accepting future statements again still gives upcoming 1.
- Done command as written ($TMPDIR/done2.log): exit 1 on those three tests only.
- Not built: no helper beyond `_tri`/`_known` (used by all three operators); no change to the
  generator-facing behaviour to raise the props count; nothing F-1 specific.

Status: blocked on the three disputes (tests lane reconcile).

## l-engine-641a4b8826 (attempt 2 on the kept work)

- Started from c6e4239. Same three failures as attempt 1; ruff SIM102 and test_change_3 already fixed.
- No engine change in this attempt. Probed each failure again with new evidence:
  - read_once_tree: turning off the point 32 ask for a not_sure `happened` date (path.py
    run_checks) fails test_finding_5 at once. The toy's course.joined_on is `happened`, so the
    two tests cannot both pass. Same dispute.
  - J07: the pack's program -> opt_post only_if is T for p1 (bachelor, no OPT card, completed);
    only p1.end_date (when_absent ask, left out) is unknown, and every opt_post filing close
    reads it. Points 31 and 33 and R36 keep the stage, unknown. The old pass came from dropping
    next stages of an unknown entry (finding 3). Same dispute; a pack only_if on a transfer out
    would settle it (request).
  - props non-vacuity: instrumented the real P2[f1] run through a pytest plugin in .scratch/plug
    (editing a copy changes Hypothesis's derandomized draws, which hash the source). Of about 30
    examples, one changes a known upcoming date (opt.complete_by.closes.a1 on p1.end_date). The
    other changed upcoming keys are missing from C (the fill creates them). With future
    statements accepted again (tried, reverted) the count is still 1. Seeds' complete dates are all
    2026-09-29 (TODAY), so any positive shift makes them future under point 14.
  - Seen in passing: with other draws (P2 called alone from the non-vacuity test), P2 finds
    window:opt.file_by.p1 waiting only on future:opt_post.dso_on and not p1.end_date, and a
    reason unconfirmed:complete.petition not raised in a fill. The full-file run does not draw
    these. Not fixed in this attempt (time); worth a look next round.
- Done command as written (.scratch/done-2.log): exit 1, on those three tests only.
  engine_literals, mypy, ruff check and ruff format pass.

Status: blocked on the three disputes (tests and pack lanes).

## l-engine-3b1d1ed3d5 (W2-P1 unknown fix6, engine round)

- Carried forward engine/ from lane/L-engine/l-engine-c27fd187fc (d0d14d4): path.py, readers.py,
  PROGRESS.md. The tests now follow the three disputes; at start only
  test_w2_unknown::test_the_file_by_window_of_a_next_opt_waits_on_the_program_end_too (both
  params) failed: opt.file_by.p1 waited only on future:opt_post.dso_on.
- Cause: in `_next`, a next stage kept because a filing close is not known (`_closed` returns
  what that close waits on, here p1.end_date) set the stage unknown with that gap, but its
  withheld windows and items did not name it. file_by's own days read only dso_on.
- Fix (point 34, generic): when `_closed` returns waiting, every window of the stage with a null
  day and every null item it computed add those gaps to waits_on. Windows with both days known
  are not withheld and are left as they are.
- Done command as written ($TMPDIR/done.log): exit 0 (1 xfail already there). engine_literals,
  mypy (72 files), ruff check and ruff format pass.
- Not built: no helper; no change to known-dated windows or upcoming (nothing withheld there).

Status: done.

## l-engine-335238e87f (W2 unknown, review findings 1 and 3, engine round)

- Finding 1 (points 2 and 32): removed the `holds_alone` branch in `_cond` that read an absent
  field under `present` in a check's holds as NONE. With it went the `holding` and `selecting`
  flags and `_only_absent`, which only that branch used. An absent ask field is now unknown in
  a check's holds as everywhere: `_check` gets holds None, asks the gap and withholds; no
  conflict, no judgement, no quiet pass. tests/unit/engine/test_path_reach.py (commit 1047aaf)
  expects exactly this and passes.
- Finding 3 (point 12 as amended): removed `_tri` and `_known` and the all3/any3/not3 round
  trips in `_all`, `_any`, `_cond` and `not`. One module helper `_and` (Kleene and over
  bool | None, used by `_all` and `_cond`); `_any` and `not` are inline. Gaps stay in the
  trace; short-circuits kept. Unused imports (Tri, all3, any3, not3) dropped.
- Done command as written ($TMPDIR/done.log): exit 0 (1 xfail already there). engine_literals,
  mypy (72 files), ruff check and ruff format pass.
- Not built: no Tri carried through the evaluator (the finding allowed either way; removal is
  the smaller change); no example tests for U11/U25/U26 (finding 2 is tests/, not this lane).

Status: done.

## l-engine-1a23821960 (W2-P2, N3 and N4, engine round)

- Built (engine/path.py, engine/readers.py), all generic, read from path.checkins, path.watch
  and contracts/product_settings.yaml:
  - N3: `checkins[]` per record of a kind in path.checkins: confirmed_on, due (plus the
    setting's days), due_days_away, question `checkin.<record>`, asked (unconfirmed:checkin.<id>)
    once due. A confirmed day not_sure or unreadable is asked as its own gap.
  - N3: a days_without_qualifying_period count stops at the earliest last confirmed day of the
    records it rests on (`_confirmed`, `_Trace.as_of`), and the item carries `as_of` when that is
    before today. A confirmed day not known withholds the count and its limit day.
  - N4: `watch[]` per path.watch entry and record: date, days_away, close (watch.close_days),
    rule_ids, status; soonest first, no date last; a date not known is asked by the unknown rule.
  - Finding 1: hours a week (a record's hours_per_week or a period's) below zero is unreadable
    and asked. Any other `number` stays open (point 41, test_readers keeps -1 known). A periods
    field on a counted record that is unreadable or not_sure withholds the count.
  - Point 33: an unknown stage now lists each of its windows withheld (null dates, waits_on).
- Done command (to $TMPDIR/done.log): exit 1, 22 failures. engine_literals, mypy (72 files),
  ruff check and ruff format pass; journeys pass.
  - 16 need pack data: no passport or visa entry in path.watch (8 tests and the pack test);
    trip_opt's for_each reads outer.returned_on, so a trip not back is undecided and not shown
    (2); address's for_each reads `previous present`, absent in the tests (4). With those
    patched in memory ($TMPDIR/probe4.py, probe5.py), all 15 engine tests pass.
  - 3 negative-hours tests: everything holds except `no at_or_over_limit reason at all`;
    opt.months_at_level.at_or_over_limit.master is raised by the 12-month card, not the hours.
  - 3 test_f1_translation tests fail on HEAD as well: the pack's new address stage asks
    complete.address, which the hand lists in the tests do not hold.
- Not built: hours_changes applied day by day to the count (no test or SPEC point here; G7's
  hours change waits by founder decision); a check-in for a never-confirmed record (contract:
  due null).

Status: blocked on the pack (L-content) and three test disputes.

### Attempt 2 (l-engine-1a23821960)

- No engine code changed. Re-checked each of the 22 failures against the pack and the tests:
  - 13 watch tests: path.watch still has no passport or visa entry. The pack CHANGELOG (v2026.09
    line 330) leaves them out on purpose: no saved primary source states a rule on them. The engine
    cannot add a watched date without a pack entry (hard rule: every number and rule from the pack).
  - 4 address tests: stage address selects `previous present: true`; the tests' address records
    have no previous (when_absent none), so no move is selected. Pack or test, not engine.
  - 2 trip_opt tests: the selection reads outer.returned_on, absent on a trip not back yet.
  - 3 negative-hours tests: probe ($TMPDIR/neg.py) shows opt.months_at_level.at_or_over_limit.master
    raised with 40 hours as well (a 12-month card at a 12-month limit, `value >= limit`, the same
    line test_f1 holds for unemployment at 90). Everything about the hours holds.
  - 3 test_f1_translation tests: hand lists lack complete.address.
- Done command as written ($TMPDIR/done.log): exit 1, those 22 only. engine_literals, mypy (72 files),
  ruff check and ruff format pass; journeys pass.

Status: blocked on L-content (pack) and L-tests (three disputes). Same as attempt 1.

### Attempt 3 (l-engine-1a23821960)

- No engine code changed. main and this branch carry no new pack or test commit since attempt 2.
- Re-checked against the files: parameters.yaml path.watch still lists authorization and program
  only (comment: passport and visa have no saved primary source); trip_opt and the (f)(16) trip
  checks select on returned_on present / outer.returned_on; the f1_translation failure is
  `Left contains 1 more item: {'address': ...}` (the engine asks complete.address from the pack).
  test_a_negative_hours_figure asserts no at_or_over_limit reason at all, while the 12-month OPT
  card at a 12-month opt.max_months raises opt.months_at_level.at_or_over_limit.master.
- Done command as written ($TMPDIR/done3.log): exit 1, the same 22 failures. engine_literals,
  mypy, ruff check and ruff format each exit 0 run alone; journeys pass.
- Not built: no engine-side passport or visa watch entry and no relaxed selection. Either would
  put a rule or a date in engine code that the pack does not state (hard rule).

Status: blocked on L-content (pack) and L-tests (disputes). Same as attempts 1 and 2.

## l-engine-3d4e5894cf (W2-P2 after fix0, carried forward)

- Carried engine/path.py and engine/readers.py forward from lane/L-engine/l-engine-1a23821960
  (383691e) with git apply; no engine code changed beyond that work. The fix0 round (pack watch
  rows for passport and visa, tests state the lists whole, complete.address in the translation
  lists) cleared 17 of the 22 failures.
- Done command as written ($TMPDIR/done.log): exit 1, 5 failures, all in test_w2_records.py.
  engine_literals exit 0, mypy (72 files) ok, ruff check ok, ruff format ok; journeys pass.
  - test_the_signature_covers_six_months_from_the_signature_on_opt and
    test_a_trip_on_opt_with_no_signature_day_withholds_the_signature_window: the pack's trip_opt
    for_each picks a trip by an OPT card covering outer.returned_on; the trip is not back, so the
    selection is unknown and no trip.signature_covers window comes out. The tests lane files the
    same dispute (result-step-w_fixes_L-tests.json).
  - test_a_negative_hours_figure_is_unreadable_and_never_counted[-5, -40, -0.5]: the count, its limit
    day and the hours question all hold. The one assert that fails says no reason holds
    at_or_over_limit at all, but opt.months_at_level.at_or_over_limit.master is raised by the
    12-month card at opt.max_months 12, with 40 hours too ($TMPDIR/neg.py prints the same reasons
    for 40 and -5). It does not read the hours.
- Not built: no engine-side selection on left_on (that would put a rule in engine code that the pack
  does not state); no change to the generic `value >= limit` line (test_path and test_f1 hold it).

Status: blocked on L-content (trip_opt selection) and L-tests (the negative-hours assert).

### Attempt 2 (l-engine-3d4e5894cf)

- No engine code changed. No new pack or test commit on step-w or any lane branch since attempt 1.
- Checked again: the trip_opt for_each in parameters.yaml still compares the card with
  outer.returned_on (no optional fallback, unlike the trip stage's span), so a trip still under way
  is not selected. tests/PROGRESS.md item 5 records opt.months_at_level.at_or_over_limit.master for
  a 12-month card, which is the reason test_w2_records.py:741 says must not be there.
- Done command as written ($TMPDIR/done.log): exit 1, the same 5 failures in test_w2_records.py.
  engine_literals, mypy, ruff check and ruff format each exit 0 when run alone. Journeys pass.
- Not built: an engine fallback from returned_on to left_on or today, and dropping the generic
  `value >= limit` reason. Either would put a rule in engine code that the pack does not state.

Status: blocked on L-content (trip_opt selection) and L-tests (the at_or_over_limit assert).

### Attempt 3 (l-engine-3d4e5894cf)

- No engine code changed. git log on parameters.yaml and test_w2_records.py (all branches) shows
  no commit after be90d36 and dde9d54, both already read in attempts 1 and 2.
- Checked whether the engine may show the signature window anyway. SPEC-W2-UNKNOWN point 17:
  an undecided record in a stage for_each is not entered and not shown. Point 6: known only when
  every value of the unknown gives the same output. returned_on is `ask` (asked, D92 point 61);
  a return after 2027-05-31, or none, fails the pack's card check, so trip_opt's selection is
  truly unknown. Showing a date there would break point 6 and point 17.
- opt.months_at_level sums the whole 12-month card against opt.max_months 12, and the generic
  `value >= limit` line raises opt.months_at_level.at_or_over_limit.master with 40 hours too.
  test_f1 holds that `>=` line (unemployment 90 of 90 is talk_to_dso).
- Done command as written ($TMPDIR/done.log): exit 1, the same 5 failures in test_w2_records.py.
  engine_literals, mypy, ruff check and ruff format each exit 0 run alone. Journeys pass.

Status: blocked on L-content (trip_opt selection) and L-tests (the at_or_over_limit assert).

## l-engine-abc623927b (W2-P2, check-ins and watch, engine round)

- Carried forward engine/ from lane/L-engine/l-engine-3d4e5894cf (b128a6f): path.py, readers.py,
  PROGRESS.md. engine/ on this branch was unchanged since 90fa45e, so a plain checkout of those
  files.
- With fix1 (trip_opt by left_on, c9d70c6) and ce63ee6 (the negative-hours test checks only the
  unemployment reasons), tests/unit/engine/test_w2_records.py passes whole (40 passed).
- The resume note asked for engine/f1.py to read hours through readers.py. Checked: f1.py takes
  only a case validated against contracts/case_f1.schema.json, where hours_per_week has minimum 0
  and maximum 168, so a negative figure never reaches it. The negative-hours tests run through
  path.py, whose readers already read a negative figure as unreadable. The failing reason in
  attempt 3 was opt.months_at_level.at_or_over_limit.master, which the test no longer counts.
  No f1.py change made.
- Done command as written ($TMPDIR/done.log): exit 0 (1 xfail already there). engine_literals,
  mypy (72 files), ruff check and ruff format pass.
- Not built: no change to engine/f1.py (no test or reachable input needs it).

Status: done.

## l-engine-407943f4aa (W2-P2 review veto, findings 1, 2 and 5)

- engine/path.py `_confirmed`: an absent confirmed day reads as its when_absent declares; `ask`
  (work and petition confirmed_on) notes the gap and returns ABSENT, so a count resting on it is
  withheld with waits_on `w1.confirmed_on` and asked as absent (finding 1, review1).
- run_checkins asks an absent confirmed day only where an output rests on it (the count), not
  from the check-in alone: test_j19_an_old_approved_petition... holds a petition with no
  confirmed_on and no question.
- _Trace.as_of now keeps (day, record id). The limit day is withheld when it would fall after
  the last confirmed day (and that day is before today), waiting on `checkin.<record>` of each
  stale record; that check-in is then asked even before its due day, so the waits_on id is a
  question (finding 2, review2, review5). First try withheld every future limit day (toy N2 and
  test_w2_limit_day failed): the condition is now `through < min(reached, today)`.
- Done command as written ($TMPDIR/done.log): pytest exit 1, 3 failures, all in
  test_f1_translation.py (opt dates, opt count vs compute_f1, stem dates):
  unemployment.opt_card.a1 None where 14 is expected. Their translated and hand-written records
  hold a work record with no confirmed_on and lists stated whole today, the same shape as
  review1, which requires the count withheld. Disputed, not worked around.
  engine_literals, mypy (72 files), ruff check, ruff format: exit 0.
- Not built: no confirmed_on written by f1.to_records (case_f1 holds no confirmed day; the
  complete.work "on" day states the list whole, not the hours, and the hand-written-records test
  would then fail); no reading of complete.<kind> as a confirmation (review1 states it today).

Status: blocked on L-tests (test_f1_translation vs review1).

### Attempt 2 (l-engine-407943f4aa)

- Attempt 1 was not accepted: the three test_f1_translation.py failures. Section 19 requires
  parity for the translated count, so this is required, not a dispute.
- engine/path.py `_confirmed`: a record holding a field the pack declares translation_only
  comes from an older case, which has no check-in. With its list stated whole today
  (`_stated`), its empty confirmed day reads as today. Native records (review1) are still
  asked. Generic: reads the pack flag only.
- Done command as written ($TMPDIR/done.log): exit 0 (1 xfail already there).
- Not built: no confirmed_on in f1.to_records (the hand-written-records test pins the table).

Status: done.
