"""The routes the server app and the desktop engine share: /health, /version, /v1/compute,
/v1/schedule, /v1/updates, and the body of /v1/status.

specs/step-w/SPEC-W1.md points 1 and 2, SPEC-W2 point 47. Mounted by api/main.py and
api/desktop_main.py. Imports only fastapi, api.case, api.case_f1 and engine/, so
the desktop engine loads nothing server-only (no api.settings, api.db or pydantic_settings).
"""

from datetime import date
from functools import lru_cache
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from api import case as records_case
from api.case_f1 import (
    NOT_A_NUMBER,
    NOT_JSON,
    NOT_YET,
    NotANumberError,
    read_body,
)
from engine.clocks import Clock, SystemClock, day_in_zone
from engine.path import CaseStructureError
from engine.rulepack import Rulepack, load_all
from engine.schedule import CalendarNotInForceError, schedule
from engine.verdict import VerdictInputs, decide

# The query lists of /v1/updates, comma separated (openapi: style form, explode false). A
# category is ^[a-z0-9]+$; a stage id also takes "_" and ".".
CATEGORIES = r"^[a-z0-9]+(,[a-z0-9]+)*$"
NAMES = r"^[a-z0-9_.]+(,[a-z0-9_.]+)*$"

NO_CALENDAR = (
    "requests: a business day count here crosses a day on which no rule pack of the case "
    "holds the federal holiday list, so Duly cannot count it."
)

API_VERSION = "0.0.0"
CONTRACTS_VERSION = "0.0.0"

router = APIRouter()
# The desktop engine's own /v1/status. The server app keeps its own, which reads Postgres.
desktop_router = APIRouter()


def get_clock() -> Clock:
    return SystemClock()


async def get_body(request: Request) -> bytes:
    return await request.body()


@lru_cache
def get_packs() -> list[Rulepack]:
    return load_all()


@router.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@router.get("/version")
def version() -> dict[str, str]:
    return {"api": API_VERSION, "contracts": CONTRACTS_VERSION}


def _json(body: bytes) -> Any:
    try:
        return read_body(body)
    except NotANumberError:
        raise HTTPException(status_code=422, detail=NOT_A_NUMBER) from None
    except (ValueError, RecursionError):
        raise HTTPException(status_code=422, detail=NOT_JSON) from None


def _checked_case(case: Any, clock: Clock) -> None:
    """Refuses a case /v1/compute would refuse, in the same words."""
    problem = records_case.first_problem(case)
    if problem is not None:
        raise HTTPException(status_code=422, detail=problem)
    if records_case.answered_after(case, day_in_zone(clock, case["time_zone"])):
        raise HTTPException(status_code=422, detail=NOT_YET)


@router.post("/v1/compute")
def compute_case(
    body: Annotated[bytes, Depends(get_body)],
    packs: Annotated[list[Rulepack], Depends(get_packs)],
    clock: Annotated[Clock, Depends(get_clock)],
) -> dict[str, Any]:
    """A case under case.schema.json, for any category. Stateless, as /v1/compute/f1 is,
    and refused in the same words."""
    raw = _json(body)
    _checked_case(raw, clock)
    try:
        return records_case.compute(raw, packs, clock)
    except CaseStructureError:
        # SPEC-W2-UNKNOWN point 39: a structure the packs do not declare. The engine's words
        # name what was sent, so they are not shown.
        raise HTTPException(status_code=422, detail=records_case.CASE_STRUCTURE) from None


@router.post("/v1/schedule")
def schedule_dates(
    body: Annotated[bytes, Depends(get_body)],
    packs: Annotated[list[Rulepack], Depends(get_packs)],
    clock: Annotated[Clock, Depends(get_clock)],
) -> dict[str, Any]:
    """A1: the dates of the Loop's timers, from engine/schedule.py. Stateless; the case is
    refused as /v1/compute refuses it."""
    raw = _json(body)
    problem = records_case.schedule_problem(raw)
    if problem is not None:
        raise HTTPException(status_code=422, detail=problem)
    ids = [r["id"] for r in raw["requests"]]
    shared = next((i for i in ids if ids.count(i) > 1), None)
    if shared is not None:
        # schedule.schema.json: an id is unique within one request.
        raise HTTPException(
            status_code=422, detail=f"requests: more than one request has the id {shared}."
        )
    _checked_case(raw["case"], clock)
    try:
        return schedule(raw, packs, clock)
    except CaseStructureError:
        raise HTTPException(status_code=422, detail=records_case.CASE_STRUCTURE) from None
    except CalendarNotInForceError:
        raise HTTPException(status_code=422, detail=NO_CALENDAR) from None


def _names(sent: str | None) -> set[str]:
    return set(sent.split(",")) if sent else set()


@router.get("/v1/updates")
def updates(
    categories: Annotated[str | None, Query(pattern=CATEGORIES)] = None,
    stages: Annotated[str | None, Query(pattern=NAMES)] = None,
) -> dict[str, Any]:
    """A2: the approved updates, each with the stage ids of the case it bears on. Matching
    reads names sent in the query, never a value the person entered. update.schema.json has
    no field selector yet, so fields never match."""
    cats, case_stages = _names(categories), _names(stages)
    shown = []
    for update in records_case.published_updates():
        bears = cats & set(update.get("categories", []))
        matched = [s for s in update.get("stages", []) if s in case_stages] if bears else []
        shown.append({"update": update, "matched": {"stages": matched, "fields": []}})
    matching = sum(1 for entry in shown if entry["matched"]["stages"])
    return {"matching": matching, "updates": shown}


def _iso(day: date | None) -> str | None:
    return None if day is None else day.isoformat()


def status_body(
    packs: list[Rulepack], clock: Clock, database: Literal["ok", "unreachable"]
) -> dict[str, Any]:
    """GET /v1/status: the rule packs Duly holds and the verdict on an empty case."""
    # SPEC-resolutions point 35: the packs' own dates. The oldest among the packs that
    # hold rules, so a stale pack is never hidden by a fresh one.
    checked_on = [p.rules_checked_on for p in packs if p.rules_checked_on is not None]
    empty_case = VerdictInputs(
        documents_count=0,
        missing_inputs=(),
        conflicting_inputs=(),
        rules_checked_on=min(checked_on, default=None),
        depends_on_litigated_rule=False,
        judgement_items=(),
        open_items=(),
    )
    verdict = decide(empty_case, clock)
    return {
        "database": database,
        "rulepacks": [
            {
                "category": p.category,
                "version": p.version,
                "parameters": len(p.parameters),
                "rules_checked_on": _iso(p.rules_checked_on),
            }
            for p in packs
        ],
        "verdict": {"state": verdict.state.value, "reasons": list(verdict.reasons)},
        "checked_at": clock.now().isoformat(),
    }


@desktop_router.get("/v1/status")
def desktop_status(
    packs: Annotated[list[Rulepack], Depends(get_packs)],
    clock: Annotated[Clock, Depends(get_clock)],
) -> dict[str, Any]:
    """The onboarding reads its list of statuses from here (SPEC-W1 point 1). The desktop
    has no server database, so there is none to be unreachable."""
    return status_body(packs, clock, "ok")
