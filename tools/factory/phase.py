"""Run a plan: rounds of agents in parallel, each in its own worktree.

After a round, each agent's work is checked again by the orchestrator and lands on the
phase branch as one merge, either through a pull request that clean CI must pass, or
locally. The working agent never merges. Nothing here ever merges into a protected
branch: that is the founder's step.

A round may also have steps: a command the orchestrator runs itself, with no agent, for
work that needs no thinking, such as regenerating samples. On a Mac the plan runs under
caffeinate, so the machine stays awake while agents work.

Usage: uv run python -m tools.factory.phase specs/phase-2/plan.yaml [--from-round X]
           [--only-round X] [--checks-only X]
"""

import argparse
import fnmatch
import json
import os
import re
import shutil
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
from tools.factory import (
    alerts,
    billing,
    causes,
    efficiency,
    health,
    jail,
    ledger,
    registry,
    sandbox,
    worktree,
)
from tools.factory.config import is_blocking, load_config, review_problems, spec_point
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
    # The plan's name files its runs, reviews and stops: the directory under specs/ it sits in,
    # since one branch may carry the plans of several features.
    plan.setdefault(
        "name", path.parent.name if path.parent.parent.name == "specs" else plan["branch"]
    )
    plan.setdefault("merge", "local")
    plan.setdefault("file", _plan_key(repo, path))
    if plan["merge"] not in {"local", "pr"}:
        raise PlanError("merge is local or pr")
    for rnd in plan["rounds"]:
        rnd.setdefault("lanes", [])
        rnd.setdefault("steps", [])
    agents = [job["agent"] for rnd in plan["rounds"] for job in rnd["lanes"]]
    if plan.get("audited", True) and "auditor" not in agents:
        raise PlanError("the plan has no audit: its last round must run the auditor")
    seen: set[str] = set()
    for rnd in plan["rounds"]:
        lanes = [job["lane"] for job in rnd["steps"] + rnd["lanes"]]
        if len(lanes) != len(set(lanes)):
            raise PlanError(f"round {rnd['name']} uses a lane twice")
        if len(rnd["lanes"]) > config["limits"]["max_parallel_agents"]:
            raise PlanError(f"round {rnd['name']} has more agents than the factory allows at once")
        for step in rnd["steps"]:
            for key in ("lane", "run"):
                if not str(step.get(key, "")).strip():
                    raise PlanError(f"round {rnd['name']}: a step has no {key}")
        for job in rnd["lanes"]:
            for key in ("lane", "agent", "mission", "done"):
                if not str(job.get(key, "")).strip():
                    raise PlanError(f"round {rnd['name']}: a lane has no {key}")
        for job in rnd["steps"] + rnd["lanes"]:
            job.setdefault("task", f"{plan['name']}/{rnd['name']}/{job['lane']}")
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


def _say(repo: Path, kind: str, message: str, **extra: Any) -> dict[str, Any]:
    row = ledger.append("founder", "orchestrator", kind, message, repo, **extra)
    print(f"[{kind}] {message}", flush=True)
    return row


def _where(plan: dict[str, Any], round_name: str = "") -> dict[str, Any]:
    """The fields that let a plan be found again: its name, its file, the round and the pid
    of the runner. The reaper and resume read them."""
    return {
        "plan": plan.get("name") or plan["branch"],
        "plan_file": plan.get("file", ""),
        "round": round_name,
        "pid": os.getpid(),
    }


# Where a round stopped, in the order a round runs.
STAGES = ("lane", "review", "merge", "checks", "ci")


def _stop(
    repo: Path,
    plan: dict[str, Any],
    message: str,
    cause: str = "unknown",
    stage: str | None = None,
    signature: str | None = None,
    round_name: str = "",
) -> None:
    """A stop always carries a cause, so make efficiency can count stops by cause, and the
    stage it stopped at. A cause the orchestrator proved from the failure's text is auto;
    otherwise it is unknown until the founder names it, which handled records as human."""
    if cause not in efficiency.CAUSES:
        raise ValueError(f"unknown cause {cause}")
    if stage is not None and stage not in STAGES:
        raise ValueError(f"unknown stage {stage}")
    ledger.append(
        "founder",
        "orchestrator",
        "blocked",
        message,
        repo,
        **_where(plan, round_name),
        cause=cause,
        cause_source=causes.source(cause),
        signature=signature,
        stage=stage,
    )
    print(f"[blocked] {message}", flush=True)


def _running(row: dict[str, Any]) -> bool:
    """Whether the process id a row records is alive. A missing or malformed one is not."""
    try:
        return registry.alive(int(row.get("pid") or 0))
    except (TypeError, ValueError, OverflowError, OSError):
        return False


def reap(repo: Path) -> list[str]:
    """Write interrupted for every run and every plan whose process is gone with no end row.

    Sleep, a killed runner or a closed lid left runs that never ended, which nobody could
    count or resume. A run is gone only when its registry claim is gone and the process id
    its row records is not alive, so a lost claim never marks a live run. Runs at every
    factory start. Returns the run ids and plan files reaped.
    """
    events = ledger.read(repo)
    live = registry.active(repo)
    ended = {str(r["run_id"]) for r in events if r.get("run_id") and r.get("kind") in END_KINDS}
    reaped: list[str] = []
    for row in events:
        run = str(row.get("run_id") or "")
        if row.get("kind") != "start" or not run or run in ended or run in live or _running(row):
            continue
        ended.add(run)
        ledger.append(
            str(row.get("lane", "")),
            "orchestrator",
            "blocked",
            f"interrupted: run {run} has no end row and its process is gone",
            repo,
            run_id=run,
            plan=str(row.get("plan") or str(row.get("task", "")).split("/")[0]),
            cause="interrupted",
            cause_source="auto",
        )
        reaped.append(run)
    for key, row in _last_plan_rows(events).items():
        # A runner's claim is named for its pid and dropped once that pid is dead, so a live
        # pid covers both halves of the test.
        if row["kind"] == "blocked" or row.get("closed") or _running(row):
            continue
        ledger.append(
            "founder",
            "orchestrator",
            "blocked",
            f"round {row['round']} interrupted: the plan's runner is gone. Run make resume",
            repo,
            plan=row["plan"],
            plan_file=key,
            round=row["round"],
            pid=row.get("pid"),
            cause="interrupted",
            cause_source="auto",
            signature=None,
            stage=None,
        )
        reaped.append(key)
    return reaped


END_KINDS = ("done", "failed", "blocked")


def _last_plan_rows(events: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Each plan file's newest row from its runner, the plans ordered by that row."""
    last: dict[str, dict[str, Any]] = {}
    for row in events:
        key = row.get("plan_file")
        if key and row.get("lane") == "founder" and row.get("round") is not None:
            last.pop(key, None)
            last[key] = row
    return last


def parked(events: list[dict[str, Any]]) -> tuple[str, str] | None:
    """The plan file and round of the last plan that stopped and has not run since: parked
    for a person, or interrupted. None when every plan ran to its end."""
    for key, row in reversed(_last_plan_rows(events).items()):
        if row["kind"] == "blocked" and row.get("round"):
            return str(key), str(row["round"])
    return None


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
        # Held for the founder's approval, which is not a stop: the plan goes on.
        why = ", ".join(held) if held else "the plan keeps this lane for the founder"
        _say(
            repo,
            "held",
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


def _append(repo: Path, name: str, rows: list[dict[str, Any]]) -> None:
    with (state_dir(repo) / name).open("a", encoding="utf-8") as handle:
        handle.writelines(json.dumps(row) + "\n" for row in rows)


def check_review(repo: Path, job: dict[str, Any], out: dict[str, Any]) -> bool:
    """A reviewer's findings go to findings.jsonl, so that a kind seen three times becomes a
    check; then the review must pass the one rule in config.review_problems.
    """
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
    at = SystemClock().now().isoformat(timespec="seconds")
    plan = str(job["task"]).split("/")[0]
    # Every finding is kept, those of a review that is refused below too.
    listed = review.get("findings") if isinstance(review, dict) else None
    findings = [
        {
            "at": at,
            "id": f"{out['run_id']}-{n}",
            "plan": plan,
            "commit": review.get("reviewed_commit"),
            "kind": str(f.get("kind") or "other"),
            "file": f.get("file"),
            "input": f.get("input"),
            "title": f.get("title"),
            "severity": f.get("severity"),
            "blocking": is_blocking(f),
            "spec_point": spec_point(f),
        }
        for n, f in enumerate(listed if isinstance(listed, list) else [], 1)
        if isinstance(f, dict)
    ]
    _append(repo, "findings.jsonl", findings)
    problems = review_problems(review, repo)
    if problems:
        alerts.notify(
            "failed",
            f"the review was refused: {problems[0][:200]}",
            out["lane"],
            out["run_id"],
            repo,
        )
        return False
    scores = {name: line["score"] for name, line in review["scores"].items()}
    row = {
        "at": at,
        "run_id": out["run_id"],
        "plan": plan,
        "commit": review["reviewed_commit"],
        "scores": scores,
        "decision": review["decision"],
        "task": job["task"],
    }
    _append(repo, "reviews.jsonl", [row])
    _say(repo, "step", f"review: {review['decision']}, scores {scores}")
    if review["decision"] != "APPROVE":
        blocking = sum(f["blocking"] for f in findings)
        alerts.notify(
            "veto",
            f"{blocking} blocking findings, scores {scores}",
            out["lane"],
            out["run_id"],
            repo,
        )
    return bool(review["decision"] == "APPROVE")


def _jailed(repo: Path, command: str) -> jail.Result:
    """Run a command of the orchestrator's own, a check or a step, in the jail in the repo."""
    env = sandbox.environment(dict(os.environ), repo, repo, "founder", "checks", "")
    env.pop("UV_CACHE_DIR", None)
    env.pop("UV_OFFLINE", None)
    extra = [Path(p) for p in sandbox.tool_scratch(repo)]
    cache = Path.home() / ".cache"
    return jail.run(command, repo, env, timeout_seconds=1800, extra_writable=[*extra, cache])


def _tail(output: str) -> str:
    return " | ".join(output.strip().splitlines()[-3:])[:300]


def _check_once(repo: Path, command: str) -> tuple[bool, str]:
    done = _jailed(repo, command)
    return done.code == 0, done.output


def run_checks(repo: Path, checks: list[dict[str, str]]) -> bool:
    """Run the round's checks after its merges. A check that fails is run once more, and a
    pass then is a flake (health.retry_once)."""
    results: dict[str, str] = {}
    for check in checks:
        tried = health.retry_once(
            partial(_check_once, repo, check["run"]), f"check.{check['name']}", repo
        )
        results[check["name"]] = "pass" if tried.ok else "fail"
        if not tried.ok:
            _say(repo, "failed", f"check {check['name']} fails: {_tail(tried.text)}")
    (state_dir(repo) / "gates.json").write_text(
        json.dumps({"at": SystemClock().now().isoformat(timespec="seconds"), "results": results})
    )
    return all(v == "pass" for v in results.values())


def _changed(repo: Path) -> set[str]:
    _, text = _git(repo, "ls-files", "--modified", "--others", "--exclude-standard")
    return {line for line in text.splitlines() if line}


def run_step(repo: Path, plan: dict[str, Any], step: dict[str, str]) -> bool:
    """Run a round step and commit what it changes on the working branch.

    A lane whose whole mission was to run one command cost a full agent session. The
    orchestrator runs the command in the jail instead. The step's lane must own every path the
    command changed, and nothing it changed may need the founder; otherwise the changes are
    left in the working tree for the founder and the round stops.
    """
    lane = load_lane(step["lane"], repo)
    before = _changed(repo)
    done = _jailed(repo, step["run"])
    if done.code:
        _say(repo, "failed", f"step {lane.name} fails: {_tail(done.output)}")
        return False
    files = sorted(_changed(repo) - before)
    if not files:
        _say(repo, "step", f"step {lane.name}: nothing changed")
        return True
    refused = violations(lane, files) or [f for hits in needs_founder(files).values() for f in hits]
    if refused:
        alerts.notify(
            "guardrail",
            f"step {lane.name} changed {refused[:5]}, which it may not; left in the working tree",
            lane.name,
            cwd=repo,
        )
        return False
    message = (
        f"step({lane.name}): {len(files)} files\n\nFactory-Task: {step['task']}\n"
        f"Factory-Command: {step['run']}\nFactory-Ledger: {ledger.head(repo)}\n\n{TRAILER}"
    )
    code, text = _git(repo, "add", "--all", "--", *files)
    if code == 0:
        code, text = _git(repo, "commit", "-q", "-m", message)
    if code:
        alerts.notify(
            "failed", f"step {lane.name}: could not commit: {text[:160]}", lane.name, cwd=repo
        )
        return False
    _say(repo, "merge", f"step {lane.name}: {len(files)} files into {working_branch(plan)}")
    return True


def _starts_file(repo: Path) -> Path:
    return state_dir(repo) / "plan-starts.json"


def _plan_key(repo: Path, plan_path: Path) -> str:
    path, root = plan_path.resolve(), repo.resolve()
    return str(path.relative_to(root)) if path.is_relative_to(root) else str(path)


def mark_start(repo: Path, plan_path: Path) -> None:
    """Record the branch head as the plan's first round starts, keyed by the plan's path."""
    path = _starts_file(repo)
    starts = json.loads(path.read_text()) if path.exists() else {}
    starts[_plan_key(repo, plan_path)] = _git(repo, "rev-parse", "HEAD")[1]
    path.write_text(json.dumps(starts, indent=2))


def landed_tasks(repo: Path, plan_path: Path) -> set[str]:
    """Tasks already on the working branch, from the Factory-Task lines of its commits.

    Only commits made since the plan's first round started count: other plans on the same
    branch may use the same task names, and the plan file may be committed again mid plan.
    """
    path = _starts_file(repo)
    since = json.loads(path.read_text()).get(_plan_key(repo, plan_path)) if path.exists() else ""
    if not since:
        return set()
    _, text = _git(repo, "log", "--format=%B", f"{since}..HEAD")
    return {m.strip() for m in re.findall(r"^Factory-Task: (.+)$", text, re.M)}


# Every lane's Bash sandbox refuses Unix socket binds by design (allowing them would expose
# system sockets such as docker.sock). The orchestrator runs the done command in its jail,
# which allows a socket inside the worktree, so a lane must not escalate for that alone. Two
# lanes stopped on it (W1 L-api, W2-P1 L-tests); every briefing now says so.
SANDBOX_NOTE = (
    "Your own Bash sandbox refuses Unix socket binds by design, so tests that bind one (for "
    "example tests/unit/desktop_entry/test_desktop_main.py) fail for you with Operation not "
    "permitted. That is not a fault in the code: do not escalate for it. Finish your work, make "
    "every other part of the done command pass, and report done; the orchestrator runs the done "
    "command in its jail, where those sockets are allowed, and tells you if anything fails there."
)


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
    parts.append(SANDBOX_NOTE)
    parts.append("Your part: " + " ".join(str(job["mission"]).split()))
    return "\n\n".join(parts)


def reusable_review(repo: Path) -> dict[str, Any] | None:
    """The review on the branch, when nothing but reviews/ changed since the commit it read.
    A plan resumed after its review round reuses that review instead of paying for another."""
    try:
        review = json.loads((repo / "reviews" / "REVIEW.json").read_text())
    except (OSError, json.JSONDecodeError):
        return None
    commit = str(review.get("reviewed_commit") or "") if isinstance(review, dict) else ""
    if not re.fullmatch(r"[0-9a-f]{7,40}", commit):
        return None
    code, text = _git(repo, "diff", "--name-only", commit, "HEAD")
    if code or any(not line.startswith("reviews/") for line in text.splitlines() if line):
        return None
    return dict(review)


def _cause(repo: Path, since: dict[str, Any], stage: str | None) -> tuple[str, str | None]:
    """The cause the round's failure texts prove, from every failure, alert and stop written
    since the round started; unknown when none is proved or two disagree."""
    rows = ledger.read(repo)
    seals = [r.get("hash") for r in rows]
    after = rows[seals.index(since["hash"]) + 1 :] if since.get("hash") in seals else []
    text = "\n".join(
        str(r.get("message", "")) for r in after if r.get("kind") in {"failed", "alert", "blocked"}
    )
    context = causes.Context(
        tuple(load_config(repo)["protected_branches"]), local_gates_green=stage == "ci"
    )
    return causes.classify(text, context)


def run_round(
    repo: Path,
    plan: dict[str, Any],
    rnd: dict[str, Any],
    skip_agents: bool,
    landed: frozenset[str] = frozenset(),
) -> bool:
    """Run a round's steps, then its agents, then its checks.

    Lanes whose task already landed are not run again. A review runs again unless the review
    on the branch read the code as it is now (reusable_review). A stop names the stage it
    stopped at and, when the failure text proves one, its cause.
    """
    name = rnd["name"]
    began = _say(
        repo,
        "start",
        f"round {name}: " + ", ".join(j["lane"] for j in rnd["steps"] + rnd["lanes"]),
        **_where(plan, name),
    )
    todo = [] if skip_agents else rnd["steps"] + rnd["lanes"]
    reviewed = any(j.get("agent") == "reviewer" and j["task"] in landed for j in todo)
    review = reusable_review(repo) if reviewed else None
    again = [
        j
        for j in todo
        if j["task"] not in landed or (j.get("agent") == "reviewer" and review is None)
    ]
    if len(again) < len(todo):
        done = ", ".join(j["lane"] for j in todo if j not in again)
        _say(repo, "step", f"round {name}: already on the branch, not run again: {done}")
    stage: str | None = None
    if review is not None:
        _say(repo, "step", f"review of {review['reviewed_commit']} reused: {review['decision']}")
        if review["decision"] != "APPROVE":
            stage = "review"
    ok = stage is None and all(run_step(repo, plan, s) for s in again if "run" in s)
    if stage is None and not ok:
        stage = "lane"
    jobs = [j for j in again if "agent" in j] if ok else []
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
        env = {**os.environ, "PYTHONPATH": str(REPO_ROOT), "DULY_PLAN": str(plan["name"])}
        procs.append((job, result, subprocess.Popen(cmd, cwd=repo, env=env)))
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
            stage = stage or "lane"
            _say(repo, "failed", f"{job['lane']}: {out['status']}: {out.get('reason', '')}"[:300])
    for job, out in outcomes:
        if out["status"] != "done":
            continue
        if job["agent"] == "reviewer" and not check_review(repo, job, out):
            ok = False
            stage = stage or "review"
        if not land(repo, plan, job, out):
            ok = False
            stage = stage or "merge"
    # A round that already failed stops here: its checks could only say so again, slowly.
    if ok and not run_checks(repo, rnd.get("checks", [])):
        ok, stage = False, "checks"
    # One pull request and one CI run per plan, at its last round, unless a round asks for
    # its own: a CI run after every round cost 13 waits in one day for one feature.
    last = rnd is plan["rounds"][-1]
    if ok and plan["merge"] == "pr" and rnd.get("checkpoint", last):
        ok = checkpoint(repo, plan, name)
        stage = None if ok else "ci"
    if ok:
        _say(repo, "done", f"round {name} complete", **_where(plan, name))
    else:
        cause, signature = _cause(repo, began, stage)
        _stop(
            repo,
            plan,
            f"round {name} stopped. Fix, then rerun with --from-round {name}",
            cause,
            stage,
            signature,
            name,
        )
    return ok


def write_scorecard(repo: Path, name: str) -> Path | None:
    """At plan close, keep the plan's scorecard in .factory/scorecards/<plan>.json. A card
    that cannot be written is said, and never fails the plan that already landed."""
    try:
        return efficiency.write_scorecard(name, state_dir(repo), repo)
    except (OSError, ValueError, KeyError, TypeError) as err:
        _say(repo, "step", f"scorecard for {name} not written: {err}")
        return None


def stay_awake(argv: list[str]) -> None:
    """On a Mac, run this plan again under caffeinate, so the Mac does not sleep while agents
    work. It slept in 16 minute cycles during two plans, and 2.65 hours fell inside runs."""
    tool = shutil.which("caffeinate")
    if sys.platform != "darwin" or not tool or os.environ.get("DULY_AWAKE"):
        return
    command = [tool, "-dimsu", sys.executable, "-m", "tools.factory.phase", *argv]
    os.execve(tool, command, {**os.environ, "DULY_AWAKE": "1"})  # noqa: S606


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    stay_awake(argv)
    parser = argparse.ArgumentParser()
    parser.add_argument("plan")
    parser.add_argument("--from-round", default="")
    parser.add_argument("--only-round", default="")
    parser.add_argument("--checks-only", default="")
    args = parser.parse_args(argv)
    repo = main_repo(Path.cwd())
    reap(repo)
    worktree.prune(repo)
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
    if not faults and not os.environ.get("DULY_CLAUDE_BIN"):
        faults = preflight.baseline(repo)
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
    landed = frozenset(landed_tasks(repo, Path(args.plan)) if args.from_round else ())
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
                _stop(repo, plan, "the factory is stopped", round_name=rnd["name"])
                return 1
            if rnd is plan["rounds"][0] and not args.from_round:
                mark_start(repo, Path(args.plan))
            if not run_round(repo, plan, rnd, rnd["name"] == args.checks_only, landed):
                return 1
        _say(
            repo,
            "done",
            f"plan complete on {plan['branch']}. "
            "Merging into a protected branch is the founder's step.",
            **_where(plan),
            closed=True,
        )
        write_scorecard(repo, str(plan["name"]))
        return 0
    finally:
        registry.release(f"orchestrator-{os.getpid()}", repo)


if __name__ == "__main__":
    sys.exit(main())
