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

### 2026-09-29, lane L-content, plain-1 section 1 and resolutions 40 and 50, drafted for founder review

- plain-1 section 1: every rule and both regimes of the F-1 pack now carry `plain`, written from each row's quote, value and note. Rows whose derivation is reading say "This is how Duly reads the rule". The three rows under fixed_admission_2026 say the change is paused by a court and does not apply today. Regime fixed_admission_2026: plain words from the order of 2026-09-14 (sources/mad-1-26-cv-13799-doc51-order.txt): the rule published July 17, 2026 would set a fixed period of admission; the court paused it while the case goes on, putting off its date until the court orders otherwise or the case ends (paragraphs 3 and 4); the earlier rule applies today. The docket listing saved 2026-09-28 shows no later order. `python -m tools.sources.plain rulepacks --require f1` reports no problem.
- Point 50: added stem.report_change_within_days, 10 days, settled, verbatim, the whole of 8 CFR 214.2(f)(12)(ii)(A) from the saved 2026-09-14 text: "Within 10 days of the change, the student must report to the student's DSO a change of legal name, residential or mailing address, employer name, employer address, and/or loss of employment." Start 2016-05-10 from 81 FR 13040, which carries the same sentence.
- Point 40, holidays: added a row of calendar.federal_holidays_law from 1986-01-01 to 2021-06-16, settled, reading, quoting the saved 5 U.S.C. 6103 note "Pub. L. 117-17 inserted item relating to Juneteenth National Independence Day." The note names the ten holidays: the list of 6103(a) without Juneteenth. The start is the effective date the saved note gives the 1983 amendment that inserted the Birthday of Martin Luther King, Jr. (the first January 1 after the two-year period following Nov. 2, 1983), read as 1986-01-01. The note of the row from 2021-06-17 now points to it.
- Point 40, cap-gap: added capgap.october_start_condition, a flag, settled, verbatim, in two closed rows. 2008-04-08 to 2016-05-09 quotes (f)(5)(vi)(A)(2) as printed in 73 FR 18944: "states that the employment start date for the F-1 student is October 1 of the following fiscal year." 2016-05-10 to 2025-01-16 quotes the same paragraph as printed in 81 FR 13040: "requests an H-1B employment start date of October 1 of the following fiscal year." The point asked for one row from the 73 FR 18944 copy closed on 2025-01-16; the saved 2016 text has other words, so both are recorded. 89 FR 103054 ends the condition for petitions filed on or after 2025-01-17.
- No rule was removed. No value of an existing row changed. No new source was fetched; every new quote was found in a saved copy.

### 2026-09-29, lane L-content, resolution 54, drafted for founder review

- Point 54, the six rows reviews/product-1-fix4.md findings 1 and 2 name, rewritten from their quotes:
  - cpt.full_time_months_bar and cpt.full_time_bar_days: the plain words keep the rule's term, "post-completion academic training", and say that Duly reads that term as OPT after study, and one year as 12 months (or 365 days). The note of each row now says the term reading is Duly's.
  - opt.latest_start_after_days (60): the sentence about when the work permission begins is gone; it is not in the quote. The plain words say "request", as the quote does. The note names the heading of (f)(11)(i)(D), Start of OPT employment.
  - stem.validation_interval_months: the word short is gone. The report confirms that the information required by (f)(12)(ii)(A) has not changed. The note names the heading of (f)(12)(ii).
  - grace.after_completion_days (30, paused): the plain words name all three starting points, including the 4 year maximum period of admission. The quote now runs on to "or to otherwise seek to maintain lawful status", and the plain words say so.
  - stem.min_hours_per_week: time off counts only where it follows the leave policies for the employer's similarly situated workers in the United States in the area of employment, as the quote limits it.
- Every other plain text was read beside its quote. Changed because they added, dropped or changed what the quote says: ds_2012 (the rule's term duration of status; certified, not approved), opt.latest_start_after_days (30) (request, not allow), opt.file_within_days_of_recommendation and stem.file_within_days_of_recommendation (with USCIS), opt.max_months (up to was added), stem.extension_months (qualifying degree, course requirements), stem.validation_due_business_days (six-month report was another row's words), stem.evaluation_due_days (respectively), stem.new_plan_due_days (within 10 days of beginning), grace.after_completion_days (60) (who the period is for), capgap.end_month_day both rows (what is extended and on what terms; the older row no longer speaks of the later change), stem.evaluation_interval_months (no timing the quote lacks), capgap.fiscal_year_start_month_day (fiscal year of the Treasury, and its end), opt.report_employer_within_days (must), calendar.federal_holidays_law both rows (legal public holidays), and the stem.requires rows for accreditation, dhs_approved_degree, degree_on_designated_list, previously_obtained_degree, employer_qualification, employer_reporting, training_plan, duties_hours_and_compensation and the four employer attestation rows (attests, not confirms; including by signing).
- Quotes widened in the saved copies they came from, each found by the source check: grace.after_completion_days (60) to the whole sentence of (f)(5)(iv); grace.after_completion_days (30) to "or to otherwise seek to maintain lawful status"; stem.evaluation_due_days to the whole sentence with "respectively"; capgap.end_month_day (10-01 in 73 FR 18944, 04-01 in the 2026-09-14 text) to the start of paragraph (A). checked_on 2026-09-29 on those five rows.
- No value, status, derivation or date changed. No rule was added or removed. No network was used.

### 2026-09-29, lane L-content, run l-content-d39e3a57c3 (SPEC-resolutions point 58)

- Every rule now lists its terms of art in `plain_terms` (at most three, [] if none), and its plain words keep each word for word.
- The six texts of reviews/product-1-fix5.md finding 1 rewritten: `stem.min_hours_per_week` and `stem.requires.employer_attests_no_replacement` keep "U.S. worker(s)"; `capgap.end_month_day` (from 2025-01-17) keeps the cap limit, said in words as Duly's reading (the gate refuses the section number); `stem.requires.previously_obtained_degree` and `stem.requires.accreditation` keep "U.S. educational institution", and the second keeps "recognized" with "at the time of application" at the end, where the quote puts it; `grace.after_completion_days` (30) keeps "period of admission".
- `stem.validation_interval_months` no longer cites (f)(12)(ii)(A) in its plain words; it names the facts that paragraph lists, which the note now records.
- Checklist from specs/product-1/plain-sweep.json worked through: "for OPT" narrowed to post-completion OPT, with the 24-month extension left out (apply rows); "properly file" said as "correctly file"; the 150-day row names its subject; a condition stays a condition (new plan, previously obtained degree); "qualified" said as "meets its terms" (the gate refuses the word); rule terms kept (practical training, higher educational level, practical training opportunity, employment authorization, reporting requirements, legal public holidays, category); reading marks now come first on the listed requirements and attestations; the ten-holiday row gives its start date, 1986-01-01; the regime fixed_admission_2026 no longer drops "on the merits", and it says the order stops further steps to carry the rule out.
- Quotes widened, each found by the source check: `stem.extension_months` (to the thesis exclusion and dual degree program), `stem.apply_before_expiry_days` (the whole sentence, with who may file).
- Notes added where plain words rest on them: the heading of (f)(10)(ii)(C), the words before a quote that the italic paragraph numbers keep out, the cap-subject wording in the preambles of 89 FR 103054 and 81 FR 13040, the heading of (f)(8), the title of the final rule and paragraph 3 of the order.

### 2026-09-29, lane L-content, run l-content-70287e6b26 (SPEC-resolutions point 62)

- Only the eight plain texts named in reviews/product-1-fix6.md findings 1 and 2 were rewritten. Every other plain text and plain_terms list is unchanged, as point 62 requires.
- `capgap.end_month_day` (from 2025-01-17): says "the employment authorization the rule names", not employment authorization with no limit; "the petition's start date" is now "if the approved petition starts first, they end then"; the cap limit stays Duly's reading.
- `capgap.end_month_day` (2008-04-08 to 2025-01-16): says "the employment authorization the rule names"; the 2016 cap limit is said "as Duly reads it". The note says so.
- `stem.requires.employer_reporting`: "if the student leaves or the job is ended before the authorized period of OPT ends", so the time limit is a condition on the leaving, not on the telling. Ends "This is Duly's reading, not the rule's exact words." plain_terms is now ["authorized period of OPT"]; "departure" is no longer in the plain words, which use the words the review asked for. The note records this.
- `stem.requires.self_evaluation`: ends "This is Duly's reading, not the rule's exact words."
- `stem.requires.dhs_approved_degree`: "the Secretary's designee" is now "a person the Secretary names"; plain_terms is now [].
- `opt.apply_after_days` (60, ds_2012): "Filing may begin 90 days before the program end date", not "before that date".
- `stem.extension_months`: split into "The extension lasts 24 months." and a sentence joining both clauses to the degree with "and for which".
- `stem.requires.previously_obtained_degree`: the 10 years now end on the day the DSO recommends. It is still one sentence: the plain check allows three sentences and counts each period in "U.S." as a sentence end, so any split that keeps the term "U.S. educational institution" fails. Recorded as a dispute in rulepacks/REPORT.json.
- No value, status, derivation, quote or date changed. No network was used.

### 2026-09-29, lane L-content, run l-content-0f0465de11 (SPEC-resolutions point 65)

- Only two plain texts changed, as reviews/product-1-fix7.md finding 1 asks. Every other plain text, every plain_terms list, and every value, status, derivation, quote, note and date are unchanged.
- `capgap.end_month_day` (from 2025-01-17): "If the approved petition starts first, they end then" is now "If the approved petition starts first, they last on their own only until then." The text no longer says status and authorization end on that day; it says they stop being extended on their own. To stay within the reading grade (9.0), "This rule is for" is now "It is for" and "until April 1" is now "till April 1". Grade 8.98.
- `stem.requires.previously_obtained_degree`: "when the DSO recommends it" is now "when the DSO recommends the student for the extension", so the text names whom the DSO recommends, as the quote does. "in a category on the STEM list" is now "in a field on the STEM list", and "have been granted" is now "granted", to stay within the reading grade. Grade 8.88. It is still one sentence: the plain check counts "U.S." as two extra sentence ends, so any text that keeps the term "U.S. educational institution" can hold only one real sentence under the three-sentence limit. The review's split into three sentences counts as five. Recorded as a dispute in rulepacks/REPORT.json.
- No network was used.

### 2026-09-29, lane L-content, run l-content-d6cfa8aad6 (SPEC-resolutions point 66)

- The plain check now counts "U.S." as one word that ends no sentence. Measured truly, five plain texts were over reading grade 9 (16.3, 19.8, 23.9, 17.6 and 13.5). Only these five changed, each into at most three short sentences. Every other plain text, every plain_terms list, and every value, status, derivation, quote, note and date are unchanged.
- `stem.min_hours_per_week`: the time off left out is now its own two sentences. Grade 7.0.
- `stem.requires.accreditation`: split into three sentences; "at the time of application" now opens the sentence on accreditation and recognition, so it may still bound either or both, as the note says. The reading stays marked "As Duly reads it". Grade 8.6.
- `stem.requires.previously_obtained_degree`: three sentences. It says "category", as its quote does, not "field", and says the DSO recommends the student for the 24-month OPT extension. The accreditation, SEVP certification and category hold at that time; the degree must have been granted in the 10 years up to then. Grade 8.98.
- `stem.requires.duties_hours_and_compensation`: three sentences; "during the 24-month OPT extension" and "commensurate" kept. Grade 8.9.
- `stem.requires.employer_attests_no_replacement`: two sentences; the first keeps "Duly reads this as one of the things the employer attests". Grade 7.6.
- No network was used.

### 2026-09-29, lane L-content, run l-content-b2845e5165 (SPEC-resolutions point 66)

- The five texts from run l-content-d6cfa8aad6 stand. Only `stem.requires.previously_obtained_degree` changed again: it was 324 characters, over the contract's 320, so the pack did not load. "It must have been granted in the 10 years up to then." is now "It must have been granted in the 10 years prior." The text is 319 characters, grade 8.88, still three sentences, and still says "category" and that the DSO recommends the student for the 24-month OPT extension. "prior" means prior to that time, the DSO's recommendation, as the quote says ("within the 10 years preceding the date the DSO recommends the student").
- Every other plain text, every plain_terms list, and every value, status, derivation, quote, note and date are unchanged. No network was used.

### 2026-09-29, lane L-content, run l-content-fb764d0557 (SPEC-resolutions point 67)

- Only two plain texts changed, as reviews/product-1-fix9.md findings 1 and 2 ask, in the review's example words. Every other plain text, every plain_terms list, and every value, status, derivation, quote, note and date are unchanged.
- `stem.requires.accreditation`: "at the time of application" is back at the end of the sentence, as the quote has it: "The school is accredited by an agency that the Department of Education has recognized at the time of application." The words may again bound the accreditation, the recognition, or both, as the note says. The entry above for run l-content-d6cfa8aad6 said the phrase at the front could still bound either; it could not bound the recognition alone. Grade 8.63, 238 characters.
- `stem.requires.previously_obtained_degree`: the last sentence names the day the 10 years run back from: "It must be from the 10 years before that day", that day being the day the DSO recommends the student for the 24-month OPT extension, as the quote says ("within the 10 years preceding the date the DSO recommends the student for the 24-month OPT extension"). To fit, the first sentence now says the extension "may rest on a degree older than the one for post-completion OPT", and the second opens "Then that degree must be". Grade 8.97, 307 characters. It still says "category" and "SEVP-certified U.S. educational institution".
- No network was used.

### 2026-09-29, lane L-content, run l-content-9296b9c05e: the F-1 path over records (path-1 sections 13 to 16, design-1 section 8)

- Added the 36 rules of path-1 section 16 as 40 rows, each quoted from a saved copy under sources/. Settled where the 2026-09-14 and 2026-09-15 texts carry the same words. Litigated, with a row under each regime, where the paused text rewrites the paragraph: transfer.begin_within_months, transfer.opt_resume_within_months, change_of_level.transfer_procedure, grace.withdrawal_days. Litigated under ds_2012 alone where the paused text drops the sentence: transfer.contact_new_dso_within_days, program.extension_before_end, program.extension_new_i20.
- Rows whose start is only the date of the oldest saved copy carry effective_from_basis earliest_saved_copy.
- Added `path`: thirteen record kinds, the order of levels (Duly's reading, levels.higher_order), stages for program, move, transfer, cpt, opt_pre, opt_post, stem, cap_gap, grace, withdrawal, trip and the two job-end reports, 31 checks, six counters, the STEM requirements list, and two checklists (opt_post, stem_opt) marked reading. Every amount names a rule; the path holds no number.
- No existing row changed.

### 2026-09-29, lane L-content, run l-content-4f48d7da54 (product-2 resolutions points 4 and 8)

- Point 4, grace. A program no longer gets `grace` from its own end when a petition asks for a change of status and the program holds the latest post-completion OPT or STEM card. A second `grace` declaration, keyed on the petition (`grace.<petition>`), is entered for a petition whose outcome is pending or approved. It starts the day after the later of the latest card end and the cap-gap end, and runs `grace.after_completion_days` from there. The cap-gap end is written as the `cap_gap` stage writes it: April 1 of the fiscal year of requested_start, validity_start, cos_ended_on. After a rejected, denied, revoked or withdrawn outcome, no grace is computed and `grace.after_cap_gap_outcome` steps back, as before.
- Point 4, unemployment. `unemployment.opt_card` no longer counts, by itself, the post-completion OPT card that a cap-gap extends. A second `unemployment.opt_card` declaration, keyed on the petition (`unemployment.opt_card.<petition>`), counts from that card's start to the later of the card end and the cap-gap end, with the outcome day among the ends. Work under that card qualifies. When the cap-gap extends a STEM card, the `unemployment.total` span of that card is null, not the card alone. The new judgement check `unemployment.total.through_cap_gap` steps back, because the pack cannot add the cap-gap days to one member of a chain.
- The keying on the petition is needed because a path over records cannot reach a petition from a program or an authorization, and the engine does not read `window_closes` or a span end of another stage.
- Point 8 needs no change in the pack and none was made. The conditions already test where, level and type before stem_list, conferred_on and decision. The engine reads every condition of a selector and asks every absent field it read, even when an earlier condition is false. Filed as a request.
- No row, value, quote, note, plain text or plain_terms changed. No network was used.

### 2026-09-29, lane L-content, run l-content-5af1ae0758 (product-2 resolutions point 12, pack side)

- `unemployment.total`: the span of the chain's latest card, while a petition asks for a change of status, now ends at the later of the card end and the cap-gap end, not at no end. The cap-gap end is read from the petition as the `cap_gap` stage reads it: validity_start, a rejected, denied, revoked or withdrawn outcome_on, or cos_ended_on, each only when on or before April 1 of the fiscal year of requested_start (`capgap.end_month_day`). While today is on or before that April 1, today stands for the end, because the counter never counts past today. With two such petitions, or when that April 1 has passed and no other end is on record, the span has no end, as before.
- `unemployment.total.through_cap_gap` is raised only in those two cases, where the count stays null.
- `opt_post`: the release date is no longer a member of the span end. It is held in `ends_also` alone, so the regulation's end (card end, or the day before a program at another level starts) and the release-date reading can differ.
- No row, value, quote, note, plain text or plain_terms changed. No network was used.

### 2026-09-29, lane L-content, run l-content-1a2b0cd812 (product-2 resolutions point 13, pack side)

- Added opt.part_time_pre_completion_counts, flag, guidance, a reading of the example in SEVP Policy Guidance 1004-03 section 6.6. No saved source states a general rule or a number for the part-time deduction, so none is computed (IMPL-017).
- Added opt.post_completion_remaining_time, flag, settled, 8 CFR 214.2(f)(11)(iii)(A).
- Added enrollment.full_course_required ((f)(6)(iii)), enrollment.online_limit and enrollment.online_language_program ((f)(6)(i)(G)), enrollment.final_term_reduced_load ((f)(6)(iii)(C)), flags, settled.
- `opt.months_at_level`: a pre-completion card not marked full_time has no span end, so its level has no count. New judgement check `opt.months_at_level.part_time` sends it to the DSO (J05).
- New judgement check `program.enrollment`: for each program on F-1, full_course_each_term and online_within_limit must be yes; no or not sure goes to the DSO (J17).
- `program` next `opt_post`: new only_if, no approved OPT card at the same level whose card alone spans opt.max_months. A level used up by two or more cards together is not caught; that needs a condition that reads a counter (J20).
- No existing row, value, quote, note, plain text or plain_terms changed. No network was used.

### 2026-09-30, lane L-content, run l-content-342a9981c1 (J08, pack side)

- `unemployment.opt_card`, the declaration keyed on the authorization: the span now ends where the `opt_post` stage span ends, the earlier of the card end and the day before a program at another level starts (8 CFR 214.2(f)(10)(ii)(B), opt.ends_on_transfer_or_new_level, now in its rule_ids). Before, it ran to the card end, and days after a change of level counted as unemployment. The release-date reading stays in the stage's `ends_also` only; a counter span has no `ends_also`.
- Its qualifying selector now first requires `on_campus` to be absent, so a job on campus is not read as work under the card and its `under` is not asked.
- No row, value, quote, note, plain text or plain_terms changed. No network was used.

### 2026-09-30, lane L-content, run l-content-76651d4388 (product-2 resolutions point 15, pack side)

- Added stem.validation_ends_with_extension, flag, settled, 8 CFR 214.2(f)(12)(ii)(B): validation reporting ends when F-1 status expires or the 24-month OPT extension concludes, whichever is first.
- Added stem.opportunity_ends_with_job, flag, settled, a reading of 8 CFR 214.2(f)(10)(ii)(C)(7)(iv): a practical training opportunity is with one employer, so it ends on the job's last day, or when the authorization ends if that is sooner.
- Added capgap.status_ends_on_h1b_start, flag, guidance, a reading of the 81 FR 13040 preamble: once a change-of-status petition is approved, F-1 status ends the day H-1B status begins. It is in the `cap_gap` stage's rule_ids.
- `stem`, `stem.evaluation_final`: dated from the end of the practical training opportunity, not the card end. That day is the earliest of the card end (or the last job's end when every job under the card has ended, on or before the card end or inside a cap-gap extension that covers it), the transfer release date and the day before a program at another level starts. J04: 2022-08-15 to 2022-08-25. J14: 2026-07-15 to 2026-07-25.
- `stem.validation_1` to `_4`: a validation whose reporting date falls after that day has no dates (J04: validation_3 and validation_4; J15 and J19: validation_4, the day after the card ends).
- `grace`, the declaration keyed on the petition: not entered for an approved petition whose validity_start is on or before the cap-gap end (J12: no grace.h1).
- The training end is written once, as the YAML anchor stem_training_end (and stem_job_covered for the job condition), and reused by alias.
- No existing row, value, quote, note, plain text or plain_terms changed. No network was used.

### 2026-09-30, lane L-content, run l-content-5774b746b2 (product-2 resolutions point 16, pack side)

- `stem.validation_1` to `_4`: the lookup now takes only an authorization of type stem_extension, so a next STEM stage, which has no STEM card, never reads the post-completion OPT card as its card and carries no report dates (reviews/product-2-fix2.md finding 1: J01, J02, J03, J05, J09, J11, J20).
- The same windows end with the extension or F-1 status, as 8 CFR 214.2(f)(12)(ii)(B) says (stem.validation_ends_with_extension), never with a job's end: a reporting date is dated only on or before the earliest of the card end, the transfer release date, the day before a program at another level starts, and the day before the validity start of an approved change-of-status petition (capgap.status_ends_on_h1b_start, now in their rule_ids, so the windows show as guidance). stem.opportunity_ends_with_job, capgap.end_month_day and capgap.ends_on_outcome left their rule_ids. Written once as the YAML anchor stem_validation_end (finding 2).
- `stem.evaluation_final`: dated only for a real STEM card (the later of this.card_start and the training end, so a next stage with no card start has no date). The training end's card member takes only a stem_extension, and a job counts as the last only when no job under the card ends after it (before, an earlier covered job could stand for a later job that ended after the card end).
- New window `stem_job_end.evaluation_final`: each job under a STEM card that ends on or before the authorization ends (or inside a cap-gap extension that covers it), while another job under the card runs on or ends later, gets a final evaluation from its own end plus stem.evaluation_due_days (8 CFR 214.2(f)(10)(ii)(C)(9)(i)). J15 Job B: 2025-10-31 to 2025-11-10 (finding 3).
- Notes of stem.validation_ends_with_extension, stem.opportunity_ends_with_job and capgap.status_ends_on_h1b_start say how the path now uses them. No value, quote, plain text or plain_terms changed. No network was used.

### 2026-09-30, lane L-content, run l-content-c9d501e790 (product-2 resolutions point 17, pack side)

- `stem_validation_end`, the petition member: a change-of-status petition now ends validations only when it belongs to this STEM card. It must be filed on or after the card start and on or before the card end, approved, and its change of status not ended before its validity start (`cos_ended_on` absent, or on or after `validity_start`). An approved petition from before this card never drops a report (reviews/product-2-fix3.md finding 2). The anchor is used by all four validation windows, so all four change together.
- Note of capgap.status_ends_on_h1b_start says the same. No value, quote, plain text or plain_terms changed. No network was used.

### 2026-09-30, lane L-content, run l-content-4b6af7aceb (product-2 resolutions point 18, pack side)

- One test of belonging, anchor `petition_belongs`: a change-of-status petition that is approved, with a validity start on or after the start of the latest post-completion OPT or STEM card. It replaces point 17's "filed while the card runs" (filed_on is no longer read).
- `stem_validation_end`: the petition member uses `petition_belongs` (and still needs `cos_ended_on` absent or on or after the validity start). A new member makes the validation dates null while that test cannot be settled (outcome or validity start missing), so the gap is not read as "does not belong".
- Anchor `petition_may_belong` (not an older approved petition: outcome unknown, not approved, validity start unknown, or `petition_belongs`) now filters every petition read by the `cap_gap` stage, both `grace` stages, the checks stem.filed_while_opt_in_force, stem.filed_during_cap_gap, grace.after_cap_gap_outcome and unemployment.total.through_cap_gap, and the counters unemployment.opt_card and unemployment.total. An approved petition from before the current card keeps the grace, opens no cap_gap and raises no conflict (reviews/product-2-fix4.md finding 1).
- `cap_gap` opens only when the validity start is unknown or after the latest card end: an approved start inside the card leaves no gap to extend, and no longer raises `cap_gap.<petition>.ends_before_starts` (P1, T3 of the review).
- New check `petition.belongs_to_this_status`: asks for a missing outcome or validity start of a change-of-status petition; it never fails, so it raises no conflict.
- Note of capgap.status_ends_on_h1b_start says the same. No value, quote, plain text or plain_terms changed. No network was used.

### 2026-09-30, lane L-content, run l-content-49195b07fd (product-2 resolutions point 19, pack side)

- Taken out until the cap-gap round: the `cap_gap` stage, the per-petition `grace` stage, the per-petition `unemployment.opt_card` counter, the petition member and the belonging member of `stem_validation_end`, the anchors `petition_belongs` and `petition_may_belong`, the cap-gap branch of the covered-job test of both concluding evaluations, the petition terms of the `unemployment.total` span, and the checks stem.filed_during_cap_gap, grace.after_cap_gap_outcome, petition.belongs_to_this_status and unemployment.total.through_cap_gap. No petition opens a stage, raises a conflict, or moves a date.
- New judgement check `cap_gap.for_dso` (no for_each, so the item is `cap_gap.for_dso`): it holds while no petition with change_of_status yes is on the record, and goes to the DSO once one is. An unanswered change_of_status is asked. Its rule is the new row capgap.petition_for_dso, 8 CFR 214.2(f)(5)(vi)(A), words checked in the 2026-09-14 and 2026-09-15 texts, derivation reading, with plain words.
- Null while a petition with change_of_status yes is on the record: the program `grace` span when the petition was filed on or before the program end, or the end of its post-completion OPT or STEM card, plus grace.after_completion_days; each validation report and the initial evaluation whose due day is on or after the filing day; the concluding evaluation of the stage when filed on or before the card end plus stem.evaluation_due_days; each job's concluding evaluation when filed on or before the job end plus those days; `unemployment.opt_card` and `unemployment.total` over a card when filed on or before its end plus grace.after_completion_days. A missing filing day is asked.
- stem.filed_while_opt_in_force is skipped while any change-of-status petition is on the record (it was skipped for a petition that might belong).
- rule_ids no longer read by the path were dropped from the items that listed them: capgap.status_ends_on_h1b_start (validations), capgap.end_month_day and capgap.ends_on_outcome (concluding evaluations, unemployment.total), opt.unemployment_in_cap_gap (both unemployment counters). The rows stay.
- Notes of stem.validation_ends_with_extension, stem.opportunity_ends_with_job and capgap.status_ends_on_h1b_start say the same. No existing value, quote, plain text or plain_terms changed. No network was used.

### 2026-09-30, lane L-content, run l-content-34076aca69 (product-2 resolutions points 23, 23a and 24, pack side)

- Point 23 and 23a: every petition member that point 19 added now also needs the petition to be able to extend the period: its start on or after the card start (validations, evaluations, both concluding evaluations, the card member of the program grace, both unemployment counters; anchor `petition_may_extend_card`), on or after the day after the program ends (program member of the grace; anchor `petition_may_extend_grace`), or on or after the start of the job's card (`stem_job_end.evaluation_final`; anchor `petition_may_extend_job_card`). The filing-day tests are unchanged (`on_or_before`).
- The start used is validity_start when the outcome is approved and it is entered, else requested_start, else validity_start. Only when neither is entered is a start asked (validity_start when approved, else requested_start) and the item waits null. The outcome is never asked for it.
- stem.filed_while_opt_in_force is skipped only for a petition whose start is on or after the start of the card the STEM card extends (or whose start is not yet entered, which leaves it unknown and raises nothing).
- cap_gap.for_dso fails only when a change-of-status petition could extend a post-completion OPT or STEM card, or the grace of a completed program with no move, and was filed on or before that card's end or that program's end plus grace.after_completion_days. A petition with neither start entered counts as able to.
- Point 24: plain words of capgap.petition_for_dso name the grace period, counts of days without work, STEM reports and evaluations, and any cap-gap period, and say "a petition for a change of status, such as one for H-1B". plain_terms is now [change of status]. The note records points 23 and 23a. No value or quote changed. No network was used.

### 2026-10-01, lane L-content, run l-content-5bf5944629 (SPEC-W2 point 45, P1 to P3)

- P1: window `opt.last_day` in opt_post. It opens with `opt.apply_window` and closes on the earliest of that window's close (program end plus opt.apply_after_days, as of the filing) and the DSO's recommendation plus opt.file_within_days_of_recommendation. The recommendation date is required: while dso_on is not entered the last day is Can't tell yet and the date is asked (founder decision 2026-10-01, commit c24c65d, SPEC-W2 point 45).
- P1: window `stem.last_day` in stem. It opens with `stem.apply_window` and closes on the earliest of the OPT card's end (stem.apply_window_closes_rule, a reading) and the DSO's recommendation plus stem.file_within_days_of_recommendation. The recommendation date is required here too: missing means Can't tell yet and the date is asked (c24c65d).
- P2: windows `opt.prepare` and `stem.prepare`. Each closes the day its filing window opens and opens `{setting: plan.prepare_months}` before that (K6). A product setting, never a rule. The engine marks them planning (N1). rule_ids name only the rule of the step they prepare for.
- P3: stage `opt_job_start` per job under post-completion OPT, window `opt_job_start.report`, the start plus opt.report_employer_within_days (guidance). Reading: a new job is a change in employment information, and the saved page says "When the student is hired, the student reports the employer information to the DSO".
- P3: stage `stem_job_start` per job under a STEM extension that starts on or after the card start with an employer other than the one on the authorization. Windows `stem_job_start.new_plan` (stem.new_plan_due_days, a new Form I-983) and `stem_job_start.report` (stem.report_change_within_days, a change of employer name and address).
- Not added: a report window on an hours change. No saved source gives days: (f)(10)(ii)(C)(9)(ii) asks for a modified Form I-983 "at the earliest available opportunity", and the SEVP page names no hours. No rule row, value or quote changed. No network was used.

### 2026-10-01, lane L-content, run l-content-7cbb5d276b (reviews/w2-p1.md findings 6 and 7)

- Finding 6: new row opt.job_start_is_employment_change (flag, guidance, derivation reading), quoting the saved SEVP page: "When the student is hired, the student reports the employer information to the DSO." It records the reading that a new job is a change in employment information, so the 10 days of opt.report_employer_within_days apply. It is named in rule_ids of the stage `opt_job_start` and the window `opt_job_start.report`, so their items carry reading: true. opt_job_end.report is unchanged.
- Finding 7: the P1 entry above said the recommendation member of `opt.last_day` was skipped while dso_on is not entered. Corrected: after c24c65d it is required for both last-day windows, and missing means Can't tell yet.
- No value, quote or plain text of an existing row changed. No network was used.

### 2026-10-02, lane L-content, run l-content-fef235f0ff (SPEC-FEED point 55, FEED-PA; carries forward run l-content-55b90b0cb7)

- The fetch of 2026-10-02 (recheck-2026-10-02.json, both fetches of that day) is added to SOURCES.md, with a table of the copies saved under sources/recheck-2026-10-02/.
- checked_on is 2026-10-02 on all 104 parameters and both regimes. 94 rest on copies that came back byte for byte the same (both eCFR texts, the Federal Register documents, the SEVP policy guidance PDF behind its extracted text); the other ten name the copies below, which the second fetch of that day found the same.
- The Study in the States OPT page came back with new markup and the same words. Its seven rows now name sources/sits-f1-opt-2026-10-02.html and its sha256; every quote is in the new copy. The 2026-09-28 copy is kept.
- capgap.fiscal_year_start_month_day and both rows of calendar.federal_holidays_law name the govinfo.gov copies of 31 U.S.C. 1102 and 5 U.S.C. 6103, 2024 Edition: url, citation, snapshot and sha256. uscode.house.gov served a maintenance page on 2026-10-02; the old copies are kept and SOURCES.md says why.
- eCFR version 2026-09-30 of 8 CFR 214.2 recorded in the note of ds_2012 and in SOURCES.md: paragraph (f) is the same as in the 2026-09-15 text.
- The appeal recorded in the note of fixed_admission_2026 from the docket listing fetched 2026-10-02: ECF 53 notice of appeal, ECF 54, ECF 55 First Circuit case 26-2112, all 2026-09-30, no stay entry. Claim 2 of SOURCES.md corrected; it said no appeal was found. The founder signed off on the docket (D90): legal_status stays enjoined, operative stays false, the tag is unchanged, and checked_on is 2026-10-02.
- No value, quote, plain text or plain_terms changed. No network was used by the lane.

### 2026-10-02, lane L-content, run l-content-8120a53a8f (reviews/feed-pa.md findings 3, 4 and 6)

- Finding 3: the notes of capgap.fiscal_year_start_month_day and both rows of calendar.federal_holidays_law say the govinfo.gov copy is the 2024 Edition, current through 2025-01-06, that uscode.house.gov served a maintenance page on 2026-10-02, and that any amendment after 2025-01-06 is not covered by the copy. SOURCES.md says the same.
- Finding 4: the note of fixed_admission_2026 says the docket listing was fetched at 2026-10-02T06:09Z and 06:25Z, before the status conference set for 2026-10-02 at 12:00 PM (ECF 52), so any order from it is not covered.
- Finding 6: two run-on sentences fixed, in the note of fixed_admission_2026 and in SOURCES.md.
- No value, status, date, quote, plain text or plain_terms changed. No network was used.

### 2026-10-02, lane L-content, run l-content-9fb0d8ead7 (SPEC-W2-UNKNOWN points 2, 2a and 14)

What leaving a field empty means, from the list of point 61 as D92 accepted it. Each line gives the screen words that make an empty field the person's statement.

- work.end: when_absent not_yet. Screen words: "Leave empty if you still work there."
- authorization.filed_on: when_absent not_yet. Screen words: "Leave empty if Form I-765 has not been filed yet."
- authorization.decision: when_absent not_yet. Screen words: "Leave empty if no decision has come yet."
- move.registered_on: when_absent not_yet. Screen words: "Leave empty if you have not registered at the new school yet."
- move.release_date: when_absent not_yet. Screen words: "Leave empty if your record has not been released in SEVIS yet."
- move.contacted_new_dso_on: when_absent not_yet. Screen words: "Leave empty if you have not contacted the DSO at the new school yet."
- report.made_on: when_absent not_yet. Screen words: "Leave empty if you have not made this report yet."
- authorization.card_start: when_absent not_yet while the decision is empty or pending, else ask. Screen words: "Leave empty if no decision has come yet."
- authorization.card_end: when_absent not_yet while the decision is empty or pending, else ask. Screen words: "Leave empty if no decision has come yet."
- work.on_campus: when_absent none. Screen words: "Leave empty if the job is not on campus."
- authorization.extends: when_absent none. Screen words: "Leave empty if this permission does not extend an OPT."
- petition.outcome: when_absent none. Screen words: "Leave empty if no outcome has been given."
- petition.validity_start: when_absent none. Screen words: "Leave empty if the petition has no approved validity start date."
- petition.requested_start: when_absent none. Screen words: "Leave empty if the petition asks for no start date."
- authorization.employer: when_absent none on every type but stem_extension, else ask. Screen words: "Leave empty if no employer is named on the Form I-20 for this permission."
- authorization.basis_program: when_absent none on every type but stem_extension, else ask. Screen words: "Leave empty unless this is a STEM extension."
- Every other field stays ask, the default. trip.returned_on stays ask (D92: a trip with no return date is asked, not assumed).
- end_date_change: complete_label "Is this every change of a program end date?" (point 14; the history of program.end_date reads it). Every other kind a history, a first or a count reads already had one.
- No rule, number, source, quote or plain text changed.

### 2026-10-02, lane L-content, run l-content-928ba7af6f (L-engine escalation disputes 1 to 3, SPEC-W2-UNKNOWN points 7a and 11 as amended by D93)

- path.order (program.level): unchanged. A note above it says secondary, language_training, professional and other stay unranked on purpose, since no saved source ranks them (D93).
- Check program.opt_start_not_too_early: the amount is now {setting: product.opt_start_earliest_years_before_program_end}, not {rule: ...}. A note in the check says it rests on Duly's setting, not the law (D93).
- Check stem.extends_post_completion_opt: holds now opens with {field: this.extends, present: true}, the guard point 7a requires, since authorization.extends is when_absent none.
- The notes are YAML comments: contracts/rulepack.schema.json gives order and check no note or reason field.
- No number, rule, source, quote or plain text changed.

### 2026-10-02, lane L-content, run l-content-a822a0bfbf (D94, SPEC-W2-UNKNOWN points 2, 32, 33, 35 and 61 as amended)

- petition.requested_start: when_absent ask, was none (D94). An empty start is asked, never read as none.
- petition.validity_start: when_absent ask, was none (D94).
- capgap.petition_for_dso note: says an empty start is asked, never read as a petition that cannot extend a period, and while it is unanswered cap_gap.for_dso is withheld and the verdict is Can't tell yet with the start asked by name.
- No number, rule, source, quote or plain text changed.
