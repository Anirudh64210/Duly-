# L-desktop progress

## 2026-09-29, run l-desktop-caa330d354, attempt 1

Read specs/desktop-1/SPEC.md, CLAUDE.md, PRINCIPLES.md, security/threat-model.md, the
PRIMARY_HOSTS list in tools/sources/verify.py, the copy lint list, and web/src/App.tsx for
the verdict heading (`section.verdict[data-state] h1`).

Built, in desktop/src, every decision as a plain function with tests beside it:

- guard.ts: the list of primary hosts (a test reads verify.py and compares), which links
  may open in the browser (https, primary host, no user, no port), navigation, frames,
  window.open, permissions (always refused), window size and web preferences.
- protocol.ts: route a `duly://app/` request to a file under web/dist or to the engine;
  refuse `..`, absolute, encoded, backslash, NUL and drive paths; refuse a symlink whose
  real path leaves web/dist; the security headers on every answer; the request passed on
  carries method, body, content type and the token only; 503 when the engine is not ready.
- engine.ts: free port on 127.0.0.1, the uv command with DULY_ENV=dev and DULY_LOCAL_TOKEN,
  a 32 byte token, the 30 second wait on /health, the last 20 printed lines, and the
  process followed until it ends (ended on its own becomes the "stopped" page).
- pages.ts: the pages drawn in place of the screen while the engine is starting, could
  not start ("Duly could not start its engine on this Mac." with the last lines), or ended.
- screen.ts: the smoke run's folder, its 40 second wait, what it reads and screen.json.
- main.ts, smoke.ts, preload.ts: wiring only. preload imports electron alone, because a
  sandboxed preload cannot load other files.

What ran: the done command, exit 0. 7 test files, 66 tests passed. eslint clean,
prettier clean, copy lint clean after one fix (a comment held a phrase from the forbidden list).
tsc into a scratch folder built all nine files; preload.js requires only electron.

Not run: Electron itself. The founder runs `make desktop-smoke` outside the sandbox.

## 2026-09-29, run l-desktop-7d4a70250f, attempt 1

Read specs/design-1/SPEC.md sections 4, 11 (RQ-K1), 14.3 and 17 (F1),
contracts/desktop_case_bridge.schema.json and contracts/case.schema.json.

Built the case bridge (RQ-K1):

- schema.ts: a checker for the JSON Schema words the two contracts use. The ajv in
  node_modules is 6.15 and cannot read draft 2020-12, and a new dependency would change the
  root package-lock.json, which this lane does not own. A contract word the checker does not
  know is refused when the checker is made, so no rule is skipped silently. A problem names a
  path and a rule; a key the schema does not name is written `*`, so no value from the case
  reaches first_problem. Values must be plain data first: no NaN, Infinity, Date, Map,
  undefined or loop, since IPC structured clone can carry them.
- casefile.ts: one file, case.bin, in app.getPath("userData"), encrypted with the Cipher
  given (safeStorage in main), written to case.bin.writing with mode 600 then renamed.
  Read and write check the case against case.schema.json; refusals are not_a_case,
  cannot_decrypt, keychain_unavailable and cannot_store as the contract lists. A message that
  is not exactly one of the three calls is rejected, so the page can name no path, file or
  key. Calls run one at a time. A case on disk that fails the contract is refused and left in
  place, never deleted.
- preload.ts: window.duly.case.read(), .write(case), .clear(), each sending only the
  contract's call. main.ts: ipcMain.handle on duly:case, answered only for the app's own page
  in the main frame.

What ran: the done command, exit 0. 9 test files, 98 tests passed. eslint clean, copy lint
clean. prettier --write ran once before the done command.

Not built: the shots runner of 14.4 (the mission named section 4 only). Not run: Electron
itself; safeStorage is exercised only through a test cipher (AES-256-GCM).

## 2026-09-30, run l-desktop-da6d9509e1, attempt 1

Read specs/product-2/resolutions.md point 15 (and 11), specs/design-1/SPEC.md 14.3 and 14.4,
web/src/lib/shots.ts, web/src/shots.tsx, web/samples/README.md and the Makefile's
design-shots target (`cd desktop && npx electron . --shots <folder>`).

Built the shots runner:

- shots.ts, decisions only: `--shots <folder>` and `--shots=<folder>` (no folder is an
  error, exit 2); the screens and the 1280 by 832 size, which a test compares with
  web/src/lib/shots.ts; the samples in web/samples (each `<name>.json` beside its
  `<name>.case.json`); one shot per screen, sample and theme (light, dark), loading
  `duly://app/shots.html?screen=<route>&sample=<name>`; the file `<screen>-<sample>-<theme>.png`
  ("/" is home); the page script that sets `data-theme`, waits for the webfont and two frames
  and says whether the root drew; shots.json; exit 0 only when every shot drew.
- SPEC 14.3: the app window's request map refuses shots.html (protocol.ts takes an optional
  `refuse`, main.ts passes refusedInApp), so the samples never stand in for the engine there.
  A shots run starts no engine and its handler answers 503 to /api/.
- shotrun.ts: a hidden window of the shot size (useContentSize), capturePage, writes.
  main.ts: `--shots` goes to launchShots, which starts no engine and no case bridge.

What ran: the done command, exit 0. 10 test files, 123 tests passed. eslint clean, copy lint
clean. prettier --write ran once before the done command.

Not run: Electron itself; the founder runs `make design-shots` outside the sandbox.
Not built: the 1200 by 832 size, landmark measuring and the check against
tests/design/landmarks.json, the beside-canvas sheets and the halo still of 14.4; the
mission named the 1280 by 832 render only. web's vite build takes index.html alone, so
web/dist holds no shots.html yet; the runner then prints that and exits 1 (a request).

## 2026-09-30, run l-desktop-14b085dbfa, attempt 1

Read specs/product-2/resolutions.md point 16, reviews/product-2-fix2.md finding 6,
specs/design-1/SPEC.md 14.1 and 14.4, tests/design/landmarks.json and read_canvas.py.

Point 16, the shot run's half: a shot counted as drawn when #root had any child, so an error
screen (the router's error component, or the shell around a failed screen) counted. Now:

- shots.ts: SHOT_CANVAS maps each built screen to its canvas screen in landmarks.json
  ("/welcome" Onboarding, "/" Main, "/timeline" Timeline, "/checklists" Checklist,
  "/updates" Updates). screenLandmark reads the file and takes the screen's heading: the first
  landmark in its largest type. Text is never compared (SPEC 14.1), so the landmark is found by
  size, weight and letter spacing (em turned to px); colour is left out for dark shots.
  drawScript now gives back the computed type and box of every visible element under the root
  that draws text of its own; holdsLandmark decides outside the page. shots.json names the
  landmark each shot looked for.
- shotrun.ts reads tests/design/landmarks.json (a path from main.ts, designLandmarks); if it
  cannot, exit 1. A picture is still written when the page answered, so a miss can be seen.
- /case, /settings and /feedback have no canvas screen, so no landmark: those shots are never
  counted as drawn and `make design-shots` exits 1 until landmarks.json holds them (a request).
- Tests: shots.test.ts (the landmark read from the real file, holdsLandmark, pageTexts,
  spacing), shots.page.test.ts (jsdom: the page script on a heading and on an error screen).

What ran: the done command, exit 0. 11 test files, 137 tests passed. eslint clean, copy lint
clean. prettier --write ran once before the done command.

Not run: Electron itself. Not built: the samples script in web/ (L-web's half of point 16),
the full box and colour comparison of SPEC 14.4.

## 2026-09-30, run l-desktop-466c460145, attempt 1

Read specs/product-2/resolutions.md point 17, reviews/product-2-fix3.md note 1,
specs/design-1/SPEC.md 14.1 and tests/design/landmarks.json.

Point 17, the shot run's landmark check compares heading text as well as type. Checklist,
Onboarding and Updates share 30px / 600 / -0.02em, so type alone let one screen's heading
count for another (review note 1). Now:

- shots.ts: ScreenLandmark carries `text`, the heading landmark's label from landmarks.json,
  with white space collapsed (words()). A heading with no label gives no landmark (null), so
  the shot is never counted as drawn. PageText carries `text`; drawScript gives back each
  element's textContent; pageTexts refuses an entry with no text. holdsLandmark holds only
  when a visible text reads exactly as the heading (after collapsing white space) and is in
  the landmark's type.
- shotrun.ts: a miss names the heading text it looked for.
- Tests: shots.test.ts (each built screen's heading text from the real file, a missing or
  blank label, another screen's heading in the same type, any letter different, pageTexts
  without text), shots.page.test.ts (jsdom: texts as they read, a heading in the landmark's
  type that reads otherwise).

What ran: the done command, exit 0. 11 test files, 143 tests passed. eslint clean, copy lint
clean. prettier --write ran once before the done command (no change).

Dispute: SPEC 14.1 says text content is never compared; point 17 says compare it. I followed
point 17 (the newer resolution) for the heading only.
Request: the canvas headings are sample words ("Everything is in order.", "What kind of work
do you do?", "STEM OPT extension", "One thing worth knowing."). Of the five built screens only
Timeline draws a fixed heading that matches ("Timeline", web/src/app/Timeline.tsx:202). The
other four hold their canvas words only if the engine samples put the screen in the canvas's
state; otherwise `make design-shots` exits 1 for them. Not run: Electron itself.

## 2026-09-30, run l-desktop-ee49e3b4ff, attempt 1

Read specs/product-2/resolutions.md point 18 and specs/product-2/plan-fix5.yaml (the L-web half).

Point 18: the shot run counts a screen as drawn when the page holds the element the app marks
data-landmark="<screen>". Text is not compared (design-1 14.1 stands); point 17's text check is gone.

- shots.ts: `<screen>` is the route the shot asks for (the `screen` query, as in SHOT_SCREENS:
  "/timeline", "/", ...). landmarkSelector(screen) gives `[data-landmark="<route>"]`. drawScript gives
  back each visible element under #root that carries data-landmark, with the screen it names and its
  box (PageMark); pageMarks refuses any other shape. holdsLandmark(marks, screen) holds when a mark
  names exactly this screen and has a box. landmarks.json, SHOT_CANVAS, screenLandmark, spacing and
  the type comparison are removed; every built screen now has a landmark, so shots.json's landmark is
  always the selector.
- shotrun.ts: no longer reads tests/design/landmarks.json; a miss names the selector. main.ts drops
  the landmarks path.
- Tests: shots.test.ts (selector, one landmark per screen, another screen's mark, any letter
  different, no box, pageMarks), shots.page.test.ts (jsdom: marked heading counts whatever it reads,
  error screen with the screen's words and no mark does not, hidden or clear mark left out).

What ran: the done command, exit 0. 11 test files, 136 tests passed. eslint clean, copy lint clean.
prettier --write ran once before the done command (no change). One earlier run of the done command
was piped through tail by mistake; it was run again unpiped, exit 0.

Request: L-web must set data-landmark to the route exactly ("/timeline", "/" for home), on each of
the eight SHOT_SCREENS, and never on an error hero. No web file holds data-landmark on this branch
yet, so `make design-shots` exits 1 until L-web's part lands. Not run: Electron itself.

## 2026-09-30, run l-desktop-bc4b445878, attempt 1

Read specs/product-2/resolutions.md point 20 and plan-fix6.yaml (L-web and L-desktop halves).

Point 20: the landmark is the route, written by the web app, read by the shot run, one test joins them.

- The shot run already looked for `[data-landmark="<route>"]` (point 18 work); shots.ts only gains
  a comment citing point 20 and web/src/lib/shots.ts LANDMARKS.
- shots.test.ts: new block "the web app's landmark table (resolutions point 20)". It imports
  web/src/lib/shots.ts itself (not its text), and checks: LANDMARKS names exactly SHOT_SCREENS;
  each value is its route; for each screen, the selector the shot run uses matches what the web
  writes, and a mark with the web's value is counted for that screen and for no other.

What ran: the done command once, exit 1. typecheck clean; vitest 137 passed, 2 failed, both in the
new block: web writes "welcome" where the shot run looks for "/welcome". eslint exit 0, copy lint
clean. prettier --write ran before (no change). On a scratch copy under TMPDIR with web's LANDMARKS
set to the routes, the new block passes (3 passed), so the test fails only on the difference point 20
removes. Not run again: the failure is the web half, which is L-web's lane this round.

Request: L-web sets each LANDMARKS value in web/src/lib/shots.ts to its route (or keeps a table named
LANDMARKS keyed by route in that file). When that lands on this branch the done command passes.

Stop hook ran the done command again: same 2 failures (expected '/welcome', received 'welcome').
Same failure twice: escalated, desktop/ESCALATE.md written, test left as it is.

## 2026-09-30, run l-desktop-fa27a1e1ec, attempt 1

Merged lane/L-desktop/l-desktop-bc4b445878 (the point 20 join test in shots.test.ts and the comment in
shots.ts). web/src/lib/shots.ts on this branch now builds LANDMARKS from SHOT_SCREENS, route to route,
so the difference the last run escalated on ("welcome" against "/welcome") is gone. No desktop code
changed in this run beyond the merge.

What ran: the done command once, unpiped, output to a file under TMPDIR, exit 0. typecheck clean;
vitest 11 files, 139 tests passed (the three point 20 tests among them); eslint clean; copy lint clean.
git printed "tests/holdout: Operation not permitted" during the merge and status: the sandbox denies
reads there, as the contract says. Not run: Electron itself.

## 2026-09-30, run l-desktop-c0e365aa13, attempt 1

specs/ui-1/SPEC.md point 7 (review finding 4): the shot run fails when a screen is wider than its window.

- shots.ts: SHOT_WINDOWS (1280x832, the canvas frame, and 390x844), widthScript (document
  scrollWidth and window innerWidth after two frames), pageWidth (parses the answer), fitsWindows
  (every window measured, at its own width, scroll <= inner). ShotResult gains widths; shots.json
  writes windows, and per shot widths and fits; shotsExitCode is 0 only when every shot drew and fits.
- shotrun.ts: after each drawn shot is captured at 1280, the same window is set to each size in
  SHOT_WINDOWS, measured, then set back to 1280x832. A window not measured, or whose inner width is
  not the width asked, counts as not fitting (never the quiet state). Picture file names unchanged.
- shots.test.ts: a block for point 7 and the report block updated for widths and fits.

What ran: prettier --write on the three files, then the done command once, unpiped, output to a
file under TMPDIR, exit 0. typecheck clean; vitest 11 files, 146 tests passed; eslint clean.
git printed "tests/holdout: Operation not permitted" (sandbox denies reads there, as the contract says).
Not run: Electron itself or make design-shots. Note: web/src/shots.tsx sets the shot root to
1280px wide; unless L-web gives it max-width 100% (review finding 4 says it does), the 390 measure
will fail the shot run, which is what point 7 asks for.
