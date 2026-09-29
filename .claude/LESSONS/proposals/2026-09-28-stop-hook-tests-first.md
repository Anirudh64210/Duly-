date: 2026-09-28
lane: founder (factory), reported by L-tests
commit: 2e96a35
failure: In a round where tests are written before the code, the stop hook ran the lane's usual test (the whole suite), which cannot pass yet. The test author met this twice, refused to switch its tests off, and escalated.
fix: The lane runner passes the round's done command to the stop hook, which uses it as the finish line and falls back to the lane test when there is none.
evidence: tests/ESCALATE.md in commit 2e96a35; tests/PROGRESS.md, "Stop hook and the mission disagree"
verification_task: Run a tests-first round for L-tests and confirm the agent ends its turn without an escalation.
