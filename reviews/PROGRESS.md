# L-review progress

## 2026-09-28, iteration 1
- Read SPEC.md, SPEC-sourcing.md, CLAUDE.md, BOUNDARY.md, DECISIONS.md, .claude/agents/reviewer.md.
- Read engine/f1.py, engine/dates.py, engine/rulepack.py, engine/verdict.py, api/main.py, api/case_f1.py, parameters.yaml.
- tests/holdout/ not read. It is run only with --tb=no so no test body is printed.
- Ran: pytest tests/unit (pass), pytest tests/holdout --tb=no (pass), tools.sources.verify ("4 pack(s) checked, every quote found"), tools.gates.engine_literals (FAIL, 6 numbers: f1.py lines 22, 23, 24, 25, 26, 28), mypy, ruff, copy lint (pass), npm test (72 web, 4 ops pass).
- diff_policy against main fails here because the branch holds every lane. Expected for a review worktree.
- Computed one full case with the real pack and FixedClock 2026-09-28 and checked 13 values by hand against the saved eCFR copies. All match.
- Probed POST /v1/compute/f1 with TestClient. Found: stem without opt gives no_open_items; NaN hours gives no_open_items; year 9999 and year 0001 dates give 500; a wide window with 2000 periods took 49 s on the event loop; the day turns over at midnight UTC.
- Wrote reviews/phase-2.md. Decision: VETO.
- Done command: grep -Eq "^(APPROVE|VETO)$" reviews/phase-2.md

## Requests for files I do not own
- specs/phase-2/SPEC.md: add to missing_inputs the case of stem present with opt absent.
- contracts/case_f1.schema.json: bounds on dates, maxItems on employment. Contract change, lands first and alone.
- contracts/engine_output.schema.json: carry the operative regime and its legal status, so the screen does not write "in effect" on its own.
- rulepacks: a rule for the latest OPT start date, 8 CFR 214.2(f)(11)(i)(D), under both regimes.
- tests/: cases for stem without opt, NaN and Infinity in the body, far dates returning 422, and a property that no regime alternate falls on or before final_end.
- Founder decision: which calendar "today" belongs to (UTC or the user's).

## Lesson
- Failure: a probe script under /tmp could not import engine ("ModuleNotFoundError: No module named 'engine'").
- Fix: run it from the worktree root with PYTHONPATH=. uv run python <script>.
- Evidence: the same script printed the computed items once PYTHONPATH was set.

## Lesson
- Failure: green unit and hidden tests sat beside four inputs that break the verdict or the service.
- Fix: a reviewer should send odd bodies through TestClient (absent parent block, NaN, year 9999, very wide windows), not only read the diff.
- Evidence: reviews/phase-2.md findings 1, 2 and 4, each with its input and the response.

## 2026-09-29, iteration 2 (second review)
- Read PRINCIPLES.md, reviews/phase-2.md, all four SPEC files, BOUNDARY.md, DECISIONS.md, CLAUDE.md, the close-a-lane-iteration skill.
- Read engine/f1.py, clocks.py, verdict.py, settings.py, rulepack.py, dates.py, api/main.py, api/case_f1.py, the f1 pack, tools/sources/verify.py, both case and output contracts, web Result.tsx, labels.ts, App.tsx, caseForm.ts, compute.ts, CaseForm.tsx.
- tests/holdout/ not read. Run with --tb=no only. One unit test file was read in part (tests/unit/engine/test_f1_context.py lines 870 to 985).
- Ran: pytest tests/unit (exit 0), pytest tests/holdout --tb=no (exit 0), tools.sources.verify ("4 pack(s) checked, every quote found"), tools.gates.engine_literals ("every number has a source"), mypy (34 files, no issues), ruff (passed), copy lint (clean), npm test (131 web, 4 ops).
- Not run: make test, gates 3 and 6, the stack, a browser.
- Sent every input of the first review again through TestClient. Findings 1 to 7 are closed.
- The thirteen dates of the first review: the engine gives the same thirteen values.
- New probes: facts that do not fit (filing dated 2030, petition filed after today, EAD of three and five years, months between two EADs) return no_open_items with no question. Absent cpt_full_time_days is shown as 0 entered. The day of a confirmation is never read. A filing window is an open item after the EAD is recorded.
- Wrote reviews/phase-2-second.md. Decision: VETO on new finding 1.
- Done command: bash -c 'grep -Eq "^(APPROVE|VETO)$" reviews/phase-2-second.md'

## Requests for files I do not own (second review)
- specs/phase-2: lines for facts that do not fit: a date of something recorded as done that is after today; a petition filed after its requested start; an EAD longer than the pack's months for that part; days between the OPT EAD end and the STEM EAD start. Each becomes a conflict or a question.
- specs/phase-2/SPEC-context.md section 3: dated items (opt.apply_window_closes, opt.file_by, stem.file_by, stem.apply_window_closes) stop being open items once the filing or the EAD is recorded.
- specs/phase-2/SPEC-context.md section 4: say whether a case with OPT, STEM and cap-gap all absent may get the quiet verdict. The property as written says no, the unit test allows it.
- contracts/engine_output.schema.json: a field on each item that says a rule it used is a reading, so the row and the verdict line can carry the mark.
- contracts/case_f1.schema.json: cpt_full_time_days nullable with no default; a confirmation dated after today refused.
- web/src/lib/labels.ts: the line for cpt_full_time_at_or_over_bar says "the number in the rule"; 365 is not in the rule.
- tools/sources/verify.py: a flag marked verbatim passes without being read.
- tests/: a case for each input in findings 1, 4, 5 and 6 of reviews/phase-2-second.md. tests/support/f1_pack.py marks stem.requires_post_completion_opt verbatim, the real pack marks it a reading.

## Lesson
- Failure: the first review checked the conflicts the SPEC lists and missed that petition_filed_on and i765_filed_date are read by nothing, so records that contradict themselves got the quiet verdict.
- Fix: for every field in the case contract, search the engine for where it is read. A field that is collected and never read is a place where two facts can disagree unseen. Then send one absurd value per field and look at the verdict.
- Evidence: reviews/phase-2-second.md finding 1, six inputs, each with no_open_items or no question.

## Lesson
- Failure: a probe claimed in the draft review had not been run (the verdict line for stem.apply_window_closes), and a table said every row was quiet when one returned needs_you.
- Fix: before the done command, run every input the review names and correct the text to what was printed. Say which screen findings were read from code and not seen.
- Evidence: the input returned needs_you with stem.apply_window_closes once run; the table row was corrected.

## 2026-09-29, run l-review-6768445363 (product round 1)
- Read SPEC.md and SPEC-resolutions.md of product-1, reviews/phase-2-second.md, engine/f1.py (facts, answers, compute_f1), api/main.py, case contract, web labels.ts.
- Ran: engine/api/assistant/support unit tests (pass), holdout --tb=no (pass), web vitest from a TMPDIR copy (183 passed), sources verify (every quote found), engine_literals (pass), copy lint (clean).
- Sent the inputs of phase-2-second findings 1 to 6 again through TestClient, today 2026-09-29 America/Los_Angeles. All closed: each conflict gives cannot_tell with a question; answers after today give 422; answers with no about or an older day stay open; a filed step is no longer an open item.
- Resolution 11 not built: four inputs (STEM filed before its rec, STEM 101 days after, OPT filed before, OPT 71 days after) return no_open_items with no question. No test covers it. engine/f1.py last changed before the resolution landed.
- Wrote reviews/product-1.md (VETO), REVIEW.json and REPORT.json, both valid against their schemas.

## 2026-09-29, run l-review-3d5eed74c2 (product round 1, fix 1)
- Read SPEC-resolutions.md (points 1 to 26), reviews/product-1.md, the engine diff 1060d1a..HEAD (f1.py, dates.py, pack), the labels.ts and Result.tsx diffs, and every removed or changed assertion in the reconcile commits a1a29b2 and 9f12504, holdout included.
- Ran: unit suites (exit 0), holdout --tb=no (exit 0), web vitest on a TMPDIR copy with --configLoader runner (212 passed), sources verify, engine_literals, copy lint, mypy, ruff (all clean).
- Sent the four inputs of product-1 finding 1 through TestClient. Each is now cannot_tell with a question. Yes gives talk_to_dso and no keeps cannot_tell. The edges fit (rec day, day 30, day 60) and conflict (day 31, day 61).
- Sent the cases of points 12 and 14 to 25. Each gives what the point says. Dates were checked by hand, including four business-day validations around 2026-07-04, 2027-01-01, 2027-07-04 and 2028-01-01.
- Found: a passed stem.new_plan_due.<n> gives no_open_items (needs_you on 2026-07-05, quiet from 2026-07-12). Seven periods make 23 questions, and 23 answers give 422 (maxProperties 20).
- Wrote reviews/product-1-fix1.md (VETO), REVIEW.json and REPORT.json, both valid against their schemas.
