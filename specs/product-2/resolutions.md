# product-2 resolutions

From the review of product-2 (reviews/product-2.md). Each point answers its finding.

## Covers

Register rows: the rows specs/path-1/programs.md section 22 and specs/design-1/SPEC.md Covers name. That is 0 of 2456 new requirements; these points finish what those SPECs asked.

1. Wired end to end. POST /v1/compute calls engine/path.py on the records case and returns its output (finding 1). `compute_f1_records` is the translation of today's case onto records and path.py (programs.md section 19). `compute_f1` stays as it is for /v1/compute/f1 until a later round retires it with its 758 tests; the app no longer uses it. The web app builds the records case from Onboarding and posts it to /v1/compute; /v1/compute/f1 stays for old callers only.
2. Acceptance, not only units. The twenty journeys of specs/path-1/journeys.json are cases in tests/unit/acceptance/test_journeys.py, each sent through POST /v1/compute with the answers a student would give, each asserting the stages, dates, counts and verdict its timeline and rules give (programs.md section 22). Hidden twins with other dates are in tests/holdout. Every build lane's done command runs the acceptance tests it touches.
3. Links are followed. A field path through a link (`to_program.start_date`) reads the linked record (finding 2, J08).
4. The grace span and the unemployment span end at the cap-gap end while a cap-gap is active, as specs/path-1/programs.md section 14 says (findings 3 and 6, J12, J13).
5. A count or an at-or-over item that reads a list is null until that list has a completeness statement (finding 4). PRINCIPLES 2.
6. A next stage whose window has closed is not shown as next (finding 5, J01, J19).
7. `stem.basis_ten_years_end.<program>` waits for a contract construct for a computed date in the path (finding 8, J02); its tests wait with it. Disagreeing CPT day and month bars raise the step-back item (finding 10, J06). `lists` carries the stage's lists (note 13). `ends_also`, `follows`, `gap_allowed` and periods outside a span are built (note 14).
8. The pack asks only what programs.md section 17 asks: no `c<n>.decision`, no `stem_list` or `conferred_on` for outside_us or English language programs (finding 9).
9. The litigation reason follows product-1 points 25 and 49: only when an item shown carries an alternate with a different value. An F-1 case can reach every verdict.
10. Onboarding is programs.md section 18 in full: every level (associate, English language, other included), every program with its state and conferral day, moves, trips, "I'm not sure", and the D59 step. No default level is sent (finding 7, J16).
11. `make design-shots` and desktop/src/shots.ts render each built screen at 1280x832 from engine samples, and tests/design/landmarks.json holds each canvas landmark (finding 11).
12. Test ids follow the pack where the values agree: the cap-gap grace is `grace.<petition>` and the cap-gap unemployment count `unemployment.opt_card.<petition>` (the pack builds them for each petition). The pack's `unemployment.total` span ends at the cap-gap end, as point 4 says, instead of giving no end. The pack's `opt_post` span holds the release date in `ends_also` only, so the two readings can differ. `test_path_reach.py::test_a_litigated_rule_in_use_is_cannot_tell` follows point 9.
13. Every list a counter reads needs a completeness statement before the count is given, trips as well as work (point 5, read strictly): a trip changes the count, so the count is null until the student says the trip list is whole. A journey test whose timeline holds every trip states that list whole. The acceptance tests use the ids of point 12, and J02's ten-year test waits with point 7. The pack adds what J05, J17 and J20 need: part-time pre-completion OPT counted against the months at a level, the enrollment check, and a months-at-level condition on the next post-completion OPT, each from a saved primary source.
14. The translation of today's case (compute_f1_records) answers the path's own questions: a list is whole by the path's `complete.<kind>` statement, never by an answer to a question the path does not ask (`nothing_more_to_record`, `opt.earlier_at_this_level`): the translated case answers the path's own questions only. This overrides the confirmations row of programs.md section 19. An answer to an unasked question is never turned into a completeness statement (PRINCIPLES 2). Translation tests state each list whole where the case means it, compare with the case as sent (with the abouts the guard puts in), and hold no placeholder marker.
15. From the review of product-2 fix 1 (reviews/product-2-fix1.md):
    - The STEM final evaluation and the last validation are dated from the day the practical training opportunity ended (the job's end, or the card's end if sooner), never after it: (f)(10)(ii)(C)(9)(i), "no later than 10 days following the conclusion of his or her practical training opportunity" (J04, J14). No validation is dated after the card ends.
    - A next stage is shown only while a window in which something can be filed is open; `opt.complete_by` is not such a window (J06).
    - When a cap-gap petition is approved with a change of status, no F-1 grace follows its start date: H-1B status begins then (J12).
    - Onboarding: "A job on campus" moves on; every view has its why line; every date the journeys may not hold (the day course requirements were done, the DSO recommendation and decision days, the move's days) takes "I'm not sure", and the engine asks for it later as it already does; `complete.withdrawal` is asked; names in field problems keep their capitals (DSO, I-20).
    - `make design-shots` (the founder's Makefile target) runs desktop/src/shots.ts, which renders each built screen at 1280x832 from engine samples into the folder it is given, and tests/design/landmarks.json holds each canvas landmark.
16. From the review of product-2 fix 2 (reviews/product-2-fix2.md). Point 15's words "or the training ends" were wrong for validations and are corrected here:
    - Validation reports exist only while a STEM card exists: 8 CFR 214.2(f)(12)(ii)(B), "The requirement for validation reporting starts on the date the 24-month OPT extension begins and ends when the student's F-1 status expires or the 24-month OPT extension concludes, whichever is first." A next STEM stage, before any STEM card, carries no report dates. A job's end does not end validations.
    - A final evaluation is due for each practical training opportunity on the STEM card that ends, dated from that job's end ((f)(10)(ii)(C)(9)(i)), including a job that ends before a later one begins (J15, Job B).
    - Onboarding never preselects an answer: "Which program did you withdraw from?" opens with nothing chosen.
    - The engine samples the shots and web tests read are made from the engine by a script kept in web/ and rerun in the build, so they never drift; the shot run counts a screen as drawn only when it holds the screen's own landmark, never an error screen.
17. From the review of product-2 fix 3 (reviews/product-2-fix3.md):
    - A change-of-status petition ends validations only when it belongs to this STEM card: filed while the card runs, approved, and its change of status not ended (`cos_ended_on` empty) before the start. An older petition from before this F-1 status never drops a report. A journey twin holds such an older petition.
    - The web samples are made by web/samples/make.py through the founder's `make samples`, run before design-shots; web/package.json is not changed for it.
    - The shot run's landmark check compares a screen's own heading text as well as its type.
18. From the review of product-2 fix 4 (reviews/product-2-fix4.md). Point 17's test "filed while the card runs" was the wrong test and is replaced:
    - A change-of-status petition belongs to the student's current F-1 status when it is approved and its validity start is on or after the start of the current post-completion OPT or STEM card. Only such a petition ends validations, opens the cap_gap stage, or takes the grace away. An older petition does none of these and raises no conflict (finding 1). A petition filed during OPT for a start after it (the usual cap-gap) belongs (finding 2).
    - When the facts that decide it (the outcome, the validity start) are missing, Duly asks for them and never reads the gap as "does not belong" (PRINCIPLES 2).
    - Twins hold a denied and a pending petition on the card, and one with no validity start.
    - The shot run counts a screen as drawn when the page holds the element the app marks as that screen's landmark (data-landmark="<screen>"), which no error screen carries. Text is not compared (design-1 section 14.1 stands).
19. Cap-gap gets a round of its own, designed from a full matrix of petition cases (approved, denied, pending, withdrawn, rejected, revoked; before, during and after each card; with facts missing). Three reviews in a row found wrong dates from the pack's petition rules. Until that round:
    - When any change-of-status petition is entered, the items it could change are null: the grace of the program and card it could follow, every validation and evaluation from the petition's filing onward, the unemployment count from that day, and any cap-gap stage. The verdict carries the judgement item `cap_gap.for_dso` (talk_to_dso), whose plain words say that an H-1B petition can change these dates and that the question is for the DSO, citing 8 CFR 214.2(f)(5)(vi). No petition opens a stage, raises a conflict, or takes a date away on its own.
    - A case with no petition is computed as before; every other journey is unchanged.
    - The journeys that hold a petition (J12, J13, J14 and the twins of points 17 and 18) expect exactly this step back.
    - The register rows on cap-gap stay not met until that round.
20. The landmark each screen carries is its route (`data-landmark="/timeline"`), written by the web app and read by the shot run, with one test that joins the two sides.

## 21. While cap-gap is deferred, the petition's outcome and validity start are not asked

Point 19 steps back for any change-of-status petition whatever its outcome, so the outcome and
the validity start decide nothing yet. Asking for them keeps a question open that no answer can
close (reviews/product-2.md, finding 9). The two J19 twins that expect `h9.outcome` and `h9.validity_start`
as questions keep their step-back assertions as passing tests; the question assertions move to
`pytest.mark.xfail(strict=True, reason="point 21: asked again in the cap-gap round")`, so the
cap-gap round turns them back on.

## 22. A stage whose dates a petition makes null is `unknown`, never `current`

Review fix6 finding 1. When point 19 makes a stage's start and end null, the stage's state is
`unknown` (contracts/engine_output.schema.json). An `unknown` stage is never the first current
stage, never feeds Home's eyebrow, and is never marked "now" on the Timeline; the Timeline shows
it in place with "Your DSO can tell you these dates" and the step back. If no stage is current,
Home's eyebrow names none. A stage that has its own dates keeps its state as before (J19's
stem.a2 stays current).

## 23. A petition steps back only for a card it could extend

Review fix6 finding 2. Cap-gap extends status and permission to work until the petition's start
date (8 CFR 214.2(f)(5)(vi)(A), a reading). A petition whose start (validity_start when
approved, else requested_start) falls before a card's start cannot extend that card, so point 19
does not step back for that card and nothing is taken away from it: its conflicts and questions
(for example `conflict:stem.filed_while_opt_in_force` and `a2.filed_on`) stay. When the start
needed to decide this is missing, it is asked, and point 19 steps back until it is answered.
The filing-day test on every validation stays `on_or_before`.

## 24. The words name what is taken away, and do not name a kind the person did not enter

Review fix6 finding 3. The step-back words (web/src/lib/labels.ts and the pack's plain words)
name every kind of date point 19 nulls: the grace period, counts from the filing day, STEM
reports and evaluations, and any cap-gap period. They say "A petition to change your status",
not "An H-1B petition", unless the petition's type is h1b. A petition type outside the pack's
choices (for example "o1") is treated as missing and asked; it is never taken in silence
(review note 2).

## 25. The tests pin what point 19 and 23 take away, including the boundary day

Review fix6 finding 4. Tests that fail on each of: removing the petition member of
stem_job_end.evaluation_final; removing the program-end petition member of the grace;
`on_or_before` turned to `before` on a validation's filing test (a report due on the filing day);
the point 23 skip in each direction (a 2020 petition keeps J19's late-filing conflict; a
petition starting after the card start steps back).

## 26. Onboarding does not require the petition's outcome while cap-gap is deferred

Review fix6 finding 5 and point 21. The outcome step offers "I'm not sure" and may be left;
its why line says Duly will point to the DSO for these dates for now. The requested start stays
asked, because point 23 needs it.

## 23a. Point 23, clarified (fix7 test lane escalation)

- The period a petition would extend: for a card's dates (reports, evaluations, unemployment,
  the card grace), the card, which begins on the card's start; for the program grace, the grace,
  which begins the day after the program ends. A petition whose start falls before that
  beginning cannot extend it: point 19 takes nothing from it. So a 2020 petition nulls nothing on
  J19, the program grace included, and gives no cap_gap.for_dso for those periods. The two older
  J19 tests that expect a 2020 petition to step back change under this point.
- The start used: validity_start when approved and entered, else requested_start. Only when both
  are missing is a start asked (`<petition>.requested_start`, or `validity_start` when approved
  and requested_start is missing), and point 19 steps back until it is answered. Point 21's
  strict xfail (approved, requested_start entered, validity_start missing) stays: nothing is
  asked there.
- An `unknown` stage's Timeline row carries no mark (not now, not done); it holds the DSO line
  and the words of cap_gap.for_dso.

## 24a. Point 24, corrected for the pack (fix7 content lane escalation)

The pack's plain words are never about a person (contracts/rulepack.schema.json, the plain
gate), so they cannot say "your". The pack says "A petition for a change of status, such as one
for H-1B" and never "An H-1B petition" for a petition of any type. Only web/src/lib/labels.ts,
which speaks to the person, says "A petition to change your status". The test of the pack's
words checks that it names every kind of date taken away and does not say "An H-1B petition".

## 22b. Point 22, corrected: only a stage a petition nulled carries the step back (review fix7 finding 1)

- A stage whose start or end is null is `unknown` and is never shown as now, whatever the cause
  (the fix 6 eyebrow "School transfer" on J01, J03, J10 and J19 was wrong, and stays removed).
- The engine puts the step-back reason (`cap_gap.for_dso`) in a stage's `reasons` only when a
  member that point 19 or 23 nulls made that stage's start or end null. No other stage carries it.
  A case with no petition carries it on no stage (point 19: every other journey unchanged).
- The Timeline row of an `unknown` stage keeps its own known dates (for example "from Jul 15,
  2024") and its items, including the questions that would close it. Only a row whose stage
  carries the step-back reason gets "Your DSO can tell you these dates." and the petition's words.
  So J14's opt_job_end.w1 and stem_job_end.w2 and the 2021 and 2023 transfers of the J19 twins
  carry neither.
- Tests pin: each journey without a petition carries the reason on no stage; the three mutants of
  review fix7 finding 2 (job_anchor_any_petition and unemp_anchor_removed with J15 plus a
  petition filed 2020-04-01 starting 2020-10-01; the window placement of a stage with no span,
  J11's opt_job_end.w1 and J15's opt_job_end.w2 and stem_job_end.w3 stay done).
