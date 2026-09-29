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

## 2026-09-29, iteration 3: context round, sections 2, 4 and 5

### Read

web/PROGRESS.md, specs/phase-2/SPEC-context.md, PRINCIPLES.md, BOUNDARY.md, DECISIONS.md (D32 to
D37), CLAUDE.md, the skill close-a-lane-iteration, both json contracts, engine/f1.py and
engine/clocks.py for the questions and the zone, tests/unit/engine/test_f1_context.py for what
each answer means, tools/copy_lint/lint.py.

### Built

- web/src/lib/api-types.ts : regenerated with
  `npx openapi-typescript contracts/openapi.yaml -o web/src/lib/api-types.ts`. No change in the
  file: /v1/compute/f1 is still a bare object in contracts/openapi.yaml. Request 2 stands.
- Section 2, the person's own day.
  - The case carries `time_zone` and `confirmations`. The form has a field "Your time zone, which
    sets the day Duly counts as today". It starts as the zone the browser reports. When the
    browser reports none the contract takes, the field starts empty and the screen asks
    "Choose your time zone." and posts nothing. It never picks one.
  - The verdict shows, under the scope line, "Today is Sep 28, 2026 in America/Los Angeles." from
    the output's `today`, with a button "Change the time zone" that moves to the field.
    Changing the zone clears the result, like any other field.
- Section 4, confirm, never assume.
  - Each open question shows in plain words with two answers and the line "Asked because of: ...".
    An answer is recorded with `today.date` of the output that asked, then the case is computed
    again. The web code reads no clock for it. A test sets the browser clock to 2031 and the
    answer still carries 2026-09-28.
  - Answers sent with the case show under "Your answers, sent with these dates" as
    `You answered "No, I did not" on Sep 28, 2026.`, each with "Change the answer to ..." and
    "Remove the answer". Both compute again. Answers stay when a date is changed.
  - A question id the screen has no words for shows one plain line and no answer buttons.
  - The rules no item names (the paragraph sent with `stem_without_post_completion_opt`) show
    under "What the rule says", between the questions and the items.
  - The parser refuses an output with an open question and a verdict other than cannot_tell.
- Section 5, derivation.
  - A rule card labels the quote "Words of the source". A verbatim rule adds "The value is written
    in the quoted words." A reading carries the tag "Duly's reading" and, after the quote, a
    tinted block headed "Duly's reading of the quoted words, not the words of the source" with
    the note. A rule with no derivation says neither.
  - The parser refuses a reading that has no note or no quote.
  - A rule with unit `flag` no longer shows "Yes" as its value. A flag is its words.

### What each answer sends

| Question | Button | Sent |
|---|---|---|
| held_post_completion_opt | Yes, I had one | true |
| held_post_completion_opt | No, I did not | false |
| no_employment_to_record | Yes, there is none | true |
| no_employment_to_record | No, there is some to add | false |
| cap_gap_without_training | Yes, I had one | true |
| cap_gap_without_training | No, I did not | false |

### Choices a reviewer may want to look at

- cap_gap_without_training: by its name, yes could be read as "cap-gap without training". The
  SPEC table and the engine say yes gives `missing:opt.ead_end`, so yes means the person had OPT
  or STEM OPT that is not entered. The question is worded that way: "Did you have a period of
  OPT or STEM OPT that is not entered here?" A reviewer should check this reading of the table.
- The day of an answer is the engine's `today.date`, in the zone the case was sent with. The
  screen only has an open question after a computation, so that day is always there.
- An answer is kept until the person changes or removes it. The engine does not read an answer
  to a question that is not raised, and the output does not say which answers it read. The
  screen therefore shows every answer that was sent, under a heading that says only that.
- A reading without a note refuses the whole output (the screen says it cannot tell). This
  follows the choice made for alternates without `operative`.
- The notes in the real pack are long paragraphs, not the one sentence of the SPEC. The screen
  shows the note whole.
- Two tests of iteration 1 changed because the case changed: the expected case now has
  `time_zone` and `confirmations`, and an empty form now also names the time zone. No assertion
  was removed.

### Ran

```
bash -c 'npm run typecheck -w web && npm test -w web && npx eslint web --max-warnings 0 && npx prettier --check "web/**/*.{ts,tsx,css,html,json}" && uv run python -m tools.copy_lint.lint'
```

Printed: typecheck clean; Test Files 5 passed (5), Tests 131 passed (131); coverage statements
95.6%, branches 91.32%; eslint clean; "All matched files use Prettier code style!"; "copy lint:
clean". Exit code 0.

Runs before that one: one failed on a test of mine that chose Asia/Kolkata from the list (see
the lesson below); one failed eslint on four unused variables in tests of mine.

Also ran, outside the done command:

- `npm run build -w web` : built.
- `compute_f1` on the real pack, FixedClock 2026-09-29 01:30 UTC, ten cases: each question open,
  answered yes, answered no, and one case in Asia/Kolkata. All ten parsed with
  `engineOutputSchema` in a throwaway test, which was deleted. America/Los_Angeles gave
  2026-09-28 and Asia/Kolkata gave 2026-09-29. The answer no to held_post_completion_opt gave
  talk_to_dso and the rule stem.requires_post_completion_opt, named by no item.
- The api of this branch on port 8011 with curl. A case in Asia/Calcutta with the answer no came
  back 200 with talk_to_dso. A case with the zone Mars/Base came back 500, not 422 (request 4).

### Not done, not verified

- Not seen in a browser. The checks above are tests in jsdom, the engine run, and curl.
- The 422 for an unknown zone is proven with a made up reply only, since this branch gives 500.
- The list of zones comes from the browser (`Intl.supportedValuesOf`). Which names each browser
  lists was not checked in a real browser.

### Requests for files this lane does not own

2. Stands: contracts/openapi.yaml, reference the two json schemas and give the 422 a body shape.
3. Stands: `duly_settings` carries ids only.
4. api/main.py on this branch: an unknown `time_zone` that fits the pattern of the contract
   (tried: Mars/Base) reaches `parse_case`, the ValueError is not caught, and the reply is 500.
   SPEC-context section 2 says 422 in plain words. With a 500 the screen says "Duly could not
   reach its server.", which is not what happened. It may already be fixed in lane L-api.
5. contracts/engine_output.schema.json and engine/f1.py: the output does not say which answers
   the engine read. Request: list the confirmations that were read, so the screen shows only
   the answers the result rests on.

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

## Lesson

- failure: a test chose Asia/Kolkata in the zone list and the field went empty. The runtime
  (node, and Chrome) lists that zone as Asia/Calcutta, so the option was not there.
- fix: the list always holds the zone that is held now, beside what the runtime lists. In a
  test, choose a zone the runtime lists (Asia/Tokyo), or start from a mocked
  `resolvedOptions`. The server takes both names.
- evidence: iteration 3; web/src/lib/caseForm.ts, zoneChoices; curl with Asia/Calcutta gave 200.

## 2026-09-29, iteration 4: product round 1, sections 1, 2, 3, 5, 6 and 7 (run l-web-d1622b0c58)

### Read

web/PROGRESS.md, specs/product-1/SPEC.md, specs/product-1/SPEC-resolutions.md, CLAUDE.md,
contracts/engine_output.schema.json, contracts/case_f1.schema.json, engine/f1.py (questions,
`_answer`, `_facts`, `_add_next_step`, `_lists`), engine/verdict.py, api/main.py,
design/canvas/DESIGN-SPEC.md, tools/copy_lint/lint.py, the regimes in rulepacks/f1-us.

### Built

- compute.ts: the parser takes `reading` on each item (required), `about` on a question, dotted
  question ids, `upcoming` and `lists` (both required, strict). It refuses a date ahead or a list
  that names a rule with no source, and a date ahead with alternates and no operative regime.
  `cpt_full_time_days` is `number | null`. A confirmation carries `about`.
- caseForm.ts (section 2): the CPT field starts empty and an empty field is sent as null, never
  0. `answer` keeps the `about` of the question with the answer (section 3, resolution 7).
- Section 1: each of the 13 conflicts has one line that says what does not fit and never which
  date is wrong. The question reads "Are these the dates on your documents?", shows the values
  from `about`, and offers "Yes, they are the dates on my documents" / "No, I will correct them".
  A confirmed conflict (a talk_to_dso reason) reads the line plus "You answered that these are
  the dates on your documents. What they mean is a question for your DSO."
- Section 2: words for `nothing_more_to_record`, `full_time_cpt_used`, `missing:training`,
  `missing:cpt_full_time_days`.
- Section 3: every answer, first or changed, is sent with the `about` the engine gave. The
  screen never builds an `about` of its own.
- Section 5: a "Duly's reading" tag on the row, in the verdict line (through the item the reason
  rests on), and on each date ahead. The CPT line says "at or over Duly's count of one year in
  days", with the regulation's own quote and link beside it in the verdict.
- Section 6: "What comes next" under the verdict: `upcoming` in the engine's order, then the list
  with the SPEC's line above it, each quote with its citation and link, the first `next.` date
  beside the list, and a question for the DSO from a template, the OPT card dates the person
  sent, and the engine's `next.stem.*` dates. "Copy the question" uses the clipboard. Nothing is
  sent. "What the rule says" no longer repeats rules named by `upcoming` or `lists`.
- Section 7: the three unemployment names. A value with alternates shows one value, the one in
  force, and under it one button line: "A rule change is blocked by a court. See what it would
  change." for `enjoined` (other statuses: "A rule change is <words>."). Opening it shows the
  other value, "Legal status in the rule pack: <the pack's word>" for both regimes, and the rule.
- Styles for the new parts, from the tokens.

### Choices a reviewer may want to look at

- `upcoming` holds both `grace.ends` and `next.grace.ends` with the same date. The screen shows
  both, and names the second "Grace period ends, counted from the OPT EAD end date". It drops
  nothing the engine sent (request 7).
- The court's order is not in the engine output, so the opened rule change shows the other
  value, the pack's legal status word and the rule, but not the order (request 6).
- The DSO draft says "Duly, a record keeping tool, computed these dates from my card" and marks
  a date that rests on a reading. It asks whether the paragraph applies and what the office
  would need. It states no conclusion.
- Tests of mine that asserted the older behaviour were changed to the SPEC: the item names, the
  two regimes side by side (now one value and a disclosure), and CPT 0 (now null when empty).

### Ran

```
bash -c 'npm run typecheck -w web && npm test -w web && npx eslint web --max-warnings 0 && npx prettier --check "web/**/*.{ts,tsx,css,html,json}" && uv run python -m tools.copy_lint.lint'
```

Printed: typecheck clean; Test Files 5 passed (5), Tests 178 passed (178); coverage statements
96.53%, branches 92.64%; eslint clean; "All matched files use Prettier code style!"; "copy lint:
clean". Exit code 0.

Earlier runs of it: one failed eslint on four unused destructured names in a test of mine; one
failed typecheck on a helper that duplicated one already in the file.

Also ran: `npm run build -w web` (built). `compute_f1` on the real pack, FixedClock
2026-09-29 18:00 UTC, eight cases (nothing entered, CPT null, OPT only, a filing after today,
CPT 400, OPT and STEM with a gap, cap-gap alone with a late petition, both D41 answers given).
All eight parsed with `engineOutputSchema` in a throwaway test, since deleted; every reason and
every question id had words.

### Not done, not verified

- Not seen in a browser. jsdom tests, the real engine run, and a build only.
- The api was not run; api/main.py on this branch still calls `parse_case(raw)` without the
  clock (resolution 8 is L-api's).

### Requests for files this lane does not own

6. contracts/engine_output.schema.json and engine/f1.py: SPEC section 7 says opening the rule
   change shows the court's order from the saved source. The output carries no source for the
   other regime. Request: give each alternate its rule (quote, citation, url) and the order.
7. engine/f1.py: `upcoming` holds `grace.ends` and `next.grace.ends` with the same date and
   rules. Say whether both are meant.
2, 3 and 5 of iteration 1 to 3 stand.

## Lesson

- failure: `npx prettier --write "src/**"` run from inside web/ did not read the root
  .prettierignore and rewrote the generated web/src/lib/api-types.ts.
- fix: run prettier from the repo root with the done command's glob, and check git status for
  files you did not mean to touch.
- evidence: iteration 4, `git diff --stat web/src/lib/api-types.ts` showed 442 lines; restored
  with git checkout.

## 2026-09-29, iteration 5: finish product round 1 (run l-web-a29d50ac19)

### Done

- `git merge lane/L-web/l-web-d1622b0c58`: merged, no conflicts (12 files under web/). git
  printed "tests/holdout/...: Operation not permitted" because the sandbox denies reads there;
  the merge itself completed and the tree is clean.
- Checked that contracts/, engine/ and api/ did not change between the earlier run's base and
  879feb4, so the earlier parser and screens still match the contract. The done command passed
  on the merge alone: 178 tests.
- The one open item was motion from design/canvas/DESIGN-SPEC.md. web/src/styles.css now has:
  button press scale(0.97), row hover background over 0.16s, and disclosures (`.working`)
  dropping in over 0.28s on the entrance curve. Only transform moves, so the content is there
  without the animation. Everything is off under prefers-reduced-motion. No amber.
- web/src/styles.test.ts: reads styles.css and checks those rules, the reduced motion block,
  and that there is no amber. web/vite.config.ts: `test.css.include` for styles.css, because
  without it vitest returns an empty string for `styles.css?raw`.

### Ran

The done command, as written: exit 0. Test Files 6 passed (6), Tests 183 passed (183);
statements 96.53%, branches 92.64%; eslint clean; prettier clean; "copy lint: clean".
`npm run build -w web`: exit 0.

### Not done, not verified

- Still not seen in a browser against a live api.
- Requests 2, 3, 5, 6 and 7 stand.

## Lesson

- failure: `import css from "./styles.css?raw"` gave an empty string under vitest, so four of
  five new tests failed on ''.
- fix: set `test.css.include` to the stylesheet in web/vite.config.ts.
- evidence: iteration 5, `npx vitest run --root web src/styles.test.ts`, "expected '' to contain".
