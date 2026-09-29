# CLAUDE.md

Duly: immigration record keeping for F-1, H-1B, O-1 and EB-1A. Code computes every date. Sources are cited. Nothing is advice.

Read first, in this order: DECISIONS.md, PRINCIPLES.md, BOUNDARY.md, then the SPEC for your lane. Where they disagree with duly-plan/ or workbook-handoff/, DECISIONS.md wins.

## Commands
- make up / make down / make logs : full local stack (api, worker, web 5173, ops 5174, postgres, minio, mailpit 8025)
- make test : gates 1 to 6
- make gate-N : one gate
- make prove-gates : plants violations in a scratch copy and checks each gate catches its own
- make lane NAME=<lane> : new worktree for a lane
- make ops-block-demo : shows Ops refusing a network that is not on the list

## Hard rules (the gates enforce these; do not argue with the gates)
- No model computes or states a date, a deadline, a count, or a conclusion about a user. engine/ owns all of it.
- Read the time only through engine.clocks. Pass a Clock in.
- The assistant never crosses the line in BOUNDARY.md. In doubt, it steps back and drafts the DSO question.
- A verdict never falls back to the quiet state. Missing, stale, conflicting, or litigated means cannot_tell.
- No user data goes to an outside model provider. Model clients live in assistant/providers and pipeline/models only.
- A law update is shown to a user only when publish_blockers returns nothing: primary source, quote found, two checks, founder approval.
- Every rule carries a primary source and one of five tags: settled, guidance, litigated, proposed, school.
- A value in a plan or a SPEC is a claim to check against the saved source, never a fact to copy. If the law does not state a number, Duly does not have it.
- Confirm, never assume. A gap or a conflict in a person's record becomes a question to that person, and the verdict is cannot_tell until they answer.
- Implementation lanes never edit tests/, evals/, security/, .claude/, .github/, tools/gates/, contracts/, BOUNDARY.md, or DECISIONS.md.
- Copy: no long dashes, no emoji, none of the words in tools/copy_lint/lint.py, buttons name outcomes.
- Postgres only on the server. SQLCipher only inside desktop/main.
- One agent, one lane, one worktree, one PR. Contract changes land first and alone.

## Conventions
Python 3.12, ruff and mypy strict. TypeScript strict. Conventional commits. Small PRs. SPEC.md before code. Append to your lane's progress log every iteration.

## When you are stuck
Two identical failures: stop, write ESCALATE.md with what you tried and the failure tail, and exit. Do not weaken a test. Do not edit a gate.

## Lessons
Propose in .claude/LESSONS/proposals/. Never approve your own.
