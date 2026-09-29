# Duly Build Plan Package

Read order for a Claude Code session: 01 master plan, 02 architecture, 03 frontend and design, 04 workbook module, 05 security privacy encryption, 06 email system, 07 quality gates and tests, 08 agentic factory, 09 feedback loops, 10 build sequence, 11-claude-code-handoff (copy its contents into the repo), 12 open questions.

Companion inputs that this package assumes are also available to the session:
- workbook-handoff/ (the approved WorkBook design package; its docs 02, 04, 07 and 08 are binding)
- The four research docs in the Duly Project: market and pricing validation, compliance and system design, backend and agent factory, skeleton plan v0

Working agreement with the founder (Ani):
- Nothing user-visible ships without passing the full gate pipeline in 07.
- The Rejected lists (workbook-handoff 07 and this package 01) are never reintroduced.
- Speed does not matter. Quality does. When a spec is ambiguous, stop and ask; do not pattern-match.
- No em dashes or en dashes anywhere: code comments, UI copy, emails, docs.
- The founder tests everything locally first: `make up` must always produce a working full stack.

Collaboration protocol for Claude Code CLI:
1. Initialize the repo from 11-claude-code-handoff (CLAUDE.md, .claude/, hooks, contracts skeleton).
2. Work one lane per worktree per 08; open a SPEC.md before code in every lane.
3. Present each phase of 10 as a reviewed PR set; the founder is the merge authority on high-attention paths.
