# Review: product-2, fix round 5 (specs/product-2/resolutions.md point 18)

Run l-review-1d6afd8368. Reviewed commit 0dddf62. The diff is 949b726..0dddf62 (28 files): the
pack's `petition_belongs` and `petition_may_belong` anchors and the check
`petition.belongs_to_this_status`, the web `data-landmark` marks and petition questions, the
desktop shot run's landmark selector, and the point 18 twins in tests/unit/acceptance and
tests/holdout. The L-web, L-content, L-tests, L-desktop and L-engine commits of plan-fix5 are all
ancestors of HEAD (git merge-base --is-ancestor). L-engine changed no engine code.

## What ran

- `uv run pytest tests/unit tests/holdout -q -p no:cacheprovider --ignore=tests/unit/tools`: exit 0.
- `tools.sources.verify rulepacks` exit 0 ("every quote found"). `tools.sources.plain rulepacks
  --require f1` exit 0. `load_all()` exit 0. Copy lint exit 0. `ruff check .` exit 0.
  `tools.gates.engine_literals` exit 0. `web/samples/make.py --check` exit 0.
- On a `git archive HEAD` copy under TMPDIR: web `tsc --noEmit` exit 0, web vitest 28 files and 550
  passed; desktop `tsc --noEmit` exit 0, desktop vitest 11 files and 136 passed.
- TMPDIR/rv1d/journeys.py sent j01 to j20 through POST /v1/compute (FixedClock 2026-09-29 16:00
  UTC). All twenty gave 200 and cannot_tell with reasons. The printed output is byte for byte the
  fix 4 run, where every date was checked by hand.
- TMPDIR/rv1d/twins2.py sent every point 17 and point 18 twin and my probes, and diffed each
  stage, window, item, question and reason against plain J19.
- Pack mutants m1 to m6 in a scratch copy, each run with acceptance and holdout.
- A scratch vitest that feeds the web app's own `LANDMARKS` values to the desktop `holdsLandmark`.
- Onboarding walks for J01 (75 views), J08 (66) and J16 (53) by pressing Continue, with the
  title-keyed driver on the HEAD web copy. None got stuck.

## Dates checked by hand

- grace.p2 in the old-petition twin: a2's card_end is 2028-06-08, so the grace starts 2028-06-09.
  Adding 60 days: June 9 to 30 is 22 days, July brings it to 53, and August 1 to 7 to 60, so it
  ends 2028-08-07. The route gives this. Holdout grace.p1: card_end 2027-12-11. Dec 12 to 31 is
  20 days, January brings it to 51, February 1 to 9 to 60, so it runs 2027-12-12 to 2028-02-09.
  The route gives this.
- J19's validations are as in fix 4: 2026-12-09 to 12-23, 2027-06-09 to 06-23 and 2027-12-09 to
  12-23. With a belonging petition (validity_start 2027-03-01, last F-1 day 2027-02-28), only
  validation_1 stays. With P1 (validity_start 2026-10-01), none stays, because validation_1 opens
  2026-12-09.

## Twins of points 17 and 18 (J19, a1 2025-06-09 to 2026-06-08, a2 2026-06-09 to 2028-06-08)

| Case | Validations | Grace | cap_gap / conflict | Asked |
|---|---|---|---|---|
| T1 approved, start 2020-10-01 | all three kept | grace.p2 kept | none | nothing new |
| T3 approved, start 2027-03-01 | only v1 | none | none | nothing new |
| T4 filed 2026-06-08, start 2027-03-01 | only v1 | none | none | nothing new |
| P1 filed in a1, start 2026-10-01 | none | none | none | nothing new |
| start 2026-06-09 (card's first day) | none | **grace.h9 2028-06-09 to 2028-08-07** | none | nothing new |
| denied on the card | all kept | none (judgement grace.after_cap_gap_outcome.h9) | none | nothing new |
| pending on the card | all kept | grace.h9 2028-06-09 to 2028-08-07 | **cap_gap.h9 2028-06-09 to 2027-04-01, conflict** | nothing new |
| approved, no validity_start | null (not shown) | grace.h9 | **cap_gap.h9, conflict** | h9.validity_start |
| no outcome | null (not shown) | none | none | h9.outcome |

The holdout twins assert what they say, and I checked them. The holdout pending twin also gets
cap_gap.h9 from 2027-12-12 to 2027-04-01, with the conflict.

## Onboarding for J01, J08 and J16

The posted cases and the logged views are the same bytes as in fix 4. I sent them on
2026-09-28, the day the walks state their lists. J01 gives unemployment 47 and 49, J08 gives 35,
and J16 gives 106 with CPT at 82 days and 2 months, all 200 and cannot_tell. Point 13 is
unchanged.

## The findings of reviews/product-2-fix4.md

1. Closed for an approved old petition. T1 keeps grace.p2 (2028-06-09 to 2028-08-07), opens no
   cap_gap and raises no conflict. It differs from plain J19 only in the petition list being
   whole. The same input, with an old petition that is not approved, still takes the grace (see
   finding 3 below).
2. Closed. P1 now gives no validation after 2026-09-30 and no grace, so the output holds one
   reading. The dispute is settled by point 18.
3. Closed as written, because text is no longer compared. It is replaced by finding 1 below.
4. (a) Closed. With the approved filter taken out (m1), test_j14_no_validation_is_dated_after_the_extension_ended
   fails. (b) Closed: filed_on is no longer read. A missing validity_start or outcome is asked,
   and the validation dates go null. This is still untested (finding 4).

## Findings

1. Blocking. The web app and the desktop shot run spell the landmark differently, so no shot can
   ever count as drawn. The web side writes `data-landmark="timeline"` (and "welcome", "home"
   and so on) from web/src/lib/shots.ts:28 `LANDMARKS`. The desktop side,
   desktop/src/shots.ts:136 and :149, looks for `[data-landmark="/timeline"]` and compares
   `mark.landmark === shot.screen`, where the screen is the route.
   - Input: holdsLandmark([{landmark: LANDMARKS[screen], width 300, height 40}], screen) for each
     of the 8 SHOT_SCREENS (scratch test TMPDIR/rv1d/m/desktop/src/rv/cross.test.ts).
   - What happens: 8 of 8 fail. For example, "/" writes "home" and the run looks for "/". Every
     planned shot is reported "does not hold", and shotsExitCode is 1 on every `make design-shots`.
     Point 18's last bullet is not met.
   - Each side's tests use its own spelling. desktop/src/shots.page.test.ts:43 uses
     `data-landmark="/timeline"`, and web landmarks.test.tsx:75 uses `LANDMARKS[route]`. Nothing
     joins the two sides.
2. Blocking. An approved change-of-status petition that belongs, but starts after April 1 of its
   fiscal year, keeps a grace dated after the card, long after H-1B status began. The source is
   rulepacks/f1-us/v2026.09/parameters.yaml:1998-2001: the petition `grace` stage is left out
   only when validity_start is on or before capgap.end_month_day.
   - Input A (acceptance twin test_j19_a_petition_starting_on_the_cards_first_day_belongs,
     test_journeys.py:2114): h9 approved, validity_start 2026-06-09. This gives grace.h9 from
     2028-06-09 to 2028-08-07 and the judgement unemployment.total.through_cap_gap.h9.
   - Input B: J19 plus h9 {cap_subject no, approved, filed 2026-07-01, validity_start 2027-05-03}.
     Validations 2 and 3 correctly go null (last F-1 day 2027-05-02). Yet grace.h9 runs from
     2028-06-09 to 2028-08-07, 13 months after the pack's own end of F-1 status.
   - Point 18 says a belonging petition "takes the grace away", and point 15 says "no F-1 grace
     follows its start date". The shown dates are wrong. The twin asserts only validations.
3. Should fix. A petition that does not belong still opens cap_gap, invents a conflict, or takes
   the grace, whenever it is not an approved one with a validity start. The source is
   parameters.yaml:1952 (`petition_may_belong` holds every non-approved outcome, at any date) and
   :1953 (cap_gap opens whenever validity_start is absent).
   - Pending on the card (the SPEC's named twin; test_journeys.py:2153 and the holdout twin): h9
     pending, filed 2026-07-01, requested_start 2027-03-01. This opens cap_gap.h9 from 2028-06-09
     to 2027-04-01 and raises the conflict and question cap_gap.h9.ends_before_starts. That is
     shown as "Two documents disagree on cap gap.h9.ends before starts." (web/src/lib/status.ts:65),
     and no two documents disagree. Approved with no validity_start does the same, while the
     right question h9.validity_start is also asked.
   - An old petition that is not approved: J19 plus h9 denied, filed 2020-04-01, validity_start
     2020-10-01. grace.p2 disappears with nothing in its place, and the judgement
     grace.after_cap_gap_outcome.h9 is raised. With h9 withdrawn in 2020 (no validity_start), you
     also get cap_gap.h9 from 2028-06-09 to 2020-06-01 and the conflict. Point 18: "An older
     petition does none of these and raises no conflict."
4. Should fix, tests. Two point 18 rules pass every acceptance and holdout test when taken out:
   - m3: with the stem_validation_end member that makes dates null "while that test cannot be
     settled" taken out, the no-validity-start, no-outcome and old-no-validity-start cases show
     all three validations as due. That is exactly the gap read as "does not belong", which
     point 18 forbids. The twins at test_journeys.py:2175 and :2195 assert only the question.
   - m5: with the cap_gap "validity start unknown or after the card end" filter taken out,
     cap_gap.h9 and its conflict return on T3, T4, P1, the first-day and denied twins, and old
     petitions. No test asserts they are absent there. The old-petition twin is covered by
     petition_may_belong instead.
   - m2 and m6 are caught. m4 (the check petition.belongs_to_this_status taken out) changes no
     output on any of my 16 inputs. Its holds is a tautology, and the questions come from the
     other members. It is dead weight, not a defect.

## Notes

1. An approved change-of-status petition whose start falls before the current card
   (2025-10-01 inside a1, or 2026-06-08, the day before a2) is silently ignored. By the pack's own
   reading, F-1 status ended that day, so a later STEM card does not fit the record. Point 18 says
   an older petition "raises no conflict", so the SPEC is followed. PRINCIPLES 2 would ask. This
   is under disputes.
2. A petition denied on the card drops grace.p2 in favour of the DSO judgement
   grace.after_cap_gap_outcome. That is cannot_tell, not a date, and it follows the pack's reading
   of 8 CFR 214.2(f)(5)(vi)(B). Point 18's literal words ("Only such a petition ... takes the grace
   away") say otherwise. This is under disputes.
3. Electron cannot start in this sandbox, so finding 1 rests on the pure functions the shot run
   calls and on the values the web app writes. It was not seen on a drawn page.

## Scores

- correct 1: the shot run cannot count any screen as drawn, which is point 18's own input
  (finding 1). The SPEC's pending twin shows an invented conflict (finding 3). A belonging
  petition leaves a grace dated in 2028 (finding 2). The twenty journeys and T1, T3, T4 and P1 are
  right by hand.
- sourced 4: verify, plain and engine_literals exit 0, and the capgap note states point 18.
  The April 1 test on the grace has no source for a start that is not October 1 or cap-gap.
- never_assumes 3: missing outcome and validity start are asked, with dates null. But a gap
  (pending, or no validity start) makes a conflict that no record holds, and old non-approved
  petitions are read as belonging.
- inside_the_boundary 4: no new string states a conclusion about a person. The invented conflict
  reads "Two documents disagree", and that is not true of the record.
- secure 4: nothing new takes outside input. All journeys, twins, probes and walked cases gave 200.
- tested 2: m3 and m5 survive. No test joins the web mark to the desktop selector. The first-day
  and pending twins assert only validations.

Mean 3.0, below 4.3. Five lines are below 4. There are two blocking findings.

VETO
