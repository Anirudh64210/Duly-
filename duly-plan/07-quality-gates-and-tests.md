# 07 Quality Gates and Test Doctrine

Green means production grade because green is a conjunction of independently gameable checks, none of which the implementing agent can see or edit. Ordering is fail-fast; expensive tiers run in the merge queue and nightly.

## Per-push gates
1. Format and lint: ruff, eslint, prettier check; zero warnings. Copy lint: forbidden-phrase scanner over UI strings, prompts, and email templates (em and en dashes, emoji, sealed, cryptographic, AI-generated, eligible, compliant, qualifies, success adjectives, unqualified never-leaves claims, lawyer-equivalence phrases).
2. Types: mypy strict, tsc strict; engine/ and desktop/main at 100 percent typed.
3. Diff policy (mechanical): implementation lanes cannot touch tests/, tests/holdout/, evals/, security/, .claude/, CI, hooks, migrations guard files. Test and eval changes ship only via their own lanes with founder review.
4. Security static: gitleaks, semgrep (owasp, python, typescript, our custom rules for the LLM boundary and RLS usage), pip-audit and npm audit high fails, license check.
5. Unit and property: pytest and vitest; Hypothesis and fast-check on all date and money math with frozen injectable clocks; WorkBook block-rule invariants; engine golden suite; rulepack schema validation and effective-date overlap checks (rule tests).
6. Diff coverage: 80 percent on changed lines; engine/ and desktop/main ratchet to 95.

## Per-PR gates
7. Integration: Testcontainers real Postgres, fresh migrations, RLS matrix: for every tenant table, cross-tenant read returns zero rows and policy exists; authz matrix test: every endpoint times every role (anon, user, other-user, ops) asserts the expected status.
8. Contract: schemathesis against the live OpenAPI; workbook bridge contract suite; email template render snapshots.
9. Regulation tests: consent flow e2e (cannot reach sensitive processing without unbundled opt-in), disclaimer presence assertions on every AI surface and email, rights request lifecycle within SLA clock, retention sweeper honors schedule, GPC honored.
10. Accuracy and honesty evals (promptfoo harness over evals/):
    - Accuracy: engine differential oracle on the golden case corpus; narration answers checked to contain only engine values (no-new-facts validator unit plus end to end).
    - Citation accuracy: every cited source id must resolve to a stored snapshot and the quoted or paraphrased span must match the snapshot (string containment or embedding threshold); broken citation fails.
    - Honesty: abstention set (questions outside rule packs must yield OUT_OF_SCOPE cards), overconfidence set (answers may not contain certainty words for contested items), disclaimer footer present, calibration report published as artifact.
    - Safety: prompt injection corpus (including strings embedded in fake document metadata), jailbreak set, PII exfil probes; zero leaks tolerated.

## Merge queue and nightly
11. E2E: Playwright over the compose e2e profile: onboarding to verdict, checklist toggle persistence, scenario answer with sources, ops approve flow publishing an update that changes a user brief, WorkBook manual day to export to verify.py pass.
12. Hidden holdout suite (isolated job, rotated monthly).
13. Mutation audit: incremental mutmut and StrykerJS on changed files; no new surviving mutants in engine/ and desktop/main; divergence of coverage up with mutation flat pages the founder.
14. DAST: ZAP baseline against the e2e stack (weekly full scan).
15. Stress: k6 profiles: steady 50 rps mixed read, brief-send burst, narration concurrency at budget caps; p95 and error budgets asserted; queue drain time bounded. Chaos-lite nightly: kill worker mid-job, restart Postgres, assert idempotent recovery (jobs carry idempotency keys).
16. Red-team run: the security/attack corpus executed by the adversarial lane against a fresh stack; findings file into loop L7.

## Release (pre-deploy)
PRR-lite checklist on the release PR: alert exists for each new failure mode, runbook stub, reversible migration verified, backup restore rehearsed this month, rate limits configured, feature flags default safe, staging soak on the same digest for 24 hours. External pen test gates the first public launch and each annual cycle.

## Ownership
Test-author lane owns tests/; eval lane owns evals/; security lane owns security/ and gates 4, 14, 16; nobody grades their own work; thresholds change only by founder PR.
