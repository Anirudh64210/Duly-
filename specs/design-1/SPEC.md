# design-1: Duly looks and behaves like the approved canvas

The founder saw today's screen and asked: "is that how its going to look like on Duly the app, it better not". It is not. Today web/src is the engine's test harness. It is one 640px page, with the case form on top and bordered cards under it. None of the nine approved canvas screens is built.

This round turns the web app into the canvas: the shell, the tokens, the type, the motion, and five screens with their pages. The desktop window from desktop-1 wraps this same app. The logic, words and boundary checks behind today's page are sound, so they are kept. The layout and the look are replaced.

The canvas's calm is the point. It relieves the fear, it stays calm, and the legal backing stays one tap away (D56). Where canvas words cross BOUNDARY.md or a later decision, the boundary wins (D52, D53). Every place this happens is named in section 12 and put to the founder in section 17.

Read these first:

- DECISIONS.md D4, D7, D9, D10, D11, D12, D33, D41, D47, D52, D53, D56, D57, D59 and D61
- PRINCIPLES.md and BOUNDARY.md
- design/canvas/DESIGN-SPEC.md and design/canvas/screens/*.dc.html. The HTML is the reference for type, colour and motion. The PNGs are the reference for layout.
- docs/requirements/canvas-conflicts.md
- specs/plain-1/SPEC.md, specs/path-1/SPEC.md and specs/desktop-1/SPEC.md
- specs/documents-1/SPEC.md sections 8, 9, 11 and 14

The canvas's values are drawing samples and never data. "Dec 12", "134 days left", "14.2 of 20", "2 of 6", "Day 228 of 365", "PA-2026-05" and "SEVP check-in, October 7" are never copied. The engine was run read-only on 2026-09-29 with a fixed clock, on a case like the canvas's (OPT card ending Feb 9, 2027). It gives Nov 11, 2026 for the STEM window opening, 90 days before the card ends under 8 CFR 214.2(f)(11)(i)(C). It does not give Dec 12.

Every date and number on every screen comes from one of four sources:

- the engine's output;
- the case as the student entered it;
- an approved update record, with the updates route's own count;
- `/v1/status`.

The client never computes or counts one. Fixed names that hold digits, such as citations, form and category names, ordinals taken from ids, and "Step 2 of 5", are listed in 14.1.

## Covers

**Met when this round is done (76 rows):**

- **Shell, tokens, type and motion:** CANVAS-003, CANVAS-006, CANVAS-013, CANVAS-017, CANVAS-018, CANVAS-020, CANVAS-025, CANVAS-026, CANVAS-027, CANVAS-028, CANVAS-029, CANVAS-030, CANVAS-032, CANVAS-033, CANVAS-035, CANVAS-036, CANVAS-037, CANVAS-038, CANVAS-039, CANVAS-040, CANVAS-041, CANVAS-042, CANVAS-043, CANVAS-044, CANVAS-046, CANVAS-048, CANVAS-049, CANVAS-050, CANVAS-051, CANVAS-052, CANVAS-053, CANVAS-054, CANVAS-057, CANVAS-058, CANVAS-059, CANVAS-060, CANVAS-061, CANVAS-066.
- **The plan's frontend rows and design laws:** PLAN01-006, PLAN03-005, PLAN03-016, PLAN03-018, PLAN03-029, PLAN03-030, PLAN03-036, PLAN03-039, PLAN03-040, PLAN03-041, PLAN03-042, PLAN03-043, PLAN03-044, PLAN03-045, PLAN03-049, PLAN03-050, PLAN03-055, PLAN03-060, PLAN03-065, PLAN03-070, PLAN03-076, PLAN03-082, PLAN03-083.
- **Home:** HOME-021.
- **Timeline:** TIME-004, TIME-005, TIME-007, TIME-008, TIME-021.
- **Checklists:** CHECK-004, CHECK-007, CHECK-010, PLAN01-037.
- **Onboarding:** ONB-001, ONB-002, ONB-007, ONB-010, PLAN01-033.

**Met with a change the founder approves in section 17 (32 rows):**

- **Sidebar and window (F2):** CANVAS-005.
- **Colour and contrast (F5):** CANVAS-014, CANVAS-015, CANVAS-023, TIME-006.
- **Targets (F13):** CANVAS-047, PLAN03-061.
- **Layout readings (F14):** CANVAS-062, HOME-012.
- **Home (F5, F6, F7):** PLAN03-062, HOME-001, HOME-006, HOME-007, HOME-009, HOME-014.
- **Timeline (F7):** TIME-001, TIME-015, TIME-017, TIME-020.
- **Checklists (F7):** CHECK-001, CHECK-003, CHECK-005, CHECK-006, CHECK-008, CHECK-009, CHECK-011, CHECK-019, CHECK-021.
- **Onboarding (F3, F7):** ONB-009.
- **Completion moment (F4):** DEC-D10-002.
- **Feedback (F8):** PLAN03-084, PLAN01-041.

**Built and tested on engine samples, and shown to a person only once a verdict other than "Can't tell yet" can stand (F12) (2 rows, not counted):** HOME-004, DEC-D11-001. If the founder picks F12's alternative, both count and the total below is 459.

**Built and tested with test data, and shown to a person only once updates-3 publishes an update (9 rows, not counted):** HOME-017, UPD-001, UPD-003, UPD-004, UPD-008, UPD-010, UPD-013, UPD-015, UPD-016. UPD-001's check time also waits for updates-1.

**Moved forward, not finished (23 rows, not counted):** CANVAS-001, CANVAS-002, CANVAS-007, CANVAS-022, DEC-D09-001, DEC-D47-002, DEC-D47-003, DEC-D47-004, DEC-D53-001, HOME-011, HOME-020, TIME-003, TIME-010, TIME-013, PLAN01-035, PLAN03-064, PLAN03-066, PLAN03-081, PLAN10-031, RCOMP-021, RMKT-009, WB06-054, WB06-055. Section 16 says what each one waits for.

**Superseded rows whose replacement this round builds (27, not counted, because the register marks them overridden):** HOME-002, HOME-003, HOME-005, HOME-010, HOME-013, HOME-015, HOME-016, TIME-002, TIME-009, TIME-018, TIME-019, CHECK-002, CHECK-013, CHECK-018, CHECK-020, UPD-002, UPD-005, UPD-006, UPD-007, UPD-009, UPD-011, UPD-012, UPD-014, ONB-005, ONB-008, CANVAS-055, CANVAS-056.

**Kept met, and guarded by tests in this round:** DEC-D04-001, DEC-D04-003, DEC-D56-001, DEC-D56-002, DEC-D56-003, DEC-D57-001, DEC-D57-002, PLAN03-017, PLAN03-019, PLAN03-020, PLAN03-075, CANVAS-064, CANVAS-065.

Of the 2098 requirements the first version must hold, 349 are met today. That is 17 percent. If every row counted above passes audit, 457 are met, which is 22 percent. This round counts 108 of the 2456 rows in the register. Section 16 says where each canvas row this round does not build is placed.

## 1. What this round builds, and what waits

| Screen or part | This round | Waits for | Why it waits |
|---|---|---|---|
| Shell: sidebar, routes, tokens, type, motion, light and dark | Round A | | |
| Home | Round A: the hero in all four states, the unemployment count, the card end date, Duly's questions, What comes next built from today's output, and every date, count and rule in today's output (section 6). Round B: the stage eyebrow, the days to the card end, the stage rows with checklist progress, and the saved case | THIS WEEK waits for WorkBook (Phase 8). The update row waits for updates-3. The row "Look up the rules for a change" waits for Scenarios. A verdict other than "Can't tell yet" waits for documents-1 section 8 if the founder takes F12's recommendation | There are no hours without WorkBook. No approved update exists. The row's chips lead to Scenarios. D59 |
| Onboarding | Round A: status, one program, and the facts case_f1 holds, one question per view. Round B: every program, each program's CPT and pre-completion OPT periods, where each program stands, and OPT and STEM OPT for each program | The typed-date checks of D59 come with documents-1 section 8 | |
| Your case, Settings, Feedback | Round A | | |
| Updates | Round A: the screen and its empty state. The components are tested on test data | Showing approved updates waits for updates-3. The time of the source check waits for updates-1 | No approved update exists, and no route serves one |
| Timeline | Round B | Visa and entry, the coverage grid, and documents for each phase wait for documents-1 and documents-3. WorkBook weeks wait for Phase 8 | Phases need stages from the path model (section 11) |
| Checklists | Round B: the steps for the next filing, and the paths already finished | The H-1B view waits for a sourced h1b pack. The evidence step waits for WorkBook | Steps need checklists in the pack and a place to record step confirmations |
| Documents | No | documents-1 | The vault, the reader and the store are desktop work. documents-1 section 9 builds this screen on this shell |
| WorkBook | No | Phase 8 | Connectors, the day store and drafting are not built. D6 and D20 are open |
| Scenarios | No | An assistant route | There is no assistant route in the api, and no what-if mode that leaves the record alone. Under D60 no value from a document reaches a model |
| Mobile home | No | Not planned (D7) | Section 3.8 gives narrow windows a simple fallback. The Phone canvas layout waits |
| Billing | No | D8, D18 | Parked |

**What the founder sees after round A:**

- The sidebar lists Home, Updates, Your case, Settings and Feedback.
- Updates shows its empty state, because no approved update exists yet.
- Your case, Settings and Feedback were never drawn on the canvas. They are designed here from the nine.
- If F12's recommendation is taken, Home shows "Can't tell yet" for every real case. The other three hero states are seen in `make design-shots`, from engine samples.
- Timeline and Checklists, the most distinctive canvas screens, arrive in round B, after path-1 and desktop-1 (F9).

## 2. The founder's part (first and alone; lanes may not change it)

### Round A

- **Dependency:** approve `@tanstack/react-router` in web/package.json. The plan names it (PLAN01-006, PLAN03-005). It runs with hash history, so that routes load from `duly://app/`. `@tanstack/react-query` is already installed. No other dependency is added.
- **Fonts:** Instrument Sans 500 and 700 come from `@fontsource/instrument-sans`, which is already installed. If either weight file is missing, the lane stops and reports it.
- **Contracts:** round A changes no contract.
- **Answers:** F2 to F14 in section 17.

### Round B (contracts land first and alone)

- **contracts/engine_output.schema.json** gains:
  - `stages`, with `reasons`, `windows` and `items` (RQ-P3, RQ-E6)
  - `checklists`
  - `upcoming[].days_away` and `upcoming[].inputs` (RQ-E1)
  - the rules that stages, windows and steps name (RQ-E2)

  web/src/lib/compute.ts mirrors each of these, and `contractMatches` holds.
- **contracts/rulepack.schema.json** `path` gains:
  - checklist steps, and a checklist-level `reading` flag
  - the means to hold every program, with its level, its standing and a changed end date
  - pre-completion OPT periods
  - a `full_time` flag on CPT and pre-completion OPT periods
- **contracts/case.schema.json** periods gain `full_time` and `reported_on`.
- **contracts/update.schema.json** gains `plain`, `source_label` {agency, document, dated}, `topic`, `kind` and `stages`, and each claim gains `source_type` (RQ-U1).
- **contracts/openapi.yaml** gains `POST /v1/compute` (RQ-A1), and `GET /v1/updates` with `matching` (RQ-A2, for updates-3).
- **contracts/desktop_case_bridge.schema.json** is new. It types the case bridge (RQ-K1).
- **contracts/product_settings.yaml** gains `product.feedback_address`, null by default (F8).
- **Answer:** F1.

## 3. The shell (L-web)

### 3.1 Routes, the sidebar and the window

**Routes:**

- Round A: `#/` Home, `#/updates`, `#/case` (Your case), `#/settings`, `#/feedback` and `#/welcome` (Onboarding).
- Round B adds `#/timeline` and `#/checklists`.
- With no case, the app opens on Onboarding. Otherwise it opens on Home. An unknown route opens Home.

**The sidebar** (every canvas file draws it the same way):

- It is 208px wide, with a right hairline in `--hairline`. It has 26px by 14px padding, and its items sit 2px apart.
- The wordmark "Duly" is 17px, weight 700, at -0.01em, with the period in `--accent`. It sits 26px above the first item.
- Items are 14px, padded 7px by 10px, with a 7px radius.
  - The active item is weight 600 in `--accent`, with `aria-current="page"`.
  - The other items are `--ink-2`, with a `--row-hover` background that fades in over 0.16s.
- Your case, Settings and Feedback are pinned to the bottom by a spacer, as in the canvas.
- The sidebar lists only screens that exist, in the canvas order (F2): Home, Timeline, Checklists, Updates, then Your case, Settings and Feedback. documents-1 adds Documents in its canvas place.
- Onboarding uses the tokens but has no sidebar.

**Scrolling:**

- The canvas is a fixed 832px frame. Real pages are longer, so:
  - The sidebar is sticky and full window height. It never scrolls with the page, and its bottom group stays at the bottom of the window.
  - The main area scrolls.
- Each page is a column at least as tall as the window.
  - A short page, such as empty Updates, Settings or Feedback, keeps its footer at the bottom of the window with 24px bottom padding, as the canvas's spacer does.
  - A long page, such as open questions, open working or Your case, scrolls, and its footer follows its content.

**The window:**

- desktop-1 opens the window at 1200 by 860 with the standard macOS title bar titled "Duly". That leaves 1200 by 832 for the page. The minimum window is 900 by 600.
- The canvas draws no window chrome, so the page is what must match the canvas. At 1200 wide, the column is centred in the 992px main area.
- A title bar hidden into the sidebar is a desktop change for a later round (F2).

### 3.2 Tokens, light and dark

web/src/design/tokens.css holds every canvas token, then a dark set.

- Dark follows the system appearance: `@media (prefers-color-scheme: dark)` on `:root:not([data-theme="light"])`, and again on `:root[data-theme="dark"]`. The `data-theme` attribute exists for tests and for the design shots. There is no switch on screen.
- `:root` sets `color-scheme: light dark`. `[data-theme="light"]` sets `light` and `[data-theme="dark"]` sets `dark`. This makes the native controls, the text box and the scrollbars follow the theme.
- The canvas draws only light. The dark values are Duly's own derivation, for the founder to see (F5). Where a light value differs from the canvas, section 3.7 and F5 say why.
- The `data-module="workbook"` scope is untouched.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--ground` | #F8F7F4 | #161513 | Page |
| `--surface` | #FFFFFF | #1E1D1B | Option cards, chips, fields, secondary pills |
| `--ink` | #1A1917 | #EDEBE6 | Titles, values |
| `--ink-body` | #4A4844 | #D2CFC8 | Text in an open row |
| `--ink-2` | #6B6862 | #A9A59D | Every meta line, metric and section eyebrow, date line, footer and source link (3.7) |
| `--ink-3` | #8A8780 | #7E7A73 | Marks only: chevrons, the unchecked checkbox ring, later-phase rings, field edges |
| `--hairline` | #ECEAE4 | #2C2B28 | Outer rules, sidebar edge, metric dividers |
| `--hairline-inner` | #F0EEE8 | #252422 | Rules inside a list |
| `--row-hover` | #F0EEE8 | #262522 | Row and nav hover, selected path chip |
| `--chip-border` | #E5E2DA | #34332F | Chips and unselected option cards |
| `--chip-selected-border` | #C9C5BC | #4A4843 | The selected path chip's edge |
| `--control-border` | #D5D1C8 | #45433E | Secondary pills |
| `--control-border-hover` | #B8B4AA | #5A5751 | Hover edge of secondary pills, path chips and option cards |
| `--option-hover` | #FDFCFA | #22211F | Option card hover fill |
| `--accent` | #2B4EA2 | #8FA8E6 | Links, active nav, hero eyebrow, marks, bars, checked boxes, selected option edge |
| `--accent-hover` | #22417F | #AFC2F0 | Link hover. The canvas's green #0A4C41 in Checklist and Updates is a slip and is not used |
| `--on-accent` | #FFFFFF | #161513 | Text and checks drawn on `--accent` or `--button-hover`: primary pill text, the NOW tag, checks in filled marks |
| `--button-fill` | #2B4EA2 | #8FA8E6 | Primary pills |
| `--button-hover` | #24448C | #AFC2F0 | Primary pill hover |
| `--accent-tint` / `--tint-border` | #E9EEF9 / #CBD6EE | #1C2438 / #2E3A5C | Reserved for the scenario chips and source pills. No screen in this round uses them |
| `--ring-next` | #6F86C4 | #5C74B0 | Ring on the next phase (canvas #8FA6D9, F5) |
| `--caution` | #8A6A2A | #D2B06A | Varies-by-school lines and caveat lines, never amber |
| `--track` | #E8E6E0 | #2E2D2A | Bar track |
| `--pip-empty` | #DDD9D0 | #3A3935 | Onboarding pips |
| `--ai-mark` | #B45309 | unchanged | The AI star only. No screen in this round uses it |

**Other tokens:**

- **Radii:** `--radius-nav` 7px, `--radius-row` 10px, `--radius-field` 10px, `--radius-card` 12px, `--radius-pill` 99px, `--radius-tag` 5px.
- **Motion:** `--ease` cubic-bezier(.2,.7,.2,1), `--rise` 0.55s, `--drop` 0.28s, `--step-drop` 0.3s, `--hover` 0.16s, `--press` 0.12s, `--turn` 0.22s, `--fill` 1.1s, `--fill-delay` 0.5s (Home), `--fill-delay-timeline` 0.4s, `--step-bar` 0.35s.
- **Halo (F11):** `--halo-size` 21px, `--halo-offset` -3px, `--halo-blur` 6px, `--halo-peak` 0.16, `--halo-scale` 1.15, `--halo-period` 8s, `--halo-cycles` 3. These replace `--halo-opacity: 0.05`, which was tuned for today's glow behind a whole card.

### 3.3 Type

- Instrument Sans only, at 400, 500, 600 and 700. Import 500.css and 700.css beside 400 and 600.
- `body` sets `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale`, as the canvas does. On macOS and in Electron this visibly changes how Instrument Sans renders.
- `--font-mono` is not used on any Duly screen. Numbers use `font-variant-numeric: tabular-nums`.
- Headings are 600 at -0.02em. Page titles are 30 to 34px: Timeline 32px, Checklists 30px, Updates 30px, Onboarding's question 30px, and the undrawn pages 32px.
- **The hero:**
  - The headline is 40px, 600, -0.02em, with a line height of 1.1. The canvas draws 40 to 42px, and Home's markup uses 40.
  - The hero's parts are 13px apart.
  - The mark and the eyebrow sit on one line, 9px apart.
- **Metrics:**
  - The value is 28px, 600, at -0.01em, not the -0.02em heading rule (HOME-006). A date value is 24px.
  - The meta is 13px.
  - The eyebrow is 11px, 600, tracked 0.1em.
- Body text is 14 to 15px. Row titles are 14.5px at 500. Meta lines are 12.5 to 13px.
- Eyebrows are 11 to 11.5px, 600, uppercase, tracked 0.10 to 0.14em: 11.5px at 0.14em in heroes, and 11px at 0.12em over a section.

### 3.4 Shapes and metrics

- The content column is 720px wide and centred.
- Top padding follows each canvas file: Home 54px, Checklists 52px, Updates 52px, Timeline 50px. The undrawn pages use 52px.
- Rows have 13 to 17px vertical padding and -12px side margins, so that the hover reaches past the text, and a 10px radius on hover.
  - Home rows are padded 16px by 12px, Updates rows 15px by 12px, and Timeline rows 13px by 12px (15px for the current phase).
  - There are no bordered cards and no card grids.
- Primary actions are 99px pills. Secondary actions are outline pills (3.11). Quiet actions are text buttons.
- Target size follows 3.10.

### 3.5 Motion

- **Entrance:** `rise`, from translateY(12px), 0.55s on `--ease`, with transform only.
  - On Home the stagger follows the canvas: date line 0s, hero .06s, metrics .16s, the sections after them .28s, footer .42s.
  - Other screens follow their canvas file's delays, in steps of 60 to 90ms.
  - The entrance plays once for each visit to a screen, meaning a route change or the first load. It never plays after the case is computed again (section 4).
- **Rows and nav:** background over 0.16s.
- **Presses** (all over `--press`, 0.12s):
  - Buttons, secondary pills and path chips press to scale(.97).
  - Option cards press to .985.
  - The scenario chips, not built this round, press to .96.
  - Checkboxes grow to 1.08 on hover and shrink to .92 on press.
- **Hover edges:** secondary pills, path chips and option cards change their edge to `--control-border-hover` over 0.16s. Option cards also fill with `--option-hover`.
- **Disclosures:** chevrons turn 90 degrees over 0.22s. Open content drops in over 0.28s from translateY(-6px), with transform only. The existing `drop-in` keyframes are kept.
- **Onboarding:** the header (wordmark and pips) rises once. Each step's content drops in from translateY(-8px) over 0.3s ease-out, as Onboarding.dc.html does. The pips change colour with no transition.
- **Checklists:** switching a chip drops the new view in from translateY(-6px) over 0.28s. The chip row does not move.
- **Bars:**
  - Home and Timeline bars fill once from 0 over 1.1s, after 0.5s on Home and 0.4s on Timeline, once for each visit.
  - The Checklists bar does not fill on entry. It moves its width over 0.35s when a step changes, as the canvas does.
  - After a recompute, a bar whose value changed moves its width over 0.35s.
- **Halo (D11, F11):** it sits on the hero mark, and only for `no_open_items`.
  - It is a disc of `--accent`, `--halo-size` wide, centred on the 15px mark (`--halo-offset`), blurred by `--halo-blur`.
  - Each breath takes `--halo-period` (8s) and goes from opacity 0 at scale 1, to `--halo-peak` at `--halo-scale`, and back to 0.
  - It breathes `--halo-cycles` (3) times after the hero mounts, then rests at 0.
  - Hovering the hero's top line (mark, eyebrow) or its headline plays one more breath, once per visit, if it is resting. The 15px mark alone is too small to find.
  - It is never continuous.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, every animation and transition is off, the halo included. Every screen is complete without them.

### 3.6 The quiet completion moment (D10, F4)

It plays in two places:

- when the person confirms the last unconfirmed step of a checklist;
- on Onboarding's last view.

It does not play when a finished OPT or CPT view or a done Timeline phase is opened (F4).

- A 15px circle fills with `--accent`.
- Its `--on-accent` check draws by stroke over 0.6s ease-out, once.
- The line of words beside it changes.
- There are no particles, no sound and no colour but blue.
- With reduced motion, the filled mark and the words simply appear.
- There is no confetti anywhere.

### 3.7 Text colour and contrast

- **Text colours:** text uses `--ink`, `--ink-body`, `--ink-2`, `--accent`, `--on-accent` or `--caution` only.
  - Where the canvas draws text in tertiary #8A8780 or faint #B0ACA3, this round uses `--ink-2`. On the ground #8A8780 measures 3.35:1 and #B0ACA3 measures 2.11:1, both under the 4.5:1 floor (PLAN03-018). documents-1 section 9 does the same.
  - This covers Home's date line and metric meta, the section eyebrows, the Updates source lines, and every footer (F5).
- **Mark colours:** `--ink-3` is for marks only. `--faint` is not a token. Canvas chevrons drawn in #B0ACA3 use `--ink-3`.
- **Mark contrast:** every mark whose meaning is not also given in visible words measures at least 3:1 against every background it sits on (WCAG 1.4.11). This covers:
  - the unchecked checkbox ring, which is the checkbox's only visible edge, and the field edge. Both use `--ink-3`, where the canvas draws #C9C5BC, which measures 1.61:1;
  - the later-phase ring, in `--ink-3`;
  - the next-phase ring, in `--ring-next`;
  - chevrons;
  - checks drawn in `--on-accent` on `--accent`;
  - the bar fill on the track;
  - the selected option edge.

  Each mark's meaning is also in its accessible name.
- **On accent:** text and checks on `--accent` use `--on-accent`. In dark, white on #8FA8E6 measures 2.36:1. #161513 on it measures 7.74:1.
- **Caution on hover:** `--caution` measures 4.69:1 on the ground but only 4.33:1 on `--row-hover`. So a row that holds a caution line keeps its ground on hover, and its checkbox or chevron shows the hover instead.
- **Tests:** every text pair and every mark pair is measured in light and dark by a test (14.1).

### 3.8 Widths

- From 960px up, the layout is the canvas layout.
- From 760px to 960px, the column narrows, keeping 24px side gutters.
- Below 760px, the sidebar becomes a top bar with the wordmark and a Menu button that opens the same links. The side gutter is 16px and nothing scrolls sideways. This is a fallback, not the Phone canvas.
- The desktop window's minimum of 900 by 600 is covered.

### 3.9 Footers

- Every screen ends with its own canvas footer line, in the words of section 12, at 12px in `--ink-2`.
- Under it is the fixed line "Records and computations, not legal advice. Confirm with your DSO or an attorney." (PLAN03-075, F7). Home has no canvas footer of its own, so it shows only the fixed line.
- No other footer exists.

### 3.10 Accessibility and targets

- Everything is reachable by keyboard, and focus is visible (2px `--accent` outline, 2px offset).
- **Accordion rows:**
  - Only the row's header is the toggle: one `<button>` with `aria-expanded` and `aria-controls`, covering the title, the meta line and the chevron.
  - The open part sits outside that button, so a click inside it never closes the row, and no control is nested inside another.
  - The hover background belongs to the whole row.
- Chips are buttons with `aria-pressed`.
- Checkboxes carry `role="checkbox"`, `aria-checked` and a label.
- Onboarding choices are radio groups, and the arrow keys move between them.
- The four hero marks carry accessible names that match their headlines.
- **Targets (F13).** The drawn box of every control keeps its canvas size, so the landmark check holds. The hit area is an invisible `::before` on the control, centred on it, that reaches 44 by 44px.
  - The hit area may cover plain text. It never covers another control's box or hit area.
  - Where two controls sit closer than 44px centre to centre, their hit areas meet at the midpoint and tile the space, with no gap and no overlap. With a mouse or trackpad (`pointer: fine`), that makes the sidebar items 37px tall on the canvas's 37px pitch, and the Checklists chips 44px tall on 8px gaps.
  - Under `pointer: coarse`, the controls themselves grow to 44px. Sidebar items become 11px by 10px padding, and chips 12px by 15px.
  - 18px checkboxes, "Back", and 13px links all reach 44px within their rows.

### 3.11 Parts the canvas did not draw

Today's page draws these as bordered boxes. Section 13 removes those styles. Each part is designed here, so no builder improvises.

- **Links:**
  - A link inside Duly is 13px, 600, `--accent`, hover `--accent-hover`. It ends with " →" as the canvas draws it: "Open the checklist →", "Open →". The copy lint allows the arrow.
  - A link to an outside source opens in the person's own browser (desktop-1's guard). It has no arrow and underlines on hover. In rows it is 12.5px `--ink-2`, and in a rule block it is 13px `--accent`.
- **Text buttons** (quiet actions) are 13px, 600, `--accent`, with no box. A destructive text button, such as "Remove" or "Delete what you entered", is `--ink-2` and never red.
- **Primary pill:** `--button-fill` with `--on-accent` text and a 99px radius. It is 14px, 600, padded 12px by 32px, as Onboarding's Continue is. On a screen it is 13px, 600, padded 9px by 22px (Save, "Copy feedback"). Hover `--button-hover`, press .97.
- **Secondary pill** (canvas "Draft the question for your DSO"):
  - 12.5px, 600, `--ink` on `--surface`, with a 1px `--control-border` edge, a 99px radius, and 7px by 14px padding.
  - Hover edge `--control-border-hover`, press .97 over 0.12s.
  - Used for "Draft the question for your DSO", "Copy the email", answer pills and "Try again". It is never a blue pill.
- **Rule block (plain first, D56, plain-1 section 2).** No box.
  - **Meta line** (12.5px, `--ink-2`): the value (when the unit is not a flag) · the status tag · the citation text, plus "Duly's reading" where the rule is a reading.
  - **Plain words:** 14px `--ink-body`, line height 1.55, at most 600px wide.
  - **The tap:** a text button "Read the exact words", with a 10px `--ink-3` chevron that turns 90 degrees.
  - **Open, the exact words drop in:**
    - the quote, with a 2px `--hairline` rule on its left, 14px padding and 14px `--ink-body`, with no background and no italic;
    - for a reading, "Duly's reading of the quoted words, not the words of the source" at 12.5px `--ink-2`, then the note at 13px `--ink-body`;
    - for a verbatim value, "The value is written in the quoted words." at 12.5px `--ink-2`;
    - the citation as an outside link;
    - "Checked <date>." at 12.5px `--ink-2`.
  - **Several rules** stack 16px apart, with a `--hairline-inner` rule between them.
  - A rule with no plain words (another pack) shows its exact words as they are.
- **Status tags are words, not shapes.** "Regulation", "Government guidance", "School policy", "A court paused a change", "Proposed, not in force" and "Duly's reading" appear as text in a meta line, separated by " · ". The canvas's only tag shape, the NOW tag, is used for nothing else.
- **Court line (plain-1 section 3):**
  - Under the value it touches: the regime's plain words at 13px `--ink-body`, and an outside link "Read the court's order".
  - Then the text button "What the paused rule would change", which opens the alternate's value as a line of the working.
  - The value shown is always today's.
- **The working** (an item's or a metric's):
  - It opens below its trigger, between two `--hairline-inner` rules, with 16px vertical padding.
  - It has two groups with 13px 600 `--ink` headings, "Inputs used" and "Rules used".
  - Inputs are two columns: the name in 13px `--ink-2` in a 240px column, and the value in 13px `--ink` with tabular numbers.
  - Rules are rule blocks.
  - An `upcoming` entry has no inputs in round A (RQ-E1 adds them), so it shows "Rules used" only.
- **The DSO draft view** (D57, CHECK-010). It opens in place, directly under the pill that asked for it, never as a sheet or a new window. It holds:
  - the heading "An email you can send to your DSO" at 14.5px 500;
  - "Duly drafted it from the dates you entered, in your words. It holds no date Duly computed. Duly never sends it." at 12.5px `--ink-2`;
  - the email, subject line first, in an editable text box (the field style, 14px Instrument Sans, line height 1.55, 14px by 16px padding). The box grows with its text up to 360px and then scrolls. The student may edit it, and Duly never sends it;
  - the secondary pill "Copy the email", which copies the text as edited. After a copy, "Copied." appears beside it at 12.5px `--ink-2` (`role="status"`) and stays until the text changes. If the copy is refused: "The browser did not allow the copy. Select the words above."
- **Busy (section 4):**
  - When a computation on changed facts is running, the column is empty for its first 300ms.
  - After that it shows a 15px `--ink-2` ring mark and "Working it out from your dates." at 15px `--ink-2`, where the hero goes.
  - There is no spinner, no shimmer, and no last verdict.
- **Error:**
  - The hero shows the `cannot_tell` mark, "Can't tell yet", and today's refusal lines for NOT_A_NUMBER, NOT_JSON, NOT_YET and `first_problem`, in plain words.
  - Then the secondary pill "Try again".
  - There are no metrics and no rows. It never shows the quiet state.
- **Fields** (Onboarding, Your case, Settings, Feedback):
  - **Frame:**
    - The label sits above the field (13px 500 `--ink`).
    - The field is 44px tall, on `--surface`, with a 1px `--ink-3` edge (the only thing that marks it as a field, 3:1), a 10px radius, 0 by 14px padding, and 15px `--ink` text.
    - Hover edge `--ink-2`. Focus edge `--accent`, plus the focus outline.
    - There are no placeholders. A hint goes in a 12.5px `--ink-2` line under the label.
  - **Dates:** three numeric fields side by side, 8px apart: Month (56px), Day (56px) and Year (80px), each labelled, with `inputmode="numeric"`.
    - They are composed into an ISO date for `buildCase`.
    - There is no native date picker and no calendar icon. Electron's `<input type=date>`, which shows mm/dd/yyyy, is not used.
  - **Time zone:** a native select with `appearance: none`, the field style, and a drawn `--ink-3` chevron. Its choices come from `zoneChoices`.
  - **Numbers** (hours a week, and round A's CPT days): a 96px field.
  - **Text boxes** (the draft, Feedback): the field style, at least 140px tall.
- **Problems** (`problems` from caseForm.ts) are never red and never an icon.
  - The field's edge becomes 1.5px `--ink`. The problem's sentence sits under it at 13px 500 `--ink`, linked by `aria-describedby`.
  - A problem that belongs to no single field sits under the view's title.
  - Continue and Save stay enabled. Pressing one with a problem moves focus to the first field with a problem, and the group announces the sentence once (`role="alert"`).
- **Option cards** (Onboarding.dc.html):
  - `--surface`, a 1.5px `--chip-border` edge, a 12px radius, 16px by 20px padding, and 10px between cards.
  - The title is 15px 600 `--ink`. The line under it is 13px `--ink-2`, 2px below the title.
  - Hover: `--control-border-hover` edge and `--option-hover` fill. Press .985.
  - Selected: the edge becomes `--accent`, and a 17px check appears at the right (an `--accent` circle with an `--on-accent` stroke).
  - They form a radio group.
  - Your case uses a compact form, padded 10px by 18px, at 14px 600, side by side, for its two-choice rows.
- **Checkbox:** an 18px circle. Unchecked, it is a 1.5px `--ink-3` ring. Checked, it is an `--accent` fill with an `--on-accent` check. Its hit area follows 3.10.

## 4. One case, computed once (L-web, L-desktop)

**Where the case lives:**

- **Round A:**
  - The case is kept in memory for as long as the window is open.
  - Closing the window or reloading the page starts again at Onboarding.
- **Round B:**
  - On the desktop, the case is kept through the case bridge (RQ-K1, F1).
  - On the web, it stays in memory only. It is never written to localStorage, sessionStorage or IndexedDB. Settings says so.
  - documents-1 section 8 later moves the case into duly.db.

**One computation:**

- Every screen reads one computed output from one TanStack Query, keyed by the case: its facts, its answers and its zone.
- Home and the other screens have no form.
- A change in Your case, an answer, or a step confirmation does three things: it writes the case, computes again, and updates every screen.
- A status with no F-1 rules is not sent to `/v1/compute/f1` in round A (section 5).

**Coming back to the window (D33).**

- When the window regains focus, the client compares the calendar day in the case's time zone with the `today.date` of the output it holds.
  - It reads the day only to make that choice. The day is never shown and never used in a value.
- If it is the same day, nothing happens: no computation, no busy state, no repaint.
- If the day has changed, the case is computed again, because the day is one of the facts. This keeps the engine's today the person's own day, without emptying Home each time the student switches back.

**States kept from today's App.tsx:**

- A result goes away as soon as the facts it was computed from change, the day included. While that computation runs, screens show the busy state of 3.11, never the last verdict.
- A new result replaces the old one in place. Screens do not mount again: no rise and no refill. Bars follow 3.5.
- An error shows the error state of 3.11. It never shows the quiet state.
- Only answers listed in `answers_read` stand.

**Answers and step confirmations:**

- Both go into `confirmations`, with the engine's `today.date` as their day.
- Step confirmations use ids of the form `step.<checklist>.<step>` (RQ-P4).
- Withdrawing uses `withdrawAnswer`. An answer holds only for the values it was given for.

**Documents count (F12):**

- With F12's recommendation, the case sends `documents_count` 0. That is true: no document can be attached to Duly before documents-1.
- The engine then gives `cannot_tell` with `no_documents`, which status.ts words as "No document is attached to these dates yet." This is documents-1's wording.
- documents-1 section 8 replaces this with the checks of D59.

## 5. Onboarding (L-web)

**Layout** (Onboarding.dc.html):

- A 560px column centred across the window, on the ground, with no sidebar. There is 28px between the header and the step.
- **The header does not move between views (F14).** The canvas centres the whole column vertically, so its header would jump between steps of different heights. Instead, the header's top sits where the canvas's work step puts it at 1280 by 832, and stays there on every view. That position is measured from Onboarding.dc.html into landmarks.json (about 140px) and scales as `calc(50vh - 276px)`, never less than 48px. A taller view scrolls.
- **Header:**
  - The wordmark is 19px, 700, at -0.01em.
  - Under it, 20px below, come five pips, each 22 by 4px with a 2px radius and 6px apart, filled `--accent` up to the current step and `--pip-empty` after it.
  - Beside the pips, 8px away, is the step label at 12px `--ink-2`: "Step 2 of 5", and "Done" on the last view.
- **A view:**
  - The question is the title, at 30px, 600, -0.02em.
  - The view's parts are 24px apart: the title, its one group of fields or option cards, the why line (12.5px `--ink-2`), and a row with Back at the left and Continue at the right.
  - Back is a 14px `--ink-2` text button, and it works on every view.
  - Continue is a primary pill at 14px 600, padded 12px by 32px.
- Every answer is remembered across Back and Continue.

**One question per view.**

- A view holds one question, the 30px title, and at most one related group of fields: for example, a start and an end, or one CPT authorization's dates and its full-time choice. No view holds two questions.
- **Pips and labels:**
  - The five pips are five sections: Status, Programs, Practical training, Jobs, and Duly's questions.
  - Every view in a section keeps that section's pip and label. So every CPT, program or job view in a loop reads "Step 3 of 5", "Step 2 of 5" or "Step 4 of 5".
  - The title names the program or job it is about, by the student's own name for it or its dates. For example: "Did you have CPT during M.Eng Computer Science?". This tells the student where they are without a counter.
- Back goes to the previous view, not the previous section.
- Under D9, Duly onboarding asks for status only. Work type and field move to WorkBook setup (canvas-conflicts rows 48 and 50).

**Views and data:**

| Section | View (title) | Round | Where it goes |
|---|---|---|---|
| 1 Status | "Which visa status do you hold now?" Option cards: one for each category whose pack exists in `/v1/status`, by its name in labels.ts (F-1, H-1B, O-1, EB-1A), then Another status. Under the cards: "Dates are counted in <zone>." with a text button Change, which opens the zone field in place (D33) | A | Round B: `categories`. Round A: held in the case. The zone comes from `reportedZone()` |
| 1 Status | Only after Another status: "What is your status called?" One text field, at most 40 characters, optional | A | Kept as the person's own words in Your case. It is never sent as a category |
| 2 Programs | For the latest program first: "What level is your latest program?" Option cards with the pack's levels (RQ-P1 sources every level a student can hold, such as associate, bachelor's, master's, doctoral, non-degree and English language training) | A: the levels case_f1 holds | `degree_level`. Round B: the program's level |
| 2 Programs | "When does <it> run?" The start date and the program end date on the I-20 | A | `program_end_date`. Round B: the program's span |
| 2 Programs | "What do you call it?" One text field, at most 80 characters, optional | A | The program's own name, shown as the student's words |
| 2 Programs | "Where does <program> stand?" Still studying / Completed / Transferred to another school / Stopped before its end date | B | The program's standing (RQ-P1) |
| 2 Programs | "Did the program end date on your I-20 change?" No / Yes. Yes shows the earlier end date in the same view | B | The changed end date (RQ-P1) |
| 2 Programs | "Before <program>, did you study in another program in the US?" Yes / No. Yes repeats this section for the earlier program. The loop stops only on No | B | Every program (RQ-P1) |
| 3 Practical training | For each program, newest first: "Did you have CPT during <program>?" | A: the one program | |
| 3 Practical training | Round A: "How many days of full-time CPT did you have?" Round B: "Your CPT authorization", with start, end, and Full-time or Part-time, then "Another CPT authorization during <program>?" | A, B | Round A: `cpt_full_time_days`. Round B: periods (RQ-P2) |
| 3 Practical training | "Did you have pre-completion OPT during <program>?" Then each period, like CPT | B | Periods (RQ-P2, D12) |
| 3 Practical training | "Did you apply for post-completion OPT after <program>?", then "Your DSO's recommendation and your I-765" (the two dates), "Your OPT card" (start, end) and "Your approval notice" (the notice date and the day the card arrived, both optional) | A: first three. B: all, for each program | `opt`. Round B: the program's OPT facts (RQ-P5) |
| 3 Practical training | "Did you receive a request for evidence on your OPT application?" Yes / No | B | `rfe_received` (RQ-P5) |
| 3 Practical training | The same views for STEM OPT: "Did you apply for a STEM OPT extension after <program>?" | A: once. B: for each program, so a second extension at a higher level can be entered | `stem`. Round B: the program's STEM facts |
| 3 Practical training | Once: "Did an employer file an H-1B petition for you?", then "The petition" (filed date, requested start), "What is the petition's status?" (the pack's statuses) and "Does the petition ask for a change of status?" | A | `cap_gap` |
| 4 Jobs | "Did you have a job during OPT or STEM OPT?", then "Your job" (start, and end or "I still work here"), "How many hours a week?", "Did you report this job to your school?" (round B adds the day, optional, in the same view), then "Another job?" | A | `employment[]`. Round B adds `reported_on` |
| 5 Duly's questions | The engine's `questions[]` after the case is computed, one per view, each with its `because` lines and its two answers as option cards. The section is skipped when there are none. Nothing entered is not the same as nothing to record, so Duly asks and never assumes (D41) | A | `confirmations`, as the person's own statements with the engine's day |
| Done | "What you entered" | A | See the words below |

- **The documents count.** With F12's recommendation there is no count question. With F12's alternative, Jobs ends with its own view: "How many of your documents did you take these dates from?"
- **A status that is not F-1:**
  - After Status, the flow goes straight to Done. Pips 2 to 4 fill, and the label reads "Done".
  - Round A does not call `/v1/compute/f1` for it. Round B sends `categories` to `POST /v1/compute`, and the engine gives `cannot_tell` with `category_not_covered:<id>` (path-1).
  - A status the person named under Another status is never sent. Home shows the client's safe fallback: the `cannot_tell` hero, "Can't tell yet", and "Duly holds no rules for the status you named." This is the same kind of fallback as the error state, and never the quiet state.

**Words:**

- Every view has a why line in the shape of row 49, saying why the question is asked. For example: "Why we ask: each program has its own dates and rules."
- The sentence "Where your answers are stored is in Settings." appears once, on the first view's why line, and nowhere else.
- **The Done view:**
  - The title is "What you entered", not "You're set.".
  - The lines are 14.5px `--ink-body`, 10px apart, with no check marks (F3):
    - The status line. For F-1: "F-1" in round A. In round B: "F-1 · <stage label>, from the dates you entered", with the stage part left out while the current stage carries a reason (RQ-P3). For another status: its name, then "Duly holds no rules for <status> dates.", or for a named status, "Duly holds no rules for the status you named.".
    - The program lines, as entered: "<own name or level> · <start> to <end>".
    - "Duly computes: <names>", with the names taken from the computed ids through labels.ts. For example: "the unemployment count, the STEM OPT filing window, employer reporting". This replaces "Watching: ...".
  - Then "Everything lives in Your case and can be changed any time." at 13px `--ink-2`.
  - Back, and a primary pill "Open Duly".
  - The quiet completion moment of 3.6 plays.

**Motion:** 3.5's Onboarding rules. The completion moment on Done.

**Tests:**

- Pips and labels on every view, unchanged within a section's loops.
- Every view holds one title and at most one group of fields.
- Back and Continue keep every answer. Back goes back one view.
- The program loop stops only on No.
- A status other than F-1 goes to Done, never shows the quiet state, and is never sent to `/v1/compute/f1`.
- The storage sentence appears once.
- The Done lines carry no check mark.
- Step 5 shows exactly the engine's questions, and records them with the engine's day.
- Problems appear as 3.11 says, never red.
- Every string passes `calmProblems` and the copy lint.
- No work-type or field view exists.

## 6. Home (L-web)

**Layout** (Main.dc.html, Main-expanded.png):

1. The date line at 12px `--ink-2`.
2. The hero, 30px below the date line.
3. The metrics, 44px below the hero. They are split by 1px `--hairline` vertical dividers, with 32px padding on each side of a divider and 8px between a metric's parts.
4. "QUESTIONS FOR YOU", 48px below, only when `questions[]` is not empty.
5. "WHAT COMES NEXT", 48px below.
6. "DATES, COUNTS AND RULES", 48px below.
7. The footer, pushed to the bottom by a spacer, with 24px bottom padding.

- Each section eyebrow is 11px, 600, tracked 0.12em, `--ink-2`, with 8px under it.
- Every section is a hairline accordion (3.10):
  - Rows are padded 16px by 12px, with -12px side margins and `--hairline` rules above each row and below the last.
  - The title is 14.5px 500. The meta line is 13px `--ink-2`, 2px below the title. There is a 14px `--ink-3` chevron at the right.
  - All rows are closed at first. One row is open at a time across the page, and a second click closes it.
  - The open part is indented 2px, with 12px above it, 4px below it, and 8px between its lines. Its text is 13px `--ink-body`.

**The hero holds nothing but these, in this order:**

1. The mark and the eyebrow.
2. The headline.
3. At most three reason lines.
4. The scope line.
5. One "Next:" line, or one control.

The hero never holds questions, answers, rules or working. It never grows past this, so the metrics stay in view: at 1280 by 832, the top of the metrics row sits at or above 480px in every state (14.4). With more than three reasons, the third line is a text button "Show every reason", which lists the rest in place.

**The hero, by state.** The canvas draws only the quiet state. The other three are designed here. No state uses red or amber. Every mark is 15px.

| State | Mark | After the headline |
|---|---|---|
| `no_open_items` | A hollow `--accent` ring (1.5px), with the halo of 3.5 (F3, F11) | The scope line, then "Next: <item>, <date>." |
| `needs_you` | An `--accent` ring with a filled centre | The reason lines, the scope line, then "Next: <item>, <date>." |
| `talk_to_dso` | An `--accent` ring with a question mark | The reason lines, the scope line, and the secondary pill "Draft the question for your DSO", which opens `dsoDraft` in place (3.11) |
| `cannot_tell` | An `--ink-2` ring with a short bar | The reason lines, known matters first (`needsAnswer`), then the scope line. Then, when questions exist, a text button "Answer Duly's questions", which moves focus to the first question. When none exist, the secondary pill "Draft the question for your DSO". The same pill also ends the questions section. So every abstention has its DSO question drafted (PLAN03-076) |

**Reason lines.**

- A reason line is 15px `--ink-2`. It carries "Duly's reading" when its item is a reading.
- A line that rests on a computed item has a text button, "How Duly counted", which opens that item's value and working under the line (3.11). The item is the one `reasonItem` finds, extended so that `<item>.not_made` finds `<item>`. Where `COUNT_BESIDE` names a rule for the reason, that rule opens there too.
- The working opens only on a tap, so the verdict always comes first. This is how the stem-periods-answered verdict shows the item it rests on.

**Data:**

| On screen | From |
|---|---|
| Date line "Monday, September 28" | `today.date`, through a new `formatDay` in labels.ts. It formats the engine's date and never reads the clock |
| Eyebrow | 11.5px, 600, 0.14em, `--accent`. Round A: "F-1". Round B: "F-1 · <STAGE LABEL>, FROM THE DATES YOU ENTERED", from the stage with `state: current`, with the stage part left out while that stage's `reasons` is not empty (RQ-P3, F3). "F-1" alone when no stage is current. For a status that is not F-1: its name |
| Headline | `HEADLINES[verdict.state]` in status.ts |
| Scope line | `scopeLine(scope.rules_checked_on)`: "Based on the dates you entered. Rules checked <date>." until documents-1 section 8 rewrites it. Nothing can be added to Duly before documents-1, so the line never says "documents you added" |
| "Next:" line | `upcoming[0]`: `itemName(id)` and `formatDate(date)`, with "Duly's reading" when `reading` is true. It is absent when `upcoming` is empty, and shown only for `no_open_items` and `needs_you` |
| Reason lines | `verdict.reasons`, through `reasonText`. `COUNT_BESIDE` is kept, as above |
| Metric: unemployment | Shown when `unemployment.days_used` is computed. The eyebrow is "UNEMPLOYMENT COUNT". The value is `unemployment.days_used`. The meta is "of <`unemployment.limit`> days in the rule". A 3px bar shows used over limit: a picture of two engine values, drawn by one pure function, never shown as a number. `unemployment.days_remaining` is in the working. On STEM the limit comes from `stem.unemployment_limit_days`, through the same item (F7) |
| Metric: card end | Eyebrow "EAD CARD ENDS" (F7). The value is at 24px: the current stage's `ends` in round B, or `next.opt.card_ends` in round A. It is shown only when that value exists. Meta, round B only: "<`ends_days_away`> days from today" (RQ-E1). A value that a court's order touches shows today's value, the court line (3.11) under it, and "What the paused rule would change" one tap away (plain-1 section 3) |
| Metric: full-time CPT | Only while the current stage is a program (round B): "FULL-TIME CPT", with `cpt.full_time_days_used` and "days in what you entered". No bar |
| THIS WEEK | Not shown until WorkBook (F6). Home shows the metrics it has data for. A missing metric leaves no gap and no placeholder |
| Metric working | Each metric's eyebrow is a button with a 10px `--ink-3` chevron. It opens the working (3.11) across the full column under the metrics row. One opens at a time |
| QUESTIONS FOR YOU | One row for each of `questions[]`. The title is the question's ask. The meta is its `because` line. Open: the fact line, or the values it was raised for (`about`, shown as today's `AboutValues`), the fact's rule block (`factRule`), and its two answers as secondary pills. The section ends with "Draft the question for your DSO" in `cannot_tell`. Answers already given are in Your case (section 10), and the section's last line is "Your answers are in Your case →" |
| WHAT COMES NEXT | See below |
| DATES, COUNTS AND RULES | See below |
| Footer | The fixed line of 3.9. The check date is in the hero's scope line. Its time waits for updates-1 (HOME-020) |

**WHAT COMES NEXT, round A** (from today's output; this replaces `WhatComesNext`):

- **The next-stage row.** Shown when `lists` holds `stem.extension.what_the_regulation_lists`, or `upcoming` holds a `next.stem.*` entry.
  - Title: "STEM OPT extension".
  - Meta: "Filing window in the rule for your dates: <`next.stem.apply_window_opens`> to <`next.stem.apply_window_closes`>.", with " · Duly's reading" when either entry is a reading.
  - Once the opening day has passed, the engine no longer gives it, so the meta reads "Filing window in the rule for your dates closes <close>." (RQ-E6 fixes this in round B).
  - Open:
    - `LIST_LINE`: "This is what the regulation says. Whether it applies to you is a question for your DSO." (B2);
    - the rule blocks of the two windows and of the list;
    - the secondary pill "Draft the question for your DSO", which opens `stemDraft`.
- **One row for every other `upcoming` entry,** soonest first, except `next.opt.card_ends`, which is the card-end metric.
  - Title: `itemName(id)`.
  - Meta: `formatDate(date)`, with " · Duly's reading" where it is one.
  - Open: the court line when the entry has alternates, then its rule blocks.
- **Order:** the next-stage row, then the dated rows.

**WHAT COMES NEXT, round B:**

- **One next-stage row for each stage with `state: next`.**
  - Title: the stage label, for example "STEM OPT extension".
  - Meta: "Filing window in the rule for your dates: <opens> to <closes>." from the stage's `windows`, with the close date marked "Duly's reading" when it is one.
  - Open:
    - "Whether it applies to you is a question for your DSO." (B2);
    - "<confirmed> of <total> in the list confirmed by you." when the stage has a checklist;
    - the window rules' rule blocks;
    - "Open the checklist →".
- **The matching update row.** Shown only when an approved update matches (updates-3).
  - Title: "One update matches your status".
  - Meta: "<source label> on <topic>, <legal status words> since <date>" (section 9 gives the date).
  - Open: row 7's words and "Read the alert →".
- **One row for each `upcoming` entry of the current stage,** soonest first. The rest are on Timeline.
- **Order:** next-stage rows, the update row, the dated rows. The row "Look up the rules for a change" waits for Scenarios and will come last.

**DATES, COUNTS AND RULES:**

- **Round A.** Every computed item stays reachable:
  - **One row for each group in `GROUPS` that has computed items.**
    - Title: the group name, for example "OPT" or "Unemployment".
    - Meta: the group's item names joined by " · ", on one line, cut with an ellipsis. There are no numbers in the meta.
    - Open: each item as a line, with its name at 13px `--ink-body` on the left and its value at 13px 600 `--ink` with tabular numbers on the right. Each line carries its reading mark, the court line when it has alternates, and the text button "How Duly counted", which opens its working (today's `ItemRow`, restyled).
  - `employment.periods_not_reported` is never shown as a number. Its place holds each job as entered: "<start> to <end>: marked as reported" or "<start> to <end>: not marked as reported". With every job reported, only those lines show.
  - **The last row, "Other rules Duly read for this verdict",** holds the rules in `rules` that no item, entry or list names, that are not shown beside a reason through `COUNT_BESIDE`, and that are not shown with a question through `factRule`. This is today's `VerdictRules`, placed after the data, never in the hero.
- **Round B.** Timeline holds every item under its stage (RQ-P3). This section keeps only "Every date and count, by phase, is on Timeline →" and the rules row.

**Motion:** the stagger of 3.5. Bars fill once for each visit. Chevrons turn, and open parts drop in. The halo shows only for `no_open_items`.

**Tests.** Each of the four states is rendered from an engine sample, and the tests check:

- the mark, the eyebrow, the headline and the lines;
- the hero's limit: at most three reason lines and one control, and never a question or rule inside it;
- the halo only on `no_open_items`;
- metrics only when their items exist;
- round A: every computed item in every sample appears in a metric, a reason line's working, or DATES, COUNTS AND RULES;
- one row open at a time across the page, with only the header toggling;
- the close date marked as a reading;
- the next-stage row's source in round A;
- the B2 line in every next-stage row;
- the court line with no status word;
- every `cannot_tell` sample offers the draft;
- no draft contains "Duly" or a computed date;
- the sentinel test of 14.1;
- a focus on the same day triggers no computation and no repaint.

## 7. Timeline (L-web, round B)

**Layout** (Timeline.dc.html, Timeline-expanded.png):

- The title "Timeline" at 32px, with a 13px `--ink-2` meta line at the right, baseline-aligned: "From the dates you entered". This scopes every row under it (B1, F7).
- Phase rows follow, 22px below, as an accordion. The current phase is open by default, one row is open at a time, and a second click closes it.
- Rows are padded 13px, or 15px for the current phase. The first rule is `--hairline`, the inner rules are `--hairline-inner`, and the closing rule is `--hairline`.
- Every title is full-strength ink. History is never greyed.
- Open parts are indented 30px, or 44px for the current phase, with 8px between lines (12px in the current phase) and 13px `--ink-body` text.
- **Marks**, in a 15px column:
  - A done phase has a filled `--accent` circle with an `--on-accent` check.
  - The current phase has a NOW tag in the left gutter (10px, 700, tracked 0.1em, `--on-accent` on `--accent`, 5px radius, padded 3px by 6px), a 16px 600 title, and a 3px bar up to 400px wide.
    - While the current stage's `reasons` is not empty, the NOW tag is replaced by the `talk_to_dso` mark, with the accessible name "A question for your DSO", and the meta begins with that reason's line (B1).
  - The next phase has a hollow 8px `--ring-next` ring (1.5px).
  - Later phases have a hollow 8px `--ink-3` ring.

**Data:**

| On screen | From |
|---|---|
| Meta at the right | The fixed words "From the dates you entered". There is no count: counting the stages would be a count made by the client, and the path model does not define a requirement yet (F7) |
| One row for each stage, in order | `stages[]`: `label`, or `own_name` for a program ("M.Eng Computer Science" is the student's own words), `state`, `starts`, `ends` |
| Done row | Meta: the span, for example "Aug 2023 to Dec 13, 2025". Open: the stage's `facts` as plain lines with no mark and no "as you entered it" tail, for example "Program end date: Dec 13, 2025". Then the stage's items as item lines (section 6). Links to documents come with documents-1 |
| CPT row | Title "CPT". Meta: each span, joined by " · ". Open: each authorization as "<start> to <end>, full-time" or "part-time". There is no count of authorizations |
| Current row meta and bar | "Day <`days_in`> of <`days_total`> · card <starts> to <ends>". The bar is `days_in` over `days_total` (RQ-E1) |
| Current row open part | "APPLICATION" (10.5px, 600, 0.1em, `--ink-2`), then "Filed <date> · Approval notice <date> · Card received <date>", with each part shown only when it was entered (RQ-P5). There are no checks and no "via USCIS case status". Below that: the stage's items (`stages[].items`) as item lines, plain words first, with the working one tap away, and the court line for `grace.ends` and any item with alternates (plain-1 section 3). Then each job as entered: "Job from <start> to <end>: marked as reported on <`reported_on`>", or "not marked as reported". Under the jobs, the rule block of `opt.report_employer_within_days`, tagged Government guidance. `employment.periods_not_reported` is never shown as a number |
| Next row | Meta: "Filing window in the rule opens <opens>", or "opened <opens>" when the window's `opens_days_away` is below zero (RQ-E6), plus " · <confirmed> of <total> confirmed by you" when the stage has a checklist. Open: "The rule allows a <`stem.extension_months`> month extension. Filing window in the rule for your dates: <opens> to <closes>." Then "Whether it applies to you is a question for your DSO." (B2), then "What the regulation lists for the extension is in the checklist, each with its citation.", and "Open the checklist →" |
| Beyond | Shown only when a pack for a category other than the case's holds at least one rule (`parameters` above 0 in `/v1/status`). Title "Beyond". Meta: those categories' names from labels.ts. Open: "Duly holds rules for <names>, each with its source. They are listed in Settings." and "Open Settings →". It makes no prediction about the student's path |
| Footer | "Every phase keeps its dates and rules together." (F7), then the fixed line |

**Waits.** These wait for documents-1 and documents-3 (section 16):

- Visa and entry.
- The coverage grid "COVERED · 7 OF 8" (TIME-011, TIME-016).
- "Enrollment recorded" and the CPT-on-the-I-20 lines (TIME-012, TIME-014), which need I-20s or an enrollment fact.
- The document links of TIME-010 and TIME-013.

**Motion:** rows rise on the canvas's stagger. The current bar fills once, after 0.4s. There is no confetti and no completion moment. A done phase opens like any other row (F4).

**Tests:**

- The rows follow `stages` in order.
- The current phase is open by default.
- The marks have the accessible names "Done", "Now", "Next" and "Later", or "A question for your DSO" while a reason stands.
- The day numbers equal the engine's.
- Facts are shown plainly, with no mark and no repeated tail.
- No count is written by the client.
- The B2 line is on the Next row.
- The court line holds no status word.
- No row claims "maintained", "verified" or "match".

## 8. Checklists (L-web, round B)

**Layout** (Checklist.dc.html, Checklist-expanded.png):

- **The chip row** (8px apart):
  - Chips are `--surface` with a 1px `--chip-border` edge, a 99px radius, 7px by 15px padding and 13px text.
  - An unselected chip's text is `--ink-2`. A selected chip is `--ink` on `--row-hover`, with a `--chip-selected-border` edge.
  - The chip of the stage with the next filing is weight 600 whether or not it is selected.
  - A finished path's chip carries an 11px SVG check in `--accent`, 6px after its name. It is never the character U+2713 (row 18).
  - Hover edge `--control-border-hover`. Press .97 over 0.12s.
  - The chips switch the whole view, which drops in (3.5).
- Then, 30px below and with 10px between parts:
  - the eyebrow (11.5px, 600, 0.14em, `--ink-2`);
  - the 30px title;
  - the B2 line;
  - a 180px, 3px bar on `--track`, with its line at 13px `--ink-2`, 14px to its right.
- Step rows follow, 24px below. Each is padded 14px by 12px with -12px side margins and 16px between checkbox and text, with `--hairline-inner` rules and a closing `--hairline`.

**Data:**

| On screen | From |
|---|---|
| Chips | `stages` that have a checklist or are done, in order. The stage with the next filing is selected by default. There is no H-1B chip until the h1b pack holds a path |
| Eyebrow | "FILING WINDOW IN THE RULE OPENS <date>", or "OPENED <date>" once the window's `opens_days_away` is below zero, from the stage's `windows` (RQ-E6, F7) |
| Title | The stage label, for example "STEM OPT extension" |
| B2 line | "Whether it applies to you is a question for your DSO." at 13px `--ink-2`, on every stage with `state: next` |
| Bar and line | `checklists[].confirmed` and `total`: "<confirmed> of <total> confirmed by you · Duly's reading of the rules cited on each step". The checklist is L-content's own assembly of several rules, not a published checklist (A5), so it is marked as a reading. The engine counts, and the screen never does |
| Steps | `checklists[].steps[]`: an 18px checkbox, the step's plain label at 14.5px 500, and a 12.5px `--ink-2` meta line with the status tag (Regulation, Government guidance or School policy) and the citation (primary, pinpoint, from `rules[rule_id].citation`), plus "Duly's reading" where the rule is one. The label is a text button that opens the rule's plain words, and "Read the exact words" is one more tap. Labels say what the source lists, never what the student should do (RQ-P4, B4). Nothing on the screen orders the steps as actions |
| A confirmed step | The label is struck through in `--ink-2`, with "Confirmed by you, <`confirmed_on`>" at the right at 12px `--ink-2`. Duly never checks a step itself. A step is never shown as done because of a fact Duly decided |
| Toggle | Records `step.<checklist>.<step>` with `today.date` and computes again. Unticking withdraws it. The box shows the person's own tick at once, and the count follows the engine's answer |
| A step that varies by school (`school: true`) | The line "This step varies by university. Your school's process is the authority here." in 13px `--caution` at line height 1.5, 8px under the label. Under it, the secondary pill "Draft the question for your DSO", which opens `stemDraft` in place (D57) |
| All steps confirmed | The quiet completion moment, and "<total> of <total> steps confirmed by you. The filing window in the rule opens <date>." (row 19), at 13.5px 600 `--accent`, 18px under the bar. It reads "opened <date>" when the window's `opens_days_away` is below zero (RQ-E6) |
| A finished OPT path | No "COMPLETE" eyebrow and no completion moment (F4). The 30px title "OPT: filed <date>, approved <date>" uses the dates as entered. Then a 14.5px `--ink-2` line: "Filed on day <`opt.filed_day_of_window`> of the window. Approved <`opt.days_filed_to_approval`> days after filing. No RFE recorded." Each sentence is shown only when its item or answer exists (RQ-E3, RQ-P5). Then the recorded dates as plain 14px `--ink-body` lines, padded 12px, with `--hairline-inner` rules and no check marks (CHECK-019, F3) |
| A finished CPT path | The title "CPT", the line "The authorizations, with the dates you entered.", then each span. There is no count |
| Footer | "Every step cites its source. Nothing files itself." and the fixed line of 3.9 (CHECK-021, F7) |

- **Steps come from the pack.** The steps are what an official source lists (A5), written by L-content with at least one primary rule each, and checked like plain words (RQ-P4). The canvas's six steps are not copied.
  - "Assemble your evidence pack" rests on no rule. It waits for WorkBook, and the word "evidence" is never used (IMPL-055).
  - The 60-day rule and the card end appear through RQ-E2.
- **Motion:** the view drops in when a chip switches. The bar moves its width over 0.35s and does not fill on entry. Checkboxes grow and shrink. When the last step is confirmed, 3.6 plays.
- **Tests:**
  - The steps and the count equal the engine's.
  - A toggle records the engine's day and computes again.
  - A confirmation absent from `answers_read` is not shown as standing.
  - The B2 line and the reading mark are present.
  - The caution line uses `--caution` and never amber.
  - The draft holds no "Duly" and no computed date.
  - The chip check is an SVG.
  - The next-filing chip is 600 in both states.
  - No confetti and no completion moment appear on the OPT or CPT views.

## 9. Updates (L-web)

**Layout** (Updates.dc.html, Updates-expanded.png):

- A title at 30px. Nothing sits opposite it until updates-1 records the time of a real check of update sources (RQ-E5). The canvas's "Checked today, 6:00 AM" suggests a check that no pipeline performs yet.
- **A hero item,** 34px below the title, with its parts 12px apart:
  - The eyebrow "MATCHES YOUR STATUS" (11.5px, 600, 0.14em, `--accent`), with the source line 10px beside it (12.5px `--ink-2`).
  - The headline at 20px 600, line height 1.3, at most 660px wide, as in the markup (UPD-004).
  - The status line (13px `--ink-2`).
  - The body (14px `--ink-2`, line height 1.55, at most 640px wide).
  - The links row (20px gaps).
- **The list,** 40px below the hero. Its eyebrow (11px, 0.12em) is "EVERYTHING ELSE" when there is a hero, and "PUBLISHED UPDATES" when there is none.
  - It is an accordion, closed by default.
  - Each row has a 100px source-and-date column (12.5px `--ink-2`), a 14.5px 500 title, a 12px 600 `--ink-2` kind label at the right, and a chevron.
  - Open parts are indented 116px, with 13.5px `--ink-body` text at line height 1.5, and the source links 18px apart.

**What exists today:**

- No approved update exists, and no route serves one. The page passes an empty list, and the screen shows its empty state.
- The components take the route's response as props. They are tested with test data valid against update.schema.json and RQ-U1.
  - The test data is marked as test data.
  - It never uses the canvas's PA-2026-05, SEVP or court items.
- updates-3 wires the route (RQ-A2).

**Data:**

| On screen | From |
|---|---|
| Title | From the route's `matching` count (RQ-A2), never the length of a list. `matching` 1: "One update matches your status." `matching` above 1: "<`matching`> updates match your status." `matching` 0: "No published update matches your status." (F7) |
| Empty state (nothing published) | The title for 0, then "Duly shows an update only after its words are found in a primary source, two checks pass and a person at Duly approves it. Every item links to its original source." |
| Published, none matching | The title for 0, no hero, then "PUBLISHED UPDATES" with every row |
| Hero | The first matching update. The other matching updates come first in the list |
| Hero eyebrow and source line | "MATCHES YOUR STATUS", then "<agency> · <document> · <dated>" from `source_label` (RQ-U1). Below the headline block: "Shown because your status is <matched stage label>." from `matched` (A4, row 26) |
| Status | "<legalStatusWords(legal_status)> since <on>", where <on> is the `on` of the latest `history[]` entry whose `legal_status` is the update's. For example, "In effect since Sep 24" (row 27). With no such entry, it reads "<words>, as of <`status_as_of`>", because `status_as_of` is the day the status is reported as of, not the day it began. There are no impact dots and no impact grade |
| Headline and plain words | `headline` and `plain`, then "What changed, where it is written, and its status are below." (row 28) |
| Meaning | Row 29: the update's plain words. Then, when the matched stage has a window ahead, "The <item name> for your dates is <date>.". Then "What it means for your filing is a question for your DSO." and the secondary pill "Draft the question for your DSO", which opens `updateDraft` in place (D57, below) |
| Links | "Open the checklist →" (13.5px 600), then the primary sources only, each named by its claim's `source_type` (RQ-U1): "USCIS notice", "Federal Register", "SEVP broadcast", "Court order", "Regulation". The client never guesses the kind from the URL. A claim whose `source_kind` is `signal` is never shown (row 30) |
| Other rows | Source and date, the plain headline, and the kind label ("Reminder", "Context" or "Change"; row 31). Open: the plain words and their sources. A row about a court shows plain words about what the court did, and "Read the court's order" when its claim's `source_type` is `court_order`. It never says "before a court", "enjoined" or "litigation" (F7, row 33) |
| Footer | "Updates that match your status come first. Every item links to its original source." (F7), then the fixed line |

**Legal status words.**

- `legalStatusWords` in labels.ts names all eleven values of update.schema.json and of the pack's regimes:
  - announced: "announced, not in force"
  - proposed: "proposed, not in force"
  - comment_period: "open for public comment, not in force"
  - omb_review: "under review before publication, not in force"
  - final: "final, not applied"
  - effective: "in effect"
  - enjoined: "paused by a court"
  - stayed: "on hold"
  - vacated: "set aside by a court"
  - appealed: "under appeal"
  - rescinded: "withdrawn"
- A test walks both enums, so no status reads "not named on this screen".
- `FROM_A_COURT` gains `stayed` for regimes whose source is a court order. For updates, the link name follows the claim's `source_type`.

**`updateDraft` (drafts.ts, D57):**

- The subject: "A question about <topic>".
- The body:
  - "Hello," and "I have a question about my F-1 record."
  - "I read <agency> <document>, dated <dated>." (the update record's own words and date).
  - The student's own facts as entered: the program end date and the card dates, as `factsOn` gives them.
  - One ask: "Could you tell me whether this changes anything your office needs from me?"
  - "Thank you," and "[Your name]".
- It never contains "Duly", never a computed date (in particular not the date in the Meaning block), and never a statement about the law or its status: no legal status words, no "requires", no "must".

**Motion:** the title rises, and rows follow the canvas's stagger. Chevrons turn, and open parts drop in. There is no amber anywhere.

**Tests:**

- The empty state, and the published-but-none-matching state.
- The hero from test data.
- The title reads `matching` and never counts the list.
- Signal claims are hidden.
- The status words cover all eleven values.
- The start day comes from `history`.
- Links are named from `source_type`.
- `updateDraft`: no "Duly", no computed date, no status word, and it ends "Thank you," and "[Your name]".
- No text on the screen fails `calmProblems`. An update whose words would fail is never shown in full: only its source link is shown, and RQ-U1 blocks it upstream.

## 10. Your case, Settings, Feedback (L-web)

These three pages were never drawn on the canvas. They are designed from the nine: a 720px column, a 32px title, section eyebrows (11px, 0.12em), hairline rows, and the fields and pills of 3.11.

**Your case** replaces CaseForm.tsx.

- Under the title, one 13px `--ink-2` line: "Everything here is as you entered it." It is said once for the page, never at the end of each row.
- Sections: STATUS, PROGRAMS, PRACTICAL TRAINING, JOBS, CAP-GAP and YOUR ANSWERS. With F12's alternative, DOCUMENTS (the count) is added until documents-1.
- Each row has a 14.5px title, for example "Master's program", and a 13px `--ink-2` meta line, for example "Aug 2023 to Dec 13, 2025", with a pencil at the right.
- **Editing in place (PLAN03-043 to 045):**
  - The pencil opens the row's fields inside the row.
  - Save (primary pill) and Cancel (text) sit beside the last field, where the cursor is.
  - Remove is a quiet `--ink-2` text button at the row's far left, away from Save, and never red. It asks "Remove this <program>?" with two choices, Remove and Keep.
- "Add a program" and "Add a job" are quiet buttons at the end of their sections.
- A saved change computes the case again.
- The Include checkboxes become two-choice rows: the question at 14px, with compact Yes and No option cards beside it. For example: "Did you apply for post-completion OPT?"
- **YOUR ANSWERS** holds the answers moved from today's `Questions`. Each row is titled with the ask, with the meta "Your answer: <answer words>, <day>". Its open part holds "Change the answer to <other answer>" (a text button) and, at the far left, "Remove the answer". Answers not in `answers_read` sit in a last row, "Answers not used for the facts entered now", with today's line and Remove.
- The heading "Dates from your documents" becomes the page title "Your case". documents-1 later adds "Dates you enter".

**Settings:**

- Time zone, with a pencil (D33).
- "Where your answers are stored": one sentence from web/src/lib/privacy.ts, which this round creates and documents-1 extends.
  - Round A, web and desktop: "What you enter is kept only while Duly is open. Closing it clears it."
  - Round B, web: "What you enter is kept only while this page is open. Reloading clears it."
  - Round B, desktop: "What you enter is kept on this Mac, encrypted." On Windows: "this PC" (D7, documents-1 section 14).
- "Rules": each pack's category, version and check date, from `/v1/status`.
- "Motion and appearance follow your system settings."
- "Delete what you entered": a quiet `--ink-2` text button with a two-choice confirmation, Delete or Keep. It clears the case and opens Onboarding. On the desktop in round B it also clears the case bridge.

**Feedback:**

- "Tell us what works and what does not. Nothing from your record is attached."
- A text box and a primary pill "Copy feedback".
- "Write an email" appears only when `product.feedback_address` is set (F8).
- Nothing is sent by Duly.

**Tests:**

- Edit, Cancel and Remove, each with its confirmation.
- A change computes the case again, and the old result is gone.
- The zone change reaches `time_zone`.
- Answers change and withdraw as today.
- Delete clears the case.
- The provenance line appears once.
- Only privacy.ts holds sentences about storage (documents-1 section 14), and each sentence is true for its round and platform.

## 11. What the path model, the engine and the api add

Each of these is a named requirement. Those marked P are asked of path-1 if it has not run yet, or of a path round 2 if it has. Either way they land before round B. Every value is sourced by L-content, or it is left out and the log says so (D35).

| Id | Owner | Requirement |
|---|---|---|
| RQ-P1 | path model | The F-1 path holds every program the student had in the US, in order. Each has: a level, from a sourced list of the levels an F-1 student can hold (L-content finds the list in a primary source; a level with no rule gives `cannot_tell` rather than a guess); the student's own name for it; a start date; the program end date; its standing (studying, completed, transferred or stopped); and an earlier end date when the end date changed. How the pack holds the repetition is path-1's choice. The output gives one stage for each program. The engine reads the list where today it asks `opt.earlier_at_this_level`, and shows it as the student's own statement. The standing and the changed end date are used only where a sourced rule reads them (D12-006, 007, 008 and 010 are not claimed here) |
| RQ-P2 | path model | CPT authorizations and pre-completion OPT periods are periods on each program, each with `full_time`. `cpt.full_time_days_used` is computed from them by a calculator for days in flagged periods, and the typed count goes. Pre-completion OPT time is read where the sourced rule deducts it from post-completion OPT (D12-005 is not claimed here) |
| RQ-P3 | engine output | `stages[]`: `id`, `category`, `label`, `own_name`, `state` (done, current, next or later), `starts`, `ends`, `ends_days_away`, `days_in`, `days_total`, `rule_ids`, `items`, `windows` (RQ-E6), `lists`, `checklist`, `facts` (the fact ids and values entered for it), and `reasons` (the verdict reasons that rest on the stage's items or facts, such as `cap_gap_petition_not_active` or `grace_with_cap_gap`). Every id in `computed` and `upcoming` is in exactly one stage's `items`. A test checks this |
| RQ-P4 | path model and engine output | A checklist for a stage, as pack data: ordered steps, each with an id, a plain label, `rule_ids` (at least one, primary), `who` (student, employer or school) and `school`. The checklist carries `reading: true`, because it is L-content's assembly of several rules (A5). Each label passes `tools.sources.plain`'s checks (general wording, no "you", no instruction, calm) and says what the source lists, never what to do. The output's `checklists[]` gives the steps, each step's `confirmed_on` read from `confirmations` (`step.<checklist>.<step>`), and `confirmed`, `total` and `reading`. Read confirmations go into `answers_read`. L-content writes the STEM OPT checklist from the rules already sourced (`stem.requires.*`, the 60-day rule, the card end) |
| RQ-P5 | path model | Facts the student may add: `approval_notice_date`, `card_received_date` and `rfe_received` on OPT and STEM, each a `happened` fact where it is a date, and `reported_on` on an employment period |
| RQ-E1 | engine output | `upcoming[].days_away` and `upcoming[].inputs` (as on computed items), and on stages `ends_days_away`, `days_in` and `days_total`: whole days in the person's zone, computed as arithmetic with the working shown (A3). Clock-injected property tests |
| RQ-E2 | engine output | Every rule that a stage, a window or a step names is in `rules`, also while its stage is only next. Today `stem.file_within_days_of_recommendation` and `stem.extension_months` appear only once STEM is entered |
| RQ-E3 | engine output | For a finished filing with the facts entered: `opt.filed_day_of_window` and `opt.days_filed_to_approval` (and the same for STEM), each with inputs and `rule_ids` |
| RQ-E4 | engine output | The current stage's `ends` holds the card end on STEM as on OPT. Today `next.opt.card_ends` exists only for OPT without STEM |
| RQ-E5 | engine output, later | `scope.rules_checked_at`, once updates-1 records the time of each scheduled check. Until then no screen shows a time |
| RQ-E6 | engine output | `stages[].windows[]`: `id`, `opens`, `closes`, `opens_days_away`, `closes_days_away`, `rule_ids`, `status`, `reading` and alternates. A window is kept from before it opens until the day after it closes, so its opening date stays in the output while it is open. Today `upcoming` holds only dates after today (engine/f1.py, `_Working.add` and `add_ahead`), so a window's opening date disappears as soon as it opens. The screens read "opened" from `opens_days_away`, never by comparing dates themselves |
| RQ-A1 | api | `POST /v1/compute`: case.schema.json in, engine output out. Stateless. It gives the same refusals as `/v1/compute/f1` (NOT_A_NUMBER, NOT_JSON, NOT_YET, `first_problem`). A category whose pack has no path gives `cannot_tell` with `category_not_covered:<id>` (path-1). desktop-1's local token rule applies |
| RQ-A2 | api, updates-3 | `GET /v1/updates` returns approved updates only (`publish_blockers` empty), and `matching`, the number that match the case. The server gives each one `matched`: the stages and fields of the case that matched (A4, UPD-017). Matching uses `categories`, so a person whose status is not F-1 is matched too |
| RQ-U1 | contract, updates-2 and updates-3 | update.schema.json gains `plain`, `source_label` {agency, document, dated}, `topic`, `kind` (change, reminder or context) and `stages`, and each claim gains `source_type` (uscis_notice, federal_register, sevp_broadcast, court_order, regulation). `publish_blockers` also refuses an update whose `plain`, `headline` or `topic` is missing or fails the plain checks and `calmProblems`, or holds a number that appears in none of its claims' quotes |
| RQ-K1 | desktop | `window.duly.case.read()`, `.write(case)` and `.clear()`, typed by contracts/desktop_case_bridge.schema.json. Main keeps one file in the app's data folder, encrypted with Electron `safeStorage`, whose key is in the macOS keychain. It is checked against case.schema.json on every read and write, and anything else is refused. No path comes from the page. documents-1 moves the case into duly.db and deletes the file |

## 12. Words: the canvas, the boundary and later decisions

Layout, tokens, motion and structure follow the canvas. The words give way to BOUNDARY.md and later decisions (D53).

**Rows of canvas-conflicts.md applied in this round:**

| Row | Where | Words on screen |
|---|---|---|
| 1 | Home hero | The four D4 headlines. No shield word, and no shield (F3) |
| 2 | Home hero | "Based on the dates you entered. Rules checked <date>." Row 2's "<n> documents you added" is not true before documents-1 (F7, F12) |
| 3 | Home | "WHAT COMES NEXT" (`NEXT_HEADING`) |
| 4 | Home row | "<stage label>" / "Filing window in the rule for your dates: <opens> to <closes>." |
| 6, 7 | Home row 2 | "One update matches your status" / "<source> on <topic>, <legal status> since <date>", and row 7's open text |
| 10 | Timeline | "From the dates you entered", with no counts (F7) |
| 13 | Timeline | Row 13, with the list sentence moved to the checklist and the B2 line added (F7) |
| 14 | Timeline | Beyond as in section 7. "See the H-1B rules" waits for the pack. The prediction "when your record reaches them" is dropped (F7) |
| 18 | Checklists | An SVG check |
| 19 | Checklists | "<total> of <total> steps confirmed by you. The filing window in the rule opens <date>." |
| 24, 25 | Checklists | Quiet views for finished OPT and CPT, without the completion moment (F4) and without counts (F7) |
| 26 to 32 | Updates | As in section 9 |
| 33 | Updates | Replaced by plain words about what the court did (F7) |
| 49 | Onboarding | The why-line shape on every view. The storage sentence once |
| 51 | All | No confetti. The quiet completion moment where F4 places it |
| 52 | Home | The halo of 3.5, tuned for the mark (F11) |
| 53 | All | Amber only on the AI star. Caveats in `--caution` |

**Everywhere:**

- Plain words come first, and "Read the exact words" (the quote, the citation with its link, and the day checked) is one tap away (D56).
- No screen shows litigated, enjoined, regime, operative, alternate, "before a court" or "blocked by a court".
- Status tags read Regulation, Government guidance, School policy, "A court paused a change", or "Proposed, not in force". They are words in a meta line, never pills.
- Every place that shows a stage with `state: next` also shows "Whether it applies to you is a question for your DSO." (B2).
- A stage is named only with its scope, "from the dates you entered", and not while a verdict reason rests on it (B1).
- Every DSO draft is in the student's voice. It never says Duly and never states a date Duly computed. It ends "Thank you," and "[Your name]" (D57).
- No raw rule id such as `opt.unemployment_limit_days` is ever shown. The citation is shown instead.
- Buttons name outcomes. "Compute" is gone.
- Links inside Duly end with " →", as the canvas draws them.
- Provenance is said once per page or section, never at the end of every line.
- There are no deficit counters and no countdowns (CANVAS-061).
- There are no long dashes and no emoji. Every fixed string passes `calmProblems` and the copy lint.

**Readings beyond canvas-conflicts.md, for the founder:** these are listed in section 17.

## 13. Today's web code: kept, moved, replaced

| File or part | What happens |
|---|---|
| lib/status.ts | Kept: `HEADLINES`, `reasonLine`, `rulesCheckedOn` (point 35), `fetchStatus`. `no_documents` reads "No document is attached to these dates yet." (documents-1's words). `category_not_covered:<id>` reads "Duly holds no rules for <name> dates." |
| lib/labels.ts | Kept. It gains `formatDay`, category names, stage words, eyebrow and metric labels, the "Duly computes" names by item id, `FIXED_NAMES` (14.1), and `legalStatusWords` for all eleven statuses. `scopeLine` reads "Based on the dates you entered. Rules checked <date>." `listName` drops the hard-coded month count: "What the regulation lists for the STEM OPT extension" |
| lib/drafts.ts | Kept: `dsoDraft` and `stemDraft`. `dsoDraft` also drafts for `cannot_tell`: rule_in_litigation asks "Could you tell me which rules apply to these dates in my case?", a conflict asks "Some of the dates I have do not fit together. Could you look at them and tell me which dates your office has?", a judgement item carried inside `cannot_tell` keeps its own ask, the rules' staleness adds no ask, and anything else asks the general question. `stemDraft` drops "24-month" and asks about "a STEM OPT extension". It gains `updateDraft` (section 9). In round B the drafts read the student's facts from the generic case, and the CPT fact lists each period as entered ("I had CPT from <start> to <end>, full-time.") instead of `cpt.full_time_days_used`, which is a computed number and never the student's own claim |
| lib/privacy.ts | New. It holds every storage sentence (section 10) |
| lib/answers.ts, lib/caseForm.ts | Kept: `answer`, `withdrawAnswer`, `keepFitting`, the `buildCase` checks and their `problems`, `EMPTY_CASE`, `reportedZone`, `zoneChoices`. The date fields compose to ISO before `buildCase`. With F12's recommendation the count field leaves and `documents_count` is 0. Round B adds the translation to case.schema.json facts |
| lib/calm.ts | Kept, and run over every new string |
| lib/compute.ts | Kept, with every refinement. It gains the RQ fields |
| Result.tsx | Its behaviours are kept and restyled by 3.11, and placed: `RuleCard` (without the rule id) becomes the rule block. `CourtLine` becomes the court line. `ItemRow`'s working becomes the working, under a reason line, a metric or an item line. `UpcomingRow` becomes the dated rows of WHAT COMES NEXT. `WhatComesNext`'s list and STEM draft become the round A next-stage row. `Items` becomes DATES, COUNTS AND RULES in round A, and Timeline's stage items in round B. `VerdictRules` becomes that section's last row. `COUNT_BESIDE` moves into the reason line's working. `Questions` becomes QUESTIONS FOR YOU (open questions) and Your case's YOUR ANSWERS (given and unread answers), with `AnsweredFact`. `DraftBlock` with `CopyButton` becomes the draft view |
| App.tsx | The state rules are kept (section 4), with the focus rule changed. The form-on-top 640px layout is replaced by the shell and the routes |
| CaseForm.tsx | Replaced by Onboarding and Your case. Carded fieldsets become hairline rows |
| styles.css | Replaced by the shell's styles. The motion that styles.test.ts pins is kept: drop-in with transform only, the 0.97 press, the 0.16s row background, reduced motion, and no amber. The `.verdict` card, the `.rule` and `.question` cards, the `.draft` box, tag pills and monospace values all go, and 3.11 replaces each one |
| tokens.css | Kept, and grows to the table in 3.2. `--halo-opacity` is replaced by the halo tokens. The workbook scope is unchanged |

## 14. The tests

### 14.1 L-tests, first, for the data the screens read

These are files of their own. They are written from this SPEC and the contracts, and they are not expected to pass yet.

- **View functions.** Pure functions in web/src/lib/views/, whose signatures this SPEC fixes:
  - `homeView(output, updates)`
  - `timelineView(output, status)`
  - `checklistView(output, selected)`
  - `updatesView(response, output)`
  - `onboardingSteps(state)`
  - `yourCaseView(case, output)`

  There is one test for each row of the data tables in sections 5 to 10. Each asserts which source field each shown value reads, and that a view part is absent when its field is absent. For Home in round A, a test asserts that every computed item in every sample is reachable (section 6), and that the next-stage row reads `lists` and `next.stem.*`.
- **The sentinel test (HOME-021, and every screen).**
  - Render a screen from its sources. Then render it again with every number and date in each source replaced by distinct sentinels. The sources are the engine output, the case as entered, the updates route's response (records and `matching`), and `/v1/status`.
  - A digit run on screen that did not change must be in the fixed list the test builds:
    - the citation text of each rule and regime shown;
    - the form and category names in `FIXED_NAMES` in labels.ts (I-20, I-94, I-765, I-797, I-983, F-1, H-1B, O-1, EB-1A);
    - ordinals taken from item and question ids, such as the 1 in "Validation report 1 due";
    - the Onboarding step label.
  - Any other unchanged digit run was written by the client, and the test fails. Bar widths are not text and are exempt.
  - Adding a name to `FIXED_NAMES` needs the reviewer. The test is never loosened.
- **Samples.** Engine outputs made by the engine with fixed clocks, in web/src/lib/samples:
  - a case like the canvas's in each of the four verdict states;
  - a case with `documents_count` 0;
  - STEM OPT;
  - a student still in a program;
  - the court-paused case;
  - a filing window already open;
  - a status that is not F-1 (round B).

  A pytest parity test computes each sample's case again and requires the same output, so the screens are always tested on real engine output.
- **Engine and api (round B):**
  - tests/unit/engine for RQ-P1 to P5 and RQ-E1 to E4 and E6, with clock-injected property tests for `days_away`, `days_in`, `days_total` and the windows' days.
  - A window's `opens` stays in the output while it is open.
  - Every computed and upcoming id belongs to exactly one stage.
  - A stage's `reasons` hold the judgement items that rest on it.
  - Steps are never confirmed without an answer.
  - Every rule named by a stage, window or step is in `rules`.
  - Step labels pass the plain checks.
  - Tests for `POST /v1/compute`'s refusals and `category_not_covered`.
  - Contract parity with compute.ts.
- **Words:**
  - Every canvas phrase that section 12 replaces never appears in the built strings: ALL CLEAR, Everything is in order, Nothing needs you, YOUR NEXT MOVE, nothing missed, AFFECTS YOUR CASE, MODERATE IMPACT, Worry, Community discussion, AILA summary, Nothing to do, You're set, Watching, VALID UNTIL, evidence pack, UNEMPLOYMENT CLOCK, days left, One thing worth knowing, 24-month, being added.
  - Every fixed string passes `calmProblems`.
  - Every draft passes the D57 checks.
  - `legalStatusWords` names every value of both enums.
- **Tokens and contrast:**
  - tokens.css holds every token of 3.2 in light and dark.
  - **Text pairs:** each text token measures at least 4.5:1 on every background it is drawn on, in both themes. Text tokens are `--ink`, `--ink-body`, `--ink-2`, `--accent` and `--caution`. Backgrounds are `--ground`, `--surface`, `--row-hover` and `--option-hover`. The one exception is `--caution` on `--row-hover`, which 3.7 keeps apart. `--on-accent` is measured on `--accent` and `--button-hover`.
  - **Mark pairs:** each measures at least 3:1 in both themes:
    - `--accent` on `--ground`, `--surface`, `--row-hover` and `--track`;
    - `--on-accent` checks on `--accent`;
    - `--ink-2` on `--ground`;
    - `--ink-3` on `--ground`, `--surface` and `--row-hover`;
    - `--ring-next` on `--ground` and `--row-hover`.
  - `--ink-3`, the rings and the track never appear in a `color` property. No `--faint` token exists.
  - Only the four Instrument Sans weights are imported. No Duly screen uses `--font-mono`.
- **Landmarks.** tests/design/landmarks.json gives each screen's expected boxes and type at a 1280 by 832 page:
  - the sidebar at 0 to 208, with its bottom group at the window's bottom;
  - the column at x 384 and 720 wide;
  - each file's top padding;
  - the wordmark, eyebrows, the hero headline (with its line height and gaps), the metric value (28px, 600, -0.01em), the date value, the section rows, and the open-part indents (2px, 30px, 44px, 116px);
  - the NOW tag and the 400px bar;
  - the Checklists chips, the 180px bar and the step rows;
  - Onboarding's wordmark, pips, step label, question title, option card, why line, Back and Continue, with the header's top fixed across views;
  - the same column centred in the main area at a 1200 by 832 page.

  landmarks.json is read from the canvas markup. Then these overrides are applied, each listed in the file with its reason:
  - text drawn in #8A8780 or #B0ACA3 takes `--ink-2`;
  - chevrons drawn in #B0ACA3 take `--ink-3`;
  - the unchecked checkbox and later ring drawn in #C9C5BC take `--ink-3`;
  - the next ring drawn in #8FA6D9 takes `--ring-next`;
  - the link hover #0A4C41 takes `--accent-hover`;
  - the top padding is 54, 52, 52 and 50 by file, and 52 for undrawn pages;
  - the hero mark keeps its 15px box, but its drawing is not compared;
  - Home has two metrics, so only the first metric's left edge and the divider are compared;
  - text content is never compared, and where words change, only left, top and height are compared;
  - dark shots compare colours against the dark tokens.

### 14.2 L-web, beside the code

- Component tests for every screen, as each section lists.
- **The shell tests:**
  - the sidebar lists exactly the screens that exist, in canvas order, and round A's routes exclude Timeline and Checklists;
  - `aria-current` is set;
  - the routes load;
  - keyboard walking reaches every control;
  - an accordion's open part never toggles its row;
  - every control's hit area is at least 44px, or tiles its pitch without overlap under `pointer: fine`, and is at least 44px under `pointer: coarse`;
  - reduced motion leaves every screen complete.
- **Section 4 tests:** a focus on the same day computes nothing and changes no node. A new day computes again. A recompute never plays the rise again.
- **styles.test.ts** grows to cover:
  - `color-scheme` and font smoothing;
  - rise and the stagger;
  - Onboarding's -8px, 0.3s drop;
  - presses at 0.12s (.97, .985, .92 and 1.08);
  - hover edges;
  - chevrons;
  - bars, including no fill on entry for the Checklists bar;
  - the halo's tokens, only on the mark, and resting after three breaths;
  - the completion moment.

  Every one is off under reduced motion.
- Today's tests in App.test.tsx, Result.test.tsx and Plain.test.tsx move with their behaviours. Each changed test names the point of this SPEC that requires it. Nothing a point supports is loosened.

### 14.3 L-desktop, beside the code (round B)

- The case bridge refuses a case that fails the contract.
- The file on disk holds no plaintext date.
- Clear removes the file.
- The page can name no path.
- The shots runner's request map serves samples only in the shots entry, never from main.ts.

### 14.4 The visual check: `make design-shots`

The founder runs it on this Mac, outside the sandbox, like the smoke run.

- desktop/src/shots.ts opens the built web app at page sizes of 1280 by 832 and 1200 by 832 (desktop-1's first window, less its title bar).
  - It serves the samples in place of the engine.
  - It renders each screen in light and dark, Home in all four states, and each Onboarding view.
  - For F11 it adds one still of the quiet hero at the top of a breath.
- **It writes:**
  - `.scratch/design/<screen>-<theme>.png`;
  - `landmarks.json`, the measured boxes and computed styles of every landmark;
  - `<screen>-beside-canvas.png`, with the built screen on the left and the canvas PNG on the right, at the same scale.
- **A check** compares the measured landmarks with tests/design/landmarks.json, after its overrides. Boxes may differ by up to 2px. Sizes, weights and colours must match exactly. It also checks that the metrics row's top is at or above 480px in every Home state. It exits 1 on a miss.
- **It is not a pixel diff.** The canvas PNGs were rendered without the webfont, and every place the boundary changes the words changes the pixels. The side-by-side sheets are for the reviewer and for the founder's walkthrough (Phase 4).

## 15. Lanes and order

At most four agents run at once (factory/config.yaml).

- Round A needs neither path-1 nor desktop-1. It touches web/src only, so it may run now beside path-1, or after desktop-1 (F9).
- Round B needs path-1 and desktop-1 on main.
- design-1 comes before documents-1. documents-1 section 9 builds Documents on this shell and adds it to this sidebar.

| Step | Lanes | Builds |
|---|---|---|
| A0 | Founder, alone | The dependency approval, and answers F2 to F14 |
| A1 | L-tests (test-author) | 14.1 for round A: the views of Home, Updates, Onboarding (one program) and Your case, the samples and their parity test, the sentinel test with its sources, words, tokens, text and mark contrast, and landmarks with their overrides |
| A2 | L-web (builder) | Section 3, Home (round A), Onboarding (one program), Your case, Settings, Feedback, Updates with its empty state, privacy.ts, the label and draft changes of section 13, and 14.2 |
| A3 | L-review (reviewer) | Every screen against the design laws of DESIGN-SPEC.md, one line for each law and screen in reviews/design-1.md (PLAN03-039), and every new string against BOUNDARY.md and D56 |
| B0 | Founder, alone | The contracts of section 2, and answer F1 |
| B1 | L-tests (test-author) and L-content (rulepack-drafter) | L-tests: 14.1 for round B. L-content: RQ-P1, P2, P4 and P5 in the F-1 pack, with every level, step and fact sourced, every step label checked, and a progress-log entry for every rule found missing |
| B2 | L-engine, L-api, L-desktop (builders) | L-engine: RQ-P3, RQ-E1 to E4, RQ-E6 and checklists. L-api: RQ-A1. L-desktop: RQ-K1 and the shots runner |
| B3 | L-web (builder) | Timeline, Checklists, Onboarding for every program, the Home stage eyebrow, days, stage rows and checklist progress, the saved case, and the switch to `POST /v1/compute` |
| B4 | Founder, L-security (red-team), L-review (reviewer), L-audit (auditor) | Founder: `make design-shots` and the walkthrough. L-security: attacks the case bridge (plaintext on disk, a hostile case, a path from the page). L-review: as in A3, plus the pack's steps beside their sources. L-audit: re-audits every covered row and writes docs/requirements/audits/design-1.md |

**Checks:**

- Every round: `npm run typecheck -w web`, `npm test -w web`, the lint and the copy lint.
- From B2 on: `make test-offline BASE=design-1` and `uv run pytest tests/holdout -q`.

**Why this order:**

- Tests are written first, from this SPEC and the contracts.
- The look reaches the founder in round A, on the output that exists today.
- Round B builds the screens that need the path model, after the path model and the window exist.

## 16. What waits, and why

| Rows | Waits for | Why |
|---|---|---|
| DOCS-001 to DOCS-014 (not superseded), TIME-011, TIME-016, SCEN-015 | documents-1, documents-3 | The vault, the reader, and passport and visa reading |
| TIME-003, TIME-010, TIME-012, TIME-013, TIME-014 | documents-1, or an enrollment fact | Visa and entry, "N documents" links, "transcript in vault", "Full-time enrollment every term" and the CPT-on-the-I-20 lines need documents or a fact the pack does not hold |
| RCOMP-021 | documents-1 and a published checklist | Completeness against a published list of documents needs the vault. The round B checklist is Duly's reading, not a published checklist |
| HOME-004, DEC-D11-001 | documents-1 section 8 (F12) | With F12's recommendation, no verdict other than "Can't tell yet" stands before typed dates are checked. Both are built and tested on samples |
| WBC-001 to WBC-018, HOME-008, CHECK-012, ONB-003, ONB-004, ONB-006, DEC-D09-002, PLAN04-041, PLAN04-050, CANVAS-008 | Phase 8 | WorkBook, and its setup that owns work type and field (D9) |
| SCEN-001 to SCEN-023 (not superseded), HOME-018, HOME-019, CANVAS-063, CANVAS-022 | The assistant route | No route, and no what-if mode (D60). The blue chip hover belongs to the scenario chips |
| HOME-011 | updates-3 and Scenarios | Three rows need the update row and the change row |
| CHECK-014 to CHECK-017 | A sourced h1b pack | The pack is empty. No registration month is sourced |
| DEC-D47-002 | Packs with a path beyond F-1 | A student in another category sees "Can't tell yet" |
| DEC-D09-001 | Packs for every status | Round B tags the statuses whose packs exist as `categories`. A status named under Another status is kept as the person's words until its pack exists |
| PLAN03-066 | The saved case (round B, desktop) and a measured check | Round A and the web start again at Onboarding on every launch. No test measures the 30 seconds yet |
| UPD-017, UPD-001 and the rows built with test data | updates-2, updates-3 | No approved update exists. Matching is done on the server |
| HOME-020, UPD-001's check time | updates-1 | No scheduled check records a time yet (point 35) |
| MOB-001 to MOB-008, CANVAS-034 | Not planned (D7) | |
| CANVAS-004, PLAN03-085 | D8, D18 | Parked |

## 17. For the founder

Each question has a recommendation. Round A needs F2 to F14. Round B needs F1.

- **F1. Where the case is kept before documents-1.** Recommendation: on the desktop, one file encrypted with the Mac's keychain (RQ-K1), which documents-1 moves into duly.db. On the web, memory only, so a reload starts again at Onboarding. The alternative is memory only on both, which means Onboarding again on every launch.
- **F2. The sidebar and the window.**
  - **Sidebar:** recommendation: list only screens that exist, in the canvas order, as documents-1 section 9 already says. After round A that is Home, Updates, Your case, Settings and Feedback. The alternative is the full canvas list, with a one-line page for each screen not built yet.
  - **Window:** the window keeps desktop-1's standard macOS title bar. The canvas draws no chrome. A title bar hidden into the sidebar is a later desktop change.
- **F3. The Home hero, and marks on dates the student typed (B1, B10, D59).**
  - **The eyebrow.** Row 1 removes ALL CLEAR. Recommendation: in round B, the eyebrow names the stage with its scope, "F-1 · POST-COMPLETION OPT, FROM THE DATES YOU ENTERED". The stage part is left out while a verdict reason rests on that stage, such as a cap-gap or grace judgement, and the headline carries the D4 state. The Onboarding Done line and the Timeline NOW tag follow the same rule. The alternative is the category alone, always.
  - **The quiet mark.** This is a B10 question for you. The canvas draws a shield with a check. A shield reads as protection, and a filled check beside dates the student typed reads as "all clear" or "verified", which B10 and D59 rule out. Recommendation: a hollow `--accent` ring for `no_open_items`, with the halo, and the marks of section 6 for the other states. The alternative is a check, as drawn.
  - **Checks beside typed dates.** The canvas draws blue checks on Onboarding's summary lines, Timeline's done-phase facts, and the finished OPT view. Recommendation: plain lines with no mark. The check on a done Timeline phase row stays (TIME-004), because it marks a span whose end date is past, as the engine computed it.
- **F4. The quiet completion moment (D10).**
  - Approve 3.6's form.
  - **Where it plays.** Canvas-conflicts rows 24, 25 and 51 ask for it on the finished OPT and CPT views and on completed Timeline phases. Recommendation: it plays only when the person confirms the last step of a checklist, and on Onboarding's Done. Those other views show dates the student typed, and a completion moment there would read as a check Duly made (D59, PRINCIPLES 2). For the same reason, the canvas's blue "COMPLETE · <date>" eyebrow on the OPT and CPT views is dropped. The alternative is to play it on those views too, once per visit.
- **F5. Dark, and colour changes for contrast.** The canvas draws only light. Approve the dark values in 3.2 and these changes to canvas colours, each measured by a test:
  - Tertiary and faint text become `--ink-2`: the date line, metric meta, section eyebrows, source links and footers (CANVAS-014, CANVAS-015, HOME-001, HOME-006).
  - Chevrons use `--ink-3` #8A8780 instead of #B0ACA3.
  - The unchecked checkbox ring and the later-phase ring become #8A8780 instead of #C9C5BC (1.61:1).
  - The next-phase ring becomes #6F86C4 instead of #8FA6D9 (2.27:1) (CANVAS-023, TIME-006).
  - Field edges are #8A8780.
  - In dark, text and checks on the accent are #161513, because white would measure 2.36:1.
- **F6. Home metrics.** Recommendation: show the metrics the engine has data for, two until WorkBook brings hours, as the Phone canvas does. PLAN03-062 ("three numbers") is met with two until then. The alternative is a third column that stays empty.
- **F7. Words beyond canvas-conflicts.md:**
  - **Home:**
    - "EAD VALID UNTIL" becomes "EAD CARD ENDS". documents-1 bans "valid" about documents, and labels.ts already says "OPT EAD card ends". "134 days left" becomes "<n> days from today".
    - "90-DAY UNEMPLOYMENT CLOCK" and "12 used · 78 left" become "UNEMPLOYMENT COUNT", with "<used>" and "of <limit> days in the rule". The days remaining are in the working. Onboarding already says "the unemployment count", and documents-1 dropped a countdown under the same law.
    - "2 of 6 steps done. Up next: the I-983 with your supervisor." becomes "<k> of <m> in the list confirmed by you." with no next step. The canvas line orders the student's actions (B4).
    - "Read what it means" becomes "Read the alert →".
    - The Home footer becomes the fixed line. The check date sits in the hero's scope line, and the time waits for updates-1.
    - Row 2's "Based on <n> documents you added" becomes "Based on the dates you entered. Rules checked <date>.". Nothing can be added before documents-1, and the old <n> was a number the student typed.
    - The fixed line "Records and computations, not legal advice. Confirm with your DSO or an attorney." is added under every canvas footer (PLAN03-075).
  - **Timeline:**
    - The meta becomes "From the dates you entered", with no counts. A count of stages would be written by the client, and the path model does not define a requirement yet.
    - The STEM text keeps row 13, with the regulation's list moved to the checklist and the B2 line added.
    - The footer becomes "Every phase keeps its dates and rules together." until documents exist.
    - The application line gives the dates entered, with no checks and no "via USCIS case status". Done-phase facts are plain lines.
    - Beyond names the categories Duly holds rules for and points to Settings. Row 14's "appear here when your record reaches them" predicts the student's path.
  - **Checklists:**
    - The eyebrow becomes "FILING WINDOW IN THE RULE OPENS <date>", or "OPENED <date>".
    - The bar line becomes "<k> of <m> confirmed by you · Duly's reading of the rules cited on each step" (CHECK-005). The list is Duly's assembly, not a published checklist.
    - Step labels say what the source lists, never what to do (B4). They take this shape, in L-content's words and checked by `tools.sources.plain`:
      - "Complete Form I-983 with your supervisor" becomes "A completed and signed Form I-983, the training plan" (CHECK-008).
      - "Request your STEM OPT I-20 from your DSO" becomes "A Form I-20 with the DSO's STEM OPT recommendation" (CHECK-009).
      - "File I-765 within 60 days of the recommendation" becomes "Form I-765, filed within <n> days of the DSO's recommendation" (CHECK-011).
    - Steps are only ever "Confirmed by you, <date>", struck through in `--ink-2` (CHECK-006). Duly never ticks the STEM-list or E-Verify steps itself (B2, B3).
    - The finished OPT view shows the dates entered and engine arithmetic only, as plain lines (CHECK-019).
    - The CPT view reads "CPT" and "The authorizations, with the dates you entered.", with no count, until I-20s are read. Row 25 says "are on your I-20".
    - The footer drops "Records, not legal advice." because the fixed line under it carries that (CHECK-021).
  - **Updates:**
    - Row 33's suggested "Status: before a court" breaks D56 and plain-1 section 3. It becomes plain words about what the court did, with "Read the court's order".
    - The footer becomes "Updates that match your status come first. Every item links to its original source."
    - The title becomes "One update matches your status." or "<n> updates match your status.", with n from the route, or "No published update matches your status.". "One thing worth knowing." says the update matters to the student, which row 26's "MATCHES YOUR STATUS" was written to avoid (UPD-001).
    - "Checked today, 6:00 AM" is not shown until updates-1 records a real check.
    - "Review your checklist →" becomes "Open the checklist →" (UPD-008).
    - All kind labels are `--ink-2`.
  - **Onboarding:**
    - "You're set." becomes "What you entered". It fails the web's own calm check and reassures (B10).
    - "Watching: ..." becomes "Duly computes: ...".
    - The storage sentence is said once.
    - "Rules for H-1B, O-1 and EB-1A are being added" is dropped, because it makes a promise. It becomes "Duly holds no rules for <status> dates.".
- **F8. Feedback.** Recommendation: "Copy feedback" only, plus "Write an email" if you set `product.feedback_address`.
- **F9. When round A runs, and what it shows.**
  - After round A the sidebar lists Home, Updates, Your case, Settings and Feedback.
  - Updates is always empty until updates-3.
  - Your case, Settings and Feedback are designed here, because the canvas never drew them.
  - Timeline and Checklists wait for round B, after path-1 and desktop-1.
  - With F12's recommendation, Home shows "Can't tell yet" on every real case, and the other states appear in `make design-shots`.
  - Recommendation: run round A now, beside path-1. It touches web/src only, and the new look, type, motion, Home, Onboarding and the three pages reach you sooner. The alternative is to wait until after desktop-1, in the order of D61, and see more of the canvas at once.
- **F10. The third D4 headline.** D4 says "Talk to your DSO". Today's code and canvas-conflicts row 1 say "A question for your DSO" (DEC-D04-002 is partial). This round keeps "A question for your DSO" unless you choose D4's words.
- **F11. The halo, tuned for the mark (D11, row 52).**
  - Row 52's 8s, 3 breaths at 0.05 were tuned for today's glow behind a whole card. On a 15px mark, 0.05 is at or below what the eye can see.
  - The canvas's glow is a 25px disc offset by -5px, blurred 7px, scaling from 1 to 1.25, at 0.14 to 0.30 opacity, on a continuous 4.8s cycle.
  - Recommendation, smaller, slower, lower and not continuous: a 21px disc offset by -3px, blurred 6px, breathing from 0 to 0.16 opacity and from scale 1 to 1.15 over 8s, three times, then resting. It wakes for one breath when the hero's top line or headline is hovered.
  - `make design-shots` includes a still at the top of a breath, so you see the amplitude before approving it.
- **F12. Typed dates before documents-1 (D59).**
  - D59 is decided: a typed date is used only after it is checked against its document, and otherwise the verdict is "Can't tell yet". The checks come with documents-1 section 8.
  - **Recommendation:** D59 holds from round A. The documents-count question is removed, the case sends 0 (true, since nothing can be attached yet), and every verdict is "Can't tell yet" with "No document is attached to these dates yet." until documents-1 section 8. You see the quiet, needs-you and DSO heroes in `make design-shots` from engine samples. HOME-004 and DEC-D11-001 wait until then.
  - **Alternative:** keep the question "How many of your documents did you take these dates from?". The quiet state, with its mark and halo, can then appear from dates nobody has checked, which D59 does not allow, until documents-1. Choosing this means accepting that gap in words.
- **F13. Target size with a mouse or trackpad.**
  - The canvas's sidebar items sit on a 37px pitch, and its chips, "Back" and 13px links are smaller than 44px. A true 44px target on each would overlap its neighbour, or grow the item and move the landmarks.
  - **Recommendation:** keep the canvas sizes. Extend each hit area invisibly to 44px where there is room, and tile the pitch without overlap where there is not. That makes sidebar items 37px tall with a pointer. Controls grow to 44px on touch (`pointer: coarse`) (CANVAS-047, PLAN03-061).
  - **Alternative:** grow the sidebar to a 44px pitch everywhere, and move its landmarks.
- **F14. Layout readings:**
  - Home's WHAT COMES NEXT holds as many rows as the engine's output gives, not a fixed three (HOME-012).
  - "Two choices, not three" applies to actions and decisions. The status, level, program standing and petition status questions list the facts the pack holds, which can be more than two (CANVAS-062).
  - Onboarding's header stays fixed at the canvas work step's position instead of the whole column being centred, so it does not jump between views (ONB-001).
  - The Home hero holds at most three reason lines and one control. Questions sit in their own section after the metrics.

## Done

1. `npm run typecheck -w web`, `npm test -w web`, the lint and the copy lint pass. From round B on, `make test-offline BASE=design-1` and the hidden tests also pass.
2. `make design-shots` passes its landmark check on this Mac, in light and dark, at 1280 by 832 and 1200 by 832, with the metrics row in view in every Home state. The side-by-side sheets and the halo still are in .scratch/design.
3. The founder walks through Onboarding, Home, Timeline, Checklists, Updates, Your case, Settings and Feedback in the desktop window. The founder finds they match the canvas's behaviour, with the words of section 12 and the answers of section 17.
4. The reviewer approves against the design laws, BOUNDARY.md and D56.
5. The auditor re-checks every covered row and reports what share of the whole is met.
