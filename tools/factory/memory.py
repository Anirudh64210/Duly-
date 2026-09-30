"""What earlier runs got wrong, handed to the next agent as examples of what not to do.

Only the orchestrator writes here, from the output of the checks it ran itself. What an
agent says about its own run is not kept, and a health probe keeps nothing. A row is
dropped once the same task later passes. Capped in size and with repeats removed, so it
cannot grow without limit. It is given to the agent as data about the past, never as
instructions. Prose lessons under .claude/LESSONS/ are not handed to agents.
"""

import hashlib
import json
import re
import sys
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
    lane: str,
    failure: str,
    fix: str,
    evidence: str,
    source: str,
    cwd: Path | None = None,
    task: str = "",
) -> bool:
    """Add a failure the orchestrator saw. Returns False when it is not kept.

    It is not kept when it comes from anyone but the orchestrator, from a health probe, or
    when the same failure is already held.
    """
    if source != "orchestrator" or task.startswith("health/"):
        return False
    mark = fingerprint(failure)
    path = _file(cwd)
    for row in read(cwd):
        if row["fingerprint"] == mark:
            return False
    row = {
        "at": SystemClock().now().isoformat(timespec="seconds"),
        "lane": lane,
        "task": task,
        "fingerprint": mark,
        "failure": redact(failure.strip())[:600],
        "fix": redact(fix.strip())[:400],
        "evidence": redact(evidence.strip())[:300],
        "source": source,
    }
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(row) + "\n")
    return True


def passed(task: str, cwd: Path | None = None) -> int:
    """The task has since passed, so its failures are no longer news. Returns how many went."""
    rows = read(cwd)
    keep = [row for row in rows if not task or row.get("task") != task]
    if len(keep) < len(rows):
        _file(cwd).write_text("".join(json.dumps(row) + "\n" for row in keep), encoding="utf-8")
    return len(rows) - len(keep)


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


def archive_agent_rows(path: Path) -> int:
    """Move the rows agents wrote about their own runs to failures-archive.jsonl beside it.

    Kept from before only the orchestrator wrote here. Returns how many moved.
    """
    if not path.exists():
        return 0
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    keep: list[str] = []
    moved: list[str] = []
    for line in lines:
        try:
            ours = json.loads(line).get("source") == "orchestrator"
        except (json.JSONDecodeError, AttributeError):
            ours = False
        (keep if ours else moved).append(line + "\n")
    if moved:
        with (path.parent / "failures-archive.jsonl").open("a", encoding="utf-8") as handle:
            handle.write("".join(moved))
        path.write_text("".join(keep), encoding="utf-8")
    return len(moved)


def for_prompt(lane: str, max_items: int, max_chars: int, cwd: Path | None = None) -> str:
    """The newest orchestrator rows for this lane and for all lanes, within the caps."""
    ordered = [
        r
        for r in reversed(read(cwd))
        if r.get("lane") in (lane, "all-lanes") and r.get("source") == "orchestrator"
    ]
    out: list[str] = []
    used = 0
    for row in ordered[:max_items]:
        text = f"- What went wrong: {row['failure']}\n  What fixed it: {row['fix']}"
        if used + len(text) > max_chars:
            break
        out.append(text)
        used += len(text)
    return "\n".join(out)


if __name__ == "__main__":
    if sys.argv[1:] != ["--archive-agent-rows"]:
        raise SystemExit("usage: python -m tools.factory.memory --archive-agent-rows")
    print(f"moved {archive_agent_rows(_file(None))} agent rows to failures-archive.jsonl")
