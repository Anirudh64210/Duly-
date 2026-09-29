date: 2026-09-28
lane: L-tests
commit: c49592c
failure: The stop hook ran the lane test from .claude/lanes/L-tests.yaml (uv run pytest -q), which failed at collection because engine/dates.py and engine/f1.py did not exist yet. The mission said the new tests could not pass in round A. Both could not hold.
fix: The agent left the tests as written, did not skip them, did not write engine files, and wrote the conflict in its log. The lasting fix is a lane test for round A that matches the round's done command.
evidence: tests/PROGRESS.md, "Stop hook and the mission disagree".
verification_task: Run round A of a phase on a scratch branch and confirm the test lane can end its turn with its new tests red at collection only.
seen: 1
curation: stays a lesson. Needs the founder: .claude/lanes/ and the hooks are outside every lane.
