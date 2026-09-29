"""Hidden tests for engine/f1.py. A second set of cases, never shown to the engine lane.

Specified in specs/phase-2/SPEC.md, "The engine": "Rules of the house", "Computed items",
"Counting days", "Cap-gap", and "Verdict inputs". Every expected date and count was
worked out by hand. The working is beside it.
"""

import random
from datetime import date, timedelta
from typing import Any

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from engine.rulepack import validate_pack
from tests.support.f1_pack import (
    BLOCKED,
    OPERATIVE,
    SHIFTED,
    TIME_ZONE,
    answered_yes,
    build_pack,
    cap_gap,
    case_problems,
    clock_on,
    contract_problems,
    count_days,
    dated_on_the_day,
    ead,
    items,
    job,
    pack_dict,
    periods_answered,
    refuse_placeholders,
    rule_value,
    values,
    with_block,
    with_changes,
    with_the_about_asked,
)


def run(case: dict[str, Any], today: date, **pack_changes: Any) -> dict[str, Any]:
    assert case_problems(case) == [], "the test case itself must match the case contract"
    pack = build_pack(today, **pack_changes)
    clock = clock_on(today)

    def compute(sent: dict[str, Any]) -> dict[str, Any]:
        return f1.compute_f1(f1.parse_case(refuse_placeholders(sent), clock), pack, clock)

    # SPEC-resolutions.md, point 7: an answer is sent with the about it was asked with.
    return compute(with_the_about_asked(dated_on_the_day(case, clock), compute))


# Case H1: a bachelor's program that ends in December, OPT across a leap February.
H1_TODAY = date(2024, 3, 1)
# SPEC-resolutions.md, point 22: the end of the period, 2024-02-29, was reported
# (periods_answered). No test of this case is about that answer.
CASE_H1: dict[str, Any] = periods_answered(
    {
        "program_end_date": "2023-12-15",
        "time_zone": TIME_ZONE,
        "confirmations": answered_yes(),
        "degree_level": "bachelor",
        "documents_count": 2,
        "cpt_full_time_days": 364,
        "opt": ead("2023-11-01", "2023-11-20", "2024-01-08", "2025-01-07"),
        "stem": None,
        "employment": [job("2024-02-01", "2024-02-29", hours=20)],
        "cap_gap": None,
    }
)

# Case H2: a doctorate, OPT then STEM, with a part-time period in the middle.
H2_TODAY = date(2026, 9, 2)
# SPEC-resolutions.md, points 20 to 22 (periods_answered): the ends of the first two
# periods were reported, the third period (from 2025-10-01, on the STEM card) is not with a
# new employer, and the reports dated before the day of the case were made. No test of
# this case is about those answers.
CASE_H2: dict[str, Any] = periods_answered(
    {
        "program_end_date": "2024-08-16",
        "time_zone": TIME_ZONE,
        "confirmations": answered_yes(),
        "degree_level": "doctorate",
        "documents_count": 11,
        "cpt_full_time_days": 0,
        "opt": ead("2024-06-03", "2024-06-20", "2024-08-30", "2025-08-29"),
        "stem": ead("2025-06-10", "2025-07-01", "2025-08-30", "2027-08-29"),
        "employment": [
            job("2024-09-09", "2025-03-31"),
            job("2025-03-15", "2025-09-30", hours=15),
            job("2025-10-01", None, hours=32),
        ],
        "cap_gap": None,
    }
)


def test_case_h1_every_value():
    out = run(CASE_H1, H1_TODAY)
    got = values(out)
    # 2023-12-15 minus 90 days: back 15 to Nov 30, back 30 to Oct 31 (45), back 31 to
    # Sep 30 (76), back 14 to Sep 16 (90).
    assert got["opt.apply_window_opens"] == "2023-09-16"
    # Plus 60 days: 16 to Dec 31, 31 to Jan 31 (47), 13 to Feb 13 (60).
    assert got["opt.apply_window_closes"] == "2024-02-13"
    assert got["opt.latest_start"] == "2024-02-13"
    # 2023-11-01 plus 30 days: 29 to Nov 30, 1 to Dec 1.
    assert got["opt.file_by"] == "2023-12-01"
    # December 2023 plus 14 months is February 2025. The 15th exists.
    assert got["opt.complete_by"] == "2025-02-15"
    assert got["unemployment.limit"] == 90
    # Window 2024-01-08 through 2024-03-01: Jan 8 through 31 is 24 days, February 2024
    # has 29, March 1 is 1. Total 54. The period covers February at 20 hours, which is
    # at the threshold: 29 days employed. Used: 54 less 29.
    assert got["unemployment.days_used"] == 25
    # 90 minus 25.
    assert got["unemployment.days_remaining"] == 65
    assert got["employment.days_under_hours"] == 0
    assert got["employment.periods_not_reported"] == 0
    # final_end 2025-01-07 plus 60 days: 24 to Jan 31, 28 to Feb 28 (52, 2025 is not a
    # leap year), 8 to Mar 8 (60).
    assert got["grace.ends"] == "2025-03-08"
    # Plus 30 days: 24 to Jan 31, 6 to Feb 6.
    assert items(out)["grace.ends"]["alternates"] == [
        {"regime": BLOCKED, "legal_status": "enjoined", "value": "2025-02-06"}
    ]
    assert got["cpt.full_time_days_used"] == 364
    # opt.ead_end 2025-01-07 minus 90 days: back 7 to Dec 31, back 31 to Nov 30 (38),
    # back 30 to Oct 31 (68), back 22 to Oct 9 (90). Checked only where shown.
    assert got.get("stem.apply_window_opens", "2024-10-09") == "2024-10-09"
    assert got.get("stem.apply_window_closes", "2025-01-07") == "2025-01-07"
    # 364 full-time CPT days is one under the bar. Nothing else is open.
    assert out["verdict"] == {"state": "no_open_items", "reasons": []}
    assert out["scope"] == {"documents_count": 2, "rules_checked_on": "2024-03-01"}
    assert contract_problems(out) == []


def test_case_h2_dates():
    got = values(run(CASE_H2, H2_TODAY))
    # 2024-08-16 minus 90 days: back 16 to Jul 31, back 31 to Jun 30 (47), back 30 to
    # May 31 (77), back 13 to May 18 (90).
    assert got["opt.apply_window_opens"] == "2024-05-18"
    # Plus 60 days: 15 to Aug 31, 30 to Sep 30 (45), 15 to Oct 15 (60).
    assert got["opt.apply_window_closes"] == "2024-10-15"
    assert got["opt.latest_start"] == "2024-10-15"
    # 2024-06-03 plus 30 days: 27 to Jun 30, 3 to Jul 3.
    assert got["opt.file_by"] == "2024-07-03"
    # August 2024 plus 14 months is October 2025.
    assert got["opt.complete_by"] == "2025-10-16"
    # opt.ead_end 2025-08-29 minus 90 days: back 29 to Jul 31, back 31 to Jun 30 (60),
    # back 30 to May 31 (90).
    assert got["stem.apply_window_opens"] == "2025-05-31"
    assert got["stem.apply_window_closes"] == "2025-08-29"
    # 2025-06-10 plus 60 days: 20 to Jun 30, 31 to Jul 31 (51), 9 to Aug 9 (60).
    assert got["stem.file_by"] == "2025-08-09"
    # stem.ead_start 2025-08-30 plus 6 months: February 2026 has 28 days, so Saturday
    # 2026-02-28. Ten business days: Mar 2 (1), 3 (2), 4 (3), 5 (4), 6 (5), 9 (6),
    # 10 (7), 11 (8), 12 (9), 13 (10).
    assert got["stem.validation_1_due"] == "2026-03-13"
    # Plus 12 months: Sunday 2026-08-30. Aug 31 (1), Sep 1 (2), 2 (3), 3 (4), 4 (5),
    # Monday Sep 7 is Labor Day, 8 (6), 9 (7), 10 (8), 11 (9), 14 (10).
    assert got["stem.validation_2_due"] == "2026-09-14"
    # Plus 18 months: Sunday 2027-02-28. Mar 1 (1), 2 (2), 3 (3), 4 (4), 5 (5), 8 (6),
    # 9 (7), 10 (8), 11 (9), 12 (10).
    assert got["stem.validation_3_due"] == "2027-03-12"
    # Plus 24 months: Monday 2027-08-30. Aug 31 (1), Sep 1 (2), 2 (3), 3 (4), Monday
    # Sep 6 is Labor Day, 7 (5), 8 (6), 9 (7), 10 (8), 13 (9), 14 (10).
    assert got["stem.validation_4_due"] == "2027-09-14"
    # 2026-08-30 plus 10 days: 1 to Aug 31, 9 to Sep 9.
    assert got["stem.evaluation_12_month_due"] == "2026-09-09"
    # stem.ead_end 2027-08-29 plus 10 days: 2 to Aug 31, 8 to Sep 8.
    assert got["stem.final_evaluation_due_from_ead_end"] == "2027-09-08"


def test_case_h2_counts_grace_and_verdict():
    out = run(CASE_H2, H2_TODAY)
    got = values(out)
    assert got["unemployment.limit"] == 150
    # Window 2024-08-30 through 2026-09-02. Uncovered: Aug 30 and 31, Sep 1 through 8,
    # 10 days. The first period covers 2024-09-09 through 2025-03-31. The 15 hour period
    # alone covers 2025-04-01 through 2025-09-30: 30 + 31 + 30 + 31 + 31 + 30 = 183 days.
    # The 32 hour period covers 2025-10-01 through today.
    assert got["unemployment.days_used"] == 10
    assert got["employment.days_under_hours"] == 183
    # 150 minus 10. Days under hours are not added.
    assert got["unemployment.days_remaining"] == 140
    assert got["employment.periods_not_reported"] == 0
    # final_end 2027-08-29 plus 60 days: 2 to Aug 31, 30 to Sep 30 (32), 28 to Oct 28.
    assert got["grace.ends"] == "2027-10-28"
    # Plus 30 days: 2 to Aug 31, 28 to Sep 28.
    assert items(out)["grace.ends"]["alternates"] == [
        {"regime": BLOCKED, "legal_status": "enjoined", "value": "2027-09-28"}
    ]
    # The days under hours are a question for the DSO, and that wins over the two items
    # that fall due within 14 days.
    assert out["verdict"] == {"state": "talk_to_dso", "reasons": ["hours_under_threshold"]}
    assert contract_problems(out) == []


def test_case_h2_with_the_middle_period_at_the_threshold():
    jobs = [
        job("2024-09-09", "2025-03-31"),
        job("2025-03-15", "2025-09-30", hours=20),
        job("2025-10-01", None, hours=32),
    ]
    out = run(with_changes(CASE_H2, employment=jobs), H2_TODAY)
    got = values(out)
    assert got["employment.days_under_hours"] == 0
    assert got["unemployment.days_used"] == 10
    # Today is 2026-09-02. Through 2026-09-16: the 12 month evaluation on Sep 9 and the
    # second validation report on Sep 14.
    assert out["verdict"]["state"] == "needs_you"
    assert set(out["verdict"]["reasons"]) == {
        "stem.evaluation_12_month_due",
        "stem.validation_2_due",
    }


def test_case_h2_under_a_pack_with_other_numbers():
    out = run(CASE_H2, H2_TODAY, values=SHIFTED)
    got = values(out)
    # Thresholds 21 before stem.ead_start 2025-08-30 and 25 from it. The 15 hour period
    # is under both: 183 days, as before. The 32 hour period is above both.
    assert got["employment.days_under_hours"] == 183
    assert got["unemployment.days_used"] == 10
    assert got["unemployment.limit"] == 151
    # 151 minus 10.
    assert got["unemployment.days_remaining"] == 141
    # Eleven business days after Saturday 2026-02-28: one business day after Friday
    # Mar 13 is Monday Mar 16.
    assert got["stem.validation_1_due"] == "2026-03-16"
    # One business day after Monday 2026-09-14.
    assert got["stem.validation_2_due"] == "2026-09-15"
    # 2026-08-30 plus 9 days: 1 to Aug 31, 8 to Sep 8.
    assert got["stem.evaluation_12_month_due"] == "2026-09-08"
    # 2025-08-29 minus 92 days: two days before May 31.
    assert got["stem.apply_window_opens"] == "2025-05-29"
    # 2027-08-29 plus 61 days: one day after Oct 28.
    assert got["grace.ends"] == "2027-10-29"


def test_a_period_at_24_hours_sits_between_the_two_shifted_thresholds():
    # Shifted thresholds: 21 before stem.ead_start 2025-08-30, 25 from it. One open
    # period at 24 hours from 2024-08-30. Days before 2025-08-30 are employed. Days from
    # 2025-08-30 through today 2026-09-02 are under hours: 2025-08-30 through 2026-08-29
    # is 365 days, then Aug 30, 31, Sep 1, 2 is 4. Total 369.
    case = with_changes(CASE_H2, employment=[job("2024-08-30", None, hours=24)])
    got = values(run(case, H2_TODAY, values=SHIFTED))
    assert got["employment.days_under_hours"] == 369
    assert got["unemployment.days_used"] == 0


@pytest.mark.parametrize(
    ("today", "expected"),
    [
        (date(2025, 8, 29), 90),  # the last OPT day, the day before stem.ead_start
        (date(2025, 8, 30), 150),
        (date(2025, 8, 31), 150),
    ],
)
def test_h2_limit_on_each_side_of_stem_ead_start(today, expected):
    assert values(run(CASE_H2, today))["unemployment.limit"] == expected


@pytest.mark.parametrize(
    ("requested_start", "status", "change_of_status", "expected"),
    [
        # 2028 is a leap year. None of this moves April 1.
        ("2028-02-29", "approved", True, "2028-02-29"),
        ("2028-04-01", "pending", True, "2028-04-01"),
        ("2028-07-04", "approved", True, "2028-04-01"),
        # October: April 1 of the next year, so the requested start is earlier.
        ("2027-10-01", "pending", True, "2027-10-01"),
        ("2027-10-15", "approved", True, "2027-10-15"),
        ("2027-09-30", "approved", True, "2027-04-01"),
        ("2027-10-01", "withdrawn", True, None),
        ("2027-10-01", "approved", False, None),
    ],
)
def test_capgap(requested_start, status, change_of_status, expected):
    # The petition is filed on H1_TODAY, 2024-03-01: a filing dated after the day of the
    # case is a conflict whose dates give nulls (specs/product-1/SPEC.md, section 1;
    # SPEC-resolutions.md, point 4).
    petition = cap_gap(
        requested_start,
        status=status,
        change_of_status=change_of_status,
        petition_filed_on=H1_TODAY.isoformat(),
    )
    case = with_changes(CASE_H1, cap_gap=petition)
    out = run(case, H1_TODAY)
    assert items(out)["capgap.ends"]["value"] == expected
    named = "cap_gap_petition_not_active" in out["verdict"]["reasons"]
    assert named is (expected is None)


@pytest.mark.parametrize(
    ("today", "state", "reasons"),
    [
        # Case H1, no employment. Window from 2024-01-08: 24 days in January, 29 in
        # February, 31 in March, then April. Through Apr 5: 24 + 29 + 31 + 5 = 89.
        (date(2024, 4, 5), "no_open_items", []),
        # Through Apr 6: 90. Nothing remains.
        (date(2024, 4, 6), "talk_to_dso", ["unemployment_at_or_over_limit"]),
        (date(2024, 4, 7), "talk_to_dso", ["unemployment_at_or_over_limit"]),
    ],
)
def test_h1_unemployment_on_each_side_of_the_limit(today, state, reasons):
    out = run(with_changes(CASE_H1, employment=[]), today)
    assert out["verdict"] == {"state": state, "reasons": reasons}
    used = values(out)["unemployment.days_used"]
    assert used == 89 + (today - date(2024, 4, 5)).days


@pytest.mark.parametrize(
    ("today", "litigated"),
    [
        (date(2025, 1, 6), False),
        (date(2025, 1, 7), False),  # final_end itself
        (date(2025, 1, 8), True),
    ],
)
def test_h1_on_each_side_of_final_end(today, litigated):
    out = run(with_changes(CASE_H1, employment=[job("2024-01-08", None)]), today)
    assert ("rule_in_litigation" in out["verdict"]["reasons"]) is litigated
    assert (out["verdict"]["state"] == "cannot_tell") is litigated


def test_program_end_after_every_ead_date_is_final_end():
    # Pre-completion OPT that ends before the program does. final_end is the program
    # end, 2026-12-18. Plus 60 days: 13 to Dec 31, 31 to Jan 31 (44), 16 to Feb 16.
    case = with_changes(
        CASE_H1,
        program_end_date="2026-12-18",
        opt=ead("2026-04-01", "2026-04-10", "2026-06-01", "2026-08-31"),
        employment=[job("2026-06-01", "2026-08-31")],
    )
    out = run(case, date(2026, 11, 2))
    got = items(out)
    assert got["grace.ends"]["value"] == "2027-02-16"
    # Plus 30 days: 13 to Dec 31, 17 to Jan 17.
    assert got["grace.ends"]["alternates"][0]["value"] == "2027-01-17"
    # Today is after opt.ead_end and before final_end.
    assert "rule_in_litigation" not in out["verdict"]["reasons"]
    # The window stops at opt.ead_end, and the period covers all of it.
    assert got["unemployment.days_used"]["value"] == 0


def test_the_blocked_regime_becomes_the_answer_when_the_pack_says_it_is_operative():
    # SPEC: the item's value is under the operative regime; alternates hold each regime
    # that is not operative. DECISIONS.md D1: the default is whatever is operative today.
    raw = pack_dict(H1_TODAY)
    for regime in raw["regimes"]:
        regime["operative"] = regime["id"] == BLOCKED
        regime["legal_status"] = "effective" if regime["id"] == BLOCKED else "rescinded"
    out = f1.compute_f1(f1.parse_case(CASE_H1), validate_pack(raw), clock_on(H1_TODAY))
    grace = items(out)["grace.ends"]
    # 2025-01-07 plus 30 days is Feb 6. Plus 60 days is Mar 8.
    assert grace["value"] == "2025-02-06"
    assert grace["alternates"] == [
        {"regime": OPERATIVE, "legal_status": "rescinded", "value": "2025-03-08"}
    ]


# Properties


@st.composite
def cases(draw: st.DrawFn) -> tuple[dict[str, Any], date]:
    program_end = draw(st.dates(min_value=date(2023, 6, 1), max_value=date(2027, 6, 30)))
    opt_start = program_end + timedelta(days=draw(st.integers(min_value=1, max_value=60)))
    opt_end = opt_start + timedelta(days=364)
    today = opt_start + timedelta(days=draw(st.integers(min_value=0, max_value=1150)))
    # specs/product-1/SPEC.md, section 1, and SPEC-resolutions.md, points 2 and 4: a
    # recommendation or a filing dated after today, and a day of work outside the cards,
    # are conflicts whose dates give nulls. The facts drawn here fit: each date entered is
    # on or before today, and each period lies inside the cards (an open one may run on
    # past the last card).
    stem = None
    last_card_day = opt_end
    # SPEC-resolutions.md, points 11 and 14: the STEM filing lies inside its window
    # (from 90 days before the OPT card ends) and within 60 days of its recommendation.
    # Recommended 80 days and filed 50 days before the OPT card ends; a STEM block is
    # drawn only on a day on or after that filing, so nothing is dated after today.
    # (Before, the filing was min(opt_end - 50, today), which could fall before the
    # window opened.)
    if draw(st.booleans()) and today >= opt_end - timedelta(days=50):
        stem_start = opt_end + timedelta(days=1)
        last_card_day = stem_start + timedelta(days=729)
        stem = ead(
            (opt_end - timedelta(days=80)).isoformat(),
            (opt_end - timedelta(days=50)).isoformat(),
            stem_start.isoformat(),
            last_card_day.isoformat(),
        )
    employment = []
    for _ in range(draw(st.integers(min_value=0, max_value=4))):
        start = opt_start + timedelta(days=draw(st.integers(min_value=0, max_value=1100)))
        start = min(start, today, last_card_day)
        length = draw(st.one_of(st.none(), st.integers(min_value=0, max_value=500)))
        end = (
            None
            if length is None
            else min(start + timedelta(days=length), last_card_day).isoformat()
        )
        hours = draw(st.sampled_from([5, 19, 20, 21, 24, 25, 40]))
        employment.append(job(start.isoformat(), end, hours=hours, reported=draw(st.booleans())))
    case = {
        "program_end_date": program_end.isoformat(),
        "time_zone": TIME_ZONE,
        "confirmations": answered_yes(),
        "degree_level": "master",
        "documents_count": 4,
        "cpt_full_time_days": 0,
        "opt": ead(
            (program_end - timedelta(days=40)).isoformat(),
            (program_end - timedelta(days=20)).isoformat(),
            opt_start.isoformat(),
            opt_end.isoformat(),
        ),
        "stem": stem,
        "employment": employment,
        "cap_gap": None,
    }
    return case, today


def counts(out: dict[str, Any]) -> tuple[int, int]:
    got = values(out)
    return got["unemployment.days_used"], got["employment.days_under_hours"]


@settings(max_examples=100, deadline=None)
@given(cases(), st.sampled_from([None, SHIFTED]))
def test_counts_match_a_day_by_day_count(drawn, shifted):
    case, today = drawn
    raw = pack_dict(today, values=shifted)
    expected = count_days(
        case,
        today,
        rule_value(raw, "opt.min_hours_per_week"),
        rule_value(raw, "stem.min_hours_per_week"),
    )
    assert counts(run(case, today, values=shifted)) == (expected["used"], expected["under"])


@settings(max_examples=100, deadline=None)
@given(cases(), st.integers(min_value=0, max_value=2**16))
def test_the_order_of_the_employment_periods_does_not_matter(drawn, seed):
    case, today = drawn
    shuffled = list(case["employment"])
    random.Random(seed).shuffle(shuffled)
    # SPEC-resolutions.md, point 20: a concluding evaluation belongs to its period, and
    # the engine numbers the periods as the case lists them, so the id moves with the
    # order. The dates do not: they are compared as a list, apart from their numbers.
    assert apart_from_numbers(
        values(run(with_changes(case, employment=shuffled), today))
    ) == apart_from_numbers(values(run(case, today)))


def apart_from_numbers(got: dict[str, Any]) -> tuple[dict[str, Any], dict[str, list[Any]]]:
    """The values, with each item numbered by its period (stem.concluding_evaluation_due.<n>,
    stem.new_plan_due.<n>) taken out and its values listed under the id without the number."""
    plain: dict[str, Any] = {}
    numbered: dict[str, list[Any]] = {}
    for item_id, value in got.items():
        head, _, tail = item_id.rpartition(".")
        if tail.isdigit() and head in PERIOD_ITEMS:
            numbered.setdefault(head, []).append(value)
        else:
            plain[item_id] = value
    return plain, {head: sorted(found) for head, found in numbered.items()}


PERIOD_ITEMS = ("stem.concluding_evaluation_due", "stem.new_plan_due")


@settings(max_examples=100, deadline=None)
@given(cases(), st.data())
def test_a_period_cut_in_two_counts_the_same(drawn, data):
    case, today = drawn
    closed = [p for p in case["employment"] if p["end"] is not None and p["end"] > p["start"]]
    if not closed:
        return
    target = data.draw(st.sampled_from(closed))
    first_day = date.fromisoformat(target["start"])
    length = (date.fromisoformat(target["end"]) - first_day).days
    cut = first_day + timedelta(days=data.draw(st.integers(min_value=0, max_value=length - 1)))
    halves = [
        {**target, "end": cut.isoformat()},
        {**target, "start": (cut + timedelta(days=1)).isoformat()},
    ]
    others = list(case["employment"])
    others.remove(target)
    assert counts(run(with_changes(case, employment=[*others, *halves]), today)) == counts(
        run(case, today)
    )


@settings(max_examples=100, deadline=None)
@given(cases())
def test_one_more_day_adds_at_most_one_day(drawn):
    case, today = drawn
    used, under = counts(run(case, today))
    next_used, next_under = counts(run(case, today + timedelta(days=1)))
    assert next_used - used in (0, 1)
    assert next_under - under in (0, 1)
    assert (next_used + next_under) - (used + under) in (0, 1)


@settings(max_examples=50, deadline=None)
@given(
    cases(),
    st.integers(min_value=1, max_value=500),
    st.sampled_from(["bachelor", "master", "doctorate"]),
)
def test_documents_count_and_degree_level_change_no_computed_value(drawn, documents, degree):
    case, today = drawn
    changed = with_changes(case, documents_count=documents, degree_level=degree)
    out = run(changed, today)
    assert out["computed"] == run(case, today)["computed"]
    assert out["scope"]["documents_count"] == documents


@settings(max_examples=50, deadline=None)
@given(cases())
def test_the_two_grace_answers_differ_by_the_difference_between_the_two_rules(drawn):
    case, today = drawn
    grace = items(run(case, today))["grace.ends"]
    assert len(grace["alternates"]) == 1
    gap = date.fromisoformat(grace["value"]) - date.fromisoformat(grace["alternates"][0]["value"])
    # 60 days under the operative regime, 30 under the blocked one.
    assert gap == timedelta(days=30)


@settings(max_examples=50, deadline=None)
@given(cases())
def test_a_missing_ead_date_never_gives_the_quiet_state(drawn):
    # CLAUDE.md: a verdict never falls back to the quiet state. Missing means cannot_tell.
    case, today = drawn
    for field in ("ead_start", "ead_end"):
        out = run(with_block(case, "opt", **{field: None}), today)
        assert out["verdict"]["state"] == "cannot_tell"
        assert contract_problems(out) == []


@settings(max_examples=50, deadline=None)
@given(cases(), st.integers(min_value=8, max_value=400))
def test_stale_rules_never_give_the_quiet_state(drawn, age):
    case, today = drawn
    pack = build_pack(today - timedelta(days=age))
    out = f1.compute_f1(f1.parse_case(case), pack, clock_on(today))
    assert out["verdict"]["state"] == "cannot_tell"
    assert "rules_stale" in out["verdict"]["reasons"]
