# How the strongest agent systems for software are organised (research, 2026-09-30)

Question: how are the best agent systems for software work set up in 2025 and 2026, and what does that say about our factory? One feature took 15.7 hours, with 13 reviews and 11 vetoes. Workflows used 0.9M to 2.8M tokens each. We run on a subscription, so the limit is usage, not dollars.

How strong the evidence is, marked on each item:
- **[Measured]**: a controlled experiment, a benchmark, or an ablation with numbers.
- **[Vendor eval]**: a builder's own evaluation, with numbers but not independent.
- **[Practice]**: an experience report or official guidance, with no controlled numbers.

Primary sources were read directly. Where a page blocked the fetch (OpenAI's harness post), a secondary summary was used, and that is noted.

---

## 1. Bottom line

1. **Use the simplest structure that works, and add agents only where the work really runs in parallel.** Coding is mostly sequential. Extra agents help breadth-first research and independent review. They hurt tightly coupled building.
2. **Keep writing to one agent at a time. Use more agents to add thinking, not actions.** The reviewer is the one extra agent with the best measured payoff.
3. **Checks that a machine runs (tests, types, the orchestrator's done command) beat model review.** Models cannot fix their own reasoning without an outside signal, and a reviewer asked to find gaps will always find some.
4. **Agree what "done" means before building.** The reviewer should sign off on the plan and on how it will be checked, then check the result against that same agreement.
5. **Context is the scarce resource.** Keep instructions short, load them only when needed, have subagents send back summaries, and use cheaper models for mechanical steps.
6. **Learn from runs as small, curated edits to a playbook.** Build evals from real failures, read the transcripts, and write small delta updates. Do not rewrite whole prompts.
7. **Every part of the harness assumes something the model cannot do. Re-test those assumptions** each time the model changes, and remove parts that are no longer needed.

---

## 2. Architecture: workflows, agents, and how many

### 2.1 Start simple. Pick the pattern that fits the task.
- Source: Anthropic, *Building effective agents*: https://www.anthropic.com/engineering/building-effective-agents
- What it says: "Start with simple prompts, optimize them with comprehensive evaluation, and add multi-step agentic systems only when simpler solutions fall short." It names five patterns: prompt chaining, routing, parallelization, orchestrator-workers, and evaluator-optimizer. Orchestrator-workers is for "complex tasks where you can't predict the subtasks needed". Evaluator-optimizer is for when "we have clear evaluation criteria, and when iterative refinement provides measurable value." Frameworks "often create extra layers of abstraction that can obscure the underlying prompts and responses."
- Evidence: **[Practice]**, drawn from Anthropic's work with many customer teams.
- For us: our plan to rounds to lanes structure is a *workflow* (fixed code paths), which is right for predictable work. The evaluator-optimizer loop (build, review, veto, fix) only pays off if the evaluation criteria are clear before the build. 11 vetoes suggest they were not.

### 2.2 Multi-agent helps parallel work and hurts sequential work. Error amplification depends on the structure.
- Source: Google Research, DeepMind and MIT, *Towards a science of scaling agent systems* (Dec 2025): https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/ and https://arxiv.org/abs/2512.08296
- What it found: 180 configurations, 5 architectures, 3 model families (including Claude). Centralized coordination gave **+80.9%** on a parallelizable finance task. On sequential planning (PlanCraft), "every multi-agent variant we tested degraded performance by **39-70%**." Independent agents amplified errors **17.2x**, while centralized agents with an orchestrator held that to **4.4x**. Coordination gives diminishing or negative returns once a single agent already scores above about **45%**. A predictive model chose the right architecture for 87% of unseen configurations.
- Evidence: **[Measured]**.
- For us: building is mostly sequential (engine, then api, then screen). Parallel lanes should be used only where paths and decisions are truly independent. Keep a central orchestrator, which we already have in phase.py. Never let lanes coordinate peer to peer.

### 2.3 Multi-agent wins on breadth. It costs about 15x the tokens. Coding is a poor fit.
- Source: Anthropic, *How we built our multi-agent research system*: https://www.anthropic.com/engineering/multi-agent-research-system
- What it found: Opus 4 as lead with Sonnet 4 subagents beat a single Opus 4 by **90.2%** on an internal research eval. "Agents typically use about 4x more tokens than chat interactions, and multi-agent systems use about 15x more tokens than chats." Token usage alone "explains 80% of the variance" on BrowseComp. Upgrading the model gave "larger performance gain than doubling the token budget." Also: "most coding tasks involve fewer truly parallelizable tasks than research," and domains where agents "share the same context or involve many dependencies" are a poor fit.
- Effort scaling rules written into the lead's prompt: simple work gets 1 agent and 3 to 10 tool calls. A comparison gets 2 to 4 subagents. Only complex research gets more than 10.
- Each delegation needs "an objective, an output format, guidance on the tools and sources to use, and clear task boundaries."
- Evidence: **[Vendor eval]**.
- For us: size each plan to its task, with a written effort rule (the number of lanes and rounds scales with the kind of change). A two-sentence copy change should be one agent. RUNBOOK's "checks scale with risk" already starts on this. Extend it to agent count and model choice.

### 2.4 "Don't build multi-agents": share full context, and keep decisions in one thread.
- Source: Cognition (Devin), Walden Yan: https://cognition.com/blog/dont-build-multi-agents
- What it says: Principle 1 is to "Share context, and share full agent traces, not just individual messages." Principle 2: "Actions carry implicit decisions, and conflicting decisions carry bad results." In the Flappy Bird example, two subagents build mismatched parts from partial context. Claude Code subagents are "usually only tasked with answering a question, not writing any code."
- Evidence: **[Practice]**, from a leading coding-agent company.
- For us: lanes in the same round that write code make implicit decisions (names, data shapes, date handling) that can conflict. The reconcile round and the reviewer pay for those conflicts. phase.briefing, which tells each lane about its neighbours, is a partial fix. The stronger fix is to fix the shared decisions in a contract before the lanes start.

### 2.5 The pattern that works in 2026: single-threaded writes, plus an isolated reviewer.
- Source: Cognition, *Multi-Agents: What's Actually Working* (Apr 2026): https://cognition.com/blog/multi-agents-working
- What it found: "multiple agents contribute intelligence to a task while writes stay single-threaded." The isolated reviewer (Devin Review) "catches an average of 2 bugs per PR, of which roughly 58% are severe." The reviewer works because it skips hours of context and reads only the diff. The coder then **filters** the reviewer's findings using its broader knowledge of the user's instructions and decisions, so not every finding is acted on. The manager/child split is still "under active development with known fragmentation issues." Pairing a weak main model with a strong helper failed.
- Evidence: **[Vendor eval]**.
- For us: this matches our builder plus reviewer design. What we lack is the filter step. At present every reviewer finding can veto.

### 2.6 How many agents is too many?
Recommendations from the sources, with their evidence:
- Agent teams: "Start with 3-5 teammates… Three focused teammates often outperform five scattered ones." 5 to 6 tasks per teammate. https://code.claude.com/docs/en/agent-teams **[Practice]**
- Dynamic workflows: flagged as a "Large workflow" when a run schedules **more than 25 agents or projects more than 1.5M tokens**. The default size guideline is "medium" (fewer than 10 agents), or "small" (fewer than 5) on Pro. https://code.claude.com/docs/en/workflows **[Practice]**
- Agent teams use "approximately 7x more tokens than standard sessions" when teammates plan. https://code.claude.com/docs/en/costs **[Vendor eval]**
- Past about 45% single-agent success, adding agents gives little. https://arxiv.org/abs/2512.08296 **[Measured]**
- For us: our 0.9M to 2.8M token workflows sit at or above Anthropic's own "large" line. A default of 5 agents or fewer for each plan, with more only when a written reason is given, fits the evidence.

### 2.7 Why multi-agent systems fail
- Source: Cemri et al., *Why Do Multi-Agent LLM Systems Fail?* (MAST): https://arxiv.org/abs/2503.13657
- What it found: 1,600+ annotated traces across 7 frameworks (coding included), 14 failure modes in 3 groups: **system design issues, inter-agent misalignment, and task verification**. Inter-annotator agreement kappa = 0.88. Simple fixes such as better prompts or a changed topology gave limited gains. The authors conclude the failures "require more sophisticated solutions."
- Evidence: **[Measured]**.
- For us: sort each failed or vetoed run into these three groups in `make weekly`. That shows whether our vetoes come from specs (design), from lanes disagreeing (misalignment), or from weak checks (verification).

### 2.8 Simple pipelines are competitive on SWE-bench.
- Agentless (localize, then repair, then validate with reproduction tests) scored 32% on SWE-bench Lite at **$0.70 per issue**, the best open-source result at the time and cheaper than most agent systems. https://arxiv.org/abs/2407.01489 and https://github.com/openautocoder/agentless **[Measured]**
- Anthropic's SWE-bench agent: two tools (bash and an edit tool), "keep the scaffolding minimal," 49% on SWE-bench Verified. The team "spent more time optimizing tools than the overall prompt." Successful runs took "hundreds of turns… and >100k tokens." https://www.anthropic.com/engineering/swe-bench-sonnet **[Measured]**
- SWE-agent: the interface design matters. A linter inside the edit tool that rejects invalid edits added **+3.0 points**. A 100-line file window beat other sizes. https://arxiv.org/abs/2405.15793 **[Measured]**
- For us: the best coding results come from **one capable agent with good tools and a fast check**, not from many roles. Our gains are more likely to come from better tools and done commands (fast, precise, with fix-it messages) than from more roles.

---

## 3. Plan before code, and agree what done means

### 3.1 Explore, then plan, then implement, then commit. Skip the plan when the diff fits in one sentence.
- Source: Claude Code best practices: https://code.claude.com/docs/en/best-practices
- What it says: use plan mode to separate exploration from execution. "If you could describe the diff in one sentence, skip the plan." For large features, have Claude interview you, write SPEC.md, then "start a fresh session to execute it." Good specs "name the files and interfaces involved, state what is out of scope, and end with an end-to-end verification step."
- Evidence: **[Practice]**.

### 3.2 Sprint contracts: generator and evaluator agree on the deliverable and the check before building.
- Source: Anthropic, *Harness design for long-running application development*: https://www.anthropic.com/engineering/harness-design-long-running-apps
- What it says: planner, then generator, then evaluator. Before each sprint, "the generator proposed what it would build and how success would be verified, and the evaluator reviewed that proposal." The evaluator was calibrated "using few-shot examples with detailed score breakdowns." Costs: a solo agent took 20 min and $9, the full harness 6 h and $200, and a DAW app 3 h 50 min and $124.70. The harness gave clearly better apps. When Opus 4.6 arrived, they **removed** the sprint split, because the generator "ran coherently for over two hours without" it. "Every component in a harness encodes an assumption about what the model can't do on its own, and those assumptions are worth stress testing."
- Evidence: **[Vendor eval]** (a case study, not a controlled trial).
- For us: **this is the most direct fix for 13 reviews and 11 vetoes.** Have the reviewer approve a short contract before the build round: which SPEC points, which journeys and tests prove them, and what counts as a blocking finding. Then review only against that contract. A veto for something outside the contract becomes a SPEC change for the founder, not a rebuild.

### 3.3 Long runs need a feature list, a progress file and one feature at a time.
- Source: Anthropic, *Effective harnesses for long-running agents*: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Failure modes: agents try "to one-shot the app," and later agents "declare the job done" too early. Fixes: an initializer writes `feature_list.json` with every end-to-end feature set to `"passes": false`, plus `claude-progress.txt` and `init.sh`. Each session reads git log and progress, runs a basic end-to-end test first, works on **only one feature at a time**, and marks a feature as passing only after browser-level testing. "It is unacceptable to remove or edit tests."
- Evidence: **[Practice]**, with a worked example.
- For us: we already have progress logs and done commands. The missing piece is a per-plan list of acceptance journeys, each marked passing or failing, that the orchestrator updates and every lane reads at start. Then "done" is a count of passing journeys, not a reviewer's opinion.

---

## 4. Verification and review: what really improves quality

### 4.1 A check the agent can run matters more than anything else.
- Source: https://code.claude.com/docs/en/best-practices
- "Give Claude a check it can run: tests, a build, a screenshot to compare." A Stop hook "runs your check as a script and blocks the turn from ending until it passes." Have Claude "show evidence rather than asserting success."
- Evidence: **[Practice]**, and consistent with the SWE-agent and Agentless measurements above.

### 4.2 Models do not fix themselves without an outside signal.
- Source: Huang et al., *Large Language Models Cannot Self-Correct Reasoning Yet* (ICLR 2024): https://arxiv.org/abs/2310.01798
- Without outside feedback, self-correction left accuracy the same or made it worse. The model changed right answers to wrong ones more often than it fixed errors.
- Reflexion, by contrast, reached **91% pass@1 on HumanEval against GPT-4's 80%** by reflecting on *test results* (outside feedback) and keeping those reflections in memory. https://arxiv.org/abs/2303.11366
- Evidence: **[Measured]**.
- For us: a review loop that returns only model opinions to the builder is the weak kind. Every veto should come with a failing test, journey or gate where one is possible (RUNBOOK already moves date bugs into journeys). Findings that are not machine-checkable (sources, wording, screens) are where the reviewer adds value.

### 4.3 Agents rate their own work too highly. Keep the grader separate and give it a rubric.
- Source: https://www.anthropic.com/engineering/harness-design-long-running-apps
- "When asked to evaluate work they've produced, agents tend to respond by confidently praising the work, even when… the quality is obviously mediocre." Separating generator and evaluator "proved essential."
- Evidence: **[Vendor eval]**.

### 4.4 A reviewer asked to find gaps will find some. Only correctness and requirement gaps should block.
- Source: https://code.claude.com/docs/en/best-practices (under "Add an adversarial review step")
- "A reviewer prompted to find gaps will usually report some, even when the work is sound… Chasing every finding leads to over-engineering… Tell the reviewer to flag only gaps that affect correctness or the stated requirements, and treat the rest as optional."
- Evidence: **[Practice]**.
- For us: split reviewer findings into **blocking** (breaks a SPEC point, a boundary rule or a cited source) and **advisory** (everything else, logged to the backlog). Only blocking findings veto. Combined with 3.2, this should sharply cut vetoes.

### 4.5 Score with one judge call against a rubric. Read the transcripts.
- Source: https://www.anthropic.com/engineering/multi-agent-research-system
- "A single LLM call with a single prompt outputting scores from 0.0-1.0 and a pass-fail grade was the most consistent and aligned with human judgements." Rubric: factual accuracy, citation accuracy, completeness, source quality, tool efficiency. "People testing agents find edge cases that evals miss."
- Evidence: **[Vendor eval]**.

---

## 5. Efficiency: tokens, hours and usage limits

### 5.1 Context is the resource to manage.
- "Find the smallest possible set of high-signal tokens that maximize the likelihood of some desired outcome." Context rot: recall drops as tokens grow. Subagents return "condensed, distilled summary of its work (often 1,000-2,000 tokens)." https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents **[Practice]**
- "If you've corrected Claude more than twice on the same issue… /clear and start fresh with a more specific prompt… A clean session with a better prompt almost always outperforms a long session with accumulated corrections." https://code.claude.com/docs/en/best-practices **[Practice]**
- For us: a lane retried after a veto should start **fresh**, with the finding written into its brief, not continue in its old session. CLAUDE.md already says "Two identical failures: stop," which fits.

### 5.2 Keep always-loaded instructions short and load the rest on demand.
- CLAUDE.md: "For each line, ask: Would removing this cause Claude to make mistakes? If not, cut it. Bloated CLAUDE.md files cause Claude to ignore your actual instructions!" "Aim to keep CLAUDE.md under 200 lines." Move workflow detail into skills, which "load on-demand." https://code.claude.com/docs/en/best-practices and https://code.claude.com/docs/en/costs **[Practice]**
- OpenAI harness engineering: AGENTS.md of about 100 lines is "a map, not an encyclopedia," pointing to a structured docs/ folder that is the system of record. The team reported about 1M lines and about 1,500 merged PRs, about 3.5 PRs per engineer per day, with 3 to 7 engineers and no hand-written code. https://openai.com/index/harness-engineering/ (blocked for fetching; figures from the summary at https://madplay.github.io/en/post/harness-engineering) **[Practice]**
- Skills use three levels of loading (metadata, then SKILL.md, then linked files), so "the amount of context that can be bundled into a skill is effectively unbounded." https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills **[Practice]**
- For us: every lane loads CLAUDE.md, and our "read first" chain is DECISIONS, PRINCIPLES, BOUNDARY, then the SPEC. Measure what each lane actually loads at start (`/context`, or the first-turn token count in stream.jsonl). Cut anything a lane does not need. For a builder, most of the plan package is noise.

### 5.3 Match the model to the job.
- "Sonnet handles most coding tasks well and costs less than Opus. Reserve Opus for complex architectural decisions." Use `model: haiku` for simple subagents, such as exploration or running tests and reporting failures. https://code.claude.com/docs/en/costs and https://code.claude.com/docs/en/sub-agents **[Practice]**
- Counterpoint: "Upgrading to Claude Sonnet 4 is a larger performance gain than doubling the token budget," and a weak main model with a strong helper failed at Cognition. So keep the **deciding** agent strong and move only **mechanical** steps down. https://www.anthropic.com/engineering/multi-agent-research-system and https://cognition.com/blog/multi-agents-working
- For us: the model is pinned per contract. Pin it per *role*: a strong model for builder, reviewer and rulepack-drafter; a smaller model for formatters, sample regeneration, log triage and doc checks.

### 5.4 Cut tool output before it reaches the model.
- A hook "can grep for ERROR and return only matching lines, reducing context from tens of thousands of tokens to hundreds." The example PreToolUse hook rewrites test commands so only failures come through. https://code.claude.com/docs/en/costs **[Practice]**
- Tool responses: a "concise" format used 72 tokens against 206 for "detailed". Claude Code caps tool responses at 25,000 tokens by default. https://www.anthropic.com/engineering/writing-tools-for-agents **[Vendor eval]**
- For us: done commands and `make test` output should print only failures and a one-line summary to the agent. The full log stays on disk. This is likely a large saving, since builders rerun tests many times.

### 5.5 Prompt cache: keep lane prefixes identical and mind the TTL.
- Agents in one workflow share cache only when model, effort, agent type, tools, output schema and working directory all match. Workflow and subagent cache lasts **5 minutes by default, even on a subscription**; `subagentPromptCacheTtl: "1h"` extends it. https://code.claude.com/docs/en/workflows **[Practice]**
- The main session cache lasts 1 hour on a subscription. Long sessions resend the whole history each turn. https://code.claude.com/docs/en/costs **[Practice]**
- For us: keep role files, tools and schemas identical across lanes of the same role, and put per-lane detail at the **end** of the prompt, so the shared prefix is cached. Test the 1h TTL for lanes that wait on long test runs, since cache misses after a 5-minute wait resend the full context.

### 5.6 Parallelize tool calls and subagents inside a stage, not across dependent stages.
- Running 3 to 5 subagents at once, and 3+ tools at once inside each, "cut research time by up to 90%." https://www.anthropic.com/engineering/multi-agent-research-system **[Vendor eval]**
- For us: wall time (15.7 h) is mostly queueing, CI waits and repeated review rounds, not agent thinking. `make efficiency` already measures this. The biggest time wins are fewer review cycles (3.2 and 4.4) and one CI run per plan (already in RUNBOOK).

---

## 6. Learning from its own runs

### 6.1 Build evals from real failures. Separate capability evals from regression evals.
- Source: Anthropic, *Demystifying evals for AI agents*: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Start with "20-50 simple tasks drawn from real failures." Regression evals "should have a nearly 100% pass rate"; capability evals start low. Track **pass^k** as well as pass@k, because reliability matters: 75% per trial gives only about 42% for 3 passes in a row. "Grade outcomes, not paths." Each trial runs in a clean environment. "You won't know if your graders are working well unless you read the transcripts."
- Evidence: **[Practice]**.
- For us: `make golden` is our regression set. Add a small **capability set** made from past vetoes: every veto becomes a golden task with the finding as its check. Track pass^3 for the builder role, because the founder needs repeatable results.

### 6.2 Learn as curated delta updates to a playbook, not as rewrites.
- Source: ACE, *Agentic Context Engineering* (ICLR 2026): https://arxiv.org/abs/2510.04618
- Generator, Reflector and Curator roles turn execution feedback into **incremental delta updates** to a playbook. This avoids "brevity bias" and "context collapse," where repeated rewriting wears away detail. Gains: **+10.6%** on agent tasks, **+8.6%** on finance, and up to 17.1% on AppWorld with no ground-truth labels, at lower adaptation cost.
- Evidence: **[Measured]**.
- For us: this fits our `.claude/LESSONS/proposals/` and skill-curator with the founder approving. Keep lessons as small, itemised bullets tagged with the run that taught them. Never let an agent rewrite a whole role file. Remove lessons that no run has used in N weeks, or CLAUDE.md-style bloat returns (5.2).

### 6.3 Store reusable workflows learned from successful runs.
- Source: *Agent Workflow Memory*: https://arxiv.org/abs/2409.07429
- Pulling reusable routines out of past successes and putting them into later runs raised relative success **+51.1% on WebArena** and **+24.6% on Mind2Web**, with fewer steps. It beat human-written workflows by 7.9%.
- Evidence: **[Measured]**.
- Also: skills should be built by having Claude "capture its successful approaches and common mistakes into reusable context and code within a skill." https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills. Subagents can keep `memory: project` notes under `.claude/agent-memory/<name>/`, with the first 200 lines loaded. https://code.claude.com/docs/en/sub-agents **[Practice]**
- For us: after each approved plan, the skill-curator proposes at most a few lines (for example, "how to add a date rule end to end: files, tests, journeys"). Replays prove each one before the founder merges.

### 6.4 Use Claude to read the transcripts and improve the harness.
- "Simply concatenate the transcripts from your evaluation agents and paste them into Claude Code" to improve tools. https://www.anthropic.com/engineering/writing-tools-for-agents. `/insights` reports friction points across up to 200 sessions. https://code.claude.com/docs/en/costs **[Practice]**
- Full tracing "let us diagnose why agents failed and fix issues systematically." https://www.anthropic.com/engineering/multi-agent-research-system **[Vendor eval]**
- For us: `make weekly` already samples runs for the founder. Add an automatic first pass that labels each failed run with its MAST group (2.7) and its cost (tokens, rounds, vetoes), so the founder reads a ranked list, not raw traces.

---

## 7. Human checkpoints

- Put the human at the **plan and spec** stage and at **merge**, not in the middle of a build. "Time spent making the spec precise pays off more than time spent watching the implementation." https://code.claude.com/docs/en/best-practices **[Practice]**
- Workflows cannot take user input mid-run: "For sign-off between stages, run each stage as its own workflow." https://code.claude.com/docs/en/workflows **[Practice]**
- Unattended runs need deterministic gates, such as Stop hooks and `/goal`, "What lets an unattended run finish correctly without you." https://code.claude.com/docs/en/best-practices **[Practice]**
- Resume after a failure rather than restart. "Restarts are expensive and frustrating"; use checkpoints. https://www.anthropic.com/engineering/multi-agent-research-system **[Vendor eval]**
- A caution on perceived speed: in a randomized trial, experienced developers with early-2025 AI tools were **19% slower** while believing they were 20% faster. METR now calls this result historical. It argues for measuring wall time, not trusting impressions. https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/ **[Measured]**
- For us: the founder's approvals (dependencies, contracts, skills, merge) are the right checkpoints. Add one: **approve the review contract (3.2) before the build round**, a 2-minute read that prevents hours of vetoes.

---

## 8. Keep the harness lean as models improve

- Anthropic removed the sprint split when Opus 4.6 no longer needed it. "Every component in a harness encodes an assumption about what the model can't do on its own." https://www.anthropic.com/engineering/harness-design-long-running-apps **[Vendor eval]**
- OpenAI's harness improved over time by adding mechanical checks (custom linters whose messages tell the agent how to fix the problem) and recurring "garbage collection" agents that open cleanup PRs. https://madplay.github.io/en/post/harness-engineering (summary of https://openai.com/index/harness-engineering/) **[Practice]**
- For us: when the pinned model changes, run `make golden` with each optional role or round turned off one at a time (an ablation). Keep only the parts whose removal lowers the pass rate.

---

## 9. Applied to our factory: ranked changes

Our current setup, from docs/factory/RUNBOOK.md and CLAUDE.md: an orchestrator (phase.py) runs plans, then rounds, then parallel lanes. Each lane is one agent in its own worktree and sandbox. Agents cannot start agents. The orchestrator runs the done command itself. A reviewer and an auditor run at the end. There are golden, doctor and weekly reviews, lesson proposals, and checks already scaled by risk.

Much of this already matches the evidence: a central orchestrator, one writer per lane, checks the orchestrator runs rather than the agent's word, checks scaled by risk, and a human at spec and merge. The gaps, ranked by expected saving:

| # | Change | Why (section) | Expected effect |
|---|---|---|---|
| 1 | **Review contract before build.** The reviewer approves a short list of SPEC points, the journeys and tests that prove each, and what blocks. The review then checks only against it. The founder approves the contract. | 3.2, 4.4, 7 | Fewer vetoes, since most of the 11 should become contract items caught before code |
| 2 | **Blocking vs advisory findings.** Only correctness, boundary or source findings veto. The rest go to the backlog. The builder may dispute a finding with evidence, and the orchestrator decides. | 4.4, 2.5 | Stops the loop of chasing findings and overbuilding |
| 3 | **Every veto carries a failing check where one is possible** (test, journey, gate). Model opinion alone vetoes only sources, words and screens. | 4.2, 4.1 | The builder fixes against a signal, and the fix is proved without another full review |
| 4 | **A fresh session per retry**, with the finding in the brief. Cap review cycles at 2, then escalate the area to its own round (RUNBOOK's cap-gap rule, applied everywhere). | 5.1 | Less context rot. Shorter tail on bad runs |
| 5 | **Filter tool output**: done commands and tests show the agent only failures and a summary. | 5.4 | Probably the largest token saving for builders |
| 6 | **Size the plan to the task**: a written effort rule for lane count, 5 agents or fewer by default, one agent for words-only changes. Flag any plan over 1.5M projected tokens. | 2.3, 2.6 | Keeps workflows under the "large" line |
| 7 | **A model for each role**: strong for builder, reviewer and drafter; small for mechanical lanes (samples, formatting, log triage). | 5.3 | Less usage on routine steps |
| 8 | **Lean start-up context**: measure first-turn tokens per role, cut the read-first chain to what that role needs, and keep identical prefixes so cache is shared. | 5.2, 5.5 | Smaller cost for every agent, and more cache reuse |
| 9 | **Acceptance journey list per plan**, marked passing or failing, read by every lane at start. Done means all pass. | 3.3 | Early, machine-checked progress. Fewer "done" claims made too soon |
| 10 | **Learning loop**: every veto becomes a golden capability task. Lessons become itemised delta edits with the run that taught them. Weekly review is pre-labelled by MAST group and cost. Track pass^3. | 6.1 to 6.4, 2.7 | The factory gets measurably better from its own failures |
| 11 | **Ablate on each model change**: turn off one optional round or role at a time on golden, and keep only what earns its place. | 8 | Keeps the harness lean over time |

What to measure after each change, from `make efficiency` and the ledger: wall hours per plan, tokens per plan, review cycles and vetoes per plan, share of vetoes with a failing check attached, golden pass rate and pass^3. Compare against the Product-2 baseline (15.7 h, 13 reviews, 11 vetoes, 0.9M to 2.8M tokens per workflow).

---

## 10. Source list

- Anthropic, Building effective agents: https://www.anthropic.com/engineering/building-effective-agents
- Anthropic, How we built our multi-agent research system: https://www.anthropic.com/engineering/multi-agent-research-system
- Anthropic, Effective context engineering for AI agents: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Anthropic, Effective harnesses for long-running agents: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Anthropic, Harness design for long-running application development: https://www.anthropic.com/engineering/harness-design-long-running-apps
- Anthropic, Demystifying evals for AI agents: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Anthropic, Writing effective tools for agents: https://www.anthropic.com/engineering/writing-tools-for-agents
- Anthropic, Equipping agents for the real world with Agent Skills: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- Anthropic, Raising the bar on SWE-bench Verified: https://www.anthropic.com/engineering/swe-bench-sonnet
- Claude Code docs, Best practices: https://code.claude.com/docs/en/best-practices
- Claude Code docs, Manage costs: https://code.claude.com/docs/en/costs
- Claude Code docs, Subagents: https://code.claude.com/docs/en/sub-agents
- Claude Code docs, Agent teams: https://code.claude.com/docs/en/agent-teams
- Claude Code docs, Dynamic workflows: https://code.claude.com/docs/en/workflows
- Cognition, Don't Build Multi-Agents: https://cognition.com/blog/dont-build-multi-agents
- Cognition, Multi-Agents: What's Actually Working: https://cognition.com/blog/multi-agents-working
- OpenAI, Harness engineering: https://openai.com/index/harness-engineering/ (summary used: https://madplay.github.io/en/post/harness-engineering)
- Kim et al., Towards a Science of Scaling Agent Systems: https://arxiv.org/abs/2512.08296 and https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/
- Cemri et al., Why Do Multi-Agent LLM Systems Fail?: https://arxiv.org/abs/2503.13657
- Xia et al., Agentless: https://arxiv.org/abs/2407.01489
- Yang et al., SWE-agent: https://arxiv.org/abs/2405.15793
- Huang et al., LLMs Cannot Self-Correct Reasoning Yet: https://arxiv.org/abs/2310.01798
- Shinn et al., Reflexion: https://arxiv.org/abs/2303.11366
- Zhang et al., Agentic Context Engineering (ACE): https://arxiv.org/abs/2510.04618
- Wang et al., Agent Workflow Memory: https://arxiv.org/abs/2409.07429
- METR, Early-2025 AI developer productivity RCT: https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/
