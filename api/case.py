"""POST /v1/compute: a case under contracts/case.schema.json, for any category.

The refusals are the ones /v1/compute/f1 gives, in the same words. The case itself is
computed by engine/path.py (specs/product-2/resolutions.md point 1): the api checks the
body, reads today through engine.clocks, and returns the engine output as it is.
"""

from datetime import date
from functools import lru_cache
from typing import Any

from jsonschema import Draft202012Validator

from api.case_f1 import first_problem_under, validator_for
from engine import path
from engine.clocks import Clock
from engine.rulepack import REPO_ROOT, Rulepack

SCHEMA_PATH = REPO_ROOT / "contracts" / "case.schema.json"

# SPEC-W2-UNKNOWN point 39: the pack's structure, which no person typed and no question could
# fix. The words never repeat what was sent.
CASE_STRUCTURE = (
    "records: the case is not built the way the rule pack declares. Each record needs a "
    "category the case lists, a kind and fields the pack declares, its own id that starts with "
    "its kind's prefix, no more records of a kind than the pack allows, and only facts the pack "
    "declares."
)


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


def compute(raw: dict[str, Any], packs: list[Rulepack], clock: Clock) -> dict[str, Any]:
    """The engine output for a case the contract accepts, from engine/path.py.

    Raises path.CaseStructureError when the case's structure falls outside what the packs
    declare; the engine's words name what was sent, so the caller shows CASE_STRUCTURE."""
    return path.compute(raw, packs, clock)
