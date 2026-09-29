"""The weekly review: a sample of real runs for the founder to read, not only totals.

Picks runs from the last seven days, the same ones every time it is run in a given week,
always including every run that failed or escalated. Writes a page with where to find
each trace and the questions to answer. Usage: make weekly
"""

import random
import sys
from datetime import timedelta
from pathlib import Path

from engine.clocks import SystemClock
from tools.factory import ledger, telemetry
from tools.factory.paths import main_repo

SAMPLE = 5
QUESTIONS = (
    "Did the agent do what the mission asked, and only that?",
    "Did it read a source before stating a fact, or did it write from memory?",
    "Did it meet a wall (sandbox, guard, gate)? Was the wall right?",
    "Did it take a cheap or fake win anywhere?",
    "Is there a lesson here that is not yet written down?",
)


def main() -> int:
    repo = main_repo(Path.cwd())
    clock = SystemClock()
    now = clock.now()
    year, week, _ = now.isocalendar()
    since = (now - timedelta(days=7)).isoformat()
    runs = [
        r
        for r in telemetry.read_runs(repo)
        if str(r.get("ended_at", "")) >= since and not str(r.get("task", "")).startswith("health/")
    ]
    troubled = [r for r in runs if r.get("status") != "done"]
    fine = [r for r in runs if r.get("status") == "done"]
    random.Random(f"{year}-{week}").shuffle(fine)  # noqa: S311
    chosen = troubled + fine[: max(0, SAMPLE - len(troubled))]
    summary = telemetry.summary(runs)
    problems = ledger.verify(repo)

    lines = [
        f"# Weekly review, {year} week {week}",
        "",
        f"Written {now.date().isoformat()}. {len(runs)} runs in the last seven days, "
        f"{len(troubled)} of them failed, escalated or were stopped.",
        "",
        "Record of actions: " + ("intact." if not problems else f"{len(problems)} problems."),
        "",
        "## Each agent this week",
        "",
        "| Agent | Runs | Passed | Tries | Cost | Minutes |",
        "|---|---|---|---|---|---|",
    ]
    for agent, m in summary.items():
        lines.append(
            f"| {agent} | {m['runs']:.0f} | {m['success_rate']:.0%} | "
            f"{m['mean_attempts']} | {m['mean_cost_usd']:.2f} | {m['mean_minutes']} |"
        )
    lines += [
        "",
        "## Runs to read",
        "",
        "Open each in the Factory window (make watch), or read the raw stream at the path given.",
        "",
    ]
    for run in chosen:
        lines += [
            f"### {run['lane']}, {run['agent']}: {run['status']}",
            "",
            f"- Run: {run['run_id']}",
            f"- Task: {run['task']}",
            f"- Outcome: {run.get('reason', '')}",
            f"- Attempts: {run.get('attempts')}, cost {run.get('cost_usd')} USD, "
            f"{int(run.get('seconds', 0)) // 60} minutes",
            f"- Sessions: {', '.join(run.get('sessions', [])) or 'none'}",
            f"- Raw stream: .factory/runs/{run['run_id']}/stream.jsonl",
            "",
        ]
        lines += [f"{n}. {q}\n\n   Answer:\n" for n, q in enumerate(QUESTIONS, start=1)]
    lines += ["## Decisions", "", "What changes because of this review:", ""]
    out = repo / "docs" / "factory" / "reviews" / f"{year}-W{week:02d}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        print(f"{out.relative_to(repo)} already exists; it is left as it is")
        return 0
    out.write_text("\n".join(lines) + "\n")
    print(f"wrote {out.relative_to(repo)} with {len(chosen)} runs to read")
    return 0


if __name__ == "__main__":
    sys.exit(main())
