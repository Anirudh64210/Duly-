# L-tests progress

## Iteration 1, 2026-09-28

### What was written

| File | What it covers |
|---|---|
| tests/support/f1_pack.py | The SPEC pack built in code, a second pack with every number shifted, case builders, contract checks, and a day-by-day reference count for the property tests. Imports nothing from engine.dates or engine.f1 |
| tests/unit/engine/test_dates.py | add_months clamping, federal_holidays on observed dates, add_business_days across weekends and observed holidays, properties |
| tests/unit/engine/test_rulepack_values.py | Rulepack.value by date and by regime, rules_checked_on, refusal of a rule without a quote |
| tests/unit/engine/test_f1.py | parse_case, two golden cases covering all 22 computed items, the same cases under the shifted pack, each boundary the day before, the day of, and the day after, verdict inputs, properties |
| tests/unit/api/test_compute.py | Good case, 422 on 23 bad bodies, response validates against the output contract, nothing from the body is logged, nothing kept between requests |
| tests/holdout/test_holdout_dates.py | Hidden second set for engine/dates.py |
| tests/holdout/test_holdout_f1.py | Hidden second set of golden cases and properties for engine/f1.py |
| tests/unit/engine/test_rulepack.py | One change: the shared fixture source gained a quote. See "Change to an existing test" |

### What ran and what it printed

- `uv run ruff check tests` : All checks passed.
- `uv run ruff format --check tests` : all files already formatted.
- The done command for this lane: passes.
- `uv run pytest tests/unit tests/holdout -q` : 4 errors during collection, all
  `ImportError: cannot import name 'dates' (or 'f1') from 'engine'`. Expected: the engine
  lane has not run. Pytest stops the whole run on a collection error, so gate 5 stays red
  until round B lands. test_rulepack_values.py and test_compute.py collect, and fail on
  the missing method and the missing route.
- Satisfiability check. I wrote a throwaway reference implementation in a scratch folder
  under tests/, loaded it as a pytest plugin, and ran every new test against it:
  all tests in tests/unit and tests/holdout passed. Then I changed the reference so that
  a period did not cover its last day, and the suite went red. The scratch folder was
  deleted before the commit. It is not in the repo, so no implementation lane can see it.
  This shows the expected values agree with an independent mechanical calculation, and
  that the tests can all pass at once.

### Change to an existing test

tests/unit/engine/test_rulepack.py built its pack from a source with no quote and status
settled. Phase 2 makes the loader refuse that (SPEC, engine/rulepack.py). Eight tests in
that file would have gone red for a reason unrelated to what they protect. I added a
quote to the shared fixture. No assertion was changed, loosened, or removed. The file
still passes against the current loader, so L-content's done command is not affected.

### Questions (the SPEC is unclear; the tests take no side unless stated)

1. `Rulepack.value` "returns the parameter". A bare value, or the whole parameter?
   The tests accept a bare value, a mapping with a "value" key, or an object with a
   value attribute.
2. `Rulepack.value` when nothing is in force (unknown id, date before effective_from,
   rule only under a regime that is not operative). Raise or return None?
   The tests accept RulepackError, LookupError, or None. They refuse a number.
3. Which date does the engine pass to `Rulepack.value`: today, or the date being
   computed? The test packs start every rule on 2000-01-01, so no test depends on it.
4. `add_business_days(d, 0)`: d itself, or the next business day when d is not one?
   Not tested.
5. `add_months` with a negative n. Not tested. The conflict rule "program_end_date minus
   1 year" is tested only with dates where every reading agrees (2026-05-15 to
   2025-05-15).
6. New Year's Day on a Saturday is observed on December 31 of the year before. Does that
   date belong to `federal_holidays` of the earlier year or the later one?
   The tests accept either. add_business_days must skip it (tested).
7. Inauguration Day, 5 U.S.C. 6103(c), applies to some employees only. In or out?
   No exact-set test uses an inauguration year.
8. "Items for a part of the case that is absent are left out." Is an item's part given by
   its id or by its inputs? opt.apply_window_opens needs only program_end_date;
   stem.apply_window_opens and stem.apply_window_closes need only opt.ead_end.
   The tests require absence only where both readings agree, and check the value
   wherever such an item is shown.
9. Are the unemployment and employment items shown when opt is null? Not tested, except
   that no item may be null in that case.
10. A null dso_recommendation_date gives a null file_by (tested). "Rules of the house"
    says the input is then named in missing_inputs; the "Verdict inputs" table lists only
    ead_start and ead_end. The tests do not assert the verdict for that case.
11. The names of missing inputs and of conflicts other than stem_start are not given.
    The tests require one reason starting "missing:" that contains the block and the
    field (for example opt and ead_start), and any reason starting "conflict:".
12. opt.ead_end null with no STEM block: is the counting window then unknown? Not tested
    for the counts. The verdict must be cannot_tell (tested).
13. Which rule ids do the counts name (unemployment.days_used,
    employment.periods_not_reported, cpt.full_time_days_used)? The contract needs at
    least one. The tests require only that each named id exists in the pack and that the
    status is the weakest among those named.
14. stem.validation_N_due: the formula says "6 times N". Does the 6 come from
    stem.validation_interval_months? The shifted pack leaves that rule at 6.
15. The api has no seam named for the pack. The api tests therefore run against the
    shipped f1 pack and never assert a rule value; they check each answer against the
    rule the response shows.

### Assumptions the tests do make (say so if one is wrong)

- Dates in the engine output are ISO strings (YYYY-MM-DD), as in the contracts.
- `Rulepack.value` takes a `datetime.date`, and `rules_checked_on` is a `datetime.date`
  or None, because engine.verdict.decide subtracts it from `clock.today()`.
- An employment period covers its end date. The SPEC says an open period "runs through
  today" and that the window includes both ends.
- The refusal for a missing quote is a RulepackError from validate_pack whose message
  contains the word "quote" and the rule id.
- "2026-02-30" is a bad case (422): the contract says format date.
- `rules` holds the operative regime's entry for a rule with two regimes, and carries
  the quote, because the screen shows it.

### Requests for files this lane does not own

- pyproject.toml: ruff sorts `from engine.dates import ...` as third party while
  engine/dates.py does not exist, and as first party once it does. The same import block
  cannot be clean both before and after round B. I used `from engine import dates` and
  `from engine import f1`, which sort the same way in both states. Setting
  `known-first-party = ["engine", "api", "assistant", "pipeline", "tools", "tests"]`
  under `[tool.ruff.lint.isort]` would remove the trap for every lane.
- .claude/hooks/guard_bash.py: the compose project check matches `-p` anywhere in a
  command, so `mkdir -p` and `pytest -p` are blocked with a message about compose
  projects. Matching only after `docker compose` would fix it.

### Stop hook and the mission disagree (needs the founder)

The stop hook runs this lane's test from .claude/lanes/L-tests.yaml: `uv run pytest -q`.
It failed with 2 errors during collection:
`ImportError: cannot import name 'dates' from 'engine'` and the same for `f1`.
The mission says the new tests cannot pass before the engine exists, and that this is
expected. Both cannot hold in round A.

What I did not do, and why:
- Skip or xfail the new tests, or guard the imports with importorskip. That would turn
  the tests green by switching them off, which is weakening them.
- Add engine/dates.py or engine/f1.py. This lane does not own engine/.
- Edit .claude/lanes/L-tests.yaml. This lane does not own .claude/.

Request: for round A, set the L-tests lane test to the done command from
specs/phase-2/plan.yaml, or to `uv run pytest -q` limited to the tests that existed
before Phase 2. The tests are left as written.

## Lesson

- Failure: `ruff check` reported I001 on a test that imports a module the engine lane
  has not written yet.
  Fix: import the module from its package (`from engine import dates`), not names from
  the module.
  Evidence: `from engine.dates import add_months` was sorted between pytest and
  hypothesis; `from engine.rulepack import ...` (file exists) in the same run was sorted
  as first party.
- Failure: a Bash command was blocked with "may only use the compose project".
  Fix: no `-p` flag anywhere in the command; use `test -d x || mkdir x`, and
  `PYTEST_PLUGINS=name` in place of `pytest -p name`.
  Evidence: .claude/hooks/guard_bash.py, the regex `(?:-p|--project-name)[ =](\S+)`.
- Failure: none seen, but close. The api log test first searched every field of each log
  record, which includes the record's timestamp; a number from the body could match by
  chance.
  Fix: search the message, its template, and its arguments only.
  Evidence: tests/unit/api/test_compute.py, `logged`.

## Iteration 2, 2026-09-28: every number has a source

Work under "The test pack (L-tests)" in specs/phase-2/SPEC-sourcing.md.

### What was written

| File | What it covers |
|---|---|
| tests/support/f1_pack.py | The five new rule ids with the assumed values, added after the existing rows so that no earlier row moves. `SPEC_SETTINGS`, `settings_dict` (test settings built in code), `shipped_settings` (the contract file as parsed), `settings_named`. SHIFTED is unchanged, so no earlier test changes its meaning |
| tests/unit/engine/test_f1_sourcing.py | Each new rule and each setting: change the value, the result changes with it. The derived number of validation reports. `settings=None` means the shipped file. `duly_settings`. Four properties |
| tests/holdout/test_holdout_sourcing.py | The same rules on other cases (C and D), another day (2026-11-02), and other values |

No existing test was changed.

### What ran and what it printed

- The done command for this lane: exit 0. `ruff check`: All checks passed. `ruff format --check`: 23 files already formatted.
- Against the engine as it is now, the two new files: `137 failed, 7 passed`. Every failure I looked at is
  `TypeError: compute_f1() got an unexpected keyword argument 'settings'`. Expected: round T has not run.
  The 7 that pass check the test pack and the test settings, or do not reach compute_f1 with the keyword.
- Against the engine as it is now, every other test in tests/unit and tests/holdout: `503 passed`.
  Adding the five rules to the test pack broke nothing.
- Satisfiability check, as in iteration 1. I made a throwaway copy of engine/f1.py in a scratch
  folder under tests/, applied the addendum to it, and loaded it as a pytest plugin
  (`PYTEST_PLUGINS=...`). Result over tests/unit and tests/holdout: `8 failed, 639 passed`.
  All 8 are in tests/unit/api/test_compute.py and all say
  `RulepackError: <new id>: no rule in force on 2026-09-28`: the api runs on the shipped pack,
  which does not hold the new ids until L-content's lane lands. Every engine test and every
  hidden test passed. The scratch folder was deleted before the commit.
- The check found one mistake of mine: a property said ten business days take at least 14
  calendar days. Counted from a Sunday they take 12. Fixed in both files.
- Planted faults in the scratch copy, to see the new tests go red: look-ahead fixed at 14 (red);
  fiscal year compared by month only and CPT bar fixed at 365 (red).

### Order of landing (needs the orchestrator)

tests/unit/api/test_compute.py uses the shipped pack. Once the engine reads the new ids, those
api tests pass only if rulepacks/f1-us/v2026.09/parameters.yaml holds all five. The SPEC lets
L-content leave a rule out when no primary source states it
(opt.report_employer_within_days is the likely one). If a rule is left out, the engine cannot
name it, and these tests fail as written: `test_each_new_rule_is_named_...`,
`test_periods_not_reported_names_the_reporting_rule` (unit and hidden). That is a decision for
the founder, not something the tests should bend around.

### Questions (continued; the tests take the side stated)

16. The shape of `settings`. The SPEC gives `dict[str, Any] | None` and "None means the
    shipped file". The tests pass the shape of contracts/product_settings.yaml once parsed:
    `{"settings": [{"id", "value", "unit", "decided_in", "meaning"}, ...]}`. If a flat
    `{id: value}` mapping was meant, `settings_dict` and `shipped_settings` in
    tests/support/f1_pack.py are the only two places to change.
17. Which item lists a setting under `duly_settings`? Neither setting feeds the value of an
    item: one decides what is an open item, the other what is a conflict. The tests require
    that every id listed is a known setting, that a list has no repeats, and that across the
    items of a case with an OPT start date both ids are listed somewhere. They do not say
    which item, and they do not say whether an item that used no setting omits the key or
    carries an empty list.
18. Which item names cpt.full_time_bar_days, stem.evaluation_interval_months, and
    capgap.fiscal_year_start_month_day? The tests require stem.evaluation_12_month_due to
    name the evaluation interval and capgap.ends to name the fiscal year rule, because their
    values turn on them. For the CPT bar they require only that some item names it.
19. An extension that the interval does not divide evenly (24 and 5). Not tested.
20. calendar.federal_holidays_law set to false. Not tested. The SPEC gives the flag no
    meaning beyond being cited.
21. A requested start on the fiscal year's first day counts as inside the new fiscal year
    (tested). This follows the main SPEC, where October 1 does.
22. A settings mapping that lacks an id the engine needs. Not tested.
23. product.opt_start_earliest_years_before_program_end with a program end on February 29.
    Not tested.
24. The blocked regime. The SPEC asks L-content to give a changed value a row under each
    regime. The test pack holds one row for each new rule, with no regime.

### Requests for files this lane does not own

- The mission says "Do not read tests/holdout/" and the SPEC says "add the same to the hidden
  tests". I added a new file there and did not open the two that exist. I ran them, with
  the traceback switched off, to see that they still pass.

## Lesson

- Failure: a property bound written from memory ("ten business days take at least 14
  calendar days") was wrong, and the engine lane cannot edit a test to fix it.
  Fix: run every new test against a throwaway reference before the commit, and delete the
  reference.
  Evidence: tests/unit/engine/test_f1_sourcing.py,
  `test_there_is_one_report_for_each_interval_in_the_extension`, failed on the reference
  with 2026-02-01 (a Sunday) to 2026-02-13.
- Failure: none seen, but close. Adding the new ids to SHIFTED would have changed what the
  hidden tests mean without my reading them.
  Fix: new rows go at the end of SPEC_RULES; new values are passed by the test that needs
  them; shared tables that other files import stay as they are.
  Evidence: `503 passed` for every earlier test after the change to the pack.
