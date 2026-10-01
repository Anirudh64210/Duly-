# Duly 2 architecture: operations

How Duly is built, tested, released, watched and kept running on Mac, Windows, iPhone and Android (D78), with a web presence, by a small team. This section covers CI and CD, testing, observability, error tracking, notifications, and incident response with on-call.

Written 2026-10-01. Read with BLUEPRINT.md sections 4 to 8, research-security.md and research-system.md sections 8 and 10 to 12. External claims link to their sources. Anything not confirmed in this pass is marked **(unverified)**. A value here is a proposal to check, not a fact to copy (CLAUDE.md).

---

## 0. Summary

1. **The device is the product, so operations put correctness ahead of uptime.** Today, reminders, the engine and documents all run on the device (BLUEPRINT 6). If the server is down, students lose sync and backup for a while, but they keep their dates. That is why a team of one or two can run Duly without a 24/7 rota. Google's SRE book says 24/7 cover needs at least eight engineers at one site ([Google SRE, Being on-call](https://sre.google/sre-book/being-on-call/)). Duly cannot staff that, so the system has to be built not to need it.
2. **One pipeline, five release trains.** The trains are the desktop app (Mac and Windows, Electron), iPhone, Android, the backend, and the signed rule bundle. Each has its own signing, staged rollout and way to stop a release. Builds run once, are signed in a protected GitHub environment that agents cannot reach, and go out in stages: App Store phased release, Play staged rollout, desktop update percentage, and bundle rollout of 1%, then 10%, then 100%.
3. **The desktop train comes first.** The founder tests only once Duly has its own window. The first CD target is therefore a signed, notarised Mac build with auto-update, then Windows.
4. **Testing is built around the engine.** That means property tests with an injected clock, stateful tests for the loop runner, and byte-identical golden vectors between the Python oracle and the device engine. Contract tests come from `contracts/openapi.yaml` (Schemathesis), not Pact. End-to-end tests use Playwright for desktop and web and Maestro for mobile. Security tests and fuzzing are release gates. Load tests aim at the one real spike: every device fetching at once after a bundle wake-up. Ask (D79) gets its own eval suite that blocks a release.
5. **Observability carries no student data, by construction.** Logs follow a fixed schema enforced in code and again in the OpenTelemetry Collector's redaction processor, which removes any attribute not on its list ([redaction processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md)). Clients send no tracing and no RUM. Bedrock model invocation logging stays off and is locked off by SCP.
6. **Error tracking uses Sentry SDKs, configured strictly.** Recent Sentry SDKs collect user identity, request bodies and generative AI content by default ([Sentry Electron options](https://docs.sentry.io/platforms/javascript/guides/electron/configuration/options/)). Each one must be turned off explicitly. Native minidumps can hold "in-memory representations of input fields" ([Sentry minidumps](https://docs.sentry.io/platforms/native/guides/minidumps/)), so they are off in v1. Client reports are opt-in and pass through a Duly-run Relay before anything reaches Sentry's US region.
7. **Notifications carry no content.** Every dated reminder is a local notification scheduled on the device (D73). Pushes are content-free wake-ups or "open Duly" alerts. Email through SES covers account and security notices plus the opt-in law-update email (D22), and never a student's date or status.
8. **Incident response is sized for a tiny team.** Few things page at night: a wrong date published, a suspected breach or key compromise, a signing-key or release-integrity alarm, and spikes in bundle signature failures. Everything else is a business-hours ticket. Runbooks cover the kill switch, bundle rollback, halting a release on each store, key rotation and breach notice. An outside IR firm is on retainer, and a tabletop exercise happens before the first stranger uses Duly (BLUEPRINT risk 15).

---

## 1. Constraints this section must keep

| Constraint | Source | What it forces in operations |
|---|---|---|
| Student data never goes to an outside AI provider; Ask uses Claude through Bedrock in Duly's AWS | D79, CLAUDE.md | Evals run on synthetic data only; no prompt or completion logging anywhere; Sentry generative AI capture off |
| No value from a document reaches any model | D60 | Eval sets and canary tests prove it; the canary-bytes test (BLUEPRINT 6) covers model traffic |
| Documents encrypted on device; server holds ciphertext only | D54 | Crash reports never include memory, files or screenshots; logs never include bodies |
| The engine owns every date | CLAUDE.md, BLUEPRINT 4.1 | Differential and golden tests are release gates; "zero wrong dates" is the first SLO |
| Reminders computed on the device | D73 | Push is never the delivery path for a dated reminder |
| Mac, Windows, Android, iPhone from the start | D78 | Four signing setups and four rollout controls; one shared engine core tested once and per platform |
| Dated tag on every change to main | D46 | Release versions derive from tags |
| Agents hold no signing or cloud credentials | BLUEPRINT 5.5 | Signing and deploy jobs run only in protected environments with a human approver |
| Lanes never edit `.github/`, `tests/`, `evals/`, `security/`, `tools/gates/` | CLAUDE.md | Pipeline and gate changes are contract changes, reviewed by a human |
| Small team, cost matters | Task | Managed services before self-hosting; Linux runners for most jobs; macOS only where needed |

---

## 2. CI and CD

### 2.1 What exists today

`.github/workflows/ci.yml` runs gates 1 to 7 and the hidden tests on `ubuntu-latest` for every push and pull request. The workflow has `permissions: contents: read` and pins actions by tag (`actions/checkout@v4`), not by commit. `tag-main.yml` puts a dated tag on main (D46). There is no build, sign, release or deploy job yet. `make e2e` and `make attack` are placeholders.

### 2.2 Hardening the pipeline itself (do first)

Following GitHub's own guidance ([Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)):

- **Pin every action to a full commit SHA.** "Pinning an action to a full-length commit SHA is currently the only way to use an action as an immutable release." Renovate or Dependabot proposes updates, and they go through the 7-day cooling-off rule (research-security 8).
- **Read-only `GITHUB_TOKEN` by default,** raised per job only where needed.
- **Never `pull_request_target` with a checkout of PR code.** Pass untrusted input through environment variables, never inline `${{ }}` in `run:`.
- **No self-hosted runners** for anything that runs PR code.
- **OIDC to AWS and Azure,** no long-lived keys. Trust policies pin `sub` to the repository and environment ([GitHub OIDC in AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)).
- **Artifact attestations** on every released binary (`actions/attest`, verified with `gh attestation verify`) ([artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds)). They are published next to the release hashes that the web needs for code transparency (BLUEPRINT 5.5).
- **Protected environments** `release-desktop`, `release-ios`, `release-android`, `deploy-staging`, `deploy-prod` and `publish-bundle`. Each has required reviewers with self-review prevented, deployment limited to tags from `main`, and secrets released only after approval ([environments](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment)). **Environments in a private repository need GitHub Team (organisation) or Pro**, so this is a purchase decision (section 9).

### 2.3 Workflows

| Workflow | Trigger | Runner | What it does |
|---|---|---|---|
| `gates` (exists) | Every PR and push | ubuntu | Gates 1 to 7, hidden tests, diff coverage |
| `core` | PR touching the engine core or bundle schema | ubuntu, plus a macos job on main | Rust (or TypeScript) engine: unit, property, golden vectors against the Python oracle, byte-identical; builds for `aarch64-apple-ios`, `aarch64-apple-darwin`, `x86_64-pc-windows-msvc`, `aarch64-linux-android`, `wasm32` (target list per BLUEPRINT 6; the port language is still a founder decision) |
| `desktop` | PR touching `desktop/` or `web/` | ubuntu for unit and Playwright smoke; macos and windows on main | Build Electron app; Playwright Electron smoke; package; sign only in `release-desktop` |
| `ios` | PR touching iOS app (path filter); main | macos | Build, unit tests, XCUITest and Maestro on simulator; on tag: archive, sign, upload to TestFlight |
| `android` | PR touching Android app; main | ubuntu (emulator with KVM) | Build, unit tests, Maestro on emulator; on tag: signed AAB to Play internal track |
| `backend` | PR touching `api/`, `infra/` | ubuntu | Tests, Schemathesis against a local stack, container build, image scan; on tag: deploy to staging then prod through OIDC |
| `web` | PR touching `web/` | ubuntu | Build, Playwright; on tag: S3 and CloudFront; publish bundle hashes |
| `bundle-publish` | Manual, from the Ops app after founder approval | ubuntu | TUF threshold signing (offline keys held by humans), staged rollout, freeze key (BLUEPRINT 5.5, research-system 7.2) |
| `nightly` | Schedule | ubuntu | Fuzzing (cargo-fuzz or Atheris), mutation testing (`tools/gates/mutation.py`), longer property runs, dependency audit, k6 soak against staging, Ask eval full set |
| `weekly-restore` | Schedule | ubuntu | Restore drill from encrypted backup in staging; device pairing test |

**Path filters keep macOS minutes down.** GitHub-hosted runners cost $0.006 a minute for Linux 2-core, $0.010 for Windows 2-core and $0.062 for macOS 3 or 4-core ([runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)). Private-repo plans include 2,000 minutes (Free) or 3,000 (Team) a month ([Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)). Whether macOS minutes count against that allowance at a multiplier was not confirmed in this pass **(unverified)**. Run iOS and macOS jobs on main and on tags only, unless the PR touches Apple code.

### 2.4 Versioning

- One product version for all four apps (for example `2026.10.1`), taken from the dated tag on main (D46). Build numbers grow monotonically per store.
- Every result a student sees carries three versions: engine, bundle and app (BLUEPRINT 6 and risk 2). Crash reports and logs carry the same three, so any bug can be tied to an engine version and a rule version.
- Bundles declare a minimum engine and runner version. Too old an app gives "Can't tell yet: update Duly" (BLUEPRINT 6). CI tests the current app against the current bundle, n-1 and n-2. It also tests the current bundle against the app versions still in use (section 3.4).

### 2.5 Signing, per platform

| Platform | Signing | Where the secret lives | Notes |
|---|---|---|---|
| macOS (Electron, direct download) | Developer ID signing **and** notarisation; Electron says `safeStorage`, login items, cookie encryption and auto-update need both ([Electron code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)) | Apple certificate in fastlane match storage (encrypted, read-only in CI) ([match](https://docs.fastlane.tools/actions/match/)); notarisation through an App Store Connect API key | Direct distribution first. The Mac App Store needs the app sandbox, and Sentry says native crash collection does not work there ([Sentry Electron native crashes](https://docs.sentry.io/platforms/javascript/guides/electron/features/native-crash-reporting/)). Whether the sandboxed document reader helper (documents-1) works under MAS rules is **(unverified)** |
| Windows (Electron) | Authenticode. Electron's guidance: since June 2023 the certificate must sit in an HSM and "cannot be simply downloaded onto a CI infrastructure"; Azure Artifact Signing (formerly Trusted Signing) is "the cheapest option" ([Electron code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)) | Artifact Signing account in Azure, reached from GitHub by OIDC federated credential; the certificate "is never given to you" ([Artifact Signing FAQ](https://learn.microsoft.com/en-us/azure/artifact-signing/faq)) | Needs a paid Azure subscription and identity validation of the legal entity; Artifact Signing does not issue EV certificates; SmartScreen "reputation builds up automatically" with download history (same FAQ). Eligible countries and any organisation-age rule were not confirmed **(unverified)**; check before relying on it, with an EV certificate on a cloud HSM as the fallback |
| iPhone | Distribution certificate and provisioning profile through match, `readonly: is_ci`; upload through an App Store Connect API key, no Apple ID password in CI ([match](https://docs.fastlane.tools/actions/match/)) | match storage passphrase and API key as `release-ios` environment secrets | Apple Developer Program fee is annual (amount **unverified** in this pass) |
| Android | Play App Signing: Google keeps the app signing key; Duly signs with an upload key that "can be reset if lost or compromised"; required for new apps ([Play App Signing](https://developer.android.com/studio/publish/app-signing)) | Upload keystore as a `release-android` environment secret, or kept offline and used by the release signer | Play Developer API service account through Workload Identity Federation if possible **(unverified for Play)** |
| Rule bundle | TUF, offline root, 2-of-3 threshold (BLUEPRINT 5.5) | Hardware keys held by named humans, never in CI | Separate from app signing so a compromised CI cannot publish a rule |
| Electron fuses | Flip at package time: `RunAsNode` off, `EnableNodeOptionsEnvironmentVariable` off, `EnableEmbeddedAsarIntegrityValidation` on, `OnlyLoadAppFromAsar` on, `EnableCookieEncryption` on, `GrantFileProtocolExtraPrivileges` off ([Electron fuses](https://www.electronjs.org/docs/latest/tutorial/fuses)) | n/a | A CI check reads the fuses back from the packaged binary and fails if any differ |

**Google Play account type.** A personal developer account created after 2023-11-13 must run a closed test with at least 12 testers opted in for 14 days before it can apply for production access ([Play testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)). The rule applies to personal accounts. Register Duly as an organisation account and plan the closed test anyway.

### 2.6 Store releases and staged rollouts

| Train | First audience | Staged rollout | How to stop a bad release |
|---|---|---|---|
| iPhone | TestFlight internal testers (up to 100, no review), then external testers (up to 10,000; the first build needs App Review approval for TestFlight) ([TestFlight](https://developer.apple.com/testflight/)) | App Store phased release over 7 days: 1%, 2%, 5%, 10%, 20%, 50%, 100% of users with automatic updates ([phased release](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/)) | Pause for up to 30 days in total. Anyone can still update by hand during a phased release (same page), so a pause limits a bad build but does not stop it. A fixed build has to go through review |
| Android | Internal testing track, then closed testing | Staged rollout percentage, raised by hand; "won't increase automatically" ([staged rollouts](https://support.google.com/googleplay/android-developer/answer/6346149)) | Halt: "no additional users will receive the app version"; users who already have it keep it (same page) |
| Desktop | Founder and internal ring through a `beta` update channel | Duly's own update manifest on S3 and CloudFront. update.electronjs.org needs a public GitHub repo ([Electron updates](https://www.electronjs.org/docs/latest/tutorial/updates)), so it does not fit. electron-updater supports a `stagingPercentage` in its manifest (docs page did not load in this pass, **unverified**) | Set the percentage to 0 or point the manifest back to the previous version. The manifest is signed, like bundles, so a compromised bucket cannot push a binary |
| Backend | Staging with synthetic accounts only | ECS rolling deploy with the deployment circuit breaker, plus CloudWatch alarm rollback (ECS behaviour not fetched in this pass, **unverified**) | Automatic rollback on alarm; manual redeploy of the previous image tag |
| Rule bundle | Internal devices | 1%, 10%, 100%, with the device-side verdict-swing guard (BLUEPRINT 5.5) | Kill switch and signed rollback (BLUEPRINT 4.3 item 6) |
| Web | Staging | CloudFront origin switch | Previous build kept; release hashes published so Code Verify style checks can compare |

**A release is promoted only when** crash-free sessions on the new version are at least as good as the previous version, there are zero engine differential failures, zero new error groups at error level, and the reminder-delivery check (section 4.6) shows no drop. A human presses promote. The pipeline does not auto-promote store builds.

Google Play counts a user-perceived crash rate above 1.09% overall, or 8% on any one device model, and an ANR rate above 0.47%, as bad behaviour. Play "may reduce your app's visibility" and show a warning on the listing, judged on the last 28 days ([Android vitals](https://developer.android.com/topic/performance/vitals)). Duly's own target is far below this (section 4.6).

### 2.7 Feature flags and remote config

Duly's privacy rule shapes flags more than any vendor does. A remote-flag service that receives a user id or device attributes on each evaluation reveals who uses Duly and when. So there are three classes:

| Class | Delivered how | Evaluated where | Examples |
|---|---|---|---|
| **Client release flags** | Compiled default, plus a value in the signed library bundle (the same TUF channel as rules) | On the device. Rollout buckets come from a random number made at install that never leaves the device | New Today layout; a new Playbook family |
| **Kill switches** | Same signed channel, higher priority, fetched on open and on wake-up | On the device | Revoke a Playbook, template, router model or the Ask cloud path; fall back to the DSO step-back (BLUEPRINT 4.3 item 6) |
| **Server config and flags** | AWS AppConfig, with validators, staged deployment and automatic rollback on a CloudWatch alarm ([AppConfig](https://docs.aws.amazon.com/appconfig/latest/userguide/what-is-appconfig.html)) | On the server | Rate limits, the Bedrock model id, the SES sending switch, maintenance mode |

- Code reads flags through OpenFeature, "a vendor-agnostic, community-driven API for feature flagging" ([OpenFeature](https://openfeature.dev/docs/reference/intro)). A provider for the signed bundle and one for AppConfig can then be swapped without touching call sites. The evaluation context on clients is always empty of user data.
- Every flag has an owner and a removal date. A lint fails when a release flag outlives its date.
- **No experiments on deadline copy or bad-news loops** (BLUEPRINT 4.4). AppConfig's experimentation features are not used for student-facing behaviour.

---

## 3. Testing strategy

### 3.1 Layers, and what each must prove

| Layer | Tool | Runs | Proves |
|---|---|---|---|
| Engine unit and property | pytest and Hypothesis today; proptest in Rust after the port | Every PR | Each rule, with a fixed clock (`duly-founder:write-clock-injected-property-test`); properties such as "the unemployment count never decreases while unemployed" |
| Loop runner and scheduler, stateful | Hypothesis `RuleBasedStateMachine`, which generates "entire tests" as sequences of actions and checks invariants after every step ([Hypothesis stateful](https://hypothesis.readthedocs.io/en/latest/stateful.html)) | Every PR | No dead end; planned is never closed; every waiting step has a follow-up; closure only on confirmation or an outside fact (D75) |
| Event log and sync | Property tests | Every PR | The record depends on the set of events, not their order: shuffle, fork and rollback (BLUEPRINT 5.4); revoked-device keys open nothing after the epoch (BLUEPRINT 5.3) |
| Differential engine | Golden vectors from the Python oracle, compared byte for byte with the device engine on every target | Every PR touching the core; every bundle | The port cannot drift (risk 2). Vectors ship in each bundle |
| Crypto | Known-answer tests and Wycheproof-style vectors against the vetted libraries (Wycheproof not fetched in this pass) | Every PR touching crypto | Envelope, wrap and signature formats; algorithm id and version in each header |
| Contract | `contracts/openapi.yaml` and the JSON Schemas are the source of truth. Schemathesis generates property tests from the OpenAPI schema and chains operations into workflows ([Schemathesis](https://schemathesis.readthedocs.io/en/stable/)) | Every PR touching `api/` or `contracts/` | Server matches the schema; status codes and error shapes; refuses blobs without the envelope header |
| Compatibility | Recorded requests from app n-1 and n-2 replayed against the new server; new bundle against old engines | Every release | Old apps keep syncing; old engines refuse new bundles correctly |
| Desktop and web end to end | Playwright. Electron support is "experimental" ([Playwright Electron](https://playwright.dev/docs/api/class-electron)) | PR smoke; full suite on main | Window opens; Today shows four slots; a loop runs to a receipt; documents lock on idle |
| Mobile end to end | Maestro, which is "framework agnostic" across native iOS and Android and React Native and has "built-in flakiness tolerance" ([Maestro](https://github.com/mobile-dev-inc/maestro)); XCUITest and Espresso for system dialogs | PR on simulator or emulator; nightly wider | Same journeys as desktop; notification permission denied; airplane mode |
| Real devices | A small set of owned devices, or a device farm (choice **unverified**) | 30-day reminder delivery study before Phase 4 ends (BLUEPRINT 8) | Reminders fire on the planned day (risk 13) |
| Security | Section 3.3 | PR and nightly | Gates 4, canary bytes, fuzzing |
| Load | k6 (section 3.4) | Before launch, then monthly and before big bundle publishes | Relay and CDN survive the wake-up spike |
| Ask evals | Section 3.5 | Every prompt, model, template or router change; nightly full | No legal conclusion, no number outside a slot, correct routing |
| Usability | Moderated sessions (BLUEPRINT 4.4) | Before and after each phase | People can say their next date and action |

**Why not Pact.** Pact's strength is "an environment with many services". It tests concrete examples that each consumer actually uses ([Pact](https://docs.pact.io/)). Duly has one provider, the relay. Its four clients share one networking layer in the shared core. A schema-first contract with generated clients, Schemathesis and recorded-request compatibility tests covers the same risk with less machinery. Revisit Pact if separate services appear.

**Why Maestro over Detox.** Detox is for React Native: "an open-source end-to-end (E2E) testing framework for React Native mobile applications" ([Detox](https://wix.github.io/Detox/docs/introduction/getting-started)). BLUEPRINT 6 points to native Swift and Kotlin over a Rust core through UniFFI. Maestro works for either choice. Add Detox only if the founder chooses React Native and Maestro's synchronisation proves flaky.

### 3.2 Engine tests in more detail

- **Clock injection everywhere.** Gate 7's `engine_literals` and the rule "read the time only through engine.clocks" already enforce this. Every property test takes a `Clock` and a recorded time zone.
- **Properties to state** (examples; the full list belongs in the engine SPEC): monotonic counts; date arithmetic in civil dates only; a missing or conflicting fact always gives `cannot_tell`; a stale or litigated regime gives `cannot_tell` (D65); the same events give the same verdict on every platform.
- **Mutation testing** (`make mutation`) nightly on `engine/` and the loop runner. A surviving mutant in date code is a bug in the tests.
- **Golden vectors** are produced by the Python oracle in CI. They are never edited by hand and are stored with the bundle version.

### 3.3 Security testing

| Check | Where | Notes |
|---|---|---|
| Secrets, SAST, dependency audit | Gate 4 (gitleaks, semgrep, pip-audit, npm audit) | Exists; add `cargo audit` and Swift and Gradle equivalents per platform (tool choice **unverified**) |
| **Canary bytes test** | Every release, in staging | Plant canary SEVIS IDs, dates, school names, question text and document field values. Capture all outbound traffic from each app (push, email, CDN, crash reports, DNS, Bedrock calls) and fail on any match (BLUEPRINT 6). This is the single most important privacy test |
| Fuzzing | Nightly | Every envelope, event, bundle and document parser. cargo-fuzz is "the recommended tool for fuzz testing Rust code" (libFuzzer) ([Rust fuzz book](https://rust-fuzz.github.io/book/cargo-fuzz.html)); Atheris for Python parsers (not fetched) |
| Mobile security | Per release, checklist | OWASP MASVS for requirements and MASTG for how to test ([MASTG](https://mas.owasp.org/MASTG/)): storage, keychain classes, screenshot blur, clipboard expiry, no backups of the vault |
| Electron | Per release | Fuses read back (2.5); the Electron security checklist (research-security 8) |
| API | Nightly in staging | Schemathesis negative cases; an OWASP ZAP baseline scan (not fetched); authorisation tests that one account cannot read another's blobs |
| Formal model | Before sync ships | Tamarin or ProVerif model of pairing and revocation (BLUEPRINT 6) |
| Outside audit and pen test | Before sync and backup, and before the first stranger | Release gate (BLUEPRINT 6, 8) |

### 3.4 Load testing

k6 defines smoke, average-load, stress, soak, spike and breakpoint tests ([k6 test types](https://grafana.com/docs/k6/latest/testing-guides/test-types/)). Duly's load profile is unusual. Normal traffic is tiny: sync and backup uploads. The dangerous moment is a **bundle publish**. A content-free wake-up reaches every device, and they all fetch the bundle and then sync.

| Test | Scenario | Pass |
|---|---|---|
| Smoke | Every deploy to staging | All routes healthy |
| Spike | N devices fetch the bundle from CloudFront and sync within 10 minutes of a wake-up, at 10 times the expected install base | CloudFront serves the bundle (the origin barely sees it); p99 sync latency within the SLO; no 5xx; Aurora capacity recovers |
| Soak | 24 hours of normal sync in staging | No memory growth; no connection leak |
| Breakpoint | Raise until failure | Know the ceiling; record it next to the cost model (research-system 15) |

Design rules the tests check: the device waits a random delay (jitter) before fetching after a wake-up; wake-ups go to topics, not per-device lists (BLUEPRINT 6); the bundle is immutable and cacheable on the CDN.

### 3.5 Ask evaluations (D79)

Ask routes questions to reviewed guides and Playbooks. With D79 it reasons with Claude through Bedrock in Duly's AWS. The engine supplies every date and count, and the BOUNDARY rules apply. The eval suite blocks any change to a prompt, model id, template, guide or router threshold.

| Suite | Cases | Grader | Gate |
|---|---|---|---|
| Boundary | `evals/boundary` (82 lines today), growing to hundreds per Playbook family, in pairs on each side of the line (`duly-founder:add-eval-case`) | Code first (classifier and template id), an LLM judge only for borderline wording | Zero conclusions about the user. With zero failures in n cases, the leak rate is bounded only below about 3/n (BLUEPRINT 4.4), so publish n with the result |
| Number and citation integrity | Adversarial set: spelled-out and relative numbers, digits in many languages | Code (tokenising validator) | Zero numbers outside engine slots; zero citations outside the allowlist |
| Routing | Held-out phrasings (synthetic, multilingual, code-mixed), hidden from building agents like `tests/holdout` | Exact match on guide or Playbook id | Precision at or above the founder's threshold; abstain rate reported |
| Injection | Pasted-text and instruction injection; questions that try to pull document values | Code | No tool beyond the closed enum; no document values in the prompt (D60) |
| Privacy | Canary values planted in the record | Code, on captured Bedrock request bodies in staging | No document value or identifier in any request |
| Stability | Each case run k times; pass^k on the stochastic part ([Sierra tau-bench](https://sierra.ai/blog/benchmarking-ai-agents), per BLUEPRINT 4.4) | As above | pass^k at or above threshold |
| Step-back quality | Cases where the right answer is the DSO draft | Human review sample each release | Draft present, useful, no conclusion |

Practice, from Anthropic's eval guidance: make evals task-specific, automate grading where possible, and prefer more cases with automated grading over a few hand-graded ones. When an LLM grades, use a different model from the one that generates, with clear criteria and a structured output ([Anthropic, develop tests](https://platform.claude.com/docs/en/docs/test-and-evaluate/develop-tests)).

Where evals run:
- **The harness lives in `evals/`** and calls Bedrock in the **nonprod** account with the same model id, US geographic inference profile and retention mode `none` as production (research-system 9.3). Results are stored with the model id, prompt hash, template bundle version and retention mode.
- Bedrock's own evaluation jobs (programmatic, LLM-as-judge, human) ([Bedrock evaluation](https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation.html)) may be used for model comparisons, **with synthetic datasets only**, since datasets and results sit in S3.
- **No online evals on production traffic.** Production prompts are never logged. The only production signal is the opt-in "this looks wrong" report (BLUEPRINT 4.3 item 6) and counts: abstain rate and step-back rate, as aggregates.

---

## 4. Observability

### 4.1 What is watched, and what never is

| Watched | Never |
|---|---|
| Route, status, latency, error code per request; queue depth; Aurora and Fargate saturation; CDN hit ratio; push and email send outcomes; bundle publish lag; source watcher health; Bedrock latency, throttles, token counts | Question text, answers, facts, dates, document kinds, which update matched whom, per-student funnels, IP addresses outside WAF and load balancer logs, push tokens in logs |

This follows OpenTelemetry's own rule: "Only collect data that serves an observability purpose" ([OTel sensitive data](https://opentelemetry.io/docs/security/handling-sensitive-data/)).

### 4.2 Structured logging with no personal data

- **One schema, in code.** The backend (FastAPI, Python) logs JSON through a single logger wrapper. Its fields: `ts`, `level`, `service`, `version`, `env`, `route_template`, `method`, `status`, `latency_ms`, `error_code`, `trace_id`, `span_id`, `request_id`, `platform`, `app_version`, `engine_version`, `bundle_version`, and optionally `acct_ref`. A unit test fails if any call passes a field outside the schema (research-system 10.5). Free-text messages come from a fixed enum of event names, never interpolated strings.
- **`acct_ref` is an HMAC with a monthly key, not a plain hash.** OpenTelemetry warns that hashing "may not provide the level of anonymization you need, since hashes are reversible in practice if the input space is small and predictable" ([OTel sensitive data](https://opentelemetry.io/docs/security/handling-sensitive-data/)). It appears only on auth, device and sync error logs, not on every request.
- **Never log bodies, headers, query strings or URLs with ids.** Routes are logged as templates (`/v1/blobs/{id}`).
- **Second layer:** CloudWatch Logs data protection policies mask managed and custom identifiers (SEVIS id, receipt number, A-number) at ingestion (research-system 10.5). A masking hit is an alarm, because it means the first layer failed.
- **Retention:** application logs 30 days; WAF and load balancer logs with IPs 7 days (BLUEPRINT 6); CloudTrail and the Ops audit log in the log-archive account with Object Lock. Exact numbers go in the published retention table (BLUEPRINT 5.5).

### 4.3 Tracing and metrics with OpenTelemetry

- **Backend only.** The FastAPI app, workers and pipeline use the OTel Python SDK with auto-instrumentation, and export to an OTel Collector (ADOT) sidecar on each ECS task. The Collector sends traces to X-Ray and metrics and logs to CloudWatch. ADOT and the X-Ray exporter were not fetched in this pass **(unverified)**.
- **The Collector is the enforcement point.** The redaction processor "deletes span, log, and metric datapoint attributes that don't match a list of allowed attributes", and with an empty list it removes everything ("designed to fail closed"). It is beta for traces and alpha for logs and metrics ([redaction processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md)). Set `allowed_keys` to the schema in 4.2. Add `blocked_values` regexes for SEVIS-like, receipt-like and email patterns, with `summary: info` so hits are counted, not logged. Auto-instrumentation can capture URLs, headers and database statements (OTel guidance above), so turn off SQL statement capture in the database instrumentation.
- **Generative AI spans.** Record model id, latency, token counts and outcome (routed, abstained, validator-rejected). Never record prompt or completion content. Content capture in the OTel GenAI conventions is opt-in; that page has moved, and its current wording was not confirmed **(unverified)**. Keep it off.
- **Bedrock model invocation logging stays off.** It "is disabled by default" and, when on, logs "the full request data, response data" ([Bedrock invocation logging](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html)). Add an SCP in the prod and nonprod accounts that denies `bedrock:PutModelInvocationLoggingConfiguration`, next to the retention-mode SCP (research-system 10.1).
- **No client telemetry to Duly in v1** beyond opt-in crash reports (section 5) and the opt-in counts in BLUEPRINT 6. Any later client metrics go through privacy-preserving aggregation (DAP or OHTTP, BLUEPRINT 6).

### 4.4 Metrics

| Group | Metrics |
|---|---|
| API and relay (RED) | Requests, errors, duration per route template; 4xx by error code; auth failures; rate-limit rejections |
| Saturation (USE) | Fargate CPU and memory; Aurora ACU, connections, replica lag; SQS age of oldest message |
| Sync and backup | Upload bytes and count (padded, so sizes reveal little); conflict count; signed-checkpoint mismatch reports (counts) |
| Library and rules | Bundle version served; publish-to-CDN lag; device-reported signature failures (counts); kill-switch activations; docket-change-to-publish lag |
| Notifications | APNs and FCM accepted and rejected by reason; invalid-token rate; SES sends, bounces, complaints, rejects |
| Ask | Bedrock calls, latency, throttles, input and output tokens, cost estimate; router abstain rate; validator rejections; step-back rate |
| Pipeline | Sources reachable; days since last check per source; drafts waiting; time from detection to publish |
| Cost | Daily spend per account with AWS Budgets alerts (not fetched) |

### 4.5 Dashboards

Four dashboards, no more, so a tired person can read them:
1. **Students' view:** SLO status (4.6), crash-free sessions per platform and version, bundle rollout stage, open incidents.
2. **Service:** RED and USE for API, relay, workers and Aurora.
3. **Rules and updates:** pipeline health, publish lag, signature failures, kill switches.
4. **Ask:** latency, errors, abstain and step-back rates, validator rejections, token spend.

### 4.6 SLOs and alerts

Correctness comes before uptime (BLUEPRINT 6). Proposals for the founder to set:

| SLO | Target | Measured by | Alert |
|---|---|---|---|
| **Wrong dates** | Zero; any one is a SEV1 | Differential tests, golden vectors, student reports, DSO feedback | Page |
| Court docket change to "Can't tell yet" on devices | Within 24 hours | Pipeline timestamps plus device-reported bundle version (counts) | Page at 12 hours if not published |
| Reminders fired on the planned day | 99% on monitored test devices | Real-device harness (3.1) | Ticket |
| Bundle signature verification failures | Near zero | Device counts | Page on spike: possible tampering or a bad publish |
| Sync relay availability | 99.9% monthly (research-system 11) | ALB 5xx and synthetic canary from a second region | Burn-rate (below) |
| Sync p99 latency | Founder sets | ALB metrics | Burn-rate |
| Daily canary restore in production | Passes every day (BLUEPRINT 6) | Scheduled job | Page if two days fail in a row |
| Ask availability (once launched) | 99.5% monthly (proposal) | Successful answers or deliberate step-backs out of all requests | Ticket; Ask failure falls back to guides and step-back, never to nothing |
| Crash-free sessions | 99.8% or better per platform (proposal) | Store consoles and Sentry | Ticket; blocks promotion |

**Burn-rate alerting.** Use the Google SRE workbook's multiwindow, multi-burn-rate starting point for a 99.9% SLO. Page at burn rate 14.4 over 1 hour with a 5-minute short window (2% of budget), and at 6 over 6 hours with a 30-minute window (5%). Open a ticket at 1 over 3 days with a 6-hour window (10%) ([SRE workbook, alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)). CloudWatch Application Signals supports period-based and request-based SLOs with error budgets and burn-rate alarms ([CloudWatch SLOs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-ServiceLevelObjectives.html)), so no extra vendor is needed.

**A synthetic canary from outside the region** (another AWS region, or a simple external checker) calls `/v1/status` and does a synthetic-account sync every 5 minutes. It also checks that the public bundle on CloudFront verifies. Its own failure pages only if the in-region metrics agree, to avoid paging on the checker.

---

## 5. Error tracking

### 5.1 The tension, and the answer

research-system 11 said "no third-party SDK" for crash reports. Sentry is the standard tool, and the SDKs are open source, but defaults matter. In SDK version 10 the `dataCollection` defaults include `userInfo: true`, cookies, HTTP headers, request and response bodies, `genAI: both true` and stack-frame local variables ([Sentry Electron options](https://docs.sentry.io/platforms/javascript/guides/electron/configuration/options/)). Minidumps "might contain ... in-memory representations of input fields, including passwords". By default Sentry deletes them after processing, but if "Store Minidumps As Attachments" is on, "Sentry does not apply data scrubbing to attachments" ([Sentry minidumps](https://docs.sentry.io/platforms/native/guides/minidumps/)). In Duly, process memory can hold a decrypted I-20.

**Recommendation:** use Sentry SDKs on every platform and the backend, configured as in 5.2. Client events are **opt-in**, scrubbed on the device, and sent to a **Duly-run Sentry Relay** in prod-core. Relay is "a middle layer between your application and sentry.io" that can scrub PII "before data leaves your infrastructure" ([Sentry Relay](https://docs.sentry.io/product/relay/)). Relay forwards to a Sentry organisation in the **US region**. Sentry then never sees a student's IP address, only Duly's.

### 5.2 Required configuration

**Every SDK (Electron main and renderer, iOS, Android, backend):**
- Set `dataCollection` explicitly with every category off, including `userInfo`, `cookies`, `httpHeaders`, `graphQL`, `genAI` and `stackFrameVariables`, and `frameContextLines` kept for source context only. On SDKs without `dataCollection`, set `sendDefaultPii: false`, which is the older control (same page).
- No user id, email or device name. A random install id rotated monthly at most.
- `beforeSend` and `beforeBreadcrumb` allowlist (same docs): keep the exception type, the stack frames, the three versions (2.4), OS and platform. Drop the message text unless it comes from a fixed enum, and drop every breadcrumb except navigation between named screens (screen names only, no parameters).
- **Off:** session replay, screenshots, view hierarchy, performance tracing on clients, profiling, user feedback widgets that free-type.
- **Native minidumps off in v1.** Electron's `crashReporter` can keep dumps locally with `uploadToServer: false` ([Electron crashReporter](https://www.electronjs.org/docs/latest/api/crash-reporter)). Later, a per-crash "send this crash report" consent that explains a dump may contain open document contents is a founder decision. "Store Minidumps As Attachments" stays off in the Sentry organisation.
- Offline queue: Electron's SDK queues events while offline (`maxAgeDays`, `maxQueueSize`; same options page). Keep the queue small and drop it when the user turns reporting off.

**Sentry organisation settings:**
- Data storage location: **US**. It "can't be changed" after creation. User accounts, organisation settings and audit logs are always stored in the US whatever is chosen ([Sentry data storage location](https://docs.sentry.io/organization/data-storage-location/)).
- Server-side scrubbing on, "prevent IP addresses from being stored" on, and an advanced rule removing `$user.geo.**` ([Sentry server-side scrubbing](https://docs.sentry.io/security-legal-pii/scrubbing/server-side-scrubbing/)). Sentry notes that geographic data is extracted from IPs regardless, which is one more reason clients go through Relay.
- Custom scrubbing rules for SEVIS-like, receipt-like and A-number-like patterns, as in 4.2.
- Retention at the plan minimum. Two members with hardware-key 2FA.

**Platform crash channels that need no SDK:** App Store Connect crash reports and MetricKit (crash and hang diagnostics aggregated on device, delivered daily or immediately from iOS 15) ([MetricKit](https://developer.apple.com/documentation/metrickit)); Play Console Android vitals ([Android vitals](https://developer.android.com/topic/performance/vitals)). These cover native crashes while minidumps stay off.

**Store privacy labels** must declare crash data collection on iPhone and Android. Category names and wording are **(unverified)**; check at submission.

### 5.3 Alternatives, if the founder wants no third party at all

| Option | Fit | Cost and effort |
|---|---|---|
| Sentry SaaS through Relay (recommended) | Full features; only scrubbed stack traces leave Duly's AWS | Team plan listed at $26 a month with 50,000 errors ([Sentry pricing](https://sentry.io/pricing/), check before buying); Relay is one small task |
| GlitchTip, self-hosted in Duly's AWS | Accepts Sentry SDK events, so it is a DSN change. Needs PostgreSQL 14+; "512 MB RAM" recommended ([GlitchTip install](https://glitchtip.com/documentation/install)) | One small Fargate task plus the existing Aurora; fewer features (native symbolication support **unverified**) |
| Self-hosted Sentry | Everything stays in Duly's AWS | Minimum 4 cores and 16 GB RAM plus 16 GB swap, "no guarantees or dedicated support" ([self-hosted Sentry](https://develop.sentry.dev/self-hosted/)); too heavy for a small team |

### 5.4 Triage

Every new error group opens a ticket. Error groups tagged with an engine or bundle version go to whoever owns that rule. Any error in date code is treated as a possible wrong date until shown otherwise. Releases are linked to commits, so a regression points at a PR. Sentry release health or the store consoles feed the promotion rule in 2.6.

---

## 6. Notifications

### 6.1 Channels and what each may carry

| Channel | Used for | Content allowed |
|---|---|---|
| **Local notification** (scheduled on device) | Every dated reminder, follow-up and check-in (D73) | Generic by default ("Duly: 1 item today"). Detail only if the student turns on previews, with a warning (BLUEPRINT 5.5) |
| **Push wake-up** (APNs background, FCM data) | New bundle or Playbook version; "sync waiting" | Nothing but a type code. No ids, no counts |
| **Push alert, content-free** | Security notices: a new device wants to enrol, kit enrolment started, backup turned off | "Duly: open the app to review a security notice". The detail is fetched and decrypted on the device |
| **Email (SES)** | Account and security notices, the law-update email (D22, opt-in), sign-in recovery notices | Never a date, deadline, status, school, document kind or verdict. Law updates are public text sent to all subscribers of a coarse category; "shown because" is computed on the device (research-system 8.3) |
| **Desktop** | Electron notifications while the app or the opt-in tray helper runs | As local notifications; the .ics file is the dependable fallback (research-system 8.2) |
| **Calendar (.ics)** | Student exports | Generic titles by default (BLUEPRINT 5.5) |

### 6.2 Platform facts that shape the design

- **APNs payloads** are up to 4 KB. `content-available: 1` makes a background notification ([Apple, generating a remote notification](https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification)). Background delivery is best-effort and throttled (Apple's page did not render in this pass, **unverified** wording), so it is used only to make sync and bundle fetch quicker, never for anything dated.
- **iOS Notification Service Extension.** With `mutable-content: 1` and an alert, the extension can "decrypt data" or download content, and has about 30 seconds before display ([Apple, modifying notifications](https://developer.apple.com/documentation/usernotifications/modifying-content-in-newly-delivered-notifications)). Duly sends a generic alert and the extension decides locally what to show. On iOS it may fetch an encrypted notice body by opaque id and decrypt it with a device key. Whether the extension can read the keychain item under Duly's chosen access class is **(unverified)**; if not, show only the generic text.
- **FCM** notification and data messages are both capped at 4096 bytes ([FCM message types](https://firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type)). Use **data messages** so the app renders locally. **Use normal priority for wake-ups.** If high-priority messages do not lead to visible notifications, FCM may deprioritise them, judged over 7 days ([FCM priority](https://firebase.google.com/docs/cloud-messaging/android/message-priority)). High priority is kept for the rare security alert that does show a notification.
- **Android lock screen.** Use `VISIBILITY_PRIVATE` with a generic `setPublicVersion`, or `VISIBILITY_SECRET` for security notices. `POST_NOTIFICATIONS` is a runtime permission from Android 13 ([Android notifications](https://developer.android.com/develop/ui/views/notifications/build-notification)). Exact alarms are restricted from Android 14, so morning reminders use inexact windows (research-system 8.2).
- **iOS 64 pending local notifications.** Schedule the nearest 50 and re-plan on every open, sync and refresh (research-system 8.2).

### 6.3 Server side

- **Senders** are a queue-driven worker in prod-core. Egress goes through the proxy allowlist to APNs, FCM and SES only (BLUEPRINT 6). APNs uses token-based auth (a .p8 key in Secrets Manager); FCM uses the HTTP v1 API with a service account. FCM auth details were not fetched in this pass **(unverified)**.
- **Library wake-ups use FCM topics** and an equivalent broadcast on iOS, so the server sends one message, not a list of every device (BLUEPRINT 6). Whether APNs has a fit-for-purpose broadcast for this case is **(unverified)**. If it does not, the iOS wake-up is a fan-out to stored tokens, rate-limited and jittered (3.4).
- **Push tokens** are identifiers. Store them encrypted, tied to the device record, and delete them on revocation and on "invalid token" responses. Never log them.
- **SES set-up:** verified domain with SPF, DKIM and DMARC; a configuration set with event publishing to SNS and SQS that auto-suppresses hard bounces and complaints; the account-level suppression list. SES events are idempotent-safe because SES is at-least-once ([SES deliverability](https://docs.aws.amazon.com/ses/latest/dg/send-email-concepts-deliverability.html)).
- **SES thresholds:** keep bounces below 2%; at 5% the account goes under review and at 10% sending may pause; keep complaints below 0.1%, with review at 0.1% and a possible pause at 0.5% ([SES enforcement FAQ](https://docs.aws.amazon.com/ses/latest/dg/faqs-enforcement.html)). Alarm at half of each review threshold.
- **Gmail bulk sender rules** apply above 5,000 messages a day to Gmail: SPF, DKIM and DMARC, one-click unsubscribe for subscribed mail, and spam rate below 0.30%, ideally below 0.10% ([Gmail sender guidelines](https://support.google.com/a/answer/81126)). Build the law-update email to these rules from the start.
- **Double opt-in** for the law-update email, as SES recommends to cut bounces and complaints (same FAQ).
- **Testing:** the SES mailbox simulator in staging (same FAQ); `mailpit` locally (exists). Notification content is checked by the canary-bytes test (3.3).

---

## 7. Incident response and on-call

### 7.1 Principles for a team of one to three

- **Device-first architecture is the on-call plan.** A relay outage costs sync, not dates. That lets most alerts wait until morning.
- **What pages at any hour:** (1) a wrong date or count shown or published; (2) suspected breach, key or credential compromise, or unexpected access to production; (3) a release-integrity alarm (an unexpected signature, a manifest change outside the pipeline, an attestation mismatch); (4) a spike in bundle signature failures; (5) an SES sending pause during a law-update send; (6) the daily restore canary failing twice in a row.
- **Everything else is a ticket** for business hours, including relay downtime under the burn-rate page thresholds.
- **Response targets.** Google SRE uses 5 minutes for user-facing, time-critical services and 30 minutes for less time-sensitive ones, and suggests at most 2 incidents per 12-hour shift ([Google SRE, on-call](https://sre.google/sre-book/being-on-call/)). Proposal for Duly: acknowledge a page within 30 minutes, 07:00 to 23:00 Pacific, and best effort overnight. The outside IR firm (BLUEPRINT risk 15) is the overnight escalation for security incidents. The founder sets this.
- **Paging tool:** any service with phone and SMS escalation and a schedule. Choosing a vendor and price is **(unverified)** in this pass. CloudWatch alarms go to SNS and then the pager; Sentry and store-console alerts go to a business-hours channel.

### 7.2 Severity

| Sev | Meaning for Duly | Examples | Response |
|---|---|---|---|
| SEV1 | Students could act on wrong information, or their data could be exposed | Wrong date in a published bundle; engine port divergence shipped; breach or key compromise; a malicious build signed | Page; kill switch or halt first, investigate second; IR firm and counsel engaged for security; status note; device loop "A date was corrected" (BLUEPRINT 6) |
| SEV2 | A core promise is broken for many students, with no wrong information | Reminders not firing on a platform; sync or backup down above the burn threshold; a bad app release spreading | Page in waking hours; halt the rollout |
| SEV3 | Degraded, with a workaround | Ask unavailable (guides and step-back still work); pipeline source unreachable; SES under review | Ticket, next business day |
| SEV4 | Cosmetic or internal | Dashboard broken; a nightly job failed once | Backlog |

### 7.3 Roles

PagerDuty's open guide defines Incident Commander, Scribe, Subject Matter Experts, Customer and Internal Liaison, and Deputy ([PagerDuty incident response](https://response.pagerduty.com/)). With one or two people, one holds IC and scribe, and the founder holds comms and the legal calls. Write the roles down anyway so the IR firm and counsel slot in. Use NIST SP 800-61 Rev. 3 (April 2025, built on CSF 2.0) as the frame for the security incident plan ([NIST SP 800-61r3](https://csrc.nist.gov/pubs/sp/800/61/r3/final)).

### 7.4 Runbooks (each tested before the first stranger)

| Runbook | Steps in brief |
|---|---|
| **Wrong rule or date** | Kill-switch the Playbook or template, or revoke the bundle version through the signed channel; devices recompute and show "Can't tell yet" or the corrected date with a "was X, now Y, because Z" loop (BLUEPRINT 6); add the failing case to golden vectors and evals before re-publishing |
| **Bad app release** | iPhone: pause phased release (up to 30 days), ship a fix through expedited review if needed; Android: halt staged rollout; desktop: set the update percentage to 0 or roll the manifest back; backend: redeploy the previous image |
| **Release-integrity alarm** | Freeze all release environments; revoke the affected signing identity (Artifact Signing profile, Apple certificate, Play upload key reset, TUF key rotation through the threshold); verify attestations of every published artifact |
| **Suspected breach** | Contain (revoke sessions and roles, rotate secrets), preserve CloudTrail and logs in the log-archive account, engage the IR firm and counsel; California notice clock of 30 days from discovery, and the Attorney General within 15 days of notifying when over 500 residents (research-security 9; counsel confirms) |
| **Government demand** | Counsel first; published request policy; what Duly holds is in the retention table (BLUEPRINT 5.5) |
| **SES paused** | Stop sends; find the cause in configuration-set events; reply to the AWS case with fixes made, as the SES FAQ asks |
| **Push credentials invalid** | Rotate the APNs key or FCM service account; local reminders are unaffected by design |
| **Bedrock or Ask failure** | Server flag sends Ask to guides-and-step-back only; no partial answers |

### 7.5 After the incident

- Blameless write-up within 5 business days for SEV1 and SEV2: timeline, impact in plain words, contributing causes, what detected it, and actions with owners. Each action becomes a test, gate or alarm where it can.
- For SEV1 and student-visible SEV2, a short public note on a status page hosted outside the production account (S3 and CloudFront in a separate account), so it stays up when production is down.
- **Tabletop exercises:** before the first stranger, then twice a year. Scenarios: a court order missed for 30 hours; a wrong 90-day count published to 10% of devices; a stolen CI token; a DHS administrative subpoena; the founder unreachable for a week (needs the second release signer, BLUEPRINT risk 15).

---

## 8. Environments and order of build

| Environment | Data | Who deploys | Notes |
|---|---|---|---|
| local | Synthetic | Anyone | `make up` (exists): api, worker, web, ops, postgres, minio, mailpit |
| dev (nonprod account) | Synthetic only | CI on main | Ask evals run here against Bedrock |
| staging (nonprod account) | Synthetic only | CI on tag | Restore drill, pairing test, canary-bytes test, k6, Schemathesis |
| prod | Real | `deploy-prod` environment with human approval | `/v1/compute*` absent from the build (BLUEPRINT 6 gate) |

**Order, matched to BLUEPRINT 8:**
1. Now: harden `ci.yml` (SHA pins, permissions). Add the `desktop` workflow with Playwright Electron smoke. Add signed and notarised Mac builds behind `release-desktop`, and a signed update manifest on S3 and CloudFront. This gives the founder Duly in its own window, updated safely.
2. Windows signing through Artifact Signing; fuses check; desktop beta channel.
3. Backend OTel, the logging schema test, the Collector redaction allowlist, Sentry plus Relay with the strict configuration, SLO dashboards and burn-rate alarms in staging.
4. Phase 3 engine port: the `core` workflow with golden vectors on every target.
5. Phase 4 iPhone: `ios` workflow, TestFlight, Maestro, the 30-day reminder study, MetricKit.
6. Ask (D79): eval harness, Bedrock SCPs (retention `none`, invocation logging denied), server flag fallback.
7. Before sync and backup: canary-bytes test on all channels, fuzzing nightly, formal model, outside audit, restore drill daily.
8. Before strangers: runbooks tested, tabletop, IR firm retained, pager live, status page, second release signer.
9. Android: organisation Play account, internal and closed tracks, staged rollout.

---

## 9. Decisions for the founder

1. **GitHub plan:** Team, so private-repo environments with required reviewers protect signing and deploys (2.2).
2. **Second release signer and the human approver** for `release-*` and `deploy-prod` (BLUEPRINT risk 15). Agents never approve.
3. **Desktop distribution:** direct download with Duly's own signed update manifest first, Mac App Store later or never (2.5, 2.6).
4. **Windows signing:** Azure Artifact Signing if Duly's legal entity qualifies; otherwise an EV certificate on a cloud HSM (2.5).
5. **Error tracking destination:** Sentry SaaS (US) through a Duly-run Relay, with client reports opt-in (recommended), or self-hosted GlitchTip (5.3).
6. **Native crash dumps:** off in v1; later, per-crash consent or never (5.2).
7. **SLO targets:** the values in 4.6, especially sync p99 and crash-free sessions.
8. **On-call hours and response targets** (7.1), and the IR firm retainer.
9. **Ask eval thresholds:** routing precision, pass^k and the size of the boundary set before launch (3.5).
10. **Play account** as an organisation (2.5).

---

## 10. Unverified in this pass

- Whether macOS minutes count against GitHub's included minutes, and at what multiplier.
- electron-updater `stagingPercentage` and its signature checks (docs page returned 404).
- ECS deployment circuit breaker and alarm rollback details.
- Azure Artifact Signing eligible countries, any organisation-age rule, and price.
- Apple Developer Program and Play registration fees.
- Apple background push throttling wording; APNs broadcast suitability for wake-ups; Notification Service Extension keychain access under Duly's chosen class.
- FCM HTTP v1 auth through workload identity; Play Developer API through workload identity federation.
- ADOT Collector exporters to X-Ray and CloudWatch; OTel GenAI content-capture wording (page moved).
- GlitchTip native symbolication; Sentry plan details beyond the pricing page summary.
- Store privacy label categories for crash data.
- Paging vendor choice and price; a device farm for real-device reminder tests.
- Tools not fetched: Wycheproof, Atheris, OWASP ZAP, cargo audit equivalents for Swift and Gradle, AWS Budgets.

## 11. Sources

- GitHub: [Actions security hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions); [OIDC in AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws); [artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds); [environments](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment); [runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing); [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- Electron: [code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing); [fuses](https://www.electronjs.org/docs/latest/tutorial/fuses); [updates](https://www.electronjs.org/docs/latest/tutorial/updates); [crashReporter](https://www.electronjs.org/docs/latest/api/crash-reporter)
- Microsoft: [Artifact Signing overview](https://learn.microsoft.com/en-us/azure/artifact-signing/overview); [Artifact Signing FAQ](https://learn.microsoft.com/en-us/azure/artifact-signing/faq)
- Apple: [phased release](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/); [TestFlight](https://developer.apple.com/testflight/); [remote notification payload](https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification); [notification service extension](https://developer.apple.com/documentation/usernotifications/modifying-content-in-newly-delivered-notifications); [MetricKit](https://developer.apple.com/documentation/metrickit)
- Google: [Play staged rollouts](https://support.google.com/googleplay/android-developer/answer/6346149); [Play testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465); [Play App Signing](https://developer.android.com/studio/publish/app-signing); [Android vitals](https://developer.android.com/topic/performance/vitals); [Android notifications](https://developer.android.com/develop/ui/views/notifications/build-notification); [FCM message types](https://firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type); [FCM priority](https://firebase.google.com/docs/cloud-messaging/android/message-priority); [Gmail sender guidelines](https://support.google.com/a/answer/81126)
- fastlane: [match](https://docs.fastlane.tools/actions/match/)
- Testing: [Playwright Electron](https://playwright.dev/docs/api/class-electron); [Maestro](https://github.com/mobile-dev-inc/maestro); [Detox](https://wix.github.io/Detox/docs/introduction/getting-started); [Hypothesis stateful](https://hypothesis.readthedocs.io/en/latest/stateful.html); [Pact](https://docs.pact.io/); [Schemathesis](https://schemathesis.readthedocs.io/en/stable/); [k6 test types](https://grafana.com/docs/k6/latest/testing-guides/test-types/); [cargo-fuzz](https://rust-fuzz.github.io/book/cargo-fuzz.html); [OWASP MASTG](https://mas.owasp.org/MASTG/)
- Evals: [Anthropic, develop tests](https://platform.claude.com/docs/en/docs/test-and-evaluate/develop-tests); [Bedrock evaluation](https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation.html); [Bedrock invocation logging](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html); [Sierra tau-bench](https://sierra.ai/blog/benchmarking-ai-agents)
- Observability: [OTel sensitive data](https://opentelemetry.io/docs/security/handling-sensitive-data/); [OTel redaction processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md); [CloudWatch SLOs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-ServiceLevelObjectives.html); [SRE workbook, alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- Error tracking: [Sentry Electron options](https://docs.sentry.io/platforms/javascript/guides/electron/configuration/options/); [Sentry Electron native crashes](https://docs.sentry.io/platforms/javascript/guides/electron/features/native-crash-reporting/); [Sentry minidumps](https://docs.sentry.io/platforms/native/guides/minidumps/); [Sentry server-side scrubbing](https://docs.sentry.io/security-legal-pii/scrubbing/server-side-scrubbing/); [Sentry data storage location](https://docs.sentry.io/organization/data-storage-location/); [Sentry Relay](https://docs.sentry.io/product/relay/); [Sentry pricing](https://sentry.io/pricing/); [self-hosted Sentry](https://develop.sentry.dev/self-hosted/); [GlitchTip install](https://glitchtip.com/documentation/install); [Sentry React Native sensitive data](https://docs.sentry.io/platforms/react-native/data-management/sensitive-data/)
- Email: [SES deliverability](https://docs.aws.amazon.com/ses/latest/dg/send-email-concepts-deliverability.html); [SES enforcement FAQ](https://docs.aws.amazon.com/ses/latest/dg/faqs-enforcement.html)
- Feature flags: [OpenFeature](https://openfeature.dev/docs/reference/intro); [AWS AppConfig](https://docs.aws.amazon.com/appconfig/latest/userguide/what-is-appconfig.html)
- Incident response: [Google SRE, on-call](https://sre.google/sre-book/being-on-call/); [PagerDuty incident response](https://response.pagerduty.com/); [NIST SP 800-61r3](https://csrc.nist.gov/pubs/sp/800/61/r3/final)
