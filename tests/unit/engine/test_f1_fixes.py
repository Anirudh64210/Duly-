"""engine/f1.py: the answers to the phase 2 review.

Specified in specs/phase-2/SPEC-fixes.md, findings 1, 2, 4, 5 and 7. The inputs the
reviewer used are in reviews/phase-2.md and appear here as written there.

Every expected date and count was worked out by hand. The working is beside it.
The open points are listed in tests/PROGRESS.md under "Questions".
"""

import sys
import time
from collections.abc import Callable
from datetime import date, timedelta
from pathlib import Path
from types import FrameType
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
    ead,
    items,
    job,
    pack_dict,
    reasons_with,
    rule_value,
    settings_dict,
    values,
    with_block,
    with_changes,
    with_operative_status,
    with_regime_rows,
)

TODAY = date(2026, 9, 28)  # a Monday

LATEST_START = "opt.latest_start_after_days"
WINDOW_CLOSES = "stem.apply_window_closes_rule"
RENAMED = "stem.final_evaluation_due_from_ead_end"
COUNTS = ("unemployment.days_used", "unemployment.days_remaining", "employment.days_under_hours")

ENGINE_DIR = str(Path(f1.__file__).resolve().parent)


def run(
    case: dict[str, Any],
    today: date = TODAY,
    raw: dict[str, Any] | None = None,
    **pack_changes: Any,
) -> dict[str, Any]:
    """Compute a case on a fixed day under the test pack and the test settings.

    raw is a whole pack as a mapping, for a test that changes more than single values.
    """
    assert case_problems(case) == [], "the test case itself must match the case contract"
    pack = build_pack(today, **pack_changes) if raw is None else validate_pack(raw)
    return f1.compute_f1(f1.parse_case(case), pack, clock_on(today), settings=settings_dict())


# Case A: post-completion OPT, no STEM, no cap-gap. Nothing is open on 2026-09-28.
CASE_A: dict[str, Any] = {
    "program_end_date": "2026-05-15",
    "time_zone": TIME_ZONE,
    "confirmations": answered_yes(),
    "degree_level": "master",
    "documents_count": 3,
    "cpt_full_time_days": 0,
    "opt": ead("2026-03-02", "2026-03-10", "2026-06-01", "2027-05-31"),
    "stem": None,
    "employment": [job("2026-06-01", None)],
    "cap_gap": None,
}

# Case B: OPT followed by the STEM extension, with a cap-gap petition.
CASE_B: dict[str, Any] = {
    "program_end_date": "2024-05-10",
    "time_zone": TIME_ZONE,
    "confirmations": answered_yes(),
    "degree_level": "master",
    "documents_count": 5,
    "cpt_full_time_days": 100,
    "opt": ead("2024-03-01", "2024-03-15", "2024-07-01", "2025-06-30"),
    "stem": ead("2025-04-15", "2025-05-01", "2025-07-01", "2027-06-30"),
    "employment": [job("2024-07-01", None)],
    "cap_gap": cap_gap("2026-10-01", petition_filed_on="2026-04-02"),
}

# reviews/phase-2.md, finding 1, the input as the reviewer sent it, with the time zone
# and with the answer yes to the question it raises (specs/phase-2/SPEC-context.md,
# section 4). The same input without an answer is in test_f1_context.py.
STEM_WITHOUT_OPT: dict[str, Any] = {
    "program_end_date": "2026-05-15",
    "time_zone": TIME_ZONE,
    "confirmations": answered_yes(),
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "employment": [],
    "stem": {
        "dso_recommendation_date": "2026-04-01",
        "i765_filed_date": None,
        "ead_start": "2026-06-01",
        "ead_end": "2028-05-31",
    },
}


def names_opt(output: dict[str, Any]) -> list[str]:
    """The reasons that name the OPT block, or a date in it, as missing."""
    return [
        r for r in reasons_with(output, "missing:") if r.removeprefix("missing:").startswith("opt")
    ]


def no_count_is_a_number(output: dict[str, Any]) -> bool:
    """The counting window starts at opt.ead_start. Without it no count is a number."""
    got = items(output)
    return all(got[item_id]["value"] is None for item_id in COUNTS if item_id in got)


# Finding 1: STEM without OPT


def test_the_reviewers_stem_without_opt_cannot_tell_and_names_opt():
    out = run(STEM_WITHOUT_OPT)
    assert out["verdict"]["state"] == "cannot_tell"
    assert names_opt(out)
    assert no_count_is_a_number(out)
    assert contract_problems(out) == []


def test_stem_with_a_null_opt_is_the_same_as_stem_with_no_opt():
    out = run(with_changes(STEM_WITHOUT_OPT, opt=None))
    assert out["verdict"]["state"] == "cannot_tell"
    assert names_opt(out)
    assert out["verdict"] == run(STEM_WITHOUT_OPT)["verdict"]


def test_stem_without_opt_with_employment_entered_still_cannot_tell():
    # A period that covers every day since the STEM start changes nothing: the window
    # cannot be known, so nothing can be said about the days in it.
    out = run(with_changes(STEM_WITHOUT_OPT, employment=[job("2026-06-01", None)]))
    assert out["verdict"]["state"] == "cannot_tell"
    assert names_opt(out)
    assert no_count_is_a_number(out)


def test_stem_without_opt_still_gives_the_items_it_can():
    got = values(run(STEM_WITHOUT_OPT))
    # program_end_date 2026-05-15 minus 90 days: back 15 to Apr 30, back 30 to Mar 31
    # (45), back 31 to Feb 28 (76), back 14 to Feb 14 (90).
    assert got["opt.apply_window_opens"] == "2026-02-14"
    # stem.dso_recommendation_date 2026-04-01 plus 60 days: 29 to Apr 30, 31 to May 31.
    assert got["stem.file_by"] == "2026-05-31"
    # final_end is stem.ead_end 2028-05-31. Plus 60 days: 30 to Jun 30, 30 to Jul 30.
    assert got["grace.ends"] == "2028-07-30"


@pytest.mark.parametrize("opt", ["absent", "null"])
@pytest.mark.parametrize("stem", ["absent", "null"])
def test_cap_gap_with_neither_opt_nor_stem_cannot_tell_and_names_opt(opt, stem):
    case: dict[str, Any] = {
        "program_end_date": "2026-05-15",
        "time_zone": TIME_ZONE,
        "confirmations": answered_yes(),
        "degree_level": "master",
        "documents_count": 2,
        "cpt_full_time_days": 0,
        "employment": [],
        "cap_gap": cap_gap("2026-10-01"),
    }
    if opt == "null":
        case["opt"] = None
    if stem == "null":
        case["stem"] = None
    out = run(case)
    assert out["verdict"]["state"] == "cannot_tell"
    assert names_opt(out)
    assert contract_problems(out) == []


def test_cap_gap_with_opt_and_no_stem_is_not_a_missing_input():
    out = run(with_changes(CASE_A, cap_gap=cap_gap("2026-10-01")))
    assert reasons_with(out, "missing:") == []


def test_a_case_with_no_opt_no_stem_and_no_cap_gap_has_nothing_missing():
    # No computed item needs a part of this case that is absent.
    out = run(with_changes(CASE_A, opt=None, employment=[]))
    assert reasons_with(out, "missing:") == []


@st.composite
def whole_cases(draw: st.DrawFn) -> tuple[dict[str, Any], date]:
    """A case with OPT, STEM and cap-gap, no conflict and no missing date, and a day."""
    program_end = draw(st.dates(min_value=date(2024, 1, 1), max_value=date(2026, 12, 31)))
    opt_start = program_end + timedelta(days=draw(st.integers(min_value=1, max_value=60)))
    opt_end = opt_start + timedelta(days=364)
    stem_start = opt_end + timedelta(days=1)
    today = opt_start + timedelta(days=draw(st.integers(min_value=0, max_value=1000)))
    case = {
        "program_end_date": program_end.isoformat(),
        "time_zone": TIME_ZONE,
        "confirmations": answered_yes(),
        "degree_level": draw(st.sampled_from(["bachelor", "master", "doctorate"])),
        "documents_count": draw(st.integers(min_value=1, max_value=20)),
        "cpt_full_time_days": draw(st.integers(min_value=0, max_value=300)),
        "opt": ead(
            (program_end - timedelta(days=45)).isoformat(),
            (program_end - timedelta(days=30)).isoformat(),
            opt_start.isoformat(),
            opt_end.isoformat(),
        ),
        "stem": ead(
            (opt_end - timedelta(days=60)).isoformat(),
            (opt_end - timedelta(days=30)).isoformat(),
            stem_start.isoformat(),
            (stem_start + timedelta(days=729)).isoformat(),
        ),
        "employment": [job(opt_start.isoformat(), None, hours=draw(st.sampled_from([10, 40])))],
        "cap_gap": cap_gap(
            (today + timedelta(days=draw(st.integers(min_value=0, max_value=400)))).isoformat(),
            status=draw(st.sampled_from(["pending", "approved", "denied"])),
        ),
    }
    return case, today


# Each way a part that a computed item needs can be absent or null.
# SPEC-fixes, "Finding 1", and SPEC, "Computed items": the inputs of each item.
def without(*blocks: str) -> Callable[[dict[str, Any]], dict[str, Any]]:
    return lambda case: {name: entered for name, entered in case.items() if name not in blocks}


def emptied(*blocks: str) -> Callable[[dict[str, Any]], dict[str, Any]]:
    return lambda case: with_changes(case, **dict.fromkeys(blocks))


def unfilled(block: str, field: str) -> Callable[[dict[str, Any]], dict[str, Any]]:
    """The field set to null. A case that does not hold the block stays as it is."""
    return lambda case: with_block(case, block, **{field: None}) if case.get(block) else case


# specs/phase-2/SPEC-context.md, section 3 (D32): a recommendation date is not among
# the gaps. It is needed only while neither a filing date nor an EAD start is recorded,
# and a block without an EAD start is a gap of its own. See test_f1_context.py.
GAPS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "opt_absent": without("opt"),
    "opt_null": emptied("opt"),
    "opt_and_stem_absent": without("opt", "stem"),
    "opt_and_stem_null": emptied("opt", "stem"),
    "opt_ead_start_null": unfilled("opt", "ead_start"),
    "opt_ead_end_null": unfilled("opt", "ead_end"),
    "stem_ead_start_null": unfilled("stem", "ead_start"),
    "stem_ead_end_null": unfilled("stem", "ead_end"),
}


@pytest.mark.parametrize("gap", GAPS)
def test_each_gap_in_case_b_cannot_tell(gap):
    out = run(GAPS[gap](CASE_B))
    assert out["verdict"]["state"] == "cannot_tell"
    assert reasons_with(out, "missing:")
    assert contract_problems(out) == []


@settings(max_examples=200, deadline=None)
@given(whole_cases(), st.lists(st.sampled_from(sorted(GAPS)), min_size=1, max_size=3))
def test_a_case_with_a_needed_part_absent_or_null_never_gets_the_quiet_verdict(drawn, gaps):
    # SPEC-fixes, "Finding 1", the general rule. CLAUDE.md: missing means cannot_tell.
    # Every case drawn holds OPT, STEM and cap-gap, so the first gap always applies.
    case, today = drawn
    for gap in gaps:
        case = GAPS[gap](case)
    out = run(case, today=today)
    assert out["verdict"]["state"] != "no_open_items"
    assert out["verdict"]["state"] == "cannot_tell"
    assert reasons_with(out, "missing:")
    assert contract_problems(out) == []


# Finding 2: numbers that are not numbers

NOT_NUMBERS = {"nan": float("nan"), "infinity": float("inf"), "minus_infinity": float("-inf")}

# reviews/phase-2.md, finding 2: OPT from 2026-06-01, one open period from 2026-06-01.
CASE_NAN: dict[str, Any] = with_changes(
    CASE_A,
    opt=ead("2026-03-02", "2026-03-10", "2026-06-01", "2027-05-31"),
    employment=[job("2026-06-01", None)],
)


@pytest.mark.parametrize("sent", NOT_NUMBERS.values(), ids=NOT_NUMBERS.keys())
def test_parse_case_refuses_hours_that_are_not_a_number(sent):
    case = with_changes(CASE_NAN, employment=[job("2026-06-01", None, hours=sent)])
    with pytest.raises(ValueError):  # noqa: PT011
        f1.parse_case(case)


@pytest.mark.parametrize("sent", NOT_NUMBERS.values(), ids=NOT_NUMBERS.keys())
@pytest.mark.parametrize("field", ["documents_count", "cpt_full_time_days"])
def test_parse_case_refuses_a_count_that_is_not_a_number(field, sent):
    with pytest.raises(ValueError):  # noqa: PT011
        f1.parse_case(with_changes(CASE_NAN, **{field: sent}))


@pytest.mark.parametrize("sent", NOT_NUMBERS.values(), ids=NOT_NUMBERS.keys())
def test_parse_case_refuses_it_in_any_period_not_only_the_first(sent):
    periods = [
        job("2026-06-01", "2026-06-30"),
        job("2026-07-01", "2026-07-31", hours=20),
        job("2026-08-01", None, hours=sent),
    ]
    with pytest.raises(ValueError):  # noqa: PT011
        f1.parse_case(with_changes(CASE_NAN, employment=periods))


@pytest.mark.parametrize("hours", [0, 0.5, 19.5, 20, 40, 168])
def test_parse_case_still_takes_every_finite_number_the_contract_allows(hours):
    case = with_changes(CASE_NAN, employment=[job("2026-06-01", None, hours=hours)])
    assert f1.parse_case(case).employment[0].hours_per_week == hours


# Finding 4: bounded work

LAST_DAY = date(2099, 12, 31)


def covered_case(
    first: str, opt_end: str, stem_start: str, last: str, program_end: str
) -> dict[str, Any]:
    """OPT from the first day, STEM through the last, and the most periods the contract
    allows: 50, each from the first day on, each with its own hours."""
    return {
        "program_end_date": program_end,
        "time_zone": TIME_ZONE,
        "confirmations": answered_yes(),
        "degree_level": "doctorate",
        "documents_count": 10000,
        "cpt_full_time_days": 0,
        "opt": ead(first, first, first, opt_end),
        "stem": ead(opt_end, opt_end, stem_start, last),
        "employment": [job(first, None, hours=number) for number in range(1, 51)],
        "cap_gap": cap_gap("2099-10-01", petition_filed_on="2099-04-01"),
    }


def largest_case() -> dict[str, Any]:
    """The widest window contracts/case_f1.schema.json allows: 1950-01-01 through
    2099-12-31."""
    return covered_case("1950-01-01", "2024-12-31", "2025-01-01", "2099-12-31", "1950-06-01")


def engine_steps(action: Callable[[], Any]) -> int:
    """How many lines of engine code run during the action."""
    steps = 0

    def watch(frame: FrameType, event: str, arg: Any) -> Any:
        nonlocal steps
        if not frame.f_code.co_filename.startswith(ENGINE_DIR):
            return None
        if event == "line":
            steps += 1
        return watch

    before = sys.gettrace()
    sys.settrace(watch)
    try:
        action()
    finally:
        sys.settrace(before)
    return steps


def test_the_largest_case_matches_the_contract():
    assert case_problems(largest_case()) == []
    assert len(largest_case()["employment"]) == 50


def test_the_largest_case_the_contract_allows_answers_in_under_one_second():
    pack = build_pack(LAST_DAY)
    clock = clock_on(LAST_DAY)
    chosen = settings_dict()
    started = time.perf_counter()
    out = f1.compute_f1(f1.parse_case(largest_case()), pack, clock, settings=chosen)
    taken = time.perf_counter() - started
    assert taken < 1.0
    assert contract_problems(out) == []


def test_the_largest_case_is_counted_right():
    got = values(run(largest_case(), today=LAST_DAY))
    # Every day from 1950-01-01 through 2099-12-31 is covered by a period of 40 hours
    # or more, so no day is used and no day is under hours.
    assert got["unemployment.days_used"] == 0
    assert got["employment.days_under_hours"] == 0


def test_the_largest_window_with_no_employment_is_counted_right():
    got = values(run(with_changes(largest_case(), employment=[]), today=LAST_DAY))
    # 1950-01-01 through 2099-12-31, both included: 150 years of 365 days is 54,750,
    # plus one leap day in each year that divides by 4 from 1952 through 2096
    # ((2096 - 1952) / 4 + 1 = 37; 2000 divides by 400, so it is a leap year): 54,787.
    assert got["unemployment.days_used"] == 54787
    assert got["unemployment.days_remaining"] == 150 - 54787


def test_counting_does_not_walk_the_window_one_day_at_a_time():
    # Two cases of the same shape on the same day. The window of the first is the 31
    # days of December 2099. The window of the second is 54,787 days long. Counting by
    # intervals does the same work on both.
    month = covered_case("2099-12-01", "2099-12-15", "2099-12-16", "2099-12-31", "2099-11-30")
    assert case_problems(month) == []
    pack = build_pack(LAST_DAY)
    clock = clock_on(LAST_DAY)
    chosen = settings_dict()

    def compute(case: dict[str, Any]) -> Callable[[], Any]:
        parsed = f1.parse_case(case)
        return lambda: f1.compute_f1(parsed, pack, clock, settings=chosen)

    short = engine_steps(compute(month))
    long = engine_steps(compute(largest_case()))
    assert short > 0
    # Fewer than one line of engine code for each day added to the window.
    assert long - short < 54787 - 31


def test_the_reviewers_far_dates_conflict_and_the_engine_does_not_walk_them():
    # reviews/phase-2.md, finding 4, input A, brought inside the bounds of the contract:
    # OPT from the first day to the last, with a program end that is more than a year
    # after the OPT start. That is the conflict named opt_start.
    case = with_changes(
        largest_case(),
        program_end_date="2026-05-15",
        opt=ead("2026-03-02", "2026-03-10", "1950-01-01", "2099-12-31"),
        stem=None,
        cap_gap=None,
    )
    assert case_problems(case) == []
    parsed = f1.parse_case(case)
    pack = build_pack(TODAY)
    clock = clock_on(TODAY)
    chosen = settings_dict()
    found: list[dict[str, Any]] = []
    steps = engine_steps(lambda: found.append(f1.compute_f1(parsed, pack, clock, settings=chosen)))
    out = found[0]
    assert out["verdict"]["state"] == "cannot_tell"
    assert "conflict:opt_start" in out["verdict"]["reasons"]
    # The items it can: those that turn on program_end_date alone.
    got = values(out)
    assert got["opt.apply_window_opens"] == "2026-02-14"
    assert got["opt.complete_by"] == "2027-07-15"
    assert contract_problems(out) == []
    # 1950-01-01 through 2026-09-28 is more than 28,000 days.
    assert steps < 28000


@pytest.mark.parametrize(
    "case",
    [
        with_block(CASE_A, "opt", ead_end="2026-05-31"),
        with_changes(CASE_A, employment=[job("2026-07-01", "2026-06-30")]),
        with_changes(
            with_block(CASE_B, "stem", ead_start="2025-06-30"),
            cap_gap=None,
        ),
    ],
    ids=["opt_end_before_start", "job_end_before_start", "stem_start_on_opt_end"],
)
def test_a_conflict_still_returns_the_items_that_do_not_turn_on_it(case):
    out = run(case)
    assert out["verdict"]["state"] == "cannot_tell"
    assert reasons_with(out, "conflict:")
    got = items(out)
    for item_id in ("opt.apply_window_opens", "opt.apply_window_closes", "opt.file_by"):
        assert got[item_id]["value"] is not None, item_id
    assert contract_problems(out) == []


SMALL_HOURS = st.sampled_from([0, 5, 19.5, 20, 21, 24.5, 25, 40, 168])


@st.composite
def small_windows(draw: st.DrawFn) -> tuple[dict[str, Any], date]:
    """A case whose window is a few weeks long, with periods that overlap, touch, nest,
    repeat, and fall outside the window."""
    program_end = draw(st.dates(min_value=date(2024, 1, 1), max_value=date(2028, 12, 31)))
    opt_start = program_end + timedelta(days=draw(st.integers(min_value=0, max_value=30)))
    opt_end = opt_start + timedelta(days=draw(st.integers(min_value=0, max_value=30)))
    stem = None
    last = opt_end
    if draw(st.booleans()):
        stem_start = opt_end + timedelta(days=draw(st.integers(min_value=1, max_value=5)))
        last = stem_start + timedelta(days=draw(st.integers(min_value=0, max_value=30)))
        stem = ead(
            opt_end.isoformat(), opt_end.isoformat(), stem_start.isoformat(), last.isoformat()
        )
    today = opt_start + timedelta(days=draw(st.integers(min_value=-5, max_value=80)))
    employment = []
    for _ in range(draw(st.integers(min_value=0, max_value=8))):
        start = opt_start + timedelta(days=draw(st.integers(min_value=-10, max_value=70)))
        if draw(st.booleans()):
            start = min(start, today)
            end = None
        else:
            end = (start + timedelta(days=draw(st.integers(min_value=0, max_value=30)))).isoformat()
        employment.append(job(start.isoformat(), end, hours=draw(SMALL_HOURS)))
    if employment and draw(st.booleans()):
        employment.append(dict(employment[0]))
    case = {
        "program_end_date": program_end.isoformat(),
        "time_zone": TIME_ZONE,
        "confirmations": answered_yes(),
        "degree_level": "master",
        "documents_count": 1,
        "cpt_full_time_days": 0,
        "opt": ead(
            program_end.isoformat(),
            program_end.isoformat(),
            opt_start.isoformat(),
            opt_end.isoformat(),
        ),
        "stem": stem,
        "employment": employment,
        "cap_gap": None,
    }
    return case, today


@settings(max_examples=400, deadline=None)
@given(small_windows(), st.sampled_from([None, SHIFTED]))
def test_the_count_agrees_with_a_plain_day_by_day_count_on_small_windows(drawn, shifted):
    # SPEC-fixes, "Finding 4": count by intervals, and compare with a day-by-day count.
    case, today = drawn
    raw = pack_dict(today, values=shifted)
    expected = count_days(
        case,
        today,
        rule_value(raw, "opt.min_hours_per_week"),
        rule_value(raw, "stem.min_hours_per_week"),
    )
    got = values(run(case, today=today, values=shifted))
    assert got["unemployment.days_used"] == expected["used"]
    assert got["employment.days_under_hours"] == expected["under"]


# Finding 5: each item shows the paragraph that states it


@pytest.mark.parametrize(
    ("rule_id", "assumed", "unit"),
    [(LATEST_START, 60, "days"), (WINDOW_CLOSES, True, "flag")],
)
def test_the_test_pack_holds_the_two_new_rules_with_the_assumed_values(rule_id, assumed, unit):
    raw = pack_dict(TODAY)
    assert rule_value(raw, rule_id) is assumed or rule_value(raw, rule_id) == assumed
    assert type(rule_value(raw, rule_id)) is type(assumed)
    assert next(p for p in raw["parameters"] if p["id"] == rule_id)["unit"] == unit


@pytest.mark.parametrize("case", [CASE_A, CASE_B], ids=["case_a", "case_b"])
def test_latest_start_names_its_own_rule_and_not_the_filing_rule(case):
    got = items(run(case))
    assert LATEST_START in got["opt.latest_start"]["rule_ids"]
    assert "opt.apply_after_days" not in got["opt.latest_start"]["rule_ids"]
    # The filing window still names the filing rule.
    assert "opt.apply_after_days" in got["opt.apply_window_closes"]["rule_ids"]
    assert LATEST_START not in got["opt.apply_window_closes"]["rule_ids"]


@pytest.mark.parametrize(
    ("days", "expected"),
    [
        # program_end_date 2026-05-15 plus 60 days: 16 to May 31, 30 to Jun 30 (46),
        # 14 to Jul 14.
        (60, "2026-07-14"),
        # Plus 45 days: 16 to May 31, 29 to Jun 29.
        (45, "2026-06-29"),
        # Plus 61 days.
        (61, "2026-07-15"),
    ],
)
def test_latest_start_moves_with_its_own_rule_and_the_window_does_not(days, expected):
    got = values(run(CASE_A, values={(LATEST_START, ""): days}))
    assert got["opt.latest_start"] == expected
    assert got["opt.apply_window_closes"] == "2026-07-14"


def test_the_filing_rule_moves_the_window_and_not_the_latest_start():
    got = values(run(CASE_A, values={("opt.apply_after_days", ""): 30}))
    # program_end_date 2026-05-15 plus 30 days: 16 to May 31, 14 to Jun 14.
    assert got["opt.apply_window_closes"] == "2026-06-14"
    assert got["opt.latest_start"] == "2026-07-14"


def test_the_stem_window_closing_names_its_own_rule_and_not_the_opening_rule():
    got = items(run(CASE_B))
    closes = got["stem.apply_window_closes"]
    assert WINDOW_CLOSES in closes["rule_ids"]
    assert "stem.apply_before_expiry_days" not in closes["rule_ids"]
    # The closing of the window is opt.ead_end, as before.
    assert closes["value"] == "2025-06-30"
    assert "stem.apply_before_expiry_days" in got["stem.apply_window_opens"]["rule_ids"]


def test_the_stem_window_closing_does_not_move_with_the_opening_rule():
    got = values(run(CASE_B, values={("stem.apply_before_expiry_days", ""): 92}))
    # opt.ead_end 2025-06-30 minus 92 days: back 30 to May 31, back 31 to Apr 30 (61),
    # back 30 to Mar 31 (91), back 1 to Mar 30.
    assert got["stem.apply_window_opens"] == "2025-03-30"
    assert got["stem.apply_window_closes"] == "2025-06-30"


@pytest.mark.parametrize("rule_id", [LATEST_START, WINDOW_CLOSES])
def test_each_new_rule_is_shown_as_the_pack_has_it(rule_id):
    raw = pack_dict(TODAY)
    out = run(CASE_B)
    source = next(p for p in raw["parameters"] if p["id"] == rule_id)
    shown = out["rules"][rule_id]
    assert shown["value"] == source["value"]
    assert type(shown["value"]) is type(source["value"])
    assert shown["unit"] == source["unit"]
    assert shown["status"] == source["status"]
    assert shown["citation"] == source["source"]["citation"]
    assert shown.get("quote") == source["source"]["quote"]
    assert contract_problems(out) == []


def test_a_pack_without_the_closing_rule_leaves_the_closing_out():
    # SPEC-fixes, "Finding 5": if the source does not state the closing of the window,
    # the rule is left out of the pack and the engine leaves the item out of its output.
    out = run(CASE_B, leave_out=(WINDOW_CLOSES,))
    got = items(out)
    assert "stem.apply_window_closes" not in got
    assert WINDOW_CLOSES not in out["rules"]
    # Everything else about the extension is still there.
    assert got["stem.apply_window_opens"]["value"] == "2025-04-01"
    assert got["stem.file_by"]["value"] == "2025-06-14"
    assert got[RENAMED]["value"] == "2027-07-10"
    assert contract_problems(out) == []


def test_a_pack_without_the_closing_rule_does_not_change_the_verdict():
    with_rule = run(with_changes(CASE_B, cap_gap=None))
    without_rule = run(with_changes(CASE_B, cap_gap=None), leave_out=(WINDOW_CLOSES,))
    assert without_rule["verdict"] == with_rule["verdict"]


def test_the_final_evaluation_is_named_for_its_arithmetic():
    got = items(run(CASE_B))
    assert "stem.final_evaluation_due" not in got
    # stem.ead_end 2027-06-30 plus 10 days.
    assert got[RENAMED]["value"] == "2027-07-10"
    assert got[RENAMED]["inputs"]["stem.ead_end"] == "2027-06-30"
    assert "stem.evaluation_due_days" in got[RENAMED]["rule_ids"]


def test_the_final_evaluation_is_left_out_with_the_rest_when_there_is_no_stem():
    got = items(run(CASE_A))
    assert RENAMED not in got
    assert "stem.final_evaluation_due" not in got


# Finding 7: the operative regime and its legal status


def with_alternates(output: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {i: item for i, item in items(output).items() if "alternates" in item}


@pytest.mark.parametrize("case", [CASE_A, CASE_B], ids=["case_a", "case_b"])
def test_every_item_with_alternates_carries_the_operative_regime(case):
    out = run(case)
    found = with_alternates(out)
    assert "grace.ends" in found
    for item_id, item in found.items():
        assert item["operative"] == {"regime": OPERATIVE, "legal_status": "effective"}, item_id
    assert contract_problems(out) == []


@pytest.mark.parametrize(
    "legal_status", ["appealed", "stayed", "final", "vacated", "effective", "enjoined"]
)
def test_the_operative_status_is_the_one_in_the_pack(legal_status):
    # SPEC-fixes, "Finding 7": test with a pack whose operative regime is appealed.
    raw = with_operative_status(pack_dict(TODAY), legal_status)
    out = run(CASE_A, raw=raw)
    grace = items(out)["grace.ends"]
    assert grace["operative"] == {"regime": OPERATIVE, "legal_status": legal_status}
    # The legal status changes what is said about the value, never the value.
    # final_end 2027-05-31 plus 60 days: 30 to Jun 30, 30 to Jul 30.
    assert grace["value"] == "2027-07-30"
    assert grace["alternates"] == [
        {"regime": BLOCKED, "legal_status": "enjoined", "value": "2027-06-30"}
    ]
    assert contract_problems(out) == []


def test_the_operative_regime_is_the_one_whose_value_is_shown():
    # The pack with the two regimes changing places.
    raw = pack_dict(TODAY)
    for regime in raw["regimes"]:
        regime["operative"] = regime["id"] == BLOCKED
        regime["legal_status"] = "effective" if regime["id"] == BLOCKED else "rescinded"
    grace = items(run(CASE_A, raw=raw))["grace.ends"]
    # final_end 2027-05-31 plus 30 days.
    assert grace["value"] == "2027-06-30"
    assert grace["operative"] == {"regime": BLOCKED, "legal_status": "effective"}
    assert grace["alternates"] == [
        {"regime": OPERATIVE, "legal_status": "rescinded", "value": "2027-07-30"}
    ]


def test_a_rule_with_a_row_under_each_regime_gives_the_item_both():
    # reviews/phase-2.md, finding 5: the final rule changes (f)(11)(i)(D) as well, so
    # the shipped pack holds the start date rule under each regime.
    raw = with_regime_rows(pack_dict(TODAY), LATEST_START, operative=60, blocked=30)
    out = run(CASE_A, raw=raw)
    got = items(out)
    latest = got["opt.latest_start"]
    assert latest["value"] == "2026-07-14"
    # program_end_date 2026-05-15 plus 30 days: 16 to May 31, 14 to Jun 14.
    assert latest["alternates"] == [
        {"regime": BLOCKED, "legal_status": "enjoined", "value": "2026-06-14"}
    ]
    assert latest["operative"] == {"regime": OPERATIVE, "legal_status": "effective"}
    assert out["rules"][LATEST_START]["value"] == 60
    assert out["rules"][LATEST_START]["regime"] == OPERATIVE
    # The filing rule has one row in this pack, so the window has one value.
    assert "alternates" not in got["opt.apply_window_closes"]
    assert contract_problems(out) == []


@settings(max_examples=100, deadline=None)
@given(
    whole_cases(),
    st.sampled_from(["effective", "appealed", "stayed", "final"]),
    st.booleans(),
)
def test_operative_always_comes_from_the_pack(drawn, legal_status, two_rows):
    case, today = drawn
    raw = with_operative_status(pack_dict(today), legal_status)
    if two_rows:
        raw = with_regime_rows(raw, LATEST_START, operative=60, blocked=30)
    out = run(case, today=today, raw=raw)
    found = with_alternates(out)
    assert "grace.ends" in found
    assert ("opt.latest_start" in found) == two_rows
    for item_id, item in found.items():
        assert item["operative"] == {"regime": OPERATIVE, "legal_status": legal_status}, item_id
        assert OPERATIVE not in [a["regime"] for a in item["alternates"]], item_id
    assert contract_problems(out) == []
