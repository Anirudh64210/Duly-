# L-api progress log

## 2026-09-28, iteration 1

Goal: POST /v1/compute/f1 (specs/phase-2/SPEC.md, "The api").

What was built
- api/case_f1.py: `first_problem(raw)` checks a body against contracts/case_f1.schema.json
  with jsonschema and returns the first problem in plain words, or None. Problems are
  ordered by place and then by kind, so the same body always gets the same words.
- api/main.py: the route, and `get_f1_pack`, a dependency that loads the shipped f1 pack
  once. The route reads the raw body itself, checks it, calls
  `compute_f1(parse_case(raw), pack, clock)` with the injected clock, and returns the result.

Choices
- The route takes `Request` and parses the JSON itself. A typed body parameter would let
  FastAPI answer a bad body with its own 422, which repeats the input that was sent.
- The refusal words come from the contract and the place of the problem only. They never
  repeat a value from the body, and they do not name an unknown field, since its name is
  also something the user sent.
- The route has no database dependency and no logger.
- The response is not checked against contracts/engine_output.schema.json at run time.
  The tests check it. A run time check would add a failure branch that no test in
  tests/unit/api reaches, and this lane cannot add tests there.

What ran
- Before: `uv run pytest tests/unit/api -q` failed on every compute test with 404.
- First try: tests green, mypy failed with 4 errors in api/case_f1.py
  (`validator_value` and `instance` are typed `Any | Unset`). Fixed by naming them as Any.
- Done command: green. pytest all passed, mypy "no issues found in 32 source files",
  ruff check "All checks passed!", ruff format "7 files already formatted".
- Coverage over tests/unit: api/case_f1.py 100%, api/main.py 97% (the miss is
  `get_clock`, which the tests replace).
- Copy lint: clean.

Seen, not mine to fix
- `uv run pytest` over all of tests/unit has one failure outside this lane:
  tests/unit/tools/test_dashboard_data.py::test_load_reads_events_gates_and_lessons,
  `assert 'working' == 'stopped'`. It looks like it reads live lane state while a lane is
  running. Not looked into further.
- `tools.diff_policy.check --base main` names files from other lanes, because main is
  behind phase-2. Against the phase-2 base this lane's diff is api/ only.
- Gate 6 could not run here: it needs the web and ops coverage reports from gate 5.

Requests to other lanes
- tests (test-author): consider a test that a body with an unknown field gets a refusal
  that does not repeat the field's name or value, and a test for a run time contract
  failure if the founder wants the response checked on every request.

## Lesson

- Failure: mypy strict rejects iterating or using `in` on `ValidationError.validator_value`
  and `ValidationError.instance`, typed `Any | Unset` in types-jsonschema.
- Fix: bind them to a local annotated as Any before use.
- Evidence: `api/case_f1.py:47: error: Item "Unset" of "Any | Unset" has no attribute
  "__iter__"`, gone after the change; mypy reports no issues in 32 files.
