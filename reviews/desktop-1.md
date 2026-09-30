# Review: desktop round 1 (git diff product-1...HEAD at 8e212b8)

Read against specs/desktop-1/SPEC.md, PRINCIPLES.md, BOUNDARY.md, CLAUDE.md and security/threat-model.md. I did not write any of this.

## What ran

- `npm run typecheck -w desktop`: exit 0.
- desktop vitest with coverage, on a copy under TMPDIR (the sandbox refuses desktop/coverage in the worktree): 7 files, 66 tests passed.
- web vitest on the same copy: 12 files, 307 passed. `vite build` gives an index.html with `./assets/...` paths and no inline script, so the CSP in the SPEC does not block it.
- eslint on desktop/src and web/src: clean. copy lint on desktop/src: clean. ruff on api and tools/factory: clean. mypy on api/local_token.py, api/main.py, tools/factory/efficiency.py: clean.
- tests/unit/api: all passed; test_local_token.py: 23 passed.
- tests/unit/tools/test_phase.py: 4 fail with "sandbox-exec: sandbox_apply: Operation not permitted". Three of them fail the same way on a copy of product-1. This is the reviewer's sandbox, not the diff. test_efficiency.py passes.
- Electron itself cannot run here. The smoke run is the founder's, outside the sandbox (SPEC done item 3).

## The app protocol: trying to leave web/dist

I built a web/dist with a symlink to a file outside it and a symlink to a folder outside it. Then I sent these through `routeRequest` and `readInside`:

| Input | Result |
|---|---|
| `duly://app/../../secret/s.txt` | the URL parser drops the `..` and reads `secret/s.txt` under dist: missing, 404 |
| `duly://app/%2e%2e/%2e%2e/secret/s.txt` | same, 404 |
| `duly://app/..%2f..%2fsecret%2fs.txt` | refused |
| `duly://app/%252e%252e/secret` | refused |
| `duly://app/%2F<absolute path>%2Fsecret%2Fs.txt` | refused |
| `duly://app//etc/passwd` | refused |
| `duly://app/C:%5Cwin`, `duly://app/api/\..\x` | refused |
| `duly://app/assets/a.js%00.png`, `duly://app/api/%00` | refused |
| `duly://app/assets/link.txt` (symlink to a file outside) | null, 404 (realpath check) |
| `duly://app/sd/s.txt` (symlinked folder outside) | null, 404 |
| `duly://app/assets/` | not a file, 404 |
| `duly://u:p@app/`, `duly://app:1/`, `duly://other/` | refused |
| `duly://app/%ZZ`, `duly://app/api/%ZZ` | refused, no throw |

I found no input that reads a byte outside web/dist.

## Reaching the engine without the token

- Through the scheme: every engine request gets the launch token from the main process (`engineRequestInit`). A token the screen sends is replaced, not passed on: I sent `X-Duly-Local: fromscreen` and a Cookie, and the engine saw only `X-Duly-Local: T` and the content type. Set-Cookie and Access-Control-Allow-Origin from the engine are dropped from the answer. `duly://app/api//evil.com/x` is refused, and `duly://app/api/@evil.com/x` goes to `http://127.0.0.1:<port>/@evil.com/x`: `engineUrl` checks the host.
- Straight at the api: I started the real api with `DULY_LOCAL_TOKEN=abc` and sent raw HTTP. `/v1/status`, `/version`, `/ops/v1/status`, `/health/../v1/status`, `//v1/status`, `/%761/status`, `/v1/status?x=/health`, `/HEALTH`, `/health/`, `/health%00`, `*`, and a CORS preflight all get 403 in plain words. `/health` and the absolute form `http://127.0.0.1/health` get 200 (the SPEC allows /health). A wrong case, a trailing space, a non-ASCII value and a second header carrying the right value after a wrong one are all refused.

## Links to hosts that are not primary sources

`mayOpenOutside` / `decideNavigation` / `decideNewWindow`: `http://www.uscis.gov`, `https://www.uscis.gov.evil.com/`, `https://evil.com/?www.uscis.gov`, port 8443, `https://a@www.uscis.gov/`, trailing dot, `https://uscis.gov/`, `javascript:`, `file:`, `duly://evil/`, `https://www.ecfr.gov%2eevil.com/` and punycode are all refused. `https://WWW.USCIS.GOV/`, `:443` and `https://www.uscis.gov\@evil.com/` open outside, and all three parse to host www.uscis.gov, so the browser goes there. The list in guard.ts is the same as PRIMARY_HOSTS in tools/sources/verify.py, and guard.test.ts reads the Python file to check this. window.open is always denied. Every permission is refused on the default session.

## Mutation checks (on the TMPDIR copy)

Killed by the tests: dropping the realpath check, the token header, the check of the decoded path, the dead-engine 503, the port check, the https check, nosniff, the "ended" state, `redirect: "manual"`, and the host check in routeRequest. Two survived: dropping `url.username === ""` in mayOpenOutside, and dropping `detached: true` from the spawn.

## Findings

1. should_fix, desktop/src/engine.test.ts: no test fails when `detached: true` is removed from the spawn in engine.ts. Without it, `process.kill(-pid)` has no group to reach, and the fallback `child.kill` ends only `uv`, so the uvicorn under it can outlive the window. The SPEC says the process is ended when the window closes.
2. note, desktop/src/guard.test.ts: no test covers a link with a user name. Removing the user name check leaves every test passing. Today `https://a@www.uscis.gov/` still goes to a primary host, so this is a test gap, not a way out.
3. note, desktop/src/protocol.ts:199: if the engine answers 205, `new Response(payload, {status: 205})` throws "Invalid response status code 205" and the handler rejects. I found no api route that answers 205 today.
4. note, api/local_token.py:17: `DULY_LOCAL_TOKEN=""` counts as set, and then a request with an empty `X-Duly-Local:` header is let through. The desktop never sets an empty value (`makeToken` needs 32 bytes), and the SPEC only speaks of "set" and "not set".
5. note, desktop/src/engine.ts:57: `uv` is looked up on the PATH the app inherits. The founder runs this from `make desktop`, which has the shell's PATH. A launch from Finder may not have it, and then the window shows "Duly could not start its engine on this Mac." with the spawn error. It fails closed.
6. note: the screen can read `/ops/v1/status` through `duly://app/api/ops/v1/status`, because the call comes from 127.0.0.1 with the token. It returns only the caller and the allowlist. The screen is the app's own code.

## Boundary, dates and sources

No date, count or verdict is computed on the desktop side. The shell's own strings are "Duly could not start its engine on this Mac.", "Duly's engine stopped. Close Duly and open it again.", "Duly is starting its engine.", "Not found.", "Duly's engine is not running.", "Duly could not reach its engine." and, from the api, "This request did not come from the Duly app on this Mac.". All of them are information about the app and say nothing about a person. When the engine dies, every `/api/` request answers 503 and the window reloads to the "stopped" page, so no verdict from a dead engine stays on screen. No user data leaves the machine: the engine is only 127.0.0.1, and `engineUrl` refuses any other host.

## Scores

| Line | Score | Evidence |
|---|---|---|
| correct | 4 | Every SPEC path behaves as written in the probes above. Notes 4 and 5 are edges outside the SPEC's inputs. |
| sourced | 5 | The host list matches verify.py and is tested against it. No rule or number is introduced. |
| never_assumes | 5 | Starting, failed and ended engines each show their own page, never a quiet screen. /api/ answers 503 unless the engine is ready. |
| inside_the_boundary | 5 | Every readable string is about the app itself. |
| secure | 4 | No escape from web/dist, no tokenless reach, no open to a host off the list. The 205 answer throws (note 3). |
| tested | 4 | 10 of 12 mutants killed. Finding 1 and note 2 survive. |

Mean 4.5. No line is below 4 and no finding is blocking.

APPROVE
