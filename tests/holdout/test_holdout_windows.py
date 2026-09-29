"""Holdout: SPEC-resolutions.md, points 11, 14, 16, 18, 21 and 22 on cases the builders
never see. Every edge is worked from the test pack's rule value. Working beside each."""

from datetime import date, timedelta
from typing import Any

from engine import f1
from tests.support.f1_pack import (
    answer_as_the_screen_does,
    build_pack,
    cap_gap,
    clock_on,
    conflicts,
    ead,
    job,
    months_later,
    pack_dict,
    question_ids,
    rule_value,
    values,
    with_block,
)

PACK = pack_dict("2026-09-28")


def run(case: dict[str, Any], today: date) -> dict[str, Any]:
    clock = clock_on(today)
    return f1.compute_f1(f1.parse_case(case, clock), build_pack(today), clock)


# OPT 2026-02-02 to 2027-02-01, program end 2025-12-19 (the window closes 2026-02-17; 14
# months reach 2027-02-19). Recommended 2025-11-20, filed 2025-12-01. Run on 2026-11-30.
CASE: dict[str, Any] = {
    "program_end_date": "2025-12-19",
    "degree_level": "bachelor",
    "documents_count": 3,
    "cpt_full_time_days": 10,
    "opt": ead("2025-11-20", "2025-12-01", "2026-02-02", "2027-02-01"),
    "stem": None,
    "employment": [job("2026-02-02", None)],
    "cap_gap": None,
    "time_zone": "UTC",
}
DAY = date(2026, 11, 30)


def test_holdout_an_opt_filing_after_its_days_is_a_conflict_and_the_last_day_fits():
    days = rule_value(PACK, "opt.file_within_days_of_recommendation")
    last = date(2025, 11, 20) + timedelta(days=days)  # 30 days on: 2025-12-20
    late = run(with_block(CASE, "opt", i765_filed_date=(last + timedelta(1)).isoformat()), DAY)
    assert late["verdict"]["state"] == "cannot_tell"
    assert conflicts(late) == ["opt.i765_filed_date.after_file_by"]
    fits = run(with_block(CASE, "opt", i765_filed_date=last.isoformat()), DAY)
    assert conflicts(fits) == []


def test_holdout_a_card_past_complete_by_is_a_conflict_until_yes():
    months = rule_value(PACK, "opt.complete_within_months")
    complete_by = months_later(date(2025, 12, 19), months)  # 2027-02-19
    case = dict(
        with_block(
            CASE, "opt", ead_start="2026-02-21", ead_end=(complete_by + timedelta(1)).isoformat()
        ),
        employment=[job("2026-02-21", None)],
    )
    out = run(case, DAY)
    assert conflicts(out) == ["opt.ead_end.after_complete_by"]
    assert values(out)["grace.ends"] is None
    conflict = "opt.ead_end.after_complete_by"
    yes = answer_as_the_screen_does(case, out, DAY.isoformat(), **{conflict: True})
    after = run(yes, DAY)
    assert after["verdict"]["state"] == "talk_to_dso"
    assert conflict in after["verdict"]["reasons"]


def test_holdout_a_stem_filing_before_its_window_is_a_conflict():
    before = rule_value(PACK, "stem.apply_before_expiry_days")
    opens = date(2027, 2, 1) - timedelta(days=before)  # 2026-11-03
    stem = ead(
        (opens - timedelta(20)).isoformat(),
        (opens - timedelta(1)).isoformat(),
        "2027-02-02",
        "2029-02-01",
    )
    out = run(dict(CASE, stem=stem), DAY)
    assert conflicts(out) == ["stem.i765_filed_date.before_window_opens"]
    fits = dict(stem, i765_filed_date=opens.isoformat())
    assert conflicts(run(dict(CASE, stem=fits), DAY)) == []


def test_holdout_cap_gap_past_the_card_takes_the_grace_date_away():
    # Card to 2027-02-01; a pending petition asking to start 2027-06-15.
    case = dict(CASE, cap_gap=cap_gap("2027-06-15", petition_filed_on="2026-11-02"))
    out = run(case, DAY)
    assert values(out)["capgap.ends"] > "2027-02-01"
    assert values(out)["grace.ends"] is None
    assert "grace_with_cap_gap" in out["verdict"]["reasons"]


def test_holdout_a_passed_evaluation_is_asked_about():
    # STEM 2026-02-02 to 2028-02-01 after an OPT card 2025-02-02 to 2026-02-01. The
    # 12-month evaluation: 2027-02-02 plus 10 days, 2027-02-12. Run on 2027-02-13.
    case = dict(
        CASE,
        program_end_date="2024-12-19",
        opt=ead("2024-11-20", "2024-12-01", "2025-02-02", "2026-02-01"),
        stem=ead("2025-11-01", "2025-11-10", "2026-02-02", "2028-02-01"),
        employment=[job("2025-02-02", None)],
    )
    today = date(2027, 2, 13)
    made = "stem.evaluation_12_month_due.made"
    out = run(case, today)
    assert made in question_ids(out)
    assert out["verdict"]["state"] == "cannot_tell"
    assert values(run(case, date(2027, 2, 12)))["stem.evaluation_12_month_due"] == "2027-02-12"
    assert made not in question_ids(run(case, date(2027, 2, 12)))


def test_holdout_an_unreported_end_gives_the_report_item():
    case = dict(CASE, employment=[job("2026-02-02", "2026-10-15"), job("2026-10-16", None)])
    out = run(case, DAY)
    asked = [q for q in question_ids(out) if q.endswith(".end_reported")]
    assert len(asked) == 1
    no = answer_as_the_screen_does(case, out, DAY.isoformat(), **{asked[0]: False})
    after = run(no, DAY)
    assert "report_employer" in after["verdict"]["reasons"]
    # 2026-10-15 plus 10 days is 2026-10-25.
    assert "2026-10-25" in {
        item["value"]
        for item in after["computed"]
        if "opt.report_employer_within_days" in item["rule_ids"]
    }
