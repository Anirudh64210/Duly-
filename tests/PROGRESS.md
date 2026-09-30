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

### Stop hook, iteration 2

The stop hook failed again on `uv run pytest -q`, for the reason recorded in iteration 1:
the new tests need an engine that round T has not built. Second time, so
tests/ESCALATE.md is written and the lane stops. No test was weakened.

## Iteration 3, 2026-09-28: tests for the answers to the review

Spec: specs/phase-2/SPEC-fixes.md, findings 1, 2, 4, 5 and 7. Inputs: reviews/phase-2.md.

### What was written

| File | What it covers |
|---|---|
| tests/support/f1_pack.py | The two new rules at the end of SPEC_RULES (opt.latest_start_after_days 60, stem.apply_window_closes_rule true). `leave_out` on pack_dict and build_pack. `with_operative_status` and `with_regime_rows` |
| tests/unit/engine/test_f1_fixes.py | Finding 1: the reviewer's input, cap-gap alone, ten ways a needed part can be absent or null, and the general rule as a property. Finding 2: parse_case refuses NaN and both infinities. Finding 4: the largest case under one second, counts on the widest window by hand, a count of engine lines that must not grow with the window, the far dates conflict, the interval count against a day-by-day count on small windows. Finding 5: each item names its own rule and moves with it alone, the closing is left out when the pack lacks the rule, the rename. Finding 7: operative on every item with alternates, with appealed and five other statuses, with the regimes changing places |
| tests/unit/api/test_compute_fixes.py | Finding 1 through the api with the reviewer's body as text. Finding 2: NaN, Infinity and -Infinity in eight places, as the whole body, refused before the contract is checked, and 1e999. Finding 4: six far dates in each of 13 date fields, 50 and 51 periods, the count bounds, input A refused within a second, the largest case within a second, the engine off the event loop. Finding 7 against the shipped pack |
| tests/holdout/test_holdout_fixes.py | The hidden second set for all five findings, with other cases and other numbers |
| tests/unit/engine/test_f1.py, test_f1_sourcing.py, tests/unit/api/test_compute.py | Follow the SPEC: the renamed item, and opt.latest_start read from its own rule. No assertion was loosened or removed |

### What ran and what it printed

- The done command: exit 0. `ruff check tests`: All checks passed. `ruff format --check tests`:
  26 files already formatted.
- `uv run pytest tests/unit tests/holdout` on the engine and api as they are: `119 failed,
  801 passed`. Expected: rounds F2 and F3 have not run. By file: test_f1_fixes.py 47,
  test_holdout_fixes.py 46, test_compute_fixes.py 10, test_f1.py 7, test_holdout_sourcing.py 4,
  test_f1_sourcing.py 3, test_compute.py 1, test_holdout_f1.py 1. The failures in the older
  files are the rename and the new rule id for opt.latest_start.
- Satisfiability check, as in iterations 1 and 2. A throwaway copy of engine/f1.py and
  api/main.py in a scratch folder under tests/, changed to follow the SPEC and loaded with
  `PYTEST_PLUGINS`. The scratch api added the two rule ids to the shipped pack in memory.
  Result over tests/unit and tests/holdout: `920 passed`. The scratch folder was deleted
  before the commit.
- Planted faults in the scratch copy, each run over both folders:
  - operative status written as "effective": 12 failed.
  - cap-gap alone not named as missing: 16 failed.
  - parse_case refusing NaN and not the infinities: 18 failed.
  - opt.latest_start naming opt.apply_after_days: 18 failed.
  - the day by day loop put back: 2 failed, the two tests that count engine lines.
- The check found one mistake of mine: the hidden api tests ran the shipped pack on
  2025-03-14, a day on which opt.report_employer_within_days is not in force. They now run
  on 2026-09-28, as the unit api tests do.

### What the one second test does not catch

On the largest case the contract allows, the engine as it is now, which walks the window one
day at a time, answers in about 0.16 seconds on this machine. The bounds in the contract
are what closed the 49 seconds the reviewer saw. So the one second test passes before any
engine work. The SPEC line "counting must not depend on the length of the window one day
at a time" is held by `test_counting_does_not_walk_the_window_one_day_at_a_time` and its
hidden twin. They count the lines of engine code that run, through `sys.settrace`, on a
window of 31 days and on one of 54,787 days, and allow fewer than one line for each day
added. They do not depend on the speed of the machine.

### Hidden tests and the instruction not to read them

The rename in finding 5 reaches two hidden files that this lane wrote earlier. I did not
open them. I replaced the quoted id `stem.final_evaluation_due"` with the new id by a
blind search and replace, one line in each file, and ran them with the traceback switched
off. Against the reference they pass. SHIFTED gained `opt.latest_start_after_days: 61`,
the same shift as opt.apply_after_days, so every date expected under that pack holds.
This differs from the lesson of iteration 2, and the reason is that here the change keeps
the meaning of the hidden tests where leaving it out would have changed it.

### Order of landing (needs the orchestrator)

The api tests run on the shipped pack. `opt.latest_start` and `stem.apply_window_closes`
are answered through the api only once rulepacks/f1-us/v2026.09/parameters.yaml holds
opt.latest_start_after_days. If L-content leaves stem.apply_window_closes_rule out, the
api tests still pass: none of them needs that item.

### Questions (continued; the tests take the side stated)

25. What a missing OPT block is called. The SPEC says `missing_inputs` names `opt`. The
    tests accept any reason that starts `missing:opt`, so `missing:opt` and
    `missing:opt.ead_start` both pass.
26. Are the three counts shown when OPT is absent? The tests require only that a count
    that is shown is null.
27. Are the counts shown when the inputs conflict? "It returns the items it can and the
    conflict." The tests require the conflict, the items that turn on program_end_date,
    and that the window is not walked. They do not say whether a count is shown.
28. The renamed item no longer ends in `_due`. SPEC, "Verdict inputs", makes a dated
    item an open item by the ending of its id. Whether the final evaluation is still an
    open item inside the look-ahead is not tested. It needs a line in the SPEC.
29. stem.apply_window_closes_rule set to false. Not tested. The SPEC gives the flag no
    meaning beyond being cited and being present.
30. Does `parse_case` refuse a date outside 1950 through 2099, or a 51st period? The
    SPEC asks this of the api only. Not tested for the engine.
31. The words of the refusal for NaN. The tests require a 422 whose detail is text, the
    same text whatever else is wrong with the case. They do not fix the words.
32. An item without alternates that carries `operative`. The contract says "present with
    alternates". The tests require it where there are alternates and do not forbid it
    elsewhere.
33. "The handler does not run the engine on the event loop." The tests do not look at
    how the handler is written. They pass a clock that notes whether an event loop is
    running in the thread that reads it.

### Stop hook

The lane test in .claude/lanes/L-tests.yaml is still `uv run pytest -q`, which cannot pass
in round F1 for the reason recorded in iterations 1 and 2. The done command for this
round passes. No test was weakened, skipped, or marked as expected to fail.

## Lesson

- Failure: a timing test passed against the code it was written to catch. The bound in
  the contract had already made the slow path fast enough.
  Fix: when the rule is about how work grows, count the work and compare two sizes. Keep
  the timing test the SPEC asks for, and do not rely on it.
  Evidence: the day by day loop put back into the reference: 2 failed, both line counts;
  the two one second tests passed.
- Failure: hidden api tests raised `RulepackError: opt.report_employer_within_days: no
  rule in force on 2025-03-14`.
  Fix: a test on the shipped pack uses the clock of the unit api tests, 2026-09-28. A
  test that needs another day builds its pack in code.
  Evidence: tests/holdout/test_holdout_fixes.py, the `client` fixture.

## Iteration 4, 2026-09-29: the context round

Spec: specs/phase-2/SPEC-context.md, sections 2 to 5. Read first: PRINCIPLES.md,
DECISIONS.md D32 to D35, BOUNDARY.md, and the contracts as changed on this branch.

### What was written

| File | What it covers |
|---|---|
| tests/support/f1_pack.py | `derivation` on every rule of the test pack, and a `note` on the three marked as readings (READINGS). The new flag stem.requires_post_completion_opt at the end of SPEC_RULES. TIME_ZONE, the three question ids, `answers`, `answered_yes`, `question_ids`, `clock_at`, `with_derivation` |
| tests/unit/engine/test_f1_context.py | Section 2: the SPEC's own test, 16 instants and zones by hand with both sides of midnight and the end of daylight time, a clock whose today() raises, the age of the rules and an open item on the person's day, known and unknown zones in parse_case, a property over any instant and zone. Section 3: every row of the table for OPT and for STEM, and a property. Section 4: each question unanswered, answered yes, answered no, the first day of the window, the general property. Section 5: derivation and note from the pack, changed by the test to show they are read from the pack |
| tests/unit/api/test_compute_context.py | The day and the zone through the api, a missing zone, four zones that do not exist, eleven values that are not zones, nothing of the refused zone in the words or the log, each question and each answer through the api, 17 bad confirmations, derivation on the shipped pack |
| tests/holdout/test_holdout_context.py | The hidden second set for all four sections, with other cases, instants, zones and numbers, and the start of daylight time |
| tests/unit/engine/test_f1.py, test_f1_sourcing.py, test_f1_fixes.py, tests/unit/api/test_compute.py, test_compute_fixes.py | Every case carries `time_zone`, and the answer yes to the three questions. See "Changes to existing tests" |
| tests/holdout/test_holdout_f1.py, test_holdout_fixes.py, test_holdout_sourcing.py | The same, by a script, without opening them. Two tests taken out by name. See "Hidden tests" |

### What ran and what it printed

- The done command: exit 0. `ruff check tests`: All checks passed. `ruff format --check
  tests`: 29 files already formatted.
- `uv run pytest tests/unit tests/holdout` on the engine and api as they are:
  `254 failed, 919 passed`. Expected: rounds G2 and G3 have not run. In the older unit
  files 58 tests fail: 56 on the line `contract_problems(out) == []`, because the output
  contract now requires `questions` and `today`, and the 2 this round changed (items 3
  and 4 under "Changes to existing tests"). The older hidden files fail 20, run with the
  traceback off. test_rulepack.py, test_verdict.py and tests/unit/tools: `99 passed`.
- Satisfiability check, as in earlier iterations. A throwaway copy of engine/f1.py in a
  folder that git ignores, changed to follow the SPEC, loaded with `PYTEST_PLUGINS`. The
  scratch api turned the ValueError into a 422 and gave the shipped pack, in memory, a
  derivation on each rule and the new flag. Result over tests/unit and tests/holdout:
  `1173 passed`. The folder was deleted before the commit.
- Planted faults in the scratch copy, each run over both folders:
  - today read in UTC: 34 failed.
  - a fixed offset for each zone, no daylight time: 4 failed.
  - an unknown zone raising KeyError where the SPEC says ValueError: 20 failed.
  - the recommendation date still blocking: 16 failed.
  - file_by left out even while the date still matters: 5 failed.
  - STEM without OPT taken as yes without asking: 12 failed.
  - an empty employment list counted without asking: 15 failed.
  - the employment question raised one day late: 5 failed.
  - the answer no without the paragraph on who may apply: 4 failed.
  - derivation not shown: 11 failed.
  - every rule shown as verbatim: 6 failed.
  - the age of the rules counted from the clock's day: 2 failed.
- The check found one mistake of mine: cap-gap alone with the answer no gave cannot_tell,
  because the program had ended and the grace period turns on the rule in litigation. The
  case now ends its program after the day of the test.

### Changes to existing tests

No assertion was loosened. Each change follows a line of the SPEC.

1. Every case gained `"time_zone": "UTC"`. The clock of `clock_on` stands at noon UTC, so
   every day in the older tests is the day it was.
2. Every case except the two "only the required fields" cases gained the answer yes to
   all three questions (`answered_yes()`). A case written before the questions existed
   then says what it said: the person held OPT, and the employment entered is whole.
   With yes, STEM without OPT still gives `missing:opt...`, which is what the tests of
   finding 1 require. This rests on question 36 below.
3. tests/unit/api/test_compute.py: the keys of the response include `questions` and
   `today`. `no_time_zone` joined the bad cases.
4. tests/unit/api/test_compute_fixes.py: the reviewer's body, sent without an answer, now
   expects `unconfirmed:held_post_completion_opt`. A second test sends it with the
   answer yes and expects `missing:opt`, as before.
5. tests/unit/engine/test_f1.py, `test_a_missing_recommendation_date_gives_a_null_file_by`:
   the cases now record neither a filing date nor an EAD, so the date still matters.
6. tests/unit/engine/test_f1_fixes.py: the two recommendation dates left GAPS. Under D32
   a recommendation date blocks only when the block has no filing date and no EAD start,
   and a block without an EAD start is a gap of its own.

### Hidden tests and the instruction not to read them

I did not open the older hidden files. What I did to them, blind:

- A script put `time_zone` and `answered_yes()` after each `"program_end_date":` line of
  a case. It printed counts only: 3, 4 and 2 cases, the same as the count of such lines.
- Against the reference, two older hidden tests still failed, both in
  test_holdout_fixes.py. I took them out by name with a script that reads the syntax
  tree, 57 lines, and ruff removed the imports left unused. Their replacements are at the
  end of test_holdout_context.py:
  - `test_a_null_date_that_an_item_needs_never_gets_the_quiet_verdict`. Under D32 a null
    recommendation date beside a recorded EAD is no longer a reason. Replaced by
    `test_a_null_ead_date_never_gets_the_quiet_verdict`, and by the section 3 tests.
  - `test_the_api_reads_the_clock_off_the_event_loop`. I believe it watched `today()`,
    which the engine may no longer call. Replaced by
    `test_the_api_reads_the_instant_off_the_event_loop`, which watches `now()` too.
- This is a removal of tests I have not read. It needs a look by someone who may read
  the folder. The commit before this round holds both tests as they were.

### Requests for files this lane does not own

- The zones are read from the system's zone files. The project does not list `tzdata`.
  On this machine (macOS) every zone in the tests is found. In a small Linux image with
  no zone files, `zoneinfo` finds no zone at all, and every case would be refused.
  Whoever owns pyproject.toml and the api image: add `tzdata`, or install the system
  package. I did not add a dependency.
- .claude/lanes/L-tests.yaml still has `test: uv run pytest -q`, which cannot pass in
  round G1, for the reason recorded in iterations 1 to 3.

### Questions (continued; the tests take the side stated)

34. Section 3, a recommendation date that is present when the filing or the EAD is
    recorded. "When an input has stopped mattering, the item that needed it is left out"
    can be read two ways: file_by is left out whenever a filing or an EAD is recorded, or
    only when the recommendation date is absent as well. The new tests require the item
    to be left out when the date is absent, and say nothing new about the other case.
    The older tests, the hidden golden cases among them, still require file_by with its
    date when the recommendation date is present, so the suite as a whole holds the
    engine to the second reading. Under it, a file_by inside the look-ahead is still an
    open item after the filing is recorded. If the founder means the first reading,
    these change: the golden cases, the look-ahead tests that use opt.file_by, and
    their hidden twins, which need someone who may read them.
35. While held_post_completion_opt is open, is OPT named as missing? The tests say no:
    no reason starts with `missing:opt` until the person answers yes. PRINCIPLES.md, 2.
    The same for cap_gap_without_training.
36. An answer to a question that is not raised. The tests require that it changes
    nothing, whether yes or no. An answer stays in the case after the record changes.
37. The answer no to held_post_completion_opt, and the counts. The tests require that any
    count shown is null, and that OPT is not named as missing. They do not say whether
    stem.apply_window_opens is shown.
38. While no_employment_to_record is open, or answered no, the tests require that any
    count shown is null. "Counting goes ahead" is said of the answer yes alone.
39. STEM without OPT and an empty employment list. The window's first day is not known,
    so "the counting window has begun" cannot be decided. The tests require the OPT
    question and do not say whether the employment question is asked as well.
40. `because`. The tests require text, each entry starting with the name of a case field
    (opt, stem, employment, cap_gap), and one entry that names the part the question is
    about. They do not fix the list.
41. The age of the rules, the litigated check and the open items are counted from the
    person's own day. This follows from "the engine never calls clock.today()". decide()
    in engine/verdict.py reads clock.today() today; tests/unit/engine/test_verdict.py
    still passes a clock to decide() and was not changed.
42. A zone in other letters, such as america/los_angeles. macOS finds it and Linux does
    not. Not tested.
43. An answer dated after today, or an id the engine does not know. Not tested.
44. A rule with status school. Section 1 asks for a derivation on the other four
    statuses. The test pack marks every rule, the school rule too. The api tests on the
    shipped pack require a derivation only on the four.
45. A verbatim rule that carries a note in the pack. Not tested.
46. The words of the 422 for an unknown zone. The tests require text that names
    `time_zone` and does not repeat the value sent.

### Stop hook

The lane test is `uv run pytest -q`. It cannot pass in this round. The done command for
the round passes. No test was switched off, skipped, or marked as expected to fail.

## Lesson

- Failure: a case meant to reach talk_to_dso gave cannot_tell. The program had ended
  before the day of the test, so the grace period, a rule in litigation, stood in the way.
  Fix: a test of talk_to_dso, needs_you or no_open_items first rules out every reason
  for cannot_tell: documents, the age of the rules, and a day after the last end date.
  Evidence: tests/unit/engine/test_f1_context.py, CAP_GAP_ONLY, program_end_date
  2026-12-18.
- Failure: none seen, but close. `uv run pytest -q -q` prints no summary line, and a
  planted fault run looked empty.
  Fix: pyproject.toml already passes -q. Do not pass it again when the count matters.
  Evidence: the first planted fault run of this iteration printed twelve empty lines.
- Failure: a contract change that adds a required field to the output turns every older
  `contract_problems(out) == []` red, which hides what else an older test says.
  Fix: judge the older tests against a reference that follows the new contract, never
  against the engine as it is.
  Evidence: 254 failed on the engine as it is, 0 on the reference.

## Iteration 5, 2026-09-29: is_weekend, the factory seed task (run l-tests-0ec4e196e8)

Read: tests/PROGRESS.md, specs/factory/e2e-SPEC.md, CLAUDE.md, contracts/factory_report.schema.json.

### What was written

tests/unit/engine/test_is_weekend.py, ten tests, from specs/factory/e2e-SPEC.md alone.
engine/dates.py was read only for the names it holds; is_weekend is not there yet.

- Seven tests, one for each day from Monday 2026-10-05 through Sunday 2026-10-11.
  Working: January 1, 2026 is a Thursday. January through September hold
  31+28+31+30+31+30+31+31+30 = 273 days, so October 5 is 277 days after January 1.
  277 = 39 * 7 + 4. Thursday plus 4 is Monday. The printed calendar (`cal 10 2026`) agrees.
- A property: for any date, is_weekend(d) is (d.weekday() >= 5).
- A property: any seven days in a row hold exactly two weekend days.
- One test that the function takes a date and nothing else.

### What ran and what it printed

- `uv run ruff check tests`: All checks passed!
- `uv run ruff format --check tests`: 36 files already formatted
- `uv run pytest tests/unit/engine/test_is_weekend.py`: 10 failed, each with
  AttributeError: module 'engine.dates' has no attribute 'is_weekend'. The SPEC expects this.

### What change to the code would make each test fail

Shown by swapping in a function through a scratch pytest plugin under TMPDIR, removed after.

| function swapped in | result |
| --- | --- |
| d.weekday() >= 5 (what the SPEC asks) | 10 passed |
| Saturday only | 3 failed: Sunday, both properties |
| Sunday only | 4 failed: Saturday, both properties, the one date test |
| Friday counted too (>= 4) | 3 failed: Friday, both properties |
| always True | 7 failed: Monday to Friday, both properties |
| always False | 5 failed: Saturday, Sunday, both properties, the one date test |

The one date test fails when is_weekend accepts a second argument, such as a clock.
It does not catch a function that reads the system time inside and takes one argument;
no test can see that from outside. Gate rules on engine.clocks cover it.

### Not tested, because the SPEC does not say

- What is_weekend does with a datetime, or with a value that is not a date.

## Lesson

- Failure: none in the work. A property over seven days in a row would overflow at
  date.max if the first day were drawn from the whole range.
  Fix: draw the first day from dates up to date.max minus six days.
  Evidence: tests/unit/engine/test_is_weekend.py, `days`.

## Iteration 6, 2026-09-29: product round 1 (run l-tests-10980efb8b)

Read: tests/PROGRESS.md, specs/product-1/SPEC.md, reviews/phase-2-second.md, CLAUDE.md,
PRINCIPLES.md, BOUNDARY.md, DECISIONS.md, contracts/engine_output.schema.json,
contracts/case_f1.schema.json. engine/f1.py and engine/verdict.py were read for the
names they hold and for the conflict ids of earlier rounds.

### What was written

| File | What it covers |
|---|---|
| tests/unit/engine/test_f1_product.py | Sections 1 to 6. For each of the 13 conflicts: the input that raises it, the input to the safe side, the answers yes and no, the about of the question. The reviewer's inputs of findings 1, 4, 5 and 6. Days between two cards. The two questions of section 2. The day and the about of an answer. Done items. reading on items and on upcoming. The four next dates, lists. A property over generated records |
| tests/unit/api/test_compute_product.py | The same findings through POST /v1/compute/f1 with the reviewer's clock and zone, the 422 for an answer dated after today, upcoming and lists in the response |
| tests/holdout/test_holdout_product.py | Hidden second set: other dates, today 2027-03-10, a leap day, two conflicts at once, a second property |
| tests/support/f1_pack.py | Three placeholder rules stem.requires.*, the ids of the questions and conflicts, helpers for upcoming, conflicts and answers that carry about, and the table of section 1 written apart from the engine (conflicts_by_the_table) |

### Changes to existing tests, each because a contract changed

No assertion was switched off or deleted. Each change is listed so the founder can judge it.

1. Cases without cpt_full_time_days (STEM_ONLY, CAP_GAP_ONLY, STEM_WITHOUT_OPT and six
   more, in test_f1_context.py, test_f1_fixes.py, test_compute_context.py,
   test_holdout_context.py, test_holdout_fixes.py) gained `cpt_full_time_days: 0`.
   Without it each would now raise full_time_cpt_used, which is not what they test.
2. tests/unit/engine/test_f1.py, test_parse_case_fills_what_the_contract_lets_a_case_leave_out:
   `cpt_full_time_days == 0` became `is None`. The case contract no longer has the default.
3. tests/unit/engine/test_f1_context.py, test_an_empty_list_with_neither_opt_nor_stem_raises_no_question:
   `questions == []` became `NO_EMPLOYMENT not in question_ids`. The engine now asks
   nothing_more_to_record in that case (D41). This is narrower than before.
4. The two older properties (test_f1_context.py and test_holdout_context.py) allowed only
   the three questions of their round. They now allow the two new questions and leave
   conflict questions to the new property. This is narrower than before.

### What ran and what it printed

- The done command: exit 0. `ruff check tests`: All checks passed. `ruff format --check tests`: 39 files already formatted.
- `uv run pytest tests/unit/engine tests/unit/api tests/holdout` before any change: 151 failed, 896 passed.
  Every one of the 151 is the older tests meeting the new output contract (upcoming, lists, reading required).
- The same after the changes, without the three new files: 152 failed, 895 passed. The one
  more is change 2 above, which cannot pass until the engine stops defaulting to 0.
- With the three new files: 432 failed, 911 passed. The SPEC expects the new tests to fail.
- The safe side of every conflict was run on the engine as it is: each fails only on the
  contract check that comes last, so each case reaches a verdict other than cannot_tell.
- Every date and count was worked by hand and then checked with datetime in a scratch
  script: all agree.

### What change to the code would make each test fail

Not shown by planted faults this time. No reference engine for the new contract was
written: the time limit of the attempt did not allow it. This is a gap. What is known:

| Tests | Fail on the engine as it is, because |
|---|---|
| conflict raised, question, about, yes, no (13 rows each) | no conflict of the table exists: verdict is no_open_items or needs_you |
| null items while a conflict is open | the items hold dates and counts |
| section 2 questions | cpt days default to 0; nothing is asked |
| answer dated after today | parse_case takes it |
| answer before today, answer about other values | `_answer` never reads `on` or `about` |
| done items | opt.apply_window_closes is an open item |
| reading, upcoming, lists | the keys are absent |

Thirteen tests pass on the engine as it is. Each says that something is not asked or
not refused (an open period past the last card, a part entered, cpt days entered, an
answer dated today). They fail on an engine that asks or refuses too much.

### Disputes

1. contracts/engine_output.schema.json, questions.items.id has the pattern
   `^[a-z0-9_]+$`. SPEC section 1 gives the question the id of the conflict, such as
   `opt.card_longer_than_rule`, which holds dots. The case contract was changed to take
   dots in the names of confirmations; the output contract was not. The tests follow
   the SPEC. test_the_output_of_a_conflict_follows_the_contract and
   test_the_response_to_a_conflict_follows_the_contract cannot pass with both as written.

### Questions (the SPEC is unclear; the tests take no side unless stated)

47. An answer with no `about` at all. Is it an answer to a question that carries about?
    Most older tests answer through `answers()`, with no about. If it is not an answer,
    those tests need the helper answer_as_the_screen_does. Not tested. Needs the founder.
48. How parse_case learns the day. The tests pass the clock as a second argument when
    parse_case takes two or more, and one argument otherwise. Older tests call it with one.
49. A card whose last day is the day the months end (2025-11-01 to 2026-11-01). Longer
    than the rule or not? Left open: the raising input is one day past it, the safe input
    one day before it.
50. The shape of `about`. The tests require only that the values that do not fit are
    somewhere inside it, and that the engine compares it with what the answer carries.
51. The shape of the inputs of cpt.full_time_days_used after the answer no. The tests
    require the id full_time_cpt_used and the day of the answer somewhere inside, and
    that cpt_full_time_days is not shown as 0.
52. Which items "use the dates" of a conflict. Tested: grace.ends and the counts for the
    card rows, the counts for the gap and the employment rows, capgap.ends for the
    requested start (and for the petition date in the reviewer's input, where the
    reviewer named it).
53. Whether the rules named in upcoming and lists are shown under `rules`. The contract
    says "every rule named in computed". The tests require them there, since the screen
    shows their words.
54. Conflict ids of earlier rounds (stem_start, opt_start) are not in the table. Untouched.
55. The reason for an open question of section 2 is taken to be `unconfirmed:<id>`, as
    SPEC-context section 4 has it.

### Requests for files this lane does not own

- contracts/engine_output.schema.json: allow dots in the id of a question, or the SPEC
  names another id for the question of a conflict.
- specs/product-1/SPEC.md: a line for each of questions 47, 48 and 49.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Lesson

- Failure: a date after today for a filing also lies after a card in hand, so one input
  raised two conflicts and the row could not be tested alone.
  Fix: test the after_today rows on a case whose card begins after today.
  Evidence: tests/unit/engine/test_f1_product.py, AHEAD and STEM_AHEAD.
- Failure: older cases that leave a field out change meaning when the contract drops a default.
  Fix: spy on parse_case through a scratch plugin under TMPDIR to list every test whose
  case lacks the field, then change the cases, not the assertions.
  Evidence: 43 tests listed for cpt_full_time_days, 7 for no training entered.

## Iteration 7, 2026-09-29: the resolutions of the engine builder's escalation (run l-tests-9f87ae7e93)

Read: tests/PROGRESS.md, specs/product-1/SPEC-resolutions.md, specs/product-1/SPEC.md,
CLAUDE.md, engine/PROGRESS.md on lane/L-engine/l-engine-b63b2c6ea2 ("Disputes"),
contracts/factory_report.schema.json. engine/f1.py was read for the name of `_answer` only
(to plant the fault below) and for how parse_case takes the clock.

### What was done

| Resolution | Change |
|---|---|
| 2 (answer after the day of the case) | answered_yes() now dates its answers ON_THE_DAY_IT_RUNS ("1950-01-01", the first day the case contract takes). dated_on_the_day(case, clock) puts in the person's own day, worked with zoneinfo apart from the engine, before each run. test_the_answer_yes_to_another_row_leaves_this_one_open runs on the row's own day |
| 3 (no_employment_to_record covers through its day) | the same: an older case's yes is given on the day it is run, which is what it meant. test_window_runs_... passes without a change to its assertions |
| 4 (open conflict gives nulls) | cases changed so their facts fit: test_f1.py year-mark rows (card, filing and work moved with the start), test_final_end (one open period), the counting property (periods inside the cards, STEM filing on or before today), test_a_period_covers_its_first_and_last_day (rows inside the card; the rows that began before the card moved to a new test that expects the conflict and null counts); test_f1_sourcing.py clamped month, shorter extension, evaluation property, report property, earliest OPT start |
| 5 (done step is no open item) | opt.file_by and opt.apply_window_closes tests now expect no open item on a case with the card (renamed to say so). The lookahead tests were moved onto stem.validation_2_due (2026-07-16 for CASE_B), which is never done |
| 7 (no about, no answer) | with_the_about_asked(case, compute) in tests/support/f1_pack.py: each answer with no about is sent with the about of the question the output asked, in the order asked, as the screen does. Every run() helper of the older engine and holdout files goes through it. New tests in test_f1_product.py: test_point_7_* for no_employment_to_record (yes and no), all 13 conflict rows, nothing_more_to_record (yes and no), full_time_cpt_used, and a control with the about |
| 8 (parse_case(raw, clock)) | every run() helper now calls parse_case(sent, clock). parsed() in the product file no longer guesses by signature. New: test_point_8_parse_case_takes_the_clock_as_its_second_argument, and a property over every day 1950-01-01 to 2099-12-30 with an injected clock |
| 10 (card through the day its months end) | conflicts_by_the_table no longer leaves it open (unsure is always empty). New: test_point_10_... with 2026-10-31, 2026-11-01 (no conflict) and 2026-11-02 (conflict), 12 months from 2025-11-01 being 2026-11-01 |

Working for the new dates: 2026-07-10 through 2026-09-28 is 22 + 31 + 28 = 81 days.
stem.validation_2_due 2026-07-16 less 14 is 2026-07-02, less 15 is 2026-07-01. 12 months
from 2024-08-31 is 2025-08-31; 24 from 2025-08-31 is 2027-08-31. Jun 1 through Sep 28
is 30 + 31 + 31 + 28 = 120, so a period of Jun 1 alone leaves 119 and Jun 1 to 2 leaves 118.

### What ran and what it printed

- Before: `pytest tests/unit/engine tests/unit/api` 48 failed. With a scratch plugin under
  TMPDIR that makes `engine.f1._answer` return OPEN for an answer with no about (the fault
  of point 7 reversed, i.e. point 7 put in): about 150 failed over engine, api and holdout.
- After, the engine as it is: engine files 25 failed (18 are the new point 7 tests, which
  must fail until the engine does point 7; 4 in test_f1_context.py, 3 in test_f1_fixes.py),
  api 5, holdout 23.
- After, with point 7 put in by the plugin: test_f1.py, test_f1_sourcing.py and
  test_f1_product.py all pass. Left: test_f1_context.py 4, test_f1_fixes.py 3, api 16,
  holdout 24.
- The done command: exit 0 (All checks passed; 40 files already formatted).

### What change to the code would make each new test fail

- test_point_7_*: shown. They fail on the engine as it is (it reads an answer with no
  about as given: verdict talk_to_dso, no question) and pass with the plugin.
- test_point_8_*: fail on a parse_case that takes one argument (TypeError) or that reads
  the day from the system time (the property draws days far from it). Not planted.
- test_point_10_*: fails on an engine that compares the end with the months less a day
  (2026-11-01 raised). Not planted.
- test_a_period_that_begins_before_the_card_gives_no_count: fails on an engine that
  counts days before the card.

### Not done in this attempt (time)

- test_f1_context.py: test_an_item_is_open_on_the_persons_own_day,
  test_no_date_from_before_the_ead_blocks_a_case_that_holds_the_ead,
  test_the_question_names_the_inputs_that_raised_it (point 6: it expects id and because
  only), test_the_answer_yes_counts_on_an_empty_list (point 7: answers() with no about).
- test_f1_fixes.py: the two largest cases and the day-by-day property (point 4: days
  between two cards and periods outside them).
- tests/unit/api: the compute files answer with answers() and no about (point 7) and do
  not go through with_the_about_asked; api 422 tests wait for L-api (point 8).
- tests/holdout: go through the new helpers, but 24 older cases hold facts of section 1
  or done steps, as in the unit files.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Lesson

- Failure: an older case computed on many days carried answers dated 2026-09-28; point 2
  refuses them on earlier days and point 3 reopens no_employment_to_record on later days.
  Fix: a marker date the case contract takes, replaced by the person's own day before the
  case is computed, so the answer is given on the day the case runs.
  Evidence: 52 + 16 + 8 ValueErrors "dated after today" went to 0.
- Failure: resolution 7 changes the meaning of every older answer at once, and the engine
  had not done it yet, so the tests could not show which cases it breaks.
  Fix: a scratch pytest plugin that patches engine.f1._answer to put point 7 in, run beside
  the plain run, and a helper that sends each answer with the about the output asked.
  Evidence: failures under the plugin in test_f1.py went from 29 to 0.

## Iteration 8, 2026-09-29: the seven tests the engine builder named (run l-tests-0da09336d8)

Read: tests/PROGRESS.md, specs/product-1/SPEC-resolutions.md, specs/product-1/SPEC.md
sections 1 to 6, CLAUDE.md, engine/PROGRESS.md on lane/L-engine/l-engine-209410c52d,
contracts/case_f1.schema.json (confirmations.about), contracts/engine_output.schema.json
(questions.about), contracts/factory_report.schema.json. engine/f1.py and
engine/verdict.py on the engine branch were read to see why a case the mission asked for
could not raise an open item (below), not to take expected values from them.

### What was done

| Mission point | Change |
|---|---|
| 1 | tests/support/f1_pack.py: answers() and answered_yes() give each answer `about: about_asked(<question id>)`, an about naming the question, and a day: `on`, or with `clock=` the person's own day at its instant (day_of, zoneinfo apart from the engine). The default day stays ON_THE_DAY_IT_RUNS, put in as the case's day by dated_on_the_day. with_the_about_asked now fills in the values of the question for an answer whose about is about_asked(id) as well as for one with none. answers_with_no_about() is new, for the point 7 tests only (test_f1_product.py uses it in its four point 7 tests, so they still send no about). ANSWERED_ON removed (unused). test_f1_context.answered() defaults to ON_THE_DAY_IT_RUNS |
| 2 | test_an_item_is_open_on_the_persons_own_day: no case the SPEC allows gives opt.apply_window_closes as an open item (dispute below). Moved to stem.validation_2_due on CASE_B (2026-07-16), at 01:30 UTC on 2026-07-17: open in Los Angeles (Jul 16), past in Kolkata (Jul 17); east also asserted not cannot_tell |
| 3 | whole_cases in test_f1_context.py: today is drawn from opt_start + 334 on (the STEM filing, the latest date drawn: opt_end - 30 = opt_start + 364 - 30) |
| 4 | test_the_question_names_the_inputs_that_raised_it expects {id, because, about}, about a mapping |
| 5 | test_the_answer_yes_counts_on_an_empty_list dates the answer 2026-08-01, the case's day, and asserts so |
| 6 | largest_case_the_rules_allow(): OPT 2097-01-01..2097-12-31, STEM 2098-01-01..2099-12-31, 50 periods, program end 2096-12-15. Both counting tests use it and assert no conflict. largest_case() stays the contract's widest for the timing and step tests |
| 7 | small window property: conflicts_by_the_table decides; any row other than after_today (these touch no date the counts use) gives null counts, cannot_tell and the row among the conflicts; otherwise the day-by-day comparison as before. The generator keeps every period inside the cards in half the draws, so the comparison still runs on many cases |

Working: 12 months from 2097-01-01 is 2098-01-01; 24 from 2098-01-01 is 2100-01-01. 2097,
2098, 2099 are not leap years: 3 x 365 = 1,095 days; 150 - 1,095. stem.validation_2_due
for CASE_B: 2025-07-01 + 12 months = 2026-07-01, then 10 business days with Jul 3 the
observed Jul 4: Jul 2, 6, 7, 8, 9, 10, 13, 14, 15, 16.

### What ran and what it printed

- Done command as written: ruff check and ruff format --check pass; then `git archive
  HEAD | tar -x` into .done-scratch fails with "Can't create '.claude/agents/...':
  Operation not permitted" (the sandbox refuses .claude/ paths even in the scratch copy),
  exit 1, before pytest. The same steps with .claude excluded, into TMPDIR, with the
  working tree's tests/ over HEAD and engine/ from the engine branch:
  - before: 7 failed (the seven named)
  - after: tests/unit/engine 794 passed, 0 failed, exit 0
- tests/unit/api and tests/holdout on the same engine: 38 failed before, 36 after; no
  new failure (the two holdout empty-list tests now pass).
- ruff check tests: All checks passed. ruff format: done after the last write.

### What change to the code would make each changed test fail

- small window property: an engine that drops stem.gap_after_opt (planted with a
  scratch plugin under TMPDIR replacing engine.f1._facts): the property fails. Shown.
- largest case tests: an engine that counts days outside the cards, or that raises
  card_longer_than_rule on a card ending the day before its months end.
- question keys: an engine that leaves about off a question.
- item open on the person's day: an engine that reads the day in UTC, or that lists an
  item on the day after it.
- whole_cases: an engine that lets an emptied filing date change a count.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Iteration 9, 2026-09-29: api and holdout tests in line with the resolutions (run l-tests-2591450738)

Read: tests/PROGRESS.md, specs/product-1/SPEC-resolutions.md, specs/product-1/SPEC.md
sections 1 to 6, specs/phase-2/SPEC.md (missing_inputs), contracts/engine_output.schema.json
(questions.about), contracts/factory_report.schema.json, api/REPORT.json disputes on
lane/L-api/l-api-b92dbaa4da (api/ESCALATE.md is not on that branch: `git show` says the path
does not exist). The api branch was laid over a scratch copy under TMPDIR, never merged.

### What was done

| Mission point | Change |
|---|---|
| Guard | tests/support/f1_pack.py: refuse_placeholders(case) raises PlaceholderAnswerError (an Exception, not a ValueError, so that a test expecting the engine's refusal cannot pass on the marker) when an answer is dated ON_THE_DAY_IT_RUNS or carries an about of the form {"question": id}. with_the_about_asked now leaves out an answer whose question is never asked, rather than sending the placeholder. Every run helper that calls parse_case with a clock (5 engine files, 5 holdout files) passes its case through the guard. tests/support/api_client.py (new): CheckedClient, a TestClient whose post refuses a placeholder in `json=` or in `content=` before anything is sent, and as_the_screen_sends(client, url, case, clock), the screen's step against the api. Every api fixture (tests/unit/api, holdout context and fixes) uses CheckedClient |
| Refusal test | tests/unit/support/test_placeholders.py (new): the two markers are refused; the error is no ValueError; real answers pass unchanged; a run helper refuses before parse_case is called; CheckedClient refuses before the api reads its clock; a body that is not JSON is still posted; the screen step gives an answer on the person's own day with the question's about, which the api takes (81 days); an ast scan finds every helper that calls parse_case(x, clock) without refuse_placeholders; a scan finds any TestClient(app ... in the api and holdout files |
| api callers | test_compute.py and test_compute_fixes.py: GOOD carries no answer (it raises no question). test_nothing_is_kept_between_requests answers no_employment_to_record through as_the_screen_sends (2026-09-28, the case day); test_cap_gap_with_neither_opt_nor_stem gives answered_yes() through it; the reviewer's body now carries the about the api asked; the largest case goes through it before the timed request. test_compute_context.computed() goes through as_the_screen_sends. test_compute_product: the refusal tests carry the asked about, so only their day is out of place |
| Key set | test_a_good_case_returns_the_engine_output adds upcoming and lists (SPEC.md section 3 of product-1) |
| Engine callers the guard found | test_f1_product.py: the yes to another row carries this row's about (only the id is wrong); the person's-own-day test uses given_on; the after-today property carries the row's about (row_about, cached); the quiet-verdict property goes through with_the_about_asked. test_holdout_product.py: the same for its tomorrow test and its property. 1950-01-01 as a real answer day (engine and api review 5 tests) became 1950-01-02: 1950-01-01 is the marker |
| Point 4 in hidden cases | CAP_GAP_ALONE_CASE filed 2026-03-02 (was 2026-04-01, after TODAY 2026-03-09). test_capgap filed on H1_TODAY 2024-03-01 (the default 2026-04-02 was after it). holdout_f1 cases(): STEM recommendation and filing are min(date, today); periods start on or after the OPT start and end on or before the last card day. holdout_sourcing CASE_D petition filed 2026-10-05 (was 2027-04-05, after TODAY 2026-11-02). The long 30-year OPT window (holdout_fixes) is a card_longer_than_rule conflict: the person answers yes, and the test asserts talk_to_dso naming it, then the same counts |
| Extension reports | test_there_is_one_report_for_each_interval_in_the_extension was null because the STEM card of 24 months is longer than an extension of interval x reports months: card_longer_than_rule, point 4. The case now has a card as long as the extension (with_extension_of), the expectation unchanged. The same for the eight-month test |
| Lookahead | see Disputes: moved onto stem.evaluation_12_month_due with the interval at 3 months (2026-11-11), today varied; the property too |
| Earliest OPT start | opt_card_from(start): no STEM, a 12-month card from the start, filed before it, one period from its first day, run 30 days in. The rows keep their expectations |
| Evaluation property | CASE_C moved whole (moved()) so that STEM begins on the drawn start and no gap after OPT opens |

Working: 8 months from 2026-08-01 is 2027-04-01, so the card ends 2027-03-31. Evaluation with
the interval 3: 2026-08-01 + 3 months = 2026-11-01, plus 10 days = 2026-11-11; 2026-10-12 + 30
= 19 days to Oct 31 and 11 to Nov 11. OPT 2026-06-02 through 2026-09-28: 29 + 31 + 31 + 28 =
119. 2026-07-10 through 2026-09-28: 22 + 31 + 28 = 81. The long window: 10 + 3,287 + 174 =
3,471 used, 3,652 + 182 = 3,834 under hours (as the test already worked).

### What ran and what it printed

- Before, HEAD tests over the api branch (scratch copy under TMPDIR, .claude left out because
  the sandbox refuses to write .claude/ even in a scratch folder): 34 failed (11 api, 23
  holdout). The done command as written fails the same way as in iteration 8: tar "Can't
  create '.claude/agents/...': Operation not permitted", exit 1, before pytest.
- With the guard alone: 17 more tests failed with PlaceholderAnswerError (test_f1_product.py
  and test_holdout_product.py sent answers() straight to the engine), then 53 in all.
- After: tests/unit (without tools) and tests/holdout, exit 0, no failure.
- ruff check tests: All checks passed. ruff format --check tests: 42 files already formatted.

### What change would make each new or changed test fail (planted in a scratch copy)

- CheckedClient.post without refuse_placeholders: test_the_checked_client_refuses_... fails. Shown.
- PlaceholderAnswerError a ValueError: test_the_refusal_is_not_the_refusal_the_engine_gives fails. Shown.
- holdout_f1 run() calling parse_case(sent, clock): test_every_run_helper_passes_... fails. Shown.
- The guard not checking the about: test_a_case_whose_about_names_the_question_is_refused fails. Shown.
- The api tests: an api that keeps an answer between requests, or takes an answer with no about
  (the answer would then be read in test_nothing_is_kept_... and the count would differ).
- The lookahead rows: an engine that opens an item one day too early or too late (2026-11-05
  with 5, 2026-11-12 with 5, 2026-10-11 with 30).
- The extension reports: an engine that gives more or fewer reports than the extension holds.

### Disputes

- test_the_lookahead_comes_from_the_settings: the mission says to give it a case with no STEM
  filing. That is not enough: SPEC section 4 marks stem.file_by done when stem.i765_filed_date
  or stem.ead_start is recorded, and a STEM block without stem.ead_start is a missing input
  (phase-2 SPEC, missing_inputs), so the verdict is cannot_tell and never needs_you with
  stem.file_by. Probed: no filing and the card gives no_open_items; no filing and no card
  gives cannot_tell (missing:stem.ead_start, missing:stem.ead_end). The test and its property
  were moved to stem.evaluation_12_month_due, as the engine round moved its lookahead tests to
  stem.validation_2_due. The founder may prefer another item.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-4f74a497fe (attempt 1): SPEC-resolutions.md points 11 to 24, tests first

### What was done

| Point | Tests |
|---|---|
| 11, 14, 15, 16 | tests/unit/engine/test_f1_windows.py, table ROWS of 7 conflicts: cannot_tell with conflict:<id> and nothing else; question with the id, its about keys and values; the rule shown in out["rules"] with a quote; every item whose inputs name an about key is null and not in upcoming; each edge day fits (recommendation day, last day of the window, window's first day, complete_by itself) and is not cannot_tell; yes gives talk_to_dso with <id>, no keeps cannot_tell. Edges from rule_value(PACK, id). Missing date raises none. Point 14 sweep case (112 days). Point 15 operative only, and a filing before the window is no conflict. Point 16 with STEM entered, and grace.ends/counts/next.* null. Five hypothesis properties: the rule's value moves the edge (clock injected) |
| 12 | test_point_12_the_grace_date_is_listed_once; next.grace.ends removed from test_f1_product.py (NEXT_IDS and four tests now read grace.ends in upcoming) and test_holdout_product.py |
| 17 | STEM filed with no card, OPT with no card end: grace.ends null; control 2026-12-30 |
| 18 | card to 2026-10-15, cap-gap to 2027-01-15: grace.ends null, grace_with_cap_gap, talk_to_dso; control on NEXT; a denied petition raises nothing |
| 19 | the sweep case (105 days, 45 remaining); at the limit and one under; property over limit and idle days; no STEM, no new judgement |
| 20, 21, 22 | tests/unit/engine/test_f1_periods_and_reports.py: new_employer asked for a period from/after stem.ead_start (on the start itself too, not the day before); yes gives stem.new_plan_due.<n> 2026-08-04 as needs_you; no gives nothing; concluding evaluation 2026-07-30 with reading; validation_1_due 2026-09-28 open on the 28th, .made asked on the 29th, yes done, no talk_to_dso with .not_made; evaluation .made on 2027-04-01; property on today; end_reported asked despite employer_reported, yes nothing, no report_employer dated 2026-07-10 status guidance; three properties on pack days. n is read from the question, not assumed |
| 23 | blocked grace row effective 2026-09-15: 2024 grace date has no alternate, 2027 has; a 2023 window with regime rows has none |
| 24 | test_dates.py and test_holdout_dates.py: holidays on their own days, business-day rows moved (2026-07-02+1 = Jul 3; 2026-07-01+10 = Jul 15; 2027-12-23+5 = Dec 30 and others). Engine pins moved: CASE_B validation_2 2026-07-15, validation_4 2027-07-15, shifted 07-16 / 2027-07-16; the lookahead rows and properties in test_f1.py and test_f1_sourcing.py; test_f1_context instant 2026-07-16T01:30. Engine-level test_point_24_a_report_date_skips_no_observed_day |
| Point 4 cases | CASE_C program end 2025-06-01 (complete_by 2026-08-01 >= card end 2026-07-31); opt_card_from keeps 2025-05-16 for its worked rows. holdout_f1 cases(): STEM recommended opt_end-80, filed opt_end-50, drawn only when today >= the filing |
| Holdout | tests/holdout/test_holdout_windows.py, six tests on a 2025-12-19 program end case |

### What ran

- Done command, exactly as written: exit 0 (ruff check: all passed; format: 46 files formatted; collection clean).
- New files against today's engine: every conflict edge-fit test passes (the cases are clean); the new rule tests fail on the missing rule (e.g. "assert False is (1 > 0)" for the edge property, grace.ends '2026-12-14' for point 18, validation_1_due '2026-07-16' for point 24).
- Changed suites: holdout_f1, holdout_sourcing pass; failures are only point 12 (next.grace.ends still emitted) and point 24 (observed day still skipped).

### What change to the code would make each new test fail

- Conflict rows: an engine that does not raise the id, raises it one day early (edge-fit tests), writes 30/60/90/14 in code (the properties under other pack values), or keeps an item that uses the dates.
- 17/18: a grace date from the OPT card alone; a grace date beside an active cap-gap past the card.
- 19: an opt-card count that includes STEM days, or a judgement at limit+1.
- 20-22: a question never asked, or asked for a period before stem.ead_start; the new plan date not from stem.new_plan_due_days; a report date dropped once passed; the employer_reported flag taken as the answer.
- 23: alternates looked up on today instead of the item's date.
- 24: add_business_days skipping the observed day.
No fault was planted through a scratch plugin in this attempt (time).

### Disputes / questions

- Point 11 says each conflict "names its rule in rule_ids"; a question has no rule_ids in contracts/engine_output.schema.json (additionalProperties false). The tests read the rule in out["rules"].
- Point 16 says the conflict "carries reading"; no field of a question or a reason can hold it. Not asserted.
- Point 21 will ask .made on every case run after a STEM report date: CASE_B (validation_1 2026-01-15), STEM_NOW in test_f1_product.py and others will turn cannot_tell once the engine rounds. Not changed here; the founder decides whether those cases answer yes or move.

## Run l-tests-1117c8c4ae (attempt 1): older tests brought in line with points 11, 12, 14 to 19, 23, 24

### What was done

The engine (HEAD 32ba768, the same engine/ as lane/L-engine/l-engine-9492007270) builds the
points. engine/REPORT.json of that branch is ignored by git, so `git show` finds nothing; it
was read from the builder's worktree on disk. Its disputes list the older tests that collide.
Before any change the done command failed on 72 tests (the builder's list plus the holdout
suites, which the builder never sees).

| File | Change | Point |
|---|---|---|
| tests/support/f1_pack.py | WINDOW_CONFLICT_IDS; conflicts_by_the_table has the seven new rows, days read from the pack (operative row for opt.apply_after_days), none raised with a date missing | 11, 14, 15, 16 |
| test_f1_product.py | rows opt/stem.dso_recommendation_date.after_today: raising case has no filing, safe case files on the recommendation day; rows opt/stem.i765_filed_date.after_card: recommendation 2025-10-15 / 2024-10-01 so filings are within 30 / 60 days | 11 (point 4) |
| test_f1_product.py | review_1 filing 2030 also expects after_window_closes (2025-09-15 + 60 = 2025-11-14); card of three years also expects opt.ead_end.after_complete_by (2025-09-15 + 14 months = 2026-11-15) | 15, 16 |
| test_f1_product.py | the property's table widened to WINDOW_CONFLICT_IDS (asked ids, table check, answers drawn) | 11, 14-16 |
| test_compute_product.py (api) | the same two review_1 cases; the yes test answers both conflicts | 15, 16 |
| test_f1.py | unemployment.opt_card_days_used in ALL_IDS and UNITS (days); file_by rows leave the filing out (a filing on or after 2026-08-28 lies after the card of 2026-06-01, one before lies before the recommendation) | 19; 11 (point 4) |
| test_f1_fixes.py | far card to 2099: conflict:opt.ead_end.after_complete_by present and the program items null (2026-05-15 + 14 months = 2027-07-15) | 16 with 4 |
| holdout/test_holdout_product.py | rows refitted as above (recommendations 2027-02-15, 2027-01-15, 2026-06-01, 2026-01-10; no filing for the recommendation rows); two facts case recommends 2026-06-01; the card end typed again is 2027-07-08, the last day of complete_by | 11, 14, 15, 16 |
| holdout/test_holdout_fixes.py | long window answers yes to after_complete_by too (2030-06-15 + 14 months = 2031-08-15); api regime test uses CASE_D_LATER (grace.ends 2028-03-31, after 2026-09-15) | 16; 23 |
| holdout/test_holdout_sourcing.py | reporting-rule test drops the petition: pending cap-gap to 2027-10-01 past the card of 2027-08-31 gives grace_with_cap_gap | 18 |
| holdout/test_holdout_windows.py, test_f1_periods_and_reports.py | run helper passes the case through refuse_placeholders (test_placeholders.py found both). No assertion touched | guard |

### What ran

- Done command before: exit 1, 72 failed.
- Done command after: exit 1. ruff check: All checks passed. ruff format: 46 files already
  formatted. pytest: 2 failed, both in tests/holdout/test_holdout_windows.py:
  test_holdout_a_passed_evaluation_is_asked_about (no stem.evaluation_12_month_due.made
  question; point 21) and test_holdout_an_unreported_end_gives_the_report_item (no
  .end_reported question; point 22). The engine has not built points 20 to 22.

### Faults planted (scratch copy under TMPDIR, removed)

- opt.ead_end.after_complete_by never raised: test_the_reviewers_far_dates..., the api
  three_years and yes tests, holdout long window fail. Shown.
- before_recommendation on the recommendation day (<=): the safe-side row for
  opt.dso_recommendation_date.after_today fails in test_f1_product.py and holdout. Shown.
- after_window_closes never raised: review_1 filing 2030 fails (engine and api). Shown.
- unemployment.opt_card_days_used dropped: test_case_b_has_every_item_once fails. Shown.
- Not planted: point 18 (sourcing test would fail if grace_with_cap_gap were raised with no
  petition), point 23 (the api regime test fails if the alternate is dropped from items
  after effective_from).

### Disputes

- The two holdout tests of points 21 and 22 fail because the engine lacks those points. The
  mission excludes only tests/unit/engine/test_f1_periods_and_reports.py; the holdout copies
  were not excluded. Not skipped, not changed. Escalated for the founder: exclude
  tests/holdout/test_holdout_windows.py's two tests from this round's done command, or wait
  for points 20 to 22.
- Seen while probing: CASE_D of test_holdout_fixes.py with no answers gives cannot_tell with
  rule_in_litigation, yet no item of it carries an alternate (point 23). Not a test failure;
  for the founder to judge whether the reason should follow the alternates.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-09c772d4c1 (attempt 1): merge, points 20 to 22 and 25 held apart, points 25 and 26 written

### What was done

- git merge lane/L-tests/l-tests-1117c8c4ae: clean, 11 files. The done command then failed on
  the same two holdout tests of points 21 and 22 and nothing else.
- `git show lane/L-engine/l-engine-9492007270:engine/REPORT.json` gives "path does not
  exist": the file is ignored by git. The previous run read it from disk and worked its 33
  tests; the done command after the merge shows none of them failing, so no older test was
  changed in this run.
- tests/holdout/test_holdout_periods_and_reports.py (new): the two tests of points 21 and 22
  moved from test_holdout_windows.py (assertions unchanged; the evaluation test now names its
  case STEM_CASE, the same facts); new holdout tests of point 20 (new_employer asked, yes gives
  stem.new_plan_due.<n> 2026-05-21, no gives nothing, concluding evaluation 2026-04-30 as a
  reading), point 21 (a passed report answered no gives .not_made), point 25 (a 2023 grace end
  with the blocked row from 2026-09-15 is no litigation; the same with the row from 2000 keeps
  it; CASE_D on the shipped pack loses the reason).
- tests/holdout/test_holdout_windows.py: the two tests removed, a comment names where they went,
  the unused import dropped by ruff, docstring now points 11, 14, 16 and 18.
- tests/unit/engine/test_f1_periods_and_reports.py: point 25 (ENDED_2024 with the blocked row
  from 2026-09-15: grace.ends 2024-07-30, no alternate, no reason, not cannot_tell; ENDS_2027
  on 2027-06-15: alternate 2027-06-30, cannot_tell with the reason; on 2027-05-30 and 05-31 no
  reason; a property over days 2024-06-01 to 2030-12-31 with the clock injected) and point 26
  (a before_recommendation and an after_complete_by conflict: question keys are exactly id,
  because, about; the rule is in rules with its quote).

### What ran

- Done command, exactly as written: exit 0 (ruff: All checks passed; 47 files already
  formatted; pytest all passed).
- The two waiting files against today's engine: 38 tests, 27 fail, 11 pass (the controls,
  point 26, the clean-case and worked-date checks). Every failure is a missing point: no
  new_employer / .made / .end_reported question, or rule_in_litigation with no alternate.

### What change to the code would make each new test fail

- Point 25 tests: today's engine (reason given with no alternate shown) fails them; shown.
  The controls fail when the reason is dropped everywhere: planted through a scratch plugin
  that strips rule_in_litigation, both "regimes differ" tests failed. Shown.
- Point 26: a plugin adding rule_ids to every question failed both point 26 tests. Shown.
- Point 20 holdout: an engine that asks about a period begun before the STEM card (len 2), or
  counts the new plan from somewhere other than the start plus stem.new_plan_due_days.
- Scratch folders under TMPDIR removed.

### Disputes

- None new. Carried: when points 21 and 22 land, every older case run after a STEM report date
  or with a recorded period end turns cannot_tell until answered (CASE_B, STEM_NOW and others).
  The next engine round will list them; the fix is a settled point (21, 22), for the founder.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-ff9a7c4ceb (attempt 1): tests in line with points 20, 21, 22 and 25

### What was done

- The engine of l-engine-ac276e806b (merged at a5aab67) asks employment.<n>.new_employer,
  employment.<n>.end_reported and <item>.made. The builder's engine/REPORT.json is ignored by
  git and its worktree is gone, so the list of collisions was taken from the done command:
  69 failures in 11 files, every one an unanswered question of points 20 to 22 or the new
  item stem.concluding_evaluation_due.<n>. No failure was left that no point explains.
- tests/support/f1_pack.py: periods_answered(case) answers the questions of points 20 to 22
  for a test about something else (not a new employer, the end reported, each passed report
  made), as placeholders that dated_on_the_day and with_the_about_asked make real. Also
  is_period_or_report_question, period_question, made_question, placeholders_made_real.
- Cases answered with periods_answered, point beside each: test_f1.py (CASE_B verdict,
  stem_start, judgement items, lookahead and validation tests), test_f1_context.py (CASE_B,
  STEM_ONLY, SEPTEMBER; answered() keeps the case's answers), test_f1_product.py (STEM_NOW,
  TWO_JOBS, FOUR_MONTHS, HOLE; run() makes placeholders real), test_f1_sourcing.py (two
  lookahead tests), api test_compute_context.py (STEM_ONLY; GOOD in the no-gap test),
  holdout context (STEM_ALONE, CAP_GAP_ALONE_CASE, the api zone test through
  as_the_screen_sends), holdout f1 (CASE_H1, CASE_H2), holdout fixes (long window),
  holdout product (STEM_NOW, TWO_JOBS, the period_outside_cards rows, the cards test),
  holdout sourcing (lookahead).
- Expected, not answered, where the test is about the output (point 20):
  test_case_b_has_every_item_once now expects stem.concluding_evaluation_due.1 = 2025-12-31
  plus 10 = 2026-01-10; the date property works each concluding evaluation by hand (end plus
  stem.evaluation_due_days, reading true). The two gap properties (unit and holdout context)
  set the new questions apart as they set conflicts apart, and now assert each is unconfirmed
  and the verdict cannot_tell. The product property allows them next to the table.
- Holdout test_the_order_of_the_employment_periods_does_not_matter compares the dates of the
  items numbered by period as a sorted list: the number follows the case's order (point 20).

### What ran

- Done command before: exit 1, 69 failed. After: exit 0 (ruff: All checks passed; 47 files
  already formatted; pytest all passed).

### What change to the code would make each new test fail

- Concluding evaluation one day late (scratch plugin on engine.f1._days_after): fails
  test_case_b_has_every_item_once and the date property. Shown.
- A passed report answered yes not marked done (scratch plugin clearing work.done): fails the
  test_f1.py tests that expect no open item. Shown. Scratch folder removed.
- The gap properties fail if a new question is asked but not listed as unconfirmed, or if
  the verdict is anything but cannot_tell while one is open.

### Disputes

- None new. The order test's comparison now ignores the period number of per-period items;
  point 20 numbers by period and does not say the number is independent of order.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-4ecbc095b4 (attempt 1): tests first for points 27, 28, 35, 36, 37 and 38

### What was done

- tests/support/f1_pack.py: opt.post_completion_definition (guidance flag, SEVP guidance) at
  the end of SPEC_RULES (point 27; the shipped pack already holds it). NOT_AFTER_PROGRAM_END
  and POST_COMPLETION_RULE. conflicts_by_the_table raises the point 27 row when the OPT card
  ends on or before program_end_date. with_blocked_regime_operative(raw, effective_from):
  the blocked regime operative and in effect, its rows taking effect on the day given
  (point 28). _report_ids names stem.new_plan_due.<n> as well (point 36).
- tests/unit/engine/test_f1_fix2.py (new): point 27 (reason, edge on the program end, day
  after fits, about, rule in rules, items null, OPT step not done, STEM not next, yes, no,
  missing card end, the sweep's case, a property over the card end); point 28 on a copy of
  the test pack with the blocked regime operative (window close, latest start, judgement,
  rules in force still give dates, program ended after, grace before and after, shipped
  pack changes nothing, shipped pack 2024); point 36 (the new plan date, open item before
  and on the day, asked the day after, yes, no, property over the day, concluding
  evaluation asked and no); point 37 (window opening and complete_by null, every item using
  program_end_date null).
- tests/holdout/test_holdout_fix2.py (new): point 27 property against the table, with STEM
  entered, an answer held to its dates; point 28 property over the program end, the edge
  day, the judgement on an otherwise clean case, shipped pack property, shipped operative
  regime.
- tests/unit/api/test_status_rules.py (new): point 35, rules_checked_on per pack entry,
  never rules_never_checked while a pack holds checked dates, property over the clock.
- tests/unit/api/test_compute_context.py: too_many sends 257 answers (point 38).

### What ran

- Done command: exit 0 (ruff: All checks passed; 50 files already formatted; collection ok).
- New files: 19 of 37 unit engine tests fail, 6 of 8 holdout tests fail, 3 of 4 status
  tests fail, each on the point not yet built. The rest pass on today's engine.
- Whole suite on a copy of HEAD (git archive into TMPDIR) against the worktree: one older
  test newly fails, test_f1_fixes.py::test_the_count_agrees_with_a_plain_day_by_day_count_on_small_windows,
  on a drawn card 2024-01-01 to 2024-01-01 with program end 2024-01-01: the table now
  expects opt.ead_end.not_after_program_end (point 27). It passes once point 27 is built.
  too_many[api] failed on HEAD (21 answers are within 256) and passes now.
- A scratch table check: 300 drawn OPT cases, engine conflicts equal the table's minus the
  new row, 0 differences.

### What change to the code would make each new test fail

- Point 27: no conflict raised, or raised with an about lacking a date, or items using the
  card left with a value, or opt.file_by dropped from upcoming as a done step, or next.*
  placed, or yes not giving talk_to_dso: each fails its test (all fail today).
- Point 28: a rule looked up on today and not on the event day gives 2025-10-15, 2026-10-10
  or 2026-10-14 where null is expected (fail today). Nulling items where a row is in force
  fails the rules-in-force, ended-after and shipped-pack tests.
- Point 36: a passed new plan date not asked about (fails today). Asking on the due day
  fails the on-the-day test; asking the concluding evaluation too late fails its test.
- Point 37: shown with a scratch plugin under TMPDIR that took program_end_date out of the
  about of opt.ead_end.after_complete_by: all three null tests failed. Removed after.
- Point 35: status without rules_checked_on (fails today) or giving rules_never_checked.
- Point 38: a contract bound under 257 accepted; the test fails if the api accepts 257.

### Seen in data, not followed

Nothing read in this run asked for an action.

### The new tests, by name

- tests/unit/engine/test_f1_fix2.py:
  - test_point_27_the_cases_match_the_case_contract
  - test_point_27_not_after_program_end_is_cannot_tell_with_the_reason
  - test_point_27_a_card_ending_on_the_program_end_is_raised
  - test_point_27_a_card_ending_the_day_after_the_program_end_raises_nothing
  - test_point_27_the_question_holds_the_program_end_and_the_card
  - test_point_27_the_rule_is_named_in_rules
  - test_point_27_the_items_that_use_the_card_are_null
  - test_point_27_no_opt_step_is_marked_done_while_it_is_open
  - test_point_27_the_stem_step_is_not_placed_next_while_it_is_open
  - test_point_27_yes_gives_talk_to_dso_with_the_judgement_item
  - test_point_27_no_keeps_cannot_tell
  - test_point_27_a_missing_card_end_raises_nothing
  - test_point_27_the_case_of_the_sweep
  - test_point_27_raised_when_and_only_when_the_card_ends_on_or_before_the_program_end
  - test_point_37_the_worked_dates_are_those_of_the_test_pack
  - test_point_37_while_after_complete_by_is_open_the_window_opening_is_null
  - test_point_37_while_after_complete_by_is_open_complete_by_is_null
  - test_point_37_every_item_that_uses_program_end_date_is_null
  - test_point_28_the_copy_of_the_pack_is_valid_and_blocked_is_operative
  - test_point_28_a_program_that_ended_before_the_blocked_rows_gets_no_window_close
  - test_point_28_a_program_that_ended_before_the_blocked_rows_gets_no_latest_start
  - test_point_28_no_operative_row_on_the_event_day_is_a_judgement_item
  - test_point_28_rules_in_force_on_the_event_day_still_give_their_dates
  - test_point_28_a_program_that_ended_after_the_blocked_rows_gets_their_dates
  - test_point_28_a_card_that_ended_before_the_blocked_rows_gets_no_grace_date
  - test_point_28_a_card_that_ended_after_the_blocked_rows_gets_its_grace_date
  - test_point_28_the_shipped_pack_changes_nothing
  - test_point_28_the_shipped_pack_gives_a_program_that_ended_in_2024_its_dates
  - test_point_36_the_new_plan_date_is_the_one_worked_by_hand
  - test_point_36_before_the_new_plan_date_it_is_an_open_item
  - test_point_36_on_the_new_plan_date_it_is_not_asked_about
  - test_point_36_the_day_after_the_new_plan_date_duly_asks_whether_it_was_made
  - test_point_36_yes_makes_the_new_plan_done
  - test_point_36_no_sends_the_person_to_the_dso
  - test_point_36_the_question_is_asked_when_and_only_when_the_date_has_passed
  - test_point_36_a_passed_concluding_evaluation_is_asked_about
  - test_point_36_no_to_a_concluding_evaluation_sends_the_person_to_the_dso
- tests/holdout/test_holdout_fix2.py:
  - test_point_27_the_engine_raises_the_table_with_the_new_row
  - test_point_27_is_raised_with_stem_entered_and_nulls_what_uses_the_card
  - test_point_27_a_yes_is_for_the_dates_it_was_given_for
  - test_point_28_the_window_is_measured_under_the_row_in_force_on_the_program_end
  - test_point_28_the_edge_is_the_day_the_rows_take_effect
  - test_point_28_the_judgement_item_on_a_case_otherwise_clean
  - test_point_28_the_shipped_pack_changes_nothing
  - test_point_28_the_blocked_regime_is_not_operative_in_the_shipped_pack
- tests/unit/api/test_status_rules.py:
  - test_the_f1_pack_holds_checked_dates
  - test_the_status_names_each_packs_rules_checked_on
  - test_the_status_never_says_rules_never_checked_when_a_pack_holds_checked_dates
  - test_on_any_day_after_the_check_the_status_is_not_rules_never_checked
- tests/unit/api/test_compute_context.py: test_confirmations_that_do_not_match_the_contract_are_refused[too_many], now 257 answers

## Run l-tests-99ad82cdc6 (attempt 1): tests in line with points 27, 28, 35, 36, 37, 38

### What I tried and what ran

- The done command as written on the merged HEAD (f601887): ruff clean, pytest exit 1 with
  13 failures, all on the point 27 conflict opt.ead_end.not_after_program_end. The engine
  builder's log (engine/PROGRESS.md, run l-engine-a61d663c4e) lists the same 8 unit
  collisions; the 5 holdout ones it could not see.
- A scratch plugin under TMPDIR spied on f1.compute_f1 and listed every test whose case
  raises point 27. Besides the 13 and the point 27 tests themselves, only
  test_f1_fixes.py::test_the_count_agrees_with_a_plain_day_by_day_count_on_small_windows
  hit it, and that property already takes point 27 from conflicts_by_the_table (null
  branch). Nothing to change there. Points 28, 35, 36, 37 and 38 broke no older test.
- After the changes: the done command exit 0 ("All checks passed!", "50 files already
  formatted", pytest all passed).

### Changes, each with its point

- tests/unit/engine/test_f1.py, test_conflicting_dates_are_named_and_the_verdict_cannot_tell,
  rows opt_start_on_year_mark and opt_start_day_after_year_mark (point 27): the cards end
  2026-05-14 and 2026-05-15, on or before program_end_date 2026-05-15. No facts avoid it: a
  card that begins on or after the year mark within 12 months ends by the program end. The
  rows now expect exactly [conflict:opt.ead_end.not_after_program_end]. The True rows now
  need a conflict other than point 27's, so point 27 never stands in for the row tested.
- tests/unit/engine/test_f1_sourcing.py and tests/holdout/test_holdout_sourcing.py,
  test_the_earliest_opt_start_comes_from_the_settings (point 27): every row starts a year
  or more before the program end with a card under 12 months, so every card ends before
  it. False rows expect cannot_tell with [conflict:opt.ead_end.not_after_program_end] alone
  (was no_open_items); True rows need a conflict other than point 27's.
- tests/holdout/test_holdout_f1.py, test_program_end_after_every_ead_date_is_final_end,
  renamed ..._is_the_point_27_conflict_and_grace_is_null (points 27, 4, 25): the case is a
  card ending before the program end, which point 27 never takes as post-completion OPT.
  Now expects cannot_tell, the conflict, grace.ends null, unemployment.days_used null, and
  still no rule_in_litigation. The old dates (2027-02-16, alternate 2027-01-17) cannot be
  reached by any case under point 27, since final_end as the program end needs a card
  ending on or before it.

### What change to the code would make each changed test fail

Shown with scratch plugins under TMPDIR, removed after:
- Dropping the lookback conflict (opt_start) from f1._conflicts: 5 True rows of the two
  sourcing tests fail.
- Renaming point 27's conflict id: 13 fail (both year mark rows, 10 False sourcing rows,
  the holdout grace test).
- Not nulling grace.ends or the unemployment count under point 27: the holdout grace
  test fails.

### Seen, not changed

- test_f1.py row opt_start_day_before_year_mark still passes with the lookback conflict
  removed: its job begins 2025-05-01, before the card, so employment.period_outside_cards
  is raised beside it. That was so before this run; no point asks for a change. For the
  founder: the row could start the job with the card.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-165541a1bd (attempt 1): tests first for points 39, 40, 42, 43, 46 to 50 and plain-1

### What I tried and what ran

- Read the SPEC (SPEC-resolutions.md points 39 to 50, specs/plain-1/SPEC.md), the output
  contract (rules[].plain, regimes, answers_read) and the shipped pack's rows and dates
  (STEM rows from 2016-05-10; capgap.end_month_day 10-01 to 2025-01-16 and 04-01 from
  2025-01-17; calendar list without Juneteenth 1986-01-01 to 2021-06-16; OPT window rows
  from 2008-04-08; stem.report_change_within_days already shipped).
- Wrote tests/unit/engine/test_f1_fix4.py (57 tests) and tests/holdout/test_holdout_fix4.py
  (18 tests). Every answer goes through `settle`, which answers only what the output asks,
  on the day of the case, with the about as asked, and calls refuse_placeholders on every
  case (tests/support/f1_pack.py). A conflict question is never answered by default.
- Ran the two files against the current engine: 58 fail, 17 pass. Each failure read by hand
  (one line per failure): each is the missing behaviour of its point (no question
  opt.earlier_at_this_level; no conflict period_open_after_last_card; KeyError answers_read
  and regimes; validations dated after the card; June 19 2019 and 2020 skipped, giving
  2019-07-01 and 2020-06-29; capgap.ends 2024-11-15 and 2025-04-01 where null is due;
  rule_in_litigation on a null or equal alternate; report dated by the OPT guidance row on a
  STEM card; unemployment counted after yes to point 27).
- Fixed one slip of my own on the way (a case with no confirmations key) and removed three
  state checks of my own new tests that the SPEC does not settle (see below).
- The done command as written: exit 0 ("All checks passed!", "53 files already formatted",
  collection clean).

### Passing now, and why that is right

The 17 that pass are guards: the edge on the other side of each point (no card raises
nothing; the last card day; cap-gap still running; a STEM card from 2016-05-10; the October
row for an October 1 start; the April row from 2025-01-17; 2023 skips June 19; point 47 on
and before 2008-04-08, which point 28 already gives; point 49 differing values; point 50 on
an OPT card; the contract test of the cases; no regime named, no regimes).

### What change to the code would make each new test fail

- Point 39: not raising opt.earlier_at_this_level, leaving degree_level out of its about,
  or giving no_open_items on yes (all fail today, as the engine lacks the point).
- Point 40: looking up the STEM rows, cap-gap rows or holiday list on today instead of the
  event day; skipping June 19 before 2021-06-17; computing capgap.ends for a non-October
  start on a petition filed before 2025-01-17.
- Point 42: marking the OPT step done, placing next.stem.* or counting unemployment after
  yes to point 27.
- Point 43: exempting an open period after the last card (the old words), or raising it
  while cap-gap runs, or on the last card day (the guards).
- Point 46: leaving answers_read out, listing an answer not raised, one for other values,
  or a stale yes to no_employment_to_record.
- Point 47: taking the earliest row for an event before it.
- Point 48: dating a validation or the 12-month evaluation after the card end (property over
  1 to 730 days of card).
- Point 49: counting an alternate where either value is null or both are equal.
- Point 50: dating the STEM report with opt.report_employer_within_days, or writing 10 in
  code (the 7-day and 12-day packs).
- plain-1: dropping plain from rules or regimes, naming a regime no item depends on, or
  giving another regime's citation or url.

### Seen, not changed

- Point 39 raises a question on every case with an OPT card, and point 43 a conflict on
  every open period after the last card: many older tests will need their cases answered or
  changed once the engine has them (as points 27 and 7 did). Not done here; the mission is
  tests first.
- The three state checks left out: after yes to point 27 (point 42) and on the test pack's
  point 40 cases, grace.ends may keep an alternate after the card, because the test pack's
  blocked grace row is in force from 2000, so point 25 may add rule_in_litigation. The SPEC
  does not settle this; the tests pin the judgement item or the step back instead, and the
  state on the shipped pack.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-e8d3ac30bb (attempt 2): older tests brought in line with points 39, 40, 42, 43, 46, 48 to 53

### What I tried and what ran

- Attempt 1 of this run changed 21 files under tests/ but wrote no REPORT.json and no
  entry here. This attempt reviewed that diff rather than redoing it.
- tests/support/f1_pack.py: EARLIER (opt.earlier_at_this_level) answered no in the
  ordinary-answer helpers (answered_yes, the confirmations helper, no_earlier_opt,
  no_earlier_opt_on for api cases posted as they are), point 39; OPEN_AFTER_LAST_CARD in
  the conflict table, point 43; the test pack now holds both rows of
  calendar.federal_holidays_law (to 2021-06-16 without Juneteenth, from 2021-06-17 with it)
  and row_in_force picks the row for a day, point 53.
- Older tests: validations and evaluations dated after the STEM card now expected null,
  point 48; open periods after the last card expect the new conflict, point 43; the
  cannot_tell verdict of test_not_knowing_wins_over_a_judgement_item lists the blocker then
  the judgement item, point 51; tests that pin the output's keys add regimes and
  answers_read, point 46 and plain-1; tests about something else answer point 39 no. Each
  change names its point in a comment (129 citations in the diff).
- Checked the diff for loosening: no skip, xfail or deleted assertion. Where an assertion
  moved from a value to None it is point 48 (the date falls after the card); the one
  `.get` comparison (test_the_evaluation_interval_and_the_validation_interval_are_two_rules)
  compares validation 4 as not dated in both, point 48.
- Done command as written: exit 0 ("All checks passed!", "53 files already formatted",
  every test passing).
- Fault planted through a scratch plugin under TMPDIR (compute_f1 wrapped to reverse the
  reasons and drop answers_read): test_not_knowing_wins_over_a_judgement_item and the two
  point 46 holdout tests fail. Scratch folder removed.

### What change to the code would make the changed tests fail

- Point 39: not raising opt.earlier_at_this_level, or reading no as anything but the card
  alone held to opt.max_months (the helpers' cases would then gain an open question).
- Point 43: raising period_outside_cards, or nothing, for an open period after the last card.
- Point 48: dating a validation or evaluation after the card end.
- Point 51: listing a judgement item before a blocker (shown by the planted fault).
- Point 53: taking Juneteenth from a date in code rather than the pack's rows.
- Point 46: leaving answers_read or regimes out of the output (shown by the planted fault).

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-cfe7af7fe5 (attempt 1): tests first for points 55 and 56

### What I tried and what ran

- Read specs/product-1/SPEC-resolutions.md points 25, 27, 40, 42, 49, 55, 56,
  specs/product-1/plan-fix5.yaml and reviews/product-1-fix4.md notes 5 and 6.
- A probe of today's engine reproduced both notes: point 27's case unanswered gives
  grace.ends null with alternates [{"value": null}]; with the clock at 2016-10-01 the shipped
  pack raises RulepackError for opt.report_employer_within_days (looked up for today by the
  count employment.periods_not_reported). The report item is employment.<n>.end_report_by, and
  it already steps back for an end before 2025-05-19 when today is after it.
- Wrote tests/unit/engine/test_f1_fix5.py (18 tests) and tests/holdout/test_holdout_fix5.py
  (12 tests), with different cases in each.
- On today's engine: 19 fail, 11 pass (the controls and the event-day lookup that already
  holds). With a scratch plugin under TMPDIR that strips null alternates and lets a rule with
  no row today fall back to its earliest row (a stand-in, not the SPEC's fix): 30 pass.
  With a second plugin that drops every alternate: test_point_55_an_alternate_with_a_value_is_kept
  fails. Scratch folder removed.
- The hidden property (any clock from 2009-01-01 to 2025-05-18) found a second crash:
  opt.min_hours_per_week, whose shipped row begins 2010-04-23, is also looked up for today
  (RulepackError on 2009-01-01). Point 56 says no clock makes the engine fail.
- Done command as written: exit 0 ("All checks passed!", "55 files already formatted").

### What change to the code would make each new test fail

- Point 55: keeping an alternate whose value is null on any item (all the point 27 tests,
  unit and hidden, and both properties); dropping an alternate that holds a value
  (test_point_55_an_alternate_with_a_value_is_kept, the hidden ended-card test); leaving a
  regime in regimes that no item names any more.
- Point 56: any RulepackError for a rule with no row on today (the clock tests and the
  properties); looking the report row up for today and not for the period's end
  (test_point_56_an_end_the_day_before_the_row_gives_null_although_today_has_a_row and its
  hidden twin); giving a date, or no rule_not_in_force_on_event_day, for an end before the
  row; giving null for an end on the row's first day (the controls, 2025-05-29 and
  2024-06-11); a state other than talk_to_dso on the shipped pack.

### Seen, not changed

- On the test pack the paused grace row is in force from 2000, so the verdict there may be
  cannot_tell with rule_in_litigation, which hides report_employer from the reasons. The
  state is pinned on the shipped pack only, as test_f1_fix4.py does.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-d80f1677a6 (attempt 1): bring the tests in line with points 54, 55 and 56

### What I tried and what ran

- Read the builder's report (git show 4fd54a4, engine/PROGRESS.md): one collision named,
  test_f1_fixes.py::test_operative_always_comes_from_the_pack, a point 55 collision.
- Done command before the change: ruff clean, 55 files formatted, pytest exit 1 with that one
  failure only. Falsifying draw: pending cap gap, STEM after OPT, clock 2024-01-02; grace.ends
  is null (points 17, 18, 43, 56 give null before the regime is applied), so the paused
  alternate is null too and point 55 drops it.
- Change (each line cites point 55): grace.ends is among the items with alternates exactly
  when grace.ends has a value (the paused grace formula differs only in its day count);
  opt.latest_start is there exactly when the pack has two rows and the item has a value;
  every alternate carried holds a value. Not loosened: both lines stay equalities, and a new
  assertion is added.
- Point 54: no test in tests/unit or tests/holdout pins the rewritten plain texts; the done
  suite and tests/unit/tools/test_plain.py pass on the new pack.
- The changed property with hypothesis seeds 1 to 5: all pass.
- Done command as written, no pipe: exit 0 ("All checks passed!", "55 files already
  formatted", every test passing).

### What change to the code would make the changed test fail

- Carrying an alternate whose value is null on grace.ends (planted through a scratch plugin
  under TMPDIR that gives a null grace.ends an alternate with value null: the property failed
  on its first draw; scratch folder removed).
- Dropping the alternate from a grace.ends or opt.latest_start that has a value.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-cf34bb9271 (attempt 1): tests first for points 59 and 60

### What I tried and what ran

- Read SPEC-resolutions.md points 56, 59 and 60, reviews/product-1-fix5.md findings 2 and 3,
  the contracts (case_f1, engine_output) and the shipped pack's row dates (earliest row
  capgap.fiscal_year_start_month_day from 1982-09-13; STEM rows 2016-05-10; CPT, grace,
  opt.max_months, opt.complete_within_months 2003-01-01; report row 2025-05-19).
- Probed the engine on the review's cases through a scratch script under TMPDIR (removed):
  STEM case at 2016-05-09 and the 2012 STEM case at 2014-01-15 raise RulepackError
  stem.validation_interval_months; the OPT case with 400 CPT days at 2002-12-31 raises
  cpt.full_time_bar_days; with CPT null it gives an output; finding 3 gives
  periods_not_reported 1.
- Wrote tests/unit/engine/test_f1_fix6.py (19 tests) and tests/holdout/test_holdout_fix6.py
  (9 tests). ruff format, ruff check, mypy --strict on both: clean.
- Run: 5 pass (the case-contract check, the check of the drawn range's working, and three
  controls: CPT left blank at 2002-12-31, a period from the row's first day counted 1, two
  periods from the row counted 2). 23 fail on the current engine, each for the point it
  names: RulepackError (point 59), count 1 or 2 where null is due, needs_you where
  talk_to_dso is due (point 60). They are expected to fail until the build round.
- One slip of my own: the working of 1955-01-01 less 1500 days first said 1950-11-28; the
  test caught it; the right day is 1950-11-23 (less 1461 days is 1951-01-01, 39 more), and
  1950-10-24 with the 30 days of the recommendation. Fixed the working, not the bound.
- Done command as written, no pipe: exit 0 ("All checks passed!", "57 files already
  formatted").

### What change to the code would make each new test fail

- Point 59 output tests and both "any clock" properties: any lookup that raises when no row
  is in force (today: whole_rule for stem.validation_interval_months and
  cpt.full_time_bar_days). Shapes drawn: OPT only, OPT and STEM, cap-gap, full-time CPT.
- The 2012/2010 STEM null tests: dating a validation or evaluation from a row that begins
  after the event (2016-05-10), or omitting rule_not_in_force_on_event_day.
- The CPT before-2003 tests: giving opt.complete_by or grace.ends a date from rows that
  begin 2003-01-01, or no step back.
- The before-every-row properties (clock to 1978 / 1975): any dated computed item, a count
  of unreported periods, or a quiet verdict, while no row of the pack is in force.
- Point 60: reading the count's rule for today or for the period's end (finding 3, the
  2025-05-18 start ending 2026-04-30, the mixed pair, the property); giving null for a
  period starting on 2025-05-19 or later (the controls and the property's else branch).
- check_an_output / sound: any null alternate (point 55) or a quiet state beside
  rule_not_in_force_on_event_day.

### Not done

- No reference engine was written, so the two before-every-row properties and the point 60
  property have not been run against a correct engine; only against the current one.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-c239b48795 (attempt 1): bring tests in line with points 58, 59 and 60

### What I tried and what ran

- Read the builder's report (git show 77a3786:engine/PROGRESS.md): three point 60
  collisions, each a case with a period that starts before 2025-05-19 (the row of
  opt.report_employer_within_days), so the verdict now carries
  rule_not_in_force_on_event_day through employment.periods_not_reported.
- Done command before any change: ruff clean, pytest exit 1 with 4 failures: the three
  collisions, and tests/holdout/test_holdout_fix6.py::test_holdout_point_59_before_every_row
  (ValueError "Invalid isoformat string: 'pending'"). The last was my own fault from the
  earlier run: early_case moved every string of the cap-gap block, the status too.
- Changes (each cites its point in the file; no assertion loosened, the cases change):
  - test_f1_fix2.py point 28 (program ended 2024): the case holds no period, so the step back
    asserted absent is the one of the OPT window rows. Point 51: a blocker does not hide a
    judgement item, so the absence still means something beside no_employment_to_record.
  - test_f1_fix4.py point 40 (petition before 2025-01-17 for October 1): the case holds no
    period, for the same reason; the cap-gap rows are the only possible step back.
  - test_f1_fix5.py point 56 (an end on the row's first day): the period starts and ends on
    2025-05-19, so point 60 reads the count's rule on a day the row is in force. The period
    that ends the day before still runs from 2024-06-01 (its test wants the step back).
  - test_holdout_fix6.py: early_case moves only values that parse as ISO days.
- Point 58: nothing in tests/unit (outside tools) or tests/holdout pins a plain text or
  plain_terms; tests/unit/tools/test_plain.py passes on the new pack. Other tests in
  tests/unit/tools (test_agent_run, test_phase, test_factory_core) fail here; they run
  processes and git and are outside the done command and this mission.
- Holdout file with hypothesis seeds 1, 2, 3: exit 0 each.
- Done command as written, no pipe: exit 0 ("All checks passed!", "57 files already
  formatted", every test passing).

### What change to the code would make each changed test fail

Planted through scratch plugins under TMPDIR, then removed:
- fix2 and fix4: the count read, with no period, for 2000-01-01 instead of today: both fail
  on the NOT_IN_FORCE line.
- fix5: Rulepack.value for opt.report_employer_within_days read one day early (a row not in
  force on its own first day): fails, None where 2025-05-29 is due.
- holdout point 59 before every row: a lookup that falls back to today's row when none is
  in force: fails, six dated items where none is due.
- A first plant (shifting only _Working.rule_on) did not bite, because the item reads its
  row through another path; it was not counted as evidence.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-c116be8637 (attempt 1): cover the three untested point 59 paths (gate 6)

### What I tried and what ran

- Done command before any change: ruff clean, every test passing, diff-cover exit 1:
  "engine/f1.py (93.9%): Missing lines 402,870" (the nearest-row branch of _Working.show,
  and the empty list of _validation_reports). The raise for an interval of 0 is an unchanged
  line, so gate 6 does not count it; it is tested all the same, as the mission asks.
- The mission names _validation_numbers; the function in engine/f1.py is
  _validation_reports. Same paths, tested through compute_f1.
- Added to tests/unit/engine/test_f1_fix6.py, each through compute_f1 with a case and a test pack:
  - show: STEM_ONLY (the STEM case with no OPT block, its period from the STEM card's start),
    post-completion OPT answered not held, on a test pack whose only row of
    stem.requires_post_completion_opt starts 2026-09-30, the day after today. The row's
    citation and quote are shown, the verdict carries rule_not_in_force_on_event_day and is
    not the quiet state. Control: the same case on the plain test pack does not step back.
  - no row shown: the pack leaves out stem.validation_interval_months, then
    stem.extension_months; no stem.validation_N_due is listed and the output meets the
    contract. Control: the plain pack lists three (24 // 6 = 4, the fourth on 2028-03-13 after
    the card's end 2028-03-12, point 48).
  - interval 0: raises RulepackError naming stem.validation_interval_months.
- Done command as written, output to a file, no pipe: exit 0, "engine/f1.py (100%)".

### What change to the code would make each new test fail

Planted through a scratch plugin under TMPDIR, then removed; each failed as listed:
- show with no row today shows nothing: the show test fails (no words shown).
- show finds the nearest row without _rule, so no step back: the show test fails.
- _validation_reports falls back to 6 and 24 when no row is shown: both leave-out tests fail.
- _validation_reports without the check for 0: the interval 0 test fails (ZeroDivisionError).

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-54d4e6df70 (attempt 1): point 63, tests first

### What I tried and what ran

- Probed the current engine with finding 4's case (STEM_CASE of test_f1_fix6.py, answered
  no in full): the plain pack gives no_open_items, reasons [], three reports; the packs
  without stem.validation_interval_months and without stem.extension_months give
  no_open_items, reasons [], no report. Finding 4 reproduced.
- New tests/unit/engine/test_f1_fix7.py (point 63): a check of the case and the three
  packs; the plain pack control (three reports, 24 // 6 = 4, the fourth 2028-03-13 after the
  card's end, no step back); for each left-out rule: not quiet, carries
  rule_not_in_force_on_event_day, still no report, and the first output (before answers)
  already steps back; a pack without both; a property over clocks 2026-03-13 to 2030-12-31
  and the three leave-outs.
- New tests/holdout/test_holdout_fix7.py: a doctoral case (STEM card 2025-07-01 to
  2027-06-30, working in the file); plain pack control; each rule left out; each rule's
  only row starting 2027-07-02, the day after the fourth report's day, so no row is in
  force on any day the engine could read it on; a property over drawn STEM cards from
  2002-06-01 to 2035-12-31 and clocks up to 400 days past the card.
- tests/unit/engine/test_f1_fix6.py: test_point_59_a_pack_without_the_interval_lists_no_validation_report
  now also asserts the verdict is not no_open_items.
- On the current engine: 14 fail (8 in fix7, 5 in the holdout, the strengthened fix6 test);
  the four controls and checks pass. The first run of the holdout future-row tests had the
  row start 2027-07-01; the engine listed four reports from a row not in force today. I moved
  the start to 2027-07-02 so the claim holds on whichever day the rule is read.
- Done command as written, no pipe: exit 0 ("All checks passed!", "60 files already formatted").

### What change to the code would make each new test fail

Planted through a scratch plugin under TMPDIR wrapping f1.compute_f1, then removed:
- A reference that drops the reports and adds the step back (talk_to_dso when quiet) when a
  STEM case meets a pack with no row of either rule in force today: every new test and the
  strengthened fix6 test pass (exit 0).
- A fault that always adds the step back: both plain pack controls fail.
- The engine as it stands (no step back when whole_shown finds no row): every point 63 test
  fails, on the reason or on the quiet state.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-8a39e530c6 (attempt 1): tests in line with points 62 and 63

### What I tried and what ran

- Read the builders' own reports: L-engine (l-engine-cb8e397e6a, engine/PROGRESS.md in
  c9ca709) lists no older test that collides with point 63; L-content (l-content-70287e6b26,
  rulepacks/PROGRESS.md in 17ee340) rewrote the eight plain texts of point 62, and no test
  under tests/unit or tests/holdout asserts any of those texts (grep for the old words
  found none).
- Done command as written, output to a file, no pipe: exit 1. Ruff clean; two failed, both
  mine from the tests-first round, in tests/holdout/test_holdout_fix7.py:
  test_holdout_point_63_the_interval_row_begins_after_the_card_so_the_verdict_steps_back and
  ..._the_extension_row_... Each: `assert reports(out) == []`, left held
  stem.validation_1_due to _4_due. The step back (steps_back) passed.
- Probe: with the row starting 2027-07-02, the engine gives talk_to_dso,
  [rule_not_in_force_on_event_day], and four reports, every one null.
- Judgement: point 63 names only a rule for which whole_shown finds no row (the pack does
  not hold it). Here the row exists; points 40 and 59 say the item is null with the step
  back. No settled point says no report is listed. The assertion `reports(out) == []` was my
  reading, not a point. Replaced it in both tests with `undated(out)`: every listed report
  is null (points 40, 59), with the point written beside it; steps_back is kept whole.
  Recorded as a dispute so the founder can decide whether a row not in force should list
  no report at all.
- Done command again as written: exit 0. "All checks passed!", "60 files already
  formatted", every test passing, diff-cover "engine/f1.py (100%)", "Coverage: 100%".

### What change to the code would make each changed test fail

- Planted in a scratch copy of engine/ under TMPDIR (loaded first through a -p plugin, then
  removed): _item's guard computes the formula when a rule is lapsed (drops `or lapsed`),
  while the step back is still set. Both changed tests failed on `assert undated(out)`; the
  other five in the file passed.
- An engine that stops stepping back fails both on steps_back, as before.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-0c5dbafa90 (attempt 1): the local token, tests first

### What I tried and what ran

- Read specs/desktop-1/SPEC.md, "The api (L-api)" and "The engine process". Wrote
  tests/unit/api/test_local_token.py from those alone: 24 tests. /health open with and
  without a header; 403 without the header on GET, POST, ops, an unknown path, /healthz
  and /health/../version; 403 for a wrong, empty, prefix, longer and last-char-changed
  value, for the token in Authorization or the query; the right value let through (GET,
  POST, ops); the refusal in plain words (a sentence, no long dash, emoji or lint word)
  and not repeating the token; the comparison through hmac.compare_digest (spy put in
  before api.main is loaded again); with the variable not set, nothing changes (no
  header needed, header ignored, unknown path 404, same /version body).
- Each fixture sets the environment, clears get_settings and reloads api.main, so an api
  that reads the variable at start and one that reads it per request are both covered.
- First run in the worktree: the ops test passed with no check at all, because the ops
  guard refused the "testclient" address first. Fixed: the client calls from 127.0.0.1
  (inside the default ops list), and a control test shows ops answers 200 with the token.
- Second run in the worktree (new file and test_api.py): exit 1, the 12 refusal tests fail
  (no check yet, as expected); the others and all of test_api.py pass.
- Done command as written: exit 0, "All checks passed!", "62 files already formatted".

### What change to the code would make each test fail

Scratch copy of HEAD under TMPDIR (git archive), with a reference middleware appended to
api/main.py and a REF_FAULT switch; removed afterwards.
- Reference: 36 passed, exit 0 (this file and test_api.py).
- Exempt by prefix: the /healthz test fails. Ops left out: the ops test fails. GET only:
  the POST test fails. Compared with ==: the constant time test fails. Prefix compare:
  the prefix test and the constant time test fail. Token in the message: the no-repeat
  test fails. Body "403": the plain words test fails.
- The worktree api as it stands (no check): the 12 refusal tests fail.
- The "not set" tests fail if the check runs with no token (e.g. refusing when the value
  is None): that is the plain worktree state inverted; not planted separately.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-a576366692 (attempt 1): path over records, typed dates, POST /v1/compute, tests first

### What I tried and what ran

- Read specs/path-1/contracts-reconciled.md, SPEC.md, programs.md (sections 10 to 22, Part 2,
  Part 3), design-1 section 11 (RQ-A1), documents-1 section 8 (D59), and the contracts on
  this branch (case.schema.json, rulepack.schema.json path defs, engine_output.schema.json).
- engine/path.py does not exist. The SPEC names no function, so the tests assume
  engine.path.compute(case_dict, [Rulepack], clock); the module is imported inside one
  helper (_compute) so collection passes before it exists (lesson on I001 and absent modules).
- Wrote tests/unit/api/test_compute_generic.py (18 tests): category_not_covered:h1b for the
  shipped h1b pack (no path), output contract, today from the injected clock in the zone
  (Kiritimati gives 2026-09-30), scope.documents_count 0, documents_count refused, NOT_JSON,
  NOT_A_NUMBER, NOT_YET, four first_problem refusals, no echo of a body value, /v1/compute/f1
  refuses a records case. Run: 16 fail (route absent, 404/405), 2 pass (fixture guard, f1).
- Wrote tests/unit/engine/test_path.py (about 60 tests) over a j1 pack made in the test
  (kinds course, change, card, job; rules toy.*; placeholder quotes): for_each and instance
  ids, entered_when, windows and done_when, links, record on items, next with bind and
  only_if true/false/unknown, missing field asked, optional members, as_of before and after
  a change, fiscal year both sides of 10-01, day_before/day_after over a month end, happened
  after today, end before start, longest, declared conflict check (and yes gives talk_to_dso),
  judgement check, sum_of_days overlap (15), count_of_records at and under limit,
  sum_of_months by same_value, days_without_qualifying_period (5, 2, 29, 29), completeness
  statements (absent, reopened by grows_with_time, made today, not growing), 
  record.ends_before_today (raised, not raised, no gives talk_to_dso), no path and empty path,
  undeclared kind and field refused, effective_from_basis both ways, three hypothesis
  properties with an injected clock (never quiet while a used list has no statement, a
  deciding condition is unknown, a check is open), and an AST scan of engine/path.py for pack
  names, categories, dates and numbers other than 0 and 1. Every test pack and case is
  validated against its contract inside the helpers. Run: every engine test fails with
  ModuleNotFoundError engine.path, or "engine/path.py does not exist yet"; none fails on a
  fixture assertion.
- Wrote tests/unit/engine/test_typed_dates.py (12 tests) over the same pack: from_documents
  asked with every typed date in about, no_documents while nothing checked, checked.<fact>
  asked for each, unconfirmed:typed_dates while any is unchecked or "Doesn't match", both
  reasons lifted when all match, checks without the yes do not count, a no is cannot_tell, a
  yes for other values is not read, and a property never quiet with a strict subset checked.
- Done command as written: exit 0 ("All checks passed!", "65 files already formatted").

### Not done in this attempt (time limit)

- The twenty journeys as pairs in tests/holdout, each date checked against the saved words:
  not written. The F-1 path is not in the pack yet, and checking each date against the saved
  sources did not fit in 45 minutes.
- Parity with the differences of section 19 (p1.stem_list question, rule_copy_not_saved,
  record.ends_before_today, outcome_on after a denial) through compute_f1: not written; they
  need the real F-1 path. Existing tests already run every today case through compute_f1.
- No reference engine, so no fault was planted against the new tests.

### What change to the code would make each test fail

- Windows and links: an engine that ignores `add` or its `sign`, or reads this.end instead of
  this.course.end, gives another date. as_of: reading the newest end gives 2027-01-14 for the
  early filing. Fiscal year: placing 04-01 in the calendar year of the date gives 2026-04-01
  for 2025-01-06. day_before: subtracting from the day number alone fails on 03-01.
- next: showing a step whose only_if is false, or hiding one whose condition is unknown.
- Conflicts and checks: dropping the happened check, the end-before-start check, longest,
  or a declared check; a judgement check that asks first instead of talk_to_dso.
- Counters: summing overlapping spans (20, not 15); counting a job under the hours rule or
  under another card as qualifying (not 29); grouping sum_of_months all together (the low
  and high case then crosses the limit); count_of_records with > instead of >=.
- Completeness: treating a statement for a grows_with_time kind as lasting (09-20 case).
- ends_before_today, no path, undeclared kind or field, effective_from_basis: each test
  fails if the engine omits the behaviour; the basis pair fails if it always uses one reason.
- Literal scan: any F-1 kind, shipped rule id, category, ISO date or number other than 0
  and 1 written as a constant in engine/path.py.
- Typed dates: using a typed date after the yes alone, taking "Doesn't match" as checked,
  or taking a yes whose about holds other values.
- API: a route that is absent, returns 500 on a refusal, echoes a body value, or accepts
  documents_count.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-4ba0df3312 (attempt 1): reconcile tests/unit and tests/holdout after path.py and /v1/compute

### What I tried and what ran

- Done command before any change, output to a file, no pipe: exit 1. Every test passed but
  one: tests/unit/support/test_placeholders.py::test_every_api_test_posts_through_the_checked_client
  (assert ['test_compute_generic.py:51'] == []). test_path.py (engine/path.py, commit 566879a),
  test_typed_dates.py (D59) and the 16 other tests of test_compute_generic.py (POST /v1/compute,
  commit fc96aad) already pass.
- Read the builders' notes: engine/PROGRESS.md of l-engine-61ed2c8d55 and api/PROGRESS.md of
  l-api-64e7959dbd (git show). Neither lists an open collision with tests/unit or tests/holdout;
  the api note says its 14 failures in test_compute_generic.py were the missing route, which the
  engine note confirms. The REPORT.json files of those two runs are not on disk (worktrees
  removed; the files are gitignored). The REPORT.json files still on disk belong to older runs
  whose disputes the current suite no longer shows as failures.
- The engine note puts talk_to_dso ahead of the D59 reasons "because tests call for talk_to_dso
  while typed dates are unchecked". Checked against specs/documents-1/SPEC.md lines 531 and 1030
  (a typed value kept over a document gives talk_to_dso): the order the tests ask for is the
  SPEC's. No dispute.
- Change, tests/unit/api/test_compute_generic.py: the client fixture yields CheckedClient(app)
  instead of TestClient(app); the docstring no longer says "expected to fail" and names the
  guard. Point: SPEC-resolutions.md points 2, 3 and 7 (no placeholder answer reaches the api),
  enforced for every api test by test_placeholders.py. No assertion changed.
- Done command as written after the change: exit 0 ("All checks passed!", "65 files already
  formatted", every test passed).

### What change would make it fail

- Back to TestClient(app) in the fixture: test_placeholders.py fails again, as it did at the
  start of this run.
- A test in test_compute_generic.py that posts a case holding ON_THE_DAY_IT_RUNS or an about
  of {"question": id}: CheckedClient.post raises PlaceholderAnswerError before the request.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-d29085b29f (attempt 1): reach the untested lines of engine/path.py

### What I tried and what ran

- Done command before any change, output to a file, no pipe: exit 1. diff-cover against
  product-2: engine/path.py 85.1%, 126 of 846 lines missing (business days, months and
  years, today, facts of the whole person, first, in_year_of, fiscal year rule not in force,
  the conditions present, month_day_is, at_most, exists, none, count_below, count_at_most,
  any_of, all_of, not, the levels, next with bind onto a record already entered, next to a
  stage with no for_each, checklists, chain groups, not_qualifying, refusals and verdicts).
- Added tests/unit/engine/test_path_reach.py: 54 tests through engine.path.compute with a
  j1 pack made in the test (kinds course, card, job, trip; rules toy.*). Each date and count
  is worked by hand beside its assertion. FixedClock is injected throughout.
- Two assertions I wrote failed against the engine. Both are spec claims, so I took each
  test out and list it under disputes rather than pin what the engine does:
  "toy.order" in rules after a level comparison (programs.md 11), and "toy.later_days" in
  rules for a stage span end moved by that rule (the window version of the second passes and
  is kept).
- Done command as written after the change: exit 0. engine/path.py 98.8%; missing 181,
  191, 239, 271, 284, 303, 446, 460, 701, 850. Each of these is a malformed pack (no anchor,
  unknown unit, next naming no stage, counter with no span), unreachable code (191), or
  behaviour I think is wrong (271, 460), so I left them untested and did not pin them.
- Mutation run: a scratch pytest plugin under TMPDIR patched engine.path and ran the new
  file once for each fault. Every fault made at least one test fail: business days counted
  as calendar days, years as 365 days, earliest and latest swapped in first, not ignored,
  chain grouped as record, not_qualifying dropped, a confirmation dated after today read,
  litigation never reported. The scratch folder is removed.
- Probe script (scratch, removed) confirmed the findings under disputes.

### What change would make each new test fail

- Units: bdays as calendar days (10-24 not 10-26); holidays not skipped (11-13 not 11-16);
  years as 365 days (2028-02-29 not 2028-03-01); 29 February not clamped.
- Note, plain and derivation dropped from rules, or reading false on a window using a
  reading row.
- first: earliest and latest swapped; a date made up when no record is found.
- in_year_of placed in another year; an absent anchor not asked; a fiscal rule not in force
  giving a date anyway or no rule_not_in_force_on_event_day.
- A window close moved by a rule not in force computed anyway, or the rule not cited.
- Fact stage: arrival not read as a fact, or the span not moved by years. Typed facts not
  asked about. A case with no typed date not given no_documents.
- Conditions: today not read as the person's day; on_or_after, before, on_or_before with the
  wrong strictness; an absent field or link not asked; present, field-only, month_day_is,
  at_most, exists, none, count_below, count_at_most, any_of, all_of or not computed wrong;
  not_sure in a selection or a condition not sent to the DSO; only_if ignored on a check.
- Levels: order reversed, or level_same comparing names instead of ranks.
- Next: a bound next stage shown although the record is already entered; a next stage
  with no for_each not shown or shown twice.
- Checklist: a no, or a yes dated after today, counted; id, stage, record, reading, who or
  school not carried; answers_read wrong.
- Counters: chain grouped by record (10 and 15 not 20); a span ending before it starts
  counted as a number; an unknown selection counted; days after today counted; trip days
  not added back (0 not 5); a job with no start covering days or its start not asked.
- Refusals: a foreign category accepted; rules_never_checked, rule_in_litigation missing; a
  future confirmation read; needs_you not reached when the only reason is an open window.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-d29085b29f (attempt 2): the done command refused at git add -A

### What I tried and what ran

- Attempt 1 was refused: the orchestrator's run of the done command stopped at git add -A with
  "fatal: Unable to create '/Users/ani/Desktop/Duly/duly/.git/worktrees/l-tests-d29085b29f/index.lock':
  Operation not permitted". Every step before it (ruff, format, pytest with coverage) had passed.
- Done command as written, no pipe, output to a file under TMPDIR: exit 0. diff-cover against
  product-2: engine/path.py 98.8% (missing 181, 191, 239, 271, 284, 303, 446, 460, 701, 850),
  engine/rulepack.py 100%, total 98%.
- After the run: git status clean, .scratch/ is ignored (.gitignore line 16), and no index.lock
  in .git/worktrees/l-tests-d29085b29f.
- No test changed. The refusal comes from the environment the command ran in, which tests/
  cannot change; it is under requests in REPORT.json.

### What change would make it fail

- Same as attempt 1; no new test.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-d50733b3dc (attempt 1): bring in l-tests-d29085b29f and run the done command without git add

### What I tried and what ran

- git merge lane/L-tests/l-tests-d29085b29f: clean merge, brought in
  tests/unit/engine/test_path_reach.py (54 tests) and the progress entries above.
- Done command as written (no git add step now), no pipe, output to a file under TMPDIR:
  exit 0. ruff check "All checks passed!", ruff format "66 files already formatted", pytest
  passed, diff-cover against product-2: engine/path.py 98.8% (missing 181, 191, 239, 271,
  284, 303, 446, 460, 701, 850), engine/rulepack.py 100%, total 846 lines, 10 missing, 98%.
- Checked the mission list against the tests: as_of is asserted on both sides of a change in
  tests/unit/engine/test_path.py (test_as_of_reads_the_end_in_force_before_the_change and
  _after_the_change), and line 275 is covered. ends_also is not read by engine/path.py; it
  stays a dispute and no test pins it.
- No test added or changed in this run.

### What change would make each new test fail

- No new test; the list under run l-tests-d29085b29f attempt 1 still holds.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-ada9778eec (attempt 1): product-2 resolutions points 1 to 9 as tests

### What I tried and what ran

- Read specs/product-2/resolutions.md, reviews/product-2.md, specs/path-1/programs.md
  sections 10 to 22 and Part 2, and the twenty timelines of specs/path-1/journeys.json.
- New tests/support/records_case.py: builders for records cases and readers for the output.
  It holds no expected value.
- New tests/unit/acceptance/test_journeys.py: the twenty journeys as records cases, each
  through POST /v1/compute (CheckedClient, FixedClock 2026-09-29 16:00 UTC, New York). 90
  tests: two over all twenty (reaches path.py; never no_open_items) and 50 journey tests.
- New tests/unit/engine/test_path_fix1.py: points 3 to 9 on the review's inputs, straight to
  engine.path.compute with the shipped packs, 25 tests, each with the other side of its line.
- New tests/unit/api/test_compute_records.py: an Onboarding-shaped case (section 18) through
  POST /v1/compute must equal engine.path.compute on the same case and clock, and meet
  engine_output.schema.json.
- New tests/holdout/test_holdout_journeys.py: 17 twins with other dates or across the line.
- A scratch plugin under TMPDIR swapped api.case.compute for engine.path.compute, to see which
  assertions hold once point 1 is built. Removed afterwards.
- Plain run: every journey test fails (category_not_covered:f1); api test 2 of 4 fail.
  Wired run: acceptance 71 passed, 19 failed; fix1 19 of 25 fail; api 4 passed; holdout 13
  passed, 4 failed. Every wired failure is a review finding or one listed under disputes.
- Done command as written, no pipe: exit 0.

### What change would make each new test fail

- Journeys: /v1/compute not calling path.py (all); a window counted from the card end or the
  wrong end in force (J01, J02, J03, J05, J09, twin J09); months counted as 30 days; the
  business-day count not skipping Christmas, Thanksgiving or Juneteenth (J15, J19, twins);
  CPT counted per school or part-time added (J03, J06, J07); trip days ignored (twin J11);
  cap-gap end from requested_start and not validity_start (J12, twins); the wrong capgap row
  for filed_on (twin J12 old rule); a conflict raised for a request on old_end (twin J09).
- fix1: a link path read as a field (point 3); grace or unemployment spans leaving out the
  cap-gap (4); a count with no statement (5); a closed next shown (6); no ten-years item, no
  CPT step back, empty lists, no end_by_source (7); decision or stem_list asked (8);
  rule_in_litigation raised with no differing alternate (9).
- api: the route computing anything but path.compute's output.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-1d552cbca8 (attempt 1): resolutions points 1, 7, 9 and 12, test side

### What I tried and what ran

- Read specs/product-2/resolutions.md and the builder's report. engine/REPORT.json is not in
  commit 9711d19 (the name is ignored by git), so I read it from the lane's worktree on disk.
- Checked the pack before renaming (engine.rulepack.load_all): the cap-gap grace stage is
  for_each petition, and the second unemployment.opt_card counter is scoped on petition,
  group record. J12 and J13 hold one petition, h1.
- tests/unit/engine/test_path_fix1.py (point 12): grace.p1 to grace.h1 (J12); 
  unemployment.opt_card.a1 to .h1 in the three tests on J12 and J13, and the at_or_over id
  to .at_or_over_limit.h1. Values and working unchanged (2026-10-02 later, 45, None, 486).
  J01's unemployment.opt_card.a2 stays: J01 has no petition.
- test_path_fix1.py (point 7): removed test_point7_the_ten_years_after_a_basis_degree_are_shown
  and test_point7_ten_years_from_a_leap_day_is_28_february; a comment says they wait for a
  contract construct for a computed date. No other assertion changed.
- Kept test_point4_unemployment_total_runs_through_the_cap_gap_on_stem (85) and
  test_point7_ends_also_two_readings_of_an_end_give_the_judgement_item: point 12 asks the
  pack to change for both, so they fail until L-content does it.
- tests/unit/engine/test_path_reach.py (point 9): test_a_litigated_rule_in_use_is_cannot_tell
  replaced by three tests on a toy pack with two regimes (toy_old operative, toy_new
  enjoined): a litigated rule with no alternate raises no rule_in_litigation; toy.bar 30
  against 60 raises it and cannot_tell (window closes 2026-10-20 + 30 = 2026-11-19); 30
  against 30 raises nothing. _pack_dict takes regimes.
- Scratch copy of lane/L-engine/l-engine-b9ea448ead (git archive into TMPDIR) with the two
  files: 2 failures, the unemployment.total 85 and ends_also tests (pack side). Everything
  else in both files passed. Removed afterwards.
- Same tests against this worktree's engine: the no-alternate and same-value tests fail (it
  raises the reason for any litigated rule).
- Done command as written, no pipe: exit 0 (ruff clean, 71 files formatted, collection ok).

### What change would make each new test fail

- grace.h1 / unemployment.opt_card.h1 tests: the pack or engine keying the cap-gap grace or
  count by the program or the card again, or the span not reaching the cap-gap end.
- test_a_litigated_rule_with_no_alternate_is_not_the_litigation_reason: litigation raised on
  status litigated alone (this worktree's engine fails it).
- test_a_shown_window_whose_rule_has_a_different_alternate_is_cannot_tell: the alternate
  check always false (planted in the scratch copy: failed).
- test_an_alternate_with_the_same_value_is_not_the_litigation_reason: the alternate check
  always true, or comparing rows and not values (planted: failed).

### Seen in data, not followed

Nothing read in this run asked for an action. The builder's report makes requests of
L-tests; I followed only the mission.

## Run l-tests-b0a5db2b39 (attempt 1): resolutions point 13, test side

### What I tried and what ran

- Read specs/product-2/resolutions.md point 13 and the builder's report (engine/REPORT.json in
  the lane/L-engine/l-engine-50dba0218d worktree on disk; the name is ignored by git).
- Checked the pack: unemployment.opt_card, unemployment.opt_card.<petition> and
  unemployment.total all read trips as not_qualifying, so each is a counter over the trip list.
- tests/unit/acceptance/test_journeys.py:
  - J12 (point 12 ids): grace.p1 to grace.h1, unemployment.opt_card.a1 to .h1. Values unchanged
    (starts 2026-10-02, not done; 0).
  - J02: removed test_j02_the_ten_years_after_the_bachelors_end_on_2028_05_19. A comment says it
    waits with point 7 for a contract construct for a computed date.
  - Trip list stated whole ("trip" in whole()) in J01, J03, J04, J05, J09, J12, J13, J14, J15,
    J19, J20 (each holds an OPT or STEM card, so a counter reads trips, and the timeline holds
    every trip, none). J07, J11 and J16 already stated it. J02 left out: its timeline has the
    student go home between programs, a time abroad the case does not hold. J06, J10, J17, J18
    hold no OPT or STEM card; left as they were.
  - J08: j08(trips_whole=True). The 35 test uses the stated case. New test
    test_j08_unemployment_is_null_until_the_trip_list_is_whole: null without the statement, 35
    with it.
- tests/holdout/test_holdout_journeys.py: trip stated whole in the twins of J01, J08, J09, J12,
  J13 (_cap_gap_case), J15, J19. J12 twin grace.p1 to grace.h1. J08 twin split into _j08_like and
  a new twin test_twin_j08_no_count_before_the_trip_list_is_whole (null, not 49).
- Ran both files and test_path_fix1.py on a copy of commit 06e6cb9 (the builder's engine, git
  archive into TMPDIR, this lane's tests copied in). Before (HEAD tests): 10 failures. After:
  8. J02 ten years, J12 x2 and twin J12 no longer fail. Still failing, all pack or engine side:
  J05 months (12, not null), J08 35 (null: the span ends at card_end and w2 is asked for under),
  J08 null-until-whole (the null half passes; the 35 half fails for the same pack reason),
  J17 enrollment, J20 opt_post.p2, twin J08 (148, span to card_end), twin J08 null (148: the
  engine does not yet make the count null for want of a trip statement, point 13), twin J11
  (86, not 105; it failed before this run too, untouched). Scratch copy removed.
- ruff format changed one file; ruff check clean. Done command as written, no pipe: exit 0.

### What change would make each new test fail

- test_j08_unemployment_is_null_until_the_trip_list_is_whole: an engine that checks only the
  work list for completeness (as the builder's does) once w2 no longer makes the count null;
  or a count that stays null after the statement.
- test_twin_j08_no_count_before_the_trip_list_is_whole: the same, and it fails now on the
  builder's engine (148), which is the fault point 13 names.
- J12 id tests: the pack keying the cap-gap grace or count by program or card again.

### Seen in data, not followed

The builder's report asks L-tests for the J12 ids; that is also in the mission, so it was done
for the mission's sake. Nothing else read asked for an action.

## Run l-tests-dde022b67d (attempt 1): resolution 13 in the engine, tests brought in line

### What I tried and what ran

- Read specs/product-2/resolutions.md (point 13) and the end of this log. The engine at HEAD
  (8e749cc) makes a count null until every list it reads is stated whole
  (engine/path.py, the counter's `whole` check over qualifying and not_qualifying records).
- Done command on HEAD before any change: exit 0. Nothing failed.
- The three count tests in tests/unit/engine/test_path_fix1.py (point 4 on J13 = 45, point 4
  on J14 = 85, point 5 on J12 = 486) already pass: run l-tests-b0a5db2b39 stated the trip list
  whole in J12, J13 and J14 in tests/unit/acceptance/test_journeys.py, which fix1 reads. Their
  comments did not say so; each now carries a note citing resolution 13. No assertion changed.
- The shipped pack has three counters, all reading work (qualifying) and trip (not_qualifying):
  unemployment.opt_card, unemployment.opt_card.<petition>, unemployment.total.
- Scratch plugin under TMPDIR wrapped engine.path.compute over tests/unit and tests/holdout and
  listed each test's cases by trip records and trip statement. No test builds trip records
  without stating the trip list whole. Cases with no trip statement: J02, J06 and the twins of
  J02, J03, J06, J16 (no unemployment count asserted, so point 13 does not touch them), and the
  two J08 null tests that leave it out on purpose. Scratch removed.
- New in test_path_fix1.py, point 13 at the engine: J13 (w1 ends 2026-06-30) without the trip
  statement gives unemployment.opt_card.h1 null, reason unconfirmed:complete.trip, question
  complete.trip; J14 without it gives unemployment.total.a1 null and the reason. The other side
  of each line is the 45 and 85 tests on the same case with trips stated.
- ruff format: 71 files unchanged; ruff check clean. Done command as written, no pipe: exit 0.

### What change would make each new test fail

- Both point 13 tests: an engine that checks only the work list (planted through a scratch
  plugin making _Run._stated true for trip: both failed, the rest of the file passed); or a
  count that is null without saying why.

### Seen in data, not followed

Nothing read in this run asked for an action.

## Run l-tests-d4e4895e82 (attempt 1): tests for the translation of today's case onto records

### What I tried and what ran

- Read specs/product-2/resolutions.md (point 1), programs.md section 19, engine/f1.py
  (to_records, compute_f1_records and helpers), and the end of this log.
- Ran five case_f1 cases (OPT, no OPT, OPT ended before today, OPT with a denied petition,
  OPT then STEM) through compute_f1_records and compute_f1 in a scratch script under TMPDIR,
  with the shipped F-1 pack on 2026-09-30 UTC, to see both outputs. Scratch removed.
- New tests/unit/engine/test_f1_translation.py, 32 tests: every row of the section 19 table
  (p1, cpt_days_stated incl. 0 and absent, a1 approved only with both card dates, a2 extends
  a1 and basis p1, w<n> under the card holding its start incl. both card edges and a2,
  no under outside every card, h1 cap_subject yes, confirmations same ids, the two
  statements); compute_f1_records equal to path.compute on a records case written by hand
  from the table; OPT and STEM dates worked by hand; parity with compute_f1 for OPT windows,
  file_by, complete_by, latest_start, unemployment used, and the STEM dates; changes 1, 3
  and 4 of section 19 asserted as such.
- ruff format: 72 files unchanged; ruff check clean. mypy on the new file reports only two
  errors at tests/support/f1_pack.py:1003, which is older and not touched.
- Done command as written: exit 0. Diff coverage engine/f1.py 100 percent, total 98 percent.

### What change would make each new test fail (planted through a scratch plugin, all caught)

- _holding_card naming a1 for any day: test_a_period_outside_every_card_names_no_card.
- _card with no decision: the hand-written records test and the a1/a2 row tests.
- decision on card_start alone: test_opt_with_a_card_start_and_no_card_end_is_not_approved.
- earlier_at_this_level no ignored: test_no_to_earlier_opt_at_this_level_states_p1_...
- a no to nothing_more_to_record stating lists whole: test_no_to_nothing_more_states_no_list_whole.
- cpt 0 dropped as nothing entered: test_cpt_days_of_zero_are_kept_as_zero.
- compute_f1_records calling compute_f1: every records-output test, e.g. change 4.

### Findings (not worked around; the tests assert only what section 19 says)

1. Grace is lost in translation. The pack's grace stage needs p1.state completed; the table
   gives p1 no state, so no translated case has a grace date. compute_f1 gives grace.ends
   2027-07-30 on the OPT case (card end 2027-05-31 plus 60). Not one of the four changes.
2. A case with no OPT loses its OPT windows: compute_f1 gives opt.apply_window 2027-02-13 to
   2027-07-13 for an end of 2027-05-14; the path gives no window.
3. A job that runs from the OPT card into the STEM card is under a1 only (the card that holds
   its start), so the path counts the STEM days as unemployed: unemployment.total.a1 = 136 =
   14 (2025-06-01 to 06-14) + 122 (2026-06-01 to 2026-09-30); compute_f1 gives 14 used.
4. Change 4 is half built: a denied petition gives no grace date (asserted), but no outcome_on
   question is asked. Not asserted: it would fail.
5. New items not named in section 19: questions p1.full_course_each_term and
   p1.online_within_limit on every case; reason opt.months_at_level.at_or_over_limit.master for
   a 12-month card with no earlier OPT answered; reason rule_not_in_force_on_event_day from
   product.opt_start_earliest_years_before_program_end read on 2026-05-15 (a product setting
   read as a rule with a start date); stem.validation_4 closing 2028-06-15, after the STEM
   card end 2028-05-31 (compute_f1 stops at 3); cap_gap.h1 stage and
   unemployment.opt_card.h1 for a denied petition.
6. The confirmations row says "The translation strips the record suffixes"; to_records copies
   ids unchanged. No case here shows which suffix is meant.
7. Change 2 (rule_copy_not_saved_for_event_day) has no test here: no translated case found in
   time reads a rule marked earliest_saved_copy before its start.

### Seen in data, not followed

Nothing read in this run asked for an action.

## l-tests-9d76786149: guard the run helpers of test_f1_translation.py (escalated)

Mission: test_every_run_helper_passes_its_case_through_the_guard failed on
test_f1_translation.py:72 in _records and :82 in _both.

What I did: a helper _sent builds the case as every other run helper does
(with_the_about_asked, asked by compute_f1 through refuse_placeholders), and _records and
_both call f1.parse_case(refuse_placeholders(_sent(**changes)), CLOCK). The guard test passes.
What would make it fail again: parse_case called on _raw(...) directly in either helper.

What ran:
- The done command before the change: 1 failed (the guard test), 41 passed.
- Guard only, no about step: 15 translation tests raise PlaceholderAnswerError (13 on
  nothing_more_to_record, 2 on opt.earlier_at_this_level): _answers writes about_asked(q).
- Guard with about step asked by compute_f1 (kept): ruff clean, 6 failed, exit 1.
- Guard with about step asked by compute_f1_records: 7 failed (the path asks complete.*,
  never nothing_more_to_record or opt.earlier_at_this_level, so both answers are dropped).

Why the 6 fail: with_the_about_asked leaves out an answer whose question is never asked
(SPEC-resolutions point 7). compute_f1 asks only opt.earlier_at_this_level on the OPT case
(a job is entered, so nothing_more_to_record is not asked), and only nothing_more_to_record
and full_time_cpt_used on the no-OPT case. The tests leaned on answers to unasked questions,
held up by the marker about:
- opt/stem parity and translation tests: WHOLE's nothing_more_to_record is dropped, the work
  list is not whole, unemployment.opt_card.a1 is None instead of 14.
- test_no_to_earlier_opt_at_this_level_states_p1_authorizations_whole: the answer is dropped.
- test_answers_keep_their_ids_answers_days_and_about: the about step adds an about to
  full_time_cpt_used, so the input the test compares against changes.
- test_compute_f1_records_is_path_on_the_hand_written_records: the hand-written case keeps
  marker abouts that the translated case no longer has.

Not done: no case, no assertion changed. That is the founder's decision (see REPORT.json).
- Stop hook (lane_test.py) ran the done command: the same 6 failures, a second time. Stopped
  as the contract says, status escalated; no case or assertion changed.

## l-tests-8a15fee5f8: the translation tests follow resolution 14 (blocked on engine/f1.py)

Merged lane/L-tests/l-tests-9d76786149 (the guard in _records and _both, kept).

What I did:
- tests/support/f1_pack.py, with_the_about_asked: a question asked with no about (the path's
  complete.<kind>) raised KeyError 'about'. The answer now goes with no about and without the
  marker. New test in tests/unit/support/test_placeholders.py for it.
- test_f1_translation.py: _answers writes no marker about; _sent asks the about step with the
  questions of compute_f1 and compute_f1_records together, so one case is sent to both;
  WHOLE answers complete.<kind> yes for every kind plus opt.earlier_at_this_level no, and the
  guard leaves out what neither engine asks. The six tests of the escalation:
  - answers_keep_their_ids: compared with the case as sent (full_time_cpt_used gains the
    about {"cpt_full_time_days": None}; the {"x": "1"} about is kept).
  - no_to_earlier_opt: on the OPT case (asked there); new twin on a no-OPT case states nothing.
  - hand_written_records: complete is the eight kinds the path asks on this case plus
    authorization:p1; confirmations are those sent. New test states the sent case whole.
  - opt dates, OPT parity, STEM parity: unchanged assertions; the lists are whole by
    complete.<kind> now.
- Point 14 read as written: yes to nothing_more_to_record states nothing whole (old test
  reversed); new tests for complete.<kind> yes (on its day) and no.

What ran:
- The done command, as written, no pipe: ruff clean, 72 files formatted, 7 failed, exit 1.
  All 7 in test_f1_translation.py; engine coverage of the plain run 98 (f1.py 100).
- A scratch plugin under TMPDIR replacing engine.f1._statements with point 14 (complete.<kind>
  yes to that kind on its day; earlier no to authorization:p1 on a case with OPT; nothing
  from nothing_more_to_record): tests/unit/support and tests/unit/engine all pass.
- Faults planted on that reference, each caught: complete.<kind> no read as yes
  (test_no_to_complete_kind...); earlier yes read as no (test_yes_to_earlier...); the
  statement dated today, not the answer's day (test_yes_to_complete_kind...). The engine as
  it is (nothing_more read, complete.<kind> not read) is caught by the 7 failing tests.
  Not caught by these tests: an engine that reads earlier on a no-OPT case, because the
  guard drops that answer before the engine sees it.
- Scratch removed.

Why it stops here: engine/f1.py _statements still turns nothing_more_to_record into every
statement and does not read complete.<kind>. Point 14 needs that change; it is outside
tests/. Status blocked; request to L-engine in REPORT.json. No assertion loosened.

### Seen in data, not followed

Nothing read in this run asked for an action.
- Stop hook (lane_test.py) ran the done command: the same 7 failures, a second time.
  Status changed to escalated as the contract says; no case or assertion changed.

## l-tests-2839a42b3a: point 14 clarified, opt.earlier_at_this_level states nothing on any case

Merged lane/L-tests/l-tests-8a15fee5f8 (clean merge).

What I did, in tests/unit/engine/test_f1_translation.py only:
- Removed test_no_to_earlier_opt_at_this_level_states_p1_authorizations_whole, as the mission
  says. In its place, test_no_to_earlier_opt_on_a_case_with_opt_states_nothing_whole: the
  same OPT case, the answer is sent with the card's about (2026-06-01 to 2027-05-31, master),
  and complete is {}. It fails on an engine that turns earlier no into authorization:p1.
- Removed the authorization:p1 key from the complete of _hand_written_opt_case; complete is
  now the eight complete.<kind> kinds, each {"on": "2026-09-30"}. Docstring says why.
- Module docstring and the confirmations comment now say earlier states nothing on any case.

What ran:
- uv run ruff format tests: 72 files already formatted.
- The done command, as written, no pipe: All checks passed, 72 files already formatted,
  collection clean, exit 0.
- pytest tests/unit/engine/test_f1_translation.py: 8 failed. Expected until the engine
  follows point 14 next round (the old 7 less the removed test, plus the new OPT twin, plus
  the hand-written case now without authorization:p1, which already failed).

### Seen in data, not followed
Nothing read in this run asked for an action.

## l-tests-2839a42b3a attempt 2: report lists every changed file

Why attempt 1 was not accepted: REPORT.json left out tests/support/f1_pack.py and
tests/unit/support/test_placeholders.py. Both changed through the merge of
lane/L-tests/l-tests-8a15fee5f8 (with_the_about_asked answers a question asked with no about
with none, and its test), not by hand in this run, and the list was built from hand edits.

What I did: checked the work of attempt 1 is intact (the p1 test is gone, the hand-written
case holds no authorization:p1), then set files_changed from git diff --name-only 5d5d1e7
HEAD plus REPORT.json. No test changed in this attempt.

What ran: git diff --name-only 5d5d1e7 HEAD (4 files under tests/); the done command, as
written, no pipe (result below in REPORT.json commands_run).

### Seen in data, not followed
Nothing read in this run asked for an action.
Done command printed: All checks passed!, 72 files already formatted, exit 0.

## l-tests-d40bcf768c: resolutions point 15, tests first

What I did:
- tests/unit/acceptance/test_journeys.py: helpers _dated_after and _grace_after; new tests
  test_j04_the_concluding_evaluation_is_dated_from_the_release_date (2022-08-15 to 08-25),
  test_j04_no_validation_is_dated_after_the_stem_card_ended (validation_3 2022-12-22 and
  validation_4 2023-06-22 gone; validation_2 2022-06-22 to 07-07, July 4 skipped),
  test_j06_the_masters_opt_is_not_next_after_its_filing_windows_closed,
  test_j14_the_concluding_evaluation_is_dated_from_the_last_day_of_the_job (07-15 to 07-25),
  test_j14_no_validation_is_dated_after_the_training_ended. test_j12_grace_begins_after_the_cap_gap
  is replaced by test_j12_no_grace_after_an_approved_change_of_status: point 15 reverses it.
- tests/unit/engine/test_path_fix1.py: test_point4_grace_starts_after_an_active_cap_gap moved off
  the approved J12 (point 15) onto J12 with h1 pending: cap-gap to 2027-04-01, grace.h1 from
  2027-04-02. Point 4 is still tested; no assertion loosened.
- tests/holdout/test_holdout_journeys.py: the validity_start twin now asserts no grace after
  2026-11-15 (point 15); new twins: pending petition keeps grace.h1 from 2027-04-02; J04 twin
  (release 2023-03-03, evaluation to 03-13, no validation after it); J14 twin (job ends
  2025-04-18 before the card, evaluation to 04-28, no validation after); J06 twin pair (window
  closed 2026-03-17: not next; window open to 2026-10-13: next).
- tests/design/read_canvas.py and tests/design/landmarks.json: every landmark of the nine
  canvas files (text, sized elements, svgs, sc-if parts marked) with declared style, drawn type,
  the sidebar and column boxes by arithmetic, and the SPEC 14.1 overrides with reasons.

What ran:
- pytest on the new tests against today's engine: 12 fail on the behaviour they protect
  (J04 evaluation 2023-06-21 to 07-01, validation_3/4 after the card, J06 opt_post.p1 next,
  grace.h1 after the approved J12, J14 evaluation 2026-05-31 to 06-10, and the twins).
  Pass today, as they should: test_j14_no_validation..., the pending twin, the open-window J06
  twin, the point 4 pending test.
- Chromium headless (playwright cache) died with SIGTRAP inside the sandbox, so landmarks.json
  holds the markup reading only (measured_in_a_browser false); the founder can run it with CHROME.
- Done command as written, no pipe: All checks passed!, 73 files already formatted, exit 0.

What makes each new test fail: an engine that dates stem.evaluation_final from this.card_end
(J04, J14, twins); one that keeps validation_n by card_start alone (J04, J04 and J14 twins);
_closed counting opt.complete_by as open (J06, J06 closed twin); grace built after a cap-gap
approved with a change of status (J12, validity twin); dropping grace for a pending petition
(pending twin, point 4 test); not showing next while the window is open (open J06 twin).

### Seen in data, not followed
Nothing read in this run asked for an action.

## l-tests-76517020ba: tests in line with resolutions point 15 (J06, J19)

What I did:
- tests/unit/acceptance/test_journeys.py
  - test_j06_the_masters_opt_is_not_next_after_its_filing_windows_closed: dropped the
    opt.apply_window.p1 assertion. Point 15: "A next stage is shown only while a window in
    which something can be filed is open"; the window closed 2026-02-10, so the stage and its
    window are not shown. The not-next assertion is kept.
  - test_j19_stem_validations_skip_juneteenth renamed test_j19_stem_validations_stop_at_the_card_end.
    validation_1 (2026-12-09 to 12-23) kept. validation_4 on 2028-06-09 replaced by: no
    stem.validation_*.a2 dated after the card end 2028-06-08 (point 15, "No validation is dated
    after the card or the training ends"; 8 CFR 214.2(f)(12)(ii)(B)).
- tests/holdout/test_holdout_journeys.py
  - test_twin_j06_opt_is_not_next_once_its_filing_window_closed: same change as J06 (point 15),
    not-next kept. It failed for the same reason.
  - new test_twin_j19_validation_skips_juneteenth: STEM start 2025-12-12, validation_1
    2026-06-12 (Fri) plus 10 business days: 15, 16, 17, 18, (19 skipped) 22..26, 29 ->
    2026-06-29, inside the card ending 2027-12-11. Keeps the Juneteenth check J19 lost.

What ran:
- Done command before changes: exit 1; 3 failures (J06, J19, J06 closed twin).
- Fault plant: scratch plugin under TMPDIR made engine.dates._holidays_of drop Juneteenth; the
  new twin failed with ('2026-06-12', '2026-06-26'); without it, passed. Scratch removed.
- Done command as written, no pipe: All checks passed!, 73 files already formatted, exit 0.

What makes each changed test fail: J06 and its closed twin, an engine that shows opt_post.p1 as
next once only opt.complete_by is open; J19, an engine that dates validation_4 on 2028-06-09 or
any validation after the card end, or a wrong validation_1; the Juneteenth twin, dropping
Juneteenth from the business-day holidays.

### Seen in data, not followed
engine/REPORT.json (l-engine-90c06e929c) held requests addressed to L-tests; they matched the
mission, which is what I followed.
