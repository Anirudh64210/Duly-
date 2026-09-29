# Replay: close-a-lane-iteration

Date: 2026-09-28. Curator: L-factory, first curation run. Base: 8f92f1b.
The skill is new in this run. It was drafted from three lessons that repeat:

| Lesson | Seen in |
|---|---|
| proposals/2026-09-28-format-before-done-command.md | L-engine, L-web |
| proposals/2026-09-28-pipe-hides-exit-code.md | L-engine, and the replay agents of this run |
| proposals/2026-09-28-gate-base-is-the-phase-branch.md | L-content, L-api |

## Task

In a clone of the repo, on the branch lane/L-engine/replay cut from phase-2: add is_weekend to engine/dates.py, use it in the business day check, commit, run the done command and gate 3, and say whether the lane is clean to merge.

Before the replay the curator confirmed the trap is real: in the clone, tools.diff_policy.check with base main names 85 files for lane L-engine, and with base phase-2 it prints "0 file(s), clean".

## What each arm did

| | With the skill | Without the skill |
|---|---|---|
| The change | Not made. The Edit and Write tools were refused on engine/dates.py in the clone, and the agent did not write through the shell | Made through the shell after the Edit tool was refused. Commit 8cf42ad in the clone, engine/dates.py and engine/PROGRESS.md |
| Done command | Green on the unchanged code, run unpiped as one command | Green, run as four commands, each with its exit code |
| Gate 3 | Base phase-2 only: "0 file(s), clean" | Base phase-2: "2 file(s), clean". Then base main: exit 1, 85 files, explained as phase-2's own work |
| Verdict | Nothing to merge | Clean to merge into phase-2 |
| Rounds to the gate 3 verdict | 1 | 1 |

## Result

No change in outcome that the replay can show. The arm without the skill found the merge base itself (git merge-base against phase-2 and main) and ran gate 3 against phase-2 first. The arm with the skill did not complete the task, for a reason that has nothing to do with the skill, so it is not a fair arm.

The pipe lesson showed up in the replays all the same: several agents piped pytest into tail and lost the line with the count. None of them misread a failure because of it.

## Curator's recommendation

Rejected under rule 2 as it stands. The skill is in its own commit so that it can be dropped alone. The three lessons stay in proposals/. Two of them have a lasting fix outside this lane, which would serve better than a skill:

- specs/phase-2/plan.yaml, round C, runs "make test BASE=main". The base could come from the plan's branch.
- .claude/hooks/lint_touched.py could run the formatter's check with a message that names the command to run.

## Limits of this replay

- One run for each arm. A single run cannot show a rate.
- Both arms were the same model. The arm without the skill still had CLAUDE.md, BOUNDARY.md, and the code and packs of phase 2 in front of it, and these now state most of what the skill states. The lane agents of phase 2, who met the failures, worked before that code existed.
- The scratch copies here were clones made with git clone under .claude/LESSONS/.scratch/, which git ignores. tests/holdout, .claude/skills, and .claude/LESSONS were left out of it. It was deleted after grading.
- The arm with the skill was given the numbered steps of SKILL.md in its prompt. The Skill tool was not used in either arm.
