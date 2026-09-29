---
name: close-a-lane-iteration
description: Use before you run a lane's done command or the gates. Covers the formatter, reading the exit code, and the base branch for gates 3 and 6.
---

1. Run the formatter once after your last write and before the done command. Python: `uv run ruff format <your folder>`. Web: prettier with its write flag on your files. After the formatter has run, read a file again before you edit it.
2. Run the done command exactly as written. Do not pipe it into tail, grep, or head: a pipe reports the exit code of its last command, and a filter can hide every line. Read the exit code.
3. Gates 3 and 6 compare your branch with BASE, and BASE defaults to main. Pass the branch your lane was cut from, for example `make test BASE=phase-2`. If gate 3 names files you never touched, the base is wrong. Do not touch those files and do not edit the gate.
4. Write what ran and what it printed in your progress log.

## Verification

Replay task: in a clone, on a lane branch cut from phase-2, add `is_weekend` to engine/dates.py, commit, run the done command and gate 3, and say whether the lane is clean to merge.
With this skill: gate 3 is run with base phase-2 on the first round and reports the lane clean.
Without it: the usual first draft runs `make gate-3` with the default base, sees files from other lanes, and reports the lane as not clean or stops.

The result is in REPLAY.md beside this file.
