# 10 Build Sequence

Each phase is a PR set behind the full applicable gates; definition of done includes the founder walking the result locally.

| Phase | Delivers | Lanes | Done when |
|---|---|---|---|
| 0 | Repo skeleton: contracts, compose profiles, Dockerfiles, CI gates 1 to 6, hooks, .claude, holdout scaffolding, security/threat-model.md v1 | founder + 1 agent | make up boots empty stack; a trivial PR passes and a seeded violation of each gate fails |
| 1 | DB models, migrations, RLS, envelope crypto plumbing, audit writer, authz matrix harness | L-api high attention | RLS and authz matrices green; audit chain verifies |
| 2 | Engine v0 (clocks, windows, verdict, coverage, impact) + rulepack v2026.09 authored from compliance-report sources | L-engine + L-tests + attorney pass | golden and property suites green; holdout live; pack diff renders in a script |
| 3 | Core API (cases, timeline, checklists, updates read) + generated client | L-api | schemathesis green; e2e skeleton walks onboarding to verdict via curl |
| 4 | Web app: Onboarding, Home, Timeline, Checklists, Updates, Case, Feedback on real endpoints, Duly tokens and motion | L-web | founder walkthrough matches approved canvas behavior; a11y checks pass |
| 5 | Narration service: retrieval, structured output, validator, abstention, scenario and explain endpoints; eval harness seeded (accuracy, citation, honesty, safety sets) | L-narration + L-evals | eval gates green including zero injection leaks; per-answer footer asserted |
| 6 | Ingestion jobs + review queue + Ops panes 1 to 3 + ops WebAuthn auth | 2 low-attention + L-ops | attorney flow end to end: ingest to approve to published update to changed user timeline, all audited |
| 7 | Impacts + weekly brief + SES setup (identities, DKIM, DMARC, suppression) + alert policy + mailpit e2e | L-api + L-content | founder receives a real brief for the seed case from updates@ in staging |
| 8 | Electron shell + WorkBook v0 manual (Today, Log, complete, amendments, sealing, exports, verify.py) + bridge + shared doc index | L-desktop + L-tests | handoff golden days and seal round trip green; export verifies; module copy lint green |
| 9 | Consent and rights plumbing + privacy pages + disclaimer stack + retention sweeper + Ops pane 4 | L-api high attention | regulation gates green; DPIA updated |
| 10 | Security hardening pass: attack profile, ZAP, k6, chaos-lite, red-team lane live, VDP page; Ops panes 5 and 6 | L-security + L-ops | make attack zero criticals; nightly green one full week |
| 11 | AWS: terraform apply, staging soak, PRR-lite, first deploy; founder self-test script (01 success criteria) executed | founder + 1 agent | all five success criteria pass on staging from the same digests |
| 12 | Source connectors behind flags (Calendar, Meet, GitHub, Slack) per handoff scopes | L-desktop | connector contract tests and revocation flows green |

Parallelism guide: at most one high-attention phase in flight; 3 to 5, 6 to 7, and 8 can interleave in low-attention lanes once 2 lands. Every numeric threshold in 07 is re-baselined from local data at phase 10.
