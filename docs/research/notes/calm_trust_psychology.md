# Calm Monitoring, Trust Design and Anxiety Psychology: A Pattern Library for Duly (F-1/OPT record-keeping)

Scope note: Researched Sept 2026. Evidence labels used throughout: **[Evidence]** = peer-reviewed study, regulator document, or company's own primary statement of fact; **[Company claim]** = marketing/help-center language (shows what they say, not that it works); **[Opinion]** = practitioner/blog view; **[Inference]** = my synthesis for Duly. Roughly 30 searches/fetches were run; several asked-for items could not be verified and are listed under Gaps.

## 1. Credit Karma's core loop, trust mechanics, and criticisms (incl. FTC 2022 order)

### Takeaway
Credit Karma's loop is: free score with no card required, then a score-first home, then plain-language factor breakdown labelled by impact (high/medium/low), then change alerts, then monetized recommendations. It builds trust by saying outright that it is free and how it makes money, and by reassuring people that checking won't hurt the score. Its biggest failure came from the monetization layer: the FTC found that "pre-approved" labels, picked by A/B testing because they drove more clicks, were false. Duly should copy the loop's clarity and never let an engagement or revenue metric change how a verdict is worded.

### Cited Findings
**Core loop / factors**
- **[Company claim]** Credit Karma groups credit factors by impact. High impact: credit card utilization, payment history, derogatory marks. Medium: age of credit history. Low: total accounts, hard inquiries. Each factor has a plain-language definition (e.g., utilization = balances ÷ limits, "most experts recommend… below 30 percent"). — [Credit Karma: What affects your credit scores](https://www.creditkarma.com/credit/i/what-affects-your-credit-scores); [Credit Karma: learn credit score factors](https://www.creditkarma.com/credit/i/learn-credit-score-factors)
- **[Company claim]** Checking your own score through Credit Karma is "a soft credit inquiry on your credit reports, which has no impact on your credit scores." This takes away a fear that would otherwise stop people from checking. — [Credit Karma Credit Score FAQs](https://www.creditkarma.com/about/credit-score-faqs)
- **[Company claim]** Credit Karma sends alerts when TransUnion/Equifax scores change. — [Credit Karma free credit score page](https://www.creditkarma.com/free-credit-score); [App Store listing](https://apps.apple.com/us/app/intuit-credit-karma/id519817714)
- **[Company claim]** It shows VantageScore 3.0 from TransUnion and Equifax. — [Credit Karma: VantageScore 3.0](https://www.creditkarma.com/credit/i/vantagescore-30)

**Trust mechanics**
- **[Company claim]** "Credit Karma will never ask you to pay to see your credit scores and reports." "When you sign up for the products we recommend, we typically receive compensation from the lender or bank." "We don't sell your information to unaffiliated third parties for their advertising or marketing lists." — [Credit Karma: Is Credit Karma a scam?](https://www.creditkarma.com/credit/i/is-credit-karma-a-scam)
- **[Company claim / pattern]** The page is literally titled "Is Credit Karma a scam?" It names the suspicion the user already has and answers it on the company's own site. The same page says "You can rest assured Credit Karma has your back" and "We recognize this is a sensitive matter." — [same](https://www.creditkarma.com/credit/i/is-credit-karma-a-scam)
- **[Evidence]** Intuit completed its acquisition of Credit Karma on Dec 3, 2020 (~$7.1B total: ~$3.4B cash plus stock/equity awards worth ~$4.7B). Credit Karma had over 110 million members in the US, Canada and UK. — [Intuit 8-K exhibit, SEC](https://www.sec.gov/Archives/edgar/data/896878/000119312520309090/d51747dex9901.htm)

**Criticisms: VantageScore vs FICO confusion**
- **[Company claim, i.e. Credit Karma's own disclosure]** "Your scores on Credit Karma might differ if other sources are using different scoring models, like FICO." Lenders "may weigh factors beyond credit scores." — [Credit Karma Credit Score FAQs](https://www.creditkarma.com/about/credit-score-faqs); [Credit Karma: VantageScore vs FICO](https://www.creditkarma.com/credit/i/vantagescore-vs-fico)
- **[Opinion, third-party]** Reviewers say most lenders use FICO, so the same credit file can produce different scores and the Credit Karma number may not match what a lender sees. — [Firstcard: Is Credit Karma accurate?](https://www.firstcard.app/learn/is-credit-karma-accurate)
- **[Opinion, third-party]** The business model is referral fees on products users apply for, with user data used to target those offers. — [WalletGrower review](https://walletgrower.com/credit-monitoring/reviews/credit-karma); [PersonalOne review](https://personalone.org/credit-karma-review/)

**FTC 2022 "pre-approved" dark pattern action**
- **[Evidence]** FTC announced Sept 1, 2022: from Feb 2018 to Apr 2021 Credit Karma told consumers they were "pre-approved" and had "90% odds" for offers they often did not qualify for. Applying led to hard inquiries that could hurt their scores. For some offers, nearly one-third of "pre-approved" applicants were denied. — [FTC press release, Sept 2022](https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-takes-action-stop-credit-karma-tricking-consumers-allegedly-false-pre-approved-credit-offers)
- **[Evidence]** Credit Karma's own A/B tests showed consumers clicked "pre-approved" offers more than offers saying they had "excellent" odds. The FTC treated the choice of the more effective but false wording as a dark pattern. — [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-takes-action-stop-credit-karma-tricking-consumers-allegedly-false-pre-approved-credit-offers)
- **[Evidence]** Order terms: stop false approval claims, pay $3M in consumer redress, and **keep records of behavioral research, user testing, A/B testing and related analytics**. Finalized Jan 2023. Later the FTC sent ~$2.5M to affected consumers. — [FTC final order release, Jan 2023](https://www.ftc.gov/news-events/news/press-releases/2023/01/ftc-finalizes-order-requiring-credit-karma-pay-3-million-halt-deceptive-pre-approved-claims); [CBS News](https://www.cbsnews.com/news/ftc-credit-karma-customers-pre-approved-credit-offers/)
- **[Evidence]** Samuel Levine (FTC Consumer Protection director): "Credit Karma's false claims of 'pre-approval' cost consumers time and subjected them to unnecessary credit checks. The FTC will continue its crackdown on digital dark patterns…" — [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-takes-action-stop-credit-karma-tricking-consumers-allegedly-false-pre-approved-credit-offers)

### Inferences
- **Copy:** score-first home becomes verdict-first home. Factors with impact labels become Duly's checklist items with impact levels. "Checking won't hurt your score" becomes a Duly equivalent such as "Looking here doesn't notify your school or USCIS; nothing you do in Duly is reported." Say so only if true. For anxious users the fear of looking is a barrier in its own right.
- **Copy:** a direct "How Duly makes money / Is Duly legit?" page that states the suspicion and answers it.
- **Avoid:** Credit Karma's liability came from the wording of a *status label* ("pre-approved"). Its outcome was uncertain, and the more certain-sounding wording won the A/B test. Duly's "Everything is in order" is the same kind of label. The order's record-keeping clause means regulators may ask to see the A/B tests behind that wording. Rule: never pick verdict wording by click-through or retention. Pick it by accuracy review and keep a record of why.
- **Avoid:** a VantageScore-vs-FICO style gap. If Duly's verdict is its own model of compliance and not the view of the DSO, SEVIS or USCIS, the user may learn that at a bad moment. Say who the verdict is from and what it isn't, on the verdict screen itself.

### Gaps
- Could not verify Credit Karma's in-app wording for score-change explanations, its score simulator UX, weekly check-in emails or gamification. No primary Credit Karma design/engineering blog posts on these turned up in the time available.
- No primary data on how many users misread VantageScore as their lender score.

## 2. Behavioral science: uncertainty, control, avoidance, relief, rewards, peak-end, goal gradient, framing, AI trust calibration

### Takeaway
Anxious users face two opposite risks. High intolerance of uncertainty drives compulsive checking and reassurance-seeking. The ostrich effect and information avoidance drive not looking when bad news is expected. A calm product should make looking cheap and safe, make the "all clear" state predictable, not a variable reward, and end each session on a resolved, actionable note. Framing effects are small, so accuracy matters more than clever loss framing.

### Cited Findings
- **[Evidence]** Intolerance of uncertainty (IU) is "the tendency to find uncertainty negative" and a transdiagnostic dimension across anxiety disorders. High-IU people appraise uncertain situations as threatening and may seek excessive information to reduce uncertainty. — [Bartoszek et al. 2022, Behaviour Research and Therapy (abstract)](https://www.sciencedirect.com/science/article/abs/pii/S0005796722000961); [PDF](https://www.bartoszek-laboratory.com/uploads/1/2/5/9/125920195/bartoszek_et_al._2022_-_intolerance_of_uncertainty_and_information-seeking_behavior.pdf); [Carleton: Into the unknown review](https://www.sciencedirect.com/science/article/pii/S0887618516300251)
- **[Evidence]** Ostrich effect: Karlsson, Loewenstein and Seppi found from Norwegian and Swedish account-lookup data that investors check portfolios more in rising markets and less in flat or falling ones ("put their heads in the sand"). — [SSRN: The 'Ostrich Effect'](https://ssrn.com/abstract=772125); [EurekAlert summary of Sicherman et al.](https://www.eurekalert.org/news-releases/763976); [Sicherman & Loewenstein et al., Financial Attention (PDF)](https://www.cmu.edu/dietrich/sds/docs/loewenstein/FinancialAttention.pdf)
- **[Evidence]** Counterpoint, the "meerkat effect": some investors monitor more after negative returns, depending on personality. So avoidance is not universal. — [Gherzi et al., JEBO, ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0167268114002145)
- **[Evidence]** Information avoidance review (Golman, Hagmann and Loewenstein, JEL 2017). Information can enter utility directly, so people avoid it "even when it is useful, free" (health, finance, politics). Avoidance has costly consequences. — [JEL PDF](https://www.cmu.edu/dietrich/sds/docs/golman/JEL%20Information%20Avoidance.pdf); [AEA](https://www.aeaweb.org/articles?id=10.1257%2Fjel.20151245)
- **[Evidence]** Peak-end rule (Kahneman et al. 1993). Most subjects chose to repeat a longer cold-water trial whose last 30s were slightly less painful. Memories of aversive episodes are driven mainly by the worst and final moments, and duration matters little. — [Psychological Science, SAGE](https://journals.sagepub.com/doi/10.1111/j.1467-9280.1993.tb00589.x)
- **[Evidence]** Goal gradient (Kivetz, Urminsky and Zheng 2006, JMR). Café customers bought coffee faster as they neared the reward. A 12-stamp card with 2 stamps pre-filled was finished faster than a 10-stamp card, even though both needed 10 purchases ("illusionary goal progress"). — [SAGE](https://journals.sagepub.com/doi/abs/10.1509/jmkr.43.1.39); [PDF](https://home.uchicago.edu/ourminsky/Goal-Gradient_Illusionary_Goal_Progress.pdf)
- **[Evidence]** Framing meta-analyses (O'Keefe and Jensen). For *prevention* behaviors, gain framing is slightly more persuasive, but the effect is tiny (r ≈ .03, 93 studies, N=21,656) and driven mostly by dental hygiene. For *detection* behaviors, loss framing is slightly more persuasive (53 studies, N=9,145), and significant only for breast-cancer detection. — [J Health Commun 2007](https://www.tandfonline.com/doi/abs/10.1080/10810730701615198); [J Communication 2009](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1460-2466.2009.01417.x)
- **[Evidence]** AI trust calibration. Showing confidence and explanations can help calibrate trust. Miscalibrated confidence (over or under) harms reliance and decision quality. — [Zhang, Liao & Bellamy 2020, arXiv](https://arxiv.org/pdf/2001.02114); [Li et al. 2024, Miscalibrated AI confidence, arXiv](https://arxiv.org/pdf/2402.07632); [Okamura & Yamada, Adaptive trust calibration, PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7034851/)
- **[Opinion]** NN/g's Page Laubheimer: "Establishing trust with users requires acknowledging AI's limits and fallibility." A secondary article also claims "63% of users are more likely to rely on AI systems that display confidence levels (NN/g 2024)". **I could not trace that statistic to an NN/g primary source; treat it as unverified.** — [UXmatters, Nov 2025](https://www.uxmatters.com/mt/archives/2025/11/the-design-psychology-of-trust-in-ai-crafting-experiences-users-believe-in.php)

### Inferences
- **Both failure modes at once:** some F-1 users will open Duly compulsively (high IU) and some will avoid it after bad news (ostrich). Design for both. (a) The all-clear state should be stable and boring: same wording, clear "last checked" time, and "nothing new since Tuesday", so a check is short and doesn't invite digging. (b) Bad news should arrive with the next action and time estimate attached ("one thing needs you, about 10 minutes, due Oct 14"), which lowers the cost of looking.
- **Relief as reward, done honestly:** closing a checklist item and seeing the verdict go back to "in order" is a real reward. The *timing* of that relief must never be varied for engagement (no slot-machine refresh, no "pull to check again" animation that sometimes shows new updates). Predictable beats variable for an anxious audience. This is inference; no study on variable rewards in anxious users was found.
- **Peak-end:** the "peak" of a Duly session is usually the worst item. Make the *end* a clear resolved state or a scheduled next step ("We'll remind you Oct 10"). End the weekly brief email on "what's settled" or "what's next", not on the scariest update.
- **Goal gradient:** progress bars on OPT/STEM-OPT checklists help. Do **not** fake progress with pre-filled steps; for a compliance product that would be deceptive.
- **Framing:** evidence for loss framing is weak and context-specific, so fear framing ("You could lose your status") buys little and costs trust. Use neutral, consequence-accurate language.

### Gaps
- No primary study found on variable vs predictable rewards in anxiety or reassurance contexts. The Eyal "Hooked" variable-reward model is practitioner opinion and was not fetched.
- No direct research found on "sense of control" interventions in compliance apps.

## 3. Calm technology, Apple HIG / Rams, and calm-monitoring product examples

### Takeaway
Calm tech (Weiser and Brown 1995; Amber Case's 8 principles) says to inform without demanding attention, give definitive "it's working" signals, and use the minimum technology needed. Google Security Checkup, 1Password Watchtower and Oura each show a summarized status with drill-down contributors and an action path. Oura's "Pay attention" label is a good model for non-alarming wording.

### Cited Findings
- **[Evidence/historical]** "Calm technology" first appeared in Weiser and Brown's 1995 "Designing Calm Technology" (Xerox PARC). Calm tech "informs but doesn't demand our focus or attention" and moves between the center and the periphery of attention. — [Wikipedia: Calm technology (secondary)](https://en.wikipedia.org/wiki/Calm_technology); [calmtech.com papers list](https://calmtech.com/papers)
- **[Opinion/design principles]** Amber Case's 8 principles: (1) require the smallest possible amount of attention; (2) inform and create calm, i.e. give definitive information so users know systems are working; (3) use the periphery; (4) amplify the best of technology and humanity; (5) communicate without needing to speak; (6) work even when it fails; (7) the minimum technology needed to solve the problem; (8) respect social norms. — [O'Reilly, Amber Case](https://www.oreilly.com/content/principles-calm-technology-we-are-not-bad-at-technology-technology-is-bad-at-us/)
- **[Company guidance]** Apple HIG's long-standing principles: Clarity, Deference (the UI shouldn't compete with the content) and Depth. Note: secondary sources describe the 2025 "Liquid Glass" HIG update as reframing around Hierarchy, Harmony and Consistency. Confirm against the live HIG before quoting. — [Netguru summary](https://www.netguru.com/blog/ios-human-interface-guidelines); [Create with Swift on Liquid Glass](https://www.createwithswift.com/liquid-glass-redefining-design-through-hierarchy-harmony-and-consistency/)
- **[Company claim]** Google Security Checkup shows a green shield with a check when there are no recommended actions, and a yellow or red exclamation depending on how many items need attention. If "Recommended actions" doesn't appear, "Google doesn't have any security recommendations for you." That phrasing scopes the claim to Google's recommendations and doesn't claim the account is safe. — [Google Account Help](https://support.google.com/accounts/answer/46526?hl=en); [Whistleout walkthrough](https://www.whistleout.com/CellPhones/Guides/how-to-run-google-security-checkup)
- **[Company claim]** 1Password Watchtower gives a score summarizing overall security. It flags breaches, weak or reused passwords, unsecured HTTP sites, missing 2FA and items "expiring soon". Fixing flagged items raises the score. — [1Password Support: Watchtower](https://support.1password.com/watchtower/); [1Password blog](https://1password.com/blog/improve-watchtower-score-1password)
- **[Evidence of user friction]** Users report confusion when Watchtower scores differ across devices or don't rise after improvements. An opaque formula undermines trust in a score. — [1Password Community: differing scores](https://1password.community/discussion/141266/differing-watchtower-scores); [1Password Community: score not increased](https://www.1password.community/discussions/1password/watchtower-score-not-increased-by-mfa-passkeys-or-better-passwords/18185)
- **[Company claim]** Oura's Readiness Score uses nine contributors and four tiers: **Optimal, Good, Fair, Pay attention**. Contributors marked "pay attention" (red bar) are "areas for potential improvement". Long-term "balance" contributors stress trends over single days. — [Oura Support: Readiness Score](https://support.ouraring.com/hc/en-us/articles/360025589793-Readiness-Score); [Oura Support: Readiness Contributors](https://support.ouraring.com/hc/en-us/articles/360057791533-Readiness-Contributors); [Oura blog](https://ouraring.com/blog/readiness-score/)
- **[Opinion]** Readiness scores across vendors don't publish their formulas. — [Sahha blog](https://sahha.ai/blog/how-readiness-scores-are-calculated/)
- **[Company claim]** TurboTax pairs its progress UX with a written, bounded guarantee. If you pay IRS/state penalty or interest *because of a TurboTax calculation error*, TurboTax pays it. There is also audit support and a max-refund guarantee, with "limitations apply" and a claims process. The guarantee is scoped to Intuit's own errors, not the user's inputs. — [TurboTax Guarantees](https://turbotax.intuit.com/corp/guarantees/); [Claims help article](https://ttlc.intuit.com/turbotax-support/en-us/help-article/intuit-account-billing/submit-claim-turbotax-100-accurate-calculation-100/L88SYklBL_US_en_US)

### Inferences
- **Verdict = Security Checkup / Oura pattern:** one summary state, three tiers at most (e.g., "In order" / "One thing needs you" / "Talk to your DSO"), a drill-down to contributors, and an action per contributor. Oura's "Pay attention" is a good model for tone: urgent but not alarming.
- **Scope the green state the way Google does:** "No open items from what you've given us" and not "You're compliant". This is Google's "no recommendations for you" move.
- **Avoid Watchtower's opacity:** if Duly shows an impact score on updates, publish the rubric (what makes something High vs Low impact) and make scores deterministic, so identical inputs never show different numbers.
- **TurboTax lesson:** Intuit makes reassurance believable by writing down exactly what is guaranteed and what isn't. Duly probably can't guarantee legal outcomes, but it can guarantee things it controls ("If we show a wrong date from a document you uploaded, tell us and we'll fix it within X"). That is inference and needs legal review.
- **Calm principle 6 (work when it fails):** if Duly's data sync or rule updates fail, the verdict must degrade to "Not checked since [date]", never stay green.

### Gaps
- Did not fetch primary material on Apple Health, Monzo, Mint (discontinued 2024 per general knowledge, not verified here), Headspace or Copilot Money. No concrete citable patterns for them.
- Dieter Rams' ten principles weren't fetched; "as little design as possible" is widely known but has no URL in these notes.

## 4. Honest verdict and score design under uncertainty (confidence, sources, timestamps, abstention, avoiding implied guarantees)

### Takeaway
The best precedent is FDA-cleared consumer health features. Apple's irregular rhythm notification says outright that notifications are potential findings, not a diagnosis, and that no notification does not mean no disease. The FDA's own review names the risk that users will read the output as permission to ignore symptoms. Duly's "Everything is in order" carries the same false-reassurance risk and needs the same kind of wording.

### Cited Findings
- **[Evidence, regulator]** FDA De Novo review of Apple's Irregular Rhythm Notification names a "probable risk of users misinterpreting the device output and using it to disregard acute symptoms" or as "permission to avoid compliance with an existing prescribed treatment". Labeling says the feature is not a replacement for diagnosis, is not meant to notify on every AFib episode, and **"the absence of a notification is not intended to indicate no disease process is present."** — [FDA DEN180042](https://www.accessdata.fda.gov/cdrh_docs/reviews/DEN180042.pdf); [Apple Support: Heart health notifications](https://support.apple.com/en-us/120276); [Apple IRN Instructions for Use](https://www.apple.com/legal/irregular-rhythm-notification/index.html) (Apple IFU page failed to load in my fetch; wording taken from FDA review and search summaries)
- **[Evidence]** A physician survey on Apple Watch irregular-rhythm alerts shows downstream clinical uncertainty about how to act on consumer alerts. — [Am Heart J / ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0002870323000959); [medRxiv](https://www.medrxiv.org/content/10.1101/2022.08.02.22278237.full.pdf)
- **[Company claim]** Credit Karma's hedging is stated plainly on the page: scores "might differ" from FICO, and lenders use other factors. — [Credit Karma FAQs](https://www.creditkarma.com/about/credit-score-faqs)
- **[Company claim]** Google scopes its green state to "no security recommendations for you". — [Google Account Help](https://support.google.com/accounts/answer/46526?hl=en)
- **[Evidence]** The r/f1visa study recommends "outdated" content labeling and expert verification badges, because outdated and conflicting answers were major unmet needs. — [Youm et al. 2026, PLOS One / PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12885376/)
- **[Evidence]** Miscalibrated displayed confidence hurts decisions, so confidence shown must match real reliability. — [arXiv 2402.07632](https://arxiv.org/pdf/2402.07632)

### Inferences (concrete verdict spec for Duly)
- **Verdict copy:** "Everything we track is in order" or "No open items from what you've shared". Avoid "You're in status", "You're compliant", "All clear" and a bare green check with no qualifier. Put a one-line scope under it: "Based on 7 documents you added and rules checked Sept 26. Duly isn't your DSO or a lawyer."
- **Absence ≠ safety line (Apple IRN pattern):** somewhere permanent (verdict info sheet, onboarding) say: "No alert from Duly doesn't mean nothing is wrong. Duly only sees what you've added."
- **Abstention tier:** a fourth state when inputs are missing or stale: "Can't say yet: we need your EAD card" or "Not checked since Aug 30." Never fall back to green.
- **Timestamps everywhere:** "Rules last checked [date]" and "Your records last updated [date]" per item. Label updates older than N days "may be outdated" (as the r/f1visa study recommends).
- **Impact score on updates:** a High / Medium / Low label (Credit Karma pattern) with a published rubric. Add "applies to you because…" with the specific field (e.g., "you're on STEM OPT"). Cite the primary source (USCIS, ICE SEVP, Federal Register) on every update. A "confidence" note should appear only when it is backed by real calibration.
- **Never optimize the verdict wording by engagement A/B tests** (FTC Credit Karma lesson). Keep a documented accuracy rationale.

### Gaps
- No case law or regulator guidance found specifically on consumer compliance or immigration apps whose "all clear" UI was treated as legal assurance. Liability analysis belongs to the legal research track.
- Didn't obtain Apple Health or other health apps' exact in-app verdict copy beyond the IRN labeling.

## 5. International student (F-1/OPT) anxiety and information-seeking

### Takeaway
International students report more anxiety than domestic students, and immigration and finances are among their distinct stressors. In 2025–26 OPT processing pauses for nationals of 40 countries made uncertainty much worse. Students lean on Reddit, where about 20% of questions go unanswered and answers are often conflicting or outdated. Duly's value is exactly the gap in trustworthy, current, personalized information.

### Cited Findings
- **[Evidence]** International student status is significantly associated with higher perceived stress about finances and the health of loved ones (Amsterdam cross-sectional study). — [Anxiety, Stress & Coping, T&F 2023](https://www.tandfonline.com/doi/full/10.1080/10615806.2023.2280701)
- **[Evidence]** Exploratory study: international students have study anxiety, and supportive student-professor relationships help reduce stress. — [ERIC EJ1148750](https://files.eric.ed.gov/fulltext/EJ1148750.pdf)
- **[Evidence]** Youm et al. (2026, PLOS One) analyzed 8,006 posts and 33,981 comments on r/f1visa (Aug 2015–Dec 2022). Pre-COVID topics centered on EAD/OPT and employment. About 20% of questions went unanswered, and about 24% involved repeat posts with no replies. Recurring-question posts rose from 12% to 27% during COVID. Unmet needs fell into three types: no response, inaccurate or conflicting info, and outdated content. Language shifted from "thank you" to "still" and "need" in unresolved cases. Recommendations: curated FAQs, expert verification badges, "outdated" labels, personalized reminders. — [PMC full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC12885376/); [PLOS One](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0341314)
- **[Evidence, news]** Inside Higher Ed (Apr 27, 2026): the administration paused OPT processing for people from 40 countries and territories on the travel-ban list (e.g., Venezuela, Nigeria, Iran). Four months in there was no guidance on resumption. Cato estimates about 2M petitions affected, about 1M of them work authorizations. About 30 lawsuits had been filed and 4 injunctions granted. Students called it "very cruel". — [Inside Higher Ed](https://www.insidehighered.com/news/global/international-students-us/2026/04/27/opt-application-pause-leaves-students-limbo)
- **[Evidence, news]** CNBC (May 2026): barriers growing for international students seeking US jobs, with ongoing immigration stress even after getting a job. — [CNBC](https://www.cnbc.com/2026/05/24/for-international-students-seeking-us-jobs-the-american-dream-is-collapsing.html)
- **[Evidence, secondary]** Newcomers seeking settlement info on Reddit want "trust" and "cultural affinity" in sources. — [Monteiro 2024, International Migration](https://onlinelibrary.wiley.com/doi/10.1111/imig.13261)
- **[Official]** DHS Study in the States sets out status-maintenance duties (a DSO is the official point of contact). — [Study in the States: Maintaining Status](https://studyinthestates.dhs.gov/students/maintaining-status)

### Inferences
- In 2026 the "one thing needs you" state may often be a policy change the user can't act on (e.g., a processing pause). Verdict design needs a state for "Nothing for you to do. Here's what we're watching", separate from "action needed". Otherwise every policy update turns the home screen red and teaches users to fear opening the app.
- Recurring unanswered Reddit questions ("still waiting on EAD") point to a timeline feature with expected processing ranges and a "what's normal" band. That turns open-ended waiting into bounded waiting, which speaks directly to intolerance of uncertainty.
- Always route to the DSO as the authority ("Ask your DSO: [pre-written question]"). This builds trust and limits liability.

### Gaps
- No peer-reviewed study found specifically on F-1 students' trust in DSOs vs peers, or on WhatsApp-group reliance. The Reddit study is the closest.
- No quantitative prevalence data on status-loss fear among OPT holders specifically.

## 6. Dark patterns to avoid (FTC report, confirmshaming, fake urgency, nagging, streak-loss)

### Takeaway
The FTC's 2022 staff report and its Credit Karma order show that dark patterns are an enforcement priority, including *misleading status and eligibility claims* and fake urgency. For an anxious immigrant audience, fear-based nudges (countdowns, streaks, shaming opt-outs) would be both unethical and legally risky.

### Cited Findings
- **[Evidence, regulator]** FTC "Bringing Dark Patterns to Light" staff report (Sept 2022, from an April 2021 workshop) names four common tactics: (1) misleading consumers and disguising ads (including countdown timers that suggest limited time); (2) making cancellation difficult (e.g., ABCmouse); (3) burying key terms and junk fees (e.g., LendingClub's "no hidden fees" with fees in tooltips); (4) tricking consumers into sharing data (e.g., Vizio defaults). — [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-report-shows-rise-sophisticated-dark-patterns-designed-trick-trap-consumers); [Report PDF](https://www.ftc.gov/system/files/ftc_gov/pdf/P214800+Dark+Patterns+Report+9.14.2022+-+FINAL.pdf)
- **[Evidence, regulator]** The Credit Karma order shows that eligibility or status labels chosen through A/B testing can themselves be a dark pattern. — [FTC](https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-takes-action-stop-credit-karma-tricking-consumers-allegedly-false-pre-approved-credit-offers)
- **[Evidence, secondary]** The FTC has continued dark-pattern enforcement (Amazon Prime cancellation, Publishers Clearing House, 2023). — [WilmerHale](https://www.wilmerhale.com/en/insights/client-alerts/20230814-ftc-targets-dark-patterns-in-actions-against-amazon-and-publishers-clearing-house); [CRS In Focus](https://www.congress.gov/crs_external_products/IF/HTML/IF12246.web.html)
- **[Opinion/definition]** Confirmshaming guilt-trips users into complying (e.g., "No, I hate saving money"), often in opt-out buttons. — [UX Magazine](https://uxmag.com/articles/dark-patterns-when-design-crosses-the-line); [Jakob Nielsen dark design catalog](https://jakobnielsenphd.substack.com/p/dark-design); [Confirmshaming thesis, DiVA](https://www.diva-portal.org/smash/get/diva2:1438076/FULLTEXT01.pdf)
- **[Evidence]** A crawl of 11K shopping sites found dark patterns (including fake urgency and scarcity) widespread. — [Mathur et al. 2019, arXiv](https://arxiv.org/pdf/1907.07032)
- **[Evidence]** Dark patterns are linked to user annoyance and lower brand trust. — [arXiv 2107.07893](https://arxiv.org/pdf/2107.07893)

### Inferences (Duly "never" list)
- No countdowns unless they are real regulatory deadlines computed from the user's own documents, each with its source.
- No streaks or "don't break your streak". Checking in isn't the goal; being in order is. Streak-loss rewards the compulsive checking that high-IU users already struggle with.
- No confirmshaming on unsubscribe or snooze ("No thanks, I'll risk my status").
- No escalating nag notifications. Set a cap (e.g., one reminder per item per week plus the deadline) and let users pick quiet hours and the digest frequency.
- No upsell placed inside a "needs you" state, and no paid tier framed as protection from status loss. That is the Credit Karma monetization-meets-status-label trap.
- No pre-checked data-sharing consents with schools or employers (FTC category 4).

### Gaps
- Didn't fetch primary research on streak mechanics' psychological harm (e.g., Duolingo). The streak recommendation is inference.
- Didn't fetch the specific NN/g article on confirmshaming (Moran and Flaherty 2017, per a secondary mention).
