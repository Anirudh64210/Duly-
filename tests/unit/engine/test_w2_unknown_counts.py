"""Regression examples of the counts round: specs/step-w/SPEC-W2-UNKNOWN.md point 51 (R3, R6,
R8, R14, R18 to R23, R27, R28, R38, R39 here; R38's twin is in tests/holdout). Today 2026-09-29,
lists stated whole unless named.

Hand working shared by every row: a1's card runs 2026-06-01 to 2027-05-31. Days from 2026-06-01
to 2026-09-29 inclusive: June 30, July 31, August 31, September 29, so 121. The 90th day
without a job (opt.unemployment_limit_days, 90) is 2026-06-01 plus 89 days: June gives 30
(to Jun 30), July 31 (to Jul 31, day 61), so day 90 is 2026-08-29.
"""

from datetime import date, timedelta
from typing import Any

import pytest

from tests.support.gaps import question
from tests.support.w2_pack import compute, f1_pack, items, rec
from tests.unit.engine.test_w2_unknown import r6_case, reasons
from tests.unit.engine.test_w2_windows import f1_case

TODAY = date(2026, 9, 29)
PACK = f1_pack()
COUNT = "unemployment.opt_card.a1"


def test_the_shared_working():
    assert (date(2026, 9, 29) - date(2026, 6, 1)).days + 1 == 121
    assert date(2026, 6, 1) + timedelta(days=89) == date(2026, 8, 29)


def test_r6_a_card_with_no_type_withholds_nothing_of_a1_s_count():
    # R6 (C, review 3 finding 2): a3 for p1 (card 2026-06-01 to 2026-12-31) with no type. The
    # counter groups by record, so a3 could join only its own group: a1's count 121, limit day
    # 2026-08-29 and the at-or-over judgement all kept; question a3.type. Fails if a3's gap
    # withholds a1's group (U1).
    a3 = rec(
        "a3",
        "authorization",
        program="p1",
        decision="approved",
        card_start="2026-06-01",
        card_end="2026-12-31",
    )
    out = compute(f1_case(r6_case(a3)), [PACK], TODAY)
    shown = items(out)
    assert shown[COUNT]["value"] == 121
    assert shown[COUNT + ".limit_day"]["value"] == "2026-08-29"
    assert "unemployment.opt_card.at_or_over_limit.a1" in reasons(out)
    q = question(out, "a3.type")
    assert q is not None
    assert q.get("state") == "absent"


def job(**fields: Any) -> dict[str, Any]:
    return rec("w1", "work", under="a1", **fields)


def test_r8_40_hours_with_an_open_end_is_counted_and_waits_for_no_limit_day():
    # R8, 40 hours, end left out (not_yet): w1 from 2026-07-01 covers every day from Jul 1. Days
    # without a job: Jun 1 to Jun 30, 30. The limit day would be the 90th idle day, which comes
    # only after the job ends: pending:w1.end in waits_on, nothing asked.
    out = compute(f1_case(r6_case(job(start="2026-07-01", hours_per_week=40))), [PACK], TODAY)
    shown = items(out)
    assert shown[COUNT]["value"] == 30
    assert shown[COUNT + ".limit_day"]["value"] is None
    assert "pending:w1.end" in shown[COUNT + ".limit_day"].get("waits_on", [])
    assert question(out, "w1.end") is None


@pytest.mark.parametrize(
    ("hours", "prefix"),
    [
        ("40", "unreadable"),
        ("forty", "unreadable"),
        (True, "unreadable"),
        (None, "missing"),
        ("not_sure", "undecided"),
    ],
)
def test_r8_unknown_hours_withhold_the_count(hours, prefix):
    # R8: with hours unknown, whether w1 qualifies (20 hours, opt.min_hours_per_week) is
    # unknown, so the count is 30 or 121: value and limit day null, no at-or-over, the reason by
    # state (point 35), the value as entered in about. Fails if unknown hours read as no job
    # (U5) or "40" reads as 40 (R8).
    fields: dict[str, Any] = {"start": "2026-07-01"}
    if hours is not None:
        fields["hours_per_week"] = hours
    out = compute(f1_case(r6_case(job(**fields))), [PACK], TODAY)
    shown = items(out)
    assert shown[COUNT]["value"] is None
    assert shown[COUNT + ".limit_day"]["value"] is None
    assert "w1.hours_per_week" in shown[COUNT].get("waits_on", [])
    assert "unemployment.opt_card.at_or_over_limit.a1" not in reasons(out)
    assert f"{prefix}:w1.hours_per_week" in reasons(out)
    if prefix == "unreadable":
        assert question(out, "w1.hours_per_week")["about"]["w1.hours_per_week"] == hours


@pytest.mark.parametrize(
    ("end", "expect"), [("not_sure", "held"), ("31/08/2026", "unreadable"), ("2026-08-31", 59)]
)
def test_r18_the_job_end(end, expect):
    # R18: w1 from 2026-07-01 at 40 hours. End 2026-08-31: idle days are Jun 1 to Jun 30 (30)
    # and Sep 1 to Sep 29 (29), 59. The 90th idle day: 30 in June, 29 in September reach
    # 2026-09-29 as day 59, 31 more: Sep 30 is day 60, Oct 1 to Oct 30 days 61 to 90, so
    # 2026-10-30. not_sure: withheld (U6). "31/08/2026": withheld, unreadable.
    out = compute(
        f1_case(r6_case(job(start="2026-07-01", end=end, hours_per_week=40))), [PACK], TODAY
    )
    shown = items(out)
    if expect == 59:
        assert 30 + 29 == 59
        assert date(2026, 9, 30) + timedelta(days=30) == date(2026, 10, 30)
        assert shown[COUNT]["value"] == 59
        assert shown[COUNT + ".limit_day"]["value"] == "2026-10-30"
        return
    assert shown[COUNT]["value"] is None
    assert "w1.end" in shown[COUNT].get("waits_on", [])
    if expect == "unreadable":
        assert "unreadable:w1.end" in reasons(out)


@pytest.mark.parametrize("start", [None, "not_sure"])
def test_r19_an_unknown_start_withholds_the_count(start):
    # R19: R18 with end 2026-08-31 and no start, or start not_sure: the job's days are unknown,
    # so the count is between 59 and 121: withheld, never 121 with at-or-over (U7).
    fields: dict[str, Any] = {"end": "2026-08-31", "hours_per_week": 40}
    if start is not None:
        fields["start"] = start
    out = compute(f1_case(r6_case(job(**fields))), [PACK], TODAY)
    shown = items(out)
    assert shown[COUNT]["value"] is None
    assert "w1.start" in shown[COUNT].get("waits_on", [])
    assert "unemployment.opt_card.at_or_over_limit.a1" not in reasons(out)


def test_r20_an_end_before_its_start_is_a_conflict_and_withholds_the_count():
    # R20: start 2026-07-01, end 2026-06-15 (before it). Conflict span_order.w1 asked; count
    # withheld (path.py read it as no days).
    out = compute(
        f1_case(r6_case(job(start="2026-07-01", end="2026-06-15", hours_per_week=40))),
        [PACK],
        TODAY,
    )
    q = question(out, "span_order.w1")
    assert q is not None
    assert q.get("state") == "conflict"
    assert items(out)[COUNT]["value"] is None


def test_r23_a_list_not_stated_whole_withholds_the_stem_count():
    # R23, point 20: the authorization list not stated whole. stem.extensions.all counts STEM
    # cards: an unentered card could count, so null with complete.authorization in waits_on
    # (shown today as 0).
    case = f1_case(r6_case())
    del case["complete"]["authorization"]
    out = compute(case, [PACK], TODAY)
    shown = items(out)["stem.extensions.all"]
    assert shown["value"] is None
    assert "complete.authorization" in shown.get("waits_on", [])


def test_r27_a_link_to_the_wrong_kind_is_unreadable():
    # R27: w1 under "p1", a program where the pack allows only an authorization. Unreadable
    # (point 41), and a1's count withheld (w1 could be a1's job).
    out = compute(
        f1_case(r6_case(rec("w1", "work", under="p1", start="2026-07-01", hours_per_week=40))),
        [PACK],
        TODAY,
    )
    assert "unreadable:w1.under" in reasons(out)
    assert items(out)[COUNT]["value"] is None


def test_r28_toy_an_hours_rule_not_in_force_withholds_the_count():
    # R28, toy pack: idle.chain filters on toy.lapsing_hours, in force in 2026 only. On
    # 2027-03-01 the rule has no row: the count is withheld with the lapse named (point 23),
    # never counted as if every job qualified.
    from tests.support.unknown_toy import case, pack
    from tests.support.unknown_toy import rec as toy_rec

    day = date(2027, 3, 1)
    k1 = toy_rec(
        "k1",
        "card",
        type="plain",
        course="c1",
        decision="approved",
        card_start="2027-01-04",
        card_end="2027-06-30",
    )
    c1 = toy_rec("c1", "course", level="mid", start="2026-09-01")
    w1 = toy_rec("w1", "job", under="k1", start="2027-01-04", hours_per_week=30)
    out = compute(case([c1, k1, w1], day), [pack()], day)
    shown = items(out)["idle.chain.k1"]
    assert shown["value"] is None
    assert any("rule_not_in_force" in w for w in shown.get("waits_on", []))


def test_r3_a_job_with_no_card_keeps_the_other_job_s_report_and_withholds_the_count():
    # R3 (O1), points 13, 17 and 21: w1 under a1 from 2026-07-01, w2 from 2026-08-01 with no
    # `under`. w1's report window: 2026-07-01 plus 10 days (opt.report_within_days) is
    # 2026-07-11, kept. Question w2.under (absent). w2 could be a1's job, and its span
    # (2026-08-01 on, end not yet) covers counted days of a1's card, so a1's count is withheld
    # with w2.under in waits_on. Fails if w2's gap drops w1's window (U1) or reads w2 as no job.
    w1 = job(start="2026-07-01", hours_per_week=40)
    w2 = rec("w2", "work", start="2026-08-01", hours_per_week=40)
    out = compute(f1_case(r6_case(w1, w2)), [PACK], TODAY)
    assert date(2026, 7, 1) + timedelta(days=10) == date(2026, 7, 11)
    shown = items(out)
    assert shown["opt_job_start.report.opens.w1"]["value"] == "2026-07-01"
    assert shown["opt_job_start.report.closes.w1"]["value"] == "2026-07-11"
    q = question(out, "w2.under")
    assert q is not None
    assert q.get("state") == "absent"
    assert shown[COUNT]["value"] is None
    assert "w2.under" in shown[COUNT].get("waits_on", [])


def r14_move(**fields: Any) -> list[dict[str, Any]]:
    """R14: R6's case plus p2 doctorate from 2026-08-25 and mv1, change of level to p2,
    release 2026-08-24."""
    p2 = rec("p2", "program", where="us_on_f1", level="doctorate", start_date="2026-08-25")
    mv1 = rec("mv1", "move", how="change_of_level", to_program="p2", release_date="2026-08-24")
    mv1["fields"].update(fields)
    return r6_case(p2, mv1)


def test_r14_a_move_with_no_from_program_withholds_the_card_end_and_the_count():
    # R14, points 16 and 21: mv1.from_program left out. Whether mv1 leaves a1's program is
    # unknown, so opt_post.a1's end and a1's count are withheld with mv1.from_program in
    # waits_on (shown before W2-U as current to 2027-05-31, 121, limit day 2026-08-29,
    # at-or-over).
    out = compute(f1_case(r14_move()), [PACK], TODAY)
    stage = [s for s in out["stages"] if s["id"] == "opt_post.a1"]
    assert len(stage) == 1
    assert stage[0].get("ends") is None
    assert "mv1.from_program" in stage[0].get("waits_on", [])
    shown = items(out)
    assert shown[COUNT]["value"] is None
    assert "mv1.from_program" in shown[COUNT].get("waits_on", [])
    assert "unemployment.opt_card.at_or_over_limit.a1" not in reasons(out)


def test_r14_with_from_program_p1_the_card_ends_on_the_release_day():
    # R14 with from_program p1: a1 ends on the release date 2026-08-24 (the day before p2
    # starts 2026-08-25 is the same day). Days from 2026-06-01 to 2026-08-24: June 30, July 31,
    # August 24, so 85, under the 90-day limit, so no at-or-over.
    out = compute(f1_case(r14_move(from_program="p1")), [PACK], TODAY)
    assert 30 + 31 + 24 == 85
    assert date(2026, 8, 25) - timedelta(days=1) == date(2026, 8, 24)
    stage = [s for s in out["stages"] if s["id"] == "opt_post.a1"]
    assert [s.get("ends") for s in stage] == ["2026-08-24"]
    assert items(out)[COUNT]["value"] == 85
    assert "unemployment.opt_card.at_or_over_limit.a1" not in reasons(out)


def test_r21_a_not_sure_return_withholds_every_count_and_check_that_reads_the_trip():
    # R21, points 21 and 32: t1 left 2026-06-15, returned_on not_sure, personal. With a known
    # return (2026-06-30) the count is 121 with limit day 2026-08-29 (the shared working; the
    # trip changes neither), and trip.t1 is done. not_sure: a1's count and limit day withheld
    # with t1.returned_on in waits_on (shown before W2-U as 121 and 2026-08-29), no at-or-over;
    # the trip stage unknown; the trip checks (trip.back_within_absence_limit,
    # trip.signature_for_opt_return, trip.job_on_return) named in the question's withholds;
    # undecided:t1.returned_on.
    def run(returned_on: str) -> dict[str, Any]:
        t1 = rec("t1", "trip", left_on="2026-06-15", returned_on=returned_on, purpose="personal")
        return compute(f1_case(r6_case(t1)), [PACK], TODAY)

    known = items(run("2026-06-30"))
    assert known[COUNT]["value"] == 121
    assert known[COUNT + ".limit_day"]["value"] == "2026-08-29"
    out = run("not_sure")
    shown = items(out)
    for key in (COUNT, COUNT + ".limit_day"):
        assert shown[key]["value"] is None
        assert "t1.returned_on" in shown[key].get("waits_on", [])
    assert "unemployment.opt_card.at_or_over_limit.a1" not in reasons(out)
    trip = [s for s in out["stages"] if s["id"] == "trip.t1"]
    assert [s["state"] for s in trip] == ["unknown"]
    assert "t1.returned_on" in trip[0].get("waits_on", [])
    q = question(out, "t1.returned_on")
    assert q is not None
    for check in (
        "trip.back_within_absence_limit.t1",
        "trip.signature_for_opt_return.t1",
        "trip.job_on_return.t1",
    ):
        assert check in q.get("withholds", [])
    assert "undecided:t1.returned_on" in reasons(out)


def test_r22_a_program_with_no_level_withholds_every_cpt_group_it_could_join():
    # R22, points 19 and 24: p1 bachelor (2019-08-20 to 2023-05-15), p2 (2022-08-20 to
    # 2024-05-15, level left out), a1 full-time CPT for p2, approved, card 2023-01-01 to
    # 2023-12-31. With p2 a master the CPT groups at the master level count 365 days (2023 is
    # not a leap year) and 12 months. Level left out: a1 could join the group of any level, so
    # each such group is emitted withheld, value null, waits_on p2.level (point 24: a withheld
    # count is still emitted), never dropped; p2.level asked. Fails today: no CPT item at all.
    p1 = rec(
        "p1",
        "program",
        where="us_on_f1",
        level="bachelor",
        start_date="2019-08-20",
        end_date="2023-05-15",
        state="completed",
    )
    p2 = rec(
        "p2",
        "program",
        where="us_on_f1",
        start_date="2022-08-20",
        end_date="2024-05-15",
        state="completed",
    )
    a1 = rec(
        "a1",
        "authorization",
        type="cpt",
        program="p2",
        time="full_time",
        decision="approved",
        card_start="2023-01-01",
        card_end="2023-12-31",
    )
    master = compute(
        f1_case([p1, dict(p2, fields=dict(p2["fields"], level="master")), a1]), [PACK], TODAY
    )
    assert (date(2023, 12, 31) - date(2023, 1, 1)).days + 1 == 365
    assert items(master)["cpt.full_time_days_at_level.master"]["value"] == 365
    assert items(master)["cpt.full_time_months_at_level.master"]["value"] == 12
    out = compute(f1_case([p1, p2, a1]), [PACK], TODAY)
    for counter in ("cpt.full_time_days_at_level.", "cpt.full_time_months_at_level."):
        groups = [
            i
            for i in out["computed"]
            if i["id"].startswith(counter) and not i["id"].endswith(".limit_day")
        ]
        assert groups, (counter, sorted(items(out)))
        for g in groups:
            assert g["value"] is None, g
            assert "p2.level" in g.get("waits_on", []), g
    assert question(out, "p2.level") is not None


@pytest.mark.parametrize("start", ["20260803", "2026-W32-1", "2026W321"])
def test_r38_basic_and_week_dates_are_unreadable(start):
    # R38, points 3 and 41 (the visible row; its twin is in tests/holdout): R18's case with w1
    # start in the basic or week form. Python 3.12's date.fromisoformat reads each as
    # 2026-08-03 (week 32's Monday); the reader matches ^\d{4}-\d{2}-\d{2}$ first, so each is
    # unreadable:w1.start, never that day, and a1's count is withheld (U27).
    assert date.fromisoformat("2026-W32-1") == date(2026, 8, 3)
    out = compute(
        f1_case(r6_case(job(start=start, end="2026-08-31", hours_per_week=40))), [PACK], TODAY
    )
    assert "unreadable:w1.start" in reasons(out)
    assert question(out, "w1.start")["about"]["w1.start"] == start
    assert items(out)[COUNT]["value"] is None


def test_r39_toy_a_counted_record_whose_span_ends_on_an_empty_first_withholds_its_group():
    # R39, point 22a, toy pack: a counter over courses whose span ends on the course's last
    # card end (a `first`). With card k1 (2026-02-02 to 2026-03-31) c1 counts 2026-01-05 to
    # 2026-03-31: Jan 27, Feb 28, Mar 31, so 86. With no card the `first` chooses nothing (N):
    # the group is still emitted, value null, the judgement days.course.span_not_known.c1
    # raised and named in waits_on, never a count shown and understated.
    from tests.support import unknown_toy as toy

    counter = {
        "id": "days.course",
        "calculator": "sum_of_days",
        "scope": {"of": {"record": "course"}, "group": "record"},
        "span": {"starts": {"fact": "this.start"}, "ends": toy.LAST_CARD_END},
        "limit_rule": "toy.bar",
        "rule_ids": ["toy.bar"],
    }
    pack = toy.pack(counters=[counter])
    c1 = toy.rec("c1", "course", level="mid", start="2026-01-05", end="2026-12-18")
    k1 = toy.rec(
        "k1",
        "card",
        type="plain",
        course="c1",
        decision="approved",
        card_start="2026-02-02",
        card_end="2026-03-31",
    )
    assert 27 + 28 + 31 == 86
    assert items(compute(toy.case([c1, k1], TODAY), [pack], TODAY))["days.course.c1"]["value"] == 86
    out = compute(toy.case([c1], TODAY), [pack], TODAY)
    shown = items(out)["days.course.c1"]
    assert shown["value"] is None
    assert "days.course.span_not_known.c1" in shown.get("waits_on", [])
    assert "days.course.span_not_known.c1" in reasons(out)
