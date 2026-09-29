"""engine/f1.py: parse_case and compute_f1.

Specified in specs/phase-2/SPEC.md, "The engine": "Files", "Rules of the house",
"Computed items", "Counting days", "Cap-gap", and "Verdict inputs". The shape of the
output is contracts/engine_output.schema.json. The shape of a case is
contracts/case_f1.schema.json.

Every expected date and count was worked out by hand. The working is beside it.
Dates in the output are ISO strings, as in the contracts.

Where the SPEC leaves a point open, the tests here do not take a side. The open points
are listed in tests/PROGRESS.md under "Questions".
"""

import dataclasses
from datetime import date, timedelta
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
    STATUS_ORDER,
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
    months_later,
    pack_dict,
    reasons_with,
    rule_statuses,
    rule_value,
    values,
    weakest,
    with_block,
    with_changes,
)

TODAY = date(2026, 9, 28)  # a Monday


def run(
    case: dict[str, Any],
    today: date = TODAY,
    checked_on: date | None = None,
    **pack_changes: Any,
) -> dict[str, Any]:
    """Compute a case on a fixed day. The pack was checked that day unless told otherwise."""
    assert case_problems(case) == [], "the test case itself must match the case contract"
    pack = build_pack(checked_on or today, **pack_changes)
    return f1.compute_f1(f1.parse_case(case), pack, clock_on(today))


# Case A: post-completion OPT, no STEM, no cap-gap.
CASE_A: dict[str, Any] = {
    "program_end_date": "2026-05-15",
    "time_zone": TIME_ZONE,
    "confirmations": answered_yes(),
    "degree_level": "master",
    "documents_count": 3,
    "cpt_full_time_days": 0,
    "opt": ead("2026-03-02", "2026-03-10", "2026-06-01", "2027-05-31"),
    "stem": None,
    "employment": [job("2026-07-01", None)],
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
    "employment": [
        job("2024-07-01", "2025-12-31"),
        job("2026-01-11", None, reported=False),
    ],
    "cap_gap": cap_gap("2026-10-01", petition_filed_on="2026-04-02"),
}

ALL_IDS = {
    "opt.apply_window_opens",
    "opt.apply_window_closes",
    "opt.file_by",
    "opt.latest_start",
    "opt.complete_by",
    "unemployment.limit",
    "unemployment.days_used",
    "unemployment.days_remaining",
    "employment.days_under_hours",
    "employment.periods_not_reported",
    "grace.ends",
    "stem.apply_window_opens",
    "stem.apply_window_closes",
    "stem.file_by",
    "stem.validation_1_due",
    "stem.validation_2_due",
    "stem.validation_3_due",
    "stem.validation_4_due",
    "stem.evaluation_12_month_due",
    "stem.final_evaluation_due_from_ead_end",
    "cpt.full_time_days_used",
    "capgap.ends",
}

UNITS = {
    "unemployment.limit": "days",
    "unemployment.days_used": "days",
    "unemployment.days_remaining": "days",
    "employment.days_under_hours": "days",
    "employment.periods_not_reported": "count",
    "cpt.full_time_days_used": "days",
}


# parse_case


def test_parse_case_gives_a_frozen_case_that_mirrors_the_contract():
    # SPEC, "Files": F1Case and friends as frozen dataclasses mirroring the case contract.
    case = f1.parse_case(CASE_B)
    assert isinstance(case, f1.F1Case)
    assert dataclasses.is_dataclass(case)
    assert case.program_end_date == date(2024, 5, 10)
    assert case.degree_level == "master"
    assert case.documents_count == 5
    assert case.cpt_full_time_days == 100
    assert case.opt.dso_recommendation_date == date(2024, 3, 1)
    assert case.opt.i765_filed_date == date(2024, 3, 15)
    assert case.opt.ead_start == date(2024, 7, 1)
    assert case.opt.ead_end == date(2025, 6, 30)
    assert case.stem.ead_start == date(2025, 7, 1)
    assert case.stem.ead_end == date(2027, 6, 30)
    assert len(case.employment) == 2
    assert case.employment[0].start == date(2024, 7, 1)
    assert case.employment[0].end == date(2025, 12, 31)
    assert case.employment[0].hours_per_week == 40
    assert case.employment[0].employer_reported is True
    assert case.employment[1].end is None
    assert case.employment[1].employer_reported is False
    assert case.cap_gap.petition_filed_on == date(2026, 4, 2)
    assert case.cap_gap.requested_start == date(2026, 10, 1)
    assert case.cap_gap.change_of_status is True
    assert case.cap_gap.status == "pending"


def test_parse_case_cannot_be_changed_afterwards():
    case = f1.parse_case(CASE_B)
    with pytest.raises(dataclasses.FrozenInstanceError):
        case.documents_count = 0
    with pytest.raises(dataclasses.FrozenInstanceError):
        case.opt.ead_start = date(2020, 1, 1)
    with pytest.raises(dataclasses.FrozenInstanceError):
        case.employment[0].hours_per_week = 1


def test_parse_case_fills_what_the_contract_lets_a_case_leave_out():
    # The contract requires five fields. cpt_full_time_days defaults to 0 there.
    case = f1.parse_case(
        {
            "program_end_date": "2026-05-15",
            "time_zone": TIME_ZONE,
            "degree_level": "bachelor",
            "documents_count": 1,
            "employment": [],
        }
    )
    assert case.cpt_full_time_days == 0
    assert case.opt is None
    assert case.stem is None
    assert case.cap_gap is None
    assert len(case.employment) == 0


def test_parse_case_keeps_a_missing_date_missing():
    # SPEC, "Rules of the house": never guess a date.
    case = f1.parse_case(with_block(CASE_A, "opt", ead_start=None, ead_end=None))
    assert case.opt.ead_start is None
    assert case.opt.ead_end is None


# Golden case A


def test_case_a_every_value():
    got = values(run(CASE_A))
    # program_end_date 2026-05-15 minus 90 days: back 15 to Apr 30, back 30 to Mar 31
    # (45), back 31 to Feb 28 (76), back 14 to Feb 14 (90).
    assert got["opt.apply_window_opens"] == "2026-02-14"
    # 2026-05-15 plus 60 days: 16 to May 31, 30 to Jun 30 (46), 14 to Jul 14 (60).
    assert got["opt.apply_window_closes"] == "2026-07-14"
    # The same formula as the window's close.
    assert got["opt.latest_start"] == "2026-07-14"
    # Recommendation 2026-03-02 plus 30 days: 29 to Mar 31, 1 to Apr 1.
    assert got["opt.file_by"] == "2026-04-01"
    # May 2026 plus 14 months: 12 to May 2027, 2 to July 2027. The 15th exists.
    assert got["opt.complete_by"] == "2027-07-15"
    # No STEM block, so the OPT limit applies.
    assert got["unemployment.limit"] == 90
    # Window 2026-06-01 through today 2026-09-28 (today is before the EAD end):
    # 30 + 31 + 31 + 28 = 120 days. The one period runs Jul 1 through today:
    # 31 + 31 + 28 = 90 days. Uncovered: June, 30 days.
    assert got["unemployment.days_used"] == 30
    # 90 minus 30.
    assert got["unemployment.days_remaining"] == 60
    # The period is 40 hours a week, above the 20 hour threshold.
    assert got["employment.days_under_hours"] == 0
    assert got["employment.periods_not_reported"] == 0
    # final_end is the latest of 2026-05-15 and 2027-05-31. Plus 60 days: 30 to Jun 30,
    # 30 to Jul 30.
    assert got["grace.ends"] == "2027-07-30"
    assert got["cpt.full_time_days_used"] == 0


def test_case_a_verdict_and_scope():
    out = run(CASE_A)
    # Documents present, nothing missing or conflicting, rules checked today, today is
    # not after final_end, no judgement item, nothing unreported, and no dated item falls
    # from 2026-09-28 through 2026-10-12.
    assert out["verdict"] == {"state": "no_open_items", "reasons": []}
    assert out["scope"] == {"documents_count": 3, "rules_checked_on": "2026-09-28"}
    assert out["rulepacks"] == [{"category": "f1", "version": "v2026.09"}]


def test_case_a_grace_carries_the_blocked_regime_as_an_alternate():
    # SPEC, "Rules of the house": where a rule has a second regime, the item carries
    # alternates with the value under each regime that is not operative.
    grace = items(run(CASE_A))["grace.ends"]
    # 2027-05-31 plus 30 days: 30 to Jun 30.
    assert grace["alternates"] == [
        {"regime": BLOCKED, "legal_status": "enjoined", "value": "2027-06-30"}
    ]
    assert grace["status"] == "litigated"
    assert "grace.after_completion_days" in grace["rule_ids"]


def test_case_a_leaves_out_the_parts_that_are_absent():
    # SPEC, "Computed items": items for an absent part are left out, not returned as null.
    got = items(run(CASE_A))
    for item_id in (
        "stem.file_by",
        "stem.validation_1_due",
        "stem.validation_2_due",
        "stem.validation_3_due",
        "stem.validation_4_due",
        "stem.evaluation_12_month_due",
        "stem.final_evaluation_due_from_ead_end",
        "capgap.ends",
    ):
        assert item_id not in got


def test_case_a_stem_window_is_right_wherever_it_is_shown():
    # These two items carry the stem name but are computed from opt.ead_end. The SPEC does
    # not say whether they are shown when the stem block is absent. If shown, they must
    # be right.
    got = values(run(CASE_A))
    # opt.ead_end 2027-05-31 minus 90 days: back 31 to Apr 30, back 30 to Mar 31 (61),
    # back 29 to Mar 2 (90).
    assert got.get("stem.apply_window_opens", "2027-03-02") == "2027-03-02"
    assert got.get("stem.apply_window_closes", "2027-05-31") == "2027-05-31"


def test_case_without_opt_leaves_out_what_needs_the_opt_block():
    case = with_changes(CASE_A, opt=None, employment=[])
    got = items(run(case))
    assert "opt.file_by" not in got
    assert "stem.apply_window_opens" not in got
    assert "stem.apply_window_closes" not in got
    assert "stem.file_by" not in got
    assert "capgap.ends" not in got
    # final_end is program_end_date alone. 2026-05-15 plus 60 days is 2026-07-14.
    assert got["grace.ends"]["value"] == "2026-07-14"
    # Plus 30 days under the blocked regime: 16 to May 31, 14 to Jun 14.
    assert got["grace.ends"]["alternates"][0]["value"] == "2026-06-14"
    assert got["cpt.full_time_days_used"]["value"] == 0
    # No item is ever returned as null for a part that is absent.
    assert all(item["value"] is not None for item in got.values())


def test_case_a_under_a_pack_with_other_numbers():
    # SPEC, "Rules of the house": every number comes from the pack by id.
    got = items(run(CASE_A, values=SHIFTED))
    # 91 days before 2026-05-15: one day before Feb 14.
    assert got["opt.apply_window_opens"]["value"] == "2026-02-13"
    # 61 days after: one day after Jul 14.
    assert got["opt.apply_window_closes"]["value"] == "2026-07-15"
    assert got["opt.latest_start"]["value"] == "2026-07-15"
    # 31 days after 2026-03-02: one day after Apr 1.
    assert got["opt.file_by"]["value"] == "2026-04-02"
    # 15 months after May 2026 is August 2027.
    assert got["opt.complete_by"]["value"] == "2027-08-15"
    assert got["unemployment.limit"]["value"] == 89
    # The days used do not depend on a rule: June is still uncovered, 30 days.
    assert got["unemployment.days_used"]["value"] == 30
    # 89 minus 30.
    assert got["unemployment.days_remaining"]["value"] == 59
    # 40 hours is still above the shifted threshold of 21.
    assert got["employment.days_under_hours"]["value"] == 0
    # 61 days after 2027-05-31: 30 to Jun 30, 31 to Jul 31.
    assert got["grace.ends"]["value"] == "2027-07-31"
    # 29 days after 2027-05-31 is Jun 29.
    assert got["grace.ends"]["alternates"] == [
        {"regime": BLOCKED, "legal_status": "enjoined", "value": "2027-06-29"}
    ]


# Golden case B


def test_case_b_has_every_item_once():
    assert set(items(run(CASE_B))) == ALL_IDS


def test_case_b_opt_values():
    got = values(run(CASE_B))
    # 2024-05-10 minus 90 days: back 10 to Apr 30, back 30 to Mar 31 (40), back 31 to
    # Feb 29 (71, 2024 is a leap year), back 19 to Feb 10 (90).
    assert got["opt.apply_window_opens"] == "2024-02-10"
    # 2024-05-10 plus 60 days: 21 to May 31, 30 to Jun 30 (51), 9 to Jul 9 (60).
    assert got["opt.apply_window_closes"] == "2024-07-09"
    assert got["opt.latest_start"] == "2024-07-09"
    # 2024-03-01 plus 30 days: Mar 31.
    assert got["opt.file_by"] == "2024-03-31"
    # May 2024 plus 14 months is July 2025.
    assert got["opt.complete_by"] == "2025-07-10"
    assert got["cpt.full_time_days_used"] == 100


def test_case_b_stem_values():
    got = values(run(CASE_B))
    # opt.ead_end 2025-06-30 minus 90 days: back 30 to May 31, back 31 to Apr 30 (61),
    # back 29 to Apr 1 (90).
    assert got["stem.apply_window_opens"] == "2025-04-01"
    assert got["stem.apply_window_closes"] == "2025-06-30"
    # Recommendation 2025-04-15 plus 60 days: 15 to Apr 30, 31 to May 31 (46),
    # 14 to Jun 14 (60).
    assert got["stem.file_by"] == "2025-06-14"
    # stem.ead_start 2025-07-01 plus 6 months is Thursday 2026-01-01. Ten business days
    # after it: Jan 2 (1), 5 (2), 6 (3), 7 (4), 8 (5), 9 (6), 12 (7), 13 (8), 14 (9),
    # 15 (10).
    assert got["stem.validation_1_due"] == "2026-01-15"
    # Plus 12 months is Wednesday 2026-07-01. Jul 2 (1), Friday Jul 3 is Independence Day
    # observed, Jul 6 (2), 7 (3), 8 (4), 9 (5), 10 (6), 13 (7), 14 (8), 15 (9), 16 (10).
    assert got["stem.validation_2_due"] == "2026-07-16"
    # Plus 18 months is Friday 2027-01-01. Jan 4 (1), 5 (2), 6 (3), 7 (4), 8 (5), 11 (6),
    # 12 (7), 13 (8), 14 (9), 15 (10). The holiday on Monday Jan 18 is not reached.
    assert got["stem.validation_3_due"] == "2027-01-15"
    # Plus 24 months is Thursday 2027-07-01. Jul 2 (1), Monday Jul 5 is Independence Day
    # observed, Jul 6 (2), 7 (3), 8 (4), 9 (5), 12 (6), 13 (7), 14 (8), 15 (9), 16 (10).
    assert got["stem.validation_4_due"] == "2027-07-16"
    # 2025-07-01 plus 12 months is 2026-07-01, plus 10 calendar days.
    assert got["stem.evaluation_12_month_due"] == "2026-07-11"
    # stem.ead_end 2027-06-30 plus 10 days.
    assert got["stem.final_evaluation_due_from_ead_end"] == "2027-07-10"


def test_case_b_counts_and_grace():
    out = run(CASE_B)
    got = values(out)
    # Today 2026-09-28 is on or after stem.ead_start 2025-07-01.
    assert got["unemployment.limit"] == 150
    # Window 2024-07-01 through 2026-09-28. The periods leave 2026-01-01 through
    # 2026-01-10 uncovered: 10 days.
    assert got["unemployment.days_used"] == 10
    # 150 minus 10.
    assert got["unemployment.days_remaining"] == 140
    assert got["employment.days_under_hours"] == 0
    # The second period has employer_reported false.
    assert got["employment.periods_not_reported"] == 1
    # final_end is stem.ead_end 2027-06-30. Plus 60 days: 31 to Jul 31, 29 to Aug 29.
    assert got["grace.ends"] == "2027-08-29"
    # Plus 30 days: Jul 30.
    assert items(out)["grace.ends"]["alternates"] == [
        {"regime": BLOCKED, "legal_status": "enjoined", "value": "2027-07-30"}
    ]
    # requested_start 2026-10-01 is in October, so April 1 falls in 2027. The earlier of
    # 2026-10-01 and 2027-04-01.
    assert got["capgap.ends"] == "2026-10-01"


def test_case_b_verdict_names_the_unreported_employer():
    out = run(CASE_B)
    # Nothing blocks and no judgement item applies: cpt 100 is under 365, days remaining
    # 140, no day under hours, and the petition is pending with a change of status.
    # No item whose id ends in _due, file_by, or window_closes falls from 2026-09-28
    # through 2026-10-12. capgap.ends does, but its id has none of those endings.
    assert out["verdict"] == {"state": "needs_you", "reasons": ["report_employer"]}
    assert out["scope"] == {"documents_count": 5, "rules_checked_on": "2026-09-28"}


def test_case_b_under_a_pack_with_other_numbers():
    got = values(run(CASE_B, values=SHIFTED))
    # 92 days before 2025-06-30: two days before Apr 1.
    assert got["stem.apply_window_opens"] == "2025-03-30"
    assert got["stem.apply_window_closes"] == "2025-06-30"
    # 59 days after 2025-04-15: one day before Jun 14.
    assert got["stem.file_by"] == "2025-06-13"
    # Eleven business days: one business day after each of the ten-day answers.
    # Thursday 2026-01-15 to Friday Jan 16.
    assert got["stem.validation_1_due"] == "2026-01-16"
    # Thursday 2026-07-16 to Friday Jul 17.
    assert got["stem.validation_2_due"] == "2026-07-17"
    # Friday 2027-01-15, weekend, Monday Jan 18 is the holiday, Tuesday Jan 19.
    assert got["stem.validation_3_due"] == "2027-01-19"
    # Friday 2027-07-16, weekend, Monday Jul 19.
    assert got["stem.validation_4_due"] == "2027-07-19"
    # 2026-07-01 plus 9 days.
    assert got["stem.evaluation_12_month_due"] == "2026-07-10"
    # 2027-06-30 plus 9 days.
    assert got["stem.final_evaluation_due_from_ead_end"] == "2027-07-09"
    assert got["unemployment.limit"] == 151
    # 151 minus 10.
    assert got["unemployment.days_remaining"] == 141
    # 61 days after 2027-06-30: 31 to Jul 31, 30 to Aug 30.
    assert got["grace.ends"] == "2027-08-30"
    # The shifted month and day is 05-15. requested_start 2026-10-01 is in October, so
    # the date falls in 2027. The earlier of 2026-10-01 and 2027-05-15.
    assert got["capgap.ends"] == "2026-10-01"


# Shape, rule ids, sources, status


@pytest.mark.parametrize("case", [CASE_A, CASE_B], ids=["case_a", "case_b"])
def test_output_matches_the_contract(case):
    assert contract_problems(run(case)) == []


@pytest.mark.parametrize("case", [CASE_A, CASE_B], ids=["case_a", "case_b"])
def test_dated_items_carry_the_date_unit_and_counts_carry_theirs(case):
    for item_id, item in items(run(case)).items():
        assert item["unit"] == UNITS.get(item_id, "date"), item_id


@pytest.mark.parametrize("case", [CASE_A, CASE_B], ids=["case_a", "case_b"])
def test_every_item_names_rules_that_exist_in_the_pack(case):
    raw = pack_dict(TODAY)
    known = {p["id"] for p in raw["parameters"]}
    out = run(case)
    for item_id, item in items(out).items():
        assert item["rule_ids"], item_id
        assert set(item["rule_ids"]) <= known, item_id
        # The contract: rules holds every rule named in computed, keyed by id.
        assert set(item["rule_ids"]) <= set(out["rules"]), item_id


@pytest.mark.parametrize("case", [CASE_A, CASE_B], ids=["case_a", "case_b"])
def test_every_rule_shown_is_the_pack_rule_word_for_word(case):
    raw = pack_dict(TODAY)
    out = run(case)
    assert out["rules"], "a case with computed items shows its rules"
    for rule_id, shown in out["rules"].items():
        regime = OPERATIVE if rule_id == "grace.after_completion_days" else ""
        source = next(
            p for p in raw["parameters"] if p["id"] == rule_id and p.get("regime", "") == regime
        )
        assert shown["value"] == source["value"], rule_id
        assert shown["unit"] == source["unit"], rule_id
        assert shown["status"] == source["status"], rule_id
        assert shown["citation"] == source["source"]["citation"], rule_id
        assert shown["url"] == source["source"]["url"], rule_id
        assert shown["checked_on"] == source["source"]["checked_on"], rule_id
        assert shown.get("quote") == source["source"]["quote"], rule_id


def test_the_named_rules_include_the_one_in_the_formula():
    got = items(run(CASE_B))
    expected = {
        "opt.apply_window_opens": "opt.apply_before_days",
        "opt.apply_window_closes": "opt.apply_after_days",
        "opt.file_by": "opt.file_within_days_of_recommendation",
        # specs/phase-2/SPEC-fixes.md, "Finding 5": the start date has its own rule.
        "opt.latest_start": "opt.latest_start_after_days",
        "opt.complete_by": "opt.complete_within_months",
        "unemployment.limit": "stem.unemployment_limit_days",
        "grace.ends": "grace.after_completion_days",
        "stem.apply_window_opens": "stem.apply_before_expiry_days",
        "stem.file_by": "stem.file_within_days_of_recommendation",
        "stem.validation_1_due": "stem.validation_due_business_days",
        "stem.validation_4_due": "stem.validation_due_business_days",
        "stem.evaluation_12_month_due": "stem.evaluation_due_days",
        "stem.final_evaluation_due_from_ead_end": "stem.evaluation_due_days",
        "capgap.ends": "capgap.end_month_day",
    }
    for item_id, rule_id in expected.items():
        assert rule_id in got[item_id]["rule_ids"], item_id


def test_the_limit_names_the_opt_rule_when_the_opt_limit_applies():
    limit = items(run(CASE_A))["unemployment.limit"]
    assert "opt.unemployment_limit_days" in limit["rule_ids"]


@pytest.mark.parametrize("case", [CASE_A, CASE_B], ids=["case_a", "case_b"])
def test_every_item_names_the_inputs_it_used(case):
    # SPEC, "Rules of the house": every computed item names the inputs it used.
    for item_id, item in items(run(case)).items():
        assert isinstance(item["inputs"], dict), item_id
        assert item["inputs"], item_id


@pytest.mark.parametrize("status", STATUS_ORDER)
def test_an_item_with_one_rule_takes_that_rules_status(status):
    out = run(CASE_A, statuses={"opt.complete_within_months": status})
    item = items(out)["opt.complete_by"]
    assert item["rule_ids"] == ["opt.complete_within_months"]
    assert item["status"] == status


@pytest.mark.parametrize("shift", range(len(STATUS_ORDER)))
@pytest.mark.parametrize("case", [CASE_A, CASE_B], ids=["case_a", "case_b"])
def test_an_items_status_is_the_weakest_among_its_rules(case, shift):
    # SPEC, "Rules of the house": from strongest: settled, guidance, school, litigated,
    # proposed. Each run deals the five statuses across the rules in a different order.
    ids = sorted({p["id"] for p in pack_dict(TODAY)["parameters"]})
    statuses = {
        rule_id: STATUS_ORDER[(index + shift) % len(STATUS_ORDER)]
        for index, rule_id in enumerate(ids)
    }
    found = rule_statuses(pack_dict(TODAY, statuses=statuses))
    for item_id, item in items(run(case, statuses=statuses)).items():
        used = [s for rule_id in item["rule_ids"] for s in found[rule_id]]
        assert item["status"] == weakest(used), item_id


def test_weakest_status_pairs_in_the_order_the_spec_gives():
    # Guards the helper the test above leans on.
    assert weakest(["settled", "guidance"]) == "guidance"
    assert weakest(["guidance", "school"]) == "school"
    assert weakest(["school", "litigated"]) == "litigated"
    assert weakest(["litigated", "proposed"]) == "proposed"
    assert weakest(["proposed", "settled", "school"]) == "proposed"


def test_same_inputs_same_output():
    assert run(CASE_B) == run(CASE_B)


def test_the_clock_is_the_only_source_of_today():
    # CLAUDE.md: read the time only through engine.clocks. Two fixed days far from the
    # day the tests run give the answers for those days.
    # Window from 2026-06-01. Through 2026-06-10 is 10 days, through 2026-06-20 is 20.
    case = with_changes(CASE_A, employment=[])
    assert values(run(case, today=date(2026, 6, 10)))["unemployment.days_used"] == 10
    assert values(run(case, today=date(2026, 6, 20)))["unemployment.days_used"] == 20


# Counting days: boundaries


def count_a(employment: list[dict[str, Any]], today: date = TODAY, **more: Any):
    got = values(run(with_changes(CASE_A, employment=employment), today=today, **more))
    return got["unemployment.days_used"], got["employment.days_under_hours"]


def test_no_employment_every_day_in_the_window_is_used():
    # 2026-06-01 through 2026-09-28: 30 + 31 + 31 + 28 = 120.
    assert count_a([]) == (120, 0)


@pytest.mark.parametrize(
    ("today", "used"),
    [
        (date(2026, 5, 31), 0),  # the day before the EAD starts: the window is empty
        (date(2026, 6, 1), 1),  # the first day is counted
        (date(2026, 6, 2), 2),
        # Through 2027-05-30: 365 days from 2026-06-01 through 2027-05-31, less one.
        (date(2027, 5, 30), 364),
        (date(2027, 5, 31), 365),  # the last EAD day is counted
        (date(2027, 6, 1), 365),  # the window stops at the EAD end
        (date(2027, 6, 15), 365),
    ],
)
def test_window_runs_from_ead_start_through_the_earlier_of_today_and_ead_end(today, used):
    got = values(run(with_changes(CASE_A, employment=[]), today=today))
    assert got["unemployment.days_used"] == used
    assert got["employment.days_under_hours"] == 0
    assert got["unemployment.days_remaining"] == 90 - used


@pytest.mark.parametrize(
    ("start", "end", "used"),
    [
        ("2026-06-01", None, 0),  # starts on the first window day
        ("2026-06-02", None, 1),  # starts the day after: Jun 1 is uncovered
        ("2026-05-01", None, 0),  # starts before the window
        ("2026-05-01", "2026-05-31", 120),  # ends the day before the window
        ("2026-05-01", "2026-06-01", 119),  # ends on the first window day, which it covers
        ("2026-05-01", "2026-06-02", 118),
        # Covers June: 120 less 30.
        ("2026-06-01", "2026-06-30", 90),
        ("2026-09-28", "2026-09-28", 119),  # a one-day period today
        ("2026-09-27", "2026-09-27", 119),  # a one-day period yesterday
        ("2026-09-29", "2026-10-31", 120),  # starts tomorrow: outside the window
        ("2026-09-20", "2026-10-31", 111),  # runs past today: covers Sep 20 through 28, 9 days
    ],
)
def test_a_period_covers_its_first_and_last_day(start, end, used):
    assert count_a([job(start, end)]) == (used, 0)


@pytest.mark.parametrize(
    ("hours", "used", "under"),
    [
        (19.5, 90, 30),  # under the 20 hour threshold: June is under hours, not used
        (20, 90, 0),  # at the threshold counts as employed
        (20.5, 90, 0),
        (0, 90, 30),  # a period of zero hours still covers its days
    ],
)
def test_hours_at_or_above_the_threshold_make_a_day_employed(hours, used, under):
    assert count_a([job("2026-06-01", "2026-06-30", hours=hours)]) == (used, under)


def test_a_day_covered_by_both_kinds_of_period_is_employed():
    # Jun 1 through Jun 30 at 10 hours. Jun 16 through Jul 15 at 40 hours.
    # Under hours only: Jun 1 through Jun 15, 15 days.
    # Employed: Jun 16 through Jul 15, 15 + 15 = 30 days.
    # Used: 120 less 15 less 30 = 75.
    jobs = [job("2026-06-01", "2026-06-30", hours=10), job("2026-06-16", "2026-07-15")]
    assert count_a(jobs) == (75, 15)


def test_two_part_time_periods_on_one_day_are_not_added_together():
    # SPEC: a day is employed if an employment period with hours at or above the
    # threshold covers it. Two periods of 10 hours are two periods under the threshold.
    jobs = [
        job("2026-06-01", "2026-06-30", hours=10),
        job("2026-06-01", "2026-06-30", hours=10),
    ]
    assert count_a(jobs) == (90, 30)


def test_days_under_hours_are_not_added_to_days_used():
    got = values(run(with_changes(CASE_A, employment=[job("2026-06-01", None, hours=10)])))
    # All 120 window days are covered by a period under the threshold.
    assert got["employment.days_under_hours"] == 120
    assert got["unemployment.days_used"] == 0
    assert got["unemployment.days_remaining"] == 90


def test_the_opt_threshold_comes_from_the_pack():
    # The shifted pack sets opt.min_hours_per_week to 21.
    jobs = [job("2026-06-01", "2026-06-30", hours=20)]
    assert count_a(jobs) == (90, 0)
    assert count_a(jobs, values=SHIFTED) == (90, 30)


def test_the_stem_threshold_applies_from_stem_ead_start():
    # The shifted pack sets the threshold to 21 before stem.ead_start and 25 from it.
    # A 22 hour period runs 2025-06-21 through 2025-07-10. Jun 21 through Jun 30 is
    # before stem.ead_start 2025-07-01: 10 days employed. Jul 1 through Jul 10 is on or
    # after it: 10 days under hours. Full-time periods cover every other day.
    jobs = [
        job("2024-07-01", "2025-06-20"),
        job("2025-06-21", "2025-07-10", hours=22),
        job("2025-07-11", None),
    ]
    case = with_changes(CASE_B, employment=jobs)
    shifted = values(run(case, values=SHIFTED))
    assert shifted["employment.days_under_hours"] == 10
    assert shifted["unemployment.days_used"] == 0
    # Under the SPEC values both thresholds are 20, so no day is under hours.
    plain = values(run(case))
    assert plain["employment.days_under_hours"] == 0
    assert plain["unemployment.days_used"] == 0


def test_the_window_runs_on_through_the_stem_ead():
    # Case B, no employment, today 2026-09-28. 2024-07-01 through 2025-06-30 is 365 days,
    # 2025-07-01 through 2026-06-30 is 365, then 31 + 31 + 28 = 90. Total 820.
    got = values(run(with_changes(CASE_B, employment=[])))
    assert got["unemployment.days_used"] == 820
    # 150 minus 820. The SPEC: may be negative.
    assert got["unemployment.days_remaining"] == -670


def test_periods_not_reported_counts_periods_not_days():
    jobs = [
        job("2026-06-01", "2026-06-30", reported=False),
        job("2026-07-01", "2026-07-31", reported=True),
        job("2026-08-01", None, reported=False),
    ]
    got = values(run(with_changes(CASE_A, employment=jobs)))
    assert got["employment.periods_not_reported"] == 2


@pytest.mark.parametrize(
    ("today", "limit"),
    [
        (date(2025, 6, 30), 90),  # the day before stem.ead_start 2025-07-01
        (date(2025, 7, 1), 150),  # the day of
        (date(2025, 7, 2), 150),  # the day after
    ],
)
def test_the_limit_changes_on_stem_ead_start(today, limit):
    case = with_changes(CASE_B, employment=[job("2024-07-01", None)], cap_gap=None)
    got = items(run(case, today=today))
    assert got["unemployment.limit"]["value"] == limit
    assert got["unemployment.days_remaining"]["value"] == limit


def test_cpt_days_are_shown_as_entered():
    got = values(run(with_changes(CASE_A, cpt_full_time_days=217)))
    assert got["cpt.full_time_days_used"] == 217


# Cap-gap


@pytest.mark.parametrize(
    ("requested_start", "expected"),
    [
        # October, November, December: April 1 falls in the next year, so the requested
        # start is the earlier date.
        ("2026-10-01", "2026-10-01"),
        ("2026-11-15", "2026-11-15"),
        ("2026-12-31", "2026-12-31"),
        # January through September: April 1 falls in the same year.
        ("2027-01-01", "2027-01-01"),  # the day after December 31; before April 1
        ("2027-03-31", "2027-03-31"),  # the day before April 1
        ("2027-04-01", "2027-04-01"),  # the day of
        ("2027-04-02", "2027-04-01"),  # the day after: April 1 is earlier
        ("2027-09-30", "2027-04-01"),  # the last day before October
    ],
)
def test_capgap_ends_on_the_earlier_of_the_requested_start_and_april_1(requested_start, expected):
    case = with_changes(CASE_A, cap_gap=cap_gap(requested_start))
    assert values(run(case))["capgap.ends"] == expected


@pytest.mark.parametrize(
    ("requested_start", "expected"),
    [
        # The shifted pack sets the month and day to 05-15.
        ("2027-05-14", "2027-05-14"),
        ("2027-05-15", "2027-05-15"),
        ("2027-05-16", "2027-05-15"),
        ("2027-04-02", "2027-04-02"),
        ("2026-10-01", "2026-10-01"),
    ],
)
def test_capgap_month_and_day_come_from_the_pack(requested_start, expected):
    case = with_changes(CASE_A, cap_gap=cap_gap(requested_start))
    assert values(run(case, values=SHIFTED))["capgap.ends"] == expected


@pytest.mark.parametrize("status", ["pending", "approved"])
def test_capgap_is_computed_for_a_pending_or_approved_change_of_status(status):
    case = with_changes(CASE_A, cap_gap=cap_gap("2027-06-01", status=status))
    out = run(case)
    assert values(out)["capgap.ends"] == "2027-04-01"
    assert "cap_gap_petition_not_active" not in out["verdict"]["reasons"]


@pytest.mark.parametrize(
    ("status", "change_of_status"),
    [
        ("denied", True),
        ("rejected", True),
        ("withdrawn", True),
        ("revoked", True),
        ("pending", False),
        ("approved", False),
        ("denied", False),
    ],
)
def test_capgap_is_null_in_every_other_case_and_goes_to_the_dso(status, change_of_status):
    case = with_changes(
        CASE_A, cap_gap=cap_gap("2027-06-01", status=status, change_of_status=change_of_status)
    )
    out = run(case)
    got = items(out)
    # Present, because the cap_gap block is present, with a null value.
    assert "capgap.ends" in got
    assert got["capgap.ends"]["value"] is None
    assert out["verdict"] == {
        "state": "talk_to_dso",
        "reasons": ["cap_gap_petition_not_active"],
    }


# Verdict inputs


def test_no_documents_cannot_tell():
    out = run(with_changes(CASE_A, documents_count=0))
    assert out["verdict"] == {"state": "cannot_tell", "reasons": ["no_documents"]}
    assert out["scope"]["documents_count"] == 0


@pytest.mark.parametrize(
    ("block", "field"),
    [("opt", "ead_start"), ("opt", "ead_end"), ("stem", "ead_start"), ("stem", "ead_end")],
)
def test_a_missing_ead_date_is_named_and_the_verdict_cannot_tell(block, field):
    case = with_changes(with_block(CASE_B, block, **{field: None}), cap_gap=None)
    out = run(case)
    assert out["verdict"]["state"] == "cannot_tell"
    missing = reasons_with(out, "missing:")
    assert len(missing) == 1
    assert block in missing[0]
    assert field in missing[0]
    assert contract_problems(out) == []


def test_missing_opt_ead_start_gives_null_counts_not_guesses():
    out = run(with_block(CASE_A, "opt", ead_start=None))
    got = items(out)
    # The counting window starts at opt.ead_start. Without it nothing can be counted.
    assert got["unemployment.days_used"]["value"] is None
    assert got["unemployment.days_remaining"]["value"] is None
    assert got["employment.days_under_hours"]["value"] is None
    # Items that do not use the missing date are still computed.
    assert got["opt.apply_window_opens"]["value"] == "2026-02-14"
    assert got["opt.file_by"]["value"] == "2026-04-01"
    assert got["unemployment.limit"]["value"] == 90
    assert got["employment.periods_not_reported"]["value"] == 0
    assert contract_problems(out) == []


def test_missing_stem_ead_start_gives_null_for_what_is_computed_from_it():
    out = run(with_changes(with_block(CASE_B, "stem", ead_start=None), cap_gap=None))
    got = items(out)
    for item_id in (
        "stem.validation_1_due",
        "stem.validation_2_due",
        "stem.validation_3_due",
        "stem.validation_4_due",
        "stem.evaluation_12_month_due",
    ):
        assert got[item_id]["value"] is None, item_id
    # Computed from stem.ead_end, which is present: 2027-06-30 plus 10 days.
    assert got["stem.final_evaluation_due_from_ead_end"]["value"] == "2027-07-10"
    # Computed from the recommendation date, which is present.
    assert got["stem.file_by"]["value"] == "2025-06-14"
    # SPEC: the STEM limit applies if stem.ead_start is present. It is not.
    assert got["unemployment.limit"]["value"] == 90


def test_missing_stem_ead_end_gives_null_for_the_final_evaluation():
    out = run(with_changes(with_block(CASE_B, "stem", ead_end=None), cap_gap=None))
    got = items(out)
    assert got["stem.final_evaluation_due_from_ead_end"]["value"] is None
    # Computed from stem.ead_start, which is present.
    assert got["stem.validation_1_due"]["value"] == "2026-01-15"
    assert got["stem.evaluation_12_month_due"]["value"] == "2026-07-11"


def test_a_missing_recommendation_date_gives_a_null_file_by():
    # specs/phase-2/SPEC-context.md, section 3: the date is needed only while neither a
    # filing date nor an EAD start is recorded. The cases here record neither.
    nothing = ead(None, None, None, None)
    got = items(run(with_changes(CASE_A, opt=nothing)))
    assert got["opt.file_by"]["value"] is None
    stem = items(run(with_changes(CASE_B, stem=nothing)))
    assert stem["stem.file_by"]["value"] is None
    assert stem["opt.file_by"]["value"] == "2024-03-31"


@pytest.mark.parametrize(
    ("case", "conflict"),
    [
        # opt.ead_end one day before opt.ead_start.
        (with_block(CASE_A, "opt", ead_end="2026-05-31"), True),
        # The same day is not before.
        (
            with_changes(
                with_block(CASE_A, "opt", ead_end="2026-06-01"),
                employment=[job("2026-06-01", None)],
            ),
            False,
        ),
        # An employment period that ends the day before it starts.
        (with_changes(CASE_A, employment=[job("2026-07-01", "2026-06-30")]), True),
        # A one-day employment period.
        (
            with_changes(
                CASE_A, employment=[job("2026-06-01", None), job("2026-07-01", "2026-07-01")]
            ),
            False,
        ),
        # program_end_date 2026-05-15 minus 1 year is 2025-05-15.
        # opt.ead_start the day before it.
        (
            with_changes(
                with_block(CASE_A, "opt", ead_start="2025-05-14"),
                employment=[job("2025-05-01", None)],
            ),
            True,
        ),
        # The day of.
        (
            with_changes(
                with_block(CASE_A, "opt", ead_start="2025-05-15"),
                employment=[job("2025-05-01", None)],
            ),
            False,
        ),
        # The day after.
        (
            with_changes(
                with_block(CASE_A, "opt", ead_start="2025-05-16"),
                employment=[job("2025-05-01", None)],
            ),
            False,
        ),
    ],
    ids=[
        "ead_end_before_start",
        "ead_end_on_start",
        "job_end_before_start",
        "job_one_day",
        "opt_start_day_before_year_mark",
        "opt_start_on_year_mark",
        "opt_start_day_after_year_mark",
    ],
)
def test_conflicting_dates_are_named_and_the_verdict_cannot_tell(case, conflict):
    out = run(case)
    if conflict:
        assert out["verdict"]["state"] == "cannot_tell"
        assert reasons_with(out, "conflict:")
    else:
        assert reasons_with(out, "conflict:") == []


@pytest.mark.parametrize(
    ("stem_start", "conflict"),
    [
        ("2025-06-29", True),  # the day before opt.ead_end 2025-06-30
        ("2025-06-30", True),  # on opt.ead_end: the SPEC says on or before
        ("2025-07-01", False),  # the day after
    ],
)
def test_stem_start_on_or_before_opt_end_is_the_conflict_named_stem_start(stem_start, conflict):
    case = with_changes(
        with_block(CASE_B, "stem", ead_start=stem_start),
        employment=[job("2024-07-01", None)],
        cap_gap=None,
    )
    out = run(case)
    if conflict:
        assert out["verdict"]["state"] == "cannot_tell"
        assert "conflict:stem_start" in out["verdict"]["reasons"]
    else:
        assert out["verdict"] == {"state": "no_open_items", "reasons": []}


@pytest.mark.parametrize(
    ("age", "state", "reasons"),
    [
        (6, "no_open_items", []),
        (7, "no_open_items", []),  # seven days old is not yet stale
        (8, "cannot_tell", ["rules_stale"]),
    ],
)
def test_rules_checked_more_than_seven_days_ago_cannot_tell(age, state, reasons):
    checked = TODAY - timedelta(days=age)
    out = run(CASE_A, checked_on=checked)
    assert out["verdict"] == {"state": state, "reasons": reasons}
    assert out["scope"]["rules_checked_on"] == checked.isoformat()


def test_the_oldest_check_among_the_rules_decides():
    raw = pack_dict(TODAY)
    # One rule checked on 2026-09-19, nine days before today. Every other rule today.
    raw["parameters"][5]["source"]["checked_on"] = "2026-09-19"
    out = f1.compute_f1(f1.parse_case(CASE_A), validate_pack(raw), clock_on(TODAY))
    assert out["scope"]["rules_checked_on"] == "2026-09-19"
    assert out["verdict"] == {"state": "cannot_tell", "reasons": ["rules_stale"]}


@pytest.mark.parametrize(
    ("today", "litigated"),
    [
        (date(2027, 5, 30), False),  # the day before final_end 2027-05-31
        (date(2027, 5, 31), False),  # the day of
        (date(2027, 6, 1), True),  # the day after: the two regimes give different answers
        (date(2027, 8, 15), True),
    ],
)
def test_after_final_end_the_verdict_depends_on_a_litigated_rule(today, litigated):
    out = run(CASE_A, today=today)
    if litigated:
        assert out["verdict"]["state"] == "cannot_tell"
        assert "rule_in_litigation" in out["verdict"]["reasons"]
    else:
        assert "rule_in_litigation" not in out["verdict"]["reasons"]
        assert out["verdict"]["state"] != "cannot_tell"


def test_final_end_is_the_latest_of_the_three_dates_present():
    # Case B: program end 2024-05-10, opt.ead_end 2025-06-30, stem.ead_end 2027-06-30.
    # Today 2026-09-28 is after the first two and before the third.
    assert "rule_in_litigation" not in run(CASE_B)["verdict"]["reasons"]
    # Without the STEM block the latest is opt.ead_end, and today is after it.
    no_stem = with_changes(CASE_B, stem=None, cap_gap=None)
    out = run(no_stem)
    assert "rule_in_litigation" in out["verdict"]["reasons"]
    # 2025-06-30 plus 60 days: 31 to Jul 31, 29 to Aug 29.
    assert values(out)["grace.ends"] == "2025-08-29"


@pytest.mark.parametrize(
    ("today", "used", "remaining", "state", "reasons"),
    [
        # No employment. Window from 2026-06-01: 30 in June, 31 in July, then August.
        # Through Aug 28: 30 + 31 + 28 = 89.
        (date(2026, 8, 28), 89, 1, "no_open_items", []),
        (date(2026, 8, 29), 90, 0, "talk_to_dso", ["unemployment_at_or_over_limit"]),
        (date(2026, 8, 30), 91, -1, "talk_to_dso", ["unemployment_at_or_over_limit"]),
    ],
)
def test_unemployment_at_or_over_the_limit_goes_to_the_dso(today, used, remaining, state, reasons):
    out = run(with_changes(CASE_A, employment=[]), today=today)
    got = values(out)
    assert got["unemployment.days_used"] == used
    assert got["unemployment.days_remaining"] == remaining
    assert out["verdict"] == {"state": state, "reasons": reasons}


@pytest.mark.parametrize(
    ("days", "state", "reasons"),
    [
        (364, "no_open_items", []),
        (365, "talk_to_dso", ["cpt_full_time_at_or_over_bar"]),
        (366, "talk_to_dso", ["cpt_full_time_at_or_over_bar"]),
    ],
)
def test_full_time_cpt_at_or_over_the_bar_goes_to_the_dso(days, state, reasons):
    out = run(with_changes(CASE_A, cpt_full_time_days=days, employment=[job("2026-06-01", None)]))
    assert values(out)["cpt.full_time_days_used"] == days
    assert out["verdict"] == {"state": state, "reasons": reasons}


@pytest.mark.parametrize(
    ("hours", "state", "reasons"),
    [
        (19.5, "talk_to_dso", ["hours_under_threshold"]),
        (20, "no_open_items", []),
    ],
)
def test_days_under_hours_go_to_the_dso(hours, state, reasons):
    out = run(with_changes(CASE_A, employment=[job("2026-06-01", None, hours=hours)]))
    assert out["verdict"] == {"state": state, "reasons": reasons}


def test_every_judgement_item_that_applies_is_named():
    case = with_changes(
        CASE_A,
        cpt_full_time_days=400,
        employment=[job("2026-06-01", "2026-06-10", hours=10)],
        cap_gap=cap_gap("2027-06-01", status="denied"),
    )
    out = run(case)
    got = values(out)
    # Jun 1 through Jun 10 under hours: 10 days. The other 110 window days are uncovered.
    assert got["employment.days_under_hours"] == 10
    assert got["unemployment.days_used"] == 110
    # 90 minus 110.
    assert got["unemployment.days_remaining"] == -20
    assert out["verdict"]["state"] == "talk_to_dso"
    assert set(out["verdict"]["reasons"]) == {
        "hours_under_threshold",
        "unemployment_at_or_over_limit",
        "cpt_full_time_at_or_over_bar",
        "cap_gap_petition_not_active",
    }


def test_a_judgement_item_wins_over_an_open_item():
    jobs = [job("2026-06-01", None, hours=10, reported=False)]
    out = run(with_changes(CASE_A, employment=jobs))
    assert out["verdict"] == {"state": "talk_to_dso", "reasons": ["hours_under_threshold"]}


def test_not_knowing_wins_over_a_judgement_item():
    out = run(with_changes(CASE_A, documents_count=0, cpt_full_time_days=400))
    assert out["verdict"] == {"state": "cannot_tell", "reasons": ["no_documents"]}


@pytest.mark.parametrize(
    ("recommended", "file_by", "open_item"),
    [
        # file_by is the recommendation date plus 30 days. Today is 2026-09-28.
        # Aug 28 plus 30: 3 to Aug 31, 27 to Sep 27. The day before today.
        ("2026-08-28", "2026-09-27", False),
        # Aug 29 plus 30: Sep 28. Today.
        ("2026-08-29", "2026-09-28", True),
        # Aug 30 plus 30: Sep 29. Tomorrow.
        ("2026-08-30", "2026-09-29", True),
        # Sep 12 plus 30: 18 to Sep 30, 12 to Oct 12. Today plus 14 days.
        ("2026-09-12", "2026-10-12", True),
        # Sep 13 plus 30: Oct 13. Today plus 15 days.
        ("2026-09-13", "2026-10-13", False),
    ],
)
def test_a_dated_item_from_today_through_14_days_on_is_an_open_item(
    recommended, file_by, open_item
):
    out = run(with_block(CASE_A, "opt", dso_recommendation_date=recommended))
    assert values(out)["opt.file_by"] == file_by
    if open_item:
        assert out["verdict"] == {"state": "needs_you", "reasons": ["opt.file_by"]}
    else:
        assert out["verdict"] == {"state": "no_open_items", "reasons": []}


def test_a_window_that_closes_soon_is_an_open_item_but_latest_start_is_not():
    # program_end_date 2026-08-01 plus 60 days: 30 to Aug 31, 30 to Sep 30. Two days on.
    # opt.latest_start falls on the same day, but its id does not end in _due, file_by,
    # or window_closes.
    out = run(with_changes(CASE_A, program_end_date="2026-08-01"))
    got = values(out)
    assert got["opt.apply_window_closes"] == "2026-09-30"
    assert got["opt.latest_start"] == "2026-09-30"
    assert out["verdict"] == {"state": "needs_you", "reasons": ["opt.apply_window_closes"]}


def test_a_validation_report_due_soon_is_an_open_item():
    # Case B on 2026-07-06. stem.validation_2_due is 2026-07-16, ten days on.
    # stem.evaluation_12_month_due is 2026-07-11, five days on.
    case = with_changes(CASE_B, employment=[job("2024-07-01", None)], cap_gap=None)
    out = run(case, today=date(2026, 7, 6))
    assert out["verdict"]["state"] == "needs_you"
    assert set(out["verdict"]["reasons"]) == {
        "stem.validation_2_due",
        "stem.evaluation_12_month_due",
    }


def test_unreported_employer_and_a_dated_item_are_both_named():
    case = with_changes(
        with_block(CASE_A, "opt", dso_recommendation_date="2026-09-12"),
        employment=[job("2026-06-01", None, reported=False)],
    )
    out = run(case)
    assert out["verdict"]["state"] == "needs_you"
    assert set(out["verdict"]["reasons"]) == {"report_employer", "opt.file_by"}


# Properties

HOURS = st.sampled_from([0, 10, 19.5, 20, 22, 25, 40])


@st.composite
def counting_cases(draw: st.DrawFn) -> tuple[dict[str, Any], date]:
    """A case with no conflict and no missing date, and a day to compute it on."""
    program_end = draw(st.dates(min_value=date(2024, 1, 1), max_value=date(2026, 12, 31)))
    opt_start = program_end + timedelta(days=draw(st.integers(min_value=1, max_value=60)))
    opt_end = opt_start + timedelta(days=364)
    stem = None
    if draw(st.booleans()):
        stem_start = opt_end + timedelta(days=1)
        stem = ead(
            (opt_end - timedelta(days=60)).isoformat(),
            (opt_end - timedelta(days=30)).isoformat(),
            stem_start.isoformat(),
            (stem_start + timedelta(days=729)).isoformat(),
        )
    today = opt_start + timedelta(days=draw(st.integers(min_value=-30, max_value=1200)))
    employment = []
    for _ in range(draw(st.integers(min_value=0, max_value=5))):
        employment.append(draw(periods(opt_start, today)))
    case = {
        "program_end_date": program_end.isoformat(),
        "time_zone": TIME_ZONE,
        "confirmations": answered_yes(),
        "degree_level": draw(st.sampled_from(["bachelor", "master", "doctorate"])),
        "documents_count": draw(st.integers(min_value=1, max_value=20)),
        "cpt_full_time_days": draw(st.integers(min_value=0, max_value=400)),
        "opt": ead(
            (program_end - timedelta(days=45)).isoformat(),
            (program_end - timedelta(days=30)).isoformat(),
            opt_start.isoformat(),
            opt_end.isoformat(),
        ),
        "stem": stem,
        "employment": employment,
        "cap_gap": None,
    }
    return case, today


@st.composite
def periods(draw: st.DrawFn, opt_start: date, today: date) -> dict[str, Any]:
    start = opt_start + timedelta(days=draw(st.integers(min_value=-60, max_value=1200)))
    is_open = draw(st.booleans())
    if is_open:
        # An open period runs through today, so it starts on or before today.
        start = min(start, today)
        end = None
    else:
        end = (start + timedelta(days=draw(st.integers(min_value=0, max_value=400)))).isoformat()
    return job(start.isoformat(), end, hours=draw(HOURS), reported=draw(st.booleans()))


PACKS = st.sampled_from([None, SHIFTED])


def thresholds(shifted: dict[tuple[str, str], Any] | None) -> tuple[float, float]:
    raw = pack_dict(TODAY, values=shifted)
    return rule_value(raw, "opt.min_hours_per_week"), rule_value(raw, "stem.min_hours_per_week")


@settings(max_examples=150, deadline=None)
@given(counting_cases(), PACKS)
def test_used_plus_under_hours_plus_employed_is_the_window_length(drawn, shifted):
    case, today = drawn
    got = values(run(case, today=today, values=shifted))
    expected = count_days(case, today, *thresholds(shifted))
    assert got["unemployment.days_used"] == expected["used"]
    assert got["employment.days_under_hours"] == expected["under"]
    assert (
        got["unemployment.days_used"] + got["employment.days_under_hours"] + expected["employed"]
        == expected["window"]
    )


@settings(max_examples=150, deadline=None)
@given(counting_cases(), PACKS)
def test_counts_are_never_negative_and_never_exceed_the_window(drawn, shifted):
    case, today = drawn
    got = values(run(case, today=today, values=shifted))
    window = count_days(case, today, *thresholds(shifted))["window"]
    assert 0 <= got["unemployment.days_used"] <= window
    assert 0 <= got["employment.days_under_hours"] <= window
    assert got["unemployment.days_used"] + got["employment.days_under_hours"] <= window
    assert got["employment.periods_not_reported"] >= 0


@settings(max_examples=150, deadline=None)
@given(counting_cases(), PACKS)
def test_remaining_is_the_limit_minus_the_days_used(drawn, shifted):
    case, today = drawn
    got = values(run(case, today=today, values=shifted))
    raw = pack_dict(TODAY, values=shifted)
    on_stem = case["stem"] is not None and today >= date.fromisoformat(case["stem"]["ead_start"])
    rule_id = "stem.unemployment_limit_days" if on_stem else "opt.unemployment_limit_days"
    assert got["unemployment.limit"] == rule_value(raw, rule_id)
    assert (
        got["unemployment.days_remaining"]
        == got["unemployment.limit"] - got["unemployment.days_used"]
    )


@settings(max_examples=150, deadline=None)
@given(st.data())
def test_adding_an_employment_period_never_raises_days_used(data):
    case, today = data.draw(counting_cases())
    extra = data.draw(periods(date.fromisoformat(case["opt"]["ead_start"]), today))
    before = values(run(case, today=today))
    after = values(run(with_changes(case, employment=[*case["employment"], extra]), today=today))
    assert after["unemployment.days_used"] <= before["unemployment.days_used"]
    # A day leaves the used count only by becoming employed or under hours.
    assert (
        after["unemployment.days_used"] + after["employment.days_under_hours"]
        <= before["unemployment.days_used"] + before["employment.days_under_hours"]
    )


@settings(max_examples=100, deadline=None)
@given(counting_cases(), PACKS)
def test_every_item_names_rule_ids_that_exist_in_the_pack(drawn, shifted):
    case, today = drawn
    raw = pack_dict(today, values=shifted)
    known = {p["id"] for p in raw["parameters"]}
    statuses = rule_statuses(raw)
    out = run(case, today=today, values=shifted)
    assert contract_problems(out) == []
    for item_id, item in items(out).items():
        assert item["rule_ids"], item_id
        assert set(item["rule_ids"]) <= known, item_id
        assert set(item["rule_ids"]) <= set(out["rules"]), item_id
        used = [s for rule_id in item["rule_ids"] for s in statuses[rule_id]]
        assert item["status"] == weakest(used), item_id
    for rule_id, shown in out["rules"].items():
        regime = OPERATIVE if rule_id == "grace.after_completion_days" else ""
        assert shown["value"] == rule_value(raw, rule_id, regime), rule_id


def expected_dates(case: dict[str, Any], raw: dict[str, Any]) -> dict[str, str]:
    """SPEC, "Computed items": each dated item that needs no business-day arithmetic,
    from the raw pack and the case alone."""

    def rule(rule_id: str, regime: str = "") -> int:
        return rule_value(raw, rule_id, regime)

    def plus(day: date, days: int) -> str:
        return (day + timedelta(days=days)).isoformat()

    program_end = date.fromisoformat(case["program_end_date"])
    opt_end = date.fromisoformat(case["opt"]["ead_end"])
    ends = [program_end, opt_end]
    expected = {
        "opt.apply_window_opens": plus(program_end, -rule("opt.apply_before_days")),
        "opt.apply_window_closes": plus(program_end, rule("opt.apply_after_days")),
        "opt.latest_start": plus(program_end, rule("opt.latest_start_after_days")),
        "opt.file_by": plus(
            date.fromisoformat(case["opt"]["dso_recommendation_date"]),
            rule("opt.file_within_days_of_recommendation"),
        ),
        "opt.complete_by": months_later(
            program_end, rule("opt.complete_within_months")
        ).isoformat(),
    }
    if case["stem"] is not None:
        stem_start = date.fromisoformat(case["stem"]["ead_start"])
        stem_end = date.fromisoformat(case["stem"]["ead_end"])
        ends.append(stem_end)
        expected |= {
            "stem.apply_window_opens": plus(opt_end, -rule("stem.apply_before_expiry_days")),
            "stem.apply_window_closes": opt_end.isoformat(),
            "stem.file_by": plus(
                date.fromisoformat(case["stem"]["dso_recommendation_date"]),
                rule("stem.file_within_days_of_recommendation"),
            ),
            "stem.evaluation_12_month_due": plus(
                months_later(stem_start, 12), rule("stem.evaluation_due_days")
            ),
            "stem.final_evaluation_due_from_ead_end": plus(
                stem_end, rule("stem.evaluation_due_days")
            ),
        }
    expected["grace.ends"] = plus(max(ends), rule("grace.after_completion_days", OPERATIVE))
    expected["grace.alternate"] = plus(max(ends), rule("grace.after_completion_days", BLOCKED))
    return expected


@settings(max_examples=150, deadline=None)
@given(counting_cases(), PACKS)
def test_no_date_appears_that_the_pack_and_the_inputs_cannot_produce(drawn, shifted):
    case, today = drawn
    out = run(case, today=today, values=shifted)
    got = items(out)
    expected = expected_dates(case, pack_dict(today, values=shifted))
    alternate = expected.pop("grace.alternate")
    for item_id, value in expected.items():
        assert got[item_id]["value"] == value, item_id
    assert got["grace.ends"]["alternates"] == [
        {"regime": BLOCKED, "legal_status": "enjoined", "value": alternate}
    ]
    assert got["cpt.full_time_days_used"]["value"] == case["cpt_full_time_days"]
    assert got["employment.periods_not_reported"]["value"] == sum(
        1 for p in case["employment"] if not p["employer_reported"]
    )
    # Every item the engine returns is one the SPEC names.
    assert set(got) <= ALL_IDS


@settings(max_examples=100, deadline=None)
@given(counting_cases())
def test_the_quiet_state_is_never_a_fallback(drawn):
    # CLAUDE.md: a verdict never falls back to the quiet state.
    case, today = drawn
    out = run(case, today=today)
    got = values(out)
    if out["verdict"]["state"] == "no_open_items":
        assert out["verdict"]["reasons"] == []
        assert got["employment.days_under_hours"] == 0
        assert got["unemployment.days_remaining"] > 0
        assert got["employment.periods_not_reported"] == 0
        assert case["cpt_full_time_days"] < 365
        final_end = date.fromisoformat((case["stem"] or case["opt"])["ead_end"])
        assert today <= final_end
