# Review: product-2, fix round 1 (specs/product-2/resolutions.md points 1 to 14)

Run l-review-3a41706e57. Reviewed commit 6585ae9. The diff is 233625c..6585ae9 (53 files).
Specs: specs/product-2/resolutions.md, specs/path-1/programs.md (sections 10, 11, 14, 17, 18, 19, 22),
specs/path-1/journeys.json, specs/design-1/SPEC.md, PRINCIPLES.md, BOUNDARY.md, CLAUDE.md.

## What ran

- `uv run pytest tests/unit tests/holdout -q -p no:cacheprovider --ignore=tests/unit/tools`: exit 0, all passed.
- Web, on a copy of web/ under TMPDIR: `tsc --noEmit` and `vite build` exit 0 (one warning: a
  533 kB chunk). `vitest run`: 24 files, 516 passed.
- TMPDIR/rv3a/journeys.py sent all twenty journeys (the case builders j01 to j20 of
  tests/unit/acceptance/test_journeys.py) through POST /v1/compute with TestClient and a
  FixedClock at 2026-09-29 16:00 UTC, America/New_York. Every one returned 200.
- TMPDIR/rv3a/w/web/src/rv holds a click-through driver and one vitest file each for J01,
  J08 and J16. Each walks Onboarding from the status view to "You're set." with fireEvent,
  saves the case the app posted to /v1/compute, and logs each view's title and why line.
  TMPDIR/rv3a/send.py then sent each saved case to the real route. The clock there is
  2026-09-28, the day the web fixtures give; with 2026-09-29 the growing lists read as stale.

## The twenty journeys through POST /v1/compute

Every verdict is cannot_tell, and every one gives a reason. I checked the dates and counts
below by hand against the journey timelines and the pack values.

- J01: a1 windows 2023-02-11 to 2023-07-11, complete by 2024-07-12; a2 2026-02-14 to
  2026-07-14, complete by 2027-07-15; STEM a2 opens 2027-03-16. Counts 49 and 47, kept
  apart. stem.a1 is gone (point 6). Right.
- J02: OPT a1 windows right; STEM window 2026-10-21 to 2027-01-19. The ten-year item waits (point 7).
  The unemployment count is null because the work list is not stated whole (point 5). Right.
- J03: full-time CPT at master's 171 days, 4 months. No c<n>.decision asked (point 8). Right.
- J04: the STEM card ends on the release date, 2022-08-15 (point 12). Doctoral CPT 82 days, and
  opt_post.p2 is next with 2027-02-13 to 2027-07-13. Wrong: the concluding evaluation is
  2023-06-21 to 2023-07-01. validation_3 (2022-12-22) and validation_4 (2023-06-22) come after
  the card ended (finding 1).
- J05: part-time pre-completion OPT sets months at level to null with
  `opt.months_at_level.part_time.a2` (point 13). Post-completion windows right.
- J06: 370 days, 10 months, `bars_disagree.master` raised (point 7, finding 10 closed). But
  `opt_post.p1` is next, and its filing window closed on 2026-02-10 (finding 3).
- J07: CPT at both schools 164 days at the bachelor's level; opt_post.p2 next 2027-02-13. Right.
- J08: opt_post.a1 ends 2025-01-12. Unemployment is 35 (2024-06-03 to 2024-07-07). No STEM on a1.
  MS window 2026-09-19 to 2027-02-16, complete by 2028-02-18. Right (point 3).
- J09: windows from the end date in force on filed_on: 2025-09-20 to 2026-02-17, complete by
  2027-02-19. Right.
- J10: no grace for p1; p2.end_date asked. Right.
- J11: unemployment 86 (14 + 10 + 42 + 20); grace 2026-10-01 to 2026-11-29. Right.
- J12: cap_gap.h1 2026-06-01 to 2026-10-01; grace.h1 starts 2026-10-02 (point 4); count
  unemployment.opt_card.h1 0. As the SPEC table says (see note 1).
- J13: cap-gap ends on the denial 2026-08-14; `grace.after_cap_gap_outcome.h1` and no grace
  date. Right.
- J14: unemployment 40 and total 85; cap-gap ends 2026-07-25; job-end report 2026-07-15 to
  2026-07-25. Wrong: the concluding evaluation is 2026-05-31 to 2026-06-10. The journey says
  2026-07-25 (finding 1).
- J15: OPT 86, total 116; validation_1 2025-12-15 to 2025-12-30 (Christmas skipped). Right.
- J16: no STEM step, and no stem_list question for p0; CPT 82; windows right (point 8).
- J17: `p1.enrollment` steps back; window open 2026-09-19. Right.
- J18: program ends on the extended date 2027-12-17; windows from it. Right.
- J19: validations skip Juneteenth (2028-06-26); opt_post.p1 is gone from next; nothing
  asked about p0's STEM list or conferral. Right.
- J20: OPT on the MBA and no second master's OPT; STEM a1 next 2027-03-16. Right.

## Onboarding for J01, J08 and J16 (the built app, driven view by view)

- J16: 48 views. The case posted holds p1 (master, not_on_list), the foreign bachelor's as
  `where: outside_us` with its conferral day, CPT full time, the OPT card, and the study-abroad trip.
  No degree_level. The route gives CPT 82 and windows 2026-02-14 to 2026-07-14, with no STEM
  step. I stated no job, so unemployment is 106 (2026-06-15 to 2026-09-28) with the
  at-or-over item. Right for that record.
- J01: 70 views. Both programs, the transfer, both OPT cards and both jobs are sent. The route
  gives 49 and 47 and the same windows as the acceptance case. Right.
- J08: this walk could not be finished as the journey reads. The research assistantship
  cannot be entered (finding 2). Without it, the route gives the OPT end 2025-01-12 and 35
  days. Right for that record.
- All three: every level is offered (Associate to Other); "I'm not sure" appears where section
  18 names it; moves, trips, the petition question and the D59 step are there. Nothing is
  preselected.
- The walks also show three things the SPEC asks for that are missing: why lines on
  many views (finding 4), and a way to leave a date unknown (finding 5).

## The findings of reviews/product-2.md

1. Closed. POST /v1/compute calls engine/path.py (api/case.py). The web posts the records case
   from caseStore.tsx through records.ts computeCase.
2. Closed. J08 opt_post.a1 ends 2025-01-12.
3. Closed. J12 grace starts 2026-10-02 and is not done.
4. Closed. Counts are null until each list read is stated whole (J02, J05, J16 in the test case).
5. Partly. J01 and J19 are closed. J06 is still open (finding 3 below).
6. Closed. The cap-gap count is unemployment.opt_card.<petition> and runs to the cap-gap end (J12, J14).
7. Partly. Levels, no default level, moves, trips, "I'm not sure" and the D59 step are in. The
   on-campus job, the why lines and the dates that must be typed are not (findings 2, 4, 5).
8. Waits, as point 7 says.
9. Closed for J03, J16 and J19.
10. Closed. `cpt.full_time_days_at_level.bars_disagree.master` on J06.
11. Open. There is no `make design-shots` target, no desktop/src/shots.ts and no
    tests/design/landmarks.json. web/src/shots.tsx and web/src/lib/shots.ts draw one screen
    at 1280x832 from a sample, but nothing renders them or compares them (finding 6).
12. Closed. tests/unit/acceptance/test_journeys.py has 20 cases and 90 tests.
    tests/holdout/test_holdout_journeys.py has the hidden twins. Both pass. They would not catch
    findings 1 to 3.
13. Closed. `lists` carries stem.requirements for each OPT stage.
14. Closed in part. The J08 case has no ends_also fact, so I could not test ends_also on a shipped input.
    engine/f1.py `_statements` makes a list whole only from `complete.<kind>` (point 14).

## Findings

1. Blocking. rulepacks/f1-us/v2026.09/parameters.yaml, stage `stem`, windows
   `stem.evaluation_final` (line 1747) and `stem.validation_1` to `_4`. They read
   `this.card_end` and `this.card_start`, not the day the training ended.
   - Input J04: the STEM card ends 2022-08-15 on the release date. The output gives the
     concluding evaluation 2023-06-21 to 2023-07-01. The output also lists validation_3
     2022-12-22 and validation_4 2023-06-22, both after the card ended.
   - Input J14: the job ends 2026-07-15, during the cap-gap. The output gives 2026-05-31 to 2026-06-10.
   - The source is (f)(10)(ii)(C)(9)(i), the pack's own quote: the final evaluation is due "no
     later than 10 days following the conclusion of his or her practical training
     opportunity". So the right days are 2022-08-25 (J04) and 2026-07-25 (J14). Both
     journeys state those days, and programs.md section 22 says "reports dated only to that
     end" (J04) and "concluding evaluation from the job's end" (J14).
   - This is a wrong date on SPEC inputs, and no acceptance test asserts it.
2. Blocking. web/src/lib/views/onboarding.ts `setField` (line 1397 to 1400) with
   Onboarding.tsx line 64. Choosing "A job on campus" writes `under: ""`, so
   `value(held, job, "under")` is empty. The view then says "Choose an answer." and stays.
   Input: J08 in Onboarding. For the second job (School A, 2025-01-13, 20 hours), pick "A job
   on campus" and press Continue. The student cannot go on unless they tie the job to the
   bachelor's OPT card or leave it out and state the job list whole. Both answers are wrong. The
   view also marks the OPT card "Its dates hold the start", though the engine ends that card
   on 2025-01-12. The unit test calls setField directly and never presses Continue.
3. Should fix. engine/path.py `_closed` (line 857). A next stage is kept while any known
   window is open. `opt.complete_by` counts as a window, though no one can file in it.
   Input: J06. `opt_post.p1` is next, while its apply and latest-start windows closed on
   2026-02-10, 231 days before today. Point 6 says a next stage whose window has closed is not
   shown as next.
4. Should fix. Onboarding views with no why line. Section 18 asks for "one question per
   screen, each with its why-we-ask line". programs.md section 22 asks for web tests that
   check "every onboarding step has its why line". design-1 line 497 says the same.
   Input: the J16 walk. 28 of the 48 views logged have none, among them "Has your DSO changed
   this program's end date?", "Where was this degree?", "Have you had a job in the US?", "Have
   you left the US since Aug 26, 2024?" and "Has an employer filed an H-1B petition for you?".
   There are 24 `why: ""` in onboarding.ts.
5. Should fix. Onboarding makes the student type dates the journeys do not give, and offers
   no "I'm not sure" or "not yet":
   - the day all course requirements were done (J16);
   - the DSO recommendation day and the decision day of an OPT (J01, J08, J16);
   - the move's told-school, new I-20 and contacted-new-DSO days (J01).
   The engine asks for `dso_on` and `contacted_new_dso_on` itself when they are missing (J01,
   J03 and others list them under missing). Forcing a value makes the student guess, which
   PRINCIPLES 2 rules out. The filing day is optional and the others are not, with no reason given.
6. Should fix. Resolution point 11 is not built: no make target, no desktop/src/shots.ts, and
   no tests/design/landmarks.json.

## Notes

1. J12: grace.h1 is 2026-10-02 to 2026-11-30 after a petition approved with a change of
   status that starts H-1B on 2026-10-01. The journey says "The extension runs until
   2026-10-01, when H-1B status begins". The SPEC table (programs.md line 198) gives the grace
   row. This is a question for the SPEC owner, not a fault in the build.
2. Stages `opt_job_end.<work>` and `transfer.<move>` stay "current" years after the event
   when the close is null because no copy of the rule is saved for that day (J01, J08, J14,
   J15, J19). The reason `rule_copy_not_saved_for_event_day` is given.
3. The engine asks `p1.conferred_on` for a program still in progress (Onboarding J08, and
   p2 in the acceptance J08). It comes from the second any_of branch of the STEM next step.
   The student cannot answer until conferral, so the verdict stays cannot_tell.
4. Copy in the field problems lowercases names: "Enter the day your dso recommended it.",
   "Enter the new i-20's date.", "Enter the day you contacted the new dso."
5. Every onboarded case lacks `complete.withdrawal`, because no Onboarding view asks it, so
   the verdict is cannot_tell until the questions view is answered.
6. A statement on a list that grows with time holds only on the day it was made
   (engine/path.py `_stated`). A case kept from yesterday reopens move, work and trip.

## Scores

- correct 2: wrong dates on J04 and J14, which the SPEC names; J06 keeps a closed next step;
  Onboarding cannot take J08's on-campus job. The other seventeen journeys are right by hand.
- sourced 4: the evaluation windows cite (f)(10)(ii)(C)(9)(i) but compute from another day
  than its words give; every other value traces to a saved quote.
- never_assumes 3: counts wait for whole lists, and every gap is asked. But Onboarding forces
  dates the student may not know (finding 5) and forces a wrong permission for an
  on-campus job (finding 2).
- inside_the_boundary 4: no string I read states a conclusion about the person; at-or-over
  and bars_disagree go to the DSO. The wrong evaluation day is shown as a fact.
- secure 4: a record outside the pack gets a fixed 422 that does not repeat the body. I did not fuzz path.py.
- tested 3: acceptance and holdout journeys exist and pass, but they would pass with
  findings 1, 2 and 3 in place.

Mean 3.33, below 4.3. Three lines are below 4, and two blocking findings stand.

VETO
