"""One rule for unknown values (specs/step-w/SPEC-W2-UNKNOWN.md points 5, 7 and 12).

Three truth values: True, False, or an Unknown that names the gaps it rests on. Strong
Kleene logic: an answer is True or False only when every value the unknowns could take
gives that answer. Pure: no pack, no clock, nothing of any category.
"""

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from typing import Final, Literal, NamedTuple

GapState = Literal[
    "absent", "unreadable", "undecided", "list", "conflict", "lapse", "pending", "future"
]


class Gap(NamedTuple):
    """What an unknown rests on. record is None for a fact or a list."""

    record: str | None
    field: str
    state: GapState


@dataclass(frozen=True)
class Unknown:
    """A value that is not known, with every gap it rests on. Never empty (point 5)."""

    gaps: frozenset[Gap]

    def __post_init__(self) -> None:
        if not self.gaps:
            raise ValueError("an unknown must name at least one gap")


class _Stated:
    """A known value standing for absence the person stated (point 1)."""

    def __init__(self, name: str) -> None:
        self._name = name

    def __repr__(self) -> str:
        return self._name


NONE: Final[object] = _Stated("NONE")
NOT_YET: Final[object] = _Stated("NOT_YET")

Tri = bool | Unknown


def _union(values: Iterable[Unknown]) -> Unknown:
    return Unknown(frozenset(gap for value in values for gap in value.gaps))


def all3(values: Iterable[Tri]) -> Tri:
    """False if any is False, True if all are True, else unknown on the unknown ones."""
    unknown: list[Unknown] = []
    for value in values:
        if value is False:
            return False
        if isinstance(value, Unknown):
            unknown.append(value)
    return _union(unknown) if unknown else True


def any3(values: Iterable[Tri]) -> Tri:
    """True if any is True, False if all are False, else unknown on the unknown ones."""
    unknown: list[Unknown] = []
    for value in values:
        if value is True:
            return True
        if isinstance(value, Unknown):
            unknown.append(value)
    return _union(unknown) if unknown else False


def not3(value: Tri) -> Tri:
    return value if isinstance(value, Unknown) else not value


def _open(undecided: Sequence[Unknown], unstated: Unknown | None) -> Unknown:
    return _union([*undecided, *([unstated] if unstated is not None else [])])


def exists3(chosen: int, undecided: Sequence[Unknown], unstated: Unknown | None) -> Tri:
    """True if a decided record is chosen; False if none is chosen, none is undecided and
    the list is stated whole (unstated is None); else unknown."""
    if chosen > 0:
        return True
    if not undecided and unstated is None:
        return False
    return _open(undecided, unstated)


def count_below3(
    n: int, chosen: int, undecided: Sequence[Unknown], unstated: Unknown | None
) -> Tri:
    """Fewer than n chosen: False if n or more are; True if the list is whole and even every
    undecided record would leave it below n; else unknown."""
    if chosen >= n:
        return False
    if unstated is None and chosen + len(undecided) < n:
        return True
    return _open(undecided, unstated)


def count_at_most3(
    n: int, chosen: int, undecided: Sequence[Unknown], unstated: Unknown | None
) -> Tri:
    """At most n chosen: False if more are; True if the list is whole and even every
    undecided record would leave it at n or less; else unknown."""
    if chosen > n:
        return False
    if unstated is None and chosen + len(undecided) <= n:
        return True
    return _open(undecided, unstated)
