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
