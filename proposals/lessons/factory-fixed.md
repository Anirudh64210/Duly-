# Faults in the factory that were fixed

Proposed filing, 2026-09-29. Not in force until the founder accepts it.

These are kept as a record. Each was fixed in the factory itself, so no agent needs to be told.

## 2026-09-28-guard-bash-project-flag

- What went wrong: The Bash guard read any "-p name" as a docker compose project name, so it blocked the test author's "pytest -p refplugin" with a message about compose projects.
- What fixes it: Only look for a project name inside a docker compose call.
- Evidence: L-tests session trace, 2026-09-28 23:12 local, "Lane L-tests may only use the compose project duly-l-tests"

## 2026-09-28-scratch-copy-python-environment

- What went wrong: In a scratch copy, uv run with UV_PROJECT_ENVIRONMENT pointed at the worktree's .venv and the no-sync flag made a new empty environment there. pytest still ran, because it was found on PATH in the main checkout's environment, but python could not import yaml. Several replay agents lost rounds to this.
- What fixes it: In a worktree or scratch copy, check which interpreter runs (python -c "import sys; print(sys.executable)") before the first replay. Here the working one was the main checkout's .venv/bin/python, called as python -m pytest, python -m mypy, and so on.
- Evidence: .claude/LESSONS/PROGRESS.md, iteration 1; ModuleNotFoundError: No module named 'yaml'.

## 2026-09-28-secret-scan-false-positive

- What went wrong: Round C stopped at gate 4. The secret scanner flagged a sentence in web/PROGRESS.md, "the route key (satisfies keyof paths)", as an API key. No secret was present.
- What fixes it: Added the finding's fingerprint to .gitleaksignore, which excuses that one line in that one commit and nothing else. The orchestrator gained a way to rerun a round's checks without running its agents again.
- Evidence: .factory/gates.json at 2026-09-29T06:30Z; gitleaks rule generic-api-key

## 2026-09-28-stop-hook-against-round-a

- What went wrong: The stop hook ran the lane test from .claude/lanes/L-tests.yaml (uv run pytest -q), which failed at collection because engine/dates.py and engine/f1.py did not exist yet. The mission said the new tests could not pass in round A. Both could not hold.
- What fixes it: The agent left the tests as written, did not skip them, did not write engine files, and wrote the conflict in its log. The lasting fix is a lane test for round A that matches the round's done command.
- Evidence: tests/PROGRESS.md, "Stop hook and the mission disagree".

## 2026-09-28-stop-hook-tests-first

- What went wrong: In a round where tests are written before the code, the stop hook ran the lane's usual test (the whole suite), which cannot pass yet. The test author met this twice, refused to switch its tests off, and escalated.
- What fixes it: The lane runner passes the round's done command to the stop hook, which uses it as the finish line and falls back to the lane test when there is none.
- Evidence: tests/ESCALATE.md in commit 2e96a35; tests/PROGRESS.md, "Stop hook and the mission disagree"

## 2026-09-28-validator-citations

- What went wrong: The answer validator treated the digits inside a legal citation, such as 8 CFR 214.2(f)(10), as values the engine had not produced, and rejected a correct answer.
- What fixes it: Strip citation and form-name shapes before checking numbers. Added a test that a wrong value next to a citation is still caught.
- Evidence: tests/unit/assistant/test_validator.py

## 2026-09-29-curator-cannot-write-under-claude

- What went wrong: The skill curator's lane was .claude/LESSONS and .claude/skills. Claude Code refuses every write under .claude/ when it runs without prompts, whatever the allow rules say, so the curator could not write a single file. Its first health check passed by chance of wording; the second failed twice.
- What fixes it: The curator's lane is now proposals/. A proposal takes effect only when the founder copies it under .claude/. The sandbox now refuses every lane the whole of .claude/.
- Evidence: run l-factory-cb3b778b60, .factory/runs/l-factory-cb3b778b60/stream.jsonl, "Permission to use Write has been denied"

## 2026-09-29-run-files-in-agent-commits

- What went wrong: All three golden tasks did the work correctly and still failed. Real agents commit their own work, and their commits carried REPORT.json, which would then have been merged. The stand-in agent used in the factory's tests never commits, so the tests did not see it.
- What fixes it: The orchestrator folds whatever the agent committed into one commit of its own and leaves run files out. Run files are also ignored by git. A test now plays an agent that commits its report by force.
- Evidence: .factory/golden.jsonl, first run of 2026-09-29: "touched more than the task asked: engine/REPORT.json"

## 2026-09-29-secret-scan-generic-rule-in-prose

- What went wrong: The secret scanner's generic rule stopped a round a second time, on the same sentence copied into a lesson file on the curator's branch. Excusing one line by fingerprint had not fixed the cause.
- What fixes it: .gitleaks.toml turns the generic rule off for markdown only. Rules for named providers still apply to markdown. Checked in a scratch repo: a GitHub token in a .md file is caught, a generic key in a .py file is caught, the prose sentence is not.
- Evidence: .factory/gates.json at 2026-09-29T07:15Z

## 2026-09-29-stop-hook-needs-a-shell

- What went wrong: The stop hook split the done command into words and ran it without a shell, so a done command that joins two tests with "&&" failed inside the hook while passing for the orchestrator.
- What fixes it: The hook runs the done command through bash, as the orchestrator does.
- Evidence: run l-engine-5cba6ae8e9, engine/PROGRESS.md, "The stop hook and the done command"
