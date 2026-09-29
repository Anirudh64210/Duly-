"""engine/dates.py: add_months, add_business_days, federal_holidays.

Specified in specs/phase-2/SPEC.md, "The engine", "Files":
  add_months(d, n) clamps to the last day of the month.
  add_business_days(d, n) skips Saturdays, Sundays, and the federal holidays of
  5 U.S.C. 6103 on their observed dates.
  federal_holidays(year).

Every expected date below was worked out by hand. The working is beside it.
Counting for add_business_days starts on the day after d: the result is the n-th business
day after d. The SPEC does not say what n = 0 gives, so no test here uses it.
"""

import calendar
from datetime import date, timedelta

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from engine import dates

days = st.dates(min_value=date(2021, 1, 1), max_value=date(2060, 12, 31))


def holidays_near(day: date) -> set[date]:
    """Holidays of the year and its neighbours, because New Year's Day on a Saturday is
    observed on December 31 of the year before."""
    found: set[date] = set()
    for year in (day.year - 1, day.year, day.year + 1):
        found |= set(dates.federal_holidays(year))
    return found


def is_business_day(day: date) -> bool:
    return day.weekday() < 5 and day not in holidays_near(day)


# add_months


@pytest.mark.parametrize(
    ("start", "months", "expected"),
    [
        # January 31 plus 1 month: February 2026 has 28 days, so the 31st clamps to the 28th.
        (date(2026, 1, 31), 1, date(2026, 2, 28)),
        # The day before the clamp starts to matter: the 28th exists in February.
        (date(2026, 1, 28), 1, date(2026, 2, 28)),
        # The 29th and 30th do not exist in February 2026. Both clamp to the 28th.
        (date(2026, 1, 29), 1, date(2026, 2, 28)),
        (date(2026, 1, 30), 1, date(2026, 2, 28)),
        # 2024 is a leap year (divisible by 4, not by 100): February has 29 days.
        (date(2024, 1, 31), 1, date(2024, 2, 29)),
        (date(2024, 1, 29), 1, date(2024, 2, 29)),
        # March 31 plus 1 month: April has 30 days.
        (date(2026, 3, 31), 1, date(2026, 4, 30)),
        # February 29, 2024 plus 12 months: February 2025 has 28 days.
        (date(2024, 2, 29), 12, date(2025, 2, 28)),
        # February 29, 2024 plus 48 months: 2028 is a leap year, the 29th exists.
        (date(2024, 2, 29), 48, date(2028, 2, 29)),
        # May plus 14 months: May 2026 plus 12 is May 2027, plus 2 is July 2027. No clamp.
        (date(2026, 5, 15), 14, date(2027, 7, 15)),
        # November plus 3 months crosses the year: December, January, February 2027 (28 days).
        (date(2026, 11, 30), 3, date(2027, 2, 28)),
        # December 31 plus 2 months: January, February 2027 (28 days).
        (date(2026, 12, 31), 2, date(2027, 2, 28)),
        # August 31, 2025 plus 6 months: February 2026 (28 days).
        (date(2025, 8, 31), 6, date(2026, 2, 28)),
        # December plus 1 month rolls the year. No clamp.
        (date(2026, 12, 15), 1, date(2027, 1, 15)),
        # The clamp only shortens. February 28 plus 1 month is March 28, not March 31.
        (date(2026, 2, 28), 1, date(2026, 3, 28)),
        # April 30 plus 1 month is May 30, not May 31.
        (date(2026, 4, 30), 1, date(2026, 5, 30)),
        # Zero months is the same day.
        (date(2026, 1, 31), 0, date(2026, 1, 31)),
    ],
)
def test_add_months_clamps_to_the_last_day_of_the_month(start, months, expected):
    assert dates.add_months(start, months) == expected


@given(days, st.integers(min_value=0, max_value=120))
def test_add_months_lands_exactly_n_months_on(start, months):
    result = dates.add_months(start, months)
    assert (result.year * 12 + result.month) - (start.year * 12 + start.month) == months


@given(days, st.integers(min_value=0, max_value=120))
def test_add_months_keeps_the_day_or_clamps_to_the_month_end(start, months):
    result = dates.add_months(start, months)
    last_day = calendar.monthrange(result.year, result.month)[1]
    assert result.day == min(start.day, last_day)


@given(days, days, st.integers(min_value=0, max_value=120))
def test_add_months_keeps_the_order_of_two_dates(first, second, months):
    earlier, later = sorted((first, second))
    assert dates.add_months(earlier, months) <= dates.add_months(later, months)


@given(
    days.filter(lambda d: d.day <= 28),
    st.integers(min_value=0, max_value=60),
    st.integers(min_value=0, max_value=60),
)
def test_add_months_in_two_steps_is_one_step_when_no_clamp_applies(start, first, second):
    assert dates.add_months(dates.add_months(start, first), second) == dates.add_months(
        start, first + second
    )


# federal_holidays


def test_federal_holidays_2026_on_observed_dates():
    # 5 U.S.C. 6103(a) names eleven holidays. 2026-01-01 is a Thursday.
    expected = {
        date(2026, 1, 1),  # New Year's Day, a Thursday
        date(2026, 1, 19),  # third Monday of January: Mondays fall on 5, 12, 19
        date(2026, 2, 16),  # third Monday of February: Mondays fall on 2, 9, 16
        date(2026, 5, 25),  # last Monday of May: Mondays fall on 4, 11, 18, 25
        date(2026, 6, 19),  # Juneteenth, a Friday
        date(2026, 7, 3),  # July 4 is a Saturday, observed the Friday before
        date(2026, 9, 7),  # first Monday of September
        date(2026, 10, 12),  # second Monday of October: Mondays fall on 5, 12
        date(2026, 11, 11),  # Veterans Day, a Wednesday
        date(2026, 11, 26),  # fourth Thursday of November: Thursdays fall on 5, 12, 19, 26
        date(2026, 12, 25),  # Christmas Day, a Friday
    }
    # 2027-01-01 is a Friday, so nothing from 2027 is observed in 2026.
    assert set(dates.federal_holidays(2026)) == expected


def test_federal_holidays_2023_on_observed_dates():
    expected = {
        date(2023, 1, 2),  # January 1 is a Sunday, observed the Monday after
        date(2023, 1, 16),  # third Monday of January: Mondays fall on 2, 9, 16
        date(2023, 2, 20),  # third Monday of February: Mondays fall on 6, 13, 20
        date(2023, 5, 29),  # last Monday of May: Mondays fall on 1, 8, 15, 22, 29
        date(2023, 6, 19),  # Juneteenth, a Monday
        date(2023, 7, 4),  # Independence Day, a Tuesday
        date(2023, 9, 4),  # first Monday of September
        date(2023, 10, 9),  # second Monday of October: Mondays fall on 2, 9
        date(2023, 11, 10),  # November 11 is a Saturday, observed the Friday before
        date(2023, 11, 23),  # fourth Thursday of November: Thursdays fall on 2, 9, 16, 23
        date(2023, 12, 25),  # Christmas Day, a Monday
    }
    # 2024-01-01 is a Monday, so nothing from 2024 is observed in 2023.
    assert set(dates.federal_holidays(2023)) == expected


def test_federal_holidays_2027_holds_the_observed_dates_of_its_own_year():
    # 2027-01-01 is a Friday. June 19 is a Saturday, July 4 a Sunday, December 25 a Saturday.
    expected = {
        date(2027, 1, 1),  # New Year's Day, a Friday
        date(2027, 1, 18),  # third Monday of January: Mondays fall on 4, 11, 18
        date(2027, 2, 15),  # third Monday of February: Mondays fall on 1, 8, 15
        date(2027, 5, 31),  # last Monday of May: Mondays fall on 3, 10, 17, 24, 31
        date(2027, 6, 18),  # June 19 is a Saturday, observed the Friday before
        date(2027, 7, 5),  # July 4 is a Sunday, observed the Monday after
        date(2027, 9, 6),  # first Monday of September
        date(2027, 10, 11),  # second Monday of October: Mondays fall on 4, 11
        date(2027, 11, 11),  # Veterans Day, a Thursday
        date(2027, 11, 25),  # fourth Thursday of November: Thursdays fall on 4, 11, 18, 25
        date(2027, 12, 24),  # December 25 is a Saturday, observed the Friday before
    }
    # Subset, not equality: 2028-01-01 is a Saturday, observed on 2027-12-31. The SPEC does
    # not say whether that date belongs to the 2027 list or the 2028 list.
    assert expected <= set(dates.federal_holidays(2027))


def test_new_years_day_on_a_saturday_is_observed_in_one_of_the_two_years():
    assert date(2027, 12, 31) in set(dates.federal_holidays(2027)) | set(
        dates.federal_holidays(2028)
    )


@given(st.integers(min_value=2021, max_value=2100))
def test_every_observed_holiday_is_a_weekday(year):
    assert all(day.weekday() < 5 for day in dates.federal_holidays(year))


@given(st.integers(min_value=2021, max_value=2100))
def test_every_year_observes_the_four_monday_and_one_thursday_holidays(year):
    found = set(dates.federal_holidays(year))
    mondays = [d for d in found if d.weekday() == 0 and d.month in (1, 2, 5, 9, 10)]
    thursdays = [d for d in found if d.weekday() == 3 and d.month == 11 and 22 <= d.day <= 28]
    # Third Monday of January and February, last Monday of May, first Monday of September,
    # second Monday of October. January may add an observed New Year's Day or, if the
    # implementation lists it, Inauguration Day; so at least five.
    assert len(mondays) >= 5
    assert len(thursdays) == 1


# add_business_days


@pytest.mark.parametrize(
    ("start", "count", "expected"),
    [
        # Thursday to Friday, no weekend or holiday between.
        (date(2026, 9, 24), 1, date(2026, 9, 25)),
        # Friday 2026-09-25: Saturday 26 and Sunday 27 are skipped. Monday 28 is day 1.
        (date(2026, 9, 25), 1, date(2026, 9, 28)),
        # Starting on the Saturday or the Sunday gives the same Monday.
        (date(2026, 9, 26), 1, date(2026, 9, 28)),
        (date(2026, 9, 27), 1, date(2026, 9, 28)),
        # Friday 2026-09-04: weekend, then Labor Day on Monday 7. Tuesday 8 is day 1.
        (date(2026, 9, 4), 1, date(2026, 9, 8)),
        # Thursday 2026-07-02: Friday 3 is Independence Day observed (July 4 is a
        # Saturday), then the weekend. Monday 6 is day 1.
        (date(2026, 7, 2), 1, date(2026, 7, 6)),
        # Friday 2027-07-02: weekend, then Monday 5 is Independence Day observed (July 4
        # is a Sunday). Tuesday 6 is day 1.
        (date(2027, 7, 2), 1, date(2027, 7, 6)),
        # Thursday 2027-06-17: Friday 18 is Juneteenth observed (June 19 is a Saturday),
        # then the weekend. Monday 21 is day 1.
        (date(2027, 6, 17), 1, date(2027, 6, 21)),
        # Thursday 2027-12-30: Friday 31 is New Year's Day 2028 observed (January 1 is a
        # Saturday), then the weekend. Monday 2028-01-03 is day 1.
        (date(2027, 12, 30), 1, date(2028, 1, 3)),
        # Wednesday 2026-11-25: Thursday 26 is Thanksgiving. Friday 27 is day 1.
        (date(2026, 11, 25), 1, date(2026, 11, 27)),
        # The same start, two days: Friday 27 is day 1, weekend, Monday 30 is day 2.
        (date(2026, 11, 25), 2, date(2026, 11, 30)),
        # Thursday 2026-01-01, itself a holiday. Days: Jan 2 (1), 5 (2), 6 (3), 7 (4),
        # 8 (5), 9 (6), 12 (7), 13 (8), 14 (9), 15 (10). The holiday on Monday 19 is
        # not reached.
        (date(2026, 1, 1), 10, date(2026, 1, 15)),
        # Monday 2026-12-21. Days: Dec 22 (1), 23 (2), 24 (3), Friday 25 is Christmas,
        # 28 (4), 29 (5), 30 (6), 31 (7), Friday Jan 1 is New Year's Day, Jan 4 (8),
        # 5 (9), 6 (10).
        (date(2026, 12, 21), 10, date(2027, 1, 6)),
        # Wednesday 2026-07-01. Days: Jul 2 (1), Friday 3 is the observed holiday,
        # 6 (2), 7 (3), 8 (4), 9 (5), 10 (6), 13 (7), 14 (8), 15 (9), 16 (10).
        (date(2026, 7, 1), 10, date(2026, 7, 16)),
        # Monday 2026-09-28, five days with no holiday: 29 (1), 30 (2), Oct 1 (3), 2 (4),
        # weekend, Monday Oct 5 (5).
        (date(2026, 9, 28), 5, date(2026, 10, 5)),
    ],
)
def test_add_business_days_skips_weekends_and_observed_holidays(start, count, expected):
    assert dates.add_business_days(start, count) == expected


@settings(deadline=None)
@given(days, st.integers(min_value=1, max_value=60))
def test_add_business_days_lands_on_a_business_day_after_the_start(start, count):
    result = dates.add_business_days(start, count)
    assert result > start
    assert is_business_day(result)


@settings(deadline=None)
@given(days, st.integers(min_value=1, max_value=60))
def test_add_business_days_passes_exactly_n_business_days(start, count):
    result = dates.add_business_days(start, count)
    passed = sum(
        1
        for offset in range(1, (result - start).days + 1)
        if is_business_day(start + timedelta(offset))
    )
    assert passed == count


@settings(deadline=None)
@given(days, st.integers(min_value=1, max_value=60))
def test_add_business_days_one_more_day_is_one_more_step(start, count):
    assert dates.add_business_days(start, count + 1) == dates.add_business_days(
        dates.add_business_days(start, count), 1
    )


@settings(deadline=None)
@given(days, st.integers(min_value=1, max_value=60))
def test_add_business_days_is_never_earlier_than_calendar_days(start, count):
    assert dates.add_business_days(start, count) >= start + timedelta(days=count)
