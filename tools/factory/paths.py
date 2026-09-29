"""Where the factory keeps its state. One folder, shared by every worktree."""

import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def main_repo(cwd: Path | None = None) -> Path:
    """The main checkout, also when called from inside a lane's worktree."""
    done = subprocess.run(
        ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
        cwd=cwd or REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if done.returncode == 0 and done.stdout.strip():
        return Path(done.stdout.strip()).parent
    return cwd or REPO_ROOT


def state_dir(cwd: Path | None = None) -> Path:
    out = main_repo(cwd) / ".factory"
    out.mkdir(exist_ok=True)
    return out


def worktrees_dir(cwd: Path | None = None) -> Path:
    repo = main_repo(cwd)
    out = repo.parent / f"{repo.name}-worktrees"
    out.mkdir(exist_ok=True)
    return out
