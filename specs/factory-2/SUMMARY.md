# factory-2 in plain words

Date 2026-09-30. The full plan is SPEC.md in this folder. This page covers what you need to decide.

## What is wrong today

The agents do good work, but everything around them is slow and fragile.

- **Faults are found late.** They only show up at the review. Product-2 took 13 reviews and 11 vetoes, and you upheld every veto.
- **Fixes are typed by hand.** Each fix is a new plan file: 21 files and 1,814 lines for one feature.
- **Every stop waits on Claude.** A Claude session has to notice the stop and work out why. Network blips and one-off failures stop everything too.
- **Learning doesn't work.** It is 245 notes nobody read.
- **It only runs on Duly.** Duly's names are written into the factory's code, so it can't run on another project.

## What changes for you, day to day

- **You approve each feature once, as a numbered checklist.** Claude still writes the SPEC with you. You press Approve in the factory window (or run `factory approve <feature>`), and one command starts it.
- **One plan file per feature.** `factory fix` adds fixes to that file instead of writing new files.
- **Faults show up in minutes.** Checks run inside each lane, and machine checks run before every review, so the review sees fewer faults.
- **When the factory needs you, you get one card.** It stops and shows a card in the window with what happened, the report, the likely cause and buttons to answer. The buttons are: continue with a note, waive a disputed test, approve or drop a held change, or stop. Your answer records the cause and restarts the run. There is no watcher to re-arm and no hash to look up.
- **Blips retry themselves.** Network blips and one-off failures are retried once automatically. They reach you only if the retry also fails.
- **Stopped runs resume.** After a laptop sleep or a killed run, `factory resume` picks it up.
- **A scorecard after each feature.** It shows cost, hours, vetoes and stops by cause, against the targets below.
- **Learning is one rule.** When the same kind of problem shows up three times, the next feature's checklist gets a point that checks for it, and you approve it with the rest. The old notes are deleted.
- **Phone alerts are off** unless you turn them on.

## Targets

Each is judged on the median of the three features after the relevant build step.

- At most 3 vetoes per feature (was 11), and at least 1 of the next 3 approved at the first review.
- Under $105 of list-price usage per feature (was $150 to $165).
- Under 5 wall hours per feature, measured the way the tool measures it: product-2 was 9.7 hours by that measure. The 15.7 hours quoted before used a different start time that the tool cannot recompute.
- Fix cycles under half an hour (were 1 to 2.4 hours).
- One plan file per feature and under 150 hand-typed plan lines (were 21 files and 1,814 lines).
- Every stop has a cause. Network and one-off failures never reach you unless the retry also fails.
- No lost runs or lost work, checked by `factory doctor`.
- Every kind of problem seen three times gets a check within one feature.
- A new project runs a sample feature from the saved template, with no Duly names in the core.

Every target is read from `make efficiency` or a test. Targets that no tool can record were dropped.

## Build order and rough effort

S is under 2 hours of Claude's work, M about half a day, L about a day. Each step lands between features with the factory's own tests passing. The old way stays until the new one has run a real feature.

1. **Reliability (M):** fix the write permission bug, stop retrying permission errors, retry blips automatically, resume after a stop, lose no work.
2. **Measurement (S):** the scorecard, with product-1 and product-2 as the baselines.
3. **Lanes catch their own faults (M):** checks inside each lane, short failure output for agents, agents read only what they need.
4. **Checks before review (M):** machine checks before every review, and fix rounds that touch only the lanes at fault. Then one real feature is measured against the efficiency targets.
5. **Checklist and one plan per feature (L).**
6. **Decision cards and a window with working buttons (M).**
7. **Learning rule and the 5 minute cache trial (S).** Three features are then compared against every target.
8. **The template (L):** Duly's specifics move into one project file, and a saved template starts a new project with `factory init`.

In total, about 4 to 5 days of Claude's work, spread over the features you run anyway.

## What was cut from the first draft

Each of these cost you time or risk with no gain for Duly:

- a separate core repository that Duly would have to pull from, with a locked file list;
- refusing hand-written plans;
- a full plan generator and a spec-writing agent;
- renaming "founder" in the records;
- rewriting 3,400 lines of the factory's tests;
- doing the generality work early.

SPEC.md section 6 lists every cut with its reason.

## Decisions you need to make

1. **Delete the old lessons and retired parts?** This covers the lessons folder, the proposal inbox, the skill-curator agent, the factory lane, the Stop hook and `make lane`. Git keeps the history. This replaces D44. Yes or no.
2. **Let the factory commit spec changes itself?** `factory start` and `factory resume` would commit the feature's spec folder and bring it into the work checkout, but only when those are the only changes. Yes or no.
3. **Where should the saved template live?** A separate folder and git repository, for example `~/Desktop/factory-template`. Duly stays the place the factory is fixed; the template is exported from it, and other projects update with `factory sync`. Name the location.
4. **Phone alerts: off, or on through which service?** Alerts would carry only the lane, the kind of stop and the run id, never Duly text.
5. **Should changes to `factory/project.yaml` need your approval, like config.yaml?** Yes or no.
6. **Measure hours the tool's way?** That means from the first agent start to the last agent end, with product-2 at 9.7 hours as the baseline. Yes or no.

Already approved in the earlier change list, noted so you aren't asked twice: the reviewer stops re-running journeys and screens once machine checks run before it, and one feature runs with the 5 minute cache to see if usage falls.
