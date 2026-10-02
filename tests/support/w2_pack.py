"""Shared by tests/unit/engine/test_w2_windows.py, test_w2_limit_day.py and
tests/holdout/test_holdout_w2.py (specs/step-w/SPEC-W2.md points 45, 46 and 49, W2-P1).

Two kinds of pack:
- a toy pack for category j1 (course, card, job; toy.* rules with placeholder quotes), so that
  a test of N1 or N2 passes only for an engine that reads the pack and the settings;
- the shipped F-1 pack, read with engine.rulepack.load_all, for P1 to P3.

It holds no expected value: every expected date is worked out in the test that uses it.
The clock is always injected; nothing reads the system time.
"""

import copy
import json
import re
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker

from engine.clocks import FixedClock
from engine.rulepack import Rulepack, load_all, validate_pack
from tools.sources.verify import plain

REPO_ROOT = Path(__file__).resolve().parents[2]
CONTRACTS = REPO_ROOT / "contracts"
OUTPUT_SCHEMA = json.loads((CONTRACTS / "engine_output.schema.json").read_text())
CASE_SCHEMA = json.loads((CONTRACTS / "case.schema.json").read_text())
PACK_SCHEMA = json.loads((CONTRACTS / "rulepack.schema.json").read_text())
F1_DIR = REPO_ROOT / "rulepacks" / "f1-us" / "v2026.09"
URL = "https://www.ecfr.gov/current/title-8/section-214.2"


def clock_on(day: date) -> FixedClock:
    """Noon UTC on the day, so the person's day in UTC is the day itself."""
    return FixedClock(datetime(day.year, day.month, day.day, 12, 0, tzinfo=UTC))


def output_problems(out: dict[str, Any]) -> list[str]:
    """contracts/engine_output.schema.json as W2-P0 left it."""
    validator = Draft202012Validator(OUTPUT_SCHEMA, format_checker=FormatChecker())
    return [f"{list(e.path)}: {e.message}" for e in validator.iter_errors(out)]


def compute(case: dict[str, Any], packs: list[Rulepack], today: date) -> dict[str, Any]:
    from engine.path import compute as path_compute

    validator = Draft202012Validator(CASE_SCHEMA, format_checker=FormatChecker())
    problems = [e.message for e in validator.iter_errors(case)]
    assert problems == [], problems  # the test case itself follows the contract
    out: dict[str, Any] = path_compute(case, packs, clock_on(today))
    assert output_problems(out) == []
    return out


def rec(record_id: str, kind: str, **fields: Any) -> dict[str, Any]:
    return {"id": record_id, "kind": kind, "fields": dict(fields)}


# Readers of the output.


def windows(out: dict[str, Any]) -> list[dict[str, Any]]:
    return [w for s in out["stages"] for w in s["windows"]]


def windows_named(out: dict[str, Any], window_id: str) -> list[dict[str, Any]]:
    """Every window whose id is `<window_id>.<key>`, in any stage."""
    return [w for w in windows(out) if w["id"].startswith(window_id + ".")]


def stage_of(out: dict[str, Any], stage_id: str) -> dict[str, Any]:
    found = [s for s in out["stages"] if s["id"] == stage_id]
    assert len(found) == 1, [s["id"] for s in out["stages"]]
    one: dict[str, Any] = found[0]
    return one


def items(out: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {i["id"]: i for i in out["computed"]}


# The saved words of a rule.


def f1_pack() -> Rulepack:
    found = [p for p in load_all() if p.category == "f1"]
    assert len(found) == 1
    return found[0]


def saved_text(rule: dict[str, Any]) -> str:
    """The saved copy a rule names, as tools.sources.verify reads it."""
    raw = (F1_DIR / rule["source"]["snapshot"]).read_bytes()
    return plain(raw.decode("utf-8", errors="replace"))


def number_in_saved_words(pack: Rulepack, rule_id: str, phrase: str, on: date) -> int:
    """The number in `phrase` (a regex with one group), found in the rule's quote and in the
    saved copy it names, and equal to the value the pack holds in force on `on`. The test
    works its dates from this number, so a pack value the saved words do not state fails
    here before any date is compared."""
    rule = pack.value(rule_id, on)
    assert rule is not None, f"{rule_id}: not in force on {on}"
    quote = plain(rule["source"]["quote"])
    assert quote in saved_text(rule), f"{rule_id}: quote not in {rule['source']['snapshot']}"
    found = re.search(phrase, quote)
    assert found, f"{rule_id}: the saved words do not hold {phrase!r}"
    number = int(found.group(1))
    assert rule["value"] == number, f"{rule_id}: pack says {rule['value']}, words say {number}"
    return number


# The toy pack.


def toy_row(rule_id: str, value: Any, unit: str) -> dict[str, Any]:
    return {
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


TOY_RULES = [
    toy_row("toy.definition", True, "flag"),
    toy_row("toy.before_days", 20, "days"),
    toy_row("toy.hours", 20, "hours_per_week"),
    toy_row("toy.bar", 30, "days"),
    toy_row("toy.months", 12, "months"),
]

TOY_RECORDS = [
    {
        "id": "course",
        "label": "Course",
        "id_prefix": "c",
        "fields": [
            {"id": "start", "kind": "date", "label": "Start"},
            {"id": "end", "kind": "date", "label": "End"},
        ],
    },
    {
        "id": "card",
        "label": "Card",
        "id_prefix": "k",
        "fields": [
            {"id": "card_start", "kind": "date", "label": "Card start"},
            {"id": "card_end", "kind": "date", "label": "Card end"},
            {"id": "hours", "kind": "number", "label": "Hours"},
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


def toy_stage(*stage_windows: dict[str, Any], **extra: Any) -> dict[str, Any]:
    stage: dict[str, Any] = {
        "id": "course",
        "label": "Course",
        "for_each": {"record": "course"},
        "entered_when": ["this.start", "this.end"],
        "rule_ids": ["toy.definition"],
        "span": {"starts": {"fact": "this.start"}, "ends": {"fact": "this.end"}},
        "windows": list(stage_windows),
    }
    stage.update(extra)
    return stage


def toy_pack_dict(
    stages: list[dict[str, Any]],
    *,
    checks: list[dict[str, Any]] | None = None,
    counters: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    path: dict[str, Any] = {
        "facts": [],
        "stages": copy.deepcopy(stages),
        "records": copy.deepcopy(TOY_RECORDS),
    }
    if checks:
        path["checks"] = copy.deepcopy(checks)
    if counters:
        path["counters"] = copy.deepcopy(counters)
    return {
        "category": "j1",
        "jurisdiction": "us",
        "version": "v2026.09",
        "regimes": [],
        "parameters": copy.deepcopy(TOY_RULES),
        "path": path,
    }


def schema_problems(raw: dict[str, Any]) -> list[str]:
    return [e.message for e in Draft202012Validator(PACK_SCHEMA).iter_errors(raw)]


def toy_pack(stages: list[dict[str, Any]], **kwargs: Any) -> Rulepack:
    raw = toy_pack_dict(stages, **kwargs)
    assert schema_problems(raw) == []  # the test pack itself follows the contract
    return validate_pack(raw)


def toy_case(records: list[dict[str, Any]], on: date) -> dict[str, Any]:
    stated = {"on": on.isoformat()}
    return {
        "categories": ["j1"],
        "time_zone": "UTC",
        "facts": {},
        "records": records,
        "complete": {"course": stated, "card": stated, "job": stated},
    }
