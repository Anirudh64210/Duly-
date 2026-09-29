# Review: product round 1, fix 4

Reviewer: L-review, run l-review-720330a91e, 2026-09-29. I started with no context and edited no code.

Scope: every merge since reviews/product-1-fix2.md (617baa9..6e24e63): the contract for plain words, the f1 pack (plain words, `stem.report_change_within_days`, the holiday list before 2021-06-17, `capgap.october_start_condition`), engine/f1.py, engine/dates.py, the reconcile round of tests (1f3349f), and web/ (plain words, the court line, the drafts, point 41, 44 and 46). Checked against specs/product-1/SPEC-resolutions.md points 39 to 50, specs/plain-1/SPEC.md, PRINCIPLES.md, BOUNDARY.md and CLAUDE.md. The commit reviewed is 6e24e63a76bdd0a6605f6ba5747bdde1674cd154.

Every case below went through `POST /v1/compute/f1` with TestClient and a FixedClock at 18:00 UTC, time zone America/Los_Angeles, today 2026-09-29 unless a line says otherwise. Each case has `degree_level: master`, `documents_count: 2`, `cpt_full_time_days: 0`, and each period is 40 hours a week and reported, unless a line says otherwise. "Answered in full" means each question the engine asked was answered yes, with its own `about`, dated today, until none was left, except the answers a line names. `opt.earlier_at_this_level` is answered no unless a line says otherwise. The probe scripts are under TMPDIR and were not committed.

## What was run

| Check | Result |
|---|---|
| `uv run pytest tests/unit/engine tests/unit/api tests/unit/assistant tests/unit/support -q` | exit 0 |
| `uv run pytest tests/holdout -q --tb=no` | exit 0 |
| `uv run pytest tests/unit/tools/test_plain.py tests/unit/tools/test_copy_lint.py -q` | exit 0 |
| `python -m tools.sources.plain rulepacks --require f1` | "every plain text is general, calm, readable and grounded" |
| `python -m tools.sources.verify rulepacks` | "4 pack(s) checked, every quote found" |
| `python -m tools.gates.engine_literals` | "every number has a source" |
| copy lint | "copy lint: clean" |
| web vitest on a scratch copy of HEAD under TMPDIR (`--configLoader runner`) | 11 files, 290 tests passed |

Not run: `make test` as a whole, gates 3 and 6, the stack, a browser. I read the drafts by calling `dsoDraft` and `stemDraft` from a scratch vitest file in the TMPDIR copy, on engine outputs from the api. The screen components were read in code, not seen.

## The findings of reviews/product-1-fix2.md

- Finding 1 (point 27 answered yes). Program end 2026-05-22, OPT rec 2025-12-01, filed 2025-12-10, card 2026-01-15 to 2026-05-14, no employment, answered in full. Now talk_to_dso with `["opt.ead_end.not_after_program_end"]` only. `unemployment.days_used` and `days_remaining` are null, `lists` is empty, `upcoming` holds only `opt.complete_by`. Answered no: cannot_tell, the same nulls. Closed (point 42).
- Finding 2 (an open period after the last card). Program end 2025-05-15, OPT rec 2025-04-01, filed 2025-04-10, card 2025-06-01 to 2026-05-31, periods 2025-06-01 to 2026-05-31 and 2026-07-01 open. Unanswered: cannot_tell with `conflict:employment.period_open_after_last_card`, `about` `{"employment.2.start": "2026-07-01", "opt.ead_end": "2026-05-31"}`. Yes: talk_to_dso, `grace.ends` null (point 52). No: cannot_tell. Closed (point 43).
- Finding 5 (an answer not read shown as standing). The fix 1 STEM case answered in full reads all six answers (`answers_read` holds all six). With the STEM card end changed to 2026-06-30 and the same answers, `answers_read` leaves out `employment.2.new_employer`, `stem.new_plan_due.2.made`, `stem.concluding_evaluation_due.1.made` and `stem.validation_1_due.made`, and the new conflict of point 43 is asked. `Questions` in Result.tsx now counts an answer as standing only when it is in `answers_read` (line 444). Closed (point 46), read in code.

## Points 39 to 50, each sent through the api

| Point | Input | What happens | Hand check |
|---|---|---|---|
| 39 | Program end 2026-05-15, OPT rec 2026-04-01, filed 2026-04-10, card 2026-06-01 to 2027-05-31, period from 2026-06-01 open | cannot_tell, `unconfirmed:opt.earlier_at_this_level`, `about` degree level and both card dates | |
| 39 | the same, yes | talk_to_dso `["opt.months_at_this_level"]` | |
| 39 | the same, no | no_open_items; `answers_read` `["opt.earlier_at_this_level"]` | |
| 40 | STEM card 2015-06-01 to 2016-10-31 | `unemployment.limit` and `days_used` null, validations null, talk_to_dso `rule_not_in_force_on_event_day` | |
| 40 | STEM card from 2016-05-09 / from 2016-05-10 | null with the step back / limit 150, `stem.validation_1_due` 2016-11-28 | reached 2016-11-10; Nov 11 and Nov 24 skipped; 14 to 18 (5), 21 to 23 (8), 25 (9), 28 (10) |
| 40 | cap-gap filed 2024-04-01, start 2024-10-01 | `capgap.ends` 2024-10-01 | October row |
| 40 | cap-gap filed 2024-04-01, start 2024-11-15 | `capgap.ends` null, talk_to_dso `rule_not_in_force_on_event_day` | |
| 40 | filed 2025-01-16, start 2025-10-01 / filed 2025-01-17, start 2025-10-01 / filed 2025-01-17, start 2025-11-15 | 2025-10-01 / 2025-10-01 / 2025-11-15 | April 1 of FY2026 is 2026-04-01; the earlier is the start |
| 40, 53 | STEM starts 2018-12-12, 2018-12-19, 2019-12-19, 2020-12-17, 2020-12-19 | first validation due 2019-06-26, 2019-07-03, 2020-07-03, 2021-07-01, 2021-07-02 | June 19 counted in 2019 and 2020; 2021-06-18 (the observed day) counted; July 3 2020 counted (point 24) |
| 42 | finding 1 above | closed | |
| 43 | period open from 2026-05-15, card to 2026-05-31, today 2026-05-31 / 2026-06-01 | not raised / raised | |
| 43 | cap-gap pending, filed 2026-04-01, start 2026-10-01, one period open | not raised on 2026-09-29 (`capgap.ends` 2026-10-01); raised on 2027-04-02 | |
| 46 | finding 5 above | closed | |
| 47 | program end 2005-05-15, card 2005-06-01 to 2006-05-31 | window close and latest start null, talk_to_dso `rule_not_in_force_on_event_day`; `opt.complete_by` 2006-07-15, `grace.ends` 2006-07-30 | 14 months; 2006-05-31 + 60 |
| 48 | STEM card 2026-03-13 to 2026-06-30 | no validation and no 12-month evaluation dated; `stem.final_evaluation_due_from_ead_end` 2026-07-10, and it is asked `.made` | 2026-06-30 + 10 |
| 49 | point 27's case unanswered | three null items each carry a null alternate; `rule_in_litigation` is not in the reasons. See note 5 | |
| 50 | STEM card 2026-03-13 to 2028-03-12, period 2026-01-05 to 2026-09-20 not reported | `employment.2.end_report_by` 2026-09-30 from `stem.report_change_within_days`, settled; a period ending 2025-12-31 on the OPT card gives 2026-01-10 from the guidance row | +10 days |
| 51 | hours under 20, 39 unanswered | `["unconfirmed:opt.earlier_at_this_level", "hours_under_threshold"]` | |

The quote of `stem.report_change_within_days` is the whole sentence and the source check finds it.

## Every plain text beside its quote

I read all 53 rows and both regimes. These pass: every row not named below, including both regimes. The paused regime's words match paragraphs 3 and 4 of the saved order ("POSTPONED pending further order of this court or resolution of this proceeding on the merits"). Every reading says it is Duly's reading. None speaks to "you", and none tells anyone to do anything. These do not pass:

- `cpt.full_time_months_bar` and `cpt.full_time_bar_days`: see finding 1.
- `opt.latest_start_after_days` (60): the plain words add "The permission to work begins on the date asked for, or on the date it is approved if that is later." That is not in the quote. The row's own note says it comes from the next sentence and that "this row limits the date a student may request, not the date the authorization begins".
- `stem.validation_interval_months`: "a student fills in a short report". The word short is not in the quote or the note.
- `grace.after_completion_days` (30, paused): "counted from the program end date or the end of approved OPT". The quote names three starting points: "from the program end date or the 4 year maximum period of admission, or the end date of the approved employment authorization". The plain words leave one out.
- `stem.min_hours_per_week`: "Time off under the employer's usual leave rules does not count against this." The quote limits it to "leave-related policies applicable to the employer's similarly situated U.S. workers in the area of employment".

## Every DSO draft the screen can build

I built a talk_to_dso output for each reason `ASKS` names and for the fallbacks, plus the STEM step draft: 39 yes, 42 yes, 43 yes, the 2005 case, unemployment over the limit, hours under 20, 400 CPT days, cap-gap with grace, a denied petition, two reports answered not made, STEM with no post-completion OPT answered no, and cap-gap with no training answered no. Every draft is in the first person and ends "Thank you," and "[Your name]". None has the word Duly and none has a date the engine computed. Each date is one the student entered. "I did not submit", "I used OPT before" and "I did not have a period of post-completion OPT" repeat the student's own answers. Two do not pass: finding 2 and finding 3.

## Tests changed in the reconcile round

Commit 1f3349f changed 20 test files. I read every removed or changed assertion, holdout included.
- The ordinary cases gain `opt.earlier_at_this_level` answered no (`no_earlier_opt`, `placeholders_made_real`), each marked point 39. Where a test is about the question, the property now requires it to be asked or answered no.
- Open periods after the last card became closed at the card end with the end reported, each marked points 43, 52 and 22. The old test `test_an_open_period_may_run_past_the_end_of_the_last_card` now expects the conflict. The period generator in test_f1.py draws an open period only while today is inside the cards, marked point 43.
- Validations after the card end: exact dates became `is None`, and `validation_ids` became `dated_validations`, each marked point 48 with the working. I checked three by hand (2027-07-15 after 2027-06-30, 2026-07-15 after 2026-06-30, 2028-07-17 after 2028-06-30). `moved.get(id) == plain.get(id)` only lets an item be missing from both, as point 48 requires.
- `["no_documents"]` became `["no_documents", "cpt_full_time_at_or_over_bar"]`, marked point 51. That is stricter.
- The holiday tests hold both rows and pick the row in force, marked point 53.

No assertion is loosened without a point, and every change names its point.

## Findings

### 1. Blocking. The CPT plain words say practical training where the rule says academic training, and the change is not marked

- File: rulepacks/f1-us/v2026.09/parameters.yaml, `cpt.full_time_months_bar` and `cpt.full_time_bar_days`, field `plain`.
- Input: any case with an OPT card and full-time CPT days entered, for example program end 2026-05-15, card 2026-06-01 to 2027-05-31, `cpt_full_time_days` 400. The output's `rules` carries both rows with these plain words, and the screen shows them first under "In plain words".
- What happens: the plain words say "One year or more of full-time training during study (CPT) rules out practical training after study." The quote says "ineligible for post-completion academic training". Both notes say the sentence "does not use the words optional practical training". The reading mark ("Duly counts one year as 12 months" / "as 365 days") covers only the count, so the change of academic to practical training is shown as what the rule says.
- Rule: plain-1 section 1, "keep a reading a reading", and the mission: veto a plain text that says other than its quote. PRINCIPLES 1: a reading is marked everywhere it is shown.
- Asked for: plain words that keep the rule's own term, or that say Duly reads post-completion academic training as practical training after study.

### 2. Blocking. Four more plain texts say more or less than their quotes

- File: rulepacks/f1-us/v2026.09/parameters.yaml, `plain` of `opt.latest_start_after_days` (60), `stem.validation_interval_months`, `grace.after_completion_days` (30) and `stem.min_hours_per_week`.
- Input: the OPT case above (program end 2026-05-15, card 2026-06-01 to 2027-05-31) carries `opt.latest_start_after_days` with these plain words in the output's `rules`. A STEM case (program end 2025-02-15, OPT card 2025-03-13 to 2026-03-12, STEM card 2026-03-13 to 2028-03-12, one period open from 2025-03-13) carries `stem.validation_interval_months` and `stem.min_hours_per_week`. The paused 30-day grace row is not in `rules` today, since the output carries the row in force. Its plain words are in the pack and are shown wherever the row is, for example once the court's order is lifted.
- What happens: each is listed with its words in the section above. One adds a sentence from outside the quote, one adds the word short, one drops the four-year admission period from what the paused rule counts from, and one drops the limit on which leave policies count.
- Rule: plain-1 section 1, "say what the rule says"; the mission: veto any that says more, less or other than the quote. `tools.sources.plain` passes all four because it checks numbers, words and reading grade, not meaning.
- Asked for: L-content rewrites the four from the quote alone.

### 3. Should fix. Every draft says "I am an F-1 student"

- File: web/src/lib/drafts.ts, `letter`, line "I am an F-1 student, and I have a question about my record."
- Input: program end 2005-05-15, card 2005-06-01 to 2006-05-31, period 2005-06-01 to 2006-05-31, answered in full. The verdict is talk_to_dso with `rule_not_in_force_on_event_day`.
- What happens: the draft says "I am an F-1 student" today, for a program that ended in 2005. The same line opens the draft for a denied petition and for unemployment over the limit. The student entered no such fact. Duly writes a statement of present status for the student to send.
- Rule: plain-1 section 4, "It states only the student's own facts as entered ... and it never characterises the law or the student's status". D57.
- Asked for: an opening that states no status, for example "I have a question about my F-1 record."

### 4. Should fix. A new Form I-983 answered not made gets the general question, without the student's answer

- File: web/src/lib/drafts.ts `askFor` with labels.ts `reportName`, which has no name for `stem.new_plan_due.<n>`.
- Input: program end 2025-02-15, OPT card 2025-03-13 to 2026-03-12, STEM card 2026-03-13 to 2028-03-12, periods 2025-03-13 to 2026-06-30 and 2026-07-01 open, `employment.2.new_employer` yes and `stem.new_plan_due.2.made` no.
- What happens: the verdict carries `stem.new_plan_due.2.not_made`. The draft asks "Could you look at my record and tell me whether your office needs anything from me?" and does not say what the student answered, although the validation beside it gets "I did not submit my validation report 1."
- Rule: plain-1 section 4, a draft "built from the facts behind its reasons".
- Asked for: a name for the new plan in `reportName`, so the draft says "I did not submit a new Form I-983 for employment period 2".

### 5. Note. A null item still carries a null alternate

In point 27's case unanswered, `opt.apply_window_closes`, `opt.latest_start` and `grace.ends` are null and each carries `alternates: [{"value": null}]`. The verdict no longer carries `rule_in_litigation` (point 49 holds). The screen's `CourtLine` still shows the paused rule's words and the tap "What the paused rule would change", which opens a value that was not computed. Point 49 says such an alternate "gives no second answer".

### 6. Note. A clock before 2025-05-19 gives a 500

With the clock at 2016-10-01 (or 2024-09-01) and any OPT case with a period, `compute_f1` raises `RulepackError: opt.report_employer_within_days: no rule in force on 2016-10-01` (engine/f1.py line 363, from `_add_counts` line 789). The row is looked up for today, not for the event's day as point 40 asks, and it starts 2025-05-19. The SystemClock never gives such a day, so no person reaches it. A test or a replay with a past clock would.

### 7. Note. The hours draft makes a comparison

The draft for `hours_under_threshold` asks about "the weeks when I worked fewer hours". Fewer than what is Duly's comparison with 20 hours, not a fact the student entered. Asking "how your office reads my weeks at 10 hours a week" would state only the entered hours.

## The standing checks

- A conclusion about a person: the drafts' status line (finding 3). Nothing else.
- A number or date from a model: none. No model is called.
- Time outside an injected clock: none. The lookups use the event's day, except the row in note 6, which uses the injected clock's day.
- User data to an outside model: none.
- A quiet verdict on a gap or a conflict: none found. Points 39, 42 and 43 each ask. Finding 2 of fix 2 is closed.
- A fact assumed and not asked: none found.
- Duly's reading shown as the law's words: finding 1.
- A rule with no primary source: none. The new rows cite 8 CFR 214.2(f)(12)(ii)(A), 5 U.S.C. 6103 and its notes, and 73 FR 18944 and 81 FR 13040, all found by the source check.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 4 | Points 39 to 50 each give what they say on their cases and beside them, dates checked by hand (the table). Findings 1, 2 and 5 of fix 2 are closed. Draft for a new plan not made loses the student's answer (finding 4) |
| sourced | 2 | Every quote found and the new rows verbatim where marked. But six plain texts in the pack, five of which the screen shows first today, say other, more or less than their quotes, and two change the rule's term without a reading mark (findings 1 and 2) |
| never_assumes | 5 | I tried open periods on and after the card end, cap-gap before and after its end, point 27 answered each way, point 39 each way, and answers for other values. Each gap is a question or cannot_tell |
| inside_the_boundary | 3 | No "you", no instruction and no alarm word in the plain words, and none of the forbidden status words on the screen. But every draft states the student's status, which plain-1 section 4 forbids (finding 3) |
| secure | 4 | No crash with a real clock. A past clock gives a 500 (note 6) |
| tested | 4 | The reconcile round names its point on every change and loosens nothing. The yes branches of 39, 42 and 43 are tested. Neither the plain gate nor drafts.test.ts would catch findings 1 to 3 |

## Decision

The engine does what points 39 to 50 say, and the three findings of fix 2 I was asked to send again are closed. The plain words are the part a student reads first, and six of them say other than their quotes, one without marking its reading. The mission asks me to veto those, and sourced is below the minimum of 4, and so is inside_the_boundary.

VETO
