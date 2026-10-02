# Review: one rule for unknown values (SPEC-W2-UNKNOWN, plan-w2-p1-unknown.yaml)

Run l-review-d82408c575. Reviewed commit 8acde5a. Base c8dcfb2 (W2-U0, the contracts). This
review covers everything plan-w2-p1-unknown.yaml and its fixes 0 to 4 changed: engine/unknown.py,
engine/readers.py, engine/path.py, engine/rulepack.py, engine/f1.py, engine/verdict.py, the pack's
when_absent declarations and CHANGELOG, api/case.py and api/local_routes.py, web/src/lib
(labels.ts, records.ts), and the new tests. I read it against SPEC-W2-UNKNOWN, PRINCIPLES 2,
BOUNDARY.md, the four maps and the three W2-P1 reviews. Today is 2026-09-29 in every probe,
through FixedClock. Probes and the mutant script are in TMPDIR/rvu.

## What ran

- `pytest tests/unit` without tests/unit/tools and tests/unit/desktop_entry: exit 0, **105 s**
  wall (the SPEC's baseline was 86 s). The new unit files alone: 22 s, under the 90 s budget.
  tests/holdout: exit 0, 90 s; tests/holdout/test_holdout_w2_unknown.py alone: 34 s.
  desktop_entry needs Unix sockets, which my sandbox refuses.
- mypy (72 files), ruff check, ruff format, engine_literals, sources verify, copy lint: all 0.
- The third review's probes (TMPDIR/rvw2g p1 to p4) on HEAD, and R1 to R40 by hand where no
  test holds them (TMPDIR/rvu/r2.py to r8.py).
- 36 mutants (TMPDIR/rvu/mut.py) for M9, M15, M16, M18, M19, M20 and U1 to U27, against the
  point 52 set (the regression files, test_unknown_logic.py, the property file and
  test_readers.py), then split into examples only and properties only. There is no
  `mutants` Hypothesis profile (point 52 names one), so the properties ran at their unit
  settings (30 examples).

## The third review's findings

All five are fixed for their inputs. D4: w1's concluding evaluation stays 2026-08-02 to
2026-08-12 with w2 as the witness (2026-08-02 plus 10, stem.evaluation_due_days). With w2
removed, it is null and waits on w3.end. C: a1 keeps 121 and 2026-08-29 when a3 has no type.
The w3 end table: absent gives 2026-08-02 to 2026-08-12. 2026-07-31 gives null with nothing
to wait on. not_sure and "2026-13-40" give null waiting on w3.end, and the bad date is asked as
unreadable. The hours table: 40 gives 30 with the limit day waiting on pending:w1.end. "40",
"forty" and `true` give null, asked as unreadable. Absent gives missing:, and not_sure gives
undecided:. M16, M18 and M20 are now caught.

## R1 to R40

Checked by hand: R6 (June 30, July 31, August 31, September 29: 121; the 90th day is 2026-08-29)
and R18 (from 2026-07-01 to 2026-08-31 the job covers every day; June 30 plus September 1 to 29
makes 59; 31 more days from 2026-09-30 reach 2026-10-30). R14 (2026-06-01 to 2026-08-24 is
30 + 31 + 24 = 85) and R15 (the card ends 2027-05-31, so grace runs 2027-06-01 to 2027-07-30)
are right. So are R16 case A (2026-05-15 less 90 days is 2026-02-14, plus 60 days is
2026-07-14), R2 and R7 (plus 10 days). All of these agree with the saved quotes.

Pass on HEAD: R1, R2, R3 (O1), R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15, R17,
R18, R19, R20, R21, R23, R24, R25, R26, R27, R28, R29, R30, R31, R32, R35 (the move list
withholds the end), R37, R38, R40. R22 asks p2.level, but no CPT item is emitted at all,
because no group exists to withhold.
**Fail: R16 case B, R34, R36** (findings 1 to 3). Not run: R33 and R39 (toy pack, no test).

## Mutants (point 52)

Point 52 set: 35 mutants run (U23 cannot be run as a mutant because it is the code as it
stands, finding 2), 27 caught, 8 survive. Survivors: U10 (as_of falls back to today), U11 (an
undated change is skipped), U17 as an engine_gap no-op (U17 as an empty Unknown is caught),
U18 (equivalent: `get(..., 0) > 0` behaves like the new None check), U21 in checks (removing
the absent-as-none reading of finding 4 fails no test), U24 (`first` ignores whole), U25 (next
stages drop missing) and U26 (`_closed` ignores a U close).
Examples alone also miss U2, U12, U17 and U19. The properties alone miss M9, M15 and M16 (that run reached only M9 to M19 before my time ran out).
Point 52 asks that each mutant be killed by a property and by an example.

## Journey outputs withheld, before and after

Over the 20 journeys of tests/unit/acceptance/test_journeys.py (computed items, stages and
windows), counted with TMPDIR/rvu/jcount.py:
- c8dcfb2: 1024 outputs. 358 are null or unknown, and none says what it waits on.
- 8acde5a: 1039 outputs. 396 are null or unknown, and 327 carry `waits_on`.

So 38 more outputs wait, and most nulls now name what they wait for. J06 withholds nothing.
J02, J09, J11 and J20 withhold the most (28 to 36 each).

## Findings

### 1. Blocking: R16 case B. A filing window is withheld when no change record could apply
`engine/path.py:519-525` (`_when3`, `as_of`): a day that is unknown returns ABSENT at once and
never asks whether any change record could apply. Point 26 says "unless no change record could
apply ... the value is the same on every day and is known".
Input (TMPDIR/rvu/r4.py): p1 master ending 2026-05-15; a1 opt_post_completion for p1, dso_on
2026-04-01, filed_on `not_sure`, decision pending; no end_date_change, every list stated whole.
`opt.apply_window.a1` is null with `waits_on` a1.filed_on. Every filing day gives 2026-02-14 to
2026-07-14 (the same case with filed_on 2026-05-01 shows it). SPEC R16 B says "shown, the same
for every filing day". No fill justifies this withholding, and no test holds R16, which is why
U10 and U11 survive.

### 2. Blocking: R34 and U23. A statement for one record's list, or one dated after today, states the whole kind
`engine/path.py:1628-1633` (`_stated`) accepts any key starting `<kind>:` and any `on` after today.
`complete_questions` (`:1912-1923`) also treats a future-dated statement as given.
Input (TMPDIR/rvu/r7.py): R6's case plus a2 stem_extension extending a1 (pending). With
`complete` holding `authorization:p1` and no `authorization`, `stem.extensions.all` shows 1 with
no `waits_on`. With `complete.authorization` dated 2026-10-15, it also shows 1, and nothing asks
the list. Point 14 and R34 say it is withheld, waiting on complete.authorization, both times. An
unlisted STEM extension could make it 2. That is a count shown on an assumed whole list (D41).

### 3. Blocking: R36. A not-sure card end removes the STEM next stage entirely
`engine/path.py:1000-1014`: an opt_post entry left unknown by `entered_when` goes to
`_unknown_stage`, and `_next` is never called for it.
Input (TMPDIR/rvu/r8.py): R6's case with a1.card_end `not_sure`. a1.card_end is asked, but no
`stem.a1` stage appears at all. With card_end 2027-05-31 it is `next`. SPEC R36: "the STEM next
stage in state `unknown` with `waits_on` a1.card_end". Point 33: a stage is never dropped on a
guess. No test holds R36.

### 4. Blocking: `present` on an absent `ask` field outside a selection is read as "none", so a count vanishes and nothing is asked
`engine/path.py:738-742` turns ABSENT into NONE under `present` whenever the read is not inside a
selection's `where`. That covers a check's holds and only_if, a counter's only_if, and a next
stage's only_if.
Input (TMPDIR/rvu/toy1.py, the toy pack of tests/support/unknown_toy.py, TOY_SEED): c1.online
`true` or `false` gives `months.level.mid` 5. With `not_sure`, it is null, waits on c1.online,
and is asked. **With online left out, the item is gone and no question names c1.online.**
Point 2 says "`present` on an absent `ask` field is always U, never T or F". Point 24 says a
withheld count is still emitted. The mission names U21. Removing the four lines fails no test (my
mutant U21b), so nothing needs them. The shipped pack reaches this only through this.extends,
which is declared `none`, so today the fault shows only on the toy pack. The engine is meant to
be generic, so this blocks.

### 5. Blocking: a not-sure `happened` date is never asked, though the after-today conflict rests on it
`engine/path.py:1574-1581` (`run_checks`) reads `happened` dates only when known. Point 32:
"`happened` over a date that is U is asked (path.py:1028 skips `not_sure`)".
Input (TMPDIR/rvu/happ2.py): journey J01 with p1.conferred_on `not_sure`. The only result is the
judgement p1.conferred_on.not_sure: no question, no `undecided:`. The fill 2026-12-01 raises
`conflict:p1.conferred_on.after_today`, so the gap changes an output (point 8). The same holds
for J04 p2.coursework_done_on, J12 h1.outcome_on and J15 a2.decided_on (TMPDIR/rvu/happened.py).
P2(b) misses this because `changed` leaves out the reason set.

### 6. Blocking (regression): a record in a category the case does not list now gets a 500
`engine/path.py:2036` still raises a plain ValueError. `api/local_routes.py:75` now catches only
CaseStructureError (it caught ValueError at c8dcfb2).
Input (TMPDIR/rvu/api1.py): journey J06 through `POST /v1/compute` with
`records[0].category = "h1b"`. The case schema takes it, and the answer is **500 Internal Server
Error**. Point 39 lists an undeclared category as structure: 422 CASE_STRUCTURE. Two records
with one id correctly give 422 CASE_STRUCTURE.

### 7. Blocking: thirteen regression rows of point 51 have no test, and the point 52 mutants they would kill survive
Point 51 places R3, R14, R21, R22 and R39 in test_w2_unknown_counts.py; R15, R16, R24, R29, R33,
R34 and R35 in test_w2_unknown.py; and R36 in test_w2_unknown_stages.py. None of them exists.
The file headers say they are "under not built", and no later round built them. R38 exists only
as a holdout twin. Findings 1 to 3 are three of these rows failing. U10, U11, U24, U25 and U26
survive every file point 52 names. The `mutants` profile does not exist. The properties alone
miss M9, M15 and M16.

### 8. Should fix: the STEM next stage shows validation and concluding-evaluation windows as "does not apply"
`engine/path.py:1439-1440` gives the virtual record the host's id. A `first` pinned by
`this.id same_as outer.id` then finds the real OPT record, which is not a stem_extension, so it
chooses nothing (NONE), with no `future:` gap. Input: R6's case. stem.validation_1 to 4 and
stem.evaluation_final of `stem.a1` are null with no `waits_on`, while stem.evaluation_12_month
waits on `future:stem.card_start`. Across the journeys it happens 3 times per window. Points 31
and 33 say a null with no `waits_on` means only "does not apply", and these windows apply to
every STEM card.

### 9. Should fix (overbuilt): path.py works its own three-valued logic beside engine/unknown.py
`engine/unknown.py` `all3`, `any3` and `not3` are used only by tests. `engine/path.py:715-817`
(`_all`, `_any`, `not` in `_cond`) re-implement them as `bool | None` with the gaps in side
traces. Point 12 says no operator works its own unknown, and a `bool | None` result is to be
replaced so the gap travels with the U. Use the module's functions on Unknown values. Also,
`path.py:72-85` `_as_date` and `_number` repeat `readers._date` and `readers._number` without
the 1950 to 2099 bound or the finite check. Use the readers.

### 10. Should fix: the screen still tells the person an empty petition start is a statement
`web/src/lib/labels.ts` EMPTY_WORDS keeps "Leave empty if the petition asks for no start date."
and "...has no approved validity start date." D94 made both fields `ask`. The test reads
CHANGELOG lines 296-297 (when_absent none) and ignores lines 314-315 (ask, D94), so
web/src/lib/emptyWords.test.ts asserts the old words. Point 2: the words come from the same
declaration.

### 11. Should fix: the properties are weaker than section 9 says
The F-1 seed is only R6's case (`F1_SEED`). Point 44 seeds every journey and R1 to R40. No final
test asserts the non-vacuity counts (events are recorded, never checked). P1(b) is not built.
P2(b) and (c) leave out the reasons, stage states and upcoming dates, which is how finding 5
passed. The P3 read-once half is absent.

### 12. Should fix: a question's `withholds` names only for_each entries
Input: D4 without w2 (TMPDIR/rvu/d5.py). Question w3.end lists `withholds:
[stem_job_end.w3]`, but `stem_job_end.evaluation_final.w1` and the `stem_job_end.w1` stage also
wait on w3.end. Point 34: the question lists the outputs it holds back.

### 13. Note: a part-time pre-completion OPT always withholds the months-at-level count
R24's case raises `opt.months_at_level.span_not_known.a1`, because the counter's `first` chooses
nothing for a part-time pre-completion card. This is point 22a working as written. The pack's
scope could leave such cards out, since opt.months_at_level.part_time already hands them to the
DSO. That is for L-content.

### 14. Note: `_compare_dates` leaves a known past day against NOT_YET on the right as pending
`engine/path.py:824-833`: `_when` returns None for NOT_YET, so `d after Y` with d on or before
today is U (pending), where point 7 decides it F. This is sound but not complete. I found no
shipped output it changes.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 1 | R16 B, R34 and R36, inputs the SPEC names, fail (findings 1 to 3); a 500 on a category fault (6) |
| sourced | 4 | No rule or number changed; sources verify clean; every date checked by hand matches the saved quotes; the petition empty words contradict D94 (10) |
| never_assumes | 2 | A list taken as whole from a one-record or future statement (2); absent read as none under present (4); a not-sure happened date never asked (5) |
| inside_the_boundary | 4 | New lines (unreadable, undecided, waiting) state facts and name the DSO; no conclusion about a person; finding 10's words mislead about what empty means |
| secure | 2 | A schema-valid case crashes /v1/compute with 500 (6); everything else I sent is taken in, read and asked |
| tested | 2 | 13 regression rows missing; 8 point 52 mutants survive the named files; no mutants profile, no non-vacuity test, P2 blind to reasons (7, 11) |

Mean 2.5. Every line below 4 rests on findings 1 to 7.

## What I chose not to build

No fixes and no new tests: reviews/ is mine, and the code is not. I did not run P2j under the
mutants, because the properties alone already took more than a minute per mutant.

VETO
