"""Calendar arithmetic: months, business days, and federal holidays.

Nothing here reads the time. Every function works on the dates it is given.
"""

import calendar
from collections.abc import Callable
from datetime import date, timedelta

MONDAY = 0
THURSDAY = 3
SATURDAY = 5
MONTHS_IN_YEAR = 12


def add_months(d: date, n: int) -> date:
    """The same day n months on, clamped to the last day of that month."""
    year, month_index = divmod(d.year * 12 + (d.month - 1) + n, 12)
    month = month_index + 1
    return date(year, month, min(d.day, calendar.monthrange(year, month)[1]))


def add_years(d: date, n: int) -> date:
    """The same day n years on. February 29 is clamped to February 28."""
    return add_months(d, n * MONTHS_IN_YEAR)


def _nth_weekday(year: int, month: int, weekday: int, n: int) -> date:
    first = date(year, month, 1)
    return first + timedelta(days=(weekday - first.weekday()) % 7 + 7 * (n - 1))


def _last_weekday(year: int, month: int, weekday: int) -> date:
    last = date(year, month, calendar.monthrange(year, month)[1])
    return last - timedelta(days=(last.weekday() - weekday) % 7)


def _holidays_of(year: int, juneteenth_listed: bool) -> list[date]:
    """The eleven holidays of 5 U.S.C. 6103(a) for one year, on the days the law lists.

    Rule calendar.federal_holidays_law in the rule pack holds the source and the quote
    for this list. Every item counted in business days names that rule.

    A holiday's observed day is not listed (SPEC-resolutions point 24): 6103(b) moves
    it "For the purpose of statutes relating to pay and leave of employees", and
    skipping it would put a report date one business day later than the cited words.

    Juneteenth is listed only when the caller says the list in force holds it. The day
    it joins comes from the rule pack's rows, never from a date written here
    (SPEC-resolutions points 40 and 53).

    Inauguration Day, 6103(c), is left out: it applies only to employees in the
    Washington, DC area.
    """
    # calendar.federal_holidays_law: 5 U.S.C. 6103(a).
    juneteenth = date(year, 6, 19)
    listed = [
        date(year, 1, 1),
        _nth_weekday(year, 1, MONDAY, 3),
        _nth_weekday(year, 2, MONDAY, 3),
        _last_weekday(year, 5, MONDAY),
        juneteenth,
        date(year, 7, 4),
        _nth_weekday(year, 9, MONDAY, 1),
        _nth_weekday(year, 10, MONDAY, 2),
        date(year, 11, 11),
        _nth_weekday(year, 11, THURSDAY, 4),
        date(year, 12, 25),
    ]
    return [day for day in listed if day != juneteenth or juneteenth_listed]


def federal_holidays(year: int, juneteenth_listed: bool = True) -> list[date]:
    """The holiday dates of the calendar year, in order, on the days the law lists.

    With juneteenth_listed False, the list without Juneteenth National Independence Day.
    """
    return sorted(_holidays_of(year, juneteenth_listed))


def is_weekend(d: date) -> bool:
    """True on a Saturday or a Sunday."""
    return d.weekday() >= SATURDAY


def is_business_day(d: date, is_holiday: Callable[[date], bool] | None = None) -> bool:
    """A weekday that is not a holiday. is_holiday decides the holidays; without it, the
    list of federal_holidays with every item."""
    if d.weekday() >= SATURDAY:
        return False
    if is_holiday is None:
        return d not in federal_holidays(d.year)
    return not is_holiday(d)


def add_business_days(d: date, n: int, is_holiday: Callable[[date], bool] | None = None) -> date:
    """The n-th business day after d. Counting starts on the day after d. is_holiday
    decides the holidays, as in is_business_day."""
    if n < 0:
        raise ValueError("add_business_days needs a count of zero or more")
    day = d
    left = n
    while left > 0:
        day += timedelta(days=1)
        if is_business_day(day, is_holiday):
            left -= 1
    return day
