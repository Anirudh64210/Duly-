# Duly: the approved canvas

Source: the design canvas "Duly, App Concept" (its exact title on the canvas uses a dash) (artifact RM8zfobH7Sahue7jeUEi4a, version 1790681983-1782, last updated 2026-09-28). This folder is a verbatim copy of its nine artboards plus the canvas index. Nothing has been edited.

## The nine screens

| # | File | Title on the canvas | Size | Sidebar label |
|---|------|---------------------|------|---------------|
| 1 | `screens/Main.dc.html` | Home | 1280 x 832 | Home |
| 2 | `screens/Timeline.dc.html` | Timeline | 1280 x 832 | Timeline |
| 3 | `screens/Documents.dc.html` | Documents | 1280 x 832 | Documents |
| 4 | `screens/Checklist.dc.html` | Checklist | 1280 x 832 | Checklists |
| 5 | `screens/Updates.dc.html` | Updates | 1280 x 832 | Updates |
| 6 | `screens/WorkBook.dc.html` | WorkBook | 1280 x 832 | WorkBook |
| 7 | `screens/Phone.dc.html` | Mobile home | 390 x 844 | (mobile) |
| 8 | `screens/Simulator.dc.html` | Scenarios | 1280 x 832 | Scenarios |
| 9 | `screens/Onboarding.dc.html` | Onboarding | 1280 x 832 | (before the app) |

The canvas groups them under three titles: "The case: status, journey, documents" (Home, Timeline, Documents), "Assist and record: checklists, updates, WorkBook" (Checklist, Updates, WorkBook), and "Mobile, Scenarios, Onboarding".

## Why the plan says "nine plus Case, Settings, Feedback"

Every desktop screen's sidebar lists Home, Timeline, Documents, Checklists, Scenarios, Updates, WorkBook, then Your case, Settings, Feedback. The first seven link to real artboards. Your case, Settings and Feedback link to `#case`, `#settings`, `#feedback`: placeholders. They were never designed on this canvas. Billing is not mentioned anywhere on the canvas. So the plan's "nine approved canvas screens plus Case, Settings, Feedback, Billing placeholder" means: build these nine as designed, and design the other four yourself following the same system.

Note for WorkBook: `screens/WorkBook.dc.html` is a one-screen concept of WorkBook inside Duly. The full WorkBook design (Today, Log, History, Documents, Exports, Your case, setup) is in the separate `workbook-handoff` package and is the source of truth for that feature. Where the two differ, the handoff package wins on behavior; this canvas wins on colors and type.

## Design tokens (as used in the files)

- Background: `#F8F7F4` (off-white)
- Ink: `#1A1917`; secondary `#6B6862` and `#4A4844`; tertiary `#8A8780`; faint `#B0ACA3`
- Hairlines: `#ECEAE4`, `#F0EEE8`; card border `#E5E2DA`; track `#E8E6E0`
- Visa blue: `#2B4EA2`; hover `#22417F` and `#24448C`; light blue `#6B8AD4`; blue tint `#E9EEF9` with border `#CBD6EE`
- Warm accent: `#B45309` (confetti, warnings)
- Type: Instrument Sans 400/500/600/700, loaded from Google Fonts
- Sidebar: 208 px, content column 720 px centered, page top padding 50 to 54 px
- Motion: `rise` (0.55 s, translateY 12 px), `drop` (0.28 s), staggered delays `.d1` to `.d5`, chevron rotate on expand, breathing status glow on Home

## File format

Each `.dc.html` is a Design Component page for a canvas runtime: standard HTML inside `<x-dc>`, with `<sc-if>` for conditional blocks, `{{name}}` holes bound to `renderVals()` in the `<script type="text/x-dc">` block at the bottom, and `onClick="{{handler}}"` events. Links between screens are plain `href="Other.dc.html"`. The `./support.js` the head references is the runtime and is not included, so these files do not render standalone in a browser. Read them as the spec: markup is the layout and copy, `renderVals()` is the behavior. The live, clickable version is the canvas itself.

`canvas.json` is the index: board positions, titles, sizes, and the three section titles.
