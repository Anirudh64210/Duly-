"""The only place in the codebase that may read the system time.

Every computation takes a Clock. Tests and replays pass a FixedClock.
"""

from dataclasses import dataclass
from datetime import UTC, date, datetime
from functools import cache
from typing import Protocol
from zoneinfo import ZoneInfo, available_timezones


class Clock(Protocol):
    def now(self) -> datetime: ...

    def today(self) -> date: ...


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(UTC)

    def today(self) -> date:
        return self.now().date()


@dataclass(frozen=True)
class FixedClock:
    instant: datetime

    def __post_init__(self) -> None:
        if self.instant.tzinfo is None:
            raise ValueError("FixedClock needs a timezone-aware instant")

    def now(self) -> datetime:
        return self.instant

    def today(self) -> date:
        return self.instant.date()


@cache
def _known_zones() -> frozenset[str]:
    return frozenset(available_timezones())


def zone_named(name: str) -> ZoneInfo:
    """The zone with this IANA name, written as the zone files write it.

    Raises ValueError for a name that is no zone. The words do not repeat the name."""
    if name not in _known_zones():
        raise ValueError("time_zone: the value sent is not a time zone Duly knows")
    try:
        return ZoneInfo(name)
    except (KeyError, OSError, ValueError):
        raise ValueError("time_zone: the value sent is not a time zone Duly knows") from None


def day_in_zone(clock: Clock, time_zone: str) -> date:
    """The person's own day: the instant of the clock seen from their zone, then its
    date. The clock's today() is never read."""
    return clock.now().astimezone(zone_named(time_zone)).date()
