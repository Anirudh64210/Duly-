# Review: product round 1

Reviewer: L-review, run l-review-6768445363, 2026-09-29. Fresh context. No code was edited.

Scope: `git diff main...HEAD` for product round 1 (commit 41a8db5), against specs/product-1/SPEC.md, SPEC-resolutions.md, PRINCIPLES.md, BOUNDARY.md and CLAUDE.md. Main is far behind this branch, so the diff also holds phase 2 and the factory. I read engine/f1.py (facts, answers, verdict, next step), api/main.py, the case contract, and the screen's labels.ts. tests/holdout/ was run with `--tb=no` and not read.

Every input below was sent through `POST /v1/compute/f1` with TestClient and a FixedClock at 2026-09-29 18:00 UTC, time zone America/Los_Angeles, so today is 2026-09-29. Unless a line says otherwise each case has `degree_level: master`, `documents_count: 2`, `cpt_full_time_days: 0`, and one open period at 40 hours, reported, from the OPT card start.

## What was run

| Check | Result |
|---|---|
| `uv run pytest tests/unit/engine tests/unit/api tests/unit/assistant tests/unit/support -q` | pass, every test |
| `uv run pytest tests/holdout -q --tb=no` | pass, every test |
| web vitest, from a scratch copy under TMPDIR | 6 files, 183 tests passed |
| `python -m tools.sources.verify rulepacks` | "sources: 4 pack(s) checked, every quote found" |
| `python -m tools.gates.engine_literals` | "engine literals: every number has a source" |
| copy lint | "copy lint: clean" |

Not run: `make test` as a whole, gates 3 and 6 (the base would be main, which is behind), the stack, a browser. Screen findings are read from code and its tests.

## Findings 1 to 6 of reviews/phase-2-second.md, run again

| # | Input | What happens now | State |
|---|---|---|---|
| 1a | OPT 2025-11-01 to 2026-10-31, `i765_filed_date` 2030-01-01 | `cannot_tell`, `conflict:opt.i765_filed_date.after_today`, `conflict:opt.i765_filed_date.after_card`, two questions | Closed |
| 1b | Same OPT, petition filed 2027-03-01, requested start 2026-10-01, approved | `cannot_tell`, `after_today` and `after_start` | Closed |
| 1c | Same OPT, petition 2020-01-01, start 2020-10-01 | `cannot_tell`, `cap_gap.requested_start.before_training` | Closed |
| 1d | OPT 2023-11-01 to 2024-10-31, STEM 2024-11-01 to 2029-10-31 | `cannot_tell`, `stem.card_longer_than_rule` | Closed |
| 1e | OPT 2025-11-01 to 2028-10-31 | `cannot_tell`, `opt.card_longer_than_rule` | Closed |
| 1f | OPT to 2025-10-31, STEM from 2026-03-01, one open period from 2024-11-01 | `cannot_tell`, `stem.gap_after_opt` and `employment.period_outside_cards` | Closed |
| 1f' | OPT 2024-11-01 to 2025-06-30, STEM 2025-10-01 to 2027-09-30, work to 2025-06-30 and from 2025-10-01 | `cannot_tell`, `stem.gap_after_opt`, the three unemployment items null. With yes and the question's `about`: `talk_to_dso`, reason `stem.gap_after_opt`, days used 0 (the gap is outside the counting window). With no: `cannot_tell` | Closed |
| 4 | Nothing but the required fields, no `cpt_full_time_days` | `cannot_tell`, `unconfirmed:nothing_more_to_record`, `unconfirmed:full_time_cpt_used` | Closed |
| 5 | OPT 2026-07-10 to 2027-07-09, no employment, yes to `no_employment_to_record` | `on` 2026-07-11 or 1950-01-01: question open again. `on` 2026-09-30 or 2099-12-31: 422 "an answer here is dated after today". `on` 2026-09-29 with no `about`: open. `on` 2026-09-29 with the right `about`: `no_open_items` | Closed |
| 5b | The same answer, `about.opt.ead_start` 2026-07-10, card changed to 2026-07-01 to 2027-06-30 | `cannot_tell`, question open again | Closed |
| 6 | Program end 2026-08-10, filed 2026-07-05, EAD 2026-09-01 to 2027-08-31 | `no_open_items`. The filing window is no longer an open item | Closed |

A yes to a conflict whose `about` holds other dates than those entered (OPT to 2028-10-31, answer about 2027-10-31) keeps the question open. Missing values: OPT with every date null, OPT with no end, STEM with no end each return `cannot_tell` with `missing:`. No case I sent with a missing, stale or conflicting value returned `no_open_items`, except those in finding 1 below.

## Findings

### 1. Blocking. Resolution 11 is not built: a filing dated before its recommendation, or after its window, gets the quiet verdict

- File: engine/f1.py, `_facts` (line 785 onward). None of `opt.i765_filed_date.before_recommendation`, `stem.i765_filed_date.before_recommendation`, `opt.i765_filed_date.after_file_by`, `stem.i765_filed_date.after_file_by` appears anywhere in engine/, api/, web/src or tests/ (grep). The last change to engine/f1.py (b68eb92, 06:43) is older than the resolution (4d2116b, 07:40).
- Inputs and what happens, each 200 with `{"state": "no_open_items", "reasons": []}` and no question:

| Input | Hand check against the pack's rule |
|---|---|
| Program end 2023-09-15. OPT: rec 2023-09-01, filed 2023-09-10, EAD 2023-11-01 to 2024-10-31. STEM: rec 2024-09-20, filed 2024-09-10, EAD 2024-11-01 to 2026-10-31 | STEM filing ten days before the STEM recommendation |
| The same, STEM rec 2024-06-01, filed 2024-09-10 | 101 days after the recommendation; `stem.file_within_days_of_recommendation` is 60 (8 CFR 214.2(f)(11)(i)(C), quote found in the saved snapshot) |
| Program end 2025-09-15. OPT: rec 2025-09-20, filed 2025-09-10, EAD 2025-11-01 to 2026-10-31 | OPT filing ten days before the OPT recommendation |
| The same, OPT rec 2025-07-01, filed 2025-09-10 | 71 days after; `opt.file_within_days_of_recommendation` is 30 (8 CFR 214.2(f)(11)(i)(B)(2), quote found) |

- Rule: CLAUDE.md, "A verdict never falls back to the quiet state ... conflicting ... means cannot_tell", and SPEC-resolutions point 11, which makes each of these a conflict with a question. This is the check the mission names: a STEM application filed before its DSO recommendation date is not caught.
- Tests: no test in tests/unit or tests/holdout sends any of these inputs, so the suites stay green.
- Asked for: the engine lane builds the four rows as every row of section 1 works, and L-tests adds, for each, the input that raises it, the input on the recommendation day or the last day of the window that does not, and the yes that gives `talk_to_dso`.

### 2. Note. The screen, not the pack, holds the words for a legal status

web/src/lib/labels.ts line 146, `LEGAL_STATUS` maps `enjoined` to "blocked by a court". SPEC section 7 says the words for the legal status come from the pack. The pack and the output carry only the code, so the screen can do no better without a contract field. The code comes from the pack, and no status is written on the screen's own authority. For the founder.

### 3. Note. `upcoming` holds the grace end twice

OPT-only case above: `grace.ends` 2026-12-30 and `next.grace.ends` 2026-12-30 are both in `upcoming`. The SPEC asks for both ids, so this follows it; the list on the screen shows the same date twice.

## The standing checks

- A conclusion about a person or a number from a model: none. No model is called. The DSO question built in labels.ts `dsoQuestion` asks and states no conclusion.
- Time outside an injected clock: none found in the round's code. Answers dated after today are refused with the case's clock (resolution 8).
- User data to an outside model: none.
- Quiet verdict on a gap or a conflict: yes, finding 1.
- Duly's reading shown as the law's words: the full-time CPT line now reads "at or over Duly's count of one year in days" (labels.ts line 256). `upcoming` entries carry `reading`, and the DSO question marks them.
- A rule with no primary source: none; every quote found.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 1 | Wrong on four inputs that SPEC-resolutions point 11 names (finding 1). Sections 1 to 6 hold on every other input run |
| sourced | 4 | Every quote found, literals gate passes, the resolution 11 quotes match the pack. The legal status words live on the screen (note 2) |
| never_assumes | 2 | A filing before its recommendation, or after its window, gets `no_open_items` and no question |
| inside_the_boundary | 4 | Copy lint clean, Duly's count named as Duly's, the DSO question asks only. Not seen in a browser |
| secure | 4 | Answers after today refused with 422 in plain words; far dates and NaN closed in phase 2 and the contract still bounds them. No new probe broke it; not tried beyond these |
| tested | 2 | No test sends any input of resolution 11; the suites are green while the resolution is missing |

## Decision

Findings 1 to 6 of the second phase 2 review are closed, each on its own input. Resolution 11 is not built, and four records that contradict the regulation's own window get "No open items". That is a hard rule broken and a line below the minimum.

VETO
