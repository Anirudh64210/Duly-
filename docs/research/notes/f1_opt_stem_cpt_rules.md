# F-1 Student Employment Rules (OPT, STEM OPT, CPT) for a Deterministic Compliance Engine — status as of 28 Sept 2026

Method note: The regulatory text quoted below was pulled directly from the eCFR point-in-time API for 8 CFR 214.2 on two dates: **2026-09-14** (the last day before the D/S final rule's effective date, which is the text in force now because of the injunction) and **2026-09-15** (the text as amended by the D/S final rule). The URLs are `https://www.ecfr.gov/api/versioner/v1/full/2026-09-14/title-8.xml?part=214&section=214.2` and `.../2026-09-15/...`. The human-readable versions are at https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2 and https://www.ecfr.gov/current/title-8/section-214.2. eCFR's version history for 214.2 shows substantive amendments dated 2026-07-17, 2026-08-11 and 2026-09-15 (https://www.ecfr.gov/api/versioner/v1/versions/title-8.json?section=214.2).

**KEY WARNING FOR THE ENGINE:** As of 28 Sept 2026, eCFR's "current" 8 CFR 214.2(f) shows the **amended fixed-admission-period text**, even though a federal court has **enjoined** that rule nationwide (see Q5). Code must not treat eCFR "current" as the operative law for F-1 grace periods or admission periods. The operative text is the pre-2026-09-15 D/S text.

---

## Q1. Post-completion OPT: application window, 12-month maximum, 14-month window, 90-day unemployment, counting method, 20 hours, qualifying employment, reporting

### Takeaway
The regulation fixes these parameters:
- Filing window: from 90 days before to 60 days after the program end date (PED). The I-765 must also reach USCIS within 30 days of the DSO recommendation.
- Requested start date: no later than PED + 60 days.
- Duration: 12 months per degree level, and all of it must be finished within 14 months after completion of study.
- Unemployment: an aggregate of no more than 90 days.
- Reporting: changes of name or address, and interruptions of employment, go to the DSO. There is no numeric deadline in (f)(12)(i) for regular OPT, but SEVP guidance says 10 days.

The 20-hour/week threshold for post-completion OPT, the "count every calendar day including weekends" method, and the list of qualifying employment types all come from **SEVP policy guidance**, not from the regulation.

### Cited Findings
**Regulation text (operative, pre-9/15/2026 version):**
- 8 CFR 214.2(f)(10): "A student may be authorized 12 months of practical training, and becomes eligible for another 12 months of practical training when they change to a higher educational level. Students in English language training programs are ineligible for practical training." Eligibility requires full-time enrollment "for one full academic year." — [eCFR 214.2 as of 2026-09-14](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- 8 CFR 214.2(f)(10)(ii)(A) lists three types of OPT: (1) during vacation or when school is not in session; (2) while school is in session, "provided that practical training does not exceed 20 hours a week while school is in session"; (3) after completion of study, or after completion of all course requirements excluding thesis. The 14-month rule reads: "A student must complete all practical training within a 14-month period following the completion of study, except that a 24-month extension ... does not need to be completed within such 14-month period." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- 8 CFR 214.2(f)(10)(ii)(A) also says: "The student may not begin optional practical training until the date indicated on his or her employment authorization document, Form I-766." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- 8 CFR 214.2(f)(10)(ii)(B): "Authorization to engage in optional practical training employment is automatically terminated when the student transfers to another school or begins study at another educational level." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- 8 CFR 214.2(f)(11)(i)(B)(2): the I-765 may be filed "up to 90 days prior to his or her program end date and no later than 60 days after his or her program end date," and must be filed "within 30 days of the date the DSO enters the recommendation for OPT into his or her SEVIS record." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- 8 CFR 214.2(f)(11)(i)(B)(1): pre-completion OPT may be filed "up to 90 days before being enrolled for one full academic year, provided that the period of employment will not start prior to the completion of the full academic year." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- 8 CFR 214.2(f)(11)(i)(D): "A student may not request a start date that is more than 60 days after the student's program end date. Employment authorization will begin on the date requested or the date the employment authorization is adjudicated, whichever is later." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- 8 CFR 214.2(f)(11)(iii)(A): the post-completion OPT authorization "begins on the requested date of commencement or the date the Form I-765 ... is approved, whichever is later, and ends at the conclusion of the remaining time period of post-completion OPT eligibility." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- 8 CFR 214.2(f)(10)(ii)(D) defines duration of status on post-completion OPT (operative D/S version) as "the period beginning on the date that the student's application for OPT was properly filed and pending approval, including the authorized period of post-completion OPT, and ending 60 days after the OPT employment authorization expires." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- 8 CFR 214.2(f)(10)(ii)(E): "During post-completion OPT, F-1 status is dependent upon employment. Students may not accrue an aggregate of more than 90 days of unemployment during any post-completion OPT period described in 8 CFR 274a.12(c)(3)(i)(B)." The amended 9/15 text is unchanged. — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- 8 CFR 214.2(f)(12)(i): a student granted OPT "is required to report any change of name or address, or interruption of such employment to the DSO for the duration of the optional practical training." No day count appears in (f)(12)(i). The 10-day limit in the regulation appears only in (f)(12)(ii)(A), which covers STEM. — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- The SEVIS Help Hub states: "While on OPT, the student must report to the DSO within 10 days any changes in the student's name or address, and employment information." It also says the post-completion OPT start date "must be on or after the Program End Date. It cannot be more than 60 days after the Program End Date"; that the student must "file within the 30-day period after your DSO OPT recommendation"; that post-completion OPT employment "must be at least 20 hours per week or full-time"; and that "A student on post-completion OPT can be unemployed for a total of 90 days." It adds that records lacking employer information indicate unemployment. — [Study in the States: F-1 OPT](https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-optional-practical-training-opt)
- ICE's page repeats the 10-day reporting duty and links the underlying SEVP "OPT Policy Guidance" (April 2010, PDF). That PDF would not parse for text extraction here. — [ICE: Practical Training](https://www.ice.gov/sevis/practical-training); [OPT Policy Guidance 042010 PDF](https://www.ice.gov/doclib/sevis/pdf/opt_policy_guidance_042010.pdf)

**How unemployment days are counted (SEVP policy, as relayed by universities):**
- "Each day (including weekends) during the period when OPT authorization begins and ends that the student does not have qualifying employment counts as a day of unemployment." The count starts because "OPT authorization begins on the employment start date shown on the student's EAD." Qualifying employment stops the count. "If a student is employed, he or she would not be considered 'unemployed' on holidays." — [Temple ISSS, quoting SEVP guidance](https://global.temple.edu/isss/students/current-students/f-1-student/f-1-employment-options/campus-employment/optional-practical-training-opt/post-completion-opt/opt-and-unemployment)
- Time abroad: "Time spent outside the United States during an approved period of post-completion OPT counts as unemployment against the 90/150-day limits, unless the student is either: Employed during a period of leave authorized by an employer; or Traveling as part of his or her employment." — [Temple ISSS](https://global.temple.edu/isss/students/current-students/f-1-student/f-1-employment-options/campus-employment/optional-practical-training-opt/post-completion-opt/opt-and-unemployment)

**Qualifying employment types:**
- **Volunteer or unpaid work:** SEVP says a student "may work as a volunteer or unpaid intern, where this practice does not violate any labor laws," but it must be at least 20 hours per week on post-completion OPT and directly related to the course of study. A non-related volunteer position "must not be listed as OPT employment" in SEVIS. — [Study in the States: Reporting Volunteer Positions During OPT (2018)](https://studyinthestates.dhs.gov/2018/07/reporting-volunteer-positions-during-opt-employment)
- **Self-employment:** starting one's own business is permitted on pre- or post-completion OPT if it is related to the program of study. It is not permitted as the STEM OPT employer, because "F-1 students may not provide employer attestations on their own behalf." — [Study in the States: International Students and Entrepreneurship](https://studyinthestates.dhs.gov/international-students-and-entrepreneurship)
- **Multiple employers, contract or agency work, and gig work:** the 2010 OPT Policy Guidance is the source generally cited for these categories:
  - multiple short-term employers (for example, performers)
  - contract work
  - self-employed business owner
  - employment through an agency

  I could not extract its text in this session (PDF parse failure), so the exact conditions are listed under Gaps. — [ICE OPT Policy Guidance 2010](https://www.ice.gov/doclib/sevis/pdf/opt_policy_guidance_042010.pdf)

### Inferences
- **Computable parameters for post-completion OPT (operative law):**
  - `file_window_open = PED − 90d`
  - `file_window_close = PED + 60d`
  - `file_deadline_after_DSO_rec = rec_date + 30d`
  - `latest_requested_start = PED + 60d`
  - `EAD_start = max(requested_start, approval_date)`
  - `max_duration = 12 months − (pre-completion OPT used; see Q4)`
  - `must_end_by = completion_of_study + 14 months`
  - `unemployment_cap = 90` calendar days, aggregate rather than consecutive
- **Unemployment clock:** it starts on the EAD start date, not the approval date or the PED. Each calendar day without qualifying employment of 20+ hours/week related to the degree adds one day, including weekends and holidays. Weekends and holidays inside an employment period do not count. The gap between jobs counts. Days abroad count unless the student is on employer-authorized leave or traveling for work.
- The "at least 20 hours" threshold for regular OPT is SEVP policy, not regulation. Code should cite the SEVIS Help Hub or the 2010 guidance, not 214.2(f)(10)(ii)(E).
- For regular OPT, code should present the reporting deadline as "10 days (SEVP guidance; the regulation states no number for regular OPT)."

### Gaps
- The exact text of the 2010 OPT Policy Guidance on multiple, contract, agency and gig employment, and on the documentation students should keep, could not be retrieved (PDF parse failure). It should be re-pulled manually from https://www.ice.gov/doclib/sevis/pdf/opt_policy_guidance_042010.pdf. Commonly cited ISSS summaries describe it as permitting employment through an agency, contract work, 1099 or self-employment, and multiple short-term gigs, each with documentation. This session did not verify that.
- I did not find an official SEVP rule on whether a day with partial or under-20-hour work counts as unemployed. SEVP measures employment per week, while unemployment accrues per day. Schools interpret this differently.
- I did not confirm whether the unemployment count starts on the EAD start date even when the EAD card arrives later. SEVP guidance says it runs from the EAD validity start date.

---

## Q2. STEM OPT extension (24 months)

### Takeaway
The STEM extension is 24 months, with at most 2 lifetime extensions, the second of which must be based on a higher-level degree. The rules:
- **Employer:** must be enrolled in E-Verify and have an EIN.
- **Hours:** at least 20 hours/week.
- **Training plan:** Form I-983, signed before the DSO recommendation.
- **Evaluations:** the 12-month evaluation and the final evaluation are due to the DSO within 10 days after the period ends.
- **Validation:** every 6 months, due within 10 business days of each reporting date.
- **Change reporting:** changes go to the DSO within 10 days.
- **Employer reporting:** the employer reports a termination or departure within 5 business days.
- **Filing:** up to 90 days before the OPT EAD expires, and within 60 days of the DSO recommendation.
- **Automatic extension:** if timely filed, the EAD is automatically extended while pending under 274a.12(b)(6)(iv), up to 180 days.
- **Unemployment:** aggregate cap of 150 days across the whole OPT period.
- **Validity:** runs from the day after the initial OPT ends, for 24 months, regardless of approval date.

### Cited Findings
- 8 CFR 214.2(f)(10)(ii)(C) (intro): the extension is 24 months for the first qualifying degree. A second 24-month extension is possible for a higher-level degree. "In no event may a student be authorized for more than two lifetime STEM OPT extensions." A prior 17-month extension counts as one. — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- (C)(1): the school must be accredited at the time of application. (C)(2): the degree must be a bachelor's, master's or doctorate in a field on the DHS STEM Designated Degree Program List at the time of the DSO recommendation. — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- (C)(3): a previously obtained STEM degree may be used if it is from an accredited, SEVP-certified U.S. institution and was "conferred within the 10 years preceding the date the DSO recommends the student." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- (C)(5): the employer must be enrolled in E-Verify, "remains a participant in good standing," and must have an EIN. — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- (C)(6): the employer must report termination or departure to the DSO "within five business days". A student is considered departed when the employer knows they have left, or "has not reported ... for a period of five consecutive business days without the consent of the employer, whichever occurs earlier." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- (C)(7): the I-983 must be complete and signed before the DSO recommendation. With a new employer, the student must submit a new I-983 "within 10 days of beginning the new practical training opportunity" and then get a new DSO recommendation. — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- (C)(8): "A student may not engage in practical training for less than 20 hours per week, excluding time off taken consistent with leave-related policies applicable to the employer's similarly situated U.S. workers." Pay must be commensurate with similarly situated U.S. workers. — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- (C)(9)(i): "an initial evaluation within 12 months of the approved starting date on the employment authorization document ... and a concluding evaluation." The DSO must receive them "no later than 10 days following the conclusion of the reporting period or conclusion of his or her practical training opportunity, respectively." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- (C)(9)(ii): a material change requires a modified I-983, submitted "at the earliest available opportunity." There is no fixed day count. Examples given:
  - an EIN change
  - a pay cut not tied to reduced hours
  - a significant cut in hours
  - hours falling below 20
  - any change that makes an attestation inaccurate

  — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- (C)(11): DHS may make site visits, with 48 hours' notice unless the visit is triggered by a complaint. — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- (E): "may not accrue an aggregate of more than 150 days of unemployment during a total OPT period, including any post-completion OPT period ... and any subsequent 24-month extension period." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- (f)(11)(i)(C): the student may file "up to 90 days prior to the expiration date of the student's current OPT employment authorization," and "within 60 days of the date the DSO enters the recommendation." If the application is timely and properly filed and the EAD expires first, the EAD "is extended automatically pursuant to the terms and conditions specified in 8 CFR 274a.12(b)(6)(iv)." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- (f)(11)(iii)(A): the STEM authorization "begins on the day after the expiration of the initial post-completion OPT employment authorization and ends 24 months thereafter, regardless of the date the actual extension is approved." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- (f)(12)(ii)(A): report changes of legal name, address, employer name or address, or loss of employment "Within 10 days of the change". (B): a validation report "every six months," starting on the STEM start date and ending at F-1 expiry or the end of the extension, whichever is first, "due to the student's DSO within 10 business days of each reporting date." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- Study in the States STEM overview:
  - there is a 150-day total, made up of 90 days plus 60 more
  - no self-employment; there must be a bona fide employer-employee relationship
  - the student cannot apply during the 60-day grace period after the initial OPT ends
  - cap-gap runs "until the April 1" of the following year
  - a second degree at a higher level brings a fresh 90/150-day allotment

  The page cites no 180-day figure; that comes from 274a.12(b)(6)(iv). The page's summary also says employers report material changes "no later than five business days". This conflicts with the regulation, which says "at the earliest available opportunity" for a modified I-983, so treat 5 business days as the employer termination-report rule. — [Study in the States: STEM OPT Extension Overview](https://studyinthestates.dhs.gov/stem-opt-hub/additional-resources/stem-opt-extension-overview)
- **DHS STEM list updates:**
  - 12 July 2023 Federal Register notice added 8 CIP codes (e.g., 04.0601, 13.0608, 30.4801, 42.2710, 45.0501). — [FR 2023-14807](https://www.federalregister.gov/documents/2023/07/12/2023-14807/update-to-the-department-of-homeland-security-stem-designated-degree-program-list)
  - A 22 July 2024 notice added Environmental/Natural Resource Economics. — [Study in the States 2024 update](https://studyinthestates.dhs.gov/2024/07/review-the-updated-dhs-stem-designated-degree-program-list)
  - The current list PDF is at [stemList2024.pdf](https://www.ice.gov/doclib/sevis/pdf/stemList2024.pdf); the CIP code index is at [Eligible CIP Codes](https://studyinthestates.dhs.gov/stem-opt-hub/additional-resources/eligible-cip-codes-for-the-stem-opt-extension).

### Inferences
- **Date parameters:**
  - `STEM_start = initial_OPT_end + 1d`
  - `STEM_end = STEM_start + 24 months`
  - `STEM_file_open = initial_OPT_end − 90d`
  - `STEM_file_last = min(initial_OPT_end, DSO_rec_date + 60d)`; filing must happen while in a valid OPT period
  - `eval_12_due = STEM_start + 12 months + 10d`
  - `final_eval_due = training_end + 10d`
  - `validation_dates = STEM_start + 6, 12, 18, 24 months`, each due within 10 business days, which needs a business-day calendar
  - `employer_report_due = departure_date + 5 business days`
  - `new_employer_I983_due = new_start + 10d`
- **Unemployment:** `unemployment_cap_total = 150`, and days used during regular OPT carry over.
- **Automatic extension:** `auto_extension_end = min(decision_date, EAD_expiry + 180d)`. This comes from 274a.12(b)(6)(iv) (verify the exact text; see Gaps).

### Gaps
- I did not fetch the text of 8 CFR 274a.12(b)(6)(iv) in this session. It is widely understood to give an automatic extension of up to 180 days from EAD expiry for timely STEM filings. It should be verified at https://www.ecfr.gov/current/title-8/section-274a.12 before encoding.
- Whether validation and evaluation deadlines count business days or calendar days: the regulation says 10 **business** days for validation and 10 **days** for evaluations. The engine needs a federal-holiday calendar.

---

## Q3. CPT

### Takeaway
CPT is authorized by the DSO in SEVIS and printed on the I-20. It is tied to a specific employer, specific dates and full-time or part-time status. It requires one full academic year of enrollment, except for graduate programs that require immediate CPT. **12 months or more of full-time CPT makes the student ineligible for post-completion OPT.** Part-time CPT has no effect on OPT. August 2026 SEVP broadcasts tightened expectations that CPT be "integral" (required of all students in the curriculum), which puts pressure on "Day 1 CPT." Schools differ widely.

### Cited Findings
- 8 CFR 214.2(f)(10)(i):
  - CPT "is defined to be alternative work/study, internship, cooperative education or any other type of required internship or practicum that is offered by sponsoring employers through cooperative agreements with the school."
  - "Students who have received one year or more of full time curricular practical training are ineligible for post-completion academic training."
  - "Exceptions to the one academic year requirement are provided for students enrolled in graduate studies that require immediate participation in curricular practical training."
  - The DSO records full-time or part-time status, the employer and location, and the start and end dates in SEVIS, and must sign the I-20 before employment begins.

  — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- SEVIS Help Hub: full-time CPT is more than 20 hours/week; part-time is 20 hours or less. "One year of full-time CPT eliminates a student's eligibility for OPT." "Authorization is for one specific employer and for a specific period of time". Concurrent authorizations are possible, with a separate authorization for each employer and each segment. — [Study in the States: F-1 CPT](https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-curricular-practical-training-cpt)
- **SEVP Broadcast Messages:**
  - 2608-01 (12 Aug 2026): "Reminder of Liability for DSOs Regarding CPT Authorization" — [bcm260801.pdf](https://www.ice.gov/doclib/sevis/pdf/bcm260801.pdf)
  - 2608-02 (24 Aug 2026): "Guidance for DSOs regarding CPT" — [bcm_260802.pdf](https://www.ice.gov/doclib/sevis/pdf/bcm_260802.pdf)

  Both are linked from the SEVIS Help Hub. According to a law-firm summary, the guidance says:
  - "all students participating in that curriculum — international and U.S. students alike — must be required to complete the practical training"
  - "An optional elective generally will not satisfy this standard"
  - schools should contract only with bona fide employers
  - it does not expressly prohibit Day 1 CPT
  - it is guidance, not regulation

  I did not read the broadcast PDFs directly. — [NPZ Law Group](https://visaserve.com/sevp-tightens-f-1-visa-cpt-eligibility-rules-in-2026-what-students-schools-and-employers-need-to-know/)
- **Under the enjoined D/S rule text:** a student who files an extension of stay during the 30-day departure period gets no automatic extension of CPT. Otherwise CPT would continue up to 240 days or until the CPT end date on a pending EOS. This is not operative. — [eCFR 2026-09-15 version](https://www.ecfr.gov/current/title-8/section-214.2)

### Inferences
- **Full-time CPT counter:**
  - `fulltime_CPT_days = sum(days of CPT segments where status = FT)`
  - `if fulltime_CPT_days >= 1 year → post-completion OPT ineligible`, for the same degree level
  - Overlapping full-time segments should not be double-counted.
  - Whether the "year" is 365 days or 12 calendar months is not defined in the regulation. It is a school interpretation question, so flag it.
- CPT is authorized per school. The engine should record the DSO's I-20 authorization as the source of truth rather than compute eligibility.

### Gaps
- School-specific policy varies and is not codifiable: credit requirements, how the first-year rule is applied, Day 1 CPT programs, and summer full-time CPT. I did not survey Harvard, Stanford, Berkeley or NYU CPT pages in this session.
- The primary text of the August 2026 broadcasts has not been read directly.

---

## Q4. Pre-completion OPT deduction

### Takeaway
Pre-completion OPT can be part-time (up to 20 hours/week while school is in session) or full-time (during vacation or after coursework). It draws on the same 12-month allotment per degree level.

### Cited Findings
- 8 CFR 214.2(f)(10) gives 12 months of practical training per educational level. (f)(10)(ii)(A)(1)–(2) authorize OPT during vacation, and while school is in session at no more than 20 hours/week. — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- The SEVIS Help Hub confirms that pre- and post-completion OPT are separate, but it does not quantify the deduction. — [Study in the States: F-1 OPT](https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-optional-practical-training-opt)

### Inferences
- `remaining_post_completion_months = 12 − FT_precompletion_months − 0.5 × PT_precompletion_months` is the widely used convention, in which part-time is deducted at 50%. I could not source it to a primary document in this session (see Gaps).

### Gaps
- No primary source was retrieved for the 50% part-time deduction rule. It is believed to come from USCIS I-765 instructions or the SEVP 2010 guidance. Verify it before encoding.

---

## Q5. Grace periods and the 2026 "Duration of Status" final rule (verified)

### Takeaway
**VERIFIED:** DHS published a final rule on **17 July 2026** (FR Doc. 2026-14439), effective **15 Sept 2026**. It replaces D/S with fixed admission periods (program length capped at 4 years, plus 30 days before the program and 30 days after), cuts the F-1 departure grace period from 60 to 30 days, and sets the OPT/STEM admit-until date as the EAD end date plus 30 days.

**However,** on **14 Sept 2026** the U.S. District Court for the District of Massachusetts (Judge F. Dennis Saylor IV, *Presidents' Alliance on Higher Education and Immigration v. DHS*) issued a **nationwide preliminary injunction** barring DHS from implementing it. **D/S and the 60-day grace period remain operative** pending further order.

eCFR nonetheless shows the amended text as "current."

### Cited Findings
**Publication and effective date**
- Federal Register, 17 July 2026: "Establishing a Fixed Time Period of Admission and an Extension of Stay Procedure for Nonimmigrant Academic Students, Exchange Visitors, and Representatives of Foreign Information Media," Doc. 2026-14439. I could not load the FR page (bot-block), so the volume and page citation (91 FR ___) and the RIN are not confirmed here. — [Federal Register](https://www.federalregister.gov/documents/2026/07/17/2026-14439/establishing-a-fixed-time-period-of-admission-and-an-extension-of-stay-procedure-for-nonimmigrant)
- Effective 15 Sept 2026 — [Duane Morris](https://www.duanemorris.com/alerts/dhs_eliminates_duration_status_f_j_i_nonimmigrants_fixed_admission_periods_new_extension_0726.html); [Mintz, 23 July 2026](https://www.mintz.com/insights-center/viewpoints/2806/2026-07-23-dhs-issues-final-rule-creating-fixed-period-admission-f); [Ogletree](https://ogletree.com/insights-resources/blog-posts/dhs-publishes-final-rule-replacing-duration-of-status-with-fixed-admission-periods-for-f-j-and-i-nonimmigrants/)

**Amended regulatory text (enjoined), from eCFR version 2026-09-15:**
- New 214.2(f)(5)(i): "An F-1 student is admitted for a fixed period of time, which is the period necessary to complete the course of study indicated on the Form I-20 ... not to exceed a period of 4 years." Students may be admitted up to 30 days before the program start and may remain 30 days after. These two 30-day periods do not count toward the maximum. Exceptions:
  - English language training is capped at 24 months plus 30 days
  - public high school is capped at 12 months in aggregate

  — [eCFR current](https://www.ecfr.gov/current/title-8/section-214.2)
- New (f)(5)(i)(D): a student with a pending OPT or STEM I-765 who is admitted based on the DSO-recommended employment end date, and whose EAD expires before the I-94 date, is "in a period of authorized stay from the date of the expiration noted on their EAD until the fixed date of admission." — [eCFR current](https://www.ecfr.gov/current/title-8/section-214.2)
- New (f)(5)(v): the grace period is "an additional 30-day period from the program end date or the 4 year maximum period of admission, or the end date of the approved employment authorization for post-completion OPT or STEM OPT." It "will be reflected on the ... Form I-94." A student who ends study or training early must leave or otherwise maintain status within 30 days. Withdrawal gives 15 days. A student out of status gets no grace period. — [eCFR current](https://www.ecfr.gov/current/title-8/section-214.2)
- New (f)(7), extension of stay:
  - An application is timely if USCIS receives it on or before the end of authorized stay, including the 30-day period.
  - A student who files during the 30-day period "may not continue or begin engaging in practical training or other employment."
  - An extension is granted for the program length or requested practical training, up to 4 years.
  - For I-9 purposes, on-campus work, CPT and economic-hardship employment are "considered unexpired for up to 240 days" while an EOS is pending if it was filed before the 30-day period.

  — [eCFR current](https://www.ecfr.gov/current/title-8/section-214.2)
- New OPT provision: a student recommended for post-completion OPT "must apply for an employment authorization and either apply for an extension of stay with USCIS or seek admission through CBP after travel abroad." If granted, the extension "will include the additional 30-day period ... following the expiration of the time approved to complete post-completion OPT." — [eCFR current](https://www.ecfr.gov/current/title-8/section-214.2)
- New (f)(5)(ii):
  - Students below graduate level may not transfer or change major or level in the first academic year, absent an SEVP exception.
  - Graduate students may not change educational objective at all, and may not transfer absent an SEVP exception.
  - After 15 Sept 2026, a student who completes a program may not get F-1 status for a program at the same or a lower level.
  - DHS may delay these provisions until 14 Sept 2028.

  — [eCFR current](https://www.ecfr.gov/current/title-8/section-214.2)
- New 8 CFR 214.1(m)(1) transition rule: F/J students properly maintaining status on 15 Sept 2026 who were admitted D/S may remain "until the later date of either the expiration date on an Employment Authorization Document ... or the program end date noted on their Form I-20 ... not to exceed a period of 4 years from September 15, 2026, plus the departure period of 60 days for F nonimmigrants, which is November 14, 2030." Employment or training continues until the I-20 PED or EAD expiry. Anyone needing more time, including for OPT or STEM OPT, must file an extension of stay. — [eCFR 214.1, 2026-09-15](https://www.ecfr.gov/current/title-8/section-214.1)
- SEVP's own FAQ confirms these points:
  - "The AUD is the employment end date on the Employment Authorization Document, plus 30 days for departure."
  - The grace period falls from 60 to 30 days.
  - SEVP recommends filing the I-539 up to 180 days in advance.
  - D/S students present on the effective date keep status to the I-20 PED (4-year cap) plus 60 days.

  When fetched, the FAQ showed no injunction banner. — [Study in the States FAQ](https://studyinthestates.dhs.gov/final-rule-establishing-a-fixed-time-period-of-admission-and-an-extension-of-stay-procedure-faq)
- **Litigation:**
  - Suit filed 18 Aug 2026.
  - Preliminary injunction issued 14 Sept 2026, nationwide.
  - DHS and ICE are "prohibited ... from taking any further action to implement it while the litigation proceeds."
  - D/S remains in place.

  — [Presidents' Alliance litigation page](https://www.presidentsalliance.org/duration-of-status-litigation/); [Ogletree](https://ogletree.com/insights-resources/blog-posts/u-s-district-court-issues-preliminary-injunction-of-dhss-duration-of-status-framework-rule/)

  Ogletree states that the 60-day grace period continues and that the court found DHS's justifications likely arbitrary and capricious. It has no appeal information. — [Ogletree](https://ogletree.com/insights-resources/blog-posts/u-s-district-court-issues-preliminary-injunction-of-dhss-duration-of-status-framework-rule/); also [Yale OISS update](https://oiss.yale.edu/news/important-update-court-action-on-the-ds-rule), [ICEF](https://monitor.icef.com/2026/09/us-court-grants-preliminary-injunction-to-block-rule-that-would-have-ended-duration-of-status-admissions-for-international-students/)
- **Operative pre-rule text:** 8 CFR 214.2(f)(5)(iv): "An F-1 student who has completed a course of study and any authorized practical training following completion of studies will be allowed an additional 60-day period to prepare for departure ... or to transfer." Withdrawal authorized by the DSO gives 15 days. A student who fails to maintain status gets no grace period. — [eCFR 2026-09-14](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)

### Inferences
- The engine needs a **regime switch**: `regime = DS_2012 (operative)` versus `fixed_admission_2026 (enjoined)`. It should default to D/S while the injunction stands:
  - `grace_end = max(PED, OPT_EAD_end) + 60d`
  - on DSO-authorized withdrawal: `+15d`
  - on status violation: `0`
- Encode the enjoined rule's parameters behind a flag:
  - `AUD = EAD_end + 30d`
  - transition cap = 14 Nov 2030 for F students
  - EOS filed during the grace period stops employment
  - 240-day extension for CPT and on-campus work
- The injunction could be lifted, modified or stayed on appeal at any time. The app should monitor the docket and SEVP broadcasts.
- Never cite eCFR "current" for 214.2(f)(5) without an injunction caveat.

### Gaps
- The FR volume and page, the RIN, and the docket numbers could not be confirmed. The FR site blocked the fetch, and none of the fetched sources gave the RIN. Whether it is 1653-AA78 is unverified.
- The injunction docket number, the text of the order (a § 705 stay versus an injunction, and scope as to non-plaintiffs), and any government appeal or First Circuit stay motion after 14 Sept were not verified.
- The 2026-07-17 and 2026-08-11 eCFR amendments to 214.2 were not identified.

---

## Q6. SEVP enforcement 2025–2026

### Takeaway
In mid-May 2025, SEVP mailed notices to OPT students who had passed 90 days on OPT with no employer in SEVIS. The notices said the SEVIS record would be terminated unless updated within 15 days.

In April 2025, several thousand SEVIS records were terminated, mostly on NCIC hits. More than 100 suits followed, and DOJ announced on 25 April 2025 that the records would be restored. ICE then issued a new SEVIS termination policy.

### Cited Findings
- SEVP began sending letters in mid-May 2025 to students "participating in Optional Practical Training (OPT) for more than 90 days but have not reported any employer information." If the record is not updated "within 15 days of the date of the notice, SEVP will set the SEVIS record to 'terminated'," which "may result in the initiation of immigration proceedings." Students could update through the DSO or the SEVP Portal. — [NAFSA, 16 May 2025 (members-only; summary via search)](https://www.nafsa.org/regulatory-information/sevp-sends-notices-opt-students-without-employer-information-sevis); [Inside Higher Ed, 16 May 2025](https://www.insidehighered.com/news/global/international-students-us/2025/05/16/ice-warns-international-students-more-sevis); [Immigration Policy Tracking Project](https://immpolicytracking.org/policies/ice-reviews-sevis-records-opt-students-who-have-not-reported-employer-information/)
- Precedent: SEVP ran a similar 2020 notice campaign with auto-termination. — [Iandoli Desai & Cronin](https://www.iandoli.com/newsandupdates/sevp-to-mail-notices-to-opt-students-without-employer-information-auto-terminations-looming912020)
- April 2025 terminations: DOJ announced in court on 25 April 2025 that terminated records would be restored pending a new policy. More than 100 district-court suits were filed, and most won TROs or PIs. — [Inside Higher Ed, 25 Apr 2025](https://www.insidehighered.com/news/global/international-students-us/2025/04/25/ice-reverses-course-sevis-terminations); [Inside Higher Ed, 24 Apr 2025](https://www.insidehighered.com/news/global/international-students-us/2025/04/24/international-student-lawsuits-result-restored); [Hunton on new ICE policy](https://www.hunton.com/insights/legal/federal-government-announces-new-policy-on-status-records-for-international-students)

### Inferences
- The SEVP Portal employer record is effectively the enforcement data source. A missing employer at day 90 or later triggers a notice. The engine should warn well before 90 days pass with no employer entered in the Portal, independent of actual employment.

### Gaps
- I found no verified reports of new OPT-specific termination waves in 2026, and did not search exhaustively. The terms of ICE's replacement SEVIS termination policy were not read.

---

## Q7. OPT reform on the regulatory agenda and the OPT fee proposal

### Takeaway
No OPT reform rule has been published. RIN **1653-AA97** ("practical training") is on the DHS agenda with an NPRM target of **February 2027**. A separate DHS proposal to impose **additional fees on OPT I-765s** cleared OIRA review on **20 Aug 2026** but, as of 14 Sept 2026, had **not been published**.

### Cited Findings
- RIN 1653-AA97 appears on the Spring 2025 agenda. — [reginfo.gov](https://www.reginfo.gov/public/do/eAgendaViewRule?pubId=202504&RIN=1653-AA97)
- The 2026 agenda sets an NPRM target of Feb 2027. Stated aims are fraud and national-security concerns, protecting U.S. workers from displacement, and SEVP oversight. — [ICEF, July 2026](https://monitor.icef.com/2026/07/us-regulatory-agenda-for-2026-aims-to-end-duration-of-status-and-introduce-optional-practical-training-and-h-1b-reforms/)
- A DHS letter dated 9 Jan 2026 confirms DHS is re-evaluating the scope and duration of OPT and STEM OPT. — [Erickson Immigration Group](https://eiglaw.com/dhs-confirms-review-of-opt-and-stem-opt/)
- Fee proposal: OMB review was completed on 20 Aug 2026 and the proposal is not yet in the FR. Amount unknown. — [Fragomen, 14 Sept 2026](https://www.fragomen.com/insights/united-states-dhs-optional-practical-training-fee-proposal-clears-federal-review.html)

### Inferences
- The engine should not encode any OPT-reform parameters. Current OPT and STEM rules are unchanged by rulemaking as of Sept 2026.

### Gaps
- The fee proposal's RIN and amount are unknown. Whether it was published between 14 and 28 Sept 2026 is unverified.

---

## Q8. Travel on OPT and address reporting

### Takeaway
By regulation, a student with an unexpired post-completion OPT EAD may return to resume employment with an I-20 travel-endorsed within the last 6 months. Schools add a job or job-offer letter requirement and **disagree** on whether an unemployed student may re-enter. Time abroad counts toward unemployment unless the student is on employer-authorized leave or business travel.

### Cited Findings
- 8 CFR 214.2(f)(13)(ii): "An F-1 student who has an unexpired EAD issued for post-completion practical training and who is otherwise admissible may return to the United States to resume employment after a period of temporary absence. The EAD must be used in combination with a Form I-20 ... endorsed for reentry by the DSO within the last six months." — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)
- Some schools say an unemployed student may re-enter, with the time abroad counting toward unemployment. Others say that if OPT is approved and the student leaves before getting a job, re-entry needs a written job offer. This is a direct conflict among ISSS pages. — [Berkeley](https://internationaloffice.berkeley.edu/students/training/f-1/travel); [Columbia ISSO](https://isso.columbia.edu/content/travel-during-f-1-opt); [UMich](https://internationalcenter.umich.edu/isss/recent-graduates/on-opt) (positions summarized from search results; pages not individually fetched)
- Address: for OPT, a change of address goes to the DSO or SEVP Portal (8 CFR 214.2(f)(12)(i)) within 10 days per SEVP guidance, and within 10 days by regulation for STEM ((f)(12)(ii)(A)). — [eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2); [Study in the States](https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-optional-practical-training-opt)

### Inferences
- **Travel check:**
  - `can_reenter = EAD_unexpired AND I20_travel_sig_date ≥ today − 6 months AND (employed OR job_offer)`, with the job condition as school or CBP practice
  - `unemployment_days += days_abroad` unless `employer_leave OR business_travel`
- **Pending OPT or cap-gap travel:** this is high-risk and should be flagged, not computed.

### Gaps
- I did not source the separate AR-11 (8 CFR 265.1) address duty for USCIS; exempt categories are to be verified.
- I found no CBP primary source on the job-letter requirement.

---

## Q9. What varies by school or DSO

### Takeaway
Key interpretive variations are listed below. The engine should treat them as **school-configurable parameters with citation to the school policy**, not as federal rules.

### Cited Findings
- **CPT:** the integral-curriculum standard, first-year and Day 1 exceptions, and credit requirements. SEVP tightened this in Aug 2026 but left it to DSO determination. — [SEVIS Help Hub CPT](https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-curricular-practical-training-cpt); [NPZ Law](https://visaserve.com/sevp-tightens-f-1-visa-cpt-eligibility-rules-in-2026-what-students-schools-and-employers-need-to-know/)
- **Travel while unemployed** on OPT (see Q8). — [Berkeley](https://internationaloffice.berkeley.edu/students/training/f-1/travel); [Columbia](https://isso.columbia.edu/content/travel-during-f-1-opt)
- **Unemployment interpretation:** schools cite SEVP policy in different words (e.g., Temple's detailed rules). — [Temple](https://global.temple.edu/isss/students/current-students/f-1-student/f-1-employment-options/campus-employment/optional-practical-training-opt/post-completion-opt/opt-and-unemployment); [UCI](https://ic.uci.edu/welcome-students/students-current-students/students-current-employment-information/mandatory-reporting-requirements-for-opt/); [Northwestern](https://www.northwestern.edu/international/international-students/student-employment/while-on-opt-stem-opt1/while-on-opt.html)
- **Volunteer or self-employment documentation** is a DSO judgment on the "directly related" standard. — [Study in the States volunteer post](https://studyinthestates.dhs.gov/2018/07/reporting-volunteer-positions-during-opt-employment)

### Inferences
- Candidate school-configurable parameters:
  - `CPT_first_year_exception_programs`
  - `CPT_fulltime_year_definition` (365 days vs 12 months)
  - `travel_unemployed_allowed`
  - `job_letter_required`
  - `evidence_required_for_volunteer_selfemployment`
  - `I-20 travel signature validity` (6 months for OPT by regulation; 12 months while enrolled per 214.2(f)(4); not verified here)

### Gaps
- I did not survey the Harvard, Stanford or NYU pages for comparison, due to tool-call limits.
