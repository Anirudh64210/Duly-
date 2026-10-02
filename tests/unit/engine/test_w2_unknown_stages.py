"""Regression examples of the stages round: specs/step-w/SPEC-W2-UNKNOWN.md point 51 (R13, R17,
R36, R37 here, and review w2-unknown finding 8). Today 2026-09-29, lists whole.
"""

from datetime import date, timedelta
from typing import Any

import pytest

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


def stem_next(out: dict[str, Any]) -> list[dict[str, Any]]:
    return [s for s in out["stages"] if s["id"] == "stem.a1"]


def test_r36_a_not_sure_card_end_keeps_the_stem_next_stage_unknown():
    # R36, points 31 and 33, review finding 3: R6's case with a1.card_end not_sure. The STEM
    # next stage after a1 is never dropped on a guess: it is emitted in state unknown with
    # waits_on a1.card_end, and a1.card_end is asked. Its filing window closes on the card end
    # (stem.apply_window: 90 days before it to the end), so both closes are U and the stage is
    # kept, not closed. Fails today: no stem.a1 stage at all.
    p1, a1 = r6_case()
    a1["fields"]["card_end"] = "not_sure"
    out = compute(f1_case([p1, a1]), [PACK], TODAY)
    stage = stem_next(out)
    assert len(stage) == 1, [s["id"] for s in out["stages"]]
    assert stage[0]["state"] == "unknown"
    assert "a1.card_end" in stage[0].get("waits_on", [])
    q = question(out, "a1.card_end")
    assert q is not None
    assert q.get("state") == "undecided"
    assert out["verdict"]["state"] == "cannot_tell"


def test_r36_a_field_only_a_stem_record_would_supply_is_future_never_asked():
    # R36, point 31: with card_end 2027-05-31 the stage is next. Its filing window opens 90
    # days before the card end: 2027-05-31 back 31 to Apr 30, 30 to Mar 31, 29 more is
    # 2027-03-02. stem.file_by rests on the STEM card's dso_on, a field of the virtual record
    # no entered record supplies: named future:stem.dso_on, never asked, no blocker.
    out = compute(f1_case(r6_case()), [PACK], TODAY)
    assert date(2027, 5, 31) - timedelta(days=90) == date(2027, 3, 2)
    stage = stem_next(out)
    assert [s["state"] for s in stage] == ["next"]
    apply = [w for w in stage[0]["windows"] if w["id"] == "stem.apply_window.a1"]
    assert [(w["opens"], w["closes"]) for w in apply] == [("2027-03-02", "2027-05-31")]
    file_by = [w for w in stage[0]["windows"] if w["id"] == "stem.file_by.a1"]
    assert file_by
    assert "future:stem.dso_on" in file_by[0].get("waits_on", [])
    assert question(out, "stem.dso_on") is None
    assert question(out, "a1.dso_on") is None
    assert not any("stem.dso_on" in r for r in reasons(out))


@pytest.mark.parametrize(
    "window",
    [
        "stem.validation_1",
        "stem.validation_2",
        "stem.validation_3",
        "stem.validation_4",
        "stem.evaluation_final",
    ],
)
def test_finding_8_the_stem_next_stage_s_report_windows_wait_on_the_future_card_start(window):
    # Review finding 8, points 31 and 33: R6's case. Every STEM card has its validation reports
    # and concluding evaluation, dated from the card's start, which no entered record supplies
    # yet. So each window of stem.a1 is null with waits_on future:stem.card_start, as
    # stem.evaluation_12_month already is; a null with no waits_on would say "does not apply".
    # Fails today: path.py gives the virtual record the host's id, so the `first` pinned by
    # this.id same_as outer.id finds a1 (not a stem_extension) and gives none.
    out = compute(f1_case(r6_case()), [PACK], TODAY)
    found = [w for s in stem_next(out) for w in s["windows"] if w["id"] == f"{window}.a1"]
    assert len(found) == 1
    assert found[0]["opens"] is None
    assert found[0]["closes"] is None
    assert "future:stem.card_start" in found[0].get("waits_on", []), found[0]
