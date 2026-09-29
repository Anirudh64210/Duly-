"""Read what the agents are doing. Standard library only, read only.

Sources, all plain files:
- <repo>/.factory/events.jsonl   one line per agent action, written by the lane runner
- <repo>/.factory/gates.json     results of the last checks
- ~/.claude/projects/<slug>/*.jsonl   the full session log Claude Code keeps for each agent
- git, for commits and changed files in each lane's worktree
"""

import json
import re
import subprocess
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

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


def agents_from_events(events: list[dict[str, Any]]) -> dict[str, Agent]:
    """The latest run of each lane. A run begins at a start event."""
    agents: dict[str, Agent] = {}
    for event in events:
        lane = event.get("lane", "")
        if not lane or lane == ORCHESTRATOR:
            continue
        kind, message = event.get("kind", ""), event.get("message", "")
        at = parse_time(event.get("at", ""))
        if kind == "start" or lane not in agents:
            runs = agents[lane].runs if lane in agents else 0
            agents[lane] = Agent(lane=lane, started_at=at, runs=runs + 1)
            if kind == "start":
                agents[lane].mission = message
        agent = agents[lane]
        agent.agent = event.get("agent", agent.agent)
        agent.last_at = at
        if kind in {"done", "failed", "blocked"}:
            agent.state, agent.ended_at, agent.last_action = kind, at, message
            continue
        agent.state = "working"
        found = re.match(r"iteration (\d+) of (\d+)$", message)
        if found:
            agent.iteration = f"{found.group(1)}/{found.group(2)}"
        elif kind in {"step", "test"} and not message.startswith("iteration ended"):
            agent.actions += 1
            agent.tests_run += kind == "test"
            agent.last_action = message
    return agents


def running_lanes(ps_output: str) -> set[str]:
    return set(re.findall(r"tools\.factory\.run_lane --lane (\S+)", ps_output))


def _out(cmd: list[str], cwd: Path) -> str:
    try:
        done = subprocess.run(  # noqa: S603
            cmd, cwd=cwd, check=False, capture_output=True, text=True, timeout=10
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return done.stdout if done.returncode == 0 else ""


def worktree_for(repo: Path, lane: str) -> Path | None:
    path = repo.parent / f"{repo.name}-{lane}"
    return path if path.is_dir() else None


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


def load(repo: Path, with_tokens: bool = True) -> Snapshot:
    events = read_events(repo)
    agents = agents_from_events(events)
    alive = running_lanes(_out(["ps", "-axo", "command"], repo))
    base = _out(["git", "rev-parse", "--abbrev-ref", "HEAD"], repo).strip() or "main"
    for agent in agents.values():
        agent.alive = agent.lane in alive
        if agent.state == "working" and not agent.alive:
            agent.state = "stopped"
        agent.worktree = worktree_for(repo, agent.lane)
        if agent.worktree is None:
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
    )


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
