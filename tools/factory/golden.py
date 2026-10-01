"""Run the golden tasks: fixed work with known-good outcomes.

A change to the factory, a contract, a role file, a skill or the model is measured by
running these before and after. The result is a number, compared with the threshold in
factory/config.yaml. Each task is tried once more when it fails, as a health probe is, and a
pass on the retry is recorded as a flake. When the pinned model changed since the last drift
check, the drift check runs after the tasks (drift.py). Usage: make golden
"""

import fnmatch
import json
import os
import sys
from functools import partial
from pathlib import Path
from typing import Any

import yaml

from engine.clocks import Clock, SystemClock
from tools.factory import agent_run, alerts, drift, health, jail, ledger, sandbox, worktree
from tools.factory.config import load_config, review_problems
from tools.factory.paths import main_repo, state_dir


def judge(
    task: dict[str, Any], out: agent_run.Outcome, repo: Path, env: dict[str, str]
) -> list[str]:
    """Every way the outcome differs from the known-good one. Empty means it passed."""
    problems: list[str] = []
    if out.status != "done":
        return [f"{out.status}: {out.reason}"]
    tree = Path(out.worktree)
    stray = [
        f
        for f in out.files_changed
        if not any(fnmatch.fnmatch(f, p) for p in task.get("only_touches", ["*"]))
    ]
    if stray:
        problems.append("touched more than the task asked: " + ", ".join(stray))
    if task.get("expect_decision"):
        try:
            review = json.loads((tree / "reviews" / "REVIEW.json").read_text())
        except (OSError, json.JSONDecodeError) as err:
            return [*problems, f"no readable scores: {err}"]
        problems += review_problems(review, repo)
        if review.get("decision") != task["expect_decision"]:
            problems.append(
                f"decided {review.get('decision')}, the known answer is {task['expect_decision']}"
            )
    if task.get("must_fail_after"):
        # A test that still passes after the code is broken protects nothing.
        extra = [Path(p) for p in sandbox.tool_scratch(repo)]
        broken = jail.run(task["must_fail_after"], tree, env, extra_writable=extra)
        after = jail.run(task["done"], tree, env, extra_writable=extra)
        if broken.code != 0:
            problems.append("could not break the code to check the test")
        elif after.code == 0:
            problems.append("the test still passes after the code was broken")
    return problems


def attempt(
    task: dict[str, Any], branch: str, clock: Clock, repo: Path, tries: list[dict[str, Any]]
) -> tuple[bool, str]:
    """Run a golden task once and judge it. The result is added to tries."""
    out = agent_run.run(
        agent_run.Task(
            task["lane"],
            task["agent"],
            f"golden/{task['id']}",
            "CLAUDE.md",
            " ".join(task["mission"].split()),
            task["done"],
            branch,
        ),
        clock,
        repo,
    )
    env = sandbox.environment(
        dict(os.environ), repo, Path(out.worktree or repo), task["lane"], out.run_id, task["done"]
    )
    problems = judge(task, out, repo, env)
    if out.worktree:
        worktree.remove(
            worktree.Tree(out.run_id, Path(out.worktree), out.branch, out.base_commit), True, repo
        )
    tries.append(
        {
            "id": task["id"],
            "passed": not problems,
            "problems": problems,
            "run_id": out.run_id,
            "attempts": out.attempts,
            "cost_usd": out.cost_usd,
            "seconds": out.seconds,
        }
    )
    return not problems, "; ".join(problems)


def main(only: str = "", cwd: Path | None = None) -> int:
    """Run every golden task, or only the one named, each once more when it fails, as a health
    probe is (health.retry_once). Then, when the pinned model changed, the drift check."""
    repo = main_repo(cwd or Path.cwd())
    config = load_config(repo)
    clock = SystemClock()
    tasks = yaml.safe_load((repo / "evals" / "factory" / "golden.yaml").read_text())["tasks"]
    stamp = clock.now().strftime("%Y%m%d-%H%M%S")
    results = []
    for task in tasks:
        if only and task["id"] != only:
            continue
        base = worktree.git(["rev-parse", "HEAD"], repo).strip()
        branch = f"golden/{stamp}/{task['id']}"
        worktree.git(["branch", branch, base], repo)
        if task.get("setup"):
            prep = worktree.create(
                f"golden-setup-{stamp}-{task['id'][:12]}", "founder", branch, repo
            )
            env0 = sandbox.environment({}, repo, prep.path, "founder", prep.run_id, "")
            done = jail.run(
                task["setup"], prep.path, {**env0, "PATH": "/usr/bin:/bin:/opt/homebrew/bin"}
            )
            commit = (
                worktree.commit_all(prep, "golden: planted change", "golden")
                if done.code == 0
                else ""
            )
            if commit:
                worktree.git(["branch", "-f", branch, commit], repo)
            worktree.remove(prep, True, repo)
            if not commit:
                results.append({"id": task["id"], "passed": False, "problems": ["setup failed"]})
                continue
        tries: list[dict[str, Any]] = []
        tried = health.retry_once(
            partial(attempt, task, branch, clock, repo, tries),
            f"golden.{task['id']}",
            repo,
            task["lane"],
        )
        result = {
            **tries[-1],
            "cost_usd": round(sum(t["cost_usd"] for t in tries), 4),
            "tries": len(tries),
            "flaked": tried.flaked,
        }
        results.append(result)
        print(
            f"{'pass' if result['passed'] else 'FAIL'}  {task['id']}  "
            f"{len(tries)} tries, {result['cost_usd']:.2f} USD"
            + (" (passed on its retry, recorded as a flake)" if tried.flaked else "")
            + "".join(f"\n      {p}" for p in result["problems"])
        )
        worktree.drop_branch(branch, repo)
    rate = sum(r["passed"] for r in results) / max(1, len(results))
    need = float(config["gates"]["golden_pass_rate"])
    row = {
        "at": clock.now().isoformat(timespec="seconds"),
        "rate": rate,
        "needed": need,
        "head": worktree.git(["rev-parse", "HEAD"], repo).strip(),
        "results": results,
    }
    with (state_dir(repo) / "golden.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(row) + "\n")
    print(f"golden: {rate:.0%} passed, {need:.0%} needed")
    if rate >= need:
        # A pass answers every earlier alert about the golden tasks.
        answered = {r.get("handles") for r in ledger.read(repo) if r.get("handles")}
        for row in ledger.read(repo):
            if (
                row.get("alert") == "eval_drop"
                and "golden tasks" in row.get("message", "")
                and row.get("hash") not in answered
            ):
                ledger.append(
                    "founder",
                    "orchestrator",
                    "control",
                    f"handled: golden tasks passed at {rate:.0%}",
                    repo,
                    handles=row["hash"],
                )
    else:
        alerts.notify("eval_drop", f"golden tasks: {rate:.0%} passed, {need:.0%} needed", cwd=repo)
    judged = drift.main(repo) if drift.due(repo) else 0
    return 0 if rate >= need and judged == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else ""))
