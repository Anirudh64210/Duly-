# Review: FEED-PA after the fix round (SPEC-FEED points 28, 29 and 55)

Reviewed commit: 170889f (founder c25d1b9; L-pipeline 467e88f merged at cf0e195; L-content 8dda35c merged at 170889f). The diff is b604402..170889f.
Run: l-review-33527354a3. I did not write any of it. The first review is the VETO at a8cd965, which this file replaces.

## What I ran

Output is in `TMPDIR/fpa2/gates.txt`.

- `uv run python -m tools.sources.verify rulepacks`: exit 0, every quote found.
- `uv run python -m tools.sources.plain rulepacks --require f1`: exit 0.
- `uv run python -m tools.sources.recheck --check rulepacks/f1-us/v2026.09`: exit 0.
- `uv run python -m tools.copy_lint.lint` and the same on `pipeline/drafts`: clean.
- `uv run pytest tests/unit/engine tests/unit/pipeline tests/unit/tools/test_recheck.py -q`: all passed.
- `load_all()` F-1 `rules_checked_on`: 2026-10-02.

## Each first-review finding

1. **Draft shape (blocking, SPEC-FEED 28 and 29): fixed.**
   - `TMPDIR/fpa2/draft.py` validates the draft with `Draft202012Validator` and a `FormatChecker`, and finds 0 errors.
   - `publish_blockers` returns only `independent_check_not_passed`, `refutation_not_survived` and `not_approved_in_ops`, so the update stays a draft. Nothing is in `pipeline/published/`.
   - For each claim, I found the snapshot by its sha256 under `rulepacks/` and looked for the quote with `verify.plain`. All 5 quotes are found, in the FR XML, the saved docket listing (claims 1 to 3) and the ECF 51 text.
   - `history` is `{on 2026-09-30, legal_status appealed, note, source_url}`, as the plan asked.
2. **"The order remains in force" (wording): fixed.**
   - That sentence is gone. Plain now says the district court listing fetched on October 2, 2026 shows no entry that stays the order, and that the First Circuit docket was not read.
   - The rule is now "would change".
3. **US Code 2024 Edition (never assumes): fixed.**
   - The notes of `capgap.fiscal_year_start_month_day` (parameters.yaml:532) and both `calendar.federal_holidays_law` rows (:612, :901) now say:
     - the copy is the govinfo 2024 Edition, current through 2025-01-06;
     - uscode.house.gov served a maintenance page;
     - amendments after 2025-01-06 are not covered.
   - I checked the date in the saved copies. Both govinfo files carry `currentthrough:20250106` in their header comment.
   - Both copies came back the same at 2026-10-02T06:25:56Z (recheck rows `same: true`).
4. **Docket fetched before the hearing (never assumes): fixed in the pack.**
   - The regime note (parameters.yaml:22) gives the fetch times and says the 12:00 PM conference (ECF 52) is not covered.
   - Fetch times: the recheck rows show 06:09:39Z and 06:25:56Z, both with sha `15543122…`.
   - ECF 52 reads "Status Conference set for 10/2/2026 12:00 PM in Courtroom 1". 12:00 EDT is 16:00Z, as the note says.
   - The draft itself does not say this (finding 3 below).
5. **D90 missing: fixed.** D90 is now in DECISIONS.md and accepts the recommendations of points 68 to 86, which includes point 69 (the appeal). The pack's citation now resolves.
6. **Run-on sentences: fixed** in the regime note and SOURCES.md:45.
7. **No schema test for drafts: fixed** by `tests/unit/pipeline/test_update_files.py`.
   - Mutant: rename `headline` to `title` in the draft. The test fails.
   - It checks no formats (note 4 below).
8. **recheck backs a rule by sha with no quote check: fixed** at `tools/sources/recheck.py:186`.
   - Mutant: on a scratch copy, I pointed `calendar.federal_holidays_law` at the uscode.house.gov maintenance copy (`sources/recheck-2026-10-02/usc-5-6103-2026-09-28.htm`) with that copy's sha256. At b604402 this passed. Now `recheck --check` exits 1 with "calendar.federal_holidays_law: checked_on 2026-10-02 has no fresh fetch of usc-5-6103-2026-09-28.htm on or after it".
   - Mutant: revert line 186 to `Fetched(day, None)`. The new test `test_a_changed_copy_found_by_its_bytes_still_needs_the_quote` fails.
   - The other two parts of old note 8 are still open (note 5 below).

## Trying hardest: a checked_on with no fetch behind it

- I diffed parameters.yaml leaf by leaf between b604402 and 170889f with `TMPDIR/fpa/cmp.py`. No leaf changed except three rule notes and the regime note: no value, checked_on, snapshot, sha, quote, plain, status or tag.
- All 106 source blocks say 2026-10-02.
- For every block, the sha of the named snapshot equals `snapshot_sha256`. For 101 blocks the quote is found by my own normalizer. The other 5 differ only in how my normalizer handles entities, and verify finds those quotes.
- Recheck now needs the quote for every changed copy, including one found by sha. A same row found by sha needs no quote, but those bytes equal the original snapshot, and verify checks it.
- I found no checked_on without a fetch that backs it.

## Trying hardest: Side B

- I ran `tools.sources.plain.SECOND_PERSON` and `assistant.boundary` `_CONCLUSION`, `_JUDGEMENT`, `_MODAL` and `instructs()` over:
  - the headline, the plain text, every claim text and the history note;
  - the regime note and the three new rule notes.
- The draft gets no hit. In the rule notes, `instructs()` flags only "Start date is the" and "Start date: the 1983", which were already there. They are labels, not instructions.
- By hand: no word is addressed to the student, nothing tells anyone what to do, nothing predicts the appeal, and nothing says what the rule means for a person.

## Findings

1. **should_fix (sourced, kind spec_gap). Numbers in `plain` that no claim's quote holds.**
   - File: `pipeline/drafts/2026-10-02-presidents-alliance-appeal.json:4`.
   - Input: the numbers in headline and plain, compared with the five quotes.
   - What happens: 2026, 30, 14, 17, 51, 1:26-cv-13799 and 2026-14439 are in no quote. `contracts/update.schema.json` describes `plain` as "Every number in it appears in a claim's quote."
   - I checked each one by hand. Each is right and is in a saved copy: the dates are the listing's `entry_date_filed`, the case number is in the ECF 51 header, and FR Doc 2026-14439 is in the FR XML. So nothing shown is wrong.
   - It is not blocking: that sentence is a schema `description`, not something the schema validates, and neither point 28 nor point 29 checks it. But the draft does not keep the contract's own rule.
   - Fix: choose quotes that carry the numbers (for example, the ECF 51 caption line with the case number and date), or drop numbers from plain that no quote holds.
2. **should_fix (wording). Claim 0 states something its source cannot show.**
   - File: same file, line 10.
   - Input: claim 0's text ends "The order of September 14, 2026 (ECF 51) enjoins its implementation."
   - What happens: the claim's quote and snapshot are the Federal Register rule of July 17, which says nothing about the order. The fact is right and claim 4 carries it, from the order. Claim 0 should end at the rule.
3. **should_fix (never assumes, kind other). The draft does not say that its status rests on a fetch made before the hearing.**
   - File: same file, lines 4 and 6.
   - Input: `status_as_of: "2026-10-02"` and the plain text "fetched on October 2, 2026".
   - What happens: the pack's regime note now says the listing was fetched at 06:09Z, before the 12:00 PM conference (ECF 52). The draft a person would read leaves this out. The fact is kept only in `pipeline/PROGRESS.md`. The plan for L-pipeline did not ask for it, so this is not a lane failure.
   - Fix: add the fetch time to the plain text, or fetch again before the founder approves it.
4. **note (missing_negative_test). The new schema test does not check formats.**
   - File: `tests/unit/pipeline/test_update_files.py:22`.
   - Input: the draft's history `"on": "30 September 2026"`.
   - What happens: the test passes. `api/case_f1.py:50` and `engine/rulepack.py:85` pass `format_checker=FormatChecker()`, and this test does not.
   - The fix is a founder edit, since tests/ is not a lane's to edit. It is listed as a request.
5. **note (missing_negative_test). Two limits of `recheck --check` are still there, in founder tooling.**
   - `check()` still never reads `row["ecfr"]`, so the versions condition of point 55 is still checked only by hand. I checked it by hand in the first review.
   - The docket row still saves only the first page (20 of 114, with `next` set). The claim 3 words "which holds every entry filed after entry 51" are true for this listing, which is sorted newest first.
6. **note (wording). Two readings written like plain facts.**
   - The listing is CourtListener's RECAP copy, but the draft calls it "the district court docket listing". Its `source_url` is on courtlistener.com, so the source is traceable, but the words read as the court's own PACER docket.
   - The regime note says "12:00 PM in Boston", but ECF 52 says only "Courtroom 1". Boston is right for this judge, but it is a reading.
7. **note (overbuilt). `Fetched.sha256` is never read.**
   - File: `tools/sources/recheck.py:168`. It is set at :180 and never read. It is founder code from e48886e, not this diff.
   - Fix: drop the field.

## Overbuilding

- The lanes' diff overbuilds nothing. It changes notes, the draft's shape, one line in recheck, one test file and two DECISIONS rows.
- The only extra I found is the unused field in note 7.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 4 | The draft validates (with formats) and the pack notes are true against the saved copies and the recheck rows. Claim 0 carries a fact from another source (finding 2). |
| sourced | 4 | Every quote is found and every sha matches, and D90 now exists. Seven numbers in plain are in no claim quote, though each is right in a saved copy (finding 1). |
| never_assumes | 4 | The pack now says what each date rests on. The draft's status_as_of does not say that it comes from before the hearing (finding 3). |
| inside_the_boundary | 5 | Side B patterns and a reading by hand over every new string: nothing addresses, instructs, concludes or predicts. |
| secure | 5 | Data and one line of a tool changed. The maintenance-page mutant that passed recheck before now fails. I found no input that gets a changed copy past recheck. |
| tested | 4 | The new tests fail when their fixes are reverted. The schema test misses format errors (note 4), and recheck still does not check the eCFR condition (note 5). |

Mean 4.33. Every line is at least 4, the mean is at least 4.3, and there is no blocking finding.

APPROVE
