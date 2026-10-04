# Duly business: what it costs to run, and a price that covers it

Status: research section for the founder, 2026-10-01. Inputs: ARCHITECTURE.md sections 0, 8, 16, 18, 19; DECISIONS.md D8, D14, D45, D73, D79, D80; specs/ui-2/VALUE-2.md section 4; specs/ui-2/competitor/ANALYSIS.md (removed from the repo on 2026-10-03, D100; in git history at 67bbc33); the sibling file business/market.md (same date). Nothing here is a decision; D8 (pricing) is still parked.

Markings: every external number carries its source URL and the date it was read. **(estimate)** means arithmetic or judgement in this file, not a published figure. **(unverified)** means a figure from a project file that this pass could not confirm. All AWS prices are US West (Oregon) list prices, read 2026-10-01. The arithmetic is reproducible: the assumptions are listed in section 7.

---

## 0. The answer in short

1. **Ask is now the biggest variable cost.** D80 changed Ask from a classifier (one short tool call) to a writer (Claude reasons and writes the answer). ARCHITECTURE.md section 16 priced the classifier at about $0.003 to $0.013 a question. A written answer costs about **$0.014 to $0.044 a question** on Bedrock, depending on the model and on caching (section 2). Only Opus 4.8 is verified for retention `none`, and it is the expensive end.
2. **The cloud is cheap and nearly flat.** About $380 to $550 a month at 1k students (lean launch), about $1,000 at 10k, about $3,300 to $3,700 at 100k (ARCHITECTURE.md section 16, unit prices rechecked in section 1 below and still matching).
3. **People, security and counsel cost more than the cloud.** Keeping the rules current, attorney review of content, pen tests, insurance and counsel come to about **$4,200 a month at 1k students and $15,200 at 100k (estimate)**, plus support, before any salary for the founder. One-time work before the first stranger (audits, counsel setup, attorney review, the Ask eval corpus) is about **$90k to $236k (estimate)**.
4. **Each paying student earns a good margin.** At $39 a year, sold on the web, Stripe takes about $2.07. Ask for a heavy user, extra storage and support take $2.84 to $6.44. That leaves **$30 to $34 a payer a year, a 78% to 87% contribution margin** (section 5).
5. **The hard part is how many students pay, not the price.** Every free student costs about **$0.09 to $0.12 a month** for Ask, support and cloud growth (estimate). At $39 a year, staffed rule upkeep and support (founder unpaid) break even only at about **8% to 11% of 100k students paying** (section 6). market.md expects 2% to 3%. Raising the price to $49 lowers that line by only 1 to 2 points. A school licence, a cap on free Ask and a cheaper verified model each move it further.
6. **Recommended price (Proposal), the same as market.md.** The core stays free, as VALUE-2 says. **Duly Plus at $39 a year (about $3.25 a month) or $4.99 a month**, sold on the web. Optional one-time items: a 3-month **season pass at $12**, an **attorney or new-school packet at $19**, an **F-2 family profile at $15 a year**. Free Ask gets a monthly allowance (Proposal: 5 questions). Plus lifts Ask to the existing safety limit of 20 a day. A **$19 hardship price** on request, a **price lock** while the student stays on F-1, OPT or STEM OPT, a reminder before every renewal, cancel in one tap and a 14-day refund. This is fair, below TrackMyOPT Pro, and earns a high margin per payer. It does not by itself pay a staffed company below about 100k students. Section 8 lists what closes the gap.

---

## 1. Cloud: recheck of the AWS prices behind ARCHITECTURE.md section 16

| Item | Price read 2026-10-01 | What section 16 assumed | Source |
|---|---|---|---|
| Fargate, Linux ARM | $0.03238 per vCPU-hour; $0.00356 per GB-hour. A 0.5 vCPU, 1 GB task is about $14.40 a month **(estimate: arithmetic)** | Same family of prices | AWS Price List API, AmazonECS us-west-2: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonECS/current/us-west-2/index.json (2026-10-01) |
| RDS PostgreSQL db.t4g.medium | $0.065 an hour Single-AZ; **$0.129 Multi-AZ (about $94 a month)** | t4g.medium near 10k | AWS Price List API, AmazonRDS us-west-2: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/us-west-2/index.json (2026-10-01) |
| RDS db.t4g.small / micro | Multi-AZ $0.065 / $0.032 an hour | Launch size | same |
| RDS db.m7g.large | $0.168 Single-AZ; **$0.337 Multi-AZ (about $246 a month)** | Near 100k | same |
| RDS gp3 storage | $0.115 per GB-month Single-AZ; $0.23 Multi-AZ | | same |
| Aurora | Not priced: section 16 keeps RDS and adds Aurora only if failover time becomes the measured problem | | ARCHITECTURE.md section 16 |
| S3 Standard | $0.023 per GB-month (first 50 TB); PUT $0.005 per 1,000; GET $0.0004 per 1,000 | | https://aws.amazon.com/s3/pricing/ (2026-10-01) |
| CloudFront flat-rate plans | Free $0 (1M requests, 100 GB); Pro $15 a month (10M requests, 50 TB); **Business $200 a month** (125M requests); Premium $1,000. All include WAF and DDoS protection | Business near 100k | https://aws.amazon.com/cloudfront/pricing/ (2026-10-01) |
| NAT gateway | $0.045 an hour (about $33 a month) plus $0.045 per GB processed; public IPv4 $0.005 an hour. The page quotes US East (Ohio) | NAT is about a third of the 1k bill | https://aws.amazon.com/vpc/pricing/ (2026-10-01) |
| SES email | $0.10 per 1,000 emails; dedicated IP $15 a month | Push and email Lambda | https://aws.amazon.com/ses/pricing/ (2026-10-01) |
| SNS mobile push | $0.00 per mobile notification delivered; requests $0.50 per million after the first million | Little push: reminders are computed and fired on the device (D73) | AWS Price List API, AmazonSNS us-west-2: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonSNS/current/us-west-2/index.json (2026-10-01) |
| Route 53 | $0.50 per hosted zone a month; $0.40 per million queries | | https://aws.amazon.com/route53/pricing/ (2026-10-01) |

**Result.** The unit prices match section 16. Its cloud totals without Ask tokens still stand:

| Cloud, monthly, without Ask | 1k | 10k | 100k |
|---|---|---|---|
| Full design (section 16) | $556 to $696 | $985 to $1,055 | $3,335 to $3,720 |
| Lean launch (section 16: staging on demand, no Config or Security Hub, Lambda for push and email) | about $376 to $546 | n/a | n/a |
| **Used in this file** | **$465** | **$1,020** | **$3,530** |

Storage per student is small: a student using 50 MB costs about $0.0023 a month in S3 Standard, or double that with the us-east-2 replica **(estimate: arithmetic)**. Raising a payer to 5 GB of backup adds about $0.23 a month for primary plus replica storage, before compression **(estimate)**. This file uses $0.05 a month per payer, because few payers fill their quota **(estimate)**.

---

## 2. Ask on Bedrock: per question and per student

**Bedrock prices for Claude, US West (Oregon), US geographic profile** (ARCHITECTURE.md section 8 requires the US profile; the global profile is about 10% cheaper and is blocked). Read from the AWS Price List API, AmazonBedrockFoundationModels us-west-2: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrockFoundationModels/current/us-west-2/index.json (2026-10-01).

| Model | Input / output per 1M tokens | Cache read / 5-min cache write | Retention `none` allowed? |
|---|---|---|---|
| Opus 4.8 | $5.50 / $27.50 | $0.55 / $6.875 | **Yes, AWS's documented example** (ARCHITECTURE.md section 8) |
| Opus 5.5 | $4.40 / $22.00 | $0.22 / $5.50 | Unverified |
| Sonnet 5.5 | $2.20 / $11.00 | $0.22 / $2.75 | Unverified |
| Haiku 4.5 | $1.10 / $5.50 | $0.11 / $1.375 | Unverified |
| Fable 5 and 5.1 | $11.00 / $55.00 | | No: AWS lists them as `aws_review` (ARCHITECTURE.md section 8), so they are out |

**Shape of one question under D80 (estimate).** About 5,000 input tokens: a system prompt and the reviewed guide passages (about 3,500, the same for everyone and cacheable), plus about 1,500 for the question, the loop step and the last turns. Output is about 600 tokens on Opus 4.8 with thinking off. On Sonnet 5.5 and Opus 5.5 it is about 900 tokens, because thinking cannot be turned fully off on those models. That limit comes from the current Claude API model notes, as summarised in the claude-api reference, read 2026-10-01.

| Model | Per question, no cache | Per question, prefix cached | Note |
|---|---|---|---|
| Opus 4.8 | **$0.044** | $0.027 | Only verified option today |
| Opus 5.5 | $0.042 | $0.027 | |
| Sonnet 5.5 | $0.021 | **$0.014** | If `none` is verified |
| Haiku 4.5 | $0.009 | $0.005 | If `none` is verified and quality passes evals |

Whether a cached prefix counts as retention under `none` is still unverified (ARCHITECTURE.md section 20). The cached figures assume it is allowed.

**Questions per student (estimate).** Half of students open Duly in a month. With a free allowance of 5 questions a month, active free students ask about 2, so the average across all free students is about **1 question a month**. Payers ask about **10 a month**, under the existing 20-a-day limit (ARCHITECTURE.md section 8). At 6% paying, that averages about 1.5 questions per student a month.

| Ask, monthly | 1k | 10k | 100k |
|---|---|---|---|
| Opus 4.8, no cache ($0.044) | $68 | $678 | $6,776 |
| Sonnet 5.5, cached ($0.014) | $22 | $216 | $2,156 |
| For comparison: section 16 classifier, Opus 4.8 | about $16 | about $160 | about $1,600 |

Without a free allowance, if free students asked as much as payers, Ask on Opus 4.8 would cost about $44,000 a month at 100k students **(estimate)**. That is more than any price in section 6 can pay for. The allowance and the model choice are the two biggest cost decisions in this file.

---

## 3. Fixed costs: accounts, tools, insurance, counsel, security

### 3.1 Accounts and tools (verified prices)

| Item | Price | Duly's use | Monthly in this file | Source |
|---|---|---|---|---|
| Apple Developer Program | $99 a year | Company account (decision 19.2) | $8 | https://developer.apple.com/programs/whats-included/ (2026-10-01) |
| Google Play Console | $25 one time | Company account | one time | https://support.google.com/googleplay/android-developer/answer/6112435 (2026-10-01) |
| Windows signing: Azure Artifact Signing (formerly Trusted Signing) | Basic $9.99 a month, 5,000 signatures; Premium $99.99. Overage $0.005 a signature. Needs a paid Azure subscription | Basic | $10 | Azure Retail Prices API, https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20'Trusted%20Signing' (2026-10-01); quotas https://azure.microsoft.com/en-us/pricing/details/artifact-signing/ (2026-10-01); FAQ https://learn.microsoft.com/en-us/azure/artifact-signing/faq (2026-10-01) |
| Domains and DNS | Route 53 $0.50 a zone a month. The .com registration price was not shown | 2 to 3 domains (product, Ask host, status) | $5 **(estimate)** | https://aws.amazon.com/route53/pricing/ (2026-10-01) |
| Email (Google Workspace) | Business Starter $7.00 a user a month, or 16% less on a yearly commitment | 2, 3 or 6 users at 1k, 10k, 100k | $14 / $21 / $42 | https://workspace.google.com/pricing (2026-10-01) |
| Sentry | Developer free (5k errors); Team $26 a month (50k errors); Business $80 a month | Team, then Business at 100k (decision 19.26: Sentry before strangers) | $26 / $26 / $80 | https://sentry.io/pricing/ (2026-10-01) |
| GitHub | Team $4 a user a month for the first 12 months, 3,000 Actions minutes | 2, 4 or 8 users (decision 19.6) | $8 / $16 / $32 | https://github.com/pricing (2026-10-01) |
| Password manager (1Password) | Teams Starter Pack $24.95 a month for up to 10 people; Business $8.99 a user a month | Starter, then Business at 100k | $25 / $25 / $72 | https://1password.com/pricing/business (2026-10-01) |
| Help desk (Help Scout) | Free up to 5 users; Standard $25 a user a month | Free, then 2 seats, then 9 seats | $0 / $50 / $225 | https://www.helpscout.com/pricing/ (2026-10-01) |
| Claude subscription for the agent factory (D45: agents run on the subscription login only) | Pro $20 a month; Max from $100 a month | Max | $100 / $200 / $200 | https://claude.com/pricing (2026-10-01) |
| **Tools total** | | | **$196 / $361 / $674** | |

### 3.2 Insurance

| Cover | Market figure | Used in this file |
|---|---|---|
| Cyber liability | Small businesses average $129 a month ($1,552 a year); **IT and technology businesses average $179 a month**. Limits usually $1M to $5M; deductibles $1,000 to $2,500 (Insureon, 100,000 policyholders, updated 2026-04-24) | |
| Errors and omissions (tech E&O) | Small businesses average **$88 a month** ($1,051 a year); 56% choose $1M/$1M limits (Insureon, updated 2026-03-24) | |
| **Both, Duly** | A business that holds immigration documents and gives rule-based guidance will likely price above the average **(estimate)** | **$270 / $450 / $900 a month** at 1k / 10k / 100k **(estimate)** |

Sources: https://www.insureon.com/small-business-insurance/cyber-liability/cost (2026-10-01); https://www.insureon.com/small-business-insurance/errors-omissions/cost (2026-10-01). Get real quotes: insurers will ask about the security work in ARCHITECTURE.md section 7 and the language in BOUNDARY.md.

### 3.3 Counsel and immigration attorney review

The one attorney rate read in this pass: American Visa Law Group charges **$400 an hour for attorney time** and $100 an hour for a legal assistant. A consult is $300 for an hour or $200 for 30 minutes ($250 and $150 if prepaid). Source: https://www.usavisalaw.com/immigration-attorney-cost (2026-10-01). Privacy counsel rates were not read in this pass (clio.com refused the fetch). This file assumes the same order of magnitude **(estimate)**.

| Work | When | Cost |
|---|---|---|
| Privacy counsel setup: privacy notice, terms, consent wording, the decision 19.33 brief (Maryland "strictly necessary", SCA, 1225(d), crypto-shred as deletion, minors, store rules on delayed deletion), state privacy laws including Connecticut's no-threshold rule for sensitive data | Before the first stranger | $10k to $30k one time **(estimate: 25 to 75 hours)** |
| Counsel, ongoing: policy updates, a government request, renewal-law changes | Monthly | $500 / $800 / $2,000 at 1k / 10k / 100k **(estimate)** |
| Immigration attorney: first review of rule packs, guides and Ask templates | Before the first stranger | $12k to $24k one time **(estimate: 30 to 60 hours at $400)** |
| Immigration attorney: ongoing review of law updates and new guides | Monthly | 2 / 4 / 8 hours, so $800 / $1,600 / $3,200 **(estimate)** |

D14 records "none retained". The attorney lines are priced so the choice is visible, not decided here. They also bear on marketing: the FTC's DoNotPay order turned on the company not having attorneys test its legal features (research-assistant.md cites the FTC release).

### 3.4 Security audits and pen tests

| Item | Market range | Duly (estimate) |
|---|---|---|
| Web application pen test | $5,000 to $50,000 | |
| Mobile application pen test | $5,000 to $40,000 | |
| API pen test | $5,000 to $30,000 | |
| Cloud pen test | $5,000 to $50,000 | |
| Typical engagement | $5,000 to $30,000 | |
| **Before the first stranger** (ARCHITECTURE.md section 7.4): targeted crypto review before sync; full crypto audit before backup; pen test of identity, pairing and relay; focused pen test of the Ask gateway; cloud config review | | **$65k to $170k (estimate)**. ARCHITECTURE.md guessed $150k to $300k (unverified). Get quotes |
| **Ongoing**: yearly pen test and retest, config review, VDP handling, incident-response retainer | | $15k / $30k / $60k a year at 1k / 10k / 100k, so **$1,250 / $2,500 / $5,000 a month (estimate)** |

Source for the ranges: Astra Security, "Penetration testing cost", updated 2026-08-19, https://www.getastra.com/blog/security-audit/penetration-testing-cost/ (2026-10-01). Crypto audits by specialist firms are quote-only. No public price was found in this pass.

### 3.5 Company administration

Bookkeeping, tax filing, registered agent and state fees: **$150 / $250 / $500 a month (estimate)**.

---

## 4. Upkeep: rules, support, maintenance and founder time

### 4.1 Keeping the rule packs current (estimate)

| Task | Calm month | Month with a legal event (for example the 2026-09-14 injunction of the fixed-admission rule) |
|---|---|---|
| Watch sources, triage detected changes (the law-update pipeline drafts; a person checks) | 4 to 8 h | 15 to 30 h |
| Write the rule row, quote and status tag, then two checks (CLAUDE.md publish blockers) | 3 to 6 h | 15 to 25 h |
| Founder approval in Ops, recompute, notice copy | 2 to 4 h | 5 to 10 h |
| Rerun evals and golden vectors; fix guides and Ask templates | 2 to 4 h | 5 to 10 h |
| School steps (generic in v1; students add their own) | 1 to 2 h | 1 to 2 h |
| **Total** | **12 to 24 h** | **40 to 75 h** |

This file averages 20 / 30 / 60 hours a month at 1k / 10k / 100k students. More students bring more schools, more questions and more categories. At **$60 an hour (estimate**, for a paralegal-level contractor) that is **$1,200 / $1,800 / $3,600 a month**. Attorney review is separate (section 3.3).

### 4.2 Customer support (estimate)

Assume 1% of students write in each month and each case takes 10 minutes. That is **1.7 / 17 / 167 hours a month** at 1k / 10k / 100k. At the BLS median of $21.53 an hour for customer service representatives (May 2025), loaded to about $28, it costs **$0.047 per student a month**: $47 / $467 / $4,667. Good in-app explanations that halve the contact rate save about $2,300 a month at 100k. Source: https://www.bls.gov/ooh/office-and-administrative-support/customer-service-representatives.htm (2026-10-01).

### 4.3 Engineering maintenance

Electron, Expo and OS upgrades, store review changes, dependency and security patches, the Rust core, and rule-engine fixes. This is founder or factory time, about **30 to 60 hours a month (estimate)**. It is not priced in cash below, because D45 runs the agents on the subscription in section 3.1.

### 4.4 Founder time

The BLS median wage for software developers was **$135,980 a year (May 2025)**, about **$11,332 a month**. This file uses it as the market value of the founder's time. Source: https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm (2026-10-01). If the founder does rule upkeep and support personally, the cash cost falls (view A in section 6). The hours do not: at 100k students, that is about 230 hours a month of upkeep and support, which one person cannot carry next to engineering.

---

## 5. Payment fees and the margin per payer

| Channel | Fee | On $39 a year | On $4.99 a month | Source |
|---|---|---|---|---|
| Stripe, US card | 2.9% + $0.30 | $1.43 | $0.44 | https://stripe.com/pricing (2026-10-01) |
| Stripe add-ons | Billing 0.7% of volume; international cards +1.5%; currency conversion +1%; Stripe Tax Basic 0.5% | Blended with 30% international cards: **$2.07 (5.3%)** | **$0.53 (10.6%)** | same |
| Paddle, merchant of record (handles sales tax) | 5% + $0.50 | $2.45 (6.3%) | $0.75 (15%) | https://www.paddle.com/pricing (2026-10-01) |
| Apple in-app purchase | 15% in the Small Business Program (no more than $1M proceeds a year), and 15% on subscriptions after the first year | $5.85 | $0.75 | https://developer.apple.com/programs/whats-included/ ; https://developer.apple.com/app-store/small-business-program/ (2026-10-01) |
| Apple, link to the web from a US app | US storefront apps may include buttons and external links without an entitlement (guideline 3.1.1(a)). The Ninth Circuit (2025-12-11) allowed a "reasonable" commission, but none is in effect until the district court sets one. Recheck before launch | $0 today, pending | | https://developer.apple.com/app-store/review/guidelines/ (2026-10-01); https://www.macrumors.com/2025/12/11/apple-app-store-fees-external-payment-links/ (2026-10-01) |
| Google Play, US | From 2026-06-30: auto-renewing subscriptions **10% + 5% billing fee** through Play Billing | $5.85 | $0.75 | https://support.google.com/googleplay/android-developer/answer/112622 (2026-10-01) |

Monthly billing loses about twice the share of annual billing to fees. It also keeps fewer students: market.md cites RevenueCat, with 44% of annual subscribers and 17% of monthly subscribers still paying after a year. Sell the yearly plan first and sell on the web.

**Contribution per payer per year at $39 (estimate):**

| Line | Opus 4.8, no cache | Sonnet 5.5, cached |
|---|---|---|
| Price | $39.00 | $39.00 |
| Stripe and add-ons | -$2.07 | -$2.07 |
| Ask, 10 questions a month | -$5.28 | -$1.68 |
| Extra backup storage | -$0.60 | -$0.60 |
| Support | -$0.56 | -$0.56 |
| **Contribution** | **$30.49 (78%)** | **$34.09 (87%)** |

---

## 6. The full cost model at 1k, 10k and 100k students

Base case: 6% of students pay (a blend of yearly at $39 and monthly at $4.99 kept about 5 months), 2% buy a $12 season pass each year, Ask on Opus 4.8 with no cache, support at 1%. The three views:
- **A, cash only.** The founder does upkeep and support unpaid.
- **B, paid help.** Rule upkeep, attorney review and support are paid; the founder works on engineering unpaid.
- **C.** B plus the founder paid at market.

### 6.1 Monthly, view B, base case

| Line | Type | 1k | 10k | 100k |
|---|---|---|---|---|
| Cloud (section 1) | Step-fixed | $465 | $1,020 | $3,530 |
| Ask (section 2) | Variable | $68 | $678 | $6,776 |
| Payment fees | Variable | $15 | $148 | $1,481 |
| Payer storage | Variable | $3 | $30 | $300 |
| Support | Variable | $47 | $467 | $4,667 |
| Tools (3.1) | Fixed | $196 | $361 | $674 |
| Insurance (3.2) | Fixed | $270 | $450 | $900 |
| Counsel, ongoing (3.3) | Fixed | $500 | $800 | $2,000 |
| Immigration attorney review (3.3) | Fixed | $800 | $1,600 | $3,200 |
| Rule upkeep (4.1) | Fixed | $1,200 | $1,800 | $3,600 |
| Security, ongoing (3.4) | Fixed | $1,250 | $2,500 | $5,000 |
| Company administration | Fixed | $150 | $250 | $500 |
| **Total, view B** | | **$4,964** | **$10,104** | **$32,628** |
| of which variable | | $133 | $1,323 | $13,224 |
| Per student a month | | $4.96 | $1.01 | $0.33 |
| **View A total** (no paid upkeep, attorney or support) | | $2,917 | $6,237 | $21,161 |
| **View C total** (B plus founder at $11,332) | | $16,296 | $21,436 | $43,960 |
| **Yearly, view B** | | **$59.6k** | **$121.2k** | **$391.5k** |
| Yearly, view C | | $195.6k | $257.2k | $527.5k |
| Revenue at 6% paying | | $197 | $1,974 | $19,744 |

With Sonnet 5.5 cached instead of Opus 4.8, Ask falls to $22 / $216 / $2,156, and view B totals fall to $4,917 / $9,641 / $28,008.

### 6.2 One-time costs before the first stranger (estimate)

| Item | Cost |
|---|---|
| Security reviews and pen tests (3.4) | $65k to $170k |
| Privacy counsel setup (3.3) | $10k to $30k |
| Immigration attorney first review (3.3) | $12k to $24k |
| Paid, consented Ask eval corpus in several languages, two annotators (decision 19.24) | $3k to $10k |
| Company formation, Apple, Google, signing identity | $0.6k to $2k |
| **Total** | **about $90k to $236k** |

### 6.3 Share of students who must pay at $39 a year (estimate)

With the cost levers on: Sonnet 5.5 cached (needs `none` verified), support contacts at 0.5%, a 5-question free Ask allowance, and season passes.

| Students | View | Break even | 25% margin |
|---|---|---|---|
| 10k | A cash only | 21% | 30% |
| 10k | B paid help | 35% | 50% |
| 100k | A cash only | **4.7%** | 7.0% |
| 100k | B paid help | **8.3%** | 12.0% |
| 100k | C founder paid | 12.7% | 18.2% |

The same at **$49 a year**: 100k view B breaks even at 6.8%; view C at 10.4%. At **$79 a year** (the founder's earlier research): view B 4.3%, view C 6.6%. With Opus 4.8 and no cache, add about 2 to 3 points to every 100k figure.

**What this means.** At 1k and 10k students, no student-fair price covers the fixed stack. Those stages are funded, not earned. At 100k, $39 a year covers cash costs at about 5% paying. It covers paid help at about 8%, which is above what market.md expects (2% to 3%), and close to legal-tech's 5.6% average. Moving the price within the fair band ($29 to $49) moves the line by only about 2 to 4 points. Volume, the cost levers and a second revenue line move it more.

---

## 7. Assumptions (all estimates unless sourced above)

- Students: 1k, 10k, 100k on the platform. Half open the app in a given month.
- Ask: 5,000 input tokens (3,500 cacheable), 600 output on Opus 4.8, 900 on Sonnet 5.5 and Opus 5.5. Free students average 1 question a month under a 5-question allowance. Payers average 10. Crisis and enforcement questions never leave the device (D80), so they cost nothing.
- Payers: 75% yearly at $39, 25% monthly at $4.99 kept 5 months on average. 85% buy on the web, 15% through the stores. 30% of web cards are international.
- Season pass: 2% of all students a year at $12.
- Support: 1% of students a month, 10 minutes each, $28 an hour loaded. 0.5% in the levers case.
- Cloud from ARCHITECTURE.md section 16 without its Ask line: lean at 1k, full design at 10k and 100k.
- A school licence (section 8) is not in the section 6 numbers.
- Not included: marketing and acquisition, paid engineering staff, taxes on profit, and the cost of a breach beyond the insurance deductible.

---

## 8. Recommended pricing (Proposal), and how it reaches a margin

**Free, always (VALUE-2 section 4, unchanged).** All eight features, every date and count, reminders on every channel, the calendar file, documents, sharing, export, backup up to the default quota, delete, News with "For you". Ask is free up to **5 questions a month (Proposal)**. Ask never supplies a date or a count, since the engine does (D79). So a cap on Ask cannot make a student miss a date or act on a wrong number, and it passes VALUE-2's test. The founder may want a higher cap. Each extra free question a month across all students costs about $1,300 a month on Sonnet 5.5, or $4,100 on Opus 4.8, at 100k students (94k free students).

**Duly Plus: $39 a year, or $4.99 a month.**
- Ask up to the safety limit of 20 a day.
- 5 GB of encrypted backup instead of 250 MB.
- The formatted attorney or new-school packet, with full history and a document index.
- One F-2 family profile.
- Replies from a person within one working day.

$39 a year is $3.25 a month, 22% below TrackMyOPT Pro ($49.99 a year, $6.67 a month) and below the $6.99 student music plans in market.md. Unlike TrackMyOPT, reminders are never paid. Source for TrackMyOPT: https://www.trackmyopt.com/ (2026-10-01).

**One-time items, no renewal.** These suit a market that subscribes for one need and leaves:
- **Season pass, $12 for 3 months of Plus:** filing season, a trip, an H-1B petition.
- **Packet, $19,** without Plus.
- **F-2 family profile, $15 a year** on its own.

Fees on a $12 web sale are about $0.85.

**Fairness rules that also keep students coming back:**
- **Hardship price of $19 a year** on request, no proof needed (market.md).
- **Price lock** while the student stays on F-1, OPT or STEM OPT.
- A reminder 7 days before every renewal, cancel in one tap, a 14-day refund. California's renewal law already requires most of this (market.md).
- **Pause instead of cancel** between seasons.
- No paywall on anything safety-related, as a build gate (VALUE-2).
- Market anchors read 2026-10-01:
  - Lawfully: $14.99 a month, $154.99 a year (https://apps.apple.com/us/app/lawfully-case-tracker/id1435063223).
  - VisaBuddy: $3.99 a month (https://www.visabuddyapp.com/).
  - Duly sits at the low end of what students already pay.

**What closes the gap to a good margin, in order of effect at 100k students (estimate):**
1. **Verify a cheaper model for retention `none` (Sonnet 5.5, then Haiku 4.5), and verify that caching is allowed under it.** Saves about $4,600 a month against Opus 4.8. This is decision 19.21. Call `GET /v1/models/{id}` before any budget.
2. **A school licence** (market.md; the Sprintax and Interstride pattern). A university pays for Plus for its students, for example $2 a student a year. Covering 20% of 100k students brings in about $3,300 a month **(estimate; prices are quote-only in this market)**.
3. **Fewer support contacts** through clear in-app explanations: about $2,300 a month at a 0.5% contact rate.
4. **Following students into H-1B** keeps payers longer, since students leave when their status changes, not because they are unhappy (market.md).
5. **Test the price before building billing.** Use a fake-door checkout at $29, $39 and $45 a year, all below TrackMyOPT Pro. If $45 converts no more than about 15% worse than $39, it earns more **(estimate)**.

**Why not $79 a year?** The founder's earlier research recommended it (docs/research/founder, "Duly market and pricing validation"). That plan charged for the document vault, which VALUE-2 now keeps free. VALUE-2 also prices paid extras below TrackMyOPT Pro. $79 would cover costs at a lower paying share. But it reads as the price of a professional consult to this market, and it would test the "fair to students" rule the founder set.

---

## 9. Open decisions for the founder

1. Free Ask allowance: 5 questions a month (recommended), more, or unlimited within the 20-a-day limit (costs in section 2).
2. Ask model: verify `none` for Sonnet 5.5 and Haiku 4.5 now, since that is the largest cost lever. Until then the budget assumes Opus 4.8.
3. Price for the fake-door test: $29, $39 and $45 (recommended), or include $49.
4. Attorney review: retain one for the first review and monthly updates (section 3.3), or keep D14's "none retained" and accept the marketing limits that follow.
5. Funding for the one-time $90k to $236k and for operating losses until about 100k students, or a school channel sooner.
6. Billing provider: Stripe with Stripe Tax (cheaper, recommended), or Paddle as merchant of record (simpler for tax).

---

## Sources (all read 2026-10-01 unless marked)

- AWS Price List API: AmazonECS, AmazonRDS, AmazonSNS and AmazonBedrockFoundationModels offers for us-west-2, under https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/
- https://aws.amazon.com/s3/pricing/ ; https://aws.amazon.com/cloudfront/pricing/ ; https://aws.amazon.com/vpc/pricing/ ; https://aws.amazon.com/ses/pricing/ ; https://aws.amazon.com/route53/pricing/
- https://developer.apple.com/programs/whats-included/ ; https://developer.apple.com/app-store/small-business-program/ ; https://developer.apple.com/app-store/review/guidelines/
- https://support.google.com/googleplay/android-developer/answer/6112435 ; https://support.google.com/googleplay/android-developer/answer/112622
- https://prices.azure.com/api/retail/prices (Trusted Signing) ; https://azure.microsoft.com/en-us/pricing/details/artifact-signing/ ; https://learn.microsoft.com/en-us/azure/artifact-signing/faq
- https://stripe.com/pricing ; https://www.paddle.com/pricing
- https://sentry.io/pricing/ ; https://github.com/pricing ; https://1password.com/pricing/business ; https://workspace.google.com/pricing ; https://www.helpscout.com/pricing/ ; https://claude.com/pricing
- https://www.insureon.com/small-business-insurance/cyber-liability/cost ; https://www.insureon.com/small-business-insurance/errors-omissions/cost
- https://www.getastra.com/blog/security-audit/penetration-testing-cost/ (updated 2026-08-19)
- https://www.usavisalaw.com/immigration-attorney-cost
- https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm ; https://www.bls.gov/ooh/office-and-administrative-support/customer-service-representatives.htm
- https://www.macrumors.com/2025/12/11/apple-app-store-fees-external-payment-links/
- https://www.trackmyopt.com/ ; https://apps.apple.com/us/app/lawfully-case-tracker/id1435063223 ; https://www.visabuddyapp.com/
- Project files: specs/duly-2/ARCHITECTURE.md (sections 0, 7.4, 8, 16, 18, 19, 20), specs/duly-2/business/market.md, specs/ui-2/VALUE-2.md, specs/ui-2/competitor/ANALYSIS.md (removed from the repo on 2026-10-03, D100; in git history at 67bbc33), DECISIONS.md, docs/research/founder/Duly market and pricing validation.md
