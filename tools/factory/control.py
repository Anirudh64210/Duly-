"""The founder's controls.

stop      the kill switch: end every agent now and let nothing start
resume    allow runs again, and resume the last plan that was parked or interrupted
status    what is running, what was spent today, whether the ledger is intact
doctor    report ledger commits on no branch, and run each agent's health check, except a
          retired agent's
clean     remove worktrees and lane branches that no run holds
metrics   success rate, retries, cost and time for each agent
handled   say how an alert or a stop was dealt with, its cause, and whether a veto was upheld
workflow  log a founder-lane workflow's token total
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

from engine.clocks import SystemClock
from tools.diff_policy.check import load_lane
from tools.factory import (
    agent_run,
    billing,
    budget,
    health,
    ledger,
    phase,
    registry,
    telemetry,
    worktree,
)
from tools.factory.config import all_contracts, load_config
from tools.factory.efficiency import CAUSES
from tools.factory.paths import main_repo, state_dir, worktrees_dir

# The ledger fields that name a commit.
COMMIT_FIELDS = ("head", "base", "commit", "head_commit", "kept_commit")


def stop(repo: Path, reason: str) -> int:
    ended = registry.stop_all(reason, repo)
    subprocess.run(["pkill", "-TERM", "-f", "tools.factory.(agent_run|phase)"], check=False)
    ledger.append("founder", "founder", "control", f"stop: {reason}; ended {len(ended)} runs", repo)
    print(f"Stopped. {len(ended)} runs ended. Worktrees are left as they were.")
    print("Nothing will start until you run: make resume")
    return 0


def resume(repo: Path) -> int:
    """Allow runs again, then start the last plan that was parked or interrupted again from
    the round it stopped in, in the background. The runner skips what already landed."""
    was = registry.resume(repo)
    ledger.append("founder", "founder", "control", "resume", repo)
    print("Runs are allowed again." if was else "The factory was not stopped.")
    phase.reap(repo)
    target = phase.parked(ledger.read(repo))
    if target is None:
        print("No plan is parked or interrupted.")
        return 0
    plan_file, round_name = target
    log = state_dir(repo) / "runs" / "resume.log"
    launch(
        [sys.executable, "-m", "tools.factory.phase", plan_file, "--from-round", round_name],
        repo,
        log,
    )
    print(f"Resuming {plan_file} from round {round_name}. Its output goes to {log}.")
    return 0


def launch(command: list[str], repo: Path, log: Path) -> None:
    """Start a command in the background, its output appended to log, so that the window's
    Resume button returns at once while the plan runs on."""
    log.parent.mkdir(exist_ok=True)
    with log.open("a", encoding="utf-8") as out:
        subprocess.Popen(
            command, cwd=repo, stdout=out, stderr=subprocess.STDOUT, start_new_session=True
        )


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


def lost_commits(repo: Path) -> list[tuple[str, dict[str, Any]]]:
    """Commits the ledger names that no branch holds: work a cleanup may have thrown away."""
    # Kept attempts hold a ref under refs/factory/kept (agent_run.KEPT_REFS), not a branch.
    reachable = set(
        worktree.git(
            ["rev-list", "--branches", "--remotes", "--glob=refs/factory/kept/*"], repo
        ).split()
    )
    kept = re.compile(r"kept on \S+ at ([0-9a-f]{7,40})")
    lost: list[tuple[str, dict[str, Any]]] = []
    seen: set[str] = set()
    for row in ledger.read(repo):
        named = [str(row[k]) for k in COMMIT_FIELDS if row.get(k)]
        named += kept.findall(str(row.get("message", "")))
        for sha in named:
            if sha in seen or not re.fullmatch(r"[0-9a-f]{7,40}", sha):
                continue
            seen.add(sha)
            if not any(full.startswith(sha) for full in reachable):
                lost.append((sha, row))
    return lost


def doctor(repo: Path, only: str) -> int:
    """Report ledger commits on no branch, then run each agent's health probe."""
    lost = lost_commits(repo)
    for sha, row in lost:
        print(f"LOST    commit {sha[:10]} ({row.get('lane')}, {row.get('at')}) is on no branch")
    clock = SystemClock()
    branch = worktree.git(["rev-parse", "--abbrev-ref", "HEAD"], repo).strip()
    failed = 0
    for contract in all_contracts(repo):
        if contract.retired or (only and contract.name != only):
            continue
        for lane_name in contract.lanes:
            home = agent_run.home_of(load_lane(lane_name, repo))
            if not (repo / home).is_dir():
                continue  # the lane has nothing to work in yet
            if health.passed(contract, lane_name, repo, repo):
                print(f"ok      {contract.name} in {lane_name} (already passed)")
                continue
            out = health.probe(contract, lane_name, home, branch, clock, repo)
            good = out.status == "done"
            failed += not good
            print(f"{'ok  ' if good else 'FAIL'}    {contract.name} in {lane_name}: {out.reason}")
    return 1 if failed or lost else 0


def clean(repo: Path) -> int:
    held = {run["worktree"] for run in registry.active(repo).values()}
    removed = 0
    for path in sorted(worktrees_dir(repo).iterdir()):
        if str(path) in held or not path.is_dir():
            continue
        worktree.git(["worktree", "remove", "--force", str(path)], repo, check=False)
        removed += 1
    worktree.git(["worktree", "prune"], repo, check=False)
    pruned = worktree.prune(repo)
    print(f"Removed {removed} worktrees no run holds and {len(pruned)} check branches.")
    return 0


def handled(
    repo: Path, seal: str, note: str, cause: str = "", upheld: str = "", via: str = "cli"
) -> int:
    """Record that an alert or a stop was dealt with, how, and why it happened. The row itself
    is never removed. A veto also says whether the founder upheld it. The row keeps when the
    question was asked and answered, and whether the answer came from a card or the CLI."""
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
    if via not in {"card", "cli"}:
        print("Say --via card or cli.")
        return 1
    extra: dict[str, Any] = {"cause": cause, "cause_source": "human"} if cause else {}
    extra |= {
        "asked_at": found[0]["at"],
        "answered_at": SystemClock().now().isoformat(timespec="seconds"),
        "via": via,
    }
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
    parser.add_argument("--via", choices=["card", "cli"], default="cli")
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
        return handled(repo, args.alert, args.note, args.cause, args.upheld, args.via)
    if args.command == "workflow":
        return workflow(repo, args.name, args.tokens)
    if args.command == "doctor":
        return doctor(repo, args.agent)
    return {"resume": resume, "status": status, "clean": clean, "metrics": metrics}[args.command](
        repo
    )


if __name__ == "__main__":
    sys.exit(main())
