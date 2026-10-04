"""The updates pipeline: late is acceptable, wrong is not.

Phase 0 holds the stage order. The publish rule lives in engine.updates
(DECISIONS.md D95 (2)) and is re-exported here. Sources and models are
wired in Phase 6.
"""

import itertools
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from engine.updates import publish_blockers

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


__all__ = ["STAGES", "UpdateState", "build_graph", "publish_blockers"]


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
