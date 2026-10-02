"""The readers, one per declared kind: specs/step-w/SPEC-W2-UNKNOWN.md point 41, with the
interface of point 12:

    read(decl, raw, run) -> (ReadState, object), ReadState one of known, absent, unreadable,
    undecided; `run` maps each record id in this run to its kind.

A table test per kind with a known and an unreadable value each, including the three date
strings Python 3.12's date.fromisoformat reads ("20260803", "2026-W32-1", "2026W321", mutant
U27). `not_sure` is undecided on every kind (point 4); strings are never converted (point 41).
engine.readers is imported inside each test (section 9).
"""

from datetime import date
from typing import Any

import pytest

RUN = {"c1": "course", "k1": "card", "w1": "job"}

DATE = {"id": "start", "kind": "date", "label": "Start"}
NUMBER = {"id": "hours", "kind": "number", "label": "Hours"}
COUNT = {"id": "credits", "kind": "count", "label": "Credits"}
FLAG = {"id": "online", "kind": "flag", "label": "Online"}
CHOICE = {"id": "mode", "kind": "choice", "label": "Mode", "choices": ["day", "night"]}
TEXT = {"id": "code", "kind": "text", "label": "Code", "max_length": 8, "pattern": "^[A-Z0-9]+$"}
LINK = {"id": "under", "kind": "link", "label": "Under", "to": ["card"]}
PERIODS = {"id": "hours_changes", "kind": "periods", "label": "Hours changes"}

KNOWN: list[tuple[dict[str, Any], Any, Any]] = [
    # (declaration, raw, the read value)
    (DATE, "2026-08-03", date(2026, 8, 3)),
    # The bounds of contracts/product_settings.yaml dates.earliest_readable / latest_readable.
    (DATE, "1950-01-01", date(1950, 1, 1)),
    (DATE, "2099-12-31", date(2099, 12, 31)),
    # 2028 is a leap year (divisible by 4, not by 100): Feb 29 is a real day.
    (DATE, "2028-02-29", date(2028, 2, 29)),
    (NUMBER, 40, 40),
    (NUMBER, 12.5, 12.5),
    # Point 42: the number loses its bounds; -1 and 200000 are read, then asked by the pack's
    # checks, never refused.
    (NUMBER, -1, -1),
    (NUMBER, 200000, 200000),
    (COUNT, 0, 0),
    (COUNT, 3, 3),
    (FLAG, True, True),
    (FLAG, False, False),
    (CHOICE, "night", "night"),
    (TEXT, "AB12", "AB12"),
    (LINK, "k1", "k1"),
]

UNREADABLE: list[tuple[dict[str, Any], Any]] = [
    (DATE, "2026-13-40"),  # month 13
    (DATE, "2026-02-29"),  # 2026 is not a leap year
    (DATE, "08/03/2026"),
    (DATE, "31/08/2026"),
    (DATE, "20260803"),  # fromisoformat reads it as 2026-08-03 (U27)
    (DATE, "2026-W32-1"),  # an ISO week date fromisoformat reads (U27)
    (DATE, "2026W321"),  # the same, basic form (U27)
    (DATE, "1949-12-31"),  # one day before dates.earliest_readable
    (DATE, "2100-01-01"),  # one day after dates.latest_readable
    (DATE, "9999-12-31"),  # the overflow point 41 closes
    (DATE, 20260803),
    (NUMBER, "40"),  # R8: "40" as a string is not 40
    (NUMBER, "forty"),
    (NUMBER, True),  # a boolean is not a number
    (COUNT, 1.5),
    (COUNT, -1),
    (COUNT, "3"),
    (COUNT, False),
    (FLAG, "yes"),
    (FLAG, 1),
    (CHOICE, "evening"),
    (CHOICE, 1),
    (TEXT, "TOOLONGCODE"),  # 11 characters, max_length 8
    (TEXT, "ab-1"),  # outside the pattern
    (LINK, "zz9"),  # no record in this run
    (LINK, "c1"),  # a course, where the field allows only a card
    (LINK, "w1"),
]

ALL_DECLS = [DATE, NUMBER, COUNT, FLAG, CHOICE, TEXT, LINK, PERIODS]


@pytest.mark.parametrize(("decl", "raw", "value"), KNOWN, ids=lambda x: repr(x)[:30])
def test_a_value_that_reads_against_its_kind_is_known(decl, raw, value):
    # Point 41's table, the known column. Fails if a reader converts, bounds or drops a value
    # its kind takes.
    from engine.readers import read

    state, got = read(decl, raw, RUN)
    assert state == "known"
    assert got == value
    assert type(got) is type(value)


@pytest.mark.parametrize(("decl", "raw"), UNREADABLE, ids=lambda x: repr(x)[:30])
def test_a_value_that_does_not_read_is_unreadable_and_kept_as_entered(decl, raw):
    # Points 3 and 41: unreadable is unknown, never absent, never converted; the object is the
    # raw value, so the question can show it back (point 34). Fails if a basic or week date
    # reads as 2026-08-03 (U27), "40" reads as 40 (R8), or a link to another kind is taken.
    from engine.readers import read

    state, got = read(decl, raw, RUN)
    assert state == "unreadable"
    assert got == raw
    assert type(got) is type(raw)


@pytest.mark.parametrize("decl", ALL_DECLS, ids=lambda d: d["kind"])
def test_not_sure_is_undecided_on_every_kind(decl):
    # Point 4: not_sure is undecided whether or not the pack offers Not sure on the field.
    from engine.readers import read

    state, _ = read(decl, "not_sure", RUN)
    assert state == "undecided"


@pytest.mark.parametrize("decl", ALL_DECLS, ids=lambda d: d["kind"])
def test_null_is_absent_on_every_kind(decl):
    # Point 2: a field left out or null is absent. What absence means is the pack's
    # when_absent, worked by the engine, not by the reader.
    from engine.readers import read

    state, got = read(decl, None, RUN)
    assert state == "absent"
    assert got is None


def test_periods_read_when_every_period_reads():
    # Point 41: a periods value is known when every period's values read the same way. Two
    # periods: 2026-07-01 at 20 hours, 2026-08-01 to 2026-08-31 at 30.
    from engine.readers import read

    raw = [
        {"start": "2026-07-01", "hours_per_week": 20},
        {"start": "2026-08-01", "end": "2026-08-31", "hours_per_week": 30},
    ]
    state, got = read(PERIODS, raw, RUN)
    assert state == "known"
    assert isinstance(got, list)
    assert len(got) == 2


@pytest.mark.parametrize(
    "bad",
    [
        {"start": "2026-07-01", "hours_per_week": "forty"},
        {"start": "20260701", "hours_per_week": 20},
        {"start": "2026-07-01", "end": "2026-13-40", "hours_per_week": 20},
    ],
)
def test_one_period_that_does_not_read_makes_the_periods_unreadable(bad):
    # Point 41 and 42: a period's start and hours take the scalar, so one period with "forty"
    # is taken in and read as unreadable, not refused, and never read as 0 or dropped.
    from engine.readers import read

    raw = [{"start": "2026-06-01", "hours_per_week": 20}, bad]
    state, got = read(PERIODS, raw, RUN)
    assert state == "unreadable"
    assert got == raw


def test_the_readable_dates_are_the_product_settings_bounds():
    # Point 41 and 53: dates.earliest_readable 1950-01-01 and latest_readable 2099-12-31 in
    # contracts/product_settings.yaml. The reader reads from the file, so these two edges
    # hold for any engine that reads the same file. Fails if the bounds are hard-coded apart.
    from engine.readers import read
    from engine.settings import load_settings

    by_id = {row["id"]: row for row in load_settings()["settings"]}
    first = by_id["dates.earliest_readable"]["value"]
    last = by_id["dates.latest_readable"]["value"]
    assert (first, last) == ("1950-01-01", "2099-12-31")
    assert read(DATE, first, RUN)[0] == "known"
    assert read(DATE, last, RUN)[0] == "known"
