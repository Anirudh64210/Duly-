"""The factory's record of what happened. Append only, and each line seals the one before.

Every line holds the hash of the line before it and its own hash. Changing or removing
any earlier line breaks every hash after it, which `verify` reports.
"""

import fcntl
import hashlib
import json
from pathlib import Path
from typing import Any

from engine.clocks import SystemClock
from tools.factory.paths import state_dir
from tools.factory.redact import redact

KINDS = (
    "start",
    "step",
    "test",
    "blocked",
    "lesson",
    "done",
    "failed",
    "alert",
    "control",
    "merge",
    "cost",
)
GENESIS = "0" * 64


def ledger_path(cwd: Path | None = None) -> Path:
    return state_dir(cwd) / "events.jsonl"


def _seal(row: dict[str, Any]) -> str:
    body = json.dumps({k: v for k, v in row.items() if k != "hash"}, sort_keys=True)
    return hashlib.sha256(body.encode()).hexdigest()


def _last_hash(path: Path) -> str:
    if not path.exists() or path.stat().st_size == 0:
        return GENESIS
    with path.open("rb") as handle:
        handle.seek(max(0, path.stat().st_size - 8192))
        lines = handle.read().decode("utf-8", errors="replace").strip().splitlines()
    try:
        return str(json.loads(lines[-1]).get("hash") or GENESIS)
    except (json.JSONDecodeError, IndexError):
        return GENESIS


def append(
    lane: str,
    agent: str,
    kind: str,
    message: str,
    cwd: Path | None = None,
    run_id: str = "",
    **extra: Any,
) -> dict[str, Any]:
    if kind not in KINDS:
        raise ValueError(f"unknown kind {kind}")
    path = ledger_path(cwd)
    with (path.parent / "events.lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        row: dict[str, Any] = {
            "at": SystemClock().now().isoformat(timespec="seconds"),
            "run_id": run_id,
            "lane": lane,
            "agent": agent,
            "kind": kind,
            "message": redact(message.strip())[:500],
            **extra,
            "prev": _last_hash(path),
        }
        row["hash"] = _seal(row)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(row) + "\n")
    return row


def read(cwd: Path | None = None) -> list[dict[str, Any]]:
    path = ledger_path(cwd)
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            rows.append({"broken": line})
    return rows


def verify(cwd: Path | None = None) -> list[str]:
    """Every problem found in the chain. Empty means nothing was changed or removed."""
    problems: list[str] = []
    prev = None
    for number, row in enumerate(read(cwd), start=1):
        if "broken" in row:
            problems.append(f"line {number}: not readable")
            prev = None
            continue
        if "hash" not in row:
            # Lines written before the ledger was sealed. Allowed only at the start.
            if prev is not None:
                problems.append(f"line {number}: unsealed line after sealed lines")
            continue
        if row["hash"] != _seal(row):
            problems.append(f"line {number}: contents do not match their seal")
        expected = GENESIS if prev is None else prev
        if prev is not None and row.get("prev") != expected:
            problems.append(f"line {number}: does not follow the line before it")
        prev = row["hash"]
    return problems
