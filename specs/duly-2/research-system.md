# Duly 2: the system, end to end

Research for the founder, 2026-09-30. Scope: how Duly should be built underneath, by a team that knows software, networking, security, risk, data, ML, AI and cloud. Inputs read: DECISIONS.md (D1 to D74), CLAUDE.md, PRINCIPLES.md, BOUNDARY.md, security/threat-model.md, specs/documents-1/SPEC.md (vault, keys, backup), specs/updates-1/SPEC.md, specs/ui-2/VALUE-2.md, watch/sources.yaml, contracts/, engine/, desktop/src/engine.ts, docs/research/founder/Duly compliance and system design.md.

Every external claim carries its URL. "Unverified" means I could not confirm it from a primary page during this research. Prices are list prices read on the date above, or from third-party pages where AWS's own page would not render; they are inputs to check in the AWS Pricing Calculator, not quotes.

---

## 0. The diagnosis in one page

The founder's critique ("Duly is static, the backend is weak") is right, and it has a technical cause, not only a design one.

What exists today and is strong:
- A deterministic engine (engine/path.py `compute(case, packs, clock)`) over sourced, tagged, effective-dated rule packs. This is the right core and the hardest part to get right.
- A boundary (BOUNDARY.md) enforced by classifier, validator, copy lint and evals.
- A vault design for the desktop (documents-1 section 3) that is on par with good practice: per-file keys, envelopes to a vault public key, a recovery kit, no plaintext temp files.
- A source watcher design (updates-1) that re-checks every saved quote.

What is missing, and why the product feels static:

| Gap | Effect the founder sees | Section |
|---|---|---|
| The record is a snapshot (a case JSON), not a history. Nothing remembers that a question was asked, what was answered, or what was promised next | "I answered, what now?" Nothing to follow up on, no footprint | 3 |
| There is no Loop object: no state machine that says "this question is open, here is the next step, here is when Duly comes back" | No follow-up, no closing, no positive or negative feedback | 4 |
| The engine runs only as a Python process the desktop spawns on 127.0.0.1 (desktop/src/engine.ts). A phone cannot do that | No real phone app; "For you" recompute and reminders on device (D73) cannot exist on mobile | 5 |
| No accounts, no sync, no device linking | Phone and laptop are not "one place"; documents can still be lost | 6 |
| The updates pipeline stops at "tell the founder" (updates-1); publish and recompute are not built | Updates never reach a student's own dates | 7 |
| No scheduler design that works inside iOS and Android limits | Reminders and check-ins are promises the platform will not keep as written | 8 |
| The assistant is a boundary floor (assistant/boundary.py) with no answer pipeline | "Anyone can ask anything" has nowhere to go | 9 |
| No cloud account structure, no logging policy, no CI to AWS, no restore drill | Not shippable to strangers | 10 to 12 |

The fix is not more screens. It is five backend pieces, in this order: (1) the event log as the record, (2) the engine on every device, (3) Loops and Playbooks over the log and the engine, (4) end-to-end encrypted sync, (5) the publish half of the updates pipeline. Everything the founder asked for (follow-up, closing the loop, the footprint, phone plus laptop, live updates, USCIS status) is a view over those five.

---

## 1. Constraints the design must satisfy

These are the founder's rules, restated as engineering requirements. Each later section says how it meets them.

| # | Requirement | From |
|---|---|---|
| R1 | Every date and count comes from the engine over sourced rules, with an injected Clock | CLAUDE.md, PRINCIPLES 1 |
| R2 | No student data or document value reaches an outside model provider; no document value reaches any model, including Duly's own Bedrock, until the founder decides | D13, D23, D27, D60 |
| R3 | Documents are read on the device; every field is confirmed before use | D55, PRINCIPLES 2 |
| R4 | Documents are stored encrypted on the device; any cloud copy is end-to-end encrypted with a key only the student holds | D54, D58 |
| R5 | No legal conclusion on a disputed or personal point; doubt steps back to the DSO with a drafted question | BOUNDARY.md, D5 |
| R6 | A verdict never goes quiet by default: missing, stale, conflicting or litigated means "Can't tell yet" | D4, CLAUDE.md |
| R7 | A law change reaches a student only after primary source, quote found, two checks and founder approval | D2, D22 |
| R8 | Check-in reminders are computed on the device; the server holds no record dates for them | D73 |
| R9 | AWS us-west-2 | D16 |
| R10 | Wrong is worse than late; saying "Can't tell yet" is never a failure | D37, PRINCIPLES 4 |

Two consequences shape everything:

1. **The device is the computer, the cloud is a mailbox and a library.** The student's record, the engine run, the reminders and the "For you" match all happen on the device. The cloud stores ciphertext it cannot read, serves public law (rule packs, updates) to everyone alike, and relays wake-ups. This is the "local-first" model described by Ink & Switch: the local copy is primary, sync is multi-device, and the vendor cannot read the data ([Ink & Switch, Local-first software](https://www.inkandswitch.com/essay/local-first/)).
2. **The model never needs personal values.** Because R1 forbids a model from stating dates and R2 forbids it from seeing document values, the model's job shrinks to two things: choose which Playbook a question belongs to, and phrase public rule text in plain words. Both can work on text with no personal values in it (section 9). This is also what makes the assistant cheap at scale (section 15).

---

## 2. Architecture at a glance

```
 DEVICE (phone, laptop, web)                         DULY CLOUD (AWS us-west-2)
 ┌───────────────────────────────────────┐          ┌───────────────────────────────────────┐
 │ Vault (encrypted)                     │          │ Account + device registry (Postgres)  │
 │  - event log (the footprint)          │  cipher- │ Sync relay: ordered ciphertext log    │
 │  - document files + versions          │◄─text───►│   per account (S3 + Postgres index)   │
 │  - projections: facts, docs, timeline │  only    │ Encrypted backup objects (S3)         │
 │ Engine (same code as server oracle)   │          │                                       │
 │ Loop runner + Playbooks               │◄─signed──│ Public library: rule packs, Playbooks,│
 │ Local scheduler (notifications, .ics) │  public  │   plain-words text, updates, schools  │
 │ Document reader (OCR, MRZ, classify)  │  content │   (signed, versioned, cached on CDN)  │
 │ Boundary validator (same rules)       │          │                                       │
 └──────────────┬────────────────────────┘          │ Wake-up push (no content)             │
                │ question text only, no values     │ Update email (public content only)    │
                ▼                                   └───────────────────────────────────────┘
 ┌───────────────────────────────────────┐          ┌───────────────────────────────────────┐
 │ ASSISTANT ZONE (Duly AWS account)     │          │ PIPELINE ZONE (separate AWS account)  │
 │ Bedrock, retention mode none, US-only │          │ Watch primary sources → snapshot →    │
 │ Router + phraser; output = Playbook id│          │ detect → draft (model on public text) │
 │ + text with slots, never values       │          │ → check → founder approves → sign →   │
 └───────────────────────────────────────┘          │ publish to the public library         │
                                                    └───────────────────────────────────────┘
```

Three zones, three different trust levels, three AWS accounts (section 10). The pipeline zone never touches a student. The assistant zone never sees a document value. The sync zone sees only ciphertext and the minimum metadata needed to deliver it.

---

## 3. Data model: the student record as an append-only event log

### 3.1 Why an event log

Today the record is a case JSON that is overwritten. That loses exactly what the founder asked for: what was asked, when, what was confirmed, what Duly said, and what happened next. Event sourcing stores every change as an immutable event in an append-only log and builds current state by replaying it; corrections are new compensating events, never edits, and the whole state can be thrown away and rebuilt from the log (Martin Fowler's "complete rebuild" test, summarised in [Fowler, GOTO 2017 talk notes](https://gist.github.com/xpepper/36beda855540b0c1dde6c4c417dafec9); pattern overview at [DevX](https://www.devx.com/technology/event-sourcing-explained-capturing-state-changes-at-scale/)).

For Duly this gives, for free:
- **The digital immigrant footprint.** The timeline view is a projection of the log: every program, card, job, trip, petition, document version, question and answer, with the day it was recorded and where it came from.
- **"As of" everywhere.** Each fact has the event that set it and the day it was confirmed, which is what the check-in (VALUE-2 feature 5) and D66 need.
- **Recompute after a law change.** Same log, new pack, rerun, diff by item id (VALUE-2 already plans the diff).
- **Undo.** "Every answer can be undone" (VALUE-2 feature 5) is a compensating event.
- **Sync without merge pain.** Devices exchange events, not whole documents (section 6).
- **Audit for the student.** "You marked this made on Oct 2" (VALUE-2 feature 4) is literally an event.

### 3.2 The event envelope

Every event, on every device, has the same envelope. The body is typed by `kind` and validated against a JSON Schema in contracts/ (a contract change that lands first, per CLAUDE.md).

| Field | Type | Meaning |
|---|---|---|
| `id` | UUIDv7 | Sortable, unique across devices |
| `account_seq` | int, set by the server on accept | Total order per account, used for sync |
| `device_id` | UUID | Which device wrote it |
| `hlc` | hybrid logical clock string | Causal order across devices before the server orders them |
| `recorded_at` | instant, from the injected Clock | When it was written |
| `effective_on` | local date or null | The day it is about (job ended Oct 31), in the student's zone (D33) |
| `kind` | enum | See 3.3 |
| `subject` | stable id | The thing it is about (job id, document id, loop id) |
| `body` | object | Kind-specific |
| `provenance` | enum + ref | `document_field(doc_id, version, field)`, `typed`, `answered(loop_id, step)`, `dso_reply(loop_id)`, `system(rule_pack_version)` |
| `confirmation` | enum | `confirmed`, `checked_against_document` (D59), `unconfirmed` |
| `supersedes` | event id or null | For corrections |
| `schema` | int | Body schema version, upcast on read |

Rules:
- Events are never edited or deleted, except by account deletion (crypto-shredding, 6.7).
- An `unconfirmed` fact never feeds a verdict (PRINCIPLES 2, D59); the engine already treats missing as `cannot_tell`.
- `provenance` is what powers "From your paper" (D74) and the source sheet.

### 3.3 Event kinds (first cut)

| Group | Kinds |
|---|---|
| Identity and profile | `profile.set` (name shown, time zone, school), `program.added/changed/ended`, `sevis.recorded` |
| Documents | `document.added` (file id, kind guess), `document.version_added`, `document.field_read` (on-device reader output, unconfirmed), `document.field_confirmed`, `document.removed` (tombstone, file kept until purge window) |
| Work and status | `ead.recorded`, `employment.started/changed/ended`, `hours.changed`, `unemployment.marked`, `cpt.recorded`, `petition.filed/receipt/outcome`, `capgap.i20_recorded` |
| Travel and address | `trip.planned/taken`, `address.changed`, `passport.recorded`, `visa.recorded` (D74) |
| Reports | `report.marked_made` (what, to whom, the day the student says) |
| Loops | `loop.opened`, `loop.step_answered`, `loop.answer_shown` (engine output hash, pack version, rule ids), `loop.action_marked`, `loop.followup_scheduled`, `loop.closed` (outcome), `loop.reopened` |
| Law | `pack.applied` (version, hash), `update.seen` |
| Assistant | `question.asked` (text kept only on device), `stepback.drafted` (DSO email text), `dso.reply_recorded` |

### 3.4 Projections (read models)

Built on the device by replaying the log; cached in the encrypted local database; rebuilt on schema change.

| Projection | Used by |
|---|---|
| `facts` (current confirmed value of every case field, with as-of and provenance) | Engine input; replaces today's case JSON as a derived view, so the engine contract does not change |
| `documents` (index, versions, kinds, confirmed fields, next to run out) | Documents screen, Document watch (VALUE-2 feature 6), Share |
| `timeline` (the footprint) | Your profile / Timeline, Share's one-page summary |
| `loops` (open, waiting, closed, with next step and due day) | Home, follow-ups, reminders |
| `schedule` (every future notification with its source item) | Local scheduler, .ics export |

The engine stays a pure function: `compute(facts, packs, clock)`. The event log sits in front of it; nothing about R1 changes.

### 3.5 Documents and versions

- A document is a stable id; each upload is a version with its own file key (documents-1 already gives one key per file). A new I-20 is a new version of "I-20 for program X", never an overwrite, so the I-20 chain (documents-1 section 6) is a query over versions.
- Content hash per version (of plaintext, kept inside the encrypted record) detects duplicates on device without the server seeing the hash.
- Files are chunked (documents-1 uses 1 MiB AES-256-GCM chunks with bound chunk index and final flag), which also makes resumable sync uploads natural.

### 3.6 Schema evolution

Event bodies carry a schema number; readers "upcast" old bodies to the current shape. Never migrate stored events in place (they are ciphertext on the server anyway). Each upcaster has a property test over generated old events. This is the standard way event-sourced systems evolve (unverified as a citation; it is common practice).

---

## 4. Loops: how Duly carries any question to done

This is the founder's central request: "do you still have this job? no. what to do? find a job. how? here. where? here. when? time. what to keep in mind? these dates." Technically that is a **state machine with a memory and a clock**. It needs three objects.

### 4.1 The objects

**Playbook** (public, authored, reviewed, versioned, shipped like a rule pack):
- An id, a title, the triggers that open it, and a graph of steps.
- Each step is one of: `ask` (a question that writes an event), `compute` (call the engine, show items with their sources), `explain` (plain-words text for a rule, quote one tap away, D56), `act` (a task with a due day from the engine, e.g. "Report the end of employment by Nov 10"), `resource` (a public link: school ISSS page from the school record, USCIS page, AILA lawyer search), `stepback` (the BOUNDARY card plus drafted DSO email), `wait` (until a day, an event, or a reply), `close` (with a named outcome and a calm acknowledgement).
- Every number in a step is a reference to an engine item or rule id, never a literal. Every sentence has a source. Playbook text runs through the same copy lint and boundary validator as UI copy.
- Playbooks are data, so adding "I lost my job" or "I want to travel" is content work with review, not app releases. This is how "every part should be an open loop" scales to every category (D47).

**Loop** (private, one per open question, lives in the event log):
- `loop.opened` with the Playbook id and version, and the trigger.
- Current step, answers so far (as events), the engine items it is watching, the next follow-up day.
- States: `open → waiting_on_student | waiting_on_date | waiting_on_dso → closed(outcome)`; any state can go to `reopened`.

**Trigger** (what opens a Loop, so the student does not have to know what to ask):

| Trigger | Example |
|---|---|
| A question typed or tapped | "I lost my job" → `job_ended` Playbook |
| A stale fact (check-in) | Job confirmed 30+ days ago while an unemployment clock runs → "Still at Northwind?" |
| An engine item crossing a line | File-by date is 21 days out and no receipt recorded |
| A document added or read | New I-20 version with a new program end date → "Your program end moved; here is what moved" |
| A law update that touches the student's facts (matched on device) | Rule pack changes `opt.report_employer_within_days` |
| A date reached | Return day of a planned trip → "Did you return on Mar 3?" |
| A DSO reply | Student pastes the DSO's answer → recorded as `dso_reply`, the Loop resumes |

### 4.2 The "job ended" loop, end to end

1. **Open.** Check-in asks "Still at Northwind, about 40 hours a week?" The student taps "Job ended". Event `employment.ended(effective_on=Oct 31, provenance=answered)`.
2. **Compute.** Engine reruns. The Loop shows only what moved: unemployment days used as of today, the day 90 would fall on with no new job, the report-by day (A3 arithmetic, working shown). Sources one tap away.
3. **Act.** Task: "Report the end of employment by Nov 10" (from `opt.report_employer_within_days`, guidance tag shown). Buttons name outcomes: "I reported it", "Remind me tomorrow".
4. **Next (the founder's "what to do? how? where?").** Plain-words steps the sources support: where the report is made (the SEVP portal page, cited), what the rule says about qualifying work (shown as the rule, never judged, B3), the school's own page if the school record exists (D3). "Add a new job" is one tap and opens the `employment.started` path.
5. **Step back where needed.** "Does this volunteer role count?" triggers the BOUNDARY step-back with a drafted DSO email (D57). The Loop moves to `waiting_on_dso` and schedules a follow-up: "Did your DSO reply?" in 5 business days (a product setting).
6. **Follow up.** Local notifications at the student's morning: report-by day minus 3, then the day; every 14 days while unemployment runs, a check-in; when a new job is recorded, the count stops and the Loop says so.
7. **Close.** When the report is marked made and a new job is recorded (or the student says "Nothing more to record", D41), `loop.closed(outcome=reported_and_new_job)`. Home shows one quiet line: "Done: job change recorded Nov 4. Unemployment count stopped at 4 days." That is the positive trigger the founder asked for: a factual completion, not confetti (D10), not reassurance (B10).
8. **Reopen.** Any new fact touching the Loop's watched items reopens it with a reason.

### 4.3 Feedback, positive and negative, inside the boundary

| Signal | Allowed form | Never |
|---|---|---|
| Positive | "Done", what was recorded, what stopped or moved, the date. A completed Loop collapses on Home | "You're fine", "safe", streaks, praise |
| Negative | The date and the rule, calmly. "The report-by day was Nov 10. Today is Nov 12. This is a question for your DSO" with a drafted email | "Late", "violation", red alarms, conclusions about status |
| Unknown | "Can't tell yet" with the one fact that would settle it, as the next step | Silence |

### 4.4 Why this fixes Home

Home becomes a projection of open Loops, sorted by the earliest engine due day, each collapsed to one line with its deliverable ("File your I-765 by Jan 14", "Report the end of employment by Nov 10"). Closed Loops leave Home. Nothing on Home exists that is not a Loop or the verdict. The design itself is for the UI research; the data model makes it possible.

### 4.5 Engineering notes

- The Loop runner is deterministic: given the log, the Playbook version and the Clock, it produces the same next step. It is tested like the engine (clock-injected property tests, skill `write-clock-injected-property-test`).
- A Playbook never contains logic the engine owns. If a step needs a new date, the engine gets a new item with a sourced rule first.
- Playbooks are signed and versioned with the rule packs (section 7); an open Loop keeps its Playbook version until it reaches a step that is safe to migrate.

---

## 5. The engine on every device

### 5.1 The problem

desktop/src/engine.ts spawns the Python engine and talks to it over 127.0.0.1. That works in Electron on a Mac. It does not work on iOS or Android, and in a browser it needs a server, which breaks R2/R4/R8 (the server would see the facts). Without the engine on the phone there is no on-device recompute, no on-device reminders (D73), no "For you" matching, no "Try a change".

### 5.2 Options

| Option | How | For | Against |
|---|---|---|---|
| A. Server computes | Device sends facts to the API | Simplest | Server sees every date and status. Breaks D54, D73, the threat model's "hold almost nothing". Rejected |
| B. Python everywhere | Pyodide in web/Electron; embedded CPython on mobile | One codebase | Large bundles, slow cold start, awkward on iOS; unverified for production mobile use |
| C. Rust core | Port engine to Rust; bind to Swift/Kotlin with UniFFI, to web/Electron with WebAssembly. UniFFI "automatically generates foreign-language bindings targeting Rust libraries" for Kotlin, Swift, Python and others ([UniFFI](https://mozilla.github.io/uniffi-rs/latest/)) | One fast, memory-safe core on every platform; Python bindings let the existing tests run against it | A port of a ~2,700 line engine; Rust skills needed |
| D. TypeScript core | Port to TS; runs in Electron, web, React Native | The UI stack is already TS | Number and date handling in JS needs care; Swift/Kotlin native apps would need a JS runtime |

### 5.3 Recommendation

Option C, with the Python engine kept as the **oracle**:
- Every rule pack ships with golden vectors: generated cases (property-based, clock-injected) and the Python engine's output. The Rust engine must produce byte-identical normalized output for every vector before a pack or engine release ships. This is differential testing; it turns "two implementations" from a risk into a check.
- The engine output carries `engine_version`, `pack_version`, `pack_hash` and the Clock day, so any screen can say exactly what produced a number.
- If the port is not affordable now, Option D is the fallback with the same oracle rule. Option A is not acceptable.

---

## 6. Sync across devices with end-to-end encryption

### 6.1 What good looks like elsewhere

| Product | Pattern | Source |
|---|---|---|
| 1Password | Two secrets: account password plus a 128-bit Secret Key generated on device; the server never has enough to attempt cracking. Separate keys derived for decryption (AUK) and authentication (SRP) | [1Password security design](https://agilebits.github.io/security-design/apsk.html), [deeper look at keys](https://agilebits.github.io/security-design/deepKeys.html) |
| Bitwarden | All keys generated and used on the client; server never has the master password or keys; passkey unlock through the WebAuthn PRF extension | [Bitwarden security whitepaper](https://bitwarden.com/help/bitwarden-security-white-paper/), [PRF and passkeys](https://bitwarden.com/blog/prf-webauthn-and-its-role-in-passkeys/) |
| Ente (photos) | Master key on device, wrapped by a password-derived key (Argon2id) and by a recovery key; per-collection and per-file keys; libsodium primitives; server stores only wrapped keys | [Ente architecture](https://ente.com/architecture/) |
| Apple Advanced Data Protection | Service keys removed from Apple's HSMs and kept only in the iCloud Keychain domain of trusted devices; requires a recovery contact or recovery key; "Apple can't help recover" if those fail | [Apple Platform Security, ADP](https://support.apple.com/guide/security/advanced-data-protection-for-icloud-sec973254c5f/web) |
| Automerge + Keyhive | Sync servers relay ciphertext they cannot read | [automerge-repo-keyhive](https://github.com/automerge/automerge-repo-keyhive) |

Duly's documents-1 design already matches this family (vault key K, unlock key U, recovery key R, X25519 envelopes, per-file keys). What is missing is the **account** level that spans devices.

### 6.2 Keys across devices

Extend documents-1, do not replace it:

| Key | Change for multi-device |
|---|---|
| K (vault key) | Becomes the **account vault key**, the same on every device of the account. Generated on the first device |
| V (vault key pair) | Same on every device, so any device (and the share sheet on any device) can add documents while locked |
| U (unlock key) | Per device, never synced. Keychain with user presence on Apple, Android Keystore (unverified detail per OEM), DPAPI/safeStorage on desktop |
| R (recovery key) | One per account, in the recovery kit. Unchanged. Opens K on a new device |
| Device key pair | New. Per device, X25519 for receiving K during pairing, Ed25519 for signing the events it writes |
| Sync key S | New. Derived from K with HKDF, purpose "sync", encrypts each event batch |

Adding a device has two paths:
1. **Pair from a device you already have** (default): the new device shows a QR code with its public key and a short code; the old device, unlocked, encrypts K to that public key and posts it through the relay; both screens show the same six-digit check. No secret typed.
2. **Recovery kit** (no other device): type R; Duly fetches the K wrap under R from the server (documents-1 section 12 already puts that wrap in the backup).

Passkeys sign the student in (account access). They are **not** the encryption key. The WebAuthn spec co-editor warned that using a passkey's PRF output for encryption makes a replaceable login credential into an irreplaceable key, so losing it loses data ([summary of Tim Cappalli's warning](https://lilting.ch/en/articles/passkeys-prf-extension-encryption-risk); original statement not located, unverified). PRF may be added later as one more wrap of K, never the only one. NIST SP 800-63B-4 (final, July 2025) accepts synced passkeys at AAL2 ([NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)), which is the right level for account login.

### 6.3 What the server stores

| Stored | Form |
|---|---|
| Account | Email (for sign-in and law-update email only), passkey public keys, created day |
| Devices | Device id, public keys, platform, last sync day, push token |
| Event log | Per account: `account_seq`, random object id, padded size, upload instant, ciphertext. No kind, no subject, no dates in clear |
| Files | Random object ids, padded sizes, ciphertext chunks (S3) |
| Key wraps | K under R, K under each device public key (pending pairings only, deleted when used) |

What it never stores: visa type, nationality, SEVIS id, school, dates, document kinds, names. This is the "architecturally cannot associate" stance from the founder's own compliance research, which cites the Proton case where a provider was compelled to start logging what it did not log before (docs/research/founder/Duly compliance and system design.md, citing [TechCrunch](https://techcrunch.com/2021/09/06/protonmail-logged-ip-address-of-french-activist-after-order-by-swiss-authorities)).

### 6.4 Sync protocol

- Client appends events locally, encrypts batches under S with AES-256-GCM (additional data: account id, device id, batch id), signs with the device key, uploads.
- Server assigns `account_seq` in a single Postgres transaction per account, stores the object in S3, returns the seq. It checks only: authenticated account, device registered, envelope header present, size within limit (documents-1 already refuses plaintext bodies).
- Clients pull from their last seq, verify signature and seq continuity (refuse rollback: a lower seq than seen is an attack or a bug), decrypt, apply.
- **Conflicts are questions, not merges.** Most events commute (two documents added on two devices). Where two devices set the same fact differently (job end Oct 31 on the phone, Nov 1 on the laptop), the projection marks the fact `conflicting`, the verdict for items using it is `cannot_tell` (R6), and a Loop asks the student which is right. This is PRINCIPLES 2 applied to sync, and it means Duly does not need a CRDT library for the record. (Automerge is the reference if collaborative editing is ever needed: [automerge.org](https://automerge.org/).)
- Files sync lazily: the event says a version exists; the bytes download on demand or on Wi-Fi, and "Carry these" (VALUE-2 feature 3) pins a folder for offline.

### 6.5 Web

A browser app that holds keys trusts whatever JavaScript the server sends that day; Meta built Code Verify for WhatsApp Web because web apps lack app-store review of the code ([Meta engineering, Code Verify](https://engineering.fb.com/2022/03/10/security/code-verify/)). Options: (a) web opens the vault read-only and only after pairing, with a strict CSP and Subresource Integrity, and a published hash of each release; (b) web shows only public content (law updates, Playbooks) and the account, and the vault stays on phone and desktop. Recommendation: (b) at launch, (a) later. Founder decision W1.

### 6.6 Platform storage notes

- Electron `safeStorage`: on macOS it protects from other users and other apps; on Windows it protects from other users but **not** from other apps of the same user; on Linux without a secret service it is "encrypted via hardcoded plaintext password" ([Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)). So on Windows, U should require Windows Hello (unverified API detail), and Linux needs a stated limit or no support.
- Mobile follows OWASP MASVS v2: storage, crypto, auth, network, platform, code, resilience, privacy ([OWASP MASVS](https://mas.owasp.org/MASVS/)). Exclude the vault folder from OS cloud backup, or Apple and Google backups would hold an extra copy (unverified per-platform flag names).

### 6.7 Deletion

Delete account: delete K wraps, every object, every device record; S3 versions expire within a stated window; deleting K on every device makes any surviving ciphertext unreadable (crypto-shredding; whether this counts as deletion is a counsel question, already listed in the founder's compliance research).

### 6.8 Is sync on by default?

D54 says the cloud copy is optional. The founder's new statement ("if I have Duly on my mobile and laptop, I'm sorted and I don't have to worry about my documents getting lost") needs sync, which needs the ciphertext on the server. Because the server cannot read it, sync is the same privacy class as the optional backup. Founder decision S1: sync on when a second device is added (recommended, with the consent screen documents-1 section 12 already specifies), or always opt-in.

---

## 7. Rules and updates pipeline

### 7.1 Stages

```
watch → snapshot → detect → classify → draft → check → approve → sign → publish → recompute (on device) → follow up
```

| Stage | What runs | Store | Gate |
|---|---|---|---|
| Watch | Scheduled fetchers per source (watch/sources.yaml hosts only) | none | Host allowlist; per-host rate limits |
| Snapshot | Save raw bytes and normalized text, content-addressed by SHA-256 | S3 with Object Lock (compliance mode) in the pipeline account, so a snapshot cannot be altered after the fact | Hash recorded in the pack's `snapshot_sha256` |
| Detect | Text diff against the last snapshot of the same source (updates-1 already defines "change in the text that holds the quotes") | Postgres `checks` table (today checks.jsonl) | Unreachable is never "unchanged" |
| Classify | Which rules, Playbooks and categories the change touches; is it new law, a court order, guidance, a school page | none | A model may suggest, a rule maps; doubt goes to a human |
| Draft | A model reads public law text only (R2 does not bite: no student data) and drafts: the parameter change, the plain-words line (D56), the update text (D22), new eval cases | Draft record | The `law-update-claim` skill rules |
| Check | (1) quote found verbatim in the saved snapshot; (2) a second, independent check (different model or a person); (3) the engine's golden vectors and evals rerun with the draft pack; (4) the boundary validator over all new text | Check results | `publish_blockers` returns nothing (CLAUDE.md) |
| Approve | Founder in Ops, hardware key, IP allowlist (D17), re-auth for publish | Audit log (append-only) | Human approval for every change to law |
| Sign | Pack and Playbook bundle signed with an offline-held key | none | Two signatures for a pack that changes a date rule (recommended) |
| Publish | Upload to the public library bucket; CDN; announce the new version | Public bucket | none |
| Recompute | Each device downloads, verifies signature and version, reruns the engine over its own facts, diffs items by id, and opens or updates Loops for what moved | Device | Nothing about who matched leaves the device (VALUE-2 "For you") |

### 7.2 Signing and distribution

A rule pack is software that changes what millions of numbers say. Distribution should follow The Update Framework, which protects "even against attackers that compromise the repository or signing keys" and covers key compromise, rollback and freeze attacks ([TUF](https://theupdateframework.io/)). In practice: a root key held offline, a short-lived timestamp role so a device notices if updates stop (freeze), version numbers that never go back (rollback). This closes the threat model's "Stolen Ops session publishes a false rule" and "Poisoned source" rows more firmly than approval alone.

### 7.3 Data engineering: sources and how to read them

| Source | Access | Use |
|---|---|---|
| Federal Register | Free JSON API, no key, filters by agency, type (RULE, PRORULE, NOTICE, PRESDOCU) and dates ([FederalRegister.gov API](https://www.federalregister.gov/developers/api/v1); summary in [data.gov catalog](https://catalog.data.gov/dataset/federalregister-gov-and-api)) | New rules and proposed rules from DHS, USCIS, ICE, State, DOL. Public inspection documents give a day or more of warning (unverified lead time) |
| eCFR | Versioner API gives the text of a part or section as of a date ([eCFR developer resources](https://www.ecfr.gov/reader-aids/ecfr-developer-resources/rest-api-interactive-documentation)); eCFR lags the Federal Register by one to two business days, and today's date can 404 on versioner endpoints (third-party note, [ecfr-sdk README](https://cdn.jsdelivr.net/npm/@us-legal-tools/ecfr-sdk@0.8.2/README.md), unverified on the official page) | Point-in-time quotes for 8 CFR 214.2(f). Pin dates, as sources.yaml already says |
| CourtListener | REST v4 alerts and docket alerts, with webhooks "sent in real time" when a docket changes ([CourtListener alerts](https://www.courtlistener.com/help/api/rest/alerts/), [webhooks](https://www.courtlistener.com/help/api/webhooks/)) | Litigated rules (D1, D65): subscribe to each docket that affects a pack, so an injunction or vacatur reaches the pipeline without polling |
| Regulations.gov | API v4 for documents, dockets and comments; API key required ([GSA Regulations.gov API](https://open.gsa.gov/api/regulationsgov/)) | Comment periods and docket status for proposed rules |
| USCIS, ICE/SEVP, Study in the States, State, DOL | HTML pages; text diff | Guidance and process pages; tagged `guidance` |
| Schools (100, D24) | ISSS pages; snapshot plus last-checked day (D3) | `school` tag records |
| USCIS case status | USCIS has a developer portal with a Case Status API that "provides case status information to USCIS customers and their representatives"; production access needs a demo and USCIS approval ([USCIS developer APIs](https://developer.uscis.gov/apis), [getting started](https://developer.uscis.gov/get-started/introduction)). Eligibility of a consumer app is unverified | See 7.4 |

Engineering practices for this pipeline: idempotent fetchers; every run writes a lineage record (source, snapshot hash, parser version, diff, outcome); parsers have fixture tests from saved snapshots; a dead-letter queue for anything that fails to parse; backfill by replaying snapshots. All of it touches only public data, so it can be observed and measured without limits.

### 7.4 USCIS status, inside the rules

The founder wants status tracking. Two designs:
- **Device-side lookup**: the receipt number never leaves the device except to USCIS. If USCIS grants a consumer app production keys, the call should still be made so Duly's server does not learn receipt numbers; a key embedded in an app is extractable, so this likely needs a thin relay that forwards without logging (a trade-off for the founder, decision U1).
- **Manual with a prompt**: the student checks the USCIS page and records what it says; a Loop asks every N days while a case is pending (D66 already sets 30 days for cap-gap). This works today and keeps the server blind.
Recommend: manual with prompts now; apply for API access and decide U1 when USCIS answers.

---

## 8. Notifications and the follow-up scheduler

### 8.1 Where the schedule is computed

On the device (D73), from the `schedule` projection: every Loop step with a due day, every engine item with a reminder rule, every document expiry. The student's morning in their own zone (D33). Calendar export (.ics with a stable id per item, VALUE.md) comes from the same projection.

### 8.2 Platform limits that shape the design

| Platform | Limit | Design answer |
|---|---|---|
| iOS | An app can have 64 pending local notification requests; the system keeps the soonest 64 and discards the rest ([Apple Developer Forums](https://developer.apple.com/forums/thread/811171), [another thread](https://developer.apple.com/forums/thread/765490)) | Schedule only the nearest 50, keep a buffer; re-plan on every app open, every sync and every background refresh. Group same-day items into one morning notification (also VALUE.md's "one morning reminder") |
| iOS background | Background pushes and refresh are best-effort and throttled (Apple's page did not render for me; unverified wording) | Never rely on a background wake to deliver a dated reminder; dated reminders are always pre-scheduled local notifications |
| Android 14+ | `SCHEDULE_EXACT_ALARM` is denied by default for new installs; `USE_EXACT_ALARM` is limited by Play policy to alarm, timer and calendar apps ([Android 14 behavior changes](https://developer.android.com/about/versions/14/behavior-changes-all); policy summary at [TestersWiz](https://testerswiz.com/android-permissions/exact-alarms)) | A morning reminder does not need minute precision. Use inexact alarms or WorkManager with a window, and say "in the morning", not a time |
| Desktop | Electron notifications only while the app or its tray helper runs | Login item for the tray helper (opt-in), plus the .ics file as the dependable channel |

### 8.3 Server's role

- **Wake-up push with no content**: when a new pack or Playbook version is published, the server sends a content-free push ("new library version") so devices fetch, recompute and re-plan. It knows nothing about who is affected.
- **Law-update email (D22)**: public content sent to everyone who opted in to updates for a category; to keep the server blind to categories, either send each update to all update subscribers with "Shown because" computed on the device, or let the student pick categories knowing the server then holds that choice. Founder decision N1 (recommend: categories are coarse and public, such as "F-1 students", and stored).
- **Dated reminder email**: conflicts with D73, because email needs the server to know a date and a title. VALUE.md promised it with only date and title in the message. Options: (a) no dated email, push and calendar only; (b) opt-in "email my reminders", where the device uploads (send day, generic title) items that are deleted after sending, listed in the government request policy. Founder decision N2 (recommend (a) at launch; calendar covers people who live in email).

### 8.4 The follow-up scheduler is a Loop property

Every Loop step that waits has a `next_followup_on` computed by the Loop runner from Playbook settings and engine items. The device scheduler reads the projection. This is why follow-ups "happen every time": they are not a feature someone remembers to add, they are a required field of every waiting step, and a test fails if a Playbook has a waiting step with no follow-up.

Server-side scheduling (EventBridge Scheduler at $1.00 per million invocations after 14 million free per month, [EventBridge pricing](https://aws.amazon.com/eventbridge/pricing/); Step Functions Standard workflows can wait up to one year, [Step Functions quotas](https://docs.aws.amazon.com/step-functions/latest/dg/service-quotas.html)) is used only for public jobs: source watch runs, pack publication, digest emails. Not for student dates.

---

## 9. The assistant service

### 9.1 What it is

Not a chatbot. A **router into Playbooks**, plus a **phraser of public text**, plus the **boundary**. The founder's examples ("do you still have this job? no. what to do?") are Playbook graphs; the model's job is to land any free-form question in the right graph, and to fill gaps with sourced explanation.

```
question text (device)
  → on-device pre-checks: boundary classifier floor (assistant/boundary.py rules), PII strip of anything that looks like an id
  → router: deterministic patterns first; on-device model second (where available); Bedrock third
      output: { playbook_id, slots_from_question, confidence }  (no dates, no values)
  → device runs the Playbook with the engine (all numbers from the engine)
  → if no Playbook fits: Bedrock "explain" over the rule library (public text) → text with slot references
  → output validator (device and server): no Side B pattern, no number that is not a slot, every sentence has a source
  → fail → step-back card with drafted DSO email
```

### 9.2 Answers with slots, never values

The model writes text like: "With no new job, day {{item:opt.unemployment.day90}} would fall on {{date:opt.unemployment.day90}}." The device fills slots from the engine output. Consequences:
- R1 holds by construction: a model cannot state a date it never saw.
- R2 holds by construction: the prompt carries no document values and no personal dates.
- The validator can reject any digit in model text that is not inside a slot.
- **Cacheable**: an answer template for "what happens if my job ends on OPT" is the same for every student. Most templates can be generated offline in the pipeline, checked like an update, approved, and shipped with the Playbooks. Live model calls are only for routing questions the patterns miss and for rare new phrasings. This cuts both risk (reviewed text) and cost (section 15).

### 9.3 Where the model runs, and settings that matter

D27: Claude through Bedrock in Duly's AWS for v0. Current Bedrock facts the build must respect:
- Model providers have no access to the Bedrock deployment accounts, logs, prompts or completions ([Bedrock data protection](https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html)).
- Bedrock now has **data retention modes** per Region: `none` (zero retention), `default`, `aws_review` (retained up to 30 days and may be reviewed by AWS). Some newer Claude models require `aws_review` (the page names Claude Fable 5 and 5.1), and such models are unavailable when the mode is `none`. An SCP can deny setting any mode other than `none` across the organization ([Bedrock data retention](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html)). **Duly must set `none` by SCP and pick only models whose allowed modes include `none`**; otherwise student questions could sit 30 days in AWS storage. This is new since the D27 decision and should be added to DECISIONS.md.
- Cross-region inference: use a **US geographic** profile, never global; geographic profiles keep processing "within geographic boundaries"; CloudTrail records the region that served each request ([Bedrock cross-Region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html)). If cross-region inference is on, retained data (if any) is stored in the destination Region (data retention page above).
- Reach Bedrock through a VPC endpoint (AWS PrivateLink, listed in the data protection page).
- Guardrails: contextual grounding checks flag answers not grounded in the supplied passages; Automated Reasoning checks verify output against logical rules written as policy and are generally available in US West (Oregon) ([Guardrails](https://aws.amazon.com/bedrock/guardrails/), [Automated Reasoning GA](https://aws.amazon.com/about-aws/whats-new/2025/08/automated-reasoning-checks-amazon-bedrock-guardrails)). Both are a second layer behind Duly's own validator, never the only one.

On-device option: Apple's Foundation Models framework exposes a ~3B on-device model with guided generation into Swift types and tool calling ([Apple ML Research](https://machinelearning.apple.com/research/apple-foundation-models-2025-updates), [WWDC25 session](https://developer.apple.com/videos/play/wwdc2025/286/)). Guided generation into `{playbook_id, slots}` is a close fit for the router, and the question text would then never leave the phone. Android's equivalent (Gemini Nano) is unverified for this use. Recommendation: router tries on-device first where available.

### 9.4 Threats specific to the assistant

Mapped to the OWASP Top 10 for LLM applications 2025 ([OWASP GenAI](https://genai.owasp.org/llm-top-10/)):

| OWASP item | Duly answer |
|---|---|
| LLM01 Prompt injection | Document text never reaches a model (D60); law text is from allowlisted primary hosts; router output is a closed enum plus slots, so injected instructions cannot widen what happens |
| LLM02 Sensitive information disclosure | No personal values in prompts (9.2); retention mode `none`; no prompt logging |
| LLM05 Improper output handling | Output validator; no number outside slots; text rendered as text |
| LLM06 Excessive agency | The model has no tools that write; only the device writes events, after the student taps |
| LLM09 Misinformation | Reviewed templates; grounding check; boundary evals with a hidden part (BOUNDARY.md) |
| LLM10 Unbounded consumption | Per-account rate limits; App Attest / Play Integrity on the API (unverified details); cached templates |

### 9.5 Evals

- Boundary set (exists) plus drift conversations.
- Router set: real question phrasings (written by the team and from consenting testers, never harvested) → expected Playbook.
- Slot integrity: generated answers with every slot resolvable; zero literal digits.
- Regression on every model or prompt change; results stored with the model id and retention mode used.

---

## 10. Cloud infrastructure (AWS)

### 10.1 Accounts

AWS recommends several accounts as isolation boundaries from the start, with a security OU kept to the Control Tower security accounts ([Organizing your AWS environment](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/organizing-your-aws-environment.html)). For Duly:

| OU | Account | Holds |
|---|---|---|
| Root | Management | Billing, Organizations, SCPs only. No workloads |
| Security | Log archive | Organization CloudTrail, Config, S3 access logs; Object Lock |
| Security | Security tooling | GuardDuty, Security Hub, IAM Access Analyzer delegated admin |
| Workloads | prod-core | Accounts, devices, sync relay, backup objects, push, email |
| Workloads | prod-assistant | Bedrock router and phraser, nothing else |
| Workloads | prod-library | Public rule packs, Playbooks, updates; CDN origin |
| Pipeline | pipeline | Watchers, snapshots, drafting models on public text, Ops app backend |
| Workloads | staging, dev | Same shapes, synthetic data only |
| Sandbox | sandbox | Experiments, budget-capped |

SCPs: region lock to us-west-2 (plus the US inference profile Regions for prod-assistant), deny Bedrock retention modes other than `none`, deny disabling CloudTrail, deny public S3 except prod-library.

### 10.2 Network

- Private subnets for all compute; an Application Load Balancer with AWS WAF in front of the API.
- VPC endpoints for S3, KMS, Secrets Manager, Bedrock, CloudWatch, so app traffic to AWS never leaves the AWS network.
- No general internet egress from prod-core. The pipeline account is the only one that fetches the web, through an egress proxy that enforces the host allowlist in watch/sources.yaml (this is what `make ops-block-demo` shows locally).
- TLS 1.2 minimum, 1.3 preferred (Bedrock's own guidance on the data protection page).

### 10.3 Compute and data

| Piece | Service | Notes |
|---|---|---|
| API and sync relay | ECS on Fargate (Graviton) | Stateless; two tasks across two AZs minimum |
| Workers (email, push, pack publish) | Fargate or Lambda | Queue-driven (SQS) |
| Database | Aurora PostgreSQL Serverless v2 | Accounts, devices, sync index; scales to 0 ACU in non-prod; Serverless v2 lists $0.12 per ACU-hour (third-party summary, [usage.ai](https://www.usage.ai/blogs/aws/rds/aurora-serverless-v2/), check calculator) |
| Ciphertext objects | S3, versioning on, Block Public Access, SSE-KMS as a second layer (documents-1 section 12) | Random keys, padded sizes |
| Public library | S3 + CloudFront | Signed bundles (TUF metadata) |
| Snapshots and audit | S3 Object Lock | Pipeline and log archive |
| Keys | KMS, a handful of customer-managed keys per account | $1 per key per month plus $0.03 per 10,000 requests ([KMS pricing summary](https://cloudburn.io/blog/aws-kms-pricing), check [KMS FAQ](https://aws.amazon.com/kms/faqs/)). **Not one KMS key per student**: at 100k students that is about $100,000 a month and buys nothing, because the student's own key already protects the content |
| Assistant isolation (optional) | Nitro Enclaves: "no persistent storage, no interactive access, and no external networking", with KMS attestation ([Nitro Enclaves](https://aws.amazon.com/ec2/nitro/nitro-enclaves/)) | Only if a later decision lets personal values reach the assistant; not needed with slots |

### 10.4 Region and recovery

D16 is us-west-2. All prod data there. For recovery: S3 versioning plus a second copy of ciphertext in another US Region (cross-region replication) is cheap insurance and reveals nothing more, since it is ciphertext; Aurora snapshots copied to the same second Region. Founder decision C1 (recommend yes, us-east-2, for backups only).

### 10.5 Logging without personal data

Layer 1, by design: services log a fixed schema of fields (route template, status, latency, account hash with a rotating salt, device platform, error code). A test fails if any log call passes a field outside the schema. Request and response bodies are never logged (documents-1 already says this for backup routes). IP addresses: kept only in WAF and load balancer logs, with a short stated retention, listed in the government request policy.

Layer 2, safety net: CloudWatch Logs data protection policies detect and mask sensitive data at ingestion with managed and custom identifiers; unmasked viewing needs a separate IAM permission ([CloudWatch Logs data protection](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs//cloudwatch-logs-data-protection-policies.html)). Add custom identifiers for SEVIS ids (N followed by 10 digits; unverified format, to confirm from a primary source), USCIS receipt numbers and A-numbers.

The founder's compliance research notes that redaction tools miss a large share of PII in messy text, so redaction is harm reduction, not a guarantee; the control is not putting the data in logs at all (docs/research/founder/Duly compliance and system design.md).

### 10.6 Access

- People: IAM Identity Center with hardware keys; no IAM users; break-glass role with alarms.
- Ops app: Identity Center plus IP allowlist (D17) plus re-auth to publish; every action in the append-only audit log.
- CI: GitHub Actions assumes AWS roles through OIDC with short-lived tokens; trust policies pin `sub` to the repository and environment ([GitHub OIDC in AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)). No long-lived AWS keys in GitHub.

---

## 11. Observability

What is observed, and what is never observed:

| Observed | How |
|---|---|
| API and sync health: availability, latency, error rate per route, queue depth | Metrics with fixed labels; traces with an attribute allowlist (OpenTelemetry; attribute allowlisting is my recommendation, unverified as an OTel default) |
| Pipeline: sources reachable, days since last check per source, quotes still found, drafts waiting, time from detection to publish | Full detail; public data |
| Library: version served, signature verification failures reported by devices (counts only) | Aggregates |
| Device-side outcomes: reminders delivered on the planned day, engine runs that errored, Loop counts by state | Privacy-preserving aggregates only (section 13) |
| Never | Question text, facts, dates, document kinds, which update matched whom, per-student funnels |

SLOs to start with: sync relay 99.9 percent monthly; pack publication within 24 hours of founder approval; a source unreachable more than 3 checks alerts (updates-1); restore drill passes every release (documents-1 section 12).

Crash reports: no third-party SDK (threat model: "No third-party analytics or ad code in any client"). Use the platform's own aggregated crash reporting (App Store Connect, Play Console) and a self-hosted collector that receives stack traces with no user strings (unverified tooling choice).

---

## 12. CI and environments

| Stage | What runs | Exists today |
|---|---|---|
| Every PR | Gates 1 to 6 (make test), copy lint, boundary evals, mypy/ruff strict, TS strict, unit and property tests | Yes |
| Every PR (add) | Engine differential test: Python oracle vs the device engine over golden vectors | No |
| Every PR (add) | Event schema upcaster tests; Playbook lint (every waiting step has a follow-up; every number is a reference) | No |
| Every PR (add) | Dependency audit, SBOM, lockfile check; lanes cannot add dependencies (threat model) | Partly |
| Merge to main | Dated tag (D46); build artifacts once; sign them | Tags yes |
| Deploy to dev, then staging | IaC plan and apply through OIDC roles; smoke tests; synthetic accounts only | No |
| Staging soak | Restore drill from encrypted backup; pairing a second device; a pack publish and on-device recompute | No |
| Prod | Manual approval; progressive rollout of API; mobile releases through TestFlight and Play internal testing first | No |
| Library publish | Separate pipeline: signed, two approvals for date rules, TUF metadata | No |

IaC: AWS CDK (TypeScript) or Terraform; pick one and keep all accounts in code. The factory's lane rules (one agent, one lane, one PR; contract changes first) carry over unchanged.

---

## 13. Data science: measuring without reading private data

### 13.1 What can be measured freely

Everything about public data and the system itself: source change rates, false alarm rate of the watcher, time to publish, reviewer disagreement rate on drafts, eval pass rates, router accuracy on the eval set, API performance.

### 13.2 What needs privacy-preserving aggregation

Product questions the founder will ask ("do Loops close?", "do reminders arrive?", "which Playbooks are used?") involve student behaviour. Use the IETF Distributed Aggregation Protocol: each device splits its measurement into two encrypted shares sent to two non-colluding aggregators, and only the aggregate is revealed ([DAP draft, IETF PPM](https://datatracker.ietf.org/doc/draft-ietf-ppm-dap/)). ISRG's Divvi Up implements it and Mozilla uses it ([Divvi Up about](https://divviup.org/about/), [Divvi Up](https://divviup.org/)).

Starter metrics (each a count or histogram, reported weekly, no identifiers):

| Metric | Why |
|---|---|
| Loops opened and closed per Playbook; days to close (histogram) | The founder's "closed loop" in a number |
| Share of waiting steps whose follow-up fired on the planned day | Platform scheduling reliability (8.2) |
| "Can't tell yet" share and its top reasons (enum) | Where data is missing; where the engine needs rules |
| Fields corrected after the reader read them, per document kind | Reader accuracy without seeing documents |
| Router fell back to "no Playbook" | Which Playbooks to write next |

Rules: minimum aggregate size before a number is shown (for example 50 devices; a product setting); no metric that, combined with an account, identifies a status; publish the list of metrics in the privacy page. Do not optimise for engagement; Duly's goal metric is closed Loops and dates met, not time in app.

### 13.3 Feedback from students

An explicit "Send this to Duly" on any screen, showing exactly what is sent (text the student writes, app version, screen id), nothing attached automatically. Consenting testers can share a full anonymised record by export, by choice.

---

## 14. Machine learning: the document reader

- **Text recognition on device**: Google ML Kit Text Recognition v2 runs on device and supports Latin, Chinese, Devanagari, Japanese and Korean scripts ([ML Kit](https://developers.google.com/ml-kit/vision/text-recognition/v2)); Apple's Vision framework on iOS and macOS (documents-1 section 4 already plans the per-platform reader); Windows OCR API (unverified).
- **Passport and visa**: the machine-readable zone has a fixed format with check digits (ICAO Doc 9303, unverified citation here); parse it deterministically and use the check digits to catch misreads before asking the student to confirm.
- **Classification** (I-20, I-94, EAD, I-797, passport, visa): layout anchors and keyword rules first; a small on-device classifier only if rules fall short. Models ship signed with the library, like packs.
- **Training data**: never student documents. Use synthetic specimens built from published blank forms and sample images, plus documents testers knowingly contribute. Every field read stays `unconfirmed` until the student confirms (D55), so the reader's errors cost a tap, not a wrong date.
- **Measurement**: correction rate per field per kind via DAP (13.2); a fixed synthetic test set per release.

---

## 15. Cost at 1k, 10k and 100k students

### 15.1 Unit prices used

| Item | Price | Source |
|---|---|---|
| S3 Standard storage | $0.0265 per GB-month (as the fetched AWS page read for US West (Oregon); historically quoted lower, check) | [S3 pricing](https://aws.amazon.com/s3/pricing/) |
| S3 PUT / GET | $0.005 / $0.0004 per 1,000 | same |
| KMS | $1 per key-month; $0.03 per 10,000 requests after 20,000 free | [KMS pricing summary](https://cloudburn.io/blog/aws-kms-pricing) |
| SES | $0.10 per 1,000 emails | [SES pricing summary](https://sendops.dev/amazon-ses-pricing/) |
| EventBridge Scheduler | 14M free invocations, then $1 per million | [EventBridge pricing](https://aws.amazon.com/eventbridge/pricing/) |
| Aurora Serverless v2 | $0.12 per ACU-hour; 0.5 ACU always on is about $43.80 a month | [usage.ai summary](https://www.usage.ai/blogs/aws/rds/aurora-serverless-v2/) |
| Fargate | about $0.0466 per vCPU-hour and $0.0051 per GB-hour x86 (third-party, quoted for N. California; Oregon likely lower); Graviton about 20 percent less | [Sedai](https://sedai.io/blog/understanding-aws-fargate-features-pricing) |
| Bedrock Claude Haiku 4.5 | $1 / $5 per million input / output tokens (third-party; AWS's page did not list it when fetched) | [CloudForecast](https://www.cloudforecast.io/blog/aws-bedrock-pricing/) |
| Bedrock Claude Sonnet 4.5 | $3 / $15 per million | same |
| ALB, WAF, VPC interface endpoints, NAT, GuardDuty, Security Hub, Config, CloudWatch | Unverified; estimated as a block below | AWS Pricing Calculator |

### 15.2 Assumptions

- 60 percent of students turn on sync or backup; 300 MB of encrypted documents and log each, plus 20 percent for versions.
- 200 sync uploads and 1,000 downloads per student per month.
- Half of students are active in a month. With templates precomputed (9.2), 2 live model calls per active student per month, 4,000 input and 500 output tokens each. A pessimistic case: 10 live calls each on a Sonnet-class model.
- 6 law-update emails per month to every student.
- Fixed platform block (prod, staging, dev, security accounts, load balancer, WAF, endpoints, logging, security services, pipeline, ops): $600 to $950 a month at 1k, rising with API tasks and database size.

### 15.3 Monthly estimate

| Line | 1k | 10k | 100k |
|---|---|---|---|
| Fixed platform block | $600 to $950 | $700 to $1,100 | $1,000 to $1,600 |
| Extra API tasks and database capacity | $0 | $50 to $150 | $300 to $700 |
| S3 storage (216 GB / 2.2 TB / 21.6 TB) | $6 | $57 | $570 |
| S3 requests | $1 | $10 | $140 |
| Data transfer out (restores, new devices; unverified rate) | $2 | $20 | $200 |
| Email (6 per student) | $1 | $6 | $60 |
| Assistant, templates + Haiku (2 calls) | $7 | $65 | $650 |
| **Total, expected** | **about $620 to $970** | **about $910 to $1,410** | **about $2,900 to $3,900** |
| Per student per month | $0.62 to $0.97 | $0.09 to $0.14 | $0.03 to $0.04 |
| Pessimistic assistant (10 Sonnet-class calls per active student) | +$100 | +$975 | +$9,750 |

Readings:
- At 1k students the bill is the platform, not the students. Scale-to-zero for non-prod (Aurora at 0 ACU, Fargate tasks stopped off hours) is the main lever.
- At 100k the levers are the assistant design (templates and on-device routing make a 3x to 15x difference) and storage (padding steps and version retention).
- Pipeline model costs are small: public law text, a few hundred drafts a month (unverified volume).
- Not included: Apple and Google developer fees, domain, Stripe fees, people, counsel, penetration tests, a SOC 2 audit when needed.

---

## 16. Risk register

Likelihood and impact on a 1 to 5 scale, before mitigation. Owner is the role; "F" means the founder decides.

| # | Risk | L | I | Mitigation | Residual | Owner |
|---|---|---|---|---|---|---|
| 1 | A wrong date or count shown (D37) | 3 | 5 | Engine only; sourced rules; differential tests across engines; golden vectors per pack; "Can't tell yet" on any doubt | 2 x 5 | Engine |
| 2 | A false rule published (poisoned source, stolen Ops session, insider) | 2 | 5 | Allowlisted hosts; quote found in snapshot; two checks; founder approval with hardware key; offline signing; TUF rollback and freeze protection | 1 x 5 | Pipeline, F |
| 3 | A court order missed (litigated rule changes overnight) | 3 | 4 | CourtListener docket webhooks; 6-hour watch; stale regime goes to "Can't tell yet" (D65) | 2 x 3 | Pipeline |
| 4 | Assistant crosses the boundary (UPL exposure) | 3 | 5 | Router to Playbooks; slots; validator; hidden evals; drift conversations; doubt steps back | 1 x 5 | Assistant |
| 5 | Student data retained by the model host | 2 | 5 | Bedrock retention `none` enforced by SCP; models that allow `none` only; US geographic profile; no personal values in prompts | 1 x 3 | Cloud, F |
| 6 | Administrative subpoena for account data | 4 | 4 | Server holds email, device list, ciphertext, upload times only; published request policy; notify users unless barred; challenge overbroad requests. ICE has used administrative subpoenas on tech firms, and Google sent a Cornell student journalist's subscriber and financial data to ICE with no notice ([TechCrunch](https://techcrunch.com/2026/02/10/google-sent-personal-and-financial-information-of-student-journalist-to-ice/), [EFF](https://www.eff.org/deeplinks/2026/08/some-tech-companies-have-privately-pushed-back-ice-subpoenas-they-should-all-do)) | 3 x 2 | F, counsel |
| 7 | Compelled future logging | 2 | 4 | Architecture that cannot associate content with a person (ciphertext only, no category metadata); warrant canary is not recommended (unverified legal value) | 2 x 3 | F, counsel |
| 8 | Cloud breach | 2 | 4 | Ciphertext only; least privilege; no standing human access; GuardDuty; restore drills | 2 x 2 | Cloud |
| 9 | Credential stuffing or account takeover | 3 | 3 | Passkeys; MFA; breached-password check; vault still needs a device key or the recovery kit, so a login alone opens nothing | 2 x 2 | API |
| 10 | Student loses all devices and the recovery kit | 3 | 4 | Kit checked at setup; reminder to verify the kit yearly; second device pairing encouraged; honest words (documents-1) | 2 x 4 | Product |
| 11 | Sync bug corrupts or forks a record | 3 | 4 | Append-only log; server seq; signatures; rollback refusal; conflicts become questions; property tests; staging soak | 2 x 3 | Sync |
| 12 | Engine port diverges from the Python oracle | 3 | 5 | Differential tests block release; engine and pack versions shown with every result | 1 x 5 | Engine |
| 13 | Reminders not delivered (iOS 64 cap, Android exact alarm limits, desktop closed) | 4 | 3 | Nearest-50 scheduling and re-plan; morning windows; .ics calendar; in-app Loop list as the source of truth; measured via DAP | 2 x 3 | Mobile |
| 14 | Document reader misreads a date | 4 | 4 | Every field confirmed by the student; MRZ check digits; "checked against document" flag (D59) | 2 x 3 | ML |
| 15 | Third-party SDK leaks status (the Arity pattern in the founder's research) | 2 | 5 | No third-party analytics or ad SDKs; dependency review; network allowlist in the app (unverified enforcement per platform) | 1 x 5 | All |
| 16 | Supply-chain compromise of a dependency or build | 2 | 5 | Lockfiles; audits; SBOM; signed builds; OIDC CI with no static keys; lanes cannot add dependencies | 2 x 4 | CI |
| 17 | Web client served altered JavaScript | 2 | 5 | Vault off on web at launch (6.5); CSP, SRI, published hashes later | 1 x 3 | Web, F |
| 18 | Windows same-user malware reads the vault | 3 | 4 | Require Windows Hello for U (unverified); state the limit plainly | 3 x 3 | Desktop |
| 19 | USCIS API access denied or terms forbid consumer use | 3 | 2 | Manual status with prompts works without it | 3 x 1 | F |
| 20 | Cost runaway from the assistant | 2 | 3 | Templates; on-device routing; rate limits; budget alarms | 1 x 2 | Cloud |
| 21 | Privacy law exposure (Texas TDPSA has no threshold and treats immigration status as sensitive, per the founder's research) | 3 | 4 | Separate consent screen; equal-weight choices; deletion and export in app; data map published | 2 x 3 | F, counsel |
| 22 | Key person and bus factor (one founder, agent-built code) | 4 | 4 | Everything in code and docs; runbooks; external security review before launch | 3 x 3 | F |
| 23 | Rule pack and Playbook drift from the law over time | 3 | 4 | updates-1 re-checks every quote on a schedule; a missing quote makes rules stale and answers "Can't tell yet" | 2 x 3 | Pipeline |

---

## 17. Build order

Each step is usable on its own and keeps every rule above.

1. **Contracts first** (alone, per CLAUDE.md): event envelope and kinds; Loop and Playbook schemas; sync API in contracts/openapi.yaml; engine output additions (engine and pack version, slot ids).
2. **Event log on the desktop**: replace the case JSON with the log plus the `facts` projection; the engine contract is unchanged.
3. **Loops and the first five Playbooks**: job ended; file-by date; check-in; new I-20 version; DSO question waiting. Home becomes the open-Loop list.
4. **Engine port with the oracle** (Rust or TS) and golden vectors in CI.
5. **Accounts, pairing and sync** (prod-core account, passkeys, relay, restore drill). Phone app read and write.
6. **Updates publish half**: sign, TUF metadata, library bucket, on-device recompute, "For you".
7. **Assistant router**: patterns, then on-device model, then Bedrock with retention `none`; template generation in the pipeline.
8. **Privacy-preserving metrics** (DAP) and the public data map and request policy.
9. **External security review and penetration test**, then the first strangers.

---

## 18. Decisions for the founder

| # | Question | Recommendation |
|---|---|---|
| S1 | Sync on when a second device is added, or always opt-in | On when a second device is added, after the consent screen |
| W1 | Vault on the web at launch | No; web shows the account, updates and Playbooks; vault on phone and desktop |
| N1 | Update email by coarse category stored on the server, or to all subscribers | Coarse public categories stored |
| N2 | Dated reminder email (conflicts with D73) | Not at launch; push, in-app and calendar file |
| U1 | USCIS status: manual with prompts, or apply for the Case Status API and relay | Manual now; apply; decide when USCIS answers |
| C1 | A second US Region for ciphertext backups | Yes, us-east-2, backups only |
| E1 | Engine port language | Rust with UniFFI and WebAssembly; TS if Rust skills are not available |
| B1 | Bedrock retention mode `none` enforced by SCP, models that allow `none` only (new fact since D27) | Yes; record as a decision |
| A1 | Router on device first (Apple Foundation Models where present) | Yes |

---

## Sources

Product and platform patterns
- Ink & Switch, Local-first software: https://www.inkandswitch.com/essay/local-first/
- Event sourcing, Fowler talk notes: https://gist.github.com/xpepper/36beda855540b0c1dde6c4c417dafec9 ; overview: https://www.devx.com/technology/event-sourcing-explained-capturing-state-changes-at-scale/
- UniFFI: https://mozilla.github.io/uniffi-rs/latest/
- Automerge: https://automerge.org/ ; Keyhive: https://github.com/automerge/automerge-repo-keyhive

Encryption and identity
- 1Password security design: https://agilebits.github.io/security-design/apsk.html , https://agilebits.github.io/security-design/deepKeys.html , PDF https://1passwordstatic.com/files/security/1password-white-paper.pdf
- Bitwarden whitepaper: https://bitwarden.com/help/bitwarden-security-white-paper/ ; PRF: https://bitwarden.com/blog/prf-webauthn-and-its-role-in-passkeys/
- PRF warning summary (original unverified): https://lilting.ch/en/articles/passkeys-prf-extension-encryption-risk
- Ente architecture: https://ente.com/architecture/
- Apple ADP: https://support.apple.com/guide/security/advanced-data-protection-for-icloud-sec973254c5f/web ; https://support.apple.com/en-us/102651
- NIST SP 800-63B-4: https://pages.nist.gov/800-63-4/sp800-63b.html
- Electron safeStorage: https://www.electronjs.org/docs/latest/api/safe-storage
- OWASP MASVS: https://mas.owasp.org/MASVS/
- Meta Code Verify: https://engineering.fb.com/2022/03/10/security/code-verify/
- TUF: https://theupdateframework.io/

Law sources and data engineering
- Federal Register API: https://www.federalregister.gov/developers/api/v1 ; https://catalog.data.gov/dataset/federalregister-gov-and-api
- eCFR developer resources: https://www.ecfr.gov/reader-aids/ecfr-developer-resources/rest-api-interactive-documentation ; lag note: https://cdn.jsdelivr.net/npm/@us-legal-tools/ecfr-sdk@0.8.2/README.md
- CourtListener alerts and webhooks: https://www.courtlistener.com/help/api/rest/alerts/ , https://www.courtlistener.com/help/api/webhooks/
- Regulations.gov API: https://open.gsa.gov/api/regulationsgov/
- USCIS developer portal: https://developer.uscis.gov/apis , https://developer.uscis.gov/get-started/introduction

AWS
- Bedrock data protection: https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html
- Bedrock data retention modes: https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html
- Bedrock cross-Region inference: https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html
- Bedrock Guardrails: https://aws.amazon.com/bedrock/guardrails/ ; Automated Reasoning GA: https://aws.amazon.com/about-aws/whats-new/2025/08/automated-reasoning-checks-amazon-bedrock-guardrails
- Organizing your AWS environment: https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/organizing-your-aws-environment.html
- CloudWatch Logs data protection: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs//cloudwatch-logs-data-protection-policies.html
- Nitro Enclaves: https://aws.amazon.com/ec2/nitro/nitro-enclaves/
- Step Functions quotas: https://docs.aws.amazon.com/step-functions/latest/dg/service-quotas.html
- EventBridge pricing: https://aws.amazon.com/eventbridge/pricing/
- S3 pricing: https://aws.amazon.com/s3/pricing/
- KMS: https://aws.amazon.com/kms/faqs/ ; summary https://cloudburn.io/blog/aws-kms-pricing
- Aurora Serverless v2 summary: https://www.usage.ai/blogs/aws/rds/aurora-serverless-v2/
- Fargate summary: https://sedai.io/blog/understanding-aws-fargate-features-pricing
- SES summary: https://sendops.dev/amazon-ses-pricing/
- Bedrock model prices summary: https://www.cloudforecast.io/blog/aws-bedrock-pricing/
- GitHub Actions OIDC in AWS: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws

Mobile scheduling and ML
- iOS 64 pending notifications: https://developer.apple.com/forums/thread/811171 , https://developer.apple.com/forums/thread/765490
- Android 14 exact alarms: https://developer.android.com/about/versions/14/behavior-changes-all ; policy summary https://testerswiz.com/android-permissions/exact-alarms
- Apple Foundation Models: https://machinelearning.apple.com/research/apple-foundation-models-2025-updates , https://developer.apple.com/videos/play/wwdc2025/286/
- ML Kit text recognition v2: https://developers.google.com/ml-kit/vision/text-recognition/v2

AI safety and measurement
- OWASP Top 10 for LLM applications 2025: https://genai.owasp.org/llm-top-10/
- IETF DAP draft: https://datatracker.ietf.org/doc/draft-ietf-ppm-dap/ ; Divvi Up: https://divviup.org/about/ , https://divviup.org/

Threat context
- TechCrunch, Google and a Cornell student journalist: https://techcrunch.com/2026/02/10/google-sent-personal-and-financial-information-of-student-journalist-to-ice/
- EFF on ICE subpoenas: https://www.eff.org/deeplinks/2026/08/some-tech-companies-have-privately-pushed-back-ice-subpoenas-they-should-all-do
- Proton logging order (via founder research): https://techcrunch.com/2021/09/06/protonmail-logged-ip-address-of-french-activist-after-order-by-swiss-authorities

Unverified in this document (could not confirm from a primary page): Apple background push throttling wording; Android Keystore per-OEM behaviour; Windows Hello and Windows OCR API details; Gemini Nano for routing; App Attest and Play Integrity specifics; ICAO 9303 citation; SEVIS id format; eCFR "today 404" note (third-party); Federal Register public inspection lead time; Fargate, Aurora and Bedrock model prices (third-party pages); ALB, WAF, VPC endpoint, NAT, data transfer and security-service prices; the original source of the PRF warning; USCIS Case Status API eligibility for a consumer app.
