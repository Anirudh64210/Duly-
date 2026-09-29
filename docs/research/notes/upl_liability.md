# UPL / Immigration-Consultant / FTC Liability Exposure for Duly (non-lawyer immigration record-keeping, deadline, checklist and AI-assistant app for international students), as of Sept 2026

> Research notes, not legal advice. Items marked **[UNVERIFIED]** were not confirmed against a primary source in this pass. Items marked **[COUNSEL]** need review by licensed counsel (ideally an immigration lawyer plus a consumer-protection/UPL lawyer in CA, NY, TX, IL, NV and FL) before launch.

---

## 1. UPL precedents for legal software and AI: where the line is

### Takeaway
Courts and bars treat **static, general legal information and blank forms** as protected publishing, but treat **software that applies law to a user's specific facts in order to pick, fill in or recommend something** (LegalZoom's "branching" questionnaire) as potential UPL, unless a statute carves it out (Texas 81.101(c), NC 84-2.2). AI chatbots that give person-specific legal advice are now the target of live litigation (Nippon Life v. OpenAI) and pending legislation (NY S7263A). A disclaimer helps under the Texas safe harbor but generally does **not** cure UPL elsewhere, and NY S7263A would expressly say it cannot.

### Cited Findings
**Janson v. LegalZoom (W.D. Mo. 2011)**
- Plaintiffs who bought LegalZoom services sued for UPL. The court (W.D. Mo., No. 2:10-CV-04018-NKL, Aug. 2, 2011, 802 F. Supp. 2d 1053) held that LegalZoom's interactive, customized document-preparation service could be UPL in Missouri. Selling blank forms was not the problem. — [CourtListener](https://www.courtlistener.com/opinion/2173333/janson-v-legalzoom-com-inc/); [Goldman blog](https://blog.ericgoldman.org/archives/2011/08/missouri_federa_1.htm)
- Key reasoning: the "branching" program "skips questions... inapplicable based on the customer's prior answers." It "is created by a LegalZoom employee using Missouri law, and it is that human input that creates the legal document." The court found "little or no difference between this and a lawyer in Missouri asking a client a series of questions and then preparing a legal document based on the answers." — [Quimbee summary](https://www.quimbee.com/cases/janson-v-legalzoom-com-inc); [CourtListener](https://www.courtlistener.com/opinion/2173333/janson-v-legalzoom-com-inc/)
- **[UNVERIFIED]**: the case later settled (2012). Not re-confirmed in this pass.

**LegalZoom v. North Carolina State Bar (N.C. Bus. Ct. 2015 consent judgment, later codified)**
- A consent judgment in Oct 2015 agreed that the NC "practice of law" definition (N.C.G.S. § 84-2.1) does not cover LegalZoom's interactive document software **so long as** LegalZoom meets these conditions: an NC-licensed attorney has reviewed each blank template "including each and every potential part thereof," and consumers can see the blank template or the finished document before they buy. — [Buncombe County Bar](https://buncombebar.com/legal-zoom-consent-judgement/); [NC Business Court opinion 2015 NCBC 96](https://www.nccourts.gov/assets/documents/opinions/2015_NCBC_96.pdf?gWLfThOd3NoNA8Ml5HQHeQLTZap95rnI=)
- The NC General Assembly later codified many of these provisions (N.C.G.S. § 84-2.2). — [Carolina Journal](https://www.carolinajournal.com/news-article/legislation-settles-lengthy-dispute-between-state-bar-legalzoom/); [NCBarBlog](https://www.ncbarblog.com/state-bar-legalzoom-settlement-sets-stage-for-legislative-action/)
- **[UNVERIFIED]**: the exact current text of § 84-2.2. It reportedly also requires a disclaimer, a way to contact the provider, and no disclaiming of warranties or liability. Pull the statute before relying on it.

**Unauthorized Practice of Law Committee v. Parsons Technology (Quicken Family Lawyer, Texas 1999)**
- The district court (N.D. Tex., 1999 WL 47235) held that selling Quicken Family Lawyer (forms plus instructions) was the "practice of law" under Tex. Gov't Code § 81.101 and permanently enjoined sales in Texas. — [Quimbee](https://www.quimbee.com/cases/unauthorized-practice-of-law-committee-v-parsons-technology-inc); [5th Cir. opinion, Justia](https://law.justia.com/cases/federal/appellate-courts/F3/179/956/546619/)
- The 5th Circuit (179 F.3d 956, June 29, 1999) vacated the injunction because the Legislature had amended § 81.101 in the meantime to add the software safe harbor. — [Justia](https://law.justia.com/cases/federal/appellate-courts/F3/179/956/546619/); [OpenJurist](https://openjurist.org/179/f3d/956/unauthorized-practice-of-law-committee-v-parsons-technology-inc)

**Texas Gov't Code § 81.101(c) safe harbor (exact conditions)**
- The "practice of law" does not include "the design, creation, publication, distribution, display, or sale ... of written materials, books, forms, computer software, or similar products **if the products clearly and conspicuously state that the products are not a substitute for the advice of an attorney**." — [Justia TX Gov't Code 81.101](https://law.justia.com/codes/texas/government-code/title-2/subtitle-g/chapter-81/subchapter-g/section-81-101/); [Texas Legislature, Ch. 81](https://statutes.capitol.texas.gov/Docs/GV/htm/GV.81.htm)
- The subsection "does not authorize the use of the products or similar media in violation of Chapter 83" (Certain Unauthorized Practice of Law) and does not affect Chapter 83. — [texas.public.law](https://texas.public.law/statutes/tex._gov't_code_section_81.101)
- **[UNVERIFIED]**: the full statutory text defines "Internet website" as a similar product. Confirm against the Legislature's text.

**Upsolve v. James (New York; First Amendment challenge to UPL)**
- The 2d Circuit decided the case on **Sept 9, 2025** (No. 22-1345). It agreed that NY's UPL statutes regulate speech as applied to nonlawyer advice on a debt-collection answer form. It held the regulation **content-neutral**, so intermediate scrutiny applies (not strict), vacated the preliminary injunction, and remanded. — [Justia 2d Cir.](https://law.justia.com/cases/federal/appellate-courts/ca2/22-1345/22-1345-2025-09-09.html); [CourtListener](https://www.courtlistener.com/opinion/10668452/upsolve-inc-v-james/); [Public Citizen CLP Blog](https://clpblog.citizen.org/second-circuit-holds-unlawful-practice-law-can-apply-to-debt-collection-advice/)
- On remand, the S.D.N.Y. reportedly held on **March 6, 2026** that NY's UPL statute survives intermediate scrutiny and dismissed the case. A cert petition was reportedly filed Feb 11, 2026. — [getoutofdebt.org (secondary)](https://getoutofdebt.org/244280/upsolve-new-york-free-debt-advice-supreme-court); docket entry [Justia S.D.N.Y. Doc. 135](https://law.justia.com/cases/federal/district-courts/new-york/nysdce/1:2022cv00627/573762/135/) (not fetched, 403). **[UNVERIFIED]**: remand outcome and cert status.

**DoNotPay (FTC plus private class action)**
- In the Sept 2024 complaint, the FTC said DoNotPay's "robot lawyer" did not live up to claims that it substituted for a human lawyer. DoNotPay never tested whether it performed at a human lawyer's level and "did not hire or retain attorneys to test the quality and accuracy." The final order was approved 5-0 on Jan 16, 2025: **$193,000**, notice to 2021–2023 subscribers, and a bar on claiming the service performs like a real lawyer without substantiation. — [FTC press release, Feb 2025](https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires); [FTC case page](https://www.ftc.gov/legal-library/browse/cases-proceedings/donotpay)
- **[UNVERIFIED]**: the private class action (Faridian v. DoNotPay, filed 2023; UPL/UCL claims; reportedly compelled to arbitration or dismissed). Not re-checked in this pass.

**Nippon Life Ins. Co. of America v. OpenAI (N.D. Ill., No. 1:26-cv-02448, filed March 4, 2026)**
- The claims are tortious interference with contract, abuse of process, and **unlicensed practice of law**. Nippon alleges ChatGPT helped a pro se litigant attack a settled disability case, including drafting motions (one cited a nonexistent case). It seeks a declaration that ChatGPT practiced law, an injunction, and $10M in punitive damages. — [Norton Rose Fulbright, Inside Tech Law](https://www.insidetechlaw.com/blog/2026/04/ai-in-litigation-series-complaint-accuses-openai-of-practicing-law-without-a-license); [FindLaw](https://www.findlaw.com/legalblogs/practice-of-law/new-lawsuit-claims-chatgpt-practices-law-without-a-license/)
- OpenAI moved to dismiss, arguing "ChatGPT is not a 'person,' but a tool... incapable of practicing law within the meaning of the statute." As of the latest reports the motion was fully briefed (reply due July 17, 2026) and **held in abeyance** pending a relatedness/reassignment question. **No ruling found.** — [Bloomberg Law](https://news.bloomberglaw.com/litigation/open-ai-dismissal-motion-says-chatgpt-is-mere-tool-not-attorney); [The Legal Wire](https://thelegalwire.ai/openai-tells-court-chatgpt-is-not-a-lawyer-in-unauthorized-practice-fight/); [RTÉ](https://www.rte.ie/news/business/2026/0518/1574003-chat-gpt-not-lawyer/)
- OpenAI reportedly amended its usage terms in Oct 2025 to restrict tailored legal advice without a licensed professional's involvement. — [Norton Rose Fulbright](https://www.insidetechlaw.com/blog/2026/04/ai-in-litigation-series-complaint-accuses-openai-of-practicing-law-without-a-license)
- Stanford CodeX commentary frames the case as a product-liability ("designed to cross") theory. — [Stanford CodeX](https://law.stanford.edu/2026/03/07/designed-to-cross-why-nippon-life-v-openai-is-a-product-liability-case/)

**New York S7263 / S7263A (chatbot impersonating licensed professionals)**
- Introduced April 7, 2025 (Sen. Gonzalez). It would add GBL § 390-f and bar chatbots from giving "any substantive response, information, or advice" that licensing laws bar unlicensed humans from giving, including in **law**. It creates a private right of action and requires a conspicuous AI-disclosure notice. Operators "**shall not waive or disclaim liability**" merely by disclosing that the bot is non-human. — [NY Senate S7263A](https://www.nysenate.gov/legislation/bills/2025/S7263/amendment/A); [Holland & Knight](https://www.hklaw.com/en/insights/publications/2026/03/new-york-bill-would-create-liability-for-chatbot-proprietors); [Perkins Coie](https://perkinscoie.com/insights/update/new-york-bill-would-create-private-right-action-against-chatbot-proprietors)
- **Status:** passed the Senate Internet & Technology Committee Feb 25, 2026, went to third reading Mar 4, was amended to version A on May 26, and was **committed to Senate Rules June 5, 2026**. It has **not** passed either chamber and **is not law** as of the latest action shown. Version A adds AG enforcement (up to $15,000/day), a "knowingly permit" standard, and a safe harbor where users intentionally circumvent safeguards. — [NY Senate S7263A](https://www.nysenate.gov/legislation/bills/2025/S7263/amendment/A); [ppc.land](https://ppc.land/new-yorks-chatbot-liability-bill-reaches-senate-floor-threatening-ai-providers/)

**ABA Formal Opinion 512 (July 29, 2024)**
- The opinion addresses **lawyers'** use of generative AI: competence, confidentiality, client communication, candor, supervision and reasonable fees. It does not regulate non-lawyer vendors directly. — [ABA Op. 512 PDF](https://www.americanbar.org/content/dam/aba/administrative/professional_responsibility/ethics-opinions/aba-formal-opinion-512.pdf); [ABA News](https://www.americanbar.org/news/abanews/aba-news-archives/2024/07/aba-issues-first-ethics-guidance-ai-tools/)

### Inferences
- **Where the line falls for Duly.** These are safer, because they are "information" rather than "practice":
  - storing the user's own documents and dates;
  - showing the text of government rules with citations to official sources (e.g., "USCIS says OPT applications may be filed up to 90 days before the program end date");
  - doing date arithmetic that the user can check, presented as a calculation from a stated rule;
  - generic checklists copied from official instructions.

  These are riskier (the Janson "branching" problem):
  - questionnaire logic that concludes what status, benefit or form applies to this user, or whether they are "in status" or "eligible";
  - recommending a course of action ("you should file X," "you don't need to report this");
  - drafting explanations to USCIS, or answering RFEs.
- **The AI assistant is the highest-risk surface.** Nippon (UPL claim against a general chatbot) and NY S7263A (no disclaimer defense) show that regulators and litigants are focused on individualized chatbot advice. Duly's assistant should be scoped to retrieving and explaining official sources and the user's own records, and should refuse or redirect person-specific legal judgments. **[COUNSEL]**
- The Texas safe harbor needs a "clear and conspicuous" "not a substitute for the advice of an attorney" statement. It is cheap to satisfy and should be implemented everywhere (onboarding, footer, AI panel, exports). But it only protects the product in Texas and does not override the notario and Chapter 83 rules.
- The NC model (attorney review of every template/branch, plus a preview before purchase) is the best-documented "structure that works." It supports adding **attorney review with dates** for Duly's rule library and checklists.

### Gaps
- Final disposition of Janson (settlement terms) and Faridian v. DoNotPay were not verified in this pass.
- Upsolve's remand ruling (Mar 2026) and cert petition status come only from a secondary source; the docket was not fetched.
- No ruling yet in Nippon v. OpenAI as of the latest found report (~July 2026).
- Whether NY S7263A moves again in the 2027 session is unknown.
- I found **no enforcement action or lawsuit against Lawfully, Boundless, SimpleCitizen or CitizenPath** for UPL or notario violations in this pass. That is not proof none exist. **[COUNSEL]**: run a docket/AG search.

---

## 2. Immigration-specific rules: who may represent before DHS, and state immigration-consultant/notario statutes

### Takeaway
Federal rules restrict "practice" and "preparation" before DHS to attorneys and accredited representatives. The definition of "preparation" is broad ("study of the facts of a case and the applicable laws, coupled with the giving of advice"). The states Duly cares about each regulate paid non-lawyer "immigration assistance." In general they allow only clerical help (transcribing, translating, collecting documents, fee-free referrals), ban advice or form selection, and require registration, bonds and "I am not an attorney" notices. A **paid** app that tells a user which form to file, whether they qualify, or what to answer could be treated as an unregistered immigration consultant or assistance provider. A pure record-keeping and reminder tool that does not touch filings is less likely to be covered, but no case tests this for software. **[COUNSEL]**

### Cited Findings
**Federal (8 CFR)**
- 8 CFR § 1.2 defines "Practice" as appearing in any case "either in person or through the preparation or filing of any brief or other document, paper, application, or petition on behalf of another person or client before or with DHS." — [Cornell LII 8 CFR 1.2](https://www.law.cornell.edu/cfr/text/8/1.2)
- It defines "Preparation" as "the study of the facts of a case and the applicable laws, coupled with the giving of advice and auxiliary activities, including the incidental preparation of papers." It excludes notary functions and "service consisting solely of assistance in the completion of blank spaces on printed DHS forms, by one whose remuneration, if any, is **nominal** and who does not hold himself or herself out as qualified in legal matters or in immigration and naturalization procedure." — [Cornell LII 8 CFR 1.2](https://www.law.cornell.edu/cfr/text/8/1.2)
- "Representation before DHS" includes both practice and preparation. — [Cornell LII 8 CFR 1.2](https://www.law.cornell.edu/cfr/text/8/1.2)
- **[UNVERIFIED]**: 8 CFR 292.1 and 1292.1 list who may represent (attorneys, law students/graduates under supervision, "reputable individuals" appearing without direct or indirect remuneration, accredited representatives of recognized organizations, accredited officials, and certain attorneys outside the U.S.). 8 CFR 1003.102 lists grounds for disciplining practitioners. Not fetched in this pass; confirm text.

**California: Bus. & Prof. Code §§ 22440–22449 (Immigration Consultants Act)**
- § 22440: it is unlawful for any person, **for compensation**, other than attorneys or federally authorized representatives, to act as an immigration consultant except as the chapter provides. — [Justia CA BPC 22440](https://law.justia.com/codes/california/code-bpc/division-8/chapter-19-5/section-22440/)
- § 22441(a): an immigration consultant gives **nonlegal** assistance, such as:
  - "Completing a form provided by a federal or state agency but **not advising a person as to their answers**";
  - translating answers;
  - "Securing for a person supporting documents";
  - submitting completed forms to USCIS at the person's request;
  - "Making referrals to persons who could undertake legal representation activities."

  § 22441(b) defines "immigration matter" broadly: "any proceeding, filing, or action affecting the immigration or citizenship status ... arises under immigration and naturalization law ... or action of USCIS, the Department of State, or the Department of Labor." § 22441(c): "compensation" means "money, property, or anything else of value." Consultants may "only offer nonlegal assistance or advice." — [FindLaw CA BPC 22441](https://codes.findlaw.com/ca/business-and-professions-code/bpc-sect-22441/)
- A consultant must obtain a $50,000 corporate surety bond and file it with the Secretary of State along with an Immigration Consultant Disclosure form. — [Justia CA BPC 22440 et seq.](https://law.justia.com/codes/california/2009/bpc/22440-22448.html) (summary via search; the page returned 403 on fetch)
- **[UNVERIFIED]**: the specific § 22442/22442.2/22444 requirements (written contract, "not an attorney" notices, ban on "notario," ban on guaranteeing outcomes, ban on retaining original documents) and civil/criminal penalties in § 22445. Reported by secondary sources such as [CLINIC UPIL California](https://www.cliniclegal.org/node/1924) but not fetched.

**New York: GBL Article 28-C (§ 460-a et seq.)**
- "Immigrant assistance service" means "providing assistance, for a fee or other compensation, to persons who have, or plan to, come to the United States from a foreign country." A "Provider" is any person or entity providing such services. Exempt are:
  - licensed attorneys and those under their direct supervision;
  - BIA-recognized nonprofits charging nominal fees;
  - accredited representatives and organizations;
  - persons authorized by federal law. — [newyork.public.law GBL 460-a](https://newyork.public.law/laws/n.y._general_business_law_section_460-a)
- Providers must register with the Department of State. They may not claim to be attorneys or give legal advice, or accept fees for it. — [NYSenate GBL 460-B](https://www.nysenate.gov/legislation/laws/GBS/460-B); [Justia 460-b](https://law.justia.com/codes/new-york/2022/gbs/article-28-c/460-b/)
- **[UNVERIFIED]**: the exact § 460-j prohibited-acts list (e.g., ban on using "notario," promising special influence, retaining documents) and bond amount. Not fetched.

**Illinois: 815 ILCS 505/2AA (Consumer Fraud Act, immigration assistance)**
- "Immigration assistance service" is "any information or action provided or offered to customers or prospective customers related to immigration matters, **excluding legal advice, recommending a specific course of legal action, or providing any other assistance that requires legal analysis, legal judgment, or interpretation of the law**." — [FindLaw 815 ILCS 505/2AA](https://codes.findlaw.com/il/chapter-815-business-transactions/il-st-sect-815-505-2aa/)
- Non-attorneys may only:
  - complete forms without legal judgment;
  - transcribe and translate;
  - secure existing documents;
  - notarize;
  - make **fee-free** attorney referrals;
  - arrange photos, fingerprints and medical tests;
  - run English/civics courses. — [FindLaw](https://codes.findlaw.com/il/chapter-815-business-transactions/il-st-sect-815-505-2aa/)
- Requirements and prohibitions:
  - register with the Illinois AG and show malpractice insurance or a surety bond;
  - post an 11×17 sign reading "I AM NOT AN ATTORNEY LICENSED TO PRACTICE LAW AND MAY NOT GIVE LEGAL ADVICE OR ACCEPT FEES FOR LEGAL ADVICE";
  - give written contracts in English and the customer's language;
  - allow a 72-hour rescission period;
  - no fees for referring to attorneys;
  - no "notario"-type literal translations ($1,000 fine). — [FindLaw](https://codes.findlaw.com/il/chapter-815-business-transactions/il-st-sect-815-505-2aa/); [ILGA](http://www.ilga.gov/legislation/ilcs/fulltext.asp?DocName=081505050K2AA)

**Texas**
- Tex. Gov't Code § 406.017 makes it an offense for a notary to state or imply attorney status, or to **solicit or accept compensation to prepare documents or represent another in a proceeding relating to immigration or U.S. citizenship**. It also bans using "notario"/"notario publico" and requires a bilingual notice when advertising in another language: "I AM NOT AN ATTORNEY LICENSED TO PRACTICE LAW IN TEXAS AND MAY NOT GIVE LEGAL ADVICE OR ACCEPT FEES FOR LEGAL ADVICE." It is a Class A misdemeanor, and a third-degree felony on a repeat. — [FindLaw TX Gov't Code 406.017](https://codes.findlaw.com/tx/government-code/gov-t-sect-406-017/); [texas.public.law](https://texas.public.law/statutes/tex._gov't_code_section_406.017)
- **[UNVERIFIED]**: Texas also regulates immigration consultants in Gov't Code Chapter 83 / Occupations Code. See [CLINIC UPIL Texas](https://www.cliniclegal.org/node/1962).

**Nevada (founder's state): NRS Chapter 240A (Document Preparation Services)**
- Covered "document preparation services" include preparing documents for "any proceeding, filing or action affecting the **immigration or citizenship status** of a person." Registrants must register with the Nevada Secretary of State and post a **$25,000** cash or surety bond covering damage from violations, "fraud, dishonesty, **negligence** or other wrongful conduct." — [Justia NRS 240A.120](https://law.justia.com/codes/nevada/chapter-240a/statute-240a-120/); [NRS 240A (Legislature)](https://www.leg.state.nv.us/nrs/NRS-240A.html); [NV SOS duties page](https://www.nvsos.gov/licensing/document-preparation-services/duties-obligations-of-a-document-preparation-service)
- NRS 240A.240 prohibits, among other things, implying paralegal or attorney supervision and negotiating on a client's behalf. — [nevada.public.law NRS 240A.240](https://nevada.public.law/statutes/nrs_240a.240); [Justia NRS 240A.240](https://law.justia.com/codes/nevada/chapter-240a/statute-240a-240/)
- **[UNVERIFIED]**: whether NRS 240A covers self-service software where the user prepares their own document. The statutory definition of "document preparation service" (NRS 240A.030) was not fetched. **[COUNSEL]**: this is a priority because the founder is in Nevada.

**Florida**
- Fla. Stat. § 454.23 makes unlicensed practice of law, or holding out as qualified to practice, a **third-degree felony** (up to 5 years and a $5,000 fine). Florida treats preparing, or assisting in preparing, immigration documents for another as UPL, and non-attorney notaries must disclaim attorney status in ads. — [Florida Senate 454.23](https://flsenate.gov/Laws/Statutes/2016/0454.23); [CLINIC UPIL Florida](https://www.cliniclegal.org/node/1928)
- **[UNVERIFIED]**: the immigration-specific detail above comes from secondary summaries. Florida's UPL rules also include Florida Bar Rule 10-2.1 on nonlawyer form completion (fill-in only from written or recorded info).

**How comparable companies structure themselves**
- Boundless: "Boundless Immigration, Inc. is not a law firm." Legal services come from "Boundless Legal Services, a law firm wholly owned and controlled by licensed attorneys." Site content "is not intended to be legal advice" and creates no attorney-client relationship. Its "Ask My Attorney" service uses independent attorneys under a Limited Scope Representation Agreement. — [Boundless Service-Specific Terms](https://www.boundless.com/service-specific-terms); [Boundless FAQs](https://www.boundless.com/boundless-faqs)
- CitizenPath / SimpleCitizen / Lawfully: terms pages were not retrieved (CitizenPath ToS URL returned 404). **[UNVERIFIED]**

### Inferences
- **Statutory hooks for Duly.** Every state statute above is triggered by (a) **compensation** plus (b) assistance in an **"immigration matter"** (any filing or action affecting status). F-1 OPT, STEM OPT, SEVIS reporting, CPT and H-1B cap-gap are all "immigration matters." A paid subscription that helps with them is at least arguably "assistance." The strongest defensive posture is that Duly is a personal organizer that does not prepare, select, complete or submit any government form and does not advise on answers.
- **Features that look like consultant work and could require registration or bonds, or be flatly barred in CA/IL:**
  - auto-filling I-765 or other forms from the user's data;
  - telling users which form or category code to choose (e.g., "(c)(3)(B)");
  - reviewing answers;
  - telling users what to write in an explanation.
- **Referral fees.** Illinois bans fees for attorney referrals, and CA allows referrals only as nonlegal assistance. **Do not take per-referral fees from attorneys** without state-by-state counsel review. Many states' Rules of Professional Conduct 7.2 also bar lawyers from paying for recommendations, except through qualified lawyer referral services. **[COUNSEL]**
- **Terminology.** Never use "notario," "immigration consultant," "legal assistant," "paralegal" or "immigration expert" about the company or the AI. Several statutes punish these titles directly (IL, TX, NV).
- The federal "preparation" definition, "study of the facts of a case and the applicable laws, coupled with the giving of advice," describes what an LLM assistant does when asked "can I travel while my OPT is pending?" That is a strong reason to limit the assistant to source retrieval and routing to the DSO or an attorney.

### Gaps
- The full text of 8 CFR 292.1, 1292.1 and 1003.102 was not fetched.
- CA §§ 22442–22445, NY § 460-j, NV § 240A.030 definitions and the Florida immigration-specific rules were not verified from primary text.
- No case law found on whether a deadline/checklist **app** (no form preparation) is an "immigration consultant" or "provider." This is an open question. **[COUNSEL]**

---

## 3. FTC Section 5: deceptive AI and legal-service claims

### Takeaway
The FTC has shown, through DoNotPay and Operation AI Comply, that it will pursue AI products marketed as substitutes for lawyers or professionals without testing and substantiation. Claims like "lawyer-quality," "never miss a deadline," "prevents RFEs" or "guaranteed" need competent evidence or should be dropped.

### Cited Findings
- **Operation AI Comply** was announced Sept 25, 2024, and targets using AI "to supercharge deceptive or unfair conduct." It launched with five actions, including DoNotPay, Rytr (AI fake-review generation) and Ascend (AI business-opportunity income claims). — [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes); [Mintz](https://www.mintz.com/insights-center/viewpoints/54731/2024-10-03-ftc-launches-operation-ai-comply-five-enforcement)
- DoNotPay advertised an "AI lawyer" that could "generate perfectly valid legal documents in no time." It settled by paying $193,000 and agreeing to stop claims "about its ability [to use AI] to substitute for any professional service without evidence to back it up." — [Mintz](https://www.mintz.com/insights-center/viewpoints/54731/2024-10-03-ftc-launches-operation-ai-comply-five-enforcement); [FTC final order release](https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires)
- The FTC stressed that DoNotPay had not had attorneys test the accuracy of its law-related features. — [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires)
- Boundless markets a "Satisfaction Guarantee," an example of a refund-style guarantee rather than an outcome guarantee. — [Boundless Satisfaction Guarantee](https://www.boundless.com/satisfaction-guarantee)

### Inferences
- **Substantiation checklist before any accuracy or quality claim:**
  - documented attorney testing of the rule engine and AI answers;
  - an eval set of real student scenarios;
  - error rates;
  - a dated attorney-review log.
- **Outcome guarantees.** "Guaranteed approval," "prevents RFEs," "avoid deportation" or "stay in status" are outcome claims Duly cannot substantiate. They also match classic notario-fraud themes (promising results or special influence), which several state statutes ban outright. **[COUNSEL]**: pull the FTC's notario-fraud consumer guidance, which was not fetched in this pass.
- **"AI" claims** must describe what the model actually does (e.g., "answers questions using official USCIS/SEVP sources and cites them") and must not imply lawyer equivalence.
- Because Duly's users are international students, many non-native English speakers, **translated marketing** must avoid literal translations of "notary," "lawyer" or "attorney" (IL, TX rules).

### Gaps
- FTC notario-fraud guidance pages were not fetched.
- The full DoNotPay order text (definitions, compliance-reporting length, the exact "covered service" scope) was not read; only the press release was.
- No 2025–2026 FTC action specific to immigration apps was found in this pass.

---

## 4. Disclaimers, clickwrap, tort theories, arbitration, Section 230

### Takeaway
Disclaimers and ToS are necessary but not sufficient. They satisfy the Texas safe harbor and help defeat reliance, but they do not cure UPL or statutory consultant violations, and NY S7263A would make them irrelevant for chatbots. Terms are enforceable only with conspicuous notice tied to a clear act of assent (Berman). Section 230 likely does **not** protect first-party AI output.

### Cited Findings
- **Berman v. Freedom Financial Network, 30 F.4th 849 (9th Cir. 2022):** sign-in-wrap is enforceable only with (1) reasonably conspicuous notice and (2) an action that unambiguously shows assent. The notice must be in a font size and format a reasonably prudent user would notice. The defendant lost because the notice was tiny and not immediately next to the button. — [9th Cir. opinion PDF](https://cdn.ca9.uscourts.gov/datastore/opinions/2022/04/05/20-16900.pdf); [CourtListener](https://www.courtlistener.com/opinion/6458861/daniel-berman-v-freedom-financial-network-llc/); [Consumer Finance Monitor](https://www.consumerfinancemonitor.com/2022/05/02/ninth-circuit-revisits-standards-for-enforcing-online-arbitration-provisions/)
- **Meyer v. Uber Techs., 868 F.3d 66 (2d Cir. 2017):** upheld Uber's registration-screen notice ("By creating an Uber account, you agree to the Terms...") as reasonably conspicuous. **[UNVERIFIED in this pass]**: not fetched; cite-check before relying.
- **NY S7263A:** operators "shall not waive or disclaim liability" by disclosing AI status. — [NY Senate](https://www.nysenate.gov/legislation/bills/2025/S7263/amendment/A)
- **Texas § 81.101(c):** a clear and conspicuous "not a substitute for the advice of an attorney" statement is the condition for the software safe harbor. — [Justia](https://law.justia.com/codes/texas/government-code/title-2/subtitle-g/chapter-81/subchapter-g/section-81-101/)
- **Section 230:**
  - CRS analysis: 230 immunity turns on content "provided by another information content provider." Whether it covers generative AI output is unsettled. — [Congress.gov CRS LSB11097](https://www.congress.gov/crs-product/LSB11097); [CDT analysis](https://cdt.org/insights/section-230-and-its-applicability-to-generative-ai-a-legal-analysis/)
  - Section 230's authors (Cox, Wyden) have said it does not cover generative AI. — [Quartz](https://qz.com/section-230-ai-chatbots-legal-immunity-generative-content-072826)
  - A contrary view (Crowell) argues 230 can extend to AI platforms in some settings. — [Crowell & Moring](https://www.crowell.com/en/insights/client-alerts/the-pipe-not-the-posts-how-section-230s-protections-extend-to-generative-ai-platforms)
- **Walters v. OpenAI (Ga. Super. Ct., May 2025):** summary judgment for OpenAI on defamation from ChatGPT output, decided on ordinary fault and damages principles rather than 230. — [Quinn Emanuel AI Update, Apr 2026](https://www.quinnemanuel.com/the-firm/publications/artificial-intelligence-update-april-2026/) **[UNVERIFIED]**: case name inferred; the source snippet did not name it.
- The Nevada document-prep bond explicitly covers **negligence**, so a covered registrant's negligent errors are bondable claims. — [Justia NRS 240A.120](https://law.justia.com/codes/nevada/chapter-240a/statute-240a-120/)

### Inferences
- **Wrong-deadline exposure.** The likely tort theories are negligent misrepresentation (supplying false information for the guidance of others in their business transactions, Restatement (Second) of Torts § 552), negligence, breach of contract or warranty, and state UDAP/UCL. The economic loss rule may bar pure negligence claims for financial loss in many states. Negligent misrepresentation is often an exception where the defendant is in the business of supplying information. **[UNVERIFIED / COUNSEL]**: state-specific. Losing OPT, SEVIS termination or unlawful presence could produce large consequential damages claims.
- **Mitigations:**
  - conspicuous, Berman-compliant clickwrap (a checkbox or an "I agree" directly adjacent to the button, not buried);
  - arbitration plus a class-action waiver;
  - limitation of liability (cap at fees paid, exclude consequential damages);
  - an explicit "verify with your DSO/official source" step on every computed date;
  - showing the rule, source link and inputs behind each calculation, so the user can independently verify.

  Consumer-facing liability caps may be unenforceable, or unconscionable, for gross negligence or statutory claims in CA and elsewhere. **[COUNSEL]**
- Do not rely on Section 230 for AI answers. Assume Duly is the "speaker" of whatever the assistant says.
- **Disclaimers cannot fix substance.** A "not legal advice" banner on an answer that says "You're eligible for STEM OPT; select category (c)(3)(C) and file by June 3" is still likely advice. The fix is feature design, not wording.

### Gaps
- State-by-state economic loss rule and negligent-misrepresentation treatment of software information providers was not researched with sources.
- Garcia v. Character Technologies (M.D. Fla. 2025; court reportedly declined at the pleading stage to treat chatbot output as protected speech or to dismiss product-liability claims) is relevant but was not fetched. **[UNVERIFIED]**
- Meyer v. Uber was not fetched.

---

## 5. Practical structure options (attorney review, referral vs. ABS/sandbox, E&O)

### Takeaway
The proven model (Boundless, the LegalZoom NC settlement) keeps the software company as a non-law-firm and does three things:
- has licensed attorneys review the content and templates;
- routes individualized advice to independent or affiliated attorneys under a separate engagement;
- avoids fee-splitting and per-referral fees.

ABS or regulatory-sandbox routes (Arizona, Utah) exist but were not verified in this pass.

### Cited Findings
- NC consent judgment conditions: attorney review of every template and component, plus a pre-purchase preview. — [Buncombe County Bar](https://buncombebar.com/legal-zoom-consent-judgement/)
- Boundless split structure: a non-law-firm tech company plus an attorney-owned law firm and independent attorneys under limited-scope agreements. — [Boundless Service-Specific Terms](https://www.boundless.com/service-specific-terms)
- CA law permits immigration consultants to make "referrals to persons who could undertake legal representation activities." Illinois allows only **fee-free** referrals. — [FindLaw CA 22441](https://codes.findlaw.com/ca/business-and-professions-code/bpc-sect-22441/); [FindLaw IL 2AA](https://codes.findlaw.com/il/chapter-815-business-transactions/il-st-sect-815-505-2aa/)
- Illinois requires malpractice insurance or a surety bond for immigration assistance providers. Nevada requires a $25,000 bond for document preparers. CA requires a $50,000 bond for immigration consultants. — [FindLaw IL](https://codes.findlaw.com/il/chapter-815-business-transactions/il-st-sect-815-505-2aa/); [Justia NRS 240A.120](https://law.justia.com/codes/nevada/chapter-240a/statute-240a-120/); [Justia CA BPC](https://law.justia.com/codes/california/code-bpc/division-8/chapter-19-5/section-22440/)

### Inferences
- **Recommended structure for Duly at launch:**
  1. Duly stays a software company. The product is framed as a personal organizer and official-source explainer, **not** an immigration service.
  2. A licensed immigration attorney reviews the rule library, checklists and AI system prompt and guardrails. Each rule shows a "Reviewed by [attorney], [state bar], on [date]; sources: [links]." Reviews recur whenever USCIS, SEVP or ICE guidance changes. Keep the reviewing attorney's role limited to content review, with no attorney-client relationship with users, under a written engagement. **[COUNSEL]**
  3. For individualized questions, route users to their **DSO** (free, and the authoritative source for F-1 SEVIS actions) or to an independent attorney directory or marketplace with **no per-referral fees**. A flat advertising fee may be possible if structured under Rule 7.2 and the state immigration statutes. **[COUNSEL]**
  4. Carry tech E&O / professional liability coverage that explicitly includes AI-generated output and regulatory-defense costs. **[UNVERIFIED]**: market availability and pricing.
  5. Before charging users in CA, NY, IL or NV, get a written opinion on whether any feature triggers registration or a bond (CA § 22440, NY Art. 28-C, IL 2AA, NV 240A). **[COUNSEL]**
- **ABS/sandbox.** Arizona licenses Alternative Business Structures, which let non-lawyers own law firms, and Utah runs a legal regulatory sandbox. **[UNVERIFIED]**: current status; Utah reportedly narrowed its sandbox in 2025. These only authorize activity in those states and do not solve CA, NY or IL exposure, and they are likely overkill for an organizer app.

### Gaps
- Arizona ABS and Utah sandbox current rules and 2025–2026 changes were not researched with sources.
- E&O carrier appetite for AI legal-information products was not researched.
- Lawfully's structure and any enforcement history were not found.

---

## Appendix: Draft DO / DON'T rules for Duly (derived from findings above; **[COUNSEL]** to confirm)

**Product copy and marketing: NEVER say**
- "lawyer," "attorney," "legal advice," "legal expert," "immigration consultant," "paralegal," "notario" or "notary" about Duly or its AI, in any language (IL 2AA, TX 406.017, NV 240A.240, FTC/DoNotPay).
- "as good as a lawyer," "lawyer-quality," "replaces an attorney," "AI immigration lawyer" (DoNotPay order).
- "guaranteed," "never miss a deadline," "prevents RFEs," "keeps you in status," "avoid deportation," "approval," or anything implying outcome or special influence with USCIS or SEVP (state notario statutes, FTC § 5).
- Accuracy percentages or "attorney-verified" claims without documented testing and a dated review log (FTC substantiation).

**Product copy: ALWAYS**
- Show a clear, conspicuous statement: "Duly is not a law firm and is not a substitute for the advice of an attorney. Information is general and not legal advice." Put it at onboarding (with assent), in the footer, in the AI panel and in exports (TX 81.101(c)).
- Attribute every rule to an official source with a link (USCIS, the SEVP Study in the States portal, 8 CFR/regs) and a "last reviewed" date.
- Present computed dates as "Based on [rule] and the dates you entered, the window is X–Y. Confirm with your DSO before acting."
- Disclose that the assistant is AI (NY S7263A-style).

**Features: OK (lower risk)**
- Secure document vault (I-20, EAD, I-94, passport), expiration tracking, reminders.
- Date calculators that transparently apply a stated public rule to user-entered dates, with the formula shown.
- Generic checklists copied or summarized from official instructions, attorney-reviewed and dated.
- An AI that **retrieves and explains official sources and the user's own records**, with citations.
- A "Questions to ask your DSO/attorney" generator.

**Features: DON'T (higher risk: UPL, consultant statutes, preparation under 8 CFR 1.2)**
- Selecting or recommending which form, category code or benefit a user should apply for, or telling them they are "eligible" or "in status."
- Auto-filling or completing USCIS/DHS forms, reviewing answers, drafting cover letters or RFE/NOID responses, or submitting anything to USCIS on the user's behalf.
- AI answers to "should I…" or "can I…" questions about the user's specific situation (travel, unemployment days, status violations, reinstatement) that give a conclusion. It should give the rule plus a route to the DSO or an attorney.
- Paid attorney referrals or fee-splitting.
- Retaining users' original documents or blocking export (several notario statutes bar withholding documents).

**Terms, clickwrap and ops**
- Berman-compliant assent: explicit checkbox or "I agree" next to the action button, with readable links.
- Arbitration and class waiver, limitation of liability, no-warranty clause, and a "verify with official sources" user covenant. Treat these as risk reducers, not UPL cures.
- Keep a dated attorney-review log, AI eval results and a change log (FTC substantiation, NC-style defense).
- Get E&O/tech-liability coverage that includes AI output. Get a state-specific counsel opinion for CA, NY, IL, NV, TX and FL before monetizing.
