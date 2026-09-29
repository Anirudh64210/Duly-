date: 2026-09-29
lane: founder (factory), reported by the builder during its health check
commit: see git log for .claude/hooks/lane_test.py
failure: The stop hook split the done command into words and ran it without a shell, so a done command that joins two tests with "&&" failed inside the hook while passing for the orchestrator.
fix: The hook runs the done command through bash, as the orchestrator does.
evidence: run l-engine-5cba6ae8e9, engine/PROGRESS.md, "The stop hook and the done command"
verification_task: Give a lane a done command with "&&" and confirm the agent can end its turn.
