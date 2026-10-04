# CLAUDE.md

Duly: immigration record keeping, as a free, open-source (AGPL), local-first desktop app. F-1 first, every case of it; H-1B, O-1 and EB-1A follow (D84, D89). Code computes every date. Sources are cited. Nothing is advice.

Read first, in this order: DECISIONS.md, PRINCIPLES.md, BOUNDARY.md, then the SPEC for your lane. Where they disagree with duly-plan/ or workbook-handoff/, DECISIONS.md wins.

## Commands
- make ci : exactly the gate steps of .github/workflows/ci.yml, in its order, with the hidden tests. Run it before every push and push only when it is green; then check that the GitHub run is green too
- make test : gates 1 to 7
- make test-offline : the gates that need no network, as the jail runs them
- make gate-N : one gate, 1 to 7
- make prove-gates : plants violations in a scratch copy and checks each gate catches its own

Plans and the factory (docs/factory/RUNBOOK.md has the rest)
- uv run python -m tools.factory.phase specs/<phase>/plan.yaml : every plan runs through phase.py. Resume with --from-round <name>; run a round's checks again with --checks-only <name>
- make watch : the Factory window. make stop, make resume, make status, make doctor, make factory-clean
- make factory-test : the factory's own tests and their diff coverage; run it after a change to tools/factory, before it merges

The desktop app (desktop/, Electron; SPEC-W1, SPEC-W2)
- make desktop : builds web and opens Duly from this checkout; the engine runs through uv on a private socket
- make desktop-smoke : a headless start that writes .scratch/smoke/screen.json
- make samples : regenerates web/samples after the pack or the engine changes
- make desktop-python : the Python carried inside the app (downloads, so it runs outside the jail). Run it again after a change to any file desktop/python/bundle.json lists (engine/, the api files it names, rulepacks/, contracts/, pipeline/published/, desktop/python/), before packaging. make desktop-verify checks the bundle against its own manifest, not against this checkout, so it does not catch a stale bundle
- make desktop-package : Duly.app with its DMG and ZIP under desktop/out
- make desktop-verify : the bundle, the fuses, the signature and a first start (SPEC-W1 point 25)
- make prototype-app : the ui-2 prototype in its own window

The phase-0 server stack (infra/; not how Duly runs, D84)
- make up / make down / make logs : api, worker, web 5173, ops 5174, postgres, minio, mailpit 8025
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

## How work runs now
- Nothing in the build needs an account, a login, a sign-up or a payment: use what is installed on this Mac, and leave work that needs an account waiting for the founder. Commit emails and git history stay as they are (D98).
- Never push to main or merge into it: that is the founder's step.
- A fix plan cites the SPEC point it answers. It never tells a builder what the hidden tests found (D100).
- Plans run their gate checks against origin/main, for example make test-offline BASE=origin/main (D100).
- While a plan runs, founder-lane edits go on their own branch and merge after the plan ends (D100).
- The next build plan, W2-P5, starts only after the regroup round's re-audit finds the repo clean (D100). Until a feed exists, the founder lane rechecks the saved sources on this Mac and rebuilds the app at least every 7 days (D98); that recheck and the freshness plan that moves checked_on are part of the regroup round and may run before the re-audit.
- Builds hold made-up data only until W1's packaged-app review and audit pass (SPEC-W1 point 29, D99).

## Conventions
Python 3.12, ruff and mypy strict. TypeScript strict. Conventional commits. Small PRs. SPEC.md before code. Append to your lane's progress log every iteration.

## When you are stuck
Two different fixes that end in the same failure: stop, write REPORT.json with status escalated, what you tried and the failure tail, and exit. Running the done command again on the same code is not a second failure. Do not weaken a test. Do not edit a gate.
