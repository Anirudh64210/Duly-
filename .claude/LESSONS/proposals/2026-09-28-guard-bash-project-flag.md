date: 2026-09-28
lane: founder (factory)
commit: see git log for .claude/hooks/guard_bash.py
failure: The Bash guard read any "-p name" as a docker compose project name, so it blocked the test author's "pytest -p refplugin" with a message about compose projects.
fix: Only look for a project name inside a docker compose call.
evidence: L-tests session trace, 2026-09-28 23:12 local, "Lane L-tests may only use the compose project duly-l-tests"
verification_task: Run pytest with a plugin flag from inside a lane and confirm the guard allows it.
