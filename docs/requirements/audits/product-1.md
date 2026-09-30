# Audit: product round 1, its fixes, and plain-1

Auditor: L-audit, run l-audit-e35bfb8420, 2026-09-29. I built none of this work. Commit audited: 443006f (lane/L-audit/l-audit-e35bfb8420, cut from work/product-1).

Measured against specs/product-1/SPEC.md, specs/product-1/SPEC-resolutions.md (points 1 to 66) and specs/plain-1/SPEC.md.

## What I ran

| Command | Result |
|---|---|
| `uv run pytest tests/unit/engine tests/unit/api tests/holdout` | 1710 passed, exit 0 |
| `uv run pytest tests/unit/tools tests/unit/assistant tests/unit/pipeline tests/unit/support` | 26 failed, 284 passed. All 26 are in test_agent_run.py (15), test_phase.py (10) and test_factory_core.py (1), and each fails with "sandbox-exec: sandbox_apply: Operation not permitted": the factory's jail cannot start inside the auditor's sandbox. None touches product round 1 |
| `npx vitest run` in web/ | 11 files, 301 tests passed |
| `npx tsc --noEmit` in web/ | exit 0 |
| `uv run python -m tools.sources.plain rulepacks --require f1` | "every plain text is general, calm, readable and grounded", exit 0 |
| `uv run python -m tools.sources.verify rulepacks` | "4 pack(s) checked, every quote found", exit 0 |
| `uv run python -m tools.gates.engine_literals` | "every number has a source", exit 0 |
| `uv run python tools/copy_lint/lint.py` | "copy lint: clean", exit 0 |
| `uv run python -m tools.sources.plain_changes c760b07 --allow` the two rows of fix 10 | "2 row(s) changed, each one allowed", exit 0 |
| `uv run ruff check engine api tools`; `uv run mypy engine api --strict` | clean |
| probe scripts under TMPDIR: `compute_f1(parse_case(raw, clock), shipped pack, FixedClock 2026-09-29)` | see below |
| `uv run python -m tools.requirements.register build` and `check` | 2456 requirements, whole |

Not run: `make test` as a whole, gates 3 and 6 against a base, the stack, a browser, CI on a pull request.

## What the probes showed

With the shipped F-1 pack on 2026-09-29:

- Nothing entered: cannot_tell with `unconfirmed:nothing_more_to_record`. Yes with its `about`: the verdict on what was entered. Yes with no `about`: still open (point 7). No: `missing:training`.
- CPT days absent: `full_time_cpt_used` is asked.
- An answer dated 2026-09-30: ValueError from parse_case.
- Each of after_today, after_card, card_longer_than_rule, before_recommendation, after_file_by, not_after_program_end and period_outside_cards gave cannot_tell with its conflict and a question. Answered yes, card_longer_than_rule gave talk_to_dso with the judgement item. While it was open, the unemployment items and grace.ends were null.
- OPT with no STEM: `upcoming` held the next-step dates, opt.complete_by and grace.ends, soonest first, each with rule_ids, status and reading; `lists` held the 12 `stem.requires.*` rules; no `next.grace.ends` (point 12).

Two things did not hold (PRIN-011):

1. An OPT card from 2026-06-01 to 2027-05-31 with a program end of 2027-01-01. The card begins while the student is still in the program. No question is raised. After every question was answered, the engine counted 121 days of unemployment, all of them before the program end, against the limit that applies "during any post-completion OPT period" (8 CFR 214.2(f)(10)(ii)(E)). It showed `unemployment.days_remaining` as -31 and gave talk_to_dso for `unemployment_at_or_over_limit`. The verdict does not fall back to the quiet state, but the count is wrong: it counts days of study as unemployment. Point 42 only covers a card that ends on or before the program end.
2. An OPT recommendation dated 2026-06-15 for a card that begins on 2026-06-01, with no filing date, raises no question. The two facts do not fit, and nothing in the SPEC's table covers them.

## Rows the plans cover

SPEC-resolutions names DEC-D41-001, BACK-003, BACK-006, DEC-D05-001 and PRIN-008. plain-1 names DEC-D56-001 to 003 and DEC-D57-001 and 002. SPEC.md has no Covers section and says that the rest is "listed in SPEC.md". It is not listed there. So I also audited every row whose source is specs/product/BACKLOG.md or a principle that SPEC.md builds.

| Row | Old | New | What I ran or read |
|---|---|---|---|
| DEC-D41-001 | partial | met | probe; test_f1_product.py (passes) |
| BACK-003 | partial | met | probe (`upcoming` with rules); Result.tsx What comes next; Plain.test.tsx |
| BACK-006 | partial | met | probe of 7 conflicts; test_f1_product.py conflict tests |
| DEC-D05-001 | partial | partial | the assistant is not wired: api/settings.py provider none, and no route calls it |
| PRIN-008 | met | met | Plain.test.tsx "shows a reading's note behind the tap, marked as Duly's reading" |
| DEC-D56-001 | not_started | met | Plain.test.tsx; labels.ts PLAIN_HEADING, EXACT_BUTTON; all 55 F-1 rules carry plain words |
| DEC-D56-002 | partial | met | plain gate, exit 0 |
| DEC-D56-003 | not_started | met | the regime fixed_admission_2026 plain text beside the order of D. Mass. doc. 51; Plain.test.tsx |
| DEC-D57-001 | not_started | met | drafts.ts read in full; drafts.test.ts |
| DEC-D57-002 | not_started | met | drafts.ts builds only from the case as sent; drafts.test.ts |
| DEC-D05-003 | not_started | partial | drafts for talk_to_dso and for the STEM step exist; no assistant |
| BACK-001, 002, 004, 005, 007, 008 | partial | met | labels.ts, Result.tsx and their tests |
| BACK-009, 010, 011 | partial | met | probes; test_f1_product.py |
| PRIN-007, PRIN-017 | partial | met | test_f1_product.py reading and done-step tests; Result.tsx READING_TAG |
| PRIN-011 | partial | partial | the two gaps above |
| PRIN-014 | partial | partial | an answer is dated, checked and shown, but nothing stores it (api/db.py only checks that the database is reachable) |
| BACK-013, DEC-D12-001, DEC-D42-001, DEC-D47-003, DEC-D48-001 | partial | partial | notes brought up to date: the tests now pass. DEC-D48-001 stays partial: the round is approved in reviews/product-1-fix10.md, but it is not on main and I saw no clean CI run on a pull request |

Share of what the plans named: 10 rows, 8 of them now met; 41 rows touched in total.

## Decisions since the last audit

No plan audit existed before this one. The register was last built with D54 to D57 (1018cac). Nine decisions had no row: D49, D50, D51, D52, D53, D58, D59, D60 and D61. I added 13 rows for them:

- D49 true today: React ^19.3.0, package-lock.json with no pnpm lock, and no compose profiles.
- D50 partial: the register check runs, but the register lacked these decisions and this is the first plan audit.
- D51 true: factory/config.yaml pins claude-opus-5-5 for both the agents and the reviewer.
- D52 true: design/canvas/, docs/research/founder/ and canvas-conflicts.md.
- D53 partial: no canvas screen is built.
- D58, D59, D60: not started. No documents code, and no question about where a typed date came from.
- D61 partial: the SPECs are in place and product round 1 is not on main.

D56 and D57 are true of the repository today, as the rows above show. D41 is true.

## Drift: 20 met rows drawn at random (seed 20260929)

PLAN11-086, RBACK-087, PLAN08-028, PLAN13-001, PRIN-026, PLAN02-042, PLAN07-035, WB01-006, PLAN11-072, RBACK-038, PLAN04-057, RBACK-078, CANVAS-016, PLAN08-058, RBACK-072, PLAN05-002, PLAN05-086, PLAN02-011, PLAN12-005, PLAN10-007.

Every file named as evidence exists. The values match: `--hairline: #eceae4`, and opt.min_hours_per_week is 20. The tests named for RBACK-087, PLAN04-057, RBACK-038 and PLAN02-042 pass. Two of the tests could not pass inside my sandbox: test_the_orchestrator_runs_the_done_command_itself (PLAN08-028) and test_work_kept_for_the_founder_is_not_merged (PLAN08-058). Both fail on "sandbox_apply: Operation not permitted", which means the jail cannot nest inside my sandbox, not that the code is wrong. I left them met and did not prove them. The orchestrator should run them outside the sandbox. No row drifted.

## The factory's own claims

- reviews/product-1-fix10.md says the plain gate, verify, engine literals, copy lint, plain_changes and the engine, api and holdout suites all pass. I ran each one, and each passed.
- Commit c265b8e and the L-content commit name "resolution 67". No point 67 is in specs/product-1/SPEC-resolutions.md, which ends at 66. The review noted this as well. The work it names is in plan-fix10.yaml only.
- The Covers line of SPEC-resolutions says "5 of 1623". The register held 2443 rows before this audit and holds 2456 now. plain-1's "5 of 2443" was right when written.

## Share of the first version met

349 of the 2098 in-scope requirements are met: 17% (was 325 of 2085, 16%). 482 are partly built and 1267 are not started.

Against D47 ("a platform where any student logs in, sees where they stand, what comes next, and the latest verified changes in the law, for every case and every category"):

- where they stand: partly built, for F-1 only
- what comes next: partly built, for F-1 OPT and STEM only
- log in: not started
- the latest verified changes in the law: not started
- every category: not started. The H-1B, O-1 and EB-1A packs hold no rules.

## The ten largest gaps

1. WorkBook screens and flows (workbook-handoff/docs/03-screens-and-flows.md): 179 of 180 not started.
2. The WorkBook context and product (docs/01-context-prompt.md, duly-plan/04-workbook-module.md): 151 of 164 not started.
3. The data and updates pipeline (docs/04-data-and-pipeline.md, and D47's latest verified changes): 69 of 69 not started; updates overall 1% met.
4. Security, privacy and encryption (duly-plan/05-security-privacy-encryption.md): 69 of 100 not started; privacy overall 2% met.
5. The canvas screens (design-screens part): 312 of 390 not started. Only one page, the F-1 case form, exists.
6. Every category beyond F-1 (D12, D47, BACK-017): the H-1B, O-1 and EB-1A packs are empty.
7. The path model (D48 step 2, BACK-014 to 016): not started, so the engine still holds its scenarios in code.
8. Documents (D54, D55, D58 to D60): the vault, sorting on the device and checked typed dates are not started.
9. Accounts and login (D47-001) and the email system (duly-plan/06-email-system.md): 44 of 50 not started.
10. The assistant (D5, D23, D27): the boundary classifier is built, but no assistant is wired to the api or the screen.
