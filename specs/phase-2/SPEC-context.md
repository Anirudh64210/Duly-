# Phase 2, context round: confirm, the person's own day, and the law as written

Founder decisions D32 to D35 (DECISIONS.md) and PRINCIPLES.md. Read PRINCIPLES.md before anything else.

The contracts are already changed on this branch. Lanes may not change them.

## 1. The law as written (L-content)

Every rule in every pack with status settled, guidance, litigated or proposed gains `derivation`:

- `verbatim`: the value is written in the quoted words, as digits, as a number word, or as a month and day. The source check tests this.
- `reading`: Duly derived the value from the quoted words. The rule needs a `note` that says, in one plain sentence, how the value was read. Example: the regulation says "one year or more" and the pack holds 12 months.

Do not make a rule pass by changing its value to fit the check. If the quote you hold does not contain the value, first read the saved source again for the words that do. If the law states the value, quote those words and mark the rule verbatim. If it does not, mark it a reading and say how. If a rule is neither, remove it and say so in the progress log.

Done when `uv run python -m tools.sources.verify rulepacks` passes.

## 2. The person's own day (L-tests, L-engine, L-api, L-web)

The case carries `time_zone`, an IANA name. Today is `clock.now()` seen from that zone, then its date. The engine never calls `clock.today()`. The output carries `today`: the date used and the zone. An unknown zone is refused by `parse_case` with a ValueError, and by the api with a 422 in plain words.

The screen sends the zone the browser reports, shows it beside the verdict's scope line, and lets the person change it.

Test: at 01:30 UTC on 2026-09-29 a case in America/Los_Angeles counts through 2026-09-28, and a case in Asia/Kolkata counts through 2026-09-29.

## 3. A date blocks only while it can still matter (L-tests, L-engine)

An input is missing, for the verdict, only if an item that needs it can still matter.

| Input | Needed by | Stops mattering when |
|---|---|---|
| opt.dso_recommendation_date | opt.file_by | opt.i765_filed_date or opt.ead_start is recorded |
| stem.dso_recommendation_date | stem.file_by | stem.i765_filed_date or stem.ead_start is recorded |
| opt.i765_filed_date | nothing computed yet | never blocks |
| stem.i765_filed_date | nothing computed yet | never blocks |

When an input has stopped mattering, the item that needed it is left out of the output, and nothing is said about it. When it still matters and is absent, it is named in the verdict's reasons as before.

EAD dates of a block that is present always matter.

## 4. Confirm, never assume (L-tests, L-engine, L-web)

When the record has a gap that the person can close with a plain answer, the engine asks. It returns `questions`, each with an id and the inputs that raised it. While a question is open, the verdict is `cannot_tell` with the reason `unconfirmed:<id>`.

The person's answers arrive in the case under `confirmations`, each with the day it was given. The engine never fills one in.

Questions in this round:

| id | Raised when | If the answer is yes | If the answer is no |
|---|---|---|---|
| held_post_completion_opt | stem is present and opt is absent | The OPT EAD dates are missing inputs: `missing:opt.ead_start`, `missing:opt.ead_end` | The verdict is `talk_to_dso` with the judgement item `stem_without_post_completion_opt`. The engine states no conclusion. The output's rules include the paragraph that says who may apply for the extension, so the screen can show the words |
| no_employment_to_record | opt or stem is present, the counting window has begun, and employment is empty | Counting goes ahead on an empty list | The verdict stays `cannot_tell` with `missing:employment` |
| cap_gap_without_training | cap_gap is present and both opt and stem are absent | `missing:opt.ead_end` | `talk_to_dso` with `cap_gap_without_training` |

L-content: find and source the paragraph for the first row (who may apply for the 24-month extension, in 8 CFR 214.2(f)(10)(ii)(C)) as `stem.requires_post_completion_opt`, a flag, with the exact words.

The screen shows each open question in plain words with two answers, records the answer with today's date in the person's zone, and computes again. An answer can be changed. The question text lives in the screen's copy and follows BOUNDARY.md: it asks what happened, never what the person should do.

A general property for the tests: for any case, if `questions` is not empty, the verdict is `cannot_tell`; and no case with an absent part ever gives `no_open_items` without either the part's dates or a confirmation that says the part does not exist.

## 5. Rules shown with their derivation (L-engine, L-web)

Each rule in the output's `rules` carries `derivation` and, for a reading, `note`. The screen shows a reading as a reading: the quoted words, then the note, labelled so that nobody takes Duly's reading for the law's own words.

## The tests (L-tests)

Tests for every section above, in tests/unit and tests/holdout. Add `time_zone` to every case the existing tests build. The test pack gains `derivation` on every rule and the new flag. The new tests cannot pass until the other lanes finish; that is expected.
