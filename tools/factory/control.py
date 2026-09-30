"""The founder's controls.

stop      the kill switch: end every agent now and let nothing start
resume    allow runs again
status    what is running, what was spent today, whether the ledger is intact
doctor    run each agent's health check, except a retired agent's
clean     remove worktrees and lane branches that no run holds
metrics   success rate, retries, cost and time for each agent
handled   say how an alert or a stop was dealt with, its cause, and whether a veto was upheld
workflow  log a founder-lane workflow's token total
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from engine.clocks import SystemClock
from tools.diff_policy.check import load_lane
from tools.factory import agent_run, billing, budget, health, ledger, registry, telemetry, worktree
from tools.factory.config import all_contracts, load_config
from tools.factory.efficiency import CAUSES
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
    try:
        plan = billing.require_subscription()
        print(f"Login: {plan} subscription. Agents can run on nothing else, so nothing is charged.")
    except billing.BillingError as err:
        print(f"Login: REFUSED. {err}")
    print(f"Safety cap used today: {spent / cap:.0%}")
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
        if contract.retired or (only and contract.name != only):
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


def handled(repo: Path, seal: str, note: str, cause: str = "", upheld: str = "") -> int:
    """Record that an alert or a stop was dealt with, how, and why it happened. The row itself
    is never removed. A veto also says whether the founder upheld it."""
    events = ledger.read(repo)
    alerted = {r.get("run_id") for r in events if r.get("kind") == "alert" and r.get("run_id")}
    rows = [
        r
        for r in events
        if r.get("kind") == "alert"
        or (r.get("kind") == "blocked" and r.get("run_id") not in alerted)
    ]
    found = [r for r in rows if str(r.get("hash", "")).startswith(seal)] if seal else []
    if len(found) != 1:
        print("Name one alert by the start of its seal. Open alerts:")
        done = {r.get("handles") for r in events if r.get("handles")}
        for row in rows:
            if row.get("hash") not in done:
                print(f"  {row['hash'][:10]}  {row['at']}  {row['message'][:90]}")
        return 1
    if not note.strip():
        print('Say how it was dealt with: --note "..."')
        return 1
    veto = found[0].get("alert") == "veto"
    if veto != bool(upheld):
        print("Say --upheld yes or no for a veto, and only for a veto.")
        return 1
    extra: dict[str, Any] = {"cause": cause} if cause else {}
    if upheld:
        extra["veto_upheld"] = upheld == "yes"
    ledger.append(
        "founder",
        "founder",
        "control",
        f"handled: {note.strip()}",
        repo,
        handles=found[0]["hash"],
        **extra,
    )
    print("Recorded.")
    return 0


def workflow(repo: Path, name: str, tokens: int) -> int:
    """Log a founder-lane workflow's token total, which no agent run records."""
    if not name.strip() or tokens <= 0:
        print("Name the workflow and its token total: --name N --tokens T")
        return 1
    ledger.append(
        "founder",
        "founder",
        "cost",
        f"workflow {name.strip()}: {tokens} tokens",
        repo,
        workflow=name.strip(),
        tokens=tokens,
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
            "workflow",
        ],
    )
    parser.add_argument("--reason", default="the founder stopped the factory")
    parser.add_argument("--agent", default="")
    parser.add_argument("--alert", default="")
    parser.add_argument("--note", default="")
    parser.add_argument("--text", default="")
    parser.add_argument("--keep-open", action="store_true")
    parser.add_argument("--cause", choices=[c for c in CAUSES if c != "unknown"], default="")
    parser.add_argument("--upheld", choices=["yes", "no"], default="")
    parser.add_argument("--name", default="")
    parser.add_argument("--tokens", type=int, default=0)
    args = parser.parse_args()
    repo = main_repo(Path.cwd())
    if args.command == "stop":
        return stop(repo, args.reason)
    if args.command == "inbox":
        return inbox(repo)
    if args.command == "reply":
        return reply(repo, args.note, args.text, args.keep_open)
    if args.command == "handled":
        return handled(repo, args.alert, args.note, args.cause, args.upheld)
    if args.command == "workflow":
        return workflow(repo, args.name, args.tokens)
    if args.command == "doctor":
        return doctor(repo, args.agent)
    return {"resume": resume, "status": status, "clean": clean, "metrics": metrics}[args.command](
        repo
    )


if __name__ == "__main__":
    sys.exit(main())
