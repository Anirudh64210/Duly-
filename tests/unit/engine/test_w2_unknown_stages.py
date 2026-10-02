"""Regression examples of the stages round: specs/step-w/SPEC-W2-UNKNOWN.md point 51 (R13, R17,
R37 here; R36 is under "not built" in tests/REPORT.json). Today 2026-09-29, lists whole.
"""

from datetime import date

from tests.support.gaps import question
from tests.support.w2_pack import compute, f1_pack, rec
from tests.unit.engine.test_w2_unknown import r6_case, reasons
from tests.unit.engine.test_w2_windows import f1_case

TODAY = date(2026, 9, 29)
PACK = f1_pack()


def test_r13_a_program_with_no_start_is_unknown_never_no_open_items():
    # R13, point 29: p1 in progress with no start date. The stage entry for p1 is emitted with
    # state unknown and waits_on p1.start_date; the question is asked; cannot_tell. Fails if the
    # program stage is dropped and the verdict is no_open_items (U15).
    p1 = rec(
        "p1",
        "program",
        where="us_on_f1",
        level="master",
        stem_list="on_list",
        end_date="2027-05-15",
        state="in_progress",
        full_course_each_term="yes",
        online_within_limit="yes",
    )
    out = compute(f1_case([p1]), [PACK], TODAY)
    stage = [s for s in out["stages"] if s["id"] == "program.p1"]
    assert len(stage) == 1
    assert stage[0]["state"] == "unknown"
    assert "p1.start_date" in stage[0].get("waits_on", [])
    assert question(out, "p1.start_date") is not None
    assert out["verdict"]["state"] == "cannot_tell"


def test_r17_a_not_sure_registration_is_never_done():
    # R17, point 30: mv1 transfer from p1 to p2, registered_on not_sure. done_when never counts
    # not_sure as done (U16): the move.begin_classes window stays among the windows with
    # mv1.registered_on in waits_on. Its close is worked by the engine from p2's start
    # 2027-01-15; this test pins only that it is not dropped and waits.
    p1 = rec(
        "p1",
        "program",
        where="us_on_f1",
        level="bachelor",
        start_date="2022-08-20",
        end_date="2026-12-15",
        state="in_progress",
    )
    p2 = rec("p2", "program", where="us_on_f1", level="master", start_date="2027-01-15")
    mv1 = rec(
        "mv1",
        "move",
        how="transfer",
        from_program="p1",
        to_program="p2",
        i20_issued_on="2026-12-01",
        release_date="2026-12-20",
        registered_on="not_sure",
    )
    out = compute(f1_case([p1, p2, mv1]), [PACK], TODAY)
    found = [
        w for s in out["stages"] for w in s["windows"] if w["id"].startswith("move.begin_classes")
    ]
    assert found
    assert all("mv1.registered_on" in w.get("waits_on", []) for w in found)


def test_r37_a_stem_card_ending_before_it_starts_makes_the_stage_unknown():
    # R37, point 32a: a2 card_end 2026-06-30 before card_start 2026-07-01. The conflict is
    # raised; the stage's state unknown, dates null, waits_on naming the conflict.
    a2 = rec(
        "a2",
        "authorization",
        type="stem_extension",
        program="p1",
        extends="a1",
        basis_program="p1",
        employer="e1",
        decision="approved",
        card_start="2026-07-01",
        card_end="2026-06-30",
    )
    e1 = rec("e1", "employer", name="First", e_verify="yes")
    out = compute(f1_case(r6_case(a2, e1)), [PACK], TODAY)
    stage = [s for s in out["stages"] if s["id"] == "stem.a2"]
    assert len(stage) == 1
    assert stage[0]["state"] == "unknown"
    assert stage[0].get("starts") is None
    assert stage[0].get("ends") is None
    assert stage[0].get("waits_on")
    assert any(r.startswith("conflict:") and r.endswith(".a2") for r in reasons(out))
