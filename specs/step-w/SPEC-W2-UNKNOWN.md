# Step W2, unknown values: one rule for the whole engine

Status: draft for the founder, 2026-10-01, revised the same day after two critiques
(completeness and buildability; see "Review notes" at the end). Written by the founder lane from
the three W2-P1 reviews (reviews/w2-p1.md at 3eb17d3, 88bc479 and 19890c7), four maps of the
engine read at 07196cd on step-w (logic, counts, asking, boundary; committed under
specs/step-w/maps/ in W2-U0, point 53), PRINCIPLES.md 2, CLAUDE.md's hard rules, contracts/ and
the shipped pack rulepacks/f1-us/v2026.09. Builds on SPEC-W2 points 45, 46 and 49. W2-P1 is
approved only after this plan's review. The plan runs only after the steps of point 62.

## The goal in one breath

Every value the engine reads is in one of four states. Every operator answers true, false or
unknown by one rule. An output is shown as known only when every value the unknowns could take
would give that same output. Everything else is withheld, carries the gaps it waits on, and each
gap that could change an output is asked of the person by record and field. One record's gap
never removes another record's known date, count or limit day, and no date is shown that rests
on a guessed fact.

## Why one rule, and why now

Three reviews vetoed W2-P1, each for one more operator that read an unknown as false, empty,
absent or zero: review 1, a for_each selection in a stage; review 2, the same selection dropping
the decided records with the undecided one; review 3, `exists` and `none` (finding 1), a counter's
scope (2), `present` on an unreadable value (3), unreadable or missing hours (4). The maps then
found 23 more places of the same class in engine/path.py (logic map, collapse points 1 to 23),
24 places where a count or span rests on a guess (counts map), 6 unknowns never asked (asking
map), and a boundary that takes any string in any field (boundary map). Fixing one operator per
round has lost three rounds. This SPEC states the rule once, builds it once in a generic module,
and tests it as properties over generated cases that catch the whole class, with the review
inputs kept as regression examples.

## What this is not

- No new rule and no changed number in any pack. The pack gains only declarations: what absence
  means per field (point 2), and a `complete_label` for a kind a history, a `first` or a count
  reads that has none (point 14), with the founder's approval (point 61).
- Not check-ins or stale facts (SPEC-W2 N3). An empty field declared `not_yet` is the person's
  statement as of the day the engine computes for. Whether that statement has gone stale (a job
  end left empty months ago) is N3's question, not this SPEC's; "never assumes" here covers
  values, not the age of a statement.
- Not the CPT months summed beside days as a union (counts map row 20), the hours of jobs that run
  at the same time, or `hours_changes` (rows 28, 30): readings to check against saved sources,
  not unknowns. Later.
- Not `_answer` reading a confirmation that has no `about` (asking map, path.py:602). Later.
- Not ranges ("between 30 and 121 days"). Point 60 asks.

## Decisions and principles this serves

PRINCIPLES 2 (confirm, never assume; until the person answers, Can't tell yet). CLAUDE.md: a
verdict never falls back to the quiet state; missing, stale, conflicting or litigated means
cannot_tell; a gap becomes a question. D41 (a list is whole only when the person says so). D59
(a typed date is used only when checked). D04 (Can't tell yet never falls back to green).
specs/path-1/programs.md 161 ("Not sure" gives the judgement `<record>.<field>.not_sure`), kept and
extended by point 35.

---

## 1. The four states of a value

1. **Known.** The value reads against the kind the pack declares for its field (point 41). Only
   a known value is ever compared, added, counted or shown as an input. Two known values stand for
   absence the person stated (point 2): NONE (there is none) and NOT_YET (the event has happened
   on no day up to and including today).
   - Checked by: P2 and P5 (section 9); regression R8 ("40" as a string is not 40).
2. **Absent.** The field is left out or null. What absence means is the pack's declaration, per
   field, in a new key `when_absent`:
   - `ask` (the default): absence is unknown and is asked.
   - `not_yet`: the event has not happened (a job's end, a return from a trip, a filing). The
     engine reads it as the known value NOT_YET, a day after today, never as NONE (point 7), and
     lists it among the item's inputs as "not yet", so the working shows it.
   - `none`: there is none (an outcome not yet given, a job that is not on campus). The known
     value NONE, listed as "none".
   - a condition (point 2a).
   The screen words the empty field from the same declaration ("Leave empty if you still work
   there"), so leaving it empty is the person's statement, not a guess.
   **The fill domain.** The values an unknown could take (its fills, point 44, and the
   completions of P6) are, for a field whose absence is `ask`, every readable value and NONE;
   for `none`, every readable value and NONE; for `not_yet`, every readable value and NOT_YET.
   So `present` on an absent `ask` field is always U, never T or F.
   - Checked by: tests/unit/engine/test_when_absent.py: every field with `when_absent` other than
     `ask` is named in the pack CHANGELOG with the screen words that make absence a statement;
     every field read under `present: false`, as a `chain_link`, or through an `optional` member
     of `earliest_of` or `latest_of` declares `none` or `not_yet` (a field the person could never
     answer "none" to would wait for good); P2 with absence as the gap on an `ask` field.
2a. **Absence that depends on the record.** `when_absent` may instead be an object
   `{not_yet: [conditions], none: [conditions], else: ask}`, each condition list over this
   record's own fields only, read in that order: the first list that is T gives the state, and
   `else` (default `ask`) applies when every list is F. When a list is U before any is T,
   absence is U with the condition's gaps and this field's absent gap both. A condition may not
   read a field whose own `when_absent` is an object (refused at load, point 11). Examples:
   a card's dates are `not_yet` while no decision has come; a STEM card's employer is `none`
   on every other type.
   - Checked by: a toy pack unit test of each branch, including the U branch; P2 on a field with
     a conditional declaration.
3. **Unreadable.** A value is present but does not read against its kind: "2026-13-40" or
   "20260803" in a date, "forty", "40" or `true` in a number, a choice outside the list, a link
   to no record in this run or to a record of a kind the field does not allow. Unreadable is
   unknown. It is never read as absent, never converted, never refused at the boundary when the
   case schema takes it (section 8).
   - Checked by: P2 and P5; regressions R4, R7, R8, R12, R27, R38.
4. **Undecided.** The person entered `not_sure`. Undecided is unknown, on every field kind,
   whether or not the pack offers Not sure on that field (the pack's `not_sure: true` says only
   that the screen offers it).
   - Checked by: P2 with `not_sure` as the gap; regressions R5, R15, R17, R18.
5. **Every unknown names what it rests on.** Inside the engine an unknown carries one or more
   gaps. A gap is (record, field, state). The states that are asked: absent, unreadable,
   undecided, list (a list not stated whole, D41), conflict (facts that do not fit, such as an
   end before its start). The states that are named but never asked and never block the verdict:
   lapse (a rule not in force on the day it is read for; it is a verdict reason today, and stays
   one), pending (a comparison of NOT_YET with a day after today, point 7: the answer comes with
   time) and future (a field of a record not entered yet, read by a next stage, point 31). A value
   worked from an unknown is unknown and carries the union of its gaps. An unknown with no gap is
   an engine fault: the output is withheld, the verdict reason `engine_gap:<output id>` is raised
   (a blocker), and every test that computes a case fails on it.
   - Checked by: P4 (no generated case ever raises `engine_gap:`); a unit test that the gap type
     refuses to be built empty; mutant U17.

## 2. Three truth values for every operator

6. **The soundness rule.** An output (a truth value, a date, a count, a limit day, a judgement,
   a conflict, a stage state) is known only when every value the unknowns could take (point 2)
   gives that same output. The engine may answer unknown where it cannot prove that (strong
   Kleene logic is sound but not complete); it may never answer known where it is not. Strong
   Kleene logic is exact for conditions that read each field once, so the pack should avoid
   reading one field twice in one condition where a single read would do. The shipped pack does
   read fields more than once (parameters.yaml 1849, 2009, 2120, 2241, 2306, 2313), so the tests
   hold only soundness on it and hold exactness on read-once toy conditions (section 9).
   - Checked by: P1 to P3 (soundness against drawn fills); P6 (exact for read-once trees).
7. **Every operator in `contracts/rulepack.schema.json`, by state.** T true, F false, U unknown.
   K known, N the known value NONE, Y the known value NOT_YET (point 2), and U for absent with
   `ask`, unreadable or undecided. A path through a link reads the linked record: through N or Y
   it gives N, through a link that is U it gives U, naming the link.
   **Y against a known day d:** Y is later than d when d is on or before today, so the
   comparison is decided. When d is after today the comparison is U with a `pending` gap
   (point 5): not asked, no conflict, the output withheld and shown as "after <label>".

   | Operator | Rule |
   |---|---|
   | field only, no operator | a flag: its value (`false` is F). Any other kind: as `present: true` |
   | `present: true` / `false` | K: T / F. N or Y: F / T. U: U, asked |
   | `in` | K: membership. N or Y: F. U: U |
   | `on_or_before`, `on_or_after`, `before`, `after` | both sides K: compared. Y on either side: as above. Either side N: F. Either side U: U |
   | `level_above`, `level_same`, `level_below` | both K and ranked: compared. N or Y: F. U: U. A choice the pack's order does not rank is refused at pack load (point 11) |
   | `same_as`, `differs_from` | both K: compared. Either side N or Y: F (a join on nothing is no join; a pack that means "both none" uses `present: false`). Else either U: U |
   | `month_day_is` | K: compared. N or Y: F. U: U |
   | `at_most` | K number: compared. N or Y: F. U: U. The limit is a rule value (point 10) |
   | `exists` | T if a decided record is chosen. F if no record is chosen, none is undecided and the list is stated whole. Else U |
   | `none` | the Kleene negation of `exists` |
   | `count_below n` | with k chosen, u undecided: F if k is n or more. T if the list is whole and k + u is below n. Else U |
   | `count_at_most n` | F if k is above n. T if the list is whole and k + u is n or less. Else U |
   | `all_of`, a list of conditions | F if any is F. T if all are T. Else U |
   | `any_of` | T if any is T. F if all are F. Else U |
   | `not` | T and F swap. U stays U |

   - Checked by: P6 over the toy pack, each operator against every completion of its inputs,
     with N and Y among the values; regressions R5 (exists with a decided witness), R6, R7, R31;
     a toy unit test that `same_as` with N on both sides is F.
7a. **A pack lint for NONE.** NONE stays F in a comparison, so a `not` over a comparison, or a
   check's `holds` comparison, on a field whose `when_absent` can give NONE turns "there is
   none" into T or into a raised conflict. `validate_pack` refuses either unless a
   `present: true` on that field guards it in the same `all_of`.
   - Checked by: tests/unit/engine/test_rulepack.py, one toy pack each; the shipped pack loads.
8. **Which gaps a condition asks.** A condition settled by one member (an `any_of` with a T, an
   `all_of` with an F, an `exists` with a decided witness) asks nothing for the other members on
   this read. A condition that is U asks every gap it rests on, never fewer. A field that no
   unsettled read rests on is not asked (an absent `school_name`, a `not_sure` E-Verify answer on
   an employer no STEM card names), except an unreadable value, which is always asked (point 36).
   - Checked by: P2(b) (the gap is asked whenever some fill changes an output); a unit test that
     a settled `any_of` adds no question; regression R40.
9. **A flag of `false` is a value.** It is F where a flag is tested, and present where presence
   is tested. It never counts as done or entered (points 29, 30).
   - Checked by: P6; a unit test on `done_when` over a flag.
10. **A rule value read for a day the rule is not in force on is a lapse gap**, never F, never
    "no limit", never "no threshold". The lapse is named as today (`rule_not_in_force...`).
    - Checked by: regression R28 (an hours rule with no row in force withholds the count, counts
      map row 5); P7.
11. **A pack fault is refused at load, not read as unknown at compute.** `validate_pack` refuses,
    each with a one-line RulepackError naming the path:
    - a rule amount that is not a number, a unit the engine cannot add, a month-day rule text
      that does not parse;
    - a `level_*` operator on a field with no `order`. An ordered field may leave choices
      unranked when no source ranks them (D93): a comparison that reaches an unranked choice is
      unknown with state undecided and the DSO named, never refused at load and never ranked by
      invention;
    - an `in` value that is not one of the field's choices;
    - a rule id the pack does not hold (read today as a lapse). A check may compare against a
      product setting written `{setting: id}` (D93): the check's reason says it rests on Duly's
      setting, not on the law; a setting is refused anywhere but a window's dates and a check;
    - a qualifying or not-qualifying kind of a counter without two date fields to span;
    - an `outer.` path where no outer record exists, a `this.` path in a check or stage with no
      record, and a `first.field`, `history.from` or `chain_link` of the wrong kind;
    - the point 7a lint, and a `when_absent` condition that reads a field with a conditional
      declaration (point 2a);
    - the schema features the engine does not work: the operators `window_opens` and
      `window_closes` (they give None today with no trace, logic map point 10),
      `stage.lists[].only_if` (path.py:769 compares a dict to a string and drops the list),
      `follows` and `gap_allowed`. No shipped pack uses any of them.
    - Checked by: tests/unit/engine/test_rulepack.py, one toy pack per fault; every shipped pack
      still loads. If a shipped pack trips a refusal, the engine lane stops and escalates; the
      pack is L-content's.
12. **One module, with a fixed interface.** `engine/unknown.py`, pure, no pack, no F-1 word:

    ```python
    GapState = Literal["absent", "unreadable", "undecided", "list", "conflict",
                       "lapse", "pending", "future"]
    class Gap(NamedTuple):            # record is None for a fact or a list
        record: str | None
        field: str
        state: GapState
    class Unknown:                    # frozen; Unknown(gaps) raises ValueError when gaps is empty
        gaps: frozenset[Gap]
    NONE: Final[object]               # singletons, compared by identity
    NOT_YET: Final[object]
    Tri = bool | Unknown
    def all3(values: Iterable[Tri]) -> Tri: ...
    def any3(values: Iterable[Tri]) -> Tri: ...
    def not3(value: Tri) -> Tri: ...
    # unstated is None when the list is stated whole, else an Unknown holding its list gap.
    def exists3(chosen: int, undecided: Sequence[Unknown], unstated: Unknown | None) -> Tri: ...
    def count_below3(n: int, chosen: int, undecided: Sequence[Unknown],
                     unstated: Unknown | None) -> Tri: ...
    def count_at_most3(n: int, chosen: int, undecided: Sequence[Unknown],
                       unstated: Unknown | None) -> Tri: ...
    ```

    A U result carries the union of the gaps of the U inputs it rests on (point 8). The readers
    live in `engine/readers.py`:
    `read(decl: Mapping[str, Any], raw: object, run: Mapping[str, str]) -> tuple[ReadState, object]`
    with `ReadState = Literal["known", "absent", "unreadable", "undecided"]`, `run` mapping each
    record id in this run to its kind, and the object the read value (a `date`, a number, a
    string, a bool, a list of read periods) or the raw value when not known. `CaseStructureError`
    (a ValueError) lives in `engine/path.py`. engine/path.py uses these for every operator above;
    no operator works its own unknown.
    - Checked by: P6 on the module directly; tests/unit/engine/test_unknown_generic.py (neither
      module names a kind, field, choice or rule id of any shipped pack; `engine_literals`
      checks only engine/f1.py); mypy strict. Amended 2026-10-02 (review of fix 5, finding 3): the condition evaluator in
      engine/path.py may keep `bool | None` with its gaps carried in the trace it already writes;
      engine/unknown.py stays the reference the property tests check it against, and no wrapper
      converts between the two only to convert back.

## 3. Selections, firsts and lists

13. **A selection is four things:** the records chosen, the records left out, the records left
    undecided (each with the gaps that left it so), and whether the list is stated whole.
    `_select` and `_split` become one function that returns them. Nothing reads a selection as
    `None` for the whole, and nothing reads an undecided record as left out.
    - Checked by: P1; regressions R2, R3, R5, R6; mutant U1.
14. **A list not stated whole is an unknown about records not entered.** `exists` can still be T
    (a witness stands), but these need the list stated whole: F, `none` T, a count, "none found",
    a `first` that found a value (an unentered record could beat it), and an `as_of` read over a
    history kind ("no change record could apply" cannot be proved while the change list is not
    whole). The question is the existing `complete.<kind>`. A selection pinned to one record by
    `this.id same_as outer.id` needs no statement.
    **What states a list whole** (`_stated`, path.py:1086-1092, fixed here): `complete.<kind>`
    states the whole kind. `complete.<kind>:<id>` states whole only the records of that kind
    linked to record `<id>`, so it covers a selection only when the selection's conditions hold a
    `same_as` from a link field of the kind to that record. A statement whose `on` is after today
    is ignored. Every kind a history, a `first` or a count reads carries a `complete_label`, so
    the screen can ask it (L-content adds the missing ones, e.g. end_date_change; the load test
    of point 2 checks it).
    - Checked by: P6 with `whole` false; P1w; regressions R23, R34, R35; mutants U2, U23, U24.
15. **`first` (the earliest or latest date over a selection).** m is the earliest (or latest)
    known date among decided chosen records, NOT_YET ordered after every day up to today and
    compared with later days as point 7 says. A chosen record whose date is N is passed over. A
    record that is undecided, or chosen with its date U, leaves m standing only when its date is
    known and cannot beat m (not before m for earliest, not after m for latest); otherwise the
    result is U with its gaps. A found m also needs the list whole (point 14). With nothing
    chosen: N when no record is undecided and the list is whole, else U. `found or []` and the
    raw `_resolve` read in `_first` go.
    - Checked by: P2 on a card_end, a program link and a type; regressions R15, R35; mutant U9.
16. **`earliest_of` and `latest_of`.** An `optional` member is passed over only when its value
    is N. An `optional` member that is U, or whose rule is not in force (a lapse), makes the
    whole date U, with the member's gaps kept (path.py:322 passes over every null that is not a
    lapse today, throwing the gaps away; a lapsed optional member must never read as "no
    cut-off", point 10). A member that is not optional and is N makes the date N: the output does
    not apply, and is a known null (point 33). A member that is Y takes part as point 7 orders it
    (in `latest_of` it is later than every day up to today).
    - Checked by: P2 on a move's links and dates; regressions R14, R29, R33; mutants U8, U19.
17. **Stage and check `for_each`.** Each decided chosen record enters as today (fix 2). Each
    undecided record is not entered and not shown; its gaps are asked, and each question lists
    the outputs it holds back in `withholds` (`<stage>.<record>`, `<check>.<record>`). An
    undecided record whose gaps are empty is an engine fault (point 5), which closes review 2's
    "an unreadable date asks nothing" and the asking map's "undecided records with an empty trace".
    - Checked by: regressions R1 to R4, R9, R10; mutants M15, M16.

## 4. Counters and their scopes

18. **The scope keeps what it knows.** A counter's scope is a selection (point 13). Each decided
    chosen record joins its group. An undecided scope record withholds only the groups it could
    join: its own group when the counter groups by record (review 3 finding 2: a3 with no type
    withholds nothing of a1's), every group otherwise.
    - Checked by: P1; regression R6; mutant U1.
19. **A group key that is unknown.** For `same_value` and `chain`, a record whose key is U could
    join any group whose key agrees with the key's known parts: each such group is withheld, and
    the key's gap asked. A record is never left out of every group (path.py:1150), and never put
    in a chain of its own (path.py:1149) because its link is U. A chain link must be declared
    `none` (point 2); one that is absent is N and starts a chain.
    - Checked by: P2 on a program level and an `extends` link; regression R22; mutant U12.
20. **Whole means every kind the counter reads,** the scope's own kind as well as the qualifying
    and not-qualifying kinds (path.py:1106 checks only the last two). Until each is stated whole,
    each group's value is null and waits on `complete.<kind>`.
    - Checked by: regression R23 (stem.extensions.all is no longer 0); mutant U13.
21. **A group's count is unknown when any record that could count toward it is unknown.** That is
    a qualifying or not-qualifying record that is undecided, or chosen with an hours figure,
    start, end or link that is U. Its known parts can exempt it: a known span that lies wholly
    outside the counted days, or a known link to another group. Unknown hours never mean "no job"
    (path.py:1222). Overlapping jobs are not this SPEC's concern.
    - Checked by: P1, P2 on hours, start, end and the link; regressions R8, R18, R19; mutants U5,
      U6, U7.
22. **Spans.** A start that is U makes the span U (path.py:1249 reads it as no days). An end that
    is Y (`not_yet`) runs through today and is listed as "not yet"; a count or limit day that
    reads a day after today through it is withheld with a `pending` gap (point 5). An end that
    is U makes the span U (path.py:1250 reads every unknown end as "still going"). An end before
    its start raises the conflict `span_order.<record>` (asked, cannot_tell) and the span is U
    (path.py:1253 reads it as no days; `_span_of` gives None with nothing asked).
    - Checked by: regressions R8, R18, R19, R20, R21; mutants U6, U7.
22a. **A span that is N on a counted record.** A record the counter counts whose span is N (it
    ends on a `first` that chose nothing, say) adds an unknown number of days, so the group's
    value is withheld, with the judgement `<counter>.span_not_known.<record>` (talk_to_dso) raised
    and named in `waits_on`. Today the count is null with nothing said; an N span must never
    leave a count shown and understated. A pack that means such a record not to count leaves it
    out through the counter's own conditions.
    - Checked by: regression R39.
23. **Rules a count reads.** An hours rule with no row in force makes every count that filters on
    it U with the lapse named (path.py:1216 drops the filter). A limit rule with no row in force
    leaves the value known and makes the limit day and the at-or-over judgement U.
    - Checked by: regression R28; a toy pack test for the limit rule; P7.
24. **What a withheld count shows.** The item is still emitted: value null, `limit_day` null, no
    at-or-over judgement, and `waits_on` naming each gap (review 3 finding 2: nothing said a1's
    count was withheld). engine/f1.py does the same: `numbers.get(..., 0)` (f1.py:1437, 1462) and
    every other default of 0 for an unknown number go; a check that rests on an unknown number
    gives its missing reason instead of not being raised; a job end that is `not_sure` or
    unreadable is never read as still working (f1.py's `end is None` reads only a true absence).
    - Checked by: P3, P4; regressions R8, R25; P2f on the case_f1 contract's job dates and hours
      (point 46); mutant U18.

## 5. Dates, facts, history and "as of"

25. **Every `fact:` read.** A date read through `fact:` (a case fact, or a record field such as
    `{fact: this.card_end}`) is read through the readers (point 41) and carries its gap:
    path.py:347 records nothing for a `not_sure` or unreadable value today, for facts and record
    fields alike. `case.facts` values are read against the pack's declared facts like record
    fields (path.py:218 and ask_unreadable skip them today). The F-1 pack declares no facts; the
    toy pack does.
    - Checked by: P2 on a toy fact and on a record date read through `fact:`; regression R30
      (p1.end_date `not_sure` names p1.end_date).
26. **"As of".** A field read as it stood on a day whose date is U is U, unless no change record
    could apply to that field of that record, in which case the value is the same on every day
    and is known. "No change record could apply" needs the change kind stated whole (point 14).
    A day that is Y (the event has not happened) reads the value as it stands today. The
    `or self.today` fallback (path.py:343) and its dropped trace go.
    - Checked by: P2 on a filing date with and without a change record; regression R16; mutant
      U10.
27. **History.** A change record whose `from` day, link or new value is U, and which could apply
    to the record and day read, makes the read U, naming the change record's field
    (path.py:200-204 skips it and uses the current value). When a change's old value is absent,
    the question names the change's field only, not the base field the person did enter
    (asking map, path.py:224).
    - Checked by: regression R16; mutant U11.
28. **Date arithmetic and stage ends.** A base or an amount that is U gives U with both traces
    kept. `ends_also` with a reading that is U makes the end U (path.py:760 drops it).
    - Checked by: P2 on a move's release date (regression R29).

## 6. Stages, windows, checks and what comes next

29. **`entered_when`.** All fields K: entered. Any field N: not entered (known). Otherwise the
    stage entry is emitted with state `unknown`, null dates, and `waits_on` naming the gaps, and
    each gap is asked. A flag of `false` is not entered. This closes the asking map's quiet
    verdict: a program with no start date gave no_open_items with no stage at all.
    - Checked by: regression R13; mutant U15.
30. **`done_when`.** Any field K (a flag only when true): done. All N: not done. Otherwise the
    window keeps its dates (they do not rest on it), stays in upcoming and open items, and
    carries `waits_on` naming the gap. `not_sure` and `false` never count as done (path.py:814).
    - Checked by: regression R17; a unit test on `done_when` over a flag; mutant U16.
31. **`bind`, next stages and their closes.**
    - A bound value that is U makes the match U, never "fewer keys" (path.py:926, 933).
    - A next stage reads two kinds of field. A field of a real record (e.g. `p1.end_date`
      reached through the virtual record) that is U is asked and named in `waits_on`, as anywhere
      else; path.py:656 and :827 drop `missing` for next stages today, and that drop goes. A
      field of the virtual record built by `bind` that no entered record supplies (path.py:225
      resolves it with no gap today) is a `future` gap: named in `waits_on`, never asked, never
      a blocker.
    - A next stage whose `only_if` is U gets state `unknown` with `waits_on`, never `next`
      (point 33).
    - A next stage is closed (`_closed`, path.py:971-979) only when every filing close is known
      and past. A close that is U keeps the stage, in state `unknown` with `waits_on`.
    - Checked by: P2 on a bound field; a toy pack test of `bind`; regressions R36; mutants U25,
      U26.
32. **Checks.** A check whose `holds` is U raises neither its judgement nor its conflict; its gaps
    are asked (a `pending` gap is not asked: point 5). `happened` over a date that is U is asked
    (path.py:1028 skips `not_sure`). `ends_before_today` over an end that is U asks the end, not
    the "ended before today" question on a guess (path.py:1302).
    - Checked by: regressions R9, R10, R24, R31; P3.
32a. **Conflicts on a stage's own span.** When `ends_before_starts` or `longer_than_longest`
    (path.py:795-803) is raised, the stage's state is `unknown`, its dates null, and its
    `waits_on` names the conflict. Today the conflict is raised and the stage keeps its state and
    dates.
    - Checked by: regression R37.
33. **Nothing derived from an unknown is shown as known.** A withheld output is emitted with value
    or dates null and a non-empty `waits_on`. A null with no `waits_on` means only "does not
    apply", worked from known values. `upcoming` never holds a date that is U. A stage state is
    never `current`, `done` or `next` on a guess. A judgement, conflict or open item that rests
    on a U is not raised.
    - Checked by: P2(c), P3, P4.

## 7. Asking

34. **One question per gap, by record and field.** Question id `<record>.<field>` (or
    `facts.<name>`, or `complete.<kind>`, or `span_order.<record>` for a conflict), with the
    existing `record`, and new optional `field` and `state` (absent, unreadable, undecided, list,
    conflict). For an unreadable value, `about` holds the value as entered, so the screen can show
    it back. The question's `withholds` lists the outputs it holds back. Each `waits_on` entry is
    a question id, a named lapse or conflict reason, or `pending:<record>.<field>` or
    `future:<stage>.<field>` (never a question).
    - Checked by: P2(b), P4; contract tests.
35. **Reasons.** `missing:<id>` for absent, `unreadable:<id>` for unreadable (today it is asked as
    `missing:`), `undecided:<id>` for not sure, each a blocker, so the verdict is cannot_tell.
    `missing:` and `undecided:` are raised only for a gap an unsettled read rests on (point 8);
    `unreadable:` always (point 36). The judgement `<id>.not_sure` (talk_to_dso,
    specs/path-1/programs.md 161) is still raised for every `not_sure`, read or not, so the
    reasons still point to the DSO. Point 57 asks the founder.
    - Checked by: P4; regressions R5, R8, R40.
36. **Every unreadable value in the case is asked, read or not** (mutant M18): ask_unreadable
    runs over every record field and fact of every kind, not only dates and choices.
    - Checked by: regression R11 (an unreadable value in a field nothing reads is still asked).
37. **One verdict function.** engine/path.py `compute` decides through `engine/verdict.decide`
    (today it decides on its own at path.py:1412-1436, and verdict.decide is used only by f1.py
    and local_routes). The new reason prefixes are blockers there. A verdict is never
    no_open_items, needs_you or talk_to_dso while any question is open.
    - Checked by: P4; tests/unit/engine/test_verdict.py extended for the three prefixes.
38. **The words** (L-web, web/src/lib/labels.ts and the question line). Three new exports:
    `unreadableLine(label: string, asEntered: string): string` gives "Duly could not read what
    was entered for <label>: <value as entered>. Check it and enter it again."
    `undecidedLine(label: string): string` gives "You said you were not sure about <label>. Add
    it when you know. Your DSO can tell you." `waitingLine(label: string): string` gives a
    withheld number or date's line, "Waiting for <label>" (e.g. "Waiting for the hours of your
    job at <employer>"), never a number and never "0"; a `pending` entry reads "After <label>".
    Absent: the words as today.
    - Checked by: tests/web/unknown.test.ts; copy lint.

## 8. The boundary

39. **Refuse only structure.** A case is refused (422) only for what no person typed and no
    question could fix. Two kinds, each with its own detail:
    - The case schema's shape (contracts/case.schema.json): non-JSON, NaN or Infinity, an
      object where the schema takes a scalar, a string outside 1 to 120 characters. The API
      answers as today, with `first_problem`'s detail (NOT_JSON, NOT_A_NUMBER, or the schema
      path), before the engine runs.
    - The pack's structure: an undeclared category, kind, field or fact, two records with one id
      (path.py:137 lets the second replace the first silently), an id that does not match
      `^<id_prefix>[0-9]+$` for its kind, or more records of a kind than its `max_records`. The
      engine raises `CaseStructureError` from `_refuse_undeclared`; api/local_routes.py and
      api/main.py answer 422 with the new detail `CASE_STRUCTURE`, in its own plain words that
      never repeat what was sent. NOT_IN_THE_PACK is retired: everything it meant is now
      CASE_STRUCTURE.
    A link to a record in another category's run is a value, not structure: unreadable and asked
    (point 41), since the person can fix it.
    - Checked by: tests/unit/api/test_case_structure.py (each fault; the words never hold the
      sent value); tests/unit/engine/test_w2_unknown.py R26 (CaseStructureError).
40. **Take every value in.** Every other value is taken in, read against its declared kind, and
    either known or asked (point 36). One bad hours figure never withholds the rest of the case,
    as a 422 would.
    - Checked by: P5.
41. **The readers, one per declared kind** (`engine/readers.py`, point 12):

    | Kind | Known when |
    |---|---|
    | date | a string matching `^\d{4}-\d{2}-\d{2}$` that is a real calendar day, from `dates.earliest_readable` to `dates.latest_readable` in contracts/product_settings.yaml (1950-01-01 and 2099-12-31, the case schema's own date bounds; also closes the 9999-12-31 overflow). The pattern is matched before parsing: Python 3.12's `date.fromisoformat` reads "20260803", "2026-W32-1" and "2026W321" |
    | number | a finite JSON number that is not a boolean |
    | count | a whole number, 0 or more, not a boolean |
    | flag | a boolean |
    | choice | one of the pack's `choices` |
    | text | a string within `max_length` and `pattern` |
    | link | a string naming a record in this run (this category's records) of a kind in the field's `to` |
    | periods | a list whose every period's values read the same way |

    `not_sure` is undecided on every kind (point 4). Strings are never converted.
    - Checked by: P5; tests/unit/engine/test_readers.py, a table test per kind with a known and
      an unreadable value each, including the three date strings above.
42. **The contract stays open for values.** contracts/case.schema.json keeps taking any scalar in
    `fields` and `facts` (the desktop checks every saved case against it, desktop/src/casefile.ts
    158-165, so a typed schema would refuse a person's partial record, or a saved case after a
    pack update). The scalar's number loses its `minimum` and `maximum` (any finite number), so a
    typed -1 or 200000 is read and asked, not refused. Its string keeps 1 to 120 characters: the
    screen sends an empty value as absent (point 43) and no pack text is longer than 120. A
    period's `start` and `hours_per_week` become the same scalar, so one period with "forty" no
    longer refuses the whole case. `additionalProperties: false` stays. The descriptions say: a
    value is read against the pack's declared kind; one that cannot be read is asked, never
    refused, never dropped, never read as no, none or zero.
    - Checked by: tests/unit/contracts/test_schemas.py and desktop/src/schema.test.ts (founder
      lane, W2-U0: the cases at 98-111 that expect 100001 and an hours figure of 200 refused now
      expect them taken in).
43. **The screen sends what was typed.** web/src/lib/records.ts `cleanField` (112-127) drops a
    number or date that does not parse, and `caseRecord` (136) drops a link to no record, so the
    person is asked "missing" about something they typed. Both send the value as typed; the
    engine reads it and asks. An empty or whitespace-only value is sent as absent (never `""`).
    `NUMBER_FIELDS` (97) goes.
    - Checked by: tests/web/records-typed.test.ts.

## 9. Tests: properties that catch the class, then the examples

All under an injected clock (FixedClock at noon UTC, today drawn from 2025-01-01 to 2028-12-31,
and 2026-09-29 for the examples). Hypothesis settings: `deadline=None`, `derandomize=True`; in
tests/unit, `max_examples=150` for P6 (pure, no compute) and 30 for P1 to P5 and P7; in
tests/holdout, 200. **Time budget:** one `path.compute` takes about 3.5 ms on a small case and
tests/unit took 86 s before this SPEC; the new tests/unit files together must run in under 90 s
without coverage, and the holdout file in under 5 minutes, measured with `--durations`. Each
property runs on the toy pack (so a pass needs an engine that reads the pack, nothing F-1) and
on the shipped F-1 pack, except where it says toy pack only.

Test files never import a name this SPEC adds (engine.unknown, engine.readers,
CaseStructureError) at module level: they import it inside the test, so collection passes
before the engine exists and a missing name fails the test, never skips it.

44. **Generators** in `tests/support/gaps.py`, built from the pack's declarations only, with the
    toy pack in `tests/support/unknown_toy.py`:
    - `decided_cases(pack)`: a coherent timeline, not independent draws: programs in order, then
      their authorizations inside or after them (OPT, then STEM for the F-1 pack), with jobs,
      reports and trips inside the card spans. Each field is drawn from {known, N or Y where
      its `when_absent` allows}, with the N or Y side drawn often enough that `present: false`
      holds (an off-campus job, an open job end). Links to records of an allowed kind, every
      list stated whole. Seeded through `@example` with every journey of
      tests/unit/acceptance/test_journeys.py and the cases of R1 to R40.
    - `gap(decl)`: absent (on an `ask` field), `not_sure`, and unreadable samples per kind that
      the case schema takes in that position ("2026-13-40", "08/03/2026", "31/08/2026",
      "20260803", "2026-W32-1" for dates; "40", "forty", `true` for numbers; 1.5, -1 and "3"
      for counts; "yes" and 1 for flags; a choice outside the list; a link to "zz9" and to a
      record of a wrong kind; a text over `max_length` and within 120 characters, where
      `max_length` is under 120).
    - `fills(decl, case, out)`: the set the drawn fills come from. Every allowed link id; every
      choice; for dates, every date in the case and in the output, each one day either side,
      plus 1950-01-01 and 2099-12-31; for numbers, every rule value in the pack, one either side,
      and 0; both flags; NONE or NOT_YET as point 2's fill domain says. Each example draws 6
      fills from this set, always including the original value, NONE or NOT_YET where allowed,
      and the fills one day either side of each output date the gap's field feeds. A test may
      add fills to the set; it may never remove one.
    - At most 2 gaps per record; fills of two gaps are drawn together, never as a cartesian
      product.
    - `outputs(out)`: each output keyed by id: computed values and limit days, window opens and
      closes, stage states and dates, upcoming dates, and the sets of judgements, conflicts and
      open items. `withheld(out)`: ids with `waits_on`.
    - **Non-vacuity.** Each property records `hypothesis.event` per output kind it saw known and
      changed by some fill, and a final test asserts each kind was seen at least 5 times across
      the run on the F-1 pack, so a property that passes only on null outputs fails.
45. **P1, adding a record with gaps never changes or removes another record's known output.**
    For a decided case C and a sibling R (a copy of a record of C of any kind, with its links
    kept and its dates shifted within 10 days either side, then given 1 or 2 gaps):
    (a) every output not keyed to R (including outputs keyed by value: `same_value` and `all`
    groups and record-less stages) that is known in C + R equals its value in C + R(F) for each
    drawn fill F of R's gaps; (b, toy pack read-once conditions only) every such output withheld
    in C + R names one of R's gaps in `waits_on`, and some two drawn fills give it different
    values. (b) is the reviews' class: D4 and C fail it on 07196cd, and S1 and O1 failed it
    before fix 2.
    **P1w, a list not stated whole.** For a decided C, remove one `complete` statement: every
    output known in the result equals its value in C and in C plus one decided sibling of that
    kind.
    - In `tests/unit/engine/test_w2_unknown_props.py::test_a_gap_in_a_new_record_never_changes_or_removes_another_records_output`
      and `::test_a_list_not_stated_whole_never_shows_what_an_unseen_record_could_change`.
46. **P2, replacing a known value with an unknown one.** For a decided case C, a field X.f with
    value v, the drawn fills v', and each gap state g that applies: (a) every output known in C_g
    equals its value in C_v' for every drawn fill v' (and in C_v); (b) when some drawn fill
    changes some output, or g is unreadable, C_g has a question `X.f` with record X, field f and
    state g, and for an unreadable value `about["X.f"]` is the value as entered; (c) every output
    whose value differs between two drawn fills is null in C_g with `X.f` in `waits_on`, or, for
    a record's entry into a stage or check, is absent from C_g and named in the question's
    `withholds`; (d) under (b)'s condition, the verdict is cannot_tell.
    **P2j, exhaustive on the journeys** (tests/holdout only, deterministic): every journey,
    every present field, every gap state, with fills {v, one other readable value, NONE or
    NOT_YET where allowed}; (a), and (b) and (c) where a fill changes an output. It catches an
    engine that turns U into one fixed fill.
    **P2f, engine/f1.py** (tests/unit/engine/test_w2_unknown_f1.py): P2(a) and (d) over the
    contracts/case_f1.schema.json job dates and hours.
47. **P3, every reason that depends on an unknown is withheld.** In P2's C_g, every judgement,
    conflict and open item other than those about X.f itself is raised in C_v and in every drawn
    C_v'. The other half (every one raised in C_v and in every C_v' is raised in C_g) runs on the
    toy pack's read-once conditions only (point 6).
48. **P4, every unknown is named.** For any generated case, decided or not, with any mix of
    gaps: no reason starts with `engine_gap:`; every null output with `waits_on` names only
    question ids in `questions`, lapse and conflict reasons in the verdict, or `pending:` and
    `future:` entries; every question with `withholds` names outputs that are absent or withheld;
    the output validates against contracts/engine_output.schema.json; and the verdict is
    cannot_tell whenever a gap question is open.
49. **P5, the boundary is total.** Any scalar or list the case schema takes in any declared field
    or fact of any record (hypothesis: strings of 1 to 120 characters, any finite number,
    booleans, null, lists of such scalars and periods): compute returns an output, never an
    exception; a value that does not read is asked as `unreadable:`. An object in a field is the
    schema's shape (point 39), refused before the engine. The pack's structure faults
    (point 39), generated too, always raise CaseStructureError, whose message never holds the
    sent value.
50. **P6, the operators themselves** (`tests/unit/engine/test_unknown_logic.py`, on
    engine/unknown.py and on a toy pack whose one check holds a generated condition tree):
    for a random read-once tree over toy fields with at most 5 unknown leaves and a random partial
    assignment whose values include N and Y, the result is T or F exactly when every completion
    of the unknowns gives that value; for `exists`, `none`, `count_below` and `count_at_most`
    over random (chosen, undecided, whole), the result equals the value shared by every completion
    (whole false adds up to n + 1 unseen records, which is enough to change any of them), and U
    exactly when completions disagree. Leaves are drawn from every operator of
    contracts/rulepack.schema.json, and the test asserts each operator was drawn at least 5
    times.
50a. **P7, a rule not in force is never read as no rule** (toy pack). Move today before a rule's
    first row, or after its last: every output that reads the rule is withheld with the lapse
    named, and never shown.
50b. **The toy pack covers the engine.** tests/unit/engine/test_toy_pack_coverage.py: the toy
    pack uses every operator, every `when` shape, every calculator, every group, a history,
    an `optional` member, `ends_also`, `bind` and a next stage, a conditional `when_absent`, and
    a rule row not in force on some drawn day.
51. **Regression examples.** Files by the engine round they belong to (point 54):
    `tests/unit/engine/test_w2_unknown.py` (R1, R2, R4, R5, R7, R9 to R12, R15, R16, R24, R26,
    R29 to R35, R38, R40), `tests/unit/engine/test_w2_unknown_counts.py` (R3, R6, R8, R14, R18 to
    R23, R27, R28, R39), `tests/unit/engine/test_w2_unknown_stages.py` (R13, R17, R36, R37) and
    `tests/unit/engine/test_w2_unknown_f1.py` (R25), with twins on other dates in
    `tests/holdout/test_holdout_w2_unknown.py`. Today 2026-09-29, lists stated whole unless
    named. Every date and count below is a claim from the reviews and maps to work again by hand
    in the test's comment, never to copy. Where a case below says "R6's case", it is: p1 master
    (where us_on_f1, start 2024-08-20, end 2026-05-15, state completed), a1 opt_post_completion
    for p1 (decision approved, card 2026-06-01 to 2027-05-31), no job.

    | # | Input | Expected |
    |---|---|---|
    | R1 | Review 1: STEM card a2 with no employer; w1 with e1 2026-07-01 to 2026-08-02, w2 with e2 from 2026-08-03 | no new-plan window shown on a guess; question a2.employer (absent) withholding the stem_job_start entries it holds; cannot_tell |
    | R2 | S1: review 3's `_stem_case("e1")` plus w3 under a2 from 2026-09-01 with no employer | w2's new Form I-983 and report windows 2026-08-03 to 2026-08-13 kept; question w3.employer (absent) |
    | R3 | O1: OPT a1, w1 under a1 from 2026-07-01, w2 with no `under` | w1's report window 2026-07-01 to 2026-07-11 kept; question w2.under; a1's count withheld with w2.under in `waits_on` unless w2's known span covers no counted day |
    | R4 | S2: as S1, w3 with employer e2 and start "2026-13-40"; again with "08/03/2026" | w2's windows kept; `unreadable:w3.start`, `about` holding the value as entered |
    | R5 | D4: w1 2026-07-01 to 2026-08-02, w2 from 2026-08-03 with end `not_yet`, w3 from 2026-09-01 with end `not_sure` | w1's concluding evaluation 2026-08-02 to 2026-08-12 kept (w2 is a decided witness); `undecided:w3.end` and the judgement w3.end.not_sure |
    | R6 | C: R6's case plus a3 for p1 (card 2026-06-01 to 2026-12-31) with no type | `unemployment.opt_card.a1` 121, limit day 2026-08-29, at-or-over raised, all kept; question a3.type |
    | R7 | Review 3's w3 end table: w1 2026-07-01 to 2026-08-02, w3 from 2026-07-15 | end absent (`not_yet`): 2026-08-02 to 2026-08-12. 2026-07-31: null, no `waits_on`. `not_sure`: null with `waits_on` w3.end. "2026-13-40": null with `waits_on` w3.end, `unreadable:w3.end` |
    | R8 | Review 3's hours table: R6's case plus w1 under a1 from 2026-07-01, end absent | 40: 30, limit day null with `waits_on` pending:w1.end (no limit day while the job runs, point 22), nothing asked. "40", "forty", `true`: value and limit day null, no at-or-over, `unreadable:w1.hours_per_week` with the value in `about`. Absent: the same with `missing:`. `not_sure`: the same with `undecided:` |
    | R9 | M9: end_date_change ec1 for p1 (requested 2026-03-01, old end 2026-05-15, new end 2026-12-15) with no change | `missing:ec1.change` asked |
    | R10 | M16: ec1 as R9 plus ec2, change extension requested 2026-06-01 against old end 2026-05-15 | `conflict:end_date_change.asked_before_end.ec2` and `missing:ec1.change` both |
    | R11 | M18: R7's case with "2026-13-40"; and an unreadable value in a field no stage reads | each asked as `unreadable:` |
    | R12 | M20: a1.type "opt_postt" | `unreadable:a1.type`; every output a1's type decides withheld |
    | R13 | Program p1 in progress with no start date, all else answered | stage entry for p1 `unknown` with `waits_on` p1.start_date; question; cannot_tell, never no_open_items |
    | R14 | R6's case plus mv1 (how change_of_level, to_program p2, p2 doctorate starting 2026-08-25, release_date 2026-08-24), mv1.from_program absent | opt_post.a1's end and `unemployment.opt_card.a1` withheld (shown today as current to 2027-05-31, 121, limit day 2026-08-29, at-or-over); with from_program p1, the asking map's probe p6 values (ends 2026-08-24, count 85), worked again by hand |
    | R15 | Grace for p1 (R6's case) with a1.card_end `not_sure` | grace withheld (shown today as 2026-05-16 to 2026-07-14, done); with card_end 2027-05-31, 2027-06-01 to 2027-07-30 |
    | R16 | p1 master ending 2026-05-15; a1 opt_post_completion for p1, dso_on 2026-04-01, filed_on `not_sure`, decision pending. Case A: ec1 for p1 (change extension, requested_on 2026-03-01, old_end 2026-05-15, new_end 2026-08-15, granted_on 2026-03-10). Case B: no end_date_change, list stated whole. Case C: as A with ec1.granted_on `not_sure` | A: opt.apply_window.a1 withheld with `waits_on` a1.filed_on. B: shown, the same for every filing day. C: question ec1.granted_on, never p1.end_date |
    | R17 | p1 bachelor (start 2022-08-20, end 2026-12-15), p2 master starting 2027-01-15, mv1 (how transfer, from p1 to p2, i20_issued_on 2026-12-01, release_date 2026-12-20, registered_on `not_sure`) | the move.begin_classes close, worked by hand, stays in upcoming with `waits_on` mv1.registered_on |
    | R18 | R6's case plus w1 under a1 from 2026-07-01 at 40 hours: end `not_sure`; end "31/08/2026"; end 2026-08-31 | withheld; withheld and asked as unreadable; known: 59 and limit day 2026-10-30 |
    | R19 | R18's case with end 2026-08-31: no start; start `not_sure` | count withheld (shown today as 121 with at-or-over) |
    | R20 | R18's case with start 2026-07-01 and end 2026-06-15 | conflict `span_order.w1` asked; count withheld |
    | R21 | R6's case plus t1 (left_on 2026-06-15, returned_on `not_sure`, purpose personal), trips stated whole | every count and check that reads t1's days withheld with `waits_on` t1.returned_on, each named in the test with what it shows today; `undecided:t1.returned_on` |
    | R22 | p1 bachelor (2019-08-20 to 2023-05-15), p2 (start 2022-08-20, end 2024-05-15, level absent), a1 cpt for p2 (time full_time, decision approved, card 2023-01-01 to 2023-12-31) | every CPT group p2 could join withheld, each named in the test with what it shows today; question p2.level |
    | R23 | R6's case, authorization list not stated whole | `stem.extensions.all` null with `waits_on` complete.authorization (shown today as 0) |
    | R24 | p1 master in progress (2025-08-20 to 2027-05-15); a1 opt_pre_completion for p1 (time part_time, decision approved, card 2026-06-01 to 2026-08-31); w7 under a1 from 2026-06-01 with hours "30" | `unreadable:w7.hours_per_week`; the part-time hours conflict neither raised nor shown as passed: withheld |
    | R25 | engine/f1.py: days under hours unknown | a missing reason, never 0 |
    | R26 | two records with id w1 | CaseStructureError (the 422 is tested in tests/unit/api/test_case_structure.py) |
    | R27 | R6's case plus w1 `under: "p1"` (a program, where the pack allows only an authorization), from 2026-07-01, 40 hours | `unreadable:w1.under`; a1's count withheld |
    | R28 | toy pack: the hours rule has no row in force on today | count withheld with the lapse named |
    | R29 | mv1.release_date "2026-13-40" | the move span withheld (shown today as from i20_issued_on alone); asked as unreadable |
    | R30 | p1.end_date `not_sure` | `undecided:p1.end_date` names it; every opt_post window withheld with `waits_on` p1.end_date |
    | R31 | p1 master ending 2026-08-15; a1 opt_post_completion for p1, dso_on 2026-08-01, filed_on and decision absent (`not_yet`). Twin: p1 ending 2026-05-15 | no `conflict:opt_post.filed_in_window.a1` while the window is open (it rests on a `pending` gap), no question about the filing, opt.apply_window.a1 shown. Twin: the window closed before today, so the check is decided as the pack words it |
    | R32 | toy pack: a selection by `same_as` between two links that are both `none` | nothing chosen; `exists` F |
    | R33 | toy pack: an `earliest_of` whose `optional` member reads a rule with no row in force | the date withheld with the lapse named, never the other member's date |
    | R34 | R6's case plus a2 stem_extension extending a1, with `complete` holding only `authorization:p1`; again with `complete.authorization` dated 2026-10-15 | `stem.extensions.all` withheld with `waits_on` complete.authorization both times |
    | R35 | R6's case plus mv1 (from p1, release_date 2026-12-01), move list not stated whole; then stated whole | opt_post.a1's end withheld with `waits_on` complete.move; then the end from mv1, worked by hand |
    | R36 | R6's case: a1.card_end `not_sure`; a STEM next stage; a field only a STEM record would supply | the STEM next stage in state `unknown` with `waits_on` a1.card_end, question asked; the unbound field named `future:`, not asked, no blocker; with two filing closes, one known and past and one U, the stage kept with `waits_on` |
    | R37 | a2 stem_extension with card_end before card_start | conflict raised; the stage's state `unknown`, dates null, `waits_on` naming the conflict |
    | R38 | R18's case with w1 start "20260803", "2026-W32-1", "2026W321" | each `unreadable:w1.start`, never 2026-08-03 |
    | R39 | toy pack: a counted record whose span ends on a `first` that chooses nothing | the group withheld, `<counter>.span_not_known.<record>` raised and named in `waits_on` |
    | R40 | R6's case plus p1.school_name absent and e1 (no STEM card names it) with e_verify `not_sure` | no question for either; `e1.e_verify.not_sure` raised; no `undecided:` reason; the verdict not cannot_tell for these |

52. **Mutants the tests must kill,** each by at least one example; and each mutant of an operator
    or a reader (U1 to U9, U14, U21 and the review's M9, M15, M16, M18 to M20) by a property as well,
    with P6 drawing every value state (absent, unreadable, not_sure, NONE, NOT_YET) at its leaves.
    Amended 2026-10-02: a mutant at one position of the path (as_of, a group key, done_when, a
    dated statement, a next stage) is held by its example, since ten random draws reach such a
    position only by chance. The review's
    M9, M15, M16, M18, M19, M20, and: U1 `_select` back to all or nothing; U2 `exists` without the
    list check; U3 `present` reading unreadable as absent; U4 `present` reading `not_sure` as
    present; U5 unknown hours read as no job; U6 an unknown end read as ongoing; U7 an unknown
    start read as no days; U8 an unknown optional member passed over; U9 `found or []` in
    `first`; U10 "as of" falling back to today; U11 an undated change skipped; U12 an unknown
    group key leaving the record out; U13 whole ignoring the scope's kind; U14 the readers back to
    dates and choices only; U15 `entered_when` absent read as not entered; U16 `done_when`
    `not_sure` read as done; U17 an empty-gap unknown passing silently; U18 f1.py's default of 0;
    U19 an optional member with a lapsed rule passed over; U20 NOT_YET read as NONE, so a
    comparison raises a conflict; U21 `present` on an absent `ask` field giving T; U22 NONE equal
    to NONE in `same_as`; U23 a `kind:<record>` statement, or one dated after today, counted as
    whole; U24 `first` with a value ignoring whether the list is whole; U25 next stages dropping
    `missing`; U26 `_closed` ignoring a U close; U27 `fromisoformat` basic or week dates read as
    known.
    - Checked by: the review round runs each (TMPDIR mutant script) against the regression files,
      test_unknown_logic.py and the property file with `--hypothesis-profile mutants` (10
      examples), and lists the result.

## 10. The change that lands first: W2-U0, contracts (founder lane, alone)

53. One founder commit before the plan:
    - `contracts/rulepack.schema.json`: a field's optional `when_absent` (`ask`, `not_yet`,
      `none`, or the object of point 2a; default `ask`); the selector's description becomes
      "Records whose conditions are true are chosen; records with an unknown condition are
      undecided and asked; a decided record is never dropped for an undecided one"; the
      condition's description states the table of point 7; `optional` reads "passed over only
      when its value is known to be none"; `as_of` and `first` as points 26 and 15; the
      descriptions of `window_opens`, `window_closes`, `stage.lists[].only_if`, `follows` and
      `gap_allowed` say "refused at pack load until the engine works it" (point 11).
    - `contracts/engine_output.schema.json`: questions gain optional `field`, `state` (absent,
      unreadable, undecided, list, conflict) and `withholds`; computed items, windows, stages and
      upcoming gain optional `waits_on` (strings, at least one), described as point 34 says.
    - `contracts/case.schema.json`: the scalar's number without bounds; period `start` and
      `hours_per_week` take the scalar; the descriptions of point 42.
    - `contracts/product_settings.yaml`: `dates.earliest_readable` 1950-01-01 and
      `dates.latest_readable` 2099-12-31, with a contract test that they match the case schema's
      date pattern.
    - `contracts/openapi.yaml`: the 422 detail `CASE_STRUCTURE` where 422 details are listed;
      NOT_IN_THE_PACK gone.
    - `desktop/src/schema.test.ts`: the cases point 42 changes.
    - `specs/step-w/maps/`: the four maps (logic, counts, asking, boundary), so the agents, the
      reviewer and the auditor can read what "23 of 23" and "28 of 31" count.
    - Checked by: `bash -c 'uv run pytest tests/unit/contracts -q && make gate-7 && uv run pytest
      tests/unit -q && npm test -w desktop && npm test -w web'`, with today's outputs for the
      journeys still valid.

## 11. The plan

54. **specs/step-w/plan-w2-p1-unknown.yaml.** Lanes and paths: L-tests (tests/), L-content
    (rulepacks/f1-us/v2026.09/parameters.yaml and CHANGELOG.md), L-engine (engine/), L-api
    (api/), L-web (web/), L-review (reviews/), L-audit (docs/requirements/). Tests first; the pack
    before the engine; the engine in five rounds, each with its own test files, the last running
    every engine test and the journeys; the api and web after the engine; samples as a round
    step; reconcile, review, audit. The tests round also brings every existing test whose
    expectation this SPEC changes in line, the point beside each (journeys that state lists only
    for one record, point 14; ids that break point 39, such as `x1` for an end_date_change in
    tests/unit/engine/test_w2_windows.py), so the engine rounds' done commands can pass.

```yaml
branch: step-w
spec: specs/step-w/SPEC-W2-UNKNOWN.md
goal: 'One rule for unknown values across the engine (SPEC-W2-UNKNOWN): four value states, three truth values for every operator, selections that keep decided records, counters that withhold only the groups an undecided record could join, every unknown that could change an output asked by record and field, nothing derived from an unknown shown as known, and a boundary that refuses only structure. Clears the third W2-P1 veto (reviews/w2-p1.md findings 1 to 5) for the class, not the inputs. Generic: nothing about F-1 in engine code.'
merge: local
audited: false
rounds:
- name: tests
  lanes:
  - lane: L-tests
    agent: test-author
    mission: 'Read specs/step-w/SPEC-W2-UNKNOWN.md, the maps in specs/step-w/maps/ and the three W2-P1 reviews (git log -p reviews/w2-p1.md). Write tests/support/gaps.py and tests/support/unknown_toy.py (point 44); P6 in tests/unit/engine/test_unknown_logic.py; tests/unit/engine/test_readers.py (point 41); tests/unit/engine/test_unknown_generic.py (point 12); the point 11 and 7a faults in tests/unit/engine/test_rulepack.py; tests/unit/engine/test_when_absent.py (points 2 and 14, pack data only, no new engine name); tests/unit/engine/test_toy_pack_coverage.py (point 50b); P1 to P5 and P7 in tests/unit/engine/test_w2_unknown_props.py; the regressions in the four files point 51 names, with twins and P2j in tests/holdout/test_holdout_w2_unknown.py; tests/unit/api/test_case_structure.py (point 39); tests/web/unknown.test.ts (point 38) and tests/web/records-typed.test.ts (point 43); and every other Checked-by test of points 1 to 43 not marked founder lane, including test_verdict.py for point 37. Import every name the SPEC adds inside the test, never at module level. Keep the example counts and time budget of section 9. Bring every existing test in tests/unit and tests/holdout whose expectation the SPEC changes in line, the point beside each (point 54). Work every date and count by hand in the comment; a value in the SPEC is a claim to check. Inject the clock. The new tests cannot pass yet.'
    done: bash -c 'uv run ruff check tests && uv run ruff format --check tests && uv run pytest tests/unit/engine/test_unknown_logic.py tests/unit/engine/test_readers.py tests/unit/engine/test_unknown_generic.py tests/unit/engine/test_rulepack.py tests/unit/engine/test_when_absent.py tests/unit/engine/test_toy_pack_coverage.py tests/unit/engine/test_w2_unknown.py tests/unit/engine/test_w2_unknown_counts.py tests/unit/engine/test_w2_unknown_stages.py tests/unit/engine/test_w2_unknown_props.py tests/unit/engine/test_w2_unknown_f1.py tests/unit/api/test_case_structure.py tests/holdout/test_holdout_w2_unknown.py --co -q >/dev/null && npx eslint tests/web --max-warnings 0'
- name: pack
  lanes:
  - lane: L-content
    agent: rulepack-drafter
    mission: 'SPEC-W2-UNKNOWN points 2, 2a and 14: give each field of the F-1 pack whose absence the screen states as not yet or none a when_absent declaration, conditional where it depends on the record; every other field stays ask (the default). Start from the list in point 61 as the founder recorded it in DECISIONS.md. Add a complete_label to every kind a history, a first or a count reads that has none. Record each in CHANGELOG.md with the screen words that make an empty field the person''s statement. No rule, number or source changes. Make tests/unit/engine/test_when_absent.py pass.'
    done: bash -c 'uv run python -m tools.sources.verify rulepacks && uv run python -m tools.sources.plain rulepacks --require f1 && uv run python -c "from engine.rulepack import load_all; load_all()" && uv run pytest tests/unit/engine/test_when_absent.py -q'
- name: engine-core
  lanes:
  - lane: L-engine
    agent: builder
    mission: 'SPEC-W2-UNKNOWN points 1 to 5, 2a, 7a, 11, 12 and 41: engine/unknown.py and engine/readers.py with exactly the interface of point 12, pure and generic; validate_pack refuses every fault of points 7a and 11; the pack loader keeps when_absent. Do not change engine/path.py yet beyond what these tests need. Make the done command pass.'
    done: bash -c 'uv run pytest tests/unit/engine/test_unknown_logic.py tests/unit/engine/test_readers.py tests/unit/engine/test_unknown_generic.py tests/unit/engine/test_rulepack.py tests/unit/engine/test_when_absent.py -q && uv run mypy && uv run ruff check engine && uv run ruff format --check engine'
- name: engine-reads
  lanes:
  - lane: L-engine
    agent: builder
    mission: 'SPEC-W2-UNKNOWN points 6 to 10, 13 to 17, 25 to 28, 32, 34 to 37 and 39 in engine/path.py: every value read through engine/readers.py, every operator, selection, first, earliest_of and latest_of, fact, as of, history and check through engine/unknown.py; NOT_YET and NONE kept apart; questions with field, state and withholds; withheld outputs with waits_on; engine_gap for an unknown with no gap; compute decides through engine/verdict.decide; CaseStructureError for the faults of point 39. Generic, nothing about F-1 in engine code. Make the done command pass.'
    done: bash -c 'uv run pytest tests/unit/engine/test_unknown_logic.py tests/unit/engine/test_readers.py tests/unit/engine/test_unknown_generic.py tests/unit/engine/test_rulepack.py tests/unit/engine/test_when_absent.py tests/unit/engine/test_w2_unknown.py tests/unit/engine/test_verdict.py -q && uv run mypy && uv run ruff check engine && uv run ruff format --check engine'
- name: engine-counts
  lanes:
  - lane: L-engine
    agent: builder
    mission: 'SPEC-W2-UNKNOWN points 18 to 23 and 22a, and point 24 in engine/path.py: counter scopes as selections, unknown group keys, whole over every kind read, unknown records that could count, spans with NOT_YET ends running through today, span conflicts, N spans on counted records, rules a count reads, and a withheld count emitted with waits_on. Generic. Make the done command pass.'
    done: bash -c 'uv run pytest tests/unit/engine/test_unknown_logic.py tests/unit/engine/test_readers.py tests/unit/engine/test_rulepack.py tests/unit/engine/test_when_absent.py tests/unit/engine/test_w2_unknown.py tests/unit/engine/test_w2_unknown_counts.py tests/unit/engine/test_verdict.py -q && uv run mypy && uv run ruff check engine && uv run ruff format --check engine'
- name: engine-stages
  lanes:
  - lane: L-engine
    agent: builder
    mission: 'SPEC-W2-UNKNOWN points 29 to 31, 32a and 33 in engine/path.py: entered_when, done_when, bind, next stages (gaps on real records asked, future gaps named, only_if U as state unknown, closed only when every close is known and past), span conflicts making a stage unknown, and nothing derived from an unknown shown as known. Then make the properties of points 45 to 50b and every test in tests/unit/engine except test_w2_unknown_f1.py, and the journeys, pass. Generic.'
    done: bash -c 'uv run pytest tests/unit/engine tests/unit/acceptance/test_journeys.py -q --ignore=tests/unit/engine/test_w2_unknown_f1.py && uv run python -m tools.gates.engine_literals && uv run mypy && uv run ruff check engine && uv run ruff format --check engine'
- name: engine-f1
  lanes:
  - lane: L-engine
    agent: builder
    mission: 'SPEC-W2-UNKNOWN point 24 in engine/f1.py: no default of 0 for an unknown number, a check resting on an unknown number gives its missing reason, and a not_sure or unreadable job end is never read as still working (R25, P2f). Make every test in tests/unit/engine and the journeys pass.'
    done: bash -c 'uv run pytest tests/unit/engine tests/unit/acceptance/test_journeys.py -q && uv run python -m tools.gates.engine_literals && uv run mypy && uv run ruff check engine && uv run ruff format --check engine'
  checks:
  - name: hidden tests
    run: uv run pytest tests/holdout -q
- name: edges
  lanes:
  - lane: L-api
    agent: builder
    mission: 'SPEC-W2-UNKNOWN point 39: api/local_routes.py and api/main.py answer CaseStructureError with 422 CASE_STRUCTURE in its own plain words (api/case.py), never repeating what was sent; schema faults keep the first_problem detail as today; NOT_IN_THE_PACK is retired. Make tests/unit/api pass.'
    done: bash -c 'uv run pytest tests/unit/api -q && uv run mypy && uv run ruff check api && uv run ruff format --check api'
  - lane: L-web
    agent: builder
    mission: 'SPEC-W2-UNKNOWN points 2, 38 and 43: the zod engine output schema takes waits_on, field, state and withholds; labels.ts exports unreadableLine, undecidedLine and waitingLine as point 38 says, and the question line uses them; a withheld number or date shows what it waits for, never a number; each field the pack declares not_yet or none carries the screen words recorded for it in rulepacks/f1-us/v2026.09/CHANGELOG.md, with a test in web/src; records.ts sends a value as typed and an empty one as absent (cleanField and caseRecord drop nothing else, NUMBER_FIELDS goes). Make npm test -w web pass.'
    done: bash -c 'npm run typecheck -w web && npm test -w web && npx eslint web --max-warnings 0 && npx prettier --check "web/**/*.{ts,tsx,css,html,json}" && uv run python -m tools.copy_lint.lint'
- name: samples
  steps:
  - lane: L-web
    run: make samples
- name: reconcile
  lanes:
  - lane: L-tests
    agent: test-author
    mission: 'Bring every test in tests/unit, tests/holdout and tests/web in line with SPEC-W2-UNKNOWN; write the point beside each change; never loosen an assertion, never remove a fill from the set in tests/support/gaps.py; cover every new engine branch so the engine diff coverage of gate 6 holds; escalate any failure no point explains.'
    done: bash -c 'uv run ruff check tests && uv run ruff format --check tests && uv run pytest tests/unit tests/holdout -q -p no:cacheprovider --ignore=tests/unit/tools && npm test -w web -- tests/web && make gate-6 BASE=work/product-2'
  - lane: L-web
    agent: builder
    mission: 'Make the tests in web/src pass after the samples round regenerated web/samples, changing only what SPEC-W2-UNKNOWN requires, with the point beside each. Tests under tests/web are the tests lane''s.'
    done: bash -c 'npm run typecheck -w web && npm test -w web -- src/ && npx eslint web --max-warnings 0'
  checks:
  - name: offline gates
    run: make test-offline BASE=work/product-2
  - name: desktop
    run: npm test -w desktop
- name: review
  lanes:
  - lane: L-review
    agent: reviewer
    mission: 'Review everything plan-w2-p1-unknown.yaml changed against SPEC-W2-UNKNOWN, PRINCIPLES.md, BOUNDARY.md, the maps in specs/step-w/maps/ and the three W2-P1 reviews. Rerun S1, O1, S2, D4, C, the w3 end table, the hours table and R1 to R40, and every mutant of point 52 (M9, M15, M16, M18, M19, M20, U1 to U27) as point 52 says. Try hardest to find any operator, reader or output where an unknown is read as false, empty, absent, zero, today, done or ongoing, NOT_YET read as NONE, any gap not asked that could change an output, any field asked that nothing reads, and any withholding no fill justifies. Report how many journey outputs are withheld before and after, and the time tests/unit takes. Write reviews/w2-unknown.md and reviews/REVIEW.json.'
    done: bash -c 'grep -Eq "^(APPROVE|VETO)$" reviews/w2-unknown.md && test -f reviews/REVIEW.json'
- name: audit
  lanes:
  - lane: L-audit
    agent: auditor
    mission: 'Audit W2-P1 with plan-w2-p1-unknown.yaml (plan-w2-p1.yaml, plan-w2-p1-fix.yaml, plan-w2-p1-fix2.yaml, plan-w2-p1-unknown.yaml) as your role file describes, with the register rows SPEC-W2-UNKNOWN names under Covers. Write docs/requirements/audits/w2-unknown.md.'
    done: bash -c 'test -f docs/requirements/audits/w2-unknown.md && uv run python -m tools.requirements.register check'
```

## 12. For the founder

55. **Approve the rule of point 6** (known only when every value the unknowns could take gives
    the same output). It is the rule behind every review finding. Recommendation: yes.
56. **More outputs wait for an answer.** The positioning note of 2026-09-30 found the preview
    over-cautious. This rule withholds more dates until a gap is answered, but only the outputs a
    gap could change, and only gaps that could change an output are asked (point 8): an unread
    empty field asks nothing. Recommendation: accept; the review reports how many journey
    outputs are withheld before and after, and onboarding (W2-P6) asks the list and absence
    questions in its skeleton steps so few remain.
57. **Not sure: Can't tell yet, or Talk to your DSO?** Today a `not_sure` answer gives only the
    judgement `<field>.not_sure` (talk_to_dso) and no question. Point 35 adds `undecided:` as a
    blocker when the answer could change an output, so the verdict is cannot_tell with the DSO
    judgement kept among the reasons. Recommendation: yes; a date resting on a not-sure answer
    cannot be shown, and the screen still says the DSO can tell them.
58. **A list not stated whole withholds "none found" and "the earliest found"** (point 14): with
    no move entered and the move list not stated whole, an OPT end that a move could cut is
    withheld; with one move entered, the earliest release is withheld too; a statement for one
    program's authorizations no longer counts for all of them; and a change of end date list must
    be stated whole before an end "as of" a filing day is shown. Recommendation: yes (D41);
    onboarding asks each list in the step that adds it ("Any other school moves?").
59. **Refuse structure, take values** (section 8). Recommendation: yes, as the boundary map
    argues: the desktop would lose a saved case under a typed schema, a 422 withholds every date,
    and a refusal cannot say what was wrong.
60. **Ranges.** A count withheld for one unknown hours figure could still say "at least 30
    days". Recommendation: not now; a range is a new output kind with its own words and its own
    boundary review.
61. **What absence means, field by field** (points 2 and 2a). Recommendation, for L-content to
    confirm against the screen words:
    - `not_yet`: work.end, trip.returned_on, authorization.filed_on, authorization.decision,
      move.registered_on, move.release_date, move.contacted_new_dso_on, report.made_on;
      authorization.card_start and card_end only while no decision has come
      (`{not_yet: [{any_of: [{field: this.decision, present: false}, {field: this.decision, in: [pending]}]}], else: ask}`).
    - `none`: work.on_campus (an off-campus job), authorization.extends (an OPT that extends
      nothing), petition.outcome (validity_start and requested_start are asked, D94); authorization.employer and
      basis_program `none` on every type but stem_extension, else `ask`.
    - `ask`: everything else, including work.under, program dates, levels, types and every other
      link a count or a selection reads.
    - Open for the founder: trip.returned_on as `not_yet` (a trip still under way) or `ask`.
62. **Before the plan runs, in this order.** (1) The founder records the decisions on points 55
    to 61, 63 and 64 in DECISIONS.md, with the point 61 list as approved. (2) W2-U0 lands
    (point 53), alone. (3) The founder commits specs/step-w/plan-w2-p1-unknown.yaml and runs
    `uv run python -m tools.factory.preflight specs/step-w/plan-w2-p1-unknown.yaml` and
    `make gate-7`. Merging step-w to main stays the founder's.
63. **Two kinds of unknown that never block** (point 5): `pending` (a not-yet event compared with
    a later day: the answer comes with time) and `future` (a field of a record the person has not
    entered, read by a next stage). Both withhold the output and say so, and neither asks nor
    turns the verdict to cannot_tell. Recommendation: yes; asking either would ask the person
    about the future.
64. **Numbers in the case contract lose their bounds** (point 42): a typed -1 or 200000 hours is
    read and asked, not refused with a 422 that withholds the whole case. Recommendation: yes.

## Covers

The three W2-P1 reviews' findings of this class: review 1 finding 1, review 2 findings 1 and 2,
review 3 findings 1 to 5: 8 of 8. The logic map's collapse points: 23 of 23. The counts map's
rows: 28 of 31 (rows 20, 28 and 30 are readings to check, not unknowns; see "What this is not").
The asking map's items: 24 of 25 (`_answer` without `about` waits). The boundary map's refusals
and readers: all. The two critiques of this SPEC: see "Review notes".

Register rows met by this plan: PRIN-010, PRIN-012, PRIN-013, PRIN-025, DEC-D04-003,
DEC-D34-002, DEC-D41-001, DEC-D59-002, IMPL-027, BACK-006, BACK-009, BACK-013, BACK-015 and
RBACK-092 (Hypothesis on date and deadline math). That is 14 of 2461 requirement rows named
here; the audit round reports the share met.

## Later

Ranges for withheld counts (point 60); check-ins and stale facts, including how old a `not_yet`
statement may be (SPEC-W2 N3); CPT months against days, overlapping hours and hours changes
(counts map rows 20, 28, 30); `_answer` without `about`; the question words for each kind of
field on every screen (W2-P6, W2-P7).

## Review notes

Two critiques of the first draft: completeness (24 findings and smaller points) and
buildability (19 findings). Resolved here, by finding:

- Completeness 1 (NOT_YET read as NONE): fixed, points 1, 2, 7, 15, 16, 22, R31, U20. One part
  is corrected rather than taken: NOT_YET does not beat every known date, only every day up to
  today; against a later day the answer is `pending`, since the event may still come first.
- Completeness 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 22, 23, 24: fixed
  (points 2, 2a, 7, 7a, 11, 14, 16, 22a, 25, 31, 32a, 35, 41, 44 to 50b; R32 to R40; U19 to
  U27).
- Completeness 6 (not_yet as of the last save): taken in its second form. The age of an empty
  `not_yet` statement is SPEC-W2 N3's, said in "What this is not" and "Later". Bounding spans
  by a check-in day would build half of N3 here.
- Completeness 17 (links in this run): "in this run" taken. Rejected: a link to another
  category's record as a structure fault. Point 39 refuses only what no question could fix;
  the person can fix a wrong link, so it is unreadable and asked.
- Completeness 18 and buildability 8 (schema bounds): fixed by points 39, 42, 43 and 64 and the
  gap samples of point 44.
- Completeness 21 (P2 over all fills): taken in part. Looping over every fill breaks the time
  budget (buildability 2). Each example draws 6 fills that always include the boundary fills,
  and P2j runs exhaustively over fields and gap states on the journeys in the holdout.
- Completeness smaller points: the record sets of R16, R17, R21, R22, R24 and R27 are written
  out; the mutants are U19 to U27; f1.py is held by P2f rather than narrowing the goal. R17's
  close date and R21's and R22's "shown today" numbers came with no inputs, so the tests work
  them by hand instead of copying them.
- Buildability 1, 4, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19: fixed (plan, points 12, 39, 51, 53,
  54, 62).
- Buildability 2 (test time): fixed (section 9 counts and budget, point 44, point 52's mutant
  profile).
- Buildability 3: fixed with completeness 22.
- Buildability 5: the tests round updates existing tests whose expectations change; the
  journeys stay in the engine's done command, so a changed journey is seen in the round that
  changes it.
- Buildability 6: imports inside the test and the tsc step dropped. Rejected: `pytest.importorskip`,
  which would let an engine that never builds engine/unknown.py pass by skipping.
- Buildability 7: the interface of point 12 and the exports of point 38.
- Buildability 13: `make samples` is a round step; L-tests owns tests/web, L-web runs only the
  tests in web/src; the desktop tests are a round check.
