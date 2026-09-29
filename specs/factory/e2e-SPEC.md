# Factory end to end: a seed task

A small, real task that goes through the whole factory with real agents: tests first, then the code, then a pull request that clean CI must pass. It exists to prove the factory, and the function it adds is kept.

## The function

`engine.dates.is_weekend(d: date) -> bool` returns True when `d` is a Saturday or a Sunday, and False on every other day. It takes a date and nothing else, and reads no clock.

## The tests (L-tests)

tests/unit/engine/test_is_weekend.py:

- The seven days from Monday 2026-10-05 through Sunday 2026-10-11, each with its expected answer, worked out from a calendar and stated beside it.
- A property: for any date, `is_weekend(d)` equals `d.weekday() >= 5`, and exactly two of any seven days in a row are weekend days.

The function does not exist yet, so these tests cannot pass now. That is expected.

## The code (L-engine)

Add the function to engine/dates.py. Change nothing else in the engine.
