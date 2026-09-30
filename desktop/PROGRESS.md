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
