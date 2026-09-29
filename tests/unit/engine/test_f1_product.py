"""engine/f1.py after product round 1.

Specified in specs/product-1/SPEC.md, sections 1 to 6, DECISIONS.md D41, PRINCIPLES.md
sections 1 to 3, and the contracts:
  1. Facts that do not fit are a conflict and a question, never the quiet verdict.
  2. Nothing entered is not nothing to record.
  3. An answer holds for what it was given for, on the day it was given.
  4. A date matters only while it can still matter.
  5. A reading is marked wherever it is shown.
  6. What comes next.

The inputs of reviews/phase-2-second.md, findings 1, 4, 5 and 6, are each a test here.

Every expected date and count was worked out by hand. The working is beside it.
Where the SPEC leaves a point open, the tests say which side they take, and the point is
listed in tests/PROGRESS.md under "Questions".
"""

import copy
import functools
from datetime import date, timedelta
from typing import Any

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from engine.rulepack import validate_pack
from tests.support.f1_pack import (
    BLOCKED,
    CONFLICT_IDS,
    CPT_USED,
    LISTED_RULES,
    NO_EMPLOYMENT,
    NOTHING_MORE,
    QUESTION_IDS,
    SHIFTED,
    STEM_LIST,
    answer_as_the_screen_does,
    answers,
    answers_with_no_about,
    build_pack,
    cap_gap,
    case_problems,
    clock_at,
    clock_on,
    conflicts,
    conflicts_by_the_table,
    contract_problems,
    ead,
    items,
    job,
    months_later,
    pack_dict,
    question,
    question_ids,
    reasons_with,
    refuse_placeholders,
    said,
    upcoming,
    values,
    with_block,
    with_changes,
    with_derivation,
    with_the_about_asked,
)

TODAY = date(2026, 9, 28)  # a Monday
CHECKED_ON = "2026-09-28"

# reviews/phase-2-second.md: the clock is 2026-09-28 18:00 UTC and the zone is
# America/Los_Angeles, 7 hours behind in September: 11:00 on 2026-09-28.
REVIEW_INSTANT = "2026-09-28T18:00"
REVIEW_ZONE = "America/Los_Angeles"

COUNTS = (
    "unemployment.days_used",
    "unemployment.days_remaining",
    "employment.days_under_hours",
)

# Section 4, the table.
DONE_WITH_OPT = (
    "opt.apply_window_opens",
    "opt.apply_window_closes",
    "opt.file_by",
    "opt.latest_start",
)
DONE_WITH_STEM = ("stem.apply_window_opens", "stem.apply_window_closes", "stem.file_by")

# Section 6, the table.
NEXT_IDS = (
    "next.stem.apply_window_opens",
    "next.stem.apply_window_closes",
    "next.opt.card_ends",
)
# SPEC-resolutions.md, point 12: next.grace.ends is removed. grace.ends is in upcoming
# whenever it lies after today, once.


def parsed(case: dict[str, Any], clock: Any) -> Any:
    """Section 3: parse_case refuses an answer dated after today. SPEC-resolutions.md,
    point 8: it learns the day from the clock, passed as `parse_case(raw, clock)`."""
    return f1.parse_case(refuse_placeholders(case), clock)


def run(
    case: dict[str, Any],
    today: date = TODAY,
    clock: Any = None,
    raw_pack: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compute a case. The clock stands at noon UTC on today unless one is passed. The
    rules were checked on the day of the clock, so their age never decides a verdict."""
    assert case_problems(case) == [], "the test case itself must match the case contract"
    clock = clock or clock_on(today)
    checked = clock.now().date()
    pack = build_pack(checked) if raw_pack is None else validate_pack(raw_pack)
    return f1.compute_f1(parsed(case, clock), pack, clock)


def review(case: dict[str, Any]) -> dict[str, Any]:
    """A case as the reviewer sent it: their clock and their zone."""
    return run(with_changes(case, time_zone=REVIEW_ZONE), clock=clock_at(REVIEW_INSTANT))


def yes_to_all(case: dict[str, Any], today: date = TODAY, **kwargs: Any) -> dict[str, Any]:
    """The case with the answer yes to every question the engine asks about it, each
    carrying the about of its question."""
    out = run(case, today=today, **kwargs)
    given_yes = dict.fromkeys(question_ids(out), True)
    return answer_as_the_screen_does(case, out, today.isoformat(), **given_yes)


# The cases. Each has every part entered or answered for, so nothing but the fact under
# test can stop Duly from knowing.

# OPT in hand. 12 months from 2025-11-01 is 2026-11-01, so a card through 2026-10-31
# runs 12 months when both ends are counted.
FITS: dict[str, Any] = {
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

# The OPT card begins after 2026-09-28, so a filing dated the day after today is still
# before the card. No employment: the window has not begun.
AHEAD: dict[str, Any] = with_changes(
    FITS,
    program_end_date="2026-09-15",
    opt=ead("2026-09-01", "2026-09-05", "2026-11-01", "2027-10-31"),
    employment=[],
)

# The STEM card begins after 2026-09-28, the day after the OPT card ends.
# 24 months from 2026-10-16 is 2028-10-16, so the card runs through 2028-10-15.
STEM_AHEAD: dict[str, Any] = with_changes(
    FITS,
    opt=ead("2025-08-01", "2025-08-10", "2025-10-16", "2026-10-15"),
    stem=ead("2026-08-01", "2026-08-10", "2026-10-16", "2028-10-15"),
    employment=[job("2025-10-16", None)],
)

# The STEM card is in hand. 24 months from 2024-11-01 is 2026-11-01.
STEM_NOW: dict[str, Any] = with_changes(
    FITS,
    program_end_date="2023-09-15",
    opt=ead("2023-08-01", "2023-08-10", "2023-11-01", "2024-10-31"),
    stem=ead("2024-08-15", "2024-08-20", "2024-11-01", "2026-10-31"),
    employment=[job("2023-11-01", None)],
)

# STEM_NOW with no employment on 2024-11-01, so that a STEM card which begins a day
# later leaves no employment between the cards.
TWO_JOBS: dict[str, Any] = with_changes(
    STEM_NOW, employment=[job("2023-11-01", "2024-10-31"), job("2024-11-02", None)]
)

PETITION: dict[str, Any] = with_changes(
    FITS, cap_gap=cap_gap("2026-10-01", status="approved", petition_filed_on="2026-04-02")
)

# Section 1, the table. For each row: the day of the test, the input that raises the
# conflict, the input one day to the safe side, and the values that do not fit.
# For the two rows on the length of a card the safe input is two days away. See
# test_a_card_that_ends_on_the_day_the_months_end_is_left_open.
ROWS: dict[str, tuple[date, dict[str, Any], dict[str, Any], set[str]]] = {
    # Today is 2026-09-28. The day after is 2026-09-29.
    "opt.i765_filed_date.after_today": (
        TODAY,
        with_block(AHEAD, "opt", i765_filed_date="2026-09-29"),
        with_block(AHEAD, "opt", i765_filed_date="2026-09-28"),
        {"2026-09-29"},
    ),
    "stem.i765_filed_date.after_today": (
        TODAY,
        with_block(STEM_AHEAD, "stem", i765_filed_date="2026-09-29"),
        with_block(STEM_AHEAD, "stem", i765_filed_date="2026-09-28"),
        {"2026-09-29"},
    ),
    "opt.dso_recommendation_date.after_today": (
        TODAY,
        with_block(AHEAD, "opt", dso_recommendation_date="2026-09-29"),
        with_block(AHEAD, "opt", dso_recommendation_date="2026-09-28"),
        {"2026-09-29"},
    ),
    "stem.dso_recommendation_date.after_today": (
        TODAY,
        with_block(STEM_AHEAD, "stem", dso_recommendation_date="2026-09-29"),
        with_block(STEM_AHEAD, "stem", dso_recommendation_date="2026-09-28"),
        {"2026-09-29"},
    ),
    # The start asked for is 2026-10-01, after both filing dates.
    "cap_gap.petition_filed_on.after_today": (
        TODAY,
        with_block(PETITION, "cap_gap", petition_filed_on="2026-09-29"),
        with_block(PETITION, "cap_gap", petition_filed_on="2026-09-28"),
        {"2026-09-29"},
    ),
    # The OPT card begins on 2025-11-01.
    "opt.i765_filed_date.after_card": (
        TODAY,
        with_block(FITS, "opt", i765_filed_date="2025-11-02"),
        with_block(FITS, "opt", i765_filed_date="2025-11-01"),
        {"2025-11-02", "2025-11-01"},
    ),
    # The STEM card begins on 2024-11-01.
    "stem.i765_filed_date.after_card": (
        TODAY,
        with_block(STEM_NOW, "stem", i765_filed_date="2024-11-02"),
        with_block(STEM_NOW, "stem", i765_filed_date="2024-11-01"),
        {"2024-11-02", "2024-11-01"},
    ),
    # Today is 2026-10-05, so neither filing date is after today.
    "cap_gap.petition_filed_on.after_start": (
        date(2026, 10, 5),
        with_block(PETITION, "cap_gap", petition_filed_on="2026-10-02"),
        with_block(PETITION, "cap_gap", petition_filed_on="2026-10-01"),
        {"2026-10-02", "2026-10-01"},
    ),
    # The first card begins on 2025-11-01. The petition is dated 2025-04-02, before
    # both starts.
    "cap_gap.requested_start.before_training": (
        TODAY,
        with_changes(
            FITS, cap_gap=cap_gap("2025-10-31", status="approved", petition_filed_on="2025-04-02")
        ),
        with_changes(
            FITS, cap_gap=cap_gap("2025-11-01", status="approved", petition_filed_on="2025-04-02")
        ),
        {"2025-10-31", "2025-11-01"},
    ),
    # 12 months from 2025-11-01 is 2026-11-01. The day after is 2026-11-02, the day
    # before is 2026-10-31.
    "opt.card_longer_than_rule": (
        TODAY,
        with_block(FITS, "opt", ead_end="2026-11-02"),
        with_block(FITS, "opt", ead_end="2026-10-31"),
        {"2025-11-01", "2026-11-02"},
    ),
    # 24 months from 2024-11-01 is 2026-11-01.
    "stem.card_longer_than_rule": (
        TODAY,
        with_block(STEM_NOW, "stem", ead_end="2026-11-02"),
        with_block(STEM_NOW, "stem", ead_end="2026-10-31"),
        {"2024-11-01", "2026-11-02"},
    ),
    # The OPT card ends on 2024-10-31. One day after is 2024-11-01, two is 2024-11-02.
    "stem.gap_after_opt": (
        TODAY,
        with_block(TWO_JOBS, "stem", ead_start="2024-11-02"),
        with_block(TWO_JOBS, "stem", ead_start="2024-11-01"),
        {"2024-10-31", "2024-11-02"},
    ),
    # The only card begins on 2025-11-01. 2025-10-31 is outside it.
    "employment.period_outside_cards": (
        TODAY,
        with_changes(FITS, employment=[job("2025-10-31", None)]),
        with_changes(FITS, employment=[job("2025-11-01", None)]),
        {"2025-10-31"},
    ),
}

ROW_IDS = list(ROWS)


def test_the_rows_tested_are_the_rows_of_the_table():
    assert tuple(ROWS) == CONFLICT_IDS
    assert len(CONFLICT_IDS) == 13


# Section 1: facts that do not fit


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_facts_that_do_not_fit_are_cannot_tell_with_the_reason(conflict):
    today, raises, _, _ = ROWS[conflict]
    out = run(raises, today=today)
    assert out["verdict"]["state"] == "cannot_tell"
    assert f"conflict:{conflict}" in out["verdict"]["reasons"]
    # The case is built so that nothing else in it fails to fit.
    assert conflicts(out) == [conflict]


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_facts_that_do_not_fit_raise_a_question_with_the_same_id(conflict):
    today, raises, _, _ = ROWS[conflict]
    out = run(raises, today=today)
    assert question_ids(out) == [conflict]
    assert question(out, conflict)["because"]


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_the_question_holds_the_values_that_do_not_fit(conflict):
    today, raises, _, not_fitting = ROWS[conflict]
    about = question(run(raises, today=today), conflict)["about"]
    assert not_fitting <= said(about)


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_one_day_to_the_safe_side_the_facts_fit(conflict):
    today, _, safe, _ = ROWS[conflict]
    out = run(safe, today=today)
    assert conflicts(out) == []
    assert set(question_ids(out)).isdisjoint(CONFLICT_IDS)
    assert out["verdict"]["state"] != "cannot_tell"
    assert contract_problems(out) == []


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_the_answer_yes_sends_the_person_to_the_dso(conflict):
    today, raises, _, _ = ROWS[conflict]
    asked = run(raises, today=today)
    answered = answer_as_the_screen_does(raises, asked, today.isoformat(), **{conflict: True})
    out = run(answered, today=today)
    assert out["verdict"]["state"] == "talk_to_dso"
    assert conflict in out["verdict"]["reasons"]
    assert reasons_with(out, "conflict:") == []
    assert conflict not in question_ids(out)


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_the_answer_no_leaves_the_verdict_at_cannot_tell(conflict):
    today, raises, _, _ = ROWS[conflict]
    asked = run(raises, today=today)
    answered = answer_as_the_screen_does(raises, asked, today.isoformat(), **{conflict: False})
    out = run(answered, today=today)
    assert out["verdict"]["state"] == "cannot_tell"
    assert f"conflict:{conflict}" in out["verdict"]["reasons"]


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_the_answer_yes_to_another_row_leaves_this_one_open(conflict):
    today, raises, _, _ = ROWS[conflict]
    other = ROW_IDS[(ROW_IDS.index(conflict) + 1) % len(ROW_IDS)]
    # The case is run on the row's own day, the day the answer is dated: an answer dated
    # after the day of the case is refused (SPEC-resolutions.md, point 2). The answer
    # carries the about of the question this row raised (point 7), so only its id is
    # wrong: an answer is read for the question it names.
    about = question(run(raises, today=today), conflict)["about"]
    given = {other: {"answer": True, "on": today.isoformat(), "about": about}}
    out = run(with_changes(raises, confirmations=given), today=today)
    assert out["verdict"]["state"] == "cannot_tell"
    assert conflicts(out) == [conflict]
    assert question_ids(out) == [conflict]


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_the_answer_yes_states_nothing_about_what_the_dates_mean(conflict):
    # Section 1: "Duly computes what it can and says nothing about what the dates mean."
    # The reasons hold ids. No reason is a sentence.
    today, raises, _, _ = ROWS[conflict]
    asked = run(raises, today=today)
    answered = answer_as_the_screen_does(raises, asked, today.isoformat(), **{conflict: True})
    out = run(answered, today=today)
    assert all(" " not in reason for reason in out["verdict"]["reasons"])
    assert set(out) == {
        "computed",
        "lists",
        "questions",
        "rulepacks",
        "rules",
        "scope",
        "today",
        "upcoming",
        "verdict",
    }


# Items that use the dates of a conflict. The inputs of each item are those the engine
# showed before this round: grace.ends rests on the last end date, the counts on the
# cards, capgap.ends on the start the petition asks for.
NULLED = [
    ("opt.card_longer_than_rule", ("grace.ends", *COUNTS)),
    ("stem.card_longer_than_rule", ("grace.ends", *COUNTS)),
    ("stem.gap_after_opt", COUNTS),
    ("employment.period_outside_cards", COUNTS),
    ("cap_gap.requested_start.before_training", ("capgap.ends",)),
]


@pytest.mark.parametrize(("conflict", "item_ids"), NULLED, ids=[row[0] for row in NULLED])
def test_while_a_conflict_is_open_the_items_that_use_its_dates_are_null(conflict, item_ids):
    today, raises, safe, _ = ROWS[conflict]
    got = items(run(raises, today=today))
    before = items(run(safe, today=today))
    for item_id in item_ids:
        assert before[item_id]["value"] is not None, item_id
        assert got[item_id]["value"] is None, item_id


@pytest.mark.parametrize(("conflict", "item_ids"), NULLED, ids=[row[0] for row in NULLED])
def test_while_a_conflict_is_open_no_date_that_rests_on_it_is_in_what_comes_next(
    conflict, item_ids
):
    today, raises, _, _ = ROWS[conflict]
    out = run(raises, today=today)
    assert set(item_ids).isdisjoint(upcoming(out))
    if conflict == "opt.card_longer_than_rule":
        # Section 6: the four dates of the next step are computed from the OPT card.
        assert set(NEXT_IDS).isdisjoint(upcoming(out))


def test_the_output_of_a_conflict_follows_the_contract():
    # contracts/engine_output.schema.json. See "Disputes" in tests/PROGRESS.md: the
    # contract allows no dot in the id of a question, and section 1 gives the question
    # the id of the conflict, which holds dots.
    today, raises, _, _ = ROWS["opt.card_longer_than_rule"]
    assert contract_problems(run(raises, today=today)) == []


def test_a_card_that_ends_on_the_day_the_months_end_is_left_open():
    # 12 months from 2025-11-01 is 2026-11-01. A card through 2026-11-01 runs 12 months
    # and a day when both ends are counted, and 12 months when they are not. The SPEC
    # does not say which. Either way the verdict is never the quiet one by mistake:
    # if the engine calls it a conflict, it asks.
    out = run(with_block(FITS, "opt", ead_end="2026-11-01"))
    if conflicts(out):
        assert conflicts(out) == ["opt.card_longer_than_rule"]
        assert out["verdict"]["state"] == "cannot_tell"
        assert question_ids(out) == ["opt.card_longer_than_rule"]
    else:
        assert question_ids(out) == []


def test_the_months_of_a_card_come_from_the_pack():
    # CLAUDE.md: the engine owns no number. With opt.max_months at 13 in the pack,
    # 13 months from 2025-11-01 is 2026-12-01, and a card through 2026-11-02 is shorter.
    today, raises, _, _ = ROWS["opt.card_longer_than_rule"]
    longer = pack_dict(CHECKED_ON, values={("opt.max_months", ""): 13})
    assert conflicts(run(raises, today=today, raw_pack=longer)) == []
    # With stem.extension_months at 23, 23 months from 2024-11-01 is 2026-10-01, and
    # the card through 2026-10-31 that fitted under 24 is longer.
    _, _, safe, _ = ROWS["stem.card_longer_than_rule"]
    shorter = pack_dict(CHECKED_ON, values={("stem.extension_months", ""): 23})
    assert conflicts(run(safe, raw_pack=shorter)) == ["stem.card_longer_than_rule"]


def test_an_open_period_may_run_past_the_end_of_the_last_card():
    # Section 1, the last row: "other than days after the last card ends while the
    # period is open". The card ends on 2026-10-31. Today is 2026-11-05.
    out = run(FITS, today=date(2026, 11, 5))
    assert conflicts(out) == []
    assert set(question_ids(out)).isdisjoint(CONFLICT_IDS)


def test_a_closed_period_may_not_run_past_the_end_of_the_last_card():
    # The card ends on 2026-10-31. A period that ends on 2026-11-01 has one day outside.
    today = date(2026, 11, 5)
    past = run(with_changes(FITS, employment=[job("2025-11-01", "2026-11-01")]), today=today)
    assert conflicts(past) == ["employment.period_outside_cards"]
    assert past["verdict"]["state"] == "cannot_tell"
    within = run(with_changes(FITS, employment=[job("2025-11-01", "2026-10-31")]), today=today)
    assert conflicts(within) == []


# reviews/phase-2-second.md, finding 1. Every input has degree_level master,
# documents_count 2, and one open period at 40 hours, reported, from the OPT start.

REVIEW_OPT: dict[str, Any] = with_changes(
    FITS, opt=ead(None, None, "2025-11-01", "2026-10-31"), time_zone=REVIEW_ZONE
)


def test_review_1_a_filing_dated_2030():
    # 2030-01-01 is after today, 2026-09-28, and after the card, which begins 2025-11-01.
    out = review(with_block(REVIEW_OPT, "opt", i765_filed_date="2030-01-01"))
    assert out["verdict"]["state"] == "cannot_tell"
    assert set(conflicts(out)) == {
        "opt.i765_filed_date.after_today",
        "opt.i765_filed_date.after_card",
    }
    assert sorted(question_ids(out)) == sorted(conflicts(out))


def test_review_1_a_petition_filed_after_today_and_after_its_own_start():
    # Filed 2027-03-01, start asked for 2026-10-01, today 2026-09-28.
    petition = cap_gap("2026-10-01", status="approved", petition_filed_on="2027-03-01")
    out = review(with_changes(REVIEW_OPT, cap_gap=petition))
    assert out["verdict"]["state"] == "cannot_tell"
    assert set(conflicts(out)) == {
        "cap_gap.petition_filed_on.after_today",
        "cap_gap.petition_filed_on.after_start",
    }
    assert sorted(question_ids(out)) == sorted(conflicts(out))
    # The reviewer saw capgap.ends shown as 2026-10-01.
    assert items(out)["capgap.ends"]["value"] is None
    assert "capgap.ends" not in upcoming(out)


def test_review_1_a_petition_five_years_before_the_opt_began():
    # Start asked for 2020-10-01. The first card begins 2025-11-01.
    petition = cap_gap("2020-10-01", status="approved", petition_filed_on="2020-01-01")
    out = review(with_changes(REVIEW_OPT, cap_gap=petition))
    assert out["verdict"]["state"] == "cannot_tell"
    assert conflicts(out) == ["cap_gap.requested_start.before_training"]
    assert question_ids(out) == ["cap_gap.requested_start.before_training"]
    # The reviewer saw capgap.ends shown as 2020-10-01.
    assert items(out)["capgap.ends"]["value"] is None


def test_review_1_a_stem_card_of_five_years():
    # 24 months from 2024-11-01 is 2026-11-01. The card runs through 2029-10-31.
    case = with_changes(
        REVIEW_OPT,
        program_end_date="2023-09-15",
        opt=ead(None, None, "2023-11-01", "2024-10-31"),
        stem=ead(None, None, "2024-11-01", "2029-10-31"),
        employment=[job("2023-11-01", None)],
    )
    out = review(case)
    assert out["verdict"]["state"] == "cannot_tell"
    assert conflicts(out) == ["stem.card_longer_than_rule"]
    assert question_ids(out) == ["stem.card_longer_than_rule"]
    # The reviewer saw grace.ends shown as 2029-12-30.
    assert items(out)["grace.ends"]["value"] is None
    assert "grace.ends" not in upcoming(out)


def test_review_1_an_opt_card_of_three_years():
    # 12 months from 2025-11-01 is 2026-11-01. The card runs through 2028-10-31.
    out = review(with_block(REVIEW_OPT, "opt", ead_end="2028-10-31"))
    assert out["verdict"]["state"] == "cannot_tell"
    assert conflicts(out) == ["opt.card_longer_than_rule"]
    assert question_ids(out) == ["opt.card_longer_than_rule"]


# OPT 2024-11-01 to 2025-10-31, STEM 2026-03-01 to 2028-02-29. 24 months from
# 2026-03-01 is 2028-03-01, so the STEM card is not longer than the rule.
FOUR_MONTHS: dict[str, Any] = with_changes(
    REVIEW_OPT,
    program_end_date="2024-09-15",
    opt=ead(None, None, "2024-11-01", "2025-10-31"),
    stem=ead(None, None, "2026-03-01", "2028-02-29"),
    employment=[job("2024-11-01", None)],
)


def test_review_1_four_months_between_the_two_cards():
    # The open period covers 2025-11-01 through 2026-02-28, which no card covers.
    out = review(FOUR_MONTHS)
    assert out["verdict"]["state"] == "cannot_tell"
    assert set(conflicts(out)) == {"stem.gap_after_opt", "employment.period_outside_cards"}
    assert sorted(question_ids(out)) == sorted(conflicts(out))
    got = items(out)
    for item_id in COUNTS:
        assert got[item_id]["value"] is None, item_id


# OPT 2024-07-01 to 2025-06-30, STEM 2025-10-01 to 2027-09-30. Employment stops at the
# OPT end and starts again at the STEM start. Between them lie July (31), August (31)
# and September (30): 92 days.
HOLE: dict[str, Any] = with_changes(
    REVIEW_OPT,
    program_end_date="2024-05-15",
    opt=ead(None, None, "2024-07-01", "2025-06-30"),
    stem=ead(None, None, "2025-10-01", "2027-09-30"),
    employment=[job("2024-07-01", "2025-06-30"), job("2025-10-01", None)],
)


def test_review_1_a_hole_of_92_days_between_the_cards_is_asked_about():
    out = review(HOLE)
    assert out["verdict"]["state"] == "cannot_tell"
    assert conflicts(out) == ["stem.gap_after_opt"]
    assert question_ids(out) == ["stem.gap_after_opt"]
    assert {"2025-06-30", "2025-10-01"} <= said(question(out, "stem.gap_after_opt")["about"])
    # The reviewer saw days_used 92, every one of them outside both cards.
    assert items(out)["unemployment.days_used"]["value"] is None


def answered_in_review(case: dict[str, Any], **given_answers: bool) -> dict[str, Any]:
    asked = review(case)
    return review(answer_as_the_screen_does(case, asked, "2026-09-28", **given_answers))


def test_days_between_two_cards_are_never_counted_as_unemployed():
    out = answered_in_review(HOLE, **{"stem.gap_after_opt": True})
    assert out["verdict"]["state"] == "talk_to_dso"
    assert "stem.gap_after_opt" in out["verdict"]["reasons"]
    got = values(out)
    # Every day inside a card is covered by a period at 40 hours. The 92 days of the
    # hole are outside the counting window.
    assert got["unemployment.days_used"] == 0
    # Today is in the STEM card, where the limit is 150. 150 - 0 = 150.
    assert got["unemployment.days_remaining"] == 150
    assert got["employment.days_under_hours"] == 0


def test_days_without_an_employer_are_counted_inside_the_cards_only():
    # The first period ends 2025-06-20: June 21 through June 30 is 10 days inside the
    # OPT card. The second begins 2025-10-11: October 1 through October 10 is 10 days
    # inside the STEM card. 10 + 10 = 20. With the 92 days of the hole it would be 112.
    case = with_changes(HOLE, employment=[job("2024-07-01", "2025-06-20"), job("2025-10-11", None)])
    out = answered_in_review(case, **{"stem.gap_after_opt": True})
    got = values(out)
    assert got["unemployment.days_used"] == 20
    # 150 - 20 = 130.
    assert got["unemployment.days_remaining"] == 130


def test_days_between_two_cards_are_never_counted_as_employed():
    # FOUR_MONTHS: one open period at 10 hours from 2024-11-01, under the 20 hours of
    # both thresholds. Days under hours inside the cards:
    # the OPT card, 2024-11-01 through 2025-10-31, is 365 days;
    # the STEM card from 2026-03-01 through today, 2026-09-28: March 31, April 30,
    # May 31, June 30, July 31, August 31, September 28 = 212 days. 365 + 212 = 577.
    # With the days between the cards, 2025-11-01 through 2026-02-28
    # (30 + 31 + 31 + 28 = 120), it would be 697.
    case = with_changes(FOUR_MONTHS, employment=[job("2024-11-01", None, hours=10)])
    given_yes = {"stem.gap_after_opt": True, "employment.period_outside_cards": True}
    out = answered_in_review(case, **given_yes)
    got = values(out)
    assert got["employment.days_under_hours"] == 577
    assert got["unemployment.days_used"] == 0
    assert out["verdict"]["state"] == "talk_to_dso"
    assert set(given_yes) <= set(out["verdict"]["reasons"])


# Section 2: nothing entered is not nothing to record (D41)

# reviews/phase-2-second.md, finding 4: the whole body the reviewer sent.
NOTHING: dict[str, Any] = {
    "program_end_date": "2026-12-15",
    "degree_level": "master",
    "documents_count": 2,
    "employment": [],
    "time_zone": REVIEW_ZONE,
}

# The same, with the CPT days entered, so that one question is left.
IN_PROGRAM: dict[str, Any] = with_changes(NOTHING, cpt_full_time_days=0)


def unconfirmed(output: dict[str, Any]) -> list[str]:
    return [r.removeprefix("unconfirmed:") for r in reasons_with(output, "unconfirmed:")]


def test_review_4_the_body_with_nothing_entered_asks_twice_and_cannot_tell():
    out = review(NOTHING)
    assert out["verdict"]["state"] == "cannot_tell"
    assert sorted(question_ids(out)) == sorted([NOTHING_MORE, CPT_USED])
    assert sorted(unconfirmed(out)) == sorted([NOTHING_MORE, CPT_USED])
    assert contract_problems(out) == []


def test_review_4_nothing_entered_is_never_shown_as_zero_days():
    out = review(NOTHING)
    got = items(out)
    if "cpt.full_time_days_used" in got:
        assert got["cpt.full_time_days_used"]["value"] is None
        assert got["cpt.full_time_days_used"]["inputs"].get("cpt_full_time_days") is None


@pytest.mark.parametrize("shape", ["absent", "null"])
def test_no_training_entered_asks_whether_there_is_more_to_record(shape):
    case = dict(IN_PROGRAM)
    if shape == "null":
        case |= {"opt": None, "stem": None, "cap_gap": None}
    out = review(case)
    assert question_ids(out) == [NOTHING_MORE]
    assert out["verdict"]["state"] == "cannot_tell"
    assert unconfirmed(out) == [NOTHING_MORE]
    assert question(out, NOTHING_MORE)["because"]


def said_of_training(case: dict[str, Any], answer: bool) -> dict[str, Any]:
    """The case with the person's answer to nothing_more_to_record, given today and
    carrying the about of the question. SPEC-resolutions.md, point 7: an answer with no
    about is not an answer."""
    asked = review(case)
    return answer_as_the_screen_does(case, asked, "2026-09-28", **{NOTHING_MORE: answer})


def test_the_answer_yes_decides_the_verdict_on_what_was_entered():
    # The program ends on 2026-12-15, after today. Two documents, rules checked today.
    # Nothing that was entered is open.
    out = review(said_of_training(IN_PROGRAM, True))
    assert question_ids(out) == []
    assert out["verdict"] == {"state": "no_open_items", "reasons": []}
    assert contract_problems(out) == []


def test_the_answer_no_names_training_as_missing():
    out = review(said_of_training(IN_PROGRAM, False))
    assert out["verdict"]["state"] == "cannot_tell"
    assert "missing:training" in out["verdict"]["reasons"]
    assert NOTHING_MORE not in question_ids(out)


def test_the_answer_yes_does_not_hide_what_else_stops_duly_from_knowing():
    out = review(said_of_training(with_changes(IN_PROGRAM, documents_count=0), True))
    assert out["verdict"]["state"] == "cannot_tell"
    assert "no_documents" in out["verdict"]["reasons"]


@pytest.mark.parametrize(
    "entered",
    [
        {"opt": FITS["opt"], "employment": FITS["employment"], "program_end_date": "2025-09-15"},
        {"stem": STEM_NOW["stem"]},
        {"cap_gap": cap_gap("2026-10-01")},
    ],
    ids=["opt", "stem", "cap_gap"],
)
def test_any_part_entered_means_the_question_is_not_raised(entered):
    out = review(with_changes(IN_PROGRAM, **entered))
    assert NOTHING_MORE not in question_ids(out)
    assert NOTHING_MORE not in unconfirmed(out)


@pytest.mark.parametrize("shape", ["absent", "null"])
def test_cpt_days_not_entered_asks_whether_full_time_cpt_was_used(shape):
    case = {k: v for k, v in FITS.items() if k != "cpt_full_time_days"}
    if shape == "null":
        case["cpt_full_time_days"] = None
    out = run(case)
    assert question_ids(out) == [CPT_USED]
    assert out["verdict"]["state"] == "cannot_tell"
    assert unconfirmed(out) == [CPT_USED]
    got = items(out)
    if "cpt.full_time_days_used" in got:
        assert got["cpt.full_time_days_used"]["value"] is None


def test_parse_case_keeps_cpt_days_that_were_not_entered_as_not_entered():
    # contracts/case_f1.schema.json: "Absent or null means nothing was entered. It is
    # never taken as zero."
    absent = {k: v for k, v in FITS.items() if k != "cpt_full_time_days"}
    assert parsed(absent, clock_on(TODAY)).cpt_full_time_days is None
    null = with_changes(FITS, cpt_full_time_days=None)
    assert parsed(null, clock_on(TODAY)).cpt_full_time_days is None
    assert parsed(FITS, clock_on(TODAY)).cpt_full_time_days == 0


def test_the_answer_no_makes_the_cpt_days_zero_as_the_persons_own_statement():
    case = with_changes(FITS, cpt_full_time_days=None)
    out = run(answer_as_the_screen_does(case, run(case), "2026-09-28", **{CPT_USED: False}))
    assert question_ids(out) == []
    item = items(out)["cpt.full_time_days_used"]
    assert item["value"] == 0
    # The inputs show whose statement this is, and the day it was given. Nothing was
    # entered in the field, and the inputs do not say that 0 was.
    assert CPT_USED in said(item["inputs"])
    assert "2026-09-28" in said(item["inputs"])
    assert item["inputs"].get("cpt_full_time_days") is None
    assert out["verdict"] == {"state": "no_open_items", "reasons": []}
    assert contract_problems(out) == []


def test_the_answer_yes_names_the_cpt_days_as_missing():
    case = with_changes(FITS, cpt_full_time_days=None)
    out = run(answer_as_the_screen_does(case, run(case), "2026-09-28", **{CPT_USED: True}))
    assert out["verdict"]["state"] == "cannot_tell"
    assert "missing:cpt_full_time_days" in out["verdict"]["reasons"]
    assert CPT_USED not in question_ids(out)
    got = items(out)
    if "cpt.full_time_days_used" in got:
        assert got["cpt.full_time_days_used"]["value"] is None


@pytest.mark.parametrize("days", [0, 1, 217])
def test_cpt_days_that_were_entered_raise_no_question(days):
    out = run(with_changes(FITS, cpt_full_time_days=days))
    assert question_ids(out) == []
    item = items(out)["cpt.full_time_days_used"]
    assert item["value"] == days
    assert item["inputs"]["cpt_full_time_days"] == days


# Section 3: an answer holds for what it was given for, on the day it was given

# reviews/phase-2-second.md, finding 5: OPT EAD 2026-07-10 to 2027-07-09, no
# employment. 12 months from 2026-07-10 is 2027-07-10.
NO_JOBS: dict[str, Any] = with_changes(
    FITS,
    program_end_date="2026-05-20",
    opt=ead("2026-04-01", "2026-04-10", "2026-07-10", "2027-07-09"),
    employment=[],
    time_zone=REVIEW_ZONE,
)


def given_on(case: dict[str, Any], on: str, asked_of: dict[str, Any] | None = None) -> Any:
    """The answer yes to no_employment_to_record, dated on, with the about of the
    question as the engine raised it for asked_of."""
    asked = review(asked_of or case)
    return answer_as_the_screen_does(case, asked, on, **{NO_EMPLOYMENT: True})


def test_each_question_carries_the_values_that_raised_it():
    out = review(NO_JOBS)
    assert question_ids(out) == [NO_EMPLOYMENT]
    about = question(out, NO_EMPLOYMENT)["about"]
    assert "2026-07-10" in said(about)


def test_review_5_an_answer_given_today_counts_through_today():
    out = review(given_on(NO_JOBS, "2026-09-28"))
    assert question_ids(out) == []
    got = values(out)
    # 2026-07-10 through 2026-09-28: July 10 to 31 is 22 days, August 31, September 28.
    # 22 + 31 + 28 = 81.
    assert got["unemployment.days_used"] == 81
    # 90 - 81 = 9.
    assert got["unemployment.days_remaining"] == 9
    assert out["verdict"] == {"state": "no_open_items", "reasons": []}


@pytest.mark.parametrize("on", ["2099-12-31", "2026-09-29"])
def test_review_5_an_answer_dated_after_today_is_refused(on):
    case = given_on(NO_JOBS, on)
    assert case_problems(case) == []
    with pytest.raises(ValueError):  # noqa: PT011
        parsed(case, clock_at(REVIEW_INSTANT))


def test_an_answer_dated_today_is_not_refused():
    parsed(given_on(NO_JOBS, "2026-09-28"), clock_at(REVIEW_INSTANT))


def test_today_for_the_day_of_an_answer_is_the_persons_own_day():
    # 01:30 UTC on 2026-09-29 is 18:30 on 2026-09-28 in Los Angeles and 07:00 on
    # 2026-09-29 in Kolkata. An answer dated 2026-09-29 is after today in the first
    # zone and is today in the second.
    early = clock_at("2026-09-29T01:30")
    # The about is the one the question carries (SPEC-resolutions.md, point 7).
    case = given_on(NO_JOBS, "2026-09-29")
    with pytest.raises(ValueError):  # noqa: PT011
        parsed(with_changes(case, time_zone="America/Los_Angeles"), early)
    parsed(with_changes(case, time_zone="Asia/Kolkata"), early)


@pytest.mark.parametrize("on", ["2026-07-11", "2026-09-27", "1950-01-02"])
def test_review_5_an_answer_given_before_today_leaves_the_days_since_open(on):
    # 2026-07-11 is the second day of the card. 2026-09-27 is yesterday. 1950-01-02 is
    # before the card began (1950-01-01, the first day the contract takes, is the marker
    # ON_THE_DAY_IT_RUNS, which refuse_placeholders turns away). None covers 2026-09-28.
    out = review(given_on(NO_JOBS, on))
    assert question_ids(out) == [NO_EMPLOYMENT]
    assert out["verdict"]["state"] == "cannot_tell"
    assert unconfirmed(out) == [NO_EMPLOYMENT]
    got = items(out)
    for item_id in COUNTS:
        assert got[item_id]["value"] is None, item_id


# The reviewer's second input: the same answer, then opt.ead_start changed to
# 2026-07-01. 12 months from 2026-07-01 is 2027-07-01, so the card ends 2027-06-30.
MOVED: dict[str, Any] = with_block(NO_JOBS, "opt", ead_start="2026-07-01", ead_end="2027-06-30")


def test_review_5_an_answer_about_another_start_date_is_not_an_answer():
    kept = given_on(MOVED, "2026-09-28", asked_of=NO_JOBS)
    out = review(kept)
    assert question_ids(out) == [NO_EMPLOYMENT]
    assert out["verdict"]["state"] == "cannot_tell"
    # The reviewer saw days_used 90.
    assert items(out)["unemployment.days_used"]["value"] is None
    assert "2026-07-01" in said(question(out, NO_EMPLOYMENT)["about"])


def test_an_answer_given_for_the_new_start_date_counts_from_it():
    out = review(given_on(MOVED, "2026-09-28"))
    assert question_ids(out) == []
    got = values(out)
    # 2026-07-01 through 2026-09-28: 31 + 31 + 28 = 90. 90 - 90 = 0.
    assert got["unemployment.days_used"] == 90
    assert got["unemployment.days_remaining"] == 0
    assert out["verdict"]["state"] == "talk_to_dso"


def test_an_answer_with_the_about_of_a_conflict_holds_for_those_values_only():
    # Yes to a card through 2026-11-02. The end is then changed to 2026-11-03. The
    # answer was given for 2026-11-02.
    conflict = "opt.card_longer_than_rule"
    _, raises, _, _ = ROWS[conflict]
    asked = run(raises)
    answered = answer_as_the_screen_does(raises, asked, "2026-09-28", **{conflict: True})
    out = run(with_block(answered, "opt", ead_end="2026-11-03"))
    assert out["verdict"]["state"] == "cannot_tell"
    assert conflicts(out) == [conflict]
    assert question_ids(out) == [conflict]
    assert "2026-11-03" in said(question(out, conflict)["about"])


def test_an_answer_about_other_values_does_not_answer_nothing_more_to_record():
    asked = review(IN_PROGRAM)
    answered = answer_as_the_screen_does(IN_PROGRAM, asked, "2026-09-28", **{NOTHING_MORE: True})
    assert review(answered)["verdict"]["state"] == "no_open_items"
    answered["confirmations"][NOTHING_MORE]["about"] = {"something": "else"}
    out = review(answered)
    assert question_ids(out) == [NOTHING_MORE]
    assert out["verdict"]["state"] == "cannot_tell"


@settings(max_examples=100, deadline=None)
@given(
    since_start=st.integers(min_value=0, max_value=300),
    given_before=st.integers(min_value=0, max_value=300),
)
def test_no_employment_to_record_covers_the_days_through_the_day_it_was_given(
    since_start, given_before
):
    # The card begins 2026-07-10 and runs 365 days. Today is inside it.
    start = date(2026, 7, 10)
    today = start + timedelta(days=since_start)
    on = today - timedelta(days=given_before)
    case = with_changes(NO_JOBS, time_zone="UTC")
    asked = run(case, today=today)
    answered = answer_as_the_screen_does(case, asked, on.isoformat(), **{NO_EMPLOYMENT: True})
    out = run(answered, today=today)
    if on < today:
        assert question_ids(out) == [NO_EMPLOYMENT]
        assert out["verdict"]["state"] == "cannot_tell"
        assert items(out)["unemployment.days_used"]["value"] is None
    else:
        assert question_ids(out) == []
        # Both ends are counted: the day the card begins through today.
        assert values(out)["unemployment.days_used"] == since_start + 1


@functools.cache
def row_about(question_id: str) -> dict[str, Any]:
    """The about of the question a row of section 1 raises, on the row's own case."""
    today, raises, _, _ = ROWS[question_id]
    about: dict[str, Any] = question(run(raises, today=today), question_id)["about"]
    return about


@settings(max_examples=100, deadline=None)
@given(after=st.integers(min_value=-400, max_value=400), question_id=st.sampled_from(ROW_IDS))
def test_an_answer_is_refused_when_and_only_when_it_is_dated_after_today(after, question_id):
    on = TODAY + timedelta(days=after)
    # The answer carries the about its question carries where its row raises it
    # (SPEC-resolutions.md, point 7), so that nothing but the day is out of place.
    given = {
        question_id: {
            "answer": True,
            "on": on.isoformat(),
            "about": copy.deepcopy(row_about(question_id)),
        }
    }
    case = with_changes(FITS, confirmations=given)
    if after > 0:
        with pytest.raises(ValueError):  # noqa: PT011
            parsed(case, clock_on(TODAY))
    else:
        parsed(case, clock_on(TODAY))


# Section 4: a date matters only while it can still matter

# reviews/phase-2-second.md, finding 6.
CARD_IN_HAND: dict[str, Any] = with_changes(
    FITS,
    program_end_date="2026-08-10",
    opt=ead("2026-07-01", "2026-07-05", "2026-09-01", "2027-08-31"),
    employment=[job("2026-09-01", None)],
    time_zone=REVIEW_ZONE,
)


def test_review_6_a_filing_window_is_not_open_once_the_card_is_in_hand():
    out = review(CARD_IN_HAND)
    # 60 days after 2026-08-10: 21 days reach August 31, 30 more reach September 30,
    # 9 more reach 2026-10-09, which is 11 days after today. The date is still computed.
    assert values(out)["opt.apply_window_closes"] == "2026-10-09"
    assert values(out)["opt.latest_start"] == "2026-10-09"
    assert set(DONE_WITH_OPT).isdisjoint(out["verdict"]["reasons"])
    assert set(DONE_WITH_OPT).isdisjoint(upcoming(out))
    # The reviewer saw needs_you with this one reason.
    assert out["verdict"] == {"state": "no_open_items", "reasons": []}


@pytest.mark.parametrize(
    "recorded",
    [
        {"i765_filed_date": "2026-07-05", "ead_start": None, "ead_end": None},
        {"i765_filed_date": None},
        {},
    ],
    ids=["filing", "card", "both"],
)
def test_the_opt_steps_are_done_when_the_filing_or_the_card_is_recorded(recorded):
    out = review(with_block(CARD_IN_HAND, "opt", **recorded))
    assert set(DONE_WITH_OPT).isdisjoint(out["verdict"]["reasons"])
    assert set(DONE_WITH_OPT).isdisjoint(upcoming(out))


def test_the_opt_steps_are_ahead_while_neither_is_recorded():
    # Recommended 2026-09-10, nothing later recorded.
    case = with_changes(
        CARD_IN_HAND, opt=ead("2026-09-10", None, None, None), employment=[], time_zone="UTC"
    )
    ahead = upcoming(run(case))
    # 60 days after 2026-08-10 is 2026-10-09, as above.
    assert ahead["opt.apply_window_closes"]["date"] == "2026-10-09"
    assert ahead["opt.latest_start"]["date"] == "2026-10-09"
    # 30 days after 2026-09-10: 20 days reach September 30, 10 more reach 2026-10-10.
    assert ahead["opt.file_by"]["date"] == "2026-10-10"
    # 90 days before 2026-08-10: 10 days reach July 31, 31 more June 30, 30 more May 31,
    # 19 more reach 2026-05-12. That is before today.
    assert "opt.apply_window_opens" not in ahead


# STEM_AHEAD on 2026-10-05: the OPT card ends 2026-10-15, 10 days ahead.
STEM_DAY = date(2026, 10, 5)


@pytest.mark.parametrize(
    "recorded",
    [
        {"i765_filed_date": "2026-08-10", "ead_start": None, "ead_end": None},
        {"i765_filed_date": None},
        {},
    ],
    ids=["filing", "card", "both"],
)
def test_the_stem_steps_are_done_when_the_filing_or_the_card_is_recorded(recorded):
    out = run(with_block(STEM_AHEAD, "stem", **recorded), today=STEM_DAY)
    # stem.apply_window_closes is opt.ead_end, 2026-10-15. The date is still computed.
    assert values(out)["stem.apply_window_closes"] == "2026-10-15"
    assert set(DONE_WITH_STEM).isdisjoint(out["verdict"]["reasons"])
    assert set(DONE_WITH_STEM).isdisjoint(upcoming(out))


def test_the_stem_steps_are_ahead_while_neither_is_recorded():
    case = with_changes(STEM_AHEAD, stem=ead("2026-08-01", None, None, None))
    ahead = upcoming(run(case, today=STEM_DAY))
    assert ahead["stem.apply_window_closes"]["date"] == "2026-10-15"
    # 60 days after 2026-08-01: 30 days reach August 31, 30 more reach 2026-09-30.
    # That is before 2026-10-05.
    assert "stem.file_by" not in ahead
    # 90 days before 2026-10-15: 15 days reach September 30, 30 more August 31, 31 more
    # July 31, 14 more reach 2026-07-17. Before today.
    assert "stem.apply_window_opens" not in ahead


def test_a_stem_filing_does_not_make_the_opt_steps_done_nor_the_other_way():
    # OPT recommended only. STEM cannot be entered without a card in this case, so the
    # check is on the ids: the OPT steps stay ahead whatever the STEM block holds.
    case = with_changes(
        CARD_IN_HAND,
        opt=ead("2026-09-10", None, None, None),
        stem=ead("2026-09-01", "2026-09-05", None, None),
        employment=[],
        time_zone="UTC",
    )
    ahead = upcoming(run(case))
    assert "opt.apply_window_closes" in ahead
    assert "opt.file_by" in ahead


# Section 5: a reading is marked wherever it is shown


def reading_by_the_rules(output: dict[str, Any], rule_ids: list[str]) -> bool:
    return any(output["rules"][rule_id].get("derivation") == "reading" for rule_id in rule_ids)


@pytest.mark.parametrize("case", [FITS, STEM_NOW, PETITION, AHEAD], ids=["a", "b", "c", "d"])
def test_each_item_and_each_date_ahead_carries_reading_as_its_rules_say(case):
    out = run(case)
    assert contract_problems(out) == []
    for item in out["computed"]:
        assert item["reading"] is reading_by_the_rules(out, item["rule_ids"]), item["id"]
    for entry in out["upcoming"]:
        assert set(entry["rule_ids"]) <= set(out["rules"]), entry["id"]
        assert entry["reading"] is reading_by_the_rules(out, entry["rule_ids"]), entry["id"]


def test_an_item_that_rests_on_a_reading_is_marked():
    # In the test pack both rules of the CPT item are readings, and the rule of the
    # filing window is verbatim.
    got = items(run(FITS))
    assert got["cpt.full_time_days_used"]["reading"] is True
    assert got["opt.apply_window_closes"]["reading"] is False
    assert got["unemployment.days_used"]["reading"] is False


@pytest.mark.parametrize(
    ("rule_id", "item_id"),
    [
        ("stem.apply_window_closes_rule", "stem.apply_window_closes"),
        ("grace.after_completion_days", "grace.ends"),
        ("opt.unemployment_limit_days", "unemployment.days_used"),
    ],
)
def test_the_mark_comes_from_the_pack_and_from_nowhere_else(rule_id, item_id):
    before = items(run(STEM_NOW))[item_id]
    assert before["reading"] is False
    note = "placeholder note for a test pack"
    changed = with_derivation(pack_dict(CHECKED_ON), rule_id, "reading", note)
    after = items(run(STEM_NOW, raw_pack=changed))[item_id]
    assert after["reading"] is True
    assert after["value"] == before["value"]


def test_one_reading_among_the_rules_of_an_item_is_enough():
    # cpt.full_time_days_used names two rules. With the first made verbatim the second
    # is still a reading.
    changed = with_derivation(pack_dict(CHECKED_ON), "cpt.full_time_months_bar", "verbatim")
    assert items(run(FITS, raw_pack=changed))["cpt.full_time_days_used"]["reading"] is True
    changed = with_derivation(changed, "cpt.full_time_bar_days", "verbatim")
    assert items(run(FITS, raw_pack=changed))["cpt.full_time_days_used"]["reading"] is False


def test_a_date_ahead_that_rests_on_a_reading_is_marked():
    # FITS on 2026-09-28: next.opt.card_ends cites opt.max_months, a reading in the
    # test pack. next.stem.apply_window_closes cites a verbatim rule.
    ahead = upcoming(run(FITS))
    assert ahead["next.opt.card_ends"]["reading"] is True
    assert ahead["next.stem.apply_window_closes"]["reading"] is False
    note = "placeholder note for a test pack"
    changed = with_derivation(
        pack_dict(CHECKED_ON), "stem.apply_window_closes_rule", "reading", note
    )
    ahead = upcoming(run(FITS, raw_pack=changed))
    assert ahead["next.stem.apply_window_closes"]["reading"] is True


# Section 6: what comes next

# OPT 2026-06-01 to 2027-05-31, no STEM. 12 months from 2026-06-01 is 2027-06-01.
NEXT: dict[str, Any] = with_changes(
    FITS,
    program_end_date="2026-05-15",
    opt=ead("2026-03-02", "2026-03-10", "2026-06-01", "2027-05-31"),
    employment=[job("2026-06-01", None)],
)


def test_with_opt_and_no_stem_the_dates_of_the_next_step_are_ahead():
    out = run(NEXT)
    ahead = upcoming(out)
    # 90 days before 2027-05-31: 31 days reach April 30, 30 more March 31, 29 more
    # reach 2027-03-02.
    assert ahead["next.stem.apply_window_opens"]["date"] == "2027-03-02"
    assert ahead["next.stem.apply_window_closes"]["date"] == "2027-05-31"
    assert ahead["next.opt.card_ends"]["date"] == "2027-05-31"
    # 60 days after 2027-05-31: 30 days reach June 30, 30 more reach 2027-07-30.
    assert ahead["grace.ends"]["date"] == "2027-07-30"
    assert ahead["grace.ends"]["date"] == values(out)["grace.ends"]
    assert "next.grace.ends" not in ahead
    assert contract_problems(out) == []


def test_each_date_of_the_next_step_names_its_rules():
    out = run(NEXT)
    ahead = upcoming(out)
    assert ahead["next.stem.apply_window_opens"]["rule_ids"] == ["stem.apply_before_expiry_days"]
    assert ahead["next.stem.apply_window_closes"]["rule_ids"] == ["stem.apply_window_closes_rule"]
    assert "opt.max_months" in ahead["next.opt.card_ends"]["rule_ids"]
    assert ahead["grace.ends"]["rule_ids"] == ["grace.after_completion_days"]
    for entry in ahead.values():
        for rule_id in entry["rule_ids"]:
            assert out["rules"][rule_id]["quote"], rule_id


def test_the_grace_date_ahead_carries_its_status_and_both_regimes():
    out = run(NEXT)
    entry = upcoming(out)["grace.ends"]
    assert entry["status"] == "litigated"
    assert entry["operative"] == {"regime": "ds_2012", "legal_status": "effective"}
    # Under the blocked text, 30 days after 2027-05-31 is 2027-06-30.
    assert entry["alternates"] == [
        {"regime": BLOCKED, "legal_status": "enjoined", "value": "2027-06-30"}
    ]
    assert upcoming(out)["next.stem.apply_window_opens"]["status"] == "settled"


def test_the_numbers_of_the_next_step_come_from_the_pack():
    # The shifted pack: 92 days before expiry, 61 days of grace.
    out = run(NEXT, raw_pack=pack_dict(CHECKED_ON, values=SHIFTED))
    ahead = upcoming(out)
    # 92 days before 2027-05-31 is two days before 2027-03-02: 2027-02-28.
    assert ahead["next.stem.apply_window_opens"]["date"] == "2027-02-28"
    # 61 days after 2027-05-31 is one day after 2027-07-30: 2027-07-31.
    assert ahead["grace.ends"]["date"] == "2027-07-31"
    assert ahead["next.opt.card_ends"]["date"] == "2027-05-31"


@pytest.mark.parametrize(
    ("today", "ahead_of_today"),
    [(date(2027, 3, 1), True), (date(2027, 3, 2), False), (date(2027, 3, 3), False)],
)
def test_a_date_is_ahead_only_while_it_lies_after_today(today, ahead_of_today):
    # next.stem.apply_window_opens is 2027-03-02.
    ahead = upcoming(run(NEXT, today=today))
    assert ("next.stem.apply_window_opens" in ahead) is ahead_of_today
    assert "next.opt.card_ends" in ahead


def test_what_comes_next_is_every_date_ahead_soonest_first():
    out = run(NEXT)
    got = items(out)
    dates = [entry["date"] for entry in out["upcoming"]]
    assert dates == sorted(dates)
    assert all(day > "2026-09-28" for day in dates)
    # Every computed date after today whose step is not done is ahead.
    for item_id, item in got.items():
        if item["unit"] != "date" or item_id in DONE_WITH_OPT:
            continue
        if item["value"] is not None and item["value"] > "2026-09-28":
            assert upcoming(out)[item_id]["date"] == item["value"], item_id
    # 14 months after 2026-05-15 is 2027-07-15.
    assert upcoming(out)["opt.complete_by"]["date"] == "2027-07-15"
    # Every entry is a computed item or one of the four of the next step.
    assert set(upcoming(out)) <= set(got) | set(NEXT_IDS)
    for item_id in set(upcoming(out)) & set(got):
        entry, item = upcoming(out)[item_id], got[item_id]
        assert entry["rule_ids"] == item["rule_ids"]
        assert entry["status"] == item["status"]
        assert entry["reading"] is item["reading"]


def test_with_stem_entered_there_is_no_next_step_and_no_list():
    out = run(STEM_NOW)
    assert set(NEXT_IDS).isdisjoint(upcoming(out))
    assert out["lists"] == []
    assert contract_problems(out) == []


def test_without_opt_there_is_no_next_step_and_no_list():
    out = review(said_of_training(IN_PROGRAM, True))
    assert set(NEXT_IDS).isdisjoint(upcoming(out))
    assert out["lists"] == []


def test_with_opt_and_no_stem_the_engine_names_what_the_regulation_lists():
    out = run(NEXT)
    assert [entry["id"] for entry in out["lists"]] == [STEM_LIST]
    # The rules of the test pack whose ids begin stem.requires. and no other, in the
    # order of the pack. stem.requires_post_completion_opt does not begin that way.
    assert tuple(out["lists"][0]["rule_ids"]) == LISTED_RULES
    assert len(LISTED_RULES) == 3
    for rule_id in LISTED_RULES:
        rule = out["rules"][rule_id]
        assert rule["quote"] == f"placeholder words for {rule_id} in a test pack"
        assert rule["citation"] == "8 CFR 214.2(f)(10)(ii)(C)"
        assert rule["url"]


def test_the_list_holds_the_rules_the_pack_holds_and_nothing_of_its_own():
    fewer = pack_dict(CHECKED_ON, leave_out=("stem.requires.e_verify",))
    out = run(NEXT, raw_pack=fewer)
    assert out["lists"][0]["rule_ids"] == ["stem.requires.degree", "stem.requires.training_plan"]
    assert "stem.requires.e_verify" not in out["rules"]


def test_the_engine_says_nothing_on_whether_the_person_may_apply():
    # BOUNDARY.md B2, and section 6: "These are dates and nothing more."
    out = run(NEXT)
    for entry in out["upcoming"]:
        assert set(entry) <= {
            "id",
            "date",
            "rule_ids",
            "status",
            "reading",
            "alternates",
            "operative",
        }
    for entry in out["lists"]:
        assert set(entry) == {"id", "rule_ids"}
    assert out["verdict"] == {"state": "no_open_items", "reasons": []}


# The properties of "The tests"

ALL_QUESTIONS = (*QUESTION_IDS, NOTHING_MORE, CPT_USED)


@st.composite
def records(draw: st.DrawFn) -> tuple[dict[str, Any], date]:
    """A record that fits, then some of it bent or taken away, some answers, and a day."""
    program_end = draw(st.dates(min_value=date(2023, 1, 1), max_value=date(2026, 6, 30)))
    opt_start = program_end + timedelta(days=draw(st.integers(min_value=1, max_value=60)))
    # One day short of the months of the rule, then bent by a few days or by years.
    bend = st.sampled_from([-40, -1, 0, 0, 0, 0, 1, 2, 3, 400, 1100])
    opt_end = months_later(opt_start, 12) - timedelta(days=1) + timedelta(days=draw(bend))
    stem_start = opt_end + timedelta(days=draw(st.sampled_from([1, 1, 1, 1, 2, 3, 120])))
    stem_end = months_later(stem_start, 24) - timedelta(days=1) + timedelta(days=draw(bend))
    today = opt_start + timedelta(days=draw(st.integers(min_value=-30, max_value=1300)))
    odd = st.sampled_from([-60, -60, -60, -1, 0, 1, 2, 900])
    case: dict[str, Any] = {
        "program_end_date": program_end.isoformat(),
        "degree_level": draw(st.sampled_from(["bachelor", "master", "doctorate"])),
        "documents_count": draw(st.integers(min_value=1, max_value=20)),
        "cpt_full_time_days": draw(st.one_of(st.none(), st.integers(min_value=0, max_value=300))),
        "opt": ead(
            (opt_start + timedelta(days=draw(odd))).isoformat(),
            (opt_start + timedelta(days=draw(odd))).isoformat(),
            opt_start.isoformat(),
            opt_end.isoformat(),
        ),
        "stem": ead(
            (stem_start + timedelta(days=draw(odd))).isoformat(),
            (stem_start + timedelta(days=draw(odd))).isoformat(),
            stem_start.isoformat(),
            stem_end.isoformat(),
        ),
        "employment": [
            job(
                (opt_start + timedelta(days=draw(st.sampled_from([-3, 0, 0, 0, 5])))).isoformat(),
                draw(st.sampled_from([None, None, (opt_start + timedelta(days=200)).isoformat()])),
                hours=draw(st.sampled_from([10, 40])),
            )
        ],
        "cap_gap": None,
        "time_zone": "UTC",
    }
    if draw(st.booleans()):
        requested = opt_start + timedelta(days=draw(st.sampled_from([-200, 0, 300, 700])))
        filed_on = requested + timedelta(days=draw(odd))
        case["cap_gap"] = cap_gap(
            requested.isoformat(),
            status=draw(st.sampled_from(["pending", "approved"])),
            petition_filed_on=filed_on.isoformat(),
        )
    taken = st.lists(st.sampled_from(["opt", "stem", "cap_gap", "employment"]), unique=True)
    for part in draw(taken):
        if part == "employment":
            case["employment"] = []
        elif draw(st.booleans()):
            case[part] = None
        else:
            del case[part]
    given_answers = draw(
        st.dictionaries(st.sampled_from((*ALL_QUESTIONS, *CONFLICT_IDS)), st.booleans(), max_size=6)
    )
    if given_answers:
        case["confirmations"] = answers(today.isoformat(), **given_answers)
    return case, today


@settings(max_examples=500, deadline=None)
@given(records())
def test_anything_open_is_cannot_tell_and_the_quiet_verdict_needs_every_part(drawn):
    # SPEC, "The tests": if any conflict or question is open, the verdict is
    # cannot_tell; and no case gives no_open_items unless every part is either entered
    # or answered for.
    case, today = drawn
    # SPEC-resolutions.md, point 7: each answer is sent with the about of the question
    # the output asks; an answer to a question not asked is left out.
    case = with_the_about_asked(case, lambda sent: run(sent, today=today))
    out = run(case, today=today)
    state = out["verdict"]["state"]
    asked = question_ids(out)
    answered = case.get("confirmations", {})
    assert len(asked) == len(set(asked))
    assert set(asked) <= set(ALL_QUESTIONS) | set(CONFLICT_IDS)
    if asked or conflicts(out) or unconfirmed(out) or reasons_with(out, "missing:"):
        assert state == "cannot_tell"

    # The table of section 1, applied apart from the engine.
    sure, unsure = conflicts_by_the_table(case, today, 12, 24)
    for conflict in sure:
        if not answered.get(conflict, {}).get("answer"):
            assert state == "cannot_tell", conflict
            assert conflict in conflicts(out)
    # The engine finds no conflict that the table does not hold. The ids it had before
    # this round, such as stem_start, are not in the table and are left to their tests.
    assert {c for c in conflicts(out) if c in CONFLICT_IDS} <= sure | unsure
    if state in ("no_open_items", "needs_you"):
        # A conflict answered with yes is for the DSO. It is never quiet.
        assert sure == set()

    opt, stem, petition = case.get("opt"), case.get("stem"), case.get("cap_gap")
    if state == "no_open_items":
        assert asked == []
        assert reasons_with(out, "missing:") == []
        if not opt and not stem and not petition:
            assert answered[NOTHING_MORE]["answer"] is True
        if case.get("cpt_full_time_days") is None:
            assert answered[CPT_USED]["answer"] is False
        assert not stem or opt
        assert not petition or opt or stem
        if opt and not case["employment"] and today >= date.fromisoformat(opt["ead_start"]):
            assert answered[NO_EMPLOYMENT]["answer"] is True

    # Section 6 and section 4, for every record.
    dates = [entry["date"] for entry in out["upcoming"]]
    assert dates == sorted(dates)
    assert all(day > today.isoformat() for day in dates)
    ahead = upcoming(out)
    if opt and (opt["i765_filed_date"] or opt["ead_start"]):
        assert set(DONE_WITH_OPT).isdisjoint(ahead)
        assert set(DONE_WITH_OPT).isdisjoint(out["verdict"]["reasons"])
    if stem and (stem["i765_filed_date"] or stem["ead_start"]):
        assert set(DONE_WITH_STEM).isdisjoint(ahead)
        assert set(DONE_WITH_STEM).isdisjoint(out["verdict"]["reasons"])
    if stem or not opt:
        assert set(NEXT_IDS).isdisjoint(ahead)
        assert out["lists"] == []
    # Section 5.
    for shown in (*out["computed"], *out["upcoming"]):
        assert shown["reading"] is reading_by_the_rules(out, shown["rule_ids"]), shown["id"]


# SPEC-resolutions.md, point 7: an answer with no `about` is not an answer. The question
# stays open. Duly never assumes that an answer was given for the values in front of it.
# Each test below would pass on an engine that reads such an answer as given, if the
# assertions on the open question were taken away; with them, it fails there.


@pytest.mark.parametrize("answer", [True, False])
def test_point_7_an_answer_to_no_employment_with_no_about_is_not_an_answer(answer):
    # NO_JOBS: the card begins 2026-07-10, no work. The answer is given today, so only the
    # missing about can keep the question open.
    out = review(
        with_changes(
            NO_JOBS, confirmations=answers_with_no_about("2026-09-28", **{NO_EMPLOYMENT: answer})
        )
    )
    assert question_ids(out) == [NO_EMPLOYMENT]
    assert out["verdict"]["state"] == "cannot_tell"
    assert unconfirmed(out) == [NO_EMPLOYMENT]
    got = items(out)
    for item_id in COUNTS:
        assert got[item_id]["value"] is None, item_id


def test_point_7_the_same_answer_with_the_about_of_the_question_is_an_answer():
    # The control for the test above: the one change is the about. 2026-07-10 through
    # 2026-09-28 is 22 + 31 + 28 = 81 days.
    out = review(given_on(NO_JOBS, "2026-09-28"))
    assert question_ids(out) == []
    assert values(out)["unemployment.days_used"] == 81


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_point_7_the_answer_yes_to_a_conflict_with_no_about_is_not_an_answer(conflict):
    # The answer is dated on the row's own day, the day the case is run.
    today, raises, _, _ = ROWS[conflict]
    given = answers_with_no_about(today.isoformat(), **{conflict: True})
    out = run(with_changes(raises, confirmations=given), today=today)
    assert out["verdict"]["state"] == "cannot_tell"
    assert f"conflict:{conflict}" in out["verdict"]["reasons"]
    assert conflict in question_ids(out)
    # The yes would send the person to the DSO with the judgement item <id>: SPEC section 1.
    assert out["verdict"]["state"] != "talk_to_dso"
    assert conflict not in out["verdict"]["reasons"]


@pytest.mark.parametrize("answer", [True, False])
def test_point_7_an_answer_to_nothing_more_to_record_with_no_about_is_not_an_answer(answer):
    # IN_PROGRAM enters no opt, stem or cap_gap. Neither the yes (verdict decided on what
    # was entered) nor the no (missing:training) is read.
    out = review(
        with_changes(
            IN_PROGRAM, confirmations=answers_with_no_about("2026-09-28", **{NOTHING_MORE: answer})
        )
    )
    assert question_ids(out) == [NOTHING_MORE]
    assert out["verdict"]["state"] == "cannot_tell"
    assert "missing:training" not in out["verdict"]["reasons"]


def test_point_7_an_answer_to_full_time_cpt_with_no_about_is_not_an_answer():
    # cpt_full_time_days left out raises full_time_cpt_used (SPEC section 2). The no,
    # given with no about, does not make the item 0.
    case = with_changes(FITS, cpt_full_time_days=None)
    out = run(
        with_changes(case, confirmations=answers_with_no_about("2026-09-28", **{CPT_USED: False}))
    )
    assert CPT_USED in question_ids(out)
    assert out["verdict"]["state"] == "cannot_tell"
    assert values(out)["cpt.full_time_days_used"] is None


# SPEC-resolutions.md, point 8: parse_case(raw, clock) takes the clock, so that an answer
# dated after today is refused however the engine is called. These call parse_case
# itself, not a helper. They fail on a parse_case that takes one argument, or that
# reads the day from anywhere but the clock passed in.


def test_point_8_parse_case_takes_the_clock_as_its_second_argument():
    # 2026-09-28 at noon UTC; the answer is dated the day after, 2026-09-29.
    case = with_changes(
        NO_JOBS, time_zone="UTC", confirmations=answers("2026-09-29", **{NO_EMPLOYMENT: True})
    )
    with pytest.raises(ValueError):  # noqa: PT011
        f1.parse_case(case, clock_on(date(2026, 9, 28)))
    # The same case read on 2026-09-29 holds an answer dated today.
    f1.parse_case(case, clock_on(date(2026, 9, 29)))


@settings(max_examples=100, deadline=None)
@given(today=st.dates(min_value=date(1950, 1, 1), max_value=date(2099, 12, 30)))
def test_point_8_the_day_of_the_clock_decides_and_no_other(today):
    # An injected clock at noon UTC on today, zone UTC: the day is today. An answer dated
    # today is taken, one dated the day after is refused. The system time is never read,
    # so a today far from the day the tests run gives the same result.
    clock = clock_on(today)
    base = with_changes(NO_JOBS, time_zone="UTC")
    on_the_day = answers(today.isoformat(), **{NO_EMPLOYMENT: True})
    f1.parse_case(with_changes(base, confirmations=on_the_day), clock)
    tomorrow = answers((today + timedelta(days=1)).isoformat(), **{NO_EMPLOYMENT: True})
    with pytest.raises(ValueError):  # noqa: PT011
        f1.parse_case(with_changes(base, confirmations=tomorrow), clock)


# SPEC-resolutions.md, point 10: a card whose last day is the day its months end is not
# a conflict. 12 months from 2025-11-01 (the start of the FITS card) is 2026-11-01.


@pytest.mark.parametrize(
    ("ead_end", "longer"),
    [
        ("2026-10-31", False),  # the day before the months end
        ("2026-11-01", False),  # the day the months end: point 10
        ("2026-11-02", True),  # the day after
    ],
)
def test_point_10_a_card_through_the_day_its_months_end_is_not_a_conflict(ead_end, longer):
    case = with_block(FITS, "opt", ead_end=ead_end)
    assert ("opt.card_longer_than_rule" in conflicts(run(case))) == longer
    if not longer:
        # With every other question answered, nothing stops Duly from knowing, and
        # grace.ends, which uses the card's end, has a date.
        out = run(yes_to_all(case))
        assert out["verdict"]["state"] != "cannot_tell"
        assert values(out)["grace.ends"] is not None
    sure, unsure = conflicts_by_the_table(case, TODAY, 12, 24)
    assert ("opt.card_longer_than_rule" in sure) == longer
    assert unsure == set()
