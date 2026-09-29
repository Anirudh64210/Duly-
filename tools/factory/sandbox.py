"""The walls around an agent, enforced by the operating system and not by instructions.

Claude Code's sandbox (seatbelt on macOS, bubblewrap on Linux) wraps every shell command
the agent runs. This module writes the settings for one run:

- writes: only inside the agent's own worktree, and inside it only the paths its lane owns
- reads: no keys, tokens or credentials of the person whose machine this is
- network: denied, except the hosts in the agent's contract
- tools: no sub-agents, no web tools; file tools only on the lane's paths
"""

import json
from pathlib import Path
from typing import Any

from tools.diff_policy.check import Lane, matches
from tools.factory.config import Contract

SECRETS = (
    "~/.ssh",
    "~/.aws",
    "~/.gnupg",
    "~/.netrc",
    "~/.config/gh",
    "~/.config/gcloud",
    "~/.docker/config.json",
    "~/.npmrc",
    "~/.pypirc",
    "~/.kube",
    "~/.claude/.credentials.json",
    "~/Library/Keychains",
    "~/.git-credentials",
    "~/.zsh_history",
    "~/.bash_history",
)
# Inside the worktree, never writable by any agent, whatever its lane.
GUARDED = (
    ".claude/settings.json",
    ".claude/settings.local.json",
    ".claude/hooks",
    ".claude/agents",
    ".github",
    "factory",
    "contracts",
    "tools",
    "Makefile",
    "pyproject.toml",
    "package.json",
    "uv.lock",
    "package-lock.json",
    "CLAUDE.md",
    "BOUNDARY.md",
    "PRINCIPLES.md",
    "DECISIONS.md",
    ".gitleaks.toml",
    ".lane",
)
# Written by the tools an agent runs. Never merged: all of these are ignored by git.
SCRATCH = (
    ".pytest_cache",
    ".ruff_cache",
    ".mypy_cache",
    ".hypothesis",
    ".coverage",
    "coverage.xml",
    "htmlcov",
    ".scratch",
)


def tool_scratch(main_repo: Path) -> list[str]:
    """Folders the build tools write to inside the shared node_modules. Caches only."""
    modules = main_repo / "node_modules"
    return [str(modules / name) for name in (".vite", ".vite-temp", ".vitest", ".cache")]


def owned_by(lane: Lane, rel: str) -> bool:
    probe = rel.rstrip("/") + "/x"
    return any(
        matches(rel, p) or matches(probe, p) or p.startswith(rel.rstrip("/") + "/")
        for p in lane.owned
    )


def denied_writes(worktree: Path, lane: Lane) -> list[str]:
    """Every top-level entry of the worktree the lane does not own, plus the guarded set."""
    out = {str(worktree / g) for g in GUARDED if not owned_by(lane, g)}
    for entry in sorted(worktree.iterdir()):
        name = entry.name
        if name in {".git", "node_modules"} or name in SCRATCH:
            continue
        if not owned_by(lane, name):
            out.add(str(entry))
    return sorted(out)


def protected_git_paths(main_repo: Path, protected_branches: list[str]) -> list[str]:
    """The parts of the shared repository no agent may write: every branch but its own."""
    git_dir = main_repo / ".git"
    names = (
        "config",
        "hooks",
        "packed-refs",
        "HEAD",
        "info",
        "refs/remotes",
        "refs/tags",
        "refs/stash",
    )
    out = [str(git_dir / name) for name in names]
    out += [str(git_dir / "refs" / "heads" / branch) for branch in protected_branches]
    return out


def settings_for(
    worktree: Path,
    lane: Lane,
    contract: Contract,
    holdout_hidden: bool,
    main_repo: Path,
    protected_branches: list[str],
) -> dict[str, Any]:
    root = str(worktree)
    deny_read = list(SECRETS)
    if holdout_hidden:
        deny_read.append(f"{root}/tests/holdout")
    file_rules = [f"//{root.lstrip('/')}/{p}" for p in lane.owned]
    allow = ["Read", "Glob", "Grep"]
    if "Bash" in contract.tools:
        allow.append("Bash")
    if contract.may_write:
        for tool in ("Edit", "Write"):
            if tool in contract.tools:
                allow += [f"{tool}({rule})" for rule in file_rules]
    return {
        "sandbox": {
            "enabled": True,
            "failIfUnavailable": True,
            "autoAllowBashIfSandboxed": True,
            "allowUnsandboxedCommands": False,
            "excludedCommands": [],
            "filesystem": {
                "allowWrite": [root, *tool_scratch(main_repo)] if contract.may_write else [],
                "denyWrite": [
                    *denied_writes(worktree, lane),
                    *protected_git_paths(main_repo, protected_branches),
                ],
                "denyRead": deny_read,
            },
            "network": {
                "allowedDomains": list(contract.network),
                "strictAllowlist": True,
                "allowLocalBinding": True,
            },
        },
        "permissions": {
            "defaultMode": "dontAsk",
            "allow": allow,
            "deny": ["Agent", "Task", "WebFetch", "WebSearch", "NotebookEdit", "Skill", "mcp__*"],
            "disableBypassPermissionsMode": "disable",
        },
        "includeCoAuthoredBy": False,
    }


def write_settings(path: Path, settings: dict[str, Any]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(settings, indent=2))
    return path


def environment(
    base: dict[str, str], main_repo: Path, worktree: Path, lane: str, run_id: str, done: str
) -> dict[str, str]:
    """What an agent's process may see. Secrets in the environment are dropped."""
    keep = {
        "PATH",
        "HOME",
        "USER",
        "LOGNAME",
        "SHELL",
        "LANG",
        "LC_ALL",
        "TERM",
        "TMPDIR",
        "CLAUDE_CONFIG_DIR",
        "CLAUDE_CODE_OAUTH_TOKEN",
        "FAKE_AGENT_SCENARIO",  # the factory's own tests
    }
    env = {k: v for k, v in base.items() if k in keep}
    env.update(
        {
            "DULY_LANE": lane,
            "DULY_RUN_ID": run_id,
            "DULY_DONE": done,
            "UV_PROJECT_ENVIRONMENT": str(main_repo / ".venv"),
            "UV_CACHE_DIR": str(worktree / ".scratch" / "uv-cache"),
            "UV_NO_SYNC": "1",
            "UV_OFFLINE": "1",
            "UV_FROZEN": "1",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
            "NO_COLOR": "1",
            "PYTHONDONTWRITEBYTECODE": "1",
            "npm_config_offline": "true",
            "npm_config_update_notifier": "false",
        }
    )
    return env
