from collections.abc import Awaitable, Callable
from datetime import date
from functools import lru_cache
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from sqlalchemy.engine import Engine

from api import case as records_case
from api.case_f1 import (
    NOT_A_NUMBER,
    NOT_JSON,
    NOT_YET,
    NotANumberError,
    first_problem,
    read_body,
)
from api.db import database_reachable, make_engine
from api.local_token import NOT_FROM_THE_APP, TOKEN_HEADER, expected_token, request_allowed
from api.ops_guard import caller_allowed
from api.settings import Settings, get_settings
from engine.clocks import Clock, SystemClock, day_in_zone
from engine.f1 import compute_f1, parse_case
from engine.rulepack import Rulepack, load_all
from engine.verdict import VerdictInputs, decide

API_VERSION = "0.0.0"
CONTRACTS_VERSION = "0.0.0"

app = FastAPI(title="Duly API", version=API_VERSION, docs_url=None, redoc_url=None)

_engines: dict[str, Engine] = {}


@app.middleware("http")
async def local_token_guard(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """When the desktop app set a launch token, every call but /health must carry it."""
    if not request_allowed(request.url.path, request.headers.get(TOKEN_HEADER), expected_token()):
        return JSONResponse(status_code=403, content={"detail": NOT_FROM_THE_APP})
    return await call_next(request)


def get_clock() -> Clock:
    return SystemClock()


def get_db(settings: Annotated[Settings, Depends(get_settings)]) -> Engine:
    if settings.database_url not in _engines:
        _engines[settings.database_url] = make_engine(settings.database_url)
    return _engines[settings.database_url]


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/version")
def version() -> dict[str, str]:
    return {"api": API_VERSION, "contracts": CONTRACTS_VERSION}


def _iso(day: date | None) -> str | None:
    return None if day is None else day.isoformat()


@app.get("/v1/status")
def status(
    db: Annotated[Engine, Depends(get_db)],
    clock: Annotated[Clock, Depends(get_clock)],
) -> dict[str, Any]:
    packs = load_all()
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
        "database": "ok" if database_reachable(db) else "unreachable",
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


@lru_cache
def get_f1_pack() -> Rulepack:
    return next(p for p in load_all() if p.category == "f1")


async def get_body(request: Request) -> bytes:
    return await request.body()


@app.post("/v1/compute/f1")
def compute_f1_case(
    body: Annotated[bytes, Depends(get_body)],
    pack: Annotated[Rulepack, Depends(get_f1_pack)],
    clock: Annotated[Clock, Depends(get_clock)],
) -> dict[str, Any]:
    """Stateless. The body is read here, checked, computed, and dropped.

    A plain def, so the engine runs on a worker thread and not on the event loop.
    """
    try:
        raw = read_body(body)
    except NotANumberError:
        raise HTTPException(status_code=422, detail=NOT_A_NUMBER) from None
    except (ValueError, RecursionError):
        raise HTTPException(status_code=422, detail=NOT_JSON) from None
    problem = first_problem(raw)
    if problem is not None:
        raise HTTPException(status_code=422, detail=problem)
    try:
        case = parse_case(raw, clock)
    except ValueError:
        # The contract, the numbers and the zone are checked above, so what is left is an
        # answer dated after the person's own day. The engine's words are not shown: they
        # name what was sent.
        raise HTTPException(status_code=422, detail=NOT_YET) from None
    return compute_f1(case, pack, clock)


@lru_cache
def get_packs() -> list[Rulepack]:
    return load_all()


@app.post("/v1/compute")
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


@app.get("/ops/v1/status")
def ops_status(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    caller = request.client.host if request.client else ""
    if not caller_allowed(caller, settings.ops_networks):
        raise HTTPException(status_code=403, detail="This address is not on the allowlist.")
    return {"caller": caller, "allowlist": settings.ops_networks}
