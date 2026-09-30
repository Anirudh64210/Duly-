# Review: specs/ui-1 fix 1 (points 5 to 8), commit 734d70a

Reviewed commit 734d70a (merges bfc12f1 from L-web and 633302f from L-desktop) against
specs/ui-1/SPEC.md points 5 to 8 and the six findings of reviews/ui-1.md. Diff ea374a0..734d70a:
web/src/lib/labels.ts, labels.test.ts, web/src/app/Home.tsx, app.css, ui1.test.tsx,
desktop/src/shots.ts, shotrun.ts, shots.test.ts.

## What ran

- On a copy of HEAD in TMPDIR: web tsc exit 0, web vitest 591 passed (31 files), desktop tsc
  exit 0, desktop vitest 146 passed, `npx eslint web desktop --max-warnings 0` exit 0. In the
  worktree: copy lint "clean", tools.sources.plain exit 0.
- Every question the pack can ask, listed from engine/path.py: `missing:<record>.<field>`
  (_need), `conflict:<check>.<record>` (_check), `conflict:<record>.<field>.after_today`,
  `conflict:<stage>.<record>.ends_before_starts` (_span_conflicts), `unconfirmed:complete.<kind>`,
  `typed_dates.from_documents`, `typed_dates.checked.<record>.<field>`, and
  `record.ends_before_today`. The pack has no top-level facts, every stage and every conflict
  check has a for_each, and no span has a `longest`, so no other form is reachable.
- TMPDIR/rvu/ids.py ran engine.path.compute (FixedClock 2026-09-30 16:00 UTC) on
  path-stem-next.case.json and four variants (trip back before it left, CPT card ending before
  it starts, a trip after today, one record of every other kind). 42 distinct question ids.
  A scratch vitest printed questionTitle and becauseLine for each, plus typed_dates.checked,
  record.ends_before_today, complete.employer and two more span ids. A second scratch vitest
  rendered Home on three of the outputs and printed the Why lines and the question rows.
- Point 7 was not run live: Electron cannot start in this sandbox, as in reviews/ui-1.md.

## Earlier findings (reviews/ui-1.md)

1. Closed for fields, lists and typed dates. On path-stem-next, Why reads 21 lines, one per
   question or reason, for example "Trip abroad 1: Was there a job to return to?" and "Is this
   every job, through today?". Open for conflicts: see new findings 1 and 2.
2. Closed for the sample: the questions meta reads "Asked because nothing is entered for it
   yet." (8), "Asked because Duly waits for your answer before it goes on." (8) and "Asked
   because some dates you typed are not checked yet." (1). Open for span conflicts (finding 1).
3. Closed as asked: WHY_LINES is written out literally (point 6), the id test covers dots,
   underscores and both turned into spaces, and bans any snake_case word. The old mutant
   ("Duly needs your a1 dso on.") now fails the id test and WHY_LINES. It runs on one sample only
   (finding 3).
4. Closed in code: SHOT_WINDOWS is 1280x832 and 390x844, widthScript reads
   document.documentElement.scrollWidth and window.innerWidth, fitsWindows fails closed when a
   window is not measured or not at its width, shotsJson records widths and fits per shot, and
   shotsExitCode returns 1 for a shot that does not fit. Six new tests pin it. Not run live.
5. Closed: Home is headline, the count line, Why, the metrics, then YOUR NEXT MOVE, and a test
   checks the document order.
6. Closed: openQuestionsLine is gone and the count line is a literal in Home.tsx; the .why,
   .why .reason and .next-move rules are gone.

## New findings

1. blocking. A reversed date shows an id on Home, the thing point 5 forbids.
   Input: path-stem-next.case.json with t1 returned_on 2026-04-20 (left_on 2026-05-01), or a1
   card_end 2024-05-01 (card_start 2024-06-01). The engine asks `trip.t1.ends_before_starts`
   (or `cpt.a1.ends_before_starts`, engine/path.py:763). pathTitle (web/src/lib/labels.ts:700)
   has no branch for `<stage>.<record>.ends_before_starts`: the last part is not a record id and
   the first is a stage, not a record, so it returns null. Home then shows the row "Duly has a
   question about what you entered." with the meta "Asked because of: Conflict trip t1 ends
   before starts." (labels.ts:788), and Why shows the generic line. This is the id with dots and
   underscores turned into spaces. A typo in a date is an ordinary input. The same holds for all
   ten stages with a span (program, move, transfer, cpt, opt_pre, opt_post, stem, grace,
   withdrawal, trip).
2. should fix. Different checks on one record share one title, and Why folds them into one line.
   Input: path-stem-next.case.json with a2 filed_on 2025-01-02, card_start 2025-11-01, card_end
   2028-02-09. The engine asks opt_post.filed_in_window.a2, opt_post.card_fits_max_months.a2 and
   opt_post.starts_after_program_end.a2. Home shows three identical rows "Permission to work 2:
   Some facts entered do not fit together." (labels.ts:721), each "Asked because the dates
   entered do not fit together.", and Why shows one line for the three while the count line says
   20. A person cannot tell which answer each row wants. The mission is that every question has
   its own words; about 25 conflict checks in the pack have none. The labels.test comment at
   labels.test.ts:845 ("never share a title, so no reason is folded away") holds only for fields.
3. should fix (tested). The pack test lists fields, list kinds and typed dates, but not the
   pack's stages or checks, so finding 1 passes every test. Reading path.stages (each with a
   span) and path.checks (each non-judgement) from parameters.yaml, the same way packRecords
   does, and asking questionTitle and becauseLine for `<stage>.<prefix>2.ends_before_starts` and
   `<check>.<prefix>2` would fail today. The Home id test runs only on path-stem-next.
4. note. FIELD_WORDS and RECORD_KINDS (labels.ts) copy the pack's own label and complete_label
   by hand, with small changes ("What the trip was" becomes "What was the trip?"). The SPEC asks
   for the copy in labels.ts, and the pack test catches a missing kind, field or prefix, so this
   is not overbuilding. A label the pack changes later will not follow.
5. note. The after_today rows say "Asked because the dates entered do not fit together." for a
   single date after today. It is true enough, but "a date entered is after today" would match
   the title.

No other overbuilding found: recordName, fieldTitle and pathTitle each have two or more
callers, and PATH_BECAUSE is the three reason kinds. On the desktop side pageWidth,
fitsWindows and widthScript are each used by the run and the report.

## Boundary and rules

Every new string was read on the 42 ids. None states a conclusion about the person, none gives
a date or a count from a model, no clock is read, no user data is sent out. Each question keeps
the verdict at cannot_tell. The generic rows in findings 1 and 2 still ask, so nothing is
assumed. They ask in words that do not say what.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 2 | Points 6, 7 and 8 are met, and point 5 is met for fields, lists and typed dates. On a reversed date, a question the pack asks shows an id with spaces on Home (finding 1), and three checks on one record read as one (finding 2). |
| sourced | 5 | No rule, number or quote added. The words follow the pack's labels. |
| never_assumes | 4 | Every gap is still a question and the verdict stays cannot_tell. Three conflicts under one title cannot be told apart (finding 2). |
| inside_the_boundary | 5 | All 42 titles and becauses read; none is advice or a conclusion about the person. |
| secure | 5 | No new input path. The width measure races a timeout and fails closed; a window not measured counts as not fitting. |
| tested | 2 | Finding 1 passes all 591 web tests. The pack test does not read stages or checks, and the Home id test uses one sample. |

Mean 3.83. Two lines are below the minimum of 4, the mean is below 4.3, and there is one
blocking finding.

VETO
