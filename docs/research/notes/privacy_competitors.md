# Privacy Law Obligations and Competitor Positioning for Duly (F-1/OPT record keeping), as of Sept 2026

Scope note: Duly processes citizenship/immigration status (inherent in F-1/OPT records), identity documents (passport, I-20, EAD), government identifiers (SEVIS ID, USCIS receipt numbers), account/case data on AWS, and sends content to the Claude API. Research date: 2026-09-28. Many state-law summaries below come from law-firm alerts or compliance-vendor blogs rather than statute text; those are flagged. Nothing here is legal advice; statutory text should be checked by counsel before launch.

## A1. Which state comprehensive privacy laws treat citizenship/immigration status as sensitive data, what consent they require, and would a small startup be covered?

### Takeaway
Nearly every state comprehensive privacy law classes citizenship/immigration status as "sensitive data" that needs opt-in consent (California uses notice plus a "right to limit" instead). But most apply only above volume thresholds (35k to 100k residents) or, in California, above $26.625M in revenue, so a pre-scale startup is mostly outside them. The exceptions that bite early are: Connecticut (from July 1, 2026, any controller processing sensitive data is covered, whatever its size); Texas and Minnesota (small businesses still need consent before *selling* sensitive data); Maryland (a strict-necessity limit and a total ban on selling sensitive data once its 35k threshold is met); and Nevada (founder's state), whose sale opt-out applies to operators of any size. The cheapest route is to build to the strictest standard now: opt-in consent, no sale ever, processing only what the requested service strictly needs.

### Cited Findings
**California (CCPA/CPRA)**
- AB 947 (signed Oct 8, 2023, effective Jan 1, 2024) added "citizenship or immigration status" to the CCPA definition of sensitive personal information (SPI). That gives consumers the right to limit its use and disclosure. — [Akin](https://www.akingump.com/en/insights/blogs/ag-data-dive/california-expands-definition-of-sensitive-personal-information-covered-under-ccpa); [Bill text](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB947)
- California lets a business process SPI without prior consent if it discloses the processing and offers an opt-out ("right to limit"). The other states use opt-in. — [SecurePrivacy (vendor blog)](https://secureprivacy.ai/blog/us-state-privacy-law-tracker-2026)
- Under 11 CCR §7027(m), a business that uses or discloses SPI only for the listed purposes does not have to post a "Notice of Right to Limit" or offer a limit method, if it says so in its privacy policy. The main purpose is providing the goods or services a consumer reasonably expects, where the use is "reasonably necessary and proportionate" and not used to infer characteristics. — [Cornell LII 11 CCR 7027](https://www.law.cornell.edu/regulations/california/11-CCR-7027); [CPPA final regs text](https://cppa.ca.gov/regulations/pdf/20230329_final_regs_text.pdf)
- Applicability: annual global gross revenue above $26,625,000 (CPI-adjusted, effective Jan 1, 2025, next adjustment Jan 2027), OR buying/selling/sharing personal information of 100,000+ CA consumers or households, OR 50%+ of revenue from selling/sharing. — [Clym (vendor)](https://www.clym.io/blog/ccpa-applicability-guide); [Jackson Lewis FAQ](https://www.jacksonlewis.com/insights/navigating-california-consumer-privacy-act-30-essential-faqs-covered-businesses-including-clarifying-regulations-effective-1126)
- 2025 CPPA regulations (approved by OAL Sept 22–23, 2025, effective Jan 1, 2026). Processing SPI counts as "significant risk" and requires a risk assessment. Assessments for processing that began before 2026 are due by Dec 31, 2027, and annual summary reporting to the CPPA starts Apr 1, 2028. ADMT rights for "significant decisions" start Jan 1, 2027. Cybersecurity audit deadlines are phased by revenue, the last being Apr 1, 2030 for businesses under $50M. — [CPPA announcement](https://www.cppa.ca.gov/announcements/2025/20250923.html); [Thompson Coburn](https://www.thompsoncoburn.com/insights/californias-2026-ccpa-regulations-summary-and-preparation-guide/); [Skadden](https://www.skadden.com/insights/publications/2025/10/california-finalizes-cppa-regulations)

**Texas (TDPSA)**
- Sensitive data includes data revealing "citizenship or immigration status." Processing it requires consent. — [White & Case](https://www.whitecase.com/insight-alert/texas-passes-comprehensive-data-privacy-law); [Texas AG](https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-privacy-rights/texas-data-privacy-and-security-act)
- Small businesses as defined by the SBA are generally exempt. Even so, a small business that *sells* a consumer's sensitive data must first get consent. SBA size standards vary by industry; most non-manufacturing industries use a receipts cap (commonly cited as about $8M, though the figure varies by NAICS code). — [Davis Wright Tremaine](https://www.dwt.com/blogs/privacy--security-law-blog/2023/07/texas-data-privacy-and-security-act-overview); [Baker Data Counsel](https://www.bakerdatacounsel.com/blogs/texas-data-privacy-and-security-act-decoding-the-small-business-exception/); [Ketch](https://www.ketch.com/regulatory-compliance/texas-data-privacy-security-act-tdpsa)
- Texas also requires honoring universal opt-out signals (from 2025). — [Ketch](https://www.ketch.com/regulatory-compliance/texas-data-privacy-security-act-tdpsa)

**Maryland (MODPA, effective Oct 1, 2025)**
- Applies at 35,000+ Maryland consumers (excluding data processed solely for payment), or 10,000+ consumers with more than 20% of revenue from data sales. — [White & Case](https://www.whitecase.com/insight-alert/maryland-enacts-comprehensive-data-privacy-law); [Fisher Phillips](https://www.fisherphillips.com/en/insights/insights/marylands-new-immigration-related-consumer-privacy-provisions)
- Controllers may not collect, process or share sensitive data "except where the collection or processing is strictly necessary to provide or maintain a specific product or service requested by the consumer," *even with consent*. MODPA also bans outright any sale of sensitive data. — [Davis+Gilbert](https://www.dglaw.com/the-maryland-online-data-privacy-act-familiar-requirements-but-stricter-sensitive-data-mandates/); [White & Case](https://www.whitecase.com/insight-alert/maryland-enacts-comprehensive-data-privacy-law)
- Unverified: the search snippet's list of MODPA sensitive categories did not mention citizenship/immigration status. Other trackers say most states include it. Check MD Com. Law §14-4701 directly. — [White & Case](https://www.whitecase.com/insight-alert/maryland-enacts-comprehensive-data-privacy-law)

**Connecticut (CTDPA as amended by SB 1295, effective July 1, 2026)**
- The CTDPA now applies to controllers that process personal data of 35,000+ consumers OR that "control or process consumers' sensitive data" (payment-only excluded), with no volume floor. It also covers anyone who sells personal data in any amount. Impact assessments apply to processing created on or after Aug 1, 2026. — [National Law Review](https://natlawreview.com/article/connecticut-amends-connecticut-data-privacy-act); [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/connecticut-amends-the-connecticut-data-privacy-act); [Snell & Wilmer](https://www.swlaw.com/publication/connecticut-data-privacy-act-2026-amendments/)
- Unverified: I did not confirm the exact CT sensitive-data text on citizenship/immigration status. The CTDPA has used the Virginia-style definition since 2023, which includes it.

**Virginia (VCDPA)**
- "Sensitive data" includes personal data revealing "citizenship or immigration status." Processing it requires consent. — [Va. Code §59.1-575](https://law.lis.virginia.gov/vacode/title59.1/chapter53/section59.1-575/); [SecurePrivacy](https://secureprivacy.ai/blog/us-state-privacy-law-tracker-2026)

**Colorado (CPA)**
- Sensitive data includes "citizenship or citizenship status." Opt-in consent is required. — [Ketch (vendor)](https://www.ketch.com/regulatory-compliance/colorado-privacy-act-cpa); [GT Data Privacy Dish](https://www.gtlaw-dataprivacydish.com/2023/09/update-processing-sensitive-personal-information-under-u-s-state-privacy-laws/)

**Oregon (OCPA)**
- Sensitive data includes citizenship or immigration status. Opt-in consent is required. — [Syrenis (vendor)](https://syrenis.com/resources/us-privacy-laws-conneticut-colorado-oregon/)

**Multi-state**
- CO, CT, DE, IN, MT, OR, TN, TX and VA require both a data protection assessment and opt-in consent before processing sensitive data. — [GT Data Privacy Dish](https://www.gtlaw-dataprivacydish.com/2023/09/update-processing-sensitive-personal-information-under-u-s-state-privacy-laws/)
- Rhode Island and Oklahoma also list citizenship/immigration status as sensitive. Rhode Island's threshold is 35,000 consumers. Indiana, Kentucky and Rhode Island took effect in 2026. — [SecurePrivacy](https://secureprivacy.ai/blog/us-state-privacy-law-tracker-2026)

**New Jersey (NJDPL, effective Jan 15, 2025)**
- Requires honoring universal opt-out mechanisms such as GPC from July 15, 2025. — [Syrenis/search summary](https://syrenis.com/resources/us-privacy-laws-conneticut-colorado-oregon/)
- Unverified: I did not confirm from primary text that NJ's sensitive-data definition includes citizenship/immigration status. It is widely reported to, but that is not verified here.

**Minnesota (MCDPA, effective July 31, 2025)**
- Applies at 100,000+ consumers. Sensitive data includes citizenship/immigration status. SBA-defined small businesses are excluded, but they still cannot sell sensitive data without prior consent (same model as Texas). — [Byte Back](https://www.bytebacklaw.com/2024/05/minnesota-legislature-passes-consumer-data-privacy-act/); [Koley Jessen](https://www.koleyjessen.com/insights/publications/minnesota-consumer-data-privacy-act-takes-effect-july-31)

**Nevada (founder's state)**
- Nevada has no comprehensive consumer privacy law. NRS 603A.340 (as amended by SB 220, 2019) requires online operators to post a privacy notice and to honor requests to opt out of the "sale" of covered information. There is a notice exemption for an operator that is located in Nevada, earns revenue primarily from sources other than online sales, and has fewer than 20,000 unique visitors per year. All three conditions must be met, and exempt operators must still honor sale opt-outs. — [NRS 603A](https://www.leg.state.nv.us/nrs/nrs-603a.html); [Cooley](https://www.cooley.com/news/insight/2019/2019-06-18-nevada-privacy-law-gives-consumers-right-to-opt-out); [Recording Law](https://www.recordinglaw.com/us-laws/data-privacy-laws/nevada-data-privacy-laws/)
- Nevada SB 370 (consumer health data, NRS 603A.400–.550, effective Mar 31, 2024) has no size threshold but covers only "consumer health data." — [Bass Berry](https://bassberry.com/news/nevada-consumer-health-data-law-takes-effect-on-march-31-2024/); [WilmerHale](https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law/20230614-nevada-legislature-passes-consumer-health-data-privacy-bill)

### Inferences
- Pre-launch coverage: Duly is almost certainly *outside* CCPA (revenue and 100k tests), Texas and Minnesota (SBA small business, unless it sells sensitive data), Maryland (35k MD users), VA/CO/OR (100k thresholds). It is almost certainly *inside* Connecticut from its first CT user, because every F-1 record reveals immigration status. It is also inside Nevada NRS 603A.340's sale opt-out. **So the full CTDPA regime (opt-in consent for sensitive data, privacy notice, access/deletion/correction rights, data protection assessment) applies from day one.**
- Building to Maryland's "strictly necessary" standard plus a policy of never selling or "sharing" (for cross-context ads) meets or beats every state. It also avoids the Texas/Minnesota small-business sale trap and gets Duly under CCPA §7027(m) with no "right to limit" link if it ever crosses CA thresholds.
- Concretely: (1) an explicit, separate opt-in consent screen at onboarding for processing immigration status and ID documents, logged with timestamp and version; (2) no third-party ad SDKs or pixels anywhere in the app or on logged-in pages (the BetterHelp/Flo lesson); (3) a documented data protection assessment covering the LLM processing; (4) request workflows for access, deletion, correction and portability with a 45-day response; (5) an appeal process (required in CT/VA/CO-model states).
- Washington My Health My Data and Nevada SB 370 are not directly relevant, since Duly does not process health data. They would become relevant only if Duly stored medical exam records (e.g., I-693), which is out of scope for F-1/OPT.

### Gaps
- I did not retrieve primary statutory text for MD, CT, NJ, OR, CO sensitive-data definitions. Summaries above rely on law-firm and vendor sources.
- I did not verify the current SBA receipts threshold for Duly's specific NAICS code (likely 513210 or 541511).
- Rights-response timelines (45 days plus extension) and cure periods by state were not individually verified.

## A2. Government access: ICE data purchases, IRS–ICE sharing, subpoenas to apps, new state restrictions, and best-practice LE-request policies

### Takeaway
The government-access risk is real and current. DHS/ICE issued "hundreds" of administrative subpoenas (no judge) to tech platforms in 2025–26. After courts blocked IRS→ICE taxpayer data sharing, ICE turned to buying data from commercial vendors. Maryland (HB 711, effective July 1, 2026) now bans covered controllers from knowingly selling personal data to agencies engaged in civil immigration enforcement without a court warrant. Duly's best defense is structural: hold as little plaintext server-side as possible, keep documents local and encrypted, and publish a warrant-only LE policy with user notice and transparency reports.

### Cited Findings
- IRS–ICE MOU signed Apr 7, 2025. A federal judge blocked further sharing (Nov 21, 2025), finding it likely unlawful under IRC §6103; the IRS had disclosed 42,695 taxpayer addresses via TIN matching. On Sept 8, 2026 the D.C. Circuit unanimously affirmed an injunction in *Center for Taxpayer Rights v. IRS*. — [FedScoop](https://fedscoop.com/judge-blocks-irs-ice-data-sharing-agreement/); [FedScoop on 40K+ violations](https://fedscoop.com/irs-broke-law-ice-data-sharing-taxpayer-addresses-judge-rules/); [Law Commentary](https://www.lawcommentary.com/articles/irs-ice-taxpayer-records-court-ruling)
- ICE awarded a ~$9.97M contract (June 5, 2026 per reporting) to reseller Thundercat Technology for "ITIN data subscription and analytics." Reporting frames this as sidestepping the IRS injunction through commercial data; the underlying broker is unconfirmed. — [Yahoo News](https://www.yahoo.com/news/politics/articles/ice-appears-buying-immigrant-tax-151504612.html); [Gadget Review](https://www.gadgetreview.com/ice-appears-to-be-buying-immigrant-tax-ids-after-courts-blocked-the-irs) (secondary sources; not verified against procurement records)
- DHS issued "hundreds of administrative subpoenas" seeking names, emails, phone numbers, IPs and session times of users critical of ICE, sent to Google, Meta, Reddit and Discord. — [Military.com](https://www.military.com/daily-news/2026/02/17/dhs-collecting-big-tech-users-personal-data-issuing-subpoenas-ice-related-criticism.html); [EFF list](https://www.eff.org/deeplinks/2026/08/list-ice-subpoenas-tech-companies)
- Google reportedly gave a student journalist's personal and financial information to ICE. — [TechCrunch](https://techcrunch.com/2026/02/10/google-sent-personal-and-financial-information-of-student-journalist-to-ice/)
- Pushback examples:
  - Meta's LE Response Team (Sept 19, 2025) told ICE it lacked statutory authorization and demanded investigation details. Meta then notified users; ICE withdrew after users challenged the subpoenas in court.
  - Reddit objected to DHS subpoenas on First Amendment grounds (H2 2025 transparency report), and the requests were withdrawn.
  - EFF recommends that companies publicly commit not to release data without court compulsion, challenge unlawful subpoenas, give users notice, and publish transparency reports.
  - — [EFF](https://www.eff.org/deeplinks/2026/08/some-tech-companies-have-privately-pushed-back-ice-subpoenas-they-should-all-do); [Immigration Policy Tracking Project](https://immpolicytracking.org/policies/dhs-uses-administrative-subpoenas-to-obtain-personal-data-from-critics/)
- Maryland HB 711 (became law May 31, 2026 without signature; effective July 1, 2026; amends MODPA):
  - Controllers may not knowingly sell personal data to a governmental unit that "within the six months that immediately precede the sale… has engaged in or supported civil immigration enforcement." The only exception is a court warrant that "particularly describes the personal data."
  - Enforced by the MD Division of Consumer Protection as an unfair or deceptive trade practice, with a 60-day cure period.
  - Fisher Phillips recommends warrant-review protocols, updated subpoena procedures, and contract restrictions.
  - — [Fisher Phillips](https://www.fisherphillips.com/en/insights/insights/marylands-new-immigration-related-consumer-privacy-provisions); [MGA bill page](https://mgaleg.maryland.gov/mgawebsite/Legislation/Details/hb0711?ys=2026RS); [Privacy Daily](https://privacy-daily.com/article/2026/06/01/md-immigration-privacy-bill-becomes-law-without-governors-signature-2606010028?BC=bc_6a1ec8354b184)
- Oregon SB 1587 (2026) restricts *public bodies* from giving PII to data brokers unless the broker attests in writing that it will not sell or transfer the data for federal immigration enforcement. An earlier broader version aimed at private brokers was narrowed. — [OPB](https://www.opb.org/article/2026/07/03/oregon-new-law-personal-information-ice-federal-immigration-customs-enforcement/); [American Immigration Council](https://www.americanimmigrationcouncil.org/blog/state-immigration-laws-2026-ice-masks/)
- Washington SB 6002 restricts ALPR data use for immigration enforcement. — [American Immigration Council](https://www.americanimmigrationcouncil.org/blog/state-immigration-laws-2026-ice-masks/)
- California's Delete Act (SB 362) creates a data broker deletion mechanism. — [Wikipedia: Delete Act](https://en.wikipedia.org/wiki/Delete_Act) (secondary)
- Competitor LE policies:
  - Lawfully: "We will disclose your Personal Information where required to do so by law or subpoena." — [Lawfully Privacy](https://www.lawfully.com/privacy-policy)
  - TrackMyOPT: discloses "if required by law, court order, or to protect safety and rights," with no procedure described. — [TrackMyOPT Privacy](https://www.trackmyopt.com/privacy)

### Inferences
- Lawfully's "law or subpoena" standard would cover an ICE administrative subpoena. Duly can stand out by publishing a policy that requires a judicial warrant or court order for content, promises user notice unless gagged, commits to challenging overbroad requests, and publishes a (possibly "zero requests") transparency report with a canary-style statement.
- The architectural point matters more than policy. If documents are client-side encrypted with keys Duly does not hold, Duly cannot produce them. But account data on AWS (email, name, school, SEVIS ID, OPT dates, employer) *can* be compelled. Minimize and pseudonymize server-side case data, and consider encrypting case fields client-side as well.
- Never sell or license data, even de-identified. Lawfully shares "de-identified or anonymized" data with marketing and advertising partners; that is a risk pattern Duly should avoid (see Avast re: re-identifiable "anonymized" data in A4).
- Data minimization in logs also matters: IPs and session times were exactly what the DHS subpoenas sought.

### Gaps
- I did not identify the statutory authorities ICE cites for these subpoenas (commonly reported as 8 U.S.C. §1225(d) / 19 U.S.C. §1509). The EFF article did not state them.
- I found no confirmed California or Illinois 2025–26 law directly restricting *private apps* from sharing immigration data with ICE, beyond CCPA's SPI rules. California SB 54 (2017) restricts state and local law enforcement, not private companies.
- I found no reported ICE subpoena to an immigration-tracking app specifically.

## A3. CAN-SPAM, Global Privacy Control, COPPA

### Takeaway
CAN-SPAM applies only to commercial email: transactional deadline reminders are largely exempt, but anything promotional needs an opt-out and a physical address. GPC must be honored in about 12 states, though it only matters if Duly "sells" or "shares" data, which it should not. COPPA does not apply (users are adults), though an under-13 policy line is prudent.

### Cited Findings
- CAN-SPAM:
  - Up to $53,088 per violating email.
  - Commercial emails need accurate headers, non-deceptive subject lines, a valid physical postal address, and a working opt-out.
  - Transactional/relationship messages are largely exempt. Mixing in promotional content can make a message commercial ("primary purpose" test).
  - — [FTC CAN-SPAM guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- GPC is reported as legally required in CA, CO, CT, DE, MD, MN, MT, NE, NH, NJ, OR and TX as of 2026. — [Clym (vendor)](https://www.clym.io/blog/what-is-global-privacy-control-the-opt-out-signal-12-us-states-now-require-you-to-honor) (vendor tally, not verified against each statute)
- Sept 2025 joint CA/CO/CT sweep: CPPA fined Honda $632,500 and Todd Snyder $345,178, reportedly in part for failing to honor opt-outs/GPC. — [Seresa (vendor)](https://seresa.io/blog/global-privacy-control-gpc/global-privacy-control-2026-the-signal-that-kills-your-retargeting) (verify on cppa.ca.gov)

### Inferences
- If Duly has no ad pixels or data sales, GPC compliance is simple: detect the `Sec-GPC` header, treat it as an opt-out, and say so in the privacy policy.
- OPT deadline reminder emails are transactional. Keep marketing (e.g., "upgrade to Pro") in separate emails with unsubscribe links.

### Gaps
- I did not verify the CPPA enforcement amounts on cppa.ca.gov itself.

## A4. AI provider data handling (Anthropic Claude API)

### Takeaway
Under Anthropic's Commercial Terms, API inputs and outputs are not used for training. The published commercial retention policy is automatic deletion within 30 days, with longer retention for Usage Policy flags (inputs/outputs up to 2 years, classifier scores up to 7 years). Zero Data Retention is available by contract per organization, but not for certain "Covered Models," which require 30-day retention. Anthropic's two docs pages currently phrase default retention differently; flag this for verification.

### Cited Findings
- Anthropic privacy center (commercial, dated July 1, 2026): "we automatically delete inputs and outputs on our backend within 30 days of receipt or generation," with exceptions for custom agreements, policy enforcement and legal compliance. If flagged for Usage Policy violation: "We retain inputs and outputs for up to 2 years and trust and safety classification scores for up to 7 years." Feedback submissions are kept 5 years. — [Anthropic Privacy Center](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data)
- Anthropic API docs:
  - "Retained data is never used for model training without your express permission."
  - "Conversation content (your prompts and Claude's outputs) is not retained by default; the exception is Covered Models, which require 30-day retention."
  - This wording differs from the privacy center's 30-day auto-delete. Possible conflict; confirm with Anthropic.
  - — [Claude Platform Docs: API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)
- ZDR:
  - Under ZDR, "Anthropic does not store customer prompts or responses at rest after the API response is returned." It is requested via sales, enabled per organization, and covers the Messages and Token Counting APIs for eligible features.
  - Claude Fable 5.1, Mythos 5.1, Fable 5 and Mythos 5 require 30-day retention and are not available under ZDR unless expressly authorized.
  - CORS is not supported for ZDR orgs, so calls must go through a backend proxy.
  - Claude Platform on AWS follows the same policy, with ZDR on request.
  - — [Claude Platform Docs](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)
- The Commercial Terms (effective June 17, 2025) state Anthropic "may not train models on Customer Content from Services." Trust & Safety classifier results can be retained even under ZDR. — [Voibe (secondary)](https://www.getvoibe.com/resources/claude-api-data-retention/) (quote not verified against anthropic.com/legal/commercial-terms directly)
- Competitor comparisons:
  - TrackMyOPT uses Google Gemini for resume and document features on explicit opt-in. — [TrackMyOPT Privacy](https://www.trackmyopt.com/privacy)
  - VisaBuddy uses "Groq + Llama 3.3" with CFR citations. — [VisaBuddy](https://www.visabuddyapp.com/)

### Inferences
- Duly should list Anthropic as a service provider/processor in its privacy policy. It should either request ZDR (and avoid Covered Models) or disclose "up to 30 days, longer if flagged for safety review."
- Duly should minimize what goes to the LLM: send derived facts (dates, statuses) rather than raw document images or full SEVIS IDs and passport numbers, and redact identifiers before the prompt.
- Avoid saying "your data never leaves your device" if narration sends any record content to Claude (see A5).

### Gaps
- I did not fetch Anthropic's Commercial Terms page directly.
- The docs-vs-privacy-center difference on default retention is unresolved.

## A5. FTC Section 5 enforcement on privacy and security promises

### Takeaway
The FTC treats privacy and security marketing claims as binding. Health apps (Flo, BetterHelp, Premom) were penalized for sharing with ad and analytics SDKs despite privacy promises. Zoom was penalized for overstating encryption. Avast was penalized for selling "anonymized" data that could be re-identified. Every "local-first," "encrypted" or "we never share" claim Duly makes must be literally true for all data flows, including the LLM and analytics.

### Cited Findings
- **Flo Health (2021):** despite promising privacy, Flo shared health data with Facebook, Google, AppsFlyer and Flurry analytics. The order requires affirmative consent before sharing, an independent privacy review, user notice, and instructing third parties to destroy the data. — [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2021/06/ftc-finalizes-order-flo-health-fertility-tracking-app-shared-sensitive-health-data-facebook-google); in 2025 private litigation, Flo and Google agreed to pay $56M — [Malwarebytes](https://www.malwarebytes.com/blog/news/2025/09/google-and-flo-to-pay-56-million-after-misusing-users-health-data)
- **BetterHelp (2023):** shared health data with Facebook, Snapchat, Criteo and Pinterest despite promises. Result: a $7.8M payment, a ban on sharing health data for advertising, and affirmative express consent required before any third-party disclosure. — [EPIC](https://epic.org/ftc-fines-online-therapy-company-betterhelp-7-8-million-for-sharing-health-data/); [Arnold & Porter](https://www.arnoldporter.com/en/perspectives/blogs/enforcement-edge/2023/03/ftc-announces-betterhelp-fine)
- **Premom (Easy Healthcare, 2023):** permanently barred from sharing health data for advertising, and consent required for other sharing. — [Arnold & Porter](https://www.arnoldporter.com/en/perspectives/blogs/enforcement-edge/2023/06/ftc-settles-with-premom-app-developer)
- **Zoom (2020):** claimed "end-to-end, 256-bit encryption" while holding the keys and using weaker encryption, and said cloud recordings were encrypted when some sat unencrypted for up to 60 days. The order requires an end to misrepresentations, a security program, and biennial third-party assessments. — [FTC](https://www.ftc.gov/news-events/news/press-releases/2020/11/ftc-requires-zoom-enhance-its-security-practices-part-settlement); [FTC blog](https://www.ftc.gov/business-guidance/blog/2020/11/zooming-zooms-unfair-deceptive-security-practices-more-about-ftc-settlement)
- **Avast (2024):** claimed privacy protection while selling re-identifiable browsing data it said was "anonymized." Result: redress (payments to 103,152 consumers in Dec 2025) and a ban on selling browsing data for ads. — [FTC 2025 release](https://www.ftc.gov/news-events/news/press-releases/2025/12/ftc-sends-payments-consumers-impacted-avasts-deceptive-privacy-claims); [WilmerHale](https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law/20240909-ftcs-enforcement-action-against-avast-signals-increased-focus-on-consumer-web-data)
- **Kochava:** FTC action against a location data broker for selling identifiable sensitive data. — [Yale J. on Reg.](https://www.yalejreg.com/nc/ftcs-kochava-settlement-advances-data-privacy-enforcement-but-leaves-critical-gaps-in-protecting-consumers/)

### Inferences
- Claims to avoid unless literally true: "end-to-end encrypted" (only if Duly never holds keys), "never leaves your device" (false if documents or extracted text go to Claude or AWS), "anonymized."
- Safer phrasing: "Documents are stored encrypted on your device. When you ask a question, only the relevant excerpts are sent to our AI provider (Anthropic), which does not train on them and deletes them within [X] days."
- Mobile analytics and crash SDKs (Firebase, Mixpanel, etc.) are exactly what sank Flo and BetterHelp. Audit every SDK and never send event names or properties that reveal status (e.g., "OPT_unemployment_day_85").

### Gaps
- I found no FTC action about immigration apps specifically, and none specifically about "local-first" claims.

## B. Competitor positioning, disclaimers, liability, AI caveats, privacy stances, incidents

### Takeaway
Every competitor disclaims legal advice ("not a law firm"), forces arbitration, and caps liability at fees paid or less (TrackMyOPT: $100). The paid form-prep players (CitizenPath, SimpleCitizen, Boundless) offer denial-refund guarantees; the trackers do not. AI features are caveated as "may be incorrect / not legal advice." None of the reviewed competitors markets local-first or end-to-end encryption. TrackMyOPT explicitly says its vault "is not end-to-end encryption," and Lawfully shares de-identified data with marketing partners. That leaves open ground for Duly on privacy and government-access posture. The DocketWise breach (116k immigration clients, 2025–26) shows what a centralized document store costs when it is breached.

### Positioning Matrix

| Product | Segment / offer | Pricing | Legal-advice disclaimer | Liability cap / disputes | AI features & caveat | Privacy / security stance |
|---|---|---|---|---|---|---|
| **TrackMyOPT** (closest direct competitor) | F-1 OPT/STEM OPT deadline trackers, 90-day unemployment clock, USCIS auto-checks, document vault, AI resume/ATS, H-1B sponsor DB | Free; Pro $49.99/yr ($4.17/mo); Dedicated $149.99/yr with one 60-min partner-attorney consult — [Pricing](https://www.trackmyopt.com/pricing) | "TrackMyOPT is not a law firm and does not provide legal or immigration advice"; directs users to their DSO and attorneys; "NO guarantees regarding the accuracy of date calculations or deadline estimates" — [Terms (v2026-08-26)](https://www.trackmyopt.com/terms) | Capped at **$100**; excludes "immigration consequences, denied applications, or visa issues"; 30-day informal negotiation, then AAA arbitration in SF — [Terms](https://www.trackmyopt.com/terms) | AI: "Output may be incorrect. You are responsible for reviewing all output before use"; Gemini used on opt-in — [Terms](https://www.trackmyopt.com/terms); [Privacy](https://www.trackmyopt.com/privacy) | AWS S3 + Supabase; vault passcode hashed but "not end-to-end encryption"; "We do not sell personal information for money"; shares with Stripe, Google, PostHog, Vercel; LE disclosure "if required by law, court order"; deletion within ~30 days — [Privacy (Sept 25, 2026)](https://www.trackmyopt.com/privacy) |
| **VisaBuddy** (visabuddyapp.com) | F-1/H-1B/NRI compliance: OPT unemployment, 5-month travel limit, tax reminders, doc storage, "compliance scoring," forum | Free; Premium $3.99/mo — [Site](https://www.visabuddyapp.com/) | "Not affiliated with USCIS or DHS"; "Always consult your DSO" — [Site](https://www.visabuddyapp.com/) | Not retrieved | AI assistant on Groq + Llama 3.3 "with CFR citations" — [Site](https://www.visabuddyapp.com/) | No encryption/local-storage claims on homepage. Note: the name collides with other "VisaBuddy" products (travel visa apps) — [Crunchbase](https://www.crunchbase.com/organization/visabuddy) |
| **Lawfully** | USCIS/NVC/DOL/EOIR case status tracker (2.5M+ users claimed), AI case-timeline predictions, attorney marketplace, Lawfully Pro for firms | Premium $11.99/mo — [App Store](https://apps.apple.com/ky/app/lawfully-case-tracker/id1435063223); [Pro](https://www.lawfully.com/pro) | "Lawfully is not a law firm. No information provided by Lawfully shall be construed as legal advice"; no attorney-client relationship or privilege — [ToS (Sept 21, 2026)](https://www.lawfully.com/terms-of-service) | Capped at amounts paid; privacy-violation liability capped at insurance coverage; AAA arbitration in NY County; NY law — [ToS](https://www.lawfully.com/terms-of-service) | "AI-powered case prediction" from "millions of real USCIS cases" marketed as "accurate timelines" — [App Store](https://apps.apple.com/ky/app/lawfully-case-tracker/id1435063223) | "We do not sell email addresses"; shares de-identified data with marketing and advertising partners; "will disclose… where required to do so by law or subpoena"; keeps anonymized case data after deletion — [Privacy (Sept 20, 2026)](https://www.lawfully.com/privacy-policy) |
| **Boundless** | Full-service family/marriage green card, citizenship; affiliated law firm (Boundless Legal LLC, Arizona) | Not retrieved (flat-fee packages) | Content "for informational purposes only and do not constitute legal advice"; not affiliated with USCIS/DOS — [Terms (Apr 25, 2026)](https://www.boundless.com/terms) | Capped at fees paid in the prior 6 months; JAMS arbitration, class waiver; Boundless pays arbitration costs for non-frivolous claims ≤$75k (per archive) — [Terms](https://www.boundless.com/terms); [2022 archive](https://www.boundless.com/terms-archive-july-2022/) | Not retrieved | Satisfaction guarantee — [Boundless](https://www.boundless.com/satisfaction-guarantee) |
| **CitizenPath** | DIY form prep (green card, citizenship, DACA) | Per-form fees (not retrieved) | "CitizenPath is not a law firm and may not perform services performed by an attorney"; does not review answers for legal sufficiency — [Terms](https://citizenpath.com/terms-use/) | Capped at amount paid (or $10,000 if no purchase); arbitration in LA County; document access expires after 1 year — [Terms (Dec 19, 2024)](https://citizenpath.com/terms-use/) | All-caps: tool responses "IS NOT AND SHOULD NOT BE RELIED UPON FOR LEGAL ADVICE" — [Terms](https://citizenpath.com/terms-use/) | Denial guarantee refunds CitizenPath fee *and* USCIS fees — [CitizenPath](https://citizenpath.com/safest-immigration/) |
| **SimpleCitizen** | Marriage/family green card, citizenship; network of independent attorneys | Service fee excludes USCIS fees — [Pricing](https://www.simplecitizen.com/pricing/) | "Not a law firm"; attorneys independent, not employees — [Site](https://www.simplecitizen.com/how-it-works/) | [Terms](https://www.simplecitizen.com/terms-and-conditions/) (cap not retrieved) | Not retrieved | 100% refund if denied due to SimpleCitizen error; some USCIS fee reimbursement up to $3,000; "cannot guarantee specific legal outcomes" — [Guarantee](https://www.simplecitizen.com/satisfaction-guarantee/) |
| **Interstride** (university-licensed) | Career platform for international students: visa-sponsor job search, H-1B Sponsorship Finder extension, "Visa Insights," CPT/OPT info; licensed by career centers (UConn, UW, Syracuse, Lehigh, Grinnell) | Institutional (B2B2C); free to students at partner schools — [Interstride](https://www.interstride.com/career-centers/); [UW](https://careers.uw.edu/blog/2026/01/21/interstride-visa-insights-tool/) | Not retrieved | Not retrieved | Not retrieved | Not retrieved |
| **Adjacent: DocketWise** (law-firm case management; *cautionary*) | Immigration law-firm SaaS (owned by 8am/MyCase) | — | — | Sued in Texas federal court over breach — [Law360](https://www.law360.com/articles/2467452/legal-tech-co-sued-over-immigration-software-breach) | — | Breached Oct 2025 via stolen credentials; repos with passport numbers, SSNs, medical and financial data for 116,666 immigration clients; notice delayed to Apr 3, 2026 — [State of Surveillance](https://stateofsurveillance.org/news/docketwise-immigration-data-breach-116000-records-2026/) (secondary; Law360 corroborates suit and 100k+ figure) |

### Cited Findings (additional)
- A community-built free tracker exists: "OPT/STEM OPT Unemployment Tracker." — [trackus.vercel.app](https://trackus.vercel.app/)
- TrackMyOPT's attorney consult is from "partnered licensed immigration attorneys," available after 7 continuous days and subject to conflict checks. — [TrackMyOPT Pricing](https://www.trackmyopt.com/pricing)

### Inferences (lessons for Duly)
1. **Disclaimer baseline is industry standard.** Use "not a law firm / not legal advice / no attorney-client relationship / not affiliated with USCIS, DHS, SEVP," and "verify with your DSO." Also add TrackMyOPT-style "no guarantee of date calculation accuracy." For AI narration, add "output may be incorrect; review against your documents and your DSO."
2. **Liability cap.** Peers cap at fees paid (Lawfully, CitizenPath), fees paid over 6 months (Boundless), or $100 (TrackMyOPT), and expressly exclude immigration consequences. They all use arbitration with class waivers (AAA or JAMS). Duly can match this, but enforceability against a wrong-deadline harm is uncertain; that is a question for the parallel liability research.
3. **Differentiation gap: privacy.** No competitor reviewed claims local-first or E2E storage, and TrackMyOPT disclaims E2E. Lawfully's "de-identified sharing with marketing partners" and "law or subpoena" disclosure standard are weaker. Duly's opportunity: (a) keys only on the device, (b) no ad/analytics SDKs, (c) a warrant-only LE policy with user notice and transparency reports, (d) a named AI processor with no-training and short or zero retention. Keep these claims narrow and true (see A5).
4. **Breach lesson (DocketWise).** Centralized stores of passports and SSNs attract class actions and notice obligations. Local-first documents limit Duly's breach blast radius, but the AWS case data still triggers state breach-notification laws (including Nevada NRS 603A). Encrypt it, apply least-privilege IAM, use MFA on all admin access (DocketWise was entered with stolen credentials), and plan notification in advance.
5. **AI caveat framing.** Lawfully markets "accurate" AI predictions, which invites FTC deceptiveness risk. VisaBuddy grounds its AI in CFR citations. Duly's narration should cite the specific regulation (e.g., 8 CFR 214.2(f)) and the user's own record, and should never predict outcomes.
6. **Pricing anchor.** Tracker market prices are low: VisaBuddy $3.99/mo, TrackMyOPT $49.99/yr, Lawfully $11.99/mo. University-licensed Interstride is free to students, so B2B2C through universities is a competing distribution channel.

### Gaps
- I did not retrieve SimpleCitizen's or VisaBuddy's liability caps, Boundless's AI features or pricing, or Interstride's terms and privacy.
- "opt-copilot" and "Passport Career": I found no reliable sources in this pass.
- App-store complaint themes and reviews were not systematically collected. Lawfully's Trustpilot page exists but was not analyzed — [Trustpilot](https://at.trustpilot.com/review/lawfully.com).
- I found no lawsuits, breaches or enforcement actions against Lawfully, Boundless, CitizenPath, SimpleCitizen, TrackMyOPT or VisaBuddy. The absence of results is not proof there are none.
