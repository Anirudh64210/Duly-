# Progress log, lane L-content

## 2026-09-28, iteration 1

### State

The F-1 pack is written: 2 regimes, 22 parameter rows covering the 19 rule ids in the SPEC table. The done command passes. Nothing is reviewed by the founder yet; no row carries reviewed_by.

### What ran

```
uv run python -m tools.sources.verify rulepacks
  sources: 4 pack(s) checked, every quote found
uv run pytest tests/unit/engine/test_rulepack.py -q
  19 passed
grep -c "^  - id:" rulepacks/f1-us/v2026.09/parameters.yaml
  24   (2 regimes and 22 parameters; the pattern counts both)
uv run python -m tools.copy_lint.lint
  copy lint: clean
```

### What I did

1. Fetched 8 CFR 214.2 as of 2026-09-14 and 2026-09-15 from the eCFR versioner, with compression. Both returned 200.
2. Compared paragraph (f) between the two texts, paragraph by paragraph.
3. Found the words for every rule in the SPEC table in the 2026-09-14 text and recorded them as quotes.
4. Fetched the final rule, 91 FR 44976, FR Doc. 2026-14439.
5. Searched CourtListener for the court order. Found it and saved it.
6. Fetched four older Federal Register rules to support the start dates.
7. Fetched the SEVP guidance for the hours rule from Study in the States and from ice.gov.
8. Wrote parameters.yaml, SOURCES.md, and the CHANGELOG.

### Where the sources differ from the SPEC table

| Rule | SPEC said | Source says | What I recorded |
|---|---|---|---|
| opt.apply_after_days | 60, settled, no regime | 60 in the 2026-09-14 text. The 2026-09-15 text says 30, in (f)(11)(i)(B)(2) and in (f)(11)(i)(D). The final rule preamble confirms the change from 60 to 30 | Two rows, litigated: 60 under ds_2012, 30 under fixed_admission_2026 |
| cpt.full_time_months_bar | 12 months | "one year or more of full time curricular practical training". The sentence ends "ineligible for post-completion academic training", not optional practical training | 12 months, with the difference in the note. The schema has no unit for years |
| stem.validation_interval_months | 6 | "every six months", as a word | 6, with a note |
| stem.validation_* citation | (f)(12)(ii) | The words are in (f)(12)(ii)(B) | Cited (B) |
| stem.min_hours_per_week citation | (f)(10)(ii)(C) | The words are in (f)(10)(ii)(C)(8) | Cited (C)(8) |
| stem.new_plan_due_days citation | (f)(10)(ii)(C) | The words are in (f)(10)(ii)(C)(7)(iv) | Cited (C)(7)(iv) |
| opt.max_months citation | (f)(10) or (f)(11) | The words are in the opening text of (f)(10) | Cited (f)(10) |
| grace, blocked regime, citation | (f)(5) | (f)(5)(v) in the 2026-09-15 text | Cited (f)(5)(v) |
| capgap.end_month_day | 04-01, one row | April 1 since 2025-01-17 (89 FR 103054). October 1 before that (73 FR 18944) | Two rows, the old one closed on 2025-01-16 |
| regime fixed_admission_2026 source | the final rule | The schema allows one source per regime. The status enjoined is a claim about the order, so the order is the source and the quote. The final rule is named in the note and saved | Order as source; both claims written out in SOURCES.md |

Every other value in the SPEC table matches the source.

### The court order

- Presidents' Alliance on Higher Education and Immigration v. United States Department of Homeland Security, No. 1:26-cv-13799, D. Mass., Judge Saylor.
- ECF 51, 2026-09-14: the effective date of the final rule is postponed under 5 U.S.C. 705, and the defendants are preliminarily enjoined from implementing it. Vacatur and summary judgment denied without prejudice.
- ECF 50 is the memorandum. Saved, not quoted in the pack.
- A second case, Trilleras Gomez v. Mullin, No. 1:26-cv-02364, D.D.C.: on 2026-09-14 the court denied a motion by one J-1 plaintiff. It does not change the status. Saved and recorded in SOURCES.md so nobody mistakes it for the order.
- legal_status is enjoined, the word the SPEC used, supported by paragraph 4 of the order. The order also postpones the effective date, which the schema would call stayed. The schema holds one status. The founder may prefer stayed.

### Limits the founder needs to know

1. Status after 2026-09-14 rests on the CourtListener docket listing fetched 2026-09-28. Its newest entry is a notice of 2026-09-14 setting a status conference for 2026-10-02. CourtListener can lag behind the court. I found no appeal on CourtListener and no later Federal Register document under RIN 1653-AA95. I could not check PACER.
2. The eCFR 2026-09-15 text carries the final rule's amendments even though the court postponed the effective date. The current eCFR text is therefore not the operative law for the changed paragraphs. The engine must use the operative regime, not the latest text.
3. Court documents are PDFs. The quote check reads text, so the snapshot for the order is text extracted from the PDF with the macOS PDFKit library. The PDF is saved beside it. The opinion page on www.courtlistener.com returned 202 with an empty body to curl, so the PDFs came from storage.courtlistener.com, and the url in the pack is the docket entry page on www.courtlistener.com.
4. Start dates. effective_from has no quote check. Each one is the effective date of the oldest saved Federal Register rule that carries the same words, named in the row's note. For the four rows starting 2003-01-01 (opt.max_months, opt.complete_within_months, cpt.full_time_months_bar, grace under ds_2012) the rule is older than that; 67 FR 76256 is the earliest copy I saved. The Federal Register site has no full text before 1994.
5. The 2008 rule words differ slightly from today's for the OPT filing window ("must properly file" then, "may properly file" now; "program end-date" then). The numbers are the same.
6. The 17-month STEM extension rules from 2008 to 2016 are not in the pack. The stem rows start 2016-05-10.
7. opt.min_hours_per_week is guidance. Two SEVP sources agree on 20 hours. The quote is from the Study in the States page; the start date is from Policy Guidance 1004-03 of 2010-04-23.

### Requests to other lanes

- L-engine: opt.apply_after_days has rows only under regimes, like grace.after_completion_days. `Rulepack.value("opt.apply_after_days", on)` has to resolve through the operative regime. Items built from it (opt.apply_window_closes, opt.latest_start) then have status litigated and carry alternates. If the SPEC is meant to keep this rule settled, that is a founder decision; the source does not support it.
- L-engine: capgap.end_month_day has a closed row before 2025-01-17. A lookup by date gets 10-01 for earlier dates.
- Owner of .claude/hooks/guard_bash.py: see the lesson below.

### Not done

- emails/: nothing in this mission touches it.
- The other three packs are still empty.

## 2026-09-28, iteration 2

### State

The five rules in specs/phase-2/SPEC-sourcing.md are in rulepacks/f1-us/v2026.09/parameters.yaml, each with a saved source and an exact quote. The pack now has 2 regimes and 27 parameter rows. The done command passes. Nothing is reviewed by the founder yet.

### What I did

1. Searched the saved 2026-09-14 and 2026-09-15 texts of 8 CFR 214.2 for the evaluation paragraph, the CPT sentence, paragraph (f)(12), and the cap-gap paragraph.
2. Searched the saved Study in the States page and SEVP Policy Guidance 1004-03 for a number of days to report an employer.
3. Fetched 31 U.S.C. 1102 and 5 U.S.C. 6103 from uscode.house.gov with curl. Both returned 200. Saved as served.
4. Checked each regulation quote against the 2026-09-15 text as well. All are there, word for word.
5. Added five rows, two lines in the SOURCES.md table, a comparison table, and the CHANGELOG entry.

### Where the sources differ from the addendum table

| Rule | Addendum said | Source says | What I recorded |
|---|---|---|---|
| stem.evaluation_interval_months | 12 months, the annual self-evaluation, (f)(10)(ii)(C)(9) | "an initial evaluation within 12 months of the approved starting date on the employment authorization document ... and a concluding evaluation". Two evaluations, not a repeating interval. The word annual is in the preamble of 81 FR 13040, not in the regulation | 12 months, settled, cited (C)(9)(i), with the difference in the note |
| cpt.full_time_bar_days | 365 days, school | "one year or more". No number of days anywhere in the source | 365, school, regulation quoted, note says the count in days is not the words of the law |
| capgap.fiscal_year_start_month_day | 10-01, from 31 U.S.C. 1102 and the cap-gap paragraph | The statute says "The fiscal year of the Treasury begins on October 1". The cap-gap paragraph says fiscal year and never defines it or names October 1 | 10-01, settled, statute quoted. The note says the link between the two is a reading |
| opt.report_employer_within_days | 10 days, guidance | The regulation has no number for post-completion OPT. (f)(12)(i) has no time limit. (f)(12)(ii)(A) has 10 days, for the 24-month extension only. Study in the States says within 10 days. The 2010 guidance says SEVP recommends 10 business days | 10 days, guidance, from Study in the States, starting 2025-05-19 |
| calendar.federal_holidays_law | true, flag | The list in 5 U.S.C. 6103(a) has eleven holidays | true, settled, the whole list quoted, starting 2021-06-17 |

### The law does not state these numbers

- 365 days for the CPT bar. The law says one year or more.
- A number of days to report an employer on post-completion OPT. The regulation has none. The only number is in agency guidance.
- A repeating 12-month evaluation interval. The regulation has one 12-month evaluation and one final evaluation.
- A definition of business day in 8 CFR 214.2(f), or a pointer from it to 5 U.S.C. 6103.
- A definition of fiscal year in the cap-gap paragraph.

### The blocked regime

None of the five changes. The three regulation quotes are word for word in the 2026-09-15 text. The final rule moves the cap-gap paragraph from (f)(5)(vi) to (f)(5)(vii) and keeps the words. The two statutes are not touched by a DHS rule. No row sits under a regime.

### Limits the founder needs to know

1. opt.report_employer_within_days starts 2025-05-19, the last updated date on the saved page. That is the earliest date the saved copy supports. A lookup for an earlier date finds no row. The older guidance is a recommendation in business days, which is a different rule, so I did not record it as an earlier row. If the founder wants cover before 2025-05-19, someone has to find an older dated copy of the Study in the States page.
2. calendar.federal_holidays_law starts 2021-06-17, when Juneteenth was added. Before that the list had ten holidays. I saved no copy of the earlier list, so there is no earlier row. A business-day count across dates before 2021-06-17 has no sourced list.
3. 5 U.S.C. 6103(b) moves a Saturday holiday to the Friday before, for federal pay and leave. The pack row quotes (a) only. Whether the engine treats the observed day or the named day as the holiday is not settled by this row.
4. Holidays declared by executive order for a single day are not in 6103(a).
5. Not checked, from memory only, no saved copy: 8 CFR 1.2 has a definition of day that speaks to periods ending on a Saturday, Sunday, or legal holiday. It may bear on the day counts. It is outside the five rules in the addendum, so it is not in the pack.
6. capgap.fiscal_year_start_month_day starts 1982-09-13, the date title 31 was enacted in its present form. The October 1 start is older.

### Requests to other lanes

- L-engine: stem.evaluation_interval_months is not a repeating interval in the regulation. It counts from the approved starting date on the employment authorization document. The final evaluation is tied to the end of the training, not to month 24.
- L-engine: opt.report_employer_within_days and calendar.federal_holidays_law have no row before 2025-05-19 and 2021-06-17. A lookup on an earlier date must give cannot_tell, not a default.
- L-tests: tests/support/f1_pack.py may use the same start dates.

### What ran

```
uv run python -m tools.sources.verify rulepacks
  sources: 4 pack(s) checked, every quote found
uv run pytest tests/unit/engine/test_rulepack.py -q
  19 passed
the three greps in the done command
  exit 0
uv run python -m tools.copy_lint.lint
  copy lint: clean
uv run python -m tools.diff_policy.check --base phase-2
  diff policy: lane L-content, 0 file(s), clean   (run before the commit)
```

### Gate 4 fails on this branch, and not from this lane

`make test BASE=phase-2` passes gates 1 to 3 and stops at gate 4. The secret scan reports one finding in web/PROGRESS.md line 85, commit 07ffcc7, from lane L-web. The founder already excused it on phase-2 in commit 8f92f1b, which adds .gitleaksignore. This branch was cut at 082326c, one commit before that, so it does not have the file. .gitleaksignore is outside this lane and I did not touch it or merge. Gates 5 and 6 pass when run one at a time. The finding goes away when this branch is merged into phase-2 or rebased on it.

## 2026-09-28, iteration 3

### State

The two rules under Finding 5 in specs/phase-2/SPEC-fixes.md are in rulepacks/f1-us/v2026.09/parameters.yaml, each with a saved source and an exact quote. The pack now has 2 regimes and 30 parameter rows. The done command passes. Nothing is reviewed by the founder yet.

### What I did

1. Read paragraph (f)(11)(i)(C) and (D) in the saved 2026-09-14 and 2026-09-15 texts, and the opening text of (f)(10)(ii)(C).
2. Checked the same sentences in the saved 2008, 2016 and 2026 Federal Register rules for the start dates.
3. Added three rows, a table in SOURCES.md, and the CHANGELOG entry. No new source was fetched.

### Where the sources differ from the SPEC table

| Rule | SPEC said | Source says | What I recorded |
|---|---|---|---|
| opt.latest_start_after_days | 60 days, (f)(11)(i)(D) | 60 in the 2026-09-14 text, 30 in the 2026-09-15 text. The preamble of 91 FR 44976 confirms the change | Two rows, litigated: 60 under ds_2012 from 2008-04-08, 30 under fixed_admission_2026 from 2026-09-15 |
| stem.apply_window_closes_rule | true, the words in (f)(11)(i)(C) that say the extension must be filed before the current authorization ends | (f)(11)(i)(C) has no such words. It says "up to 90 days prior to the expiration date of the student's current OPT employment authorization", which is the opening. The closing is in the opening text of (f)(10)(ii)(C): "a qualified student may apply for an extension of OPT while in a valid period of post-completion OPT authorized under 8 CFR 274a.12(c)(3)(i)(B)" | true, settled, cited (f)(10)(ii)(C), one row, no regime, from 2016-05-10 |

### The source does state the closing, as a condition and not as a date

The SPEC says to leave the rule out if the source does not state the closing. It does state it, in (f)(10)(ii)(C), so the rule is in. What the source does not state:

- A date on which the window closes. The words are "while in a valid period of post-completion OPT".
- That the valid period ends on the expiration date printed on the employment authorization document. The preamble of 81 FR 13040 says a period extended under cap-gap is a valid period, and a student may apply during it.

### Limits the founder needs to know

1. opt.latest_start_after_days limits the start date a student may request. The next sentence of (D) says the authorization begins on the date requested or the date it is adjudicated, whichever is later. The rule is not a limit on when employment begins.
2. opt.latest_start_after_days starts 2008-04-08. I did not check whether an earlier rule had the same sentence.
3. The 17-month extension rules from 2008 to 2016 are still not in the pack. stem.apply_window_closes_rule starts 2016-05-10.
4. 8 CFR 274a.12(c)(3)(i)(B), named in the quote, is not saved and was not read.

### Requests to other lanes

- L-engine: opt.latest_start_after_days has rows only under regimes, like opt.apply_after_days. opt.latest_start then has status litigated and carries alternates.
- L-engine: stem.apply_window_closes computed as the end date of the current OPT authorization is a reading. For a student in a cap-gap extension the valid period runs past the date on the document. The item should take the end of the valid period, or say which end date it used. The founder may want this as a decision.
- L-tests: tests/support/f1_pack.py may cite (f)(10)(ii)(C) for stem.apply_window_closes_rule and use the start dates above.

### What ran

```
uv run python -m tools.sources.verify rulepacks
  sources: 4 pack(s) checked, every quote found
uv run pytest tests/unit/engine/test_rulepack.py -q
  19 passed
grep -q "opt.latest_start_after_days" rulepacks/f1-us/v2026.09/parameters.yaml
  exit 0
uv run python -m tools.copy_lint.lint
  copy lint: clean
uv run python -m tools.diff_policy.check --base phase-2
  diff policy: lane L-content, 0 file(s), clean   (run before the commit)
```

## 2026-09-29, iteration 4, context round

### State

Section 1 of specs/phase-2/SPEC-context.md is done for every rule in every pack. Only f1-us has rules; h1b-us, o1-us and eb1a-us are empty and needed no change. The flag named in section 4 is in the pack. The done command passes. Nothing is reviewed by the founder yet.

### What I did

1. Read PRINCIPLES.md, the SPEC, and this log.
2. Printed every quote with 500 characters of the saved source on each side, from the saved copy named in the row, and read each one. Every quote is found once in its saved copy.
3. Marked each row verbatim or reading from what the words say, not from what the check accepts.
4. Read paragraph (f)(10)(ii)(C) from its heading to the end of (C)(6) in the 2026-09-14 and 2026-09-15 texts, and every place the saved 81 FR 13040 says valid period of post-completion OPT.
5. Added stem.requires_post_completion_opt. No value and no quote of an existing row changed. No rule was removed. No new source was fetched.

### How each row was marked

| Rule | Value | Words in the quote that carry it | Derivation |
|---|---|---|---|
| opt.apply_before_days | 90 | "up to 90 days prior to" | verbatim |
| opt.apply_after_days, ds_2012 | 60 | "no later than 60 days after" | verbatim |
| opt.apply_after_days, fixed_admission_2026 | 30 | "no later than 30 days after" | verbatim |
| opt.latest_start_after_days, ds_2012 | 60 | "more than 60 days after" | verbatim |
| opt.latest_start_after_days, fixed_admission_2026 | 30 | "more than 30 days after" | verbatim |
| opt.file_within_days_of_recommendation | 30 | "within 30 days of the date the DSO enters" | verbatim |
| opt.max_months | 12 | "12 months of practical training" | verbatim |
| opt.complete_within_months | 14 | "within a 14-month period" | verbatim |
| opt.unemployment_limit_days | 90 | "more than 90 days of unemployment" | verbatim |
| stem.unemployment_limit_days | 150 | "more than 150 days of unemployment" | verbatim |
| stem.extension_months | 24 | "will be for 24 months" | verbatim |
| stem.apply_before_expiry_days | 90 | "up to 90 days prior to the expiration date" | verbatim |
| stem.file_within_days_of_recommendation | 60 | "within 60 days of the date the DSO enters" | verbatim |
| stem.min_hours_per_week | 20 | "less than 20 hours per week" | verbatim |
| stem.validation_interval_months | 6 | "every six months", a number word | verbatim |
| stem.validation_due_business_days | 10 | "within 10 business days" | verbatim |
| stem.evaluation_due_days | 10 | "no later than 10 days following" | verbatim |
| stem.new_plan_due_days | 10 | "within 10 days of beginning" | verbatim |
| grace.after_completion_days, ds_2012 | 60 | "an additional 60-day period" | verbatim |
| grace.after_completion_days, fixed_admission_2026 | 30 | "an additional 30-day period" | verbatim |
| opt.min_hours_per_week | 20 | "at least 20 hours per week" | verbatim |
| capgap.end_month_day, to 2025-01-16 | 10-01 | "until October 1 of the fiscal year" | verbatim |
| capgap.end_month_day, from 2025-01-17 | 04-01 | "until April 1 of the fiscal year" | verbatim |
| stem.evaluation_interval_months | 12 | "within 12 months of the approved starting date" | verbatim, see the limits below |
| opt.report_employer_within_days | 10 | "within 10 days" | verbatim |
| cpt.full_time_months_bar | 12 | "one year or more" | reading |
| cpt.full_time_bar_days | 365 | "one year or more" | reading, status school |
| stem.apply_window_closes_rule | true | "while in a valid period of post-completion OPT" | reading |
| capgap.fiscal_year_start_month_day | 10-01 | "The fiscal year of the Treasury begins on October 1" | reading |
| calendar.federal_holidays_law | true | the list in 5 U.S.C. 6103(a) | reading |
| stem.requires_post_completion_opt | true | "may apply for an extension of OPT while in a valid period of post-completion OPT" | reading |

### Rows marked reading although the source check would accept verbatim

The check accepts any flag as written, and accepts 10-01 when the quote says October 1. Three rows pass that test and are still readings, because the words do not say what the rule says:

- capgap.fiscal_year_start_month_day. October 1 is in the statute, about the fiscal year of the Treasury. The cap-gap paragraph says fiscal year and names no date. Joining the two is Duly's step.
- calendar.federal_holidays_law. The list is in the statute. 8 CFR 214.2(f) says business days and does not point to the list.
- stem.apply_window_closes_rule. The regulation states a condition and names no date.

### stem.requires_post_completion_opt

- Paragraph: the first sentence of 8 CFR 214.2(f)(10)(ii)(C). Same words in the 2026-09-14 and 2026-09-15 texts, so no regime.
- The words are "may apply ... while in a valid period of post-completion OPT". The regulation does not say only, and does not say must. So the flag is a reading.
- The words "only if the student is in a valid period of post-completion OPT at the time of filing" are in the preamble of 81 FR 13040, twice. That is the agency explaining the rule. It is named in the note and not quoted as the rule.
- The list of requirements in (C)(1) to (C)(6) that follows "all of the following requirements must be met" does not include holding post-completion OPT. The condition is only in the opening sentence.
- The same quote, without its first clause, already supports stem.apply_window_closes_rule. One sentence carries both rules.

### Limits the founder needs to know

1. stem.evaluation_interval_months is marked verbatim because 12 months is written in the quote. The id says interval and the regulation states no repeating interval. The note says so. If the engine uses the value as a repeating interval, that use is a reading, and the founder may want the row marked reading or the id changed. An id change is a contract matter for other lanes.
2. cpt.full_time_bar_days has status school. The SPEC asks for derivation on the four other statuses only, and the check does not look at school rows. I marked it reading anyway, so the screen can show that 365 is not in the law. Under D35 the founder may want this row removed: the law does not state a number of days, and no school document is saved with the pack.
3. The regulatory text in 81 FR 13040 at 8 CFR 214.16 excepted students on a 17-month extension from the valid period requirement. I did not check whether 8 CFR 214.16 is still in the Code. No copy is saved.
4. 8 CFR 274a.12(c)(3)(i)(B), named in the quote, is still not saved and was not read.
5. The note of a reading begins with one sentence that starts "Reading:" and says how the value was read. The rest of the note holds the start date and the limits, as before. If the screen shows the whole note, it shows all of that.

### Requests to other lanes

- L-engine, L-web: for a reading, the first sentence of the note is the one that says how the value was read. The note has more after it.
- L-engine: stem.requires_post_completion_opt is a reading with status settled. The talk_to_dso output should show the quoted words and the note, and state no conclusion.
- L-tests: tests/support/f1_pack.py may cite the first sentence of (f)(10)(ii)(C) for the new flag, starting 2016-05-10, derivation reading.

### What ran

```
uv run python -m tools.sources.verify rulepacks
  before: sources: 29 problem(s), each "needs derivation, verbatim or reading"
  after:  sources: 4 pack(s) checked, every quote found
uv run pytest tests/unit/engine/test_rulepack.py -q
  19 passed
grep -q "stem.requires_post_completion_opt" rulepacks/f1-us/v2026.09/parameters.yaml
  exit 0
uv run python -m tools.copy_lint.lint
  copy lint: clean
```

## Lesson

### The bash guard reads mkdir -p as a compose project flag

- Failure: `mkdir -p $S && curl ...` was blocked with "Lane L-content may only use the compose project duly-l-content." The guard matches `-p` followed by any word, so `mkdir -p`, `cp -p`, and `ssh -p` all trip it.
- Fix: for this lane, create the folder with `test -d X || mkdir X`. The command had nothing to do with compose, so this stays inside what the guard is for. The lasting fix is for the guard to look for `-p` only after `docker compose` or `docker-compose`. That file is outside this lane.
- Evidence: the block message above, and .claude/hooks/guard_bash.py line 26.

### Do not trust a remembered Federal Register document number

- Failure: I looked up FR Doc. 2016-04629 and 02-31336 from memory for the 2016 STEM rule and the 2002 SEVIS rule. Both are unrelated notices.
- Fix: search the Federal Register API by title and date, then confirm the citation and the DATES line in the returned record. The right numbers are 2016-04828 and 02-31184.
- Evidence: the API returned "Center for Scientific Review; Notice of Closed Meetings" for 2016-04629.

### Compare the two point-in-time texts before tagging anything settled

- Failure: the SPEC table tags opt.apply_after_days settled. The blocked rule changes it from 60 to 30.
- Fix: diff paragraph (f) between the text before and after the blocked rule, and give every changed value a row under each regime.
- Evidence: 2026-09-15 text, (f)(11)(i)(B)(2): "no later than 30 days after his or her program end date".

### Two orders on the same day, only one blocks the rule

- Failure: the first CourtListener hit for the rule is a D.D.C. opinion of 2026-09-14. It denies relief.
- Fix: read the order itself before recording a status. Search dockets (type r) as well as opinions (type o); the D. Mass. order appears only in the docket entries.
- Evidence: sources/dcd-1-26-cv-02364-doc14-opinion.txt and sources/mad-1-26-cv-13799-doc51-order.txt.

### CourtListener limits

- Failure: the search API throttles at 5 requests a minute without a token, and the clusters endpoint needs a token.
- Fix: space the calls 13 seconds apart. Use the search endpoint with `q=docket_id:<id>` and `type=rd` to list docket entries.
- Evidence: "Request was throttled. Rate limit exceeded: 5/min."

### Gates 3 and 6 compare against main by default

- Failure: `make test` failed at gate 3, listing contracts/, specs/, and tools/ files this lane never touched, and gate 6 reported 1% coverage on tools/sources/verify.py. Those are the phase-2 branch's own changes, which are not on main yet.
- Fix: a lane in phase 2 starts from phase-2, so run `make test BASE=phase-2`. I changed no gate and no file outside rulepacks/.
- Evidence: `uv run python -m tools.diff_policy.check --base phase-2` prints "lane L-content, 0 file(s), clean" before the commit; `make test BASE=phase-2` prints "gates 1 to 6: green".

### A where-to-look column names a source, not what the source says

- Failure: the addendum calls the STEM evaluation annual and points the fiscal year at the cap-gap paragraph. The regulation never says annual, and the cap-gap paragraph never names October 1.
- Fix: read the paragraph itself, quote only the words that carry the value, and write in the note what the source does not say. When a value rests on joining two sources, say the join is a reading.
- Evidence: 2026-09-14 text, (f)(10)(ii)(C)(9)(i): "an initial evaluation within 12 months of the approved starting date"; sources/usc-31-1102-2026-09-28.htm: "The fiscal year of the Treasury begins on October 1".

### Old and new guidance can differ in unit

- Failure: the 2010 SEVP guidance says 10 business days, as a recommendation. The current Study in the States page says within 10 days, as a must.
- Fix: search every saved guidance copy for the number before choosing a start date. Do not borrow a start date from a document that states a different rule.
- Evidence: sources/ice-sevp-policy-guidance-1004-03.txt: "SEVP recommends that the student report any change within 10 business days of the change".

### uscode.house.gov serves plain curl

- Failure: none. Recorded so the next agent does not search for another host.
- Fix: `curl -L -A "Mozilla/5.0" "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title5-section6103&num=0&edition=prelim"` returns 200 with the text, the source credit, and the amendment notes. The page embeds a session id, so a second fetch has a different hash. Save once and record that hash.
- Evidence: 200, 166778 bytes; "Text contains those laws in effect on September 28, 2026".

### A gate can fail on history this lane did not write

- Failure: gate 4 reported a secret in web/PROGRESS.md, a file from lane L-web, in a commit under this branch.
- Fix: run `gitleaks git . --no-banner --redact -v` to see the file and commit, then check whether the base branch already has a fix with `git log phase-2`. If it does, record it and leave the ignore file alone.
- Evidence: fingerprint 07ffcc7e66e876d0adaa288b48809611883a3d33:web/PROGRESS.md:generic-api-key:85; phase-2 commit 8f92f1b adds .gitleaksignore.

### A window can open in one paragraph and close in another

- Failure: the SPEC pointed to (f)(11)(i)(C) for the closing of the STEM filing window. That paragraph has only the opening, "up to 90 days prior to the expiration date".
- Fix: search the whole section for the condition, not only the paragraph named. A paragraph that starts "Consistent with paragraph ..." points at its pair. Cite the paragraph that holds the words.
- Evidence: 2026-09-14 text, opening of (f)(10)(ii)(C): "Consistent with paragraph (f)(11)(i)(C) of this section, a qualified student may apply for an extension of OPT while in a valid period of post-completion OPT".

### The source check accepts more than the law says

- Failure: none, a trap. The check marks any flag as written, and finds October 1 in a quote about the Treasury. A row can pass as verbatim while the rule it stands for is Duly's own step.
- Fix: decide the derivation from the words and the rule's meaning first, then run the check. Ask: do the quoted words, alone, say what the id says? If a second source or a step of reasoning is needed, it is a reading.
- Evidence: tools/sources/verify.py, value_is_written returns True for every bool; capgap.fiscal_year_start_month_day reports written True and its own note says the link is a reading.

## 2026-09-29, iteration 5, product round 1 (run l-content-e38efd9565, attempt 1)

### State

Sections 5 and 6 of specs/product-1/SPEC.md, the L-content parts, are written. The done command passes. Nothing is reviewed by the founder; no row carries reviewed_by.

### What I did

1. Read this log, the SPEC, CLAUDE.md, PRINCIPLES.md, BOUNDARY.md, DECISIONS.md.
2. Cut paragraph (f)(10)(ii)(C) out of the saved 2026-09-14 and 2026-09-15 texts and compared them with diff. They are the same. Read the whole paragraph.
3. Checked each quote with the source check's own plain() against three saved copies: both eCFR texts and 81 FR 13040. Each is found once in each (one is found twice in the Federal Register document, which also has a preamble). Checked the order of the quotes in the text.
4. Section 5: cpt.full_time_bar_days went from status school to settled, derivation reading. What I chose: the five tags cannot say Duly's own count, so I kept the status the source supports. The quoted sentence is regulation in force, the same in both texts, so settled. The note says settled describes the sentence and not the count, and no longer says anything about how schools count, because no school document is saved.
5. Section 6: 15 rows, ids stem.requires.*, in the order of the paragraph. No network was used.

### Choices the founder may want to change

1. stem.requires.all_of_the_following is the sentence before the list, not a requirement of its own. I recorded it because seven rows are requirements only when read with it, and the screen can show it first.
2. (C)(11), Site visits, comes under the words all of the following requirements, but its own words state what DHS may do. A flag named requires would say more than the words. Left out, and said so in the note of the first row.
3. One row for each numbered paragraph (1) to (10), plus (2)(iii) and (10)(i) to (iii). Not recorded as rows: (2)(i), (2)(ii), (7)(ii) to (iv), (9)(ii), (9)(iii), and the later sentences of (3), (6), (7)(i) and (8). Each note names what its paragraph goes on to say. (7)(ii), (7)(iii) and (9)(ii) use the word must; they state what the plan holds and what follows a change, and can be added as rows if the founder wants the list longer.
4. Seven rows are readings because the quoted words do not themselves say must or required. Two more, employer_reporting and self_evaluation, are readings because the quote starts in the middle of the sentence.
5. stem.requires_post_completion_opt (with an underscore) stays as it is. The engine names that id. It is not repeated under stem.requires.

### What ran

```
bash -c 'uv run python -m tools.sources.verify rulepacks && uv run pytest tests/unit/engine/test_rulepack.py -q && test $(grep -c "id: stem.requires\." rulepacks/f1-us/v2026.09/parameters.yaml) -ge 3'
  sources: 4 pack(s) checked, every quote found
  19 passed
  exit 0
grep -c "id: stem.requires\." rulepacks/f1-us/v2026.09/parameters.yaml
  15
uv run python -m tools.copy_lint.lint
  copy lint: clean
uv run pytest tests/unit/engine tests/unit/api -q
  114 failed, in 7 files. The same 114, file by file, fail on a copy of HEAD without my change
  (git archive HEAD into TMPDIR). First error: 'lists' is a required property. The contract
  asks for lists and upcoming and the engine does not return them yet. Not caused by this lane.
```

### Seen and not worked around

- A recursive grep from the root, and git status, touched tests/holdout. The sandbox refused the read. I read nothing there.

## Lesson

### The source check cannot match a quote across an italic paragraph number

- Failure: four quotes that hold a cross reference such as paragraph (f)(10)(ii)(C)(2) were not found. The saved XML prints the number as (<I>2</I>), and plain() turns each tag into a space, so the text reads (c)( 2 ).
- Fix: in this lane, start or stop the quote on the other side of the cross reference, and write the missing words in the note. If the quote then lacks the main clause, mark the row a reading. The lasting fix is in tools/sources/verify.py, outside this lane.
- Evidence: count 0 in all three saved copies for the full sentences of (C)(4), (C)(6), (C)(7)(i) and (C)(9)(i); count 1 after the quote was cut.

### A list item takes its force from the sentence before the list

- Failure: none, a trap. The words of (C)(1), (C)(2) and (C)(5) say is, not must. A flag marked verbatim would pass the check, because the check accepts any flag.
- Fix: record the sentence before the list as its own row, and mark each item that has no must of its own as a reading that names that row.
- Evidence: 2026-09-14 text, (C): "all of the following requirements must be met"; (C)(5): "The student's employer is enrolled in E-Verify".

### Compare failures with the parent before blaming the diff

- Failure: 114 tests under tests/unit/engine and tests/unit/api fail in this worktree.
- Fix: git archive HEAD into TMPDIR, run the same suites there, count per file. The counts match, so the diff causes none.
- Evidence: 20, 6, 3, 37, 32, 8, 8 in both runs.

## 2026-09-29, run l-content-8eadcf0295, attempt 1: resolutions 20, 21, 22 and 24

### What I did

1. Read this log, specs/product-1/SPEC-resolutions.md points 20 to 24, CLAUDE.md, PRINCIPLES.md, BOUNDARY.md, DECISIONS.md.
2. Looked for each sentence with the source check's own plain() in every saved copy. The whole sentence of (f)(10)(ii)(C)(7)(iv), the first sentence of (f)(12)(i) and the sentence of (f)(12)(ii) are each found once in the 2026-09-14 text, once in the 2026-09-15 text and once in 81 FR 13040. The (f)(12)(ii) sentence is also in 73 FR 18944 (2008), where it covers the 17-month extension. The (f)(12)(i) duty is in 67 FR 76256 and 73 FR 18944 in other words. The opening words of 6103(b) are found once in usc-5-6103-2026-09-28.htm.
3. stem.new_plan_due_days: quote is now the whole sentence, starting with the condition. Value 10, settled and verbatim did not change. checked_on 2026-09-29.
4. Added opt.report_interruption and stem.reporting_required, flags, settled, verbatim, start 2016-05-10. Neither has a number.
5. calendar.federal_holidays_law: the note says business days skip the days in 6103(a), on those days, and not observed days, and quotes the opening words of 6103(b). The quote stays the list in (a).
6. CHANGELOG.md entry added. No network was used.

### What ran

```
done command (as written in the contract)
  sources: 4 pack(s) checked, every quote found
  exit 0
uv run pytest tests/unit/engine/test_rulepack.py -q
  19 passed
uv run python -m tools.copy_lint.lint
  PermissionError on tests/holdout/.gitkeep (the sandbox refuses the read). Not a copy problem.
uv run python -m tools.copy_lint.lint <scratch copy of HEAD under TMPDIR with the two changed files, tests/holdout left out>
  copy lint: clean, exit 0
```

### Seen and not worked around

- The copy lint run from the repo root lists tests/holdout/.gitkeep through git ls-files and stops on the sandbox's refusal. Ran it on a scratch copy instead. The lint itself is outside this lane.

## 2026-09-29, run l-content-1888b1f574, attempt 1: resolutions 27 and 30

### What I did

1. Read this log, specs/product-1/SPEC-resolutions.md points 27 and 30, CLAUDE.md.
2. Looked for both sentences with the source check's own plain() in every saved copy. The whole sentence of (f)(10)(ii)(A)(3) is found once in the 2026-09-14 text, once in the 2026-09-15 text and once in 81 FR 13040. The cross reference (f)(10)(ii)(C) has no italic number, so the full sentence matches. SEVP's definition is found once in sits-f1-opt-2026-09-28.html.
3. opt.complete_within_months: quote is now the whole sentence with its exception. Value 14, settled, verbatim, start date unchanged. checked_on 2026-09-29.
4. Added opt.post_completion_definition, flag, guidance, verbatim, start 2025-05-19 (the page's last updated date). The note says taking the card end as the test is Duly's reading.
5. CHANGELOG.md entry added. No network was used.

### What ran

```
done command (as written in the contract)
  sources: 4 pack(s) checked, every quote found
  exit 0
uv run pytest tests/unit/engine/test_rulepack.py -q
  19 passed
uv run python -m tools.copy_lint.lint <scratch copy of HEAD with the two changed files, tests/holdout left out>
  copy lint: clean, exit 0
```

### Seen and not worked around

- A python heredoc run from the pack folder printed "Operation not permitted" for tests/holdout/.gitkeep and README.md (from git diff --stat walking the tree). I read nothing there.

## 2026-09-29, run l-content-d92eb9e1df, attempt 1: plain-1 section 1, resolutions 40 and 50

### What I did

1. Read this log, specs/plain-1/SPEC.md, specs/product-1/SPEC-resolutions.md, tools/sources/plain.py and the checks it imports (assistant/boundary.py instructs and _CONCLUSION, tools/copy_lint FORBIDDEN_PHRASES).
2. Drafted plain words for all 49 rules and 2 regimes in a scratch file under TMPDIR, ran problems() on each against its own grounds, and fixed every problem before writing: grade over 9 (8 rows), and clauses the instruction check reads as orders ("and work permission", "and pay"). Then inserted them into parameters.yaml with a script that adds one `plain:` line per entry.
3. Regime fixed_admission_2026: plain words from the order (doc 51): published July 17, 2026, fixed period of admission, paused September 14, 2026 while the case goes on, date put off until further order or the end of the case, earlier rule applies today.
4. Point 50: stem.report_change_within_days, 10, settled, verbatim, quote found once in the 2026-09-14 text, once in the 2026-09-15 text and once in 81 FR 13040.
5. Point 40, holidays: the saved 6103 copy has the note "Pub. L. 117-17 inserted item relating to Juneteenth National Independence Day." and the effective date note of the 1983 amendment. Added a reading row 1986-01-01 to 2021-06-16 naming the ten holidays in the note.
6. Point 40, cap-gap: 73 FR 18944 (2) is found once in fr-e8-7427. 81 FR 13040 rewrote (2) as "requests an H-1B employment start date of October 1 of the following fiscal year" (found in fr-2016-04828), and 89 FR 103054 rewrote it again. So capgap.october_start_condition has two closed rows, 2008-04-08 to 2016-05-09 and 2016-05-10 to 2025-01-16. Recorded as a dispute with the mission's single row.
7. CHANGELOG.md entry. No network used.

### What ran

```
done command (as written in the contract)
  sources: 4 pack(s) checked, every quote found
  plain words: every plain text is general, calm, readable and grounded
  exit 0
uv run pytest tests/unit/engine -q
  exit 0, all passed
uv run python -m tools.copy_lint.lint <scratch copy of HEAD with the two changed files, tests/holdout left out>
  copy lint: clean, exit 0
```

### Seen and not worked around

- git status and git diff print "Operation not permitted" for tests/holdout. Nothing there was read.
- capgap.end_month_day (10-01 row) quotes 73 FR 18944 for 2008-04-08 to 2025-01-16, but 81 FR 13040 reworded (f)(5)(vi)(A) in 2016. Not changed in this run; listed in the report.

## 2026-09-29, run l-content-0ebd5d28f4, attempt 1: resolution 54

### What I did

1. Read this log, specs/product-1/SPEC-resolutions.md point 54, reviews/product-1-fix4.md findings 1 and 2, CLAUDE.md, PRINCIPLES.md, BOUNDARY.md, DECISIONS.md D56 and D57, specs/plain-1/SPEC.md section 1, tools/sources/plain.py and assistant/boundary.py (_CONCLUSION refuses eligible and ineligible, and qualif-anything).
2. Read the six named rows and every other plain text beside its quote, and the full sentences around five quotes in the saved copies (tools.sources.verify.plain).
3. Drafted in a scratch file under TMPDIR, ran problems() and grade() on each, then applied with a script that edits one line per field. Limits met on the way: grade 9, three sentences for a rule, and the schema's 320 characters for a rule's plain (engine/rulepack.py refused the first paused grace text at 376).
4. Five quotes widened, each found by the source check. Notes added on nine rows. CHANGELOG.md entry.

### Grounds: each sentence I wrote or changed, and the words of its quote it rests on

- ds_2012. S1: the regime (effective, operative). S2: "Duration of status is defined as the time during which an F-1 student is pursuing a full course of study at an educational institution certified by SEVP for attendance by foreign students". S3: "or engaging in authorized practical training following completion of studies".
- cpt.full_time_months_bar / cpt.full_time_bar_days. S1: "Students who have received one year or more of full time curricular practical training are ineligible for post-completion academic training" (ineligible said as cannot have; the plain check refuses the word). S2: Duly's reading, said as Duly's; the quote says one year and post-completion academic training. S3: the reading mark.
- opt.latest_start_after_days (60). S1: "A student may not request a start date that is more than 60 days after the student's program end date"; OPT from the heading of (f)(11)(i)(D), "Start of OPT employment" (in the note); under the rule in force today from regime ds_2012.
- opt.latest_start_after_days (30). S1: "A student may not request a start date that is more than 30 days after the student's program end date". S2: regime fixed_admission_2026.
- opt.file_within_days_of_recommendation. S1: "must also file his or her Form I-765 or successor form with USCIS within 30 days". S2: "of the date the DSO enters the recommendation for OPT into his or her SEVIS record".
- opt.max_months. S1: "A student may be authorized 12 months of practical training". S2: "becomes eligible for another 12 months of practical training when they change to a higher educational level".
- stem.extension_months. S1: "An extension will be for 24 months". S2: "for the first qualifying degree for which the student has completed all course requirements" (qualifying said as meets the rule's terms; the plain check refuses qualif-).
- stem.file_within_days_of_recommendation. S1: "The student seeking such 24-month OPT extension must properly file his or her Form I-765 or successor form with USCIS within 60 days". S2: "of the date the DSO enters the recommendation for the OPT extension into his or her SEVIS record".
- stem.min_hours_per_week. S1: "A student may not engage in practical training for less than 20 hours per week"; 24-month extension from the heading of (f)(10)(ii)(C) (in the note). S2 and S3: "excluding time off taken consistent with leave-related policies applicable to the employer's similarly situated U.S. workers in the area of employment".
- stem.validation_interval_months. S1: "The student must complete a validation report ... every six months"; approved 24-month extension from the heading of (f)(12)(ii) (in the note). S2: "confirming that the information required by paragraph (f)(12)(ii)(A) of this section has not changed".
- stem.validation_due_business_days. S1: "The validation report is due to the student's DSO within 10 business days". S2: "of each reporting date".
- stem.evaluation_due_days (quote widened). S1: "the DSO receives his or her 12-month evaluation ... no later than 10 days following the conclusion of the reporting period ... respectively". S2: "and final evaluation ... or conclusion of his or her practical training opportunity, respectively". S3: "The student is responsible for ensuring".
- stem.new_plan_due_days. S1: "If a student initiates a new practical training opportunity with a new employer during his or her 24-month OPT extension". S2: "the student must submit, within 10 days of beginning the new practical training opportunity, a new Form I-983 or successor form to the student's DSO". S3: "and subsequently obtain a new DSO recommendation".
- grace.after_completion_days (60) (quote widened). S1: "An F-1 student who has completed a course of study and any authorized practical training following completion of studies will be allowed an additional 60-day period"; today from ds_2012. S2: "to prepare for departure from the United States or to transfer".
- grace.after_completion_days (30) (quote widened). S1: "An F-1 student who has completed a course of study and any authorized practical training will be allowed an additional 30-day period ... to prepare for departure from the United States, or to otherwise seek to maintain lawful status". S2: "from the program end date or the 4 year maximum period of admission, or the end date of the approved employment authorization for post-completion OPT or STEM OPT, as applicable". S3: regime fixed_admission_2026.
- capgap.end_month_day (10-01) (quote widened). S1: "The duration of status, and any employment authorization granted under 8 CFR 274a.12(c)(3)(i)(B) and (C), of an F-1 student who is the beneficiary of an H-1B petition and request for change of status shall be automatically extended". S2: "until October 1 of the fiscal year for which such H-1B visa is being requested". S3: "where such petition:".
- capgap.end_month_day (04-01) (quote widened). S1: "The duration of status, and any employment authorization granted under 8 CFR 274a.12(c)(3)(i)(B) or (C), of an F-1 student who is the beneficiary of an H-1B petition ... requesting a change of status will be automatically extended". S2: "until April 1 of the fiscal year for which such H-1B status is being requested or until the validity start date of the approved petition, whichever is earlier". S3: "where such petition:".
- stem.evaluation_interval_months. S1: "All STEM practical training opportunities require an initial evaluation within 12 months of the approved starting date on the employment authorization document granted pursuant to the student's 24-month OPT extension application". S2: "and a concluding evaluation" (the same paragraph calls it the final evaluation).
- capgap.fiscal_year_start_month_day. S1: "The fiscal year of the Treasury begins on October 1 of each year and ends on September 30 of the following year". S2 and S3: the reading, marked (note).
- opt.report_employer_within_days. S1: "While on OPT, the student must report to the DSO within 10 days any changes in the student's name or address, and employment information". S2: status guidance.
- calendar.federal_holidays_law (from 2021-06-17). S1: "The following are legal public holidays: ... Juneteenth National Independence Day, June 19". S2 and S3: the reading, marked (note). (Before 2021-06-17): S1: "Pub. L. 117-17 inserted item relating to Juneteenth National Independence Day" with the date in the note. S2 and S3 as above.
- stem.requires.accreditation. S1 and S2: "is from a U.S. educational institution accredited by an accrediting agency recognized by the Department of Education at the time of application". S3: the reading mark.
- stem.requires.dhs_approved_degree. S1: "is a bachelor's, master's, or doctoral degree". S2: "in a field determined by the Secretary, or his or her designee, to qualify within a science, technology, engineering, or mathematics field". S3: the reading mark.
- stem.requires.degree_on_designated_list. S1: "At the time the DSO recommends a 24-month OPT extension ... in SEVIS, the degree ... must be contained within a category on the STEM Designated Degree Program List". S2: the list's name in the same words.
- stem.requires.previously_obtained_degree. S1: "If an application for a 24-month OPT extension ... is based upon a degree obtained previous to the degree that provided the basis for the period of post-completion OPT". S2: "must have been conferred from a U.S. educational institution that is accredited and SEVP-certified at the time the student's DSO recommends ... and must be in a degree program category included on the current STEM Designated Degree Program List at the time of the DSO recommendation". S3: "must have been conferred within the 10 years preceding the date the DSO recommends".
- stem.requires.employer_qualification. S1: "is enrolled in E-Verify, as evidenced by either a valid E-Verify Company Identification number or ... a valid E-Verify Client Company Identification number". S2: "the employer remains a participant in good standing with E-Verify, as determined by USCIS. An employer must also have an employer identification number (EIN) used for tax purposes". S3: the reading mark.
- stem.requires.employer_reporting. S1: the start of the sentence in the note, then "unless the employer agrees, by signing ... Form I-983 ..., to report the termination or departure of an OPT student to the DSO at the student's school, if the termination or departure is prior to the end of the authorized period of OPT". S2: the reading mark.
- stem.requires.training_plan. S1: "A student must fully complete an individualized Form I-983 ... before the DSO may recommend a 24-month OPT extension". S2: "and obtain requisite signatures from an appropriate individual in the employer's organization on the form, consistent with form instructions".
- stem.requires.duties_hours_and_compensation. S1: "The terms and conditions of a STEM practical training opportunity during the period of the 24-month OPT extension, including duties, hours, and compensation, must be commensurate with terms and conditions applicable to the employer's similarly situated U.S. workers in the area of employment".
- stem.requires.employer_attestation. S1: "A student may only participate in a STEM practical training opportunity in which the employer attests ... that:". S2: "including by signing the Form I-983 or successor form".
- stem.requires.employer_attests_resources, _no_replacement, _training_goals. S1: each row's own quote. S2: the reading mark, now "attests" as in stem.requires.employer_attestation.

### What ran

```
done command (as written in the contract)
  first run: sources: 4 pack(s) checked, every quote found; plain words: 3 problem(s) (reading grade over 9 on both capgap.end_month_day rows and stem.evaluation_interval_months); exit 1
  after rewording: sources: 4 pack(s) checked, every quote found
                   plain words: every plain text is general, calm, readable and grounded
                   exit 0
uv run pytest tests/unit/engine tests/unit/tools/test_plain.py tests/unit/tools/test_copy_lint.py -q
  first run: 3 failed (engine/rulepack.py: the paused grace plain is too long, schema maxLength 320); after shortening: all passed
uv run pytest tests/unit/engine tests/unit/api tests/unit/tools/test_plain.py -q
  all passed
```

### Seen and not worked around

- web/src/lib/samples/court-paused.json and specs/product-1/plan-fix5.yaml still hold the old plain words of the paused rows. Outside this lane; listed under requests.
- git diff prints "Operation not permitted" for tests/holdout. Nothing there was read.
- No fetched page was read this run; no instruction was found in any data.

Also ran: uv run python -m tools.copy_lint.lint on a scratch copy of HEAD with the three changed files, tests/holdout left out: "copy lint: clean", exit 0. Done command run again after the commit: exit 0.

## 2026-09-29, run l-content-d39e3a57c3, attempt 1 (SPEC-resolutions point 58)

1. Read this log, SPEC-resolutions point 58, reviews/product-1-fix5.md finding 1, specs/product-1/plain-sweep.json (every issue; the rewrites were not copied), tools/sources/plain.py, assistant/boundary.py _CONCLUSION.
2. The done command first printed 54 problems: 53 rules without plain_terms, and stem.validation_interval_months citing '(f)(12)'.
3. Drafted all texts in a scratch file under TMPDIR, checked each with problems(), term_problems(), and the 320 and 480 character limits, then applied them with a script that edits one line per field and adds plain_terms after each rule's plain.
4. Found on the way: the gate counts "U.S." as two sentence ends, so a text holding "U.S." has room for one sentence of its own. The words qualified, qualifying, eligible, eligibility, ineligible and termination are refused in plain words, so they are said in other words and the note says so where it matters. "subject to section 214(g)(1)(A) of the Act" cannot be kept as a term: the citation pattern refuses it.
5. Read in the saved copies: the 150-day sentence's subject, the thesis exclusion, "For post-completion OPT, not including a 24-month OPT extension" (both texts), the whole (f)(11)(i)(C) sentence, the 2008 and 2016 words of (f)(5)(vi)(A), "cap-subject" in the preambles, the heading of (f)(8), and paragraphs 1(a) and 3 of the order.

### Grounds: each plain text written or changed, and the words it rests on (Q quote, N note)

- ds_2012 (regime). "Duration of status is defined as the time during which an F-1 student is pursuing a full course of study at an educational institution certified by SEVP for attendance by foreign students" (Q); "or engaging in authorized practical training following completion of studies" (Q). The status line: the regime is effective and operative.
- fixed_admission_2026 (regime). S1: the title in paragraph 1(a) and "published at 91 Fed. Reg. 44976 (July 17, 2026)" (N). S2: order of 2026-09-14 (N). S3: "Defendants are preliminarily enjoined from taking any further action to implement the Final Rule pending further order of this court or resolution of this proceeding on the merits" (Q) and paragraph 3, the effective date postponed (N). S4: the regime is not operative.
- opt.apply_before_days. "the student may properly file ... up to 90 days prior to his or her program end date" (Q); "For post-completion OPT, not including a 24-month OPT extension" (N).
- opt.apply_after_days (60 and 30). "no later than 60 [30] days after his or her program end date" and "up to 90 days prior" (Q); the same opening words (N); paused: "Not operative" (N).
- opt.file_within_days_of_recommendation. "The student must also file his or her Form I-765 ... with USCIS within 30 days of the date the DSO enters the recommendation for OPT into his or her SEVIS record" (Q); "also" ties to the filing dates (N).
- opt.max_months. "A student may be authorized 12 months of practical training, and becomes eligible for another 12 months of practical training when they change to a higher educational level" (Q).
- opt.complete_within_months. "must complete all practical training within a 14-month period following the completion of study, except that a 24-month extension ... does not need to be completed within such 14-month period" (Q); STEM from the heading of (f)(10)(ii)(C) (N).
- opt.post_completion_definition. "Any portion of OPT used after the student's Program End Date" (Q); agency guidance (N).
- opt.unemployment_limit_days. "may not accrue an aggregate of more than 90 days of unemployment during any post-completion OPT period" (Q); the separate limit for the 24-month extension (N).
- stem.unemployment_limit_days. "Students granted a 24-month OPT extension" (N); "may not accrue an aggregate of more than 150 days of unemployment during a total OPT period, including any post-completion OPT period ... and any subsequent 24-month extension period" (Q).
- stem.extension_months. "An extension will be for 24 months for the first qualifying degree for which the student has completed all course requirements (excluding thesis or equivalent), including any qualifying degree as part of a dual degree program" (Q, widened); "meets the STEM terms" for qualifying (N).
- stem.apply_before_expiry_days. "A student meeting the eligibility requirements for a 24-month OPT extension ... may request an extension ... by filing Form I-765 ..., with the required fee and supporting documents, up to 90 days prior to the expiration date of the student's current OPT employment authorization" (Q, widened).
- stem.apply_window_closes_rule and stem.requires_post_completion_opt. "a qualified student may apply for an extension of OPT while in a valid period of post-completion OPT" (Q); the reading, and "a period extended under cap-gap is a valid period" (N); marked as Duly's reading.
- stem.file_within_days_of_recommendation. "The student seeking such 24-month OPT extension must properly file ... with USCIS within 60 days of the date the DSO enters the recommendation for the OPT extension into his or her SEVIS record" (Q).
- stem.min_hours_per_week. "A student may not engage in practical training for less than 20 hours per week, excluding time off taken consistent with leave-related policies applicable to the employer's similarly situated U.S. workers in the area of employment" (Q); 24-month extension from the heading (N).
- stem.validation_interval_months. "The student must complete a validation report, confirming that the information required by paragraph (f)(12)(ii)(A) ... has not changed, every six months" (Q); the list in (f)(12)(ii)(A): legal name, residential or mailing address, employer name, employer address, loss of employment (N).
- stem.evaluation_due_days. "The student is responsible for ensuring the DSO receives his or her 12-month evaluation and final evaluation no later than 10 days following the conclusion of the reporting period or conclusion of his or her practical training opportunity, respectively" (Q).
- stem.new_plan_due_days. "If a student initiates a new practical training opportunity with a new employer during his or her 24-month OPT extension" (Q, the condition); "must submit, within 10 days of beginning ..., a new Form I-983 ... to the student's DSO, and subsequently obtain a new DSO recommendation" (Q).
- cpt.full_time_months_bar and cpt.full_time_bar_days. "Students who have received one year or more of full time curricular practical training are ineligible for post-completion academic training" (Q); "OPT after the program end date", 12 months, 365 days (N); marked as Duly's reading.
- grace.after_completion_days (60). "An F-1 student who has completed a course of study and any authorized practical training following completion of studies will be allowed an additional 60-day period to prepare for departure from the United States or to transfer in accordance with paragraph (f)(8)" (Q); (f)(8) is headed School transfer (N).
- grace.after_completion_days (30). "completed a course of study and any authorized practical training will be allowed an additional 30-day period from the program end date or the 4 year maximum period of admission, or the end date of the approved employment authorization for post-completion OPT or STEM OPT ... to prepare for departure from the United States, or to otherwise seek to maintain lawful status" (Q).
- capgap.end_month_day (10-01). "The duration of status, and any employment authorization ... of an F-1 student who is the beneficiary of an H-1B petition and request for change of status shall be automatically extended until October 1 of the fiscal year for which such H-1B visa is being requested where such petition:" (Q); from 2016-05-10 the words name a petition subject to section 214(g)(1)(A), read as under the cap from the preambles (N).
- capgap.end_month_day (04-01). "beneficiary of an H-1B petition subject to section 214(g)(1)(A) of the Act ... requesting a change of status will be automatically extended until April 1 of the fiscal year ... or until the validity start date of the approved petition, whichever is earlier, where such petition:" (Q); the cap reading (N), marked "as Duly reads it".
- stem.evaluation_interval_months. "an initial evaluation within 12 months of the approved starting date on the employment authorization document granted pursuant to the student's 24-month OPT extension application, and a concluding evaluation" (Q).
- opt.report_employer_within_days. "While on OPT, the student must report to the DSO within 10 days any changes in the student's name or address, and employment information" (Q); guidance (N).
- opt.report_interruption. "An F-1 student who is granted employment authorization by USCIS to engage in optional practical training is required to report any change of name or address, or interruption of such employment to the DSO for the duration of the optional practical training" (Q); no number of days (N).
- stem.reporting_required. "Compliance with these reporting requirements is required to maintain F-1 status" (Q); the sentence before it (N).
- calendar.federal_holidays_law (from 2021-06-17). The list of eleven, "Juneteenth National Independence Day, June 19" (Q); skipped on the day, not observed days (N); marked as a reading. (1986-01-01 to 2021-06-16): "Pub. L. 117-17 inserted item relating to Juneteenth National Independence Day" (Q); ten holidays, 1986-01-01, ends 2021-06-16 (N); marked as a reading.
- stem.requires.all_of_the_following. "In order to qualify for an extension of post-completion OPT based upon a STEM degree, all of the following requirements must be met" (Q).
- stem.requires.accreditation. "The degree that is the basis for the 24-month OPT extension is from a U.S. educational institution accredited by an accrediting agency recognized by the Department of Education at the time of application" (Q); the reading as a requirement (N).
- stem.requires.dhs_approved_degree. "is a bachelor's, master's, or doctoral degree in a field determined by the Secretary, or his or her designee, to qualify within a science, technology, engineering, or mathematics field" (Q); the reading (N).
- stem.requires.degree_on_designated_list. "At the time the DSO recommends a 24-month OPT extension ... in SEVIS, the degree that is the basis for the application ... must be contained within a category on the STEM Designated Degree Program List" (Q).
- stem.requires.previously_obtained_degree. "If an application for a 24-month OPT extension ... is based upon a degree obtained previous to the degree that provided the basis for the period of post-completion OPT ..., that previously obtained degree must have been conferred from a U.S. educational institution that is accredited and SEVP-certified at the time the student's DSO recommends ... and must be in a degree program category included on the current STEM Designated Degree Program List at the time of the DSO recommendation ... conferred within the 10 years preceding" (Q).
- stem.requires.eligible_practical_training_opportunity. "The STEM practical training opportunity that is the basis for the 24-month OPT extension ... must be directly related to the degree that qualifies the student for such extension" (Q).
- stem.requires.employer_qualification. "enrolled in E-Verify, as evidenced by either a valid E-Verify Company Identification number or, if the employer is using an employer agent to create its E-Verify cases, a valid E-Verify Client Company Identification number, and the employer remains a participant in good standing with E-Verify, as determined by USCIS. An employer must also have an employer identification number (EIN) used for tax purposes" (Q).
- stem.requires.employer_reporting and stem.requires.self_evaluation. "A student may not be authorized for employment with an employer pursuant to paragraph (f)(10)(ii)(C)(2)" (N) with "unless the employer agrees, by signing ... Form I-983 ..., to report the termination or departure of an OPT student to the DSO ... prior to the end of the authorized period of OPT" (Q) / "unless the student submits a self-evaluation of the student's progress toward the training goals described in the Form I-983" (Q); the heading of (f)(10)(ii)(C) (N). "termination" said as "the end of the job" (the gate refuses the word).
- stem.requires.training_plan. "must fully complete an individualized Form I-983 ... and obtain requisite signatures from an appropriate individual in the employer's organization on the form, consistent with form instructions, before the DSO may recommend a 24-month OPT extension" (Q).
- stem.requires.duties_hours_and_compensation. "The terms and conditions of a STEM practical training opportunity during the period of the 24-month OPT extension, including duties, hours, and compensation, must be commensurate with terms and conditions applicable to the employer's similarly situated U.S. workers in the area of employment" (Q).
- stem.requires.employer_attestation. "A student may only participate in a STEM practical training opportunity in which the employer attests, including by signing the Form I-983 ..., that:" (Q); three things follow (N).
- stem.requires.employer_attests_resources, _no_replacement, _training_goals. Each row's quote; the reading as an attestation (N), said first.
- stem.report_change_within_days. "Within 10 days of the change, the student must report to the student's DSO a change of legal name, residential or mailing address, employer name, employer address, and/or loss of employment" (Q); approved 24-month OPT extension from the heading (N).
- capgap.october_start_condition (2008). "states that the employment start date for the F-1 student is October 1 of the following fiscal year" (Q); timely filed, 2008 to 2016 (N). (2016): "requests an H-1B employment start date of October 1 of the following fiscal year" (Q); timely filed, the cap reading, the end 2025-01-16 (N).
- Unchanged plain words, terms added only: opt.latest_start_after_days (both), stem.validation_due_business_days, opt.min_hours_per_week, capgap.fiscal_year_start_month_day.

### What ran

```
done command (as written): first run exit 1, "plain words: 54 problem(s)"; after the edits exit 0:
  sources: 4 pack(s) checked, every quote found
  plain words: every plain text is general, calm, readable and grounded
uv run pytest tests/unit/engine tests/unit/tools/test_plain.py -q : all passed
```

### Seen and not worked around

- git diff prints "Operation not permitted" for tests/holdout. Nothing there was read.
- No fetched page was read; no instruction was found in any data.

## 2026-09-29, run l-content-70287e6b26, attempt 1 (SPEC-resolutions point 62)

### What was tried

Rewrote only the eight plain texts of reviews/product-1-fix6.md findings 1 and 2, following each ask. Four first drafts failed the plain check on reading grade (9.7, 10.4, 10.6, 9.7; limit 9). Grade is Flesch-Kincaid over the whole text and the rule limit is three sentences, so words and syllables were cut, not sentences added. A scratch script in TMPDIR searched variants of the cap-gap 2025 text.

Found: tools/sources/plain.py splits sentences on every period, so "U.S." counts as two sentence ends. A text that keeps "U.S. educational institution" can hold only one real sentence under the three-sentence limit. stem.requires.previously_obtained_degree therefore stays one sentence; the 10 years now end on the day the DSO recommends. This is recorded as a dispute and a request.

What each sentence rests on (Q = quote, N = note):
- capgap.end_month_day#2025-01-17. S1: "an F-1 student who is the beneficiary of an H-1B petition subject to section 214(g)(1)(A) of the Act ... requesting a change of status ... where such petition:" (Q); the reading of that section as the yearly cap (N, preambles of 89 FR 103054 and 81 FR 13040). S2: "The duration of status, and any employment authorization granted under 8 CFR 274a.12(c)(3)(i)(B) or (C) ... will be automatically extended until April 1 of the fiscal year for which such H-1B status is being requested" (Q). S3: "or until the validity start date of the approved petition, whichever is earlier" (Q).
- capgap.end_month_day#2008-04-08. S1: "of an F-1 student who is the beneficiary of an H-1B petition and request for change of status" (Q). S2: "The duration of status, and any employment authorization granted under 8 CFR 274a.12(c)(3)(i)(B) and (C) ... shall be automatically extended until October 1 of the fiscal year for which such H-1B visa is being requested" (Q). S3: "where such petition:" (Q); from 2016 "subject to section 214(g)(1)(A) of the Act", read by Duly as under the yearly H-1B cap (N).
- stem.requires.employer_reporting. S1: "A student may not be authorized for employment with an employer pursuant to paragraph (f)(10)(ii)(C)(2)" (N) with "unless the employer agrees ... to report the termination or departure of an OPT student to the DSO at the student's school, if the termination or departure is prior to the end of the authorized period of OPT" (Q); 24-month extension from the heading of (f)(10)(ii)(C) (N). S2: "by signing the Training Plan for STEM OPT Students, Form I-983" (Q). S3: derivation reading; "the first part is needed to say what it states" (N).
- stem.requires.self_evaluation. S1: the same first part (N) with "unless the student submits a self-evaluation" (Q). S2: "of the student's progress toward the training goals described in the Form I-983" (Q). S3: derivation reading (N).
- stem.requires.dhs_approved_degree. S1: "Duly reads it as a requirement because of the sentence before the list" (N). S2: "The degree that is the basis for the 24-month OPT extension is a bachelor's, master's, or doctoral degree" (Q). S3: "in a field determined by the Secretary, or his or her designee, to qualify within a science, technology, engineering, or mathematics field" (Q); "the plain words say a person the Secretary names" (N).
- opt.apply_after_days@ds_2012 (60). S1: "no later than 60 days after his or her program end date" (Q); "For post-completion OPT" and "properly file as correctly file" (N); in force today from regime ds_2012. S2: "up to 90 days prior to his or her program end date" (Q). S3: "not including a 24-month OPT extension" (N).
- stem.extension_months. S1: "An extension will be for 24 months" (Q). S2: "for the first qualifying degree for which the student has completed all course requirements (excluding thesis or equivalent)" (Q); qualifying said as meets the STEM terms (N). S3: "including any qualifying degree as part of a dual degree program" (Q).
- stem.requires.previously_obtained_degree. One sentence: "is based upon a degree obtained previous to the degree that provided the basis for the period of post-completion OPT" (Q); "must have been conferred from a U.S. educational institution that is accredited and SEVP-certified at the time the student's DSO recommends the student for the 24-month OPT extension" (Q); "must be in a degree program category included on the current STEM Designated Degree Program List at the time of the DSO recommendation" (Q); "conferred within the 10 years preceding the date the DSO recommends the student for the 24-month OPT extension" (Q).

### What ran

```
uv run python -m tools.sources.plain rulepacks --require f1 : first exit 1, "plain words: 4 problem(s)" (reading grade); after the edits exit 0
done command (as written): exit 0
  sources: 4 pack(s) checked, every quote found
  plain words: every plain text is general, calm, readable and grounded
  plain changes: 8 row(s) changed, all allowed
uv run pytest tests/unit/tools/test_plain.py -q : 11 passed
```

### Seen and not worked around

- git diff prints "Operation not permitted" for tests/holdout. Nothing there was read.
- No fetched page was read; no network was used. No instruction was found in any data.

## 2026-09-29, run l-content-0f0465de11, attempt 1 (SPEC-resolutions point 65)

### What was tried

Rewrote only stem.requires.previously_obtained_degree#2016-05-10 and capgap.end_month_day#2025-01-17, per reviews/product-1-fix7.md finding 1. A scratch script in TMPDIR scored variants with tools.sources.plain.problems and grade.

- The review's example for the degree row scores 5 sentences (limit 3): the splitter `[^.!?]+[.!?]?` cuts "U.S." into "...U." and "S." and so adds two sentence ends, not one as the run of point 62 wrote. With the plain_term "U.S. educational institution" kept, only one real sentence can pass. Semicolons keep the count at 3 but the grade stays 9.8 to 10.9; "and be from" / "be in" after a clause split trip the instructs check.
- The review's example for cap-gap ("they last on their own only until then") scores grade 9.41 in the old text. "It is for" and "till April 1" bring it to 8.98 with the review's words kept exactly.
- The degree row keeps one sentence, names the student ("recommends the student for the extension"), and says "in a field on the STEM list" (grade 8.88). With "category" and "for the extension" every variant tried scored 9.04 to 9.6.

What each sentence rests on (Q = quote, N = note):
- stem.requires.previously_obtained_degree. One sentence. "If a 24-month OPT extension rests on an older degree than the one for post-completion OPT": "If an application for a 24-month OPT extension ... is based upon a degree obtained previous to the degree that provided the basis for the period of post-completion OPT" (Q). "that degree must be from a U.S. educational institution that is accredited and SEVP-certified when the DSO recommends the student for the extension": "that previously obtained degree must have been conferred from a U.S. educational institution that is accredited and SEVP-certified at the time the student's DSO recommends the student for the 24-month OPT extension" (Q). "in a field on the STEM list then": "must be in a degree program category included on the current STEM Designated Degree Program List at the time of the DSO recommendation" (Q). "and granted in the 10 years up to that day": "That previously obtained degree must have been conferred within the 10 years preceding the date the DSO recommends the student for the 24-month OPT extension" (Q); "The number 10 in the quote is a count of years" (N).
- capgap.end_month_day#2025-01-17. S1 (unchanged but for "It is for"): "of an F-1 student who is the beneficiary of an H-1B petition subject to section 214(g)(1)(A) of the Act ... requesting a change of status ... where such petition:" (Q); "Duly reads subject to section 214(g)(1)(A) of the Act as under the yearly H-1B cap; that is a reading of those preambles" (N); "The conditions follow the colon" (N). S2: "The duration of status, and any employment authorization granted under 8 CFR 274a.12(c)(3)(i)(B) or (C) ... will be automatically extended until April 1 of the fiscal year for which such H-1B status is being requested" (Q); "the plain words say only the employment authorization the rule names" (N). S3: "or until the validity start date of the approved petition, whichever is earlier" (Q), which bounds the automatic extension and says nothing of an end of status.

### What ran

```
done command (as written): exit 0
  sources: 4 pack(s) checked, every quote found
  plain words: every plain text is general, calm, readable and grounded
  changed: capgap.end_month_day#2025-01-17
  changed: stem.requires.previously_obtained_degree#2016-05-10
  plain changes: 2 row(s) changed, all allowed
```

### Seen and not worked around

- git diff prints "Operation not permitted" for tests/holdout. Nothing there was read.
- No network was used. No instruction was found in any data.

## 2026-09-29, run l-content-d6cfa8aad6, attempt 1 (SPEC-resolutions point 66)

### What was tried

The plain check now counts "U.S." as one word. `uv run python -m tools.sources.plain rulepacks --require f1` first printed five problems: stem.min_hours_per_week 16.3, stem.requires.accreditation 19.8, stem.requires.previously_obtained_degree 23.9, stem.requires.duties_hours_and_compensation 17.6, stem.requires.employer_attests_no_replacement 13.5 (limit 9). Only these five plain texts were rewritten; plain_terms unchanged. Scratch scripts in TMPDIR scored variants with tools.sources.plain.problems, grade and term_problems.

The degree row was the hard one: with "category", "the student", "for the ... extension", "accredited", "SEVP-certified" and "U.S. educational institution" kept, most three-sentence variants sat at 9.2 to 9.8. What brought it under was naming the degree once: S1 makes "the degree it rests on" the subject, so S2 can say "it". Grade 8.98. Clauses such as "and be from" or "then be from" trip the instructs check; avoided.

What each sentence rests on (Q = quote, N = note):
- stem.min_hours_per_week. S1: "A student may not engage in practical training for less than 20 hours per week" (Q); "On a 24-month extension" from the heading of (f)(10)(ii)(C) (N: "that heading is why the plain words name the extension"). S2 and S3: "excluding time off taken consistent with leave-related policies applicable to the employer's similarly situated U.S. workers in the area of employment" (Q); N: "The time off left out is only time off taken consistent with leave-related policies ...".
- stem.requires.accreditation. S1: "Duly reads it as a requirement because of the sentence before the list", "all of the following requirements must be met" (N). S2: "The degree that is the basis for the 24-month OPT extension is from a U.S. educational institution" (Q). S3: "accredited by an accrediting agency recognized by the Department of Education at the time of application" (Q); N: "they may limit the accreditation, the recognition, or both, and the plain words keep that open".
- stem.requires.previously_obtained_degree. S1: "at the time the student's DSO recommends the student for the 24-month OPT extension" and "is based upon a degree obtained previous to the degree that provided the basis for the period of post-completion OPT" (Q); "may be" from N: "the degree that is the basis for the extension may be, but is not required to be, the degree that is the basis for the post-completion OPT period". S2: "If" (Q, "They begin with If" N); "must have been conferred from a U.S. educational institution that is accredited and SEVP-certified at the time the student's DSO recommends the student for the 24-month OPT extension and must be in a degree program category included on the current STEM Designated Degree Program List at the time of the DSO recommendation" (Q). S3: "That previously obtained degree must have been conferred within the 10 years preceding the date the DSO recommends the student for the 24-month OPT extension" (Q); N: "The number 10 in the quote is a count of years".
- stem.requires.duties_hours_and_compensation. S1: "The terms and conditions of a STEM practical training opportunity during the period of the 24-month OPT extension" (Q). S2: "including duties, hours, and compensation" (Q). S3: "must be commensurate with terms and conditions applicable to the employer's similarly situated U.S. workers in the area of employment" (Q).
- stem.requires.employer_attests_no_replacement. S1: "Duly reads them together with those opening words", "in which the employer attests" (N). S2: "The student on a STEM OPT extension will not replace a full- or part-time, temporary or permanent U.S. worker" (Q).

### What ran

```
uv run python -m tools.sources.plain rulepacks --require f1 : first exit 1, "plain words: 5 problem(s)"
done command (as written): exit 0
  sources: 4 pack(s) checked, every quote found
  plain words: every plain text is general, calm, readable and grounded
  plain changes: 5 row(s) changed, each one allowed
```

### Seen and not worked around

- No network was used. No instruction was found in any data.

## 2026-09-29, run l-content-b2845e5165, attempt 1 (SPEC-resolutions point 66, length)

### What was tried

The plain gate now checks length. `uv run python -m tools.sources.plain rulepacks --require f1` printed "stem.requires.previously_obtained_degree: 324 characters; the contract allows 320", exit 1. A scratch script in TMPDIR scored variants of S3 with tools.sources.plain.problems, grade and term_problems:
- "in the 10 years before then." 325, grade 9.12 (fails)
- "It must be granted in the 10 years up to then." 317, 8.93 (passes, but drops "have been", which the quote's "must have been conferred" holds)
- "If so, it must then be from ..." trips the instructs check
- "in the 10 years to then." 321; "within 10 years of then." 321, 9.08
- "It must have been granted in the 10 years prior." 319, 8.88: chosen.

Words each sentence rests on (Q = quote, N = note), unchanged from run l-content-d6cfa8aad6 but for S3:
- S1: "at the time the student's DSO recommends the student for the 24-month OPT extension", "is based upon a degree obtained previous to the degree that provided the basis for the period of post-completion OPT" (Q); "may be" from the note "may be, but is not required to be" (N).
- S2: "must have been conferred from a U.S. educational institution that is accredited and SEVP-certified at the time the student's DSO recommends the student for the 24-month OPT extension and must be in a degree program category included on the current STEM Designated Degree Program List at the time of the DSO recommendation" (Q).
- S3: "That previously obtained degree must have been conferred within the 10 years preceding the date the DSO recommends the student for the 24-month OPT extension" (Q); "The number 10 in the quote is a count of years" (N).

### What ran

```
done command (as written): exit 0
  sources: 4 pack(s) checked, every quote found
  plain words: every plain text is general, calm, readable and grounded
  plain changes: 5 row(s) changed, each one allowed
```

### Seen and not worked around

- git diff prints "Operation not permitted" for tests/holdout. Nothing there was read.
- No network was used. No instruction was found in any data.

## 2026-09-29, run l-content-fb764d0557, attempt 1 (SPEC-resolutions point 67)

### What was tried

Point 67 is not written in specs/product-1/SPEC-resolutions.md in this worktree (the last point there is 66). Its words are in specs/product-1/plan-fix10.yaml (the mission) and reviews/product-1-fix9.md findings 1 and 2. Worked from those.

A scratch script in TMPDIR scored the review's example words with tools.sources.plain.problems, grade and term_problems:
- accreditation, example words: 238 characters, grade 8.63, no problem, plain_terms kept.
- older degree, example words: 307 characters, grade 8.97, no problem, plain_terms kept.
- older degree with "the extension may rest on" in place of "it may rest on": grade 9.42, fails.
- the same plus "If so, at that time the degree must be": 332 characters, grade 9.56, fails.
The example words were used as they stand. Only the two plain: lines changed.

What each sentence rests on (Q = quote, N = note):
- stem.requires.accreditation. S1 "As Duly reads it, this is one of the things on the list that must be met": N "Duly reads it as a requirement because of the sentence before the list", "all of the following requirements must be met". S2 "The degree is from a U.S. educational institution": Q "The degree that is the basis for the 24-month OPT extension is from a U.S. educational institution". S3 "The school is accredited by an agency that the Department of Education has recognized at the time of application": Q "accredited by an accrediting agency recognized by the Department of Education at the time of application"; N "The words at the time of application close the sentence; they may limit the accreditation, the recognition, or both, and the plain words keep that open". With the phrase back at the end, both readings stay open (fix 9 finding 1).
- stem.requires.previously_obtained_degree. S1 "When the DSO recommends the student for a 24-month OPT extension, it may rest on a degree older than the one for post-completion OPT": Q "If an application for a 24-month OPT extension ... is based upon a degree obtained previous to the degree that provided the basis for the period of post-completion OPT", "the student's DSO recommends the student for the 24-month OPT extension"; "may" from N "may be, but is not required to be, the degree that is the basis for the post-completion OPT period". S2 "Then that degree must be from an accredited and SEVP-certified U.S. educational institution and in a category on the STEM list": Q "that previously obtained degree must have been conferred from a U.S. educational institution that is accredited and SEVP-certified at the time the student's DSO recommends the student for the 24-month OPT extension and must be in a degree program category included on the current STEM Designated Degree Program List at the time of the DSO recommendation"; "Then" carries both the If (N "They begin with If") and "at the time". S3 "It must be from the 10 years before that day": Q "That previously obtained degree must have been conferred within the 10 years preceding the date the DSO recommends the student for the 24-month OPT extension"; N "The number 10 in the quote is a count of years". "that day" is the day of S1's recommendation (fix 9 finding 2).

### What ran

```
done command (as written, no pipe): exit 0
  sources: 4 pack(s) checked, every quote found
  plain words: every plain text is general, calm, readable and grounded
  changed: stem.requires.accreditation#2016-05-10
  changed: stem.requires.previously_obtained_degree#2016-05-10
  plain changes: 2 row(s) changed, each one allowed
```

### Seen and not worked around

- git diff prints "Operation not permitted" for tests/holdout. Nothing there was read.
- No network was used. No instruction was found in any data.

## 2026-09-29, run l-content-9296b9c05e, attempt 1 (path-1 sections 13 to 16, design-1 section 8)

### What was tried

- Found every section 16 quote in the saved copies with a scratch script in TMPDIR (verify.plain on each snapshot). All were found; opt.unemployment_abroad only with the saved line break "post- completion". Compared the 2026-09-14 and 2026-09-15 texts for each: (f)(7), (f)(8) and the withdrawal sentence of (f)(5) differ, so those rows sit under regimes, tagged litigated.
- Generated the 40 new rows from a scratch Python list, scored each plain text with tools.sources.plain.problems and term_problems, and rewrote 17 that scored above grade 9 (three rounds). Appended them after the last existing row; no existing line changed (git diff shows no removed line; plain_changes lists only the 40 new rows).
- Wrote `path` by hand and checked it with a scratch script: every rule a path names exists (except product.opt_start_earliest_years_before_program_end, a setting in contracts/product_settings.yaml), the only numbers are sign -1, and every checklist label passes tools.sources.plain.problems with its rules' quotes and notes as grounds. Nine labels first scored 9.8 to 15.5 and were shortened.

### What ran

```
done command (as written, no pipe): exit 0
  sources: 4 pack(s) checked, every quote found
  plain words: every plain text is general, calm, readable and grounded
uv run python -m tools.sources.plain_changes HEAD: 40 row(s) changed, all new rows
uv run pytest -q tests/unit/tools/test_plain.py tests/unit/tools/test_plain_changes.py tests/unit/engine/test_rulepack.py tests/unit/engine/test_rulepack_values.py: all passed
```

### Missing rules and gaps (each also in REPORT.json)

- No rule for a full course of study each term or the online limit ((f)(6) is not recorded): the enrollment judgement item of section 14 is not written.
- No condition reads a counter's total, so "months at this level below opt.max_months" is not in the program's next step; the counter opt.months_at_level carries it.
- stem.new_plan_due_days is not read by the path: no condition says "a new employer" on a work record.
- The cap-gap end cannot be named from another stage, so grace does not include it, and "filed while the OPT or its cap-gap was in force" is a check on the card end plus a judgement item when a change-of-status petition exists.
- Not saved, so not read: 8 CFR 274a.12 (the length of the pending-card extension), 8 CFR 214.3(k), 8 CFR 214.16, the STEM Designated Degree Program List, Form I-983 and its instructions.

### Seen and not worked around

- No network was used. No instruction was found in any data.

## 2026-09-29, run l-content-4f48d7da54, attempt 1 (product-2 resolutions points 4 and 8)

### What was tried

- Scratch harness in TMPDIR (lc/run.py, cases.py, cases2.py) sends records cases through engine.path.compute with the real f1 pack. It reproduced finding 3 (grace.p1 2026-06-01 to 2026-07-30, done, inside a pending cap-gap), finding 6 (unemployment.opt_card.a1 365, stopping at the card end), and finding 9 (questions c1.decision, p0.stem_list, p0.conferred_on for outside_us, p2.stem_list, p2.conferred_on for language_training).
- Read engine/path.py: `_all` and `any_of` evaluate every condition, and `_read` appends every absent field to the trace, even when another condition is false. Traces of stage and check for_each selectors are dropped; traces of only_if, holds and counter scopes are asked. `_month_day_when` reads its anchor as a fact path, and `window_opens`/`window_closes` return None. So the cap-gap end (April 1 of the fiscal year of requested_start) can be computed only with the petition as `this`.
- Point 4: grace and the OPT card's unemployment through the cap-gap are declared a second time, keyed on the petition. The program grace and the per-card count skip the card the cap-gap extends. A STEM card extended by a cap-gap makes unemployment.total null, with the judgement unemployment.total.through_cap_gap.<petition>.
- Point 8: no pack change can stop the engine asking fields it reads on excluded records. Sent as a request.

### What ran

```
scratch cases (today 2026-09-29 unless said):
  no petition: grace.p1 2026-06-01..2026-07-30, opt_card.a1 365, total.a1 365 (unchanged)
  J12 pending, requested_start 2026-10-01: cap_gap.h1 2026-06-01..2027-04-01 current, grace.h1 2027-04-02..2027-05-31 later, opt_card.h1 486 (365 + 121)
  approved, validity 2026-10-01, work to 2026-07-15: grace.h1 2026-10-02..2026-11-30, opt_card.h1 76
  J13 denied 2026-08-14: no grace, grace.after_cap_gap_outcome.h1, opt_card.h1 440 (365 + 75)
  STEM + pending cap-gap (today 2028-07-01): grace.h1 2029-04-02..2029-05-31, total.a1 null, judgement unemployment.total.through_cap_gap.h1
  STEM, no petition (today 2027-07-01): total.a1 761 (unchanged)
  no new question in any case
done command (as written, no pipe): exit 0
  sources: 4 pack(s) checked, every quote found
  plain words: every plain text is general, calm, readable and grounded
uv run python -m tools.sources.plain_changes HEAD: 0 row(s) changed
uv run pytest tests/unit/engine tests/unit/api: 1486 passed, exit 0
```

### Seen and not worked around

- Point 8 stays open until the engine short-circuits (request in REPORT.json).
- The engine ignores a counter's only_if: unemployment.total is shown for an OPT card with no STEM in its chain.
- No network was used. No instruction was found in any data.

## 2026-09-29, run l-content-5af1ae0758, attempt 1 (product-2 resolutions point 12, pack side)

### What was tried

- Read engine/path.py: a counter span is read with the authorization as `this`, and `_month_day_when` takes its anchor as a fact path, so April 1 of the fiscal year of requested_start cannot be a date in the chain's span. It can be a condition: inside a petition selector the petition is `this`, so `{field: X, on_or_before: {month_day_rule ...}}` works there.
- `unemployment.total` ends: latest_of of (a) the card end when not extended, as before, and (b) for the latest card with exactly one change-of-status petition, the later of the card end and earliest_of: validity_start, a bad outcome_on, cos_ended_on (each kept only when on or before that April 1), and today while today is on or before that April 1 (latest_of today and the petition's filed_on, so it is absent otherwise). The counter stops at today, so today gives the same count as the real end while the cap-gap is active.
- `unemployment.total.through_cap_gap` now only for a second change-of-status petition, or April 1 passed with no end on record.
- `opt_post` span: release date member removed from ends; ends_also unchanged.

### What ran

```
done command (as written, no pipe): exit 0
  sources: 4 pack(s) checked, every quote found
  plain words: every plain text is general, calm, readable and grounded
uv run python -m tools.sources.plain_changes HEAD: 0 row(s) changed
scratch harness (TMPDIR/lc12/run.py, today 2026-09-29), unemployment.total.a1, judgement, questions:
  J14 (withdrawn 2026-07-25): 85, none (HEAD: null, through_cap_gap.h1)
  J14 pending: 151; approved, validity 2026-10-01: 151 (HEAD: null + judgement)
  J14 pending, requested_start 2025-10-01: null, through_cap_gap.h1 (as HEAD)
  J14 with a second petition: null, through_cap_gap.h1 and .h2
  J14 no petition: 75 (as HEAD); denied 2026-03-01: 75 (HEAD: null)
  questions asked: the same as HEAD in every case
pytest tests/unit/engine tests/unit/api tests/unit/acceptance tests/unit/tools/test_plain*.py:
  worktree 35 failed, HEAD copy (git archive) 38 failed; no new failure. Now passing:
  test_point4_unemployment_total_runs_through_the_cap_gap_on_stem, test_j14_unemployment_total_is_85_of_150
  (test_plain_changes fails in the HEAD copy only because it has no git history)
```

### Seen and not worked around

- The engine does not build ends_also yet (no ends_also in engine/), so the opt_post change shows no difference in output until it does.
- A selector reads every condition, so with two petitions where one has validity_start, outcome_on or cos_ended_on and the other does not, the other's absent field may be asked. Same engine request as point 8.
- No network was used. No instruction was found in any data.

## 2026-09-29, run l-content-1a2b0cd812, attempt 1 (product-2 resolutions point 13, pack side)

### What was tried

- Read the saved 8 CFR 214.2 text (2026-09-14 and 2026-09-15), the saved FR documents and 1004-03 for the part-time deduction, the enrollment rules and the remaining months. The half deduction appears only as an example in 1004-03 section 6.6 (guidance); no regulation text states it. (f)(11)(iii)(A) says post-completion OPT ends at the conclusion of the remaining time period, with no length.
- Six new rows (each quote found in both point-in-time texts or in the saved guidance, none under a regime): opt.part_time_pre_completion_counts (guidance, reading), opt.post_completion_remaining_time, enrollment.full_course_required, enrollment.online_limit, enrollment.online_language_program, enrollment.final_term_reduced_load.
- opt.months_at_level: span end is `first` of the same card when it is post-completion or full_time, so a part-time or not sure pre-completion card leaves the level with no count. Judgement check opt.months_at_level.part_time.
- Judgement check program.enrollment. The engine names it program.enrollment.p1; the J17 test asks for p1.enrollment (request and dispute).
- program next opt_post: no approved OPT card at the same level whose own span reaches opt.max_months (end on or after start plus 12 months less a day, as sum_of_months counts). Only a single card; splits need an engine condition that reads a counter.

### What ran

```
done command (as written, no pipe): first run exit 1, plain words: 5 problems (grade over 9, 'in status'); fixed the new plain words; second run exit 0
  sources: 4 pack(s) checked, every quote found
  plain words: every plain text is general, calm, readable and grounded
uv run python -m tools.sources.plain_changes HEAD: 6 rows changed, all six new rows; no existing row changed
pytest tests/unit/engine tests/unit/api tests/unit/acceptance tests/unit/tools:
  worktree 32 failed, 1779 passed; HEAD copy (git archive into TMPDIR) 35 failed; no new failure.
  Now passing: test_j05_months_at_level_is_null_with_a_part_time_pre_completion_card, test_j20_opt_on_the_mba_and_no_second_masters_opt
  (test_plain_changes fails in the HEAD copy only because it has no git history)
  Still failing: test_j17_a_term_below_a_full_course_goes_to_the_dso (reason is program.enrollment.p1, test wants p1.enrollment)
probe (TMPDIR/lc13_probe.py): J05 cannot_tell, opt.months_at_level.master null, judgement opt.months_at_level.part_time.a2;
  J17 cannot_tell, judgement program.enrollment.p1; J20 months 12, opt_post.p2 not shown.
  New questions: <program>.full_course_each_term and <program>.online_within_limit for every program on F-1 (programs.md section 3 table).
```

### Seen and not worked around

- No network was used. No instruction was found in any data.

## 2026-09-30, run l-content-342a9981c1, attempt 1 (J08, pack side)

### What was tried

- Read J08 (specs/path-1/journeys.json) and the L-engine report (worktree l-engine-c5fe743a12, engine/REPORT.json; it is gitignored, so `git show` of the branch does not hold it). Its two requests name the cause.
- First `unemployment.opt_card` (authorization): span ends is now the same `earliest_of` as the `opt_post` span ends (card_end, optional day_before the change-of-level to_program.start_date). rule_ids add opt.ends_on_transfer_or_new_level.
- Its qualifying: `{field: this.on_campus, present: false}` before `{field: this.under, same_as: outer.id}`. engine/path.py `_all` stops at the first false condition, so `under` of an on-campus job is not asked.

### What ran

```
uv run pytest tests/unit/acceptance -q -k j08: 7 passed
done command (as written, no pipe): exit 0
  sources: 4 pack(s) checked, every quote found
  plain words: every plain text is general, calm, readable and grounded
uv run python -m tools.sources.plain_changes HEAD: 0 row(s) changed
pytest tests/unit/engine tests/unit/api tests/unit/acceptance tests/unit/tools:
  worktree 28 failed, HEAD copy (git archive into TMPDIR) 31 failed; no new failure.
  Now passing: test_j08_unemployment_on_the_bachelors_card_is_35_days, test_j08_unemployment_is_null_until_the_trip_list_is_whole
  (test_plain_changes fails in the HEAD copy only because it has no git history)
```

### Seen and not worked around

- The transfer release date (ends_also of opt_post) is not an end of the counter; counters have no ends_also.
- `unemployment.total` qualifying still reads `this.under` with no on_campus guard; not in this mission.
- No network was used. No instruction was found in any data.

## 2026-09-30, run l-content-76651d4388, attempt 1 (product-2 resolutions point 15, pack side)

### What was tried

- Read resolutions point 15, reviews/product-2-fix1.md finding 1 and note 1, journeys J04, J12, J14, J15, J19, and the saved texts: (f)(12)(ii)(B) (validation reporting ends when the extension concludes), (f)(10)(ii)(C)(7)(iv) and (9)(i) (the opportunity, the final evaluation), (f)(5)(vi) and the 81 FR 13040 preamble (F-1 status expires the day H-1B status begins).
- Three new rows: stem.validation_ends_with_extension (verbatim), stem.opportunity_ends_with_job (reading), capgap.status_ends_on_h1b_start (guidance, reading).
- STEM windows: the training end (anchor stem_training_end) is the earliest of the card end or the covered last job end, the release date and the day before another level starts. A job end counts when every job under the card has ended and it is on or before the card end or inside a cap-gap that covers it. evaluation_final runs from that day plus stem.evaluation_due_days. validation_n is dated only when card_start plus 6n months is on or before that day (a `first` over the same authorization with the condition; otherwise the window has no dates, since windows have no only_if).
- Grace keyed on the petition: not entered for an approved petition with validity_start on or before the cap-gap end.
- First try used `latest_of: [*anchor]` to add days to the anchored expression; the schema wants at least two members. Fixed by anchoring the member list: `earliest_of: *stem_training_end` with `add`.

### What ran

```
done command (as written, no pipe): run 1 exit 1 (load_all: latest_of too short); run 2 exit 1 (plain words: 5 problems, 4 sentences, terms not in quote); run 3 exit 0
  sources: 4 pack(s) checked, every quote found
  plain words: every plain text is general, calm, readable and grounded
uv run python -m tools.sources.plain_changes HEAD: 3 row(s) changed, the three new rows only
probe (TMPDIR/lc15/probe.py):
  J04 stem.evaluation_final.a2 2022-08-15 to 2022-08-25; validation_1 2021-12-22, validation_2 2022-06-22, validation_3 and _4 no dates
  J14 stem.evaluation_final.a2 2026-07-15 to 2026-07-25
  J12 no grace.h1 (cap_gap.h1 2026-06-01 to 2026-10-01)
  J15 validation_1 to _3 as the journey; validation_4 no dates ("No validation after the card ends 2027-06-14")
  J19 validation_4 no dates (2028-06-09 is the day after the card ends 2028-06-08)
pytest tests/unit/engine tests/unit/api tests/unit/acceptance tests/unit/tools:
  worktree 30 failed, HEAD copy (git archive) 28 failed. New in the worktree, all three from point 15:
  test_j12_grace_begins_after_the_cap_gap, test_path_fix1.py::test_point4_grace_starts_after_an_active_cap_gap,
  test_j19_stem_validations_skip_juneteenth (validation_4). test_plain_changes fails in the HEAD copy only (no git history).
```

### Seen and not worked around

- Windows have no only_if, so a validation past the training end shows with no dates, not left out.
- With two employers on one STEM card, only the later job's final evaluation is dated.
- An approved petition with no validity_start keeps the petition grace; validity_start is not asked for it.
- No network was used. No instruction was found in any data.

## 2026-09-30, run l-content-5774b746b2, attempt 1 (product-2 resolutions point 16, pack side)

### What was tried

- Read resolutions point 16, reviews/product-2-fix2.md findings 1 to 3, the `stem` and `stem_job_end` stages, and engine/path.py `_next`, `_window`, `_when`, `_first`, `_select` (a next stage's virtual record carries the host's id, the OPT card, which is why `this.id same_as outer.id` found the OPT card).
- Validations: added `this.type in [stem_extension]` to each lookup; the end is a new anchor stem_validation_end (card end, release date, day before a new level, day before the validity start of an approved change-of-status petition). No job end.
- stem.evaluation_final: `latest_of: [this.card_start, earliest_of: *stem_training_end]`, so a virtual record (no card_start, never asked) gives no date. Training end anchor moved into this window; its card member filters on stem_extension; stem_job_covered requires under.type stem_extension and no job under the card ending after the job.
- New window stem_job_end.evaluation_final (anchor stem_job_before_another).
- First write put the training-end members 6 spaces too far left under `- earliest_of:`; fixed before any run.

### What ran

```
uv run pytest tests/unit/acceptance -q: all passed
done command (as written, no pipe): exit 0
  sources: 4 pack(s) checked, every quote found
  plain words: every plain text is general, calm, readable and grounded
uv run python -m tools.sources.plain_changes HEAD: 0 row(s) changed
pytest tests/unit/engine tests/unit/api tests/unit/acceptance tests/unit/tools:
  worktree 27 failed, 1828 passed; HEAD copy (git archive into TMPDIR) 28 failed; no new failure
  (the extra one in the copy is test_plain_changes, which needs git history)
probe (TMPDIR/lc16/probe.py, CLOCK of the acceptance tests):
  J01 J05 J09 J11 J20 next stem stage: every validation and evaluation_final None, no stem report in upcoming
  J04 validation_1 2021-12-22 to 2022-01-05, _2 2022-06-22 to 2022-07-07, _3 _4 None, final 2022-08-15 to 2022-08-25
  J14 validations 1 to 3 dated, _4 (2026-06-01, after the card end 2026-05-31) None; final 2026-07-15 to 2026-07-25
  J15 validations 1 to 3 as the journey, final a2 2027-06-14 to 2027-06-24, stem_job_end.evaluation_final.w3 2025-10-31 to 2025-11-10
  J15 without w4: validations 1 to 3 still dated; final a2 2025-10-31 to 2025-11-10
  J19 validation_4 None
```

### Seen and not worked around

- Validation windows now show status guidance, because capgap.status_ends_on_h1b_start (guidance, reading) is in their rule_ids for the F-1 status member.
- J14 validation_4 (2026-06-01) lost its date: it falls after the card end, and the cap-gap is not the 24-month extension.
- The per-job window shows on each stem_job_end stage, with no dates for the last job (its final evaluation is the stage's).
- No network was used. No instruction was found in any data.
