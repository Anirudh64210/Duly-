"""engine/path.py over records, tested with small packs made here.

Specified in specs/path-1/SPEC.md ("The engine", points 1 to 7, and "The tests") and
specs/path-1/programs.md sections 10 to 13, 19 and 22, over the contracts on this branch
(contracts/case.schema.json, contracts/rulepack.schema.json, contracts/engine_output.schema.json;
specs/path-1/contracts-reconciled.md).

The pack below is for category j1, which the repo holds no pack for, and uses names that
belong to no real category (course, card, job, change; rules toy.*). Its quotes are
placeholders, not the words of any source. So a test passes only for an engine that reads
the pack, never one that knows F-1.

The SPEC names no function in engine/path.py. These tests call
engine.path.compute(case, packs, clock) with the raw case dict, a list of Rulepack from
engine.rulepack.validate_pack, and a Clock. That signature is this lane's assumption; it is
listed under requests in tests/REPORT.json, and only _compute changes if the builder picks
another. The module is imported inside _compute, so collection passes before it exists.

Items are found by the rule they name and the record they belong to, never by an item id
the SPEC does not fix. Expected to fail until the build round.
"""

import ast
import copy
import importlib
import json
import re
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
import yaml
from hypothesis import given, settings
from hypothesis import strategies as st
from jsonschema import Draft202012Validator, FormatChecker

from engine.clocks import FixedClock
from engine.rulepack import Rulepack, validate_pack

REPO_ROOT = Path(__file__).resolve().parents[3]
CONTRACTS = REPO_ROOT / "contracts"
CASE_SCHEMA = json.loads((CONTRACTS / "case.schema.json").read_text())
OUTPUT_SCHEMA = json.loads((CONTRACTS / "engine_output.schema.json").read_text())
PACK_SCHEMA = json.loads((CONTRACTS / "rulepack.schema.json").read_text())
PATH_PY = REPO_ROOT / "engine" / "path.py"
TODAY = date(2026, 9, 29)
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


# Values of the test pack. None is the value of any real rule.
RULES = [
    _row("toy.definition", True, "flag"),
    _row("toy.open_before_days", 10, "days"),
    _row("toy.close_after_days", 5, "days"),
    _row("toy.file_before_days", 20, "days"),
    _row("toy.file_after_days", 30, "days"),
    _row("toy.review_after_days", 30, "days"),
    _row("toy.longest_months", 12, "months"),
    _row("toy.limit_days", 3, "days"),
    _row("toy.days_bar", 30, "days"),
    _row("toy.max_cards", 2, "count"),
    _row("toy.hours", 20, "hours_per_week"),
    _row("toy.fy_start", "10-01", "date"),
    _row("toy.cutoff", "04-01", "date"),
    _row("toy.newer_days", 7, "days", effective_from="2026-01-01"),
]

RECORD_KINDS = [
    {
        "id": "course",
        "label": "Course",
        "id_prefix": "c",
        "fields": [
            {"id": "start", "kind": "date", "label": "Start"},
            {
                "id": "end",
                "kind": "date",
                "label": "End",
                "history": {
                    "record": "change",
                    "link": "course",
                    "old": "old_end",
                    "new": "new_end",
                    "from": "granted_on",
                },
            },
            {
                "id": "level",
                "kind": "choice",
                "label": "Level",
                "choices": ["low", "high"],
                "not_sure": True,
            },
            {"id": "done_on", "kind": "date", "label": "Done on", "happened": True},
            {"id": "left_on", "kind": "date", "label": "Left on", "happened": True},
        ],
    },
    {
        "id": "change",
        "label": "Change of end",
        "id_prefix": "ec",
        "fields": [
            {"id": "course", "kind": "link", "label": "Course", "to": ["course"]},
            {"id": "old_end", "kind": "date", "label": "Old end"},
            {"id": "new_end", "kind": "date", "label": "New end"},
            {"id": "granted_on", "kind": "date", "label": "Granted on", "happened": True},
        ],
    },
    {
        "id": "card",
        "label": "Card",
        "id_prefix": "k",
        "fields": [
            {"id": "course", "kind": "link", "label": "Course", "to": ["course"]},
            {"id": "card_start", "kind": "date", "label": "Card start"},
            {"id": "card_end", "kind": "date", "label": "Card end"},
            {"id": "filed_on", "kind": "date", "label": "Filed on", "happened": True},
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
]

COURSE_STAGE: dict[str, Any] = {
    "id": "course",
    "label": "Course",
    "for_each": {"record": "course"},
    "entered_when": ["this.start", "this.end"],
    "rule_ids": ["toy.definition"],
    "span": {"starts": {"fact": "this.start"}, "ends": {"fact": "this.end"}},
    "windows": [
        {
            "id": "toy.window",
            "label": "Window",
            "opens": {"fact": "this.end", "add": [{"rule": "toy.open_before_days", "sign": -1}]},
            "closes": {"fact": "this.end", "add": [{"rule": "toy.close_after_days"}]},
            "rule_ids": ["toy.open_before_days", "toy.close_after_days"],
            "done_when": ["this.done_on"],
        }
    ],
}

CARD_STAGE: dict[str, Any] = {
    "id": "card",
    "label": "Card",
    "for_each": {"record": "card"},
    "entered_when": ["this.card_start", "this.card_end"],
    "rule_ids": ["toy.definition"],
    "span": {
        "starts": {"fact": "this.card_start"},
        "ends": {"fact": "this.card_end"},
        "longest": {"rule": "toy.longest_months"},
    },
    "windows": [
        {
            "id": "toy.file",
            "label": "File",
            "opens": {
                "fact": "this.course.end",
                "add": [{"rule": "toy.file_before_days", "sign": -1}],
            },
            "closes": {"fact": "this.course.end", "add": [{"rule": "toy.file_after_days"}]},
            "rule_ids": ["toy.file_before_days", "toy.file_after_days"],
            "done_when": ["this.filed_on"],
        }
    ],
}

NEXT_CARD_IF_HIGH = {
    "stage": "card",
    "bind": {"course": "outer.id"},
    "only_if": [{"field": "this.level", "in": ["high"]}],
}


def _pack_dict(
    stages: list[dict[str, Any]] | None = None,
    *,
    checks: list[dict[str, Any]] | None = None,
    counters: list[dict[str, Any]] | None = None,
    rules: list[dict[str, Any]] | None = None,
    path: bool = True,
) -> dict[str, Any]:
    raw: dict[str, Any] = {
        "category": "j1",
        "jurisdiction": "us",
        "version": "v2026.09",
        "regimes": [],
        "parameters": copy.deepcopy(rules if rules is not None else RULES),
    }
    if path:
        raw["path"] = {
            "facts": [],
            "stages": copy.deepcopy(stages if stages is not None else [COURSE_STAGE]),
            "records": copy.deepcopy(RECORD_KINDS),
        }
        if checks:
            raw["path"]["checks"] = copy.deepcopy(checks)
        if counters:
            raw["path"]["counters"] = copy.deepcopy(counters)
    return raw


def _pack(*args: Any, **kwargs: Any) -> Rulepack:
    raw = _pack_dict(*args, **kwargs)
    problems = [e.message for e in Draft202012Validator(PACK_SCHEMA).iter_errors(raw)]
    assert problems == [], problems  # the test pack itself follows the contract
    return validate_pack(raw)


def _rec(record_id: str, kind: str, **fields: Any) -> dict[str, Any]:
    return {"id": record_id, "kind": kind, "fields": fields}


def _case(
    records: list[dict[str, Any]],
    complete: dict[str, Any] | None = None,
    confirmations: dict[str, Any] | None = None,
) -> dict[str, Any]:
    on = {"on": TODAY.isoformat()}
    case: dict[str, Any] = {
        "categories": ["j1"],
        "time_zone": "UTC",
        "facts": {},
        "records": records,
        "complete": complete
        if complete is not None
        else {"course": on, "card": on, "change": on, "job": on},
    }
    if confirmations:
        case["confirmations"] = confirmations
    validator = Draft202012Validator(CASE_SCHEMA, format_checker=FormatChecker())
    problems = [e.message for e in validator.iter_errors(case)]
    assert problems == [], problems  # the test case itself follows the contract
    return case


def _clock(day: date) -> FixedClock:
    return FixedClock(datetime(day.year, day.month, day.day, 12, 0, tzinfo=UTC))


def _compute(case: dict[str, Any], pack: Rulepack, today: date = TODAY) -> dict[str, Any]:
    path = importlib.import_module("engine.path")
    out: dict[str, Any] = path.compute(case, [pack], _clock(today))
    return out


def _belongs(item: dict[str, Any], record: str) -> bool:
    return item.get("record") == record or str(item["id"]).endswith("." + record)


def _dates(out: dict[str, Any], rule: str, record: str) -> set[str]:
    """Every date of an item that names the rule and belongs to the record."""
    found = {
        i["value"]
        for i in out["computed"]
        if rule in i["rule_ids"] and _belongs(i, record) and i["value"] is not None
    }
    found |= {i["date"] for i in out["upcoming"] if rule in i["rule_ids"] and _belongs(i, record)}
    return {str(v) for v in found}


def _reasons(out: dict[str, Any]) -> list[str]:
    return list(out["verdict"]["reasons"])


def _mentions(out: dict[str, Any], *parts: str) -> list[str]:
    """Reasons and question ids holding every part."""
    names = _reasons(out) + [q["id"] for q in out["questions"]]
    return [n for n in names if all(p in n for p in parts)]


def _valid(out: dict[str, Any]) -> None:
    validator = Draft202012Validator(OUTPUT_SCHEMA, format_checker=FormatChecker())
    assert [e.message for e in validator.iter_errors(out)] == []


C1 = _rec("c1", "course", start="2025-01-06", end="2026-10-20", level="high", done_on="2026-09-01")


# Point 1 and programs.md section 13 point 3: stages entered once for each record.


def test_a_for_each_stage_is_entered_once_for_each_record_with_its_record_id() -> None:
    c2 = _rec("c2", "course", start="2026-01-05", end="2027-05-14", level="low")
    out = _compute(_case([C1, c2]), _pack())
    _valid(out)
    stages = {s["id"]: s for s in out.get("stages", [])}
    assert "course.c1" in stages
    assert "course.c2" in stages
    assert stages["course.c1"].get("record") == "c1"
    assert stages["course.c1"].get("stage") == "course"


def test_a_stage_is_not_entered_while_an_entered_when_field_is_absent() -> None:
    # Point 1: entered when all its entered_when facts are present. c3 has no end, and this
    # pack leaves course.end `ask` (no when_absent), so the absence is unknown, not "not
    # entered": SPEC-W2-UNKNOWN point 29 emits c3's entry with state unknown, null dates and
    # c3.end in waits_on, asks c3.end, and the verdict is cannot_tell. c1 is entered as before.
    c3 = _rec("c3", "course", start="2026-01-05", level="low")
    out = _compute(_case([C1, c3]), _pack())
    stages = {s["id"]: s for s in out.get("stages", [])}
    assert "course.c1" in stages
    assert stages["course.c1"]["state"] != "unknown"
    entry = stages["course.c3"]
    assert (entry["state"], entry["starts"], entry["ends"]) == ("unknown", None, None)
    assert "c3.end" in entry.get("waits_on", [])
    assert "c3.end" in [q["id"] for q in out["questions"]]
    assert "missing:c3.end" in _reasons(out)
    assert out["verdict"]["state"] == "cannot_tell"


# Point 3: windows, done_when; programs.md 13 point 4: paths.


def test_a_window_is_the_end_moved_by_the_rule_amounts() -> None:
    # c1 ends 2026-10-20. Opens: 2026-10-20 minus toy.open_before_days 10 = 2026-10-10.
    # Closes: 2026-10-20 plus toy.close_after_days 5 = 2026-10-25. done_on is absent.
    c1 = _rec("c1", "course", start="2025-01-06", end="2026-10-20", level="high")
    out = _compute(_case([c1]), _pack())
    assert "2026-10-10" in _dates(out, "toy.open_before_days", "c1")
    assert "2026-10-25" in _dates(out, "toy.close_after_days", "c1")


def test_a_window_is_not_shown_ahead_once_its_done_when_field_is_entered() -> None:
    # Point 3: unless a done_when fact is entered. C1 has done_on 2026-09-01.
    out = _compute(_case([C1]), _pack())
    ahead = [u for u in out["upcoming"] if "toy.close_after_days" in u["rule_ids"]]
    assert ahead == []


def test_a_window_follows_a_link_to_another_record() -> None:
    # this.course.end: card k1's course c1 ends 2026-10-20. File opens 2026-10-20 minus 20
    # days = 2026-09-30; closes 2026-10-20 plus 30 days = 2026-11-19 (11 days to Oct 31,
    # then 19 into November).
    k1 = _rec("k1", "card", course="c1", card_start="2026-11-01", card_end="2027-04-30")
    out = _compute(_case([C1, k1]), _pack([COURSE_STAGE, CARD_STAGE]))
    assert "2026-09-30" in _dates(out, "toy.file_before_days", "k1")
    assert "2026-11-19" in _dates(out, "toy.file_after_days", "k1")


def test_every_item_of_a_for_each_stage_carries_its_record() -> None:
    # programs.md 13 point 3: every item ... carries record in the output.
    k1 = _rec("k1", "card", course="c1", card_start="2026-11-01", card_end="2027-04-30")
    out = _compute(_case([C1, k1]), _pack([COURSE_STAGE, CARD_STAGE]))
    named = [i for i in out["computed"] + out["upcoming"] if "toy.file_after_days" in i["rule_ids"]]
    assert named
    assert all(i.get("record") == "k1" for i in named)


# programs.md 13 point 7: next with bind; point 6: three answers.


def _with_next() -> list[dict[str, Any]]:
    course = copy.deepcopy(COURSE_STAGE)
    course["next"] = [NEXT_CARD_IF_HIGH]
    return [course, CARD_STAGE]


def test_next_with_bind_computes_the_next_stage_windows_for_a_record_not_yet_entered() -> None:
    # No card exists. bind sets course = c1, so this.course.end is 2026-10-20: the file
    # window opens 2026-09-30 (minus 20 days) and closes 2026-11-19 (plus 30 days).
    out = _compute(_case([C1]), _pack(_with_next()))
    found = {
        i.get("date", i.get("value"))
        for i in out["computed"] + out["upcoming"]
        if "toy.file_after_days" in i["rule_ids"]
    }
    assert "2026-11-19" in found


def test_next_is_not_shown_when_only_if_is_false() -> None:
    # level low: "in: [high]" is false, so the file window is not shown.
    c1 = dict(C1, fields=dict(C1["fields"], level="low"))
    out = _compute(_case([c1]), _pack(_with_next()))
    shown = [i for i in out["computed"] + out["upcoming"] if "toy.file_after_days" in i["rule_ids"]]
    assert shown == []


def test_next_with_an_unknown_condition_is_shown_and_never_quiet() -> None:
    # Point 6: not_sure makes the condition unknown. The step is never hidden as if closed,
    # and the not_sure answer gives the judgement item c1.level.not_sure (talk_to_dso).
    c1 = dict(C1, fields=dict(C1["fields"], level="not_sure"))
    out = _compute(_case([c1]), _pack(_with_next()))
    shown = [i for i in out["computed"] + out["upcoming"] if "toy.file_after_days" in i["rule_ids"]]
    assert shown != []
    assert out["verdict"]["state"] != "no_open_items"
    assert _mentions(out, "c1.level.not_sure")


def test_a_condition_on_an_absent_field_asks_for_it() -> None:
    # Point 6: "A missing field is asked, and the verdict is cannot_tell until it is
    # answered." Missing fields are named <record id>.<field> (section 21, point 6).
    fields = {k: v for k, v in C1["fields"].items() if k != "level"}
    out = _compute(_case([dict(C1, fields=fields)]), _pack(_with_next()))
    assert "c1.level" in [q["id"] for q in out["questions"]]
    assert out["verdict"]["state"] == "cannot_tell"


# programs.md 13 point 9: optional members, as_of, fiscal year, day_before and day_after.


def _one_window(window: dict[str, Any]) -> list[dict[str, Any]]:
    stage = copy.deepcopy(COURSE_STAGE)
    stage["windows"] = [window]
    return [stage]


def _window(opens: dict[str, Any], closes: dict[str, Any], wid: str = "toy.w") -> dict[str, Any]:
    return {
        "id": wid,
        "label": "W",
        "opens": opens,
        "closes": closes,
        "rule_ids": ["toy.definition"],
    }


def test_an_optional_member_is_skipped_when_absent() -> None:
    # earliest_of [end, optional left_on]. SPEC-W2-UNKNOWN point 16: an optional member is
    # passed over only when its value is N, so the pack declares left_on `when_absent: none`
    # (point 2: a field read through an optional member declares none or not_yet). left_on
    # absent is then N: closes on end, 2026-10-20. With the default `ask`, the same absence is
    # unknown: the close is withheld with c1.left_on in waits_on and c1.left_on is asked.
    closes = {"earliest_of": [{"fact": "this.end"}, {"fact": "this.left_on", "optional": True}]}
    raw = _pack_dict(_one_window(_window({"fact": "this.start"}, closes)))
    course = next(k for k in raw["path"]["records"] if k["id"] == "course")
    left_on = next(f for f in course["fields"] if f["id"] == "left_on")
    left_on["when_absent"] = "none"
    assert [e.message for e in Draft202012Validator(PACK_SCHEMA).iter_errors(raw)] == []
    c1 = _rec("c1", "course", start="2025-01-06", end="2026-10-20", level="high")
    assert "2026-10-20" in _dates(_compute(_case([c1]), validate_pack(raw)), "toy.definition", "c1")
    asked = _compute(_case([c1]), _pack(_one_window(_window({"fact": "this.start"}, closes))))
    assert _dates(asked, "toy.definition", "c1") == {"2025-01-06"}  # opens on start, no close
    held = [i for i in asked["computed"] if i["id"] == "toy.w.closes.c1"]
    assert [(i["value"], "c1.left_on" in i.get("waits_on", [])) for i in held] == [(None, True)]
    assert "missing:c1.left_on" in _reasons(asked)


def test_an_optional_member_counts_when_present() -> None:
    # left_on 2026-06-30 is earlier than end 2026-10-20: closes on 2026-06-30.
    closes = {"earliest_of": [{"fact": "this.end"}, {"fact": "this.left_on", "optional": True}]}
    pack = _pack(_one_window(_window({"fact": "this.start"}, closes)))
    c1 = _rec(
        "c1", "course", start="2025-01-06", end="2026-10-20", level="high", left_on="2026-06-30"
    )
    found = _dates(_compute(_case([c1]), pack), "toy.definition", "c1")
    assert "2026-06-30" in found
    assert "2026-10-20" not in found


def test_a_member_not_optional_makes_the_date_missing_and_asks_for_it() -> None:
    # "Any other absent member makes the date missing": left_on absent, not optional.
    closes = {"earliest_of": [{"fact": "this.end"}, {"fact": "this.left_on"}]}
    pack = _pack(_one_window(_window({"fact": "this.start"}, closes)))
    c1 = _rec("c1", "course", start="2025-01-06", end="2026-10-20", level="high")
    out = _compute(_case([c1]), pack)
    assert "2026-10-20" not in _dates(out, "toy.definition", "c1")
    assert "c1.left_on" in [q["id"] for q in out["questions"]]


def test_day_before_and_day_after_move_one_calendar_day() -> None:
    # end 2027-03-01: the day before is 2027-02-28 (2027 is not a leap year); the day
    # after is 2027-03-02.
    pack = _pack(
        _one_window(
            _window(
                {"fact": "this.end", "day_before": True}, {"fact": "this.end", "day_after": True}
            )
        )
    )
    c1 = _rec("c1", "course", start="2025-01-06", end="2027-03-01", level="high")
    found = _dates(_compute(_case([c1]), pack), "toy.definition", "c1")
    assert {"2027-02-28", "2027-03-02"} <= found


def _fiscal(start: str) -> set[str]:
    closes = {
        "month_day_rule": "toy.cutoff",
        "in_fiscal_year_of": "this.start",
        "fiscal_year_rule": "toy.fy_start",
    }
    window = _window({"fact": "this.start"}, closes)
    window["rule_ids"] = ["toy.cutoff", "toy.fy_start"]
    c1 = _rec("c1", "course", start=start, end="2027-06-30", level="high")
    return _dates(_compute(_case([c1]), _pack(_one_window(window))), "toy.cutoff", "c1")


def test_in_fiscal_year_of_a_date_before_the_fiscal_year_start() -> None:
    # Fiscal years start 10-01. 2025-01-06 is in the year 2024-10-01 to 2025-09-30, whose
    # 04-01 is 2025-04-01.
    assert "2025-04-01" in _fiscal("2025-01-06")


def test_in_fiscal_year_of_a_date_after_the_fiscal_year_start() -> None:
    # 2025-10-06 is in the year 2025-10-01 to 2026-09-30, whose 04-01 is 2026-04-01.
    found = _fiscal("2025-10-06")
    assert "2026-04-01" in found
    assert "2025-04-01" not in found


def _as_of(filed_on: str) -> set[str]:
    card = copy.deepcopy(CARD_STAGE)
    card["windows"] = [
        {
            "id": "toy.review",
            "label": "Review",
            "opens": {"fact": "this.course.end", "as_of": {"fact": "this.filed_on"}},
            "closes": {
                "fact": "this.course.end",
                "as_of": {"fact": "this.filed_on"},
                "add": [{"rule": "toy.review_after_days"}],
            },
            "rule_ids": ["toy.review_after_days"],
        }
    ]
    c2 = _rec("c2", "course", start="2025-01-06", end="2026-12-15", level="high")
    ec1 = _rec(
        "ec1",
        "change",
        course="c2",
        old_end="2026-10-20",
        new_end="2026-12-15",
        granted_on="2026-08-01",
    )
    k1 = _rec(
        "k1", "card", course="c2", filed_on=filed_on, card_start="2027-01-04", card_end="2027-12-31"
    )
    out = _compute(_case([c2, ec1, k1]), _pack([COURSE_STAGE, card]))
    return _dates(out, "toy.review_after_days", "k1")


def test_as_of_reads_the_end_in_force_before_the_change() -> None:
    # filed 2026-07-01, before the change granted 2026-08-01: the end then was 2026-10-20;
    # plus 30 days is 2026-11-19.
    found = _as_of("2026-07-01")
    assert "2026-11-19" in found
    assert "2027-01-14" not in found


def test_as_of_reads_the_end_in_force_after_the_change() -> None:
    # filed 2026-08-15, after 2026-08-01: the end is 2026-12-15; plus 30 days is 2027-01-14
    # (16 days to Dec 31, then 14 into January).
    found = _as_of("2026-08-15")
    assert "2027-01-14" in found
    assert "2026-11-19" not in found


# Point 5: facts that do not fit, and programs.md 13 point 10: declared checks.


def _card_case(**fields: Any) -> dict[str, Any]:
    return _case([C1, _rec("k1", "card", course="c1", **fields)])


def test_a_happened_date_after_today_is_a_conflict() -> None:
    # filed_on is happened; 2026-10-05 is after today 2026-09-29.
    out = _compute(
        _card_case(filed_on="2026-10-05", card_start="2026-11-01", card_end="2027-04-30"),
        _pack([COURSE_STAGE, CARD_STAGE]),
    )
    assert _mentions(out, "conflict:", "k1")
    assert out["verdict"]["state"] == "cannot_tell"


def test_a_happened_date_on_today_is_no_conflict() -> None:
    out = _compute(
        _card_case(filed_on="2026-09-29", card_start="2026-11-01", card_end="2027-04-30"),
        _pack([COURSE_STAGE, CARD_STAGE]),
    )
    assert _mentions(out, "conflict:", "k1") == []


def test_a_span_that_ends_before_it_starts_is_a_conflict() -> None:
    out = _compute(
        _card_case(filed_on="2026-01-05", card_start="2026-05-01", card_end="2026-04-01"),
        _pack([COURSE_STAGE, CARD_STAGE]),
    )
    assert _mentions(out, "conflict:", "k1")


def test_a_span_longer_than_its_longest_amount_is_a_conflict() -> None:
    # 2025-01-01 plus toy.longest_months 12 is 2026-01-01; 2026-06-01 is five months past.
    out = _compute(
        _card_case(filed_on="2024-12-01", card_start="2025-01-01", card_end="2026-06-01"),
        _pack([COURSE_STAGE, CARD_STAGE]),
    )
    assert _mentions(out, "conflict:", "k1")


def test_a_span_well_inside_its_longest_amount_is_no_conflict() -> None:
    # 2025-01-01 to 2025-10-31 is ten months, inside twelve. No other input conflicts: the
    # card starts after c1 starts and nothing happened after today.
    out = _compute(
        _card_case(filed_on="2024-12-01", card_start="2025-01-01", card_end="2025-10-31"),
        _pack([COURSE_STAGE, CARD_STAGE]),
    )
    assert _mentions(out, "conflict:", "k1") == []


CHECK_AFTER_COURSE = {
    "id": "toy.card_after_course",
    "for_each": {"record": "card"},
    "holds": [{"field": "this.card_start", "after": {"fact": "this.course.end"}}],
    "rule_ids": ["toy.definition"],
}


def test_a_declared_check_that_does_not_hold_is_a_conflict_named_by_check_and_record() -> None:
    # c1 ends 2026-10-20; k1 starts 2026-06-01, not after it.
    out = _compute(
        _card_case(filed_on="2026-05-01", card_start="2026-06-01", card_end="2026-12-31"),
        _pack([COURSE_STAGE, CARD_STAGE], checks=[CHECK_AFTER_COURSE]),
    )
    assert _mentions(out, "conflict:", "toy.card_after_course", "k1")
    assert out["verdict"]["state"] == "cannot_tell"


def test_a_declared_check_that_holds_raises_nothing() -> None:
    out = _compute(
        _card_case(filed_on="2026-09-01", card_start="2026-11-01", card_end="2027-04-30"),
        _pack([COURSE_STAGE, CARD_STAGE], checks=[CHECK_AFTER_COURSE]),
    )
    assert _mentions(out, "toy.card_after_course") == []


def _typed_dates_checked(case: dict[str, Any], pack: Rulepack) -> dict[str, Any]:
    """SPEC-W2-UNKNOWN point 37: compute decides through engine.verdict.decide, so a verdict is
    never talk_to_dso while any question is open, the D59 typed-date questions included. The
    case with typed_dates.from_documents answered yes and each typed date checked, so the
    matter a test is about is the only one left."""
    case = copy.deepcopy(case)
    confirmations = dict(case.get("confirmations", {}))
    for _ in range(2):  # the checks are asked only after the yes
        for q in _compute(case, pack)["questions"]:
            if q["id"].startswith("typed_dates."):
                about = q.get("about", {})
                confirmations[q["id"]] = {"answer": True, "on": TODAY.isoformat(), "about": about}
        case["confirmations"] = confirmations
    return case


def test_a_conflict_confirmed_as_on_the_documents_gives_talk_to_dso() -> None:
    # programs.md 13 point 10: "a yes gives talk_to_dso with the judgement item". The
    # confirmation is keyed by the question the engine itself raised.
    case = _card_case(filed_on="2026-05-01", card_start="2026-06-01", card_end="2026-12-31")
    pack = _pack([COURSE_STAGE, CARD_STAGE], checks=[CHECK_AFTER_COURSE])
    first = _compute(case, pack)
    asked = [q for q in first["questions"] if "toy.card_after_course" in q["id"]]
    assert asked
    case["confirmations"] = {
        q["id"]: {"answer": True, "on": TODAY.isoformat(), "about": q.get("about", {})}
        for q in asked
    }
    out = _compute(_typed_dates_checked(case, pack), pack)  # point 37
    assert out["verdict"]["state"] == "talk_to_dso"


def test_a_judgement_check_that_does_not_hold_goes_to_the_dso_at_once() -> None:
    # done_on 2026-09-01 is after end 2026-08-20. A judgement check gives talk_to_dso at
    # once, with no question first. Point 37: no other question may be open, so the typed
    # dates are checked, and c2 (2026-01-05 to 2027-05-14, done 2026-09-01, on or before its
    # end) keeps a span past today, so record.ends_before_today is not asked.
    check = {
        "id": "toy.done_by_end",
        "for_each": {"record": "course"},
        "holds": [{"field": "this.done_on", "on_or_before": {"fact": "this.end"}}],
        "kind": "judgement",
        "rule_ids": ["toy.definition"],
    }
    c1 = _rec(
        "c1", "course", start="2025-01-06", end="2026-10-20", level="high", done_on="2026-09-01"
    )
    late = dict(c1, fields=dict(c1["fields"], end="2026-08-20"))
    c2 = _rec(
        "c2", "course", start="2026-01-05", end="2027-05-14", level="low", done_on="2026-09-01"
    )
    pack = _pack(checks=[check])
    ok = _compute(_case([c1]), pack)
    bad = _compute(_typed_dates_checked(_case([late, c2]), pack), pack)
    assert _mentions(ok, "toy.done_by_end") == []
    assert _mentions(bad, "toy.done_by_end", "c1")
    assert not [q for q in bad["questions"] if "toy.done_by_end" in q["id"]]
    assert bad["verdict"]["state"] == "talk_to_dso"


# programs.md 13 point 11: calculators and groupings.


def _counter(
    cid: str, calculator: str, of: dict[str, Any], group: str, limit: str, **extra: Any
) -> dict[str, Any]:
    counter = {
        "id": cid,
        "calculator": calculator,
        "scope": {"of": of, "group": group},
        "limit_rule": limit,
        "rule_ids": ["toy.definition"],
    }
    if "value_of" in extra:
        counter["scope"]["value_of"] = extra.pop("value_of")
    counter.update(extra)
    return counter


CARD_SPAN = {"starts": {"fact": "this.card_start"}, "ends": {"fact": "this.card_end"}}


def _counted(out: dict[str, Any], cid: str) -> list[Any]:
    return [i["value"] for i in out["computed"] if str(i["id"]).startswith(cid)]


def test_sum_of_days_counts_each_day_once_where_spans_overlap() -> None:
    # k1 2026-01-01..2026-01-10 and k2 2026-01-06..2026-01-15. Union 2026-01-01..2026-01-15,
    # first and last day included: 15 days (not 10 + 10 = 20).
    counter = _counter(
        "toy.card_days", "sum_of_days", {"record": "card"}, "all", "toy.days_bar", span=CARD_SPAN
    )
    k1 = _rec(
        "k1",
        "card",
        course="c1",
        filed_on="2025-12-01",
        card_start="2026-01-01",
        card_end="2026-01-10",
    )
    k2 = _rec(
        "k2",
        "card",
        course="c1",
        filed_on="2025-12-01",
        card_start="2026-01-06",
        card_end="2026-01-15",
    )
    out = _compute(_case([C1, k1, k2]), _pack(counters=[counter]))
    assert 15 in _counted(out, "toy.card_days")


def test_count_of_records_at_the_limit_steps_back() -> None:
    # toy.max_cards is 2. Two cards: count 2, at the limit, so the verdict carries
    # toy.cards.at_or_over_limit.<group> (talk_to_dso).
    counter = _counter("toy.cards", "count_of_records", {"record": "card"}, "all", "toy.max_cards")
    k1 = _rec(
        "k1",
        "card",
        course="c1",
        filed_on="2025-12-01",
        card_start="2026-01-01",
        card_end="2026-01-10",
    )
    k2 = _rec(
        "k2",
        "card",
        course="c1",
        filed_on="2025-12-01",
        card_start="2026-02-01",
        card_end="2026-02-10",
    )
    out = _compute(_case([C1, k1, k2]), _pack(counters=[counter]))
    assert [r for r in _reasons(out) if r.startswith("toy.cards.at_or_over_limit")]


def test_count_of_records_below_the_limit_does_not_step_back() -> None:
    counter = _counter("toy.cards", "count_of_records", {"record": "card"}, "all", "toy.max_cards")
    k1 = _rec(
        "k1",
        "card",
        course="c1",
        filed_on="2025-12-01",
        card_start="2026-01-01",
        card_end="2026-01-10",
    )
    out = _compute(_case([C1, k1]), _pack(counters=[counter]))
    assert 1 in _counted(out, "toy.cards")
    assert not [r for r in _reasons(out) if r.startswith("toy.cards.at_or_over_limit")]


def _months_case(level_of_second: str) -> dict[str, Any]:
    # Two cards of about seven months each: 2025-01-01..2025-07-31 and 2026-01-01..2026-07-31.
    # At one level they add up to about 14 months, over toy.longest_months 12. Apart, each
    # level holds about 7.
    c2 = _rec("c2", "course", start="2024-01-08", end="2024-12-20", level=level_of_second)
    k1 = _rec(
        "k1",
        "card",
        course="c1",
        filed_on="2024-12-01",
        card_start="2025-01-01",
        card_end="2025-07-31",
    )
    k2 = _rec(
        "k2",
        "card",
        course="c2",
        filed_on="2025-12-01",
        card_start="2026-01-01",
        card_end="2026-07-31",
    )
    return _case([C1, c2, k1, k2])


MONTHS = _counter(
    "toy.months",
    "sum_of_months",
    {"record": "card"},
    "same_value",
    "toy.longest_months",
    value_of="this.course.level",
    span=CARD_SPAN,
)


def test_sum_of_months_grouped_by_a_shared_value_over_the_limit() -> None:
    out = _compute(_months_case("high"), _pack(counters=[MONTHS]))
    assert [
        r
        for r in _reasons(out)
        if r.startswith("toy.months.at_or_over_limit") and r.endswith("high")
    ]


def test_sum_of_months_keeps_groups_apart() -> None:
    out = _compute(_months_case("low"), _pack(counters=[MONTHS]))
    assert not [r for r in _reasons(out) if r.startswith("toy.months.at_or_over_limit")]


UNEMPLOYMENT = _counter(
    "toy.unemployment",
    "days_without_qualifying_period",
    {"record": "card"},
    "record",
    "toy.limit_days",
    span=CARD_SPAN,
    qualifying={"record": "job", "where": [{"field": "this.under", "same_as": "outer.id"}]},
    hours_rule="toy.hours",
)


def _unemployed(job_start: str, hours: float, under: str = "k1") -> dict[str, Any]:
    k1 = _rec(
        "k1",
        "card",
        course="c1",
        filed_on="2026-06-01",
        card_start="2026-09-01",
        card_end="2027-08-31",
    )
    k2 = _rec(
        "k2",
        "card",
        course="c1",
        filed_on="2026-06-01",
        card_start="2025-01-01",
        card_end="2025-03-31",
    )
    # SPEC-W2-UNKNOWN point 22: this pack leaves job.end `ask`, so an absent end is unknown and
    # the span with it, never "still going". The job's end is stated: 2027-08-31, k1's own card
    # end, so the job runs past today (2026-09-29) as the counts below assume.
    w1 = _rec("w1", "job", under=under, start=job_start, end="2027-08-31", hours_per_week=hours)
    return _compute(_case([C1, k1, k2, w1]), _pack(counters=[UNEMPLOYMENT]))


def test_days_without_qualifying_period_counts_the_days_before_the_job() -> None:
    # k1 from 2026-09-01; job under k1 from 2026-09-06 at 25 hours (at or over toy.hours
    # 20). Days 09-01 to 09-05: 5, over toy.limit_days 3.
    out = _unemployed("2026-09-06", 25)
    assert 5 in _counted(out, "toy.unemployment")
    assert [
        r for r in _reasons(out) if r.startswith("toy.unemployment.at_or_over_limit") and "k1" in r
    ]


def test_days_without_qualifying_period_under_the_limit() -> None:
    # Job from 2026-09-03: days 09-01 and 09-02, 2 days, under 3.
    out = _unemployed("2026-09-03", 25)
    assert 2 in _counted(out, "toy.unemployment")
    assert not [
        r for r in _reasons(out) if r.startswith("toy.unemployment.at_or_over_limit") and "k1" in r
    ]


def test_a_job_under_the_hours_rule_does_not_qualify() -> None:
    # 10 hours is under 20: every day from 09-01 through today 09-29 counts, 29 days.
    assert 29 in _counted(_unemployed("2026-09-03", 10), "toy.unemployment")


def test_a_job_under_another_record_does_not_qualify() -> None:
    # The job is under k2, so none of k1's days is covered: 29 days through today.
    assert 29 in _counted(_unemployed("2026-09-03", 25, under="k2"), "toy.unemployment")


# programs.md section 12: a list is whole only when the person says so.


def test_a_list_a_shown_item_uses_without_a_statement_is_cannot_tell() -> None:
    # The unemployment counter uses the job list. Without complete.job:
    # unconfirmed:complete.job.
    k1 = _rec(
        "k1",
        "card",
        course="c1",
        filed_on="2026-06-01",
        card_start="2026-09-01",
        card_end="2027-08-31",
    )
    on = {"on": TODAY.isoformat()}
    case = _case([C1, k1], complete={"course": on, "card": on, "change": on})
    out = _compute(case, _pack(counters=[UNEMPLOYMENT]))
    assert "unconfirmed:complete.job" in _reasons(out)
    assert out["verdict"]["state"] == "cannot_tell"


def test_a_statement_for_a_list_that_grows_covers_only_its_own_day() -> None:
    # job grows_with_time. Stated whole on 2026-09-20; today is 2026-09-29, so the question
    # opens again for the days since (section 12, product-1 point 3).
    k1 = _rec(
        "k1",
        "card",
        course="c1",
        filed_on="2026-06-01",
        card_start="2026-09-01",
        card_end="2027-08-31",
    )
    on = {"on": TODAY.isoformat()}
    case = _case(
        [C1, k1], complete={"course": on, "card": on, "change": on, "job": {"on": "2026-09-20"}}
    )
    out = _compute(case, _pack(counters=[UNEMPLOYMENT]))
    assert "unconfirmed:complete.job" in _reasons(out)


def test_a_statement_made_today_closes_the_list_question() -> None:
    k1 = _rec(
        "k1",
        "card",
        course="c1",
        filed_on="2026-06-01",
        card_start="2026-09-01",
        card_end="2027-08-31",
    )
    w1 = _rec("w1", "job", under="k1", start="2026-09-02", hours_per_week=40)
    out = _compute(_case([C1, k1, w1]), _pack(counters=[UNEMPLOYMENT]))
    assert "unconfirmed:complete.job" not in _reasons(out)


def test_a_statement_for_a_list_that_does_not_grow_holds_on_later_days() -> None:
    # card does not grow with time: a statement from 2026-01-05 still holds today.
    on = {"on": TODAY.isoformat()}
    case = _case(
        [C1], complete={"course": {"on": "2026-01-05"}, "card": on, "change": on, "job": on}
    )
    out = _compute(case, _pack())
    assert "unconfirmed:complete.course" not in _reasons(out)


# programs.md section 12: record.ends_before_today.


def test_a_record_that_ends_before_today_asks_what_came_after() -> None:
    # c1 2024-01-08..2025-06-30; today 2026-09-29 is after every span, no later record.
    c1 = _rec(
        "c1", "course", start="2024-01-08", end="2025-06-30", level="high", done_on="2025-06-01"
    )
    out = _compute(_case([c1]), _pack())
    assert _mentions(out, "record.ends_before_today")
    assert out["verdict"]["state"] == "cannot_tell"


def test_a_record_whose_span_holds_today_does_not_ask() -> None:
    out = _compute(_case([C1]), _pack())
    assert _mentions(out, "record.ends_before_today") == []


def test_nothing_after_the_record_gives_talk_to_dso() -> None:
    # "Nothing after it" is the answer no to "Is there anything after it to add?": the
    # verdict is talk_to_dso with the judgement item.
    c1 = _rec(
        "c1", "course", start="2024-01-08", end="2025-06-30", level="high", done_on="2025-06-01"
    )
    first = _compute(_case([c1]), _pack())
    asked = [q for q in first["questions"] if "record.ends_before_today" in q["id"]]
    assert asked
    conf = {
        q["id"]: {"answer": False, "on": TODAY.isoformat(), "about": q.get("about", {})}
        for q in asked
    }
    case = _typed_dates_checked(_case([c1], confirmations=conf), _pack())  # point 37
    out = _compute(case, _pack())
    assert out["verdict"]["state"] == "talk_to_dso"


# Point 6: a pack with no path.


def test_a_pack_with_no_path_is_cannot_tell_with_category_not_covered() -> None:
    out = _compute(_case([]), _pack(path=False))
    _valid(out)
    assert out["verdict"]["state"] == "cannot_tell"
    assert "category_not_covered:j1" in _reasons(out)


def test_a_pack_with_an_empty_path_is_cannot_tell_with_category_not_covered() -> None:
    raw = _pack_dict()
    raw["path"] = {"facts": [], "stages": []}
    out = _compute(_case([]), validate_pack(raw))
    assert out["verdict"]["state"] == "cannot_tell"
    assert "category_not_covered:j1" in _reasons(out)


def test_a_record_of_a_kind_the_pack_does_not_declare_is_refused() -> None:
    # case.schema.json: "refuses a record whose kind or field the pack does not declare".
    # SPEC-W2-UNKNOWN point 39 (and P5, point 49): the refusal is CaseStructureError, in its
    # own plain words that never repeat what was sent, so the undeclared kind is not in it.
    from engine.path import CaseStructureError

    with pytest.raises(CaseStructureError) as refused:
        _compute(_case([C1, _rec("x1", "vessel", name="Boat")]), _pack())
    assert "vessel" not in str(refused.value)
    assert "Boat" not in str(refused.value)


def test_a_field_the_pack_does_not_declare_is_refused() -> None:
    # Point 39, as above: the undeclared field and its value are not in the words.
    from engine.path import CaseStructureError

    with pytest.raises(CaseStructureError) as refused:
        _compute(_case([dict(C1, fields=dict(C1["fields"], colour="blue"))]), _pack())
    assert "colour" not in str(refused.value)
    assert "blue" not in str(refused.value)


# programs.md 13 point 13: effective_from_basis.


def _basis(basis: str) -> dict[str, Any]:
    rules = [r for r in RULES if r["id"] != "toy.newer_days"]
    rules.append(
        _row("toy.newer_days", 7, "days", effective_from="2026-01-01", effective_from_basis=basis)
    )
    window = _window(
        {"fact": "this.done_on"}, {"fact": "this.done_on", "add": [{"rule": "toy.newer_days"}]}
    )
    window["rule_ids"] = ["toy.newer_days"]
    # done_on 2025-06-01 is before the row's first day, 2026-01-01.
    c1 = _rec(
        "c1", "course", start="2025-01-06", end="2026-10-20", level="high", done_on="2025-06-01"
    )
    return _compute(_case([c1]), _pack(_one_window(window), rules=rules))


def test_an_event_before_the_earliest_saved_copy_is_never_called_earlier_than_the_rule() -> None:
    text = json.dumps(_basis("earliest_saved_copy"))
    assert "rule_copy_not_saved_for_event_day" in text
    assert "rule_not_in_force_on_event_day" not in text


def test_an_event_before_a_stated_start_is_before_the_rule() -> None:
    text = json.dumps(_basis("stated"))
    assert "rule_not_in_force_on_event_day" in text
    assert "rule_copy_not_saved_for_event_day" not in text


# programs.md section 22: a property over days, with an injected clock.


@settings(max_examples=40, deadline=None)
@given(st.dates(min_value=date(2025, 1, 1), max_value=date(2028, 12, 31)))
def test_never_quiet_while_a_used_list_has_no_statement(today: date) -> None:
    # Whatever the day, a case whose counter uses the job list, with no statement for it,
    # is never no_open_items.
    k1 = _rec(
        "k1",
        "card",
        course="c1",
        filed_on="2024-06-01",
        card_start="2024-09-01",
        card_end="2029-08-31",
    )
    on = {"on": "2024-12-31"}
    case = _case([C1, k1], complete={"course": on, "card": on, "change": on})
    out = _compute(case, _pack(counters=[UNEMPLOYMENT]), today)
    assert out["today"]["date"] == today.isoformat()
    assert out["verdict"]["state"] != "no_open_items"


@settings(max_examples=40, deadline=None)
@given(st.dates(min_value=date(2025, 1, 1), max_value=date(2026, 10, 19)))
def test_never_quiet_while_a_condition_deciding_a_shown_step_is_unknown(today: date) -> None:
    # c1's level is not_sure and it decides the next step; any day inside c1's span.
    c1 = dict(C1, fields=dict(C1["fields"], level="not_sure"))
    out = _compute(_case([c1]), _pack(_with_next()), today)
    assert out["verdict"]["state"] != "no_open_items"


@settings(max_examples=40, deadline=None)
@given(st.dates(min_value=date(2025, 1, 1), max_value=date(2026, 10, 19)))
def test_never_quiet_while_a_check_is_open(today: date) -> None:
    case = _case(
        [
            C1,
            _rec(
                "k1",
                "card",
                course="c1",
                filed_on="2024-05-01",
                card_start="2024-06-01",
                card_end="2024-12-31",
            ),
        ]
    )
    out = _compute(case, _pack([COURSE_STAGE, CARD_STAGE], checks=[CHECK_AFTER_COURSE]), today)
    assert out["verdict"]["state"] != "no_open_items"


# SPEC: "No F-1 id, date, stage or number may appear in engine/path.py. A test checks
# this." programs.md 13: "No kind, field, choice value or rule of any pack is written in
# engine/path.py."


def _contract_words() -> set[str]:
    """Every property name and enum value in the contracts: the engine may use these."""
    words: set[str] = set()

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                if key == "properties" and isinstance(value, dict):
                    words.update(value)
                if key == "enum" and isinstance(value, list):
                    words.update(str(v) for v in value)
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    for name in ("case.schema.json", "rulepack.schema.json", "engine_output.schema.json"):
        walk(json.loads((CONTRACTS / name).read_text()))
    return words


def _pack_words() -> set[str]:
    """Every id, kind, field, choice, stage and rule named in the shipped packs."""
    words: set[str] = set()
    for path in (REPO_ROOT / "rulepacks").glob("*/*/parameters.yaml"):
        raw = yaml.safe_load(path.read_text()) or {}
        for row in raw.get("parameters", []):
            words.add(row["id"])
        body = raw.get("path") or {}

        def walk(node: Any) -> None:
            if isinstance(node, dict):
                for key in ("id", "stage", "record", "field", "limit_rule", "hours_rule"):
                    if isinstance(node.get(key), str):
                        words.add(node[key])
                for key in ("choices", "in", "ascending"):
                    if isinstance(node.get(key), list):
                        words.update(str(v) for v in node[key])
                for value in node.values():
                    walk(value)
            elif isinstance(node, list):
                for value in node:
                    walk(value)

        walk(body)
    return words


# programs.md section 10: the F-1 kinds and fields, named here so the test works before
# L-content writes the F-1 path.
F1_NAMES = {
    "program",
    "move",
    "end_date_change",
    "authorization",
    "employer",
    "work",
    "report",
    "trip",
    "petition",
    "withdrawal",
    "cpt",
    "opt_pre",
    "opt_post",
    "stem",
    "cap_gap",
    "grace",
    "us_on_f1",
    "outside_us",
    "opt_post_completion",
    "opt_pre_completion",
    "stem_extension",
    "bachelor",
    "master",
    "doctorate",
    "stem_list",
    "on_list",
    "cpt_days_stated",
    "release_date",
    "card_start",
    "card_end",
    "change_of_status",
    "requested_start",
}


def _literals() -> tuple[set[str], list[float]]:
    assert PATH_PY.exists(), "engine/path.py does not exist yet"
    tree = ast.parse(PATH_PY.read_text())
    docstrings = {
        id(n.body[0].value)
        for n in ast.walk(tree)
        if isinstance(n, ast.Module | ast.FunctionDef | ast.ClassDef | ast.AsyncFunctionDef)
        and n.body
        and isinstance(n.body[0], ast.Expr)
        and isinstance(n.body[0].value, ast.Constant)
    }
    strings: set[str] = set()
    numbers: list[float] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and id(node) not in docstrings:
            if isinstance(node.value, str):
                strings.add(node.value)
            elif isinstance(node.value, int | float) and not isinstance(node.value, bool):
                numbers.append(node.value)
    return strings, numbers


def test_path_py_names_no_kind_field_choice_stage_or_rule_of_any_pack() -> None:
    strings, _ = _literals()
    forbidden = (F1_NAMES | _pack_words()) - _contract_words()
    named = sorted(s for s in strings if s in forbidden)
    assert named == []


def test_path_py_names_no_category() -> None:
    strings, _ = _literals()
    categories = set(PACK_SCHEMA["properties"]["category"]["enum"])
    assert sorted(s for s in strings if s in categories or s.startswith("f1")) == []


def test_path_py_holds_no_date_and_no_number_but_zero_and_one() -> None:
    # A date is always a fact moved by sourced rule amounts; day_before and day_after are
    # one calendar day. So no literal date, and no number but 0 and 1.
    strings, numbers = _literals()
    assert [s for s in strings if re.search(r"\b(19|20)\d\d-\d\d-\d\d\b", s)] == []
    assert sorted({n for n in numbers if n not in (0, 1)}) == []


def test_the_scan_above_would_catch_a_planted_name() -> None:
    # Guards the scan itself: the forbidden set holds the F-1 kinds and a shipped rule id.
    forbidden = (F1_NAMES | _pack_words()) - _contract_words()
    assert "authorization" in forbidden
    assert "opt.max_months" in forbidden or not (REPO_ROOT / "rulepacks/f1-us").exists()


def test_day_arithmetic_used_in_this_file_is_right() -> None:
    # The working for the dates above, checked with the standard library.
    assert date(2026, 10, 20) - timedelta(days=20) == date(2026, 9, 30)
    assert date(2026, 10, 20) + timedelta(days=30) == date(2026, 11, 19)
    assert date(2026, 12, 15) + timedelta(days=30) == date(2027, 1, 14)
    assert date(2027, 3, 1) - timedelta(days=1) == date(2027, 2, 28)
    assert (date(2026, 1, 15) - date(2026, 1, 1)).days + 1 == 15
