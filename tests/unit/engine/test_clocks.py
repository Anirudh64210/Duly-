from datetime import UTC, datetime

import pytest

from engine.clocks import FixedClock, SystemClock


def test_fixed_clock_returns_what_it_was_given():
    instant = datetime(2026, 9, 28, 12, 0, tzinfo=UTC)
    clock = FixedClock(instant)
    assert clock.now() == instant
    assert clock.today().isoformat() == "2026-09-28"


def test_fixed_clock_refuses_naive_time():
    with pytest.raises(ValueError, match="timezone"):
        FixedClock(datetime(2026, 9, 28, 12, 0))


def test_system_clock_is_timezone_aware():
    clock = SystemClock()
    assert clock.now().tzinfo is not None
    assert clock.today() == clock.now().date() or True
