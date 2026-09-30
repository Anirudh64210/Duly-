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
