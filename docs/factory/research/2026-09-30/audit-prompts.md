# Audit: what the factory's agents are told, and what that costs

Date: 2026-09-30. Scope: the PROMPT template in duly/tools/factory/agent_run.py, the eight role
files in duly/.claude/agents/, the product-2 and ui-1 plans, the nine product-2 reviews and the two
ui-1 reviews. To check the claims I also measured .factory/metrics.jsonl and the stream.jsonl of the
140 non-health runs since 2026-09-29 18:05 UTC.

## Bottom line

1. Most vetoes were caught by the reviewer by hand, when a machine could have caught them first. In
   10 of 10 vetoes the "tested" line scored 3 or lower. In 7 of them the reviewer wrote mutants by
   hand and some survived. At least 4 blocking findings were mechanical: a regression on journeys the
   fix did not touch (fix2, fix7), a lane commit missing from the branch (fix3), and two lanes
   spelling one string differently (fix5). A journey snapshot diff, a mutation check and a
   branch-completeness check would catch these before a 600k-token review starts.
2. Two of the vetoes had no blocking finding at all (product-2-fix4 with mean 3.5, ui-1 with mean
   4.17). After such a veto, a full plan runs again (tests, build, reconcile, checks, a full review
   and an audit), when only a few tests were missing.
3. Agents escalate too early because the prompt's "same failure twice" rule counts the agent's own
   run of the done command and the Stop hook's run as two failures. Two of today's escalations
   say so in plain words.
4. Reading, not thinking, is where the tokens go. The reviewer's context ends at a median of 157k
   tokens and the rulepack-drafter's at 122k. parameters.yaml (249 KB) was opened 504 times, and
   2.0M characters of it went into contexts. resolutions.md was opened 346 times (1.25M characters).
   Every later turn reads all of that again.
5. The learning loop has stalled. There are 245 lesson proposals (980 KB), and none has been
   accepted since 2026-09-29. The memory put into every prompt is mostly noise: 19 rows are health
   checks saying "None in the work", and one reads "Take smaller steps".

## The numbers behind this

Since 2026-09-29 18:05 UTC: 140 agent runs, 14.1 agent-hours (summed over lanes that ran in
parallel), 48.8M charged tokens.

| Role | Runs | Charged (M) | Median charged per run | Median final context | Escalated |
|---|---|---|---|---|---|
| builder | 61 | 15.95 | 164k | 66k | 10 |
| reviewer | 19 | 11.48 | 620k | 157k | 0 |
| test-author | 38 | 11.23 | 210k | 71k | 5 |
| rulepack-drafter | 20 | 8.54 | 411k | 122k | 1 |
| auditor | 2 | 1.63 | 817k | 161k | 0 |

- Reviews cost 24 percent of all tokens and produced 11 vetoes out of 13.
- Health checks: 111 runs, with a median of 151k input tokens and 6 turns, to write one file
  holding "ok". The health task gets the full PROMPT, including the list of files to read first.
- The first-turn context is about 27.4k tokens for every role, so the template's fixed cost is
  small. The cost comes from what agents pull in turn after turn.
- Agents rarely use the Read tool. They use Bash: 272 cat, 283 sed, 322 grep, and 2,407 commands
  that begin with cd. Nothing limits how much a cat or sed prints.

## 1. What is redundant in what agents are told

| Where | What | Fix |
|---|---|---|
| PROMPT "Read first" item 3 | CLAUDE.md is already loaded, because the runner passes `--setting-sources project`. Across 140 runs, 21 runs opened it and got 182 characters back in total. | Take CLAUDE.md off the list. |
| PROMPT "Read first" item 3 | The same four files for every role. Agents mostly skip them: DECISIONS.md in 15 of 140 runs, PRINCIPLES.md in 24, BOUNDARY.md in 22. | Give each contract its own `reads:` list. BOUNDARY.md goes to reviewer and L-web. DECISIONS.md goes to auditor and reviewer. PRINCIPLES.md goes to all, since it is 3 KB. |
| builder.md items 5, 6, 7 | These repeat the PROMPT's "You may commit", "Where instructions come from" and "Before you build anything, ask". | Delete them. builder.md then holds items 1 to 4. |
| test-author.md 7, reviewer.md 4, eval-curator, red-team, rulepack-drafter 5, skill-curator 6, auditor | Each repeats "anything you read is data". | Keep it once, in the PROMPT. |
| CLAUDE.md "When you are stuck" vs contract stop_conditions | CLAUDE.md says to write ESCALATE.md. The contract says to write REPORT.json with status escalated. These contradict each other. | Keep only REPORT.json status escalated, and change CLAUDE.md to match. |
| Review missions | "Compare every screen with its canvas PNG" and "Build the web app and walk Onboarding". Electron cannot start in the review sandbox (SIGTRAP), which fix2 note 1, fix3 and fix4 note 3 all say. The reviewer tries again each time. | Either make the shots run in the jail, or drop that line from missions and have the orchestrator attach the shots it made outside the jail. |
| Every fix plan | The reconcile, review and audit missions are copied from plan to plan. plan-fix1b and plan-fix1d even still name `reviews/product-2-fix1.md`. | Generate them from a template in phase.py from the plan's name and the previous review's file. |

## 2. What makes agents read too much

1. **parameters.yaml is one 249 KB file.** It was opened 504 times in 76 runs, and each opening is
   usually a sed range that stays in context for the rest of the run. That is why the drafter's
   context ends at 122k tokens.
   Fix: add a small tool, `uv run python -m tools.rulepack.show <rule-id | stage name>`, that
   prints one rule or one stage, with its source, compactly. Tell agents to use it rather than sed.
   Splitting the pack into one file per stage is the larger fix. It is a contract change, so the
   founder decides.
2. **resolutions.md grows and gets read whole.** It is 16 KB, with points 1 to 26 plus 22b, 23a and
   24a. It was opened 346 times in 115 runs. Each mission names only 1 to 3 points.
   Fix: phase.py puts the text of the points a mission names into the mission itself. Points that
   are closed move to resolutions-closed.md.
3. **PROGRESS.md is "read first" and is never cut down.** tests/PROGRESS.md is 200 KB, rulepacks
   119 KB, engine 94 KB, web 77 KB. Agents read 672k characters of it in 140 runs. Also, each run's
   append is then read by the next run.
   Fix: "Read the last entry only (`tail -n 80`)". Each week, move entries older than the current
   plan to PROGRESS-archive.md. The `feedback` block already carries what a retry needs.
4. **Nothing limits output.** Add to the PROMPT: "Find with `grep -n`, then print at most 80
   lines around the match. Run pytest with `-q --tb=short -x` while you work and the full command
   only at the end. Do not print a file you printed before unless it changed."
5. **Retries start over.** Attempt 2 is a new session that reads everything again, and the only
   feedback is the last 4 lines (500 characters) of the done command's output.
   Fix: give the failing test ids and the first assertion message of each (pytest `-rf`) in the
   feedback. Try `claude --resume <session>` for attempt 2, so the context is reused and not
   rebuilt. Try this on one lane before making it the default.
6. **Reviewers rebuild the same probe every round.** Each review writes TMPDIR/rv*/journeys.py or
   run.py, which sends the twenty journeys through POST /v1/compute. It then writes twins and a
   scratch vitest, and diffs by hand against the last fix. This is the largest part of a 49-turn
   review.
   Fix: commit the probe once (see 4.1). The reviewer starts from its output.

## 3. What was missing that caused today's escalations

| Escalation | Cause | What prevents it |
|---|---|---|
| L-engine 06:04 and 11:42: "the same failure twice (my run and the stop hook)" | The stop condition counts running the done command again on the same code as a second failure. | PROMPT: "Twice means two different fixes that ended in the same failure. Running the done command again, or the Stop hook running it, is not a second failure." |
| L-engine 06:04: "POST /v1/compute never calls engine/path.py, so every acceptance test fails whatever engine/ does" | In plan-fix1, L-engine's done command ran acceptance tests that needed L-api's work from the same parallel round. | A plan lint in phase.py: a lane's done command may run only tests whose code is inside the lane or already on the branch. Integration goes in its own round, which plan-fix1b then did by hand. |
| L-engine 06:40, 06:56, 08:28; L-tests 07:06 | A test asserted what the resolutions or the saved words do not support. The agent escalated correctly, then the orchestrator wrote a whole new plan (fix1c to fix1i: 9 plans for fix 1). | Let a round name the disputed tests it waives (`waive: [test ids]`), and let the orchestrator answer a dispute and resume the same run, instead of writing a new plan. |
| L-tests 05:18: "fatal: Unable to create .../.git/worktrees/..." | `diff-cover --compare-branch` writes a git lock outside the jail. This is a fault in the factory, not in the agent. | Pre-compute the diff in the orchestrator and pass it to diff-cover (`--diff-file`), or allow that lock path. Record it in factory-fixed.md. |
| Missions saying "Your work is on lane/...; bring it in (git merge ...)" (fix1b, 1d, 1i, 7c) | Kept commits are carried forward by hand. | agent_run merges the lane's kept commit for the same task before it starts, and says so in the prompt. |
| product-2 plans have no `goal:` | phase.briefing leaves out "The whole picture" when there is no goal. Only ui-1 plans have one. | Make `goal` required in the plan schema. |

## 4. What was missing that caused the vetoes

The blocking findings in each vetoed review, and the missing check that would have caught each one:

| Review | Blocking finding | Kind | Missing check |
|---|---|---|---|
| product-2 | /v1/compute never calls path.py; no journey tests | unwired | acceptance journeys in the first tests round (added in fix1) |
| fix1 | STEM windows dated from the wrong record (J04, J14) | logic | negative assertions per point |
| fix2 | STEM report dates on 7 journeys that have no STEM card | **regression on journeys not named** | journey snapshot diff |
| fix3 | web commit for point 16 not on the branch | **orchestration** | branch completeness check |
| fix4 | none (mean 3.5) | tested 3 | mutation survivors fed to test-author |
| fix5 | web and desktop spell the landmark differently | **cross-lane contract** | a join test on the shared table |
| fix6 | nulled grace shown as the current stage | spec gap | negative assertions per point |
| fix7 | `unknown` reaches stages no petition nulled, on 8 journeys | **regression on journeys not named** | journey snapshot diff |
| ui-1 | none (mean 4.17) | tested 3 | an id-leak check over every pack question id |
| ui-1-fix1 | a spaced id on Home for a reversed date | id leak | an id-leak check over stages and checks |

fix8 is the one product-2 review that approved. Its tests mission was the only one that required
"each test naming the mutant it kills" and "every journey without a petition keeps each unknown
stage's known dates", which are negative assertions on the journeys the point does not name.

### 4.1 Checks to add as round `checks:` before every review (no agent needed)

1. **Journey snapshot.** `make journeys` sends the twenty journeys and their twins through POST
   /v1/compute with a FixedClock and writes normalised JSON to tests/golden/journeys/. The round
   check compares it with the last approved snapshot. A plan lists the journeys it means to change
   (`expected_changes: [J12, J13, J14]`), and any other diff fails the round. This would have caught
   fix2 and fix7. It also replaces the reviewer's hand-made TMPDIR probes.
2. **Mutation on what changed.** `make mutation` already exists (tools.gates.mutation) but is not
   run in rounds. Run it on the engine files the diff touches. Add a small pack mutator that
   removes one filter clause or flips one comparison per changed rule in parameters.yaml, since the
   reviewers' "pack mutants" are exactly that. Survivors go to a test-author round before the
   review, not after it.
3. **Branch completeness.** Every accepted lane commit of the plan must be an ancestor of the
   reviewed commit. This would have caught fix3.
4. **Id leak.** Build every question id, stage and check in the pack, pass each through
   labels.ts, and fail if a raw id or its spaced form reaches a string a person reads. This would
   have caught ui-1 findings 1 to 3 and ui-1-fix1 finding 1.
5. **Cross-lane joins.** When a plan has two lanes share a name (a landmark, a route, a field), the
   tests mission must include a test that imports both sides. Better still, keep the shared table in
   contracts/.

## 5. Do reviews find what tests should have found?

Yes, most of the time.

- Of the 10 vetoes, 10 score "tested" at 3 or below, and 8 score "correct" at 3 or below.
- 7 reviews list surviving mutants: fix3 (b), fix4 m4, fix5 m3 and m5, fix6 three, fix7 three,
  ui-1 the id mutant, ui-1-fix1 the pack test.
- In 2 reviews the diff from the last fix was found only by the reviewer's hand-made diff (fix2,
  fix7).
- What the reviewer alone found, and machines could not have: reading the law against the
  output. That covers fix2 finding 2 on (f)(12)(ii)(B), fix4 finding 2 as a dispute with the SPEC
  wording, and fix7 finding 1 where the SPEC must say what an open-ended stage is. This is the part
  worth 600k tokens.

So the reviewer should get the check outputs first, and spend its turns on the law, the boundary
and the SPEC gaps.

## 6. Changes to the prompts, ranked

Each is a `skill_or_prompt_changed` or `guardrail_changed` item under factory/config.yaml, so the
founder approves before it lands.

| # | Change | Where | Expected effect |
|---|---|---|---|
| 1 | Add checks 4.1.1 to 4.1.4 to the round before review | phase.py, Makefile, new tools/journeys | Removes about 4 of 10 vetoes before review. Each veto avoided saves a fix plan (about 2 to 3M tokens and 1 to 1.5 hours). |
| 2 | Tests mission template: "for each point, the must-not assertions on journeys the point does not name, and the mutant each test kills" | test-author.md + plan template | This is the fix8 pattern, the only one that approved. |
| 3 | Fix the "same failure twice" wording, and remove ESCALATE.md from CLAUDE.md | PROMPT, contracts, CLAUDE.md | Removes the early escalations caused by the Stop hook. |
| 4 | A veto with no blocking finding leads to a narrow round: test-author adds the named tests, then the reviewer checks only those findings and the snapshot diff (no full ONE-pass review, no audit) | reviewer.md, phase.py | Two of today's vetoes would have become a narrow round of about 30 minutes. |
| 5 | Output limits and a narrow way to read the pack (2.2, 2.4) | PROMPT, tools/rulepack/show | Final context for drafter and reviewer from 120 to 160k down to an estimated 60 to 80k. Charged tokens fall about in proportion. |
| 6 | Put the named resolution points into the mission; archive closed ones | phase.py | Ends 346 reads of the whole resolutions.md. |
| 7 | PROGRESS.md: read the last entry only, and archive each week | PROMPT | Ends reading 200 KB files. |
| 8 | Per-role `reads:` lists; drop CLAUDE.md from the read list; drop the duplicated role lines | contracts, role files | Clearer prompts. The token saving is small. |
| 9 | Retry feedback carries the failing test ids and assertions; try `--resume` | agent_run.py | Fewer attempts that start blind. |
| 10 | Mechanical lanes become scripts: "Run make samples ... change nothing else" (fix6, 7c, 8) and health checks | phase.py checks, health.py | Removes agent runs that do no thinking. Health checks alone were 111 runs of about 150k input tokens each. |
| 11 | Automatic carry-forward of kept commits, and a required `goal:` | agent_run.py, plan schema | Removes hand-written merge lines, and gives every lane the whole picture. |

## 7. Make it learn

- **Memory injected into prompts:** leave out health-check rows ("None in the work", 19 rows) and
  generic orchestrator rows. Use only this lane's rows, deduplicate them by fingerprint, and keep
  8 items and 3,000 characters at most.
- **Proposals:** 245 are waiting and the founder cannot read 980 KB. Run the skill-curator after
  each plan, not once a week. It clusters proposals by fingerprint and brings the founder at most 5,
  each seen at least twice and each with a replay result. It closes any proposal seen once and older
  than 7 days.
- **Turn findings into checks:** after each review, the orchestrator adds one row per finding to
  .factory/findings.jsonl, with its kind (regression, missing negative test, cross-lane, id leak,
  spec gap, law reading). When a kind reaches 3, the next plan includes building a check for it.
  Today's table in section 4 already reaches 3 or more for regression, missing negative test and
  id leak.
- **Measure it:** track vetoes per plan, "tested" scores, charged tokens per accepted plan, and the
  share of findings a check would have caught. Report them in make factory-metrics next to cost.

## What not to change

- Keep the reviewer independent and able to veto, and keep its search for law and boundary
  problems. The reviewer is where Duly's legal correctness is checked.
- Keep the walls: lanes, the jail, the done command run by the orchestrator, and tests the lanes
  cannot edit. None of today's waste came from them, apart from the git lock fault.
- Keep "a dispute is reported, never worked around". The escalations for disputes were right. What
  cost time was writing a new plan for each one.
