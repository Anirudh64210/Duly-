"""Hidden tests for the sixth fix: specs/product-1/SPEC-resolutions.md, points 59 and 60.

Point 59: no rule lookup ever raises; where no row is in force on the day a rule is read,
the rule gives null with the step back (rule_not_in_force_on_event_day), whatever the clock
and the case. Point 60: employment.periods_not_reported reads its rule for each period's
start; a period that starts before the rule's row gives null with the step back, never a
count from a rule that came later.

Not shown to the lanes that build. Written from the SPEC and the contracts, never from the
engine. The cases differ from those of tests/unit/engine/test_f1_fix6.py. The clock is
injected; every expected date and count is worked beside it.
"""

import copy
from collections.abc import Callable
from datetime import date, timedelta
from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from engine.rulepack import Rulepack, load_all, validate_pack
from tests.support.f1_pack import (
    CONFLICT_IDS,
    CPT_USED,
    NOT_AFTER_PROGRAM_END,
    WINDOW_CONFLICT_IDS,
    cap_gap,
    case_problems,
    clock_on,
    contract_problems,
    ead,
    items,
    job,
    months_later,
    pack_dict,
    refuse_placeholders,
    values,
    with_changes,
)

TODAY = date(2026, 9, 29)
ONE_DAY = timedelta(days=1)
NOT_IN_FORCE = "rule_not_in_force_on_event_day"
QUIET = "no_open_items"
EARLIER = "opt.earlier_at_this_level"
OPEN_AFTER = "employment.period_open_after_last_card"
OPT_REPORT_RULE = "opt.report_employer_within_days"
NOT_REPORTED = "employment.periods_not_reported"
CONFLICTS = {*CONFLICT_IDS, *WINDOW_CONFLICT_IDS, NOT_AFTER_PROGRAM_END, OPEN_AFTER}


def run(
    case: dict[str, Any],
    today: date = TODAY,
    raw_pack: dict[str, Any] | None = None,
    pack: Rulepack | None = None,
) -> dict[str, Any]:
    assert case_problems(case) == [], "the test case itself must match the case contract"
    clock = clock_on(today)
    if pack is None:
        pack = validate_pack(pack_dict(today) if raw_pack is None else raw_pack)
    return f1.compute_f1(f1.parse_case(refuse_placeholders(case), clock), pack, clock)


def answering(yes_to_conflicts: bool, cpt_used: bool = False) -> Callable[[str], bool]:
    def answer(question_id: str) -> bool:
        if question_id in CONFLICTS:
            return yes_to_conflicts
        if question_id == CPT_USED:
            return cpt_used
        return not (question_id.endswith(".new_employer") or question_id == EARLIER)

    return answer


def answer_all(
    case: dict[str, Any],
    today: date,
    answer: Callable[[str], bool],
    raw_pack: dict[str, Any] | None = None,
    pack: Rulepack | None = None,
) -> dict[str, Any]:
    """Answer every question as the output asks it, on today, until none is left or twelve
    rounds have passed. Returns the last output."""
    out = run(case, today, raw_pack, pack)
    for _ in range(12):
        if not out["questions"]:
            break
        confirmations = copy.deepcopy(case.get("confirmations") or {})
        for q in out["questions"]:
            confirmations[q["id"]] = {"answer": answer(q["id"]), "on": today.isoformat()}
            if "about" in q:
                confirmations[q["id"]]["about"] = copy.deepcopy(q["about"])
        case = with_changes(case, confirmations=confirmations)
        out = run(case, today, raw_pack, pack)
    return out


SHIPPED = next(p for p in load_all() if p.category == "f1")


def iso(day: date) -> str:
    return day.isoformat()


def sound(out: dict[str, Any]) -> None:
    """An output in the contract, no null alternate, and never quiet on a step back."""
    assert contract_problems(out) == []
    for entry in [*out["computed"], *out["upcoming"]]:
        for alternate in entry.get("alternates", []):
            assert alternate["value"] is not None, entry["id"]
    if NOT_IN_FORCE in out["verdict"]["reasons"]:
        assert out["verdict"]["state"] != QUIET


# A STEM card that runs across 2016-05-10, the first day of the shipped STEM rows, with the
# clock before it. Program end 2014-12-15, OPT recommended 2014-11-20, filed 2014-11-25, card
# 2015-01-10 to 2016-01-09 (12 months less a day); STEM recommended 2015-11-01, filed
# 2015-11-06, card 2016-01-10 to 2018-01-09 (24 months less a day). One period open from the
# OPT card's start. Clock 2015-06-01.
STEM_ACROSS: dict[str, Any] = {
    "program_end_date": "2014-12-15",
    "degree_level": "doctorate",
    "documents_count": 3,
    "cpt_full_time_days": 0,
    "opt": ead("2014-11-20", "2014-11-25", "2015-01-10", "2016-01-09"),
    "stem": ead("2015-11-01", "2015-11-06", "2016-01-10", "2018-01-09"),
    "employment": [job("2015-01-10", None)],
    "cap_gap": None,
    "time_zone": "UTC",
}
CLOCK_2015 = date(2015, 6, 1)

# A 17-month STEM card wholly before the shipped STEM rows. Program end 2008-12-15, OPT
# recommended 2008-11-20, filed 2008-11-25, card 2009-01-05 to 2010-01-04; STEM recommended
# 2009-11-01, filed 2009-11-06, card 2010-01-05 to 2011-06-04 (17 months from 2010-01-05 is
# 2011-06-05, less a day). Clock 2010-06-01. Six months into the card is 2010-07-05, twelve
# 2011-01-05: both before 2016-05-10.
STEM_2010: dict[str, Any] = with_changes(
    STEM_ACROSS,
    program_end_date="2008-12-15",
    opt=ead("2008-11-20", "2008-11-25", "2009-01-05", "2010-01-04"),
    stem=ead("2009-11-01", "2009-11-06", "2010-01-05", "2011-06-04"),
    employment=[job("2009-01-05", None)],
)
CLOCK_2010 = date(2010, 6, 1)

# Full-time CPT entered, a case wholly before 2003-01-01 (the first day of
# cpt.full_time_bar_days, opt.complete_within_months and grace.after_completion_days).
# Program end 1998-05-15, recommended 1998-04-01, filed 1998-04-10, card 1998-06-01 to
# 1999-05-31, one period over the card, 200 days of CPT. Clock 1999-06-01.
CPT_1998: dict[str, Any] = with_changes(
    STEM_ACROSS,
    program_end_date="1998-05-15",
    cpt_full_time_days=200,
    opt=ead("1998-04-01", "1998-04-10", "1998-06-01", "1999-05-31"),
    stem=None,
    employment=[job("1998-06-01", "1999-05-31")],
)
CLOCK_1999 = date(1999, 6, 1)


def test_holdout_point_59_a_stem_card_across_the_row_with_an_earlier_clock_gives_an_output() -> (
    None
):
    sound(run(STEM_ACROSS, CLOCK_2015, pack=SHIPPED))
    for yes in (True, False):
        sound(answer_all(STEM_ACROSS, CLOCK_2015, answering(yes), pack=SHIPPED))


def test_holdout_point_59_a_2010_stem_card_gives_null_validations_with_the_step_back() -> None:
    out = answer_all(STEM_2010, CLOCK_2010, answering(True), pack=SHIPPED)
    sound(out)
    for n in (1, 2, 3, 4):
        assert values(out)[f"stem.validation_{n}_due"] is None, n
    assert NOT_IN_FORCE in out["verdict"]["reasons"]


def test_holdout_point_59_cpt_entered_in_1998_gives_an_output_that_steps_back() -> None:
    # Program end 1998-05-15 plus 14 months would be 1999-07-15, but no row of
    # opt.complete_within_months is in force then: null.
    for used in (True, False):
        out = answer_all(CPT_1998, CLOCK_1999, answering(False, used), pack=SHIPPED)
        sound(out)
        assert values(out)["opt.complete_by"] is None
        assert NOT_IN_FORCE in out["verdict"]["reasons"]


def test_holdout_point_59_cpt_entered_with_the_clock_in_1990_and_a_card_in_2026() -> None:
    # Every date of the case lies after the clock: program end 2026-05-15, recommended
    # 2026-04-01, filed 2026-04-10, card 2026-06-01 to 2027-05-31, 30 days of CPT.
    case = with_changes(
        CPT_1998,
        program_end_date="2026-05-15",
        cpt_full_time_days=30,
        opt=ead("2026-04-01", "2026-04-10", "2026-06-01", "2027-05-31"),
        employment=[job("2026-06-01", None)],
    )
    sound(run(case, date(1990, 1, 1), pack=SHIPPED))
    sound(answer_all(case, date(1990, 1, 1), answering(True, True), pack=SHIPPED))


# The property: a clock from 1951-01-01 through today and a case drawn apart from it, so its
# dates may lie before or after the clock. Shapes: OPT only, OPT and STEM, cap-gap (with or
# without STEM), full-time CPT entered (with or without STEM). One to three periods.


@st.composite
def any_case(draw: st.DrawFn) -> dict[str, Any]:
    program_end = draw(st.dates(min_value=date(1951, 3, 1), max_value=date(2027, 12, 31)))
    card_start = program_end + timedelta(days=draw(st.integers(1, 60)))
    card_end = months_later(card_start, draw(st.integers(1, 12))) - ONE_DAY
    recommended = program_end - timedelta(days=draw(st.integers(0, 50)))
    last_day = card_end
    stem = None
    if draw(st.booleans()):
        stem_start = card_end + ONE_DAY
        last_day = months_later(stem_start, draw(st.sampled_from((17, 24)))) - ONE_DAY
        stem_recommended = card_end - timedelta(days=draw(st.integers(10, 80)))
        stem = ead(
            iso(stem_recommended),
            iso(stem_recommended + timedelta(days=3)),
            iso(stem_start),
            iso(last_day),
        )
    petition = None
    if draw(st.booleans()):
        filed = card_start + timedelta(days=draw(st.integers(0, 200)))
        october = date(filed.year + (1 if filed.month >= 10 else 0), 10, 1)
        petition = cap_gap(
            iso(october),
            status=draw(st.sampled_from(("pending", "approved", "denied"))),
            change_of_status=draw(st.booleans()),
            petition_filed_on=iso(filed),
        )
    span = (last_day - card_start).days
    marks = sorted(draw(st.sets(st.integers(0, span), min_size=1, max_size=6)))
    periods = []
    for start, end in zip(marks[0::2], [*marks[1::2], None], strict=False):
        stop = None if end is None else iso(card_start + timedelta(days=end))
        periods.append(
            job(
                iso(card_start + timedelta(days=start)),
                stop,
                hours=draw(st.sampled_from((10, 20, 40))),
                reported=draw(st.booleans()),
            )
        )
    return with_changes(
        STEM_ACROSS,
        program_end_date=iso(program_end),
        cpt_full_time_days=draw(st.one_of(st.none(), st.integers(0, 900))),
        opt=ead(
            iso(recommended), iso(recommended + timedelta(days=4)), iso(card_start), iso(card_end)
        ),
        stem=stem,
        employment=periods,
        cap_gap=petition,
    )


@settings(deadline=None, max_examples=60)
@given(
    st.dates(min_value=date(1951, 1, 1), max_value=TODAY),
    any_case(),
    st.booleans(),
    st.booleans(),
)
def test_holdout_point_59_any_clock_and_any_case_give_an_output(
    today: date, case: dict[str, Any], yes: bool, used: bool
) -> None:
    sound(run(case, today, pack=SHIPPED))
    sound(answer_all(case, today, answering(yes, used), pack=SHIPPED))


# Before every row: the shipped pack's first row begins 1982-09-13. A clock from 1951-01-01
# to 1975-12-31 and a case whose program ends 0 to 900 days before it: the last day of the
# case is at most 60 days, 12 months and 24 months after the program end, or the next
# 1 October after a filing within 200 days of the card, so before 1979-01-01.


@st.composite
def early_case(draw: st.DrawFn) -> tuple[date, dict[str, Any]]:
    today = draw(st.dates(min_value=date(1953, 1, 1), max_value=date(1975, 12, 31)))
    case = draw(any_case())
    shift = date.fromisoformat(case["program_end_date"]) - (
        today - timedelta(days=draw(st.integers(0, 900)))
    )

    def moved(day: str | None) -> str | None:
        return None if day is None else iso(date.fromisoformat(day) - shift)

    def moved_block(block: dict[str, Any] | None) -> dict[str, Any] | None:
        if block is None:
            return None
        return {k: moved(v) if isinstance(v, str) else v for k, v in block.items()}

    periods = [
        {**p, "start": moved(p["start"]), "end": moved(p["end"])} for p in case["employment"]
    ]
    petition = moved_block(case["cap_gap"])
    if petition is not None:
        filed = date.fromisoformat(petition["petition_filed_on"])
        petition["requested_start"] = iso(date(filed.year + (1 if filed.month >= 10 else 0), 10, 1))
    return today, with_changes(
        case,
        program_end_date=moved(case["program_end_date"]),
        opt=moved_block(case["opt"]),
        stem=moved_block(case["stem"]),
        employment=periods,
        cap_gap=petition,
    )


@settings(deadline=None, max_examples=40)
@given(early_case(), st.booleans(), st.booleans())
def test_holdout_point_59_before_every_row_nothing_is_dated_and_nothing_raises(
    drawn: tuple[date, dict[str, Any]], yes: bool, used: bool
) -> None:
    today, case = drawn
    for out in (
        run(case, today, pack=SHIPPED),
        answer_all(case, today, answering(yes, used), pack=SHIPPED),
    ):
        sound(out)
        assert [k for k, v in values(out).items() if isinstance(v, str)] == []
        assert values(out)[NOT_REPORTED] is None
        assert out["verdict"]["state"] != QUIET


# Point 60 on the shipped pack, a case like finding 3 of reviews/product-1-fix5.md: program
# end 2019-05-15, recommended 2019-04-01, filed 2019-04-10, card 2019-06-01 to 2020-05-31,
# one period 2019-07-15 to 2020-05-31 not reported (unemployment before it: June 1 to July
# 14, 30 + 14 = 44 days, under 90). The row of opt.report_employer_within_days begins
# 2025-05-19, six years after the period's start.
FROM_2019: dict[str, Any] = with_changes(
    STEM_ACROSS,
    program_end_date="2019-05-15",
    opt=ead("2019-04-01", "2019-04-10", "2019-06-01", "2020-05-31"),
    stem=None,
    employment=[job("2019-07-15", "2020-05-31", reported=False)],
)


def test_holdout_point_60_a_2019_period_not_reported_gives_no_count_and_steps_back() -> None:
    out = answer_all(FROM_2019, TODAY, answering(False), pack=SHIPPED)
    sound(out)
    assert items(out)[NOT_REPORTED]["value"] is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] == "talk_to_dso"


# Point 60 on the test pack with the report row moved to begin 2025-05-19. Program end
# 2025-04-15, recommended 2025-03-15, filed 2025-03-20, card 2025-05-01 to 2026-04-30.
ROW_FROM = date(2025, 5, 19)
PACK_2025 = copy.deepcopy(pack_dict(TODAY))
for _parameter in PACK_2025["parameters"]:
    if _parameter["id"] == OPT_REPORT_RULE:
        _parameter["effective_from"] = iso(ROW_FROM)
CARD_2025: dict[str, Any] = with_changes(
    STEM_ACROSS,
    program_end_date="2025-04-15",
    opt=ead("2025-03-15", "2025-03-20", "2025-05-01", "2026-04-30"),
    stem=None,
)


def test_holdout_point_60_one_period_before_the_row_and_one_after_give_null() -> None:
    # 2025-05-01 to 2025-05-10 starts before the row; 2025-05-19 to 2026-04-30 on its first
    # day. Both not reported. Counted from the later row, the count would be 2.
    case = with_changes(
        CARD_2025,
        employment=[
            job("2025-05-01", "2025-05-10", reported=False),
            job("2025-05-19", "2026-04-30", reported=False),
        ],
    )
    out = answer_all(case, TODAY, answering(False), raw_pack=PACK_2025)
    sound(out)
    assert values(out)[NOT_REPORTED] is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]


def test_holdout_point_60_two_periods_from_the_row_are_counted() -> None:
    # 2025-05-19 to 2025-08-31 and 2025-09-01 to 2026-04-30, both not reported: 2.
    case = with_changes(
        CARD_2025,
        employment=[
            job("2025-05-19", "2025-08-31", reported=False),
            job("2025-09-01", "2026-04-30", reported=False),
        ],
    )
    out = answer_all(case, TODAY, answering(False), raw_pack=PACK_2025)
    sound(out)
    assert values(out)[NOT_REPORTED] == 2


# The property of point 60: one to three periods, none reported, drawn inside the card
# 2025-05-01 to 2026-04-30 (364 days after its start). The count is null when any period
# starts before 2025-05-19 (18 days after the card's start), and the number of periods when
# none does.


@settings(deadline=None, max_examples=40)
@given(st.sets(st.integers(0, 364), min_size=1, max_size=6))
def test_holdout_point_60_the_count_reads_the_row_for_each_periods_start(
    marks_drawn: set[int],
) -> None:
    card_start = date(2025, 5, 1)
    marks = sorted(marks_drawn)
    periods = []
    starts = []
    for start, end in zip(marks[0::2], [*marks[1::2], None], strict=False):
        begin = card_start + timedelta(days=start)
        stop = card_start + timedelta(days=364 if end is None else end)
        starts.append(begin)
        periods.append(job(iso(begin), iso(stop), reported=False))
    out = answer_all(
        with_changes(CARD_2025, employment=periods), TODAY, answering(False), raw_pack=PACK_2025
    )
    sound(out)
    if min(starts) < ROW_FROM:
        assert values(out)[NOT_REPORTED] is None
        assert NOT_IN_FORCE in out["verdict"]["reasons"]
    else:
        assert values(out)[NOT_REPORTED] == len(periods)
