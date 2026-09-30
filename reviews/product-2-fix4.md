# Review: product-2, fix round 4 (specs/product-2/resolutions.md point 17)

Run l-review-e8924056e5. Reviewed commit fa26e0c. The diff is 317ad86..fa26e0c (26 files). It holds
the pack's `stem_validation_end` petition member and a note, web/samples/make.py and the
regenerated samples, the Makefile `samples` target, the Onboarding withdrawal fix and its walk test,
web/src/lib/samples.test.ts, desktop/src/shots.ts and shotrun.ts with their tests, and the
acceptance and holdout twins of point 17. Specs: resolutions.md points 1 to 17,
reviews/product-2-fix3.md, plan-fix4.yaml, CLAUDE.md, PRINCIPLES.md, BOUNDARY.md.

## What ran

- `uv run pytest tests/unit tests/holdout -q -p no:cacheprovider --ignore=tests/unit/tools`: exit 0.
- `tools.sources.verify rulepacks` exit 0 ("every quote found"). `tools.sources.plain rulepacks
  --require f1` exit 0. `load_all()` exit 0. Copy lint exit 0. `ruff check .` exit 0.
  `tools.gates.engine_literals` exit 0. `web/samples/make.py --check` exit 0.
- Web, on a `git archive HEAD` copy under TMPDIR: `tsc --noEmit` exit 0. `vitest run` gave 25 files and
  523 passed. samples.test.ts spawns uv at the repo root, so I ran it in the worktree, where it passed.
  I planted a drift (the sample verdict set to no_open_items) in a scratch copy. `make.py --check`
  then gave exit 1 and named the file.
- Desktop, on the same copy: `tsc --noEmit` exit 0. `vitest run` gave 11 files and 143 passed.
- TMPDIR/rve89/journeys.py sent j01 to j20 through POST /v1/compute with TestClient and the suite's
  FixedClock (2026-09-29 16:00 UTC). All twenty gave 200 and cannot_tell with reasons. The whole
  printed output is byte for byte the output of the fix 3 run.
- TMPDIR/rve89/twins.py sent the five acceptance twins and the three holdout twins of point 17,
  plus eight probes of my own (P1 to P8 below).
- Pack mutants, one at a time, in a scratch copy with acceptance and holdout:
  (m1) `filed_on on_or_after card_start` taken out. Caught.
  (m2) `filed_on on_or_before card_end` taken out. Survives, but it is equivalent: a petition filed
  after the card end cannot have a start inside the card.
  (m3) the `cos_ended_on` any_of taken out. Caught.
  (m4) `outcome in [approved]` taken out. Survives, and it is not equivalent (see finding 4).
- Onboarding: I walked J01 (75 logged views), J08 (66) and J16 (53) by pressing Continue with the
  title-keyed click driver, on the HEAD web copy. I also ran the withdrawal walk. Each posted case
  went to the real route.

## The twenty journeys and the twins of point 17

No date moved from fix 3, where every date was checked by hand. I checked J19 again by hand.
The STEM card runs 2026-06-09 to 2028-06-08, and the reporting dates are card_start plus 6, 12
and 18 months.
- validation_1 opens 2026-12-09, a Wednesday. Ten business days after it are Dec 10, 11, 14, 15,
  16, 17, 18, 21, 22 and 23, so it closes 2026-12-23.
- validation_2 runs 2027-06-09 to 2027-06-23. June 19, 2027 is a Saturday, and the pack skips no
  observed Friday. That is its documented reading of 5 U.S.C. 6103(a)
  (calendar.federal_holidays_law note).
- validation_3 runs 2027-12-09 to 2027-12-23.
- validation_4 would open 2028-06-09, after the card, so it has no date. Right under point 16.

Point 17 twins (J19, card 2026-06-09 to 2028-06-08, validity_start 2027-03-01 unless named):

| Case | validation_1 | validation_2 | validation_3 |
|---|---|---|---|
| J19, no petition | 12-09 to 12-23 | 2027-06-09 | 2027-12-09 to 12-23 |
| T1 approved 2020 petition (fix 3's input) | same | same | same |
| T2 filed 2026-07-01, cos_ended_on 2026-09-22 | same | same | same |
| T3 filed 2026-07-01, approved, no cos_ended_on | same | none | none |
| T4 filed 2026-06-08, a day before the card | same | same | same |
| T5 filed 2026-06-09, the card's first day | same | none | none |

Each is what point 17 says: "filed while the card runs, approved, and its change of status not
ended (`cos_ended_on` empty) before the start". The last F-1 day in T3 and T5 is 2027-02-28, and no
validation is dated after it. The three holdout twins (card 2025-12-12 to 2027-12-11) give
2026-06-12 to 2026-06-29, 2026-12-12 and 2027-06-12 as they assert. June 19, 2026 falls inside
validation_1 and is skipped.

## Onboarding for J01, J08 and J16

The posted cases and the logged views are the same bytes as in fix 3. On 2026-09-28, the day the
walk states its lists, the route gives these counts: J01 unemployment 47 and 49, J08 35, and J16
106 with CPT at 82 days and 2 months. On 2026-09-30 the counts are null and complete.move,
complete.work and complete.trip are asked again. That is point 13, and it has not changed.

On the withdrawal walk, "Which program did you withdraw from?" now shows
`[["School A, Master's","false"]]`. Continue with nothing chosen stays on the view.

## The findings of reviews/product-2-fix3.md

1. Closed. dda5856 brings the L-web work in (3db6249 itself is not an ancestor, and its content is
   merged). onboarding.ts:1562 adds the withdrawal with `program: ""`, and the walk above shows
   nothing chosen. OnboardingWalk.test.tsx presses Continue through every withdrawal view with
   nothing chosen, including a second withdrawal. web/package.json is unchanged. Samples: make.py
   exists, `make samples` runs it, design-shots depends on it, samples.test.ts runs `--check`, and
   the planted drift is caught.
2. Closed for validations. T1 to T5 are right, and mutants m1 and m3 are caught. The same old
   petition still reaches two other stages (finding 1 below).
3. Closed. The acceptance and holdout twins cover the new filter. m1 and m3 are caught, and m4 is
   not (finding 4).
- Note 1 (holdsLandmark compares type only): closed as written. Text is now compared, but the
  text it compares against is not what the app draws (finding 3).
- Notes 2, 3 and 4 of fix 3 stand. Electron still does not start in this sandbox, and no shot was
  drawn.

## Findings

1. Should fix. An approved change-of-status petition from before this F-1 status still takes the
   60-day grace away and raises a conflict that no record holds. The source is
   rulepacks/f1-us/v2026.09/parameters.yaml:1938 (stage `cap_gap`, for_each any petition with
   change_of_status yes) and :1951 (the program `grace` is left out whenever any such petition
   exists).
   - Input: J19 plus h9 {h1b, change_of_status yes, approved, filed_on 2020-04-01, validity_start
     2020-10-01}. This is acceptance test_j19_an_old_approved_petition_..., the twin point 17 names.
   - What happens: `grace.p2` (2028-06-09 to 2028-08-07, present without h9) is gone. In its place
     is `cap_gap.h9` from 2028-06-09 to 2020-10-01, plus the conflict and question
     `cap_gap.h9.ends_before_starts`, about {starts 2028-06-09, ends 2020-10-01}. reasonLine in
     web/src/lib/status.ts:65 reads this to the person as "Two documents disagree on ...", and no
     two documents disagree. T2 to T5 and P1 get the same conflict.
   - Point 17 says "An older petition from before this F-1 status never drops a report". The
     acceptance twin checks only the validations, so this passes.
2. Should fix, and disputed against the SPEC's wording. The test "filed while the card runs" leaves
   out the usual cap-gap case.
   - Input (P1): J19 plus h9 {h1b, cap_subject yes, change_of_status yes, approved, filed_on
     2026-04-01 (during OPT a1), validity_start 2026-10-01}.
   - What happens: the grace is gone, because the pack reads F-1 status as ending 2026-10-01
     (capgap.status_ends_on_h1b_start). Yet validation_2 (2027-06-09) and validation_3 (2027-12-09)
     are shown as due on the same output. (f)(12)(ii)(B) says reporting "ends when the student's
     F-1 status expires". So one output holds both readings.
   - The petition is not "from before this F-1 status", which is the reason point 17 gives. Only
     the operational words "filed while the card runs" leave it out.
   - A test such as "validity_start on or after the card start" would keep T1 to T5 as they are and
     cover P1. The SPEC has to say which it means, so this is under disputes in REPORT.json.
3. Should fix. The heading text the shot run compares is canvas copy that the app never draws.
   The source is desktop/src/shots.ts:209 and :261, with the labels from tests/design/landmarks.json.
   - The landmarks it reads are: /welcome "What kind of work do you do?", / "Everything is in
     order.", /timeline "Timeline", /checklists "STEM OPT extension", and /updates "One thing worth
     knowing.".
   - None of the texts for /welcome, / and /updates appears anywhere in web/src. The app draws
     "Which visa status do you hold now?" on /welcome and "Can't tell yet" on / (headline() for
     cannot_tell, the verdict of both samples). On /updates it draws updatesTitle(), for example
     "No published update matches your status.".
   - Input: holdsLandmark([{text: the app's heading, in the landmark's exact type, 300x40}],
     screenLandmark(landmarks, screen)). This gives false for /welcome, / and /updates, and true for
     /timeline. With the landmark's own text it gives true for all four (scratch test
     TMPDIR/rve89/m/desktop/src/rv/drawn.test.ts).
   - So 12 of the 20 planned shots (3 screens x 2 samples x 2 themes) can never count as drawn, and
     shotsExitCode fails every `make design-shots`.
   - The shots tests use made-up labels and the landmarks' own words, so no test compares a real
     screen with its landmark. design-1 SPEC 14.1 says "Text is never compared". Point 17 overrides
     that for the heading, without saying which heading. This is under disputes.
4. Should fix, in tests and in never_assumes. Two gaps on the new filter.
   - (a) m4, with `outcome in [approved]` taken out, passes every acceptance and holdout test.
     Input: T3 with outcome denied. The shipped pack keeps validations 2 and 3, and m4 drops them.
     No twin holds a denied or pending petition filed on the card.
   - (b) P2: T3 with no filed_on (approved, change of status, validity_start 2027-03-01). This gives
     validations 2 and 3 as due, no question for h9.filed_on, and no reason about h9. The one fact
     point 17 turns on is missing, and the pack reads the gap as "does not belong", when it should
     ask (PRINCIPLES 2). The verdict is cannot_tell for other reasons, so nothing reads as quiet.
     The same holds with validity_start left out (P5).

## Notes

1. P3 and P4 (cos_ended_on on or after the start): the petition belongs, and validations end.
   The after_today conflict is raised on each. That is right under point 17.
2. P8 (the 2020 petition together with T3's petition): the earliest qualifying start is taken, as
   with T3 alone. Right.
3. Electron cannot start in this sandbox, so finding 3 rests on the pure functions the shot run
   calls. I did not see it on a drawn page.

## Scores

- correct 3: every input the SPEC names is right. That covers the five acceptance twins, the three
  holdout twins, the unpreselected withdrawal view, the samples made and checked by make.py, and
  the text in the landmark check. Beside them, the 2020 petition still takes away the grace
  (finding 1). P1 shows reports after the pack's own end of F-1 status (finding 2). Three screens
  can never pass the shot check (finding 3).
- sourced 4: verify and plain exit 0. The capgap note says how point 17 uses the reading. The filter
  applies (f)(12)(ii)(B) more narrowly than the pack's own reading of the end of status
  (finding 2).
- never_assumes 3: a missing filed_on or validity_start on an approved change-of-status petition
  is read as "does not belong" with no question (finding 4b). A conflict is made up on a record
  with none (finding 1).
- inside_the_boundary 4: no new string states a conclusion about a person. But the made-up
  conflict reads to a person as "Two documents disagree", and that is not true of the record.
- secure 4: nothing new takes outside input apart from the samples test's spawn of a fixed
  command. All twenty journeys, eight twins, eight probes and three walked cases returned 200.
- tested 3: m1 and m3 are caught. m4 survives (finding 4a). No test covers grace or cap_gap with
  an old petition, and no test compares a real screen's heading with its landmark (finding 3).

Mean 3.5, below 4.3. Three lines are below 4. There is no blocking finding.

VETO
