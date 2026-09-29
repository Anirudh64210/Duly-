# 03 Frontend and Design

## Stack
- web/ and ops/: React 18, TypeScript strict, Vite, TanStack Router + Query, Tailwind; API client generated from contracts/openapi.yaml (openapi-typescript + fetch wrapper); zod parsing at every boundary.
- desktop/: Electron (electron-vite), contextIsolation on, sandbox on, no nodeIntegration in renderers; single preload exposing a typed, allowlisted bridge; auto-update deferred past v0.
- Accessibility floor: keyboard reachable, visible focus, 4.5:1 text contrast, prefers-reduced-motion respected (all motion additive; app fully legible with animations off).

## Two design systems, one family
1. Duly app tokens (approved canvas): ground #F8F7F4, ink #1A1917, secondary #6B6862, hairlines #ECEAE4, visa blue #2B4EA2 (tints #E9EEF9), amber #B45309 reserved for AI marks, danger only in Ops. Type: Instrument Sans only; hierarchy by size and weight, headings 600 with -0.02em.
2. WorkBook module tokens (binding, from workbook-handoff 02 visual system): white ground, green #1B7A57 accent, IBM Plex Sans + Mono, its own radii and hairlines. WorkBook screens use WorkBook tokens inside the Duly shell; the sidebar and chrome stay Duly. Do not blend the palettes.

Codify both as CSS variables in web/src/design/tokens.css with a data-module="workbook" scope switch.

## Design laws in force (each screen is reviewed against this list)
- One thing per screen; secondary controls behind one affordance (handoff rule 1)
- Minimum labels, maximum value; no eyebrow captions, no explanatory grey filler (rule 2)
- Edit in place with the pencil; cancel where the cursor is; destructive never under the cursor (rule 3)
- Nothing lost, provenance on every line, AI star until edited (rules 4 and 5)
- Calm: no badges, no counters, no urgency; one bar, one line (rule 6)
- Two choices, not three (rule 7); locked visible but blurred (rule 8); drop zone plus button (rule 9)
- Copy rules verbatim from handoff rule 10, extended product-wide: plain sentences, outcome-named buttons, no em or en dashes, no emoji, "Written by AI", "saved with a timestamp"
- Hicks law (few options per decision), Fitts (44px targets), Millers chunking (verdict then three numbers then rows), Jakob (conventional patterns for auth and billing), von Restorff reserved for the single Affects-your-case element per screen

## Psychology layer (fear relieving by design)
- Verdict-first everywhere: the first sentence on any surface says whether anything needs the user.
- Relief ritual: the daily check ends in under 30 seconds; the weekly brief mirrors it in email.
- Quiet dopamine: confetti only on genuinely completed journey phases and finished checklists; slow breathing glow on ALL CLEAR (4.8s cycle); progress bars fill once on load; streaks stated in plain text, never gamified counters.
- Honesty as UI: every AI block shows sources, rule pack version, impact dots with a worry verdict, and the fixed footer "Records and computations, not legal advice. Confirm with your DSO or an attorney." Abstentions render as a calm card with the DSO question drafted.
- Never: countdown reds, streak-loss threats, notification pressure. Retention is the relief loop plus the Updates value, not anxiety.

## Screen inventory
Student app: the nine approved canvas screens plus Case, Settings, Feedback, Billing placeholder. WorkBook module: Today, Log, Documents, Exports, Your case, per the handoff prototype v7 states (copy is final). Ops: the six panes of the skeleton plan with WCAG-compliant tables and diff viewers.

## Electron specifics for WorkBook
Main process owns: source pollers (Calendar, Meet, GitHub, Slack per handoff v1 table), block builder (45-minute rule, check-in and check-out anchors), SQLCipher store keyed from OS keychain, sealing (canonical JSON hash, Merkle root, optional OpenTimestamps), export builder (zip, folder, link upload of the pack only, revocable), and the local bridge. Renderer never touches raw stores. On-device drafting per handoff prompts; if no local model is available, drafting is off and entries are typed, never silently cloud-routed.
