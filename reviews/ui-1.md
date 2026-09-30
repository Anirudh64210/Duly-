# Review: specs/ui-1 (L-web, 3e3bda7)

Reviewed commit 3e3bda7 (merge of c71f461) against specs/ui-1/SPEC.md points 1 to 4, and
design/canvas/png/Main.png. Diff: web/src/app/Home.tsx, Onboarding.tsx, Pages.tsx, app.css,
ui1.test.tsx, web/src/lib/labels.ts, lib/shots.ts, web/src/shots.tsx.

## What ran

- On a copy of HEAD in TMPDIR: `tsc --noEmit` exit 0, `vitest run` exit 0 (every file passed),
  `npx eslint web --max-warnings 0` exit 0, `uv run python -m tools.copy_lint.lint` "copy lint: clean".
- Scratch vitest probes (TMPDIR/probes) that render Home, Your case and Onboarding from
  web/samples/path-stem-next.json and path-window-open.json and print what a person reads.
- One mutant on questionTitle (below).
- Point 2 could not be measured: chrome-headless-shell stops in the sandbox with
  "bootstrap_check_in ... Permission denied (1100)", the same wall the builder hit.

## What works

- Point 1, the hero. On path-stem-next the hero now reads: the headline "Can't tell yet", one
  line "17 answers would let Duly go on with your dates.", a closed "Why", the scope line, then
  "YOUR NEXT MOVE" with the row "Answer Duly's questions", which moves focus into the questions
  section. No reason line repeats. No "Duly needs your a1.dso on." and no
  "Duly is waiting for your answer to a question below." anywhere on Home. The count is the
  length of the engine's questions list, so no count is made up in the web.
- The line says "go on with your dates", not the SPEC's "finish your dates". That is the more
  honest words: the same case holds rule_in_litigation and rule_not_in_force_on_event_day, which
  no answer clears, so "finish" would have been untrue. I accept the change.
- Point 3. With no answers, Your case says "No answers given yet. Duly's open questions are on
  Home →" with a link to #/. With an answer the engine no longer reads (confirmations
  {"old.question": ...}), the existing "Answers not used for the facts entered now" part shows,
  so the heading is not left over nothing.
- Point 4. With the status fetch failing, step 1 says "Duly could not load its rules, so it
  cannot list the statuses it covers." and offers Try again, which refetches (the test counts two
  calls). No "Another status" card is offered alone. The shot run seeds ["status"] from the
  sample (shotStatus), so the shot shows the statuses.
- Nothing changes a date, a count or what is asked. No engine or pack file is touched.

## Findings

1. should fix. The "Why" collapses 17 different reasons into one line that names none of them.
   Input: path-stem-next (and path-window-open). questionCopy returns null for all 17 question
   ids (a1.dso_on, p1.immediate_cpt, t1.signature_on, complete.*, typed_dates.from_documents),
   so questionTitle gives "Duly has a question about what you entered." for every one, and the
   dedupe by line (Home.tsx Reasons, the `lines` Map) keeps one. Opened, Why reads five lines:
   "No document is attached...", "Duly has a question about what you entered.", the court line,
   the not-in-force line, "Something in what you entered needs an answer." Eight missing inputs
   and nine confirmations are one generic line. The SPEC's letter is met (same words as the
   questions section), but "the full reasons ... none dropped" is not met in substance: a person
   cannot tell from Why what Duly is missing. The words exist nowhere yet for these ids; the fix
   is plain question copy for them in labels.ts (QUESTIONS), not a new layer in Home.
2. should fix. Home still shows field ids, one section below the hero. Input: path-stem-next.
   The questions section meta (becauseLine, unchanged by this diff) reads "Asked because of:
   Missing a1 dso on.", "Missing p1 immediate cpt.", "Unconfirmed complete authorization.",
   17 rows, all titled "Duly has a question about what you entered.". This is the id the SPEC
   calls out, with its dot turned into a space. The SPEC scopes point 1 to the verdict block, so
   I do not block on it, but the mission asks that no id is shown, and the founder will see it.
   Same root as finding 1: no copy for these question ids.
3. should fix (tested). The id test would not catch the SPEC's own defect. Mutant: questionTitle's
   fallback changed to `Duly needs your ${questionId.replaceAll(/[._]/g, " ")}.` so the Why shows
   "Duly needs your a1 dso on.". ui1.test.tsx: 7 of 7 still pass. The test looks only for
   question.id and question.id with "_" swapped, never the dotted form turned to spaces, and the
   "each reason once" test builds its expected lines with the same formula as the code, so it
   cannot find a wrong word.
4. should fix (tested). Point 2 has no test and no measurement. The fix is overflow-wrap:anywhere
   on .page, flex-wrap on .metric-row, and max-width:100% on the shot root. Reading app.css, no
   rule left is wider than 1280 with the 208px sidebar or than 390 (widths 400, 560, 720 all
   carry max-width:100%; .inputs is 240px + 1fr, and 1fr can now shrink). I believe it holds,
   but nothing would fail if it regressed. A shot-run check (document.documentElement.scrollWidth
   <= innerWidth at 1280x832 and 390) in make design-shots would pin it.
5. note. Canvas order. Main.png is headline, calm line, the metrics, then YOUR NEXT MOVE. Home
   puts YOUR NEXT MOVE inside the hero, above the metrics, with the Why and the scope line
   between. Close enough to read as the canvas; the founder may want the canvas order.
6. note (overbuilding). openQuestionsLine (labels.ts) has one caller in the app (Home) and is
   imported by the test only to rebuild the same string; the plural branch is never reached on
   any sample. It could be the literal in Home. The .why and .why .reason rules (app.css) are two
   margins of 2px and 6px that .reason already nearly gives. Small; no need to hold the change
   for them. shotStatus, questionTitle (three callers) and the loading line are needed.

## Boundary and rules

No conclusion about a person, no date or count from a model, no clock read, no user data sent
out. The count line is a count of Duly's own questions. The DSO line for the not-in-force rule
now sits one tap away under Why instead of on the hero; the SPEC asks for that. A verdict with
gaps stays cannot_tell.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 3 | Points 1, 3, 4 work on the SPEC's sample; on the same sample Why reduces 17 reasons to one line naming none, and Home still shows ids in the questions meta (findings 1, 2). |
| sourced | 5 | No rule, number or quote added; the count is the engine's questions list length. |
| never_assumes | 4 | cannot_tell stays; the count line says "go on", not "finish", since litigated and not-in-force reasons remain; the DSO line moved behind Why. |
| inside_the_boundary | 5 | Every new string read; none states a conclusion about the person or reads as advice. |
| secure | 5 | No new input path; the failed fetch shows Try again and refetch; no crash on an empty or failing status. |
| tested | 3 | The id mutant survives all 7 tests; point 2 has no test (findings 3, 4). |

Mean 4.17. Two lines are below the minimum of 4 and the mean is below 4.3 (factory/config.yaml).

VETO
