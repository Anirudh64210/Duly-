# TrackMyOPT walkthrough, screenshots 28 to 36 of 54

Source: /Users/ani/Desktop/Duly/trackmyOPT/, taken 2026-09-30 between 4:27:04 PM and 4:27:47 PM. The small floating thumbnail in the bottom-right corner of every shot is the macOS screenshot preview, not part of the product.

## Chrome shared by every in-app screen (28 to 33, 35, 36)

These elements appear on every dashboard page, so they are described once here.

- **Promo bar (top, purple gradient, full width):** "Paste a job description. Get an ATS-ready resume in minutes: built for F-1 & OPT job search." It has a black "Build resume >" button and an X to close it. It was still showing on every page in this set, so either it comes back after being closed or the founder never closed it.
- **App header (dark navy):** the TrackMyOPT logo, a purple "Get Pro" (crown) button, a "Deals / $8,136 free for you" pill with a red "HOT" badge, and a light/dark theme toggle.
- **Left sidebar, in order:** Home, OPT Dates, OPT Tools (collapsible), Case Status, Documents, H-1B Sponsors, Verified Jobs, Job Tracker, Career Tools (collapsible; when expanded it shows Resume Generator, Saved Resumes, ATS Scanner, Networking), Tax Filing, Health Insurance, a divider, then Install Extension, Settings, Help and Chrome Job Prefill. That is about 19 rows with Career Tools open.
- **Sidebar footer:** avatar "SS", the truncated name "saianir...", a second "Get Pro" link, and a collapse icon.
- **Upsells:** every page carries three to four upsell spots at once: the promo bar, Get Pro, Deals HOT and the footer Get Pro. None of them are about immigration.
- **Sidebar overflow:** at this laptop resolution the sidebar has to scroll. In screens 31 to 33, Home, OPT Dates and OPT Tools have scrolled off the top, so the student's core immigration items are hidden while they are in the tax or insurance pages.
- **Nav order:** immigration items (OPT Dates, Case Status, Documents) sit alongside job search, resume, networking, tax, insurance and two browser-extension entries. "Install Extension" and "Chrome Job Prefill" look like two entries for the same kind of thing.

---

## 28. Resume History (Saved Resumes), empty state
URL: `trackmyopt.com/dashboard/career/saved-resumes`

- **Screen and state:** a new account with no saved resumes. The sidebar shows Career Tools expanded and "Saved Resumes" highlighted.
- **Layout:** a "Back" arrow at top-left, the centered heading "Resume History", and a blue "+ New Resume" button at top-right. Below them sit a search field ("Search resumes by name...") and an empty-state card.
- **Copy:**
  - "No history yet"
  - "Upload and save your resumes to quickly access them when generating new applications."
  - A blue "+ Create New Resume" button.
- **Data shown:** none. The only input is a search box, and it searches an empty list.
- **Friction:**
  - The nav label says "Saved Resumes" but the page heading says "Resume History", so the same thing has two names.
  - Two buttons do the same thing: "New Resume" and "Create New Resume".
  - The empty-state copy says "Upload", but no upload control is visible, only "Create".
  - Showing a search box on an empty list adds noise.
  - The page has nothing to do with immigration status.
- **What works:** the empty state is clean and has one obvious next step.
- **Accuracy or legal risk:** none visible.

## 29. ATS Scanner, placeholder ("deep beta")
URL: `trackmyopt.com/dashboard/career/ats-scanner`

- **Screen and state:** a feature page that does not work yet. It is shown in the nav as if it were a normal feature.
- **Layout:** a "Back to Career Hub" link, then an orange icon with the heading "ATS Scanner" and the subtitle "Upload resume + job description and get ATS match score and gaps". Below that is a dashed card with three icons (percent, warning, lightbulb).
- **Copy:**
  - "We're perfecting our algorithm"
  - "The ATS Scanner is currently in deep beta. Soon, you'll be able to get exact compatibility scores and identify missing keywords before hitting submit."
- **Data asked or shown:** none. There is no upload control.
- **Friction:**
  - A nav item leads to a dead end.
  - The subtitle promises an upload that the page does not offer.
  - "Back to Career Hub" points to a "Career Hub" that is not in the sidebar, so the student cannot tell where that link goes.
  - The feature list looks padded.
- **What works:** it is honest that the feature is not ready.
- **Accuracy or legal risk:** "exact compatibility scores" is an overclaim for ATS matching, because no single ATS standard exists. This is a trust issue, not a legal one.

## 30. Networking (LinkedIn outreach drafts)
URL: `trackmyopt.com/dashboard/career/networking`

- **Screen and state:** a blank form. The "DAILY USAGE" box at top-right is stuck on "Loading usage...", and the "Create draft" button looks disabled.
- **Layout:** a "Career Hub" back link, the heading "Networking" with the subtitle "Find a contact. Start a conversation.", and two tabs: "LinkedIn profile" (active) and "Find contacts", which carries a "Pilot" tag. Below that are two columns.
  - **Left column, "Your message goal":**
    - Three chips: "Ask about a role", "Request a referral", "Coffee chat".
    - A free-text box: "Choose a goal above or write your own..."
    - Two collapsible sections: "Company & role (optional)" and "How your data is used".
  - **Right column, "Your contacts" (1 / 3 contacts):**
    - A LinkedIn profile field ("linkedin.com/in/username") with a "Find email" button.
    - Helper text: "Profile URL sent to our email lookup provider. May take up to a minute."
    - A collapsible "Contact details (optional)" section.
    - The "Create draft" button, with the note "Choose a message goal to create your draft."
    - An "+ Add another contact" button.
    - The footer line "Review and send yourself. Nothing is sent automatically."
- **Data asked:** another person's LinkedIn URL, the student's message goal, and optionally company, role and contact details.
- **Friction:**
  - Crowded: two tabs, three chips, a text box, three collapsibles, a usage meter and a contact limit (1/3) all on one screen.
  - The meter that never finishes loading makes the page feel unreliable.
  - "Pilot" is another half-finished feature.
  - The "3 contacts" cap hints at a paywall.
  - Like screens 28 and 29, this has nothing to do with immigration.
- **What works:**
  - Goal chips make it quick to start.
  - "Nothing is sent automatically" and "How your data is used" are good trust copy that says plainly what the tool will not do.
- **Accuracy or legal risk:**
  - The page sends a third party's LinkedIn URL to an outside email-lookup provider to find that person's email.
  - That third party is not a user and never agreed to it. This raises privacy questions (state privacy laws, and LinkedIn's terms on scraping).
  - The disclosure only speaks to the student, not to the person being looked up.

## 31. Tax Filing for OPT and STEM OPT
URL: `trackmyopt.com/dashboard/tax-filing`

- **Screen and state:** the top of the tax landing page, with the filing questionnaire unanswered and "Show Results" greyed out. The sidebar has scrolled, so Home, OPT Dates and OPT Tools are hidden and Settings, Help and Chrome Job Prefill are now visible.
- **Layout:**
  - A pill reading "Tax Season 2024-2025".
  - The hero heading "Tax Filing for / OPT & STEM-OPT", with the second line in green.
  - The subtitle: "Navigate U.S. tax requirements with confidence. Learn what forms you need, important deadlines, and file with our trusted partners."
  - Three trust badges: "Non-Resident Specialists", "IRS Compliant", "File in Minutes".
  - A yellow callout, then the questionnaire card.
- **Callout copy:** "Important for F-1 & J-1 Students. Even if you had **no U.S. income**, you must file **Form 8843** to document your presence. This is required by the IRS and helps maintain your legal status."
- **Questionnaire:** "Determine Your Filing Requirements. Answer these quick questions to find out what forms you need to file."
  - "Years in the U.S. on F-1/J-1?" with the options "Less than 5 years" and "5 or more years".
  - "Did you have U.S. income this year?" with the options "Yes (wages, scholarship, stipend)" and "No U.S. income".
  - The "Show Results" button has an external-link icon, which suggests the results hand the student off to a partner site.
- **Friction:**
  - The page opens with a marketing hero and badges before any help.
  - "File with our trusted partners" reads as affiliate referral rather than guidance.
  - The external-link icon means the student leaves the app to get an answer.
- **What works:**
  - It raises Form 8843, which many students do not know about.
  - Two simple questions make a low-effort entry point.
  - The student-facing framing ("even if no income") is valuable.
- **Accuracy or legal risk:**
  - **The season label is out of date.** It says "Tax Season 2024-2025", but the screenshot was taken on 2026-09-30. The page is either stale or mislabeled. A wrong year on a tax page erodes trust in every date the app shows.
  - **The 5-year question is too coarse.** The F-1/J-1 student exemption from the substantial presence test counts calendar years in which the person was present for any part of the year, not elapsed years. "Years in the U.S." can put a student in the wrong bucket, for example someone who arrived in August of year one. The page also does not say what "this year" means.
  - **"Helps maintain your legal status" overstates Form 8843.** Form 8843 is an IRS statement used to exclude days of presence. It is not an immigration-status filing. Tying it to "legal status" mixes up tax compliance and immigration status and could alarm students.
  - **"IRS Compliant" is unsupported.** The claim is vague and not tied to any authority on the page.
  - **No sources are given.** No IRS publication or form link is visible, and no effective date.

## 32. Health Insurance finder, top of form
URL: `trackmyopt.com/dashboard/opt-health-insurance-finder`

- **Screen and state:** a blank eligibility form. The sidebar has "Health Insurance" highlighted.
- **Layout:**
  - A pill reading "Free plans available in select states".
  - The hero heading "Get Health Insurance / Starting from $0/month", with the second line in blue.
  - The subtitle: "Find affordable coverage based on your state and eligibility. No SSN required."
  - Three badges: "No SSN Required", "Instant Digital Card", "Coverage in 24hrs".
  - A "Check Your Eligibility" card.
- **Fields visible:**
  - "Where do you live?" (Select your state)
  - "Monthly income (USD)" (defaults to 0), with the helper "If you are doing an internship or voluntary job and not getting paid, enter 0"
  - "Visa type" (Select visa type)
  - "Date of birth" (mm/dd/yyyy)
- **Friction:**
  - A lead-generation hero leads straight into a personal-data form.
  - The page shows no plan names, carriers or prices before asking for data.
- **What works:**
  - Health insurance is a real OPT pain point, especially in the unemployment and job-change gaps.
  - "No SSN required" answers a common blocker.
- **Accuracy or legal risk:**
  - **"Starting from $0/month" and "Free plans available in select states" are unqualified.** The page never says which programs these are. Whether an F-1 or OPT student qualifies for subsidized or state-run coverage depends on state rules and on tax residency. From this screen the claim cannot be checked, and it could lead a student to apply for something they are not eligible for.
  - **The income hint steers answers.** "Enter 0" for unpaid internships nudges the student toward a zero-income answer that drives eligibility.
  - **"Coverage in 24hrs" and "Instant Digital Card" are marketing claims** with no source.

## 33. Health Insurance finder, scrolled to the bottom of the form

- **Screen and state:** the same page as screen 32, scrolled down. The form is still blank and "Show Results >" is still disabled.
- **Additional fields:** "Gender" (Male / Female / Other / Prefer not to say) and the "Show Results" button. The fields from screen 32 (state, monthly income, visa type, date of birth) are repeated here.
- **Data asked in total:** state, monthly income, visa type, date of birth and gender. All of it is required before any result appears.
- **Friction:**
  - Five fields of sensitive data come before any value is shown.
  - The disabled "Show Results" button gives no hint about which field is missing.
  - The screen shows no statement of who receives this data (compare the disclosure on the Networking page).
- **What works:**
  - The form is short, with one column and large targets.
  - "Prefer not to say" is included as a gender option.
- **Accuracy or legal risk:**
  - Date of birth, gender, income and visa type are collected with no visible notice of who gets them. If the data goes to an insurance broker or partner, that is a disclosure and consent gap.
  - The insurance-eligibility claims from screen 32 carry over.

## 34. Chrome Web Store listing for the TrackMyOPT extension
URL: `chromewebstore.google.com/detail/trackmyopt/hfljbefkccdmlnhclfojlafipjnjbajm` (opened in a new tab, probably from "Install Extension")

- **Screen and state:** the public store page, before install.
- **Content:**
  - The title "TrackMyOPT", with the verified site "trackmyopt.com".
  - The rating "5.0  (3 ratings)", the tags "Extension" and "Tools", and the count "17 users".
  - An "Add to Chrome" button.
  - A video tile: "Your OPT tools. Your job tools. Right where you work. TrackMyOPT for Chrome." The mock popup shows a "Case Status" card and an "OPT Tools" grid (OPT Apply Dates, OPT Clock, STEM Apply Dates, STEM Clock), plus a "Job Application" section.
  - Five more carousel slides. Their small headlines are only partly readable ("Your F-1 journey. One connected workspace.", "Your dates. Your next step.", "Less repetition. More control.", "Keep the details...").
  - The Overview line is cut off at the bottom: "Manage OPT and job applications with review-first prefill and job tracking. Never auto-submits..."
  - Chrome's "You might also like..." panel suggests Jobright Autofill (4.9), ResumeMate Job Tracker (4.5) and Simplify Copilot.
- **Friction:**
  - Clicking "Install Extension" takes the student out of the app into the store.
  - Chrome's own recommendations put TrackMyOPT next to large job-autofill tools, so its identity looks like a job tool, not an immigration tool.
- **What works:**
  - An OPT clock and OPT dates in a browser popup are a genuinely handy, glanceable surface.
  - "Never auto-submits" and "review-first" are good trust copy.
- **Traction signal:** 17 users and 3 ratings is very low adoption for the extension.
- **Accuracy or legal risk:** none visible beyond the claims in the product itself.

## 35. Settings, Profile tab (scrolled)
URL: `trackmyopt.com/dashboard/settings`

- **Screen and state:** the Profile tab, scrolled down, with the browser zoomed out (magnifier icon in the address bar). Everything is filled in.
- **Fields:**
  - A profile card showing "Sai Anirudh Siddi" and the account email.
  - "Full Name".
  - "Email Address", greyed out, with the note "Email cannot be changed".
  - "Timezone", set to "Eastern Time (ET)".
  - An "Education Profile" section with the note "Please check the **CIP Code** on your Form I-20 to confirm official STEM OPT eligibility with DHS."
  - "Degree Level" (Associate / Bachelor's / Master's [selected] / Doctorate).
  - "Major / Course Name", set to "Computer Science".
  - A green box reading "STEM Extension Eligible", with "Force override:" and a "Disable" button.
  - A "Save Changes" button.
  - An "Appearance" section with a "Dark Mode" toggle ("Currently using light theme").
  - A footer with "TrackMyOPT", "Version 1.0.0", Privacy Policy, Terms of Service and Support.
- **Friction:**
  - A key eligibility judgement (STEM) is buried in Settings next to Dark Mode.
  - "Email cannot be changed" is a lock-in that becomes a problem after graduation, when the school email expires.
- **What works:**
  - A timezone setting is the right idea for deadline math.
  - Pointing students to the CIP code on the I-20 is the correct source to check.
  - A student can override the eligibility result.
- **Accuracy or legal risk:**
  - **STEM eligibility comes from a free-text major name.** "Computer Science" plus Master's produced "STEM Extension Eligible". STEM OPT eligibility actually depends on the CIP code of the degree on the I-20 appearing on the DHS STEM Designated Degree Program List, plus other requirements (an E-Verify employer, a Form I-983 training plan, and so on).
  - **The label reads as a verdict.** "STEM Extension Eligible" is a conclusion about the user drawn from a guessed input, and the caveat sits in small grey text above it.
  - **The override lets the student flip the flag with no source check.** Setting it to "Disable" presumably turns off the STEM-related clocks.

## 36. Settings, Security tab
URL: `trackmyopt.com/dashboard/settings`

- **Screen and state:** the Security tab, at the same zoomed-out level.
- **Layout:**
  - The heading "Settings" with "Manage your account settings and preferences."
  - Tabs: Profile, Security (active), Subscription, Notifications, Privacy, Extension.
  - A "Password & Security" card ("Manage your password and security settings") with three rows:
    - "Password": "Reset your password via email" and a "Reset Password" button.
    - "Sign Out": "Sign out of your account on this device" and a "Sign Out" button.
    - "Delete Account" (red): "Permanently delete your account and all data" and a "Delete" button.
  - The same version footer as screen 35.
- **Friction:** little. Sign-out is only offered for "this device"; there is no session list, 2FA or login history.
- **What works:**
  - Self-serve account deletion ("all data") is clear and easy to find, which is a real trust signal for an app holding immigration records.
  - The tab set is tidy and follows a standard pattern.
- **Accuracy or legal risk:** none visible. On a product that stores I-20, EAD and I-94 records, the lack of any visible two-factor option or data-export control is a gap worth noting.

---

## Cross-screen takeaways for this set (28 to 36)

1. **Most of this stretch is not about immigration.**
   - Resume, ATS, networking, tax, insurance and extension pages make up most of this segment.
   - Two of them are unfinished: ATS Scanner is "deep beta" and Find contacts is "Pilot".
   - The OPT and STEM dates, which are the reason a student signs up, scroll out of the sidebar.
2. **Upsells and affiliate links cover almost every page.**
   - Every page carries the promo bar, Get Pro twice and "Deals $8,136 free for you HOT".
   - Tax and insurance are framed as referral funnels ("trusted partners", "Starting from $0/month").
3. **The trust copy is uneven.**
   - Good lines: "Nothing is sent automatically", "Never auto-submits", "Permanently delete your account and all data".
   - Weak or risky lines: "IRS Compliant", "helps maintain your legal status", "$0/month", "Coverage in 24hrs", "exact compatibility scores".
4. **Dates and eligibility are handled loosely.**
   - The tax season label is two years out of date.
   - The 5-year exemption question uses coarse buckets.
   - STEM eligibility is inferred from a free-text major, shown as a green "Eligible" verdict and easy to override.
   - None of these show a source or an effective date.
5. **Some ideas are worth adapting, not copying.**
   - An account-level timezone for deadlines.
   - Pointing to the I-20 CIP code as the check for STEM.
   - Warning about Form 8843 when a student had no income.
   - A glanceable OPT clock in a browser popup.
   - Clear self-serve account deletion.
   - Plain "we never send or submit for you" statements.
