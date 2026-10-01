"""R1: a failure's cause is read from its text only where a machine can tell it."""

import json
from pathlib import Path
from typing import Any

import pytest

from tools.factory import causes, efficiency, phase
from tools.factory.causes import Context, Signature, classify

REPLAY = Path(__file__).with_name("causes_replay.json")
DULY = Context(protected_branches=("main",))

# One real text per core signature; most are the audit's own lines.
EXAMPLES = {
    "remote.transient": (
        "could not push the phase branch: git@github.com: Permission denied (publickey). | "
        "fatal: Could not read from remote repository.",
        DULY,
        "infra",
    ),
    "sandbox.index_lock": (
        "the same failure twice: the done command fails: Coverage XML written to file "
        ".scratch/engine-coverage.xml | fatal: Unable to create "
        "'/r/.git/worktrees/l-tests-d29085b29f/index.lock': Operation not permitted",
        DULY,
        "plan",
    ),
    "sandbox.mkdtemp": (
        "3 attempts, none accepted: the done command fails: All checks passed! | mktemp: "
        "mkdtemp failed on /var/folders/wr/T/tmp.v55zMEZstn: Operation not permitted",
        DULY,
        "plan",
    ),
    "sandbox.violations": (
        "curl: (56) CONNECT tunnel failed, response 403\n<sandbox_violations>\n"
        "deny network-outbound example.com:443 (host is not on the allow list)\n"
        "</sandbox_violations>",
        DULY,
        "plan",
    ),
    "sandbox.not_permitted": (
        "PermissionError: [Errno 1] Operation not permitted: '/Users/x/.cache/uv'",
        DULY,
        "plan",
    ),
    "budget.used_up": ("failed: the budget for this task is used up", DULY, "factory"),
    "tamper.unprotected_ref": (
        "failed: protected parts of the repository changed during the run: refs/heads/factory-v2",
        DULY,
        "factory",
    ),
    "gate.generated_file": (
        "check offline gates fails: desktop/coverage/lcov-report/prettify.js:23: "
        'phrase:sealed: "as" | copy lint: 1 problem(s) | make: *** [gate-1] Error 1',
        DULY,
        "factory",
    ),
    "ci.red_local_green": (
        "clean CI did not pass for round api-and-screen: gates fail 2m57s",
        Context(protected_branches=("main",), local_gates_green=True),
        "factory",
    ),
}


def test_every_core_signature_has_an_example() -> None:
    assert {s.id for s in causes.core()} == set(EXAMPLES)


@pytest.mark.parametrize("signature_id", sorted(EXAMPLES))
def test_each_signature_names_its_cause(signature_id: str) -> None:
    text, context, cause = EXAMPLES[signature_id]
    assert classify(text, context) == (cause, signature_id)


@pytest.mark.parametrize("sign", phase.TRANSIENT)
def test_every_remote_error_phase_retries_is_infra(sign: str) -> None:
    assert classify(f"could not open the pull request: {sign}") == ("infra", "remote.transient")


def test_flake_and_interrupted_are_causes_callers_set() -> None:
    assert efficiency.CAUSES is causes.CAUSES
    assert {"flake", "interrupted"} <= set(causes.CAUSES)
    for cause in causes.CALLER_CAUSES:
        with pytest.raises(ValueError, match="no signature gives"):
            Signature("x", "anything", cause)
    with pytest.raises(ValueError, match="no signature gives"):
        Signature("x", "anything", "unknown")


@pytest.mark.parametrize(
    "text",
    [
        "failed: protected parts of the repository changed during the run: refs/heads/main",
        "tamper: L-web: protected state changed: ['refs/heads/factory-v2', 'refs/heads/main']",
        "failed: protected parts of the repository changed during the run: refs/tags/v1",
        "failed: protected parts of the repository changed during the run: config",
        "failed: protected parts of the repository changed during the run: "
        "refs/heads/a, refs/heads/b, refs/heads/c, refs/heads/d",
    ],
)
def test_tamper_is_factory_only_when_no_protected_ref_moved(text: str) -> None:
    assert classify(text, DULY) == ("unknown", None)


def test_tamper_proves_nothing_without_the_protected_branches() -> None:
    text = "tamper: L-web: protected state changed: ['refs/heads/factory-v2']"
    assert classify(text) == ("unknown", None)
    assert classify(text, DULY) == ("factory", "tamper.unprotected_ref")


def test_ci_red_is_factory_only_when_the_local_gates_passed() -> None:
    assert classify("clean CI did not pass for round r: gates fail", DULY) == ("unknown", None)


def test_a_coverage_floor_or_an_installed_package_is_not_a_generated_file() -> None:
    assert classify("Failure. Coverage is below 80%. | make: *** [gate-6] Error 1") == (
        "unknown",
        None,
    )
    trace = "  File .venv/lib/python3.12/site-packages/coverage/control.py:120: in start"
    assert classify(trace) == ("unknown", None)


def test_signatures_that_disagree_give_unknown() -> None:
    text = "Operation not permitted | the budget for this task is used up"
    assert classify(text) == ("unknown", None)


def test_a_project_adds_its_own_signatures() -> None:
    own = Signature("stack.port_taken", r"address already in use", "plan")
    text = "OSError: [Errno 48] address already in use"
    assert classify(text) == ("unknown", None)
    assert classify(text, extra=[own]) == ("plan", "stack.port_taken")
    with pytest.raises(ValueError, match="unknown need"):
        Signature("x", "y", "plan", needs="moon")


def _replay() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = json.loads(REPLAY.read_text())["rows"]
    return rows


def test_replay_of_the_audit_gives_the_founders_cause_or_unknown() -> None:
    """Every stop, failure and escalation message of 2026-09-29 and 30 (audit-reliability
    section 2) against the cause the founder gave it: never a wrong cause."""
    rows = _replay()
    assert len(rows) > 150
    wrong = []
    named: dict[str, int] = {}
    for row in rows:
        context = Context(("main",), bool(row.get("local_gates_green")))
        cause, signature = classify(row["text"], context)
        if cause != "unknown":
            named[str(signature)] = named.get(str(signature), 0) + 1
        if cause not in (row["cause"], "unknown"):
            wrong.append((row["at"], row["cause"], cause, signature, row["text"][:120]))
    assert wrong == []
    # The marks the audit says a machine could have read are read.
    assert set(named) == {
        "remote.transient",
        "sandbox.index_lock",
        "sandbox.mkdtemp",
        "budget.used_up",
        "tamper.unprotected_ref",
        "gate.generated_file",
        "ci.red_local_green",
    }
