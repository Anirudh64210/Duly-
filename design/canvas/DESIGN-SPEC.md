# Duly design spec: the nine approved screens

This is the written record of the approved canvas, so Phase 4 ("founder walkthrough matches approved canvas behavior") has something to check against. The canonical artifacts are the files in `screens/`; this document describes them.

## The nine

| # | File | Canvas title | Size | Interactive |
|---|---|---|---|---|
| 1 | Main.dc.html | Home | 1280x832 | yes |
| 2 | Timeline.dc.html | Timeline | 1280x832 | yes |
| 3 | Documents.dc.html | Documents | 1280x832 | yes |
| 4 | Checklist.dc.html | Checklist | 1280x832 | yes |
| 5 | Updates.dc.html | Updates | 1280x832 | yes |
| 6 | WorkBook.dc.html | WorkBook | 1280x832 | yes |
| 7 | Phone.dc.html | Mobile home | 390x844 | yes |
| 8 | Simulator.dc.html | Scenarios | 1280x832 | yes |
| 9 | Onboarding.dc.html | Onboarding | 1280x832 | yes |

Case, Settings, Feedback and Billing are additions the plan names for the app but which were never drawn on the canvas. They are nav destinations only; design them from these nine.

## Tokens

Colors
- Ground `#F8F7F4`, surface white `#FFFFFF`
- Ink `#1A1917`, secondary `#6B6862`, tertiary `#8A8780`, faint `#B0ACA3`
- Hairlines `#ECEAE4` (structural), `#F0EEE8` (inside lists)
- Visa blue `#2B4EA2`, hover `#22417F`, tint `#E9EEF9`, muted mark `#8FA6D9`, confetti secondary `#6B8AD4`
- Amber `#B45309` is reserved for the AI-drafted star, nothing else
- Caution text `#8A6A2A` for the honest-caveat and varies-by-university lines
- Bar track `#E8E6E0`, row hover `#F0EEE8`

Type: Instrument Sans only, weights 400, 500, 600, 700. Headings 600 at `-0.02em`. Page title 30 to 34px. Hero verdict 40 to 42px on desktop, 29px on mobile. Body 14 to 15px. Row titles 14.5px at 500. Meta 12.5 to 13px. Eyebrow labels 11 to 11.5px at 600 with `0.10` to `0.14em` tracking, uppercase.

Metrics: sidebar 208px wide, content column 720px centered, top padding 50 to 54px, rows 13 to 17px vertical padding with negative 12px side margins so hover extends past the text, radii 7px (nav), 10px (rows), 12 to 14px (cards), pills 99px. Touch targets 44px minimum.

Motion: entrance `rise` 0.55s `cubic-bezier(.2,.7,.2,1)` staggered 60 to 90ms down the page, transform only so nothing depends on animation to be visible. Row hover background 0.16s. Button press `scale(.97)`. Chevrons rotate 90 degrees over 0.22s. Progress bars fill once from 0 over 1.1s with 0.4 to 0.5s delay. Disclosure content drops in over 0.28s. ALL CLEAR shield carries a blurred blue halo breathing on a 4.8s ease-in-out cycle at low amplitude. Confetti is eight 6px squares on 0.65 to 0.7s ease-out arcs, fired only on completed journey phases and finished checklists.

## Laws every screen obeys
One hero per screen. Verdict before data, data before detail. No card grids: hairlines and whitespace instead. No eyebrow captions or grey filler under rows. No badges, counters, urgency, or red. Two choices, not three. Every AI surface shows its sources, rule pack version, and the disclaimer footer. No em dashes, no en dashes, no emoji. Nothing says sealed, cryptographic, or AI-generated. Motion is additive: with animations off the design is complete.

## Screen by screen

### 1 Home
Date line, then the hero: blue shield with breathing halo, `ALL CLEAR`, "Everything is in order." and one line naming the next thing. Then three metrics divided by vertical hairlines: `90-DAY UNEMPLOYMENT CLOCK` (12 used, 78 left, 13 percent bar), `THIS WEEK` (14.2 of 20 hours, 71 percent), `EAD VALID UNTIL` (Feb 9 2027, 134 days left). Then `YOUR NEXT MOVE`: three hairline rows with chevrons.
Behavior: the three rows are an accordion, one open at a time, chevron rotates, content drops in. Row 1 STEM prep reveals "2 of 6 steps done" and a checklist link. Row 2 the affecting update reveals its meaning and a link to Updates. Row 3 "Tell Duly what you want to do next" reveals three chips routing to Scenarios and Checklists. Footer: "Checked today, 6:00 AM".
Rule: every date and number shown here comes from the engine, never the client and never the model.

### 2 Timeline
Title plus "6 phases, 24 requirements tracked, nothing missed". Six rows: Visa and entry, M.Eng Computer Science, CPT two authorizations, Post-completion OPT, STEM OPT extension, Beyond. Completed phases carry a filled blue check, the current phase carries a small blue `NOW` tag in the left gutter, future phases carry a hollow ring. Every title is full-strength ink: no greying of history, because an old document matters as much as a new one.
Behavior: accordion, `NOW` open by default. Completed phases fire confetti on open and list their met requirements with checks. The OPT phase shows the USCIS application tracker inline (Filed Nov 2, Approved Jan 21, EAD delivered Feb 2, "via USCIS case status") and the coverage grid `COVERED 7 OF 8`: EAD card, SSN, fresh I-94, employer in SEVP, travel signature, US address, WorkBook recording, and the one open item, the SEVP six-month check-in due Oct 7. STEM and Beyond reveal what they need and link onward.

### 3 Documents
Consistency banner: blue check, `CONSISTENT`, "15 documents, one story." and "Names, dates and SEVIS ID match everywhere. Checked today." Lock state sits top right: "Unlocked, locks in 4:32". Then a category tab row with `I-20 history 6` selected.
Behavior: three collapsible groups, OPT open by default, each showing its version count. OPT holds three versions: v6 marked `CURRENT` (travel signature added, valid for re-entry until Feb 14 2027), v5 (corrected end date, superseded, kept for the record), v4 (original, the copy filed with the I-765). CPT holds v3 and v2, Initial attendance holds v1. Every row full-strength with an Open action. Footer states the principle: every version kept, old I-20s prove the chain, encrypted on this device.

### 4 Checklists
A path chip row: CPT (done), OPT (done), STEM OPT, H-1B. The chips switch the entire view.
STEM OPT view: eyebrow `YOUR NEXT FILING, WINDOW OPENS DEC 12`, title, a progress bar with "2 of 6 done, you confirm each step", then six steps. Two are complete and struck through with their citations. Four have live circular checkboxes that toggle, recomputing the count and bar. Completing all six fires confetti and shows "Every step done. You're ready to file on December 12." The DSO step carries the amber varies-by-university line and a "Draft the question for your DSO" button. The evidence-pack step links into WorkBook.
H-1B view: `LATER, NOT YOUR MOVE YET` and "H-1B. You've got time." with the honest ordering and a promise to surface it in February.
OPT and CPT views: completion celebrations with confetti listing what was done right.
Footer: "Every step cites its source. Nothing files itself. Records, not legal advice."

### 5 Updates
Title "One thing worth knowing." with "Checked today, 6:00 AM" opposite. The one affecting item is the hero: `AFFECTS YOUR CASE`, source and date, a 23px headline, then the impact block: two of three dots filled in amber, `MODERATE IMPACT`, and "Worry? No. Prepare? Yes." Then what it means for this case, then links to the checklist plus four sources including community discussion.
Then `EVERYTHING ELSE` with two rows, full-strength ink, each showing a verdict ("Nothing to do", "Context") and expanding to an explanation and its own source links.
Rule: impact scores are computed deterministically from case attributes, never generated in the send path.

### 6 WorkBook
A three-stage flow inside the Duly shell, and always optional.
Intro: `WORKBOOK, OPTIONAL, YOURS`, "Working a job, a contract, or your own thing?", the value line, three checked promises (builds itself from your tools with no screenshots, metadata only and encrypted, you confirm every day), then "Set up WorkBook" and "Not now".
Setup: "Where does your work already live?" with a six-tile connector grid that toggles (GitHub and Calendar preselected), the read-only metadata-only line, and a Start button that counts the selected sources.
Today: tab row, date heading, hours so far, week progress, four blocks with times, amber stars on AI-drafted lines, an "edited by you" mark, GitHub provenance under one block, Add entry and Mark day complete. Footer explains the amber star survives into exports.
This artboard is Duly-styled. The WorkBook module's own visual system, IBM Plex and green, is defined in the separate WorkBook handoff and applies inside the module once built.

### 7 Mobile home
The countdown surface at 390x844. Wordmark and date, the same shield hero at 29px, two metrics (90-day clock, EAD valid until), two expandable next-move rows, "Checked today, 6:00 AM", and a four-item tab bar: Home, Timeline, Scenarios, Docs.

### 8 Scenarios
Its own panel, not a tab of Home. Title, then "Ask anything. Duly answers from your case and the rules, cites them, and says when it isn't sure." An ask field with an Ask button. Then three switchable scenario tabs: I lose my job, I travel abroad, My filing gets an RFE.
Each scenario renders: a plain-language answer headline, the specifics computed from the case, numbered practical steps, an amber `Honest caveats` paragraph, and a `RULES PULLED` chip row citing the actual authorities.
The job-loss scenario is ordered as real advice: land the next role first because any qualifying work stops the clock, report within 10 days, and only then unpaid work in field as the honest bridge, "real work, logged in WorkBook, not a paper shield."
Footer: "Every answer cites its rules. Where the rules are unclear, Duly says so. Not legal advice."

### 9 Onboarding
Centered 560px column, wordmark, five progress pips, step label.
Step 2 asks the work type with four selectable cards. Step 3 asks the field with a six-tile grid. Both remember the selection, both have working Back and Continue. The final screen fires confetti and summarizes the actual choices, watched items included, with "Open Duly".
Every step carries its why-we-ask line, for example "Your work type decides which rules apply to you. It stays on this device."

## Using these files
`screens/index.html` is a gallery: open it and every screen is previewed and clickable. Each `.dc.html` opens directly too. `support.js` is a viewer runtime written for this handoff, not product code: the app rebuilds these screens in React against real endpoints. `png/` holds a render of each screen plus its expanded state, produced in a container without the webfont, so treat the PNGs as layout reference and the HTML as the typography reference.
