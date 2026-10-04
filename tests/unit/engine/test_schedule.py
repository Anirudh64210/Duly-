"""N5, engine/schedule.py: the engine dates the Loop's timers and reminders.

specs/step-w/SPEC-W2.md point 46 (N5: "a pure function over a Clock, the pack's calendar
(business days with the federal holidays the engine already counts out) and the settings"),
point 22 (the scheduler) and point 51 (this file); contracts/schedule.schema.json (K3).

Each test protects one sentence of the contract:
- add_business_days: "weekends and the federal holidays the engine already counts out (rule
  calendar.federal_holidays_law) are skipped. The answer names that rule." The holidays are
  read here from the pack's own quote of 5 U.S.C. 6103(a), never written in the test.
- add_months: "A day the target month does not have becomes that month's last day."
- cap: "The answer is never later than this item's date: a later result is moved back to it,
  and the answer says capped. A cap item with no date gives no date, never an uncapped one."
- schedule_answer.date: "null when the engine cannot give one; missing then says why. Never a
  guess." days_away: "Null exactly when date is null."
- add_setting: "a date from it is a planning date"; planning "present only when the amount
  came from a product setting".
- response: "One answer for each request, in the same order and with the same ids", and
  today "as the engine read it": its Clock in the case's time_zone.

The SPEC names the module and not its function. The name used here, asked of L-engine in
tests/REPORT.json, mirrors engine.path.compute: `engine.schedule.schedule(request, packs,
clock)`, where request is the body of POST /v1/schedule ($defs/request) and the return is the
200 body ($defs/response). Product settings are read from contracts/product_settings.yaml.

Every clock is injected. Written before engine/schedule.py exists: these cannot pass yet.
"""

import calendar
import importlib
import json
import re
from datetime import UTC, date, datetime, timedelta
from functools import cache
from pathlib import Path
from typing import Any

import pytest
import yaml
from hypothesis import given, settings
from hypothesis import strategies as st
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

from engine.clocks import FixedClock
from engine.path import compute
from engine.rulepack import load_all
from tests.support.records_case import rec

REPO_ROOT = Path(__file__).resolve().parents[3]
CONTRACTS = REPO_ROOT / "contracts"
SCHEDULE_SCHEMA = json.loads((CONTRACTS / "schedule.schema.json").read_text())
CASE_SCHEMA = json.loads((CONTRACTS / "case.schema.json").read_text())
SETTINGS = yaml.safe_load((CONTRACTS / "product_settings.yaml").read_text())["settings"]

HOLIDAYS_LAW = "calendar.federal_holidays_law"
ONE_DAY = timedelta(days=1)

# 02:00 UTC on 2026-09-30 is 19:00 on 2026-09-29 in Los Angeles. The person's day is Tuesday
# 2026-09-29; the clock's UTC day is the 30th. An engine that reads the UTC date is a day off.
ZONE = "America/Los_Angeles"
CLOCK = FixedClock(datetime(2026, 9, 30, 2, 0, tzinfo=UTC))
TODAY = date(2026, 9, 29)

PACKS = load_all()
F1 = next(p for p in PACKS if p.category == "f1")

# The case the item ids are read from (shapes as tests/unit/engine/test_w2_windows.py). Program
# end 2026-05-15; OPT recommended 2026-04-01, filed 2026-04-10, card 2026-06-01 to 2027-05-31.
# No STEM recommendation date, so the STEM last day has no date and its question stands.
LISTS_WHOLE = (
    "program",
    "authorization",
    "work",
    "trip",
    "move",
    "petition",
    "withdrawal",
    "end_date_change",
    "report",
)
CASE: dict[str, Any] = {
    "categories": ["f1"],
    "time_zone": ZONE,
    "facts": {},
    "records": [
        rec(
            "p1",
            "program",
            where="us_on_f1",
            level="master",
            stem_list="on_list",
            end_date="2026-05-15",
            state="completed",
        ),
        rec(
            "a1",
            "authorization",
            type="opt_post_completion",
            program="p1",
            decision="approved",
            dso_on="2026-04-01",
            filed_on="2026-04-10",
            card_start="2026-06-01",
            card_end="2027-05-31",
        ),
    ],
    "complete": {kind: {"on": TODAY.isoformat()} for kind in LISTS_WHOLE},
    "confirmations": {},
}
# The obligation used as a cap: the OPT filing deadline after the recommendation, dated by the
# engine. Hand working: 2026-04-01 plus 30 days (8 CFR 214.2(f)(11)(i)(B)(2), "within 30 days
# of the date the DSO enters the recommendation") is 2026-05-01.
CAP_ITEM = "opt.file_by.closes.a1"
CAP_DATE = date(2026, 5, 1)
# An item the engine computes with no date on this case (no STEM recommendation date).
UNDATED_ITEM = "stem.last_day.closes.a1"


# The contract.

_REGISTRY: Registry[Any] = Registry().with_resources(
    [
        (SCHEDULE_SCHEMA["$id"], Resource.from_contents(SCHEDULE_SCHEMA)),
        (CASE_SCHEMA["$id"], Resource.from_contents(CASE_SCHEMA)),
    ]
)


def _problems(message: Any, part: str) -> list[str]:
    schema = {"$ref": f"{SCHEDULE_SCHEMA['$id']}#/$defs/{part}"}
    validator = Draft202012Validator(schema, registry=_REGISTRY, format_checker=FormatChecker())
    return [f"{list(e.path)}: {e.message}" for e in validator.iter_errors(message)]


def test_the_test_case_and_a_request_follow_the_contract() -> None:
    # Guards the helpers: a request built here is one the contract accepts, and the validator
    # does refuse one it does not (sign 2). Fails if the registry stops resolving case.schema.
    body: dict[str, Any] = {"case": CASE, "requests": [req("r", {"today": True}, {"days": 1})]}
    assert _problems(body, "request") == []
    body["requests"][0]["sign"] = 2
    assert _problems(body, "request") != []


# The engine output for the case, read through engine.path, which the schedule must agree with.


@cache
def engine_items() -> dict[str, dict[str, Any]]:
    out = compute(CASE, PACKS, CLOCK)
    return {i["id"]: i for i in out["computed"]}


def dated_items() -> dict[str, date]:
    return {
        k: date.fromisoformat(i["value"])
        for k, i in engine_items().items()
        if i.get("unit") == "date" and i["value"] is not None
    }


def undated_items() -> list[str]:
    return sorted(
        k for k, i in engine_items().items() if i.get("unit") == "date" and i["value"] is None
    )


def test_the_case_gives_the_items_these_tests_rest_on() -> None:
    # Preconditions, read from engine.path, not from the schedule: the cap item is dated
    # 2026-05-01 (worked above) and UNDATED_ITEM has no date. Fails if the case stops giving
    # them, so a later failure is not read as the schedule's.
    assert date(2026, 4, 1) + timedelta(days=30) == CAP_DATE
    assert dated_items()[CAP_ITEM] == CAP_DATE
    assert UNDATED_ITEM in undated_items()


# The holidays the pack counts out, read from the pack's quote of 5 U.S.C. 6103(a).

_ORDINALS = {"first": 1, "second": 2, "third": 3, "fourth": 4}
_MONTHS = {name: i for i, name in enumerate(calendar.month_name) if name}
_WEEKDAYS = {name: i for i, name in enumerate(calendar.day_name)}
_FIXED = re.compile(r"([A-Z][a-z]+) (\d{1,2})\.")
_MOVING = re.compile(r"the (first|second|third|fourth|last) ([A-Z][a-z]+) in ([A-Z][a-z]+)\.")


def _holiday_list(quote: str, year: int) -> set[date]:
    """The days a quote of the form "Name, January 1. Name, the third Monday in January."
    lists for one year."""
    found = {date(year, _MONTHS[m], int(d)) for m, d in _FIXED.findall(quote) if m in _MONTHS}
    for which, weekday, month in _MOVING.findall(quote):
        days = [
            date(year, _MONTHS[month], d)
            for d in range(1, calendar.monthrange(year, _MONTHS[month])[1] + 1)
            if date(year, _MONTHS[month], d).weekday() == _WEEKDAYS[weekday]
        ]
        found.add(days[-1] if which == "last" else days[_ORDINALS[which] - 1])
    return found


@cache
def _pack_holidays(year: int, quote: str) -> frozenset[date]:
    return frozenset(_holiday_list(quote, year))


def pack_holiday(day: date) -> bool:
    """Whether the calendar.federal_holidays_law row in force on the day lists the day. The
    tests only count days after 2021-06-17, where the row in force quotes the whole list."""
    row = F1.value(HOLIDAYS_LAW, day)
    assert row is not None, f"no {HOLIDAYS_LAW} row in force on {day}"
    return day in _pack_holidays(day.year, row["source"]["quote"])


def test_the_holiday_list_is_read_from_the_pack() -> None:
    # Hand count of the quote: New Year's Day, King, Washington, Memorial, Juneteenth,
    # Independence, Labor, Columbus, Veterans, Thanksgiving, Christmas: eleven. In 2026:
    # Jan 1; Jan 19 (Mondays 5, 12, 19); Feb 16 (2, 9, 16); May 25 (last Monday); Jun 19;
    # Jul 4; Sep 7 (first Monday); Oct 12 (5, 12); Nov 11; Nov 26 (Thursdays 5, 12, 19, 26);
    # Dec 25. Fails if the reader drops or misplaces an item, which would hide a fault below.
    quote = F1.value(HOLIDAYS_LAW, TODAY)["source"]["quote"]  # type: ignore[index]
    assert _holiday_list(quote, 2026) == {
        date(2026, 1, 1),
        date(2026, 1, 19),
        date(2026, 2, 16),
        date(2026, 5, 25),
        date(2026, 6, 19),
        date(2026, 7, 4),
        date(2026, 9, 7),
        date(2026, 10, 12),
        date(2026, 11, 11),
        date(2026, 11, 26),
        date(2026, 12, 25),
    }


# Independent working of each offset.


def walk_business_days(base: date, n: int, sign: int) -> date:
    """The n-th business day from base in the sign's direction, counting from the next day."""
    day, left = base, n
    while left > 0:
        day += sign * ONE_DAY
        if day.weekday() < calendar.SATURDAY and not pack_holiday(day):
            left -= 1
    return day


def shift_months(base: date, n: int) -> date:
    index = base.year * 12 + base.month - 1 + n
    year, month0 = divmod(index, 12)
    last = calendar.monthrange(year, month0 + 1)[1]
    return date(year, month0 + 1, min(base.day, last))


def worked(base: date, add: dict[str, Any], sign: int) -> date:
    if "days" in add:
        return base + sign * timedelta(days=add["days"])
    if "business_days" in add:
        return walk_business_days(base, add["business_days"], sign)
    return shift_months(base, sign * add["months"])


# Calling the engine.


def req(
    rid: str, base: dict[str, Any], add: dict[str, Any], sign: int = 1, cap: str | None = None
) -> dict[str, Any]:
    out: dict[str, Any] = {"id": rid, "from": base, "add": add, "sign": sign}
    if cap is not None:
        out["cap"] = {"item": cap}
    return out


def run(
    *requests: dict[str, Any], case: dict[str, Any] = CASE, clock: FixedClock = CLOCK
) -> dict[str, Any]:
    # Imported here, not at the top, so the file is collected before N5 is written.
    schedule = importlib.import_module("engine.schedule").schedule
    body = {"case": case, "requests": list(requests)}
    assert _problems(body, "request") == []  # the test's own request follows the contract
    out: dict[str, Any] = schedule(body, PACKS, clock)
    assert _problems(out, "response") == []
    assert [a["id"] for a in out["dates"]] == [r["id"] for r in requests]
    for answer in out["dates"]:
        assert (answer["date"] is None) == (answer["days_away"] is None)
        assert (answer["date"] is None) == ("missing" in answer)
        if answer["date"] is not None:
            day = date.fromisoformat(answer["date"])
            assert answer["days_away"] == (day - date.fromisoformat(out["today"]["date"])).days
    return out


def one(request: dict[str, Any]) -> dict[str, Any]:
    answer: dict[str, Any] = run(request)["dates"][0]
    return answer


def on(answer: dict[str, Any]) -> date:
    assert answer["date"] is not None, answer
    return date.fromisoformat(answer["date"])


BASES = st.dates(min_value=date(2022, 1, 1), max_value=date(2034, 12, 31))
SIGNS = st.sampled_from([1, -1])


# Business days.


@settings(deadline=None, max_examples=60)
@given(BASES, st.integers(min_value=0, max_value=40), SIGNS)
def test_business_days_skip_weekends_and_the_pack_s_holidays(base: date, n: int, sign: int) -> None:
    # Contract, add_business_days. Fails if the engine counts a Saturday, a Sunday or a day
    # the pack's list holds, counts the base day itself, or counts back wrongly.
    answer = one(req("t", {"date": base.isoformat()}, {"business_days": n}, sign))
    got = on(answer)
    assert got == walk_business_days(base, n, sign)
    if n > 0:
        assert got.weekday() < calendar.SATURDAY
        assert not pack_holiday(got)
    assert HOLIDAYS_LAW in answer.get("rule_ids", [])
    assert "planning" not in answer


@pytest.mark.parametrize(
    ("base", "n", "sign", "expected"),
    [
        # Tue 2026-11-24 plus 3: Wed 25 (1), Thu 26 is Thanksgiving (the fourth Thursday in
        # November, from the pack's quote), Fri 27 (2), Sat 28 and Sun 29, Mon 30 (3).
        (date(2026, 11, 24), 3, 1, date(2026, 11, 30)),
        # Thu 2026-06-18 plus 1: Fri 19 is Juneteenth (June 19, in the quote of the row in
        # force from 2021-06-17), Sat 20, Sun 21, Mon 22 (1).
        (date(2026, 6, 18), 1, 1, date(2026, 6, 22)),
        # Mon 2027-01-04 back 1: Sun 3, Sat 2, Fri 1 is New Year's Day, Thu 2026-12-31 (1).
        (date(2027, 1, 4), 1, -1, date(2026, 12, 31)),
        # Mon 2026-10-12 is Columbus Day (the second Monday in October). Fri 2026-10-09 plus 1:
        # Sat 10, Sun 11, Mon 12 skipped, Tue 13 (1).
        (date(2026, 10, 9), 1, 1, date(2026, 10, 13)),
    ],
)
def test_business_days_by_hand(base: date, n: int, sign: int, expected: date) -> None:
    # The same rule on days worked by hand. Each holiday named is checked against the pack
    # first, so the expectation rests on the pack and not on this file.
    assert walk_business_days(base, n, sign) == expected
    assert on(one(req("t", {"date": base.isoformat()}, {"business_days": n}, sign))) == expected


def test_the_holidays_named_by_hand_are_in_the_pack() -> None:
    for day in (date(2026, 11, 26), date(2026, 6, 19), date(2027, 1, 1), date(2026, 10, 12)):
        assert pack_holiday(day), day


# Months.


@settings(deadline=None, max_examples=60)
@given(BASES, st.integers(min_value=0, max_value=36), SIGNS)
def test_months_clamp_to_the_month_s_last_day(base: date, n: int, sign: int) -> None:
    # Contract, add_months. Fails if a day the month lacks rolls into the next month, or the
    # day of the month changes when the month has it.
    got = on(one(req("t", {"date": base.isoformat()}, {"months": n}, sign)))
    assert got == shift_months(base, sign * n)
    last = calendar.monthrange(got.year, got.month)[1]
    assert got.day == base.day or (got.day == last and base.day > last)


@pytest.mark.parametrize(
    ("base", "n", "sign", "expected"),
    [
        # January 31 plus a month: February 2026 has 28 days, so its last day.
        (date(2026, 1, 31), 1, 1, date(2026, 2, 28)),
        # 2028 is a leap year (divisible by 4, not by 100): February has 29 days.
        (date(2028, 1, 31), 1, 1, date(2028, 2, 29)),
        # March 31 back a month: February 2026, 28 days.
        (date(2026, 3, 31), 1, -1, date(2026, 2, 28)),
        # August 31 plus a month: September has 30 days.
        (date(2026, 8, 31), 1, 1, date(2026, 9, 30)),
        # May 31 back three months: February 2027, 28 days (2027 not divisible by 4).
        (date(2027, 5, 31), 3, -1, date(2027, 2, 28)),
        # A day every month has stays: 2026-11-15 plus 3 months is 2027-02-15.
        (date(2026, 11, 15), 3, 1, date(2027, 2, 15)),
    ],
)
def test_months_by_hand(base: date, n: int, sign: int, expected: date) -> None:
    assert on(one(req("t", {"date": base.isoformat()}, {"months": n}, sign))) == expected


# Calendar days and today.


@settings(deadline=None, max_examples=40)
@given(BASES, st.integers(min_value=0, max_value=400), SIGNS)
def test_calendar_days_count_every_day(base: date, n: int, sign: int) -> None:
    # Contract, add_days: "Whole calendar days." days_away is checked in run() against the
    # response's today. Fails if weekends or holidays are skipped in a calendar-day count.
    answer = one(req("t", {"date": base.isoformat()}, {"days": n}, sign))
    assert on(answer) == base + sign * timedelta(days=n)
    assert "planning" not in answer


@pytest.mark.parametrize(
    ("zone", "expected"),
    [
        # 2026-09-30 02:00 UTC: 19:00 on the 29th in Los Angeles (UTC-7 in September),
        # 02:00 on the 30th in UTC, 11:00 on the 30th in Tokyo (UTC+9).
        ("America/Los_Angeles", date(2026, 9, 29)),
        ("UTC", date(2026, 9, 30)),
        ("Asia/Tokyo", date(2026, 9, 30)),
    ],
)
def test_today_is_the_clock_seen_from_the_case_s_zone(zone: str, expected: date) -> None:
    # Contract, from_today and response.today: "its Clock in the case's time_zone". Fails if
    # the engine reads the system time, or the clock's UTC date. 10 days on from each.
    case = {**CASE, "time_zone": zone}
    out = run(req("t", {"today": True}, {"days": 10}), case=case)
    assert out["today"] == {"date": expected.isoformat(), "time_zone": zone}
    assert out["dates"][0]["date"] == (expected + timedelta(days=10)).isoformat()
    assert out["dates"][0]["days_away"] == 10


def test_a_later_clock_moves_today_and_days_away() -> None:
    # The clock is the only source of today. One week later (2026-10-07 02:00 UTC, the 6th in
    # Los Angeles), the same typed date 2026-10-09 is 3 days away, not 10.
    later = FixedClock(datetime(2026, 10, 7, 2, 0, tzinfo=UTC))
    out = run(req("t", {"date": "2026-10-09"}, {"days": 0}), clock=later)
    assert out["today"]["date"] == "2026-10-06"
    assert out["dates"][0]["days_away"] == 3


# Engine items as the base.


def test_an_item_base_is_the_date_the_engine_computes_for_it() -> None:
    # Contract, from_item: "the date the engine computes for this item on the case sent". Every
    # dated item of the case, plus 0 days, is its own date; its rules are named. Fails if the
    # schedule reads another item, another case, or drops the item's rules.
    dated = dated_items()
    assert dated
    ids = sorted(dated)
    out = run(*(req(f"t{i}", {"item": k}, {"days": 0}) for i, k in enumerate(ids)))
    for k, answer in zip(ids, out["dates"], strict=True):
        assert on(answer) == dated[k], k
        assert set(engine_items()[k]["rule_ids"]) <= set(answer.get("rule_ids", [])), k


# A missing base gives no date and names it.


@pytest.mark.parametrize(
    ("add", "sign"),
    [({"days": 3}, -1), ({"business_days": 5}, 1), ({"months": 1}, 1), ({"days": 0}, 1)],
)
def test_an_item_with_no_date_gives_no_date_and_says_so(add: dict[str, Any], sign: int) -> None:
    # Contract, item_has_no_date: "the item exists but its value is null, so its question
    # stands". Fails if the engine falls back to today, the typed dates or any other item.
    for k in undated_items():
        answer = one(req("t", {"item": k}, add, sign))
        assert (answer["date"], answer.get("missing")) == (None, "item_has_no_date"), k


def test_an_unknown_item_gives_no_date_and_says_so() -> None:
    # Contract, item_not_found. An id the case does not compute, and an id of the right shape
    # whose record the case lacks (a9). Fails on a guess for either.
    for k in ("opt.no_such_window.closes.a1", "opt.file_by.closes.a9"):
        answer = one(req("t", {"item": k}, {"days": 1}))
        assert (answer["date"], answer.get("missing")) == (None, "item_not_found"), k


def test_an_item_that_is_not_a_date_is_not_found_as_a_base() -> None:
    # Contract, item_not_found: "no computed item of unit date has this id". Every item of the
    # case whose unit is not date (a count, a flag) is refused as a base.
    others = sorted(k for k, i in engine_items().items() if i.get("unit") != "date")
    assert others  # the case computes counts too (unemployment days)
    for k in others:
        answer = one(req("t", {"item": k}, {"days": 1}))
        assert (answer["date"], answer.get("missing")) == (None, "item_not_found"), k


# A cap never moves a date past its obligation.


@settings(deadline=None, max_examples=60)
@given(
    st.dates(min_value=date(2026, 1, 1), max_value=date(2026, 8, 31)),
    st.one_of(
        st.builds(lambda n: {"days": n}, st.integers(0, 120)),
        st.builds(lambda n: {"business_days": n}, st.integers(0, 60)),
        st.builds(lambda n: {"months": n}, st.integers(0, 4)),
    ),
    SIGNS,
)
def test_a_cap_never_moves_a_date_past_its_obligation(
    base: date, add: dict[str, int], sign: int
) -> None:
    # Contract, cap. Bases from 2026-01-01 to 2026-08-31 put the result on both sides of the
    # cap's 2026-05-01. Fails if a result after the cap is kept, if one on or before it is
    # moved, if capped is said wrongly, or if the cap item's rules are not named.
    uncapped = worked(base, add, sign)
    answer = one(req("t", {"date": base.isoformat()}, add, sign, cap=CAP_ITEM))
    got = on(answer)
    assert got <= CAP_DATE
    if uncapped > CAP_DATE:
        assert (got, answer.get("capped")) == (CAP_DATE, True)
    else:
        assert got == uncapped
        assert answer.get("capped") is not True
    assert set(engine_items()[CAP_ITEM]["rule_ids"]) <= set(answer.get("rule_ids", []))


def test_a_reminder_before_an_obligation_is_capped_by_hand() -> None:
    # A follow-up 10 days after 2026-04-25 would be 2026-05-05, after the 2026-05-01 deadline:
    # the answer is 2026-05-01, capped. Three days before it is 2026-04-28, not capped.
    late = one(req("late", {"date": "2026-04-25"}, {"days": 10}, 1, cap=CAP_ITEM))
    assert (late["date"], late.get("capped")) == ("2026-05-01", True)
    lead = one(req("lead", {"item": CAP_ITEM}, {"days": 3}, -1, cap=CAP_ITEM))
    assert lead["date"] == "2026-04-28"
    assert lead.get("capped") is not True


def test_a_cap_with_no_date_gives_no_date_never_an_uncapped_one() -> None:
    # Contract, cap_has_no_date: "A cap item with no date gives no date, never an uncapped
    # one." The base is a typed date with a known result; only the cap is unknown.
    for k in undated_items():
        answer = one(req("t", {"date": "2026-10-01"}, {"days": 1}, cap=k))
        assert (answer["date"], answer.get("missing")) == (None, "cap_has_no_date"), k


def test_an_unknown_cap_gives_no_date() -> None:
    answer = one(req("t", {"date": "2026-10-01"}, {"days": 1}, cap="opt.no_such.closes.a1"))
    assert (answer["date"], answer.get("missing")) == (None, "cap_not_found")


# A setting amount marks the answer planning.

_UNITS = {"days": "days", "business days": "business_days", "business_days": "business_days"}
_UNITS["months"] = "months"
DATING = [s for s in SETTINGS if s.get("unit") in _UNITS]
NOT_DATING = [s for s in SETTINGS if s.get("unit") not in _UNITS]


def test_the_settings_hold_both_kinds() -> None:
    # Guards the parametrized tests below from running on nothing: loop.deadline_lead_days
    # (days) and loop.dso_reply_business_days (business days) date; loop.weekly_budget (check-
    # ins per week) and product.opt_start_earliest_years_before_program_end (years) do not.
    ids = {s["id"] for s in DATING}
    assert {"loop.deadline_lead_days", "loop.dso_reply_business_days"} <= ids
    assert {"loop.weekly_budget", "product.opt_start_earliest_years_before_program_end"} <= {
        s["id"] for s in NOT_DATING
    }


@pytest.mark.parametrize("setting", DATING, ids=[s["id"] for s in DATING])
@pytest.mark.parametrize("sign", [1, -1])
def test_a_setting_amount_is_its_value_in_its_unit_and_planning(
    setting: dict[str, Any], sign: int
) -> None:
    # Contract, add_setting: "Its value is the amount and its unit ... is the kind of offset",
    # "a date from it is a planning date". The value is read from product_settings.yaml, never
    # written here. Base Wed 2026-10-14. Fails if the value or unit is misread, if planning is
    # left off, or if the setting is listed as a rule (engine/settings.py: never under
    # rule_ids).
    base = date(2026, 10, 14)
    answer = one(req("t", {"date": base.isoformat()}, {"setting": setting["id"]}, sign))
    assert on(answer) == worked(base, {_UNITS[setting["unit"]]: setting["value"]}, sign)
    assert answer.get("planning") is True
    assert setting["id"] not in answer.get("rule_ids", [])


def test_the_lead_days_reminder_by_hand() -> None:
    # loop.deadline_lead_days holds 3 days (product_settings.yaml). Three days before the
    # 2026-05-01 deadline is 2026-04-28: Apr 30 (1), 29 (2), 28 (3). A planning date.
    lead = next(s for s in SETTINGS if s["id"] == "loop.deadline_lead_days")
    assert (lead["value"], lead["unit"]) == (3, "days")
    answer = one(req("t", {"item": CAP_ITEM}, {"setting": "loop.deadline_lead_days"}, -1))
    assert (answer["date"], answer.get("planning")) == ("2026-04-28", True)


@pytest.mark.parametrize("setting", NOT_DATING, ids=[s["id"] for s in NOT_DATING])
def test_a_setting_whose_unit_is_no_date_offset_gives_no_date(setting: dict[str, Any]) -> None:
    # Contract, setting_unit_not_a_date_offset: "the setting's unit is not days, business_days
    # or months". Years are not among them. Fails if a count per week or a number of years is
    # used as days.
    answer = one(req("t", {"date": "2026-10-14"}, {"setting": setting["id"]}))
    assert (answer["date"], answer.get("missing")) == (None, "setting_unit_not_a_date_offset")


def test_an_unknown_setting_gives_no_date() -> None:
    answer = one(req("t", {"date": "2026-10-14"}, {"setting": "loop.no_such_setting"}))
    assert (answer["date"], answer.get("missing")) == (None, "setting_not_found")


# Many requests at once.


def test_answers_come_in_the_order_sent_each_on_its_own() -> None:
    # Contract, response.dates: "in the same order and with the same ids". A request with no
    # date between two that have one does not move or empty its neighbours. run() checks the
    # ids and the order. Hand working: 2026-10-14 plus 1 day is 2026-10-15; 2026-10-14 back
    # 1 month is 2026-09-14.
    out = run(
        req("c.after", {"date": "2026-10-14"}, {"days": 1}),
        req("b.none", {"item": UNDATED_ITEM}, {"days": 1}),
        req("a.before", {"date": "2026-10-14"}, {"months": 1}, -1),
    )
    assert [a["date"] for a in out["dates"]] == ["2026-10-15", None, "2026-09-14"]


def test_no_requests_give_no_answers() -> None:
    # Contract, request.requests: "An empty list gives an empty answer."
    out = run()
    assert out == {"today": {"date": TODAY.isoformat(), "time_zone": ZONE}, "dates": []}


def test_the_same_request_gives_the_same_answer() -> None:
    # N5, "a pure function": the same body and clock give equal answers. Fails if the answer
    # depends on state kept between calls.
    request = req("t", {"date": "2026-11-24"}, {"business_days": 3})
    assert run(request) == run(request)


# The W2-P3 review (reviews/w2-p3.md) and DECISIONS.md D95. Each test names its finding. Written
# before the fixes: the ones on findings 5 (M7), 6 and 8 cannot pass yet.

PLANNING_ITEM = "opt.prepare.opens.a1"  # 2026-01-14, set by plan.prepare_months: planning


def test_review_w2p3_4_a_result_one_day_past_the_cap_is_moved_back_to_it() -> None:
    # Finding 4, mutant M2 (the cap compared against the cap plus one day). Contract, cap: "a
    # later result is moved back to it, and the answer says capped". Hand working: Thu
    # 2026-04-30 plus 2 days is May 1 (1), May 2 (2): 2026-05-02, exactly the cap 2026-05-01
    # plus one day, so the answer is 2026-05-01, capped. Fails on M2, which keeps 2026-05-02.
    answer = one(req("t", {"date": "2026-04-30"}, {"days": 2}, 1, cap=CAP_ITEM))
    assert (answer["date"], answer.get("capped")) == ("2026-05-01", True)
    # And on the cap day itself, 2026-04-30 plus 1 day is 2026-05-01: kept, not capped.
    same = one(req("t", {"date": "2026-04-30"}, {"days": 1}, 1, cap=CAP_ITEM))
    assert same["date"] == "2026-05-01"
    assert same.get("capped") is not True


def test_review_w2p3_5_juneteenth_is_counted_out_only_from_2021_06_17() -> None:
    # Finding 5, mutant M1. The pack's calendar.federal_holidays_law row in force from
    # 1986-01-01 to 2021-06-16 has no Juneteenth; Pub. L. 117-17 added it from 2021-06-17.
    # Hand working: Thu 2020-06-18 plus 1 business day is Fri 2020-06-19, a working day then.
    # Fails on M1, which skips it and gives Mon 2020-06-22.
    before, after = (F1.value(HOLIDAYS_LAW, day) for day in (date(2020, 6, 19), date(2021, 6, 18)))
    assert before is not None
    assert after is not None
    assert "June 19" not in before["source"]["quote"]
    assert "June 19" in after["source"]["quote"]
    answer = one(req("t", {"date": "2020-06-18"}, {"business_days": 1}))
    assert answer["date"] == "2020-06-19"
    assert HOLIDAYS_LAW in answer.get("rule_ids", [])


def test_review_w2p3_5_a_day_with_no_holiday_row_gives_no_date_and_the_rest_are_answered() -> None:
    # Finding 5, mutant M7, and D95 (3): "a request the engine cannot date (a day with no
    # holiday row ...) is answered with its reason, never a failed body"; contract, missing
    # holidays_not_known. Hand working: Mon 1985-12-30 plus 3 business days first crosses Tue
    # 1985-12-31, before the first row's 1986-01-01, so whether it is a holiday is not known:
    # no date. The second request, 2026-10-14 plus 1 day, is 2026-10-15. Fails on M7 (a date
    # is guessed) and on the body failing as a whole (CalendarNotInForceError today).
    assert F1.value(HOLIDAYS_LAW, date(1985, 12, 31)) is None
    out = run(
        req("old", {"date": "1985-12-30"}, {"business_days": 3}),
        req("new", {"date": "2026-10-14"}, {"days": 1}),
    )
    old, new = out["dates"]
    assert (old["date"], old["days_away"], old.get("missing")) == (None, None, "holidays_not_known")
    assert new["date"] == "2026-10-15"


@pytest.mark.parametrize(
    ("base", "add", "sign"),
    [
        # 2099-12-30 plus 5 days: Dec 31 (1), then 2100-01-01 to 01-04 (2 to 5): 2100-01-04,
        # after dates.latest_readable 2099-12-31.
        ("2099-12-30", {"days": 5}, 1),
        # 0001-01-01 back 1 day is before date.min; the base is already before
        # dates.earliest_readable 1950-01-01.
        ("0001-01-01", {"days": 1}, -1),
    ],
    ids=["past_2099", "before_year_1"],
)
def test_review_w2p3_6_a_date_outside_the_readable_dates_gives_no_date(
    base: str, add: dict[str, int], sign: int
) -> None:
    # Finding 6 and D95 (3); contract, missing outside_readable_dates: "the base date or the
    # result falls before dates.earliest_readable or after dates.latest_readable". Fails if
    # the engine dates past 2099-12-31 or raises OverflowError (today: 500 at the route).
    answer = one(req("t", {"date": base}, add, sign))
    assert (answer["date"], answer.get("missing")) == (None, "outside_readable_dates")


def test_review_w2p3_6_the_last_readable_day_is_still_dated() -> None:
    # Guards the boundary above: 2099-12-30 plus 1 day is 2099-12-31, dates.latest_readable
    # itself, so it is dated. Fails if the limit is read as before the last day.
    latest = next(s for s in SETTINGS if s["id"] == "dates.latest_readable")
    assert latest["value"] == "2099-12-31"
    assert one(req("t", {"date": "2099-12-30"}, {"days": 1}))["date"] == "2099-12-31"


def test_review_w2p3_8_a_date_counted_from_a_planning_item_is_planning() -> None:
    # Finding 8, D95 (4); contract, planning: "the base item ... is itself marked planning in
    # the engine output". opt.prepare.opens.a1 is 2026-01-14 and planning in the engine
    # output; plus 0 days is 2026-01-14. Fails if planning is left off (the answer today).
    item = engine_items()[PLANNING_ITEM]
    assert (item["value"], item.get("planning")) == ("2026-01-14", True)
    answer = one(req("t", {"item": PLANNING_ITEM}, {"days": 0}))
    assert (answer["date"], answer.get("planning")) == ("2026-01-14", True)


def test_review_w2p3_8_a_date_moved_to_a_planning_cap_is_planning() -> None:
    # Finding 8, D95 (4); contract, planning: "or the cap item when the answer is capped".
    # 2026-01-10 plus 10 days is 2026-01-20, after the cap 2026-01-14: moved to 2026-01-14,
    # capped and planning. 2026-01-10 plus 1 day is 2026-01-11, before the cap: not capped,
    # and its amount is no setting, so not planning. Fails if a capped answer drops planning,
    # or an uncapped one takes it from the cap.
    late = one(req("late", {"date": "2026-01-10"}, {"days": 10}, 1, cap=PLANNING_ITEM))
    assert (late["date"], late.get("capped"), late.get("planning")) == ("2026-01-14", True, True)
    early = one(req("early", {"date": "2026-01-10"}, {"days": 1}, 1, cap=PLANNING_ITEM))
    assert (early["date"], early.get("capped"), early.get("planning")) == ("2026-01-11", None, None)
