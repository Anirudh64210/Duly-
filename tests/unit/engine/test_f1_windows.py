"""engine/f1.py: the filing windows, the grace date, the OPT card's own limit, alternates
and business days. specs/product-1/SPEC-resolutions.md, points 11 to 19, 23 and 24.

Written before the engine has them. The four new conflicts (points 11, 14, 15, 16) work as
every conflict of specs/product-1/SPEC.md, section 1 does: cannot_tell with
conflict:<id>, a question with the same id and an about, the rule shown in the output's
rules, the items that use the dates null (point 4), yes gives talk_to_dso with the
judgement item <id>, no keeps cannot_tell. Each edge day is worked from the rule's value
in the test pack (tests/support/f1_pack.py), never from a number written here.

Every expected date and count was worked out by hand. The working is beside it.
"""

import copy
from datetime import date, timedelta
from typing import Any, NamedTuple

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from engine.rulepack import validate_pack
from tests.support.f1_pack import (
    BLOCKED,
    OPERATIVE,
    answer_as_the_screen_does,
    build_pack,
    cap_gap,
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
    reasons_with,
    refuse_placeholders,
    rule_value,
    said,
    upcoming,
    values,
    with_block,
    with_changes,
    with_regime_rows,
)

TODAY = date(2026, 9, 28)  # a Monday
CHECKED_ON = "2026-09-28"
PACK = pack_dict(CHECKED_ON)

# The values of the test pack. Every edge below is worked from these.
OPT_FILE_DAYS = rule_value(PACK, "opt.file_within_days_of_recommendation")
STEM_FILE_DAYS = rule_value(PACK, "stem.file_within_days_of_recommendation")
STEM_BEFORE_DAYS = rule_value(PACK, "stem.apply_before_expiry_days")
OPT_AFTER_DAYS = rule_value(PACK, "opt.apply_after_days")
COMPLETE_MONTHS = rule_value(PACK, "opt.complete_within_months")
OPT_LIMIT_DAYS = rule_value(PACK, "opt.unemployment_limit_days")
GRACE_DAYS = rule_value(PACK, "grace.after_completion_days", OPERATIVE)
ONE_DAY = timedelta(days=1)

COUNTS = (
    "unemployment.days_used",
    "unemployment.days_remaining",
    "employment.days_under_hours",
)


def run(
    case: dict[str, Any],
    today: date = TODAY,
    raw_pack: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compute a case with the clock injected at noon UTC on today. The rules were checked
    on that day, so their age never decides a verdict."""
    assert case_problems(case) == [], "the test case itself must match the case contract"
    clock = clock_on(today)
    pack = build_pack(today) if raw_pack is None else validate_pack(raw_pack)

    def compute(sent: dict[str, Any]) -> dict[str, Any]:
        return f1.compute_f1(f1.parse_case(refuse_placeholders(sent), clock), pack, clock)

    # SPEC-resolutions.md, point 39: a case whose opt.earlier_at_this_level is answered
    # with no_earlier_opt is sent as the screen sends it.
    return compute(placeholders_made_real(case, clock, compute))


def answered(case: dict[str, Any], today: date, **given_answers: bool) -> dict[str, Any]:
    """The case with each answer given on today, with the about the output asked it with
    (SPEC-resolutions.md, points 2 and 7)."""
    out = run(case, today=today)
    return answer_as_the_screen_does(case, out, today.isoformat(), **given_answers)


def iso(day: date) -> str:
    return day.isoformat()


def day(raw: str) -> date:
    return date.fromisoformat(raw)


# The cases. Each has every part entered, and fits every row of the table, so that only
# the date under test can raise a conflict.

# OPT in hand. Program end 2025-09-15; the OPT window closes 60 days on, 2025-11-14; the
# card begins 2025-11-01 and runs 12 months less a day. 14 months from the program end is
# 2026-11-15, after the card's last day.
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
# SPEC-resolutions.md, point 39: the case answers opt.earlier_at_this_level no, so a
# test about something else stays about that.
FITS = no_earlier_opt(FITS)

# The STEM card begins 2026-10-16, after the days these tests run on, so that no report
# date of the card has passed (point 21 asks about a passed one). The OPT card ends
# 2026-10-15; the STEM window opens 90 days before: 15 days back reach Sep 30, 31 more
# Aug 30, 31 more Jul 30, 13 more 2026-07-17.
STEM_AHEAD: dict[str, Any] = with_changes(
    FITS,
    opt=ead("2025-08-01", "2025-08-10", "2025-10-16", "2026-10-15"),
    stem=ead("2026-08-01", "2026-08-10", "2026-10-16", "2028-10-15"),
    employment=[job("2025-10-16", None)],
)
# A STEM filing after the recommendation plus its days must still be on or before today
# and before the STEM card. 2026-08-01 plus 60 days is 2026-09-30 (30 days reach Aug 31,
# 30 more Sep 30), so the day after is 2026-10-01: the row runs on 2026-10-10.
STEM_DAY = date(2026, 10, 10)


def stem_window_case(filed: date) -> dict[str, Any]:
    """STEM_AHEAD with a STEM filing on `filed` and a recommendation 16 days before the
    window opens, so that a filing on the day before the window, or on its first day,
    is within the recommendation's days and not before it."""
    opens = day(STEM_AHEAD["opt"]["ead_end"]) - timedelta(days=STEM_BEFORE_DAYS)
    return with_block(
        STEM_AHEAD,
        "stem",
        dso_recommendation_date=iso(opens - timedelta(days=16)),
        i765_filed_date=iso(filed),
    )


STEM_OPENS = day(STEM_AHEAD["opt"]["ead_end"]) - timedelta(days=STEM_BEFORE_DAYS)

# Point 15: the OPT card begins after the window has closed, so that a filing after the
# window is still before the card. Program end 2026-06-15; 60 days reach 2026-08-14 (15
# days to Jun 30, 31 to Jul 31, 14 more). The card: 2026-09-01 to 2027-08-15. 14 months
# from 2026-06-15 is 2027-08-15, so the card's last day is the last day allowed.
LATE_START: dict[str, Any] = with_changes(
    FITS,
    program_end_date="2026-06-15",
    opt=ead("2026-07-25", "2026-08-01", "2026-09-01", "2027-08-15"),
    employment=[job("2026-09-01", None)],
)
OPT_CLOSES = day(LATE_START["program_end_date"]) + timedelta(days=OPT_AFTER_DAYS)


def opt_window_case(filed: date) -> dict[str, Any]:
    """LATE_START with the OPT filing on `filed` and the recommendation 10 days before."""
    return with_block(
        LATE_START,
        "opt",
        dso_recommendation_date=iso(filed - timedelta(days=10)),
        i765_filed_date=iso(filed),
    )


# Point 16: 14 months from 2025-09-15 is 2026-11-15. The card begins 2025-11-20, so a
# card through 2026-11-16 is still under 12 months (12 months from 2025-11-20 is
# 2026-11-20).
COMPLETE_BY = months_later(day(FITS["program_end_date"]), COMPLETE_MONTHS)


def complete_case(ead_end: date, stem: bool = False) -> dict[str, Any]:
    case = with_changes(
        FITS,
        opt=ead("2025-08-01", "2025-08-10", "2025-11-20", iso(ead_end)),
        employment=[job("2025-11-20", None)],
    )
    if stem:
        # The STEM card begins the day after the OPT card and runs 24 months less a day;
        # its window opens 90 days before the OPT card ends, so a filing 30 days before
        # it ends is within it; the recommendation is 10 days before the filing.
        stem_start = ead_end + ONE_DAY
        filed = ead_end - timedelta(days=30)
        case["stem"] = ead(
            iso(filed - timedelta(days=10)),
            iso(filed),
            iso(stem_start),
            iso(months_later(stem_start, 24) - ONE_DAY),
        )
    return case


class Row(NamedTuple):
    today: date
    raises: dict[str, Any]
    fits: tuple[dict[str, Any], ...]  # the edge days, each of which fits
    about: set[str]  # the inputs the question's about holds
    not_fitting: set[str]  # the values that do not fit, as shown
    rule_id: str


def opt_filed(filed: date) -> dict[str, Any]:
    return with_block(FITS, "opt", i765_filed_date=iso(filed))


def stem_filed(filed: date) -> dict[str, Any]:
    return with_block(STEM_AHEAD, "stem", i765_filed_date=iso(filed))


OPT_REC = day(FITS["opt"]["dso_recommendation_date"])
STEM_REC = day(STEM_AHEAD["stem"]["dso_recommendation_date"])

ROWS: dict[str, Row] = {
    # 2025-08-01 is the recommendation. The day before is 2025-07-31.
    "opt.i765_filed_date.before_recommendation": Row(
        TODAY,
        opt_filed(OPT_REC - ONE_DAY),
        (opt_filed(OPT_REC),),
        {"opt.dso_recommendation_date", "opt.i765_filed_date"},
        {"2025-08-01", "2025-07-31"},
        "opt.file_within_days_of_recommendation",
    ),
    # 2026-08-01 is the recommendation. The day before is 2026-07-31, after the window
    # opens on 2026-07-17.
    "stem.i765_filed_date.before_recommendation": Row(
        STEM_DAY,
        stem_filed(STEM_REC - ONE_DAY),
        (stem_filed(STEM_REC),),
        {"stem.dso_recommendation_date", "stem.i765_filed_date"},
        {"2026-08-01", "2026-07-31"},
        "stem.file_within_days_of_recommendation",
    ),
    # 2025-08-01 plus 30 days is 2025-08-31. The day after is 2025-09-01, before the card
    # begins on 2025-11-01 and before the program window closes on 2025-11-14. The
    # recommendation day and the last day of the window both fit.
    "opt.i765_filed_date.after_file_by": Row(
        TODAY,
        opt_filed(OPT_REC + timedelta(days=OPT_FILE_DAYS + 1)),
        (opt_filed(OPT_REC), opt_filed(OPT_REC + timedelta(days=OPT_FILE_DAYS))),
        {"opt.dso_recommendation_date", "opt.i765_filed_date"},
        {"2025-08-01", "2025-09-01"},
        "opt.file_within_days_of_recommendation",
    ),
    # 2026-08-01 plus 60 days is 2026-09-30. The day after is 2026-10-01, before
    # STEM_DAY and before the STEM card begins on 2026-10-16.
    "stem.i765_filed_date.after_file_by": Row(
        STEM_DAY,
        stem_filed(STEM_REC + timedelta(days=STEM_FILE_DAYS + 1)),
        (stem_filed(STEM_REC), stem_filed(STEM_REC + timedelta(days=STEM_FILE_DAYS))),
        {"stem.dso_recommendation_date", "stem.i765_filed_date"},
        {"2026-08-01", "2026-10-01"},
        "stem.file_within_days_of_recommendation",
    ),
    # The window opens 2026-07-17 (worked above). The day before is 2026-07-16.
    "stem.i765_filed_date.before_window_opens": Row(
        TODAY,
        stem_window_case(STEM_OPENS - ONE_DAY),
        (stem_window_case(STEM_OPENS),),
        {"opt.ead_end", "stem.i765_filed_date"},
        {"2026-10-15", "2026-07-16"},
        "stem.apply_before_expiry_days",
    ),
    # The window closes 2026-08-14 (worked above). The day after is 2026-08-15, before
    # the card begins on 2026-09-01.
    "opt.i765_filed_date.after_window_closes": Row(
        TODAY,
        opt_window_case(OPT_CLOSES + ONE_DAY),
        (opt_window_case(OPT_CLOSES),),
        {"program_end_date", "opt.i765_filed_date"},
        {"2026-06-15", "2026-08-15"},
        "opt.apply_after_days",
    ),
    # opt.complete_by is 2026-11-15. A card through 2026-11-16 runs past it.
    "opt.ead_end.after_complete_by": Row(
        TODAY,
        complete_case(COMPLETE_BY + ONE_DAY),
        (complete_case(COMPLETE_BY),),
        {"program_end_date", "opt.ead_end"},
        {"2025-09-15", "2026-11-16"},
        "opt.complete_within_months",
    ),
}
ROW_IDS = list(ROWS)


def test_the_worked_edges_are_the_edges_of_the_test_pack():
    # The hand working above, held against the pack's values, so that a change to the
    # test pack cannot leave the working behind unseen.
    assert iso(OPT_REC + timedelta(days=OPT_FILE_DAYS)) == "2025-08-31"
    assert iso(STEM_REC + timedelta(days=STEM_FILE_DAYS)) == "2026-09-30"
    assert iso(STEM_OPENS) == "2026-07-17"
    assert iso(OPT_CLOSES) == "2026-08-14"
    assert iso(COMPLETE_BY) == "2026-11-15"


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_the_cases_of_the_new_rows_match_the_case_contract(conflict):
    row = ROWS[conflict]
    for case in (row.raises, *row.fits):
        assert case_problems(case) == []


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_a_new_window_conflict_is_cannot_tell_with_the_reason(conflict):
    row = ROWS[conflict]
    out = run(row.raises, today=row.today)
    assert out["verdict"]["state"] == "cannot_tell"
    assert f"conflict:{conflict}" in out["verdict"]["reasons"]
    # The case is built so that nothing else in it fails to fit.
    assert conflicts(out) == [conflict]
    assert contract_problems(out) == []


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_a_new_window_conflict_asks_whether_these_are_the_dates(conflict):
    row = ROWS[conflict]
    out = run(row.raises, today=row.today)
    assert question_ids(out) == [conflict]
    asked = question(out, conflict)
    assert asked["because"]
    assert row.about <= set(asked["about"])
    assert row.not_fitting <= said(asked["about"])


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_a_new_window_conflict_shows_its_rule(conflict):
    # Point 11: "Each names its rule in rule_ids." A question carries no rule_ids in the
    # contract, so the rule is read where the output shows every rule it names.
    row = ROWS[conflict]
    out = run(row.raises, today=row.today)
    assert conflict_rule_shown(out, row.rule_id)


def conflict_rule_shown(out: dict[str, Any], rule_id: str) -> bool:
    return rule_id in out["rules"] and bool(out["rules"][rule_id].get("quote"))


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_a_new_window_conflict_nulls_the_items_that_use_its_dates(conflict):
    # Point 4: while it is open, the items that use its dates are null.
    row = ROWS[conflict]
    out = run(row.raises, today=row.today)
    for item_id, item in items(out).items():
        if row.about & set(item["inputs"]):
            assert item["value"] is None, item_id
            assert item_id not in upcoming(out), item_id


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_on_the_edge_day_the_facts_fit(conflict):
    row = ROWS[conflict]
    for case in row.fits:
        out = run(case, today=row.today)
        assert conflicts(out) == [], case
        assert conflict not in question_ids(out)
        assert out["verdict"]["state"] != "cannot_tell", out["verdict"]
        assert contract_problems(out) == []


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_yes_to_a_new_window_conflict_sends_the_person_to_the_dso(conflict):
    row = ROWS[conflict]
    out = run(answered(row.raises, row.today, **{conflict: True}), today=row.today)
    assert out["verdict"]["state"] == "talk_to_dso"
    assert conflict in out["verdict"]["reasons"]
    assert reasons_with(out, "conflict:") == []
    assert conflict not in question_ids(out)
    # Duly says nothing about what the dates mean: the reasons are ids, never a sentence,
    # and nothing says a filing was late.
    assert all(" " not in reason for reason in out["verdict"]["reasons"])
    assert not any("late" in reason for reason in out["verdict"]["reasons"])


@pytest.mark.parametrize("conflict", ROW_IDS)
def test_no_to_a_new_window_conflict_keeps_cannot_tell(conflict):
    row = ROWS[conflict]
    out = run(answered(row.raises, row.today, **{conflict: False}), today=row.today)
    assert out["verdict"]["state"] == "cannot_tell"
    assert f"conflict:{conflict}" in out["verdict"]["reasons"]


# Point 11: when either date is missing, none of the four is raised.

MISSING_DATE = [
    ("opt", "i765_filed_date", FITS, TODAY),
    ("opt", "dso_recommendation_date", FITS, TODAY),
    ("stem", "i765_filed_date", STEM_AHEAD, STEM_DAY),
    ("stem", "dso_recommendation_date", STEM_AHEAD, STEM_DAY),
]


@pytest.mark.parametrize(("part", "field", "case", "today"), MISSING_DATE)
def test_a_missing_filing_or_recommendation_raises_none_of_the_four(part, field, case, today):
    out = run(with_block(case, part, **{field: None}), today=today)
    found = {c for c in conflicts(out) if c.startswith(part + ".i765_filed_date.")}
    assert found == set()


def test_point_14_a_missing_opt_card_end_raises_no_window_conflict():
    case = with_block(stem_window_case(STEM_OPENS - ONE_DAY), "opt", ead_end=None)
    assert "stem.i765_filed_date.before_window_opens" not in conflicts(run(case))


def test_point_14_the_case_of_the_sweep():
    # OPT card to 2026-07-31, STEM filed 2026-01-10. The window opens 90 days before
    # 2026-07-31: 31 days back reach Jun 30, 30 more May 31, 29 more 2026-05-02. From
    # 2026-01-10 to 2026-05-02: 21 + 28 + 31 + 30 + 2 = 112 days before it. The STEM card
    # begins 2026-08-01; no report date of it has passed on 2026-09-29.
    case = with_changes(
        FITS,
        program_end_date="2025-06-01",
        opt=ead("2025-03-03", "2025-03-12", "2025-08-01", "2026-07-31"),
        stem=ead("2026-01-05", "2026-01-10", "2026-08-01", "2028-07-31"),
        employment=[job("2025-08-01", None)],
    )
    out = run(case, today=date(2026, 9, 29))
    assert out["verdict"]["state"] == "cannot_tell"
    assert conflicts(out) == ["stem.i765_filed_date.before_window_opens"]
    about = question(out, "stem.i765_filed_date.before_window_opens")["about"]
    assert {"2026-07-31", "2026-01-10"} <= said(about)


def test_point_15_the_conflict_uses_the_operative_value_only():
    # A pack whose blocked text gives 30 days and whose operative text gives the test
    # pack's value: a filing on the last day of the operative window fits, though it is
    # after the blocked one.
    raw = with_regime_rows(PACK, "opt.apply_after_days", OPT_AFTER_DAYS, 30)
    out = run(opt_window_case(OPT_CLOSES), raw_pack=raw)
    assert "opt.i765_filed_date.after_window_closes" not in conflicts(out)
    # The blocked value stays on the window item as its alternate (section 7).
    closes = items(out)["opt.apply_window_closes"]
    blocked = [a for a in closes.get("alternates", []) if a["regime"] == BLOCKED]
    # 2026-06-15 plus 30 days is 2026-07-15.
    assert [a["value"] for a in blocked] == ["2026-07-15"]


def test_point_15_a_filing_before_the_window_is_not_a_conflict():
    # The case cannot tell pre-completion from post-completion OPT. A filing a year before
    # the program end (2025-06-15) raises nothing of point 15.
    case = with_block(
        LATE_START, "opt", dso_recommendation_date="2025-06-10", i765_filed_date="2025-06-15"
    )
    assert "opt.i765_filed_date.after_window_closes" not in conflicts(run(case))


def test_point_16_is_raised_whether_or_not_stem_is_entered():
    # The OPT card 2025-11-20 to 2026-11-16 with a STEM card from 2026-11-17. Its window
    # opens 90 days before 2026-11-16; the filing 30 days before, 2026-10-17, is inside
    # it, and after today. So the case runs on 2026-10-20.
    case = complete_case(COMPLETE_BY + ONE_DAY, stem=True)
    out = run(case, today=date(2026, 10, 20))
    assert conflicts(out) == ["opt.ead_end.after_complete_by"]
    fitting = run(complete_case(COMPLETE_BY, stem=True), today=date(2026, 10, 20))
    assert conflicts(fitting) == []


def test_point_16_the_items_that_use_the_card_end_are_null():
    row = ROWS["opt.ead_end.after_complete_by"]
    got = items(run(row.raises))
    before = items(run(row.fits[0]))
    for item_id in ("grace.ends", *COUNTS):
        assert before[item_id]["value"] is not None, item_id
        assert got[item_id]["value"] is None, item_id
    ahead = upcoming(run(row.raises))
    assert not [entry for entry in ahead if entry.startswith("next.")]


# Property tests: the rule's value in the pack moves the edge. The clock is injected.


def shifted(rule_id: str, value: int, regime: str = "") -> dict[str, Any]:
    raw = copy.deepcopy(PACK)
    for parameter in raw["parameters"]:
        if parameter["id"] == rule_id and parameter.get("regime", "") == regime:
            parameter["value"] = value
    return raw


@settings(deadline=None, max_examples=25)
@given(st.integers(min_value=1, max_value=90), st.integers(min_value=-2, max_value=1))
def test_the_opt_file_by_edge_moves_with_the_rule(days, offset):
    # The filing is days + offset after 2025-08-01: at most 91 days, 2025-10-31, before
    # the card (2025-11-01) and before the program window closes (2025-11-14).
    raw = shifted("opt.file_within_days_of_recommendation", days)
    case = opt_filed(OPT_REC + timedelta(days=days + offset))
    out = run(case, raw_pack=raw)
    raised = "opt.i765_filed_date.after_file_by" in conflicts(out)
    assert raised is (offset > 0)


@settings(deadline=None, max_examples=25)
@given(st.integers(min_value=1, max_value=68), st.integers(min_value=-2, max_value=1))
def test_the_stem_file_by_edge_moves_with_the_rule(days, offset):
    # At most 69 days after 2026-08-01: 2026-10-09, before STEM_DAY and the STEM card.
    raw = shifted("stem.file_within_days_of_recommendation", days)
    case = stem_filed(STEM_REC + timedelta(days=days + offset))
    out = run(case, today=STEM_DAY, raw_pack=raw)
    raised = "stem.i765_filed_date.after_file_by" in conflicts(out)
    assert raised is (offset > 0)


@settings(deadline=None, max_examples=25)
@given(st.integers(min_value=1, max_value=300), st.integers(min_value=-1, max_value=2))
def test_the_stem_window_edge_moves_with_the_rule(days, offset):
    # The window opens days before 2026-10-15. The filing is offset days before it opens
    # (a negative offset is after), the recommendation 16 days before the window.
    raw = shifted("stem.apply_before_expiry_days", days)
    opens = day(STEM_AHEAD["opt"]["ead_end"]) - timedelta(days=days)
    case = with_block(
        STEM_AHEAD,
        "stem",
        dso_recommendation_date=iso(opens - timedelta(days=16)),
        i765_filed_date=iso(opens - timedelta(days=offset)),
    )
    out = run(case, raw_pack=raw)
    raised = "stem.i765_filed_date.before_window_opens" in conflicts(out)
    assert raised is (offset > 0)


@settings(deadline=None, max_examples=25)
@given(st.integers(min_value=1, max_value=75), st.integers(min_value=-2, max_value=1))
def test_the_opt_window_close_edge_moves_with_the_rule(days, offset):
    # At most 76 days after 2026-06-15: 2026-08-30, before the card (2026-09-01).
    raw = shifted("opt.apply_after_days", days)
    filed = day(LATE_START["program_end_date"]) + timedelta(days=days + offset)
    out = run(opt_window_case(filed), raw_pack=raw)
    raised = "opt.i765_filed_date.after_window_closes" in conflicts(out)
    assert raised is (offset > 0)


@settings(deadline=None, max_examples=25)
@given(st.integers(min_value=12, max_value=30), st.integers(min_value=-2, max_value=1))
def test_the_complete_by_edge_moves_with_the_rule(months, offset):
    # The card ends offset days after the program end plus months, and begins 300 days
    # before its end: under 12 months, and after the filing of 2025-08-10.
    raw = shifted("opt.complete_within_months", months)
    end = months_later(day(FITS["program_end_date"]), months) + timedelta(days=offset)
    start = end - timedelta(days=300)
    case = with_changes(
        FITS,
        opt=ead("2025-08-01", "2025-08-10", iso(start), iso(end)),
        employment=[job(iso(start), None)],
    )
    out = run(case, raw_pack=raw)
    raised = "opt.ead_end.after_complete_by" in conflicts(out)
    assert raised is (offset > 0)


# Point 12: next.grace.ends is gone.

# OPT 2026-06-01 to 2027-05-31, no STEM.
NEXT: dict[str, Any] = with_changes(
    FITS,
    program_end_date="2026-05-15",
    opt=ead("2026-03-02", "2026-03-10", "2026-06-01", "2027-05-31"),
    employment=[job("2026-06-01", None)],
)


def test_point_12_the_grace_date_is_listed_once():
    out = run(NEXT)
    assert "next.grace.ends" not in upcoming(out)
    assert "next.grace.ends" not in items(out)
    # 60 days after 2027-05-31: 30 days reach Jun 30, 30 more 2027-07-30.
    assert upcoming(out)["grace.ends"]["date"] == "2027-07-30"
    assert [entry["id"] for entry in out["upcoming"]].count("grace.ends") == 1


# Point 17: grace.ends is null while an entered card has no end.


def test_point_17_a_stem_filing_with_no_card_gives_no_grace_date():
    # The sweep's case: STEM filed, no card yet. The OPT card alone would give 60 days
    # after 2026-10-15.
    case = with_block(STEM_AHEAD, "stem", ead_start=None, ead_end=None)
    out = run(case)
    assert values(out)["grace.ends"] is None
    assert "grace.ends" not in upcoming(out)
    assert out["verdict"]["state"] == "cannot_tell"


def test_point_17_an_opt_block_with_no_card_end_gives_no_grace_date():
    out = run(with_block(FITS, "opt", ead_end=None))
    assert values(out)["grace.ends"] is None


def test_point_17_with_every_card_end_entered_the_grace_date_is_there():
    # 60 days after 2026-10-31: 30 days reach Nov 30, 30 more 2026-12-30.
    assert values(run(FITS))["grace.ends"] == "2026-12-30"


# Point 18: grace.ends and cap-gap.

# The sweep's case: the card to 2026-10-15, cap-gap to 2027-01-15.
CAP_GAP_PAST_CARD: dict[str, Any] = with_changes(
    STEM_AHEAD,
    stem=None,
    cap_gap=cap_gap("2027-01-15", status="pending", petition_filed_on="2026-04-02"),
)


def test_point_18_cap_gap_past_the_card_gives_no_grace_date_and_a_judgement():
    out = run(CAP_GAP_PAST_CARD)
    got = values(out)
    # The condition of the point, read from the output: capgap.ends after the card end.
    assert got["capgap.ends"] is not None
    assert got["capgap.ends"] > CAP_GAP_PAST_CARD["opt"]["ead_end"]
    assert got["grace.ends"] is None
    assert "grace.ends" not in upcoming(out)
    assert out["verdict"]["state"] == "talk_to_dso"
    assert "grace_with_cap_gap" in out["verdict"]["reasons"]


def test_point_18_cap_gap_before_the_card_end_leaves_the_grace_date():
    # NEXT's card runs to 2027-05-31, after a cap-gap end of 2027-01-15.
    case = with_changes(
        NEXT, cap_gap=cap_gap("2027-01-15", status="pending", petition_filed_on="2026-04-02")
    )
    out = run(case)
    got = values(out)
    assert got["capgap.ends"] is not None
    assert got["capgap.ends"] <= NEXT["opt"]["ead_end"]
    assert got["grace.ends"] == "2027-07-30"
    assert "grace_with_cap_gap" not in out["verdict"]["reasons"]


def test_point_18_a_petition_that_is_not_active_raises_no_grace_judgement():
    case = with_block(CAP_GAP_PAST_CARD, "cap_gap", status="denied")
    out = run(case)
    assert "grace_with_cap_gap" not in out["verdict"]["reasons"]


# Point 19: unemployment on the OPT card keeps its own limit after STEM begins.

# OPT 2025-03-14 to 2026-03-13, STEM 2026-03-14 to 2028-03-13, today 2026-08-01. No
# report date of the STEM card has passed: the first validation is due 2026-09-28.
# Program end 2025-01-15: the OPT window closes 2025-03-16, 14 months reach 2026-03-15.
# The STEM window opens 90 days before 2026-03-13: 2025-12-13.
STEM_ON_DAY = date(2026, 8, 1)


def stem_on(employment: list[dict[str, Any]]) -> dict[str, Any]:
    return with_changes(
        FITS,
        program_end_date="2025-01-15",
        opt=ead("2024-12-01", "2024-12-10", "2025-03-14", "2026-03-13"),
        stem=ead("2026-01-10", "2026-01-20", "2026-03-14", "2028-03-13"),
        employment=employment,
    )


OPT_START = date(2025, 3, 14)


def test_point_19_the_case_of_the_sweep():
    # 105 days without work on the OPT card: 2025-03-14 through 2025-06-26 is 18 days of
    # March, 30 of April, 31 of May and 26 of June, 105. Work from 2025-06-27 on.
    out = run(stem_on([job("2025-06-27", None)]), today=STEM_ON_DAY)
    got = items(out)
    assert got["unemployment.opt_card_days_used"]["value"] == 105
    assert "opt.unemployment_limit_days" in got["unemployment.opt_card_days_used"]["rule_ids"]
    # 150 less 105 is 45.
    assert got["unemployment.days_remaining"]["value"] == 45
    assert out["verdict"]["state"] == "talk_to_dso"
    assert "unemployment_opt_card_at_or_over_limit" in out["verdict"]["reasons"]


def test_point_19_at_the_limit_is_raised_and_one_under_is_not():
    # OPT_LIMIT_DAYS days without work from 2025-03-14: work begins that many days on.
    at = run(stem_on([job(iso(OPT_START + timedelta(days=OPT_LIMIT_DAYS)), None)]), STEM_ON_DAY)
    assert values(at)["unemployment.opt_card_days_used"] == OPT_LIMIT_DAYS
    assert "unemployment_opt_card_at_or_over_limit" in at["verdict"]["reasons"]
    under_start = iso(OPT_START + timedelta(days=OPT_LIMIT_DAYS - 1))
    under = run(stem_on([job(under_start, None)]), STEM_ON_DAY)
    assert values(under)["unemployment.opt_card_days_used"] == OPT_LIMIT_DAYS - 1
    assert "unemployment_opt_card_at_or_over_limit" not in under["verdict"]["reasons"]


@settings(deadline=None, max_examples=25)
@given(st.integers(min_value=1, max_value=200), st.integers(min_value=0, max_value=300))
def test_point_19_the_opt_card_limit_comes_from_the_pack(limit, idle):
    # idle days without work from 2025-03-14, then work to today. At most 300 days, so
    # work begins by 2026-01-08, inside the OPT card.
    raw = shifted("opt.unemployment_limit_days", limit)
    case = stem_on([job(iso(OPT_START + timedelta(days=idle)), None)])
    out = run(case, today=STEM_ON_DAY, raw_pack=raw)
    assert values(out)["unemployment.opt_card_days_used"] == idle
    raised = "unemployment_opt_card_at_or_over_limit" in out["verdict"]["reasons"]
    assert raised is (idle >= limit)


def test_point_19_without_stem_there_is_no_judgement_of_its_own():
    # FITS with no work until 2026-01-30: 2025-11-01 to 2026-01-29 is 30 + 31 + 29 = 90
    # days. The OPT limit is the limit of the only card; the new judgement is for a STEM
    # card entered.
    out = run(with_changes(FITS, employment=[job("2026-01-30", None)]))
    assert "unemployment_opt_card_at_or_over_limit" not in out["verdict"]["reasons"]


# Point 23: no alternate for a regime whose row is not yet in effect on the item's date.


def with_blocked_from(raw: dict[str, Any], rule_id: str, effective_from: str) -> dict[str, Any]:
    changed = copy.deepcopy(raw)
    for parameter in changed["parameters"]:
        if parameter["id"] == rule_id and parameter.get("regime") == BLOCKED:
            parameter["effective_from"] = effective_from
    return changed


# 91 FR 44976 took effect on 2026-09-15.
BLOCKED_FROM = "2026-09-15"

# OPT 2023-06-01 to 2024-05-31. Program end 2023-05-15. Work from 2023-06-01 to the
# card's last day: SPEC-resolutions.md, points 43 and 52, a period still open after the
# card would raise employment.period_open_after_last_card and null grace.ends, so the
# case closes it and says its end was reported (point 22, periods_answered).
CLOSED_2024: dict[str, Any] = periods_answered(
    with_changes(
        FITS,
        program_end_date="2023-05-15",
        opt=ead("2023-03-01", "2023-03-10", "2023-06-01", "2024-05-31"),
        employment=[job("2023-06-01", "2024-05-31")],
    )
)


def test_point_23_a_grace_date_in_2024_carries_no_alternate():
    raw = with_blocked_from(PACK, "grace.after_completion_days", BLOCKED_FROM)
    got = items(run(CLOSED_2024, raw_pack=raw))
    # 60 days after 2024-05-31: 30 days reach Jun 30, 30 more 2024-07-30.
    assert got["grace.ends"]["value"] == "2024-07-30"
    assert "alternates" not in got["grace.ends"]


def test_point_23_a_grace_date_after_the_rule_took_effect_keeps_its_alternate():
    raw = with_blocked_from(PACK, "grace.after_completion_days", BLOCKED_FROM)
    got = items(run(NEXT, raw_pack=raw))
    # 30 days after 2027-05-31 is 2027-06-30.
    assert got["grace.ends"]["alternates"] == [
        {"regime": BLOCKED, "legal_status": "enjoined", "value": "2027-06-30"}
    ]


def test_point_23_a_window_that_closed_in_2023_carries_no_alternate():
    raw = with_blocked_from(
        with_regime_rows(PACK, "opt.apply_after_days", OPT_AFTER_DAYS, 30),
        "opt.apply_after_days",
        BLOCKED_FROM,
    )
    got = items(run(CLOSED_2024, raw_pack=raw))
    # 60 days after 2023-05-15: 16 days reach May 31, 30 Jun 30, 14 more 2023-07-14.
    assert got["opt.apply_window_closes"]["value"] == "2023-07-14"
    assert "alternates" not in got["opt.apply_window_closes"]


# Point 24: a holiday's observed day is not skipped.


def test_point_24_a_report_date_skips_no_observed_day():
    # STEM from 2026-01-01. 6 months on is Wednesday 2026-07-01. July 4 is a Saturday;
    # Friday Jul 3 is its observed day and is a business day now. Jul 2 (1), 3 (2),
    # 6 (3), 7 (4), 8 (5), 9 (6), 10 (7), 13 (8), 14 (9), 15 (10).
    # Program end 2024-12-15; OPT 2025-01-01 to 2025-12-31, filed 2024-11-10; the STEM
    # window opens 2025-10-02 and the filing is 2025-10-10.
    case = with_changes(
        FITS,
        program_end_date="2024-12-15",
        opt=ead("2024-11-01", "2024-11-10", "2025-01-01", "2025-12-31"),
        stem=ead("2025-10-01", "2025-10-10", "2026-01-01", "2027-12-31"),
        employment=[job("2025-01-01", None)],
    )
    got = values(run(case, today=date(2026, 6, 1)))
    assert got["stem.validation_1_due"] == "2026-07-15"
