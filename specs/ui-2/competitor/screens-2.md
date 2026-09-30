# TrackMyOPT walkthrough: screenshots 10 to 18 of 54

Source: /Users/ani/Desktop/Duly/trackmyOPT/, captured 2026-09-30 between 4:25:54 PM and 4:26:31 PM. Logged-in account "SS" / "saianir...", free tier (the sidebar shows "Get Pro").
Only what is visible on screen is recorded here. The small framed thumbnail at the bottom right of most shots is the macOS screenshot preview, not part of their UI.

Covered in this batch: the dashboard's "OPT Dates" item (a paywall), then the four date tools in order (OPT Apply, OPT Clock, STEM Apply, STEM Clock). The four tools sit on public `/tools/*` marketing pages, not inside the dashboard.

---

## 10. Dashboard > OPT Dates (4.25.54 PM), URL `trackmyopt.com/dashboard/opt-dates`

**Screen and state:** Logged-in dashboard, with "OPT Dates" selected in the sidebar. The whole content area is a Pro upsell. For a free user it shows no dates at all.

**Layout and navigation:**
- A dismissible top promo banner, gradient purple to brown: "Paste a job description. Get an ATS-ready resume in minutes: built for F-1 & OPT job search." with a black "Build resume >" button and an X.
- A dark navy header with the TrackMyOPT logo, a purple "Get Pro" button with a crown, a "Deals / $8,136 free for you" pill with a red "HOT" tag, and a light/dark toggle.
- The left sidebar has 17 entries: Home, OPT Dates, OPT Tools (expandable), Case Status, Documents, H-1B Sponsors, Verified Jobs, Job Tracker, Career Tools (expandable), Tax Filing, Health Insurance, then a divider, then Install Extension, Settings, Help, Chrome Job Prefill. At the bottom are the user avatar "SS", the name "saianir..." and a "Get Pro" link.
- The centre is one large card.

**Features and data shown:**
- Hero, badge "Pro · Morning reminders". Heading: **"Get daily reminders before OPT deadlines become urgent"**. Copy: "Every morning at 9:00 AM ET, TrackMyOPT emails you the dates, clocks, and actions that need attention."
- Four locked tiles, each with a padlock icon and example text:
  - "OPT Apply Dates": "Example: I-765 filing window closes in 14 days"
  - "OPT Clock Tracker": "Example: 28 unemployment days left: act before 90"
  - "STEM Apply Dates": "Example: STEM extension deadline in 21 days"
  - "STEM Clock Tracker": "Example: STEM unemployment days approaching limit"
- A sample email card, "Sample reminder · Today, 9:00 AM ET", subject "TrackMyOPT: unemployment alert", body "You have 28 unemployment days remaining on OPT. Log your job or update employment to stay organized." It ends with an "Open dashboard →" link.
- Three pills: "Separate email per tool", "Browser + inbox alerts", "Customize each tracker".
- A primary CTA, **"Start 7 Days for $0.99 →"**, and a secondary "Compare Plans".
- Fine print: "$0.99 for 7 days for eligible accounts · cancel anytime · reminders for all four trackers with Pro".

**Friction:**
- A sidebar item named "OPT Dates" leads to a sales page, not to the user's dates. A student expecting to see their own dates gets an ad instead, which is a bait-style navigation.
- There are three upsell surfaces before any content: the promo banner, the Get Pro and Deals header buttons, and the page itself. "Deals $8,136 free for you HOT" is unrelated to immigration dates and reads like coupon spam.
- The 17-item sidebar mixes compliance (Case Status, Documents), jobs (H-1B Sponsors, Verified Jobs, Job Tracker, Chrome Job Prefill), life admin (Tax Filing, Health Insurance) and extensions. It has no grouping labels, and "Install Extension" and "Chrome Job Prefill" look like duplicates.
- The price after the 7-day trial is not shown on this screen, and "eligible accounts" is not defined.
- "Separate email per tool" promises four separate emails, which means more inbox noise rather than one digest.

**What works:**
- The value is concrete. The sample reminder shows exactly what the email says and when (9:00 AM ET).
- The four-tracker model (OPT Apply, OPT Clock, STEM Apply, STEM Clock) is easy to understand, and each example gives a countdown in days.

**Accuracy and legal risk:**
- "act before 90" in the OPT Clock example points at the 90-day unemployment limit, but the copy doesn't say whether "act" means find a job or leave the country.
- The sample body "28 unemployment days remaining" states a count with no source and no "estimate" wording, even though the tool pages call everything a "planning estimate".
- The reminders are fixed to 9:00 AM ET, with no local time zone shown.

---

## 11. OPT Apply tool, top (4.26.03 PM), URL `trackmyopt.com/tools/opt-apply`

**Screen and state:** Going from the dashboard to the tool drops the user out of the dashboard into a public marketing-page layout. The top nav is Home, AI Resume Doctor, Features ▾, About Us ▾, Research, Blog, Contact Us, For Orgs, then a blue "Dashboard" button and the avatar "SS". The sidebar is gone. The fields are empty.

**Features and data:**
- Eyebrow "Free F-1 student planning tool". H1: **"OPT Application Guide & I-765 Deadline Calculator"**. Sub: "Use the calculator to organize your post-completion OPT filing dates, then work through the steps below before you submit Form I-765."
- A collapsed box: "Before you start · guidance and limitations".
- A blue tool header, "OPT Apply / Plan your initial filing dates".
- A four-tab switcher: OPT Apply (selected, blue), OPT Clock, STEM Apply, STEM Clock. Each tab has its own colour and icon.
- Card "Your filing dates", sub "Use the actual dates on your documents. Nothing is saved automatically."
  - "Program End Date" (MM/DD/YYYY), help text "Program end date on your I-20."
  - "DSO Recommendation Date (Optional)", help text "The date your DSO entered the recommendation in SEVIS, not the date you requested it."
  - "Save to sync with your dashboard." with a Save button that looks disabled when the fields are empty.
- An empty-result box: "Enter valid filing dates to see your timeline. Clear or incomplete dates will not leave an old result on screen."
- A right-hand Pro card, "GO FURTHER WITH TRACKMYOPT PRO" / **"When could your OPT decision arrive?"** / "Turn a date calculation into a plan you can follow." It lists three benefits: "See how your wait compares with similar reported cases." / "Track USCIS updates with automatic checks and email alerts." / "Connect your OPT dates with deadline reminders." Then a CTA "Unlock Pro tracking →" and the note "Your calculator stays free. Comparisons depend on available reports, not exact approval dates or approval odds."

**Friction:**
- Leaving the logged-in shell is disorienting. The nav changes completely, and the way back is a "Dashboard" button among nine marketing links.
- "Nothing is saved automatically" sits next to "Save to sync with your dashboard". The user has to work out that the tool is stateless unless they press Save.
- The dates the user already has are not pre-filled. Program End Date is empty even though the account exists.
- The Pro card takes about a third of the width, beside a form with only two fields.

**What works:**
- The field help text is precise and addresses a common mistake: the DSO recommendation date is the SEVIS entry date, "not the date you requested it". This copy is worth matching in our own fields.
- "Clear or incomplete dates will not leave an old result on screen" is careful: stale results are never shown.
- Stating plainly that the calculator is free while Pro adds comparisons is honest framing.

**Accuracy and legal risk:**
- The result area is empty here, so the filing-window logic can't be checked from this screen.
- The heading promises an "I-765 Deadline Calculator", while the body says "organize". The two framings are mixed.

---

## 12. OPT Apply tool, scrolled down (4.26.06 PM)

**Screen and state:** The same page scrolled down to the footer edge. Fields are still empty.

**Features and data:**
- Left column:
  - A collapsed "▸ How this estimate works" section.
  - A card "Email reminders / Use your saved dates · Pro feature / Optional reminders, without changing your calculator." with a "View Pro plans" button.
- Right column:
  - Card **"OPT approval insights"**, with a refresh icon. It shows "USCIS processing time **5 months**", "80% of cases completed within this time", "I-765 · F-1 student category · Service Center Operations (SCOPS)" and "Verified 2026-09-24. Not a minimum wait or guaranteed approval date." Below that are a collapsed "▸ About these numbers" section and a link "Check USCIS processing times".
  - Card **"Before you act"**: "Planning estimates, not USCIS approval or a determination of status. Verify your EAD, qualifying employment, and filing requirements with your DSO." It links to "Official F-1 regulations" (external-link icon).
- The footer headings (Product, Guides, Resources, Legal) start at the bottom.

**Friction:**
- This is the second Pro prompt on the page (Pro card, then the Email reminders card), and a third appears on the dashboard.
- The explanation of the maths is collapsed, so trust depends on the user clicking.
- A large empty area in the left column makes the page feel unfinished.

**What works:**
- The processing-time card names its source (USCIS category, office, the 80% percentile), gives a verification date, links to the official page and says what the number is not. This is the strongest trust pattern in the batch, and it lines up with our rule that every number has a source.
- The "Before you act" disclaimer is short, plain and points to the DSO and the regulations.

**Accuracy and legal risk:**
- The 5-month figure is shown with no dates entered. It is general USCIS data, not a personal estimate, and the card labels it that way.
- "Verified 2026-09-24" is 6 days old at capture. We can't tell how often it updates.
- "Official F-1 regulations" links out, but no specific CFR section is cited on screen.

---

## 13. OPT Clock tool, top (4.26.13 PM), URL `trackmyopt.com/tools/opt-clock`

**Screen and state:** The "OPT Clock" tab is active (rust/orange theme). The dates are pre-filled: OPT Start Date 03/01/2026 and OPT EAD End Date 02/12/2027. Save is enabled.

**Features and data:**
- Eyebrow "Free F-1 student planning tool". H1 **"OPT 90-Day Unemployment Calculator"**. Sub: "Record employment periods and use this calculator to plan around the unemployment limit for post-completion OPT."
- A collapsed "Before you start · guidance and limitations" box.
- A header "OPT Clock / Track initial OPT unemployment".
- Card "Your authorization dates", with "Enter actual EAD dates. Changing a start date will not overwrite your end date." Fields: OPT Start Date and OPT EAD End Date, then "Save to sync with your dashboard." and Save.
- Card "Initial OPT unemployment estimate", tagged "Through Sep 30, 2026": "Add your employment history below, or confirm that you have had no qualifying employment during this OPT period." It has a checkbox "I have no qualifying employment to record".
- A Pro card in rust: **"Know your next move, not just your days left."** The three benefits and the free-calculator note are the same as on the OPT Apply page.

**Friction:**
- The Pro card repeats word for word across tabs, with only the headline changed.
- No number is shown yet, even though the start date is known. The user has to add a job history or tick the checkbox first.

**What works:**
- It refuses to compute an unemployment count without a job history. That avoids a false "213 days used" alarm, which is a sound safety choice.
- "Through Sep 30, 2026" states the as-of date for the count, which is good practice.
- "Changing a start date will not overwrite your end date" makes the data behaviour explicit.
- Dates flow over from elsewhere in the account, because they are pre-filled here.

**Accuracy and legal risk:**
- The pre-filled EAD runs 03/01/2026 to 02/12/2027, which is shorter than 12 months. The tool does not flag this, though that is not necessarily wrong. We can't tell from here whether it validates the dates against program end plus 60 days, or the 14-month limit.

---

## 14. OPT Clock tool, employment section (4.26.16 PM)

**Screen and state:** Scrolled down, with no jobs entered.

**Features and data:**
- Section "Employment History / 0 employment records", with a "+ Add Employment" button.
- A warning callout, **"Unemployment clock needs your job history"**: "You set OPT start to **Mar 1, 2026**. Without employment records, we cannot tell which days you were employed. USCIS only counts days without qualifying work in your field: add each job with start and end dates." It has two buttons: "+ Add current or past job" and "I'm between jobs".
- Four stat tiles, all showing " to ": "Days Employed", "Pending setup", "Current Streak", "Longest Gap".
- A progress bar "Unemployment days used", dashed and empty, labelled "Complete dates and job history to calculate". Helper text: "Include every job since OPT started: check "I currently work here" for your present job."
- Empty state, "No employment records yet": "Add each employer since your OPT started. For your current job, check "I currently work here" when adding it." Button "+ Add Your First Job".
- Right column:
  - **"What stops the clock?"**: "Only qualifying employment counts. Weekends and holidays count as unemployment when you are not employed. Keep your dates and supporting records up to date." A collapsed "▸ Counting rules" section follows.
  - The "Before you act" disclaimer and the "Official F-1 regulations" link, the same as on the OPT Apply page.
- The top of the "Email reminders · Pro feature / View Pro plans" card is visible at the bottom.

**Friction:**
- There are four ways to add a job on one screen: "+ Add Employment", "+ Add current or past job", "+ Add Your First Job", and the "I currently work here" instruction. There are also two ways to say "no job": the checkbox on the previous screen and the "I'm between jobs" button. That redundancy crowds the page.
- The stat tiles are all empty. "Current Streak" is a gamified term with no clear meaning for immigration compliance, and "Pending setup" as a tile label reads like a status rather than a metric.
- The same instruction ("check I currently work here") appears twice.

**What works:**
- The explainer answers the most common misunderstanding: weekends and holidays count while unemployed.
- The empty state is clear about what is needed.
- A job-level history with start and end dates is the right data model for this count.

**Accuracy and legal risk:**
- "USCIS only counts days..." is imprecise. The unemployment limit is in the F-1 regulations (8 CFR 214.2(f)(10)(ii)(E)), and it is tracked through SEVIS and the DSO, not something USCIS counts day by day. Our copy should name the rule and the reporting path correctly.
- "qualifying work in your field" compresses the qualifying-employment rules (hours threshold, relation to degree, and the types allowed, such as volunteer or self-employed). The detail sits in the collapsed "Counting rules", which we can't see here.

---

## 15. OPT Clock tool, bottom and footer (4.26.18 PM)

**Screen and state:** Scrolled to the bottom.

**Features and data:**
- The "+ Add Your First Job" button from the section above is still in view, followed by the "Email reminders / Use your saved dates · Pro feature / Optional reminders, without changing your calculator." card with "View Pro plans".
- The footer has five columns:
  - Brand: "3,000+ users have signed up for TrackMyOPT. 10,000+ people regularly use our free tools."
  - Product: Features, Pricing, Free Tools, How It Works, About Us, Success Stories, Chrome Extension.
  - Guides: 90-Day Unemployment Rule, STEM OPT Extension Guide, OPT to H-1B Transition, I-983 Training Plan Guide, OPT Processing Time 2026, F-1 Tax Filing Guide, OPT Career Guide, Health Insurance Guide.
  - Resources: E-Verify Employer Search, All Blog Posts, Glossary, Answers (Q&A), Comparisons, Research, Immigration Facts, FAQ, Help Center, Contact, Report Fraud.
  - Legal: Privacy Policy, Terms of Service, Refund Policy, Disclaimer, Cookie Policy, Security, Contact, Privacy choices.
- Bottom bar: "© 2026 TrackMyOPT. Made with  for international students.", badges "SSL SECURE" and "PAYMENTS BY STRIPE", and a Cloudflare-style cloud logo.

**Friction:**
- The footer has 34 links. "Contact" appears three times: in the top nav, under Resources and under Legal.
- The SEO content (Guides, Research, Immigration Facts, Q&A, Glossary, Blog) is spread across several overlapping buckets.

**What works:**
- It has a full legal set, including a Refund Policy and Security page.
- The social proof uses small, specific numbers (3,000+ signed up, 10,000+ tool users), which is believable because it is modest.
- "E-Verify Employer Search" is useful for STEM, since STEM OPT employers must be enrolled in E-Verify.
- The "Report Fraud" link signals that they are aware of scams aimed at students.

**Accuracy and legal risk:**
- The trust badges ("SSL SECURE", "PAYMENTS BY STRIPE") only describe transport security and payments. Nothing is shown about how the immigration data is stored or used.

---

## 16. STEM Apply tool, top (4.26.23 PM), URL `trackmyopt.com/tools/stem-apply`

**Screen and state:** The "STEM Apply" tab is active (dark green theme). Current OPT EAD End Date is pre-filled as 02/12/2027. The STEM DSO date is empty.

**Features and data:**
- Eyebrow "Free F-1 student planning tool". H1 **"STEM OPT Extension Application Guide"**. Sub: "Use this planning tool to organize your STEM OPT extension deadline and prepare for the documents and employer details involved."
- A collapsed "Before you start · guidance and limitations" box.
- Header "STEM Apply / Plan your extension application".
- Card "Your filing dates", with "Use the actual dates on your documents. Nothing is saved automatically."
  - "Current OPT EAD End Date", help text "Expiration date printed on your current EAD."
  - "STEM DSO Recommendation Date (Optional)", help text "The date your DSO entered the recommendation in SEVIS, not the date you requested it."
  - Save.
- A status card, **"Not open yet"**: "An actual SEVIS recommendation is required before filing. Adding a planned date does not mean it has been issued." The top edge of an orange-bordered element shows below it and is cut off.
- A Pro card in green: **"Waiting on STEM OPT? Get the bigger picture."** The three benefits are the same as before, with "Unlock Pro tracking →".

**Friction:**
- The "Nothing is saved automatically" and "Save to sync" pairing appears again.
- The H1 says "Guide", but no guide steps are visible on this screen. The page is a calculator.
- This is the fourth Pro card of the same design.

**What works:**
- The "Not open yet" status is plain and correct in principle. The note that a planned DSO date is not an issued recommendation stops people treating intent as fact.
- The EAD end date carries over from the OPT Clock tool.

**Accuracy and legal risk:**
- With an EAD end of 02/12/2027 and today being 2026-09-30, the 90-day-before-expiry window would open on or about 2026-11-14, so "Not open yet" is consistent. The opening date itself isn't visible on this screen.
- The 60-day filing requirement after the DSO recommendation is not shown here. It may be further down the page.

---

## 17. STEM Apply tool, scrolled (4.26.25 PM)

**Screen and state:** Scrolled to the footer.

**Features and data:**
- Left column: a collapsed "▸ How this estimate works" section, then the "Email reminders · Pro feature" card with "View Pro plans" in green.
- Right column: the bottom of the processing-time card ("Verified 2026-09-24. Not a minimum wait or guaranteed approval date."), a collapsed "▸ About these numbers", the "Check USCIS processing times" link, then the "Before you act" disclaimer and the "Official F-1 regulations" link.
- The footer is the same as in screenshot 15.

**Friction:**
- This structure is identical to the OPT Apply page. The four tools share one template, so the upsells and disclaimers repeat on every page.
- The processing figure shown at the top of this card is cut off, so we can't tell whether the STEM I-765 time differs from the OPT one (5 months).

**What works:**
- The consistent template means that once you learn one tool, you know all four.

**Accuracy and legal risk:**
- Only the verification date is visible, not the STEM processing figure itself, so there's nothing further to assess here.

---

## 18. STEM Clock tool, top (4.26.31 PM), URL `trackmyopt.com/tools/stem-clock`

**Screen and state:** The "STEM Clock" tab is active (purple theme). OPT Start 03/01/2026 and OPT EAD End 02/12/2027 are pre-filled. STEM Extension Start Date is empty, and Save looks disabled.

**Features and data:**
- Eyebrow "Free F-1 student planning tool". H1 **"STEM OPT Unemployment Calculator"**. Sub: "Record STEM extension employment dates and use this planning tool to monitor the unemployment time that may apply to your F-1 status."
- A collapsed "Before you start · guidance and limitations" box.
- Header "STEM Clock / Review your combined OPT history".
- Card "Your authorization dates", with "Enter actual EAD dates. Changing a start date will not overwrite your end date." Fields:
  - OPT Start Date
  - OPT EAD End Date
  - "STEM Extension Start Date", help text "Day after initial OPT expires. Enter only your applicable extension start, not a planned approval."
  - Save.
- A Pro card in purple: **"Stay ahead of your next STEM milestone."** It has the same three benefits and "Unlock Pro tracking →".

**Friction:**
- The user re-enters or re-confirms the same OPT dates on a fourth page. The four tools are separate pages rather than one timeline.
- The combined OPT plus STEM history is framed as a separate tool, when it is really a continuation of the same clock.
- The tab colours change on every page (blue, rust, green, purple), which adds visual noise without adding meaning.

**What works:**
- "Review your combined OPT history" signals that the STEM unemployment limit is cumulative with the initial OPT period, which is correct in concept.
- The help text "Day after initial OPT expires ... not a planned approval" is precise.
- "may apply to your F-1 status" is hedged wording that does not conclude anything about the user.

**Accuracy and legal risk:**
- The 150-day combined limit is not stated on this visible part of the screen. We can't see whether it appears further down.
- By default the STEM start date is the day after the OPT EAD end date. This screen gives no guidance on cases where the extension is filed on time but still pending past the EAD end (the 180-day automatic extension of work authorisation). How they handle that is not visible here.

---

## Cross-screen observations (this batch)

1. **Two shells.** The dashboard (sidebar app) and the tools (public marketing pages with a top nav) are separate. Clicking into a tool leaves the app, so the user loses the sidebar and has to find the "Dashboard" button to get back. This is a main reason it feels "hard to traverse".
2. **Upsell density.** Across screenshots 10 to 18 there are:
   - the promo banner
   - the Get Pro button (header and sidebar)
   - the Deals "HOT" pill
   - a full-page Pro paywall behind a navigation item
   - a Pro card on each of the four tools
   - an "Email reminders · Pro feature" card on each tool

   That is at least three paid prompts on every tool page, and reminders, the core safety feature, are paywalled.
3. **Fragmented model.** Four tools, four colours, four pages and four separate emails, for what is one student timeline (program end, then the OPT window, then the OPT clock, then the STEM window, then the STEM clock). The student has to put it together themselves.
4. **Trust patterns worth matching or beating:**
   - the processing-time card with its source, percentile, office, verification date and "not a guarantee" wording
   - the as-of date on counts ("Through Sep 30, 2026")
   - refusing to compute without a job history
   - precise field help text (the SEVIS entry date, not the request date)
   - the "Not open yet" status
   - a short "Before you act" note that points to the DSO
5. **Accuracy gaps to avoid in Duly:**
   - It attributes unemployment counting to "USCIS".
   - "Qualifying employment" and the counting rules are hidden behind collapsed sections.
   - No regulation citation is shown inline.
   - The price after the $0.99 7-day trial is not shown on the paywall screen.
   - Reminders run at a fixed 9:00 AM ET.
   - Some sample and marketing copy states day counts without "estimate" wording, which contradicts the tool pages.
6. **Duplication:**
   - four "add job" entry points and two "no job" entry points on one page
   - "Contact" linked three times
   - "Install Extension" and "Chrome Job Prefill" as separate sidebar items
   - a 17-item ungrouped sidebar that mixes immigration, jobs, taxes and insurance
