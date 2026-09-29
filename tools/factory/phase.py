"""Run a phase: rounds of lanes in parallel, each lane in its own worktree.

After each round, every lane's branch is checked against the diff policy and
merged into the phase branch. A lane that touched a path it does not own is not
merged.

Usage: uv run python -m tools.factory.phase specs/phase-2/plan.yaml [--from-round B]
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml

from engine.clocks import SystemClock
from tools.diff_policy.check import load_lane, violations
from tools.factory.log import append, factory_dir

REPO_ROOT = Path(__file__).resolve().parents[2]
GIT_ID = ["-c", "user.name=Duly factory", "-c", "user.email=factory@duly.invalid"]
TRAILER = "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"


def _run(cmd: list[str], cwd: Path) -> tuple[int, str]:
    env = dict(os.environ)
    env["UV_PROJECT_ENVIRONMENT"] = str(REPO_ROOT / ".venv")
    done = subprocess.run(cmd, cwd=cwd, env=env, check=False, capture_output=True, text=True)
    return done.returncode, done.stdout + done.stderr


def _say(kind: str, message: str) -> None:
    append("founder", "orchestrator", kind, message, REPO_ROOT)
    print(f"[{kind}] {message}", flush=True)


def _hide_holdout(tree: Path) -> None:
    """Implementation lanes never see the hidden tests."""
    _, out = _run(["git", "ls-files", "tests/holdout"], tree)
    for rel in out.split():
        if rel.endswith((".gitkeep", "README.md")):
            continue
        _run(["git", "update-index", "--skip-worktree", rel], tree)
        (tree / rel).unlink(missing_ok=True)


def _launch(job: dict[str, Any], spec: str, base: str) -> subprocess.Popen[str]:
    lane = job["lane"]
    tree = REPO_ROOT.parent / f"duly-{lane}"
    if tree.exists():
        _run(["git", "worktree", "remove", "--force", str(tree)], REPO_ROOT)
    branch = f"lane/{lane}/{job.get('slug', 'work')}"
    code, out = _run(["git", "worktree", "add", "-B", branch, str(tree), base], REPO_ROOT)
    if code:
        raise RuntimeError(out)
    if load_lane(lane, REPO_ROOT).kind == "implementation":
        _hide_holdout(tree)
    cmd = [
        "uv",
        "run",
        "python",
        "-m",
        "tools.factory.run_lane",
        "--lane",
        lane,
        "--agent",
        job.get("agent", "builder"),
        "--spec",
        spec,
        "--mission",
        " ".join(job["mission"].split()),
        "--done",
        job["done"],
        "--base",
        base,
        "--slug",
        job.get("slug", "work"),
        "--max-iterations",
        str(job.get("max_iterations", 5)),
        "--max-turns",
        str(job.get("max_turns", 120)),
    ]
    if job.get("model"):
        cmd += ["--model", job["model"]]
    if job.get("read_only"):
        cmd += ["--read-only"]
    log = (factory_dir(REPO_ROOT) / f"{lane}.log").open("a")
    return subprocess.Popen(cmd, cwd=REPO_ROOT, stdout=log, stderr=subprocess.STDOUT, text=True)


def _collect(job: dict[str, Any], base: str) -> bool:
    """Commit what the lane left, check it stayed in its paths, merge it."""
    lane_name = job["lane"]
    tree = REPO_ROOT.parent / f"duly-{lane_name}"
    branch = f"lane/{lane_name}/{job.get('slug', 'work')}"
    _run(["git", "add", "-A"], tree)
    _run(
        [
            "git",
            *GIT_ID,
            "commit",
            "-q",
            "-m",
            f"chore({lane_name}): work left uncommitted by the lane\n\n{TRAILER}",
        ],
        tree,
    )
    _, out = _run(["git", "diff", "--name-only", f"{base}...{branch}"], REPO_ROOT)
    changed = [line for line in out.splitlines() if line]
    if not changed:
        _say("step", f"{lane_name}: nothing to merge")
        return True
    if job.get("merge") is False:
        _say("step", f"{lane_name}: {len(changed)} files on {branch}, left for founder review")
        return True
    bad = violations(load_lane(lane_name, REPO_ROOT), changed)
    if bad:
        _say(
            "blocked",
            f"{lane_name}: not merged, it changed paths it does not own: " + ", ".join(bad[:6]),
        )
        return False
    code, out = _run(
        [
            "git",
            *GIT_ID,
            "merge",
            "--no-ff",
            "-q",
            "-m",
            f"merge({lane_name}): {len(changed)} files\n\n{TRAILER}",
            branch,
        ],
        REPO_ROOT,
    )
    if code:
        _run(["git", "merge", "--abort"], REPO_ROOT)
        _say("blocked", f"{lane_name}: merge conflict: {out.strip()[:200]}")
        return False
    _say("step", f"{lane_name}: merged {len(changed)} files into {base}")
    return True


def _checks(checks: list[dict[str, str]]) -> bool:
    results: dict[str, str] = {}
    for check in checks:
        code, out = _run(["bash", "-c", check["run"]], REPO_ROOT)
        results[check["name"]] = "pass" if code == 0 else "fail"
        if code:
            tail = " | ".join(out.strip().splitlines()[-3:])[:300]
            _say("failed", f"check {check['name']} fails: {tail}")
    path = factory_dir(REPO_ROOT) / "gates.json"
    path.write_text(json.dumps({"at": SystemClock().now().isoformat(), "results": results}))
    return all(v == "pass" for v in results.values())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("plan")
    parser.add_argument("--from-round", default="")
    parser.add_argument("--only-round", default="")
    parser.add_argument("--checks-only", default="", help="round whose lanes are already merged")
    args = parser.parse_args()
    plan = yaml.safe_load(Path(args.plan).read_text())
    base, spec = plan["branch"], plan["spec"]

    _, head = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"], REPO_ROOT)
    if head.strip() != base:
        print(f"check out {base} first")
        return 1

    started = not args.from_round
    for rnd in plan["rounds"]:
        name = rnd["name"]
        if args.only_round and name != args.only_round:
            continue
        if not started:
            if name != args.from_round:
                continue
            started = True
        lanes = ", ".join(j["lane"] for j in rnd["lanes"])
        _say("start", f"round {name}: {lanes}")
        jobs = [] if name == args.checks_only else rnd["lanes"]
        procs = [(job, _launch(job, spec, base)) for job in jobs]
        outcomes = [(job, proc.wait()) for job, proc in procs]
        merged = True
        for job, code in outcomes:
            if code:
                _say("failed", f"{job['lane']}: lane ended without passing its done command")
            merged = _collect(job, base) and merged
        passed = _checks(rnd.get("checks", []))
        if not (merged and passed and all(code == 0 for _, code in outcomes)):
            _say("blocked", f"round {name} stopped. Fix, then rerun with --from-round {name}")
            return 1
        _say("done", f"round {name} complete")
    _say("done", f"phase complete on {base}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
