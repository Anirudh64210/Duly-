date: 2026-09-28
lane: L-engine
commit: f64a3c5
failure: Piping pytest into tail or grep hid the result. The shell reported the exit code of the last command in the pipe, and a filter meant to drop the dots dropped every line.
fix: Run the done command exactly as written, with no pipe, and read its exit code.
evidence: engine/PROGRESS.md, first lesson. Seen again in this curation run: replay agents piped pytest into tail and lost the line with the count (eval, regime, and lane replays; see .claude/LESSONS/PROGRESS.md).
verification_task: In a lane scratch copy, make one engine test fail, run the done command, and report pass or fail with the exit code.
seen: 2 (L-engine; replay agents of the curation run)
curation: repeats. Drafted into the skill close-a-lane-iteration. The replay of that skill showed no change in outcome; see .claude/skills/close-a-lane-iteration/REPLAY.md.
