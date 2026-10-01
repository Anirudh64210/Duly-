# Duly architecture

Status: the single working document for the founder, 2026-10-01. It merges the six section files in specs/duly-2/architecture/ (clients, backend, identity, infra, ops, security) and the four reviews of them (security, backend and cloud, clients, Ask). Where the section files disagree, this file settles it and says so. Where this file and DECISIONS.md disagree, DECISIONS.md wins. Nothing here is a decision until the founder rules on section 19.

Markings: **(unverified)** means not confirmed against a primary source in this pass; check before building on it. **Proposal** means a number or choice for the founder to set. Prices are US West (Oregon) list prices seen on 2026-10-01 unless marked. Every section has the same five parts: decision, why, alternatives, how to tune, sources. Detail lives in the section files; the file name is given with each section.

Decisions this serves: D54 (documents encrypted on the device, optional end-to-end backup), D55 (documents read on the device), D60 (no document value reaches any model), D73 (reminders computed on the device), D75 (the Loop), D78 (Mac, Windows, Android, iPhone), D79 (Ask uses Claude through Bedrock in Duly's own AWS account; the engine supplies every date).

---

## 0. The answer on one page

**Why Duly is not yet in its own window like Slack.** It half is. desktop/ is an Electron 44 shell (`make desktop`) with a sandboxed window, a `duly://` scheme, a strict CSP and 139 passing tests. Four things are missing: (1) it starts the Python engine with `uv run uvicorn` from the repository, so it runs only on a machine with the repo, uv and Python; (2) there is no packager, so no .app, .dmg or installer; (3) nothing is signed or notarized, so macOS and Windows block or warn; (4) no auto update, crash reporting or encrypted local store. Section 18, Step W, fixes this first. It needs no cloud at all.

**The shape.** The device is the computer. The engine, the Loop runner, reminders, documents and the record all run on the device, offline. The cloud is a mailbox (encrypted sync and backup), a library (the public signed rule bundle on a CDN) and one narrow gateway to Claude on Bedrock for Ask. No server computes a date. A server breach yields ciphertext. A server outage delays sync; nobody loses a date.

| Area | Decision (recommended) |
|---|---|
| Shared core | Rust (`duly-core`), bound to Swift and Kotlin (UniFFI), Electron (napi-rs), web (WASM). Python engine stays the oracle with byte-identical golden vectors |
| Desktop | Electron (existing shell). Core in a utility process. Sign-in through the system browser |
| Mobile | React Native with Expo, keys, reader and notifications as native Swift and Kotlin modules |
| Web | Static public site and account page at launch; the record on the web only after release-hash transparency |
| Local storage | SQLite with SQLCipher, owned by the core; documents as per-file encrypted blobs |
| API | REST, OpenAPI 3.1 contract first, generated clients, `/v1` in the path |
| Server | One modular FastAPI monolith (api plus worker) on ECS Fargate (ARM); Ask on Lambda in its own account; library as static files on CloudFront |
| Database | RDS for PostgreSQL Multi-AZ, row-level security as a second wall |
| Storage | S3, client-side encrypted, presigned uploads, versioning, replica in us-east-2 |
| Identity | Passkeys only, built on py_webauthn; device-bound sessions; recovery kit is the recovery credential |
| Ask | Closed classifier: question in, `guide_id` or `none` out. Retention `none` by SCP. Off by default until evals pass |
| Observability | Fixed-schema JSON logs, CloudWatch metrics and burn-rate alarms; Sentry through a Duly-run Relay, opt-in on clients |
| IaC and CI | Terraform; GitHub Actions pinned by SHA, OIDC, protected environments with a human approver |
| Cost at launch | Target under $400 a month at 1k students by not standing up the cloud until it is needed (section 16) |

---

## 1. System overview

**Decision.** Four trust zones, each in its own AWS account, plus the student's devices as the primary home of all data.

```
STUDENT DEVICES (primary copy of everything; work offline)
  Mac / Windows: Electron window -> main process -> utility process: duly-core (Rust)
  iPhone / Android: React Native UI -> duly-core via JSI; native modules for keys, reader, alarms
  Browser: public site and account page (record later, core as WASM in a worker)
  duly-core = engine + Loop runner + scheduler + event log + SQLCipher + crypto + sync client + Ask shaping
        |                         |                               |
        | sync, backup (cipher)   | bundle fetch (public, no auth)| Ask (question text only)
        v                         v                               v
EDGE    CloudFront "app" + WAF    CloudFront "library" + WAF      CloudFront "ask" + WAF (own host, logs off)
        |                         |                               |
SERVICES prod-core account        prod-library account            prod-assistant account
        internal ALB              S3 bundle bucket (TUF files)    Lambda: verify Ask token, budget,
        ECS Fargate: api, worker  replica bucket us-east-2        Bedrock Converse, closed tool schema
        |                                                         |
DATA    RDS PostgreSQL Multi-AZ   (no student data)               DynamoDB: Ask budgets (pseudonym, day)
        S3 ciphertext blobs + checkpoints, replica us-east-2      Bedrock: retention none, US profile,
        KMS (about 5 keys), Secrets Manager                       invocation logging denied by SCP
        |
OUTBOUND push and email sender -> APNs, FCM, SES (content-free)

PIPELINE account: watchers -> snapshots (Object Lock) -> drafts -> two checks -> founder approval
                  -> TUF signing (offline root, 2 of 3) -> publish to prod-library -> announce to prod-core
MANAGEMENT and SECURITY accounts: Organizations, SCPs, Identity Center, CloudTrail, GuardDuty, log archive
```

**Why.** The boundary that matters is trust, not code size. Question text (the most sensitive thing any server sees) never shares an account, a distribution or a log with account data. The pipeline is the only zone that fetches the web and it touches no student. The library has no compute, so nothing to compromise at request time.

**Alternatives.** Microservices (no load or team for them; Fowler's MonolithFirst). One account for everything (one leaked role reaches all). A server that computes dates (it would have to read them).

**How to tune.** Split a module out of the monolith only when it needs to scale alone (most likely `sync`). Each module owns its tables and talks through a `service.py`, enforced by an import checker in CI, so a split stays cheap.

**Sources.** backend.md 1 and 3; infra.md 1 and 2; https://martinfowler.com/bliki/MonolithFirst.html ; https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity ; https://www.inkandswitch.com/essay/local-first/

---

## 2. Client apps (clients.md)

### 2.1 Shared engine core
**Decision.** Port the engine, Loop runner, event log, envelope crypto and sync client to Rust. The Python engine stays the oracle: every bundle ships golden vectors and every target (macOS, Windows, iOS, Android, WASM) must produce byte-identical normalized output before release.
- The core exposes **one message function**, `dispatch(request_bytes) -> response_bytes`, encoded to a schema in contracts/, plus a callback interface for hardware operations. This keeps every binding thin and replaceable (uniffi-bindgen-react-native is third party with a small funding base).
- The server reuses the same crate (PyO3 and maturin) for frame parsing, signature checks and checkpoint verification, so wire-format code exists once and is audited once.
- Civil-date arithmetic only; no `f32` or `f64` in the engine crate (CI lint); the IANA tz database bundled in the core with its version recorded on every result.
- The core renders every date in one unambiguous form ("4 March 2027"), never through the platform locale; a golden test covers the string.

**Why.** It is the only option that runs natively and identically on all four platforms plus the browser with no JIT, and the only one where moving to fully native phone UIs later needs no new core. Hermes (React Native's JS engine) does not list WebAssembly, so phones need native bindings anyway. Embedding Python on phones is blocked in practice: the engine depends on jsonschema, which pulls in the compiled Rust extension rpds-py. It is the 1Password, Bitwarden and Signal pattern.

**Alternatives.** TypeScript (doubles and `Date` are traps; native phone UIs would need a bundled JS engine). Kotlin Multiplatform (web target Beta). Embedded Python (size, iOS packaging, Android Tier 3).

**How to tune.** Move calendars and day-count tables into the signed bundle so less logic is written twice. Rule: any engine logic change lands in Python and Rust in one PR, or the vectors fail. Run Linux native plus WASM vectors on every PR; iOS simulator, Android emulator and Windows nightly and as a release gate (macOS and Windows runner minutes cost 10x and 1.7x Linux).

### 2.2 Desktop (Mac and Windows)
**Decision.** Electron, keeping the existing shell and React UI. Layout: sandboxed renderer (no Node, CSP, one typed IPC method per action, sender validated) -> main process (window, updater, notifications, session tokens, no keys) -> utility process running duly-core -> small signed platform helper for key store with user presence and OCR.
- Fuses at package time: runAsNode, nodeOptions, nodeCliInspect, grantFileProtocolExtraPrivileges off; embeddedAsarIntegrityValidation, onlyLoadAppFromAsar, cookieEncryption on. CI reads them back from the packaged binary.
- Exact `electron` version (no caret); upgrade at least every 16 weeks (Electron supports only the latest three majors, one every 8 weeks).
- PDFs are never given to Chromium's viewer: pages are rasterised in a sandboxed utility process with no network and no keys, and bitmaps go to the renderer.
- The unlock helper checks its caller's code signature (macOS audit token and code requirement; Windows Authenticode publisher) and names the action in the prompt.
- Windows installs per machine (MSIX or MSI into Program Files), and on launch the app checks the hash of every file outside app.asar against a manifest signed in the build.
- Packaging with Electron Forge (DMG and ZIP makers on Mac; the ZIP is what Squirrel.Mac updates from). Decide the Windows maker with Windows in view: Squirrel.Windows asks for maintainers, so compare MSIX and electron-builder NSIS first.
- Updates from Duly's own S3 and CloudFront origin (update.electronjs.org needs a public repo), with signed update metadata that expires (so an old signed build cannot be replayed), staged 1%, 10%, 100% by a local install id, and every release hash in a public append-only log that the updater checks.

**Why.** One rendering engine to test on both platforms, the most mature signing, update and crash tooling, and the code exists. The renderer holds plaintext but no keys, so CSP and no-remote-content are the real controls and are tested like the canary test.

**Alternatives.** Tauri 2 (smaller, Rust-native, deny-by-default; but WKWebView and WebView2 are two engines to test and the shell would be rewritten). Revisit if app size becomes a real complaint.

**How to tune.** Performance budgets (Proposal): cold start to Today under 2 seconds on a 2020 Mac; installer under 200 MB; idle memory under 400 MB. Measure first-launch time on a clean notarized install, since Gatekeeper scans large bundles (today's 30 second health wait may not be enough; show a "Starting Duly" state).

### 2.3 Mobile (iPhone and Android)
**Decision.** React Native with Expo (development builds, New Architecture, never Expo Go). Every security-critical path is a native module in Swift and Kotlin: device keys, the document reader (Vision; ML Kit bundled), notification scheduling, backup exclusion, screen protection. JavaScript renders and routes; it never holds K_vault and never computes a date. No over-the-air JS updates in v1. Push straight to APNs and FCM, not through Expo's service. Self-hosted builds with fastlane match, so EAS never holds signing credentials.
- Biometrics must release a key (Keychain access control; Keystore key with `BiometricPrompt` and a `CryptoObject`), never a yes or no result.
- Vault excluded from iCloud and Android backups; Duly's own end-to-end backup is the only backup.
- Android: alarms are cancelled on reboot, so the native module reschedules on BOOT_COMPLETED, TIME_SET, TIMEZONE_CHANGED and after an app update. iOS keeps only 64 pending notifications (forum reports, unverified), so schedule the nearest 50 and re-plan on open, sync and refresh.
- In-app account deletion (Apple 5.1.1(v)) and a web deletion link (Google Play).
- Accessibility: VoiceOver, TalkBack, Dynamic Type and keyboard navigation on desktop, to WCAG 2.2 AA, in the test matrix.

**Why.** Three UI codebases (SwiftUI, Compose, React) is too much for one founder and an agent factory; the hard parts are native modules either way, and the Rust core makes a later move to native UIs cheap. Trigger to switch: the native layer outgrows the React layer, or accessibility and feel fail in student sessions.

**Alternatives.** Native Swift and Kotlin (best fit, highest cost). KMP with Compose. Flutter (a fourth language).

**How to tune.** Performance budgets (Proposal): cold start under 1.5 seconds on a three-year-old phone; app download under 60 MB. The 30-day real-device reminder study includes reboot, clock and zone change, DST, force-stop, and Samsung and Xiaomi battery managers.

### 2.4 Web
**Decision.** Two origins. A static public site (what Duly is, the security page, the public rule library generated from the same signed bundle, downloads, the request policy and retention table), no third-party script, strict CSP. An account page (sign in, devices, pairing, deletion). The record on the web only after the founder's W1 decision and published release hashes; then the core as WASM in a worker, SQLite on OPFS with app-level encryption (no SQLCipher in browsers), treated as a cache because browsers can evict it.

**Why.** The web is the hardest client to trust: the server can send different code each visit.

### 2.5 Local storage and offline
**Decision.** The append-only, hash-chained event log on the device is the source of truth; projections (facts, papers, timeline, loops, schedule) are rebuilt from it. The core owns one SQLCipher database (rusqlite) with one migration runner on all four platforms, keyed by a raw 256-bit K_local from the key store (no passphrase KDF). Documents are encrypted blobs beside it, never in SQLite. Every screen works with no network.
- **Do not build interim storage layers** (better-sqlite3-multiple-ciphers, expo-sqlite with SQLCipher). Keep today's case.bin until the core lands, and allow no stranger data in any interim format.
- **Version skew.** Event schemas are versioned; an older core that meets an unknown event type never drops or guesses it: it shows "Can't tell yet: update Duly". A signed minimum client version is enforced by both the server and the bundle.
- One crypto provider, chosen in the core spike (SQLCipher's vendored OpenSSL next to RustCrypto or aws-lc would mean two libraries to patch).

**Sources (section 2).** https://www.electronjs.org/docs/latest/tutorial/security ; https://www.electronjs.org/docs/latest/tutorial/fuses ; https://www.electronjs.org/docs/latest/tutorial/asar-integrity ; https://www.electronjs.org/docs/latest/tutorial/updates ; https://www.electronjs.org/docs/latest/api/safe-storage ; https://www.electronjs.org/docs/latest/tutorial/notifications ; https://github.com/Squirrel/Squirrel.Windows ; https://v2.tauri.app/security/ ; https://mozilla.github.io/uniffi-rs/latest/ ; https://github.com/jhugman/uniffi-bindgen-react-native ; https://github.com/facebook/hermes/blob/main/doc/Features.md ; https://1password.com/blog/1password-8-the-story-so-far ; https://github.com/bitwarden/sdk-internal ; https://docs.python.org/3/using/ios.html ; https://docs.expo.dev/versions/latest/sdk/sqlite/ ; https://docs.expo.dev/versions/latest/sdk/local-authentication/ ; https://developer.android.com/privacy-and-security/keystore ; https://developer.android.com/develop/background-work/services/alarms/schedule ; https://developer.apple.com/app-store/review/guidelines/ ; https://support.google.com/googleplay/android-developer/answer/13327111 ; https://www.zetetic.net/sqlcipher/design/ ; https://github.com/rusqlite/rusqlite ; https://sqlite.org/wasm/doc/trunk/persistence.md ; https://webkit.org/blog/14403/updates-to-storage-policy/ ; https://engineering.fb.com/2022/03/10/security/code-verify/

---

## 3. Backend and API (backend.md)

**Decision.** Python FastAPI, one image, two commands (`api`, `worker`), modules `identity`, `devices`, `sync`, `blobs`, `notify`, `library_index`. REST over HTTPS with contracts/openapi.yaml as the source of truth.
- Generated clients: swift-openapi-generator, openapi-generator Kotlin, openapi-typescript. A CI test fails if FastAPI's generated schema differs from the contract; oasdiff fails any breaking change inside `/v1`.
- Errors as RFC 9457 problem details. `detail` never echoes input. A custom 422 handler returns error codes only, because Pydantic and FastAPI echo the input value by default (`hide_input_in_errors=True` on models; unverified setting name).
- Ciphertext bodies are `application/octet-stream` with a versioned binary header (fuzzed), not base64 in JSON.
- Cursor pagination by `account_seq`; `ETag` and `If-Match` on the vault header and device list.
- `Duly-Client: platform/version` on every request; below the minimum, problem type `client-too-old`; `Deprecation` and `Sunset` headers before removal; support window 12 months (Proposal).
- Idempotency: `Idempotency-Key` on non-sync POSTs, stored in Postgres 72 hours. Store ids, never a presigned URL (a bearer credential): recreate the URL on replay. Key-wrap and pairing endpoints are left out of the stored-response table. Sync uses its natural key `(device_id, device_counter)`.
- **No `/v1/time` endpoint.** Server time rides in token responses as a warning signal only; devices measure security delays with their own wall and monotonic clocks (section 6).
- `/v1/compute*` never ships in a production build; the production image contains no `engine/` (CI check).

**Why.** Four platforms in three languages (D78) need generated clients; the server holds opaque blobs, so GraphQL has nothing to select and adds DoS surface; tRPC is TypeScript only.

**Alternatives.** GraphQL, tRPC, gRPC (browsers need a proxy; loses plain CDN caching), a TypeScript server.

**How to tune.** Request size caps per route; uploads over a few hundred KiB go straight to S3. Watch p99 per route template; split `sync` into its own service only if it dominates.

**Endpoint set (to become one contract PR).** Identity: `POST /v1/accounts`, passkey register and session begin and finish, `DELETE /v1/sessions/current`, `DELETE /v1/accounts/current`. Devices: `GET/PUT /v1/device-list`, `GET/PUT /v1/vault-header`, `POST /v1/pairings`, pairing wrap, `DELETE /v1/devices/{id}`. Sync: `POST /v1/sync/batches`, `GET /v1/sync/batches?after=&limit=`, checkpoints, `POST /v1/sync/heads`. Blobs: create, commit, download-url, delete. Notify: push token, update subscriptions. Ask: `POST /v1/route` on its own host `ask.<domain>` (section 8). (infra.md's `GET /v1/log?since=` and `/v1/ask/*` on the app host are superseded.)

**Sources.** https://www.rfc-editor.org/rfc/rfc9457.html ; https://www.rfc-editor.org/rfc/rfc9745.html ; https://github.com/oasdiff/oasdiff ; https://github.com/apple/swift-openapi-generator ; https://openapi-ts.dev/ ; https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html ; https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.html (expired draft, used as convention) ; https://brandur.org/idempotency-keys ; https://stripe.com/blog/api-versioning ; https://docs.pydantic.dev/latest/api/config/ (unverified setting)

---

## 4. Sync and data model (backend.md 5)

**Decision.** Each device writes its own hash-chained, signed log of encrypted batches. The server checks structure, assigns a per-account sequence and relays.
- **Outer frame** (server-readable, nothing about the student): format, device_id, device_counter, prev_hash, epoch, random batch_id, padded ciphertext, SK_dev signature.
- **Inner events** (device-only): UUIDv7 id, hybrid logical clock, recorded_at, effective_on, kind, subject, body, provenance, confirmation, supersedes, schema version, and `deps` (the last counter seen from each other device).
- **Push**: verify device on the signed list and epoch current; same `(device, counter)` and hash returns the stored seq; different hash is a fork alarm; `UPDATE accounts SET seq = seq + 1 RETURNING seq` serialises per account; batch row and outbox row in one transaction.
- **Pull**: frames in seq order; the client checks signatures, gaps, prev_hash links and refuses any seq lower than seen (rollback).
- **Merge**: a grow-only set of events. For each single-valued fact, writes not superseded by a causally later write survive; more than one survivor marks the fact `conflicting`, every verdict using it is `cannot_tell`, and a Loop asks the student. Last-writer-wins only for preferences with no legal meaning, listed in the contract.
- **Lying server**: per-device hash chains, signed heads compared across devices (SUNDR fork consistency), signed device list as the root. Withholding threshold **6 hours** (not 24, which equalled the security delay and let a withholding server win the race).
- **Compaction**: a signed checkpoint in S3; batch rows deleted once every active device acknowledges it. A device unseen for 60 days (Proposal) drops out of the quorum and must restart from a checkpoint, so one lost phone cannot pin storage forever.
- Padding to size steps (Padmé, about 12% overhead, unverified figure); revocation moves to a new epoch and the server rejects old-epoch batches.
- Byte-level test vectors for the frame format live in contracts/ and both the Rust core and the server must pass them (or the server calls the core's parser through PyO3).

**Why.** A dropped date can move a deadline, so last-writer-wins is wrong for legal facts. Off-the-shelf sync engines (PowerSync, ElectricSQL) assume a server that reads rows.

**Alternatives.** Last-writer-wins (Figma's choice). Automerge (right semantics, large dependency for small typed events).

**How to tune.** Batch cap in Postgres 256 KiB (Proposal); move batch storage to S3 if the table passes tens of GiB. Coalesce wake-ups to one per few minutes per device. Property tests: shuffle, duplicate, partition and heal, fork, rollback, revocation.

**Sources.** https://martin.kleppmann.com/papers/bft-crdt-papoc22.pdf ; https://www.usenix.org/legacy/event/osdi04/tech/full_papers/li_j/li_j.pdf ; https://cse.buffalo.edu/tech-reports/2014-04.pdf ; https://doc.replicache.dev/concepts/how-it-works ; https://www.figma.com/blog/how-figmas-multiplayer-technology-works/ ; https://www.rfc-editor.org/rfc/rfc9562.html

---

## 5. Databases and storage (backend.md 6 and 7, infra.md 6)

**Decision: Postgres.** RDS for PostgreSQL Multi-AZ, db.t4g.small with 20 GB gp3 (about $52 a month). Alarm on CPUCreditBalance (burstable), or start prod at db.t4g.medium. Same major version locally. Alembic migrations, forward only, expand then contract.
- Row-level security as a second wall: `FORCE ROW LEVEL SECURITY` on every tenant table, app role without BYPASSRLS, account id set with **`SET LOCAL`** or `set_config(..., true)` per transaction (a plain `SET` survives on a pooled connection and the next request runs as the previous account). CI fails if any tenant table lacks a policy. The worker gets a narrow role per job kind, never BYPASSRLS.
- Pool per task: `pool_size=5`, `max_overflow=5`, `pre_ping`, statement timeout 5 s. No RDS Proxy, no read replicas.
- A separate application database user with its own secret from day one (RDS-managed master secrets block read replicas and Blue/Green).
- **One `contracts/server-inventory.yaml`** lists every stored field, why, form and retention. A migration test fails on any column not in it; the published "what Duly could hand over" list is generated from it.

**Reconciled stored fields.** Email: KMS-encrypted at the application layer plus a keyed HMAC for lookup, never plaintext. Push tokens: encrypted. Sessions: `session_id`, `device_id`, device key thumbprint, `refresh_hash`, `family_id`, times. Exact times (`received_at`, `created_at`, `last_seen`) kept 48 hours for abuse checks, then cut to the day; ordering uses `account_seq`, not time.

**Decision: object storage.** Documents are encrypted on the device in a vetted streaming AEAD (libsodium secretstream, or chunked AES-GCM with index and final flag bound) under a per-file key. Upload: `POST /v1/blobs` returns a presigned PUT that **signs** `If-None-Match: *`, `x-amz-checksum-sha256` and `Content-Length` (otherwise a client can upload other bytes or sizes than the row says); multipart signs a checksum per part; commit checks size and checksum. Bucket: Block Public Access, TLS only, versioning, SSE-KMS with Bucket Keys as a second layer, random object keys not prefixed by account, replication to us-east-2, short-lived URLs with an `s3:signatureAge` deny.
- **Object Lock**: compliance mode only for pipeline snapshots and the audit archive (compliance mode blocks even root, which would break account deletion). Student ciphertext: versioning plus governance-mode retention of **14 days**, bypass held by one deletion role. (backend.md said 30 days, security.md 14; 14 is chosen to hold less.) Deletion is crypto-shredding first; counsel confirms it counts.
- Storage quota 250 MB per account by default (Proposal), raised after account age plus an attested client or a second device.

**Decision: keys on the server.** About five KMS keys per account and purpose, never one per student. **Multi-Region keys** for the three that break sign-in if us-west-2 is lost: Ask token signing, email encryption and lookup HMAC, Ask pseudonym HMAC. Secrets in Secrets Manager, each readable by one task role. TUF root and targets keys offline.

**Alternatives.** Aurora Serverless v2 (about $88 floor, 15 second resume; good for staging). DynamoDB (the sequence, outbox and idempotency are relational patterns). Batches in S3 (research-system 6.3; changed so sequence, row and outbox are atomic).

**How to tune.** db.t4g.medium near 10k students, db.m7g.large near 100k (unverified sizing). Replica bucket in an infrequent-access class halves that line at 100k (unverified Ohio prices). Move to Aurora when instance class, not price, is the constraint.

**Sources.** https://www.postgresql.org/docs/current/ddl-rowsecurity.html ; https://www.postgresql.org/docs/current/functions-admin.html ; https://www.postgresql.org/docs/current/sql-select.html ; https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html ; https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html ; https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html ; https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html ; https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html ; https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html ; https://aws.amazon.com/kms/pricing/ ; https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html ; https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html

---

## 6. Authentication, authorization and permissions (identity.md)

**Decision: three separate things.** Signing in gets ciphertext. Device enrolment (being on the vault-signed device list) is what lets a device read. Server permissions are deny-by-default over ciphertext and account actions. A takeover of sign-in or the server never opens the vault.

**Sign-in.** Passkeys only: discoverable credentials, user verification required, no attestation, one RP ID (Duly's domain, chosen once). No passwords, SMS or magic links. Native APIs on iPhone and Android; WebAuthn on the web; the Electron app signs in through the **system browser** with PKCE and a loopback redirect (RFC 8252), because Electron still lacks platform passkeys (issue #24573 open as of 2026-09-23). Tokens live only in Electron's main process. WebAuthn Level 3 became a W3C Recommendation on 2026-08-25; NIST 800-63B-4 accepts synced passkeys at AAL2.

**Sessions (reconciled hybrid).** Core API: opaque access tokens, 10 minutes, checked by an indexed Postgres lookup (trivial at about 40 requests a second at 100k students; gives instant revocation and removes a revoked-session cache). Every request carries a DPoP-style proof signed by SK_dev; replay protection through a server nonce. Refresh tokens rotate on every use and are bound to SK_dev; reuse revokes the family. Native: idle 30 days, absolute 90, with a local unlock on every open and a 5-minute step-up for sensitive actions (Duly does not claim NIST AAL2 session limits on native). Web: idle 30 minutes, absolute 12 hours. The KMS-signed JWT is used **only** for the Ask token, the one token another account must verify.

**Recovery.** The 128-bit kit is also the recovery credential: an Ed25519 key derived from it (separate HKDF label) proves possession. Email never recovers an account. Kit-only recovery starts the security delay with notices to every device. **Devices measure the delay with their own wall and monotonic clocks, never server time.** State plainly: the kit plus a compelled server means access with no delay; the delay only protects against a server that is not compromised.

**Pairing.** QR first (authenticated out-of-band channel). Typed 6-digit code over CPace only with an audited CPace implementation; if none exists, QR only at launch. No one-tap approve. If the server's device table and the signed list disagree, every device shows a warning.

**Authorization.** v1: a small policy module, one function per action, a decorator every route must use, a CI test that fails on any route without one, table-driven tests for every allow and deny, Postgres RLS behind it. Cedar (in-process) when DSO viewer and attorney roles arrive: read-only, signed, time-limited share packs; attorney suggestions land as questions for the student to confirm. Staff roles cannot read content because no server key opens it; no "log in as student"; break-glass per AWS SEC03-BP03 with alarms. Hardware keys for every human with AWS, GitHub, Apple, Google, Microsoft or registrar access.

**App attestation.** App Attest and Play Integrity as risk signals at sign-up and enrolment (higher limits for attested clients), never a hard gate (web and Windows have none).

**Alternatives.** Cognito (username typed before the passkey prompt, a non-passkey first sign-in, bearer tokens; free to 10,000 MAU then $0.015, about $1,350 a month at 100k). Auth0 (puts the list of Duly users, itself status-revealing, at a third party). Neither offers the signed device list, pairing, kit credential or delay. Fallback: Cognito Essentials as the passkey verifier only.

**How to tune.** Delay length (24 hours proposed); max 10 devices and 10 passkeys; session lifetimes; limits on ceremonies (20 per minute per IP), failed assertions (lock at 100, NIST ceiling), email codes (5 tries, 3 per hour), pairing (3 failed runs, 5 requests a day).

**Sources.** https://www.w3.org/TR/webauthn-3/ ; https://pages.nist.gov/800-63-4/sp800-63b.html ; https://www.rfc-editor.org/rfc/rfc8252.html ; https://www.rfc-editor.org/rfc/rfc9449.html ; https://www.rfc-editor.org/rfc/rfc9700.html ; https://github.com/electron/electron/issues/24573 ; https://datatracker.ietf.org/doc/draft-irtf-cfrg-cpace/ ; https://github.com/duo-labs/py_webauthn ; https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html ; https://aws.amazon.com/cognito/pricing/ ; https://auth0.com/pricing ; https://docs.cedarpolicy.com/ ; https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html ; https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/sec_permissions_emergency_process.html ; https://developer.android.com/google/play/integrity/overview

---

## 7. Security (security.md)

### 7.1 Threat model
STRIDE across 11 components is in security.md 3. Top scenarios for this population: a government demand for account data; a false rule published to everyone; a status leak on the lock screen, calendar or clipboard; a malicious dependency; account takeover leading to enrolment; a sync or revocation flaw; a malicious document; question text exposure through Ask (retention, logging, linkage, compelled prospective collection).

**Corrections the reviews forced:**
- "A compelled change is visible or impossible" is true for rules (TUF) and devices (signed list), but **not for desktop builds** until every release hash is in a public append-only log the updater checks. Until then, do not make the claim.
- The desktop sidecar today binds a port, releases it, then starts uvicorn; a local process that grabs the port gets the token and can serve wrong dates. Fix in Step W: talk to the engine over stdio or a pipe the app owns (Unix socket 0600, Windows named pipe with an ACL), or make the engine prove it knows the token. `DULY_ENV` must not be `dev` in packaged builds.
- APNs `.p8` key plus a dump of push tokens could put fake alerts on lock screens: tokens encrypted, `.p8` readable only by the push sender role, alarm on each read.

### 7.2 Encryption and keys
- In transit: TLS 1.3 preferred, 1.2 floor; name the ALB policy in code (the CLI and IaC default is the weak `ELBSecurityPolicy-2016-08`); VPC endpoints for S3, KMS, Bedrock; no certificate pinning (content is end-to-end; OHTTP later protects Ask from TLS-inspecting proxies).
- At rest on the device: platform data protection plus SQLCipher under K_local; thumbnails and rendered pages inside the vault; zeroize decrypted buffers in the core; desktop auto-lock on idle.
- The student's key schedule is BLUEPRINT 5.2 (K_vault, DK_dev, SK_dev, K_sync, K_backup, SK_vault_sign, F, K_item, R, K_local). Use HPKE (RFC 9180) for key wrapping and libsodium or Tink primitives; design no new envelope format. One named human owns the key schedule; CODEOWNERS on crypto paths.
- Duly's keys: TUF root and targets offline on hardware tokens, 2 of 3; TUF timestamp and snapshot as KMS keys in pipeline; Windows signing in Azure Artifact Signing HSMs; Apple and Android through match and Play App Signing; no CI keys (OIDC).

### 7.3 Supply chain
SLSA Build L2 now (GitHub artifact attestations), L3 before backup (shared reusable release workflow). CycloneDX SBOM per release. Lockfiles and exact installs (`npm ci`, `uv sync --locked`, `cargo build --locked`); 7-day cooling-off (`min-release-age`, pnpm `minimumReleaseAge`); install scripts off; cargo-deny and cargo-vet for Rust; Expo SDK pinned; React Native JS treated as untrusted UI. Actions pinned by commit SHA (today ci.yml and tag-main.yml use tags: a gap). Release gate: no Anthropic provider, client library or `api.anthropic.com` in any release artifact (assistant/providers.py is prototype only).

### 7.4 Verification and audits, ordered by exposure
| When | What |
|---|---|
| Step W, local-only builds | Electron checklist, fuses, signing |
| Before pairing and sync | Written protocol spec plus a targeted outside crypto review; formal model only if the reviewer asks |
| Before backup | Full outside crypto audit |
| Before Ask reaches strangers | Focused pen test of gateway, payload and logs |
| Before first stranger | Pen test of identity, pairing and the sync relay; cloud config review; VDP and security.txt |
| Targets | ASVS 5.0 L2 for API, web, Ask, Ops, adding L3 chapters as budget allows; MAS-L2 plus MAS-P on phones |

The full audit set before the first stranger was plausibly $150k to $300k (unverified; get quotes). The order above spends it by what is exposed.

### 7.5 Compliance and data requests
- Immigration status is sensitive data by statute in California, Virginia and Maryland (verified text for VA and MD) and others. Design to Maryland: collect only what is "strictly necessary", never sell, explicit opt-in naming immigration status, documents and AWS processing for Ask, a written data protection assessment.
- Breach: California notice within 30 days of discovery, Attorney General copy within 15 days when over 500 residents. Ciphertext without keys is likely outside; the email list is the residual and is treated as notifiable by policy.
- Government requests: an administrative subpoena reaches subscriber records and session times (18 U.S.C. 2703(c)(2)); content needs a warrant; gags under 2705(b); preservation 90 days under 2703(f); 8 U.S.C. 1225(d)(4) reach is a counsel question. Policy: legal process required, notify the student, challenge open-ended gags, transparency report, published inventory generated from server-inventory.yaml.
- Minors: some students may be under 18; consent copy and counsel review (COPPA applies under 13).

**Retention (Proposal, published).** Record and documents: device, until the student deletes. Ciphertext: while the account and backup exist, then 14 days. Exact timestamps: 48 hours, then day only. IP, WAF, edge logs: 7 days. App logs: 30 days. Server security log: 90 days with account refs as rotating HMACs. CloudTrail and staff trail: 1 year, Object Lock. Ask bodies: 0. Crash reports: 30 days. RDS PITR: 7 days (Proposal; up to 35 possible). The retention table states where a deleted account persists: PITR window, cross-Region snapshot copies, the air-gapped backup vault, S3 noncurrent versions.

**Sources.** https://owasp.org/www-project-application-security-verification-standard/ ; https://mas.owasp.org/MASVS/ ; https://slsa.dev/spec/v1.1/levels ; https://docs.github.com/en/actions/concepts/security/artifact-attestations ; https://docs.npmjs.com/cli/v11/using-npm/config ; https://pnpm.io/settings/dependency-resolution ; https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html ; https://aws.amazon.com/security/penetration-testing/ ; https://www.rfc-editor.org/rfc/rfc9180.html ; https://law.lis.virginia.gov/vacode/title59.1/chapter53/section59.1-575/ ; https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4707&enactments=false ; https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82 ; https://www.law.cornell.edu/uscode/text/18/2703 ; https://www.law.cornell.edu/uscode/text/18/2705 ; https://www.law.cornell.edu/uscode/text/8/1225

---

## 8. Ask service on Bedrock

> Founder decision D80 (2026-10-01): Ask reasons and writes answers with Claude through Bedrock (D79), with this section's privacy measures kept: a separate Ask address with logs off, requests not linkable to the account, and crisis and enforcement questions never leave the device. Where this section says the model only picks a guide, D80 overrides it.
 (backend.md 11, infra.md 3.2 and 5.2, security.md 8, ML review)

**Decision: Ask is a classifier, not a writer.** The model picks which reviewed guide a question is about. Templates write every sentence; the engine supplies every number; the device fills values.

**Flow.**
1. On device: crisis and enforcement detection first. A flagged question is **never** sent to the cloud.
2. On device: the router (keywords, synonyms, a small bundled multilingual embedding model, kNN over reviewed paraphrases, calibrated abstention). Most questions end here.
3. Only if the router abstains, and the cloud step is switched on: the device strips identifier shapes (SEVIS, A-number, receipt, MRZ, email, digits that look like dates), shows the exact text that will leave the first time with a "Send" button, and sends `{question_text, locale, catalog_version, candidate_guide_ids}`. No slot names, no slot presence flags, no document values (D60).
4. Gateway: verify the Ask token, check the budget, call Bedrock Converse with `toolChoice: any` and exactly one tool whose input is a closed enum of guide ids plus `none`; extended thinking off; `max_tokens` about 128; buffered response, no streaming. Validate against the schema; drop any text.
5. Device: show "Is this what you are asking about? [guide title]" with the on-device top three as alternatives; only then open the Loop. Timeout 4 seconds (Proposal); on timeout or error show the top three plus the DSO draft.

**Bedrock settings (requirements).** Retention mode `none` at account level in every Region the US profile reaches, forced by SCP (AWS publishes the exact policy). SCP denying `bedrock:PutModelInvocationLoggingConfiguration`. US geographic inference profile only, global blocked. VPC endpoint, no internet. Only models whose `allowed_modes` include `none`: AWS documents that Claude Fable 5 and 5.1 require `aws_review` (kept up to 30 days, possible AWS human review), so they are out; Opus 4.8 is AWS's documented example that allows `none`. Haiku 4.5 and Sonnet 5.5 are unverified: call `GET /v1/models/{id}` before any budget. A daily probe alerts if the effective mode is not `none`, and on any announced end of life. Pin the model version; any switch reruns the full eval set.

**Unlinkability (reconciled).** Ask has its own hostname and CloudFront distribution owned by prod-assistant, logs off, WAF logging only blocked requests with no IP. The Ask token (KMS-signed JWT, `aud=ask`, 10 minutes) carries a pseudonym that rotates daily, **a fresh key pair per Ask token** (never the session key, whose fixed thumbprint would link pseudonyms), and no `sid`, `did` or `jti`. The gateway reads the JWKS from SSM Parameter Store in its own account (written by the deploy pipeline), so it never calls prod-core. Clients send `x-amz-content-sha256` on every POST (required for CloudFront origin access control to a Lambda function URL; verified). Until Privacy Pass and Oblivious HTTP exist, the copy says "Duly does not store your questions", never "cannot see".

**Error paths.** Pydantic `hide_input_in_errors` on every Ask model, a 422 handler with codes only, a handler wrapper that logs only an error code, no error-tracking SDK in prod-assistant. The canary test sends a malformed question carrying canary text and fails if it appears in any log, metric or response.

**Limits.** 20 questions a day and 1 in flight per pseudonym (Proposal; backend.md said 30 a day, identity.md 30 an hour and 200 a day, which is a chatbot budget). Budget keyed on (pseudonym epoch, day) so rotation does not reset it; Ask token issuance also capped in prod-core. Ask allowed after account age of 24 hours or a passing attestation. Organisation spend breaker: alert at 150% of the 7-day hourly median, trip at 300%; tripping turns the cloud step off through a signed flag.

**Evals.** The cloud model is a classifier, so grade it with classifier metrics: precision and coverage per guide family, a confusion-cost matrix (sending a status-loss question to a routine guide is far worse than abstaining), thresholds per family, rule-of-three bounds with n stated, pass^k on repeated runs. No LLM judge is needed. The router needs a parity test with a tolerance (same top-1 and top-3 on the golden set, scores within an epsilon), since embedding floats differ across devices. Data: a paid, consented corpus of real-style questions from F-1 students in several languages, labelled by two annotators with agreement reported, and an opt-in "share this question to improve Duly" path that shows the scrubbed text (founder decision). Synthetic phrasings written by the guide authors overstate precision. Evals run in nonprod with the production model id and retention mode; production prompts are never logged.

**Off by default.** The cloud step ships behind the signed kill switch, off. It is turned on for a release only when on-device plus cloud beats on-device alone on the held-out set by a margin the founder sets.

**Contract change first.** assistant/providers.py exposes `draft(question, passages) -> str`, the free-text drafting BLUEPRINT 4.1 forbids. Replace with `route(question, catalog_version) -> RouteResult(guide_id | None)`; CI fails if release code imports a model function that returns `str`.

**Catalog.** The gateway has no egress, so the catalog is baked into each deploy: it serves catalog N and N-1, an unknown version returns `none`, guide ids are never reused, and the gateway deploys in the same release train as the bundle.

**Alternatives.** Free-text answers (runtime legal prose; Moffatt v. Air Canada, FTC v. DoNotPay). On-device model only (D77, now replaced by D79). Anthropic API directly (outside provider; forbidden).

**How to tune (cost).** Put the cache point after the public prefix and before the question, so no student text sits in a cached block (whether a cache counts as retention under `none` is unverified). Compare three prompt shapes and measure: full catalog as a cached prefix (20k to 50k tokens, an estimate) plus top-k candidates; top-k descriptions only without caching (cheapest at low volume); the 1-hour cache TTL. Request Bedrock quota increases a month before launch: `max_tokens` is reserved up front and output counts 5x to 15x toward quota.

**Sources.** https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html ; https://docs.aws.amazon.com/bedrock/latest/userguide/abuse-detection.html ; https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html ; https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html ; https://docs.aws.amazon.com/bedrock/latest/userguide/quotas-token-burndown.html ; https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html ; https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ToolChoice.html ; https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-lambda.html ; https://aws.amazon.com/bedrock/faqs/ ; https://www.rfc-editor.org/rfc/rfc9576.html ; https://www.rfc-editor.org/rfc/rfc9458 ; https://arxiv.org/abs/2306.13063 ; https://sierra.ai/blog/benchmarking-ai-agents

---

## 9. Caching and CDN (infra.md 4)

**Decision.** The device is the main cache: the whole record, the last verified bundle and the engine run offline; sync is cursor-based and an idle check is a 304. At the edge, CloudFront with three distributions (library, app, ask), all private origins (S3 with origin access control; the ALB through a VPC origin in a private subnet; the Lambda URL with OAC).

| Path | Cache-Control | CloudFront |
|---|---|---|
| `timestamp.json` (TUF) | `public, max-age=60, stale-if-error=86400` | min TTL 0. Safe to serve stale: the expiry is inside the signed file |
| Versioned TUF metadata and hash-named targets | `public, max-age=31536000, immutable` | Long TTL; no invalidations needed |
| Web `index.html` | `no-cache` | min TTL 0 |
| Web hashed assets | `immutable`, 1 year | Long TTL |
| `/v1/*` and Ask | `no-store` | `CachingDisabled`. Pitfall: a min TTL above 0 makes CloudFront cache even `no-store` responses; a CI check on the Terraform plan fails it |
| Ciphertext blobs | not through CloudFront at launch | presigned S3 URLs |

**Freshness.** TUF timestamp expiry **7 days** with an alert after 1 day without a fresh timestamp (security.md's 1 day would turn every student to "Can't tell yet" after a one-day pipeline outage). Only a regime's own staleness rule (D65) changes verdicts.

**Server-side caches.** None shared at launch: in-process token buckets plus Postgres counts; JWKS and bundle manifest in process memory. Add ElastiCache Serverless for Valkey (from about $6 a month) when the API runs more than about four tasks or per-task limits let abuse through.

**Alternatives.** Redis at launch (little to cache when nearly every response is private ciphertext). CDN for blobs (each object is fetched by one student; adds logs, not speed).

**How to tune.** Flat-rate CloudFront Pro ($15 a month, includes WAF, no overage) at launch; Business ($200) near 100k; blob downloads through CloudFront with caching off can move $360 of egress into the Business allowance at 100k. Bundle fetch after a wake-up goes to the CDN with random client jitter, never to the API.

**Sources.** https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html ; https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html ; https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-vpc-origins.html ; https://theupdateframework.github.io/specification/latest/ ; https://aws.amazon.com/elasticache/pricing/

---

## 10. Rate limiting and abuse (infra.md 5, identity.md 3.6)

**Decision.** Five layers; dark-launch every limit first, then enforce.

| Layer | Mechanism | Starting values (Proposal) | On limiter failure |
|---|---|---|---|
| Edge | WAF rate rules on CloudFront per IP | Sign-in ceremonies 100 per 5 min; `/v1/*` 3,000 per 5 min; Ask 300 per 5 min. Generous because campuses share IPs | n/a |
| Service, per account | Token buckets per route class | Sync reads 10/s burst 50; writes 5/s burst 20; blob URLs 60/h; storage 250 MB default | Fail open for sync, closed for sign-up and pairing |
| Ask, per pseudonym | DynamoDB conditional updates | 20 a day, 1 in flight | Fail closed: "Ask is busy", guides still work |
| Ask, organisation | Spend breaker | Alert 150%, trip 300% of 7-day hourly median | Fail closed |
| Bedrock | Per-model tokens per minute | Quota raised before launch and before each 10x | Retry once with jitter, then step-back |

**Abuse paths.** Free anonymous accounts could be used as file hosting or to drain Ask: small default quota, Ask after 24 hours or attestation, spend breaker. Sign-up farms: WAF limits, attestation as a signal. Scraping the public library: allowed by design. DDoS: nothing public except through CloudFront.

**Alternatives.** API Gateway usage plans (best effort, keyed on API keys, which Duly does not use).

**How to tune.** Read rejections by limiter id in the metrics; adjust from data. Stripe's rules when a shared limiter arrives: token buckets, fail open, dark launch.

**Sources.** https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html ; https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html ; https://stripe.com/blog/rate-limiters ; https://docs.aws.amazon.com/bedrock/latest/userguide/quotas-runtime.html

---

## 11. Hosting, environments and deployment (infra.md 2, 3, 9, 10)

**Decision: compute.** API and worker on ECS Fargate, ARM (Graviton, about 20% cheaper than x86), 0.5 vCPU and 1 GB per task, two tasks across two AZs. Ask on Lambda. App Runner is closed to new customers; ECS Express Mode only for staging experiments; no EKS or EC2.

**Accounts.** management, security (CloudTrail, GuardDuty, log archive), prod-core, prod-assistant (D79), prod-library, pipeline, staging; dev optional. Region us-west-2 (D16); backups us-east-2. SCPs: Region lock (with the us-east-1 exceptions CloudFront needs and the US Bedrock profile's destinations), Bedrock retention `none`, deny invocation logging, deny KMS key deletion and Object Lock bypass except named roles, deny IAM users and access keys, deny public S3 outside prod-library.

**Network.** Private app and data subnets; CloudFront is the only way in. Outbound: the reviewed recommendation is a small push-and-email Lambda outside the VPC, fed from the job table, holding only the APNs, FCM and SES credentials and encrypted push tokens; the API VPC then has no NAT and no proxy. The alternative is BLUEPRINT's egress proxy plus NAT (hostname allowlist, about $40 a month more, a proxy to patch). Either way the allowlist is one list in the contract: APNs, FCM, `oauth2.googleapis.com`, `playintegrity.googleapis.com`, SES, Apple App Attest endpoints (unverified), and sentry.io for the Relay.

**Jobs.** Postgres job table with a transactional outbox, workers using `FOR UPDATE SKIP LOCKED` (Procrastinate or about 200 hand-written lines). SQS only for the cross-account hop from pipeline; EventBridge Scheduler for public cron. Payloads carry ids only. (infra.md and ops.md's "SQS-driven worker" are superseded.)

**Infrastructure as code.** Terraform (OpenTofu as the licence escape), one module set, one root per account; state in S3 with native locking; stateful roots with `prevent_destroy`; a human reads the plan before every apply. Plan checks fail on: cache min TTL above 0 on `/v1/*`; public buckets outside prod-library; security groups open to the world; log groups without retention; `*` on `kms:Decrypt`; any ALB TLS policy other than the named one.

**Environments.** local (`make up`, synthetic), staging (prod shape at minimum size, synthetic only, **run on demand**), prod. No prod-shaped cloud until Phase 4 (passkeys) and Phase 5 (sync); until then the local stack only.

**Deployment.** PR: gates, tests, plan, image scan, SBOM. Main: dated tag (D46), ARM image built once and signed. Staging: expand-only migration task, rolling deploy with the circuit breaker, smoke tests, canary bytes. Prod: manual approval in a GitHub environment, same image digest, 15 minutes of alarm watch with automatic rollback. Contract migrations (drops) in a later release once old clients age out.

**Alternatives.** CDK (fine; never both). Pilot light in us-east-2 (about $150 a month more).

**How to tune.** 1 vCPU and 2 GB tasks around 10k students; target tracking on CPU 60% and requests per target; reserved Lambda concurrency to cap spend.

**Sources.** https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html ; https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-overview.html ; https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-autoscaling-targettracking.html ; https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html ; https://developer.hashicorp.com/terraform/language/backend/s3 ; https://developer.hashicorp.com/terraform/language/state/sensitive-data ; https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html ; https://microservices.io/patterns/data/transactional-outbox.html ; https://procrastinate.readthedocs.io/en/stable/

---

## 12. CI and CD and release (ops.md 2)

**Decision: harden the pipeline first.** Pin every action to a full commit SHA; read-only `GITHUB_TOKEN`; no `pull_request_target` with PR code; no self-hosted runners for PR code; OIDC to AWS and Azure; artifact attestations on every binary; protected environments `release-desktop`, `release-ios`, `release-android`, `deploy-staging`, `deploy-prod`, `publish-bundle` with required human reviewers (needs GitHub Team for a private repo). Agents never hold signing keys or approve.

**Workflows.** `gates` (exists), `core` (vectors on targets), `desktop`, `ios`, `android`, `backend`, `web`, `bundle-publish` (manual, offline TUF keys), `nightly` (fuzzing, mutation, soak, full Ask evals), `weekly-restore`. Path filters keep macOS minutes down ($0.062 a minute against $0.006 Linux).

**Six release trains.**
| Train | Signing | Staged rollout | Stop |
|---|---|---|---|
| Mac | Developer ID, hardened runtime, notarization; every bundled .so and .dylib signed | Own update manifest, 1%, 10%, 100% | Percentage to 0; signed rollback |
| Windows | Azure Artifact Signing (as a company; individuals only in the US and Canada) or EV on a cloud HSM | Same | Same |
| iPhone | match, App Store Connect API key | Phased release over 7 days | Pause up to 30 days |
| Android | Play App Signing, upload key offline | Staged percentage | Halt |
| Backend | Signed image | Rolling with circuit breaker | Auto rollback |
| Rule bundle | TUF 2 of 3, offline root | 1%, 10%, 100% with the verdict-swing guard | Kill switch, signed rollback |

**Identity that cannot change later.** Enrol Apple and Google as the company (D-U-N-S number needed; lead time unverified) before any stranger installs anything that holds a key. After an Apple Team ID change, keychain items stop being readable once the app updates, which for Duly means DK_dev: every student would need the recovery kit. Sign with the final identity as early as possible (safeStorage data also re-prompts when the signature changes).

**Two-person control, honestly.** 2-of-3 signing assumes three people. Name them now, or run with the founder holding two tokens in separate places and counsel one, written down as a known weakness.

**Flags.** Client flags and kill switches ride in the signed bundle and are evaluated on the device (rollout bucket from a local random number), so the server never learns who uses what. AWS AppConfig for server-only flags. OpenFeature as the read API. No experiments on deadline copy or bad-news loops.

**Promotion rule.** A human promotes only when crash-free sessions are no worse than the last version, zero engine differential failures, zero new error-level groups, and no drop in reminder delivery.

**Sources.** https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions ; https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws ; https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment ; https://docs.github.com/en/billing/reference/actions-runner-pricing ; https://www.electronjs.org/docs/latest/tutorial/code-signing ; https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart ; https://docs.fastlane.tools/actions/match/ ; https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/ ; https://support.google.com/googleplay/android-developer/answer/6346149 ; https://developer.android.com/studio/publish/app-signing ; https://developer.apple.com/help/app-store-connect/transfer-an-app/overview-of-app-transfer ; https://openfeature.dev/docs/reference/intro

---

## 13. Testing (ops.md 3, clients.md 7, backend.md 14)

| Layer | Tool | Proves |
|---|---|---|
| Engine unit and property | pytest and Hypothesis now; proptest after the port; injected Clock | Each rule; monotonic counts; missing or conflicting facts give `cannot_tell` |
| Loop runner | Hypothesis stateful machines | No dead end; planned is never closed |
| Differential | Golden vectors, byte-identical, every target and binding | The port cannot drift |
| Sync | Property tests | Shuffle, duplicate, partition, fork, rollback, revocation |
| Crypto | Known-answer and Wycheproof-style vectors | Envelope, wrap, signature formats |
| Contract | Schemathesis from openapi.yaml; oasdiff; generated-vs-contract | Server matches schema; no breaking change |
| Compatibility | Recorded requests from app n-1 and n-2; new bundle on old engines | Old apps keep syncing; old engines refuse correctly |
| Database | RLS test across accounts; policy-coverage check; migration upgrade with data | Second wall works; rolling deploys safe |
| Desktop and web E2E | Playwright (Electron support experimental) | Window opens; a loop reaches a receipt; idle lock |
| Mobile E2E | Maestro (settled over Detox); XCUITest and Espresso for system dialogs | Same journeys; permission denied; airplane mode |
| Reminders | 30-day real-device study incl. reboot, zone, DST, OEM battery managers | Fires on the planned day |
| Privacy | **Canary bytes**: planted SEVIS ids, dates, school names, question text, typed identifiers; capture all outbound traffic (push, email, CDN, crash, DNS, Ask incl. its error path) | Nothing leaks; the most important privacy test |
| Security | Fuzzing every parser nightly (cargo-fuzz, Atheris); fuse read-back; Ask token jkt never equals a session jkt; engine identity at startup; inventory diff; MASTG checklist | Release gates |
| Load | k6: the bundle-publish spike (every device after a wake-up), the sign-in path, a soak | CDN absorbs it; no 5xx |
| Ask | Section 8 evals | Precision per family; zero numbers outside slots |
| Drills | RDS failover reboot, ECS rollback, restore, pairing | Timed before the first stranger |
| Accessibility and dates | Screen readers, Dynamic Type; golden test of the rendered date string | WCAG 2.2 AA; no ambiguous dates |

**Why not Pact.** One provider, schema-first generated clients; Schemathesis plus replayed requests cover the risk.

**Sources.** https://hypothesis.readthedocs.io/en/latest/stateful.html ; https://schemathesis.readthedocs.io/en/stable/ ; https://docs.pact.io/ ; https://playwright.dev/docs/api/class-electron ; https://github.com/mobile-dev-inc/maestro ; https://rust-fuzz.github.io/book/cargo-fuzz.html ; https://grafana.com/docs/k6/latest/testing-guides/test-types/ ; https://mas.owasp.org/MASTG/

---

## 14. Observability: logging, metrics, tracing, error tracking, alerts (ops.md 4 and 5)

**Logging.** One JSON schema enforced in code (a unit test fails on any field outside it): `ts`, `level`, `service`, `version`, `env`, `route_template`, `method`, `status`, `latency_ms`, `error_code`, `request_id`, `platform`, `app_version`, `engine_version`, `bundle_version`, optional `acct_ref` (an HMAC with a monthly key, not a hash). Messages from a fixed enum, never interpolated. Never bodies, headers, query strings, tokens or push tokens. CloudWatch data protection policies mask SEVIS-like, receipt-like and A-number-like patterns as a second layer; a mask hit is an alarm. Retention: 30 days app, 7 days with IPs.

**Metrics.** RED per route template; saturation (Fargate CPU and memory, RDS CPU, credits, connections); sync (counts, conflicts, fork reports); library (version served, publish lag, device-reported signature failures, kill switches); notifications (APNs and FCM accept and reject, SES bounces and complaints); Ask (calls, latency, throttles, tokens, cost, abstain, confirm and reject rates, validator rejections); cost per account (AWS Budgets and Cost Anomaly Detection in every account from day one). Four dashboards: students' view, service, rules and updates, Ask.

**Tracing.** Not at launch. Request ids in every log line are enough for one monolith and one database. Add OpenTelemetry with a Collector and its redaction processor (allowlist of keys, fails closed) when a second service exists. Clients send no tracing and no RUM.

**Error tracking (Sentry).** Launch: App Store Connect and MetricKit, Play Console Android vitals, backend errors in CloudWatch. Before the first stranger: Sentry SaaS, US data region (cannot change later), with **client reports opt-in** and routed through a **Duly-run Sentry Relay** in prod-core so Sentry never sees a student's IP. Every SDK configured explicitly: `dataCollection` all off (`userInfo`, cookies, headers, bodies, `genAI`, stack-frame variables) or `sendDefaultPii: false`; `beforeSend` and `beforeBreadcrumb` allowlists (exception type, frames, the three versions, OS); no replay, screenshots, view hierarchy, profiling or client tracing; native minidumps off in v1 (they can hold a decrypted I-20); "Store Minidumps As Attachments" off; IP storage off; server-side scrubbing rules; 30-day retention; source maps uploaded privately. No Sentry in prod-assistant. A forced-crash canary in CI fails if canary values reach the upload.

**Alerts and SLOs.** Correctness first.
| SLO | Target (Proposal) | Alert |
|---|---|---|
| Wrong dates | Zero; any one is SEV1 | Page |
| Docket change to "Can't tell yet" on devices | 24 hours | Page at 12 hours |
| Reminders fired on the planned day | 99% on test devices | Ticket |
| Bundle signature failures | Near zero | Page on spike |
| Sync availability | 99.9% monthly | Burn rate 14.4 over 1 h (5 min window) and 6 over 6 h page; 1 over 3 days ticket |
| Daily restore canary | Passes | Page after two failures |
| Ask availability | 99.5% | Ticket (falls back to guides) |
| Crash-free sessions | 99.8% per platform | Blocks promotion |

A dependency-free status page and a synthetic check from a second Region both live outside prod-core (owner: infra).

**Alternatives.** Self-hosted GlitchTip (accepts Sentry SDKs, about 512 MB RAM, but a Postgres plus Django service to patch). Self-hosted Sentry (16 GB RAM; too heavy). Platform consoles only.

**How to tune.** Raise or lower burn thresholds after a month of data; add tracing with the second service; turn on per-crash minidump consent only by founder decision.

**Sources.** https://opentelemetry.io/docs/security/handling-sensitive-data/ ; https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md ; https://sre.google/workbook/alerting-on-slos/ ; https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-ServiceLevelObjectives.html ; https://docs.sentry.io/platforms/javascript/guides/electron/configuration/options/ ; https://docs.sentry.io/platforms/native/guides/minidumps/ ; https://docs.sentry.io/product/relay/ ; https://docs.sentry.io/organization/data-storage-location/ ; https://docs.sentry.io/security-legal-pii/scrubbing/server-side-scrubbing/ ; https://sentry.io/pricing/ ; https://glitchtip.com/documentation/install ; https://develop.sentry.dev/self-hosted/ ; https://developer.apple.com/documentation/metrickit ; https://developer.android.com/topic/performance/vitals

---

## 15. Notifications (ops.md 6, backend.md 10)

**Decision.** Every dated reminder is a **local notification** planned by the core and scheduled on the device (D73); the server never sends a date.

| Channel | Use | Content |
|---|---|---|
| Local notification | Reminders, follow-ups, check-ins | Generic by default ("Duly: 1 item today"); detail only if the student opts in |
| Push wake-up | New bundle; sync waiting | A type code only. APNs background priority 5; FCM data message at normal priority (high-priority messages without a visible notification get deprioritised) |
| Push alert | Security notices | "Open Duly to review a security notice"; detail fetched and decrypted on the device |
| Email (SES) | Account and security notices; opt-in law-update email (D22) | Never a date, status, school, document kind or verdict |
| Desktop | While the app or an opt-in tray helper runs | As local; the .ics file is the dependable fallback |
| Calendar | Student export | Generic titles by default |

**Rules.** Library wake-ups to an FCM topic and an iOS broadcast or jittered fan-out; fetches go to the CDN only. Windows notifications need a Start Menu shortcut with an AppUserModelID and ToastActivatorCLSID (ties the installer choice to reminders). SES: SPF, DKIM, DMARC at reject; configuration set suppressing bounces and complaints; alarms at half the review thresholds (5% bounces, 0.1% complaints); Gmail bulk-sender rules (one-click unsubscribe, spam under 0.3%); double opt-in. Push tokens encrypted, deleted on revocation or rejection, never logged.

**Alternatives.** Server-scheduled reminders (best-effort and throttled on iOS; would require the server to know dates). Expo's push service (an extra party holding the token list).

**How to tune.** Weekly notification budget and back-off (BLUEPRINT decision 11); reschedule triggers on Android; nearest-50 window on iOS.

**Sources.** https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns ; https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app ; https://firebase.google.com/docs/cloud-messaging/send/v1-api ; https://firebase.google.com/docs/cloud-messaging/android/message-priority ; https://developer.android.com/develop/ui/views/notifications/notification-permission ; https://docs.aws.amazon.com/ses/latest/dg/faqs-enforcement.html ; https://support.google.com/a/answer/81126 ; https://docs.expo.dev/push-notifications/sending-notifications-custom/

---

## 16. Scaling and cost at 1k, 10k, 100k students (infra.md 6 and 12, reviews)

**Load.** At 100k students, about 100 million API requests a month, roughly 40 a second average and a few hundred at peak (estimate). Small for Fargate and one Postgres; no sharding, no multi-Region writes. The one spike is a bundle publish, which the CDN absorbs.

**Scaling steps.** API tasks by target tracking; 1 vCPU tasks near 10k; db.t4g.medium near 10k and db.m7g.large near 100k; second NAT or sender capacity near 10k; Valkey when limits need sharing; CloudFront Business near 100k; Aurora only if failover time or instance class becomes the measured problem.

**Full design, as priced in infra.md (monthly).**
| Line | 1k | 10k | 100k |
|---|---|---|---|
| prod-core and prod-library (Fargate, ALB, RDS, NAT and proxy, endpoints, CDN and WAF, S3 and replica, egress, CloudWatch, secrets) | $300 | $645 | $2,775 to $2,960 |
| prod-assistant fixed | $16 | $20 | $60 |
| Staging, pipeline, security services | $240 to $380 | $320 to $390 | $500 to $700 |
| Ask tokens as infra.md priced them (Haiku 4.5 to Sonnet 5.5, 600 output tokens) | $20 to $40 | $200 to $400 | $1,980 to $3,960 |
| **Total** | **$580 to $740** | **$1,190 to $1,460** | **$5,300 to $7,700** |

**Corrections.** (1) Ask output is a single tool call of about 30 to 80 tokens, not 600. (2) Input may be larger than 5k if the full catalog is sent (20k to 50k tokens, estimate). (3) The only model verified for retention `none` is Opus 4.8 ($5.50 input, $27.50 output per million on the US profile). Recomputed with the top-k shape (about 2,000 input tokens, 80 output, no cache), 8 questions per active student a month, half active, and the cloud step reached by 30% of questions after the on-device router (estimate):
| Model (if `none` verified) | Per question | 1k | 10k | 100k |
|---|---|---|---|---|
| Opus 4.8 (verified `none`) | about $0.013 | about $16 | about $160 | about $1,600 |
| Haiku 4.5 (unverified `none`) | about $0.003 | about $3 | about $30 | about $320 |

**Lean launch (reviews).** Stand up AWS accounts at Phase 4 and prod-shaped infrastructure at Phase 5. At launch: staging on demand (save about $80), no Config or Security Hub until a second engineer (save $30 to $60), no OpenTelemetry Collector, push and email from a Lambda instead of proxy plus NAT (save about $40). That brings 1k students to about $400 to $590 by this arithmetic; the backend reviewer's target of under $350 needs further cuts (for example interface endpoints in one AZ) and is unverified.

**Not included.** Apple ($99 a year, unverified) and Google ($25, unverified) fees, Windows signing (Artifact Signing about $10 a month, unverified), GitHub Team, Sentry Team ($26 a month listed), counsel, audits and pen tests, IR retainer, people.

**How to tune.** At 1k the bill is the fixed platform, and networking is a third of it. At 100k the levers are storage (replica class, padding steps, version window) and Ask (router coverage, model tier, prompt shape). Re-run this table from the AWS Pricing Calculator before any budget.

**Sources.** https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/index.json (AWS Price List API) ; https://aws.amazon.com/fargate/pricing/ ; https://aws.amazon.com/vpc/pricing/ ; https://aws.amazon.com/privatelink/pricing/ ; https://aws.amazon.com/cloudfront/pricing/ ; https://aws.amazon.com/bedrock/pricing/

---

## 17. Backups and disaster recovery (infra.md 8)

**Decision.** Backup and restore across Regions, not a warm second Region. The student's devices hold the primary copy, so a Region outage is a delay, not data loss.

| Scenario | RPO | RTO | How |
|---|---|---|---|
| Bad deploy | 0 | 15 min | Circuit breaker, alarm rollback, expand-then-contract migrations |
| Postgres corruption | 5 min | 2 h | PITR (logs shipped every 5 minutes), 7-day window (Proposal) |
| Ciphertext deleted | 0 | Hours | Versioning, 14-day governance lock, replica in us-east-2 |
| prod-core taken over | 24 h | 24 h | AWS Backup copies to a logically air-gapped vault in another account; SCPs deny key deletion and lock bypass |
| AZ loss | 0 | Minutes | Multi-AZ RDS, tasks in two AZs |
| us-west-2 loss | Postgres 24 h; ciphertext minutes | Library minutes; sync and sign-in 24 h | CloudFront origin failover for the library; rebuild prod-core in us-east-2 from Terraform; multi-Region KMS keys so sign-in and pseudonyms still work (or a written acceptance that every device signs in again) |

**Drills.** The restore drill restores into a dedicated restore-test location inside the prod or backup account boundary, with no outbound access, destroyed after the check; **never into staging** (that would move real emails, passkey keys, push tokens and the device graph into a synthetic-only account). Restore drill on every release, RDS failover and ECS rollback drills before the first stranger, a yearly Region game day with synthetic data.

**Alternatives.** Pilot light in us-east-2 (about $150 a month more).

**How to tune.** Cross-Region snapshot copy hourly instead of daily costs little more; S3 Replication Time Control for a stated SLA.

**Sources.** https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html ; https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html ; https://docs.aws.amazon.com/aws-backup/latest/devguide/logicallyairgappedvault.html ; https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html

---

## 18. Build order from today's prototype to launch

**Step W (now): Duly in its own window on the founder's Mac.** No cloud. This is the founder's test point.
1. A slim desktop entrypoint (for example `api/desktop_main.py`) that imports `engine/` and the local routes only. CI fails if the packaged app contains `anthropic`, `langgraph`, `psycopg`, SQLAlchemy's Postgres path or `assistant/providers.py`.
2. Bundle CPython from python-build-standalone with that slim dependency set (plain uvicorn, not `[standard]`). Interim only; the Rust core replaces it.
3. Engine channel: stdio or an app-owned pipe, or an engine that proves it knows the token; `DULY_ENV` set to a production value.
4. Electron Forge with DMG and ZIP makers (founder approves the dependency); exact `electron` version; fuses set and read back; Actions pinned by SHA.
5. A signing script that signs every .so and .dylib with hardened runtime and a timestamp, then Developer ID notarization, tested with `spctl` on a clean Mac. Until the Apple account exists, an ad-hoc signed .dmg is allowed **for the founder only, with synthetic data only**, said in the test guide. No real documents in Step W builds.
6. A "Starting Duly" screen while the engine starts. Measure first launch.
7. Check it live, push the notification, and hand over the test guide.

**Phase 1: contracts, alone first.** One reconciled contract PR: openapi.yaml (`/v1` set in section 3), the sync frame and event envelope with byte vectors, server-inventory.yaml, the egress allowlist, problem types, the providers.py `route()` interface, BOUNDARY "route first", the threat-model row from passwords to passkeys, CLAUDE.md "SQLCipher only inside duly-core" when the core lands (founder-owned files).

**Phase 2: desktop vertical slice.** Event log replaces the case file; Loop runner and scheduler; job-ends loop end to end. Still the Python engine. Still no cloud.

**Phase 3: core spike, then port.** Pass: identical vectors on five targets; iOS with no JIT; napi addon in an Electron utility process; uniffi-bindgen-react-native in an Expo dev build; performance budgets met. Then swap the sidecar for the core and delete the HTTP hop. Name the human Rust and crypto reviewer here.

**Phase 4: local-only iPhone app.** Native key, reader and notification modules; 30-day reminder study. First AWS accounts: management, security, prod-core with passkey sign-in only. Company Apple and Google enrolment done before this ships to anyone.

**Phase 5: pairing and sync.** Protocol spec and targeted crypto review first; signed device list, QR pairing, sessions, revocation, delay, sync relay, compaction rule. Prod-shaped infrastructure starts here.

**Phase 6: backup.** Blobs, 14-day window, deletion jobs, retention table, government request policy, counsel sign-off on consent, full outside crypto audit, restore drills.

**Phase 7: updates publish half.** TUF ceremony with named signers, staged rollout, kill switch, freeze key, signed update metadata for desktop.

**Phase 8: Ask.** On-device router with its own design section first (model, licence, runtime per platform, index build, parity tolerance), crisis pre-filter, labelled corpus. Then prod-assistant with SCPs, retention probe, separate distribution, Ask tokens, evals. Cloud step off until the eval margin is met.

**Phase 9: first strangers.** Sentry through Relay; runbooks tested (wrong rule, bad release per store, release-integrity alarm, breach with the 30-day clock, government demand, SES pause, push credentials, Ask failure); tabletop; IR retainer; pager; status page; VDP and security.txt; pen test of identity, pairing and relay.

**Then:** Android (same Expo app), Windows (same Electron app, per-machine install, Artifact Signing as the company), the web record if W1 allows.

**Before the first stranger, all of these are true:** the section A fixes in the security review (Ask unlinkability, error-path leaks, desktop update transparency or no claim, device-clock delay, engine channel); one reconciled contract; RLS with `SET LOCAL` and a coverage check; signed and notarized builds with fuses read back under the company identity; event versioning and a signed minimum client version; Bedrock model verified for `none` with SCPs and the daily probe; canary bytes on every outbound path; abuse limits live; restore, failover and rollback drills timed; budgets and anomaly alarms in every account; in-app and web account deletion; accessibility and unambiguous dates; hardware keys on every admin account.

---

## 19. Open decisions for the founder

Ordered by what blocks work first. "Rec" is the recommendation.

| # | Decision | Rec | Blocks |
|---|---|---|---|
| 1 | Approve Step W: Forge, slim bundled Python sidecar as interim, pipe channel, ad-hoc signed founder-only build until the Apple account exists | Yes | Own window |
| 2 | Form the company and enrol Apple, Google and Azure as it; who signs | Now | Any key-holding install by a stranger |
| 3 | Core language | Rust, Python oracle | Phase 3 |
| 4 | Desktop | Electron | Step W |
| 5 | Mobile | React Native with Expo, native security modules, self-hosted builds, no OTA in v1 | Phase 4 |
| 6 | GitHub Team plan (protected environments) | Yes | Release signing |
| 7 | Second release signer, security reviewer, Rust and crypto reviewer; or founder holds two of three tokens as a stated weakness | Name them | Phases 3, 5, 7 |
| 8 | When to stand up AWS | Accounts at Phase 4, prod shape at Phase 5 | Cost |
| 9 | Session design | Hybrid: opaque core tokens, JWT only for Ask | Phase 4 |
| 10 | Security delay length; device clocks measure it | 24 h, device clocks | Phase 5 |
| 11 | Pairing fallback | QR only unless an audited CPace exists | Phase 5 |
| 12 | Withholding threshold; compaction staleness | 6 h; 60 days | Phase 5 |
| 13 | Email optional or required | Optional, with the residual-risk sentence | Phase 4 |
| 14 | Outbound path | Push and email Lambda outside the VPC, or proxy plus NAT | Phase 5 |
| 15 | Database | RDS PostgreSQL Multi-AZ, t4g.medium or credit alarm | Phase 5 |
| 16 | Multi-Region KMS keys, or accept forced sign-in after Region loss | Multi-Region | Phase 5 |
| 17 | Student ciphertext window | 14 days governance, crypto-shred first (counsel) | Phase 6 |
| 18 | Retention numbers (section 7.5) incl. security log 90 days, RDS 7 days | As proposed | Phase 6 |
| 19 | Storage quota | 250 MB default, raised on trust | Phase 6 |
| 20 | Ask payload and output | Question, locale, catalog version, candidate ids in; `guide_id` or `none` out | Phase 8 |
| 21 | Ask model | Only `allowed_modes` with `none`; verify Haiku 4.5 first; else Opus 4.8 | Phase 8 budget |
| 22 | Ask limits | 20 a day, 1 in flight, 24 h account age or attestation | Phase 8 |
| 23 | Ask cloud step default | Off until the eval margin is met; founder sets the margin | Phase 8 |
| 24 | Ask data | Paid consented corpus and opt-in question sharing | Phase 8 |
| 25 | Ask linkage | Launch with "Duly does not store your questions"; OHTTP and Privacy Pass before scale | Phase 8 copy |
| 26 | Error tracking | Platform consoles at launch; Sentry US through Relay, opt-in, before strangers; minidumps off | Phase 9 |
| 27 | SLO targets, on-call hours, IR retainer | As in section 14 | Phase 9 |
| 28 | Verification targets and audit order | Section 7.4 order; get quotes | Phases 5 to 9 |
| 29 | Desktop update transparency log | Yes, before claiming compelled changes are visible | Phase 7 |
| 30 | Disaster recovery level | Backup and restore, 24 h Region RTO | Phase 5 |
| 31 | IaC | Terraform | Phase 4 |
| 32 | Passkey RP ID domain, chosen once | Pick before Phase 4 | Phase 4 |
| 33 | Counsel brief: Maryland "strictly necessary" for Ask text, SCA status, 1225(d) reach, consent wording, crypto-shred as deletion, minors, store acceptance of delayed deletion | Send now | Phases 6, 8, 9 |

---

## 20. Still unverified (check before relying)

- Which Claude models besides Opus 4.8 allow retention `none`; their prices on the US profile; whether prompt caching stores anything under `none`; Bedrock `toolChoice` limits for current Claude models and with extended thinking.
- Exact `Resource` support for the Bedrock SCPs and that denying `PutModelInvocationLoggingConfiguration` covers both endpoints.
- Pydantic `hide_input_in_errors` name; CloudFront OAC to a Lambda URL with signed POST bodies end to end (the header requirement is verified; a spike confirms the whole path, ALB fallback about $22 a month).
- napi-rs in Electron utility processes; current Hermes WebAssembly support; Squirrel.Mac signature and freshness checks; electron-updater staged percentages; iOS 64-notification cap; Android reschedule after app update; OEM battery behaviour.
- App Attest server details; Play Integrity through workload identity; Apple App Attest egress hosts.
- RDS failover time and `max_connections` by class; t4g credit behaviour; NAT and Valkey prices in Oregon; Config and Security Hub cost; Apple, Google and Artifact Signing fees; D-U-N-S lead time.
- Padmé overhead; audited CPace availability; whether SQLCipher can use aws-lc; Windows Hello signature-derived wrapping keys.
- Store acceptance of account deletion behind a security delay; store privacy-label categories for crash data.
- Audit and pen test prices ($150k to $300k range is a guess); Ask catalog size in tokens and router coverage share (estimates used in section 16).
- Legal: SCA status, 8 U.S.C. 1225(d) reach, crypto-shredding as deletion, GDPR or DPDP for pre-arrival users, FERPA in any school partnership.
