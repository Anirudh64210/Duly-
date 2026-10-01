# Channels: reaching students, revenue beyond subscriptions, and how students pay

2026-10-01. Part of the Duly cost and pricing pack. This section covers: what it costs to reach students, the school channel, the v2 attorney network (BACKLOG B10), what each could add to revenue, and which payment rails fit international students.

How to read it:
- Every external number carries its URL and the date it was fetched. "Fetched 2026-10-01" means fetched for this section. "Fetched 2026-09-28" means it comes from Duly's earlier market research (docs/research/founder/notes/Duly market and pricing validation/), checked against the source then, not again now.
- **(estimate)** marks a number this section worked out or assumed. It is not a fact; it is a starting figure to test.
- Duly's own costs come from specs/duly-2/ARCHITECTURE.md section 16. The free and paid split comes from specs/ui-2/VALUE-2.md section 4.

## 0. The answer on one page

1. **Students will not pay for Duly's growth.** VALUE-2 keeps every date, count, reminder and document free. The paid extras (more backup space, the attorney or new-school packet, a second profile for a spouse or child) are useful but optional. The median freemium app converts 2.1% of downloads to paying by day 35 ([RevenueCat, State of Subscription Apps 2026, published 2026-03-19](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026), fetched 2026-10-01). At about $36 a year, 10,000 students bring in roughly $6k to $15k a year from paid extras **(estimate)**. That is less than the cloud bill at 10,000 students, about $14k to $17.5k a year (ARCHITECTURE 16).
2. **Paid ads do not pay back at a student price.** A Reddit click costs a median of about $1.25 to $1.85 (2026 third-party benchmarks, section 1). That works out to $125 to $900 for each student who pays **(estimate)**, against a few dollars a year in revenue from each one. Grow through organic channels, schools and word of mouth. Run small paid tests only in the busy seasons.
3. **Schools are the channel that makes the numbers work.** International offices already pay for software per student. sunapsis, the case system Indiana University sells to 130+ clients, charges $9,648 to $34,950 a year at renewal by number of active records ([sunapsis pricing](https://sunapsis.iu.edu/pricing/index.html), fetched 2026-10-01). Schools also buy Sprintax tax codes per use for their students. A Duly school license priced below the sunapsis license line, for example $2,000 to $15,000 a year by size **(estimate)**, flips acquisition: the school pays Duly for each student who joins, not the other way round.
4. **The school gets money's worth, not data.** It buys the paid extras for every student, its own policies kept in Duly with citations (D3), and a join link. It never sees a student's record. Duly reports only how many codes were used. That makes Duly easier to buy (less student data in the security review) but harder to sell to offices that want dashboards.
5. **The attorney network is legal if it is a flat listing, but it conflicts with current decisions.** Bar rules allow a lawyer to pay "the reasonable costs of advertisements" and treat a plain practice-area directory as no "recommendation". They forbid paying per referral or per fee earned (section 4). BOUNDARY.md and VALUE-2 now say "no paid referrals", with only a neutral pointer such as the AILA search. If built (v2), it has to be a separate, labelled, paid-listing directory, with every listing paying the same flat fee, ordered neutrally, and the step-back card left as it is. Founder decision. Counsel first.
6. **Payment rails.** Sell on the web first through Stripe, in US dollars, billed yearly. Offer a one-year pass that does not renew next to auto-renewal. Accept cards (US and foreign), Apple Pay, Google Pay and Link. For one-time payments, also accept Alipay and WeChat Pay for Chinese students and UPI for payers with Indian bank accounts. Stripe now lets US businesses accept UPI from customers in India (section 5), so "UPI is not available" is only true for US bank accounts. On phones, plan on 15% to Apple or Google. Charge one price everywhere rather than pricing by country, with a quiet hardship waiver.

| Channel | Cash cost to Duly | Revenue at 10k students a year (estimate) | Revenue at 100k students a year (estimate) | When |
|---|---|---|---|---|
| Students paying for extras (web and apps) | Fees of 4% to 15% of the price | $6k to $15k | $60k to $150k | Launch |
| School site licenses and seat codes | Sales time, security review, pilots | $10k to $150k (5 to 15 schools) | $90k to $960k (30 to 80 schools) | First pilots in year 1, revenue in year 2 |
| Attorney listings (B10, v2) | Counsel, vetting, support | $0 (not before v2) | $36k to $300k (30 to 100 listings) | v2, after counsel |
| Paid ads | $1.25 to $1.85 a click | Tests only | Tests only | In the busy seasons |
| Cloud bill to cover (ARCHITECTURE 16, full design) | | $14k to $17.5k | $64k to $92k | |

The revenue figures rest on the assumptions in sections 2 to 4. They are ranges to test, not forecasts.

## 1. What it costs to reach students

### 1.1 How many students there are, and when they look

- 1,177,766 international students in 2024/25, 294,253 of them on OPT (up 21%); India 363,019 and China 265,919 ([IIE Open Doors 2025](https://www.iie.org/news/open-doors-2025-press-release/), fetched 2026-09-28).
- New international enrollment fell 17% in fall 2025 ([NAFSA Fall 2025 Snapshot](https://www.nafsa.org/fall-2025-international-student-enrollment-snapshot-economic-impact), fetched 2026-09-28). The number of students on OPT trails enrollment by two to four years, so that group probably keeps growing into 2027 before it shrinks **(estimate, from the research note)**.
- The buyers are concentrated. sunapsis says its 130+ clients serve "over 50% of the U.S. international student population" ([sunapsis](https://sunapsis.iu.edu/), fetched 2026-10-01). So a few hundred international offices reach most students. D24 already says Duly starts with 100 schools.
- Interest peaks around events: admission cohorts and arrival (spring to August, and January), OPT filing near program end, the H-1B registration in March, and the cap-gap months after it. These are planning seasons, not dates from the rule pack. Any date shown to a student still comes from the engine.

### 1.2 Channel by channel

| Channel | What it costs | Cost per signup (estimate) | Cost per paying student (estimate) | Fit |
|---|---|---|---|---|
| Reddit, organic (r/f1visa, r/OPT, r/USCIS, school subreddits) | Founder time; nothing in cash | $0 cash | $0 cash | Strong. Answer with the cited rule and its date, never a verdict. Subreddit rules on self-promotion apply; an account that only promotes gets removed |
| Reddit ads | Median cost per click $1.25 ([Stackmatix](https://stackmatix.com/blog/reddit-ads-cpc-cpm-benchmarks)), $1.25 to $1.85 with cost per thousand views $3 to $15, median about $6.50 ([RECHO](https://recho.co/blog/how-much-do-reddit-ads-cost-in-2026)); WordStream's 2026 average across industries $0.71 ([Amra and Elma, 2026-07-18](https://amraandelma.com/reddit-marketing-statistics)). All third-party benchmarks, seen in search results 2026-10-01, not Reddit's own figures | $6 to $19 (assumes 10% to 20% of clicks sign up) | $125 to $900 (assumes 2% to 5% pay) | Weak at a $36 price. Use small seasonal tests ($300 to $500 each) to learn wording, not to grow |
| WhatsApp and Telegram cohort groups ("MS in US Fall 2026" and others) | Time; the groups are free and public. WeMakeScholars alone lists 70+ study-abroad groups ([WeMakeScholars](https://www.wemakescholars.com/blog/70-study-abroad-whatsapp-groups-for-students), fetched 2026-09-28) | $0 cash | $0 cash | Strong for Indian students; the groups form every year around admission cycles. Post through admins or members, never as spam. Do not pay admins: a paid post in a group that trusts its admin reads as a hidden ad |
| Discord servers (school and cohort servers) | Time | $0 cash | $0 cash | Medium; works only through a member who already uses Duly |
| International student associations (for example Indian student associations) | Event sponsorship of $100 to $500 **(estimate)**, or a free talk | $1 to $5 **(estimate)** | Unknown | Medium. Precedent: ISO Student Health Insurance has an exclusive partnership with the University of South Florida Students of India Association ([ISO](https://www.isoa.org/blog/iso-announces-exclusive-partnership-with-the-university-of-south-florida-students-of-india-association), fetched 2026-09-28). Duly should sponsor without exclusivity or deals, in line with VALUE-2 |
| Student to student sharing | Near zero. The Share flow (VALUE-2 feature 7) and a plain "send Duly to a friend" link | $0 | $0 | The strongest channel for a trust product. See the referral decision below |
| School international offices | Sales time, pilots, security review (section 3) | Negative: the school pays Duly | Negative | The main lever |
| Public News pages and search | Writing time; every article is already written from saved sources (D22) | $0 cash | $0 cash | Medium and slow. VALUE-2 puts public calculators off for now; public News articles can rank in search sooner |

**Rewards for sharing: a founder decision.** VALUE-2 lists "referrals" under "Still no" next to ads and deals. If that word means partner referrals (insurance, tax, job boards), a plain student-to-student share link is still allowed. FrogHire gives "14+ days of Premium" per paid referral ([FrogHire FAQ](https://www.froghire.ai/help/faq), fetched 2026-09-28). Recommendation: a share link with no reward at launch. If a reward is wanted later, use extra backup space for both students. It costs Duly only storage and does not make students into salespeople.

### 1.3 Why paid acquisition does not work here

- RevenueCat 2026: freemium apps turn 2.1% of downloads into paying users by day 35, against 10.7% for apps that charge before use. About 72% of yearly subscribers cancel within the first year; freemium apps keep 28% of yearly subscribers after a year ([RevenueCat](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026), fetched 2026-10-01).
- Duly is freemium on principle (VALUE-2 section 4: nothing that could make a student miss a date sits behind a payment). Its paid extras are narrower than a typical app's premium tier, so conversion may come in under the 2.1% median **(estimate)**.
- A paying student at about $36 a year, net of fees, who stays 1.5 to 3 years on average, is worth about $50 to $100 **(estimate)**. A paying student found through Reddit ads costs $125 to $900. Paid ads lose money until conversion is measured and turns out to be much higher than the median.

## 2. Students paying directly (for comparison)

The pricing section owns the price. This section uses $36 a year as a working figure, below TrackMyOPT Pro at $49.99 a year ($4.17 a month) ([TrackMyOPT](https://www.trackmyopt.com/), fetched 2026-09-28), as VALUE-2 asks.

| Students | Paying (2% to 5%, estimate) | Net revenue a year at about $34 after web fees (estimate) |
|---|---|---|
| 1,000 | 20 to 50 | $680 to $1,700 |
| 10,000 | 200 to 500 | $6,800 to $17,000 |
| 100,000 | 2,000 to 5,000 | $68,000 to $170,000 |

At 1,000 students the cloud bill is about $400 to $590 a month on the lean launch (ARCHITECTURE 16), so $4,800 to $7,080 a year before Apple and Google fees, signing, Sentry, counsel or people. Students paying directly do not cover that at any size up to 100,000 unless conversion is well above the median. That is why sections 3 and 4 matter.

## 3. Schools: international offices paying per seat or by site license

### 3.1 What schools already pay for international-student software

| Product | Model | Published price | Source |
|---|---|---|---|
| sunapsis (Indiana University), international case management | Annual license plus services, priced by active records; $8,595 implementation in year 1 | Year 1 (2026-27): $17,963 (1 to 249 records) to $42,525 (6,000+). Renewal (2027-28): $9,648 (1 to 249), $14,075 (250 to 499), $19,290 (500 to 999), $24,510 (1,000 to 2,999), $29,735 (3,000 to 5,999), $34,950 (6,000+). The license part alone at renewal is $5,220 to $26,095 | [sunapsis pricing](https://sunapsis.iu.edu/pricing/index.html), fetched 2026-10-01 |
| Sprintax, nonresident tax filing | The school buys access codes and pays for each one used; often capped | NC State: "OIS pays for each Sprintax Returns code usage" and students pay $5 for a federal code ([NC State OIS](https://internationalservices.ncsu.edu/employment/taxes/), fetched 2026-10-01). Grand Valley State covers the first 250 students ([GVSU](https://www.gvsu.edu/istudents/tax-information-sprintax-113.htm)). UT Austin: "As of June 8, 2026, all free Sprintax codes have been distributed and used" ([UT Austin ISSS](https://global.utexas.edu/isss/advising-services/taxes/tax-preparation-software)); last two seen in search results 2026-10-01. Retail without a code: federal $54.95, state $49.95 ([Sprintax FAQ](https://taxprep.sprintax.com/faq.html), fetched 2026-09-28) | As listed |
| Interstride, careers and immigration resources | Paid by the institution, free to students, sold through demos | Not published ([Interstride](https://www.interstride.com/), [career centers page](https://www.interstride.com/career-centers/), both fetched 2026-10-01). Listed by Duke, University of Washington, USC, Kelley (IU), Bauer (Houston), UConn (2025) and NC State Graduate School (2025) in search results 2026-10-01 | Price unknown |
| FrogHire | Has an "Institutional" plan through career centers | Not published ([FrogHire FAQ](https://www.froghire.ai/help/faq), fetched 2026-09-28) | Price unknown |

What this shows: schools pay for international-student software from about $10k to $35k a year for a core system, and they buy per-student tools in capped batches. Interstride's price could not be found. Search engines refused or returned unrelated results on 2026-10-01, and Interstride sells by demo only. A public records request to a state university that lists Interstride would get a real contract figure.

### 3.2 What Duly would sell a school

Since the core is free for everyone, the school buys:
- **The paid extras for every student it sponsors:** more backup space, the formatted packet for an attorney or new school, a second profile for an F-2 spouse or child.
- **Its own rules kept current in Duly:** the per-school policy records of D3 (CPT, recommendation steps), each cited to the school's page with a snapshot and check date. This is real upkeep for Duly, and VALUE-2 already calls the school kit "outreach and upkeep". The license should pay for it.
- **A join link and codes**, Sprintax style.

What the school never gets: names, records, dates, counts about a named student, or a dashboard of its students. Duly reports how many codes were used, and nothing else. A code should unlock the extras as an entitlement, so that Duly need not keep which school each account came from longer than it needs to count codes **(design proposal; check against identity.md)**.

### 3.3 Proposed school prices (estimate)

Set below the sunapsis license line for each size, because Duly adds to a school's case system rather than replacing it:

| International students at the school | Duly site license a year (estimate) | sunapsis license alone at renewal, for comparison |
|---|---|---|
| Up to 500 | $2,000 | $5,220 |
| 500 to 2,000 | $5,000 | $10,435 to $15,655 |
| 2,000 to 6,000 | $10,000 | $15,655 to $20,880 |
| 6,000+ | $15,000 | $26,095 |
| Small school, or a single department | Seat codes at $6 per student who joins, minimum order $500 | Sprintax style |

- At $5,000 for a school of 2,000 where 20% to 40% of students join **(estimate)**, Duly earns about $6 to $12 for each student who joins, instead of spending $125 or more to find each paying student.
- 5 to 15 schools by the second year is $10k to $150k a year. 30 to 80 schools at 100,000 students is $90k to $960k **(estimate)**.
- Small price, small paperwork. At the University of Minnesota, for example, "University-Wide Contracts are bid at the discretion of Purchasing at $250,000 or more" ([UMN policy](https://policy.umn.edu/finance/purchasing-proc02), seen in search results 2026-10-01). Under every school's threshold for a formal bid, a department can usually buy with a purchase order. Thresholds differ by school **(check each school)**.

### 3.4 What selling to schools costs Duly

- **The security questionnaire.** Most schools send the HECVAT. Version 4 came out on 2025-02-10 and HECVAT 4.1.6 has 321 questions in 7 sections ([Isora GRC](https://www.saltycloud.com/blog/what-is-the-hecvat/), seen in search results 2026-10-01; toolkit home at [EDUCAUSE](https://www.educause.edu/higher-education-community-vendor-assessment-toolkit)). UT Austin requires it where a vendor gets access to FERPA records ([UT Austin](https://security.utexas.edu/risk/appreg)). Duly's design helps here: the school shares no records, and the server holds only ciphertext (ARCHITECTURE 0). Expect the questionnaire anyway, plus an accessibility statement. Founder time: several days for the first one, reusable after **(estimate)**.
- **Cyber and errors-and-omissions insurance**, often required in school contracts **(estimate; get quotes)**.
- **Pilots:** one free term per school, 3 to 5 schools in year 1 **(estimate)**.
- **Sales cycle:** one academic term to a year **(estimate)**. Budgets are set months ahead, so the first school revenue is likely in year 2.
- **Trust risk:** DSOs are careful about endorsing outside advice. Duly's BOUNDARY (no verdicts, a drafted DSO question) is the answer to that, and should be shown in the pitch.

### 3.5 Two more paid-for-by-someone-else ideas (not researched further)

- **Employers of STEM OPT workers** could buy seats for their F-1 employees, on the same terms as schools: they pay and see nothing **(idea, unpriced)**.
- **Alumni seats:** a former student now on an H-1B pays for a new student's year. Fair and on brand. Small revenue **(idea)**.

## 4. The v2 attorney network (BACKLOG B10)

### 4.1 What the bar rules allow

Model Rule 7.2(b) as adopted in North Carolina: "A lawyer shall not compensate, give, or promise anything of value to a person for recommending the lawyer's services except that a lawyer may (1) pay the reasonable costs of advertisements or communications permitted by this Rule..." Comment [2]: "Directory listings and group advertisements that list lawyers by practice area, without more, do not constitute impermissible 'recommendations.'" Comment [5] allows paying lead generators that do not recommend the lawyer and do not imply that referrals are unpaid ([North Carolina State Bar, Rule 7.2](https://www.ncbar.gov/for-lawyers/ethics-and-governing-rules/rules-of-professional-conduct/71-76-information-about-legal-services/72-communications-concerning-a-lawyers-services-specific-rules/), fetched 2026-10-01). Other states use the same core wording (Massachusetts, Minnesota, Indiana, Pennsylvania and others, seen in search results 2026-10-01). California added "reasonable" before "costs" so advertising costs do not turn into fee sharing ([State Bar of California redline](https://calbar.ca.gov/sites/default/files/portals/0/documents/rules/Rule_7.2-Exec_Summary-Redline.pdf)). The second exception, a "qualified lawyer referral service", needs state approval and is not a fit for Duly **(estimate)**.

So a legal model looks like this:
- A **flat monthly listing fee**, the same for every listed attorney or firm, not tied to leads, consultations, retained clients or fees.
- **No ranking by payment,** and no "recommended" or "top" badge. Listing order is neutral, for example by distance or alphabetical, with filters.
- **Labelled** "Paid listing".
- The student's case moves only when the student shares it, through the same Share flow (VALUE-2 feature 7). Duly sends nothing to a firm on its own.
- Immigration is federal practice, so an attorney may be licensed in any state, and that state's version of 7.2 applies. **Counsel to confirm across the states of the listed attorneys** (decision 33 in ARCHITECTURE 19 already lists a counsel brief).

### 4.2 Conflicts with current decisions (founder)

- BOUNDARY.md, the step back, item 4: "a neutral pointer such as the AILA lawyer search, no paid referrals."
- VALUE-2 section 3 "Still no" lists referrals. ANALYSIS section 8 will not copy "a bundled attorney consultation or paid referrals".
- BOUNDARY "Words Duly never uses about itself" (lawyer, attorney) still allows naming other people's services, but the copy needs care.

Recommendation if B10 goes ahead: build a separate "Find an immigration attorney" directory, reached from Your case and from the Share sheet, never from the step-back card. The step-back card keeps only the neutral AILA pointer. A paid listing is advertising, not a referral, but a worried student may read any listing inside Duly as an endorsement. The labels have to say plainly that it is not.

### 4.3 Price and revenue (estimate)

- Directory prices are not public: Avvo and Justia pages refused the fetch or showed no price (2026-10-01), and an Avvo review says pricing "varies by market and practice area" ([Intercore, 2026](https://intercore.net/guides/avvo-marketing-for-lawyers-review-2026), fetched 2026-10-01).
- What one client is worth to an attorney: consultations at "$300 for up to 1 hour, $200 for up to 30 minutes", and F-1 student matters at a flat fee of about $1,850 ([USA Visa Law](https://www.usavisalaw.com/immigration-attorney-cost), fetched 2026-09-28).
- A flat listing of **$99 to $249 a month (estimate)** is paid back by one retained student matter every 7 to 18 months.
- 30 to 100 listings is **$36k to $300k a year (estimate)**, once Duly has enough students for attorneys to want to be listed: not before the 10k to 100k range.
- Costs: counsel, checking licenses and discipline records before each listing, handling complaints, and a takedown process **(estimate; not priced)**.

## 5. How students pay

### 5.1 Rails and what they cost

| Rail | Fee | Fits | Source |
|---|---|---|---|
| Stripe, cards (debit and credit) | 2.9% + 30 cents (US card); +1.5% for a foreign card; +1% when currency conversion is needed | Every student with a US card, including no-SSN student cards (Zolve, MPOWER) | [Stripe pricing](https://stripe.com/pricing), fetched 2026-10-01 |
| Stripe Billing (renewals) | 0.7% of billing volume, pay as you go | Auto-renewing plans | [Stripe pricing](https://stripe.com/pricing), fetched 2026-10-01 |
| Apple Pay, Google Pay, Link through Stripe | Card pricing | Phone and web checkout; work with subscriptions | [Stripe payment method support](https://docs.stripe.com/payments/payment-methods/payment-method-support), fetched 2026-10-01 |
| Alipay, WeChat Pay through Stripe | 2.9% + 30 cents, plus conversion if needed | Chinese students, one-time payments. Not supported in Stripe Checkout subscription mode (Alipay subscriptions invite only; WeChat Pay in private preview) | [Stripe local payment methods](https://stripe.com/pricing/local-payment-methods), [support table](https://docs.stripe.com/payments/payment-methods/payment-method-support), fetched 2026-10-01 |
| UPI through Stripe | 2% plus international and conversion fees | Payers with an Indian bank account: a parent in India, or a student's Indian account. Prices in INR. US businesses are on Stripe's list of business locations. One payment from INR 1 to INR 100,000; AutoPay renewals capped at INR 15,000 | [Stripe UPI](https://docs.stripe.com/payments/upi), [fees](https://stripe.com/pricing/local-payment-methods), fetched 2026-10-01 |
| Cash App Pay, Amazon Pay | 2.9% + 30 cents | US accounts only; low priority | [Stripe local payment methods](https://stripe.com/pricing/local-payment-methods), fetched 2026-10-01 |
| PayPal | Stripe's table does not list US businesses for PayPal | Needs a separate PayPal integration; skip at launch | [Stripe support table](https://docs.stripe.com/payments/payment-methods/payment-method-support), fetched 2026-10-01 |
| Paddle (merchant of record: handles sales tax and VAT) | 5% + 50 cents a transaction | If Duly wants tax handled for it | [Paddle pricing](https://www.paddle.com/pricing), fetched 2026-10-01 |
| Apple in-app purchase | 15% under the Small Business Program (up to $1M a year in proceeds; new developers qualify) | Purchases started in the iPhone app | [Apple](https://developer.apple.com/app-store/small-business-program/), fetched 2026-10-01 |
| Google Play billing (US, from 2026-06-30) | Auto-renewing subscriptions: 10% + 5% billing fee | Purchases started in the Android app | [Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/112622), fetched 2026-10-01 |

**Indian cards on renewal.** RBI rules need an e-mandate set up once with 3D Secure, a notice to the customer at least 24 hours before each renewal, and fresh authentication above INR 15,000. Stripe waits 26 hours before charging an Indian card on renewal ([Stripe, India recurring payments](https://docs.stripe.com/india-recurring-payments), fetched 2026-10-01). Duly's price is far below INR 15,000, but some renewals will fail when a student ignores the notice. The one-year pass avoids this.

**Linking out from the iPhone app.** App Review Guideline 3.1.1(a) says the external purchase link entitlements "are not required for developers to include buttons, external links, or other calls to action in their United States storefront apps" ([Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), fetched 2026-10-01). On 2025-12-11 the Ninth Circuit allowed Apple to charge a "reasonable commission" on purchases made through those links, with the amount sent back to the district court ([MacRumors](https://www.macrumors.com/2025/12/11/apple-app-store-fees-external-payment-links/), [opinion](https://law.justia.com/cases/federal/appellate-courts/ca9/25-2935/25-2935-2025-12-11.html), fetched 2026-09-28). The rate for a link-out purchase is unsettled. Plan on 15% for any purchase that starts in a phone app, and sell mainly on the web, where an account bought there unlocks the extras on every device.

### 5.2 Fees on a $36 a year price (estimate, from the rates above)

| How the student pays | Fee | Share of price |
|---|---|---|
| One-year pass, US card, Apple Pay or Google Pay (Stripe, one-time) | $1.34 | 3.7% |
| Auto-renewing yearly, US card (Stripe plus Billing) | $1.60 | 4.4% |
| Auto-renewing yearly, foreign card | $2.14 | 5.9% |
| One-year pass, Alipay or WeChat Pay | $1.34 | 3.7% |
| One-year pass, UPI (assumes the 1.5% international and 1% conversion fees also apply) | about $1.62 | about 4.5% |
| Paddle | $2.30 | 6.4% |
| Apple or Google in-app | $5.40 | 15% |
| Monthly at $2.99 on Stripe (12 charges) | $4.89 a year | 13.6% |
| Monthly at $2.99 through Paddle | $7.79 a year | 21.7% |

The fixed 30 or 50 cents makes small monthly charges expensive. Students also think in academic years. Lead with yearly. If a monthly option is offered, price it so the yearly plan is plainly the better deal.

### 5.3 Recommendations

1. **The web is the main store.** Stripe Checkout in US dollars, with cards, Apple Pay, Google Pay and Link. A purchase on the web unlocks the extras on Mac, Windows, iPhone and Android.
2. **Two ways to buy, side by side:** a yearly plan that renews (with a reminder before renewal and cancellation in one tap), and a **one-year pass that does not renew**. The pass is kinder to students who dislike subscriptions, avoids e-mandate failures, works with Alipay, WeChat Pay and UPI, and keeps Duly away from most auto-renewal law trouble.
3. **Phone apps:** offer in-app purchase where the store requires it, and budget for 15%. Enrol the company, not the founder, in Apple's Small Business Program (ARCHITECTURE 19, decision 2).
4. **No pricing by country.** Students live and spend in the US, and pricing by nationality looks bad and is easy to game. Let Apple and Google set their local store prices. Instead, offer a **hardship waiver**: one tap, no proof asked. Each waiver costs Duly only storage and support **(estimate)**, and it fits "a price that keeps students coming back".
5. **Sales tax:** software is taxed in some US states and not others. Use Stripe Tax or Paddle once Duly sells in states where it must collect **(not researched here; ask an accountant)**.
6. **School payments** come by invoice or purchase order (Stripe Invoicing, with ACH at 0.8% capped at $5 ([Stripe local payment methods](https://stripe.com/pricing/local-payment-methods), fetched 2026-10-01)), never by student card.

## 6. Gaps and what to check next

- **Interstride's price to schools:** not public. Get it through a public records request to a state university that lists Interstride, or ask a friendly ISSS director.
- **Attorney directory prices** (Avvo, Justia, Martindale): sold by quote only. Ask two firms what they pay.
- **Reddit ad costs** come from third-party benchmark sites, not Reddit. A $300 test in one busy season gives Duly its own figures.
- **Whether students in the US can pay by UPI** with an Indian account and a US phone number: NPCI has announced UPI for NRIs with international mobile numbers in some countries, which this section did not check. Test with a real account.
- **How much schools pay Sprintax** for each code: not published. NC State charges students $5, so the school pays more than that.
- **Conversion to paid** at Duly's narrow paid tier: unknown until launch. Every revenue row above depends on it.
- **Founder decisions this section raises:** (1) whether a share-link reward counts as a "referral" under VALUE-2; (2) whether B10 goes ahead as a separate paid-listing directory, given BOUNDARY's "no paid referrals"; (3) whether to offer schools seats with no data, as proposed, knowing some offices will want dashboards; (4) one-year pass next to auto-renewal.
