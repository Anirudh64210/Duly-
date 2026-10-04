"""POST /v1/compute: a case under contracts/case.schema.json, for any category. Also what
/v1/schedule and /v1/updates read from files: the schedule contract, which takes its case from
case.schema.json, and the published updates (SPEC-W2 point 47).

The refusals are the ones /v1/compute/f1 gives, in the same words. The case itself is
computed by engine/path.py (specs/product-2/resolutions.md point 1): the api checks the
body, reads today through engine.clocks, and returns the engine output as it is.
"""

import json
from datetime import date
from functools import lru_cache
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

from api.case_f1 import first_problem_under, first_schema_problem, validator_for
from engine import path
from engine.clocks import Clock
from engine.rulepack import REPO_ROOT, Rulepack
from engine.updates import publish_blockers

SCHEMA_PATH = REPO_ROOT / "contracts" / "case.schema.json"
SCHEDULE_SCHEMA_PATH = REPO_ROOT / "contracts" / "schedule.schema.json"
UPDATE_SCHEMA_PATH = REPO_ROOT / "contracts" / "update.schema.json"
PUBLISHED = REPO_ROOT / "pipeline" / "published"

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


@lru_cache
def _schedule_validator() -> Draft202012Validator:
    schemas = [json.loads(p.read_text()) for p in (SCHEDULE_SCHEMA_PATH, SCHEMA_PATH)]
    registry: Registry[Any] = Registry().with_resources(
        (s["$id"], Resource.from_contents(s)) for s in schemas
    )
    request = {"$ref": f"{schemas[0]['$id']}#/$defs/request"}
    return Draft202012Validator(request, registry=registry, format_checker=FormatChecker())


def schedule_problem(raw: Any) -> str | None:
    """The first way a body departs from schedule.schema.json's request, or None."""
    return first_schema_problem(_schedule_validator(), raw)


@lru_cache
def _update_validator() -> Draft202012Validator:
    return validator_for(UPDATE_SCHEMA_PATH)


def published_updates() -> list[dict[str, Any]]:
    """The updates in pipeline/published/ that follow update.schema.json and for which
    publish_blockers returns nothing (openapi /v1/updates; DECISIONS.md D95 (2)). A file
    outside the schema is never returned, whatever publish_blockers would say of it; a file
    that is not JSON at all is one of those, and the other files are still served."""
    updates = []
    for file in sorted(PUBLISHED.glob("*.json")):
        try:
            updates.append(json.loads(file.read_text()))
        except json.JSONDecodeError:
            continue
    return [u for u in updates if _update_validator().is_valid(u) and publish_blockers(u) == ()]
