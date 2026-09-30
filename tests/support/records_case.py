"""Records cases under contracts/case.schema.json, and readers for the engine output.

specs/path-1/programs.md Part 2 (the case contract, J01 as a case) and section 10 (the F-1
record kinds). A field left out is not known, so the builders never fill one in.

Shared by tests/unit/acceptance, tests/unit/engine/test_path_fix1.py and tests/holdout. It
holds no expected value: every expected date and count is written in the test that uses it.
"""

from datetime import UTC, date, datetime
from typing import Any

from engine.clocks import FixedClock

TODAY = date(2026, 9, 29)
ZONE = "America/New_York"
# 16:00 UTC is 12:00 in New York, so the person's day is 2026-09-29 (a Tuesday).
CLOCK = FixedClock(datetime(2026, 9, 29, 16, 0, tzinfo=UTC))


def clock_on(day: date) -> FixedClock:
    return FixedClock(datetime(day.year, day.month, day.day, 16, 0, tzinfo=UTC))


def rec(record_id: str, kind: str, **fields: Any) -> dict[str, Any]:
    return {"id": record_id, "kind": kind, "fields": dict(fields)}


def whole(*keys: str, on: str = "2026-09-29") -> dict[str, dict[str, str]]:
    """The person's statements that each named list is whole, given on `on`."""
    return {key: {"on": on} for key in keys}


def case(
    records: list[dict[str, Any]],
    complete: dict[str, dict[str, str]] | None = None,
    **extra: Any,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "categories": ["f1"],
        "time_zone": ZONE,
        "facts": {},
        "records": records,
        "complete": complete or {},
        "confirmations": {},
    }
    body.update(extra)
    return body


def stage(out: dict[str, Any], stage_id: str) -> dict[str, Any]:
    found = [s for s in out["stages"] if s["id"] == stage_id]
    assert found, f"no stage {stage_id} in {[s['id'] for s in out['stages']]}"
    one: dict[str, Any] = found[0]
    return one


def stage_ids(out: dict[str, Any]) -> list[str]:
    return [s["id"] for s in out["stages"]]


def window(out: dict[str, Any], window_id: str) -> tuple[Any, Any]:
    """(opens, closes) of the window with this id, in whichever stage holds it."""
    for s in out["stages"]:
        for w in s["windows"]:
            if w["id"] == window_id:
                return w["opens"], w["closes"]
    raise AssertionError(f"no window {window_id}")


def value(out: dict[str, Any], item_id: str) -> Any:
    found = [i for i in out["computed"] if i["id"] == item_id]
    assert found, f"no computed item {item_id}"
    return found[0]["value"]


def question_ids(out: dict[str, Any]) -> list[str]:
    return [q["id"] for q in out["questions"]]


def reasons(out: dict[str, Any]) -> list[str]:
    return list(out["verdict"]["reasons"])
