# Review: one rule for unknown values (SPEC-W2-UNKNOWN, plan-w2-p1-unknown.yaml), final pass

Run l-review-f924676928. Reviewed commit b120cf2. The last review was at 76a47db. This pass
covers fix 8: tests/unit/engine/test_unknown_logic.py (P6 now draws every value state) and
point 52 as amended on 2026-10-02. No file under engine/, api/ or web/ changed since 76a47db
(`git diff 76a47db HEAD -- engine api` is empty). I read the change against SPEC-W2-UNKNOWN
(points 12 and 52 as amended), D92 to D94, PRINCIPLES, BOUNDARY.md and my findings at 76a47db.
Today is 2026-09-29 in every probe, through FixedClock. Probes and the mutant script are in
TMPDIR/rvu4.

## What ran

- `pytest tests/unit tests/holdout`, leaving out tests/unit/tools and tests/unit/desktop_entry:
  exit 0. desktop_entry needs Unix sockets, which my sandbox refuses.
- The two property files with `--durations`: P6 takes 12.8 s while the mutant jobs were
  running alongside it, and 8 s alone by the tests lane's figure. That is inside the point 44
  budget.
- ruff check, ruff format (134 files), mypy on engine and api, engine_literals, sources verify
  (4 packs, every quote found) and copy lint: all exit 0.
- Every point 52 mutant, plus U17b, U18b, U21b, U23a and X1 to X3, with
  `--hypothesis-profile mutants`, once against the example files and once against the property
  files (TMPDIR/rvu4/mut.py, a full source copy per mutant). Both runs finished, and each
  no-mutant baseline passed; in the property run only the non-vacuity test was skipped.
- The 20 journeys at HEAD, compared with my 76a47db output (TMPDIR/rvu3/jdiff.py).

## The last review's findings

| # | Then | Now | Evidence on HEAD |
|---|---|---|---|
| 1 | nine named mutants survive every property | fixed under point 52 as amended | Every operator and reader mutant the amended point lists is now killed by a property, and U21 is killed by P6 itself. The ones still alive are the position mutants, which the amendment holds by their examples. All of them are killed by an example. |
| 2 | note: two test_path_reach assertions reversed | unchanged, rightly | Point 2 still makes the new expectation the right one. |
| 3 | note: part-time OPT months count | unchanged | Still for L-content. |

## The change

P6 (test_unknown_logic.py:416) draws each leaf as either known (a value, or NONE on follows and
NOT_YET on left_on through the declaration) or unknown. An unknown leaf takes one sample of each
gap state gaps.py gives for its field: absent only on an `ask` field, unreadable and not_sure.
The tree then runs once on the drawn states and once per gap state. A `present: true` leaf on
every ask field of c1 has NONE as a fill, so absent is U and never T or F (point 1, U21). Each
unknown leaf is also run alone in each state, and must be asked once, with that state and with
no conflict.

I checked the reasoning behind the expected value:
- Adding NONE to a leaf's fills cannot change a mixed result. Each unknown leaf's own fills
  already give both T and F, and the test asserts this at line 527.
- The T branch no longer requires an unreadable leaf to stay unasked, because point 8 asks an
  unreadable value whatever the tree gives. That is the only place an assertion was narrowed,
  and the new `unreadable <= asked` assertion covers it.

## Journeys

Byte-identical to 76a47db: 1077 outputs, 434 null or unknown, 410 with `waits_on`. The 32 nulls
with no `waits_on` (TMPDIR/rvu2/jnull.py) are the same lines I checked last time: limit days
under the limit, STEM windows past the card end, and grace.p1 in J12 to J14 for the DSO.

## Dates checked by hand

No date logic changed. The R16 C, R36 and U25 dates I worked by hand last time are still
asserted by passing tests:
- R16 C: 2026-05-17 to 2026-10-14 from 8 CFR 214.2(f)(11)(i)(B), 90 days before and 60 days
  after.
- R36: 2025-06-10 and 2026-06-30.
- U25: 2027-06-30.

## R1 to R40

Every row is named in a test under tests/unit or tests/holdout (grep, none missing), and both
suites pass.

## Mutants (point 52 as amended), `--hypothesis-profile mutants`

**Properties** (test_w2_unknown_props.py, test_unknown_logic.py). Every operator and reader
mutant the point lists is caught:

| Mutant | Caught by |
|---|---|
| M9, M15, M16, M20, U1 | the selection property |
| M18 | the boundary property |
| M19 | P1w |
| U2 | exists3 against every completion |
| U3, U5, U6, U7, U8, U9 | P1 |
| U4 | P2 |
| U14, U21, U21b, X3 | P6 |

Also caught: U11, U13, U15, U17b, U19, U20, U23a, U27, X1 and X2.

Survivors, all position mutants the amendment holds by their examples: U10, U12, U16, U22,
U23b, U24, U25 and U26. U17 survives as before because it is a no-op, U18 because it is
equivalent, and U18b is not named by point 52.

**Examples** (test_w2_unknown, _counts, _stages, _f1, _regressions, test_readers). Every named
mutant is caught except these:
- U2 and U17b are mutants of engine/unknown.py. Run against test_unknown_logic.py with its
  properties deselected, U2 is caught by the example
  `test_each_list_operator_by_state[exists-...-U]`. U17b is caught by
  `test_an_unknown_with_no_gap_cannot_be_built`.
- U17 (a no-op) and U18 (equivalent) survive, as before.

**My own probe of the new P6.** Y1 sends a not_sure gap to the missing list at path.py:272. It
leaves P6, P1 to P5 and test_w2_unknown.py green. On the toy check with c1.level `not_sure`,
HEAD and Y1 give the same questions and reasons (`undecided:c1.level`, `c1.level.not_sure`),
because field reads route a not_sure to the unsure list on another path. So Y1 is equivalent
on that input, and I found no fault.

## Findings

### 1. Note (spec_gap, point 52): U22 is an operator mutant that the amended list leaves to its example
U22 makes NONE equal NONE in `same_as`, which is an operator of contracts/rulepack.schema.json.
The amended point 52 lists the property set by name (U1 to U9, U14, U21, M9, M15, M16, M18 to
M20) and leaves U22 out, so it survives every property under the profile. R32's example kills
it. The same holds for U24, a mutant of `first`, which is arguably a reader. This meets the text
of the point, so it is a note for whoever next amends the SPEC: either name U22 in the property
set or say why `same_as` between two links is a position.

### 2. Note (carried): two test_path_reach assertions reversed, rightly
This is unchanged from the last review: test_path_reach.py:765 and :825. Point 2 makes the
new expectation the right one.

### 3. Note (carried): a part-time pre-completion OPT always withholds the months-at-level count
This is unchanged. It is for L-content.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 5 | No engine change since 76a47db. All 40 R rows pass, the journeys are byte-identical, and the holds probes from the last review still hold. I could not break it. |
| sourced | 5 | No rule, number or quote changed. Sources verify clean, and the hand-worked R16 C, R36 and U25 dates are still asserted. |
| never_assumes | 5 | P6 now asserts, for every leaf in every gap state, that the gap is asked with its own state and raises no conflict. The engine passes this. |
| inside_the_boundary | 5 | No person-facing string changed in this round. Copy lint is clean. |
| secure | 5 | No code path changed. P6 now feeds unreadable samples of every kind through compute with no crash. |
| tested | 4 | Under the profile, every mutant the amended point 52 lists is killed by a property, and every named mutant by an example, with baselines passing. My own mutant Y1 turned out equivalent. One point short of 5 for note 1 (U22 and U24 have no property). |

Mean 4.83. No line is below 4.

## What I chose not to build

I built no fixes and no tests: reviews/ is mine and the code is not. I did not add Y1 to the
mutant set, since it is equivalent on the input I probed.

APPROVE
