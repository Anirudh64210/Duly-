"""One worktree for one agent on one task, from a pinned commit, removed when done."""

import subprocess
from dataclasses import dataclass
from pathlib import Path

from tools.factory import ledger
from tools.factory.efficiency import CHECK_TASKS
from tools.factory.paths import main_repo, worktrees_dir

# What a health probe writes: the proof file, its report, and the file it must fail to write.
PROBE_FILES = ("HEALTH.txt", "REPORT.json", "probe.txt", ".lane")
GIT_ID = [
    "-c",
    "user.name=Duly factory",
    "-c",
    "user.email=factory@duly.invalid",
    "-c",
    "commit.gpgsign=false",
]


class WorktreeError(RuntimeError):
    pass


@dataclass(frozen=True)
class Tree:
    run_id: str
    path: Path
    branch: str
    base_commit: str


def git(args: list[str], cwd: Path, check: bool = True) -> str:
    done = subprocess.run(["git", *args], cwd=cwd, check=False, capture_output=True, text=True)
    if check and done.returncode:
        raise WorktreeError((done.stdout + done.stderr).strip()[:600])
    return done.stdout


def create(run_id: str, lane: str, base: str, cwd: Path | None = None) -> Tree:
    repo = main_repo(cwd)
    commit = git(["rev-parse", "--verify", f"{base}^{{commit}}"], repo).strip()
    path = worktrees_dir(cwd) / run_id
    if path.exists():
        raise WorktreeError(f"{path} already exists")
    branch = f"lane/{lane}/{run_id}"
    git(["worktree", "add", "-b", branch, str(path), commit], repo)
    (path / ".lane").write_text(lane + "\n")
    modules = repo / "node_modules"
    if modules.exists() and not (path / "node_modules").exists():
        (path / "node_modules").symlink_to(modules)
    return Tree(run_id, path, branch, commit)


def hide(tree: Tree, rel: str) -> None:
    """Take files out of a worktree without the branch recording them as deleted."""
    for name in git(["ls-files", rel], tree.path).split():
        if name.endswith((".gitkeep", "README.md")):
            continue
        git(["update-index", "--skip-worktree", name], tree.path)
        (tree.path / name).unlink(missing_ok=True)


def commit_all(tree: Tree, message: str, author: str, exclude: tuple[str, ...] = ()) -> str:
    """The orchestrator commits an agent's work. The agent never writes to the repository.

    Files named in exclude are left out, as the report and run files always are.
    """
    # Whatever the agent committed itself is folded into one commit made here, so that the
    # report and other run files never land, and every lane arrives as a single change.
    git(["reset", "-q", "--soft", tree.base_commit], tree.path)
    git(["add", "-A"], tree.path)
    staged_now = git(["diff", "--cached", "--name-only"], tree.path).split()
    never = [
        f
        for f in staged_now
        if f.endswith(("REPORT.json", "HEALTH.txt")) or f == ".lane" or f in exclude
    ]
    if never:
        git(["reset", "-q", "--", *never], tree.path)
    staged = git(["diff", "--cached", "--name-only"], tree.path).split()
    if not staged:
        return ""
    git(
        [
            *GIT_ID,
            "commit",
            "-q",
            "--author",
            f"{author} <{author}@agents.duly.invalid>",
            "-m",
            message,
        ],
        tree.path,
    )
    return git(["rev-parse", "HEAD"], tree.path).strip()


def changed_files(tree: Tree) -> list[str]:
    out = git(["diff", "--name-only", f"{tree.base_commit}...HEAD"], tree.path)
    return sorted(line for line in out.splitlines() if line)


def only_here(branch: str, cwd: Path) -> list[str]:
    """The commits of branch that no other branch holds."""
    out = git(
        ["rev-list", branch, "--not", f"--exclude={branch}", "--branches"],
        cwd,
        check=False,
    )
    return out.split()


def remove(tree: Tree, delete_branch: bool, cwd: Path | None = None) -> bool:
    """Remove the worktree, and its branch when asked (see drop_branch). True when the branch
    was deleted."""
    repo = main_repo(cwd)
    git(["worktree", "remove", "--force", str(tree.path)], repo, check=False)
    git(["worktree", "prune"], repo, check=False)
    return delete_branch and drop_branch(tree.branch, repo)


def _probe_only(commit: str, repo: Path) -> bool:
    """Whether a commit changes nothing but the files a health probe writes. A commit that
    lists no file (a merge, an empty commit) is not, so it is kept."""
    files = git(["diff-tree", "--no-commit-id", "--name-only", "-r", "--root", commit], repo)
    return bool(files.split()) and all(Path(f).name in PROBE_FILES for f in files.split())


def drop_branch(branch: str, cwd: Path | None = None, probes: bool = False) -> bool:
    """Delete a branch unless it holds commits no other branch holds: work kept from a failed
    run is never thrown away by a cleanup. With probes, commits that only touch a health
    probe's files do not count as work. A branch a worktree has checked out stays. True when
    the branch was deleted."""
    repo = main_repo(cwd)
    unique = only_here(branch, repo)
    if any(not (probes and _probe_only(c, repo)) for c in unique):
        return False
    try:
        git(["branch", "-D", branch], repo)
    except WorktreeError:
        return False
    return True


def prune(cwd: Path | None = None) -> list[str]:
    """Delete the branches of the factory's own checks (health probes, golden tasks, drift
    reviews, and golden's throwaway bases) that hold no unique work. Runs at every factory
    start and in make factory-clean. Returns the branches deleted."""
    repo = main_repo(cwd)
    runs = {
        str(r["run_id"])
        for r in ledger.read(repo)
        if r.get("kind") == "start" and str(r.get("task", "")).startswith(CHECK_TASKS)
    }
    heads = git(["for-each-ref", "--format=%(refname:short)", "refs/heads/"], repo).split()
    checks = [
        b
        for b in heads
        if b.startswith("golden/")
        or (b.startswith("lane/") and b.rsplit("/", 1)[-1] in runs)
        or b.startswith("lane/founder/golden-setup-")
    ]
    return [b for b in checks if drop_branch(b, repo, probes=True)]
