"""The routes the server app and the desktop engine share: /health, /version, /v1/compute.

specs/step-w/SPEC-W1.md point 2. Mounted by api/main.py and api/desktop_main.py. Imports
only fastapi, api.case, api.case_f1 and engine/, so the desktop engine loads nothing
server-only (no api.settings, api.db or pydantic_settings).
"""

from functools import lru_cache
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request

from api import case as records_case
from api.case_f1 import NOT_A_NUMBER, NOT_JSON, NOT_YET, NotANumberError, read_body
from engine.clocks import Clock, SystemClock, day_in_zone
from engine.rulepack import Rulepack, load_all

API_VERSION = "0.0.0"
CONTRACTS_VERSION = "0.0.0"

router = APIRouter()


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


@router.post("/v1/compute")
def compute_case(
    body: Annotated[bytes, Depends(get_body)],
    packs: Annotated[list[Rulepack], Depends(get_packs)],
    clock: Annotated[Clock, Depends(get_clock)],
) -> dict[str, Any]:
    """A case under case.schema.json, for any category. Stateless, as /v1/compute/f1 is,
    and refused in the same words."""
    try:
        raw = read_body(body)
    except NotANumberError:
        raise HTTPException(status_code=422, detail=NOT_A_NUMBER) from None
    except (ValueError, RecursionError):
        raise HTTPException(status_code=422, detail=NOT_JSON) from None
    problem = records_case.first_problem(raw)
    if problem is not None:
        raise HTTPException(status_code=422, detail=problem)
    today = day_in_zone(clock, raw["time_zone"])
    if records_case.answered_after(raw, today):
        raise HTTPException(status_code=422, detail=NOT_YET)
    try:
        return records_case.compute(raw, packs, clock)
    except ValueError:
        # A kind, a field or a category the packs do not declare. The engine's words name
        # what was sent, so they are not shown.
        raise HTTPException(status_code=422, detail=records_case.NOT_IN_THE_PACK) from None
