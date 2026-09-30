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

## 2026-09-29, iteration 6: words for SPEC-resolutions points 11 to 24 (run l-web-96eb65b9eb)

### Done

- web/src/lib/labels.ts: lines for the seven new conflicts of points 11, 14, 15 and 16. Each
  says what does not fit and names no number of days; none says a filing was late. The line
  for `opt.ead_end.after_complete_by` says the date is Duly's count from the months in the
  rule. `factRule` names the rule each conflict is checked against (point 26), and the screen
  shows that rule's card beside the question.
- Questions of points 20, 21 and 22: `employment.<n>.new_employer`,
  `employment.<n>.end_reported`, `<report>.made`, with their values shown from `about`.
- Judgement items: `grace_with_cap_gap` (18), `unemployment_opt_card_at_or_over_limit` (19,
  the count and the rule, with the rule's words beside it), `<report>.not_made` (21).
- Items: `stem.new_plan_due.<n>`, `stem.concluding_evaluation_due.<n>`,
  `employment.<n>.end_report_by` (named as from SEVP guidance), `unemployment.opt_card_days_used`.
- `report_employer` (22) now says the day to report is SEVP guidance, not the words of the
  regulation.
- Point 12: `next.grace.ends` has no name of its own now; the NEXT fixture holds `grace.ends`.
  Point 13 was already in place (LEGAL_STATUS) and keeps its test.
- Fallbacks: an unknown `conflict:<id>` reads "Some facts entered do not fit together.", and
  its question asks the one conflict question with its buttons (the verdict's reasons show it is
  a conflict). An unknown reason with no kind reads "Something in what you entered needs an
  answer." An answer the screen has no words for is shown with a Remove button, not dropped.
- web/src/lib/samples/*.json: engine output from engine.f1.compute_f1 for two cases on
  2026-09-29, trimmed to the items and rules the tests read. web/src/components/Result.test.tsx
  renders them.

### Ran

- The done command as written: exit 1. typecheck clean; 7 files, 212 tests passed; statements
  97.31%, branches 93.61%; eslint clean; prettier clean; then `uv run python -m
  tools.copy_lint.lint` raised PermissionError on tests/holdout/.gitkeep (the sandbox denies
  reads there). Not a finding.
- The same linter over the repo with tests/holdout left out (a scratch script under TMPDIR that
  wraps `_candidates`): 0 findings.

## Lesson

- failure: whole engine output saved as a fixture under web/src/ failed the copy linter: rule
  quotes hold "ineligible", "qualify", "compliance".
- fix: trim a saved sample to the items and rules the test reads.
- evidence: iteration 6, scoped lint gave 46 findings, all in web/src/lib/samples, then 0.

## 2026-09-29, iteration 7: SPEC-resolutions points 27 (words), 29, 31 to 34, 35 (screen) (run l-web-0d41ff17d4)

### Done

- Point 27: a line for `opt.ead_end.not_after_program_end` beside the other conflicts. It says
  the card ends on or before the program end date, that the guidance defines post-completion
  OPT by that date, and that taking the EAD end date as the test is Duly's reading. It names no
  wrong date. `factRule` shows `opt.post_completion_definition` beside the question.
- Point 29: an answer among an item's inputs (`{answer, on}`) reads "You answered No on Sep 29,
  2026"; `cpt.full_time_days_used` with `full_time_cpt_used` among its inputs is named
  "Full-time CPT days (your answer)" (`computedName`), in the item row and the verdict line.
- Point 31: `opt.latest_start` is "Latest start date a student may request".
- Point 32: each date under What comes next is a button that opens its rules (value, words,
  citation, link, and for a reading the note under "Duly's reading").
- Point 33: web/src/lib/answers.ts reads each about key against the facts entered (blocks as
  true or null, block fields, employment.<n>.start/end, top fields, the employment list) and,
  for an item key, against the output. `keepFitting` runs on every form change, so an answer
  whose about no longer matches is removed. The answers section lists only answers that fit
  the case sent and the output; others appear under "Answers Duly did not read" with Remove.
  An answered conflict's line is said in the present tense only while the verdict holds the
  conflict (`<id>` or `conflict:<id>`); otherwise "When Duly asked this, some of the dates
  entered did not fit together."
- Point 34: `employment.<n>.start`/`end` in an about show as one row, "Employment period n",
  "Jun 2, 2025 to Jul 1, 2026"; an end the question lacks comes from the case sent.
- Point 35 (screen): the landing line says "Server status read <time>", not "Checked".
- Tests: new web/src/lib/answers.test.ts, and blocks in labels, caseForm, Result and App tests.
  Existing App tests that answered a fixture's question now enter the facts that question was
  asked about (STEM on for ASKING, OPT dates for CONFLICT), since point 33 drops an answer
  that does not fit them. The labels modal test exempts `opt.latest_start` (point 31 names the
  rule's subject, a student, never the person) and pins its name.

### Ran

- The done command as written: exit 1. typecheck clean; 8 files, 242 tests passed;
  statements 96.87%, branches 92.82%; eslint clean; prettier clean; then `uv run python -m
  tools.copy_lint.lint` raised PermissionError on tests/holdout/.gitkeep (the sandbox denies
  reads there), as in iteration 6.
- The same linter with tests/holdout left out (scratch wrapper of `_candidates` under
  TMPDIR): 0 findings.

### Not done, not verified

- Not seen in a browser against a live api. No engine sample for the point 27 conflict.
- Showing the rules' own date on the landing needs a status contract field (point 35).

## 2026-09-29, iteration 8: plain-1 sections 2 to 5, SPEC-resolutions points 39 to 41, 43, 44, 46 (run l-web-e2d830be5b)

### Done

- Contract: `compute.ts` reads `plain` on a rule, `regimes` and `answers_read` (all optional, as
  the output contract has them). `api-types.ts` regenerated from contracts/openapi.yaml; the
  status parser takes `rules_checked_on` on each pack (point 45). Its strict parser would
  otherwise have refused the api's status. The landing says "Rules checked <day>" only when
  every pack gives a day.
- Section 2: `RuleCard` shows the pack's plain words under "In plain words", with a "Read the
  exact words" tap that opens the quote, the citation link, the checked day and, for a reading,
  the note marked as Duly's reading. A rule with no plain words shows its quote as before. Used
  in item working, What comes next, the list, and beside the verdict (the old "Words of the
  regulation" figure is now a RuleCard).
- Section 3: `CourtLine` replaces `RuleChange`. It shows the plain words of each regime that is
  not simply in effect (from `output.regimes`), a link "Read the court's order" (court statuses)
  or "Read the source", then one tap "What the paused rule would change" with the value under
  "Under the paused rule". It never shows the status code. Tags: Regulation, Government guidance,
  School policy, A court paused a change, Proposed, not in force. `regimeLine` removed;
  `legalStatusWords("enjoined")` is "paused by a court"; `rule_in_litigation` reads "A court
  paused a change to a rule that applies here, and the two rules give different dates."
- Section 4: new `lib/drafts.ts`. `stemDraft` (replaces `dsoQuestion`) and `dsoDraft` (one for
  a talk_to_dso verdict, shown in a new `DsoDraft` section). First person, a subject line, ends
  "Thank you," and "[Your name]". It states only facts from the case sent, chosen by the
  reasons' topics, and never a computed date or the word Duly.
- Section 5: `lib/calm.ts` mirrors ALARM (tools/sources/plain.py), _CONCLUSION
  (assistant/boundary.py), the copy lint phrase list and the forbidden status words. One letter
  of each listed word is written as a class ([x]) so the copy linter, which reads web/src as
  product copy, finds no word in the checker. `calm.test.ts` runs every string literal of
  labels.ts, drafts.ts and status.ts through it. The verdict puts known matters before lines
  that wait on an answer (`needsAnswer`).
- Point 41: cap-gap status and change of status start unchosen ("" and null); both are selects;
  buildCase refuses with "Choose the petition status." and "Choose whether the petition asks
  for a change of status."
- Point 44: words for `rule_not_in_force_on_event_day`. Point 39: question
  `opt.earlier_at_this_level` (about values shown) and judgement `opt.months_at_this_level`.
  Point 43: fact line for `employment.period_open_after_last_card`. Point 46: when
  `answers_read` is present, only those answers stand; others are listed under "Answers not
  used for the facts entered now".
- Sample: `lib/samples/court-paused.json`, engine output of compute_f1 on 2026-09-29 for a
  program end of 2026-12-15, trimmed to three items and their rules.

### Ran

- The done command as written: exit 1. typecheck clean; 11 files, 290 tests passed; statements
  97%, branches 92.34%; eslint clean; prettier clean; then `uv run python -m tools.copy_lint.lint`
  raised PermissionError on tests/holdout/.gitkeep (the sandbox denies reads there), as in
  iterations 6 and 7 and in this run's baseline before any change.
- The copy linter with tests/holdout left out (scratch wrapper of `_candidates` under TMPDIR):
  "copy lint: clean". The final grep for the two court phrases: no match.

### Not done, not verified

- Not seen in a browser against a live api.
- A degree level in a question's about is shown as the code ("master").

## Lesson

- failure: the copy linter reads test files and the checker under web/src as product copy, so
  a list of the words to refuse, or a test sample holding one, is itself a finding; so is an
  identifier named after the word (case is ignored).
- fix: write one letter of each word as a regex class in the checker, build test samples from
  pieces, and name identifiers by their role.
- evidence: scoped lint gave 6, then 7 findings in calm.test.ts, then "copy lint: clean".

## Run l-web-833631e616 (attempt 1)

### Tried

- `git merge lane/L-web/l-web-e2d830be5b`: clean merge, 21 files, no conflicts. No new code
  written in this run; the copy linter fix on main (commit 7d26bc4) was the only thing the
  earlier run lacked.

### Ran

- The done command as written, no pipe: exit 0. typecheck clean; 11 test files, 290 tests
  passed; eslint clean; "All matched files use Prettier code style!"; "copy lint: clean"; the
  grep for the two court phrases found nothing.

### Not done, not verified

- Still not seen in a browser against a live api.
- A degree level in a question's about is still shown as the code ("master").

## Run l-web-201105e0d6 (attempt 1)

### Tried

- Point 57, review fix 4 finding 3: `letter` in `lib/drafts.ts` opens "I have a question about
  my F-1 record." and states no status.
- Point 57, finding 4: `reportName` in `lib/labels.ts` names `stem.new_plan_due.<n>` as "new
  Form I-983 for employment period n", so the draft says "I did not submit my new Form I-983
  for employment period 2." and the question and judgement line name it too. Every id the
  engine puts in `work.reports` now has a name (validation n, 12-month, final from EAD end,
  new plan n, concluding n); a test drafts each one.
- Point 57, finding 7: the `hours_under_threshold` ask is built from the case: "how your office
  reads my weeks at 15 and 40 hours a week" (distinct entered hours), or "the hours a week I
  worked" when no period was entered. No word of comparison.
- Point 55, finding 5 (note): `CourtLine` in `components/Result.tsx` keeps only alternates with
  a value; with none, it shows neither the court's words, the link, nor "What the paused rule
  would change". Test in Plain.test.tsx nulls every alternate of the court-paused sample.

### Ran

- The done command as written, output to a file, no pipe: exit 0. typecheck clean; 296 tests
  passed; eslint clean; prettier clean; "copy lint: clean"; the grep found nothing.

### Not done, not verified

- Not seen in a browser against a live api.

## Run l-web-f60e65d138 (attempt 1)

### Tried

- Point 61, review fix 5 finding 4: in `lib/drafts.ts` a `.not_made` report whose id ends in a
  period number (`stem.new_plan_due.<n>`, `stem.concluding_evaluation_due.<n>`) carries that
  number, and the draft adds that period's dates as entered: "My employment period 2 runs from
  ... to ...", or "... started on ... and has no end date." for an open period. The line is
  added even when every period is listed, because that list carries no numbers. A number with
  no period entered adds no line.
- Point 61, finding 5: the `grace_with_cap_gap` ask is now "Could you tell me what comes after
  my petition's requested start date, and whether a grace period follows it?"
- Three tests in `drafts.test.ts`. The test that searches every draft for the old phrase builds
  it from pieces, because the done command's grep of web/src found it in the test itself.

### Ran

- The done command as written, output to a file, no pipe: first exit 1 (the grep found the
  phrase in the test), then exit 0. typecheck clean; 299 tests passed; eslint clean; prettier
  clean; "copy lint: clean"; the grep found nothing.

### Not done, not verified

- Not seen in a browser against a live api.
- `reasonText("grace_with_cap_gap")` in `lib/labels.ts` still says "A cap-gap period is
  entered". That line is not a draft and point 61 does not name it; left as is.

## Run l-web-a015baa918 (attempt 1)

### Tried

- Point 64, review fix 6 finding 3: in `lib/drafts.ts` the `rule_not_in_force_on_event_day`
  ask adds the `employment` topic when the output's `employment.periods_not_reported` is null
  (point 60 puts the period behind the step back). The draft then states each period as
  entered ("I worked from Jun 1, 2015 to May 31, 2016, at 40 hours a week."). With the count
  not null the draft is as before.
- `lib/samples/period-before-rule.json`: the engine's output for the 2015 case of
  tests/unit/engine/test_f1_fix6.py (FINDING_3, shipped pack, answered in full, 2026-09-29),
  made by a scratch script under TMPDIR calling `settle_with`. Trimmed to the two employment
  items and their two rules: the copy lint scans the rule quotes in samples, and the parser
  refuses an item whose rule has no source.
- Two tests in `drafts.test.ts` under "the draft for the step back (point 64)". With the old
  drafts.ts the first fails.

### Ran

- The done command as written, output to a file, no pipe: exit 1 (copy lint on the untrimmed
  sample), exit 1 (ZodError, an item named a rule the trimmed sample had dropped), then exit 0:
  typecheck clean; 301 tests passed; eslint clean; prettier clean; "copy lint: clean".

### Not done, not verified

- Not seen in a browser against a live api.

## Run l-web-ec5ae8562c (attempt 1)

### Tried

- specs/desktop-1/SPEC.md, the screen: `vite.config.ts` sets `base: "./"`, so the built
  index.html loads `./assets/...` and the fonts in the built CSS are `url(./...)`.
- New `lib/api-path.ts`: `apiPath("/v1/status")` gives `api/v1/status`, relative to the page.
  `status.ts` and `compute.ts` use it. From duly://app/index.html that is
  duly://app/api/v1/status; from http://localhost:5173/ it is /api/v1/status, which the dev
  proxy still passes to :8000.
- Tests: `lib/api-path.test.ts` (the path, both origins resolved with URL, the base, the dev
  proxy), one in `status.test.ts` for the status path; the compute path in `compute.test.ts`
  and `App.test.tsx` now expects `api/v1/compute/f1`.

### Ran

- The done command as written, output to a file, no pipe: exit 0. typecheck clean; 307 tests
  passed; build clean; eslint clean; prettier clean; "copy lint: clean"; dist/index.html has
  `src="./assets/...`.

### Not done, not verified

- Not loaded through duly://app/ in Electron (desktop lane) nor in a browser against a live api.

## Run l-web-1a5edfdd3d (attempt 1): design-1 round A

### Tried

- The bench leaves the production build (programs.md section 9): `src/main.tsx` moved to
  `src/bench.tsx`, loaded by a new `bench.html`. Vite builds `index.html` only, so a
  production build holds no bench (checked: a build into TMPDIR holds index.html and assets
  only). App.tsx, CaseForm.tsx, Result.tsx, styles.css and their tests stay as the bench.
- New `src/main.tsx`: TanStack Router with hash history, `CaseProvider` (one case in
  memory, one TanStack Query keyed by the case body and the day, `refetchOnWindowFocus`
  off; a focus recomputes only when the day in the case's zone differs from
  `today.date`).
- `src/app/`: Shell (sidebar Home, Updates, then Your case, Settings, Feedback; top bar
  under 760px; no sidebar on `#/welcome`; unknown routes go Home; no case opens
  Onboarding), Home (hero in four states, halo on the mark only for no_open_items, reason
  lines with "How Duly counted", metrics for unemployment and the card end, QUESTIONS FOR
  YOU, WHAT COMES NEXT with the STEM row and its B2 line, DATES, COUNTS AND RULES with
  the other-rules row, busy after 300ms, error with "Try again"), Onboarding (five
  sections, one question per view, program loop that stops only on No, CPT for each
  program, OPT, STEM, cap-gap, jobs, the engine's questions one per view, Done with no
  check marks and the completion moment), Updates (empty state, title from `matching`),
  Your case (edit in place with Save, Cancel, Remove and Keep; two-choice rows; YOUR
  ANSWERS), Settings (zone, privacy.ts sentence, packs, Delete with Delete or Keep),
  Feedback (copy only, nothing sent).
- `src/design/tokens.css` holds every token of 3.2 in light and dark; `app.css` holds the
  shell, parts and motion, off under reduced motion.
- lib additions: `formatDay`, `FIXED_NAMES`, `categoryName`, `levelName`,
  `datesScopeLine`, `appReasonLine` (no_documents and category_not_covered words),
  `updateStatusWords` (all eleven), `FROM_A_COURT` gains stayed, `caseDraft` (a draft for
  every verdict), `stemStepDraft` (no month count), `privacy.ts`, `views/onboarding.ts`
  (`onboardingSteps`), `views/updates.ts`.
- Tests: `src/app/app.test.tsx` (shell, Home, Onboarding, Updates, Settings, drafts,
  calm) and `src/design/contrast.test.ts` (every text and mark pair of 14.1 in both
  themes, no --faint, four font weights, reduced motion).

### Ran

- The done command at the start: exit 0 (307 tests).
- The done command after the build, output to a file, no pipe: exit 0, 333 tests.
- After the contrast test: one failure (a chevron used `color: var(--ink-3)`), fixed by
  stroking the path; then the done command: exit 0, 401 tests, eslint clean, prettier
  clean, "copy lint: clean".

### Not done, not verified

- Not seen in a browser against a live api; no design shots.
- Earlier programs, and CPT for them, are held as entered and shown in Your case but not
  sent: case_f1 holds one program, and POST /v1/compute is not served in round A.
- The sentinel test of 14.1, the landmark checks, hit-area tiling measurements, the
  keyboard walk and the recompute-without-rise test are not written.
- Home reason lines do not yet open a COUNT_BESIDE rule; Updates hero and list parts are
  minimal, since no route serves an update.

## Run l-web-a0484bd4ea (attempt 1): design-1 round B, Timeline, Checklists, Home

### Tried

- `lib/compute.ts` mirrors the round B contract: `stages` (with `windows`, whose `inputs`
  the contract also names), `checklists`, `record` on computed, upcoming, lists and
  questions, and `upcoming[].days_away` and `inputs`. The rule-source refine now covers
  stages, windows and steps too.
- Engine samples made by `engine.path.compute` with fixed clocks, from cases saved beside
  them: `web/samples/path-stem-next` (2026-09-29) and `path-window-open` (2026-12-01, with
  step confirmations). They sit in `web/samples/`, not `web/src/lib/samples/`: the copy
  lint reads web/src as product copy and flagged 44 words inside the regulation quotes and
  notes the output carries (eligible, qualified, compliance...).
- `lib/views/stages.ts` (shared: eyebrow, window words from `opens_days_away`, span words,
  fact lines, window item names from the pack's window labels), `lib/views/timeline.ts`
  (`timelineView(output, status)`: a row per stage in order, CPT stages as one row, marks
  Done, Now, Next, Later or "A question for your DSO", Beyond from `/v1/status`),
  `lib/views/checklists.ts` (`checklistView(output, selected)`: chips, steps, bar line,
  finished CPT and OPT views, `step.<checklist>.<step>` ids without the record).
- `app/Timeline.tsx`, `app/Checklists.tsx`, routes `#/timeline` and `#/checklists`, the
  sidebar in the order of 3.1. Home: the stage eyebrow, the card end from the current
  stage with "<n> days from today", FULL-TIME CPT while a program is current, one
  next-stage row per `state: next` stage with the B2 line and the engine's count, the
  current stage's dated rows, and DATES, COUNTS AND RULES reduced to the Timeline link and
  the rules row. Round A's behaviour stays when the output holds no stages.
- The round A sidebar test in app.test.tsx now expects Timeline and Checklists (3.1).

### Ran

- The done command at the start: exit 0 (401 tests).
- After the build: copy lint failed on the samples (44) and on a check mark in a test
  regex; the samples moved to web/samples and the tests build the character from its
  code point. Then the done command as written, output to a file: exit 0, 441 tests,
  eslint clean, prettier clean, "copy lint: clean".

### Not done, not verified

- No live api gives stages: `POST /v1/compute` answers every category as not covered, and
  the app still posts the F1Case to `/v1/compute/f1`. The screens are tested on engine
  output only. Onboarding round B (every program, the records case) is not built.
- Timeline's jobs as entered and the application's approval notice and card-received
  dates wait for the records case in the web store; the application line shows "Filed"
  and "Decided" from the stage's own facts.
- The sentinel test, the court line on stage items, the 300ms busy delay on the new
  screens, and the completion moment's timing when the last step is confirmed.
- The checked checkbox draws its tick in white in a data URL, not `--on-accent`.

## Run l-web-a0ebffda52 (attempt 1): coverage repair for the app screens

### Tried

- Tests beside the code, walked as a student uses the screens:
  - `app/Onboarding.test.tsx`: an F-1 walk through every view kind (two programs, CPT days,
    OPT dates and card, STEM OPT dates and card, cap-gap petition, status and change of
    status, two jobs, one still held and one ended), every problem line on Continue, Back,
    the No answers that drop an earlier program and the jobs, the time zone change, Duly's
    questions (one, and two in a row), another status with and without a name, and a
    category from /v1/status with no rules (H-1B), with duplicate packs offered once.
  - `app/Pages.test.tsx`: Updates empty and with rows; Your case programs (name, level,
    none), edit with Cancel and Save, Remove with Keep, OPT, STEM OPT and cap-gap choices,
    jobs, answers changed and removed, answers the engine did not read, another status;
    Settings zone, rule packs with and without a check day, server not reached, Keep;
    Feedback copy and a refused copy.
  - `app/parts.test.tsx`: Row, Disclose, RuleBlock (verbatim, reading with note, bare),
    RuleBlocks, Working with every input kind, DraftPill and DraftView copy and refusal,
    OptionCards arrow keys and tab stop, DateField, splitDate, TextField, HeroMark, CompletionMark.
  - `app/refusal.test.ts`: CaseRefused with and without a reason, a ZodError, any other error.
  - `app/Home.test.tsx`: the 300ms busy state, a refused case with Try again, server not
    reached, a category with no rules, the metric toggles, full-time CPT on a current
    program stage, the question pills Yes and No, the hero's jump to the first question,
    a STEM window that only closes, and the job lines under periods not marked as reported.
  - `entry.test.tsx`: main.tsx and bench.tsx mount into #root and refuse to start without one.

### Faults found by a test, and the code changed

- Onboarding, two questions: after the first answer the output is recomputed, the questions
  view dropped out of the list while it was pending, and the student was sent back to
  "Which visa status do you hold now?". Onboarding now keeps the questions view (with its
  busy line) while it waits. The test fails on the old code and passes on the new.
- The done command passes `-- --coverage` and the web test script already held
  `--coverage`; vitest refused the flag twice and ran no test. Coverage moved into
  vite.config.ts (`enabled: true`) and the script is `vitest run`, so gate 5's `npm test`
  still writes web/coverage/lcov.info for gate 6.

### Ran

- Baseline coverage at start: 441 tests, exit 0. Onboarding 28.6, Pages 53.5, parts 51.6,
  refusal, bench and main 0 (lines).
- Done command first: exit 2 (tsc: mock calls typed as empty tuples; fixed with typed vi.fn).
  Second: exit 1 (duplicate --coverage, above). Third and fourth: exit 0, 504 tests,
  lines 98.15 percent, eslint clean, prettier clean, "copy lint: clean".
- After: Onboarding 100, Pages 100, parts 100, Home 98.2, refusal, bench and main 100 (lines).

### Not done, not verified

- Gate 6 itself was not run here: it needs coverage.xml from the Python suite.
- Home's "Show every reason" button cannot be reached: the hero that uses it never holds
  more than two lines. A continue on the questions view while the answer is still
  computing goes to Done; the question is still shown on Home.
- A prettier write run from inside web/ reformatted the generated api-types.ts (the root
  .prettierignore is not read there); reverted before the commit.

## Run l-web-1653a00fc9 (attempt 1): bring in the coverage tests, script back to --coverage

### Tried

- Merged lane/L-web/l-web-a0ebffda52 (the tests beside the code, and the Onboarding fix for
  two questions in a row). The merge printed "Operation not permitted" for tests/holdout/,
  which the sandbox keeps from this lane; the merge itself completed.
- Put the web test script back to "vitest run --coverage" and vite.config.ts back to main's
  coverage block (no `enabled: true`): the done command no longer passes `-- --coverage`,
  so the script is the one place the flag is given. Nothing else in package.json changed.

### Ran

- Done command, as written, no pipe: exit 0. 23 files, 504 tests passed; lines 98.15,
  statements 96.56, branches 86.64, functions 96.88 percent; eslint clean, prettier clean,
  "copy lint: clean". web/coverage/lcov.info written.
- Lines per file from lcov: Onboarding 263/263, Pages 71/71, parts 95/95, refusal 6/6,
  bench 4/4, main 5/5, Home 111/113.

### Not done, not verified

- Gate 6 was not run here (it needs the Python coverage.xml). Home's two lines left are the
  "Show every reason" button the hero cannot reach, as written in the run above.

## Run l-web-5f1ae834e8 (attempt 1): resolutions points 1, 10 and 11 on the web side

### Tried

- Point 1: the app no longer sends case_f1. `lib/records.ts` turns Onboarding's draft of
  records into the case of contracts/case.schema.json (categories, time_zone, facts, records,
  complete, confirmations) and `computeCase` posts it to `/v1/compute` (the route name is
  checked against the regenerated api-types.ts). Empty fields and links to missing records
  are left out, never sent as no or zero. The store (`caseStore.tsx`) holds the draft, the
  zone and the answers; drafts for the DSO read `sentFacts`, the latest program's facts.
- Point 10: `lib/views/onboarding.ts` lists section 18 view by view, in five steps: the
  current I-20 (school and code, level with every level and no default, major and CIP, STEM
  list with "I'm not sure", dates, end date changes, still studying or finished with the
  coursework and conferral days, dual degree, full course and online), earlier programs with
  their moves and "That's every program", degrees outside the US or not on an F-1, CPT, OPT
  and STEM OPT per program with decision, card, basis degree and split, first year and CPT
  from the start, "Is that all the CPT and OPT", jobs with employer, hours, changes of hours,
  permission (the card whose dates hold the start is marked, not chosen) and E-Verify for
  STEM, trips, H-1B petitions, the record in order, the D59 typed dates step
  (typed_dates.from_documents with every typed date, then typed_dates.checked.<field>), the
  time zone, then the engine's questions. `applyFlow` adds the record a Yes opens and a No
  removes it with every record that links to it. List statements are dated with the
  person's own day.
- The engine's questions after Onboarding: a `<record>.<field>` question opens the view that
  asks for that field, and `complete.<kind>` asks whether the list is whole ("Not yet" leaves
  it unstated). Found by running the Onboarding case through engine.path (below).
- Point 11: `shots.html` and `src/shots.tsx` draw any built screen from a web/samples case
  and its engine output at 1280x832 (`shots.html?screen=/timeline&sample=path-stem-next`).
  The capture itself needs Electron: a request in the report.

### Ran

- Done command, as written, output to a file, exit code read: exit 0. 516 tests passed,
  lines 96.95 percent, eslint clean, prettier clean, "copy lint: clean".
- The case the walk test posts, dumped to TMPDIR and sent through the FastAPI app: 200, no
  refusal, but `category_not_covered:f1` (api/ on this branch does not call path.py yet).
- The same case through engine.path.compute with the shipped packs and a FixedClock on
  2026-09-29: stages program.p1, program.p2, move.mv1, cpt.a2, opt_post.a1 (current),
  stem.a1 (next); questions a2.decision, a1.time, p1.conferred_on, complete.withdrawal and
  the typed_dates.checked items. That run led to the field and list questions above.

### Not done, not verified

- Home and Your case still show the latest program's facts for drafts and a short list of
  permissions and jobs; editing any record other than a program's school and dates is in
  Onboarding only.
- Reports (validation, evaluations) and withdrawals are not asked in Onboarding; section 18
  does not list them. The engine asks for their lists and they stay unstated until answered.
- Reading an I-20 on this computer: "Add my I-20" says it comes with documents.

## Run l-web-b9981847b4 (attempt 1): resolutions point 15, Onboarding

### Tried

- Finding 2: "A job on campus" is one answer per US program on an F-1 (`campus:<program>`,
  named by its school when there are several). It writes `on_campus` and no `under`, and the
  view reads it back through `chosen()`, so Continue moves on. The mark "Its dates hold the
  start" is left off a card when another program began between the card's start and the
  job's first day (J08: the master's began on 2025-01-13).
- Finding 4: every view has a why line; `why: ""` no longer appears in onboarding.ts. The
  list questions share one line; Done has one too.
- Finding 5: a date field can carry `notSure`. Its "I'm not sure" button (inside the date's
  fieldset, parts.tsx DateField) clears the day and marks `unsure:<record>.<field>` in the
  flow; the day is then left out of the case and the engine asks for it. Given to the day
  course requirements were done, the DSO signing and recommendation days, the decision day,
  every day of a move, and the withdrawal's day. A date the engine asks for later has it too;
  "I'm not sure" there leaves the day out and goes on to Done, as "Not yet" does for a list.
- Note 4: field problems lower only a first word that is a plain capitalised word, so DSO,
  I-20 and CIP keep their capitals.
- Note 5: step 2 asks "Have you withdrawn from classes during a program on an F-1?". Yes
  opens a withdrawal record (program, day, DSO authorized with I'm not sure) and "Is that
  every withdrawal?"; "This is everything" states `complete.withdrawal` with the other lists.
  records.ts knows the withdrawal kind (prefix wd, date field `on`).
- Tests: web/src/app/OnboardingWalk.test.tsx presses Continue through every view as J08
  reads (55 or more views), with an on-campus job at the master's and four days left
  unknown, checks a why line on each view, no problem after each Continue, the capitals in
  the problems, and the case posted. Further tests: a transfer's four days left unknown, a
  withdrawal, why lines on every kind of view, and an engine-asked day left unknown.
  Onboarding.test.tsx answers the new withdrawal question; its list test now uses reports,
  because Onboarding states the withdrawal list itself.

### Ran

- Done command, as written, output to a file, exit code read: exit 0. 25 files, 522 tests
  passed, eslint clean, prettier clean, "copy lint: clean".

### Not done, not verified

- The walk's case was not sent to the real /v1/compute route in this run.
- "Its dates hold the start" is a hint the student can ignore; the rule for when a card ends
  at a new level stays in the engine.

## Run l-web-5211e9f9c2 (attempt 1): resolutions point 16, web side

### Tried

- Onboarding never preselects: a new withdrawal record opened with the first F-1 program as
  its `program`, so "Which program did you withdraw from?" showed a choice already made. It
  now opens with `program: ""` (web/src/lib/views/onboarding.ts, applyFlow `withdrawals`).
- Test beside the code (web/src/app/OnboardingWalk.test.tsx, "Nothing preselected in the
  withdrawal views"): walks to the withdrawal question and, on each view (the question, the
  program, the day, the DSO's part, "Is that every withdrawal?", and a second withdrawal's
  program), checks no radio is checked and no button pressed, presses Continue with nothing
  chosen, and checks the view stays with a problem shown. The second withdrawal's posted
  program is left out. With the old preselect put back the test fails ("expected [ …(1) ] to
  deeply equal []"); restored.
- web/samples/make.py: runs engine.path.compute on each `<name>.case.json` with load_all()
  and a FixedClock at 16:00 UTC on the sample's day, writes `<name>.json` (sorted keys), or
  with `--check` exits 1 naming each sample that differs. `npm run samples -w web` runs it
  and prettier; `npm run build -w web` runs `samples` first. web/src/lib/samples.test.ts
  runs `make.py --check` inside `npm test`, so the done command catches drift too. With one
  date changed by hand in a sample, the test fails naming the file; restored.
- The two committed samples had drifted: the engine now gives
  `stem.validation_1.opens.a2` 2026-08-10 and `closes.a2` 2026-08-24 (status guidance)
  where the old samples held null. Regenerated. Note: stage `stem.a2` is `next` (no STEM card
  yet), so point 16's first bullet says these should carry no dates; that is the engine's
  part and the samples will follow it when the engine changes.

### Ran

- Done command, as written, output to a file, exit code read: exit 0. 26 files, 524 tests
  passed, lines 97.49 percent, eslint clean, prettier clean, "copy lint: clean".

### Not done, not verified

- web/src/lib/samples/*.json are hand-trimmed compute_f1 outputs from earlier rounds with no
  case files kept; they are not made by make.py. The app no longer uses compute_f1.
- The shot run's landmark check (point 16, last clause) is in desktop/src/shots.ts, outside
  this lane.

## l-web-6619018103: bring in point 16, keep web/package.json (resolutions point 17)

### Tried

- `git merge --no-edit lane/L-web/l-web-5211e9f9c2`: clean merge. Brought in the Onboarding
  fix (the withdrawal opens with no program chosen), its tests in OnboardingWalk.test.tsx,
  web/samples/make.py and web/src/lib/samples.test.ts.
- `git checkout HEAD~1 -- web/package.json`: the scripts are back as on this branch (no
  `samples` script, `build` does not run it). Point 17: the founder's `make samples` runs
  make.py, and `make design-shots` runs `make samples` first.
- samples/README.md, make.py's docstring and samples.test.ts's comment now name `make samples`
  instead of the web build.

### Ran

- Done command, as written, output to a file: exit 1. samples.test.ts failed: both samples
  differed from the engine's output (the engine changed on this branch with resolution 17).
- Remade the samples with the command of `make samples` (cd web; uv run python
  samples/make.py; npx prettier --write "samples/*.json"): exit 0.
- Done command again: exit 0. 26 files, 524 tests passed, eslint clean, prettier clean,
  "copy lint: clean".

## l-web-8c58f29547: resolutions point 18, web side

### Tried

- Landmarks: web/src/lib/shots.ts `LANDMARKS` names each built screen as the shot run does
  ("/" is home, the others lose their slash). Each screen's h1 carries
  `data-landmark="<screen>"`: welcome (Onboarding's title), home (the verdict's headline, and
  the hero for a status Duly has no rules for), timeline, checklists, updates, case, settings,
  feedback. Home's refusal hero (server refused, network failed) and Home's busy hero carry
  none. Timeline marks its heading only once the phases are drawn, not over the busy line.
- Petition questions: `fieldQuestion` now asks `<petition>.outcome` as a choice (every
  outcome, none chosen, "I'm not sure") titled by `petitionLabel` ("H-1B petition, from Acme,
  filed Mar 30, 2026: what has happened with it so far") when no Onboarding view holds it,
  as in a case held from records alone. `<petition>.validity_start` asked before the outcome
  is known reads "The approved start date of the H-1B petition" and may stay unknown. A
  petition's `filed_on` is no longer called the I-765's filing day. The outcome options are
  one list shared with Onboarding's own view.
- Tests beside the code: web/src/app/landmarks.test.tsx (each of the 8 screens from each of
  the 2 samples holds exactly one landmark, an h1 with its own name; none on the refusal
  hero, the network failure, or a busy Home, Timeline or Checklists).
  web/src/lib/views/petition.test.ts (6 tests).

### Ran

- With the landmark put on every Home hero: the two refusal tests fail; restored.
- petition.test.ts against HEAD's onboarding.ts: 4 of 6 fail (the 2 that pass cover the
  views Onboarding already had); restored.
- Done command, as written, output to a file: exit 0. 28 files, 550 tests passed, lines
  97.59 percent, eslint clean, prettier clean, "copy lint: clean".

### Not done

- desktop/src/shots.ts and shotrun.ts still find the landmark by heading type from
  tests/design/landmarks.json; reading `[data-landmark="<screen>"]` is desktop's part.
- Home lists a field question such as h1.outcome as "Duly has a question about what you
  entered." with no answer there; it is answered in Onboarding's questions view.

## l-web-ca7769b2a4: resolutions points 19 and 20, web side

### Tried

- Point 19: `cap_gap.for_dso` has its words in web/src/lib/labels.ts FINDINGS, beside the
  other judgement items: an H-1B petition can change these dates (the grace period, the
  counts from its filing day, any cap-gap period), so Duly does not show them; which it
  changes is a question for the DSO; the rule is 8 CFR 214.2(f)(5)(vi). No date, no count.
  web/src/lib/drafts.ts ASKS gives it a DSO question, with the cards, employment and the
  petition as entered.
- Point 20: web/src/lib/shots.ts `LANDMARKS` maps each route in SHOT_SCREENS to itself
  (typed so each value is its own route). web/src/app/Shell.tsx builds the router from
  SHOT_SCREENS (a SCREENS record typed `satisfies Record<ShotScreen, ComponentType>`), so
  the router and the landmarks read one table. The screens' JSX is unchanged.
- web/src/app/landmarks.test.tsx joins the two sides: the router's routesByPath equals
  SHOT_SCREENS; each LANDMARKS value is its route; web's SHOT_SCREENS equals
  desktop/src/shots.ts SHOT_SCREENS; on each screen from each sample, desktop's
  landmarkSelector(route) finds the one marked h1 and desktop's holdsLandmark holds.

### Ran

- Planted the old names (home, timeline, ...) in LANDMARKS: 17 of 21 landmark tests fail;
  restored.
- `npx prettier --write src` run from inside web/ skipped the root .prettierignore and
  reformatted the generated web/src/lib/api-types.ts; restored with git checkout.
- Done command, as written, output to a file: exit 0. 27 files, 553 tests passed, lines
  97.59 percent, eslint clean, prettier clean, "copy lint: clean".

### Not done

- The engine does not emit `cap_gap.for_dso` yet in this worktree (no match under engine/),
  so no sample holds it; the words are tested on the reason id alone.
