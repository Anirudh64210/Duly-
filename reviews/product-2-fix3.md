# Review: product-2, fix round 3 (specs/product-2/resolutions.md point 16)

Run l-review-1ff190a1d6. Reviewed commit 317ad86. The diff is 222aeed..317ad86 (15 files): the
pack (the `stem` validation windows, `stem.evaluation_final`, the new window
`stem_job_end.evaluation_final`, three notes), desktop/src/shots.ts and shotrun.ts, and the
acceptance and holdout journeys. No file under web/ changed, and engine/ changed no code.
Specs: specs/product-2/resolutions.md (point 16 and those before it), reviews/product-2-fix2.md,
PRINCIPLES.md, BOUNDARY.md, CLAUDE.md, plan-fix3.yaml.

## What ran

- `uv run pytest tests/unit tests/holdout -q -p no:cacheprovider --ignore=tests/unit/tools`: exit 0.
- `tools.sources.verify rulepacks` exit 0 ("every quote found"). `tools.sources.plain rulepacks
  --require f1` exit 0. Copy lint exit 0. `ruff check .` exit 0.
- Desktop, on a `git archive HEAD` copy under TMPDIR: `vitest run`, 11 files, 137 passed.
- TMPDIR/rv1f/journeys.py sent all twenty journeys (j01 to j20 of
  tests/unit/acceptance/test_journeys.py) through POST /v1/compute with TestClient and a FixedClock
  at 2026-09-29 16:00 UTC. All twenty returned 200 and cannot_tell with reasons. I diffed the whole output
  against the fix 2 run (230 diff lines) and checked every changed date by hand.
- Onboarding: I walked J01 (75 logged lines), J08 (66) and J16 (53) by pressing Continue with the
  title-keyed click driver, on a copy of HEAD's web/. I sent each posted case to the real route.
- Pack mutants in a scratch copy (TMPDIR/rv1f/m): (a) the `this.type in [stem_extension]` filter
  taken off the validations, (b) the approved-petition line taken out of `stem_validation_end`,
  (c) `stem_job_end.evaluation_final` taken out. Acceptance and holdout catch (a) and (c). (b)
  passes the whole unit and holdout suite.

## The twenty journeys through POST /v1/compute

Every date that fix 2 found right is still the same. Only the lines below changed. I checked
each one against the saved words.

- J01, J02, J03, J05, J09, J11, J20: the next STEM stage (no STEM card yet) now has no
  validation_1 and no concluding evaluation. Those dates are gone from upcoming. J01's upcoming list
  is now the apply window 2027-03-16 to 2027-06-14 and opt.complete_by 2027-07-15. (f)(12)(ii)(B):
  reporting "starts on the date the 24-month OPT extension begins". Right.
- J14: STEM card 2024-06-01 to 2026-05-31. validation_4's reporting date would be 2026-06-01, after
  the card, so it holds no date. validation_1 2024-12-01 to 12-13, validation_2 2025-06-01 to 06-13
  and validation_3 2025-12-01 to 12-15 are ten business days each, counted from the day after. The concluding evaluation
  2026-07-15 to 07-25 is unchanged. The new stem_job_end.evaluation_final.w2 has no date, because
  w2 is the last job and the stage's own concluding evaluation dates it. Right.
- J15: validations 2025-12-15 to 12-30 (December 25 skipped), 2026-06-15 to 06-30, and 2026-12-15 to
  12-30. validation_4 (2027-06-15, the day after the card) has no date. Job B:
  stem_job_end.evaluation_final.w3 runs 2025-10-31 to 2025-11-10, which is Job B's end plus 10 days,
  (f)(10)(ii)(C)(9)(i) "no later than 10 days following the conclusion of his or her practical
  training opportunity". The journey says 2025-11-10. Right.
- J04, J06, J12, J19 and the rest: no change from fix 2. J19's validations 2026-12-09 to 12-23,
  2027-06-09 to 06-23 and 2027-12-09 to 12-23 are right by hand, and validation_4 (2028-06-09, after
  the card ends 2028-06-08) has no date.

## Onboarding for J01, J08 and J16

web/ is byte for byte the tree of fix 2, and the three posted cases are the same bytes as in fix 2.
On the day the walk states its lists (2026-09-28), the route gives J01 unemployment 47 and 49, J08 35 and
J16 106 with CPT 82 days and 2 months, as before. J01's walked case no longer gets the STEM report
dates of fix 2 finding 1. On 2026-09-29 the same cases get null counts and are asked
complete.work, complete.trip and complete.move again, because the statements are a day old. That
is the behaviour of earlier points, not this diff.

The withdrawal walk still shows `[["School A, Master's","true"]]` on "Which program did you
withdraw from?". Continue then goes to "The day of the withdrawal" (finding 1).

## The findings of reviews/product-2-fix2.md

1. Closed. No next STEM stage in the twenty journeys carries a report date, and the walked J01 case
   has none either. Mutant (a) is caught.
2. Closed. J15 without Job C, list whole: validations 1 to 3 are dated to the card end
   (2025-12-15, 2026-06-15, 2026-12-15). The list not stated whole gives the same dates and asks
   complete.work. J15 with Job C ending 2026-08-31 keeps validation_3 on 2026-12-15. The note
   of stem.validation_ends_with_extension now says that a job's end does not end reporting.
3. Closed. J15 Job B gets its concluding evaluation from 2025-10-31 to 2025-11-10. Mutant (c) is caught.
4. Open. Finding 1 below.
5. Open. web/samples/path-stem-next.json and path-window-open.json, recomputed on their saved cases
   and days: `unemployment.opt_card.a2` and `unemployment.total.a2` are 5 in the samples and None
   from the engine. No script under web/ makes them. Finding 1 below.
- Note 1 (a shot counted as drawn when #root has any child): closed in desktop/src/shotrun.ts. A shot
  now counts as drawn only when the page holds text in its landmark's type. Tested in
  shots.test.ts and shots.page.test.ts. Electron still cannot start in this sandbox, so I drew no shot.
  See note 1 below.
- Notes 2 and 3 of fix 2 stand as they were.

## Findings

1. Blocking. Point 16's web side is not on this branch. The L-web commit 3db6249 ("point 16, web
   side: no presel...") is only on lane/L-web/l-web-5211e9f9c2, and `git merge-base
   --is-ancestor 3db6249 HEAD` is false. On HEAD, web/src/lib/views/onboarding.ts:1562 still runs
   `add(next, "withdrawal", { program })` with the first F-1 program.
   - Input: an Onboarding walk that answers Yes to "Have you withdrawn from classes during a program
     on an F-1?". "Which program did you withdraw from?" opens with "School A, Master's"
     aria-checked "true", and Continue moves on with no choice made. Point 16 says: "'Which program
     did you withdraw from?' opens with nothing chosen." PRINCIPLES 2.
   - web/samples still drift from the engine (fix 2 finding 5 above), and there is no
     web/samples/make.py rerun in the build. Point 16 asks for one.
   - No web test presses Continue through the withdrawal views with nothing chosen.
   The fix may already exist on the lane branch. It has to be merged and reviewed on this branch.
2. Should fix. rulepacks/f1-us/v2026.09/parameters.yaml:1787, the new last item of
   `stem_validation_end`. It takes the earliest `validity_start` of *any* petition with
   change_of_status yes and outcome approved. Nothing ties that petition to this STEM card or to
   today's F-1 status.
   - Input: J19 plus one petition h9 {type h1b, change_of_status yes, outcome approved, filed_on
     2020-04-01, requested_start 2020-10-01, outcome_on 2020-06-01, validity_start 2020-10-01}. That is
     an H-1B from years before the student went back to F-1 for this degree. The route drops all four
     validations of a STEM card that runs 2026-06-09 to 2028-06-08: validation_1 (2026-12-09,
     71 days away) and validations 2 and 3 become None. No reason and no question is added.
     Without h9, the same case gives 2026-12-09, 2027-06-09 and 2027-12-09.
   - Input: J19 plus h9 approved, validity_start 2027-10-01, cos_ended_on 2027-08-01 (the change
     of status ended before the H-1B start). validation_3 (2027-12-09) still drops, although the
     change of status ended. `stem_job_end.evaluation_final` and the evaluation windows read
     cos_ended_on, and this line does not.
   - capgap.status_ends_on_h1b_start (guidance, a reading) is about a petition that ends F-1
     status on its start date. An approved start in the past, before this card began, did not end
     the status the student holds now. A report that is due is shown as nothing due.
3. Should fix. That same line has no test. Mutant (b) takes it out, and every test in tests/unit
   and tests/holdout still passes. No journey or twin holds an approved change-of-status petition
   on a running STEM card.

## Notes

1. desktop/src/shots.ts:232 `holdsLandmark` compares type only: size, weight and letter spacing.
   Checklist, Onboarding and Updates all have the landmark 30px / 600 / -0.02em
   (tests/design/landmarks.json). So a Checklist shot that draws the Onboarding or Updates heading
   counts as drawn. Home's error hero (web/src/app/Home.tsx:502, refusalLines) uses the same
   h1.hero-headline, 40px / 600 / -0.02em, as the Main landmark. In the shot page, compute always
   resolves a saved sample, so I could not name an input that reaches that error hero. That is why
   this is a note and not a finding.
2. The validation windows show status guidance and reading true for every student, J19 with no
   petition among them. This is because capgap.status_ends_on_h1b_start is in their rule_ids. The
   dates of a student with no petition come from settled words. The same was true in fix 2
   (stem.opportunity_ends_with_job was in their rule_ids then).
3. J14: validation_4 (2026-06-01) is not dated during the cap-gap that follows the card. The pack
   reads the card end as the conclusion of the extension. Point 16 says validations exist "only
   while a STEM card exists", so this follows the SPEC.
4. Electron stops in this sandbox, so no shot was drawn or compared with design/canvas/png.

## Scores

- correct 1: the engine side is right on all twenty journeys by hand, and fix 2 findings 1 to 3 are
  closed. But point 16 names the withdrawal view, and it still opens with a program chosen
  (finding 1). An old approved petition also drops every validation (finding 2).
- sourced 4: every quote is found (verify exit 0), and the notes say how each row is used. The
  petition cutoff rests on a guidance reading that the pack marks as such. It is applied wider than that
  reading goes (finding 2), and the windows show guidance where the words are settled (note 2).
- never_assumes 2: the withdrawal program is still chosen for the student (finding 1).
  Validations drop with no reason or question on an old petition (finding 2).
- inside_the_boundary 4: no new string a person can read. The review found no conclusion about a
  person. A due report shown as nothing due (finding 2) is a wrong fact, not advice.
- secure 4: nothing new takes outside input. All twenty journeys, three walked cases and seven
  probes returned 200. The landmarks file is parsed defensively, and a bad file gives exit 1.
- tested 3: mutants (a) and (c) are caught. Mutant (b) passes every suite (finding 3). There is no web test
  for point 16 on this branch.

Mean 3.0, below 4.3. Three lines are below 4, and one blocking finding stands.

VETO
