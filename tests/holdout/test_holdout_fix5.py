"""Hidden tests for the fifth fix: specs/product-1/SPEC-resolutions.md, points 55 and 56.

Point 55: an item carries an alternate only where the alternate holds a value. Point 56:
every rule is looked up for the day of the event it governs, opt.report_employer_within_days
for a period's end included; no row in force on that day gives null with the step back,
never an error, whatever the clock and the case.

Not shown to the lanes that build. Written from the SPEC and the contracts, never from the
engine. The cases differ from those of tests/unit/engine/test_f1_fix5.py. The clock is
injected; every expected date is worked beside it. Every answer is given on the day of the
case with the about the output asked it with, so no placeholder reaches the engine.
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
    case_problems,
    clock_on,
    contract_problems,
    ead,
    items,
    job,
    pack_dict,
    question_ids,
    refuse_placeholders,
    values,
    with_changes,
)

TODAY = date(2026, 9, 29)
CLOCK_2016 = date(2016, 10, 1)
CLOCK_2024 = date(2024, 9, 1)

EARLIER = "opt.earlier_at_this_level"
OPEN_AFTER = "employment.period_open_after_last_card"
NOT_IN_FORCE = "rule_not_in_force_on_event_day"
OPT_REPORT_RULE = "opt.report_employer_within_days"
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


def usual_answer(question_id: str) -> bool:
    """A new employer, earlier OPT at the level and full-time CPT are not assumed; the
    other questions of the person are answered yes. A conflict is named by the test."""
    assert question_id not in CONFLICTS, f"{question_id} is asked; the test must answer it"
    return not (question_id.endswith(".new_employer") or question_id in (EARLIER, CPT_USED))


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


def chosen(**given_answers: bool) -> Callable[[str], bool]:
    picked = {key.replace("__", "."): value for key, value in given_answers.items()}
    return lambda q: picked[q] if q in picked else usual_answer(q)


NOT_REPORTED_1 = chosen(employment__1__end_reported=False)


def shipped() -> Rulepack:
    return next(p for p in load_all() if p.category == "f1")


def null_alternates(out: dict[str, Any]) -> list[str]:
    return [
        entry["id"]
        for entry in [*out["computed"], *out["upcoming"]]
        for alternate in entry.get("alternates", [])
        if alternate["value"] is None
    ]


def report_by(out: dict[str, Any], number: int) -> Any:
    return items(out)[f"employment.{number}.end_report_by"]["value"]


# Point 55. The card ends on the program end day itself, which point 27 raises too ("on
# or before"). Program end 2026-08-31, recommended 2026-02-01, filed 2026-02-10 (9 days
# on), card 2026-03-01 to 2026-08-31, one period over the card, closed on its last day.
ON_THE_END_DAY: dict[str, Any] = {
    "program_end_date": "2026-08-31",
    "degree_level": "bachelor",
    "documents_count": 1,
    "cpt_full_time_days": 0,
    "opt": ead("2026-02-01", "2026-02-10", "2026-03-01", "2026-08-31"),
    "stem": None,
    "employment": [job("2026-03-01", "2026-08-31")],
    "cap_gap": None,
    "time_zone": "UTC",
}


def test_holdout_point_55_a_card_ending_on_the_program_end_carries_no_null_alternate():
    for pack in (None, shipped()):
        out = run(ON_THE_END_DAY, pack=pack)
        assert NOT_AFTER_PROGRAM_END in question_ids(out)
        assert values(out)["grace.ends"] is None
        assert null_alternates(out) == []
        assert contract_problems(out) == []


def test_holdout_point_55_answered_no_the_case_of_point_27_carries_no_null_alternate():
    # Point 42: answered no, the case stays cannot_tell with the items of the card null.
    answer = chosen(opt__ead_end__not_after_program_end=False, employment__1__end_reported=True)
    out = answer_all(ON_THE_END_DAY, TODAY, answer, pack=shipped())
    assert out["verdict"]["state"] == "cannot_tell"
    assert null_alternates(out) == []


def test_holdout_point_55_answered_yes_the_case_of_point_27_carries_no_null_alternate():
    answer = chosen(opt__ead_end__not_after_program_end=True, employment__1__end_reported=True)
    out = answer_all(ON_THE_END_DAY, TODAY, answer, pack=shipped())
    assert null_alternates(out) == []
    assert contract_problems(out) == []


def test_holdout_point_55_an_ended_card_keeps_its_alternate_with_a_value():
    # Program end 2025-01-15, card 2025-02-01 to 2026-01-31, one period over it, closed.
    # grace.ends: 2026-01-31 plus 60 days: 28 reach Feb 28 (2026 is not a leap year), 31
    # reach Mar 31 (59), 1 more: 2026-04-01. The paused row's 30: 28 reach Feb 28, 2 more:
    # 2026-03-02. Both hold a value and they differ, so the alternate stays.
    case = with_changes(
        ON_THE_END_DAY,
        program_end_date="2025-01-15",
        opt=ead("2024-12-01", "2024-12-10", "2025-02-01", "2026-01-31"),
        employment=[job("2025-02-01", "2026-01-31")],
    )
    out = answer_all(case, TODAY, chosen())
    grace = items(out)["grace.ends"]
    assert grace["value"] == "2026-04-01"
    assert [a["value"] for a in grace.get("alternates", [])] == ["2026-03-02"]


# Point 56 with the clock at 2016-10-01: program end 2015-12-15, recommended 2015-11-15,
# filed 2015-11-20 (5 days on), card 2016-01-04 to 2017-01-03 (12 months from 2016-01-04 is
# 2017-01-04), running on the clock's day. Two periods: 2016-01-04 to 2016-04-29, closed,
# and 2016-05-16, open. Unemployment between: Apr 30 (1) and May 1 to 15 (15), 16 days.
# Had the report row been in force, the first end's report would be 2016-04-29 plus 10
# days: 1 reaches Apr 30, 9 more 2016-05-09.
TWO_PERIODS_2016: dict[str, Any] = with_changes(
    ON_THE_END_DAY,
    program_end_date="2015-12-15",
    degree_level="master",
    opt=ead("2015-11-15", "2015-11-20", "2016-01-04", "2017-01-03"),
    employment=[job("2016-01-04", "2016-04-29"), job("2016-05-16", None)],
)
# Point 56 with the clock at 2024-09-01: program end 2024-01-10, recommended 2023-12-10,
# filed 2023-12-15, card 2024-02-01 to 2025-01-31, one period ended on the clock's day.
# Had the row been in force: 2024-09-01 plus 10 days, 2024-09-11.
ENDS_ON_THE_CLOCK_DAY: dict[str, Any] = with_changes(
    ON_THE_END_DAY,
    program_end_date="2024-01-10",
    opt=ead("2023-12-10", "2023-12-15", "2024-02-01", "2025-01-31"),
    employment=[job("2024-02-01", "2024-09-01")],
)


def test_holdout_point_56_two_periods_in_2016_give_an_output():
    out = run(TWO_PERIODS_2016, CLOCK_2016, pack=shipped())
    assert contract_problems(out) == []


def test_holdout_point_56_two_periods_in_2016_the_report_is_null_and_steps_back():
    out = answer_all(TWO_PERIODS_2016, CLOCK_2016, NOT_REPORTED_1, pack=shipped())
    assert report_by(out, 1) is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] == "talk_to_dso"
    assert null_alternates(out) == []


def test_holdout_point_56_a_period_ending_on_the_clock_day_in_2024_gives_an_output():
    out = run(ENDS_ON_THE_CLOCK_DAY, CLOCK_2024, pack=shipped())
    assert contract_problems(out) == []


def test_holdout_point_56_a_period_ending_on_the_clock_day_in_2024_steps_back():
    out = answer_all(ENDS_ON_THE_CLOCK_DAY, CLOCK_2024, NOT_REPORTED_1, pack=shipped())
    assert report_by(out, 1) is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] == "talk_to_dso"


def test_holdout_point_56_the_test_pack_in_2016_gives_an_output_too():
    # The test pack's rows are in force from 2000, the report row among them: 2016-05-09.
    out = answer_all(TWO_PERIODS_2016, CLOCK_2016, NOT_REPORTED_1)
    assert report_by(out, 1) == "2016-05-09"
    assert contract_problems(out) == []


# The row looked up for the end, with the clock before today. The test pack on 2024-09-01
# with the report row taking effect 2024-06-01. Program end 2023-06-15, recommended
# 2023-05-15, filed 2023-05-20, card 2023-07-01 to 2024-06-30 (12 months from 2023-07-01 is
# 2024-07-01), one period from the card start.
ROW_FROM = "2024-06-01"
PACK_2024 = copy.deepcopy(pack_dict(CLOCK_2024))
for _parameter in PACK_2024["parameters"]:
    if _parameter["id"] == OPT_REPORT_RULE:
        _parameter["effective_from"] = ROW_FROM
BEFORE_THE_ROW: dict[str, Any] = with_changes(
    ON_THE_END_DAY,
    program_end_date="2023-06-15",
    opt=ead("2023-05-15", "2023-05-20", "2023-07-01", "2024-06-30"),
    employment=[job("2023-07-01", "2024-05-31")],
)


def test_holdout_point_56_an_end_the_day_before_the_row_is_null_with_the_step_back():
    out = answer_all(BEFORE_THE_ROW, CLOCK_2024, NOT_REPORTED_1, raw_pack=PACK_2024)
    assert report_by(out, 1) is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert contract_problems(out) == []


def test_holdout_point_56_an_end_on_the_rows_first_day_is_dated():
    # 2024-06-01 plus 10 days: 2024-06-11.
    case = with_changes(BEFORE_THE_ROW, employment=[job("2023-07-01", ROW_FROM)])
    out = answer_all(case, CLOCK_2024, NOT_REPORTED_1, raw_pack=PACK_2024)
    assert report_by(out, 1) == "2024-06-11"


# The property: any clock day from 2008-04-08 (the first day of the shipped OPT window rows)
# to 2025-05-18 (the day before the report row), any OPT case with one to three periods,
# every date on or before the clock but the card's end. An output, never an error; each
# end's report null with the step back; no null alternate.


@st.composite
def dated_case(draw: st.DrawFn) -> tuple[date, dict[str, Any]]:
    today = draw(st.dates(min_value=date(2009, 1, 1), max_value=date(2025, 5, 18)))
    card_start = today - timedelta(days=draw(st.integers(min_value=0, max_value=700)))
    card_end = card_start + timedelta(days=draw(st.integers(min_value=30, max_value=364)))
    program_end = card_start - timedelta(days=draw(st.integers(min_value=-30, max_value=60)))
    recommended = min(program_end, card_start) - timedelta(days=20)
    last = min(today, card_end)
    span = (last - card_start).days
    marks = sorted(draw(st.sets(st.integers(0, span), min_size=1, max_size=6)))
    periods = []
    for start, end in zip(marks[0::2], [*marks[1::2], None], strict=False):
        begin = card_start + timedelta(days=start)
        stop = None if end is None else card_start + timedelta(days=end)
        periods.append(job(begin.isoformat(), None if stop is None else stop.isoformat()))
    case = with_changes(
        ON_THE_END_DAY,
        program_end_date=program_end.isoformat(),
        opt=ead(
            recommended.isoformat(),
            (recommended + timedelta(days=4)).isoformat(),
            card_start.isoformat(),
            card_end.isoformat(),
        ),
        employment=periods,
    )
    return today, case


SHIPPED = shipped()


@settings(deadline=None, max_examples=40)
@given(dated_case(), st.booleans())
def test_holdout_point_56_no_clock_before_the_report_row_makes_the_engine_fail(drawn, yes):
    today, case = drawn

    def answer(question_id: str) -> bool:
        if question_id.endswith(".end_reported"):
            return False
        if question_id in CONFLICTS:
            return yes
        return usual_answer(question_id)

    for out in (run(case, today, pack=SHIPPED), answer_all(case, today, answer, pack=SHIPPED)):
        assert contract_problems(out) == []
        assert null_alternates(out) == []
        reports = [e for e in items(out).values() if e["id"].endswith(".end_report_by")]
        for report in reports:
            assert report["value"] is None, report["id"]
        if reports:
            assert NOT_IN_FORCE in out["verdict"]["reasons"]
