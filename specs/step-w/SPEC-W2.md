# Step W2: the real product inside the window

Status: draft for the founder, 2026-10-01. Written by the founder lane from DECISIONS.md D59, D75,
D79 to D84, specs/ui-2/BRIEF.md (rounds 1 to 8), the approved prototype in specs/ui-2/prototype,
specs/duly-2/ARCHITECTURE.md and BLUEPRINT.md, specs/documents-1/SPEC.md, and the code on branch
`founder`. Builds on SPEC-W1 (the installed window and the engine over a private socket).
Amended 2026-10-03 for D85, D86, D89 and D97 to D100 (the regroup round) and the audit's findings
on this SPEC; each amended sentence names its decision. The founder lane's calls for the regroup
round add W2-R1, the revision build (point 52a), and contract K7 (point 44a).

## The goal in one breath

The approved prototype becomes the production app in web/: TypeScript strict and React, replacing
the old screens. A student types their own record once, adds their documents, and sees Home, Plan,
Work, Documents, USCIS status, Updates and Settings working on that record. Every date and every
count on screen comes from the real engine through the desktop bridge. The screen never computes a
date. Everything stays on this Mac, encrypted (D84).

## What W2 is not

- Not reading documents on the device. The student types the fields of each document for now; the
  on-device reader of D55 comes with documents-1.
- Not the full documents-1 vault: no Touch ID lock, no recovery kit, no SQLCipher (section 4 says
  what this means; D85 decided it, point 62).
- Not the event log or the Rust core (ARCHITECTURE 18 Phases 2 and 3). The case stays in case.bin
  (ARCHITECTURE 2.5: no interim database), with the app's own state in a sibling encrypted file.
- Not Ask in production. Ask runs through the prototype's local helper, for the sample student
  only (D86, point 63). D80's measures are written down for later.
- Not the feed. Nothing is hosted and nothing needs an account (D98): rules and approved updates
  reach the app in a rebuild, at least every 7 days (point 66).
- Not cap-gap in the first milestone: it has its own designed plan (RUNBOOK: an area that failed
  review twice).

## Decisions this serves

D59 as D97 amends it (one confirmation per document of the fields typed from it; an unconfirmed
field, like any unknown, unanswered question, stale rule or litigated rule, holds only the items
it touches, and nothing that waits is shown as settled). D75 (the Loop is the
single building block; planned is not done; no dead ends). D79 and D80 (Ask: Claude through
Bedrock in production with the privacy measures; locally, a helper for the sample student). D81 to
D84 (Step W, Python engine bundled, Electron, local-only and open source). D53 and D56 (the canvas
and the plain words win), D57 (the DSO email in the student's voice), D72 (Try a change lives on
the card it touches), D73 (reminders computed on the device), D74 (passport, visa and address
records with their sourced rules, a change that lands first). D85 (test builds signed with a
self-made certificate; real documents under the Mac login and the keychain key), D86 (Ask on the
student's own record uses the on-device guides and the DSO draft), D89 (F-1 first; H-1B, O-1 and
EB-1A say their rules are coming and keep their documents), D97 (the founder's 2026-09-30 asks
win over the specs), D98 (nothing to sign up for; no feed hosted yet), D99 (made-up data until
W1's review passes; the founder tests at W2-P6 and W2-P7), D100 (the regroup round's process
rules).

---

## 1. The app in web/

1. **The prototype is the design; web/ is rebuilt from it.** Layout, tokens, words, motion and
   behaviour follow specs/ui-2/prototype (screens/, components/, app/, system.css) and
   BRIEF.md's design laws: spacing only 4, 8, 12, 16, 24, 32, 48, 64; one content column of 720px
   except Home's card grid; three text sizes; hairlines, not boxes; one hero and one primary action
   per screen; one thing lives in one place; at most one ⓘ per opened item, at its bottom; "Duly"
   at most twice a page and never as a speaker; no "I" or "we"; buttons name outcomes; no dashes;
   no emoji. Where the prototype's words cross BOUNDARY.md, the boundary wins (D53).
   - Checked by: copy lint over web/; a design-shot run of every screen (`make design-shots`,
     outside the jail) placed beside screenshots of the prototype at the same size, in light and
     dark, read by the founder lane before any milestone is sent, then by the reviewer.
2. **The old UI is removed.** web/src/app/*, components/CaseForm.tsx, components/Result.tsx,
   App.tsx, styles.css and app.css go. Kept and reused: lib/api-types.ts, the zod engine output
   schema in lib/compute.ts (extended for the new fields), lib/drafts.ts if it still fits D57,
   design/contrast.test.ts. The engine bench (bench.html) stays out of the production build.
   - Checked by: `npm run build -w web` produces only index.html and its assets (and shots.html
     when `DULY_SHOTS` is set); a test lists web/src and fails on any of the removed files.
3. **No new web dependency.** React 19, TanStack Router (hash history), TanStack Query, zod and
   the fonts already in web/package.json cover it. The one exception is the PDF viewer (point 31),
   which asks the founder.
   - Checked by: the diff of web/package.json in each plan is empty except where a plan says so.
4. **Motion as the prototype.** The shell and sidebar are drawn once; a page change is a 120ms
   crossfade, no slide; a change inside a page updates in place without moving the scroll; Back
   restores the scroll; the rise stagger plays only on first launch; a loop that closes draws its
   check, shows its one-line receipt, holds 1.6 seconds, folds, and offers Undo for 5 seconds;
   confetti (18 particles, 1.2 to 1.6 seconds) fires only the first time a thing is completed.
   Everything is off under prefers-reduced-motion and the screen is complete without it. No
   haptics on the Mac (the Vibration API does nothing there); the hook stays for phones.
   - Checked by: web tests with a fake reduced-motion query (no animation class is ever added);
     a test that a second completion of the same key fires no confetti.
4a. **No developer words on screen, and the law one tap away (D97, BRIEF, built in W2-P5).**
   - No record id (p1, a1, t1), field name (a1.dso_on, card_end), question id, rule id or reason
     code (`missing:`, `unconfirmed:`) is ever shown, and nothing says why a question was asked
     ("Asked because of: missing ..."). Every id the engine gives reaches the screen through one
     label table in web/src, which words it plainly (a record by its kind and its own name: "EAD
     card", "Software Engineer at Northwind Systems"). An id with no label fails a test; it is
     never shown in place of words.
   - At first glance a screen shows plain words, dates and counts only. Citations, rule ids,
     quotes, inputs and readings sit behind the opened item's one small source mark (ⓘ, point 1),
     which opens the rule's plain words, quote, citation, status and how it was counted (G36).
     No "How Duly counted" link anywhere.
   - Back and Forward after Delete everything (point 32) never show anything of the deleted
     record: the stores are empty and the history holds no page of it (the founder, 2026-09-30, a
     privacy rule).
   - Checked by: a web test that every question id, reason, record kind and field in the engine
     outputs of the twenty journeys and the sample student has a plain label; a web test that
     each opened item with a date or count has exactly one source mark, at its bottom, that no
     line, card or unopened row carries one, and that it opens G36's parts; a web test that after
     the stores' clear call Back shows only onboarding's first step; point 4b's tests.
4b. **The copy the founder rejected cannot ship (D97, built in W2-P5).** Held by tests, not by
   the copy lint's word list: that list changes only by founder decision (tools/copy_lint/lint.py),
   and most of this copy is wrong only where it appears (a heading, a draft, first glance), which a
   word list cannot see. L-tests writes both in W2-P5, and each later plan's screens join them:
   - `tests/web/acceptance/rejected-copy.test.tsx` renders every screen and opened item that
     exists, for the sample student and the twenty journeys' engine outputs, and fails on: an id
     or a reason code in the visible text (a short letter and digit id such as p1 or a1, a dotted
     or snake_case field name, a `prefix:` code; form names such as I-20, I-983 and H-1B are not
     ids); "Asked because", "An answer you gave" or "not computed"; "Duly" as a speaker ("Duly
     counted", "Duly needs", "Duly will"); "Can't tell yet" in a heading or a hero line; a
     citation (CFR, U.S.C., a section sign), a rule id, a quote or "inputs used" anywhere but the
     opened source sheet; any citation in a DSO draft; "Duly" more than twice on a page.
   - `tests/unit/tools/test_web_rejected_copy.py` scans web/src (not tests) for the same fixed
     phrases and for any citation written into the source, since citations reach the screen only
     from the engine's `rules{}` (G36). It catches copy no journey renders.
   - Whatever web/src/lib keeps from the old UI (point 2: drafts.ts, and labels.ts, status.ts and
     lib/views/ if any is kept) is held by both; drafts.test.ts's expectation of a citation in a
     draft goes with it.
   - Checked by: each test fails on a planted fixture, one screen string per pattern, as point 20
     plants faults.

## 2. Every date and count from the engine, through the desktop bridge

5. **The engine bridge.** The preload adds `window.duly.engine` with typed calls, each checked in
   main against a new contract `contracts/desktop_engine_bridge.schema.json`:
   `engine.compute {case}` returns the engine output; `engine.schedule {requests}` returns dates
   (point 18); `engine.updates {}` returns the published updates (point 47). Main forwards each to
   the engine over the W1 socket with the token. The renderer no longer fetches `api/...`; the
   `duly://app/api` proxy is removed and the CSP's `connect-src` becomes `'none'`.
   - Checked by: desktop tests (a call outside the schema is refused; a call from a frame that is
     not the main frame of duly://app is refused, as the case bridge does today); a web test that
     no source file calls `fetch(`.
6. **The screen never computes a date.** Dates arrive as ISO strings with `days_away` integers.
   The screen may format them, sort them by string, and compare integers it was given; it never
   adds, subtracts or counts days, months or business days, and never reads the clock for a date.
   "Today" is the engine output's `today.date`. One module, `web/src/lib/format.ts`, turns an ISO
   date into words from a fixed English month table, with no `Date` object and no locale: "Feb 13"
   in the current year as the engine reports it, "Feb 13, 2027" otherwise.
   - Checked by: `tests/unit/tools/test_web_no_date_math.py` scans web/src (not tests) and fails on
     `new Date(`, `Date.now`, `Date.UTC`, `Date.parse`, `getTime(`, `setDate(`, `setMonth(`,
     `Intl.DateTimeFormat`, `toLocaleDateString`, `performance.now` used with a date, and any
     arithmetic on a field named `*days*` other than display; format.ts is the one file allowed to
     read an ISO string's parts. A golden test of format.ts covers every month, both forms, and a
     leap day.
7. **Every engine field the screen reads is named in the gap map** (section 9). A screen that
   needs a value the engine does not give waits for its change; it does not work it out.
   - Checked by: the reviewer walks the gap map against the code; the acceptance tests of point 53
     compare each shown number with the engine field it names.

## 3. Real data entry: onboarding writes the student's own record

8. **Onboarding is the prototype's skeleton:** status, school, level and major, program dates,
   where they are now (studying, CPT, OPT, STEM OPT, other), and the EAD card when on OPT, plus the
   job step. Every question offers "I'm not sure". The step list is visible and any answered step
   opens directly. The finish screen is short and opens Home. Everything else is asked later, in
   the section it affects, as "waiting for you".
   - Checked by: web tests over the onboarding view model (each step's choices, Not sure on each,
     jumping back keeps answers).
8a. **H-1B, O-1 and EB-1A say plainly that their rules are coming (D89, built in W2-P6).** The
   status step offers them beside F-1. A student who picks one gets one plain line, for example
   "Rules for H-1B are coming. You can keep your H-1B documents here now.", and onboarding skips
   the F-1 steps (school, program dates, where they are now, the EAD card). Home shows that line,
   the Documents card and Updates, with no number card, no Plan dates and no verdict word, and
   Documents works in full once W2-P8 builds it (point 56). The case is written with that
   category; the engine's `category_not_covered:<category>` reason reaches the screen only as that
   line (point 4a).
   - Checked by: web tests over the onboarding view model and Home for h1b, o1 and eb1a (the line
     shows once; Home's Documents card is drawn and opens Documents; no number card, F-1 question
     or reason code appears); W2-P8's acceptance tests add that, for each of these categories, a
     document is added and opened from that Home.
9. **Answers become a real case.** Each answer writes records of the kinds the F-1 pack declares
   (program, authorization, employer, work), with `categories`, `time_zone` (the Mac's time zone
   name, read in main; a name, not a date, so the engine still decides which day is today, D33) and
   `complete` statements (D41). The case is saved through the existing `window.duly.case.write` into
   case.bin (safeStorage), after every answer, and read back at launch.
   - Checked by: web tests (the case built for each onboarding path validates against
     case.schema.json with the same checker the desktop uses); a desktop test that write then read
     returns the same case; the acceptance journeys (point 53).
10. **D59 as D97(1) amends it: one confirmation per document.** Duly asks once per document
    whether the fields typed from it match it: the question names the document (the EAD card, an
    I-20) and shows the fields typed from it with their values, and one answer confirms them all.
    Never one check per date, never a list of checkboxes, never a "check against document" chore
    (BRIEF). The questions are the engine's own, one per document (N7, replacing
    `typed_dates.from_documents` and the per-date `typed_dates.checked.<fact>`); answers are saved
    as `confirmations` in the case, and a confirmed field that the record later contradicts is
    asked again. A typed date whose field names no document (a job's start) is asked once with its
    record, never once per date (D97(1), N7 and K7). A field not yet confirmed holds only the
    items it feeds (D97(3), N8): those items show the one question that settles them, in plain
    words with its place to answer ("Do these match your EAD card?" with the card's dates beside
    it), never as settled and never "Can't tell yet" as a headline (BRIEF); every other item keeps
    its date. The engine's side is built in W2-R1 (point 52a); this screen, in W2-P6.
    - Checked by: an acceptance test: an unconfirmed onboarding case gives one engine question per
      document, each shown as one plain line naming the document, its fields and one place to
      answer; the items fed by other documents keep their dates; after the answer the held items
      show the engine's dates and the screen follows the engine; a web test that a document with
      several typed dates is asked about once, never once per date.
11. **Inference instead of questions**, only where the record already holds the answer and only
    through the engine or a saved source: no "still in school" after an end date; conferral asked
    once; STEM suggested from the major only after the DHS STEM list is saved (gap map G23).
    - Checked by: web tests that onboarding never shows the removed questions.
11a. **The founder's 2026-09-30 onboarding asks (D97, built in W2-P6).**
    - **Back returns to any answered step.** Back from any step opens the step before it with its
      answers in place; the step list opens any answered step in one click; changing an earlier
      answer keeps every later answer it does not touch.
    - **Your answers show their questions.** Your profile (the prototype's screens/case.js, D72's
      one entry in Your profile) shows each answer beside its question, worded as it was asked,
      with Change in place. Every answer the case holds has its question's words; none is shown
      alone.
    - **A job has a title.** The job step asks the title with the employer; it is written to the
      work record's `title`, which L-content adds to the F-1 pack in W2-P5 as a record field no
      rule reads. Work, Home and Your profile name a job by its title and employer ("Software
      Engineer at Northwind Systems"), never "Job from <date>".
    - Checked by: web tests over the onboarding view model (Back from each step lands on the one
      before with its answers; any answered step opens from the step list); a web test over the
      sample and every journey that each answer on Your profile renders in the
      `profile-answers` landmark in the same row as its question's words; an acceptance test that
      the job step writes `title` and the job shows as its title at its employer.
12. **A sample student for trying Duly.** Settings has "Try with a sample student", which loads a
    made-up case (the prototype's Priya, rebuilt as a case.schema case in `web/src/sample/`, every
    date typed as a record field, nothing computed) into a separate slot; the student's own case is
    never mixed with it, and a quiet line says "Sample student" on every page while it is on.
    - Checked by: web tests (switching slots never writes the sample into case.bin); the sample case
      validates and computes with no error.

## 4. Documents on the device, encrypted with the keychain key

13. **A documents bridge,** `window.duly.documents`, with a new contract
    `contracts/desktop_documents_bridge.schema.json`. Calls: `add` (from main's own file dialog, or
    a real drop whose path the preload reads with `webUtils.getPathForFile`; a path string from the
    screen is refused), `list`, `open`, `versions`, `update` (kind, label, typed fields, group,
    which document it replaces), `remove` (to Removed), `restore`, `delete` (for good), `export`
    (decrypted copies to a folder or a .zip the student picks through the system dialog, for
    Share). Every reply is checked against the schema.
    - Checked by: desktop tests per call, including each refusal (a path from the screen, a folder,
      a file inside the data folder, a file over the size limit, a duplicate).
14. **The keys.** At first use main makes a random 256-bit document key D, wrapped by
    `safeStorage` (the Keychain item "Duly Safe Storage") into `<userData>/keys.bin`. Each file
    gets its own random 256-bit key F, kept only inside the encrypted index.
    - Checked by: desktop tests with a fake cipher (D is never written unwrapped; F never leaves
      the index).
15. **The files.** Each document is `<userData>/files/<random id>`, encrypted with AES-256-GCM in
    1 MiB chunks (Node's crypto, no dependency), each chunk's nonce a random 64-bit file prefix plus
    a 32-bit counter, with the document id, chunk index and a last-chunk flag as additional data
    (documents-1 section 3). Adding writes to `.part`, syncs, renames, decrypts back and compares
    the SHA-256 before the index row is written; on any failure nothing half-added remains.
    - Checked by: desktop tests: round trip; a reordered, dropped or cut chunk fails and is
      reported, never opened; a crash between steps leaves no row and no orphan after relaunch.
16. **The index** (names, kinds, typed fields, labels, versions, removed flags, history lines) is
    one JSON file `<userData>/documents.bin`, AES-256-GCM under D, written atomically like case.bin.
    No SQLCipher and no other database (ARCHITECTURE 2.5). The student's original file is never
    moved or deleted, and Duly says so once. D96: a missing documents.bin while a file in files/
    remains is refused as index_missing, and nothing is read, written or deleted (a missing index
    never means no documents); keys.bin with no file in files/ starts an empty index, since no
    document can be lost (contract as of 444fa86); the index keeps the newest 20000 history lines.
    - Checked by: desktop tests (atomic write; a bad index is refused and kept, never deleted; a
      missing index with files present deletes nothing across a relaunch).
17. **Versions and nothing lost.** A reissued I-20 is a new document that `replaces` the old one;
    the chain is its versions, newest first. Remove moves to Removed, Put back returns it, Delete
    for good destroys F and the file. "Delete everything on this Mac" (Settings, Your data) deletes
    files/, documents.bin, keys.bin, case.bin and state.bin after an inline confirm. D96: a chain
    stays a single line (a second document replacing the same one, or a multi-file add that
    replaces, is bad_replaces, and so is a chain past 200 versions); one add takes at most 50
    files and the store at most 5000 documents; an empty file is skipped; export never writes
    inside Duly's own data folder.
    - Checked by: desktop tests for each, and that history keeps "A document was deleted for good"
      without its name.

## 5. The app's own state

18. **A state bridge,** `window.duly.state` (`read`, `write`), new contract
    `contracts/desktop_state_bridge.schema.json`, saves `<userData>/state.bin` with safeStorage like
    case.bin. It holds what is not a fact of the case: loops and their history, goals, school steps,
    USCIS cases and their statuses, task ticks, reminder and appearance settings, the Ask
    conversation, completions. A fact a loop learns (a job ended, a report made) is written to the
    case, not here. The event log of ARCHITECTURE Phase 2 later replaces case.bin and state.bin
    together.
    - Checked by: desktop tests as for the case bridge; a web test that no loop save writes a case
      fact into state.

## 6. The Loop (D75), as a typed module

19. **The module.** `web/src/loops/`: `types.ts` (states open, asking, planned, waiting with
    date, event or person, confirming, closed with outcome, dismissed; reopened is an event; "can't
    tell yet" is a flag), `machine.ts` (start, take an exit, close, dismiss, reopen, undo up to 5,
    snooze capped at the obligation date, spawn children), `playbooks/` (one typed file per
    playbook, ported from data.js: job-ends, travel, stem-filing, address, lost-paper renamed
    lost-document, crisis, notice, checkin, report-owed, dso-question (D92), with their shared
    step-back steps), and
    `receipts.ts`. Pure functions, no clock, no date arithmetic: every date a loop shows is an
    engine item, a value the student typed, or a timer date from the engine's scheduler.
    - Checked by: the rules below as tests, plus `test_web_no_date_math.py` over web/src/loops.
20. **check-loops' rules become tests,** in `tests/web/loops/` (written by L-tests from this SPEC
    and specs/ui-2/prototype/check-loops.mjs, run by web's vitest through an include of
    `../tests/web/**`):
    - static, over every playbook with the shared steps merged: a pinned version; at least one
      trigger; the start step exists; R1 every non-final step has an exit and a timer, and the
      timer has a follow-up question; R2 every waiting step names what it waits on, and a person or
      event has a name; R3 every step is reachable and every path can reach closed (or dismissed
      where allowed), and something closes the loop; R4 a timer never closes or drops a loop, and
      nothing closes without the student's confirmation or an outside fact; R5 a playbook with a
      dated obligation cannot be dismissed, its obligation names a saved source and what meets it,
      and a snooze stops at the obligation date; dropping asks first and offers Cancel; R7 a step
      that shows a threat value has at least two exits; exits lead to existing steps; fields and
      holes are declared; drafts, contacts, sources and loop references exist; the copy rules
      (no long dashes, no emoji, no I or we, no literal or spelled-out numbers in templates,
      buttons name outcomes);
    - runtime, with fake engine outputs: job-ends opens as Needs you, saving gives planned not
      closed, close and dismiss are refused, the report day and the reminders come from the engine
      output and the scheduler, a new job closes with the engine's count; three unanswered
      check-ins set the can't-tell flag on the items that record feeds while deadlines and every
      other item keep their dates (D97); at most the weekly budget of
      check-ins; stem-filing's approval spawns one report-owed loop per report window in the
      engine output; lost-document shows the saved copy first; crisis writes nothing to history
      and shows no date; dso-question (D92) opens when a not-sure answer could change a date,
      waits on the DSO by name with the drafted question sent from the student's own mail,
      checks in after `loop.dso_reply_business_days`, takes the DSO's answer into the field it
      was asked about (marked as the DSO's, with the day), and closes only on the student's
      confirmation, showing what the answer changed; no answer drafts a follow-up and checks in
      again, three unanswered check-ins offer office hours and the neutral attorney pointer, the
      loop never closes by itself, and the items the question touches wait until the answer is
      in, while every other item keeps its date (D97).
    - Checked by: these tests, and that they fail when a rule is broken in a fixture playbook (each
      rule has one planted-fault playbook, as `make prove-gates` does for gates).
21. **Flags the prototype never set are set here or removed:** `beforeLastDay`, `notYetDue` and
    `hoursBelow` come from engine `days_away` values and the engine's hours check; a flag no
    engine field can set is removed from the playbook.
    - Checked by: a test that every `when` flag a playbook reads is produced by a named binder.
22. **The scheduler.** Timers, reminders (on or before the obligation date minus the lead days,
    and the day itself, never removed by back-off or snooze), the weekly budget of check-ins, the
    morning digest and the calendar file (.ics with a stable id per item) are planned by the Loop
    module and dated by the engine: the module sends timer requests (an engine item id or a typed
    date, an offset in days, business days or a setting) to `engine.schedule` and gets dates back
    (gap map G32). Main shows local notifications through Electron's `Notification` at the
    planned times while Duly runs; the words come from the scheduler's real state ("Reminder set
    on this Mac" or "Reminders are off here. Add to calendar"), never a template. Each planned
    reminder is shown once, across relaunches too: main keeps the ids it has shown in its own
    file under userData, never in state.bin, which the page writes (D96).
    - Checked by: loop tests with a fake scheduler; engine tests of the schedule module (gap map,
      N5); a desktop test that a planned reminder becomes one Notification with the given words.

## 7. The screens

Each screen is the prototype's, on real data. The page names are the sidebar's: Home, Plan, Work,
Documents, USCIS status, Updates; Settings and Feedback quiet at the bottom.

23. **Home:** greeting with the status word and the date; three number cards (G1, G2, G3); the Ask
    box below the numbers; a two-column grid of Plan (at most 3 next items, each with its date,
    then See plan), Documents (three most used, then All documents), USCIS status (each case and
    its status), Updates (the latest one or two headlines with the "affects you?" line). A Home
    item is answered in place in a sheet, never a jump. The check-in card shows when the engine
    says a fact is stale (G8).
    - Checked by: acceptance tests over engine samples: each number equals its engine field; with
      no EAD card, cards 1 and 2 become "Add your EAD card"; a cannot_tell count shows the engine's
      question, not a number.
24. **Plan:** the path the student is on, from the engine's stages; the STEM OPT intent asked in
    place (Yes, No, Not sure); the date strip (G13), a real timeline scaled to time with the
    Prepare and Filing window spans and a Today marker, only the date that matters now emphasized;
    the checklist from the engine (G14) with school steps placed Before, Alongside or After (G19);
    reports owed (G6, G7) with Mark done; goals beside STEM OPT (G20, G21). "Rules checked <date>"
    from the engine (G37).
    - Checked by: acceptance tests (the strip's marks are the engine's window dates; the Today
      marker sits at `opens_days_away`; ticking a step writes the engine's confirmation id and the
      engine's count of confirmed steps follows).
24a. **What's next asks intent first, and the DSO draft is easy to read (D97, built in W2-P6).**
    - Plan asks the intent for the next step the path offers before it shows that step's dates or
      tasks ("Planning to apply for STEM OPT?", Yes, No, Not sure), answered in place there and
      in Home's next move (BRIEF round 5). After Yes, the window, the prepare date, the tasks, the
      school's step and the DSO draft appear; after No or Not sure the filing steps do not start
      (as in the prototype) and the question stays in place. The answer is the student's own and
      changes in place.
    - The DSO draft (D57) is in the student's plain words with no citation, section sign or rule
      id. It opens only when asked, in a panel the full width of the content column at body size,
      with Copy and Open in Mail; then the step shows "Email sent? Mark done" or "Reopen the
      draft" (BRIEF round 2).
    - Checked by: acceptance tests (with no intent answered, Plan's part for that step holds only
      the question; after Yes the strip and checklist show the engine's dates; after No or Not
      sure no filing step starts); a web test that the draft opens in the
      `plan-dso-draft` landmark across the content column, never in a side panel; point 4b's
      tests over every draft the playbooks and Plan make; the design shots (point 1).
25. **Timeline,** reached from Plan, not the sidebar: past phases summarized, the current phase,
    "Add ... to see this" for a missing fact (G35).
26. **Work:** the student's jobs (several is normal), hours, start dates, last confirmed and next
    check-in, the report line for each job, Change hours, My job ended (job-ends loop, G15), Add a
    job (an employer or the student's own company).
    - Checked by: acceptance tests (adding a job writes work and employer records; the report line
      is the engine's window).
27. **Documents:** label chips that filter in one click (Status and permits, Work, School,
    Identity, then the prototype's finer groups), All documents, search over names, kinds, labels
    and earlier versions, a document's page (about, key dates the student typed, Open, Share, I
    lost this, earlier versions), Add from anywhere (button and drop zone together), document
    watch (G10), the share pack (G11), lost document (G18).
    - Checked by: web tests (any file is two clicks or one search away; search finds an earlier
      version); acceptance (typed fields write the case facts and raise the D59 check).
28. **Typed fields feed the case.** For each kind (I-20, EAD card, I-797, I-94, passport, visa,
    I-983), the document page asks only that kind's fields, which are the pack's record fields
    (an EAD card's start and end are `authorization.card_start` and `card_end`). Saving writes the
    case and raises the one D59 confirmation for that document, never one per date (D97(1),
    point 10).
    - Checked by: acceptance tests per kind.
29. **USCIS status:** each case with its receipt number, form type, status as of a date, key dates
    and next step; Track another case (receipt pattern three letters and ten digits); the status
    saved by hand ("Recheck by logging in to USCIS"). No processing times: the prototype's are
    sample figures with no saved source.
    - Checked by: web tests (a bad receipt is refused; a saved status shows its as-of date).
30. **Updates:** articles (headline, date, source, short paragraphs: what happened, background,
    what comes next) and one "For you" box per article, from published updates only (G26). An
    item with no saved source is never shown.
    - Checked by: acceptance tests (an unpublished update never reaches the list; "For you" follows
      the engine's stages for the case).
31. **Opening a document.** Images open inside Duly from bytes over the bridge as `data:` images.
    PDFs are never handed to Chromium's own viewer (ARCHITECTURE 2.2). Recommendation (point 62):
    render PDF pages with pdf.js in a hidden sandboxed window with no network and no preload
    access to keys, and send page bitmaps to the main window. Until the founder approves that
    dependency, a PDF offers "Save a copy" (the system save dialog) only. No other kind opens
    inside Duly: "Duly cannot show this kind of file here. Save a copy to open it in another app."
    - Checked by: desktop tests (a PDF never reaches a `file:` or `blob:` URL; no plaintext file
      is written except through the save dialog).
32. **Settings,** in grouped panels: Reminders (on or off, time of day, the calendar file),
    Security (what protects the documents today, in plain words, point 62), Backup ("Not set up.
    Encrypted backup comes later"), Appearance (theme), Your data (Try with a sample student,
    Delete everything on this Mac). Devices and email channels are left out until they exist.
    - Checked by: web tests (no control that does nothing; delete everything clears every store
      through the bridges).
33. **Feedback** stays as in the prototype, written to state.bin, never sent (no server).

## 8. Ask, through the local helper

34. **The helper moves into the app as an optional local service.** specs/ui-2/prototype/
    ask_server.py moves to `assistant/local_ask/` (L-narration), unchanged in what it asks and the
    shape it returns (lead, applies, plan now and at STEM OPT and after, watch, dso ask and draft,
    sources, actions), with these changes:
    - it listens on its own Unix socket in `<userData>/run/` with mode 0600 and the W1 token rule,
      started by main only when Ask is turned on in Settings, never on a TCP port, no CORS;
    - its facts block is built from the engine output for the case and the case's own fields,
      never from the prototype's record.js arithmetic;
    - it still calls the `claude` command (the founder's own Claude Code login), so it needs that
      command on this Mac; with no `claude`, Ask says it is not set up and offers the guides.
    - Checked by: tests/unit/assistant/test_local_ask.py (the facts block for the sample case holds
      only engine values and typed fields; the reply parser's caps and word rules from the
      prototype's eval; refusal without the token), with the `claude` call faked.
35. **The sample student only** (D79 allows the helper to send the fictional sample's record,
    not a real student's; D86). While the student's own case is loaded, Ask matches questions
    to guides on the device (the Loop module's `match`: crisis first, then playbook phrases) and
    otherwise drafts the DSO question; nothing leaves the Mac. D86 decided point 63: the
    founder's own record does not go through the helper in W2, so there is no setting that sends
    it.
    - Checked by: a desktop test that the ask bridge never starts the helper while the own-case
      slot is active, whatever the settings hold.
36. **Crisis and enforcement questions never leave the device** (D80): the on-device crisis list
    runs before anything else and opens the fixed crisis screen.
    - Checked by: loop tests (each crisis phrase starts the crisis loop and makes no bridge call).
37. **Not in a public build.** ARCHITECTURE 7.3: no Anthropic provider, client or
    `api.anthropic.com` in a release artefact. The helper is included only in the founder's build
    (`DULY_BUILD=founder`); W2-P9 extends W1's verify-bundle so that a `DULY_BUILD=public` package
    containing assistant/local_ask fails.
    - Checked by: verify-bundle tests with a planted helper in a public build.
38. **For production, recorded here and not built (D80):** Ask on Claude through Bedrock in
    Duly's own AWS account with retention none and invocation logging denied; a separate Ask
    address with logs off; requests not linkable to the account (rotating pseudonym, fresh key per
    Ask token); crisis and enforcement questions never leave the device; identifiers stripped on
    the device and the exact text shown before it is sent; the canary test on every path; Ask off
    by default until the evals pass; the engine still supplies every date and count; BOUNDARY
    rules apply (ARCHITECTURE 8, overridden by D80 where it said the model only picks a guide).

## 9. The gap map

One row per prototype feature. **E**: computed by the engine today (the output field named).
**C**: needs an engine, rule pack or contract change first (named; the codes are defined in
section 10). **U**: UI only (no date or count of its own, or only values already named in another
row). Where a feature mixes, the row takes the class of its missing part.

| # | Feature (where in the prototype) | Class | Engine field today, or the change it needs |
|---|---|---|---|
| G1 | Home number: days without work, used of the limit | E | `computed[]` item `unemployment.opt_card.<card id>` (value, unit days); the limit is `rules["opt.unemployment_limit_days"].value`; on STEM `unemployment.total.<key>` with `stem.unemployment_limit_days`. Null value with a question when a day is unknown. The "as of" date comes with G8 |
| G2 | Home number: card valid until, days left | E | `stages[]` with `stage` opt_post or stem: `facts["<card id>.card_end"]`, `ends`, `ends_days_away` |
| G3 | Home number: the next date | E | `upcoming[0]`: `date`, `days_away`, `id`. Grows as G5, G7, G10 and G13 add items |
| G4 | Greeting status word and where you stand | C | `stages[].state == "current"` for the status word; `verdict.state`, `verdict.reasons`, `questions[]`, with N8 (D97(3); W2-R1, stale and litigated rules included; FEED-P8 for rules the feed holds or supersedes): only the items a hold touches wait, and where you stand names them; today a litigated rule or an unconfirmed typed date holds no item of its own and only turns the whole verdict cannot_tell |
| G5 | File-by date for OPT and STEM OPT ("File your I-765 by") | C | P1: windows `opt.last_day` and `stem.last_day`, the earliest of the filing window's close and the recommendation limit. Today the engine gives `opt.apply_window`, `opt.file_by`, `stem.apply_window`, `stem.file_by` separately and the screen may not pick the earlier |
| G6 | Reports owed: STEM validation reports, the 12-month and final evaluations, job-end reports | E | `stages[].windows[]` ids `stem.validation_1` to `_4`, `stem.evaluation_12_month`, `stem.evaluation_final`, `opt_job_end.report`, `stem_job_end.report`, `stem_job_end.evaluation_final` (`closes`, `closes_days_away`); Mark done writes a `report` record (`made_on`). The plan's tests check each window's `done_when` |
| G7 | Reports owed: a new job, a new I-983, an hours change | C | P3: report windows on a job's start and on each hours change, each only where a saved rule gives the days (`opt.report_employer_within_days`, tagged guidance; `stem.report_change_within_days`; `stem.new_plan_due_days`) |
| G8 | Check-in "Still at Northwind, about 40 hours a week?" and the count as of the last confirmed day | C | K1 (check-in days), K2 (`checkins[]`, `as_of`), P7 (`confirmed_on` on work and petition), N3 (stale facts listed; counters stop at the last confirmed day) |
| G9 | Trip check | C | P4 (passport and visa records, D74), P5 (windows `trip.absence_limit` from `travel.absence_months`, `trip.signature_covers` from `travel.opt_signature_months`); a planned trip is a compute on a copy of the case. Today the engine has the trip stage and the checks `trip.back_within_absence_limit`, `trip.signature_for_opt_return`, but no dates |
| G10 | Document watch ("Next to run out: EAD card, Feb 13, 2027") | C | P4, P6 (the pack names the dates to watch), N4 (`watch[]` with `date`, `days_away`, `close`), K1 (`watch.close_days`), K2 |
| G11 | Share: a pack of documents through the share sheet, a saved copy or a .zip | U | The documents bridge `export`. The one-page summary waits (its prototype code is dead) |
| G12 | Cap-gap dates for a petition | C | P8 and N6: a cap-gap stage in the path pack (D63 to D66, specs/capgap-1). Today only `f1.py` (the old engine) has the dates; the path pack has the judgement `cap_gap.for_dso` and `capgap.trip_while_pending` |
| G13 | The stepper: date strip with Prepare and Filing window spans, Today marker, caption | C | Filing window today: `stem.apply_window` `opens`, `closes`, `opens_days_away`, `closes_days_away`. The Prepare span needs P2, N1 and K1 (a planning date set by a product setting, marked as not a rule) |
| G14 | Plan's checklist (STEM OPT and OPT steps) | E | `checklists[]`: `steps[]` (`label`, `who`, `school`, `confirmed_on`), `confirmed`, `total`; answers are confirmations `step.<checklist>.<step>` |
| G15 | Job ends loop | C | Report day `opt_job_end.report` and the count are E; the limit day ("the limit date is Dec 19") needs N2; the reminder dates need N5 |
| G16 | STEM filing loop | C | P1 (last day), P2 and N1 (prepare), N5 (timers). Checklist and `stem.filed_while_opt_in_force` are E |
| G17 | Address change loop | C | P4: the address record and 8 CFR 214.2(f)(17) and (f)(12)(ii)(A) as sourced rules (D74), and report windows from them. Until then the loop says the DSO confirms the deadline and shows no number (the prototype's Reports owed row with 10 days contradicts its own loop and is dropped) |
| G18 | Lost document | C | Open the saved copy and mark it lost are U; the replacement steps per kind (I-20 from the DSO, EAD by Form I-765, I-94 from CBP, passport through the consulate) need P12, saved sources, before any is shown; until then the DSO draft |
| G19 | School steps placed Before, Alongside or After a federal step, "Waiting on" | U | No date of its own; the federal step keeps the engine's dates. Import from a pasted link or a PDF needs a reader and the network: point 64 |
| G20 | Goal: start my own company | C | P10: the self-employment rules for post-completion OPT and STEM OPT, sourced (none is in the pack); its report date needs P3 |
| G21 | Goal: O-1 later | C | P11: rules in rulepacks/o1-us (the pack has no rule today): petitioner, evidence, no cap, advisory opinion |
| G22 | Onboarding with the D59 checks and the D41 lists | C | N7 with K7 (D97(1), built in W2-R1): one confirmation per record and document kind. Today `questions[]` has `typed_dates.from_documents` and one `typed_dates.checked.<fact>` per typed date; `complete.<kind>` and `answers_read` are E |
| G23 | "This looks like a STEM degree" from the major | C | P9: the DHS STEM Designated Degree Program List saved as a source, and a lookup from the CIP code |
| G24 | Work page: jobs, hours, add a job, change hours | E | Records written by the screen; counts from G1, report lines from G6 and G7 |
| G25 | USCIS status, by hand, with Track another case | U | State only. The prototype's processing times are dropped (no saved source); its next-check date comes from the scheduler (G32) |
| G26 | Updates as articles with "For you" | C | K5 (article paragraphs and an `affects` selector in update.schema.json), published updates passing `publish_blockers` (L-pipeline), A2 (local `GET /v1/updates`); "For you" matches the selector against the engine's `stages[]` on the device |
| G27 | Settings panels | U | Reminders settings feed the scheduler; delete everything uses the bridges |
| G28 | Ask: the advisor answer, the conversation kept | U | The local helper (section 8); its facts come from the engine output |
| G29 | DSO email drafts in the student's voice | U | Templates over typed facts; no computed date stated as the student's own (D57); no citation (D97, point 24a) |
| G30 | Try a change (my job ends, new employer, fewer hours, a CPT internship) | E | A compute on a copy of the case, then a diff of the two outputs by item id. The trip and petition presets wait for G9 and G12 |
| G31 | The Loop runner: states, exits, receipts, undo, dismiss rules | U | web/src/loops (section 6) |
| G32 | Loop timers, reminders, weekly budget, digest, calendar file, notifications | C | N5 (`engine/schedule.py`), K3 (the schedule contract and `POST /v1/schedule`), K1 (lead days, check-in days, travel ask days, DSO reply business days, weekly budget, back-off) |
| G33 | Crisis and notice loops | U | Fixed screens, no dates |
| G34 | CPT days and months used | E | `computed[]` items `cpt.full_time_days_at_level.<key>` and `cpt.full_time_months_at_level.<key>` |
| G35 | Timeline phases | E | `stages[]`: `label`, `state`, `starts`, `ends`, `days_in`, `days_total`, `reasons` |
| G36 | "How this was counted" (the one ⓘ) | E | `rules{}`: `plain`, `quote`, `citation`, `url`, `checked_on`, `status`; each item's `inputs` and `rule_ids` |
| G37 | "Rules checked Sep 30" | E | `scope.rules_checked_on` |
| G38 | Documents: groups, chips, search, versions, add, open, remove | U | The documents bridge (section 4) |
| G39 | Motion, receipts, confetti | U | Section 1 point 4 |

**Counts: 39 rows. 11 computed by the engine today (G1 to G3, G6, G14, G24, G30, G34 to G37);
18 need an engine, rule pack or contract change first (G4, G5, G7 to G10, G12, G13, G15 to G18,
G20 to G23, G26, G32); 10 are UI only (G11, G19, G25, G27 to G29, G31, G33, G38, G39). D97 moved
G4 and G22 from E to C (N7, N8).** The
features named for this map take 19 of the rows (the big numbers are three rows, reports owed and
goals two each): 4 computed today (G1, G2, G3, G6), 2 UI only (G11 share, G19 school steps) and 13
needing a change first (G5, G7 to G10, G12, G13, G15 to G18, G20, G21).

## 10. The changes that land first

Contracts land first and alone, in one founder commit (W2-P0). K7 and point 40's `waits_on` on
watch and check-in rows, added in the regroup round, land the same way, each in a founder contract
commit before W2-R1 runs (point 52a). Then pack and engine changes, each with tests first. Codes as
used in the gap map.

**Contracts (founder lane, W2-P0; K7 and point 40's `waits_on` before W2-R1):**
39. K1, `contracts/product_settings.yaml`: `checkin.job_days` (30, the prototype's), `checkin.
    petition_days` (30, D66), `loop.deadline_lead_days` (3), `loop.checkin_days` (14),
    `loop.weekly_budget` (3), `loop.backoff_after` (3), `loop.dso_reply_business_days` (5),
    `travel.first_ask_days` (21), `travel.last_ask_days` (2), `plan.prepare_months` (1),
    `watch.close_days` (30). Each is a product setting, never a rule, and says so.
40. K2, `contracts/engine_output.schema.json`: optional `checkins[]` (`record`, `kind`,
    `confirmed_on`, `due`, `due_days_away`, `question`); optional `watch[]` (`id`, `label`,
    `date`, `days_away`, `close`, `record`, `rule_ids`, `status`); an optional `planning: true` on
    a window or item set from a product setting, not a rule; an optional `as_of` on a computed
    count. Added before W2-R1 (point 52a), first and alone: an optional `waits_on` on a `watch[]`
    and a `checkins[]` item, naming what holds a withheld row as computed items and windows already
    do, so its null never reads as "does not apply" (SPEC-W2-UNKNOWN point 33, D97(3);
    reviews/w2-p2.md finding 4).
41. K3, `contracts/schedule.schema.json` and `POST /v1/schedule` in openapi.yaml: requests
    `{id, from: {item} | {date} | {today}, add: {days} | {business_days} | {months} |
    {setting}, sign, cap: {item}?}` in; out `{today, dates: [{id, date, days_away}]}`, each answer
    optionally carrying `missing`, `capped`, `planning` (only when a setting set it: the amount,
    or a base or cap item that is itself planning, D95), `rule_ids` and `inputs` (as built in
    W2-P0). Offsets have Duly's own limits (days 36525, business days 260, months 1200), and a
    request the engine cannot date is answered with its reason, `holidays_not_known` or
    `outside_readable_dates` among them, never a failed body (D95). No other route changes.
42. K4, the desktop bridges: `desktop_engine_bridge.schema.json`, `desktop_documents_bridge.
    schema.json`, `desktop_state_bridge.schema.json`, `desktop_ask_bridge.schema.json`.
    desktop_case_bridge.schema.json is unchanged.
43. K5, `contracts/update.schema.json`: an optional `article` (paragraphs, each naming the claim
    ids it rests on) and an optional `affects` selector (stages, record kinds and fields); every
    existing field and `publish_blockers` unchanged.
44. K6, `contracts/rulepack.schema.json`: a window amount may name a product setting
    (`{setting: id}`), which marks the window `planning`; an optional `path.watch` list (record
    kind, date field, label, rule ids); an optional `path.checkins` list (record kind, the field
    that holds the last confirmed day, the setting). New record kinds (passport, visa, address)
    need no schema change: kinds are pack data, so D74's records land as P4.
44a. K7, `contracts/rulepack.schema.json`: an optional `document` on a record field, naming the
    document kind the field is typed from (N7), conditional on the record where the kind depends
    on it (as `when_absent` is). It lands as a founder contract commit, first and alone, before
    W2-R1 runs (point 52a), not in W2-P0; plans cite it as contracts/rulepack.schema.json with K7.
    The pack fills it in W2-R1 (point 46).

**Rule pack (L-content, every rule from a saved primary source with its quote, never a number
written by hand):**
45. P1 last-day windows (with no DSO recommendation date the last day is not known: missing means
    the last day waits and the date is asked, founder decision 2026-10-01, while every other item
    keeps its date, D97; this holds only before a filing: once a filing date or an EAD is recorded
    the recommendation date stops blocking and is not asked, D32, built in W2-R1); P2 prepare
    windows (with K6, N1); P3 report windows on a job's start (an hours change waits: no saved
    source gives its days, founder decision 2026-10-01); P4 passport, visa and address records
    with 8 CFR 214.2(f)(17) and (f)(12)(ii)(A) (D74); P5 trip windows; P6 the dates to watch; P7
    `confirmed_on` fields; P8 the cap-gap stage; P9 the DHS STEM list as a saved source; P10
    self-employment on OPT and STEM OPT; P11 O-1 rules in rulepacks/o1-us; P12 document
    replacement sources. A rule with no saved source is reported missing, and its feature waits.

**Engine (L-engine):**
46. N1 windows from a product setting, marked planning; N2 the limit day of a counter (the day the
    count would reach its limit if nothing in the record changes, an item `<counter>.<key>.
    limit_day`, with words that never say what follows that day); N3 check-ins and `as_of`; N4
    `watch[]`; N5 `engine/schedule.py`, a pure function over a Clock, the pack's calendar (business
    days with the federal holidays the engine already counts out) and the settings (a day with no
    holiday row in force, or a base or result outside the readable dates, gives that request no
    date and its reason, never an error, D95); N6 cap-gap in the path engine, matching f1.py on
    the cases of specs/capgap-1. Added by D97, both built in W2-R1 (point 52a), before W2-P5: N7
    one confirmation per document (point 10): the typed-date questions become one per document
    the fields were typed from, naming its fields and their values, and one answer confirms them
    all while those values stand and nothing contradicts them (today engine/path.py asks
    `typed_dates.from_documents` and then one question per typed date). Which document a field is
    typed from is pack data, never guessed: K7 (point 44a) adds an optional `document` on a record
    field, naming a document kind, conditional on the record where the kind depends on it (as
    `when_absent` is). W2-R1's L-content fills it for the fields point 28 lists, so an
    authorization's `dso_on` belongs to the Form I-20 and its `card_start` and `card_end` belong
    to the EAD card (or to the Form I-20 for CPT). One question per record and document kind. A
    typed date whose field names no document (a job's `start`) is asked once with its record,
    never once per date (D97(1)). N8 a hold touches only its items: an unknown, an unanswered
    question, an unconfirmed field, a stale rule or a litigated rule holds only the items it
    touches, each naming in `waits_on` what would settle it, and every other item keeps its date
    whatever the verdict's state; the verdict never reads as no open items while anything waits
    (D4), and no screen shows a held item as settled.
    Today a litigated rule holds no item of its own and turns the whole verdict cannot_tell
    (`rule_in_litigation`, engine/verdict.py), and an unconfirmed typed date blocks the whole
    verdict the same way. The engine's side is SPEC-W2-UNKNOWN points 33, 34 and 37 and SPEC-FEED
    point 64 as D97 amends them: N8 here covers unknowns, unanswered questions, unconfirmed
    fields, and stale and litigated rules (a stale rule is one past its own `checked_on` by more
    than 7 days while no feed exists), all built in W2-R1; SPEC-FEED point 64 (FEED-P8) keeps only
    the rules the feed holds or supersedes; W2-P6 waits for W2-R1, since today's samples carry
    `rule_in_litigation`. The contract fields they need (K7, point 40's `waits_on`) land first and
    alone, before W2-R1.

**Local routes (L-api):**
47. A1 `POST /v1/schedule` in api/local_routes.py, served by api/desktop_main.py and api/main.py;
    A2 `GET /v1/updates` (declared in openapi.yaml, not built) in local_routes, reading the
    published updates bundled with the app (W1's allowlist gains `pipeline/published/*.json`).
    D95: both routes give the same answer from the packaged tree as from the repository, so
    W1's allowlist also gains `contracts/schedule.schema.json` and `contracts/update.schema.json`;
    A2 returns a file only if it follows update.schema.json and `publish_blockers` returns
    nothing, with `publish_blockers` moved now to `engine/updates.py` (standard library only,
    SPEC-FEED point 35's first half; its wording checks stay with the feed plans) and
    re-exported by `pipeline/graph.py`; two requests with one id are a 422.

## 11. The plans, in order

Each plan is one factory run: a `goal`, lanes with their paths, tests first, a build held to its own
tests plus the journeys, a reconcile round, a review and an audit (RUNBOOK). Done commands are
written here as the plan files will hold them. Plan P4 may run beside P1 to P3; W2-R1 (point 52a)
runs after W2-P1 to W2-P4 and before W2-P5; the rest in order. D100: a fix plan cites the SPEC
point it fixes and never tells a builder what the hidden tests found; every plan checks its gates
against origin/main; founder-lane edits made while a plan runs go on their own branch and merge
after it; and the first plan after the regroup round starts only after a re-audit finds the repo
clean. That gate is set once and holds the next build plan, W2-P5. It does not hold the regroup
round's own work: W2-R1 (point 52a), and the weekly local recheck with the freshness plan that
moves `checked_on` (D98, point 66), which may run before the re-audit.

48. **W2-P0, contracts and setup (founder lane, alone).** K1 to K6. Also: web/vitest.config.ts and
    desktop/vitest.config.ts include `../tests/web/**` and `../tests/desktop/**`, with a tsconfig
    and eslint entry for them, so L-tests can write web and desktop tests outside the lanes it
    tests. Checked by a
    founder-lane test `tests/unit/contracts/test_schemas.py` (every contracts/*.schema.json passes
    Draft 2020-12's `check_schema`; product_settings.yaml rows each carry a unit and say they are
    settings; today's engine output for the journeys still validates), then
    `bash -c 'uv run pytest tests/unit/contracts -q && make gate-7 && uv run pytest tests/unit -q'`
    and `make doctor`. The audit step of this plan adds register rows for D63 to D84, specs/duly-2
    and specs/ui-2.
49. **W2-P1, the dates Plan needs.** P1, P2, P3, N1, N2.
    - L-tests: `tests/unit/engine/test_w2_windows.py` (last day, prepare, job-start and hours
      reports, each date checked against the saved words first) and `test_w2_limit_day.py`; new
      journey pairs in tests/holdout. Done: `bash -c 'uv run ruff check tests && uv run ruff format
      --check tests && uv run pytest tests/unit/engine/test_w2_windows.py
      tests/unit/engine/test_w2_limit_day.py --co -q >/dev/null'`.
    - L-content. Done: `bash -c 'uv run python -m tools.sources.verify rulepacks && uv run python
      -m tools.sources.plain rulepacks --require f1 && uv run python -c "from engine.rulepack
      import load_all; load_all()"'`.
    - L-engine. Done: `bash -c 'uv run pytest tests/unit/engine/test_w2_windows.py
      tests/unit/engine/test_w2_limit_day.py tests/unit/acceptance/test_journeys.py -q && uv run
      python -m tools.gates.engine_literals && uv run mypy && uv run ruff check engine && uv run
      ruff format --check engine'`.
    - Reconcile (L-tests, whole suite and hidden tests); `make samples` as a round step.
50. **W2-P2, the records the prototype reads.** P4 to P7, N3, N4. Same lanes and shape as P1, with
    `tests/unit/engine/test_w2_records.py` (passport, visa, address, trips, watch, check-ins, the
    count as of the last confirmed day).
51. **W2-P3, the scheduler and the local routes.** N5, A1, A2.
    - L-tests: `tests/unit/engine/test_schedule.py` (property tests with an injected clock:
      business days skip weekends and the counted-out holidays; a cap never moves a date past its
      obligation; months clamp to the last day; a missing base gives no date, never a guess) and
      `tests/unit/api/test_local_routes_w2.py`.
    - L-engine. Done: `bash -c 'uv run pytest tests/unit/engine/test_schedule.py -q && uv run
      python -m tools.gates.engine_literals && uv run mypy && uv run ruff check engine'`.
    - L-api. Done: `bash -c 'uv run pytest tests/unit/api/test_local_routes_w2.py
      tests/unit/desktop_entry -q && uv run mypy && uv run ruff check api'`.
    - L-pipeline, beside them: the prototype's three articles as update files in
      `pipeline/drafts/` (D95: no lane can record the founder's approval, so they wait there and
      move to `pipeline/published/` only when the founder approves, passing `publish_blockers`:
      primary source, quote found, two checks, the approval recorded). Done: `bash -c 'uv run
      pytest tests/unit/pipeline -q'`.
52. **W2-P4, the desktop bridges** (may run beside P1 to P3). Engine bridge, state store,
    documents store, notifications. The CSP change of point 5 (`connect-src 'none'`, the
    `duly://app/api` proxy removed) moves to W2-P5, which switches the screen to the engine
    bridge, so the app the founder installs keeps working between the two plans (founder lane,
    2026-10-03).
    - L-tests: `tests/desktop/bridges.test.ts`, `tests/desktop/documents.test.ts` (sections 4 and
      5, every refusal, the chunk faults, the crash between steps). Done: `bash -c 'npx tsc
      --noEmit -p tests/desktop && npx eslint tests/desktop --max-warnings 0'`.
    - L-desktop. Done: `bash -c 'npm run typecheck -w desktop && npm test -w desktop && npx eslint
      desktop --max-warnings 0 && npx prettier --check "desktop/**/*.{ts,json}" && uv run python
      -m tools.copy_lint.lint'`.
    - L-security: the threat-model rows for documents under the keychain key alone.
52a. **W2-R1, the revision build (specs/step-w/plan-w2-r1.yaml, the regroup round's; D97, D100).**
    After W2-P1 to W2-P4 and before W2-P5, so that P5 and P6 build on it. It is the regroup
    round's own work, which D100's re-audit gate does not hold (section 11's opening). Before it
    runs, outside the jail and alone, the founder lane lands contracts/rulepack.schema.json with K7
    (point 44a) and point 40's `waits_on`, each a founder contract commit, first and alone; saves
    and commits the earlier eCFR copies of 8 CFR 214.2, 8 CFR 214.1 and 22 CFR 41.112 under the
    F-1 pack's sources; and runs and commits the weekly local recheck of point 66 on the F-1 pack.
    Lanes work from saved copies only and fetch nothing. It carries:
    - D97: N7 and N8 (point 46) for unknowns, unanswered questions and unconfirmed fields, with
      K7's `document` filled by L-content for the fields point 28 lists. On today's screen,
      onboarding asks the engine's one question per document (point 10), and an item that waits
      shows the one question that settles it, never a date or a number, while every other item
      keeps its date. N8 also holds only the items that read a stale or litigated rule
      (`tests/unit/engine/test_w2_r1_rule_holds.py`); rules the feed holds or supersedes stay
      with FEED-P8 (SPEC-FEED point 64).
    - D32: once a filing date or an EAD is recorded, an absent DSO recommendation date is not
      asked and blocks nothing (point 45).
    - The W2-P2 review's should-fixes: a check against a rule never blanks a confirmed day; a
      conflict between answers withholds what is dated from them, an OPT card that starts before
      its program ends included; a withheld watch or check-in row names what it waits on (point
      40); a planned trip gets no conflict built from today.
    - A row the pack starts on its earliest saved copy starts on the earliest saved copy of its
      section that holds the same words, so trips, moves, CPT, transfers and changes of level
      before 2026-09-14 get their dates where an earlier copy holds them; a rule's `checked_on`
      moves only where the recheck backs it (D98, point 66).
    - DSO drafts state only hours the student entered and carry no citation (D57, D97); each
      conflict has its own words; a check-in answered "No, something changed" opens the record
      (D75); the first law-update draft clears the FEED-PA review's should-fixes; the surviving
      mutants of approved reviews are killed.
    - Rounds: L-tests writes each test the round before the builder that needs it, among them
      `tests/unit/engine/test_w2_confirm_document.py` (N7) and `tests/unit/engine/
      test_w2_holds.py` (N8: an unknown, an unanswered question and an unconfirmed field each hold
      only their items, every other item keeps its date, the verdict never reads as no open items
      while one waits). L-engine, L-content, L-web and L-pipeline build over four rounds: N7,
      then N8 for questions and fields, then N8 for stale and litigated rules. L-tests also brings in line every existing test whose expectation N7, N8 or D32
      changes, the point beside each (tests/unit/engine/test_typed_dates.py's per-date questions
      first, test_verdict.py, test_path.py, test_w2_windows.py and the journeys), never loosening
      an assertion. Then `make samples` as a round step, so that later work reads N7's question
      ids; then Reconcile (L-tests and L-web, the whole suite and the hidden tests, gates with
      `make test-offline BASE=origin/main`); the review (reviews/w2-r1.md) and the audit
      (docs/requirements/audits/w2-r1.md). The done commands are the plan file's. Missions cite
      SPEC points and decisions, never what a hidden test found (D100).
53. **W2-P5, the web foundation.** The new shell and router, tokens and motion from the
    prototype, format.ts, the engine client over the bridge, the case and state stores, the sample
    student, the Loop module and every playbook. The old UI removed. The CSP change of point 5
    lands here, with the engine client (moved from W2-P4). Also, under D97: points 4a and 4b (the
    label table, the source mark, Back after the stores are cleared, the rejected-copy tests), and
    the work record's `title` (point 11a). N7 and N8 (point 46) are built before it, in W2-R1
    (point 52a), so its label table and acceptance tests read N7's questions and N8's holds.
    - L-tests: `tests/web/loops/*.test.ts` (point 20), `tests/web/format.test.ts`,
      `tests/unit/tools/test_web_no_date_math.py`, and `tests/web/acceptance/` with the sample
      student and the twenty journeys' engine outputs (each shown number equals its named field);
      `tests/web/acceptance/rejected-copy.test.tsx` and `tests/unit/tools/test_web_rejected_copy.py`
      (point 4b) and the label, source mark and Back tests of point 4a.
      Done: `bash -c 'npx tsc --noEmit -p tests/web && npx eslint tests/web --max-warnings 0 && uv
      run ruff check tests && uv run ruff format --check tests && uv run pytest
      tests/unit/tools/test_web_no_date_math.py tests/unit/tools/test_web_rejected_copy.py --co -q
      >/dev/null'`.
    - L-content (the work record's `title`, point 11a). Done as W2-P1's L-content.
    - L-web. Done: `bash -c 'npm run typecheck -w web && npm test -w web && npm run build -w web
      && npx eslint web --max-warnings 0 && npx prettier --check
      "web/**/*.{ts,tsx,css,html,json}" && uv run python -m tools.copy_lint.lint && uv run pytest
      tests/unit/tools/test_web_no_date_math.py tests/unit/tools/test_web_rejected_copy.py -q'`
      (web's vitest runs tests/web through its include).
    - Order: L-tests, then L-content; `make samples` as a round step after it merges; then
      L-web's label table and acceptance work, so they read the engine outputs as W2-R1 left
      them; then Reconcile (L-tests, whole suite and hidden tests), as in W2-P1.
54. **W2-P6, Onboarding, Home and Plan.** Sections 3 and 7 points 23 to 25, with G1 to G6, G13,
    G14, G16, G19, G22, G37 live, and the D97 and D89 points built here: 8a, 10 and 11a in
    section 3, 24a in section 7. L-tests writes the acceptance tests first
    (`tests/web/acceptance/home.test.tsx`, `plan.test.tsx`, `onboarding.test.tsx`, by
    `data-landmark` names this SPEC fixes: `home-numbers`, `home-plan`, `plan-strip`,
    `plan-checklist`, `onboarding-step`, and `profile-answers` and `plan-dso-draft` from points
    11a and 24a) and grows point 4b's rejected-copy test to every screen this plan builds; L-web
    builds; the same done commands as P5. Outside the
    jail the founder lane runs `make design-shots` and compares with the prototype before review.
    Then the founder's test (point 65, D99).
55. **W2-P7, Work, USCIS status, Updates, Settings.** G8, G15, G24 to G27, G29, G32 live.
    Same shape. Then the founder tests reminders (point 65, D99).
56. **W2-P8, Documents.** Points 27, 28, 31, G10, G11, G18, G38 and point 8a's Documents check;
    the PDF viewer if the founder approved pdf.js (a dependency added at this plan's founder step,
    alone). L-desktop and L-web, tests first by L-tests.
57. **W2-P9, Ask through the local helper.** Section 8. L-narration (`assistant/local_ask/`, its
    tests by L-tests in `tests/unit/assistant/test_local_ask.py`; done `bash -c 'uv run pytest
    tests/unit/assistant/test_local_ask.py -q && uv run mypy && uv run ruff check assistant'`),
    L-desktop (start, socket, bridge, the sample-only rule), L-web (the Ask box and answer shape).
58. **W2-P10, the loops that need P2's records, and goals.** L-content first for P9 to P12 (the STEM
    list, self-employment, O-1, replacement sources), then L-web for G9, G17, G20, G21, G23, and the
    trip preset of Try a change.
59. **W2-P11, cap-gap, its own designed plan.** From a full table of cases in specs/capgap-1 and
    D63 to D66 before any code: P8 and N6, parity with f1.py, then the USCIS status and Timeline
    rows (G12) and the petition preset.
60. **W2-P12, integration.** `tests/unit/acceptance/test_desktop_journeys.py` runs the journeys
    through api.desktop_main over a real socket with the token; the web acceptance suite runs on
    the merged branch; `make desktop-package desktop-verify` outside the jail; every screen
    rendered beside the prototype in light and dark, wide and narrow; review; audit; then the
    milestone after the W2-P6 and W2-P7 tests (point 65, D99): the founder lane checks it live,
    sends the push notification and the test guide.

## 12. For the founder

61. **Real documents on an ad-hoc build.** ARCHITECTURE 18 said Step W builds hold synthetic data
    only; D84 says Step W has real data entry and on-device documents. W2 follows D84. Decided:
    D85 allows real documents in test builds under the Mac login and the keychain key, and D99
    holds every build to made-up data until W1's packaged-app review and audit (SPEC-W1 point 29
    steps 5 to 7) pass (point 65). Said plainly
    in the guide: until documents-1, the documents are protected by this Mac's login and the
    Keychain, not by Touch ID; if the Keychain loses Duly's key (for example after a reset of the
    Mac's password) the copies cannot be opened, and there is no recovery kit yet. Duly never moves
    the originals.
62. **The documents lock and the PDF viewer.** (a) Ship W2 with documents under the keychain key
    only, and bring D58's Touch ID lock and the recovery kit with documents-1? Decided by D85: yes,
    with point 61 in the guide and the founder keeping the originals. (b) Still open: approve pdf.js
    (pdfjs-dist, exact version) for viewing PDFs inside Duly in a sandboxed window? Recommendation:
    yes; without it PDFs open only as a saved copy.
63. **Ask on the founder's own record.** D79 allows the helper to send the fictional sample's
    record only. May the founder, testing on their own record, turn on a setting that lets the
    helper send it through their own Claude Code login? Decided by D86: no, not in W2, and no such
    setting is built (point 35); Ask on the own record uses the on-device guides and the DSO draft
    until the private Bedrock service exists.
64. **School steps without typing.** BRIEF round 3 says school steps are never typed by hand: the
    student pastes the school's page link or drops its PDF. Reading a public page needs the network
    and a reader. Recommendation: in W2, a dropped PDF or a pasted page's text is read on the device
    by plain text matching into suggested steps the student confirms once; fetching a link waits
    for a decision on any network call from the app (D84 is local-only).
65. **How the founder tests (D99, amending D89's test point).** Every build holds made-up data
    only (the sample student of point 12, and made-up records the founder lane types) until W1's
    packaged-app review and audit (SPEC-W1 point 29 steps 5 to 7) pass; only then may the founder
    type their own record and add real documents (D85, point 61). The founder's next test is at
    the end of W2-P6 (Onboarding, Home and Plan); reminders follow at the end of W2-P7. Neither
    waits for the feed (D98). For each, the founder lane rechecks the saved sources and rebuilds
    (point 66) from the approved branch (`make desktop-python desktop-package desktop-verify`),
    checks every screen live beside the prototype, then sends the push notification and a short
    test guide: how to open it, what is new, about five concrete cases with what each should
    show, what is not done yet, and the register share met. Between tests, progress is reported
    in words. W2-P12's milestone (point 60) comes after both.
66. **No feed to host yet: a local recheck and a rebuild at least every 7 days (D98).** Nothing in
    W2 needs an account, a login, a sign-up or a payment. The feed's hosting (the duly-feed
    repository, feed.tryduly.co, the key ceremony, a CourtListener token) and the Apple developer
    account wait until the founder chooses otherwise; builds stay signed with the self-made
    certificate (D85). Until a feed exists, the founder lane rechecks the saved sources on this
    Mac (`uv run python -m tools.sources.recheck --fetch` on each pack, then `--check`), the
    content lane moves a rule's checked date only where a fresh fetch supports it and anything
    that changed waits for the founder, and the app is rebuilt at least every 7 days, so the
    bundled rules ("Rules checked", G37) are never left more than 7 days past their check. This
    recheck and the freshness plan that moves `checked_on` are part of the regroup round and may
    run before its re-audit; D100's gate holds W2-P5, not them (section 11). An
    update reaches the app only in a rebuild, from pipeline/published/ after the founder approves
    it (D95). With no feed, a build makes no feed request and Settings shows neither the daily
    check's switch nor its disclosure (SPEC-FEED point 20; point 32: no control that does
    nothing). A build left past 7 days shows the items whose rules went stale as waiting, never
    as settled (D97(3), SPEC-FEED point 64); SPEC-FEED section 13 says what happens on each date.

## Covers

The prototype's features (the gap map, 39 rows), BRIEF rounds 1 to 8 design rules, D59 as D97
amends it, D75, D79, D80 (recorded), D84's "real data entry and on-device documents", D85, D86,
D89's other categories (point 8a), D97's asks (points 4a, 4b, 10, 11a, 24a, N7, N8, K7), D32 in
W2-R1 (points 45, 52a), D98 and D99 (points 65, 66), D100 (section 11, point 52a), ARCHITECTURE
2.2 (PDF handling, renderer without keys), 2.5 (no interim database), 7.3 (no Anthropic code in a
public build).
Register rows touched include DOCS-001 to DOCS-013 (documents, versions), HOME, ONB, UPD, TIME,
SCEN-015 (travel checks), PLAN03-014 and PLAN03-096 (the bridge; the renderer never touches raw
stores), DEC-D54, DEC-D59 and DEC-D41, and since the regroup DEC-D85, DEC-D86 and DEC-D89. Every
plan's audit round reports the share met.

That was 5 of 2461 requirement rows named here when written. On 2026-10-03 the register holds 2524
rows, with decision rows up to D95 and 22 W2 rows from this SPEC, and none yet for D96 to D100,
specs/duly-2 or specs/ui-2; the next audit round adds them and recounts.

## Later

Reading documents on the device (D55, documents-1 section 4); the documents-1 vault (Touch ID,
recovery kit, envelopes); the event log (Phase 2); the Rust core (Phase 3); Ask on Bedrock with
D80's measures (Phase 8); USCIS case status online (BACKLOG B8); the one-page summary for Share;
Windows; phones.
