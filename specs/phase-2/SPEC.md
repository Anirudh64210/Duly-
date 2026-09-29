# Phase 2 SPEC: F-1 rules, the engine, and a plain screen

Built by lane agents in parallel worktrees. This file is the contract between them. If it is unclear, stop and write the question in your progress log. Do not guess.

## Goal

The founder enters the dates from their own documents on one plain screen and sees every F-1 date and count Duly can compute, each with its working, its rule, the rule's source, and the rule's legal status.

Nothing is stored. No model is involved anywhere in this phase.

## Rounds

| Round | Lanes, in parallel | Starts from |
|---|---|---|
| A | L-tests, L-content | phase-2 |
| B | L-engine | phase-2 with round A merged |
| C | L-api, L-web | phase-2 with round B merged |
| D | reviewer (read only), then skill-curator | phase-2 with round C merged |

## Contracts (already on this branch; lanes may not change them)

- contracts/case_f1.schema.json : what the user enters
- contracts/engine_output.schema.json : what the engine returns
- contracts/rulepack.schema.json : a rule, with source, quote, and saved copy
- contracts/openapi.yaml : POST /v1/compute/f1

## The rules (L-content)

Write rulepacks/f1-us/v2026.09/parameters.yaml and save copies of the sources under rulepacks/f1-us/v2026.09/sources/.

The values below come from research. They are claims to check, not facts to copy. For each one, find the exact words in the primary source, save the source, and record the quote. If the source says something different, record what the source says and write the difference in your progress log. If you cannot find the words, leave the rule out and say so.

Fetch the regulation as it stood on 2026-09-14, the last day before the fixed admission period rule took effect on paper. The eCFR endpoint needs compression:

```
curl --compressed -sS -H 'Accept: application/xml' \
  "https://www.ecfr.gov/api/versioner/v1/full/2026-09-14/title-8.xml?part=214&section=214.2"
```

Fetch the 2026-09-15 version too, for the rules under the blocked regime.

| id | value | unit | status | regime | where to look |
|---|---|---|---|---|---|
| opt.apply_before_days | 90 | days | settled | | 8 CFR 214.2(f)(11)(i)(B) |
| opt.apply_after_days | 60 | days | settled | | 8 CFR 214.2(f)(11)(i)(B) |
| opt.file_within_days_of_recommendation | 30 | days | settled | | 8 CFR 214.2(f)(11)(i)(B) |
| opt.max_months | 12 | months | settled | | 8 CFR 214.2(f)(10) or (f)(11) |
| opt.complete_within_months | 14 | months | settled | | 8 CFR 214.2(f)(10)(ii)(A)(3) |
| opt.unemployment_limit_days | 90 | days | settled | | 8 CFR 214.2(f)(10)(ii)(E) |
| stem.unemployment_limit_days | 150 | days | settled | | 8 CFR 214.2(f)(10)(ii)(E) |
| stem.extension_months | 24 | months | settled | | 8 CFR 214.2(f)(10)(ii)(C) |
| stem.apply_before_expiry_days | 90 | days | settled | | 8 CFR 214.2(f)(11)(i)(C) |
| stem.file_within_days_of_recommendation | 60 | days | settled | | 8 CFR 214.2(f)(11)(i)(C) |
| stem.min_hours_per_week | 20 | hours_per_week | settled | | 8 CFR 214.2(f)(10)(ii)(C) |
| stem.validation_interval_months | 6 | months | settled | | 8 CFR 214.2(f)(12)(ii) |
| stem.validation_due_business_days | 10 | business_days | settled | | 8 CFR 214.2(f)(12)(ii) |
| stem.evaluation_due_days | 10 | days | settled | | 8 CFR 214.2(f)(10)(ii)(C)(9) |
| stem.new_plan_due_days | 10 | days | settled | | 8 CFR 214.2(f)(10)(ii)(C) |
| cpt.full_time_months_bar | 12 | months | settled | | 8 CFR 214.2(f)(10)(i) |
| grace.after_completion_days | 60 | days | litigated | ds_2012 | 8 CFR 214.2(f)(5)(iv), 2026-09-14 text |
| grace.after_completion_days | 30 | days | litigated | fixed_admission_2026 | 8 CFR 214.2(f)(5), 2026-09-15 text |
| opt.min_hours_per_week | 20 | hours_per_week | guidance | | SEVP guidance on studyinthestates.dhs.gov or ice.gov |
| capgap.end_month_day | 04-01 | date | settled | | 8 CFR 214.2(f)(5)(vi) |

Regimes:

| id | legal_status | operative | source |
|---|---|---|---|
| ds_2012 | effective | true | the 2026-09-14 text |
| fixed_admission_2026 | enjoined | false | the Federal Register final rule, FR Doc. 2026-14439. Look for the court order on courtlistener.com. If you cannot reach a primary source for the order, record the rule as final with operative false, and write in your progress log that the order still needs a primary source |

Every source needs citation, url, checked_on, quote, snapshot, and snapshot_sha256. Done when `uv run python -m tools.sources.verify rulepacks` passes and the pack loads.

## The engine (L-engine)

### Files

- engine/dates.py : `add_months(d, n)` clamps to the last day of the month. `add_business_days(d, n)` skips Saturdays, Sundays, and the federal holidays of 5 U.S.C. 6103 on their observed dates. `federal_holidays(year)`.
- engine/f1.py : `F1Case` and friends as frozen dataclasses mirroring the case contract, `parse_case(raw: dict) -> F1Case`, and `compute_f1(case: F1Case, pack: Rulepack, clock: Clock) -> dict[str, Any]` returning the engine output contract.
- engine/rulepack.py : add `Rulepack.value(id, on, regime=None)`, which returns the parameter in force on a date under the operative regime, or under the named one. Add `Rulepack.rules_checked_on`, the oldest checked_on among its parameters, or None for an empty pack. Refuse a parameter with status settled, guidance, litigated, or proposed that has no quote.

### Rules of the house

- Every number comes from the pack by id. No rule value is written in engine code.
- Every computed item names the rule ids it used and the inputs it used.
- An item whose input is missing has value null, and the input is named in the verdict's missing inputs. Never guess a date.
- An item's status is the weakest among its rules, in this order from strongest: settled, guidance, school, litigated, proposed.
- Where a rule has a second regime, the item carries `alternates` with the value under each regime that is not operative.
- The engine never says what a number means for the user.

### Computed items

`today` is `clock.today()`. `final_end` is the latest of program_end_date, opt.ead_end, and stem.ead_end among those present.

| id | formula | unit |
|---|---|---|
| opt.apply_window_opens | program_end_date minus opt.apply_before_days | date |
| opt.apply_window_closes | program_end_date plus opt.apply_after_days | date |
| opt.file_by | opt.dso_recommendation_date plus opt.file_within_days_of_recommendation | date |
| opt.latest_start | program_end_date plus opt.apply_after_days | date |
| opt.complete_by | add_months(program_end_date, opt.complete_within_months) | date |
| unemployment.limit | stem.unemployment_limit_days if stem.ead_start is present and today is on or after it, else opt.unemployment_limit_days | days |
| unemployment.days_used | see below | days |
| unemployment.days_remaining | limit minus days_used; may be negative | days |
| employment.days_under_hours | see below | days |
| employment.periods_not_reported | count of employment periods with employer_reported false | count |
| grace.ends | final_end plus grace.after_completion_days, with the alternate regime in alternates | date |
| stem.apply_window_opens | opt.ead_end minus stem.apply_before_expiry_days | date |
| stem.apply_window_closes | opt.ead_end | date |
| stem.file_by | stem.dso_recommendation_date plus stem.file_within_days_of_recommendation | date |
| stem.validation_N_due, N from 1 to 4 | add_business_days(add_months(stem.ead_start, 6 times N), stem.validation_due_business_days) | date |
| stem.evaluation_12_month_due | add_months(stem.ead_start, 12) plus stem.evaluation_due_days | date |
| stem.final_evaluation_due | stem.ead_end plus stem.evaluation_due_days | date |
| cpt.full_time_days_used | cpt_full_time_days, as entered | days |
| capgap.ends | see below | date |

Items for a part of the case that is absent (opt null, stem null, cap_gap null) are left out, not returned as null.

Counting days. The counting window runs from opt.ead_start through the earlier of today and the last EAD end date, both included. A day is employed if an employment period with hours_per_week at or above the threshold covers it. The threshold is stem.min_hours_per_week on days on or after stem.ead_start, and opt.min_hours_per_week before. An open period (end null) runs through today. `unemployment.days_used` counts the days in the window covered by no employment period at all. `employment.days_under_hours` counts the days covered only by periods under the threshold. These two never overlap, and days under hours are not added to days used: whether they count is a question for the DSO.

Cap-gap. If status is pending or approved and change_of_status is true, `capgap.ends` is the earlier of requested_start and April 1 of the fiscal year, where the fiscal year's April 1 falls in the year after requested_start's year when requested_start is in October, November, or December, and in the same year otherwise. In every other case `capgap.ends` is null.

### Verdict inputs

| Field | Rule |
|---|---|
| documents_count | from the case |
| missing_inputs | opt present with ead_start or ead_end null; stem present with ead_start or ead_end null |
| conflicting_inputs | any end date before its start date; opt.ead_start before program_end_date minus 1 year; stem.ead_start on or before opt.ead_end when both present is a conflict named stem_start |
| rules_checked_on | pack.rules_checked_on |
| depends_on_litigated_rule | true when today is after final_end, because the two regimes then give different answers |
| judgement_items | hours_under_threshold when employment.days_under_hours is above 0; unemployment_at_or_over_limit when days_remaining is 0 or less; cpt_full_time_at_or_over_bar when cpt_full_time_days is 365 or more; cap_gap_petition_not_active when cap_gap is present and capgap.ends is null |
| open_items | report_employer when employment.periods_not_reported is above 0; any dated item whose id ends in _due, file_by, or window_closes that falls from today through today plus 14 days, named by its id |

Then call `engine.verdict.decide`.

## The api (L-api)

POST /v1/compute/f1. Validate the body against contracts/case_f1.schema.json with jsonschema; on failure return 422 with the first problem in plain words. Load the f1 pack, call `compute_f1` with the injected clock, return the result. The response must validate against contracts/engine_output.schema.json. Store nothing. Log nothing from the body.

## The screen (L-web)

One route, plain, in Duly tokens. No WorkBook tokens.

- A form for every field in the case contract. Dates as date inputs. Employment periods can be added and removed. OPT, STEM, and cap-gap sections can be switched on and off.
- "Compute" posts to /api/v1/compute/f1.
- The result shows the verdict first, with its scope line, then the computed items in groups: OPT, Unemployment, STEM OPT, Grace period, Cap-gap, CPT.
- Each item is one row: a plain name, the value, and a status tag when the status is not settled. Clicking the row shows the working: the inputs used, each rule with its value, citation, quote, link, and the date it was checked.
- An item with alternates shows both values side by side, each with its regime's legal status in plain words, for example "in effect" and "blocked by a court".
- Parse the response with zod. Generate types from the OpenAPI file.
- Copy follows BOUNDARY.md and the copy linter. Item names state what the item is, never what it means. No reassurance, no urgency. Footer on every view: "Records and computations, not legal advice. Confirm with your DSO or an attorney."
- Tests live beside the code in web/src.

## The tests (L-tests)

Write from this SPEC and the contracts only. You will not see the implementation; it does not exist yet. Import from the module paths named above.

- tests/unit/engine/test_dates.py : add_months clamping; business days across weekends and observed holidays; properties.
- tests/unit/engine/test_f1.py : golden cases for every computed item, the day before, the day of, and the day after each boundary; property tests for counting (used plus under-hours plus employed equals window length; never negative; adding an employment period never raises days used); every item names rule ids that exist in the pack; no engine value appears that the pack and the inputs cannot produce.
- tests/unit/engine/test_rulepack_values.py : value lookup by date and regime; a rule without a quote is refused.
- tests/unit/api/test_compute.py : good case, 422 on a bad case, response validates against the output contract, nothing from the body is logged.
- tests/holdout/ : a second set of golden cases and properties that implementation lanes never see.
- Build test packs in code with the SPEC values, so the tests do not depend on L-content.
- Use FixedClock everywhere.

## Done for the phase

1. `make test` is green on phase-2 with every lane merged.
2. `uv run pytest tests/holdout -q` is green.
3. `uv run python -m tools.sources.verify rulepacks` is green.
4. The reviewer approves.
5. The founder enters their own dates at http://localhost:5173 and sees the results.
