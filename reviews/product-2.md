# Review: product-2 (path over records, D59 questions, POST /v1/compute, the canvas app)

Run l-review-b7ccda7ad9. Reviewed commit 233625c. The diff is dcf95f7..233625c (80 files).
Specs: specs/path-1/SPEC.md, specs/path-1/programs.md, specs/design-1/SPEC.md,
specs/documents-1/SPEC.md section 8, PRINCIPLES.md, BOUNDARY.md, CLAUDE.md.

## What ran

- `uv run pytest tests/unit tests/holdout -q -p no:cacheprovider --ignore=tests/unit/tools`: exit 0, all passed.
- A probe script (TMPDIR/rv/journeys.py) sent eleven journey cases (J01, J02, J03, J06, J08,
  J09, J09 late variant, J12, J13, J16, J19) as records cases under contracts/case.schema.json
  through POST /v1/compute with TestClient and a FixedClock at 2026-09-29 16:00 UTC, zone
  America/New_York. It also sent the same cases straight to engine.path.compute with the
  shipped packs. The output is in TMPDIR/rv/journeys.txt and journeys.json.
- I read engine/path.py, api/case.py, api/main.py, the path section of
  rulepacks/f1-us/v2026.09/parameters.yaml, web/src/app/caseStore.tsx, Onboarding and the
  views, and the canvas PNGs Timeline.png and Onboarding.png.

## The journeys through /v1/compute

Every one of the eleven returned 200 with verdict cannot_tell and the reasons
`category_not_covered:f1`, `no_documents`, and empty computed, upcoming, questions and rules.
api/case.py never calls engine/path.py: its docstring says "No engine function reads a records
case yet, so every category is answered as not covered". The verdict is not quiet, but it
shows nothing. No journey can be checked through the api. That is finding 1.

## The journeys through engine.path.compute (what the api should have returned)

Dates checked by hand against the journey timelines and the rule values:

- J01: OPT windows for both cards are right (a1 2023-02-11 to 2023-07-11, complete by
  2024-07-12; a2 2026-02-14 to 2026-07-14, complete by 2027-07-15; STEM window for a2 opens
  2027-03-16). `stem.a1` is shown as next with windows in 2024: p2's conferred_on is not
  entered, so the basis condition is unknown and the step is shown with a question, as
  section 13 point 6 says. The 2024 window is long closed (finding 5). The stage `transfer.mv1`
  stays current in 2026 because its end rule has no row on 2024-08-26 (a saved-copy gap, by
  design, but the stage never ends).
- J02: STEM window 2026-10-21 to 2027-01-19, right. `stem.basis_ten_years_end.<program>`
  (programs.md section 14) is not in the output (finding 8).
- J03: full-time CPT at the master's level 171 days (82 + 89), right. CPT asks `c1.decision`
  and `c2.decision`, which section 10 says is asked for all but CPT (finding 9).
- J06: `cpt.full_time_days_at_level.master` 370, right (89 + 124 + 131 + 26). Months 10.
  Days are over the bar and months under it; section 14 says the verdict steps back when the
  two disagree, and no item for that is raised (finding 10).
- J08: wrong on the journey's own line. The bachelor's OPT must end 2025-01-12, the day
  before the master's starts (change of level, section 11). The engine gives
  opt_post.a1 ends 2025-06-02, the card end, and `unemployment.opt_card.a1` 365. It also
  shows `stem.a1` as next, an extension of a card the change of level ended (finding 2).
- J09: windows from the end date in force on filed_on: 2025-09-20 to 2026-02-17, latest
  start 2026-02-17, complete by 2027-02-19. All right. The late variant (requested
  2025-05-20) raises `conflict:end_date_change.asked_before_end.ec1` and asks. Right.
- J12: cap_gap.h1 2026-06-01 to 2026-10-01, current. Right. But grace.p1 is 2026-06-01 to
  2026-07-30 and "done", while the person is inside the cap-gap. Section 14 says grace
  starts after the latest end of the program, its cards and its cap-gap (finding 3).
- J13: denied petition gives `grace.after_cap_gap_outcome.h1`, no grace date. Right. The
  unemployment count stays on the card (365) and does not run through the cap-gap to
  2026-08-14 as section 14's counter table says (finding 6).
- J16: foreign bachelor's p0: no STEM next step. Right. It still asks `p0.stem_list` for an
  outside_us degree (finding 9).
- J19: STEM validations 2026-12-09 to 2026-12-23 and 2028-06-09 to 2028-06-26 (Juneteenth
  skipped), right. `opt_post.p1` (the associate's) is "next" with a window that closed in
  2023; it asks p0.stem_list and p0.conferred_on for the English language program
  (findings 5 and 9).
- J01, J02, J08, J12, J13 hold no work records, and the work list is not stated whole, yet
  the engine counts every card day as unemployed and raises
  `unemployment.opt_card.at_or_over_limit.<card>` (finding 4).

## Quiet verdicts

- Unchecked typed dates: path.py gives cannot_tell with `unconfirmed:typed_dates`, or
  talk_to_dso when a judgement item exists. Never quiet. The web app never reaches it,
  because it computes through /v1/compute/f1 and engine/f1.py asks no D59 question; there it
  stays cannot_tell with no_documents. Not quiet.
- A list with no statement: every kind a selector reads becomes `unconfirmed:complete.<kind>`
  and blocks. Not quiet. It over-asks: J01 gave `authorization:p1` and `authorization:p2`
  and still got `complete.authorization`.
- An unknown condition: next with only_if shows the step and asks. In a date's optional
  member, a selector that is unknown returns None and the member is skipped without a
  question (engine/path.py `_when`, the optional branch discards the sub trace). I could not
  name a shipped-pack input that reaches it in the time, so it is a note, not a finding.
- `rule_in_litigation` blocks every F-1 case that reads a regime rule, so no F-1 case I sent
  can reach no_open_items at all.

## The screens against the canvas

design-1 section 14.4 asks for `make design-shots` and desktop/src/shots.ts. Neither exists,
and no tests/design/landmarks.json exists (finding 11). Playwright is not installed in
node_modules, so I could not render the built app. I compared by structure:

- Timeline.png draws one row per phase, a NOW row with a progress bar, application steps and
  a covered list. Timeline.tsx builds rows from `output.stages`. The app's output comes from
  /v1/compute/f1, which has no stages, so in the real app the Timeline holds only the Beyond
  row, and Checklists is empty. The screens work only on web/samples (finding 1).
- Onboarding.png: 560px column, wordmark, five pips, "Step 2 of 5", Back and Continue. The
  canvas preselects "Employee"; section 18 removes that, and the build does. But the build
  asks round A's facts: one program sent, CPT as a typed count, no STEM list question, no
  move, no program state or conferral day, no trips, no "I'm not sure", no D59 step. The
  level choice offers only Bachelor's, Master's and Doctorate, where section 18 lists
  Associate, English language and Other too (finding 7).
- Main, Checklist and Updates PNGs: not compared by render, for the reason above.

## Findings

1. Blocking. api/case.py: POST /v1/compute never calls engine/path.py. Input: J01 of
   programs.md exactly, or any of the eleven cases. It returns cannot_tell with
   `category_not_covered:f1` and nothing computed. design-1 section 11 and contracts-reconciled
   point 10 say it takes the records case and returns the engine output. The web app still
   posts case_f1 to /v1/compute/f1 (web/src/app/caseStore.tsx line 66 to 91), and engine/f1.py
   is not a translation onto path.py (path-1 SPEC point 7, programs.md section 19; the engine
   log says "The translation is not done"). So Timeline, Checklists and Home round B read
   fields the app's output never holds.
2. Blocking. engine/path.py `_first` (line 321 to 328) reads `r["fields"].get(first["field"])`,
   so a field path through a link such as `to_program.start_date` is never followed. Input:
   J08 (p1 bachelor 2020-08-24 to 2024-05-10, p2 master start 2025-01-13, move change_of_level
   p1 to p2, OPT a1 2024-06-03 to 2025-06-02). The OPT span ends 2025-06-02, not 2025-01-12,
   and STEM is offered as the next step of a card the rule ended. Wrong date on a SPEC input.
3. Blocking. rulepacks parameters.yaml grace stage: the span leaves out the cap-gap end.
   Input: J12 (card end 2026-05-31, petition approved, validity 2026-10-01). grace.p1 shows
   2026-06-01 to 2026-07-30, state done, while cap_gap.h1 is current. The content log admits
   it ("grace does not include it"). Section 14 names the cap-gap in grace's span.
4. Blocking. engine/path.py counters: `days_without_qualifying_period` counts every day with
   no work record as unemployed while the work list has no completeness statement. Input:
   J12 with no work records. `unemployment.opt_card.a1` 365 and
   `unemployment.opt_card.at_or_over_limit.a1` are in the output: a count about the person
   built on an unanswered list. The verdict is cannot_tell, but the value and the
   at-or-over item state a conclusion that nothing supports. It should be null until the
   list is stated whole.
5. Should fix. Next stages whose windows closed years ago stay "next". Inputs: J19
   (`opt_post.p1` next with a window that closed 2023-07-18), J01 (`stem.a1` next with a
   window that closed 2024-06-18).
6. Should fix. The unemployment span is not extended by the cap-gap. Input: J13: count 365 on
   the card, cap-gap to 2026-08-14 not counted.
7. Blocking. web/src/app/Onboarding.tsx and lib/views/onboarding.ts: onboarding is round A's,
   not programs.md section 18's. Input: a student in an associate's or English language
   program. The level step offers only bachelor, master and doctorate, so the student must
   enter a wrong level. caseStore.tsx `caseFields` also sends `degree_level: "bachelor"` when no
   program is held, the default section 10 says "goes (J16)".
8. Should fix. `stem.basis_ten_years_end.<program>` is not produced. Input: J02.
9. Should fix. Fields asked that the SPEC does not ask: `c<n>.decision` for CPT (J03, J06),
   `p0.stem_list` for an outside_us degree (J16), `p0.stem_list` and `p0.conferred_on` for
   English language training (J19). Each keeps the verdict at cannot_tell for no reason.
10. Should fix. When CPT days and CPT months disagree on the bar, no step-back item is raised.
    Input: J06: 370 days, 10 months.
11. Should fix. `make design-shots`, desktop/src/shots.ts and tests/design/landmarks.json of
    design-1 section 14.4 do not exist, so no screen can be compared with its canvas.
12. Should fix. programs.md section 22: "The twenty journeys become cases in tests/holdout,
    each a pair". No holdout file names a journey (grep for J01 to J20 in tests finds only
    tests/PROGRESS.md). The tests pass while finding 2 stands, so they would not catch it.
13. Note. The engine output's `lists` is always [] (engine/path.py compute), though opt_post
    declares `lists: [stem.requirements]`.
14. Note. The engine log lists `ends_also`, `follows`, `gap_allowed`, periods outside a span and
    window references as not built. The probe confirms `ends_also` gives no end_by_source item.

## Scores

- correct 2: wrong dates on J08 and J12, which the SPEC names; the api route computes nothing.
- sourced 4: every rule the path names exists in the pack with a quote, the source check
  passes, and the literal gate passes. Grace leaving out the cap-gap is a content gap, not an
  unsourced number.
- never_assumes 3: lists and missing fields become questions, but the unemployment count
  assumes no work where the list is unanswered, and the web sends bachelor by default.
- inside_the_boundary 4: no string I read states a conclusion about the person; the
  at-or-over items go to the DSO. The unemployment value in finding 4 is the one crossing.
- secure 4: the api refuses bad bodies as /v1/compute/f1 does; records of unknown kinds are
  refused by name, never by value. I did not fuzz the path engine.
- tested 2: the suites pass while findings 1, 2, 3 and 4 stand; the journey pairs are absent.

Mean 3.17, below 4.3; three lines below 4; blocking findings stand.

VETO
