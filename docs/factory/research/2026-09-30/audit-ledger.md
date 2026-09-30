# Factory audit: what the record says about 2026-09-29 and 2026-09-30

Sources: `duly/.factory/events.jsonl` (8,970 rows, 2026-09-29T05:48 to 2026-09-30T14:22 UTC), `metrics.jsonl` (291 runs), `reviews.jsonl` (22 reviews), the `result` record of each of the 293 `runs/*/stream.jsonl` files (every run was read for usage, not a sample), `failures.jsonl`, `.claude/LESSONS/`, `pmset -g log` (Mac sleep), and `python -m tools.factory.efficiency --since 2026-09-29T00:00`. All times are UTC. Dollar figures are the CLI's list-price estimates. The runs use a subscription login, so read dollars as a measure of usage, not as money spent.

## 1. Headline numbers

| Measure | Value |
|---|---|
| Window | 32.6 h wall |
| Agent runs | 291 (264 done, 23 escalated, 4 failed) |
| Agent time | 19.7 h measured by the monotonic clock. 23.2 h counting sleep, as start-to-end times do. 27.0 h in the efficiency tool, which takes the event span of each run |
| Rounds started | product-1: 70 (43 completed). product-2: 63 (36 completed). ui-1: 4. phase-2 bring-up: 15 |
| Round stops | 62 in all: 19 review vetoes, 38 lane or gate stops, and 5 during phase-2 bring-up |
| Reviews | 22: 19 vetoes, 3 approvals. The founder judged every veto correct |
| Tokens, true totals from the `result` records | 5.12 M output (1.53 M of it thinking), 483 M cache reads, 16.5 M cache writes (all with a 1 h TTL), 12 k uncached input |
| List-price estimate | $364 over 2 days: product-2 $165, product-1 $150, health checks $37, other $12 |
| Subscription meter | The 7-day window peaked at 0.87 before it reset on 09-29T21:00. The new window reached 0.15 after 17.4 h. At that pace the weekly allowance runs out in about 5 days of continuous running, and that is before the founder lane's own session and workflows are counted |

## 2. Measurement defects: fix these before trusting any efficiency number

1. **Output tokens are undercounted about 30 times.** `agent_run.py` reads usage from the streamed `assistant` events. It removes duplicates by message id and keeps the first event's usage. In stream-json those events carry a placeholder output count (4, 8 or 16), and the true count arrives only in the final `result` event. Across both days `metrics.jsonl` records 172.8 k output tokens, while the `result` records hold 5.12 M. For run l-review-8bdafbf964 the metric reads 573 and the true figure is 26,346. The consequence is that `tokens_charged` and the per-task token budget see about 3% of output. The fix: take `usage`, `modelUsage` and `total_cost_usd` from the `result` event. Cost is already read from there, which is why the dollar figures are correct. For the in-flight budget, count input and cache from each event and add the output when the `result` arrives.
2. **Mac sleep is hidden in agent time.** `seconds` comes from `time.monotonic()`, which stops while macOS sleeps. For run l-content-d6cfa8aad6, start to end was 5,217 s, but 511 s was recorded. `pmset` shows the Mac sleeping in 16-minute cycles over two stretches: 09-29T23:53 to 09-30T02:18 and 09-30T10:12 to 11:20. That matches the 16-minute silences in the ledger. **2.65 h of silence fell inside active runs.** caffeinate was used on 09-28 and not during these stretches.
3. **The efficiency tool reports 27.0 h of agent time.** That figure uses event spans, so it counts sleep, and it has no tokens and no causes. Its "reviews" count comes from founder `review:` messages.
4. **The ui-1 reviews are filed as `product-2/review`.** Of the 22 reviews in the record, 2 are ui-1, which inflates product-2's count.
5. **35% of the learning memory is noise.** 19 of the 55 rows in `failures.jsonl` are health-probe rows reading "None in the work". They are injected into prompts as past failures. No row has been added since 09-30T05:37, although 30 stops followed.

## 3. Where product-1's 16.0 h went (09-29T10:40 to 09-30T02:42)

| Bucket | Hours |
|---|---|
| At least one agent running | 9.5 (2.4 of these overlap the Mac-asleep stretch) |
| No agent running | 6.5 |
| - from a stop to the next restart (26 stops) | 4.4 (median 2 min. Three gaps of 56, 67 and 93 min make most of it) |
| - waiting on clean CI | 1.2 |
| - local gates after the merge, before the pull request was ready | 0.7 |
| Summed agent-hours (parallel lanes) | 8.0 |

product-2 took 9.7 h wall: 7.9 h with agents running (1.1 h asleep), 1.8 h with none running, 30 stops, and a median of 1 min from stop to restart. **The founder lane got faster. The cycle count did not fall.**

### Agent time by lane (monotonic, both days)

| Lane | Runs | Hours | Cache reads | List $ |
|---|---|---|---|---|
| L-tests | 60 | 7.02 | 141 M | 104 |
| L-review | 32 | 3.16 | 108 M | 66 |
| L-engine | 46 | 2.76 | 59 M | 51 |
| L-content | 31 | 2.73 | 70 M | 52 |
| L-web | 36 | 2.44 | 90 M | 49 |
| L-desktop | 15 | 0.50 | 9 M | 10 |
| The other 8 lanes (mostly health checks) | 71 | 1.1 | 28 M | 34 |

## 4. Stops and escalations, grouped by cause

The groups follow the founder's `control` verdicts. Of the 24 lane escalations, **the founder ruled the agent right in 13** ("builder right", "test author right", "engine right") and ruled the agent wrong in none. Escalating works as designed. The faults were upstream of the agents.

| Cause | Stops | Stop numbers (see list) | Examples |
|---|---|---|---|
| Plan fault (orchestrator's plan: done command, ordering, runbook breach, jail setup, own wrong point) | 12 | 9, 10, 17, 18, 21, 33, 34, 39, 43, 47, 56, 59 | scratch dir in system temp that the jail blocks. Done command held older tests that a new point had to break. Stale tests after a resolution. "my point 24 conflicted with the pack contract" |
| Coverage gate first checked after the merge (a plan fault, recurring) | 7 | 11, 25, 27, 32, 42, 51, 53 | gate-6 "Coverage is below 80%/95%" and `vitest run --coverage` failing, found at round end each time and never inside the lane's done command |
| Spec gap (the spec was silent or ambiguous, and tests and build read it differently) | 8 | 6, 7, 8, 38, 40, 44, 45, 58 | 66 engine tests contradicted the SPEC (3 stops, about 1.5 h). Journeys J08 and J17. Resolution 14 settled the translation |
| Cross-lane dependency | 3 | 36, 37, 55 | engine done command needed api's parallel work. Tests and pack written in parallel disagreed on ids. desktop needed web |
| Real code error (not caught in the lane) | 2 | 30, 41 | content change broke pack parsing (RulepackError in hidden tests). Engine never read trips' left_on and returned_on |
| Factory or infra fault | 5 | 12, 13, 14, 15, 22 | copy lint scanned coverage output. A CI test needed a Claude login. A pull request already existed. SSH transient. Copy lint read a path the jail denies |
| Approval gate (dependency_added) | 1 | 49 | L-web waited for the founder |
| Phase-2 bring-up | 5 | 1 to 5 | gitleaks false positives, reviewer-approved check |
| Review veto | 19 | section 5 | |

**Of the 57 stops after bring-up, 42 (74%) trace to the plan or the spec: 30 lane or gate stops, cross-lane included, and 12 vetoes from section 5. Only 3 trace to wrong product code (2 stops and 1 veto). The rest: 6 wording vetoes, 5 factory or infra faults, 1 approval wait.**

## 5. Review vetoes: what they found and what each cost

| Group | Vetoes | Which | What was found |
|---|---|---|---|
| Plain-language wording drifting from the quoted law | 6 | product-1 V4 to V9 (09-29T19:44 to 09-30T02:26) | "U.S. workers" became "workers in the United States". Period of admission became stay. Recognized became accepts. Rewrites of accepted texts added 3 new drifts. The plain gate miscounted "U.S." and hid 5 texts over grade 9 |
| Spec gap | 6 | p1 V2. p2 fix1, fix5, fix6. ui-1 x2 | I-983 went quiet. The contract's 20-answer bound trapped 7+ periods. Cap-gap scope. No question copy |
| Orchestrator-written spec or test wrong | 3 | p2 fix2, fix4, fix7 | "my point 15 wording wrong". "petition belonging test wrong (mine)". "regression from my point 22" |
| Plan fault | 3 | p1 V1. p2 V1, fix3 | resolution 11 written after the engine round and never built. "Parts unwired": lanes built pieces with no end-to-end journey. Web lane held |
| Real engine error | 1 | p1 V3 | pre-completion card counted as post-completion. Open job after the last card left quiet |

Cost per review cycle (runs started between two reviews):

| Cycle ending | Wall | Rounds | Runs | Agent h | Output tokens | Cache reads | $ |
|---|---|---|---|---|---|---|---|
| p1 V1 (from build start) | 4.5 h | 17 | 15 | 2.2 | 0.43 M | 34 M | 42 |
| p1 V2 | 1.9 | 10 | 10 | 1.2 | 0.33 M | 35 M | 22 |
| p1 V3 | 0.9 | 6 | 7 | 0.7 | 0.20 M | 19 M | 13 |
| p1 V4 | 1.8 | 8 | 8 | 1.4 | 0.32 M | 35 M | 28 |
| p1 after V4 to approval (6 wording cycles) | 7.0 | 29 | 27 | 2.5 | 0.71 M | 55 M | 42 |
| p2 V1 | 2.1 | 8 | 13 | 1.8 | 0.48 M | 42 M | 31 |
| p2 second veto (fix1) | 2.4 | 22 | 27 | 2.6 | 0.64 M | 65 M | 42 |
| p2 the next 7 cycles to approval | 5.3 | 32 | 53 | 4.9 | 1.16 M | 120 M | 79 |

**The wording vetoes took 7.0 of product-1's 16 h (44%).** Each fix plan re-ran content → tests → build → reconcile → screen → review even when the finding touched only pack text. From plan-fix8 on, the founder narrowed the fix plans to the named rows, and those cycles fell to 0.3 h.

The reviewer is the costliest role per run: a median of 49.5 turns and 5.2 M tokens a run, and 22% of all cache reads. Each review starts with no context and rebuilds its probe scripts under TMPDIR, which are never committed (reviews/product-1-fix5.md: "The probe scripts are under TMPDIR and were not committed").

## 6. Tokens per run

| Role | Runs | Median total tokens | Median output | Median turns |
|---|---|---|---|---|
| reviewer | 22 | 5.16 M | 37 k | 49.5 |
| auditor | 2 | 6.91 M | 50 k | 71.5 |
| rulepack-drafter | 23 | 2.74 M | 34 k | 35 |
| test-author | 50 | 1.68 M | 22 k | 29 |
| builder | 76 | 1.23 M | 11 k | 23.5 |

The most output any single run produced was 98 k tokens (l-web-5f1ae834e8, product-2 build). Across all runs:

- **Cache reads are 94% of all tokens.** 6,595 turns, averaging about 73 k of context each. Every tool call re-reads the whole conversation, so the number of turns drives usage.
- **First-turn context is 24 to 28 k tokens before any work starts.** The project files are small: CLAUDE.md, the role file and the lessons total about 7 k tokens. The rest is the Claude Code harness. `init` shows each agent loaded Cron*, Workflow, DesignSync, RemoteTrigger, PushNotification, SendMessage, EnterWorktree, the claude.ai Docs MCP server, about 20 skills, 2 plugins and auto-memory. The agents used Bash (5,824 calls), Read (244), Edit (141), Write (110) and ToolSearch (2), and nothing else.
- **Bash is used as the editor.** There were about 1,140 file writes through Bash (540 python writes, 465 `cat > file <<EOF`, 138 `sed -i`) against 251 Edit or Write calls. Edit and Write hooks such as lint_touched never see those writes, so the problems surface later, at the gates.
- **3,077 Bash calls begin with `cd <worktree>`.** Short single commands (cat 567, grep 408, sed 356) each cost a full turn.
- **Health checks: 111 runs, 1.1 h, $37 (10% of usage).** About 8 sweeps of 14 lanes each, rerun whenever a fingerprint changed. All 7 builder lanes share one fingerprint (e74f03…), so a change to the builder role reruns all seven.
- **Every run used one model.** claude-opus-5-5 is pinned for every role, including health probes.

## 7. The learning loop

- **245 lesson proposals are pending** in `.claude/LESSONS/proposals` (99 from 09-29 and 146 from 09-30; L-tests 65, L-web 41, L-review 40). The lesson files have not changed since 09-29T10:57.
- **Accepted lessons do not change behavior.** The "pipe hides exit code" lesson (all-lanes.md, accepted on 09-29) was broken **758 times**: pytest, make or vitest output piped into tail, head or grep.
- **The founder's root-cause verdicts exist only as free text** in `control` messages ("builder right", "my plan", "spec gap"). Nothing counts them, so the recurring coverage stop (7 times) and the stale-tests-after-a-resolution stop (5 or more times) were never turned into a check. The preflight added on 09-30 ("refuses a plan with its own faults") is the right direction.
- **The spec grew through vetoes.** product-1's SPEC is 1,401 words. SPEC-resolutions reached 5,055 words (67 points) and took 15 plan files. product-2 needed 21 plan files and 26+ resolution points.

## 8. What would cut the most, ranked by evidence

1. **Fix the meters first.** Read usage from the `result` event, record wall and monotonic time side by side, add `cause` to `control` events (plan, spec, cross-lane, code, factory, infra, content) and have `efficiency` report tokens and causes. Without this, no saving can be measured.
2. **Keep the Mac awake while a plan runs.** Wrap the plan runner in `caffeinate -dimsu`. This recovers about 2.4 h of product-1's 16 h at no token cost.
3. **Review the spec before building.** 9 vetoes and 8 stops were spec gaps or orchestrator-written spec errors, found only after a full build cycle of 0.5 to 2.4 h. One reviewer or red-team pass over SPEC and resolutions against the journeys, before round 1, costs one run of about 5 M tokens.
4. **Put the gates in the lane's done command.** Diff coverage (gate 6), `vitest --coverage` and the hidden-test collection belong there. That removes the 7 recurring coverage stops and the content RulepackError stop.
5. **Scope fix plans to the lanes a finding touches, and make wording mechanical from day one.** A frozen-term glossary (plain_terms) and a freeze on accepted rows, in place before the first review. The 6 wording cycles took 7.0 h and this change came only after the fourth.
6. **Cut turns, not just prompts.** Restrict the tool surface (`--tools Bash,Read,Edit,Write`, strict empty MCP config, no plugins, no skills, no auto-memory). Tell agents that the cwd persists and to batch reads into one command. Route file writes through Edit and Write so the hooks run. With about 73 k of context per turn, every 10% fewer turns saves about 48 M cache-read tokens over two days. How much the tool trim saves is estimated, not measured: compare first-turn context on one health task with and without it.
7. **Make the reviewer cheaper and cumulative.** Commit its probe cases as acceptance tests. Have it review the delta and rerun those tests, not rebuild probes from nothing.
8. **Close the lessons loop.** Drop probe noise from `failures.jsonl`. Triage the 245 proposals. Turn each accepted lesson into a hook or check (for example, reject a test command piped into a filter unless pipefail is set), not prose.
9. **Make health checks lighter.** Give each lane its own fingerprint, rerun only the changed lanes, and consider a smaller model for the smoke probes once golden tasks show it passes.

The founder-lane Workflow runs (0.9 to 2.8 M tokens each) are not in the factory's record, so this audit cannot attribute them. They draw on the same subscription meter.
