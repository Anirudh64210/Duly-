# Replay: add-effective-dated-parameter

Date: 2026-09-28. Curator: L-factory, first curation run. Base: 8f92f1b.
Referenced files: engine/rulepack.py changed in f64a3c5, contracts/rulepack.schema.json and tools/sources/verify.py in d30e23c, tests/unit/engine/test_rulepack.py in 6712e8b. The skill was stale: step 2 did not list quote, snapshot, and snapshot_sha256, which the loader and the source check now need. This run changes the skill and replays it.

## Changes to the skill in this run

| Step | Change | From which lesson |
|---|---|---|
| 2 | The source also needs quote, snapshot, snapshot_sha256 | staleness, SPEC of phase 2 |
| 3 (new) | Compare the saved texts before and after a blocked rule before picking a status | proposals/2026-09-28-compare-point-in-time-texts-before-settled.md |
| 8 (new) | Readers go through Rulepack.value(id, on, regime) | proposals/2026-09-28-rule-lookup-by-date-and-regime.md |
| 9 (new) | Run the source check and the rulepack test | the done command of L-content |

## Replay 1: the skill as it was

Task: change a parameter's value from a given date. A made up document, marked as such, was saved in the scratch pack: it changes stem.evaluation_due_days from 10 to 15 from 2027-01-01.

| Check the curator ran | With | Without |
|---|---|---|
| Old row closed with effective_to 2026-12-31 | yes | yes |
| New row from 2027-01-01, value 15 | yes | yes |
| Rulepack.value on 2026-12-31 and on 2027-01-01 | 10, 15 | 10, 15 |
| tests/unit/engine/test_rulepack.py | green | green |
| Line in the pack CHANGELOG | yes | yes |
| tools.sources.verify | 1 problem: example.invalid is not a primary source. The url was set by the task; hash and quote passed | the same |
| Attempts | 1 | 1 |

Result: no change in outcome. The predicted failure (value edited in place, or two open rows) did not happen. The shipped pack holds a closed row, capgap.end_month_day, which shows the pattern to any reader.

## Replay 2: the new step 3

Task: opt.apply_after_days was removed from a scratch copy of the pack, and its mentions from the pack's notes and from the progress logs. The task gave the row as the SPEC table states it: 60, settled, no regime.

| Check the curator ran | With (new text) | Without (old text) |
|---|---|---|
| Rows written | 2: 60 under ds_2012, 30 under fixed_admission_2026 | the same 2 |
| Status | litigated on both | litigated on both |
| tools.sources.verify | every quote found | every quote found |
| tests/unit/engine/test_rulepack.py | green | green |
| Attempts | 1 for the content | 1 |

Result: no change in outcome. The arm without the new step compared the two texts unprompted and followed the pattern of grace.after_completion_days in the pack.

## Curator's recommendation

Keep steps 2 and 9 whatever else is decided: they correct a stale skill. Steps 3 and 8 are rejected under rule 2, since the replay shows no change; the two lessons stay lessons. The skill as a whole did not change the outcome of replay 1 and is proposed for removal on the same rule. The founder decides. The change to SKILL.md is in its own commit so that it can be dropped alone.

Both arms of replay 1 raised the same two points for the founder: the engine looks rules up by today, not by the date of the event; and one rule id serves both the 12 month and the final evaluation, while a source may change only one.

## Limits of this replay

- One run for each arm. A single run cannot show a rate.
- Both arms were the same model. The arm without the skill still had CLAUDE.md, BOUNDARY.md, and the code and packs of phase 2 in front of it, and these now state most of what the skill states. The lane agents of phase 2, who met the failures, worked before that code existed.
- The scratch copy was made with git archive under .claude/LESSONS/.scratch/, which git ignores. tests/holdout, .claude/skills, and .claude/LESSONS were left out of it. It was deleted after grading.
- The arm with the skill was given the numbered steps of SKILL.md in its prompt. The Skill tool was not used in either arm.
