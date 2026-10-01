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

## 2026-09-29, run l-api-b92dbaa4da (product round 1)

Goal: specs/product-1/SPEC.md section 3 and SPEC-resolutions.md point 8. The api passes
its clock to `parse_case`, and an answer dated after today becomes a 422 in plain words.

What was built
- api/main.py: `parse_case(raw, clock)`. A ValueError from it becomes a 422 with
  `NOT_YET`. The contract, the numbers and the zone are checked before, so what is left
  is an answer dated after the person's own day. The engine's words are not shown.
  `compute_f1` is outside the catch, so a later ValueError of the engine stays a 500.
- api/case_f1.py: `NOT_YET`, words that name the field and never the date sent.

What ran
- Before: 14 failures in tests/unit/api. 3 in test_compute_product.py (answer after
  today not refused, 200 instead of 422), 11 in older files.
- After: the 3 pass. 11 remain, all from the engine output under points 3 and 7, which
  the api passes through as it is. mypy "no issues found in 56 source files", ruff check
  "All checks passed!", ruff format "8 files already formatted", copy lint clean.
- Done command: exit 1, from the 11 tests only.

Disputes (tests I cannot edit; the resolutions say they are wrong)
- Point 7 and 3: the older tests send answers with about {"question": id} and the
  marker day 1950-01-01 without the step the screen takes (with_the_about_asked,
  dated_on_the_day), or with no about at all. The engine keeps the question open.
- test_compute.py::test_a_good_case_returns_the_engine_output asks for the exact key set
  of the phase-2 output; the product contract adds upcoming and lists.

Stop hook: the same 11 failures a second time. Status escalated, api/ESCALATE.md written.

## Run l-api-bfb5b9b276 (attempt 1)
- git merge --no-edit lane/L-api/l-api-b92dbaa4da: merged, 4 files (api/PROGRESS.md,
  api/REPORT.json, api/case_f1.py, api/main.py). Git warned it could not open
  tests/holdout/ (the sandbox denies reads there); the merge itself went through.
- Done command, run as written with no pipe: all tests in tests/unit/api pass, mypy
  "Success: no issues found in 56 source files", ruff check "All checks passed!",
  ruff format "8 files already formatted". Exit 0.
- No code change needed in api/ this run; the 11 disputed tests were fixed by L-tests
  (commit ae3c878) and now pass against the merged api.

## Run l-api-5f392f03a7 (attempt 1)
Point 35 of specs/product-1/SPEC-resolutions.md: /v1/status uses the packs' own rules_checked_on.
- api/main.py: each rulepacks entry carries rules_checked_on (ISO day, or null for a pack
  with no rules), read from Rulepack.rules_checked_on. The empty case given to decide()
  takes the oldest date among the packs that hold rules (None only when no pack has one),
  so rules_never_checked no longer shows, and a stale pack is not hidden by a fresh one.
  checked_at (the page load time) is left as it is; no copy calls it "Checked" here.
- Done command, run as written with no pipe: all tests in tests/unit/api pass, mypy
  "Success: no issues found in 56 source files", ruff check "All checks passed!",
  ruff format "8 files already formatted". Exit 0.
- Dispute: contracts/openapi.yaml RulepackRef has additionalProperties: false and no
  rules_checked_on, so the body now goes past the contract. The test asks for the field;
  the contract change is the founder's and must land first and alone. No api test checks
  the body against openapi.yaml, so nothing fails today.

## Run l-api-f9619de750 (desktop-1, attempt 1)
Goal: specs/desktop-1/SPEC.md "The api (L-api)": when DULY_LOCAL_TOKEN is set, every
request but /health carries the same value in X-Duly-Local, compared in constant time,
or gets 403 in plain words. Unset: nothing changes.
- api/local_token.py (new): request_allowed(path, sent, expected), a plain function.
  hmac.compare_digest on UTF-8 bytes, so a header outside ASCII is refused, not a 500.
  The variable is read from os.environ at each request (not through the lru_cached
  Settings), so a test's monkeypatch.setenv takes effect. An empty value counts as set.
- api/main.py: an http middleware returns 403 {"detail": "This request did not come from
  the Duly app on this Mac."} before any route runs. Only the exact path /health is open.
- ruff S105 flagged the names TOKEN_ENV and TOKEN_HEADER as passwords; marked noqa with
  the reason (they are names, not values).
- tests/unit/api/test_local_token.py is not on any branch yet (L-tests writes it this
  round). A scratch test under TMPDIR checked: /health open, no header 403, wrong header
  403, non-ASCII header 403, POST 403, right header 200, unset 200. 2 passed.
- Done command, run as written with no pipe: all tests in tests/unit/api pass, mypy
  "Success: no issues found in 60 source files", ruff check "All checks passed!",
  ruff format "9 files already formatted". Exit 0. Copy lint clean.

## Run l-api-64e7959dbd (design-1 RQ-A1, attempt 1)
Goal: POST /v1/compute, case.schema.json in, engine output out. /v1/compute/f1 stays.
- Before: tests/unit/api/test_compute_generic.py, 14 failed (404, no route).
- Found: no engine function reads a records case (no engine/path.py on any branch), and
  engine.rulepack.Rulepack does not carry the pack's path. So the api cannot tell a pack
  with a path from one without, and no category can be computed from records yet.
- api/case_f1.py: validator_for(path) and first_problem_under(validator, raw), so the
  refusal words are shared; first_problem for case_f1 is unchanged.
- api/case.py (new): first_problem against case.schema.json; answered_after (an answer
  dated after the person's day, read through engine.clocks.day_in_zone); compute(), which
  answers cannot_tell with category_not_covered:<id> for every category, then the reasons
  engine.verdict.decide gives (no_documents, rules_never_checked or rules_stale).
  scope.documents_count is 0 and scope.rules_checked_on is the oldest among the case's packs.
- api/main.py: POST /v1/compute with the same refusals as /v1/compute/f1 (NOT_A_NUMBER,
  NOT_JSON, first_problem, NOT_YET); packs loaded once through get_packs.
- Done command, run as written with no pipe: 16 passed, mypy "Success: no issues found in
  61 source files", ruff check "All checks passed!", ruff format "10 files already
  formatted". Exit 0. All of tests/unit/api pass. Copy lint on api: clean.

## Run l-api-fdf4487611 (product-2 point 1, attempt 1)
Goal: specs/product-2/resolutions.md point 1: POST /v1/compute calls engine/path.py on the
records case and returns its output.
- api/case.py: compute(raw, packs, clock) now returns engine.path.compute(raw, packs, clock).
  The api's own cannot_tell/category_not_covered answer is gone; path.py gives it for a pack
  with no path. NOT_IN_THE_PACK added.
- api/main.py: engine.path.compute raises ValueError for a kind, field or category the pack
  does not declare; the route answers 422 NOT_IN_THE_PACK and does not show the engine's
  words (they name what was sent).
- Done command, run as written with no pipe: tests/unit/api all pass, mypy "Success: no
  issues found in 62 source files", ruff check "All checks passed!", ruff format "10 files
  already formatted". Exit 0.
- tests/unit/acceptance: 72 of 90 pass, 18 fail. Every failure is 200 with an engine output
  whose stages, questions or values differ from the journey (points 3 to 8: links, cap-gap
  spans, completeness, closed windows, stem.basis_ten_years_end, pack questions). Those are
  engine/ and rulepacks/ work, outside api/.

## Run l-api-8e3626eddf (step-w W1 sections 1 and 2, attempt 1)
Goal: specs/step-w/SPEC-W1.md points 1 to 5, 7 and 9: api/desktop_main.py, api/local_routes.py,
api/main.py mounting the shared routes.
- api/local_routes.py (new): one APIRouter with GET /health, GET /version and POST /v1/compute
  (the compute body moved from api/main.py unchanged), plus get_clock, get_body, get_packs,
  API_VERSION, CONTRACTS_VERSION. Imports fastapi, api.case, api.case_f1, engine/ only.
  /health and /version moved too, so both apps answer them from one function.
- api/main.py: include_router(router); imports get_clock and get_body from local_routes, so
  api.main.get_clock is the same object and every existing override still applies. The f1,
  status and ops routes and the DULY_LOCAL_TOKEN middleware are unchanged.
- api/desktop_main.py (new): create_app(token) (openapi, docs, redoc off; middleware requires
  X-Duly-Local on every route, /health included, hmac.compare_digest on bytes); main():
  --mode packaged|repo, --socket; packaged refuses DULY_ENV other than desktop; token is the
  first stdin line (empty: refuse); bind_socket: path over 103 bytes refused, parent must be
  this user's with no group or world write, an existing path removed only if lstat shows this
  user's socket, bind under umask 0o177, chmod 0o600, lstat check; uvicorn.Server(...).run(
  sockets=[sock]) with log_level warning and access_log False. Refusals: one line on stderr,
  exit 1, no traceback.
- Done command, run as written: exit 1. 184 tests, 11 failed, 2 skipped. Every one of the 11
  is the sandbox refusing a Unix socket bind: "[Errno 1] Operation not permitted" (10 from the
  engine, 1 from the test's own stale.bind at line 530). A bare probe confirmed it: AF_UNIX
  bind fails with EPERM in TMPDIR and in api/ alike in this run's Bash sandbox. Points 1, 2, 3
  and the refusal tests of 4, 7 and 9 pass. mypy "Success: no issues found in 66 source
  files", ruff check "All checks passed!", ruff format "12 files already formatted".
- Scratch check under TMPDIR (desktop_main run with a TCP listening socket in place of
  bind_socket): no header, empty, DULY_LOCAL_TOKEN's value and a byte-short token all 403 on
  /health, /version and /v1/compute; the right token 200; h1b case answers cannot_tell with
  category_not_covered:h1b; /openapi.json 404. Captured stdout and stderr were empty: no
  canary, no token, no path.
- tests/unit/api all pass. Copy lint on api: clean.

## Run l-api-f1165cf1ac (step-w W1 sections 1 and 2, attempt 1, resume)
Goal: bring in lane/L-api/l-api-8e3626eddf and finish.
- git merge lane/L-api/l-api-8e3626eddf: clean merge, api/desktop_main.py, api/local_routes.py,
  api/main.py, api/PROGRESS.md. No code change needed this run.
- Done command, run as written: exit 1. 11 failed, the rest passed, 2 xfailed. Every failure is
  the sandbox refusing an AF_UNIX bind ("[Errno 1] Operation not permitted"), the same 11 as the
  last run. tests/unit/api/test_compute_generic.py and tests/unit/acceptance/test_journeys.py all
  pass now. mypy "Success: no issues found in 66 source files", ruff check "All checks passed!",
  ruff format "12 files already formatted".
- Reported done per the contract; the orchestrator's jail run decides the 11 socket tests.

## Run l-api-4583b39d78 (step-w W1 sections 1 and 2, attempt 1)
Goal: bring in lane/L-api/l-api-8e3626eddf and finish.
- git merge lane/L-api/l-api-8e3626eddf: only api/PROGRESS.md conflicted (this base already had
  the f1165cf1ac entry); kept both sides. git diff 0f7db38 HEAD is empty: api/desktop_main.py,
  api/local_routes.py and api/main.py were already in this base. No code change this run.
- Done command, run as written: exit 1. 11 failed in tests/unit/desktop_entry/test_desktop_main.py,
  the rest passed, 2 xfailed. Every failure is "[Errno 1] Operation not permitted" on an AF_UNIX
  bind, one of them the test's own stale.bind at line 530, so the sandbox refuses it, not the
  engine. test_compute_generic.py and test_journeys.py all pass.
- Run separately: mypy "Success: no issues found in 66 source files" exit 0; ruff check "All
  checks passed!" exit 0; ruff format --check "12 files already formatted" exit 0.
- Reported done per the contract; the orchestrator's jail run decides the 11 socket tests.
