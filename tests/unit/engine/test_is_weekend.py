"""engine/dates.py: is_weekend.

Specified in specs/factory/e2e-SPEC.md, "The function":
  engine.dates.is_weekend(d: date) -> bool returns True when d is a Saturday or a Sunday,
  and False on every other day. It takes a date and nothing else, and reads no clock.

The cases are the ones listed in the same SPEC under "The tests (L-tests)".

Every expected answer below was worked out by hand. The working:
  January 1, 2026 is a Thursday.
  Days in January through September 2026 (2026 is not a leap year):
  31 + 28 + 31 + 30 + 31 + 30 + 31 + 31 + 30 = 273.
  October 5 is 273 + 4 = 277 days after January 1.
  277 = 39 * 7 + 4, so October 5 falls 4 weekdays after a Thursday: Friday, Saturday,
  Sunday, Monday. October 5, 2026 is a Monday.
  The printed calendar for October 2026 agrees: the 4th is a Sunday and the 5th a Monday.
  The six days after it follow in order.

No test here reads the time. Every date is written out or drawn by hypothesis.
"""

from datetime import date, timedelta

from hypothesis import given
from hypothesis import strategies as st

from engine import dates

# date.max is 9999-12-31. Six days are kept free so a run of seven never leaves the range.
days = st.dates(max_value=date.max - timedelta(days=6))


# The seven days from Monday 2026-10-05 through Sunday 2026-10-11.


def test_monday_is_not_a_weekend_day() -> None:
    # October 5, 2026: Monday, by the working at the top. Not a Saturday or a Sunday.
    assert dates.is_weekend(date(2026, 10, 5)) is False


def test_tuesday_is_not_a_weekend_day() -> None:
    # October 6, 2026: Monday the 5th plus 1 day is a Tuesday.
    assert dates.is_weekend(date(2026, 10, 6)) is False


def test_wednesday_is_not_a_weekend_day() -> None:
    # October 7, 2026: Monday the 5th plus 2 days is a Wednesday.
    assert dates.is_weekend(date(2026, 10, 7)) is False


def test_thursday_is_not_a_weekend_day() -> None:
    # October 8, 2026: Monday the 5th plus 3 days is a Thursday.
    assert dates.is_weekend(date(2026, 10, 8)) is False


def test_friday_is_not_a_weekend_day() -> None:
    # October 9, 2026: Monday the 5th plus 4 days is a Friday, the last day before the
    # weekend.
    assert dates.is_weekend(date(2026, 10, 9)) is False


def test_saturday_is_a_weekend_day() -> None:
    # October 10, 2026: Monday the 5th plus 5 days is a Saturday.
    assert dates.is_weekend(date(2026, 10, 10)) is True


def test_sunday_is_a_weekend_day() -> None:
    # October 11, 2026: Monday the 5th plus 6 days is a Sunday.
    assert dates.is_weekend(date(2026, 10, 11)) is True


# Properties, from "The tests (L-tests)": for any date, is_weekend(d) equals
# d.weekday() >= 5, and exactly two of any seven days in a row are weekend days.


@given(day=st.dates())
def test_the_answer_matches_the_weekday_of_any_date(day: date) -> None:
    # date.weekday() counts Monday as 0, so Saturday is 5 and Sunday is 6.
    assert dates.is_weekend(day) is (day.weekday() >= 5)


@given(first=days)
def test_any_seven_days_in_a_row_hold_two_weekend_days(first: date) -> None:
    # Seven days in a row hold each day of the week once: one Saturday and one Sunday,
    # so 1 + 1 = 2, whichever day the run starts on.
    week = [first + timedelta(days=n) for n in range(7)]
    assert sum(1 for day in week if dates.is_weekend(day)) == 2


def test_the_answer_does_not_depend_on_the_day_it_is_asked() -> None:
    # "It takes a date and nothing else, and reads no clock." The same date gives the same
    # answer each time, and a second argument such as a clock is refused.
    saturday = date(2026, 10, 10)
    assert dates.is_weekend(saturday) is dates.is_weekend(saturday) is True
    try:
        dates.is_weekend(saturday, object())  # type: ignore[call-arg]
    except TypeError:
        return
    raise AssertionError("is_weekend took a second argument; the SPEC gives it a date only")
