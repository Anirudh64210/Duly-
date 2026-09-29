# Lessons for every lane

Accepted by the founder on 2026-09-29 (DECISIONS.md D44).

## 2026-09-28-format-before-done-command

- What went wrong: A file that passed the linter was still reported as unformatted by the write hook (engine/f1.py, a long lambda with a conditional). On the web side, prettier rewrote files after they were written, and the next edit was refused until the file was read again.
- What fixes it: Run the formatter once after the last write of a batch and before the done command (uv run ruff format <folder>, or prettier with its write flag). Read a file again before editing it after the formatter ran.
- Evidence: engine/PROGRESS.md, second lesson (.claude/hooks/lint_touched.py printed "1 file would be reformatted"); web/PROGRESS.md, second lesson.

## 2026-09-28-gate-base-is-the-phase-branch

- What went wrong: make test failed at gate 3 and listed contracts/, specs/, and tools/ files the lane never touched. Gate 6 reported 1 percent coverage on tools/sources/verify.py. Both gates compare against main by default, and main is behind the phase branch. L-api saw the same from tools.diff_policy.check with base main.
- What fixes it: Pass the branch the lane was cut from: make test BASE=phase-2. Change no gate and no file outside the lane.
- Evidence: rulepacks/PROGRESS.md, last lesson ("lane L-content, 0 file(s), clean" with base phase-2); api/PROGRESS.md, "Seen, not mine to fix". Reproduced in this run: in a clone, base main names 85 files for lane L-engine, base phase-2 is clean.

## 2026-09-28-pipe-hides-exit-code

- What went wrong: Piping pytest into tail or grep hid the result. The shell reported the exit code of the last command in the pipe, and a filter meant to drop the dots dropped every line.
- What fixes it: Run the done command exactly as written, with no pipe, and read its exit code.
- Evidence: engine/PROGRESS.md, first lesson. Seen again in this curation run: replay agents piped pytest into tail and lost the line with the count (eval, regime, and lane replays; see .claude/LESSONS/PROGRESS.md).
