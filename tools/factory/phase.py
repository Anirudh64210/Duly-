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
from collections.abc import Callable
from functools import partial
from pathlib import Path
from typing import Any

import yaml

from engine.clocks import SystemClock
from tools.diff_policy.check import load_lane, violations
from tools.factory import alerts, billing, jail, ledger, registry, sandbox, worktree
from tools.factory.config import load_config, review_problems
from tools.factory.paths import REPO_ROOT, main_repo, state_dir

TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
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
    agents = [job["agent"] for rnd in plan["rounds"] for job in rnd["lanes"]]
    if plan.get("audited", True) and "auditor" not in agents:
        raise PlanError("the plan has no audit: its last round must run the auditor")
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


# Errors from the network or GitHub that pass on their own; a remote step is tried again.
TRANSIENT = (
    "Permission denied (publickey)",
    "Could not read from remote repository",
    "Connection reset",
    "Connection closed",
    "Connection refused",
    "timed out",
    "Could not resolve host",
    "error connecting to api.github.com",
    "HTTP 502",
    "HTTP 503",
    "HTTP 504",
    "unexpected EOF",
)


def _remote(call: Callable[[], tuple[int, str]]) -> tuple[int, str]:
    """Run a step that talks to the remote, again after a wait while it fails transiently.

    A push was once refused with Permission denied (publickey) and passed a minute later
    with nothing changed. Three more tries, 5, 20 and 60 seconds apart, before the step is
    reported as failed; an error that is not on the list is reported at once.
    """
    waits = [float(w) for w in os.environ.get("DULY_RETRY_SECONDS", "5,20,60").split(",") if w]
    code, text = call()
    for wait in waits:
        if code == 0 or not any(sign in text for sign in TRANSIENT):
            break
        time.sleep(wait)
        code, text = call()
    return code, text


# How long CI may take to register checks on a pushed commit, and to finish them.
CI_REGISTER_SECONDS = 600
CI_FINISH_SECONDS = 3600
PASSED = {"SUCCESS", "NEUTRAL", "SKIPPED"}


def open_pull_request(repo: Path, target: str, work: str, title: str, body: str) -> tuple[int, str]:
    """Open the pull request from work into target, or bring the one already open up to date.

    A round that is run again after a failure finds its first pull request still open;
    GitHub allows one per pair of branches, so that one is used.
    """
    code, text = _remote(
        lambda: _gh(
            repo,
            "pr",
            "list",
            "--head",
            work,
            "--base",
            target,
            "--state",
            "open",
            "--json",
            "number",
        )
    )
    if code:
        return code, text
    try:
        already = json.loads(text or "[]")
    except json.JSONDecodeError:
        return 1, f"gh pr list gave no JSON: {text[:120]}"
    if already:
        return _remote(lambda: _gh(repo, "pr", "edit", work, "--title", title, "--body", body))
    return _remote(
        lambda: _gh(
            repo, "pr", "create", "--base", target, "--head", work, "--title", title, "--body", body
        )
    )


def _check_state(check: dict[str, Any]) -> str:
    """pending, passed or failed, for a check run or a commit status of statusCheckRollup."""
    if check.get("__typename") == "StatusContext":
        state = str(check.get("state", "")).upper()
        return (
            "pending"
            if state in {"PENDING", "EXPECTED", ""}
            else ("passed" if state in PASSED else "failed")
        )
    if str(check.get("status", "")).upper() != "COMPLETED":
        return "pending"
    return "passed" if str(check.get("conclusion", "")).upper() in PASSED else "failed"


def wait_for_ci(repo: Path, work: str, sha: str) -> tuple[bool, str]:
    """Wait for every check on the commit sha, the head of work, and say whether all passed.

    Only the checks of that exact commit are read. Right after a push, GitHub may still
    show the pull request at its earlier head, with that commit's results; those are never
    taken for the new commit's.
    """
    poll = float(os.environ.get("DULY_CI_POLL_SECONDS", "15"))
    began = time.monotonic()
    seen = False
    while True:
        waited = time.monotonic() - began
        code, text = _gh(repo, "pr", "view", work, "--json", "headRefOid,statusCheckRollup")
        if code == 0:
            view = json.loads(text or "{}")
            checks = view.get("statusCheckRollup") or []
            if view.get("headRefOid") == sha and checks:
                seen = True
                states = [_check_state(c) for c in checks]
                if "failed" in states:
                    names = [
                        str(c.get("name") or c.get("context"))
                        for c, st in zip(checks, states, strict=True)
                        if st == "failed"
                    ]
                    return False, f"failed on {sha[:10]}: {', '.join(names)}"
                if all(st == "passed" for st in states):
                    return True, f"{len(checks)} checks passed on {sha[:10]}"
        if not seen and waited > CI_REGISTER_SECONDS:
            return (
                False,
                f"no CI checks registered on {sha[:10]} in {CI_REGISTER_SECONDS // 60} minutes",
            )
        if waited > CI_FINISH_SECONDS:
            return False, f"CI did not finish on {sha[:10]} in {CI_FINISH_SECONDS // 60} minutes"
        time.sleep(poll)


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

    The phase branch only ever receives work that clean CI has passed. By default a plan
    reaches it once, at its last round; a round may set checkpoint: true to land sooner.
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
        ("push the phase branch", _remote(lambda: _git(repo, "push", "-q", "origin", target))),
        (
            "push the working branch",
            _remote(lambda: _git(repo, "push", "-q", "--force-with-lease", "origin", work)),
        ),
    ]
    if not any(code for _, (code, _) in steps):
        steps.append(("open the pull request", open_pull_request(repo, target, work, title, body)))
    for what, (code, text) in steps:
        if code:
            alerts.notify("failed", f"could not {what}: {text[:160]}", cwd=repo)
            return False
    _, sha = _git(repo, "rev-parse", work)
    _say(repo, "step", f"pull request ready for round {name}; waiting for clean CI on {sha[:10]}")
    passed, detail = wait_for_ci(repo, work, sha.strip())
    if not passed:
        alerts.notify("failed", f"clean CI did not pass for round {name}: {detail}", cwd=repo)
        return False
    _say(repo, "step", f"clean CI for round {name}: {detail}")
    merge_body = f"Factory-Ledger: {ledger.head(repo)}\n\n{TRAILER}"
    code, text = _remote(
        lambda: _gh(repo, "pr", "merge", work, "--merge", "--subject", title, "--body", merge_body)
    )
    if code:
        alerts.notify("failed", f"could not merge the pull request: {text[:160]}", cwd=repo)
        return False
    for args in (
        ("fetch", "-q", "origin", target),
        ("branch", "-f", target, f"origin/{target}"),
        ("merge", "-q", "--ff-only", f"origin/{target}"),
    ):
        code, text = _remote(partial(_git, repo, *args))
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


def briefing(plan: dict[str, Any], rnd: dict[str, Any], job: dict[str, Any]) -> str:
    """A lane's mission with the whole picture before it: what the plan is for, and what the
    lanes beside it are doing. A lane that sees only its own slice solves it in full, even
    when the whole needs much less."""
    beside = [
        f"{j['lane']}: {' '.join(str(j['mission']).split())[:160]}"
        for j in rnd["lanes"]
        if j["lane"] != job["lane"]
    ]
    parts = (
        [f"The whole picture: {' '.join(str(plan['goal']).split())}"] if plan.get("goal") else []
    )
    if beside:
        parts.append("Beside you in this round: " + " | ".join(beside))
    parts.append("Your part: " + " ".join(str(job["mission"]).split()))
    return "\n\n".join(parts)


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
            briefing(plan, rnd, job),
            "--done",
            job["done"],
            "--base",
            working_branch(plan),
            "--protect",
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
    # One pull request and one CI run per plan, at its last round, unless a round asks for
    # its own: a CI run after every round cost 13 waits in one day for one feature.
    last = rnd is plan["rounds"][-1]
    if ok and plan["merge"] == "pr" and rnd.get("checkpoint", last):
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
    from tools.factory import preflight  # imports this module

    faults = preflight.problems(Path(args.plan).resolve(), repo, ref="HEAD")
    if faults:
        print("plan refused by preflight:\n  " + "\n  ".join(faults))
        return 1
    if not os.environ.get("DULY_CLAUDE_BIN"):
        try:
            plan_name = billing.require_subscription()
        except billing.BillingError as err:
            print(f"refused: {err}")
            return 1
        print(f"Running on the {plan_name} subscription login. No key is in use.", flush=True)
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
