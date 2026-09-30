# Review: product-2, fix round 7 (specs/product-2/resolutions.md points 22 to 26, 23a and 24a)

Run l-review-6676921233. Reviewed commit 3d09f03. The diff is 0c55967..3d09f03 (29 files):

- the contract's stage state `unknown`;
- engine/path.py `_state` and `ask_unknown_choices`;
- the pack's point 23 filters (`petition_may_extend_card`, `_grace`, `_job_card`, the late-filing skip, `cap_gap.for_dso`) and the point 24a plain words;
- web `compute.ts`, `labels.ts`, `records.ts`, `onboarding.ts`, `timeline.ts` and `Timeline.tsx`;
- tests/unit/acceptance/test_fix7.py, web/src/lib/views/fix7.test.ts, the reconciled journey and holdout tests, and the regenerated samples.

Every lane commit of plan-fix7c is on the branch. The two lane branches plan-fix7b names
(lane/L-content/l-content-34076aca69 and lane/L-tests/l-tests-5ad90579ca) are not ancestors.
Each holds one extra "wip, not accepted (escalated)" commit. The pack on the content branch is
the same as HEAD's apart from PROGRESS.md. The tests on the L-tests branch are the older version,
which the reconcile commit 0234982 replaced.

## What ran

- `uv run pytest tests/unit tests/holdout -q -p no:cacheprovider --ignore=tests/unit/tools`:
  exit 0.
- These all exit 0: `tools.sources.verify rulepacks` ("every quote found"),
  `tools.sources.plain rulepacks --require f1`, `tools.gates.engine_literals`, copy lint,
  `ruff check .`, `ruff format --check engine api tests`, `mypy` (62 files) and
  `web/samples/make.py --check`.
- On a `git archive HEAD` copy under TMPDIR:
  - web `tsc --noEmit`: exit 0;
  - web vitest: 29 files, 567 passed;
  - desktop vitest: 11 files, 139 passed.
- TMPDIR/rv7/run.py sent j01 to j20 through POST /v1/compute (FixedClock 2026-09-29 16:00 UTC)
  on HEAD and on a copy of 0c55967 (fix 6), using the same bodies.
  - All forty calls gave 200 and cannot_tell.
  - Every span, window, item, question and reason is the same in both runs. Only stage `state`
    differs, in 13 journeys (finding 1).
- TMPDIR/rv7/twins7.py: 18 J19 twins covering point 23 and 23a (petition starts before, on and
  after each card, the start used for each outcome, missing starts, "not_sure", type "o1", the
  late-filing twin with four petitions). Each twin is diffed against the same case without the
  petition, over every stage, window, item, question and reason.
- Probes p11, p15 and p15b cover J11 and J15 with old and new petitions.
- A scratch web vitest sends the route output of all twenty journeys and all twins through
  `stageEyebrow`, `currentStage` and `timelineView`. It ran on HEAD and, for the journeys, on
  the fix 6 copy.
- 17 mutants (14 pack, 3 engine), each run against tests/unit/acceptance, tests/holdout and
  tests/unit/engine.
- The three Onboarding cases saved in fix 6 (J01, J08, J16) were posted again for 2026-09-28.
  Their questions and items match fix 6: J01 unemployment 47 and 49, J08 35, J16 106, with CPT at
  82 days and 2 months. I did not walk the views again. Only the petition outcome step changed,
  and none of the three walks reaches it.

## Dates checked by hand

- The dates of all twenty journeys match the fix 6 run byte for byte, and fix 6 checked them by
  hand. That includes J12, J13 and J14 with their step backs.
- J19 plus a 2020 petition:
  - validation 1 is 2026-06-09 plus 6 months, which is 2026-12-09, a Wednesday. Ten business
    days (Dec 10, 11, 14 to 18, 21, 22, 23) end on 2026-12-23. The HEAD output agrees, and the
    rest of J19 matches plain J19.
  - grace.p2 is 2028-06-09 to 2028-08-07 (22 days in June, 53 by July 31, 60 on August 7), and it
    is shown.
- The point 25 tests' own dates are right:
  - validation 3 of J14: 2025-12-01 is a Monday, and ten business days end on 2025-12-15;
  - validation 2 of J14: 2025-06-01 is a Sunday, and ten business days end on 2025-06-13, before
    Juneteenth;
  - J06: 2025-12-12 plus 60 days is 2026-02-10;
  - J15 Job B: 2025-10-31 plus 10 days is 2025-11-10.

## Home and the Timeline for J12, J13, J14 and J19 with a petition

| Case | Home eyebrow | Timeline "now" | Petition-nulled row |
|---|---|---|---|
| J12, J13, J14 | "F-1", no current stage | none | grace.p1: no mark, the DSO line and the cap_gap.for_dso words |
| J19 plus any petition that can extend a2 (D, G to K) | "F-1 · STEM OPT EXTENSION, FROM THE DATES YOU ENTERED" | stem.a2 only (its own dates, as point 22 says) | grace.p2: no mark, the DSO line and the words |
| J11 plus a petition filed 2026-03-02 | OPT (a1 runs to 2026-09-30) | opt_post.a1 | grace.p1 unknown |

No view names a stage the petition could change as "now". The mission's check passes. Finding 1
is about the rows of other stages.

## Point 23 and 23a, by twin (J19, against J19 without the petition)

| Twin | Start used | Taken away | Asked | Late-filing conflict |
|---|---|---|---|---|
| A, M: 2020 start, approved or pending | 2020-10-01 | nothing, and no cap_gap.for_dso | a2.filed_on stays | kept |
| E: approved, validity 2020, requested 2027 | validity 2020 | nothing | stays | kept |
| F: denied, validity 2027, requested 2020 | requested 2020 | nothing | stays | kept |
| B: pending, start 2025-06-01 (after p2 ends, before a1) | 2025-06-01 | grace.p2 (program member) | stays | kept |
| C: start 2026-06-08 (inside a1) | 2026-06-08 | grace.p2 (a1 card member) | a2.filed_on dropped | skipped (a1 could be extended) |
| D: start 2026-06-09 (a2's first day) | 2026-06-09 | grace.p2, validations 1 to 3, both evaluations | dropped | skipped |
| G: approved, no starts | none | the same as D | h9.validity_start | skipped |
| H, I: pending or no outcome, no starts | none | the same as D | h9.requested_start | skipped |
| J: outcome "not_sure", requested 2027 | 2027-03-01 | the same as D | nothing new | skipped |
| K: type "o1" | 2027-03-01 | the same as D | h9.type | skipped |
| LATE plus a start of 2025-06-08, the day before a1 | 2025-06-08 | grace.p2 (program member) | nothing | kept |
| LATE plus a start of 2025-06-09, a1's first day | 2025-06-09 | grace.p2 | nothing | skipped |

Every row follows point 23a. The pack reads the late-filing check against the card it extends
(a1), and so do the tests (test_fix7.py:181-187). For twin C this drops `a2.filed_on`, because
the only rule that reads it is skipped. I read that as consistent with point 23: the conflict
asks whether a1 was in force, and a petition that could extend a1 bears on that.

## The findings of reviews/product-2-fix6.md

1. Closed for every input it named.
   - J12, J13 and J14: grace.p1 is `unknown`. `stageEyebrow` gives "F-1", and no row is marked.
   - J19 plus a petition: grace.p2 is `unknown`, and stem.a2 is the only "now".
   - J11 plus a petition: opt_post.a1 is current and grace.p1 is `unknown`.
   - The same engine change reaches stages no petition touched. See finding 1 below.
2. Closed. A 2020 petition keeps `conflict:stem.filed_while_opt_in_force.a2` and `a2.filed_on`.
3. Closed.
   - labels.ts now names the grace period, the counts, the STEM reports and evaluations, and any
     cap-gap period, and it says "A petition to change your status".
   - The pack says "A petition for a change of status, such as one for H-1B" (point 24a).
   - A type of "o1" is asked as `h9.type`.
4. Closed. All four mutants that point 25 names are now caught:
   - the petition member of the job-end evaluation removed (2 tests fail);
   - the program-end grace member removed (3 fail);
   - `on_or_before` turned to `before` on the validation filing tests (3 fail);
   - the late-filing skip in each direction (6 fail each way).
5. Closed. The outcome step has `notSure: true`, and its why line points to the DSO.
   `records.ts` does not send "not_sure" as the outcome. The requested start is still required.

- Note 1 (job-end reports dated after the card end): still open, for the cap-gap round.
- Note 2 ("o1" taken in silence): closed. It is asked now.
- Note 3 (point 21's citation): closed. Point 21 now cites reviews/product-2.md finding 9, which
  is the finding about fields the SPEC does not ask.
- Note 4 (`unemployment.total` nulled over the whole card): unchanged. It is cautious and states
  no wrong number.

## Findings

1. Blocking. `unknown` now reaches stages that no petition nulled. On those rows the Timeline
   drops their dates and prints the DSO line, and on petition cases it also prints the
   petition's words.
   - engine/path.py:653-670 `_state` gives `unknown` to any stage with a null start or end. It
     also places a stage with no span by its windows.
   - Input: the twenty journeys, no petition in 17 of them, on 2026-09-29.
     - `transfer.mv1` goes from current to unknown in J01, J03, J04, J07, J10 and J19, and
       `transfer.mv2` does the same in J19.
     - `opt_job_end.w1` goes from current to unknown in J01, J08 and J15.
     - The contact-new-DSO window of J01's mv1 (opens 2024-07-15, closes null because
       `mv1.contacted_new_dso_on` is asked) is one of these.
   - web/src/lib/views/timeline.ts:138-144 then empties `row.items` and `row.meta` and writes
     "Your DSO can tell you these dates."
     - At fix 6, J01's transfer row read `meta "from Jul 15, 2024"` with 2 items. It now reads
       `meta ""`, 0 items, and "Your DSO can tell you these dates."
     - That row's missing day is the person's own answer, which Duly already asks. The line
       sends it to the DSO instead.
   - On any case with cap_gap.for_dso, the same rows also carry the petition's words: "Such a
     petition can change these dates".
     - J19 twins B, C, D, G to K, and both LATE twins with a petition that could extend a1: the
       transfers of 2021 and 2023.
     - J14: `opt_job_end.w1`, a1's job report from 2024. The petition was filed on 2026-04-01.
     - J14: `stem_job_end.w2`, whose report window 2026-07-15 to 07-25 stays dated in the output
       but is hidden on the row.
     - A petition cannot change any of these, so the words state something false about the
       person's record.
   - The SPEC this breaks:
     - Point 19: "A case with no petition is computed as before; every other journey is
       unchanged".
     - Point 22: it covers the stage "whose dates a petition makes null".
   - The fix 6 eyebrow "F-1 · SCHOOL TRANSFER" on J01, J03, J10 and J19 was wrong, and HEAD
     removes it, which is right. test_fix7.py:154 needs that too, because it asserts stem.a2 is
     the only current stage on J19.
   - So the SPEC needs to say what an open-ended stage is, one with a start and a null end that
     no petition caused. The web should keep the row's own dates, and it should give the DSO
     line and the petition's words only to stages the petition nulled.
2. Should fix, tests. Three mutants pass every acceptance, holdout and engine test:
   - `job_anchor_any_petition`: the point 23 filter on `stem_job_end.evaluation_final` is made
     true for any petition (parameters.yaml:2041).
     - Input: J15 plus a petition filed 2020-04-01 with a start of 2020-10-01.
     - HEAD dates Job B's final evaluation 2025-10-31 to 2025-11-10, which is right. The mutant
       nulls it.
   - `unemp_anchor_removed`: `*petition_may_extend_card` removed from the unemployment span
     (parameters.yaml:2297).
     - Input: J15 plus the same 2020 petition.
     - HEAD gives `unemployment.total.a1` 116, the same as without the petition. The mutant
       nulls it.
   - `engine_windowless_span_current`: the window-based placement of stages with no span is
     turned off (engine/path.py:663).
     - J11's `opt_job_end.w1` and J15's `opt_job_end.w2` and `stem_job_end.w3` would go from
       done to unknown.
     - No test pins the state of a stage that has only windows.
   - Caught: the other 14 mutants, including the four point 25 names, the card and grace
     filters in both directions and on the first-day boundary, the approved-reads-validity
     choice, the `unknown` fallback, and the unknown-choice question.
   - No web test gives a Timeline row for an unknown stage that no petition nulled (finding 1).

## Notes

1. Twin B: a pending petition with a start of 2025-06-01 nulls J19's grace.p2, which runs
   2028-06-09 to 2028-08-07. The program-grace filter dates the program grace from p2's end
   (2025-05-17), although after OPT and STEM the grace runs in 2028. This follows point 23a's
   words. It nulls a date and states none, so it is not a wrong number, but the cap-gap round
   should look at it.
2. `ask_unknown_choices` asks for any choice value outside the pack's list, on every record
   kind, not only petitions. The three saved Onboarding cases draw no new question.
3. The plan-fix7b lane branches still hold unmerged "not accepted (escalated)" wip commits. Their
   content has landed through later commits, and I found nothing missing.

## Scores

- correct 2:
  - Every date, item, question and reason on the twenty journeys matches the hand-checked fix 6
    run. The point 23 twins behave as point 23a says, and the mission's Home and Timeline check
    passes.
  - But on eight journeys the SPEC names and that hold no petition (J01, J03, J04, J07, J08, J10,
    J15 and J19), Timeline rows lose their dates and gain the DSO line. Point 19 says those
    journeys stay unchanged (finding 1).
- sourced 4:
  - verify, plain and engine_literals exit 0.
  - The point 23 reading is written in the note of `capgap.petition_for_dso` and marked a
    reading.
  - The labels.ts words and the pack's plain words name the same kinds of date.
- never_assumes 3:
  - Missing starts, an unknown type and a missing filing day are all asked, and the dates wait
    null. Old petitions keep the question and the conflict.
  - The unknown row tells the person the DSO can tell them a date that Duly is asking the person
    for (J01, `mv1.contacted_new_dso_on`).
- inside_the_boundary 3:
  - The petition's words, "can change these dates", appear on rows for transfers from 2021 and
    2023 and on a job report from 2024. The petition cannot change any of them, so this states
    something false about the person's record.
- secure 4:
  - All journeys, twins and probes return 200.
  - An unknown choice value is asked, not taken in silence.
  - I found no crash or stall.
- tested 3:
  - 14 of 17 mutants are caught, including every one point 25 names.
  - Two point 23 filters whose removal changes a visible date or count (Job B's evaluation and
    unemployment.total) are pinned by no test. Window-based placement is untested, and so is the
    unknown row without a petition.

Mean 3.17, below 4.3. Four lines are below 4. There is one blocking finding.

VETO
