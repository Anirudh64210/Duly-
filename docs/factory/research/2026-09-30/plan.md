# Factory plan: leaner, fewer cycles, and learning that works

Date: 2026-09-30. Built from the six files in this folder: research-orchestration.md,
research-context.md, research-quality.md (best practice) and audit-code.md, audit-ledger.md,
audit-prompts.md (our factory, measured). Section references below point into those files, for
example "ledger 4" is audit-ledger.md section 4.

## 1. The diagnosis in one page

- **Hours go on cycles, not on agents.** A single agent run takes 4 to 10 minutes. A fix cycle
  (tests, build, reconcile, checks, review, restart) takes 45 to 70 minutes, and product-1 and
  product-2 needed 31 fix plans between them (code 1, 4). Speeding up runs helps little. Running
  fewer cycles helps most.
- **The cycles come from upstream, and they are found late.** Of 57 stops after bring-up, 42 (74%)
  trace to the plan or the spec. Only 3 trace to wrong product code (ledger 4). 19 of 22 reviews
  vetoed, and in 10 of 10 product-2 and ui-1 vetoes the "tested" line scored 3 or lower. At least
  4 blocking findings were mechanical and a check could have caught them (prompts 4).
- **Tokens go on re-reading, not on thinking.** Cache reads are 94% of all tokens. Each turn
  re-reads about 73k of context, and contexts grow from about 28k to between 85k and 160k because
  agents `cat` whole SPECs, the 249 KB parameters.yaml and 200 KB PROGRESS files (ledger 6,
  prompts 2). So the number of turns and the size of what agents print drive usage.
- **Learning is built but does not run.** The memory put into every prompt is mostly noise, 245
  lesson proposals are unread, skills are denied to agents, golden has not run since 09-29, drift
  and weekly have never run, and the reviewer's findings are thrown away (code 5). The only
  learning that has worked is a person turning a lesson into code (preflight, one CI per plan).
- **The meters are wrong.** Output tokens are undercounted 30 to 46 times, Mac sleep hides 2.65 h,
  and stop causes exist only as free text (ledger 2). No saving below can be proved until this is
  fixed, so it comes first.

What best practice says, in short: keep one writer per task and one independent reviewer; agree
what done means before building; let machine checks find bugs and the reviewer read what checks
cannot; keep context small and output filtered; learn through small, checked edits, and promote a
lesson that keeps recurring into a hook or a test (orchestration 1, context 1, quality 1).

## 2. Baseline, and where the audits disagree

These are the numbers to beat. The disagreements are themselves evidence for item N1.

| Measure | Value | Source |
|---|---|---|
| Wall hours per feature | product-2: 15.7 h (brief) or 9.7 h (ledger window); product-1: 16.0 h | brief, ledger 3 |
| Reviews and vetoes | 22 reviews, 19 vetoes, 3 approvals over product-1, product-2 and ui-1 | ledger 1 |
| First-review approval | 0 of 3 plans | ledger 5 |
| Stops | 62 in 32.6 h; 74% plan or spec | ledger 4 |
| Round-check failures after lanes passed | 26 (offline gates 15, hidden tests 4, engine 3, other 4) | code 4 |
| Cache reads | 483 M over 2 days, 94% of tokens; about 73 k per turn over 6,595 turns | ledger 1, 6 |
| First-turn context | 24 to 28 k, of which about 7 k is ours | ledger 6 |
| Reviewer share of tokens | 22 to 24% | ledger 5, prompts numbers |
| Health checks | 111 runs, 10% of usage | ledger 6 |
| Subscription meter | 0.15 of the weekly window in 17.4 h; about 5 days of continuous running | ledger 1 |
| Workflows (founder lane) | 0.9 to 2.8 M tokens each, not in the ledger | brief, ledger 8 |

Disagreements to settle with N1: output undercount 46x (code D1, one run) against 30x (ledger 2,
all runs); health-probe rows in failures.jsonl 38 (code L1) against 19 (ledger 2, prompts 7);
product-2 hours 15.7 against 9.7, which depends on where the plan is said to start. N1 fixes one
definition for each.

## 3. What we already do well, and keep

Each of these matches the evidence. None of the waste in the audits came from them.

- **A central orchestrator with fixed code paths** (phase.py). Centralised coordination held error
  amplification to 4.4x against 17.2x for independent agents (orchestration 2.2, arXiv 2512.08296).
- **One writer per lane, in its own worktree and jail.** Matches "writes stay single-threaded"
  (orchestration 2.5, Cognition).
- **The orchestrator runs the done command itself** and does not trust the agent's word
  (quality 5.1, best practices).
- **Test-author and builder are separate, tests are read-only to builders, hidden tests exist.**
  Read-only tests stop test edits without hurting real performance (quality 3.3, ImpossibleBench).
  Hidden tests and the mutation minimum guard against "tests pass but wrong" (quality 2.6).
- **Escalation over workarounds.** The founder ruled the agent right in 13 of 24 escalations and
  wrong in none (ledger 4). Keep "a dispute is reported, never worked around".
- **An independent reviewer that can veto on law and boundary.** Reading the law against the output
  is the one thing the reviewer found that no machine could (prompts 5). Keep that power; narrow
  what it spends turns on.
- **Preflight: lessons written as code.** The best pattern the factory has (code L13). Most items
  below extend it.
- **One CI run per plan, founder approval gates, the subscription check, full per-run telemetry.**
- **Small accepted lessons and skill changes only after replay** (quality 7.3).
- **Fresh session per attempt.** Research favours a clean start with a better brief over a long
  corrected session (context 6, best practices). Keep it; improve the brief instead (N7).

## 4. Must do now

Small changes, most of them removals or fixes, that pay back on the very next plan. Effort: S is
under 2 hours of founder-lane work, M is about half a day, L is one to two days. "Approval" marks
changes that config.yaml routes to the founder (`skill_or_prompt_changed`, `guardrail_changed`,
contract or config).

### N1. Fix the meters first
- **Problem.** `watch()` keeps the first streamed usage per message, which carries a placeholder
  output count: metrics hold 172.8 k output tokens against 5.12 M in the `result` records
  (ledger 2.1, code D1). `time.monotonic()` stops while the Mac sleeps (ledger 2.2). Stop causes
  live only in free-text `control` messages (ledger 7). `make efficiency` has no tokens and no
  causes, and files ui-1 reviews under product-2 (ledger 2.3, 2.4). A veto raises `eval_drop`
  (code D9).
- **Practice.** Measure per role and phase from `--output-format json` usage; trust measurement,
  not impressions (context 10, quality 8.1, METR RCT).
- **Change.** Read `usage`, `modelUsage` and cost from the `result` event; keep the streamed count
  only as the in-flight estimate. Record wall and monotonic time side by side. Add a required
  `cause` to `control` events (plan, spec, cross-lane, code, factory, infra, wording). Add tokens
  by role, lane, round and cause to `make efficiency`, and file reviews under their own plan. Give
  vetoes their own alert kind.
- **Effect.** No direct saving. Every other effect below becomes measurable.
- **Effort.** S to M. Approval: no (telemetry).
- **Measure.** `tokens_out` in metrics.jsonl matches the `result` record on 10 sampled runs; each
  stop in the next plan carries a cause.

### N2. Keep the Mac awake while a plan runs
- **Problem.** 2.65 h of silence fell inside active runs while the Mac slept in 16-minute cycles
  (ledger 2.2).
- **Practice.** Plain operations; measure wall time (quality 8.1).
- **Change.** phase.py starts itself under `caffeinate -dimsu` (or wraps the plan runner in it).
- **Effect.** About 2.4 h off product-1's 16 h. No token cost.
- **Effort.** S. Approval: no.
- **Measure.** Zero 16-minute silences in the next plan's events.

### N3. Stop doing the same work twice
- **Problem.** Round checks (up to 30 minutes) run after a lane failed or the reviewer vetoed
  (code T4, phase.py:517). `--from-round` re-runs lanes that already landed (T5). The done command
  runs 2 to 3 times per attempt: by the agent, by the Stop hook and in the jail (T2). The prompt's
  "same failure twice" counts the agent's own run and the Stop hook's run as two failures, which
  caused at least 3 escalations (T3, D4, prompts 3). CLAUDE.md says write ESCALATE.md; the
  contract says REPORT.json (prompts 1).
- **Practice.** Resume after failure rather than restart (orchestration 7). A Stop hook that runs
  the check keeps the fix in the same context, which is the cheapest place to fix it (quality 5.1,
  5.2).
- **Change.**
  - `ok = ok and run_checks(...)`: no checks after a failed or vetoed round.
  - `--from-round` skips lanes whose `Factory-Task` trailer is already on the working branch.
  - Keep the Stop hook (it is the in-attempt check the research recommends), and tell agents it
    runs the done command for them: while working, run only the narrow test; do not run the full
    done command yourself.
  - One sentence in PROMPT: "Twice means two different fixes that ended in the same failure. The
    Stop hook re-running the done command on the same code is not a second failure."
  - CLAUDE.md "When you are stuck": REPORT.json status `escalated`, not ESCALATE.md.
  - Check D5 (does the Stop hook run outside the jail?). If it does, run its command through
    jail.py.
- **Effect.** Saves one to two full done-command runs per attempt, up to 30 minutes per stopped
  round, a full session per already-landed lane on rerun, and removes a known cause of lost
  rounds. Estimate: 1 to 2 h per plan like product-2.
- **Effort.** S. Approval: yes for the PROMPT and CLAUDE.md lines.
- **Measure.** Escalations whose reason mentions the Stop hook: 0. Check minutes after a failed
  round: 0. Sessions started for already-landed tasks: 0.

### N4. Move the gates into the lane's done command
- **Problem.** Lanes passed their done commands and the gates then failed at round end 26 times
  (code 4). The coverage gate alone stopped 7 rounds, each time found only after the merge
  (ledger 4). A content change broke pack parsing and only hidden tests saw it.
- **Practice.** Give the agent a check it can run, inside the attempt, and reject a bad change at
  once (quality 5.1, 5.2; SWE-agent's edit-time linter: +3 points, arXiv 2405.15793). The best
  coding results come from one agent with a fast check (orchestration 2.8).
- **Change.** The fast parts of `make test-offline` (diff policy, copy lint, engine literals),
  diff coverage for the lane's files (gate 6, with the diff pre-computed by the orchestrator so
  diff-cover does not write a git lock, prompts 3), `vitest --coverage` for web lanes, and the
  journeys for behaviour lanes go into each lane's done command. Preflight refuses a behaviour plan
  whose build lanes lack them. Round checks stay as the backstop.
- **Effect.** Removes the recurring coverage stop and most of the 26 late gate failures; each one
  avoided saves a restart (median 1 to 2 minutes, but up to 93 minutes) and often a whole round.
  Estimate: 1 to 3 h per plan.
- **Effort.** M. Approval: yes (done commands and preflight are guardrails).
- **Measure.** Round-check failures after all lanes passed: from 26 over two plans to 3 or fewer.

### N5. Narrow the reviewer: blocking findings only, no manual journeys, findings kept
- **Problem.** 2 vetoes had no blocking finding at all (product-2-fix4, ui-1), and each started a
  full plan (prompts 1). The reviewer is the costliest role: median 49.5 turns, 5.2 M tokens a run,
  22% of cache reads (ledger 5), largely spent rebuilding the same journey probe under TMPDIR every
  round (prompts 2.6, code T8). Missions ask it to render screens that cannot start in its sandbox
  (SIGTRAP), and it tries again each time (prompts 1). Only scores are logged; findings are lost
  (code L11).
- **Practice.** "A reviewer prompted to find gaps will usually report some, even when the work is
  sound... flag only gaps that affect correctness or the stated requirements" (best practices,
  orchestration 4.4, quality 4.1). AI review precision is often under 10% (quality 4.7,
  arXiv 2509.01494). The coder filters the reviewer's findings (orchestration 2.5, Cognition).
- **Change.**
  - Each finding is `blocking` only if it breaks a named SPEC point, a BOUNDARY rule or a cited
    source; everything else is `advisory` and goes to the backlog. A veto must name at least one
    blocking finding; check_review refuses a veto without one.
  - A veto whose findings are only "tests missing" leads to a narrow round: test-author adds the
    named tests, then the reviewer re-checks only those findings. No full review, no audit.
  - Remove "send all twenty journeys through POST /v1/compute" and "render every screen" from
    review missions. The reviewer reads the journey test output and the screenshots the
    orchestrator makes outside the jail (`make design-shots`), and spends its turns on the law,
    the boundary and SPEC gaps.
  - Append every finding (id, kind, file, input, blocking or advisory, SPEC point) to
    `.factory/findings.jsonl`.
- **Effect.** Estimate: review round about half as long (code 7.3); 2 of 13 vetoes become
  30-minute narrow rounds; findings become the input for X1, X3 and L1.
- **Effort.** M. Approval: yes (reviewer.md, rubric).
- **Measure.** Reviewer median turns (baseline 49.5) and tokens (5.2 M); vetoes without a blocking
  finding (baseline 2): 0; findings rows per review.

### N6. Clean the memory, close the proposal inbox, turn the one broken lesson into a guard
- **Problem.** About 11.3 k characters of failure memory go into every prompt; 52 of 55 rows are
  unvetted agent reports from before D44, 19 to 38 are health-probe notes ("None in the work"),
  28 say "Nothing to fix", none expire (code L1, D2, D3). 245 proposals (980 KB) are unread
  (ledger 7). The accepted "pipe hides the exit code" lesson was broken 758 times (ledger 7).
- **Practice.** Fewer always-loaded instructions are followed better; with 500, models follow 68%
  (quality 6.4, IFScale). Lessons the agent writes about itself can be confidently wrong: 0 of 121
  right, 86% when built from programmatic failure signals (quality 6.1, arXiv 2605.29463). "A rule
  that must always hold belongs in a hook" (quality 6.5).
- **Change.**
  - Archive every legacy row; keep only `source == "orchestrator"` rows built from check output.
  - Health runs write no memory and no proposals.
  - Each lane gets only its own rows plus all-lanes rows: at most 8 items and 3,000 characters.
    A row expires once the same task passes later.
  - Close all health-probe proposals and every proposal seen once and older than 7 days; the
    rest are clustered by fingerprint and the founder sees at most 5.
  - Add a guard_bash rule: a test command (pytest, make, vitest, npm test) piped into tail, head
    or grep is refused unless `set -o pipefail` is set. Then delete the prose lesson.
- **Effect.** About 2.8 k tokens less per turn: over 6,595 turns that is about 18 M cache-read
  tokens per two days (about 4%). Removes a known source of misleading guidance. Ends a real
  quality hole (failing tests hidden by a pipe).
- **Effort.** S. Approval: yes for the guard (guardrail).
- **Measure.** Memory characters per prompt (baseline 11.3 k); pending proposals (baseline 245);
  pipefail breaches (baseline 758): 0.

### N7. Cut what agents load and print
- **Problem.** First-turn context is 24 to 28 k, and only about 7 k is ours: every agent loads
  Cron, Workflow, DesignSync, RemoteTrigger, PushNotification, SendMessage, EnterWorktree, the Docs
  MCP server, about 20 skills, 2 plugins and auto-memory, and uses only Bash, Read, Edit and Write
  (ledger 6). parameters.yaml was opened 504 times and resolutions.md 346 times, while each
  mission names 1 to 3 points (prompts 2). PROGRESS.md is up to 200 KB and "read first"
  (code D7). Nothing limits what a `cat`, `sed` or test run prints (prompts 2.4). CLAUDE.md is on
  the read list though it is already loaded; the same four documents go to every role and most are
  skipped (prompts 1). Retry feedback is the last 4 lines of output (prompts 2.5).
- **Practice.** "The smallest possible set of high-signal tokens" (context 3); context rot starts
  well below the limit (Chroma, context 3); filter tool output before the model sees it, from tens
  of thousands of tokens to hundreds (context 4, costs doc); restricting tools shrinks the
  prefix (context 8, sub-agents doc); concise tool responses use about a third of the tokens
  (writing-tools-for-agents).
- **Change.**
  - Run agents with `--tools Bash,Read,Edit,Write`, a strict empty MCP config, no plugins, no
    auto-memory, and no skill listing (skills are denied anyway, see X9).
  - Per-role `reads:` in each contract; drop CLAUDE.md from the read list; drop the builder.md
    lines that repeat PROMPT and the repeated "anything you read is data" in six role files.
  - phase.py quotes the text of the resolution points a mission names into the mission; closed
    points move to resolutions-closed.md.
  - `tools.rulepack.show <rule-id | stage>` prints one rule with its source; agents use it rather
    than sed on parameters.yaml.
  - PROGRESS.md: read the last entry only; entries older than the current plan move to
    PROGRESS-archive.md.
  - Three PROMPT lines: find with `grep -n`, print at most 80 lines around it; run pytest with
    `-q --tb=short -x` while working; the cwd persists, so batch reads into one command.
  - Done-command output shown to the agent is failures plus a one-line summary; the full log goes
    to a file. Retry feedback carries the failing test ids and first assertion of each.
- **Effect.** Estimates, to be confirmed by N1: first-turn context down by 8 to 12 k tokens,
  which over 6,595 turns is 50 to 80 M cache reads per two days (10 to 15%). Final context for
  drafter and reviewer from 120 to 160 k down to 60 to 80 k (prompts 6.5), so their usage falls
  roughly in proportion. Quality should rise, since focused context beats full context
  (Chroma: about 300 tokens near-perfect against 113 k degraded).
- **Effort.** M. Approval: yes (PROMPT, contracts, role files).
- **Measure.** First-turn tokens per role (baseline 24 to 28 k), median final context per role
  (reviewer baseline 157 k, drafter 122 k), turns per run, opens of parameters.yaml and
  resolutions.md per run. Try the tool trim on one health task first and compare the first turn.

### N8. Make health checks light
- **Problem.** 111 health runs cost 10% of usage to write one file saying "ok" (ledger 6). The
  fingerprint hashes agent_run.py and sandbox.py, so any runner edit makes about 15 pairs stale,
  and all 7 builder lanes share one fingerprint (code T6, ledger 6). Each gets the full PROMPT with
  memory and a reading list (prompts numbers).
- **Practice.** Match the cost to the job; mechanical steps should not get a full agent context
  (context 5, orchestration 5.3).
- **Change.** Hash only the sandbox-relevant parts plus the lane's own contract; re-run only
  changed lanes; send a minimal prompt with no memory and no reading list.
- **Effect.** Estimate: health usage from 10% to under 2%.
- **Effort.** S. Approval: no.
- **Measure.** Health share of tokens in `make efficiency`.

## 5. Next (after the first plan run on the "now" changes)

### X1. Mechanical checks before every review
- **Problem.** Blocking findings a machine could have caught: regressions on journeys a fix did
  not name (fix2, fix7), a lane commit missing from the branch (fix3), two lanes spelling one
  string differently (fix5), raw ids reaching the screen (ui-1, ui-1-fix1). 7 reviews list
  surviving mutants (prompts 4, 5).
- **Practice.** Every veto should come with a failing check where one is possible; models do not
  correct themselves without an outside signal (orchestration 4.2, arXiv 2310.01798; Reflexion
  91% against 80% with test feedback). Tests passing is not the same as correct; mutation guards
  that (quality 2.6).
- **Change.** Round `checks:` before review, no agent needed:
  - `make journeys`: the twenty journeys and their twins through POST /v1/compute with a
    FixedClock, normalised JSON in tests/golden/journeys/. A plan lists `expected_changes`; any
    other diff fails. This is also the per-plan list of passing journeys the long-running-harness
    post recommends (orchestration 3.3), and it replaces the reviewer's TMPDIR probes.
  - Branch completeness: every accepted lane commit is an ancestor of the reviewed commit.
  - Id leak: every question id, stage and check passed through labels.ts; fail on a raw or spaced
    id in person-facing text.
  - Mutation on changed engine files (`make mutation` exists) plus a small pack mutator; survivors
    go to test-author before the review.
- **Effect.** Prompts 6 estimates about 4 of 10 vetoes removed before review; each avoided veto
  saves about 2 to 3 M tokens and 1 to 1.5 h.
- **Effort.** M to L. Approval: yes (checks, Makefile).
- **Measure.** Share of findings a check would have caught (from findings.jsonl kinds); vetoes per
  plan.

### X2. Agree what done means before building
- **Problem.** 9 vetoes and 8 stops were spec gaps or orchestrator-written spec errors, each found
  after a full build cycle of 0.5 to 2.4 h (ledger 4, 5, 8.3). product-1's resolutions reached 67
  points across 15 plan files; product-2 needed 21 plan files (ledger 7).
- **Practice.** Sprint contracts: before building, the generator proposes what it will build and
  how success is checked, and the evaluator approves it (orchestration 3.2, Anthropic
  harness-design post). Put the human at spec and merge, not mid-build (orchestration 7). Good
  specs end with an end-to-end check (best practices).
- **Change.** One reviewer run before round 1 reads SPEC, resolutions and the journeys and writes
  a short review contract: the SPEC points in scope, the journey or test that proves each, and what
  would block. It also lists the gaps it finds. The founder approves it (a 2-minute read). The final
  review checks against that contract; a finding outside it becomes a SPEC change, not a rebuild.
- **Effect.** Estimate: one run of about 5 M tokens against the 9 spec-gap vetoes and 8 stops, each
  of which cost 0.5 to 2.4 h.
- **Effort.** M. Approval: yes (plan shape, reviewer role).
- **Measure.** Stops and vetoes with cause `spec` (baseline 17 over two plans); resolution points
  added after round 1.

### X3. The tests mission that worked, as the template
- **Problem.** fix8 was the one product-2 review that approved. Its tests mission alone required
  each test to name the mutant it kills and required must-not assertions on journeys the point does
  not name (prompts 4).
- **Practice.** Tests grounded in an explicit requirements checklist raised correctness by 38
  points and cut false alarms from 33% to 0%; more tests without grounding did not (quality 3.2,
  arXiv 2607.06636). Tests in the prompt raise correctness sharply (quality 3.1).
- **Change.** test-author.md and the plan template: SPEC points as a numbered checklist; each test
  names its point; each point gets negative assertions on journeys it does not name; each test
  names the mutant it kills.
- **Effect.** Fewer "tested 3" vetoes (10 of 10 today). Low token cost.
- **Effort.** S. Approval: yes (role file).
- **Measure.** "tested" score trend; mutation survivors found at review.

### X4. Fix plans that are narrow and generated
- **Problem.** Every fix plan re-ran content, tests, build, reconcile, screen and review even when
  the finding touched only pack text; the 6 wording cycles took 7.0 of product-1's 16 h, and fell to
  0.3 h once the founder narrowed plans to named rows (ledger 5). Fix 1 alone took 9 plans (prompts
  3). Missions are copied by hand and carry stale file names; kept commits are merged by hand-written
  mission lines (prompts 1, 3; code D8).
- **Practice.** Resume from checkpoints rather than restart (orchestration 7); size the work to the
  task (orchestration 2.3).
- **Change.** phase.py generates the fix plan from the review file: only the lanes whose paths the
  findings touch, then the narrow review from N5. A round may `waive:` disputed tests the
  orchestrator has ruled on, and the orchestrator answers a dispute and resumes the same run rather
  than writing a new plan. agent_run merges the lane's kept commit for the same task before it
  starts. (`goal:` is already required by preflight; keep it.)
- **Effect.** Wording and small fixes cost about 0.3 h a cycle instead of 1 to 2.4 h. Fewer plan
  files to write by hand.
- **Effort.** M. Approval: yes (plan schema).
- **Measure.** Hours and runs per fix cycle; plan files per feature (baseline 15 and 21).

### X5. Make wording mechanical from day one
- **Problem.** 6 vetoes for plain words drifting from the quoted law ("U.S. workers" became
  "workers in the United States"); rewrites added 3 new drifts; the plain gate miscounted "U.S." and
  hid 5 texts over grade 9 (ledger 5).
- **Practice.** A rule that must always hold belongs in a check (quality 6.5); linters whose
  messages say how to fix (orchestration 8, OpenAI harness engineering).
- **Change.** A frozen-term glossary checked by copy lint (terms from the quoted source must appear
  unchanged); accepted rows frozen so rewrites cannot touch them; fix the "U.S." count in the plain
  gate. Check first what plain_terms already covers.
- **Effect.** The class that cost 44% of product-1 is caught in the content lane.
- **Effort.** S to M. Approval: yes (gate).
- **Measure.** Wording vetoes per plan (baseline 6).

### X6. Scripts for mechanical lanes, then a model and effort per role
- **Problem.** Lanes such as "run make samples, change nothing else" (fix6, 7c, 8) and health
  checks run a full Opus session (prompts 6.10). One model is pinned for every role and enforced
  (code T7, config.py:72).
- **Practice.** Keep the deciding agent strong and move only mechanical steps down (orchestration
  5.3, context 5; a weak main model with a strong helper failed at Cognition). Opus 5.5 at `medium`
  matches or beats Opus 5 at `high`; thinking is billed as output (context 5.1).
- **Change.** First remove the agent: a round step can be a plain command run by phase.py. Then
  turn the model pin into a per-role allowlist with effort: builder, test-author, drafter on Opus
  `medium`; reviewer and auditor on Opus `high`; curator and summaries on Sonnet. Never tier the
  reviewer down without a golden comparison.
- **Effect.** Removes agent runs that do no thinking. Effort tiering lowers thinking output (1.53 M
  of 5.12 M output tokens are thinking); the subscription weighting per token class is not
  published, so measure.
- **Effort.** M. Approval: yes (config and contracts).
- **Measure.** Golden pass rate before and after on the same tasks; output tokens per role.

### X7. Lint every changed file, not only Edit and Write
- **Problem.** About 1,140 file writes went through Bash (python writes, heredocs, `sed -i`)
  against 251 Edit or Write calls, so the lint hook never saw them and problems surfaced at the gates
  (ledger 6).
- **Practice.** Reject a bad change at once (quality 5.2).
- **Change.** The Stop hook (or the start of the done command) runs ruff, mypy or eslint on the
  files `git diff` shows changed. Simpler than policing which tool wrote them.
- **Effect.** Fewer late gate failures; small token cost.
- **Effort.** S. Approval: yes (hook).
- **Measure.** Lint or type failures found by round checks rather than in-lane.

### X8. Size each plan to its change
- **Problem.** product-2 used 99 runs. Lanes built in parallel disagreed (3 cross-lane stops, the
  fix5 cross-lane veto); lanes built unwired parts (product-2 V1) (ledger 4, 5).
- **Practice.** Multi-agent work degraded sequential tasks by 39 to 70% (orchestration 2.2); coding
  has few truly parallel parts and multi-agent costs about 15x chat tokens (orchestration 2.3);
  actions carry implicit decisions, so shared decisions go in one place first (orchestration 2.4);
  Anthropic flags a workflow over 25 agents or 1.5 M projected tokens as large (orchestration 2.6).
- **Change.** A written effort rule in the RUNBOOK and preflight: words-only change, one lane;
  parallel lanes only where paths and names do not interlock; shared names (landmarks, routes,
  fields) land in contracts/ first; preflight warns on a plan projected over 1.5 M tokens per round.
- **Effect.** Fewer runs per feature and fewer cross-lane stops.
- **Effort.** S. Approval: yes (RUNBOOK and preflight).
- **Measure.** Runs per plan; cross-lane stops.

### X9. Retire skills for agents; run the curator after each plan
- **Problem.** Skills are denied to agents (sandbox.py:160), the prompt never mentions them, and a
  replay found no effect (code L4). The weekly curator has not run since 09-28 (L5).
- **Practice.** Having skills available is not enough; few, refined skills proven by replay
  (quality 7.3). Store what worked, not only what failed (quality 6.3, Agent Workflow Memory).
- **Change.** Keep skills for the founder lane only; turn the one or two useful agent rules into
  hooks or accepted lessons. The curator runs after each approved plan and proposes at most a few
  lines, including one short worked example of a lane that passed first time.
- **Effect.** Less dead machinery; a learning step that actually runs.
- **Effort.** S. Approval: yes.
- **Measure.** Curator runs per plan; accepted lessons per plan.

### X10. Count the founder lane's workflows
- **Problem.** Workflows use 0.9 to 2.8 M tokens each on the same meter and are not in the ledger
  (ledger 8).
- **Practice.** The workflow size guideline (`workflowSizeGuideline`), per-agent totals in
  `/workflows` (context 10).
- **Change.** Log each workflow's totals into the ledger; default to the `medium` size guideline;
  give research workflows a written reason when they exceed 5 agents.
- **Effort.** S. Approval: no.
- **Measure.** Workflow tokens per week beside factory tokens.

## 6. Later (once the meters and the "now" changes are proven)

### L1. A capability eval built from our own vetoes
- **Problem.** golden.yaml has 3 toy tasks, saturated at 100%, not rerun since factory commits
  landed, with no token or time thresholds (code L6, quality 2.2).
- **Practice.** 20 to 50 tasks from real failures; capability and regression sets apart; pass^k,
  paired differences with error bars (quality 2.1 to 2.3, Anthropic evals and statistics posts).
- **Change.** Each founder-confirmed veto from findings.jsonl becomes a task (SPEC point, base
  commit, expected result, reference diff), including cases where escalating is the right answer.
  Run the set on every change to tools/factory, contracts or role files; add a token and minute
  threshold per role; report pass^3.
- **Effort.** L. **Measure.** Pass^3 and tokens per task, paired, per factory change.

### L2. Calibrate the reviewer against the founder
- **Problem.** No measured agreement between reviewer and founder; drift checks stability, not
  correctness; drift and weekly never ran (code L7, L8; quality 4.4).
- **Practice.** Binary verdicts with a critique, calibrated on one expert's labels, measured by
  true positive and true negative rate (quality 4.3, Hamel Husain). LLM judges wrongly reject
  correct code (quality 4.2).
- **Change.** The weekly review asks "was the veto right?"; those answers are the label set; report
  the reviewer's catch rate and false-veto rate; label each failed run by MAST group (design,
  misalignment, verification; orchestration 2.7).
- **Effort.** M. **Measure.** Reviewer true positive and true negative rates.

### L3. Lessons as a small playbook with counters
- **Practice.** ACE: itemised delta updates with helpful and harmful counts beat rewrites (+10.6%
  on agent tasks, orchestration 6.2, context 9); lessons from accepted findings with recurrence
  measured (quality 6.2).
- **Change.** Each lesson has lane, trigger, rule, evidence run id and helpful or harmful counts.
  A class seen three times becomes a check or hook and the lesson is deleted; a lesson with no hits
  in N plans is retired.
- **Effort.** M. **Measure.** Recurrence per error class.

### L4. Split parameters.yaml per stage
- A contract change for the founder; the larger form of `rulepack.show` (prompts 2.1). Do it if N7
  does not bring drafter context under about 80 k.

### L5. Ablate on each model change
- Turn off one optional round or role at a time on L1's eval; keep what lowers the pass rate when
  removed (orchestration 8, Anthropic removed its sprint split on a newer model).

### L6. Longer cache TTL for roles that wait
- Agent caches last 5 minutes on a subscription; `subagentPromptCacheTtl: "1h"` extends them at 2x
  write cost (context 2). Measure the cache miss rate after long test runs first (needs N1).

## 7. Considered and not recommended now

- **`--resume` on retry.** Attempts average 1.0 to 1.1, and research favours a fresh session with a
  better brief (context 6, best practices). N7's richer feedback does the useful part.
- **More agents or roles.** The evidence points the other way (orchestration 2.2, 2.3, 2.8).
- **Tuning auto-compact.** Contexts end at 85 to 160 k, far below the 967 k default. N7 is the fix.
- **A panel of judges.** Promising for text (quality 4.6) but untested on code; revisit after L2
  gives a label set to test it on.
- **Dropping the Stop hook.** The audit suggests it (code 7.4), but it is the in-attempt check the
  research recommends. N3 fixes its side effects instead.

## 8. Scorecard for the next plan

Report these in `make efficiency` per plan, against the baseline in section 2.

| Measure | Baseline | Target for the next plan |
|---|---|---|
| Review cycles; vetoes | 13 and 11 (product-2) | 3 or fewer; 2 or fewer |
| First-review approval | 0 of 3 plans | the next plan approves at first or second review |
| Stops; share with cause plan or spec | 62; 74% | half; under 40% |
| Round-check failures after lanes passed | 26 | 3 or fewer |
| Wall hours per feature | 15.7 h | under 8 h |
| First-turn context | 24 to 28 k | under 16 k |
| Median final context, reviewer and drafter | 157 k and 122 k | under 80 k |
| Tokens per plan (true, from `result`) | measure after N1 | 40% lower |
| Health share of usage | 10% | under 2% |
| Memory characters per prompt; pending proposals | 11.3 k; 245 | 3 k or less; 5 or fewer shown |
| Pipefail breaches | 758 | 0 |
| Findings a check would have caught | at least 4 of 10 | falls each plan |

Order of work: N1 and N2 first (so the rest can be measured), then N3 to N8 together before the
next feature plan, then run one plan and compare, then X1 to X10.
