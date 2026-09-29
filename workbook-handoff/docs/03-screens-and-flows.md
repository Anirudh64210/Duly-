# Screens and flows (approved v7)

Source of truth is `prototype/workbook-v7.dc.html`. This document describes every state so it can be built without reading the markup.

## Frame

1280 x 840 desktop window. Left sidebar 232 px, background #F6F7F6. Main area padded 36 px top, 52 px sides.

Sidebar, top to bottom:
- "WorkBook" wordmark
- Today, Log, Documents, Exports (Log is also active when History is open)
- divider
- Your case
- (push to bottom) recording status: green dot "Recording" with "Pause" link; when paused, grey dot "Paused" with "Resume". Toast on change: "Paused" or "Recording again".
- Feedback: opens a popover anchored above it. Title "Tell us". Three chips: Request a tool, Problem, Idea. Textarea with a placeholder that changes per chip ("Which tool should we pull from? Jira, Zoom, Figma...", "What went wrong?", "What would make this better?"). Footer: "Sent without any of your records." Cancel and Send. Toast: "Thanks, sent."

Toasts: one at a time, bottom center of the main area, dark pill, 2.4 s.

## Today

Header: "Tuesday, October 6" (the real date), under it "6.2 hours so far" (sum of today's entries, live). Top right: "12.6 of 20 hours this week" over a 200 px progress bar (week = Monday to today).

Entry list, one row per block, separated by hairlines:
- Column 1 (140 px): time range in mono, "09:02  10:00", two spaces between; "14:40  now" for the running block in green.
- Column 2: entry text as a button; clicking toggles the detail below. Amber star after the text when AI-drafted.
- Column 3 (60 px): hours, mono, right aligned.
- Column 4 (34 px): pencil.

Detail (open state, indented under the text): one line per source ("From GitHub", "From Calendar", "From Meet", "Added by you"), then if AI: "Written by AI from these events. Edit it to put it in your words." If edited: "Edited by you. The original is kept in History."

Editing state (same row): time (read only), text input, hours input, then bin (red outline, 40 px), Save (primary), X (in the pencil's column, cancels). Enter saves, Escape cancels. On save: if text or hours changed, entry loses its AI flag, gains edited flag, a History line is written ("Entry edited", before, after). Toast "Saved. The original is kept in History." If nothing changed: "No changes". On bin: entry removed, History line "Entry deleted" with the text, toast "Deleted. A copy stays in History."

Add: "+ Add entry" link at the bottom of the list. Opens a row: time "17:00", text input with placeholder "What did you work on?", hours input, Add and Cancel. Enter adds. Source is "Added by you". History line "Entry added, 2026-10-06".

Footer right: "Mark day complete" primary button. After: green check "Day complete. You can still edit." History line "Day completed, Tue Oct 6, 5 entries, 6.2 hours". Toast "Saved".

## Log

Header: "Log". Right: search box (filters entry text live) and a filter icon button.

Active filter chips appear left of the search box, dark, each "label  x", click removes that one filter.

Filter popover (380 px, anchored under the icon):
- "Dates": chips This week, This month, Last month, Everything; then From and To inputs (YYYY-MM-DD). Typing a date clears the chip selection.
- "From these tools": chips GitHub, Calendar, Meet, Slack, Notion, Linear, Added by me. Multi-select.
- "Show": chips Everything, Written by AI, Edited, Added by me. Single-select.
- Footer: live count "14 entries", Clear, Done.

List: month sections. Section header: "October 2026" left, "21.0 h" right. Under it one row per calendar day from today back to the earliest record (currently 2026-09-22), newest first:
- Day label "Tue, Oct 6"; grey if the day has no entries.
- Preview: first two entry texts joined with a comma, "and N more" if longer. Today prefixed "Still open." until complete. Empty days show the day note ("Day off") or "No work".
- Hours, mono, blank for empty days.
- Chevron.

Days with zero matching entries are hidden only when a text, tool, or Show filter is active. With no filter, every day shows.

Open day: entries indented, each with time, text (star, "edited" tag), hours, pencil. Same inline edit as Today (without the bin). Empty days show "Nothing was recorded." plus "Add a note" (or the note plus "Change"); note editing is an input with placeholder "Day off, sick, travel..." and Save. Every open day ends with a green "+ Add entry" that opens a row with time (placeholder 09:00), text, hours, Add, Cancel, and adds to that specific date.

Footer: "Every change ever made is kept." left, "History" link right.

## History

Back arrow, "History", right: "Check nothing changed" button; after clicking, "N items checked" appears beside it and toast "Nothing has changed since it was saved".

List: one row per event, newest first: timestamp (mono, "Oct 6, 14:31"), title, chevron. Open: detail line, and when there is a before and after, the old text struck through above the new text.

Event titles used: "Day completed, Mon Oct 5", "Entry edited", "Entry added, 2026-10-04", "Entry deleted", "Note added for 2026-10-03", "EAD card opened", "Documents unlocked", "N documents added", "X removed", "Weekly target changed", "Duty changed", "Full record, 2026-06-01 to 2026-10-06 exported", "Link revoked".

## Documents

Locked (default): header "Documents" with one primary "Unlock" button. List: each row shows a lock icon, the name blurred (CSS blur, unselectable), and the added date. Drop zone at the bottom stays usable.

Unlock: clicking Unlock reveals a grey row: passphrase input, "Unlock" primary, "Touch ID" secondary, "Locks again after 5 minutes." Enter or either button unlocks. History line "Documents unlocked". Toast "Unlocked for 5 minutes".

Unlocked: header buttons Privacy (quiet), Lock, Add (primary, with plus icon, opens file picker). Rows: name as a button (opens; History line "X opened" if that privacy switch is on), added date, red-outlined "Remove". Remove shows inline "Remove? Yes No". Yes removes, History line "X removed, Deleted from this Mac", toast "Removed". Lock returns to the locked state, toast "Locked".

Privacy (revealed): two-column grid of switches: Blur names while locked, Ask before exporting documents, Keep a record of every time a document is opened, Notify me when a document is opened; a "Lock after" select (1 minute, 5 minutes, 15 minutes, When I quit); "Encrypted on this Mac: Always".

Drop zone: dashed box, "Drop files here, or click to choose" and "Encrypted before it is saved. Any file type." Highlights green on drag. Dropped or picked files are added with date "Today", History line "N documents added", toast "Added and encrypted".

Default document list for an OPT founder: EAD card, I-20 with OPT recommendation, SEVP portal employer report, Articles of incorporation, EIN confirmation letter, Role description, Bank statement (September).

## Exports

Three steps. Header shows "Exports", then "Preview" (Step 2 of 3), then "Send as" (Step 3 of 3), with a back arrow on steps 2 and 3.

Step 1, Build:
- Two cards: "Everything: All entries, sources and documents since Jun 1" and "Custom: Pick dates, sources and documents". Everything is the default and sets the range to the start date through today.
- Custom reveals a grey panel: Dates (chips This month, Last month, Last 3 months, Since Jun 1, plus From and To inputs), Sources (all chips on by default, toggle off), Documents (all chips on by default, toggle off).
- Drop zone: "Drop anything else to include, or click to choose. A pay stub, a letter, a screenshot." Files show as chips with an x.
- "Preview" primary button with a live summary: "128 days, 118.4 hours, 7 documents, 1 extra". If documents are included and locked and the privacy switch is on: "Documents are locked, so you will be asked to unlock."
- Below: "Made before" list (timestamp, name, Open, and Revoke for links), and the quiet RFE line: "Received a Request for Evidence?" with "Build a response".

Step 2, Preview:
- Pack box: title row with pack name and total pages, then numbered items with page counts: 1 Summary: role, dates, weekly hours (1 p); 2 Timesheet, N entries; 3 Source records: GitHub, Calendar, ...; then each document (1 p); each extra (1 p); Method note: which entries were drafted by AI, all reviewed by you (1 p).
- "Timesheet, first rows" box with the first four rows.
- Toggle chips: Note which entries were written by AI (on), Hide other people's names (on), Include edit history (off).
- "Export" primary, "Change" secondary (back to step 1).

Step 3, Send as:
- Three cards: Zip file (One file to attach or upload), Folder (Plain files on this Mac), Link (Opens in a browser, read-only).
- Link reveals: "Who can open it": chips Only people I add (default) or Anyone with the link. For people: email input with Add, chips for added emails, "They sign in with that email to open it. You can revoke any time." "Link expires" select: In 30 days, In 7 days, Never.
- Button: "Save zip", "Save folder", or "Create link", with the pack name beside it. On success: added to "Made before" (links show "link for 2 people" or "open link"), History line, toast ("Zip saved to ~/WorkBook/exports", "Link copied. Revoke it any time."), back to step 1.

## Your case

Header "Your case", right link "Run setup again" (goes to the setup flow). Two columns.

Left, each with a pencil and inline edit: Status ("F-1 OPT, Jun 1, 2026 to May 31, 2027"), Role ("Founding Engineer, Example Co"), Work type ("Founder, self-employed"), Weekly target ("20 hours a week"), Degree ("M.Eng, Computer Science"), Duty x4 ("Build backend services", "Write product specs", "Customer research", "Coordinate engineering"). Saving a changed value writes a History line with before and after.

Right, switches: GitHub, Calendar and Meet, Slack, Linear and Notion, Figma (off), AI summaries on this device, Read message content (off).

## Setup (separate prototype)

See `prototype/setup-onboarding.dc.html`. Five steps with a left rail showing progress. Options are large cards. Warnings are amber panels. The last step is a two-column summary and "Start recording."
