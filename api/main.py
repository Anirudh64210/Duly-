import json
from functools import lru_cache
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Request
from sqlalchemy.engine import Engine

from api.case_f1 import NOT_JSON, first_problem
from api.db import database_reachable, make_engine
from api.ops_guard import caller_allowed
from api.settings import Settings, get_settings
from engine.clocks import Clock, SystemClock
from engine.f1 import compute_f1, parse_case
from engine.rulepack import Rulepack, load_all
from engine.verdict import VerdictInputs, decide

API_VERSION = "0.0.0"
CONTRACTS_VERSION = "0.0.0"

app = FastAPI(title="Duly API", version=API_VERSION, docs_url=None, redoc_url=None)

_engines: dict[str, Engine] = {}


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


@app.get("/v1/status")
def status(
    db: Annotated[Engine, Depends(get_db)],
    clock: Annotated[Clock, Depends(get_clock)],
) -> dict[str, Any]:
    packs = load_all()
    empty_case = VerdictInputs(
        documents_count=0,
        missing_inputs=(),
        conflicting_inputs=(),
        rules_checked_on=None,
        depends_on_litigated_rule=False,
        judgement_items=(),
        open_items=(),
    )
    verdict = decide(empty_case, clock)
    return {
        "database": "ok" if database_reachable(db) else "unreachable",
        "rulepacks": [
            {"category": p.category, "version": p.version, "parameters": len(p.parameters)}
            for p in packs
        ],
        "verdict": {"state": verdict.state.value, "reasons": list(verdict.reasons)},
        "checked_at": clock.now().isoformat(),
    }


@lru_cache
def get_f1_pack() -> Rulepack:
    return next(p for p in load_all() if p.category == "f1")


@app.post("/v1/compute/f1")
async def compute_f1_case(
    request: Request,
    pack: Annotated[Rulepack, Depends(get_f1_pack)],
    clock: Annotated[Clock, Depends(get_clock)],
) -> dict[str, Any]:
    """Stateless. The body is read here, checked, computed, and dropped."""
    try:
        raw = json.loads(await request.body())
    except (ValueError, RecursionError):
        raise HTTPException(status_code=422, detail=NOT_JSON) from None
    problem = first_problem(raw)
    if problem is not None:
        raise HTTPException(status_code=422, detail=problem)
    return compute_f1(parse_case(raw), pack, clock)


@app.get("/ops/v1/status")
def ops_status(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    caller = request.client.host if request.client else ""
    if not caller_allowed(caller, settings.ops_networks):
        raise HTTPException(status_code=403, detail="This address is not on the allowlist.")
    return {"caller": caller, "allowlist": settings.ops_networks}
