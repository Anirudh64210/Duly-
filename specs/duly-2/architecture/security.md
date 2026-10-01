# Duly architecture: security and compliance

Status: research and proposal, 2026-10-01. Not legal advice; every legal row goes to counsel.
Scope: the whole system on Mac, Windows, Android, iPhone and the web (D78), the relay server on AWS, Ask on Amazon Bedrock (D79), the rule update pipeline, Ops, and the build factory.
Reads with: specs/duly-2/BLUEPRINT.md sections 4 to 8 (the key schedule in 5.2 is not repeated here, only extended), specs/duly-2/research-security.md (STRIDE scenarios in 6.2, legal table in 9), specs/duly-2/research-system.md, security/threat-model.md.

Tags used below:
- **Verified** means the claim was read on the cited page on 2026-10-01.
- **Carried** means it comes from research-security.md or research-system.md with their citation, not re-fetched here.
- **Unverified** means from general knowledge or a page that did not render; check before relying on it.
- **Proposal** means a design choice or a number for the founder to set.

---

## 0. Summary

1. **The shape that makes everything else cheaper:** everything that knows the student runs on the device; the server is a relay of ciphertext plus a public signed rule library (BLUEPRINT 6). Most compliance exposure, breach scope and government-demand exposure shrinks because of this. The one place that breaks the shape is Ask on Bedrock (D79): question text reaches Duly's AWS account in plaintext. That path gets its own controls (section 8).
2. **Bedrock terms, verified on AWS docs today:** inputs and outputs are not used to train any model and are not shared with model providers; providers have no access to the deployment accounts; invocation logging is off by default. **But retention depends on the model.** AWS documents that Claude Fable 5 and Fable 5.1 require the `aws_review` mode: prompts and completions kept up to 30 days inside AWS, flagged traffic open to AWS human review. D79 says "no provider retention", so Ask must use only models whose `allowed_modes` include `none`, with `none` forced by a Service Control Policy (section 8.3). A model that needs `aws_review` fails closed with a `ValidationException`, which is the behaviour Duly wants.
3. **Region:** geographic "US" inference profiles route only within the US, and their destination list never changes; global profiles route worldwide and must be blocked by SCP. Retained data (for models that retain) sits in the destination Region. Pin Ask to the US geography or to in-Region us-west-2 where the model card lists it (section 8.4).
4. **Verification targets:** OWASP ASVS 5.0 Level 2 for the API, web and Ops, plus the Level 3 items in cryptography, data protection, and logging; OWASP MASVS 2.1 with the MAS-L2 and MAS-P profiles for both mobile apps, and selected MAS-R controls (app attestation, not obfuscation); the Electron security checklist and fuses for desktop (section 4).
5. **Supply chain:** SLSA Build Level 2 now through GitHub artifact attestations, Level 3 by moving release builds into one shared reusable workflow; a CycloneDX SBOM per release; lockfiles with a 7-day cooling-off on new versions; GitHub Actions pinned by commit hash (today they are pinned by tag: a gap); signed and notarized builds on every platform; Electron fuses not yet set (a gap).
6. **Privacy law:** immigration status is "sensitive" by statute in California (CCPA as amended by AB 947), Virginia (verified text), Maryland (verified text, with a "strictly necessary" rule and a flat ban on selling sensitive data) and several other states. Design to Maryland plus the opt-in states: explicit consent, a written data protection assessment, no sale, no ad or analytics SDKs, collection limited to what the requested service needs.
7. **Breach notice:** California now requires notice within 30 calendar days of discovery and a copy to the Attorney General within 15 days when over 500 residents are affected (verified). Encrypted data is outside the definition unless the key is also taken, so end-to-end encryption with keys off the server is the main breach control, and the account email list is the main residual.
8. **Government requests:** an administrative subpoena can reach basic subscriber records (name, address, session times, network address, payment source) under 18 U.S.C. 2703(c)(2); content needs a warrant; a provider can be gagged under 2705(b) and asked to preserve for 90 days under 2703(f) (all verified). Duly's answer is to hold almost nothing, publish exactly what it holds, require legal process, notify the student, challenge gags, and make Ask questions unlinkable to an account (section 13).
9. **Retention:** a numbered retention table (section 12) with short windows: IP and edge logs 7 days, Ask bodies 0, crash reports 30 days, deleted backups gone within the Object Lock window (proposal 14 days), database snapshots up to the backup window (proposal 7 days).
10. **Audits:** a written protocol spec and a formal model of pairing and revocation, then an outside cryptography audit and a pen test of every client and the API, all as release gates before sync or backup ships; a public vulnerability disclosure policy from the first stranger; bug bounty later.

Decisions for the founder are in section 16.

---

## 1. Decisions this design obeys, and where they pull

| Row | What it says | Effect here |
|---|---|---|
| D54 | Documents encrypted on the device; optional end-to-end backup to Duly's AWS (us-west-2) under a key only the student holds | Server stores ciphertext and wrapped keys only; no escrow; "a lost key loses the backup" is said plainly |
| D55 | Documents read and sorted on the device; nothing leaves the device for it; every field confirmed | The document reader has no network permission (tested); no cloud OCR |
| D60 | No value from a document reaches any model, including on Duly's own AWS, until the founder decides; files, names and identifiers never do | Ask payloads carry no document values; enforced by a recorded-bytes test (section 8.6) |
| D75 | The Loop is the single building block | Security actions (enrol, revoke, backup, delete) are loops that close with a receipt |
| D76 | Ask matches a guide before the boundary tests | Router and templates are signed bundle content, so the update channel is a security boundary (section 3) |
| D77 | v1 Ask had no model | Replaced by D79 for the model part |
| D78 | Mac, Windows, Android, iPhone from the start; prototype stays web | Four signing chains, four key stores, two app stores (section 9.4) |
| D79 | Ask uses Claude through Bedrock in Duly's AWS account (no training, no provider retention); engine supplies every date; BOUNDARY applies; prototype helper uses the founder's Claude Code login with the fictional sample student only | Section 8 |

Tensions to resolve, not paper over:

- **BLUEPRINT 4.2 versus D79.** The blueprint (written before D79) says v1 sends no question text off the device and lists conditions for any cloud model: values scrubbed on device, an unlinkable relay, retention "none" enforced by SCP, and only models that allow "none". DECISIONS.md wins, so Ask uses Bedrock; this document keeps all four conditions as the way D79 is carried out safely, because none of them contradicts D79.
- **"Student data never goes to an outside AI provider."** D79 treats Bedrock in Duly's own account as inside. That holds only as far as AWS's terms hold: AWS is still a processor that can retain for abuse detection under some modes. The consent and privacy copy must describe this exactly ("processed by Amazon Web Services for Duly; not kept, not used for training, not shared with Anthropic"), and each clause must be backed by a configuration check (section 8.5). Overstating it is the Zoom pattern the FTC acted on (Carried: research-security 9).
- **The prototype helper.** The ANTHROPIC provider kind in assistant/providers.py exists for the local prototype. It must be impossible in a production build: a CI gate fails if the provider, its client library or an Anthropic API hostname appears in any release artifact (section 9.6).

---

## 2. System, data classes and trust boundaries

### 2.1 Components

| # | Component | Runs where | Holds |
|---|---|---|---|
| C1 | Desktop app (Electron main, sandboxed renderer, engine, local store) | Student's Mac or Windows PC | Keys in Keychain or Windows Hello-protected store; SQLCipher record; encrypted documents |
| C2 | Mobile apps (iPhone, Android) | Student's phone | Keychain or Android Keystore keys; local record; encrypted documents; on-device reader |
| C3 | Web client | Browser | Public library and account at launch; record and documents later, per approved session (BLUEPRINT 5.5) |
| C4 | Relay API | AWS prod account, us-west-2 | Account, passkey public keys, signed device list, wrapped keys, encrypted log segments, blob index, push tokens |
| C5 | Blob store | S3, us-west-2, replica us-east-2 | Padded ciphertext under random ids |
| C6 | Ask service | AWS assistant account (new), us-west-2 | Nothing durable; question text in memory only; calls Bedrock |
| C7 | Rule pipeline and Ops | AWS pipeline account; Ops behind hardware keys | Source snapshots (S3 Object Lock), drafts, approvals, signing requests |
| C8 | Update channel | CloudFront plus S3, public, no auth | TUF-signed rule and template bundles |
| C9 | Push and email | APNs, FCM, SES through an egress proxy | Content-free wake-ups; account email |
| C10 | Crash and error reporting | Platform crash reports; optional Sentry | Stack traces with scrubbed fields |
| C11 | CI/CD and the agent factory | GitHub Actions, OIDC to AWS | Source, build provenance; no long-lived secrets |

### 2.2 Data classes

| Class | Examples | Where allowed | Rule |
|---|---|---|---|
| D0 Public | Rule bundles, templates, guides, release hashes | Anywhere | Signed; integrity, not secrecy |
| D1 Account metadata | Email (optional relay address), passkey public keys, device list, upload times, push tokens | C4 | Minimal; email encrypted at the application layer; short logs. Itself status-revealing in context (a Duly account suggests non-citizen status) |
| D2 Status-revealing content | The record, loop state, document fields, documents, question text | Device; ciphertext on C4 and C5; question text transiently on C6 | End-to-end encrypted at rest off the device; never in logs, crash reports, push, email or analytics |
| D3 Secrets | K_vault, R, device keys, signing keys, KMS keys | Device key stores, offline hardware, KMS | Never in plaintext on any server; never in CI |

The tested invariant: a planted canary from D2 (SEVIS id, dates, school name, question text) appears in no outbound byte except the encrypted sync and the Ask request body (BLUEPRINT 6, CI and gates). Ask is the single named exception and has its own canary test that the text appears nowhere after the Bedrock call returns.

---

## 3. Threat model (STRIDE) for the full system

STRIDE: spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege (Microsoft threat modeling, Carried). research-security 6 covers the vault and sync in depth; this table adds the components D78 and D79 bring in.

| Component | Spoofing | Tampering | Repudiation | Information disclosure | Denial of service | Elevation of privilege |
|---|---|---|---|---|---|---|
| C1 Desktop (Electron) | Look-alike installer: signed and notarized builds only; publisher name checked by the updater | Altered app.asar or injected code: ASAR integrity fuse, onlyLoadAppFromAsar, code signing; `ELECTRON_RUN_AS_NODE` and `NODE_OPTIONS` fuses off | Local history append-only, signed per device | Renderer XSS reading keys: keys live in main process or native helper only, never in the renderer; context isolation, sandbox, strict CSP, IPC sender checks | Corrupt local store: integrity check and restore from another device | Renderer to main via IPC: allowlisted, typed IPC; `shell.openExternal` only for allowlisted links |
| C2 Mobile | Repackaged app: App Attest and Play Integrity on enrol and Ask (Unverified detail) | Hooking on rooted devices: stated limit; MAS-R controls on enrol only | Same as C1 | Backups, screenshots, keyboard caches, logs: MASVS-STORAGE and PLATFORM controls; vault excluded from cloud backup | Background limits drop reminders: nearest reminders pre-scheduled (BLUEPRINT 7 row 13) | Exported components and deep links: none exported but the share target; validated intents |
| C3 Web | Phishing domain: passkeys are origin-bound | Server sends altered JS: SRI, CSP, published release hashes; record and documents off the web until code transparency | | Third-party script: none allowed | Bot sign-ups: rate limits, proof of work or Privacy Pass tokens | Session theft: short tokens bound to device key |
| C4 Relay API | Forged device: signed device list (research-security 3.5) | Swapped or replayed log segments: hash chain, signed checkpoints, epochs | Server audit log of account actions shown to the student | Breach yields emails, public keys, ciphertext; email column under KMS | Per-account and per-IP limits; WAF; quotas on blob bytes | Broken object authorization (the OWASP API top risk class): every object id checked against the account and device; ASVS V8 |
| C5 Blob store | | Deletion or overwrite by a takeover: versioning plus Object Lock governance window | S3 data events to the security account | Public bucket by mistake: Block Public Access at the organization level | Cost attack by uploads: per-account quota | Staff read: no role has GetObject outside the relay role; break-glass alerted |
| C6 Ask service | Scripted abuse with stolen tokens: unlinkable rate-limit tokens per account per day | Prompt injection in pasted text: model output never carries a date, count or conclusion; validator; templates only (BLUEPRINT 4.3) | Model answers are not stored, so disputes rest on the template id and bundle version shown on the device | Question text retained by AWS: retention mode `none` forced by SCP; no invocation logging; no body logging; unlinkable relay | Token-cost exhaustion: per-account budget, global spend alarm, circuit breaker to "Ask is resting, here are the guides" | Model used as a tool caller: no tools with side effects; no network from the model path |
| C7 Pipeline and Ops | Fake source page: allowlisted hosts, quote must be found in the saved copy | Altered snapshot: S3 Object Lock | Every approval in an append-only audit log | Ops sees no student data at all | Watcher flood: rate limits on detection, human triage | Stolen Ops session publishes a rule: hardware-key login, re-auth to publish, 2-of-3 signing |
| C8 Update channel | Fake bundle: TUF signatures checked on device | Rollback or freeze to old rules: TUF timestamp and snapshot roles, expiry | Signed, versioned bundles kept forever | CDN path logs reveal interests: one bundle for everyone, logs off | CDN outage: last good bundle stays; stale regime turns "Can't tell yet" (D65) | Compromised online key: targets key offline and threshold-signed |
| C9 Push and email | Spoofed Duly email: SPF, DKIM, DMARC at reject; "Duly will never" page | | | Payload reveals status to Apple, Google, a lock screen: content-free payloads, generic previews | Token churn: re-register on open | |
| C10 Crash reporting | | | | A stack trace or breadcrumb carries a date or name: allowlist scrubbing on device before send; no session replay; no UI text breadcrumbs | | |
| C11 CI/CD and agents | Phished maintainer publishes a poisoned package: cooling-off, provenance checks | Poisoned action or dependency: SHA pinning, lockfiles, ignore-scripts | Signed provenance per artifact | Secret theft from runners: no long-lived secrets; OIDC role per job | | Agent edits gates or tests: path ownership by lane, CODEOWNERS on crypto paths, hidden tests (security/threat-model.md) |

Top named scenarios, ranked for this population (detail in research-security 6.2 and BLUEPRINT 5.5): government demand for account data; a false rule published to everyone; a status leak on the lock screen, calendar or clipboard; a malicious dependency in the build; account takeover leading to device enrolment; a revocation or sync flaw; a malicious document exploiting a parser. New with D79: **question text exposure** (retention, logging, linkage, or compelled prospective collection at C6).

---

## 4. Verification standards to target

### 4.1 Web, API and Ops: OWASP ASVS 5.0

ASVS 5.0.0 was released in May 2025 (Verified, ASVS repository frontispiece). Its own guidance: Level 1 is "the minimum requirements" and about 20% of requirements; "Most applications should be striving to achieve" Level 2 (L1 plus L2 is about 70%); Level 3 is for "the highest levels of security"; and the choice is risk-based, with the example that "an early-stage startup that is only collecting limited sensitive data may decide to focus on Level 1" while "a bank may have difficulty justifying anything less than Level 3" (Verified).

**Recommendation:** Level 2 across the relay API (C4), web (C3), Ask service (C6) and Ops (C7), plus all Level 3 requirements in these 5.0 chapters, because immigration status is the asset and the crypto is the main control:
- V6 Authentication and V7 Session Management (passkeys, device-bound sessions),
- V8 Authorization (object-level checks on every blob and log segment),
- V11 Cryptography (and Appendix C),
- V14 Data Protection,
- V16 Security Logging and Error Handling.
Chapters that do not apply (V17 WebRTC; V10 OAuth if Duly does not run an OAuth server) are marked not applicable in a tailored copy, as ASVS 5.0 recommends forking and omitting irrelevant sections (Verified). ASVS 5.0 also requires that the approach to sensitive data be documented; this file and BLUEPRINT 5.2 are that documentation.

### 4.2 Mobile: OWASP MASVS and the MAS profiles

MASVS 2.1.0 (released 2024-01-18, Verified on GitHub releases) has eight control groups: STORAGE, CRYPTO, AUTH, NETWORK, PLATFORM, CODE, RESILIENCE, PRIVACY (Verified). The old levels L1, L2 and R were reworked into "MAS Profiles" in 2023 and again in 2026 (Verified, MASVS "Using the MASVS"). The MAS-L2 page is titled "Advanced Security" (Verified); the profile descriptions themselves did not render: MAS-L1 as the baseline for all apps, MAS-L2 for apps handling sensitive data, MAS-R for resilience against reverse engineering and tampering, MAS-P for privacy (Unverified wording).

**Recommendation:** MAS-L2 plus MAS-P on iPhone and Android. MAS-R only where it protects other students rather than hides code: app attestation at enrolment and on Ask (rate abuse), jailbreak and root detection as a signal shown to the student, not a block. Obfuscation is not a control Duly relies on; the design assumes the attacker reads the app.

Concrete items Duly already specifies that map to MASVS (BLUEPRINT 5.5): idle lock, app-switcher blur, no Spotlight or Siri indexing, vault excluded from cloud backup, secure text entry for SEVIS id and receipt numbers, clipboard expiry, generic notification previews, no widgets showing status by default.

### 4.3 Desktop: Electron checklist and fuses

The Electron security checklist has 20 items, from "Only load secure content" to "Do not expose Electron APIs to untrusted web content", including context isolation, process sandboxing, a Content Security Policy, limited navigation and window creation, no `shell.openExternal` with untrusted content, a current Electron version, validating the sender of IPC messages, custom protocols instead of `file://`, and checking fuses (Verified).

The fuses Duly should set at package time, with their shipped defaults (Verified on Electron's fuses page):

| Fuse | Default | Duly | Why |
|---|---|---|---|
| runAsNode | on | off | `ELECTRON_RUN_AS_NODE` turns the signed app into a Node runtime an attacker can drive |
| nodeOptions | on | off | `NODE_OPTIONS` and `NODE_EXTRA_CA_CERTS` injection |
| nodeCliInspect | on | off | `--inspect` and SIGUSR1 debugger attach |
| embeddedAsarIntegrityValidation | off | on | Validates app.asar on load; macOS and Windows only |
| onlyLoadAppFromAsar | off | on | No fallback to unvalidated code paths |
| grantFileProtocolExtraPrivileges | on | off | Duly serves pages from a custom protocol |
| cookieEncryption | off | on | One-way; needs code signing on macOS |

State of the repo today: desktop/src/guard.ts sets contextIsolation, sandbox, nodeIntegration off and webSecurity on, with tests; main.ts limits navigation and sets a permission handler; protocol.ts sets a CSP with a test. Fuses are not set yet, the package is unsigned, and package.json uses caret ranges (`"electron": "^44.4.5"`). Those three are the desktop gaps before a stranger installs it.

**Keys on desktop.** Electron's `safeStorage` encrypts with the OS store but does not by itself require user presence (Unverified behaviour per platform). The key that opens documents (DK_dev) needs presence, so it lives behind a small signed native helper: LocalAuthentication plus Keychain on macOS (documents-1 already specifies the duly-unlock helper), Windows Hello on Windows (documents-3). The renderer never receives K_vault or DK_dev; it asks the main process to open a specific item.

---

## 5. Encryption in transit

| Link | Control | Notes |
|---|---|---|
| Client to edge (CloudFront, ALB) | TLS 1.3 preferred, 1.2 floor; HSTS with preload after a stable month | ALB policies exist for TLS 1.3 only (`ELBSecurityPolicy-TLS13-1-3-2021-06`) and with post-quantum key exchange (`ELBSecurityPolicy-TLS13-1-3-PQ-2025-09`, `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09`) (Verified). **Trap:** the console default is the PQ 1.3/1.2 policy, but the default from the CLI, CloudFormation and the CDK is `ELBSecurityPolicy-2016-08` (Verified). Infrastructure code must name the policy explicitly, and a config check fails on any other |
| Edge to service | TLS inside the VPC | No plaintext hop even inside AWS |
| Service to RDS | TLS required at the server (`rds.force_ssl`, Unverified parameter name per engine version) | |
| Service to S3, KMS, Bedrock | VPC endpoints (PrivateLink) so traffic never needs internet egress | Bedrock supports VPC endpoints and PrivateLink (Verified, Bedrock data protection topics) |
| Bedrock cross-Region | AWS states cross-Region inference traffic stays on the AWS network, does not traverse the public internet, and is encrypted between Regions (Verified) | |
| AWS API minimum | AWS requires TLS 1.2 and recommends 1.3 for Bedrock (Verified) | |
| Device to device (pairing) | QR or PAKE channel, then content encrypted under K_vault; hybrid X25519 plus ML-KEM-768 proposed (BLUEPRINT 5.3) | End-to-end; TLS protects only metadata here |
| Push, email | APNs and FCM over their own TLS; SES with TLS required on outbound where the receiver supports it | Payloads content-free, so TLS failure exposes no status |

**Certificate pinning:** not used for confidentiality, because content is end-to-end encrypted and pinning causes outages on rotation. Exception worth a decision: the Ask request carries plaintext question text inside TLS. Pinning to the AWS-issued intermediate for the Ask endpoint, or to Duly's own public key for an OHTTP gateway (section 8.7), would stop a corporate or campus TLS-inspection proxy from reading questions. Proposal: OHTTP solves it without pinning, because the inner request is HPKE-encrypted to the gateway key, which the app ships with.

---

## 6. Encryption at rest

### 6.1 On the device

- Platform protection: iOS Data Protection class Complete for the vault, Keychain "when unlocked, this device only" with user presence; Android Keystore with StrongBox where present and `setUnlockedDeviceRequired`; FileVault and BitLocker are assumed absent, so Duly encrypts itself (Carried: research-security 3.3).
- Duly's own envelope: per-file key F, AEAD with bound additional data, 1 MiB chunks, padded sizes; HPKE (RFC 9180) envelopes proposed in place of the custom envelope before the format freezes (Carried: research-security F-S8).
- Local record store: SQLCipher on desktop (CLAUDE.md: SQLCipher only inside desktop/main) under K_local; the mobile equivalent is the platform database under a file protected by the same class plus K_local (Proposal; choose per platform in the storage section).
- Caches and temp files: thumbnails and rendered pages are D2 and live inside the vault, never in OS temp; a test lists temp directories after opening a document.

### 6.2 On the server

| Store | At-rest control | What it protects against | What it does not |
|---|---|---|---|
| S3 blobs | End-to-end ciphertext from the device, plus SSE-KMS with a customer managed key | Disk and AWS-side media exposure; a role without kms:Decrypt cannot read even ciphertext | Not end-to-end in itself; never describe SSE-KMS as end-to-end (Carried: the Zoom lesson) |
| RDS Postgres | Storage encryption with a KMS key; automated backups and snapshots inherit it (Unverified detail) | Snapshot theft, media | A database dump through the app role |
| Email column | Application-layer envelope encryption: a KMS data key per row or per batch, plus a keyed HMAC for lookup | A dump through SQL injection yields no emails without KMS access | The app role can still decrypt; KMS CloudTrail shows each use |
| CloudWatch Logs | KMS-encrypted log groups; no D2 by schema | | |
| Source snapshots (pipeline) | S3 Object Lock, SSE-KMS | Tampering with evidence of what the law said | Public data, so secrecy is not the goal |

AWS KMS keys are protected by FIPS 140-3 Security Level 3 validated HSMs and "never leave AWS KMS unencrypted" (Verified).

---

## 7. Key hierarchy

### 7.1 The student's keys

BLUEPRINT 5.2 is the single key schedule and is not repeated: K_vault (256-bit root, only ever wrapped), DK_dev (device unlock, platform store with presence), SK_dev (P-256 device signing key in Secure Enclave, StrongBox or TPM), K_sync and K_backup (HKDF from K_vault, never stored), SK_vault_sign (signs device list, header with epoch, checkpoints), F and K_item (per file and per sensitive fact, for crypto-shredding), R (128-bit recovery kit), K_local (per device, never syncs). Revocation rotates K_vault, K_sync and SK_vault_sign together under a new epoch.

Additions this document proposes:
- **K_ask (per device, optional):** not needed if Ask uses OHTTP, since HPKE keys are per request. Listed so nobody invents a long-lived Ask key.
- **Algorithm ids and versions** in every envelope header (already in 5.2) are a release gate: the parser refuses unknown ids rather than guessing.
- **One named human owns the key schedule** (BLUEPRINT 6, Security), and CODEOWNERS on crypto paths requires that person.

### 7.2 Duly's operational keys

| Key | Purpose | Kept | Who can use it | Rotation |
|---|---|---|---|---|
| TUF root | Signs the other TUF roles | Offline, hardware tokens, threshold 2 of 3 holders | Founder plus two named signers, in person or over a recorded ceremony | Yearly, or on any holder change |
| TUF targets | Signs rule and template bundles | Hardware tokens, threshold 2 of 3 | Same signers, at publish | Yearly |
| TUF snapshot, timestamp | Freshness against freeze and rollback | KMS asymmetric keys in the pipeline account, used by the publish job only | The publish role | Short expiry on timestamp metadata (Proposal: 1 day) |
| Freeze key | One key that can freeze a regime to "Can't tell yet" (BLUEPRINT 7 row 7) | Hardware token held by the founder | Founder | On use |
| Apple Developer ID and App Store keys | macOS and iOS signing | Apple-managed for App Store; Developer ID certificate private key on a hardware token or in a cloud HSM (Unverified options) | Release job after two-person approval | Per Apple expiry |
| Windows signing | Authenticode for the installer and updates | Microsoft Artifact Signing (formerly Trusted Signing), keys in FIPS 140-3 Level 3 HSMs, digest signing so the file never leaves the build machine (Verified) | Release job via OIDC | Managed by the service |
| Android | Upload key plus Play App Signing (Unverified detail) | Upload key in a hardware token; app signing key held by Google | Release job | Upload key resettable through Google |
| KMS: data keys | S3 SSE-KMS, RDS, email column, logs | KMS, one key per purpose per account | Narrow service roles; key policies deny the admin role decrypt | Automatic yearly rotation on |
| APNs and FCM credentials | Send wake-ups | Secrets Manager in prod, read by the push worker only | Push worker role | Yearly or on staff change |
| Support key | "Send my case to support" (BLUEPRINT 6) | Private half on one support laptop's hardware key | Support person | Bundles deleted after 7 days |
| CI to AWS | Deploys | No key: GitHub OIDC to a role per job, scoped by repository, branch and environment | Release workflow | Not applicable |

Rules: no operational key can open student data, because none exists on the server; agents in the factory hold no signing or cloud credentials (BLUEPRINT 5.5); break-glass roles alarm on use and expire.

---

## 8. Ask on Amazon Bedrock (D79)

### 8.1 What AWS says, verified 2026-10-01

| Claim | AWS wording | Source |
|---|---|---|
| No training | "AWS and the third-party model providers will not use any inputs to or outputs from Amazon Bedrock to train Amazon Nova, Amazon Titan, or any third-party models." | Bedrock FAQ |
| Not shared with providers | "Users' inputs and model outputs are not shared with any model providers." | Bedrock FAQ |
| Provider has no access | Each Region has a model deployment account per provider, "owned and operated by the Amazon Bedrock service team. Model providers don't have any access to those accounts", so "they don't have access to Amazon Bedrock logs or to customer prompts and completions." | Bedrock data protection |
| Operator access | Bedrock uses a "zero operator access (ZOA) data security model ... no operators of the service can access model input or output", and "by default, Amazon Bedrock does not store model inputs or outputs." | Bedrock abuse detection |
| Exceptions to default no-storage | "For Anthropic Claude Fable 5 and Claude Fable 5.1, all traffic will be retained for up to 30 days for automated offline abuse detection. Classifier-flagged traffic will be subject to potential human review performed by AWS." Retained data "are not shared with third-party model providers." | Bedrock abuse detection |
| Retention modes | `none` < `default` < `aws_review` < `provider_data_share` (legacy); `inherit` defers to a broader scope. `none`: "No request or response data is written to durable storage by AWS or shared with the model provider." | Bedrock data retention |
| Per-model requirement | Fable 5 and 5.1 have `allowed_modes: ["aws_review", "provider_data_share"]`; the documented example for Claude Opus 4.8 is `["none", "default", "aws_review", "provider_data_share"]`, so "data is not retained whatever mode you set." | Bedrock data retention |
| Fail closed | With an effective mode below the model's requirement, the model is "unavailable" on bedrock-mantle and requests "fail with a ValidationException" on bedrock-runtime. | Bedrock data retention |
| Scope of the setting | Per Region, at account level (and per project on bedrock-mantle); "does not propagate to other Regions. A Region you have not configured remains at inherit and falls back to each model's default." | Bedrock data retention |
| Enforcement | SCP on `bedrock-mantle:PutAccountDataRetention`, `CreateProject`, `UpdateProject` with condition `bedrock-mantle:DataRetentionMode`, and on `bedrock:PutAccountDataRetention` with `bedrock:DataRetentionMode` | Bedrock data retention |
| ZDR for Claude | "ZDR eligibility for Claude models is managed by Anthropic." | Bedrock data retention |
| Invocation logging | "Model invocation logging is disabled by default." When on, it stores full request and response bodies until the configuration is deleted. | Bedrock model invocation logging |
| Region | "Any customer content processed by Amazon Bedrock is encrypted and stored at rest in the AWS Region where you are using Amazon Bedrock." | Bedrock FAQ |
| Cross-Region | Geographic profiles route within the geography (US, EU, APAC); global profiles route to "any supported AWS commercial Region worldwide"; a geographic profile's destination list "will never change"; retained data is stored in the destination Region; requests can reach Regions not enabled in the account, including opt-in Regions. | Cross-Region inference; inference profiles support |
| Certifications | SOC 1, 2, 3 scope; HIPAA eligible; ISO 27001, 27017, 27018, 27701 | Bedrock FAQ |

Note for the reader: the Bedrock pages were read through a summarising fetch; the retention, abuse-detection and logging pages came back verbatim. Re-read them at each model change, since AWS changed this area in 2026.

### 8.2 What this means for D79

- "No training" and "not shared with Anthropic" hold for every Bedrock model (Verified).
- "No provider retention" holds **only for models that allow `none`**. Fable 5 and Fable 5.1 retain everything for up to 30 days inside AWS with possible human review, so they are out unless the founder changes D79, or Anthropic grants ZDR for Duly's account (AWS says Claude ZDR is managed by Anthropic; an Enterprise Frontier Safeguards path gives ZDR only through 2026-12-31).
- The `default` mode does not mean zero: AWS "may retain the data for safety and abuse-prevention purposes" under `default` (Verified). Duly sets `none` explicitly.

### 8.3 Configuration (Proposal, each line a check in CI or AWS Config)

1. **A separate AWS account for Ask** (the "assistant account" BLUEPRINT 6 deferred until a model was approved). Nothing else runs there; no student-data store exists there.
2. **Retention `none` at account level in every Region the inference profile can reach**, set on both endpoints (`PUT /data-retention` on the control plane and `PUT /v1/data_retention` on bedrock-mantle), because the setting is per Region and unset Regions fall back to model defaults.
3. **SCP on the assistant account's organizational unit**, copied from AWS's documented example:
   ```json
   [
     {"Effect": "Deny",
      "Action": ["bedrock-mantle:PutAccountDataRetention", "bedrock-mantle:CreateProject", "bedrock-mantle:UpdateProject"],
      "Resource": "*",
      "Condition": {"StringNotEquals": {"bedrock-mantle:DataRetentionMode": "none"}}},
     {"Effect": "Deny",
      "Action": ["bedrock:PutAccountDataRetention"],
      "Resource": "*",
      "Condition": {"StringNotEquals": {"bedrock:DataRetentionMode": "none"}}},
     {"Effect": "Deny",
      "Action": ["bedrock:PutModelInvocationLoggingConfiguration"],
      "Resource": "*"}
   ]
   ```
   The third statement (Proposal) keeps invocation logging off for good. Check the exact `Resource` support per action before applying (Unverified).
4. **Model allowlist:** the Ask role may invoke only the named inference profile ARN and its foundation-model ARNs; no wildcard. A daily job calls `GET /v1/models/{model}` on bedrock-mantle and alerts if the effective mode is not `none` or `allowed_modes` lacks `none`.
5. **Region allowlist:** SCP denies Bedrock invoke outside us-west-2 and the destination Regions of the chosen US profile; global profiles need `aws:RequestedRegion` "unspecified" (Verified), so not allowing that blocks them. CloudTrail's `additionalEventData.inferenceRegion` shows where each request ran (Verified); a metric alarms on any Region outside the list.
6. **No bodies in Duly's own logs:** the Ask service logs request id, template id, token counts, latency, outcome; never the question or the answer. Same fixed-field schema as BLUEPRINT 6 Observability.
7. **VPC endpoint for Bedrock**, no internet egress from the Ask service.
8. **Spend guard:** AWS Budgets alarm and a per-account daily token budget; on breach, Ask falls back to the on-device router and guides.

### 8.4 Region choice

Pin to the **US geographic profile** at minimum, never global. If the chosen model's card lists in-Region availability in us-west-2, prefer in-Region on-demand inference, which keeps processing in the Region D54 names; otherwise the US profile, stating "processed in AWS data centres in the United States". Which current Claude models offer in-Region us-west-2 and which US Regions their profile reaches must be read off each model card (Unverified for any specific model; AWS gives the example that one US profile called from us-west-2 reaches us-east-1 and us-west-2 only).

### 8.5 Payload rules (D60 and BOUNDARY)

- No document file, image, or value read from a document ever enters a request (D60). Names, SEVIS ids, receipt numbers, passport numbers never do.
- The engine supplies every date and count; the model never receives the student's dates as numbers to reason over. Proposal: the request carries the question text, the ids of candidate guides, and typed slot names ("program_end_date: known"), and the device fills values into the signed template after the answer returns. This keeps D79 ("Ask reasons with Claude") and BOUNDARY ("no model states a date") both true.
- Values are scrubbed on device before send (BLUEPRINT 4.2): a tokenising scrubber removes digits that look like ids or dates, email addresses, and school names from the bundle's school list, and replaces them with typed placeholders. The recorded-bytes test plants canaries and fails the build if any reaches the Ask request.
- Output passes the validator (BLUEPRINT 4.3): citation and form ids from the allowlist only, no spelled-out or relative numbers, template ids only. Model text that fails becomes the step back to the DSO draft.

### 8.6 Tests that make each consent sentence true

| Sentence the student reads | Test |
|---|---|
| "Not used to train any model" | Contractual (AWS FAQ); recorded in the bundle's legal notes with the date read |
| "Not kept after the answer" | Daily retention-mode probe in every allowed Region; SCP present; invocation logging configuration absent |
| "Not shared with Anthropic" | Contractual (AWS data protection page) |
| "Your documents and their details are not sent" | Recorded-bytes canary test on every release |
| "Processed in the United States" | Region SCP plus CloudTrail inferenceRegion alarm |
| "Duly cannot tell which questions are yours" | Only true with the relay in 8.7; until then, do not say it |

### 8.7 Linkage: the real exposure

Even with zero retention at AWS, Duly's Ask service sees question text in memory, and the request arrives with an account token and an IP address. A court could order prospective collection at that point (section 13). Two layers, both from BLUEPRINT 4.2 and 6:
- **Oblivious HTTP (RFC 9458):** the app HPKE-encrypts the request to Duly's gateway key and sends it through a relay run by a different organisation; the relay sees the IP but not the content, the gateway sees the content but not the IP. Third-party OHTTP relay services exist (Unverified vendors and prices).
- **Privacy Pass tokens (RFC 9576 to 9578, Unverified numbers):** the app redeems unlinkable tokens issued per account per day for rate limiting, so the Ask service enforces limits without knowing who asked.
Until both exist, the honest sentence is "Duly does not store your questions"; not "cannot see".

### 8.8 Prototype helper

D79 allows a local helper that sends the fictional sample student's record to Claude through the founder's Claude Code login, for prototype testing only. Controls: synthetic data only, enforced by refusing any record without the synthetic marker; the helper lives outside every release target; the CI gate in 9.6 fails a release that contains the ANTHROPIC provider, an `api.anthropic.com` hostname, or the helper's module.

---

## 9. Secure software supply chain

### 9.1 Targets

| Practice | Target | Source |
|---|---|---|
| SLSA Build track | **L2 now**: hosted builds with signed provenance; **L3** before backup ships: builds isolated so runs cannot influence each other and signing material is unreachable from build steps | SLSA v1.1 levels (Verified) |
| How on GitHub | Artifact attestations give "SLSA v1.0 Build Level 2" by themselves; Level 3 by running the build "in a reusable workflow that many repositories across your organization share"; private repositories use GitHub's own Sigstore instance | GitHub docs (Verified) |
| SBOM | CycloneDX (or SPDX) per release per platform, attested with the artifact; field set per CISA's 2025 minimum elements (a draft published 2025-08-22, comments to 2025-10-03; final status Unverified) | CISA (Verified as draft) |

### 9.2 Dependencies

- **Lockfiles and exact installs:** `npm ci`, `uv sync --locked`, `cargo build --locked` for the Rust engine port (BLUEPRINT 6). No caret ranges for anything in a release target; desktop/package.json uses carets today (gap).
- **Cooling-off on new versions:** npm has `min-release-age` ("only versions that were available more than the given number of days ago will be installed", Verified); pnpm has `minimumReleaseAge`, added in 10.16.0, default 1440 minutes from v11 (Verified). Proposal: 7 days, matching research-security 8, with a named exception list for urgent security fixes reviewed by a human.
- **Install scripts off:** npm `ignore-scripts` ("npm does not run scripts specified in package.json files", Verified), with an allowlist for the few that need native builds.
- **No new dependency from a lane** (existing rule); a new dependency needs founder approval and a maintainer and install-script review. For Rust, `cargo-vet` or `cargo-deny` to record that review (Unverified tool fit).
- **Scanning:** OSV-Scanner or `npm audit` on every push; Semgrep rules already in security/semgrep; CodeQL on the TypeScript and Python; secret scanning with push protection.
- **Why:** xz utils 2024; the September 2025 npm compromise of chalk and debug and the Shai-Hulud worm that harvested CI and cloud tokens (Carried: research-security 8, CISA alerts).

### 9.3 CI

- **Pin every GitHub Action to a full commit SHA**, not a tag. Today ci.yml and tag-main.yml use `actions/checkout@v4`, `astral-sh/setup-uv@v5`, `actions/setup-node@v4` (gap). The March 2025 tj-actions/changed-files compromise rewrote tags to point at malicious code (Unverified detail, CISA alert of 2025-03-18 not fetched in this pass).
- **OIDC only**, one role per workflow and environment, conditions on repository and ref; no AWS keys in GitHub secrets.
- **Least-privilege `permissions:`** block at the top of every workflow; `pull_request_target` banned.
- **Release environment** with required reviewers: the founder plus the second signer (BLUEPRINT 7 row 15).
- **Factory agents** run without network to package registries except through a pinned mirror, and never hold signing or cloud credentials.

### 9.4 Signed builds per platform

| Platform | Signing | Update integrity |
|---|---|---|
| macOS | Developer ID signing, hardened runtime, notarization (Apple docs, Unverified detail); Electron `cookieEncryption` needs code signing (Verified) | Updater verifies the code signature before install; updates served from Duly's own origin |
| Windows | Microsoft Artifact Signing, FIPS 140-3 Level 3 HSMs, digest signing (Verified); SmartScreen reputation behaviour Unverified | Updater checks Authenticode publisher before install |
| iPhone | App Store signing | App Store |
| Android | Play App Signing with a separate upload key (Unverified detail); sideload builds not offered | Play |
| Web | Immutable versioned bundles, SRI on every script, release hashes published to an append-only log before records or documents are allowed on the web (BLUEPRINT 5.5) | Code Verify pattern (Carried) |
| Rule bundles | TUF: offline root, 2-of-3 targets, staged rollout 1% to 10% to 100%, kill switch, signed rollback; bundles carry data only | TUF defends against endless replay of the same file, rollback to older versions, mix-and-match, and compromised keys (Verified overview) |

Electron releases: Electron supports a limited window of recent majors (Unverified count); the release checklist fails if the bundled Electron is out of support.

### 9.5 Reproducibility

Web bundles reproducible from a tagged commit (hash match by a second builder) before the web gets records. Desktop and mobile: provenance attestations rather than bit-for-bit reproduction at first.

### 9.6 Release gates added by this document

1. Provenance attestation present and verified for every artifact.
2. SBOM present; no component with a known critical vulnerability without a written exception.
3. No Anthropic provider, hostname or prototype helper in any release artifact (8.8).
4. Electron fuses read back from the packaged binary match 4.3.
5. Every Action pinned by SHA; no workflow has write permissions it does not use.
6. Recorded-bytes canary test passes on each platform, including the Ask canary.

---

## 10. Penetration testing and audits

| When | What | By whom | Gate for |
|---|---|---|---|
| Before Phase 5 (pairing and sync) code | Written protocol spec; Tamarin or ProVerif model of pairing, revocation and epochs (BLUEPRINT 6) | Named security reviewer, outside cryptographer review | Writing sync code |
| Each release | ASVS L2 and MASTG checklists self-assessed in CI where automatable; fuzzing of every envelope, event and bundle parser | Engineering | Release |
| Before sync or backup reaches a stranger | **Outside cryptography audit** of the key schedule, envelopes, pairing, revocation, recovery | A firm with published E2E audits (for example NCC Group, Trail of Bits, Cure53, Least Authority; Unverified availability and prices) | Phase 6 |
| Same window | **Pen test**: both mobile apps against MAS-L2 plus MAS-P; Electron app (IPC, protocol handler, updater, fuses); API and web against ASVS L2 with the L3 chapters; Ask service including prompt injection and payload canaries | Outside firm | First strangers |
| Same window | Cloud configuration review: AWS organization, SCPs, IAM, S3, KMS key policies, logging | Outside or AWS Security Hub plus Prowler as a floor (Unverified tool fit) | First strangers |
| Yearly and on any crypto change | Repeat audit and pen test; tabletop on a government demand and on a false rule | Outside firm; founder, counsel, IR firm | Continuing |
| From first stranger | Vulnerability disclosure policy and `/.well-known/security.txt` (RFC 9116, Unverified number); safe harbour language from counsel | Founder | First strangers |
| After stability | Paid bug bounty | Platform vendor | Later |

AWS rules: no prior approval is needed to test listed services including EC2, RDS, CloudFront, API Gateway, Lambda, ECS, Fargate and ELB; anything with command and control needs approval; DoS and request flooding, Route 53 zone walking, and subdomain or S3 bucket takeover are prohibited; simulated phishing or red team events need a form two weeks ahead (Verified). Bedrock model endpoints are not in the listed set (Verified list includes "Bedrock AgentCore", not Bedrock runtime), so Ask testing targets Duly's Ask service, not AWS's endpoint.

Publish a summary of each audit with findings and fixes. School partners may ask for a HECVAT questionnaire and later SOC 2 (Unverified need; decide when a school asks).

---

## 11. Privacy law exposure

Not legal advice. Each row goes to counsel (research-security F-S6).

### 11.1 Immigration status as sensitive data

| Law | What it says | Status | Effect |
|---|---|---|---|
| California CCPA as amended by AB 947 | Citizenship or immigration status is "sensitive personal information" since 2024-01-01; consumers can limit its use; thresholds include $26.625M revenue or 100,000 California consumers | Carried | Use it only to provide the service; a "limit the use" link is moot if Duly never uses it for anything else, but say so |
| Virginia VCDPA, Va. Code 59.1-575 | "Sensitive data" includes "Personal data revealing ... citizenship or immigration status" | Verified | Opt-in consent before processing; data protection assessment |
| Maryland MODPA, Md. Com. Law 14-4701(gg), 14-4702, 14-4707 | Sensitive data includes "Citizenship or immigration status" and "National origin"; collecting or processing sensitive data only where "strictly necessary to provide or maintain a specific product or service requested by the consumer"; "A controller may not ... Sell sensitive data"; applies at 35,000 consumers (or 10,000 with over 20% of revenue from sales) | Verified | **The strictest design target.** Every server-side field must pass "strictly necessary". Duly's on-device design meets this best; Ask question text is the field to justify |
| Colorado, Connecticut, Delaware, Indiana, Montana, Oregon, Tennessee, Texas | Opt-in consent before processing sensitive data, which includes citizenship or immigration status in these laws | Carried (secondary sources; a 2023 article fetched today lists the opt-in states but its summary did not confirm the immigration-status wording per state) | Explicit consent at setup; written assessment |
| Texas TDPSA | No revenue or volume threshold; small businesses mostly exempt but still need consent to sell sensitive data | Carried | Never sell |
| California SB 361 (data brokers) | From 2026-01-01 brokers disclose whether they collect immigration status and share with federal agencies | Carried | Duly is never a data broker |
| California AB 1542 | Would have banned selling or sharing immigration status data; vetoed 2026-09-28 | Carried | Duly's promise must exceed the law |
| FTC Act Section 5 | Misstating encryption or privacy is deceptive (Zoom order) | Carried | Every security sentence tied to a test (8.6) |
| GDPR, India DPDP Act | May reach prospective students using Duly from abroad before arrival | Unverified, counsel | Decide whether to serve pre-arrival users outside the US |
| FERPA | Binds schools, not Duly, unless Duly contracts as a school's service provider | Unverified, counsel | Matters only for a school partnership |

**Design to the strictest, now, before thresholds bite** (Proposal): explicit opt-in at setup naming immigration status, documents, and Ask processing by AWS; a written data protection assessment kept current; no sale or sharing of any data; no third-party analytics, ad or attribution SDKs in any client (already a rule); purpose limited to the service the student asked for; deletion on request (section 12).

### 11.2 Breach notification

- **California Civil Code 1798.82** (Verified): notice "within 30 calendar days of discovery or notification of the data breach"; a sample notice to the Attorney General "within 15 calendar days of notifying affected consumers" when "more than 500 California residents" are affected; personal information includes "passport number ... or other unique identification number issued on a government document"; encrypted data counts when the key or credential was, or is reasonably believed to have been, acquired.
- **Every state** has a breach law, commonly with an encryption exemption (Carried, NCSL). The runbook carries each state's clock; build to 30 days.
- **What would be notifiable:** ciphertext alone, with keys never on the server, likely is not (counsel confirms). The email list in context reveals likely non-citizen status; treat a leak of it as notifiable by policy even where the law does not require it (Proposal).
- **Ask:** a breach of the Ask service while running could expose question text in memory; the retention design means there is no stored archive to lose.

---

## 12. Data retention and deletion

### 12.1 Retention table (Proposal; numbers published in the privacy policy)

| Data | Where | Kept | Deleted by |
|---|---|---|---|
| Record, documents, keys | Student's devices | Until the student deletes | Student |
| Encrypted log segments and blobs | S3 | While the account exists and backup is on | Account deletion or "delete my backup"; Object Lock governance window then removal (proposal 14 days, research-security F-S5) |
| Wrapped keys, device list, vault header | RDS | While the account exists | Account deletion: deleted first, which crypto-shreds everything else |
| Email (encrypted), passkey public keys | RDS | While the account exists | Account deletion |
| RDS automated backups and snapshots | AWS | Proposal 7 days (RDS allows up to 35, Unverified) | Expiry; the policy states that deleted accounts persist in backups up to 7 days |
| Push tokens | RDS | Until the device is removed or the token is rejected | Automatic |
| IP addresses, WAF, ALB, edge logs | Security account | 7 days (BLUEPRINT 6) | Lifecycle rule |
| CDN logs for the rule bundle path | None | Off | Not collected |
| Application logs (fixed schema, no D2) | CloudWatch | 30 days | Retention setting |
| CloudTrail | Security account, Object Lock | 1 year (security need; holds IAM principals, not students) | Lifecycle |
| Ask request and response bodies | Nowhere durable | 0 | Not written; retention `none` at AWS |
| Ask metadata (template id, token counts) | CloudWatch, unlinkable to account once 8.7 ships | 30 days | Retention setting |
| Crash reports | Platform consoles; Sentry if used | 30 days | Vendor retention setting |
| Support bundles | Support store, encrypted to the support key | 7 days (BLUEPRINT 6) | Automatic |
| Email send logs (SES) | AWS | Shortest available (Unverified setting) | |
| Source snapshots of the law | Pipeline S3, Object Lock | Indefinitely (public law; audit trail) | Not deleted |

### 12.2 Deletion flows

- **Per item (crypto-shred):** deleting a document or a sensitive fact deletes its K_item or F everywhere; the ciphertext becomes unreadable at once, then is removed by lifecycle (BLUEPRINT 5.2).
- **Device removal:** epoch rotation; the removed device keeps what it already downloaded (stated).
- **Account deletion:** delete wrapped keys and the vault header first (crypto-shred), then rows, then blobs; a receipt loop closes on every remaining device: "Your backup is deleted now and gone for good within 14 days." Destructive actions take the security delay and a fresh unlock (research-security 3.5).
- **Object Lock versus deletion requests:** governance mode lets a narrowly held permission delete early; compliance mode lets no one, not even root (Carried). Counsel confirms that a 14-day window is consistent with state deletion duties.
- **Preservation requests:** a 2703(f) request obliges preserving records that exist for 90 days, renewable once (Verified). It cannot create data Duly never collects. Policy: honour a valid preservation request, tell the student when allowed, and never extend a retention window by general practice "just in case".

---

## 13. Government data requests

### 13.1 The instruments (Verified on Cornell LII, 2026-10-01)

| Instrument | What it can reach | Note |
|---|---|---|
| Administrative subpoena, 18 U.S.C. 2703(c)(2) | Name; address; session times and durations; length and types of service; "subscriber number or identity, including any temporarily assigned network address"; "means and source of payment" | No judge. This is what Duly's email, IP logs and upload times would answer |
| Immigration officer subpoena, 8 U.S.C. 1225(d)(4) | "the production of books, papers, and documents" related to immigration matters; enforced by asking a district court, with contempt for refusal | Whether it reaches a provider's stored data, and how it interacts with the SCA, is a counsel question (Unverified) |
| Court order, 2703(d), and warrant, 2703(a) | More detailed records; contents require a warrant for recent communications | Contents on Duly's server are ciphertext |
| Gag order, 18 U.S.C. 2705(b) | A court can forbid notifying the customer on findings such as danger to life, flight, evidence destruction, witness intimidation or jeopardising an investigation | Challenge where overbroad or indefinite |
| Preservation, 2703(f) | Keep existing records 90 days, plus 90 more on renewal | |
| Prospective collection (pen register or wiretap orders) | Future metadata or content as it arrives | Relevant to Ask question text in memory; Unverified applicability, counsel |

Whether Duly is an "electronic communications service" or "remote computing service" under the Stored Communications Act decides which of these apply; counsel answers (Unverified).

Precedent for this population: DHS sent hundreds of administrative subpoenas to large platforms in 2026; Google gave a Cornell student's data to ICE under an administrative subpoena with a reported gag (Carried, research-security 6.2).

### 13.2 What Duly could hand over, published exactly

Email (or relay address), passkey public keys, device list (public keys, device model names if stored: proposal, store a generic class only), upload times and padded sizes for 14 days of deleted data, IP addresses for 7 days, push tokens. No nationality, school, SEVIS id, dates, document kinds, questions or answers. The published list is a test: a script compares the database schema against it on every release.

### 13.3 Policy (Proposal; counsel writes the final)

1. Legal process required; no voluntary disclosure on an administrative subpoena where the law does not compel it.
2. Notify the student before disclosure unless a court order forbids it; challenge gag orders that lack an end date.
3. Narrow every response to the request; push back on overbreadth.
4. Transparency report twice a year from the first stranger, including zero counts.
5. No ability to add a device, push targeted code, or turn on logging for one user: the signed device list, signed and attested builds, and SCP-locked logging make a compelled change visible or impossible. Apple's 2016 All Writs Act dispute is the precedent for compelled code (Unverified, not fetched).
6. Push records: Apple and Google hold push metadata; Duly keeps payloads content-free and push opt-in (Carried; the 2023 Wyden letter remains Unverified).

### 13.4 Design answers, already in the blueprint

Hold almost nothing; one public bundle fetched without auth with CDN path logs off; content-free push; relay addresses welcome; short IP logs; Ask unlinkable (8.7); a playbook with the founder, counsel and the IR firm named, rehearsed in the yearly tabletop.

---

## 14. Security operations, briefly

Other architecture sections own observability and error tracking; the security rules for them:

- **Org-wide CloudTrail** to the security account with Object Lock; GuardDuty and Security Hub on in every account (Unverified cost at Duly's scale); IAM Access Analyzer for external access.
- **Logs on a fixed field schema** with no D2; CloudWatch data masking as a second layer (BLUEPRINT 6).
- **Error tracking:** platform crash reports by default. If Sentry is used, configure: personal data off, `beforeSend` and `beforeBreadcrumb` hooks with an allowlist (drop every string field not on the list), no UI text or URL query breadcrumbs, no Session Replay, server-side scrubbing on as a second layer (Sentry documents `beforeSend*` hooks and server-side scrubbing, Verified; the default of the personal-data setting did not render, Unverified), IP storage off, US data region, 30-day retention. Self-hosting removes the processor question at an operations cost.
- **Secrets:** Secrets Manager only; no secrets in environment files in images; rotation alarms.
- **Incident response:** runbook timed to the 30-day California clock and the 15-day Attorney General copy; a retained IR firm; on-call; a severity rule that any wrong date is an incident (BLUEPRINT 6).
- **People:** hardware security keys for every human with AWS, GitHub, Apple, Google Play, Microsoft and domain registrar access; no SMS anywhere; registrar lock on duly domains.

---

## 15. Security gates by phase (maps to BLUEPRINT 8)

| Phase | Security gate |
|---|---|
| 2 Desktop slice | Electron fuses set and read back; signed and notarized Mac build; signed Windows build; caret ranges removed; Actions pinned by SHA; SBOM and provenance on the desktop artifact |
| 3 Engine port | Rust crate locked and reviewed; fuzzing of the event and bundle parsers; golden vectors |
| 4 iPhone local-only | MAS-L2 and MAS-P self-assessment; recorded-bytes canary on device; reader has no network |
| 5 Pairing and sync | Protocol spec and formal model first; revocation test; forged device list refused |
| 6 Backup | Outside crypto audit and pen test; Object Lock; government request policy and retention table published; counsel sign-off on consent; restore drill |
| 7 Updates publish | TUF ceremony with offline root; 2-of-3 signers named; staged rollout and kill switch tested |
| 8 Ask | Assistant account with SCPs in 8.3; retention probe green in every allowed Region; payload canary test; validator; OHTTP and tokens before the copy says "cannot tell which questions are yours" |
| 9 First strangers | VDP and security.txt; IR firm; tabletop done; transparency report template |

---

## 16. Decisions for the founder

1. **Ask model under D79:** only Bedrock models whose `allowed_modes` include `none` (excludes Fable 5 and 5.1 as documented today), or accept 30-day AWS retention with possible AWS human review for a stronger model and change the D79 wording. Recommendation: `none` only.
2. **Ask Region:** in-Region us-west-2 where the chosen model offers it, else the US geographic profile; never global. Recommendation: as stated.
3. **Ask linkage:** fund an OHTTP relay and Privacy Pass tokens before Ask reaches strangers, or launch Ask with the weaker sentence "Duly does not store your questions". Recommendation: launch with the weaker sentence only if the relay is less than one phase behind.
4. **What Ask receives:** question text plus guide ids and slot names, never the student's values (8.5). Recommendation: yes; it keeps D60 and BOUNDARY intact.
5. **Verification targets:** ASVS 5.0 L2 plus the L3 chapters in 4.1; MAS-L2 plus MAS-P on mobile. Recommendation: yes.
6. **Supply chain:** SLSA L2 now, L3 before backup; 7-day cooling-off; Actions by SHA. Recommendation: yes.
7. **Retention numbers** in 12.1, especially RDS backups at 7 days and Object Lock at 14 days.
8. **Error tracking:** platform crash reports only at first, or Sentry with the 14 configuration, or self-hosted. Recommendation: platform crash reports first; add Sentry configured as in 14 if crash data proves insufficient.
9. **Counsel brief** (adds to research-security F-S6): Maryland "strictly necessary" applied to Ask question text; SCA status of Duly; 8 U.S.C. 1225(d) reach; consent wording for AWS processing; Object Lock window against deletion duties; whether to serve pre-arrival users abroad.
10. **Budget and people:** second release signer, human security reviewer on crypto paths, outside crypto audit, pen test, IR retainer (BLUEPRINT 9 item 16).

---

## 17. Sources

Verified on 2026-10-01 (read in this pass):
- AWS, Amazon Bedrock data protection: https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html
- AWS, Amazon Bedrock data retention: https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html
- AWS, Amazon Bedrock abuse detection: https://docs.aws.amazon.com/bedrock/latest/userguide/abuse-detection.html
- AWS, Amazon Bedrock model invocation logging: https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html
- AWS, Bedrock cross-Region inference: https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html
- AWS, Supported Regions and models for inference profiles: https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html
- AWS, Amazon Bedrock FAQs: https://aws.amazon.com/bedrock/faqs/
- AWS, KMS overview (FIPS 140-3 Level 3 HSMs): https://docs.aws.amazon.com/kms/latest/developerguide/overview.html
- AWS, ALB security policies: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS, Penetration testing policy: https://aws.amazon.com/security/penetration-testing/
- OWASP ASVS project: https://owasp.org/www-project-application-security-verification-standard/
- OWASP ASVS 5.0, What is the ASVS (levels): https://github.com/OWASP/ASVS/blob/master/5.0/en/0x03-What-is-the-ASVS.md
- OWASP ASVS 5.0 frontispiece (version and date): https://github.com/OWASP/ASVS/blob/master/5.0/en/0x01-Frontispiece.md
- OWASP MASVS: https://mas.owasp.org/MASVS/
- OWASP MASVS, Using the MASVS (profiles rework): https://github.com/OWASP/masvs/blob/master/Document/03-Using_the_MASVS.md
- OWASP MASVS releases (v2.1.0): https://github.com/OWASP/masvs/releases
- OWASP MAS-L2 profile page (title only rendered): https://mas.owasp.org/Profiles/MAS-L2/
- SLSA v1.1 levels: https://slsa.dev/spec/v1.1/levels
- GitHub, Artifact attestations: https://docs.github.com/en/actions/concepts/security/artifact-attestations
- CISA, 2025 Minimum Elements for an SBOM (draft): https://www.cisa.gov/resources-tools/resources/2025-minimum-elements-software-bill-materials-sbom
- npm config (min-release-age, ignore-scripts): https://docs.npmjs.com/cli/v11/using-npm/config
- pnpm dependency resolution settings (minimumReleaseAge): https://pnpm.io/settings/dependency-resolution
- Electron security checklist: https://www.electronjs.org/docs/latest/tutorial/security
- Electron fuses: https://www.electronjs.org/docs/latest/tutorial/fuses
- Microsoft, Artifact Signing overview: https://learn.microsoft.com/en-us/azure/artifact-signing/overview
- Sentry, Scrubbing sensitive data (JavaScript): https://docs.sentry.io/platforms/javascript/data-management/sensitive-data/
- The Update Framework overview: https://theupdateframework.io/docs/overview/
- Virginia Code 59.1-575 (definitions): https://law.lis.virginia.gov/vacode/title59.1/chapter53/section59.1-575/
- Maryland Commercial Law 14-4701 (definitions): https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4701&enactments=false
- Maryland Commercial Law 14-4702 (applicability): https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4702&enactments=false
- Maryland Commercial Law 14-4707 (sensitive data, sale ban, minimization): https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4707&enactments=false
- California Civil Code 1798.82: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82
- National Law Review, sensitive personal information under state laws (2023): https://natlawreview.com/article/update-processing-sensitive-personal-information-under-us-state-privacy-laws-0
- 18 U.S.C. 2703: https://www.law.cornell.edu/uscode/text/18/2703
- 18 U.S.C. 2705: https://www.law.cornell.edu/uscode/text/18/2705
- 8 U.S.C. 1225: https://www.law.cornell.edu/uscode/text/8/1225

Carried from research-security.md and BLUEPRINT.md (their citations, not re-fetched): Microsoft STRIDE; Apple Platform Security pages; Android Keystore; NIST SP 800-63B; RFC 9180 (HPKE); FIPS 203 (ML-KEM); RFC 9458 (Oblivious HTTP); Code Verify; S3 Object Lock; CloudFront access logs; CISA xz and Shai-Hulud alerts; FTC Zoom order; CCPA AB 947 and CPPA FAQ; Texas TDPSA; California SB 361 and AB 1542; NCSL breach laws; TechCrunch on Google and ICE; DHS subpoena reporting.

Unverified in this pass (check before relying):
- MAS-L1, MAS-R and MAS-P profile wording (pages did not render beyond titles).
- Which current Claude models offer in-Region us-west-2 on Bedrock, and the exact destination Regions of their US profiles.
- Exact `Resource` support for the SCP statements in 8.3, and that denying `bedrock:PutModelInvocationLoggingConfiguration` covers both endpoints.
- `rds.force_ssl` parameter naming per engine version; RDS backup retention maximum of 35 days.
- Apple Developer ID notarization steps; Play App Signing details; App Attest and Play Integrity details; SmartScreen reputation under Artifact Signing.
- Electron's supported-major-versions window; Electron `safeStorage` presence behaviour.
- tj-actions/changed-files compromise details (CISA alert 2025-03-18).
- Privacy Pass RFC numbers (9576 to 9578) and OHTTP relay vendors.
- RFC 9116 (security.txt) number.
- GDPR and India DPDP reach to pre-arrival users; FERPA in a school partnership; SCA status of Duly; reach of 8 U.S.C. 1225(d) subpoenas to providers; Apple 2016 All Writs Act case details.
- Sentry `sendDefaultPii` default and Session Replay masking defaults.
- Audit and pen test firm availability and prices; GuardDuty and Security Hub cost at Duly's scale.
