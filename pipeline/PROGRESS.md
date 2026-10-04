# L-pipeline progress

## 2026-10-01, run l-pipeline-380245b29f, attempt 1 (SPEC-FEED point 55, FEED-PA)

- Read SPEC-FEED point 55, the law-update-claim skill, pipeline/graph.py, and the saved docket listing
  rulepacks/f1-us/v2026.09/sources/recheck-2026-10-02/courtlistener-docket-74661796-entries-2026-09-28.json.
  Its sha256 (15543122...2834bec) equals the sha256 row in recheck-2026-10-02.json.
- Wrote pipeline/drafts/2026-10-02-presidents-alliance-appeal.json in the shape publish_blockers reads:
  5 claims (FR 2026-14439 scope; ECF 53 notice of appeal; ECF 55 USCA case 26-2112; ECF 51 entry;
  ECF 51 order text), legal_status appealed, status_as_of 2026-10-02, one absence check (no stay).
  checks and approval left false: it stays a draft. Nothing written to pipeline/published/.
- Verified with an ad hoc script: every snapshot hash matches its saved copy, every quote is found
  (whitespace collapsed); publish_blockers returns independent_check_not_passed,
  refutation_not_survived, not_approved_in_ops.
- uv run python -m tools.copy_lint.lint pipeline/drafts: "copy lint: clean".
- Done command: 15 passed, exit 0.

## 2026-10-01, run l-pipeline-52416fbbd8, attempt 1 (FEED-PA review findings 1 and 2)

- Reshaped pipeline/drafts/2026-10-02-presidents-alliance-appeal.json to contracts/update.schema.json
  (SPEC-FEED points 28, 29): title became headline, body became plain, categories ["f1"], history
  [{on 2026-09-30, legal_status appealed, note, source_url}]. Dropped draft, visa, regime,
  status_detail, absence_checks and the per-claim saved_copy, docket_entry, entry_date_filed,
  fetched_at. Entry numbers and filing dates now sit in the claim text. Added source_type
  federal_register (claim 0) and court_order (claim 4). The docket listing claims have no
  source_type, because none of the five types fits a docket listing.
- Wording (finding 2): removed "The order remains in force." Plain now says the district court
  docket listing fetched on October 2, 2026 shows no entry that stays the order, and that the First
  Circuit docket was not read. The rule sentence became "would change" because the rule is enjoined.
- Per-claim extras that were moved out of the draft:
  - Saved copies: claim 0 rulepacks/f1-us/v2026.09/sources/fr-2026-14439.xml. Claims 1 to 3
    sources/recheck-2026-10-02/courtlistener-docket-74661796-entries-2026-09-28.json, fetched
    2026-10-02T06:09:39+00:00. Claim 4 sources/mad-1-26-cv-13799-doc51-order.txt.
  - Absence check (no stay): searched the description and short_description of every entry in the
    saved listing for "stay", case insensitive, and nothing matched. The listing covers the first
    page, newest first: 20 of 114 entries, filed 2026-08-31 to 2026-09-30. That includes every
    entry after ECF 51. Not checked: the First Circuit docket for 26-2112. The listing was fetched
    before the status conference set for 2026-10-02 12:00 PM (ECF 52), so any order from it is
    not in the listing.
- Checked with an ad hoc script: every snapshot sha256 matches its saved copy and every quote is
  found (whitespace collapsed). No text matches tools.sources.plain.SECOND_PERSON. publish_blockers
  returns independent_check_not_passed, refutation_not_survived and not_approved_in_ops, so it
  stays a draft. Copy lint: clean.
- Done command `uv run pytest tests/unit/pipeline -q`: 17 passed, exit 0.

## 2026-10-03, run l-pipeline-87dc9561dd, attempt 1 (SPEC-W2 point 51, the prototype's articles)

- The orchestrator changed point 51 for this lane: the three prototype articles
  (specs/ui-2/prototype/data.js, updates.items court, dc-ruling, fixed-admission-rule) go to
  pipeline/drafts/, never pipeline/published/, because no lane can record the founder's approval.
- Wrote three drafts in the shape of contracts/update.schema.json, each with checks and approval
  left false:
  - 2026-09-14-presidents-alliance-order.json (court): ECF 51 order text (sha c211815e...,
    sources/mad-1-26-cv-13799-doc51-order.txt) and the docket listing saved 2026-10-03
    (sha 31747ff8..., sources/recheck-2026-10-03/courtlistener-docket-74661796-entries-2026-09-28.json):
    ECF 53 appeal, ECF 56 status conference of 2026-10-02 with a schedule due 2026-10-09.
    Absence check: "stay" in description and short_description of all 20 saved entries (filed
    2026-08-31 to 2026-10-02): no match. First Circuit docket 26-2112 not read.
  - 2026-09-14-trilleras-gomez-denial.json (dc-ruling): D.D.C. ECF 14 opinion text (sha d87bc7c0...,
    sources/dcd-1-26-cv-02364-doc14-opinion.txt), plus the ECF 51 postponement.
  - 2026-07-17-fixed-admission-final-rule.json (fixed-admission-rule): FR Doc. 2026-14439 (sha
    f9c196f7..., sources/fr-2026-14439.xml): fixed time period, program end date up to 4 years
    plus 30 days, 60 to 30 days to prepare to depart, effective date 2026-09-15; plus ECF 51.
- Left out of the drafts, because no quote in a saved copy carries them here: the prototype's
  "forYou", "affects" and "todo" lines (they speak to the student and say what to do, BOUNDARY.md);
  the 1978 history, the commenter tallies, the OPT application window and start date, the STEM OPT
  comparison, the "chaos and confusion" line (ECF 50), and the judges' findings on likelihood of
  success. No kind or stages field: matching to stages is not this lane's to assert.
- Checked with an ad hoc script ($TMPDIR/check_drafts.py, not committed): every snapshot sha256
  matches its saved copy; every quote is found (tags stripped, whitespace collapsed); each plain
  passes tools.sources.plain.problems as a "regime" text with the claims' quotes as grounds;
  publish_blockers returns independent_check_not_passed, refutation_not_survived,
  not_approved_in_ops for each. Headlines of the final rule and the D.D.C. drafts score reading
  grade 9.1 and 11.5 (no check requires it for headlines). The FEED-PA appeal draft's plain fails
  those plain checks (842 characters, 10 sentences, numbers not in quotes); left unchanged.
- Copy lint on pipeline/drafts: clean. Done command `uv run pytest tests/unit/pipeline -q`:
  20 passed, exit 0.

## 2026-10-03, run l-pipeline-149a798c39, attempt 1 (DECISIONS.md D95 (2), SPEC-FEED point 35)

- engine/updates.py already holds publish_blockers, copied unchanged from pipeline/graph.py
  (read both side by side: same body). pipeline/graph.py now imports it from engine.updates,
  lists it in __all__ as a re-export, and no longer defines it. _gate still calls it.
  tests/unit/pipeline/test_graph.py imports it from pipeline.graph unchanged.
- Not built: no shim module, no wrapper function, no change to the drafts or the stages.
- Done command `uv run pytest tests/unit/pipeline -q && uv run mypy && uv run ruff check pipeline
  && uv run ruff format --check pipeline`: 20 passed; mypy no issues in 74 files; ruff all checks
  passed; 3 files already formatted. Exit 0.
