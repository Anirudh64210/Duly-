"""Check the judge against itself.

Takes a review that was accepted earlier, has the reviewer score the same commit again
with no memory of the first time, and compares. If the scores moved by more than the
threshold in factory/config.yaml, the judge has drifted and the founder is told.
Usage: make drift
"""

import json
import sys
from pathlib import Path
from typing import Any

from engine.clocks import SystemClock
from tools.factory import agent_run, alerts, worktree
from tools.factory.config import load_config
from tools.factory.paths import main_repo, state_dir

DONE = "bash -c 'grep -Eq \"^(APPROVE|VETO)$\" reviews/drift.md && test -f reviews/REVIEW.json'"


def mean(scores: dict[str, int]) -> float:
    return sum(scores.values()) / max(1, len(scores))


def moved(old: dict[str, int], new: dict[str, int]) -> float:
    """The mean change across the rubric lines both reviews scored."""
    shared = sorted(set(old) & set(new))
    if not shared:
        return 0.0
    return sum(abs(old[k] - new[k]) for k in shared) / len(shared)


def pick(reviews: list[dict[str, Any]]) -> dict[str, Any] | None:
    """The oldest review not yet scored a second time."""
    seen = {r.get("rescored") for r in reviews if r.get("rescored")}
    for review in reviews:
        if not review.get("rescored") and review["run_id"] not in seen:
            return review
    return None


def main() -> int:
    repo = main_repo(Path.cwd())
    config = load_config(repo)
    clock = SystemClock()
    path = state_dir(repo) / "reviews.jsonl"
    reviews = [json.loads(line) for line in path.read_text().splitlines()] if path.exists() else []
    old = pick(reviews)
    if old is None:
        print("drift: no earlier review to score again")
        return 0
    commit = worktree.git(["rev-parse", "--verify", old["commit"]], repo, check=False).strip()
    if not commit:
        print(f"drift: commit {old['commit']} is gone")
        return 0
    out = agent_run.run(
        agent_run.Task(
            "L-review",
            "reviewer",
            f"drift/{old['run_id']}",
            "CLAUDE.md",
            f"Review commit {commit} against main (git diff main...{commit}), following your role "
            "file. Write reviews/drift.md ending with APPROVE or VETO on its own line, and "
            "reviews/REVIEW.json with your scores.",
            DONE,
            commit,
        ),
        clock,
        repo,
    )
    if out.status != "done":
        print(f"drift: the second review did not finish: {out.reason}")
        return 1
    new = json.loads((Path(out.worktree) / "reviews" / "REVIEW.json").read_text())
    scores = {k: v["score"] for k, v in new["scores"].items()}
    change = moved(old["scores"], scores)
    flipped = new["decision"] != old["decision"]
    limit = float(config["gates"]["judge_drift_max"])
    with path.open("a", encoding="utf-8") as handle:
        handle.write(
            json.dumps(
                {
                    "at": clock.now().isoformat(timespec="seconds"),
                    "run_id": out.run_id,
                    "commit": old["commit"],
                    "scores": scores,
                    "decision": new["decision"],
                    "task": f"drift/{old['run_id']}",
                    "rescored": old["run_id"],
                    "moved": change,
                }
            )
            + "\n"
        )
    worktree.remove(
        worktree.Tree(out.run_id, Path(out.worktree), out.branch, out.base_commit), True, repo
    )
    print(
        f"drift: scores moved {change:.2f} (limit {limit}), decision "
        f"{'changed' if flipped else 'held'}"
    )
    if change > limit or flipped:
        alerts.notify(
            "eval_drop",
            f"the judge drifted: moved {change:.2f}, decision {'changed' if flipped else 'held'}",
            cwd=repo,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
