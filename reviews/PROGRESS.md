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

## 2026-09-29, run l-review-54de1b7f57 (product round 1, fix 2)
- Read SPEC-resolutions.md points 27 to 38, reviews/product-1-fix1.md, the diff 149170e..e71c8c9 (engine/f1.py, api/main.py, the contract, the pack, web Result.tsx, answers.ts, caseForm.ts, App.tsx), and every changed assertion in 67625a6 and 5b6b683, holdout and web included.
- Ran: unit suites (exit 0), holdout --tb=no (exit 0), web vitest on a TMPDIR copy with node_modules linked from the main checkout (242 passed), sources verify, engine_literals, copy lint, mypy, ruff (all clean).
- Fix 1 findings 1 and 2 are closed: the passed new plan is asked about from 2026-07-12; seven periods take 29 answers and give no_open_items; 256 answers give 200 and 257 give 422.
- Found: point 27 answered yes gives the STEM list next and 120 unemployment days on a pre-completion card. An open period that begins after the last card gives no_open_items (older, SPEC.md line 27). rule_not_in_force_on_event_day shows as "Something in what you entered needs an answer". /v1/status fails the openapi Status schema. An answer the engine stopped reading is shown as standing.
- Wrote reviews/product-1-fix2.md (VETO), REVIEW.json and REPORT.json.

## Lesson
- Failure: npx vitest from a TMPDIR copy tried the registry and failed (ENOTCACHED).
- Fix: copy web/ into TMPDIR/root/web, link TMPDIR/root/node_modules to the main checkout's node_modules and web/node_modules to its web/node_modules, run ../node_modules/.bin/vitest run --configLoader runner.
- Evidence: 8 files, 242 tests passed; a scratch probe test rendered Questions.

## Lesson
- Failure: tests for a new conflict checked only the open and no branches; the yes branch still ran the code the conflict was meant to stop.
- Fix: for each conflict that gates later steps, answer it yes and look at next steps, lists and counts, not only the verdict state.
- Evidence: reviews/product-1-fix2.md finding 1.

## 2026-09-29, run l-review-720330a91e (product round 1, fix 4)
- Read SPEC-resolutions.md points 39 to 53, specs/plain-1/SPEC.md, plan-fix4.yaml, reviews/product-1-fix2.md, PRINCIPLES.md, BOUNDARY.md, DECISIONS.md D54 to D57, the pack's 53 rows and 2 regimes (quote, note, plain side by side), the saved court order, engine/f1.py (point 48 and 50 code, passed reports), web drafts.ts, Result.tsx (RuleCard, CourtLine, Questions), labels.ts, caseForm.ts, and every changed assertion in the reconcile commit 1f3349f.
- Ran: unit suites (exit 0), holdout --tb=no (exit 0), tools tests for plain and copy lint (exit 0), tools.sources.plain (pass), sources verify, engine_literals, copy lint (all clean), web vitest on a TMPDIR copy (11 files, 290 passed).
- Sent the cases of points 39, 40, 42, 43, 46 to 51 and the inputs of fix 2 findings 1, 2 and 5 through TestClient. All give what the points say; dates checked by hand.
- Printed every DSO draft from a scratch vitest file on api outputs for 13 cases. No Duly, no computed date; every draft opens "I am an F-1 student".
- Found: six plain texts say other, more or less than their quotes (two CPT rows unmarked academic to practical training). A clock before 2025-05-19 gives a 500. Null alternates remain on null items.
- Wrote reviews/product-1-fix4.md (VETO), REVIEW.json and REPORT.json, both valid against their schemas.

## Lesson
- Failure: TMPDIR is shared with earlier runs; a grep over TMPDIR/*.txt showed old tracebacks as if this run's holdout had failed.
- Fix: keep scratch files in a folder named for the run and read only those.
- Evidence: this run's result files ended with exit 0; the tracebacks were in files hours older.

## Lesson
- Failure: the plain words gate passes plain texts whose meaning differs from the quote.
- Fix: print quote, note and plain side by side for every row and read each; check which rows the output's rules carry before naming an input.
- Evidence: reviews/product-1-fix4.md findings 1 and 2.

## 2026-09-29, run l-review-271b0fb1e7 (product round 1, fix 5)
- Read SPEC-resolutions.md points 54 to 57, specs/plain-1/SPEC.md, reviews/product-1-fix4.md, the diff fa1837d..ccfdcbb (engine/f1.py, parameters.yaml, drafts.ts, labels.ts, Result.tsx, the tests), and all 53 rows and 2 regimes with quote, note and plain side by side.
- Ran: unit suites (exit 0), holdout (exit 0), tools.sources.plain, sources verify, engine_literals, copy lint (all clean), web vitest on a TMPDIR copy (11 files, 296 passed).
- Sent the inputs of fix 4 findings 1 to 7 through TestClient: 1, 3, 4, 5 and 7 closed. In 2 the new texts of the grace row (30) and min hours bring new term swaps. 6 is closed for 2016-10-01 and 2024-09-01 only.
- Printed 17 drafts from a scratch vitest file on api outputs: every one opens "I have a question about my F-1 record."
- Found: six plain texts swap or drop terms (U.S. worker, 214(g)(1)(A), U.S. institution, recognized, period of admission). A STEM case with a clock before 2016-05-10 gives a 500, and so does a case with CPT days and a clock before 2003. The unreported count reads a 2025 row for a 2015 period. The new-plan draft gives no period dates.
- Wrote reviews/product-1-fix5.md (VETO), REVIEW.json (valid) and REPORT.json.

## Lesson
- Failure: the point 56 tests drew clocks from 2009 on and OPT cases only, so a STEM case on a past clock still gave a 500.
- Fix: scan the clock over every few days from the earliest row's start, for an OPT, a STEM and a CPT case, calling compute_f1 directly and grouping errors by rule id.
- Evidence: 1049 failing clocks for each STEM case, all before 2016-05-10; 73 for the OPT case with CPT days, all in 2002.

## Lesson
- Failure: a rewrite for point 54 kept the numbers and the limits but swapped a defined term for an everyday one ("U.S. workers" to "workers in the United States").
- Fix: for each plain text, list the quote's nouns that carry a legal meaning (U.S. worker, period of admission, recognized, subject to section ...) and check that each is kept or marked as a reading.
- Evidence: reviews/product-1-fix5.md finding 1.
