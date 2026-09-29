date: 2026-09-28
lane: L-content, L-api
commit: a167ed7, af14b11
failure: make test failed at gate 3 and listed contracts/, specs/, and tools/ files the lane never touched. Gate 6 reported 1 percent coverage on tools/sources/verify.py. Both gates compare against main by default, and main is behind the phase branch. L-api saw the same from tools.diff_policy.check with base main.
fix: Pass the branch the lane was cut from: make test BASE=phase-2. Change no gate and no file outside the lane.
evidence: rulepacks/PROGRESS.md, last lesson ("lane L-content, 0 file(s), clean" with base phase-2); api/PROGRESS.md, "Seen, not mine to fix". Reproduced in this run: in a clone, base main names 85 files for lane L-engine, base phase-2 is clean.
verification_task: In a clone with a lane branch cut from phase-2, change one owned file, commit, run gate 3, and say whether the lane is clean to merge.
seen: 2 (L-content, L-api)
curation: repeats. Drafted into the skill close-a-lane-iteration. Replay: the agent without the skill also chose base phase-2 on its own, so no change in outcome. Request to the founder, outside this lane: specs/phase-2/plan.yaml round C runs "make test BASE=main"; and the Makefile default could read the base from the lane or the phase.
