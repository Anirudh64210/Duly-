# Step W2: the real product inside the window

Status: draft for the founder, 2026-10-01. Written by the founder lane from DECISIONS.md D59, D75,
D79 to D84, specs/ui-2/BRIEF.md (rounds 1 to 8), the approved prototype in specs/ui-2/prototype,
specs/duly-2/ARCHITECTURE.md and BLUEPRINT.md, specs/documents-1/SPEC.md, and the code on branch
`founder`. Builds on SPEC-W1 (the installed window and the engine over a private socket).

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
  what this means and asks the founder, point 62).
- Not the event log or the Rust core (ARCHITECTURE 18 Phases 2 and 3). The case stays in case.bin
  (ARCHITECTURE 2.5: no interim database), with the app's own state in a sibling encrypted file.
- Not Ask in production. Ask runs through the prototype's local helper, for the sample student
  only unless the founder decides otherwise (point 63). D80's measures are written down for later.
- Not cap-gap in the first milestone: it has its own designed plan (RUNBOOK: an area that failed
  review twice).

## Decisions this serves

D59 (typed dates: ask once, check against the document, else cannot_tell). D75 (the Loop is the
single building block; planned is not done; no dead ends). D79 and D80 (Ask: Claude through
Bedrock in production with the privacy measures; locally, a helper for the sample student). D81 to
D84 (Step W, Python engine bundled, Electron, local-only and open source). D53 and D56 (the canvas
and the plain words win), D57 (the DSO email in the student's voice), D72 (Try a change lives on
the card it touches), D73 (reminders computed on the device), D74 (passport, visa and address
records with their sourced rules, a change that lands first).

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
9. **Answers become a real case.** Each answer writes records of the kinds the F-1 pack declares
   (program, authorization, employer, work), with `categories`, `time_zone` (the Mac's time zone name,
   read in main; a name, not a date, so the engine still decides which day is today, D33) and `complete`
   statements (D41). The case is saved through the existing `window.duly.case.write` into case.bin
   (safeStorage), after every answer, and read back at launch.
   - Checked by: web tests (the case built for each onboarding path validates against
     case.schema.json with the same checker the desktop uses); a desktop test that write then read
     returns the same case; the acceptance journeys (point 53).
10. **D59 still applies to every typed date.** Duly asks once whether the dates came from the
    student's documents, then has the student check each against its document. The questions are
    the engine's own (`typed_dates.from_documents`, `typed_dates.checked.<fact>`); answers are
    saved as `confirmations` in the case. Until checked, the engine's verdict is cannot_tell and
    the screen says what would settle it, in plain words ("Check your EAD dates against the card"),
    never "Can't tell yet" as a headline (BRIEF).
    - Checked by: an acceptance test: an unconfirmed onboarding case gives the engine's questions
      and the screen shows each as one plain line with its place to answer; after the answers, the
      engine's verdict changes and the screen follows it.
11. **Inference instead of questions**, only where the record already holds the answer and only
    through the engine or a saved source: no "still in school" after an end date; conferral asked
    once; STEM suggested from the major only after the DHS STEM list is saved (gap map G23).
    - Checked by: web tests that onboarding never shows the removed questions.
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
    moved or deleted, and Duly says so once.
    - Checked by: desktop tests (atomic write; a bad index is refused and kept, never deleted).
17. **Versions and nothing lost.** A reissued I-20 is a new document that `replaces` the old one;
    the chain is its versions, newest first. Remove moves to Removed, Put back returns it, Delete
    for good destroys F and the file. "Delete everything on this Mac" (Settings, Your data) deletes
    files/, documents.bin, keys.bin, case.bin and state.bin after an inline confirm.
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
    lost-document, crisis, notice, checkin, report-owed, with their shared step-back steps), and
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
      check-ins set the can't-tell flag while deadlines survive; at most the weekly budget of
      check-ins; stem-filing's approval spawns one report-owed loop per report window in the
      engine output; lost-document shows the saved copy first; crisis writes nothing to history
      and shows no date.
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
    on this Mac" or "Reminders are off here. Add to calendar"), never a template.
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
    case and adds the D59 check for each date.
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
35. **The sample student only, by default** (D79 allows the helper to send the fictional sample's
    record, not a real student's). While the student's own case is loaded, Ask matches questions
    to guides on the device (the Loop module's `match`: crisis first, then playbook phrases) and
    otherwise drafts the DSO question; nothing leaves the Mac. Point 71 asks the founder whether the
    founder's own record may go through the helper during testing.
    - Checked by: a desktop test that the ask bridge refuses to start the helper while the own-case
      slot is active, unless the founder's setting of point 63 exists.
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
| G4 | Greeting status word and where you stand | E | `stages[].state == "current"` for the status word; `verdict.state`, `verdict.reasons`, `questions[]` |
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
| G22 | Onboarding with the D59 checks and the D41 lists | E | `questions[]` ids `typed_dates.from_documents`, `typed_dates.checked.<fact>`, `complete.<kind>`; `answers_read` |
| G23 | "This looks like a STEM degree" from the major | C | P9: the DHS STEM Designated Degree Program List saved as a source, and a lookup from the CIP code |
| G24 | Work page: jobs, hours, add a job, change hours | E | Records written by the screen; counts from G1, report lines from G6 and G7 |
| G25 | USCIS status, by hand, with Track another case | U | State only. The prototype's processing times are dropped (no saved source); its next-check date comes from the scheduler (G32) |
| G26 | Updates as articles with "For you" | C | K5 (article paragraphs and an `affects` selector in update.schema.json), published updates passing `publish_blockers` (L-pipeline), A2 (local `GET /v1/updates`); "For you" matches the selector against the engine's `stages[]` on the device |
| G27 | Settings panels | U | Reminders settings feed the scheduler; delete everything uses the bridges |
| G28 | Ask: the advisor answer, the conversation kept | U | The local helper (section 8); its facts come from the engine output |
| G29 | DSO email drafts in the student's voice | U | Templates over typed facts; no computed date stated as the student's own (D57) |
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

**Counts: 39 rows. 13 computed by the engine today (G1 to G4, G6, G14, G22, G24, G30, G34 to G37);
16 need an engine, rule pack or contract change first (G5, G7 to G10, G12, G13, G15 to G18, G20,
G21, G23, G26, G32); 10 are UI only (G11, G19, G25, G27 to G29, G31, G33, G38, G39).** The
features named for this map take 19 of the rows (the big numbers are three rows, reports owed and
goals two each): 4 computed today (G1, G2, G3, G6), 2 UI only (G11 share, G19 school steps) and 13
needing a change first (G5, G7 to G10, G12, G13, G15 to G18, G20, G21).

## 10. The changes that land first

Contracts land first and alone, in one founder commit (W2-P0). Then pack and engine changes, each
with tests first. Codes as used in the gap map.

**Contracts (founder lane, W2-P0):**
39. K1, `contracts/product_settings.yaml`: `checkin.job_days` (30, the prototype's), `checkin.
    petition_days` (30, D66), `loop.deadline_lead_days` (3), `loop.checkin_days` (14),
    `loop.weekly_budget` (3), `loop.backoff_after` (3), `loop.dso_reply_business_days` (5),
    `travel.first_ask_days` (21), `travel.last_ask_days` (2), `plan.prepare_months` (1),
    `watch.close_days` (30). Each is a product setting, never a rule, and says so.
40. K2, `contracts/engine_output.schema.json`: optional `checkins[]` (`record`, `kind`,
    `confirmed_on`, `due`, `due_days_away`, `question`); optional `watch[]` (`id`, `label`,
    `date`, `days_away`, `close`, `record`, `rule_ids`, `status`); an optional `planning: true` on
    a window or item set from a product setting, not a rule; an optional `as_of` on a computed
    count.
41. K3, `contracts/schedule.schema.json` and `POST /v1/schedule` in openapi.yaml: requests
    `{id, from: {item} | {date} | {today}, add: {days} | {business_days} | {months} |
    {setting}, sign, cap: {item}?}` in; out `{today, dates: [{id, date, days_away}]}`, each answer
    optionally carrying `missing`, `capped`, `planning` (only when a setting set it), `rule_ids`
    and `inputs` (as built in W2-P0). No other route changes.
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

**Rule pack (L-content, every rule from a saved primary source with its quote, never a number
written by hand):**
45. P1 last-day windows; P2 prepare windows (with K6, N1); P3 report windows on a job's start and
    an hours change; P4 passport, visa and address records with 8 CFR 214.2(f)(17) and
    (f)(12)(ii)(A) (D74); P5 trip windows; P6 the dates to watch; P7 `confirmed_on` fields; P8 the
    cap-gap stage; P9 the DHS STEM list as a saved source; P10 self-employment on OPT and STEM OPT;
    P11 O-1 rules in rulepacks/o1-us; P12 document replacement sources. A rule with no saved source
    is reported missing, and its feature waits.

**Engine (L-engine):**
46. N1 windows from a product setting, marked planning; N2 the limit day of a counter (the day the
    count would reach its limit if nothing in the record changes, an item `<counter>.<key>.
    limit_day`, with words that never say what follows that day); N3 check-ins and `as_of`; N4
    `watch[]`; N5 `engine/schedule.py`, a pure function over a Clock, the pack's calendar (business
    days with the federal holidays the engine already counts out) and the settings; N6 cap-gap in
    the path engine, matching f1.py on the cases of specs/capgap-1.

**Local routes (L-api):**
47. A1 `POST /v1/schedule` in api/local_routes.py, served by api/desktop_main.py and api/main.py;
    A2 `GET /v1/updates` (declared in openapi.yaml, not built) in local_routes, reading the
    published updates bundled with the app (W1's allowlist gains `pipeline/published/*.json`).

## 11. The plans, in order

Each plan is one factory run: a `goal`, lanes with their paths, tests first, a build held to its
own tests plus the journeys, a reconcile round, a review and an audit (RUNBOOK). Done commands are
written here as the plan files will hold them. Plans P4 and P5 may run beside P1 to P3; the rest
in order.

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
      `pipeline/published/`, each passing `publish_blockers` (primary source, quote found, two
      checks, the founder's approval recorded). Done: `bash -c 'uv run pytest tests/unit/pipeline
      -q'`.
52. **W2-P4, the desktop bridges** (may run beside P1 to P3). Engine bridge, state store,
    documents store, notifications, the CSP change.
    - L-tests: `tests/desktop/bridges.test.ts`, `tests/desktop/documents.test.ts` (sections 4 and
      5, every refusal, the chunk faults, the crash between steps). Done: `bash -c 'npx tsc
      --noEmit -p tests/desktop && npx eslint tests/desktop --max-warnings 0'`.
    - L-desktop. Done: `bash -c 'npm run typecheck -w desktop && npm test -w desktop && npx eslint
      desktop --max-warnings 0 && npx prettier --check "desktop/**/*.{ts,json}" && uv run python
      -m tools.copy_lint.lint'`.
    - L-security: the threat-model rows for documents under the keychain key alone.
53. **W2-P5, the web foundation.** The new shell and router, tokens and motion from the
    prototype, format.ts, the engine client over the bridge, the case and state stores, the sample
    student, the Loop module and every playbook. The old UI removed.
    - L-tests: `tests/web/loops/*.test.ts` (point 20), `tests/web/format.test.ts`,
      `tests/unit/tools/test_web_no_date_math.py`, and `tests/web/acceptance/` with the sample
      student and the twenty journeys' engine outputs (each shown number equals its named field).
      Done: `bash -c 'npx tsc --noEmit -p tests/web && npx eslint tests/web --max-warnings 0 && uv
      run pytest tests/unit/tools/test_web_no_date_math.py --co -q >/dev/null'`.
    - L-web. Done: `bash -c 'npm run typecheck -w web && npm test -w web && npm run build -w web
      && npx eslint web --max-warnings 0 && npx prettier --check
      "web/**/*.{ts,tsx,css,html,json}" && uv run python -m tools.copy_lint.lint && uv run pytest
      tests/unit/tools/test_web_no_date_math.py -q'` (web's vitest runs tests/web through its
      include).
54. **W2-P6, Onboarding, Home and Plan.** Sections 3 and 7 points 23 to 25, with G1 to G6, G13,
    G14, G16, G19, G22, G37 live. L-tests writes the acceptance tests first
    (`tests/web/acceptance/home.test.tsx`, `plan.test.tsx`, `onboarding.test.tsx`, by
    `data-landmark` names this SPEC fixes: `home-numbers`, `home-plan`, `plan-strip`,
    `plan-checklist`, `onboarding-step`); L-web builds; the same done commands as P5. Outside the
    jail the founder lane runs `make design-shots` and compares with the prototype before review.
55. **W2-P7, Work, USCIS status, Updates, Settings.** G8, G15, G24 to G27, G29, G32 live.
    Same shape.
56. **W2-P8, Documents.** Points 27, 28, 31, G10, G11, G18, G38; the PDF viewer if the founder
    approved pdf.js (a dependency added at this plan's founder step, alone). L-desktop and L-web,
    tests first by L-tests.
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
    milestone: the founder lane checks it live, sends the push notification and the test guide.

## 12. For the founder

61. **Real documents on an ad-hoc build.** ARCHITECTURE 18 said Step W builds hold synthetic data
    only; D84 says Step W has real data entry and on-device documents. W2 follows D84. Said plainly
    in the guide: until documents-1, the documents are protected by this Mac's login and the
    Keychain, not by Touch ID; if the Keychain loses Duly's key (for example after a reset of the
    Mac's password) the copies cannot be opened, and there is no recovery kit yet. Duly never moves
    the originals.
62. **The documents lock and the PDF viewer.** (a) Ship W2 with documents under the keychain key
    only, and bring D58's Touch ID lock and the recovery kit with documents-1? Recommendation: yes,
    with point 61 in the guide and the founder keeping the originals. (b) Approve pdf.js
    (pdfjs-dist, exact version) for viewing PDFs inside Duly in a sandboxed window? Recommendation:
    yes; without it PDFs open only as a saved copy.
63. **Ask on the founder's own record.** D79 allows the helper to send the fictional sample's
    record only. May the founder, testing on their own record, turn on a setting that lets the
    helper send it through their own Claude Code login? Recommendation: no for W2; Ask on the own
    record uses the on-device guides and the DSO draft until the Bedrock service exists.
64. **School steps without typing.** BRIEF round 3 says school steps are never typed by hand: the
    student pastes the school's page link or drops its PDF. Reading a public page needs the network
    and a reader. Recommendation: in W2, a dropped PDF or a pasted page's text is read on the device
    by plain text matching into suggested steps the student confirms once; fetching a link waits
    for a decision on any network call from the app (D84 is local-only).

## Covers

The prototype's features (the gap map, 39 rows), BRIEF rounds 1 to 8 design rules, D59, D75, D79,
D80 (recorded), D84's "real data entry and on-device documents", ARCHITECTURE 2.2 (PDF handling,
renderer without keys), 2.5 (no interim database), 7.3 (no Anthropic code in a public build).
Register rows touched include DOCS-001 to DOCS-013 (documents, versions), HOME, ONB, UPD, TIME,
SCEN-015 (travel checks), PLAN03-014 and PLAN03-096 (the bridge; the renderer never touches raw
stores), DEC-D54, DEC-D59 and DEC-D41. The register has no rows yet for D63 to D84, specs/duly-2 and
specs/ui-2; W2-P0's audit step adds them, and every plan's audit round reports the share met.

That is 5 of 2461 requirement rows named here; the audit round adds rows for D63 to D86 and recounts.

## Later

Reading documents on the device (D55, documents-1 section 4); the documents-1 vault (Touch ID,
recovery kit, envelopes); the event log (Phase 2); the Rust core (Phase 3); Ask on Bedrock with
D80's measures (Phase 8); USCIS case status online (BACKLOG B8); the one-page summary for Share;
Windows; phones.
