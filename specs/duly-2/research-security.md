# Duly 2: secure document storage on phone, laptop and web

Research and a concrete design. Written 2026-09-30. Every external claim carries its URL in brackets; the full list is in section 13. Where a claim could not be confirmed in this pass it says "unverified". Values from DECISIONS.md and specs/documents-1/SPEC.md are cited by their number.

This report extends documents-1 (the encrypted vault on the Mac, its keys D, K, U, V, F and R, the sandboxed reader, the recovery kit and the backup design in section 12). It does not replace it. Where this report proposes a change to documents-1, it says so and it goes to the founder.

---

## 0. Summary

1. The products that do this well (1Password, Proton Drive, Tresorit, Apple Advanced Data Protection, Signal) share one shape: keys are made on the device, the server stores only ciphertext and wrapped keys, a new device gets keys from an old device or from a high-entropy recovery secret, and losing every device and the recovery secret loses the data. Duly should copy that shape, not invent one.
2. Duly's documents-1 design already follows it on the Mac. The new work is the multi-device layer: device enrolment, a signed device list, revocation, encrypted sync, and the web.
3. Sign-in and encryption must stay separate. Passkeys sign in (NIST counts synced passkeys at AAL2); a passkey or account takeover alone must never open a document.
4. A new device is approved by an existing device with a short code and a password-authenticated key exchange (1Password uses CPace for this), or by the recovery kit. The server can carry the messages but cannot add a device by itself, because the device list is signed by the vault.
5. Recovery: the 128-bit recovery kit stays the base (as 1Password's Secret Key, Signal's 64-character key, Apple's 28-character key). Any enrolled device also recovers. A passkey PRF wrap is an optional extra, never the only way in.
6. The web is the weakest client: the server sends the code that holds the keys. Recommendation: the web shows the case and plans from day one, but opens documents only after a trusted device approves that session, as Apple does with iCloud.com under ADP, and only once code transparency is in place.
7. Reading stays on the device on every platform: Apple Vision on iPhone and Mac, ML Kit with the bundled model on Android, Windows.Media.Ocr on Windows, Tesseract.js (WebAssembly) in the browser. Classification stays rule-based, measured on synthetic specimens, and every field is confirmed by the student.
8. The threat model (section 6) covers lost device, account takeover, server breach, insider, government demand, malicious document, supply chain, push notifications and coercion. The most realistic adversary for this population is a government demand to Duly; the answer is to hold almost nothing, and to say exactly what we hold.
9. Legal: immigration status is "sensitive" under California (AB 947) and at least eight other state laws that require opt-in consent; California now requires breach notice within 30 days (SB 446, from 2026-01-01); every state has a breach law, most with an encryption exemption; the FTC punished Zoom for overstating end-to-end encryption. Duly's security words must be exactly true.
10. Security also has to show in the product so the student feels it: every add, read, backup and device change closes its own loop with a calm, specific confirmation ("Kept on this phone. Backed up 2 minutes ago. Read 4 dates; check them now."). Section 10.

---

## 1. What Duly protects, and the rules it must keep

### The rules already decided

| Rule | Source | What it means for storage |
|---|---|---|
| Documents are core, encrypted on the device; optional end-to-end backup to Duly's AWS us-west-2, with a key only the student holds; a lost key loses the backup | D54 | Zero-knowledge backup is a requirement, not an option |
| Documents are read and sorted on the device; every field is confirmed | D55 | OCR and classification run locally on each platform |
| Documents open with the computer's own unlock for now, with a recovery kit at setup | D58 | Biometric or OS password unlock; the kit is the only recovery |
| No value from a document reaches any model, including on Duly's AWS | D60, D13 | No server-side reading, no model sees fields |
| Check-in reminders are computed on the device; no record dates held on the server for them | D73 | Push notifications must be content-free or end-to-end encrypted |
| Postgres only on the server; SQLCipher only inside desktop main | CLAUDE.md | Each client has its own local store |

### What is worth stealing

| Asset | Harm if exposed | Where it should live |
|---|---|---|
| Document files (I-20, passport, visa, I-94, EAD, I-797, offer letters, pay stubs) | Identity theft; exposure of status and school; targeting | Devices, encrypted; backup as ciphertext |
| Fields read from them (SEVIS ID, dates, names, employer) | Same, in a searchable form | Devices, encrypted envelopes |
| The case record (status, program dates, employment history, unemployment days) | Reveals status and risk; a list of who is vulnerable | Devices; backup as ciphertext |
| The fact that a person uses Duly at all | Marks them as a non-citizen student | Server: account email only; minimise everything else |
| Questions asked of the assistant | Reveal what the student fears | Server only if needed to answer; never with document values (D60) |
| Keys (K, R, device keys) | Opens everything | Devices and the student's kit only |
| The rule library and updates | A false rule harms every student at once | Signed, sourced, founder-approved (security/threat-model.md) |

---

## 2. How the leaders do it

### 2.1 Comparison

| Product | Where keys come from | What the server holds | New device | Recovery without the provider holding keys | Lesson for Duly |
|---|---|---|---|---|---|
| 1Password | Two-secret key derivation: the account password plus a 128-bit Secret Key stored on the device, so server data cannot be used to crack the password [1password-apsk] | Encrypted vaults and an SRP verifier; it cannot reset passwords [1password-apsk] | Passkey or SSO unlock: each device has its own device key; an existing trusted device approves the new one with a code, over a CPace PAKE handshake, then sends the credential bundle end-to-end [1password-sso-deep-dive], [1password-passkeySSO] | Emergency Kit with the Secret Key; recovery codes [1password-apsk], [1password-sso-trusted] | Mix a high-entropy device-held secret into every key; approve devices from devices with a PAKE |
| Proton Drive | All keys and passphrases made on the client; tree of keys: user key, address key, share key, node key per folder and file, session key per file [proton-drive-security] | Ciphertext, encrypted names, encrypted node keys; 4 MB encrypted blocks whose hashes are signed by the uploader [proton-drive-security] | Account login with the mailbox password unlocking the user key (detail not fetched in this pass, unverified) | Not covered in the fetched page (unverified) | A key per file and per folder lets sharing and revocation touch keys, not files. Sign block lists so the server cannot swap content |
| Tresorit | Client-side AES-256; keys made and kept locally; sharing with RSA-4096 OAEP and certificates over a tree of symmetric keys [tresorit-security], [tresorit-wiki] | Ciphertext only [tresorit-zk] | Not fetched in this pass (unverified) | Not fetched (unverified) | Share links carry the key after "#", which browsers never send to the server [tresorit-link-whitepaper] |
| Apple ADP | Service keys move from Apple's HSMs to the user's devices; enabling deletes the HSM copies "immediate, permanent, and irrevocable" [apple-adp] | Ciphertext; dates, times and checksums stay visible; Mail, Contacts, Calendar stay standard [apple-adp] | Through iCloud Keychain's trusted device circle (detail not fetched) | The device passcode, a recovery contact (who gets no access, only a code), or a 28-character recovery key; one must be set before ADP is turned on [apple-adp-iphone], [apple-icloud-overview] | Recovery set up first, enforced. Web access off by default; when on, keys go to the server only "encrypted using an ephemeral key bound to the web session" [apple-adp] |
| Apple iCloud Keychain escrow | Keychain escrowed in HSM clusters behind SRP; 10 attempts, then the record is destroyed; the HSM admin cards were destroyed so firmware cannot change [apple-escrow] | Escrow records only usable inside the HSM | | Friendlier PIN-style recovery, but the provider runs the HSM | An option with real trade-offs (section 3.6) |
| Signal | Secure Value Recovery: PIN-derived secrets held in enclaves with guess limits; SVR3 spreads them across different enclave types so no single one is a central point of attack [signal-svr-wiki], [svr3-paper]. Secure Backups (2025): a 64-character recovery key made on the device, never sent [signal-backups] | Backup archives with media encrypted twice and padded to hide size; archives not linked to an account or payment, using zero-knowledge credentials [signal-backups] | Device link by QR (not fetched in this pass, unverified) | None: "Losing it means losing access to your backup permanently" [signal-backups] | Pad sizes; unlink stored blobs from identity where possible; say the hard truth plainly |

### 2.2 The cautionary cases

- **LastPass 2022.** Attackers stole encrypted vault backups and also the unencrypted fields: website URLs, names, billing addresses, emails, IPs, and per-user iteration counts that made weak vaults crackable. Warnings to encrypt URLs had been ignored [lastpass-wiki], [lastpass-upguard]. Lesson: metadata is data. A list of "I-20, EAD, I-797 receipt, added 2026-04-12" is as revealing as the files. Encrypt names, kinds, dates and counts; never derive a server-held key from a low-entropy secret.
- **Zoom and the FTC (2020).** Zoom said "end-to-end" while its servers held the keys, and said AES-256 while using 128-bit; the order forbids misrepresenting security features [ftc-zoom-blog], [ftc-zoom-fr]. Lesson: every security sentence Duly shows must be exactly true for the build the student is running (documents-1 already distinguishes the development and signed builds).
- **Apple ADP in the UK (2025).** A UK Technical Capability Notice demanded access; Apple withdrew ADP for UK users rather than build a back door [privacyguides-adp-uk], [pi-apple-tcn]. Lesson: a provider without keys can refuse to read; a provider can still be pushed to remove the feature. Duly's design should not depend on a feature it could be told to switch off server-side.

---

## 3. Key management for phone, laptop and web

### 3.1 Principles

1. **Keys are made on a device and never leave it unwrapped.** The server stores wrapped keys and public keys only.
2. **Sign-in proves who you are; it does not open documents.** Signing in gets you the ciphertext. Opening needs a key that only enrolled devices or the recovery kit hold.
3. **High entropy at every server-facing wrap.** Nothing on the server is protected by a passphrase or a PIN alone (the LastPass lesson; documents-1 F8 already chose this).
4. **The server cannot add a reader.** The list of devices that may hold the vault key is signed by the vault, and every device checks it.
5. **Recovery is set up before anything is stored,** and checked (documents-1 already types back the last two groups).
6. **Use standard constructions.** Prefer HPKE (RFC 9180) and AES-256-GCM with well-reviewed libraries over a custom envelope [rfc9180].
7. **Say every limit.** Malware on an unlocked device, a coerced unlock, and lost keys are stated, not hidden.

### 3.2 The key hierarchy (documents-1, extended to many devices)

| Key | What it is | Made | Kept | Opens | Change from documents-1 |
|---|---|---|---|---|---|
| K, the vault key | 256 random bits | First device, at setup | Only wrapped: once per enrolled device (under that device's unlock key), once under R, optionally under a passkey PRF output | Everything below | Was wrapped under U and R on one Mac; now one wrap per device |
| U_d, a device unlock key | 256 bits or a hardware-held key | Each device at enrolment | The platform key store with user presence required (table 3.3) | That device's wrap of K | Was U; now one per device |
| D_d, a device record key | 256 random bits | Each device | Platform key store without presence | That device's local record store, so Home works while documents are locked | Was D; stays per device and never syncs |
| V, the vault key pair | X25519 now; hybrid X25519 plus ML-KEM-768 for anything that goes to the cloud (3.8) | Setup | Public half in the signed vault header; private half wrapped under K | Envelopes, and so file keys | Add the post-quantum half for cloud copies |
| F, a file key | 256 random bits | When a file is added | In an envelope | That file | Same |
| S, the vault signing key | Ed25519 | Setup | Private half wrapped under K | Signs the device list, manifests and the vault header | New |
| E_d, a device identity key pair | X25519 plus Ed25519 (or P-256 inside a hardware enclave, see 3.3) | Each device at enrolment | Platform key store | Receives K during enrolment; signs that device's uploads | New |
| R, the recovery key | 128 random bits shown as groups with a check group | Setup | Only in the student's recovery kit | K, through HKDF-SHA256 | Same |
| B, the backup key | Derived from K with HKDF and a purpose label | | Never stored | Backup manifests and record snapshots | Same as documents-1 section 12 |

Sizes match the field: 1Password's Secret Key is about 128 bits from 26 characters of a 31-symbol alphabet [1password-apsk]; Apple's recovery key is 28 characters [apple-adp-iphone]; Signal's is 64 characters [signal-backups].

### 3.3 Where each platform keeps device keys

| Platform | Store | Settings Duly uses | Source |
|---|---|---|---|
| iPhone, iPad | Keychain item, class "when unlocked, this device only", with user presence (Face ID, Touch ID or passcode); files under Data Protection class Complete | "This device only" items are bound to the device UID in backups and are useless on another device; class Complete keys are discarded shortly after lock | [apple-keychain-dp], [apple-dp-classes] |
| iPhone hardware key | Secure Enclave keys are P-256 only, so E_d on iOS is P-256 inside the enclave, or X25519 wrapped by an enclave key | P-256-only is from Apple CryptoKit documentation, not fetched in this pass (unverified) | |
| Android | Android Keystore, StrongBox where present; `setUserAuthenticationRequired(true)` and `setUnlockedDeviceRequired(true)` | StrongBox from API 28; key generation fails if StrongBox is absent, so fall back to TEE and record which | [android-keystore-features], [android-keystore-medium] |
| macOS | documents-1: Keychain item with user presence via the duly-unlock helper in the signed build | | specs/documents-1 section 3 |
| Windows | documents-3: Windows Hello via `UserConsentVerifier`; DPAPI for D | | specs/documents-1 section 3 |
| Web | WebCrypto keys made non-extractable; CryptoKey objects are serializable, so a non-extractable key can be kept in IndexedDB without its bytes being readable by script | [mdn-generatekey], [w3c-webcrypto] |

iPhone users also get Apple's Stolen Device Protection, which demands Face ID or Touch ID with no passcode fallback away from familiar places and adds a one-hour delay before changing the Apple Account password [apple-sdp]. Duly should copy the idea for its own sensitive actions (3.5).

### 3.4 Signing in

- **Passkeys first, no SMS.** NIST SP 800-63B-4 accepts synced passkeys at AAL2, provided the sync fabric is protected by AAL2-level MFA; they do not reach AAL3 [nist-63b], [corbado-nist]. AAL2 is the right level for an account that only reaches ciphertext.
- **Email magic link** only as a second factor for recovery flows, never alone to enrol a device.
- **No passwords on the server.** With passkeys and no password database, a server breach leaks no crackable verifier. If a password is ever added, use 1Password's pattern (SRP plus a device-held secret) [1password-apsk].
- **Sessions:** short-lived access tokens, revocable server-side refresh tokens bound to the device's E_d (a signed challenge on refresh).
- **App integrity:** Apple App Attest and Google Play Integrity can tell the server a request comes from a genuine app build, which limits scripted abuse of sign-up and enrolment (Apple's documentation page did not render in this pass; unverified detail).

### 3.5 Adding a device

The flow, modelled on 1Password's trusted-device approval [1password-sso-deep-dive]:

1. The new device signs in with a passkey. It makes E_d and uploads only the public half.
2. The server notifies every enrolled device: "A new device wants to open your documents: Chrome on Windows, near Austin, now." (City from IP is coarse and kept only for this message.)
3. On an enrolled device the student unlocks and taps "Approve". That device shows a short random code.
4. The student types the code on the new device. Both run a PAKE (CPace, as 1Password does) keyed by the code, so the server relaying the messages cannot learn the code or insert itself [1password-sso-deep-dive].
5. The approving device adds the new E_d to the device list, signs the list with S, and sends K encrypted to the new device over the PAKE channel.
6. Every device checks the signed list on each sync and shows "Devices: iPhone, MacBook, Chrome (new today)". A device that is not on a list signed by S never gets K.

**Without an enrolled device** (all lost): the student types the recovery kit on the new device. To slow down an attacker who stole the kit and took over the account, enrolment by kit alone triggers a **security delay** (proposal: 24 hours, a product setting) with notices to the email and any device that comes back online, unless an enrolled device approves sooner. This copies Apple's one-hour delay for sensitive changes [apple-sdp]. The founder decides the length (F-S3).

**Actions that also take the delay and a fresh unlock:** turning off backup, deleting the backup, making a new recovery kit, removing the last other device, deleting the account.

**Why a signed device list matters.** Without it, a compromised or compelled server could add its own device key and receive K at the next approval or sync. WhatsApp solved the same problem for public keys with an auditable, append-only key directory that anyone can check [whatsapp-kt], [cloudflare-kt]. Duly's signed list is the small version; a public transparency log for vault headers is a later step (section 11, phase 4).

### 3.6 Recovery: options and recommendation

| Option | How | Who can lose the data | Who can be forced to help | Fit with D54 | Recommendation |
|---|---|---|---|---|---|
| Any enrolled device | Approve from it (3.5) | The student, if all devices are lost | No one | Yes | Base; encourage two devices at setup ("Add your laptop too") |
| Recovery kit (R, 128 bits) | Typed on a new device | The student, if the kit and all devices are lost | No one | Yes, already decided (D58, documents-1 F2, F8) | Base; required at setup |
| Passkey PRF wrap of K | WebAuthn PRF gives a stable 32-byte secret per passkey that can wrap K [bitwarden-prf], [corbado-prf] | Deleting that passkey loses this path "permanently" [corbado-prf] | The passkey provider (Apple, Google, 1Password) holds the passkey, end-to-end encrypted in their sync | Yes, if optional and one of several wraps | Optional, later; never the only wrap. Support is now broad (Apple 18.4+, Android, Windows Hello since Feb 2026) but iOS 18.0 to 18.3 had data-destroying bugs [corbado-prf] |
| Recovery contact | A trusted person's Duly app holds a share or a code; Apple's contacts get "no access", only a code [apple-adp-iphone] | | That person | Yes, if they hold a share of R, not K, and need a second share | Later; a 2-of-3 split of R (contact, kit, device) is a founder decision |
| PIN with hardware-enforced guess limit (Signal SVR, iCloud Keychain escrow) | Duly runs enclaves or HSMs that release a key after a PIN, with about 10 tries [apple-escrow], [svr3-paper] | | Duly operates the enclave; a court could order Duly to change it, though Apple destroyed its HSM admin cards to make that impossible [apple-escrow] | Arguably not: D54 says a key only the student holds | Not in v1. Revisit only with multi-vendor enclaves (SVR3 style) and an outside review |
| Duly holds a copy | | | Duly, and anyone who can compel Duly | No (D54) | Never |

The words for this choice already exist in documents-1 section 12 and need only the plural: "If you lose your recovery kit and every device, no one can open your documents, including Duly."

### 3.7 Lost device and revocation

- **Remove a device** from any other device or the web: the signed list drops it; the server stops serving it; its refresh tokens die.
- **What revocation cannot do:** a removed device that already held K and downloaded files can still read what it had, if someone can unlock it. Say so.
- **What it does for the future: key epochs.** On removal, the remaining device makes K2, re-wraps every file key F and the private half of V under K2 (envelopes are small; files are not re-encrypted), and signs a new list. New files after that use K2. This mirrors Proton's design, where keys sit in a tree so access changes touch keys, not file bodies [proton-drive-security].
- **The device itself:** platform protections do most of the work. iOS discards class Complete keys after lock [apple-dp-classes]; Android `setUnlockedDeviceRequired` keys are cryptographically unusable while locked from Android 12 [android-keystore-features]. Duly adds its own lock on idle, sleep and screen lock (documents-1 section 3).

### 3.8 Sync and backup format

Duly needs two kinds of sync, and both are ciphertext to the server.

**Files.** Each file is encrypted once on the device that added it, in 1 MiB chunks with the chunk index and a final flag in the additional data (documents-1 section 3). It uploads under a random id. Sizes are padded to fixed steps, as documents-1 already says and as Signal does for media [signal-backups].

**The record (case facts, document index, confirmations, history).** documents-1 already makes the record append-only: a correction is a new confirmation, nothing is overwritten. That makes sync simple and safe:

- Each change is an **event**: random id, device id, a per-device counter, a timestamp, and an encrypted body (HPKE to V, or AES-GCM under a key from K).
- Each event is **signed by the device's E_d**, and the device's key is on the list signed by S. The server cannot forge, reorder or drop events without detection: each device keeps the last counter it saw from every other device, and a manifest signed by S lists the heads.
- **Merge** is a union of events. Conflicts are rare because facts are confirmations with timestamps; when two devices confirm different values for the same field, both stay and the student is asked (CLAUDE.md: "a gap or a conflict becomes a question").
- **Rollback protection:** a device refuses a manifest with a lower sequence than it last saw (documents-1 section 12 already does this for restore).
- **The engine runs on each device** over the local record, so dates and verdicts never need the server (D73).

**What the server stores, per account:** email; passkey public keys; the signed device list (public keys only); the signed vault header (V public, wraps of K under R, under device keys, under PRF); event and file blobs under random ids with padded sizes; upload times; push tokens. Nothing else. No nationality, school, SEVIS ID, program dates or document kinds.

**Post-quantum.** Immigration documents stay sensitive for decades, so "store now, decrypt later" is a real concern for cloud copies. NIST finalised ML-KEM in FIPS 203 on 2024-08-13 [fips203]. Symmetric AES-256 is not the weak point; the X25519 envelopes and wraps are. Recommendation: anything that goes to the cloud uses a hybrid KEM (X25519 plus ML-KEM-768) in HPKE form [rfc9180], [fips203]. Local-only envelopes can stay X25519 until the libraries settle.

**Storage on AWS:** see section 7.

### 3.9 The web: the hardest client

**The problem.** A phone or desktop app is a signed binary reviewed before release. A web app is code the server sends every time the page loads. A breached or compelled server could send code that copies keys or files. WhatsApp built Code Verify for exactly this: "a web app is usually served directly to users, without a third party reviewing and auditing the code"; the extension compares the running code with hashes published through Cloudflare [code-verify]. Apple's answer for iCloud.com under ADP is to keep web access off by default and, when the user turns it on, approve each session from a trusted device and send keys bound to that session only [apple-adp].

**Recommendation, in steps:**

1. **From day one the web shows the case without documents.** It signs in with a passkey, enrols like any device, syncs the record events, runs the engine (it is deterministic code), and shows dates, plans and the WorkBook. The record is still end-to-end encrypted, so the web holds K while unlocked. This is the same exposure as the documents themselves, so steps 2 to 4 apply to the record too.
2. **Hardening that costs little:** immutable, versioned bundles; Subresource Integrity on every script; a strict Content Security Policy with no inline script and `connect-src` limited to Duly's API; no third-party script of any kind (already a rule in security/threat-model.md); keys made non-extractable in WebCrypto [mdn-generatekey]; K held only in memory or as a non-extractable CryptoKey; lock on tab hide after a set time.
3. **Documents on the web are a setting, off by default,** as Apple does [apple-adp]. When on, each browser session is approved from a phone or laptop (3.5), and the session key dies when the tab closes.
4. **Code transparency before documents on the web ship:** publish the hash of every web release to an append-only public log and offer a verification extension, as WhatsApp does [code-verify]. Until then the security page says: "On the web, you trust the code Duly sends each time. For your documents, the phone and laptop apps are safer." That sentence is true and calming at once.

### 3.10 Sharing with a DSO or attorney

documents-1 section 10 makes a saved copy (a file the student sends). Later, an end-to-end share link: encrypt the pack under a fresh key, upload it, and put the key after "#" in the link, which browsers do not send to the server. Tresorit uses this for encrypted links [tresorit-link-whitepaper]; Proton uses password-protected links where "the password must always be communicated separately" [proton-drive-security]. Add an expiry and a view count, and record "Shared with a link, expires Friday" in History.

---

## 4. Reading and sorting on the device

### 4.1 Engines per platform

| Platform | Engine | Runs where | Notes | Source |
|---|---|---|---|---|
| iPhone, iPad (iOS 26) | Vision `RecognizeDocumentsRequest` (paragraphs, tables, lists; 26 languages), or `RecognizeTextRequest` | On device | "All vision APIs run entirely on-device" | [wwdc25-vision] |
| Mac | Vision `VNRecognizeTextRequest`, accurate, language correction off | On device, sandboxed helper | Already chosen in documents-1 section 4 | specs/documents-1 |
| Android | ML Kit Text Recognition v2, **bundled** model | On device, no network call | The unbundled model is downloaded through Play Services after install; bundled works at once and adds a few MB | [mlkit-v2], [atomicrobot-mlkit] |
| Windows | `Windows.Media.Ocr` | On device | No confidence values; documents-3 must decide what replaces rule 3 | specs/documents-1 |
| Web | Tesseract.js, a WebAssembly port of Tesseract, Apache 2.0, self-hosted language data | In the browser, in a worker | Local installation documented; offline detail not confirmed in this pass (unverified) | [tesseract-js] |

On every platform: render the page to pixels and read only the pixels, never the PDF text layer, form fields or metadata (documents-1 section 4). This removes hidden-text and planted-metadata attacks.

### 4.2 Classification (which form is this?)

- **Rules first.** I-20, I-94, EAD, I-797 and passports carry fixed printed markers (form numbers, titles, machine-readable zones). Rule-based recognition over the OCR text is explainable, testable and needs no model file, which matches documents-1 ("No model").
- **When a model is worth it:** photos taken at angles, or forms with no clear marker (offer letters, pay stubs). Then a small on-device classifier, shipped inside the signed app, versioned, never updated over the air without a signed release.
- **Abstain, never guess.** A low-confidence result becomes a question: "Is this your I-20?" with the crop. The student confirms every field (D55, PRINCIPLES 2).

### 4.3 Data science without seeing documents

The product needs accuracy numbers without collecting a single real document:

- **Synthetic specimen corpus** (documents-1 section 13, security/corpus/documents/clean): invented people, every page marked SPECIMEN, with truth.json. Augment with photos at angles, glare, folds, low light.
- **Metrics per field:** wrong-value rate (target zero; a wrong date is the one failure that matters), abstain rate, and confirm-without-edit rate.
- **From real use, only counts the device decides to send,** opt-in, with no ids: "a field was edited before confirming" per form type and reader version. Never the value, the image or the crop. If more is ever wanted, local differential privacy is the standard tool (unverified as a fit; a later design).
- **Eval gate:** a new reader or forms version ships only if the wrong-value rate on the corpus does not rise.

### 4.4 The assistant and documents

D60 stands: no document value reaches any model. A later path that keeps D60's spirit is an on-device language model that reads confirmed fields locally (for example, Apple's on-device foundation models; availability and limits not checked in this pass, unverified). That is a founder decision, not part of this design.

---

## 5. Malicious documents

Documents are the one input an attacker fully controls: a student may be sent a "new I-20" by a scammer.

| Risk | Real example | Duly's answer |
|---|---|---|
| Image or PDF decoder bug, even in the OS | FORCEDENTRY: an integer overflow in CoreGraphics' JBIG2 decoder, sent as a PDF named .gif, used to escape iMessage's BlastDoor sandbox [citizenlab-forcedentry], [wiki-forcedentry] | Decode in an isolated, sandboxed process with no network, no writes, no keychain (documents-1 duly-read on Mac); check page count and size before decoding; time out; keep OS minimums current. On iOS, where apps cannot start helper processes, use an app extension or the smallest decoding surface, and hold limits strictly |
| PDF viewer running script | PDF.js CVE-2024-4367: arbitrary JavaScript on opening a PDF, CVSS 9.8, fixed in 4.2.67 [cve-2024-4367-socradar], [cve-2024-4367-sentinelone] | On the web, pin a patched PDF.js, render in a sandboxed worker or iframe on a separate origin, and show pages as images; never run PDF scripts |
| Hidden or planted text | White text, text layer differing from pixels, metadata | Read pixels only; hostile corpus (documents-1 section 13) |
| Instructions to a model | "Ignore previous instructions" printed on a page | No model reads documents (D60) |
| Decompression bombs, huge pages | | Size and dimension limits before decode (documents-1) |

---

## 6. Threat model (STRIDE)

STRIDE names six threat kinds: spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege [ms-stride].

### 6.1 By component

| Component | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| Sign-in | Phished credentials: passkeys resist phishing; no SMS | | Sign-ins in History on every device | Account email only | Rate limits; App Attest and Play Integrity (unverified detail) | Server-side session revoke |
| Device enrolment | Server adds a fake device: signed device list | PAKE code stops a relay from changing the handshake | Every enrolment shown on every device | K only over the PAKE channel | Pending enrolment expires | Kit-only enrolment waits through the security delay |
| Sync and backup | Forged events: signed by E_d | Swapped or dropped blobs: signed manifest, counters, rollback check | Device id on every event | Ciphertext, padded sizes, random ids | S3 versioning and Object Lock against deletion | Staff roles cannot read the bucket |
| Local vault | | AEAD with bound additional data (documents-1) | History append-only | Platform key stores, auto lock | "Check my documents" | Malware as the user is out of reach; stated |
| Reader | | Pixels only | | No network; no writes | Limits and timeouts | Sandboxed process |
| Web client | Look-alike domains: passkeys are bound to the origin | Served code changed: SRI, CSP, transparency log | | Documents off by default | | |
| Rule packs and updates | A false source | Signed packs, checked on device | Founder approval in the audit log | | | Ops behind hardware keys (security/threat-model.md) |
| Push notifications | | | | Content-free payloads | | |

### 6.2 The named scenarios

**Lost or stolen device.** Locked: platform encryption plus Duly's own lock; keys need Face ID, Touch ID or the passcode [apple-keychain-dp], [android-keystore-features]. Unlocked and grabbed: Duly's idle lock limits the window. Then the student removes the device from another device or the web; key epoch rotation protects new files (3.7). Residual: a thief who knows the passcode can open what the device held. Stated.

**Account takeover.** An attacker with the email and a passkey gets ciphertext and nothing else. To read, they must enrol a device, which needs an enrolled device's approval with a code, or the recovery kit plus the security delay, during which every device and the email are told. Destructive actions (delete backup, turn off backup) also wait. S3 versioning keeps old objects through the stated window (section 7) so a takeover cannot destroy the backup instantly.

**Server breach.** The attacker gets account emails, passkey public keys, signed device lists, wraps of K under 128-bit R and device keys, and padded ciphertext blobs. No password verifier exists to crack. No key is derived from a guessable secret. Metadata is limited to counts, padded sizes and times (the LastPass lesson [lastpass-wiki]). Residual: a list of email addresses that use Duly, which itself reveals likely non-citizen status. Mitigations: let students sign up with any email, including a relay address; keep IP logs for a short stated period; encrypt the email column at rest with a KMS key so a database dump alone is not enough.

**Insider.** No staff role holds a key that opens student data, because none exists on the server. IAM least privilege, separate AWS accounts for production and logs, break-glass access recorded and alerted. The bigger insider risk is the rule library: a false rule reaches every student. That stays behind hardware-key Ops login, founder approval and two checks (security/threat-model.md), and packs should be signed with an offline key and checked on device.

**Government demand.** This is the most realistic serious threat for this population. In 2026 DHS sent hundreds of administrative subpoenas to Google, Meta, Reddit and Discord, issued without a judge; some were complied with [military-dhs-subpoenas], [engadget-dhs]. Google sent a Cornell student's addresses, IPs, phone numbers and bank and card numbers to ICE under an administrative subpoena with a reported gag order, within two hours of the student's visa being revoked [techcrunch-google-ice]. EFF has sued over the subpoenas [military-eff-lawsuit]. Duly's answers:

- **Hold almost nothing.** The list in 3.8. No nationality, school, SEVIS ID or dates on the server. Payment, if any, through a processor and not linked to backup blobs (Signal unlinks archives from accounts and payments with zero-knowledge credentials [signal-backups]; that is the long-term target).
- **What Duly could hand over is published,** exactly, in the government request policy, before the first backup is stored (documents-1 section 12 requires this).
- **Policy:** a court order or warrant required where the law lets Duly insist; administrative subpoenas are not obeyed voluntarily where the law does not require it (the TechCrunch article notes companies "are under no obligation" for administrative subpoenas [techcrunch-google-ice]); notify the student unless legally barred; challenge gag orders; publish a transparency report. Counsel writes the final policy (F-S6).
- **Short logs:** IP and connection logs kept for a stated short period, then deleted.

**Push notifications.** Push payloads pass through Apple's and Google's services. Governments have been reported to request push notification records from Apple and Google (Senator Wyden, December 2023; unverified in this pass, the source could not be fetched). D73 already computes reminders on device; push should only wake the app ("Duly has an update") and the device writes the words locally. No date, no form name, no status in any payload.

**Malicious document.** Section 5.

**Supply chain.** Section 8.

**Coercion and border searches.** Someone who can make the student unlock the phone can see what the student can see. documents-1 says "Duly does not advise on this" and locks on quit, sleep and screen lock. Keep that: it is a legal question, not a product feature.

**Someone close to the student** (a partner, a family member, an employer holding the phone). Device list and History visible on every device; a notice for every new device and every unlock with the kit.

### 6.3 Risk register

| Risk | Likelihood | Impact | Rating | Main control | Owner |
|---|---|---|---|---|---|
| Government demand for account data | High for this population | High | High | Hold almost nothing; published policy; short logs | Founder and counsel |
| Student loses all devices and the kit | Medium | High for that student | High | Two devices at setup; kit typed back; yearly "check your kit" | Product |
| Account takeover attempt | Medium | Low (ciphertext) to high (if enrolment tricked) | Medium | PAKE code; signed list; security delay | Security |
| Malicious npm or build dependency | Medium (two npm waves in 2025) | High | High | Section 8 | Engineering |
| Malicious document exploiting a decoder | Low | High | Medium | Sandboxed reader; limits; OS updates | Security |
| Web code tampered by a breached server | Low | High | Medium | Documents off on web by default; SRI; transparency log | Security |
| Server breach | Low to medium | Low (ciphertext); medium (email list) | Medium | Minimal data; encrypted email column | Infra |
| Overstated security copy | Medium | High (FTC) | Medium | Copy lint; each claim tied to a test | Product |
| False rule published | Low | Very high | High | Existing publish blockers; signed packs | Ops |

---

## 7. Cloud infrastructure and network

- **Region:** AWS us-west-2 (D16, D54).
- **Accounts:** separate AWS accounts for production, logs and CI under an organisation; CloudTrail to the log account where production staff cannot delete it. (Standard AWS practice; not fetched in this pass.)
- **Blob store:** one S3 bucket, all public access blocked, versioning on, and Object Lock in **governance** mode with a short default retention (proposal: 14 days). Object Lock is write-once-read-many; governance mode lets a narrowly held permission delete early, compliance mode lets no one, not even root [aws-object-lock]. Governance mode means an attacker who takes over an account cannot destroy the backup at once, while "Delete my backup" still finishes when the window ends. The words must say so: "Your backup is deleted now and gone for good within 14 days." Counsel checks this against deletion duties (documents-1 F14).
- **Second layer:** SSE-KMS on the bucket. It is not end-to-end and must never be described as such (the Zoom lesson [ftc-zoom-blog]).
- **Database:** Postgres holds accounts, device lists, blob index (random id, padded size, sequence, time), push tokens. Email encrypted at the application layer under a KMS key.
- **API:** refuses any blob that does not start with the envelope header and never logs bodies (documents-1 section 12). Rate limits per account and per IP.
- **Network:** TLS 1.3 and HSTS. Certificate pinning is not needed for confidentiality because content is end-to-end encrypted; TLS protects metadata and sign-in.
- **CI and deploy:** short-lived credentials from the CI provider's identity federation, no long-lived cloud keys in CI (the Shai-Hulud worm harvested exactly those [cisa-shai-hulud]).
- **Drills:** a restore drill before each release (documents-1), an incident response runbook timed to the 30-day California clock (section 9), a yearly tabletop.

---

## 8. Supply chain and release integrity

Recent history makes this concrete:

- **xz utils (2024):** malicious code in versions 5.6.0 and 5.6.1 that "may allow unauthorized access to affected systems" [cisa-xz].
- **npm, September 2025:** a maintainer phished through a fake npmjs domain; chalk, debug and 16 more packages with about 2.6 billion weekly downloads poisoned; then the self-spreading Shai-Hulud worm, over 500 packages, stealing GitHub tokens and AWS, GCP and Azure keys; a second wave in November 2025 hit 600 to 800 packages and over 25,000 repositories [cisa-shai-hulud], [pulsedive-shai-hulud], [invicti-shai-hulud].

Controls:

1. Lock files and `npm ci` only; install scripts off by default; a cooling-off period before any new version is taken (proposal: 7 days), since worm versions are usually pulled within days.
2. Implementation lanes cannot add dependencies (existing rule); a new dependency needs founder approval and a review of its maintainers and install scripts.
3. The vault, crypto and reader paths depend only on the OS and one audited crypto library per platform.
4. CI actions pinned by commit hash; no cloud secrets in CI.
5. Signed releases on every platform; Electron fuses set and the Electron security checklist followed (context isolation, sandbox, CSP, validate IPC senders, no `shell.openExternal` with untrusted content) [electron-security].
6. Release signing keys in hardware, two people to release (founder plus one).
7. An SBOM per release; reproducible web bundles whose hashes go to the transparency log (3.9).
8. The factory's build agents never hold production keys or signing keys.

---

## 9. Legal exposure

Not legal advice; each row goes to counsel (F-S6).

| Law or rule | What it says | Effect on Duly | Source |
|---|---|---|---|
| California CCPA, as amended by AB 947 | Since 2024-01-01, information revealing citizenship or immigration status is "sensitive personal information" | Students can limit its use; Duly should never use it beyond providing the service. Applies when Duly crosses a threshold: $26.625 million revenue (from 2025-01-01), 100,000 California consumers, or half of revenue from selling or sharing | [natlaw-ab947], [dlapiper-ab947], [cppa-faq] |
| Colorado, Connecticut, Delaware, Indiana, Montana, Oregon, Tennessee, Texas, Virginia | Opt-in consent and a data protection assessment before processing sensitive data, which includes citizenship or immigration status in these laws | Design to the strictest: explicit consent at setup, a written data protection assessment, no inferences beyond the service | [natlaw-sensitive], [dickinson-wright] |
| Texas TDPSA | No revenue or volume threshold; small businesses are mostly exempt but still need consent to sell sensitive data | Duly never sells data; say so in the policy | [bassberry-tdpsa], [dwt-tdpsa] |
| California SB 361 (data brokers) | From 2026-01-01 data brokers must disclose whether they collect immigration status and whether they shared data with federal agencies | Duly must never be a data broker; no sale, no sharing | [pearlcohen-sb361], [hintze-sb361] |
| California AB 1542 | Would have banned selling or sharing immigration status data; vetoed 2026-09-28 | The opt-out model stays; Duly's own promise must go further than the law | [techtimes-ab1542] |
| California breach law, Civil Code 1798.82, as amended by SB 446 | Notice within 30 calendar days of discovery, from 2026-01-01; the Attorney General within 15 days of notifying when over 500 residents; "personal information" includes passport numbers and government document ids; encrypted data is covered when the key is also taken | End-to-end encryption with keys off the server likely keeps a blob breach out of scope; the account email list is not "personal information" alone under this section but is sensitive in context. Counsel confirms | [ca-1798-82], [dataprotectionreport-sb446] |
| Every state | All 50 states, DC and territories have breach notification laws, commonly with an encryption exemption | Map each state's clock into the runbook | [ncsl-breach] |
| FTC Act, Zoom order | Misstating encryption is deceptive; the order required a security program | Every security sentence tied to a test and a build | [ftc-zoom-blog], [ftc-zoom-fr] |

**What counsel must answer** (adds to documents-1 F14): whether the consent screen meets the opt-in laws; the government request policy and user notice; whether Object Lock's window conflicts with deletion requests; breach notice when only ciphertext and the email list leak; whether the email list is itself sensitive data that needs consent.

---

## 10. How security shows in the product

The founder's critique applies here too: a vault that stores silently feels static. Every security action should close its own loop, calmly and specifically, and leave an obvious next step. Research on the design and psychology side lives in the other duly-2 reports; these are the storage-specific loops.

| Moment | Loop that closes | Next step it opens |
|---|---|---|
| Add a document | "Kept on this phone, encrypted. Backed up 2 minutes ago." | "Duly read 4 dates. Check them now" (D55) |
| Fields confirmed | "Your I-20 dates are in your record. Your OPT window updated." | The changed card on Home, collapsed, with what changed |
| Setup | "Your recovery kit works. You typed it back correctly." | "Add your laptop too, so one lost phone loses nothing" |
| Second device added | "Your MacBook can now open your documents. 2 devices." | none needed; the loop ends |
| New device from someone else | "A new device asked to open your documents. It was not approved." | "Not you? Remove it and make a new kit" |
| Backup status (one line on Documents, not on Home) | "All 12 documents backed up. Last 9:40 today." | Only when something is wrong: "3 documents not backed up yet. Connect to Wi-Fi" |
| Yearly | "It has been a year since you checked your recovery kit. Check it now" | Type two groups back; done |
| A document expires soon | "Your EAD card ends 2027-03-14. Renewal can start 180 days before" only when an engine rule with a source says so | The task with its sourced dates |

The status of storage belongs in one quiet place (the Documents header: "12 documents, 2 devices, backed up"), not on Home. Home shows only what needs the student.

---

## 11. Build order

| Phase | What | Gate |
|---|---|---|
| 1 | documents-1 on the Mac as specified | Its tests and hostile corpus |
| 2 | Accounts with passkeys; signed vault header and device list; enrolment with PAKE code; iPhone and Android apps with local vault and on-device reading; record event sync | Server sees only the 3.8 list (recorded-bytes test); enrolment cannot complete without code or kit; a forged device list is refused |
| 3 | Encrypted backup of files (documents-2), Object Lock, restore drill, government request policy published, consent screen, counsel answers | Restore drill passes; planted strings absent from every byte sent |
| 4 | Web with the case only; SRI, CSP, release hashes in a public log | Web cannot fetch a document key; CSP report-only has zero violations for a release cycle |
| 5 | Optional: documents on the web per approved session; passkey PRF wrap; share links; hybrid post-quantum wraps for cloud copies | External crypto review before release |
| Throughout | Third-party security review and penetration test before backup ships; bug bounty after | Published summary |

Invariants to add to security/threat-model.md:

11. The server never receives K, R, F, or any unwrapped device key.
12. No device opens a document unless its key is on a device list signed by S.
13. No push payload contains a date, a form name or a status.
14. No blob reaches the server without the envelope header and padding.
15. Every security sentence in the product names a test that proves it for that build.

---

## 12. For the founder

- **F-S1. Two devices at setup.** Ask every student to add a second device (or print the kit) before storing anything. Recommendation: yes, gently, with "Not now" allowed but the kit required.
- **F-S2. Recovery beyond the kit.** Passkey PRF wrap (later, optional), recovery contact with a split key (later), PIN escrow in enclaves (no). Recommendation as in 3.6.
- **F-S3. Security delay** for kit-only enrolment and destructive actions. Recommendation: 24 hours for enrolment by kit alone; 1 hour plus a fresh unlock for turning off or deleting the backup.
- **F-S4. Documents on the web.** Recommendation: case only at first; documents per approved session after code transparency.
- **F-S5. Object Lock window** for the backup. Recommendation: governance mode, 14 days, said plainly.
- **F-S6. Counsel:** government request policy, consent under the opt-in state laws, deletion and Object Lock, breach notice scope, the email list.
- **F-S7. Post-quantum wraps** for cloud copies. Recommendation: yes, before backup ships, if a reviewed library exists on all four platforms; otherwise at phase 5.
- **F-S8. Change to documents-1:** use HPKE (RFC 9180) for envelopes in place of the custom "DULY" envelope, keeping the header and version byte. Recommendation: yes, before the format is frozen.

---

## 13. Sources

- [1password-apsk] 1Password Security Design, Account password and Secret Key: https://agilebits.github.io/security-design/apsk.html
- [1password-whitepaper] 1Password Security Design white paper (PDF): https://1passwordstatic.com/files/security/1password-white-paper.pdf
- [1password-sso-deep-dive] 1Password, Unlock with SSO: under the hood: https://1password.com/blog/unlock-sso-deep-dive
- [1password-passkeySSO] 1Password Security Design, Unlock with a passkey or single sign-on: https://agilebits.github.io/security-design/passkeySSO.html
- [1password-sso-trusted] 1Password Support, Unlock 1Password with SSO on a new device: https://support.1password.com/sso-trusted-device/
- [1password-prf] 1Password, encrypt data using saved passkeys: https://1password.com/blog/encrypt-data-saved-passkeys
- [proton-drive-security] Proton, The Proton Drive security model: https://proton.me/blog/protondrive-security
- [tresorit-security] Tresorit, Cloud Storage Security: https://tresorit.com/security
- [tresorit-zk] Tresorit, Zero-Knowledge Encryption: https://tresorit.com/features/zero-knowledge-encryption
- [tresorit-link-whitepaper] Tresorit, encrypted link whitepaper: https://cdn.tresorit.com/media-storage/20220223143452794encrypted-link-whitepaper.pdf
- [tresorit-wiki] Wikipedia, Tresorit: https://en.wikipedia.org/wiki/Tresorit
- [apple-adp] Apple Platform Security, Advanced Data Protection for iCloud: https://support.apple.com/guide/security/advanced-data-protection-for-icloud-sec973254c5f/web
- [apple-adp-iphone] Apple, Use Advanced Data Protection for your iCloud data: https://support.apple.com/guide/iphone/use-advanced-data-protection-iph584ea27f5/ios
- [apple-icloud-overview] Apple, iCloud data security overview: https://support.apple.com/en-us/102651
- [apple-escrow] Apple Platform Security, Escrow security for iCloud Keychain: https://support.apple.com/guide/security/escrow-security-for-icloud-keychain-sec3e341e75d/web
- [apple-keychain-dp] Apple Platform Security, Keychain data protection: https://support.apple.com/guide/security/keychain-data-protection-secb0694df1a/web
- [apple-dp-classes] Apple Platform Security, Data Protection classes: https://support.apple.com/guide/security/data-protection-classes-secb010e978a/web
- [apple-sdp] Apple, About Stolen Device Protection for iPhone: https://support.apple.com/en-us/120340
- [privacyguides-adp-uk] Privacy Guides, The UK forced Apple to remove ADP: https://www.privacyguides.org/articles/2025/02/28/uk-forced-apple-to-remove-adp/
- [pi-apple-tcn] Privacy International, Apple TCN challenge: https://privacyinternational.org/legal-action/pi-apple-tcn-challenge
- [signal-backups] Signal, Introducing secure backups: https://signal.org/blog/introducing-secure-backups/
- [signal-svr-wiki] Signal Wiki, Secure Value Recovery: https://signal.miraheze.org/wiki/Secure_Value_Recovery
- [svr3-paper] Secret Key Recovery in a Global-Scale End-to-End Encryption System (IACR ePrint 2024/887): https://eprint.iacr.org/2024/887.pdf
- [signal-svr-green] M. Green, A few thoughts about Signal's Secure Value Recovery: https://blog.cryptographyengineering.com/2020/07/10/a-few-thoughts-about-signals-secure-value-recovery/
- [bitwarden-prf] Bitwarden, PRF WebAuthn and its role in passkeys: https://bitwarden.com/blog/prf-webauthn-and-its-role-in-passkeys/
- [corbado-prf] Corbado, Passkeys and WebAuthn PRF for end-to-end encryption (2026): https://www.corbado.com/blog/passkeys-prf-webauthn
- [nist-63b] NIST SP 800-63B: https://pages.nist.gov/800-63-4/sp800-63b.html
- [corbado-nist] Corbado, NIST passkeys: synced passkeys at AAL2: https://www.corbado.com/blog/nist-passkeys
- [whatsapp-kt] Meta Engineering, Deploying key transparency at WhatsApp: https://engineering.fb.com/2023/04/13/security/whatsapp-key-transparency/
- [cloudflare-kt] Cloudflare, auditing key transparency for WhatsApp: https://blog.cloudflare.com/key-transparency/
- [code-verify] Meta Engineering, Code Verify: https://engineering.fb.com/2022/03/10/security/code-verify/
- [rfc9180] RFC 9180, Hybrid Public Key Encryption: https://www.rfc-editor.org/rfc/rfc9180
- [fips203] NIST FIPS 203, ML-KEM: https://csrc.nist.gov/pubs/fips/203/final
- [mdn-generatekey] MDN, SubtleCrypto.generateKey: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey
- [w3c-webcrypto] W3C Web Cryptography API (CryptoKey is [Serializable]): https://w3c.github.io/webcrypto/
- [android-keystore-features] Android Open Source Project, Keystore features: https://source.android.com/docs/security/features/keystore/features
- [android-keystore-medium] Inside the Android Keystore: https://medium.com/@cr0nos/inside-the-android-keystore-293ff0f406b5
- [wwdc25-vision] Apple WWDC25, Read documents using the Vision framework: https://developer.apple.com/videos/play/wwdc2025/272/
- [mlkit-v2] Google, Recognize text in images with ML Kit on Android: https://developers.google.com/ml-kit/vision/text-recognition/v2/android
- [atomicrobot-mlkit] On-device OCR on Android with ML Kit v2: https://atomicrobot.com/blog/mlkit-on-device-ocr-android/
- [tesseract-js] Tesseract.js: https://github.com/naptha/tesseract.js
- [citizenlab-forcedentry] Citizen Lab, FORCEDENTRY: https://citizenlab.ca/research/forcedentry-nso-group-imessage-zero-click-exploit-captured-in-the-wild/
- [wiki-forcedentry] Wikipedia, FORCEDENTRY: https://en.wikipedia.org/wiki/FORCEDENTRY
- [cve-2024-4367-socradar] SOCRadar, CVE-2024-4367 in PDF.js: https://socradar.io/blog/cve-2024-4367-in-pdf-js-allows-javascript-execution-potentially-affecting-millions-of-websites-update-now/
- [cve-2024-4367-sentinelone] SentinelOne, CVE-2024-4367: https://www.sentinelone.com/vulnerability-database/cve-2024-4367/
- [ms-stride] Microsoft, Threat Modeling Tool threats (STRIDE): https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats
- [lastpass-wiki] Wikipedia, 2022 LastPass data breach: https://en.wikipedia.org/wiki/2022_LastPass_data_breach
- [lastpass-upguard] UpGuard, The LastPass data breach: https://www.upguard.com/blog/lastpass-vulnerability-and-future-of-password-security
- [ftc-zoom-blog] FTC, Zooming in on Zoom's unfair and deceptive security practices: https://www.ftc.gov/business-guidance/blog/2020/11/zooming-zooms-unfair-deceptive-security-practices-more-about-ftc-settlement
- [ftc-zoom-fr] Federal Register, Zoom Video Communications analysis: https://www.federalregister.gov/documents/2020/11/13/2020-25130/zoom-video-communications-inc-analysis-to-aid-public-comment
- [military-dhs-subpoenas] Military.com, DHS issuing subpoenas for ICE-related criticism (2026-02-17): https://www.military.com/daily-news/2026/02/17/dhs-collecting-big-tech-users-personal-data-issuing-subpoenas-ice-related-criticism.html
- [military-eff-lawsuit] Military.com, DHS and ICE sued over immigration subpoenas (2026-04-22): https://www.military.com/daily-news/2026/04/22/lawsuit-dhs-ice-sued-over-immigration-subpoenas-id-social-media-users.html
- [engadget-dhs] Engadget, DHS subpoenas to identify ICE critics: https://www.engadget.com/big-tech/homeland-security-has-reportedly-sent-out-hundreds-of-subpoenas-to-identify-ice-critics-online-135245457.html
- [techcrunch-google-ice] TechCrunch, Google sent personal and financial information of student journalist to ICE (2026-02-10): https://techcrunch.com/2026/02/10/google-sent-personal-and-financial-information-of-student-journalist-to-ice/
- [aws-object-lock] AWS, Locking objects with Object Lock: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- [cisa-xz] CISA, Reported supply chain compromise affecting XZ Utils: https://www.cisa.gov/news-events/alerts/2024/03/29/reported-supply-chain-compromise-affecting-xz-utils-data-compression-library-cve-2024-3094
- [cisa-shai-hulud] CISA, Widespread supply chain compromise impacting npm ecosystem: https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem
- [pulsedive-shai-hulud] Pulsedive, The wrath of the Shai-Hulud supply chain attack: https://blog.pulsedive.com/npm-compromise-the-wrath-of-the-shai-hulud-supply-chain-attack/
- [invicti-shai-hulud] Invicti, Shai-Hulud 2.0: https://www.invicti.com/blog/web-security/shai-hulud-2-worm-supply-chain-attack-on-npm-dependencies
- [electron-security] Electron, Security checklist: https://www.electronjs.org/docs/latest/tutorial/security
- [natlaw-ab947] National Law Review, Immigration and citizenship status added to CCPA sensitive information: https://natlawreview.com/article/immigration-and-citizenship-status-add-definition-sensitive-information-under
- [dlapiper-ab947] DLA Piper, California amends privacy law on immigration status: https://www.dlapiper.com/en/insights/publications/2023/10/us-california-amends-privacy-law-to-tighten-regulation
- [cppa-faq] California Privacy Protection Agency, FAQ (thresholds): https://cppa.ca.gov/faq.html
- [natlaw-sensitive] National Law Review, Processing sensitive personal information under US state privacy laws: https://natlawreview.com/article/update-processing-sensitive-personal-information-under-us-state-privacy-laws-0
- [dickinson-wright] Dickinson Wright, three new state privacy laws: https://www.dickinson-wright.com/news-alerts/client-alert-jodka-better-3-new-state-privacy-laws
- [bassberry-tdpsa] Bass Berry, Texas Data Privacy and Security Act: https://bassberry.com/news/texas-data-privacy-and-security-act/
- [dwt-tdpsa] Davis Wright Tremaine, TDPSA overview: https://www.dwt.com/blogs/privacy--security-law-blog/2023/07/texas-data-privacy-and-security-act-overview
- [pearlcohen-sb361] Pearl Cohen, California expands data broker law: https://www.pearlcohen.com/california-expands-data-broker-law/
- [hintze-sb361] Hintze Law, California further amends its data broker registration law: https://hintzelaw.com/blog/2025/10/13/california-further-amends-its-data-broker-registration-law
- [techtimes-ab1542] Tech Times, immigration data still for sale after Newsom veto (2026-09-29): https://www.techtimes.com/articles/328204/20260929/location-health-immigration-data-still-sale-california-after-newsom-veto.htm
- [ca-1798-82] California Civil Code 1798.82: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82
- [dataprotectionreport-sb446] Data Protection Report, California 30-day notice (SB 446): https://www.dataprotectionreport.com/2025/11/california-tightens-data-breach-notification-timelines-imposes-30-day-notice-requirement/
- [ncsl-breach] NCSL, Security breach notification laws: https://www.ncsl.org/technology-and-communication/security-breach-notification-laws

### Unverified in this pass

- Secure Enclave keys are P-256 only (Apple CryptoKit; not fetched).
- App Attest and Play Integrity details (Apple's page did not render).
- Government requests for push notification records (Senator Wyden, December 2023; source not reachable).
- Tesseract.js fully offline with self-hosted data (local installation documented; not tested).
- Proton Drive and Tresorit device enrolment and recovery details.
- On-device foundation models as a path for D60.
- Thresholds of the state opt-in laws other than California and Texas.
