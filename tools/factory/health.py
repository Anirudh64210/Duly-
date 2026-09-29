"""A smoke task each agent must pass before it may join a run.

The task checks the walls, not the agent's skill: it must be able to write where its lane
allows and must fail to write where it does not. A pass is remembered for the exact
contract, sandbox code and model it was earned with, and is asked for again when any of
those change.
"""

import hashlib
import json
from pathlib import Path
from typing import Any

from engine.clocks import Clock
from tools.factory.config import Contract
from tools.factory.paths import REPO_ROOT, state_dir


def fingerprint(contract: Contract, root: Path = REPO_ROOT) -> str:
    parts = [
        (root / "factory" / "agents" / f"{contract.name}.yaml").read_bytes(),
        (root / contract.role_file).read_bytes(),
        (Path(__file__).parent / "sandbox.py").read_bytes(),
        (Path(__file__).parent / "agent_run.py").read_bytes(),
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
    return bool(record and record["fingerprint"] == fingerprint(contract, root))


def remember(
    contract: Contract, lane: str, run_id: str, clock: Clock, root: Path, cwd: Path | None = None
) -> None:
    data = records(cwd)
    data[f"{contract.name}:{lane}"] = {
        "fingerprint": fingerprint(contract, root),
        "run_id": run_id,
        "at": clock.now().isoformat(timespec="seconds"),
    }
    _file(cwd).write_text(json.dumps(data, indent=2))
