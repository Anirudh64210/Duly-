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
