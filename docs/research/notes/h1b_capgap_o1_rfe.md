# Transition-stage rules after F-1 (H-1B, cap-gap, O-1, USCIS evidence/RFE policy): what Duly must encode, as of 2026-09-28

Status legend used below: **[SETTLED]** = regulation or policy in force; **[LITIGATED]** = in force but under challenge, or blocked or vacated by a court; **[PROPOSED]** = not final; **[UNVERIFIED]** = could not confirm from a primary source in this session.
Verification note: "(primary, fetched)" means I read the text myself during this session: eCFR XML, the USCIS PA-2026-05 PDF, or the First Circuit order PDF. Everything else comes from secondary sources such as law firm alerts, university international student offices (ISSOs) and search snippets.

---

## 1. Cap-gap: 8 CFR 214.2(f)(5)(vi), as amended by the H-1B modernization rule (effective Jan 17, 2025)

### Takeaway
[SETTLED] An F-1 student's status and OPT/STEM OPT work authorization are extended automatically until **April 1** of the H-1B fiscal year, or until the H-1B start date if that is earlier. Before the rule the end date was Oct 1. Three conditions must hold: the cap-subject change-of-status H-1B petition was timely filed, it requests a start date in that fiscal year, and it is nonfrivolous. The extension ends automatically if the petition is rejected, denied, revoked or withdrawn, or if the change-of-status request is denied or withdrawn. It ends even if the petition is approved for consular processing. An enjoined 2026 rule on duration of status (D/S) would change the surrounding framework.

### Cited Findings
- Current regulation text (primary, fetched from eCFR, point-in-time 2026-09-01):
  - (A) D/S and any work authorization under 8 CFR 274a.12(c)(3)(i)(B) or (C) (post-completion OPT and STEM OPT) of an F-1 who is the beneficiary of a cap-subject H-1B petition "requesting a change of status will be automatically extended until April 1 of the fiscal year for which such H-1B status is being requested or until the validity start date of the approved petition, whichever is earlier." The petition must (1) be timely filed, (2) request an employment start date in that fiscal year consistent with (h)(2)(i)(I), and (3) be nonfrivolous. — [eCFR 8 CFR 214.2](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2#p-214.2(f)(5)(vi))
  - (B) The extension "shall automatically terminate upon the rejection, denial, revocation, or withdrawal of the H-1B petition … or upon the denial or withdrawal of the request for change of nonimmigrant status, even if the H-1B petition … is approved for consular processing." — [eCFR](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2#p-214.2(f)(5)(vi))
  - (C) The student must not have violated the terms of their nonimmigrant status (consistent with 8 CFR part 248). (D) The extension also covers F-2 dependents. — [eCFR](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2#p-214.2(f)(5)(vi))
- Change history:
  - Cap-gap was created in 2008 with an Oct 1 end date. — [Univ. of Houston ISSSO (secondary)](https://www.uh.edu/issso/students/f-1/opt/h1b-cap-gap-extension/)
  - The modernization final rule was published Dec 18, 2024, effective Jan 17, 2025. It moved the end date from Oct 1 to April 1 (or the approved start date, if earlier). — [Federal Register 2024-29354](https://www.federalregister.gov/documents/2024/12/18/2024-29354/modernizing-h-1b-requirements-providing-flexibility-in-the-f-1-program-and-program-improvements); [Alston & Bird](https://www.alston.com/en/insights/publications/2024/12/new-h-1b-rule-published-modernize-visa-program)
- [LITIGATED] D/S final rule, published July 17, 2026 with a scheduled effective date of Sept 15, 2026. It would replace D/S with fixed admission periods of up to 4 years (program end date plus 30 days). It would cut the F-1 grace period from 60 to 30 days and require Form I-539 extension-of-stay filings. It contains a transition rule: students admitted before Sept 15, 2026 who file an I-765 for OPT or STEM OPT on or before March 18, 2027 do not need an extension-of-stay filing. — [Federal Register 2026-14439](https://www.federalregister.gov/documents/2026/07/17/2026-14439/establishing-a-fixed-time-period-of-admission-and-an-extension-of-stay-procedure-for-nonimmigrant); [Yale OISS summary](https://oiss.yale.edu/immigration/elimination-of-duration-of-status-summary-faqs)
- [LITIGATED] On Sept 14, 2026, Judge F. Dennis Saylor IV (D. Mass., *Presidents' Alliance et al. v. DHS*) preliminarily enjoined the whole D/S rule. He found it likely violates the APA. The current D/S framework therefore remains in place. — [Yale OISS](https://oiss.yale.edu/news/important-update-court-action-on-the-ds-rule); [Seyfarth](https://www.seyfarth.com/news-insights/federal-court-temporarily-blocks-dhs-duration-of-status-rule.html); [BAL](https://www.bal.com/immigration-news/united-states-federal-court-blocks-dhs-duration-of-status-final-rule-before-effective-date/); [NAFSA](https://www.nafsa.org/legal-defense-DS)

### Inferences
- Duly's date engine should compute the cap-gap end date as `min(April 1 of FY, approved validity start date)`. The engine needs a separate flag for each termination trigger: rejected, denied, revoked or withdrawn petition, and denied or withdrawn change of status. A consular-processing approval also ends cap-gap.
- To show the extension applies, the student should keep: the I-797 receipt (proof of timely filing and change-of-status request), the requested start date, the EAD, the updated cap-gap I-20 or DSO endorsement, and later the approval or denial notice with dates. I found no primary SEVP guidance on this in this session; the list is based on how ISSOs generally practice.
- Duly should keep a rules-version switch for the D/S rule. If the injunction is lifted, the grace period (60 vs 30 days), the admit-until date and the extension-of-stay deadlines all change.

### Gaps
- I did not fetch the current SEVP/ICE cap-gap guidance. Unconfirmed: whether a student whose OPT expired and who is in the 60-day grace period gets status but no work authorization, and the exact I-20 procedure.
- I did not verify whether the D/S final rule amends 214.2(f)(5)(vi) itself.

---

## 2. H-1B registration and lottery: weighted selection, beneficiary-centric selection, registration fee

### Takeaway
[SETTLED, not challenged in court as of research] The wage-weighted selection final rule was published Dec 29, 2025 and took effect Feb 27, 2026. It governed the FY2027 cap season. Each unique beneficiary gets 4, 3, 2 or 1 entries for OEWS wage levels IV, III, II and I, and is assigned the **lowest** level among all registrations filed for them. Beneficiary-centric counting remains. The registration fee is $215.

### Cited Findings
- Regulation text (primary, fetched from eCFR): "USCIS will assign each unique beneficiary to the lowest OEWS wage level among all registrations submitted on the beneficiary's behalf". Level IV is entered 4 times, III 3 times, II 2 times, I once. Registrations "will be counted based on the number of unique beneficiaries that are registered." — [eCFR 214.2(h)(8)(iii)](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2)
- Registration fee text (primary, fetched from eCFR): "The registration fee is non-refundable and due at the time the registration is submitted". USCIS may deny or revoke a petition if the fee is declined, disputed or invalid. Petitioners have at least 90 days to file after selection. — [eCFR 214.2(h)(8)(iii)(D)](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2)
- Dates: published at 90 FR on Dec 29, 2025 (FR doc 2025-23853), effective Feb 27, 2026. The NPRM came out in Sept 2025. — [Federal Register](https://www.federalregister.gov/documents/2025/12/29/2025-23853/weighted-selection-process-for-registrants-and-petitioners-seeking-to-file-cap-subject-h-1b); [Greenberg Traurig](https://www.gtlaw.com/en/insights/2026/2/uscis-finalizes-wage-weighted-h-1b-cap-selection-rule-effective-feb-27-2026)
- The wage level at registration is the highest OEWS level the offered wage meets for the SOC code and area of employment. The wage level, SOC code and area must match the LCA filed with the petition, and USCIS may deny or revoke if registration data appear engineered to inflate the odds. — [Greenberg Traurig](https://www.gtlaw.com/en/insights/2026/2/uscis-finalizes-wage-weighted-h-1b-cap-selection-rule-effective-feb-27-2026)
- FY2027 timeline:
  - Registration ran March 4 (noon ET) to March 19, 2026 (5 pm ET). Fee: $215 per registration.
  - Earliest filing date for selected registrations: April 1, 2026.
  - USCIS says both the 65,000 regular cap and the 20,000 advanced-degree cap for FY2027 have been reached.
  - For comparison, FY2026 had about 343,981 eligible registrations and 120,141 selected.
  - Source: [USCIS H-1B Electronic Registration Process](https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-1b-specialty-occupations/h-1b-electronic-registration-process); [USCIS alert, March 4 opening](https://www.uscis.gov/newsroom/alerts/fy-2027-h-1b-cap-initial-registration-period-opens-on-march-4)
- The FY2027 filing window closed June 30, 2026. The cap was reached and there was no second selection round. — [Klasko](https://www.klaskolaw.com/august-2026-100000-h-1b-fee-blocked-again/)
- Litigation: as of March 2026 no business group had sued over the weighted rule. — [Forbes (Stuart Anderson), Mar 3, 2026](https://www.forbes.com/sites/stuartanderson/2026/03/03/no-business-immigration-lawsuits-filed-against-dhs-h-1b-lottery-rule/)

### Inferences
- For F-1 and OPT users (often offered Level I or II wages), selection odds are now structurally lower than under the random lottery. Duly should record the registration wage level, SOC code and worksite, because mismatches with the later LCA are a denial risk.

### Gaps
- I did not find official FY2027 registration and selection counts, or selection rates by wage level.
- I did not confirm whether any lawsuit against the weighted rule was filed after March 2026.

---

## 3. $100,000 H-1B payment (Proclamation 10973, Sept 19, 2025)

### Takeaway
[LITIGATED; not collectible now] Proclamation 10973 requires a $100,000 payment with certain **new** H-1B petitions filed after 12:01 am EDT on Sept 21, 2025 for beneficiaries **outside the U.S.** USCIS guidance exempted change-of-status filings such as F-1 to H-1B. On June 8, 2026, D. Mass. vacated the agency policy implementing the payment. The First Circuit refused to stay that ruling on July 24, 2026, and USCIS says it is complying, so the fee is not owed now. On Sept 18, 2026, the proclamation was extended through Sept 21, 2027, but the vacatur still controls. In a separate case, D.D.C. upheld the fee (Dec 23, 2025); that appeal is pending in the D.C. Circuit.

### Cited Findings
- The First Circuit order in *California v. Mullin*, No. 26-1699, entered July 24, 2026 (primary, fetched):
  - The proclamation (90 FR 46027, Sept 19, 2025) directs DHS to "restrict decisions" on H-1B petitions without a $100,000 payment for individuals "currently outside the United States."
  - DHS and DOS took ten implementing actions between Sept 19 and Oct 20, 2025, including DOS FAQs and a DHS fee schedule.
  - 20 states sued on Dec 12, 2025. On June 8, 2026, the district court (Judge Sorokin) declared the policy unlawful and "VACATED [it] … in its entirety" under 5 U.S.C. 706(2).
  - The First Circuit found no "strong showing" of likely success, noting the "tax" question under *Learning Resources v. Trump*, and denied the stay pending appeal.
  - Source: [First Circuit order PDF](https://www.ca1.uscourts.gov/sites/ca1/files/opnfiles/26-1699O-01A.pdf)
- USCIS says the $100,000 applies to "any new H-1B visa petitions submitted after 12:01 a.m. eastern daylight time on Sept. 21, 2025" and does not change fees for renewals. After the First Circuit ruling, DHS "will comply with the court's order while DHS considers next steps." — [USCIS H-1B FAQ](https://www.uscis.gov/newsroom/alerts/h-1b-faq)
- USCIS's Oct 2025 clarification: the fee does not apply to petitions requesting a change of status for people already in the U.S., such as F-1 to H-1B. It applies to new petitions for beneficiaries outside the U.S. without a valid H-1B visa. — [BakerHostetler](https://www.bakerlaw.com/insights/uscis-clarifies-when-100000-h-1b-fee-is-required-exempting-most-f-1-students/); [Yale OISS](https://oiss.yale.edu/news/presidential-proclamation-extends-h-1b-100000-fee-policy-fee-remains-blocked-by-court-order)
- Sequence after the ruling: Judge Sorokin administratively stayed his own ruling on June 12, 2026, which temporarily reinstated the fee. The First Circuit lifted that stay on July 24. The merits appeal is pending. — [Klasko](https://www.klaskolaw.com/august-2026-100000-h-1b-fee-blocked-again/); [Littler](https://www.littler.com/news-analysis/asap/appellate-court-pauses-100000-h-1b-fee-policy-appeal-continues)
- Conflicting ruling: in *Chamber of Commerce v. DHS* (D.D.C. No. 1:25-cv-03675), the court upheld the fee under INA 212(f) on Dec 23, 2025. The appeal (D.C. Cir. No. 25-5473) was expedited and argued March 9, 2026. I found no D.C. Circuit decision. — [Fragomen](https://www.fragomen.com/insights/united-states-district-court-judge-issues-opinion-upholding-dollar100000-h-1b-fee.html); [AILA](https://www.aila.org/library/district-court-rules-in-favor-of-dhs-in-lawsuit-over-100-000-h-1b-fee); [Bloomberg Law](https://news.bloomberglaw.com/daily-labor-report/dc-circuit-questions-if-trumps-100-000-h-1b-fee-is-a-tax)
- A third suit, *Global Nurse Force v. Trump*, is pending in N.D. Cal. — [CalChamber HRWatchdog](https://hrwatchdog.calchamber.com/2026/01/h-1b-visa-updates-new-selection-rules-100k-fee-withstands-legal-challenge/)
- Sept 18, 2026 actions:
  - A new proclamation extends Proclamation 10973 through Sept 21, 2027.
  - An executive order directs DOS, DOL and DHS to consider whether a sponsor had layoffs in the prior year or plans layoffs. It also directs DOL's Wage and Hour Division to review past LCAs for enforcement.
  - Sources: [Ogletree Beltway Buzz, Sept 25, 2026](https://ogletree.com/insights-resources/blog-posts/beltway-buzz-september-25-2026/); [DiRaimondo & Schroeder, Sept 21, 2026](https://www.diraimondoschroeder.com/updates/2026/9/21/trump-administration-extends-100000-h-1b-proclamation-through-september-2027-but-fee-remains-blocked-by-court-order)
- Law firms warn employers not to assume the extension reinstates the fee, and report that adjudication is inconsistent. — [DiRaimondo & Schroeder](https://www.diraimondoschroeder.com/updates/2026/9/21/trump-administration-extends-100000-h-1b-proclamation-through-september-2027-but-fee-remains-blocked-by-court-order)
- Whether fees already paid will be refunded is unresolved. — [Klasko](https://www.klaskolaw.com/august-2026-100000-h-1b-fee-blocked-again/)

### Inferences
- For the typical Duly user (F-1 or OPT inside the U.S. changing status), the fee never applied under USCIS guidance. The risk scenario is a user who departs and needs consular processing or is otherwise "outside the U.S." Duly should record whether the petition requested change of status or consular notification, and record travel.
- Given the circuit split and possible Supreme Court review, this belongs in a "litigated, check-date" field, not a hard-coded rule.

### Gaps
- I did not read the DHS/USCIS Oct 20, 2025 guidance itself, only secondary summaries of its change-of-status exemption.
- D.C. Circuit decision status after March 2026 is unknown.
- I did not verify the Sept 18, 2026 proclamation's number or Federal Register citation.

---

## 4. H-1B modernization rule (published Dec 18, 2024; effective Jan 17, 2025)

### Takeaway
[SETTLED] The rule codified the following:
- a tighter "specialty occupation" definition: the degree must be in a "directly related specific specialty", and a general degree is not enough;
- a definition of "U.S. employer" that includes remote and telework;
- beneficiary-owner (founder) eligibility with 18-month validity limits;
- cap-gap to April 1;
- a new Form I-129 edition.

### Cited Findings
- Specialty occupation definition (primary, fetched from eCFR): it "requires the attainment of a bachelor's degree or higher in a directly related specific specialty, or its equivalent." "A position is not a specialty occupation if attainment of a general degree, without further specialization, is sufficient." A range of degree fields is allowed "provided that each of those fields is directly related to the duties". "Directly related means there is a logical connection between the required degree … and the duties." — [eCFR 214.2(h)(4)(ii)](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2)
- U.S. employer (primary, fetched from eCFR): must have a bona fide job offer to work in the U.S. ("which may include telework, remote work, or other off-site work within the United States"), legal presence and amenability to service, and an IRS tax ID. — [eCFR 214.2(h)(4)(ii)](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2)
- Beneficiary-owner rules (primary, fetched from eCFR):
  - A beneficiary with a "controlling interest" (more than 50% ownership or majority voting rights) may do owner/director duties "as long as the beneficiary will perform specialty occupation duties a majority of the time."
  - The initial approval is limited to "up to 18 months", and the first extension is also limited to 18 months.
  - Sources: [eCFR 214.2(h)(4)(ii) and (h)(9)(iii)(E)](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2)
- The rule and a new Form I-129 took effect Jan 17, 2025. — [Federal Register 2024-29354](https://www.federalregister.gov/documents/2024/12/18/2024-29354/modernizing-h-1b-requirements-providing-flexibility-in-the-f-1-program-and-program-improvements); [Alston & Bird](https://www.alston.com/en/insights/publications/2024/12/new-h-1b-rule-published-modernize-visa-program)

### Inferences
- A founder-user on H-1B through their own company must track the 18-month validity limits separately from the standard 3-year period. Evidence that specialty duties take the majority of their time is a record-keeping target.
- Duly should store the degree field and job duties to support the "directly related" test.

### Gaps
- I did not verify the rule's other provisions (site-visit codification, changes to the nonprofit/research cap-exemption definition, deference to prior approvals) from primary text in this session.

---

## 5. O-1 basics for students and founders

### Takeaway
[SETTLED] O-1A requires "sustained national or international acclaim". The applicant must show either a major internationally recognized award or 3 of the 8 regulatory criteria; comparable evidence is allowed. A January 2025 Policy Manual update clarified that founder-owned entities can petition and added guidance on startup and critical-technology evidence (secondary sources only).

### Cited Findings
- O-1A criteria (primary, fetched from eCFR), under 8 CFR 214.2(o)(3)(iii):
  - Either (A) a major internationally recognized award such as a Nobel Prize, or (B) at least 3 of the following:
    1. nationally or internationally recognized prizes;
    2. membership in associations that require outstanding achievement;
    3. published material about the person;
    4. judging the work of others;
    5. original contributions of major significance;
    6. scholarly authorship;
    7. a critical or essential role in distinguished organizations;
    8. a high salary.
  - (C) Comparable evidence is allowed if the criteria "do not readily apply."
  - Source: [eCFR 214.2(o)(3)(iii)](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2)
- Jan 8, 2025 USCIS Policy Manual update (Vol. 2, Part M), per secondary sources:
  - a beneficiary-owned entity can petition if there is real oversight, such as a board;
  - guidance on critical fields (AI, cybersecurity);
  - startup funding can support the salary and critical-role criteria.
  - Sources: [Jewell Stewart Pratt](https://www.jspvisa.com/blog/2025/2/4/updated-uscis-guidance-on-o-1-extraordinary-ability-visa-category); [Colombo & Hurd](https://www.colombohurdlaw.com/uscis-updates-guidance-for-o-1-visa-eligibility/)

### Inferences
- Duly's O-1 record-keeping can map directly onto the 8 criteria: awards, memberships, press (with title, date and author, which the regulation requires), judging, contributions, publications, critical roles and compensation.
- Under PA-2026-05 (section 6), incomplete initial O-1 evidence may now be denied without an RFE, so completeness at filing matters more.

### Gaps
- I did not fetch the USCIS Policy Manual Part M or the Jan 2025 policy alert itself.
- I found no verified 2026 O-1 policy change.
- I did not cover the O-1 advisory opinion (consultation) requirement.

---

## 6. USCIS evidence, RFE and NOID policy: PA-2026-05 (Aug 5, 2026), history, and 8 CFR 103.2(b)(8) and (b)(11)

### Takeaway
[SETTLED, verified from primary source] PA-2026-05 exists. It is titled "Evidence, Requests for Evidence, and Notices of Intent to Deny", dated Aug 5, 2026, and effective immediately for pending and new filings. It does four things:
- restores full officer discretion to deny without an RFE or NOID when required initial evidence is missing;
- makes 12 weeks the RFE **maximum**, not the default;
- ends the extra 14 days for notices mailed abroad (only 3 mailing days remain);
- treats any partial response as a request for a decision.

This restores the direction of the 2018 memo PM-602-0163, which was rescinded June 9, 2021 by PA-2021-11.

### Cited Findings
- PA-2026-05 (primary, fetched PDF):
  - Header "PA-2026-05 August 5, 2026 … SUBJECT: Evidence, Requests for Evidence, and Notices of Intent to Deny."
  - "restore USCIS officers' full discretion to deny such benefit requests without first issuing an RFE or NOID, as allowed by the regulations."
  - "officers are not required to issue an RFE with a standard 12-week response period, but rather the maximum response period cannot exceed 12 weeks."
  - "USCIS no longer provides … an additional 14 days to respond to notices mailed outside the United States, as the regulations only allow for an additional 3 days."
  - Any evidence received, even a partial response, is treated "as a request for a decision."
  - The policy clarifies initial vs additional evidence, primary vs secondary evidence, and the weight of affidavits.
  - It is "effective immediately and applies to benefit requests pending or filed on or after the publication date."
  - Affected sections: Vol. 1, Part E, Ch. 6 (Evidence), Ch. 9 §B (Denials) and Ch. 10 §D.
  - It cites "frivolous and placeholder filings to secure ancillary benefits" as the rationale.
  - Source: [USCIS PA-2026-05 PDF](https://www.uscis.gov/sites/default/files/document/policy-manual-updates/20260805-EvidentiaryStandards.pdf); [USCIS news alert](https://www.uscis.gov/newsroom/alerts/uscis-to-reduce-frivolous-immigration-benefits-requests-by-reinforcing-evidence-standards)
- Early practice: 30-day RFE deadlines are appearing, compared with the roughly 84 days that was typical before. — [GT Inside Business Immigration](https://www.gtlaw-insidebusinessimmigration.com/rfe/usciss-new-rfe-policy-is-already-having-an-impact-30-day-response-deadlines-are-emerging/); [Reddy Neumann Brown](https://www.rnlawgroup.com/uscis-shortens-rfe-response-times-how-the-august-5-2026-policy-affects-eb-1a-and-eb-2-niw-cases/)
- Secondary sources describe affidavits as now generally "tertiary evidence". The requestor must explain why primary evidence is unavailable. — [DiRaimondo & Schroeder](https://www.diraimondoschroeder.com/updates/2026/8/10/uscis-expands-authority-to-deny-cases-without-requests-for-evidence-and-tightens-evidentiary-standards)
- 8 CFR 103.2(b)(8) (primary, fetched from eCFR):
  - (ii) If required initial evidence is missing, USCIS "in its discretion may deny … or request that the missing initial evidence be submitted."
  - (iii) If initial evidence is complete but does not establish eligibility, USCIS may deny, issue an RFE, or issue a NOID.
  - (iv) "in no case shall the maximum response period provided in a request for evidence exceed twelve weeks, nor … a notice of intent to deny exceed thirty days. Additional time to respond … may not be granted."
  - Source: [eCFR 8 CFR 103.2](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-103/section-103.2)
- 8 CFR 103.2(b)(11) (primary, fetched from eCFR): the requestor may submit a complete response, submit a partial response and ask for a decision, or withdraw. "All requested materials must be submitted together at one time". "Submission of only some of the requested evidence will be considered a request for a decision on the record." Under (b)(13), failure to respond may lead to summary denial as abandoned, denial on the record, or both. — [eCFR 8 CFR 103.2](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-103/section-103.2)
- History:
  - PM-602-0163 (July 13, 2018) gave officers discretion to deny without an RFE or NOID.
  - PA-2021-11 (June 9, 2021) rescinded it and returned to the 2013 principle of issuing an RFE when more evidence could establish eligibility.
  - Sources: [USCIS PA-2021-11 PDF](https://www.uscis.gov/sites/default/files/document/policy-manual-updates/20210609-RFEs&NOIDs.pdf); [Immigration Policy Tracking Project](https://immpolicytracking.org/policies/uscis-directs-adjudicators-to-deny-more-applications-without-issuing-a-request-for-evidence/)

### Inferences
- Duly's deadline engine must calculate the RFE or NOID due date from **the date printed on the notice**, plus 3 days if the notice was mailed. It must not assume 84 or 98 days. The deadline cannot be extended.
- Duly should push users to assemble complete initial evidence before filing (for example I-765 OPT/STEM, I-539, change of status). A partial RFE response means the case is decided on the record.

### Gaps
- None material on existence or content; the policy is verified. Litigation challenging PA-2026-05 was not searched.

---

## 7. USCIS use of AI or automated tools

### Takeaway
[SETTLED as disclosed; details are thin] The DHS AI Use Case Inventory (Jan 28, 2026 update) reportedly lists about 29 USCIS use cases, such as evidence classification, translation and fraud analytics. DHS describes them as decision support, with human officers making final decisions. The claim that AI is driving higher RFE and denial rates is law firm opinion, not an agency statement.

### Cited Findings
- DHS publishes an AI Use Case Inventory. — [DHS AI Use Case Inventory](https://www.dhs.gov/ai/use-case-inventory)
- The Jan 28, 2026 update reportedly lists about 29 USCIS use cases, including an "Evidence Classifier". DHS says the tools are decision support and final decisions are human. — [search summary citing Alma](https://www.tryalma.com/learn/what-employers-should-know-about-usciss-use-of-artificial-intelligence) [secondary; not verified against the inventory]
- Law firm commentary on expanding AI use in adjudications: [Greenberg Traurig, Feb 2026](https://www.gtlaw.com/en/insights/2026/2/published-articles/the-us-governments-expanding-use-of-ai-in-immigration-adjudications-considerations-for-employers-and-investors); [Cozen O'Connor 2026 (claims AI is driving higher RFE and denial rates; opinion)](https://www.cozen.com/news-resources/publications/2026/growing-use-of-artificial-intelligence-in-u-s-immigration-adjudications-is-driving-higher-rfe-and-denial-rates)

### Gaps
- [UNVERIFIED] I did not open the inventory to confirm the count and names of USCIS use cases.
- I found no formal USCIS policy statement on AI in adjudication.

---

## 8. 2025–2026 consular and enforcement changes affecting students

### Takeaway
Four items:
- Interview waivers were mostly eliminated from Sept 2, 2025 [SETTLED].
- F, M and J applicants must set social media to "public" (June 18, 2025) [SETTLED].
- Travel bans: Proclamation 10949 (June 4, 2025) covers 19 countries, and it was expanded to 39 countries plus Palestinian Authority documents effective Jan 1, 2026 [SETTLED]. F, M and J visas are suspended for the partial-ban countries.
- The 2025 SEVIS termination wave (about 4,700 records) was largely reversed by the government on April 25, 2025. It was followed by an N.D. Cal. nationwide injunction (May 22, 2025) and the *AAUP v. Rubio* First Amendment ruling (Sept 30, 2025; policy vacated Jan 22, 2026; on appeal) [LITIGATED].

### Cited Findings
- From Sept 2, 2025, DOS requires in-person interviews for most nonimmigrant visa applicants, including F and J renewals. — [Fragomen](https://www.fragomen.com/insights/united-states-starting-september-2-state-department-eliminates-nonimmigrant-visa-interview-waivers-for-most.html); [Columbia](https://immigration.columbia.edu/news/us-department-state-will-require-person-interviews-most-visa-renewals-starting-september-2)
- June 18, 2025 DOS announcement: F, M and J applicants are told to set all social media profiles to "public". The vetting looks for hostility toward U.S. "citizens, culture, government, institutions, or founding principles." — [State Dept. announcement](https://www.state.gov/releases/office-of-the-spokesperson/2025/06/announcement-of-expanded-screening-and-vetting-for-visa-applicants/); [CUPA-HR](https://www.cupahr.org/resource/state-department-unveils-student-and-exchange-visitor-visa-social-media-vetting-guidance-2025-06-24/)
- Expanded vetting was later extended to H-1B and H-4 applicants (Dec 2025). — [Phillips Lytle](https://phillipslytle.com/u-s-department-of-state-announces-expanded-screening-and-vetting-for-h-1b-and-h-4-visa-applicants/) [secondary; I did not fetch it for details]
- Travel ban:
  - The Dec 16, 2025 proclamation extends Proclamation 10949 (19 countries) and adds partial restrictions on 20 more countries plus Palestinian Authority travel documents, effective Jan 1, 2026.
  - For partial-ban countries, B, F, M and J entry is suspended.
  - It generally does not affect students already in the U.S. or those holding visas issued before the effective date.
  - Sources: [CRS IN12631](https://www.congress.gov/crs-product/IN12631); [NAFSA](https://www.nafsa.org/regulatory-information/proclamation-december-16-2025-travel-ban-effective-january-1-2026); [Fragomen](https://www.fragomen.com/insights/united-states-travel-ban-expanded-and-revised-effective-january-1-2026.html)
- SEVIS 2025:
  - Starting late March 2025, SEVP terminated about 4,700 records, often based on criminal database hits, and more than 100 suits followed. — [CASRAI litigation tracker (secondary)](https://casrai.org/news/sevis-record-terminations-visa-revocations-2026-litigation-status)
  - On April 25, 2025, DOJ told courts that ICE would restore records and was developing a framework for future terminations. — [Inside Higher Ed](https://www.insidehighered.com/news/global/international-students-us/2025/04/25/ice-reverses-course-sevis-terminations); [Hunton](https://www.hunton.com/insights/legal/federal-government-announces-new-policy-on-status-records-for-international-students)
  - On May 22, 2025, Judge Jeffrey White (N.D. Cal.) issued a nationwide injunction against terminations under the "Student Criminal Alien Initiative". He rejected the argument that a SEVIS record is separate from legal status. — [JURIST](https://www.jurist.org/news/2025/05/us-federal-judge-blocks-trump-administration-from-terminating-international-student-visas/); [CBS News](https://www.cbsnews.com/news/federal-judge-stops-trump-terminating-legal-status-international-students/)
  - *AAUP v. Rubio* (D. Mass. 1:25-cv-10685): the court found First Amendment violations on Sept 30, 2025 and vacated the "ideological deportation" policy on Jan 22, 2026. The government appealed Feb 9, 2026, and the plaintiffs cross-appealed Feb 24, 2026. — [AAUP](https://www.aaup.org/news/court-rules-aaup-v-rubio-trump-admin-violated-first-amendment); [Presidents' Alliance](https://www.presidentsalliance.org/litigation/visa-revocation-litigation/); [Clearinghouse](https://clearinghouse.net/case/46288/)

### Inferences
- Duly should record a user's nationality against travel-ban lists (with effective dates) and visa issuance dates, and flag travel risk for OPT-to-H-1B users who need consular stamping.
- A SEVIS termination is not the same as a formal finding that the student is out of status, but courts treated it as affecting status. Duly should log any SEVIS status change and the reason code.

### Gaps
- Final merits outcomes in the N.D. Cal. SEVIS case are unknown as of Sept 2026.
- I did not fetch the text of ICE's post-April 2025 SEVIS termination policy.
- The exact country list for the Jan 2026 travel ban is not reproduced here; see the CRS and NAFSA sources.

---

## 9. Unlawful presence, misrepresentation, and when an F-1 falls out of status

### Takeaway
[SETTLED] People admitted for D/S (the normal F-1 case) do not accrue unlawful presence until there is a formal finding by USCIS or an immigration judge. The 2018 USCIS memo that changed this was permanently enjoined nationwide in *Guilford College v. Wolf* (M.D.N.C., Feb 6, 2020). The enjoined 2026 D/S rule would make accrual begin automatically after the I-94 date [LITIGATED]. The 3-year and 10-year bars in INA 212(a)(9)(B) and the permanent misrepresentation bar in 212(a)(6)(C)(i) are statutory.

### Cited Findings
- USCIS memo PM-602-1060.1 (Aug 9, 2018) would have started unlawful presence accrual on the date the violation occurred. In *Guilford College v. Wolf* (Feb 6, 2020), Judge Biggs held it unlawful and permanently enjoined it for everyone subject to it. — [USCIS-posted Guilford order](https://www.uscis.gov/sites/default/files/document/injunctions/Guilford-College-v.-Nielsen-summary-judgment-permanent-injunction.pdf); [Fragomen](https://www.fragomen.com/insights/federal-district-court-enjoins-uscis-from-enforcing-unlawful-presence-rules-for-students-and-exchange-visitors.html)
- The D/S final rule, if it takes effect, means a person who stays past the I-94 date "may immediately become out of status and begin accruing unlawful presence, without waiting for formal determination". The rule is enjoined as of Sept 14, 2026. — [Yale OISS](https://oiss.yale.edu/immigration/elimination-of-duration-of-status-summary-faqs); [Yale OISS injunction update](https://oiss.yale.edu/news/important-update-court-action-on-the-ds-rule)
- 8 U.S.C. 1182(a)(9)(B) sets the bars: more than 180 days but less than 1 year of unlawful presence, then departure, means a 3-year bar; 1 year or more means a 10-year bar. 8 U.S.C. 1182(a)(6)(C)(i) makes inadmissible anyone who, by fraud or willful misrepresentation of a material fact, seeks or has obtained a visa, admission or other benefit. — [8 U.S.C. 1182 (Cornell LII)](https://www.law.cornell.edu/uscode/text/8/1182) [statutory text from background knowledge; page not fetched this session]
- The cap-gap regulation requires that the student "must not have violated the terms or conditions" of status. — [eCFR 214.2(f)(5)(vi)(C)](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2)

### Inferences
- For D/S students, Duly should model two separate things: "out of status" (a status violation such as unauthorized work, exceeding OPT unemployment limits, or failure to maintain) and "unlawful presence accrual" (only after a formal finding under current law). The engine needs a switch for the D/S-rule regime.
- Record accuracy has legal weight. Inconsistent records across filings (DS-160, I-765, H-1B petition) could support a misrepresentation finding under 212(a)(6)(C)(i), so Duly's consistency checks are a key protective feature.

### Gaps
- I did not verify the F-1 OPT unemployment limits (90 days, 150 for STEM) or the out-of-status triggers in this session. Another researcher's F-1 scope probably covers them.
- I did not fetch the tolling exceptions in 212(a)(9)(B)(iv) (pending timely, nonfrivolous extension or change-of-status filings, up to 120 days).
