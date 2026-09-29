# Compliance and legal facts the design is built around

Everything here was checked against sources in September 2026. Immigration rules change; re-verify before shipping copy that states a rule.

## OPT and STEM OPT employment

- SEVP treats 20 or more hours a week as full-time employment on post-completion OPT. Unpaid work counts if it does not violate labor law and the student can show at least 20 hours a week.
- Unemployment limit: 90 days on post-completion OPT; 150 total with the STEM extension. Unreported employment does not count, however real.
- Employment must be directly related to the degree. DSOs may ask for a written narrative connecting duties to coursework. That is why WorkBook maps each duty to courses.
- SEVP's own list of what to keep per job: position held, proof of duration, job title, supervisor contact, description of the work.
- Self-employed business owner (post-completion OPT): allowed. Must have proper business licenses and be actively engaged in a business related to the degree. Universities also suggest keeping the EIN, incorporation documents, and a business bank account. Pre-revenue is fine with evidence of active development.
- STEM OPT: requires a bona fide employer-employee relationship, an E-Verify employer, paid work, and a supervisor who signs the I-983 training plan. The student cannot sign both sides. Self-employment, 1099, and unpaid roles do not qualify. Founders can qualify only through a real third-party supervisor and a structure where the student's ownership does not undermine the relationship.
- CPT: authorized by the school for a specific employer and dates; rules vary by school.

Sources: ICE SEVP Policy Guidance 1004-03; Harvard HIO OPT types of employment; Temple ISSS OPT and unemployment; UNC Charlotte STEM OPT FAQ; Malescu Law and Pandev Law on self-employed OPT; Immiva STEM OPT employer requirements.

## Enforcement and timing

- May 2025: SEVP sent OPT students with no employer reported in SEVIS a "Notice of Failure to Report OPT Employer and Exceeding Permissible Period of Unemployment" with 15 days to fix the record before termination (reported by NAFSA, Inside Higher Ed, university ISSS offices).
- August 5, 2026: USCIS Policy Alert PA-2026-05, "Evidence, Requests for Evidence, and Notices of Intent to Deny." A deficient filing may be denied without an RFE; RFE response periods may be shorter than 84 days.
- July 17, 2026: DHS final rule replacing duration of status with fixed admission periods, effective September 15, 2026. Grace period after OPT drops from 60 to 30 days. An EAD does not extend the admit-until date.
- OPT reform: DHS regulatory agenda entry RIN 1653-AA97; details now expected February 2027. A separate OPT fee proposal cleared OMB review in September 2026.
- USCIS uses automated tools that tag evidence and flag inconsistencies in names, titles, and dates across documents; PDFs with hidden text layers have been misread. WorkBook's consistency check and clean PDF output exist for this.

Sources: NAFSA; Inside Higher Ed (May 16, 2025); Day1CPT on PA-2026-05; Zneimer and Zneimer on the fixed-period final rule; ICEF Monitor on the 2026 regulatory agenda; Cozen O'Connor on AI in USCIS adjudications.

## RFE response structure

Order: RFE notice (all pages) on top, cover letter, one-page exhibit index, numbered exhibits in the order of the requests, continuous page numbers throughout. Full certified translations for anything not in English. Send once, complete; a partial response can be decided on the record as it stands (8 CFR 103.2(b)(11)). If a document is unavailable, explain what was sought and why it cannot be provided.

Source: Headman Law, "How to structure an RFE response packet."

## Misrepresentation and AI

- 8 USC 1182(a)(6)(C)(i): any alien who by fraud or willfully misrepresenting a material fact seeks to procure a visa, documentation, admission, or other benefit is inadmissible. It is permanent.
- There is no current rule requiring disclosure of AI use in a filing. The risk is content: hallucinated facts, inflated roles, and generic text that adjudicators recognize. WorkBook's rule: AI restates only events it can cite, never adds facts, never writes argument, and stays marked.
- The wider legal environment is tightening: a 2026 lawsuit alleges ChatGPT engaged in the unlicensed practice of law; New York SB 7263 would create liability for chatbot operators giving substantive professional advice. Duly's assistant must organize and cite, never advise.

Sources: Cornell LII 8 USC 1182; Law Firm 4 Immigrants on AI-generated evidence; Barnes and Thornburg on the UPL lawsuit; Holland and Knight on SB 7263.

## Privacy constraints on sources

- Gmail `gmail.metadata` and `gmail.readonly` are Google restricted scopes: verification plus an annual security assessment for any app that can access the data through a server. Excluded from v1.
- Recall-style always-on screen capture is the wrong model: Microsoft's Recall stored plaintext at first, and even after the 2025 redesign researchers extracted decrypted data from the display process. WorkBook captures nothing from the screen.

Sources: Google Workspace Gmail API scopes; Google restricted scope verification; CSO Online and GovInfoSecurity on Recall.

## Prior art

- ActivityWatch (MPL-2.0): local server plus small watcher programs, event buckets, heartbeat API. Good model for the collector.
- screenpipe: event-driven capture with accessibility tree first, OCR fallback; check its license before reuse. Not used for capture, but its local-first storage and MCP exposure are worth studying.
- OpenTimestamps: free Bitcoin-anchored timestamp proofs; RFC 3161 is the PKI alternative with certificate expiry issues.
