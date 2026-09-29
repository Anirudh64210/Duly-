# 05 Security, Privacy, Encryption

Honesty first: no system "cannot be hacked" and Duly will never claim it. The commitment is: a written threat model, an architecture where the worst compromise yields the least, continuous adversarial testing against that model, and published proof. That is the Signal, Proton, 1Password pattern and it is what survives scrutiny.

## Threat model (security/threat-model.md, maintained)
Adversaries: opportunistic credential stuffers, a breached or subpoenaed cloud, a malicious uploaded document driving the LLM, a stolen laptop, an insider or stolen admin session, data brokers and warrant-free purchase, a compelled request for a user's records.
Crown jewels: document blobs and names, case identifiers (SEVIS, passport), narration audit content, admin access.
Design answer per adversary is listed in the file; the invariant: the server can never produce plaintext documents because it never has them.

## Encryption and decryption design
- Device (WorkBook and vault blobs): SQLCipher database and per-file AES-256-GCM blobs; keys derived and held in OS keychain (Keychain, DPAPI, libsecret); export packs re-encrypted per link.
- Cloud fields: envelope encryption. Per-user data key (DEK) generated at signup, encrypts sensitive columns (case identifiers, synced entry texts, feedback bodies) with AES-256-GCM; DEK wrapped by a KMS CMK; unwrap only inside api at request time; key ids versioned for rotation; crypto-shred on account deletion (destroy wrapped DEK, hard-delete rows, documented backup purge window).
- Transit: TLS 1.2+ everywhere, HSTS, ALB terminates, internal service calls stay in the VPC.
- Secrets: AWS Secrets Manager, never in env files in prod; gitleaks in CI; short-lived DB creds via IAM auth where supported.
- Passwords argon2id; sessions httpOnly Secure SameSite=Lax, server-side revocation; user MFA (TOTP) available day one, required for export links management.

## Ops auth model (decided)
- Separate admin identity table; no shared users rows, no role escalation path from the app.
- WebAuthn hardware key mandatory for every ops login; TOTP fallback only for break-glass, stored sealed.
- Ops served on its own hostname behind WAF with an IP allowlist option; sessions 8 hours, re-auth for destructive actions (publish rule pack, delete user, revoke link).
- Every admin action writes to the same hash-chained audit log with actor, before and after.
- Two-person rule flag ready for rule-pack publish once a second reviewer exists.

## LLM and document attack surface
- Prompt injection: retrieved pack text and any user-derived strings enter prompts inside delimited untrusted blocks with spotlighting instructions; narration output passes the no-new-facts validator, markdown link and image URLs stripped, no tool side effects reachable from content.
- Attack corpus in security/: injection strings inside fake I-20 metadata, jailbreak set, exfil probes; runs in CI (07) and nightly by the red-team lane (08).
- Provider: no-training default confirmed; pursue ZDR terms before any retention claim; per-tenant token budgets; model and prompt versions in every audit row.

## Government and legal process posture (launch artifacts)
Published law-enforcement policy: enumerate exactly what exists server-side (ciphertext plus listed metadata), commit to challenging administrative subpoenas, user notification unless legally barred, periodic transparency notes. Plus: no third-party analytics or ad SDKs in any client, ever; bankruptcy and acquisition data commitments stated in the privacy policy.

## Privacy compliance build (from the compliance report, operationalized)
- Consent: unbundled opt-in screen for immigration-status processing (TDPSA floor), symmetric choices, revocable in Settings; consent_events append-only.
- Minimization to Maryland strictly-necessary standard; one portable DPIA maintained in security/.
- Rights: export and delete flows with 45-day SLA timers surfaced in Ops pane 4; GPC honored on web.
- Claim scoping enforced by copy lint: the exact two-part sentence pattern (documents stay on device; questions and account data go to our servers and AI provider) and never an unqualified never-leaves claim.
- Disclaimer stack: Texas 81.101(c) sentence verbatim on marketing, signup clickwrap (Meyer standard: unticked box, linked terms, logged version), one-time interstitial before first AI answer, fixed per-answer footer.

## Verification cadence
CI security gates every PR (07); `make attack` full adversarial suite; ZAP baseline weekly; dependency audit daily; internal red-team lane nightly; external penetration test before public launch and annually; VDP with security.txt from day one; SOC 2 deferred until the university channel demands it; incident runbook with a 72-hour disclosure commitment.
