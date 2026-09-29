"""Run a plan: rounds of agents in parallel, each in its own worktree.

After a round, each agent's work is checked again by the orchestrator and lands on the
phase branch as one merge, either through a pull request that clean CI must pass, or
locally. The working agent never merges. Nothing here ever merges into a protected
branch: that is the founder's step.

Usage: uv run python -m tools.factory.phase specs/phase-2/plan.yaml [--from-round X]
           [--only-round X] [--checks-only X]
"""

import argparse
import fnmatch
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import yaml

from engine.clocks import SystemClock
from tools.diff_policy.check import load_lane, violations
from tools.factory import alerts, jail, ledger, registry, sandbox, worktree
from tools.factory.config import load_config, review_problems
from tools.factory.paths import REPO_ROOT, main_repo, state_dir

TRAILER = "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
NEEDS_FOUNDER = {
    "dependency_added": (
        "pyproject.toml",
        "uv.lock",
        "package.json",
        "package-lock.json",
        "*/package.json",
    ),
    "ci_or_infra_changed": (".github/*", "infra/*", "Makefile", ".gitleaks.toml"),
    "guardrail_changed": (
        ".claude/hooks/*",
        ".claude/settings.json",
        ".claude/lanes/*",
        "tools/*",
        "factory/*",
        "security/semgrep/*",
    ),
    "skill_or_prompt_changed": (
        ".claude/skills/*",
        ".claude/agents/*",
        ".claude/LESSONS/*",
        "proposals/*",
    ),
    "contract_changed": (
        "contracts/*",
        "BOUNDARY.md",
        "PRINCIPLES.md",
        "DECISIONS.md",
        "CLAUDE.md",
    ),
}


class PlanError(ValueError):
    pass


def load_plan(path: Path, repo: Path) -> dict[str, Any]:
    plan = yaml.safe_load(path.read_text())
    config = load_config(repo)
    for key in ("branch", "spec", "rounds"):
        if key not in plan:
            raise PlanError(f"the plan has no {key}")
    if plan["branch"] in config["protected_branches"]:
        raise PlanError(f"{plan['branch']} is protected; agents never land work there")
    plan.setdefault("merge", "local")
    if plan["merge"] not in {"local", "pr"}:
        raise PlanError("merge is local or pr")
    seen: set[str] = set()
    for rnd in plan["rounds"]:
        lanes = [job["lane"] for job in rnd["lanes"]]
        if len(lanes) != len(set(lanes)):
            raise PlanError(f"round {rnd['name']} uses a lane twice")
        if len(lanes) > config["limits"]["max_parallel_agents"]:
            raise PlanError(f"round {rnd['name']} has more agents than the factory allows at once")
        for job in rnd["lanes"]:
            for key in ("lane", "agent", "mission", "done"):
                if not str(job.get(key, "")).strip():
                    raise PlanError(f"round {rnd['name']}: a lane has no {key}")
            job.setdefault("task", f"{plan['branch']}/{rnd['name']}/{job['lane']}")
            if job["task"] in seen:
                raise PlanError(f"task {job['task']} appears twice")
            seen.add(job["task"])
    return dict(plan)


def needs_founder(files: list[str]) -> dict[str, list[str]]:
    found: dict[str, list[str]] = {}
    for reason, patterns in NEEDS_FOUNDER.items():
        hits = [f for f in files if any(fnmatch.fnmatch(f, p) for p in patterns)]
        if hits:
            found[reason] = hits
    return found


def _say(repo: Path, kind: str, message: str) -> None:
    ledger.append("founder", "orchestrator", kind, message, repo)
    print(f"[{kind}] {message}", flush=True)


def _git(repo: Path, *args: str) -> tuple[int, str]:
    done = subprocess.run(
        ["git", *worktree.GIT_ID, *args], cwd=repo, check=False, capture_output=True, text=True
    )
    return done.returncode, (done.stdout + done.stderr).strip()


def _gh(repo: Path, *args: str, timeout: int = 1800) -> tuple[int, str]:
    done = subprocess.run(
        ["gh", *args], cwd=repo, check=False, capture_output=True, text=True, timeout=timeout
    )
    return done.returncode, (done.stdout + done.stderr).strip()


def land(repo: Path, plan: dict[str, Any], job: dict[str, Any], out: dict[str, Any]) -> bool:
    """Check one agent's work again and land it. True when it is on the phase branch."""
    lane = load_lane(out["lane"], repo)
    base, head, branch = working_branch(plan), out["head_commit"], out["branch"]
    code, listing = _git(repo, "diff", "--name-only", f"{out['base_commit']}...{head}")
    files = [line for line in listing.splitlines() if line] if code == 0 else []
    tree = worktree.Tree(out["run_id"], Path(out["worktree"]), branch, out["base_commit"])
    if not files:
        _say(repo, "step", f"{lane.name}: nothing to land")
        worktree.remove(tree, True, repo)
        return True
    outside = violations(lane, files)
    if outside:
        alerts.notify(
            "guardrail",
            f"{lane.name} changed paths it does not own: {outside[:5]}",
            lane.name,
            out["run_id"],
            repo,
        )
        return False
    held = needs_founder(files)
    if held or job.get("merge") is False:
        why = ", ".join(held) if held else "the plan keeps this lane for the founder"
        _say(
            repo,
            "blocked",
            f"{lane.name}: {len(files)} files on {branch}, waiting for the founder ({why})",
        )
        worktree.remove(tree, False, repo)
        return True
    message = (
        f"merge({lane.name}): {len(files)} files\n\nFactory-Run: {out['run_id']}\n"
        f"Factory-Task: {out['task']}\nFactory-Agent: {out['agent']}\n"
        f"Factory-Trace: {', '.join(out['sessions'])}\n"
        f"Factory-Ledger: {ledger.head(repo)}\n\n{TRAILER}"
    )
    code, text = _git(repo, "merge", "--no-ff", "-q", "-m", message, head)
    ok = code == 0
    if not ok:
        _git(repo, "merge", "--abort")
        alerts.notify(
            "failed", f"{lane.name}: merge conflict: {text[:160]}", lane.name, out["run_id"], repo
        )
    if ok:
        ledger.append(
            lane.name,
            "orchestrator",
            "merge",
            f"merged {len(files)} files into {base}",
            repo,
            run_id=out["run_id"],
            sessions=out["sessions"],
            head=head,
        )
        print(f"[merge] {lane.name}: {len(files)} files into {base}", flush=True)
        worktree.remove(tree, True, repo)
    return ok


def working_branch(plan: dict[str, Any]) -> str:
    """Where lanes land. With pull requests, a branch of its own beside the phase branch."""
    return f"work/{plan['branch']}" if plan["merge"] == "pr" else str(plan["branch"])


def checkpoint(repo: Path, plan: dict[str, Any], name: str) -> bool:
    """Send what has landed to the phase branch through a pull request.

    The phase branch only ever receives work that clean CI has passed. Rounds whose work is
    not expected to pass yet, such as tests written before the code, set checkpoint: false
    and travel with the next round that does.
    """
    target, work = plan["branch"], working_branch(plan)
    code, ahead = _git(repo, "rev-list", "--count", f"{target}..{work}")
    if code == 0 and ahead.strip() == "0":
        return True
    title = f"{target}: round {name}"
    _, log = _git(repo, "log", "--merges", "--format=- %s", f"{target}..{work}")
    body = (
        f"Work landed by the factory up to round {name}.\n\n{log}\n\n"
        f"Factory-Ledger: {ledger.head(repo)}\n\n"
        f"{chr(0x1F916)} Generated with [Claude Code](https://claude.com/claude-code)"
    )
    steps = [
        ("push the phase branch", _git(repo, "push", "-q", "origin", target)),
        ("push the working branch", _git(repo, "push", "-q", "--force-with-lease", "origin", work)),
    ]
    if not any(code for _, (code, _) in steps):
        steps.append(
            (
                "open the pull request",
                _gh(
                    repo,
                    "pr",
                    "create",
                    "--base",
                    target,
                    "--head",
                    work,
                    "--title",
                    title,
                    "--body",
                    body,
                ),
            )
        )
    for what, (code, text) in steps:
        if code:
            alerts.notify("failed", f"could not {what}: {text[:160]}", cwd=repo)
            return False
    _say(repo, "step", f"pull request opened for round {name}; waiting for clean CI")
    time.sleep(10)  # give CI a moment to register its checks
    code, text = _gh(repo, "pr", "checks", work, "--watch", "--fail-fast", "--interval", "15")
    if code:
        alerts.notify("failed", f"clean CI did not pass for round {name}: {text[-200:]}", cwd=repo)
        return False
    code, text = _gh(
        repo,
        "pr",
        "merge",
        work,
        "--merge",
        "--subject",
        title,
        "--body",
        f"Factory-Ledger: {ledger.head(repo)}\n\n{TRAILER}",
    )
    if code:
        alerts.notify("failed", f"could not merge the pull request: {text[:160]}", cwd=repo)
        return False
    for args in (
        ("fetch", "-q", "origin", target),
        ("branch", "-f", target, f"origin/{target}"),
        ("merge", "-q", "--ff-only", f"origin/{target}"),
    ):
        code, text = _git(repo, *args)
        if code:
            alerts.notify("failed", f"could not bring {target} back: {text[:160]}", cwd=repo)
            return False
    _say(repo, "merge", f"round {name} is on {target}; clean CI passed")
    return True


def check_review(repo: Path, job: dict[str, Any], out: dict[str, Any]) -> bool:
    """A reviewer's scores must match the schema, and the decision must follow from them."""
    path = Path(out["worktree"]) / "reviews" / "REVIEW.json"
    if not path.exists():
        path = repo / "reviews" / "REVIEW.json"
    try:
        review = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as err:
        alerts.notify(
            "failed", f"the review has no readable scores: {err}", out["lane"], out["run_id"], repo
        )
        return False
    problems = review_problems(review, repo)
    if problems:
        alerts.notify(
            "failed",
            f"the review was refused: {problems[0][:160]}",
            out["lane"],
            out["run_id"],
            repo,
        )
        return False
    scores = {name: line["score"] for name, line in review["scores"].items()}
    with (state_dir(repo) / "reviews.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(
            json.dumps(
                {
                    "at": SystemClock().now().isoformat(timespec="seconds"),
                    "run_id": out["run_id"],
                    "commit": review["reviewed_commit"],
                    "scores": scores,
                    "decision": review["decision"],
                    "task": job["task"],
                }
            )
            + "\n"
        )
    _say(repo, "step", f"review: {review['decision']}, scores {scores}")
    if review["decision"] != "APPROVE":
        alerts.notify(
            "eval_drop", f"the reviewer vetoed: {scores}", out["lane"], out["run_id"], repo
        )
    return bool(review["decision"] == "APPROVE")


def run_checks(repo: Path, checks: list[dict[str, str]]) -> bool:
    results: dict[str, str] = {}
    env = sandbox.environment(dict(os.environ), repo, repo, "founder", "checks", "")
    env.pop("UV_CACHE_DIR", None)
    env.pop("UV_OFFLINE", None)
    extra = [Path(p) for p in sandbox.tool_scratch(repo)]
    cache = Path.home() / ".cache"
    for check in checks:
        done = jail.run(
            check["run"], repo, env, timeout_seconds=1800, extra_writable=[*extra, cache]
        )
        results[check["name"]] = "pass" if done.code == 0 else "fail"
        if done.code:
            tail = " | ".join(done.output.strip().splitlines()[-3:])[:300]
            _say(repo, "failed", f"check {check['name']} fails: {tail}")
    (state_dir(repo) / "gates.json").write_text(
        json.dumps({"at": SystemClock().now().isoformat(timespec="seconds"), "results": results})
    )
    return all(v == "pass" for v in results.values())


def run_round(repo: Path, plan: dict[str, Any], rnd: dict[str, Any], skip_agents: bool) -> bool:
    name = rnd["name"]
    jobs = [] if skip_agents else rnd["lanes"]
    _say(repo, "start", f"round {name}: " + ", ".join(j["lane"] for j in rnd["lanes"]))
    runs = state_dir(repo) / "runs"
    runs.mkdir(exist_ok=True)
    procs = []
    for job in jobs:
        result = runs / f"result-{job['task'].replace('/', '_')}.json"
        result.unlink(missing_ok=True)
        cmd = [
            sys.executable,
            "-m",
            "tools.factory.agent_run",
            "--lane",
            job["lane"],
            "--agent",
            job["agent"],
            "--task",
            job["task"],
            "--spec",
            plan["spec"],
            "--mission",
            " ".join(job["mission"].split()),
            "--done",
            job["done"],
            "--base",
            plan["branch"],
            "--result",
            str(result),
        ]
        env = {**os.environ, "PYTHONPATH": str(REPO_ROOT)}
        procs.append((job, result, subprocess.Popen(cmd, cwd=repo, env=env)))
    ok = True
    outcomes = []
    for job, result, proc in procs:
        proc.wait()
        try:
            out = json.loads(result.read_text())
        except (OSError, json.JSONDecodeError):
            out = {"status": "failed", "reason": "the run left no result", "lane": job["lane"]}
        outcomes.append((job, out))
        if out["status"] != "done":
            ok = False
            _say(repo, "failed", f"{job['lane']}: {out['status']}: {out.get('reason', '')}"[:300])
    for job, out in outcomes:
        if out["status"] != "done":
            continue
        if job["agent"] == "reviewer" and not check_review(repo, job, out):
            ok = False
        ok = land(repo, plan, job, out) and ok
    ok = run_checks(repo, rnd.get("checks", [])) and ok
    if ok and plan["merge"] == "pr" and rnd.get("checkpoint", True):
        ok = checkpoint(repo, plan, name)
    if ok:
        _say(repo, "done", f"round {name} complete")
    else:
        _say(repo, "blocked", f"round {name} stopped. Fix, then rerun with --from-round {name}")
    return ok


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("plan")
    parser.add_argument("--from-round", default="")
    parser.add_argument("--only-round", default="")
    parser.add_argument("--checks-only", default="")
    args = parser.parse_args()
    repo = main_repo(Path.cwd())
    try:
        plan = load_plan(Path(args.plan), repo)
    except (PlanError, OSError, ValueError) as err:
        print(f"plan refused: {err}")
        return 1
    branch = working_branch(plan)
    _, dirty = _git(repo, "status", "--porcelain", "--untracked-files=no")
    if dirty:
        print("commit or put away your changes first; agents start from what is committed")
        return 1
    _, head = _git(repo, "rev-parse", "--abbrev-ref", "HEAD")
    if plan["merge"] == "pr" and head in {plan["branch"], branch}:
        code, _ = _git(repo, "rev-parse", "--verify", "-q", branch)
        step = ("checkout", "-q", branch) if code == 0 else ("checkout", "-q", "-b", branch)
        _git(repo, *step)
        _, head = _git(repo, "rev-parse", "--abbrev-ref", "HEAD")
    if head != branch:
        print(f"check out {plan['branch']} first")
        return 1
    try:
        registry.claim(
            f"orchestrator-{os.getpid()}",
            f"orchestrator:{branch}",
            f"orchestrate:{branch}",
            str(repo),
            "",
            "orchestrator",
            repo,
        )
    except (registry.ClaimError, registry.StoppedError) as err:
        print(f"refused: {err}")
        return 1
    try:
        started = not args.from_round
        for rnd in plan["rounds"]:
            if args.only_round and rnd["name"] != args.only_round:
                continue
            if not started:
                if rnd["name"] != args.from_round:
                    continue
                started = True
            if registry.stopped(repo):
                _say(repo, "blocked", "the factory is stopped")
                return 1
            if not run_round(repo, plan, rnd, rnd["name"] == args.checks_only):
                return 1
        _say(
            repo,
            "done",
            f"plan complete on {plan['branch']}. "
            "Merging into a protected branch is the founder's step.",
        )
        return 0
    finally:
        registry.release(f"orchestrator-{os.getpid()}", repo)


if __name__ == "__main__":
    sys.exit(main())
