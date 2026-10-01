# Duly clients: desktop, mobile, web, and the shared core

Status: research and recommendation for the founder, 2026-10-01. Part of the duly-2 architecture set. Read with BLUEPRINT.md sections 4 to 8, research-security.md and research-system.md. Where this file and DECISIONS.md disagree, DECISIONS.md wins. Outside claims carry a URL; anything not confirmed in this pass is marked **(unverified)**. Prices are marked unverified unless a fetched page stated them.

Decisions this file serves: D54 (vault encrypted on the device, optional end-to-end backup), D55 (documents read and sorted on the device), D60 (no document value reaches any model), D73 (reminders computed on the device), D75 (the Loop), D78 (Mac, Windows, Android and iPhone from the start; one shared core), D79 (Ask reasons with Claude through Amazon Bedrock in Duly's own AWS account; the engine supplies every date and count).

---

## 0. The answer on one page

**Why Duly is not yet "in its own window like Slack".** It half is. The repository already has an Electron shell (desktop/, Electron ^44, `make desktop`) with a sandboxed window, a custom `duly://` scheme, a strict CSP and a navigation guard (specs/desktop-1/SPEC.md). What it lacks is everything that turns a developer shell into an app a person installs:
1. It starts the Python engine with `uv run uvicorn` from the repository folder (desktop/src/engine.ts), so it only runs on a machine that has the repository, uv and Python.
2. There is no packager (no Electron Forge or electron-builder in desktop/package.json), so there is no .app, .dmg or Windows installer.
3. Nothing is signed or notarized, so macOS Gatekeeper and Windows SmartScreen would block or warn.
4. There is no auto update, no crash reporting, and no encrypted local store yet (the vault is Phase 8 in desktop-1).

Section 10 gives the shortest honest path to a signed, installable Duly window, and the founder's test point for it.

**Recommendation in seven lines.**

| Area | Recommendation | Main reason |
|---|---|---|
| Shared core | Port the engine, Loop runner, event log, envelope crypto and sync client to **Rust** (`duly-core`); bind with **UniFFI** for Swift and Kotlin, **napi-rs** for Electron, **wasm-bindgen** for the web. Keep the Python engine as the oracle with byte-identical golden vectors | Only option that runs natively and identically on all four platforms plus the browser, with no JIT and no JavaScript runtime on the phone; the 1Password, Bitwarden and Signal pattern |
| Desktop (Mac, Windows) | **Electron**, keeping the existing shell and the React web UI; the core runs in a utility process, never in the renderer | One Chromium on both platforms, the most mature signing, update and crash tooling, and the code already exists. Tauri is the credible alternative and is weighed in 3.1 |
| Mobile (iPhone, Android) | **React Native with Expo** (development builds, New Architecture), core bound through uniffi-bindgen-react-native, plus small native modules in Swift and Kotlin for keys, document reading and notifications | One small team, one language for UI, and the security-critical parts stay native. Fully native apps are the upgrade path and the core makes that reversible |
| Web | Public library and account site at launch (static, no third-party script); the record on the web later, from the same core compiled to WebAssembly, behind code transparency | The web is the hardest client to trust (research-security 3.9) |
| Local storage | SQLite with **SQLCipher** on desktop and mobile, owned by the core (one schema, one migration path); documents as per-file encrypted blobs beside it; on the web, SQLite WASM on OPFS with app-level encryption | Same storage code everywhere; SQLCipher is not available in browsers |
| Offline first | The local event log is the source of truth; the server is a relay of ciphertext; every screen works with no network | D54, D73, the threat model |
| Crash reporting | Platform crash reports first; Sentry-protocol reporting only with SDK-side scrubbing, no breadcrumbs, opt-in, and the recorded-bytes canary test in CI | Crash reports are the likeliest accidental leak of student data |

What this costs: a Rust port of about 3,681 lines of Python (engine/*.py, counted 2026-10-01) plus the new event log, crypto and sync code that would have to be written in some language anyway; and one engineer comfortable in Rust, or a time-boxed spike first (BLUEPRINT Phase 3).

---

## 1. What every client must do

These follow from the decisions above and the blueprint; they are the test each option below is measured against.

| # | Requirement | Source |
|---|---|---|
| C1 | Every date, count and verdict comes from the deterministic engine, on the device, identical on every platform | CLAUDE.md hard rules; D78; BLUEPRINT 6 |
| C2 | The engine, Loop runner and follow-up scheduler run with no network | D73, BLUEPRINT 2.4 |
| C3 | Documents are read on the device; nothing leaves for reading | D55 |
| C4 | Documents and the record are encrypted on the device; the server holds ciphertext and wrapped keys only | D54, BLUEPRINT 5 |
| C5 | Device keys live in the platform key store with user presence, hardware-backed where present | BLUEPRINT 5.2 |
| C6 | No document value, file, name or identifier reaches any model, including Bedrock in Duly's account; the Ask path sends only what D79 and D60 allow | D60, D79 |
| C7 | No student data in logs, crash reports, push payloads, notification previews or calendar titles by default | BLUEPRINT 5.5, 6 |
| C8 | Reminders fire on the planned day even if the app is not opened | BLUEPRINT 2.4 |
| C9 | Signed builds, signed updates, signed rule bundles; rule bundles are data, never code | BLUEPRINT 5.5 |
| C10 | Small team, cost matters, professional standards: fewer languages, fewer moving parts, tested contracts | Task constraints |

---

## 2. The shared core

### 2.1 What goes in the core and what stays on each platform

The core is everything that must give the same answer everywhere. The platform shell is everything that touches hardware, the OS or pixels.

| In `duly-core` (one implementation) | Per platform (thin, native) |
|---|---|
| Engine: rules, dates, counts, verdicts, Clock injected | UI |
| Rule bundle verification (TUF metadata, signatures) and loading | Key store calls that need hardware or user presence (Keychain, Secure Enclave, Android Keystore, Windows Hello) |
| Loop runner and statecharts (D75) | Document reading (Vision, ML Kit, Windows.Media.Ocr) and camera |
| Follow-up scheduler planning (which reminders, on which day) | Delivering notifications (UNUserNotificationCenter, AlarmManager or WorkManager, Electron Notification) |
| Event log, projections, schema migrations, SQLCipher access | Push token registration |
| Envelope crypto: K_vault, HKDF derivations, per-file and per-item keys, AES-GCM envelopes, signatures over events and checkpoints | Passkey sign-in (system browser or platform authenticator) |
| Sync client: hash chains, checkpoints, epochs, conflict detection | File system locations and backup exclusion |
| Template filling with typed holes and the number and citation validator (BLUEPRINT 4.3) | Background scheduling hooks |
| Ask request shaping: what may leave for Bedrock under D60 and D79, decided by code, not by the UI | Crash and diagnostics plumbing |

The core exposes a small, typed, versioned API (commands in, events and projections out). The platform passes in callbacks for the hardware operations, so the core never holds a raw device key it does not need. UniFFI supports this shape ("callback interfaces" and foreign traits); the exact feature set per binding should be confirmed in the spike **(unverified detail)**.

### 2.2 The four options

| | A. Rust core | B. TypeScript port | C. Kotlin Multiplatform | D. Embed Python |
|---|---|---|---|---|
| How it reaches each platform | UniFFI to Swift and Kotlin; napi-rs or WASM for Electron; wasm-bindgen for the web; uniffi-bindgen-react-native for React Native | Runs in Electron and browsers as is; in React Native under Hermes; native Swift or Kotlin apps would need an embedded JS engine | Kotlin/JVM on Android and desktop, Kotlin/Native framework on iOS, Kotlin/JS or Kotlin/Wasm on the web | CPython embedded on iOS and Android; bundled CPython on desktop; Pyodide in the browser |
| Status of the toolchain | UniFFI officially supports Kotlin, Swift, Python and Ruby; React Native, KMP, C#, Go are third party ([UniFFI](https://mozilla.github.io/uniffi-rs/latest/)) | Mature | KMP core is Stable on Android, iOS, JVM and Kotlin/JS; Kotlin/Wasm is Beta ([Kotlin supported platforms](https://kotlinlang.org/docs/multiplatform/supported-platforms.html)) | CPython documents iOS embedding as of 3.14 ([Python on iOS](https://docs.python.org/3/using/ios.html)); Android is Tier 3 from 3.13 ([PEP 738](https://peps.python.org/pep-0738/)) |
| Same answer everywhere | One compiled implementation; integer civil-date arithmetic | One implementation, but JS numbers are doubles and `Date` is a trap; Temporal is not Baseline yet ([MDN Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal)), so a polyfill or a hand-rolled civil date type is needed | One language, but three compilers (JVM, Native, JS) with different runtimes | The existing code, but the oracle and the product become the same thing, so differential testing loses its point |
| Phone constraints | Native code, no JIT, no JS engine needed | React Native: fine. Native Swift or Kotlin UI: needs JavaScriptCore or a bundled engine | Fine on both phones | The engine imports `jsonschema`, which depends on `rpds-py`, a compiled Rust extension (uv.lock); every binary module on iOS must be a separate framework ([Python on iOS](https://docs.python.org/3/using/ios.html)); size and cold start not measured **(unverified)** |
| Web | WASM, small, runs in a worker | Native | Kotlin/JS stable; Kotlin/Wasm Beta | Pyodide; the full distribution is "200+ megabytes" ([Pyodide](https://pyodide.org/en/stable/usage/downloading-and-deploying.html)); the core download is smaller but not measured here **(unverified)** |
| Crypto | One audited library compiled into every platform | WebCrypto in browsers and Electron; a native module in React Native | Per-target crypto (CryptoKit on iOS, JCA on Android) or a C library | Python cryptography wheels per platform |
| Precedent | 1Password 8: shared Rust backend for "server communication, database handling, permissions enforcement, cryptographic routines", Electron on desktop, SwiftUI on iOS ([1Password](https://1password.com/blog/1password-8-the-story-so-far)); Bitwarden: Rust SDK, WASM for web, UniFFI for Swift and Kotlin ([bitwarden/sdk-internal](https://github.com/bitwarden/sdk-internal)); Signal: Rust libsignal with Java, Swift and TypeScript bindings ([libsignal](https://github.com/signalapp/libsignal)) | Many React and React Native products | Many Android-first products; Compose for iOS Stable since May 2025 ([JetBrains](https://blog.jetbrains.com/kotlin/2025/05/compose-multiplatform-1-8-0-released-compose-multiplatform-for-ios-is-stable-and-production-ready/)) | Rare for production mobile apps **(unverified)** |
| Skills and agent fit | Rust is new to the repo; agents write Rust well, but review needs a human who reads Rust | Matches the repo's TypeScript strict lanes | New language and build system | Already written |
| Main risk | Port effort and Rust review capacity | Subtle date and number bugs; needs a JS engine on any native mobile UI | Web path is Beta; the web UI is React | App size, start time, iOS packaging, Android Tier 3 |

### 2.3 Recommendation: Rust core, Python oracle

Choose **A**, as BLUEPRINT 6 and research-system 5.3 already proposed, for these reasons specific to Duly:
- **It is the only option that does not tie the mobile UI choice to the core.** With Rust, React Native today and native Swift or Kotlin later both use the same core. With a TypeScript core, moving to native mobile later means shipping a JS engine inside a native app. With KMP, the web needs a Beta target.
- **React Native cannot use the WASM build.** Hermes, React Native's engine, does not list WebAssembly among its features ([Hermes features](https://github.com/facebook/hermes/blob/main/doc/Features.md); the page is old, so treat newer Hermes as **unverified**). So a mobile React Native app needs native bindings regardless; uniffi-bindgen-react-native generates JSI C++ and a Turbo Module for that, and also a WASM crate for the web ([uniffi-bindgen-react-native](https://github.com/jhugman/uniffi-bindgen-react-native)). It is maintained by a small group funded by Filament, Mozilla and LiveKit, not by Mozilla's UniFFI team, so it is a dependency to watch.
- **Crypto in one place.** The envelope format (BLUEPRINT 5.2) is implemented once and audited once. The blueprint's rule "vetted libraries only" becomes: the core uses one audited Rust crypto library chosen in a security review (candidates: RustCrypto AEAD crates, AWS-LC via aws-lc-rs, libsodium; audit status of each **unverified** in this pass). Hardware-bound operations stay in the platform key store.
- **Determinism is checkable.** The Python engine stays the oracle. Every rule bundle ships golden vectors (property-generated, clock-injected) and the Python output; the Rust core must produce byte-identical normalized output on every target (native macOS, Windows, iOS simulator, Android emulator, WASM in Node) before a bundle or core release ships. This is BLUEPRINT risk 2's mitigation made into a CI job.

Notes for the port:
- **Dates.** The engine needs civil dates, month and year addition, business days, federal holidays and "today" in a recorded zone (engine/dates.py, engine/clocks.py). Use a plain civil-date type for arithmetic, and a time zone library only to turn an instant into "today". Jiff is a Temporal-inspired Rust library that can embed the IANA database and supports WASM ([jiff](https://docs.rs/jiff/latest/jiff/)); it is still 0.2.x, so pin it and wrap it. **Bundle the tz database inside the core and record its version with every result**, rather than using the OS copy, so that Python, iOS, Android, Windows and the browser all compute the same "today" for the same instant. The Python oracle must use the same tz version in its vectors.
- **Move tables into data first** (calendars, holiday lists, day-count tables into the signed bundle), as BLUEPRINT 6 says, so less logic is ported.
- **No floating point** anywhere in date or count logic; a CI lint can forbid `f32` and `f64` in the engine crate.
- **Bundle schema checks.** The Python engine validates bundles with jsonschema; in Rust, validate with generated types from the same schemas (contracts/), plus the TUF signature check.
- **Interim.** Until the port passes, the desktop app may run the Python engine as a bundled, signed sidecar (section 10). This does not work on phones and must not become permanent.

### 2.4 Bindings per platform

| Target | Binding | Where the core runs |
|---|---|---|
| macOS, Windows (Electron) | napi-rs Node addon ([napi-rs](https://napi.rs/); Electron compatibility not stated on that page, confirm in the spike **(unverified)**) | In an Electron utility process, which Electron recommends for "untrusted services, CPU intensive tasks or crash prone components" ([Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)) |
| iPhone (React Native) | uniffi-bindgen-react-native: generated JSI C++ binding plus a Turbo Module | In process, called from JS through JSI; heavy calls off the JS thread |
| Android (React Native) | Same | Same |
| iPhone, Android (if native UI later) | UniFFI Swift and Kotlin | In process |
| Web | wasm-bindgen | In a dedicated Web Worker |
| CI, oracle comparison | UniFFI Python binding | Lets the existing Python tests run against the Rust core |

---

## 3. Desktop: Mac and Windows

### 3.1 Electron or Tauri

| | Electron | Tauri 2 |
|---|---|---|
| Rendering | Bundled Chromium, identical on Mac and Windows | System webview: WKWebView on macOS, WebView2 (Chromium) on Windows; macOS WebKit "updates only with regular OS updates" ([Tauri webviews](https://v2.tauri.app/reference/webview-versions/)). Two engines to test |
| Backend language | Node in main and utility processes; Rust via napi-rs | Rust natively, which suits a Rust core |
| Security model | Opt-in hardening: a 20-item checklist ([Electron security](https://www.electronjs.org/docs/latest/tutorial/security)) and fuses ([fuses](https://www.electronjs.org/docs/latest/tutorial/fuses)). The repo already applies most items (desktop/src/guard.ts, main.ts) | Deny-by-default capabilities, permissions and scopes; the WebView "has only access to exposed system resources via the well-defined IPC layer" ([Tauri security](https://v2.tauri.app/security/)); an external audit before 2.0 ([Tauri 2.0](https://v2.tauri.app/blog/tauri-20/)) |
| Updates | Squirrel-based `autoUpdater`, static storage or a server ([Electron updates](https://www.electronjs.org/docs/latest/tutorial/updates)) | Built-in updater whose signature "cannot be disabled" ([Tauri updater](https://v2.tauri.app/plugin/updater/)) |
| Crash reporting | Crashpad built in, local-only mode available ([crashReporter](https://www.electronjs.org/docs/latest/api/crash-reporter)) | Rust panic handling plus a third-party SDK |
| Size and memory | Large (ships Chromium) | Small (system webview); exact sizes not measured **(unverified)** |
| Maturity and precedent | 1Password, Signal Desktop, Slack, VS Code; 1Password chose Electron so it could cover many macOS versions "without requiring additional UI toolkit maintenance" ([1Password](https://1password.com/blog/1password-8-the-story-so-far)) | Stable since October 2024; mobile is newer, and the team says it wants to "improve especially the mobile development experience" ([Tauri 2.0](https://v2.tauri.app/blog/tauri-20/)) |
| Cost of change for Duly | Low: the shell, tests, smoke run and protocol handler exist | Rewrite the shell; retest the React UI on WebKit |

**Recommendation: Electron.** The deciding facts for Duly are one rendering engine to test (the founder judges screens closely), an existing hardened shell with 139 passing tests (desktop/PROGRESS.md), and mature crash and update tooling. Tauri's real advantages (smaller, Rust-native, deny-by-default) are largely recovered by running the Rust core in a utility process and keeping the renderer at zero privileges. Revisit if app size becomes a real complaint.

Upgrade cadence is a standing cost: Electron ships a major every 8 weeks and supports only the latest three ([Electron timelines](https://www.electronjs.org/docs/latest/tutorial/electron-timelines)), so plan an upgrade at least every 16 weeks, and treat a Chromium security release as an incident.

### 3.2 Process layout

```
Renderer (React UI from web/, sandboxed, no Node, CSP)
   │  contextBridge: one named method per action, typed, validated
Main process (window, menus, protocol, updater, notifications; holds no keys)
   │  MessagePort
Utility process: duly-core (napi-rs) ── SQLCipher database, encrypted files
   │
Platform helper (Swift on macOS, C# or C++ on Windows): key store with user presence, OCR
```

- The renderer never sees a key, a file path or the network. It asks for projections and sends commands. Electron says to expose "one method per IPC message" and never `ipcRenderer` itself ([context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)); validate the sender of every message (checklist item 17).
- The current shell proxies `duly://app/api/*` to a local HTTP server with a per-launch token. With the core in a utility process, that HTTP hop and its port go away; until then (the Python sidecar interim), keep the token and the 127.0.0.1 bind.

### 3.3 Hardening checklist

Already in desktop/ (desktop-1 SPEC): context isolation, sandbox, no Node integration, webSecurity on, no webview tag, custom secure scheme instead of `file://`, CSP on every response, navigation and `window.open` refused, every permission refused, outside links only to allowlisted primary sources over https, single instance.

To add before any stranger installs Duly:
1. **Fuses** at package time with `@electron/fuses`: `runAsNode` off, `nodeOptions` off, `nodeCliInspect` off, `embeddedAsarIntegrityValidation` on, `onlyLoadAppFromAsar` on, `grantFileProtocolExtraPrivileges` off, `cookieEncryption` on ([fuses](https://www.electronjs.org/docs/latest/tutorial/fuses)).
2. **ASAR integrity**: macOS from Electron 16, Windows from Electron 30; without `onlyLoadAppFromAsar` "the validity checking can be bypassed" ([ASAR integrity](https://www.electronjs.org/docs/latest/tutorial/asar-integrity)).
3. **No `shell.openExternal` with untrusted content** (checklist 15); the current allowlist already satisfies this, keep its test.
4. **Validate IPC senders** against the app origin on every handler.
5. **Content protection** on windows that show documents (`setContentProtection`) to keep them out of screen capture **(behaviour per OS unverified)**; blur on lock and on idle (BLUEPRINT 5.5).
6. **Dependencies**: lockfile, `npm ci`, install scripts off, 7-day cooling-off, no new dependency without founder approval (research-security 8).
7. **Stay current** with Electron: "an application built with an older version of Electron, Chromium, and Node.js is an easier target" ([Electron security](https://www.electronjs.org/docs/latest/tutorial/security)).

### 3.4 Keys and unlock on desktop

- `safeStorage` is not enough on its own: on Windows DPAPI means "only a user with the same logon credential" can decrypt, which does not stop other apps of the same user; on Linux without a secret store data is "encrypted via hardcoded plaintext password" ([safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)). Use the async API if it is used at all.
- `systemPreferences.promptTouchID` is a prompt, not a key; Electron's own docs say to pair it with Keychain items whose access control triggers Touch ID ([systemPreferences](https://www.electronjs.org/docs/latest/api/system-preferences)).
- **macOS:** DK_dev in a Keychain item with an access-control object requiring user presence, created by a small signed Swift helper (documents-1 already plans the "duly-unlock" helper). SK_dev in the Secure Enclave where present; Secure Enclave keys are P-256 and not exportable ([Apple](https://developer.apple.com/documentation/security/protecting-keys-with-the-secure-enclave)).
- **Windows:** Windows Hello `KeyCredentialManager` creates a key pair in the TPM (software fallback without one), and every use needs a PIN or biometric gesture; the API signs, it does not encrypt, and the key is RSA ([Windows Hello](https://learn.microsoft.com/en-us/windows/apps/develop/security/windows-hello)). Turning a Hello signature into a wrapping key is a known pattern but is a crypto design decision that needs the human security reviewer **(unverified pattern)**. Fallback: DPAPI plus `UserConsentVerifier`, stated in the security page as weaker.
- **Linux:** not supported at launch (D78 does not list it).

### 3.5 Sign-in on desktop

Passkeys are the sign-in method (BLUEPRINT 5.3). WebAuthn inside an Electron window has a long-open issue for pages not served from an https origin ([electron#24573](https://github.com/electron/electron/issues/24573)); current behaviour with a custom scheme is **unverified**. The robust path is the one RFC 8252 requires for native apps: sign in through the system browser with PKCE and a loopback or claimed redirect, never an embedded login page ([RFC 8252](https://datatracker.ietf.org/doc/html/rfc8252)). The browser handles the passkey; the app gets a session bound to SK_dev. Signing in opens nothing by itself; K_vault still comes from pairing or the recovery kit.

### 3.6 Packaging, signing, notarization

- **Tool:** Electron Forge (Electron's own) with makers for DMG and ZIP on macOS and Squirrel.Windows or MSIX on Windows ([Forge makers](https://www.electronforge.io/config/makers), [Squirrel.Windows maker](https://www.electronforge.io/config/makers/squirrel.windows)). electron-builder is the common alternative; pick one and do not mix.
- **macOS:** Developer ID signing, hardened runtime, secure timestamp, `notarytool`, staple ([Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)). Electron notes that `safeStorage`, login items and `autoUpdater` "only behave correctly once your app is code signed" ([Electron code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)). Every embedded binary (the Swift helper, the Python sidecar during the interim, the napi addon) must be signed too. Universal or separate arm64 and x64 builds.
- **Windows:** Microsoft's Artifact Signing (formerly Trusted Signing) is "the cheapest option for code signing on Windows, and it gets rid of SmartScreen warnings" ([Electron code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)); keys live in FIPS 140-3 Level 3 HSMs ([Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/overview)). Eligibility matters: Public Trust certificates go to organizations in the US, Canada, EU, UK and several other countries, while **individual developers must be in the US or Canada**, and validation takes 1 to 20 business days ([Artifact Signing quickstart](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart)). So Duly should sign as its company once it exists. The alternative is an EV certificate on hardware or a cloud HSM. Build x64 and arm64.
- **Stores:** start with direct download (Developer ID, signed Windows installer). The Mac App Store build disables `crashReporter` ([crashReporter](https://www.electronjs.org/docs/latest/api/crash-reporter)) and adds sandbox work; revisit later.
- **Release keys** in hardware, two people to release (research-security 8). CI signs through short-lived OIDC credentials; build agents never hold signing keys.

### 3.7 Auto update

- `update.electronjs.org` needs a **public** GitHub repository ([Electron updates](https://www.electronjs.org/docs/latest/tutorial/updates)), so it does not fit unless Duly is open source.
- Use static storage: signed release files and update metadata on S3 behind CloudFront, served to Squirrel.Mac and Squirrel.Windows through `autoUpdater` (or electron-updater's generic provider). Squirrel.Mac checks the new app's code signature against the running one **(unverified detail; confirm in the spike)**. On Windows, verify the publisher of the downloaded installer before applying.
- **Staged rollout**: 1%, 10%, 100% by a hash of an install id that the server cannot link to a student; a kill switch file; a signed "minimum version" for security fixes.
- **Two update channels, kept apart**: the app binary (Squirrel, code-signed) and the rule bundle (TUF, threshold-signed, data only; BLUEPRINT 5.5). A rule change never needs an app update unless the bundle's `min_engine` says so, in which case the app shows "Can't tell yet: update Duly" (BLUEPRINT 6).
- CDN logs for update and bundle paths off or short-lived (BLUEPRINT 5.5).

### 3.8 Crash reporting and logs on desktop

- Crashpad is built in; with `uploadToServer: false` dumps stay in `app.getPath('crashDumps')` ([crashReporter](https://www.electronjs.org/docs/latest/api/crash-reporter)). Default: collect locally, and offer "Send this crash report" with a preview of what is sent.
- If a service is used: the Sentry Electron SDK sends renderer events through the main process, supports `beforeSend`, `beforeBreadcrumb`, `maxBreadcrumbs` (default 100) and an offline queue ([Sentry Electron](https://docs.sentry.io/platforms/javascript/guides/electron/), [options](https://docs.sentry.io/platforms/javascript/guides/electron/configuration/options/)). Sentry's own advice for mobile is to scrub in the SDK so data never leaves the device ([Sentry RN sensitive data](https://docs.sentry.io/platforms/react-native/data-management/sensitive-data/)). Duly settings: no breadcrumbs, no screenshots, no replay, no user context, release and platform only, stack frames only, messages replaced by error codes.
- Hosting: Sentry SaaS is a third party that would receive crash data; self-hosted Sentry needs "4 CPU Cores, 16 GB RAM + 16 GB swap" ([self-hosted Sentry](https://develop.sentry.dev/self-hosted/)); GlitchTip accepts Sentry SDKs and runs on Postgres with about 512 MB RAM ([GlitchTip](https://glitchtip.com/documentation/install)). For a small team with a "hold almost nothing" stance, GlitchTip in Duly's AWS account is the cheaper fit; the observability file should make the final call.
- The CI recorded-bytes test (BLUEPRINT 6) must include a forced crash with canary SEVIS IDs and dates in memory, and fail if any appear in the upload.

### 3.9 Desktop notifications and background

Electron shows notifications only while the app or a tray helper runs (research-system 8.2). Offer an opt-in login item that keeps a tiny tray process to fire the day's reminders, and always offer the calendar file. Electron's `pushNotifications` registers with APNs on macOS only; there is no Windows equivalent in Electron ([pushNotifications](https://www.electronjs.org/docs/latest/api/push-notifications)). The desktop does not need push: it fetches the public bundle on launch and on a timer.

---

## 4. Mobile: iPhone and Android

### 4.1 The options

| | React Native with Expo | Native Swift and Kotlin | Kotlin Multiplatform with Compose | Others |
|---|---|---|---|---|
| UI code | One TypeScript and React codebase for both phones; shares language, types, design tokens and copy with desktop and web, though not DOM components | Two UI codebases (SwiftUI, Jetpack Compose) | One Kotlin UI for both phones (Compose for iOS Stable since 1.8.0) | Flutter (Dart, a fourth language); Tauri mobile (young, see 3.1) |
| Access to security APIs | Through Expo modules and custom native modules (Expo Modules API in Swift and Kotlin) ([Expo CNG](https://docs.expo.dev/workflow/continuous-native-generation/)) | Direct and complete | Direct on Android; through Kotlin/Native interop on iOS | Plugins |
| Rust core | uniffi-bindgen-react-native | UniFFI (official) | UniFFI KMP bindings are third party | Possible |
| Team cost | Lowest for a small TS team; React Native's docs recommend starting with Expo ([React Native](https://reactnative.dev/docs/environment-setup)) | Highest: two platform specialists | Medium; iOS feel less native **(unverified judgement)** | Medium |
| Precedent in this category | Many consumer apps **(unverified for password managers)** | 1Password (SwiftUI on iOS), Bitwarden (native Kotlin and Compose on Android, Rust SDK) ([bitwarden/android](https://github.com/bitwarden/android)) | Growing | |

**Recommendation: React Native with Expo**, on these terms:
1. **Development builds and Continuous Native Generation**, never Expo Go (SQLCipher "is not supported on Expo Go": [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/)).
2. **New Architecture** (default since React Native 0.76): JSI gives synchronous native calls without the old bridge ([React Native blog](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here)), which is how the core is called.
3. **Every security-critical path is native code**, written as small Expo modules in Swift and Kotlin with their own tests: device keys with access control, the document reader, notification scheduling, backup exclusion, screen protection. JavaScript renders and routes; it never holds K_vault and never computes a date.
4. **No over-the-air JavaScript updates in v1.** EAS Update can change "JS, styling, and images" without store review ([EAS Update](https://docs.expo.dev/eas-update/introduction/)), which is a code channel outside the signed binary. If it is ever turned on, use update code signing (EAS Production plan or above: [EAS code signing](https://docs.expo.dev/eas-update/code-signing/)) and the same two-person release rule.

Why not native first: three UI codebases (SwiftUI, Compose, React for desktop and web) is too much for one founder and an agent factory, and the blueprint's Phase 4 is a local-only iPhone app whose hard parts (keys, reading, reminders) are native modules either way. Why the choice is reversible: the Rust core and the native modules carry over unchanged to a SwiftUI or Compose app. A trigger to switch: the native-module layer grows past the React layer, or accessibility and platform feel fail in the student sessions.

### 4.2 Secure storage and keys

| Need | iPhone | Android |
|---|---|---|
| DK_dev (device unlock key) | Keychain item, `WhenUnlockedThisDeviceOnly`, with an access-control object requiring user presence, so the OS releases the key only after Face ID, Touch ID or passcode | Android Keystore AES key with `setUserAuthenticationParameters(..., AUTH_BIOMETRIC_STRONG or AUTH_DEVICE_CREDENTIAL)` and `setUnlockedDeviceRequired(true)`; used through `BiometricPrompt` with a `CryptoObject` ([Android Keystore](https://developer.android.com/privacy-and-security/keystore)) |
| SK_dev (device signing key) | Secure Enclave P-256, not exportable ([Apple](https://developer.apple.com/documentation/security/protecting-keys-with-the-secure-enclave)) | Keystore EC P-256, StrongBox where `FEATURE_STRONGBOX_KEYSTORE` is present (API 28+), otherwise TEE; record which, and check `securityLevel` ([Android Keystore](https://developer.android.com/privacy-and-security/keystore)) |
| Biometric change | `biometryCurrentSet` invalidates on enrolment change; choose `userPresence` instead so a new fingerprint does not lock the student out, and rely on the passcode fallback | Keys are invalidated on new enrolment by default; `setInvalidatedByBiometricEnrollment(false)` changes that ([Android Keystore](https://developer.android.com/privacy-and-security/keystore)). Decide once, document, test |
| Attestation | App Attest **(unverified detail, research-security 3.4)** | Key attestation and Play Integrity |

Rules:
- **Biometrics must be crypto-bound, not a yes or no.** `expo-local-authentication` returns a success result and does not bind to keys ([expo-local-authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/)); a hooked app could fake the result. Unlock must be "the OS released the key", which only Keychain access control or a Keystore key with authentication gives. This is OWASP MASVS-AUTH territory ([MASVS](https://mas.owasp.org/MASVS/)).
- `expo-secure-store` is acceptable for small, non-critical secrets (session tokens), with its caveats: payloads above about 2048 bytes were refused on some iOS releases, `requireAuthentication` items become unreadable after biometric changes, and Android entries are deleted on uninstall ([expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/)). DK_dev and SK_dev go through Duly's own native module.
- Target **MASVS L2** (sensitive data) for both apps, and test against MASTG before the first stranger.

### 4.3 Keep the vault out of OS backups

- iPhone: set `isExcludedFromBackup` on the vault and database directories ([Apple](https://developer.apple.com/documentation/foundation/optimizing-your-app-s-data-for-icloud-backup)); "this device only" Keychain items are already bound to the device (research-security 3.3).
- Android: `android:dataExtractionRules` excluding the vault for `cloud-backup` and `device-transfer`, plus `fullBackupContent` for Android 11 and lower ([Android Auto Backup](https://developer.android.com/identity/data/autobackup)).
- Duly's own end-to-end backup (D54) is the only backup of the vault. Test: a restored device backup opens nothing.

### 4.4 Reminders, background work and push

- **Dated reminders are pre-scheduled local notifications**, planned by the core and handed to the OS. iOS keeps only the soonest 64 pending requests (developer forum reports, research-system 8.2; not stated on the API page fetched in this pass, so device test it **(unverified)**); schedule the nearest ~50 and re-plan on open, on sync and on background refresh (BLUEPRINT 2.4).
- **Android timing:** `SCHEDULE_EXACT_ALARM` is not pre-granted on Android 13+ and is denied by default on 14; `set()` fires within an hour, `setWindow()` takes a minimum 10-minute window, `setAndAllowWhileIdle()` works in Doze ([Android alarms](https://developer.android.com/develop/background-work/services/alarms/schedule)). A morning reminder fits an inexact window; copy says "in the morning", not a time. Ask for `POST_NOTIFICATIONS` in context, not at first launch ([Android notification permission](https://developer.android.com/develop/ui/views/notifications/notification-permission)).
- **Background refresh** (fetch the public bundle, re-plan): `expo-background-task` uses BGTaskScheduler and WorkManager; Android's minimum interval is 15 minutes, iOS "may choose to run the task at a later time", and the iOS API does not run in the simulator ([expo-background-task](https://docs.expo.dev/versions/latest/sdk/background-task/)). WorkManager work persists across reboots ([WorkManager](https://developer.android.com/develop/background-work/background-tasks/persistent)). Never rely on it for a dated reminder.
- **Push** is a content-free wake-up for a new public bundle (BLUEPRINT 6). Background pushes are low priority, throttled, not guaranteed, and not delivered after the user force-quits the app ([Apple](https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app)). Send **directly to APNs and FCM** with native device tokens (`getDevicePushTokenAsync`), not through Expo's push service, so no extra party holds Duly's token list ([Expo custom push](https://docs.expo.dev/push-notifications/sending-notifications-custom/)). Prefer FCM topics and one broadcast over per-device lists (BLUEPRINT 6).
- **Lock screen:** generic previews by default ("Duly: 1 item today"); no status widgets by default (BLUEPRINT 5.5).

### 4.5 Reading documents on the phone

Native modules: Vision on iPhone (on device), ML Kit Text Recognition v2 **bundled** on Android ("about 4 MB size increase per script per architecture", available immediately, on device) ([ML Kit](https://developers.google.com/ml-kit/vision/text-recognition/v2/android)). Render pages to pixels and read pixels only; parse PDFs with scripts off (research-security 4 and 5). The core does the deterministic checks (MRZ check digits, formats, cross-document checks) so they are identical on every platform.

### 4.6 Crash reporting on mobile

First-party first: Xcode Organizer and MetricKit on iPhone (from users who share diagnostics with developers: [Apple](https://developer.apple.com/documentation/xcode/acquiring-crash-reports-and-diagnostic-logs)), Android vitals in Play Console ([Android vitals](https://developer.android.com/topic/performance/vitals/crash)). These add no third party. A Sentry-protocol SDK only with the scrubbing rules in 3.8. Disclose all of it in the App Store privacy label and Play data safety form.

### 4.7 Other mobile hardening

App-switcher blur, secure text entry for SEVIS ID and receipt fields, clipboard expiry, no Spotlight or Siri indexing of record content, idle lock (BLUEPRINT 5.5). Certificate pinning to Duly's API is optional: the server sees only ciphertext, so pinning mainly protects session tokens; if used, pin to a set of keys with a backup pin **(judgement; decide in the security file)**.

---

## 5. The web presence

There are two web things, and they should be separate origins.

### 5.1 The public site (launch)

What it holds: what Duly is, the security page ("Duly will never..."), the public rule library and Playbooks, update notes, downloads, the government request policy and retention table.

How: static pages built at release time (Astro's islands keep pages as HTML with JavaScript only where marked: [Astro islands](https://docs.astro.build/en/concepts/islands/); or Vite prerendering from the existing web/ code), served from S3 behind CloudFront. No third-party script, no analytics cookies, no fonts from outside (web/ already self-hosts Fontsource), a strict CSP. The rule library pages are generated from the same signed bundle the apps use, so the site and the apps cannot disagree.

### 5.2 The web app (account at launch, record later)

At launch: sign in with a passkey, list and remove devices, pair a new device, download apps, read public content. No record and no documents (BLUEPRINT 5.5, research-system 6.5 option b).

Later, behind the founder's W1 decision and after code transparency (research-security 3.9):
- The Rust core compiled to WASM in a Web Worker, so the browser computes the same dates.
- Storage: SQLite WASM on OPFS. The `opfs-sahpool` VFS needs no COOP and COEP headers and is the fastest, but allows only one connection at a time; the `opfs` VFS needs COOP and COEP ([SQLite persistence](https://sqlite.org/wasm/doc/trunk/persistence.md)). OPFS is Baseline since March 2023 and `createSyncAccessHandle` works only in workers ([MDN OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)).
- **No SQLCipher in the browser** (expo-sqlite web has none: [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/)). The core encrypts each stored record and blob itself under K_local, held as a non-extractable WebCrypto key ([MDN generateKey](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey)).
- **Storage can vanish.** WebKit evicts whole origins on a least-recently-used basis and grants `persist()` by heuristics such as being a Home Screen web app ([WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/)). The web copy is therefore a cache of the synced record, never the only copy.
- Immutable versioned bundles, Subresource Integrity, `connect-src` limited to Duly's API, lock on tab hide, session approved from a trusted device, release hashes published (Code Verify pattern: [Meta](https://engineering.fb.com/2022/03/10/security/code-verify/)).

---

## 6. Offline first and the local database

### 6.1 Shape

- **Source of truth on the device:** the append-only, hash-chained event log (BLUEPRINT 5.4, research-system 3). Projections (facts, papers, timeline, loops, schedule) are rebuilt from it and cached in tables. The UI reads projections only.
- **The core owns the database.** One schema, one migration runner, in Rust, using rusqlite. rusqlite's `bundled-sqlcipher` feature links SQLCipher, and `bundled-sqlcipher-vendored-openssl` bundles its crypto provider ([rusqlite](https://github.com/rusqlite/rusqlite)). That gives the same SQLCipher build on macOS, Windows, iOS and Android without a JS database library per platform. On the web the same crate switches to `sqlite-wasm-rs` (rusqlite's `ffi-sqlite-wasm-rs` feature), without SQLCipher.
- If the core is not ready (interim): on Electron, `better-sqlite3-multiple-ciphers` can create SQLCipher-format databases ([repo](https://github.com/m4heshd/better-sqlite3-multiple-ciphers)); on Expo, `expo-sqlite` with `useSQLCipher: true` ([expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/)). Both are stopgaps; the core replaces them. CLAUDE.md's "SQLCipher only inside desktop/main" rule should be updated to "only inside duly-core" when the core lands.

### 6.2 SQLCipher settings

SQLCipher encrypts every page with AES-256 (CBC) and a per-page HMAC-SHA512, including journal and WAL pages, and accepts either a passphrase (PBKDF2-HMAC-SHA512, 256,000 iterations by default) or **raw key material** ([SQLCipher design](https://www.zetetic.net/sqlcipher/design/)). Duly passes a raw 256-bit K_local released by the platform key store, so there is no passphrase and no slow KDF on each open. Community Edition is BSD-style and requires the copyright notice in the app's About screen ([SQLCipher licence](https://www.zetetic.net/sqlcipher/open-source/)).

Also: `PRAGMA secure_delete` on, so deleted rows do not linger in free pages **(confirm interaction with SQLCipher in the spike)**; per-item keys (BLUEPRINT 5.2) on sensitive rows inside the database so crypto-shredding one item does not depend on SQLite page reuse.

### 6.3 Documents

Document files are not stored in SQLite. Each is an encrypted blob under its own key F (wrapped under K_vault) in the app's private container (excluded from OS backups), with metadata and wrapped keys in SQLCipher. "Carry these" pins blobs offline; others download on demand (research-system 6.4).

### 6.4 Sync

The sync client lives in the core (BLUEPRINT 5.4). Off-the-shelf sync engines (PowerSync, ElectricSQL and similar) assume a server that can read rows to resolve queries and permissions; Duly's server holds ciphertext, so they do not fit **(general judgement; not researched per product here)**. Conflicts become questions to the student, not merges (research-system 6.4).

### 6.5 The Ask path from the client (D79, D60)

Ask goes to Duly's backend, which calls Claude on Bedrock in Duly's AWS account. The client sends the question text and only the engine-derived slots that D79 allows; **no value read from a document** (D60), no file, no name, no identifier. This filter is in the core with a test that plants canary values, not in the UI. Every number in the answer is filled by the core from engine items (BLUEPRINT 4.1, 4.3). The assistant file owns the details.

---

## 7. Testing the clients

| Layer | What | Where it runs |
|---|---|---|
| Core | Unit and property tests with an injected clock; statechart exhaustiveness (BLUEPRINT 2.3); golden vectors against the Python oracle, byte-identical | Native on macOS, Windows, Linux CI; iOS simulator; Android emulator; WASM in Node |
| Core | Fuzzing every parser: envelopes, events, bundles, MRZ (cargo-fuzz) | CI nightly |
| Bindings | Same vector suite called through each binding (napi, JSI, UniFFI Python), so a binding bug cannot hide | Each target |
| Desktop UI | Existing vitest suite; the smoke and shot runs; end-to-end through Playwright's Electron support **(experimental status unverified)** | macOS and Windows runners |
| Mobile UI | Component tests in Jest; end-to-end with Maestro or Detox **(tool choice open)** | Simulators in CI; real devices weekly |
| Reminders | Fixed-clock scheduler tests with permission denied; a 30-day real-device delivery log (BLUEPRINT Phase 4) | Real iPhones and Android phones from several vendors |
| Privacy | Recorded-bytes canary test through an intercepting proxy: push, email, CDN, crash reports, DNS, Ask (BLUEPRINT 6) | CI, every release |
| Security | MASTG checks for both phones; Electron checklist and fuses verified on the packaged build; outside pen test before sync ships | Pre-release |
| Updates | Install old build, update to new, verify signature failure is refused, verify rollback refusal | Release pipeline |

---

## 8. Build and release pipeline for the clients

- **One monorepo**, workspaces for `core/` (Rust), `desktop/`, `mobile/`, `web/`, `site/`. The core publishes versioned artifacts (napi prebuilds, an XCFramework and AAR through the React Native module, a WASM package) consumed by exact version.
- **CI runners:** macOS (iOS, Mac signing and notarization), Windows (Windows builds, Artifact Signing), Linux (core, web). Actions pinned by commit hash; OIDC to cloud; no static secrets (research-security 8).
- **Mobile builds:** EAS Build or self-hosted builds with Fastlane. EAS is a third party that sees source and holds signing credentials for its builds **(check plan terms)**; self-hosting on macOS runners keeps keys in Duly's control. Decide with the CI file.
- **Release artifacts:** SBOM per release; signed; release notes; hashes published for the web bundle.
- **Version contract:** every build embeds core version, schema version and supported bundle range; the rule bundle declares `min_engine` and `min_runner` (BLUEPRINT 6).

---

## 9. Rough fixed costs of the client side

| Item | Cost | Status |
|---|---|---|
| Apple Developer Program (iPhone, Mac signing and notarization) | about $99 a year | **unverified** in this pass |
| Google Play developer account | about $25 once | **unverified** |
| Windows signing: Artifact Signing Basic | about $10 a month | **unverified**; eligibility verified above |
| Windows signing alternative: EV certificate | a few hundred dollars a year | **unverified** |
| SQLCipher Community Edition | free, BSD-style, notice required | verified |
| Crash reporting: GlitchTip self-hosted | a small instance in Duly's AWS | sizing from GlitchTip docs; cost **unverified** |
| EAS (if used): build minutes; update code signing needs a Production plan | plan price **unverified** | plan requirement verified |
| macOS CI runners | per-minute pricing | **unverified** |
| People: one engineer who can review Rust; an outside crypto audit and pen test (BLUEPRINT 6) | the largest cost | |

---

## 10. Order of work, and the founder's "own window" test

Mapped to BLUEPRINT section 8.

**Step W (now): Duly in its own window, installable on the founder's Mac.** A sizeable milestone and a founder test point.
1. Add Electron Forge to desktop/ (founder-owned file; needs approval as a new dependency).
2. Bundle the Python engine as a sidecar from python-build-standalone, which Astral builds for redistribution on macOS (arm64 and x64) and Windows ([python-build-standalone](https://github.com/astral-sh/python-build-standalone)); start it from the app bundle instead of the repository; keep the 127.0.0.1 bind and the per-launch token. Interim only.
3. Apply the fuses and ASAR integrity (3.3).
4. Sign with Developer ID and notarize (3.6), so it opens without Gatekeeper warnings. Until the Apple account exists, an unsigned local build can be opened by the founder with a right-click Open, and that limitation is said plainly.
5. Produce a .dmg; check it live on the founder's Mac; then push the notification and a short test guide (per the founder's testing rule).
Windows follows the same steps once the company can get an Artifact Signing identity.

**Phase 1 to 2 (blueprint):** contracts, the event log, Loop runner and scheduler in the desktop vertical slice, still on the Python engine.

**Phase 3: core spike, then port** (time-boxed). Pass criteria: identical golden output on all five targets (macOS, Windows, iOS, Android, WASM); runs on iOS with no JIT; cold start and size targets set by the founder; napi addon loads in an Electron utility process; uniffi-bindgen-react-native works in an Expo development build. Then swap the sidecar for the core in Electron and delete the HTTP hop.

**Phase 4: local-only iPhone app** in Expo with the core, native key, reader and notification modules; 30 days of measured reminder delivery on real devices.

**Phase 5 to 7:** pairing and sync, backup, the updates publish half, all in the core.

**Then:** Android (same Expo app, Android modules), Windows (same Electron app, Windows Hello module), and the web record if W1 allows.

D78 asks for all four platforms from the start; the blueprint's decision 10 proposes Apple first. The architecture above supports either: the core, the Electron app and the Expo app are each built once for both of their platforms, so the order is a staffing and testing choice, not a rewrite.

---

## 11. Decisions for the founder

1. **Core language:** Rust with UniFFI, napi-rs and WASM (recommended), with the Python engine kept as the oracle. Fallback: TypeScript, which would lock mobile into React Native.
2. **Desktop:** Electron (recommended, existing shell) or Tauri.
3. **Mobile:** React Native with Expo and native security modules (recommended), or native Swift and Kotlin from the start (higher cost, best platform fit).
4. **Over-the-air JavaScript updates on mobile:** off in v1 (recommended).
5. **Crash reporting:** platform reports plus self-hosted GlitchTip with SDK scrubbing (recommended), Sentry SaaS with the same scrubbing, or platform reports only.
6. **Signing identity:** form the company and sign as it (Windows individual signing is limited to the US and Canada); who holds the second release key.
7. **Step W now:** approve Electron Forge and the bundled Python sidecar as an interim, so Duly opens as an installed app on the founder's Mac.
8. **Mobile build service:** EAS or self-hosted macOS runners.
9. **Windows unlock:** Windows Hello signature-derived key (needs crypto review) or DPAPI with a consent prompt, stated as weaker.

---

## Sources

Fetched in this pass (2026-10-01):
- Electron security checklist: https://www.electronjs.org/docs/latest/tutorial/security
- Electron fuses: https://www.electronjs.org/docs/latest/tutorial/fuses
- Electron ASAR integrity: https://www.electronjs.org/docs/latest/tutorial/asar-integrity
- Electron updates: https://www.electronjs.org/docs/latest/tutorial/updates
- Electron code signing: https://www.electronjs.org/docs/latest/tutorial/code-signing
- Electron safeStorage: https://www.electronjs.org/docs/latest/api/safe-storage
- Electron crashReporter: https://www.electronjs.org/docs/latest/api/crash-reporter
- Electron timelines: https://www.electronjs.org/docs/latest/tutorial/electron-timelines
- Electron process model: https://www.electronjs.org/docs/latest/tutorial/process-model
- Electron context isolation: https://www.electronjs.org/docs/latest/tutorial/context-isolation
- Electron systemPreferences: https://www.electronjs.org/docs/latest/api/system-preferences
- Electron pushNotifications: https://www.electronjs.org/docs/latest/api/push-notifications
- Electron WebAuthn issue: https://github.com/electron/electron/issues/24573
- Electron Forge makers: https://www.electronforge.io/config/makers and https://www.electronforge.io/config/makers/squirrel.windows
- Microsoft Artifact Signing: https://learn.microsoft.com/en-us/azure/artifact-signing/overview and https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart
- Windows Hello for developers: https://learn.microsoft.com/en-us/windows/apps/develop/security/windows-hello
- Apple notarization: https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
- Apple Secure Enclave keys: https://developer.apple.com/documentation/security/protecting-keys-with-the-secure-enclave
- Apple backup exclusion: https://developer.apple.com/documentation/foundation/optimizing-your-app-s-data-for-icloud-backup
- Apple background pushes: https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app
- Apple BGTaskScheduler: https://developer.apple.com/documentation/backgroundtasks/bgtaskscheduler
- Apple crash reports: https://developer.apple.com/documentation/xcode/acquiring-crash-reports-and-diagnostic-logs
- Android Keystore: https://developer.android.com/privacy-and-security/keystore
- Android Auto Backup: https://developer.android.com/identity/data/autobackup
- Android alarms: https://developer.android.com/develop/background-work/services/alarms/schedule
- Android WorkManager: https://developer.android.com/develop/background-work/background-tasks/persistent
- Android notification permission: https://developer.android.com/develop/ui/views/notifications/notification-permission
- Android vitals crashes: https://developer.android.com/topic/performance/vitals/crash
- ML Kit text recognition v2: https://developers.google.com/ml-kit/vision/text-recognition/v2/android
- Tauri security: https://v2.tauri.app/security/
- Tauri updater: https://v2.tauri.app/plugin/updater/
- Tauri webview versions: https://v2.tauri.app/reference/webview-versions/
- Tauri 2.0 release: https://v2.tauri.app/blog/tauri-20/
- React Native getting started: https://reactnative.dev/docs/environment-setup
- React Native New Architecture: https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here
- Hermes features: https://github.com/facebook/hermes/blob/main/doc/Features.md
- Expo SecureStore: https://docs.expo.dev/versions/latest/sdk/securestore/
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo LocalAuthentication: https://docs.expo.dev/versions/latest/sdk/local-authentication/
- Expo BackgroundTask: https://docs.expo.dev/versions/latest/sdk/background-task/
- Expo direct push: https://docs.expo.dev/push-notifications/sending-notifications-custom/
- Expo CNG: https://docs.expo.dev/workflow/continuous-native-generation/
- EAS Update: https://docs.expo.dev/eas-update/introduction/ and https://docs.expo.dev/eas-update/code-signing/
- UniFFI: https://mozilla.github.io/uniffi-rs/latest/
- uniffi-bindgen-react-native: https://github.com/jhugman/uniffi-bindgen-react-native
- napi-rs: https://napi.rs/
- Bitwarden SDK: https://github.com/bitwarden/sdk-internal ; Bitwarden Android: https://github.com/bitwarden/android
- libsignal: https://github.com/signalapp/libsignal
- 1Password 8: https://1password.com/blog/1password-8-the-story-so-far
- Kotlin supported platforms: https://kotlinlang.org/docs/multiplatform/supported-platforms.html
- Compose Multiplatform 1.8.0: https://blog.jetbrains.com/kotlin/2025/05/compose-multiplatform-1-8-0-released-compose-multiplatform-for-ios-is-stable-and-production-ready/
- Python on iOS: https://docs.python.org/3/using/ios.html ; PEP 738: https://peps.python.org/pep-0738/
- Pyodide deployment: https://pyodide.org/en/stable/usage/downloading-and-deploying.html
- python-build-standalone: https://github.com/astral-sh/python-build-standalone
- jiff: https://docs.rs/jiff/latest/jiff/
- MDN Temporal: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal
- MDN OPFS: https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system
- MDN generateKey: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey
- SQLite WASM persistence: https://sqlite.org/wasm/doc/trunk/persistence.md
- WebKit storage policy: https://webkit.org/blog/14403/updates-to-storage-policy/
- SQLCipher design: https://www.zetetic.net/sqlcipher/design/ ; licence: https://www.zetetic.net/sqlcipher/open-source/
- rusqlite: https://github.com/rusqlite/rusqlite
- better-sqlite3-multiple-ciphers: https://github.com/m4heshd/better-sqlite3-multiple-ciphers
- Sentry Electron: https://docs.sentry.io/platforms/javascript/guides/electron/ and options page https://docs.sentry.io/platforms/javascript/guides/electron/configuration/options/
- Sentry React Native sensitive data: https://docs.sentry.io/platforms/react-native/data-management/sensitive-data/
- Sentry self-hosted: https://develop.sentry.dev/self-hosted/
- GlitchTip install: https://glitchtip.com/documentation/install
- OWASP MASVS: https://mas.owasp.org/MASVS/
- RFC 8252: https://datatracker.ietf.org/doc/html/rfc8252
- Astro islands: https://docs.astro.build/en/concepts/islands/
- Meta Code Verify: https://engineering.fb.com/2022/03/10/security/code-verify/

Internal: desktop/package.json, desktop/src/engine.ts, desktop/src/guard.ts, desktop/PROGRESS.md, specs/desktop-1/SPEC.md, engine/*.py (3,681 lines), uv.lock (jsonschema depends on rpds-py), Makefile `desktop` target.

### Unverified in this pass
- Whether WebAuthn and passkeys work inside an Electron window served from a custom scheme today.
- Whether napi-rs addons load in Electron utility processes without extra work (expected, not confirmed).
- Whether current Hermes builds include WebAssembly.
- Squirrel.Mac's signature check on updates.
- The iOS 64 pending notification cap (forum reports only).
- Audit status of the candidate Rust crypto libraries.
- `PRAGMA secure_delete` behaviour under SQLCipher.
- `setContentProtection` behaviour on each OS.
- App and download sizes for Tauri, Electron, Pyodide and an embedded CPython; React Native cold start with the core.
- Windows Hello signature-derived wrapping keys as a sound pattern.
- All prices in section 9.
- Playwright's Electron support status; Maestro versus Detox.
