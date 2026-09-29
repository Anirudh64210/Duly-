date: 2026-09-28
lane: founder (factory)
commit: see git log for .claude/hooks/guard_bash.py
failure: The Bash guard read any "-p name" as a docker compose project name, so it blocked the test author's "pytest -p refplugin" with a message about compose projects.
fix: Only look for a project name inside a docker compose call.
evidence: L-tests session trace, 2026-09-28 23:12 local, "Lane L-tests may only use the compose project duly-l-tests"
verification_task: Run pytest with a plugin flag from inside a lane and confirm the guard allows it.
seen: 3 (L-tests, L-content, founder)
curation: repeats, and the fix is in the hook, so no skill is needed. Verified on 2026-09-28 by feeding sample commands to .claude/hooks/guard_bash.py as lane L-tests: a pytest plugin flag and mkdir with its parents flag exit 0; a compose call naming another lane's project exits 2; a compose call naming the lane's own project exits 0. The workarounds in tests/PROGRESS.md and rulepacks/PROGRESS.md are no longer needed. The guard reads the text of the whole command, so a compose call quoted inside a test string is still blocked; put such strings in a file.
