# ui-2 brief: Duly as a helpful assistant with memory, not a cautious form

The founder tested the preview on 2026-09-30. This brief is the source for the ui-2 prototype. The
founder's words are quoted where they decide something.

## What Duly is

A safe, private place for a student's whole immigration life, with a memory:

- documents are uploaded once and kept;
- the student sees where they stand at a glance;
- they know when to start preparing for the next step and what it needs;
- they can track their applications;
- they stay up to date on news for their status.

It should be an accelerant, not an extra step. "log on, and not have to worry about entering all
the dates manually, and see, okay, when do i have to start preparing to apply for my next step."

## The line between safe and useful

"theres a difference between duly being useful and actually helpful from duly being too careful
and afraid to answer anything." Accuracy lives in the engine. The screen is calm and plain:

- **Plain words, no disclosures in the way.** Say what the date is, what to do, and when. Never
  "Can't tell yet" as a headline.
- **The law is one tap away.** A small source mark on an item opens the rule, its quote and how
  it was counted. Citations, rule ids, "inputs used" and "Duly's reading" never show at first
  glance.
- **Unknowns are specific and actionable.** "Add your EAD card to see this date", with the one
  place to add it. Never "not computed", never "Asked because of: missing a1.dso_on".
- **Internal ids never appear on screen:** p1, a1, t1, field names, receipt-number checklists.
- **One quiet footer line on screens that give dates:** "Records and dates from your documents,
  not legal advice."
- **Hard limits stay:** no personal legal conclusion on a disputed point (that goes to the DSO,
  in the student's words), no filing on their behalf, no dashes, no emoji.

## Onboarding: get in fast

Onboarding asks only this skeleton, then lets the student in:

1. status;
2. school;
3. level and major, with STEM detected from the major ("This looks like a STEM degree" with
   Confirm or Change);
4. program dates;
5. where they are now (studying, CPT, OPT, STEM OPT, other);
6. the EAD card, uploaded or typed, when they are on OPT.

Every question also offers "I'm not sure". The step list is visible and any answered step can be
opened directly, never ten presses of Back. The final screen is short and warm and opens Home.

Everything else is asked later, inside the section it affects, as a short checklist shown as
"waiting for you". Asking follows these rules:

- **Infer when the answer is in front of you.** No "are you still in school" after an end date.
  No "when did you finish all your courses". Ask about conferral once. A conferred degree means
  the requirements were met.
- **Ask about a degree from outside the US only when it changes something** (the STEM basis), in
  normal words.
- **Choices, not interrogations.** Offer choices with nuance instead of a bare yes or no.
- **Several documents of one kind are normal.** For example, two or three CPT I-20s for two
  internships: add another.
- **Documents fill fields.** Upload the I-20s and the EAD, and Duly reads them on this device
  (D55). The student confirms what was found in one tap per document. There is no
  "check against document" chore and no list of twenty checkboxes.

## Screens

- **Home:** as the canvas (Main.png). The shape is:
  1. where you stand in one sentence;
  2. three numbers (days of OPT used or unemployment days, EAD valid until, the next date);
  3. your next move, with its date;
  4. what's new for your status.

  The student feels in good hands, and alerted only when it matters.
- **What's next:** ask intent first ("Planning to apply for STEM OPT?"). Then show:
  1. when the window opens, from the EAD end date;
  2. when to start preparing;
  3. what they will need, in plain tasks ("Get your I-983 signed by your manager");
  4. their school's own form step;
  5. a draft email to the DSO.
- **The DSO email** is in the student's voice, normal words, never a CFR cite, in a full-width
  readable panel with Copy.
- **Applications:** add the receipt number and track the status. Manual status now, USCIS case
  status later if approved access allows.
- **Timeline:** phases in plain words. Past phases summarize what was done ("CPT: two internships,
  done"). The current phase shows what matters now, and a missing fact is a clear
  "Add ... to see this".
- **Checklists:** plain tasks. Done phases show a short "You did this" summary, and the
  confirmations the student already lived through are not asked again.
- **Updates:** "For your status" (rule changes with their source) plus "In the news" (general
  news for the status, labelled as news, with source and date).
- **Documents:** everything in one place, sorted by kind and phase, with versions kept. Add any
  document from anywhere.
- **Your case:** readable cards (a job has its title and employer). Each answer sits beside its
  question. Edit in place.
- **Settings and Feedback:** follow the same clean system as the rest.

## Design laws

- **Spacing:** only the scale 4, 8, 12, 16, 24, 32, 48, 64.
- **One content column,** 720px, with a clear type scale: page title, section, row title, body,
  meta.
- **Hairlines and whitespace, not boxes.** No text walls. Nothing scrolls sideways.
- **One hero per screen,** and one primary action per screen.
- The canvas tokens and laws apply (design/canvas/DESIGN-SPEC.md).

## The bar for Documents (founder, 2026-09-30)

What students do today: send their I-20s and EAD to their own WhatsApp chat so the files are on
their phone, and redownload the I-20 from the school's approval email every time someone asks for
it. Duly's Documents must beat that for speed:

- the right document is found in one search or one tap;
- it can be opened, shared or sent from the phone in one tap;
- it is never dug out of an inbox again.

## Round 2: the founder's notes on the prototype (2026-09-30)

"feels much better, but..." Each note and what it means:

1. **Moving between pages is smooth and does not break the flow** ("the pages jump between each
   other awkwardly, and the workflow is disruptive"). The cause is in app.js render(): every click
   rebuilds the whole app, sidebar included, and replays the slide-in on every page. The fix:
   - the shell and sidebar are drawn once; only the content column changes, and the current nav
     item moves instantly;
   - a page change is a quiet crossfade of about 120ms with no slide; the rise stagger plays only
     on first launch;
   - a change inside a page (a checkbox, an answer, a disclosure) updates that part in place,
     never redrawing the page or moving the scroll;
   - Back and Forward bring back the scroll position; a new page starts at the top;
   - where an answer can be given in place, it is (for example, the STEM OPT choice answered on
     Home), instead of sending the student to another page;
   - a drilled-in page (an update, an application, a document) has a back link to where the
     student came from.
2. **Titles mean something.** Each page has its title and one line saying what it does for the
   student. The value is stronger on Welcome and Home: why Duly, in one breath.
3. **Updates can be read.** Each update and news item opens to its own page, in plain words:
   - what is happening;
   - does this affect you, for this student ("Not yet: your next Form I-765 is for STEM OPT, filed
     after Nov 15");
   - anything to do ("Nothing now");
   - the source, tucked away.
   Home and Updates rows show the "affects you?" answer inline.
4. **The DSO email is dynamic.** It opens only when asked. Copy or Open in Mail closes it, and the
   step shows "Email sent? Mark done" or "Reopen the draft". It is never a panel stuck open.
5. **Three text sizes: big, small, and medium only when needed.** No fourth or fifth size, no odd
   weights. Spacing only from the scale.
6. **Confetti is slower and nicer** (about 1.2 to 1.6 seconds, soft arcs, the canvas colours). It
   fires only the first time something is completed, never on reopening a finished checklist.
7. **Documents are sorted at a high level,** by what the student looks for: Status and permits
   (I-20s, EAD, approval notices), Work, School, Identity. The most important come first. Any file
   is two clicks away, one to the group and one to the file, or one search.
8. **Your case and Settings are reworked** on the same system: fewer, clearer groups.
9. **Applications is its own page in the sidebar.** Each application shows its receipt number,
   status as of a date, the key dates and the next step. It is updated manually for now; USCIS case
   status is parked (BACKLOG B8).
10. **Your school's steps, generic, not per-school integration (v1).** The federal checklist
    stays standard. Any checklist has "Add your school's step":
    - a title, an optional link and an optional document, with quick-add kinds (request form in
      the school portal, upload the I-983 to the school, OPT or STEM workshop, school fee, DSO
      meeting) or free text;
    - placed against a federal step as **Before** (a prerequisite), **Alongside**, or **After**;
    - a Before step blocks its federal step, which shows "Waiting on: <school step>" while its
      dates keep counting;
    - an After step appears once the federal step is done;
    - every school step carries a quiet "Your school" mark and appears in the checklist, the
      Timeline and Applications, and is kept for reuse.
    State University's STEM OPT request shows as the worked example, added by the student.
    School profiles and school partnerships are later (BACKLOG).
11. **The federal steps are live, not a saved draft.** They come from the sourced rule pack, and
    every student's dates and checklists are recomputed from it. The prototype must show this:
    - a quiet "Rules checked Sep 30" on checklists;
    - on an update's page, "What changed in your checklist" when a rule change touched a step, with
      the step marked "Updated Sep 30" in the checklist.
    The pipeline behind it is updates-1: watch the primary sources and the news, draft the change
    from the source with its quote, run the checks, get human approval in Ops (D22), then bump the
    pack and recompute every case. Each affected student gets a personal update, with no need to
    ask.
12. **The product name is used sparingly.** "Duly" appears at most twice on a page, usually once,
    and never as a character talking to the student. Write "Counted from your EAD card", not "Duly
    counted"; "You'll get a reminder", not "Duly will remind you". Onboarding especially.

## Round 3: the founder's notes (2026-09-30)

The theme: less explaining, more intent. "why are you explaining everything explicitly, one it
should always be self explanatory and easy to walk through and intentional to a human." Any
explanation goes behind an ⓘ, only when it is needed, and is minimal. The rest is cut.

1. **Home.** The explanatory line under the hero goes behind an ⓘ. The three numbers stay. "Your
   next move" is one line with a date and one action; no four or five lines. "What's new" becomes
   big, skimmable headlines, each with its date and at most one short line. "Updated for you when a
   rule changes" moves behind an ⓘ; "Rules checked Sep 30" stays as a small line.
2. **What's next and Checklists are one page, rebuilt from scratch.** The old two pages repeated
   each other and were "trashy". The new page, "Next steps", shows the path the student is on, its
   key dates, and short tasks. It has no subtext except behind an ⓘ.
3. **Applications is renamed** to something human and distinct from the other labels, for example
   "USCIS status". It says what it does: live tracking once connected (BACKLOG B8), and "Recheck by
   logging in to USCIS" until then. It is removed from Checklists entirely.
4. **School steps are never typed in by hand.** The student pastes their school's OPT or STEM OPT
   page link, or drops the school's instructions PDF. The steps appear, marked "Your school" and
   placed in the checklist, and the student confirms them once. This is public school information,
   not the student's documents.
5. **Documents** gets label chips that filter in one click, plus "All documents", which opens every
   document in one place, ready to open.
6. **Updates are articles**, like a good news app: headline, date, source, and several short
   paragraphs (what happened, the background, what comes next). Then one short "For you" box
   combining whether it affects the student and what to do. Remove the buttons that jump to other
   parts of the app. Write articles only from sources saved in rulepacks/f1-us/v2026.09/sources and
   from the legal notes on the 2026 regime. An item with no saved source is removed, never
   invented.
7. **Navigation labels** are human, intentional and distinct from each other.

## Round 5: the founder's notes (2026-09-30)

Updates, USCIS status and Documents "look great". To change:

1. **Home's next move is answered in place.** "Decide on STEM OPT" opens on Home with Yes, No and
   Not sure. A yes shows the three key dates in a small strip and an optional "See all steps". It
   never jumps to another page unasked.
2. **USCIS status: track another case.** Add any receipt number with its form type (for example an
   H-1B petition, a green card form or a travel document); it joins the list with its status and
   checked date. Remove anything on the page that does nothing.
3. **Next steps comes alive:**
   - a "today" marker on the date strip shows where the student is between now and the last day;
   - the current step is highlighted, and steps expand in place;
   - the progress fills as steps are ticked, and the next step moves up to current.
   - **The strip is a real timeline** ("the strip can be better"):
     - scaled to time, from today to the last day to file;
     - two shaded spans, "Prepare" (from the start-preparing date) and "Filing window" (opens to
       last day);
     - a Today marker where the student is, with one line such as "46 days until the window
       opens";
     - only the date that matters now is emphasized; the line draws in once and the marker
       settles.
4. **Light motion and haptics for a calm feeling of progress:**
   - a check that draws itself, a soft fill, a gentle settle when a step completes;
   - a light tap through the Vibration API on phones that support it;
   - nothing loud, nothing that blocks;
   - everything off under prefers-reduced-motion, and the screen is complete without motion.
5. **The value proposition is refined after this round** ("is this all it does").

## Round 7: the founder's notes and the design rules they set (2026-10-01)

These are rules for every screen from now on.

1. **One thing lives in one place.** A loop or item appears in full on exactly one page. Other
   pages show only a one-line pointer that opens it there. STEM OPT lives in Plan; Home shows a
   one-line "Next" pointer.
2. **No ⓘ clusters.** An opened item has at most one ⓘ, at its bottom ("How this was counted"),
   which lists all of its sources. Lines never carry their own ⓘ.
3. **Home uses the screen.** It has a fixed format of cards that each deliver something and link to
   their own page, with no narrow centre column:
   - a greeting line with the status and date;
   - three big number cards;
   - the Ask box (Home only, below the numbers, never at the very top);
   - a two-column grid: Next (at most 3, each with a date, then "See plan"), Documents (the three
     most used, one tap each, then "All documents"), USCIS status (each case and its status),
     Updates (the latest one or two headlines).
4. **Ask appears only on Home for now.**
5. **A section that deserves a page gets one.** USCIS status is back in the sidebar.
6. **Settings uses grouped panels:** Reminders, Security, Backup, Appearance, Your data. Each is a
   rounded panel with readable rows, a short description where needed, and no long ruled lines.
7. **Lost a document** opens the saved copy at once, gives the replacement steps for that kind of
   document (I-20 from the DSO; EAD by Form I-765; passport through the consulate; I-94 from the
   CBP site), and marks the old one lost. The word "paper" is gone everywhere.
8. **Record and the journey PDF are removed from v1.** The history stays stored underneath and
   returns later as an export for H-1B and green card forms that ask for status and work history.
