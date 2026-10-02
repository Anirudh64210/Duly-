"""make ci runs exactly the gate steps of .github/workflows/ci.yml, in its order.

A step CI runs that make ci leaves out is how a push goes red after a green local run (the
hidden tests, 2026-10-01). Fails if the two lists differ.
"""

import re
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[3]


def ci_steps() -> list[str]:
    workflow = yaml.safe_load((REPO_ROOT / ".github/workflows/ci.yml").read_text())
    steps = workflow["jobs"]["gates"]["steps"]
    runs = [
        step["run"].strip()
        for step in steps
        if str(step.get("name", "")).startswith(("Gate", "Hidden"))
    ]
    return [run.replace('BASE="$BASE"', "BASE=main") for run in runs]


def make_ci_steps() -> list[str]:
    text = (REPO_ROOT / "Makefile").read_text()
    recipe = re.search(r"^ci:\n((?:\t.*\n)+)", text, re.MULTILINE)
    assert recipe is not None, "no ci target in the Makefile"
    lines = [line.strip() for line in recipe.group(1).splitlines()]
    steps = [
        line.replace("$(MAKE) --no-print-directory ", "make ")
        for line in lines
        if not line.startswith("@")
    ]
    return steps


def test_make_ci_runs_the_gate_steps_of_the_workflow_in_order() -> None:
    assert make_ci_steps() == ci_steps()


def test_the_workflow_still_has_the_hidden_tests_and_every_gate() -> None:
    names = " ".join(ci_steps())
    for gate in (
        "gate-1",
        "gate-2",
        "gate-3",
        "gate-4",
        "gate-5",
        "gate-6",
        "gate-7",
        "tests/holdout",
    ):
        assert gate in names, gate
