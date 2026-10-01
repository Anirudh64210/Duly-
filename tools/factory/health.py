"""A smoke task each agent must pass before it may join a run.

The task checks the walls, not the agent's skill: it must be able to write where its lane
allows and must fail to write where it does not. A pass is remembered for the exact walls
it was earned inside: the agent's tools, write right and network, the lane's own contract,
the sandbox code, the tools, flags and settings every run starts with, and the probe's
model. It is asked for again only when one of those changes, so a change to one lane
re-runs that lane alone. Because no skill is tested, the probe runs on its own smaller
model, with a short prompt and no memory.

A probe, like a tamper check or a check after a merge, is tried once more when it fails (see
retry_once). A pass on that second try is recorded as a flake with its signature, and the
second flake of one signature is a defect in the factory, which raises an alert.
"""

import hashlib
import json
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any

from engine.clocks import Clock
from tools.factory import alerts, causes, ledger
from tools.factory.config import Contract, load_config
from tools.factory.paths import REPO_ROOT, state_dir

if TYPE_CHECKING:
    from tools.factory.agent_run import Outcome

# The code that builds or enforces the walls. The runner and the role prose are left out.
SANDBOX_CODE = (
    "tools/factory/sandbox.py",
    ".claude/hooks/guard_paths.py",
    ".claude/hooks/guard_bash.py",
)
PROMPT = """This is a health check of the walls around lane {lane}. It tests the sandbox, not
skill. Do only the two steps below, with as few commands as you can, and read no files.

1. {mission}
2. Write {home}/REPORT.json holding this, with the summary saying in one sentence what
   happened when you tried the second write:

{report}

Then stop."""


def model(root: Path = REPO_ROOT) -> str:
    """The model a health probe runs on. Every other run stays on the pinned model."""
    pinned = load_config(root)["model"]
    return str(pinned.get("health_probe") or pinned["pinned"])


def prompt(mission: str, lane: str, home: str, run_id: str) -> str:
    report = {
        "run_id": run_id,
        "status": "done",
        "summary": "",
        "commands_run": [],
        "files_changed": [],
        "lessons": [],
        "disputes": [],
        "requests": [],
    }
    return PROMPT.format(lane=lane, mission=mission, home=home, report=json.dumps(report))


def fingerprint(contract: Contract, lane: str, root: Path = REPO_ROOT) -> str:
    from tools.factory.agent_run import FLAGS, SETTINGS, TOOLS  # it imports this module

    walls = [contract.name, contract.tools, contract.may_write, contract.network]
    parts = [
        json.dumps([*walls, contract.health_task, model(root), TOOLS, FLAGS, SETTINGS]).encode(),
        (root / ".claude" / "lanes" / f"{lane}.yaml").read_bytes(),
        *((root / code).read_bytes() for code in SANDBOX_CODE),
    ]
    return hashlib.sha256(b"\0".join(parts)).hexdigest()[:20]


def _file(cwd: Path | None) -> Path:
    return state_dir(cwd) / "health.json"


def records(cwd: Path | None = None) -> dict[str, Any]:
    path = _file(cwd)
    try:
        data: dict[str, Any] = json.loads(path.read_text()) if path.exists() else {}
    except json.JSONDecodeError:
        return {}
    return data


def passed(contract: Contract, lane: str, root: Path, cwd: Path | None = None) -> bool:
    record = records(cwd).get(f"{contract.name}:{lane}")
    return bool(record and record["fingerprint"] == fingerprint(contract, lane, root))


def remember(
    contract: Contract, lane: str, run_id: str, clock: Clock, root: Path, cwd: Path | None = None
) -> None:
    data = records(cwd)
    data[f"{contract.name}:{lane}"] = {
        "fingerprint": fingerprint(contract, lane, root),
        "run_id": run_id,
        "at": clock.now().isoformat(timespec="seconds"),
    }
    _file(cwd).write_text(json.dumps(data, indent=2))


@dataclass(frozen=True)
class Tried:
    """What a check retried once came to. cause and signature describe the first failure."""

    ok: bool
    text: str
    cause: str = ""
    signature: str = ""
    flaked: bool = False


def retry_once(
    check: Callable[[], tuple[bool, str]],
    name: str,
    repo: Path,
    lane: str = "founder",
    run_id: str = "",
) -> Tried:
    """Run a check, and once more when it fails, unless its failure text proves a cause that
    a second try cannot change (a sandbox denial, a used up budget, a factory fault).

    name says what was checked, such as health.auditor.l-audit or check.gates, and is the
    signature of a failure whose text no signature recognises. A pass on the second try is
    logged as a flake; the second flake of one signature raises an alert, since a flake that
    repeats is a defect (the auditor probe passed on a retry by chance, over a real bug).
    """
    ok, text = check()
    if ok:
        return Tried(True, text)
    cause, known = causes.classify(text)
    signature = known or name
    if cause not in {"unknown", "infra"}:
        return Tried(False, text, cause, signature)
    ok, later = check()
    if not ok:
        return Tried(False, later, cause, signature)
    flake(repo, signature, name, text, lane, run_id)
    return Tried(True, later, "flake", signature, flaked=True)


def flake(repo: Path, signature: str, name: str, text: str, lane: str, run_id: str) -> int:
    """Record a pass on retry, and raise the alert when it is the second of its signature.
    Returns how many flakes of that signature the ledger holds."""
    first = " ".join(text.split())[:200] or "no output"
    ledger.append(
        lane,
        "orchestrator",
        "step",
        f"flake: {name} failed, then passed on the retry. The failure was: {first}",
        repo,
        run_id=run_id,
        cause="flake",
        cause_source="auto",
        signature=signature,
    )
    seen = sum(
        1
        for row in ledger.read(repo)
        if row.get("cause") == "flake" and row.get("signature") == signature
    )
    if seen == 2:
        alerts.notify(
            "factory",
            f"factory defect: {signature} failed and then passed twice; a second flake of one "
            f"signature is a fault in the factory, not chance. Last failure: {first}",
            lane,
            run_id,
            repo,
        )
    return seen


def probe(
    contract: Contract, lane: str, home: str, branch: str, clock: Clock, repo: Path
) -> "Outcome":
    """Run a lane's health probe, and once more if it fails. Doctor and golden take this one
    path, so a probe that passes only on a retry is recorded the same way wherever it runs."""
    from tools.factory import agent_run, worktree  # agent_run imports this module

    forbidden = contract.health_task.split("try to ")[1].split(" and report")[0]
    target = forbidden.split()[-1]
    verify = f"test -f {home}/HEALTH.txt"
    if not target.startswith("http"):
        verify += f" && ! test -e {target}"
    outcomes: list[agent_run.Outcome] = []

    def once() -> tuple[bool, str]:
        task = agent_run.Task(
            lane,
            contract.name,
            f"health/{contract.name}/{lane}",
            "CLAUDE.md",
            contract.health_task.replace("your lane's home folder", home),
            verify,
            branch,
        )
        out = agent_run.run(task, clock, repo)
        if out.worktree:
            tree = worktree.Tree(out.run_id, Path(out.worktree), out.branch, out.base_commit)
            worktree.remove(tree, True, repo)
        outcomes.append(out)
        return out.status == "done", f"{out.status}: {out.reason}"

    retry_once(once, f"health.{contract.name}.{lane}", repo, lane)
    return outcomes[-1]
