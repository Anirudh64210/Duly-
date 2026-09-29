# WorkBook: context prompt for the Duly build session

Paste everything below this line into the session.

---

WorkBook is a record-keeping feature inside Duly. It quietly builds a trustworthy, day-by-day record of a person's work from the tools they already use, and lets them turn that record into evidence when they need it. It will ship as a feature inside Duly and also as a standalone open-source tool. Treat everything here as settled design intent; final visual polish is done separately by the founder.

## 1. Who it is for and why it exists

The first users are international students and early-career workers in the US on F-1 OPT, STEM OPT, CPT, and later H-1B and O-1. Their status depends on proving that they are working, that the work is related to their degree, and that they meet hour thresholds (20 hours a week is the SEVP line for "full time" on post-completion OPT; 90 days of unemployment allowed on OPT, 150 with STEM OPT). Proof can be demanded at several points: a DSO review, an SEVP notice (in May 2025 SEVP gave OPT students with no reported employer 15 days before terminating their SEVIS records), an H-1B or green card filing years later, or a USCIS Request for Evidence. Since August 5, 2026 (USCIS Policy Alert PA-2026-05) a deficient filing can be denied without an RFE, and RFEs can carry shorter deadlines than the old 84 days. So the record has to exist before anyone asks.

Founders on OPT have the hardest case: self-employment is allowed on post-completion OPT if the business is licensed and related to the degree, but STEM OPT requires a bona fide employer-employee relationship, an E-Verify employer, and a supervisor who signs the I-983. WorkBook's setup adapts its rules and its document checklist to the user's exact situation.

The pain today: people keep folders of screenshots and hand-typed timesheets, fall behind, and end up with gaps. WorkBook removes the daily chore without making the record less credible.

## 2. Product principles (non-negotiable)

- Record keeping first, not an urgency tool. Calm, unobtrusive, no badges, no nagging. The RFE response is one option inside Exports, never the framing of the product.
- No screenshots, no screen recording. Evidence comes from timestamps that already exist in third-party tools, which are far harder to fake than self-taken screenshots.
- Local-first and private by default. All data lives on the user's device, encrypted, with keys in the OS keychain. OAuth tokens never leave the device. Metadata only (times, titles, links); message and document content is off unless the user turns it on per source.
- The user owns everything. Records are plain files in a folder the user can open without the app (one Markdown file per day, a CSV, their documents). Export all, delete all, at any time.
- Edit anything, never silently. Every entry, hour, note, and case detail is editable in place. Edits after a day is completed are kept as dated amendments with the original preserved. Nothing is ever overwritten; History shows every change.
- Minimal surface, full control underneath. Each screen shows one thing. Filters, options, and settings appear only when the user reaches for them. Apple HIG (clarity, deference, depth) and Dieter Rams ("as little design as possible") are the references.
- AI is a drafter, never an author of facts. It may only restate events it can point to, it never invents, it never writes legal argument or declarations, and every AI-drafted line stays marked (a small amber star) forever, including in exports. The user confirms every day. Willful misrepresentation to USCIS is permanent inadmissibility (8 USC 1182(a)(6)(C)(i)); the design exists to make that impossible by accident.
- Not legal advice. WorkBook organizes records. Cover letters and legal argument come from the user or their attorney.

## 3. Setup (onboarding)

Five steps, one screen each. Answers drive everything after.

1. Status: F-1 OPT, F-1 STEM OPT, F-1 CPT, H-1B, O-1, or No visa (people who just want proof of work).
2. Work: Employee (W-2), Contractor (1099), Founder, Unpaid. Plus job title, organization, start date. Warnings appear when the combination is a problem. Example: STEM OPT with Founder shows "STEM OPT needs a paid role with an E-Verify employer and a supervisor who signs your I-983. Self-employment, 1099 and unpaid roles don't qualify." CPT with Founder shows "CPT is authorized by your school for a specific employer and dates. Check with your DSO before counting founder work."
3. Hours and field: Under 20 h, 20 to 39 h, 40 h or more. Under 20 on OPT or STEM OPT shows "Under 20 hours a week doesn't count as OPT employment. Those days add to your unemployment count." Field: Software, Data and ML, Design, Research, Business and ops, Other. Degree. The field decides which sources are suggested.
4. Sources: suggested tools pre-selected for the field; the user toggles any. "Nothing connects until you sign in to each one on the next screen."
5. Your setup: a summary showing the weekly target, what else is watched (unemployment clock, I-983 evaluations), documents to keep, sources, where AI runs, and the folder path. Then "Start recording."

Everything from setup lives in "Your case" and can be edited with a pencil, or the setup can be re-run.

## 4. Data sources (read-only, metadata only)

Meetings: Google Calendar, Google Meet (actual join and leave times), Zoom, Outlook, Teams. Chat: Slack (also the optional daily post), Discord, Teams. Code: GitHub, GitLab, Bitbucket, local git repos (catches unpushed commits). Shipping: Vercel, Netlify, AWS, App Store Connect. Docs: Google Drive activity, Notion, Confluence, Dropbox, OneDrive. Tasks: Linear, Jira, Asana, Trello, ClickUp. Design: Figma, Canva. Business ops: Stripe, QuickBooks, business bank account, DocuSign. Local, opt-in: editor activity via a VS Code plugin, active app time.

Constraint: Gmail's metadata and readonly scopes are Google "restricted" scopes and require app verification plus a security assessment for any app whose data passes through a server. Gmail is out of v1. Start with Google Calendar, Google Meet, GitHub, Slack.

Pipeline: Connect (OAuth, read-only) then Collect (normalize every event into one local encrypted store, keep the source link) then Build blocks (group nearby events into work blocks with start and end; meetings keep calendar times; check-in and check-out bound the day) then Map duties (local AI drafts a one-line "work performed" and tags one declared duty; low confidence is left untagged) then Confirm (user marks the day complete) then Seal (SHA-256 of each entry, a daily Merkle root, optional OpenTimestamps anchor; only a hash ever leaves the device).

AI options: Apple's on-device Foundation Models on macOS (default), any local model through Ollama, or a cloud model with the user's own key, used only for monthly narratives if the user chooses.

## 5. Screens (approved prototype, v7)

Sidebar: Today, Log, Documents, Exports, then Your case. At the bottom: recording status with Pause, and Feedback (Request a tool, Problem, Idea; "Sent without any of your records").

Today. Heading is the date. One line under it: "6.2 hours so far." Top right: "12.6 of 20 hours this week" above a progress bar. A list of the day's blocks: time range, what was done (amber star if AI-drafted), hours, a pencil. Click the text to reveal sources ("From GitHub", "From Calendar") and a note if AI wrote it or the user edited it. Pencil opens inline editing: the pencil's spot becomes an X (cancel) so a second click in the same place closes it; a red-outlined bin sits to the left of Save, never under the cursor. "+ Add entry" at the bottom. "Mark day complete" bottom right; after that, "Day complete. You can still edit."

Log. One row per calendar day, newest first, under month headers with the month's hours. Every day appears, including days with no work, which show "No work" or the user's note ("Day off", "Sick", "Travel"). Open a day to see entries, edit them, add an entry to that day (time, text, hours), or add a note. Top right: a search box and one filter icon. The filter popover has Dates (This week, This month, Last month, Everything, or From and To), From these tools (multi-select chips), and Show (Everything, Written by AI, Edited, Added by me), with a live entry count. Active filters appear as removable chips. "History" at the bottom opens the full record of every change (completed days, edits with before and after, documents opened or removed, exports, settings changes) with a "Check nothing changed" integrity button.

Documents. Locked by default: names blurred behind a lock icon, one Unlock button (passphrase or Touch ID), auto-locks after 5 minutes. Unlocked: click a name to open, red Remove with inline confirm, Lock, Add (file picker), and a drop zone ("Drop files here, or click to choose. Encrypted before it is saved. Any file type."). Privacy is a small button that reveals switches: blur names while locked, ask before exporting documents, keep a record of every time a document is opened, notify when opened, lock-after timer. Encryption is always on.

Exports. Step 1, Build: two choices, Everything (all entries, sources, documents since the start date) or Custom (dates via presets or a range, sources as chips, documents as chips). A drop zone for extra files (a pay stub, a letter, a screenshot). Step 2, Preview: the pack as a numbered list with page counts (summary, timesheet, source records, each document, extras, and a method note stating which entries were AI-drafted and that all were reviewed by the user), plus the first timesheet rows. Toggle chips: note AI-drafted entries, hide other people's names, include edit history. Step 3, Send as: Zip, Folder, or Link. Link asks who can open it (only people I add, by email, who sign in to open; or anyone with the link) and an expiry. Links can be revoked. Past exports listed under "Made before." One quiet line at the bottom: "Received a Request for Evidence? Build a response."

RFE response builder (not yet designed; must follow this order): the RFE notice on top (all pages), the user's or attorney's cover letter, a one-page exhibit index, then numbered exhibits in the same order as the requests in the notice, continuous page numbers, English only, clean text layer. One complete response, sent once; a missing document is explained, not omitted. A consistency check across job title, dates, and employer against every document and the SEVP report.

Your case. Status and dates, role, work type, weekly target, degree, duties, each with a pencil. Source switches. Privacy switches: AI summaries on this device, read message content. "Run setup again."

Not yet designed: the menu bar popover (hours since check-in, today's blocks, Pause, Open) and the optional daily Slack post of the confirmed day, which doubles as third-party corroboration.

## 6. Integration with Duly

- WorkBook exposes its local store through a clean, versioned API so Duly can read the day record, the case profile, and export packs without touching the encryption or the file layout.
- Duly must respect the same rules: no screen capture, metadata only, user confirms before anything is treated as a record, AI-drafted lines stay marked, nothing overwritten.
- Multiple roles per user (an NGO job plus a startup) is planned; the case profile is a list, not a single object.
- Supervisor view (read-only link for STEM OPT I-983 evaluations) is a later addition and reuses the export link mechanism.
- Duly's document vault and WorkBook's Documents are the same store: status documents (I-20s, EAD, SEVP report) are Duly's, work documents (offer letter, EIN letter, I-983) are shared.

## 7. Open build decisions

- Platform for v0: native macOS (Swift, on-device Foundation Models) or cross-platform (Tauri and Rust with Ollama).
- Whether check-in and check-out stay as a manual anchor or the day is derived purely from events.
- Whether amendments always require a reason.
