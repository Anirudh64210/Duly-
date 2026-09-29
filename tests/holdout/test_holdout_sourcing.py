"""Hidden second set for specs/phase-2/SPEC-sourcing.md: every number has a source.

The same rules as tests/unit/engine/test_f1_sourcing.py, on another case, another day,
and other values. An engine that fits the shown tests by their numbers fails here.

Every expected date was worked out by hand. The working is beside it. The settings are
passed in the shape of contracts/product_settings.yaml once parsed.
"""

from datetime import date, timedelta
from typing import Any

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from tests.support.f1_pack import (
    SPEC_SETTINGS,
    TIME_ZONE,
    answered_yes,
    build_pack,
    cap_gap,
    case_problems,
    clock_on,
    contract_problems,
    dated_on_the_day,
    ead,
    items,
    job,
    months_later,
    pack_dict,
    reasons_with,
    rule_statuses,
    settings_dict,
    settings_named,
    shipped_settings,
    values,
    weakest,
    with_block,
    with_changes,
    with_the_about_asked,
)

TODAY = date(2026, 11, 2)  # a Monday

LOOKAHEAD = "product.open_item_lookahead_days"
LOOKBACK = "product.opt_start_earliest_years_before_program_end"
SETTING_IDS = {setting_id for setting_id, _, _ in SPEC_SETTINGS}

EVALUATION_INTERVAL = "stem.evaluation_interval_months"
CPT_BAR = "cpt.full_time_bar_days"
FISCAL_YEAR_START = "capgap.fiscal_year_start_month_day"
REPORT_EMPLOYER = "opt.report_employer_within_days"
HOLIDAYS_LAW = "calendar.federal_holidays_law"
NEW_RULES = (EVALUATION_INTERVAL, CPT_BAR, FISCAL_YEAR_START, REPORT_EMPLOYER, HOLIDAYS_LAW)


def run(
    case: dict[str, Any],
    today: date = TODAY,
    rules: dict[str, Any] | None = None,
    chosen: dict[str, int] | None = None,
) -> dict[str, Any]:
    """Compute a case on a fixed day under the test pack and the test settings.

    rules replaces rule values by id. chosen replaces setting values by id.
    """
    assert case_problems(case) == [], "the test case itself must match the case contract"
    pack = build_pack(today, values={(rule_id, ""): v for rule_id, v in (rules or {}).items()})
    clock = clock_on(today)

    def compute(sent: dict[str, Any]) -> dict[str, Any]:
        return f1.compute_f1(
            f1.parse_case(sent, clock), pack, clock, settings=settings_dict(chosen)
        )

    # SPEC-resolutions.md, point 7: an answer is sent with the about it was asked with.
    return compute(with_the_about_asked(dated_on_the_day(case, clock), compute))


# Case C: on the STEM extension since 2026-08-01, one employer, reported, full time.
# Nothing is open on 2026-11-02.
CASE_C: dict[str, Any] = {
    "program_end_date": "2025-05-16",
    "time_zone": TIME_ZONE,
    "confirmations": answered_yes(),
    "degree_level": "doctorate",
    "documents_count": 2,
    "cpt_full_time_days": 40,
    "opt": ead("2025-03-03", "2025-03-12", "2025-08-01", "2026-07-31"),
    "stem": ead("2026-05-04", "2026-05-20", "2026-08-01", "2028-07-31"),
    "employment": [job("2025-08-01", None)],
    "cap_gap": None,
}

# Case D: post-completion OPT only, with one employer not reported and a petition.
CASE_D: dict[str, Any] = {
    "program_end_date": "2026-08-14",
    "time_zone": TIME_ZONE,
    "confirmations": answered_yes(),
    "degree_level": "bachelor",
    "documents_count": 1,
    "cpt_full_time_days": 0,
    "opt": ead("2026-06-01", "2026-06-10", "2026-09-01", "2027-08-31"),
    "stem": None,
    "employment": [job("2026-09-01", None, reported=False)],
    "cap_gap": cap_gap("2027-10-01", petition_filed_on="2027-04-05"),
}


def validation_ids(output: dict[str, Any]) -> set[str]:
    return {i for i in items(output) if i.startswith("stem.validation_") and i.endswith("_due")}


def test_case_c_is_quiet_under_the_test_settings():
    out = run(CASE_C)
    assert out["verdict"] == {"state": "no_open_items", "reasons": []}
    assert contract_problems(out) == []


@pytest.mark.parametrize("rule_id", NEW_RULES)
def test_each_new_rule_is_named_and_shown_as_the_pack_has_it(rule_id):
    raw = pack_dict(TODAY)
    out = run(with_changes(CASE_C, cap_gap=cap_gap("2027-10-01")))
    assert [i for i in items(out).values() if rule_id in i["rule_ids"]], rule_id
    source = next(p for p in raw["parameters"] if p["id"] == rule_id)
    shown = out["rules"][rule_id]
    assert shown["value"] == source["value"]
    assert type(shown["value"]) is type(source["value"])
    assert shown["unit"] == source["unit"]
    assert shown["status"] == source["status"]
    assert shown["citation"] == source["source"]["citation"]
    assert shown.get("quote") == source["source"]["quote"]


@pytest.mark.parametrize("case", [CASE_C, CASE_D], ids=["case_c", "case_d"])
def test_status_is_the_weakest_among_the_rules_named(case):
    found = rule_statuses(pack_dict(TODAY))
    for item_id, item in items(run(case)).items():
        assert set(item["rule_ids"]) <= set(found), item_id
        used = [s for rule_id in item["rule_ids"] for s in found[rule_id]]
        assert item["status"] == weakest(used), item_id


# stem.evaluation_interval_months


@pytest.mark.parametrize(
    ("months", "expected"),
    [
        # stem.ead_start 2026-08-01 plus 12 months is 2027-08-01, plus 10 days.
        (12, "2027-08-11"),
        # Plus 11 months is 2027-07-01, plus 10 days.
        (11, "2027-07-11"),
        # Plus 13 months is 2027-09-01, plus 10 days.
        (13, "2027-09-11"),
        # Plus 18 months is 2028-02-01, plus 10 days.
        (18, "2028-02-11"),
    ],
)
def test_the_evaluation_date_moves_with_the_interval(months, expected):
    got = items(run(CASE_C, rules={EVALUATION_INTERVAL: months}))
    assert got["stem.evaluation_12_month_due"]["value"] == expected
    assert EVALUATION_INTERVAL in got["stem.evaluation_12_month_due"]["rule_ids"]
    # stem.ead_end 2028-07-31 plus 10 days.
    assert got["stem.final_evaluation_due_from_ead_end"]["value"] == "2028-08-10"


# The number of validation reports is derived


def test_six_reports_four_months_apart():
    # 24 divided by 4.
    out = run(CASE_C, rules={"stem.validation_interval_months": 4})
    assert validation_ids(out) == {f"stem.validation_{n}_due" for n in range(1, 7)}
    got = values(out)
    # 2026-08-01 plus 4 months is Tuesday 2026-12-01. Dec 2 (1), 3 (2), 4 (3), 7 (4),
    # 8 (5), 9 (6), 10 (7), 11 (8), 14 (9), 15 (10).
    assert got["stem.validation_1_due"] == "2026-12-15"
    # Plus 8 months is Thursday 2027-04-01. Apr 2 (1), 5 (2), 6 (3), 7 (4), 8 (5), 9 (6),
    # 12 (7), 13 (8), 14 (9), 15 (10).
    assert got["stem.validation_2_due"] == "2027-04-15"
    # Plus 12 months is Sunday 2027-08-01. Aug 2 (1), 3 (2), 4 (3), 5 (4), 6 (5), 9 (6),
    # 10 (7), 11 (8), 12 (9), 13 (10).
    assert got["stem.validation_3_due"] == "2027-08-13"
    # Plus 16 months is Wednesday 2027-12-01. Dec 2 (1), 3 (2), 6 (3), 7 (4), 8 (5),
    # 9 (6), 10 (7), 13 (8), 14 (9), 15 (10).
    assert got["stem.validation_4_due"] == "2027-12-15"
    # Plus 20 months is Saturday 2028-04-01. Apr 3 (1), 4 (2), 5 (3), 6 (4), 7 (5),
    # 10 (6), 11 (7), 12 (8), 13 (9), 14 (10).
    assert got["stem.validation_5_due"] == "2028-04-14"
    # Plus 24 months is Tuesday 2028-08-01. Aug 2 (1), 3 (2), 4 (3), 7 (4), 8 (5), 9 (6),
    # 10 (7), 11 (8), 14 (9), 15 (10).
    assert got["stem.validation_6_due"] == "2028-08-15"
    assert contract_problems(out) == []


def test_two_reports_when_the_extension_is_eight_months_and_the_interval_four():
    rules = {"stem.validation_interval_months": 4, "stem.extension_months": 8}
    out = run(CASE_C, rules=rules)
    assert validation_ids(out) == {"stem.validation_1_due", "stem.validation_2_due"}
    assert values(out)["stem.validation_2_due"] == "2027-04-15"


def test_one_report_when_the_interval_is_the_whole_extension():
    out = run(CASE_C, rules={"stem.validation_interval_months": 24})
    assert validation_ids(out) == {"stem.validation_1_due"}
    assert values(out)["stem.validation_1_due"] == "2028-08-15"


def test_every_business_day_item_names_the_holiday_law():
    out = run(CASE_C, rules={"stem.validation_interval_months": 4})
    got = items(out)
    for item_id in validation_ids(out):
        assert HOLIDAYS_LAW in got[item_id]["rule_ids"], item_id
    assert out["rules"][HOLIDAYS_LAW]["value"] is True


# cpt.full_time_bar_days


@pytest.mark.parametrize(
    ("bar", "days", "state", "reasons"),
    [
        (41, 40, "no_open_items", []),
        (40, 40, "talk_to_dso", ["cpt_full_time_at_or_over_bar"]),
        (39, 40, "talk_to_dso", ["cpt_full_time_at_or_over_bar"]),
        (730, 365, "no_open_items", []),
        (730, 729, "no_open_items", []),
        (730, 730, "talk_to_dso", ["cpt_full_time_at_or_over_bar"]),
    ],
)
def test_the_cpt_bar_comes_from_the_pack(bar, days, state, reasons):
    out = run(with_changes(CASE_C, cpt_full_time_days=days), rules={CPT_BAR: bar})
    assert out["verdict"] == {"state": state, "reasons": reasons}


# capgap.fiscal_year_start_month_day


@pytest.mark.parametrize(
    ("starts", "requested_start", "expected"),
    [
        # Under the assumed start, October 1: see the SPEC, "Cap-gap".
        ("10-01", "2027-09-30", "2027-04-01"),
        ("10-01", "2027-10-01", "2027-10-01"),
        ("10-01", "2027-10-02", "2027-10-02"),
        # The fiscal year starts on July 1.
        ("07-01", "2027-06-30", "2027-04-01"),  # the day before
        ("07-01", "2027-07-01", "2027-07-01"),  # the day of: April 1 of 2028 is later
        ("07-01", "2027-07-02", "2027-07-02"),  # the day after
        ("07-01", "2028-04-01", "2028-04-01"),
        ("07-01", "2028-06-30", "2028-04-01"),
        # The fiscal year starts on December 16.
        ("12-16", "2027-12-15", "2027-04-01"),  # the day before
        ("12-16", "2027-12-16", "2027-12-16"),  # the day of
        ("12-16", "2027-12-17", "2027-12-17"),  # the day after
    ],
)
def test_the_fiscal_year_start_comes_from_the_pack(starts, requested_start, expected):
    case = with_changes(CASE_D, cap_gap=cap_gap(requested_start, status="approved"))
    got = items(run(case, rules={FISCAL_YEAR_START: starts}))["capgap.ends"]
    assert got["value"] == expected
    assert FISCAL_YEAR_START in got["rule_ids"]


# opt.report_employer_within_days


@pytest.mark.parametrize("days", [10, 21])
def test_periods_not_reported_names_the_reporting_rule(days):
    out = run(CASE_D, rules={REPORT_EMPLOYER: days})
    got = items(out)["employment.periods_not_reported"]
    assert got["value"] == 1
    assert REPORT_EMPLOYER in got["rule_ids"]
    assert out["rules"][REPORT_EMPLOYER]["value"] == days
    assert "report_employer" in out["verdict"]["reasons"]


# Duly's own choices


@pytest.mark.parametrize(
    ("ahead", "recommended", "file_by", "open_item"),
    [
        # stem.file_by is the recommendation date plus 60 days. Today is 2026-11-02.
        # Sep 8 plus 60: 22 to Sep 30, 31 to Oct 31 (53), 7 to Nov 7. Today plus 5 days.
        (5, "2026-09-08", "2026-11-07", True),
        # Sep 9 plus 60: Nov 8. Today plus 6 days.
        (5, "2026-09-09", "2026-11-08", False),
        (6, "2026-09-09", "2026-11-08", True),
        # Sep 3 plus 60: 27 to Sep 30, 31 to Oct 31 (58), 2 to Nov 2. Today.
        (5, "2026-09-03", "2026-11-02", True),
        # Sep 2 plus 60: Nov 1. The day before today.
        (5, "2026-09-02", "2026-11-01", False),
        # Oct 3 plus 60: 28 to Oct 31, 30 to Nov 30 (58), 2 to Dec 2. Today plus 30 days.
        (30, "2026-10-03", "2026-12-02", True),
        # Oct 4 plus 60: Dec 3. Today plus 31 days.
        (30, "2026-10-04", "2026-12-03", False),
    ],
)
def test_the_lookahead_comes_from_the_settings(ahead, recommended, file_by, open_item):
    case = with_block(CASE_C, "stem", dso_recommendation_date=recommended)
    out = run(case, chosen={LOOKAHEAD: ahead})
    assert values(out)["stem.file_by"] == file_by
    if open_item:
        assert out["verdict"] == {"state": "needs_you", "reasons": ["stem.file_by"]}
    else:
        assert out["verdict"] == {"state": "no_open_items", "reasons": []}


@pytest.mark.parametrize(
    ("years", "opt_start", "conflict"),
    [
        # program_end_date 2025-05-16 minus 1 year is 2024-05-16.
        (1, "2024-05-15", True),
        (1, "2024-05-16", False),
        # Minus 4 years is 2021-05-16.
        (4, "2024-05-15", False),
        (4, "2021-05-15", True),
        (4, "2021-05-16", False),
        (4, "2021-05-17", False),
    ],
)
def test_the_earliest_opt_start_comes_from_the_settings(years, opt_start, conflict):
    case = with_changes(
        with_block(CASE_C, "opt", ead_start=opt_start), employment=[job("2021-01-01", None)]
    )
    out = run(case, chosen={LOOKBACK: years})
    if conflict:
        assert out["verdict"]["state"] == "cannot_tell"
        assert reasons_with(out, "conflict:")
    else:
        assert out["verdict"] == {"state": "no_open_items", "reasons": []}


def test_no_settings_means_the_shipped_file():
    pack = build_pack(TODAY)
    case = f1.parse_case(CASE_D)
    shipped = f1.compute_f1(case, pack, clock_on(TODAY), settings=shipped_settings())
    assert f1.compute_f1(case, pack, clock_on(TODAY), settings=None) == shipped
    assert f1.compute_f1(case, pack, clock_on(TODAY)) == shipped


@pytest.mark.parametrize("case", [CASE_C, CASE_D], ids=["case_c", "case_d"])
def test_each_setting_used_is_listed_under_duly_settings_and_never_as_law(case):
    out = run(case)
    named = settings_named(out)
    for item_id, ids in named.items():
        assert set(ids) <= SETTING_IDS, item_id
    assert {setting_id for ids in named.values() for setting_id in ids} == SETTING_IDS
    assert not set(out["rules"]) & SETTING_IDS
    for item_id, item in items(out).items():
        assert not set(item["rule_ids"]) & SETTING_IDS, item_id
    assert contract_problems(out) == []


@pytest.mark.parametrize("chosen", [{LOOKAHEAD: 3}, {LOOKAHEAD: 45}, {LOOKBACK: 5}])
def test_a_setting_changes_no_date_and_no_count(chosen):
    assert values(run(CASE_C, chosen=chosen)) == values(run(CASE_C))


# Properties


@settings(max_examples=150, deadline=None)
@given(
    ahead=st.integers(min_value=0, max_value=120),
    offset=st.integers(min_value=-10, max_value=130),
    today=st.dates(min_value=date(2026, 8, 2), max_value=date(2028, 3, 1)),
)
def test_an_item_is_open_from_today_through_the_lookahead_and_on_no_other_day(ahead, offset, today):
    # stem.file_by falls offset days from today: the recommendation date is that day
    # less the 60 days of stem.file_within_days_of_recommendation.
    recommended = today + timedelta(days=offset - 60)
    case = with_block(CASE_C, "stem", dso_recommendation_date=recommended.isoformat())
    out = run(case, today=today, chosen={LOOKAHEAD: ahead})
    assert values(out)["stem.file_by"] == (today + timedelta(days=offset)).isoformat()
    assert ("stem.file_by" in out["verdict"]["reasons"]) == (0 <= offset <= ahead)


@settings(max_examples=150, deadline=None)
@given(
    bar=st.integers(min_value=1, max_value=1000),
    days=st.integers(min_value=0, max_value=1000),
)
def test_the_cpt_reason_appears_at_the_bar_and_over_it_and_never_under(bar, days):
    out = run(with_changes(CASE_C, cpt_full_time_days=days), rules={CPT_BAR: bar})
    assert ("cpt_full_time_at_or_over_bar" in out["verdict"]["reasons"]) == (days >= bar)
    if out["verdict"]["state"] == "no_open_items":
        assert days < bar


@settings(max_examples=150, deadline=None)
@given(
    months=st.integers(min_value=1, max_value=48),
    start=st.dates(min_value=date(2026, 8, 1), max_value=date(2026, 10, 31)),
)
def test_the_evaluation_is_due_the_interval_and_the_days_after_the_start(months, start):
    case = with_block(CASE_C, "stem", ead_start=start.isoformat())
    out = run(case, rules={EVALUATION_INTERVAL: months})
    expected = months_later(start, months) + timedelta(days=10)
    assert values(out)["stem.evaluation_12_month_due"] == expected.isoformat()


@settings(max_examples=100, deadline=None)
@given(
    interval=st.sampled_from([1, 2, 3, 4, 6, 8, 12]),
    reports=st.integers(min_value=1, max_value=6),
)
def test_there_is_one_report_for_each_interval_in_the_extension(interval, reports):
    rules = {
        "stem.validation_interval_months": interval,
        "stem.extension_months": interval * reports,
    }
    out = run(CASE_C, rules=rules)
    assert validation_ids(out) == {f"stem.validation_{n}_due" for n in range(1, reports + 1)}
    got = values(out)
    for n in range(1, reports + 1):
        reached = months_later(date(2026, 8, 1), interval * n)
        due = date.fromisoformat(got[f"stem.validation_{n}_due"])
        # Counted from a Sunday, ten business days end on the Friday 12 days on.
        assert reached + timedelta(days=12) <= due <= reached + timedelta(days=21), n
        assert due.weekday() < 5, n
