# Review: product round 1, fix 10, and the round as a whole

Reviewer: L-review, run l-review-09957a1427, 2026-09-29. I started with no context and edited no code.

Scope: every merge since reviews/product-1-fix9.md (c760b07..a5901e1). The product changes are two plain texts in rulepacks/f1-us/v2026.09/parameters.yaml (`stem.requires.accreditation` line 613, `stem.requires.previously_obtained_degree` line 661), the plain gate's abbreviation pattern (tools/sources/plain.py line 60) with a new test, and one sentence in specs/plain-1/SPEC.md. The rest is the pack's CHANGELOG and PROGRESS, plan-fix10 and the fix 9 review. No engine, api, web, assistant or contract file changed. I checked the work against specs/product-1/SPEC-resolutions.md points 58, 62, 65 and 66 (point 67 is not in that file, see note 1), plan-fix10, specs/plain-1/SPEC.md, PRINCIPLES.md and BOUNDARY.md. The commit reviewed is a5901e163183d7c14cf8b855c03f4bba36531a88.

## What was run

| Check | Result |
|---|---|
| `python -m tools.sources.plain_changes c760b07` | the two rows only; "no --allow given, so none was checked", exit 0 |
| the same with `--allow stem.requires.accreditation#2016-05-10 stem.requires.previously_obtained_degree#2016-05-10` | "2 row(s) changed, each one allowed", exit 0 |
| the same with `--allow stem.requires.accreditation#2016-05-10` only | refuses the degree row, exit 1 |
| `git diff c760b07..HEAD -- rulepacks/f1-us/v2026.09/parameters.yaml` | two `plain:` lines and nothing else: no value, quote, note, plain_terms, derivation or date |
| `python -m tools.sources.plain rulepacks --require f1` | "every plain text is general, calm, readable and grounded", exit 0 |
| `python -m tools.sources.verify rulepacks` | "4 pack(s) checked, every quote found" |
| `load_all()` | 4 packs; the loaded pack holds both new texts and neither old one |
| `python -m tools.gates.engine_literals` | "every number has a source" |
| `python tools/copy_lint/lint.py` | "copy lint: clean" |
| `pytest tests/unit/tools/test_plain.py tests/unit/tools/test_plain_changes.py` | exit 0 |
| `pytest tests/unit/engine tests/unit/api tests/unit/assistant tests/unit/support` | exit 0 |
| `pytest tests/holdout` | exit 0 |
| ruff and mypy on tools/sources/plain.py | clean |

Not run: `make test` as a whole, gates 3 and 6, web vitest (no web file changed since fix 7, where 302 passed), the stack, a browser. Nothing tried to make me act; no instruction was found in the data read.

## The two rewritten texts beside their quotes and notes

**`stem.requires.accreditation`** (reading). 238 characters, 3 sentences, gate 8.63.

- Quote: "The degree that is the basis for the 24-month OPT extension is from a U.S. educational institution accredited by an accrediting agency recognized by the Department of Education at the time of application."
- Note: the words "at the time of application close the sentence; they may limit the accreditation, the recognition, or both, and the plain words keep that open."
- Text: "As Duly reads it, this is one of the things on the list that must be met. The degree is from a U.S. educational institution. The school is accredited by an agency that the Department of Education has recognized at the time of application."

Sentence 1 rests on the note (the list's opening words, and the reading mark). Sentence 2 is the quote's "is from a U.S. educational institution". Sentence 3 is the rest of the quote, with the time phrase at the end of the sentence where the quote puts it. It sits after "recognized", as in the quote. A reader can still attach it to "is accredited", so both readings the note names are open, and so is the reading that both are timed. Fix 9's input (a school accredited when the degree was granted and not when the application is made, by an agency recognized at that time) is no longer told the rule is unmet. It reads the same as the quote. The three plain_terms are kept word for word. **Passes. Fix 9 finding 1 closed.**

**`stem.requires.previously_obtained_degree`** (verbatim). 307 characters, 3 sentences, gate 8.97.

- Quote: "If an application for a 24-month OPT extension ... is based upon a degree obtained previous to the degree that provided the basis for the period of post-completion OPT ..., that previously obtained degree must have been conferred from a U.S. educational institution that is accredited and SEVP-certified at the time the student's DSO recommends the student for the 24-month OPT extension and must be in a degree program category included on the current STEM Designated Degree Program List at the time of the DSO recommendation. That previously obtained degree must have been conferred within the 10 years preceding the date the DSO recommends the student for the 24-month OPT extension."
- Text: "When the DSO recommends the student for a 24-month OPT extension, it may rest on a degree older than the one for post-completion OPT. Then that degree must be from an accredited and SEVP-certified U.S. educational institution and in a category on the STEM list. It must be from the 10 years before that day."

Sentence 1 rests on the quote's "If ... is based upon a degree obtained previous to the degree that provided the basis for the period of post-completion OPT", and on the note's "may be, but is not required to be". It names whom the DSO recommends (point 65). "it" can only be the extension: the DSO and the student are people. Sentence 2 keeps accredited, SEVP-certified, U.S. educational institution and "category" (point 66). Sentence 3 counts the ten years back from "that day". The only day the text has named is the day the DSO recommends, which is what the quote counts from. Fix 9's input (an older degree of 2014-06-01, a post-completion OPT degree of 2024-05-15, a recommendation on 2025-03-01) now falls outside the ten years, as the quote says. Before this round a reader could take "prior" as prior to the 2024 degree. The quote's "current" list is carried by the time of the recommendation, and the note says the rule is about that time. **Passes, with note 2. Fix 9 finding 2 closed.**

I tried the obvious tighter wording, "At that time, that degree must be...". It is 316 characters, but the gate grades it 9.04 and refuses it. "Then" is the word that fits.

## The gate change

The new pattern reads "No." as an abbreviation only before a number. It reads "etc." as one only before a comma, a semicolon or a lower-case word, and "Dr.", "Mr.", "Ms." and "Mrs." only before a capital. `plain._sentences("A student may work. The rule says no. It ends then. It stops there.")` is now 4, and `problems` names "4 sentences". The new test holds that input and four more. It would fail on the old pattern. I counted the matches of the old and the new pattern in all 55 shipped plain texts, and none of them changes. Fix 9 note 4 is closed. One leak of the same kind is left (note 3).

The plain-1 SPEC now names the gate's count as the measure of record for the grade. Fix 9 note 3 asked for that, and that part is closed.

## Every earlier finding of product round 1

| Review | Finding | Where it stands |
|---|---|---|
| product-1 | 1 (resolution 11 not built) | closed in fix 1 |
| product-1 | 2 (the screen holds the words for a legal status) | **named, stands** for the founder: web/src/lib/labels.ts line 202 still maps `enjoined` to "paused by a court"; no web file changed |
| product-1 | 3 (`upcoming` holds the grace end twice) | closed (fix 8) |
| fix 1 | 1, 2 | closed in fix 2 |
| fix 1 | 3 (point 16's conflict nulls more items; point 37) | closed (fix 9, sent through the api) |
| fix 2 | 1, 2, 5, 6, 7 | closed in fix 4 |
| fix 2 | 3, 4 | closed (fix 8) |
| fix 2 | 8 | closed in fix 4 and fix 5 (point 55) |
| fix 4 | 1, 3, 4, 5, 7 | closed in fix 5 |
| fix 4 | 2, 6 | closed in fix 6 |
| fix 5 | 1 to 5 | closed in fix 6 |
| fix 6 | 1, 2 | closed: cap-gap rows in fix 8, the degree row now |
| fix 6 | 3, 4 | closed in fix 7 |
| fix 7 | 1 | closed: cap-gap row in fix 8, the degree row now |
| fix 7 | 2 (the step-back draft does not say a period was not reported) | **named, stands** as a note; no web file changed |
| fix 7 | 3 (`--allow` takes every later word as a row) | closed (fix 9) |
| fix 8 | 1 (the gate miscounts "U.S."; five texts over grade) | closed: the gate was mended in fix 9, and all five texts are now plain and faithful |
| fix 8 | 2, 3 | closed (fix 9) |
| fix 9 | 1 (the accreditation text closes a reading) | **closed now** |
| fix 9 | 2 (the ten years run back from no named day) | **closed now** |
| fix 9 | 3 (the gate's grade is below a hand count) | closed in part: plain-1 SPEC names the gate's count as the measure of record. "They" in `stem.requires.duties_hours_and_compensation` (line 741) was not in this round's asks and **stands** as a note |
| fix 9 | 4 ("no." ends no sentence) | **closed now**, tested |

## Findings

### 1. Note. Point 67 is not in SPEC-resolutions.md

- File: specs/product-1/SPEC-resolutions.md (it ends at point 66, line 118).
- Input: `grep -n "67" specs/product-1/SPEC-resolutions.md` finds nothing.
- What happens: the mission, plan-fix10 and commit c265b8e all name "resolution 67", but that commit changed only plain-1 SPEC, plan-fix10, the gate and its test. The work is still held by a written rule. Point 62 says that "a later round changes only the texts a review names, following its asks", and fix 9 named these two. Asked for: the founder adds point 67 to the file (the two texts, and the gate's reading of "No." and "etc."), so that the file stays the record.

### 2. Note. "Then" in the degree text does two jobs

- File: rulepacks/f1-us/v2026.09/parameters.yaml line 661.
- Input: a reader who takes "Then" as "in that case", with an older degree from a school that was accredited when the degree was granted and is not accredited on the day the DSO recommends.
- What happens: after "When the DSO recommends...", "Then" reads first as "at that time", which is what the quote says, and sentence 3's "that day" rests on it. A reader who takes it only as "in that case" loses the timing. The earlier text said "If so, at that time". I do not veto: the when/then pair carries the time, and the tighter wording fails the grade limit (9.04). For a later round, if the founder wants the time said outright, "At that time" fits once another word is saved.

### 3. Note. "U.S." that ends a sentence still ends none

- File: tools/sources/plain.py line 60.
- Input: `plain._sentences("They work in the U.S. It is fine.")` gives 1, and so does `"The list is long, i.e. Very long."`.
- What happens: the gate counts one sentence where there are two, so such a text reads as longer and harder than it is. It errs toward refusing, not passing. No shipped text holds "U.S." or "i.e." before a capital (checked on all 55). Asked for, not urgent: the owner of the gate adds this input as a known case.

## The standing checks

- A conclusion about a person: none. Neither text speaks to "you" or of one person.
- A number or date from a model: none. No model is called. The "10" is in the quote.
- Time read outside an injected clock: none. No code that reads time changed.
- User data to an outside model: none.
- A quiet verdict on a gap or a conflict: none. No engine change. The unit and holdout suites pass.
- A fact assumed and not asked: none found.
- Duly's reading shown as the law's words: none. The accreditation row is a reading and says "As Duly reads it". The degree row is verbatim.
- A rule with no primary source: none. Every quote is found against its saved snapshot.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 4 | Both texts say what their quotes say on fix 9's two inputs and on the readings the notes name. Only the two rows changed, and the freeze tool refuses a third. "Then" carries the time only by pairing with "When" (note 2) |
| sourced | 5 | Each sentence rests on the quote or the note, as given above. Every quote is found, the reading is marked, and the plain_terms are kept |
| never_assumes | 5 | No engine change. The point 37 conflict was sent through the api in fix 9, and the suites that hold it pass |
| inside_the_boundary | 4 | Neither text states a conclusion about a person. The screen's legal-status words (product-1 note 2) still stand for the founder |
| secure | 5 | Only strings and a regular expression changed. The new pattern has no nested repeats, the pack loads, and the gate refuses an over-length or over-grade text |
| tested | 4 | The new test fails on the old pattern. The "U.S." before a capital case (note 3) has no test. No test can catch meaning drift, which is this review's job |

Mean 4.50. The minimum is 4 on each line and 4.3 for the mean (factory/config.yaml).

## Decision on fix 10

Only the two named plain texts changed, in the words fix 9 asked for. Each is plain under the gate and says what its quote says: the time of application closes the accreditation sentence as it does in the quote, and the ten years run back from the day the DSO recommends. The gate now ends a sentence at "no." and "etc.", with a test. There is no blocking finding, and every line is 4 or more.

## Decision on product round 1 as a whole

Every engine, api, screen and plain-text finding of product-1.md through fix9.md is closed. Four notes stand, none blocking: the screen's legal-status words (product-1 note 2) and the unreported-period draft (fix 7 note 2), both for the founder; "They" in the duties text (fix 9 note 3); and notes 1 to 3 above. Product round 1 is approved.

APPROVE
