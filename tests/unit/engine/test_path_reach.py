"""engine/path.py: the kinds of date, condition, check, next step, counter and refusal that
test_path.py does not reach, tested through compute with small packs made here.

Specified in specs/path-1/SPEC.md ("The engine", points 1 to 7) and specs/path-1/programs.md
sections 11 to 13, over contracts/rulepack.schema.json ($defs when, amount, condition,
selector, next_step, check, counter, checklist) and contracts/case.schema.json.

The pack is for category j1, which the repo holds no pack for. Its kinds, fields and rules
(course, card, job, trip; toy.*) belong to no real category and its quotes are placeholders,
so a test passes only for an engine that reads the pack. Each date and count is worked out by
hand beside its assertion. The clock is always injected (FixedClock); nothing reads the
system time.
"""

import copy
import importlib
import json
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import pytest
from jsonschema import Draft202012Validator, FormatChecker

from engine.clocks import FixedClock
from engine.rulepack import Rulepack, validate_pack

REPO_ROOT = Path(__file__).resolve().parents[3]
CONTRACTS = REPO_ROOT / "contracts"
CASE_SCHEMA = json.loads((CONTRACTS / "case.schema.json").read_text())
OUTPUT_SCHEMA = json.loads((CONTRACTS / "engine_output.schema.json").read_text())
PACK_SCHEMA = json.loads((CONTRACTS / "rulepack.schema.json").read_text())
TODAY = date(2026, 9, 29)  # a Tuesday
URL = "https://www.ecfr.gov/current/title-8/section-214.2"


def _row(rule_id: str, value: Any, unit: str, **extra: Any) -> dict[str, Any]:
    row = {
        "id": rule_id,
        "value": value,
        "unit": unit,
        "status": "settled",
        "effective_from": "2000-01-01",
        "source": {
            "citation": "placeholder citation for a test pack",
            "url": URL,
            "checked_on": "2026-09-29",
            "quote": "placeholder words for a test pack",
        },
    }
    row.update(extra)
    return row


RULES = [
    _row("toy.definition", True, "flag"),
    _row(
        "toy.bdays",
        3,
        "business_days",
        derivation="reading",
        note="placeholder note for a test pack",
        plain="placeholder plain words for a test pack",
    ),
    _row("toy.two_months", 2, "months"),
    _row("toy.one_year", 1, "years"),
    _row("toy.cutoff", "04-01", "date"),
    _row("toy.fy_start", "10-01", "date"),
    _row("toy.max_cards", 2, "count"),
    _row("toy.hours", 20, "hours_per_week"),
    _row("toy.bar", 30, "days"),
    _row("toy.order", True, "flag"),
    _row("toy.later_days", 7, "days", effective_from="2027-01-01"),
    _row("toy.later_fy", "10-01", "date", effective_from="2027-01-01"),
    _row("toy.fought", True, "flag", status="litigated"),
]

RECORD_KINDS = [
    {
        "id": "course",
        "label": "Course",
        "id_prefix": "c",
        "fields": [
            {"id": "start", "kind": "date", "label": "Start"},
            {"id": "end", "kind": "date", "label": "End"},
            {
                "id": "level",
                "kind": "choice",
                "label": "Level",
                "choices": ["low", "mid", "high", "other"],
                "not_sure": True,
            },
            {"id": "left_on", "kind": "date", "label": "Left on", "happened": True},
        ],
    },
    {
        "id": "card",
        "label": "Card",
        "id_prefix": "k",
        "fields": [
            {"id": "course", "kind": "link", "label": "Course", "to": ["course"]},
            {"id": "renews", "kind": "link", "label": "Renews", "to": ["card"]},
            {"id": "card_start", "kind": "date", "label": "Card start"},
            {"id": "card_end", "kind": "date", "label": "Card end"},
            {"id": "hours", "kind": "number", "label": "Hours"},
            {
                "id": "time",
                "kind": "choice",
                "label": "Time",
                "choices": ["full_time", "part_time"],
                "not_sure": True,
            },
        ],
    },
    {
        "id": "job",
        "label": "Job",
        "id_prefix": "w",
        "grows_with_time": True,
        "fields": [
            {"id": "under", "kind": "link", "label": "Under", "to": ["card"]},
            {"id": "start", "kind": "date", "label": "Start"},
            {"id": "end", "kind": "date", "label": "End"},
            {"id": "hours_per_week", "kind": "number", "label": "Hours"},
        ],
    },
    {
        "id": "trip",
        "label": "Trip",
        "id_prefix": "t",
        "grows_with_time": True,
        "fields": [
            {"id": "start", "kind": "date", "label": "Start"},
            {"id": "end", "kind": "date", "label": "End"},
        ],
    },
]

FACTS = [
    {"id": "arrival", "kind": "date", "label": "Arrival"},
    {"id": "enrolled", "kind": "flag", "label": "Enrolled"},
]

ORDER = [
    {
        "record": "course",
        "field": "level",
        "ascending": ["low", "mid", "high"],
        "rule_ids": ["toy.order"],
    }
]


def _course_stage(*windows: dict[str, Any], **extra: Any) -> dict[str, Any]:
    stage: dict[str, Any] = {
        "id": "course",
        "label": "Course",
        "for_each": {"record": "course"},
        "entered_when": ["this.start", "this.end"],
        "rule_ids": ["toy.definition"],
        "span": {"starts": {"fact": "this.start"}, "ends": {"fact": "this.end"}},
        "windows": list(windows),
    }
    stage.update(extra)
    return stage


CARD_STAGE: dict[str, Any] = {
    "id": "card",
    "label": "Card",
    "for_each": {"record": "card"},
    "entered_when": ["this.card_start", "this.card_end"],
    "rule_ids": ["toy.definition"],
    "span": {"starts": {"fact": "this.card_start"}, "ends": {"fact": "this.card_end"}},
}

STAY_STAGE: dict[str, Any] = {
    "id": "stay",
    "label": "Stay",
    "entered_when": ["arrival"],
    "rule_ids": ["toy.definition"],
    "span": {
        "starts": {"fact": "arrival"},
        "ends": {"fact": "arrival", "add": [{"rule": "toy.one_year"}]},
    },
}


def _win(opens: dict[str, Any], closes: dict[str, Any], rules: list[str]) -> dict[str, Any]:
    return {"id": "toy.w", "label": "Window", "opens": opens, "closes": closes, "rule_ids": rules}


def _pack_dict(
    stages: list[dict[str, Any]],
    *,
    checks: list[dict[str, Any]] | None = None,
    counters: list[dict[str, Any]] | None = None,
    checklists: list[dict[str, Any]] | None = None,
    rules: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    path: dict[str, Any] = {
        "facts": copy.deepcopy(FACTS),
        "stages": copy.deepcopy(stages),
        "records": copy.deepcopy(RECORD_KINDS),
        "order": copy.deepcopy(ORDER),
    }
    if checks:
        path["checks"] = copy.deepcopy(checks)
    if counters:
        path["counters"] = copy.deepcopy(counters)
    if checklists:
        path["checklists"] = copy.deepcopy(checklists)
    return {
        "category": "j1",
        "jurisdiction": "us",
        "version": "v2026.09",
        "regimes": [],
        "parameters": copy.deepcopy(rules if rules is not None else RULES),
        "path": path,
    }


def _pack(stages: list[dict[str, Any]], **kwargs: Any) -> Rulepack:
    raw = _pack_dict(stages, **kwargs)
    problems = [e.message for e in Draft202012Validator(PACK_SCHEMA).iter_errors(raw)]
    assert problems == [], problems  # the test pack itself follows the contract
    return validate_pack(raw)


def _rec(record_id: str, kind: str, **fields: Any) -> dict[str, Any]:
    return {"id": record_id, "kind": kind, "fields": fields}


def _case(
    records: list[dict[str, Any]],
    facts: dict[str, Any] | None = None,
    confirmations: dict[str, Any] | None = None,
) -> dict[str, Any]:
    on = {"on": TODAY.isoformat()}
    case: dict[str, Any] = {
        "categories": ["j1"],
        "time_zone": "UTC",
        "facts": facts or {},
        "records": records,
        "complete": {"course": on, "card": on, "job": on, "trip": on},
    }
    if confirmations:
        case["confirmations"] = confirmations
    validator = Draft202012Validator(CASE_SCHEMA, format_checker=FormatChecker())
    problems = [e.message for e in validator.iter_errors(case)]
    assert problems == [], problems  # the test case itself follows the contract
    return case


def _compute(case: dict[str, Any], pack: Rulepack, today: date = TODAY) -> dict[str, Any]:
    path = importlib.import_module("engine.path")
    clock = FixedClock(datetime(today.year, today.month, today.day, 12, 0, tzinfo=UTC))
    out: dict[str, Any] = path.compute(case, [pack], clock)
    validator = Draft202012Validator(OUTPUT_SCHEMA, format_checker=FormatChecker())
    assert [e.message for e in validator.iter_errors(out)] == []
    return out


def _reasons(out: dict[str, Any]) -> list[str]:
    return list(out["verdict"]["reasons"])


def _mentions(out: dict[str, Any], *parts: str) -> list[str]:
    """Reasons and question ids holding every part."""
    names = _reasons(out) + [q["id"] for q in out["questions"]]
    return [n for n in names if all(p in n for p in parts)]


def _window(out: dict[str, Any], rule: str, record: str | None) -> dict[str, Any]:
    """The one window of a stage that names the rule and belongs to the record."""
    found = [
        w
        for s in out["stages"]
        for w in s["windows"]
        if rule in w["rule_ids"] and w.get("record") == record
    ]
    assert len(found) == 1, found
    return found[0]


def _stage(out: dict[str, Any], sid: str) -> dict[str, Any]:
    found = [s for s in out["stages"] if s["id"] == sid]
    assert len(found) == 1, [s["id"] for s in out["stages"]]
    return found[0]


def _counted(out: dict[str, Any], cid: str, group: str) -> list[Any]:
    return [
        i["value"]
        for i in out["computed"]
        if str(i["id"]).startswith(cid) and str(i["id"]).endswith("." + group)
    ]


def _course(rid: str = "c1", **fields: Any) -> dict[str, Any]:
    base = {"start": "2025-01-06", "end": "2026-10-20", "level": "high"}
    base.update(fields)
    return _rec(rid, "course", **base)


# Amounts: rulepack.schema.json $defs.amount ("Its unit (days, business_days, months) comes
# from the rule") and programs.md 13 point 12 (years).

BDAYS_WINDOW = _win(
    {"fact": "this.end", "add": [{"rule": "toy.bdays", "sign": -1}]},
    {"fact": "this.end", "add": [{"rule": "toy.bdays"}]},
    ["toy.bdays"],
)


def test_business_days_skip_weekends() -> None:
    # c1 ends Wednesday 2026-10-21. Three business days back: Tue 10-20, Mon 10-19, then
    # the weekend 10-17 and 10-18 is skipped, Fri 10-16. Three forward: Thu 10-22, Fri 10-23,
    # weekend skipped, Mon 10-26. No federal holiday falls in 10-16..10-26.
    out = _compute(_case([_course(end="2026-10-21")]), _pack([_course_stage(BDAYS_WINDOW)]))
    window = _window(out, "toy.bdays", "c1")
    assert window["opens"] == "2026-10-16"
    assert window["closes"] == "2026-10-26"


def test_business_days_skip_a_federal_holiday() -> None:
    # c1 ends Tuesday 2026-11-10. Forward: Wed 11-11 is Veterans Day, skipped; Thu 11-12 (1),
    # Fri 11-13 (2), weekend skipped, Mon 11-16 (3). Back: Mon 11-09 (1), weekend skipped,
    # Fri 11-06 (2), Thu 11-05 (3).
    out = _compute(_case([_course(end="2026-11-10")]), _pack([_course_stage(BDAYS_WINDOW)]))
    window = _window(out, "toy.bdays", "c1")
    assert window["opens"] == "2026-11-05"
    assert window["closes"] == "2026-11-16"


def test_a_rule_row_s_note_plain_words_and_reading_are_carried_to_the_output() -> None:
    # toy.bdays is marked derivation reading, with a note and plain words. The window that
    # uses it is a reading, and the rule entry carries all three.
    out = _compute(_case([_course(end="2026-10-21")]), _pack([_course_stage(BDAYS_WINDOW)]))
    assert _window(out, "toy.bdays", "c1")["reading"] is True
    rule = out["rules"]["toy.bdays"]
    assert rule["derivation"] == "reading"
    assert rule["note"] == "placeholder note for a test pack"
    assert rule["plain"] == "placeholder plain words for a test pack"


MONTHS_YEARS_WINDOW = _win(
    {"fact": "this.end", "add": [{"rule": "toy.two_months"}]},
    {"fact": "this.end", "add": [{"rule": "toy.one_year"}]},
    ["toy.two_months", "toy.one_year"],
)


def test_months_and_years_move_the_calendar_date() -> None:
    # c1 ends 2027-03-01. Two months on: 2027-05-01. One year on: 2028-03-01 (365 days on
    # would be 2028-02-29, since 2028 is a leap year).
    out = _compute(_case([_course(end="2027-03-01")]), _pack([_course_stage(MONTHS_YEARS_WINDOW)]))
    window = _window(out, "toy.two_months", "c1")
    assert window["opens"] == "2027-05-01"
    assert window["closes"] == "2028-03-01"


def test_a_year_from_29_february_lands_on_28_february() -> None:
    # programs.md 13 point 12: "29 February becomes 28 February". c1 ends 2028-02-29.
    # One year on: 2029-02-28. Two months on: 2028-04-29.
    out = _compute(
        _case([_course(start="2027-09-01", end="2028-02-29")]),
        _pack([_course_stage(MONTHS_YEARS_WINDOW)]),
    )
    window = _window(out, "toy.one_year", "c1")
    assert window["opens"] == "2028-04-29"
    assert window["closes"] == "2029-02-28"


# Kinds of date: programs.md 13 point 4 (first, today) and point 9 (in_fiscal_year_of),
# rulepack.schema.json $defs.when (month_day_rule with in_year_of).

FIRST_WINDOW = _win(
    {"first": {"of": {"record": "job"}, "field": "start", "pick": "earliest"}},
    {"first": {"of": {"record": "job"}, "field": "start", "pick": "latest"}},
    ["toy.definition"],
)


def test_first_takes_the_earliest_and_the_latest_date_over_the_records_found() -> None:
    # Jobs start 2026-06-15 and 2026-03-01: earliest 2026-03-01, latest 2026-06-15.
    w1 = _rec("w1", "job", start="2026-06-15", hours_per_week=20)
    w2 = _rec("w2", "job", start="2026-03-01", hours_per_week=20)
    out = _compute(_case([_course(), w1, w2]), _pack([_course_stage(FIRST_WINDOW)]))
    window = _window(out, "toy.definition", "c1")
    assert window["opens"] == "2026-03-01"
    assert window["closes"] == "2026-06-15"


def test_first_over_no_records_gives_no_date() -> None:
    # $defs.when.first: "None found: absent". No job: neither end of the window is a date.
    out = _compute(_case([_course()]), _pack([_course_stage(FIRST_WINDOW)]))
    window = _window(out, "toy.definition", "c1")
    assert window["opens"] is None
    assert window["closes"] is None


def test_month_day_rule_in_year_of_places_the_day_in_that_year() -> None:
    # toy.cutoff is 04-01. In the year of start 2025-01-06: 2025-04-01. In the year of end
    # 2026-10-20: 2026-04-01.
    window = _win(
        {"month_day_rule": "toy.cutoff", "in_year_of": "this.start"},
        {"month_day_rule": "toy.cutoff", "in_year_of": "this.end"},
        ["toy.cutoff"],
    )
    out = _compute(_case([_course()]), _pack([_course_stage(window)]))
    got = _window(out, "toy.cutoff", "c1")
    assert got["opens"] == "2025-04-01"
    assert got["closes"] == "2026-04-01"


def test_month_day_rule_in_the_year_of_an_absent_field_asks_for_it() -> None:
    # SPEC point 6: a fact needed by a shown window and not entered is named in missing and
    # asked. c1 has no left_on.
    window = _win(
        {"month_day_rule": "toy.cutoff", "in_year_of": "this.left_on"},
        {"fact": "this.end"},
        ["toy.cutoff"],
    )
    out = _compute(_case([_course()]), _pack([_course_stage(window)]))
    assert _window(out, "toy.cutoff", "c1")["opens"] is None
    assert "missing:c1.left_on" in _reasons(out)
    assert "c1.left_on" in [q["id"] for q in out["questions"]]
    assert out["verdict"]["state"] == "cannot_tell"


def test_a_fiscal_year_rule_not_in_force_on_the_day_gives_no_date_and_goes_to_the_dso() -> None:
    # toy.later_fy starts 2027-01-01; the anchor is start 2025-01-06, before it. The date is
    # not made up: it is null, and rule_not_in_force_on_event_day is raised (programs.md 13
    # point 13, the stated basis).
    window = _win(
        {
            "month_day_rule": "toy.cutoff",
            "in_fiscal_year_of": "this.start",
            "fiscal_year_rule": "toy.later_fy",
        },
        {"fact": "this.end"},
        ["toy.cutoff"],
    )
    out = _compute(_case([_course()]), _pack([_course_stage(window)]))
    assert _window(out, "toy.cutoff", "c1")["opens"] is None
    assert "rule_not_in_force_on_event_day" in _reasons(out)
    assert out["verdict"]["state"] != "no_open_items"


def test_a_span_end_moved_by_a_rule_not_yet_in_force_is_not_computed() -> None:
    # The course ends at end + toy.later_days, a rule that starts 2027-01-01. On the event
    # day 2026-10-20 it is not in force, so the stage has no end and no span conflict.
    stage = _course_stage(
        span={
            "starts": {"fact": "this.start"},
            "ends": {"fact": "this.end", "add": [{"rule": "toy.later_days"}]},
        }
    )
    out = _compute(_case([_course()]), _pack([stage]))
    assert _stage(out, "course.c1")["ends"] is None
    assert "rule_not_in_force_on_event_day" in _reasons(out)
    assert _mentions(out, "conflict:") == []


def test_a_window_date_moved_by_a_rule_not_yet_in_force_is_null_and_the_rule_is_cited() -> None:
    # The window closes at end 2026-10-20 + toy.later_days, a rule that starts 2027-01-01.
    # The close is null, rule_not_in_force_on_event_day is raised, and the rule is still
    # shown with its source though no row of it is in force today.
    window = _win(
        {"fact": "this.start"},
        {"fact": "this.end", "add": [{"rule": "toy.later_days"}]},
        ["toy.definition"],
    )
    out = _compute(_case([_course()]), _pack([_course_stage(window)]))
    got = _window(out, "toy.later_days", "c1")
    assert got["opens"] == "2025-01-06"
    assert got["closes"] is None
    assert "rule_not_in_force_on_event_day" in _reasons(out)
    assert out["rules"]["toy.later_days"]["citation"] == "placeholder citation for a test pack"


# A stage entered on a fact of the person as a whole (SPEC point 1; rulepack.schema.json
# $defs.stage.entered_when "Facts that, all entered, place the person in this stage").


def test_a_stage_without_for_each_is_entered_on_a_fact_and_its_span_computed() -> None:
    # arrival 2026-01-15; ends one year on: 2027-01-15. Today 2026-09-29 is inside: current.
    out = _compute(_case([], facts={"arrival": "2026-01-15"}), _pack([STAY_STAGE]))
    stay = _stage(out, "stay")
    assert stay["starts"] == "2026-01-15"
    assert stay["ends"] == "2027-01-15"
    assert stay["state"] == "current"


def test_a_typed_fact_date_is_asked_to_be_checked_against_documents() -> None:
    # D59 (programs.md, typed dates): the fact arrival is a typed date, so the question
    # typed_dates.from_documents carries it.
    out = _compute(_case([], facts={"arrival": "2026-01-15"}), _pack([STAY_STAGE]))
    asked = {q["id"]: q for q in out["questions"]}
    assert asked["typed_dates.from_documents"]["about"] == {"arrival": "2026-01-15"}
    assert "unconfirmed:typed_dates" in _reasons(out)


def test_a_record_with_no_typed_date_is_cannot_tell_with_no_documents() -> None:
    # A stage entered on the flag fact enrolled, with no span: no date was typed, nothing
    # comes from a document. The verdict is cannot_tell with no_documents, and no question
    # about typed dates is asked.
    stage = {
        "id": "enrolled",
        "label": "Enrolled",
        "entered_when": ["enrolled"],
        "rule_ids": ["toy.definition"],
    }
    out = _compute(_case([], facts={"enrolled": True}), _pack([stage]))
    assert out["verdict"]["state"] == "cannot_tell"
    assert "no_documents" in _reasons(out)
    assert "typed_dates.from_documents" not in [q["id"] for q in out["questions"]]


# Conditions: programs.md 13 points 5 and 6, through declared checks (point 10). A check that
# does not hold raises a conflict named by the check and the record; one that holds raises
# nothing; one that is unknown asks what is missing or goes to the DSO for not_sure.


def _check(cid: str, kind: str, *holds: dict[str, Any], **extra: Any) -> dict[str, Any]:
    check = {
        "id": cid,
        "for_each": {"record": kind},
        "holds": list(holds),
        "rule_ids": ["toy.definition"],
    }
    check.update(extra)
    return check


def _run_check(check: dict[str, Any], *records: dict[str, Any]) -> dict[str, Any]:
    return _compute(_case(list(records)), _pack([_course_stage()], checks=[check]))


def _card(rid: str = "k1", **fields: Any) -> dict[str, Any]:
    base = {"course": "c1", "card_start": "2026-09-01", "card_end": "2027-08-31"}
    base.update(fields)
    return _rec(rid, "card", **base)


BY_TODAY = _check(
    "toy.by_today", "card", {"field": "this.card_start", "on_or_before": {"fact": "today"}}
)


def test_today_in_a_when_is_the_person_s_day() -> None:
    # card_start 2026-09-29 is on or before today 2026-09-29; 2026-09-30 is not.
    on_the_day = _run_check(BY_TODAY, _course(), _card(card_start="2026-09-29"))
    after = _run_check(BY_TODAY, _course(), _card(card_start="2026-09-30"))
    assert _mentions(on_the_day, "toy.by_today") == []
    assert _mentions(after, "conflict:", "toy.by_today", "k1")


ENDS_WITH_COURSE = _check(
    "toy.ends_with_course",
    "card",
    {"field": "this.card_end", "on_or_after": {"fact": "this.course.end"}},
)


def test_on_or_after_holds_on_the_same_day_and_not_the_day_before() -> None:
    # c1 ends 2026-10-20. card_end 2026-10-20 is on or after it; 2026-10-19 is not.
    same = _run_check(ENDS_WITH_COURSE, _course(), _card(card_end="2026-10-20"))
    before = _run_check(ENDS_WITH_COURSE, _course(), _card(card_end="2026-10-19"))
    assert _mentions(same, "toy.ends_with_course") == []
    assert _mentions(before, "conflict:", "toy.ends_with_course", "k1")


STARTS_IN_COURSE = _check(
    "toy.starts_in_course",
    "card",
    {"field": "this.card_start", "before": {"fact": "this.course.end"}},
)


def test_before_is_strict() -> None:
    # c1 ends 2026-10-20. card_start 2026-10-19 is before it; 2026-10-20 is not.
    inside = _run_check(STARTS_IN_COURSE, _course(), _card(card_start="2026-10-19"))
    same = _run_check(STARTS_IN_COURSE, _course(), _card(card_start="2026-10-20"))
    assert _mentions(inside, "toy.starts_in_course") == []
    assert _mentions(same, "conflict:", "toy.starts_in_course", "k1")


def test_a_date_condition_on_an_absent_field_asks_for_it() -> None:
    # k1 has no card_start: the check is unknown. It is no conflict, and card_start is asked.
    card = _rec("k1", "card", course="c1", card_end="2027-08-31")
    out = _run_check(STARTS_IN_COURSE, _course(), card)
    assert _mentions(out, "conflict:", "toy.starts_in_course") == []
    assert "missing:k1.card_start" in _reasons(out)
    assert out["verdict"]["state"] == "cannot_tell"


def test_a_path_through_an_absent_link_asks_for_the_link() -> None:
    # k1 names no course, so this.course.end cannot be read. The link is asked for.
    card = _rec("k1", "card", card_start="2026-09-01", card_end="2027-08-31")
    out = _run_check(STARTS_IN_COURSE, _course(), card)
    assert "missing:k1.course" in _reasons(out)
    assert out["verdict"]["state"] == "cannot_tell"


NOT_LEFT = _check("toy.not_left", "course", {"field": "this.left_on", "present": False})


def test_present_false_holds_while_the_field_is_absent() -> None:
    kept = _run_check(NOT_LEFT, _course())
    left = _run_check(NOT_LEFT, _course(left_on="2026-05-01"))
    assert _mentions(kept, "toy.not_left") == []
    assert _mentions(left, "conflict:", "toy.not_left", "c1")


def test_a_condition_with_only_a_field_holds_once_the_field_is_entered() -> None:
    # {"field": ...} alone tests nothing but the value itself: entered holds, absent is
    # unknown and asked.
    check = _check("toy.has_left", "course", {"field": "this.left_on"})
    entered = _run_check(check, _course(left_on="2026-05-01"))
    absent = _run_check(check, _course())
    assert _mentions(entered, "toy.has_left") == []
    assert "missing:c1.left_on" in _reasons(absent)
    assert _mentions(absent, "conflict:", "toy.has_left") == []


ON_CUTOFF = _check("toy.on_cutoff", "course", {"field": "this.start", "month_day_is": "toy.cutoff"})


def test_month_day_is_compares_month_and_day_from_a_rule() -> None:
    # toy.cutoff 04-01. start 2026-04-01 matches; 2026-04-02 does not.
    match = _run_check(ON_CUTOFF, _course(start="2026-04-01"))
    miss = _run_check(ON_CUTOFF, _course(start="2026-04-02"))
    assert _mentions(match, "toy.on_cutoff") == []
    assert _mentions(miss, "conflict:", "toy.on_cutoff", "c1")


HOURS_CAP = _check(
    "toy.hours_cap", "card", {"field": "this.hours", "at_most": {"rule": "toy.hours"}}
)


def test_at_most_holds_at_the_rule_amount_and_not_above_it() -> None:
    # toy.hours 20: 20 is at most 20; 21 is not.
    at = _run_check(HOURS_CAP, _course(), _card(hours=20))
    above = _run_check(HOURS_CAP, _course(), _card(hours=21))
    assert _mentions(at, "toy.hours_cap") == []
    assert _mentions(above, "conflict:", "toy.hours_cap", "k1")


def test_at_most_on_an_absent_number_asks_for_it() -> None:
    out = _run_check(HOURS_CAP, _course(), _card())
    assert "missing:k1.hours" in _reasons(out)
    assert _mentions(out, "conflict:", "toy.hours_cap") == []


CARDS_OF_COURSE: dict[str, Any] = {
    "record": "card",
    "where": [{"field": "this.course", "same_as": "outer.id"}],
}


def test_exists_holds_when_a_linked_record_is_found() -> None:
    # c1 has k1; c2 has no card, so the check fails for c2 only.
    check = _check("toy.has_card", "course", {"exists": CARDS_OF_COURSE})
    out = _run_check(check, _course(), _course("c2"), _card())
    assert _mentions(out, "conflict:", "toy.has_card", "c2")
    assert _mentions(out, "conflict:", "toy.has_card", "c1") == []


def test_none_holds_when_no_linked_record_is_found() -> None:
    check = _check("toy.no_card", "course", {"none": CARDS_OF_COURSE})
    out = _run_check(check, _course(), _course("c2"), _card())
    assert _mentions(out, "conflict:", "toy.no_card", "c1")
    assert _mentions(out, "conflict:", "toy.no_card", "c2") == []


COUNT_AT_MOST = _check(
    "toy.few_cards", "course", {"count_at_most": {"of": CARDS_OF_COURSE, "rule": "toy.max_cards"}}
)
COUNT_BELOW = _check(
    "toy.fewer_cards", "course", {"count_below": {"of": CARDS_OF_COURSE, "rule": "toy.max_cards"}}
)


def test_count_at_most_holds_at_the_limit_and_not_above_it() -> None:
    # toy.max_cards 2. Two cards: 2 <= 2 holds. Three cards: 3 <= 2 fails.
    two = [_card("k1"), _card("k2")]
    held = _run_check(COUNT_AT_MOST, _course(), *two)
    over = _run_check(COUNT_AT_MOST, _course(), *two, _card("k3"))
    assert _mentions(held, "toy.few_cards") == []
    assert _mentions(over, "conflict:", "toy.few_cards", "c1")


def test_count_below_is_strict() -> None:
    # toy.max_cards 2. One card: 1 < 2 holds. Two cards: 2 < 2 fails.
    one = _run_check(COUNT_BELOW, _course(), _card("k1"))
    two = _run_check(COUNT_BELOW, _course(), _card("k1"), _card("k2"))
    assert _mentions(one, "toy.fewer_cards") == []
    assert _mentions(two, "conflict:", "toy.fewer_cards", "c1")


def test_a_count_over_a_selection_that_reads_not_sure_goes_to_the_dso() -> None:
    # programs.md 13 point 6: "Not sure" gives <record id>.<field>.not_sure. Counting the
    # full-time cards of c1 is unknown while k1's time is not_sure: no conflict, the DSO.
    check = _check(
        "toy.full_time_cards",
        "course",
        {
            "count_below": {
                "of": {
                    "record": "card",
                    "where": [
                        {"field": "this.course", "same_as": "outer.id"},
                        {"field": "this.time", "in": ["full_time"]},
                    ],
                },
                "rule": "toy.max_cards",
            }
        },
    )
    out = _run_check(check, _course(), _card(time="not_sure"))
    assert "k1.time.not_sure" in _reasons(out)
    assert _mentions(out, "conflict:", "toy.full_time_cards") == []
    assert out["verdict"]["state"] != "no_open_items"


HIGH_OR_LEFT = _check(
    "toy.high_or_left",
    "course",
    {
        "any_of": [
            {"field": "this.level", "in": ["high"]},
            {"field": "this.left_on", "present": True},
        ]
    },
)


def test_any_of_holds_when_one_part_holds() -> None:
    high = _run_check(HIGH_OR_LEFT, _course(level="high"))
    low_left = _run_check(HIGH_OR_LEFT, _course(level="low", left_on="2026-05-01"))
    low = _run_check(HIGH_OR_LEFT, _course(level="low"))
    assert _mentions(high, "toy.high_or_left") == []
    assert _mentions(low_left, "toy.high_or_left") == []
    assert _mentions(low, "conflict:", "toy.high_or_left", "c1")


def test_any_of_with_an_unknown_part_and_no_true_part_is_unknown() -> None:
    # level not_sure, no left_on: one part unknown, the other false. No conflict; the
    # judgement c1.level.not_sure gives talk_to_dso.
    out = _run_check(HIGH_OR_LEFT, _course(level="not_sure"))
    assert _mentions(out, "conflict:", "toy.high_or_left") == []
    assert "c1.level.not_sure" in _reasons(out)
    assert out["verdict"]["state"] == "talk_to_dso"


def test_all_of_needs_every_part() -> None:
    check = _check(
        "toy.high_and_stayed",
        "course",
        {
            "all_of": [
                {"field": "this.level", "in": ["high", "mid"]},
                {"field": "this.left_on", "present": False},
            ]
        },
    )
    stayed = _run_check(check, _course(level="high"))
    left = _run_check(check, _course(level="high", left_on="2026-05-01"))
    assert _mentions(stayed, "toy.high_and_stayed") == []
    assert _mentions(left, "conflict:", "toy.high_and_stayed", "c1")


NOT_LOW = _check("toy.not_low", "course", {"not": {"field": "this.level", "in": ["low"]}})


def test_not_turns_true_to_false_and_false_to_true() -> None:
    high = _run_check(NOT_LOW, _course(level="high"))
    low = _run_check(NOT_LOW, _course(level="low"))
    assert _mentions(high, "toy.not_low") == []
    assert _mentions(low, "conflict:", "toy.not_low", "c1")


def test_not_of_an_unknown_is_unknown() -> None:
    out = _run_check(NOT_LOW, _course(level="not_sure"))
    assert _mentions(out, "conflict:", "toy.not_low") == []
    assert "c1.level.not_sure" in _reasons(out)
    assert out["verdict"]["state"] == "talk_to_dso"


def test_a_check_whose_only_if_is_false_does_not_apply() -> None:
    # Applies to low courses only. A high course without left_on raises nothing; a low one
    # without left_on raises the conflict.
    check = _check(
        "toy.low_left",
        "course",
        {"field": "this.left_on", "present": True},
        only_if=[{"field": "this.level", "in": ["low"]}],
    )
    high = _run_check(check, _course(level="high"))
    low = _run_check(check, _course(level="low"))
    assert _mentions(high, "toy.low_left") == []
    assert _mentions(low, "conflict:", "toy.low_left", "c1")


# Levels: programs.md 13 point 2 (path.order, lowest to highest) and section 11.

ABOVE_LOW = _check("toy.above_low", "course", {"field": "this.level", "level_above": "low"})
BELOW_HIGH = _check("toy.below_high", "course", {"field": "this.level", "level_below": "high"})


def test_level_above_follows_the_pack_order() -> None:
    # Order low < mid < high. mid is above low; low is not.
    mid = _run_check(ABOVE_LOW, _course(level="mid"))
    low = _run_check(ABOVE_LOW, _course(level="low"))
    assert _mentions(mid, "toy.above_low") == []
    assert _mentions(low, "conflict:", "toy.above_low", "c1")


def test_level_below_follows_the_pack_order() -> None:
    mid = _run_check(BELOW_HIGH, _course(level="mid"))
    high = _run_check(BELOW_HIGH, _course(level="high"))
    assert _mentions(mid, "toy.below_high") == []
    assert _mentions(high, "conflict:", "toy.below_high", "c1")


def test_level_same_compares_with_another_record_through_a_path() -> None:
    # "Another course at the same level": c1 and c2 both high hold; c1 high and c2 low fail
    # for both.
    check = _check(
        "toy.same_level_peer",
        "course",
        {
            "exists": {
                "record": "course",
                "where": [
                    {"field": "this.level", "level_same": "outer.level"},
                    {"field": "this.id", "differs_from": "outer.id"},
                ],
            }
        },
    )
    same = _run_check(check, _course(level="high"), _course("c2", level="high"))
    apart = _run_check(check, _course(level="high"), _course("c2", level="low"))
    assert _mentions(same, "toy.same_level_peer") == []
    assert _mentions(apart, "conflict:", "toy.same_level_peer", "c1")
    assert _mentions(apart, "conflict:", "toy.same_level_peer", "c2")


def test_a_level_that_is_not_sure_goes_to_the_dso() -> None:
    out = _run_check(ABOVE_LOW, _course(level="not_sure"))
    assert _mentions(out, "conflict:", "toy.above_low") == []
    assert "c1.level.not_sure" in _reasons(out)
    assert out["verdict"]["state"] == "talk_to_dso"


# Next: programs.md 13 point 7 and rulepack.schema.json $defs.next_step.


def test_next_with_bind_is_not_shown_for_a_record_already_entered() -> None:
    # k1 is c1's card already. The card stage is entered for k1 and is not shown again as
    # what comes next for c1.
    course = _course_stage(next=[{"stage": "card", "bind": {"course": "outer.id"}}])
    pack = _pack([course, CARD_STAGE])
    with_card = _compute(_case([_course(), _card()]), pack)
    without = _compute(_case([_course()]), pack)
    assert [s["id"] for s in with_card["stages"] if s["state"] == "next"] == []
    assert _stage(with_card, "card.k1")["state"] == "current"
    assert [s for s in without["stages"] if s["state"] == "next" and s.get("stage") == "card"]


def test_next_names_a_stage_without_for_each() -> None:
    # The stay stage follows the course. arrival is not entered, so it is not entered on
    # its own, and it is shown once as what comes next.
    course = _course_stage(next=["stay"])
    out = _compute(_case([_course()]), _pack([course, STAY_STAGE]))
    assert [s["state"] for s in out["stages"] if s["id"] == "stay"] == ["next"]


# Checklists: rulepack.schema.json path.checklists, and design-1 SPEC section RQ-P4 (step
# confirmations under step.<checklist>.<step>).

CHECKLIST = {
    "id": "toy_list",
    "label": "What the source lists",
    "reading": True,
    "steps": [
        {"id": "one", "label": "Step one", "rule_ids": ["toy.definition"], "who": "student"},
        {
            "id": "two",
            "label": "Step two",
            "rule_ids": ["toy.definition"],
            "who": "school",
            "school": True,
        },
        {"id": "three", "label": "Step three", "rule_ids": ["toy.definition"], "who": "employer"},
    ],
}


def test_a_checklist_counts_only_steps_confirmed_yes_by_today() -> None:
    # one: yes on 2026-09-20, confirmed. two: yes dated 2026-09-30, after today, not read.
    # three: no, not confirmed. 1 of 3.
    confirmations = {
        "step.toy_list.one": {"answer": True, "on": "2026-09-20"},
        "step.toy_list.two": {"answer": True, "on": "2026-09-30"},
        "step.toy_list.three": {"answer": False, "on": "2026-09-20"},
    }
    stage = _course_stage(checklist="toy_list")
    out = _compute(
        _case([_course()], confirmations=confirmations), _pack([stage], checklists=[CHECKLIST])
    )
    assert _stage(out, "course.c1")["checklist"] == "toy_list.c1"
    [listed] = out["checklists"]
    assert listed["id"] == "toy_list.c1"
    assert listed["stage"] == "course.c1"
    assert listed["record"] == "c1"
    assert listed["reading"] is True
    assert listed["total"] == 3
    assert listed["confirmed"] == 1
    steps = {s["id"]: s for s in listed["steps"]}
    assert steps["one"]["confirmed_on"] == "2026-09-20"
    assert steps["two"]["confirmed_on"] is None
    assert steps["three"]["confirmed_on"] is None
    assert steps["two"]["school"] is True
    assert steps["two"]["who"] == "school"
    assert "step.toy_list.one" in out["answers_read"]
    assert "step.toy_list.two" not in out["answers_read"]


# Counters: programs.md 13 point 11.

CARD_SPAN = {"starts": {"fact": "this.card_start"}, "ends": {"fact": "this.card_end"}}


def _counter(
    cid: str, calculator: str, of: dict[str, Any], **scope_and_extra: Any
) -> dict[str, Any]:
    scope = {"of": of, "group": scope_and_extra.pop("group", "record")}
    for key in ("chain_link", "value_of"):
        if key in scope_and_extra:
            scope[key] = scope_and_extra.pop(key)
    counter = {
        "id": cid,
        "calculator": calculator,
        "scope": scope,
        "limit_rule": scope_and_extra.pop("limit_rule", "toy.bar"),
        "rule_ids": ["toy.definition"],
    }
    counter.update(scope_and_extra)
    return counter


def test_a_chain_groups_a_record_with_those_that_link_to_it() -> None:
    # k2 renews k1: one chain k1. k1 01-01..01-10 and k2 01-06..01-20 overlap; their union
    # 2026-01-01..2026-01-20 is 20 days. k3 03-01..03-05 is its own chain: 5 days.
    counter = _counter(
        "toy.chain_days",
        "sum_of_days",
        {"record": "card"},
        group="chain",
        chain_link="renews",
        span=CARD_SPAN,
    )
    k1 = _card("k1", card_start="2026-01-01", card_end="2026-01-10")
    k2 = _card("k2", renews="k1", card_start="2026-01-06", card_end="2026-01-20")
    k3 = _card("k3", card_start="2026-03-01", card_end="2026-03-05")
    out = _compute(_case([_course(), k1, k2, k3]), _pack([_course_stage()], counters=[counter]))
    assert _counted(out, "toy.chain_days", "k1") == [20]
    assert _counted(out, "toy.chain_days", "k3") == [5]
    assert _counted(out, "toy.chain_days", "k2") == []


def test_a_counter_span_that_ends_before_it_starts_is_not_counted() -> None:
    # k1 ends 2026-01-01 before it starts 2026-01-10. The count is null, never a number,
    # and the card stage raises the conflict.
    counter = _counter("toy.card_days", "sum_of_days", {"record": "card"}, span=CARD_SPAN)
    k1 = _card("k1", card_start="2026-01-10", card_end="2026-01-01")
    out = _compute(_case([_course(), k1]), _pack([_course_stage(), CARD_STAGE], counters=[counter]))
    assert _counted(out, "toy.card_days", "k1") == [None]
    assert _mentions(out, "conflict:", "k1")
    assert out["verdict"]["state"] == "cannot_tell"


def test_a_counter_over_an_unknown_selection_counts_nothing_and_goes_to_the_dso() -> None:
    counter = _counter(
        "toy.full_time_count",
        "count_of_records",
        {"record": "card", "where": [{"field": "this.time", "in": ["full_time"]}]},
        group="all",
        limit_rule="toy.max_cards",
    )
    out = _compute(
        _case([_course(), _card(time="not_sure")]), _pack([_course_stage()], counters=[counter])
    )
    assert [i for i in out["computed"] if str(i["id"]).startswith("toy.full_time_count")] == []
    assert "k1.time.not_sure" in _reasons(out)
    assert out["verdict"]["state"] != "no_open_items"


UNEMPLOYMENT = _counter(
    "toy.unemployment",
    "days_without_qualifying_period",
    {"record": "card"},
    span=CARD_SPAN,
    qualifying={"record": "job", "where": [{"field": "this.under", "same_as": "outer.id"}]},
    hours_rule="toy.hours",
)


def test_days_without_qualifying_period_is_zero_before_the_card_starts() -> None:
    # k1 starts 2026-10-05, after today 2026-09-29. Counted through today: no day yet.
    k1 = _card("k1", card_start="2026-10-05", card_end="2027-10-04")
    out = _compute(_case([_course(), k1]), _pack([_course_stage()], counters=[UNEMPLOYMENT]))
    assert _counted(out, "toy.unemployment", "k1") == [0]


def test_days_of_a_not_qualifying_record_count_even_when_covered() -> None:
    # k1 from 2026-09-01; through today 2026-09-29 is 29 days. w1 from 2026-09-01 at 20
    # hours (at toy.hours 20) covers all 29. The trip 2026-09-10..2026-09-14 is not
    # qualifying: its 5 days (10, 11, 12, 13, 14) count. 29 - (29 - 5) = 5.
    counter = dict(UNEMPLOYMENT, not_qualifying={"record": "trip"})
    k1 = _card("k1", card_start="2026-09-01", card_end="2027-08-31")
    w1 = _rec("w1", "job", under="k1", start="2026-09-01", hours_per_week=20)
    t1 = _rec("t1", "trip", start="2026-09-10", end="2026-09-14")
    out = _compute(_case([_course(), k1, w1, t1]), _pack([_course_stage()], counters=[counter]))
    assert _counted(out, "toy.unemployment", "k1") == [5]


def test_a_qualifying_job_with_no_start_covers_no_day_and_its_start_is_asked() -> None:
    # w1 has no start: it covers nothing, all 29 days from 2026-09-01 to 2026-09-29 count,
    # and w1.start is asked.
    k1 = _card("k1", card_start="2026-09-01", card_end="2027-08-31")
    w1 = _rec("w1", "job", under="k1", hours_per_week=20)
    out = _compute(_case([_course(), k1, w1]), _pack([_course_stage()], counters=[UNEMPLOYMENT]))
    assert _counted(out, "toy.unemployment", "k1") == [29]
    assert "missing:w1.start" in _reasons(out)
    assert out["verdict"]["state"] == "cannot_tell"


# Verdict and refusals: SPEC point 6, CLAUDE.md hard rules (litigated, never checked), and
# the answer rules of programs.md 13 point 10.


def test_a_record_naming_a_category_the_case_does_not_list_is_refused() -> None:
    record = dict(_course(), category="h1b")
    case = _case([record])
    with pytest.raises(ValueError, match="category"):
        _compute(case, _pack([_course_stage()]))


def test_a_pack_whose_rules_were_never_checked_is_cannot_tell() -> None:
    out = _compute(_case([_course()]), _pack([_course_stage()], rules=[]))
    assert out["verdict"]["state"] == "cannot_tell"
    assert "rules_never_checked" in _reasons(out)


def test_a_litigated_rule_in_use_is_cannot_tell() -> None:
    stage = _course_stage(rule_ids=["toy.definition", "toy.fought"])
    out = _compute(_case([_course()]), _pack([stage]))
    assert out["verdict"]["state"] == "cannot_tell"
    assert "rule_in_litigation" in _reasons(out)


def test_a_conflict_answered_on_a_later_day_is_not_read() -> None:
    # A yes dated 2026-09-30, the day after today, is not an answer yet: the conflict stays.
    case = _case([_course(left_on="2026-05-01")])
    pack = _pack([_course_stage()], checks=[NOT_LEFT])
    asked = [q for q in _compute(case, pack)["questions"] if "toy.not_left" in q["id"]]
    assert asked
    case["confirmations"] = {
        q["id"]: {"answer": True, "on": "2026-09-30", "about": q.get("about", {})} for q in asked
    }
    out = _compute(case, pack)
    assert _mentions(out, "conflict:", "toy.not_left", "c1")
    assert out["verdict"]["state"] == "cannot_tell"


def test_an_open_window_with_every_date_checked_needs_you() -> None:
    # The window opens at c1's start 2025-01-06 and closes at its end 2026-10-05, so it is
    # open today, 2026-09-29, and nothing marks it done. Once every list is stated whole
    # and every typed date is confirmed as checked, the only reason left is the window.
    window = _win({"fact": "this.start"}, {"fact": "this.end"}, ["toy.definition"])
    pack = _pack([_course_stage(window)])
    case = _case([_course(end="2026-10-05")])
    first = _compute(case, pack)
    typed = {q["id"]: q for q in first["questions"]}
    answers = {
        qid: {"answer": True, "on": TODAY.isoformat(), "about": q["about"]}
        for qid, q in typed.items()
        if qid.startswith("typed_dates.")
    }
    case["confirmations"] = answers
    second = _compute(case, pack)
    more = {
        q["id"]: {"answer": True, "on": TODAY.isoformat(), "about": q["about"]}
        for q in second["questions"]
        if q["id"].startswith("typed_dates.checked.")
    }
    case["confirmations"] = {**answers, **more}
    out = _compute(case, pack)
    assert out["verdict"]["state"] == "needs_you"
    assert out["verdict"]["reasons"] == ["toy.w.c1"]
