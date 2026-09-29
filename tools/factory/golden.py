"""Run the golden tasks: fixed work with known-good outcomes.

A change to the factory, a contract, a role file, a skill or the model is measured by
running these before and after. The result is a number, compared with the threshold in
factory/config.yaml. Usage: make golden
"""

import fnmatch
import json
import sys
from pathlib import Path
from typing import Any

import yaml

from engine.clocks import SystemClock
from tools.factory import agent_run, alerts, jail, ledger, sandbox, worktree
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


def main() -> int:
    repo = main_repo(Path.cwd())
    config = load_config(repo)
    clock = SystemClock()
    tasks = yaml.safe_load((repo / "evals" / "factory" / "golden.yaml").read_text())["tasks"]
    only = sys.argv[1] if len(sys.argv) > 1 else ""
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
            dict(__import__("os").environ),
            repo,
            Path(out.worktree or repo),
            task["lane"],
            out.run_id,
            task["done"],
        )
        problems = judge(task, out, repo, env)
        results.append(
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
        print(
            f"{'pass' if not problems else 'FAIL'}  {task['id']}  "
            f"{out.attempts} attempts, {out.cost_usd:.2f} USD"
            + "".join(f"\n      {p}" for p in problems)
        )
        if out.worktree:
            worktree.remove(
                worktree.Tree(out.run_id, Path(out.worktree), out.branch, out.base_commit),
                True,
                repo,
            )
        worktree.git(["branch", "-D", branch], repo, check=False)
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
    if rate < need:
        alerts.notify("eval_drop", f"golden tasks: {rate:.0%} passed, {need:.0%} needed", cwd=repo)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
