"""What earlier runs got wrong, handed to the next agent as examples of what not to do.

Capped in size and with repeats removed, so it cannot grow without limit. It is given to
the agent as data about the past, never as instructions.
"""

import hashlib
import json
import re
from pathlib import Path
from typing import Any

from engine.clocks import SystemClock
from tools.factory.paths import state_dir
from tools.factory.redact import redact


def _file(cwd: Path | None) -> Path:
    return state_dir(cwd) / "failures.jsonl"


def fingerprint(failure: str) -> str:
    words = re.sub(r"[^a-z ]+", " ", failure.lower()).split()
    return hashlib.sha256(" ".join(words[:40]).encode()).hexdigest()[:16]


def record(
    lane: str, failure: str, fix: str, evidence: str, source: str, cwd: Path | None = None
) -> bool:
    """Add a failure. Returns False when the same failure is already held."""
    mark = fingerprint(failure)
    path = _file(cwd)
    for row in read(cwd):
        if row["fingerprint"] == mark:
            return False
    row = {
        "at": SystemClock().now().isoformat(timespec="seconds"),
        "lane": lane,
        "fingerprint": mark,
        "failure": redact(failure.strip())[:600],
        "fix": redact(fix.strip())[:400],
        "evidence": redact(evidence.strip())[:300],
        "source": source,
    }
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(row) + "\n")
    return True


def read(cwd: Path | None = None) -> list[dict[str, Any]]:
    path = _file(cwd)
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def for_prompt(lane: str, max_items: int, max_chars: int, cwd: Path | None = None) -> str:
    """The newest failures, this lane's first, inside the caps."""
    rows = read(cwd)
    ordered = [r for r in reversed(rows) if r["lane"] == lane]
    ordered += [r for r in reversed(rows) if r["lane"] != lane]
    out: list[str] = []
    used = 0
    for row in ordered[:max_items]:
        text = f"- What went wrong: {row['failure']}\n  What fixed it: {row['fix']}"
        if used + len(text) > max_chars:
            break
        out.append(text)
        used += len(text)
    return "\n".join(out)
