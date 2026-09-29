"""Calendar arithmetic: months, business days, and federal holidays.

Nothing here reads the time. Every function works on the dates it is given.
"""

import calendar
from datetime import date, timedelta

MONDAY = 0
THURSDAY = 3
SATURDAY = 5
SUNDAY = 6
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


def _observed(day: date) -> date:
    """5 U.S.C. 6103(b): a Saturday holiday is observed the Friday before. A Sunday
    holiday is observed the Monday after (Executive Order 11582)."""
    if day.weekday() == SATURDAY:
        return day - timedelta(days=1)
    if day.weekday() == SUNDAY:
        return day + timedelta(days=1)
    return day


def _observed_holidays_of(year: int) -> list[date]:
    """The eleven holidays of 5 U.S.C. 6103(a) for one year, on their observed dates.

    Rule calendar.federal_holidays_law in the rule pack holds the source and the quote
    for this list. Every item counted in business days names that rule.

    Inauguration Day, 6103(c), is left out: it applies only to employees in the
    Washington, DC area.
    """
    # calendar.federal_holidays_law: 5 U.S.C. 6103(a).
    return [
        _observed(date(year, 1, 1)),
        _nth_weekday(year, 1, MONDAY, 3),
        _nth_weekday(year, 2, MONDAY, 3),
        _last_weekday(year, 5, MONDAY),
        _observed(date(year, 6, 19)),
        _observed(date(year, 7, 4)),
        _nth_weekday(year, 9, MONDAY, 1),
        _nth_weekday(year, 10, MONDAY, 2),
        _observed(date(year, 11, 11)),
        _nth_weekday(year, 11, THURSDAY, 4),
        _observed(date(year, 12, 25)),
    ]


def federal_holidays(year: int) -> list[date]:
    """The observed holiday dates that fall in the calendar year, in order.

    When January 1 of the next year is a Saturday, it is observed on December 31 of this
    year, and that date is in this year's list.
    """
    found = _observed_holidays_of(year) + _observed_holidays_of(year + 1)
    return sorted(day for day in found if day.year == year)


def is_weekend(d: date) -> bool:
    """True on a Saturday or a Sunday."""
    return d.weekday() >= SATURDAY


def is_business_day(d: date) -> bool:
    return d.weekday() < SATURDAY and d not in federal_holidays(d.year)


def add_business_days(d: date, n: int) -> date:
    """The n-th business day after d. Counting starts on the day after d."""
    if n < 0:
        raise ValueError("add_business_days needs a count of zero or more")
    day = d
    left = n
    while left > 0:
        day += timedelta(days=1)
        if is_business_day(day):
            left -= 1
    return day
