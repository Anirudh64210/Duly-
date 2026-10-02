from collections.abc import Awaitable, Callable
from functools import lru_cache
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from sqlalchemy.engine import Engine

from api.case import CASE_STRUCTURE
from api.case_f1 import (
    NOT_A_NUMBER,
    NOT_JSON,
    NOT_YET,
    NotANumberError,
    first_problem,
    read_body,
)
from api.db import database_reachable, make_engine
from api.local_routes import API_VERSION, get_body, get_clock, router, status_body
from api.local_token import NOT_FROM_THE_APP, TOKEN_HEADER, expected_token, request_allowed
from api.ops_guard import caller_allowed
from api.settings import Settings, get_settings
from engine.clocks import Clock
from engine.f1 import compute_f1, parse_case
from engine.path import CaseStructureError
from engine.rulepack import Rulepack, load_all

app = FastAPI(title="Duly API", version=API_VERSION, docs_url=None, redoc_url=None)
# /health, /version and /v1/compute, shared with the desktop engine (SPEC-W1 point 2).
app.include_router(router)

_engines: dict[str, Engine] = {}


@app.middleware("http")
async def local_token_guard(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """When the desktop app set a launch token, every call but /health must carry it."""
    if not request_allowed(request.url.path, request.headers.get(TOKEN_HEADER), expected_token()):
        return JSONResponse(status_code=403, content={"detail": NOT_FROM_THE_APP})
    return await call_next(request)


def get_db(settings: Annotated[Settings, Depends(get_settings)]) -> Engine:
    if settings.database_url not in _engines:
        _engines[settings.database_url] = make_engine(settings.database_url)
    return _engines[settings.database_url]


@app.get("/v1/status")
def status(
    db: Annotated[Engine, Depends(get_db)],
    clock: Annotated[Clock, Depends(get_clock)],
) -> dict[str, Any]:
    return status_body(load_all(), clock, "ok" if database_reachable(db) else "unreachable")


@lru_cache
def get_f1_pack() -> Rulepack:
    return next(p for p in load_all() if p.category == "f1")


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
    try:
        return compute_f1(case, pack, clock)
    except CaseStructureError:
        # SPEC-W2-UNKNOWN point 39, review w2-unknown finding 6: compute_f1 runs path.compute,
        # so a structure the pack does not declare is a 422, never a 500.
        raise HTTPException(status_code=422, detail=CASE_STRUCTURE) from None


@app.get("/ops/v1/status")
def ops_status(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    caller = request.client.host if request.client else ""
    if not caller_allowed(caller, settings.ops_networks):
        raise HTTPException(status_code=403, detail="This address is not on the allowlist.")
    return {"caller": caller, "allowlist": settings.ops_networks}
