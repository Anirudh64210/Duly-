"""Hidden tests for the seventh fix: specs/product-1/SPEC-resolutions.md, point 63.

Point 63: when whole_shown finds no row for a rule that decides which items exist (the
validation interval, the extension length), the verdict steps back with
rule_not_in_force_on_event_day, as every other missing row does since point 59. A missing
row never leaves a quiet verdict. reviews/product-1-fix6.md, finding 4, gives the fault:
a pack without stem.validation_interval_months, or without stem.extension_months, gave
no_open_items with no reasons.

Not shown to the lanes that build. Written from the SPEC and the contracts, never from the
engine. The cases differ from those of tests/unit/engine/test_f1_fix7.py. The clock is
injected; every expected date and count is worked beside it.
"""

import copy
from collections.abc import Callable
from datetime import date, timedelta
from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from engine.rulepack import validate_pack
from tests.support.f1_pack import (
    CONFLICT_IDS,
    CPT_USED,
    NOT_AFTER_PROGRAM_END,
    WINDOW_CONFLICT_IDS,
    case_problems,
    clock_on,
    contract_problems,
    ead,
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
CONFLICTS = {*CONFLICT_IDS, *WINDOW_CONFLICT_IDS, NOT_AFTER_PROGRAM_END, OPEN_AFTER}
INTERVAL = "stem.validation_interval_months"
EXTENSION = "stem.extension_months"


def run(case: dict[str, Any], today: date, raw_pack: dict[str, Any]) -> dict[str, Any]:
    assert case_problems(case) == [], "the test case itself must match the case contract"
    clock = clock_on(today)
    return f1.compute_f1(
        f1.parse_case(refuse_placeholders(case), clock), validate_pack(raw_pack), clock
    )


def answering(question_id: str) -> bool:
    """Every conflict answered no, CPT not used, a new employer and earlier OPT not assumed,
    every other question answered yes."""
    if question_id in CONFLICTS or question_id == CPT_USED:
        return False
    return not (question_id.endswith(".new_employer") or question_id == EARLIER)


def answer_all(
    case: dict[str, Any],
    today: date,
    answer: Callable[[str], bool],
    raw_pack: dict[str, Any],
) -> dict[str, Any]:
    """Answer every question as the output asks it, on today, until none is left or twelve
    rounds have passed. Returns the last output."""
    out = run(case, today, raw_pack)
    for _ in range(12):
        if not out["questions"]:
            break
        confirmations = copy.deepcopy(case.get("confirmations") or {})
        for q in out["questions"]:
            confirmations[q["id"]] = {"answer": answer(q["id"]), "on": today.isoformat()}
            if "about" in q:
                confirmations[q["id"]]["about"] = copy.deepcopy(q["about"])
        case = with_changes(case, confirmations=confirmations)
        out = run(case, today, raw_pack)
    return out


def iso(day: date) -> str:
    return day.isoformat()


def reports(out: dict[str, Any]) -> list[str]:
    return sorted(i for i in values(out) if i.startswith("stem.validation_") and "_due" in i)


def undated(out: dict[str, Any]) -> bool:
    """Every validation report listed is null: none carries a date (points 40 and 59)."""
    found = values(out)
    return all(found[report] is None for report in reports(out))


def steps_back(out: dict[str, Any]) -> None:
    """In the contract, carries the step back, and is not the quiet state."""
    assert contract_problems(out) == []
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] != QUIET


# A doctoral STEM case, today inside its STEM card. Program end 2024-05-20; OPT recommended
# 2024-04-20 (30 days before), filed 2024-04-25, card 2024-07-01 to 2025-06-30 (12 months
# from 2024-07-01 is 2025-07-01, less a day); STEM recommended 2025-05-01 (60 days before
# 2025-06-30: 30 to 2025-05-31, 30 more to 2025-05-01), filed 2025-05-06, card 2025-07-01 to
# 2027-06-30 (24 months from 2025-07-01 is 2027-07-01, less a day). One period over the OPT
# card and the first months of the STEM card, 2024-07-01 to 2025-12-31, and one open from
# 2026-01-05, both inside the cards and reported.
DOCTORAL: dict[str, Any] = {
    "program_end_date": "2024-05-20",
    "degree_level": "doctorate",
    "documents_count": 4,
    "cpt_full_time_days": 0,
    "opt": ead("2024-04-20", "2024-04-25", "2024-07-01", "2025-06-30"),
    "stem": ead("2025-05-01", "2025-05-06", "2025-07-01", "2027-06-30"),
    "employment": [job("2024-07-01", "2025-12-31"), job("2026-01-05", None)],
    "cap_gap": None,
    "time_zone": "UTC",
}
# The day after the fourth report's day, 2027-07-01, which is itself the day after the card
# ends. A row that begins on it is in force on no day of the card, on no report's day, and
# not today, whichever of those days the engine reads the rule on.
AFTER_CARD = date(2027, 7, 2)


def starting_on(raw_pack: dict[str, Any], rule_id: str, first: date) -> dict[str, Any]:
    changed = copy.deepcopy(raw_pack)
    for parameter in changed["parameters"]:
        if parameter["id"] == rule_id:
            parameter["effective_from"] = iso(first)
    return changed


def test_holdout_the_doctoral_case_is_in_the_contract_and_today_is_inside_its_card() -> None:
    assert case_problems(DOCTORAL) == []
    assert date(2025, 7, 1) <= TODAY < AFTER_CARD


def test_holdout_point_63_control_the_plain_pack_lists_three_reports_and_no_step_back() -> None:
    # 24 months // 6 = 4 reports from 2025-07-01: 2026-01-01, 2026-07-01, 2027-01-01 and
    # 2027-07-01. The fourth lies after the card's end 2027-06-30 (point 48): three listed.
    out = answer_all(DOCTORAL, TODAY, answering, pack_dict(TODAY))
    assert contract_problems(out) == []
    assert reports(out) == [
        "stem.validation_1_due",
        "stem.validation_2_due",
        "stem.validation_3_due",
    ]
    assert NOT_IN_FORCE not in out["verdict"]["reasons"]


def test_holdout_point_63_a_pack_without_the_interval_steps_back() -> None:
    out = answer_all(DOCTORAL, TODAY, answering, pack_dict(TODAY, leave_out=(INTERVAL,)))
    steps_back(out)
    assert reports(out) == []


def test_holdout_point_63_a_pack_without_the_extension_length_steps_back() -> None:
    out = answer_all(DOCTORAL, TODAY, answering, pack_dict(TODAY, leave_out=(EXTENSION,)))
    steps_back(out)
    assert reports(out) == []


def test_holdout_point_63_the_interval_row_begins_after_the_card_so_the_verdict_steps_back() -> (
    None
):
    # Point 59 with point 63: the row exists, but is in force on no day of the card, on no
    # report's day and not on 2026-09-29. The verdict is not quiet. Points 40 and 59: an item
    # whose rule has no row in force on its day is null, so no report is dated from the row.
    # Point 63 names only a rule the pack does not hold at all; a row that exists may still
    # list its reports, each null (see the dispute in tests/REPORT.json).
    raw = starting_on(pack_dict(TODAY), INTERVAL, AFTER_CARD)
    out = answer_all(DOCTORAL, TODAY, answering, raw)
    steps_back(out)
    assert undated(out)


def test_holdout_point_63_the_extension_row_begins_after_the_card_so_the_verdict_steps_back() -> (
    None
):
    # Points 40, 59 and 63, as the test above: not quiet, and every listed report null.
    raw = starting_on(pack_dict(TODAY), EXTENSION, AFTER_CARD)
    out = answer_all(DOCTORAL, TODAY, answering, raw)
    steps_back(out)
    assert undated(out)


@st.composite
def stem_case_and_clock(draw: st.DrawFn) -> tuple[date, dict[str, Any]]:
    """A STEM card that begins on a drawn day from 2002-06-01 to 2035-12-31 and runs 24
    months less a day; the OPT card is the 12 months before it. The program ends 42 days
    before the OPT card; OPT recommended 30 days before the program end, filed 5 days on;
    STEM recommended 60 days before the OPT card ends, filed 5 days on. One period open from
    the OPT card's start. The earliest event is the OPT recommendation: 2002-06-01 less 12
    months is 2001-06-01, less 42 days is 2001-04-20, less 30 days is 2001-03-21, after
    2000-01-01 when every row of the test pack begins, so no other rule is missing. The clock
    is drawn from the STEM card's start (after every filing) to 400 days past its end."""
    stem_start = draw(st.dates(min_value=date(2002, 6, 1), max_value=date(2035, 12, 31)))
    stem_end = months_later(stem_start, 24) - ONE_DAY
    opt_start = months_later(stem_start, -12)
    opt_end = stem_start - ONE_DAY
    program_end = opt_start - timedelta(days=42)
    recommended = program_end - timedelta(days=30)
    stem_recommended = opt_end - timedelta(days=60)
    case = with_changes(
        DOCTORAL,
        program_end_date=iso(program_end),
        opt=ead(
            iso(recommended), iso(recommended + timedelta(days=5)), iso(opt_start), iso(opt_end)
        ),
        stem=ead(
            iso(stem_recommended),
            iso(stem_recommended + timedelta(days=5)),
            iso(stem_start),
            iso(stem_end),
        ),
        employment=[job(iso(opt_start), None)],
    )
    today = draw(st.dates(min_value=stem_start, max_value=stem_end + timedelta(days=400)))
    return today, case


@settings(max_examples=25, deadline=None)
@given(
    drawn=stem_case_and_clock(),
    leave_out=st.sampled_from(((INTERVAL,), (EXTENSION,), (INTERVAL, EXTENSION))),
)
def test_holdout_point_63_any_stem_case_on_a_pack_without_the_rules_is_never_quiet(
    drawn: tuple[date, dict[str, Any]], leave_out: tuple[str, ...]
) -> None:
    today, case = drawn
    out = answer_all(case, today, answering, pack_dict(today, leave_out=leave_out))
    steps_back(out)
    assert reports(out) == []
