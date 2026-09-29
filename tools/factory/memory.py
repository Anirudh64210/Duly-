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
from tools.factory.paths import main_repo, state_dir
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


def accepted(lane: str, root: Path) -> list[str]:
    """Lessons the founder accepted, for this lane and for every lane."""
    out: list[str] = []
    for name in (f"{lane}.md", "all-lanes.md"):
        path = root / ".claude" / "LESSONS" / name
        if not path.exists():
            continue
        wrong = ""
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.startswith("- What went wrong: "):
                wrong = line.removeprefix("- What went wrong: ")
            elif line.startswith("- What fixes it: ") and wrong:
                fix = line.removeprefix("- What fixes it: ")
                out.append(f"- What went wrong: {wrong}\n  What fixed it: {fix}")
                wrong = ""
    return out


def for_prompt(lane: str, max_items: int, max_chars: int, cwd: Path | None = None) -> str:
    """The newest failures, this lane's first, inside the caps."""
    rows = read(cwd)
    ordered = [r for r in reversed(rows) if r["lane"] == lane]
    ordered += [r for r in reversed(rows) if r["lane"] != lane]
    out: list[str] = []
    used = 0
    for text in accepted(lane, main_repo(cwd))[:max_items]:
        if used + len(text) > max_chars:
            break
        out.append(text)
        used += len(text)
    for row in ordered[: max(0, max_items - len(out))]:
        text = f"- What went wrong: {row['failure']}\n  What fixed it: {row['fix']}"
        if used + len(text) > max_chars:
            break
        out.append(text)
        used += len(text)
    return "\n".join(out)


def propose(lane: str, run_id: str, lessons: list[dict[str, str]], cwd: Path | None = None) -> int:
    """File an agent's lessons in the founder's inbox. They are not handed to any agent."""
    if not lessons:
        return 0
    folder = main_repo(cwd) / ".claude" / "LESSONS" / "proposals"
    folder.mkdir(parents=True, exist_ok=True)
    stamp = SystemClock().now().strftime("%Y-%m-%d")
    written = 0
    for n, lesson in enumerate(lessons, start=1):
        mark = fingerprint(lesson.get("failure", ""))
        if any(mark in p.name for p in folder.glob("*.md")):
            continue
        body = (
            f"date: {stamp}\nlane: {lane}\ncommit: run {run_id}\n"
            f"failure: {redact(lesson.get('failure', ''))[:600]}\n"
            f"fix: {redact(lesson.get('fix', ''))[:400]}\n"
            f"evidence: {redact(lesson.get('evidence', ''))[:300]}\n"
            "verification_task: \n"
        )
        (folder / f"{stamp}-{lane.lower()}-{mark}-{n}.md").write_text(body)
        written += 1
    return written
