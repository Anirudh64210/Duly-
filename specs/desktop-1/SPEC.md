# Desktop round 1: Duly in its own window

Read PRINCIPLES.md, BOUNDARY.md and security/threat-model.md first.

## Goal

The founder runs one command and Duly opens in its own window on this Mac, with the engine running on the same machine. No browser, no Docker, no network.

```
make desktop
```

WorkBook, the document vault and the encrypted store are not part of this round. They are Phase 8.

## What is already here (the founder's part; lanes may not change it)

- desktop/package.json, desktop/tsconfig.json, desktop/vitest.config.ts. Electron is installed. No lane adds a dependency.
- The root Makefile has `desktop` (build the screen, build the shell, open the window) and `desktop-smoke`.

## How it is put together

| Piece | File | What it does |
|---|---|---|
| Main | desktop/src/main.ts | Starts the engine, opens the window, closes both together |
| Engine process | desktop/src/engine.ts | Starts the api on this machine and waits until it answers |
| App protocol | desktop/src/protocol.ts | Serves the built screen and passes `/api/` requests to the engine |
| Guard | desktop/src/guard.ts | Refuses navigation, new windows and every permission |
| Preload | desktop/src/preload.ts | The only bridge to the screen. In this round it exposes nothing but the app's version and platform |
| Smoke | desktop/src/smoke.ts | Opens the app, reads the screen, saves a picture, exits |

### The engine process

- Picks a free port on 127.0.0.1. Never binds any other address.
- Starts `uv run uvicorn api.main:app --host 127.0.0.1 --port <port>` with the repository root as its working folder, and `DULY_ENV=dev`. The command and the root are found from the app's own location; nothing is taken from the screen.
- Makes a token of 32 random bytes for this launch, gives it to the api as `DULY_LOCAL_TOKEN`, and sends it as the header `X-Duly-Local` on every request it passes on. The api side of this is the api lane's work, below.
- Waits for `/health` to answer, for at most 30 seconds. If it does not, the window shows one plain sentence, "Duly could not start its engine on this Mac.", with the last lines the process printed, and nothing else.
- When the window closes or the app quits, the process is ended. If the process ends on its own, the window says so; it never shows a verdict from a dead engine.

### The app protocol

- A custom scheme, `duly://app/`, registered as standard and secure. The screen is loaded from `duly://app/index.html`.
- `duly://app/api/<path>` is passed to `http://127.0.0.1:<port>/<path>` with the method, the body and the content type, and the token. Every other path is a file under web/dist.
- A path that would leave web/dist is refused with 404. Test this with `..`, with an absolute path, and with encoded forms of both.
- Every response carries: `Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer`.
- The screen is built with a relative base so that it loads from the scheme. If the web build needs a setting for this, write the request in your report; the web lane owns that file.

### The window

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`, `webviewTag: false`, no remote module.
- Navigation to anything but `duly://app/` is refused. A link to an outside page (a citation) is opened in the person's own browser, and only when it is `https:` and its host is in the list of primary sources in tools/sources/verify.py (copy the list into desktop/src/guard.ts with a test that the two lists are the same).
- `window.open` is refused. Every permission request (camera, microphone, location, notifications and the rest) is refused.
- 1200 by 860 to begin with, no smaller than 900 by 600. Title "Duly".
- One instance. A second launch brings the first window forward.

### The smoke run

`electron . --smoke <folder>` opens the app, waits for the verdict heading to appear, then writes into the folder:

- `window.png`, the window as drawn
- `screen.json`: the page's title, the text of every heading, and the text of the footer

and exits with 0. If the heading does not appear within 40 seconds it writes what it has and exits with 1.

## The api (L-api)

When `DULY_LOCAL_TOKEN` is set, every request except `/health` must carry the same value in `X-Duly-Local`, compared in constant time. Without it the answer is 403 in plain words. When the variable is not set, nothing changes. Tests for both.

## The screen (L-web)

The build works when served from `duly://app/`: asset paths are relative, and requests go to `api/` relative to the page. It still works from the local stack at http://localhost:5173. Tests for the request path.

## Tests

Beside the code, in desktop/src/*.test.ts, run with vitest in node. Everything that decides something is a plain function that takes its inputs and is tested without Electron: choosing the port, building the engine command, mapping a request path to a file or to the engine, refusing a path, deciding whether a link may be opened, the headers. main.ts and smoke.ts hold only the wiring.

## Done for the round

1. `npm run typecheck -w desktop` and `npm test -w desktop` pass; lint and copy lint are clean.
2. The api and web tests pass.
3. The founder's smoke run passes on this Mac, outside the sandbox, and the picture shows Duly's screen.
4. The reviewer approves.
