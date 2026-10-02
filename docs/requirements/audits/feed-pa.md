# Audit: FEED-PA (plan-feed-pa.yaml and plan-feed-pa-fix.yaml)

Auditor: L-audit, run l-audit-9a4aa22c50, 2026-10-02 UTC. I built none of this work. Commit audited: b8368f6 (lane/L-audit/l-audit-9a4aa22c50). It holds L-content 8dda35c, L-pipeline 467e88f and the L-review re-review 5074184 (APPROVE).

FEED-PA is SPEC-FEED point 55. It bridges the 2026-10-06 cliff by moving checked_on to 2026-10-02 where the fetch of that day backs it. It also drafts the appeal as an update. The fix plan answers the review's VETO, under points 28, 29 and 55. The SPEC's Covers list names 24 rows for all of SPEC-FEED, not for FEED-PA alone. I audited all 24 rows, and I say which ones FEED-PA touched.

## What I ran

| Command | Result |
|---|---|
| `uv run python -m tools.sources.verify rulepacks` | exit 0, 4 packs, every quote found |
| `uv run python -m tools.sources.plain rulepacks --require f1` | exit 0 |
| `uv run python -m tools.sources.recheck --check rulepacks/f1-us/v2026.09` | exit 0 |
| `load_all()`, F-1 `rules_checked_on` | 2026-10-02 |
| `uv run python -m tools.copy_lint.lint` | clean |
| `grep -rlq 26-2112 pipeline/drafts` | exit 0 |
| `uv run pytest tests/unit/engine tests/unit/pipeline tests/unit/tools/test_recheck.py` | 1350 passed |
| `TMPDIR/aud/draft.py`: the draft against contracts/update.schema.json with a FormatChecker; `publish_blockers`; each claim's quote looked up in the file whose sha256 it names | 0 schema errors; blockers independent_check_not_passed, refutation_not_survived, not_approved_in_ops; 5 of 5 quotes found |
| Docket listing `sources/recheck-2026-10-02/courtlistener-docket-74661796-entries-2026-09-28.json` read entry by entry | 20 of 114 entries (page one), newest first, ECF 55 back to 42; every entry after ECF 51 is on the page; no entry has the word stay |
| Mutant 1, scratch copy: one quote of a rule on sits-f1-opt-2026-10-02.html changed to text in no copy | recheck --check exit 0 (it relies on verify for a copy found the same by sha256); verify reports "quote not found". The done command runs both, so it is caught. |
| Mutant 2, scratch copy: ds_2012 checked_on moved to 2026-10-03 | recheck --check exit 1, "has no fresh fetch ... on or after it" |
| Drift tests: test_boundary_evals.py, test_compute.py, test_ops_refuses_any_other_address, test_an_agent_can_escalate_and_is_not_asked_again | 106 passed |
| web `npx vitest run src/design/contrast.test.ts` | 68 passed |
| `tests/unit/tools/test_phase.py -k seed_plan_becomes` | failed: `sandbox-exec: sandbox_apply: Operation not permitted`. The jail cannot nest here, so this proves nothing either way. |
| `uv run python -m tools.requirements.register build` and `check` | 2489 requirements, whole |

Not run: make test as a whole, make desktop-package, the founder's step on 2026-10-07 (Plan shows dates on the installed app), the socket tests.

## The factory's claims, checked

- **The plans' done commands:** I ran each one, and each passes.
- **The review's claims hold:**
  - The draft validates.
  - Nothing is in pipeline/published/, because the folder does not exist.
  - 106 source blocks say 2026-10-02. That is 104 parameters and 2 regimes, which matches CHANGELOG.md.
  - The regime note gives the fetch times 06:09Z and 06:25Z, and says the 12:00 PM conference of ECF 52 is not covered.
  - The notes on the US Code copies say 2024 Edition, current through 2025-01-06.
- **What the draft says rests on its sources:**
  - ECF 53, 54 and 55 on 2026-09-30, and USCA case 26-2112, are in the saved listing.
  - The claim "no entry matched" for stay is true of the saved page.
  - That page holds every entry after ECF 51.
- **Small faults the review already named, still there:**
  - Claim 0 says ECF 51 enjoins the rule. That fact is not in its Federal Register source; it is carried by claim 4.
  - Plain holds numbers that no claim quote holds: 1:26-cv-13799, 2026-14439, 50 and 51.
  - The draft does not say the fetch came before the 12:00 PM conference. Only the pack note says so.
  - The pack note says "in Boston". ECF 52 says only "Courtroom 1", so "in Boston" is a reading, not the docket's own words.
- **Not a fault, but it reads like one:** the listing fetched on 2026-10-02 keeps the old file name `...-2026-09-28.json`. SOURCES.md says so.
- **SOURCES.md is partly wrong:** it calls that listing "named by no rule". That is true of the source fields, but the regime note names it.
- **Done command:** point 55's own done command asks for rules_checked_on >= 2026-10-01, and the plan asks for >= 2026-10-02. Both hold.

## Rows named by SPEC-FEED Covers (24)

FEED-PA touched 12 of them. One status changed:

- **DEC-D02-007**, every update carries citations: partial to met.
  - The schema requires source_url, snapshot_sha256 and quote on every claim.
  - tests/unit/pipeline/test_update_files.py validates every file in pipeline/drafts and pipeline/published, and it passed.
  - The one update that exists cites all 5 claims. I found each quote.
  - Not proven: the device check of point 29 is not built.

These 11 kept their status, and their notes are updated with what I ran:

- **Partly built:** IMPL-033, DEC-D02-010, IMPL-021, DEC-D02-005, DEC-D02-003, DEC-D02-006, DEC-D22-001 and DEC-D01-001.
  - IMPL-033 stays partly built because the schema still allows a signal source and point 29 is not built.
  - DEC-D02-010: the appeal is recorded by hand, in a note and in the draft's history. The regime has no history field.
  - IMPL-021: the docket was fetched once, by hand, page one only. The First Circuit docket was not read.
- **Met, re-proved:** PRIN-005, IMPL-027 and DEC-D02-008.

The other 12 rows are untouched and not started: DEC-D02-001, DEC-D22-003, DEC-D47-004, PRIN-019, PRIN-020, PRIN-021, BOUND-005, BOUND-044, PLAN01-003, PLAN01-046, UPD-015 and UPD-017.

**The 24 rows now stand at 4 met, 8 partly built and 12 not started.** SPEC-FEED Covers says "3 are met today". It is now 4. The SPEC is not mine to edit.

## Decisions since the last audit (D63 to D91)

The last audit stopped at D62. I added one row for each decision from D63 to D91, except D77, which D79 replaces (28 rows). I also moved DEC-D44-001 from partial to superseded, because D68 replaces D44.

- **Met (4):**
  - D67: factory/config.yaml health_probe.
  - D81: socket engine, fuses, signing script.
  - D85: ad hoc or self-made signing.
  - D87: appId co.tryduly.desktop.
- **Partly built (8):**
  - D66: the setting checkin.petition_days exists, and no code reads it.
  - D68: not true of the repository. .claude/LESSONS/, proposals/, the skill-curator agent in .claude/agents and factory/agents, the Stop hook and `make lane` are all still here. CLAUDE.md still names make lane.
  - D71: no factory/project.yaml.
  - D76: in BOUNDARY.md, not in code.
  - D79: a provider name only.
  - D83: Electron, no Expo.
  - D84: no LICENSE, no README promise.
  - D89: cap-gap, travel and documents are not built.
- **Not started (16):** D63, D64, D65, D69, D70, D72, D73, D74, D75, D78, D80, D82, D86, D88, D90 and D91.
  - D65 matters here. Staleness is still whole-pack, so on 2026-10-10 every F-1 verdict turns Can't tell yet again, unless a new fetch backs the rules.
  - D88: the feed itself does not exist. FEED-PA moved one date by hand.

## Drift (20 met rows drawn at random, seed 20261002)

The rows: PLAN03-018, PLAN12-010, CHECK-021, PLAN11-036, IMPL-049, PLAN07-006, RBACK-060, IMPL-004, HOME-001, PLAN02-042, PLAN08-029, BOUND-024, DEC-D36-001, PLAN08-011, PLAN01-010, RBACK-089, PLAN01-017, WB05-004, RBACK-124 and DEC-D34-001.

- **18 still hold.** I read each file named and ran the tests above.
- **RBACK-124** holds with new evidence. memory.py now scopes failure rows by lane in for_prompt.
- **PLAN11-036** moves from met to superseded. The lane lesson files are gone, and memory.py says prose lessons are not handed to agents (D68).
- **RBACK-060** stays met, but it was not proven here: its test cannot run in this sandbox.

## Every status change

| Row | Old | New | What I ran or read |
|---|---|---|---|
| DEC-D02-007 | partial | met | schema validation of the draft, quote lookup, test_update_files.py |
| DEC-D44-001 | partial | superseded | DECISIONS.md D68; tools/factory/memory.py |
| PLAN11-036 | met | superseded | ls .claude/LESSONS; memory.py docstring |
| DEC-D63-001 to DEC-D91-001 (28 rows, no D77) | new | as listed above | the files named in each row |

## Scope

- **Share of the first version met:** 438 of 2127 (21%), up from 434 of 2103 at the last audit. The 28 new decision rows add to the total.
- **What FEED-PA covered:** 12 of the 24 rows SPEC-FEED names, which is 0.6% of 2127. It added nothing new to the product. It kept the F-1 dates showing until about 2026-10-09, and it drafted one update that no one can see yet.
- **Against D47** ("any student ... sees where they stand, what comes next, and the latest verified changes in the law, for every case and every category"):
  - Only F-1 has rules.
  - The latest changes reach no one: no feed, no updates screen, no approval step.
  - The F-1 freshness depends on someone fetching by hand each week.

## The ten largest gaps

1. WorkBook screens and flows (workbook-handoff 03): 179 rows not started.
2. WorkBook context (workbook-handoff 01): 97 not started.
3. Security, privacy and encryption (duly-plan 05): 69 not started.
4. WorkBook data and pipeline (workbook-handoff 04): 69 not started.
5. Compliance and system design research (RCOMP): 82 not started.
6. WorkBook module plan (duly-plan 04): 54 not started.
7. Build sequence (duly-plan 10): 52 not started.
8. Email system (duly-plan 06): 44 not started.
9. **The feed and updates (D88, D90, D91, PRIN-019 to 021, DEC-D02-001, DEC-D22-003, DEC-D47-004, UPD rows).** Nothing reaches a device, and the 7-day cliff comes back each week.
10. **Other categories and the rest of F-1 (D89).** H-1B, O-1 and EB-1A have no rules. Cap-gap (D63 to D66), travel and documents (D54, D55) are not built.
