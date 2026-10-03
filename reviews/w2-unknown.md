# Review: one rule for unknown values (SPEC-W2-UNKNOWN, plan-w2-p1-unknown.yaml), third pass

Run l-review-e4f7024f0e. Reviewed commit 76a47db. The last review was at 83fddf1. This pass
covers fix 7: engine/path.py (the holds exception, `_tri` and `_known` removed, `_and` added),
api/case.py (the 422 words), tests/conftest.py (the mutants profile skip), and the new tests in
test_w2_unknown.py, test_w2_unknown_stages.py, test_w2_unknown_props.py, test_path_reach.py and
tests/unit/api/test_case_structure.py. I read them against SPEC-W2-UNKNOWN (point 12 as amended
on 2026-10-02), D92 to D94, PRINCIPLES, BOUNDARY.md and my six findings at 83fddf1. Today is
2026-09-29 in every probe, through FixedClock. Probes and the mutant script are in TMPDIR/rvu3.

## What ran

- `pytest tests/unit tests/holdout`, leaving out tests/unit/tools and tests/unit/desktop_entry:
  exit 0, 4 min 33 s. desktop_entry needs Unix sockets, which my sandbox refuses.
- mypy (72 files), ruff check and ruff format on engine, api and tests, engine_literals, sources
  verify (4 packs, every quote found) and copy lint: all exit 0.
- The holds probe from the last review (TMPDIR/rvu2/holds.py) and a wider one
  (TMPDIR/rvu3/holds2.py).
- Every point 52 mutant, plus U21b and three mutants for this round's code (X1 to X3), with
  `--hypothesis-profile mutants`, once against the example files and once against the property
  files (TMPDIR/rvu3/mut.py, a full source copy per mutant). This time **both runs finished**,
  each with a no-mutant baseline that passed.
- The journey outputs at 83fddf1 and at HEAD, counted and diffed in full (TMPDIR/rvu3/jdiff.py).

## The last review's findings

| # | Then | Now | Evidence on HEAD |
|---|---|---|---|
| 1 | holds reads absent `ask` as none | fixed | With c1.online left out, each of `present: true`, `present: false` and `not present: true` gives no tree.c1 reason, asks c1.online with state absent, and gives cannot_tell. |
| 2 | mutants survive | examples fixed, properties not | Every named mutant is now killed by an example. M9, M15, M16 and M20 are killed by the new selection property. Nine named mutants survive every property (new finding 1). |
| 3 | `_tri` and `_known` overbuilt | fixed | Both are gone. `_and` (path.py:104) serves `_all` and `_cond`, and `_any` returns `None if None in results else False` after its early True. Point 12 as amended allows `bool \| None` with the gaps in the trace. |
| 4 | non-vacuity fails under the profile | fixed | conftest.py skips it under `mutants` only. The baseline run shows it as `s`, and the rest pass. |
| 5 | note: 422 does not name the category | fixed | CASE_STRUCTURE now says "a category the case lists". The test checks that the sent value "h1b" is not echoed. |
| 6 | note: part-time OPT months count | unchanged | Still for L-content. |

## Probes

holds2.py, toy pack `check_pack`, TOY_SEED, holds `{"field": "this.<f>", "present": P}`:

- For online (flag), credits (count), joined_on (date), level (choice) and P true or false:
  absent asks `<f>` with state absent, `not_sure` asks it undecided, and an unreadable value
  ("yes", "three", "2026-13-40", "ultra") asks it unreadable. No tree.c1 conflict in any of the
  30 cases.
- follows, declared `when_absent: none`: absent with `present: true` raises conflict:tree.c1,
  and with `present: false` it passes. That is right: a declared none is known (point 2).
- `any_of` of present-on-absent online with level `in [mid]` (true) holds, and nothing is asked.
  With `in [high]` (false), it is U and asks c1.online. Under `not`, the true case raises the
  conflict, and the false case is U and asks. That is Kleene's logic as point 5 states it.

Fix 7 changed no journey output. The 20 journeys give byte-identical JSON at 83fddf1 and at HEAD:
1077 outputs, 434 null or unknown, 410 with `waits_on`.

My last review said 24 nulls had no `waits_on`. The same script, jnull.py, gives 32 lines at
both 83fddf1 and HEAD, so the 24 was my miscount. The kinds are the ones I checked then:
- limit days of counts under their limit;
- STEM validation_3 or validation_4 and evaluation_final windows that would fall after the card
  ends;
- grace.p1 in J12 to J14 (cap_gap, for the DSO).

None is a guess.

## Dates checked by hand

- R16 C with filed_on 2026-05-01: 2026-08-15 less 90 days is 2026-05-17 (15 to July 31, 15 more
  to July 16, 30 to June 16, 30 to May 17). Plus 60 days is 2026-10-14. The case A window from
  2026-05-15 is 2026-02-14 to 2026-07-14. These are the 90 days before and 60 after of
  8 CFR 214.2(f)(11)(i)(B). The grant day could fall on either side of the filing day, so
  withholding is right.
- R36 toy: card.file closes 2025-06-30 plus 12 months, which is 2026-06-30, before 2026-09-29.
  It opens 20 days before 2025-06-30, which is 2025-06-10.
- U25 toy: 2026-06-30 plus 12 months is 2027-06-30, after today, so the stage is next.

## R1 to R40

Every row is named in a test under tests/unit or tests/holdout (grep, no row missing), and both
suites pass. R36's third clause now has a test
(test_r36_toy_one_close_known_and_past_one_unknown_keeps_the_next_stage), which also checks
both fills.

## Mutants (point 52), `--hypothesis-profile mutants`

**Examples** (test_w2_unknown, _counts, _stages, _f1, _regressions, test_readers): every
named mutant is caught except U2 and U17b, which mutate engine/unknown.py and are caught by
test_unknown_logic.py, U17 (a no-op on engine_gap) and U18 (equivalent). U11, U21b, U25 and U26,
which survived last time, are now caught, each by its new test. X1, X2 and X3 are caught.

**Properties** (test_w2_unknown_props.py and test_unknown_logic.py): the selection property
catches M9, M15, M16, M20 and U1. Also caught: M18, M19, U2 to U9, U11, U13, U14, U15, U17b,
U19, U20, U23a, U27 and X1 to X3.

**These survive every property:** U10, U12, U16, U21 (and U21b), U22, U23b, U24, U25 and U26.
U17 and U18 survive as before (no-op, equivalent), and so does U18b, which point 52 does not
name.

This is the first property run to finish. The last review covered only the first ten mutants,
so the fix 7 plan listed only M9, M15, M16 and M20, and the gap was partly my own.

## Findings

### 1. Blocking (point 52): nine named mutants survive every property under the mutants profile
Point 52: each mutant is killed "by at least one property and one example".

Input: TMPDIR/rvu3/mut.py, `props` set, `--hypothesis-profile mutants`, on a full HEAD copy. The
no-mutant baseline passes, with only the
non-vacuity test skipped.
- U10, U12, U16, U21, U22, U23b, U24, U25 and U26 each leave both property files green. Every
  one of them is killed by an example.
- One cause is visible in the code. P6 at tests/unit/engine/test_unknown_logic.py:397 draws a
  leaf's U only as `not_sure`, never as absent or unreadable. So `present` on an absent `ask`
  field (U21, the fault of the last two reviews) can be seen by no property.
- The other survivors act on as_of, group keys, done_when, same_as between two nones, whole-list
  statements dated after today, first with a list not stated whole, and next stages. P1 to P3
  do not draw these positions within 10 examples.

The engine is right on each, as the examples show, so this is a gap in the tests, not in the
behaviour.

### 2. Note: two test_path_reach assertions changed meaning
tests/unit/engine/test_path_reach.py:765 and :825 used to expect conflict:toy.high_or_left and
conflict:toy.low_left on a low course with left_on left out. They now expect no conflict and
`missing:c1.left_on`. In that file's pack, left_on is an `ask` field (line 94, `happened`), so
point 2 makes the new expectation the right one. The change is not a loosening. I note it
because it reverses an assertion rather than adding one.

### 3. Note (carried): a part-time pre-completion OPT always withholds the months-at-level count
Unchanged. This is for L-content.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 5 | All 40 R rows pass, and the holds probes give the SPEC's answer for five field kinds in three gap states. Declared-none and Kleene cases are right. The journeys are byte-identical to 83fddf1. I could not break it. |
| sourced | 5 | No rule or number changed. Sources verify clean. The R16 C, R36 and U25 dates worked by hand match the saved quote of 8 CFR 214.2(f)(11)(i)(B) and the tests' comments. |
| never_assumes | 5 | A check's holds now asks an absent, undecided or unreadable field in every probe, and raises no conflict on it. Only a field declared none reads as none. |
| inside_the_boundary | 5 | The only new person-facing string is the 422 detail. It names the category, echoes nothing sent, and passes the copy lint. |
| secure | 5 | A category fault is still 422 with no echo. No probe crashed or stalled compute. |
| tested | 2 | Every named mutant is killed by an example, and the property run is honest now. But nine named mutants survive every property under the profile point 52 names (finding 1). |

Mean 4.5. tested is below 4, and it rests on finding 1.

## What I chose not to build

No fixes and no tests: reviews/ is mine and the code is not. I did not run the survivors under
the default profile, because point 52 names the mutants profile.

VETO
