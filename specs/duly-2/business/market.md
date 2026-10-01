# Duly business: market and willingness to pay

Status: research section for the founder, 2026-10-01. Inputs: ARCHITECTURE.md sections 0, 8, 16, 18, 19; specs/ui-2/VALUE-2.md section 4 (free and paid); specs/ui-2/competitor/ANALYSIS.md; the founder's earlier notes in docs/research/founder/ ("Duly market and pricing validation", 2026-09-28). D8 still parks the price, so every price here is a **Proposal**.

Markings: every external number has its source URL and the date it was read. **(estimate)** means arithmetic or judgement in this file, not a published figure. **(unverified)** means the source could not be fetched in this pass. "Read 2026-10-01" means fetched today; "read 2026-09-28" means taken from the founder's earlier notes, which fetched it then.

---

## 0. The answer in short

1. **The market.** 1,177,766 international students in 2024/25, 294,253 of them on OPT, both records (Open Doors). Duly's sharpest value is to students on OPT and STEM OPT. That is about 290k to 380k people a year. New enrolment fell 17% in fall 2025, so expect this pool to peak around 2026 to 2027 and then shrink **(estimate)**.
2. **How long a student needs Duly.** A STEM master's student needs it for 3 to 5 years: about 2 years of study, then 12 months of OPT, then 24 months of STEM OPT. A non-STEM student needs it for about 1 to 3 years. Students mostly leave because they change status or leave the US, not because they are unhappy with Duly. Only about 35% of H-1B registrations were selected for FY2026.
3. **What students pay.** Students know these prices: $6.99 a month for Spotify or Apple Music student plans, $49.99 a year for TrackMyOPT Pro, about $105 a tax season for Sprintax. At a scary moment they pay $150 to $300 for an attorney consult and $1,780 for premium processing.
4. **What converts.** Freemium apps convert a median 2.1% of downloads to paid (RevenueCat 2026). Legal-tech freemium converts 5.6% and edtech 2.1% (First Page Sage). After one year, 44% of annual subscribers are still paying and 17% of monthly subscribers (RevenueCat 2025). Duly's paid extras are thin by design (VALUE-2: everything safety-related is free), so plan on 2% to 3% conversion, not 5%.
5. **The economics.** Serving one more student costs almost nothing: cents a month for infrastructure (§16) and about $0.03 a month per active student for Ask. The cost is the fixed platform plus audits and counsel. A price around $39 a year earns about $35 per payer after fees, so gross margin is already high. The hard part is having enough payers. Subscriptions alone pay for the infrastructure at about 2% to 3% of 100k students. They pay for the infrastructure **plus** audits and counsel only at about 4% to 8% of 100k students (section 7). Price does less than reach and a school channel.
6. **Recommended price (Proposal).** All core features stay free, as VALUE-2 says. **Duly Plus at $39 a year (about $3.25 a month) or $4.99 a month**, sold on the web first. It sits below TrackMyOPT Pro ($49.99 a year, $6.67 a month) and below the $6.99 student plans students already know. Renewal is not a trap: a reminder before every renewal, cancel in one tap, a 14-day refund. A **hardship price of $19 a year**, on request, no proof needed. Later, a **school licence** so a university can pay for Plus for its students. Before launch, test $29, $39 and $49 a year with a fake-door checkout.

---

## 1. How many students

| Measure | Number | Period | Source (read) |
|---|---|---|---|
| International students in US higher education, including OPT | 1,177,766 (+4.5%) | 2024/25 | Open Doors 2025 Fast Facts, https://opendoorsdata.org/wp-content/uploads/2025/11/OD25_Fast-Facts.pdf (2026-10-01) |
| On OPT (Open Doors count) | 294,253 (+21.2%) | 2024/25 | same |
| Graduate / undergraduate / non-degree | 488,481 / 357,231 / 37,801 | 2024/25 | same |
| New international students | 277,118 (-7.2%) | 2024/25 | same |
| New international enrolment, fall 2025 | -17% | Fall 2025 | NAFSA, published 2025-11-17, https://www.nafsa.org/about/about-nafsa/international-students-contributed-43-billion-us-economy-2024-2025-fall-2025 (2026-10-01) |
| Active F-1 and M-1 SEVIS records (any time in the year; includes K-12 and M-1) | 1,582,808 (+5.3%) | Calendar 2024 | SEVIS by the Numbers 2024, posted 2025-06-05, https://www.ice.gov/doclib/sevis/btn/25_0605_2024-sevis-btn.pdf (2026-10-01) |
| OPT authorizations (with EAD and a reported employer) | 194,554 (+21.1%) | Calendar 2024 | same |
| STEM OPT: new authorizations / students taking part | 95,384 (+54%) / 165,524 | Calendar 2024 | same |
| CPT authorizations | 130,586 | Calendar 2024 | same |
| Unique students with any practical training authorization | 381,140 | Calendar 2024 | same |
| From India / China | 363,019 (30.8%) / 265,919 (22.6%) | 2024/25 | Open Doors Fast Facts (above) |
| STEM OPT participants from India / China | 48.0% / 20.4% | Calendar 2024 | SEVIS by the Numbers 2024 |
| Math and computer science / engineering | 25.9% / 18.4% of all international students | 2024/25 | Open Doors Fast Facts |

SEVIS by the Numbers 2024 is the latest edition; ICE's index lists no 2025 edition as of today (https://www.ice.gov/sevis/whats-new, read 2026-10-01).

**What this means for Duly (estimates):**
- **Everyone on F-1 status (all of Duly's scope):** about 1.18M in higher education.
- **Where the dates are densest and the stakes highest:** OPT plus STEM OPT, about 290k to 380k a year. The SEVIS 381,140 figure, which includes CPT, is the upper bound.
- **Next intake to OPT:** graduate students, 488k. Most are master's students, who reach OPT within about 2 years.
- **The reach is realistic only if it is modest.** TrackMyOPT, after years in market, claims "3,000+ users have signed up" and "10,000+ people regularly use our free tools" (https://www.trackmyopt.com/, read 2026-09-28). Plan on 10k to 25k users in year 1 (1% to 2% of 1.18M) and 50k to 100k only with a school channel **(estimate)**.
- **The pool shrinks behind the current stock.** New intake fell 7.2% in 2024/25 and 17% in fall 2025. Today's OPT cohort comes from the record 2022/23 to 2023/24 intakes, so OPT numbers likely peak in 2026 to 2027 and then fall **(estimate)**.

---

## 2. How long a student needs Duly (lifecycle and churn)

| Stage | Length | Source |
|---|---|---|
| Master's program | about 2 years | common program length **(estimate)** |
| Bachelor's program | about 4 years | **(estimate)** |
| Post-completion OPT | 12 months, 90 days of unemployment allowed | DHS Study in the States, https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-stem-optional-practical-training-opt (2026-10-01); Duly pack opt.unemployment_limit_days |
| STEM OPT extension | 24 months, 150 days of unemployment in total | same |
| H-1B lottery, FY2026 | 343,981 eligible registrations, 120,141 selected (about 35%) | USCIS, https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-1b-specialty-occupations/h-1b-electronic-registration-process (2026-10-01) |
| H-1B, FY2027 and later | A wage-weighted selection rule now applies | same page ("H-1B Weighted Selection Process Final Rule (2026)") |
| Cap-gap | to April 1 of the fiscal year, or the H-1B start date if earlier | Duly pack capgap.end_month_day (8 CFR 214.2(f)(5)(vi)(A)) |

**Expected lifetime of a user (estimates):**
- **STEM master's: 3 to 5 years.** Study, then OPT, then STEM OPT. The STEM years give up to three H-1B lottery tries, and every try is a season Duly serves (cap-gap dates, feature 8).
- **Non-STEM master's: 1.5 to 3 years.** Study, then 12 months of OPT.
- **Bachelor's: 4 to 5 years or more,** but the dates that matter cluster in the last year and on OPT.
- **When a user leaves.** The usual exit is a change to H-1B (about 35% selected per try), leaving the US, or a green card. These are graduations, not complaints. Until the H-1B pack exists, Duly loses users at exactly the moment they would value it most.

**When paying peaks (estimates from the date clusters; the founder's earlier notes call this "event-shaped" spending):**
- the OPT filing window (90 days before to 60 days after the program end, and 30 days after the recommendation);
- the STEM filing window;
- job changes and job loss while on OPT;
- the H-1B season in March to April, then cap-gap;
- travel;
- tax season, when students already pay Sprintax.

Gen Z subscription fatigue backs this up: in CivicScience data, 37% cancelled at least one streaming service in a short window and 8 in 10 signed up for one show and then cancelled (via NewscastStudio, 2026-01-28, https://www.newscaststudio.com/2026/01/28/gen-z-reports-high-subscription-fatigue-despite-maintaining-multiple-streaming-services/, read 2026-09-28).

---

## 3. What comparable tools charge

| Product | Model | Price | Source (read) |
|---|---|---|---|
| TrackMyOPT Free | free forever | $0: OPT and STEM calculators, unemployment tracker, timeline, manual USCIS check (1 case) | https://trackmyopt.com/pricing (2026-10-01) |
| TrackMyOPT Pro | subscription | $49.99 a year ($4.17 a month) or $6.67 monthly; trial "$0.99 for 7 days". Adds 9 AM email reminders, daily USCIS checks, document vault, STEM tracking, career tools | same |
| TrackMyOPT Dedicated | subscription | $149.99 a year ($12.50 a month) or $16.67 monthly; adds priority support and "one complimentary 60-minute initial attorney consultation" | same |
| Lawfully (case tracker app) | in-app subscription plus consumables | Premium $14.99 a month, $29.99 or $34.99 for 3 months; Case Pro Unlimited $14.99 a month, $29.99 for 3 months, $154.99 a year; Gems $9.99 and $39.99. 4.8 stars, 173K ratings | https://apps.apple.com/us/app/lawfully-case-tracker/id1435063223 (2026-10-01) |
| SimpleCitizen | one-time per filing | Employment authorization and travel documents: $159 / $279 / $469; citizenship and green card renewal: $249 / $389 / $615; family green card: $599 / $899 / $1,299; government fees extra | https://www.simplecitizen.com/pricing (2026-10-01) |
| Boundless | one-time per filing | Marriage green card from about $749 to $1,249, K-1 $699 to $1,349 (third-party review; Boundless's own page shows "$780" for one tier) | https://www.readyforvisa.com/blog/boundless-immigration-review (2026-09-28); https://www.boundless.com/ (2026-10-01) |
| Sprintax (nonresident tax) | one-time per season | Federal $54.95, state $49.95, Form 8843 $19.95; many schools pay through codes | https://taxprep.sprintax.com/faq.html (2026-09-28) |
| Interstride, FrogHire | school pays, free to students | quote-based, not public | https://www.interstride.com/career-centers/ ; https://www.froghire.ai/help/faq (2026-09-28) |
| VisaWatch | freemium tracker | price not shown | https://www.visawatch.app/vs/lawfully (2026-09-28) |
| Immigration attorney | per consult | $150 to $300 for 30 to 60 minutes; RFE responses $650 to $1,450 | https://www.usavisalaw.com/immigration-attorney-cost (2026-09-28) |
| I-765 premium processing | USCIS fee | $1,780 (from 2026-03-01) | https://immiva.com/blog/i-765-opt-filing-fee-2026-complete-cost-breakdown (2026-09-28) |

**What the comparison shows:**
- **Students pay for trackers in a narrow band:** $50 to $155 a year. Monthly plans cost $6.67 to $14.99. Lawfully's $14.99 serves anxious green-card applicants tracking one case, not students who need a tool for years.
- **TrackMyOPT charges for what Duly gives free:** reminders, the document vault and STEM tracking (ANALYSIS.md W14). Duly can be cheaper and still give more.
- **Bundling an attorney consult is how competitors justify a tier above $100.** BOUNDARY rules out bundled or referral consults for Duly (ANALYSIS.md section 8), so Duly has no tier above $100.
- **Transactional services price the filing, not the student.** They start at $159 for an EAD filing. Duly prepares no forms.

---

## 4. What students already pay each month, and student discount norms

| Service | Student price | Full price | Discount | Terms | Source (read) |
|---|---|---|---|---|---|
| Spotify Premium Student | $6.99/mo (1 month free) | $12.99/mo | 46% | SheerID check, re-verify every 12 months, 4 years at most | https://www.spotify.com/us/student/ ; https://www.spotify.com/us/premium/ (2026-10-01) |
| Apple Music Student | $6.99/mo (includes Apple TV+) | $11.99/mo | 42% | verified students, up to 4 years | https://www.apple.com/apple-music/ (2026-10-01) |
| Notion Plus | free for students (1 member) | $10/mo | 100% | school email | https://www.notion.com/pricing (2026-10-01) |
| Grammarly Pro | no student price on the pricing page | $12/mo | none listed | school deals only | https://www.grammarly.com/plans (2026-10-01) |
| ChatGPT Plus / Go | no student price known | Plus $20/mo; Go about $8/mo in the US **(unverified: openai.com and chatgpt.com refused fetching)** | | | https://chatgpt.com/pricing (refused, 2026-10-01) |
| Quizlet Plus | $35.99/yr ($2.99/mo) | | | | https://studyguides.com/articles/how-much-is-quizlet-plus-pricing-plans-and-free-alternatives (2026-09-28) |
| RevenueCat category medians, monthly plans | Education $9.99; Productivity, Business, Utilities $7.99 to $8.99 | | | | https://www.revenuecat.com/state-of-subscription-apps-2026/ (March 2026; read 2026-10-01) |
| RevenueCat category medians, annual plans | Education $44.99; Productivity $24.95; Business $35.48 | | | | same |
| OPT health insurance (ISO) | $41 to $81 a month | | | | https://www.isoa.org/opt_plans (2026-09-28) |

**Student pricing norms:**
- **The usual discount is 40% to 50% off,** with a check every year and a four-year cap (Spotify, Apple).
- **Some tools are free for students** because they hope to keep them as paying users later (Notion).
- **Students know "$6.99 a month" as the student price.**

Every Duly user is a student or recent graduate, so Duly's list price **is** its student price. It should look like one: under $5 a month, and under the $6.99 students already pay for music.

---

## 5. Conversion and retention benchmarks

| Metric | Value | Source (read) |
|---|---|---|
| Download to paid by day 35, freemium apps, median | 2.1% (top quartile above 4.5%) | RevenueCat State of Subscription Apps 2026, https://www.revenuecat.com/state-of-subscription-apps-2026/ (2026-10-01) |
| Download to paid, hard paywall, median | 10.7% | same |
| Trial to paid, 17 to 32 day trials / 5 to 9 day trials / 4 days or fewer | 42.5% / 37.4% / 25.5% | same |
| Freemium to paid by industry: Legal tech / Fintech / Edtech | 5.6% / 4.8% / 2.1% | First Page Sage, updated 2026-09-11, https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/ (2026-10-01); mostly B2B SaaS clients |
| Opt-out trial (card required): visitors who start / who convert | 2.7% / 49.1% | same |
| Conversion by price: low-priced / high-priced apps | 1.5% / 2.7% | RevenueCat 2025, https://www.revenuecat.com/state-of-subscription-apps-2025/ (2026-10-01) |
| Still paying after 1 year: annual / monthly / weekly plans | 44.1% / 17.0% / 3.4% | same |
| Still paying after 1 year, annual plans: low-priced / high-priced | 53.7% / 48.3% | same |
| Annual subscriptions cancelled in the first month | "nearly 30%" | same |
| Top reason for cancelling | "not enough usage" (32% to 47%); price rises not a reported reason | same |
| Refund rate, Education apps | 4.86% | same |

**What these mean for Duly (estimates):**
- **Price alone barely moves conversion.** Higher-priced apps convert better than cheap ones (2.7% against 1.5%). People cancel because they don't use the app enough, not because of the price. Being cheaper than TrackMyOPT will not, on its own, make students pay.
- **Duly's paid tier is thin by design.** VALUE-2 keeps every date, count, reminder, document, backup and export free. Plus adds only more backup space, the attorney or new-school packet and a second profile. That is the right call for trust. But it puts Duly at or below the freemium median, **2% to 3%**, not legal-tech's 5.6%. Use 2% for planning and 4% as the good case.
- **Annual plans fit the student lifecycle.** 44% to 54% renew after a year, against 17% of monthly plans. Students also need Duly for 2 to 5 years. A paying user is likely to last about 1.8 to 2.2 years **(estimate: 1 / (1 - renewal rate), capped by the lifecycle)**.
- **A card-required trial at the OPT or STEM filing moment converts best (49%).** VALUE-2 forbids putting anything a student needs behind a trial. A trial of Plus alone is allowed.

---

## 6. How price-sensitive international students are

| Signal | Value | Source (read) |
|---|---|---|
| Main funding source: personal and family | 606,781 (51.5%) | Open Doors 2025 Fast Facts (2026-10-01) |
| Main funding source: current employment | 296,643 (25.2%) | same. This is close to the 294,253 on OPT, so it is mostly OPT earnings **(inference)** |
| Main funding source: US college or university | 227,633 (19.3%) | same |
| Rupees per US dollar | 95.81 (2026-09-25) | Federal Reserve H.10, released 2026-09-28, https://www.federalreserve.gov/releases/h10/current/ (2026-10-01) |
| Yuan per US dollar | 6.711 (2026-09-25) | same |
| Fear about visa status | 90% moderate to extreme; over 25% sought visa help off campus; 38% had school legal aid | Stop AAPI Hate survey via The PIE News, Dec 2025, n = 87, https://thepienews.com/nine-in-10-international-students-fear-for-us-visa-status/ (2026-10-01). Small sample |
| What international students add to the US economy | $42.9B, 355,000+ jobs (2024/25) | NAFSA, 2025-11-17 (above) |

**What this means:**
- **Two groups with different budgets (estimate).**
  - Students still in their program mostly spend family money in rupees or yuan. At ₹95.81 to the dollar, $39 a year is about ₹3,737 and $4.99 a month is about ₹478. A student paid in rupees at home would read that as a real expense, not pocket money.
  - Students on OPT or STEM OPT earn US salaries, and that is when the clocks run and the stakes are highest. They can afford Plus, and the packets and family profile matter most to them.
- **Implication (estimate).** Keep the free tier complete for students in their program. Expect paying users to come mostly from OPT and STEM OPT. Do not price students in their program out of anything.
- **Price against the size of the stakes, not the budget.** A US degree costs about $36k a year per student ($42.9B / 1.18M, **estimate**). $39 a year is about 0.1% of that. But students compare an app with other apps, not with tuition. In the founder's earlier notes, under about $25 reads as trivial, $50 to $110 as normal yearly compliance spend, and $150 or more as "just ask a lawyer".
- **Fear sells, but Duly must not use it.** Fear is high (90% in a small survey) and students pay $1,780 for premium processing just to get certainty sooner. A fear-led price would break the BRIEF (calm, no alarms) and VALUE-2's free test. Duly should sell calm and completeness, not protection.
- **Card access is not a barrier (estimate).** Students already pay the $350 SEVIS fee and the $470 I-765 fee with cards that work in the US. Fintechs like Zolve and MPOWER exist to give them US cards without an SSN (founder notes, 2026-09-28).

---

## 7. What this means for the price

### 7.1 Cost per student, from ARCHITECTURE.md section 16

| Students | Monthly platform cost (§16) | Per student per month | Per year |
|---|---|---|---|
| 1k (lean launch) | $400 to $590 | $0.40 to $0.59 | $4,800 to $7,080 |
| 1k (full design) | $580 to $740 | $0.58 to $0.74 | $6,960 to $8,880 |
| 10k | $1,190 to $1,460 | $0.12 to $0.15 | $14,280 to $17,520 |
| 100k | $5,300 to $7,700 | $0.05 to $0.08 | $63,600 to $92,400 |

- **Ask costs about $0.03 a month per active student (§16 assumptions).** That is 8 questions a month, 30% of them reaching the cloud, at about $0.013 each on Opus 4.8. It is about $0.37 a year. Keep Ask free, with the 20-a-day limit.
- **Most of the bill is fixed.** The device is the computer, so a student who never turns on backup or sync costs almost nothing beyond the fixed platform. Each extra student adds cents.
- **Section 16 leaves out some costs.** Store and signing fees, Sentry and GitHub add about $1k to $2k a year. The rest are rough guesses **(estimate)**: counsel about $15k to $40k a year, audits and pen tests (§20 guesses $150k to $300k, spread over 3 years) about $50k to $100k a year, insurance about $3k to $10k a year. Together, about **$70k to $150k a year** before anyone is paid a salary. The cost section should replace these guesses with quotes.

### 7.2 What one payer earns

| Price | Web (Stripe 2.9% + 30¢ + 0.7% Billing) | App stores (15%) | Blend 50/50 |
|---|---|---|---|
| $29/yr | $27.66 | $24.65 | $26.15 |
| **$39/yr** | **$37.30** | **$33.15** | **$35.22** |
| $49/yr | $46.94 | $41.65 | $44.29 |
| $4.99/mo | $4.51 | $4.24 | $4.38 |

Fee sources (read 2026-10-01):
- Stripe: 2.9% + 30¢, 0.7% for Billing, 1.5% more for international cards (https://stripe.com/pricing).
- Apple Small Business Program: 15% under $1M a year (https://developer.apple.com/app-store/small-business-program/).
- Google Play subscriptions: "10% + 5% billing fee" on the first $1M (https://support.google.com/googleplay/android-developer/answer/112622).
- Apple may charge a "reasonable commission" on US external payment links; the court sent the amount back to the district court on 2025-12-11 (https://www.macrumors.com/2025/12/11/apple-app-store-fees-external-payment-links/). The cost of a web link-out from iOS is still open.

**Cost of serving a Plus user.** The extra backup space and Ask cost about $3 a year **(estimate)**: for example 5 GB more in S3 with its replica, plus Ask. That leaves about **$32 a year in contribution per $39 payer**, a gross margin near 90% **(estimate)**. Margin per payer is not the problem.

### 7.3 Break-even at $39 a year ($32.40 contribution per payer, estimate)

| Students | Payers to cover the platform (§16) | As a share of students | Payers to cover platform plus $70k to $150k fixed | As a share |
|---|---|---|---|---|
| 1k (lean) | 148 to 219 | 15% to 22% | not reachable | n/a |
| 10k | 441 to 541 | 4.4% to 5.4% | 2,600 to 5,170 | 26% to 52% |
| 100k | 1,963 to 2,852 | 2.0% to 2.9% | 4,120 to 7,480 | 4.1% to 7.5% |

What the table says:
- **1k and 10k students.** No consumer price covers the costs: conversion would need to be 3 to 25 times the freemium median. The lean launch in §16 and §18 (no cloud until Phase 4 and 5) is what keeps the losses small. Raising the price does not.
- **100k students.**
  - Plus at 2% to 3% pays for the platform.
  - Covering audits and counsel as well needs 4% to 7.5%. That is above what Duly's thin paid tier should expect.
  - A school channel can close the gap, and so can more Plus value that still passes the free test.
- **Doubling the price does not fix this.** At $49 the payers needed fall by about a fifth. At $79 (the founder's earlier proposal) they fall by about half. But the earlier proposal put the document vault and work records behind the paywall. VALUE-2 has since made those free, so the paid tier no longer supports $79.

### 7.4 Recommended pricing (Proposal)

| Plan | Price | What it holds | Why |
|---|---|---|---|
| **Free, always** | $0 | Everything in VALUE-2 section 4: all eight features, every date and count, reminders on every channel, calendar file, documents, sharing, export, backup (250 MB default, §19 #19), delete, News "For you", Ask within the daily limit | The build-gate test. It is also how Duly wins on trust against TrackMyOPT, which charges for reminders and the vault |
| **Duly Plus, yearly** | **$39 a year** (about $3.25 a month) | More backup space and version history; the formatted attorney or new-school packet; a second profile for an F-2 spouse or child; support for the founder | Below TrackMyOPT Pro ($49.99) as VALUE-2 requires; under the $6.99 student plans; between the Productivity ($24.95) and Education ($44.99) annual medians; the yearly plan fits a 2 to 5 year need |
| **Duly Plus, monthly** | **$4.99 a month** | same | For OPT job changes and STEM filing months. The yearly plan is 35% cheaper, which matches the 40% to 50% student discounts students know |
| **Hardship price** | **$19 a year**, on request, no proof | same | A sensitive, family-funded market (51.5%); it costs little because most cost is fixed; it builds goodwill in WhatsApp and Telegram cohorts |
| **School licence** (after launch) | per international student per year, quoted | Plus for every student at that school | Sprintax, Interstride and FrogHire reach students this way. Price after the counsel brief on FERPA (§20). Needs its own research |

**Billing rules that keep students coming back:**
- **No dark patterns.** Remind 7 days before every renewal. Cancel in one tap on the web and in the app. Refund within 14 days, no questions. The founder's earlier notes cite California's automatic renewal law (amended 2025-07-01) as the floor.
- **Allow a pass with no auto-renewal.** "Plus for 12 months, no auto-renewal" at the same $39. About 30% of annual subscribers turn renewal off in the first month anyway (RevenueCat 2025), so offering a pass gives up little and earns trust.
- **No sales surfaces.** Plus is offered in one place, Settings, and at the moment a student reaches for a paid extra, for example the packet. Never on Home or on a date (ANALYSIS.md section 8).
- **Sell on the web first,** so more of each payment reaches Duly. In-app purchase on iPhone and Android stays available, because some students will only pay there.
- **Guarantee one price for the student's whole stay** (the price paid at signup holds through STEM OPT). It costs little, students will tell each other about it, and it answers the fear of rising prices.

**What not to do:**
- No price on any engine item, reminder or document (VALUE-2 test).
- No bundled attorney consult (BOUNDARY).
- No "$0.99 trial" bait (TrackMyOPT's pattern).
- No price that relies on fear.

---

## 8. Risks that would change the answer

- **Policy (the biggest).** The founder's earlier notes cite a reported White House idea of a $100,000 OPT fee and a DHS OPT rule slated for February 2027 (Forbes, 2026-08-03, https://www.forbes.com/sites/stuartanderson/2026/08/03/new-immigration-plan-considered-to-stop-students-from-working-in-us/; **unverified this pass**, fetch refused). They also cite H.R. 2315, which would end OPT (https://www.congress.gov/bill/119th-congress/house-bill/2315/text). Either would shrink the OPT pool that pays. The D/S fixed-period rule was enjoined on 2026-09-14 (memory, Presidents' Alliance v. DHS). Rule churn raises demand for Duly, but each change needs a careful update.
- **Shrinking intake.** New enrolment fell 17% in fall 2025, so fewer students will reach OPT from 2027 **(estimate)**.
- **Conversion below 2%.** If Plus feels like a tip jar, conversion may fall below the freemium median. Measure it before building the paid backend.
- **Competitors.** TrackMyOPT could make reminders free. An app that comes with Interstride through the school could add date tracking. Duly's defence is trust (sources, privacy, no ads), not price.
- **App store fees.** If Apple's "reasonable commission" on link-outs is close to 15%, the web saving disappears on iPhone.

---

## 9. Tests to run before setting the price (Proposal)

1. **Fake-door test.** Show Plus at $29, $39 and $49 a year (random split) on the free product, with a real checkout page that ends in "join the list". Measure clicks to checkout at each price. Watch the 4.86% refund benchmark (Education apps) once real billing starts.
2. **Twenty interviews** in Indian and Chinese student WhatsApp, WeChat and Telegram groups. Ask what they paid for OPT help, the rupee or yuan price they would read as fair, and whether they would rather pay yearly or per stage.
3. **Three school conversations** (international office or career centre) on a school licence, its price, and the FERPA questions.
4. **Measure the cost per active student** in Phase 5 and 8 against §16. Re-run section 7.3 with the real numbers.

---

## 10. Still unverified

- ChatGPT Plus and Go US prices (openai.com and chatgpt.com refused fetching). Amazon Prime Student and YouTube Premium Student prices (pages unavailable).
- Lawfully's web pricing page (404; App Store prices used). Boundless's own fee table (third-party review used).
- Fall 2025 Open Doors Snapshot detail beyond NAFSA's -17% figure (IIE pages returned 404).
- The Forbes report on a $100,000 OPT fee (fetch refused; taken from the founder's 2026-09-28 notes).
- All counsel, audit, insurance and storage cost figures in section 7 are **estimates**. The cost section and quotes should replace them.
- No public conversion or retention data exists for any immigration app, so sections 5 and 7 use general app benchmarks (RevenueCat, mostly consumer apps; First Page Sage, mostly B2B SaaS).
