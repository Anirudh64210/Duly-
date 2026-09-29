# 13 Cutlines

What v0 deliberately does not do, why, when it enters, and the work that brings it in. The factory never builds these speculatively; each enters only on its trigger.

| Cutline | Why cut | Enters at | Unblock and work |
|---|---|---|---|
| Payments (Stripe) | Validate value before charging; billing adds ARL and refund compliance surface | Phase 11 to 12, after the founder self-test passes | Stripe web checkout, CA ARL consent flow, 14-day refund plumbing; pricing fixed: 79 USD per year, 29 to 99 USD packs |
| USCIS live case polling | No official consumer API; scraping brittle and ToS risky | Post v0 experiment | Manual receipt entry ships with the poll job stubbed; evaluate USCIS Torch API access, else a careful checker with backoff behind a flag |
| WorkBook source connectors (Calendar, Meet, GitHub, Slack) | OAuth apps and Google verification take calendar time; manual entry proves the loop | Phase 12, behind flags | Register OAuth apps during Phase 3 to 4 (Google verification is the long pole); scopes per handoff; connector contract tests specced |
| Full on-device vault encryption on web | Client crypto UX (recovery, multi-device) is its own project | Desktop real in Phase 8; web later | Electron SQLCipher plus keychain is the v0 vault; web waits on the key-recovery decision (secret key vs passphrase) |
| Push notifications | Email covers v0 | With mobile apps | Weekly brief and threshold alerts via SES carry the job |
| Slack daily post (WorkBook) | Not designed in WorkBook style (handoff open item 5) | Post Phase 12 | Founder designs; then one chat.write scope and one worker job |
| Mobile apps | Web plus Electron first; store commissions and review cycles | After paid web validation | React Native vs wrapped PWA decided then; web billing already avoids the Apple cut |
| Multi-role cases | Schema allows a list; UI undesigned | When a real user needs it | UI plus per-case engine runs; cheap later, wasteful now |
| University portal and DSO share | Traction proof first | After validation experiments | Reuses export links (supervisor view per handoff); first step is the three DSO conversations, not code |
| Attorney marketplace and consults | UPL structure (referral vs ABS) decided later; not needed to sell v0 | Year 2 tier | Counsel item; Boundless referral model is the template |
| Gmail source | Google restricted scopes require verification plus a security assessment | Possibly never | Stays out unless the assessment cost is ever justified |
| WorkBook cloud backup | Local-first is the trust story; sync adds key risk | Post v0, opt in | E2E encrypted backup to user-held Drive or S3 with their passphrase, per handoff storage spec |
| Redis, Temporal, Kubernetes | Right-sized out; Postgres queue plus ECS suffice | Only on measured triggers | Migration triggers documented in the backend plan; Terraform makes K8s a manifests job |
| SOC 2 | Consumers do not buy on it; 15 to 50k USD | When the university channel demands it | VDP, security page, and pen test cover v0 scrutiny |
| Monthly AI narrative (WorkBook) | Cloud with user key deferred | Post Phase 12 | Prompt final in handoff 08; small feature once BYO-key UX exists |

Operating notes:
1. Nothing on this list blocks the founder self-test; that is the point of the cuts.
2. Long-lead paperwork starts early, code lands late: Google OAuth verification and the Duly domain plus SES warmup both kick off around Phase 3.
3. Three items are decisions, not code: DSO channel, attorney structure, mobile timing (see 12).
