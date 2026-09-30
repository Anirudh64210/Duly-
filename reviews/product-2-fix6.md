# Review: product-2, fix round 6 (specs/product-2/resolutions.md points 19, 20 and 21)

Run l-review-9682244b00. Reviewed commit 0c55967. The diff is 0dddf62..0c55967 (27 files). It
holds: the pack's point 19 step back (rulepacks/f1-us/v2026.09/parameters.yaml), the new rule
row `capgap.petition_for_dso` and check `cap_gap.for_dso`, the web words and DSO draft for
`cap_gap.for_dso`, the router and `LANDMARKS` built from `SHOT_SCREENS`, the desktop join test,
the point 19 and point 21 changes in tests/unit/acceptance and tests/holdout, and regenerated
samples. The L-content, L-tests, L-web and L-desktop commits of plan-fix6 and plan-fix6b are
ancestors of HEAD (git merge-base --is-ancestor). No L-engine commit landed. engine/ is unchanged
in this diff, and every L-engine branch of this round holds only "not accepted (escalated)" wip
commits. The pack change alone makes the acceptance tests pass.

## What ran

- `uv run pytest tests/unit tests/holdout -q -p no:cacheprovider --ignore=tests/unit/tools`:
  exit 0.
- These all exit 0: `tools.sources.verify rulepacks` ("every quote found"),
  `tools.sources.plain rulepacks --require f1`, `load_all()`, copy lint, `ruff check .`,
  `tools.gates.engine_literals` and `web/samples/make.py --check`.
- On a `git archive HEAD` copy under TMPDIR: web `tsc --noEmit` exit 0, web vitest 28 files and
  554 passed. Desktop `tsc --noEmit` exit 0, desktop vitest 11 files and 139 passed.
- TMPDIR/rv96/journeys.py sent j01 to j20 through POST /v1/compute (FixedClock 2026-09-29 16:00
  UTC). All twenty gave 200 and cannot_tell with reasons. I diffed them against the fix 5 run:
  only J12, J13 and J14 differ, apart from rule_id lists.
- twins2.py, probe6.py to probe10.py: J19, J11, J06, J15, J12, J13 and J14 with petitions of
  every outcome, age and missing fact, and boundary filing days.
- 13 pack mutants in a scratch copy, each run with acceptance and holdout.
- A scratch web vitest that sends the J12, J13 and J14 route output to `stageEyebrow`.
- A scratch web mutant (LANDMARKS back to "home", "timeline") run against the desktop join test.
- Onboarding walks for J01, J08 and J16 with the title-keyed driver on the HEAD web copy.

## Dates checked by hand

- J14 (a2 2024-06-01 to 2026-05-31, h1 filed 2026-04-01, withdrawn):
  - Validation 1 opens 2024-12-01, a Sunday. Ten business days, counted from Dec 2, end on
    2024-12-13. Validation 2 opens 2025-06-01, a Sunday, and ends 2025-06-13. Validation 3 opens
    2025-12-01. Counted from Dec 2 it ends 2025-12-15.
  - The 12-month evaluation is 2025-06-01 plus 10 days, so 2025-06-11. All of these fall before
    the filing, and all are shown.
  - The final evaluation (2026-05-31 to 06-10 without the petition) is null. The total
    unemployment count is null.
  - unemployment.opt_card.a1 = 40 is over a1, which ended 2024-05-31, before the filing.
- J14 boundaries:
  - Filed 2025-12-15 (validation 3's last day): validation 3 is null. Filed 2025-12-16: it is
    shown.
  - Filed 2025-06-11: the 12-month evaluation and validation 2 are null.
  - Filed 2024-01-01 (inside a1): every a2 report and unemployment.opt_card.a1 are null.
- J12 (card end 2026-05-31): the grace without a petition is June 1 to 30 (30 days) and July 1
  to 30 (60), so 2026-06-01 to 2026-07-30.
  - With the petition filed 2026-04-01, the grace is null and unemployment.opt_card.a1 is null.
  - Filed 2026-07-30 (card end plus 60): null. Filed 2026-07-31: 2026-06-01 to 2026-07-30 and a
    count of 0, which is right, because a petition filed after the grace ended cannot follow it.
- J13 (card end 2026-06-30): the grace without a petition is 2026-07-01 to 2026-08-29 (31 + 29).
  With the petition, it is null.
- J19 (a2 2026-06-09 to 2028-06-08) with any change-of-status petition filed on or before
  2026-12-09:
  - validations 1 to 3, both evaluations and grace.p2 (2028-06-09 to 2028-08-07 without it) are
    null.
  - Filed 2027-07-01: validations 1 and 2 and the 12-month evaluation stay. Validation 3
    (2027-12-09 to 12-23) and the final evaluation go null.
- The other seventeen journeys are byte for byte the fix 4 and fix 5 runs, whose dates were
  checked by hand.

## The step back, for every case with a petition

| Case | Petition-changeable dates | cap_gap stage / conflict | Asked | Reason |
|---|---|---|---|---|
| J12 approved, J13 denied, J14 withdrawn | null, as above | none | nothing new | cap_gap.for_dso |
| J19 + T1, T3, T4, P1, first day, denied, pending | null | none | nothing new | cap_gap.for_dso |
| J19 + no validity_start, no outcome | null | none | not h9.outcome or h9.validity_start (point 21) | cap_gap.for_dso |
| J19 + 2020 petitions (approved, denied, withdrawn, no outcome) | null | none | nothing new | cap_gap.for_dso |
| J19 + no filed_on | null | none | h9.filed_on | cap_gap.for_dso, missing |
| J19 + change_of_status left out | null | none | h9.change_of_status | missing |
| J19 + change_of_status no | unchanged from plain J19 | none | nothing | none |
| J11, J06, J15 + pending petition | grace, a1 count, a2 reports, Job B evaluation null | none | nothing new | cap_gap.for_dso |

No petition opens a stage or raises a conflict. The only conflicts are `filed_on.after_today`,
which my future-dated probes cause and which are right. The two point 21 question tests are
`xfail(strict=True)` at test_journeys.py:2208 and :2239 and at holdout :1055.

## Onboarding for J01, J08 and J16

The posted cases and the logged views are the same bytes as in fix 5 (76, 67 and 54 view lines).
None got stuck. Sent on 2026-09-28, the day the walks state their lists: J01 gives
unemployment.opt_card.a1 47 and a2 49, J08 gives 35, and J16 gives 106, with CPT at 82 days and
2 months. All are 200 and cannot_tell, as in fix 5.

## The findings of reviews/product-2-fix5.md

1. Closed. `LANDMARKS` is now `Object.fromEntries(SHOT_SCREENS.map(route => [route, route]))`
   (web/src/lib/shots.ts:29). The router is built from the same table (web/src/app/Shell.tsx:112).
   desktop/src/shots.test.ts:191 imports the web module and checks every screen against
   `landmarkSelector` and `holdsLandmark`. I planted the fix 5 spelling in the web table and
   2 of its 3 tests fail. Electron still cannot start in this sandbox, so no drawn shot was
   seen.
2. Closed. The petition grace stage is gone. With validity_start 2026-06-09 or 2027-05-03 there
   is no grace.h9, and grace.p2 is null.
3. Closed. The cap_gap stage and `petition_may_belong` are gone. Pending, no-validity-start,
   old denied and old withdrawn petitions raise no conflict and open no stage (table above).
4. Closed as written. The rules m3 and m5 tested are gone, and the new rules' mutants are listed
   under finding 4 below.
- Note 1 (approved start before the card, silently ignored): closed. Any petition now steps back.
- Note 2 (denied petition drops the grace for a DSO judgement): closed by point 19, which steps
  back for every outcome.
- Note 3 (Electron): still open, as in finding 1 above.

## Findings

1. Blocking. The grace that point 19 makes null is still shown as the stage the person is in now.
   - engine/path.py:608-614 gives a stage with no start and no end the state "current". For
     J12, J13 and J14 through POST /v1/compute, `grace.p1` comes back
     `state: "current", starts: null, ends: null`. It is the first current stage.
   - In fix 5, J12 had no grace stage at all (cap_gap.h1 was current).
   - `stageEyebrow` (web/src/lib/views/stages.ts:30), fed with that output, gives
     "F-1 · TIME AFTER THE PROGRAM ENDS, FROM THE DATES YOU ENTERED" for all three. Home shows
     it above the verdict (web/src/app/Home.tsx:538). The Timeline marks the row "now"
     (web/src/lib/views/timeline.ts:59).
   - J12 holds an approved change of status starting 2026-10-01, so on 2026-09-29 this person may
     be in a cap-gap extension and not in a grace period. Whether they are is exactly what point
     19 leaves to the DSO.
   - Other inputs:
     - J19 plus any petition: grace.p2 turns from "later" (2028) to "current" while stem.a2 runs
       to 2028-06-08, so the Timeline marks two stages "now".
     - J11 plus a petition filed 2026-03-02: grace.p1 is "current" while p1 still runs to
       2026-09-30.
   - Point 19 makes the grace null. Here it is stated as the person's present stage, a
     conclusion about the person that the petition could change.
2. Should fix. A petition of any age hides a real conflict and drops a question.
   - `stem.filed_while_opt_in_force` now has `only_if: none: petition change_of_status yes`
     (parameters.yaml:2161). Before, it was skipped only for a petition that might belong.
   - Input: J19 with a2.filed_on 2026-07-20 (a1 ended 2026-06-08).
     - Without a petition: `conflict:stem.filed_while_opt_in_force.a2`.
     - With an h1b petition filed 2020-04-01 and approved for 2020-10-01: no conflict, only
       cap_gap.for_dso.
   - Plain J19 with any petition also stops asking `a2.filed_on`.
   - A 2020 petition cannot have extended a 2026 OPT card. Point 19 says no petition "takes a
     date away on its own", and PRINCIPLES 2 says a gap becomes a question.
3. Should fix. The words people read do not match what is taken away.
   - web/src/lib/labels.ts:395 says an H-1B petition "can change these dates: the grace period,
     the counts from the day it was filed, and any cap-gap period". The validation reports and
     evaluations it also nulls (J14 final evaluation, J19 validations) are not named. The
     pack's plain words do name "STEM reports".
   - The check has no type filter (parameters.yaml:2217). J19 plus a petition of type "other"
     with change_of_status yes raises cap_gap.for_dso, and the text begins "An H-1B petition
     is entered."
4. Should fix, tests. Pack mutants that pass every acceptance and holdout test:
   - Removing the petition member of `stem_job_end.evaluation_final` (parameters.yaml:2041).
     J15 plus a petition filed 2025-09-02 would then date Job B's final evaluation. HEAD nulls it
     correctly.
   - Removing the program-end petition member of the grace (parameters.yaml:1963 and :1979). HEAD
     nulls J06's program grace with a petition filed 2025-11-03.
   - `on_or_before` changed to `before` on every validation's filing test. A report due on the
     filing day would then stay dated, and no test uses a filing on a due day.
   - The `stem.filed_while_opt_in_force` skip (finding 2) is pinned by no test either way.
   - Caught: validations 1 to 3, the 12-month and final evaluations, the card grace, the
     unemployment count and cap_gap.for_dso. The validation_4 mutant is equivalent, because its
     due day always falls after the card end.
5. Should fix. Onboarding still makes the outcome a required choice, with no "I'm not sure".
   - The view is web/src/lib/views/onboarding.ts:1072, and its why line reads "Each outcome
     leads to different dates."
   - Under points 19 and 21, every outcome gives the same step back, and the engine no longer
     asks for it.
   - Point 21 was given only to L-tests, so this is left over and not a regression.

## Notes

1. The J13 `opt_job_end.report.w1` (2026-08-14 to 08-24) and J14 `stem_job_end.report.w2`
   (2026-07-15 to 07-25) windows are dated for jobs that end after the card end. They are the same
   without the petition, so this is older behaviour. Whether a report is owed after the card
   ended is a cap-gap question for the next round.
2. The route takes petition type "o1", which is not one of the pack's choices (h1b, other). It
   returns 200 and asks nothing.
3. Point 21 cites "review finding 9", and reviews/product-2-fix5.md has no finding 9. I read this
   as data and did not act on it.
4. The whole `unemployment.total` is null when its card ends on or after filing minus 60 days,
   not only "from that day". That is more cautious than point 19 and states no wrong number.

## Scores

- correct 2: every date on the twenty journeys, the twins and the boundary probes is right by
  hand. But on J12, J13 and J14, which the SPEC names, the null grace is the person's "current"
  stage, and Home names it (finding 1).
- sourced 4: verify, plain and engine_literals exit 0. capgap.petition_for_dso quotes
  (f)(5)(vi)(A) verbatim and is marked a reading. The web words name fewer dates than the pack's
  plain words.
- never_assumes 3: missing filed_on and change_of_status are asked, and dates wait null. A petition
  from 2020 hides the late STEM filing conflict and the a2.filed_on question (finding 2). The grace
  state is assumed "current" (finding 1).
- inside_the_boundary 3: the Home eyebrow states a stage the petition may have changed, and the
  words say "An H-1B petition" for any kind.
- secure 4: all journeys, twins, probes and walked cases gave 200. An unknown choice value is taken
  in silence (note 2).
- tested 3: the main point 19 mutants and the landmark join are caught. Three mutants survive, and
  the boundary day is untested (finding 4).

Mean 3.17, below 4.3. Four lines are below 4. There is one blocking finding.

VETO
