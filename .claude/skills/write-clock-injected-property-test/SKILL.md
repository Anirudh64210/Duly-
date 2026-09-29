---
name: write-clock-injected-property-test
description: Use when testing any date, deadline, or count. Shows how to inject a fixed clock and state the rule as a property.
---

1. Take a `Clock` as a parameter. Never call the system time. Gate 4 fails the build if you do.
2. In tests, pass `FixedClock(datetime(..., tzinfo=UTC))`.
3. State the rule as a property over generated inputs, then add the named edge cases: the day before, the day of, the day after.
4. Model: tests/unit/engine/test_verdict.py.

## Verification

Replay task: add a function to engine/ that counts days between two dates and test it.
With this skill: the test passes a FixedClock and gate 4 is green.
Without it: the usual first draft calls `date.today()` and gate 4 fails on `duly-time-only-through-clocks`.
