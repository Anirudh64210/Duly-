"""Hidden tests for engine/dates.py. A second set of dates, never shown to the engine lane.

Specified in specs/phase-2/SPEC.md, "The engine", "Files". Every expected date was worked
out by hand. The working is beside it.
"""

from datetime import date, timedelta

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from engine import dates

days = st.dates(min_value=date(2021, 1, 1), max_value=date(2060, 12, 31))


def holidays_near(day: date) -> set[date]:
    found: set[date] = set()
    for year in (day.year - 1, day.year, day.year + 1):
        found |= set(dates.federal_holidays(year))
    return found


@pytest.mark.parametrize(
    ("start", "months", "expected"),
    [
        # January 2027 plus 13 months is February 2028, a leap year: the 31st clamps to 29.
        (date(2027, 1, 31), 13, date(2028, 2, 29)),
        # February 29 plus 1 month: March has a 29th. No move to the month's end.
        (date(2028, 2, 29), 1, date(2028, 3, 29)),
        # October 31, 2025 plus 4 months is February 2026, 28 days.
        (date(2025, 10, 31), 4, date(2026, 2, 28)),
        # May 31 plus 1 month: June has 30 days.
        (date(2026, 5, 31), 1, date(2026, 6, 30)),
        # August 30, 2025 plus 6 months is February 2026: the 30th clamps to the 28th.
        (date(2025, 8, 30), 6, date(2026, 2, 28)),
        # Plus 12 and 24 months the 30th exists in August.
        (date(2025, 8, 30), 12, date(2026, 8, 30)),
        (date(2025, 8, 30), 24, date(2027, 8, 30)),
        # December 2023 plus 14 months: 12 to December 2024, 2 to February 2025.
        (date(2023, 12, 15), 14, date(2025, 2, 15)),
        # December 31, 2023 plus 14 months: February 2025 has 28 days.
        (date(2023, 12, 31), 14, date(2025, 2, 28)),
        # 2100 is divisible by 100 and not by 400: not a leap year.
        (date(2099, 12, 31), 2, date(2100, 2, 28)),
        # 2400 would be; 2000 was. February 2000 had 29 days.
        (date(1999, 12, 31), 2, date(2000, 2, 29)),
    ],
)
def test_add_months(start, months, expected):
    assert dates.add_months(start, months) == expected


@given(days, st.integers(min_value=0, max_value=240))
def test_add_months_never_lands_in_the_wrong_month(start, months):
    result = dates.add_months(start, months)
    assert (result.year * 12 + result.month) == (start.year * 12 + start.month) + months
    assert result.day <= start.day


@given(days, st.integers(min_value=0, max_value=240))
def test_add_months_moves_at_least_28_and_at_most_31_days_a_month(start, months):
    moved = (dates.add_months(start, months) - start).days
    assert 28 * months <= moved <= 31 * months


def test_federal_holidays_2028_on_the_days_the_law_lists():
    # 2028-01-01 is a Saturday, and 2028 is a leap year.
    expected = {
        date(2028, 1, 1),  # a Saturday; SPEC-resolutions.md, point 24: the day itself
        date(2028, 1, 17),  # third Monday of January: Mondays fall on 3, 10, 17
        date(2028, 2, 21),  # third Monday of February: Mondays fall on 7, 14, 21
        date(2028, 5, 29),  # last Monday of May: Mondays fall on 1, 8, 15, 22, 29
        date(2028, 6, 19),  # Juneteenth, a Monday
        date(2028, 7, 4),  # Independence Day, a Tuesday
        date(2028, 9, 4),  # first Monday of September
        date(2028, 10, 9),  # second Monday of October: Mondays fall on 2, 9
        date(2028, 11, 11),  # a Saturday; point 24: not Friday Nov 10
        date(2028, 11, 23),  # fourth Thursday of November: Thursdays fall on 2, 9, 16, 23
        date(2028, 12, 25),  # Christmas Day, a Monday
    }
    found = set(dates.federal_holidays(2028))
    assert expected <= found
    # Point 24: the observed days are not holidays.
    assert date(2028, 11, 10) not in found
    assert date(2027, 12, 31) not in found


def test_federal_holidays_2024_on_the_days_the_law_lists():
    # 2024-01-01 is a Monday. No holiday of 2024 falls on a weekend, and 2025-01-01 is a
    # Wednesday, so the list is exact.
    expected = {
        date(2024, 1, 1),
        date(2024, 1, 15),  # third Monday of January: Mondays fall on 1, 8, 15
        date(2024, 2, 19),  # third Monday of February: Mondays fall on 5, 12, 19
        date(2024, 5, 27),  # last Monday of May: Mondays fall on 6, 13, 20, 27
        date(2024, 6, 19),  # a Wednesday
        date(2024, 7, 4),  # a Thursday
        date(2024, 9, 2),  # first Monday of September
        date(2024, 10, 14),  # second Monday of October: Mondays fall on 7, 14
        date(2024, 11, 11),  # a Monday
        date(2024, 11, 28),  # fourth Thursday of November: Thursdays fall on 7, 14, 21, 28
        date(2024, 12, 25),  # a Wednesday
    }
    assert set(dates.federal_holidays(2024)) == expected


@pytest.mark.parametrize(
    ("start", "count", "expected"),
    [
        # Point 24: an observed day is a business day. Thursday 2027-12-23: Friday 24 is
        # day 1 (December 25 is the Saturday).
        (date(2027, 12, 23), 1, date(2027, 12, 24)),
        # The same start, five days: Dec 24 (1), weekend, 27 (2), 28 (3), 29 (4), 30 (5).
        (date(2027, 12, 23), 5, date(2027, 12, 30)),
        # Thursday 2028-11-09: Friday 10 is day 1 (November 11 is the Saturday).
        (date(2028, 11, 9), 1, date(2028, 11, 10)),
        # Wednesday 2024-11-27: Thursday 28 is Thanksgiving. Friday 29 is day 1.
        (date(2024, 11, 27), 1, date(2024, 11, 29)),
        # Friday 2026-10-09: weekend, Monday 12 is Columbus Day. Tuesday 13 is day 1.
        (date(2026, 10, 9), 1, date(2026, 10, 13)),
        # Friday 2026-02-13: weekend, Monday 16 is Washington's Birthday. Tuesday 17.
        (date(2026, 2, 13), 1, date(2026, 2, 17)),
        # Friday 2026-05-22: weekend, Monday 25 is Memorial Day. Tuesday 26.
        (date(2026, 5, 22), 1, date(2026, 5, 26)),
        # Thursday 2026-06-18: Friday 19 is Juneteenth, weekend. Monday 22.
        (date(2026, 6, 18), 1, date(2026, 6, 22)),
        # Friday 2026-01-16: weekend, Monday 19 is the King holiday. Tuesday 20.
        (date(2026, 1, 16), 1, date(2026, 1, 20)),
        # Saturday 2026-02-28, ten days: Mar 2 (1), 3 (2), 4 (3), 5 (4), 6 (5), 9 (6),
        # 10 (7), 11 (8), 12 (9), 13 (10).
        (date(2026, 2, 28), 10, date(2026, 3, 13)),
        # Sunday 2026-08-30, ten days: Aug 31 (1), Sep 1 (2), 2 (3), 3 (4), 4 (5),
        # Monday Sep 7 is Labor Day, 8 (6), 9 (7), 10 (8), 11 (9), 14 (10).
        (date(2026, 8, 30), 10, date(2026, 9, 14)),
        # Monday 2027-08-30, ten days: Aug 31 (1), Sep 1 (2), 2 (3), 3 (4), Monday Sep 6
        # is Labor Day, 7 (5), 8 (6), 9 (7), 10 (8), 13 (9), 14 (10).
        (date(2027, 8, 30), 10, date(2027, 9, 14)),
        # A holiday that falls on a Saturday is not also skipped on the Monday after.
        # From Saturday Jul 4, the holiday itself: Monday Jul 6 is day 1.
        (date(2026, 7, 4), 1, date(2026, 7, 6)),
    ],
)
def test_add_business_days(start, count, expected):
    assert dates.add_business_days(start, count) == expected


@settings(deadline=None)
@given(days, st.integers(min_value=1, max_value=40), st.integers(min_value=1, max_value=40))
def test_add_business_days_in_two_steps_is_one_step(start, first, second):
    assert dates.add_business_days(
        dates.add_business_days(start, first), second
    ) == dates.add_business_days(start, first + second)


@settings(deadline=None)
@given(days, days, st.integers(min_value=1, max_value=40))
def test_add_business_days_keeps_the_order_of_two_dates(first, second, count):
    earlier, later = sorted((first, second))
    assert dates.add_business_days(earlier, count) <= dates.add_business_days(later, count)


@settings(deadline=None)
@given(days, st.integers(min_value=1, max_value=40))
def test_add_business_days_never_lands_on_a_day_it_skips(start, count):
    result = dates.add_business_days(start, count)
    assert result.weekday() < 5
    assert result not in holidays_near(result)


@settings(deadline=None)
@given(days, st.integers(min_value=1, max_value=40))
def test_add_business_days_moves_no_further_than_weekends_and_holidays_allow(start, count):
    # In any run of days, at most 2 in 7 are weekend days, and no two federal holidays
    # are observed within 4 days of each other, so each business day costs at most 5
    # calendar days, with 5 to spare at the start.
    moved = dates.add_business_days(start, count) - start
    assert timedelta(days=count) <= moved <= timedelta(days=5 * count + 5)
