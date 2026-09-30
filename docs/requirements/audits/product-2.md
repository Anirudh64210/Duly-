# Audit: product-2 (path-1 programs.md section 22 and design-1 Covers)

Auditor: L-audit, run l-audit-fa433c825a, 2026-09-30. I built none of this work. Commit audited: 8dda013 (lane/L-audit/l-audit-fa433c825a).

Measured against specs/path-1/SPEC.md Covers and specs/path-1/programs.md section 22 Covers (26 rows), specs/design-1/SPEC.md Covers, the rows it counts as met (108 rows), and specs/product-2/resolutions.md points 1 to 26. Together that is 129 distinct rows, because five Onboarding rows appear in both. As point 19 says, cap-gap rows stay not met.

## What I ran

| Command | Result |
|---|---|
| `uv run pytest -q -p no:cacheprovider tests/unit/engine tests/unit/api tests/unit/acceptance tests/holdout` | exit 0; two x marks, the strict xfails of point 21 |
| `npx vitest run` in web/ | 30 files, 575 tests passed |
| `npx tsc --noEmit` in web/ | exit 0 |
| `npx vitest run` in desktop/ | 11 files, 139 tests passed |
| `uv run ruff check .` | All checks passed |
| `uv run python tools/copy_lint/lint.py`; `pytest tests/unit/tools/test_copy_lint.py` | clean; passed |
| `uv run python -m tools.gates.engine_literals` | every number has a source |
| `uv run python -m tools.sources.verify rulepacks` | 4 packs, every quote found |
| probe TMPDIR/aud/probe_wd.py, probe_wd2.py: POST /v1/compute with a withdrawal record (FixedClock 2026-09-29) | see IMPL-003 below |
| `uv run python -m tools.requirements.register build` and `check` | 2461 requirements, whole |

I did not run: `make test` as a whole, `make design-shots`, the stack, a browser, or the founder's walk-through (design-1 Done 3).

## Path-1 rows (26)

- **Met (8):** BACK-003, BACK-004 (evidence moved to engine/path.py and the canvas app), DEC-D12-006 program extension (J09, J18), DEC-D12-008 change of level (J08, J20), ONB-001, ONB-002, ONB-007, ONB-010.
- **Partly built (18):**
  - DEC-D48-002, BACK-014, BACK-015 and BACK-016: F-1 runs on the path model, and engine/path.py names no kind, field, stage, rule or category (tested). But engine/f1.py still holds the F-1 scenario for /v1/compute/f1, and no other pack has a path.
  - DEC-D47-003 and BACK-013 hold for F-1 only.
  - DEC-D12-001, 002, 004, 005, 007 and 009: each is a stage with tests. Each waits on something programs.md section 20 leaves out: the part-time deduction, 214.3(g)(2)(iii), visa and entry, and stem.basis_ten_years_end (point 7).
  - DEC-D12-003 and IMPL-010 (cap-gap): the path steps back for any petition (point 19). These stay not met.
  - IMPL-003: the probe gave stage withdrawal.x1 from 2026-09-20 to 2026-10-05 (15 days) when the DSO authorized the withdrawal. With "no" or "not sure", no date is given and the reason is x1.dso_authorized. No test pins the 15 days.
  - DEC-D09-001: only F-1 is tagged as a category.
  - ONB-009: work and field wait for WorkBook.

## Design-1 rows (108)

- **Met (81).** Evidence is web/src/design/tokens.css, web/src/app/app.css and the web tests named in each row. That covers the tokens, type, radii, motion and sidebar, plus Home, Timeline, Checklists, Onboarding, Your case, Settings and Feedback.
- **The F-rows.** 32 rows are met "with a change the founder approves". Under D62, Claude adopted F1 to F11, F13 and F14, and the founder has not yet confirmed them. I counted those rows as met under D62 and recorded that in each note.
- **Partly built (24):**
  - Kept partial, with no whole proof: CANVAS-035, 057 to 062; PLAN03-016, 040 to 042, 049, 055, 060, 065.
  - CANVAS-048: the Home stagger steps are 60, 100, 120 and 140ms, not 60 to 90ms.
  - CHECK-001: no H-1B chip.
  - CHECK-007: no hover scale of 1.08.
  - CHECK-011: the label says "the rule's days", not the number F7 asks for.
  - PLAN03-005: ops/ has no TanStack Router.
  - PLAN03-036: WorkBook is not built.
  - PLAN03-039: there has been no founder walk-through.
  - PLAN03-043: there is no pencil control.
- **Not started (3):** PLAN03-044, 045, 050. I found nothing that proves them.

Of the 129 distinct rows: 85 met, 41 partly built, 3 not started. That is 66% met. design-1 claimed 108 met, and 81 are.

## Status changes

- not_started to met: 59.
- partial to met: 24.
- not_started to partial: 17.
- met to partial: 1 (WB06-050, drift).

Each changed row's note starts "Audit product-2 (l-audit-fa433c825a, 2026-09-30): <old> to <new>", followed by what I ran or read. BACK-003, BACK-004 and DEC-D56-001 kept their status, and their evidence now points to the canvas app and the path engine. The old evidence was the bench screen and compute_f1, which the app no longer uses.

## Decisions since the last audit

D62 is new, and I added five rows for it:
- DEC-D62-001 (test screen off the path): met.
- DEC-D62-002 (path model over every program): met.
- DEC-D62-003 (inside the desktop window): met, desktop vitest 139 passed.
- DEC-D62-004 (every verdict reachable after the D59 checks): partial. needs_you and talk_to_dso are reached. I found no test that reaches no_open_items through the path after the checks.
- DEC-D62-005 (F-answers adopted by Claude, open to the founder): partial.

D54 to D61 were added at the last audit and I did not re-audit them.

## Drift (20 met rows drawn at random, seed 20260930)

I checked PLAN02-001, PLAN11-067, PLAN05-002, DEC-D56-001, WB06-050, PLAN08-005, PLAN05-086, PLAN10-012, PLAN06-002, PLAN11-078, PLAN03-003, PLAN03-031, RBACK-089, PLAN07-028, PLAN02-008, RBACK-113, PLAN00-002, PLAN03-006, PLAN03-023 and PLAN10-010. I read each file they name, and ran ruff, the copy lint and its test, gitleaks presence and the tsconfig strict flags.

- 19 still hold.
- WB06-050 (Timeline item: cap-gap) moves from met to partial. The app now computes through engine/path.py, which steps back for any petition, so no cap-gap Timeline item carries dates.
- PLAN10-012 names `make prove-gates`, which I did not run. The file tools/gates/prove.py exists.

## Scope

- **Share of the first version met:** 434 of 2103 (21%), up from 349 of 2098 (17%) at the last audit.
- **What product-2 covered:** 129 rows, 6% of the 2103.
- **Against D47** ("any student ... for every case and every category"):
  - Only F-1 has a path.
  - H-1B, O-1 and EB-1A packs hold no rules.
  - Every real case is "Can't tell yet" until documents-1 (D59).

## The ten largest gaps

1. WorkBook screens and flows (workbook-handoff 03): 179 rows not started.
2. WorkBook context (workbook-handoff 01): 97 not started.
3. Compliance and system design research (RCOMP): 82 not started.
4. WorkBook data and pipeline (workbook-handoff 04): 69 rows, all at nothing.
5. Security, privacy and encryption (duly-plan 05): 69 not started.
6. WorkBook module plan (duly-plan 04): 54 not started.
7. Build sequence (duly-plan 10): 52 not started.
8. Email system (duly-plan 06): 44 not started.
9. Other categories: H-1B, O-1 and EB-1A have no path and no sourced rules (DEC-D47-002, CHECK-014 to CHECK-017).
10. Documents (D54, D55, DOCS rows) and Scenarios (SCEN rows, 10 at nothing), plus cap-gap itself, deferred by point 19.
