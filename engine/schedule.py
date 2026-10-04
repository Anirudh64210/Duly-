"""N5: the dates of the Loop's timers and reminders (specs/step-w/SPEC-W2.md points 22 and
46; contracts/schedule.schema.json).

A pure function over a Clock, the packs' calendar and the product settings. A base, a cap or
a setting the engine cannot read gives no date and names why. Nothing is stored.
"""

from collections.abc import Callable, Mapping
from datetime import date, timedelta
from typing import Any

from engine.clocks import Clock, day_in_zone
from engine.dates import JUNETEENTH_ITEM, add_business_days, add_months, federal_holidays
from engine.path import compute
from engine.rulepack import Rulepack
from engine.settings import DATING_UNITS, load_settings, whole_setting

Json = dict[str, Any]

HOLIDAYS_LAW = "calendar.federal_holidays_law"
# The kinds of offset a request can name; a setting in another unit dates nothing.
OFFSETS = ("days", "business_days", "months")


class CalendarNotInForceError(ValueError):
    """No pack of the case holds a holiday list in force on a day a business-day count
    crosses. The schedule contract has no missing reason for it, so the request is refused."""


def schedule(request: Json, packs: list[Rulepack], clock: Clock) -> Json:
    """The response body of POST /v1/schedule for its request body."""
    case = request["case"]
    today = day_in_zone(clock, case["time_zone"])
    own = [p for p in packs if p.category in case["categories"]]
    items = {i["id"]: i for i in compute(case, packs, clock)["computed"] if i.get("unit") == "date"}
    settings = load_settings()

    def is_holiday(day: date) -> bool:
        for pack in own:
            row = pack.value(HOLIDAYS_LAW, day)
            if row is not None:
                listed = JUNETEENTH_ITEM in str(row["source"].get("quote", ""))
                return day in federal_holidays(day.year, juneteenth_listed=listed)
        raise CalendarNotInForceError(f"{HOLIDAYS_LAW}: no row in force on {day.isoformat()}")

    answers = [_answer(r, items, settings, today, is_holiday) for r in request["requests"]]
    return {"today": {"date": today.isoformat(), "time_zone": case["time_zone"]}, "dates": answers}


def _answer(
    r: Json,
    items: Mapping[str, Json],
    settings: Mapping[str, Any],
    today: date,
    is_holiday: Callable[[date], bool],
) -> Json:
    none: Json = {"id": r["id"], "date": None, "days_away": None}
    rule_ids: list[str] = []

    base_from = r["from"]
    if "item" in base_from:
        item = items.get(base_from["item"])
        if item is None:
            return {**none, "missing": "item_not_found"}
        if item["value"] is None:
            return {**none, "missing": "item_has_no_date"}
        base = date.fromisoformat(item["value"])
        rule_ids += item.get("rule_ids", [])
    elif "date" in base_from:
        base = date.fromisoformat(base_from["date"])
    else:
        base = today

    add = r["add"]
    planning = "setting" in add
    if planning:
        entry = next((s for s in settings["settings"] if s.get("id") == add["setting"]), None)
        if entry is None:
            return {**none, "missing": "setting_not_found"}
        unit = DATING_UNITS.get(str(entry.get("unit")))
        if unit not in OFFSETS:
            return {**none, "missing": "setting_unit_not_a_date_offset"}
        amount = whole_setting(settings, add["setting"])
    else:
        unit = next(k for k in OFFSETS if k in add)
        amount = add[unit]

    cap_date: date | None = None
    if "cap" in r:
        cap = items.get(r["cap"]["item"])
        if cap is None:
            return {**none, "missing": "cap_not_found"}
        if cap["value"] is None:
            return {**none, "missing": "cap_has_no_date"}
        cap_date = date.fromisoformat(cap["value"])
        rule_ids += cap.get("rule_ids", [])

    sign = r["sign"]
    if unit == "days":
        found = base + sign * timedelta(days=amount)
    elif unit == "months":
        found = add_months(base, sign * amount)
    else:
        found = add_business_days(base, amount, is_holiday, sign)
        rule_ids.append(HOLIDAYS_LAW)

    out: Json = {"id": r["id"]}
    if cap_date is not None and found > cap_date:
        found = cap_date
        out["capped"] = True
    out["date"] = found.isoformat()
    out["days_away"] = (found - today).days
    if planning:
        out["planning"] = True
    out["rule_ids"] = list(dict.fromkeys(rule_ids))
    out["inputs"] = {
        "base": base.isoformat(),
        "amount": amount,
        "unit": unit,
        "sign": sign,
        "today": today.isoformat(),
    }
    if cap_date is not None:
        out["inputs"]["cap"] = cap_date.isoformat()
    return out
