# Legal, Regulatory, and Trust Constraints on Monetizing Duly (US consumer immigration-compliance app, 2025-2026)

## Key Question 1: Unauthorized Practice of Law (UPL) — where is the line for paid immigration guidance software, and how do comparables structure themselves?

### Takeaway
The UPL line in immigration is drawn at individualized advice: selecting forms/benefits for a specific person, telling them how to answer questions, or advising on their status and options. General information, deadline tracking of user-entered facts, record-keeping, and self-help tools sit on the safe side if clearly disclaimed. Comparable products (Boundless) either stay strictly self-help with heavy disclaimers or route legal advice through a separately licensed attorney entity; the FTC's DoNotPay action shows that overclaiming AI legal capability is independently actionable as deception even apart from UPL.

### Cited Findings
- Federal regulation defines unauthorized practice of immigration law to include "the selection and preparation of forms" plus any advice on immigration status, "how to answer questions on immigration forms, and what options a noncitizen might have"; only attorneys and DOJ-accredited representatives may do this — [CLINIC UPIL state-by-state overview](https://www.cliniclegal.org/upil)
- Most states have statutes specifically targeting unauthorized practice of immigration law, enforced by state bars, attorneys general, consumer protection agencies, and UPL committees; penalties are typically fines and misdemeanors, a few states felonies — [CLINIC UPIL overview](https://www.cliniclegal.org/upil)
- ABA guidance on avoiding unauthorized practice of immigration law exists as a distinct enforcement focus (notario fraud initiative), signaling immigration is a UPL-sensitive vertical — [ABA Fight Notario Fraud](https://www.americanbar.org/groups/public_interest/immigration/projects_initiatives/fightnotariofraud/avoiding-the-unauthorized-practice-of-immigration-law/)
- Texas expressly exempts self-help computer software from the practice-of-law definition (Gov't Code ch. 81, added after the Parsons Technology/Quicken Family Lawyer case) provided the product clearly and conspicuously states it is not a substitute for the advice of an attorney — [Tex. Gov't Code ch. 81](https://statutes.capitol.texas.gov/Docs/GV/htm/GV.81.htm) (verify §81.101(c) text directly; not fetched in full)
- Boundless's terms disclaim UPL on three layers: site content and tools are "provided for informational purposes only and do not constitute legal advice"; use of interactive tools "does not by itself create an attorney-client relationship"; and for self-service tiers the user acknowledges "you are not receiving legal advice or legal representation" — [Boundless Terms](https://www.boundless.com/terms)
- Where Boundless does provide legal services, they come exclusively through "Boundless Legal, LLC," a wholly owned Arizona Alternative Business Structure entity (Arizona is the state that allows non-lawyer ownership of law firms) — [Boundless Terms](https://www.boundless.com/terms)
- FTC finalized its order against DoNotPay (5-0 vote, Jan 16, 2025): $193,000 monetary relief, prohibition on unsubstantiated claims that the service performs like a real lawyer, and required notice to 2021-2023 subscribers; the FTC found DoNotPay never tested whether its AI matched human-lawyer expertise nor hired attorneys to verify quality — [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires); also covered by [ABA Journal](https://www.abajournal.com/news/article/robot-lawyer-website-donotpay-settles-ftc-claims-it-couldnt-deliver-on-promises)
- The DoNotPay case was part of the FTC's "Operation AI Comply" sweep against deceptive AI claims and is analyzed as the leading precedent for AI legal-adjacent consumer products — [Journal of Consumer Policy analysis](https://link.springer.com/article/10.1007/s10603-025-09606-0)

### Inferences
- Duly's planned feature set (checklists, deadline tracking, record-keeping/WorkBook, general scenario education) is defensible as self-help if it avoids: (a) recommending which visa/benefit to pursue for a specific user, (b) telling users what to enter on government forms, (c) preparing or auto-filling USCIS/SEVP forms. AI "scenario answers" are the riskiest feature: personalized answers about "what options do I have" is squarely the language federal regs use to define unauthorized practice of immigration law. Mitigations used by the market: frame outputs as general information about rules plus "consult a DSO/attorney" for the personal decision, and consider an attorney-referral or attorney-review partnership for anything individualized.
- The DoNotPay precedent means marketing constraints are as important as product constraints: never claim the AI is "like a lawyer," "replaces an attorney," or is validated by attorneys unless it demonstrably is. Substantiation (testing, attorney QA) is expected before capability claims.
- Sprintax/TurboTax operate in tax prep, which has an explicit federal preparer regime and long-accepted self-prep software norms; that model does not transfer cleanly to immigration, where form selection/preparation itself is defined as practice of law. (See Gaps.)

### Gaps
- SelfLawyer's specific terms structure was not retrievable in this pass; its public positioning is attorney-led document preparation, but I found no primary-source terms page to cite.
- No state bar enforcement action specifically against an AI immigration app was found for 2025-2026; the enforcement examples are the FTC deception route (DoNotPay) and traditional notario/UPIL enforcement. Absence of cases is not a safe harbor.
- The exact current text of Texas Gov't Code §81.101(c) and analogous self-help software carve-outs in other states were not fetched; a state-by-state pass (CLINIC maintains one) is needed before launch messaging is finalized.

## Key Question 2: Privacy/security law for a consumer app holding immigration-adjacent data

### Takeaway
Immigration/citizenship status is now expressly "sensitive" data under California's CCPA/CPRA (via AB 947, 2023) and under the Texas TDPSA, triggering consent or limitation obligations where those laws apply. Even below state-law thresholds, FTC Act §5 applies to any privacy/security promise Duly makes. The 2025 DocketWise breach (116k immigration records) is the concrete cautionary precedent and a marketable differentiator for Duly's on-device architecture.

### Cited Findings
- California AB 947 (effective 2024) added "citizenship or immigration status" to the CCPA/CPRA definition of sensitive personal information, giving consumers the right to limit its use and disclosure — [Coblentz](https://www.coblentzlaw.com/news/citizenship-and-immigration-status-is-now-categorized-as-sensitive-personal-information-under-california-law/); [Jackson Lewis](https://www.workplaceprivacyreport.com/2023/10/articles/california-consumer-privacy-act/immigration-and-citizenship-status-add-to-definition-of-sensitive-information-under-californias-consumer-privacy-act/); [Akin](https://www.akingump.com/en/insights/blogs/ag-data-dive/california-expands-definition-of-sensitive-personal-information-covered-under-ccpa)
- CCPA/CPRA applies only to businesses meeting thresholds (the commonly cited ones: >$25M annual revenue, or data on 100k+ consumers/households, or 50%+ revenue from selling/sharing personal info) — [Akin summary of CCPA scope](https://www.akingump.com/en/insights/blogs/ag-data-dive/california-expands-definition-of-sensitive-personal-information-covered-under-ccpa) (thresholds are statutory; confirm current inflation-adjusted figures)
- Texas TDPSA (in force July 1, 2024) defines sensitive data to include "citizenship or immigration status" and requires consent before processing it; small businesses (<500 employees per SBA definition) are exempt UNLESS they sell sensitive personal data; penalties up to $7,500 per violation after a 30-day cure period — [Termly TDPSA summary](https://termly.io/resources/articles/texas-data-privacy-and-security-act/); [White & Case](https://www.whitecase.com/insight-alert/texas-passes-comprehensive-data-privacy-law)
- Colorado, Virginia and other comprehensive state privacy laws treat citizenship/immigration status as sensitive data requiring opt-in consent in several states (pattern noted across VCDPA/CPRA comparisons) — [Clarip CPRA/VCDPA comparison](https://www.clarip.com/data-privacy/handling-sensitive-personal-information-under-the-cpra-and-the-vcdpa/)
- DocketWise (immigration case-management SaaS) breach: compromise began ~Sept 1, 2025, disclosed April 3, 2026; 116,666 individuals exposed, including SSNs, passport numbers, asylum and deportation-defense case details; attacker used valid credentials to clone third-party partner repositories; multiple class-action investigations followed — [ComplexDiscovery](https://complexdiscovery.com/when-your-legal-tech-vendor-gets-breached-docketwise-incident-exposes-116666-immigration-records-and-a-professions-blind-spot/); litigation coverage at [Law360](https://www.law360.com/pulse/amp/articles/2467452)
- Civil-rights groups documented in 2025 that immigration enforcement agencies actively seek commercial data sources, raising stakes for any company holding immigration data — [Leadership Conference report, "Immigration, DOGE, and Data Privacy"](https://civilrights.org/wp-content/uploads/2025/05/Immigration-DOGE-and-Data-Privacy.pdf); [KQED on ICE data purchasing](https://www.kqed.org/news/12055606/how-ice-is-using-your-data-and-what-you-can-do-about-it)

### Inferences
- At launch scale Duly will likely be below CCPA thresholds and within the TDPSA small-business exemption (if it never "sells" sensitive data), so the binding constraints day one are FTC Act §5 (every claim in the privacy policy and marketing must be true and substantiated) and state mini-FTC acts. But growth past 100k users triggers CCPA, so building consent flows for immigration-status data now is cheaper than retrofitting.
- The on-device architecture materially reduces breach exposure and government-request exposure for the most sensitive material, and DocketWise gives Duly a concrete, citable contrast story. However, "sensitive data stays on device" is itself an FTC §5 claim: if scenario questions sent to cloud LLMs contain visa details (they almost inevitably will), the claim must be scoped honestly (e.g., "documents and records stay on device; questions you ask the assistant are processed in the cloud under X protections").
- Government-access requests (subpoenas, ICE data demands) deserve an explicit policy stance; on-device storage means Duly literally cannot produce vault contents, which is a defensible and marketable position.

### Gaps
- No consumer-app-specific immigration data breach (as opposed to B2B legal-tech like DocketWise and UK-based Immigration Advice Service) was found; consumer incident base rate unknown.
- Current inflation-adjusted CCPA revenue threshold and whether any state AG has enforced sensitive-data consent rules against a small consumer app were not verified.

## Key Question 3: AI-specific obligations 2025-2026

### Takeaway
The feared Colorado AI Act was repealed before effect and replaced (May 2026) by a narrower transparency law effective Jan 1, 2027 that covers consequential decisions in seven domains not including immigration guidance; the live obligations for Duly are California's chatbot/companion and transparency laws (disclose AI is AI) and the FTC's deception standard for AI claims. Both Anthropic and OpenAI API terms let Duly truthfully say "your data is not used to train models" by default, with zero-data-retention available on request.

### Cited Findings
- Colorado repealed the Colorado AI Act before it took effect and replaced it (May 2026) with the Automated Decision-Making Technology Act, effective Jan 1, 2027, covering automated decision-making in seven domains: education, employment, housing, lending, insurance, healthcare, government benefits; it drops discrimination duties in favor of transparency, adverse-decision explanation within 30 days, and a right to human review "to the extent commercially reasonable" — [Skadden](https://www.skadden.com/insights/publications/2026/06/colorado-repeals-and-replaces-its-ai-act); earlier delay coverage at [Clark Hill](https://www.clarkhill.com/news-events/news/colorados-ai-law-delayed-until-june-2026-what-the-latest-setback-means-for-businesses/)
- California SB 243 (companion chatbots, effective Jan 1, 2026) requires operators to disclose users are talking to AI, adds minor-protection and self-harm-protocol duties, and creates a private right of action up to $1,000 per violation plus fees; it targets chatbots that provide "adaptive, human-like responses" meeting social needs — [A&O Shearman California AI landscape 2026](https://www.aoshearman.com/en/insights/ao-shearman-on-tech/zooming-in-on-ai-california-evolving-ai-legal-landscape-entering-2026)
- California SB 942 (AI Transparency Act) was delayed from Jan 1, 2026 to Aug 2, 2026 and applies to developers of generative AI systems with over one million monthly users (detection tools, provenance disclosures) — [A&O Shearman](https://www.aoshearman.com/en/insights/ao-shearman-on-tech/zooming-in-on-ai-california-evolving-ai-legal-landscape-entering-2026); [Morgan Lewis](https://www.morganlewis.com/pubs/2026/08/new-california-ai-disclosure-rules-become-operative)
- Anthropic API: retained data "never used for model training without your express permission"; Zero Data Retention available per-organization on request for the Messages API (some newest models require 30-day retention; batch/code-execution/files features excluded from ZDR) — [Anthropic API and data retention docs](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)
- OpenAI: business/API data is not used for training by default; API data controls and Zero Data Retention for eligible endpoints/frontier models are documented — [OpenAI Enterprise Privacy](https://openai.com/enterprise-privacy/); [OpenAI data controls docs](https://developers.openai.com/api/docs/guides/your-data); [OpenAI ZDR announcement](https://openai.com/index/offering-zero-data-retention-for-frontier-models/)
- FTC's DoNotPay order shows AI capability claims must be substantiated by testing (see KQ1) — [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires)

### Inferences
- Duly's immigration-guidance AI probably falls outside the Colorado replacement law's seven consequential-decision domains ("government benefits" is the closest; immigration status guidance to the user is not a covered deployer decision about them), but this should be re-checked once the Colorado AG's rules issue in 2026.
- SB 243's applicability to Duly depends on whether the assistant counts as a "companion" chatbot meeting social needs; a task-scoped immigration assistant likely is not, but the cheap, robust move is to comply with the disclosure norm anyway: label the assistant as AI, in-product and persistently.
- "Your data isn't trained on" is substantiable today by pointing to Anthropic/OpenAI API defaults; "your data isn't retained by the AI provider" requires a negotiated ZDR arrangement (both vendors gate ZDR behind sales contact and exclude some models/features), so do not make retention claims until ZDR is actually in place.
- Utah's AI Policy Act (chatbot disclosure on request, disclosure for regulated professions) also exists in this space; not verified this pass (see Gaps).

### Gaps
- Utah AI Policy Act specifics and any other state generative-AI disclosure laws (Illinois, Texas TRAIGA) were not verified this pass.
- Whether Anthropic/OpenAI ZDR is available at small-startup scale (both say "contact sales") is unconfirmed.

## Key Question 4: Trust/market expectations to charge (SOC 2, encryption, zero-knowledge)

### Takeaway
Hard sourcing on consumer-stage SOC 2 expectations was thin this pass; the sourced signal is that comparable trust is built through architecture claims (on-device storage, encryption) and honest scoping, and that the DocketWise incident is raising vendor-security scrutiny across immigration tech. A true zero-knowledge claim is incompatible with cloud LLM answering, so claims must be scoped.

### Cited Findings
- DocketWise breach commentary frames vendor security due diligence as a professional-responsibility issue in immigration tech (ABA Model Rules vendor diligence), i.e., security posture is becoming a purchase criterion in this vertical — [ComplexDiscovery](https://complexdiscovery.com/when-your-legal-tech-vendor-gets-breached-docketwise-incident-exposes-116666-immigration-records-and-a-professions-blind-spot/)
- Boundless competes partly on a trust promise, offering a 14-day 100% satisfaction guarantee as consumer recourse — [Boundless Terms](https://www.boundless.com/terms); [Boundless satisfaction guarantee page](https://www.boundless.com/satisfaction-guarantee)
- Anthropic/OpenAI publish security- and privacy-posture pages (ZDR, no-training defaults) that downstream apps routinely cite in their own trust pages — [Anthropic docs](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention); [OpenAI Enterprise Privacy](https://openai.com/enterprise-privacy/)

### Inferences
- SOC 2 is standard for B2B sales, not a consumer purchase driver; for a consumer student app, the effective trust stack is: plain-language security page (encryption at rest/in transit, on-device vault), the two LLM-provider no-training citations, a clear government-request policy, and a refund guarantee. SOC 2 becomes relevant if Duly later sells to universities/DSOs (B2B2C), where procurement will demand it.
- "Zero-knowledge" as a literal claim (provider cannot read any user data) is only true for the on-device vault. Any marketing must not extend it to the cloud account data (Duly holds keys if it can serve AI answers) or to LLM queries. Safe formulation: "documents never leave your device; account data encrypted; AI questions processed without training or long-term retention [once ZDR is in place]." Overclaiming here is precisely the FTC §5 pattern.

### Gaps
- No quantitative source found this pass on whether consumers expect SOC 2 or on comparable consumer-fintech security claims (Chime/Copilot-style trust pages were not fetched); mark as unsourced.
- No survey data found on international students' security expectations for immigration apps.

## Key Question 5: Payments/refunds — auto-renewal law, click-to-cancel status, student refund norms, app-store commissions

### Takeaway
The federal Click-to-Cancel rule was vacated by the Eighth Circuit in July 2025 on procedural grounds, but ROSCA, FTC Act §5, and ~30 state auto-renewal laws still govern, and the FTC opened rulemaking in March 2026 to revive the rule; California's amended ARL (effective July 1, 2025) is the strictest practical baseline. On mobile, Apple can now charge a "reasonable commission" even on external payment links after the Ninth Circuit's December 2025 modification of the Epic injunction, so the standard 15% small-business in-app rate is the realistic planning number.

### Cited Findings
- The Eighth Circuit vacated the FTC's 2024 Click-to-Cancel (Negative Option) Rule in full in July 2025, days before its compliance deadline, on APA procedural grounds rather than substance — [Latham & Watkins](https://www.lw.com/en/insights/eighth-circuit-vacates-ftc-click-to-cancel-rule-days-before-compliance-deadline); [Cooley](https://www.cooley.com/news/insight/2025/2025-07-11-click-to-cancel-just-got-cancelled-eighth-circuit-vacates-entirety-of-ftcs-negative-option-rule)
- In March 2026 the FTC issued an ANPRM to revive the rule (comments closed April 13, 2026); meanwhile ROSCA (clear disclosure, express informed consent, simple cancellation) and ~30 state auto-renewal laws remain enforceable, and the FTC has kept enforcing via settlements (Care.com $8.5M; Amazon $2.5B) — [Jones Day](https://www.jonesday.com/en/insights/2026/05/ftc-revives-clicktocancel-rule-new-risks-for-subscription-businesses)
- California's amended ARL (AB 2863, effective July 1, 2025) requires express affirmative consent to auto-renewal terms with records kept 3 years; online signups must have online cancellation via "a direct link or button"; annual renewal reminders; 7-30 days notice before price increases; free trials over 31 days need 3-21 days notice before conversion; terms of 1+ year need 15-45 day renewal notices — [Cooley ARL summary](https://www.cooley.com/news/insight/2025/2025-06-04-california-automatic-renewal-law-amendments-take-effect-on-july-1-2025); bill text at [AB-2863](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240AB2863)
- Ninth Circuit (Dec 11, 2025) modified the Epic v. Apple injunction: Apple may charge a "reasonable commission" on purchases via external links (remanded to district court to set the amount; must exclude security/privacy costs), and may regulate link prominence and language; the prior period of commission-free external links is over — [MacRumors](https://www.macrumors.com/2025/12/11/apple-app-store-fees-external-payment-links/); opinion at [Justia, Epic v. Apple No. 25-2935](https://law.justia.com/cases/federal/appellate-courts/ca9/25-2935/25-2935-2025-12-11.html)
- Boundless's refund norm in the immigration consumer market: 14-day 100% satisfaction guarantee — [Boundless satisfaction guarantee](https://www.boundless.com/satisfaction-guarantee)

### Inferences
- Practical compliance floor for Duly subscriptions: build to California ARL + ROSCA (affirmative unbundled consent checkbox, full price/term disclosure pre-purchase, one-click online cancel, annual reminder email, pre-conversion notice on any free trial >31 days). That satisfies most other state ARLs and whatever revived federal rule emerges.
- For a student audience where a subscription may become useless mid-term (visa approved, OPT ended, user leaves the US), a generous pro-rata or first-14-days-full-refund policy matches the Boundless market norm and reduces chargeback/complaint risk; students are also a chargeback-prone, price-sensitive segment.
- App-store economics: if sold as an iOS subscription, plan on Apple's small-business 15% commission (under $1M/year); external-link workarounds are no longer commission-free after Dec 2025, and the "reasonable commission" on external purchases is unsettled, so web-first signup (sell subscription on the web, log in on mobile, Netflix-style reader-app pattern where applicable) remains the only reliable way to avoid commission entirely.

### Gaps
- The district-court-determined "reasonable commission" for external links post-remand had no figure yet in sources found; unresolved as of this research.
- No source found specifically on refund norms/expectations of international students as a payments segment; the Boundless guarantee is the closest market comparable.
- Google Play commission specifics and its post-Epic (Google) injunction status were not researched this pass.

## Cross-cutting "must do / must not do" summary (for the report writer)

Must do to charge safely:
- Disclaim clearly and conspicuously: not a law firm, no attorney-client relationship, general information not legal advice (Boundless-style three-layer language; also satisfies Texas-style self-help software carve-outs).
- Keep the AI's outputs general-educational; gate or reframe individualized "what should I do" answers; label the assistant as AI persistently (SB 243 norm).
- Obtain opt-in consent before processing immigration-status data for any user in CA/TX/CO-style states; scope privacy claims exactly to the architecture (vault on-device; AI queries cloud-processed).
- Substantiate every AI and security claim before making it (DoNotPay standard); get ZDR in writing before claiming zero retention.
- Subscriptions: CA ARL-compliant consent, disclosures, one-click cancel, annual reminders; 14-day refund guarantee as market norm.

Must not do:
- Select forms, prepare/auto-fill immigration forms, or advise how to answer form questions (the federal definition of unauthorized practice of immigration law).
- Market the AI as a lawyer substitute or claim attorney validation without real attorney QA.
- Claim "zero-knowledge" or "we can't see your data" for anything that transits the cloud LLM path.
- Sell or share immigration-status data (destroys the TDPSA small-business exemption and is reputationally fatal in this vertical given ICE data-purchase scrutiny).
