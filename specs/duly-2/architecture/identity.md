# Duly architecture: identity, sign-in, devices, sessions, permissions and audit

Status: research and proposal, 2026-10-01. Not a decision until the founder rules on section 12. Where this file and DECISIONS.md disagree, DECISIONS.md wins.

Reads with: BLUEPRINT.md sections 5 and 6 (one key schedule, devices, recovery, revocation), research-security.md sections 3.3 to 3.10, research-system.md sections 6 and 10, DECISIONS.md D54, D55, D60, D75 to D79, security/threat-model.md.

Key names follow BLUEPRINT 5.2: K_vault, DK_dev, SK_dev, SK_vault_sign, R (recovery kit), K_sync, K_backup, K_local.

Marking: **[verified]** means read in a primary or official source in this pass (URL given). **[unverified]** means not confirmed in this pass and must be checked before it is built on. **Proposal** means a number or choice this file suggests; the founder sets it.

---

## 0. Summary

1. **Identity in Duly is three separate things, kept apart on purpose.** (a) Signing in proves who holds the account and gets you ciphertext. (b) Device enrolment decides which devices hold K_vault and can read anything. (c) Server permissions decide which ciphertext and which account actions a signed-in session may touch. A takeover of (a) or (c) must never yield (b). This is the 1Password, Apple ADP and Signal shape already chosen in BLUEPRINT 5.1.
2. **Sign in with passkeys only.** No passwords on the server, no SMS, no magic-link sign-in. WebAuthn Level 3 became a W3C Recommendation on 2026-08-25 [verified, w3c-webauthn3]; NIST SP 800-63B-4 accepts syncable authenticators at AAL2 [verified, nist-63b]. Discoverable credentials, user verification required, attestation not requested.
3. **The Electron desktop app signs in through the system browser, not inside its own window.** Electron still lacks platform passkey support: issue #24573 ("WebAuthn FIDO/FIDO2 Support") is open as of 2026-09-23, with commenters saying current work covers USB security keys only, "not ... platform authenticators, or passkeys stored in password managers" [verified, electron-24573]. RFC 8252 requires native apps to use an external user-agent with PKCE anyway [verified, rfc8252]. iPhone and Android use their native passkey APIs; the web uses WebAuthn directly.
4. **The recovery kit is also an account credential.** A signing key derived from R lets a student with only the kit prove possession to the server without email, which removes the need for any email-based account recovery. Kit-only recovery starts the security delay from BLUEPRINT 5.3.
5. **Sessions are device-bound.** Short-lived access tokens and rotating refresh tokens, both bound to the device's hardware key SK_dev through DPoP (RFC 9449) [verified, rfc9449]. A stolen token without the device key is useless. RFC 9700 requires refresh tokens for public clients to be sender-constrained or rotated [verified, rfc9700]; Duly does both.
6. **Authorization has two layers.** Cryptography is the real control on content (who holds keys). Server policy is deny-by-default over ciphertext and account actions, checked on every request, with Postgres row-level security as a second wall. Future roles (DSO viewer, attorney with consent, staff) are added as explicit grants, and staff roles are built so that no role, including break-glass, can read student content, because no server key opens it.
7. **Build the identity service, narrowly, on vetted libraries; do not buy Cognito or Auth0 for it.** Both make passkey sign-in easy, which is the small part. Neither does a vault-signed device list, device-bound tokens, a recovery-kit credential or a security delay, so Duly builds those anyway. Cognito also needs the username typed before a passkey prompt and allows passkey registration only after a first sign-in by another factor [verified, cognito-flows]; Auth0 puts the list of Duly's users (itself a sign of likely non-citizen status) at a third party. Use py_webauthn (Duo Labs, BSD-3) on the FastAPI server [verified, py-webauthn], no custom cryptography, an outside review before launch. Cognito Essentials stays the named fallback.
8. **Three audit trails.** The student's own security history (inside the encrypted record, plus notices), a server security log (append-only, hash-chained, fixed schema, no personal data, copied to S3 Object Lock), and the staff and cloud trail (CloudTrail, Identity Center, Ops app, break-glass alarms).

---

## 1. Scope and the rules this must keep

| Rule | Source | Effect on identity |
|---|---|---|
| Documents live encrypted on the device; optional end-to-end backup; key only the student holds; Duly staff can never read it; lost key loses the backup | D54 | No server-side key escrow; no "admin reset" that restores access; recovery is the kit or an enrolled device |
| Documents are read on the device; nothing leaves for it | D55 | Identity services never receive document fields |
| No document value reaches any model, including Bedrock in Duly's own account | D60 | The Ask service's tokens carry no account identifiers or document values (section 6.6) |
| Ask uses Claude through Bedrock inside Duly's AWS account | D79 (replaces D77's "no model in v1"; BLUEPRINT 4.2 predates D79) | A new resource server (prod-assistant) that must authenticate callers without learning who they are beyond a rate-limit bucket |
| Mac, Windows, Android, iPhone from the start | D78 | Four native sign-in paths plus web; one RP ID |
| Hold almost nothing; ciphertext only; no standing human access | BLUEPRINT 5.5 | Data minimisation in the account table; staff roles without content access |
| Hard rule: no student data to an outside AI provider | CLAUDE.md | Identity data is not sent to any model |
| Read time only through a Clock | CLAUDE.md | Token expiry, security delays and grant expiry take an injected clock and are tested with fixed clocks |

What changes elsewhere: security/threat-model.md row "Credential stuffer: argon2id, MFA" assumes passwords. With passkeys only there is no password to stuff; that row should become "phishing and account takeover: passkeys, device-bound sessions, signed device list" (a contract change, not a lane change).

---

## 2. What the server holds for identity

Minimum set, extending research-security 3.8. Everything else stays on the device or does not exist.

| Table | Columns | Notes |
|---|---|---|
| account | account_id (random 128-bit), created_day, status, email_ciphertext (optional), email_lookup_hmac, recovery_auth_pubkey, security_delay_until, vault_epoch | No name, school, nationality, SEVIS ID, program dates. Email encrypted at the application layer under a KMS key (research-security 6.2); the HMAC (keyed, in KMS) allows lookup without storing plaintext |
| passkey | credential_id, account_id, public_key (COSE), sign_count, backup_eligible, backup_state, transports, created_day, last_used_day, label | Label set by the student ("iPhone passkey"); no device model fingerprint |
| device | device_id, account_id, sk_dev_pubkey (P-256), platform (ios, android, macos, windows, web), added_day, last_sync_day, state (pending, active, removed), push_token_ciphertext | Mirrors the vault-signed list; the signed list is authoritative for keys (section 5.4) |
| session | session_id, account_id, device_id, dpop_jkt (thumbprint of SK_dev), refresh_hash, family_id, created_at, last_used_at, absolute_expiry, revoked_at | Refresh tokens stored only as hashes |
| pending_action | action_id, account_id, kind (kit_enrol, new_kit, remove_last_device, delete_backup, delete_account, start_fresh), not_before, cancelled_at | The security delay (section 4.4) |
| grant (later) | grant_id, account_id, grantee_id, scope, resource_ids, not_after, revoked_at, signature | Consent grants for DSO and attorney (section 7.5) |
| security_event | see section 9 | Append-only |

Rule from WebAuthn: the user handle given to the authenticator must not contain personal information, so Duly's WebAuthn `user.id` is the random account_id, and `user.name` and `user.displayName` are what the student chooses (default "Duly account"), never the email unless the student types it [w3c-webauthn3; the "no personal information in user handle" wording is from Level 2 and Level 3, not re-quoted in this pass, unverified].

---

## 3. Signing in: passkeys and WebAuthn

### 3.1 Where the standards are, today

| Fact | Status | Source |
|---|---|---|
| WebAuthn Level 3 is a W3C Recommendation dated 2026-08-25, "no substantive changes since the Candidate Recommendation Snapshot of 26 May 2026" | verified | [w3c-webauthn3] |
| Level 3 adds signal methods: `signalUnknownCredential`, `signalAllAcceptedCredentials`, `signalCurrentUserDetails`, so a site can tell the passkey provider to hide a deleted passkey or update the account label | verified | [w3c-webauthn3] |
| Backup Eligibility (BE) flag is fixed at creation; Backup State (BS) "can change over time" | verified | [w3c-webauthn3] |
| PRF extension derives a per-credential secret (CTAP2 `hmac-secret`) | verified | [w3c-webauthn3] |
| Syncable authenticators are allowed at AAL2 and "SHALL NOT be used at AAL3" | verified | [nist-63b] section 3.1.7.3, 2.3.2 |
| AAL2 reauthentication: overall timeout no more than 24 hours, inactivity no more than 1 hour | verified | [nist-63b] section 2.2.3 |
| Verifiers "SHALL limit consecutive failed authentication attempts ... to no more than 100" | verified | [nist-63b] section 3.2.2 |

### 3.2 One relying party for every platform

- **RP ID:** Duly's registrable web domain (domain not yet chosen; founder decision). Every client, native or web, registers and uses passkeys under that one RP ID so a passkey made on the iPhone works on the web and on Windows through the system browser.
- **iPhone and Mac native:** `com.apple.developer.associated-domains` with `webcredentials:<domain>`, an `apple-app-site-association` file at `/.well-known/`, and `ASAuthorizationPlatformPublicKeyCredentialProvider` [verified, apple-passkeys].
- **Android:** Credential Manager (`CreatePublicKeyCredentialRequest`), Android 9 (API 28) or later, Digital Asset Links set up for the domain [verified, android-passkeys].
- **Web:** `navigator.credentials` on the RP ID origin.
- **Windows and Mac Electron app:** system browser, section 3.4.
- The `.well-known` files are the trust root for native passkeys, so they are served from the same CDN path as the public library, under change control, and a CI test fetches them after each deploy and compares with the repository copy.
- **Pick the RP ID before launch and never change it:** Cognito's documentation states the general rule plainly, "If you change your RP ID, your users must register again" [verified, cognito-flows].

### 3.3 Ceremony settings

| Setting | Value | Why |
|---|---|---|
| `residentKey` | required (discoverable) | Usernameless sign-in: the student taps "Sign in" and picks the passkey; no email typed, no account enumeration surface |
| `userVerification` | required | Face, fingerprint or device PIN on every ceremony; this is what makes one passkey a multi-factor authenticator at AAL2 |
| `attestation` | none | Duly does not gate on authenticator make; consumer passkeys from Apple, Google and password managers are the expected population. Device trust is handled separately (section 5.5) |
| Algorithms | ES256 (-7) first, then EdDSA (-8), RS256 (-257) | ES256 is near universal; RS256 kept for older Windows Hello authenticators [Windows Hello RS256 detail unverified] |
| Challenge | 32 random bytes, single use, expires in 5 minutes (proposal), stored server-side keyed to the ceremony | Replay protection |
| Origin and RP ID check | Exact match against an allowlist (web origin plus the Android `android:apk-key-hash:` origin for the release signing key) | The Android origin form is how Credential Manager reports native calls [unverified detail; confirm in Android docs before build] |
| Conditional mediation (autofill) | On for the web sign-in page | Lower friction; not required |
| BE and BS flags | Recorded per passkey | If the only passkey is not backed up (BS false), Today's security card nudges "Add a second passkey or check your kit" |
| Signal API | Call `signalAllAcceptedCredentials` after a passkey is removed | Stops the provider offering a dead passkey |
| Passkeys per account | Up to 10 (proposal) | Enough for several providers and security keys; caps abuse |

### 3.4 The Electron desktop app (Mac and Windows)

Electron renders Duly in its own window (the founder's request). Sign-in should still happen in the system browser:

1. **Why not inside Electron.** Platform passkeys are not wired into Electron (section 0, point 3) [verified, electron-24573]. Community native modules exist for macOS (`electron-webauthn-mac`, `electron-webauthn`, named in the same issue on 2026-08-27) but they would put a small third-party native module on the sign-in path; not recommended for a security core. Separately, RFC 8252 says "native apps MUST use an external user-agent" because "the app that hosts the embedded user-agent can access the user's full authentication credential" [verified, rfc8252 sections 5, 8.12]. And the Electron app loads its own pages from a custom protocol, not from the RP ID's https origin, so WebAuthn there would fail the origin check regardless.
2. **Flow.** The app's main process opens the system browser at `https://<domain>/desktop-sign-in` with a PKCE challenge (RFC 8252 section 6 requires PKCE for public native clients [verified, rfc8252]) and a redirect to `http://127.0.0.1:<random port>/cb` (loopback, RFC 8252 section 7.3). The student signs in with the passkey the browser already offers (iCloud Keychain, Google Password Manager, Windows Hello, 1Password). The browser returns a one-time code to the loopback listener; the main process exchanges code plus PKCE verifier plus a DPoP proof from SK_dev for tokens.
3. **Why loopback over a `duly://` scheme.** A private-use scheme can be registered by another app on the same machine; loopback with PKCE and a random port is the RFC's desktop recommendation [rfc8252 section 7.3, verified; the impersonation point is RFC 8252 section 8.6, not re-read in this pass, unverified]. A `duly://` deep link may still be used to bring the window forward, but it never carries the code.
4. **Where tokens live in Electron.** Only in the main process. The renderer never sees an access or refresh token; it calls the main process over a narrow, validated IPC surface, and the main process calls the API. This follows Electron's own guidance: context isolation, sandboxed renderers, no Node integration in renderers that load any remote content, "validate incoming IPC messages sender", restricted navigation, careful `shell.openExternal` [verified, electron-security].
5. **Device key.** SK_dev for the desktop lives in the Secure Enclave on Mac through the signed `duly-unlock` helper (research-security 3.3) and in the TPM on Windows through the platform key storage provider [Windows TPM via CNG "Microsoft Platform Crypto Provider" is the expected path; unverified in this pass]. The refresh token is stored with the OS keychain or DPAPI as a second layer, but its real protection is the DPoP binding to the hardware key.

### 3.5 Sign-up

1. Install, open, "Create my Duly". The device makes SK_dev and DK_dev, then K_vault and R locally (BLUEPRINT 5.2).
2. The student creates a passkey (discoverable, UV required). The server creates the account with a random account_id; no email needed to exist.
3. The recovery kit is shown and checked by typing two groups back (research-security 10). The device derives the recovery signing key (section 4.2) and registers only its public half.
4. Email is optional but strongly encouraged, with relay addresses welcome (BLUEPRINT 5.5). Its uses are: security notices during a delay, and the update email (D73). It is verified by a 6-digit code, and it is **never** a sign-in factor by itself.
5. The device registers itself as the first entry in the vault-signed device list.
6. Nudge: "Add your laptop too, so one lost phone loses nothing" (research-security 10).

App integrity at sign-up: Apple App Attest and Google Play Integrity can tell the server the request comes from a genuine build on a genuine device. Google says Play Integrity "works best when used alongside other signals ... and not as your sole anti-abuse mechanism", has a default quota of "10,000 total requests per day across all installs", and advises against caching verdicts [verified, play-integrity]. Apple's App Attest pages did not render in this pass [unverified detail]. Proposal: use both as a risk signal on sign-up and enrolment (raise rate limits for attested clients, add friction for unattested ones), never as a hard gate, because the web and Windows have no equivalent and a hard gate would lock out legitimate students on uncertified Android devices.

### 3.6 Abuse controls on sign-in

- **No enumeration.** Usernameless passkeys mean the sign-in page never asks "which account?". Where email is used (verifying an address), the response and timing are identical whether or not the address exists, as OWASP advises [verified, owasp-authn].
- **Rate limits** (proposal; tune with data): per IP and per /64 for IPv6 on ceremony start, 20 per minute; per account on failed assertions, progressive delay after 10 and lock the passkey after 100, matching NIST's ceiling [nist-63b]; email codes, 5 tries per code, 3 codes per hour; pairing, section 5.3. Limits enforced at AWS WAF (coarse) and in the service (precise), with a fixed log schema.
- **No security questions, no SMS, no voice.** NIST and every product studied avoid them; SMS also enables SIM-swap takeover.

---

## 4. Account recovery when the keys are end-to-end

### 4.1 Two recoveries, never confused

| Lost | What it blocks | What restores it |
|---|---|---|
| Sign-in (every passkey) | Getting a session, so fetching ciphertext | An enrolled device (it still has a device-bound session) or the recovery kit's signing key |
| Keys (every enrolled device) | Reading anything | Another enrolled device, or the kit (R opens K_vault) |

Email is in neither column. A mailbox takeover is common and silent; allowing it to recover a Duly account would make the weakest account the student owns the key to the most sensitive one.

### 4.2 The kit as an account credential (proposal)

R is 128 random bits held only in the kit. Derive two things from it on the device:

- `K_R = HKDF-SHA256(R, info="duly/v1/vault-wrap")` opens the wrap of K_vault (as in BLUEPRINT 5.2).
- `seed = HKDF-SHA256(R, info="duly/v1/recovery-auth")`, an Ed25519 signing key whose public half the server stores as `recovery_auth_pubkey`.

Recovery sign-in: the new device asks for a challenge, signs it with the derived key, and gets a restricted session that can only: register a new passkey, fetch the vault header and the R-wrap, and start a kit enrolment (which starts the security delay). Different HKDF labels keep the two uses independent. The server never sees R, and the public key reveals nothing about K_R. Rotating the kit (new R) replaces both.

Why this is better than email recovery: the kit already exists, already has 128 bits of entropy, and is already the thing that unlocks the vault. Making it also the account-recovery credential removes a weaker path instead of adding one.

### 4.3 Scenarios

| Situation | What the student does | Delay | Notes |
|---|---|---|---|
| Lost phone, still has laptop | Laptop removes the phone (epoch rotation, BLUEPRINT 5.3) | None | Phone's sessions revoked at once |
| Passkey deleted from the provider, devices fine | On an enrolled device: unlock, "Add a passkey" (step-up with SK_dev plus local user presence) | None | |
| All devices lost, synced passkey still works (new iPhone restored from Apple account) | Sign in with passkey (ciphertext only), then type the kit to get K_vault | Yes, the kit enrolment delay | Passkey plus kit is two factors, but a takeover of the passkey provider account is the most likely way an attacker also gets a synced passkey, so the delay stays (founder may shorten it for this case) |
| All devices and every passkey lost, kit in hand | Kit signs in (4.2), registers a new passkey, enrols the device | Yes | Notices to email if set |
| Kit lost, devices fine | Make a new kit on an enrolled device | Yes, plus fresh unlock (research-security 3.5) | Old R wraps and recovery key replaced when the delay ends |
| Everything lost (devices, passkeys, kit) | "Start fresh": a new vault under a new account. Old data cannot be opened by anyone, including Duly (D54) | n/a | Optional later: allow the email on file to close the old account and delete its ciphertext after a 7-day delay with notices; founder decision |
| Attacker has the kit only | Can start recovery; every enrolled device gets "Someone is trying to open your Duly with your recovery kit. Stop this" and the email gets the same | Delay is the defence | Stop needs an enrolled device unlock; stopping also forces a new kit |

### 4.4 The security delay

- **What it covers:** kit enrolment, making a new kit, removing the last other device, turning off or deleting backup, deleting the account, start fresh (research-security 3.5).
- **Length:** proposal 24 hours (BLUEPRINT 5.3, founder decision 12). Apple's Stolen Device Protection uses one hour for its own sensitive changes [apple-sdp via research-security].
- **Shortcut:** any enrolled device can approve and end the delay at once.
- **Cancel:** any enrolled device can cancel; cancelling a kit enrolment also rotates R.
- **Server-enforced, device-enforced:** the server refuses to release the R-wrap or to delete objects until `not_before`; enrolled devices also refuse to accept a device-list change signed after a kit enrolment until the delay has passed (they check the timestamp in the signed list against signed server time). Tested with an injected clock.
- **Residual risk, stated:** a student with no email on file whose devices are all offline for the whole delay will not see the notice. The setup screen says so when the student skips email.

### 4.5 Passkey PRF as an extra wrap, later

The WebAuthn PRF extension can give a stable per-passkey secret that wraps K_vault, so signing in on a new device could also open the vault. Research-security 3.6 recommends it only as an optional extra wrap, never the only one, because deleting that passkey loses the path and iOS 18.0 to 18.3 had data-destroying PRF bugs [corbado-prf via research-security; unverified here]. Keep it out of v1. If added, a PRF unlock on a new device still counts as a kit-equivalent enrolment and takes the delay, because a passkey provider takeover would otherwise become a vault takeover.

### 4.6 What support can and cannot do

Support can: explain the options, confirm whether an account has a pending delay (by account_id given by the student from the app), cancel nothing. Support cannot: add a device, remove a device, shorten a delay, reset a passkey, change the email, or see any record content. There is no "log in as user" tool. Written down because social engineering of support is the common path into accounts at consumer companies.

---

## 5. Device enrolment

### 5.1 What a device is

A device is an install of Duly with its own SK_dev (P-256 signing, hardware-backed where present) and DK_dev (unlock key under user presence), listed in the vault-signed device list (BLUEPRINT 5.2, 5.3). A browser profile with the web app is a device with weaker key storage (non-extractable WebCrypto keys in IndexedDB, research-security 3.3) and, per BLUEPRINT 5.5 and research-security 3.9, gets the record and documents only later, per approved session.

### 5.2 Two lists, one authority

- **Server device table:** decides which device may hold a session and fetch ciphertext. The server can change it (for example, to revoke).
- **Vault-signed device list** (signed by SK_vault_sign, with an epoch): decides which device keys ever receive K_vault. Only an enrolled device or the kit can change it. The server cannot add a reader (BLUEPRINT 5.3; WhatsApp key transparency as the larger version, research-security 3.5).
- A device acts only if it is on both. If they disagree (server lists a device the signed list does not), every device shows "A device we do not recognise is listed on your account" and opens a loop. This is how a compelled or breached server adding a device becomes visible.

### 5.3 Pairing a new device

As BLUEPRINT 5.3 and research-security 3.5, with identity details:

1. New device signs in with a passkey; gets a **pending-device session** that can only fetch the vault header and run pairing.
2. Every enrolled device is woken by a content-free push and shows "A new device wants to open your Duly: Chrome on Windows, now" (coarse place from IP, kept only for this message).
3. **Primary path, QR:** the student scans a QR shown by the new device with an enrolled device. The QR carries the new device's public key and a one-time secret; that is an authenticated out-of-band channel.
4. **Fallback, short code with PAKE:** the enrolled device shows a code; the student types it on the new device; both run CPace keyed by the code. CPace is an IRTF CFRG draft (draft-21, 2026-04-23) that lets "two parties that share a low-entropy secret ... derive a strong shared key without disclosing the secret to offline dictionary attacks" [verified, cpace]; 1Password uses it for the same job [1password-sso via research-security]. Use a library implementation, never a hand-written one.
5. **Rate limit for the PAKE:** each run gives an online attacker one guess. Proposal: 6-digit code, 3 failed runs end the pairing request, 5 pairing requests per account per day. Success odds for a blind attacker: 3 in 1,000,000 per request.
6. No one-tap "Approve" that only needs a press: push-approval fatigue is how MFA prompts get abused. The student must scan or type.
7. The enrolled device adds the new SK_dev to the list, signs it with a higher epoch, and sends K_vault over the authenticated channel. The server activates the device in its table only after it sees the new signed list.

### 5.4 Limits and states

- Max enrolled devices per account: 10 (proposal).
- States: pending (signed in, no keys), active (on both lists), removed (dropped from both; sessions revoked; epoch rotated).
- "Your devices" screen on every device: name, platform, added day, last sync day. "Remove" needs a fresh unlock; removing the last other device takes the delay.

### 5.5 Device and app attestation

- iPhone: App Attest key, attested once at enrolment, assertions on enrolment and recovery calls [API names from general knowledge; Apple page did not render, unverified].
- Android: Play Integrity standard requests on the same calls [verified, play-integrity]. Android Keystore key attestation of SK_dev is possible [not researched in this pass, unverified].
- Mac and Windows: no equivalent service; rely on code signing, notarisation and the signed device list.
- Web: none; this is one reason the web gets documents last.
- Use: a risk signal that tightens rate limits and adds a notice ("enrolled from an app we could not verify"), never a silent block.

---

## 6. Sessions and tokens

### 6.1 Shape

Duly's identity service is a first-party OAuth-style authorization server; the API (sync relay, account, devices), the library and the assistant are resource servers. No third-party clients exist, so no consent screens and no dynamic client registration.

| Token | Form | Life (proposal) | Bound to | Stored |
|---|---|---|---|---|
| Access token | JWT, ES256, signed by an asymmetric AWS KMS key; claims: `sub` (account_id, or pseudonym for Ask), `sid`, `did`, `aud`, `scope`, `cnf.jkt`, `exp`, `iat`, `jti` | 10 minutes | SK_dev via DPoP `cnf.jkt` | Memory only (main process on desktop) |
| Refresh token | 256-bit random, opaque | Idle 30 days, absolute 90 days on native; idle 30 minutes, absolute 12 hours on the web | SK_dev via DPoP; rotated on every use | Hash in Postgres; client keeps it in Keychain, Keystore, DPAPI or Keychain via the main process; web keeps it in a `__Host-` HttpOnly, Secure, SameSite=Strict cookie |
| Step-up proof | Fresh WebAuthn assertion or fresh local unlock signed by SK_dev | 5 minutes | Session | Server marks `sid` stepped-up until a time |
| Pending-device session | Access token with scope `pair` only | 15 minutes | New device's SK_dev | |
| Recovery session | Access token with scope `recover` only | 30 minutes | Recovery device's SK_dev | |

### 6.2 Why these choices

- **Sender-constrained tokens (DPoP).** "the access token cannot be used without proving possession of the respective private key", and for public clients the refresh token "MUST be bound to the respective public key" [verified, rfc9449]. ES256 matches Secure Enclave and StrongBox keys (P-256), so the device key that already exists signs DPoP proofs. Require the server nonce (`use_dpop_nonce`) on the token endpoint so proofs cannot be pre-generated [rfc9449 section 8, verified].
- **Rotation with reuse detection.** RFC 9700: refresh tokens for public clients "MUST be sender-constrained or use refresh token rotation" [verified, rfc9700 section 2.2.2]. Doing both costs little. If a rotated-out refresh token is presented again, revoke the whole family and notify the devices.
- **Audience restriction.** RFC 9700: access tokens "SHOULD be audience-restricted" and "restricted to certain resources and actions" [verified, rfc9700 section 2.3]. Separate `aud` values: `api`, `sync`, `library-private` (if ever), `ask`.
- **PKCE and code flow only, no implicit grant** [verified, rfc9700 2.1.1, 2.1.2; rfc8252 section 6].
- **Short access tokens instead of a revocation list check on every call.** Self-contained JWTs stay valid until expiry even after revocation; Cognito's own documentation warns that revoked tokens "will still be valid if they are verified using any JWT library" [verified, cognito-revoke]. Duly accepts up to 10 minutes of lag for ordinary calls and checks `sid` against a revoked-session cache for sensitive routes (device list, delete, sharing, recovery). Device removal also bumps the vault epoch, so even an unexpired token cannot fetch keys for the new epoch.
- **Session lifetimes versus NIST.** NIST AAL2 reauthentication is at most 24 hours overall and 1 hour idle [verified, nist-63b 2.2.3]. A record keeper on the student's own phone that asked for a passkey every day would be abandoned; and the account reaches only ciphertext. Proposal: native sessions do not claim AAL2 session management; instead every app open requires a local unlock (DK_dev under user presence, BLUEPRINT 5.5), and every sensitive action needs a step-up within 5 minutes. The web, which holds keys in a browser tab, follows the AAL2 numbers (12 hours absolute, 30 minutes idle). State this in the security page; do not claim NIST conformance Duly does not meet.
- **Web: Device Bound Session Credentials** let Chrome keep a TPM-held key and prove possession before short cookies are refreshed; Chrome's documentation lists it as shipped [verified, chrome-dbsc; version and non-Chrome support unverified]. Use it as an extra layer on the web where present; the cookie design works without it.

### 6.3 Revocation

| Trigger | Effect | Within |
|---|---|---|
| Student removes a device | All its sessions revoked; device dropped from both lists; epoch rotates (BLUEPRINT 5.3) | Immediate for sensitive routes; access token expiry (10 min) elsewhere; keys for the new epoch never |
| "Sign out everywhere" | All sessions except the current one revoked; devices must sign in again with a passkey (not re-pair; keys stay) | Same |
| Refresh token reuse | Family revoked; notice on all devices | Same |
| Passkey removed | No session effect; it just cannot start new sessions | n/a |
| Account deleted (after delay) | All sessions revoked; ciphertext deletion per the retention table | Same |
| Staff action | Staff can disable an account only for abuse, which revokes sessions; they cannot add or restore anything | Logged, two-person (section 7.6) |

### 6.4 Clocks

Token times use server time. Devices are told the server time in each token response; BLUEPRINT 6 already says device clocks are checked against signed time. Expiry, delay and grant checks are pure functions of an injected Clock, tested with fixed clocks (CLAUDE.md, write-clock-injected-property-test skill).

### 6.5 Key for signing tokens

An AWS KMS asymmetric key (ECC_NIST_P256, sign and verify) in prod-core; the private key never leaves KMS; public keys published at a JWKS endpoint for resource servers in other accounts. Rotate yearly with overlapping `kid`s. KMS charges per request; asymmetric request pricing was not confirmed in this pass [unverified; research-system 10.3 cites $1 per key per month plus $0.03 per 10,000 symmetric requests]. At 10-minute tokens the number of signatures is small (rough: 100k students, about 2 sign-ins or refreshes a day each, about 6 million a month).

### 6.6 Tokens for Ask (D79)

The assistant runs in a separate account (prod-assistant, research-system 10.1). It must know that a caller is a real Duly device and enforce a rate limit, and it should not know which account is asking, so a question cannot be joined to an email in one place.

- The client exchanges its session for an **Ask token**: `aud=ask`, `sub` = a pseudonym (HMAC of account_id with a key held only in prod-core, rotated weekly), `scope=ask:invoke`, 10 minutes, DPoP-bound.
- prod-assistant verifies the token with the published JWKS; it never calls prod-core's database.
- Rate limit by the pseudonym (proposal: 30 questions per hour, 200 per day), plus WAF limits per IP.
- Under D60, no document values ride in the token or in the request; the token carries no email, school or device name.
- Residual: prod-core could join pseudonym to account; that join is not stored and not logged, and is stated in the request policy. For stronger unlinkability later: privately issued anonymous tokens (Privacy Pass style) or Oblivious HTTP (BLUEPRINT 6) [not researched in this pass].

---

## 7. Authorization model

### 7.1 Two layers

1. **Cryptographic (the real control for content).** Who holds K_vault, F and K_item decides who can read. The server cannot grant reading; it can only refuse to serve ciphertext. This is why staff roles cannot leak content even when misconfigured.
2. **Server policy (the control for everything the server does).** Which session may fetch or write which ciphertext, list or change devices, start recovery, invoke Ask, create a share, or read operational data. Deny by default, checked on every request, as OWASP advises ("deny by default", validate on every request, server-side only, log failures, test the logic) [verified, owasp-authz].

### 7.2 Principals

| Principal | Who | Identified by |
|---|---|---|
| Student | Account owner | Session (account_id, device_id) |
| Device | One install | SK_dev, on both lists |
| Pending device | Signed in, not yet paired | Session with scope `pair` |
| Recovery client | Kit holder during recovery | Session with scope `recover` |
| Reviewer (later) | DSO viewer or attorney with consent | Their own Duly account and passkey, plus a grant |
| Staff (later, small) | Support, ops publisher, infrastructure admin, security auditor | IAM Identity Center or Ops app identity with hardware security key |
| Service | API, workers, pipeline, assistant | AWS IAM role; mTLS or SigV4 between services |

### 7.3 Resources and actions (v1)

| Resource | Actions | Allowed when |
|---|---|---|
| Account | read own, update email, delete | Own session; update and delete need step-up; delete takes the delay |
| Passkeys | list, add, remove, rename | Own session; add and remove need step-up |
| Devices | list, remove, pair | Own active device; remove needs step-up; pair needs scope `pair` on the new device and an active device on the other side |
| Vault header, device list | read, write new epoch | Read: any own device including pending. Write: only an active device, and the server checks the signature and epoch order before accepting |
| Event log segments, file blobs | put, get, list | Own active device; object ids random; server checks account ownership on every id (no IDOR, owasp-authz) |
| Backup | enable, disable, delete | Own active device; disable and delete take the delay |
| Recovery | start, cancel, approve | Start: scope `recover`; cancel and approve: an active device |
| Ask | invoke | Ask token (6.6) |
| Public library | read | Anyone, no auth (BLUEPRINT 5.5: "fetched without auth") |
| Shares (later) | create, revoke, read | 7.5 |

### 7.4 How to implement it

- **v1: a small, explicit policy module in the API**, one function per action, a single decorator that every route must use, and a CI test that fails if any route lacks one (a gate addition). Table-driven tests for every row in 7.3, including the denials.
- **Postgres row-level security as the second wall.** Enable RLS with `FORCE ROW LEVEL SECURITY` on every account-owned table; the app's database role has no `BYPASSRLS`; the account id is set per transaction. With RLS on and no policy, "a default-deny policy is used"; owners bypass unless forced; superusers and `BYPASSRLS` roles always bypass [verified, postgres-rls]. A route bug then returns nothing rather than another student's rows.
- **When roles beyond the student ship: Cedar.** Cedar is an Apache-2.0 policy language implemented in Rust, with a WebAssembly build, "designed for analysis using Automated Reasoning", with a symbolic compiler that can prove properties of a policy set [verified, cedar-github, cedar-docs]. It supports RBAC and ABAC [verified, cedar-docs]. Run it in-process (Rust core or WASM) so there is no network hop. A Python binding exists as a third-party package [unverified]. Amazon Verified Permissions hosts Cedar for $0.000005 per single authorization request (about $5 per million) with no minimum [verified, avp-pricing]; cheap, but it adds a network dependency on every request, and the policy set is small enough to run locally.
- **Why not OpenFGA or Zanzibar-style now:** relationship graphs pay off with many shared objects and nested groups. Duly's sharing is one student to a few reviewers, time-boxed; Cedar's entity model covers it [design judgement].

### 7.5 Future roles

**DSO viewer (read-only, with consent).**
- The student chooses what to share (a "share pack": selected facts, dates and documents), for how long (proposal: default 14 days, max 90), with whom.
- The pack is encrypted on the device to a fresh key, and that key is encrypted to the reviewer's public key (the reviewer has a Duly account with its own device keys) or, for reviewers without an account, placed after `#` in a link (research-security 3.10, Tresorit and Proton patterns).
- The server stores a **grant**: grantee, scope (pack id, read), not_after, signed by the student's SK_vault_sign, so the server cannot invent a grant. The server enforces expiry and revocation on fetch.
- Revocation stops future fetches; it cannot unread what was opened. The app says so, and History records "Shared with Ms Lee, expires Oct 15; opened Oct 3".
- No DSO console with bulk or school-wide access. A school-level tool would change Duly's legal and trust position and is a founder and counsel decision (FERPA and school agreements are counsel questions, not researched here) [unverified].
- Reviewer identity: a passkey account; optionally a verified school email domain shown to the student as "uses an @school.edu address" (a fact, not a vouch). Domain verification is a later choice.

**Attorney with consent.** Same as DSO viewer, plus an optional write path: the attorney can send "suggestions" (a corrected date with a source) as events signed by the attorney's key. They land in the student's record as questions to confirm, never as facts, because Duly confirms and never assumes (CLAUDE.md). The engine still computes every date.

**Admin with least privilege.**

| Staff role | Can | Cannot | How they sign in |
|---|---|---|---|
| Support | See account status for an account_id the student gives: pending delay yes or no, device count, last sync day | See email in plaintext, content, ciphertext ids, devices' names; change anything | Identity Center, hardware key |
| Ops publisher | Draft and approve rule updates; part of 2-of-3 bundle signing | Touch accounts or the prod-core database | Ops app: hardware key, IP allowlist (D17), re-auth to publish (research-system 10.6) |
| Infrastructure admin | Deploy through CI; time-bound elevated roles for incidents | Read the S3 ciphertext buckets or decrypt the email column without break-glass | Identity Center permission sets with a session limit |
| Security auditor | Read logs and CloudTrail in the security account | Write anything | Identity Center |
| Founder | Approvals per D22; one of the signers | Read content (no key exists) | Same as above |

Separation that matters for a small team: the person who approves a law update and the second release signer are different people (BLUEPRINT risk 15, founder decision 16).

**Break-glass.** Follow AWS Well-Architected SEC03-BP03: a dedicated emergency access account, pre-created roles, used only for defined failure modes (identity provider down, Identity Center broken), "detailed audit logs for all successful and failed attempts", alerts when used "during normal operations", credentials rotated after use, and periodic tests in game days [verified, aws-emergency-access]. For Duly: two named holders, hardware MFA, EventBridge alarm on any sign-in to that account paging both the founder and the second holder, SCPs that deny deleting the emergency roles. Break-glass cannot read content because no server key opens it; that property is the point and is tested (section 10).

### 7.6 Forbidden by policy, whatever the role

- No impersonation ("log in as student").
- No bulk export of accounts or emails.
- No staff action adds a device, passkey or grant to a student account.
- Disabling an account for abuse needs two staff approvals and notifies the student's devices.
- Every staff action is a security event (section 9).

In Cedar these become `forbid` policies that override any `permit` (Cedar's forbid-overrides-permit semantics; not re-quoted from the docs in this pass) [unverified wording].

---

## 8. Cognito versus Auth0 versus building it

### 8.1 What each gives

| Criterion | Amazon Cognito (Essentials) | Auth0 (Okta) | Build on vetted libraries |
|---|---|---|---|
| Passkeys | Yes, in Essentials and Plus, not Lite; only in the choice-based `USER_AUTH` flow [verified, cognito-flows] | "Included" on all B2C plans [verified, auth0-pricing] | py_webauthn (server) [verified, py-webauthn]; platform APIs on clients |
| Usernameless (discoverable) sign-in | No: "Users must provide a username before Amazon Cognito can initiate passkey authentication" [verified, cognito-flows] | Supported [unverified in this pass] | Yes |
| Passkey as the first credential at sign-up | No: users "can only register a passkey after they have signed in to your user pool at least once" (so first sign-in by email or SMS code) [verified, cognito-flows] | [unverified] | Yes |
| Attestation enforcement | "doesn't currently support attestation enforcement" [verified, cognito-flows] | [unverified] | Optional; Duly does not need it |
| Max passkeys per user | 20 [verified, cognito-flows] | [unverified] | Duly's choice |
| Device-bound tokens (DPoP) | Not found in the documentation read; tokens are bearer JWTs [unverified that DPoP is absent] | Auth0 lists DPoP support [unverified] | Yes (RFC 9449) |
| Revocation | Revoking a refresh token kills its access tokens for Cognito APIs, but "revoked tokens will still be valid if they are verified using any JWT library" [verified, cognito-revoke] | [unverified] | Same JWT trade-off; mitigated by 10-minute tokens and a `sid` check on sensitive routes |
| Vault-signed device list, pairing, recovery kit credential, security delay | No | No | Must be built in all three cases |
| Where the user list lives | Duly's own AWS account, us-west-2 | Okta's cloud (third party) | Duly's own AWS account |
| Price | 10,000 MAU free, then $0.015 per MAU [verified, cognito-pricing] | Free up to 25,000 MAU; Essentials "From $35" a month; custom tiers above [verified, auth0-pricing] | Compute and Postgres already paid; KMS signing (6.5) |
| Cost at 1k / 10k / 100k MAU | $0 / $0 / about $1,350 a month (90,000 x $0.015) | $0 / $0 / custom quote [unverified] | Near $0 extra; the real cost is engineering time and an outside review |
| Exit | User pool export does not carry passkeys [unverified]; passkeys are bound to the RP ID, which Duly owns, so moving is possible if RP ID is Duly's domain | Same RP ID point [unverified detail] | n/a |
| Track record | AWS-run | Okta support system breach, 2023-09-28 to 10-17: HAR files with session tokens for 134 customers, 5 sessions hijacked [verified, okta-2023] | Duly's own; mitigated by narrow scope and review |

### 8.2 Recommendation

Build a narrow identity service inside the existing FastAPI API, using:

- py_webauthn for registration and assertion verification (Duo Labs, BSD-3, Python 3.10+) [verified, py-webauthn]. SimpleWebAuthn is the TypeScript equivalent if the server language changes [verified, simplewebauthn].
- Platform APIs on clients (ASAuthorization, Credential Manager, browser WebAuthn) and the system browser for Electron.
- A standard DPoP verifier and JWT library (choice at build time; prefer a library with a published security review) [unverified which].
- KMS for token signing; no hand-written cryptography anywhere in this service.
- CODEOWNERS with a named human security reviewer on `identity/`, as already planned for crypto paths (BLUEPRINT 5.5).

Reasons, in order:
1. The hard parts (signed device list, pairing, kit credential, security delay, device-bound sessions, consent grants) are not offered by any vendor and must be built anyway. A vendor would add a second identity system to keep consistent with Duly's own.
2. Cognito's passkey model does not fit: username typed first, a non-passkey first sign-in required, bearer tokens. Each of those is a step backwards for a passkey-only, usernameless, device-bound design.
3. An outside identity provider holds the list of everyone who uses Duly; for this population that list is sensitive by itself (research-security 6.2: "a list of email addresses that use Duly ... reveals likely non-citizen status"). Keeping it in Duly's own account keeps the government-request surface to one company with one published policy.
4. Cost is not the decider at Duly's scale: Cognito is free to 10,000 MAU.

Risks of building, and the answer: (a) "rolling your own auth" bugs; answer: verification and token handling only through maintained libraries, a written protocol spec, the property and negative tests in section 10, and an outside review before the first stranger. (b) Bus factor; answer: this file plus a runbook; the service is small by design.

Fallback if the founder prefers managed: Cognito Essentials as the passkey verifier only (user pool with passkey and email OTP first factors, RP ID set to Duly's domain), with Duly's own device-bound session layer and device enrolment on top. It would keep data in Duly's AWS account; it would cost the usernameless flow and add an email-code step at sign-up.

---

## 9. Audit trail

### 9.1 Three trails

| Trail | Who reads it | Where | Contents |
|---|---|---|---|
| Student's security history | The student, on every device | Inside the encrypted record, as signed events (research-system 3.1: the record is an append-only event log) | Device added and removed, passkeys added and removed, recovery started, approved, cancelled, kit made, sharing granted, opened, revoked, backup on and off |
| Server security log | Security auditor; incident response | Postgres table (append-only, hash-chained) streamed to the log archive account in S3 Object Lock | Same events from the server's view, plus failures and rate-limit hits, with no personal data |
| Staff and cloud trail | Security auditor; founder | CloudTrail organisation trail, Identity Center sign-ins, Ops app audit log (research-system 10.6) | Every human and CI action on infrastructure and the rule library; break-glass use |

The server mirrors security events to the student's devices as notices ("A new passkey was added from Chrome on Windows"), so a takeover is visible to the person it targets, not only to Duly.

### 9.2 Event catalogue (server security log)

Always logged, following OWASP: "Authentication successes and failures", "Authorization (access control) failures", "Session management failures", user administration and privilege changes, and use of administrative privileges [verified, owasp-logging].

| Event | Fields (fixed schema) |
|---|---|
| passkey.registered, passkey.removed, auth.succeeded, auth.failed | event_id, time, account_ref, credential_ref, platform, result, reason_code |
| session.created, session.refreshed, session.reuse_detected, session.revoked | + session_ref, device_ref |
| device.pending, device.activated, device.removed, device.list_mismatch | + epoch |
| recovery.started, recovery.cancelled, recovery.completed, delay.ended | + action_ref, not_before |
| authz.denied | + route_template, policy_id |
| ratelimit.hit | + limiter_id |
| staff.action, breakglass.used | + staff_ref, approver_ref, ticket_ref |
| grant.created, grant.fetched, grant.revoked (later) | + grant_ref |

`account_ref` and the other refs are HMACs with a key that rotates (research-system 10.5), so the log alone does not name anyone. IP addresses stay only in WAF and load balancer logs for 7 days (BLUEPRINT 6). Never logged: session ids, access or refresh tokens, WebAuthn challenges or assertions, recovery material, emails, keys [verified as OWASP's never-log list for tokens, sessions, keys and government identifiers, owasp-logging].

### 9.3 Tamper evidence and retention

- Each row carries the hash of the previous row; a daily digest is signed with a KMS key and written to the log archive account.
- The log archive bucket uses S3 Object Lock. Compliance mode means an object version "can't be overwritten or deleted by any user, including the root user" for the retention period [verified, s3-object-lock]. Proposal: compliance mode, 1 year, for the server security log and CloudTrail; governance mode while testing.
- Tension to resolve: "hold almost nothing" (BLUEPRINT 5.5) against keeping a year of security events. The events hold no personal data and refs rotate, so a year is defensible; the founder sets the number in the retention table (BLUEPRINT 5.5, counsel review).
- Reading the logs is itself logged ("All access to the logs must be recorded and monitored") [verified, owasp-logging].

### 9.4 Alerts

Page the founder and the second holder on: break-glass sign-in; any staff write to prod-core; device.list_mismatch spikes; session.reuse_detected spikes; recovery.started spikes (a kit-theft wave); failed WebAuthn verification spikes; changes to the `.well-known` files.

---

## 10. Threats specific to identity, and tests

| Threat | Answer | Test |
|---|---|---|
| Phishing | Passkeys are bound to the RP ID origin (research-security 6.1) | Ceremony from a wrong origin is refused |
| Passkey provider account taken over (Apple or Google) | Attacker signs in and gets ciphertext only; enrolment needs a device or the kit plus the delay | Passkey-only session cannot fetch any K wrap |
| Stolen refresh or access token | DPoP binding; rotation with reuse detection | Replay without SK_dev fails; reused refresh revokes family |
| Kit stolen | Delay plus notices; cancel from any device | Clock-injected: R-wrap not released before not_before |
| Compelled or breached server adds a device | Vault-signed list; mismatch shown to the student | Forged list refused; server-only device never gets K_vault |
| Support social engineering | Support has no actions that add access | Policy test: every staff role denied on every account write |
| Push-approval fatigue | Pairing needs scan or typed code | No endpoint approves pairing without the PAKE or QR transcript |
| Electron renderer compromised (XSS in a page) | Tokens only in the main process; validated IPC; sandbox | Renderer has no API to read tokens; IPC sender check tested |
| Account enumeration | Usernameless; identical responses on email paths | Timing and body comparison test |
| Credential stuffing, brute force | No passwords; rate limits; NIST 100-failure cap | Limiter tests |
| Break-glass misuse | Alarms, logs, no content key exists | Game day: break-glass role cannot decrypt any object |
| Recorded bytes | No identity field carries record content (BLUEPRINT 6 recorded-bytes test) | Canary SEVIS IDs and names never appear in auth traffic or logs |

Also: a property test that every API route has a policy decision; a test that no log call writes a field outside the schema (research-system 10.5); fuzzing of the WebAuthn, DPoP and device-list parsers (BLUEPRINT 5.5).

---

## 11. Build order (fits BLUEPRINT 8)

| BLUEPRINT phase | Identity work |
|---|---|
| 1, contracts | identity section of openapi.yaml (ceremonies, token, devices, recovery), security event schema, grant schema; threat-model.md row change from passwords to passkeys |
| 2, desktop slice | Local-only; no account needed. Electron security baseline (context isolation, sandbox, IPC validation) so the main-process token store is ready |
| 4, iPhone local-only | Account creation with passkey; recovery kit and recovery-auth key; no sync yet |
| 5, pairing and sync | Device table, vault-signed list, QR and CPace pairing, DPoP sessions, revocation, security delay; Electron system-browser sign-in; protocol spec and formal model first (BLUEPRINT 6 security) |
| 6, backup | Delay on backup actions; Object Lock audit trail; break-glass account and alarms; outside review and pen test of identity with the crypto audit |
| 9, first strangers | Incident runbooks for account takeover and kit theft; support script (4.6) |
| Later | Sharing with DSO and attorney (Cedar), web documents per approved session, passkey PRF wrap, anonymous Ask tokens |

---

## 12. Decisions for the founder

1. Build the identity service on vetted libraries (recommended) or use Cognito Essentials as the passkey verifier (fallback).
2. Electron signs in through the system browser (recommended) rather than a third-party native passkey module.
3. The recovery kit is also the account-recovery credential; email never recovers an account.
4. Email optional (recommended, with the residual-risk sentence) or required.
5. Security delay length; whether passkey-plus-kit shortens it.
6. Session lifetimes: native idle 30 days and absolute 90 days with local unlock on every open; web 30 minutes idle and 12 hours absolute; step-up freshness 5 minutes.
7. Max devices (10) and max passkeys (10) per account.
8. "Start fresh" with email-verified closure of the old account after 7 days, or no closure path at all.
9. Ask pseudonym tokens (section 6.6) and the Ask rate limits.
10. Security log retention (proposal 1 year, compliance mode) for the retention table.
11. Who holds break-glass besides the founder; who is the second signer and security reviewer (already BLUEPRINT decision 16).
12. Whether a DSO-facing tool is ever in scope (counsel question first).
13. The domain to use as the passkey RP ID, chosen once.

---

## 13. Sources

Fetched in this pass:
- [w3c-webauthn3] W3C, Web Authentication Level 3, Recommendation 2026-08-25: https://www.w3.org/TR/webauthn-3/
- [nist-63b] NIST SP 800-63B-4: https://pages.nist.gov/800-63-4/sp800-63b.html
- [rfc9700] RFC 9700, OAuth 2.0 Security Best Current Practice: https://www.rfc-editor.org/rfc/rfc9700.html
- [rfc9449] RFC 9449, OAuth 2.0 Demonstrating Proof of Possession (DPoP): https://www.rfc-editor.org/rfc/rfc9449.html
- [rfc8252] RFC 8252, OAuth 2.0 for Native Apps: https://www.rfc-editor.org/rfc/rfc8252.html
- [cpace] IRTF CFRG, CPace, draft-irtf-cfrg-cpace-21 (2026-04-23): https://datatracker.ietf.org/doc/draft-irtf-cfrg-cpace/
- [electron-24573] Electron issue 24573, WebAuthn FIDO/FIDO2 Support (open; comments to 2026-09-23): https://github.com/electron/electron/issues/24573
- [electron-security] Electron security checklist: https://www.electronjs.org/docs/latest/tutorial/security
- [apple-passkeys] Apple, Supporting passkeys: https://developer.apple.com/documentation/authenticationservices/supporting-passkeys
- [android-passkeys] Android, Create a passkey with Credential Manager: https://developer.android.com/identity/passkeys/create-passkeys
- [play-integrity] Android, Play Integrity API overview: https://developer.android.com/google/play/integrity/overview
- [chrome-dbsc] Chrome, Device Bound Session Credentials: https://developer.chrome.com/docs/web-platform/device-bound-session-credentials
- [cognito-flows] AWS, Cognito user pool authentication flows (passkeys section): https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html
- [cognito-pricing] AWS, Cognito pricing: https://aws.amazon.com/cognito/pricing/
- [cognito-revoke] AWS, Cognito token revocation: https://docs.aws.amazon.com/cognito/latest/developerguide/token-revocation.html
- [auth0-pricing] Auth0 pricing: https://auth0.com/pricing
- [okta-2023] Okta, Unauthorized access to Okta's support case management system, root cause: https://sec.okta.com/articles/2023/11/unauthorized-access-oktas-support-case-management-system-root-cause
- [py-webauthn] Duo Labs, py_webauthn: https://github.com/duo-labs/py_webauthn
- [simplewebauthn] SimpleWebAuthn: https://simplewebauthn.dev/docs/
- [cedar-github] Cedar policy language repository: https://github.com/cedar-policy/cedar
- [cedar-docs] Cedar documentation: https://docs.cedarpolicy.com/
- [avp-pricing] Amazon Verified Permissions pricing: https://aws.amazon.com/verified-permissions/pricing/
- [owasp-authz] OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- [owasp-authn] OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- [owasp-logging] OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- [postgres-rls] PostgreSQL, Row Security Policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- [s3-object-lock] AWS, S3 Object Lock: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- [aws-emergency-access] AWS Well-Architected, SEC03-BP03 Establish emergency access process: https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/sec_permissions_emergency_process.html

Carried from research-security.md and research-system.md (not re-fetched): 1Password SSO and trusted-device design (https://agilebits.github.io/security-design/passkeySSO.html), Apple ADP and Stolen Device Protection, Bitwarden and Corbado on WebAuthn PRF (https://bitwarden.com/blog/prf-webauthn-and-its-role-in-passkeys/, https://www.corbado.com/blog/passkeys-prf-webauthn), WhatsApp and Cloudflare key transparency (https://blog.cloudflare.com/key-transparency/), GitHub OIDC in AWS (https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws), CloudWatch Logs data protection.

### Unverified in this pass

- Apple App Attest API details and limits (Apple pages did not render).
- Whether Cognito tokens can be DPoP-bound; whether Cognito exports passkeys; Auth0's usernameless, DPoP and large-tier pricing details.
- The Android native-call origin format (`android:apk-key-hash:`) for server-side origin checks.
- Windows TPM key path for the Electron main process; Windows Hello's RS256 default.
- KMS asymmetric signing request price.
- DBSC Chrome version and support outside Chrome.
- A maintained Python binding for Cedar.
- The WebAuthn wording that the user handle must not contain personal information (believed present in Level 2 and 3).
- RFC 8252 section 8.6 on private-use scheme impersonation (cited from memory of the RFC's structure).
- Cedar's forbid-overrides-permit wording.
- FERPA or school-agreement implications of any DSO tool (counsel).
