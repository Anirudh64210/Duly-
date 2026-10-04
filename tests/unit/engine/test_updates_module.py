"""engine/updates.py: publish_blockers, standard library only, where both apps can load it.

DECISIONS.md D95 (2): "publish_blockers moves now to engine/updates.py, standard library only,
and GET /v1/updates returns a file only if it follows update.schema.json and has no blockers".
reviews/w2-p3.md finding 7: api/case.py imports pipeline.graph, which imports langgraph, which
the desktop group forbids (SPEC-W1 point 13), so the packaged engine could not check a
published update. CLAUDE.md: "A law update is shown to a user only when publish_blockers
returns nothing."

The rule itself does not change in the move: engine.updates.publish_blockers gives the same
reasons, in the same order, as pipeline.graph.publish_blockers on every case of
tests/unit/pipeline/test_graph.py.

Written before engine/updates.py exists: these cannot pass yet.
"""

import importlib
import json
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any, cast

import pytest

from pipeline.graph import publish_blockers as graph_blockers
from tests.unit.pipeline import test_graph

REPO_ROOT = Path(__file__).resolve().parents[3]


def _graph_cases() -> list[tuple[str, dict[str, Any]]]:
    """Every update test_graph.py checks: GOOD, each one-field change of its parametrized
    table, and the empty update. Read from the module, so a case added there is added here."""
    (table,) = [
        m.args[1]
        for m in test_graph.test_each_missing_check_blocks_publishing.pytestmark
        if m.name == "parametrize"
    ]
    # test_graph.py is untyped; its changed() returns a deep copy of GOOD with one value set.
    change = cast(Callable[[Any, Any], dict[str, Any]], test_graph.changed)
    changed = [
        (f"{'.'.join(map(str, path))}={value!r}", change(path, value)) for path, value, _ in table
    ]
    return [("GOOD", test_graph.GOOD), *changed, ("empty", {})]


CASES = _graph_cases()


def test_review_w2p3_7_the_cases_are_read_from_test_graph() -> None:
    # Guards the test below from running on nothing: GOOD, the ten changes of the table
    # (hand count of test_graph.py: claims, source_kind, quote_found, snapshot_sha256, the two
    # checks, legal_status, status_as_of, approved, approved_by) and the empty update: 12.
    assert len(CASES) == 12
    assert graph_blockers(test_graph.GOOD) == ()


@pytest.mark.parametrize(("name", "update"), CASES, ids=[name for name, _ in CASES])
def test_review_w2p3_7_engine_updates_gives_the_same_blockers_as_pipeline_graph(
    name: str, update: dict[str, Any]
) -> None:
    # D95 (2): the same rule, moved. Fails if engine/updates.py is missing, drops or renames
    # a reason, or orders them differently.
    publish_blockers = importlib.import_module("engine.updates").publish_blockers
    assert publish_blockers(update) == graph_blockers(update), name


# A fresh interpreter, isolated (-I: no PYTHONPATH, no working folder on sys.path), with only
# the repository added. It reports every top-level module importing engine.updates loaded.
_LOADED_BY_THE_IMPORT = """
import json, sys
sys.path.insert(0, sys.argv[1])
before = set(sys.modules)
import engine.updates
print(json.dumps(sorted({m.split(".")[0] for m in set(sys.modules) - before})))
"""


def test_review_w2p3_7_importing_engine_updates_loads_only_the_standard_library_and_engine() -> (
    None
):
    # D95 (2): "standard library only", so the desktop engine, which has no langgraph, can
    # load it. Fails if engine/updates.py, or a module of engine/ it imports, loads langgraph,
    # pipeline, jsonschema, yaml or any other module outside the standard library.
    res = subprocess.run(
        [sys.executable, "-I", "-B", "-c", _LOADED_BY_THE_IMPORT, str(REPO_ROOT)],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    assert res.returncode == 0, res.stderr[-2000:]
    loaded = json.loads(res.stdout)
    assert "engine" in loaded
    # _sysconfigdata_* is the standard library's own build data, which sysconfig loads; it
    # is generated per platform, so sys.stdlib_module_names does not list it.
    outside = [
        m
        for m in loaded
        if m != "engine"
        and m not in sys.stdlib_module_names
        and not m.startswith("_sysconfigdata_")
    ]
    assert outside == []
