"""Regression examples of the reads round: specs/step-w/SPEC-W2-UNKNOWN.md point 51 (R1, R2, R4,
R5, R7, R9 to R12, R15, R16, R24, R26, R29 to R35, R40 here), and one test per engine finding of
reviews/w2-unknown.md that is not a row of its own (findings 2, 4, 5, 12 and 14). Today
2026-09-29, lists stated whole unless named, on the shipped F-1 pack unless the row says toy
pack. Every date is worked by hand beside its assertion; a value in the SPEC's table is a claim
checked here, never copied.

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
    confirmed_on="2026-09-29",
    employer="e1",
    under="a2",
    start="2026-07-01",
    end="2026-08-02",
    hours_per_week=40,
)
W2 = rec(
    "w2",
    "work",
    confirmed_on="2026-09-29",
    employer="e2",
    under="a2",
    start="2026-08-03",
    hours_per_week=40,
)


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
    w3 = rec(
        "w3", "work", confirmed_on="2026-09-29", under="a2", start="2026-09-01", hours_per_week=40
    )
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
    w3 = rec(
        "w3",
        "work",
        confirmed_on="2026-09-29",
        employer="e2",
        under="a2",
        start=start,
        hours_per_week=40,
    )
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
        confirmed_on="2026-09-29",
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
    w3 = rec("w3", "work", confirmed_on="2026-09-29", hours_per_week=40, **fields)
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

    w1a = rec("w1", "work", confirmed_on="2026-09-29", employer="Secretname", start="2026-07-01")
    w1b = rec("w1", "work", confirmed_on="2026-09-29", start="2026-08-01")
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


@pytest.mark.parametrize("end", ["not_sure", None])
def test_the_file_by_window_of_a_next_opt_waits_on_the_program_end_too(end):
    # Points 31, 33 and 34, the P2 draw the engine lane named (window:opt.file_by.p1 waiting
    # only on future:opt_post.dso_on). p1 a master in progress, no OPT card, its end not sure
    # or left out. opt_post.p1 is a next stage whose filing closes rest on p1.end_date, so it
    # is shown in state unknown (point 31), and its window opt.file_by.p1 (dso_on to dso_on
    # plus a rule amount) is null and waits on every gap it rests on (point 34): the bound
    # dso_on, never entered (future:opt_post.dso_on), and p1.end_date, which is asked. With an
    # end entered (2026-12-18), the same case shows opt_post.p1 next and file_by.p1 waiting
    # only on future:opt_post.dso_on (probed on HEAD 5340950). Fails if the window names the
    # future entry alone, or if the stage or the window is dropped on the guess.
    p1 = masters("2026-12-18")
    p1["fields"].update(start_date="2024-08-20", state="in_progress")
    if end is None:
        p1["fields"].pop("end_date")
    else:
        p1["fields"]["end_date"] = end
    out = compute(f1_case([p1]), [PACK], TODAY)
    assert "p1.end_date" in {q["id"] for q in out["questions"]}
    stages = {s["id"]: s for s in out["stages"]}
    assert "opt_post.p1" in stages
    assert stages["opt_post.p1"]["state"] == "unknown"
    shown = {w["id"]: w for w in stages["opt_post.p1"]["windows"]}
    assert "opt.file_by.p1" in shown
    file_by = shown["opt.file_by.p1"]
    assert (file_by["opens"], file_by["closes"]) == (None, None)
    assert {"p1.end_date", "future:opt_post.dso_on"} <= set(file_by.get("waits_on", []))


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


def test_r15_a_not_sure_card_end_withholds_grace():
    # R15, points 15 and 33: grace for p1 (R6's case) runs from the day after a1's card end.
    # card_end not_sure: grace.p1 withheld, dates null, waits_on a1.card_end (shown before
    # W2-U as 2026-05-16 to 2026-07-14, done). card_end 2027-05-31: grace opens the next day,
    # 2027-06-01, and its 60 days (the grace period) end on day 60: June gives 30 (to
    # 2027-06-30), July 30 more, so 2027-07-30.
    p1, a1 = r6_case()
    a1["fields"]["card_end"] = "not_sure"
    held = compute(f1_case([p1, a1]), [PACK], TODAY)
    grace = [s for s in held["stages"] if s["id"] == "grace.p1"]
    assert len(grace) == 1
    assert grace[0]["state"] == "unknown"
    assert grace[0].get("starts") is None
    assert grace[0].get("ends") is None
    assert "a1.card_end" in grace[0].get("waits_on", [])
    known = compute(f1_case(r6_case()), [PACK], TODAY)
    assert date(2027, 6, 1) + timedelta(days=59) == date(2027, 7, 30)
    grace = [s for s in known["stages"] if s["id"] == "grace.p1"]
    assert [(s["starts"], s["ends"]) for s in grace] == [("2027-06-01", "2027-07-30")]


def r16_case(filed_on: str, *changes: dict[str, Any]) -> dict[str, Any]:
    """R16: p1 master ending 2026-05-15; a1 opt_post_completion for p1, dso_on 2026-04-01,
    decision pending, filed_on as given."""
    p1 = masters("2026-05-15")
    p1["fields"]["start_date"] = "2024-08-20"
    a1 = rec(
        "a1",
        "authorization",
        type="opt_post_completion",
        program="p1",
        dso_on="2026-04-01",
        filed_on=filed_on,
        decision="pending",
    )
    return f1_case([p1, a1, *changes])


def apply_window(out: dict[str, Any]) -> list[tuple[Any, Any, list[str]]]:
    return [
        (w["opens"], w["closes"], list(w.get("waits_on", [])))
        for w in windows_named(out, "opt.apply_window")
        if w["id"].endswith(".a1")
    ]


R16_EC1 = ec(
    "ec1",
    change="extension",
    requested_on="2026-03-01",
    old_end="2026-05-15",
    new_end="2026-08-15",
    granted_on="2026-03-10",
)


def test_r16_a_a_change_that_could_apply_withholds_the_filing_window():
    # R16 case A, points 26 and 27: the window is read from p1's end as it stood on the filing
    # day. ec1 moves the end to 2026-08-15 from 2026-03-10. A filing before 2026-03-10 reads
    # 2026-05-15: 90 days back (14 to May 1, 30 to Apr 1, 31 to Mar 1, 15 more) is 2026-02-14,
    # 60 on (16 to May 31, 30 to Jun 30, 14 more) is 2026-07-14 (the 2026-03-01 filing below).
    # A filing on or after it could read 2026-08-15, so with filed_on not_sure: withheld,
    # waits_on a1.filed_on. Fails if "as of" falls back to today (U10).
    assert date(2026, 5, 15) - timedelta(days=90) == date(2026, 2, 14)
    held = apply_window(compute(r16_case("not_sure", R16_EC1), [PACK], TODAY))
    assert held
    assert all(o is None and c is None and "a1.filed_on" in w for o, c, w in held), held
    early = apply_window(compute(r16_case("2026-03-01", R16_EC1), [PACK], TODAY))
    assert [(o, c) for o, c, _ in early] == [("2026-02-14", "2026-07-14")]


@pytest.mark.parametrize("filed_on", ["not_sure", "2026-03-01", "2026-05-01", "2026-07-01"])
def test_r16_b_with_no_change_record_the_window_is_the_same_on_every_filing_day(filed_on):
    # R16 case B, point 26, review finding 1: no end_date_change and the list stated whole, so
    # no change record could apply and p1's end is 2026-05-15 on every day. The window is
    # 2026-02-14 to 2026-07-14 (worked in case A) whatever the filing day, so it is shown,
    # known, with no waits_on, filed_on not_sure included. Fails today: path.py `_when3`
    # returns absent for an unknown day without asking whether a change could apply.
    shown = apply_window(compute(r16_case(filed_on), [PACK], TODAY))
    assert shown == [("2026-02-14", "2026-07-14", [])], shown


def test_r16_c_a_not_sure_grant_day_asks_the_change_never_the_program_end():
    # R16 case C, point 27: as A with ec1.granted_on not_sure. The question is ec1.granted_on
    # (state undecided), never p1.end_date, which the person did enter.
    ec1 = dict(R16_EC1, fields=dict(R16_EC1["fields"], granted_on="not_sure"))
    out = compute(r16_case("not_sure", ec1), [PACK], TODAY)
    q = question(out, "ec1.granted_on")
    assert q is not None
    assert q.get("state") == "undecided"
    assert question(out, "p1.end_date") is None
    assert not any(r.endswith(":p1.end_date") for r in reasons(out))


def test_r16_c_with_a_known_filing_day_a_not_sure_grant_day_withholds_the_window():
    # R16 case C with filed_on 2026-05-01 known, points 26 and 27, review w2-unknown finding 2
    # (U11). ec1 moves p1's end from 2026-05-15 to 2026-08-15 from its grant day. With
    # granted_on not_sure the grant could fall on or before the filing day, so the end read
    # as of 2026-05-01 could be 2026-08-15 (90 days back: 30 to Jul 16, 30 to Jun 16, 30 to
    # May 17, so 2026-05-17; 60 on: 30 to Sep 14, 30 to Oct 14, so 2026-10-14), or after it,
    # so 2026-05-15 (2026-02-14 to 2026-07-14, worked in case A). opt.apply_window.a1 is
    # withheld and waits on ec1.granted_on, which is asked. Fails if an undated change is
    # skipped (U11): the window is then shown from 2026-05-15.
    assert date(2026, 8, 15) - timedelta(days=90) == date(2026, 5, 17)
    assert date(2026, 8, 15) + timedelta(days=60) == date(2026, 10, 14)
    ec1 = dict(R16_EC1, fields=dict(R16_EC1["fields"], granted_on="not_sure"))
    out = compute(r16_case("2026-05-01", ec1), [PACK], TODAY)
    held = apply_window(out)
    assert held
    assert all(o is None and c is None and "ec1.granted_on" in w for o, c, w in held), held
    assert question(out, "ec1.granted_on") is not None


def test_r24_an_unreadable_part_time_figure_neither_raises_nor_passes_the_hours_check():
    # R24, points 32 and 34: p1 master in progress (2025-08-20 to 2027-05-15); a1
    # opt_pre_completion part time, approved, card 2026-06-01 to 2026-08-31; w7 under a1 from
    # 2026-06-01 with hours "30" (a string). "30" is not 30 (point 41), so whether w7 keeps
    # within the part-time hours is unknown: `unreadable:w7.hours_per_week` with "30" in
    # about; the conflict opt_pre.part_time_hours.w7 not raised (30 as a number raises it, the
    # control below) and not shown as passed: the question names it in withholds. Fails if
    # "30" reads as 30, or as no hours.
    p1 = rec(
        "p1",
        "program",
        where="us_on_f1",
        level="master",
        stem_list="on_list",
        start_date="2025-08-20",
        end_date="2027-05-15",
        state="in_progress",
    )
    a1 = rec(
        "a1",
        "authorization",
        type="opt_pre_completion",
        program="p1",
        time="part_time",
        decision="approved",
        card_start="2026-06-01",
        card_end="2026-08-31",
    )

    def run(hours: Any) -> dict[str, Any]:
        w7 = rec(
            "w7",
            "work",
            confirmed_on="2026-09-29",
            under="a1",
            start="2026-06-01",
            hours_per_week=hours,
        )
        return compute(f1_case([p1, a1, w7]), [PACK], TODAY)

    assert "conflict:opt_pre.part_time_hours.w7" in reasons(run(30))
    out = run("30")
    assert "unreadable:w7.hours_per_week" in reasons(out)
    assert "conflict:opt_pre.part_time_hours.w7" not in reasons(out)
    q = question(out, "w7.hours_per_week")
    assert q is not None
    assert q["about"]["w7.hours_per_week"] == "30"
    assert "opt_pre.part_time_hours.w7" in q.get("withholds", []), q


def test_r29_an_unreadable_release_date_withholds_the_move_span():
    # R29, points 16 and 28: mv1 (transfer p1 to p2, I-20 issued 2026-12-01) with release_date
    # "2026-13-40" (month 13). The move stage and its begin_classes window withheld with
    # waits_on mv1.release_date (shown before W2-U as from i20_issued_on alone); asked as
    # unreadable with the value as entered. Fails if the unreadable member is passed over (U8).
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
        release_date="2026-13-40",
    )
    out = compute(f1_case([p1, p2, mv1]), [PACK], TODAY)
    stage = [s for s in out["stages"] if s["id"] == "move.mv1"]
    assert len(stage) == 1
    assert stage[0]["state"] == "unknown"
    assert stage[0].get("starts") is None
    assert "mv1.release_date" in stage[0].get("waits_on", [])
    for w in windows_named(out, "move.begin_classes"):
        assert w["opens"] is None
        assert "mv1.release_date" in w.get("waits_on", [])
    assert "unreadable:mv1.release_date" in reasons(out)
    assert question(out, "mv1.release_date")["about"]["mv1.release_date"] == "2026-13-40"


def test_r33_toy_a_lapsed_optional_member_withholds_the_date():
    # R33, toy pack, points 10 and 16: course.cutoff closes on the earliest of the course end
    # and today plus toy.lapsing (optional, in force in 2026 only). On 2026-09-29 the member is
    # 2026-09-29 + 40 (1 to Sep 30, 31 to Oct 31, 8 more) = 2026-11-08, before the end
    # 2027-06-30, so it closes 2026-11-08. On 2027-03-01 the rule has no row: the close is
    # withheld with the lapse named, never the end 2027-06-30 (U19).
    from tests.support.unknown_toy import case, pack
    from tests.support.unknown_toy import rec as toy_rec

    c1 = toy_rec("c1", "course", level="mid", start="2026-09-01", end="2027-06-30")
    assert date(2026, 9, 29) + timedelta(days=40) == date(2026, 11, 8)
    shown = items(compute(case([c1], TODAY), [pack()], TODAY))["course.cutoff.closes.c1"]
    assert shown["value"] == "2026-11-08"
    day = date(2027, 3, 1)
    held = items(compute(case([c1], day), [pack()], day))["course.cutoff.closes.c1"]
    assert held["value"] is None
    assert any("rule_not_in_force" in w for w in held.get("waits_on", []))


A2_PENDING = rec(
    "a2",
    "authorization",
    type="stem_extension",
    program="p1",
    extends="a1",
    basis_program="p1",
    decision="pending",
    dso_on="2026-09-01",
    filed_on="2026-09-10",
)


@pytest.mark.parametrize("statement", ["one_record", "after_today"])
def test_r34_a_one_record_or_future_statement_never_states_the_whole_kind(statement):
    # R34, point 14, review finding 2 (U23): R6's case plus a2 stem_extension extending a1.
    # `complete` holds only authorization:p1 (whole only the cards linked to p1, and
    # stem.extensions.all selects by type, not by a same_as to p1), or complete.authorization
    # dated 2026-10-15, after today 2026-09-29, which is ignored. Either way an unlisted STEM
    # card could make the count 2: stem.extensions.all withheld, waits_on
    # complete.authorization, and the list asked. Fails today: it shows 1.
    case = f1_case(r6_case(A2_PENDING))
    if statement == "one_record":
        del case["complete"]["authorization"]
        case["complete"]["authorization:p1"] = {"on": TODAY.isoformat()}
    else:
        case["complete"]["authorization"] = {"on": "2026-10-15"}
    out = compute(case, [PACK], TODAY)
    shown = items(out)["stem.extensions.all"]
    assert shown["value"] is None, shown
    assert "complete.authorization" in shown.get("waits_on", [])
    assert question(out, "complete.authorization") is not None
    assert (
        items(compute(f1_case(r6_case(A2_PENDING)), [PACK], TODAY))["stem.extensions.all"]["value"]
        == 1
    )


def test_r35_an_open_move_list_withholds_the_card_end_then_the_move_ends_it():
    # R35, points 14 and 15: R6's case plus mv1 (a transfer from p1 to p2, a master at another
    # school, so no change of level; release 2026-12-01). With the
    # move list not stated whole, an unlisted move could end a1 sooner: opt_post.a1's end
    # withheld, waits_on complete.move. Stated whole: mv1 ends the card, and the pack's two
    # sources name different days for a transfer (opt.ends_on_release_date, guidance, the
    # release date 2026-12-01, before the card end 2027-05-31; the regulation names none), so
    # the pack steps back to the DSO: the end waits on the judgement opt_post.end_by_source.a1,
    # raised, and no longer on complete.move.
    p2 = rec("p2", "program", where="us_on_f1", level="master", start_date="2027-01-11")
    mv1 = rec(
        "mv1",
        "move",
        how="transfer",
        from_program="p1",
        to_program="p2",
        i20_issued_on="2026-11-15",
        release_date="2026-12-01",
    )
    case = f1_case(r6_case(p2, mv1))
    del case["complete"]["move"]
    held = [s for s in compute(case, [PACK], TODAY)["stages"] if s["id"] == "opt_post.a1"]
    assert len(held) == 1
    assert held[0].get("ends") is None
    assert "complete.move" in held[0].get("waits_on", [])
    out = compute(f1_case(r6_case(p2, mv1)), [PACK], TODAY)
    whole = [s for s in out["stages"] if s["id"] == "opt_post.a1"]
    assert len(whole) == 1
    assert "complete.move" not in whole[0].get("waits_on", [])
    assert "opt_post.end_by_source.a1" in whole[0].get("waits_on", [])
    assert "opt_post.end_by_source.a1" in reasons(out)
    assert date(2026, 12, 1) < date(2027, 5, 31)


def test_finding_4_toy_present_on_an_absent_ask_field_is_unknown_and_asked():
    # Review finding 4, points 2 and 24, toy pack: months.level counts only cards whose course
    # has `online` present (only_if). c1.online is an `ask` flag. True or false: the only_if is
    # T and months.level.mid is 5 (k1 2026-02-02 to 2026-07-31: Feb 2 to Jul 2 is 5 whole
    # months, Jul 2 to Jul 31 is not a sixth). Left out, `present` is U (its fill domain is
    # every value and NONE), so the count is still emitted, value null, waits_on c1.online,
    # and c1.online asked as absent. Fails today: the item vanishes and nothing asks (U21).
    from tests.support import unknown_toy as toy
    from tests.support.gaps import with_field
    from tests.unit.engine.test_w2_unknown_props import TOY_SEED

    for flag in (True, False):
        out = compute(with_field(TOY_SEED, "c1", "online", flag), [toy.pack()], TODAY)
        assert items(out)["months.level.mid"]["value"] == 5
    out = compute(with_field(TOY_SEED, "c1", "online", None), [toy.pack()], TODAY)
    shown = items(out).get("months.level.mid")
    assert shown is not None, sorted(items(out))
    assert shown["value"] is None
    assert "c1.online" in shown.get("waits_on", [])
    q = question(out, "c1.online")
    assert q is not None
    assert q.get("state") == "absent"


def test_finding_5_a_not_sure_happened_date_that_could_conflict_is_asked():
    # Review finding 5, point 32: journey J01 with p1.conferred_on not_sure. The fill
    # 2026-12-01 (after today 2026-09-29) raises conflict:p1.conferred_on.after_today, so the
    # gap changes an output (point 8): the question p1.conferred_on (state undecided) and the
    # reason undecided:p1.conferred_on, beside the judgement p1.conferred_on.not_sure. Fails
    # today: only the judgement.
    from engine import path
    from engine.rulepack import load_all
    from tests.support.gaps import with_field
    from tests.support.records_case import CLOCK
    from tests.unit.acceptance.test_journeys import j01

    after = path.compute(with_field(j01(), "p1", "conferred_on", "2026-12-01"), load_all(), CLOCK)
    assert "conflict:p1.conferred_on.after_today" in after["verdict"]["reasons"]
    out = path.compute(with_field(j01(), "p1", "conferred_on", "not_sure"), load_all(), CLOCK)
    q = question(out, "p1.conferred_on")
    assert q is not None
    assert q.get("state") == "undecided"
    assert "undecided:p1.conferred_on" in out["verdict"]["reasons"]
    assert "p1.conferred_on.not_sure" in out["verdict"]["reasons"]
    assert out["verdict"]["state"] == "cannot_tell"


def test_finding_12_a_question_withholds_every_output_that_waits_on_it():
    # Review finding 12, point 34: D4 without w2 (w1 2026-07-01 to 2026-08-02, w3 from
    # 2026-09-01 with end not_sure). w1's concluding evaluation and the stem_job_end.w1 stage
    # wait on w3.end as well as stem_job_end.w3, so the question w3.end lists each stage and
    # window whose waits_on names it. Fails today: withholds holds only stem_job_end.w3.
    w3 = rec(
        "w3",
        "work",
        confirmed_on="2026-09-29",
        employer="e2",
        under="a2",
        start="2026-09-01",
        end="not_sure",
        hours_per_week=40,
    )
    out = compute(f1_case(stem_jobs(W1, w3)), [PACK], TODAY)
    q = question(out, "w3.end")
    assert q is not None
    waiting = {s["id"] for s in out["stages"] if "w3.end" in s.get("waits_on", [])}
    waiting |= {
        w["id"] for s in out["stages"] for w in s["windows"] if "w3.end" in w.get("waits_on", [])
    }
    assert "stem_job_end.evaluation_final.w1" in waiting
    assert waiting <= set(q.get("withholds", [])), (waiting, q.get("withholds"))


@pytest.mark.parametrize(
    ("condition", "conflict"), [("joined_after_left", True), ("left_after_joined", False)]
)
def test_finding_14_toy_a_known_past_day_against_not_yet_is_decided(condition, conflict):
    # Review finding 14, point 7, toy pack: c1 joined 2026-01-05, left_on left out (not_yet,
    # NOT_YET). NOT_YET is later than every day up to today 2026-09-29, and 2026-01-05 is on or
    # before today, so "joined_on after left_on" is F (the check's conflict is raised) and
    # "left_on after joined_on" is T (none raised). Neither is pending. Fails today for the
    # first: path.py `_compare_dates` leaves NOT_YET on the right as pending.
    from tests.support.unknown_toy import case, check_pack
    from tests.support.unknown_toy import rec as toy_rec

    left, right = ("joined_on", "left_on")
    if condition == "left_after_joined":
        left, right = right, left
    cond = {"field": f"this.{left}", "after": {"fact": f"this.{right}"}}
    c1 = toy_rec("c1", "course", start="2026-01-05", joined_on="2026-01-05")
    out = compute(case([c1], TODAY), [check_pack(cond)], TODAY)
    assert date(2026, 1, 5) <= TODAY
    assert ("conflict:tree.c1" in reasons(out)) is conflict
    assert question(out, "c1.left_on") is None


@pytest.mark.parametrize(
    "condition",
    [
        {"field": "this.online", "present": True},
        {"field": "this.online", "present": False},
        {"not": {"field": "this.online", "present": True}},
    ],
    ids=["present_true", "present_false", "not_present_true"],
)
def test_finding_1_toy_a_check_s_present_on_an_absent_ask_flag_is_unknown_and_asked(condition):
    # Review w2-unknown finding 1, points 2 and 32 (U21b), toy pack: a check on c1 whose holds
    # is `present` over c1.online, an `ask` flag, with c1.online left out. Its fill domain is
    # true, false and NONE (point 2), so `present` is U: the check raises neither its conflict
    # nor its judgement, and c1.online is asked (state absent), as not_sure already is
    # (state undecided). No date. Fails today: path.py `holds_alone` reads the absent flag as
    # NONE, so present: true raises conflict:tree.c1 and the other two pass quietly unasked.
    from tests.support.gaps import with_field
    from tests.support.unknown_toy import check_pack
    from tests.unit.engine.test_w2_unknown_props import TOY_SEED

    pack = check_pack(condition)
    for raw, state in ((None, "absent"), ("not_sure", "undecided")):
        out = compute(with_field(TOY_SEED, "c1", "online", raw), [pack], TODAY)
        assert not any("tree.c1" in r or "c1.tree" in r for r in reasons(out)), reasons(out)
        q = question(out, "c1.online")
        assert q is not None, raw
        assert q.get("state") == state
        assert out["verdict"]["state"] == "cannot_tell"
