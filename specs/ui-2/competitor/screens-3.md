# TrackMyOPT walkthrough, screenshots 19 to 27 of 54

Source folder: /Users/ani/Desktop/Duly/trackmyOPT/. Captured 2026-09-30, 4:26:33 PM to 4:27:01 PM. Logged-in account shown as "SS / saianir...", free tier (sidebar footer reads "Get Pro").

Notes cover only what is on screen. Nothing off-screen is inferred.

---

## Two navigation shells appear in this set

- Screenshots 19 and 20 are at `trackmyopt.com/tools/stem-clock`. They use the **public marketing header**: Home, AI Resume Doctor, Features, About Us, Research, Blog, Contact Us, For Orgs, a "Dashboard" button and an avatar. There is no dashboard sidebar.
- Screenshots 21 to 27 are at `trackmyopt.com/dashboard/...`. They use the **app shell**:
  - Top: a dismissible purple promo strip, "Paste a job description. Get an ATS-ready resume in minutes: built for F-1 & OPT job search." with a "Build resume >" button.
  - Dark navy app bar: "Get Pro" (purple, crown icon), a "Deals, $8,136 free for you" pill with a red "HOT" tag, and a light/dark toggle.
  - Left sidebar with 17 entries: Home, OPT Dates, OPT Tools (expands), Case Status, Documents, H-1B Sponsors, Verified Jobs, Job Tracker, Career Tools (expands), Tax Filing, Health Insurance, then a divider, then Install Extension, Settings, Help, Chrome Job Prefill. The user's name and "Get Pro" sit at the bottom.
- The unemployment calculator, which is the core immigration tool, sends the user out of the app into the marketing site with a different header. Going from the dashboard to the tool and back changes the navigation model.
- Every dashboard screen carries three upsell or commerce surfaces before any content: the promo strip, "Get Pro" and "Deals HOT". The sidebar footer adds a fourth, "Get Pro".

---

## 19. STEM OPT unemployment calculator, mid-page (4.26.33 PM)

**Screen and state.** URL `/tools/stem-clock`. The tab title starts "STEM OPT Unemployment Ca..." The page is scrolled to the middle. The user has set an OPT start date but has not entered any jobs.

**Layout.**
- A main column on the left and a sidebar of info cards on the right.
- A small floating thumbnail at bottom right. It looks like a screen-recorder preview, not part of the site.
- A shield icon button at bottom right.

**Features, data and copy.**
- **Save strip.** "Save to sync with your dashboard." with a "Save" button in faded purple. The page is not saved by default.
- **Combined OPT + STEM estimate**, dated "Through Sep 30, 2026". Body: "Complete valid authorization dates and employment records to calculate." No number is shown.
- **Employment History.** "0 employment records" and a "+ Add Employment" button.
- **Amber alert, "Unemployment clock needs your job history".** Text: "You set OPT start to **Mar 1, 2026**. Without employment records, we cannot tell which days you were employed. USCIS only counts days without qualifying work in your field: add each job with start and end dates." Buttons: "+ Add current or past job" and "I'm between jobs".
- **Four stat tiles, all showing " to ":** Days Employed, Pending setup, Current Streak, Longest Gap. "Pending setup" reads as a status, not a metric, so it sits oddly among the other three.
- **Progress bar "Unemployment days used".** It is dashed and empty, with the right-hand label "Complete dates and job history to calculate". Hint: "Include every job since OPT started: check "I currently work here" for your present job."
- **Empty state.** An icon, "No employment records yet", and "Add each employer since your OPT started. For your current job," (cut off at the bottom of the screen).
- **Right sidebar:**
  - A purple "Unlock Pro tracking →" button. Below it: "Your calculator stays free. Comparisons depend on available reports, not exact approval dates or approval odds."
  - "What stops the clock?": "Only qualifying employment counts. Weekends and holidays count as unemployment when you are not employed. Keep your dates and supporting records up to date." It has a collapsible "▶ Counting rules".
  - "Before you act": "Planning estimates, not USCIS approval or a determination of status. Verify your EAD, qualifying employment, and filing requirements with your DSO." It links to "Official F-1 regulations ↗".

**Friction.**
- The screen shows three calls to add a job: "Add Employment", "Add current or past job", and a third lower down (see screenshot 20).
- It shows four empty tiles plus an empty bar. That is a lot of chrome with no answer in it.
- The Pro caption under "Unlock Pro tracking" talks about "approval dates or approval odds". That wording belongs to processing times, not to an unemployment count, so the upsell looks copied from another tool.
- The student has to leave the dashboard to reach this tool.
- Saving is manual and opt-in, which risks losing the data entered.

**What works.**
- It explains clearly why no number can be shown yet.
- "I'm between jobs" is a quick path for a common state.
- The "Before you act" disclaimer is sound: it says these are estimates, not a determination, and points to the DSO.
- "Weekends and holidays count" is a useful, often-missed fact stated plainly.
- The "Through Sep 30, 2026" as-of date is a good trust signal.

**Accuracy and legal-risk notes.**
- "USCIS only counts days without qualifying work in your field." The unemployment limit comes from the regulation and is reported through SEVIS, the DSO and SEVP. Naming "USCIS" as the counter is imprecise.
- The screen never states the limits themselves (90 days on post-completion OPT, 150 total with the STEM extension). They may sit inside the collapsed "Counting rules", which is not visible.
- "OPT start" is used where the clock actually runs from the EAD validity start date. The label could lead to a wrong input if the student enters a program end date or a job start date.
- "Qualifying employment" is not defined on screen. Its meaning differs between post-completion OPT and STEM OPT, where the work must be with an E-Verify employer under a Form I-983.

---

## 20. STEM OPT calculator, bottom of page and site footer (4.26.35 PM)

**Screen and state.** Same URL, scrolled to the bottom.

**Features, data and copy.**
- A third add-job button, "+ Add Your First Job", at the end of the empty state.
- **"Email reminders" card:** "Use your saved dates · Pro feature". Body: "Optional reminders, without changing your calculator." A purple "View Pro plans" button.
- **Footer.**
  - Brand blurb: "3,000+ users have signed up for TrackMyOPT. 10,000+ people regularly use our free tools."
  - Columns:
    - **Product:** Features, Pricing, Free Tools, How It Works, About Us, Success Stories, Chrome Extension.
    - **Guides:** 90-Day Unemployment Rule, STEM OPT Extension Guide, OPT to H-1B Transition, I-983 Training Plan Guide, OPT Processing Time 2026, F-1 Tax Filing Guide, OPT Career Guide, Health Insurance Guide.
    - **Resources:** E-Verify Employer Search, All Blog Posts, Glossary, Answers (Q&A), Comparisons, Research, Immigration Facts, FAQ, Help Center, Contact, Report Fraud.
    - **Legal:** Privacy Policy, Terms of Service, Refund Policy, Disclaimer, Cookie Policy, Security, Contact, Privacy choices.
  - Bottom line: "© 2026 TrackMyOPT. Made with  for international students." Badges read "SSL SECURE" and "PAYMENTS BY STRIPE", followed by a Cloudflare-style cloud logo.

**Friction.**
- Reminders about the student's own unemployment deadline are behind Pro. The most safety-relevant feature, a warning before the student runs out of days, is the one that is paywalled.
- The footer has 34 links across 4 columns, and "Contact" appears twice. The scale reads as a content and SEO site rather than a focused tool.

**What works.**
- There is broad self-serve content: guides for the 90-day rule, STEM, the I-983 and taxes.
- A dedicated "Disclaimer" page, plus "Security" and "Report Fraud" links, act as trust cues.
- The user counts are social proof.

**Accuracy and legal-risk notes.**
- "SSL SECURE" and "PAYMENTS BY STRIPE" are generic badges, not a security posture.
- "3,000+ users" and "10,000+ people regularly use" are unverified marketing claims.

---

## 21. USCIS Case Status, empty (4.26.41 PM)

**Screen and state.** URL `/dashboard/case-status`. "Case Status" is highlighted in the sidebar. No receipt number is saved yet.

**Features, data and copy.**
- Heading "USCIS Case Status".
- "Add your receipt number": "Add your receipt number: Free includes manual refresh; Pro adds daily auto-checks and email alerts."
- **"Where to find it" box:**
  - "On your **I-797C receipt notice**: 13 characters at the top (e.g. IOE1234567890)"
  - "In your USCIS online account under your I-765 submission"
  - "Haven't filed yet? Check your OPT filing window" (link)
- **"What are you tracking?"** is a dropdown set to "Initial OPT (EAD)". Helper text: "Used for approval-time estimates. USCIS form is typically I-765 for both."
- **"USCIS Receipt Number"** field. Placeholder "e.g., IOE1234567890", mask hint "XXX-XXXXXXXXXX", and a "Save & Track" button. Helper text: "13 characters: 3-letter prefix + 10 digits".
- A collapsible "How tracking works".

**Friction.**
- The limits of the free tier are stated up front, which is honest but frames the page around upsell.
- The mask hint "XXX-XXXXXXXXXX" shows a hyphen, but the example has none. It is unclear whether to type one.
- "for both" refers to options that are not visible until the dropdown is opened.

**What works.**
- It is a single-purpose screen with one field and one button.
- It shows exactly where to find the number, including the 13-character format.
- It links out to the filing-window tool for people who have not filed yet.

**Accuracy and legal-risk notes.**
- Case-status tracking relies on USCIS data. How it is fetched (an official API or scraping) is not shown.
- "Approval-time estimates" are predictions shown next to official status. The caption in screenshot 19 hedges them ("not exact approval dates or approval odds"), but that hedge is not visible here.
- Receipt numbers are identifiers of the case. Nothing on screen says how they are stored.

---

## 22. Document Vault, locked Pro wall (4.26.43 PM)

**Screen and state.** URL `/dashboard/documents`. "Documents" is highlighted. The whole page is a paywall.

**Features, data and copy.**
- Hero: a lock icon and "Document Vault (Pro)": "Securely store your I-20s, EAD cards, I-983, offer letters, and paystubs with AI-powered analysis and automatic expiry reminders." Buttons: "Unlock with Pro" and "Back to Dashboard".
- Three feature cards:
  - "All documents in one place": "Upload I-20s, EAD cards, passport, visa, I-983, offer letters, and paystubs with smart tags and filters."
  - "AI-powered document analysis": "**Gemini AI** reads your documents to extract expiry dates, SEVIS IDs, receipt numbers, and key fields automatically."
  - "Smart expiry reminders": "Get email reminders before a document expires."
- Footer line: "Upgrade to Pro to unlock Document Vault: secure storage for EAD, I-20, and passport with expiry reminders."

**Friction.**
- A primary sidebar item leads to a dead end on the free tier. The student cannot even see an empty vault or add one document.
- The same pitch is repeated three times on one screen: the hero, the cards and the footer line.

**What works.**
- It clearly names the documents that matter to an F-1 student: I-20, EAD, I-983, passport, visa, offer letters and paystubs.
- Pulling expiry dates, SEVIS IDs and receipt numbers out of uploads is a genuine time-saver.
- Reminders before a document expires address a real risk.

**Accuracy and legal-risk notes.**
- **Trust and privacy.** The page states that a third-party AI (Google Gemini) reads passports, I-20s, EADs and paystubs. That is highly sensitive PII: SEVIS IDs, A-numbers, passport numbers and income. The page does not say:
  - where the files are stored,
  - whether they are encrypted,
  - whether the AI provider keeps them,
  - how to delete them.
- The only on-page assurance is the word "Securely".
- Dates the AI extracts are not shown as needing user confirmation, so a misread expiry date could drive a wrong reminder.

---

## 23. H-1B Sponsors, "Sponsor Intelligence Dashboard", loading (4.26.46 PM)

**Screen and state.** URL `/dashboard/career/h1b-sponsors`. The tab title starts "OPT Tracker & H-1B Finder fo..." Data has not loaded yet.

**Features, data and copy.**
- Heading "Sponsor Intelligence Dashboard": "Research historical H-1B activity, calculated trends, and sponsor scores, then save target companies to your job tracker. Confirm current hiring and sponsorship directly with each employer."
- Four stat tiles: Total Sponsors 0, High Sponsors 0, Saved Sponsors 0, Updated "Monthly".
- Tabs: All Sponsors and Saved Sponsors.
- Search box, "Search company (Amazon, Infosys, Deloitte...)", with a sort control, "Most Sponsorship".
- FILTERS: All Locations, All Industries, All Sizes, All Strength, All Status, All Trends.
- Below the filters, three blank cards act as skeleton placeholders.

**Friction.**
- The tiles briefly read "0" before the data arrives, which looks like broken data rather than a loading state.
- Six filters plus a sort, before the student has seen any results.

**What works.**
- The description tells students to confirm with the employer, which avoids implying a guarantee of sponsorship.
- Linking saved companies to the job tracker is a useful connection.

**Accuracy and legal-risk notes.**
- "Updated Monthly" gives a refresh cadence but no data as-of date.
- "Sponsor scores" and "Strength" are the vendor's own derived metrics. The method is not shown on this screen.

---

## 24. H-1B Sponsors, loaded (4.26.50 PM)

**Screen and state.** Same URL, data now loaded.

**Features, data and copy.**
- Tiles: Total Sponsors **24,682**, High Sponsors **7**, Saved Sponsors 0, Updated Monthly.
- Paywall banner with a lock: "Showing top 25 of 24,682 sponsors. 24,657 more companies with approval analytics are on Pro." A button reads "Upgrade to Pro".
- Filters and sort are the same as screenshot 23.
- First row of cards, each with logo, name, city and industry "Tech", a SCORE /100, "FY2025 … records", and a bookmark icon:

  | Company | City | Score | FY2025 records |
  |---|---|---|---|
  | Amazon.com Services LLC | Seattle, WA | 100/100 | 5,698 |
  | COGNIZANT TECHNOLOGY SOLUTIONS US ... | College Station, TX | 100/100 | 4,971 |
  | INFOSYS LIMITED | Richardson, TX | 100/100 | 3,748 |

- Status chips: " Specific Office Cluster" on Amazon, and "● FY2025 activity recorded" on Cognizant and Infosys.

**Friction.**
- Free users see 25 of 24,682 companies, about 0.1%. The search box may also be limited by this cap, but that is not shown.
- Company-name casing is inconsistent, for example "Amazon.com Services LLC" next to "INFOSYS LIMITED". The names look like raw data, not cleaned-up display names.

**What works.**
- It is a quick way to see which employers file H-1Bs at volume, which OPT students want to know when job hunting.

**Accuracy and legal-risk notes.**
- "High Sponsors: 7", yet every card visible so far scores 100/100. At the top the score saturates and stops telling companies apart, and the definition of "High" is not shown.
- "records" is not defined. It could mean LCAs, petitions or approvals, and the counts mean very different things depending on which.
- "Specific Office Cluster" is shown as a warning with no explanation on the card.
- The page uses third-party company logos. That is a trademark exposure, and it could also imply an endorsement.
- Most data is FY2025 as of September 2026. That is reasonable, but the as-of month is not shown.

---

## 25. H-1B Sponsors, scrolled cards (4.26.52 PM)

**Screen and state.** Same page, scrolled down. The cursor hovers the Infosys card, whose name turns blue and whose Careers button changes to "Careers →".

**Features, data and copy.**
- Second row of cards:

  | Company | City | Score | FY2025 records | Chip |
  |---|---|---|---|---|
  | Microsoft Corporation | Redmond, WA | 100/100 | 3,584 | FY2025 activity recorded |
  | Ernst & Young U.S. LLP | Secaucus, NJ | 100/100 | 2,872 |  Specific Office Cluster |
  | TATA CONSULTANCY SERVICES LIMITED | Rockville, MD | 100/100 | 2,603 | FY2025 activity recorded |

- Each card has four actions:
  - "Overview"
  - "Careers " (a green button with a check; it turns blue with an arrow on hover)
  - a LinkedIn icon button
  - a briefcase icon button with no label

**Friction.**
- Four buttons per card, two of them icons only. The meaning of the briefcase button and of the check on "Careers" is not stated.
- Every visible card again scores 100/100, which adds nothing to the decision.
- The layout is dense: three cards across, each with two stat boxes, a chip and four buttons.

**What works.**
- One click from a sponsor to its careers page and LinkedIn is practical for a job search.

**Accuracy and legal-risk notes.**
- These are the same undefined "records" and "score", now on more companies.
- The "" on Careers may suggest a verified careers link. What was verified is not stated.

---

## 26. Job Application Tracker, empty board (4.26.58 PM)

**Screen and state.** URL `/dashboard/career/job-tracker`. "Job Tracker" is highlighted. No applications have been added.

**Features, data and copy.**
- "← Back to Career Hub", plus a bell icon at top right.
- Heading "Job Application Tracker": "Track applications, interviews, and offers in one place". A chip reads "Job tracking included on Free".
- Stat tiles, all 0: Applications, Interviews, Follow-ups due, Offers.
- View switcher (Board, Table, Calendar) and a green "+ Add Application" button.
- "Pipeline Insights" (collapsed).
- Filter bar:
  - a "Search company, role, location..." box,
  - a Status control set to "All Stages",
  - a Follow-ups control set to "All",
  - a Sort control set to "Recently Added",
  - an "Archived" button.
- Kanban columns, each at "0 Jobs": Wishlist, Applied, Recruiter Screen, Interviewing, and Final Round (cut off at the right, so more columns likely scroll horizontally).

**Friction.**
- "Back to Career Hub" refers to a page that has no sidebar entry called "Career Hub", so the student cannot tell where it leads.
- The empty board shows five-plus blank columns with no guidance, prompt or sample card.
- There are three views, four filters, "Pipeline Insights" and "Archived" before the first job has been added.
- Nothing visible connects "Offers" or a started job to the unemployment clock in screenshot 19. Job data is entered separately in two places.

**What works.**
- It is free, which is stated clearly.
- The stages are familiar, and "Follow-ups due" gives a practical nudge.

**Accuracy and legal-risk notes.** None visible.

---

## 27. Resume Generator, step 1 of 3 (4.27.01 PM)

**Screen and state.**
- URL `/dashboard/career/resume-generator`.
- The promo strip is gone from the top, either dismissed or not shown on this page.
- In the sidebar, "Career Tools" is expanded to show Resume Generator (active), Saved Resumes, ATS Scanner and Networking. So the sidebar holds more than 17 items when expanded.

**Features, data and copy.**
- A "← Back" link, the title "Resume Generator" with a 3-step progress bar ("Step 1 of 3"), and a "History" button.
- **MONTHLY USAGE** meter: "0 / 1", "0%", "Upgrade for more". The free tier gets one generation per month.
- **Resume panel** ("Paste or upload your current resume"). It has a "Saved" button, and offers:
  - a text area,
  - "Upload a file or drag and drop: PDF, DOC, DOCX, TXT (max 10MB)",
  - "Or enter Google Drive / cloud storage URL",
  - "Save resume for future use", **checked by default**, with a "Resume name (optional)" field,
  - a "0 characters" counter.
- **Job description panel**, "Paste the job description" ("Copy the posting from the job board or company website."). It offers:
  - a text area,
  - a checkbox, **"Align job titles to this role"**, with a help icon,
  - "Import from a link instead", a URL field, `https://company.com/careers/job`,
  - "Tip: Include the full job requirements, skills, and qualifications for better AI matching.",
  - a "0 characters" counter.
- **"Job fit preview"**: "See missing keywords before generating: saves credits and targets gaps." with an "Analyze fit" button.
- A "Select Template >" button, disabled.

**Friction.**
- A lot of input options sit on one step: paste, upload, cloud URL, saved resumes, JD paste and JD link.
- The word "credits" appears, but the meter says "0 / 1". The currency is not explained.
- Saving the resume is checked by default, so the resume (PII) is kept unless the student unticks it.
- This is a career tool presented with the same weight as the immigration tools. Whatever the product's core value is, it is diluted.

**What works.**
- The flow is clear, with steps labelled "Step 1 of 3".
- The job fit preview before generating spends the quota wisely.
- Importing a JD from a link saves copying.

**Accuracy and legal-risk notes.**
- **"Align job titles to this role"** appears to let the AI change past job titles to match the target posting. That is misrepresentation. For F-1 students it carries a specific extra risk: the job titles and duties on file for OPT and STEM OPT (SEVP portal entries, the I-983, and later H-1B filings) should stay consistent. A resume with changed titles can conflict with those records in an employer or government review.
- The resume may be pulled from a Google Drive URL and saved by default. The page does not say how it is stored or kept.

---

## Cross-screen patterns (19 to 27)

1. **Upsell density.**
   - Every dashboard screen has a promo strip, "Get Pro", "Deals HOT $8,136 free for you" and "Get Pro" in the sidebar footer.
   - Five of the nine screens also carry a page-level paywall or quota: the Pro caption on the calculator, Pro email reminders, the auto-checks note on Case Status, the full Documents wall, the 25-of-24,682 sponsor cap and the 0/1 resume quota.
   - The safety features are the gated ones: deadline reminders, daily case checks and document expiry reminders.
2. **Scope sprawl.** The sidebar mixes immigration tools (OPT Dates, Case Status, Documents), job search (H-1B Sponsors, Verified Jobs, Job Tracker, Career Tools with four sub-tools), life admin (Tax Filing, Health Insurance) and browser extensions (Install Extension, Chrome Job Prefill). No screen says what the product's single promise is.
3. **Broken navigation model.** The unemployment calculator lives on the public site with a different header. "Back to Career Hub" points to a page the sidebar does not name. Career Tools expands in place and pushes other items down.
4. **Disconnected data.** The job history for the unemployment clock and the job tracker are separate entry points. Nothing visible shares employment dates between them.
5. **Trust signals, weak and strong.**
   - Strong: plain "planning estimates, not USCIS approval" disclaimers, "Verify with your DSO", a link to the official F-1 regulations, "confirm sponsorship with each employer", and the as-of date on the calculator.
   - Weak: third-party AI reading passports and I-20s with no stated handling, generic "SSL SECURE" badges, unverified user counts, undefined "records" and "score", scores saturated at 100, and third-party logos.
6. **Empty states.**
   - The calculator explains well why it cannot calculate, but it shows three add-job buttons, four empty tiles and an empty bar.
   - The job board is five blank columns with no guidance.
   - The sponsor tiles show "0" while loading.
