"""Hidden tests for the fourth fix: specs/product-1/SPEC-resolutions.md, points 39, 40, 42,
43, 46, 47, 48, 49 and 50, and specs/plain-1/SPEC.md with contracts/engine_output.schema.json
(rules[].plain, regimes, answers_read).

Not shown to the lanes that build. Written from the SPEC and the contracts, never from the
engine. The cases differ from those of tests/unit/engine/test_f1_fix4.py. The clock is
injected; every expected date is worked beside it. Every answer is given on the day of the
case with the about the output asked it with, so no placeholder reaches the engine.
"""

import copy
from datetime import date, timedelta
from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from engine.rulepack import Rulepack, load_all, validate_pack
from tests.support.f1_pack import (
    BLOCKED,
    CONFLICT_IDS,
    CPT_USED,
    NOT_AFTER_PROGRAM_END,
    STEM_LIST,
    URL,
    WINDOW_CONFLICT_IDS,
    case_problems,
    clock_on,
    conflicts,
    contract_problems,
    ead,
    items,
    job,
    pack_dict,
    question,
    question_ids,
    refuse_placeholders,
    said,
    upcoming,
    values,
    with_changes,
)

TODAY = date(2026, 9, 29)
ONE_DAY = timedelta(days=1)
PACK = pack_dict(TODAY)

EARLIER = "opt.earlier_at_this_level"
MONTHS_AT_LEVEL = "opt.months_at_this_level"
NOT_IN_FORCE = "rule_not_in_force_on_event_day"
OPEN_AFTER = "employment.period_open_after_last_card"
LITIGATION = "rule_in_litigation"
STEM_REPORT_RULE = "stem.report_change_within_days"
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


def default_answer(question_id: str) -> bool:
    assert question_id not in CONFLICTS, f"{question_id} is asked; the test must answer it"
    return not (question_id.endswith(".new_employer") or question_id in (EARLIER, CPT_USED))


def settle(
    case: dict[str, Any],
    today: date = TODAY,
    chosen: dict[str, bool] | None = None,
    raw_pack: dict[str, Any] | None = None,
    pack: Rulepack | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Answer every question asked, in order, on today, with the about as asked."""
    chosen = chosen or {}
    out = run(case, today, raw_pack, pack)
    for _ in range(12):
        if not out["questions"]:
            break
        confirmations = copy.deepcopy(case.get("confirmations") or {})
        for q in out["questions"]:
            answer = chosen[q["id"]] if q["id"] in chosen else default_answer(q["id"])
            confirmations[q["id"]] = {"answer": answer, "on": today.isoformat()}
            if "about" in q:
                confirmations[q["id"]]["about"] = copy.deepcopy(q["about"])
        case = with_changes(case, confirmations=confirmations)
        out = run(case, today, raw_pack, pack)
    return case, out


def iso(day: date) -> str:
    return day.isoformat()


def shipped() -> Rulepack:
    return next(p for p in load_all() if p.category == "f1")


def with_stem_report(days: int) -> dict[str, Any]:
    changed = copy.deepcopy(PACK)
    changed["parameters"].append(
        {
            "id": STEM_REPORT_RULE,
            "value": days,
            "unit": "days",
            "status": "settled",
            "effective_from": "2000-01-01",
            "source": {
                "citation": "8 CFR 214.2(f)(12)(ii)(A)",
                "url": URL,
                "checked_on": TODAY.isoformat(),
                "quote": "placeholder words for the STEM report in a hidden test pack",
            },
            "derivation": "verbatim",
        }
    )
    return changed


# Point 39. A bachelor's student. Program end 2025-07-15, recommended 2025-06-20, filed
# 2025-06-25 (5 days), card 2025-08-01 to 2026-07-31 (12 months from 2025-08-01 is
# 2026-08-01). The latest start, 60 days after 2025-07-15, is 2025-09-13 (16 reach Jul 31,
# 31 Aug 31, 13 more), after the card start. 14 months from the program end: 2026-09-15.
# Run 2026-03-02, with the card running.
DAY_39 = date(2026, 3, 2)
BACHELOR: dict[str, Any] = {
    "program_end_date": "2025-07-15",
    "degree_level": "bachelor",
    "documents_count": 1,
    "cpt_full_time_days": 0,
    "opt": ead("2025-06-20", "2025-06-25", "2025-08-01", "2026-07-31"),
    "stem": None,
    "employment": [job("2025-08-01", None)],
    "cap_gap": None,
    "time_zone": "UTC",
}


def test_holdout_point_39_the_question_is_asked_with_its_about():
    out = run(BACHELOR, DAY_39)
    assert out["verdict"]["state"] == "cannot_tell"
    about = question(out, EARLIER)["about"]
    assert {"degree_level", "opt.ead_start", "opt.ead_end"} <= set(about)
    assert {"bachelor", "2025-08-01", "2026-07-31"} <= said(about)


def test_holdout_point_39_yes_steps_back_and_no_does_not():
    _, yes = settle(BACHELOR, DAY_39, chosen={EARLIER: True})
    assert yes["verdict"]["state"] == "talk_to_dso"
    assert MONTHS_AT_LEVEL in yes["verdict"]["reasons"]
    _, no = settle(BACHELOR, DAY_39, chosen={EARLIER: False})
    assert MONTHS_AT_LEVEL not in no["verdict"]["reasons"]
    assert no["verdict"]["state"] != "cannot_tell"


@settings(deadline=None, max_examples=25)
@given(st.integers(min_value=0, max_value=364))
def test_holdout_point_39_asked_on_every_day_of_the_card_until_answered(offset):
    today = date(2025, 8, 1) + timedelta(days=offset)
    out = run(BACHELOR, today)
    assert EARLIER in question_ids(out)
    assert out["verdict"]["state"] == "cannot_tell"


# Point 42. Card 2026-01-05 to 2026-04-30, program end 2026-06-30, no employment. Taken as
# post-completion OPT: Jan 5 to 31 is 27, Feb 28, Mar 31, Apr 30, 116 days, over 90.
BEFORE_END: dict[str, Any] = with_changes(
    BACHELOR,
    program_end_date="2026-06-30",
    opt=ead("2025-11-01", "2025-11-10", "2026-01-05", "2026-04-30"),
    employment=[],
)


def test_holdout_point_42_yes_keeps_the_card_pre_completion():
    assert (date(2026, 4, 30) - date(2026, 1, 5)).days + 1 == 116
    _, out = settle(BEFORE_END, chosen={NOT_AFTER_PROGRAM_END: True})
    # Point 42 names the judgement item; the state is not pinned (point 25 may add the
    # litigation reason for grace.ends after the card).
    assert NOT_AFTER_PROGRAM_END in out["verdict"]["reasons"]
    assert conflicts(out) == []
    assert values(out)["unemployment.days_used"] is None
    assert values(out)["unemployment.days_remaining"] is None
    assert [e for e in upcoming(out) if e.startswith("next.")] == []
    assert STEM_LIST not in [entry["id"] for entry in out["lists"]]
    assert contract_problems(out) == []


# Point 43. Program end 2024-08-15, recommended 2024-07-20, filed 2024-07-25, card
# 2024-09-01 to 2025-08-31. A period over the card, closed, and one open from 2025-10-01.
AFTER_CARD: dict[str, Any] = with_changes(
    BACHELOR,
    program_end_date="2024-08-15",
    opt=ead("2024-07-20", "2024-07-25", "2024-09-01", "2025-08-31"),
    employment=[job("2024-09-01", "2025-08-31"), job("2025-10-01", None)],
)


def test_holdout_point_43_the_open_period_after_the_card_is_the_conflict():
    out = run(AFTER_CARD, date(2026, 2, 2))
    assert conflicts(out) == [OPEN_AFTER]
    assert {"2025-10-01", "2025-08-31"} <= said(question(out, OPEN_AFTER)["about"])
    _, yes = settle(AFTER_CARD, date(2026, 2, 2), chosen={OPEN_AFTER: True})
    assert yes["verdict"]["state"] == "talk_to_dso"
    assert OPEN_AFTER in yes["verdict"]["reasons"]


@settings(deadline=None, max_examples=25)
@given(st.integers(min_value=-30, max_value=60))
def test_holdout_point_43_raised_when_and_only_when_today_is_after_the_card(offset):
    # One period open from the card's first day. Raised on the days after 2025-08-31.
    case = with_changes(AFTER_CARD, employment=[job("2024-09-01", None)])
    today = date(2025, 8, 31) + timedelta(days=offset)
    assert (OPEN_AFTER in conflicts(run(case, today))) == (offset > 0)


# Point 46.


def test_holdout_point_46_answers_read_is_exactly_what_was_read():
    settled, out = settle(AFTER_CARD, date(2026, 2, 2), chosen={OPEN_AFTER: True})
    assert set(out["answers_read"]) == set(settled["confirmations"])
    # The same answers on a later case where the second period closed: the conflict's
    # answer is for a question no longer raised, and is not read.
    closed = with_changes(
        settled, employment=[job("2024-09-01", "2025-08-31"), job("2025-10-01", "2025-12-31")]
    )
    later = run(closed, date(2026, 2, 2))
    assert OPEN_AFTER not in later["answers_read"]
    assert set(later["answers_read"]) <= set(settled["confirmations"])


def test_holdout_point_46_no_answers_reads_none():
    assert run(BACHELOR, DAY_39)["answers_read"] == []


# Point 40.
def stem_case(stem_start: date, months_before: int = 12) -> dict[str, Any]:
    """OPT for 12 months before stem_start; program end 30 days before OPT; the filings 5
    days after their recommendations, 30 days before the program end for OPT and 60 days
    before the OPT card ends for STEM; STEM for 24 months; one period over both, closed."""
    index = stem_start.year * 12 + stem_start.month - 1 - months_before
    opt_start = date(index // 12, index % 12 + 1, stem_start.day)
    opt_end = stem_start - ONE_DAY
    program_end = opt_start - timedelta(days=30)
    stem_end = date(stem_start.year + 2, stem_start.month, stem_start.day) - ONE_DAY
    opt_rec = program_end - timedelta(days=30)
    stem_rec = opt_end - timedelta(days=60)
    return {
        "program_end_date": iso(program_end),
        "degree_level": "master",
        "documents_count": 2,
        "cpt_full_time_days": 0,
        "opt": ead(iso(opt_rec), iso(opt_rec + timedelta(days=5)), iso(opt_start), iso(opt_end)),
        "stem": ead(
            iso(stem_rec), iso(stem_rec + timedelta(days=5)), iso(stem_start), iso(stem_end)
        ),
        "employment": [job(iso(opt_start), iso(stem_end))],
        "cap_gap": None,
        "time_zone": "UTC",
    }


def test_holdout_point_40_a_stem_card_from_2016_05_09_gets_no_24_month_dates():
    # The day before the shipped STEM rows take effect.
    _, out = settle(stem_case(date(2016, 5, 9)), pack=shipped())
    for item_id, item in items(out).items():
        if item_id.startswith("stem.validation_") or "stem.extension_months" in item["rule_ids"]:
            assert item["value"] is None, item_id
    assert values(out)["unemployment.days_remaining"] is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] == "talk_to_dso"


def test_holdout_point_40_june_2020_counts_juneteenth_as_a_business_day():
    # STEM from 2019-12-10: 6 months on is Wednesday 2020-06-10. Jun 11 (1), 12 (2), 15
    # (3), 16 (4), 17 (5), 18 (6), Fri 19 (7), 22 (8), 23 (9), 24 (10): 2020-06-24.
    case = stem_case(date(2019, 12, 10))
    assert values(run(case, pack=shipped()))["stem.validation_1_due"] == "2020-06-24"


def test_holdout_point_40_june_2019_counts_juneteenth_as_a_business_day():
    # STEM from 2018-12-13: 6 months on is Thursday 2019-06-13. 14 (1), 17 (2), 18 (3),
    # Wed 19 (4), 20 (5), 21 (6), 24 (7), 25 (8), 26 (9), 27 (10): 2019-06-27.
    case = stem_case(date(2018, 12, 13))
    assert values(run(case))["stem.validation_1_due"] == "2019-06-27"


def capgap_case(filed_on: str, requested: str) -> dict[str, Any]:
    # Program end 2024-05-20, card 2024-06-10 to 2025-06-09, one period over it, closed.
    return with_changes(
        BACHELOR,
        program_end_date="2024-05-20",
        opt=ead("2024-04-15", "2024-04-20", "2024-06-10", "2025-06-09"),
        employment=[job("2024-06-10", "2025-06-09")],
        cap_gap={
            "petition_filed_on": filed_on,
            "requested_start": requested,
            "change_of_status": True,
            "status": "approved",
        },
    )


def test_holdout_point_40_a_petition_filed_2025_01_16_for_october_1_takes_october_1():
    # The October 1 row: fiscal year 2026 begins 2025-10-01, the start asked for.
    _, out = settle(capgap_case("2025-01-16", "2025-10-01"), pack=shipped())
    assert values(out)["capgap.ends"] == "2025-10-01"


def test_holdout_point_40_a_petition_filed_2024_12_01_for_september_steps_back():
    _, out = settle(capgap_case("2024-12-01", "2025-09-01"), pack=shipped())
    assert values(out)["capgap.ends"] is None
    assert out["verdict"]["state"] == "talk_to_dso"


# Point 47. Program end 2007-06-30, before the shipped OPT window rows (2008-04-08).
def test_holdout_point_47_a_program_end_in_2007_steps_back():
    case = with_changes(
        BACHELOR,
        program_end_date="2007-06-30",
        opt=ead("2007-06-01", "2007-06-05", "2007-07-15", "2008-07-14"),
        employment=[job("2007-07-15", "2008-07-14")],
    )
    _, out = settle(case, pack=shipped())
    assert values(out)["opt.apply_window_closes"] is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] == "talk_to_dso"


# Point 48. OPT 2024-11-03 to 2025-11-02, STEM from 2025-11-03.
@settings(deadline=None, max_examples=25)
@given(st.integers(min_value=1, max_value=730))
def test_holdout_point_48_every_report_date_lies_within_the_card(days):
    case = stem_case(date(2025, 11, 3))
    stem_end = date(2025, 11, 3) + timedelta(days=days)
    case["stem"]["ead_end"] = iso(stem_end)
    case["employment"] = [job(case["opt"]["ead_start"], iso(stem_end))]
    for item_id, item in items(run(case)).items():
        dated = item_id.startswith("stem.validation_") or item_id == (
            "stem.evaluation_12_month_due"
        )
        if dated and item["value"] is not None:
            assert date.fromisoformat(item["value"]) <= stem_end, item_id


# Point 49. The card of AFTER_CARD ended 2025-08-31; a cap-gap petition for 2025-10-01,
# filed 2025-04-01 and approved, runs past it, so grace.ends is null (point 18).
def test_holdout_point_49_a_null_grace_gives_no_rule_in_litigation():
    case = with_changes(
        AFTER_CARD,
        employment=[job("2024-09-01", "2025-08-31")],
        cap_gap={
            "petition_filed_on": "2025-04-01",
            "requested_start": "2025-10-01",
            "change_of_status": True,
            "status": "approved",
        },
    )
    _, out = settle(case, date(2025, 9, 20))
    assert values(out)["grace.ends"] is None
    assert LITIGATION not in out["verdict"]["reasons"]


# Point 50. The period ends 2026-07-15 on a STEM card from 2025-11-03; its end was not
# reported. With 12 days in the rule: 2026-07-15 plus 12 is 2026-07-27.
def test_holdout_point_50_the_stem_report_counts_from_the_regulation():
    case = stem_case(date(2025, 11, 3))
    case["employment"] = [job(case["opt"]["ead_start"], "2026-07-15")]
    _, out = settle(
        case, chosen={"employment.1.end_reported": False}, raw_pack=with_stem_report(12)
    )
    found = [
        item
        for item in items(out).values()
        if item["unit"] == "date" and {STEM_REPORT_RULE, OPT_REPORT_RULE} & set(item["rule_ids"])
    ]
    assert [item["value"] for item in found] == ["2026-07-27"]
    assert STEM_REPORT_RULE in found[0]["rule_ids"]
    assert found[0]["status"] == "settled"


# plain-1.
def test_holdout_plain_rules_and_regimes_carry_the_packs_words():
    raw = copy.deepcopy(PACK)
    for parameter in raw["parameters"]:
        parameter["plain"] = f"hidden plain words for {parameter['id']}"
    for regime in raw["regimes"]:
        regime["plain"] = f"hidden plain words for {regime['id']}"
    _, out = settle(BACHELOR, DAY_39, raw_pack=raw)
    for rule_id, shown in out["rules"].items():
        assert shown.get("plain") == f"hidden plain words for {rule_id}", rule_id
    named = set()
    for entry in [*out["computed"], *out["upcoming"]]:
        if "operative" in entry:
            named.add(entry["operative"]["regime"])
        named.update(a["regime"] for a in entry.get("alternates", []))
    assert BLOCKED in named
    assert set(out["regimes"]) == named
    for regime in raw["regimes"]:
        if regime["id"] in named:
            shown = out["regimes"][regime["id"]]
            assert shown["plain"] == regime["plain"]
            assert shown["citation"] == regime["source"]["citation"]
            assert shown["url"] == regime["source"]["url"]
    assert contract_problems(out) == []
