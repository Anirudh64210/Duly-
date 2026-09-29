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

## 2026-09-29, iteration 2

Goal: the api part of findings 2 and 4 (specs/phase-2/SPEC-fixes.md).

What was built
- api/case_f1.py: `read_body(body)` reads the JSON with two hooks. `parse_constant` refuses
  NaN, Infinity and -Infinity. `parse_float` refuses a number that overflows to one of
  them, such as 1e999. Both raise `NotANumberError`. The refusal words are `NOT_A_NUMBER`,
  which never repeat what was sent.
- api/main.py: the compute handler is now a plain `def`, so FastAPI runs it, and the
  engine, on a worker thread. The body is read by a small async dependency, `get_body`.
  The number check runs while the body is parsed, so it comes before the contract check.

Choices
- The check is done in the parser and not by walking the parsed value. It then covers
  every place in the body, fields the contract does not have included, in one pass.
- The bounds on dates, periods and counts needed no code here. They are in
  contracts/case_f1.schema.json, and `first_problem` already put them in plain words.

What ran
- Before: 7 failures in tests/unit/api/test_compute_fixes.py. NaN in hours_per_week
  reached the engine and raised ValueError (a 500). Infinity in the same place was
  refused with words about the contract and not about the number. The engine ran on the
  event loop.
- First try: tests green, mypy green, ruff check failed with N818 on the name
  `NotANumber`. Renamed to `NotANumberError`.
- Done command: green. pytest all passed, mypy "no issues found in 34 source files",
  ruff check "All checks passed!", ruff format "8 files already formatted".
- Copy lint: clean.

Not run
- Gates 1 to 6 (`make test`) were not run in this iteration. Only the done command and
  the copy lint were.

## Lesson

- Failure: mypy strict rejects iterating or using `in` on `ValidationError.validator_value`
  and `ValidationError.instance`, typed `Any | Unset` in types-jsonschema.
- Fix: bind them to a local annotated as Any before use.
- Evidence: `api/case_f1.py:47: error: Item "Unset" of "Any | Unset" has no attribute
  "__iter__"`, gone after the change; mypy reports no issues in 32 files.

- Failure: ruff N818 rejects an exception class whose name does not end in Error.
- Fix: name it with the Error suffix from the start.
- Evidence: `N818 Exception name NotANumber should be named with an Error suffix`
  at api/case_f1.py, gone after the rename; ruff check reports all checks passed.

## 2026-09-29, iteration 3

Goal: the api part of section 2 of specs/phase-2/SPEC-context.md. An unknown zone is
refused with a 422 in plain words.

What was built
- api/case_f1.py: `first_problem` now ends with a check of `time_zone` against
  `engine.clocks.zone_named`, after the contract check finds nothing. A name that matches
  the pattern of the contract and is no zone gets `NOT_A_ZONE`, words that name the field
  and never repeat what was sent.
- api/main.py: no change. `today`, `questions` and the derivation of each rule come from
  the engine and pass through as they are.

Choices
- The zone is checked by name in the api and the ValueError of `parse_case` is not caught
  as a whole. A wide catch would turn any later ValueError of the engine into a 422, and
  would show the engine's words without anyone having read them.
- The zone list is the engine's. The api keeps no list of its own, so the two cannot
  disagree.

What ran
- Before: 7 failures in tests/unit/api/test_compute_context.py, all from one cause. The
  ValueError of `zone_named` left `parse_case` and became a 500.
- Done command, first try after the change: green, exit code 0. pytest all passed, mypy
  "no issues found in 34 source files", ruff check "All checks passed!", ruff format
  "8 files already formatted".
- Copy lint: clean.

Not run
- Gates 1 to 6 (`make test`) were not run in this iteration.

Seen, not changed
- A `time_zone` or a `confirmations` entry that breaks a pattern, a length or a count in
  the contract is refused with the general words "this does not match the contract",
  after the place of the problem. The tests accept this. Words for each of those checks
  could be added to `_in_words` later.
