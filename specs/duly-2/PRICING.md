# Duly pricing: what it costs to run, and a fair price that covers it

Status: research for the founder, 2026-10-01, **reviewed adversarially the same day** (section 8 lists what the review changed). A Proposal, not a decision: D8 (pricing) is still parked. Builds on business/costs.md, business/market.md and business/channels.md (same date), ARCHITECTURE.md sections 0, 8, 16, 18 and 19, specs/ui-2/VALUE-2.md section 4 and specs/ui-2/competitor/ANALYSIS.md (removed from the repo on 2026-10-03, D100; in git history at 67bbc33).

How to read it: every external number carries its source URL and the date it was read. **(est.)** marks arithmetic or judgement in this file. The model behind every table is business/pricing_model.py (run `python3 specs/duly-2/business/pricing_model.py`); the reviewed figures are its **v4** blocks, and the earlier v1 to v3 blocks are kept only for the option comparison in 4.1. Ask costs are shown two ways: **Opus 4.8** (the only model cleared today for Bedrock retention `none`) and **Sonnet 5.5 with caching** (cheaper, not yet cleared).

---

## 1. The answer on one page

1. **Running Duly costs about $2.8k a month at 1k students, $5.4k at 10k and $12.6k at 100k in cash**, with the founder doing rule upkeep and support unpaid (view A, est.). Paying for rule upkeep, attorney review and support (view B) adds about $2k a month at 1k and $11.5k at 100k. Paying the founder at market (view C) adds $11.3k. Ask adds about $26 to $52 a month at 1k students and $2.1k to $6.6k at 100k (Sonnet to Opus, est.). Selling to schools adds about $2.5k a month of compliance work (est.). Before the first outside user there is a one-time **$90k to $236k** for security reviews, counsel and attorney review (est., costs.md section 6.2).
2. **The cloud is the small part.** About $0.47 per student a month at 1k students, $0.10 at 10k and $0.035 at 100k. People, security, counsel and insurance are most of the bill.
3. **Each sale earns a healthy margin.** Duly Plus at $39 a year keeps $28 to $32 after card fees, refunds, Ask, storage and support: **73% to 82% per payer on the web**, 64% to 73% through the app stores (est.).
4. **The company does not earn a margin at a fair price until it is large, and may not with paid help.** In the reviewed base case (about 2% of students holding Plus, schools covering 10% from about 50k students), Duly takes in about **$50 a month at 1k students, $500 at 10k and $16k at 100k** (est.). That leaves:

| Students | Revenue a month | Net, view A (cash) | Net, view B (paid help) | Net, view C (founder paid) |
|---|---|---|---|---|
| 1k | $50 | -$2.8k | -$4.9k | -$16.2k |
| 10k | $500 | -$5.1k to -$5.5k | -$9.0k to -$9.3k | -$20.3k to -$20.7k |
| 100k | $16.0k | -$2.2k to -$6.7k | -$13.7k to -$18.2k | -$25.1k to -$29.5k |

   (Sonnet to Opus; launch prices at 1k and 10k, list prices at 100k; est.)
5. **Break-even (base case, est.): cash costs at about 117k to 180k students; paid help at about 268k to 595k; the founder paid as well at about 407k to 903k.** For scale: about 1.18M international students are in the US and 290k to 380k are on OPT or STEM OPT (section 3). Only the good case (3.75% holding Plus, schools covering 20%) covers paid help near 100k to 145k students. The earlier draft's 40k to 90k cash break-even rested on optimistic conversion and a monthly plan the recommendation drops (section 8).
6. **Price is not the lever.** Moving Plus from $29 to $49 changes the 100k result by about $1.3k a month (section 4.4). What moves it: how many students hold Plus, the school seat price, the Ask model and support load.
7. **Recommended prices (Proposal):**

| What | Price | Notes |
|---|---|---|
| The whole core | **Free, always** | Every date, count, reminder, document, backup to 250 MB, export, delete, News, an F-2 family member's papers and reminders. Plus 5 Ask questions a month |
| Duly Plus, yearly | **$39 a year** ($3.25 a month) | Auto-renews with a reminder, or buy it as a one-year pass that does not renew, same price |
| Season pass | **$12 for 3 months**, no renewal | For filing season, a job change or the H-1B months. Replaces a monthly plan |
| Stay pass | **$69 once**, Plus for up to 36 months | Covers OPT and STEM OPT. $59 during the launch year |
| Hardship price | **$19 a year**, on request, no proof | Still earns $10 to $14 a year per payer |
| Schools | **$12 per covered student a year** (Proposal range $10 to $15), or a site licence | Free to the student; the school sees no student data. Raised from $6: at $6 the channel barely pays for its own compliance work |
| Launch | **Founding price $29 a year** for the first 12 months of sales, held while the student stays on F-1, OPT or STEM OPT | Costs about $1.1k a year at 10k students |

$39 a year is 22% below TrackMyOPT Pro ($49.99 a year) and about half the $6.99 a month students already pay for music. Unlike TrackMyOPT, reminders and the document vault stay free.

**Plan the company on view A plus outside funding until about 100k students**, keep the fixed stack lean, and treat schools as the channel that decides whether paid help is ever covered.

---

## 2. Costs and upkeep

### 2.1 Fixed costs, monthly (from costs.md, prices read 2026-10-01)

| Line | 1k | 10k | 100k | Basis |
|---|---|---|---|---|
| Cloud, without Ask (AWS) | $465 | $1,020 | $3,530 | ARCHITECTURE.md 16, unit prices rechecked in costs.md 1 |
| Tools: Apple $99 a year, Google $25 once, Windows signing $9.99 a month, Sentry, GitHub, Workspace, 1Password, Help Scout, Claude Max for the agents | $196 | $361 | $674 | costs.md 3.1, each with its URL |
| Cyber and tech E&O insurance | $270 | $450 | $900 | est.; Insureon averages $179 and $88 a month (costs.md 3.2) |
| Counsel, ongoing | $500 | $800 | $2,000 | est. |
| Security: yearly pen test, config review, incident retainer | $1,250 | $2,500 | $5,000 | est.; Astra ranges (costs.md 3.4) |
| Company admin: bookkeeping, tax, agent | $150 | $250 | $500 | est. |
| **A. Cash, founder does upkeep and support** | **$2,831** | **$5,381** | **$12,604** | |
| Immigration attorney review (2, 4, 8 hours at $400) | $800 | $1,600 | $3,200 | $400 an hour from usavisalaw.com (costs.md 3.3); hours est.; D14 says none retained |
| Rule upkeep by a contractor (20, 30, 60 hours at $60) | $1,200 | $1,800 | $3,600 | est. |
| **B. With paid help** (support is in 2.2) | **$4,831** | **$8,781** | **$19,404** | |
| Founder at the BLS median developer wage | $11,332 | $11,332 | $11,332 | BLS, $135,980 a year (costs.md 4.4) |
| **C. With the founder paid** | **$16,163** | **$20,113** | **$30,736** | |
| School channel, only once schools pay: SOC 2 Type II upkeep, security questionnaires, contract review | $2,500 | $2,500 | $2,500 | est.; Vanta puts a first SOC 2 at $10,000 to $80,000 all in, audit alone $10,000 to $50,000, https://www.vanta.com/collection/soc-2/soc-2-audit-cost (2026-10-01, page undated) |

### 2.2 Variable costs, per student per month (est.)

| Item | Opus 4.8 | Sonnet 5.5 cached | Notes |
|---|---|---|---|
| Ask, one question | $0.044 | $0.014 at 100k; $0.016 at 10k; $0.022 at 1k | About 5,000 tokens in, 600 to 900 out (costs.md 2). At low volume the 5-minute cache is often cold, so a question pays the cache write (3,500 tokens at $2.75 per million) |
| Free student: about 1 question a month under a 5-question allowance | one question | one question | Crisis and enforcement questions stay on the device (D80) and cost nothing |
| Plus student: about 10 questions a month | $0.44 | $0.14 | Under the 20-a-day limit |
| School-covered student: about 4 questions a month | $0.18 | $0.06 | |
| Plus storage, 5 GB quota, few fill it | $0.05 | $0.05 | |
| Support: 1% of students write in, 10 minutes, $28 an hour | $0.047 | $0.047 | BLS median $21.53, loaded (views B and C) |
| **One free student, per year** | **$1.09** | **$0.73 to $0.83** | $0.45 at 100k if support contacts halve |
| Card fees | 5.6% of $39 on Stripe (with Billing, Stripe Tax and 30% foreign cards) | | 15% through Apple or Google (section 4.5) |
| Refunds | 4.86% of consumer sales, fees not returned | | RevenueCat 2025, Education apps, https://www.revenuecat.com/state-of-subscription-apps-2025/ (2026-10-01) |

### 2.3 Maintenance work, hours a month (est., costs.md 4)

| Work | Calm month | Month with a legal change | Who |
|---|---|---|---|
| Keep rule packs current: watch, triage, write row and quote, two checks, approve, rerun evals | 12 to 24 | 40 to 75 | Founder or contractor |
| Attorney review of new guides and updates | 2 to 8 | more | Attorney, if retained |
| Engineering: Electron, Expo, OS and store changes, patches, Rust core, engine fixes | 30 to 60 | 30 to 60 | Founder and agents |
| Support | 2 (1k) / 17 (10k) / 167 (100k) | more | Founder, then hired |
| Security: yearly pen test and retest, disclosure handling | spread over the year | | Outside firm |

At 100k students the upkeep and support alone are about 230 hours a month. One person cannot carry that next to engineering, so view A is a floor, not a plan, past about 30k students (est.).

### 2.4 Cost per student per month at each scale (3% hold Plus, est.)

| View | Ask model | 1k | 10k | 100k |
|---|---|---|---|---|
| A, cash | Opus 4.8 | $2.89 | $0.60 | $0.18 |
| A, cash | Sonnet 5.5 | $2.85 | $0.56 | $0.15 |
| B, paid help | Opus 4.8 | $4.94 | $0.98 | $0.30 |
| B, paid help | Sonnet 5.5 | $4.90 | $0.94 | $0.26 |
| C, founder paid | Opus 4.8 | $16.27 | $2.12 | $0.41 |

Per student on the platform; about half open Duly in a month, so per **active** student the cost is double: $0.30 to $0.82 at 100k. For comparison, a Plus payer at $39 a year brings $3.25 a month, but only about 2 in 100 students pay (section 3).

---

## 3. The market

| Fact | Number | Source, read date |
|---|---|---|
| International students, 2024/25 | 1,177,766; 294,253 on OPT | https://opendoorsdata.org/wp-content/uploads/2025/11/OD25_Fast-Facts.pdf (2026-10-01) |
| OPT / STEM OPT, calendar 2024 | 194,554 / 165,524 | https://www.ice.gov/doclib/sevis/btn/25_0605_2024-sevis-btn.pdf (2026-10-01) |
| New enrolment, fall 2025 | down 17% | https://www.nafsa.org/about/about-nafsa/international-students-contributed-43-billion-us-economy-2024-2025-fall-2025 (2026-10-01) |
| Funded mainly by family / by a job | 51.5% / 25.2% | Open Doors Fast Facts (above) |
| Rupees per dollar | 95.81 (2026-09-25) | https://www.federalreserve.gov/releases/h10/current/ (2026-10-01) |
| TrackMyOPT | Free: OPT and STEM calculators, unemployment tracker, manual USCIS check. Pro $49.99 a year ($4.17 a month) or $6.67 monthly, $0.99 seven-day trial, adds daily email reminders and the document vault with expiry reminders. Dedicated $149.99 a year ($12.50 a month) | https://trackmyopt.com/pricing (2026-10-01) |
| TrackMyOPT reach | "3,000+ users have signed up" | https://www.trackmyopt.com/ (read 2026-09-28, via market.md 1) |
| Lawfully | $14.99 a month, $154.99 a year | https://apps.apple.com/us/app/lawfully-case-tracker/id1435063223 (2026-10-01) |
| Spotify and Apple Music student plans | $6.99 a month, 42% to 46% off | https://www.spotify.com/us/student/ ; https://www.apple.com/apple-music/ (2026-10-01) |
| Freemium download to paid by day 35, median / top quartile | 2.1% / above 4.5% | https://www.revenuecat.com/state-of-subscription-apps-2026/ (2026-10-01) |
| Download to paid, low-priced / high-priced apps | 1.5% / 2.7% | https://www.revenuecat.com/state-of-subscription-apps-2025/ (2026-10-01) |
| Still paying after a year: yearly / monthly plans | 44.1% / 17.0% | same |
| Yearly plans cancelled in the first month | "nearly 30%" | same |
| Trial starts on the day of install | 82% | same |
| Freemium to paid, legal tech / edtech (mostly B2B SaaS) | 5.6% / 2.1% | https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/ (2026-10-01) |
| Education apps, median yearly price | $44.99 | RevenueCat 2026 (above). The Productivity median of $24.95 is from market.md 4 and was not found again on the page this pass |
| School software: sunapsis at renewal | $9,648 to $34,950 a year | https://sunapsis.iu.edu/pricing/index.html (2026-10-01) |

What it means (est.):
- **Who pays.** Students in their program spend family money in rupees or yuan: $39 is about ₹3,737. Students on OPT and STEM OPT earn US salaries and carry the most dates. Most payers will come from them.
- **How long.** A STEM master's student needs Duly 3 to 5 years; non-STEM 1.5 to 3. They leave when status changes, not because they are unhappy. A yearly payer renewing at about 50% pays for about 2 years: about $61 to $68 net.
- **Conversion, read as a share holding Plus at any time.** The 2.1% median is a share of downloads that pay by day 35, and most conversions happen early (82% of trial starts are on install day). A cohort where about 3% to 4% ever pay, each paying for about 1.8 years of a 3-year stay, gives **about 2% holding Plus at any time** (base). The draft added 2% yearly holders to 2% Stay pass holders plus season passes, about 4% to 5% at once, which is legal-tech's average for a product whose paid tier is thin by design. Low case 1%, good case 3.75%.
- **Usage.** RevenueCat's top cancellation reason on Google is "not enough usage". Duly is opened about once a month by half its students, so yearly renewal may fall below the 44% median. Watch it from month 13.
- **Price barely moves conversion in the data.** Higher-priced apps convert better (2.7% against 1.5%), but that is a correlation across categories, not a test of Duly's price. The fake-door test (5.5) is the real check.
- **Reach.** Plan on 10k to 25k students in year 1, and 50k to 100k only with schools (market.md 1). 100k is about 8.5% of all international students.

---

## 4. Options compared

### 4.1 Four ways to charge, each on its own (draft rates, for comparison only, est.)

These use the draft's conversion rates, which the review judges optimistic (section 8). Read them to rank the options against each other, not to plan. All four keep the core free. "Never" means each added student costs more than it earns at that conversion.

| Option | Price | Draft conversion | Revenue a year at 10k / 100k | Gross margin per payer (Opus / Sonnet) | Break-even students, A (Opus / Sonnet) | Break-even students, B (Opus / Sonnet) | Share paying needed at 100k, A / B (Sonnet) |
|---|---|---|---|---|---|---|---|
| 1. Monthly plan only | $4.99 a month | 1.5% paying at any time | $9.0k / $89.8k | 79% / 85% | 818k / 255k | never / never | 3.3% / 6.0% |
| 2. Yearly first | $39 a year, or $4.99 a month; $12 season pass | 2.5% paying, 75% of them yearly; 1% buy a season pass a year | $12.3k / $122.6k | 78% / 86% | 341k / 170k | never / 704k | 4.1% / 7.7% |
| 3. Stay pass | $69 once, up to 36 months | 1.5% of students buy each year, hold about 2 years | $10.4k / $103.5k | 77% / 87% | 538k / 205k | never / 1.33M | 2.8% / 5.1% |
| 4. School-paid seats at $6 | $6 per covered student a year | 20% of students covered | $12.0k / $120.0k | 55% / 79% | 644k / 187k | never / 949k | 34% / 63% covered |

What the table says:
- **No single option pays for Duly at a fair price.** Each earns about $0.08 to $0.14 per student a month, against $0.06 to $0.09 a month that a free student costs in Ask and support.
- **Monthly alone is the weakest.** It keeps 17% of payers after a year and loses 11% of each charge to fees.
- **The Stay pass needs the smallest share of payers** because it collects up front and has no renewal to lose. It suits students who distrust subscriptions. It may draw long-stay students who would have paid more on yearly (watch the mix).
- **School seats at $6 barely pay.** A school-covered student asks more than a free one, and selling to schools brings compliance work (2.1) and a sales cycle. They are not free to acquire. At $12 the channel works (4.3).

### 4.2 The recommended plan (reviewed, est.)

Prices: yearly $39 (at 100k, 70% of yearly payers at list, 20% on the founding $29, 10% at the $19 hardship price; at 1k and 10k the launch year: 90% at $29, 10% at $19), Stay pass $69 ($59 at launch), season pass $12, school seats $12. 85% of sales on the web. Refunds 4.86%.

| Case | Holding Plus at any time | Season passes a year | Schools cover |
|---|---|---|---|
| Low | 1.0% (yearly 0.7%, Stay pass 0.15% of students buy a year) | 0.25% | none |
| **Base** | **2.1% (yearly 1.25%, Stay pass 0.375% buy a year)** | 0.5% | 10% from about 50k students |
| Good | 3.75% (yearly 2%, Stay pass 0.75% buy a year) | 1% | 10% at 10k, 20% at 100k |

| Case | Ask model | Revenue a month, 1k / 10k / 100k | Net a month at 100k, A / B / C | Net margin at 100k, view B | Break-even students, A / B / C |
|---|---|---|---|---|---|
| Low | Opus 4.8 | $25 / $249 / $3.0k | -$14.7k / -$26.2k / -$37.5k | n/a | never / never / never |
| Low | Sonnet 5.5 | $25 / $249 / $3.0k | -$11.4k / -$22.9k / -$34.2k | n/a | 1.06M / never / never |
| **Base** | Opus 4.8 | $50 / $500 / $16.0k | -$6.7k / -$18.2k / -$29.5k | -114% | 180k / 595k / 903k |
| **Base** | Sonnet 5.5 | $50 / $500 / $16.0k | -$2.2k / -$13.7k / -$25.1k | -86% | 117k / 268k / 407k |
| Base, support contacts halved | Sonnet 5.5 | same | -$2.2k / -$11.4k / -$22.7k | -71% | 117k / 209k / 318k |
| Good | Opus 4.8 | $89 / $1.9k / $30.6k | +$5.0k / -$6.5k / -$17.8k | -21% | 58k / 143k / 215k |
| Good | Sonnet 5.5 | $89 / $1.9k / $30.6k | +$10.8k / -$0.7k / -$12.0k | -2% | 50k / 103k / 157k |

At 1k students every case loses about $2.8k a month in cash and $4.9k with paid help. At 10k, $5.1k to $6.8k in cash. In the good case, starting schools at 10k makes 10k worse (the $2.5k compliance cost outruns $12 seats on 1,000 students), so start school sales when a pipeline of several schools is real, not with the first one.

### 4.3 What one sale earns (web, after fees, refunds, Ask, storage and support; est.)

| Product | Price | Fees | Refunds | Cost to serve, Opus / Sonnet | Contribution, Opus / Sonnet |
|---|---|---|---|---|---|
| Plus yearly, web | $39 | $2.19 | $1.90 | $6.44 / $2.84 | $28.47 (73%) / $32.07 (82%) |
| Plus yearly, App Store or Play | $39 | $5.85 | $1.90 | same | $24.81 (64%) / $28.41 (73%) |
| Season pass, 3 months | $12 | $0.80 | $0.58 | $1.61 / $0.71 | $9.01 (75%) / $9.91 (83%) |
| Stay pass, held 24 months | $69 | $3.16 | $3.35 | $12.89 / $5.69 | $49.60 (72%) / $56.80 (82%) |
| Stay pass, held all 36 months | $69 | $3.16 | $3.35 | $19.33 / $8.53 | $43.16 (63%) / $53.96 (78%) |
| Founding price | $29 | $1.71 | $1.41 | $6.44 / $2.84 | $19.44 (67%) / $23.04 (79%) |
| Hardship price | $19 | $1.22 | $0.92 | $6.44 / $2.84 | $10.42 (55%) / $14.02 (74%) |
| School seat at $6 (about 4 questions a month) | $6 | about $0 (invoice) | | $3.28 / $1.84 | $2.72 / $4.16 |
| **School seat at $12** | $12 | about $0 | | $3.28 / $1.84 | **$8.72 / $10.16** |

### 4.4 Levers at 100k students, base case, view B (net a month, Opus / Sonnet, est.)

| Change from the base | Net a month | Net margin |
|---|---|---|
| Base, school seats at $6 | -$23.2k / -$18.7k | -211% / -170% |
| Plus at $29 instead of $39, same conversion | -$23.9k / -$19.4k | |
| Plus at $49, same conversion | -$22.6k / -$18.1k | |
| Plus at $49, 20% fewer yearly payers | -$23.2k / -$18.8k | |
| Support contacts halved | -$20.9k / -$16.4k | |
| School seats at $12 (recommended) | -$18.2k / -$13.7k | -114% / -86% |
| Schools cover 20% at $12 | -$10.0k / -$4.7k | -39% / -18% |
| Schools cover 20% at $12, support halved | -$7.7k / -$2.3k | -30% / -9% |
| Schools cover 30% at $12, support halved | +$0.5k / +$6.8k | +1% / +19% |

Share of students that must hold Plus at 100k with no schools, list prices: **cash 5.7% (Sonnet) to 7.8% (Opus); paid help 10.5% to 13.3%; founder paid 15.2% to 18.6%**. That is two to six times the freemium median, so consumer sales alone will not carry paid help.

### 4.5 How app store commissions change it

| Channel | Fee | Source, read date |
|---|---|---|
| Stripe, US card | 2.9% + $0.30; Billing 0.7%; foreign card +1.5%; conversion +1% | https://stripe.com/pricing (2026-10-01) |
| Paddle (handles sales tax) | 5% + $0.50 | https://www.paddle.com/pricing (2026-10-01) |
| Apple, Small Business Program | 15% | https://developer.apple.com/app-store/small-business-program/ (2026-10-01) |
| Google Play subscriptions, US, from 2026-06-30 | 10% + 5% billing fee | https://support.google.com/googleplay/android-developer/answer/112622 (2026-10-01) |
| Apple, US link-out to the web | No entitlement needed today; a "reasonable commission" was allowed on 2025-12-11 but not yet set | https://developer.apple.com/app-store/review/guidelines/ ; https://www.macrumors.com/2025/12/11/apple-app-store-fees-external-payment-links/ (2026-10-01) |

- Per yearly payer: $36.81 kept all on the web, $33.15 all in the stores: the stores take about **$3.66 more per $39 sale (about 9% of the price)** (est.).
- At 100k students, moving from 85% web to 0% web costs about $1,050 a month (est.). Smaller than the Ask model choice or support load.
- The fixed 30 cents makes a $4.99 monthly charge lose 10.6% on Stripe, so lead with yearly and passes.
- Sell on the web; an account bought there unlocks Plus on Mac, Windows, iPhone and Android. Keep in-app purchase where a store requires it and budget 15%.

---

## 5. The recommendation

### 5.1 Free forever

Everything VALUE-2 section 4 makes free, unchanged: all eight features, every date and count, reminders on every channel, the calendar file, documents, sharing, export, backup up to 250 MB, delete, News with "For you", and the one-page summary. **Plus 5 Ask questions a month.** Ask never supplies a date or a count (the engine does, D79), so a limit on Ask cannot make a student miss a date or act on a wrong number: it passes VALUE-2's test. Crisis and enforcement questions are answered on the device (D80) and are never counted.

The review adds four rules so that no Plus feature, and no lapse of Plus, can make a student miss a date or lose a paper (VALUE-2's build gate):
1. **F-2 family papers stay free.** A spouse's or child's passport, I-20, visa and I-94, with their expiry reminders, can be kept free inside the student's own record. Plus adds only a separate full profile with its own view. This answers VALUE-2 open decision 5 in favour of free reminders.
2. **Immigration papers always back up.** Any document of a kind the engine reads (I-20, EAD, I-797, passport, visa, I-94) backs up even past the 250 MB quota; the quota applies to other files. Free backup keeps a deleted document recoverable for 30 days. Plus adds full version history and room for other files. Cost: small, since these files are few (est.).
3. **Nothing is deleted when Plus ends.** Backup above the free quota becomes read-only, never removed; restore and export always work; a family profile stays readable and its reminders keep firing.
4. **Safety reports get the same reply time for everyone.** A report of a wrong date or count, a missing or lost document, a failed backup or restore, or a security problem is answered on the same clock for free and Plus students. Plus buys a faster reply to other questions only.

### 5.2 Paid: Duly Plus

Ask up to the 20-a-day safety limit; 5 GB of encrypted backup for other files, with full version history; the formatted attorney or new-school packet with full history and a document index; one F-2 family profile with its own view; a faster reply from a person on questions that are not safety reports. The prices are in section 1.

### 5.3 Why these prices

- **Fair.** $39 sits below TrackMyOPT Pro ($49.99), below the $6.99 student plans, and under the Education yearly median ($44.99). TrackMyOPT charges for reminders and the vault; Duly does not.
- **Keeps students coming back.** Passes match how students spend: around events (OPT filing, a job change, the H-1B months, travel). No monthly auto-renewal means no surprise charges. The Stay pass removes renewal for the years that matter most. The price lock and hardship price are what students repeat in WhatsApp and Telegram groups.
- **Healthy margin per sale.** Every full-price product earns 72% to 83% per sale on the web after refunds (64% to 73% in the stores).
- **Why not more.** $49 earns about $650 a month more at 100k with conversion unchanged, and nothing if it costs a fifth of yearly payers (4.4). It also loses the "below TrackMyOPT" line and the trust that comes with it. $79 assumed a paid vault, which VALUE-2 has since made free.
- **Why not less.** $29 for everyone costs about $650 a month at 100k and adds little reach; the founding price and hardship price already serve the students who need it lower.
- **No monthly plan.** $4.99 a month loses about twice the share to fees, keeps 17% of payers after a year, and is where students get charged by surprise. The $12 season pass ($4 a month) covers the same need. If the fake-door test shows students want monthly, add $4.99 later.
- **Schools at $12, not $6.** A covered student is free to the student either way. $12 a student is $24k a year for a school with 2,000 international students, inside the $9.6k to $35k sunapsis charges (section 3). At $6 the seat earns $2.72 to $4.16 and the channel barely covers its own compliance cost.

### 5.4 Fairness rules (ship with billing)

1. Price held while the student stays on F-1, OPT or STEM OPT.
2. A reminder 7 days before every renewal; cancel in one tap on the web and in the app; refund within 14 days. California's renewal law already requires most of this (market.md 7.4).
3. Pause instead of cancel between seasons.
4. Hardship price on request, no proof asked.
5. One price everywhere, no pricing by country (channels.md 5.3).
6. Plus is offered only in Settings and when a student reaches for a paid extra; never on Home or next to a date (ANALYSIS.md 8, removed from the repo on 2026-10-03, D100; in git history at 67bbc33).
7. No trial bait, no fear in the sales copy, no bundled attorney consult (BOUNDARY).
8. The four rules in 5.1: F-2 papers free, immigration papers always back up, nothing deleted on lapse, safety reports answered on the same clock.
9. If Duly ever closes, Stay pass holders get a pro-rata refund and every student a full export (est. liability: at 100k in the base case about 750 open passes, under $30k).

### 5.5 Launch pricing

| Step | When | What |
|---|---|---|
| 1 | Before building billing | Fake-door checkout at $29, $39 and $45 a year (random split), ending in "join the list". Twenty interviews in student groups (market.md 9) |
| 2 | Launch | Free core plus 5 Ask questions. Plus at the founding price of $29 a year, held for the stay, for the first 12 months of sales. Season pass $12. Stay pass $59 at launch, then $69 |
| 3 | Months 1 to 12 | Measure the share holding Plus (not only day-35 conversion), Ask questions per student, support contact rate and refunds (Education apps: 4.86%, RevenueCat 2025). Rerun pricing_model.py v4 with real numbers |
| 4 | Month 12 | Move new buyers to $39 if 1.5% or more of students hold Plus. Founding buyers keep $29 |
| 5 | Month 13 on | Watch yearly renewal against the 44% median; low usage is the likely cause if it falls short |
| 6 | Year 1 to 2 | Three to five school pilots, one free term each; sign seats at $12 once several schools are in the pipeline, since SOC 2 and security reviews cost about $2.5k a month whatever the number of schools |

---

## 6. Risks and what would change it

| Risk | Effect | What changes |
|---|---|---|
| Fewer than 1% of students hold Plus | Low case: losses grow with scale, even in cash | Add Plus value that still passes the free test; lean on schools. Do not raise the price |
| Paid help never covered at fair prices | Base case needs 268k to 595k students, a quarter to half of all international students | Run on view A plus funding to about 100k; keep fixed costs lean; make schools the main revenue line |
| No cost for getting students | Every figure assumes growth by word of mouth and schools | Any paid acquisition must be added; base revenue is about $0.60 a student a year at 10k and $1.92 at 100k, so even $1 a signup is costly |
| Low usage cuts renewal | Yearly renewal below 44% shrinks the stock of payers | Event reminders already bring students back; track renewal from month 13 |
| Sonnet 5.5 not cleared for retention `none` or caching | About $4.5k a month more at 100k | Keep Opus 4.8; consider 3 free questions instead of 5 |
| Cache cold at low volume | Sonnet costs about $0.022 a question at 1k, not $0.014 | Small in dollars; already in v4 |
| Heavy Ask users on Plus | One payer at 20 a day on Opus costs about $26 a month against $3.25 earned | Watch usage; if more than 5% of payers pass 50 a month, add a monthly fair-use limit |
| Schools ask for SOC 2, dashboards or student data | Cost before revenue; data requests break the promise | Keep the no-data rule; price seats at $12; sell to departments under bid thresholds |
| Stay pass draws long-stay students who would pay more yearly | Less revenue per payer | Watch the yearly to pass mix; a pass held 36 months still earns 63% to 78% |
| Apple sets a link-out commission near 15% | About $1k a month at 100k | Small; keep web-first |
| Policy: OPT narrowed or a large new fee (reported, unverified, market.md 8) | Fewer payers in the group that pays most | Rule churn also raises the need for Duly; keep costs lean until it settles |
| Shrinking intake (fall 2025 down 17%) | Fewer students reach OPT from about 2027 | Extend to H-1B so students stay |
| Attorney retained (D14) | +$800 to $3,200 a month | Already in view B |

---

## 7. Decisions for the founder

1. **Unpark D8** and approve the structure: free core, Plus $39 a year, $12 season pass, $69 Stay pass, $19 hardship, school seats at $12. Or keep a $4.99 monthly plan instead of the season pass.
2. **Approve the four free-side rules in 5.1** (F-2 papers free, immigration papers always back up, nothing deleted on lapse, safety reports on the same clock). They close VALUE-2 open decision 5.
3. **Free Ask allowance:** 5 questions a month (recommended), more, or fewer. Each extra free question a month costs about $1,200 (Sonnet) to $3,900 (Opus) a month at 100k students in the base case (est.).
4. **Clear Sonnet 5.5 (and Haiku 4.5) for retention `none` and caching** (ARCHITECTURE.md 19.21). It is the largest cost lever on the consumer side.
5. **Fake-door test prices:** $29, $39, $45 (recommended).
6. **Founding price:** $29 a year held for the stay, first 12 months of sales.
7. **Schools:** pilots in year 1; seats at $12 once several schools are in the pipeline; no student data.
8. **Funding:** the one-time $90k to $236k plus operating losses of about $2.8k a month at 1k and $5k to $5.5k at 10k in cash, until at least 100k students. With paid help, losses of about $4.9k to $9.3k a month at those stages.
9. **Attorney:** retain one for the first review and monthly updates, or keep D14's "none retained".
10. **Billing:** Stripe with Stripe Tax (cheaper) or Paddle (handles sales tax).

---

## 8. Review, 2026-10-01: what changed and why

An adversarial pass checked every number against business/costs.md, market.md and channels.md, reran pricing_model.py and recomputed the unit economics by hand.

**Arithmetic that held:** the fixed stacks A, B and C; Ask at $0.044 (Opus 4.8) and $0.014 (Sonnet 5.5 cached) a question; Stripe at $2.19 on $39; the per-payer contribution before refunds; the 4.1 option table; $39 being 22% below TrackMyOPT Pro and ₹3,737.

**Problems found and fixed:**
1. **The recommended mix counted a monthly plan the recommendation drops.** The v3 "yearly" option put 25% of payers on $4.99 a month, about 13% more revenue per payer than $39 a year. v4 removes it.
2. **Conversion was optimistic.** The base case had 2% yearly holders, 2% Stay pass holders and season passes at once, about 4% to 5% of students paying, plus 20% school cover. Benchmarks give 2.1% of downloads paying, mostly early, for a thin paid tier. v4 base: 2.1% holding Plus, schools 10% from about 50k.
3. **Refunds were missing.** 4.86% for Education apps (RevenueCat 2025), fees kept by Stripe.
4. **Launch prices were not in the early numbers.** At 1k and 10k students most payers are on the founding $29 and the $59 Stay pass; at 100k a share still is. v4 models both, plus 10% at the hardship price.
5. **Sonnet caching was assumed warm at all volumes.** At 1k a question pays the cache write; v4 uses $0.022 at 1k and $0.016 at 10k.
6. **Schools were called free to acquire.** School buyers ask for SOC 2 and security reviews. v4 adds $2.5k a month once any school pays (est., Vanta range) and raises the seat to $12.
7. **Break-even shifted.** Cash break-even moved from about 40k to 90k students to about 117k to 180k; paid help from 115k to 230k to about 268k to 595k. The headline now says plainly that paid help is covered only in the good case.
8. **Safety paywall gaps.** Three Plus items could cut a student off from a date or a paper: the F-2 profile (a family member's expiry reminders), backup version history and quota (an overwritten or unbacked paper, and a lapse that could remove files), and "a reply from a person" (a free student reporting a wrong date waiting longer). 5.1 adds four rules that keep each of these free.
9. **Sources.** TrackMyOPT's $6.67 monthly price is now confirmed on its own pricing page. RevenueCat's 2025 figures (1.5% / 2.7%, 44.1% / 17.0%, "nearly 30%", 4.86%) were reread. The $24.95 Productivity median could not be found again and is marked. The 10k loss range in the old section 1 ($2.7k to $4.4k) did not match its own table and is replaced.

**Still estimates, to replace with real data:** every conversion and renewal rate; the share on founding and hardship prices; Ask questions per student; support contact rate; insurance, counsel, security and attorney hours (get quotes); the school compliance cost; the school seat price.

Other sources used through the sibling files, all read 2026-10-01: AWS Price List API (https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/), https://www.insureon.com/small-business-insurance/cyber-liability/cost , https://www.insureon.com/small-business-insurance/errors-omissions/cost , https://www.getastra.com/blog/security-audit/penetration-testing-cost/ , https://www.usavisalaw.com/immigration-attorney-cost , https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm , https://www.bls.gov/ooh/office-and-administrative-support/customer-service-representatives.htm , https://developer.apple.com/programs/whats-included/ .
