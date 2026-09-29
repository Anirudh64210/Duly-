"""Read what the agents are doing. Standard library only, read only.

Sources, all plain files:
- <repo>/.factory/events.jsonl   one line per agent action, written by the lane runner
- <repo>/.factory/gates.json     results of the last checks
- ~/.claude/projects/<slug>/*.jsonl   the full session log Claude Code keeps for each agent
- git, for commits and changed files in each lane's worktree
"""

import hashlib
import json
import re
import subprocess
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    from dashboard import clock
except ImportError:  # run as a script
    import clock  # type: ignore[no-redef]

ORCHESTRATOR = "founder"
CLAUDE_PROJECTS = Path.home() / ".claude" / "projects"


@dataclass
class Agent:
    lane: str
    agent: str = ""
    mission: str = ""
    state: str = "idle"
    started_at: datetime | None = None
    ended_at: datetime | None = None
    last_at: datetime | None = None
    last_action: str = ""
    iteration: str = ""
    actions: int = 0
    tests_run: int = 0
    alive: bool = False
    worktree: Path | None = None
    commits: int = 0
    files_changed: int = 0
    uncommitted: int = 0
    lessons: int = 0
    progress_lines: int = 0
    tokens_in: int = 0
    tokens_out: int = 0
    runs: int = 0
    run_id: str = ""
    cost_usd: float = 0.0
    merged: bool = False


@dataclass
class Snapshot:
    agents: list[Agent] = field(default_factory=list)
    round_line: str = ""
    orchestrator: list[dict[str, Any]] = field(default_factory=list)
    gates: dict[str, str] = field(default_factory=dict)
    proposals: int = 0
    skills: int = 0
    skills_replayed: int = 0
    head: str = ""
    stopped: bool = False
    spent_today: float = 0.0
    day_cap: float = 0.0
    alerts: list[dict[str, Any]] = field(default_factory=list)
    metrics: dict[str, dict[str, float]] = field(default_factory=dict)
    reviews: list[dict[str, Any]] = field(default_factory=list)
    ledger_problems: list[str] = field(default_factory=list)
    health: dict[str, Any] = field(default_factory=dict)


@dataclass
class Line:
    at: datetime | None
    kind: str  # say, tool, result, prompt, event
    text: str


def parse_time(value: str) -> datetime | None:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def read_events(repo: Path) -> list[dict[str, Any]]:
    path = repo / ".factory" / "events.jsonl"
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def health_rows(repo: Path, records: dict[str, Any]) -> list[dict[str, Any]]:
    """Every agent in every lane it may work in, with whether its health check holds.

    A pass holds only for the exact contract, role file, sandbox and runner it was earned
    with. When any of them has changed since, the pass is out of date.
    """
    rows = []
    factory = repo / "tools" / "factory"
    for path in sorted((repo / "factory" / "agents").glob("*.yaml")):
        text = path.read_text(encoding="utf-8")
        name = path.stem
        lanes = re.search(r"(?m)^lanes:\s*\[([^\]]*)\]", text)
        role = re.search(r"(?m)^role_file:\s*(\S+)", text)
        parts = [path.read_bytes()]
        for extra in (
            repo / role.group(1) if role else None,
            factory / "sandbox.py",
            factory / "agent_run.py",
        ):
            parts.append(extra.read_bytes() if extra and extra.exists() else b"")
        mark = hashlib.sha256(b"\0".join(parts)).hexdigest()[:20]
        for lane in [x.strip() for x in lanes.group(1).split(",")] if lanes else []:
            home = repo / ".claude" / "lanes" / f"{lane}.yaml"
            owned = re.search(r'owned:\s*\["([^"/]+)', home.read_text()) if home.exists() else None
            if owned and not (repo / owned.group(1)).is_dir():
                continue  # the lane has nothing to work in yet
            record = records.get(f"{name}:{lane}")
            if record is None:
                state = "not checked"
            elif record.get("fingerprint") != mark:
                state = "out of date"
            else:
                state = "passed"
            rows.append(
                {
                    "agent": name,
                    "lane": lane,
                    "state": state,
                    "at": (record or {}).get("at", ""),
                    "run_id": (record or {}).get("run_id", ""),
                }
            )
    return rows


def factory_runs(events: list[dict[str, Any]]) -> set[str]:
    """Runs that test the factory itself: health checks, golden tasks, drift checks."""
    return {
        str(e.get("run_id"))
        for e in events
        if e.get("run_id") and str(e.get("task", "")).startswith(("health/", "golden/", "drift/"))
    }


def agents_from_events(events: list[dict[str, Any]]) -> dict[str, Agent]:
    """The latest run of each lane. A run begins at a start event."""
    agents: dict[str, Agent] = {}
    own = factory_runs(events)
    for event in events:
        if event.get("run_id") and event.get("run_id") in own:
            continue
        lane = event.get("lane", "")
        if not lane or lane == ORCHESTRATOR or lane.startswith("orchestrator"):
            continue
        kind, message = event.get("kind", ""), event.get("message", "")
        at = parse_time(event.get("at", ""))
        if kind == "start" or lane not in agents:
            runs = agents[lane].runs if lane in agents else 0
            agents[lane] = Agent(lane=lane, started_at=at, runs=runs + 1)
            if kind == "start":
                agents[lane].mission = message
        agent = agents[lane]
        agent.run_id = event.get("run_id") or agent.run_id
        if kind == "alert":
            continue
        if kind == "cost":
            agent.cost_usd += float(event.get("cost_usd") or 0.0)
            continue
        if kind == "merge":
            agent.merged = True
            continue
        if event.get("agent") not in {None, "orchestrator"}:
            agent.agent = event["agent"]
        agent.last_at = at
        if kind in {"done", "failed", "blocked"}:
            agent.state, agent.ended_at, agent.last_action = kind, at, message
            continue
        agent.state = "working"
        found = re.match(r"iteration (\d+) of (\d+)$", message)
        if found:
            agent.iteration = f"{found.group(1)}/{found.group(2)}"
        elif kind in {"step", "test"} and not message.startswith(("iteration ended", "attempt ")):
            agent.actions += 1
            agent.tests_run += kind == "test"
            agent.last_action = message
    return agents


def running_lanes(ps_output: str) -> set[str]:
    return set(re.findall(r"tools\.factory\.(?:agent_run|run_lane) --lane (\S+)", ps_output))


def seal(row: dict[str, Any]) -> str:
    body = json.dumps({k: v for k, v in row.items() if k != "hash"}, sort_keys=True)
    return hashlib.sha256(body.encode()).hexdigest()


def ledger_problems(events: list[dict[str, Any]]) -> list[str]:
    """Lines of the ledger that were changed, removed or put out of order."""
    problems: list[str] = []
    prev = None
    for number, row in enumerate(events, start=1):
        if "hash" not in row:
            if prev is not None:
                problems.append(f"line {number}: unsealed line after sealed lines")
            continue
        if row["hash"] != seal(row):
            problems.append(f"line {number}: contents do not match their seal")
        if prev is not None and row.get("prev") != prev:
            problems.append(f"line {number}: does not follow the line before it")
        prev = row["hash"]
    return problems


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def agent_metrics(runs: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    by_agent: dict[str, list[dict[str, Any]]] = {}
    for run in runs:
        if str(run.get("task", "")).startswith(("health/", "golden/", "drift/")):
            continue
        by_agent.setdefault(run.get("agent", "?"), []).append(run)
    out = {}
    for agent, rows in sorted(by_agent.items()):
        n = len(rows)
        out[agent] = {
            "runs": n,
            "success_rate": round(sum(r.get("status") == "done" for r in rows) / n, 2),
            "mean_attempts": round(sum(r.get("attempts", 0) for r in rows) / n, 1),
            "mean_cost_usd": round(sum(r.get("cost_usd", 0.0) for r in rows) / n, 2),
            "mean_minutes": round(sum(r.get("seconds", 0) for r in rows) / n / 60, 1),
        }
    return out


def _out(cmd: list[str], cwd: Path) -> str:
    try:
        done = subprocess.run(cmd, cwd=cwd, check=False, capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return done.stdout if done.returncode == 0 else ""


def worktree_for(repo: Path, lane: str, run_id: str = "") -> Path | None:
    if run_id:
        path = repo.parent / f"{repo.name}-worktrees" / run_id
        if path.is_dir():
            return path
    path = repo.parent / f"{repo.name}-{lane}"
    return path if path.is_dir() else None


def worktree_name(repo: Path, lane: str, run_id: str = "") -> Path:
    """Where the worktree is or was. Session logs are filed under this path."""
    if run_id:
        return repo.parent / f"{repo.name}-worktrees" / run_id
    return repo.parent / f"{repo.name}-{lane}"


def count_lessons(text: str) -> int:
    return len(re.findall(r"(?mi)^#{1,6}\s*lesson\b", text))


def progress_text(worktree: Path) -> str:
    parts = []
    for path in sorted([*worktree.glob("PROGRESS.md"), *worktree.glob("*/PROGRESS.md")]):
        parts.append(f"## {path.relative_to(worktree)}\n\n{path.read_text(encoding='utf-8')}")
    return "\n\n".join(parts)


def session_dir(worktree: Path) -> Path:
    return CLAUDE_PROJECTS / re.sub(r"[^A-Za-z0-9]", "-", str(worktree))


def session_files(worktree: Path, since: datetime | None = None) -> list[Path]:
    folder = session_dir(worktree)
    if not folder.is_dir():
        return []
    files = sorted(folder.glob("*.jsonl"), key=lambda p: p.stat().st_mtime)
    if since is not None:
        files = [p for p in files if p.stat().st_mtime >= since.timestamp() - 5]
    return files


def _flatten(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            str(b.get("text", "")) for b in content if isinstance(b, dict) and b.get("text")
        )
    return ""


def _tool_line(name: str, tool_input: dict[str, Any]) -> str:
    if name == "Bash":
        return "$ " + str(tool_input.get("command", ""))
    for key in ("file_path", "pattern", "url", "query"):
        if key in tool_input:
            return f"{name} {tool_input[key]}"
    return name


def transcript(files: list[Path], result_chars: int = 1500) -> tuple[list[Line], int, int]:
    """Every prompt, message, tool call and result, in order, plus tokens in and out."""
    lines: list[Line] = []
    tokens_in = tokens_out = 0
    seen_requests: set[str] = set()
    for path in files:
        for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
            try:
                row = json.loads(raw)
            except json.JSONDecodeError:
                continue
            kind = row.get("type")
            if kind not in {"user", "assistant"}:
                continue
            at = parse_time(row.get("timestamp", ""))
            message = row.get("message") or {}
            content = message.get("content")
            if kind == "assistant":
                request = row.get("requestId") or message.get("id") or ""
                usage = message.get("usage") or {}
                if usage and request not in seen_requests:
                    seen_requests.add(request)
                    tokens_out += int(usage.get("output_tokens") or 0)
                    tokens_in += sum(
                        int(usage.get(k) or 0)
                        for k in (
                            "input_tokens",
                            "cache_creation_input_tokens",
                            "cache_read_input_tokens",
                        )
                    )
                for block in content if isinstance(content, list) else []:
                    if block.get("type") == "text" and block.get("text", "").strip():
                        lines.append(Line(at, "say", block["text"].strip()))
                    elif block.get("type") == "tool_use":
                        lines.append(
                            Line(
                                at,
                                "tool",
                                _tool_line(block.get("name", ""), block.get("input") or {}),
                            )
                        )
            elif isinstance(content, str):
                lines.append(Line(at, "prompt", content.strip()))
            else:
                for block in content or []:
                    if block.get("type") == "tool_result":
                        text = _flatten(block.get("content")).strip()
                        if len(text) > result_chars:
                            text = (
                                text[:result_chars]
                                + f"\n... {len(text) - result_chars} more characters"
                            )
                        mark = "error" if block.get("is_error") else "result"
                        lines.append(Line(at, mark, text or "(no output)"))
    return lines, tokens_in, tokens_out


def changes(repo: Path, agent: Agent) -> str:
    if agent.worktree is None:
        return "No worktree. It is removed when the lane is launched again."
    base = _out(["git", "rev-parse", "--abbrev-ref", "HEAD"], repo).strip() or "main"
    log = _out(["git", "log", "--oneline", f"{base}..HEAD"], agent.worktree)
    stat = _out(["git", "diff", "--stat", f"{base}...HEAD"], agent.worktree)
    status = _out(["git", "status", "--short"], agent.worktree)
    return (
        f"Commits not yet on {base}\n{log or '(none)'}\n\n"
        f"Files changed in those commits\n{stat or '(none)'}\n\n"
        f"Not yet committed\n{status or '(nothing)'}"
    )


def load(
    repo: Path,
    with_tokens: bool = True,
    ps_output: str | None = None,
    now: datetime | None = None,
) -> Snapshot:
    events = read_events(repo)
    agents = agents_from_events(events)
    if ps_output is None:
        ps_output = _out(["ps", "-axo", "command"], repo)
    alive = running_lanes(ps_output)
    base = _out(["git", "rev-parse", "--abbrev-ref", "HEAD"], repo).strip() or "main"
    for agent in agents.values():
        agent.alive = agent.lane in alive
        if agent.state == "working" and not agent.alive:
            agent.state = "stopped"
        agent.worktree = worktree_for(repo, agent.lane, agent.run_id)
        if agent.worktree is None:
            if with_tokens and agent.run_id:
                gone = worktree_name(repo, agent.lane, agent.run_id)
                _, agent.tokens_in, agent.tokens_out = transcript(
                    session_files(gone, agent.started_at)
                )
            continue
        ahead = _out(["git", "rev-list", "--count", f"{base}..HEAD"], agent.worktree).strip()
        agent.commits = int(ahead) if ahead.isdigit() else 0
        diff = _out(["git", "diff", "--name-only", f"{base}...HEAD"], agent.worktree)
        agent.files_changed = len(diff.split())
        status = _out(["git", "status", "--porcelain"], agent.worktree)
        agent.uncommitted = len([line for line in status.splitlines() if line.strip()])
        text = progress_text(agent.worktree)
        agent.lessons = count_lessons(text)
        agent.progress_lines = len(text.splitlines())
        if with_tokens:
            _, agent.tokens_in, agent.tokens_out = transcript(
                session_files(agent.worktree, agent.started_at)
            )

    orchestrator = [e for e in events if e.get("lane") == ORCHESTRATOR]
    round_line = next(
        (e["message"] for e in reversed(orchestrator) if e.get("message", "").startswith("round")),
        "",
    )
    gates: dict[str, str] = {}
    gates_file = repo / ".factory" / "gates.json"
    if gates_file.exists():
        try:
            gates = json.loads(gates_file.read_text()).get("results", {})
        except json.JSONDecodeError:
            gates = {}
    factory = repo / ".factory"
    runs = read_jsonl(factory / "metrics.jsonl")
    today = (now or clock.now()).date().isoformat()
    day_cap = 0.0
    found = re.search(
        r"(?m)^\s*per_day_usd:\s*([0-9.]+)",
        (repo / "factory" / "config.yaml").read_text()
        if (repo / "factory" / "config.yaml").exists()
        else "",
    )
    if found:
        day_cap = float(found.group(1))
    try:
        health = json.loads((factory / "health.json").read_text())
    except (OSError, json.JSONDecodeError):
        health = {}
    own = factory_runs(events)
    skill_dirs = [p.parent for p in (repo / ".claude" / "skills").glob("*/SKILL.md")]
    order = {"working": 0, "blocked": 1, "failed": 1, "stopped": 1, "done": 2}
    return Snapshot(
        agents=sorted(agents.values(), key=lambda a: (order.get(a.state, 3), a.lane)),
        round_line=round_line,
        orchestrator=orchestrator,
        gates=gates,
        proposals=len(list((repo / ".claude" / "LESSONS" / "proposals").glob("*.md"))),
        skills=len(skill_dirs),
        skills_replayed=len([d for d in skill_dirs if (d / "REPLAY.md").exists()]),
        head=_out(["git", "log", "-1", "--format=%h %s"], repo).strip(),
        stopped=(factory / "STOP").exists(),
        spent_today=round(
            sum(
                float(r.get("cost_usd", 0.0))
                for r in runs
                if str(r.get("ended_at", "")).startswith(today)
            ),
            2,
        ),
        day_cap=day_cap,
        alerts=[e for e in events if e.get("kind") == "alert" and e.get("run_id") not in own][-30:],
        metrics=agent_metrics(runs),
        reviews=read_jsonl(factory / "reviews.jsonl")[-20:],
        ledger_problems=ledger_problems(events),
        health=health,
    )


def _iso(at: datetime | None) -> str:
    return at.isoformat() if at else ""


def snapshot_json(repo: Path, ps_output: str | None = None) -> dict[str, Any]:
    """Everything the main view shows, as plain values."""
    snap = load(repo, ps_output=ps_output)
    return {
        "round": snap.round_line,
        "stopped": snap.stopped,
        "spend": {"today": snap.spent_today, "cap": snap.day_cap},
        "alerts": [
            {
                "at": e.get("at", ""),
                "kind": e.get("alert", ""),
                "lane": e.get("lane", ""),
                "message": e.get("message", ""),
            }
            for e in reversed(snap.alerts)
        ],
        "metrics": snap.metrics,
        "reviews": snap.reviews,
        "ledger": {"intact": not snap.ledger_problems, "problems": snap.ledger_problems[:5]},
        "health": health_rows(repo, snap.health),
        "head": snap.head,
        "gates": snap.gates,
        "learning": {
            "lessons": sum(a.lessons for a in snap.agents),
            "proposals": snap.proposals,
            "skills": snap.skills,
            "skills_replayed": snap.skills_replayed,
        },
        "totals": {
            "running": len([a for a in snap.agents if a.alive]),
            "lanes": len(snap.agents),
            "actions": sum(a.actions for a in snap.agents),
            "tokens_in": sum(a.tokens_in for a in snap.agents),
            "tokens_out": sum(a.tokens_out for a in snap.agents),
            "first_start": _iso(
                min((a.started_at for a in snap.agents if a.started_at), default=None)
            ),
        },
        "agents": [
            {
                "lane": a.lane,
                "agent": a.agent,
                "mission": a.mission,
                "state": a.state,
                "alive": a.alive,
                "started_at": _iso(a.started_at),
                "ended_at": _iso(a.ended_at or (None if a.alive else a.last_at)),
                "iteration": a.iteration,
                "actions": a.actions,
                "tests_run": a.tests_run,
                "commits": a.commits,
                "files_changed": a.files_changed,
                "uncommitted": a.uncommitted,
                "lessons": a.lessons,
                "tokens_in": a.tokens_in,
                "tokens_out": a.tokens_out,
                "last_action": a.last_action,
                "runs": a.runs,
                "run_id": a.run_id,
                "cost_usd": round(a.cost_usd, 2),
                "merged": a.merged,
            }
            for a in snap.agents
        ],
        "orchestrator": [
            {"at": e.get("at", ""), "kind": e.get("kind", ""), "message": e.get("message", "")}
            for e in snap.orchestrator[-60:]
        ],
    }


THEMES = ("light", "dark")


def read_theme(repo: Path) -> str:
    """The theme the founder picked, or an empty string to follow the system."""
    try:
        saved = json.loads((repo / ".factory" / "ui.json").read_text()).get("theme", "")
    except (OSError, json.JSONDecodeError, AttributeError):
        return ""
    return saved if saved in THEMES else ""


def write_theme(repo: Path, theme: str) -> str:
    if theme not in THEMES:
        return read_theme(repo)
    folder = repo / ".factory"
    folder.mkdir(exist_ok=True)
    (folder / "ui.json").write_text(json.dumps({"theme": theme}))
    return theme


def agent_json(
    repo: Path, lane: str, limit: int = 500, ps_output: str | None = None
) -> dict[str, Any]:
    """Everything the agent view shows: trace, activity, progress log, changes."""
    snap = load(repo, with_tokens=False, ps_output=ps_output)
    agent = next((a for a in snap.agents if a.lane == lane), None)
    if agent is None:
        return {"found": False}
    where = agent.worktree or worktree_name(repo, lane, agent.run_id)
    files = session_files(where, agent.started_at)
    lines, _, _ = transcript(files)
    events = [e for e in read_events(repo) if e.get("lane") == lane]
    return {
        "found": True,
        "lane": lane,
        "trace_total": len(lines),
        "trace": [{"at": _iso(x.at), "kind": x.kind, "text": x.text} for x in lines[-limit:]],
        "activity": [
            {"at": e.get("at", ""), "kind": e.get("kind", ""), "message": e.get("message", "")}
            for e in events[-limit:]
        ],
        "progress": progress_text(agent.worktree) if agent.worktree else "",
        "changes": changes(repo, agent),
    }


def span(start: datetime | None, end: datetime | None) -> str:
    if start is None or end is None:
        return ""
    seconds = max(0, int((end - start).total_seconds()))
    hours, rest = divmod(seconds, 3600)
    minutes, secs = divmod(rest, 60)
    if hours:
        return f"{hours}h {minutes:02d}m"
    return f"{minutes}m {secs:02d}s"


def short_count(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.0f}k"
    return str(n)
