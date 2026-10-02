"""P1 to P5 and P7: specs/step-w/SPEC-W2-UNKNOWN.md points 45 to 49 and 50a, on the toy pack
(tests/support/unknown_toy.py) and the shipped F-1 pack, with the generators of point 44
(tests/support/gaps.py). Section 9: FixedClock at noon UTC, deadline None, derandomized, 30
examples each in tests/unit. Every expected value is the engine's own output on a decided
case: the properties compare outputs across fills, so no expected date is copied.
"""

import copy
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


def _packs() -> list[tuple[str, Rulepack, dict[str, Any]]]:
    return [("toy", toy.pack(), TOY_SEED), ("f1", f1_pack(), F1_SEED)]


PACKS = _packs()
IDS = [name for name, _, _ in PACKS]


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
    case = data.draw(gaps.decided_cases(pack, [seed]))
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
    for fill in data.draw(gaps.drawn_fills(values, keep)):
        filled = copy.deepcopy(case)
        filled["records"].append(
            gaps.with_field({"records": [sibling]}, sibling["id"], field, fill)["records"][0]
        )
        _same_known(held, compute(filled, [pack], TODAY), skip=f".{sibling['id']}")
    event(f"P1:{name}:{state}")


@pytest.mark.parametrize(("name", "pack", "seed"), PACKS, ids=IDS)
@UNIT
@given(data=st.data())
def test_a_list_not_stated_whole_never_shows_what_an_unseen_record_could_change(
    name, pack, seed, data
):
    # P1w (point 45): remove one complete statement; every output known in the result equals
    # its value in C and in C plus one decided sibling of that kind.
    case = data.draw(gaps.decided_cases(pack, [seed]))
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
    case = data.draw(gaps.decided_cases(pack, [seed]))
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
    changed = {
        key
        for out in filled_outs
        for key, value in gaps.outputs(out).items()
        if key != "reasons" and value != gaps.outputs(filled_outs[0]).get(key)
    }
    if changed or state == "unreadable":
        q = gaps.question(held, qid)
        assert q is not None, qid
        assert (q.get("record"), q.get("field"), q.get("state")) == (rid, field, state)
        if state == "unreadable":
            assert q["about"][qid] == raw
        assert held["verdict"]["state"] == "cannot_tell"
        event(f"P2:{name}:changed")
    for key in changed:
        if key in gaps.outputs(held) and key.startswith(("computed:", "window:")):
            assert key in gaps.withheld(held), key
            assert qid in gaps.waits_on(held, key), key


@pytest.mark.parametrize(("name", "pack", "seed"), PACKS, ids=IDS)
@UNIT
@given(data=st.data())
def test_every_unknown_is_named(name, pack, seed, data):
    # P4 (point 48): with up to 2 gaps in one record, no engine_gap: reason; every waits_on
    # names a question, a lapse or conflict reason, or a pending:/future: entry; every
    # question's withholds names outputs absent or withheld; the output validates; the
    # verdict is cannot_tell whenever a gap question is open.
    case = data.draw(gaps.decided_cases(pack, [seed]))
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
    case = copy.deepcopy(seed)
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
