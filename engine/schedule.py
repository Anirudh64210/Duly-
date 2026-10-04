"""N5: the dates of the Loop's timers and reminders (specs/step-w/SPEC-W2.md points 22 and
46; contracts/schedule.schema.json).

A pure function over a Clock, the packs' calendar and the product settings. A base, a cap or
a setting the engine cannot read, a day whose holidays are not known, or a date outside the
readable dates gives no date and names why; the other requests are still answered. Nothing is
stored.
"""

from collections.abc import Callable, Mapping
from datetime import date, timedelta
from typing import Any

from engine.clocks import Clock, day_in_zone
from engine.dates import JUNETEENTH_ITEM, add_business_days, add_months, federal_holidays
from engine.path import compute
from engine.readers import readable_days
from engine.rulepack import Rulepack
from engine.settings import DATING_UNITS, load_settings, whole_setting

Json = dict[str, Any]

HOLIDAYS_LAW = "calendar.federal_holidays_law"
# The kinds of offset a request can name; a setting in another unit dates nothing.
OFFSETS = ("days", "business_days", "months")


class CalendarNotInForceError(ValueError):
    """No pack of the case holds a holiday list in force on a day a business-day count
    crosses, so whether that day is a holiday is not known."""


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
    from_planning = False

    base_from = r["from"]
    if "item" in base_from:
        item = items.get(base_from["item"])
        if item is None:
            return {**none, "missing": "item_not_found"}
        if item["value"] is None:
            return {**none, "missing": "item_has_no_date"}
        base = date.fromisoformat(item["value"])
        rule_ids += item.get("rule_ids", [])
        from_planning = bool(item.get("planning"))
    elif "date" in base_from:
        base = date.fromisoformat(base_from["date"])
    else:
        base = today
    first, last = readable_days()
    if not first <= base <= last:
        return {**none, "missing": "outside_readable_dates"}

    add = r["add"]
    if "setting" in add:
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

    planning = from_planning or "setting" in add
    cap_date: date | None = None
    cap_planning = False
    if "cap" in r:
        cap = items.get(r["cap"]["item"])
        if cap is None:
            return {**none, "missing": "cap_not_found"}
        if cap["value"] is None:
            return {**none, "missing": "cap_has_no_date"}
        cap_date = date.fromisoformat(cap["value"])
        rule_ids += cap.get("rule_ids", [])
        cap_planning = bool(cap.get("planning"))

    sign = r["sign"]
    # A count longer than the readable span in days ends outside it in any unit: refused
    # before the arithmetic, so no date can overflow.
    if amount > (last - first).days:
        return {**none, "missing": "outside_readable_dates"}
    if unit == "days":
        found = base + sign * timedelta(days=amount)
    elif unit == "months":
        found = add_months(base, sign * amount)
    else:
        try:
            found = add_business_days(base, amount, is_holiday, sign)
        except CalendarNotInForceError:
            return {**none, "missing": "holidays_not_known"}
        rule_ids.append(HOLIDAYS_LAW)

    out: Json = {"id": r["id"]}
    if cap_date is not None and found > cap_date:
        found = cap_date
        out["capped"] = True
        planning = planning or cap_planning
    if not first <= found <= last:
        return {**none, "missing": "outside_readable_dates"}
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
