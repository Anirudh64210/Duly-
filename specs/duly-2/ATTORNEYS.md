# Duly attorney network: what is legal, what it earns, how to start

Status: research for the founder and for counsel, 2026-10-01. **Not legal advice.** BACKLOG B10. Builds on business/attorney-legal.md (the rules, quoted), business/attorney-market.md (fees, volumes, platforms) and PRICING.md (the v4 plan). Every number in sections 3 and 4 comes from the **ATTORNEY NETWORK LINE** block at the end of business/pricing_model.py (run `python3 specs/duly-2/business/pricing_model.py`). **(est.)** marks an estimate made here. **(unverified)** marks something no fetched source confirmed. Web search was used up in the research pass, so sources were reached by direct URL; the ABA site refused every fetch, and the Model Rule wording comes from state adoptions.

---

## 1. The answer on one page

1. **Discounted access: yes.** A firm may set a lower price for Duly students and Duly may show it. The firm sets it, it must be off a real regular price (16 CFR 233.1), and the firm must honour it.
2. **A cut of the fee: no.** Taking a percentage, or any fee per matter, from independent lawyers' fees is fee sharing (Rule 5.4(a)) and paying for a recommendation (Rule 7.2(b)) in all six states checked (CA, NY, TX, FL, IL, NJ). Every Avvo opinion (2016 to 2017) struck down this exact model, even when it was called a "marketing fee". In California any person can now sue for $5,000 to $100,000 per violation; in Texas it can be the crime of barratry.
3. **Firms paying to stay on Duly: yes, as a flat listing fee.** Same fee for every firm in a tier, not tied to leads, clients or fees; the student searches and chooses; Duly never ranks, vouches for, or matches a lawyer to the student's case.
4. **The money is real, and a flat listing captures most of it legally (est.).** If 1.5% of Duly students hire a lawyer through Duly each year and firms pay half of what a client costs them elsewhere ($749), a flat listing earns about **$4.7k a month at 10k students and $47k at 100k**. That is more than Plus and schools together ($0.5k and $16k). A 15% cut of the same fees would have earned about $7.5k and $75k, so the legal route gives up about a third of that, and nothing if firms pay the full $749 a client.
5. **With option A, break-even moves from 117k to 180k students (cash) to about 19k to 21k (est.)**, and paid help is covered from about 36k to 41k instead of 268k to 595k. This is the largest single change in the whole pricing model.
6. **The weak point is one number nobody publishes:** the share of F-1, OPT and STEM OPT students who hire a lawyer in a year. At 0.5% the listing line barely covers itself at 10k students; at 3% it carries the company. Measure it before building (section 5).
7. **The two other routes are worse for now.** A legal service plan (B) loses money at every scale modelled, because plan counsel and administration outweigh a small membership. An Arizona law firm owned by Duly (C) earns well at 100k students but loses about $27k a month at 10k, costs $150k to $300k before its first client, and turns Duly into a law-firm owner, which reverses BOUNDARY.
8. **Recommendation: build A, after counsel, from about 10k students.** Keep C as a separate study for later. Drop the fee cut from the plan.
9. **Founder decision first.** BOUNDARY says "no paid referrals" and VALUE-2 lists referrals under "Still no". A flat, labelled, paid directory needs both changed.

---

## 2. What is legal and what is not

| What | Status (counsel to confirm) | Key rule text | Source |
|---|---|---|---|
| Percentage of an independent lawyer's fee | **Not allowed** | "A lawyer or law firm shall not share legal fees with a nonlawyer" (Rule 5.4(a)) | Illinois Rule 5.4, https://www.illinoiscourts.gov/resources/890bf990-662c-47b4-ab8d-d962d09ee740/file |
| Same, Florida | **Not allowed** | "A fee calculated as a percentage of the fee received by a lawyer ... would be an improper division of fees" (Rule 4-7.22 comment) | https://www-media.floridabar.org/uploads/2026/10/2027_04-OCT-Chapter-4-RRTFB.pdf |
| Same, Illinois (the most open state) | **Not allowed** | charges must be "not calculated as a percentage of the lawyer's anticipated or actual legal fees" (7.2(c)(8)(ii)) | https://www.illinoiscourts.gov/resources/39c73f58-b094-4603-84a9-a590a1f17b97/file |
| Per-service "marketing fee" (Avvo) | **Not allowed** | "an improper payment for a recommendation in violation of Rule 7.2(a)" (NYSBA Op. 1132, 2017) | https://nysba.org/ethics-opinion-1132/ |
| Same, New Jersey | **Not allowed** | "The label Avvo assigns to this payment ('marketing fee') does not determine the purpose of the fee" (Joint Op. 732, 2017). Ohio, SC and PA agreed (quoted through NJ; originals unverified) | https://www.dropbox.com/s/5plgfqgi26zuym1/ACPE%20732%20Avvo%2C%20LegalZoom%2C%20Rocket%20Lawyer%206.21.17.pdf?dl=0 |
| Flat fee per hired client | Illinois matters only: allowed ("a reasonable connecting fee for every connection that results in a potential client hiring the lawyer", comment [7]). NJ, NY: not allowed. Others unverified | | Illinois Rule 7.2 (above) |
| Flat listing or subscription | **Allowed as advertising** if Duly does not recommend. A lawyer may "pay the reasonable costs of advertisements" (7.2(b)(1)). "Directory listings ... that list lawyers by practice area, without more, do not constitute impermissible 'recommendations'" (NC comment [2]) | | https://www.ncbar.gov/for-lawyers/ethics-and-governing-rules/rules-of-professional-conduct/71-76-information-about-legal-services/72-communications-concerning-a-lawyers-services-specific-rules/ |
| Matching a lawyer to the student's case | **Turns a listing into a referral.** A lawyer must not pay a platform that implies it "has analyzed a person's legal problems when determining which lawyer should receive the referral" (NC comment [5]) | | same |
| California directory | Only as **joint advertising**: names shown so the consumer "may select and initiate contact", and every firm signs an agreement taking "liability for the content of the advertising" (BPC 6155(g)). Otherwise a certified referral service is needed, and "Any person may bring a civil action" for $5,000 to $100,000 per violation (BPC 6156.5, SB 37, from 2026-01-01) | | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=6155 ; https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB37 |
| Florida directory | A paid directory is a "qualifying provider" ("publishing in any media a listing of lawyers ... together in one place", 4-7.22(b)(3)) with 12 conditions, including at least 4 firms and a yearly list of Florida lawyers to the Bar | | Florida Bar rules (above) |
| Texas | Joint advertising "intended solely to solicit clients for those lawyers" is outside the referral-service law (Occ. Code 952.003). Paying or accepting money "to solicit employment" is barratry, a third-degree felony (Penal Code 38.12) | | https://texas.public.law/statutes/tex._occ._code_section_952.002 ; https://texas.public.law/statutes/tex._penal_code_section_38.12 |
| Student discount | **Allowed** if the firm sets it. An intermediary must not be "unilaterally setting the fee the lawyer may charge" (Illinois 7.2(c)(2)). Discount must be off "the actual, bona fide price at which the article was offered to the public on a regular basis" (16 CFR 233.1) | | https://www.ecfr.gov/current/title-16/part-233 |
| Paid listing disclosure | Required in spirit by NC comment [5] and FTC 16 CFR 255.5: a material connection "must be disclosed clearly and conspicuously" | | https://www.ecfr.gov/current/title-16/section-255.5 |
| Legal service plan (students pay Duly, Duly pays firms) | **Allowed with conditions.** NJ found LegalZoom and Rocket Lawyer subscriptions did not share fees; their fault was not registering. NJ: a for-profit plan's lawyers may not be "employed, directed, supervised or selected by it". NY requires an annual filing. Florida treats a promise of legal services for a periodic payment as "legal expense insurance" (Fla. Stat. 642.015) | | NJ Op. 732 (above); https://www.flsenate.gov/Laws/Statutes/2025/642.015 |
| Owning a law firm (Arizona ABS) | **Allowed under licence.** Arizona removed ER 5.4. State fees "Regular ABS $ 9,000.00" to apply, "$ 6,000.00" a year; an Arizona-licensed compliance lawyer; about 7 to 9 months to process (state notice, 2025-10-09). Boundless runs a federal immigration firm this way (licence 70276). California lawyers may not share fees with an out-of-state ABS unless also licensed there (BPC 6156, until 2030) | | https://www.azcourts.gov/Portals/0/0/admcode/pdfcurrentcode/7-209%20Alternative%20Business%20Structures%2003_2026.pdf ; https://www.azcourts.gov/cld/Alternative-Business-Structure/Announcements ; https://www.boundless.com/ ; https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260AB931 |
| Utah sandbox | **Closed.** ABS-only portion closed end of 2024; last deadline 2026-05-29; sunsets 2027-08-14 | | https://utahinnovationoffice.org/ |

Unverified and first for counsel: whether Arizona actually deleted ER 7.2(b)'s ban on paying for referrals (the 2019 task force proposed it); the ABA Model Rule text; ABA Formal Opinions 465 and 499; flat per-lead fees outside NJ and FL; Florida ch. 642 licensing detail; state immigration-consultant (notario) laws.

---

## 3. The three models compared (base case, est.)

Common inputs: 1.5% of students hire a lawyer through Duly a year (low 0.5%, good 3%); average fee per matter $4,000 (published range $1,850 for F-1 work to $8,500 for EB-1A, attorney-market.md 3); a firm's cost to win a client elsewhere $749 (First Page Sage 2026, https://firstpagesage.com/marketing/average-customer-acquisition-cost-cac-by-industry-b2b-edition-fc/). No line starts before 10k students.

| | A. Flat firm listing | B. Student legal service plan | C. Arizona ABS owned by Duly |
|---|---|---|---|
| How it works | Every firm in a tier pays the same monthly fee; students filter and choose; random order; "Paid listing" label | Plus with counsel at $99 a year: Plus, one 30-minute consult with a panel firm the student picks, firm-set member discount after that. Duly pays the firm $100 per consult | Duly owns an immigration firm with Arizona-licensed lawyers; students who choose it pay a student price 10% below list; other firms stay listed beside it |
| Who pays Duly | Firms, flat | Students | Students, as legal fees to Duly's firm |
| Key assumptions | Firms pay half of $749 per expected client; 5 regions of 5 firms at 10k, 10 of 8 at 100k | 0.5% of students hold the plan (low 0.25%, good 1%); half use the consult; 40% would have bought Plus anyway | 40% of hiring students choose Duly's firm; 90 matters per lawyer a year with a paralegal; at least 2 lawyers |
| Revenue per student a year | $5.62 (low $1.87, good $11.23) | $0.49 | $21.60 gross fees; about $3.30 profit at 100k |
| Per firm | Pays Duly $187 a month at 10k, $585 at 100k (about 6 and 19 clients a firm a year). LegalMatch charges from $455 a month | Duly pays each panel firm about $250 a year at 10k, $833 at 100k, plus the discounted work that follows | Revenue per lawyer $108k a year at 10k (underused), $309k at 100k |
| Running costs a month | $60 per firm (licence and discipline re-checks, complaints, account support), card fees, ethics counsel $1k to $2k, added liability cover $150 to $400 | Card fees and refunds, consult payments, Ask, lost Plus sales, plan admin $1k to $3k, plan counsel $2k, cover $300 to $600 | Lawyer $14k, paralegal $5.4k, malpractice $700, software $300, each per lawyer; ABS fee, Arizona counsel and trust accounting $4k |
| One-time before launch | $20k to $50k: multistate ethics opinion, CA joint-ad agreement, FL filings, IL letters | $40k to $100k: plan structure, NJ registration, NY filing, insurance-law review state by state | $150k to $300k: $9k application, Arizona counsel, 7 to 9 months of staff before revenue |
| Net a month, 10k / 100k | **+$1.8k / +$37.3k** | -$3.2k / -$4.6k | -$27.3k / +$27.8k |
| Legal risk | Low to medium. Rises with ranking, "vetted" badges, matching or a Duly guarantee. Florida, California, Texas and Illinois paperwork | Medium. Insurance law in some states (FL); registration (NJ, NY); NJ open-panel rule for for-profit plans | Medium under licence; high for the brand. Malpractice and supervision duties; CA lawyers barred from sharing fees; ER 7.2 status unverified |
| Fit with Duly | Needs BOUNDARY item 4 changed; keeps Duly an adviser | Reverses "no bundled attorney consult" | Duly becomes a law-firm owner; needs a separate company, brand and wall |

What the comparison shows:
- **A earns the most for the least risk.** Its revenue is almost pure margin above about $3k a month of fixed cost.
- **B does not pay.** Each member contributes about $23 a year after the consult, fees, Ask and lost Plus sales. Covering plan admin and counsel needs about 1,730 members at 10k students (17%) and 2,940 at 100k (2.9%). At $149 a year it needs about 580 and 990. B is a student benefit, not a revenue line.
- **C is a scale bet.** The owned firm covers itself only if 3.9% of students hire through Duly at 10k, 0.8% at 50k, 0.4% at 100k. At 60 matters per lawyer instead of 90 it loses $33k a month even at 100k. It can also take clients from outside Duly, which this model does not count.
- **C2, a licensed 15% share of a partner's Arizona ABS** (structure unverified, needs Arizona counsel): +$0.2k a month at 10k, +$24.5k at 100k, with about $2.5k a month of counsel. Cheaper than C but carries the same BOUNDARY problem.
- **A and C do not add up.** If both run, the same hires are split between them.

---

## 4. Revenue and break-even with the attorney line (est.)

Subscription and school lines: PRICING.md v4 base case with $12 school seats (about 2.1% holding Plus; schools cover 10% from about 50k). Net a month, Sonnet 5.5 / Opus 4.8. View A cash with the founder doing upkeep, view B with paid help, view C with the founder paid. The attorney line's own costs count in every view.

| Plan | Revenue a month, 10k / 100k | Net 10k, A / B | Net 100k, A / B / C | Break-even students, A / B / C |
|---|---|---|---|---|
| Today's plan, no attorney line | $0.5k / $16.0k | -$5.1k to -$5.5k / -$9.0k to -$9.3k | -$2.2k to -$6.7k / -$13.7k to -$18.2k / -$25.1k to -$29.5k | 117k to 180k / 268k to 595k / 407k to 903k |
| **+ A, base (1.5% hire)** | $5.2k / $62.8k | -$3.3k to -$3.7k / -$7.2k to -$7.5k | **+$35.1k to +$30.6k / +$23.6k to +$19.1k / +$12.3k to +$7.8k** | **19k to 21k / 36k to 41k / 66k to 75k** |
| + A, low (0.5%) | $2.1k / $31.6k | -$6.3k to -$6.6k / -$10.2k to -$10.5k | +$5.4k to +$0.9k / -$6.1k to -$10.6k / -$17.4k to -$21.9k | 63k to 91k / 127k to 158k / 177k to 220k |
| + A, good (3%) | $9.9k / $109.6k | +$1.1k to +$0.8k / -$2.7k to -$3.1k | +$79.6k to +$75.2k / +$68.1k to +$63.7k / +$56.8k to +$52.3k | 10k / 14k / 30k to 31k |
| + B, base | $0.9k / $20.1k | -$8.3k to -$8.7k / -$12.2k to -$12.5k | -$6.9k to -$11.4k / -$18.4k to -$22.9k / -$29.7k to -$34.2k | 151k to 222k / 302k to 595k / 428k to 842k |
| + C, base | $18.5k / $196.0k | -$32.5k to -$32.8k / -$36.3k to -$36.7k | +$25.6k to +$21.1k / +$14.1k to +$9.6k / +$2.7k to -$1.7k | 29k to 30k / 56k to 58k / 87k to 89k |
| + C, low | $6.5k / $76.0k | -$44.1k to -$44.4k / -$48.0k to -$48.3k | -$9.2k to -$13.7k / -$20.7k to -$25.2k / -$32.1k to -$36.5k | 83k to 89k / 132k to 175k / 211k to 260k |
| + C, good | $36.5k / $376.0k | -$15.0k to -$15.3k / -$18.9k to -$19.2k | +$57.4k to +$52.9k / +$45.9k to +$41.4k / +$34.5k to +$30.1k | 14k / 22k / 37k to 44k |
| + C2, base | $3.2k / $43.0k | -$4.9k to -$5.3k / -$8.8k to -$9.1k | +$22.3k to +$17.8k / +$10.8k to +$6.3k / -$0.6k to -$5.0k | 32k to 37k / 55k to 67k / 102k to 117k |

One-time costs are not in the monthly figures: A $20k to $50k, B $40k to $100k, C $150k to $300k, on top of PRICING.md's $90k to $236k.

Sensitivity of A at base hire (net a month at 10k / 100k): firms pay the full $749 per client, +$6.3k / +$81.9k; firms pay only a quarter, -$0.4k / +$15.0k. Price per firm follows the clients each firm actually gets, so set it from data, not from this table.

**What it means.** With A at the base hire share, Duly covers its cash costs at about 20k students and paid help at about 40k, both inside the 10k to 25k year-one and 50k to 100k with-schools reach in PRICING.md section 3. The attorney line, not Plus, would decide whether Duly pays for itself. That is why the hire share must be measured before anyone plans on it.

---

## 5. How to start safely

### 5.1 Before building (months 0 to 3)
1. **Founder decision** on BOUNDARY item 4 and VALUE-2 "Still no" (section 7).
2. **Measure the hire share.** Add an opt-in onboarding question: "Have you paid an immigration lawyer in the last 12 months? For what?" Ask two or three DSOs. This replaces the 1.5% guess.
3. **Interview 5 to 10 immigration firms:** what they pay per client now, which student matters they want, what a ready case packet saves them, and whether they would publish fixed prices and a student price.
4. **Hire legal-ethics counsel** licensed in or familiar with CA, NY, TX, FL, IL and NJ. Hand over attorney-legal.md section 10 as the brief. Ask first about Arizona ER 7.2(b), California joint advertising, and Florida qualifying-provider filings. Budget $20k to $50k (est.).

### 5.2 First firms (from about 10k students)
- Start with 4 to 5 firms in each of 3 to 5 regions (Florida requires at least 4 firms). Founding listings free or low for 6 to 12 months, then a flat fee set from the clients each firm actually got.
- One price per tier for every firm. Tiers may differ by region or number of states listed, never by leads, clients or fees.
- California firms sign the joint advertising agreement. Florida lawyers report joining within 15 days; Duly files the yearly list. Illinois lawyers get the ICS certification letter.
- No exclusivity. Firms may serve students outside Duly.

### 5.3 Vetting: published facts, not grades
- Admission criteria shown to every student: licence in good standing (checked on the state bar site, with the date), no public discipline in a stated period, malpractice cover, immigration share of practice, published fixed prices for common student matters, a signed reply-time commitment.
- Re-check licences and discipline every quarter. Remove a firm for objective reasons only (lapse, discipline, unresolved complaints). Never for how many students hired it.
- Words to avoid: "vetted", "top", "best match", "recommended", any Duly guarantee or refund. NY 1132 treated Avvo's ratings and refund as vouching. Use "meets these published criteria".
- Measured facts are fine if "accurate, complete, and not misleading" (California LRS rule 3.823(D)), for example "median first reply: 6 business hours, last 90 days".

### 5.4 Transparency to students
- Every listing: "Paid listing. Firms pay Duly the same flat fee to appear here. Duly does not recommend lawyers and does not receive any part of their fees."
- Random order each time, with student-chosen filters (state, language, matter, price).
- Free options first: the school's own student legal services where they exist, bar-run referral services, and the AILA lawyer search.
- The student pays the firm directly. Duly never touches legal fees and never charges students for the listing or a referral.
- Prices are the firm's, shown as theirs, with the regular price beside any student price.

### 5.5 Keeping Duly's advice independent of who pays
- The directory lives in its own place (from Your case and the Share sheet). The step-back card keeps only the neutral AILA pointer, as BOUNDARY says today.
- Ask, the engine, verdicts, News and rule packs never name a listed firm and never read which firms pay. Add boundary eval pairs: a paid firm must never appear in an answer.
- Nothing from a student's case reaches a firm without the student's explicit share. Firms never buy leads, student lists, "students like you" signals or view counts.
- A firm's fee cannot change order, placement, News or rule content. Write this into the firm agreement.
- School-licensed Duly hides the directory by default, or the contract says it is there and lets the school switch it off. Never pay a DSO or school staff in connection with listed firms.
- Duly's own copy never calls Duly a lawyer or attorney (BOUNDARY), and never "discounted attorneys from Duly". Use "Student prices offered by independent immigration law firms".

---

## 6. Risks

| Risk | Effect | What reduces it |
|---|---|---|
| Hire share is below 1% | A earns $2k to $16k a month at 10k to 100k; break-even back near 63k to 91k (cash) | Measure before building; start with free founding listings |
| A feature drifts into "recommending" (matching, ratings, badges, "vetted") | Listing becomes a paid referral: lawyer discipline; CA suits at $5k to $100k per violation; FL and TX referral-service law | Section 5.3 wording; counsel signs off on every listing screen; eval cases |
| Someone proposes a "platform", "technology" or "processing" fee scaled to the invoice | Same as a cut (NJ 732: "The label and timing of the fee does not transform it into an advertising cost") | Never price anything off legal fees or matters |
| A student reads a listing as Duly's endorsement and is harmed by a listed lawyer | Trust and reputation; possible negligent-selection claims (unverified theory) | Labels, free options first, objective removal, complaint process |
| Lawyers licensed in states not checked have stricter rules | A firm's lawyer may not be able to join | Counsel maps each listed lawyer's states (Rule 8.5) |
| Schools object to paid lawyer ads in a tool they pay for | Loss of the school channel | Hidden by default in school-licensed Duly |
| Students read paid listings as Duly profiting from their fear | Word of mouth turns | Flat fee, plain disclosure, never on Home or next to a date, never in a crisis answer |
| Discount claims without a real regular price | FTC deception (16 CFR 233.1) | Firm states and keeps evidence of its regular price |
| B: insurance-law states and registration | Licensing cost or exclusion of states | Not recommended now |
| C: low volume, malpractice, brand conflict, Arizona queue and portal outage | -$27k a month at 10k; $150k to $300k up front; Duly becomes a law-firm owner | Separate study only after A shows volume |

---

## 7. Decisions for the founder

1. **BOUNDARY item 4 and VALUE-2 "Still no":** allow a flat, labelled, paid directory that students search themselves, with the step-back card keeping only the neutral AILA pointer. Yes or no.
2. **Drop "a cut of the fee"** from the plan. Replace it with flat listings (A). Recommended.
3. **Measure first:** approve the onboarding question and 5 to 10 firm interviews before any build.
4. **Counsel:** retain legal-ethics counsel for the six-state opinion ($20k to $50k, est.). First questions: Arizona ER 7.2(b), California joint advertising, Florida filings.
5. **Launch point:** start firm listings at about 10k students, founding listings free or low for 6 to 12 months.
6. **School-licensed Duly:** directory hidden by default (recommended) or shown with the school's consent.
7. **Legal service plan (B):** not now. Revisit only if members would pay $149 or more and plan counsel is cheaper than modelled.
8. **Arizona ABS (C or C2):** not in v2. Commission a separate study once A shows a hire share of 1.5% or more and Duly is past about 30k students.
9. **Intake software for firms** (a flat per-seat price for receiving consented case packets, attorney-market.md model G, $30k to $360k a year, est.): study alongside A; it does not depend on referrals.

Sources not listed above, all read 2026-10-01: published fees, https://www.usavisalaw.com/immigration-attorney-cost ; LegalMatch, https://www.legalmatch.com/attorneys/how-it-works.html ; LegalShield 10-K, https://www.sec.gov/Archives/edgar/data/311657/000120677411000352/prepaid_10k.htm ; Arizona ABS directory, https://www.azcourts.gov/cld/Alternative-Business-Structure/Directory ; USCIS volumes, https://www.uscis.gov/sites/default/files/document/data/i140_rec_by_class_country_fy2026_q3_v1.xlsx and https://www.uscis.gov/sites/default/files/document/data/i129_quarterly_request_for_evidence_fy2026_q3_v1.xlsx ; California LRS rules, https://www.calbar.ca.gov/sites/default/files/portals/0/documents/rules/Rules_Title3_Div5-Ch3-LRS.pdf .
