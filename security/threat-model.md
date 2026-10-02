# Threat model v1

Duly will never claim it cannot be breached. The commitment is a design where the worst breach yields the least, tested against this list, and published.

## What is worth stealing

| Asset | Where it lives | Why it matters |
|---|---|---|
| Document files and their names | The user's device only | Identity theft; exposure of status |
| Case identifiers (SEVIS id, passport number) | Cloud, encrypted per user | Same |
| Immigration status and nationality | Cloud, encrypted per user | Targeting by enforcement or data brokers |
| Assistant questions | Our servers; the model host | Reveal what a user fears |
| Ops access | Ops app | Can publish a false rule or update to every user |
| The rule library and updates | Cloud | A false rule harms every user at once |

## Who might attack, and the design answer

| Adversary | Attack | Answer | Status |
|---|---|---|---|
| Credential stuffer | Reused passwords | argon2id, MFA, server-side session revocation | Phase 1 |
| Breached or subpoenaed cloud | Reads the database | Documents never reach the server. Sensitive fields are encrypted with per-user keys | Phase 1 |
| Government request | Administrative subpoena | The server holds ciphertext and listed metadata only. Published policy: warrant required, user notified, overbroad requests challenged | Phase 9 |
| Data broker | Buys or scrapes data | No sale of any data. No third-party analytics or ad code in any client | Enforced from Phase 0 by dependency review |
| Malicious document | Text in an uploaded file steers the model | Document contents never reach a model. The assistant speaks only from the verified library | Phase 5 |
| Poisoned source | A fake or altered page enters the updates pipeline | Primary sources only, by allowlisted host. Quote must be found in the saved copy. Two independent checks. Founder approval | Rule in Phase 0; sources in Phase 6 |
| User walking the assistant over the line | Small steps toward a personal conclusion | Classifier reads the whole conversation. Output validator rejects conclusions. Doubt resolves to a step back | Floor in Phase 0; model in Phase 5 |
| Stolen laptop | Reads local WorkBook data | SQLCipher store, key in the OS keychain, auto lock | Phase 8 |
| Stolen Ops session or insider | Publishes a false rule | Hardware key login, network allowlist, re-auth for publishing, every action in the audit log | Allowlist in Phase 0; rest in Phase 6 |
| Build agent gaming its grade | Edits tests or gates to pass | Path ownership by lane, enforced by hooks and gate 3. Hidden tests. Mutation checks | Hooks and gate 3 in Phase 0 |
| Supply chain | Malicious dependency | Lock files, audit on every push, lanes cannot add dependencies | Phase 0 |
| Local process on the founder's Mac | Talks to the bundled engine, or stands in for it to serve wrong dates | The engine channel is no longer a local port (the old bind, release, then start left a gap in which another process could take the port and receive the token). It is a Unix domain socket, `<userData>/run/engine.sock`, in a `run` folder made 0700 and checked on every launch (owner, not a symlink, mode). The engine binds the socket itself under umask 0o177 and sets 0600; main lstats it (a socket, this user, no group or world bits) before the first request. The 32-byte token is still required on every route, `/health` included, and travels on the engine's stdin, never in argv or the environment. A path over 103 bytes falls back to a fresh 0700 `duly-<random>` folder under the per-user temp folder. Same-user code is out of scope: it can already read the user's files | Step W1 (SPEC-W1 points 6 to 10) |
| Tampered bundled runtime | Swaps a file under Resources/python or engine-root | Main hashes every file in python-manifest.json before starting the engine and refuses on any change, missing or extra file. Python runs with `-I -B` and a reduced environment. Fuses turn off RunAsNode, NODE_OPTIONS and inspect arguments, and turn on asar integrity and app-from-asar only | Step W1 (points 16, 17, 20) |
| Copy of the founder build on another Mac | Runs or redistributes a build nobody can trace | The founder build is signed ad-hoc (`codesign --sign -`), or with a self-signed code-signing identity from the founder's login keychain (`DULY_SIGN_IDENTITY`). Neither proves who made it: `spctl --assess` rejects both and Gatekeeper blocks a copy on another Mac, which is the intended limit. The build holds made-up data only. Developer ID signing, a timestamp and notarization replace both when the Apple account exists | Step W1 (points 21, 22); Developer ID later |

## Invariants that are tested

1. The server cannot produce a plaintext document, because it never has one.
2. No user data is sent to an outside model provider.
3. No update reaches a user without a primary source and founder approval.
4. No verdict is quiet by default.
5. No implementation lane can change what grades it.

## Known gaps in Phase 0

- No authentication exists yet. Nothing in Phase 0 holds user data.
- The Ops allowlist trusts the address passed on by the web server in front of the api. In the local stack the api port is also open on this machine, so a local process could forge that address. In the cloud the api is reachable only through the load balancer.
- The boundary classifier is pattern based. It is a floor, not the finished guard.
- Local database and storage passwords are fixed and only for this machine.

## Known gaps in the Step W1 founder build

- The ad-hoc signature changes on every rebuild, so the Keychain asks again whether Duly may use "Duly Safe Storage". A self-signed identity keeps the signature stable but, like ad-hoc, is trusted by nobody but this Mac. Neither is a release signature.
- Library validation, checked 2026-10-01 on the first packaged build: under the hardened runtime, an ad-hoc or self-made signature carries no team, so macOS refused to let Duly load its own Electron Framework ("different Team IDs"), and python3 would refuse its own libraries the same way. Both therefore carry `com.apple.security.cs.disable-library-validation`: the .app bundles through desktop/build/entitlements.plist (beside `allow-jit` for V8), the interpreter through desktop/build/python-entitlements.plist. The rest of the hardened runtime stays on (no DYLD_ variables, no debugger attach). Cost: a library planted inside the app would load; the app's own seal (codesign --verify --strict) and the manifest hash check at launch are the guards on those files. This is an ad-hoc and self-signed build weakness only; the Developer ID build signs every library under one team and removes both keys.
- Windows has no engine channel yet. A named pipe with a current-user ACL comes with the Windows build or the Rust core; until then the engine refuses to start on win32.
