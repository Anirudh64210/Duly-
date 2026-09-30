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
