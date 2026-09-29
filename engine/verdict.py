"""The four-state verdict.

The order of the checks is the point: anything that stops Duly from knowing
wins over everything else, so the quiet state can never be a fallback.
"""

from dataclasses import dataclass
from datetime import date, timedelta
from enum import StrEnum

from engine.clocks import Clock

RULES_STALE_AFTER = timedelta(days=7)


class VerdictState(StrEnum):
    NO_OPEN_ITEMS = "no_open_items"
    NEEDS_YOU = "needs_you"
    TALK_TO_DSO = "talk_to_dso"
    CANNOT_TELL = "cannot_tell"


@dataclass(frozen=True)
class VerdictInputs:
    documents_count: int
    missing_inputs: tuple[str, ...]
    conflicting_inputs: tuple[str, ...]
    rules_checked_on: date | None
    depends_on_litigated_rule: bool
    judgement_items: tuple[str, ...]
    open_items: tuple[str, ...]


@dataclass(frozen=True)
class Verdict:
    state: VerdictState
    reasons: tuple[str, ...]


def decide(inputs: VerdictInputs, clock: Clock) -> Verdict:
    blockers: list[str] = []
    if inputs.documents_count == 0:
        blockers.append("no_documents")
    blockers.extend(f"missing:{name}" for name in inputs.missing_inputs)
    blockers.extend(f"conflict:{name}" for name in inputs.conflicting_inputs)
    if inputs.rules_checked_on is None:
        blockers.append("rules_never_checked")
    elif clock.today() - inputs.rules_checked_on > RULES_STALE_AFTER:
        blockers.append("rules_stale")
    if inputs.depends_on_litigated_rule:
        blockers.append("rule_in_litigation")
    if blockers:
        return Verdict(VerdictState.CANNOT_TELL, tuple(blockers))

    if inputs.judgement_items:
        return Verdict(VerdictState.TALK_TO_DSO, inputs.judgement_items)
    if inputs.open_items:
        return Verdict(VerdictState.NEEDS_YOU, inputs.open_items)
    return Verdict(VerdictState.NO_OPEN_ITEMS, ())
