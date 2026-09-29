"""Holdout: SPEC-resolutions.md, points 20, 21, 22 and 25 on cases the builders never see.

Written before the engine has these points; the done command of the round that builds them
runs this file. The SPEC names employment.<n>.* and stem.*.<n> without saying how n is
counted, so n is read from the question the engine asks.

Every expected date and count was worked out by hand. The working is beside it.
"""

import copy
import re
from datetime import date, timedelta
from typing import Any

from api.main import get_f1_pack
from engine import f1
from engine.rulepack import validate_pack
from tests.support.f1_pack import (
    BLOCKED,
    answer_as_the_screen_does,
    build_pack,
    case_problems,
    clock_on,
    contract_problems,
    ead,
    items,
    job,
    no_earlier_opt,
    pack_dict,
    periods_answered,
    placeholders_made_real,
    question,
    question_ids,
    refuse_placeholders,
    rule_value,
    said,
    values,
)


def run(
    case: dict[str, Any], today: date, raw_pack: dict[str, Any] | None = None
) -> dict[str, Any]:
    # tests/unit/support/test_placeholders.py: every run helper sends its case through the
    # guard, so that a placeholder answer never reaches the engine.
    assert case_problems(case) == [], "the test case itself must match the case contract"
    clock = clock_on(today)
    pack = build_pack(today) if raw_pack is None else validate_pack(raw_pack)

    def compute(sent: dict[str, Any]) -> dict[str, Any]:
        return f1.compute_f1(f1.parse_case(refuse_placeholders(sent), clock), pack, clock)

    # SPEC-resolutions.md, point 39: a case whose opt.earlier_at_this_level is answered
    # with no_earlier_opt is sent as the screen sends it.
    return compute(placeholders_made_real(case, clock, compute))


def asked_like(out: dict[str, Any], pattern: str) -> list[str]:
    return [q for q in question_ids(out) if re.fullmatch(pattern, q)]


def number_of(question_id: str) -> str:
    return question_id.split(".")[1]


PACK = pack_dict("2026-09-28")

# Moved from tests/holdout/test_holdout_windows.py (points 21 and 22).
# OPT 2026-02-02 to 2027-02-01, program end 2025-12-19 (the window closes 2026-02-17; 14
# months reach 2027-02-19). Recommended 2025-11-20, filed 2025-12-01. Run on 2026-11-30.
CASE: dict[str, Any] = {
    "program_end_date": "2025-12-19",
    "degree_level": "bachelor",
    "documents_count": 3,
    "cpt_full_time_days": 10,
    "opt": ead("2025-11-20", "2025-12-01", "2026-02-02", "2027-02-01"),
    "stem": None,
    "employment": [job("2026-02-02", None)],
    "cap_gap": None,
    "time_zone": "UTC",
}
# SPEC-resolutions.md, point 39: the case answers opt.earlier_at_this_level no, so a
# test about something else stays about that.
CASE = no_earlier_opt(CASE)
DAY = date(2026, 11, 30)

# STEM 2026-02-02 to 2028-02-01 after an OPT card 2025-02-02 to 2026-02-01, program end
# 2024-12-19. The OPT window closes 2024-12-19 + 60 = 2025-02-17 (12 days to Dec 31, 31 to
# Jan 31, 17 more); the card begins before. OPT filed 11 days after its recommendation.
# 14 months from 2024-12-19 reach 2026-02-19, after the card end. The STEM window opens
# 2026-02-01 - 90 = 2025-11-03 (back 31 to Jan 1, 31 to Dec 1, 28 to Nov 3); the STEM
# filing 2025-11-10 is after it and 9 days after its recommendation. The first validation:
# 6 months from 2026-02-02 is 2026-08-02, so on 2026-05-15 no report date has passed.
STEM_CASE: dict[str, Any] = dict(
    CASE,
    program_end_date="2024-12-19",
    opt=ead("2024-11-20", "2024-12-01", "2025-02-02", "2026-02-01"),
    stem=ead("2025-11-01", "2025-11-10", "2026-02-02", "2028-02-01"),
    employment=[job("2025-02-02", None)],
)
STEM_DAY = date(2026, 5, 15)
NEW_EMPLOYER = r"employment\.[^.]+\.new_employer"


# Point 20.


def test_holdout_a_period_begun_on_the_stem_card_asks_about_a_new_employer():
    case = dict(STEM_CASE, employment=[job("2025-02-02", None), job("2026-05-11", None)])
    out = run(case, STEM_DAY)
    asked = asked_like(out, NEW_EMPLOYER)
    # The first period began before the STEM card, so one question.
    assert len(asked) == 1
    assert {"2026-05-11", "2026-02-02"} <= said(question(out, asked[0])["about"])
    assert out["verdict"]["state"] == "cannot_tell"
    yes = run(
        answer_as_the_screen_does(case, out, STEM_DAY.isoformat(), **{asked[0]: True}), STEM_DAY
    )
    # 2026-05-11 plus 10 days is 2026-05-21, six days after STEM_DAY.
    days = rule_value(PACK, "stem.new_plan_due_days")
    got = items(yes)[f"stem.new_plan_due.{number_of(asked[0])}"]
    assert got["value"] == (date(2026, 5, 11) + timedelta(days=days)).isoformat()
    assert got["value"] == "2026-05-21"
    assert yes["verdict"]["state"] == "needs_you"


def test_holdout_no_new_employer_gives_no_new_plan_item():
    case = dict(STEM_CASE, employment=[job("2025-02-02", None), job("2026-05-11", None)])
    out = run(case, STEM_DAY)
    asked = asked_like(out, NEW_EMPLOYER)[0]
    no = run(answer_as_the_screen_does(case, out, STEM_DAY.isoformat(), **{asked: False}), STEM_DAY)
    assert asked not in question_ids(no)
    assert not [i for i in items(no) if i.startswith("stem.new_plan_due")]


def test_holdout_a_period_ended_on_the_stem_card_gives_a_concluding_evaluation():
    case = dict(STEM_CASE, employment=[job("2025-02-02", None), job("2026-03-02", "2026-04-20")])
    out = run(case, STEM_DAY)
    found = {i: v for i, v in items(out).items() if i.startswith("stem.concluding_evaluation")}
    # 2026-04-20 plus 10 days is 2026-04-30.
    assert [v["value"] for v in found.values()] == ["2026-04-30"]
    assert all(v["reading"] is True for v in found.values())
    assert contract_problems(out) == []


# Point 21. Moved from tests/holdout/test_holdout_windows.py.


def test_holdout_a_passed_evaluation_is_asked_about():
    # The 12-month evaluation: 2027-02-02 plus 10 days, 2027-02-12. Run on 2027-02-13.
    case = STEM_CASE
    today = date(2027, 2, 13)
    made = "stem.evaluation_12_month_due.made"
    out = run(case, today)
    assert made in question_ids(out)
    assert out["verdict"]["state"] == "cannot_tell"
    assert values(run(case, date(2027, 2, 12)))["stem.evaluation_12_month_due"] == "2027-02-12"
    assert made not in question_ids(run(case, date(2027, 2, 12)))


def test_holdout_a_report_answered_no_goes_to_the_dso():
    # 2027-02-13 as above: the evaluation has passed, answered no on the day.
    today = date(2027, 2, 13)
    made = "stem.evaluation_12_month_due.made"
    first = run(STEM_CASE, today)
    # Every other passed report answered yes, so only this answer decides.
    given = {q: q != made for q in asked_like(first, r".*\.made")}
    out = run(answer_as_the_screen_does(STEM_CASE, first, today.isoformat(), **given), today)
    assert out["verdict"]["state"] == "talk_to_dso"
    assert "stem.evaluation_12_month_due.not_made" in out["verdict"]["reasons"]


# Point 22. Moved from tests/holdout/test_holdout_windows.py.


def test_holdout_an_unreported_end_gives_the_report_item():
    case = dict(CASE, employment=[job("2026-02-02", "2026-10-15"), job("2026-10-16", None)])
    out = run(case, DAY)
    asked = [q for q in question_ids(out) if q.endswith(".end_reported")]
    assert len(asked) == 1
    no = answer_as_the_screen_does(case, out, DAY.isoformat(), **{asked[0]: False})
    after = run(no, DAY)
    assert "report_employer" in after["verdict"]["reasons"]
    # 2026-10-15 plus 10 days is 2026-10-25.
    assert "2026-10-25" in {
        item["value"]
        for item in after["computed"]
        if "opt.report_employer_within_days" in item["rule_ids"]
    }


# Point 25: rule_in_litigation only when today is after the last card end and an item
# shown carries an alternate.


def blocked_grace_from(raw: dict[str, Any], effective_from: str) -> dict[str, Any]:
    changed = copy.deepcopy(raw)
    for parameter in changed["parameters"]:
        if parameter["id"] == "grace.after_completion_days" and parameter.get("regime") == BLOCKED:
            parameter["effective_from"] = effective_from
    return changed


# OPT 2022-07-01 to 2023-06-30, program end 2022-05-20. The window closes 2022-05-20 + 60 =
# 2022-07-19 (11 to May 31, 30 to Jun 30, 19 more); the card begins before. Filed 14 days
# after the recommendation. 14 months reach 2023-07-20, after the card end. grace.ends:
# 2023-06-30 + 60 = 2023-08-29 (31 to Jul 31, 29 more), before 2026-09-15. The period
# ends with the card: SPEC-resolutions.md, points 43 and 52, one still open after it
# would be a conflict and null grace.ends. Its end was reported (point 22).
ENDED_2023: dict[str, Any] = periods_answered(
    dict(
        CASE,
        program_end_date="2022-05-20",
        opt=ead("2022-04-01", "2022-04-15", "2022-07-01", "2023-06-30"),
        employment=[job("2022-07-01", "2023-06-30")],
    )
)
AFTER = date(2026, 9, 29)


def test_holdout_a_grace_period_over_before_the_blocked_rule_is_no_litigation():
    raw = blocked_grace_from(pack_dict(AFTER), "2026-09-15")
    out = run(ENDED_2023, AFTER, raw)
    assert values(out)["grace.ends"] == "2023-08-29"
    assert not [i for i, item in items(out).items() if "alternates" in item]
    assert "rule_in_litigation" not in out["verdict"]["reasons"]
    assert out["verdict"]["state"] != "cannot_tell"


def test_holdout_where_the_regimes_differ_the_litigation_stays():
    # The blocked row in effect from 2000: grace.ends carries its alternate, 2023-06-30 +
    # 30 = 2023-07-30, and today is after the card end.
    out = run(ENDED_2023, AFTER, pack_dict(AFTER))
    assert items(out)["grace.ends"]["alternates"][0]["value"] == "2023-07-30"
    assert "rule_in_litigation" in out["verdict"]["reasons"]
    assert out["verdict"]["state"] == "cannot_tell"


def test_holdout_case_d_on_the_shipped_pack_is_no_litigation():
    # The reconcile round's case: STEM card ended 2026-01-31, grace.ends 2026-03-31, both
    # before the shipped blocked row's effective_from of 2026-09-15, so no item carries an
    # alternate. Point 21 may keep the verdict cannot_tell for its passed reports; the
    # litigation reason must go.
    # The case is computed as it is, with no answer: nothing here turns on one (points 39
    # and 22 keep the verdict open, which the test does not look at).
    case = dict(
        CASE,
        confirmations={},
        program_end_date="2022-12-16",
        degree_level="doctorate",
        documents_count=9,
        cpt_full_time_days=0,
        opt=ead("2022-10-03", "2022-10-20", "2023-02-01", "2024-01-31"),
        stem=ead("2023-11-20", "2023-12-05", "2024-02-01", "2026-01-31"),
        # SPEC-resolutions.md, point 43: the reconcile round's period was open, which now
        # raises employment.period_open_after_last_card and leaves grace.ends null. The
        # period ends with the card, so the grace date stands: 2026-01-31 plus 60 days,
        # 28 reach Feb 28, 31 more Mar 31, 1 more 2026-04-01.
        employment=[job("2023-02-01", "2026-01-31")],
    )
    today = date(2026, 9, 28)
    clock = clock_on(today)
    out = f1.compute_f1(f1.parse_case(refuse_placeholders(case), clock), get_f1_pack(), clock)
    assert not [i for i, item in items(out).items() if "alternates" in item]
    assert "rule_in_litigation" not in out["verdict"]["reasons"]
