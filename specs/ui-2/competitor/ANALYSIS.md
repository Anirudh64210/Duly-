# TrackMyOPT and Duly: what to learn, where Duly wins, what to build

Final version, 2026-09-30. Written from the 54 screenshots in /Users/ani/Desktop/Duly/trackmyOPT/ (notes in screens-1.md to screens-6.md) and from Duly's own files, each named where it is used. Their copy is quoted as it appears on screen. Where their text has a long dash, it is shown here as a colon, because this repo's copy check refuses long dashes.

## Summary for the founder

What they are. TrackMyOPT tracks OPT dates, and a job-search business is built around it: a resume writer, a job tracker, an H-1B sponsor search, a Chrome autofill extension, tax and insurance referral pages, and a deals page ("$8,136 free for you"). The OPT part has good ideas. Everything else is sold on top of it, on every screen.

Why it feels crowded. You were right, and the screenshots show why:
- There are 15 sidebar entries (about 19 with Career Tools open), with no grouping. OPT dates sit next to tax, insurance, resumes and two separate extension entries.
- Every app screen shows four sales prompts before any content: a resume banner, "Get Pro", "Deals HOT", and "Get Pro" again in the sidebar.
- One student timeline is split into four tools, four colours and four pages. The tools and Help leave the app for the marketing website, and the sidebar disappears.
- The same ask repeats. Home has up to five ways to add a job, and one screen asks twice for the USCIS receipt number.

Where it goes wrong on trust. All of this is on your account's screens:
- A red chart says "214 of 90 days used" with no job recorded. The caption above it says it won't show a count without job history.
- Home says "Window Closed" and "Filing Window is Open" at the same time, for someone already on OPT.
- The Timeline shows each date one day earlier than the saved date (Feb 11 against Feb 12).
- It says "STEM Extension: Eligible", worked out only from the words "Computer Science".
- Their Help page says cap-gap runs "through October 1". Duly's rule pack, taken from the rule itself, has April 1 since 2025-01-17.
- The document vault costs money and says "Gemini AI reads your documents".
- Deadline reminders are only on the paid plan.

Where Duly is already better, and how we know:
- **Unemployment count:** Duly's engine won't count unemployment days until the student confirms their job list is complete (engine/f1.py).
- **Sources:** every date carries the rule's own words, its source and the day it was checked (rulepacks/f1-us).
- **One app:** it has six main places and no ads (this is in the prototype).
- **Private documents:** they are read on the student's own Mac. This is decided (D55) but not built yet.
- **No guessing:** personal questions get a drafted email to the DSO, never a verdict (BOUNDARY.md).

Where Duly is behind:
- **Reach:** they work on the web, on phones and in Chrome. So does Duly: it is web, phone and desktop (the Mac window was for prototyping only). They also have a browser extension, which Duly does not plan.
- **Case status:** theirs is manual on the free plan and checked daily on the paid plan. Duly's is manual until USCIS approves a connection (B8).
- **Processing times:** Duly shows none.
- **STEM:** Duly's prototype also guesses STEM from the major name. That is the same weakness as theirs, only worded more softly.
- **Price:** Duly has none yet (D8), so "cheaper" is a plan, not a fact.
- **Other visas:** Duly covers F-1 in depth, but the H-1B, O-1 and EB-1A rule packs are empty.

The plan in six moves:
1. **One number, one value, everywhere.** Home, Timeline and Your profile read the same engine result, in the student's own time zone. A test fails if two screens disagree.
2. **A calm way to answer "no job yet" or "that's every job",** so the unemployment count can start.
3. **Reminders are always free,** at the student's local morning, all in one message.
4. **STEM from the I-20's field code,** read on the device, not a guess from the major.
5. **Help sits on the item itself,** behind the ⓘ and the source mark, with the student's own dates. No help website, no FAQ.
6. **Say the promise once, in plain words, and keep it true:** your papers and dates in one private place, no ads, no deals, no selling data.

What we will not copy: sales banners, deals, streaks, red alarm charts, "Eligible" badges, an outside AI reading passports, saved job-site passwords, help on another website, or safety features behind a paywall.

Your decisions:
1. Reminders stay free for good.
2. The one-line promise.
3. How Duly reaches the phone.
4. Whether email reminders may send dates to Duly's server.
5. Whether to show USCIS processing times as a figure quoted from USCIS, with its source and date.
6. Whether to save the government's STEM degree list as a source in the F-1 rule pack.

## 1. Basis and limits

- **Their side.** Only what the 54 screenshots show, all taken 2026-09-30 between 4:25 and 4:29 PM on one free account. That account had an OPT start of 03/01/2026, an EAD end of 02/12/2027, no program end date, no job and no receipt.
  - The public pages (tools, Help, the Chrome Web Store listing) count only where a screenshot shows them.
  - How their code works, how they fetch USCIS data, and what their paid features really do are not visible. This review does not assume them.
- **Spot-checked against the images:**
  - "214 of 90 days used" (4.25.24);
  - the Timeline dates and "Filing Window is Open" (4.25.18);
  - the paywall at /dashboard/opt-dates (4.25.54);
  - the Gemini vault (4.26.43);
  - cap-gap "through October 1" (4.28.07).
- **Duly's side.** A claim that Duly is better is kept only when one of these backs it. Each claim is labelled with the one it rests on:
  - **Engine:** code on this branch.
  - **Pack:** a sourced row in rulepacks/f1-us/v2026.09.
  - **Prototype:** specs/ui-2/prototype, a design, not the shipped app.
  - **Decided:** DECISIONS.md, not yet built.
- **Law.** A statement that their copy is wrong is kept only when Duly's rule pack holds the rule with its quote. Tax, health insurance, marketing-email law and consumer-protection points are not in any Duly pack, so they appear only as open questions.

## 2. What they do well: the need behind each idea

These are real student needs. Section 7 says how Duly meets each one its own way.

| Need | What their screens show |
|---|---|
| See where I stand at a glance | Four tiles on Home, with "135 days" until the EAD ends (shot 1) |
| One thing to do next | A "Next step" card (shot 1) |
| Honesty when data is missing | The OPT Clock tool refuses to count without a job history and says why (shots 9, 13, 14) |
| Know the as-of date of a count | "Through Sep 30, 2026" on the clock (shot 13) |
| Enter the right date | "The date your DSO entered the recommendation in SEVIS, not the date you requested it" (shot 11); "do not estimate" (shot 8) |
| A path for "I have no job" | "I'm between jobs" and "I have no qualifying employment to record" (shots 9, 13) |
| When will USCIS decide | A processing-time card with category, office, percentile, "Verified 2026-09-24" and "Not a minimum wait or guaranteed approval date" (shot 12) |
| Be warned before dates | Email reminders, with a sample email shown (shot 10; Pro only) |
| Find my receipt number | "On your I-797C receipt notice, 13 characters at the top" (shot 21) |
| Leave with my data | Free JSON and CSV export (shot 39); self-serve "Delete Account" (shot 36) |
| Plain promises about what the tool won't do | "Nothing is sent automatically" (shot 30); "Never auto-submits" (shot 34) |
| Understand the terms | Dotted-underline explanations on OPT, EAD and DSO (shot 7) |

## 3. Why it feels crowded and hard to move through

1. **No single promise.** The browser tab reads "OPT Tracker & H-1B Finder". The only line that says what the product does is on the OPT Dates page: "Track filing windows, OPT dates, and employment history in one place" (shot 6).
2. **Sales before content.** Every app screen carries the resume banner, "Get Pro", "Deals $8,136 free for you HOT", and "Get Pro" under the user name. On top of that:
   - a full Pro panel on OPT Dates (shot 10);
   - a Pro card on each tool (shots 11 to 19);
   - blurred paywalls in Notifications (shot 38);
   - the whole Documents page is a paywall (shot 22).
3. **Too many top-level places.** 15 sidebar entries at one level (shots 1, 37). The core items scroll out of view on the tax and insurance pages (shots 31 to 33).
4. **Two shells.** The four date tools and Help sit on the public site with a different top bar and no sidebar (shots 11 to 20, 40 to 48). "Back to Career Hub" points to a page the sidebar does not name (shots 26, 29).
5. **One timeline cut into four tools.** OPT Apply, OPT Clock, STEM Apply and STEM Clock, each with its own colour and page (shots 11 to 19). The same OPT dates are shown again on each, and reminders are sold as "Separate email per tool" (shot 10).
6. **Repeats.**
   - Up to five ways to add a job on Home and three on OPT Dates (shots 1 to 9).
   - Two progress measures that disagree: "55%" on Home and "1/4 done" on OPT Dates (shots 1, 6).
   - Help, FAQ, Answers (Q&A), Glossary and Blog overlap (shots 40 to 48).
7. **Empty screens full of chrome.** Four blank tiles and an empty bar before any job exists (shot 14), and five blank job-board columns (shot 26).

## 4. Where their screens are wrong or risky

Only points that the screenshots show and that Duly's rule pack or plain arithmetic can check.

| # | On screen | Why it is a problem | Checked against |
|---|---|---|---|
| W1 | "214 of 90 days used", red donut and trend (shot 4), beside "we won't show a compliance count" (shot 1) and "Charts reflect your logged employment history" (shot 5) | 214 is every day from 2026-03-01 to 2026-09-30 counted as unemployment, with no job recorded. It contradicts its own caption and the OPT Dates page | Arithmetic; opt.unemployment_limit_days (90) |
| W2 | Timeline "OPT EAD Expires Feb 11, 2027" and "OPT Started Feb 28, 2026" (shot 3), against the saved 02/12/2027 and 03/01/2026 | A legal date shown one day early. The cause is not visible; a time-zone parsing fault fits the pattern | The saved values (shot 7) |
| W3 | "Window Closed" with "File ASAP" (shot 1), and "Filing Window is Open: You can now submit your OPT application" (shot 3) | They contradict each other, and neither applies to someone already on OPT | Same page |
| W4 | "STEM Extension: Eligible" (shot 1), "You're eligible for a 24-month STEM OPT extension" (shot 3), and "STEM Extension Eligible" with "Force override" (shot 35) | A conclusion about the person, drawn from a degree name, with no employer on file. The rule looks at whether the degree is in a category on the DHS list, plus employer terms, a training plan and more | stem.requires.* rows; BOUNDARY B2 |
| W5 | An "Apply STEM Extension" button 135 days before the EAD end (shot 2) | The window opens 90 days before the card ends: 2026-11-14 for this account | stem.apply_before_expiry_days (90) |
| W6 | Cap-gap "Automatically extends OPT through October 1" (shot 41) | Since 2025-01-17 the rule says April 1 of the fiscal year, or the petition's start date if earlier | capgap.end_month_day, 8 CFR 214.2(f)(5)(vi)(A) |
| W7 | STEM filing described only as "up to 90 days before OPT expires" (shots 41, 45, 46) | Leaves out filing within 60 days of the DSO's recommendation in SEVIS | stem.file_within_days_of_recommendation |
| W8 | OPT filing "90 days before to 60 days after program end", with nothing about the recommendation (shot 40) | Leaves out filing within 30 days of the DSO's OPT recommendation | opt.file_within_days_of_recommendation |
| W9 | "Using 12+ months of full-time CPT eliminates your eligibility for OPT" (shot 45) | SEVP's guidance counts full-time CPT at the same program level only | cpt.full_time_months_bar; cpt.same_level_counts (guidance) |
| W10 | "Time used reduces post-completion OPT" (shot 40) | SEVP's guidance counts part-time pre-completion OPT at half: six months counts as three | opt.part_time_pre_completion_counts (guidance) |
| W11 | "different education levels" for a second STEM extension (shot 41) | The rule says a higher degree level | stem.second_higher_level |
| W12 | "USCIS only counts days without qualifying work" (shots 9, 14, 19) | The limit is in the F-1 regulation; it is not a count USCIS keeps | opt.unemployment_limit_days, 8 CFR 214.2(f)(10)(ii)(E) |
| W13 | "Gemini AI reads your documents to extract expiry dates, SEVIS IDs, receipt numbers" (shot 22) | Passports, I-20s and EADs go to an outside AI. The page does not say where files are stored, whether the provider keeps them, or whether read fields are confirmed before use | Duly D13, D55 |
| W14 | Reminders and case-change alerts only on Pro (shots 10, 37, 38, 48) | The product holds the date and does not warn a free user | A product choice, not a legal finding |
| W15 | One toggle for "important updates, tips, and promotional offers" (shot 38) | Turning off promotions also turns off the important notices | Product choice |
| W16 | The extension saves job-site passwords and fills them with "No extra confirmation is required" (shot 47) | Widens what a breach would expose, in a product that also holds immigration papers | Product choice |

Open questions, not findings, because Duly has no source for them yet:
- their tax copy (Form 8843, the 5-year question, FICA);
- "not legally required" health insurance, and "health insurance plans that meet OPT requirements";
- the single notification toggle under email law;
- the referral disclosure placed only at the bottom of Offers;
- the "$16.67" struck-through price;
- the bundled attorney consultation.

## 5. Where Duly is better today, and what backs each claim

| # | Claim | Their evidence | Duly evidence | Rests on |
|---|---|---|---|---|
| B1 | Duly shows no unemployment count it cannot stand behind | W1 | `_add_counts` counts only when the job list is confirmed complete, the dates agree and the card is post-completion (engine/f1.py, `counted_at_all`); otherwise the item has no value. The prototype's no-job Home says "Add your job to count these days" | Engine, Prototype |
| B2 | Every rule and date shows its words, source and check date, one tap away | Their Help has no citation or date (shots 40 to 46) | Each pack row has a citation, quote, saved snapshot and `checked_on`. The prototype's source sheet shows the plain words, the quote, the working and "Checked Sep 30" | Pack, Prototype |
| B3 | Duly's law is current where theirs is stale | W6 to W11 | The rows named in section 4, with effective dates and regimes (D1) | Pack |
| B4 | Both STEM filing limits appear on the student's own path | W5, W7 | Next steps shows the window Nov 15, 2026 to Feb 13, 2027, and the step "Within 60 days of your school's recommendation" (data.js `stem.tasks`, `within60`) | Prototype, Pack |
| B5 | No verdicts about the person | W4 | BOUNDARY B1 to B10. The copy check refuses "eligible" and "qualify" in product copy (tools/copy_lint/lint.py). The prototype asks "Planning to apply for STEM OPT?" and never says whether the student can | Decided, Prototype |
| B6 | One app, one shell, few places | Section 3 | Six main places (Home, Next steps, USCIS status, Documents, News, Timeline) and three quiet ones (Your profile, Settings, Feedback) (components.js `NAV`). The shell is drawn once (BRIEF round 2, note 1) | Prototype |
| B7 | No ads, deals or career upsells | Section 3, point 2 | No such surface in the prototype; the scope is immigration (D47) | Prototype, Decided |
| B8 | Documents stay private | W13 | Read and sorted on the device, each field confirmed by the student (D55). Stored encrypted on the Mac, with an optional backup only the student can unlock (D54). No document values reach any model (D60) | Decided, not built |
| B9 | A personal question gets a drafted DSO email, not a guess | Their FAQ gives general answers with no link to the person's dates | BOUNDARY "The step back"; the DSO email in the student's voice (D57, data.js `email`) | Decided, Prototype |
| B10 | Law changes reach the student with what they change for them | Their Help is generic and undated | News articles written only from saved sources, each with "For you" (BRIEF round 3, note 6); the updates pipeline with Ops approval (D22) | Prototype; pipeline not built |
| B11 | Days are the student's own calendar days | W2; reminders fixed at "9:00 AM ET" (shot 38) | D33; Settings shows "New York, set from this Mac" | Decided, Prototype |

## 6. Where Duly is equal or behind

| # | Gap | Detail | What to do |
|---|---|---|---|
| G1 | Reach | They work on the web, on phones and in Chrome (shots 34, 48). Duly is web, phone and desktop (the Mac window was for prototyping only, founder 2026-09-30); the prototype has a phone layout. They add a browser extension | Decision 10.3 |
| G2 | Case status | Both are manual on the free plan; they check daily on Pro (shot 37). Duly's live status waits on USCIS approval (B8) | Keep "as of" dates; promise no live status until B8 |
| G3 | Processing times | They show a sourced, dated card (shot 12). Duly shows none | Move 7.7; decision 10.5 |
| G4 | STEM field | Duly's onboarding matches the major against a list of names (welcome.js `STEM_FIELDS`, "This looks like a STEM degree"). Your profile says "Yes, on the STEM list", and the source link goes to the ice.gov home page. The DHS list itself is not a saved source. The wording is softer than W4, but the basis is the same | Move 7.4 |
| G5 | Breadth | They cover OPT and STEM OPT for immigration. Duly's F-1 pack is deep (CPT, OPT, STEM OPT, cap-gap, grace period, transfer, travel), but the H-1B, O-1 and EB-1A packs are empty (BACKLOG B5) | Keep the order in D48 |
| G6 | Price | They show Free, Pro at $4.17 a month billed yearly, Dedicated at $12.50 a month, and a $0.99 7-day trial (shot 37). Duly has no price (D8) | Decision 10.1 |
| G7 | Real users | They claim "3,000+ users have signed up" (shot 15); their extension shows 17 users (shot 34). Duly has none yet | Not a design matter |
| G8 | A "no job" answer | Their "I'm between jobs" gives a one-tap answer. Duly's engine needs the job list confirmed complete, and the prototype has no one-tap way to say so | Move 7.2 |

## 7. The plan: meet each need Duly's own way

Every move is checked against the BRIEF:
- less explaining: the reason sits behind an ⓘ;
- calm: nothing red or loud unless it truly matters;
- intentional: one clear action per screen;
- private: the student's papers stay theirs.

**7.1 One number, one value, everywhere.** Their Home, Timeline and OPT Dates disagree (W1 to W3).
- In Duly, each figure on screen is an engine item id, and every screen that shows it reads the same result.
- Dates are calendar dates in the student's own time zone (D33), never passed through a time conversion.
- Add a check that renders Home, Timeline and Your profile for the sample case and fails if the same item shows two values.
- Brief fit: calm and trustworthy, with no added words.

**7.2 Starting the unemployment count.**
- In Your profile, under Job, add one choice card that uses the student's own card dates: "Since Feb 14, 2026: Northwind Systems. Is that every job?"
  - "Yes, that's all"
  - "Add another job"
  - "I haven't had a job yet"
- The count appears only after an answer (B1). The empty state stays one line: "Add your job to count these days".
- No tiles of dashes, no streaks.
- Brief fit: choices, not interrogations; one place to answer.

**7.3 Reminders.**
- The prototype already has "Remind me before dates: Two weeks before, and again two days before". Proposed:
  - on by default;
  - never part of a paid plan;
  - sent at the student's local morning;
  - one message covering every date due, not one per tool.
- Document expiry dates, such as the passport's, feed the same reminders once read on the device.
- A desktop app can only remind while the Mac is on. An email reminder means the date goes to Duly's server. That is the founder's call (decision 10.4).
- Brief fit: alerted only when it matters.

**7.4 STEM from the I-20, not from a guess.**
- The I-20 prints the program's field code. Read it on the device (D55) and have the student confirm it once.
- Show the fact only, with the source mark. For example: "Your I-20's field code, 11.0701, is in a category on the STEM list."
- This needs the DHS STEM Designated Degree Program List saved as a source in rulepacks/f1-us, with its date. Until then, keep "This looks like a STEM degree" as a question, never a statement.
- Never say "eligible" (BOUNDARY B2).
- Brief fit: infer when the answer is in front of you.

**7.5 Help where the question is.**
- Their help is a separate website with general answers, some out of date (W6 to W11).
- Duly has no help centre and no FAQ. The ⓘ and the source mark on each item give the plain words, the student's own working ("Feb 13, 2027, minus 90 days, is Nov 15, 2026") and the quote.
- Terms that need explaining (the pack's `plain_terms`, such as "duration of status") are explained inside that sheet, not with underlines across the page.
- Brief fit: less explaining; the law one tap away.

**7.6 Ask for a date only when no document shows it.**
- Their long date form asks for the recommendation date with careful helper text (shots 7, 8).
- In Duly, the recommendation date comes from the new I-20, read on the device.
- When it must be asked, it is asked once, at the step that needs it ("Add the date your school recommends you", already in data.js).
- Brief fit: documents fill fields.

**7.7 When will USCIS decide.**
- This is a real need, and their card is their best trust pattern.
- On USCIS status, for a filed application only, show USCIS's own published processing time as a quoted figure with its source and date, behind a source mark.
- Frame it as USCIS's figure, not a prediction for the student (BOUNDARY B6).
- This needs the USCIS page saved as a source first.
- Brief fit: calm; shown only where it matters.

**7.8 The promise, said once.**
- Their product never states one (section 3, point 1).
- Put one line on Welcome and under the Home title, for example: "Your papers and dates in one private place, and what comes next."
- Add one short privacy line in Settings, true to what is built: "No ads. No partner deals. Your documents are read on this Mac."
- Avoid unscoped privacy claims ("never leaves" is refused by the copy check) and every word on BOUNDARY's list.
- Brief fit: why Duly, in one breath (round 2, note 2).

**7.9 Leaving is easy.** Duly already has these in Settings:
- Export: a PDF summary and every document, in one folder.
- Back up.
- Restore.
- Delete everything.

Keep all of them free, including the documents in the export. Their ZIP export of documents is Pro only (shot 39).

**7.10 Keep the timeline about the student.** Duly's Timeline shows only the student's own phases. Never add product events such as "Joined TrackMyOPT" (shot 3).

**7.11 Later, for the founder to weigh.** Neither of these goes ahead before the core above:
- A glance at the next date from the Mac menu bar; they use a Chrome popup for this (shot 34).
- A tax-season note for Form 8843, once an IRS source is saved.

## 8. What Duly will not copy

- Sales banners, "Get Pro" buttons, a deals page, dollar totals, "HOT" and "LIMITED TIME" badges.
- Safety features behind a paywall: reminders, case-change alerts, document storage.
- Four tools, four colours and four emails for one timeline.
- Streaks, "Longest Gap", red donuts and trend charts of a count.
- Verdict badges: "Eligible", "Window Closed", "File ASAP".
- An outside AI reading passports, I-20s or EADs.
- Saved job-site passwords, or any career tool in the nav.
- Help or tools that leave the app.
- One switch that mixes marketing with important notices.
- A bundled attorney consultation or paid referrals. BOUNDARY allows only a neutral pointer.
- Their words. Every Duly line is written fresh, from Duly's pack and the BRIEF.

## 9. Fit with the founder's brief

| Brief | How this plan holds to it |
|---|---|
| Less explaining (round 3) | Moves 7.5 and 7.6 remove forms and help pages; reasons stay behind an ⓘ |
| Calm | No sales surfaces, no red counts, one reminder message (7.3) |
| Intentional | One next move on Home; one place to answer each question (7.2) |
| Private | On-device reading (D55); no outside AI on documents; a privacy line that claims only what is true (7.8) |
| Plain words, law one tap away | The source sheet carries the words and the working (B2) |
| No conclusions about the student | 7.4 and 7.7 state facts and published figures only |

## 10. Decisions for the founder

1. **Reminders free for good.** Pricing is parked (D8). Deciding now that reminders, the count, documents and News are never paid lets "cheaper and more trustworthy" be true on day one.
2. **The one-line promise** (7.8). Pick the line or rewrite it.
3. **Phone reach** (G1). Settled: Duly is web, phone and desktop. What remains is only how the on-device privacy promise holds on the web and the phone (encryption in the browser and the app, the same as on the desktop).
4. **Email reminders** (7.3). Desktop-only reminders miss a closed Mac. Email means a date goes to Duly's server, which touches D13 and D54.
5. **Processing times** (7.7). Yes or no to a sourced USCIS figure on USCIS status.
6. **The STEM list as a source** (7.4). Approve saving the DHS list into the F-1 pack.

## 11. What this review cut from the working notes, and why

- **"For a free user it shows no dates at all" on OPT Dates** (screens-2, shot 10). Shots 6 to 9, at the same address, show the date form with saved dates. Shot 10 shows a full Pro panel there; whether it replaces the form or follows it is not visible.
- **Legal points with no Duly source**, kept as open questions only:
  - Form 8843 and FICA, and the 5-year question;
  - state health-insurance mandates;
  - email law for the notification toggle;
  - the FTC placement of referral notices;
  - Connecticut data-access rights;
  - fee-sharing for the attorney consultation;
  - re-entry rules while an OPT application is pending;
  - the evidence to carry in cap-gap.
- **"Can continue working up to 180 days while pending"** (their copy). Duly's pack notes that an automatic extension exists but has not saved the rule that sets its length (stem.pending_card_extended), so this review states no length.
- **The Amazon Freevee point** and other claims about third parties that are not about TrackMyOPT.
- **Guesses at their intent**, such as "reads as a nudge toward paying for premium processing". Only what is on screen is kept.
- **Any Duly claim resting on a feature not built,** unless it is labelled "Decided" or "Prototype" in section 5.

## 12. Housekeeping

The working notes screens-1.md to screens-6.md quote their copy with long dashes and symbols (heart, tick, warning sign). tools/copy_lint/lint.py flags long dashes and those symbols in every text file, so those notes fail the copy check if committed as they are. This file has none.
