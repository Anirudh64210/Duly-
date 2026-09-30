# Review: product round 1, fix 8, and the round as a whole

Reviewer: L-review, run l-review-430e7fdaf4, 2026-09-29. I started with no context and edited no code.

Scope: every merge since reviews/product-1-fix7.md (07f2b6a..23234a4). The only product change is two plain texts in rulepacks/f1-us/v2026.09/parameters.yaml (point 65). The rest is the pack's CHANGELOG and PROGRESS, the spec point and plan-fix8. Checked against specs/product-1/SPEC-resolutions.md points 58, 62 and 65, specs/plain-1/SPEC.md, PRINCIPLES.md and BOUNDARY.md. The commit reviewed is 23234a4114183b2c3c97ae6b57ca1fcec606c18d.

Api probes used TestClient with a FixedClock at 2026-09-30 01:00 UTC, time zone America/Los_Angeles, so today is 2026-09-29. "Answered in full" means each question was answered yes, with its own `about`, dated 2026-09-29, until none was left. The two exceptions, `.earlier_at_this_level` and `.new_employer`, were answered no. The probe scripts are under TMPDIR/r430 and were not committed.

## What was run

| Check | Result |
|---|---|
| `uv run pytest tests/unit/engine tests/unit/api tests/unit/assistant tests/unit/support -q` | exit 0 |
| `uv run pytest tests/holdout -q` | exit 0 |
| `uv run pytest tests/unit/tools/test_plain.py tests/unit/tools/test_plain_changes.py -q` | 17 passed |
| `python -m tools.sources.plain_changes 07f2b6a` | 2 rows changed: `capgap.end_month_day#2025-01-17`, `stem.requires.previously_obtained_degree#2016-05-10` |
| the same with `--allow` and those two rows | "2 row(s) changed, all allowed", exit 0 |
| the same with `--allow capgap.end_month_day#2025-01-17` only | refuses the degree row, exit 1 |
| `python -m tools.sources.plain_changes d9442be` | the eight rows of fix 7 and no other |
| `python -m tools.sources.plain rulepacks --require f1` | "every plain text is general, calm, readable and grounded" |
| `python -m tools.sources.verify rulepacks` | "4 pack(s) checked, every quote found" |
| `python -m tools.gates.engine_literals` | "every number has a source" |
| `python tools/copy_lint/lint.py` | "copy lint: clean" |

Not run: `make test` as a whole, gates 3 and 6, web vitest (no web file changed since fix 7, where 302 passed), the stack, a browser.

## No other plain text changed

Against 07f2b6a, the commit fix 7 read, `plain_changes` names two rows, and they are the two that point 65 names. `git diff 07f2b6a..HEAD -- rulepacks/` changes two `plain:` lines in the pack. It changes no value, quote, note, plain_terms or date. No row shares an id, a regime and a start date with another row, so no change can hide behind a shared key.

## The two rewritten texts beside their quotes and notes

**`capgap.end_month_day` (2025-01-17), line 453.** "It is for an F-1 student whose H-1B petition to change status is under the cap, as Duly reads it, and meets the terms. Duration of status and the employment authorization the rule names last on their own till April 1 of the H-1B fiscal year. If the approved petition starts first, they last on their own only until then."
The quote says these "will be automatically extended until April 1 ... or until the validity start date of the approved petition, whichever is earlier". The third sentence now bounds only the automatic extension. It no longer says that status or authorization end on that day. The limit to the (c)(3)(i)(B) or (C) authorization is kept as "the employment authorization the rule names", and so are "approved" and the reading mark. Both plain_terms are kept word for word. The gate's grade is 8.98, and "U.S." does not occur, so that grade is real. "It is for" has no noun before it. On the rule card it can only mean the rule, so this is a matter of style. **Passes.** Fix 7's finding 1 is closed for this row.

**`stem.requires.previously_obtained_degree`, line 661.** "If a 24-month OPT extension rests on an older degree than the one for post-completion OPT, that degree must be from a U.S. educational institution that is accredited and SEVP-certified when the DSO recommends the student for the extension, in a field on the STEM list then, and granted in the 10 years up to that day."
- Meaning. The text now names whom the DSO recommends ("recommends the student for the extension"), as the quote does ("the student's DSO recommends the student for the 24-month OPT extension"). The 10 years end on that day ("within the 10 years preceding the date the DSO recommends"). "then" carries "current ... at the time of the DSO recommendation". The drift fix 7 named is gone. One word moved away from the quote. The quote says "degree program category included on the ... List", and the text says "a field on the STEM list". The list is made of categories, and a person's sense of their "field" is broader than the category of their degree program. Fix 7's example said "category". The content lane changed the word only to bring the grade down (CHANGELOG). This does not block on its own, but a rewrite should go back to "category".
- Plain. Point 65 says this text "is split into short sentences". It is not split: it is one sentence of 57 words. plain-1 SPEC line 22 says a plain text is "at a reading grade no higher than 9". The gate scores this text at 8.88, but only because its splitter `[^.!?]+[.!?]?` (tools/sources/plain.py line 51) cuts "U.S." into three pieces ("...from a U.", "S.", " educational ... day."). The Flesch-Kincaid formula then divides 57 words by 3 sentences. I ran the gate's own `grade()` on the same text with "U.S." read as one word ("US"), and it gives 23.92. **Fails** plain-1 line 22 and point 65 (finding 1).

The content lane saw the splitter fault and recorded it as a dispute. rulepacks/REPORT.json is not in this worktree, but the CHANGELOG and PROGRESS entries of run l-content-0f0465de11 say so. The lane was right about the fault. With the gate as written, any text that keeps the term "U.S. educational institution" can have only one real sentence, since the fault adds two sentence ends and the limit is three. So the text could not have been split without a gate change. The work is still not what point 65 and plain-1 ask for, and the mission says to veto a text that is not plain.

## The cap-gap case of fix 7, through the api

Program end 2025-05-15, `degree_level` master, `documents_count` 2, `cpt_full_time_days` 0. OPT rec 2025-04-01, filed 2025-04-10, card 2025-06-01 to 2026-05-31. One period open from 2025-06-01 at 40 hours a week, reported. Cap-gap petition filed 2026-04-01 for 2026-10-01, pending, change of status. Answered in full.

- 200. talk_to_dso `["grace_with_cap_gap"]`, no question left.
- `rules` carries `capgap.end_month_day` with the new 2025 text and `stem.requires.previously_obtained_degree` with the new text, as quoted above.
- Hand check: `opt.apply_window_opens` 2025-02-14 (2025-05-15 less 90 days: 15 + 30 + 31 + 14 = 90). `opt.apply_window_closes` and `opt.latest_start` 2025-07-14 (plus 60: 16 + 30 + 14). `opt.file_by` 2025-05-01 (rec plus 30). `opt.complete_by` 2026-07-15 (14 months). `upcoming` is `capgap.ends` 2026-10-01, the earlier of the requested start and April 1 of FY2027 (2027-04-01). The petition was filed on or after 2025-01-17, so the April 1 row is the one that applies. All match.

## Every earlier finding of product round 1

There is no reviews/product-1-fix3.md, and git has no record of one. The round went from fix 2 to fix 4.

| Review | Finding | Where it stands |
|---|---|---|
| product-1 | 1 (resolution 11 not built) | closed in fix 1, on all four inputs |
| product-1 | 2 (the screen holds the words for a legal status) | **named, stands.** web/src/lib/labels.ts line 202 maps `enjoined` to "paused by a court". The pack carries only the code. This is for the founder, as first written |
| product-1 | 3 (`upcoming` holds the grace end twice) | closed. OPT case (program end 2026-05-15, card 2026-06-01 to 2027-05-31, period open, answered in full): no_open_items, `grace.ends` 2027-07-30 once. `next.stem.apply_window_opens` 2027-03-02 (card end less 90). `opt.complete_by` 2027-07-15 |
| fix 1 | 1 (a passed new I-983 is quiet) | closed in fix 2 |
| fix 1 | 2 (seven periods cannot be answered) | closed in fix 2 (256 answers accepted, 257 refused) |
| fix 1 | 3 (point 16's conflict nulls more items) | made point 37 by the founder, as fix 2 records. **Named**: no later review sent it again, and I did not |
| fix 2 | 1, 2, 5 | closed in fix 4 |
| fix 2 | 3 (no screen line for the point 28 item) | closed: labels.ts line 394 holds the words of point 44, read in code |
| fix 2 | 4 (`/v1/status` off contract) | closed: `/v1/status` gives 200 with `rules_checked_on` on each pack (f1 2026-09-28), and contracts/openapi.yaml line 94 carries the field |
| fix 2 | 6, 7 | closed in fix 4 (points 47 and 48, its table) |
| fix 2 | 8 (null alternates give `rule_in_litigation`) | closed in fix 4 for the verdict, and in fix 5 for the null alternate (point 55) |
| fix 4 | 1, 3, 4, 5, 7 | closed in fix 5 |
| fix 4 | 2, 6 | carried as fix 5 findings 1 and 2, closed in fix 6 |
| fix 5 | 1 to 5 | closed in fix 6 |
| fix 6 | 1, 2 | carried as fix 7 finding 1. Closed now for the cap-gap row. **Named** for the degree row (finding 1 below) |
| fix 6 | 3, 4 | closed in fix 7 |
| fix 7 | 1 | the cap-gap half and the drift half are closed. The split is not (finding 1 below) |
| fix 7 | 2 (the step-back draft does not say a period was not reported) | **named, stands** as a note. No web file changed |
| fix 7 | 3 (`--allow` takes every later word as a row) | **named, stands** as a note (finding 3 below) |

## Findings

### 1. Blocking. One rewritten text and four frozen texts are over the reading grade, and the plain gate cannot see it

- File: tools/sources/plain.py line 51 (`SENTENCE`), with rulepacks/f1-us/v2026.09/parameters.yaml line 661.
- Input: `stem.requires.previously_obtained_degree`, served in `rules` on the cap-gap case above. The gate's `grade()` on it gives 8.88. The same `grade()` with "U.S." read as one word gives 23.92.
- What happens: the splitter ends a sentence at each period of "U.S.". Every plain text that holds "U.S." is scored as if it had two more sentences than it has. The point 65 text stays one 57-word sentence, not the short sentences the point names. The same fault hides four frozen texts, each one sentence, whose grade with "U.S." read as one word is over 9. The gate grade is given first, the real grade second: `stem.min_hours_per_week` 7.12 / 16.27, `stem.requires.accreditation` 8.63 / 19.84, `stem.requires.duties_hours_and_compensation` 8.43 / 17.61, `stem.requires.employer_attests_no_replacement` 5.15 / 13.48. No other plain text is cut on an abbreviation. I checked every row for a piece of two words or fewer, and only these five have one. tests/unit/tools/test_plain.py has no case of a sentence that holds "U.S.", so its tests pass.
- Rule: plain-1 SPEC line 22 ("at most three sentences for a rule ... at a reading grade no higher than 9"). Point 65 ("split into short sentences"). Point 58 ("plain first").
- Asked for: the owner of tools/sources/plain.py makes the splitter and the word count read "U.S." as one word, and adds a test that fails on today's splitter. Then L-content splits line 661 into short sentences with "category" in place of "field". Fix 7's example scores 10.87 on a mended gate, so it needs to be shorter. L-content also rewrites the four other rows, and `plain_changes --allow` names all five rows. The founder may instead decide that a text with these terms of art may be over grade 9. If so, that belongs in plain-1 SPEC, not in a gate that miscounts.

### 2. Note. "field" in place of "category"

- File: rulepacks/f1-us/v2026.09/parameters.yaml line 661.
- Input: the same row. The quote says "degree program category included on the current STEM Designated Degree Program List".
- What happens: the text says "in a field on the STEM list". A person whose field sounds like a STEM field may read the text as met when the category of their degree program is not on the list. Fix it when finding 1 is fixed.

### 3. Note. The freeze tool says "all allowed" when nothing was allowed

- File: tools/sources/plain_changes.py lines 45 and 62.
- Input: `python -m tools.sources.plain_changes 07f2b6a`, with no `--allow`.
- What happens: it prints "plain changes: 2 row(s) changed, all allowed" and exits 0. The docstring says only `--allow` fails the run, so this is by design. But the words claim an approval that was never given. Together with fix 7's note 3 (every word after `--allow` is taken as a row), a done command written wrongly passes without warning. The plan's done command writes it correctly.

## The standing checks

- A conclusion about a person: none. Neither text speaks to "you" or of one person.
- A number or date from a model: none. No model is called.
- Time read outside an injected clock: none. The probes used a FixedClock.
- User data to an outside model: none.
- A quiet verdict on a gap or a conflict: none found. The cap-gap case steps back, and the OPT case is quiet only once it is answered in full.
- A fact assumed and not asked: none found.
- Duly's reading shown as the law's words: none. "under the cap, as Duly reads it" is kept.
- A rule with no primary source: none. Every quote is found.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 2 | Point 65 is met for the cap-gap row, and the drift in the degree row is gone. The degree row is still one 57-word sentence, where point 65 says it is split into short sentences (finding 1) |
| sourced | 4 | Both texts now say what their quotes say, and every quote is found. "field" for "category" loosens a term of the list (finding 2) |
| never_assumes | 5 | Nothing in the engine changed. The cap-gap case steps back through the api, and every question is asked before a verdict |
| inside_the_boundary | 5 | Neither text speaks to "you", instructs, or states a person's status. Readings are marked |
| secure | 5 | Only two strings changed. The api answers 200 on the case sent, and the freeze tool refuses a row not named |
| tested | 3 | The unit, holdout and gate suites pass. The plain gate's tests have no sentence with an abbreviation, so the gate passes five texts over its own grade limit, and no test would fail (finding 1) |

## Decision on fix 8

The cap-gap text is fixed and stays faithful. The older-degree text now says the right thing, but it is still one 57-word sentence at a real grade near 24. It passes only because the plain gate miscounts "U.S.", and the same fault hides four frozen texts. Correct is 2, below the minimum of 4. The mean is 4.0, below 4.3.

## Decision on product round 1 as a whole

Every engine, api and screen finding of product-1.md through fix7.md is closed. The table above shows each one sent again or closed in a later review. What is left is plain words: five rule texts are over the grade that plain-1 sets, and the gate cannot measure them. Three notes stand for the founder: the screen's legal-status words, the unreported-period draft and the freeze tool's wording. Fix 1's finding 3, now point 37, was never sent again. Product round 1 is not ready to approve until finding 1 is closed.

VETO
