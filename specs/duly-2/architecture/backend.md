# Duly backend architecture

Status: research and recommendation, 2026-10-01. Part of the architecture set under specs/duly-2/architecture/. It builds on specs/duly-2/BLUEPRINT.md sections 4 to 8, research-system.md and research-security.md, and on DECISIONS.md rows D54, D55, D60, D73, D75 to D79. Where this file and DECISIONS.md disagree, DECISIONS.md wins. Every external claim has a link; anything not checked against a primary source in this pass is marked **(unverified)**. Prices are list prices seen on 2026-10-01 and must be checked in the AWS Pricing Calculator before any budget is set.

Scope: API design, how the services are split, the encrypted sync protocol, the database, object storage and keys, queues and jobs, the rules publisher, notifications, the Ask gateway to Bedrock, and where backend logic stops and the engine starts. Authentication, CI/CD, observability, hosting and the clients have their own files in this set; they are touched here only where the backend depends on them.

---

## 0. Summary

| Question | Recommendation | Main reason |
|---|---|---|
| What is the backend? | A **relay, a library and a gateway**. It never computes a date, never holds a readable record, never runs the engine in production | BLUEPRINT 6, D73, R1 to R4 in research-system 1 |
| API style | **REST over HTTPS with an OpenAPI 3.1 contract** in contracts/openapi.yaml, contract first; generated clients for Swift, Kotlin and TypeScript | Four platforms in three languages (D78); the server's data is opaque ciphertext, so GraphQL has nothing to select; tRPC is TypeScript only |
| Versioning | `/v1` in the path, additive changes only inside a major version, a CI gate that fails on breaking diffs, `Deprecation` and `Sunset` headers, a server-enforced minimum client version | Installed apps lag; the only clients are Duly's own |
| Idempotency | `Idempotency-Key` header on every non-idempotent POST, stored in Postgres; sync uses natural keys (device id plus device counter) instead | IETF httpapi draft; Stripe; Brandur's Postgres design |
| Service split | **One modular monolith** (api and worker from one image) in prod-core, plus two separate deployables in their own AWS accounts: the **Ask gateway** and the **pipeline/publisher**. The library is static files, not a service | Small team; Fowler's MonolithFirst; account isolation where trust differs |
| Sync | Per-device hash-chained, signed, encrypted event batches; the server assigns a per-account sequence and relays. **Merge is set union; concurrent writes to one fact become a question to the student**, never last-writer-wins | PRINCIPLES 2; Ink & Switch; Kleppmann's BFT CRDT hash graph; SUNDR fork consistency |
| Database | **PostgreSQL** (RDS for PostgreSQL Multi-AZ, small Graviton instance) holding accounts, devices, signed headers, key wraps, the sync index and small log batches; row-level security as a second layer | Already the only server database (CLAUDE.md); small, predictable load |
| Object storage | S3 for document ciphertext and checkpoints, uploaded by presigned URL, `If-None-Match: *` so nothing is overwritten, SHA-256 checksums, versioning, SSE-KMS with S3 Bucket Keys as a second layer, replicated to us-east-2 | Client-side encryption is the real control; S3 adds durability and integrity |
| Keys on the server | A handful of KMS keys per account and purpose; **no KMS key per student** | The student's own key protects content; KMS keys cost $1 a month each |
| Queues and jobs | Postgres job table with a **transactional outbox** for v1 (Procrastinate or equivalent); SQS only for cross-account hand-off and fan-out; EventBridge Scheduler only for public cron jobs | Fewer moving parts; exactly the jobs that touch no student dates |
| Ask | A stateless gateway in a separate account calls Claude on Bedrock with retention mode `none` enforced by SCP, invocation logging off, US geographic inference, a closed tool schema as output (template id plus slot names, never values) | D79, D60, R1 |
| Engine boundary | Engine runs on the device (port) and in the pipeline (Python oracle for golden vectors). The server process does not import engine/ in a production build | BLUEPRINT 6, gate on `/v1/compute*` |

---

## 1. What the backend is, and what it is not

The device is the computer; the cloud is a mailbox, a library and, since D79, a narrow gateway to a model (research-system 1; Ink & Switch, "local-first apps can use end-to-end encryption so that any servers that store a copy of your files only hold encrypted data that they cannot read": https://www.inkandswitch.com/essay/local-first/).

| Zone | AWS account | Holds | Never holds |
|---|---|---|---|
| Relay (prod-core) | prod | Accounts, passkey public keys, the signed device list, the signed vault header, key wraps, encrypted log batches, encrypted files, push tokens, upload times | Any readable fact, date, document kind, school, nationality, SEVIS ID, question text |
| Library (prod-library) | prod (static bucket and CDN) | Signed public bundles: rule packs, Playbooks, templates, school pages, TUF metadata | Anything about who fetched what (CDN path logs off, BLUEPRINT 5.5) |
| Ask gateway (prod-assistant) | separate account | Nothing at rest. In memory for one request: question text and public catalog | Document values (D60), names, identifiers, engine dates |
| Pipeline | pipeline | Public law snapshots (Object Lock), drafts, approvals, signing workflow, the Python engine for golden vectors | Any student data |

**Reconciling the newest decisions.** BLUEPRINT 4.2 says v1 has no generative model at runtime and that a cloud model needs a founder ruling. D79 (2026-10-01) is that ruling: Ask reasons with Claude on Bedrock in Duly's own account, the engine still supplies every date and count, BOUNDARY rules apply. D60 still holds: no value from a document reaches any model. This file therefore designs the gateway with the BLUEPRINT 4.2 safeguards (retention `none` by SCP, values scrubbed on device, output as template ids) and keeps the on-device router as the first step and the fallback. The D79 prototype helper that sends the fictional sample student through the founder's Claude Code login is a local prototype tool only and has no place in the production backend.

---

## 2. What the server is allowed to know

This is the inventory the government request policy and retention table (BLUEPRINT 5.5) will be built from. A field not in this table is not stored. A test that inspects the migration files fails if a column is added without a row here.

| Data | Why it exists | Form | Kept |
|---|---|---|---|
| Account id | Primary key | Random 128-bit | Until deletion |
| Email | Optional: law-update email, security notices. Relay addresses welcome | Plain text, unique | Until removed or account deleted |
| Passkey credentials | Sign in | Credential id, public key, sign count, transports | Until removed |
| Device rows | Routing, revocation | Device id (random), public keys (DK wrap, SK_dev), platform family, created day, last-seen day | Until removed, then 30 days tombstone (founder sets) |
| Signed device list and vault header | Clients verify membership and epoch | Opaque signed blob plus epoch number | Current plus history (needed for audit by clients) |
| Key wraps | Pairing and recovery | K_vault under R, pending pairing wraps | Pairing wraps deleted on use or after 15 minutes |
| Sync batches | Relay between devices | Device id, device counter, previous hash, epoch, padded size, upload instant, ciphertext | Until compacted into a checkpoint all devices have acknowledged, or deletion |
| Checkpoints | New-device bootstrap, fork detection | Ciphertext in S3, signer device, epoch | Latest two per account |
| Blobs (documents) | Backup and sync of files | Random object key, padded size, SHA-256 of ciphertext, created instant | Until removed by the student, then the versioning window |
| Push tokens | Content-free wake-ups | APNs or FCM token per device | Until device removed or token rejected |
| Idempotency records | Safe retries | Key, request fingerprint, response | 72 hours |
| Update subscriptions | Law-update email (D22) | Coarse public category or "all" (research-system 8.3, decision N1) | Until unsubscribed |
| WAF and load balancer logs | Abuse defence | Client IP, path template, status | 7 days (BLUEPRINT 6) |

What remains visible even so, and is stated in the privacy page: that an account exists, how many devices it has and of which platform family, when each device syncs, roughly how much data it stores (padded), and its IP address for 7 days. Ask adds one more: the text of a question and when it was asked, in memory during the request (section 11). Nothing in the server can tell which visa, school or deadline a student has.

---

## 3. Service split

### 3.1 Recommendation: one modular monolith plus two isolated deployables

Microservices buy independent scaling and independent teams at the price of network calls, distributed failures and more deploy pipelines. Duly has neither the load nor the team for that. Martin Fowler: "you shouldn't start a new project with microservices, even if you're sure your application will be big enough to make it worthwhile" (https://martinfowler.com/bliki/MonolithFirst.html). Shopify's answer at scale was a modular monolith, "a system where all of the code powers a single application and there are strictly enforced boundaries between different domains", with tooling that fails CI on boundary violations (https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity).

The boundary that matters for Duly is not code size but **trust**. So the split follows trust:

| Deployable | Where | Modules inside | Why separate |
|---|---|---|---|
| `api` (FastAPI, Python 3.12) | prod-core, ECS on Fargate, two tasks across two AZs | `identity` (accounts, passkeys, sessions), `devices` (enrolment, signed list, wraps), `sync` (batches, checkpoints), `blobs` (upload slots, commits, quotas), `notify` (token registry), `library_index` (pointer to current bundle, signed time) | One trust level: sees ciphertext and metadata only |
| `worker` | prod-core, same image, different command | Outbox drain, push sender, email sender, garbage collection, account deletion, canary restore | Same trust level; separated only so a slow job never blocks a request |
| `ask-gateway` | prod-assistant account, Lambda or a small Fargate service | Token check, rate limit, prompt assembly from the public catalog, Bedrock call, output schema check | Sees question text, the most sensitive thing any server sees; its own account, its own SCPs, no database access to prod-core |
| `pipeline` and `ops` | pipeline account | Watchers, snapshots, drafting on public text, checks, founder approval, TUF signing, publishing | The only zone that fetches the web; touches no student |
| Library | S3 plus CloudFront | Static signed files | No compute at all, so nothing to compromise at request time |

### 3.2 Keeping the monolith modular

- One Python package per module under `api/`, each with a public `service.py` and private internals; modules talk through those functions only, never through each other's tables.
- Enforce imports in CI with a contract checker (for example import-linter, https://github.com/seddonym/import-linter, fit for this repo **unverified**). Two rules from day one: no module imports `engine` in the production build; only `sync` and `blobs` touch S3.
- Each module owns its tables; a cross-module read goes through the owning module's function. This keeps a later split cheap if one module (most likely `sync`) needs to scale alone.
- The current code (api/main.py, api/worker.py, FastAPI, SQLAlchemy 2, psycopg 3) already fits this shape. Keep Python on the server: the team already gates Python with ruff and mypy strict, and nothing in the relay is CPU-heavy.

---

## 4. API design

### 4.1 REST with OpenAPI, compared

| Option | Fit for Duly | Notes |
|---|---|---|
| **REST + OpenAPI 3.1** | **Best** | Codegen for every client: Apple's swift-openapi-generator "Works with OpenAPI Specification versions 3.0 and 3.1" (https://github.com/apple/swift-openapi-generator); openapi-generator has a Kotlin Multiplatform client on Ktor with kotlinx serialization (https://openapi-generator.tech/docs/generators/kotlin/); openapi-typescript gives "zero runtime cost" types for Electron and web (https://openapi-ts.dev/). Plain HTTP caching works for the library on a CDN. AWS WAF rules understand it. Property tests come from the schema (Schemathesis, https://schemathesis.readthedocs.io/en/stable/) |
| GraphQL | Poor | Its strength is choosing fields across a graph; Duly's server holds opaque blobs with no fields to choose. It adds risks OWASP lists: unbounded depth and amount "may lead to a DoS", batching attacks that "only appear to be one single request" to WAFs, introspection (https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html) |
| tRPC | Ruled out | Shares types through TypeScript inference with no schema (https://trpc.io/). Swift and Kotlin clients cannot use it, and D78 requires both |
| gRPC | Possible, not worth it | Good binary framing for mobile, but browsers need a gRPC-Web proxy and the library would lose plain CDN caching (general knowledge, **unverified** in this pass) |

### 4.2 Conventions

- **Contract first.** contracts/openapi.yaml is the source of truth (a contract change lands first and alone, CLAUDE.md). FastAPI also generates a schema from the Pydantic models (https://fastapi.tiangolo.com/how-to/separate-openapi-schemas/); a CI test compares the generated schema with the contract and fails on any difference, so the code cannot drift from the contract.
- **Errors** use RFC 9457 problem details, `application/problem+json`, with `type`, `title`, `status`, `detail`, `instance` (https://www.rfc-editor.org/rfc/rfc9457.html). `detail` never echoes request content. Stable `type` URIs let clients map an error to product copy ("Can't tell yet: update Duly").
- **Ciphertext bodies** are `application/octet-stream` with a small versioned binary header defined in contracts/ (section 5.2), not base64 in JSON, which costs a third more bytes. The header parser is fuzzed (BLUEPRINT 6, CI).
- **Pagination** by opaque cursor (the last `account_seq` seen), never by offset.
- **Concurrency on single resources** (vault header, device list) uses `ETag` and `If-Match`, returning 412 on a stale write, so two devices cannot both publish epoch 7.
- **Request size limits** at the load balancer and per route; uploads over a few hundred KiB go straight to S3 by presigned URL, never through the API process.
- **Time.** Every response carries `Date`. The device clock check (BLUEPRINT 6: "device clock checked against signed time") needs a signed value, so `GET /v1/time` returns `{now, nonce}` signed by an online key whose public half ships in the bundle. Roughtime is the general model for this (**unverified**, not checked in this pass).

### 4.3 Versioning

Stripe pins each account to a dated version and translates old versions with "version change modules", which makes "old versions add only minimal maintenance cost" (https://stripe.com/blog/api-versioning). That design serves thousands of outside integrators. Duly has exactly its own clients, but installed apps update late, so the pressure is the same in a smaller form. Recommendation:

1. A major version in the path, `/v1`. Inside it, only additive changes: new optional fields, new endpoints, new enum values that old clients are written to ignore.
2. CI runs a breaking-change diff of the contract against the main branch (oasdiff, "Command-line tool to compare and detect breaking changes in OpenAPI specs", https://github.com/oasdiff/oasdiff) and fails on any breaking change inside `/v1`.
3. Every request sends `Duly-Client: <platform>/<version>`. The server keeps a minimum supported version per platform; below it, a problem response of type `client-too-old`, which the app shows as "Can't tell yet: update Duly" (BLUEPRINT 6). Before removing anything, responses carry `Deprecation` (RFC 9745, https://www.rfc-editor.org/rfc/rfc9745.html) and `Sunset` (RFC 8594) headers.
4. A support window the founder sets (proposal: every client released in the last 12 months).
5. **Ciphertext formats are versioned separately** (algorithm id and version in every envelope, BLUEPRINT 5.2). API versions can retire; a ciphertext format must stay readable for as long as data written with it exists, or be re-encrypted by a device.

### 4.4 Idempotency

Mobile networks drop responses after the server has acted. Every non-idempotent POST that is not a sync push carries an `Idempotency-Key` (a client UUID). The IETF httpapi draft (version 07, now expired but the reference design) says: reuse with a different payload gets **422**, a retry while the first is still in progress gets **409**, a missing key on an endpoint that requires one gets **400**, and the server "SHOULD define such expiration policy and publish it" (https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.html). Stripe's write-up gives the client side: retry with exponential backoff plus "random 'jitter'" (https://stripe.com/blog/idempotency).

Implementation follows Brandur's Postgres design: a table keyed by `(account_id, idempotency_key)` with a request fingerprint, `locked_at`, recovery point and stored response; "atomic phases" between external calls; keys recycled after about 24 to 72 hours (https://brandur.org/idempotency-keys). Duly keeps 72 hours.

**Sync does not need the table.** A batch's natural key, `(device_id, device_counter)`, is unique; a retried push of the same batch returns the `account_seq` it already got, and a different batch at the same counter is a fork (section 5.4). This is the same idea as Replicache's per-client `lastMutationID`: the server "tracks the highest confirmed mutation id per client" so a mutation applies once (https://doc.replicache.dev/concepts/how-it-works).

### 4.5 Endpoint sketch for `/v1` (to become a contract PR)

| Area | Endpoints | Notes |
|---|---|---|
| Identity | `POST /v1/accounts`, `POST /v1/passkeys/register/{begin,finish}`, `POST /v1/sessions/{begin,finish}`, `DELETE /v1/sessions/current`, `DELETE /v1/accounts/current` | Passkeys only (BLUEPRINT 5.3). Server side WebAuthn with py_webauthn, which handles registration and authentication verification (https://github.com/duo-labs/py_webauthn) |
| Devices | `GET/PUT /v1/device-list` (signed blob, `If-Match`), `GET/PUT /v1/vault-header`, `POST /v1/pairings`, `GET/POST /v1/pairings/{id}/wrap`, `DELETE /v1/devices/{id}` | The server stores and serves; clients verify signatures and epochs |
| Sync | `POST /v1/sync/batches`, `GET /v1/sync/batches?after=&limit=`, `PUT /v1/sync/checkpoints/{epoch}`, `GET /v1/sync/checkpoints/latest`, `POST /v1/sync/heads` | Section 5 |
| Blobs | `POST /v1/blobs` (returns id and presigned upload), `POST /v1/blobs/{id}/commit`, `GET /v1/blobs/{id}/download-url`, `DELETE /v1/blobs/{id}` | Section 7 |
| Notify | `PUT /v1/devices/{id}/push-token`, `PUT /v1/update-subscriptions` | Section 10 |
| Library | `GET /v1/time`; everything else is static at the CDN (`/metadata/timestamp.json` and so on) | Public, no auth (BLUEPRINT 5.5) |
| Ask | `POST /ask/v1/route` on the gateway's own host | Section 11 |
| Dev only | `/v1/compute`, `/v1/compute/f1` | Never in a production build (BLUEPRINT 6 gate) |

---

## 5. The encrypted sync protocol

### 5.1 Requirements

From BLUEPRINT 5.4 and PRINCIPLES 2: each device writes its own hash-chained, signed log; the record is a deterministic function of the **set** of events, not their arrival order; conflicting facts become a question, never a silent merge; a server that shows two devices different histories is detected; a new device starts from a signed checkpoint; uploads are padded; revocation moves to a new epoch.

### 5.2 Two layers: outer frame and inner events

**Outer frame** (readable by the server, so it carries nothing about the student):

| Field | Purpose |
|---|---|
| `format` | Frame version and algorithm id |
| `device_id` | Random id of the writer |
| `device_counter` | 1, 2, 3 ... per device, no gaps |
| `prev_hash` | Hash of this device's previous frame (hash chain) |
| `epoch` | Vault epoch the batch was encrypted under |
| `batch_id` | Random UUID (not time-ordered) |
| `ciphertext` | AEAD output under a key derived from K_sync, padded to a size step; associated data binds account id, device id, counter, epoch, batch id |
| `signature` | SK_dev signature over everything above |

**Inner events** (only devices can read): the envelope in research-system 3.2 (`id` as UUIDv7, `hlc`, `recorded_at`, `effective_on`, `kind`, `subject`, `body`, `provenance`, `confirmation`, `supersedes`, `schema`) plus one addition, **`deps`**: the latest counter this device had seen from each other device when it wrote the event. UUIDv7 carries a creation time ("time-ordered value field derived from the ... Unix Epoch timestamp", RFC 9562, https://www.rfc-editor.org/rfc/rfc9562.html), which is fine inside the ciphertext; the outer `batch_id` is random so it leaks nothing more than the upload instant the server already sees.

Why `deps` and not only the hybrid logical clock: an HLC "captures the causality relationship like logical clocks" and stays close to physical time (Kulkarni et al., https://cse.buffalo.edu/tech-reports/2014-04.pdf), so it is the right key for display order and tie-breaking. But a timestamp order cannot by itself tell "B saw A and replaced it" from "A and B were written at the same time without seeing each other". The dependency vector can, and that difference decides whether two values are a correction or a conflict.

### 5.3 Push and pull

**Push** (`POST /v1/sync/batches`):
1. Authenticate the session; check the device is on the current signed list and the batch epoch is current. (Devices enforce this too; the server check only fails early.)
2. If `(device_id, device_counter)` exists with the same hash, return the stored `account_seq` (idempotent retry). If it exists with a different hash, reject with a `fork` problem and raise a security alarm.
3. Check `device_counter = last + 1` and `prev_hash` matches the stored head; verify the signature with the device's public key; check the padded size is an allowed step and under the per-account quota.
4. In one transaction: `UPDATE accounts SET seq = seq + 1 WHERE id = $1 RETURNING seq` (the row lock serialises writers per account without a global lock), insert the batch row with its ciphertext, insert an outbox row "wake other devices". Commit.
5. The worker drains the outbox and sends a content-free push to the account's other devices.

Batches are small (events are kilobytes), so **store batch ciphertext in Postgres (`bytea`) up to a cap** (proposal 256 KiB padded) and only checkpoints and files in S3. This differs from research-system 6.3 (S3 for every batch) on purpose: one transaction makes the sequence, the row and the outbox atomic, there are no orphan objects to sweep, and the volume is tiny (1,000 students with 1 MiB of history each is 1 GiB). Revisit if the table passes tens of GiB.

**Pull** (`GET /v1/sync/batches?after=<seq>`): returns frames in `account_seq` order with a cursor. The client verifies each frame's signature against the signed device list, checks each device's counters have no gaps and each `prev_hash` links, refuses any `account_seq` lower than one it has seen (rollback), decrypts and applies. Content-free "poke" then pull is also the Replicache pattern: "The poke doesn't contain any actual data. All the poke does is tell the client that it should pull again soon" (https://doc.replicache.dev/concepts/how-it-works).

**Desktop and web** do not depend on push: they pull on launch, on focus, and on a backoff timer, with `ETag`/`If-None-Match` on a cheap "head" endpoint so an idle check is a 304.

### 5.4 Detecting a lying server

The server can reorder (harmless: the record is order-independent), but it could **omit** frames or show different devices different histories. Defence, in layers:

- **Per-device hash chains.** A device's frames link by `prev_hash`, so the server cannot drop a frame from the middle without a visible gap. Kleppmann shows the general form: a hash graph of operations makes CRDT replicas Byzantine fault tolerant, so a faulty relay cannot forge or silently alter history (https://martin.kleppmann.com/papers/bft-crdt-papoc22.pdf).
- **Signed heads.** On each sync a device uploads a signed statement of the heads it holds, `{device_id: (counter, hash)}` for every device (`POST /v1/sync/heads`). Other devices compare. Two different hashes for the same `(device, counter)` is a proven fork. This is SUNDR's fork consistency: a server can split clients into forks but cannot later join them without detection (Li, Krohn, Mazières, Shasha, OSDI 2004, https://www.usenix.org/legacy/event/osdi04/tech/full_papers/li_j/li_j.pdf).
- **Withholding.** If a device's signed heads say device B reached counter 12 and another device is still served only up to 10 after a threshold (proposal 24 hours), that device cannot tell delay from withholding; it shows Can't tell yet and opens a loop, as BLUEPRINT 5.4 requires.
- **Device list transparency.** The signed device list is the root of all of this; a compelled server must not be able to add a reader. Clients refuse any list not signed by SK_vault_sign with a higher epoch. WhatsApp's key transparency is the larger-scale version ("an append-only AKD of public keys mapped to user accounts", https://engineering.fb.com/2023/04/13/security/whatsapp-key-transparency/); Duly does not need a public log at launch because the signer is the student's own vault key.

### 5.5 Conflicts: CRDT, last-writer-wins, or a question

| Approach | What happens when phone says job ended Oct 31 and laptop says Nov 1, written without seeing each other | Fit |
|---|---|---|
| Last-writer-wins (Figma's choice: servers keep "the latest value that any client has sent for a given property", https://www.figma.com/blog/how-figmas-multiplayer-technology-works/) | One date silently disappears | **Wrong for legal facts.** A dropped date can move a deadline |
| General CRDT library (Automerge) | Keeps both; "CRDTs keep track of the conflicting values, and leave it to be resolved by the application or the user" (Ink & Switch) | Right semantics, but a large dependency for a record that is a log of small typed events |
| **Event set plus multi-value facts (recommended)** | Both events kept; the `facts` projection marks the field `conflicting`; every verdict using it is `cannot_tell`; a Loop asks the student which is right; the answer is a new event whose `deps` include both | Same semantics as a CRDT multi-value register, implemented in a few hundred lines of deterministic projection code and covered by property tests |

Rules for the projection:
- Grow-only set of events; deduplicate by event id.
- For each single-valued fact, the current value is the set of writes not superseded by a write that causally follows them (by `deps`). One survivor: that value. Several: `conflicting`.
- An explicit `supersedes` only counts if the superseding event causally follows the superseded one.
- Removal is a tombstone event, never a delete.
- Last-writer-wins by HLC is allowed only for **device preferences that carry no legal meaning** (theme, a collapsed section), listed in the contract.
- Ink & Switch report that in practice "users surprisingly rarely encounter conflicts" (same essay), so the question to the student will be rare.

Property tests (BLUEPRINT 6): shuffle (any order of the same set gives the same projection), duplicate delivery, partition then heal, fork injection, rollback injection, and revocation (a revoked device's saved keys open nothing after the epoch).

### 5.6 Checkpoints, compaction, padding, revocation

- A **checkpoint** is the full event set at a cut, compressed, encrypted under K_sync, signed by SK_vault_sign with the heads it covers. It goes to S3. Nothing is dropped from history; the footprint (BLUEPRINT 3.4) needs every event.
- When every active device has acknowledged a checkpoint (via signed heads), the server deletes batch rows it covers. This bounds both storage and the metadata the server keeps about sync timing.
- **Padding** to size steps (BLUEPRINT 5.4). Simple powers of two waste up to half; the Padmé scheme from the PURBs paper limits overhead to about 12% while leaking few bits of the length (Nikitin et al., PETS 2019, **unverified** in this pass). Pick one in the contract; the remaining timing leak is stated.
- **Revocation**: a new epoch (BLUEPRINT 5.3) means a new vault header, new device list, new K_sync. The server rejects new batches with an old epoch after the new header lands. Devices refuse them too.

---

## 6. Database

### 6.1 Engine choice

| Option | For | Against |
|---|---|---|
| **RDS for PostgreSQL, Multi-AZ (one standby), small Graviton instance** | Cheapest predictable floor; plain Postgres; matches BLUEPRINT 6 ("Small Multi-AZ RDS Postgres") and local dev | Manual instance sizing; failover slower than Aurora (**unverified** numbers) |
| Aurora PostgreSQL Serverless v2 | Scales with load; since November 2024 it can scale to 0 ACUs and "automatically pause after a period of inactivity" (https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-aurora-serverless-v2-scaling-zero-capacity/); $0.12 per ACU-hour Standard, $0.156 I/O-Optimized, storage $0.10 per GB-month plus $0.20 per million I/O on Standard (US East figures, https://aws.amazon.com/rds/aurora/pricing/) | A production writer cannot sensibly pause (first connection waits for resume); two instances at 0.5 ACU minimum is about $88 a month before storage and I/O |
| DynamoDB | Pay per request, no servers | The per-account sequence, idempotency, outbox and job table are all transactional relational patterns; a second data model to learn and test |

Recommendation: **RDS for PostgreSQL** in production and staging, the same major version locally (docker-compose already runs Postgres). Nonprod can be single-AZ and stopped when idle. Move to Aurora when the instance class, not the bill, becomes the constraint. RDS instance prices did not render on the pricing page in this pass; get them from the calculator before the budget (**unverified**).

### 6.2 Schema outline (prod-core)

| Table | Key columns | Owner module |
|---|---|---|
| `accounts` | `id`, `seq` (last account_seq), `email` (nullable), `created_on`, `deleted_at` | identity |
| `passkeys` | `id`, `account_id`, `credential_id`, `public_key`, `sign_count`, `created_on` | identity |
| `sessions` | `token_hash`, `account_id`, `device_id`, `expires_at` | identity |
| `devices` | `id`, `account_id`, `platform_family`, `pub_dk`, `pub_sk`, `created_on`, `last_seen_on`, `removed_at` | devices |
| `signed_docs` | `account_id`, `kind` (device_list, vault_header), `epoch`, `blob`, `etag` | devices |
| `key_wraps` | `account_id`, `kind` (recovery, pairing), `blob`, `expires_at` | devices |
| `sync_batches` | `account_id`, `account_seq`, `device_id`, `device_counter`, `prev_hash`, `hash`, `epoch`, `size_step`, `ciphertext`, `received_at`; unique `(device_id, device_counter)` | sync |
| `sync_heads` | `account_id`, `device_id`, signed heads blob, `received_at` | sync |
| `checkpoints` | `account_id`, `epoch`, `s3_key`, `covers_seq`, `signer_device_id` | sync |
| `blobs` | `id` (random), `account_id`, `s3_key`, `size_step`, `sha256`, `state` (pending, committed, deleting), `created_at` | blobs |
| `push_tokens` | `device_id`, `provider`, `token` | notify |
| `update_subscriptions` | `account_id`, `category` | notify |
| `idempotency_keys` | `account_id`, `key`, `fingerprint`, `locked_at`, `recovery_point`, `response` | shared |
| `outbox`, `jobs` | job kind, payload (ids only), attempts, `run_after` | worker |

Rules:
- **Payloads in `outbox` and `jobs` carry ids only**, never content; the recorded-bytes canary test (BLUEPRINT 6) covers them.
- **Row-level security as a second layer.** The app connects as a role that does not own the tables, sets `app.account_id` per transaction, and every tenant table has a policy on it; `FORCE ROW LEVEL SECURITY` on all of them, because "Table owners normally bypass row security as well" and superusers and `BYPASSRLS` roles always do (https://www.postgresql.org/docs/current/ddl-rowsecurity.html). The worker uses a separate role with only the grants its jobs need.
- **Migrations** with Alembic (SQLAlchemy is already in pyproject.toml), forward only, expand then contract so the old and new task versions can run side by side during a rolling deploy; run as a separate one-off task before the service update.
- **TLS required** to the database; encryption at rest with a customer-managed KMS key; automated backups with point-in-time recovery; snapshots copied to us-east-2 (decision C1); the daily canary restore (BLUEPRINT 6) restores a snapshot into nonprod and runs a smoke test.
- **Connections**: a small pool per task; RDS Proxy only if task count grows (**unverified** need).

---

## 7. Object storage and keys

### 7.1 Documents

Files are encrypted on the device in 1 MiB AES-256-GCM chunks with chunk index and final flag bound (research-security 3.8), under a per-file key F wrapped under K_vault (BLUEPRINT 5.2). AWS's own definition fits: with client-side encryption "your objects aren't exposed to any third party, including AWS" (https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingClientSideEncryption.html). Duly does **not** use the Amazon S3 Encryption Client: its wrapping keys are KMS or raw keys held by the caller, while Duly's keys must stay with the student. The envelope comes from the vetted library chosen in the security file (Tink or libsodium, BLUEPRINT 5.5).

Upload flow:
1. `POST /v1/blobs` with padded size step and SHA-256 of the ciphertext. Server checks quota, creates a `pending` row with a random key, returns a presigned PUT (multipart for large files).
2. Client uploads directly to S3 with `If-None-Match: *` so an existing key is never overwritten; S3 returns 412 if it exists (https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html). A bucket policy can require conditional writes (same page). It sends a SHA-256 checksum, which S3 validates "before storing the object" (https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html).
3. `POST /v1/blobs/{id}/commit`. Server does a HEAD, checks size and checksum match the row, marks `committed`. A `document.version_added` event (inside the encrypted log) references the blob id.
4. A lifecycle rule aborts incomplete multipart uploads after a day, as AWS recommends on the conditional-writes page; a worker job deletes `pending` rows and objects older than a day.

Presigned URLs are bearer tokens ("presigned URLs are bearer tokens that grant access to those who possess them") and expire no later than the credentials that signed them (https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html). Duly keeps them short (minutes) and adds an `s3:signatureAge` deny in the bucket policy as the same page shows. A leaked URL yields ciphertext only.

Bucket settings: Block Public Access; ACLs disabled; TLS-only bucket policy; versioning on; **SSE-KMS with S3 Bucket Keys** as the at-rest second layer, which "can reduce AWS KMS request costs by up to 99 percent" (https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html); object keys random and not prefixed with the account id; cross-region replication of ciphertext to us-east-2 (decision C1); access only from the VPC endpoint plus presigned client requests.

**Object Lock: not on student buckets in compliance mode.** In compliance mode an object "can't be overwritten or deleted by any user, including the root user", and "The only way to delete an object under the compliance mode before its retention date expires is to delete the associated AWS account" (https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html). That would break account deletion and "Delete" for a student. Use compliance mode only for pipeline snapshots and the audit log archive. For student ciphertext, protect against a bad deploy or insider with versioning plus a short **governance-mode** retention or a noncurrent-version window (proposal 30 days, founder sets), state the window in the retention table, and rely on crypto-shredding (destroying K_vault wraps and per-item keys) for deletion, which counsel must confirm (research-system 6.7). BLUEPRINT 8 Phase 6 lists Object Lock for backup; this is the change to that line.

### 7.2 KMS and server-side keys

KMS keys cost "$1/month" each and "$0.03 / 10,000 requests" after "20,000 requests/month" free; rotation adds $1 a month for the first two rotations only (https://aws.amazon.com/kms/pricing/). Keys per account and purpose: database, blob bucket, log archive, secrets. About five in prod-core. No per-student KMS key: it costs about $1 per student per month and protects nothing the student's own key does not already protect (research-system 10.3).

Server secrets (APNs signing key, FCM service account, the `/v1/time` signing key) live in Secrets Manager, readable only by the task role that needs each one. TUF root and targets keys are **not** on any server: offline, threshold-signed (BLUEPRINT 5.5).

---

## 8. Queues and jobs

### 8.1 What runs in the background

| Job | Trigger | Touches student data? |
|---|---|---|
| Wake other devices after a sync push | Outbox row | Ids only; push is content-free |
| Library update wake-up | Pipeline publishes a bundle | No: topic push to everyone |
| Law-update email (D22) | Pipeline publishes an update | Public text only, to subscribers |
| Garbage collection: pending blobs, expired wraps, idempotency keys, compacted batches | Schedule | Ids only |
| Account deletion | Student request | Deletes rows and objects; crypto-shred is on the device |
| Canary restore | Daily schedule | Restores into nonprod with synthetic data checks |
| Token cleanup after APNs/FCM rejects a token | Push response | Ids only |

None of these needs a student date: reminders are computed and scheduled on the device (D73, research-system 8). EventBridge Scheduler and Step Functions are for public jobs only (research-system 8.4).

### 8.2 Postgres jobs plus outbox for v1

The problem the outbox solves: a request must change the database and also cause a side effect (a push), without two-phase commit. The pattern stores the message in the same transaction, and "Messages are guaranteed to be sent if and only if the database transaction commits"; the relay can send a duplicate, so "a message consumer must be idempotent" (https://microservices.io/patterns/data/transactional-outbox.html). Brandur calls the same idea a "transactionally-staged job drain" (https://brandur.org/idempotency-keys).

At Duly's size the queue can be the same Postgres. Workers take jobs with `SELECT ... FOR UPDATE SKIP LOCKED`, which PostgreSQL documents for exactly this: it "can be used to avoid lock contention with multiple consumers accessing a queue-like table" (https://www.postgresql.org/docs/current/sql-select.html). Procrastinate packages this for Python ("leveraging PostgreSQL 13+ to store task definitions, manage locks and dispatch tasks", with retries and periodic tasks, https://procrastinate.readthedocs.io/en/stable/); adopting it is a dependency decision for a human, since lanes cannot add dependencies (BLUEPRINT 5.5). A hand-written jobs table of about 200 lines is the alternative.

Every job: idempotent by job id, bounded retries with backoff and jitter, a dead state after N attempts with an alarm, and a payload of ids only.

### 8.3 Where SQS and EventBridge fit

| Use | Service | Why |
|---|---|---|
| Pipeline (pipeline account) tells prod-core "bundle N published" | EventBridge cross-account event to an SQS queue in prod-core | Crosses an account boundary without giving the pipeline database access |
| Fan-out of library wake-ups if push volume grows | SQS standard | "at-least-once message delivery ... messages may occasionally arrive out of order" (https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html), which is fine for idempotent wake-ups |
| Anything needing strict order | SQS FIFO (exactly-once processing, 5-minute deduplication window, ordering per message group, https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html) | Not needed in v1; the per-account sequence lives in Postgres |
| Public cron jobs (watch runs, digest emails, GC) | EventBridge Scheduler: cron, rate and one-time schedules, "flexible time windows", retries, "at-least-once event delivery" (https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html) | Managed; no student data in schedules |

Cost is negligible at launch: SQS gives "1 million Amazon SQS requests for free each month", and each 64 KB chunk of payload counts as a request (https://aws.amazon.com/sqs/pricing/).

---

## 9. Rules and updates publisher

The publisher is not a request-time service. It lives in the pipeline account and ends in static files (research-system 7, BLUEPRINT 5.5 and 6):

watch, snapshot (Object Lock compliance), detect, classify, draft from public text, two checks, founder approval, **sign** (TUF, offline root, 2-of-3 threshold), **publish** (upload the bundle and TUF metadata to the library bucket, invalidate the CDN paths for the metadata only), **announce** (EventBridge event to prod-core, which sends a topic wake-up and the update email).

Backend rules that keep this inside the constraints:
- **Staged rollout without the server knowing who got what.** Each device picks a random rollout bucket 0 to 99 once, locally. Signed targets metadata states the rollout share (1%, 10%, 100%). The device decides; the CDN serves the same files to everyone. A kill switch is new signed metadata.
- **The library is fetched without auth** and CDN access logs are off for those paths (BLUEPRINT 5.5).
- **TUF's timestamp role** gives freshness: a device that stops seeing new timestamp metadata knows updates have stopped (freeze attack) and turns stale regimes into Can't tell yet (D65, research-system 7.2).
- **The Python engine runs here**, as the oracle: every bundle ships golden vectors, and the device engine port must match them byte for byte before release (BLUEPRINT 6). The engine never runs in prod-core.

---

## 10. Notifications

- **Push is a content-free wake-up.** APNs: HTTP/2, token-based auth with a .p8 key, `apns-push-type: background`, `apns-priority: 5`, payload `{"aps":{"content-available":1}}`, 4 KB limit, `apns-collapse-id` to coalesce (https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns). FCM: HTTP v1 with "short-lived OAuth 2.0 access token derived from a service account", targets by token or topic (https://firebase.google.com/docs/cloud-messaging/send/v1-api). Library wake-ups go to a topic, so no per-device list is needed (BLUEPRINT 6).
- **Dated reminders never come from the server** (D73). iOS background pushes are best effort and throttled (research-system 8.2), which is one more reason the device schedules its own local notifications.
- **Desktop** (Electron, Mac and Windows) does not rely on push. It pulls on launch, on wake and on a timer. Whether Electron can register for APNs on macOS without native code is **unverified**; it is not needed.
- **Egress.** prod-core has no general internet egress; an egress proxy allows only APNs, FCM and SES (BLUEPRINT 6).
- **What push reveals.** Apple and Google learn that an account's device was woken at a time. Sync wake-ups are coalesced (at most one per few minutes per device) to blunt timing.

---

## 11. The Ask gateway to Bedrock

### 11.1 Flow

```
device: on-device router first (BLUEPRINT 4.2)
  -> abstain or low score
  -> device strips anything shaped like an id, a date or a name; attaches no document value (D60)
  -> POST /ask/v1/route {question_text, locale, catalog_version}   (auth: short-lived token)
gateway (prod-assistant):
  -> verify token, check rate limit and budget
  -> prompt = [cached prefix: public catalog of guide ids, slot names, boundary rules] + [question]
  -> Bedrock Converse with a tool whose input schema is a closed enum of guide ids plus slot names
  -> validate the tool call against the schema; drop any free text
  -> return {guide_id | none, slots_needed[], score}
device: runs the guide with the engine; every number from the engine; fills templates; validator; or the DSO step back
```

The model never sees a value it could misstate and never writes a sentence the student reads (BLUEPRINT 4.1: templates own every sentence). If D79 is later read to allow the model to phrase text, that text passes the same tokenising validator on the device, and digits outside slots are rejected (research-system 9.2).

### 11.2 Bedrock settings that are requirements, not options

- **Retention mode `none`** for the account and Region, enforced by SCP on both the `bedrock-mantle` and control-plane actions; in `none`, "No request or response data is written to durable storage by AWS or shared with the model provider" (https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html). The same page gives the SCPs: deny `bedrock-mantle:PutAccountDataRetention`, `CreateProject`, `UpdateProject` and `bedrock:PutAccountDataRetention` unless the mode is `none`.
- **Pick a model whose `allowed_modes` includes `none`.** The page says Claude Fable 5 and 5.1 require `aws_review` (retained up to 30 days, may be reviewed by AWS), so they are unavailable under `none`; Claude Opus 4.8 lists `none`. For any other Claude model, check `GET /v1/models/{id}` before choosing (**unverified** per model in this pass). With retention `none`, a model that needs more simply fails with `ValidationException`, which is the safe failure.
- **Model invocation logging stays off.** It "is disabled by default"; when on, it records "full request data, response data" to CloudWatch or S3 (https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html). Add an SCP denying the logging configuration action (exact action name **unverified**; the API is `PutModelInvocationLoggingConfiguration`).
- **US geographic inference profile only**, never global; reach Bedrock through a VPC endpoint (research-system 9.3).
- **Prompt caching** for the static prefix (catalog and rules): cache reads are billed at a lower rate and for Claude "cache hits are not deducted against your rate limit"; TTL 5 minutes or 1 hour (https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html). Whether a cached prefix counts as retention under mode `none` is **unverified**; the cached part is public text only, so either answer is acceptable, but confirm with AWS before relying on it.
- **Quotas** are per model and per endpoint in tokens per minute and requests per minute (https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html); request increases before launch.
- **Pricing** for current Claude models was not shown on the pricing page in this pass (https://aws.amazon.com/bedrock/pricing/); get it before the budget (**unverified**).

### 11.3 Gateway hygiene

- No database, no S3 write permission, no outbound internet except the Bedrock VPC endpoint.
- Logs on the fixed field schema only: route, status, latency, model id, token counts, guide id returned. Never the question.
- Rate limits: per account (proposal 30 questions a day, founder sets), a global daily token budget with an alarm and an automatic switch to "on-device only", and the Bedrock quota as the last wall. App Attest and Play Integrity on mobile to stop scripted abuse; Play Integrity's default quota is "10,000 total requests per day across all installs" (https://developer.android.com/google/play/integrity/overview), so attest at session creation, not per question.
- **Unlinkability, later.** Today the gateway sees which account asked which question. To remove that, the relay can issue Privacy Pass tokens to authenticated devices and the gateway can accept them without learning the account: "a given token cannot be linked to the protocol interaction where that token was initially issued" (RFC 9576, https://www.rfc-editor.org/rfc/rfc9576.html), carried over Oblivious HTTP (RFC 9458, BLUEPRINT 6). Worth doing before scale; not in the first release.
- **Kill switch**: a signed bundle flag turns the cloud step off; devices fall back to the on-device router and the DSO step back (BLUEPRINT 4.3 item 6).

---

## 12. Where backend logic stops and the engine starts

| Concern | Owner | Server's role |
|---|---|---|
| Any date, count, deadline or verdict | Engine on the device | None. The server cannot read the inputs |
| Loop state, follow-ups, reminders | Loop runner and scheduler on the device | None (D73, D75) |
| Conflict detection in the record | Projection code on the device | None; it relays both events |
| Rule content and its correctness | Pipeline (Python engine as oracle, golden vectors, two checks, founder approval) | Serves signed static files |
| Which guide a question matches | On-device router, then the Ask gateway | Returns an id from a closed list |
| Structural checks: signature valid, counter continuous, size step allowed, quota, epoch current | Server | Rejects early; devices check again |
| Account, device, session, quota, rate limits | Server | Owns these |

Enforcement: a CI check that the production image of `api` and `worker` does not contain `engine/` and does not route `/v1/compute*` (BLUEPRINT 6 gate). Server-side validation is structural only; a server that tried to "help" by checking dates would need to read them.

---

## 13. Permissions, briefly

Detail belongs in the authentication and security files; the backend needs these properties:

- **One principal per account: the student.** No staff read path exists because nothing readable exists. Support is "Send my case to support", encrypted to a support key by the student's choice (BLUEPRINT 6).
- **Sessions** are short-lived opaque tokens stored hashed; refresh is bound to the device key (the device signs a server challenge with SK_dev; the same idea as OAuth DPoP, RFC 9449, https://www.rfc-editor.org/rfc/rfc9449.html, **unverified** fit). A stolen token without the device key cannot refresh.
- **Device-scoped actions** (push a batch, register a push token) require the session's device to be on the current signed list.
- **Ops** (pipeline account) uses IAM Identity Center with hardware keys, an IP allowlist (D17) and re-auth to publish; it has no route into prod-core data.
- **Rate limits** at two levels: AWS WAF rate-based rules per IP at the edge (https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html), and per-account token buckets in the app for sync pushes, blob creation, pairing attempts (tight: pairing codes are guessable if unlimited) and sign-in attempts.

---

## 14. Testing the backend

| Test | What it proves |
|---|---|
| Contract equality (generated schema vs contracts/openapi.yaml) | Code matches contract |
| oasdiff against main | No breaking change inside `/v1` |
| Schemathesis against a running stack | Every route survives generated input; no 500s; problem responses match schema |
| Sync property tests (shuffle, duplicate, partition, fork, rollback, revocation) | The record is a function of the event set; lies are detected |
| Idempotency tests (retry after timeout, concurrent retry gets 409, changed body gets 422) | Safe retries |
| Outbox and job tests (crash between commit and send; duplicate delivery) | Nothing lost, nothing applied twice |
| Migration tests (upgrade from the last release with data; old and new code side by side) | Rolling deploys are safe |
| Recorded-bytes canary test (BLUEPRINT 6) | Planted SEVIS IDs, dates, school names and question text never appear in logs, push, email, DNS, crash reports, job payloads |
| RLS test: a query under account A's setting returns nothing of account B | Second layer works |
| Fuzzing of the frame, envelope and signed-doc parsers | Malformed input cannot crash or confuse the server |
| Load test of push and pull at 10x expected peak | Sizing |
| Daily canary restore and per-release pairing test (BLUEPRINT 6) | Backups and pairing actually work |

---

## 15. Rough monthly cost of the backend at 1,000 students

Indicative only; several prices are US East figures or **unverified** for us-west-2.

| Item | Estimate | Basis |
|---|---|---|
| Fargate: 2 api tasks plus 1 worker, each 0.5 vCPU and 1 GB, Graviton | about $45 | US East Linux/ARM: $0.0000089944 per vCPU-second and $0.0000009889 per GB-second (https://aws.amazon.com/fargate/pricing/), about $0.032 per vCPU-hour and $0.0036 per GB-hour |
| RDS PostgreSQL Multi-AZ, small Graviton | $50 to $120 (**unverified**) | Calculator needed |
| S3 ciphertext, 200 MB per student, plus replication | under $15 (**unverified**) | Standard storage price not fetched in this pass |
| KMS, about 5 keys | about $5 | KMS pricing page |
| SQS, EventBridge Scheduler | about $0 | Free tiers |
| Load balancer, WAF, interface VPC endpoints, NAT or egress proxy | likely the largest fixed line, $80 to $200 (**unverified**) | Interface endpoints are billed per hour per AZ; consolidate where possible |
| Bedrock | Depends on questions per student and the model chosen (**unverified**) | Prompt caching and the on-device router first keep calls few |

This sits inside BLUEPRINT 6's $600 to $950 a month at 1,000 students, which includes the other accounts and platform costs.

---

## 16. Build order, mapped to BLUEPRINT 8

| Phase | Backend work |
|---|---|
| 1 Contracts | Sync frame and event envelope in contracts/, the `/v1` endpoint set in openapi.yaml, problem types, the data inventory (section 2) as a contract file |
| 2 Desktop slice | Nothing server side beyond today; the event log is local first |
| 4 Local-only iPhone | Accounts and passkeys only, so the app can sign in; no sync yet |
| 5 Pairing and sync | Devices module, signed docs with `If-Match`, sync push/pull/heads/checkpoints, outbox and wake-ups, the property and fork tests, protocol spec and formal model first (BLUEPRINT 5) |
| 6 Backup | Blobs module, S3 bucket design (section 7), retention table, deletion jobs, canary restore |
| 7 Updates publish | Library bucket, TUF publishing from pipeline, cross-account announce, topic push, update email |
| 8 Ask | Gateway account, SCPs, gateway service, rate limits and budget, then Privacy Pass later |

---

## 17. Decisions for the founder

1. Keep Python (FastAPI) for the server and REST with OpenAPI as the API style (recommended), rather than a TypeScript server.
2. Store small sync batches in Postgres rather than S3 (recommended; changes research-system 6.3).
3. Conflicts in the record: multi-value facts that become a question, no last-writer-wins for any fact with legal meaning (recommended; restates PRINCIPLES 2 for sync).
4. RDS for PostgreSQL now, Aurora later (recommended), after a calculator check.
5. Object Lock compliance mode only for pipeline snapshots and audit logs; student ciphertext gets versioning plus a 30-day governance or noncurrent window (recommended; changes BLUEPRINT 8 Phase 6). Counsel to confirm crypto-shredding counts as deletion.
6. Postgres-backed jobs with an outbox in v1 (recommended); approve Procrastinate as a dependency or ask for a hand-written job table.
7. The supported-client window (proposal 12 months) and the "update Duly" cut-off policy.
8. Ask: the per-account daily question limit, the global token budget, which Claude model (one whose allowed modes include `none`), and whether Privacy Pass unlinkability is required before first strangers or before scale.
9. Withholding threshold before a device shows Can't tell yet for sync (proposal 24 hours).

---

## 18. Unverified in this pass

- RDS instance prices, S3 storage price, interface endpoint and load balancer prices in us-west-2.
- Current Claude model prices on Bedrock and which current Claude models list `none` in `allowed_modes` (only Opus 4.8 is named on the page).
- Whether Bedrock prompt caching under retention mode `none` stores anything durably.
- The exact IAM action name to deny invocation logging configuration by SCP.
- import-linter fit for this repo; gRPC browser limits; Roughtime as the model for signed time; Padmé overhead figure; DPoP as the model for device-bound refresh; Electron APNs on macOS; RDS Proxy need.
- App Attest server-side details: Apple's pages did not render in this pass; the security file should cite them directly.
- The IETF Idempotency-Key draft is expired (version 07, 2025-10-15); its status codes are used as a convention, not a standard.

## Sources

- Ink & Switch, Local-first software: https://www.inkandswitch.com/essay/local-first/
- Martin Fowler, MonolithFirst: https://martinfowler.com/bliki/MonolithFirst.html
- Shopify, Deconstructing the monolith: https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity
- Apple swift-openapi-generator: https://github.com/apple/swift-openapi-generator
- OpenAPI Generator, Kotlin: https://openapi-generator.tech/docs/generators/kotlin/
- openapi-typescript: https://openapi-ts.dev/
- FastAPI, OpenAPI schemas from Pydantic: https://fastapi.tiangolo.com/how-to/separate-openapi-schemas/
- tRPC: https://trpc.io/
- OWASP GraphQL Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html
- RFC 9457 Problem Details: https://www.rfc-editor.org/rfc/rfc9457.html
- RFC 9745 Deprecation header: https://www.rfc-editor.org/rfc/rfc9745.html
- RFC 9562 UUIDs: https://www.rfc-editor.org/rfc/rfc9562.html
- RFC 9576 Privacy Pass architecture: https://www.rfc-editor.org/rfc/rfc9576.html
- RFC 9449 DPoP: https://www.rfc-editor.org/rfc/rfc9449.html
- IETF draft Idempotency-Key header (07): https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.html
- Stripe, Designing robust APIs with idempotency: https://stripe.com/blog/idempotency
- Stripe, API versioning: https://stripe.com/blog/api-versioning
- Brandur Leach, Implementing Stripe-like idempotency keys in Postgres: https://brandur.org/idempotency-keys
- oasdiff: https://github.com/oasdiff/oasdiff
- Schemathesis: https://schemathesis.readthedocs.io/en/stable/
- Replicache, how it works: https://doc.replicache.dev/concepts/how-it-works
- Figma, multiplayer technology: https://www.figma.com/blog/how-figmas-multiplayer-technology-works/
- Kleppmann, Making CRDTs Byzantine Fault Tolerant: https://martin.kleppmann.com/papers/bft-crdt-papoc22.pdf
- Kulkarni et al., Logical Physical Clocks (HLC): https://cse.buffalo.edu/tech-reports/2014-04.pdf
- Li, Krohn, Mazières, Shasha, SUNDR (OSDI 2004): https://www.usenix.org/legacy/event/osdi04/tech/full_papers/li_j/li_j.pdf
- WhatsApp key transparency: https://engineering.fb.com/2023/04/13/security/whatsapp-key-transparency/
- Aurora Serverless v2 scale to zero: https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-aurora-serverless-v2-scaling-zero-capacity/
- Aurora pricing: https://aws.amazon.com/rds/aurora/pricing/
- PostgreSQL row security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL SELECT, SKIP LOCKED: https://www.postgresql.org/docs/current/sql-select.html
- Procrastinate: https://procrastinate.readthedocs.io/en/stable/
- S3 client-side encryption: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingClientSideEncryption.html
- S3 conditional writes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html
- S3 object integrity: https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html
- S3 presigned URLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- S3 Bucket Keys: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html
- S3 Object Lock: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- KMS pricing: https://aws.amazon.com/kms/pricing/
- Transactional outbox: https://microservices.io/patterns/data/transactional-outbox.html
- SQS standard queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html
- SQS FIFO queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html
- SQS pricing: https://aws.amazon.com/sqs/pricing/
- EventBridge Scheduler: https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html
- Bedrock data retention: https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html
- Bedrock model invocation logging: https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html
- Bedrock prompt caching: https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html
- Bedrock quotas: https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html
- Bedrock pricing: https://aws.amazon.com/bedrock/pricing/
- APNs, sending notification requests: https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns
- FCM HTTP v1: https://firebase.google.com/docs/cloud-messaging/send/v1-api
- Play Integrity API: https://developer.android.com/google/play/integrity/overview
- AWS WAF rate-based rules: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html
- Fargate pricing: https://aws.amazon.com/fargate/pricing/
- py_webauthn: https://github.com/duo-labs/py_webauthn
