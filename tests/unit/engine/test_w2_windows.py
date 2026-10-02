"""W2-P1: the dates Plan needs. specs/step-w/SPEC-W2.md points 45 (P1, P2, P3), 46 (N1) and 49,
gap map rows G5, G7, G13 and G16, over contracts/rulepack.schema.json ($defs.amount, the
setting description; $defs.window rule_ids) and contracts/engine_output.schema.json (planning)
as W2-P0 left them, and contracts/product_settings.yaml (K1, plan.prepare_months).

- P1, G5: the windows opt.last_day and stem.last_day close on the earliest of the filing
  window's close and the recommendation limit.
- P2, N1, G13: a window whose amount names a product setting is a planning window, marked
  planning: true on the window, its computed items and its upcoming entries; its rule_ids are
  the rules of the step it prepares for; the setting is never a rule.
- P3, G7: a report window on a job's start, only where a saved rule gives the days. An hours
  change gets none: no saved source gives its days (founder decision 2026-10-01, point 45).
- P1: with no recommendation date the last day is not known; the date is asked (founder
  decision 2026-10-01, point 45).
- The loader refuses a setting anywhere but the opens or closes of a stage window.

Every number a date is worked from is first read from the saved words of its source
(tests/support/w2_pack.py, number_in_saved_words), then the date is worked by hand beside the
assertion. The window ids opt.last_day and stem.last_day are SPEC-W2 G5's; the SPEC names no id
for a prepare or a report window, so those are found by what they are: planning, or the job
record and the rule. Written before the engine and the pack have them: they cannot pass yet.
"""

import calendar
import dataclasses
from datetime import date, timedelta
from typing import Any

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from engine.rulepack import RulepackError, validate_pack
from engine.settings import load_settings, whole_setting
from tests.support.w2_pack import (
    compute,
    f1_pack,
    items,
    number_in_saved_words,
    rec,
    schema_problems,
    stage_of,
    toy_case,
    toy_pack,
    toy_pack_dict,
    toy_stage,
    windows,
    windows_named,
)

TODAY = date(2026, 9, 29)  # a Tuesday
PACK = f1_pack()
SETTING = "plan.prepare_months"
SETTING_IDS = {entry["id"] for entry in load_settings()["settings"]}

# The saved words first. Each number below is found in the rule's quote and in its saved copy.
OPT_AFTER = number_in_saved_words(
    PACK, "opt.apply_after_days", r"no later than (\d+) days after his or her program end", TODAY
)
OPT_BEFORE = number_in_saved_words(
    PACK, "opt.apply_before_days", r"up to (\d+) days prior to his or her program end", TODAY
)
OPT_REC = number_in_saved_words(
    PACK,
    "opt.file_within_days_of_recommendation",
    r"within (\d+) days of the date the dso enters the recommendation for opt",
    TODAY,
)
STEM_BEFORE = number_in_saved_words(
    PACK, "stem.apply_before_expiry_days", r"up to (\d+) days prior to the expiration date", TODAY
)
STEM_REC = number_in_saved_words(
    PACK,
    "stem.file_within_days_of_recommendation",
    r"within (\d+) days of the date the dso enters the recommendation for the opt extension",
    TODAY,
)
OPT_REPORT = number_in_saved_words(
    PACK,
    "opt.report_employer_within_days",
    r"report to the dso within (\d+) days any changes in the student's name or address, and "
    r"employment information",
    TODAY,
)
NEW_PLAN = number_in_saved_words(
    PACK,
    "stem.new_plan_due_days",
    r"within (\d+) days of beginning the new practical training opportunity",
    TODAY,
)
# K1: plan.prepare_months is 1 month (SPEC-W2 point 39). The engine reads it from the file.
PREPARE_MONTHS = whole_setting(load_settings(), SETTING)


def months_before(day: date, months: int) -> date:
    """The same day `months` earlier, on the month's last day where it has no such day
    (specs/path-1/programs.md 13 point 12, as the engine moves months)."""
    month0 = day.year * 12 + day.month - 1 - months
    year, month = divmod(month0, 12)
    last = calendar.monthrange(year, month + 1)[1]
    return date(year, month + 1, min(day.day, last))


def test_the_numbers_the_dates_are_worked_from_are_the_saved_words():
    # Read from the saved copies above; pinned here so that the hand working below cannot
    # drift from the words unseen. (f)(11)(i)(B)(2): 90 days prior, 60 days after, within 30
    # days of the recommendation; (f)(11)(i)(C): 90 days prior to the expiration, within 60
    # days; SEVP guidance: within 10 days; (f)(10)(ii)(C)(7)(iv): within 10 days of beginning.
    assert (OPT_BEFORE, OPT_AFTER, OPT_REC) == (90, 60, 30)
    assert (STEM_BEFORE, STEM_REC) == (90, 60)
    assert (OPT_REPORT, NEW_PLAN) == (10, 10)
    assert PREPARE_MONTHS == 1


# The cases, on the shipped F-1 pack. A field the case does not give is left out.

LISTS_WHOLE = ("program", "authorization", "work", "trip", "move", "petition", "withdrawal")


def f1_case(records: list[dict[str, Any]], on: date = TODAY) -> dict[str, Any]:
    stated = {"on": on.isoformat()}
    return {
        "categories": ["f1"],
        "time_zone": "UTC",
        "facts": {},
        "records": records,
        "complete": dict.fromkeys(LISTS_WHOLE, stated),
        "confirmations": {},
    }


def masters(end: str) -> dict[str, Any]:
    return rec(
        "p1",
        "program",
        where="us_on_f1",
        level="master",
        stem_list="on_list",
        end_date=end,
        state="completed",
    )


def opt_card(dso_on: str, filed_on: str, start: str, end: str, **extra: Any) -> dict[str, Any]:
    return rec(
        "a1",
        "authorization",
        type="opt_post_completion",
        program="p1",
        decision="approved",
        dso_on=dso_on,
        filed_on=filed_on,
        card_start=start,
        card_end=end,
        **extra,
    )


def stem_card(dso_on: str, filed_on: str, **extra: Any) -> dict[str, Any]:
    return rec(
        "a2",
        "authorization",
        type="stem_extension",
        program="p1",
        extends="a1",
        basis_program="p1",
        decision="approved",
        dso_on=dso_on,
        filed_on=filed_on,
        card_start="2026-07-01",
        card_end="2028-06-30",
        **extra,
    )


def one_window(out: dict[str, Any], window_id: str) -> dict[str, Any]:
    found = [w for w in windows_named(out, window_id) if w["closes"] is not None]
    assert len(found) == 1, [w["id"] for w in windows(out)]
    return found[0]


# P1, G5: the last day.

# Program end 2026-05-15. The filing window closes 60 days on: 16 days of May reach May 31,
# 30 of June reach Jun 30, 14 more 2026-07-14. Card 2026-06-01 to 2027-05-31.


def opt_last_day_case(dso_on: str, filed_on: str, start: str, end: str) -> dict[str, Any]:
    return f1_case([masters("2026-05-15"), opt_card(dso_on, filed_on, start, end)])


def test_opt_last_day_is_the_recommendation_limit_when_it_comes_first():
    # Recommended 2026-04-01; 30 days on is 2026-05-01, before the window's 2026-07-14.
    case = opt_last_day_case("2026-04-01", "2026-04-10", "2026-06-01", "2027-05-31")
    out = compute(case, [PACK], TODAY)
    assert date(2026, 4, 1) + timedelta(days=OPT_REC) == date(2026, 5, 1)
    assert one_window(out, "opt.last_day")["closes"] == "2026-05-01"


def test_opt_last_day_is_the_window_close_when_it_comes_first():
    # Recommended 2026-06-20; 30 days on: 10 of June reach Jun 30, 20 more 2026-07-20, after
    # the window's 2026-07-14. Filed 2026-06-25, card from 2026-08-01.
    case = opt_last_day_case("2026-06-20", "2026-06-25", "2026-08-01", "2027-07-31")
    out = compute(case, [PACK], TODAY)
    assert date(2026, 5, 15) + timedelta(days=OPT_AFTER) == date(2026, 7, 14)
    last = one_window(out, "opt.last_day")
    assert last["closes"] == "2026-07-14"


def test_opt_last_day_names_both_rules_and_is_no_planning_date():
    # G5: "the earliest of the filing window's close and the recommendation limit". Both are
    # rules; neither is a setting. opt.apply_after_days is litigated, so the window is too
    # (the weakest status among the rules used).
    case = opt_last_day_case("2026-04-01", "2026-04-10", "2026-06-01", "2027-05-31")
    last = one_window(compute(case, [PACK], TODAY), "opt.last_day")
    assert {"opt.apply_after_days", "opt.file_within_days_of_recommendation"} <= set(
        last["rule_ids"]
    )
    assert last["status"] == "litigated"
    assert "planning" not in last


def asks_for(out: dict[str, Any], field: str) -> bool:
    return any(f"missing:{field}" in q["because"] for q in out["questions"])


def test_opt_last_day_with_no_recommendation_date_is_no_date():
    # The earliest of a known day and an unknown one is not known (CLAUDE.md: missing means
    # cannot_tell). The window close alone is never shown as the last day. SPEC-W2 point 45,
    # founder decision 2026-10-01: the recommendation date is not optional, it is asked. The
    # case is cannot_tell for other reasons too, so the reason and the question are named.
    card = opt_card("2026-04-01", "2026-04-10", "2026-06-01", "2027-05-31")
    del card["fields"]["dso_on"]
    out = compute(f1_case([masters("2026-05-15"), card]), [PACK], TODAY)
    assert [w["closes"] for w in windows_named(out, "opt.last_day")] in ([], [None])
    assert out["verdict"]["state"] == "cannot_tell"
    assert "missing:a1.dso_on" in out["verdict"]["reasons"]
    assert asks_for(out, "a1.dso_on")


# OPT card 2025-07-01 to 2026-06-30 (program end 2025-05-15). The STEM window closes with the
# card, 2026-06-30, and opens 90 days before: 30 days back reach May 31, 31 more Apr 30, 29
# more 2026-04-01.


def stem_last_day_case(dso_on: str, filed_on: str) -> dict[str, Any]:
    opt = opt_card("2025-04-01", "2025-04-10", "2025-07-01", "2026-06-30")
    return f1_case([masters("2025-05-15"), opt, stem_card(dso_on, filed_on)])


def test_stem_last_day_is_the_recommendation_limit_when_it_comes_first():
    # Recommended 2026-04-05; 60 days on: 25 of April reach Apr 30, 31 of May reach May 31,
    # 4 more 2026-06-04, before the card's end 2026-06-30.
    out = compute(stem_last_day_case("2026-04-05", "2026-04-10"), [PACK], TODAY)
    assert date(2026, 4, 5) + timedelta(days=STEM_REC) == date(2026, 6, 4)
    assert one_window(out, "stem.last_day")["closes"] == "2026-06-04"


def test_stem_last_day_is_the_card_end_when_it_comes_first():
    # Recommended 2026-05-15; 60 days on: 16 of May reach May 31, 30 of June reach Jun 30,
    # 14 more 2026-07-14, after the card's end 2026-06-30.
    out = compute(stem_last_day_case("2026-05-15", "2026-05-20"), [PACK], TODAY)
    last = one_window(out, "stem.last_day")
    assert last["closes"] == "2026-06-30"
    assert {"stem.apply_window_closes_rule", "stem.file_within_days_of_recommendation"} <= set(
        last["rule_ids"]
    )
    assert "planning" not in last


def test_stem_last_day_with_no_recommendation_date_is_no_date():
    # SPEC-W2 point 45, founder decision 2026-10-01, as for OPT above: the card's end
    # 2026-06-30 alone is never shown as the last day; the recommendation date is asked.
    case = stem_last_day_case("2026-04-05", "2026-04-10")
    del case["records"][2]["fields"]["dso_on"]
    out = compute(case, [PACK], TODAY)
    assert [w["closes"] for w in windows_named(out, "stem.last_day")] in ([], [None])
    assert out["verdict"]["state"] == "cannot_tell"
    assert "missing:a2.dso_on" in out["verdict"]["reasons"]
    assert asks_for(out, "a2.dso_on")


@settings(deadline=None, max_examples=25)
@given(st.integers(min_value=0, max_value=60))
def test_opt_last_day_is_never_after_either_limit(shift):
    # Recommended `shift` days after 2026-04-01, filed the day after. The last day is the
    # earlier of 2026-07-14 and the recommendation plus 30 days.
    dso_on = date(2026, 4, 1) + timedelta(days=shift)
    case = opt_last_day_case(
        dso_on.isoformat(),
        (dso_on + timedelta(days=1)).isoformat(),
        "2026-08-01",
        "2027-07-31",
    )
    expected = min(date(2026, 7, 14), dso_on + timedelta(days=OPT_REC))
    assert one_window(compute(case, [PACK], TODAY), "opt.last_day")["closes"] == (
        expected.isoformat()
    )


# P2, N1, G13: the prepare windows on the shipped pack.

# The OPT case of P1: the OPT filing window opens 90 days before 2026-05-15: 15 days back
# reach Apr 30, 30 more Mar 31, 28 more Mar 3, 17 more 2026-02-14. The STEM window of the
# card a1 (to 2027-05-31) opens 90 days before: 31 back reach Apr 30, 30 more Mar 31, 29
# more 2027-03-02.
PREPARE_CASE = opt_last_day_case("2026-04-01", "2026-04-10", "2026-06-01", "2027-05-31")


def planning_windows(stage: dict[str, Any]) -> list[dict[str, Any]]:
    return [w for w in stage["windows"] if w.get("planning") is True]


def filing_window(stage: dict[str, Any], window_id: str) -> dict[str, Any]:
    found = [w for w in stage["windows"] if w["id"].startswith(window_id + ".")]
    assert len(found) == 1
    return found[0]


@pytest.mark.parametrize(
    ("stage_id", "filing", "opens"),
    [
        # 2026-02-14 less one month: 2026-01-14.
        ("opt_post.a1", "opt.apply_window", "2026-01-14"),
        # 2027-03-02 less one month: 2027-02-02.
        ("stem.a1", "stem.apply_window", "2027-02-02"),
    ],
)
def test_a_prepare_window_opens_the_setting_s_months_before_the_filing_window(
    stage_id, filing, opens
):
    out = compute(PREPARE_CASE, [PACK], TODAY)
    stage = stage_of(out, stage_id)
    window = filing_window(stage, filing)
    assert months_before(date.fromisoformat(window["opens"]), PREPARE_MONTHS).isoformat() == opens
    prepare = planning_windows(stage)
    assert len(prepare) == 1, [w["id"] for w in stage["windows"]]
    assert prepare[0]["opens"] == opens
    # The Prepare span comes before the Filing span (G13); it never runs past its opening.
    assert prepare[0]["closes"] is not None
    assert prepare[0]["closes"] <= window["opens"]


@pytest.mark.parametrize(
    ("stage_id", "filing"),
    [("opt_post.a1", "opt.apply_window"), ("stem.a1", "stem.apply_window")],
)
def test_a_prepare_window_rests_on_the_rules_of_the_step_it_prepares_for(stage_id, filing):
    # rulepack.schema.json $defs.window rule_ids: "For a planning window, the rules of the
    # step it prepares for; the setting itself is never a rule".
    out = compute(PREPARE_CASE, [PACK], TODAY)
    stage = stage_of(out, stage_id)
    prepare = planning_windows(stage)[0]
    assert prepare["rule_ids"]
    assert set(prepare["rule_ids"]) <= set(filing_window(stage, filing)["rule_ids"])
    assert not set(prepare["rule_ids"]) & SETTING_IDS
    assert not set(out["rules"]) & SETTING_IDS


def test_only_planning_windows_carry_planning_and_their_items_carry_it_too():
    # engine_output.schema.json planning: "Present and true when a date here is set from a
    # product setting ... Absent on every date that rests on rules alone".
    out = compute(PREPARE_CASE, [PACK], TODAY)
    planned = [w for w in windows(out) if "planning" in w]
    assert planned, "no planning window"
    assert all(w["planning"] is True for w in planned)
    planned_ids = {w["id"] for w in planned}
    for item_id, item in items(out).items():
        # A window's items are <window>.opens.<key> and <window>.closes.<key>.
        window_id = item_id.replace(".opens.", ".").replace(".closes.", ".")
        if window_id in planned_ids:
            assert item.get("planning") is True, item_id
        elif "planning" in item:
            raise AssertionError(f"{item_id} rests on rules alone and says planning")
    for entry in out["upcoming"]:
        window_id = entry["id"].replace(".opens.", ".").replace(".closes.", ".")
        assert ("planning" in entry) is (window_id in planned_ids), entry["id"]


def test_a_prepare_window_lands_on_the_month_s_last_day_when_it_has_no_such_day():
    # Program end 2026-06-29. The OPT window opens 90 days before: 29 back reach May 31, 31
    # more Apr 30, 30 more 2026-03-31. One month before 2026-03-31 is 2026-02-28 (February
    # 2026 has 28 days).
    case = f1_case(
        [masters("2026-06-29"), opt_card("2026-05-01", "2026-05-10", "2026-07-15", "2027-07-14")]
    )
    stage = stage_of(compute(case, [PACK], TODAY), "opt_post.a1")
    assert filing_window(stage, "opt.apply_window")["opens"] == "2026-03-31"
    assert planning_windows(stage)[0]["opens"] == "2026-02-28"


# P3, G7: report windows on a job's start; none on an hours change (point 45, 2026-10-01).

EMPLOYER = rec("e1", "employer", name="Employer One", e_verify="yes")
OTHER_EMPLOYER = rec("e2", "employer", name="Employer Two", e_verify="yes")


def report_windows(out: dict[str, Any], record: str, rule: str) -> set[tuple[Any, Any]]:
    return {
        (w["opens"], w["closes"])
        for w in windows(out)
        if w.get("record") == record and rule in w["rule_ids"]
    }


def opt_job(**extra: Any) -> dict[str, Any]:
    return rec("w1", "work", employer="e1", under="a1", hours_per_week=40, **extra)


def opt_job_case(job: dict[str, Any]) -> dict[str, Any]:
    opt = opt_card("2026-04-01", "2026-04-10", "2026-06-01", "2027-05-31")
    return f1_case([masters("2026-05-15"), opt, EMPLOYER, job])


def test_an_opt_job_start_gives_a_report_window_from_the_guidance():
    # Job from 2026-07-01. SEVP guidance: within 10 days. 2026-07-01 plus 10 is 2026-07-11.
    out = compute(opt_job_case(opt_job(start="2026-07-01")), [PACK], TODAY)
    assert report_windows(out, "w1", "opt.report_employer_within_days") == {
        ("2026-07-01", "2026-07-11")
    }
    assert date(2026, 7, 1) + timedelta(days=OPT_REPORT) == date(2026, 7, 11)


def test_the_report_window_carries_the_guidance_tag():
    # G7: opt.report_employer_within_days is "tagged guidance"; the regulation, (f)(12)(i),
    # states no number of days, so the window is never shown as settled.
    out = compute(opt_job_case(opt_job(start="2026-07-01")), [PACK], TODAY)
    found = [
        w
        for w in windows(out)
        if w.get("record") == "w1" and "opt.report_employer_within_days" in w["rule_ids"]
    ]
    assert [w["status"] for w in found] == ["guidance"]
    assert "planning" not in found[0]


def test_an_opt_hours_change_gives_no_report_window_of_its_own():
    # Job from 2026-07-01 at 40 hours; from 2026-09-01 at 25 hours, still running. No saved
    # source gives a number of days for reporting a change of hours on post-completion OPT
    # ((f)(12)(i) states none; the SEVP page names no hours), so Duly gives no date for it
    # (CLAUDE.md: if the law does not state a number, Duly does not have it). The start keeps
    # its own window, 2026-07-01 to 2026-07-11. Founder decision 2026-10-01, SPEC-W2 point 45.
    job = opt_job(start="2026-07-01", hours_changes=[{"start": "2026-09-01", "hours_per_week": 25}])
    out = compute(opt_job_case(job), [PACK], TODAY)
    assert report_windows(out, "w1", "opt.report_employer_within_days") == {
        ("2026-07-01", "2026-07-11"),
    }


def test_a_job_with_no_start_gives_no_report_date():
    # The start is the day the window is worked from. Without it there is no date, and the
    # start is asked (CLAUDE.md: confirm, never assume).
    out = compute(opt_job_case(opt_job()), [PACK], TODAY)
    dated = {
        pair
        for pair in report_windows(out, "w1", "opt.report_employer_within_days")
        if pair != (None, None)
    }
    assert dated == set()
    assert out["verdict"]["state"] == "cannot_tell"


@settings(deadline=None, max_examples=25)
@given(st.integers(min_value=0, max_value=110))
def test_the_job_start_report_moves_with_the_start(offset):
    # Start `offset` days after 2026-06-01 (at most 2026-09-19, before today and inside the
    # card). The window closes 10 days after the start.
    start = date(2026, 6, 1) + timedelta(days=offset)
    out = compute(opt_job_case(opt_job(start=start.isoformat())), [PACK], TODAY)
    assert report_windows(out, "w1", "opt.report_employer_within_days") == {
        (start.isoformat(), (start + timedelta(days=OPT_REPORT)).isoformat())
    }


# STEM: (f)(10)(ii)(C)(7)(iv), "a new practical training opportunity with a new employer
# during his or her 24-month OPT extension": a new Form I-983 within 10 days of beginning it.


def stem_jobs_case(*jobs: dict[str, Any]) -> dict[str, Any]:
    opt = opt_card("2025-04-01", "2025-04-10", "2025-07-01", "2026-06-30")
    stem = stem_card("2026-04-05", "2026-04-10", employer="e1")
    return f1_case([masters("2025-05-15"), opt, stem, EMPLOYER, OTHER_EMPLOYER, *jobs])


def test_a_new_employer_during_stem_gives_the_new_plan_window():
    # w1 with e1 (the employer the STEM card names) from 2026-07-01; w2 with e2 from
    # 2026-08-03. 2026-08-03 plus 10 is 2026-08-13.
    w1 = rec("w1", "work", employer="e1", under="a2", start="2026-07-01", hours_per_week=40)
    w2 = rec("w2", "work", employer="e2", under="a2", start="2026-08-03", hours_per_week=40)
    out = compute(stem_jobs_case(w1, w2), [PACK], TODAY)
    assert date(2026, 8, 3) + timedelta(days=NEW_PLAN) == date(2026, 8, 13)
    assert report_windows(out, "w2", "stem.new_plan_due_days") == {("2026-08-03", "2026-08-13")}


def test_the_employer_the_stem_card_names_is_not_a_new_employer():
    # The saved words tie the 10 days to a new employer. w1 is with e1, the STEM card's own
    # employer, so it gets no new plan window.
    w1 = rec("w1", "work", employer="e1", under="a2", start="2026-07-01", hours_per_week=40)
    out = compute(stem_jobs_case(w1), [PACK], TODAY)
    assert report_windows(out, "w1", "stem.new_plan_due_days") == set()


# reviews/w2-p1.md finding 4: the STEM report window and "during the extension".

STEM_REPORT = number_in_saved_words(
    PACK, "stem.report_change_within_days", r"within (\d+) days of the change", TODAY
)


def stem_new_employer_case(start: str) -> dict[str, Any]:
    # w1 with e1 (the STEM card's own employer) 2026-07-01 to 2026-08-02; w2 with e2 from
    # `start`. The STEM card a2 runs from 2026-07-01.
    w1 = rec(
        "w1",
        "work",
        employer="e1",
        under="a2",
        start="2026-07-01",
        end="2026-08-02",
        hours_per_week=40,
    )
    w2 = rec("w2", "work", employer="e2", under="a2", start=start, hours_per_week=40)
    return stem_jobs_case(w1, w2)


def test_a_new_employer_during_stem_gives_the_report_window_from_its_own_rule():
    # (f)(12)(ii)(A): "Within 10 days of the change ... employer name, employer address". w2
    # begins 2026-08-03: 2026-08-03 plus 10 is 2026-08-13 (Aug 3 + 10 days, inside August).
    # Fails if: the report window is dropped, dated from the job's end, or given business days.
    out = compute(stem_new_employer_case("2026-08-03"), [PACK], TODAY)
    assert STEM_REPORT == 10
    assert date(2026, 8, 3) + timedelta(days=STEM_REPORT) == date(2026, 8, 13)
    assert report_windows(out, "w2", "stem.report_change_within_days") == {
        ("2026-08-03", "2026-08-13")
    }


def _with_rule_value(rule_id: str, value: int) -> Any:
    rows = tuple(dict(p, value=value) if p["id"] == rule_id else p for p in PACK.parameters)
    return dataclasses.replace(PACK, parameters=rows)


def test_the_stem_report_window_is_worked_from_the_report_rule_not_the_new_plan_rule():
    # Finding 4, mutant M5. The shipped stem.report_change_within_days and
    # stem.new_plan_due_days both say 10, so only a pack where they differ tells which one a
    # window reads. With the report rule at 11 (a test pack, not the law): the report window
    # closes 2026-08-03 plus 11, 2026-08-14; the new plan window keeps 10, 2026-08-13.
    # Fails if: stem_job_start.report closes on stem.new_plan_due_days.
    pack = _with_rule_value("stem.report_change_within_days", 11)
    out = compute(stem_new_employer_case("2026-08-03"), [pack], TODAY)
    assert report_windows(out, "w2", "stem.report_change_within_days") == {
        ("2026-08-03", "2026-08-14")
    }
    assert report_windows(out, "w2", "stem.new_plan_due_days") == {("2026-08-03", "2026-08-13")}


@pytest.mark.parametrize(
    ("start", "expected"),
    [
        # The day before the STEM card starts (2026-07-01): not "during his or her 24-month
        # OPT extension", so no new plan and no new-employer report from this stage.
        ("2026-06-30", set()),
        # The card's first day: during the extension. 2026-07-01 plus 10 is 2026-07-11.
        ("2026-07-01", {("2026-07-01", "2026-07-11")}),
    ],
)
def test_a_new_employer_job_begun_before_the_stem_card_gives_no_new_plan_window(start, expected):
    # Finding 4, mutant M7: (f)(10)(ii)(C)(7)(iv) "a new employer during his or her 24-month
    # OPT extension". Fails if: the stem_job_start selection drops this.start on_or_after
    # this.under.card_start. w2 here is the only job, with e2, not the card's employer e1.
    w2 = rec("w2", "work", employer="e2", under="a2", start=start, hours_per_week=40)
    out = compute(stem_jobs_case(w2), [PACK], TODAY)
    assert report_windows(out, "w2", "stem.new_plan_due_days") == expected


# reviews/w2-p1.md finding 1 (blocking): a gap never silently removes a deadline.


def test_a_stem_card_with_no_employer_asks_for_it_and_never_drops_the_windows_silently():
    # The case of the new plan test with employer left off the STEM card a2. Whether w2 (with
    # e2, from 2026-08-03) is with a new employer turns on a2.employer, which is not known,
    # so neither the new plan window nor the report window (both to 2026-08-13) can be given
    # or ruled out. CLAUDE.md: confirm, never assume; missing means cannot_tell. SPEC-W2 45
    # P3; PRINCIPLES 2. Fails if: the selection's unknown is read as "no such job" and
    # nothing asks for the card's employer.
    case = stem_new_employer_case("2026-08-03")
    stem = next(r for r in case["records"] if r["id"] == "a2")
    del stem["fields"]["employer"]
    out = compute(case, [PACK], TODAY)
    assert out["verdict"]["state"] == "cannot_tell"
    assert "missing:a2.employer" in out["verdict"]["reasons"]
    assert asks_for(out, "a2.employer")
    # No date is made up either: a window shown for w2 has no closing day.
    dated = report_windows(out, "w2", "stem.new_plan_due_days") | report_windows(
        out, "w2", "stem.report_change_within_days"
    )
    assert {closes for _, closes in dated} <= {None}


# reviews/w2-p1.md finding 2: a planning date shows its working, the setting and its value.


@pytest.mark.parametrize("window_id", ["opt.prepare", "stem.prepare"])
def test_a_planning_date_names_the_setting_and_its_value_among_its_inputs(window_id):
    # BOUNDARY A3, show the working. opt.prepare.opens.a1 is 2026-01-14: p1.end_date
    # 2026-05-15 less 90 days (opt.apply_before_days) is 2026-02-14, less one month
    # (plan.prepare_months 1) is 2026-01-14. Without the setting the inputs give 2026-02-14.
    # Fails if: the item's inputs leave the setting out. It is still never a rule.
    out = compute(PREPARE_CASE, [PACK], TODAY)
    item = items(out)[f"{window_id}.opens.a1"]
    assert item["planning"] is True
    assert item["inputs"].get(SETTING) == PREPARE_MONTHS
    assert SETTING not in item["rule_ids"]
    window = one_window(out, window_id)
    assert window["inputs"].get(SETTING) == PREPARE_MONTHS


# The loader: a setting anywhere but the opens or closes of a stage window is refused
# (rulepack.schema.json, the setting description: "the pack loader (engine/rulepack.py)
# refuses a setting anywhere else (W2-P1)"). Each pack below passes the schema, so the
# refusal is the loader's.

BY_SETTING = {"setting": SETTING}
BY_SETTING_BACK = {"setting": SETTING, "sign": -1}


def _toy_window(opens: dict[str, Any], closes: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": "toy.prepare",
        "label": "Prepare",
        "opens": opens,
        "closes": closes,
        "rule_ids": ["toy.before_days"],
    }


PREPARE = _toy_window(
    {"fact": "this.end", "add": [{"rule": "toy.before_days", "sign": -1}, BY_SETTING_BACK]},
    {"fact": "this.end", "add": [{"rule": "toy.before_days", "sign": -1}]},
)


def _check(holds: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": "toy.check",
        "for_each": {"record": "card"},
        "holds": [holds],
        "rule_ids": ["toy.definition"],
    }


REFUSED: dict[str, dict[str, Any]] = {
    "stage span ends add": toy_pack_dict(
        [
            toy_stage(
                span={
                    "starts": {"fact": "this.start"},
                    "ends": {"fact": "this.end", "add": [BY_SETTING]},
                }
            )
        ]
    ),
    "stage span longest": toy_pack_dict(
        [
            toy_stage(
                span={
                    "starts": {"fact": "this.start"},
                    "ends": {"fact": "this.end"},
                    "longest": BY_SETTING,
                }
            )
        ]
    ),
    "stage gap_allowed": toy_pack_dict([toy_stage(gap_allowed=BY_SETTING)]),
    "condition at_most": toy_pack_dict(
        [toy_stage()], checks=[_check({"field": "this.hours", "at_most": BY_SETTING})]
    ),
    "a date add list in a condition": toy_pack_dict(
        [toy_stage()],
        checks=[
            _check(
                {"field": "this.card_start", "on_or_before": {"fact": "today", "add": [BY_SETTING]}}
            )
        ],
    ),
    "counter span ends add": toy_pack_dict(
        [toy_stage()],
        counters=[
            {
                "id": "toy.card_days",
                "calculator": "sum_of_days",
                "scope": {"of": {"record": "card"}, "group": "record"},
                "span": {
                    "starts": {"fact": "this.card_start"},
                    "ends": {"fact": "this.card_end", "add": [BY_SETTING]},
                },
                "limit_rule": "toy.bar",
                "rule_ids": ["toy.definition"],
            }
        ],
    ),
}


@pytest.mark.parametrize("where", list(REFUSED))
def test_a_setting_outside_a_window_passes_the_schema(where):
    # Guard: the shared amount shape lets the schema through, so only the loader can refuse.
    assert schema_problems(REFUSED[where]) == []


@pytest.mark.parametrize("where", list(REFUSED))
def test_a_setting_outside_a_window_is_refused_with_a_plain_error(where):
    with pytest.raises(RulepackError) as refused:
        validate_pack(REFUSED[where])
    message = str(refused.value)
    # Plain: it names the setting and says what is wrong, in one line.
    assert SETTING in message
    assert "setting" in message.replace(SETTING, "")
    assert "\n" not in message.strip()


def test_a_setting_in_the_opens_or_closes_of_a_stage_window_loads():
    closes_too = _toy_window(
        {"fact": "this.end", "add": [{"rule": "toy.before_days", "sign": -1}]},
        {"fact": "this.end", "add": [BY_SETTING]},
    )
    for window in (PREPARE, closes_too):
        assert validate_pack(toy_pack_dict([toy_stage(window)])).path is not None


# reviews/w2-p1.md finding 5: the loader refuses a setting it cannot date from, before any
# compute. contracts/product_settings.yaml: loop.weekly_budget is "check-ins per week", not
# days, business days, months or years.

UNDATABLE = {
    "an unknown setting id": "no.such.setting",
    "a setting whose unit is not a span of time": "loop.weekly_budget",
}


@pytest.mark.parametrize("where", list(UNDATABLE))
def test_a_window_on_a_setting_the_engine_cannot_date_from_is_refused(where):
    # Fails if: validate_pack accepts the pack and compute later raises SettingsError or
    # gives opens null with no reason.
    setting = UNDATABLE[where]
    window = _toy_window(
        {"fact": "this.end", "add": [{"setting": setting, "sign": -1}]},
        {"fact": "this.end"},
    )
    raw = toy_pack_dict([toy_stage(window)])
    assert schema_problems(raw) == []
    assert (setting in SETTING_IDS) is (setting == "loop.weekly_budget")
    with pytest.raises(RulepackError) as refused:
        validate_pack(raw)
    message = str(refused.value)
    assert setting in message
    assert "\n" not in message.strip()


# N1 on the toy pack: the engine reads the setting's value and unit, and nothing about F-1.


def toy_prepare(end: str) -> dict[str, Any]:
    pack = toy_pack([toy_stage(PREPARE)])
    course = rec("c1", "course", start="2025-01-06", end=end)
    return compute(toy_case([course], TODAY), [pack], TODAY)


def test_n1_a_toy_window_from_a_setting_is_dated_and_marked_planning():
    # c1 ends 2026-12-31. toy.before_days 20 back: 2026-12-11 (closes). One month before
    # that: 2026-11-11 (opens).
    out = toy_prepare("2026-12-31")
    window = one_window(out, "toy.prepare")
    assert (window["opens"], window["closes"]) == ("2026-11-11", "2026-12-11")
    assert window["planning"] is True
    assert window["rule_ids"] == ["toy.before_days"]
    assert SETTING not in out["rules"]
    assert items(out)["toy.prepare.opens.c1"]["planning"] is True


@settings(deadline=None, max_examples=40)
@given(st.dates(min_value=date(2026, 11, 1), max_value=date(2029, 12, 31)))
def test_n1_the_planning_date_moves_months_as_the_engine_moves_months(end):
    # opens = (end - 20 days) less one calendar month, on the month's last day where needed.
    closes = end - timedelta(days=20)
    out = toy_prepare(end.isoformat())
    window = one_window(out, "toy.prepare")
    assert window["closes"] == closes.isoformat()
    assert window["opens"] == months_before(closes, PREPARE_MONTHS).isoformat()


def test_n1_a_setting_in_days_moves_days():
    # watch.close_days is 30 days (K1). c1 ends 2026-12-31: 30 days back is 2026-12-01.
    assert whole_setting(load_settings(), "watch.close_days") == 30
    window = _toy_window(
        {"fact": "this.end", "add": [{"setting": "watch.close_days", "sign": -1}]},
        {"fact": "this.end"},
    )
    pack = toy_pack([toy_stage(window)])
    course = rec("c1", "course", start="2025-01-06", end="2026-12-31")
    found = one_window(compute(toy_case([course], TODAY), [pack], TODAY), "toy.prepare")
    assert (found["opens"], found["closes"]) == ("2026-12-01", "2026-12-31")
    assert found["planning"] is True
