"""The only place in the codebase that may read the system time.

Every computation takes a Clock. Tests and replays pass a FixedClock.
"""

from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Protocol


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
