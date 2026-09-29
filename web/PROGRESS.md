# L-web progress log

## 2026-09-28, iteration 1

### Read

specs/phase-2/SPEC.md, CLAUDE.md, BOUNDARY.md, DECISIONS.md, both phase-2 contracts, engine/f1.py
and engine/verdict.py (to learn the reason codes and the shape of inputs), tools/copy_lint/lint.py.

### Built

- web/src/lib/api-types.ts : regenerated with
  `npx openapi-typescript contracts/openapi.yaml -o web/src/lib/api-types.ts`. Adds /v1/compute/f1.
- web/src/lib/compute.ts : zod parser for contracts/engine_output.schema.json (strict, refuses extra
  fields), the case types, `computeF1`, which posts to /api/v1/compute/f1. The parser also refuses an
  item that names a rule with no entry in `rules`, so nothing is shown without its source.
- web/src/lib/caseForm.ts : form state, and `buildCase`, which turns what was typed into the case
  contract or names each field it cannot use. An empty optional date is sent as null. A part that
  is switched off is sent as null.
- web/src/lib/labels.ts : item names, groups, input names, status tags, legal status words, value
  and date formatting, verdict reasons in plain words, the scope line.
- web/src/components/CaseForm.tsx, web/src/components/Result.tsx, web/src/App.tsx, styles.
- web/src/lib/status.ts : not touched. The four headlines are as they were.
- The three tests that were in web/src/App.test.tsx are kept as written and still pass. Before a
  computation the screen shows the verdict for an empty case from /api/v1/status, as before.

### Choices a reviewer may want to look at

- Changing any field clears the result. A verdict beside dates it was not computed from would
  mislead.
- A failed computation (server down, malformed answer, 422) shows "Can't tell yet" with one plain
  line. It never shows the quiet state and never shows items.
- Dates are formatted from the text the engine gave, in UTC, so a date never moves a day. The web
  code never reads the clock for a computation.
- The open item reason for a dated item reads as the item name and its value, for example
  "Validation report 1 due: Dec 14, 2026." No words about how near it is.
- conflict:opt_start reads "The OPT EAD start date and the program end date do not fit together."
  The one year in the SPEC is an engine definition and is not in the output, so the screen does not
  state it.

### Ran

```
bash -c 'npm run typecheck -w web && npm test -w web && npx eslint web --max-warnings 0 && npx prettier --check "web/**/*.{ts,tsx,css,html,json}" && uv run python -m tools.copy_lint.lint'
```

Printed: typecheck clean; Test Files 5 passed (5), Tests 72 passed (72); coverage statements
94.55%, branches 89.5%; eslint clean; "All matched files use Prettier code style!"; "copy lint:
clean". Passed on the first full run.

Also ran, outside the done command:

- `npm run build -w web` : built.
- A throwaway test that ran `compute_f1` on the real pack with a FixedClock, wrote the json to /tmp,
  and parsed it with `engineOutputSchema`: 22 items parsed. Alternates came back on
  opt.apply_window_closes, opt.latest_start, and grace.ends. The throwaway test was deleted.

### Not done, not verified

- The screen has not been seen in a browser against a live api. api/main.py on this branch has no
  /v1/compute/f1 route yet (L-api is in the same round). After round C merges, check
  http://localhost:5173 by hand.
- The body of a 422 is assumed to be `{"detail": "<plain words>"}`. The contract gives the 422 no
  body shape. Any other shape shows "The server did not accept the case." with no detail.

### Requests for files this lane does not own

1. contracts/engine_output.schema.json and engine/f1.py : an item with alternates does not carry the
   legal status of the operative regime, only of the alternates. The screen labels the main value
   "in effect" because the engine computes it under the operative regime. If an operative regime
   ever has a legal status other than effective, that label would be wrong. Request: add the
   operative regime id and its legal_status to the item, so the screen shows what the pack says.
2. contracts/openapi.yaml : the request and response of /v1/compute/f1 are `type: object` with no
   properties, so the generated types are `Record<string, never>` and cannot check the case or the
   output. The zod parser is written from the json schemas by hand. Request: reference the two
   schemas from the OpenAPI file, and give the 422 a body shape.

## 2026-09-29, iteration 2: findings 7 and 5 of the phase 2 review

### Read

web/PROGRESS.md, reviews/phase-2.md, specs/phase-2/SPEC-fixes.md, CLAUDE.md, BOUNDARY.md,
DECISIONS.md, contracts/engine_output.schema.json (now has `operative`), engine/f1.py for the
shape of `operative`, the renamed item, and the new missing name.

### Built

- web/src/lib/api-types.ts : regenerated with
  `npx openapi-typescript contracts/openapi.yaml -o web/src/lib/api-types.ts`. No change in the
  file. contracts/openapi.yaml did not change in the fixes round, and /v1/compute/f1 is still a
  bare object there, so `operative` is not in the generated types. Request 2 of iteration 1 stands.
- Finding 7. web/src/lib/compute.ts : the parser reads `operative` (strict: regime and
  legal_status, nothing else) and refuses an item that has alternates and no `operative`.
  web/src/components/Result.tsx : the label beside the main value is
  `legalStatusWords(item.operative.legal_status)`. No legal status is written into the screen.
- Finding 5. web/src/lib/labels.ts : the item is `stem.final_evaluation_due_from_ead_end` and
  reads "Final evaluation due, counted from the EAD end date". The old id has no name left.
- Found while checking against real engine output, fixed in a second commit:
  - `missing:opt` (finding 1) read "Duly needs your opt." It now reads "Duly needs the OPT
    dates." The same for `missing:stem`.
  - The `duly_settings` input (rounds S and T) is a list of setting ids, and the screen showed
    "This entry could not be shown." on most rows. It now shows under "Duly settings used, which
    are not law", each setting by the meaning line of contracts/product_settings.yaml.

### Tests added

- App.test.tsx : an output whose operative regime is `appealed` shows "under appeal" and never
  "in effect". An output with alternates and no `operative` shows "Can't tell yet" and no items.
  The settings list shows by name.
- compute.test.ts : keeps `operative` as given; refuses alternates without it; refuses an
  `operative` with a missing or an extra field.
- labels.test.ts : the renamed id in the SPEC list; the two missing parts; setting names.

### Choices a reviewer may want to look at

- Alternates without `operative` is treated as a malformed answer, so the whole result is
  refused and the screen says it cannot tell. The other choice was to show "status not given"
  beside the value. Refusing is stricter and the contract says `operative` is present with
  alternates.
- `operative` on an item with no alternates is accepted and not shown. The contract does not
  forbid it and the row has one value with nothing to compare.

### Ran

```
bash -c 'npm run typecheck -w web && npm test -w web && npx eslint web --max-warnings 0 && npx prettier --check "web/**/*.{ts,tsx,css,html,json}" && uv run python -m tools.copy_lint.lint'
```

Printed: typecheck clean; Test Files 5 passed (5), Tests 80 passed (80); coverage statements
94.78%, branches 89.76%; eslint clean; "All matched files use Prettier code style!"; "copy lint:
clean".

Runs before that one: the first failed on a test of mine that looked for a button by a name the
screen does not have; the second failed eslint on two unused variables in tests. Both were in
the new tests, not in the code under test.

Also ran, outside the done command: `compute_f1` on the real pack with FixedClock 2026-09-28 and
the case from the review, json written to /tmp, parsed by `engineOutputSchema` in a throwaway
test. 22 items parsed. `operative` was `ds_2012`, `effective` on opt.apply_window_closes,
opt.latest_start and grace.ends. The same case without `opt` gave `cannot_tell` with
`missing:opt`. The throwaway test was deleted.

### Not done, not verified

- Still not seen in a browser against a live api.
- The real pack has no operative regime other than `effective`, so "under appeal" is proven
  with made up output only.

### Requests for files this lane does not own

1. Request 1 of iteration 1 is answered by the contract change. Closed.
2. Request 2 of iteration 1 stands: contracts/openapi.yaml, reference the two json schemas and
   give the 422 a body shape.
3. contracts/engine_output.schema.json and engine/f1.py : `duly_settings` carries setting ids
   only. The screen can name a setting but cannot show its value, since the web code holds no
   numbers of its own. Request: carry each setting used with its value and unit, the way `rules`
   carries each rule.

## Lesson

- failure: openapi-typescript turns a bare `type: object` into `Record<string, never>`, so a type
  check of the parser against the generated types (the pattern in status.ts) cannot be used for
  /v1/compute/f1.
- fix: use the generated `paths` only for the route key (`satisfies keyof paths`), mirror the json
  schema in zod with strictObject, and prove the parser against real engine output.
- evidence: web/src/lib/api-types.ts, operations.computeF1; web/src/lib/compute.ts.

## Lesson

- failure: prettier --write reformats files after they are written, and the Edit tool then asks
  for a fresh read.
- fix: run prettier once at the end of a batch of writes, then read before any further edit.
- evidence: iteration 1, after the first prettier run.

## Lesson

- failure: the fixtures were hand written from the contract, so two shapes the engine really
  sends (`duly_settings` as a list of ids, `missing:opt` as a whole part) showed on the screen
  as "This entry could not be shown." and "Duly needs your opt." with every test passing.
- fix: after any contract or engine change, run `compute_f1` on the real pack with a FixedClock
  (`PYTHONPATH=. uv run python <script>`), parse the json with `engineOutputSchema`, and read
  the input keys and the reasons for names the labels do not know.
- evidence: iteration 2; web/src/lib/labels.ts, SETTING_NAMES and MISSING_PARTS.
