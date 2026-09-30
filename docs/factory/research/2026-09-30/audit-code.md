# Factory code audit: how a plan runs, where tokens and time go, how it learns

Date: 2026-09-30. Repository: /Users/ani/Desktop/Duly/duly at b7bf9a3 (branch work/product-2).
Sources: tools/factory/*.py, factory/config.yaml, factory/agents/*.yaml, .claude/agents/*.md,
.claude/settings.json and hooks, docs/factory/RUNBOOK.md, and the factory's own records in
.factory/ (metrics.jsonl 291 runs, events.jsonl 8,970 lines, failures.jsonl, reviews.jsonl,
golden.jsonl, runs/*/stream.jsonl). Figures marked "measured" come from those records.

## 1. The short answer

- Each agent run is fairly cheap: 4 to 10 minutes, about 1.0 attempts, 27 to 72 turns, $1.4 to $3.5
  at list prices. Rounds last 5 to 18 minutes.
- Most of the 15.7 hours went on repeated cycles. Product-2 needed 20 fix plans, and product-1
  needed 11. Across both, 19 of 22 reviews were vetoes, and the rubric line "correct" was the one
  that failed in almost all of them. Each veto starts a new 4 to 5 round plan (tests, build,
  reconcile, checks, review), which takes about 45 to 70 minutes. The factory keeps finding errors
  at the review, after every other step has already run.
- Tokens: 485M raw input tokens over 174 real runs, 57M after cache weighting, and $321 at list
  prices over 32.6 hours. Most of this is cache reads of a context that grows turn by turn. It
  starts near 28k tokens and ends between 85k and 145k. The fixed preamble is small. Tool output
  (a whole SPEC or diff printed with cat, test logs) is what makes it grow.
- Learning: the parts are built but the loop does not run. The failure memory is mostly noise.
  245 lesson proposals are unread. Skills are blocked for agents. The golden tasks have not been
  run since 2026-09-29 09:54. Drift and weekly have never been run. The most useful signal, the
  reviewer's findings, is never saved in a form the next run can use.

## 2. How a plan runs, end to end

1. `phase.main` (phase.py:530). It loads the plan and checks it with `load_plan` (phase.py:70):
   there must be a branch, a spec, and rounds; the branch may not be protected; no round may use
   more than 4 lanes (config `max_parallel_agents`); the auditor is required unless the plan sets
   `audited: false`. The tree must be clean and on the right branch. Then it runs
   `preflight.problems` (preflight.py:81), checks for a subscription login (billing.py:56), and
   claims the orchestrator slot in the registry.
2. Preflight (preflight.py). In a few seconds it checks that there is a `goal`, that a mission
   writes only paths its lane owns, that each done command names only files that exist or that
   this lane or an earlier lane can make, that no done command runs git, that the SPEC points a
   mission names exist, and that any `lane/...` branch a mission names exists.
3. `run_round` (phase.py:464). It starts one `agent_run` subprocess per lane, all in parallel.
   Each gets `briefing()` (phase.py:446): the plan goal, a 160-character summary of each lane
   beside it, and its own mission. `--base` is the working branch (`work/<branch>` when merge is
   `pr`).
4. `agent_run.run` (agent_run.py:381), for each lane:
   - Refuses to start if the contract or lane is invalid, there is no sandbox, the login is not a
     subscription, a paid route is set in the settings, the health check is missing or stale
     (health.py:42), or the day's budget is spent (budget.py:23).
   - Creates a worktree at the base commit (worktree.py:38), links node_modules, and hides
     tests/holdout for implementation lanes. It writes the sandbox settings (sandbox.py:116).
     Writes are allowed only in the worktree and the lane's owned paths. Keys cannot be read.
     The network is shut except for the contract's hosts. Agent, Task, WebFetch, WebSearch,
     NotebookEdit, **Skill** and mcp__* are denied.
   - Runs up to `max_attempts` (2 or 3). Each attempt is a new `claude -p` session with no
     `--resume` (agent_run.py:595). The prompt is built from `PROMPT` (agent_run.py:48): the role
     file, the contract limits, the mission, the "before you build, ask" questions, a reading list
     (PROGRESS.md, the SPEC, CLAUDE.md, PRINCIPLES.md, BOUNDARY.md, DECISIONS.md), the owned paths,
     the done command, the report rules, the feedback from the last attempt, and up to 40 items
     or 12,000 characters of failure memory (memory.py:81).
   - `watch()` (agent_run.py:217) reads the stream. It stops the run on the STOP file, on timeout
     (30 to 60 minutes), after 12 minutes of stall, when the token budget is spent, on a wrong
     model or a paid key, or when the same tool call is repeated 4 times in a row. It writes every
     tool call to the ledger.
   - Project hooks run inside the agent session (.claude/settings.json).
     - PreToolUse: guard_paths on Write and Edit, guard_bash on Bash.
     - PostToolUse: lint_touched runs ruff check, ruff format --check and mypy on every Python
       edit, or eslint on TS.
     - Stop: lane_test.py runs the round's done command (DULY_DONE) and will not let the turn end
       while it fails.
   - After the agent stops, the orchestrator runs the done command itself inside the jail
     (jail.py:66). It checks REPORT.json against the schema and against git status
     (agent_run.py:352), and checks that no file outside the lane changed. When all of that
     passes, it records the agent's lessons as proposals, squashes the work into one commit
     (worktree.py:62), and returns done. If the same failure happens twice, the run is escalated.
     A limit stop is written to failure memory. Unaccepted work is committed to the run's own
     branch (agent_run.py:784).
5. Back in `run_round`. For a reviewer lane, `check_review` (phase.py:380) validates REVIEW.json
   and checks that the decision follows from the scores. It appends the scores, and only the
   scores, to .factory/reviews.jsonl. A veto stops the round. `land()` (phase.py:258) checks the
   diff against the lane again. It holds back changes to dependencies, CI, guardrails, skills or
   contracts for the founder. Anything else is merged with `--no-ff` into the working branch.
6. Round checks (`run_checks`, phase.py:425). Each check in the plan (usually `make test-offline`
   and the hidden tests) runs in the jail on the main checkout, with a 30-minute timeout.
7. Checkpoint (phase.py:323). Only on the last round unless a round sets `checkpoint: true`: push,
   open or update a PR from `work/<branch>` to `<branch>`, wait for CI on that exact commit
   (up to 10 minutes to register and 60 minutes to finish, polling every 15 seconds), merge the
   PR, and fast-forward locally. Nothing is ever merged into `main`.
8. On any failure the round stops with "rerun with --from-round X". A person, or the founder-lane
   Claude session, reads the result, writes a new resolutions point and a new plan file, and
   starts again.

## 3. Where the tokens go (measured)

Per real run, by agent (174 runs, not counting health, golden or drift runs):

| Agent | Runs | Done | Attempts | Minutes | Turns | Raw input/run | Cache-weighted/run | $/run |
|---|---|---|---|---|---|---|---|---|
| builder | 77 | 61 | 1.01 | 4.3 | 27 | 2.05M | 0.23M | 1.37 |
| test-author | 50 | 43 | 1.10 | 8.3 | 35 | 2.79M | 0.32M | 1.99 |
| rulepack-drafter | 23 | 22 | 1.00 | 6.9 | 35 | 2.99M | 0.38M | 2.14 |
| reviewer | 22 | 22 | 1.00 | 7.8 | 49 | 4.82M | 0.59M | 2.72 |
| auditor | 2 | 2 | 1.00 | 9.9 | 72 | 6.86M | 0.82M | 3.50 |

By plan: product-2 used 99 runs, $165 and 260M raw tokens. Product-1 used 68 runs, $150 and 219M.
Within product-2 the most expensive rounds were review ($34), parts ($33) and build ($30).

What makes up the context (measured from stream.jsonl):
- The first turn is about 28k tokens. That covers the Claude Code system prompt and tools,
  CLAUDE.md loaded as project memory, and the factory prompt including about 11.3k characters of
  failure memory. This part is fixed and small.
- By the last turn the context is 85k to 145k tokens. A 35-turn review re-read 2.58M
  cache tokens, and its last turn held 107k. The growth comes from tool output: the whole SPEC
  printed with `cat`, `git diff`, whole source files, and long test logs.
- In practice agents do not follow the reading list word for word. They `tail -40` PROGRESS.md and
  skip the four root documents, because CLAUDE.md is already loaded. They do `cat` the whole
  SPEC. SPEC sizes: design-1 116 KB, documents-1 81 KB, capgap-1 62 KB,
  product-1 SPEC-resolutions 31 KB, product-2 resolutions 16 KB.

Design choices that multiply the cost:

| # | Mechanism | Where | Effect |
|---|---|---|---|
| T1 | Every attempt is a new session with no `--resume` | agent_run.py:595 | Attempt 2 pays the 28k preamble again and has to rediscover the code. Small today, because attempts average 1.0 to 1.1 |
| T2 | The done command runs 2 to 3 times per attempt: once by the agent, once by the Stop hook (lane_test.py), and once in the jail | .claude/hooks/lane_test.py, agent_run.py:720 | For reconcile lanes the done command is the whole of tests/unit and tests/holdout, and for web lanes it is `make samples && npm test` twice |
| T3 | The Stop hook turns one failure into "the same failure twice" | lane_test.py plus the "same failure twice → escalate" stop condition in every contract | At least 3 of the 22 escalations say "my run and the stop hook". A whole plan round is lost each time |
| T4 | Round checks run even after an agent failed or the reviewer vetoed | phase.py:517 `ok = run_checks(...) and ok` | `make test-offline` (up to 30 minutes) runs for a round that has already stopped |
| T5 | `--from-round` runs every lane of the round again, including lanes that already landed | phase.py:464 | A new full session for each lane that had already succeeded |
| T6 | The health fingerprint hashes agent_run.py and sandbox.py | health.py:19 | Any edit to the runner makes every agent:lane pair (about 15) stale. `make doctor` then runs about 15 full sessions (111 health runs so far, 66 minutes). Each is a full prompt with memory for a task that writes one file |
| T7 | One pinned model, Opus 5.5, for every contract, enforced | config.py:72, agent_run.py:282 | Health checks, lint-only test rounds and `make samples` lanes cannot use a cheaper model |
| T8 | The reviewer re-runs the journeys by hand | plan missions, e.g. plan-fix7 review: "Send all twenty journeys and their twins through POST /v1/compute" | The review is the most expensive round ($34 in product-2), and it does work that tests/unit/acceptance/test_journeys.py already does |
| T9 | Failure memory is injected into every prompt from every lane | memory.py:84 | About 2.8k tokens a turn. See L1: most of it is noise |

The token budget is also measured wrongly (defect D1): output tokens are undercounted about 46
times.

## 4. Where the time goes (measured)

`make efficiency` over the whole ledger (32.6 hours of wall time):
- Agents: 27.0 hours in total. Lanes overlap. The largest are L-tests 8.1 hours, L-content 5.2,
  L-web 4.1 and L-review 3.8.
- CI: 16 waits, 1.7 hours. This is no longer the main cost, since phase.py:518 moved to one CI
  run per plan.
- Stops: 62 stops, 6.4 hours from stop to restart. The median is 1.2 minutes and the 90th
  percentile is 17 minutes. A few long stops account for most of the total.
- Reviews: 22 reviews and 19 vetoes. "correct" scored 1 to 3 in 17 of the 19 vetoes, and
  "tested" was often 2 or 3.
- Round checks failed 26 times: "offline gates" 15, "hidden tests" 4, "engine tests" 3, others 4.
  The lanes' done commands passed, but the gates (diff policy, coverage, copy lint) caught the
  problem only at the end of the round.
- Round lengths: review averages 10.1 minutes (22 runs), content 18.3, reconcile 8.5, tests 9.0
  and build 7.3.

What this adds up to: one fix cycle takes about 45 to 70 minutes (tests, then build, then
reconcile, then checks, then review, then the restart). Thirteen cycles comes to 15.7 hours. To
cut the time, the factory has to go through fewer cycles. Speeding up each run helps much less.

## 5. The learning mechanisms, one by one

| # | Mechanism | Code | State today | Verdict |
|---|---|---|---|---|
| L1 | Failure memory (.factory/failures.jsonl), fed into every prompt | memory.py:27, 81; written at agent_run.py:710, 752 | 55 rows. 52 are unvetted agent reports written before commit e0f5931, and they are still injected. 38 of the 55 are health-probe notes ("None in the work. The write to .../probe.txt ... was refused"). The fix line on 28 rows reads "Nothing to fix". No row ever expires. Other lanes' rows fill the remaining slots | Broken. It is noise, and it goes against D44 (unvetted lessons reaching agents) |
| L2 | Lesson proposals (agents' REPORT.json lessons, filed to .claude/LESSONS/proposals/) | memory.py:102 | 245 files in 2 days (99 on 2026-09-29, 146 on 2026-09-30). 28 of them are health-probe noise. Nobody has triaged them | Stuck in the inbox. Nothing comes out |
| L3 | Accepted lessons (.claude/LESSONS/<lane>.md, all-lanes.md) | memory.accepted, memory.py:63 | About 7 KB across 5 lanes, accepted on 2026-09-29 (D44). Fed in first, ahead of L1 | Works, but has not been updated since |
| L4 | Skills (.claude/skills/*) | denied at sandbox.py:160 | 6 skills. Agents cannot load them, the prompt never mentions them, and the first replay found no effect (D36) | Not wired to the agents |
| L5 | Skill curator (L-factory lane, weekly) | skill-curator.md | About 0.1 hours of runs in total. No curation run since 2026-09-28 | Not running |
| L6 | Golden tasks (evals/factory/golden.yaml, 3 tasks) | golden.py | Run twice: 0% at 09:39 and 100% at 09:54 on 2026-09-29. Factory commits have landed since then without a rerun. All three tasks are toy tasks, and none has a threshold for tokens or time | Exists. Not used as a gate for changes |
| L7 | Judge drift (rescore an old review) | drift.py | 0 rescored rows in reviews.jsonl | Never run |
| L8 | Weekly review of sampled traces | weekly.py | docs/factory/reviews/ does not exist | Never run |
| L9 | Health checks | health.py, control.doctor | Up to date. They test the walls, not skill | Working, but costly (T6), and they pollute L1 and L2 |
| L10 | Efficiency report | efficiency.py | Working. It covers wall time, agent time, CI, stops and vetoes | Working. It does not break down tokens or cause of veto |
| L11 | Reviews log (.factory/reviews.jsonl) | phase.py:403 | Scores and decision only. No findings are kept | The best learning signal is thrown away |
| L12 | Telemetry (metrics.jsonl, OTel spans) | telemetry.py | Complete per run. Output tokens are wrong (D1) | Working, with a defect |
| L13 | Preflight (lessons written into code) | preflight.py | Catches three kinds of plan fault that each used to cost an escalation | Works. This is the best pattern the factory has |
| L14 | Runbook rules ("journeys are a gate", "reviewer reads everything in one pass") | RUNBOOK.md:93-119 | Written as prose. Only the CI change (phase.py:518) and preflight are enforced in code | Only partly in force |

What they have in common: the factory learns only when a person turns a lesson into code
(preflight, phase.py:518, charged()). The automatic channels (L1, L2, L4, L5) are either noise or
never reach an agent.

## 6. Defects found

- **D1. Output tokens are undercounted about 46 times (CONFIRMED).** `watch()` counts each
  message id's usage once, on the first streamed event (agent_run.py:290), but those events carry
  a partial count. Run l-review-8bdafbf964 counted 573 output tokens against the result event's
  26,346, of which 8,435 were thinking. The token budget, `tokens_out`, and the OTel
  `gen_ai.usage.output_tokens` are all wrong. `total_cost_usd` is correct, because it is read
  from the `result` event. Fix: take usage from the `result` event, which also has `modelUsage`,
  and keep the streamed count only as a running estimate.
- **D2. Legacy unvetted agent lessons are still injected (CONFIRMED).** 52 of the 55 rows in
  failures.jsonl came from agent reports before e0f5931 (2026-09-29 05:04 PDT). `for_prompt`
  still reads them, and they fill about 11.3k characters of every prompt. Fix: purge or archive
  those rows, filter by `source == "orchestrator"`, and add an expiry.
- **D3. Health runs write lessons and memory (CONFIRMED).** Health tasks go through the normal
  finish path (agent_run.py:737), so their "probe was refused" notes become proposals and, in the
  past, memory. Fix: skip `memory.propose` when the task starts with `health/`.
- **D4. The Stop hook causes early escalation (CONFIRMED in 3 run reasons).** Fix: have
  lane_test.py say that its block is the same check, not a new failure, or change the stop
  condition to count only failures between edits. Or drop the Stop hook for factory runs, since
  the orchestrator runs the done command itself.
- **D5. The Stop hook runs agent code outside the jail (PLAUSIBLE).** lane_test.py runs
  `bash -c $DULY_DONE` as a hook process. Claude Code's sandbox wraps the Bash tool, and it is
  not clear that it also wraps hooks. RUNBOOK line 39 says every done command runs in the jail.
  This needs checking.
- **D6. Checks run after a round has already failed (CONFIRMED by reading the code)** (T4).
- **D7. PROGRESS.md grows without limit and is merged (CONFIRMED).** tests/PROGRESS.md is 200 KB
  and 2,945 lines, rulepacks 119 KB, engine 94 KB, web 77 KB. The prompt calls it "your memory
  between attempts", but it is append-only and a plain Read shows the first 2,000 lines, which are
  the oldest. Agents work around this with `tail`. It also adds to every lane's diff and review.
- **D8. Unaccepted work is kept but nothing finds it again (CONFIRMED).** `kept_commit` is written
  (agent_run.py:398) and read nowhere. A later run picks it up only if a person names the branch
  in the mission.
- **D9. A veto raises alert kind `eval_drop` (CONFIRMED, minor).** phase.py:419. The "Needs you"
  panel then mixes judge drift with ordinary vetoes.

## 7. Recommendations, most useful first

Leaner and faster (fewer cycles first, then cheaper cycles):

1. **Turn every veto finding into a test before the next build** (this attacks the 19 of 22
   vetoes). The reviewer already writes each finding with a file, an exact input and what happens.
   - Append the findings to reviews.jsonl or a findings.jsonl, not only the scores.
   - Have the next plan's tests round turn each blocking or should_fix finding into a failing
     acceptance test automatically.
   - Add a preflight rule that refuses a fix plan unless each open finding id is named by a test
     in the plan.
   The reviewer then confirms, as the RUNBOOK intends, instead of discovering.
2. **Put the journeys and the offline gates in the build lanes' done commands.** That is where
   the 26 round-check failures were caught late. The fast parts of `make test-offline` (diff
   policy, copy lint, engine literals) take seconds. Preflight can refuse a behaviour plan whose
   build lanes do not run test_journeys.py.
3. **Remove the reviewer's manual journey sweep** from missions (T8). Point it at the test output
   and at what tests cannot see: sources, wording, screens. This should cut the review round by
   roughly half.
4. **Drop the Stop hook for factory runs, or make it a no-op when DULY_RUN_ID is set** (T2, T3,
   D4, D5). The orchestrator's jailed run is the real check. This saves one to two full done-command
   runs per attempt and removes a cause of false escalation.
5. **Skip round checks when an agent failed or the reviewer vetoed** (T4). **Make
   `--from-round` skip lanes whose task already landed** (T5); the `Factory-Task` trailer on the
   working branch shows which ones.
6. **Cut context growth.**
   - Give each lane only its SPEC points: `briefing()` could quote the points the mission names,
     not the whole SPEC path.
   - Tell agents to `grep` or `sed -n` rather than `cat` whole files and diffs.
   - Cap PROGRESS.md at the last N entries and move older entries to an archive file (D7).
   - Drop the reading-list lines for files Claude Code already loads (CLAUDE.md).
7. **Let a contract name a cheaper model** (T7) for health checks, lint-only test-writing rounds,
   and mechanical lanes such as `make samples`. Keep Opus for build, review and rules. Change
   config.py:72 from an exact pin to an allowlist.
8. **Health checks** (T6): take agent_run.py out of the fingerprint, or hash only the
   sandbox-relevant functions, and send the health task a minimal prompt with no memory.
9. **Resume the session on retry** (T1): use `--resume <session>` with the feedback as the next
   message instead of a new session. This is lower priority while attempts average 1.0 to 1.1.

Quality that improves:

10. **Finding classes as permanent tests.** Each veto's "correct" finding (wrong date, a stage
    shown as now, an id leaking into copy) becomes a property test or a journey twin, owned by
    test-author and kept. The rubric trend should rise over time. Track "vetoes per plan" and
    "first-review approval rate" in efficiency.py.
11. **A cheap pre-review inside the build round.** A read-only reviewer pass on the lane diff
    before landing, perhaps on a cheaper model, costs about $1. A full cycle costs about 60
    minutes.

Learning that works:

12. **Clean the memory now** (D2, D3). Purge the legacy rows, stop health runs writing lessons,
    feed each lane only its own rows plus all-lanes rows, and add expiry: drop a row once the same
    task later passes.
13. **Triage proposals automatically.** Cluster the 245 proposals by fingerprint or similarity.
    Drop the probe notes. Rank the rest by repeat count and by rounds lost, and show the top 5 in
    the Factory window with one-click accept into <lane>.md. Run the skill curator after every
    plan, not weekly.
14. **Wire skills in, or retire them.** Either lift the `Skill` deny (sandbox.py:160) and name the
    relevant skill in the prompt, or turn the useful ones into accepted lessons.
15. **Make golden the gate for factory changes.** Run `make golden` in the founder lane's done
    command for any change to tools/factory, contracts or role files. Add a thresholded task per
    agent for tokens and minutes, so the factory can see whether it got leaner. Schedule drift and
    weekly (L7, L8) instead of relying on memory.
16. **Fix telemetry** (D1) so that token budgets and the "leaner" claims rest on correct numbers,
    and add tokens by lane and by round to `make efficiency`.
