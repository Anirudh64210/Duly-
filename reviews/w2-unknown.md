# Review: one rule for unknown values (SPEC-W2-UNKNOWN, plan-w2-p1-unknown.yaml), second pass

Run l-review-bbceb25fc8. Reviewed commit 83fddf1. The last review was at 8acde5a. This pass
covers fix 5 and fix 6 of the plan: engine/path.py and engine/readers.py, api/main.py,
web/src/lib/labels.ts and onboarding.ts, the new tests in tests/unit/engine, tests/unit/api and
web/src/lib, tests/conftest.py, tests/support/gaps.py, and the samples. I read it against
SPEC-W2-UNKNOWN, D92 to D94, PRINCIPLES, BOUNDARY.md and my 14 findings at 8acde5a. Today is
2026-09-29 in every probe, through FixedClock. Probes and the mutant script are in
TMPDIR/rvu2. The probes from the last review are in TMPDIR/rvu.

## What ran

- `pytest tests/unit tests/holdout`, leaving out tests/unit/tools and tests/unit/desktop_entry:
  exit 0, 209 s wall. desktop_entry needs Unix sockets, which my sandbox refuses.
- mypy (72 files), ruff check and ruff format on engine, api and tests, engine_literals, sources
  verify and copy lint: all exit 0.
- web vitest on src/lib/emptyWords.test.ts and src/lib/views/fix7.test.ts: 15 passed.
- Every probe from the last review, on HEAD (TMPDIR/rvu: r4, r7, r8, toy1, happ2, d5, api1).
- The withheld-output count over the 20 journeys at c8dcfb2, 8acde5a and HEAD.
- The point 52 mutants, plus one mutant per engine fix in this round (TMPDIR/rvu2/mut.py),
  with `--hypothesis-profile mutants`. I ran them against the example files and, separately,
  against the property files. Then I ran the survivors against every engine, acceptance and
  holdout test, but that run did not finish.
- New probes: TMPDIR/rvu2/holds.py (present in a check's holds), u11.py and u26.py.

## The last review's findings

| # | Then | Now | Evidence on HEAD |
|---|---|---|---|
| 1 | R16 B withheld | fixed | opt.apply_window.a1 is 2026-02-14 to 2026-07-14 with no `waits_on`, the same as with filed_on 2026-05-01. A stays withheld on a1.filed_on, and C asks ec1.granted_on, never p1.end_date. |
| 2 | one-record or future statement taken as whole | fixed | `stem.extensions.all` is null and waits on complete.authorization, for both `authorization:p1` and `authorization` dated 2026-10-15. It is 1 when the list is stated whole. |
| 3 | R36 stage dropped | fixed | stem.a1 is `unknown` with `waits_on` a1.card_end, and the card end is asked as undecided. |
| 4 | present on absent ask read as none | **part fixed** | Selections and only_if now give U: months.level.mid is null, waits on c1.online, and asks it. A check's `holds` still reads absent as none (new finding 1). |
| 5 | not-sure happened date not asked | fixed | J01 p1.conferred_on `not_sure` asks p1.conferred_on and raises `undecided:`. |
| 6 | category fault gives 500 | fixed | J06 with category "h1b" through POST /v1/compute gives 422 CASE_STRUCTURE. Two records with the same id also give 422. |
| 7 | rows and mutants missing | rows fixed, mutants part | Every R row from R1 to R40 has a test in the file point 51 names, and the `mutants` profile exists. Four mutants still survive every example (new finding 2). |
| 8 | STEM next windows null with no `waits_on` | fixed | stem.validation_1 to 4 wait on future:stem.card_end and future:stem.card_start. stem.evaluation_final waits on future:stem.card_start. |
| 9 | path.py works its own three-valued logic | part fixed | path.py now reads through readers.as_date and readers.as_number, so the 1950 to 2099 bound applies. The logic itself is still wrapped and unwrapped (finding 3). |
| 10 | petition empty words | fixed | Both strings are gone from EMPTY_WORDS and onboarding. The test reads the last CHANGELOG line for each field. Neither string appears anywhere else outside the CHANGELOG. |
| 11 | weak properties | fixed, one new gap | The F-1 seeds are the 20 journeys plus the R-row cases. Non-vacuity is asserted, P1(b) is built for the toy pack, and P2 compares reasons. New problem: the non-vacuity test fails under the `mutants` profile (finding 4). |
| 12 | withholds on for_each entries only | fixed | In D4 without w2, question w3.end now lists stem_job_end.w1, stem_job_end.evaluation_final.w1 and its opens and closes, and unemployment.total.a1. |
| 13 | note: part-time count always withheld | unchanged | Still for L-content. |
| 14 | known past day against NOT_YET left pending | fixed | test_finding_14 holds it, and mutant F14 is caught. |

## Dates and counts checked by hand

- R16 B: 2026-05-15 less 90 days is 2026-02-14 (30 days back to April 15, 30 to March 16, 30
  to February 14). Plus 60 days is 2026-07-14.
- R36: 2027-05-31 less 90 days is 2027-03-02.
- R14: 30 + 31 + 24 = 85 days from 2026-06-01 to 2026-08-24.
- J15 stem.validation_4.a2: the card starts 2025-06-15, so 24 months on is 2027-06-15. That is
  after the card end, 2027-06-14, so null meaning "does not apply" is right.

All of these agree with the saved quotes and with the tests' comments.

## R1 to R40

All 40 rows have a test, and the unit and holdout suites pass. I checked by hand the rows the
last review failed or could not run: R16 A, B and C, R34 both ways, R35 and R36 (probes
above). R33 and R39 now have toy-pack tests (test_r33_toy..., test_r39_toy...), and both pass.
One clause of R36 has no test: "with two filing closes, one known and past and one U, the
stage kept". See finding 2.

## Mutants (point 52)

45 mutants: the last review's 36, with U23 split into U23a (`kind:<id>` read as whole) and
U23b (a future statement read as whole), plus one per engine fix of this round (F1, F3, F5,
F6, F8, F12, F14).

**Examples** (the regression files, test_w2_unknown_f1 and test_readers): every mutant is
caught except these. U2 and U17b mutate engine/unknown.py; test_unknown_logic.py catches U2,
and the last review saw it catch U17b. U17 is a no-op on engine_gap. U18 is equivalent.
**U11, U21b, U25 and U26 survive.** F1, F3, F5, F8, F12 and F14 are caught by the tests of
their findings, and F6 by tests/unit/api/test_case_structure.py.

**Properties** (the property file and test_unknown_logic.py, 10 examples): this run went
through 10 mutants before my time ran out. M18, M19, U1, U2 and U3 are caught. **M9, M15, M16
and M20 survive the properties**, as M9, M15 and M16 did last time.

**Every engine, acceptance and holdout test**, survivors only: started, but it had not
finished its first mutant when I stopped, so I do not claim any result from it. Finding 2
rests on the files point 52 names.

The non-vacuity test fails under the `mutants` profile even with no mutant (finding 4), so I
deselected it in these runs.

## Journey outputs withheld

Counted over the 20 journeys of tests/unit/acceptance/test_journeys.py (computed items, stages
and windows):

| Engine | Outputs | Null or unknown | With `waits_on` |
|---|---|---|---|
| c8dcfb2 | 1024 | 358 | 0 |
| 8acde5a | 1039 | 396 | 327 |
| 83fddf1 | 1077 | 434 | 410 |

On HEAD, 24 nulls have no `waits_on` (TMPDIR/rvu2/jnull.py). I checked each kind:
- limit days of counts under their limit;
- validation and evaluation windows that would fall after the card ends;
- grace.p1 in J12 to J14, which is `unknown` with the reason cap_gap.for_dso. It was the same
  at 8acde5a, and it goes to the DSO.

Each one is "does not apply" or a DSO handoff. None is a guess. J06 still withholds nothing.

## Findings

### 1. Blocking: a check's `holds` still reads an absent `ask` field as none, so it raises a conflict or passes quietly
`engine/path.py:746-750`: `holds_alone` turns ABSENT into NONE under `present` while a check's
`holds` is read outside a selection.

Input (TMPDIR/rvu2/holds.py): the toy pack's `check_pack` with `holds` set to each of these
conditions in turn, and TOY_SEED with c1.online left out. c1.online is an `ask` flag: toy1.py
shows it asked as absent when a count reads it.
- `{"field": "this.online", "present": true}` gives `conflict:tree.c1`, and nothing asks
  c1.online.
- `present: false` gives no conflict and no question, so the check passes quietly on a field
  the person never gave.
- `not present: true` gives the same quiet pass.
- With online `not_sure`, each of the three is asked as `undecided:c1.online`, as it should be.

Point 2: "`present` on an absent `ask` field is always U, never T or F". Point 32: a check
whose `holds` is U raises neither its judgement nor its conflict, and its gaps are asked.
Fix 5's mission said "unknown everywhere, never none". Mutant U21b removes these lines, and
no example test fails, so no test needs them. P6 (the read-once tree test) draws U only as
`not_sure`, never as absent, which is how this passes.

The shipped pack reaches it nowhere today: check 17 reads `this.extends`, which is declared
`none`, and the other `present` reads in `holds` sit inside a selection. But the engine is
generic, and the toy pack shows the fault.

### 2. Blocking: four point 52 mutants still survive every example, and four survive the properties
Point 52: each mutant is killed "by at least one property and one example".
- **U11** (an undated change skipped) survives every example. The engine is right
  (TMPDIR/rvu2/u11.py): with filed_on 2026-05-01 known and ec1.granted_on `not_sure`,
  opt.apply_window.a1 is null and waits on ec1.granted_on. But R16 C, the only test with an
  undated change, also has filed_on `not_sure`, so the window is withheld either way. Example to
  add: R16 C with filed_on 2026-05-01.
- **U26** (`_closed` ignoring a U close) survives. The third clause of R36 has no test.
  On the shipped pack, opt_post's filing closes all rest on p1.end_date or on a future gap,
  so the example needs the toy pack (two filing windows, one closing on a known past day,
  one on an unknown field).
- **U25** (a next stage dropping `missing`) survives. Every field a next stage reads is also
  read by its host stage, so the host asks it. Example to add: a next stage that reads a field
  its host does not.
- **U21b** survives: finding 1.
- The properties alone miss **M9, M15, M16 and M20**. That is the same as last time for M9,
  M15 and M16.

### 3. Should fix (overbuilt): `_tri` and `_known` wrap all3, any3 and not3 and unwrap them at once
`engine/path.py:184-190`, used in `_all`, `_any` and `_cond` (`:726-819`). Each result is
turned into an Unknown built from `_gaps(tr, None)`, passed to all3, any3 or not3, and turned
straight back into `bool | None`. The gaps are thrown away, and the questions still come from
side traces.
- This computes exactly what the old `False in results` code did.
- Point 12 asks that functions returning `bool | None` "be replaced, so the gap travels with
  the U". That is still not done.
- Either carry Tri through `_cond`, `_all` and `_any` and read the questions off its gaps, or
  remove the two helpers and keep the old three lines.

The readers half of finding 9 is done.

### 4. Should fix: the non-vacuity test fails under the `mutants` profile that point 52 names
Input: the point 52 set with no mutant and `--hypothesis-profile mutants` (TMPDIR/rvu2/src).
test_w2_unknown_props.py::test_the_properties_saw_each_output_kind_known_and_changed fails
(`counts` below 5), because 10 examples cannot reach 5 changes per kind. As written, point 52's
run would therefore "kill" every mutant. Two possible fixes: skip that test under the
`mutants` profile in tests/conftest.py, or scale its floor to the profile.

### 5. Note: the 422 for a category fault does not name the category
A record with category "h1b" now gets 422 CASE_STRUCTURE. The detail lists kind, fields, id
prefix, record counts and facts, but not the category, which is the actual fault. That is for
L-api, if the detail is meant to tell the person what to change.

### 6. Note (carried from 13): a part-time pre-completion OPT always withholds the months-at-level count
Unchanged. This is for L-content.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 4 | Every SPEC input I named last time now gives what the SPEC says (R16 A to C, R34, R36, the 422, D4's withholds). 40 of 40 R rows pass, and the hand dates match. Off the SPEC's inputs, a check's `holds` decides on an absent `ask` field (finding 1). |
| sourced | 5 | No rule or number changed. Sources verify clean. Every date I worked by hand matches the saved quotes and the tests' comments. The D94 words now match the pack's declarations. |
| never_assumes | 3 | Selections, only_if, happened dates, history and list statements are all asked now. A check's `holds` still reads an absent field as a known none, raising a conflict or passing quietly (finding 1). |
| inside_the_boundary | 5 | The only new screen change removes two misleading strings. No new string states a conclusion about a person, and the copy lint is clean. |
| secure | 5 | A category fault is 422. Unreadable dates, numbers, choices and links are taken in and asked. I found no input that crashes or stalls /v1/compute. |
| tested | 3 | Every R row is a test, the profile exists, and the properties are stronger. U11, U25, U26 and U21b survive every example, and M9, M15, M16 and M20 survive the properties (finding 2). The mutants profile breaks the non-vacuity test (finding 4). |

Mean 4.17. never_assumes and tested are below 4, and they rest on findings 1 and 2.

## What I chose not to build

No fixes and no tests. reviews/ is mine and the code is not. I did not run P2 under every
mutant to the end, because each mutant takes about three minutes under the properties, so
the property column covers the first ten mutants only.

VETO
