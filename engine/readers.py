"""The readers, one per declared kind (specs/step-w/SPEC-W2-UNKNOWN.md points 3, 4 and 41).

A value is known only when it reads against the kind the pack declares for its field. A value
that does not read is unreadable and kept as entered, so it can be shown back and asked; it is
never converted, never read as absent. Pure: the declaration comes in, no pack is read.
"""

import math
import re
from collections.abc import Mapping
from datetime import date
from functools import cache
from typing import Any, Literal

from engine.settings import load_settings

ReadState = Literal["known", "absent", "unreadable", "undecided"]

NOT_SURE = "not_sure"
ISO_DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# A period's own dates and hours (contracts/case.schema.json $defs.period).
PERIOD_DATES = ("start", "end")
PERIOD_HOURS = "hours_per_week"


@cache
def _readable_days() -> tuple[date, date]:
    """dates.earliest_readable and dates.latest_readable in contracts/product_settings.yaml."""
    by_id = {row["id"]: row["value"] for row in load_settings()["settings"]}
    first = date.fromisoformat(str(by_id["dates.earliest_readable"]))
    last = date.fromisoformat(str(by_id["dates.latest_readable"]))
    return first, last


def _date(raw: object) -> date | None:
    # The pattern first: date.fromisoformat also reads basic and week forms (20260803).
    if not isinstance(raw, str) or not ISO_DAY.match(raw):
        return None
    try:
        day = date.fromisoformat(raw)
    except ValueError:
        return None
    first, last = _readable_days()
    return day if first <= day <= last else None


def _number(raw: object) -> int | float | None:
    if isinstance(raw, bool) or not isinstance(raw, int | float):
        return None
    return raw if math.isfinite(raw) else None


def _count(raw: object) -> int | None:
    if isinstance(raw, bool) or not isinstance(raw, int) or raw < 0:
        return None
    return raw


def _text(decl: Mapping[str, Any], raw: object) -> str | None:
    if not isinstance(raw, str) or not raw:
        return None
    if "max_length" in decl and len(raw) > int(decl["max_length"]):
        return None
    if "pattern" in decl and not re.search(str(decl["pattern"]), raw):
        return None
    return raw


def _link(decl: Mapping[str, Any], raw: object, run: Mapping[str, str]) -> str | None:
    if not isinstance(raw, str) or raw not in run:
        return None
    allowed = decl.get("to")
    return raw if allowed is None or run[raw] in allowed else None


def _period(raw: object) -> dict[str, Any] | None:
    if not isinstance(raw, dict) or "start" not in raw:
        return None
    read: dict[str, Any] = {}
    for key, value in raw.items():
        if value is None and key != "start":
            read[key] = None
            continue
        if key in PERIOD_DATES:
            got: object = _date(value)
        elif key == PERIOD_HOURS:
            got = _number(value)
        else:
            # Any other part of a period is a flag or a day (the case schema's own shape).
            got = value if isinstance(value, bool) else _date(value)
        if got is None:
            return None
        read[key] = got
    return read


def _periods(raw: object) -> list[dict[str, Any]] | None:
    if not isinstance(raw, list):
        return None
    read = [_period(one) for one in raw]
    return None if any(one is None for one in read) else [one for one in read if one is not None]


def _known(decl: Mapping[str, Any], raw: object, run: Mapping[str, str]) -> object | None:
    kind = decl.get("kind")
    if kind == "date":
        return _date(raw)
    if kind == "number":
        return _number(raw)
    if kind == "count":
        return _count(raw)
    if kind == "flag":
        return raw if isinstance(raw, bool) else None
    if kind == "choice":
        return raw if isinstance(raw, str) and raw in decl.get("choices", []) else None
    if kind == "text":
        return _text(decl, raw)
    if kind == "link":
        return _link(decl, raw, run)
    if kind == "periods":
        return _periods(raw)
    return None


def read(decl: Mapping[str, Any], raw: object, run: Mapping[str, str]) -> tuple[ReadState, object]:
    """The state of one value against its declaration, and the read value when known (else
    the value as entered). `run` maps each record id in this run to its kind."""
    if raw is None:
        return "absent", None
    if raw == NOT_SURE:
        return "undecided", raw
    known = _known(decl, raw, run)
    if known is None:
        return "unreadable", raw
    return "known", known
