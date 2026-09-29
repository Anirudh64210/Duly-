# Changelog

## v2026.09

Empty pack. Rules enter in Phase 2, each with a primary source and a status tag.

### 2026-09-28, lane L-content, drafted for founder review

- Added regime ds_2012 (effective, operative) from the 2026-09-14 text of 8 CFR 214.2.
- Added regime fixed_admission_2026 (enjoined, not operative) from the order of 2026-09-14 in No. 1:26-cv-13799 (D. Mass.), which postpones the effective date of 91 FR 44976.
- Added opt.apply_before_days, 90 days, settled.
- Added opt.apply_after_days, 60 days under ds_2012 and 30 days under fixed_admission_2026, litigated. The SPEC listed it as settled; the final rule changes it.
- Added opt.file_within_days_of_recommendation, 30 days, settled.
- Added opt.max_months, 12 months, settled.
- Added opt.complete_within_months, 14 months, settled.
- Added opt.unemployment_limit_days, 90 days, settled.
- Added stem.unemployment_limit_days, 150 days, settled.
- Added stem.extension_months, 24 months, settled.
- Added stem.apply_before_expiry_days, 90 days, settled.
- Added stem.file_within_days_of_recommendation, 60 days, settled.
- Added stem.min_hours_per_week, 20 hours per week, settled.
- Added stem.validation_interval_months, 6 months, settled.
- Added stem.validation_due_business_days, 10 business days, settled.
- Added stem.evaluation_due_days, 10 days, settled.
- Added stem.new_plan_due_days, 10 days, settled.
- Added cpt.full_time_months_bar, 12 months, settled. The source says one year.
- Added grace.after_completion_days, 60 days under ds_2012 and 30 days under fixed_admission_2026, litigated.
- Added opt.min_hours_per_week, 20 hours per week, guidance.
- Added capgap.end_month_day, 10-01 from 2008-04-08 to 2025-01-16, then 04-01 from 2025-01-17, settled.
- Saved copies of every source under sources/, listed with hashes in SOURCES.md.

### 2026-09-28, lane L-content, second pass, drafted for founder review

- Added stem.evaluation_interval_months, 12 months, settled. The regulation names one evaluation within 12 months and one at the conclusion; it does not state a repeating interval.
- Added cpt.full_time_bar_days, 365 days, school. The regulation says one year or more and states no number of days.
- Added capgap.fiscal_year_start_month_day, 10-01, settled, from 31 U.S.C. 1102.
- Added opt.report_employer_within_days, 10 days, guidance, from Study in the States. The regulation states no number for post-completion OPT.
- Added calendar.federal_holidays_law, true, settled, from 5 U.S.C. 6103(a), with the list of eleven holidays quoted.
- Saved copies of 31 U.S.C. 1102 and 5 U.S.C. 6103 under sources/.

### 2026-09-28, lane L-content, third pass, drafted for founder review

- Added opt.latest_start_after_days, 60 days under ds_2012 and 30 days under fixed_admission_2026, litigated, from 8 CFR 214.2(f)(11)(i)(D).
- Added stem.apply_window_closes_rule, true, settled, from the opening text of 8 CFR 214.2(f)(10)(ii)(C). Paragraph (f)(11)(i)(C) states the opening of the window and no closing. The source states a condition and names no date.

### 2026-09-29, lane L-content, context round, drafted for founder review

- Every rule now carries derivation. Each quote was read again in its saved source before it was marked. No value and no quote changed.
- Verbatim, 25 rows: every row not named below.
- Reading, 5 rows, each with a note that begins with how the value was read: cpt.full_time_months_bar, cpt.full_time_bar_days, stem.apply_window_closes_rule, capgap.fiscal_year_start_month_day, calendar.federal_holidays_law.
- Added stem.requires_post_completion_opt, true, flag, settled, a reading, from the first sentence of 8 CFR 214.2(f)(10)(ii)(C). The words are may apply while in a valid period of post-completion OPT; the regulation does not use the word only.
- No rule was removed. No new source was fetched.

### 2026-09-29, lane L-content, product round 1, drafted for founder review

- cpt.full_time_bar_days: status changed from school to settled. Derivation stays reading. The row cites the regulation and no school's page. The five status tags have no tag for Duly's own count, so the status is the one the quoted sentence supports, and the note says that settled describes the sentence and that 365 is Duly's count. The value and the quote did not change.
- Added 15 flags from 8 CFR 214.2(f)(10)(ii)(C), in the order of the paragraph, each settled, each with the exact words:
  - stem.requires.all_of_the_following, verbatim, the last sentence of the opening text.
  - stem.requires.accreditation, reading, (C)(1).
  - stem.requires.dhs_approved_degree, reading, (C)(2).
  - stem.requires.degree_on_designated_list, verbatim, (C)(2)(iii).
  - stem.requires.previously_obtained_degree, verbatim, (C)(3). The words begin with If.
  - stem.requires.eligible_practical_training_opportunity, verbatim, (C)(4).
  - stem.requires.employer_qualification, reading, (C)(5). E-Verify and the employer identification number.
  - stem.requires.employer_reporting, reading, (C)(6).
  - stem.requires.training_plan, verbatim, (C)(7)(i).
  - stem.requires.duties_hours_and_compensation, verbatim, (C)(8).
  - stem.requires.self_evaluation, reading, (C)(9)(i).
  - stem.requires.employer_attestation, verbatim, the opening text of (C)(10).
  - stem.requires.employer_attests_resources, reading, (C)(10)(i).
  - stem.requires.employer_attests_no_replacement, reading, (C)(10)(ii).
  - stem.requires.employer_attests_training_goals, reading, (C)(10)(iii).
- Not recorded: (C)(11), Site visits. Its words state what DHS may do.
- No rule was removed. No new source was fetched. Every quote was read in the saved 2026-09-14 text and found in the 2026-09-15 text and in 81 FR 13040.

### 2026-09-29, lane L-content, product round 1, resolutions 20 to 24, drafted for founder review

- Point 20, stem.new_plan_due_days: the quote is now the whole sentence of 8 CFR 214.2(f)(10)(ii)(C)(7)(iv), which begins If a student initiates a new practical training opportunity with a new employer during his or her 24-month OPT extension. The old quote left the condition out. Value 10, status settled and derivation verbatim did not change. checked_on is 2026-09-29.
- Point 22: added opt.report_interruption, true, flag, settled, verbatim, the first sentence of 8 CFR 214.2(f)(12)(i): report any change of name or address, or interruption of such employment. The words state no number of days, and the row carries none.
- Point 21: added stem.reporting_required, true, flag, settled, verbatim, from 8 CFR 214.2(f)(12)(ii): Compliance with these reporting requirements is required to maintain F-1 status.
- Point 24, calendar.federal_holidays_law: the note now says that business days skip the days 6103(a) lists, on those days, and not observed days, and gives the words of 6103(b) that limit observed days to statutes relating to pay and leave of employees. Value, status, quote and derivation did not change.
- No rule was removed. No new source was fetched. Every new quote was found once in the saved 2026-09-14 text, once in the 2026-09-15 text and once in 81 FR 13040. The words of 6103(b) were found once in the saved usc-5-6103 copy.

### 2026-09-29, lane L-content, resolutions 27 and 30, drafted for founder review

- opt.complete_within_months: the quote is now the whole sentence of 8 CFR 214.2(f)(10)(ii)(A)(3), with "except that a 24-month extension pursuant to paragraph (f)(10)(ii)(C) of this section does not need to be completed within such 14-month period". Value 14, settled and verbatim did not change. Resolution 30.
- Added opt.post_completion_definition, a flag, guidance, from Study in the States: "Post-Completion OPT: Any portion of OPT used after the student's Program End Date." Resolution 27. Taking the card end as the test is Duly's reading, said in the note.
