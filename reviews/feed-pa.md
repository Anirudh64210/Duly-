# Review: FEED-PA (SPEC-FEED point 55)

Reviewed commit: b604402 (merge of L-content 4c9142d onto e48886e; L-pipeline dfa6528 merged at eeb3590).
Run: l-review-ce6e9b0757. Reviewer did not write any of it.

## What I ran

- `uv run python -m tools.sources.verify rulepacks`: every quote found, exit 0.
- `uv run python -m tools.sources.plain rulepacks --require f1`: exit 0.
- `uv run python -m tools.sources.recheck --check rulepacks/f1-us/v2026.09`: exit 0.
- `load_all()` F-1 `rules_checked_on`: 2026-10-02.
- `uv run pytest tests/unit/engine tests/unit/tools/test_recheck.py tests/unit/pipeline -q`: all passed.
- `uv run python -m tools.copy_lint.lint pipeline/drafts`: clean.
- jsonschema Draft 2020-12, `contracts/update.schema.json` against the draft: 9 errors (finding 1).

## By hand

Script `TMPDIR/fpa/cmp.py` walks every leaf of parameters.yaml at e48886e and at b604402.

- **No number changed.** Leaf by leaf, the only differences are checked_on, notes, and the snapshot, url and citation of the ten rows that were moved to another copy. No value, unit, quote, plain, legal_status, operative or tag changed.
- **Every checked_on that moved has a backing fetch.** 106 source blocks (104 parameters, 2 regimes) all say 2026-10-02. I checked each one myself, not with recheck: the snapshot's sha256 equals snapshot_sha256, and the quote is in that snapshot under `verify.plain`. I matched each snapshot to a status-200 row in recheck-2026-10-02.json:
  - eCFR 2026-09-14 and 2026-09-15, the five FR documents, the three court PDFs and the SEVP PDF all came back the same (the `.txt` extracts rest on their PDFs).
  - sits-f1-opt-2026-10-02.html, govinfo 5 USC 6103 and govinfo 31 USC 1102 came back the same in the second fetch (06:25:56Z).
  - `cmp` shows the three copies in sources/ are byte for byte the copies in sources/recheck-2026-10-02/.
  - The SITS `<main>` text, with tags stripped, is the same length and hash in the 09-28 and 10-02 copies.
- **eCFR versions condition.** Paragraph (f), from `<P>(f)` to `<P>(g)`, is identical in the 2026-09-15 and 2026-09-30 texts (87,532 characters). The whole-file diff is 22 lines, all in (h)(6)(xvi), on H-2B. So the pack's claim is true.
- **Docket.** The listing saved on 2026-10-02 shows:
  - ECF 53, a notice of appeal "as to 50 Memorandum & ORDER", 2026-09-30
  - ECF 54, the record sent to the USCA
  - ECF 55, "USCA Case Number 26-2112"
  - no entry containing "stay" after ECF 51

  The regime note, SOURCES.md claim 2 and the draft all match this.
- **Regime status.** fixed_admission_2026 is still `enjoined`, operative is still false and the tag is unchanged. Only checked_on moved. The founder's sign-off is in founder commit e48886e (plan-feed-pa.yaml) and follows SPEC point 69.
- **Mutants on a scratch copy.**
  - checked_on moved to 2026-10-03: recheck --check refuses it.
  - A rule pointed at the uscode.house.gov "Under Maintenance" copy with that copy's sha256: recheck --check passes, and verify refuses it with "quote not found". The pack is safe, but recheck alone is not (note 8).
- **Update draft wording.**
  - No word addresses the student, no word tells anyone what to do, and there is no prediction. A grep for you, your, should, must, need to, advise and recommend finds nothing, and the copy lint is clean.
  - Nothing is in pipeline/published/.

## Findings

1. **blocking (SPEC-FEED point 28, point 55; contracts/update.schema.json). The appeal draft is not an update in the contract's shape.**
   - File: `pipeline/drafts/2026-10-02-presidents-alliance-appeal.json:6`.
   - Input: validate the file against `contracts/update.schema.json`.
   - What happens: 9 errors.
     - `headline`, `categories` and `history` are missing.
     - The top level has fields the schema does not allow: `title`, `body`, `draft`, `visa`, `regime`, `status_detail`, `absence_checks`.
     - Each claim has fields the schema does not allow: `saved_copy`, `docket_entry`, `entry_date_filed`, `fetched_at`.
   - Point 28 says every update "follows contracts/update.schema.json" and is drafted in pipeline/drafts/. Point 29 says the device returns an update only if it validates against that schema.
   - So if the founder approves this text as written, it can never be shown. `publish_blockers` would still return nothing once checks and approval are set, because it never reads the shape.
   - The fix: rename `title` to headline and `body` to plain. Add `categories: ["f1"]`. Put the appeal into `history` as `{on: 2026-09-30, legal_status: appealed, note, source_url}`. Move the per-claim extras and the absence check into the claim text or the PROGRESS log.
   - Kind: spec_gap.
2. **should_fix (wording). The draft states Duly's reading as fact, and the reading goes further than its source.**
   - File: same file, line 7.
   - Input: the sentence "The order remains in force."
   - What happens: the only basis is a search for "stay" in the district docket listing. The draft's own `absence_checks.not_checked` says the First Circuit docket for 26-2112 was not read, and that is where a stay pending appeal would be entered.
   - Suggested text: "The district court docket listing fetched on October 2, 2026 shows no entry that stays that order; the First Circuit docket was not read."
   - The same body also says "The final rule changes the admission period ..." in the present tense, about a rule that is enjoined. The regime's plain says "would set", which is accurate.
   - Kind: wording.
3. **should_fix (never assumes). checked_on 2026-10-02 rests on a copy of the U.S. Code that is current only through 2025-01-06.**
   - Files: `rulepacks/f1-us/v2026.09/parameters.yaml:599`, `:887`, `:519`.
   - Input: calendar.federal_holidays_law (both rows) and capgap.fiscal_year_start_month_day name the govinfo 2024 Edition. SOURCES.md:49 itself says it is current through 2025-01-06.
   - What happens: the date says the law was checked on 2026-10-02. Nothing in the fetch shows whether 5 USC 6103 was amended between 2025-01-06 and 2026-10-02. A new federal holiday would be missed, and the engine counts business days with this list.
   - It meets point 55's letter (the same bytes, the quote found), and the plan asked for it. But the gap should be stated on the rows themselves, or the uscode.house.gov prelim text fetched again when it is back, rather than left implied.
   - Kind: wrong_source.
4. **should_fix (never assumes). The docket was fetched before a hearing set for the same day.**
   - Input: ECF 52 in the saved listing: "Status Conference set for 10/2/2026 12:00 PM". The listing was fetched at 2026-10-02T06:09:39Z, which is 02:09 in Boston.
   - What happens: fixed_admission_2026 carries checked_on 2026-10-02, but any order from that conference is not in the listing the date rests on.
   - Fix: say so in the note, or fetch the listing again after the conference before the founder rebuilds the app.
   - Kind: other.
5. **should_fix (sourced). The pack cites "D90", which does not exist.**
   - Files: `parameters.yaml:22`, SOURCES.md claim 2, CHANGELOG.
   - Input: `grep -n D90 DECISIONS.md` finds nothing. DECISIONS.md ends at D89.
   - What happens: the founder's sign-off is real (plan-feed-pa.yaml, commit e48886e), but the decision it names cannot be found. The founder should add D90 to DECISIONS.md.
   - Kind: spec_gap.
6. **note (wording). Two run-on sentences in text a person can read.**
   - The regime note at parameters.yaml:22 has "the appeal is recorded here, The founder reviewed".
   - SOURCES.md:45 has "carries checked_on 2026-10-02, That is 94 parameters".
   - Kind: wording.
7. **note (missing_test). No test validates pipeline/drafts/*.json against contracts/update.schema.json.**
   - That is why finding 1 passed `tests/unit/pipeline`. This lane cannot edit tests/, so it is listed as a request.
   - Kind: missing_test.
8. **note (founder-owned tool, not this lane's diff). Three limits of recheck --check.**
   - In `tools/sources/recheck.py:185`, a fetch row's sha256 key backs any rule whose snapshot_sha256 equals it, with no quote check. That holds even when the row is a changed copy, such as the house.gov maintenance page. verify catches this today; recheck alone does not.
   - `--check` never reads `row["ecfr"]`, so point 55's versions-list condition is checked only by hand. I did that check above.
   - The docket row saves only the first page of results (20 of 114). Point 55 asks for "the full docket entry list". The entries are newest first, so no newer entry is missed here.
   - Kind: missing_negative_test.

## Overbuilding

None in the lanes' diff. The three files copied from sources/recheck-2026-10-02/ to sources/ repeat bytes already in the repository. The plan required them because a rule names a file in sources/ itself.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 3 | Pack: right on every input I tried. The update draft breaks point 28's schema (finding 1). |
| sourced | 4 | Every quote is in the copy it names and every hash matches. D90 is cited but does not exist (finding 5). |
| never_assumes | 4 | Findings 3 and 4: the 2024 Code edition and the fetch before the hearing are each read as current for 2026-10-02. |
| inside_the_boundary | 4 | Nothing is addressed to the student and nothing is advice. "The order remains in force" is a reading stated as fact (finding 2). |
| secure | 4 | The lanes changed only data. The founder's recheck tool can be passed by a sha match alone (note 8), and verify covers that. |
| tested | 3 | tests/unit/pipeline passes on a draft that fails the update contract (findings 1 and 7). |

Mean 3.67. correct and tested are below 4, and both rest on finding 1, which is blocking.

VETO
