"""Append one line to the factory event log. Every agent calls this as it works.

Usage: uv run python -m tools.factory.log --lane L-engine --agent builder --kind step "what I did"
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

from engine.clocks import SystemClock

KINDS = ("start", "step", "test", "blocked", "lesson", "done", "failed")


def factory_dir(cwd: Path | None = None) -> Path:
    """One shared folder for every worktree: next to the main repo's .git."""
    done = subprocess.run(
        ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
        cwd=cwd,
        check=False,
        capture_output=True,
        text=True,
    )
    base = Path(done.stdout.strip()).parent if done.returncode == 0 else Path.cwd()
    out = base / ".factory"
    out.mkdir(exist_ok=True)
    return out


def append(lane: str, agent: str, kind: str, message: str, cwd: Path | None = None) -> None:
    row = {
        "at": SystemClock().now().isoformat(timespec="seconds"),
        "lane": lane,
        "agent": agent,
        "kind": kind,
        "message": message.strip()[:500],
    }
    with (factory_dir(cwd) / "events.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(row) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lane", required=True)
    parser.add_argument("--agent", required=True)
    parser.add_argument("--kind", choices=KINDS, default="step")
    parser.add_argument("message")
    args = parser.parse_args()
    append(args.lane, args.agent, args.kind, args.message)
    return 0


if __name__ == "__main__":
    sys.exit(main())
