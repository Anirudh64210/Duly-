"""Regression examples of the counts round: specs/step-w/SPEC-W2-UNKNOWN.md point 51 (R6, R8,
R18, R19, R20, R23, R27, R28 here; R3, R14, R21, R22, R39 are under "not built" in
tests/REPORT.json). Today 2026-09-29, lists stated whole unless named.

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
