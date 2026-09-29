# Build Duly as a calm, cited, honest organizer

As of September 2026, Duly can be built safely only if it stays a **personal organizer that shows its math**. The engine should compute dates from stated rules and let the user check every input. It should not issue legal conclusions such as "you are in status", "you are eligible" or "no need to worry".

The law the engine encodes is unusually unstable this year. The DHS fixed-admission-period rule was published July 17, 2026 and **preliminarily enjoined nationwide on September 14, 2026**, the day before it took effect, yet eCFR "current" already shows the enjoined text. The $100,000 H-1B payment was **vacated in D. Mass. and left unstayed by the First Circuit** even as the President extended the proclamation through September 2027. USCIS policy alert PA-2026-05 (August 5, 2026) lets officers deny without first sending an RFE and makes 12 weeks the ceiling for an RFE response rather than the default. Several rules users think of as law, such as the 20-hour OPT threshold and the 10-day OPT reporting window, are SEVP guidance, and others vary by school.

On the liability side, the danger zone is the Janson v. LegalZoom "branching" problem: software that applies law to a user's facts and picks an answer. That now sits alongside immigration-consultant statutes in CA, NY, IL, TX, NV and FL, the FTC's DoNotPay order, and a live UPL suit against OpenAI. A disclaimer helps in Texas but cures nothing elsewhere.

Privacy obligations start on day one, not at scale. Connecticut's amended law covers any controller that processes sensitive data, whatever its size, and every F-1 record reveals immigration status.

Credit Karma's loop translates well to Duly: a verdict first, factors labeled by impact, plain language, and an honest "how we make money" page. Its FTC "pre-approved" order is the exact failure Duly's "Everything is in order" could repeat. The build plan therefore needs four changes: a regime-flagged rules engine, a scoped four-state verdict that can say "can't tell", an assistant that refuses person-specific judgments, and privacy architecture that assumes government subpoenas.

## The engine must encode four kinds of law, and eCFR "current" is wrong for F-1 today

The single most dangerous engineering error available to Duly right now is trusting eCFR. The 2026 duration-of-status (D/S) final rule (FR Doc. 2026-14439) was published July 17, 2026 with a September 15 effective date. It would replace D/S with fixed admission periods capped at four years, cut the post-completion grace period from 60 to 30 days, and require Form I-539 extension-of-stay filings ([Federal Register](https://www.federalregister.gov/documents/2026/07/17/2026-14439/establishing-a-fixed-time-period-of-admission-and-an-extension-of-stay-procedure-for-nonimmigrant)). On September 14, 2026, Judge F. Dennis Saylor IV issued a **nationwide preliminary injunction** in *Presidents' Alliance v. DHS*, finding the rule likely arbitrary and capricious. D/S and the 60-day grace period therefore remain operative ([Ogletree](https://ogletree.com/insights-resources/blog-posts/u-s-district-court-issues-preliminary-injunction-of-dhss-duration-of-status-framework-rule/); [Yale OISS](https://oiss.yale.edu/news/important-update-court-action-on-the-ds-rule)). Even so, eCFR's "current" 8 CFR 214.2 displays the amended, enjoined text ([eCFR current](https://www.ecfr.gov/current/title-8/section-214.2)). The operative text is the point-in-time version dated September 14, 2026 ([eCFR 2026-09-14](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)). SEVP's own FAQ still described the new rule without an injunction banner when it was fetched ([Study in the States FAQ](https://studyinthestates.dhs.gov/final-rule-establishing-a-fixed-time-period-of-admission-and-an-extension-of-stay-procedure-faq)). Any pipeline that scrapes official pages or eCFR will pick up law that is not in force.

The engine must therefore tag every parameter with one of five statuses:

- **Settled**: the regulation or statute is in force and not under challenge.
- **Guidance**: SEVP or USCIS policy that is not in the regulation text.
- **Litigated**: the rule is under challenge, or has been enjoined or vacated.
- **Proposed**: not yet final.
- **School-dependent**: set by the DSO or school, not by federal rule.

The core F-1 rules below are the ones the engine must encode.

| Fact | Engine parameter | Primary source | Status |
|---|---|---|---|
| Post-completion OPT filing window | From 90 days before the program end date (PED) to 60 days after it. Also due within 30 days of the DSO recommendation | 8 CFR 214.2(f)(11)(i)(B)(2) ([eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)) | Settled |
| Latest requested OPT start | PED + 60 days. The EAD starts on the requested date or the approval date, whichever is later | 214.2(f)(11)(i)(D), (f)(11)(iii)(A) | Settled |
| OPT duration | 12 months per degree level, all completed within 14 months after study ends | 214.2(f)(10), (f)(10)(ii)(A) | Settled |
| OPT unemployment cap | 90 days in aggregate | 214.2(f)(10)(ii)(E) | Settled |
| How unemployment days are counted | Every calendar day, weekends included, from the EAD start date. Days abroad count unless on employer-authorized leave or work travel | SEVP guidance as relayed by schools ([Temple ISSS](https://global.temple.edu/isss/students/current-students/f-1-student/f-1-employment-options/campus-employment/optional-practical-training-opt/post-completion-opt/opt-and-unemployment)) | Guidance |
| 20 hours per week for regular OPT; 10-day reporting of changes | Qualifying-employment threshold and reporting deadline | [SEVIS Help Hub](https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-optional-practical-training-opt). The regulation (f)(12)(i) gives no number of days | Guidance |
| STEM OPT extension | 24 months, starting the day after initial OPT ends, whatever the approval date. At most 2 lifetime extensions | 214.2(f)(10)(ii)(C), (f)(11)(iii)(A) | Settled |
| STEM filing window | Up to 90 days before the OPT EAD expires, and within 60 days of the DSO recommendation | 214.2(f)(11)(i)(C) | Settled |
| STEM obligations | E-Verify employer. At least 20 hours per week. I-983 signed before the DSO recommendation. New employer's I-983 within 10 days. 12-month and final evaluations due within 10 days. Validation every 6 months, due within 10 **business** days. Changes reported within 10 days. Employer reports departure within 5 business days | 214.2(f)(10)(ii)(C)(5) to (9), (f)(12)(ii) | Settled |
| STEM unemployment cap | 150 days total across all OPT periods | 214.2(f)(10)(ii)(E) | Settled |
| STEM pending-filing work extension | Automatic extension of up to 180 days | 274a.12(b)(6)(iv), cross-referenced in (f)(11)(i)(C). The text itself was not verified | Settled but verify |
| Pre-completion OPT deduction | Part-time time deducted at 50% | Convention only; no primary source retrieved | Unverified |
| CPT | Authorized by the DSO for a specific employer and dates. One year or more of full-time CPT makes the student **ineligible for post-completion OPT** | 214.2(f)(10)(i) ([eCFR](https://www.ecfr.gov/on/2026-09-14/title-8/section-214.2)); [SEVIS Help Hub CPT](https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-curricular-practical-training-cpt) | Settled, plus school-dependent |
| Grace period | 60 days after completion of study or of OPT. 15 days after a DSO-authorized withdrawal. None after a status violation | 214.2(f)(5)(iv) (pre-rule text) | Settled (operative under the injunction) |
| Fixed admission period, 30-day grace, admit-until date = EAD end + 30 days, 14 Nov 2030 transition cap | Flagged alternate regime | 2026-14439; 214.1(m)(1) as amended | Litigated (enjoined) |
| Re-entry on OPT | Unexpired EAD plus an I-20 travel signature dated within the last 6 months | 214.2(f)(13)(ii) | Settled |
| Re-entry while unemployed; job-letter requirement | Schools conflict ([Berkeley](https://internationaloffice.berkeley.edu/students/training/f-1/travel); [Columbia](https://isso.columbia.edu/content/travel-during-f-1-opt)) | School and CBP practice | School-dependent |
| OPT reform (RIN 1653-AA97); OPT I-765 fee | NPRM targeted for February 2027. The fee proposal cleared OIRA on August 20, 2026 but was unpublished as of September 14 | [reginfo.gov](https://www.reginfo.gov/public/do/eAgendaViewRule?pubId=202504&RIN=1653-AA97); [Fragomen](https://www.fragomen.com/insights/united-states-dhs-optional-practical-training-fee-proposal-clears-federal-review.html) | Proposed (encode nothing) |

**The CPT picture shifted in August 2026.** SEVP broadcasts 2608-01 and 2608-02 reminded DSOs of their liability. A law-firm summary reports they say that practical training must be required of *all* students in the curriculum and that "an optional elective generally will not satisfy this standard". The broadcasts do not expressly ban Day 1 CPT ([bcm_260802](https://www.ice.gov/doclib/sevis/pdf/bcm_260802.pdf); [NPZ Law](https://visaserve.com/sevp-tightens-f-1-visa-cpt-eligibility-rules-in-2026-what-students-schools-and-employers-need-to-know/)). The engine should therefore treat the DSO's I-20 authorization as the source of truth and never compute CPT eligibility. Two things should be school-configurable, each with a citation to the school's policy: the full-time CPT counter (whether a "year" is 365 days or 12 months) and the Day 1 program rules.

**The SEVP Portal employer field is the real enforcement trigger.** In May 2025, SEVP mailed notices to OPT students who were more than 90 days in with no employer reported. The notices threatened termination if the record was not updated within 15 days ([Inside Higher Ed](https://www.insidehighered.com/news/global/international-students-us/2025/05/16/ice-warns-international-students-more-sevis)). The warning Duly should compute is "days since EAD start with no employer entered in the Portal". That is not the same thing as the user's actual employment days.

**The transition stage adds three more regime-sensitive facts.** Cap-gap is settled. Under the H-1B modernization rule, status and OPT work authorization extend to **April 1** of the fiscal year, or to the H-1B start date if earlier. Cap-gap ends automatically if the petition is rejected, denied, revoked or withdrawn, and also if the petition is approved for consular processing rather than change of status ([eCFR 214.2(f)(5)(vi)](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2#p-214.2(f)(5)(vi)); [Federal Register 2024-29354](https://www.federalregister.gov/documents/2024/12/18/2024-29354/modernizing-h-1b-requirements-providing-flexibility-in-the-f-1-program-and-program-improvements)). Wage-weighted H-1B selection took effect February 27, 2026. Each beneficiary gets 4, 3, 2 or 1 entries by OEWS wage level and is placed at the lowest level among all registrations filed for them. The registration fee is $215 ([eCFR 214.2(h)(8)(iii)](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2); [Federal Register 2025-23853](https://www.federalregister.gov/documents/2025/12/29/2025-23853/weighted-selection-process-for-registrants-and-petitioners-seeking-to-file-cap-subject-h-1b)). Duly should record the wage level, SOC code and worksite, because a mismatch with the later LCA is a denial risk. It should not compute selection odds, which is an outcome prediction.

The **$100,000 H-1B payment** is litigated and not collectible today. On June 8, 2026, D. Mass. vacated the implementing policy. The First Circuit denied a stay on July 24, 2026 in *California v. Mullin*, and USCIS says it is complying ([First Circuit order](https://www.ca1.uscourts.gov/sites/ca1/files/opnfiles/26-1699O-01A.pdf); [USCIS H-1B FAQ](https://www.uscis.gov/newsroom/alerts/h-1b-faq)). A September 18, 2026 proclamation extended the policy through September 21, 2027, but the vacatur still controls ([DiRaimondo & Schroeder](https://www.diraimondoschroeder.com/updates/2026/9/21/trump-administration-extends-100000-h-1b-proclamation-through-september-2027-but-fee-remains-blocked-by-court-order)). In a separate case, D.D.C. upheld the fee, and that appeal is pending in the D.C. Circuit ([Fragomen](https://www.fragomen.com/insights/united-states-district-court-judge-issues-opinion-upholding-dollar100000-h-1b-fee.html)). USCIS guidance never applied the fee to F-1 to H-1B change-of-status petitions ([BakerHostetler](https://www.bakerlaw.com/insights/uscis-clarifies-when-100000-h-1b-fee-is-required-exempting-most-f-1-students/)). So the fact that matters for a Duly user is whether their petition requests change of status or consular notification, and whether they travel.

**PA-2026-05 changes every evidence-deadline computation.** It restores officers' discretion to deny when required initial evidence is missing, without sending an RFE or NOID first. It makes 12 weeks the maximum RFE response time rather than the standard. It drops the extra 14 days for notices mailed abroad, leaving only 3 mailing days. And it treats a partial response as a request for a decision ([USCIS PA-2026-05](https://www.uscis.gov/sites/default/files/document/policy-manual-updates/20260805-EvidentiaryStandards.pdf); [8 CFR 103.2](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-103/section-103.2)). 30-day RFE deadlines are already appearing ([GT](https://www.gtlaw-insidebusinessimmigration.com/rfe/usciss-new-rfe-policy-is-already-having-an-impact-30-day-response-deadlines-are-emerging/)). RFE due dates must therefore be read from the notice itself, never assumed.

**For O-1**, the settled standard is either a major award or 3 of the 8 criteria in 214.2(o)(3)(iii), with comparable evidence allowed ([eCFR](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2)). Because incomplete initial evidence can now be denied outright, WorkBook's value is completeness at filing.

**Status and unlawful presence are separate concepts.** Students admitted for D/S do not accrue unlawful presence until USCIS or an immigration judge makes a formal finding. That rule holds because *Guilford College v. Wolf* permanently enjoined the 2018 memo that would have changed it ([USCIS-posted order](https://www.uscis.gov/sites/default/files/document/injunctions/Guilford-College-v.-Nielsen-summary-judgment-permanent-injunction.pdf)). The enjoined D/S rule would make accrual automatic after the I-94 date. Duly must never tell a user they are "accruing unlawful presence".

Travel-ban exposure and the 2026 OPT processing pause for nationals of 40 countries mean nationality belongs in the record as a flag input ([CRS IN12631](https://www.congress.gov/crs-product/IN12631); [Inside Higher Ed](https://www.insidehighered.com/news/global/international-students-us/2026/04/27/opt-application-pause-leaves-students-limbo)).

## Liability turns on feature design, not disclaimer wording

The legal line that matters is between **publishing information** and **applying law to a person's facts to choose an answer**. In *Janson v. LegalZoom*, the court found "little or no difference" between LegalZoom's branching questionnaire and a Missouri lawyer asking questions and drafting a document ([CourtListener](https://www.courtlistener.com/opinion/2173333/janson-v-legalzoom-com-inc/)). North Carolina resolved LegalZoom's dispute only on specific conditions: a licensed attorney had to review every template "including each and every potential part thereof", and consumers had to be able to preview documents ([NC Business Court 2015 NCBC 96](https://www.nccourts.gov/assets/documents/opinions/2015_NCBC_96.pdf?gWLfThOd3NoNA8Ml5HQHeQLTZap95rnI=)). Texas protects legal software only if it "clearly and conspicuously" states it is "not a substitute for the advice of an attorney" ([Tex. Gov't Code 81.101](https://law.justia.com/codes/texas/government-code/title-2/subtitle-g/chapter-81/subchapter-g/section-81-101/)).

The AI surface is under active attack. *Nippon Life v. OpenAI* (N.D. Ill., filed March 4, 2026) seeks a declaration that ChatGPT practiced law. OpenAI's motion to dismiss was held in abeyance with no ruling ([Norton Rose Fulbright](https://www.insidetechlaw.com/blog/2026/04/ai-in-litigation-series-complaint-accuses-openai-of-practicing-law-without-a-license); [Bloomberg Law](https://news.bloomberglaw.com/litigation/open-ai-dismissal-motion-says-chatgpt-is-mere-tool-not-attorney)). New York S7263A would bar chatbots from giving substantive advice that only licensed professionals may give. It would also provide that operators "shall not waive or disclaim liability" simply by disclosing the bot is not human. It sits in Senate Rules and **is not law** ([NY Senate](https://www.nysenate.gov/legislation/bills/2025/S7263/amendment/A)). The Second Circuit in *Upsolve v. James* held that UPL statutes applied to nonlawyer advice get only intermediate scrutiny, which weakens any First Amendment escape ([Justia](https://law.justia.com/cases/federal/appellate-courts/ca2/22-1345/22-1345-2025-09-09.html)).

**Immigration adds a federal and a state layer.** 8 CFR 1.2 defines "preparation" as "the study of the facts of a case and the applicable laws, coupled with the giving of advice and auxiliary activities, including the incidental preparation of papers" ([Cornell LII](https://www.law.cornell.edu/cfr/text/8/1.2)). That describes an LLM answering "can I travel while my OPT is pending?" almost word for word.

The state statutes are all triggered by compensation plus assistance in an "immigration matter":

- **California** limits paid consultants to nonlegal help, such as "completing a form ... but not advising a person as to their answers", and requires a $50,000 bond ([CA BPC 22441](https://codes.findlaw.com/ca/business-and-professions-code/bpc-sect-22441/)).
- **Illinois** excludes "recommending a specific course of legal action" and any "interpretation of the law" from permitted services. It requires AG registration and a bond or insurance, and allows only fee-free referrals ([815 ILCS 505/2AA](https://codes.findlaw.com/il/chapter-815-business-transactions/il-st-sect-815-505-2aa/)).
- **New York** requires providers to register ([GBL 460-a](https://newyork.public.law/laws/n.y._general_business_law_section_460-a)).
- **Nevada**, the founder's state, requires a $25,000 bond that covers "negligence" for anyone preparing documents affecting immigration status ([NRS 240A.120](https://law.justia.com/codes/nevada/chapter-240a/statute-240a-120/)).
- **Florida** makes UPL a third-degree felony ([Fla. Stat. 454.23](https://flsenate.gov/Laws/Statutes/2016/0454.23)).

No case tests whether a deadline and records app falls under these statutes. That is precisely why the product should stay clearly on the organizer side.

**The FTC pins down marketing.** DoNotPay paid $193,000 and was barred from claiming it substitutes for a professional without substantiation. The FTC stressed that DoNotPay never had attorneys test its accuracy ([FTC](https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires)). The privacy orders show the same logic applied to data promises. Flo and BetterHelp were penalized for leaking data through ad SDKs despite their privacy promises. Zoom was penalized for claiming encryption it did not deliver. Avast was penalized for selling "anonymized" data that could be re-identified ([BetterHelp via EPIC](https://epic.org/ftc-fines-online-therapy-company-betterhelp-7-8-million-for-sharing-health-data/); [Zoom](https://www.ftc.gov/news-events/news/press-releases/2020/11/ftc-requires-zoom-enhance-its-security-practices-part-settlement); [Avast](https://www.ftc.gov/news-events/news/press-releases/2025/12/ftc-sends-payments-consumers-impacted-avasts-deceptive-privacy-claims)).

**Terms and disclaimers reduce risk but do not remove it.** Clickwrap is enforceable only with conspicuous notice right next to an unambiguous act of assent ([Berman v. Freedom Financial, 9th Cir. 2022](https://cdn.ca9.uscourts.gov/datastore/opinions/2022/04/05/20-16900.pdf)). Section 230 probably does not protect first-party AI output ([CRS LSB11097](https://www.congress.gov/crs-product/LSB11097)). Competitors converge on the same terms: "not a law firm", arbitration, and liability caps at fees paid or less. TrackMyOPT caps liability at $100, excludes "immigration consequences", and disclaims any guarantee that its date calculations are accurate ([TrackMyOPT Terms](https://www.trackmyopt.com/terms); [Lawfully ToS](https://www.lawfully.com/terms-of-service)). These are floors, not shields. A consumer cap may fail against gross negligence or statutory claims, and a "not legal advice" banner on an answer that says "you're eligible; file (c)(3)(C) by June 3" is still advice.

**Privacy law applies earlier than founders assume.** Connecticut's amended CTDPA (effective July 1, 2026) covers any controller that "control[s] or process[es] consumers' sensitive data", with no volume floor ([Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/connecticut-amends-the-connecticut-data-privacy-act)). Citizenship and immigration status is sensitive data under Virginia-model laws, and CT's inclusion of it is widely reported but unverified here ([Va. Code 59.1-575](https://law.lis.virginia.gov/vacode/title59.1/chapter53/section59.1-575/)). So Duly owes opt-in consent, consumer rights with an appeal process, and a data protection assessment from its first Connecticut user.

Maryland's MODPA applies at 35,000 Maryland consumers. Above that threshold, it permits processing sensitive data only where "strictly necessary" to provide the requested service, even with consent, and it bans any sale of sensitive data ([Davis+Gilbert](https://www.dglaw.com/the-maryland-online-data-privacy-act-familiar-requirements-but-stricter-sensitive-data-mandates/)). Maryland **HB 711** (effective July 1, 2026) bans knowingly selling personal data to any agency that engaged in civil immigration enforcement in the prior six months, unless a warrant particularly describes the data ([Fisher Phillips](https://www.fisherphillips.com/en/insights/insights/marylands-new-immigration-related-consumer-privacy-provisions)).

Other states reach small companies through the sale rules. Nevada's sale opt-out applies to operators of any size ([NRS 603A](https://www.leg.state.nv.us/nrs/nrs-603a.html)). Texas and Minnesota require small businesses to get consent before selling sensitive data ([Baker Data Counsel](https://www.bakerdatacounsel.com/blogs/texas-data-privacy-and-security-act-decoding-the-small-business-exception/)).

Government access is a live threat, not a theoretical one. DHS issued hundreds of administrative subpoenas to tech platforms in 2025 and 2026 seeking names, IP addresses and session times ([EFF](https://www.eff.org/deeplinks/2026/08/list-ice-subpoenas-tech-companies)). Lawfully's policy discloses data "where required ... by law or subpoena", a standard an ICE administrative subpoena would meet ([Lawfully Privacy](https://www.lawfully.com/privacy-policy)). On the AI side, Anthropic's commercial terms exclude training on API data. Default retention is 30 days, longer if a request is flagged, and Zero Data Retention (ZDR) is available by contract but not for "Covered Models" ([Anthropic Privacy Center](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data); [Claude Platform Docs](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)).

From this evidence, the never and always rules for Duly are:

| Surface | Never | Always |
|---|---|---|
| Company identity and marketing | Call Duly or its AI a "lawyer", "attorney", "legal expert", "immigration consultant", "paralegal", "notario" or "notary", in any language. Say "lawyer-quality" or "replaces an attorney". Promise "never miss a deadline", "prevents RFEs", "keeps you in status", "guaranteed" or "approval". Publish accuracy percentages or "attorney-verified" without a dated test log | Say "Duly is not a law firm and is not a substitute for the advice of an attorney", clearly and conspicuously (TX 81.101). Say "not affiliated with USCIS, DHS or SEVP". Describe the AI literally: "explains official sources and your records, with citations" |
| Computed dates | Present a date as an order or as "your deadline" without its basis | Show the rule, the citation link, the inputs used, the regime flag and "rules last reviewed [date]". End with "Confirm with your DSO before acting" |
| Status labels | Say "you are in status", "compliant", "eligible", "safe" or "no need to worry" | Scope every claim to what Duly has been given and when it last checked |
| Forms and filings | Pick a form or category code, auto-fill USCIS forms, review answers, draft cover letters or RFE/NOID responses, or submit anything | Link to the official instructions. Generate "questions to ask your DSO or attorney" |
| Attorney access | Take per-referral fees or split fees | Offer fee-free routing to the DSO and to independent attorneys |
| Data | Sell or license data, including "de-identified" data. Embed ad or analytics SDKs that see status-revealing events. Claim "end-to-end encrypted" or "never leaves your device" unless literally true for the LLM path | Get separate, logged opt-in consent for immigration and ID data. Publish a warrant-only law-enforcement policy with user notice and transparency reports. Honor GPC. Name Anthropic as the AI processor, with its retention period stated |
| Terms | Hide assent in small print. Treat caps or arbitration as a cure for UPL | Use a checkbox or "I agree" placed next to the action button. Include arbitration with a class waiver, a liability cap and a verify-with-official-sources covenant, and have counsel review enforceability |
| Documents | Retain originals or block export (notario statutes bar withholding documents) | Offer one-tap full export and deletion |

## Credit Karma's clarity transfers; its A/B-tested status label must not

Credit Karma earned the trust of 110 million members with a simple loop ([Intuit 8-K](https://www.sec.gov/Archives/edgar/data/896878/000119312520309090/d51747dex9901.htm)). It shows the score first. It breaks the score into factors labeled high, medium or low impact, each in plain language. It sends change alerts. And it removes one specific fear: checking your own score "has no impact on your credit scores" ([Credit Karma factors](https://www.creditkarma.com/credit/i/what-affects-your-credit-scores); [Credit Karma FAQs](https://www.creditkarma.com/about/credit-score-faqs)). It also publishes a page literally titled "Is Credit Karma a scam?" that says how it makes money ([Credit Karma](https://www.creditkarma.com/credit/i/is-credit-karma-a-scam)). Every piece maps onto Duly:

- the verdict becomes the score;
- checklist items with impact levels become the factors;
- "looking here doesn't notify your school or USCIS" becomes the no-harm reassurance, stated only if true;
- a plain "How Duly makes money" page answers the suspicion directly.

The failure matters more than the success. From 2018 to 2021, Credit Karma told users they were "pre-approved" for offers that often denied them. Its own A/B tests showed "pre-approved" drew more clicks than "excellent odds". The FTC ordered $3 million in redress and required Credit Karma to **keep records of its behavioral research and A/B testing** ([FTC](https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-takes-action-stop-credit-karma-tricking-consumers-allegedly-false-pre-approved-credit-offers); [FTC final order](https://www.ftc.gov/news-events/news/press-releases/2023/01/ftc-finalizes-order-requiring-credit-karma-pay-3-million-halt-deceptive-pre-approved-credit-offers)).

"Everything is in order" is structurally the same kind of claim: a reassuring status label about an outcome the product cannot know. Duly does not see SEVIS, the DSO's view or USCIS adjudication. Credit Karma also discloses that its VantageScore "might differ" from the FICO scores lenders use. Duly has the same gap, because its model of compliance is not the DSO's record, and users should learn that on the verdict screen rather than at a port of entry.

The closest regulatory precedent comes from health tech. In reviewing Apple's irregular rhythm notification, the FDA named the risk that users would read the output as permission to ignore symptoms. The labeling therefore says "the absence of a notification is not intended to indicate no disease process is present" ([FDA DEN180042](https://www.accessdata.fda.gov/cdrh_docs/reviews/DEN180042.pdf)). Google's Security Checkup scopes its green state in the same way: "Google doesn't have any security recommendations for you", not "your account is secure" ([Google Account Help](https://support.google.com/accounts/answer/46526?hl=en)).

**The audience makes both calm and honesty harder.** International students report elevated stress ([Anxiety, Stress & Coping](https://www.tandfonline.com/doi/full/10.1080/10615806.2023.2280701)). In the r/f1visa corpus, about 20% of questions went unanswered, and unmet needs clustered around conflicting and outdated information ([Youm et al. 2026, PLOS One](https://pmc.ncbi.nlm.nih.gov/articles/PMC12885376/)). Two opposite failure modes coexist in this group:

- **Intolerance of uncertainty** drives compulsive checking and reassurance-seeking ([Bartoszek et al. 2022](https://www.sciencedirect.com/science/article/abs/pii/S0005796722000961)).
- **Information avoidance**, the "ostrich effect", means people look less when they expect bad news ([Golman, Hagmann & Loewenstein, JEL](https://www.cmu.edu/dietrich/sds/docs/golman/JEL%20Information%20Avoidance.pdf); [Karlsson, Loewenstein & Seppi](https://ssrn.com/abstract=772125)).

The design answer serves both groups. For compulsive checkers, the all-clear should be predictable and boring: the same wording every time, a visible "last checked" time, and "nothing new since Tuesday". For avoiders, bad news should arrive with its next step and its cost attached ("one thing needs you, about 10 minutes, due Oct 14"), which makes looking cheap.

Amber Case's calm-technology principles add one more rule. The system must "work even when it fails", so a failed sync or stale rule must degrade the verdict to "Not checked since [date]", never leave it green ([O'Reilly](https://www.oreilly.com/content/principles-calm-technology-we-are-not-bad-at-technology-technology-is-bad-at-us/)). Oura offers the right tonal model in its "Pay attention" tier ([Oura](https://support.ouraring.com/hc/en-us/articles/360025589793-Readiness-Score)). 1Password Watchtower shows the risk of opaque scoring: users lost trust when scores differed across devices ([1Password Community](https://1password.community/discussion/141266/differing-watchtower-scores)). Duly's impact score should therefore be deterministic, with a published rubric.

The behavioral evidence also rules out fear copy. Framing effects are tiny: r ≈ .03 for gain framing on prevention behaviors across 93 studies ([O'Keefe & Jensen 2007](https://www.tandfonline.com/doi/abs/10.1080/10810730701615198)). "You could lose your status" costs trust and buys almost nothing. The peak-end rule says a session is remembered for its worst moment and its last one ([Kahneman et al. 1993](https://journals.sagepub.com/doi/10.1111/j.1467-9280.1993.tb00589.x)). So the weekly brief and each session should end on "what's settled" or "what's next", not on the scariest update. Goal-gradient progress bars help, but pre-filled "illusory" progress ([Kivetz et al. 2006](https://journals.sagepub.com/doi/abs/10.1509/jmkr.43.1.39)) would be deceptive in a compliance product.

The FTC's dark-patterns report names fake countdowns, buried terms and tricked data sharing as enforcement targets ([FTC report](https://www.ftc.gov/system/files/ftc_gov/pdf/P214800+Dark+Patterns+Report+9.14.2022+-+FINAL.pdf)). That translates into five rules for Duly:

- No streaks.
- No confirmshaming ("No thanks, I'll risk my status").
- No countdowns except real, cited deadlines.
- No upsell inside a "needs you" state.
- No paid tier framed as protection from losing status.

These rules have one limit. The "no confirmshaming" and "no streaks" recommendations rest on principle and regulatory direction, not on direct studies of anxious immigrant users, and none were found.

## Implications for the Duly build plan

### Engine rule-regime flags and data model

| Change | Detail | Basis |
|---|---|---|
| `regime.ds_2012` (active) vs `regime.fixed_admission_2026` (enjoined) | Default to D/S: `grace_end = max(PED, OPT_EAD_end) + 60d`, 15 days after a withdrawal, 0 after a violation. The flagged regime holds the 30-day grace, admit-until date = EAD end + 30 days, I-539 extension-of-stay logic, a stop on employment when an extension is filed during the grace period, and the 14 Nov 2030 transition cap. Pin eCFR fetches to point-in-time 2026-09-14 and block "current" for 214.2(f)(5) | 2026-14439; D. Mass. PI of 14 Sept 2026 |
| `h1b_100k_fee.status = vacated_unstayed` | Fields: `petition_type` (change of status vs consular), `beneficiary_outside_us`, travel log. Show the status and "check date"; never state "you owe" or "you don't owe" | First Circuit 26-1699; proclamation extended 18 Sept 2026; D.C. Cir. appeal pending |
| Cap-gap | `capgap_end = min(April 1 of FY, approved start date)`, with termination triggers for rejected, denied, revoked or withdrawn petitions, denied or withdrawn change of status, and consular approval | 214.2(f)(5)(vi) |
| RFE and NOID | `due = date on notice (+3 days if mailed)`, entered by the user. No default of 84 or 98 days. Warn that a partial response is treated as a request for a decision | PA-2026-05; 103.2(b)(8), (b)(11) |
| Provenance on every parameter | `status ∈ {settled, guidance, litigated, proposed, school}`, plus `source_url`, `reviewed_by`, `reviewed_on` | Janson / NC consent judgment; FTC substantiation |
| School-configurable parameters | CPT full-time year definition, Day 1 programs, re-entry while unemployed, job-letter requirement, volunteer and self-employment documentation | School ISSS conflicts; SEVP 2608-02 |
| Unverified parameters held back | The 50% part-time pre-completion OPT deduction and the 180-day STEM auto-extension stay behind a "verify" gate until pulled from primary text | Gaps in the notes |
| Portal-employer clock | Warn well before 90 days pass with no employer in the SEVP Portal, whatever the user's actual employment | May 2025 SEVP notices |
| Separate status from unlawful presence | Never compute unlawful-presence accrual for a user admitted D/S | *Guilford College* |
| Nationality flag | Travel-ban lists and the OPT processing pause feed "cannot tell" and "watching" states, not a verdict | CRS IN12631; Inside Higher Ed Apr 2026 |
| Monitoring | Watch the injunction docket, the First Circuit and D.C. Circuit cases, SEVP broadcasts, and the OPT fee NPRM. A change to any litigated flag triggers attorney re-review before the rule ships | Instability of all litigated items |

### Verdict and impact-score wording

The Home verdict should move from three implicit states to **four explicit ones**:

| State | Wording | Condition |
|---|---|---|
| In order | "No open items in what you've added" | Replaces "Everything is in order" |
| Needs you | "One thing needs you: [task], about [N] minutes, due [date]" | An actionable item exists |
| Talk to your DSO or attorney | Shown with a pre-written question | A judgment call is needed |
| **Can't tell yet** | "We need your EAD card", or "Rules not checked since Aug 30" | Inputs are missing, stale, conflicting or regime-sensitive. Never falls back to green |

Put a permanent scope line under every verdict: "Based on [N] documents you added. Rules checked [date]. Duly isn't your DSO or a lawyer." Add the absence line from Apple's IRN labeling in the verdict info sheet: "No alert from Duly doesn't mean nothing is wrong; Duly only sees what you've added."

The update impact score's "Worry? / Prepare?" should become **"Does this change your dates?"** and **"Anything to do now?"**. A "No" to "Worry?" reads as legal assurance, and a "Yes" is fear framing. Each update should carry:

- a deterministic High / Medium / Low label, with the rubric published;
- an "Applies to you because [field]" line, for example "you're on STEM OPT";
- a primary-source link;
- a third answer, "Nothing to do; we're watching", so that policy news the user cannot act on, like the D/S injunction, does not turn Home red.

Verdict and score wording must be chosen by accuracy review, never by engagement A/B tests. Keep a written rationale for each wording choice, because the Credit Karma order shows regulators ask for these records.

The **weekly brief** email should be transactional only, with no upsell mixed in, which keeps it outside CAN-SPAM's commercial rules ([FTC CAN-SPAM](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)). It should end on what is settled and what is next, cap reminders at one per item per week plus the deadline itself, and let the user set quiet hours.

### What the assistant must refuse, and what WorkBook may draft

The assistant **retrieves and explains official sources and the user's own records, with citations**. When asked, it restates deterministic engine output, inputs shown. It must decline to give a conclusion on any of the following, and instead answer with the rule, the citation and a pre-written question for the DSO or an attorney:

- "Am I in status?" and "Am I eligible for STEM OPT or cap-gap?"
- which form or category code to use;
- whether a job, volunteer role or self-employment counts as qualifying or "directly related" employment;
- "Should I travel?", "Can I re-enter unemployed?" or "Does the $100k fee apply to me?";
- reinstatement or unlawful presence;
- H-1B odds or case outcomes;
- drafting letters, explanations, cover letters or RFE/NOID responses to any agency.

The basis for these refusals is 8 CFR 1.2 "preparation", CA 22441, IL 2AA, *Nippon Life*, and NY S7263A as the direction of travel. The assistant must disclose that it is AI.

WorkBook is the subtlest surface because its exports may reach USCIS. Inconsistent records across filings can support a misrepresentation finding under INA 212(a)(6)(C)(i) ([8 U.S.C. 1182](https://www.law.cornell.edu/uscode/text/8/1182)), and "incidental preparation of papers" appears in the federal definition of preparation. WorkBook therefore needs five rules:

- AI drafts come only from content the user supplied, such as notes, commits and calendar entries.
- AI never invents hours, duties, outcomes or a link to the user's degree.
- Every entry requires explicit user confirmation, with provenance stored.
- Exports are labeled as the user's personal work log, never as "USCIS-ready evidence" or an "RFE response".
- O-1 criteria appear as organizing tags, not as "you meet criterion 5".

PA-2026-05 downgrades affidavits and favors primary evidence. WorkBook should therefore prompt users to attach primary documents such as pay stubs, I-983s and employer letters, rather than polish narrative. It should also flag timing mismatches between logged work and authorized dates as "check with your DSO", not as violations.

### Required disclaimers by state

| Jurisdiction | Requirement | Placement |
|---|---|---|
| All states | "Not a law firm; not legal advice; no attorney-client relationship; not affiliated with USCIS, DHS or SEVP; verify with your DSO" | Onboarding (with assent), footer, AI panel, exports, verdict info sheet |
| Texas | Clear and conspicuous "not a substitute for the advice of an attorney" ([81.101(c)](https://law.justia.com/codes/texas/government-code/title-2/subtitle-g/chapter-81/subchapter-g/section-81-101/)). Never use "notario" in Spanish or other translated marketing ([406.017](https://codes.findlaw.com/tx/government-code/gov-t-sect-406-017/)) | Everywhere, and in translations |
| Illinois | If Duly were deemed a provider: an "I AM NOT AN ATTORNEY..." notice, a bilingual contract, a 72-hour rescission right and fee-free referrals only. Design so it is not a provider | Counsel decides |
| California | Referrals only as nonlegal assistance. A consultant would need a $50k bond. Stay out of form completion | Counsel decides |
| New York | Registration if Duly is an "immigrant assistance service". AI disclosure and no reliance on a disclaimer if S7263A passes | AI panel |
| Nevada | NRS 240A registration and a $25k bond if Duly is deemed a document preparer. NRS 603A privacy notice and sale opt-out | Privacy policy |
| Florida | No holding out as qualified in legal matters | Marketing review |

### Privacy obligations

Build to the strictest standard now:

- A separate, logged opt-in consent for immigration-status and ID data, which satisfies Connecticut from the first user.
- A data protection assessment covering the LLM path, required for Connecticut processing created on or after Aug 1, 2026.
- Access, deletion, correction and portability requests handled within 45 days, with an appeal path.
- Maryland's "strictly necessary" standard as the design test for every collected field.
- No sale of any kind, including de-identified data. This covers Maryland MODPA, HB 711, Texas and Minnesota, NRS 603A and CCPA 7027(m).
- GPC detection.
- No ad or analytics SDKs that see status-revealing events.
- Identifiers redacted before prompts, with derived facts sent to Claude rather than raw document images.
- ZDR requested from Anthropic, or disclosure of up to 30 days' retention, longer if flagged.
- Client-side encryption for documents, and minimized server-side case fields and logs.
- A published warrant-only law-enforcement policy, with user notice, a commitment to challenge overbroad requests, and transparency reports.
- MFA on all admin access and a pre-planned breach notification. DocketWise's 116,666-client breach began with stolen credentials ([Law360](https://www.law360.com/articles/2467452/legal-tech-co-sued-over-immigration-software-breach)).

### Items that need counsel

1. A written opinion on whether any feature makes Duly an immigration consultant, provider or document preparer under CA 22440, NY Art. 28-C, IL 2AA, NV 240A (a priority, as the founder's state), or Florida law, before charging users.
2. A licensed immigration attorney engaged to review the rule library, checklists, assistant guardrails and WorkBook templates, with dated sign-offs, NC-style.
3. Enforceability of liability caps, consequential-damage exclusions and arbitration against wrong-date harms, including negligent misrepresentation exposure under Restatement 552.
4. Whether WorkBook exports should carry AI-provenance metadata when submitted to USCIS.
5. Whether any attorney-directory monetization fits Rule 7.2 and the state referral bans.
6. Tech E&O coverage that includes AI output.
7. Primary-text checks on the CT and MD sensitive-data definitions, 274a.12(b)(6)(iv), the 50% pre-completion deduction, and the text of the D/S injunction order, including any appeal.

## Conclusion

The insight that reorganizes the whole product is that **"Everything is in order" is Duly's "pre-approved"**. It is a status label that promises something the company cannot observe, and it will be tempting to tune for engagement. It is also the likeliest thing to be read as legal assurance. Making "can't tell" a first-class state is not a hedge. It is the feature that lets the green state mean something, and it is what makes Duly calmer than Reddit, whose failure mode is confident, outdated answers.

The second insight is that 2026's legal instability favors Duly's architecture. An engine that knows which rules are settled, guidance, litigated, proposed or school-set can do what no chatbot and no scraped FAQ can. It can tell a student that the rule on eCFR is enjoined, that the $100k fee is vacated but extended on paper, and that their school decides the rest. That transparency is simultaneously the best UPL defense, the best FTC substantiation record and the most trustworthy thing an anxious user can be shown.
