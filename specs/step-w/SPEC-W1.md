# Step W1: Duly installs and opens like Slack

Status: draft for the founder, 2026-10-01. Written by the founder lane from DECISIONS.md D81 to D84,
specs/duly-2/ARCHITECTURE.md sections 2, 7, 12 and 18 (Step W), and the code on branch `founder`.

## The goal in one breath

The founder double-clicks Duly.dmg on this Mac, drags Duly to Applications, and opens it like Slack.
A calm "Starting Duly" screen shows while the engine starts; then the app opens. Nothing needs the
repository, uv, a terminal or the network. The build is signed ad hoc for this Mac only, and it is
used with made-up data only (ARCHITECTURE 18 step 5). W2 puts the real product inside this window.

## What W1 is not

- Not the new UI. The window shows today's web build (web/dist) unchanged. SPEC-W2 replaces it.
- Not real data. The case the old screens hold is kept only while Duly is open, and the test guide
  says to type only made-up facts.
- No cloud, no auto update, no crash reporting, no Developer ID notarization, no Windows build.
  These are named under "Later" with what each needs.
- No Rust. The Python engine is bundled as an interim sidecar (D82); the Rust core replaces it.

## Decisions this serves

D81 (Step W approved: engine bundled, a private pipe instead of a local port, a packager,
hardening, signing for the founder's Mac, no cloud). D82 (the Python engine stays the reference;
bundled for now). D83 (Electron for Mac and Windows). D84 (local-only, open source; no Duly server
holds student data). D13 and CLAUDE.md (no user data to an outside model provider; model clients
only in assistant/providers and pipeline/models, never in a release artefact, ARCHITECTURE 7.3).

---

## 1. The slim desktop engine entrypoint

1. **A new entrypoint, `api/desktop_main.py`, serves the engine and the local routes only.** Its
   app has exactly four routes: `GET /health`, `GET /version`, `POST /v1/compute` and
   `GET /v1/status`, with the same request and response shapes as openapi.yaml. It does not serve
   `/v1/compute/f1` (only the old bench uses it) or `/ops/*`. Amended 2026-10-01: the first
   packaged build showed the onboarding cannot list the statuses without `/v1/status`. Its body
   is shared through `api/local_routes.py`; the desktop reports `database: ok`, since it has no
   server database to reach.
   - Checked by: `tests/unit/desktop_entry/test_desktop_main.py` lists the app's routes and fails
     on any other.
2. **The compute route is shared, not copied.** The body of today's `POST /v1/compute` in
   api/main.py moves to `api/local_routes.py`, which imports only fastapi, `api.case`,
   `api.local_token` and engine/. api/main.py and api/desktop_main.py both mount it. Nothing in
   api/local_routes.py imports `api.settings` (which pulls in `assistant.providers`), `api.db`
   (SQLAlchemy and psycopg) or pydantic_settings.
   - Checked by: the same test file sends the twenty journeys of specs/path-1/journeys.json to both
     apps with the same FixedClock and asserts byte-identical JSON. The existing
     `tests/unit/api/test_compute_generic.py` and `tests/unit/acceptance/test_journeys.py` stay
     green.
3. **Importing the entrypoint loads nothing server-only.** In a fresh interpreter, after
   `import api.desktop_main`, none of these is in `sys.modules`: `anthropic`, `langgraph`,
   `langchain_core`, `psycopg`, `sqlalchemy`, `pydantic_settings`, `assistant`,
   `assistant.providers`, `api.settings`, `api.db`, `api.main`, `pipeline`.
   - Checked by: a subprocess test in test_desktop_main.py (a subprocess, so earlier imports in the
     test run cannot hide a leak).
4. **The environment is never `dev` in a packaged build.** desktop_main does not read
   `api.settings`. It takes `--mode packaged` or `--mode repo`. In packaged mode it refuses to start
   when `DULY_ENV` is set to anything but `desktop`, and Electron's main passes `DULY_ENV=desktop`.
   In repo mode (`make desktop`) `dev` is allowed.
   - Checked by: test_desktop_main.py (packaged plus `DULY_ENV=dev` exits non-zero with a plain
     line); desktop/src/engine.test.ts (the packaged command carries `DULY_ENV=desktop`, the repo
     command `dev`).
5. **Quiet logs.** Uvicorn's access log is off and the log level is warning, so no request path or
   body is written anywhere. The engine never logs a case.
   - Checked by: test_desktop_main.py runs a compute with a canary string in a free-text field and
     asserts the captured stdout and stderr do not contain it.

## 2. The engine channel: a socket the app owns, not a port

Today engine.ts binds a free port, releases it, then starts uvicorn on it; a local process that
grabs the port in between receives the token and could serve wrong dates (ARCHITECTURE 7.1). W1
replaces the TCP port with a Unix domain socket.

6. **Where the socket lives.** `<userData>/run/engine.sock`, where userData is
   `~/Library/Application Support/Duly`. The `run` folder is made with mode 0700 and checked on
   every launch (owned by this user, not a symlink, mode 0700; otherwise it is removed and made
   again). macOS limits a socket path to 103 bytes; when the path is longer (a long user name),
   main uses a fresh 0700 folder under `os.tmpdir()` (per user on macOS) named
   `duly-<16 random hex>`, and removes it on quit.
   - Checked by: desktop/src/socket.test.ts (path choice, the length rule, the fallback, the checks
     on the folder, all as pure functions over a fake file system).
7. **The engine makes the socket itself, with 0600.** Uvicorn's own `--uds` binds with mode 0666,
   so desktop_main creates the socket: `socket(AF_UNIX)`, bind under `umask 0o177`, `chmod 0o600`,
   check with `lstat`, then hand it to `uvicorn.Server(config).serve(sockets=[sock])`. A stale
   socket file is removed first only if `lstat` shows a socket owned by this user.
   - Checked by: test_desktop_main.py binds into a temporary 0700 folder and asserts mode 0600 and
     owner; refuses a parent that is group or world writable; refuses a symlinked path; refuses a
     path over 103 bytes.
8. **Main checks the socket before it talks to it.** Before the first request main `lstat`s the
   path: a socket, owned by this user, mode `& 0o077 == 0`. Otherwise the engine is treated as
   failed and the screen says so (point 23).
   - Checked by: socket.test.ts (each refusal case).
9. **The token stays, and never travels in the environment or arguments.** Main still makes a
   32-byte random token. It is written to the engine's stdin as the first line, then stdin is
   closed; desktop_main reads it before binding. Every route, `/health` included, requires the
   `X-Duly-Local` header (compared with `hmac.compare_digest`). The token is not in `argv` or
   `env`, so `ps` shows nothing.
   - Checked by: test_desktop_main.py (each route refuses without the header and with a wrong one;
     `/health` too); engine.test.ts (the spawn call has no token in args or env and writes it to
     stdin).
10. **Requests go over the socket.** The `duly://app/api/<path>` proxy in protocol.ts uses Node's
    `http.request({ socketPath })` instead of `127.0.0.1:<port>`. Same headers passed on, same
    `redirect: manual`, same 503 and 502 lines.
    - Checked by: protocol.test.ts (the request options carry `socketPath` and no host or port).
11. **Windows, later.** On Windows the same channel is a named pipe
    `\\.\pipe\duly-<random>` whose ACL allows only the current user's SID, made by the engine.
    Uvicorn has no pipe support, so this waits for the Windows build or for the Rust core
    (ARCHITECTURE 18 Phase 3), which removes the HTTP hop altogether. W1 writes no Windows code;
    engine.ts refuses to start on `win32` with a plain line.
    - Checked by: engine.test.ts (win32 gives the refusal, not a port).

## 3. Bundled CPython with the slim dependency set

12. **The runtime.** CPython 3.12 (the repo's version) for `aarch64-apple-darwin` from
    python-build-standalone, the `install_only_stripped` asset. The release tag, asset name and
    SHA-256 are pinned in `desktop/python/runtime.json`. Apple silicon only in W1 (the founder's
    M4); an Intel or universal build is later.
    - Checked by: the build script refuses a download whose SHA-256 differs from runtime.json.
13. **The slim dependency set** is a new `desktop` dependency group in pyproject.toml, locked in
    uv.lock: fastapi, uvicorn (plain, not `[standard]`), pydantic, pyyaml, jsonschema, tzdata
    (so the time zone database is bundled with a known version, ARCHITECTURE 2.1). Not sqlalchemy,
    psycopg, pydantic-settings or langgraph.
    - Checked by: `tests/unit/desktop_entry/test_bundle_inputs.py` runs
      `uv export --frozen --only-group desktop --no-hashes` (offline, from uv.lock) and fails if any
      of anthropic, langgraph, langchain-*, psycopg*, sqlalchemy, pydantic-settings appears in the
      resolved set, directly or as a dependency.
14. **The source files copied are an allowlist**, `desktop/python/bundle.json`: engine/**,
    `api/__init__.py`, `api/desktop_main.py`, `api/local_routes.py`, `api/case.py`,
    `api/case_f1.py` (api.case imports it), `api/local_token.py`, a launcher
    `duly_engine.py`, `rulepacks/*/v*/parameters.yaml`, and from contracts/ only
    `case.schema.json`, `case_f1.schema.json`, `rulepack.schema.json`, `product_settings.yaml`. Not
    rulepacks' sources/ (large saved PDFs, not read by the engine), not assistant/, pipeline/,
    api/main.py, api/settings.py, api/db.py or api/worker.py. The tree keeps the repo's relative
    layout, so `engine.rulepack.REPO_ROOT` works unchanged.
    - Checked by: test_bundle_inputs.py (the allowlist names no forbidden path; every file it
      names exists; `assistant/providers.py` matches no pattern; the engine loads every pack from
      a temporary copy made from the allowlist alone).
15. **The build script runs outside the agents' jail,** because it downloads the runtime and the
    wheels. `desktop/scripts/build-python.sh`, called by `make desktop-python`:
    1. download the asset, check its SHA-256, unpack to `desktop/build/python`;
    2. `uv export --frozen --only-group desktop` with hashes, then the bundled interpreter's
       `pip install --require-hashes --only-binary :all: --no-deps --target
       desktop/build/python/site` (wheels only, no build scripts run);
    3. copy the allowlisted sources to `desktop/build/engine-root`;
    4. precompile every .py with `compileall` (so nothing is written inside the signed app later);
    5. write `desktop/build/python-manifest.json`: the SHA-256 of every file under build/python and
       build/engine-root, and the tzdata version.
    The script is idempotent and fails loudly on any step.
    - Checked by: inside the jail, `bash -n` and a `--dry-run` mode that prints the steps over a
      fake tree (desktop/src/buildpython.test.ts calls it); outside the jail, `make desktop-python`
      followed by `make desktop-verify` (point 25).
16. **How Electron starts the bundled engine.** Packaged:
    `<Resources>/python/bin/python3 -I -B <Resources>/engine-root/duly_engine.py --mode packaged
    --socket <path>`, cwd engine-root, environment reduced to `PATH=/usr/bin:/bin`, `HOME`,
    `TMPDIR`, `DULY_ENV=desktop`. `-I` ignores `PYTHONPATH`, `PYTHONHOME` and the user's site
    folder; `-B` writes no .pyc. The launcher puts `site/` and engine-root on `sys.path` itself.
    In repo mode (`make desktop`) it stays `uv run python -m api.desktop_main --mode repo`.
    - Checked by: engine.test.ts (both commands exactly, and the reduced environment).
17. **Main checks the runtime before starting it.** At launch main hashes the files listed in
    python-manifest.json and refuses to start the engine on any difference, with a plain line. The
    time this takes is part of the launch measurement (point 23); if it costs more than 300 ms on
    the M4, it moves to first launch after an update only, and the review records that.
    - Checked by: manifest.test.ts (a changed byte, a missing file and an extra file each refuse).

## 4. Packaging: Electron Forge, exact Electron, fuses

18. **Electron Forge with the DMG and ZIP makers** (D81 approved the dependency). Added to
    desktop/package.json as exact versions (no caret): `@electron-forge/cli`,
    `@electron-forge/maker-dmg`, `@electron-forge/maker-zip`, `@electron-forge/plugin-fuses`,
    `@electron/fuses`, and `electron` itself pinned exactly at `44.4.5` (today `^44.4.5`, resolved
    to 44.4.5). The founder picks the current Forge release on the day of step 0 and records the
    versions in that commit's message. `desktop/forge.config.ts` sets: app name Duly, bundle id
    (founder chooses, point 31), `asar: true`, web/dist and the needed contracts inside app.asar,
    `extraResource` for build/python, build/engine-root and python-manifest.json (outside the asar,
    because a spawned binary cannot live in it), darwin arm64 only. The ZIP is what a later
    Squirrel.Mac update would read.
    - Checked by: forge.test.ts reads the config object (makers, asar, extra resources, platform,
      arch); `make desktop-package` produces `desktop/out/make/Duly-<version>-arm64.dmg` and the
      .zip.
19. **Paths work packaged and in the repo.** A new `desktop/src/paths.ts` gives the web folder,
    the contracts folder and the engine command from `app.isPackaged`, `app.getAppPath()` and
    `process.resourcesPath`; nothing else computes a path. casefile.ts reads its two schemas from
    there. The `--smoke` and `--shots` modes are refused in a packaged app.
    - Checked by: paths.test.ts (both modes); main.test (the two flags are ignored when packaged).
20. **Fuses are set at package time and read back.** Through the Forge fuses plugin, before
    signing:

    | Fuse | Set |
    |---|---|
    | RunAsNode | off |
    | EnableNodeOptionsEnvironmentVariable | off |
    | EnableNodeCliInspectArguments | off |
    | GrantFileProtocolExtraPrivileges | off |
    | EnableEmbeddedAsarIntegrityValidation | on |
    | OnlyLoadAppFromAsar | on |
    | EnableCookieEncryption | on |

    - Checked by: forge.test.ts (the config holds exactly this table); `desktop/scripts/
      read-fuses.mjs` runs `@electron/fuses` read on the packaged binary and exits non-zero on any
      difference from the same table, called by `make desktop-verify`. A unit test feeds it a
      sample read-out with one fuse wrong and expects failure.

## 5. Signing for the founder's Mac

21. **An ad-hoc signing script, `desktop/scripts/sign-adhoc.sh`,** run after the fuses are set
    and before the DMG is made: Forge's `postPackage` hook calls it, so `make desktop-package`
    signs and the DMG holds the signed app. It can also be run by hand on a packaged app:
    1. sign every Mach-O inside the bundle from the inside out: each .so and .dylib under
       Resources/python, the python3 binary, the Electron helpers and frameworks, then Duly.app;
    2. `codesign --force --sign - --options runtime --timestamp=none` with
       `desktop/build/entitlements.plist` (`com.apple.security.cs.allow-jit` for V8; nothing else);
    3. `codesign --verify --deep --strict` on the result.
    Unverified: whether hardened runtime with an ad-hoc signature lets python3 load its ad-hoc
    signed .so files. If the launch check fails on library validation, the Python binary alone
    gets `com.apple.security.cs.disable-library-validation`, recorded in the threat model as an
    ad-hoc-only weakness that the Developer ID build removes.
    - Checked by: inside the jail, `--dry-run` over a fake tree prints the codesign order (inner
      before outer, every .so and .dylib listed once), tested by sign.test.ts; outside, `make
      desktop-verify` runs `codesign --verify --deep --strict` and `codesign -d --entitlements`.
22. **What ad hoc means, said in the test guide.**
    - It runs on this Mac only. `spctl --assess` rejects it, which is expected; a copy sent to
      another Mac is blocked by Gatekeeper.
    - Every rebuild has a new signature, so the Keychain asks once per rebuild whether Duly may
      use "Duly Safe Storage". Choose Always Allow. Nothing is lost.
    - Option for the founder (point 31): a self-signed code-signing certificate made once in the
      login keychain gives a stable signature, so the Keychain stops asking. The script takes
      `DULY_SIGN_IDENTITY` for it.
    - Developer ID signing with a timestamp, notarization and `spctl` on a clean Mac come when the
      Apple account exists (founder decision 2 in ARCHITECTURE 19, as the company).
    - Checked by: the guide carries these lines; the reviewer reads them.

## 6. Starting Duly, and the first launch measured

23. **A calm "Starting Duly" screen** is the first thing drawn, in the first frame, from
    desktop/src/pages.ts (it already replaces index.html while the engine is not ready). It uses
    the canvas tokens (design/canvas/DESIGN-SPEC.md): the ground colour, one line "Starting Duly",
    a slow, quiet progress mark, nothing under prefers-reduced-motion.
    - After 8 seconds a second line: "This can take a little longer the first time."
    - If the engine fails or ends: "Duly could not start." with "Try again" (restarts the engine)
      and "Copy details" (the last 20 engine lines, which hold no case data by point 5). No stack
      trace on the face of the screen.
    - The health wait goes from 30 to 60 seconds for the first launch after an install or update,
      30 otherwise.
    - Checked by: pages.test.ts (each state's words, the 8 second line, Try again restarts,
      copy lint passes over pages.ts); engine.test.ts (the two timeouts).
24. **First launch is measured, on this Mac, locally.** Main records milestones with
    `process.hrtime`: process start, app ready, window shown, engine spawned, socket ready, health
    ok, first page loaded. Each launch appends one line to `<userData>/launch-times.jsonl` (kept to
    the last 20 lines, numbers and the app version only, never sent anywhere). `make
    desktop-launch-time` prints the last launches and the median. The guide asks the founder to
    measure three launches: the very first after installing from the DMG (Gatekeeper scans a new
    app), then two more.
    Budgets (proposals from ARCHITECTURE 2.2, recorded, not gates in W1): window shown under 1
    second; Home ready under 2 seconds on a warm launch; installer under 200 MB; idle memory under
    400 MB.
    - Checked by: launch.test.ts (the line shape, the 20-line cap, no field outside the list);
      the founder's three numbers and the DMG size go into the review.

## 7. What the founder runs outside the jail

25. **Make targets** (the Makefile is founder-owned; the scripts they call are L-desktop's):
    - `make desktop-python`: point 15.
    - `make desktop-package`: build web, build desktop, `electron-forge make` (DMG and ZIP; the
      postPackage hook signs).
    - `make desktop-verify`, which fails on the first problem:
      1. `verify-bundle.mjs` over the packaged Duly.app: no file or dist-info named anthropic,
         langgraph, langchain, psycopg, sqlalchemy, pydantic_settings anywhere in the bundle; no
         `assistant/` folder; no `api/main.py`, `api/settings.py`, `api/db.py`; every file under
         engine-root is in the allowlist; python-manifest.json matches the files;
      2. the bundled interpreter, run with `-I`, fails to import each forbidden module;
      3. `read-fuses.mjs` (point 20);
      4. `codesign --verify --deep --strict`;
      5. a headless launch of the packaged app with `--verify-start` (allowed when packaged, it
         only waits for health and quits) that must reach health within 60 seconds.
    - `make desktop-launch-time`: point 24.
    - Checked by: verify-bundle.test.ts feeds the script fake bundles with each forbidden item
      planted, one at a time, and expects each to fail, and a clean one to pass (the same idea as
      `make prove-gates`).

## 8. Lanes, files and order

26. **No contract change lands in W1.** openapi.yaml, case.schema.json and
    desktop_case_bridge.schema.json are unchanged: the desktop entrypoint serves a subset of the
    paths openapi.yaml already declares, with their shapes, and the socket is internal to desktop/.
    If the review finds a contract change is needed, it lands first and alone in its own plan.
27. **Step 0, the founder lane, first and alone** (dependency changes need the founder, CLAUDE.md;
    D81 approved them):
    - pyproject.toml: the `desktop` group (point 13); uv.lock regenerated.
    - desktop/package.json devDependencies (point 18) and `electron` pinned exactly; the root
      package-lock.json regenerated.
    - desktop/python/runtime.json filled with the release tag and SHA-256 (needs the network).
    - Makefile: the four targets of point 25; `make desktop` switched to the repo-mode socket.
    - Then `make doctor`, and each lane's done command run once from a fresh worktree in the jail.
28. **Who owns what.**

    | Lane | Writes |
    |---|---|
    | founder | pyproject.toml, uv.lock, package-lock.json, desktop/package.json (dependencies only), desktop/python/runtime.json, Makefile |
    | L-tests | tests/unit/desktop_entry/test_desktop_main.py, tests/unit/desktop_entry/test_bundle_inputs.py |
    | L-api | api/desktop_main.py (socket, token from stdin, mode check, the three routes), api/local_routes.py, api/main.py (mounts local_routes, nothing else changes) |
    | L-desktop | desktop/src/* (engine.ts, socket.ts, paths.ts, manifest.ts, launch.ts, pages.ts, protocol.ts, main.ts and their tests), desktop/forge.config.ts, desktop/scripts/*, desktop/python/bundle.json, desktop/build/entitlements.plist, desktop/python/duly_engine.py (the launcher) |
    | L-security | security/threat-model.md: the engine channel row (port to socket), the ad-hoc build row, the library-validation entitlement if used |
    | L-review | reviews/step-w1.md |
    | L-audit | docs/requirements: the rows of section 10 |

29. **The plan, in order** (each round's done command holds only that round's new tests plus the
    gates; RUNBOOK "A change of behaviour lands in two rounds"):
    1. Step 0 (founder), point 27.
    2. Tests first (L-tests). Done:
       `bash -c 'uv run ruff check tests && uv run ruff format --check tests && uv run pytest
       tests/unit/desktop_entry -q --co >/dev/null'`.
    3. Build, in parallel:
       - L-api. Done: `bash -c 'uv run pytest tests/unit/desktop_entry/test_desktop_main.py
         tests/unit/api/test_compute_generic.py tests/unit/acceptance/test_journeys.py -q &&
         uv run mypy && uv run ruff check api && uv run ruff format --check api'`.
       - L-desktop. Done: `bash -c 'npm run typecheck -w desktop && npm test -w desktop && npx
         eslint desktop --max-warnings 0 && npx prettier --check "desktop/**/*.{ts,json}" && uv
         run python -m tools.copy_lint.lint && bash -n desktop/scripts/build-python.sh && bash -n
         desktop/scripts/sign-adhoc.sh && uv run pytest
         tests/unit/desktop_entry/test_bundle_inputs.py -q'`.
       - L-security, beside them (gate 4 needs the network and runs in clean CI, not here). Done:
         `bash -c 'grep -q "engine.sock" security/threat-model.md && grep -qi "ad-hoc"
         security/threat-model.md'`.
    4. Reconcile (L-tests), held to the whole suite and the hidden tests.
    5. Outside the jail (founder lane, not an agent): `make desktop-python desktop-package
       desktop-verify`, install from the DMG, three launches, `make desktop-launch-time`. Every
       failure goes back to the lane that owns it as a fix round.
    6. Review (L-review) with the packaged app's verify output and launch numbers in hand: try to
       reach the engine without the token, from another user's view of the socket folder, and with
       `ELECTRON_RUN_AS_NODE=1` and `--inspect` on the packaged binary (both must do nothing).
    7. Audit (L-audit).
    8. The founder lane renders the window, checks it live, sends the push notification and the
       test guide (point 30). This is a milestone only together with W2's first screens; on its
       own it is reported in words (the founder tests only at sizeable milestones).

## 9. The test guide (written when W1 is done)

30. Where the DMG is; drag to Applications; first open (right-click Open is not needed for a local
    build; a copy from elsewhere is blocked); the Keychain prompt and Always Allow; type made-up
    facts only, nothing real, no real documents; five things to try (first launch time, quit and
    reopen, Activity Monitor shows one python3 under Duly, the old screens work, quitting leaves no
    python3 running); what is not done (new UI, real data, notarization, updates, Windows).

## 10. For the founder

31. Three choices before step 0:
    - **Bundle id.** It is permanent for the Keychain and for the later Developer ID build.
      Recommendation: a reverse-domain id under a domain the company will own (D15 parked the
      domain), for example `app.duly.desktop`. Changing it later loses Keychain access to
      everything stored under the old one.
    - **Ad hoc or a self-signed identity** (point 22). Recommendation: a self-signed identity, so
      the Keychain does not ask after every rebuild while W2 is tested.
    - **The library-validation entitlement** if point 21 needs it. Recommendation: allow it for the
      ad-hoc founder build only.

## Covers

ARCHITECTURE 18 Step W items 1 to 6 (item 7 is the hand-over), 7.1 engine channel correction, 2.2
fuses, exact Electron, Forge, first-launch measure, 7.3 release gate on Anthropic code. Register
rows PLAN03-010 (Electron), PLAN03-011 to 014 (context isolation, sandbox, no Node in renderers,
one typed preload) are re-checked; DEC-D07 and DEC-D13 in part. The register (2,461 rows, 434 met,
17.6 percent) has no rows yet for D63 to D84 or for specs/duly-2 and specs/ui-2; the audit round
adds them first, then reports the share W1 meets. W1 alone moves little of the product share; its
value is that W2 has a real window to land in.

That is 2 of 2461 requirement rows named here; the audit round adds rows for D63 to D86 and recounts.

## Later (not W1)

Developer ID signing and notarization (Apple account as the company); an update channel from
Duly's own origin with signed, expiring metadata and a public release log (ARCHITECTURE 2.2, 7.1);
crash reporting through Relay, opt-in; Windows (named pipe, per-machine install, Artifact Signing);
Intel or universal builds; SLSA attestations and SHA-pinned Actions in a desktop workflow
(ARCHITECTURE 12); the Rust core replacing the sidecar (Phase 3).
