"""engine/f1.py: the second fix. specs/product-1/SPEC-resolutions.md, points 27, 28, 36
and 37.

Written before the engine has them. Point 27 is a conflict of SPEC section 1 and works as
every one does: cannot_tell with conflict:<id>, a question with the same id and an about,
the rule shown in the output's rules (point 26), the items that use its dates null (point
4), yes gives talk_to_dso with the judgement item <id>, no keeps cannot_tell. Point 28 is
tested on a copy of the test pack with the blocked regime made operative, and on the
shipped pack. Point 36 is point 21 for the new Form I-983 and the concluding evaluation.
Point 37 is point 4 for the conflict of point 16.

Every expected date and count was worked out by hand. The working is beside it.
"""

import re
from datetime import date, timedelta
from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from engine.rulepack import Rulepack, load_all, validate_pack
from tests.support.f1_pack import (
    BLOCKED,
    NOT_AFTER_PROGRAM_END,
    OPEN_AFTER_LAST_CARD,
    POST_COMPLETION_RULE,
    STEM_LIST,
    answer_as_the_screen_does,
    case_problems,
    clock_on,
    conflicts,
    contract_problems,
    ead,
    items,
    job,
    months_later,
    no_earlier_opt,
    pack_dict,
    periods_answered,
    placeholders_made_real,
    question,
    question_ids,
    refuse_placeholders,
    rule_value,
    said,
    upcoming,
    values,
    with_block,
    with_blocked_regime_operative,
    with_changes,
    with_regime_rows,
)

TODAY = date(2026, 9, 29)
ONE_DAY = timedelta(days=1)
PACK = pack_dict(TODAY)
OPT_FILE_DAYS = rule_value(PACK, "opt.file_within_days_of_recommendation")
COMPLETE_MONTHS = rule_value(PACK, "opt.complete_within_months")
NEW_PLAN_DAYS = rule_value(PACK, "stem.new_plan_due_days")
EVALUATION_DAYS = rule_value(PACK, "stem.evaluation_due_days")

COUNTS = (
    "unemployment.days_used",
    "unemployment.days_remaining",
    "employment.days_under_hours",
)


def run(
    case: dict[str, Any],
    today: date = TODAY,
    raw_pack: dict[str, Any] | None = None,
    pack: Rulepack | None = None,
) -> dict[str, Any]:
    """Compute a case with the clock injected at noon UTC on today. The test pack is
    checked on today, so the age of the rules never decides a verdict."""
    assert case_problems(case) == [], "the test case itself must match the case contract"
    clock = clock_on(today)
    if pack is None:
        pack = validate_pack(pack_dict(today) if raw_pack is None else raw_pack)

    def compute(sent: dict[str, Any]) -> dict[str, Any]:
        return f1.compute_f1(f1.parse_case(refuse_placeholders(sent), clock), pack, clock)

    # SPEC-resolutions.md, point 39: a case whose opt.earlier_at_this_level is answered
    # with no_earlier_opt is sent as the screen sends it.
    return compute(placeholders_made_real(case, clock, compute))


def answered(case: dict[str, Any], today: date = TODAY, **given_answers: bool) -> dict[str, Any]:
    """The case with each answer given on today, with the about the output asked it with
    (SPEC-resolutions.md, points 2 and 7)."""
    out = run(case, today)
    return answer_as_the_screen_does(case, out, today.isoformat(), **given_answers)


def iso(day: date) -> str:
    return day.isoformat()


# Point 27. The OPT card ends a week before the program end, and the program end is ahead,
# so the card is running today and no grace period is in play. Program end 2026-12-15.
# Recommended 2026-09-01, filed 2026-09-05 (4 days on, within 30), card 2026-09-10 to
# 2026-12-08: 3 months, under 12. 2026-12-08 is 7 days before 2026-12-15. The filing is
# before the program end, so point 15 raises nothing; the card ends before the 14 months,
# so point 16 raises nothing. opt.file_by: 2026-09-01 plus 30 days, 29 days reach Sep 30
# and 1 more 2026-10-01, 2 days after today and inside the 14 days of the look-ahead.
PROGRAM_END = date(2026, 12, 15)


def card_to(ead_end: date) -> dict[str, Any]:
    # SPEC-resolutions.md, point 39: opt.earlier_at_this_level answered no (no_earlier_opt).
    return no_earlier_opt(
        {
            "program_end_date": iso(PROGRAM_END),
            "degree_level": "master",
            "documents_count": 2,
            "cpt_full_time_days": 0,
            "opt": ead("2026-09-01", "2026-09-05", "2026-09-10", iso(ead_end)),
            "stem": None,
            "employment": [job("2026-09-10", None)],
            "cap_gap": None,
            "time_zone": "UTC",
        }
    )


A_WEEK_BEFORE = card_to(PROGRAM_END - timedelta(days=7))
ON_THE_END = card_to(PROGRAM_END)
DAY_AFTER = card_to(PROGRAM_END + ONE_DAY)
ABOUT_27 = {"program_end_date", "opt.ead_start", "opt.ead_end"}


def test_point_27_the_cases_match_the_case_contract():
    for case in (A_WEEK_BEFORE, ON_THE_END, DAY_AFTER):
        assert case_problems(case) == []
    assert A_WEEK_BEFORE["opt"]["ead_end"] == "2026-12-08"
    assert iso(date(2026, 9, 1) + timedelta(days=OPT_FILE_DAYS)) == "2026-10-01"


def test_point_27_not_after_program_end_is_cannot_tell_with_the_reason():
    out = run(A_WEEK_BEFORE)
    assert out["verdict"]["state"] == "cannot_tell"
    assert f"conflict:{NOT_AFTER_PROGRAM_END}" in out["verdict"]["reasons"]
    # The case is built so that nothing else in it fails to fit.
    assert conflicts(out) == [NOT_AFTER_PROGRAM_END]
    assert contract_problems(out) == []


def test_point_27_a_card_ending_on_the_program_end_is_raised():
    # "on or before program_end_date": 2026-12-15 itself.
    assert conflicts(run(ON_THE_END)) == [NOT_AFTER_PROGRAM_END]


def test_point_27_a_card_ending_the_day_after_the_program_end_raises_nothing():
    # 2026-12-16: the card has a post-completion part of one day. 12 months from
    # 2026-09-10 is 2027-09-10, so the card is not longer than the rule either.
    out = run(DAY_AFTER)
    assert conflicts(out) == []
    assert NOT_AFTER_PROGRAM_END not in question_ids(out)
    assert out["verdict"]["state"] != "cannot_tell", out["verdict"]


def test_point_27_the_question_holds_the_program_end_and_the_card():
    out = run(A_WEEK_BEFORE)
    asked = question(out, NOT_AFTER_PROGRAM_END)
    assert asked["because"]
    assert set(asked["about"]) >= ABOUT_27
    assert {"2026-12-15", "2026-09-10", "2026-12-08"} <= said(asked["about"])
    # Point 26: a question carries no rule_ids.
    assert "rule_ids" not in asked


def test_point_27_the_rule_is_named_in_rules():
    out = run(A_WEEK_BEFORE)
    shown = out["rules"][POST_COMPLETION_RULE]
    assert shown["status"] == "guidance"
    assert shown["quote"].strip()


def test_point_27_the_items_that_use_the_card_are_null():
    got = items(run(A_WEEK_BEFORE))
    before = items(run(DAY_AFTER))
    # Each is computed when the facts fit, so the null below comes from the conflict.
    for item_id in ("grace.ends", *COUNTS):
        assert before[item_id]["value"] is not None, item_id
        assert got[item_id]["value"] is None, item_id
    for item_id, item in got.items():
        if ABOUT_27 & set(item["inputs"]):
            assert item["value"] is None, item_id


def test_point_27_no_opt_step_is_marked_done_while_it_is_open():
    # opt.file_by uses only the recommendation, so it keeps its date, 2026-10-01. A card
    # that fits marks the OPT step done and the date leaves upcoming; this card does not.
    out = run(A_WEEK_BEFORE)
    assert values(out)["opt.file_by"] == "2026-10-01"
    assert upcoming(out)["opt.file_by"]["date"] == "2026-10-01"
    assert "opt.file_by" not in upcoming(run(DAY_AFTER))


def test_point_27_the_stem_step_is_not_placed_next_while_it_is_open():
    out = run(A_WEEK_BEFORE)
    assert [entry for entry in upcoming(out) if entry.startswith("next.")] == []
    assert STEM_LIST not in [entry["id"] for entry in out["lists"]]
    # With the card ending the day after, the STEM step is next: its window closes on the
    # card's last day, 2026-12-16.
    fits = run(DAY_AFTER)
    assert upcoming(fits)["next.stem.apply_window_closes"]["date"] == "2026-12-16"


def test_point_27_yes_gives_talk_to_dso_with_the_judgement_item():
    out = run(answered(A_WEEK_BEFORE, **{NOT_AFTER_PROGRAM_END: True}))
    assert out["verdict"]["state"] == "talk_to_dso"
    assert NOT_AFTER_PROGRAM_END in out["verdict"]["reasons"]
    assert conflicts(out) == []
    assert NOT_AFTER_PROGRAM_END not in question_ids(out)
    assert all(" " not in reason for reason in out["verdict"]["reasons"])


def test_point_27_no_keeps_cannot_tell():
    out = run(answered(A_WEEK_BEFORE, **{NOT_AFTER_PROGRAM_END: False}))
    assert out["verdict"]["state"] == "cannot_tell"
    assert f"conflict:{NOT_AFTER_PROGRAM_END}" in out["verdict"]["reasons"]


def test_point_27_a_missing_card_end_raises_nothing():
    case = with_block(A_WEEK_BEFORE, "opt", ead_start=None, ead_end=None)
    assert NOT_AFTER_PROGRAM_END not in conflicts(run(case))


def test_point_27_the_case_of_the_sweep():
    # A four-month card ending a week before the program end: program end 2026-06-15,
    # card 2026-02-09 to 2026-06-08 (4 months from 2026-02-09 is 2026-06-09, less a day).
    # The engine gave no_open_items and the STEM extension as the next step.
    case = {
        "program_end_date": "2026-06-15",
        "degree_level": "master",
        "documents_count": 2,
        "cpt_full_time_days": 0,
        "opt": ead("2026-01-20", "2026-01-25", "2026-02-09", "2026-06-08"),
        "stem": None,
        "employment": [job("2026-02-09", None)],
        "cap_gap": None,
        "time_zone": "UTC",
    }
    out = run(no_earlier_opt(case))
    assert out["verdict"]["state"] == "cannot_tell"
    # SPEC-resolutions.md, point 43: the work is still open while today (2026-09-29) is
    # after the card's end (2026-06-08), so the sweep's case raises that conflict too.
    assert sorted(conflicts(out)) == sorted([NOT_AFTER_PROGRAM_END, OPEN_AFTER_LAST_CARD])
    assert [entry for entry in upcoming(out) if entry.startswith("next.")] == []


@settings(deadline=None, max_examples=40)
@given(st.integers(min_value=-60, max_value=60))
def test_point_27_raised_when_and_only_when_the_card_ends_on_or_before_the_program_end(
    offset,
):
    # The card begins 2026-09-10 and ends between 2026-10-16 and 2027-02-13: after its
    # start, under 12 months, before 14 months from the program end. The clock is fixed.
    end = PROGRAM_END + timedelta(days=offset)
    raised = NOT_AFTER_PROGRAM_END in conflicts(run(card_to(end)))
    assert raised is (offset <= 0)


# Point 37: the conflict of point 16 nulls the items that use program_end_date as well as
# opt.ead_end. Program end 2025-09-15; 14 months on is 2026-11-15. The card 2025-11-20 to
# 2026-11-16 runs one day past it (12 months from 2025-11-20 is 2026-11-20, so the card is
# not longer than its own rule). opt.apply_window_opens is 90 days before 2025-09-15: 15
# days reach Aug 31, 31 more Jul 31, 31 more Jun 30, 13 more 2025-06-17.
def complete_case(ead_end: date) -> dict[str, Any]:
    # SPEC-resolutions.md, point 39: opt.earlier_at_this_level answered no (no_earlier_opt).
    return no_earlier_opt(
        {
            "program_end_date": "2025-09-15",
            "degree_level": "master",
            "documents_count": 2,
            "cpt_full_time_days": 0,
            "opt": ead("2025-08-01", "2025-08-10", "2025-11-20", iso(ead_end)),
            "stem": None,
            "employment": [job("2025-11-20", None)],
            "cap_gap": None,
            "time_zone": "UTC",
        }
    )


COMPLETE_BY = months_later(date(2025, 9, 15), COMPLETE_MONTHS)
PAST_COMPLETE_BY = complete_case(COMPLETE_BY + ONE_DAY)
ON_COMPLETE_BY = complete_case(COMPLETE_BY)
# 2026-09-28, the day the rows of point 16 were tested on, is before the card's end.
POINT_37_DAY = date(2026, 9, 28)


def test_point_37_the_worked_dates_are_those_of_the_test_pack():
    assert iso(COMPLETE_BY) == "2026-11-15"
    out = run(ON_COMPLETE_BY, POINT_37_DAY)
    assert conflicts(out) == []
    assert values(out)["opt.apply_window_opens"] == "2025-06-17"
    assert values(out)["opt.complete_by"] == "2026-11-15"


def test_point_37_while_after_complete_by_is_open_the_window_opening_is_null():
    out = run(PAST_COMPLETE_BY, POINT_37_DAY)
    assert conflicts(out) == ["opt.ead_end.after_complete_by"]
    assert values(out)["opt.apply_window_opens"] is None


def test_point_37_while_after_complete_by_is_open_complete_by_is_null():
    out = run(PAST_COMPLETE_BY, POINT_37_DAY)
    assert values(out)["opt.complete_by"] is None
    assert "opt.complete_by" not in upcoming(out)


def test_point_37_every_item_that_uses_program_end_date_is_null():
    out = run(PAST_COMPLETE_BY, POINT_37_DAY)
    for item_id, item in items(out).items():
        if {"program_end_date", "opt.ead_end"} & set(item["inputs"]):
            assert item["value"] is None, item_id


# Point 28: a rule measured from an event is looked up for the day of that event, under the
# operative regime. The blocked rule of 91 FR 44976 took effect 2026-09-15. The copy of the
# test pack below makes the blocked regime operative, with rows of its own for the OPT
# window (30 days), the latest start (30 days) and the grace period (the test pack's 30
# days), each in force from 2026-09-15. opt.apply_before_days and
# opt.complete_within_months have no regime of their own and are in force from 2000.
BLOCKED_TAKES_EFFECT = "2026-09-15"
BLOCKED_DAYS = 30
OPERATIVE_BLOCKED: dict[str, Any] = with_blocked_regime_operative(
    with_regime_rows(
        with_regime_rows(PACK, "opt.apply_after_days", 60, BLOCKED_DAYS),
        "opt.latest_start_after_days",
        60,
        BLOCKED_DAYS,
    ),
    BLOCKED_TAKES_EFFECT,
)
NOT_IN_FORCE = "rule_not_in_force_on_event_day"


def blocked_run(case: dict[str, Any], today: date = TODAY) -> dict[str, Any]:
    return run(case, today, raw_pack=OPERATIVE_BLOCKED)


# The program ended 2025-09-15, a year before the blocked rows took effect. The card
# 2025-11-01 to 2026-10-31 is running today, so the grace period counts from 2026-10-31,
# after 2026-09-15.
ENDED_BEFORE: dict[str, Any] = {
    "program_end_date": "2025-09-15",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "opt": ead("2025-08-01", "2025-08-10", "2025-11-01", "2026-10-31"),
    "stem": None,
    "employment": [job("2025-11-01", None)],
    "cap_gap": None,
    "time_zone": "UTC",
}
# SPEC-resolutions.md, point 39: the case answers opt.earlier_at_this_level no, so a
# test about something else stays about that.
ENDED_BEFORE = no_earlier_opt(ENDED_BEFORE)

# The program ended 2026-09-20, after the blocked rows took effect. Recommended 2026-09-01,
# filed 2026-09-05, card 2026-09-25 to 2027-09-24 (12 months from 2026-09-25 is
# 2027-09-25; 14 months from 2026-09-20 is 2027-11-20).
ENDED_AFTER: dict[str, Any] = with_changes(
    ENDED_BEFORE,
    program_end_date="2026-09-20",
    opt=ead("2026-09-01", "2026-09-05", "2026-09-25", "2027-09-24"),
    employment=[job("2026-09-25", None)],
)


def test_point_28_the_copy_of_the_pack_is_valid_and_blocked_is_operative():
    operative = [r["id"] for r in OPERATIVE_BLOCKED["regimes"] if r["operative"]]
    assert operative == [BLOCKED]
    assert rule_value(OPERATIVE_BLOCKED, "opt.apply_after_days", BLOCKED) == BLOCKED_DAYS
    validate_pack(OPERATIVE_BLOCKED)
    assert case_problems(ENDED_BEFORE) == []
    assert case_problems(ENDED_AFTER) == []


def test_point_28_a_program_that_ended_before_the_blocked_rows_gets_no_window_close():
    # Looked up on today, the blocked row would give 2025-09-15 plus 30, 2025-10-15. On the
    # day of the program end no operative row is in force, so the item is null.
    out = blocked_run(ENDED_BEFORE)
    assert values(out)["opt.apply_window_closes"] is None


def test_point_28_a_program_that_ended_before_the_blocked_rows_gets_no_latest_start():
    out = blocked_run(ENDED_BEFORE)
    assert values(out)["opt.latest_start"] is None


def test_point_28_no_operative_row_on_the_event_day_is_a_judgement_item():
    out = blocked_run(ENDED_BEFORE)
    assert out["verdict"]["state"] == "talk_to_dso"
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert contract_problems(out) == []


def test_point_28_rules_in_force_on_the_event_day_still_give_their_dates():
    out = blocked_run(ENDED_BEFORE)
    # 90 days before 2025-09-15 is 2025-06-17 (15 to Aug 31, 31 to Jul 31, 31 to Jun 30,
    # 13 more). 14 months from 2025-09-15 is 2026-11-15.
    assert values(out)["opt.apply_window_opens"] == "2025-06-17"
    assert values(out)["opt.complete_by"] == "2026-11-15"
    # The grace period counts from the card end, 2026-10-31, on which the blocked row is
    # in force: 30 days on is 2026-11-30.
    assert values(out)["grace.ends"] == "2026-11-30"


def test_point_28_a_program_that_ended_after_the_blocked_rows_gets_their_dates():
    out = blocked_run(ENDED_AFTER)
    # 2026-09-20 plus 30 days: 10 days reach Sep 30, 20 more 2026-10-20.
    assert values(out)["opt.apply_window_closes"] == "2026-10-20"
    assert values(out)["opt.latest_start"] == "2026-10-20"
    assert NOT_IN_FORCE not in out["verdict"]["reasons"]


def grace_case(card_end: date) -> dict[str, Any]:
    # Program end 2025-09-01, card from 2025-09-21 (12 months on is 2026-09-21, so a card
    # to 2026-09-20 is not longer than its rule; 14 months from the program end is
    # 2026-11-01). The period ends with the card: SPEC-resolutions.md, points 43 and 52,
    # one still open after the card would be a conflict and null grace.ends. Its end was
    # reported (point 22, periods_answered).
    return periods_answered(
        with_changes(
            ENDED_BEFORE,
            program_end_date="2025-09-01",
            opt=ead("2025-08-01", "2025-08-10", "2025-09-21", iso(card_end)),
            employment=[job("2025-09-21", iso(card_end))],
        )
    )


def test_point_28_a_card_that_ended_before_the_blocked_rows_gets_no_grace_date():
    # The card ended 2026-09-10. Looked up on today (2026-09-29), the blocked row would
    # give 2026-09-10 plus 30, 2026-10-10. On 2026-09-10 no operative row is in force.
    out = blocked_run(grace_case(date(2026, 9, 10)))
    assert values(out)["grace.ends"] is None


def test_point_28_a_card_that_ended_after_the_blocked_rows_gets_its_grace_date():
    # The card ended 2026-09-20: 10 days reach Sep 30, 20 more 2026-10-20.
    out = blocked_run(grace_case(date(2026, 9, 20)))
    assert values(out)["grace.ends"] == "2026-10-20"


def shipped() -> Rulepack:
    return next(p for p in load_all() if p.category == "f1")


def test_point_28_the_shipped_pack_changes_nothing():
    # The shipped pack's operative rows (ds_2012) are in force from 2008 and before. The
    # window closes 60 days after 2025-09-15: 15 reach Sep 30, 31 Oct 31, 14 more
    # 2025-11-14. The grace period ends 60 days after 2026-10-31: 30 reach Nov 30, 30 more
    # 2026-12-30.
    out = run(ENDED_BEFORE, pack=shipped())
    assert values(out)["opt.apply_window_closes"] == "2025-11-14"
    assert values(out)["opt.latest_start"] == "2025-11-14"
    assert values(out)["grace.ends"] == "2026-12-30"
    assert NOT_IN_FORCE not in out["verdict"]["reasons"]


def test_point_28_the_shipped_pack_gives_a_program_that_ended_in_2024_its_dates():
    # Program end 2024-05-15: 60 days on, 16 reach May 31, 30 Jun 30, 14 more 2024-07-14.
    case = with_changes(
        ENDED_BEFORE,
        program_end_date="2024-05-15",
        opt=ead("2024-04-01", "2024-04-10", "2024-06-01", "2025-05-31"),
        employment=[job("2024-06-01", "2025-05-31")],
    )
    out = run(case, pack=shipped())
    assert values(out)["opt.apply_window_closes"] == "2024-07-14"
    assert NOT_IN_FORCE not in out["verdict"]["reasons"]


# Point 36: every dated STEM duty whose date has passed is asked about. The sweep's case:
# a new Form I-983 due 2026-07-11 was needs_you on 2026-07-05 and no_open_items from
# 2026-07-12. OPT 2025-03-14 to 2026-03-13, STEM 2026-03-14 to 2028-03-13, program end
# 2025-01-15, as in tests/unit/engine/test_f1_periods_and_reports.py. A new period on the
# STEM card begins 2026-07-01; 10 days on is 2026-07-11. The first validation is
# 2026-09-28, so no other report date has passed in July.
def stem_on(employment: list[dict[str, Any]]) -> dict[str, Any]:
    # SPEC-resolutions.md, point 39: opt.earlier_at_this_level answered no (no_earlier_opt).
    return no_earlier_opt(
        {
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
    )


FIRST_JOB = job("2025-03-14", None)
NEW_JOB = stem_on([FIRST_JOB, job("2026-07-01", None)])
PLAN_DUE = date(2026, 7, 11)
NEW_EMPLOYER = r"employment\.[^.]+\.new_employer"


def new_employer_yes(today: date) -> tuple[dict[str, Any], str]:
    """NEW_JOB with yes to the question of a new employer, given on today, and the id of
    the new plan item for that period (the same n as the question)."""
    out = run(NEW_JOB, today)
    (asked,) = [q for q in question_ids(out) if re.fullmatch(NEW_EMPLOYER, q)]
    case = answer_as_the_screen_does(NEW_JOB, out, today.isoformat(), **{asked: True})
    return case, f"stem.new_plan_due.{asked.split('.')[1]}"


def test_point_36_the_new_plan_date_is_the_one_worked_by_hand():
    case, plan = new_employer_yes(date(2026, 7, 5))
    assert iso(date(2026, 7, 1) + timedelta(days=NEW_PLAN_DAYS)) == "2026-07-11"
    assert values(run(case, date(2026, 7, 5)))[plan] == "2026-07-11"


def test_point_36_before_the_new_plan_date_it_is_an_open_item():
    today = date(2026, 7, 5)
    case, plan = new_employer_yes(today)
    out = run(case, today)
    assert out["verdict"]["state"] == "needs_you"
    assert plan in out["verdict"]["reasons"]
    assert f"{plan}.made" not in question_ids(out)


def test_point_36_on_the_new_plan_date_it_is_not_asked_about():
    case, plan = new_employer_yes(PLAN_DUE)
    out = run(case, PLAN_DUE)
    assert f"{plan}.made" not in question_ids(out)
    assert plan in out["verdict"]["reasons"]


def test_point_36_the_day_after_the_new_plan_date_duly_asks_whether_it_was_made():
    today = PLAN_DUE + ONE_DAY
    case, plan = new_employer_yes(today)
    out = run(case, today)
    made = f"{plan}.made"
    assert made in question_ids(out)
    assert {plan, "2026-07-11"} <= said(question(out, made)["about"])
    # Before this point the verdict went to no_open_items.
    assert out["verdict"]["state"] == "cannot_tell"
    assert f"unconfirmed:{made}" in out["verdict"]["reasons"]
    assert contract_problems(out) == []


def test_point_36_yes_makes_the_new_plan_done():
    today = PLAN_DUE + ONE_DAY
    case, plan = new_employer_yes(today)
    made = f"{plan}.made"
    out = run(answered(case, today, **{made: True}), today)
    assert made not in question_ids(out)
    assert out["verdict"]["state"] == "no_open_items"
    assert f"{plan}.not_made" not in out["verdict"]["reasons"]


def test_point_36_no_sends_the_person_to_the_dso():
    today = PLAN_DUE + ONE_DAY
    case, plan = new_employer_yes(today)
    out = run(answered(case, today, **{f"{plan}.made": False}), today)
    assert out["verdict"]["state"] == "talk_to_dso"
    assert f"{plan}.not_made" in out["verdict"]["reasons"]
    assert all(" " not in reason for reason in out["verdict"]["reasons"])


@settings(deadline=None, max_examples=25)
@given(st.dates(min_value=date(2026, 7, 2), max_value=date(2026, 8, 31)))
def test_point_36_the_question_is_asked_when_and_only_when_the_date_has_passed(today):
    # The new period begins 2026-07-01, so the question of a new employer can be answered
    # from 2026-07-02 on. No other report date passes before 2026-09-28.
    case, plan = new_employer_yes(today)
    assert (f"{plan}.made" in question_ids(run(case, today))) is (today > PLAN_DUE)


# Point 36, the concluding evaluation: a period on the STEM card from 2026-04-01 to
# 2026-07-20. 10 days on is 2026-07-30; on 2026-08-01 it has passed. The period is not with
# a new employer and its end was reported, so only the question of the evaluation is left.
ENDED_JOB = stem_on([FIRST_JOB, job("2026-04-01", "2026-07-20")])
EVALUATION_DAY = date(2026, 8, 1)


def ended_job_answered() -> dict[str, Any]:
    out = run(ENDED_JOB, EVALUATION_DAY)
    given_answers = {
        q: q.endswith(".end_reported")
        for q in question_ids(out)
        if re.fullmatch(r"employment\.[^.]+\.(new_employer|end_reported)", q)
    }
    return answer_as_the_screen_does(ENDED_JOB, out, EVALUATION_DAY.isoformat(), **given_answers)


def test_point_36_a_passed_concluding_evaluation_is_asked_about():
    assert iso(date(2026, 7, 20) + timedelta(days=EVALUATION_DAYS)) == "2026-07-30"
    out = run(ended_job_answered(), EVALUATION_DAY)
    pattern = r"stem\.concluding_evaluation_due\.[^.]+\.made"
    made = [q for q in question_ids(out) if re.fullmatch(pattern, q)]
    assert len(made) == 1
    item_id = made[0].removesuffix(".made")
    assert values(out)[item_id] == "2026-07-30"
    assert {item_id, "2026-07-30"} <= said(question(out, made[0])["about"])
    assert out["verdict"]["state"] == "cannot_tell"


def test_point_36_no_to_a_concluding_evaluation_sends_the_person_to_the_dso():
    case = ended_job_answered()
    out = run(case, EVALUATION_DAY)
    (made,) = [q for q in question_ids(out) if q.startswith("stem.concluding_evaluation_due.")]
    out = run(answered(case, EVALUATION_DAY, **{made: False}), EVALUATION_DAY)
    assert out["verdict"]["state"] == "talk_to_dso"
    assert f"{made.removesuffix('.made')}.not_made" in out["verdict"]["reasons"]
