# Research: token and context efficiency for coding agents

Date: 2026-09-30. Scope: context engineering, prompt caching, pointers instead of payloads, scoped reading, compaction, model and effort tiering, images and large files, and the savings people have measured. Primary sources come first. Each practice lists its URL and the evidence behind it. Evidence grades: **M** = a number someone measured and published; **D** = documented product behaviour (how the system works, not a benchmark); **P** = practitioner judgement with no published number.

Factory baseline (from the brief and from `factory/config.yaml`): one feature took 15.7 h, with 13 reviews and 11 vetoes. Workflows used 0.9M to 2.8M tokens each. Every agent is pinned to `claude-opus-5-5`, and so is the reviewer. No agent file sets `model` or `effort`. The builder contract allows 6M tokens and 120 turns. Up to 12,000 characters of past-failure lessons are injected. Runs use a subscription login.

---

## 1. Bottom line: the ten changes most likely to pay off, ranked

| # | Change | Why (evidence) | Expected effect |
|---|---|---|---|
| 1 | Stop running every role on Opus at default effort. Tier by role: Opus 5.5 at `medium` for builder and planner, `high` only for the reviewer and red-team. Use Sonnet 5.5 or Haiku for mechanical roles (report parsing, eval curation, formatting, file listing). | D: Opus 5.5 at `medium` "matches or exceeds Opus 5 at `high`", and Sonnet costs half as much as Opus per token (sections 5.1 and 5.2). M: at Anthropic, moving to a better model gave more than doubling the token budget did. | Large. Thinking tokens are billed as output, so effort is the biggest lever on output. |
| 2 | Pass pointers, not payloads. The orchestrator hands each agent file paths plus one line of intent. Agents write results to files and return a path and a short summary of about 1–2k tokens. | D/M: Anthropic's multi-agent system and its context-engineering post (section 3). Manus: "restorable compression". | Cuts the orchestrator's context and every resend of it. |
| 3 | Treat the prompt-cache hit rate as a tracked metric. Never change a running agent's tools, model or effort mid-run. Keep the prefix byte-stable, with no timestamps or run IDs in system text. | M/D: the Claude Code team raises SEVs when the hit rate drops. Manus says a cached token costs a tenth of an uncached one. Opus 5.5 cache reads cost 0.05× (section 2). | Keeps re-reads at 5% of the price instead of 100%. |
| 4 | Filter tool output before the model sees it: tests print failures only, logs are grepped, reports are capped. | D: the Claude Code costs doc hook example, "tens of thousands of tokens to hundreds". M: code-execution MCP took 150k tokens to 2k (section 4). | Large on builder and test loops. |
| 5 | Start each builder attempt from a fresh context built from a progress file and git log. Don't carry a long polluted session forward, and don't retry inside the same context after two failures. | M: Chroma context rot, where a 300-token focused prompt beat about 113k tokens of full context. D: the long-running-harness post. P: the best-practices "after two failed corrections, /clear". | Improves quality and saves tokens together. |
| 6 | Lower the auto-compact threshold for long agents to roughly 200–300k, or make compaction unnecessary through fresh-context attempts. | D: on 1M-context models the default auto-compact is about 967K tokens, far past where context rot bites (section 6). | Avoids hours of degraded reasoning at the tail of long runs. |
| 7 | Give the reviewer a scoped input: the diff, the SPEC path and the rubric, not the whole lane. Tell it to flag only defects that affect correctness or stated requirements. | D: the best-practices doc says a reviewer asked to find gaps "will usually report some, even when the work is sound … leads to over-engineering". | Directly targets the 11 vetoes in 13 reviews and the rework loops they cause. |
| 8 | Keep always-loaded context small: CLAUDE.md under 200 lines, specialised procedures in skills (loaded on demand), and `omitClaudeMd` for agents that don't need it. | D: costs doc, skills progressive disclosure, sub-agents doc. | Saves a small amount per request, multiplied across every request of every agent. |
| 9 | Make learning a curated playbook, not an append-only lessons dump. Record itemised delta entries with a helpful/harmful counter and prune them. Inject only the entries relevant to the lane. | M: ACE gained up to +17.1% on AppWorld agent tasks with 86.9% lower adaptation latency, and warns about "context collapse" and "brevity bias". M: Reflexion reached 91% on HumanEval against a 80% base. | Quality improves over runs without growing every prompt. |
| 10 | Measure per role and per phase: cache read, cache write, uncached input, output tokens, turns, wall time. Compare every change against that baseline. | D: `/usage` "Prompt cache (main)" line, `--output-format json` usage, and per-agent token totals in `/workflows`. | Without measurement none of the above can be verified. |

---

## 2. How usage is actually consumed (mechanics that drive every other choice)

- **Each turn resends everything.** "Claude Code re-sends the full context: the system prompt, your project context, every prior message and tool result, and your new message." The cache stops that from being reprocessed. It does not stop it from being counted. "A one-line question in a session that has been open all day still draws usage for the whole conversation." (D) https://code.claude.com/docs/en/prompt-caching and https://code.claude.com/docs/en/costs#why-usage-climbs-in-a-long-session
- **Cached content and order.** Tools, then system, then messages. A change at one level invalidates that level and every level after it. The match is exact: "There is no per-file or per-segment caching." (D) https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- **Prices** (API list prices; on a subscription the same ratios drive how usage is metered):
  - Opus 5.5: $4 in, $20 out. 5-minute cache write $5, 1-hour write $8, **cache read $0.20 (0.05×)**.
  - Sonnet 5.5: $2 in, $10 out, cache read $0.20.
  - Haiku 4.5: $1 in, $5 out.
  - A 5-minute write pays for itself after one read. A 1-hour write pays for itself after two. (D) https://platform.claude.com/docs/en/about-claude/pricing
- **How long the cache lasts, and for whom.** On a subscription, within plan usage, the **main conversation gets a 1-hour TTL, but subagents and workflow agents get 5 minutes**. Once usage credits are drawn, the main conversation drops to 5 minutes. `subagentPromptCacheTtl: "1h"` (or `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`) extends agent caches. (D) https://code.claude.com/docs/en/prompt-caching#which-ttl-each-request-gets
  - Duly implication: a builder that waits more than 5 minutes on a test run pays a full cache rebuild on its next turn. Measure the miss rate first. Set `1h` only for roles with long idle gaps, because a 1-hour write costs 2× instead of 1.25×.
- **Changes that break the cache:**
  - switching model
  - changing effort (except on Opus 5.5, Sonnet 5.5 and Fable 5.1, where the cache is kept)
  - fast mode on
  - adding or removing MCP tools when tool search is off
  - denying a whole tool when tool search is off
  - compaction
  - accumulated images being dropped
  - a Claude Code upgrade

  (D) https://code.claude.com/docs/en/prompt-caching#actions-that-invalidate-the-cache
- **Changes that keep the cache:** file edits, CLAUDE.md edits (which also don't apply until `/clear` or `/compact`), permission-mode changes, invoking skills, `/rewind`, spawning a subagent. (D) same page.
- **Workflow fan-out shares one prefix.** Agents with the same model, effort, agent type, tools, output schema and working directory share a system-plus-tools prefix. The runtime holds siblings back for up to 5 seconds so they read the first agent's cache. Keep those six things identical across a fan-out, and put per-item variation in the task message only. (D) https://code.claude.com/docs/en/workflows#prompt-caching-in-a-fan-out
- **Cache scope in Claude Code.** The cache is effectively one machine plus one directory. Sessions in different worktrees build different prefixes, because the prefix includes the working directory and a git status snapshot. (D) https://code.claude.com/docs/en/prompt-caching#cache-scope
  - Duly implication: per-lane worktrees will not share cache with each other. That is acceptable, but a lane's retries should run in the same directory.
- **Forks reuse the parent's cache; fresh subagents don't.** Use a fork (`context: fork`, `/subtask`) when a child needs the parent's context. Use a fresh subagent when isolation matters more, as it does for the reviewer. (D) https://code.claude.com/docs/en/sub-agents

## 3. Context engineering principles (quality and tokens are the same problem)

- **Context rot is real, and it starts well below the window limit.** Chroma tested 18 models, Claude 4 among them. "Model performance degrades as input length increases, often in surprising and non-uniform ways." On LongMemEval, focused prompts of about 300 tokens scored near-perfect while full prompts of about 113k tokens degraded on every model. A single distractor already reduces accuracy. (M) https://www.trychroma.com/research/context-rot
- **Lost in the middle.** Accuracy follows a U shape: it is best when the relevant information sits at the start or end, and "significantly degrades" in the middle. Put the task and acceptance criteria at the end of an agent's prompt, and the stable role text at the start. (M) https://arxiv.org/abs/2307.03172
- **Anthropic's framing.** Context is "a finite resource with diminishing marginal returns". Find "the smallest possible set of high-signal tokens". Pitch the system prompt at the right "altitude", neither brittle if-else logic nor vague guidance. (D/P) https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- **Just-in-time retrieval, meaning pointers instead of payloads.** Agents keep "lightweight identifiers (file paths, stored queries, web links, etc.)" and load data at runtime. Claude Code uses head, tail and grep "without ever loading the full data objects into context". (D) same URL
- **Subagents return distilled output.** Each returns "a condensed, distilled summary of its work (often 1,000-2,000 tokens)". (D) same URL
- **Write outputs to the filesystem instead of relaying them.** "Subagent outputs to a filesystem to minimize the 'game of telephone'". Direct outputs cut "token overhead from copying large outputs through conversation history". (D) https://www.anthropic.com/engineering/multi-agent-research-system
- **Restorable compression.** Drop page or file content but keep the URL or path, so it can be re-read. Treat the filesystem as unlimited, persistent context. Keep the prefix stable (a timestamp in the system prompt breaks the cache). Keep context append-only. (P, production experience) https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus
  - Manus reports an input-to-output ratio of about 100:1 and calls "KV-cache hit rate … the single most important metric for a production-stage AI agent".
- **Recitation.** Rewriting a `todo.md` keeps the goal in recent attention over long runs. (P) same URL. This is equivalent to the factory's progress log, provided the log is re-read each attempt.
- **Keep errors in context within an attempt.** Failed actions left visible let the model adapt. (P) same URL. This pairs with (5) below: keep the error while inside the attempt, and carry only a distilled lesson across attempts.
- **Share decisions when work is coupled.** "Actions carry implicit decisions, and conflicting decisions carry bad results." Parallel agents on coupled work diverge, so use a single thread for coupled work and parallel agents only for independent work. (P) https://cognition.com/blog/dont-build-multi-agents
  - Duly implication: lanes are a good split only where their paths and contracts don't interlock.

## 4. Pointers, scoped reading and filtering output (the biggest measured savings)

| Practice | Measured result | Source |
|---|---|---|
| Filter data in code before it reaches the model; load tool definitions on demand | 150,000 tokens to 2,000 (−98.7%); "the agent sees five rows instead of 10,000" | M https://www.anthropic.com/engineering/code-execution-with-mcp |
| Tool search (deferred tool schemas) | −85% tokens from tool definitions; accuracy up (Opus 4: 49% to 74%) | M https://www.anthropic.com/engineering/advanced-tool-use |
| Programmatic tool calling (the model writes code that calls tools, so intermediate results stay out of context) | 43,588 to 27,297 tokens (−37%) on complex research tasks | M same URL |
| Context editing (automatically clear stale tool results) plus a memory file | −84% tokens on a 100-turn web-search eval; +39% performance (+29% from context editing alone) | M https://claude.com/blog/context-management |
| Concise versus detailed tool responses | 72 against 206 tokens (about a third); Claude Code caps a tool response at 25,000 tokens by default | M/D https://www.anthropic.com/engineering/writing-tools-for-agents |
| A hook pre-filters test and log output | "reducing context from tens of thousands of tokens to hundreds" (worked example: a PreToolUse hook rewrites `pytest`/`npm test` to show failures only) | D https://code.claude.com/docs/en/costs#offload-processing-to-hooks-and-skills |
| A code-intelligence (LSP) plugin instead of grep plus read | "A single 'go to definition' call replaces … a grep followed by reading multiple candidate files" | D https://code.claude.com/docs/en/costs |
| CLI tools (`gh`, etc.) instead of MCP | "more context-efficient … they don't add any per-tool listing" | D same URL |
| Bounded file views | SWE-agent's ACI shows about 100 lines at a time, returns summarised search results and lints on edit. These interface choices raised its SWE-bench results well above non-interactive baselines | M https://arxiv.org/abs/2405.15793 |
| A repository map instead of whole files | Aider sends a graph-ranked map of signatures within a default 1k-token budget, not file bodies | D https://aider.chat/docs/repomap.html |
| A simple fixed pipeline instead of an open-ended agent | Agentless: localise, then repair, then validate; 32% on SWE-bench Lite at $0.70 per issue, beating contemporary open agents on both accuracy and cost | M https://arxiv.org/abs/2407.01489 |

What this means for the factory:
- Test and gate commands called by agents should print a pass/fail summary and failing cases only, capped at about 100 lines, with the full log written to a file whose path is returned.
- Reports go into `REPORT.json` on disk. The orchestrator reads fields, not prose.
- Orchestrator prompts name files by path. They never inline SPEC bodies, sources or diffs.
- Give agents an LSP or code-intelligence tool for the Python and TypeScript lanes.

## 5. Model and effort tiering per task

### 5.1 Effort

Levels are `low`, `medium`, `high`, `xhigh` and `max`.
- Opus 5.5 and Sonnet 5.5 **default to `medium`**.
- "Opus 5.5 at `medium` matches or exceeds Opus 5 at `high` on coding and knowledge-work evaluations."
- Use `high` "where verification matters or edge cases are likely".
- `max` is "prone to overthinking; test before adopting broadly".
- Effort can be set per subagent in frontmatter (`effort:`) and per model (`modelSettings`). On Opus 5.5, changing effort keeps the cache.
- Thinking tokens are billed as output.

(D) https://code.claude.com/docs/en/model-config and https://code.claude.com/docs/en/costs#adjust-extended-thinking

### 5.2 Model

- "Sonnet handles most coding tasks well and costs less than Opus. Reserve Opus for complex architectural decisions or multi-step reasoning … For simple subagent tasks, specify `model: haiku`." (D) https://code.claude.com/docs/en/costs#choose-the-right-model
- Resolution order: the per-invocation `model` (for example `agent(..., {model})` in a workflow), then the agent file's `model`, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the session model. (D) https://code.claude.com/docs/en/sub-agents
- The built-in Explore agent skips CLAUDE.md and git status. Override it with a project agent named `Explore` with `model: haiku` for cheap searching. (D) same URL
- Model quality beats token volume. In Anthropic's research system, token usage explained 80% of performance variance. Upgrading the model "provided a larger performance gain than doubling the token budget". (M) https://www.anthropic.com/engineering/multi-agent-research-system
- **Never switch model mid-conversation.** Each model has its own cache. Hand off through a subagent that writes a handoff note instead. (D/P) https://claude.dev/blog/lessons-from-building-claude-code-prompt-caching-is-everything/

### 5.3 A suggested tier map for the factory (inference from the sources above; verify with the golden tasks)

- **Builder:** Opus 5.5 `medium`, raised to `high` only on the retry after a veto.
- **Reviewer and red-team:** Opus 5.5 `high`. This is where edge-case checking pays.
- **Auditor:** Opus 5.5 `high`.
- **Test-author, rulepack-drafter:** Opus 5.5 `medium`.
- **Eval-curator, skill-curator, report summarisers, file listing:** Sonnet 5.5 `low` or `medium`, or Haiku.

`factory/config.yaml` pins one model for everything and refuses other models. The pin needs to become a per-role map, and that is a founder-approval change (contract/config).

## 6. Compaction, clearing and fresh starts

- **What compaction does.** It replaces history with a summary. Claude Code then re-reads up to the 5 most recently modified files; files over 5,000 tokens come back as a path only. It re-injects the bodies of invoked skills, truncated from the end, so the important instructions belong at the top of each SKILL.md. Path-scoped rules are summarised away. (D) https://code.claude.com/docs/en/context-window
- **Cost.** Compacting with a warm cache is cheap. Compacting cold reprocesses everything. `/clear` costs nothing. Compact at natural breaks rather than mid-task. `/rewind` returns to an already-cached prefix. (D) https://code.claude.com/docs/en/prompt-caching#compacting-the-conversation
- **The default threshold is very late on 1M models.** It is about 967K tokens. It can be set with `autoCompactWindow` or `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (100k–1M). (D) https://code.claude.com/docs/en/model-config
  - Given context rot (section 3), a lower window, or no single context that long, is the safer design (inference).
- **Compaction prompts.** Aim for recall first, then precision. Use custom instructions ("Compact instructions" in CLAUDE.md, or `/compact Focus on …`). (D) https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents and https://code.claude.com/docs/en/costs
- **Fresh context beats accumulated corrections.** "If you've corrected Claude more than twice on the same issue … run `/clear` and start fresh … A clean session with a better prompt almost always outperforms a long session with accumulated corrections." (P, Anthropic internal practice) https://code.claude.com/docs/en/best-practices
- **The long-running harness pattern.** An initialiser writes a feature list, a progress file and an init script. Each coding session reads `git log` and the progress file, takes one feature, commits, and updates the progress file. "Work on only one feature at a time … critical". End-to-end tests prevent premature "done". (D/P) https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
  - Duly implication: the factory already has progress logs and one lane per feature. The gains come from (a) starting each retry fresh from those files, and (b) keeping each feature small enough to finish inside roughly 100–200k tokens of context.

## 7. Images, PDFs and large files

- **Image cost.** An image costs ⌈w/28⌉×⌈h/28⌉ visual tokens.
  - On Claude 4.7 and later (high-resolution tier) the long edge is capped at 2576 px and the count at 4784 tokens per image. On older models the caps are 1568 px and 1568 tokens.
  - Examples on the high-resolution tier: 1000×1000 = 1,296 tokens; 1920×1080 = 2,691; 4K = 4,784. "High-resolution images can use up to roughly three times more visual tokens". Downsample when fidelity isn't needed.

  (D) https://platform.claude.com/docs/en/build-with-claude/vision
- **Images stay in history and are resent every turn.** Claude Code drops the oldest in batches when limits are hit, and each drop rebuilds the cache from that point. (D) https://code.claude.com/docs/en/prompt-caching#accumulating-many-images
- **Screenshots and browser checks.** Crop to the element, resize to at most about 1000 px on the long edge, and have a subagent return a text verdict so the image never enters the builder's or orchestrator's context (inference from the two items above).
- **Web and PDF sizes.** A typical web page is about 2,500 tokens, a large docs page about 25,000, a 500 kB PDF about 125,000. (D) https://platform.claude.com/docs/en/about-claude/pricing#web-fetch-tool
  - Duly implication: when agents source the law, fetch once, save to `sources/`, and pass the path. Never re-fetch into several agents' contexts.

## 8. Always-loaded context (the fixed cost on every request)

- The typical startup load: system prompt about 4.2k tokens, MEMORY.md (first 200 lines or 25KB), environment information, deferred MCP tool names about 120 tokens, CLAUDE.md, and the skill listing. (D) https://code.claude.com/docs/en/context-window
- "Aim to keep CLAUDE.md under 200 lines." Move workflow-specific instructions into skills, which load on demand. "Bloated CLAUDE.md files cause Claude to ignore your actual instructions!" (D/P) https://code.claude.com/docs/en/costs and https://code.claude.com/docs/en/best-practices
- Skills use progressive disclosure: the name and description are always loaded, SKILL.md loads on trigger, and linked files load only when read. (D) https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- Subagents load the full CLAUDE.md hierarchy, git status and any preloaded skills. `omitClaudeMd: true` skips CLAUDE.md. Restricting `tools` shrinks the tool listing. (D) https://code.claude.com/docs/en/sub-agents
- Duly note: CLAUDE.md is 37 lines, which is fine. The 12,000-character lessons injection (about 3k tokens) goes to every attempt of every agent. That is modest per request, but it is resent on every turn and cached only if byte-stable. Filter it to the relevant lane (section 9).

## 9. Learning from runs without bloating context

- **Reflexion.** Agents write verbal reflections on failures into an episodic memory and reuse them on the next trial. It reached 91% pass@1 on HumanEval against 80% for the base GPT-4. (M) https://arxiv.org/abs/2303.11366
- **ACE (Agentic Context Engineering).** Context is kept as an evolving playbook maintained by three roles: generator, reflector and curator. Updates are **itemised deltas**, not whole-document rewrites, which avoids "brevity bias" and "context collapse". It gained up to +17.1% on AppWorld agent tasks and +8.6% on finance, with 86.9% lower adaptation latency and fewer rollouts. (M) https://arxiv.org/abs/2510.04618
- **Built-in agent memory.** The `memory: project` frontmatter gives an agent a `.claude/agent-memory/<name>/MEMORY.md` it curates. The first 200 lines or 25KB are preloaded. (D) https://code.claude.com/docs/en/sub-agents#enable-persistent-memory
- **Improve from transcripts.** Concatenate evaluation transcripts, have Claude find where tools or prompts misled the agent, and re-test on held-out tasks. (D/P) https://www.anthropic.com/engineering/writing-tools-for-agents
- **Capture what worked as skills.** Record successful approaches and common mistakes in skills. (P) https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills

For the factory:
- Turn the lessons memory into a curated playbook with one entry per lesson. Give each entry `lane`, `trigger`, `rule`, `evidence (run id)`, and `helpful` and `harmful` counts.
- The skill-curator runs after each run as the reflector and curator. It adds or edits entries as deltas and retires entries with no hits.
- Inject only the entries for the current lane and phase.
- Keep reviewer veto reasons as structured data. Recurring veto classes then become builder checklist items or linters, not repeated review cycles.

## 10. Measuring it (so the savings are real)

- **`/usage`.** It shows the "Prompt cache (main)" line with hit %, misses, likely cause and warm/cold state. On a subscription it also attributes usage to skills, subagents, MCP servers and loops, and flags long context or cache misses once they pass 10% of usage. (D) https://code.claude.com/docs/en/costs#prompt-cache-statistics
- **`/workflows`.** It shows token totals and elapsed time per phase and per agent. A run is flagged "Large workflow" at more than 25 agents or more than 1.5M projected tokens. The `workflowSizeGuideline` setting takes `small` (<5 agents), `medium` (<10) or `large` (<50). (D) https://code.claude.com/docs/en/workflows#cost
- **`claude -p --output-format json`.** It returns `usage`, including `cache_read_input_tokens`, `cache_creation_input_tokens` and the 5m/1h split. The runner should log this per agent run to a CSV/JSON ledger: role, lane, model, effort, turns, the four token classes and wall time. (D) https://code.claude.com/docs/en/prompt-caching#choose-the-ttl-yourself
- **A healthy signal.** A high ratio of cache reads to cache writes. "If creation stays high turn after turn, something is changing in your prefix." (D) https://code.claude.com/docs/en/prompt-caching#check-cache-performance

## 11. Measured savings people report (quick reference)

| Claim | Number | Grade | URL |
|---|---|---|---|
| Code execution with MCP (filter in code, load tools on demand) | −98.7% tokens (150k to 2k) | M (vendor example) | https://www.anthropic.com/engineering/code-execution-with-mcp |
| Tool search tool | −85% tokens; accuracy +25 pts on Opus 4 | M (vendor) | https://www.anthropic.com/engineering/advanced-tool-use |
| Context editing plus memory | −84% tokens; +39% task performance | M (vendor, 100-turn eval) | https://claude.com/blog/context-management |
| Programmatic tool calling | −37% tokens | M (vendor) | https://www.anthropic.com/engineering/advanced-tool-use |
| Concise tool responses | about −65% per response | M (vendor example) | https://www.anthropic.com/engineering/writing-tools-for-agents |
| Cached against uncached input | 10× cheaper (Manus); 20× cheaper on Opus 5.5 (0.05×) | D | https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus , https://platform.claude.com/docs/en/about-claude/pricing |
| Multi-agent overhead | agents about 4× chat tokens; multi-agent about 15×; agent teams about 7× a standard session | M/D | https://www.anthropic.com/engineering/multi-agent-research-system , https://code.claude.com/docs/en/costs |
| Focused against full context | about 300-token focused prompt near-perfect; about 113k degraded on all 18 models | M (independent) | https://www.trychroma.com/research/context-rot |
| Evolving playbook (ACE) | up to +17.1% AppWorld, +8.6% finance, −86.9% adaptation latency | M (academic) | https://arxiv.org/abs/2510.04618 |
| Simple pipeline against agent | Agentless 32% on SWE-bench Lite at $0.70 per issue | M (academic, 2024 models) | https://arxiv.org/abs/2407.01489 |

## 12. Caveats

- Most large percentages are vendor-run evaluations on specific tasks. They show direction, not a promise for Duly's workload. Use the factory's golden tasks to confirm each change before adopting it.
- Several benchmarks predate current models (Agentless, SWE-agent, Lost in the Middle). Newer models degrade less, but Chroma's 2025 study still found degradation on Claude 4-class models.
- The subscription meters usage against plan limits, not dollars. The docs confirm that cache reads, subagents and workflows all count against those limits. They do not publish the exact weighting per token class, so the dollar ratios above are the best available proxy.
- Tiering models down can hide quality loss. Never tier down the reviewer or red-team without a golden-set comparison. The factory's `judge_drift_max` check is the right guard.
