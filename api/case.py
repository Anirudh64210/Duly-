"""POST /v1/compute: a case under contracts/case.schema.json, for any category.

The refusals are the ones /v1/compute/f1 gives, in the same words. No engine function
reads a records case yet, so every category is answered as not covered: the verdict is
cannot_tell with category_not_covered:<id>, and nothing is guessed.
"""

from datetime import date
from functools import lru_cache
from typing import Any

from jsonschema import Draft202012Validator

from api.case_f1 import first_problem_under, validator_for
from engine.clocks import Clock
from engine.rulepack import REPO_ROOT, Rulepack
from engine.verdict import Verdict, VerdictInputs, VerdictState, decide

SCHEMA_PATH = REPO_ROOT / "contracts" / "case.schema.json"


@lru_cache
def _validator() -> Draft202012Validator:
    return validator_for(SCHEMA_PATH)


def first_problem(raw: Any) -> str | None:
    """The first way the case departs from case.schema.json, in plain words, or None."""
    return first_problem_under(_validator(), raw)


def answered_after(raw: dict[str, Any], today: date) -> bool:
    """True when an answer in confirmations is dated after the person's own day."""
    given = raw.get("confirmations") or {}
    return any(date.fromisoformat(answer["on"]) > today for answer in given.values())


def compute(
    raw: dict[str, Any], packs: list[Rulepack], clock: Clock, today: date
) -> dict[str, Any]:
    """The engine output for a case the contract accepts.

    The case holds no document, so scope.documents_count is 0 (contracts-reconciled
    point 12). The rules are checked on the oldest date among the case's packs that
    hold rules, so a stale pack is never hidden by a fresh one."""
    categories: list[str] = list(dict.fromkeys(raw["categories"]))
    by_category = {p.category: p for p in packs}
    used = [by_category[c] for c in categories if c in by_category]
    checked = [p.rules_checked_on for p in used if p.rules_checked_on is not None]
    rules_checked_on = min(checked, default=None)
    decided = decide(
        VerdictInputs(
            documents_count=0,
            missing_inputs=(),
            conflicting_inputs=(),
            rules_checked_on=rules_checked_on,
            depends_on_litigated_rule=False,
            judgement_items=(),
            open_items=(),
        ),
        clock,
        today,
    )
    # A category the engine does not compute is never read as quiet.
    verdict = Verdict(
        VerdictState.CANNOT_TELL,
        (*(f"category_not_covered:{c}" for c in categories), *decided.reasons),
    )
    return {
        "today": {"date": today.isoformat(), "time_zone": raw["time_zone"]},
        "rulepacks": [{"category": p.category, "version": p.version} for p in used],
        "scope": {
            "documents_count": 0,
            "rules_checked_on": None if rules_checked_on is None else rules_checked_on.isoformat(),
        },
        "verdict": {"state": verdict.state.value, "reasons": list(verdict.reasons)},
        "computed": [],
        "upcoming": [],
        "lists": [],
        "questions": [],
        "rules": {},
    }
