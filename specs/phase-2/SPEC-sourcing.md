# Phase 2 addendum: every number has a source

Founder decision, 2026-09-28: if a number in the engine is law, find the law and source it. If it is Duly's own choice, it is recorded as Duly's choice and never shown as law.

The engine builder reported six numbers that came from the SPEC and not from the rule pack. This addendum gives each one a home.

## Rules to find and source (L-content)

For each row, find the exact words in a primary source, save the source, and record the quote, as in the main SPEC. The value column is what the SPEC assumed. If the source says something else, record what the source says and write the difference in your progress log. If no primary source states it, do not add the rule; write what you searched and where in your progress log.

| id | assumed value | unit | status | where to look |
|---|---|---|---|---|
| stem.evaluation_interval_months | 12 | months | settled | 8 CFR 214.2(f)(10)(ii)(C)(9), the annual self-evaluation |
| cpt.full_time_bar_days | 365 | days | school | 8 CFR 214.2(f)(10)(i) says one year or more. The count in days is how schools apply it; quote the regulation and say so in the note |
| capgap.fiscal_year_start_month_day | 10-01 | date | settled | 31 U.S.C. 1102 on uscode.house.gov, and the cap-gap paragraph 8 CFR 214.2(f)(5)(vi) |
| opt.report_employer_within_days | 10 | days | guidance | SEVP guidance and Study in the States. The research found no number in the regulation for post-completion OPT; check 8 CFR 214.2(f)(12) and record what you find |
| calendar.federal_holidays_law | true | flag | settled | 5 U.S.C. 6103(a) on uscode.house.gov. Quote the list of holidays. The engine's holiday list cites this rule |

Also check whether the blocked regime changes any of these, as you did for the OPT filing window, and give a changed value a row under each regime.

## Derived, not stored (L-engine)

The number of STEM validation reports is `stem.extension_months` divided by `stem.validation_interval_months`. It is computed, never written down.

## Duly's own choices (founder)

contracts/product_settings.yaml holds them. The engine reads them by id and lists the ids it used in each item's `inputs` under the key `duly_settings`.

## The test pack (L-tests)

Add the five new ids to tests/support/f1_pack.py with the assumed values, add tests that the engine takes each of these numbers from the pack and the settings file (change the value in the test pack or a test settings file, and the result changes with it), and add the same to the hidden tests. `compute_f1` gains a keyword argument `settings: dict[str, Any] | None = None`; None means the shipped file.

## The engine (L-engine)

Replace every such number in engine/f1.py with a lookup. Every computed item that uses a new rule names it in `rule_ids`. `employment.periods_not_reported` names `opt.report_employer_within_days`. The federal holiday list in engine/dates.py cites `calendar.federal_holidays_law` in a comment, and each business-day item names it in `rule_ids`.

Done when `uv run python -m tools.gates.engine_literals` passes with the engine tests, the hidden tests, and mypy.
