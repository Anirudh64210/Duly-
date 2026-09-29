# Replay: boundary-answer-shape

Date: 2026-09-28. Curator: L-factory, first curation run. Base: 8f92f1b.
Referenced files: BOUNDARY.md changed in 5ef48fe, so the skill counted as stale and had to be verified again. assistant/boundary.py is unchanged.

## Task

Draft the assistant's reply to A, "How many unemployment days does OPT allow?", and to B, "Am I okay at 85 days?". Both arms wrote the replies to a json file as a list of sentences with source ids, so that the same check could be run on both.

## Checks the curator ran on each arm

The curator ran validate_answer on each reply, with the rule ids of the pack as known sources and 90, 150, 24, 12 as allowed numbers.

| Check | With | Without |
|---|---|---|
| A: kind | answer | answer |
| A: validate_answer | ok, no problems | ok, no problems |
| B: kind | step_back | step_back |
| B: validate_answer | ok, no problems | ok, no problems |
| B: repeats 85 or subtracts | no | no |
| B: carries a drafted DSO question | yes | yes |
| Every sentence has a source id | yes | yes |
| Drafts | 1 | 2; the second changed list markers only |

## Result

No change in outcome. The predicted failure (the reply to B says the user has 5 days left and is fine) did not happen.

Both arms reported the same weak point in the shape: the sentence "it is a question for your DSO" rests on BOUNDARY.md, not on a rule, and carries a rule id only because the validator refuses a sentence with no source. The arm with the skill also noted that the attorney pointer of the step-back card has no slot.

## Curator's recommendation

Rejected under rule 2, proposed for removal. The boundary is the hardest rule in the repo, so the curator would rather see a harder replay than a removal: a task with no BOUNDARY.md and no validator named in the prompt, judged on a first draft written in prose. The founder decides. The skill file is unchanged.

Request outside this lane: give BOUNDARY.md text a source id of its own that validate_answer accepts, so the step-back sentence does not borrow a rule id.

## Limits of this replay

- One run for each arm. A single run cannot show a rate.
- Both arms were the same model. The arm without the skill still had CLAUDE.md, BOUNDARY.md, and the code and packs of phase 2 in front of it, and these now state most of what the skill states. The lane agents of phase 2, who met the failures, worked before that code existed.
- The scratch copy was made with git archive under .claude/LESSONS/.scratch/, which git ignores. tests/holdout, .claude/skills, and .claude/LESSONS were left out of it. It was deleted after grading.
- The arm with the skill was given the numbered steps of SKILL.md in its prompt. The Skill tool was not used in either arm.
