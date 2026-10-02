"""Regression examples of the reads round: specs/step-w/SPEC-W2-UNKNOWN.md point 51 (R1, R2, R4,
R5, R7, R9 to R12, R26, R30, R31, R32, R40 here; the rest of this file's list is under "not
built" in tests/REPORT.json for the next attempt). Today 2026-09-29, lists stated whole unless
named, on the shipped F-1 pack unless the row says toy pack. Every date is worked by hand
beside its assertion; a value in the SPEC's table is a claim checked here, never copied.

CaseStructureError is imported inside the test (section 9).
"""

from datetime import date, timedelta
from typing import Any

import pytest

from tests.support.gaps import question
from tests.support.w2_pack import compute, f1_pack, items, rec, windows_named
from tests.unit.engine.test_w2_windows import f1_case, masters, opt_card

TODAY = date(2026, 9, 29)
PACK = f1_pack()


def r6_case(*extra: dict[str, Any]) -> list[dict[str, Any]]:
    """Point 51's "R6's case": p1 master (us_on_f1, 2024-08-20 to 2026-05-15, completed), a1
    opt_post_completion for p1 (approved, card 2026-06-01 to 2027-05-31), no job."""
    p1 = masters("2026-05-15")
    p1["fields"]["start_date"] = "2024-08-20"
    a1 = opt_card("2026-04-01", "2026-04-10", "2026-06-01", "2027-05-31")
    return [p1, a1, *extra]


def reasons(out: dict[str, Any]) -> list[str]:
    return list(out["verdict"]["reasons"])


def stem_jobs(*jobs: dict[str, Any]) -> list[dict[str, Any]]:
    """review 3's `_stem_case("e1")`: p1, a1, the STEM card a2 (employer e1, from 2026-07-01),
    employers e1 and e2."""
    a2 = rec(
        "a2",
        "authorization",
        type="stem_extension",
        program="p1",
        extends="a1",
        basis_program="p1",
        employer="e1",
        decision="approved",
        dso_on="2026-05-01",
        filed_on="2026-05-10",
        card_start="2026-07-01",
        card_end="2028-06-30",
    )
    e1 = rec("e1", "employer", name="First", e_verify="yes")
    e2 = rec("e2", "employer", name="Second", e_verify="yes")
    return [*r6_case(), a2, e1, e2, *jobs]


W1 = rec(
    "w1",
    "work",
    employer="e1",
    under="a2",
    start="2026-07-01",
    end="2026-08-02",
    hours_per_week=40,
)
W2 = rec("w2", "work", employer="e2", under="a2", start="2026-08-03", hours_per_week=40)


def report_window(out: dict[str, Any], record: str) -> set[tuple[Any, Any]]:
    return {
        (w["opens"], w["closes"])
        for s in out["stages"]
        for w in s["windows"]
        if w["id"].endswith("." + record) and "report" in w["id"]
    }


def test_r2_a_gap_in_one_stem_job_keeps_the_other_job_s_windows():
    # R2 (S1): w3 under a2 from 2026-09-01 with no employer. w2's report window: w2 starts
    # 2026-08-03; 10 days on (stem.report_change_within_days, (f)(12)(ii)(A)) is 2026-08-13.
    # Question w3.employer, state absent. Fails if w3's gap drops w2's window (U1).
    w3 = rec("w3", "work", under="a2", start="2026-09-01", hours_per_week=40)
    out = compute(f1_case(stem_jobs(W1, W2, w3)), [PACK], TODAY)
    assert date(2026, 8, 3) + timedelta(days=10) == date(2026, 8, 13)
    assert ("2026-08-03", "2026-08-13") in report_window(out, "w2")
    q = question(out, "w3.employer")
    assert q is not None
    assert (q.get("record"), q.get("field"), q.get("state")) == ("w3", "employer", "absent")
    assert out["verdict"]["state"] == "cannot_tell"


@pytest.mark.parametrize("start", ["2026-13-40", "08/03/2026"])
def test_r4_an_unreadable_start_is_asked_with_the_value_as_entered(start):
    # R4 (S2): w3 with e2 and start "2026-13-40" (month 13) or "08/03/2026" (not ISO). w2's
    # window 2026-08-03 to 2026-08-13 kept (worked in R2). Point 35: `unreadable:w3.start`,
    # not `missing:`; point 34: about holds the value as entered.
    w3 = rec("w3", "work", employer="e2", under="a2", start=start, hours_per_week=40)
    out = compute(f1_case(stem_jobs(W1, W2, w3)), [PACK], TODAY)
    assert ("2026-08-03", "2026-08-13") in report_window(out, "w2")
    assert "unreadable:w3.start" in reasons(out)
    assert "missing:w3.start" not in reasons(out)
    q = question(out, "w3.start")
    assert q is not None
    assert q.get("state") == "unreadable"
    assert q["about"]["w3.start"] == start


# A job's own concluding evaluation, dated from its end, in the stem_job_end stage of the F-1
# pack (parameters.yaml, window stem_job_end.evaluation_final). These tests first named a window
# "stem.final_evaluation" the pack never had, so they found none (a fault of this lane, not the
# engine's) and R7's "null" row passed on an empty list.
FINAL_EVALUATION = "stem_job_end.evaluation_final"


def test_r5_a_decided_witness_keeps_w1_s_concluding_evaluation():
    # R5 (D4): w2 from 2026-08-03 with end left out (not_yet), w3 from 2026-09-01 with end
    # not_sure. w1's concluding evaluation: w1 ends 2026-08-02, 10 days on
    # (stem.evaluation_due_days) is 2026-08-12. w2 is a decided witness of a next job, so w3's
    # unknown end changes nothing (point 7, exists). `undecided:w3.end` and the judgement
    # w3.end.not_sure. Fails if exists reads the undecided w3 as no witness at all.
    w3 = rec(
        "w3",
        "work",
        employer="e2",
        under="a2",
        start="2026-09-01",
        end="not_sure",
        hours_per_week=40,
    )
    out = compute(f1_case(stem_jobs(W1, W2, w3)), [PACK], TODAY)
    assert date(2026, 8, 2) + timedelta(days=10) == date(2026, 8, 12)
    found = [
        (w["opens"], w["closes"])
        for w in windows_named(out, FINAL_EVALUATION)
        if w["id"].endswith(".w1")
    ]
    assert ("2026-08-02", "2026-08-12") in found, found
    assert "undecided:w3.end" in reasons(out)
    assert "w3.end.not_sure" in reasons(out)


@pytest.mark.parametrize(
    ("end", "expect"),
    [
        (None, "kept"),
        ("2026-07-31", "null"),
        ("not_sure", "waits"),
        ("2026-13-40", "unreadable"),
    ],
)
def test_r7_the_w3_end_table(end, expect):
    # R7: w1 2026-07-01 to 2026-08-02, w3 from 2026-07-15. End left out (not_yet): w3 still
    # works after w1 ends, so w1's concluding evaluation 2026-08-02 to 2026-08-12 (2 + 10).
    # 2026-07-31: w3 ended before w1 did; no evaluation of w1 is due on its own end, null and
    # no waits_on (does not apply, worked from known values). not_sure: null with waits_on
    # w3.end. "2026-13-40": the same, and `unreadable:w3.end`.
    fields: dict[str, Any] = {"employer": "e2", "under": "a2", "start": "2026-07-15"}
    if end is not None:
        fields["end"] = end
    w3 = rec("w3", "work", hours_per_week=40, **fields)
    out = compute(f1_case(stem_jobs(W1, w3)), [PACK], TODAY)
    found = [w for w in windows_named(out, FINAL_EVALUATION) if w["id"].endswith(".w1")]
    assert found, [w["id"] for s in out["stages"] for w in s["windows"]]
    if expect == "kept":
        assert [(w["opens"], w["closes"]) for w in found] == [("2026-08-02", "2026-08-12")]
        return
    assert all(w["closes"] is None for w in found)
    if expect == "null":
        assert all(not w.get("waits_on") for w in found)
        return
    assert found
    assert all("w3.end" in w.get("waits_on", []) for w in found)
    if expect == "unreadable":
        assert "unreadable:w3.end" in reasons(out)


def ec(rid: str, **fields: Any) -> dict[str, Any]:
    return rec(rid, "end_date_change", program="p1", **fields)


def test_r9_an_end_date_change_with_no_change_is_asked():
    # R9 (M9): ec1 for p1, requested 2026-03-01, old end 2026-05-15, new 2026-12-15, no change.
    # Whether the check end_date_change.asked_before_end applies rests on ec1.change.
    ec1 = ec("ec1", requested_on="2026-03-01", old_end="2026-05-15", new_end="2026-12-15")
    out = compute(f1_case([masters("2026-05-15"), ec1]), [PACK], TODAY)
    assert "missing:ec1.change" in reasons(out)
    q = question(out, "ec1.change")
    assert q is not None
    assert q.get("state") == "absent"


def test_r10_a_conflict_on_one_change_and_a_gap_on_another_both_stand():
    # R10 (M16): ec2 change extension requested 2026-06-01 against old end 2026-05-15:
    # 2026-06-01 is after 2026-05-15, so the check is F and the conflict is raised. ec1's gap is
    # still asked (M16: one record's conflict never hides another's gap).
    ec1 = ec("ec1", requested_on="2026-03-01", old_end="2026-05-15", new_end="2026-12-15")
    ec2 = ec(
        "ec2",
        change="extension",
        requested_on="2026-06-01",
        old_end="2026-05-15",
        new_end="2026-12-15",
    )
    out = compute(f1_case([masters("2026-05-15"), ec1, ec2]), [PACK], TODAY)
    assert date(2026, 6, 1) > date(2026, 5, 15)
    assert "conflict:end_date_change.asked_before_end.ec2" in reasons(out)
    assert "missing:ec1.change" in reasons(out)


def test_r11_an_unreadable_value_nothing_reads_is_still_asked():
    # R11 (M18), point 36: an unreadable value is asked whether or not anything reads it. A
    # choice outside its list (p1.full_course_each_term "maybe_each") is unreadable.
    p1 = masters("2026-05-15")
    p1["fields"]["full_course_each_term"] = "maybe_each"
    out = compute(f1_case([p1]), [PACK], TODAY)
    assert "unreadable:p1.full_course_each_term" in reasons(out)


def test_r12_a_type_outside_the_list_withholds_what_the_type_decides():
    # R12 (M20): a1.type "opt_postt". `unreadable:a1.type`; no opt_post stage for a1, and no
    # count over a1 shown as known (both rest on the type).
    p1, a1 = r6_case()
    a1["fields"]["type"] = "opt_postt"
    out = compute(f1_case([p1, a1]), [PACK], TODAY)
    assert "unreadable:a1.type" in reasons(out)
    shown = items(out)
    count = shown.get("unemployment.opt_card.a1")
    assert count is None or (count["value"] is None and count.get("waits_on"))
    assert not any(s["id"] == "opt_post.a1" and s["state"] == "current" for s in out["stages"])


def test_r26_two_records_with_one_id_are_a_structure_fault():
    # R26, point 39: path.py:137 lets the second replace the first. CaseStructureError, a
    # ValueError, whose message never holds what was sent.
    from engine.path import CaseStructureError
    from engine.path import compute as path_compute
    from tests.support.w2_pack import clock_on

    w1a = rec("w1", "work", employer="Secretname", start="2026-07-01")
    w1b = rec("w1", "work", start="2026-08-01")
    with pytest.raises(CaseStructureError) as refused:
        path_compute(f1_case([*r6_case(), w1a, w1b]), [PACK], clock_on(TODAY))
    assert "Secretname" not in str(refused.value)


def test_r30_a_not_sure_program_end_withholds_every_opt_post_window():
    # R30: p1.end_date not_sure. `undecided:p1.end_date`; every opt_post window that dates from
    # the program end (opt.apply_window: 90 days before to 60 after) null with p1.end_date in
    # waits_on.
    p1, a1 = r6_case()
    p1["fields"]["end_date"] = "not_sure"
    out = compute(f1_case([p1, a1]), [PACK], TODAY)
    assert "undecided:p1.end_date" in reasons(out)
    apply = windows_named(out, "opt.apply_window")
    assert apply
    for w in apply:
        assert w["opens"] is None
        assert w["closes"] is None
        assert "p1.end_date" in w.get("waits_on", [])


def test_r31_a_filing_not_yet_made_raises_no_conflict_while_the_window_is_open():
    # R31: p1 ends 2026-08-15; a1 dso_on 2026-08-01, filed_on and decision left out (not_yet).
    # The apply window closes 60 days after the end: 16 days reach Aug 31, 30 reach Sep 30, so
    # 2026-10-14, after today. Filing Y against a day after today is pending (point 7): no
    # conflict, no question about the filing, the window shown.
    p1 = masters("2026-08-15")
    a1 = rec("a1", "authorization", type="opt_post_completion", program="p1", dso_on="2026-08-01")
    out = compute(f1_case([p1, a1]), [PACK], TODAY)
    assert date(2026, 8, 15) + timedelta(days=60) == date(2026, 10, 14)
    assert "conflict:opt_post.filed_in_window.a1" not in reasons(out)
    assert question(out, "a1.filed_on") is None
    closes = [w["closes"] for w in windows_named(out, "opt.apply_window")]
    assert "2026-10-14" in closes


def test_r31_twin_once_the_window_closed_the_check_is_decided():
    # Twin: p1 ends 2026-05-15; the window closed 2026-07-14 (16 + 30 + 14 days), before today.
    # NOT_YET is later than 2026-07-14 (on or before today), so the filing is not in the window:
    # the check is decided F and its conflict raised, as the pack words it.
    p1 = masters("2026-05-15")
    a1 = rec("a1", "authorization", type="opt_post_completion", program="p1", dso_on="2026-04-01")
    out = compute(f1_case([p1, a1]), [PACK], TODAY)
    assert date(2026, 5, 15) + timedelta(days=60) == date(2026, 7, 14)
    assert "conflict:opt_post.filed_in_window.a1" in reasons(out)


def test_r32_toy_same_as_between_two_none_links_chooses_nothing():
    # R32, toy pack: a selection by same_as between two links that are both none (course.follows
    # left out on c1 and c2): N same_as N is F (point 7, U22), so nothing is chosen and exists is
    # F, so the check is a conflict.
    from tests.support.unknown_toy import case, check_pack
    from tests.support.unknown_toy import rec as toy_rec

    cond = {
        "exists": {
            "record": "course",
            "where": [
                {"field": "this.follows", "same_as": "outer.follows"},
                {"field": "this.id", "differs_from": "outer.id"},
            ],
        }
    }
    c1 = toy_rec("c1", "course", start="2026-01-05")
    c2 = toy_rec("c2", "course", start="2026-02-05")
    out = compute(case([c1, c2], TODAY), [check_pack(cond)], TODAY)
    assert "conflict:tree.c1" in reasons(out)
    assert "conflict:tree.c2" in reasons(out)


def test_r40_a_field_nothing_unsettled_reads_is_not_asked():
    # R40, point 8: p1.school_name left out and e1 (no STEM card names it) with e_verify
    # not_sure: no question for either; e1.e_verify.not_sure raised (point 35); no undecided:
    # reason, so these two do not make the verdict cannot_tell.
    e1 = rec("e1", "employer", name="First", e_verify="not_sure")
    out = compute(f1_case(r6_case(e1)), [PACK], TODAY)
    assert question(out, "p1.school_name") is None
    assert question(out, "e1.e_verify") is None
    assert "e1.e_verify.not_sure" in reasons(out)
    assert not any(r.startswith("undecided:") for r in reasons(out))
    assert "missing:p1.school_name" not in reasons(out)


def test_r1_no_new_plan_window_on_a_guess():
    # R1 (review 1): a2 with no employer; w1 with e1 2026-07-01 to 2026-08-02, w2 with e2 from
    # 2026-08-03. Whether w2 is a new employer rests on a2.employer: no new-plan window is shown
    # for w2, question a2.employer (absent) withholding the stem_job_start entries it holds.
    records = stem_jobs(W1, W2)
    for r in records:
        if r["id"] == "a2":
            r["fields"].pop("employer")
    out = compute(f1_case(records), [PACK], TODAY)
    q = question(out, "a2.employer")
    assert q is not None
    assert q.get("state") == "absent"
    assert any(h.startswith("stem_job_start.") for h in q.get("withholds", []))
    assert not any(s["id"] == "stem_job_start.w2" for s in out["stages"])
    assert out["verdict"]["state"] == "cannot_tell"
