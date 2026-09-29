# Multi-Agent AI Coding Systems in Practice (2025-2026): Operational Playbook Inputs

## KQ1: Claude Code specifics (subagents, teams, worktrees, hooks, CLAUDE.md, skills, headless, MCP) and Anthropic's own practices

### Takeaway
Anthropic's official guidance centers everything on one constraint (context fills fast, performance degrades) and one lever (give Claude a check it can run). Parallelism is a spectrum: worktrees (manual), subagents (cheap, report back), experimental agent teams (shared task list + mailboxes, high token cost), and headless `claude -p` fan-out for batch work.

### Cited Findings
- Official best-practices doc: context window is "the most important resource to manage"; performance degrades as it fills — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Core loop discipline: give Claude a runnable check (tests, build exit code, screenshot diff); enforcement escalates from in-prompt, to `/goal` conditions, to a Stop hook that "blocks the turn from ending until it passes", to a verification subagent — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Recommended four-phase workflow: Explore (plan mode) -> Plan -> Implement -> Commit; skip planning when "you could describe the diff in one sentence" — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- CLAUDE.md conventions: keep short; include bash commands, style rules that differ from defaults, repo etiquette, gotchas; exclude anything Claude can derive from code. "Bloated CLAUDE.md files cause Claude to ignore your actual instructions" — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Hooks vs CLAUDE.md: CLAUDE.md instructions are advisory; hooks are "deterministic and guarantee the action happens" (e.g. run eslint after edits, block writes to migrations folder) — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Skills (`.claude/skills/SKILL.md`) load on demand for domain knowledge/workflows so they don't bloat every session; subagents (`.claude/agents/*.md`) run in their own context with scoped tools (e.g. security-reviewer on Opus) — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Headless/CI: `claude -p "prompt"` with `--output-format json|stream-json`, `--allowedTools` scoping; fan-out pattern is a task-list file plus a bash loop of `claude -p` calls, refined on 2-3 files before the full run; `/batch` splits a change across 5-30 subagents, each in its own worktree — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Multi-session menu: worktrees, cross-session messaging, desktop app sessions, cloud sessions, agent view (`claude agents`), and experimental agent teams; a fresh context improves review "since Claude won't be biased toward code it just wrote" (Writer/Reviewer pattern) — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Adversarial review step: run bundled `/code-review` skill or a subagent reviewing the diff against PLAN.md; caveat that a reviewer told to find gaps will report some regardless, so restrict findings to correctness — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Named failure patterns in the official doc: kitchen-sink session, correcting over and over (fix: after two failed corrections, /clear and rewrite prompt), over-specified CLAUDE.md, trust-then-verify gap, infinite exploration — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Agent teams (experimental, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`): team lead + teammates, shared task list with file-locking on claims, JSON mailboxes at `~/.claude/teams/.../inboxes/`; hooks TeammateIdle/TaskCreated/TaskCompleted can veto (exit code 2) as quality gates — [Agent teams docs](https://code.claude.com/docs/en/agent-teams)
- Agent teams sizing guidance: "Start with 3-5 teammates for most workflows"; 5-6 tasks per teammate; "Three focused teammates often outperform five scattered ones"; avoid file conflicts by making each teammate own different files — [Agent teams docs](https://code.claude.com/docs/en/agent-teams)
- Agent teams limitations: no session resumption of in-process teammates, task status can lag, one team per session, no nested teams, lead is fixed; split panes need tmux or iTerm2 — [Agent teams docs](https://code.claude.com/docs/en/agent-teams)
- Anthropic internal usage: security engineering resolves incidents "3x faster" by feeding stack traces; shifted to TDD workflows; growth marketing used sub-agents to generate ad variations; design sets up autonomous loops from Figma files — [How Anthropic teams use Claude Code](https://claude.com/blog/how-anthropic-teams-use-claude-code)
- Anthropic multi-agent research system: orchestrator-worker (Opus lead + Sonnet subagents) beat single-agent Opus by 90.2% on breadth-first research; agents use ~4x chat tokens, multi-agent ~15x; "token usage by itself explains 80%" of performance variance — [Anthropic engineering](https://www.anthropic.com/engineering/built-multi-agent-research-system)
- Same post's caveat for coding: "most coding tasks involve fewer truly parallelizable tasks" than research; multi-agent underperforms for shared-context, heavily interdependent, or low-value tasks — [Anthropic engineering](https://www.anthropic.com/engineering/built-multi-agent-research-system)
- Worktrees have an official docs page for parallel sessions — [Claude Code worktrees docs](https://code.claude.com/docs/en/worktrees)

### Inferences
- For a solo founder, the officially sanctioned stack is: worktree-per-task manual sessions for implementation, subagents for research/review inside each session, hooks (PostToolUse lint/typecheck + Stop gate on tests) as the deterministic quality floor, and headless fan-out only for mechanical migrations. Agent teams are explicitly experimental and token-expensive; treat as optional.
- Anthropic's own coding-vs-research distinction implies Duly should parallelize at the feature/module level (few interdependencies), not have agents co-edit one subsystem.

### Gaps
- No official Anthropic-published number for how many parallel Claude Code sessions its engineers typically run (anecdotes like "a few agents running throughout" exist, see KQ5).

## KQ2: Competing/adjacent systems in production (Devin, Codex, Cursor, Factory, OpenHands) — architecture, verifier loops, success rates, honest failures

### Takeaway
Devin's 18-month data is the best public evidence: PR merge rate rose 34% -> 67%, and it excels only on well-scoped 4-8h junior-level tasks with verifiable outcomes. Cognition's own architecture essay argues against parallel multi-agent coding (single-threaded + context compression instead). SWE-bench Verified leaders are ~81-94% in 2026, but scores drop ~35 points on SWE-bench Pro, partly due to training contamination.

### Cited Findings
- Devin 2025 performance review: PR merge rate up from 34% to 67%; 4x faster, 2x more resource-efficient; "hundreds of thousands of PRs" merged across thousands of companies — [Cognition](https://cognition.com/blog/devin-annual-performance-review-2025)
- Devin sweet spots: security vuln fixes (one org: human 30 min vs Devin 1.5 min), framework migrations (3-4h/file vs 30-40h human), Java upgrades 14x faster, test coverage raised from 50-60% to 80-90% — [Cognition](https://cognition.com/blog/devin-annual-performance-review-2025)
- Devin limits per Cognition itself: cannot handle ambiguous/iterative mid-task requirements; needs well-scoped tasks upfront; human review "remains essential" for architecture — [Cognition](https://cognition.com/blog/devin-annual-performance-review-2025)
- Independent failure report: developer gave Devin 10 real tasks, "It Completed 3" — [dev.to](https://dev.to/alanwest/i-gave-devin-10-real-tasks-it-completed-3-3063) (fetched title/summary only; treat completion breakdown as unverified detail)
- Cognition "Don't Build Multi-Agents": Principle 1 "Share context, and share full agent traces"; Principle 2 "Actions carry implicit decisions"; parallel subagents make conflicting implicit decisions; recommends linear single-threaded agents plus context-compression models for long tasks — [Cognition](https://cognition.com/blog/dont-build-multi-agents)
- OpenAI Codex cloud agent: each task runs "in its own cloud sandbox environment" preloaded with the repo, network-disconnected during execution; tasks take 1-30 minutes; AGENTS.md files configure conventions (deeper-nested files take precedence); evidence via terminal-log and test-output citations — [OpenAI](https://openai.com/index/introducing-codex/)
- OpenAI internal use of Codex: "repetitive, well-scoped tasks, like refactoring, renaming, and writing tests" — [OpenAI](https://openai.com/index/introducing-codex/)
- SWE-bench Verified 2026 top scores: Claude Mythos Preview 93.9%, GPT-5.3 Codex 85.0%, Claude Opus 4.6/4.5 80.9% — [CodeAnt leaderboard roundup](https://codeant.ai/blogs/swe-bench-scores)
- Benchmark-reality gap: Opus 4.5 scores 80.9% Verified vs 45.9% SWE-bench Pro; frontier models "could reproduce verbatim gold patches" for some Verified tasks (contamination); advice: evaluate on your own codebase — [CodeAnt](https://codeant.ai/blogs/swe-bench-scores)

### Inferences
- Cognition (highest-volume production agent vendor) and Anthropic converge on the same message from opposite directions: parallelism belongs between independent tasks, not inside one task. Duly's playbook should be many single-threaded agents on disjoint scopes, never a swarm co-designing one feature.
- Devin's 67% merge rate on well-scoped tasks is a realistic ceiling to plan around: expect roughly 1 in 3 agent PRs to need rework or abandonment even with good scoping.

### Gaps
- Reliable 2025-26 production data for Cursor background agents, Factory.ai droids, Sweep, OpenHands, and SWE-agent success rates was not gathered within call budget; only Devin and Codex have substantive primary-source production reporting found here.
- Devin ACU pricing economics (current ACU rates) not verified from a primary source in this pass.

## KQ3: Orchestration patterns that work (role splits, decomposition granularity, merge-conflict minimization, context persistence)

### Takeaway
The empirically supported patterns are: strict file/module ownership per agent (drives structural conflict rates "to near zero"), sequential merge with rebase, small self-contained tasks, and file-based state (progress logs, specs, git history) to bridge context resets — the mechanism behind Ralph loops and Codex/Devin alike.

### Cited Findings
- Largest empirical study (Xu et al., 33,596 agent-authored PRs, 2,807 repos): cross-agent PR pairs conflict at 41.7% vs 19.8% intra-agent; content conflicts 57.6%, modify/delete 26.8%, add/add 15.1%; 84.4% of conflicts in source files, not lockfiles — [Daniel Vaughan's writeup of the study](https://codex.danielvaughan.com/2026/07/28/agent-pr-merge-conflicts-concurrent-coding-agents-codex-cli-worktree-isolation-coordination-defence/)
- Mitigations from that study/writeup: non-overlapping file scopes (structural conflict rate "drops to near zero when agents cannot touch the same files"), sequential merging with rebase, PostToolUse hooks running `git merge-tree` for early detection, task-claiming registries — [Daniel Vaughan](https://codex.danielvaughan.com/2026/07/28/agent-pr-merge-conflicts-concurrent-coding-agents-codex-cli-worktree-isolation-coordination-defence/)
- Worktree downsides at scale (Trigger.dev): port conflicts, per-worktree databases/Redis/ClickHouse, "9.82 GB across two worktrees" disk bloat, full dependency reinstalls, and self-conflicts between agents; they moved to GitButler virtual branches (one working directory, `but` CLI taught to Claude via a skill file) so one session routes changes to multiple branches/PRs — [Trigger.dev](https://trigger.dev/blog/parallel-agents-gitbutler)
- Ralph loop (Geoffrey Huntley pattern): `while true; do claude -p "$(cat PROMPT.md)"; done`; filesystem persists across fresh contexts; success factors = precise "done" definition, one small change per iteration, mandatory test/type/lint gates, iteration caps (20-50), progress-log file; Huntley built the "Cursed" language over three months with it; one dev delivered a "$50,000 contract for under $300" in API costs; Anthropic later shipped an official plugin — [Sid Bharath](https://sidbharath.com/blog/ralph-wiggum-claude-code/); background: [Dev Interrupted interview](https://devinterrupted.substack.com/p/inventing-the-ralph-wiggum-loop-creator), [The Register](https://www.theregister.com/2026/01/27/ralph_wiggum_claude_loops/)
- Anthropic delegation lesson: lead agent must give subagents "explicit objectives, output formats, and boundaries" or work duplicates; vague task descriptions are a listed failure mode — [Anthropic engineering](https://www.anthropic.com/engineering/built-multi-agent-research-system)
- Spec-first pattern from official docs: have Claude interview you, write SPEC.md, then execute in a fresh session; best specs "name the files and interfaces involved" and end with an end-to-end verification step — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Task sizing (agent teams docs): "self-contained units that produce a clear deliverable, such as a function, a test file, or a review" — [Agent teams docs](https://code.claude.com/docs/en/agent-teams)
- Context persistence: Ralph writeup citing Anthropic that the fix for long-running agents is "better use of files" (progress logs, git history) rather than more agents — [Sid Bharath](https://sidbharath.com/blog/ralph-wiggum-claude-code/)
- Codex uses per-repo AGENTS.md as the persistent convention layer, analogous to CLAUDE.md — [OpenAI](https://openai.com/index/introducing-codex/)

### Inferences
- A workable Duly decomposition rule: one agent = one module/vertical slice = one worktree = one PR, with an interface contract (types/API schema) committed to main first so parallel slices code against a frozen boundary. This directly attacks the modify/delete (26.8%) and add/add (15.1%) conflict classes.
- For a web app with heavy local infra (Postgres etc.), Trigger.dev's experience says naive worktree-per-agent breaks on ports/DBs; either containerize per worktree, use cloud sessions, or adopt GitButler-style single working directory for small changes.
- GitHub Issues (or the agent-teams shared task list) as the queue plus a progress-log file per task is the practitioner-converged answer to context persistence; no source found advocating long-lived single sessions.

### Gaps
- "File-level leases"/codeowners-per-agent as a formal mechanism: only informal task-claiming registries were documented; no widely adopted tooling found.
- Graphite/stacked-PR usage specifically for agent output was not verified with a primary source in this pass.

## KQ4: Documented failure modes and mitigations

### Takeaway
The documented failure catalogue: agents conflicting/overwriting (41.7% cross-agent PR conflict rate), context pollution within sessions, spec drift from vague delegation, premature "victory declaration" without verification, and cost blowups (15x token multiplier for multi-agent). Mitigations with evidence: file-scope isolation, deterministic hooks, iteration caps, small verified increments, and fresh-context adversarial review.

### Cited Findings
- Cross-agent overwrite/conflict evidence and taxonomy: see KQ3 findings — [Daniel Vaughan](https://codex.danielvaughan.com/2026/07/28/agent-pr-merge-conflicts-concurrent-coding-agents-codex-cli-worktree-isolation-coordination-defence/)
- Context poisoning between agents is the core of Cognition's case: subagents making "conflicting decisions" from dispersed context compound miscommunications — [Cognition](https://cognition.com/blog/dont-build-multi-agents)
- Unverified completion: without feedback loops Claude "tends to declare victory without proper verification"; mitigation is mandatory test/type/lint gates before completion claims plus iteration caps to stop runaway cost when stuck — [Sid Bharath](https://sidbharath.com/blog/ralph-wiggum-claude-code/)
- Anthropic-listed multi-agent failure modes: spawning excessive subagents for simple queries, endless searching, vague descriptions causing duplicate effort, difficulty judging effort levels — [Anthropic engineering](https://www.anthropic.com/engineering/built-multi-agent-research-system)
- Official single-session failure patterns and fixes (kitchen sink, repeated corrections -> /clear, bloated CLAUDE.md, trust-then-verify gap) — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Reviewer over-triggering: a gap-hunting reviewer "will usually report some" findings even on sound work, causing over-engineering; scope reviewers to correctness only — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Cost blowup magnitudes: multi-agent ~15x chat tokens (Anthropic); 50-iteration Ralph loop "$50-100"; agent teams docs warn token costs "scale linearly" per teammate and each inter-agent message is a billable round trip — [Anthropic](https://www.anthropic.com/engineering/built-multi-agent-research-system); [Sid Bharath](https://sidbharath.com/blog/ralph-wiggum-claude-code/); [Agent teams docs](https://code.claude.com/docs/en/agent-teams); [CloudZero](https://www.cloudzero.com/blog/claude-code-agents/)
- Hook-based deterministic gates (Stop hook blocks turn end until check passes; TaskCompleted hook can veto completion) are the documented mitigation for advisory-instruction drift — [Claude Code best practices](https://code.claude.com/docs/en/best-practices); [Agent teams docs](https://code.claude.com/docs/en/agent-teams)
- Agent-team-specific failures: teammates stall after errors, lead implements instead of waiting, lead stops early, stale task status — all documented with manual-nudge remedies — [Agent teams docs](https://code.claude.com/docs/en/agent-teams)

### Inferences
- Flaky-test thrashing was not found as a named, sourced failure mode in this pass, but the Stop-hook/goal-evaluation design (caps on consecutive blocks, stall detection) implies vendors engineer for it; treat deterministic, fast test suites as a precondition for unattended loops.
- Budget caps in practice = plan-tier quota (subscription) or iteration caps (loops); no practitioner source found describing per-agent dollar budgets enforced in tooling.

### Gaps
- No sourced practitioner postmortem specifically on flaky-test thrashing or on a quantified "cost blowup" incident (e.g. a surprise bill) was found within budget.

## KQ5: Human-in-loop economics — review load and parallelism ceilings for a solo operator

### Takeaway
Practitioner consensus (Willison, Ronacher, Orosz, Pragmatic Engineer roundup): the ceiling is human review, not agent supply — one person can land roughly one significant change at a time, so parallel slots beyond ~3 should hold low-review-cost work (research, maintenance, well-specified tasks). Cost data suggests 3 parallel agents ~ $30-40/day API-equivalent, 5-10 agents ~ $50-130/day.

### Cited Findings
- Simon Willison: "I can only focus on reviewing and landing one significant change at a time"; parallel slots go to research/PoCs, codebase exploration, low-stakes maintenance, and carefully specified work; runs a mix of Claude Code and Codex CLI across terminals; advice: "Any small maintenance task is worth trying" — [simonwillison.net](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/)
- Armin Ronacher reduced parallel-agent use: "it's only so much my mind can review!" — [Pragmatic Engineer](https://blog.pragmaticengineer.com/new-trend-programming-by-kicking-off-parallel-ai-agents/)
- Anthropic engineer Sid Bidasaria: "a few agents running throughout" a workday — [Pragmatic Engineer](https://blog.pragmaticengineer.com/new-trend-programming-by-kicking-off-parallel-ai-agents/)
- Pragmatic Engineer's finding: only senior+ engineers reported success with parallel agents; success correlates with testing, small task scope, and review discipline — [Pragmatic Engineer](https://blog.pragmaticengineer.com/new-trend-programming-by-kicking-off-parallel-ai-agents/)
- Cost table (secondary source): single dev ~$13/day; 3 parallel agents $30-40/day (Max 5x plan suggested); 5-10 agents $50-130/day (Max 20x); subagents cheapest, agent teams most expensive; recommends Opus orchestrator + Sonnet workers + Haiku for formatting — [CloudZero](https://www.cloudzero.com/blog/claude-code-agents/)
- Official team-size guidance doubles as a solo ceiling proxy: 3-5 teammates, diminishing returns beyond — [Agent teams docs](https://code.claude.com/docs/en/agent-teams)
- Devin economics anecdotes: org saved "5-10% of total developer time" on security fixes; EightSleep ships "3x as many data features" — [Cognition](https://cognition.com/blog/devin-annual-performance-review-2025)
- Ralph-loop economics: $50,000-contract-for-under-$300 anecdote and $50-100 per 50-iteration overnight run — [Sid Bharath](https://sidbharath.com/blog/ralph-wiggum-claude-code/)

### Inferences
- Practical solo-founder ceiling for Duly: 1 high-attention implementation lane (you review every diff) + 2-4 low-attention lanes (research, tests, docs, mechanical refactors, overnight Ralph loops on well-specified features with hard gates). Beyond that, unreviewed merged code accumulates faster than one person can audit — the exact trap the Devin 67%-merge-rate and Pragmatic Engineer findings warn about.
- For a compliance app where correctness is the product, bias further toward fewer lanes with stronger gates (adversarial review subagent + Stop-hook test gate on every lane) rather than more parallelism.

### Gaps
- No rigorous study quantifying review hours per agent-day; all parallelism-ceiling numbers are practitioner anecdotes, not measured data.
- CloudZero cost figures are a vendor blog's estimates, not measured billing data; treat as order-of-magnitude.
