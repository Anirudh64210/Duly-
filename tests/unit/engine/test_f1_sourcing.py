"""engine/f1.py: every number has a source.

Specified in specs/phase-2/SPEC-sourcing.md. A number that is law comes from the rule
pack by id. A number that is Duly's own choice comes from the settings, and the item
lists the id under `duly_settings` in its inputs. The number of STEM validation reports
is derived from two rules and written nowhere.

Each test changes one value in the test pack or the test settings and checks that the
result moves with it. Every expected date was worked out by hand. The working is beside
it.

The settings are passed in the shape of contracts/product_settings.yaml once parsed.
The open points are listed in tests/PROGRESS.md under "Questions".
"""

from datetime import date, timedelta
from typing import Any

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from tests.support.f1_pack import (
    SPEC_SETTINGS,
    build_pack,
    cap_gap,
    case_problems,
    clock_on,
    contract_problems,
    ead,
    items,
    job,
    months_later,
    pack_dict,
    reasons_with,
    rule_statuses,
    rule_value,
    settings_dict,
    settings_named,
    shipped_settings,
    values,
    weakest,
    with_block,
    with_changes,
)

TODAY = date(2026, 9, 28)  # a Monday

LOOKAHEAD = "product.open_item_lookahead_days"
LOOKBACK = "product.opt_start_earliest_years_before_program_end"
SETTING_IDS = {setting_id for setting_id, _, _ in SPEC_SETTINGS}

EVALUATION_INTERVAL = "stem.evaluation_interval_months"
CPT_BAR = "cpt.full_time_bar_days"
FISCAL_YEAR_START = "capgap.fiscal_year_start_month_day"
REPORT_EMPLOYER = "opt.report_employer_within_days"
HOLIDAYS_LAW = "calendar.federal_holidays_law"
NEW_RULES = {
    EVALUATION_INTERVAL: 12,
    CPT_BAR: 365,
    FISCAL_YEAR_START: "10-01",
    REPORT_EMPLOYER: 10,
    HOLIDAYS_LAW: True,
}


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
    return f1.compute_f1(f1.parse_case(case), pack, clock_on(today), settings=settings_dict(chosen))


# Case A: post-completion OPT, no STEM, no cap-gap. Nothing is open on 2026-09-28.
CASE_A: dict[str, Any] = {
    "program_end_date": "2026-05-15",
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
    "degree_level": "master",
    "documents_count": 5,
    "cpt_full_time_days": 100,
    "opt": ead("2024-03-01", "2024-03-15", "2024-07-01", "2025-06-30"),
    "stem": ead("2025-04-15", "2025-05-01", "2025-07-01", "2027-06-30"),
    "employment": [
        job("2024-07-01", "2025-12-31"),
        job("2026-01-11", None, reported=False),
    ],
    "cap_gap": cap_gap("2026-10-01", petition_filed_on="2026-04-02"),
}


def validation_ids(output: dict[str, Any]) -> set[str]:
    return {i for i in items(output) if i.startswith("stem.validation_") and i.endswith("_due")}


def named_by(output: dict[str, Any], rule_id: str) -> list[str]:
    """The ids of the items that name the rule."""
    return [item_id for item_id, item in items(output).items() if rule_id in item["rule_ids"]]


# The test pack and the test settings


@pytest.mark.parametrize(("rule_id", "assumed"), NEW_RULES.items())
def test_the_test_pack_holds_each_new_rule_with_the_assumed_value(rule_id, assumed):
    # SPEC-sourcing, "Rules to find and source": the value column.
    assert rule_value(pack_dict(TODAY), rule_id) == assumed


def test_the_test_settings_hold_the_ids_and_values_of_the_shipped_file():
    shipped = {s["id"]: (s["value"], s["unit"]) for s in shipped_settings()["settings"]}
    built = {s["id"]: (s["value"], s["unit"]) for s in settings_dict()["settings"]}
    assert built == shipped


# Every new rule is shown, word for word


@pytest.mark.parametrize("rule_id", NEW_RULES)
def test_each_new_rule_is_named_by_an_item_and_shown_as_the_pack_has_it(rule_id):
    # SPEC-sourcing, "The engine": every computed item that uses a new rule names it in
    # rule_ids. The contract: rules holds every rule named in computed.
    raw = pack_dict(TODAY)
    out = run(CASE_B)
    assert named_by(out, rule_id), rule_id
    source = next(p for p in raw["parameters"] if p["id"] == rule_id)
    shown = out["rules"][rule_id]
    assert shown["value"] == source["value"]
    assert shown["value"] is not None
    assert type(shown["value"]) is type(source["value"])
    assert shown["unit"] == source["unit"]
    assert shown["status"] == source["status"]
    assert shown["citation"] == source["source"]["citation"]
    assert shown.get("quote") == source["source"]["quote"]
    assert contract_problems(out) == []


@pytest.mark.parametrize("case", [CASE_A, CASE_B], ids=["case_a", "case_b"])
def test_an_items_status_is_still_the_weakest_among_the_rules_it_names(case):
    # cpt.full_time_bar_days is school and opt.report_employer_within_days is guidance.
    # An item that names one of them is no stronger than it.
    found = rule_statuses(pack_dict(TODAY))
    out = run(case)
    for item_id, item in items(out).items():
        assert set(item["rule_ids"]) <= set(found), item_id
        used = [s for rule_id in item["rule_ids"] for s in found[rule_id]]
        assert item["status"] == weakest(used), item_id


# stem.evaluation_interval_months


def test_the_evaluation_is_due_after_the_interval_in_the_pack():
    got = items(run(CASE_B))["stem.evaluation_12_month_due"]
    # stem.ead_start 2025-07-01 plus 12 months is 2026-07-01, plus 10 calendar days.
    assert got["value"] == "2026-07-11"
    assert EVALUATION_INTERVAL in got["rule_ids"]
    assert "stem.evaluation_due_days" in got["rule_ids"]


@pytest.mark.parametrize(
    ("months", "expected"),
    [
        # 2025-07-01 plus 11 months is 2026-06-01, plus 10 days.
        (11, "2026-06-11"),
        # Plus 13 months is 2026-08-01, plus 10 days.
        (13, "2026-08-11"),
        # Plus 6 months is 2026-01-01, plus 10 days.
        (6, "2026-01-11"),
    ],
)
def test_the_evaluation_date_moves_with_the_interval(months, expected):
    got = values(run(CASE_B, rules={EVALUATION_INTERVAL: months}))
    assert got["stem.evaluation_12_month_due"] == expected
    # The final evaluation is counted from stem.ead_end 2027-06-30, plus 10 days.
    assert got["stem.final_evaluation_due_from_ead_end"] == "2027-07-10"


def test_the_evaluation_interval_is_clamped_to_the_end_of_a_short_month():
    # stem.ead_start 2025-08-31 plus 6 months: February 2026 has 28 days. Plus 10 days:
    # Mar 10.
    case = with_changes(
        with_block(CASE_B, "stem", ead_start="2025-08-31", ead_end="2027-08-30"), cap_gap=None
    )
    got = values(run(case, rules={EVALUATION_INTERVAL: 6}))
    assert got["stem.evaluation_12_month_due"] == "2026-03-10"


def test_the_evaluation_interval_and_the_validation_interval_are_two_rules():
    # Moving one leaves the other's dates where they were.
    plain = values(run(CASE_B))
    moved = values(run(CASE_B, rules={EVALUATION_INTERVAL: 13}))
    for report in (1, 2, 3, 4):
        item_id = f"stem.validation_{report}_due"
        assert moved[item_id] == plain[item_id], item_id
    moved = values(run(CASE_B, rules={"stem.validation_interval_months": 12}))
    assert moved["stem.evaluation_12_month_due"] == plain["stem.evaluation_12_month_due"]


# The number of validation reports is derived


def test_the_shipped_numbers_give_four_reports():
    # SPEC-sourcing, "Derived, not stored": stem.extension_months 24 divided by
    # stem.validation_interval_months 6.
    assert validation_ids(run(CASE_B)) == {f"stem.validation_{n}_due" for n in (1, 2, 3, 4)}


def test_a_shorter_extension_gives_fewer_reports():
    # 12 divided by 6.
    out = run(CASE_B, rules={"stem.extension_months": 12})
    assert validation_ids(out) == {"stem.validation_1_due", "stem.validation_2_due"}
    got = values(out)
    # The dates are those of the first two reports under the shipped numbers.
    assert got["stem.validation_1_due"] == "2026-01-15"
    assert got["stem.validation_2_due"] == "2026-07-16"


def test_a_longer_extension_gives_more_reports():
    # 36 divided by 6.
    out = run(CASE_B, rules={"stem.extension_months": 36})
    assert validation_ids(out) == {f"stem.validation_{n}_due" for n in range(1, 7)}
    got = values(out)
    assert got["stem.validation_4_due"] == "2027-07-16"
    # stem.ead_start 2025-07-01 plus 30 months is Saturday 2028-01-01. Ten business days
    # after it: Jan 3 (1), 4 (2), 5 (3), 6 (4), 7 (5), 10 (6), 11 (7), 12 (8), 13 (9),
    # 14 (10). The holiday on Monday Jan 17 is not reached.
    assert got["stem.validation_5_due"] == "2028-01-14"
    # Plus 36 months is Saturday 2028-07-01. Jul 3 (1), Tuesday Jul 4 is Independence
    # Day, Jul 5 (2), 6 (3), 7 (4), 10 (5), 11 (6), 12 (7), 13 (8), 14 (9), 17 (10).
    assert got["stem.validation_6_due"] == "2028-07-17"
    assert contract_problems(out) == []


def test_a_longer_interval_gives_fewer_reports_further_apart():
    # 24 divided by 12.
    out = run(CASE_B, rules={"stem.validation_interval_months": 12})
    assert validation_ids(out) == {"stem.validation_1_due", "stem.validation_2_due"}
    got = values(out)
    # 2025-07-01 plus 12 months is Wednesday 2026-07-01: see stem.validation_2_due under
    # the shipped numbers.
    assert got["stem.validation_1_due"] == "2026-07-16"
    # Plus 24 months is Thursday 2027-07-01: see stem.validation_4_due.
    assert got["stem.validation_2_due"] == "2027-07-16"


def test_a_shorter_interval_gives_more_reports_closer_together():
    # 24 divided by 3.
    out = run(CASE_B, rules={"stem.validation_interval_months": 3})
    assert validation_ids(out) == {f"stem.validation_{n}_due" for n in range(1, 9)}
    got = values(out)
    # 2025-07-01 plus 3 months is Wednesday 2025-10-01. Oct 2 (1), 3 (2), 6 (3), 7 (4),
    # 8 (5), 9 (6), 10 (7), Monday Oct 13 is Columbus Day, Oct 14 (8), 15 (9), 16 (10).
    assert got["stem.validation_1_due"] == "2025-10-16"
    # Plus 6 months: the first report under the shipped numbers.
    assert got["stem.validation_2_due"] == "2026-01-15"
    # Plus 24 months: the fourth report under the shipped numbers.
    assert got["stem.validation_8_due"] == "2027-07-16"


def test_every_derived_report_is_null_when_the_start_date_is_missing():
    case = with_changes(with_block(CASE_B, "stem", ead_start=None), cap_gap=None)
    out = run(case, rules={"stem.extension_months": 36})
    got = items(out)
    assert validation_ids(out) == {f"stem.validation_{n}_due" for n in range(1, 7)}
    for item_id in validation_ids(out):
        assert got[item_id]["value"] is None, item_id


# calendar.federal_holidays_law


@pytest.mark.parametrize("extension", [12, 24, 36])
def test_every_business_day_item_names_the_holiday_law(extension):
    # SPEC-sourcing, "The engine": each business-day item names it in rule_ids.
    out = run(CASE_B, rules={"stem.extension_months": extension})
    got = items(out)
    assert validation_ids(out)
    for item_id in validation_ids(out):
        assert HOLIDAYS_LAW in got[item_id]["rule_ids"], item_id
        assert "stem.validation_due_business_days" in got[item_id]["rule_ids"], item_id
    assert out["rules"][HOLIDAYS_LAW]["value"] is True
    assert out["rules"][HOLIDAYS_LAW]["unit"] == "flag"


# cpt.full_time_bar_days


@pytest.mark.parametrize(
    ("bar", "days", "state", "reasons"),
    [
        (300, 299, "no_open_items", []),
        (300, 300, "talk_to_dso", ["cpt_full_time_at_or_over_bar"]),
        (300, 301, "talk_to_dso", ["cpt_full_time_at_or_over_bar"]),
        # At or over the assumed value, under the bar in the pack.
        (400, 365, "no_open_items", []),
        (400, 399, "no_open_items", []),
        (400, 400, "talk_to_dso", ["cpt_full_time_at_or_over_bar"]),
        (400, 401, "talk_to_dso", ["cpt_full_time_at_or_over_bar"]),
    ],
)
def test_the_cpt_bar_comes_from_the_pack(bar, days, state, reasons):
    out = run(with_changes(CASE_A, cpt_full_time_days=days), rules={CPT_BAR: bar})
    assert values(out)["cpt.full_time_days_used"] == days
    assert out["verdict"] == {"state": state, "reasons": reasons}
    assert out["rules"][CPT_BAR]["value"] == bar


def test_the_cpt_bar_in_months_does_not_stand_in_for_the_bar_in_days():
    # cpt.full_time_months_bar stays at 12. Only the rule in days moved.
    out = run(with_changes(CASE_A, cpt_full_time_days=364), rules={CPT_BAR: 364})
    assert out["verdict"] == {"state": "talk_to_dso", "reasons": ["cpt_full_time_at_or_over_bar"]}
    out = run(with_changes(CASE_A, cpt_full_time_days=365), rules={"cpt.full_time_months_bar": 13})
    assert out["verdict"] == {"state": "talk_to_dso", "reasons": ["cpt_full_time_at_or_over_bar"]}


# capgap.fiscal_year_start_month_day


def test_capgap_names_the_fiscal_year_rule():
    got = items(run(CASE_B))["capgap.ends"]
    assert FISCAL_YEAR_START in got["rule_ids"]
    assert "capgap.end_month_day" in got["rule_ids"]
    assert got["value"] == "2026-10-01"


@pytest.mark.parametrize(
    ("starts", "requested_start", "expected"),
    [
        # The fiscal year starts on September 1. A requested start on or after it falls
        # in the fiscal year whose April 1 is in the next calendar year.
        ("09-01", "2027-08-31", "2027-04-01"),  # the day before: April 1 of 2027 is earlier
        ("09-01", "2027-09-01", "2027-09-01"),  # the day of: April 1 of 2028 is later
        ("09-01", "2027-09-02", "2027-09-02"),  # the day after
        ("09-01", "2027-12-31", "2027-12-31"),
        ("09-01", "2028-01-01", "2028-01-01"),  # before April 1 of 2028
        ("09-01", "2028-04-02", "2028-04-01"),
        # The fiscal year starts on November 1. October is then in the old fiscal year.
        ("11-01", "2026-10-01", "2026-04-01"),
        ("11-01", "2026-10-31", "2026-04-01"),  # the day before
        ("11-01", "2026-11-01", "2026-11-01"),  # the day of
        ("11-01", "2026-11-02", "2026-11-02"),  # the day after
        # The day of the month counts, not only the month.
        ("10-15", "2026-10-14", "2026-04-01"),  # the day before
        ("10-15", "2026-10-15", "2026-10-15"),  # the day of
        ("10-15", "2026-10-16", "2026-10-16"),  # the day after
    ],
)
def test_the_fiscal_year_start_comes_from_the_pack(starts, requested_start, expected):
    case = with_changes(CASE_A, cap_gap=cap_gap(requested_start))
    out = run(case, rules={FISCAL_YEAR_START: starts})
    assert values(out)["capgap.ends"] == expected
    assert out["rules"][FISCAL_YEAR_START]["value"] == starts


def test_both_capgap_rules_move_together():
    # The fiscal year starts on September 1 and the cap-gap ends on May 15.
    rules = {FISCAL_YEAR_START: "09-01", "capgap.end_month_day": "05-15"}
    early = with_changes(CASE_A, cap_gap=cap_gap("2027-08-31"))
    # Before September 1: May 15 of 2027 is earlier than the requested start.
    assert values(run(early, rules=rules))["capgap.ends"] == "2027-05-15"
    late = with_changes(CASE_A, cap_gap=cap_gap("2027-09-01"))
    # On September 1: May 15 of 2028 is later than the requested start.
    assert values(run(late, rules=rules))["capgap.ends"] == "2027-09-01"


# opt.report_employer_within_days


@pytest.mark.parametrize("days", [10, 12])
def test_periods_not_reported_names_the_reporting_rule(days):
    # SPEC-sourcing, "The engine": employment.periods_not_reported names
    # opt.report_employer_within_days.
    out = run(CASE_B, rules={REPORT_EMPLOYER: days})
    got = items(out)["employment.periods_not_reported"]
    assert REPORT_EMPLOYER in got["rule_ids"]
    # The count is of periods. It does not turn on the number of days.
    assert got["value"] == 1
    assert out["rules"][REPORT_EMPLOYER]["value"] == days
    assert out["rules"][REPORT_EMPLOYER]["status"] == "guidance"
    # Guidance is weaker than settled, so the item is no stronger than guidance.
    assert got["status"] != "settled"


# Duly's own choices: product.open_item_lookahead_days


@pytest.mark.parametrize(
    ("ahead", "recommended", "file_by", "open_item"),
    [
        # file_by is the recommendation date plus 30 days. Today is 2026-09-28.
        # Sep 5 plus 30: 25 to Sep 30, 5 to Oct 5. Today plus 7 days.
        (7, "2026-09-05", "2026-10-05", True),
        # Sep 6 plus 30: Oct 6. Today plus 8 days.
        (7, "2026-09-06", "2026-10-06", False),
        # Sep 12 plus 30: Oct 12. Today plus 14 days: open under 14, not under 7.
        (7, "2026-09-12", "2026-10-12", False),
        # Aug 29 plus 30: Sep 28. Today.
        (7, "2026-08-29", "2026-09-28", True),
        # Aug 28 plus 30: Sep 27. The day before today.
        (7, "2026-08-28", "2026-09-27", False),
        # Sep 13 plus 30: Oct 13. Today plus 15 days: not open under 14, open under 21.
        (21, "2026-09-13", "2026-10-13", True),
        # Sep 19 plus 30: 11 to Sep 30, 19 to Oct 19. Today plus 21 days.
        (21, "2026-09-19", "2026-10-19", True),
        # Sep 20 plus 30: Oct 20. Today plus 22 days.
        (21, "2026-09-20", "2026-10-20", False),
        # Nothing ahead: only an item dated today is open.
        (0, "2026-08-29", "2026-09-28", True),
        (0, "2026-08-30", "2026-09-29", False),
    ],
)
def test_the_lookahead_comes_from_the_settings(ahead, recommended, file_by, open_item):
    case = with_block(CASE_A, "opt", dso_recommendation_date=recommended)
    out = run(case, chosen={LOOKAHEAD: ahead})
    assert values(out)["opt.file_by"] == file_by
    if open_item:
        assert out["verdict"] == {"state": "needs_you", "reasons": ["opt.file_by"]}
    else:
        assert out["verdict"] == {"state": "no_open_items", "reasons": []}


# Duly's own choices: product.opt_start_earliest_years_before_program_end


@pytest.mark.parametrize(
    ("years", "opt_start", "conflict"),
    [
        # program_end_date 2026-05-15 minus 1 year is 2025-05-15.
        (1, "2025-05-14", True),
        (1, "2025-05-15", False),
        # Minus 2 years is 2024-05-15.
        (2, "2025-05-14", False),
        (2, "2024-05-14", True),  # the day before
        (2, "2024-05-15", False),  # the day of
        (2, "2024-05-16", False),  # the day after
        # Minus 3 years is 2023-05-15.
        (3, "2024-05-14", False),
        (3, "2023-05-14", True),
        (3, "2023-05-15", False),
    ],
)
def test_the_earliest_opt_start_comes_from_the_settings(years, opt_start, conflict):
    case = with_changes(
        with_block(CASE_A, "opt", ead_start=opt_start),
        employment=[job("2023-05-01", None)],
    )
    out = run(case, chosen={LOOKBACK: years})
    if conflict:
        assert out["verdict"]["state"] == "cannot_tell"
        assert reasons_with(out, "conflict:")
    else:
        assert reasons_with(out, "conflict:") == []
        assert out["verdict"] == {"state": "no_open_items", "reasons": []}


# Duly's own choices: how they are passed and how they are shown


def test_no_settings_means_the_shipped_file():
    # SPEC-sourcing, "The test pack": None means the shipped file.
    pack = build_pack(TODAY)
    case = f1.parse_case(CASE_B)
    shipped = f1.compute_f1(case, pack, clock_on(TODAY), settings=shipped_settings())
    assert f1.compute_f1(case, pack, clock_on(TODAY), settings=None) == shipped
    assert f1.compute_f1(case, pack, clock_on(TODAY)) == shipped


def test_settings_is_a_keyword_argument():
    with pytest.raises(TypeError):
        f1.compute_f1(f1.parse_case(CASE_A), build_pack(TODAY), clock_on(TODAY), settings_dict())


@pytest.mark.parametrize("case", [CASE_A, CASE_B], ids=["case_a", "case_b"])
def test_each_setting_used_is_listed_under_duly_settings(case):
    # SPEC-sourcing, "Duly's own choices": the engine lists the ids it used in each
    # item's inputs under the key duly_settings.
    out = run(case)
    named = settings_named(out)
    for item_id, ids in named.items():
        assert isinstance(items(out)[item_id]["inputs"].get("duly_settings", []), list), item_id
        assert set(ids) <= SETTING_IDS, item_id
        assert len(ids) == len(set(ids)), item_id
    listed = {setting_id for ids in named.values() for setting_id in ids}
    # Both cases have an OPT start date and dated items, so both settings were used.
    assert listed == SETTING_IDS
    assert contract_problems(out) == []


@pytest.mark.parametrize("case", [CASE_A, CASE_B], ids=["case_a", "case_b"])
def test_a_setting_is_never_shown_as_law(case):
    # SPEC-sourcing: Duly's own choice is recorded as Duly's choice and never shown as
    # law. rule_ids and rules hold rules of the pack only.
    out = run(case)
    known = {p["id"] for p in pack_dict(TODAY)["parameters"]}
    assert set(out["rules"]) <= known
    assert not set(out["rules"]) & SETTING_IDS
    for item_id, item in items(out).items():
        assert not set(item["rule_ids"]) & SETTING_IDS, item_id


@pytest.mark.parametrize("chosen", [{LOOKAHEAD: 7}, {LOOKAHEAD: 60}, {LOOKBACK: 2}])
def test_a_setting_changes_no_date_and_no_count(chosen):
    # The settings decide what is listed as open and what is reported as a likely typing
    # mistake. They say nothing about the law, so no computed value moves with them.
    assert values(run(CASE_B, chosen=chosen)) == values(run(CASE_B))


def test_same_inputs_and_settings_same_output():
    assert run(CASE_B, chosen={LOOKAHEAD: 7}) == run(CASE_B, chosen={LOOKAHEAD: 7})


# Properties


@settings(max_examples=150, deadline=None)
@given(
    ahead=st.integers(min_value=0, max_value=90),
    offset=st.integers(min_value=-10, max_value=100),
    today=st.dates(min_value=date(2026, 6, 2), max_value=date(2027, 5, 1)),
)
def test_an_item_is_open_from_today_through_the_lookahead_and_on_no_other_day(ahead, offset, today):
    # opt.file_by falls offset days from today: the recommendation date is that day less
    # the 30 days of opt.file_within_days_of_recommendation.
    recommended = today + timedelta(days=offset - 30)
    case = with_block(CASE_A, "opt", dso_recommendation_date=recommended.isoformat())
    out = run(case, today=today, chosen={LOOKAHEAD: ahead})
    assert values(out)["opt.file_by"] == (today + timedelta(days=offset)).isoformat()
    assert ("opt.file_by" in out["verdict"]["reasons"]) == (0 <= offset <= ahead)


@settings(max_examples=150, deadline=None)
@given(
    bar=st.integers(min_value=1, max_value=800),
    days=st.integers(min_value=0, max_value=800),
)
def test_the_cpt_reason_appears_at_the_bar_and_over_it_and_never_under(bar, days):
    out = run(with_changes(CASE_A, cpt_full_time_days=days), rules={CPT_BAR: bar})
    assert ("cpt_full_time_at_or_over_bar" in out["verdict"]["reasons"]) == (days >= bar)
    # CLAUDE.md: a verdict never falls back to the quiet state.
    if out["verdict"]["state"] == "no_open_items":
        assert days < bar


@settings(max_examples=150, deadline=None)
@given(
    months=st.integers(min_value=1, max_value=36),
    due=st.integers(min_value=1, max_value=30),
    start=st.dates(min_value=date(2025, 7, 1), max_value=date(2026, 6, 30)),
)
def test_the_evaluation_is_due_the_interval_and_the_days_after_the_start(months, due, start):
    case = with_changes(
        with_block(
            CASE_B,
            "stem",
            ead_start=start.isoformat(),
            ead_end=(months_later(start, 24) - timedelta(days=1)).isoformat(),
        ),
        cap_gap=None,
    )
    out = run(case, rules={EVALUATION_INTERVAL: months, "stem.evaluation_due_days": due})
    expected = months_later(start, months) + timedelta(days=due)
    assert values(out)["stem.evaluation_12_month_due"] == expected.isoformat()


@settings(max_examples=100, deadline=None)
@given(
    interval=st.sampled_from([1, 2, 3, 4, 6, 12]),
    reports=st.integers(min_value=1, max_value=8),
)
def test_there_is_one_report_for_each_interval_in_the_extension(interval, reports):
    # SPEC-sourcing, "Derived, not stored". Only extensions that the interval divides
    # with nothing left over are drawn.
    rules = {
        "stem.validation_interval_months": interval,
        "stem.extension_months": interval * reports,
    }
    out = run(CASE_B, rules=rules)
    assert validation_ids(out) == {f"stem.validation_{n}_due" for n in range(1, reports + 1)}
    got = items(out)
    reached = [months_later(date(2025, 7, 1), interval * n) for n in range(1, reports + 1)]
    for n, day in enumerate(reached, start=1):
        due = date.fromisoformat(got[f"stem.validation_{n}_due"]["value"])
        # Counted from a Sunday, ten business days end on the Friday 12 days on. No run
        # of holidays and weekends stretches them past 21.
        assert day + timedelta(days=12) <= due <= day + timedelta(days=21), n
        assert due.weekday() < 5, n
