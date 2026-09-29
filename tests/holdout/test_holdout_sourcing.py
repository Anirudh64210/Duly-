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
    NOT_AFTER_PROGRAM_END,
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
    periods_answered,
    reasons_with,
    refuse_placeholders,
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
# SPEC-resolutions.md, point 27: the reason an OPT card ending on or before
# program_end_date gives.
POINT_27 = f"conflict:{NOT_AFTER_PROGRAM_END}"
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
            f1.parse_case(refuse_placeholders(sent), clock),
            pack,
            clock,
            settings=settings_dict(chosen),
        )

    # SPEC-resolutions.md, point 7: an answer is sent with the about it was asked with.
    return compute(with_the_about_asked(dated_on_the_day(case, clock), compute))


# Case C: on the STEM extension since 2026-08-01, one employer, reported, full time.
# Nothing is open on 2026-11-02. SPEC-resolutions.md, point 16: the program end is
# 2025-06-01 (it was 2025-05-16, and 14 months from it, 2026-07-16, fell before the OPT
# card's last day, 2026-07-31). 14 months from 2025-06-01 is 2026-08-01. The OPT filing of
# 2025-03-12 is before the window closes 60 days after it (point 15); the STEM filing of
# 2026-05-20 is after the window opens 90 days before 2026-07-31, on 2026-05-02 (point 14).
CASE_C: dict[str, Any] = {
    "program_end_date": "2025-06-01",
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
    # Filed on 2026-10-05, before TODAY (2026-11-02): a filing dated after the day of the
    # case is a conflict whose dates give nulls (specs/product-1/SPEC.md, section 1;
    # SPEC-resolutions.md, point 4).
    "cap_gap": cap_gap("2027-10-01", petition_filed_on="2026-10-05"),
}


def moved(case: dict[str, Any], days: int) -> dict[str, Any]:
    """The case with every date it records moved by the same number of days."""

    def on(day: str | None) -> str | None:
        return None if day is None else (date.fromisoformat(day) + timedelta(days=days)).isoformat()

    changes: dict[str, Any] = {"program_end_date": on(case["program_end_date"])}
    for part in ("opt", "stem"):
        if case.get(part):
            changes[part] = {field: on(value) for field, value in case[part].items()}
    changes["employment"] = [
        {**period, "start": on(period["start"]), "end": on(period["end"])}
        for period in case["employment"]
    ]
    return with_changes(case, **changes)


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


def with_extension_of(months: int) -> dict[str, Any]:
    """CASE_C with a STEM card as long as an extension of the given months: from
    2026-08-01 through the day before its months end. A card longer than the rule is a
    conflict whose dates give nulls (specs/product-1/SPEC.md, section 1;
    SPEC-resolutions.md, points 4 and 10)."""
    last = months_later(date(2026, 8, 1), months) - timedelta(days=1)
    return with_block(CASE_C, "stem", ead_end=last.isoformat())


def test_two_reports_when_the_extension_is_eight_months_and_the_interval_four():
    rules = {"stem.validation_interval_months": 4, "stem.extension_months": 8}
    # 8 months from 2026-08-01 is 2027-04-01: the card runs through 2027-03-31.
    case = with_extension_of(8)
    assert case["stem"]["ead_end"] == "2027-03-31"
    out = run(case, rules=rules)
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
    # SPEC-resolutions.md, point 18: CASE_D's petition is active and asks for 2027-10-01,
    # after the card's last day of 2027-08-31, so its verdict carries the judgement item
    # grace_with_cap_gap, which wins over the open item report_employer. The test is about
    # the reporting rule, so its case has no petition (point 4: the facts fit).
    out = run(with_changes(CASE_D, cap_gap=None), rules={REPORT_EMPLOYER: days})
    got = items(out)["employment.periods_not_reported"]
    assert got["value"] == 1
    assert REPORT_EMPLOYER in got["rule_ids"]
    assert out["rules"][REPORT_EMPLOYER]["value"] == days
    assert "report_employer" in out["verdict"]["reasons"]


# Duly's own choices


# The lookahead is shown on stem.evaluation_12_month_due, an item that no recorded step
# makes done (specs/product-1/SPEC.md, section 4). stem.file_by is done once
# stem.i765_filed_date or stem.ead_start is recorded, and a STEM block without
# stem.ead_start is a missing input, so no case gives it as the one open item
# (SPEC-resolutions.md, point 5; see Disputes in tests/PROGRESS.md). With the interval
# at 3 months, CASE_C's evaluation is due 3 months from 2026-08-01, 2026-11-01, plus 10
# days: 2026-11-11. Nothing else of CASE_C falls within 120 days of it on the days drawn.
EVALUATION_DUE = date(2026, 11, 11)
SHORT_INTERVAL = {EVALUATION_INTERVAL: 3}


@pytest.mark.parametrize(
    ("ahead", "today", "open_item"),
    [
        # 2026-11-06 plus 5 days is 2026-11-11.
        (5, date(2026, 11, 6), True),
        # 2026-11-05 plus 6 days is 2026-11-11.
        (5, date(2026, 11, 5), False),
        (6, date(2026, 11, 5), True),
        # Due today.
        (5, date(2026, 11, 11), True),
        # Due the day before today.
        (5, date(2026, 11, 12), False),
        # 2026-10-12 plus 30 days: 19 to Oct 31, 11 to Nov 11.
        (30, date(2026, 10, 12), True),
        # 2026-10-11 plus 31 days is 2026-11-11.
        (30, date(2026, 10, 11), False),
    ],
)
def test_the_lookahead_comes_from_the_settings(ahead, today, open_item):
    # SPEC-resolutions.md, point 21: on 2026-11-12 the evaluation of 2026-11-11 has passed,
    # and each report dated before the day of the run was made (periods_answered). The
    # test is about the lookahead.
    case = periods_answered(CASE_C)
    out = run(case, today=today, rules=SHORT_INTERVAL, chosen={LOOKAHEAD: ahead})
    assert values(out)["stem.evaluation_12_month_due"] == EVALUATION_DUE.isoformat()
    if open_item:
        assert out["verdict"] == {
            "state": "needs_you",
            "reasons": ["stem.evaluation_12_month_due"],
        }
    else:
        assert out["verdict"] == {"state": "no_open_items", "reasons": []}


def opt_card_from(opt_start: str) -> dict[str, Any]:
    """A case whose facts fit (specs/product-1/SPEC.md, section 1; SPEC-resolutions.md,
    point 4): CASE_C with no STEM, an OPT card of 12 months less a day from opt_start,
    recommended 40 days and filed 30 days before it, and one open period from its first
    day. It is run 30 days into the card, so every date entered is on or before today."""
    first = date.fromisoformat(opt_start)
    card = ead(
        (first - timedelta(days=40)).isoformat(),
        (first - timedelta(days=30)).isoformat(),
        opt_start,
        (months_later(first, 12) - timedelta(days=1)).isoformat(),
    )
    # The program end these rows were worked from, kept here now that CASE_C's moved.
    return with_changes(
        CASE_C,
        program_end_date="2025-05-16",
        opt=card,
        stem=None,
        employment=[job(opt_start, None)],
    )


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
    # SPEC-resolutions.md, point 27: every row starts on or before 2024-05-16, and the
    # card is 12 months less a day, so it ends on or before 2025-05-15, the day before
    # program_end_date 2025-05-16. opt.ead_end.not_after_program_end is raised on every
    # row, and no facts avoid it: a start a year or more before the program end, with a
    # card no longer than 12 months, ends on or before it. So a row without the lookback
    # conflict expects point 27's conflict alone, and a row with it expects a conflict
    # other than point 27's.
    case = opt_card_from(opt_start)
    today = date.fromisoformat(opt_start) + timedelta(days=30)
    out = run(case, today=today, chosen={LOOKBACK: years})
    if conflict:
        assert out["verdict"]["state"] == "cannot_tell"
        assert [r for r in reasons_with(out, "conflict:") if r != POINT_27]
    else:
        assert out["verdict"] == {"state": "cannot_tell", "reasons": [POINT_27]}


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
)
def test_an_item_is_open_from_today_through_the_lookahead_and_on_no_other_day(ahead, offset):
    # stem.evaluation_12_month_due (EVALUATION_DUE, 2026-11-11) falls offset days from
    # today. today runs from 2026-07-04 to 2026-11-21, after every date CASE_C records
    # (the last, the STEM filing, is 2026-05-20), so no date entered is after today.
    today = EVALUATION_DUE - timedelta(days=offset)
    out = run(CASE_C, today=today, rules=SHORT_INTERVAL, chosen={LOOKAHEAD: ahead})
    assert values(out)["stem.evaluation_12_month_due"] == EVALUATION_DUE.isoformat()
    reasons = out["verdict"]["reasons"]
    assert ("stem.evaluation_12_month_due" in reasons) == (0 <= offset <= ahead)


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
    # CASE_C moved whole by the days from 2026-08-01 to start, so that the OPT card still
    # ends the day before the STEM card begins and each card keeps its length: a STEM
    # card that begins later alone leaves a gap after OPT, a conflict whose dates give
    # nulls (specs/product-1/SPEC.md, section 1; SPEC-resolutions.md, point 4). The last
    # date moved, the STEM filing, is at most 2026-05-20 plus 91 days, before TODAY.
    case = moved(CASE_C, (start - date(2026, 8, 1)).days)
    assert case["stem"]["ead_start"] == start.isoformat()
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
    out = run(with_extension_of(interval * reports), rules=rules)
    assert validation_ids(out) == {f"stem.validation_{n}_due" for n in range(1, reports + 1)}
    got = values(out)
    for n in range(1, reports + 1):
        reached = months_later(date(2026, 8, 1), interval * n)
        due = date.fromisoformat(got[f"stem.validation_{n}_due"])
        # Counted from a Sunday, ten business days end on the Friday 12 days on.
        assert reached + timedelta(days=12) <= due <= reached + timedelta(days=21), n
        assert due.weekday() < 5, n
