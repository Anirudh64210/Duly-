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
