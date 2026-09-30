"""How the factory spent its time and usage, from its own record in .factory/.

Correctness was measured and time was not, and one feature took fifteen hours before anyone
saw where they went. This reads the ledger for a window and reports: wall time, agent time by
lane, CI waits, stops and the time from each stop to the next start (the founder lane's
diagnosis and fixes), reviews with their vetoes and whether the founder upheld them, and
the founder-lane workflows' tokens by day. It goes in every status report. The weekly
subscription meter cannot be read by a program, so the report says so and does not guess.

It then reports each plan, the feature a plan directory under specs/ builds: list dollars,
tokens by class and by role, runs, turns, reviews and vetoes, stops by cause, and wall hours.
Wall hours are one definition only, from the first run's start to the last run's end. Every
stop carries a cause; a stop whose cause is unknown is flagged until the founder names it.
Work held for the founder's approval is not a stop.

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
CAUSES = ("plan", "spec", "cross-lane", "code", "factory", "infra", "wording", "unknown")
# The classes of the result event's usage, by the names the report gives them.
TOKEN_CLASSES = {
    "input_tokens": "input",
    "cache_creation_input_tokens": "cache write",
    "cache_read_input_tokens": "cache read",
    "output_tokens": "output",
}


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
    upheld: dict[bool, int] = field(default_factory=dict)
    workflow_tokens: dict[str, int] = field(default_factory=dict)

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
            f"reviews: {self.reviews}, vetoes: {self.vetoes}, "
            f"veto_upheld yes {self.upheld.get(True, 0)}, no {self.upheld.get(False, 0)}",
        ]
        for day, tokens in sorted(self.workflow_tokens.items()):
            out.append(f"founder-lane workflows {day}: {tokens / 1e6:.2f} M tokens")
        return out


@dataclass
class Plan:
    dollars: float = 0.0
    runs: int = 0
    turns: int = 0
    tokens_by_class: dict[str, int] = field(default_factory=dict)
    tokens_by_role: dict[str, int] = field(default_factory=dict)
    reviews: int = 0
    vetoes: int = 0
    stops: dict[str, int] = field(default_factory=dict)
    first: datetime | None = None
    last: datetime | None = None

    @property
    def wall_hours(self) -> float:
        if not (self.first and self.last):
            return 0.0
        return (self.last - self.first).total_seconds() / 3600

    def lines(self, name: str) -> list[str]:
        def tokens(counts: dict[str, int]) -> str:
            ranked = sorted(counts.items(), key=lambda kv: -kv[1])
            return ", ".join(f"{k} {v / 1e6:.2f} M" for k, v in ranked) or "none"

        causes = ", ".join(f"{c} {n}" for c, n in sorted(self.stops.items()))
        out = [
            f"plan {name}: ${self.dollars:.2f} list, {self.runs} runs, {self.turns} turns, "
            f"{self.wall_hours:.1f} wall h",
            f"  tokens by class: {tokens(self.tokens_by_class)}",
            f"  tokens by role: {tokens(self.tokens_by_role)}",
            f"  reviews: {self.reviews}, vetoes: {self.vetoes}",
            f"  stops: {sum(self.stops.values())}" + (f" ({causes})" if causes else ""),
        ]
        if self.stops.get("unknown"):
            out.append(
                f"  FLAG: {self.stops['unknown']} stops have no cause; name one when you handle it"
            )
        return out


def _at(row: dict[str, Any]) -> datetime:
    return datetime.fromisoformat(str(row["at"]))


def _inside(at: str, since: str, until: str) -> bool:
    return (not since or at >= since) and (not until or at <= until)


def report(rows: list[dict[str, Any]], since: str = "", until: str = "") -> Report:
    window = [r for r in rows if _inside(str(r["at"]), since, until)]
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
        if isinstance(row.get("veto_upheld"), bool):
            out.upheld[row["veto_upheld"]] = out.upheld.get(row["veto_upheld"], 0) + 1
        if row.get("workflow"):
            day = str(row["at"])[:10]
            out.workflow_tokens[day] = out.workflow_tokens.get(day, 0) + int(row.get("tokens") or 0)
    return out


def _plan_of(row: dict[str, Any]) -> str:
    return str(row.get("plan") or str(row.get("task", "")).split("/")[0])


def token_classes(run: dict[str, Any]) -> dict[str, int]:
    """A run's tokens by class. Runs recorded before the result event's usage was kept have
    only a sum of input and cache, and an output count that the stream undercounted."""
    usage = run.get("tokens")
    if isinstance(usage, dict):
        return {label: int(usage.get(key) or 0) for key, label in TOKEN_CLASSES.items()}
    return {
        "input and cache": int(run.get("tokens_in") or 0),
        "output, streamed": int(run.get("tokens_out") or 0),
    }


def plans(
    runs: list[dict[str, Any]],
    reviews: list[dict[str, Any]],
    events: list[dict[str, Any]],
    since: str = "",
    until: str = "",
) -> dict[str, Plan]:
    """Each plan's totals for the window, with its stops counted by cause (see stops)."""
    out: dict[str, Plan] = {}
    for run in runs:
        if not _inside(str(run.get("started_at", "")), since, until):
            continue
        plan = out.setdefault(_plan_of(run), Plan())
        plan.dollars += float(run.get("cost_usd") or 0.0)
        plan.runs += 1
        plan.turns += int(run.get("turns") or 0)
        classes = token_classes(run)
        for label, count in classes.items():
            plan.tokens_by_class[label] = plan.tokens_by_class.get(label, 0) + count
        role = str(run.get("agent", ""))
        plan.tokens_by_role[role] = plan.tokens_by_role.get(role, 0) + sum(classes.values())
        began = datetime.fromisoformat(str(run["started_at"]))
        ended = datetime.fromisoformat(str(run.get("ended_at") or run["started_at"]))
        plan.first = min(plan.first or began, began)
        plan.last = max(plan.last or ended, ended)
    for review in reviews:
        if _inside(str(review.get("at", "")), since, until):
            plan = out.setdefault(_plan_of(review), Plan())
            plan.reviews += 1
            plan.vetoes += review.get("decision") == "VETO"
    for row, cause in stops(events):
        if row.get("plan") and _inside(str(row["at"]), since, until):
            plan = out.setdefault(str(row["plan"]), Plan())
            plan.stops[cause] = plan.stops.get(cause, 0) + 1
    return out


def stops(events: list[dict[str, Any]]) -> list[tuple[dict[str, Any], str]]:
    """Each stop with its cause. A stop is one row the founder lane wrote when a round or the
    plan stopped; an agent's own stop inside that round is not counted again. The cause is,
    in order: the one the founder named when handling the stop, the one named when handling
    an alert of its round (a veto among them), the stop's own, an agent's in its round, else
    unknown."""
    named = {
        str(r["handles"]): str(r["cause"])
        for r in events
        if r.get("kind") == "control" and r.get("handles") and r.get("cause") in CAUSES
    }
    out: list[tuple[dict[str, Any], str]] = []
    handled = agents = ""
    for row in events:
        kind, founder = row.get("kind"), row.get("lane") == "founder"
        if founder and kind == "start":
            handled = agents = ""
        elif founder and kind == "blocked":
            own = str(row.get("cause"))
            known = own if own in CAUSES and own != "unknown" else ""
            cause = named.get(str(row.get("hash"))) or handled or known or agents
            out.append((row, cause or "unknown"))
            handled = agents = ""
        elif kind == "alert" or kind == "blocked":
            handled = handled or named.get(str(row.get("hash")), "")
            if kind == "blocked" and row.get("cause") in CAUSES and row["cause"] != "unknown":
                agents = agents or str(row["cause"])
    return out


def _rows(path: Path) -> list[dict[str, Any]]:
    text = path.read_text() if path.exists() else ""
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def main(argv: list[str] | None = None, state: Path | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--since", default="")
    parser.add_argument("--until", default="")
    args = parser.parse_args(argv)
    where = state if state is not None else state_dir(REPO_ROOT)
    events = _rows(where / "events.jsonl")
    for line in report(events, args.since, args.until).lines():
        print(line)
    found = plans(
        _rows(where / "metrics.jsonl"),
        _rows(where / "reviews.jsonl"),
        events,
        args.since,
        args.until,
    )
    first = {name: plan.first.isoformat() if plan.first else "~" for name, plan in found.items()}
    for name, plan in sorted(found.items(), key=lambda kv: first[kv[0]]):
        for line in plan.lines(name):
            print(line)
    print("weekly-meter change: not measured; the subscription's weekly meter has no API to read")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
