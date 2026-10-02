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
    open_questions: tuple[str, ...] = ()
    # SPEC-W2-UNKNOWN point 35: a value that does not read, and a not-sure answer an
    # unsettled read rests on. Both are asked, so both block like a missing one.
    unreadable_inputs: tuple[str, ...] = ()
    undecided_inputs: tuple[str, ...] = ()
    categories_not_covered: tuple[str, ...] = ()
    # SPEC-W2-UNKNOWN point 5: an output the engine could not work and could name no gap for.
    engine_gaps: tuple[str, ...] = ()


@dataclass(frozen=True)
class Verdict:
    state: VerdictState
    reasons: tuple[str, ...]


def decide(inputs: VerdictInputs, clock: Clock, today: date | None = None) -> Verdict:
    """today is the person's own day. Without one the day is read from the clock."""
    day = clock.today() if today is None else today
    blockers: list[str] = []
    if inputs.documents_count == 0:
        blockers.append("no_documents")
    blockers.extend(f"unconfirmed:{name}" for name in inputs.open_questions)
    blockers.extend(f"missing:{name}" for name in inputs.missing_inputs)
    blockers.extend(f"unreadable:{name}" for name in inputs.unreadable_inputs)
    blockers.extend(f"undecided:{name}" for name in inputs.undecided_inputs)
    blockers.extend(f"category_not_covered:{name}" for name in inputs.categories_not_covered)
    blockers.extend(f"engine_gap:{name}" for name in inputs.engine_gaps)
    blockers.extend(f"conflict:{name}" for name in inputs.conflicting_inputs)
    if inputs.rules_checked_on is None:
        blockers.append("rules_never_checked")
    elif day - inputs.rules_checked_on > RULES_STALE_AFTER:
        blockers.append("rules_stale")
    if inputs.depends_on_litigated_rule:
        blockers.append("rule_in_litigation")
    if blockers:
        # A matter for the DSO is still named when Duly cannot tell (SPEC-resolutions
        # point 40: the verdict carries rule_not_in_force_on_event_day).
        return Verdict(VerdictState.CANNOT_TELL, (*blockers, *inputs.judgement_items))

    if inputs.judgement_items:
        return Verdict(VerdictState.TALK_TO_DSO, inputs.judgement_items)
    if inputs.open_items:
        return Verdict(VerdictState.NEEDS_YOU, inputs.open_items)
    return Verdict(VerdictState.NO_OPEN_ITEMS, ())
