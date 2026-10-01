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

Last, each plan's scorecard: its totals plus the measures M1 to M8 of specs/factory-2, each
beside the median of the last three plans and its target. At plan close the runner saves it
to .factory/scorecards/<plan>.json, and --write saves one by hand (the baselines were saved so).
A scorecard ends with the plan's runs to read by hand: every run that did not finish, then a
fixed sample of those that did, with the questions to answer (it replaced the weekly page).
--latest N prints the newest N saved scorecards with those runs; make weekly runs it.

Usage: python -m tools.factory.efficiency [--since 2026-09-29T12:00] [--until ...] [--write PLAN]
       [--latest N]
"""

import argparse
import itertools
import json
import random
import re
import statistics
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from tools.factory import causes

# Re-exported: control and phase read the causes from here.
from tools.factory.causes import CAUSES as CAUSES
from tools.factory.paths import REPO_ROOT, state_dir

SKIP_RUNS = ("orchestrator", "health", "golden", "doctor")
# Tasks that check the factory itself and belong to no plan.
CHECK_TASKS = ("health/", "golden/", "drift/")
# The classes of the result event's usage, by the names the report gives them.
TOKEN_CLASSES = {
    "input_tokens": "input",
    "cache_creation_input_tokens": "cache write",
    "cache_read_input_tokens": "cache read",
    "output_tokens": "output",
}
# Before held work had its own kind, the founder lane wrote it as a blocked row.
HELD = "waiting for the founder"
ATTEMPT = re.compile(r"attempt (\d+) not accepted")
ITERATION = re.compile(r"iteration (\d+) of \d+$")
# A failure whose text is empty: "the done command fails:" and nothing after it.
EMPTY_DIGEST = re.compile(r"fails:\s*$")
# Stages a stop can happen in, most telling first, as phase records them on a stop row.
STAGES = ("lane", "review", "checks", "ci", "merge")
# Passing runs a scorecard offers to read by hand, beside every run that did not pass.
SAMPLE = 5
QUESTIONS = (
    "Did the agent do what the mission asked, and only that?",
    "Did it read a source before stating a fact, or did it write from memory?",
    "Did it meet a wall (sandbox, guard, gate)? Was the wall right?",
    "Did it take a cheap or fake win anywhere?",
    "Is there a check missing that would have caught what went wrong?",
)


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

        by_cause = ", ".join(f"{c} {n}" for c, n in sorted(self.stops.items()))
        out = [
            f"plan {name}: ${self.dollars:.2f} list, {self.runs} runs, {self.turns} turns, "
            f"{self.wall_hours:.1f} wall h",
            f"  tokens by class: {tokens(self.tokens_by_class)}",
            f"  tokens by role: {tokens(self.tokens_by_role)}",
            f"  reviews: {self.reviews}, vetoes: {self.vetoes}",
            f"  stops: {sum(self.stops.values())}" + (f" ({by_cause})" if by_cause else ""),
        ]
        if self.stops.get("unknown"):
            out.append(
                f"  FLAG: {self.stops['unknown']} stops have no cause; name one when you handle it"
            )
        return out


@dataclass(frozen=True)
class Stop:
    """One stop of a plan. source is human when a person named the cause, auto when the
    runner or an agent did, and empty while it is unknown. stage is where the round stopped;
    for rows written before phase recorded it, it is read from the round's own rows."""

    row: dict[str, Any]
    plan: str
    cause: str
    source: str
    stage: str


def _at(row: dict[str, Any]) -> datetime:
    return datetime.fromisoformat(str(row["at"]))


def _inside(at: str, since: str, until: str) -> bool:
    return (not since or at >= since) and (not until or at <= until)


def _is_stop(row: dict[str, Any]) -> bool:
    return (
        row.get("lane") == "founder"
        and row.get("kind") == "blocked"
        and HELD not in str(row.get("message", ""))
    )


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
        if _is_stop(row):
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


def row_plans(events: list[dict[str, Any]]) -> list[str]:
    """The plan each ledger row belongs to, by position; empty for none.

    A row that names its plan, or whose run's task names one, belongs to it, and a check of
    the factory belongs to no plan. Any other row, such as the founder lane's stops and
    answers (rows before 09-30 name no plan), belongs to the plan of its round: the first
    plan a row of the round names, else the round before's, since a round rerun after every
    lane landed starts no run.
    """
    tasks = {str(r["run_id"]): str(r["task"]) for r in events if r.get("run_id") and r.get("task")}

    def own(row: dict[str, Any]) -> str | None:
        if row.get("plan"):
            return str(row["plan"])
        task = tasks.get(str(row.get("run_id") or ""))
        if task is None:
            return None
        return "" if task.startswith(CHECK_TASKS) else task.split("/")[0]

    out: list[str] = []
    before = ""
    for rows in _rounds(events):
        named = [own(events[i]) for i in rows]
        plan = next((p for p in named if p), before)
        out += [plan if p is None else p for p in named]
        before = plan
    return out


def _rounds(events: list[dict[str, Any]]) -> list[list[int]]:
    """The ledger's positions cut at each round the founder lane starts."""
    out: list[list[int]] = [[]]
    for number, row in enumerate(events):
        if row.get("lane") == "founder" and row.get("kind") == "start" and out[-1]:
            out.append([])
        out[-1].append(number)
    return out


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
    for stop in stop_list(events):
        if stop.plan and _inside(str(stop.row["at"]), since, until):
            plan = out.setdefault(stop.plan, Plan())
            plan.stops[stop.cause] = plan.stops.get(stop.cause, 0) + 1
    return out


def stops(events: list[dict[str, Any]]) -> list[tuple[dict[str, Any], str]]:
    """Each stop with its cause (see stop_list)."""
    return [(stop.row, stop.cause) for stop in stop_list(events)]


def _stage_mark(row: dict[str, Any]) -> str:
    """The stage a founder-lane row of a round shows went wrong, if any."""
    message = str(row.get("message", ""))
    if row.get("kind") == "failed":
        return "checks" if message.startswith("check ") else "lane"
    if message.startswith("review: VETO"):
        return "review"
    return "ci" if "clean CI did not pass" in message else ""


def stop_list(events: list[dict[str, Any]]) -> list[Stop]:
    """Each stop with its cause, plan and stage. A stop is one row the founder lane wrote
    when a round or the plan stopped; an agent's own stop inside that round is not counted
    again. The cause is, in order: the one the founder named when handling the stop, the one
    named when handling an alert of its round (a veto among them), the stop's own, an
    agent's in its round, else unknown."""
    named = {
        str(r["handles"]): str(r["cause"])
        for r in events
        if r.get("kind") == "control" and r.get("handles") and r.get("cause") in CAUSES
    }
    plan_of = row_plans(events)
    out: list[Stop] = []
    handled = agents = ""
    marks: set[str] = set()
    for number, row in enumerate(events):
        kind, founder = row.get("kind"), row.get("lane") == "founder"
        if founder and kind == "start":
            handled = agents = ""
            marks = set()
        elif _is_stop(row):
            own = str(row.get("cause"))
            known = own if own in CAUSES and own != "unknown" else ""
            human = named.get(str(row.get("hash"))) or handled
            cause = human or known or agents
            source = "human" if human else str(row.get("cause_source") or "auto") if cause else ""
            stage = str(row.get("stage") or next((s for s in STAGES if s in marks), ""))
            out.append(Stop(row, plan_of[number], cause or "unknown", source, stage))
            handled = agents = ""
            marks = set()
        else:
            if kind == "alert" or kind == "blocked":
                handled = handled or named.get(str(row.get("hash")), "")
                if kind == "blocked" and row.get("cause") in CAUSES and row["cause"] != "unknown":
                    agents = agents or str(row["cause"])
            if founder:
                marks.add(_stage_mark(row))
    return out


# The targets of specs/factory-2 section 2 that one plan's record can be judged on.
@dataclass(frozen=True)
class Target:
    """A measure and its target. fold is how the last three plans are read together: the
    median, or for a yes or no measure the count of yes."""

    id: str
    label: str
    read_by: str
    target: str
    op: str
    bound: float
    fold: str = "median"

    def met(self, value: float | None) -> bool | None:
        if value is None:
            return None
        return {
            "<": value < self.bound,
            "<=": value <= self.bound,
            "==": value == self.bound,
            ">=": value >= self.bound,
        }[self.op]


TARGETS = (
    Target("vetoes", "Vetoes per plan", "EFF", "at most 3", "<=", 3),
    Target(
        "first_review_approved",
        "First review approved",
        "M1",
        "at least 1 of the last 3",
        ">=",
        1,
        fold="count",
    ),
    Target("fix_cycle_hours", "Median hours per fix cycle", "M2", "under 0.5", "<", 0.5),
    Target("checks_stops", "Checks-stage stops after all lanes passed", "M5", "at most 2", "<=", 2),
    Target("spec_stops", "Stops with cause spec", "EFF", "at most 3", "<=", 3),
    Target("reviewer_turns", "Reviewer median turns", "M3", "under 30", "<", 30),
    Target("reviewer_tokens", "Reviewer median tokens per run", "M3", "under 3 M", "<", 3e6),
    Target("builder_context", "Builder median final context", "M3", "under 46.2 k", "<", 46_200),
    Target(
        "test_author_context",
        "Test-author median final context",
        "M3",
        "under 49.7 k",
        "<",
        49_700,
    ),
    Target("drafter_context", "Drafter median final context", "M3", "under 80 k", "<", 80_000),
    Target("reviewer_context", "Reviewer median final context", "M3", "under 80 k", "<", 80_000),
    Target("large_reads", "Whole-file reads of files over 50 KB", "M4", "0", "==", 0),
    Target("dollars", "List dollars", "EFF", "under $105", "<", 105),
    Target("wall_hours", "Wall hours", "EFF", "under 5", "<", 5),
    Target("health_share", "Health share of dollars", "M7", "under 2%", "<", 0.02),
    Target("stops_with_cause", "Share of stops with a cause", "EFF", "100%", ">=", 1),
    Target("infra_flake_stops", "Infra and flake stops that reached a person", "M6", "0", "==", 0),
    Target("attempts_after_denial", "Attempts after a sandbox denial", "M6", "0", "==", 0),
    Target("empty_digest_escalations", "Escalations on an empty digest", "M6", "0", "==", 0),
    Target("plan_stops", "Stops with cause plan", "EFF", "at most 1", "<=", 1),
    Target("plan_files", "Plan files", "ls", "1", "<=", 1),
    Target(
        "decisions_by_card",
        "Share of answers given by card or factory answer",
        "M8",
        "100%",
        ">=",
        1,
    ),
)
# The role each final context target reads. The builder and test-author targets are 30%
# below their baselines of 66 k and 71 k.
CONTEXT_ROLES = {
    "builder_context": "builder",
    "test_author_context": "test-author",
    "drafter_context": "rulepack-drafter",
    "reviewer_context": "reviewer",
}


def _median(values: Iterable[float]) -> float | None:
    found = list(values)
    return float(statistics.median(found)) if found else None


def _by_role(runs: list[dict[str, Any]], key: str, measured: bool = False) -> dict[str, float]:
    """The median of one metrics field for each role, over the runs that recorded it. With
    measured, a zero means the run had nothing to measure (a context size never is zero)."""
    out: dict[str, float] = {}
    for role in sorted({str(r.get("agent", "")) for r in runs}):
        found = _median(
            float(r[key])
            for r in runs
            if r.get("agent") == role and key in r and (r[key] or not measured)
        )
        if found is not None:
            out[role] = found
    return out


def _signature(row: dict[str, Any]) -> str:
    """The R1 signature an attempt row carries; rows from before carry none, so their text is
    read with the same table."""
    if "signature" in row:
        return str(row["signature"] or "")
    return causes.classify(str(row.get("message", "")))[1] or ""


def _attempts_after_denial(events: list[dict[str, Any]], plan_of: list[str], plan: str) -> int:
    """Attempts a run started after an attempt of it ended in a sandbox denial."""
    denied: dict[str, int] = {}
    started: dict[str, int] = {}
    for number, row in enumerate(events):
        run = str(row.get("run_id") or "")
        if not run or plan_of[number] != plan:
            continue
        message = str(row.get("message", ""))
        found = ITERATION.match(message)
        if found:
            started[run] = max(started.get(run, 0), int(found.group(1)))
        found = ATTEMPT.match(message)
        if found and run not in denied and _signature(row).startswith("sandbox."):
            denied[run] = int(found.group(1))
    return sum(max(0, started.get(run, n) - n) for run, n in denied.items())


def _empty_digests(events: list[dict[str, Any]], plan_of: list[str], plan: str) -> int:
    """Runs and checks that ended on a failure with no text: an agent's end row, or the
    founder lane's failed check (a lane's failure there repeats the agent's own row)."""
    count = 0
    for number, row in enumerate(events):
        message = str(row.get("message", ""))
        if plan_of[number] != plan or not EMPTY_DIGEST.search(message):
            continue
        if row.get("lane") == "founder":
            count += row.get("kind") == "failed" and message.startswith("check ")
        else:
            count += bool(row.get("run_id")) and row.get("kind") in {"blocked", "failed"}
    return count


def _answers(events: list[dict[str, Any]], plan_of: list[str], plan: str) -> list[dict[str, Any]]:
    """Each answer a person gave in the plan: a row that handles a stop, an alert or a
    decision, filed under the plan of what it handles, with when it was asked and answered
    and how. A decision row that carries its own answer counts once."""
    where = {str(r["hash"]): n for n, r in enumerate(events) if r.get("hash")}
    out: list[dict[str, Any]] = []
    for number, row in enumerate(events):
        handles = str(row.get("handles") or "")
        if handles:
            asked = events[where[handles]] if handles in where else {}
            owner = plan_of[where[handles]] if handles in where else plan_of[number]
        elif row.get("kind") == "decision" and row.get("answered_at"):
            asked, owner = row, plan_of[number]
        else:
            continue
        if owner != plan:
            continue
        out.append(
            {
                "asked_at": str(
                    row.get("asked_at") or asked.get("asked_at") or asked.get("at") or ""
                ),
                "answered_at": str(row.get("answered_at") or row.get("at") or ""),
                "via": str(row.get("via") or ""),
                "veto_upheld": row.get("veto_upheld"),
            }
        )
    return out


def _minutes(answer: dict[str, Any]) -> float | None:
    try:
        asked = datetime.fromisoformat(answer["asked_at"])
        answered = datetime.fromisoformat(answer["answered_at"])
    except ValueError:
        return None
    return (answered - asked).total_seconds() / 60


def _fix_cycles(rows: list[dict[str, Any]]) -> list[float]:
    """Hours from each VETO review row to the plan's next review row."""
    ordered = sorted(rows, key=lambda r: str(r.get("at", "")))
    return [
        (_at(after) - _at(veto)).total_seconds() / 3600
        for veto, after in itertools.pairwise(ordered)
        if veto.get("decision") == "VETO"
    ]


def plan_files(root: Path, plan: str) -> int | None:
    """Plan files in the plan's spec folder, or None when the folder is not here."""
    folder = root / "specs" / plan
    return len(list(folder.glob("plan*.yaml"))) if folder.is_dir() else None


def _round(value: float | None, digits: int = 3) -> float | None:
    return None if value is None else round(value, digits)


def _share(part: int, whole: int) -> float | None:
    return part / whole if whole else None


def scorecard(
    plan: str,
    events: list[dict[str, Any]],
    metrics: Sequence[dict[str, Any]] = (),
    reviews: Sequence[dict[str, Any]] = (),
    files: int | None = None,
    earlier: Sequence[dict[str, Any]] = (),
) -> dict[str, Any]:
    """The plan's efficiency output plus M1 to M8, each measure beside the median of the last
    three plans (this one and the two scorecards closed before it in earlier) and its
    target. A measure nothing recorded for this plan is None, shown as none."""
    totals = plans(list(metrics), list(reviews), events).get(plan, Plan())
    runs = [r for r in metrics if _plan_of(r) == plan]
    reviewed = [r for r in reviews if _plan_of(r) == plan]
    plan_of = row_plans(events)
    held = [s for s in stop_list(events) if s.plan == plan]
    answers = _answers(events, plan_of, plan)
    upheld = [a["veto_upheld"] for a in answers if isinstance(a["veto_upheld"], bool)]
    first, last = totals.first, totals.last
    window = [
        r
        for r in metrics
        if first and last and first <= datetime.fromisoformat(str(r["started_at"])) <= last
    ]
    spent = sum(float(r.get("cost_usd") or 0.0) for r in window)
    health = sum(
        float(r.get("cost_usd") or 0.0)
        for r in window
        if str(r.get("task", "")).startswith("health/")
    )
    turns = _by_role(runs, "turns")
    tokens = _by_role([{**r, "sum": sum(token_classes(r).values())} for r in runs], "sum")
    final = _by_role(runs, "final_context", measured=True)
    reads = [int(r["large_reads"]) for r in runs if "large_reads" in r]
    ordered = sorted(reviewed, key=lambda r: str(r.get("at", "")))
    values: dict[str, float | None] = {
        "vetoes": totals.vetoes,
        "first_review_approved": (
            float(ordered[0].get("decision") == "APPROVE") if ordered else None
        ),
        "fix_cycle_hours": _round(_median(_fix_cycles(reviewed))),
        "checks_stops": sum(s.stage == "checks" for s in held),
        "spec_stops": sum(s.cause == "spec" for s in held),
        "reviewer_turns": turns.get("reviewer"),
        "reviewer_tokens": tokens.get("reviewer"),
        **{key: final.get(role) for key, role in CONTEXT_ROLES.items()},
        "large_reads": sum(reads) if reads else None,
        "dollars": round(totals.dollars, 2),
        "wall_hours": round(totals.wall_hours, 2),
        "health_share": _round(health / spent if spent else None),
        "stops_with_cause": _round(_share(sum(s.cause != "unknown" for s in held), len(held))),
        "infra_flake_stops": sum(s.cause in {"infra", "flake"} for s in held),
        "attempts_after_denial": _attempts_after_denial(events, plan_of, plan),
        "empty_digest_escalations": _empty_digests(events, plan_of, plan),
        "plan_stops": sum(s.cause == "plan" for s in held),
        "plan_files": files,
        "decisions_by_card": _round(
            _share(sum(a["via"] in {"card", "cli"} for a in answers), len(answers))
        ),
    }
    closed = last.isoformat() if last else ""
    before = sorted(
        (c for c in earlier if c.get("plan") != plan and str(c.get("closed_at", "")) < closed),
        key=lambda c: str(c.get("closed_at", "")),
    )[-2:]
    measures: dict[str, dict[str, Any]] = {}
    for target in TARGETS:
        value = values[target.id]
        seen = [value] + [c.get("measures", {}).get(target.id, {}).get("value") for c in before]
        known = [float(v) for v in seen if v is not None]
        folded = (
            (float(sum(v > 0 for v in known)) if known else None)
            if target.fold == "count"
            else _round(_median(known))
        )
        measures[target.id] = {
            "label": target.label,
            "read_by": target.read_by,
            "value": value,
            "last_three": folded,
            "target": target.target,
            "met": target.met(folded),
        }
    return {
        "plan": plan,
        "closed_at": closed,
        "efficiency": {
            "dollars": round(totals.dollars, 2),
            "runs": totals.runs,
            "turns": totals.turns,
            "wall_hours": round(totals.wall_hours, 2),
            "tokens_by_class": totals.tokens_by_class,
            "tokens_by_role": totals.tokens_by_role,
            "reviews": totals.reviews,
            "vetoes": totals.vetoes,
            "stops": len(held),
            "stops_by_cause": totals.stops,
            "stops_by_stage": _count(s.stage or "not recorded" for s in held),
            "cause_source": _count(s.source for s in held if s.source),
            "veto_upheld": {"yes": upheld.count(True), "no": upheld.count(False)},
            "answers": len(answers),
            "answer_minutes_median": _round(
                _median(m for m in map(_minutes, answers) if m is not None), 1
            ),
            "median_turns_by_role": turns,
            "median_tokens_by_role": tokens,
            "median_first_context_by_role": _by_role(runs, "first_context", measured=True),
            "median_final_context_by_role": final,
            "plan_files": files,
        },
        "measures": measures,
        "sample": sample(plan, runs),
    }


def sample(plan: str, runs: Sequence[dict[str, Any]]) -> dict[str, Any]:
    """The plan's runs to read by hand: every one that did not finish done, then passing ones
    up to SAMPLE, picked the same way every time for the plan, with where each trace is."""
    troubled = [r for r in runs if r.get("status") != "done"]
    fine = [r for r in runs if r.get("status") == "done"]
    random.Random(plan).shuffle(fine)  # noqa: S311
    chosen = troubled + fine[: max(0, SAMPLE - len(troubled))]
    return {
        "questions": list(QUESTIONS),
        "runs": [
            {
                "run_id": r.get("run_id", ""),
                "lane": r.get("lane", ""),
                "agent": r.get("agent", ""),
                "status": r.get("status", ""),
                "reason": str(r.get("reason", ""))[:200],
                "attempts": r.get("attempts"),
                "cost_usd": r.get("cost_usd"),
                "minutes": int(r.get("seconds") or 0) // 60,
                "trace": f".factory/runs/{r.get('run_id', '')}/stream.jsonl",
            }
            for r in chosen
        ],
    }


def _count(items: Iterable[str]) -> dict[str, int]:
    out: dict[str, int] = {}
    for item in items:
        out[item] = out.get(item, 0) + 1
    return dict(sorted(out.items()))


def _shown(value: Any) -> str:
    if value is None:
        return "none"
    if isinstance(value, float) and not value.is_integer():
        return f"{value:.3g}" if abs(value) < 10 else f"{value:,.1f}"
    return f"{value:,.0f}" if isinstance(value, float) else str(value)


def scorecard_lines(card: dict[str, Any], runs: bool = False) -> list[str]:
    """The card's measures, and with runs its runs to read and the questions for each."""
    out = [f"scorecard {card['plan']} (closed {card['closed_at'] or 'not yet'}):"]
    for measure in card["measures"].values():
        met = {True: "met", False: "not met", None: "not judged"}[measure["met"]]
        out.append(
            f"  {measure['label']} [{measure['read_by']}]: {_shown(measure['value'])}; "
            f"last three {_shown(measure['last_three'])}; target {measure['target']}, {met}"
        )
    picked = card.get("sample") or {}
    if runs and picked.get("runs"):
        out.append("  runs to read (open each in make watch, or read its trace):")
        for r in picked["runs"]:
            out += [
                f"    {r['lane']} {r['agent']} {r['status']}: {r['run_id']}, {r['attempts']} "
                f"attempts, {_shown(r['cost_usd'])} USD, {r['minutes']} minutes. {r['reason']}",
                f"      trace {r['trace']}",
            ]
        out.append("  for each run:")
        out += [f"    {n}. {q}" for n, q in enumerate(picked["questions"], start=1)]
    elif runs:
        out.append("  runs to read: none recorded on this card")
    return out


def read_scorecards(where: Path) -> list[dict[str, Any]]:
    """The saved scorecards in a state folder, oldest plan first."""
    cards = []
    for path in sorted((where / "scorecards").glob("*.json")):
        try:
            cards.append(json.loads(path.read_text()))
        except (OSError, json.JSONDecodeError):
            continue
    return sorted(cards, key=lambda c: str(c.get("closed_at", "")))


def write_scorecard(plan: str, where: Path, root: Path) -> Path:
    """Save the plan's scorecard to <state>/scorecards/<plan>.json; the runner calls this at
    plan close. root is the checkout whose specs/<plan> holds the plan files."""
    card = scorecard(
        plan,
        _rows(where / "events.jsonl"),
        _rows(where / "metrics.jsonl"),
        _rows(where / "reviews.jsonl"),
        plan_files(root, plan),
        read_scorecards(where),
    )
    path = where / "scorecards" / f"{plan}.json"
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(card, indent=2) + "\n")
    return path


def _rows(path: Path) -> list[dict[str, Any]]:
    text = path.read_text() if path.exists() else ""
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def main(argv: list[str] | None = None, state: Path | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--since", default="")
    parser.add_argument("--until", default="")
    parser.add_argument("--write", action="append", default=[], metavar="PLAN")
    parser.add_argument("--latest", type=int, default=0, metavar="N")
    args = parser.parse_args(argv)
    where = state if state is not None else state_dir(REPO_ROOT)
    root = where.parent
    if args.latest:
        cards = read_scorecards(where)[-args.latest :]
        for card in cards:
            print("\n".join(scorecard_lines(card, runs=True)))
        if not cards:
            print("no scorecard is saved yet; one is written at each plan close")
        return 0
    for plan in args.write:
        path = write_scorecard(plan, where, root)
        for line in scorecard_lines(json.loads(path.read_text())):
            print(line)
        print(f"saved {path}")
    if args.write:
        return 0
    events = _rows(where / "events.jsonl")
    for line in report(events, args.since, args.until).lines():
        print(line)
    metrics, reviews = _rows(where / "metrics.jsonl"), _rows(where / "reviews.jsonl")
    found = plans(metrics, reviews, events, args.since, args.until)
    first = {name: plan.first.isoformat() if plan.first else "~" for name, plan in found.items()}
    saved = read_scorecards(where)
    for name, plan in sorted(found.items(), key=lambda kv: first[kv[0]]):
        for line in plan.lines(name):
            print(line)
        if name and f"{name}/" not in CHECK_TASKS:
            card = scorecard(name, events, metrics, reviews, plan_files(root, name), saved)
            for line in scorecard_lines(card):
                print("  " + line)
    print("weekly-meter change: not measured; the subscription's weekly meter has no API to read")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
