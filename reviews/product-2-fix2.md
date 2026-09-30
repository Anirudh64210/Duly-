# Review: product-2, fix round 2 (specs/product-2/resolutions.md point 15)

Run l-review-c18232d7c2. Reviewed commit 66bbfae. The diff is 6585ae9..66bbfae (30 files):
engine/path.py `_closed`, the pack (three new rows, the `stem` windows, the grace entry), the
web Onboarding, desktop/src/shots.ts and shotrun.ts, the Makefile target, tests/design, and the
acceptance and holdout journeys.
Specs: specs/product-2/resolutions.md (points 1 to 15), reviews/product-2-fix1.md,
specs/path-1/journeys.json, PRINCIPLES.md, BOUNDARY.md, CLAUDE.md.

## What ran

- `uv run pytest tests/unit tests/holdout -q -p no:cacheprovider --ignore=tests/unit/tools`: exit 0.
- copy lint clean, ruff clean, `tools.sources.verify` exit 0 ("every quote found").
- Web, on a copy under TMPDIR: `tsc --noEmit` exit 0; `vitest run` 522 passed. The 3 failures in
  that run were my own walk drivers from the last round, before I added the new views.
- Desktop, on a `git archive HEAD` copy: `vitest run` 10 files, 123 passed.
- TMPDIR/rvc18/journeys.py sent all twenty journeys (the builders j01 to j20 of
  tests/unit/acceptance/test_journeys.py) through POST /v1/compute with TestClient and a FixedClock
  at 2026-09-29 16:00 UTC. All returned 200, all cannot_tell with reasons. I compared the output
  line by line with the fix 1 run (TMPDIR/rv3a/journeys.txt).
- Onboarding walked for J01 (71 views), J08 (62) and J16 (49) by pressing Continue, with a
  title-keyed click driver. It pressed "I'm not sure" for the days the journeys do not give. It saved
  each posted case, and TMPDIR/rvc18/send.py sent each case to the real route.
- `make design-shots` on the archive copy: web and desktop build, then Electron stops with
  SIGTRAP ("bootstrap_check_in ... Permission denied"), the sandbox. No shot was drawn, so
  I could not compare any shot with its canvas PNG.

## The twenty journeys through POST /v1/compute

Everything that fix 1 found right is still right, apart from the lines below. I checked each
changed date by hand.

- J04: concluding evaluation 2022-08-15 to 2022-08-25 (release date plus 10). validation_1
  2021-12-22, validation_2 2022-06-22 to 2022-07-07 (July 4 skipped). validation_3 and _4
  hold no date. Right.
- J06: `opt_post.p1` is no longer next. Right.
- J12: no grace.h1; cap_gap.h1 ends 2026-10-01. Right, as point 15 says.
- J14: concluding evaluation 2026-07-15 to 2026-07-25. validation_3 2025-12-01 to 2025-12-15.
  Right.
- J15: validations 2025-12-15 to 2025-12-30 (Christmas skipped), 2026-06-15 to 06-30 and
  2026-12-15 to 12-30. validation_4 (2027-06-15, the day after the card) has no date. Right.
  The Job B final evaluation that the journey dates 2025-11-10 is not shown (finding 3).
- J19: validation_4 (2028-06-09, the day after the card ends 2028-06-08) has no date. Right.
- J01, J02, J03, J05, J09, J11, J20: wrong. The *next* STEM stage now carries validation and
  concluding-evaluation dates, and they are listed under upcoming (finding 1).

## Onboarding for J01, J08 and J16

- J08: the second job, "A job on campus / At School A, Master's", is taken, and Continue moves on.
  The posted case holds `w2 {on_campus: p1}` with no `under`. The route gives OPT a1 ending
  2025-01-12, unemployment 35, and MS windows 2026-09-19 to 2027-02-16. "Its dates hold the
  start" is no longer shown on the bachelor's card for that job. Right.
- Every view logged in all three walks has a why line (0 of 182 without one).
- "I'm not sure" works for the course requirements day, the DSO day on a CPT, the DSO
  recommendation day, the decision day, and the move's told-school, new I-20 and contacted-new-DSO
  days. The route then asks for `a1.dso_on`, `a2.dso_on`, `mv1.contacted_new_dso_on` (J01) and
  `p2.coursework_done_on` (J08).
- The withdrawal question is asked, and `complete.withdrawal` is in every posted case.
- Field problems keep DSO and I-20: `inSentence` lowercases only a first word like "The".
- J01 walked: 49 and 47 days as before. The posted case also gets the wrong STEM dates of
  finding 1 (validation_1 2026-12-15, concluding evaluation 2027-06-14).
- J16 walked: CPT 82 and 2 months; unemployment 106 with the at-or-over item; no STEM step.

## The findings of reviews/product-2-fix1.md

1. Closed for J04 and J14. The change opens finding 1 below.
2. Closed. The on-campus job walks through (J08 above).
3. Closed. J06 has no next opt_post.p1. I checked that J11's next STEM stage still drops after
   its apply window closes (clock 2026-10-05: no STEM stage).
4. Closed. No view without a why line in the three walks, and no `why: ""` left in onboarding.ts.
5. Closed. Each date named in point 15 takes "I'm not sure".
6. Partly. The Makefile target, desktop/src/shots.ts and tests/design/landmarks.json exist
   (9 canvas screens, 573 landmarks, `measured_in_a_browser: false`). The target cannot run in
   this sandbox. Nothing compares a shot with a landmark, and the samples it draws from are stale
   (finding 5).
- Note 1 (J12 grace): closed by point 15.
- Note 4 (lowercased names): closed. Note 5 (`complete.withdrawal`): closed.
- Notes 2, 3 and 6 are not in point 15 and stand as they were.

## Findings

1. Blocking. rulepacks/f1-us/v2026.09/parameters.yaml, stage `stem`, windows
   `stem.validation_1` to `_4` (line 1778 and the aliases after it) and `stem.evaluation_final`
   (line 1901). Each looks up `record: authorization where this.id same_as outer.id`. For the next
   STEM stage, which the path builds before any STEM card exists, `outer.id` is the post-completion
   OPT card, so the lookup finds that OPT card and dates the STEM reports from it.
   - J01: stem.a2 is next (apply window 2027-03-16 to 2027-06-14). The route gives "First validation
     report" 2026-12-15 to 2026-12-30 (the OPT card start 2026-06-15 plus 6 months) and "Concluding
     evaluation" 2027-06-14 to 2027-06-24 (the OPT card end). Both are under upcoming, 77 and
     258 days away. The fix 1 output had None for both.
   - J11: "Concluding evaluation" opens 2026-09-30, one day away, for a student who has never
     held a STEM card.
   - J02: validation_1 2026-07-20 to 2026-08-03, a window in the past, on a stage not yet applied for.
   - The same happens in J03, J05, J09 and J20, and in the web sample path-stem-next (2026-08-10).
   - (f)(12)(ii)(B), the pack's own quote: validation reporting "starts on the date the 24-month
     OPT extension begins". There is no extension here, so there is no report to date. These are
     wrong dates on SPEC journeys, shown to the student as coming. No acceptance test asserts
     that the next STEM stage has no report dates.
2. Should fix. The same windows drop every validation after the day a job ended, while the STEM
   extension goes on. Input: J15 without Job C (w4), work list stated whole. The STEM card runs
   2025-06-15 to 2027-06-14 and Job B ends 2025-10-31. All four validations hold no date, with no
   reason and no question. The pack cites (f)(12)(ii)(B) (stem.validation_ends_with_extension,
   verbatim): reporting "ends when the student's F-1 status expires or the 24-month OPT extension
   concludes, whichever is first". A job's end is neither. A student between jobs on STEM OPT
   is still on the extension and is counting unemployment days. Point 15's words "or the
   training ends" can be read this way, so I raise it as a dispute between point 15 and the quote,
   not as a build fault. The same happens with the work list not stated whole: J15 with Job C
   ended 2026-08-31 loses validation_3 (2026-12-15), although the student may have a job not yet entered.
3. Should fix. J15 journey: "2025-10-31 last day at Job B. Loss of employment report and Job B final
   evaluation due 2025-11-10." The route gives stem_job_end.report.w3 2025-10-31 to 2025-11-10,
   but no final evaluation for Job B, and no reason or question. The note on
   stem.opportunity_ends_with_job says so ("the earlier one is not dated"). But a silent gap on a
   SPEC journey reads as nothing due.
4. Should fix. web/src/lib/views/onboarding.ts line 1562. Answering Yes to "Have you withdrawn from
   classes" creates the withdrawal with `program` already set to the first F-1 program. So
   "Which program did you withdraw from?" opens with that answer checked
   (aria-checked "true"), and Continue passes without a choice. Input: a walk to that view.
   It shows `[["School A, Master's","true"]]`, and Continue goes to "The day of the withdrawal". With two
   programs (J08), the master's is chosen for the student. PRINCIPLES 2: confirm, never assume.
5. Should fix. web/samples/path-stem-next.json and path-window-open.json, the "engine samples"
   that point 15 has the shots drawn from, are not what the engine gives now. Recomputed with the
   saved cases and days, `unemployment.opt_card.a2` and `unemployment.total.a2` are None where
   the samples hold 5. `stem.validation_1.opens.a2` is 2026-08-10 where the samples hold None
   (finding 1). The shots would picture an output the engine does not give.

## Notes

1. Electron cannot start in the reviewer's sandbox (SIGTRAP at mach port rendezvous), so no shot
   was drawn and none was compared with design/canvas/png. `drawn` in shotrun.ts only checks
   that #root has a child, so a shot with an error screen still counts as drawn.
2. The why line "If you do not know a day, choose I'm not sure and Duly asks again later"
   is not kept for J16. With the course requirements day left unknown, the route asks nothing
   about it, because no rule in J16 reads it.
3. The J08 walk leaves the decision day unknown, and the route does not ask for it. That is
   fine as long as no rule reads it.

## Scores

- correct 1: seven SPEC journeys (J01, J02, J03, J05, J09, J11, J20) now show STEM report
  dates that do not exist. Point 15's own inputs (J04, J06, J12, J14, J19) are right by hand.
- sourced 3: the three new rows are quoted and found, and readings are marked. But finding 1
  cites (f)(12)(ii)(B) for dates it rules out, and finding 2 drops dates that quote keeps.
- never_assumes 3: "I'm not sure" is in and each unknown day is asked. But the withdrawal program
  is preselected (finding 4), and validations drop quietly on a work list not stated whole
  (finding 2).
- inside_the_boundary 4: no string states a conclusion about the person. The wrong report
  dates are shown as coming obligations.
- secure 4: nothing new takes outside input beyond the case contract. The shots page is refused
  in the app window (refusedInApp, tested).
- tested 2: the acceptance and holdout suites pass with finding 1 in place on seven journeys, and
  with findings 2 and 3.

Mean 2.83, below 4.3. Four lines are below 4, and one blocking finding stands.

VETO
