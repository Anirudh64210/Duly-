# Design principles

These are the rules every WorkBook screen follows. Each one came from a specific correction during design; the reasoning is kept so the next person does not undo it by accident.

## 1. One thing per screen

A screen shows the thing it is named for and nothing else. Today shows today's entries. Log shows days. Documents shows documents. Anything secondary (filters, options, settings, privacy) is behind a single small control and appears only when the user reaches for it.

Why: an early version put filter chips on every page. The founder's reaction: "just because I said it lacks filters, you added filters for each and every page." Autonomy means the control exists, not that it is on screen.

## 2. Minimum labels, maximum value

No subheadings, no eyebrow labels, no explanatory grey text under things that explain themselves. A title, the content, one line of context if it earns its place. Text is 15 to 17 px for content, never 11 to 12 px captions stacked under every row.

Why: small grey subtext everywhere reads as generated filler. Founder: "the more minimal text there is the easier to understand it is."

## 3. Edit in place, with a pencil

Every editable value has a pencil beside it. Clicking it turns that row into inputs with Save. Escape or the X cancels. There is no separate edit mode, no modal, no "edit page."

The pencil's spot becomes the X (cancel) when editing opens. The cursor is still there from the click, so a second click must be harmless. Destructive actions (the bin) are never placed where the cursor was.

Why: an early version put Delete directly under the pencil, prompting misclicks. Fixed twice; the rule is now explicit.

## 4. Nothing is ever lost

Edits create amendments. Deletes keep a copy. Every change is a line in History with before and after. The user can always see what the record looked like at any point.

Why: the record's credibility depends on it. Silent edits would make the whole thing worthless as evidence.

## 5. Provenance on every line

Every entry shows where it came from when you click it: "From GitHub", "From Calendar", "Added by you". AI-drafted lines carry a small amber star. Once the user edits an AI line, the star goes away and "Edited by you" appears. The star survives into every export via the method note.

Why: honesty with USCIS, and honesty with the user about what the app did.

## 6. Calm

No red badges, no counters in the sidebar, no "3 blocks need review." The only feedback is a short confirmation after an action (a toast). Progress toward the weekly target is one bar and one line of text.

Why: founder: "it looks like an urgency tool meant to package everything up for RFE, tone it down, tune it to record keeping."

## 7. Two choices, not three

Where a choice has to be made (export type, delivery), offer two, or at most three obviously distinct options. Sub-options appear only after the choice.

Why: a three-card export (Timesheet, Full record, Choose) was called "really bad, hard to use, confusing." Two (Everything, Custom) was approved.

## 8. Locked means locked, but not hidden

Documents in the locked state are visible as a list with names blurred and a lock icon. The user can see that things exist and how many, without seeing what they are. One Unlock button.

Why: full hiding feels broken; full visibility defeats the lock.

## 9. Drop zones and buttons both

Anywhere files go in (Documents, Export extras), there is a drop zone and a conventional Add button. Never one without the other.

## 10. Copy rules

- Plain sentences. "Nothing was recorded." not "No activity detected."
- Buttons name the outcome: "Mark day complete", "Create link", "Save zip".
- No em dashes or en dashes anywhere in the product.
- No emoji.
- Never say "AI-generated"; say "Written by AI" and mark it.
- Never say "sealed" or "cryptographic"; say "saved with a timestamp" and "check nothing changed."

## Visual system (for the founder's polish pass; not final)

- Type: IBM Plex Sans for UI, IBM Plex Mono for times, hours, hashes.
- Ground: white #FFFFFF; sidebar #F6F7F6; hairlines #ECEFED and #E1E5E2.
- Ink: #141816; secondary #56605B; tertiary #7A827E.
- Accent: green #1B7A57 for recording, progress, links, confirmations.
- AI mark: amber #C08A2E.
- Destructive: #A1271E with pale border #F0D4D2.
- Radii: 9 to 14 px. Buttons 40 to 48 px tall. Touch targets 34 px minimum.
