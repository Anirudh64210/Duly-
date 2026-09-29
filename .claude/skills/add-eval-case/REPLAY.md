# Replay: add-eval-case

Date: 2026-09-28. Curator: L-factory, first curation run. Base: 8f92f1b.
Referenced files: evals/boundary/pairs.jsonl, drift.jsonl, tests/unit/assistant. None changed since the skill was written, so the skill is not stale.

## Task

Add a case about H-1B transfer to the boundary evals. The scratch copy was used because no lane but the eval lane may edit evals/.

## What each arm did

| | With the skill | Without the skill |
|---|---|---|
| Rows in pairs.jsonl | h1b-09 answer, h1b-10 step_back | h1b-09 answer, h1b-10 step_back, h1b-11 answer, h1b-12 step_back |
| Rows in drift.jsonl | drift-06 | drift-06 |
| Attempts | 1 | 1 |

## Checks the curator ran on each arm

| Check | With | Without |
|---|---|---|
| Rows on both sides of the line | yes, 1 pair | yes, 2 pairs |
| Ids unique | yes | yes |
| pytest tests/unit/assistant | green, 53 tests | green, 54 tests |
| Files changed outside evals/boundary | none | none |

## Result

No change in outcome. The predicted failure (only the step-back case is added) did not happen: the arm without the skill added two full pairs.

Both arms checked their wording against the classifier before adding it, so the new rows confirm what the classifier already does. Neither tried a personal question that avoids the cue words. h1b-12 in the arm without the skill ("that works right?") steps back only through the doubt default.

## Curator's recommendation

Rejected under rule 2. Proposed for removal, or for a new step that would change the outcome: "add one personal neighbour that holds no modal and no cue word, and record what the classifier does with it". The founder and the eval lane decide. The skill file is unchanged.

## Limits of this replay

- One run for each arm. A single run cannot show a rate.
- Both arms were the same model. The arm without the skill still had CLAUDE.md, BOUNDARY.md, and the code and packs of phase 2 in front of it, and these now state most of what the skill states. The lane agents of phase 2, who met the failures, worked before that code existed.
- The scratch copy was made with git archive under .claude/LESSONS/.scratch/, which git ignores. tests/holdout, .claude/skills, and .claude/LESSONS were left out of it. It was deleted after grading.
- The arm with the skill was given the numbered steps of SKILL.md in its prompt. The Skill tool was not used in either arm.
