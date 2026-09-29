# 08 Agentic Factory: Self Learning, Self Testing, Self Debugging, Self Rewarding, Self Growing

Grounded in the backend-and-agent-factory report; this file adds the self-updating skills system and the operating cadence.

## Topology
Bare repo plus one worktree per lane; compose project-name and port namespacing per worktree. Lanes and ownership (CODEOWNERS-mirrored, hook-enforced):
- L-engine (high attention): engine/, rulepacks schema loaders
- L-api: api/ minus admin and narration
- L-narration: api/narration, evals consumer
- L-web: web/; L-ops: ops/; L-desktop: desktop/
- L-tests: tests/ only; L-evals: evals/ only; L-security (red team): security/, attack runs, fix PRs limited to findings
- L-content: rulepacks/ data and emails/ copy (attorney-gated merges)
Founder review economics: one high-attention lane live at a time; two to four low-attention lanes; overnight Ralph loops only on specs with executable done-criteria, 20 to 50 iteration caps.

## Loop mechanics
- Every lane starts with SPEC.md (interfaces named, files listed, verification steps) before code; progress log appended per iteration; fresh context per Ralph iteration with file-based state.
- Self testing: Stop hook blocks turn end until the lane test command passes; PostToolUse runs ruff, mypy, eslint on touched files.
- Self debugging: iterate only on fresh execution signal; two identical failures or self-judgment-only signal triggers escalation ladder: fresh-context replan, reviewer agent, stronger model, founder. Budget three rounds per failure.
- Self rewarding: the only reward is the external gate conjunction of 07, computed in CI the implementer cannot read or modify; reviewer agent (fresh context, correctness scope only) holds a veto; no instance scores its own code.
- Anti-hacking: reward channel invisibility, diff policy gate, holdout rotation, mutation-score canary, inoculation framing in agent prompts (gates are the spec, passing by circumvention is task failure).

## Self growing: the skills system that updates itself
Memory tiers in .claude/: CLAUDE.md (short: commands, conventions, gotchas), skills/ (workflow skills), agents/ (role definitions), LESSONS/<lane>.md (verified post-mortems with provenance).
Skill lifecycle (the self-updating part, with a human gate):
1. Capture: any lane that resolves a failure or repeats a workflow appends a lesson proposal (what happened, fix, commit, evidence link) to LESSONS/proposals/.
2. Draft: the skill-curator agent (weekly, and on demand) converts recurring proposals into skill diffs: new skill files or edits, each with a verification block naming the replay task that proves it.
3. Verify: curator replays each skill against its verification task on a scratch worktree; a skill that does not demonstrably change the outcome is rejected; stale skills (referenced files changed) are flagged for re-verification by a freshness job reading git diffs.
4. Approve: one weekly curation PR to .claude/ that the founder reviews; nothing self-modifies the factory config without that merge. This is deliberate: SICA-style unsupervised self-modification stays off until local data justifies it.
5. Measure: factory metrics track skill hit rate (lessons cited in successful iterations), lane merge rate, rework rate, gate-failure taxonomy; a skill uncited for 60 days is proposed for pruning.
External currency: a monthly docs-refresh task has the curator re-check the few pinned externals (Claude API changes, FR and USCIS endpoints, dependency majors) and propose skill updates the same gated way.

## Red-team lane (adversarial self testing)
Nightly: runs the attack corpus and ZAP against a fresh stack, files findings as structured issues with reproduction, and may open fix PRs limited to the finding; new attack strings it discovers enter security/ through its own reviewed lane, growing the immune system.

## Cadence
Daily: lanes run; merge queue lands green work; nightly gates and red team run. Weekly: curation PR, eval drift review, factory metrics review, holdout spot check. Monthly: holdout rotation, restore rehearsal, threshold review from local data (all numeric priors in this package are starting values to be replaced by measured ones).
