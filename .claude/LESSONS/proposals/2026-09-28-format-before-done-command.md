date: 2026-09-28
lane: L-engine, L-web
commit: f64a3c5, 07ffcc7
failure: A file that passed the linter was still reported as unformatted by the write hook (engine/f1.py, a long lambda with a conditional). On the web side, prettier rewrote files after they were written, and the next edit was refused until the file was read again.
fix: Run the formatter once after the last write of a batch and before the done command (uv run ruff format <folder>, or prettier with its write flag). Read a file again before editing it after the formatter ran.
evidence: engine/PROGRESS.md, second lesson (.claude/hooks/lint_touched.py printed "1 file would be reformatted"); web/PROGRESS.md, second lesson.
verification_task: In a lane scratch copy, add a function with a line over 100 characters to engine/, then run the done command. Count the rounds until ruff format --check passes.
seen: 2 (L-engine, L-web)
curation: repeats. Drafted into the skill close-a-lane-iteration. The replay of that skill showed no change in outcome; see its REPLAY.md.
