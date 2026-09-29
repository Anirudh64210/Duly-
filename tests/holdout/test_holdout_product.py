"""Hidden second set for engine/f1.py after product round 1.

Specified in specs/product-1/SPEC.md, sections 1 to 6, and DECISIONS.md D41. Other
dates, another day, another degree than tests/unit/engine/test_f1_product.py, so that an
engine fitted to the dates of the first set fails here.

Every expected date and count was worked out by hand. The working is beside it.
"""

import inspect
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
    STEM_LIST,
    answer_as_the_screen_does,
    answers,
    build_pack,
    cap_gap,
    case_problems,
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
    with_the_about_asked,
)

TODAY = date(2027, 3, 10)  # a Wednesday
TOMORROW = "2027-03-11"

DONE_WITH_OPT = (
    "opt.apply_window_opens",
    "opt.apply_window_closes",
    "opt.file_by",
    "opt.latest_start",
)
DONE_WITH_STEM = ("stem.apply_window_opens", "stem.apply_window_closes", "stem.file_by")
NEXT_IDS = (
    "next.stem.apply_window_opens",
    "next.stem.apply_window_closes",
    "next.opt.card_ends",
)


def parsed(case: dict[str, Any], clock: Any) -> Any:
    """Section 3: parse_case has to learn the day. Where it takes a second argument, it
    is given the clock."""
    if len(inspect.signature(f1.parse_case).parameters) >= 2:
        return f1.parse_case(refuse_placeholders(case), clock)
    return f1.parse_case(refuse_placeholders(case))


def run(
    case: dict[str, Any], today: date = TODAY, raw_pack: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Compute a case at noon UTC on today, with rules checked that day."""
    assert case_problems(case) == [], "the test case itself must match the case contract"
    pack = build_pack(today) if raw_pack is None else validate_pack(raw_pack)
    clock = clock_on(today)
    return f1.compute_f1(parsed(case, clock), pack, clock)


def answered(case: dict[str, Any], today: date = TODAY, **given_answers: bool) -> dict[str, Any]:
    asked = run(case, today=today)
    return run(
        answer_as_the_screen_does(case, asked, today.isoformat(), **given_answers), today=today
    )


# OPT in hand. 12 months from 2026-06-15 is 2027-06-15.
CARD: dict[str, Any] = {
    "program_end_date": "2026-05-08",
    "degree_level": "bachelor",
    "documents_count": 4,
    "cpt_full_time_days": 12,
    "opt": ead("2026-04-01", "2026-04-12", "2026-06-15", "2027-06-14"),
    "stem": None,
    "employment": [job("2026-06-15", None)],
    "cap_gap": None,
    "time_zone": "UTC",
}

# The OPT card begins after 2027-03-10. 12 months from 2027-04-05 is 2028-04-05.
AHEAD: dict[str, Any] = with_changes(
    CARD,
    program_end_date="2027-02-20",
    opt=ead("2027-02-01", "2027-02-10", "2027-04-05", "2028-04-04"),
    employment=[],
)

# The STEM card begins after 2027-03-10. 24 months from 2027-03-20 is 2029-03-20.
STEM_AHEAD: dict[str, Any] = with_changes(
    CARD,
    program_end_date="2026-02-01",
    opt=ead("2026-01-05", "2026-01-15", "2026-03-20", "2027-03-19"),
    stem=ead("2027-01-05", "2027-01-15", "2027-03-20", "2029-03-19"),
    employment=[job("2026-03-20", None)],
)

# The STEM card is in hand. 24 months from 2026-02-01 is 2028-02-01.
STEM_NOW: dict[str, Any] = with_changes(
    CARD,
    program_end_date="2024-12-20",
    opt=ead("2024-11-01", "2024-11-10", "2025-02-01", "2026-01-31"),
    stem=ead("2025-11-10", "2025-11-20", "2026-02-01", "2028-01-31"),
    employment=[job("2025-02-01", None)],
)

TWO_JOBS: dict[str, Any] = with_changes(
    STEM_NOW, employment=[job("2025-02-01", "2026-01-31"), job("2026-02-02", None)]
)

PETITION: dict[str, Any] = with_changes(
    CARD, cap_gap=cap_gap("2027-10-01", status="pending", petition_filed_on="2027-03-01")
)

# The input that raises each conflict, the input to the safe side, the values that do
# not fit. Today is 2027-03-10.
ROWS: dict[str, tuple[dict[str, Any], dict[str, Any], set[str]]] = {
    # SPEC-resolutions.md, point 11: the recommendation moves to 2027-02-15, so that both
    # filings are within its 30 days (13 days reach Feb 28, 17 more 2027-03-17). Point 15:
    # the window closes 60 days after 2027-02-20, on 2027-04-21.
    "opt.i765_filed_date.after_today": (
        with_block(AHEAD, "opt", dso_recommendation_date="2027-02-15", i765_filed_date=TOMORROW),
        with_block(
            AHEAD, "opt", dso_recommendation_date="2027-02-15", i765_filed_date="2027-03-10"
        ),
        {TOMORROW},
    ),
    # Point 11: the recommendation moves to 2027-01-15, so that both filings are within its
    # 60 days (16 days reach Jan 31, 28 Feb 28, 16 more 2027-03-16). Point 14: the window
    # opens 90 days before the OPT card's end of 2027-03-19, on 2026-12-19.
    "stem.i765_filed_date.after_today": (
        with_block(
            STEM_AHEAD, "stem", dso_recommendation_date="2027-01-15", i765_filed_date=TOMORROW
        ),
        with_block(
            STEM_AHEAD, "stem", dso_recommendation_date="2027-01-15", i765_filed_date="2027-03-10"
        ),
        {TOMORROW},
    ),
    # Point 11: a recommendation after today lies after any filing on or before today, so
    # the case that raises the row has no filing (with a date missing, none of point 11's
    # four is raised) and the safe case files on the recommendation day, which fits.
    "opt.dso_recommendation_date.after_today": (
        with_block(AHEAD, "opt", dso_recommendation_date=TOMORROW, i765_filed_date=None),
        with_block(
            AHEAD, "opt", dso_recommendation_date="2027-03-10", i765_filed_date="2027-03-10"
        ),
        {TOMORROW},
    ),
    "stem.dso_recommendation_date.after_today": (
        with_block(STEM_AHEAD, "stem", dso_recommendation_date=TOMORROW, i765_filed_date=None),
        with_block(
            STEM_AHEAD, "stem", dso_recommendation_date="2027-03-10", i765_filed_date="2027-03-10"
        ),
        {TOMORROW},
    ),
    # The start asked for is 2027-10-01.
    "cap_gap.petition_filed_on.after_today": (
        with_block(PETITION, "cap_gap", petition_filed_on=TOMORROW),
        with_block(PETITION, "cap_gap", petition_filed_on="2027-03-10"),
        {TOMORROW},
    ),
    # The OPT card begins 2026-06-15. SPEC-resolutions.md, point 11: the recommendation
    # moves to 2026-06-01, so that both filings are within its 30 days (2026-07-01).
    # Point 15: the window closes 60 days after 2026-05-08, on 2026-07-07.
    "opt.i765_filed_date.after_card": (
        with_block(CARD, "opt", dso_recommendation_date="2026-06-01", i765_filed_date="2026-06-16"),
        with_block(CARD, "opt", dso_recommendation_date="2026-06-01", i765_filed_date="2026-06-15"),
        {"2026-06-16", "2026-06-15"},
    ),
    # The STEM card begins 2026-02-01. Point 11: the recommendation moves to 2026-01-10, so
    # that both filings are within its 60 days (21 days reach Jan 31, 28 Feb 28, 11 more
    # 2026-03-11). Point 14: the window opens 90 days before 2026-01-31, on 2025-11-02.
    "stem.i765_filed_date.after_card": (
        with_block(
            STEM_NOW, "stem", dso_recommendation_date="2026-01-10", i765_filed_date="2026-02-02"
        ),
        with_block(
            STEM_NOW, "stem", dso_recommendation_date="2026-01-10", i765_filed_date="2026-02-01"
        ),
        {"2026-02-02", "2026-02-01"},
    ),
    # Both dates are before today and after the first card begins.
    "cap_gap.petition_filed_on.after_start": (
        with_changes(CARD, cap_gap=cap_gap("2027-02-01", petition_filed_on="2027-02-02")),
        with_changes(CARD, cap_gap=cap_gap("2027-02-01", petition_filed_on="2027-02-01")),
        {"2027-02-02", "2027-02-01"},
    ),
    # The first card begins 2026-06-15.
    "cap_gap.requested_start.before_training": (
        with_changes(CARD, cap_gap=cap_gap("2026-06-14", petition_filed_on="2026-01-10")),
        with_changes(CARD, cap_gap=cap_gap("2026-06-15", petition_filed_on="2026-01-10")),
        {"2026-06-14", "2026-06-15"},
    ),
    # 12 months from 2026-06-15 is 2027-06-15. One day more, one day less.
    "opt.card_longer_than_rule": (
        with_block(CARD, "opt", ead_end="2027-06-16"),
        with_block(CARD, "opt", ead_end="2027-06-14"),
        {"2026-06-15", "2027-06-16"},
    ),
    # 24 months from 2026-02-01 is 2028-02-01.
    "stem.card_longer_than_rule": (
        with_block(STEM_NOW, "stem", ead_end="2028-02-02"),
        with_block(STEM_NOW, "stem", ead_end="2028-01-31"),
        {"2026-02-01", "2028-02-02"},
    ),
    # The OPT card ends 2026-01-31. One day after is 2026-02-01, two is 2026-02-02.
    "stem.gap_after_opt": (
        with_block(TWO_JOBS, "stem", ead_start="2026-02-02"),
        with_block(TWO_JOBS, "stem", ead_start="2026-02-01"),
        {"2026-01-31", "2026-02-02"},
    ),
    # The only card begins 2026-06-15. A closed period that begins the day before.
    "employment.period_outside_cards": (
        with_changes(CARD, employment=[job("2026-06-14", "2026-12-31"), job("2027-01-01", None)]),
        with_changes(CARD, employment=[job("2026-06-15", "2026-12-31"), job("2027-01-01", None)]),
        {"2026-06-14"},
    ),
}

ROW_IDS = list(ROWS)


def test_the_rows_are_the_rows_of_the_table():
    assert tuple(ROWS) == CONFLICT_IDS


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_facts_that_do_not_fit_are_asked_about_and_never_quiet(conflict):
    raises, _, not_fitting = ROWS[conflict]
    out = run(raises)
    assert out["verdict"]["state"] == "cannot_tell"
    assert conflicts(out) == [conflict]
    assert question_ids(out) == [conflict]
    assert not_fitting <= said(question(out, conflict)["about"])


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_to_the_safe_side_nothing_is_asked(conflict):
    _, safe, _ = ROWS[conflict]
    out = run(safe)
    assert conflicts(out) == []
    assert question_ids(out) == []
    assert out["verdict"]["state"] != "cannot_tell"
    assert contract_problems(out) == []


@pytest.mark.parametrize("conflict", ROW_IDS)
@pytest.mark.parametrize("answer", [True, False])
def test_yes_is_for_the_dso_and_no_is_cannot_tell(conflict, answer):
    raises, _, _ = ROWS[conflict]
    out = answered(raises, **{conflict: answer})
    if answer:
        assert out["verdict"]["state"] == "talk_to_dso"
        assert conflict in out["verdict"]["reasons"]
        assert conflicts(out) == []
        assert question_ids(out) == []
    else:
        assert out["verdict"]["state"] == "cannot_tell"
        assert conflicts(out) == [conflict]


def test_two_facts_that_do_not_fit_need_two_answers():
    # The OPT card runs a day past 12 months and the filing is dated after it began.
    # SPEC-resolutions.md, point 11: the recommendation is 2026-06-01, so that the filing is
    # within its 30 days (2026-07-01) and only the two rows under test are raised.
    case = with_block(
        CARD,
        "opt",
        ead_end="2027-06-16",
        dso_recommendation_date="2026-06-01",
        i765_filed_date="2026-06-16",
    )
    both = {"opt.card_longer_than_rule", "opt.i765_filed_date.after_card"}
    asked = run(case)
    assert set(conflicts(asked)) == both
    assert set(question_ids(asked)) == both
    one = answered(case, **{"opt.card_longer_than_rule": True})
    assert one["verdict"]["state"] == "cannot_tell"
    assert conflicts(one) == ["opt.i765_filed_date.after_card"]
    two = answered(case, **dict.fromkeys(both, True))
    assert two["verdict"]["state"] == "talk_to_dso"
    assert both <= set(two["verdict"]["reasons"])


def test_a_card_that_ends_on_a_leap_day_the_day_before_the_months_end_fits():
    # 12 months from 2027-03-01 is 2028-03-01. The day before is 2028-02-29.
    case = with_changes(
        AHEAD,
        program_end_date="2027-02-01",
        opt=ead("2027-01-05", "2027-01-15", "2027-03-01", "2028-02-29"),
    )
    assert conflicts(run(case, today=date(2027, 2, 20))) == []
    # One day past 2028-03-01 is 2028-03-02.
    longer = with_block(case, "opt", ead_end="2028-03-02")
    assert conflicts(run(longer, today=date(2027, 2, 20))) == ["opt.card_longer_than_rule"]


def test_days_between_the_cards_are_outside_the_count():
    # OPT 2025-02-01 to 2026-01-31, STEM from 2026-02-11: ten days between the cards,
    # February 1 through February 10. The first period ends 2026-01-26: January 27
    # through January 31 is 5 days inside the OPT card. The second begins 2026-02-14:
    # February 11 through February 13 is 3 days inside the STEM card. 5 + 3 = 8.
    # With the ten days between the cards it would be 18.
    case = with_changes(
        STEM_NOW,
        stem=ead("2025-11-10", "2025-11-20", "2026-02-11", "2028-02-10"),
        employment=[job("2025-02-01", "2026-01-26"), job("2026-02-14", None)],
    )
    open_still = run(case)
    assert conflicts(open_still) == ["stem.gap_after_opt"]
    assert items(open_still)["unemployment.days_used"]["value"] is None
    out = answered(case, **{"stem.gap_after_opt": True})
    assert values(out)["unemployment.days_used"] == 8
    # Today is in the STEM card, where the limit is 150. 150 - 8 = 142.
    assert values(out)["unemployment.days_remaining"] == 142
    assert out["verdict"]["state"] == "talk_to_dso"


# Section 2

STUDENT: dict[str, Any] = {
    "program_end_date": "2028-05-12",
    "degree_level": "doctorate",
    "documents_count": 1,
    "employment": [],
    "time_zone": "UTC",
}


def test_a_student_with_nothing_more_entered_is_asked_before_any_quiet_verdict():
    out = run(STUDENT)
    assert out["verdict"]["state"] == "cannot_tell"
    assert sorted(question_ids(out)) == sorted([NOTHING_MORE, CPT_USED])
    assert sorted(reasons_with(out, "unconfirmed:")) == sorted(
        [f"unconfirmed:{NOTHING_MORE}", f"unconfirmed:{CPT_USED}"]
    )


@pytest.mark.parametrize(
    ("nothing_more", "cpt_used", "state", "reasons"),
    [
        (True, False, "no_open_items", []),
        (False, False, "cannot_tell", ["missing:training"]),
        (True, True, "cannot_tell", ["missing:cpt_full_time_days"]),
        (False, True, "cannot_tell", ["missing:training", "missing:cpt_full_time_days"]),
    ],
)
def test_the_two_answers_decide_what_is_missing(nothing_more, cpt_used, state, reasons):
    out = answered(STUDENT, **{NOTHING_MORE: nothing_more, CPT_USED: cpt_used})
    assert out["verdict"]["state"] == state
    assert sorted(out["verdict"]["reasons"]) == sorted(reasons)
    assert question_ids(out) == []


def test_one_answer_leaves_the_other_question_open():
    out = answered(STUDENT, **{NOTHING_MORE: True})
    assert question_ids(out) == [CPT_USED]
    assert out["verdict"]["state"] == "cannot_tell"


def test_none_used_is_the_persons_statement_with_its_day():
    out = answered(STUDENT, **{NOTHING_MORE: True, CPT_USED: False})
    item = items(out)["cpt.full_time_days_used"]
    assert item["value"] == 0
    assert {CPT_USED, "2027-03-10"} <= said(item["inputs"])
    assert item["inputs"].get("cpt_full_time_days") is None


# Section 3

IDLE: dict[str, Any] = with_changes(CARD, employment=[])


def test_no_employment_answered_today_counts_every_day_of_the_card_so_far():
    out = answered(IDLE, **{NO_EMPLOYMENT: True})
    # 2026-06-15 through 2027-03-10: June 15 to 30 is 16 days, July 31, August 31,
    # September 30, October 31, November 30, December 31, January 31, February 28,
    # March 10. 16 + 31 + 31 + 30 + 31 + 30 + 31 + 31 + 28 + 10 = 269.
    assert values(out)["unemployment.days_used"] == 269
    # 90 - 269 = -179.
    assert values(out)["unemployment.days_remaining"] == -179
    assert out["verdict"]["state"] == "talk_to_dso"


def test_the_same_answer_a_day_later_is_open_again():
    asked = run(IDLE)
    kept = answer_as_the_screen_does(IDLE, asked, "2027-03-10", **{NO_EMPLOYMENT: True})
    out = run(kept, today=date(2027, 3, 11))
    assert question_ids(out) == [NO_EMPLOYMENT]
    assert out["verdict"]["state"] == "cannot_tell"
    assert items(out)["unemployment.days_used"]["value"] is None


def test_an_answer_dated_tomorrow_is_refused():
    # The answer carries the about of the question (SPEC-resolutions.md, point 7), so
    # that nothing but its day is out of place.
    case = answer_as_the_screen_does(IDLE, run(IDLE), TOMORROW, **{NO_EMPLOYMENT: True})
    assert case_problems(case) == []
    with pytest.raises(ValueError):  # noqa: PT011
        parsed(case, clock_on(TODAY))
    parsed(case, clock_on(date(2027, 3, 11)))


def test_an_answer_does_not_follow_a_changed_end_of_the_card():
    # Yes to a card through 2027-06-16, then the end is typed again as 2027-07-08.
    # SPEC-resolutions.md, point 16: 14 months from the program end of 2026-05-08 is
    # 2027-07-08, so the end typed again is the last day that fits opt.complete_by (it was
    # 2027-09-16, which raises point 16 as well), and still past 12 months (2027-06-15).
    conflict = "opt.card_longer_than_rule"
    raises, _, _ = ROWS[conflict]
    kept = answer_as_the_screen_does(raises, run(raises), "2027-03-10", **{conflict: True})
    out = run(with_block(kept, "opt", ead_end="2027-07-08"))
    assert out["verdict"]["state"] == "cannot_tell"
    assert question_ids(out) == [conflict]


# Sections 4 and 6


def test_what_comes_next_for_a_card_in_hand():
    out = run(CARD)
    assert contract_problems(out) == []
    # 90 days before 2027-06-14: 14 days reach May 31, 31 more April 30, 30 more
    # March 31, 15 more reach 2027-03-16.
    # 14 months after 2026-05-08 is 2027-07-08.
    # 60 days after 2027-06-14: 16 days reach June 30, 31 more July 31, 13 more reach
    # 2027-08-13.
    assert [(entry["id"], entry["date"]) for entry in out["upcoming"][:1]] == [
        ("next.stem.apply_window_opens", "2027-03-16")
    ]
    ahead = upcoming(out)
    assert {name: entry["date"] for name, entry in ahead.items()} == {
        "next.stem.apply_window_opens": "2027-03-16",
        "next.stem.apply_window_closes": "2027-06-14",
        "next.opt.card_ends": "2027-06-14",
        "opt.complete_by": "2027-07-08",
        "grace.ends": "2027-08-13",
    }
    dates = [entry["date"] for entry in out["upcoming"]]
    assert dates == sorted(dates)
    # Under the blocked text, 30 days after 2027-06-14: 16 reach June 30, 14 more reach
    # 2027-07-14.
    assert ahead["grace.ends"]["alternates"] == [
        {"regime": BLOCKED, "legal_status": "enjoined", "value": "2027-07-14"}
    ]
    assert [entry["id"] for entry in out["lists"]] == [STEM_LIST]
    assert tuple(out["lists"][0]["rule_ids"]) == LISTED_RULES
    assert out["verdict"] == {"state": "no_open_items", "reasons": []}


def test_on_the_day_itself_a_date_is_no_longer_ahead():
    assert "next.stem.apply_window_opens" in upcoming(run(CARD, today=date(2027, 3, 15)))
    assert "next.stem.apply_window_opens" not in upcoming(run(CARD, today=date(2027, 3, 16)))


def test_the_window_of_a_stem_card_already_asked_for_is_not_ahead():
    # STEM_AHEAD: the OPT card ends 2027-03-19, nine days after today, and the STEM
    # filing is recorded.
    out = run(STEM_AHEAD)
    assert values(out)["stem.apply_window_closes"] == "2027-03-19"
    assert set(DONE_WITH_STEM).isdisjoint(upcoming(out))
    assert set(DONE_WITH_STEM).isdisjoint(out["verdict"]["reasons"])
    assert set(NEXT_IDS).isdisjoint(upcoming(out))
    assert out["lists"] == []


def test_the_window_of_an_opt_card_not_yet_asked_for_is_ahead():
    # Program end 2027-02-20, recommended 2027-03-01, nothing later recorded.
    case = with_changes(AHEAD, opt=ead("2027-03-01", None, None, None))
    ahead = upcoming(run(case))
    # 60 days after 2027-02-20: 8 days reach February 28, 31 more March 31, 21 more
    # reach 2027-04-21.
    assert ahead["opt.apply_window_closes"]["date"] == "2027-04-21"
    # 30 days after 2027-03-01 is 2027-03-31.
    assert ahead["opt.file_by"]["date"] == "2027-03-31"
    filed = upcoming(run(with_block(case, "opt", i765_filed_date="2027-03-05")))
    assert set(DONE_WITH_OPT).isdisjoint(filed)


def test_the_days_before_expiry_come_from_the_pack():
    changed = pack_dict(TODAY, values={("stem.apply_before_expiry_days", ""): 100})
    ahead = upcoming(run(CARD, raw_pack=changed))
    # 100 days before 2027-06-14 is ten days before 2027-03-16: 2027-03-06, which is
    # before today, 2027-03-10.
    assert "next.stem.apply_window_opens" not in ahead
    changed = pack_dict(TODAY, values={("stem.apply_before_expiry_days", ""): 95})
    ahead = upcoming(run(CARD, raw_pack=changed))
    # 95 days before is five days before 2027-03-16: 2027-03-11.
    assert ahead["next.stem.apply_window_opens"]["date"] == "2027-03-11"


# The property of "The tests", on records of another shape


@st.composite
def records(draw: st.DrawFn) -> tuple[dict[str, Any], date]:
    """OPT alone or with a petition, bent in one place at most, and a day."""
    program_end = draw(st.dates(min_value=date(2022, 1, 1), max_value=date(2027, 6, 30)))
    start = program_end + timedelta(days=draw(st.integers(min_value=1, max_value=60)))
    end = months_later(start, 12) - timedelta(days=1)
    today = start + timedelta(days=draw(st.integers(min_value=0, max_value=500)))
    bent = draw(st.sampled_from(["nothing", "end", "filed", "recommended", "job", "petition"]))
    by = draw(st.integers(min_value=2, max_value=800))
    case: dict[str, Any] = {
        "program_end_date": program_end.isoformat(),
        "degree_level": "master",
        "documents_count": 3,
        "cpt_full_time_days": draw(st.one_of(st.none(), st.integers(0, 200))),
        "opt": ead(
            (start + timedelta(days=by if bent == "recommended" else -50)).isoformat(),
            (start + timedelta(days=by if bent == "filed" else -40)).isoformat(),
            start.isoformat(),
            (end + timedelta(days=by if bent == "end" else 0)).isoformat(),
        ),
        "employment": draw(
            st.sampled_from(
                [
                    [],
                    [job((start - timedelta(days=by if bent == "job" else 0)).isoformat(), None)],
                ]
            )
        ),
        "time_zone": "UTC",
    }
    if bent == "petition" or draw(st.booleans()):
        requested = start + timedelta(days=-by if bent == "petition" else 200)
        case["cap_gap"] = cap_gap(
            requested.isoformat(), petition_filed_on=(requested - timedelta(days=90)).isoformat()
        )
    asked_of = st.sampled_from((NO_EMPLOYMENT, NOTHING_MORE, CPT_USED, *CONFLICT_IDS))
    given_answers = draw(st.dictionaries(asked_of, st.booleans(), max_size=4))
    if given_answers:
        case["confirmations"] = answers(today.isoformat(), **given_answers)
    return case, today


@settings(max_examples=300, deadline=None)
@given(records())
def test_a_record_that_does_not_fit_is_never_quiet(drawn):
    case, today = drawn
    # SPEC-resolutions.md, point 7: each answer is sent with the about of the question
    # the output asks; an answer to a question not asked is left out.
    case = with_the_about_asked(case, lambda sent: run(sent, today=today))
    out = run(case, today=today)
    state = out["verdict"]["state"]
    answered_for = case.get("confirmations", {})
    if out["questions"] or conflicts(out):
        assert state == "cannot_tell"
    sure, unsure = conflicts_by_the_table(case, today, 12, 24)
    for conflict in sure:
        if not answered_for.get(conflict, {}).get("answer"):
            assert state == "cannot_tell", conflict
            assert conflict in conflicts(out)
            assert conflict in question_ids(out) or conflict in answered_for
    assert set(conflicts(out)) & set(CONFLICT_IDS) <= sure | unsure
    if state in ("no_open_items", "needs_you"):
        assert sure == set()
        assert out["questions"] == []
        assert case["cpt_full_time_days"] is not None or (answered_for[CPT_USED]["answer"] is False)
        if not case["employment"]:
            assert answered_for[NO_EMPLOYMENT]["answer"] is True
    dates = [entry["date"] for entry in out["upcoming"]]
    assert dates == sorted(dates)
    assert all(day > today.isoformat() for day in dates)
    assert set(DONE_WITH_OPT).isdisjoint(upcoming(out))
