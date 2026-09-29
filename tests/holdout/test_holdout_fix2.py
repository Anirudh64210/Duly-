"""Hidden tests for the second fix: specs/product-1/SPEC-resolutions.md, points 27 and 28.

Not shown to the lanes that build. Written from the SPEC, never from the engine. The
clock is injected; every expected date is worked beside it or read from the pack.
"""

from datetime import date, timedelta
from typing import Any

import yaml
from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from engine.rulepack import Rulepack, load_all, validate_pack
from tests.support.f1_pack import (
    BLOCKED,
    NOT_AFTER_PROGRAM_END,
    OPERATIVE,
    REPO_ROOT,
    answer_as_the_screen_does,
    case_problems,
    clock_on,
    conflicts,
    conflicts_by_the_table,
    ead,
    items,
    job,
    months_later,
    pack_dict,
    question_ids,
    refuse_placeholders,
    rule_value,
    values,
    with_block,
    with_blocked_regime_operative,
    with_regime_rows,
)

TODAY = date(2026, 9, 29)
ONE_DAY = timedelta(days=1)
PACK = pack_dict(TODAY)
OPT_MONTHS = rule_value(PACK, "opt.max_months")
STEM_MONTHS = rule_value(PACK, "stem.extension_months")


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


def iso(day: date) -> str:
    return day.isoformat()


# Point 27.


def opt_case(program_end: date, start: date, end: date) -> dict[str, Any]:
    """An OPT card from start to end, recommended 20 days and filed 15 days before it
    begins, with one period that covers the card and stays open."""
    return {
        "program_end_date": iso(program_end),
        "degree_level": "bachelor",
        "documents_count": 1,
        "cpt_full_time_days": 0,
        "opt": ead(
            iso(start - timedelta(days=20)), iso(start - timedelta(days=15)), iso(start), iso(end)
        ),
        "stem": None,
        "employment": [job(iso(start), None)],
        "cap_gap": None,
        "time_zone": "UTC",
    }


@settings(deadline=None, max_examples=60)
@given(
    st.dates(min_value=date(2025, 1, 1), max_value=date(2026, 12, 31)),
    st.integers(min_value=-120, max_value=120),
    st.integers(min_value=1, max_value=6),
)
def test_point_27_the_engine_raises_the_table_with_the_new_row(program_end, offset, months):
    # The card starts `months` months less a day before its end, which lies `offset` days
    # from the program end. The card begins at most 120 days and 6 months before the
    # program end, inside the year before it that Duly takes as entered right
    # (product.opt_start_earliest_years_before_program_end). The table, worked apart from the engine
    # (tests/support/f1_pack.py, conflicts_by_the_table), raises the new row when and only
    # when the card ends on or before the program end.
    end = program_end + timedelta(days=offset)
    start = months_later(end + ONE_DAY, -months)
    case = opt_case(program_end, start, end)
    sure, _ = conflicts_by_the_table(case, TODAY, OPT_MONTHS, STEM_MONTHS, PACK)
    assert (NOT_AFTER_PROGRAM_END in sure) is (end <= program_end)
    assert set(conflicts(run(case))) == sure


# A card with STEM entered: the OPT card 2025-09-01 to 2026-05-31 (9 months, and
# beginning inside the year before the program end), the program end 2026-06-05.
# The STEM card 2026-06-01 to 2028-05-31 begins the day after. The STEM window opens 90
# days before 2026-05-31: 30 days reach May 1, 30 more Apr 1, 30 more 2026-03-02. The
# STEM filing 2026-04-01 is inside it, 10 days after its recommendation.
WITH_STEM: dict[str, Any] = {
    "program_end_date": "2026-06-05",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "opt": ead("2025-08-10", "2025-08-15", "2025-09-01", "2026-05-31"),
    "stem": ead("2026-03-22", "2026-04-01", "2026-06-01", "2028-05-31"),
    "employment": [job("2025-09-01", None)],
    "cap_gap": None,
    "time_zone": "UTC",
}


def test_point_27_is_raised_with_stem_entered_and_nulls_what_uses_the_card():
    # On 2026-05-20 no report date of the STEM card has passed and the card is ahead.
    out = run(WITH_STEM, date(2026, 5, 20))
    assert NOT_AFTER_PROGRAM_END in conflicts(out)
    assert out["verdict"]["state"] == "cannot_tell"
    for item_id, item in items(out).items():
        if {"program_end_date", "opt.ead_start", "opt.ead_end"} & set(item["inputs"]):
            assert item["value"] is None, item_id


def test_point_27_a_yes_is_for_the_dates_it_was_given_for():
    # SPEC-resolutions.md, point 7: an answer is taken only for the values in its about.
    # Yes to a card ending 2026-05-31; the card is then entered as ending 2026-05-30,
    # still before the program end. The question is open again.
    today = date(2026, 5, 20)
    out = run(WITH_STEM, today)
    case = answer_as_the_screen_does(
        WITH_STEM, out, today.isoformat(), **{NOT_AFTER_PROGRAM_END: True}
    )
    assert NOT_AFTER_PROGRAM_END not in question_ids(run(case, today))
    moved = with_block(case, "opt", ead_end="2026-05-30")
    again = run(moved, today)
    assert NOT_AFTER_PROGRAM_END in question_ids(again)
    assert again["verdict"]["state"] == "cannot_tell"


# Point 28.

TAKES_EFFECT = date(2026, 9, 15)
BLOCKED_WINDOW = 30
OPERATIVE_BLOCKED = with_blocked_regime_operative(
    with_regime_rows(
        with_regime_rows(PACK, "opt.apply_after_days", 60, BLOCKED_WINDOW),
        "opt.latest_start_after_days",
        60,
        BLOCKED_WINDOW,
    ),
    TAKES_EFFECT.isoformat(),
)


def program_only(program_end: date) -> dict[str, Any]:
    """A case with the program end and nothing after it: no card can raise a conflict
    that would null the program's own items."""
    return {
        "program_end_date": iso(program_end),
        "degree_level": "master",
        "documents_count": 1,
        "cpt_full_time_days": 0,
        "opt": None,
        "stem": None,
        "employment": [],
        "cap_gap": None,
        "time_zone": "UTC",
    }


@settings(deadline=None, max_examples=60)
@given(st.dates(min_value=date(2025, 1, 1), max_value=date(2027, 6, 30)))
def test_point_28_the_window_is_measured_under_the_row_in_force_on_the_program_end(
    program_end,
):
    # A program that ended before 2026-09-15 has no operative row on its day: null. From
    # that day on, the blocked row gives the program end plus 30 days.
    got = values(run(program_only(program_end), raw_pack=OPERATIVE_BLOCKED))
    if program_end < TAKES_EFFECT:
        assert got["opt.apply_window_closes"] is None
        assert got["opt.latest_start"] is None
    else:
        expected = iso(program_end + timedelta(days=BLOCKED_WINDOW))
        assert got["opt.apply_window_closes"] == expected
        assert got["opt.latest_start"] == expected


def test_point_28_the_edge_is_the_day_the_rows_take_effect():
    # 2026-09-15 plus 30: 15 days reach Sep 30, 15 more 2026-10-15. The day before gives
    # nothing.
    on_the_day = values(run(program_only(TAKES_EFFECT), raw_pack=OPERATIVE_BLOCKED))
    assert on_the_day["opt.apply_window_closes"] == "2026-10-15"
    day_before = values(run(program_only(TAKES_EFFECT - ONE_DAY), raw_pack=OPERATIVE_BLOCKED))
    assert day_before["opt.apply_window_closes"] is None


def test_point_28_the_judgement_item_on_a_case_otherwise_clean():
    # Program end 2026-03-15, before the rows took effect. The card 2026-04-01 to
    # 2027-03-31 is running today; 14 months from 2026-03-15 is 2027-05-15. Only point 28
    # stands between this case and a quiet verdict.
    case = opt_case(date(2026, 3, 15), date(2026, 4, 1), date(2027, 3, 31))
    out = run(case, raw_pack=OPERATIVE_BLOCKED)
    assert out["verdict"]["state"] == "talk_to_dso"
    assert "rule_not_in_force_on_event_day" in out["verdict"]["reasons"]
    assert values(out)["opt.apply_window_closes"] is None


def shipped() -> Rulepack:
    return next(p for p in load_all() if p.category == "f1")


def shipped_operative_days(rule_id: str) -> int:
    """The operative row of the shipped pack, read from the file apart from the engine."""
    raw = yaml.safe_load(
        (REPO_ROOT / "rulepacks" / "f1-us" / "v2026.09" / "parameters.yaml").read_text()
    )
    operative = {r["id"] for r in raw["regimes"] if r["operative"]}
    assert operative == {OPERATIVE}
    rows = [p for p in raw["parameters"] if p["id"] == rule_id and p.get("regime") in operative]
    assert len(rows) == 1
    assert str(rows[0]["effective_from"]) <= "2020-01-01"
    value: int = rows[0]["value"]
    return value


@settings(deadline=None, max_examples=40)
@given(st.dates(min_value=date(2020, 1, 1), max_value=date(2027, 6, 30)))
def test_point_28_the_shipped_pack_changes_nothing(program_end):
    # The shipped operative rows are in force from before 2020, so every program end
    # drawn here has its dates, as before the point.
    days = shipped_operative_days("opt.apply_after_days")
    out = run(program_only(program_end), pack=shipped())
    assert values(out)["opt.apply_window_closes"] == iso(program_end + timedelta(days=days))
    assert "rule_not_in_force_on_event_day" not in out["verdict"]["reasons"]


def test_point_28_the_blocked_regime_is_not_operative_in_the_shipped_pack():
    operative = [r["id"] for r in shipped().regimes if r["operative"]]
    assert operative == [OPERATIVE]
    assert BLOCKED not in operative
