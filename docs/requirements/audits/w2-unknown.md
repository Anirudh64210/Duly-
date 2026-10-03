# Audit: unknown values (plan-w2-p1-unknown.yaml and its fixes 0 to 8)

Run l-audit-2c3af22d65, 2026-10-02. Audited at commit 72d31f2 on lane/L-audit (the merge of
L-review's final pass; the last engine, api or web change is before b120cf2). SPEC:
specs/step-w/SPEC-W2-UNKNOWN.md. I built none of this work. Every probe ran under FixedClock with
today 2026-09-29, the SPEC's own day for its examples.

## What I ran

- `uv run pytest tests/unit/engine tests/unit/acceptance tests/unit/api tests/unit/contracts
  tests/holdout -q -x`: every test passed, one expected xfail, 3 min 30 s.
- The new unit files of section 9 (test_unknown_logic, test_readers, test_unknown_generic,
  test_when_absent, test_toy_pack_coverage, test_w2_unknown, _counts, _stages, _props, _f1,
  tests/unit/api/test_case_structure.py): exit 0 in 35.9 s. That is inside the 90 s budget of
  section 9.
- tests/holdout/test_holdout_w2_unknown.py: exit 0.
- test_w2_unknown_props.py with `-rsx`: 17 passed and none skipped. The non-vacuity test ran.
- tests/web/unknown.test.ts and tests/web/records-typed.test.ts: 9 passed.
- engine_literals, copy lint, sources verify (4 packs, every quote found), mypy (72 files) and
  `ruff check .`: all exit 0.
- Two mutants of my own, each on a scratch copy in TMPDIR, run against test_unknown_logic.py
  and test_w2_unknown_props.py with `--hypothesis-profile mutants`:
  - Z1: `present` on a value that is not known reads it as absent (engine/path.py:735). Killed
    by P6 (`test_a_read_once_tree_is_known_exactly_when_every_completion_agrees`) and by the
    `same_as` U example.
  - Z2: `any3` reads every unknown as false (engine/unknown.py). Killed by
    `test_any3_is_known_exactly_when_every_completion_agrees`.
- My own probes of compute_path on the shipped F-1 pack. The full list is under "Probes".
- `uv run python -m tools.requirements.register build` and `check`.

Not run: `make test`, `make test-offline BASE=work/product-2` (the fix 8 round check),
`make gate-6`, `make prove-gates`, the reviewer's full mutant script (it is in the reviewer's
TMPDIR, not in the repository), and tests/unit/desktop_entry and tests/unit/tools (my sandbox
refuses Unix sockets and nested sandbox-exec).

## Probes (R6's case unless named, worked by hand)

Unemployment on a1 (card 2026-06-01, today 2026-09-29) counts June 30, July 31, August 31 and
September 1 to 29, which is 29 days: 121 days in all. The 90th day is 2026-06-01 plus 89 days,
which is 2026-08-29.

| Input | Shown | Right? |
|---|---|---|
| R6, no job | 121, limit day 2026-08-29 | yes |
| R6 plus a3 with no type | 121, limit day 2026-08-29 kept; a3.type asked | yes (R6) |
| w1 from 2026-07-01 at 40 hours, end left out | 30 (June); limit day null with `pending:w1.end`; nothing asked | yes (R8) |
| hours "40", "forty", true | count and limit day null, waiting on w1.hours_per_week; asked as unreadable | yes |
| hours left out / not_sure | the same, asked as absent / undecided | yes |
| hours -1 | 121, limit day 2026-08-29, nothing asked | **no**: points 42 and 64 say a typed -1 is "read and asked" |
| hours 200000 | 30, limit day pending, nothing asked | **no**, for the same reason |
| end not_sure / "31/08/2026" | withheld, asked undecided / unreadable | yes (R18) |
| end 2026-08-31 | 59 (June 30 plus September 1 to 29), limit day 2026-10-30 (60 more days from 2026-09-01) | yes (R18) |
| end 2026-06-15 | withheld, `span_order.w1` asked as a conflict | yes (R20) |
| start "20260803", "2026-W32-1" | withheld, unreadable:w1.start | yes (R38) |
| authorization list not stated whole | stem.extensions.all null, waiting on complete.authorization | yes (R23) |
| t1 with no returned_on | t1.returned_on asked (absent), cannot_tell | yes (D92) |
| p1 in progress, level professional or other | opt_post.p1 unknown, waiting on p1.level; undecided:p1.level; cannot_tell. With master the stage is next | yes (D93), but see finding 3 |

## The factory's claims, checked

| Claim | Where | What I found |
|---|---|---|
| tests/unit and tests/holdout exit 0 | reviews/w2-unknown.md | True for engine, acceptance, api, contracts and holdout. Not run for tests/unit/tools or desktop_entry. |
| P6 takes about 8 s alone | review | 8.04 s in my run. |
| 40 of 40 R rows pass | REVIEW.json | Every R row I grepped is named in a test (R40 is in test_w2_unknown.py), and the files pass. |
| Every operator and reader mutant is killed by a property | review, fix 8 | Not re-run as the reviewer ran it (their script is not committed). My own two operator mutants were each killed by a property. |
| SPEC Covers: 14 rows "met by this plan" | SPEC-W2-UNKNOWN Covers | **False.** 9 of 14 are met. See below. |
| The new tests/unit files run in under 90 s | point 44 | True: 35.9 s. |

## Rows named by SPEC-W2-UNKNOWN Covers (14)

| Row | Before | Now | What proves it, or what is missing |
|---|---|---|---|
| PRIN-010 | partial | partial | Unknown values are asked by record and field (P2, R1 to R40). But a typed -1 or 200000 hours is read as known and nothing is asked. |
| PRIN-012 | partial | **met** | test_f1_context.py::test_stem_without_opt_asks_whether_the_person_held_opt passes |
| PRIN-013 | partial | **met** | the test_f1_context property passes, and P4 asserts cannot_tell whenever a gap is open |
| PRIN-025 | met | met | test_verdict.py, including the point 37 prefixes |
| DEC-D04-003 | met | met | named tests pass; compute decides through verdict.decide |
| DEC-D34-002 | met | met | test_empty_case_cannot_tell; the not_sure judgement stays |
| DEC-D41-001 | met | met | named tests pass, plus P1w |
| DEC-D59-002 | not_started | **partial** | The verdict waits (test_typed_dates.py). But an unchecked typed date is still used and shown as known. |
| IMPL-027 | met | met | the three named tests pass |
| BACK-006 | met | met | named tests pass, plus span_order (R20) |
| BACK-009 | met | met | the named test passes |
| BACK-013 | partial | partial | H-1B, O-1 and EB-1A compute nothing |
| BACK-015 | partial | partial | Span longer than its rule, and gap or overlap, are still F-1 pack checks, not general ones |
| RBACK-092 | partial | partial | engine/dates.py add_years has no test at all |

Covered rows: 9 of 14 met (64%). Before this plan, 7 of 14 were met.

## Decisions since the last audit (D92 to D94)

The feed-pa audit covered decisions up to D91. I added eight rows:

| Row | Status | Why |
|---|---|---|
| DEC-D92-001: shown only when every fill agrees; a gap that changes nothing is never asked | met | P1 to P7, R40, and my two mutants killed |
| DEC-D92-002: not sure makes the verdict cannot_tell with the DSO named | met | probes R8 and R18 |
| DEC-D92-003: the DSO-question loop carries the answer back and closes on confirmation | not_started | no loop exists; drafts.ts only drafts the email |
| DEC-D92-004: lists not stated whole withhold; onboarding asks "any others" | partial | The engine part passes. Onboarding's "Is that all the CPT and OPT for <program>?" states only `authorization:<program>`, which point 14 no longer counts as the whole list. I read this in the code; I did not walk it through the screen. |
| DEC-D92-005: a trip with no return date is asked | met | pack and test_when_absent; probe |
| DEC-D93-001: unranked levels give cannot_tell with the DSO named | met | test_rulepack and probe |
| DEC-D93-002: a check may read a product setting, and its reason says so | partial | No test names program.opt_start_not_too_early. The "Duly's setting" words are only a pack note. |
| DEC-D94-001: an empty petition start is asked; the step back is withheld | met | test_when_absent; test_fix8 twin G |

## Drift (20 met rows drawn at random, seed 20261002)

The rows drawn: PLAN03-018, PLAN10-012, CHECK-021, PLAN11-023, IMPL-027, DEC-D81-001, RBACK-019,
IMPL-002, HOME-001, PLAN02-019, PLAN08-023, BOUND-022, DEC-D35-001, PLAN08-005, PLAN00-011,
RBACK-081, PLAN01-006, WB00-004, RBACK-114 and DEC-D33-001.

- Every evidence file exists.
- These tests passed: contrast.test.ts, checklists.test.ts, App.test.tsx (145 web tests),
  desktop about.test.ts, test_boundary_evals.py, test_engine_literals.py and the engine suite.
- Checked by reading: HOME-001 (.date-line is 12px, ink-2), PLAN01-006 (TanStack in
  web/package.json), RBACK-114 (max_retries_per_task 3), PLAN11-023 (postgres in compose).
  CHECK-021's checklist footer drops "Records, not legal advice". The app footer carries
  "not legal advice" (App.tsx:159, tested), under design F7, so the row stays met.
- Not re-run: PLAN10-012 (make prove-gates), DEC-D81-001 (needs Unix sockets),
  PLAN08-005, RBACK-081 and PLAN08-023 (need the jail).
- No status changed. The seed is the one the feed-pa audit used, so this sample overlaps
  with theirs. The next audit should use a new seed.

## Every status change

- PRIN-012: partial to met.
- PRIN-013: partial to met.
- DEC-D59-002: not_started to partial.
- New rows: DEC-D92-001, -002, -005, DEC-D93-001 and DEC-D94-001 are met; DEC-D92-004 and
  DEC-D93-002 are partial; DEC-D92-003 is not_started.
- Notes updated on the 11 other covered rows (RBACK-092 in research-backend-market.json, the
  rest in founder-decisions.json). Their status did not change.

## Findings

1. **A number no person could hold is read as known and never asked.** Hours of -1 count as
   no job (121 days, limit day 2026-08-29); 200000 count as full-time work. Points 42 and 64
   say such a value is "read and asked, not refused". Point 41 says any finite number is
   known. The SPEC contradicts itself here, and the engine follows point 41. This is for the
   founder (see disputes).
2. **Point 43 says `NUMBER_FIELDS` goes. It is still in web/src/lib/records.ts:92.** It turns
   a typed numeral in hours_per_week into a number, and sends every other value as typed. That
   change is needed, because R8 makes the string "40" unreadable. Still, it is not what the
   point's text says.
3. **An unranked level is asked as "undecided".** For a person who entered professional, the
   question's state is undecided and the reason is p1.level.not_sure. The screen's
   undecidedLine would then say "You said you were not sure about" a level they did enter.
4. **Onboarding's per-program "That's all" no longer states the list whole** (DEC-D92-004).
5. The reviewer's notes stand. U22 and U24 have no property, and the part-time pre-completion
   OPT months count is always withheld.
6. Carried from D68 and seen again: `make lane` (Makefile:185) and
   .claude/agents/skill-curator.md are still in the repository.

## Scope

- Register: 2497 rows. Of the 2135 the first version must hold, 445 are met, which is 21%
  (438 of 2127 at the last audit).
- Engine rows: 79 of 174 met (45%).
- This plan named 14 rows, 0.7% of the first version. 9 of them are met.
- D47 asks for every case and every category. This plan makes the F-1 engine sound about what
  it does not know. Nothing is computed for H-1B, O-1 or EB-1A, and the law-change feed shown
  to a person is at 3%.

## The ten largest gaps (not started, by document and kind)

1. WorkBook screens and design (design-screens, workbook): 208 rows.
2. WorkBook handoff (workbook): 172 rows.
3. Design screens, other design: 37 rows.
4. Email and loops (security-email-loops, email): 37 rows.
5. Security (security-email-loops): 35 rows.
6. Legal in the handoff: 30 rows.
7. Ops in the core plan: 29 rows.
8. Product rows in the handoff: 28 rows.
9. Product rows in the founder's decisions: 26 rows. These include the Loop of D75, so the
   DSO-question loop of D92 is not built.
10. Privacy in the compliance research: 26 rows.

By kind: privacy 2%, email 2%, WorkBook 1%, updates 3%, security 10% met.

## Instructions seen in data

None of the files I read told me to do anything.
