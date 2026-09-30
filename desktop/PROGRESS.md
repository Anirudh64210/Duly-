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
