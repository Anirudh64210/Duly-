"""engine/f1.py: the fourth fix. specs/product-1/SPEC-resolutions.md, points 39, 40, 42,
43, 46, 47, 48, 49 and 50, and specs/plain-1/SPEC.md with contracts/engine_output.schema.json
(rules[].plain, regimes, answers_read).

Written before the engine has them, from the SPEC and the contracts, never from the
engine. The clock is injected at noon UTC on the day of each case. Every answer is given on
the day of the case with the about the output asked it with (points 2 and 7), so no
placeholder answer reaches the engine (tests/support/f1_pack.py, refuse_placeholders).

Every expected date and count was worked out by hand. The working is beside it.
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
    OPERATIVE,
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
    months_later,
    pack_dict,
    question,
    question_ids,
    refuse_placeholders,
    rule_value,
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
ABOUT_39 = {"degree_level", "opt.ead_start", "opt.ead_end"}
CONFLICTS = {*CONFLICT_IDS, *WINDOW_CONFLICT_IDS, NOT_AFTER_PROGRAM_END, OPEN_AFTER}


def run(
    case: dict[str, Any],
    today: date = TODAY,
    raw_pack: dict[str, Any] | None = None,
    pack: Rulepack | None = None,
) -> dict[str, Any]:
    """Compute a case with the clock injected at noon UTC on today. The test pack is
    checked on today, so the age of the rules never decides a verdict."""
    assert case_problems(case) == [], "the test case itself must match the case contract"
    clock = clock_on(today)
    if pack is None:
        pack = validate_pack(pack_dict(today) if raw_pack is None else raw_pack)
    return f1.compute_f1(f1.parse_case(refuse_placeholders(case), clock), pack, clock)


def default_answer(question_id: str) -> bool:
    """The answer a test about something else gives. A new employer is not assumed, earlier
    OPT at the level is not assumed, full-time CPT is not assumed; every other question of
    the person (an end reported, a report made, no employment to record) is answered yes.
    A fact that does not fit is never answered by default: the test names it."""
    assert question_id not in CONFLICTS, f"{question_id} is asked; the test must answer it"
    return not (question_id.endswith(".new_employer") or question_id in (EARLIER, CPT_USED))


def settle(
    case: dict[str, Any],
    today: date = TODAY,
    chosen: dict[str, bool] | None = None,
    raw_pack: dict[str, Any] | None = None,
    pack: Rulepack | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Answer every question the output asks, in the order it asks them (an answer can
    raise another), on today with the about as asked, as the screen does. chosen gives the
    answer to a question by id; default_answer the rest. Returns the case and its output."""
    chosen = chosen or {}
    out = run(case, today, raw_pack, pack)
    for _ in range(12):
        asked = out["questions"]
        if not asked:
            break
        confirmations = copy.deepcopy(case.get("confirmations") or {})
        for q in asked:
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


def from_day(raw_pack: dict[str, Any], prefix: str, day: str) -> dict[str, Any]:
    """A deep copy of the raw pack where every row whose id begins with prefix takes
    effect on day, as the shipped pack's rows do."""
    changed = copy.deepcopy(raw_pack)
    for parameter in changed["parameters"]:
        if parameter["id"].startswith(prefix):
            parameter["effective_from"] = day
    return changed


def with_rule(
    raw_pack: dict[str, Any], rule_id: str, value: int, unit: str, status: str, citation: str
) -> dict[str, Any]:
    """A deep copy of the raw pack with one more rule, in force from the test pack's day."""
    changed = copy.deepcopy(raw_pack)
    changed["parameters"].append(
        {
            "id": rule_id,
            "value": value,
            "unit": unit,
            "status": status,
            "effective_from": "2000-01-01",
            "source": {
                "citation": citation,
                "url": URL,
                "checked_on": TODAY.isoformat(),
                "quote": f"placeholder words for {rule_id} in a test pack",
            },
            "derivation": "verbatim",
        }
    )
    return changed


def plain_of(rule_id: str, regime: str) -> str:
    return f"placeholder plain words for {rule_id} under {regime or 'no regime'}"


def with_plain(raw_pack: dict[str, Any]) -> dict[str, Any]:
    """A deep copy of the raw pack where every rule and every regime carries plain words
    of its own (specs/plain-1/SPEC.md, section 1; contracts/rulepack.schema.json)."""
    changed = copy.deepcopy(raw_pack)
    for parameter in changed["parameters"]:
        parameter["plain"] = plain_of(parameter["id"], parameter.get("regime", ""))
    for regime in changed["regimes"]:
        regime["plain"] = f"placeholder plain words for the regime {regime['id']}"
    return changed


# The base case: an OPT card running today. Program end 2026-05-15. Recommended
# 2026-04-01, filed 2026-04-10 (9 days on, within 30; before the program end, so point 15
# raises nothing). Card 2026-06-01 to 2027-05-31: 12 months from 2026-06-01 is 2027-06-01,
# so the card is not longer than its rule; it ends after the program end (point 27) and
# before 14 months from it, 2027-07-15 (point 16). The latest start, 60 days after
# 2026-05-15, is 2026-07-14 (16 days reach May 31, 30 Jun 30, 14 more), after the card
# start. One open period from the card start: no question of points 20 or 22. The grace
# period ends 60 days after 2027-05-31: 30 reach Jun 30, 30 more 2027-07-30.
OPT_CASE: dict[str, Any] = {
    "program_end_date": "2026-05-15",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "opt": ead("2026-04-01", "2026-04-10", "2026-06-01", "2027-05-31"),
    "stem": None,
    "employment": [job("2026-06-01", None)],
    "cap_gap": None,
    "time_zone": "UTC",
}


def test_the_cases_of_this_file_match_the_case_contract():
    for case in (OPT_CASE, REVIEW_42, RUNNING_42, OPEN_AFTER_CASE, OPEN_ALL_ALONG, STEM_CASE):
        assert case_problems(case) == []
    assert months_later(date(2026, 6, 1), rule_value(PACK, "opt.max_months")) == date(2027, 6, 1)
    assert iso(date(2026, 5, 15) + timedelta(days=60)) == "2026-07-14"


# Point 39: opt.earlier_at_this_level. 8 CFR 214.2(f)(10): "A student may be authorized 12
# months of practical training, and becomes eligible for another 12 months of practical
# training when they change to a higher educational level".


def test_point_39_an_opt_card_raises_earlier_at_this_level():
    out = run(OPT_CASE)
    assert EARLIER in question_ids(out)
    assert out["verdict"]["state"] == "cannot_tell"
    assert contract_problems(out) == []


def test_point_39_the_question_holds_the_degree_level_and_the_card():
    about = question(run(OPT_CASE), EARLIER)["about"]
    assert set(about) >= ABOUT_39
    assert {"master", "2026-06-01", "2027-05-31"} <= said(about)


def test_point_39_no_opt_card_raises_nothing():
    # No OPT block, no STEM block, no cap-gap: nothing_more_to_record is asked, not this.
    case = with_changes(OPT_CASE, opt=None, employment=[])
    assert EARLIER not in question_ids(run(case))


def test_point_39_no_holds_the_card_alone_to_the_rule():
    _, out = settle(OPT_CASE, chosen={EARLIER: False})
    assert EARLIER not in question_ids(out)
    assert MONTHS_AT_LEVEL not in out["verdict"]["reasons"]
    # The case is built so that nothing else in it is open.
    assert out["verdict"]["state"] == "no_open_items"
    assert contract_problems(out) == []


def test_point_39_yes_gives_talk_to_dso_with_months_at_this_level():
    _, out = settle(OPT_CASE, chosen={EARLIER: True})
    assert out["verdict"]["state"] == "talk_to_dso"
    assert MONTHS_AT_LEVEL in out["verdict"]["reasons"]
    assert "opt.max_months" in out["rules"]
    assert contract_problems(out) == []


def test_point_39_the_case_of_the_sweep_is_never_no_open_items():
    # A master's student with three months of earlier OPT at the same level and a 12-month
    # card. Unanswered, Duly does not know; answered yes, it steps back to the DSO.
    out = run(OPT_CASE)
    assert out["verdict"]["state"] != "no_open_items"
    _, answered = settle(OPT_CASE, chosen={EARLIER: True})
    assert answered["verdict"]["state"] == "talk_to_dso"


def test_point_39_an_answer_for_another_card_is_not_read():
    # Answered for the card to 2027-05-31, then the card end changes to 2027-04-30.
    case, _ = settle(OPT_CASE, chosen={EARLIER: False})
    moved = with_changes(case, opt=ead("2026-04-01", "2026-04-10", "2026-06-01", "2027-04-30"))
    out = run(moved)
    assert EARLIER in question_ids(out)
    assert out["verdict"]["state"] == "cannot_tell"


def test_point_39_a_stem_case_with_an_opt_card_asks_it_too():
    assert EARLIER in question_ids(run(STEM_CASE))


# Point 42: a card of point 27 stays pre-completion OPT whichever way the question is
# answered. The review's case: a card wholly before the program end, answered yes, counted
# the days against the 90-day limit and listed the STEM extension. Program end 2027-01-15.
# Recommended 2026-03-01, filed 2026-03-10, card 2026-05-01 to 2026-08-31 (4 months), no
# employment entered (no_employment_to_record answered yes). Taken as post-completion OPT
# the count would be May 1 to Aug 31: 31 + 30 + 31 + 31 = 123 days, over 90.
REVIEW_42: dict[str, Any] = with_changes(
    OPT_CASE,
    program_end_date="2027-01-15",
    opt=ead("2026-03-01", "2026-03-10", "2026-05-01", "2026-08-31"),
    employment=[],
)

# The card running today, a week before the program end, as in test_f1_fix2.py: program
# end 2026-12-15, recommended 2026-09-01, filed 2026-09-05, card 2026-09-10 to 2026-12-08.
# opt.file_by is 2026-09-01 plus 30 days: 29 reach Sep 30, 1 more 2026-10-01, ahead.
RUNNING_42: dict[str, Any] = with_changes(
    OPT_CASE,
    program_end_date="2026-12-15",
    opt=ead("2026-09-01", "2026-09-05", "2026-09-10", "2026-12-08"),
    employment=[job("2026-09-10", None)],
)
YES_27 = {NOT_AFTER_PROGRAM_END: True}
UNEMPLOYMENT = ("unemployment.days_used", "unemployment.days_remaining")


def test_point_42_the_review_case_answered_yes_counts_no_unemployment():
    assert (date(2026, 8, 31) - date(2026, 5, 1)).days + 1 == 123
    _, out = settle(REVIEW_42, chosen=YES_27)
    # Point 42 names the judgement item; whether grace.ends keeps an alternate after the
    # card (point 25) is not settled by it, so the state is not pinned here.
    assert NOT_AFTER_PROGRAM_END in out["verdict"]["reasons"]
    assert conflicts(out) == []
    assert out["verdict"]["state"] != "no_open_items"
    for item_id in UNEMPLOYMENT:
        assert values(out)[item_id] is None, item_id
    assert [r for r in out["verdict"]["reasons"] if r.startswith("unemployment")] == []


def test_point_42_the_review_case_answered_yes_lists_no_stem_step():
    _, out = settle(REVIEW_42, chosen=YES_27)
    assert [entry for entry in upcoming(out) if entry.startswith("next.")] == []
    assert STEM_LIST not in [entry["id"] for entry in out["lists"]]


def test_point_42_answered_yes_no_opt_step_is_marked_done():
    # A card that fits marks the OPT step done and opt.file_by leaves upcoming. Under point
    # 27, yes or no, the card is not post-completion OPT: 2026-10-01 stays.
    _, out = settle(RUNNING_42, chosen=YES_27)
    assert out["verdict"]["state"] == "talk_to_dso"
    assert upcoming(out)["opt.file_by"]["date"] == "2026-10-01"


def test_point_42_answered_yes_the_running_card_has_no_unemployment_count():
    _, out = settle(RUNNING_42, chosen=YES_27)
    for item_id in UNEMPLOYMENT:
        assert values(out)[item_id] is None, item_id
    assert [entry for entry in upcoming(out) if entry.startswith("next.")] == []


def test_point_42_answered_no_stays_cannot_tell_with_the_same_nulls():
    _, out = settle(REVIEW_42, chosen={NOT_AFTER_PROGRAM_END: False})
    assert out["verdict"]["state"] == "cannot_tell"
    for item_id in UNEMPLOYMENT:
        assert values(out)[item_id] is None, item_id


# Point 43: employment.period_open_after_last_card. The sweep's case: a card to 2026-05-31
# and a period open from 2026-07-01 gave no_open_items. Program end 2025-05-15, recommended
# 2025-04-01, filed 2025-04-10, card 2025-06-01 to 2026-05-31 (12 months from 2025-06-01 is
# 2026-06-01). A first period covers the card and ends with it.
OPEN_AFTER_CASE: dict[str, Any] = with_changes(
    OPT_CASE,
    program_end_date="2025-05-15",
    opt=ead("2025-04-01", "2025-04-10", "2025-06-01", "2026-05-31"),
    employment=[job("2025-06-01", "2026-05-31"), job("2026-07-01", None)],
)
# One period open from the card's first day, never closed.
OPEN_ALL_ALONG: dict[str, Any] = with_changes(OPEN_AFTER_CASE, employment=[job("2025-06-01", None)])


def test_point_43_an_open_period_after_the_last_card_is_a_conflict():
    out = run(OPEN_AFTER_CASE)
    assert out["verdict"]["state"] == "cannot_tell"
    assert f"conflict:{OPEN_AFTER}" in out["verdict"]["reasons"]
    # It replaces period_outside_cards for such a period, so it is the only conflict.
    assert conflicts(out) == [OPEN_AFTER]
    assert contract_problems(out) == []


def test_point_43_the_question_holds_the_period_start_and_the_last_card_end():
    about = question(run(OPEN_AFTER_CASE), OPEN_AFTER)["about"]
    assert {"2026-07-01", "2026-05-31"} <= said(about)


def test_point_43_yes_gives_talk_to_dso_with_the_judgement_item():
    _, out = settle(OPEN_AFTER_CASE, chosen={OPEN_AFTER: True})
    assert out["verdict"]["state"] == "talk_to_dso"
    assert OPEN_AFTER in out["verdict"]["reasons"]
    assert conflicts(out) == []


def test_point_43_no_keeps_cannot_tell():
    _, out = settle(OPEN_AFTER_CASE, chosen={OPEN_AFTER: False})
    assert out["verdict"]["state"] == "cannot_tell"
    assert f"conflict:{OPEN_AFTER}" in out["verdict"]["reasons"]


def test_point_43_a_period_open_since_the_card_began_is_raised_the_day_after_it_ends():
    # Today 2026-06-01 is the day after the card's last day, 2026-05-31.
    assert OPEN_AFTER in conflicts(run(OPEN_ALL_ALONG, date(2026, 6, 1)))


def test_point_43_on_the_last_card_day_nothing_is_raised():
    assert OPEN_AFTER not in conflicts(run(OPEN_ALL_ALONG, date(2026, 5, 31)))


# With a cap-gap petition filed 2026-04-01 for a start on 2026-10-01, approved, a change
# of status: 2026-10-01 is on or after Oct 1, so its fiscal year's April 1 is 2027-04-01,
# and capgap.ends is the earlier of the two, 2026-10-01.
WITH_CAP_GAP: dict[str, Any] = with_changes(
    OPEN_ALL_ALONG,
    cap_gap={
        "petition_filed_on": "2026-04-01",
        "requested_start": "2026-10-01",
        "change_of_status": True,
        "status": "approved",
    },
)


def test_point_43_while_cap_gap_runs_the_open_period_is_not_raised():
    out = run(WITH_CAP_GAP, date(2026, 10, 1))
    assert values(out)["capgap.ends"] == "2026-10-01"
    assert OPEN_AFTER not in conflicts(out)


def test_point_43_after_cap_gap_ends_the_open_period_is_raised():
    assert OPEN_AFTER in conflicts(run(WITH_CAP_GAP, date(2026, 10, 2)))


# Point 46 and the contract: answers_read lists exactly the question ids whose answers the
# engine read.


def test_point_46_with_no_answers_answers_read_is_empty():
    out = run(OPT_CASE)
    assert out["answers_read"] == []
    assert contract_problems(out) == []


def test_point_46_answers_read_names_the_answer_that_was_read():
    _, out = settle(OPT_CASE, chosen={EARLIER: False})
    assert sorted(out["answers_read"]) == [EARLIER]


def test_point_46_answers_read_is_exactly_the_answers_given_to_questions_asked():
    # settle answers only what the output asks, so every answer in the case was asked and
    # stands for the values it was given for.
    for case, chosen in (
        (STEM_CASE, {}),
        (OPEN_AFTER_CASE, {OPEN_AFTER: True}),
        (REVIEW_42, YES_27),
    ):
        settled, out = settle(case, chosen=chosen)
        assert out["questions"] == []
        assert set(out["answers_read"]) == set(settled.get("confirmations") or {})
        assert len(out["answers_read"]) == len(set(out["answers_read"]))


def test_point_46_an_answer_to_a_question_not_raised_is_not_read():
    # nothing_more_to_record is raised only with no OPT, STEM or cap-gap block entered.
    case, _ = settle(OPT_CASE, chosen={EARLIER: False})
    extra = copy.deepcopy(case["confirmations"])
    extra["nothing_more_to_record"] = {
        "answer": True,
        "on": iso(TODAY),
        "about": {"opt": None, "stem": None, "cap_gap": None},
    }
    out = run(with_changes(case, confirmations=extra))
    assert "nothing_more_to_record" not in out["answers_read"]
    assert EARLIER in out["answers_read"]


def test_point_46_an_answer_for_other_values_is_not_read():
    case, _ = settle(OPT_CASE, chosen={EARLIER: False})
    moved = with_changes(case, opt=ead("2026-04-01", "2026-04-10", "2026-06-01", "2027-04-30"))
    assert EARLIER not in run(moved)["answers_read"]


def test_point_46_a_yes_to_no_employment_given_before_today_is_not_read():
    # Point 3: the yes covers the days through the day it was given. Given 2026-09-28 and
    # run 2026-09-29, the question is open again and the answer was not read.
    case = with_changes(OPT_CASE, employment=[])
    settled, _ = settle(case, date(2026, 9, 28))
    out = run(settled, TODAY)
    assert "no_employment_to_record" in question_ids(out)
    assert "no_employment_to_record" not in out["answers_read"]


# Point 40: a rule is looked up for the day of the event it governs. The shipped pack's
# STEM rows (24 months, 150 days, validations, evaluations) take effect 2016-05-10.
# A STEM card that began 2015-06-01 was a 17-month extension under 73 FR 18944, a row
# neither pack holds. Program end 2014-05-15, OPT 2014-06-01 to 2015-05-31, STEM
# 2015-06-01 to 2016-10-31 (17 months), one period over both cards, closed.
EARLY_STEM: dict[str, Any] = {
    "program_end_date": "2014-05-15",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "opt": ead("2014-04-01", "2014-04-10", "2014-06-01", "2015-05-31"),
    "stem": ead("2015-03-01", "2015-03-10", "2015-06-01", "2016-10-31"),
    "employment": [job("2014-06-01", "2016-10-31")],
    "cap_gap": None,
    "time_zone": "UTC",
}
STEM_FROM_2016 = from_day(PACK, "stem.", "2016-05-10")


def stem_rows_unused(out: dict[str, Any]) -> None:
    got = items(out)
    for item_id, item in got.items():
        if item_id.startswith("stem.validation_") or item_id == "stem.evaluation_12_month_due":
            assert item["value"] is None, item_id
        if "stem.extension_months" in item["rule_ids"]:
            assert item["value"] is None, item_id
    assert got["unemployment.days_remaining"]["value"] is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]


def test_point_40_a_stem_card_before_2016_05_10_is_never_counted_with_the_24_month_rows():
    # The state is pinned on the shipped pack below: in the test pack the blocked grace row
    # is in force from 2000, so point 25 may add the litigation reason here.
    _, out = settle(EARLY_STEM, raw_pack=STEM_FROM_2016)
    stem_rows_unused(out)
    assert contract_problems(out) == []


def test_point_40_the_shipped_pack_steps_back_on_a_stem_card_before_2016_05_10():
    _, out = settle(EARLY_STEM, pack=shipped())
    stem_rows_unused(out)
    assert out["verdict"]["state"] == "talk_to_dso"


def stem_case(stem_start: date) -> dict[str, Any]:
    """A STEM card from stem_start for 24 months, after a 12-month OPT card. The OPT card
    begins 12 months before stem_start and ends the day before it; the program ends 30
    days before the OPT card; OPT recommended 30 days before the program end and filed 5
    days on; STEM recommended 60 days before the OPT card ends and filed 5 days on (55 days
    before the card ends, inside the 90 of the window). One period over both cards,
    closed on the STEM card's last day."""
    opt_start = months_later(stem_start, -12)
    opt_end = stem_start - ONE_DAY
    program_end = opt_start - timedelta(days=30)
    opt_recommended = program_end - timedelta(days=30)
    stem_recommended = opt_end - timedelta(days=60)
    stem_end = months_later(stem_start, 24) - ONE_DAY
    return {
        "program_end_date": iso(program_end),
        "degree_level": "master",
        "documents_count": 2,
        "cpt_full_time_days": 0,
        "opt": ead(
            iso(opt_recommended),
            iso(opt_recommended + timedelta(days=5)),
            iso(opt_start),
            iso(opt_end),
        ),
        "stem": ead(
            iso(stem_recommended),
            iso(stem_recommended + timedelta(days=5)),
            iso(stem_start),
            iso(stem_end),
        ),
        "employment": [job(iso(opt_start), iso(stem_end))],
        "cap_gap": None,
        "time_zone": "UTC",
    }


def test_point_40_a_stem_card_that_began_on_2016_05_10_gets_its_validation():
    # 6 months from 2016-05-10 is Thursday 2016-11-10. Ten business days, with the list in
    # force in 2016 (no Juneteenth yet): Fri Nov 11 Veterans Day skipped; 14 (1), 15 (2),
    # 16 (3), 17 (4), 18 (5), 21 (6), 22 (7), 23 (8); Thu 24 Thanksgiving skipped; 25 (9),
    # 28 (10): 2016-11-28.
    case = stem_case(date(2016, 5, 10))
    assert case_problems(case) == []
    assert values(run(case, raw_pack=STEM_FROM_2016))["stem.validation_1_due"] == "2016-11-28"
    assert values(run(case, pack=shipped()))["stem.validation_1_due"] == "2016-11-28"


# Cap-gap: the April 1 rule applies to petitions filed on or after 2025-01-17 (89 FR
# 103054). Before, the October 1 row, whose words reach a petition that states an
# October 1 start. Program end 2023-05-15, OPT 2023-06-01 to 2024-05-31, one period over
# the card, closed. Petition approved, a change of status.
def capgap_case(filed_on: str, requested: str, card_year: int = 2023) -> dict[str, Any]:
    return {
        "program_end_date": f"{card_year}-05-15",
        "degree_level": "master",
        "documents_count": 2,
        "cpt_full_time_days": 0,
        "opt": ead(
            f"{card_year}-04-01",
            f"{card_year}-04-10",
            f"{card_year}-06-01",
            f"{card_year + 1}-05-31",
        ),
        "stem": None,
        "employment": [job(f"{card_year}-06-01", f"{card_year + 1}-05-31")],
        "cap_gap": {
            "petition_filed_on": filed_on,
            "requested_start": requested,
            "change_of_status": True,
            "status": "approved",
        },
        "time_zone": "UTC",
    }


def test_point_40_a_petition_before_2025_01_17_for_october_1_is_read_with_the_october_row():
    # The October 1 row: status runs until October 1 of the fiscal year asked for. The start
    # asked for, 2024-10-01, is the first day of fiscal year 2025, so capgap.ends is
    # 2024-10-01.
    _, out = settle(capgap_case("2024-04-02", "2024-10-01"), pack=shipped())
    assert values(out)["capgap.ends"] == "2024-10-01"
    assert NOT_IN_FORCE not in out["verdict"]["reasons"]


def test_point_40_a_petition_before_2025_01_17_for_another_start_steps_back():
    # A start of 2024-11-15 is not "October 1 of the following fiscal year": no row of the
    # pack reaches it, so capgap.ends is null and the verdict steps back to the DSO.
    _, out = settle(capgap_case("2024-04-02", "2024-11-15"), pack=shipped())
    assert values(out)["capgap.ends"] is None
    assert out["verdict"]["state"] == "talk_to_dso"


def test_point_40_a_petition_filed_on_2025_01_17_is_read_with_the_april_row():
    # Filed the day the April 1 row takes effect, for a start of 2025-11-15: on or after
    # Oct 1, so fiscal year 2026, whose April 1 is 2026-04-01; the earlier of the start and
    # that day is 2025-11-15. Not null.
    case = capgap_case("2025-01-17", "2025-11-15", card_year=2024)
    _, out = settle(case, pack=shipped())
    assert values(out)["capgap.ends"] == "2025-11-15"


def test_point_40_a_petition_filed_on_2025_01_16_for_november_steps_back():
    case = capgap_case("2025-01-16", "2025-11-15", card_year=2024)
    _, out = settle(case, pack=shipped())
    assert values(out)["capgap.ends"] is None


# Holidays: Juneteenth was inserted by Pub. L. 117-17, in force 2021-06-17. A business day
# before then is never skipped for it.


def test_point_40_a_2020_report_counts_june_19_as_a_business_day():
    # STEM from 2019-12-12: 6 months on is Friday 2020-06-12. Jun 15 (1), 16 (2), 17 (3),
    # 18 (4), Fri 19 (5), 22 (6), 23 (7), 24 (8), 25 (9), 26 (10): 2020-06-26. Skipping
    # June 19 would give 2020-06-29.
    case = stem_case(date(2019, 12, 12))
    assert values(run(case))["stem.validation_1_due"] == "2020-06-26"
    assert values(run(case, pack=shipped()))["stem.validation_1_due"] == "2020-06-26"


def test_point_40_a_2019_report_counts_june_19_as_a_business_day():
    # STEM from 2018-12-14: 6 months on is Friday 2019-06-14. Jun 17 (1), 18 (2), Wed 19
    # (3), 20 (4), 21 (5), 24 (6), 25 (7), 26 (8), 27 (9), 28 (10): 2019-06-28.
    case = stem_case(date(2018, 12, 14))
    assert values(run(case))["stem.validation_1_due"] == "2019-06-28"
    assert values(run(case, pack=shipped()))["stem.validation_1_due"] == "2019-06-28"


def test_point_40_a_2023_report_skips_june_19():
    # STEM from 2022-12-16: 6 months on is Friday 2023-06-16. Mon Jun 19 skipped; 20 (1),
    # 21 (2), 22 (3), 23 (4), 26 (5), 27 (6), 28 (7), 29 (8), 30 (9), Jul 3 (10): 2023-07-03.
    case = stem_case(date(2022, 12, 16))
    assert values(run(case, pack=shipped()))["stem.validation_1_due"] == "2023-07-03"


def test_point_40_a_count_before_the_pack_holds_a_holiday_list_steps_back():
    # A pack whose holiday list takes effect 2021-06-17 holds no list for June 2020, so the
    # report date whose count crosses those days is null, with the step back.
    raw = from_day(PACK, "calendar.", "2021-06-17")
    _, out = settle(stem_case(date(2019, 12, 12)), raw_pack=raw)
    assert values(out)["stem.validation_1_due"] is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]


# Point 47: an event before a pack's earliest row steps back to the DSO. The shipped OPT
# window rows take effect 2008-04-08. Program end 2008-01-15, recommended 2007-12-01, filed
# 2007-12-10, card 2008-02-01 to 2009-01-31, one period over it, closed.
EVENT_2008: dict[str, Any] = with_changes(
    OPT_CASE,
    program_end_date="2008-01-15",
    opt=ead("2007-12-01", "2007-12-10", "2008-02-01", "2009-01-31"),
    employment=[job("2008-02-01", "2009-01-31")],
)


def test_point_47_a_program_end_before_2008_04_08_gets_no_window_close():
    _, out = settle(EVENT_2008, pack=shipped())
    assert values(out)["opt.apply_window_closes"] is None
    assert values(out)["opt.latest_start"] is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] == "talk_to_dso"
    assert contract_problems(out) == []


def test_point_47_a_program_end_on_2008_04_08_gets_its_window_close():
    # 2008-04-08 plus 60 days: 22 reach Apr 30, 31 May 31, 7 more 2008-06-07.
    case = with_changes(
        EVENT_2008,
        program_end_date="2008-04-08",
        opt=ead("2008-03-01", "2008-03-10", "2008-05-01", "2009-04-30"),
        employment=[job("2008-05-01", "2009-04-30")],
    )
    out = run(case, pack=shipped())
    assert values(out)["opt.apply_window_closes"] == "2008-06-07"
    assert values(out)["opt.latest_start"] == "2008-06-07"


# Point 48: validations only while the STEM card runs; evaluations likewise, with the final
# one from the card's end. OPT 2025-03-14 to 2026-03-13, program end 2025-01-15, STEM from
# 2026-03-14, as in tests/unit/engine/test_f1_periods_and_reports.py. The period covers
# the OPT card and the STEM card and ends with the STEM card.
def stem_to(stem_end: date) -> dict[str, Any]:
    return {
        "program_end_date": "2025-01-15",
        "degree_level": "master",
        "documents_count": 2,
        "cpt_full_time_days": 0,
        "opt": ead("2024-12-01", "2024-12-10", "2025-03-14", "2026-03-13"),
        "stem": ead("2026-01-10", "2026-01-20", "2026-03-14", iso(stem_end)),
        "employment": [job("2025-03-14", iso(stem_end))],
        "cap_gap": None,
        "time_zone": "UTC",
    }


STEM_CASE = stem_to(date(2028, 3, 13))


def dated_reports(out: dict[str, Any]) -> dict[str, str]:
    return {
        item_id: item["value"]
        for item_id, item in items(out).items()
        if item["value"] is not None
        and (item_id.startswith("stem.validation_") or item_id == "stem.evaluation_12_month_due")
    }


def test_point_48_the_case_of_the_review_lists_no_validation():
    # STEM card 2026-03-14 to 2026-06-30. The first validation would be 6 months on,
    # 2026-09-14, after the card ended; the 12-month evaluation 2027-03-14, after it too.
    # The final evaluation: 2026-06-30 plus 10 days, 2026-07-10.
    case = stem_to(date(2026, 6, 30))
    assert case_problems(case) == []
    out = run(case)
    assert dated_reports(out) == {}
    assert values(out)["stem.final_evaluation_due_from_ead_end"] == "2026-07-10"
    assert [e for e in upcoming(out) if e.startswith("stem.validation_")] == []


def test_point_48_a_card_to_january_2027_has_one_validation():
    # STEM card 2026-03-14 to 2027-01-31. Validation 1: Monday 2026-09-14 plus ten business
    # days, 15 (1) to 18 (4), 21 (5) to 25 (9), 28 (10): 2026-09-28, inside the card.
    # Validation 2 would begin 2027-03-14, after the card. The 12-month evaluation too.
    out = run(stem_to(date(2027, 1, 31)))
    assert dated_reports(out) == {"stem.validation_1_due": "2026-09-28"}


@settings(deadline=None, max_examples=30)
@given(st.integers(min_value=1, max_value=730))
def test_point_48_no_report_is_dated_after_the_stem_card(days):
    # The card begins 2026-03-14 and runs `days` more days, never past 24 months
    # (2028-03-13 is 730 days on).
    stem_end = date(2026, 3, 14) + timedelta(days=days)
    out = run(stem_to(stem_end))
    for item_id, value in dated_reports(out).items():
        assert date.fromisoformat(value) <= stem_end, item_id
    # The first validation, 2026-09-28, is inside every card that runs to it or later.
    if stem_end >= date(2026, 9, 28):
        assert values(out)["stem.validation_1_due"] == "2026-09-28"


# Point 49: an alternate counts only where the item and the alternate both hold a value and
# the values differ. The OPT card of OPEN_AFTER_CASE ended 2026-05-31, before today, and
# every period is closed.
ENDED: dict[str, Any] = with_changes(OPEN_AFTER_CASE, employment=[job("2025-06-01", "2026-05-31")])


def test_point_49_differing_values_still_give_rule_in_litigation():
    # grace.ends: 2026-05-31 plus 60 is 2026-07-30 (30 reach Jun 30, 30 more); the blocked
    # row's 30 give 2026-06-30. Both hold a value and they differ.
    _, out = settle(ENDED)
    assert values(out)["grace.ends"] == "2026-07-30"
    assert LITIGATION in out["verdict"]["reasons"]


def test_point_49_a_null_item_with_a_null_alternate_gives_no_rule_in_litigation():
    # With a cap-gap petition to 2026-10-01 past the card end, grace.ends is null (point
    # 18) and so is anything the blocked row would give for it.
    case = with_changes(ENDED, cap_gap=WITH_CAP_GAP["cap_gap"])
    _, out = settle(case)
    assert values(out)["grace.ends"] is None
    assert LITIGATION not in out["verdict"]["reasons"]
    assert "grace_with_cap_gap" in out["verdict"]["reasons"]


def test_point_49_equal_values_give_no_rule_in_litigation():
    raw = pack_dict(TODAY, values={("grace.after_completion_days", BLOCKED): 60})
    _, out = settle(ENDED, raw_pack=raw)
    assert values(out)["grace.ends"] == "2026-07-30"
    assert LITIGATION not in out["verdict"]["reasons"]


# Point 50: on a STEM card, the report of a change of employer or a loss of employment
# names 8 CFR 214.2(f)(12)(ii)(A), stem.report_change_within_days, settled. The test pack
# gains the rule with 10 days; a second copy has 7, to show the days come from it. The
# period ends 2026-06-30, on the STEM card, and its end was not reported.
WITH_STEM_REPORT = with_rule(
    PACK, STEM_REPORT_RULE, 10, "days", "settled", "8 CFR 214.2(f)(12)(ii)(A)"
)
ENDED_ON_STEM = with_changes(STEM_CASE, employment=[job("2025-03-14", "2026-06-30")])
END_REPORTED_NO = {"employment.1.end_reported": False}


def report_items(out: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        item
        for item in items(out).values()
        if item["unit"] == "date" and {STEM_REPORT_RULE, OPT_REPORT_RULE} & set(item["rule_ids"])
    ]


def test_point_50_on_a_stem_card_the_report_names_the_regulation():
    # 2026-06-30 plus 10 days: 2026-07-10.
    _, out = settle(ENDED_ON_STEM, chosen=END_REPORTED_NO, raw_pack=WITH_STEM_REPORT)
    found = report_items(out)
    assert [item["value"] for item in found] == ["2026-07-10"]
    assert STEM_REPORT_RULE in found[0]["rule_ids"]
    assert OPT_REPORT_RULE not in found[0]["rule_ids"]
    assert found[0]["status"] == "settled"
    assert out["rules"][STEM_REPORT_RULE]["citation"] == "8 CFR 214.2(f)(12)(ii)(A)"
    assert "report_employer" in out["verdict"]["reasons"]


def test_point_50_the_days_come_from_the_stem_rule():
    # 2026-06-30 plus 7 days: 2026-07-07.
    raw = with_rule(PACK, STEM_REPORT_RULE, 7, "days", "settled", "8 CFR 214.2(f)(12)(ii)(A)")
    _, out = settle(ENDED_ON_STEM, chosen=END_REPORTED_NO, raw_pack=raw)
    assert [item["value"] for item in report_items(out)] == ["2026-07-07"]


def test_point_50_on_an_opt_card_the_report_stays_guidance():
    # OPEN_AFTER_CASE's first period ends 2026-05-31, on the OPT card; the second is gone.
    # 2026-05-31 plus 10 days: 2026-06-10.
    case = with_changes(OPEN_AFTER_CASE, employment=[job("2025-06-01", "2026-05-31")])
    _, out = settle(case, chosen=END_REPORTED_NO, raw_pack=WITH_STEM_REPORT)
    found = report_items(out)
    assert [item["value"] for item in found] == ["2026-06-10"]
    assert OPT_REPORT_RULE in found[0]["rule_ids"]
    assert STEM_REPORT_RULE not in found[0]["rule_ids"]
    assert found[0]["status"] == "guidance"


# specs/plain-1/SPEC.md, section 1, and contracts/engine_output.schema.json: every rule in
# the output's rules carries the pack's plain words; regimes names every regime an item
# depends on, with its plain words, citation and url.
PLAIN_PACK = with_plain(PACK)


def test_plain_every_rule_in_the_output_carries_the_packs_plain_words():
    _, out = settle(STEM_CASE, raw_pack=PLAIN_PACK)
    assert out["rules"]
    for rule_id, shown in out["rules"].items():
        assert shown.get("plain") == plain_of(rule_id, shown.get("regime", "")), rule_id
    assert contract_problems(out) == []


def test_plain_every_rule_from_the_shipped_pack_carries_its_plain_words():
    pack = shipped()
    by_id: dict[str, set[str]] = {}
    for parameter in pack.parameters:
        by_id.setdefault(parameter["id"], set()).add(parameter.get("plain", ""))
    _, out = settle(STEM_CASE, pack=pack)
    assert out["rules"]
    for rule_id, shown in out["rules"].items():
        assert shown.get("plain", "").strip(), rule_id
        assert shown["plain"] in by_id[rule_id], rule_id


def test_plain_the_shipped_regimes_carry_their_plain_words():
    pack = shipped()
    _, out = settle(OPT_CASE, pack=pack)
    assert regimes_named(out)
    for regime in pack.regimes:
        if regime["id"] in regimes_named(out):
            assert out["regimes"][regime["id"]]["plain"] == regime["plain"]
            assert out["regimes"][regime["id"]]["url"] == regime["source"]["url"]


def regimes_named(out: dict[str, Any]) -> set[str]:
    named: set[str] = set()
    for entry in [*out["computed"], *out["upcoming"]]:
        if "operative" in entry:
            named.add(entry["operative"]["regime"])
        named.update(alternate["regime"] for alternate in entry.get("alternates", []))
    return named


def test_plain_regimes_names_every_regime_an_item_depends_on():
    # grace.ends, 2027-07-30, is ahead with the blocked row's 2027-06-30 as its alternate.
    _, out = settle(OPT_CASE, raw_pack=PLAIN_PACK)
    named = regimes_named(out)
    assert {OPERATIVE, BLOCKED} <= named
    assert set(out["regimes"]) == named
    assert contract_problems(out) == []


def test_plain_each_regime_carries_its_plain_words_citation_and_url():
    _, out = settle(OPT_CASE, raw_pack=PLAIN_PACK)
    for regime in PLAIN_PACK["regimes"]:
        shown = out["regimes"][regime["id"]]
        assert shown["plain"] == regime["plain"]
        assert shown["citation"] == regime["source"]["citation"]
        assert shown["url"] == regime["source"]["url"]
        assert shown["legal_status"] == regime["legal_status"]
        assert shown["operative"] == regime["operative"]


def test_plain_regimes_on_a_case_long_past_match_the_regimes_named():
    # EVENT_2008 on the test pack, whose blocked row is in force from 2000: regimes names
    # what the items name, and nothing more.
    _, out = settle(EVENT_2008, raw_pack=PLAIN_PACK)
    assert set(out["regimes"]) == regimes_named(out)


def test_plain_no_regime_named_leaves_regimes_empty():
    # A pack whose grace period has one row, under no regime: no item carries an operative
    # or an alternate, so regimes names none.
    raw = copy.deepcopy(PLAIN_PACK)
    raw["parameters"] = [
        p
        for p in raw["parameters"]
        if not (p["id"] == "grace.after_completion_days" and p.get("regime") == BLOCKED)
    ]
    for p in raw["parameters"]:
        if p["id"] == "grace.after_completion_days":
            p.pop("regime", None)
            p["status"] = "settled"
    _, out = settle(OPT_CASE, raw_pack=raw)
    assert regimes_named(out) == set()
    assert out.get("regimes", {}) == {}
