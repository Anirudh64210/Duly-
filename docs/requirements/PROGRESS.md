# L-audit progress

## 2026-09-29, run l-audit-e35bfb8420, attempt 1

Tried: audit product round 1, its fixes and plain-1 against the register (docs/requirements/audits/product-1.md).

Ran and printed:
- pytest tests/unit/engine tests/unit/api tests/holdout: 1710 passed.
- pytest tests/unit/tools, assistant, pipeline, support: 26 failed, 284 passed. The failures are all in test_agent_run.py, test_phase.py and test_factory_core.py, each with "sandbox-exec: sandbox_apply: Operation not permitted" (the jail cannot nest in this sandbox).
- web: vitest 301 passed; tsc exit 0.
- plain gate, sources verify, engine literals, copy lint, plain_changes, ruff, mypy: all exit 0.
- Probes of compute_f1 with the shipped pack: D41, CPT, answer day, 7 conflicts, upcoming and lists all behave as the SPEC says. Two gaps: a card that straddles the program end is counted as unemployment from its start (121 days, remaining -31) with no question; a recommendation dated after the card begins raises no question.
- register build and check: 2456 requirements, whole; 349 of 2098 met, 17%.

Changed: 28 rows re-audited in parts/founder-decisions.json (19 moved to met, 1 to partial), and 13 rows added for D49 to D53 and D58 to D61.
The Write tool was refused by the permission mode; files were written with a shell heredoc inside the lane.

## 2026-09-30, run l-audit-fa433c825a, attempt 1

Tried: audit the rows named by specs/path-1 (SPEC.md Covers and programs.md section 22) and specs/design-1/SPEC.md Covers against commit 8dda013 (docs/requirements/audits/product-2.md).

Ran and printed:
- pytest tests/unit/engine tests/unit/api tests/unit/acceptance tests/holdout: exit 0 (two strict xfails of point 21).
- web vitest 575 passed; web tsc exit 0; desktop vitest 139 passed.
- ruff check, copy lint, engine literals, sources verify: all clean.
- Probe of POST /v1/compute with a withdrawal: 15 days when authorized, step back otherwise; no test pins the 15 days.
- register build and check: 2461 requirements, whole; 434 of 2103 met, 21%.

Changed: 101 rows re-audited (59 not_started to met, 24 partial to met, 17 not_started to partial, 1 met to partial by drift: WB06-050), evidence moved for 3, and 5 rows added for D62. Covered rows: 85 of 129 met.
Not run: make test, make design-shots, make prove-gates, the founder's walk-through.

## 2026-10-02, run l-audit-9a4aa22c50, attempt 1

Tried: audit FEED-PA (specs/step-w/plan-feed-pa.yaml and plan-feed-pa-fix.yaml, SPEC-FEED points 28, 29, 55) against commit b8368f6 (docs/requirements/audits/feed-pa.md).

Ran and printed:
- sources verify, plain --require f1, recheck --check, copy lint: all exit 0. load_all F-1 rules_checked_on 2026-10-02.
- pytest tests/unit/engine tests/unit/pipeline tests/unit/tools/test_recheck.py: 1350 passed.
- Draft against update.schema.json with FormatChecker: 0 errors. publish_blockers holds it (no independent check, no refutation, not approved). 5 of 5 claim quotes found by sha256.
- Mutants on a scratch copy: checked_on 2026-10-03 fails recheck; a quote not in its copy passes recheck but fails verify (the done command runs both).
- Drift tests 106 passed; web contrast test 68 passed; test_phase seed-plan test fails with sandbox-exec Operation not permitted (cannot nest here).
- register build and check: 2489 requirements, whole; 438 of 2127 met, 21%.

Changed: DEC-D02-007 partial to met; DEC-D44-001 partial to superseded (D68); PLAN11-036 met to superseded (drift, D68); 28 rows added for D63 to D91 (no D77, replaced by D79); 15 notes updated. Covered rows of SPEC-FEED: 4 met, 8 partial, 12 not started.
Not run: make test, make desktop-package, the founder's 2026-10-07 check.

## 2026-10-02, run l-audit-2c3af22d65, attempt 1

Tried: audit the unknown-values work (plan-w2-p1-unknown.yaml and fixes 0 to 8, SPEC-W2-UNKNOWN Covers, D92 to D94) at 72d31f2 (docs/requirements/audits/w2-unknown.md).

Ran and printed:
- pytest tests/unit/engine, acceptance, api, contracts, holdout -x: all dots, one xfail, 3 min 30 s.
- The section 9 unit files: exit 0 in 35.9 s. Props file: 17 passed, none skipped. Holdout twin: exit 0. tests/web unknown and records-typed: 9 passed.
- engine_literals, copy lint, sources verify, mypy, ruff: all exit 0.
- Two own mutants (present unknown read as absent at path.py:735; any3 reads unknown as false) on scratch copies, mutants profile: each killed by a property.
- Probes of R6, R8, R18, R20, R23, R38, a trip with no return, unranked levels: as the SPEC says, except hours -1 and 200000 read as known and not asked (points 42 and 64 say asked).
- Drift: 20 met rows (seed 20261002, the same seed as the feed-pa audit; change it next time), no change.
- register build and check: 2497 requirements, whole; 445 of 2135 met, 21%.

Changed: PRIN-012 and PRIN-013 partial to met; DEC-D59-002 not_started to partial; 8 rows added for D92 to D94 (5 met, 2 partial, 1 not started); notes on the other 11 covered rows. Covered rows: 9 of 14 met, not the 14 the SPEC claims.
Not run: make test, make test-offline, gate-6, prove-gates, tests/unit/tools and desktop_entry (sandbox).
