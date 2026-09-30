# Review: product round 1, fix 9, and the round as a whole

Reviewer: L-review, run l-review-0cb32ada70, 2026-09-29. I started with no context and edited no code.

Scope: every merge since reviews/product-1-fix8.md (23234a4..c760b07). The product changes are the plain gate (tools/sources/plain.py: "U.S." and other abbreviations end no sentence, and a text longer than the contract allows is refused), the freeze tool's wording and argument order (tools/sources/plain_changes.py), their tests, and five plain texts in rulepacks/f1-us/v2026.09/parameters.yaml (point 66). The rest is the pack's CHANGELOG and PROGRESS, point 66 and plan-fix9. Checked against specs/product-1/SPEC-resolutions.md points 66, 58, 62 (and 65, 37), specs/plain-1/SPEC.md, PRINCIPLES.md and BOUNDARY.md. The commit reviewed is c760b07e26ea72f9a3b9699b17923508ca8b9222.

Api probes used TestClient with a FixedClock at 2026-09-30 01:00 UTC, time zone America/Los_Angeles, so today is 2026-09-29. "Answered in full" means each question was answered yes, with its own `about`, dated 2026-09-29, until none was left; `.earlier_at_this_level` and `.new_employer` were answered no. The probe scripts are under TMPDIR/r0cb and were not committed.

## What was run

| Check | Result |
|---|---|
| `uv run pytest tests/unit/engine tests/unit/api tests/unit/assistant tests/unit/support -q` | exit 0 |
| `uv run pytest tests/holdout -q` | exit 0 |
| `uv run pytest tests/unit/tools/test_plain.py tests/unit/tools/test_plain_changes.py -q` | 19 passed, exit 0 |
| `python -m tools.sources.plain_changes 23234a4` | the five rows of point 66 and no other; "no --allow given, so none was checked", exit 0 |
| the same with `--allow` and those five rows | "5 row(s) changed, each one allowed", exit 0 |
| the same with `--allow stem.min_hours_per_week#2016-05-10` only | refuses the other four, exit 1 |
| the same with `--allow` and no row | refuses all five, exit 1 |
| `python -m tools.sources.plain rulepacks --require f1` | "every plain text is general, calm, readable and grounded", exit 0 |
| `python -m tools.sources.verify rulepacks` | "4 pack(s) checked, every quote found" |
| `python -c "from engine.rulepack import load_all; load_all()"` | loads 4 packs |
| `python -m tools.gates.engine_literals` | "every number has a source" |
| `python tools/copy_lint/lint.py` | "copy lint: clean" |
| ruff and mypy on the two changed tools | clean |

Not run: `make test` as a whole, gates 3 and 6, web vitest (no web file changed since fix 7, where 302 passed), the stack, a browser.

## No other plain text changed

Against 23234a4, the commit reviews/product-1-fix8.md read, `plain_changes` names five rows, and they are the five that point 66 names. `git diff 23234a4..HEAD -- rulepacks/f1-us/v2026.09/parameters.yaml` changes five `plain:` lines and nothing else: no value, quote, note, plain_terms, derivation or date. No engine, api, web or contract file changed.

## The gate change

`_unabbreviated` writes "U.S." as "US" before counting sentences and words. The new test fails on the old splitter (`_sentences` did not exist, and the old count of the test sentence was 3). The length check matches contracts/rulepack.schema.json (320 for a rule, 480 for a regime). The freeze tool now refuses `--allow` given before the base (exit 2), and without `--allow` it says it checked nothing. Fix 8's note 3 and fix 7's note 3 are closed. One leak is left (note 4 below).

## The five rewritten texts beside their quotes and notes

Grades are given three ways. **Gate** is `plain.grade()`. **Hand A** uses dictionary syllables for every word and reads each abbreviation as the gate does, as one word of one syllable. **Hand B** reads the abbreviations aloud letter by letter (US 2, OPT 3, DSO 3, SEVP 4). The words and sentences are counted as the gate counts them. The sentence counts match the gate on all five. The syllable table is in TMPDIR/r0cb/hand.py (Hand B) and handA.py (Hand A). The gate's vowel-group count scores "situated" at 3, "area" at 2, "employer's" at 2 and "prior" at 1, where each has one syllable more.

| Row (line) | Sentences | Gate | Hand A | Hand B | Meaning |
|---|---|---|---|---|---|
| `stem.min_hours_per_week` (290) | 3 | 7.01 | 7.87 | 8.16 | passes |
| `stem.requires.accreditation` (613) | 3 | 8.63 | 8.37 | 8.63 | **drifts** (finding 1) |
| `stem.requires.previously_obtained_degree` (661) | 3 | 8.88 | 9.08 | 11.08 | **drifts** (finding 2) |
| `stem.requires.duties_hours_and_compensation` (741) | 3 | 8.85 | 9.86 | 10.87 | passes, note 3 |
| `stem.requires.employer_attests_no_replacement` (805) | 2 | 7.61 | 7.98 | 9.09 | passes |


**`stem.min_hours_per_week`.** "On a 24-month extension, practical training may not be less than 20 hours a week. Some time off is not counted. It is time off that follows the leave policies for the employer's similarly situated U.S. workers in the area of employment." The quote excludes "time off taken consistent with leave-related policies applicable to the employer's similarly situated U.S. workers in the area of employment". Nothing is added, and no limit is dropped. The terms "similarly situated U.S. workers" and "area of employment" are kept. **Passes.**

**`stem.requires.accreditation`.** "As Duly reads it, this is one of the things on the list that must be met. The degree is from a U.S. educational institution. At the time of application, the school is accredited by an agency that the Department of Education has recognized." The row's note says the closing words "may limit the accreditation, the recognition, or both, and the plain words keep that open". With the phrase moved to the front, it governs "is accredited", so the text now always times the accreditation to the application. The reading in which only the recognition is so timed is gone. The CHANGELOG says the phrase "may still bound either or both". It cannot bound the recognition alone. **Drifts** (finding 1).

**`stem.requires.previously_obtained_degree`.** "When the DSO recommends the student for a 24-month OPT extension, the degree it rests on may be older than that for post-completion OPT. If so, at that time it must be from an accredited and SEVP-certified U.S. educational institution and in a category on the STEM list. It must have been granted in the 10 years prior." "Category" is back, and the DSO recommends the student for the extension. Accreditation, SEVP certification and the list are timed to the recommendation. The last sentence names no point that the 10 years run back from. The quote says "within the 10 years preceding the date the DSO recommends the student for the 24-month OPT extension". Points 62 and 65 both name that end ("the ten years ending at the DSO's recommendation"; "granted in the 10 years before that day"). The CHANGELOG says "that day" was cut for length. **Drifts** (finding 2).

**`stem.requires.duties_hours_and_compensation`.** "During the 24-month OPT extension, the training has terms and conditions. These include duties, hours and compensation. They must be commensurate with those of the employer's similarly situated U.S. workers in the area of employment." It keeps all three terms. "They" most naturally means the terms and conditions, which is what the quote says, but a reader can take it as the three things just listed. **Passes**, with note 3.

**`stem.requires.employer_attests_no_replacement`.** "Duly reads this as one of the things the employer attests. The student on a STEM OPT extension will not replace a U.S. worker, whether full- or part-time, temporary or permanent." The reading is marked and the quote's four kinds of worker are kept. "this" now points forward to the next sentence, which is plain English. **Passes.**

## Fix 1's finding 3 (point 37), through the api

Case: program end 2025-05-15, master's, OPT recommended 2025-06-01, filed 2025-06-20, card from 2025-09-01, one period from 2025-09-01 to 2026-06-30, reported. `opt.complete_by` by hand is 2025-05-15 plus 14 months, which is 2026-07-15.

| Card end | Answers | Verdict | `opt.apply_window_opens` / `closes` / `complete_by` / `latest_start` | `grace.ends` |
|---|---|---|---|---|
| 2026-07-16 | none | cannot_tell; question `opt.ead_end.after_complete_by`, `about` {program_end_date 2025-05-15, opt.ead_end 2026-07-16} | all null | null |
| 2026-07-16 | all yes | talk_to_dso, reason `opt.ead_end.after_complete_by` | 2025-02-14 / 2025-07-14 / 2026-07-15 / 2025-07-14 | 2026-09-14 |
| 2026-07-16 | conflict no, rest yes | cannot_tell, `conflict:opt.ead_end.after_complete_by` | all null | null |
| 2026-07-15 | none | cannot_tell (two questions, no conflict) | 2025-02-14 / 2025-07-14 / 2026-07-15 / 2025-07-14 | 2026-09-13 |
| 2026-07-15 | all yes | no_open_items | same | 2026-09-13 |

By hand: 2025-05-15 less 90 days is 2025-02-14. Plus 60 days is 2025-07-14. 2026-07-16 plus 60 days is 2026-09-14. Unemployment days are 16 (July 1 to 16) and 15, both under 90, and the api gives 16 and 15. While the conflict is open, both items point 37 names are null, as is every item that uses the card. The rule `opt.complete_within_months` is in `rules`. A card that ends on the last day fits. **Point 37 holds. Closed.** I first sent a case with the period still open after the card ended. That also raised `employment.period_open_after_last_card`, and the same items were null.

## Every earlier finding of product round 1

| Review | Finding | Where it stands |
|---|---|---|
| product-1 | 1 (resolution 11 not built) | closed in fix 1 |
| product-1 | 2 (the screen holds the words for a legal status) | **named, stands** for the founder: web/src/lib/labels.ts line 202 maps `enjoined` to "paused by a court"; no web file changed |
| product-1 | 3 (`upcoming` holds the grace end twice) | closed (fix 8) |
| fix 1 | 1, 2 | closed in fix 2 |
| fix 1 | 3 (point 16's conflict nulls more items; point 37) | **closed now**, sent through the api above |
| fix 2 | 1, 2, 5, 6, 7 | closed in fix 4 |
| fix 2 | 3, 4 | closed (fix 8) |
| fix 2 | 8 | closed in fix 4 and fix 5 (point 55) |
| fix 4 | 1, 3, 4, 5, 7 | closed in fix 5 |
| fix 4 | 2, 6 | closed in fix 6 |
| fix 5 | 1 to 5 | closed in fix 6 |
| fix 6 | 1, 2 | cap-gap rows closed in fix 8; the degree row carried to fix 8 finding 1 |
| fix 6 | 3, 4 | closed in fix 7 |
| fix 7 | 1 | closed in fix 8 for the cap-gap row; the degree row carried to fix 8 finding 1 |
| fix 7 | 2 (the step-back draft does not say a period was not reported) | **named, stands** as a note; no web file changed |
| fix 7 | 3 (`--allow` takes every later word as a row) | closed: a base after `--allow` is now refused (exit 2) |
| fix 8 | 1 (the gate miscounts "U.S."; five texts over grade) | the gate is mended and tested. Three of the five texts pass; two drift in meaning (findings 1 and 2 below) |
| fix 8 | 2 ("field" for "category") | closed: the text says "category" |
| fix 8 | 3 (the freeze tool says "all allowed") | closed: "no --allow given, so none was checked" |

## Findings

### 1. Blocking. The accreditation text closes a reading its own note keeps open

- File: rulepacks/f1-us/v2026.09/parameters.yaml line 613 (`stem.requires.accreditation`), served in `rules` on every OPT case (the point 37 case above carries it).
- Input: a student whose school was accredited when the degree was conferred and no longer is when the application is made, by an agency the Department of Education recognizes at that time.
- What happens: the text says "At the time of application, the school is accredited by an agency...". It tells this student that the rule is not met. The quote ends "accredited by an accrediting agency recognized by the Department of Education at the time of application". The note says those words may limit the accreditation, the recognition or both, and that "the plain words keep that open". The text before the round did keep it open ("...has recognized at the time of application"). The CHANGELOG says the new text still does. It does not: a phrase at the front of the sentence governs "is accredited".
- Rule: point 58 ("a limit dropped, something added"); plain-1 SPEC section 1 ("vetoes any that says more, less or other than the quote").
- Asked for: put the phrase back at the end of the sentence, as the quote has it. For example: "As Duly reads it, this is one of the things on the list that must be met. The degree is from a U.S. educational institution. The school is accredited by an agency that the Department of Education has recognized at the time of application." The gate gives it 8.63 and finds no problem.

### 2. Blocking. The ten years of the older-degree text run back from no named day

- File: rulepacks/f1-us/v2026.09/parameters.yaml line 661 (`stem.requires.previously_obtained_degree`).
- Input: an older degree granted 2014-06-01, a post-completion OPT degree of 2024-05-15, and a DSO recommendation on 2025-03-01.
- What happens: the text ends "It must have been granted in the 10 years prior." The first sentence sets the older degree beside "that for post-completion OPT". A reader can take "prior" as prior to that degree, and then 2014-06-01 fits. The quote counts "the 10 years preceding the date the DSO recommends the student for the 24-month OPT extension", and 2014-06-01 is outside those years. Points 62 and 65 each name that end. The CHANGELOG says "up to then" was cut only to fit 320 characters.
- Rule: points 62 and 65; point 58.
- Asked for: name the day, and shorten elsewhere. For example: "When the DSO recommends the student for a 24-month OPT extension, it may rest on a degree older than the one for post-completion OPT. Then that degree must be from an accredited and SEVP-certified U.S. educational institution and in a category on the STEM list. It must be from the 10 years before that day." That is 307 characters, gate 8.97, and the gate finds no problem. The content lane checks the wording against the quote.

### 3. Note. The gate's grade is lower than a count by hand on two texts

- File: tools/sources/plain.py `_syllables`, with parameters.yaml lines 661 and 741.
- Input: the grades in the table above.
- What happens: the gate scores the duties text at 8.85. With dictionary syllables it is 9.86, and with abbreviations read aloud it is 10.87. For the older-degree text the figures are 8.88, 9.08 and 11.08. The gap comes from the vowel-group estimate ("situated", "area", "employer's", "prior") and from one-syllable abbreviations. The sentences are short, and the length comes from terms of art that point 58 requires. I do not veto on this, because every automatic Flesch-Kincaid count estimates syllables. For the founder: plain-1 SPEC should say that the gate's count is the measure of record. Otherwise each review can find a different grade. In the duties text, "They" could be read as the three things listed. "All of them" or "The terms and conditions" would remove that doubt.

### 4. Note. A sentence that ends in "no." is not counted as a sentence

- File: tools/sources/plain.py line 61 (`No\.` with `re.IGNORECASE`).
- Input: `plain.problems("A student may work. The rule says no. It ends then. It stops there.", "rule", same)`.
- What happens: `_sentences` counts 3, and `problems` returns nothing. A four-sentence rule text passes the three-sentence limit. The same happens with "etc." at the end of a sentence. No shipped text holds either, so nothing passes today because of it. Asked for: the owner of the gate matches "No." only when a number follows, and only in its capitalized form, and adds this input as a test.

## The standing checks

- A conclusion about a person: none. No text speaks to "you" or of one person. Finding 1 is a rule text that says more than the rule, not a statement about a person.
- A number or date from a model: none. No model is called.
- Time read outside an injected clock: none. The probes used a FixedClock.
- User data to an outside model: none.
- A quiet verdict on a gap or a conflict: none. The point 37 conflict gives cannot_tell while open or denied, and talk_to_dso when confirmed.
- A fact assumed and not asked: none found.
- Duly's reading shown as the law's words: none. Both reading rows keep their mark.
- A rule with no primary source: none. Every quote is found.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 2 | The gate fix, the freeze tool and three of five texts do what point 66 says. Two texts say other than their quotes on inputs points 58, 62 and 65 name (findings 1 and 2) |
| sourced | 3 | Every quote is found. The accreditation text departs from its own note, and the degree text drops the day the quote counts from |
| never_assumes | 5 | Point 37 sent through the api: every item that uses the conflicting dates is null while the conflict is open or denied, with the edge at 2026-07-15/16 |
| inside_the_boundary | 4 | No "you", no instruction, readings marked. The accreditation text settles an open reading without saying so, and a student reads it as a condition |
| secure | 5 | Only strings and a counting tool changed. The pack loads, the api answers 200, the gate refuses an over-length text, and the freeze tool refuses a row not named and a base after `--allow` |
| tested | 4 | The new tests fail on the old splitter and on an over-length text. The "no." leak (note 4) has no test. No test can catch meaning drift, which is this review's job |

Mean 3.83. Minimum 4 per line and 4.3 mean (factory/config.yaml).

## Decision on fix 9

The gate now measures "U.S." truly and refuses a text the contract would refuse. Only the five named texts changed. Three of them are plain and faithful. The accreditation text closes a reading its note keeps open. The older-degree text drops the day the ten years end on, which points 62 and 65 both name. Correct is 2 and sourced 3, below the minimum of 4. The mean of 3.83 is below 4.3.

## Decision on product round 1 as a whole

Every engine, api and screen finding of product-1.md through fix8.md is closed. With this review that includes point 37, sent through the api for the first time since fix 1. The gate and the freeze tool are mended. Two plain texts are left, each a one-sentence fix with example words above. Two notes stand for the founder: the screen's legal-status words (product-1 note 2) and the unreported-period draft (fix 7 note 2). Two new notes are about the gate (notes 3 and 4). Product round 1 is ready to approve once findings 1 and 2 are closed and `plain_changes c760b07 --allow` names only those two rows.

VETO
