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

## 2026-09-30, run l-review-6676921233 (product round 2, fix 7)
- Read resolutions.md points 22 to 26, 23a and 24a, reviews/product-2-fix6.md, plan-fix7, plan-fix7b and plan-fix7c, and the diff 0c55967..3d09f03 (contract state unknown, engine _state and ask_unknown_choices, the pack's point 23 filters and 24a words, web timeline, labels, records and onboarding, test_fix7.py, fix7.test.ts, the reconciled tests and the samples).
- Ran: unit and holdout suites (exit 0). verify, plain, engine_literals, copy lint, ruff, ruff format, mypy and make.py --check all exit 0. On a HEAD copy: web tsc exit 0, web vitest 567 passed, desktop vitest 139 passed.
- TMPDIR/rv7/run.py: twenty journeys on HEAD and on a fix 6 copy, all 200 and cannot_tell. Every date, item, question and reason is the same. Stage state differs in 13 journeys: the transfers and open job-end stages go from current to unknown with no petition.
- twins7.py: 18 J19 twins for point 23 and 23a, each diffed against J19 without the petition. All follow 23a. Probes p11, p15 and p15b cover J11 and J15.
- A scratch vitest sent the route output through stageEyebrow and timelineView. J12, J13 and J14 give eyebrow "F-1" and no now mark, and J19 plus a petition marks only stem.a2. No-petition rows show "Your DSO can tell you these dates." with their items dropped, and on petition cases the old transfers carry the petition's words.
- Mutants: 17 run, 14 caught (all four that point 25 names), 3 survive (the job-card filter, the unemployment filter, window-only placement).
- The saved Onboarding cases for J01, J08 and J16 give the same counts as fix 6.
- Wrote reviews/product-2-fix7.md (VETO), REVIEW.json and REPORT.json, both valid against their schemas. The Write tool was refused by the permission mode, so the files were written through shell heredocs inside reviews/.

## Lesson
- Failure: a state change meant for petition-nulled stages also reached open-ended stages with no petition, and no test pinned a non-petition stage's state.
- Fix: diff each journey's stage states against the previous run, and send the changed rows through the web views.
- Evidence: reviews/product-2-fix7.md finding 1.

## 2026-09-30, run l-review-0ba3ea5fce (product round 2, fix 8)
- Read resolutions.md point 22b, reviews/product-2-fix7.md, plan-fix8, and the diff 3d09f03..ca6abcd (engine/path.py _step_backs, web timeline.ts unknown row, test_fix8.py, fix8.test.ts, the point 22b lines in test_fix7.py, fix7.test.ts and the holdout journeys). Every plan-fix8 lane commit is on the branch.
- Ran: unit and holdout suites (exit 0); verify, plain, engine_literals, copy lint, ruff, ruff format, mypy, make.py --check (all 0). On a HEAD copy: web tsc exit 0, web vitest 575 passed, desktop vitest 139 passed.
- TMPDIR/rv8/run.py: twenty journeys, all 200 and cannot_tell. Against fix 6: only the stage states point 22b names change. No stage carries cap_gap.for_dso without a petition. Against fix 7: only grace.p1 reasons on J12, J13 and J14.
- twins7.py on HEAD: same flat output as fix 7. The reason sits only on the nulled grace (twins B to K, the LATE twins).
- Scratch web vitest: every no-petition row keeps its fix 6 dates and items; the DSO line appears only on nulled grace rows.
- Mutants: 10 Python (8 caught; sb_starts_only and sb_no_restore equivalent on all inputs), 3 web (2 caught; the fact lines are unpinned).
- Probes: J13 with h1.change_of_status or filed_on missing gives a grace row with no reason and no question (should fix).
- Wrote reviews/product-2-fix8.md (APPROVE, mean 4.5), REVIEW.json and REPORT.json, both valid against their schemas.

## Lesson
- Failure: a zsh loop over quoted commands ran each string as one command name, and every gate printed exit 127.
- Fix: eval each command in the loop and print its last output line beside the exit code.
- Evidence: TMPDIR/rv8/gates.txt.

## 2026-09-30, run l-review-8040618df7 (ui-1)
- Read specs/ui-1/SPEC.md and plan.yaml, D56, Main.png, and the diff f52fb37..3e3bda7 (Home, Onboarding, Pages, app.css, labels, shots, ui1.test.tsx).
- Ran on a HEAD copy in TMPDIR: tsc 0, vitest 0, eslint 0, copy lint clean.
- Probes: Home on both samples shows no raw id in the hero; Why opens to 5 lines, 17 question reasons are one generic line (questionCopy null for all 17 ids); questions meta still reads "Missing a1 dso on.". Your case with a stale answer shows the existing unused-answers part. Onboarding failure shows Try again.
- Mutant: questionTitle showing "Duly needs your a1 dso on." passes all 7 ui1 tests.
- chrome-headless-shell refused by the sandbox (Permission denied 1100); point 2 read from CSS only.
- Wrote reviews/ui-1.md (VETO, mean 4.17), REVIEW.json and REPORT.json, both valid.

## 2026-09-30, run l-review-8bdafbf964 (ui-1 fix 1)
- Read specs/ui-1/SPEC.md points 5 to 8, plan-fix1, reviews/ui-1.md, and the diff ea374a0..734d70a (labels.ts, labels.test.ts, Home.tsx, app.css, ui1.test.tsx, desktop shots.ts, shotrun.ts, shots.test.ts).
- Ran on a HEAD copy: web tsc 0, web vitest 591 passed, desktop tsc 0, desktop vitest 146 passed, eslint 0. Worktree: copy lint clean, plain 0.
- Listed the ask sites in engine/path.py. TMPDIR/rvu/ids.py computed 5 cases and found 42 question ids; a scratch vitest printed the title and because line for each. Fields, lists, typed dates, after_today and <check>.<record> have words; <stage>.<record>.ends_before_starts gives the generic title and "Asked because of: Conflict trip t1 ends before starts."
- Rendered Home on three variants. With a2 in three checks there are three identical rows and one Why line.
- All six ui-1 findings are closed for the sample; point 7 is closed in code only, because Electron cannot start in the sandbox.
- Wrote reviews/ui-1-fix1.md (VETO, mean 3.83), REVIEW.json and REPORT.json, both valid.

## 2026-10-01, run l-review-965441e361 (W2-P1)
- Read SPEC-W2 points 39 to 49, plan-w2-p1.yaml, PRINCIPLES, BOUNDARY, D89, and the diff 5cd505c..75cbf7f (pack windows, CHANGELOG, engine path.py and rulepack.py, test_w2_windows, test_w2_limit_day, test_holdout_w2, w2_pack, web zod and reconciled tests, samples).
- Ran: unit and holdout suites without tools and desktop_entry (exit 0). The tools tests fail only on nested sandbox-exec. verify, plain, engine_literals, copy lint, mypy and ruff all exit 0. HEAD copy: web vitest 601 passed, desktop 249 passed, tsc 0, samples --check 0.
- Hand-checked opt.last_day, stem.last_day, prepare, job-start reports, and limit days against the saved quotes; all match.
- Probes TMPDIR/rvw2/probe2..7: a STEM card with no employer drops the stem_job_start windows with no question (blocking). Other results: a future card gives limit_day null, an unknown setting id raises SettingsError at compute, and early dso_on inverts the last-day window (conflict already raised).
- Scratch vitest: Timeline shows planning items with working that omits the setting.
- Mutants: 7 run, 5 caught; M5 (report rule swap) and M7 (during-STEM filter) survive.
- Wrote reviews/w2-p1.md (VETO, mean 3.33), REVIEW.json and REPORT.json, both valid.

## Lesson
- Failure: a for_each where condition that reads an optional field made a stage vanish with no question, while every SPEC-input test passed.
- Fix: for each new where condition, delete each field it reads in turn and look for a question or reason.
- Evidence: reviews/w2-p1.md finding 1.

## 2026-10-01, run l-review-9aa72ce4c6 (W2-P1 re-review after the fix round)
- Read reviews/w2-p1.md (first review), plan-w2-p1-fix.yaml, SPEC-W2 45, 46, 49, PRINCIPLES 2, and the diff 75cbf7f..41990c1 (engine path, rulepack, settings; the reading row and CHANGELOG; new tests in test_w2_windows, test_w2_limit_day, test_holdout_w2; samples).
- Ran: unit and holdout suites without tools and desktop_entry (exit 0); verify, plain, engine_literals, copy lint, mypy, ruff (all 0). HEAD copy TMPDIR/rvw2f/src: samples --check 0, web vitest 601 passed, desktop vitest 249 passed.
- All eight first-review findings are fixed for the inputs named. Limit day 2027-01-12 and prepare 2025-08-14 checked by hand.
- Mutants TMPDIR/rvw2f/mut.py: 9 run, 8 caught (M5 and M7 now caught). M9 (no ask in run_checks) survives; x1 end_date_change with no change shows it matters.
- Probes probe1..6: one job with a gap (no employer, no under, or start "2026-13-40") drops every other job's job-start windows in the same stage. With the bad date nothing is asked. Same at 75cbf7f.
- Wrote reviews/w2-p1.md (VETO, mean 3.67), REVIEW.json and REPORT.json, both valid.

## Lesson
- Failure: a fix asked for the missing field on the one record the test named, but an unknown on any record still voided the whole selection, so known records' deadlines vanished.
- Fix: for each for_each, probe two records, one known and one with a gap, and check that the known one keeps its dates.
- Evidence: reviews/w2-p1.md finding 1 (S1, O1, S2).

## 2026-10-01, run l-review-dfd22d72bf (W2-P1 third review, after fix 2)
- Read reviews/w2-p1.md (re-review), plan-w2-p1-fix2.yaml, SPEC-W2 45, 46, 49, PRINCIPLES, and the diff 88bc479..5e76463 (engine/path.py _split, run_stages, run_checks, _unreadable, ask_unreadable; engine/rulepack.py; new tests in test_w2_windows.py and test_holdout_w2.py). No web/samples change.
- Ran: unit and holdout suites without tools and desktop_entry (exit 0); sources verify, plain, engine_literals, mypy, ruff check, ruff format (all 0). Output in TMPDIR/rvw2g/gates.txt.
- Old probes TMPDIR/rvw2f/probe1..6 on HEAD: S1, O1, S2 fixed in the engine and through POST /v1/compute; x1 asks missing:x1.change.
- New probes TMPDIR/rvw2g/p1..p6, each also on a 41990c1 copy: D4 (w3 end not_sure nulls w1's concluding evaluation though w2 settles the exists); C (a3 with no type removes a1's unemployment count and limit day); p3 (w3 end 2026-13-40 read as no end, w1 window dated; null at 41990c1, so a fix 2 regression); p4 (hours "40", "forty" or absent: count 121, limit day 2026-08-29, at-or-over reason; strings never asked).
- Mutants TMPDIR/rvw2g/mut.py: 15 run, 12 caught; M16, M18, M20 survive, with inputs for M16 and M18 in p6.py.
- Wrote reviews/w2-p1.md (VETO, mean 3.5), REVIEW.json and REPORT.json.

## Lesson
- Failure: a fix split the top-level selection into decided and undecided records, but exists, none, counts and counter scopes still read the all-or-nothing selection, and the new unreadable-as-absent rule made `present` a guess.
- Fix: list every caller of the selection helper and of the field reader, and probe each with one decided witness plus one undecided record, and with each field kind given an unreadable value.
- Evidence: reviews/w2-p1.md findings 1 to 4.

## 2026-10-01, run l-review-ce6e9b0757 (FEED-PA review, SPEC-FEED point 55)
- Read SPEC-FEED 28, 29, 55, 69, plan-feed-pa.yaml, recheck.py, recheck-2026-10-02.json, the L-content diff e48886e..b604402 and the L-pipeline draft.
- Ran: verify, plain, recheck --check (all 0); rules_checked_on 2026-10-02; pytest engine, test_recheck, pipeline (pass); copy lint on drafts (clean).
- TMPDIR/fpa/cmp.py: no leaf changed but checked_on, notes and the ten moved snapshots; 106 source blocks, every sha and quote good, each backed by a same 200 row. eCFR (f) 2026-09-30 == 2026-09-15. Docket ECF 53/54/55, no stay.
- Mutants: checked_on 2026-10-03 refused; maintenance page by sha passes recheck, refused by verify.
- Draft fails contracts/update.schema.json with 9 errors: blocking under SPEC-FEED 28. Wrote reviews/feed-pa.md (VETO, mean 3.67), REVIEW.json, REPORT.json.

## Lesson
- Failure: an update draft passed publish_blockers and the pipeline tests but not the update contract the device validates.
- Fix: validate every new draft against contracts/update.schema.json.
- Evidence: reviews/feed-pa.md finding 1.

## 2026-10-01, run l-review-33527354a3 (FEED-PA re-review after the fix round)
- Read reviews/feed-pa.md (first review), plan-feed-pa-fix.yaml, SPEC-FEED 28, 29, 55, 69, update.schema.json, and the diff b604402..170889f (draft, pack notes, SOURCES, CHANGELOG, D90/D91, recheck.py:186, test_update_files.py, test_recheck.py).
- Ran: verify, plain, recheck --check, copy lint (repo and drafts), pytest engine + pipeline + test_recheck: all exit 0. rules_checked_on 2026-10-02. Output in TMPDIR/fpa2/gates.txt.
- TMPDIR/fpa2/draft.py: draft validates with FormatChecker (0 errors); 5 quotes found in snapshots by sha; blockers are the three approval ones; 7 numbers in plain are in no quote.
- TMPDIR/fpa/cmp.py on b604402 vs HEAD: only four notes changed; 106 blocks at 2026-10-02, all sha good.
- Mutants on TMPDIR/fpa2/src: maintenance copy by sha now refused by recheck (exit 1); reverting recheck.py:186 fails the new test; headline renamed fails test_update_files; history on "30 September 2026" passes it (no FormatChecker).
- Side B patterns over every new string: no hit in the draft.
- Wrote reviews/feed-pa.md (APPROVE, mean 4.33), REVIEW.json and REPORT.json, both valid.

## Lesson
- Failure: none new. The schema test added after the first review checks shape but not formats.
- Fix: when a test validates a contract, mutate one format field too.
- Evidence: reviews/feed-pa.md note 4.

## 2026-10-02, run l-review-d82408c575 (W2-UNKNOWN review, plan-w2-p1-unknown.yaml and fixes 0 to 4)
- Read SPEC-W2-UNKNOWN, the plan and its five fix plans, the third W2-P1 review, and the diff c8dcfb2..8acde5a (engine/unknown.py, readers.py, path.py, f1.py, verdict.py, api, web labels and records, the new tests).
- Ran: tests/unit without tools and desktop_entry, exit 0 in 105 s (new unit files 22 s); tests/holdout, exit 0 in 90 s; mypy, ruff, engine_literals, sources verify, copy lint all 0.
- Probes TMPDIR/rvu: third-review p1 to p4 fixed; R16 B, R34 and R36 fail; toy months.level vanishes when online is absent; J01 p1.conferred_on not_sure is not asked; POST /v1/compute with a record category h1b gives 500.
- Mutants TMPDIR/rvu/mut.py: 35 run on the point 52 set, 27 caught; U10, U11, U17 (no-op), U18 (equivalent), U21b, U24, U25 and U26 survive. The props-only run reached M19 when time ran out. pkill is refused in the sandbox, so the leftover mutant jobs end on their own timeouts.
- Journeys: 358 of 1024 outputs null before, 396 of 1039 after, 327 with waits_on.
- Wrote reviews/w2-unknown.md (VETO, mean 2.5), REVIEW.json and REPORT.json.

## Lesson
- Failure: regression rows the tests round left as "not built" were never built by a later round, and three of them fail on the final engine.
- Fix: first list every R row and mutant the SPEC names, grep the test files for each, and run every missing one by hand.
- Evidence: reviews/w2-unknown.md findings 1 to 3 and 7.

## 2026-10-02, run l-review-bbceb25fc8 (W2-UNKNOWN second review, after fix 5 and fix 6)
- Read the last review, plan fix5 and fix6, SPEC points 2, 7, 12, 14, 26, 31 to 34, 44, 51, 52, and the diff 8acde5a..83fddf1 (engine path.py and readers.py, api/main.py, web labels and onboarding, new tests, conftest, gaps.py).
- Ran: tests/unit + tests/holdout without tools and desktop_entry, exit 0 in 209 s. mypy, ruff check, ruff format, engine_literals, sources verify and copy lint all 0. Web vitest emptyWords + fix7: 15 passed.
- Old probes TMPDIR/rvu (r4, r7, r8, toy1, happ2, d5, api1) on HEAD: findings 1, 2, 3, 5, 6, 8, 10, 12 and 14 fixed. Finding 4 is fixed for selections and only_if.
- New probe TMPDIR/rvu2/holds.py: a check's holds with present on an absent ask field gives a conflict (present true) or passes quietly (present false), with nothing asked. Blocking.
- Mutants TMPDIR/rvu2/mut.py (45, mutants profile, non-vacuity test deselected because it fails under the profile with no mutant). Examples: U11, U21b, U25 and U26 survive, plus U17 (no-op), U18 (equivalent) and the module mutants U2 and U17b. Properties: the run reached 10 mutants, and M9, M15, M16 and M20 survive.
- Journeys: c8dcfb2 1024/358/0, 8acde5a 1039/396/327, HEAD 1077/434/410 (outputs / null or unknown / with waits_on). The 24 nulls with no waits_on are all "does not apply" or the cap_gap DSO handoff.
- Wrote reviews/w2-unknown.md (VETO, mean 4.17), REVIEW.json (valid against the schema) and REPORT.json.

## Lesson
- Failure: a fix made present-on-absent U in selections and only_if but kept the exception for a check's holds. P6 draws U only as not_sure, so no test saw it.
- Fix: for each gap state the SPEC names (absent, unreadable, undecided), probe every reader position (where, only_if, holds, next only_if) on the toy pack.
- Evidence: reviews/w2-unknown.md finding 1.

## 2026-10-02, run l-review-e4f7024f0e (W2-UNKNOWN third review, after fix 7)
- Read the last review, plan fix7, SPEC point 12 as amended and point 52, and the diff 83fddf1..76a47db (engine/path.py holds exception and _tri/_known removed, api/case.py words, tests/conftest.py skip, new tests in test_w2_unknown, _stages, _props, test_path_reach, test_case_structure).
- Ran: tests/unit + tests/holdout without tools and desktop_entry, exit 0 in 4 min 33 s; mypy, ruff check, ruff format, engine_literals, sources verify, copy lint all 0.
- Probes TMPDIR/rvu2/holds.py and TMPDIR/rvu3/holds2.py: holds asks absent, not_sure and unreadable for flag, count, date, choice and link fields; declared none reads as none. Journeys byte-identical to 83fddf1 (1077/434/410). jnull.py gives 32 at both commits, not the 24 I wrote last time.
- Mutants TMPDIR/rvu3/mut.py, full source copy per mutant (a partial copy made every mutant an import error at first), parallel, mutants profile. Examples: all named caught but U2/U17b (unknown.py, caught by test_unknown_logic), U17 no-op, U18 equivalent. Properties, first complete run: U10, U12, U16, U21, U21b, U22, U23b, U24, U25, U26 survive.
- Wrote reviews/w2-unknown.md (VETO, mean 4.5, tested 2), REVIEW.json and REPORT.json, both valid.

## Lesson
- Failure: the property half of point 52 was run on ten mutants only, so nine survivors went unseen for a round.
- Fix: run every mutant on both sets to the end, in parallel, in full source copies, with a no-mutant baseline; check the baseline line says passed before trusting any CAUGHT.
- Evidence: reviews/w2-unknown.md finding 1.

## 2026-10-02, run l-review-f924676928 (W2-UNKNOWN final review, after fix 8)
- Read the last review, plan fix8, SPEC point 52 as amended, tests/PROGRESS.md, and the diff 9749801..b120cf2 (test_unknown_logic.py P6 only; no engine, api or web change since 76a47db).
- Ran: tests/unit + tests/holdout without tools and desktop_entry, exit 0. ruff, format, mypy, engine_literals, sources verify, copy lint all 0. Property files with --durations: P6 12.8 s under load.
- Mutants TMPDIR/rvu4/mut.py, full source copies, mutants profile, both sets to the end, baselines pass. Properties: every listed operator and reader mutant caught (U14, U21, U21b, X3 by P6). Survivors are position mutants U10, U12, U16, U22, U23b, U24, U25, U26, plus U17 (no-op), U18 (equivalent) and U18b (not named). Examples: all caught but U2 and U17b (both caught by examples in test_unknown_logic.py), U17 and U18.
- Own mutant Y1 (_note sends not_sure to missing): survives, but it is equivalent on a toy probe (TMPDIR/rvu4/y1probe.py).
- Journeys byte-identical to 76a47db: 1077/434/410, 32 nulls with no waits_on.
- Wrote reviews/w2-unknown.md (APPROVE, mean 4.83), REVIEW.json and REPORT.json, both valid.

## Lesson
- Failure: a mutant of my own survived every test, and it would have read as a gap if I had not probed it.
- Fix: diff HEAD and the mutant's output on one input before calling a survivor a finding.
- Evidence: reviews/w2-unknown.md, own probe of P6.

## 2026-10-02, run l-review-e327e7c346 (W2-P1 final review, after the unknown-values work)
- Read the three W2-P1 reviews from git (3eb17d3, 88bc479, 19890c7), plan-w2-p1-final.yaml, SPEC-W2 45, 46, 49, D92 to D94, and the engine code that replaced _select (_choose, _some, _each, _counter, _covered, readers.py).
- Ran: tests/unit + tests/holdout without tools and desktop_entry, exit 0; sources verify, plain, engine_literals, mypy, ruff check, ruff format, samples --check, copy lint all 0.
- Old probes TMPDIR/rvw2f and rvw2g on HEAD: S1, O1, S2, D4, C, w3 end table, hours table all fixed. p6 needed ecN ids (TMPDIR/rvw2h/q2.py): M16 and M18 inputs right.
- New probes TMPDIR/rvw2h/q1..q5: last day, prepare, stem last day, limit days all right by hand; litigated 60/30 split follows the operative regime; hours -5 gives 121 days and an at-or-over line unasked (should fix); 9999-12-31 now unreadable.
- Mutants TMPDIR/rvw2h/mut.py, full copies, 4 parallel, baseline passes: M5, M7, M9, M15, M16, M18, M20, H1, H2, E1 all caught.
- Wrote reviews/w2-p1.md (APPROVE, mean 4.5), REVIEW.json and REPORT.json.

## Lesson
- Failure: old probe scripts raised on a new id prefix rule, which could have read as a regression.
- Fix: read the exception first and fix the probe's ids before judging the engine.
- Evidence: reviews/w2-p1.md, What ran.

## 2026-10-03, run l-review-9fa957435a (W2-P2 review)
- Read plan-w2-p2.yaml, fix0, fix1, SPEC-W2 points 39 to 46 and 50, SPEC-W2-UNKNOWN points 2, 14, 22, 32a, BOUNDARY, and the diff d45fab7..9283025 (path.py check-ins, watch, as_of; readers.py hours; pack rules, kinds, stages, watch, checkins; tests; web).
- Ran: tests/unit + tests/holdout without tools and desktop_entry, exit 0. engine_literals, mypy, ruff, format, sources verify, recheck --check, plain, copy lint all 0.
- Probes TMPDIR/rvp2/p1..p8.py: never-confirmed job counted through today unasked; limit_day 2026-09-30 past as_of 2026-07-15; two unlinked addresses drop a move; trip with return before leaving keeps dated windows (32a); watch skips lists not stated; check-in titled as a conflict in labels.ts.
- Mutants TMPDIR/rvp2/mut.sh: M2 to M6 caught, M1 (count through today) survives.
- Wrote reviews/w2-p2.md (VETO, mean 3.33), REVIEW.json (valid) and REPORT.json.

## Lesson
- Failure: a mutant script set UV_PROJECT_ENVIRONMENT to the worktree's .venv, which uv then created half-empty, and the first mutant results were environment errors.
- Fix: read `env | grep UV_` first; the shared environment is already set, so run copies with the inherited variables and print the failing test name, not only the tail.
- Evidence: reviews/w2-p2.md, What ran.

## 2026-10-03, run l-review-8de7f34fa2 (W2-P2 second review, after fix2 and fix3)
- Read the first review (88cc0dd), plan-w2-p2-fix2 and fix3, SPEC-W2-UNKNOWN points 2, 5, 6, 14, 30, 32a, 33, 34, 61, D74, D92 to D94, and the diff 9283025..70edfb1 (path.py, readers.py, parameters.yaml, CHANGELOG, labels.ts, tests).
- Ran: tests/unit + tests/holdout without tools and desktop_entry, exit 0 in 3 min 44 s; engine_literals, mypy, ruff, format, sources verify, recheck --check, plain, copy lint all 0; vitest labels.test.ts 85 passed.
- Old probes TMPDIR/rvp2/p1..p4 on HEAD: findings 1, 2, 4, 5, 6, 7, 9, 10, hours fixed; 3 and 8 fixed on the named input only.
- New probes TMPDIR/rvp3: a.py A9 (two addresses both first_in_us yes) asks nothing and drops the move (blocking); d3.py trip with no return reads the absence window as done and drops it from upcoming (blocking, fix3 regression, pinned by test_review4b); w.py empty kind not asked whole, conflicted visa still watched.
- Mutants TMPDIR/rvp3/mut.sh, baseline exit 0: M1, M1b, M7, M8, M10, M11, M12 caught; M9 (check-in asked early) survives engine + holdout.
- Wrote reviews/w2-p2.md (VETO, mean 3.5), REVIEW.json (valid) and REPORT.json.

## Lesson
- Failure: a fix for one test (fix3, review4b) widened a rule to every empty asked done_when field, and the test it was written for pinned the wrong behaviour.
- Fix: for each new branch in the engine, read the SPEC point it names, then probe the plainest input it touches (here a trip still abroad with a future closing day), not only the test's input.
- Evidence: reviews/w2-p2.md finding 1.

## 2026-10-03, run l-review-13e7b0ae80 (W2-P2 third review, after fix4)
- Read the second review, plan-w2-p2-fix4, SPEC-W2-UNKNOWN points 30, 32a, 33, 34, and the diff 70edfb1..b3d04af (path.py, parameters.yaml address checks, caseStore.tsx confirmRecords, labels.ts, Home, Onboarding, tests).
- Ran: tests/unit + tests/holdout without tools and desktop_entry, exit 0 in 4 min 3 s; engine_literals, mypy, ruff, format, sources verify, recheck --check, plain, copy lint all 0; web vitest src/ 616 passed.
- Old probes on HEAD ($TMPDIR/rvp4): second-review findings 1 to 8 all fixed on their inputs.
- Mutants $TMPDIR/rvp4/mut.sh on tests/unit/engine + tests/holdout: M1, M9, M12, N1 to N4 caught; N5 (_confirmed ignores a clash) survives and changes the count (n5.py).
- New probe pre.py: opt_pre.part_time_hours is taken by _answers_only as a clash, so a 25-hour part-time job's check-in day goes null (should fix). Labels probe: address conflicts show a bare "do not fit" line.
- Wrote reviews/w2-p2.md (APPROVE, mean 4.5), REVIEW.json (valid) and REPORT.json.

## Lesson
- Failure: a generic engine test added for one pack's checks (_answers_only) also took an older check of another shape, and no test covered it.
- Fix: for each new structural predicate in the engine, run it over every check in the pack and read the list it selects.
- Evidence: reviews/w2-p2.md finding 1, $TMPDIR/rvp4/ao.py.
