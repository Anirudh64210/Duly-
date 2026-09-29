"""The founder's controls.

stop      the kill switch: end every agent now and let nothing start
resume    allow runs again
status    what is running, what was spent today, whether the ledger is intact
doctor    run each agent's health check
clean     remove worktrees and lane branches that no run holds
metrics   success rate, retries, cost and time for each agent
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

from engine.clocks import SystemClock
from tools.diff_policy.check import load_lane
from tools.factory import agent_run, budget, health, ledger, registry, telemetry, worktree
from tools.factory.config import all_contracts, load_config
from tools.factory.paths import main_repo, worktrees_dir


def stop(repo: Path, reason: str) -> int:
    ended = registry.stop_all(reason, repo)
    subprocess.run(["pkill", "-TERM", "-f", "tools.factory.(agent_run|phase)"], check=False)
    ledger.append("founder", "founder", "control", f"stop: {reason}; ended {len(ended)} runs", repo)
    print(f"Stopped. {len(ended)} runs ended. Worktrees are left as they were.")
    print("Nothing will start until you run: make resume")
    return 0


def resume(repo: Path) -> int:
    was = registry.resume(repo)
    ledger.append("founder", "founder", "control", "resume", repo)
    print("Runs are allowed again." if was else "The factory was not stopped.")
    return 0


def status(repo: Path) -> int:
    config = load_config(repo)
    clock = SystemClock()
    print("STOPPED" if registry.stopped(repo) else "Running is allowed")
    runs = registry.active(repo)
    print(f"{len(runs)} active")
    for run_id, run in runs.items():
        print(f"  {run_id}  {run['lane']}  {run['agent']}  since {run['started_at']}")
    spent = budget.spent_today(clock, repo)
    cap = float(config["budgets"]["per_day_usd"])
    charged = bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))
    if charged:
        print(f"Charged today: {spent:.2f} of {cap:.2f} USD in API credits")
    else:
        print(
            f"Usage today: {spent / cap:.0%} of the factory's daily limit. "
            "No API key is set, so nothing is charged."
        )
    problems = ledger.verify(repo)
    print("Ledger: intact" if not problems else f"Ledger: {len(problems)} problems")
    for problem in problems[:5]:
        print("  " + problem)
    return 1 if problems else 0


def doctor(repo: Path, only: str) -> int:
    clock = SystemClock()
    branch = worktree.git(["rev-parse", "--abbrev-ref", "HEAD"], repo).strip()
    failed = 0
    for contract in all_contracts(repo):
        if only and contract.name != only:
            continue
        for lane_name in contract.lanes:
            lane = load_lane(lane_name, repo)
            home = agent_run.home_of(lane)
            if not (repo / home).is_dir():
                continue  # the lane has nothing to work in yet
            if health.passed(contract, lane_name, repo, repo):
                print(f"ok      {contract.name} in {lane_name} (already passed)")
                continue
            forbidden = contract.health_task.split("try to ")[1].split(" and report")[0]
            target = forbidden.split()[-1]
            if target.startswith("http"):
                verify = f"test -f {home}/HEALTH.txt"
            else:
                verify = f"test -f {home}/HEALTH.txt && ! test -e {target}"
            task = agent_run.Task(
                lane_name,
                contract.name,
                f"health/{contract.name}/{lane_name}",
                "CLAUDE.md",
                contract.health_task.replace("your lane's home folder", home),
                verify,
                branch,
            )
            out = agent_run.run(task, clock, repo)
            if out.worktree:
                tree = worktree.Tree(out.run_id, Path(out.worktree), out.branch, out.base_commit)
                worktree.remove(tree, True, repo)
            good = out.status == "done"
            failed += not good
            print(f"{'ok  ' if good else 'FAIL'}    {contract.name} in {lane_name}: {out.reason}")
    return 1 if failed else 0


def clean(repo: Path) -> int:
    held = {run["worktree"] for run in registry.active(repo).values()}
    removed = 0
    for path in sorted(worktrees_dir(repo).iterdir()):
        if str(path) in held or not path.is_dir():
            continue
        worktree.git(["worktree", "remove", "--force", str(path)], repo, check=False)
        removed += 1
    worktree.git(["worktree", "prune"], repo, check=False)
    print(f"Removed {removed} worktrees no run holds.")
    return 0


def handled(repo: Path, seal: str, note: str) -> int:
    """Record that an alert was dealt with, and how. The alert itself is never removed."""
    rows = [r for r in ledger.read(repo) if r.get("kind") == "alert"]
    found = [r for r in rows if str(r.get("hash", "")).startswith(seal)] if seal else []
    if len(found) != 1:
        print("Name one alert by the start of its seal. Open alerts:")
        done = {r.get("handles") for r in ledger.read(repo) if r.get("handles")}
        for row in rows:
            if row.get("hash") not in done:
                print(f"  {row['hash'][:10]}  {row['at']}  {row['message'][:90]}")
        return 1
    if not note.strip():
        print('Say how it was dealt with: --note "..."')
        return 1
    ledger.append(
        "founder", "founder", "control", f"handled: {note.strip()}", repo, handles=found[0]["hash"]
    )
    print("Recorded.")
    return 0


def _inbox(repo: Path) -> list[dict[str, object]]:
    path = repo / ".factory" / "inbox.jsonl"
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def inbox(repo: Path) -> int:
    """The founder's notes from the window that have no closing reply yet."""
    rows = _inbox(repo)
    closed = {r["note"] for r in rows if r.get("kind") == "reply" and not r.get("keep_open")}
    waiting = [r for r in rows if r.get("kind") == "note" and r["id"] not in closed]
    for note in waiting:
        print(f"{note['id']}  {note['at']}  {note['text']}")
    if not waiting:
        print("No notes are waiting.")
    return 0


def reply(repo: Path, note: str, text: str, keep_open: bool) -> int:
    rows = _inbox(repo)
    if not any(r.get("kind") == "note" and r.get("id") == note for r in rows):
        print(f"There is no note {note}.")
        return 1
    if not text.strip():
        print('Say what was done: --text "..."')
        return 1
    row = {
        "kind": "reply",
        "note": note,
        "text": text.strip()[:2000],
        "keep_open": keep_open,
        "at": SystemClock().now().isoformat(timespec="seconds"),
    }
    with (repo / ".factory" / "inbox.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(row) + "\n")
    ledger.append("founder", "orchestrator", "control", f"replied to note {note}", repo)
    print("Replied.")
    return 0


def metrics(repo: Path) -> int:
    print(json.dumps(telemetry.summary(telemetry.read_runs(repo)), indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "command",
        choices=[
            "stop",
            "resume",
            "status",
            "doctor",
            "clean",
            "metrics",
            "handled",
            "inbox",
            "reply",
        ],
    )
    parser.add_argument("--reason", default="the founder stopped the factory")
    parser.add_argument("--agent", default="")
    parser.add_argument("--alert", default="")
    parser.add_argument("--note", default="")
    parser.add_argument("--text", default="")
    parser.add_argument("--keep-open", action="store_true")
    args = parser.parse_args()
    repo = main_repo(Path.cwd())
    if args.command == "stop":
        return stop(repo, args.reason)
    if args.command == "inbox":
        return inbox(repo)
    if args.command == "reply":
        return reply(repo, args.note, args.text, args.keep_open)
    if args.command == "handled":
        return handled(repo, args.alert, args.note)
    if args.command == "doctor":
        return doctor(repo, args.agent)
    return {"resume": resume, "status": status, "clean": clean, "metrics": metrics}[args.command](
        repo
    )


if __name__ == "__main__":
    sys.exit(main())
