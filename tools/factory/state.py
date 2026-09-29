"""Read the state of the factory from files and git. Nothing here writes."""

import json
import subprocess
from pathlib import Path
from typing import Any

import yaml

from tools.factory.log import factory_dir

ACTIVE_KINDS = {"start", "step", "test"}


def _git(root: Path, *args: str) -> str:
    done = subprocess.run(["git", *args], cwd=root, check=False, capture_output=True, text=True)
    return done.stdout if done.returncode == 0 else ""


def read_events(root: Path, limit: int = 400) -> list[dict[str, Any]]:
    path = factory_dir(root) / "events.jsonl"
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines()[-limit:]:
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def worktrees(root: Path) -> dict[str, dict[str, str]]:
    """Branch name to worktree path and head, for branches named lane/<name>/..."""
    found: dict[str, dict[str, str]] = {}
    current: dict[str, str] = {}
    for line in [*_git(root, "worktree", "list", "--porcelain").splitlines(), ""]:
        if not line:
            branch = current.get("branch", "").removeprefix("refs/heads/")
            parts = branch.split("/")
            if len(parts) >= 2 and parts[0] == "lane":
                found[parts[1]] = {"path": current.get("worktree", ""), "branch": branch}
            current = {}
            continue
        key, _, value = line.partition(" ")
        current[key] = value
    return found


def lane_rows(root: Path, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    trees = worktrees(root)
    rows: list[dict[str, Any]] = []
    for path in sorted((root / ".claude" / "lanes").glob("*.yaml")):
        raw = yaml.safe_load(path.read_text())
        name = raw["name"]
        mine = [e for e in events if e.get("lane") == name]
        last = mine[-1] if mine else None
        tree = trees.get(name)
        commits = files = 0
        if tree:
            ahead = _git(root, "rev-list", "--count", f"main..{tree['branch']}").strip()
            commits = int(ahead) if ahead.isdigit() else 0
            changed = _git(root, "diff", "--name-only", f"main...{tree['branch']}")
            files = len([line for line in changed.splitlines() if line])
        if last is None:
            state = "idle"
        elif last["kind"] in ACTIVE_KINDS:
            state = "working"
        else:
            state = last["kind"]
        rows.append(
            {
                "name": name,
                "kind": raw["kind"],
                "review": raw.get("review", ""),
                "owned": raw["owned"],
                "state": state,
                "agents": sorted({e["agent"] for e in mine}),
                "last": last,
                "events": len(mine),
                "worktree": tree["path"] if tree else "",
                "commits_ahead": commits,
                "files_changed": files,
            }
        )
    return rows


def skills(root: Path) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for path in sorted((root / ".claude" / "skills").glob("*/SKILL.md")):
        replay = path.parent / "REPLAY.md"
        out.append(
            {
                "name": path.parent.name,
                "verified": "replayed" if replay.exists() else "not replayed yet",
            }
        )
    return out


def lessons(root: Path) -> dict[str, Any]:
    base = root / ".claude" / "LESSONS"
    proposals = sorted(p.name for p in (base / "proposals").glob("*.md"))
    verified = sorted(p.name for p in base.glob("*.md") if p.name != "README.md")
    return {"proposals": proposals, "verified": verified}


def gates(root: Path) -> dict[str, Any]:
    path = factory_dir(root) / "gates.json"
    if not path.exists():
        return {}
    try:
        data: dict[str, Any] = json.loads(path.read_text())
    except json.JSONDecodeError:
        return {}
    return data


def snapshot(root: Path) -> dict[str, Any]:
    events = read_events(root)
    return {
        "lanes": lane_rows(root, events),
        "events": list(reversed(events[-80:])),
        "skills": skills(root),
        "lessons": lessons(root),
        "gates": gates(root),
        "head": _git(root, "log", "-1", "--format=%h %s").strip(),
    }
