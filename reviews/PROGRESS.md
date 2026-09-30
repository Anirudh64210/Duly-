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

## 2026-09-29, run l-review-1280065922 (product round 1, fix 6)
- Read SPEC-resolutions.md points 58 to 61, specs/plain-1/SPEC.md, reviews/product-1-fix5.md, the diff 17a53ac..d9442be (contract plain_terms, tools/sources/plain.py, engine/f1.py, drafts.ts, the pack, the tests), and all 53 rows and 2 regimes with quote, note, plain and plain_terms side by side, and the diff of every plain text against the one before the round.
- Ran: unit suites (exit 0), holdout (exit 0), test_plain (11 passed), tools.sources.plain, sources verify, engine_literals, copy lint, mypy, ruff (all clean), web vitest on a TMPDIR copy (11 files, 299 passed).
- Sent fix 5 findings 1 to 5 through TestClient, with clocks 2016-05-09, 2014-01-15 and 2002-12-31: all closed. Scanned nine cases answered in full over clocks 1950 to 2099 with compute_f1: no error. Point 60 edges fit at 2025-05-18/19, in either entry order.
- Printed 20 drafts from api outputs in a scratch vitest file: no Duly, no computed date, no status; period dates in numbered reports.
- Found: four plain texts say more or other than their quotes (cap-gap rows drop the (c)(3)(i)(B)/(C) limit and "approved"; the 2008 row shows a reading unmarked; employer_reporting moves its time limit), and five are not plain. The step-back draft leaves out the employment period. A pack lacking the validation interval gives no_open_items.
- Wrote reviews/product-1-fix6.md (VETO), REVIEW.json and REPORT.json, both valid against their schemas.

## Lesson
- Failure: a plain text that keeps every listed term can still drop a limit or move a condition, and the gate passes it.
- Fix: diff each plain text against the text before the round and read each change for a dropped limit or a moved clause.
- Evidence: reviews/product-1-fix6.md finding 1; three of four faults were right before the round.

## 2026-09-29, run l-review-5ea60f3f51 (product round 1, fix 7)
- Read SPEC-resolutions.md points 62 to 64, reviews/product-1-fix6.md, the diff d9442be..07f2b6a (the pack's eight plain texts, tools/sources/plain_changes.py, engine/f1.py whole_shown, drafts.ts, the tests), and the eight texts beside quote and note.
- Ran: unit suites (exit 0), holdout (exit 0), test_plain and test_plain_changes (17 passed), tools.sources.plain_changes d9442be (the eight named rows, no other; exit 0 with --allow), tools.sources.plain, sources verify, engine_literals, copy lint, mypy, ruff (all clean), web vitest on a TMPDIR copy (12 files, 302 passed).
- Sent fix 6 findings 1 to 4 through TestClient. 3 and 4 closed: the step-back draft lists the period; the shipped pack less the interval, the extension or the evaluation interval steps back on a STEM case that is quiet on the full pack. Findings 1 and 2 closed as asked, but two rewrites fail.
- Found: stem.requires.previously_obtained_degree is not split (one 59-word sentence) and says the DSO "recommends it"; capgap.end_month_day 2025 says "they end then", where the quote says only the automatic extension runs until then.
- Wrote reviews/product-1-fix7.md (VETO), REVIEW.json (valid) and REPORT.json.

## Lesson
- Failure: the STEM case of fix 6 finding 4 already steps back for point 60 on the shipped pack, so dropping a row showed the step back without proving point 63 caused it.
- Fix: send a control case whose period starts after 2025-05-19, check it is quiet on the full pack, then drop the row.
- Evidence: the 2025-06-15 STEM case gives no_open_items on the shipped pack and rule_not_in_force_on_event_day with either row left out.

## 2026-09-29, run l-review-430e7fdaf4 (product round 1, fix 8, and the round as a whole)
- Read SPEC-resolutions.md points 58, 62 and 65, plain-1 SPEC, reviews/product-1-fix7.md and the finding lists of product-1.md to fix7.md, the diff 07f2b6a..23234a4 (two plain texts, CHANGELOG, PROGRESS, plan-fix8), tools/sources/plain.py and plain_changes.py.
- Ran: unit suites (exit 0), holdout (exit 0), test_plain and test_plain_changes (17 passed), plain_changes 07f2b6a (the two named rows only; refuses a row not allowed, exit 1), tools.sources.plain, sources verify, engine_literals, copy lint (all clean).
- Sent the fix 7 cap-gap case through TestClient: talk_to_dso grace_with_cap_gap, both new texts in rules, dates checked by hand. Sent an OPT-only case: grace.ends listed once (product-1 note 3 closed). /v1/status carries rules_checked_on.
- Found: the cap-gap 2025 text passes. The degree text is faithful but one 57-word sentence. The gate scores it at 8.88 only because SENTENCE splits "U.S." into extra sentences. With "U.S." read as one word it is 23.92, and four frozen texts are 13.5 to 19.8. "field" replaces "category".
- Wrote reviews/product-1-fix8.md (VETO), REVIEW.json and REPORT.json, both valid against their schemas.

## Lesson
- Failure: a sentence splitter that cuts on every period passes long texts that hold "U.S." as short ones.
- Fix: score each plain text again with abbreviations read as one word, and list every text the splitter cuts into a piece of two words or fewer.
- Evidence: exactly five f1 rows are cut on "S."; stem.requires.previously_obtained_degree scores 8.88 on the gate and 23.92 when "U.S." is read as one word.

## 2026-09-29, run l-review-0cb32ada70 (product round 1, fix 9, and the round as a whole)
- Read reviews/product-1-fix8.md, SPEC-resolutions.md points 37, 58, 62, 65 and 66, plain-1 SPEC, the diff 23234a4..c760b07 (tools/sources/plain.py, plain_changes.py, their tests, five plain texts, CHANGELOG, plan-fix9), and the five texts beside quote and note.
- Ran: unit suites (exit 0), holdout (exit 0), test_plain and test_plain_changes (exit 0), plain_changes 23234a4 (the five named rows only; one row allowed or none refuses, exit 1), tools.sources.plain, sources verify, load_all, engine_literals, copy lint, ruff, mypy (all clean).
- Graded the five texts by hand with a syllable table (TMPDIR/r0cb/hand.py, handA.py): degree 9.08 / 11.08 and duties 9.86 / 10.87 where the gate gives 8.88 and 8.85.
- Sent point 37 through TestClient: card end 2026-07-16 nulls the window items, complete_by and grace while open or denied, talk_to_dso when confirmed; 2026-07-15 raises nothing. Dates checked by hand. Closed.
- Found: accreditation text moves "At the time of application" to the front and closes the recognition-only reading its note keeps open; degree text says "10 years prior" with no named day. Notes: gate syllable estimate; "no." with IGNORECASE hides a sentence end.
- Wrote reviews/product-1-fix9.md (VETO), REVIEW.json and REPORT.json, both valid against their schemas.

## Lesson
- Failure: a rewrite that moved a time phrase to the front of its sentence passed every gate and closed a reading the note keeps open.
- Fix: for each rewrite, list phrases that moved and check each reading the note names is still possible.
- Evidence: reviews/product-1-fix9.md finding 1.

## 2026-09-29, run l-review-09957a1427 (product round 1, fix 10, and the round as a whole)
- Read reviews/product-1-fix9.md, SPEC-resolutions.md points 58, 62, 65 and 66 (there is no point 67 in the file), plan-fix10, plain-1 SPEC, the diff c760b07..a5901e1 (two plain texts, plain.py pattern, test_plain, plain-1 SPEC, CHANGELOG), and both texts beside their quotes and notes.
- Ran: plain_changes c760b07 (two rows; exit 0 with both allowed, exit 1 with one), tools.sources.plain, sources verify, load_all, engine_literals, copy lint, test_plain and test_plain_changes, unit suites, holdout, ruff, mypy: all clean.
- Counted old and new abbreviation matches on all 55 shipped texts: no change. Tried "At that time" in the degree text: 316 characters, grade 9.04, refused.
- Found: both texts pass and fix 9 findings 1 and 2 are closed. Notes: point 67 is missing from the file, "Then" does two jobs, and "U.S." before a capital ends no sentence.
- Wrote reviews/product-1-fix10.md (APPROVE), REVIEW.json and REPORT.json, both valid against their schemas.

## Lesson
- Failure: a fix made in the review's own example words invites a pass that was never tested.
- Fix: test the example words like any rewrite, and run the tighter wording through the gate.
- Evidence: reviews/product-1-fix10.md note 2.

## 2026-09-29, run l-review-c51c95e205 (desktop round 1)
- Read specs/desktop-1/SPEC.md, the threat model, and the diff product-1...HEAD (8e212b8): desktop/src, api/local_token.py, api/main.py, web api-path, vite base, tools/factory efficiency and phase.
- Ran: desktop typecheck (exit 0); desktop vitest on a TMPDIR copy (66 passed; worktree run refused mkdir coverage); web vitest (307 passed); vite build (relative assets, no inline script); eslint, copy lint, ruff, mypy clean; tests/unit/api passed; test_phase 4 failures from sandbox-exec, 3 of them same on product-1.
- Probed routeRequest/readInside with about 30 plain, encoded, absolute and symlink paths: no read outside web/dist. Raw HTTP to the real api with DULY_LOCAL_TOKEN=abc: 403 on everything but /health. Links off the host list are refused. Mutants: 10 of 12 killed (detached spawn and username check survive).
- Wrote reviews/desktop-1.md (APPROVE), REVIEW.json, REPORT.json. A probe uvicorn on 127.0.0.1:18765 could not be killed from the sandbox.

## Lesson
- Failure: a background probe server could not be stopped from inside the sandbox.
- Fix: probe in the foreground with a timeout, or through TestClient.
- Evidence: kill 18296: operation not permitted.

## 2026-09-29, run l-review-b7ccda7ad9 (product round 2)
- Read the plan, path-1 SPEC, programs.md sections 8 to 22, design-1 sections 4, 14.4 and 18 parts, the engine and content progress logs, api/case.py, engine/path.py, the pack's path, caseStore and Onboarding.
- Ran: unit and holdout suites (exit 0). TMPDIR/rv/journeys.py sent J01, J02, J03, J06, J08, J09, J09 late, J12, J13, J16, J19 through /v1/compute (all 200, cannot_tell, category_not_covered:f1) and engine.path.compute. Dates checked by hand.
- Found: api never calls path.py; J08 OPT end wrong (_first ignores link paths); J12 grace ignores cap-gap; unemployment counted on an unanswered work list; onboarding is round A's shape; no design-shots; no journey pairs in holdout.
- Screens: no render tool (no shots.ts, no playwright package); compared Timeline and Onboarding PNGs by structure.
- Wrote reviews/product-2.md (VETO), REVIEW.json, REPORT.json, both valid.

## Lesson
- Failure: a green suite hid a route that computes nothing.
- Fix: send one SPEC journey through the route and the engine function and compare.
- Evidence: reviews/product-2.md finding 1.

## 2026-09-30, run l-review-3a41706e57 (product round 2, fix 1)
- Read resolutions.md points 1 to 14, reviews/product-2.md, programs.md sections 14, 18, 19 and 22, journeys.json, the diff 233625c..6585ae9 (api/case.py, engine/path.py and f1.py, the pack, the web onboarding and records, the acceptance and holdout journeys).
- Ran: unit and holdout suites (exit 0); web tsc and vite build (exit 0) and vitest (516 passed) on a TMPDIR copy; TMPDIR/rv3a/journeys.py sent all twenty journeys through POST /v1/compute (all 200, all cannot_tell with reasons); a click driver walked Onboarding for J01 (70 views), J08 and J16 (48 views) and sent each posted case to the route.
- Hand checks: 17 journeys right. J04 and J14 give the concluding evaluation from the card end (2023-07-01, 2026-06-10), where the source and journeys give 2022-08-25 and 2026-07-25. J06 keeps opt_post.p1 next after its filing window closed on 2026-02-10.
- Onboarding: J01 and J16 posted cases give the journey counts; J08's on-campus job cannot be chosen (setField writes under ""); many views lack a why line; several dates must be typed with no not-sure choice. Point 11 not built.
- Wrote reviews/product-2-fix1.md (VETO), REVIEW.json and REPORT.json, both valid.

## Lesson
- Failure: a unit test that sets a field directly passed while the rendered view refused the same choice.
- Fix: walk each named journey through the rendered views with a title-keyed click driver and save the posted case.
- Evidence: the J08 walk stops at "Which permission was this job under?" with "Choose an answer."

## 2026-09-30, run l-review-c18232d7c2 (product round 2, fix 2)
- Read resolutions.md point 15, reviews/product-2-fix1.md, and the diff 6585ae9..66bbfae (engine/path.py _closed, the pack's stem windows, grace entry and three new rows, the web Onboarding, desktop shots, Makefile, tests/design, the acceptance and holdout journeys).
- Ran: unit and holdout suites (exit 0); copy lint, ruff, sources verify (clean); web tsc (exit 0) and vitest (522 passed apart from my own stale drivers); desktop vitest (123 passed) on a git archive copy.
- TMPDIR/rvc18/journeys.py sent all twenty journeys through POST /v1/compute (all 200, cannot_tell), diffed against the fix 1 run. J04, J06, J12, J14, J15, J19 right by hand. J01, J02, J03, J05, J09, J11, J20: the next STEM stage now carries validation and concluding-evaluation dates taken from the OPT card.
- Probes (TMPDIR/rvc18/probe.py): J15 without Job C drops all validations while the card runs; J15 Job B final evaluation absent.
- Walked Onboarding for J01 (71 views), J08 (62), J16 (49): every view has a why line, the on-campus job moves on, I'm not sure works, complete.withdrawal is sent. The withdrawal program is preselected.
- make design-shots: builds pass, Electron SIGTRAP in the sandbox; no shot compared. web/samples are stale against the engine.
- Wrote reviews/product-2-fix2.md (VETO), REVIEW.json and REPORT.json, both valid against their schemas.

## Lesson
- Failure: a fix that made a done stage right gave dates to the virtual next stage of the same kind.
- Fix: diff the full route output of every journey against the previous run, not only the named ones.
- Evidence: reviews/product-2-fix2.md finding 1.

## 2026-09-30, run l-review-1ff190a1d6 (product round 2, fix 3)
- Read resolutions.md point 16, reviews/product-2-fix2.md, plan-fix3, and the diff 222aeed..317ad86 (the pack's stem windows and new stem_job_end.evaluation_final, desktop shots.ts and shotrun.ts, the acceptance and holdout journeys, progress logs).
- Ran: unit and holdout suites (exit 0); sources verify, plain gate, copy lint, ruff (clean); desktop vitest on an archive copy (137 passed).
- TMPDIR/rv1f/journeys.py sent all twenty journeys through POST /v1/compute (all 200, cannot_tell) and diffed them against the fix 2 run. The next STEM stage of J01, J02, J03, J05, J09, J11 and J20 now has no report dates. J14, J15 and J19 validations and J15 Job B's evaluation (2025-10-31 to 2025-11-10) are right by hand.
- Walked Onboarding J01, J08 and J16 on a HEAD web copy. The posted cases are the same bytes as in fix 2, and their counts are the same on the day they were stated. The withdrawal program still opens already chosen.
- Found: the L-web point 16 commit 3db6249 is not merged (blocking). Any approved change-of-status petition, even one from 2020, ends every validation (parameters.yaml:1787), and no test covers it (mutant b survives). Samples still drift.
- Wrote reviews/product-2-fix3.md (VETO), REVIEW.json and REPORT.json, both valid against their schemas.

## Lesson
- Failure: a lane's fix sat unmerged while the plan counted the lane as done.
- Fix: check each plan lane's commit with git merge-base --is-ancestor before reviewing.
- Evidence: reviews/product-2-fix3.md finding 1.

## 2026-09-30, run l-review-e8924056e5 (product round 2, fix 4)
- Read resolutions.md point 17, reviews/product-2-fix3.md, plan-fix4, and the diff 317ad86..fa26e0c (pack stem_validation_end petition member, web/samples/make.py and samples, Makefile samples, onboarding withdrawal fix and walk test, samples.test.ts, desktop shots.ts heading text, point 17 twins).
- Ran: unit and holdout suites (exit 0); verify, plain, load_all, copy lint, ruff, engine_literals, make.py --check (all exit 0); planted sample drift caught (exit 1); web tsc and vitest on a HEAD copy (523 passed), samples.test.ts in the worktree (passed); desktop tsc and vitest (143 passed).
- TMPDIR/rve89/journeys.py: twenty journeys, output byte for byte the fix 3 run; J19 validations checked by hand again. twins.py: five acceptance and three holdout twins right; probes P1 to P8.
- Walks J01, J08, J16: same cases and counts as fix 3. Withdrawal view opens unchosen and Continue stays.
- Mutants: m1 and m3 caught, m2 equivalent, m4 (approved filter removed) survives.
- Found: the old-petition twin loses grace.p2 and gets an invented cap_gap.h9.ends_before_starts conflict; a petition filed during the first OPT keeps validations while grace is dropped; the shot heading check compares canvas copy that /welcome, / and /updates never draw; a missing filed_on is not asked.
- Wrote reviews/product-2-fix4.md (VETO), REVIEW.json and REPORT.json, both valid against their schemas.

## Lesson
- Failure: a twin that asserts only the rows its point names hid another stage the same input broke.
- Fix: diff every stage, question and reason of a twin against the case without the added record.
- Evidence: reviews/product-2-fix4.md finding 1.

## 2026-09-30, run l-review-1d6afd8368 (product round 2, fix 5)
- Read resolutions.md point 18, reviews/product-2-fix4.md, plan-fix5, and the diff 949b726..0dddf62 (pack anchors petition_belongs and petition_may_belong, web data-landmark marks and petition questions, desktop landmark selector, point 18 twins).
- Ran: unit and holdout suites (exit 0); verify, plain, load_all, copy lint, ruff, engine_literals, make.py --check (all 0); web tsc and vitest (550 passed) and desktop tsc and vitest (136 passed) on a HEAD copy.
- TMPDIR/rv1d/journeys.py: twenty journeys, byte for byte the fix 4 run. twins2.py and probe3.py diffed every twin and probe against plain J19.
- Mutants: m1, m2 and m6 caught; m3 (null while unsettled) and m5 (cap_gap card-end filter) survive; m4 is equivalent.
- Scratch test: the web LANDMARKS values fail the desktop holdsLandmark on 8 of 8 screens.
- Walks J01, J08, J16: same cases and counts as fix 4.
- Wrote reviews/product-2-fix5.md (VETO), REVIEW.json and REPORT.json.

## Lesson
- Failure: two lanes built the two halves of one contract, and each tested against its own spelling.
- Fix: feed one side's exported values to the other side's check.
- Evidence: reviews/product-2-fix5.md finding 1.

## 2026-09-30, run l-review-9682244b00 (product round 2, fix 6)
- Read resolutions.md points 19 to 21, reviews/product-2-fix5.md, plan-fix6 and plan-fix6b, and the diff 0dddf62..0c55967 (the pack's point 19 step back and capgap.petition_for_dso, web labels, drafts, Shell and shots, the desktop join test, the point 19 and 21 tests, and the samples). No L-engine commit landed; engine/ is unchanged.
- Ran: unit and holdout suites (exit 0); verify, plain, load_all, copy lint, ruff, engine_literals and make.py --check (all 0); web tsc and vitest (554 passed) and desktop tsc and vitest (139 passed) on a HEAD copy.
- TMPDIR/rv96/journeys.py: twenty journeys, all 200 and cannot_tell. Only J12, J13 and J14 differ from fix 5. Dates and J12/J14 filing-day boundaries checked by hand. probe6 to probe10 cover J19, J11, J06 and J15 with petitions of every kind.
- 13 pack mutants: 8 caught, 1 equivalent (validation_4), 4 survive (job-end evaluation, program grace, the filing-day boundary, and the filed_while skip, which no test pins).
- A scratch vitest sends the route output to stageEyebrow: J12, J13 and J14 give "F-1 · TIME AFTER THE PROGRAM ENDS, FROM THE DATES YOU ENTERED" from the nulled grace, which the engine marks current.
- Walks J01, J08 and J16: same cases and counts as fix 5.
- Wrote reviews/product-2-fix6.md (VETO), REVIEW.json and REPORT.json, both valid against their schemas.

## Lesson
- Failure: a step back nulled a stage's dates, and the stage's state fell to current, so Home named the stage the SPEC made unknowable.
- Fix: send the route output of each step-back case through the web view functions and read the words.
- Evidence: reviews/product-2-fix6.md finding 1.
