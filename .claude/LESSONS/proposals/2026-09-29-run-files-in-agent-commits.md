date: 2026-09-29
lane: founder (factory), found by the golden tasks
commit: see git log for tools/factory/worktree.py
failure: All three golden tasks did the work correctly and still failed. Real agents commit their own work, and their commits carried REPORT.json, which would then have been merged. The stand-in agent used in the factory's tests never commits, so the tests did not see it.
fix: The orchestrator folds whatever the agent committed into one commit of its own and leaves run files out. Run files are also ignored by git. A test now plays an agent that commits its report by force.
evidence: .factory/golden.jsonl, first run of 2026-09-29: "touched more than the task asked: engine/REPORT.json"
verification_task: Run make golden and confirm no run file appears in any lane's changes.
