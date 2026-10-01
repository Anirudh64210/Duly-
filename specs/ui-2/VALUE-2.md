# ui-2 round 6: what Duly does, refined

2026-09-30, after "is this all it does". VALUE.md still holds. 31 ideas, three judges, cut hard.
Each feature: engine values and sourced rules only, no document value to any model (D60), no
conclusion on a disputed point, no new top-level place.

## 1. The promise

- **Line:** A private place for your F-1 record, right to the day.
- **Subline:** Every date you owe, counted from your own papers, and what a change would move.
- **"Is this all it does?"** in three sentences a student would repeat:
  1. "It keeps all my papers, reads the dates off them on my phone, and tells me the next thing I
     owe and the exact day, so I stop digging through email and WhatsApp."
  2. "Before I quit a job, take a trip home or start an internship, I try it in Duly and it shows
     which of my dates and counts move, worked out from my own papers and the actual rule."
  3. "It reminds me before every report and expiry, and no AI reads my documents."

## 2. Features to add, ranked

Effort: small (a screen over the engine), medium (one engine helper or record field). Feature 2
builds two shared pieces: a diff of two engine outputs by item id, and a limit-day helper.

**1. File-by date** (small)
- Need: the limit after the DSO's recommendation (30 days for OPT, 60 for STEM) is the one
  students miss; TrackMyOPT leaves it out (W7, W8). Missing it can mean a denied I-765.
- Does: Home's next move reads "File your I-765 by Jan 14"; the ⓘ shows each limit and marks the
  one that sets the day. A receipt number stops the clock. Lives on Home and the Next steps strip.
- Computed: the last day is the earliest of the recommendation limit and the program or card
  limit (opt.file_within_days_of_recommendation, opt.apply_after_days, stem.file_within_*,
  stem.apply_*); the opening day is never a candidate for the last day. The recommendation date
  is read from the new I-20 on the device and used only after one-tap confirmation.
- Never: "still in time". After a limit passes, the date only, and the question goes to the DSO.

**2. Try a change** (medium; builds the shared diff and projection)
- Need: "what happens if I lose my job, take this internship, or my end date moves?" Today
  students ask ChatGPT, which has neither their dates nor the rule.
- Does: one change at a time against the real record, showing only what moves. For example, 41
  days used as of Sep 30 and the job ends Oct 31: "Report the end by Nov 10. With no new job, day
  90 would be Dec 19." On STEM, the new I-983 and final evaluation dates too. Nothing is saved
  until the student taps "This happened".
- Presets, in order of build: my job ends; I change employer or add a job; my hours drop; a
  planned CPT internship ("171 plus 87 is 258 days", day and month readings side by side); my
  school moves my end date; a petition outcome (feature 8).
- Computed: copy the case in memory, add the one record, rerun the engine with the same Clock and
  pack, diff by item id. Pack rules only: unemployment counters, report_*_within_days,
  stem.new_plan_due_days, stem.evaluation_due_days, min_hours_per_week, cpt.full_time_* counters.
- Lives: on the card the change touches, plus one quiet "Try a change" in Your case.
- Never: "safe", "better", two plans ranked, or a hypothetical in the record or reminders. Hours
  that reach 20 only by adding two jobs show as unknown with a DSO question. Day and month CPT
  readings that disagree give no conclusion, only a DSO question. No word on what follows day 90.

**3. Trip check** (medium: passport and visa fields, a contract change that lands first)
- Need: travel is the most asked question, and students carry the I-20 in WhatsApp.
- Does: enter leave and return days. Plain lines: the travel signature covers returns until a
  day; the EAD end against the return day; days away against the five-month line; on OPT or STEM
  with no job recorded, the unemployment days the trip adds. Passport and visa expiry shown
  beside the trip dates, as dates only. A "Carry these" folder of the newest papers opens offline
  and shares in one tap. Lives in Timeline (trips) and Documents (the folder).
- Computed: a hypothetical trip through the trip stage and counters (travel.*, and
  opt.unemployment_abroad, tagged guidance).
- Never: "you can travel". A job to return to, travel while a change of status is pending, a new
  visa stamp and passport validity go to the DSO. Purpose "not sure" makes the count unknown.

**4. Reports you owe** (small for STEM; medium for address and name)
- Need: STEM students miss validations, evaluations, a new I-983 and the 10-day change reports.
- Does: one quiet list in Next steps: what, to whom, by when, "Mark done". Business days shown
  with any federal holiday counted out. The evaluation row opens the stored I-983. Feeds reminders.
- Computed: stem.validation_*, stem.evaluation_*, stem.report_change_within_days,
  opt.report_employer_within_days (guidance tag shown), business days against 5 USC 6103.
- Later: "I moved" and "My name changed" start a 10-day clock only after 8 CFR 214.2(f)(17) is
  added as a rule with its quote. AR-11 stays out until saved.
- Never "late" or "submitted": "You marked this made on Oct 2."

**5. The check-in** (medium)
- Need: the count is only right if the record is current. A missed job end is how students get hurt.
- Does: while a clock runs, one card when a fact goes stale: "Still at Northwind, about 40 hours a
  week?" Yes, same / Hours changed / Job ended / New job. The count updates with its as-of date.
  Quiet weeks stay quiet. Lives on Home and as a local notification on the lock screen.
- Computed: each engine item knows the facts it read and when each was confirmed; staleness comes
  from D66 (30 days for a pending petition) and a product setting for jobs. Answers write records.
- Never: streaks, "you missed a week", a count carried past its last confirmed day. Every answer
  can be undone.

**6. Document watch** (small, after the passport and visa fields of feature 3)
- Need: passport, visa stamp, EAD, program end and travel signature run out on different clocks.
- Does: one line per document ("Travel signature covers returns until Mar 3, 2027") and one top
  line, "Next to run out: Passport, Mar 3, 2027". Each date feeds the one morning reminder and
  the calendar file. Lives in Documents.
- Computed: confirmed fields, plus the signature and grace dates from their rules.
- Never: the visa-versus-status ⓘ until a primary source is saved. No red unless a date is close.

**7. Share, with a one-page summary** (medium)
- Need: students re-explain their history to ChatGPT, a DSO, HR or a lawyer, and resend loose files.
- Does: pick who it is for (DSO, employer, new school, attorney, trip). The newest papers are
  preselected; an optional one-page summary lists programs, cards, jobs, trips, petitions and
  counts with as-of dates. Names and numbers hidden by default, preview before sharing, sent
  through the phone's share sheet or saved as PDF. One Share action in Documents and Your case.
- Computed: a fixed template over the confirmed record and engine items. No model writes it.
- Never: a conclusion; judgement items appear as open questions. The HR list makes no I-9 claim
  until M-274 is saved. The copy step says what is in the text.

**8. Cap-gap dates for a petition** (small)
- Need: lottery season, and the most-read sources still say October 1 (W6).
- Does: adding a petition shows the cap-gap span and its end ("to Apr 1, 2027, or the H-1B start
  if earlier"), the unemployment count continuing through it, and each outcome as a tap through
  feature 2. Lives in USCIS status and Timeline.
- Computed: the cap_gap stage, capgap.end_month_day by filing day, capgap.ends_on_outcome. Never a
  grace date after a denial (the engine computes none), or cap-gap as a promise of work.

Already promised in VALUE.md: the calendar file keeps a stable id per item, so an update replaces
events; News "For you" is a rerun on the device, so the server never learns whose dates moved.

## 3. What Duly says no to, and why

- **Ask your record (a search box).** It looks like a chat, a wrong match shows a right number
  for the wrong question, and the ⓘ on each item already answers in place.
- **Tax counts.** No IRS source is saved; residency and FICA are conclusions about the person.
- **Public calculators.** Partial answers from partial facts, and the engine does not run in the
  browser yet. A growth play for after the app is whole.
- **The school kit.** Outreach and upkeep, not a feature; pasted school pages already cover it.
- **Transfer or a new degree** as its own feature. Rare, close to "can I get new OPT"; a later
  preset in feature 2, both readings shown.
- **A privacy ledger and corrections log, for now.** Both need the network module and the
  corrections pipeline first, or they are not exactly true.
- **Still no:** verdicts, "safe" or "better", ranked plans, countdowns, red alarms, streaks, job
  board, resume tools, ads, deals, referrals, an outside AI reading papers, and any date from a
  rule not saved with its quote (AR-11, passport validity, visa revalidation).

## 4. Free and paid

- **Free, always:** all eight features, every date and count, reminders on every channel, the
  calendar file, documents, sharing, export, backup and delete, News with "For you".
- **Paid extras, priced below TrackMyOPT Pro (D8 parks the price):** more backup space; the
  formatted attorney or new-school packet with full history and document index; a second profile
  for an F-2 spouse or child.
- **The test, as a build gate:** if a student without it could miss a date, lose a paper or act on
  a wrong number, it is free. A test fails if any engine item, reminder or document needs the plan.

## 5. Open decisions for the founder

1. Approve the eight and the build order: 1, 2 (job ends first), 4, 5, 3, 6, 7, 8.
2. "Try a change" on each card plus one entry in Your case (recommended), or also on Home.
3. Check-in delivery: computed on the device (recommended), or dates on Duly's server (10.4).
4. Contract and pack work to approve: passport and visa document kinds; an address record kind;
   rows for 8 CFR 214.2(f)(17) and (f)(12)(ii)(A) with quotes.
5. Where the free one-page summary ends and the paid attorney packet begins; and whether
   reminders for an F-2 family member's papers are free though the profile is paid.
6. News "For you" under an enjoined rule: the date in force only (recommended), or both, tagged.
7. "From your paper" in the source sheet (the I-20 field beside the date it fed): small, add now.
