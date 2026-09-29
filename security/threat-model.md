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
