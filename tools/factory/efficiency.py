"""How the factory spent its time, from its own record (.factory/events.jsonl).

Correctness was measured and time was not, and one feature took fifteen hours before anyone
saw where they went. This reads the ledger for a window and reports: wall time, agent time by
lane, CI waits, stops and the time from each stop to the next start (the founder lane's
diagnosis and fixes), and reviews with their vetoes. It goes in every status report.

Usage: python -m tools.factory.efficiency [--since 2026-09-29T12:00] [--until ...]
"""

import argparse
import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from tools.factory.paths import REPO_ROOT, state_dir

SKIP_RUNS = ("orchestrator", "health", "golden", "doctor")


@dataclass
class Report:
    start: datetime | None = None
    end: datetime | None = None
    agent_seconds: dict[str, float] = field(default_factory=dict)
    ci_waits: int = 0
    ci_seconds: float = 0.0
    stops: int = 0
    stop_seconds: float = 0.0
    reviews: int = 0
    vetoes: int = 0

    @property
    def wall_hours(self) -> float:
        return (
            0.0 if not (self.start and self.end) else (self.end - self.start).total_seconds() / 3600
        )

    def lines(self) -> list[str]:
        agent = sum(self.agent_seconds.values()) / 3600
        out = [
            f"window: {self.wall_hours:.1f} h",
            f"agents: {agent:.1f} h (runs in parallel lanes overlap)",
        ]
        for lane, seconds in sorted(self.agent_seconds.items(), key=lambda kv: -kv[1]):
            if seconds >= 180:
                out.append(f"  {lane}: {seconds / 3600:.1f} h")
        out += [
            f"CI waits: {self.ci_waits}, {self.ci_seconds / 3600:.1f} h",
            f"stops: {self.stops}, {self.stop_seconds / 3600:.1f} h from stop to restart",
            f"reviews: {self.reviews}, vetoes: {self.vetoes}",
        ]
        return out


def _at(row: dict[str, Any]) -> datetime:
    return datetime.fromisoformat(str(row["at"]))


def report(rows: list[dict[str, Any]], since: str = "", until: str = "") -> Report:
    window = [
        r for r in rows if (not since or r["at"] >= since) and (not until or r["at"] <= until)
    ]
    out = Report()
    if not window:
        return out
    out.start, out.end = _at(window[0]), _at(window[-1])
    runs: dict[str, list[dict[str, Any]]] = {}
    for row in window:
        run = str(row.get("run_id") or "")
        if run and not run.startswith(SKIP_RUNS):
            runs.setdefault(run, []).append(row)
    for rows_of_run in runs.values():
        times = [_at(r) for r in rows_of_run]
        lane = str(rows_of_run[0].get("lane"))
        out.agent_seconds[lane] = (
            out.agent_seconds.get(lane, 0.0) + (max(times) - min(times)).total_seconds()
        )
    ready: datetime | None = None
    stopped: datetime | None = None
    for row in window:
        if row.get("lane") != "founder":
            continue
        message = str(row.get("message", ""))
        if "pull request ready" in message or "pull request opened" in message:
            ready = _at(row)
        elif ready and (
            message.startswith("clean CI for round") or "clean CI did not pass" in message
        ):
            out.ci_waits += 1
            out.ci_seconds += (_at(row) - ready).total_seconds()
            ready = None
        if row.get("kind") == "blocked":
            out.stops += 1
            stopped = _at(row)
        elif row.get("kind") == "start" and stopped:
            out.stop_seconds += (_at(row) - stopped).total_seconds()
            stopped = None
        if message.startswith("review:"):
            out.reviews += 1
            out.vetoes += "VETO" in message
    return out


def main(argv: list[str] | None = None, events: Path | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--since", default="")
    parser.add_argument("--until", default="")
    args = parser.parse_args(argv)
    path = events if events is not None else state_dir(REPO_ROOT) / "events.jsonl"
    text = path.read_text() if path.exists() else ""
    rows = [json.loads(line) for line in text.splitlines() if line.strip()]
    for line in report(rows, args.since, args.until).lines():
        print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
