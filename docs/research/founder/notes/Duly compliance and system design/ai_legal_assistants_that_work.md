# AI Legal Assistants That Demonstrably Work in Production (2024-2026): Reliability, Defensibility, and Lessons for Duly

## Key Question 1: Product profiles — how successful legal AI tools ground answers, prove accuracy, and design human-in-loop

### Takeaway
The tools that survive scrutiny all share one architecture: closed authoritative corpora + retrieval + a real citator (KeyCite/Shepard's) to verify every citation + heavy pre-release testing + explicit human-in-loop framing. None of them trust the base model's parametric knowledge for legal facts. Even so, independent evaluation (Stanford) found the "hallucination-free" marketing overstated, which is itself a lesson: third-party benchmarks, not vendor claims, became the trust currency by 2025.

### Cited Findings

**CoCounsel (Casetext / Thomson Reuters)**
- CoCounsel is grounded in Westlaw and Practical Law content rather than the open internet, because "The web is noisy" and general models cannot distinguish authoritative precedent from blog comments — [Thomson Reuters blog on CoCounsel guardrails](https://legal.thomsonreuters.com/blog/why-your-legal-ai-needs-more-than-the-open-web-a-look-inside-cocounsels-guardrails/)
- CoCounsel uses KeyCite citation checking to track whether cases have been overturned or criticized; the open web has "no reliable citator" — [Thomson Reuters](https://legal.thomsonreuters.com/blog/why-your-legal-ai-needs-more-than-the-open-web-a-look-inside-cocounsels-guardrails/)
- Testing regime: 1,500+ nightly tests per skill, manual attorney review before release, "law school-style exams" against expert-created standards; scope control: "We do not let CoCounsel do anything it has not been trained and tested on" — [Thomson Reuters](https://legal.thomsonreuters.com/blog/why-your-legal-ai-needs-more-than-the-open-web-a-look-inside-cocounsels-guardrails/)
- In the Feb 2025 Vals benchmark, CoCounsel 2.0 averaged 79.5% across four submitted tasks and won Document Summarization (77.2%) — [Artificial Lawyer on Vals report](https://www.artificiallawyer.com/2025/02/27/vals-publishes-results-of-first-legal-ai-benchmark-study/)

**Harvey**
- Harvey grounds outputs in 500+ verified sources including LexisNexis, EDGAR, and EUR-Lex, warning general tools "may produce plausible-sounding but fabricated citations" — [Harvey blog: How to choose legal AI](https://www.harvey.ai/blog/how-to-choose-best-legal-ai-platform)
- Human-in-loop is positioned as the defensibility mechanism, "the mechanism that makes AI-generated work defensible" — [Harvey blog](https://www.harvey.ai/blog/how-to-choose-best-legal-ai-platform)
- In the Feb 2025 Vals Legal AI Report, Harvey scored highest among AI tools on five of six tasks entered, beat the lawyer baseline on four, topping Document Q&A at 94.8% and Chronology Generation at 80.2% — [Artificial Lawyer](https://www.artificiallawyer.com/2025/02/27/vals-publishes-results-of-first-legal-ai-benchmark-study/)
- Security posture: SOC 2 Type II, ISO 27001, ISO 27701, ISO 42001, GDPR/CCPA; contractual no-training commitment ("We don't use inputs, outputs, or uploaded documents to train"); customer-set retention, in-region data residency (EU/CH/US/AU), ethical-wall sync, audit logs, third-party audits by Schellman, NCC Group, Bishop Fox — [Harvey security page](https://www.harvey.ai/security)

**Lexis+ AI / LexisNexis Protege**
- Marketed launch claim: "hallucination-free linked legal citations," with every citation checked against Shepard's for validation, grounded in "the world's largest repository" of exclusive LexisNexis legal content — [LexisNexis press release](https://www.lexisnexis.com/community/pressroom/b/news/posts/lexisnexis-launches-lexis-ai-a-generative-ai-solution-with-hallucination-free-linked-legal-citations)
- Privacy design: uploaded documents automatically purged after each session; users can delete prompt history; RELX Responsible AI Principles with human oversight — [LexisNexis press release](https://www.lexisnexis.com/community/pressroom/b/news/posts/lexisnexis-launches-lexis-ai-a-generative-ai-solution-with-hallucination-free-linked-legal-citations)
- The "hallucination-free" claim was directly contradicted by independent testing (see Key Question 3) — [Stanford RegLab](https://reglab.stanford.edu/publications/hallucination-free-assessing-the-reliability-of-leading-ai-legal-research-tools/)

**EvenUp (plaintiff-side demand letters — closest to consumer stakes)**
- Two-layer architecture: proprietary Piai model drafts, then a team of 100+ medical professionals, paralegals, adjusters, case managers, and lawyers "review, redraft, and refine" every output before delivery — [EvenUp blog](https://www.evenuplaw.com/blog/leveraging-ai-human-review-in-demand-letters-the-evenup-difference/)
- Explicit stance that "relying solely on large language models (LLMs) is not currently a dependable solution"; LLMs "often still struggle with data extraction and categorization" — [EvenUp](https://www.evenuplaw.com/blog/leveraging-ai-human-review-in-demand-letters-the-evenup-difference/)
- Quantified accuracy vs raw GPT-4: Piai 95% accuracy identifying medical charges vs GPT-4's 80%; frames the stakes as "$100K in lost claim value per attorney" across 100 cases — [EvenUp](https://www.evenuplaw.com/blog/leveraging-ai-human-review-in-demand-letters-the-evenup-difference/)

**Vals benchmark landscape (independent accuracy evidence)**
- Feb 2025 VLAIR: Harvey, CoCounsel 2.0, Vincent AI (vLex), Oliver (Vecflow) evaluated across seven tasks; lawyer baseline still won Redlining (79.7%) and EDGAR Research; conclusion: tools "have value... although there remains room for improvement" — [Artificial Lawyer](https://www.artificiallawyer.com/2025/02/27/vals-publishes-results-of-first-legal-ai-benchmark-study/); report page: [Vals AI](https://www.vals.ai/industry-reports/vlair-2-27-25)
- Oct 2025 Vals legal research benchmark: AI products (Counsel Stack 81%, Alexi 80%, ChatGPT 80%, Midpage 79%) all beat the lawyer baseline (71%) on accuracy across 210 questions; multi-jurisdictional questions dropped performance ~11 points; lawyers still won ~1/3 of categories needing "deep interpretive analysis" — [LawSites](https://www.lawnext.com/2025/10/vals-ais-latest-benchmark-finds-legal-and-general-ai-now-outperform-lawyers-in-legal-research-accuracy.html)
- Vendor participation is itself a signal: LexisNexis withdrew from the Feb 2025 study; vLex withdrew from the Oct 2025 one, saying it "was not designed for enterprise AI tools" — [Artificial Lawyer](https://www.artificiallawyer.com/2025/02/27/vals-publishes-results-of-first-legal-ai-benchmark-study/); [LawSites](https://www.lawnext.com/2025/10/vals-ais-latest-benchmark-finds-legal-and-general-ai-now-outperform-lawyers-in-legal-research-accuracy.html)

### Inferences
- Reliability in production legal AI = (a) retrieval restricted to an authoritative, versioned corpus, (b) deterministic citation verification against a citator database (not LLM self-check), (c) scope restriction (only shipped, tested "skills"), (d) regression-test suites run continuously, (e) human review at the point of consequence.
- By Oct 2025 raw ChatGPT matched specialized tools on generic legal research accuracy. This means the durable moat is NOT raw answer accuracy; it is verification infrastructure, personal-context grounding, workflow, and accountability, which is exactly the layer Duly must build.
- EvenUp is the best template for Duly's stakes profile: high-consequence documents for non-experts, solved with AI-draft + expert-review + quantified accuracy deltas vs raw GPT.

### Gaps
- Spellbook, Robin AI, Luminance, Ironclad AI, Legora, Eve, Solve Intelligence: I found no independent accuracy evaluations or detailed published reliability architectures within tool-call budget; search results were dominated by vendor marketing and third-party review blogs of uncertain quality (e.g., aiapps.com, vantaige.io), so I excluded them rather than cite weak sources. Their general pattern from reputable coverage: Spellbook = contract drafting inside Word (lawyer inherently reviews in-document); Legora = collaborative workspace built on Claude (Anthropic customer page exists: https://www.anthropic.com/customers/legora); Eve = plaintiff-firm case platform. Treat these characterizations as unverified.
- No published per-product refusal-behavior specifications were found for Harvey or Lexis+ AI beyond CoCounsel's "not trained and tested on" scope rule.

## Key Question 2: Anti-ChatGPT positioning and trust artifacts — and which matter to consumers

### Takeaway
The industry's answer to "why not just ChatGPT" is consistent across vendors: verified citations against a citator, closed authoritative corpora, matter/case context, no-training + retention guarantees, certifications, and audit logs. But most of these artifacts (SOC 2, ISO, VPC, DPAs) are enterprise procurement checkboxes; the consumer-legible equivalents are visible source links, human backstop, and money-backed guarantees (see TurboTax, Key Question 4).

### Cited Findings
- Harvey's stated buyer criteria: security certifications, "accuracy and source transparency," integrations, industry-specific depth over "generic features built for every industry" — [Harvey blog](https://www.harvey.ai/blog/how-to-choose-best-legal-ai-platform)
- Harvey trust artifacts shipped: SOC 2 Type II, ISO 27001/27701/42001, GDPR, CCPA, AIUC-1, SafeBase trust center, named third-party auditors — [Harvey security](https://www.harvey.ai/security); [Harvey Trust Center](https://trust.harvey.ai/)
- Thomson Reuters' anti-open-web case: no citator on the open web, no way to know a case was overruled, models "cannot reliably distinguish" expert sources from noise — [Thomson Reuters](https://legal.thomsonreuters.com/blog/why-your-legal-ai-needs-more-than-the-open-web-a-look-inside-cocounsels-guardrails/)
- LexisNexis anti-general-AI case: answers "grounded in" exclusive Lexis content, citations Shepard's-validated, session documents auto-purged — [LexisNexis press release](https://www.lexisnexis.com/community/pressroom/b/news/posts/lexisnexis-launches-lexis-ai-a-generative-ai-solution-with-hallucination-free-linked-legal-citations)
- EvenUp's anti-raw-LLM case is quantitative: 95% vs 80% on medical charge extraction, plus a 100+ expert human review layer GPT users don't get — [EvenUp](https://www.evenuplaw.com/blog/leveraging-ai-human-review-in-demand-letters-the-evenup-difference/)
- The strongest counterpoint: in Vals' Oct 2025 research benchmark, plain ChatGPT scored 80% accuracy, above the 71% lawyer baseline and within 1 point of the best legal-specific tool — [LawSites](https://www.lawnext.com/2025/10/vals-ais-latest-benchmark-finds-legal-and-general-ai-now-outperform-lawyers-in-legal-research-accuracy.html)

### Inferences
- Post-2025, "our model is smarter than ChatGPT" is a dead positioning. Surviving positioning is: "our system is verifiable, current, private, and accountable in ways a chat session is not."
- Enterprise trust artifacts consumers plausibly respond to (by analogy to TurboTax's consumer framing): a plain-language no-training/no-sharing promise, visible official-source citations (uscis.gov, federal register), deadline correctness guarantees, and a human/attorney escalation path. Artifacts consumers ignore: ISO numbers, VPC/BYOK, subprocessor lists. (Inference; no direct consumer-survey source found.)

### Gaps
- No study found that directly measures which trust artifacts consumers (vs enterprise buyers) respond to in legal AI; this remains an inference from the TurboTax analogy.

## Key Question 3: Failure contrast — what exactly broke (Stanford findings, DoNotPay, sanctions)

### Takeaway
Failures cluster into three types: (1) overclaiming reliability that independent testing disproved (Lexis/Westlaw "hallucination-free" vs Stanford's 17-33% hallucination rates), (2) marketing an AI as a substitute for a professional without any testing (DoNotPay, FTC order, $193K), and (3) users skipping verification (1,000+ US court decisions on fabricated citations). For a consumer app, all three are fatal patterns: never overclaim, never claim substitution, never let the user rely on an unverified output.

### Cited Findings
- Stanford RegLab/HAI (May 2024), first preregistered evaluation of legal RAG tools: Lexis+ AI, Westlaw AI-Assisted Research, and Ask Practical Law AI hallucinated in the 17-33% range despite marketing; authors "demonstrate that the providers' claims are overstated" — [Stanford RegLab](https://reglab.stanford.edu/publications/hallucination-free-assessing-the-reliability-of-leading-ai-legal-research-tools/); paper PDF: [Stanford](https://dho.stanford.edu/wp-content/uploads/Legal_RAG_Hallucinations.pdf); HAI summary: [Stanford HAI](https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-or-more-benchmarking-queries)
- FTC final order vs DoNotPay (finalized Feb 2025, 5-0 vote Jan 16, 2025): DoNotPay called itself "the world's first robot lawyer" but "did not conduct testing" to verify its AI operated at the level of a human lawyer, and never hired attorneys to assess quality; ordered to pay $193,000, notify 2021-2023 subscribers, and prohibited from lawyer-equivalence claims without substantiation — [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires); case page: [FTC](https://www.ftc.gov/legal-library/browse/cases-proceedings/donotpay)
- Sanctions record: Mata v. Avianca (S.D.N.Y. 2023) $5,000 for six fabricated ChatGPT cases; People v. Crabill (Colo. 2023) 1-year-and-a-day suspension; Wadsworth v. Walmart (D. Wyo., Feb 2025) $5,000 and pro hac vice revoked after 8 of 9 cited cases were fake (from the firm's own internal AI database, not ChatGPT); Whiting v. City of Athens (6th Cir., Mar 2026) $15,000 per attorney plus fees for ~two dozen fabricated citations; Nebraska Supreme Court (Apr 2026) indefinite suspension, 57 of 63 citations defective — [GC AI sanctions tracker](https://gc.ai/blog/ai-hallucination-legal-cases)
- Scale of the problem: Damien Charlotin's database tracked 1,400+ court decisions addressing AI errors over three years (~1,490 globally), now running ~350-400 decisions per quarter; warnings and education have had "limited results" because of misplaced trust and time pressure — [Scientific American](https://www.scientificamerican.com/article/why-lawyers-keep-citing-fake-cases-invented-by-ai/); US count "more than 1,000" as of May 2026 — [GC AI](https://gc.ai/blog/ai-hallucination-legal-cases)
- Vendor benchmark-dodging as a soft failure signal: LexisNexis and vLex each withdrew from a Vals benchmark round — [Artificial Lawyer](https://www.artificiallawyer.com/2025/02/27/vals-publishes-results-of-first-legal-ai-benchmark-study/); [LawSites](https://www.lawnext.com/2025/10/vals-ais-latest-benchmark-finds-legal-and-general-ai-now-outperform-lawyers-in-legal-research-accuracy.html)

### Inferences
- The FTC's DoNotPay theory is the exact regulatory template a consumer immigration app faces: the violation was not that the AI was bad, it was making performance claims without testing to substantiate them. Duly's marketing claims must each map to an internal eval it can produce.
- Wadsworth v. Walmart matters specially: the fabricated cases came from a firm's own AI tool, proving that "we built a specialized tool" is not a defense; only output-level verification is.
- Note a source tension: Stanford (2024) showed specialized tools still hallucinate 17-33%, while Vals (2025) showed strong accuracy. Different tasks, methods, and a year of progress; both are true, and together they argue for continuous independent eval rather than one-time claims.

### Gaps
- Butler Snow (Alabama) and the Noland California $10K sanction appear in coverage ([Maryland Daily Record](https://thedailyrecord.com/2025/10/13/california-lawyer-ai-fake-citations-fine/) headline confirms a $10K California appellate fine, Oct 2025) but I did not fetch full details; treat specifics beyond the fine amount as unverified.
- Stanford study's exact per-tool rates (Lexis vs Westlaw split: reported elsewhere as ~17% Lexis, ~33% Westlaw AI-AR) were returned by the fetch only as a 17-33% range; the paper PDF has the precise per-tool numbers.
- No case found of a legal AI *vendor* (other than DoNotPay) being sued or retracting a product over accuracy in 2024-2026.

## Key Question 4: Consumer-grade analogs — TurboTax's guarantee model

### Takeaway
TurboTax converts reliability into a consumer-legible promise by insuring a narrow, fully-deterministic slice: it pays IRS/state penalties and interest caused by its calculation errors, never the underlying tax owed. The structure (guarantee the deterministic layer, bound the payout, exclude the user's own liability, add human escalation tiers) is directly portable to an immigration compliance app.

### Cited Findings
- 100% Accurate Calculations Guarantee: "If you pay an IRS or state penalty or interest because of a TurboTax calculation error, we'll pay you the penalty and interest"; explicitly does NOT cover the additional tax itself; applies for seven years from filing — [TurboTax guarantees](https://turbotax.intuit.com/corp/guarantees/)
- Maximum Refund Guarantee: refunds the purchase price (or $30 for Free Edition) if another method yields a larger refund, and requires an amended return as proof — [TurboTax guarantees](https://turbotax.intuit.com/corp/guarantees/)
- Expert-Approved / Full Service tiers: penalties/interest from the human expert's mistakes are covered too, creating a paid human-in-loop tier with its own guarantee — [TurboTax guarantees](https://turbotax.intuit.com/corp/guarantees/)
- Audit Support Guarantee: one-on-one Q&A with a tax professional, informational only, "no IRS representation" — a bounded human backstop, not substitution for representation — [TurboTax guarantees](https://turbotax.intuit.com/corp/guarantees/)

### Inferences
- The guarantee works because calculations are deterministic and auditable; TurboTax never guarantees judgment (e.g., whether a deduction was wise). Duly's analog: guarantee the deterministic layer (deadline math from the user's I-20/I-94 dates, document checklists against current USCIS-published lists, unemployment-day counting for OPT), never guarantee legal outcomes or adjudication results.
- Every guarantee carries an evidence requirement (amended return, penalty notice), which both bounds fraud and forces the deterministic layer to be reconstructible, i.e., an audit log.

### Gaps
- Found no consumer legal AI product offering a TurboTax-style accuracy guarantee (DoNotPay marketed boldness, not a structured guarantee); this appears to be genuinely unoccupied ground.
- Intuit's internal AI-assist (Intuit Assist) reliability architecture: not researched within budget; no independent evaluation found.

## Key Question 5: Extrapolated principles for Duly (consumer immigration copilot, zero room for error)

### Takeaway
The transferable core is a verification-first architecture: answer only from a closed, dated corpus of official immigration sources; verify every citation and date deterministically outside the LLM; restrict scope to tested skill paths; log everything; and wrap the deterministic slice in a consumer-legible guarantee. Enterprise-only pieces (VPC, ethical walls, ISO 42001, procurement trust centers) can be skipped or reduced to one plain-language privacy promise.

### Cited Findings
(Principles below are synthesized from sources already cited in Questions 1-4; key anchors repeated.)
- Grounding on authoritative corpora + citator verification is the universal reliability pattern — [Thomson Reuters](https://legal.thomsonreuters.com/blog/why-your-legal-ai-needs-more-than-the-open-web-a-look-inside-cocounsels-guardrails/); [LexisNexis](https://www.lexisnexis.com/community/pressroom/b/news/posts/lexisnexis-launches-lexis-ai-a-generative-ai-solution-with-hallucination-free-linked-legal-citations); [Harvey](https://www.harvey.ai/blog/how-to-choose-best-legal-ai-platform)
- Scope restriction + continuous regression testing (1,500+ nightly tests/skill) is how CoCounsel bounds error — [Thomson Reuters](https://legal.thomsonreuters.com/blog/why-your-legal-ai-needs-more-than-the-open-web-a-look-inside-cocounsels-guardrails/)
- Even citator-backed tools hallucinated 17-33% in independent testing, so marketing must never say "hallucination-free" — [Stanford RegLab](https://reglab.stanford.edu/publications/hallucination-free-assessing-the-reliability-of-leading-ai-legal-research-tools/)
- Claims without substantiating tests draw FTC action in consumer AI ($193K, subscriber notice, claim ban) — [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires)
- AI-draft + expert human review with a quantified accuracy delta over raw GPT is the proven high-stakes consumer-document model — [EvenUp](https://www.evenuplaw.com/blog/leveraging-ai-human-review-in-demand-letters-the-evenup-difference/)
- Guarantee-the-deterministic-slice is the proven consumer trust mechanism — [TurboTax](https://turbotax.intuit.com/corp/guarantees/)

### Inferences (design principles for Duly)
1. **Closed corpus, dated and versioned.** Retrieval only over official sources (USCIS policy manual, Federal Register, 8 CFR, SEVP guidance, form instructions) with capture dates. Duly's citator-equivalent: a freshness/currency check per source (is this rule still in effect as of today), the immigration analog of KeyCite's "is this still good law."
2. **Deterministic layer outside the LLM.** Deadlines, grace periods, unemployment-day counters, filing windows computed by code from the user's parsed documents; the LLM explains, never calculates. This is the slice that can carry a TurboTax-style guarantee ("if a deadline we computed from your documents is wrong, we pay the fee/penalty" style, scoped and evidence-gated).
3. **Every answer cites and links; unverifiable claims are stripped or refused.** Post-generation citation verification against the corpus index, not LLM self-assessment. Vals shows raw ChatGPT ties specialized tools on generic accuracy, so verifiable citations plus personal case context are the actual "why not ChatGPT."
4. **Scope allowlist + refusal.** Ship named, tested "skills" (OPT timeline, H-1B cap-gap check, travel-signature reminder). Anything outside the tested set gets a refusal + escalation, CoCounsel's "not trained and tested on" rule.
5. **Human escalation tier, never substitution claims.** Market as a compliance record-keeper and preparedness tool with attorney referral/review tier (EvenUp/TurboTax Full Service pattern). Never claim lawyer-equivalence; that is the precise DoNotPay violation, aggravated in immigration by unauthorized-practice-of-law exposure.
6. **Evidence file for every claim.** Internal evals with published summaries; a claims-to-evals register so every marketing sentence is substantiable (FTC lesson). Third-party or published benchmark participation is a trust asset; dodging benchmarks reads badly.
7. **Audit log as product.** Duly's WorkBook record-keeping is the audit log; every AI answer stored with sources, corpus version, and the user-document fields it relied on, making outputs reconstructible (the guarantee's evidence requirement and the user's own defense artifact).
8. **Consumer trust artifacts, ranked:** visible official-source links > plain-language "your documents are never used for training, deleted on request" > accuracy guarantee on the deterministic slice > human escalation. Enterprise-only (skip for now): ISO 42001/27701, VPC/BYOK, ethical walls, SafeBase-style trust centers, subprocessor disclosures. SOC 2 Type II becomes worthwhile only when partnering with universities/DSOs (an enterprise-ish channel).
9. **Model choice note:** Legora is a published Anthropic/Claude customer ([Anthropic](https://www.anthropic.com/customers/legora)), so Claude-behind-a-verification-layer is an established legal-AI pattern; but the Stanford result shows the model matters less than the verification layer around it.

### Gaps
- No independent data on consumer willingness to pay for immigration AI vs free ChatGPT; the Vals lawyer-vs-AI accuracy parity result suggests pricing must rest on personalization, verification, and guarantees rather than answer quality.
- Unauthorized practice of law boundaries for consumer immigration tools (vs the FTC advertising angle) were out of scope here and not researched.
