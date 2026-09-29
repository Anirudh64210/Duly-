"""A small repository with the factory's own files, for testing the factory."""

import json
import shutil
import subprocess
import sys
from pathlib import Path

import yaml

REAL = Path(__file__).resolve().parents[2]
FAKE = REAL / "tests" / "support" / "fake_agent.py"
MODEL = "claude-opus-5-5"
GIT = ["git", "-c", "user.name=t", "-c", "user.email=t@t.invalid", "-c", "commit.gpgsign=false"]


def git(repo: Path, *args: str) -> str:
    done = subprocess.run([*GIT, *args], cwd=repo, check=True, capture_output=True, text=True)
    return done.stdout.strip()


def build(tmp_path: Path, **limits: float) -> Path:
    repo = tmp_path / "mini"
    repo.mkdir()
    for rel in ("factory", "contracts", ".claude/lanes", ".claude/agents"):
        shutil.copytree(REAL / rel, repo / rel)
    config = yaml.safe_load((repo / "factory" / "config.yaml").read_text())
    config["limits"]["seconds_per_minute"] = 1.0
    config["limits"]["require_health_check"] = False
    config["limits"].update(limits.pop("limits", {}))  # type: ignore[arg-type]
    config["budgets"].update(limits.pop("budgets", {}))  # type: ignore[arg-type]
    config["alerts"]["notify"] = "none"
    (repo / "factory" / "config.yaml").write_text(yaml.safe_dump(config))
    for name in ("engine", "tests", "web", "reviews", "proposals"):
        (repo / name).mkdir()
        (repo / name / "README.md").write_text(f"# {name}\n")
    (repo / "tests" / "holdout").mkdir()
    (repo / "tests" / "holdout" / "test_hidden.py").write_text("def test_hidden():\n    pass\n")
    (repo / ".gitignore").write_text(
        ".factory/\n.scratch/\n.lane\nnode_modules\n"
    )  # no run files listed: the factory must keep them out itself
    git(repo, "init", "-q", "-b", "main")
    git(repo, "add", "-A")
    git(repo, "commit", "-q", "-m", "base")
    git(repo, "branch", "phase-x")
    return repo


def scenario(
    tmp_path: Path, attempts: list[list[dict]] | dict[str, list[list[dict]]], name: str = "scenario"
) -> dict[str, str]:
    """One list of attempts for every lane, or a list for each lane by name."""
    path = tmp_path / f"{name}.json"
    if isinstance(attempts, dict):
        path.write_text(json.dumps({"lanes": {k: {"attempts": v} for k, v in attempts.items()}}))
    else:
        path.write_text(json.dumps({"attempts": attempts}))
    for old in tmp_path.glob(f"{name}.*.count"):
        old.unlink()
    launcher = tmp_path / f"{name}-agent"
    launcher.write_text(f'#!/bin/sh\nexec "{sys.executable}" "{FAKE}" "$@"\n')
    launcher.chmod(0o755)
    return {
        "FAKE_AGENT_SCENARIO": str(path),
        "DULY_CLAUDE_BIN": str(launcher),
        "DULY_NO_NOTIFY": "1",
    }


def good(files: list[str], home: str = "engine", text: str = "VALUE = None\n") -> list[dict]:
    steps: list[dict] = [{"init": MODEL}]
    for name in files:
        steps += [{"tool": "Write", "input": {"file_path": name}}, {"write": name, "text": text}]
    steps += [{"report": home, "files": files}, {"result": {"cost": 0.25, "turns": 4}}]
    return steps
