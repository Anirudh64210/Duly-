"""The updates pipeline: late is acceptable, wrong is not.

Phase 0 holds the stage order and the publish rule. Sources and models are
wired in Phase 6.
"""

import itertools
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

STAGES: tuple[str, ...] = (
    "detect",
    "snapshot",
    "extract_claims",
    "verify_quotes",
    "independent_check",
    "refute",
    "assign_legal_status",
    "tag_categories",
    "founder_approval",
    "publish",
    "watch",
)


class UpdateState(TypedDict, total=False):
    update: dict[str, Any]
    visited: list[str]
    held_at: str
    held_because: tuple[str, ...]


def publish_blockers(update: dict[str, Any]) -> tuple[str, ...]:
    """Every reason this update may not be shown to a user. Empty means it may."""
    reasons: list[str] = []
    claims = update.get("claims") or []
    if not claims:
        reasons.append("no_claims")
    for i, claim in enumerate(claims):
        if claim.get("source_kind") != "primary":
            reasons.append(f"claim_{i}_not_primary_source")
        if not claim.get("quote_found"):
            reasons.append(f"claim_{i}_quote_not_found_in_source")
        if not claim.get("snapshot_sha256"):
            reasons.append(f"claim_{i}_no_snapshot")
    checks = update.get("checks") or {}
    if not checks.get("independent_check_passed"):
        reasons.append("independent_check_not_passed")
    if not checks.get("refutation_survived"):
        reasons.append("refutation_not_survived")
    if not update.get("legal_status"):
        reasons.append("no_legal_status")
    if not update.get("status_as_of"):
        reasons.append("no_status_date")
    approval = update.get("approval") or {}
    if not (approval.get("approved") and approval.get("approved_by")):
        reasons.append("not_approved_in_ops")
    return tuple(reasons)


def _stage(name: str) -> Any:
    def run(state: UpdateState) -> UpdateState:
        return {"visited": [*state.get("visited", []), name]}

    return run


def _gate(state: UpdateState) -> UpdateState:
    blockers = publish_blockers(state.get("update", {}))
    visited = [*state.get("visited", []), "founder_approval"]
    if blockers:
        return {"visited": visited, "held_at": "founder_approval", "held_because": blockers}
    return {"visited": visited}


def _after_gate(state: UpdateState) -> str:
    return "hold" if state.get("held_at") else "publish"


def build_graph() -> Any:
    graph = StateGraph(UpdateState)
    for name in STAGES:
        graph.add_node(name, _gate if name == "founder_approval" else _stage(name))
    graph.add_edge(START, STAGES[0])
    for a, b in itertools.pairwise(STAGES):
        if a == "founder_approval":
            graph.add_conditional_edges(a, _after_gate, {"publish": b, "hold": END})
        else:
            graph.add_edge(a, b)
    graph.add_edge(STAGES[-1], END)
    return graph.compile()
