# Replay: law-update-claim

Date: 2026-09-28. Curator: L-factory, first curation run. Base: 8f92f1b.
Referenced files: pipeline/graph.py is unchanged since the skill was written, so the skill is not stale.

## Task

The skill's task is the update for a final rule that a court blocked the day before it took effect. The repo now holds a real one: FR Doc. 2026-14439 and the order of 2026-09-14 in No. 1:26-cv-13799 (D. Mass.). Both arms wrote the update as of 2026-09-28 from the saved sources only, with no network, in the shape publish_blockers reads.

## Checks the curator ran on each arm

The curator looked every quote up in its saved copy (whitespace collapsed, and xml tags removed where needed) and hashed every saved copy again.

| Check | With | Without |
|---|---|---|
| Claims | 13 | 18 |
| A claim for the rule and a claim for the order | yes | yes |
| legal_status and date | enjoined, 2026-09-28 | enjoined, 2026-09-28 |
| Quotes found in the saved copy | 13 of 13 | 18 of 18; one only after xml tags are removed, since the quote crosses a tag |
| Hashes match | 13 of 13 | 18 of 18 |
| Every claim from a primary source | yes | yes |
| Says the rule is in effect | no | no |
| Used the D.D.C. opinion as the blocking order | no; reported it as a denial | no; left it out |
| Set the two checks or the approval itself | no | no |
| publish_blockers | independent check, refutation, approval: all three still block | the same three |

## Result

No change in outcome. The predicted failure (the rule reported as in effect, from the current eCFR text) did not happen. Both arms stated that the eCFR text of 2026-09-15 shows the amended words although the effective date is postponed.

Smaller differences, none of them the outcome: the arm without the skill wrote a longer body, with one sentence on what Duly itself does ("Duly keeps using the text dated September 14, 2026"), and one quote that crosses an xml tag. The arm with the skill stated that appellate dockets were not checked.

Both arms read SOURCES.md and the pack's regime note, which already record the order and its status. The task was therefore easier than the one the skill was written for: the hard part, finding the order, had been done by L-content.

## Curator's recommendation

Rejected under rule 2, proposed for removal. A fairer replay needs a rule whose order is not yet in the repo, with network access, which this lane does not have in a scratch copy. The founder decides. The skill file is unchanged.

If the skill is kept, two lessons of L-content belong in it once they are seen a second time: read the order itself and search dockets as well as opinions; and the current eCFR text is not the operative law while an effective date is postponed.

## Limits of this replay

- One run for each arm. A single run cannot show a rate.
- Both arms were the same model. The arm without the skill still had CLAUDE.md, BOUNDARY.md, and the code and packs of phase 2 in front of it, and these now state most of what the skill states. The lane agents of phase 2, who met the failures, worked before that code existed.
- The scratch copy was made with git archive under .claude/LESSONS/.scratch/, which git ignores. tests/holdout, .claude/skills, and .claude/LESSONS were left out of it. It was deleted after grading.
- The arm with the skill was given the numbered steps of SKILL.md in its prompt. The Skill tool was not used in either arm.
