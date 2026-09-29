"""engine/f1.py: questions about employment periods and passed reports.
specs/product-1/SPEC-resolutions.md, points 20, 21, 22, 25 and 26.

Written before the engine has them. Each point asks a question with an about; until it is
answered the verdict is cannot_tell; each answer has its own result.

The SPEC names the questions employment.<n>.new_employer and employment.<n>.end_reported
and the items stem.new_plan_due.<n> and stem.concluding_evaluation_due.<n> without saying
how n is counted. The tests read n from the question the engine asks, and hold the item to
the same n, so they take no side on it.

Every expected date and count was worked out by hand. The working is beside it.
"""

import copy
import re
from datetime import date, timedelta
from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from engine.rulepack import validate_pack
from tests.support.f1_pack import (
    BLOCKED,
    answer_as_the_screen_does,
    build_pack,
    case_problems,
    clock_on,
    conflicts,
    contract_problems,
    ead,
    items,
    job,
    pack_dict,
    question,
    question_ids,
    refuse_placeholders,
    rule_value,
    said,
    values,
    with_changes,
)

PACK = pack_dict("2026-09-28")
NEW_PLAN_DAYS = rule_value(PACK, "stem.new_plan_due_days")
EVALUATION_DAYS = rule_value(PACK, "stem.evaluation_due_days")
REPORT_DAYS = rule_value(PACK, "opt.report_employer_within_days")


def run(
    case: dict[str, Any], today: date, raw_pack: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Compute a case with the clock injected at noon UTC on today."""
    assert case_problems(case) == [], "the test case itself must match the case contract"
    clock = clock_on(today)
    pack = build_pack(today) if raw_pack is None else validate_pack(raw_pack)
    # tests/unit/support/test_placeholders.py: the case goes through the guard.
    return f1.compute_f1(f1.parse_case(refuse_placeholders(case), clock), pack, clock)


def answered(case: dict[str, Any], today: date, **given_answers: bool) -> dict[str, Any]:
    """The case with each answer given on today with the about it was asked with."""
    out = run(case, today)
    return answer_as_the_screen_does(case, out, today.isoformat(), **given_answers)


def asked_like(out: dict[str, Any], pattern: str) -> list[str]:
    return [q for q in question_ids(out) if re.fullmatch(pattern, q)]


def number_of(question_id: str) -> str:
    return question_id.split(".")[1]


def shifted(rule_id: str, value: int) -> dict[str, Any]:
    raw = copy.deepcopy(PACK)
    for parameter in raw["parameters"]:
        if parameter["id"] == rule_id:
            parameter["value"] = value
    return raw


# OPT 2025-03-14 to 2026-03-13 (12 months from 2025-03-14 is 2026-03-14). STEM 2026-03-14
# to 2028-03-13 (24 months). Program end 2025-01-15: the OPT window closes 2025-03-16 and
# 14 months reach 2026-03-15. The STEM window opens 90 days before 2026-03-13, on
# 2025-12-13; the STEM filing is 2026-01-20, 10 days after its recommendation.
# The first validation: 6 months from 2026-03-14 is Monday 2026-09-14. Ten business days:
# 15 (1), 16 (2), 17 (3), 18 (4), 21 (5), 22 (6), 23 (7), 24 (8), 25 (9), 28 (10), no
# holiday between: 2026-09-28. The 12-month evaluation: 2027-03-14 plus 10 days,
# 2027-03-24.
def stem_on(employment: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "program_end_date": "2025-01-15",
        "degree_level": "master",
        "documents_count": 2,
        "cpt_full_time_days": 0,
        "opt": ead("2024-12-01", "2024-12-10", "2025-03-14", "2026-03-13"),
        "stem": ead("2026-01-10", "2026-01-20", "2026-03-14", "2028-03-13"),
        "employment": employment,
        "cap_gap": None,
        "time_zone": "UTC",
    }


STEM_START = "2026-03-14"
FIRST_JOB = job("2025-03-14", None)

# Point 20: a second, open period from 2026-07-25, on the STEM card. The first period
# began before the STEM card and stays open, so no period has a recorded end. On
# 2026-08-01 no report date has passed (the first is 2026-09-28, 58 days on).
NEW_DAY = date(2026, 8, 1)
NEW_JOB_START = date(2026, 7, 25)
NEW_JOB: dict[str, Any] = stem_on([FIRST_JOB, job(NEW_JOB_START.isoformat(), None)])
NEW_EMPLOYER = r"employment\.[^.]+\.new_employer"


def test_point_20_a_period_that_begins_on_the_stem_card_asks_about_a_new_employer():
    out = run(NEW_JOB, NEW_DAY)
    asked = asked_like(out, NEW_EMPLOYER)
    # One question: the first period began before the STEM card.
    assert len(asked) == 1
    about = question(out, asked[0])["about"]
    assert {"2026-07-25", STEM_START} <= said(about)
    assert out["verdict"]["state"] == "cannot_tell"
    assert contract_problems(out) == []


def test_point_20_a_period_that_begins_on_the_stem_start_itself_is_asked_about():
    case = stem_on([FIRST_JOB, job(STEM_START, None)])
    assert len(asked_like(run(case, NEW_DAY), NEW_EMPLOYER)) == 1


def test_point_20_a_period_that_begins_before_the_stem_card_is_not_asked_about():
    case = stem_on([FIRST_JOB, job("2026-03-13", None)])
    assert asked_like(run(case, NEW_DAY), NEW_EMPLOYER) == []


def test_point_20_yes_gives_the_new_plan_date_as_an_open_item():
    asked = asked_like(run(NEW_JOB, NEW_DAY), NEW_EMPLOYER)[0]
    out = run(answered(NEW_JOB, NEW_DAY, **{asked: True}), NEW_DAY)
    item_id = f"stem.new_plan_due.{number_of(asked)}"
    got = items(out)[item_id]
    # 2026-07-25 plus 10 days: 6 days reach Jul 31, 4 more 2026-08-04. From 2026-08-01
    # it is within the 14 days of the look-ahead, so it is an open item.
    assert got["value"] == "2026-08-04"
    assert "stem.new_plan_due_days" in got["rule_ids"]
    assert asked not in question_ids(out)
    assert out["verdict"]["state"] == "needs_you"
    assert item_id in out["verdict"]["reasons"]


def test_point_20_no_gives_nothing():
    asked = asked_like(run(NEW_JOB, NEW_DAY), NEW_EMPLOYER)[0]
    out = run(answered(NEW_JOB, NEW_DAY, **{asked: False}), NEW_DAY)
    assert not [i for i in items(out) if i.startswith("stem.new_plan_due")]
    assert asked not in question_ids(out)
    assert out["verdict"]["state"] == "no_open_items"


@settings(deadline=None, max_examples=20)
@given(st.integers(min_value=1, max_value=60))
def test_point_20_the_new_plan_days_come_from_the_pack(days):
    raw = shifted("stem.new_plan_due_days", days)
    asked = asked_like(run(NEW_JOB, NEW_DAY, raw), NEW_EMPLOYER)[0]
    case = answer_as_the_screen_does(
        NEW_JOB, run(NEW_JOB, NEW_DAY, raw), NEW_DAY.isoformat(), **{asked: True}
    )
    got = items(run(case, NEW_DAY, raw))[f"stem.new_plan_due.{number_of(asked)}"]
    assert got["value"] == (NEW_JOB_START + timedelta(days=days)).isoformat()


# Point 20, the concluding evaluation: a period on the STEM card from 2026-04-01 to
# 2026-07-20, before the card ends.
ENDED_JOB: dict[str, Any] = stem_on([FIRST_JOB, job("2026-04-01", "2026-07-20")])
CONCLUDING = "stem.concluding_evaluation_due."


def test_point_20_a_period_that_ends_on_the_stem_card_gives_a_concluding_evaluation():
    out = run(ENDED_JOB, NEW_DAY)
    found = {i: item for i, item in items(out).items() if i.startswith(CONCLUDING)}
    assert len(found) == 1
    ((item_id, item),) = found.items()
    # 2026-07-20 plus 10 days is 2026-07-30.
    assert item["value"] == "2026-07-30"
    assert "stem.evaluation_due_days" in item["rule_ids"]
    # Taking the period's end as the conclusion of the opportunity is a reading.
    assert item["reading"] is True
    # The same n as the question about the same period.
    asked = asked_like(out, NEW_EMPLOYER)
    assert [f"{CONCLUDING}{number_of(q)}" for q in asked] == [item_id]


def test_point_20_an_open_period_gives_no_concluding_evaluation():
    out = run(NEW_JOB, NEW_DAY)
    assert not [i for i in items(out) if i.startswith(CONCLUDING)]


@settings(deadline=None, max_examples=20)
@given(st.integers(min_value=1, max_value=60))
def test_point_20_the_concluding_days_come_from_the_pack(days):
    out = run(ENDED_JOB, NEW_DAY, shifted("stem.evaluation_due_days", days))
    found = [item for i, item in items(out).items() if i.startswith(CONCLUDING)]
    assert [item["value"] for item in found] == [
        (date(2026, 7, 20) + timedelta(days=days)).isoformat()
    ]


# Point 21: a passed report date. The sweep's case: validation due 2026-09-28, today
# 2026-09-29.
ONE_JOB: dict[str, Any] = stem_on([FIRST_JOB])
DUE = date(2026, 9, 28)
MADE = "stem.validation_1_due.made"


def test_point_21_the_report_date_is_the_one_worked_by_hand():
    assert items(run(ONE_JOB, DUE))["stem.validation_1_due"]["value"] == DUE.isoformat()


def test_point_21_on_the_day_it_is_due_the_report_is_an_open_item_and_not_asked_about():
    out = run(ONE_JOB, DUE)
    assert MADE not in question_ids(out)
    assert out["verdict"]["state"] == "needs_you"
    assert "stem.validation_1_due" in out["verdict"]["reasons"]


def test_point_21_the_day_after_it_is_due_duly_asks_whether_it_was_made():
    out = run(ONE_JOB, DUE + timedelta(days=1))
    assert MADE in question_ids(out)
    assert {"stem.validation_1_due", "2026-09-28"} <= said(question(out, MADE)["about"])
    # It does not drop out: before this point the verdict went to no_open_items.
    assert out["verdict"]["state"] == "cannot_tell"
    assert contract_problems(out) == []


def test_point_21_yes_makes_the_report_done():
    today = DUE + timedelta(days=1)
    out = run(answered(ONE_JOB, today, **{MADE: True}), today)
    assert MADE not in question_ids(out)
    assert out["verdict"]["state"] != "cannot_tell"
    assert "stem.validation_1_due.not_made" not in out["verdict"]["reasons"]
    assert "stem.validation_1_due" not in out["verdict"]["reasons"]


def test_point_21_no_sends_the_person_to_the_dso():
    today = DUE + timedelta(days=1)
    out = run(answered(ONE_JOB, today, **{MADE: False}), today)
    assert out["verdict"]["state"] == "talk_to_dso"
    assert "stem.validation_1_due.not_made" in out["verdict"]["reasons"]
    assert all(" " not in reason for reason in out["verdict"]["reasons"])


def test_point_21_an_evaluation_date_that_has_passed_is_asked_about_too():
    # On 2027-04-01: validation 1 (2026-09-28), validation 2 and the 12-month evaluation
    # have passed. Validation 2: 12 months from 2026-03-14 is Sunday 2027-03-14; ten
    # business days: Mar 15 to 19 (5), 22 to 26 (10), 2027-03-26. Evaluation 2027-03-24.
    # Validation 3: 18 months, 2027-09-14, is ahead.
    out = run(ONE_JOB, date(2027, 4, 1))
    assert set(asked_like(out, r".*\.made")) == {
        "stem.validation_1_due.made",
        "stem.validation_2_due.made",
        "stem.evaluation_12_month_due.made",
    }


@settings(deadline=None, max_examples=25)
@given(st.dates(min_value=date(2026, 9, 1), max_value=date(2026, 10, 31)))
def test_point_21_the_question_is_asked_when_and_only_when_the_date_has_passed(today):
    # In this range only validation 1 (2026-09-28) can have passed.
    out = run(ONE_JOB, today)
    assert (MADE in question_ids(out)) is (today > DUE)


# Point 22: the end of an employment period. OPT only: program end 2025-09-15, the card
# 2025-11-01 to 2026-10-31. One period ends 2026-06-30, the next begins 2026-07-01.
OPT_ONLY: dict[str, Any] = {
    "program_end_date": "2025-09-15",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "opt": ead("2025-08-01", "2025-08-10", "2025-11-01", "2026-10-31"),
    "stem": None,
    "employment": [job("2025-11-01", "2026-06-30"), job("2026-07-01", None)],
    "cap_gap": None,
    "time_zone": "UTC",
}
TODAY = date(2026, 9, 28)
END_REPORTED = r"employment\.[^.]+\.end_reported"


def test_point_22_a_recorded_end_asks_whether_it_was_reported():
    out = run(OPT_ONLY, TODAY)
    asked = asked_like(out, END_REPORTED)
    # One question: the second period is open.
    assert len(asked) == 1
    assert {"2025-11-01", "2026-06-30"} <= said(question(out, asked[0])["about"])
    assert out["verdict"]["state"] == "cannot_tell"
    assert contract_problems(out) == []


def test_point_22_the_employer_reported_flag_does_not_answer_the_question():
    # Every period of OPT_ONLY has employer_reported true. The flag records the employer,
    # not the later end.
    assert all(period["employer_reported"] for period in OPT_ONLY["employment"])
    assert len(asked_like(run(OPT_ONLY, TODAY), END_REPORTED)) == 1


def test_point_22_yes_gives_no_report_item():
    asked = asked_like(run(OPT_ONLY, TODAY), END_REPORTED)[0]
    out = run(answered(OPT_ONLY, TODAY, **{asked: True}), TODAY)
    assert asked not in question_ids(out)
    assert out["verdict"]["state"] != "cannot_tell"
    assert "report_employer" not in out["verdict"]["reasons"]


def test_point_22_no_gives_the_report_item_as_guidance():
    asked = asked_like(run(OPT_ONLY, TODAY), END_REPORTED)[0]
    out = run(answered(OPT_ONLY, TODAY, **{asked: False}), TODAY)
    assert out["verdict"]["state"] == "needs_you"
    assert "report_employer" in out["verdict"]["reasons"]
    # 2026-06-30 plus 10 days is 2026-07-10.
    dated = [
        item
        for item in items(out).values()
        if "opt.report_employer_within_days" in item["rule_ids"] and item["unit"] == "date"
    ]
    assert [item["value"] for item in dated] == ["2026-07-10"]
    assert dated[0]["status"] == "guidance"


@settings(deadline=None, max_examples=20)
@given(st.integers(min_value=1, max_value=60))
def test_point_22_the_report_days_come_from_the_pack(days):
    raw = shifted("opt.report_employer_within_days", days)
    first = run(OPT_ONLY, TODAY, raw)
    asked = asked_like(first, END_REPORTED)[0]
    case = answer_as_the_screen_does(OPT_ONLY, first, TODAY.isoformat(), **{asked: False})
    dated = [
        item["value"]
        for item in items(run(case, TODAY, raw)).values()
        if "opt.report_employer_within_days" in item["rule_ids"] and item["unit"] == "date"
    ]
    assert dated == [(date(2026, 6, 30) + timedelta(days=days)).isoformat()]


def test_point_22_an_open_period_is_not_asked_about():
    case = with_changes(OPT_ONLY, employment=[job("2025-11-01", None)])
    assert asked_like(run(case, TODAY), END_REPORTED) == []


# Point 25: rule_in_litigation only when today is after the last card end and at least one
# item shown carries an alternate. After point 23 an item dated before the blocked row's
# effective_from carries none, and the two regimes then give the same answer.


def with_blocked_grace_from(raw: dict[str, Any], effective_from: str) -> dict[str, Any]:
    changed = copy.deepcopy(raw)
    for parameter in changed["parameters"]:
        if parameter["id"] == "grace.after_completion_days" and parameter.get("regime") == BLOCKED:
            parameter["effective_from"] = effective_from
    return changed


# 91 FR 44976 took effect on 2026-09-15.
BLOCKED_FROM = "2026-09-15"

# OPT 2023-06-01 to 2024-05-31, program end 2023-05-15. The window closes 2023-05-15 + 60 =
# 2023-07-14 (16 to May 31, 30 to Jun 30, 14 more); the card begins before. Filed 9 days
# after the recommendation. 14 months reach 2024-07-15, after the card end. grace.ends:
# 2024-05-31 + 60 = 2024-07-30 (30 to Jun 30, 30 more), before 2026-09-15. One period open
# from the first day of the card, so no period has a recorded end.
ENDED_2024: dict[str, Any] = with_changes(
    OPT_ONLY,
    program_end_date="2023-05-15",
    opt=ead("2023-03-01", "2023-03-10", "2023-06-01", "2024-05-31"),
    employment=[job("2023-06-01", None)],
)

# The same card three years later: OPT 2026-06-01 to 2027-05-31, program end 2026-05-15.
# grace.ends 2027-05-31 + 60 = 2027-07-30 (30 to Jun 30, 30 more); under the blocked value
# of 30, 2027-06-30. Both after 2026-09-15.
ENDS_2027: dict[str, Any] = with_changes(
    ENDED_2024,
    program_end_date="2026-05-15",
    opt=ead("2026-03-02", "2026-03-10", "2026-06-01", "2027-05-31"),
    employment=[job("2026-06-01", None)],
)


def test_point_25_the_cases_are_clean():
    assert conflicts(run(ENDED_2024, TODAY)) == []
    assert conflicts(run(ENDS_2027, date(2027, 6, 15), pack_dict("2027-06-15"))) == []


def test_point_25_a_grace_period_over_before_the_blocked_rule_is_no_litigation():
    raw = with_blocked_grace_from(pack_dict(TODAY), BLOCKED_FROM)
    out = run(ENDED_2024, TODAY, raw)
    assert values(out)["grace.ends"] == "2024-07-30"
    # No item shown carries an alternate (point 23), so the regimes give the same answer.
    assert not [i for i, item in items(out).items() if "alternates" in item]
    assert "rule_in_litigation" not in out["verdict"]["reasons"]
    # Nothing else is open in the case: the verdict is not the not-knowing state.
    assert out["verdict"]["state"] != "cannot_tell"


def test_point_25_where_the_regimes_differ_the_verdict_stays_cannot_tell():
    today = date(2027, 6, 15)  # after the card end 2027-05-31
    raw = with_blocked_grace_from(pack_dict(today), BLOCKED_FROM)
    out = run(ENDS_2027, today, raw)
    assert items(out)["grace.ends"]["alternates"][0]["value"] == "2027-06-30"
    assert out["verdict"]["state"] == "cannot_tell"
    assert "rule_in_litigation" in out["verdict"]["reasons"]


def test_point_25_on_or_before_the_last_card_end_there_is_no_litigation():
    for today in (date(2027, 5, 30), date(2027, 5, 31)):
        raw = with_blocked_grace_from(pack_dict(today), BLOCKED_FROM)
        out = run(ENDS_2027, today, raw)
        assert "alternates" in items(out)["grace.ends"]
        assert "rule_in_litigation" not in out["verdict"]["reasons"]


@settings(deadline=None, max_examples=25)
@given(st.dates(min_value=date(2024, 6, 1), max_value=date(2030, 12, 31)))
def test_point_25_litigation_follows_the_alternates_whatever_the_day(today):
    # Every day after the card end 2024-05-31. With the blocked row from 2026-09-15 no
    # item of ENDED_2024 carries an alternate on any day; with it from 2000-01-01
    # grace.ends carries one (2024-05-31 + 30 = 2024-06-30), and the reason is there.
    later = with_blocked_grace_from(pack_dict(today), BLOCKED_FROM)
    assert "rule_in_litigation" not in run(ENDED_2024, today, later)["verdict"]["reasons"]
    assert "rule_in_litigation" in run(ENDED_2024, today, pack_dict(today))["verdict"]["reasons"]


# Point 26: a conflict's rule is named in the output's rules, not on the question. A
# question carries id, because and about (point 6) and no rule_ids.
# The OPT card of OPT_ONLY with one open period. The recommendation is 2025-08-01.
ONE_OPEN: dict[str, Any] = with_changes(OPT_ONLY, employment=[job("2025-11-01", None)])
FILED_EARLY: dict[str, Any] = with_changes(
    ONE_OPEN, opt=ead("2025-08-01", "2025-07-31", "2025-11-01", "2026-10-31")
)
# opt.complete_by: 2025-09-15 + 14 months = 2026-11-15. A card from 2025-11-20 through
# 2026-11-16 runs one day past it.
PAST_COMPLETE_BY: dict[str, Any] = with_changes(
    ONE_OPEN,
    opt=ead("2025-08-01", "2025-08-10", "2025-11-20", "2026-11-16"),
    employment=[job("2025-11-20", None)],
)
POINT_26 = [
    (
        FILED_EARLY,
        "opt.i765_filed_date.before_recommendation",
        "opt.file_within_days_of_recommendation",
    ),
    (PAST_COMPLETE_BY, "opt.ead_end.after_complete_by", "opt.complete_within_months"),
]


def test_point_26_a_conflict_question_carries_no_rule_ids():
    for case, conflict, _ in POINT_26:
        out = run(case, TODAY)
        assert conflicts(out) == [conflict]
        assert set(question(out, conflict)) == {"id", "because", "about"}


def test_point_26_a_conflicts_rule_is_named_in_rules():
    for case, conflict, rule_id in POINT_26:
        out = run(case, TODAY)
        assert rule_id in out["rules"], conflict
        assert out["rules"][rule_id]["quote"], conflict
        assert contract_problems(out) == []
