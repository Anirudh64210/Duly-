"""P1 to P5 and P7: specs/step-w/SPEC-W2-UNKNOWN.md points 45 to 49 and 50a, on the toy pack
(tests/support/unknown_toy.py) and the shipped F-1 pack, with the generators of point 44
(tests/support/gaps.py). Section 9: FixedClock at noon UTC, deadline None, derandomized, 30
examples each in tests/unit. Every expected value is the engine's own output on a decided
case: the properties compare outputs across fills, so no expected date is copied.
"""

import copy
import functools
from collections import Counter
from datetime import date
from typing import Any

import pytest
from hypothesis import event, given, settings
from hypothesis import strategies as st

from engine.rulepack import Rulepack
from tests.support import gaps
from tests.support import unknown_toy as toy
from tests.support.w2_pack import compute, f1_pack, output_problems
from tests.unit.engine.test_w2_unknown import r6_case
from tests.unit.engine.test_w2_windows import f1_case

UNIT = settings(max_examples=gaps.UNIT_EXAMPLES, deadline=None, derandomize=True)
TODAY = gaps.EXAMPLE_DAY

TOY_SEED = toy.case(
    [
        toy.rec(
            "c1",
            "course",
            level="mid",
            mode="day",
            start="2026-01-05",
            end="2026-12-18",
            online=True,
            credits=2,
            code="A1",
            joined_on="2026-01-05",
        ),
        toy.rec(
            "k1",
            "card",
            type="plain",
            course="c1",
            decision="approved",
            card_start="2026-02-02",
            card_end="2026-07-31",
            filed_on="2026-01-12",
        ),
        toy.rec("w1", "job", under="k1", start="2026-03-02", end="2026-05-29", hours_per_week=30),
    ],
    TODAY,
    facts={"arrived_on": "2026-01-02", "visits": 1},
)
F1_SEED = f1_case(r6_case(), TODAY)


def _f1_seeds() -> list[dict[str, Any]]:
    """Point 44: the F-1 seeds are every journey of tests/unit/acceptance/test_journeys.py and
    the decided form of each F-1 case of R1 to R40 (each row's gap given a known value: the
    fill its own test works by hand). The toy rows (R28, R32, R33, R39) seed the toy pack
    through TOY_SEED and their own tests."""
    from tests.unit.acceptance import test_journeys as journeys
    from tests.unit.engine import test_w2_unknown as reads
    from tests.unit.engine import test_w2_unknown_counts as counts

    found = [
        getattr(journeys, n)() for n in sorted(dir(journeys)) if n[0] == "j" and n[1:].isdigit()
    ]
    w3 = toy_free_rec("w3", "work", employer="e2", under="a2", start="2026-09-01", end="2026-09-20")
    p1_in = toy_free_rec(
        "p1",
        "program",
        where="us_on_f1",
        level="master",
        stem_list="on_list",
        start_date="2025-08-20",
        end_date="2027-05-15",
        state="in_progress",
    )
    trip = toy_free_rec(
        "t1", "trip", left_on="2026-06-15", returned_on="2026-06-30", purpose="personal"
    )
    rows: list[list[dict[str, Any]]] = [
        r6_case(),  # R6, R15, R23, R30, R36
        reads.stem_jobs(reads.W1, reads.W2),  # R1, R2
        reads.stem_jobs(reads.W1, reads.W2, w3),  # R4, R5, R7, R11
        r6_case(counts.job(start="2026-07-01", end="2026-08-31", hours_per_week=40)),  # R8, R18
        counts.r14_move(from_program="p1"),  # R14
        r6_case(trip),  # R21
        r6_case(reads.A2_PENDING),  # R34
        [p1_in],  # R13
    ]
    found.extend(f1_case(r) for r in rows)
    found.append(reads.r16_case("2026-03-01", reads.R16_EC1))  # R16
    return found


def toy_free_rec(record_id: str, kind: str, **fields: Any) -> dict[str, Any]:
    return {"id": record_id, "kind": kind, "fields": dict(fields)}


F1_SEEDS = _f1_seeds()


def _packs() -> list[tuple[str, Rulepack, list[dict[str, Any]]]]:
    return [("toy", toy.pack(), [TOY_SEED]), ("f1", f1_pack(), F1_SEEDS)]


PACKS = _packs()
IDS = [name for name, _, _ in PACKS]
# Point 44, non-vacuity: (pack, output kind) for each output known in C and changed by a fill.
SEEN: Counter[tuple[str, str]] = Counter()
OUTPUT_KINDS = ("computed", "window", "stage", "upcoming", "reasons")
# The gap reasons (point 35) and the typed-date reasons say what is asked, not what is shown.
ASKING = ("missing:", "undecided:", "unreadable:", "unconfirmed:")


def _shown_reasons(out: dict[str, Any]) -> frozenset[str]:
    return frozenset(r for r in out["verdict"]["reasons"] if not r.startswith(ASKING))


def _same_known(held: dict[str, Any], filled: dict[str, Any], skip: str = "") -> None:
    """Point 45 (a) and 46 (a): every output known in `held` equals its value in `filled`."""
    shown = gaps.known_outputs(held)
    other = gaps.outputs(filled)
    for key, value in shown.items():
        if skip and skip in key:
            continue
        assert other.get(key) == value, (key, value, other.get(key))


@pytest.mark.parametrize(("name", "pack", "seed"), PACKS, ids=IDS)
@UNIT
@given(data=st.data())
def test_a_gap_in_a_new_record_never_changes_or_removes_another_records_output(
    name, pack, seed, data
):
    # P1 (point 45 a): a sibling R, a copy of a record of C with its links kept and its dates
    # shifted within 10 days, given one gap. Every output not keyed to R known in C + R equals
    # its value in C + R(F) for each drawn fill F. Fails on 07196cd for D4 and C (U1).
    case = data.draw(gaps.decided_cases(pack, seed))
    source = data.draw(st.sampled_from(case["records"]))
    sibling = copy.deepcopy(source)
    prefix = gaps.kinds(pack)[source["kind"]]["id_prefix"]
    sibling["id"] = f"{prefix}9"
    sibling = gaps.shift_dates(sibling, data.draw(st.integers(-10, 10)))
    fields = sorted(sibling["fields"])
    if not fields:
        return
    field = data.draw(st.sampled_from(fields))
    decl = gaps.decl_of(pack, source["kind"], field)
    run = {**gaps.run_of(case), sibling["id"]: sibling["kind"]}
    state, raw = data.draw(st.sampled_from(gaps.gap(decl, run)))
    with_gap = copy.deepcopy(case)
    with_gap["records"].append(
        gaps.with_field({"records": [sibling]}, sibling["id"], field, raw)["records"][0]
    )
    held = compute(with_gap, [pack], TODAY)
    base = compute(case, [pack], TODAY)
    values = gaps.fills(decl, case, base, pack, run)
    keep = gaps.must_fill(sibling["fields"][field], values, [])
    filled_outs = []
    for fill in data.draw(gaps.drawn_fills(values, keep)):
        filled = copy.deepcopy(case)
        filled["records"].append(
            gaps.with_field({"records": [sibling]}, sibling["id"], field, fill)["records"][0]
        )
        filled_outs.append(compute(filled, [pack], TODAY))
        _same_known(held, filled_outs[-1], skip=f".{sibling['id']}")
    event(f"P1:{name}:{state}")
    if name != "toy":
        return
    # P1 (b), toy pack only (point 45): every output known in C, not keyed to R, and withheld
    # in C + R names R's gap in waits_on, and some two drawn fills give it different values.
    # Fails for an engine that withholds what R's gap cannot change.
    qid = f"{sibling['id']}.{field}"
    known_before = gaps.known_outputs(base)
    for key in gaps.withheld(held):
        if f".{sibling['id']}" in key or key not in known_before:
            continue
        assert qid in gaps.waits_on(held, key), (key, gaps.waits_on(held, key))
        seen = {repr(gaps.outputs(out).get(key)) for out in filled_outs}
        assert len(seen) > 1, (key, seen)


@pytest.mark.parametrize(("name", "pack", "seed"), PACKS, ids=IDS)
@UNIT
@given(data=st.data())
def test_a_list_not_stated_whole_never_shows_what_an_unseen_record_could_change(
    name, pack, seed, data
):
    # P1w (point 45): remove one complete statement; every output known in the result equals
    # its value in C and in C plus one decided sibling of that kind.
    case = data.draw(gaps.decided_cases(pack, seed))
    kind = data.draw(st.sampled_from(sorted(case["complete"])))
    partial = copy.deepcopy(case)
    del partial["complete"][kind]
    held = compute(partial, [pack], TODAY)
    _same_known(held, compute(case, [pack], TODAY))
    same_kind = [r for r in case["records"] if r["kind"] == kind]
    if same_kind:
        sibling = copy.deepcopy(same_kind[0])
        sibling["id"] = gaps.kinds(pack)[kind]["id_prefix"] + "9"
        grown = copy.deepcopy(case)
        grown["records"].append(sibling)
        _same_known(held, compute(grown, [pack], TODAY), skip=".".join(["", sibling["id"]]))
    event(f"P1w:{name}:{kind}")


@pytest.mark.parametrize(("name", "pack", "seed"), PACKS, ids=IDS)
@UNIT
@given(data=st.data())
def test_replacing_a_known_value_with_an_unknown_one_withholds_and_asks(name, pack, seed, data):
    # P2 (point 46) and P3 (point 47): a field X.f of a decided case, a gap state g. (a) every
    # output known in C_g equals its value in each drawn C_v'; (b) when a fill changes an
    # output, or g is unreadable, C_g asks X.f with record, field and state, about holding an
    # unreadable value as entered; (c) an output that differs between two fills is withheld
    # naming X.f; (d) then the verdict is cannot_tell. P3: every judgement and conflict raised
    # in C_g other than about X.f is raised in every C_v'.
    case = data.draw(gaps.decided_cases(pack, seed))
    present = gaps.present_fields(pack, case)
    rid, field = data.draw(st.sampled_from(present))
    kind = gaps.run_of(case)[rid]
    decl = gaps.decl_of(pack, kind, field)
    run = gaps.run_of(case)
    state, raw = data.draw(st.sampled_from(gaps.gap(decl, run)))
    original = next(r for r in case["records"] if r["id"] == rid)["fields"][field]
    base = compute(case, [pack], TODAY)
    held = compute(gaps.with_field(case, rid, field, raw), [pack], TODAY)
    values = gaps.fills(decl, case, base, pack, run)
    keep = gaps.must_fill(original, values, gaps.output_dates(base))
    filled_outs = [
        compute(gaps.with_field(case, rid, field, v), [pack], TODAY)
        for v in data.draw(gaps.drawn_fills(values, keep))
    ]
    qid = f"{rid}.{field}"
    for out in filled_outs:
        _same_known(held, out)
        for reason in held["verdict"]["reasons"]:
            if qid in reason or reason.startswith(("missing:", "undecided:", "unreadable:")):
                continue
            if reason.startswith("conflict:") or "." in reason:
                assert reason in out["verdict"]["reasons"], reason
    # Finding 11: (b) and (c) compare the reasons (other than those that only ask), the stage
    # states and the upcoming dates as well as the values, which is how a not-sure happened
    # date that could raise a conflict went unasked (finding 5).
    # An output one fill shows and another leaves out has changed too: the output contract
    # leaves out an upcoming entry that rests on an unknown (point 33), so the keys are the
    # union over every fill, and shown or not is part of the value.
    shown = [gaps.outputs(out) for out in filled_outs]
    changed = {
        key
        for key in set().union(*shown)
        if key != "reasons"
        and any((key in s, s.get(key)) != (key in shown[0], shown[0].get(key)) for s in shown)
    }
    if any(_shown_reasons(out) != _shown_reasons(filled_outs[0]) for out in filled_outs):
        changed.add("reasons")
    known_in_c = gaps.known_outputs(base)
    for key in changed:
        if key in known_in_c or key == "reasons":
            SEEN[(name, key.partition(":")[0])] += 1
    if changed or state == "unreadable":
        q = gaps.question(held, qid)
        assert q is not None, qid
        assert (q.get("record"), q.get("field"), q.get("state")) == (rid, field, state)
        if state == "unreadable":
            assert q["about"][qid] == raw
        assert held["verdict"]["state"] == "cannot_tell"
        event(f"P2:{name}:changed")
    shown_held = gaps.outputs(held)
    q = gaps.question(held, qid)
    for key in changed - {"reasons"}:
        if key in shown_held:
            assert key in gaps.withheld(held), key
            assert qid in gaps.waits_on(held, key), key
        elif key.startswith("stage:"):
            # A record's entry into a stage, left out: named in the question's withholds.
            assert q is not None, key
            assert key.partition(":")[2] in q.get("withholds", []), key


# Point 52, review w2-unknown finding 2: M9, M15, M16 and M20 act on a record whose for_each
# selection is unknown, which P1 to P3 draw too seldom to kill in 10 examples. The toy pack plus
# one judgement over the courses chosen by mode, a field nothing else reads, so only that
# check's own selection can ask it. c1 and c2 are day courses with 3 credits, over toy.cap 2, so
# the judgement is raised for each; k2 is a second plain card, for c2.
DAY_CREDITS = {
    "id": "course.day_credits",
    "kind": "judgement",
    "for_each": {"record": "course", "where": [{"field": "this.mode", "in": ["day"]}]},
    "holds": [{"field": "this.credits", "at_most": {"rule": "toy.cap"}}],
    "rule_ids": ["toy.cap"],
}
SELECTION_PACK = toy.pack(checks=[*toy.CHECKS, DAY_CREDITS])
SELECTION_SEED = gaps.with_field(TOY_SEED, "c1", "credits", 3)
SELECTION_SEED["records"] += [
    toy.rec("c2", "course", **dict(SELECTION_SEED["records"][0]["fields"], code="B1")),
    toy.rec("k2", "card", **dict(SELECTION_SEED["records"][1]["fields"], course="c2")),
]
# The toy checks whose holds read each field once (point 6), where P3's second half applies.
# job.order and card.levels read a field twice.
READ_ONCE_CHECKS = (
    "card.inside_course",
    "job.hours",
    "course.renewal_day",
    "card.cap",
    "course.day_credits",
)


def _selection_fields(pack: Rulepack, case: dict[str, Any]) -> list[tuple[str, str]]:
    """(record, field) for each choice a stage's or check's for_each `where` reads. Choices
    only: their fill set is whole in 6 draws, and the dates such a `where` reads (joined_on)
    are P2's, whose fills near every output date would take this test past point 44's budget."""
    path = pack.path or {}
    read = {
        (part["for_each"]["record"], cond["field"].removeprefix("this."))
        for part in [*path["stages"], *path["checks"]]
        if "for_each" in part
        for cond in part["for_each"].get("where", [])
        if cond.get("field", "").count(".") == 1
    }
    return [
        (r["id"], f)
        for r in case["records"]
        for f in sorted(r["fields"])
        if (r["kind"], f) in read and gaps.decl_of(pack, r["kind"], f)["kind"] == "choice"
    ]


@functools.cache
def _none_pack(kind: str, field: str) -> Rulepack:
    """SELECTION_PACK with kind.field declared `none`: the NONE fill of an `ask` field has no raw
    form (left out, the field is a gap), so it goes through this copy (tests/support/gaps.py)."""
    records = copy.deepcopy(toy.RECORDS)
    decl = next(d for r in records if r["id"] == kind for d in r["fields"] if d["id"] == field)
    decl["when_absent"] = "none"
    return toy.pack(records=records, checks=[*toy.CHECKS, DAY_CREDITS])


def _of_read_once_check(reason: str) -> bool:
    return any(
        reason.startswith(f"conflict:{c}.") or reason == c or reason.endswith(f".{c.split('.')[1]}")
        for c in READ_ONCE_CHECKS
    )


@UNIT
@given(data=st.data())
def test_a_gap_in_one_record_s_selection_keeps_every_other_record(data):
    # P1 to P3 (points 45 to 47) on every field a for_each selection reads, each gap state:
    # (a) every output known with the gap equals its value in each drawn fill; (b) when a fill
    # changes an output, or the gap is unreadable, X.f is asked with its state and the verdict
    # is cannot_tell; (c) an output that differs between fills waits on X.f, or is an entry
    # named in the question's withholds; (P1, "never removes") an output of another record that
    # every fill shows alike is still emitted; (P3, second half, read-once checks) a judgement or
    # conflict of another record raised in every fill is raised with the gap.
    # Fails if: an undecided record in a check's selection is not asked (M9: c2.mode, whose
    # fills raise c2.day_credits or not); a stage drops every record when one is undecided
    # (M15: k2.type drops card.k1); a check does (M16: c2.mode drops c1.day_credits); a choice
    # outside the list reads as known (M20: unreadable mode or type not asked).
    pack = SELECTION_PACK
    case = data.draw(gaps.decided_cases(pack, [SELECTION_SEED]))
    run = gaps.run_of(case)
    base = compute(case, [pack], TODAY)
    for rid, field in _selection_fields(pack, case):
        decl = gaps.decl_of(pack, run[rid], field)
        values = gaps.fills(decl, case, base, pack, run)
        original = next(r for r in case["records"] if r["id"] == rid)["fields"][field]
        keep = gaps.must_fill(original, values, gaps.output_dates(base))
        none = _none_pack(run[rid], field) if gaps.absence(decl) == "ask" else pack
        filled_outs = [
            compute(gaps.with_field(case, rid, field, v), [none if v is None else pack], TODAY)
            for v in data.draw(gaps.drawn_fills(values, keep))
        ]
        shown = [gaps.outputs(out) for out in filled_outs]
        changed = {
            key
            for key in set().union(*shown)
            if any((key in s, s.get(key)) != (key in shown[0], shown[0].get(key)) for s in shown)
        }
        alike = set(shown[0]) - changed - {"reasons"}
        always = frozenset.intersection(*(_shown_reasons(out) for out in filled_outs))
        qid = f"{rid}.{field}"
        for state, raw in gaps.gap(decl, run):
            held = compute(gaps.with_field(case, rid, field, raw), [pack], TODAY)
            for out in filled_outs:
                _same_known(held, out)
            q = gaps.question(held, qid)
            if changed or state == "unreadable":
                assert q is not None, (qid, state)
                assert (q.get("record"), q.get("field"), q.get("state")) == (rid, field, state)
                assert held["verdict"]["state"] == "cannot_tell"
            withholds = {t for one in held["questions"] for t in one.get("withholds", [])}
            shown_held = gaps.outputs(held)
            for key in changed - {"reasons"}:
                if key in shown_held:
                    assert qid in gaps.waits_on(held, key), (qid, state, key)
                elif key.startswith("stage:"):
                    assert key.partition(":")[2] in withholds, (qid, state, key)
            for key in alike:
                if f".{rid}" not in key and key not in shown_held:
                    assert key.partition(":")[2] in withholds, (qid, state, key)
            for reason in always:
                if rid not in reason and _of_read_once_check(reason):
                    assert reason in held["verdict"]["reasons"], (qid, state, reason)
            event(f"selection:{qid}:{state}")


def test_the_properties_saw_each_output_kind_known_and_changed():
    # Point 44, non-vacuity: P2 on the F-1 pack, run here, saw each output kind (computed
    # values, windows, stage states and dates, upcoming dates, the reason set) known in C and
    # changed by some drawn fill at least 5 times, so a property that passes only on null
    # outputs fails. Fails if the seeds or the fills never move an output of some kind. The
    # P2 run above fills SEEN (point 44's time budget); run alone, this test runs P2 itself.
    name, pack, seeds = next(p for p in PACKS if p[0] == "f1")
    p2: Any = test_replacing_a_known_value_with_an_unknown_one_withholds_and_asks
    if not any(key[0] == name for key in SEEN):
        p2(name=name, pack=pack, seed=seeds)
    counts = {kind: SEEN[(name, kind)] for kind in OUTPUT_KINDS}
    assert all(n >= 5 for n in counts.values()), counts


@pytest.mark.parametrize(("name", "pack", "seed"), PACKS, ids=IDS)
@UNIT
@given(data=st.data())
def test_every_unknown_is_named(name, pack, seed, data):
    # P4 (point 48): with up to 2 gaps in one record, no engine_gap: reason; every waits_on
    # names a question, a lapse or conflict reason, or a pending:/future: entry; every
    # question's withholds names outputs absent or withheld; the output validates; the
    # verdict is cannot_tell whenever a gap question is open.
    case = data.draw(gaps.decided_cases(pack, seed))
    run = gaps.run_of(case)
    record = data.draw(st.sampled_from(case["records"]))
    names = sorted(record["fields"])
    for field in (
        data.draw(st.lists(st.sampled_from(names), max_size=2, unique=True)) if names else []
    ):
        decl = gaps.decl_of(pack, record["kind"], field)
        _, raw = data.draw(st.sampled_from(gaps.gap(decl, run)))
        case = gaps.with_field(case, record["id"], field, raw)
    out = compute(case, [pack], TODAY)
    assert output_problems(out) == []
    reasons = out["verdict"]["reasons"]
    assert not any(r.startswith("engine_gap:") for r in reasons)
    qids = {q["id"] for q in out["questions"]}
    for key in gaps.withheld(out):
        for entry in gaps.waits_on(out, key):
            ok = entry in qids or entry in reasons or entry.startswith(("pending:", "future:"))
            ok = ok or any(entry in r for r in reasons)
            assert ok, (key, entry)
    shown = gaps.outputs(out)
    held = gaps.withheld(out)
    for q in out["questions"]:
        for target in q.get("withholds", []):
            assert not any(k.endswith(target) and k not in held for k in shown), target
    if gaps.gap_questions(out):
        assert out["verdict"]["state"] == "cannot_tell"


SCALARS = st.one_of(
    st.text(min_size=1, max_size=120),
    st.floats(allow_nan=False, allow_infinity=False),
    st.integers(-(10**6), 10**6),
    st.booleans(),
    st.none(),
)


@pytest.mark.parametrize(("name", "pack", "seed"), PACKS, ids=IDS)
@UNIT
@given(data=st.data())
def test_the_boundary_is_total(name, pack, seed, data):
    # P5 (point 49): any scalar the case schema takes in any declared field: compute returns an
    # output, never an exception; a value that does not read is asked as unreadable:.
    case = copy.deepcopy(data.draw(st.sampled_from(seed)))
    record = data.draw(st.sampled_from(case["records"]))
    decl = data.draw(st.sampled_from(gaps.kinds(pack)[record["kind"]]["fields"]))
    raw = data.draw(SCALARS)
    case = gaps.with_field(case, record["id"], decl["id"], raw)
    out = compute(case, [pack], TODAY)
    from engine.readers import read

    if raw is not None and read(decl, raw, gaps.run_of(case))[0] == "unreadable":
        assert f"unreadable:{record['id']}.{decl['id']}" in out["verdict"]["reasons"]


@pytest.mark.parametrize(
    "fault", ["undeclared_kind", "undeclared_field", "duplicate_id", "bad_prefix"]
)
def test_the_pack_s_structure_faults_raise_case_structure_error(fault):
    # P5 and point 39: the structure faults always raise CaseStructureError, whose message
    # never holds the sent value.
    from engine.path import CaseStructureError
    from engine.path import compute as path_compute
    from tests.support.w2_pack import clock_on

    secret = "Quietvalue"
    case = copy.deepcopy(TOY_SEED)
    if fault == "undeclared_kind":
        case["records"].append(toy.rec("v1", "vessel", name=secret))
    elif fault == "undeclared_field":
        case["records"][0]["fields"]["colour"] = secret
    elif fault == "duplicate_id":
        case["records"].append(toy.rec("c1", "course", code=secret))
    else:
        case["records"].append(toy.rec("k5", "course", code=secret))  # course ids start with c
    with pytest.raises(CaseStructureError) as refused:
        path_compute(case, [toy.pack()], clock_on(TODAY))
    assert secret not in str(refused.value)


@UNIT
@given(st.sampled_from([date(2025, 12, 31), date(2027, 1, 1), date(2025, 3, 3), date(2028, 6, 1)]))
def test_a_rule_not_in_force_is_never_read_as_no_rule(day):
    # P7 (point 50a), toy pack only: toy.lapsing (course.cutoff's optional member, idle.chain's
    # limit) and toy.lapsing_hours are in force in 2026 only. On a day before 2026-01-01 or
    # after 2026-12-31, every output that reads them is withheld with the lapse named.
    case = gaps.shift_dates(TOY_SEED, (day - TODAY).days)
    out = compute(case, [toy.pack()], day)
    for key in ("computed:idle.chain.k1", "computed:course.cutoff.closes.c1"):
        if key in gaps.outputs(out):
            assert gaps.outputs(out)[key] is None, key
            assert any("rule_not_in_force" in w for w in gaps.waits_on(out, key)), key
    event(f"P7:{day.year}")
    assert day < date(2026, 1, 1) or day > date(2026, 12, 31)
