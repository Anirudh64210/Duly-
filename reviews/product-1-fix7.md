# Review: product round 1, fix 7

Reviewer: L-review, run l-review-5ea60f3f51, 2026-09-29. I started with no context and edited no code.

Scope: every merge since reviews/product-1-fix6.md (d9442be..07f2b6a): the eight rewritten plain texts in the f1 pack (point 62), the freeze tool tools/sources/plain_changes.py, engine/f1.py `whole_shown` (point 63), web drafts.ts (point 64), and the tests of the round. Checked against specs/product-1/SPEC-resolutions.md points 62 to 64, specs/plain-1/SPEC.md, PRINCIPLES.md, BOUNDARY.md and CLAUDE.md. The commit reviewed is 07f2b6a30329b764b2c2651ba18aabfb24b10b2e.

Every case below went through `POST /v1/compute/f1` with TestClient and a FixedClock at 18:00 UTC, time zone America/Los_Angeles, today 2026-09-29. Each case has `degree_level: master`, `documents_count: 2` and `cpt_full_time_days: 0`, and each period is 40 hours a week and reported, unless a line says otherwise. "Answered in full" means each question was answered yes, with its own `about`, dated the clock's day, until none was left; `.earlier_at_this_level` and `.new_employer` were answered no. The probe scripts are under TMPDIR and were not committed.

## What was run

| Check | Result |
|---|---|
| `uv run pytest tests/unit/engine tests/unit/api tests/unit/assistant tests/unit/support -q` | exit 0 |
| `uv run pytest tests/holdout -q` | exit 0 |
| `uv run pytest tests/unit/tools/test_plain.py tests/unit/tools/test_plain_changes.py -q` | 17 passed |
| `python -m tools.sources.plain_changes d9442be` | 8 rows changed, exactly the eight point 62 names |
| the same with `--allow` and the eight rows | "8 row(s) changed, all allowed", exit 0 |
| `python -m tools.sources.plain rulepacks --require f1` | "every plain text is general, calm, readable and grounded" |
| `python -m tools.sources.verify rulepacks` | "4 pack(s) checked, every quote found" |
| `python -m tools.gates.engine_literals` | "every number has a source" |
| `python tools/copy_lint/lint.py` | "copy lint: clean" |
| mypy engine/f1.py tools/sources/plain_changes.py, ruff check and format --check | clean |
| web vitest on a scratch copy of HEAD under TMPDIR (`--configLoader runner`) | 12 files, 302 tests passed |

Not run: `make test` as a whole, gates 3 and 6, the stack, a browser. I printed drafts by calling `dsoDraft` from a scratch vitest file in the TMPDIR copy, on api outputs.

## No other plain text changed

`python -m tools.sources.plain_changes d9442be` prints these eight and no other: `capgap.end_month_day#2008-04-08`, `capgap.end_month_day#2025-01-17`, `opt.apply_after_days@ds_2012#2008-04-08`, `stem.extension_months#2016-05-10`, `stem.requires.dhs_approved_degree#2016-05-10`, `stem.requires.employer_reporting#2016-05-10`, `stem.requires.previously_obtained_degree#2016-05-10`, `stem.requires.self_evaluation#2016-05-10`. No two rows share an id, regime and start date, so no change can hide behind a shared key. The f1 pack is the only pack that holds plain words today; the tool reads only that pack. `git diff d9442be..HEAD -- rulepacks/` touches only the f1 parameters, its CHANGELOG and PROGRESS.md. The notes of two rows changed (the 2008 cap-gap row and employer reporting); notes are not plain words, and both new sentences are true of the quote.

## The eight rewritten texts beside their quotes and notes

- `opt.apply_after_days` (60): "Filing may begin 90 days before the program end date." Matches "up to 90 days prior to his or her program end date". Passes.
- `stem.extension_months`: now three sentences. "It is for the first degree that meets the STEM terms and for which the student has completed all course requirements, apart from a thesis or its equivalent." "First" governs both clauses, as "first qualifying degree for which" does. Grade 6.4, was 8.9. Passes.
- `capgap.end_month_day` (2008-04-08): keeps "the employment authorization the rule names" and says "under the cap, as Duly reads it". The reading tag closes the sentence, so it can be read as covering "meet the terms" too; that claims less, not more. Passes.
- `capgap.end_month_day` (2025-01-17): keeps the limit, keeps "approved petition", and marks "under the cap" as Duly's reading. But it closes "If the approved petition starts first, they end then." "They" is the duration of status and the employment authorization. The quote says the automatic extension runs "until April 1 ... or until the validity start date of the approved petition, whichever is earlier". It does not say that status and authorization end on that day; it says they stop being extended on their own. The first sentence has it right ("last on their own until April 1"). Finding 1.
- `stem.requires.dhs_approved_degree`: "a person the Secretary names", plain_terms empty. Passes.
- `stem.requires.previously_obtained_degree`: point 62 says the two long texts "are split into short sentences, the ten years ending at the DSO's recommendation". This one is still one sentence, now 59 words (it was 51), at grade 9.0, the gate's limit. It also says the institution must be accredited and SEVP-certified "when the DSO recommends it". The quote says "at the time the student's DSO recommends the student for the 24-month OPT extension". "It" can only point back to the degree or the institution, so the text says the DSO recommends the degree. Finding 1.
- `stem.requires.employer_reporting`: "tell the DSO if the student leaves or the job is ended before the authorized period of OPT ends". The time limit now sits with the leaving, as the quote and fix 6 asked. Ends "This is Duly's reading, not the rule's exact words." Passes.
- `stem.requires.self_evaluation`: ends with the same reading sentence. Passes.

The notes of fix 6 on the regime `fixed_admission_2026` ("visitors"), the paused grace row, and the plain_terms `resources` and `individualized` stand, as frozen rows no review named for change.

## The findings of reviews/product-1-fix6.md, sent again

- Finding 1 (three texts say more or other). The cap-gap case: program end 2025-05-15, OPT card 2025-06-01 to 2026-05-31 (rec 2025-04-01, filed 2025-04-10), period open from 2025-06-01, cap-gap filed 2026-04-01 for 2026-10-01, pending, change of status, answered in full. It gives talk_to_dso `grace_with_cap_gap`, and `rules` carries `capgap.end_month_day` (2025 text), `stem.requires.employer_reporting`, `stem.requires.self_evaluation`, `stem.requires.dhs_approved_degree`, `stem.requires.previously_obtained_degree` and `opt.apply_after_days`. The 2024 petition case (program end 2023-05-15, card 2023-06-01 to 2024-05-31, petition filed 2024-04-02 for 2024-10-01, pending) carries the 2008 text. The limit, "approved", the reading mark and the reporting condition are all in place. Closed as asked, but the 2025 row now ends on a new overstatement (finding 1).
- Finding 2 (five texts not plain, two readings not said to be). The two reading rows, "designee" and "that date" are closed. `stem.extension_months` is split. `stem.requires.previously_obtained_degree` is not split and is now longer (finding 1).
- Finding 3 (the step-back draft leaves out the period). STEM case: program end 2025-02-15, OPT card 2025-03-13 to 2026-03-12 (rec 2025-01-20, filed 2025-01-25), STEM card 2026-03-13 to 2028-03-12 (rec 2026-01-10, filed 2026-01-15), period open from 2025-03-13, answered in full. The api gives talk_to_dso `rule_not_in_force_on_event_day`, and the draft now carries "I have worked since Mar 13, 2025, at 40 hours a week." The 2015 case (program end 2015-05-15, card 2015-06-01 to 2016-05-31, period over the card not reported) gives "I worked from Jun 1, 2015 to May 31, 2016, at 40 hours a week." Hand check: the row for the count starts 2025-05-19, and 2025-03-13 and 2015-06-01 are both before it, so the period is behind the reason. Closed.
- Finding 4 (a pack without the interval or the extension length is quiet). The shipped pack less one row, served through `get_f1_pack`. The finding 3 STEM case already steps back for point 60, so I used a case it does not touch: program end 2025-06-15, OPT card 2025-07-01 to 2026-06-30 (rec 2025-05-20, filed 2025-05-25), STEM card 2026-07-01 to 2028-06-30 (rec 2026-04-10, filed 2026-04-15), period open from 2025-07-01, answered in full. On the shipped pack it gives no_open_items with validations on 2027-01-15, 2027-07-15 and 2028-01-14. That is the six-month dates 2027-01-01, 2027-07-01 and 2028-01-01, each moved to the tenth business day counting the day itself, past the holidays of 2027-01-01 and 2027-07-05. Less `stem.validation_interval_months`: talk_to_dso `rule_not_in_force_on_event_day`, no validation listed. Less `stem.extension_months`: the same. Less `stem.evaluation_interval_months`: the same step back, with the three validations still listed. An OPT-only case less the interval gives the same verdict as on the shipped pack, so the change does not reach cases with no STEM card. Closed.

## Points 62 to 64

| Point | Input | What happens |
|---|---|---|
| 62 | plain_changes against d9442be | the eight named rows and no other |
| 62 | the eight texts, read beside quote and note | six pass; two do not (finding 1) |
| 63 | the 2025-06-15 STEM case, pack less the interval, the extension or both | step back, never quiet |
| 64 | the finding 3 STEM case and the 2015 case | the draft states the periods as entered |
| 64 | the cap-gap case (no period behind the reason) | no employment line, as before |

## Tests changed in this round

- tests/unit/engine/test_f1_fix6.py: `test_point_59_a_pack_without_the_interval_lists_no_validation_report` gains `assert out["verdict"]["state"] != QUIET`, as fix 6 finding 4 asked. It tightens and loosens nothing.
- tests/unit/engine/test_f1_fix7.py and tests/holdout/test_holdout_fix7.py cover point 63: each rule missing, both missing, the row beginning after the card, and any clock.
- web/src/lib/drafts.test.ts covers point 64 on both sides: with the count null the periods are in, and with it counted they are not.
- tests/unit/tools/test_plain_changes.py covers the freeze tool.

No test reads the meaning of a plain text, so none would fail on finding 1.

## Findings

### 1. Blocking. Two of the eight rewritten texts say other than their quotes, and one is not split as point 62 says

- File: rulepacks/f1-us/v2026.09/parameters.yaml line 661 (`stem.requires.previously_obtained_degree`) and line 453 (`capgap.end_month_day`, 2025-01-17).
- Input: the cap-gap case above, answered in full, today 2026-09-29: talk_to_dso `grace_with_cap_gap`, and its `rules` carries both rows with these texts.
- What happens: line 661 is one 59-word sentence at the gate's grade limit of 9.0, not the short sentences point 62 names. Its "when the DSO recommends it" makes the degree or the institution what the DSO recommends, where the quote says the DSO "recommends the student for the 24-month OPT extension". Line 453 ends "If the approved petition starts first, they end then". That says the duration of status and the employment authorization end on the petition's start date. The quote says only that the automatic extension runs until that date, if it is earlier than April 1.
- Rule: point 62, "the two long texts are split into short sentences, the ten years ending at the DSO's recommendation". Point 58 and plain-1 section 1: a plain text says no more and no other than its quote. The mission says to veto any text that drifts in meaning or is not plain.
- Asked for: L-content splits line 661 into short sentences and names whom the DSO recommends. For example: "This is for a 24-month OPT extension based on a degree earned before the one for post-completion OPT. That older degree must be from a U.S. educational institution that is accredited and SEVP-certified when the DSO recommends the student for the extension. The degree must be in a category on the STEM list at that time, and it must have been granted in the 10 years before that day." On line 453, say "they last on their own only until then" in place of "they end then". Only these two rows change (point 62).

### 2. Note. The step-back draft does not say that the period was not reported

- File: web/src/lib/drafts.ts line 53 (`factsOn`, "employment").
- Input: the 2015 case above (period 2015-06-01 to 2016-05-31, `employer_reported: false`).
- What happens: the draft says "I worked from Jun 1, 2015 to May 31, 2016, at 40 hours a week." The count behind the reason is of periods not reported, and the draft does not say this one was not reported. Point 64 asks for the dates, and the dates are there. No draft states whether a period was reported, so this is not new.

### 3. Note. The freeze tool takes every word after `--allow` as a row

- File: tools/sources/plain_changes.py line 43.
- Input: `python -m tools.sources.plain_changes --allow capgap.end_month_day#2025-01-17 d9442be`.
- What happens: `d9442be` is taken as an allowed row, and the base falls back to `main`. That fails closed when main is behind (more rows show as changed), so it cannot let a change through. The plan's done command writes the base first. The tool also reads only the f1 pack, which is the only pack with plain words today.

## The standing checks

- A conclusion about a person: none. No draft states a status.
- A number or date from a model: none. No model is called.
- Time read outside an injected clock: none. The api probes used an injected FixedClock.
- User data to an outside model: none.
- A quiet verdict on a gap or a conflict: none found. Point 63 closes the last one known (fix 6 finding 4).
- A fact assumed and not asked: none found.
- Duly's reading shown as the law's words: none. The 2008 cap-gap row and the two reading rows now say it. Finding 1 is a statement the quote does not make, not a reading passed off as the quote.
- A rule with no primary source: none. Every quote is found, and the numbers have sources.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 2 | Points 63 and 64 do what they say on their inputs and beside them: each rule missing, both missing, the evaluation interval missing, an OPT-only case, and a draft with the count known. Point 62 is not met on one of the eight texts it names: `stem.requires.previously_obtained_degree` was to be split into short sentences and is one longer sentence (finding 1) |
| sourced | 2 | Every quote is found, the freeze tool shows no other text moved, and six of the eight rewrites say what their quotes say. Two texts shown today on the cap-gap case say other than their quotes: whom the DSO recommends, and that status and authorization end on the petition's start date (finding 1) |
| never_assumes | 5 | A pack without the interval, the extension length or the evaluation interval steps back through the api. Every gap sent asks or steps back |
| inside_the_boundary | 5 | The drafts printed from api outputs ask and state only what was entered, with no status, no computed date and no Duly. No plain text speaks to "you" or instructs |
| secure | 5 | No 500 on any case or pack sent, including packs missing rows. The freeze tool fails closed on a misplaced base (finding 3) |
| tested | 4 | The new tests fail if point 63 or 64 is undone. They cover both sides of the draft change, each missing rule and any clock. The freeze tool is tested and holds the other 47 texts. No test can catch finding 1, which is a question of meaning left to review by design |

## Decision

Fix 6's findings 3 and 4 are closed. Point 63 holds for every missing row I tried, point 64 puts the period in the draft, and the freeze tool shows that only the eight named texts changed. Six of those eight now say what their quotes say. The other two do not. The older-degree text is still one long sentence and names the wrong thing as recommended. The 2025 cap-gap text says status and authorization end on a day where the rule says only that the automatic extension stops. Correct and sourced are 2, below the minimum of 4, and the mean is 3.83, below 4.3.

VETO
