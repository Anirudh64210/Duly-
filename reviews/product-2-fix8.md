# Review: product-2, fix round 8 (specs/product-2/resolutions.md point 22b)

Run l-review-0ba3ea5fce. Reviewed commit ca6abcd. The diff is 3d09f03..ca6abcd:

- engine/path.py `_step_backs`;
- web/src/lib/views/timeline.ts (the unknown row);
- tests/unit/acceptance/test_fix8.py, web/src/lib/views/fix8.test.ts, and the point 22b lines in test_fix7.py, fix7.test.ts and tests/holdout/test_holdout_journeys.py;
- the factory preflight (tools/factory), which is outside product-2.

The pack, the contract and web/samples are unchanged. Every lane commit of plan-fix8 is on the branch: 7ea1763, 66378f1, 2b391fa, 6b05c5a and 498df08.

## What ran

- `uv run pytest tests/unit tests/holdout -q -p no:cacheprovider --ignore=tests/unit/tools`: exit 0. The one `x` is point 21's strict xfail.
- These all exit 0: `tools.sources.verify rulepacks` ("every quote found"), `tools.sources.plain rulepacks --require f1`, `tools.gates.engine_literals`, copy lint, `ruff check .`, `ruff format --check engine api tests`, `mypy` (63 files) and `web/samples/make.py --check`.
- On a `git archive HEAD` copy under TMPDIR:
  - web `tsc --noEmit`: exit 0;
  - web vitest: 30 files, 575 passed;
  - desktop vitest: 11 files, 139 passed.
- TMPDIR/rv8/run.py sent j01 to j20 through POST /v1/compute (FixedClock 2026-09-29 16:00 UTC). It used the same bodies as the fix 6 and fix 7 runs, which I compared byte for byte. All twenty returned 200 and cannot_tell. I compared every field with the saved fix 6 output (0c55967) and fix 7 output (3d09f03).
- TMPDIR/rv8/twins7.py: the 17 J19 twins of fix 7, plus J12, J13 and J14. Every stage, window, question, reason and item matches fix 7. I listed each stage's `reasons`.
- A scratch web vitest sent every route output (journeys and twins) through `stageEyebrow`, `currentStage` and `timelineView`. I compared each row with the fix 6 rows.
- 10 Python mutants against tests/unit/acceptance, tests/holdout and tests/unit/engine. 3 web mutants of timeline.ts against the web suite.
- Probes P1 to P7: J13 with h1's change_of_status missing, with h1's filed_on missing, with p1's end_date missing, plus a second petition, with change_of_status "no", and without h1.

## Journeys without a petition, against fix 6

The engine output of J01 to J11 and J15 to J20 matches fix 6 in every date, window, item, question and verdict reason. No stage carries `cap_gap.for_dso`. The only engine changes are the ones point 22b states:

- A stage with a null day is `unknown`: `transfer.mv1` in J01, J03, J04, J07, J10 and J19, `transfer.mv2` in J19, and `opt_job_end.w1` in J01, J08 and J15.
- Stages placed by their windows are `done`: J11 `opt_job_end.w1`, and J15 `opt_job_end.w2` and `stem_job_end.w3`.
- The pack's plain words for capgap.petition_for_dso are the point 24a words.

The Timeline rows, against fix 6:

| Row | fix 6 | HEAD |
|---|---|---|
| J01 transfer.mv1 | now, "from Jul 15, 2024", 2 items | no mark, "From Jul 15, 2024", 2 items (the opens and closes questions), "Release date: Jul 15, 2024" |
| J03, J04, J07, J10 transfer.mv1; J19 mv1 and mv2 | now, "from <release>", 2 items | no mark, the same start, 2 items, the release line |
| J01, J08, J15 opt_job_end.w1 | now, 2 items | no mark, 2 items |
| J11 opt_job_end.w1; J15 w2 and w3 | now | done |
| Home eyebrow J01, J03, J19 | "School transfer" | the OPT or STEM card that is current |
| Home eyebrow J10 | "School transfer" | "F-1", because no stage is current |

- No row without a petition shows "Your DSO can tell you these dates." or the petition's words.
- Every date a row held at fix 6 is still on it.
- Point 22b says the fix 6 "School transfer" eyebrow was wrong. J10 now names no stage, as point 22 says.

## Petition cases

The DSO line and the petition's words appear on exactly these Timeline rows, and on no other row in any case:

- J12, J13 and J14: grace.p1.
- J19 twins B, C, D, G, H, I, J and K, and the three LATE twins that step back: grace.p2.

Each of these stages carries `reasons: ["cap_gap.for_dso"]`.

The rows that carry neither:

- J14's opt_job_end.w1 and stem_job_end.w2. The w2 report window of 2026-07-15 to 07-25 is shown.
- The 2021 and 2023 transfers of every J19 twin.
- Twins A, E, F, L, M and LATE plus 2020 give no reason at all, which is point 23a.

The nulled grace rows now also list the program's facts (end date, field, level, school), as a done grace row does.

## Dates checked by hand

- J15 unemployment.total.a1 on 2026-09-29 is 116:
  - on the OPT card, 2024-06-15 to 08-19 is 16 + 31 + 19 = 66 days, and 2025-04-01 to 04-20 is 20, so 86;
  - on the STEM card, 2025-11-01 to 11-30 is 30.
  - journeys.json J15 gives the same 116 (86 plus 30).
- Job B's final evaluation: 2025-10-31 plus 10 days is 2025-11-10.
- J11 w1's report: 2026-02-27 plus 10 days is 2026-03-09.
- J15 w2's report: 2025-06-14 plus 10 days is 2025-06-24.
- Every other date matches the fix 6 and fix 7 runs byte for byte, and those runs checked them by hand.

## The findings of reviews/product-2-fix7.md

1. Blocking finding (unknown reached stages no petition nulled): closed.
   - engine/path.py:645-648 and 657-690 put `cap_gap.for_dso` in a stage's reasons only when the span's null day becomes known once the petition records are left out.
   - timeline.ts:138-145 keeps the row's meta, items and fact lines, and adds the DSO line and the words only when the stage's own reasons hold the step back.
   - Every input the finding named now gives the row point 22b describes (tables above).
2. Should-fix finding (three surviving mutants): closed. Each is now caught:
   - `job_anchor_any_petition`: test_fix8.py:359;
   - `unemp_anchor_removed`: test_fix8.py:372;
   - `engine_windowless_span_current`: test_fix8.py:384 and :395.
   - fix8.test.ts covers the unknown row without a step back. Both of my web mutants that touch it are caught: taking the step back from the verdict, and emptying the row's items and meta.
- Note 1 (twin B, the program grace dated from p2's end): unchanged. It is for the cap-gap round.
- Note 2 (`ask_unknown_choices` on every record kind): unchanged. No journey draws a new question.
- Note 3 (unmerged plan-fix7b wip branches): unchanged. Nothing is missing from HEAD.
- Fix 6 note 1 (job-end reports dated after the card end): still open, for the cap-gap round.

## Findings

1. Should fix. A grace row that a petition's missing fact nulled gives no reason and no question.
   - Input: J13 with h1's `change_of_status` left out (P1), or its `filed_on` left out (P2), on 2026-09-29.
   - The engine asks `h1.change_of_status` (or `h1.filed_on`), and grace.p1 is `unknown` with null days. The verdict does not carry `cap_gap.for_dso`, because the judgement needs change_of_status "yes", so the stage has no reasons.
   - Its items are `[]`, and the Timeline row shows only the program's facts: no dates, no mark, no DSO line and no question.
   - Point 22b says the row keeps "its items, including the questions that would close it". The question that closes this row is on the questions list but not on the row.
   - Nothing is assumed: the verdict is cannot_tell and the question is asked. But the row does not say why the grace has no dates.
   - The fix is either the engine putting the petition's open question in the stage's items, or a resolution saying such a row needs no pointer.

## Notes

1. Two engine mutants change no output on any input I have:
   - `sb_starts_only` (test only the null start). Every span a petition nulls loses both days.
   - `sb_no_restore` (skip `_restore` after the recompute). The journeys and the 20 twins are byte for byte HEAD's.
   - They are equivalent today. A later span with one petition-nulled day would need a test.
2. The web mutant `no_facts` (an unknown row with no fact lines) is caught by no test. The known start stays in the meta, which is tested.
3. For the cap-gap round:
   - In twins D and G to K, stem.a2 stays current while its validations are null. The stage's reasons do not hold the step back (only the verdict's do), so its row does not say why the reports are gone. Point 22b says exactly this.
   - The same holds for J14's stem_job_end.w2, whose final evaluation is null.
4. P3 (J13 with p1's end_date missing) gives no grace stage at all. The engine asks `p1.end_date`, and fix 6 did the same, so this is not new.

## Scores

- correct 4:
  - All twenty journeys match fix 6 in every date and differ only as point 22b says.
  - Every Timeline row without a petition keeps its dates and items.
  - The step back sits on exactly the stages a petition nulled.
  - Finding 1 is a row with too little on it, on an input the SPEC does not name.
- sourced 5:
  - verify, plain and engine_literals exit 0.
  - The diff adds no rule, number or quote. The row words are the existing DSO line and the pack's point 24a words, which cite 8 CFR 214.2(f)(5)(vi).
- never_assumes 4:
  - No gap is read as an answer. Missing petition facts are asked, and the dates wait null.
  - The P1 and P2 row does not point to its question (finding 1).
- inside_the_boundary 5:
  - The petition's words, "can change these dates", now appear only on grace rows that a petition nulled.
  - I checked every row of the twenty journeys and 20 petition cases. None puts the words on a transfer or a job report, and none names a stage as now when a petition could change it.
- secure 5:
  - Forty route calls and seven probes, with missing and contradictory petition facts, all return 200.
  - The recompute restores the run's state. Dropping the restore changes no output.
  - No crash or stall.
- tested 4:
  - All three fix 7 survivors are killed now.
  - 8 of 10 Python mutants are caught: the three fix 7 survivors, `sb_every_null_stage`, `sb_never`, and three older controls (the null-is-unknown state, the point 25 job-end evaluation member, the card filter). The two that survive are the equivalent ones in note 1.
  - 2 of 3 web mutants are caught.
  - The fact lines of an unknown row and a one-day petition null are not pinned.

Mean 4.5, at or above 4.3. No line is below 4, and there is no blocking finding.

APPROVE
