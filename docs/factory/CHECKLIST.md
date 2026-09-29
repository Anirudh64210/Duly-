# The founder's checklist, item by item

The 50 requirements the founder set on 2026-09-29, each with how the factory meets it and how that is proven. "Proven by" names a test that fails if the claim stops being true, or a run that was carried out.

Status words: **Met** means built and proven. **Met, with a limit** means built and proven, with a stated gap. **Open** means not met; the reason and what it needs are given.

Tests are in tests/unit/tools/. Real-agent runs are recorded at the end of this file.

## 1. Agent setup and validity

| # | Requirement | How | Proven by | Status |
|---|---|---|---|---|
| 1.1 | One written contract per agent: role, inputs, outputs, tools, stop conditions | factory/agents/<name>.yaml, one file per agent, held to contracts/factory_agent.schema.json | test_every_shipped_contract_loads_and_is_complete | Met |
| 1.2 | Definitions are versioned files | Contracts, role files, lanes, plans and config are all in the repository. Each contract carries a version, written into every commit the agent makes | test_the_ordinary_path (trailer "contract v1") | Met |
| 1.3 | Each agent declares model, max turns, token budget, timeout | Required fields of the contract. The runner ends the process at each limit | test_a_hang_is_stopped_by_the_time_limit, test_a_token_budget_stops_the_run, test_the_wrong_model_is_refused | Met |
| 1.4 | Output validated against a schema before it is accepted | Every agent writes REPORT.json, checked against contracts/factory_report.schema.json and against what git shows. Reviews are checked against contracts/factory_review.schema.json | test_a_malformed_report_is_refused, test_a_report_that_leaves_out_a_changed_file_is_refused | Met |
| 1.5 | No unbounded sub-agents | Depth is 0. The Agent and Task tools are denied, the network refuses the model's host, and the login is unreadable inside the sandbox. The config refuses any other depth | Sandbox probe step 17; test_a_config_that_opens_the_network_or_allows_subagents_is_refused | Met |
| 1.6 | Idempotent reruns | Each run has its own id, worktree and branch from a recorded commit. A rerun leaves no duplicate merge, claim or branch on the phase branch | test_a_rerun_of_the_same_task_leaves_no_duplicate | Met |
| 1.7 | Health check before joining a run | `make doctor`. A pass is tied to the exact contract, role file, sandbox and runner, and is asked for again when any of them changes | Real run, below | Met |

## 2. Git worktree isolation

| # | Requirement | How | Proven by | Status |
|---|---|---|---|---|
| 2.1 | One worktree per agent per task, from a pinned commit, cleaned up | tools/factory/worktree.py. The base commit is recorded in the ledger, the registry and the commit. Removed after the merge | test_a_seed_plan_becomes_a_checked_traceable_branch | Met |
| 2.2 | No writes outside the worktree, enforced by the operating system | Claude Code's sandbox (seatbelt, bubblewrap). Inside the worktree, paths outside the lane are denied too | Sandbox probes: writes to tests/, Makefile, the main checkout and the home folder were all refused by the operating system | Met |
| 2.3 | Protected branches are push-blocked; changes land by pull request | Agents cannot push: no network, no keys. Rounds reach the phase branch only by pull request after clean CI. The orchestrator refuses any plan that targets a protected branch | test_work_reaches_the_phase_branch_only_through_a_pull_request_that_ci_passed, test_nothing_reaches_the_phase_branch_when_ci_fails | Met, with a limit: GitHub does not offer branch protection on a free private repository, so on GitHub itself `main` is protected by the factory's rules and not by the server. Needs GitHub Pro or a public repository |
| 2.4 | The working agent never merges | The orchestrator merges. An agent cannot write the phase branch or `main` | Sandbox probe: `git update-ref refs/heads/main` and `git branch -f phase-2` refused; test_moving_a_protected_branch_fails_the_run | Met |
| 2.5 | Worktrees are disposable | A run can be killed at any point; nothing is merged until the orchestrator has checked it | test_the_kill_switch_ends_runs_and_blocks_new_ones, test_a_merge_conflict_is_reported_and_leaves_the_branch_clean | Met |
| 2.6 | A registry prevents two agents claiming the same task | tools/factory/registry.py, under a file lock. One claim per lane, per task and per orchestrated branch | test_a_lane_or_a_task_can_be_claimed_once, test_two_orchestrators_cannot_share_a_branch | Met |

## 3. Self-improvement guardrails

| # | Requirement | How | Proven by | Status |
|---|---|---|---|---|
| 3.1 | Improvements are proposed as diffs, never applied live | The curator works on its own branch. Any change under .claude/skills, .claude/agents or .claude/LESSONS is held for the founder | test_work_kept_for_the_founder_is_not_merged | Met |
| 3.2 | Self-modification goes through the same review and eval gate | Held for the founder, then `make golden` before and after, then `make doctor` | docs/factory/RUNBOOK.md, "Before a change to the factory" | Met, with a limit: the founder's merge is a local merge today, not a pull request |
| 3.3 | Safety rules, permissions and eval criteria are read-only to agents | The sandbox denies writes to factory/, contracts/, tools/, .claude/hooks, .claude/agents, the settings files, CI, and the doctrine files | Sandbox probe steps 9 and 10; test_the_sandbox_settings_for_a_lane | Met |
| 3.4 | Regression memory with a size cap and no repeats | tools/factory/memory.py. Failures from the orchestrator and lessons from reports, handed to the next agent as data about the past | test_memory_removes_repeats_and_keeps_to_its_caps, test_lessons_from_a_report_are_kept_once | Met |
| 3.5 | Improvement claims cite eval evidence | Each skill has a REPLAY.md. The first curation reported "no change" for all six | .claude/skills/*/REPLAY.md | Met |

## 4. Evaluation

| # | Requirement | How | Proven by | Status |
|---|---|---|---|---|
| 4.1 | Golden test set, run before and after every change | evals/factory/golden.yaml and `make golden`. Three tasks: a build, a test that must fail when the code is broken, and a review of a planted fault that must be vetoed | Real run, below | Met, with a limit: three tasks is a small set. It grows with each incident |
| 4.2 | Automated evals per change, with a judge and a rubric | Seven gates in CI. The reviewer scores six rubric lines from 1 to 5, each with evidence | .claude/agents/reviewer.md; test_a_review_must_follow_from_its_own_scores | Met |
| 4.3 | A separate evaluator that never saw the work | The reviewer starts with no memory, in its own worktree. Tests are written by a different agent from the one that builds. Hidden tests are removed from a builder's worktree and unreadable to it | test_hidden_tests_are_not_in_a_builders_worktree; sandbox probe step 11 | Met |
| 4.4 | Thresholds are numbers in config | factory/config.yaml, `gates` | test_a_review_that_approves_against_its_own_scores_is_refused | Met |
| 4.5 | Judge drift check | `make drift` scores an earlier review's commit again and compares | test_judge_drift_is_a_number | Met, with a limit: built and tested, not yet run for real, because no scored review exists yet |
| 4.6 | Per-agent metrics: success rate, retries, cost, time | .factory/metrics.jsonl, `make factory-metrics`, and the Factory window | test_metrics_for_each_agent | Met |

## 5. Security

| # | Requirement | How | Proven by | Status |
|---|---|---|---|---|
| 5.1 | Least-privilege credentials, scoped, short-lived | An agent's process is given no credential except the Claude login it needs to run. Keys, tokens and cloud logins are unreadable and are dropped from its environment | test_an_agents_environment_holds_no_secrets; sandbox probe step 15 | Met, with a limit: every agent uses the founder's one Claude login. A token per agent is not offered on a subscription |
| 5.2 | Secrets never enter prompts or logs | Redaction before every line of the ledger and the raw stream. Gate 4 scans every commit | test_secrets_never_reach_the_ledger, test_redaction | Met, with a limit: the project holds no secrets yet, so there is no secret manager. It arrives with AWS in Phase 11 |
| 5.3 | Tool calls to network and shell go through an allowlist, deny by default | Network: denied except the hosts in the contract. Shell: every command runs inside the sandbox | Sandbox probe steps 6 and 7 | Met, with a limit: the shell is confined by what it can reach, not by a list of allowed commands |
| 5.4 | Prompt injection defense | Every prompt and role file states that anything read is data. The walls limit what a steered agent could do: no keys, no network beyond primary sources, no writes outside its lane | agent_run.PROMPT; role files | Met, with a limit: this limits the damage and cannot rule out an agent being misled by what it reads. The reviewer and the source check are the second line |
| 5.5 | Dependency and supply chain scanning | Gate 4: gitleaks, semgrep, pip-audit, npm audit. Lanes cannot add dependencies | make prove-gates | Met |
| 5.6 | No agent can modify CI, permissions, secrets or its guardrails | See 3.3 | Same | Met |
| 5.7 | Audit log, attributable and tamper-evident | The ledger seals each line with the one before. Each commit names its agent as author and carries the run, sessions and ledger seal | test_the_ledger_seals_every_line_and_shows_tampering | Met |

## 6. Safety and control

| # | Requirement | How | Proven by | Status |
|---|---|---|---|---|
| 6.1 | Kill switch | `make stop`, or the button in the Factory window | test_the_kill_switch_ends_runs_and_blocks_new_ones, test_nothing_starts_while_the_factory_is_stopped | Met |
| 6.2 | Human approval gates | The founder alone merges to a protected branch. Dependencies, CI, guardrails, skills and contracts are held | test_changes_that_need_the_founder_are_named | Met |
| 6.3 | Budget circuit breakers | Per task and per day, in config. The runner also passes the cap to Claude Code | test_the_cap_for_the_day_refuses_a_run | Met |
| 6.4 | Loop detection | The same action four times in a row ends the run. The same failure twice escalates | test_the_same_action_over_and_over_is_stopped | Met |
| 6.5 | Agents run in containers or VMs with no access to production | Agents run inside the operating system's sandbox. No production exists yet | Sandbox probes | Met, with a limit: a sandbox, not a container. A container needs a long-lived token from `claude setup-token` |

## 7. Testing

| # | Requirement | How | Proven by | Status |
|---|---|---|---|---|
| 7.1 | Agents write tests with code; no coverage, no merge | Gate 6: 80 percent of changed lines, 95 in the engine | make prove-gates | Met |
| 7.2 | Tests run in the worktree and again in clean CI | The orchestrator runs the done command and the checks itself in the jail. Pull requests run all gates in GitHub CI | test_the_orchestrator_runs_the_done_command_itself | Met |
| 7.3 | Mutation testing | `make mutation`. Floor in config | Real run: 66 of 70 changes caught on two engine files | Met, with a limit: run on request, not yet on every change |
| 7.4 | End-to-end test of the pipeline | A seed plan goes in; a merged, checked, traceable branch comes out | test_a_seed_plan_becomes_a_checked_traceable_branch | Met |
| 7.5 | Chaos cases | Malformed output, a crash, a hang, silence, a loop, the wrong model, a bad report, writes outside the lane, tampering, a merge conflict, failing CI | tests/unit/tools/test_agent_run.py, test_phase.py | Met |

## 8. Observability

| # | Requirement | How | Proven by | Status |
|---|---|---|---|---|
| 8.1 | Full trace per task, OpenTelemetry GenAI conventions | Spans for each run and attempt in OTLP JSON with gen_ai names. The full stream is kept beside it | test_traces_use_the_genai_names | Met, with a limit: written to a file. A collector is not set up |
| 8.2 | Dashboard | The Factory window | Rendered and checked by eye | Met, with a limit: shows totals and the latest scores, not yet charts over time |
| 8.3 | Alerts | Guardrail, budget, stall, loop, retry storm, eval drop, tamper, failure. macOS notification and the ledger | test_the_same_action_over_and_over_is_stopped, test_a_veto_stops_the_plan | Met |
| 8.4 | Every merge links to its trace | Trailers on every merge | test_a_seed_plan_becomes_a_checked_traceable_branch | Met |

## 9. Operations

| # | Requirement | How | Proven by | Status |
|---|---|---|---|---|
| 9.1 | Reproducibility | Pinned model, refused otherwise. Locked dependencies. Recorded base commit | test_the_wrong_model_is_refused | Met, with a limit: a model's output is not repeatable, and two local Docker images still use the tag latest |
| 9.2 | One-step rollback | Each lane is one merge commit | test_a_seed_plan_becomes_a_checked_traceable_branch (the revert at the end) | Met |
| 9.3 | Documented escalation path | docs/factory/RUNBOOK.md | test_an_agent_can_escalate_and_is_not_asked_again | Met |
| 9.4 | Weekly human review of sampled traces | `make weekly` writes the page. The reading is the founder's | tools/factory/weekly.py | Met, with a limit: the tool exists. The ritual begins with the founder's first review |
| 9.5 | Definition of done per task type | The plan's done command, run by the orchestrator | docs/factory/RUNBOOK.md | Met |

## Real runs, 2026-09-29

Carried out with real agents on the pinned model, inside the sandbox.

| Run | Result |
|---|---|
| Sandbox probe, 18 actions by a real agent | Every forbidden action was refused by the operating system: writes to tests/, the Makefile, the main checkout and the home folder; reading an SSH key; reaching a host outside the contract; moving `main` and the phase branch; changing git config; adding a git hook; starting another agent |
| `make doctor` | 12 of 12 health checks passed |
| `make golden`, first run | 0 of 3. Each agent did its work correctly, and each agent's own commit carried its report file. A fault in the factory, fixed the same day and recorded as a lesson |
| `make golden`, second run | 3 of 3, each on the first attempt. The reviewer vetoed the planted fault |
| `make mutation` on engine/verdict.py and engine/dates.py | 66 of 70 changes caught, score 0.94, floor 0.80. Four survivors in engine/dates.py, recorded for the test lane |
| End to end, specs/factory/e2e-plan.yaml | Tests written first, then the code, checked again by the orchestrator in the jail, sent as pull request 1 on GitHub, passed all seven gates in clean CI (1012 tests), merged. Worktrees and lane branches were removed. The record of actions was intact |
| Factory tests | 141 on macOS and on Linux, the chaos cases among them |

## Count

Of 50 requirements: 36 met, 14 met with a stated limit, 0 open.

The limits that matter most, in the founder's order of concern:

1. GitHub itself does not protect `main` on a free private repository. Parked by the founder (D40) until a finished version is close.
2. Every agent runs on the founder's one Claude login.
3. The walls are the operating system's sandbox, not a container.
4. Prompt injection is limited in what it can reach, and cannot be ruled out.
5. The golden set is three tasks. The judge drift check has not yet had an earlier review to score again.
