"""A smoke task each agent must pass before it may join a run.

The task checks the walls, not the agent's skill: it must be able to write where its lane
allows and must fail to write where it does not. A pass is remembered for the exact walls
it was earned inside: the agent's tools, write right and network, the lane's own contract,
the sandbox code, the tools, flags and settings every run starts with, and the probe's
model. It is asked for again only when one of those changes, so a change to one lane
re-runs that lane alone. Because no skill is tested, the probe runs on its own smaller
model, with a short prompt and no memory.
"""

import hashlib
import json
from pathlib import Path
from typing import Any

from engine.clocks import Clock
from tools.factory.config import Contract, load_config
from tools.factory.paths import REPO_ROOT, state_dir

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
