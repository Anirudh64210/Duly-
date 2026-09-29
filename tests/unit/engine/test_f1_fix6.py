"""engine/f1.py: the sixth fix. specs/product-1/SPEC-resolutions.md, points 59 and 60.

Point 59: no rule lookup ever raises. Where no row is in force on the day a rule is read,
whole_rule, value_of and show give null with the step back (rule_not_in_force_on_event_day),
as the report row does since point 56. A property test draws clocks and cases across the
whole range the contract allows, including before every row's start. Point 60:
employment.periods_not_reported reads its rule for each period's start (point 56); a period
that starts before the rule's row gives null with rule_not_in_force_on_event_day, never a
count from a rule that came later. reviews/product-1-fix5.md, findings 2 and 3, give the
cases.

Written before the engine has them, from the SPEC and the contracts, never from the
engine. The clock is injected at noon UTC on the day of each case. Every answer is given on
the day of the case with the about the output asked it with (points 2 and 7).

Every expected date and count was worked out by hand. The working is beside it.
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
PACK = pack_dict(TODAY)

EARLIER = "opt.earlier_at_this_level"
OPEN_AFTER = "employment.period_open_after_last_card"
NOT_IN_FORCE = "rule_not_in_force_on_event_day"
QUIET = "no_open_items"
OPT_REPORT_RULE = "opt.report_employer_within_days"
NOT_REPORTED = "employment.periods_not_reported"
CONFLICTS = {*CONFLICT_IDS, *WINDOW_CONFLICT_IDS, NOT_AFTER_PROGRAM_END, OPEN_AFTER}

# The first day of the earliest row of the shipped f1 pack: capgap.fiscal_year_start_month_day,
# in force from 1982-09-13 (rulepacks/f1-us/v2026.09/parameters.yaml). Before it, no rule of
# the pack has a row in force. The case contract takes dates from 1950-01-01.
FIRST_ROW = date(1982, 9, 13)
FIRST_CASE_DAY = date(1950, 1, 1)
# The shipped rows the review names: stem.validation_interval_months from 2016-05-10 and
# cpt.full_time_bar_days from 2003-01-01.
STEM_ROWS_FROM = date(2016, 5, 10)
CPT_ROW_FROM = date(2003, 1, 1)


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
    return f1.compute_f1(f1.parse_case(refuse_placeholders(case), clock), pack, clock)


def answer_with(yes_to_conflicts: bool, cpt_used: bool = False) -> Callable[[str], bool]:
    """Every conflict answered as given, full-time CPT used as given, a new employer and
    earlier OPT at the level not assumed, every other question answered yes, as in
    test_f1_fix5.py."""

    def answer(question_id: str) -> bool:
        if question_id in CONFLICTS:
            return yes_to_conflicts
        if question_id == CPT_USED:
            return cpt_used
        return not (question_id.endswith(".new_employer") or question_id == EARLIER)

    return answer


def settle_with(
    case: dict[str, Any],
    today: date,
    answer: Callable[[str], bool],
    raw_pack: dict[str, Any] | None = None,
    pack: Rulepack | None = None,
) -> dict[str, Any]:
    """Answer every question the output asks, in the order it asks them (an answer can
    raise another), on today with the about as asked, as the screen does. Returns the last
    output."""
    out = run(case, today, raw_pack, pack)
    for _ in range(12):
        asked = out["questions"]
        if not asked:
            break
        confirmations = copy.deepcopy(case.get("confirmations") or {})
        for q in asked:
            confirmations[q["id"]] = {"answer": answer(q["id"]), "on": today.isoformat()}
            if "about" in q:
                confirmations[q["id"]]["about"] = copy.deepcopy(q["about"])
        case = with_changes(case, confirmations=confirmations)
        out = run(case, today, raw_pack, pack)
    return out


def iso(day: date) -> str:
    return day.isoformat()


def shipped() -> Rulepack:
    return next(p for p in load_all() if p.category == "f1")


SHIPPED = shipped()


def null_alternates(out: dict[str, Any]) -> list[str]:
    """The ids of the items that carry an alternate whose value is null (point 55)."""
    return [
        entry["id"]
        for entry in [*out["computed"], *out["upcoming"]]
        for alternate in entry.get("alternates", [])
        if alternate["value"] is None
    ]


def check_an_output(out: dict[str, Any]) -> None:
    """Point 59 on one output: it is given, it meets the contract, it carries no null
    alternate (point 55), and a step back is never the quiet state (CLAUDE.md)."""
    assert contract_problems(out) == []
    assert null_alternates(out) == []
    if NOT_IN_FORCE in out["verdict"]["reasons"]:
        assert out["verdict"]["state"] != QUIET


# The STEM case of reviews/product-1-fix5.md, finding 2: program end 2025-02-15, OPT card
# 2025-03-13 to 2026-03-12 (12 months from 2025-03-13 is 2026-03-13, less a day), STEM card
# 2026-03-13 to 2028-03-12 (24 months from 2026-03-13 is 2028-03-13, less a day), one period
# open from the OPT card's start. The review does not give the recommendations and filings:
# OPT recommended 2025-01-20 (26 days before the program end), filed 2025-01-25 (5 days on);
# STEM recommended 2026-01-10, filed 2026-01-15 (56 days before the OPT card ends).
STEM_CASE: dict[str, Any] = {
    "program_end_date": "2025-02-15",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "opt": ead("2025-01-20", "2025-01-25", "2025-03-13", "2026-03-12"),
    "stem": ead("2026-01-10", "2026-01-15", "2026-03-13", "2028-03-12"),
    "employment": [job("2025-03-13", None)],
    "cap_gap": None,
    "time_zone": "UTC",
}
# Finding 2's clock for it: 2016-05-09, the day before the shipped STEM rows.
CLOCK_STEM = date(2016, 5, 9)

# The second STEM case of finding 2: program end 2012-02-15, OPT card 2012-03-13 to
# 2013-03-12, STEM card 2013-03-13 to 2014-07-12, clock 2014-01-15. Recommended and filed
# as above, a year and more earlier: OPT 2012-01-20 and 2012-01-25, STEM 2013-01-10 and
# 2013-01-15. One period open from 2012-03-13.
STEM_2012: dict[str, Any] = with_changes(
    STEM_CASE,
    program_end_date="2012-02-15",
    opt=ead("2012-01-20", "2012-01-25", "2012-03-13", "2013-03-12"),
    stem=ead("2013-01-10", "2013-01-15", "2013-03-13", "2014-07-12"),
    employment=[job("2012-03-13", None)],
)
CLOCK_2014 = date(2014, 1, 15)

# The OPT case of finding 2 (fix 4's finding 1): program end 2026-05-15, OPT card 2026-06-01
# to 2027-05-31, cpt_full_time_days 400, one period open from 2026-06-01. Recommended
# 2026-04-01, filed 2026-04-10. Clock 2002-12-31, the day before cpt.full_time_bar_days.
CPT_CASE: dict[str, Any] = with_changes(
    STEM_CASE,
    program_end_date="2026-05-15",
    cpt_full_time_days=400,
    opt=ead("2026-04-01", "2026-04-10", "2026-06-01", "2027-05-31"),
    stem=None,
    employment=[job("2026-06-01", None)],
)
CLOCK_2002 = date(2002, 12, 31)

# The same OPT case moved wholly before 2003-01-01, the clock on 2002-12-31: program end
# 2001-05-15, recommended 2001-04-01, filed 2001-04-10, card 2001-06-01 to 2002-05-31, one
# period over the card. Every event of the case lies before 2003-01-01, the first day of
# opt.max_months, opt.complete_within_months, grace.after_completion_days and the CPT rows.
CPT_2001: dict[str, Any] = with_changes(
    CPT_CASE,
    program_end_date="2001-05-15",
    opt=ead("2001-04-01", "2001-04-10", "2001-06-01", "2002-05-31"),
    employment=[job("2001-06-01", "2002-05-31")],
)


def test_the_cases_of_this_file_match_the_case_contract() -> None:
    for case in (STEM_CASE, STEM_2012, CPT_CASE, CPT_2001, FINDING_3, BEFORE_ROW, ON_ROW):
        assert case_problems(case) == []
    # The clocks lie before the rows the review names.
    assert CLOCK_STEM < STEM_ROWS_FROM
    assert CLOCK_2014 < STEM_ROWS_FROM
    assert CLOCK_2002 < CPT_ROW_FROM


# Point 59 with the cases and clocks of reviews/product-1-fix5.md, finding 2.


def test_point_59_the_stem_case_with_the_clock_at_2016_05_09_gives_an_output() -> None:
    # Finding 2: RulepackError "stem.validation_interval_months: no rule in force on ...".
    check_an_output(run(STEM_CASE, CLOCK_STEM, pack=SHIPPED))


def test_point_59_the_stem_case_at_2016_05_09_answered_in_full_gives_an_output() -> None:
    # Every date of the case lies after the clock, so the after_today conflicts are raised
    # and answered, each way.
    for yes in (True, False):
        check_an_output(settle_with(STEM_CASE, CLOCK_STEM, answer_with(yes), pack=SHIPPED))


def test_point_59_the_2012_stem_case_with_the_clock_at_2014_01_15_gives_an_output() -> None:
    check_an_output(run(STEM_2012, CLOCK_2014, pack=SHIPPED))


def test_point_59_in_the_2012_stem_case_each_validation_is_null_with_the_step_back() -> None:
    # STEM start 2013-03-13. Six months on: 2013-09-13; twelve: 2014-03-13; eighteen:
    # 2014-09-13 (after the card, if given at all); the twelve-month evaluation is due
    # around 2014-03-13 too. Each of these days, and the clock 2014-01-15, lies before
    # 2016-05-10, the first day of stem.validation_interval_months and
    # stem.evaluation_interval_months. No row is in force on any day the rule is read, so
    # each is null and the verdict steps back.
    out = settle_with(STEM_2012, CLOCK_2014, answer_with(False), pack=SHIPPED)
    check_an_output(out)
    got = values(out)
    for item_id in (
        "stem.validation_1_due",
        "stem.validation_2_due",
        "stem.validation_3_due",
        "stem.validation_4_due",
        "stem.evaluation_12_month_due",
    ):
        assert got[item_id] is None, item_id
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] != QUIET


def test_point_59_the_opt_case_with_cpt_days_at_2002_12_31_gives_an_output() -> None:
    # Finding 2: RulepackError "cpt.full_time_bar_days: no rule in force on 2002-12-31" with
    # 400 days entered. The default of the review, 0 days, is sent too.
    for days in (400, 0):
        case = with_changes(CPT_CASE, cpt_full_time_days=days)
        check_an_output(run(case, CLOCK_2002, pack=SHIPPED))


def test_point_59_the_opt_case_with_cpt_days_at_2002_12_31_answered_gives_an_output() -> None:
    for used in (True, False):
        for yes in (True, False):
            out = settle_with(CPT_CASE, CLOCK_2002, answer_with(yes, used), pack=SHIPPED)
            check_an_output(out)


def test_point_59_with_cpt_days_left_blank_the_same_clock_gives_an_output() -> None:
    # The control of finding 2: with cpt_full_time_days null the clock already gave 200.
    case = with_changes(CPT_CASE, cpt_full_time_days=None)
    check_an_output(run(case, CLOCK_2002, pack=SHIPPED))


def test_point_59_a_case_wholly_before_the_cpt_row_steps_back() -> None:
    # Program end 2001-05-15: opt.complete_within_months (from 2003-01-01) gives no date
    # for it, and the card 2001-06-01 to 2002-05-31 has no opt.max_months row to be held
    # to. Answered in full, the output steps back and holds no date from a rule that came
    # later.
    out = settle_with(CPT_2001, CLOCK_2002, answer_with(False, True), pack=SHIPPED)
    check_an_output(out)
    assert values(out)["opt.complete_by"] is None
    assert values(out)["grace.ends"] is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] != QUIET


# Point 59, the property: a clock drawn from before every row's start through today, and a
# case of every shape the contract allows: OPT only, OPT and STEM, cap-gap, full-time CPT
# entered. The engine gives an output and never raises, unanswered and answered in full.

SHAPES = ("opt_only", "opt_and_stem", "cap_gap", "cpt_entered")


@st.composite
def case_on(draw: st.DrawFn, first: date, last: date) -> tuple[date, dict[str, Any]]:
    """A clock day from first to last, and a case of a drawn shape around it. The program
    ends 0 to 1500 days before the clock; the OPT card begins 1 to 60 days after it and runs
    1 to 12 months; recommended 30 days before the program end, filed 5 days on. The STEM
    card follows the OPT card for 24 months, recommended 60 days before the OPT card ends.
    A cap-gap petition is filed 30 days into the card for the next 1 October. One or two
    periods inside the cards. Every date is from 1950-01-01, the contract's first day."""
    today = draw(st.dates(min_value=first, max_value=last))
    shape = draw(st.sampled_from(SHAPES))
    program_end = today - timedelta(days=draw(st.integers(min_value=0, max_value=1500)))
    card_start = program_end + timedelta(days=draw(st.integers(min_value=1, max_value=60)))
    card_end = months_later(card_start, draw(st.integers(min_value=1, max_value=12))) - ONE_DAY
    recommended = program_end - timedelta(days=30)
    last_day = card_end
    stem = None
    if shape == "opt_and_stem":
        stem_start = card_end + ONE_DAY
        last_day = months_later(stem_start, 24) - ONE_DAY
        stem_recommended = card_end - timedelta(days=60)
        stem = ead(
            iso(stem_recommended),
            iso(stem_recommended + timedelta(days=5)),
            iso(stem_start),
            iso(last_day),
        )
    petition = None
    if shape == "cap_gap":
        filed = card_start + timedelta(days=30)
        october = date(filed.year + (1 if filed.month >= 10 else 0), 10, 1)
        petition = cap_gap(
            iso(october),
            status=draw(st.sampled_from(("pending", "approved"))),
            petition_filed_on=iso(filed),
        )
    first_start = card_start + timedelta(days=draw(st.integers(min_value=0, max_value=20)))
    first_end: date | None = None
    if draw(st.booleans()):
        first_end = min(first_start + timedelta(days=draw(st.integers(0, 800))), last_day)
    periods = [
        job(
            iso(first_start),
            None if first_end is None else iso(first_end),
            reported=draw(st.booleans()),
        )
    ]
    if first_end is not None and first_end < last_day and draw(st.booleans()):
        second_start = min(first_end + timedelta(days=draw(st.integers(1, 30))), last_day)
        periods.append(job(iso(second_start), None, reported=draw(st.booleans())))
    case = with_changes(
        STEM_CASE,
        program_end_date=iso(program_end),
        cpt_full_time_days=draw(st.integers(1, 700)) if shape == "cpt_entered" else 0,
        opt=ead(
            iso(recommended), iso(recommended + timedelta(days=5)), iso(card_start), iso(card_end)
        ),
        stem=stem,
        employment=periods,
        cap_gap=petition,
    )
    return today, case


def test_point_59_the_drawn_cases_reach_before_every_row_and_stay_in_the_contract() -> None:
    # The first clock drawn, 1955-01-01, lies before 1982-09-13. Its earliest case day is
    # the recommendation: 1500 days back, then 30 more. 1955-01-01 less four years is
    # 1951-01-01, 1461 days (1952 is a leap year); 39 days more is 1950-11-23 (31 in
    # December, 8 in November); 30 more is 1950-10-24, after 1950-01-01.
    assert date(1955, 1, 1) < FIRST_ROW
    assert date(1955, 1, 1) - timedelta(days=1500) == date(1950, 11, 23)
    assert date(1955, 1, 1) - timedelta(days=1530) == date(1950, 10, 24)
    assert date(1950, 10, 24) >= FIRST_CASE_DAY


@settings(deadline=None, max_examples=60)
@given(case_on(date(1955, 1, 1), TODAY), st.booleans(), st.booleans())
def test_point_59_no_clock_and_no_case_of_any_shape_makes_the_engine_fail(
    drawn: tuple[date, dict[str, Any]], yes: bool, used: bool
) -> None:
    today, case = drawn
    assert case_problems(case) == []
    check_an_output(run(case, today, pack=SHIPPED))
    check_an_output(settle_with(case, today, answer_with(yes, used), pack=SHIPPED))


# Before every row's start: the clock on or before 1978-12-31. The latest day of a drawn
# case is the STEM card's end: the clock, plus 60 days to the OPT card, plus up to 12
# months, plus 24 months, which is before 1982-02-01, and a cap-gap October 1 is within
# 13 months of the card. Every rule read for any event of the case, or for today, has no
# row in force: no computed item holds a date, the count of point 60 is null, and answered
# in full the verdict steps back.


@settings(deadline=None, max_examples=40)
@given(case_on(date(1955, 1, 1), date(1978, 12, 31)), st.booleans(), st.booleans())
def test_point_59_before_every_rows_start_no_item_is_dated_and_the_verdict_steps_back(
    drawn: tuple[date, dict[str, Any]], yes: bool, used: bool
) -> None:
    today, case = drawn
    for out in (
        run(case, today, pack=SHIPPED),
        settle_with(case, today, answer_with(yes, used), pack=SHIPPED),
    ):
        check_an_output(out)
        dated = {k: v for k, v in values(out).items() if isinstance(v, str)}
        assert dated == {}
        assert values(out)[NOT_REPORTED] is None
        assert out["verdict"]["state"] in ("talk_to_dso", "cannot_tell")
        if not out["questions"]:
            assert NOT_IN_FORCE in out["verdict"]["reasons"]


# Point 60 with the case of reviews/product-1-fix5.md, finding 3: program end 2015-05-15,
# card 2015-06-01 to 2016-05-31, one period 2015-06-01 to 2016-05-31 with employer_reported
# false, answered in full, today 2026-09-29. Recommended 2015-04-01, filed 2015-04-10. The
# shipped row of opt.report_employer_within_days begins 2025-05-19; the period starts ten
# years before it.
FINDING_3: dict[str, Any] = with_changes(
    STEM_CASE,
    program_end_date="2015-05-15",
    opt=ead("2015-04-01", "2015-04-10", "2015-06-01", "2016-05-31"),
    stem=None,
    employment=[job("2015-06-01", "2016-05-31", reported=False)],
)


def test_point_60_the_case_of_finding_3_counts_no_period_from_a_later_rule() -> None:
    out = settle_with(FINDING_3, TODAY, answer_with(False), pack=SHIPPED)
    check_an_output(out)
    count = items(out)[NOT_REPORTED]
    assert count["value"] is None
    assert OPT_REPORT_RULE in count["rule_ids"]
    assert NOT_IN_FORCE in out["verdict"]["reasons"]


def test_point_60_the_case_of_finding_3_steps_back_and_does_not_ask_for_a_report() -> None:
    # Finding 3 gave needs_you report_employer from a count of 1. On the shipped pack the
    # paused grace rows begin 2026-09-15, after the card, so no alternate holds the verdict
    # at cannot_tell: it is the step back.
    out = settle_with(FINDING_3, TODAY, answer_with(False), pack=SHIPPED)
    assert out["verdict"]["state"] == "talk_to_dso"


def test_point_60_the_case_of_finding_3_unanswered_holds_no_count() -> None:
    out = run(FINDING_3, TODAY, pack=SHIPPED)
    check_an_output(out)
    assert values(out)[NOT_REPORTED] is None


# The row is read for each period's start, not for its end and not for today. The test pack
# with the row of opt.report_employer_within_days moved to begin 2025-05-19, as the shipped
# one does. Program end 2025-04-15, recommended 2025-03-15, filed 2025-03-20 (5 days on),
# card 2025-05-01 to 2026-04-30 (12 months from 2025-05-01 is 2026-05-01, less a day). One
# period, not reported, to the card's end 2026-04-30, after the row began.
REPORT_ROW_FROM = "2025-05-19"
REPORT_FROM_2025 = copy.deepcopy(PACK)
for _parameter in REPORT_FROM_2025["parameters"]:
    if _parameter["id"] == OPT_REPORT_RULE:
        _parameter["effective_from"] = REPORT_ROW_FROM
BEFORE_ROW: dict[str, Any] = with_changes(
    STEM_CASE,
    program_end_date="2025-04-15",
    opt=ead("2025-03-15", "2025-03-20", "2025-05-01", "2026-04-30"),
    stem=None,
    employment=[job("2025-05-18", "2026-04-30", reported=False)],
)
ON_ROW = with_changes(BEFORE_ROW, employment=[job(REPORT_ROW_FROM, "2026-04-30", reported=False)])


def test_point_60_a_period_that_starts_the_day_before_the_row_gives_null() -> None:
    # Start 2025-05-18, one day before the row. Its end 2026-04-30 and today 2026-09-29 both
    # have the row, so a count read for either would be 1.
    out = settle_with(BEFORE_ROW, TODAY, answer_with(False), raw_pack=REPORT_FROM_2025)
    check_an_output(out)
    assert values(out)[NOT_REPORTED] is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]


def test_point_60_a_period_that_starts_on_the_rows_first_day_is_counted() -> None:
    # Start 2025-05-19, the row's first day: one period not reported, the count is 1.
    out = settle_with(ON_ROW, TODAY, answer_with(False), raw_pack=REPORT_FROM_2025)
    check_an_output(out)
    assert values(out)[NOT_REPORTED] == 1
