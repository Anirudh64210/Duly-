# CLAUDE.md (copy to repo root)

Duly: immigration record keeping for F-1/OPT students. Deterministic engine computes every date; LLM narrates only; everything audited; suggestions, never advice.

## Commands
- make up / make seed / make down : full local stack (api, worker, web 5173, ops 5174, pg, minio, mailpit)
- make test : gates 1 to 8 locally (same containers as CI)
- make e2e / make attack : compose e2e and attack profiles
- make lane NAME=<lane> : create worktree with namespaced compose project

## Hard rules (violations fail CI, do not argue with the gates)
- Never compute or output a date, deadline, hours value, or eligibility statement in LLM code paths; engine/ owns all of it, clock injected, no datetime.now outside clocks providers.
- Never edit tests/, tests/holdout/, evals/, security/, .claude/, CI, hooks, or migrations from an implementation lane.
- Copy rules: no em or en dashes, no emoji, no sealed or cryptographic or AI-generated wording, no eligible or compliant or qualifies, buttons name outcomes. The copy linter enforces this.
- Every AI-visible answer carries sources, rulepack version, and the disclaimer footer; abstain (OUT_OF_SCOPE card) rather than improvise.
- Sensitive zones: document bytes and names never reach the server; only allowlisted structured params reach the LLM serializer.
- Postgres only (RLS on every tenant table); SQLCipher only inside desktop/main.
- One agent, one module, one worktree, one PR; contracts/ changes land first and alone.

## Conventions
Python 3.12, ruff and mypy strict; TS strict; conventional commits; small PRs; SPEC.md before code in every lane; append progress notes to the lane log each iteration.

## Pointers
Plans in duly-plan/ (read 07 before writing tests, 05 before touching auth or crypto, 04 and workbook-handoff before desktop/). Lessons live in .claude/LESSONS/<lane>.md; propose, never self-approve.
