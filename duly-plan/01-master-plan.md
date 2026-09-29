# 01 Master Plan

## Product in one line
Duly is your immigration record, kept: documents, deadlines, cited answers, and proof of work, computed by code, watched daily, honest always.

## Locked decisions (this package)
| Area | Decision |
|---|---|
| Web frontend | React 18 + TypeScript + Vite, TanStack Router and Query, Tailwind with Duly tokens |
| Desktop | Electron shell wrapping the same web app, plus native main-process modules for WorkBook local capture, OS keychain, SQLCipher store, file exports |
| Ops dashboard | Same React stack, separate build, served behind admin auth (05) |
| Backend | FastAPI monolith + worker, one codebase, Python 3.12, SQLAlchemy + Alembic |
| Database | Postgres 16 with RLS everywhere; SQLite (SQLCipher) only inside the Electron WorkBook store |
| Queue | Postgres SKIP LOCKED jobs; no Redis |
| Cloud | AWS: ECS Fargate (api, worker), RDS Postgres, S3, SES, CloudFront, KMS, Secrets Manager; Terraform in infra/aws; docker compose remains the single local truth and the images are identical |
| LLM | Claude via API through the narration service only, structured outputs, no-new-facts validator, ZDR pursued (verify terms) |
| Email | Sent via SES from duly subdomain identities aliased under the ExpandRange Google Workspace domain (06) |
| WorkBook | Optional module, per the approved handoff; intro gate, never compulsory; Electron-native store; web shows summaries and manual entry only |
| Pricing (from research) | Free core; Pro 79 USD per year; fear-moment packs 29 to 99 USD; web billing; 14-day refund |
| Positioning | Record first; AI is the interface to the record; never an advisor; honesty and citations as brand |

## v0 scope (what the founder can run and feel)
- Full student app: Onboarding, Home verdict, Timeline (6 phases, coverage grid), Documents index, Checklists (stateful), Scenarios (validated narration), Updates with impact score, Case, Feedback
- WorkBook module: intro, setup, Today with manual day entry; GitHub + Google Calendar connectors behind a flag; sealing and method note per handoff
- Duly Ops: review queue (attorney gate), rule packs with diff and rollback, audit browser with replay, users and consents, feedback inbox, factory and cost metrics
- Weekly brief email from updates@ with per-user impact scores; support@ inbox flow
- The complete gate pipeline of 07 running in CI from day one

## Explicit non-goals for v0
Payments, mobile apps, USCIS live polling (manual receipt entry + stub job), Slack bot, university portal, attorney marketplace, multi-role cases, Gmail source, cloud sync of WorkBook (local only, optional user-key backup later).

## Rejected (do not reintroduce; merged from all rounds)
- Everything in workbook-handoff/docs/07 Rejected
- Fear mongering UI: red badges, countdown panic, urgency framing
- AI computing any date, deadline, or eligibility statement
- Third-party analytics or ad SDKs in any client
- "Sealed" or "cryptographic" wording in user-facing copy
- Lawyer-equivalence or prevention claims in any marketing or product copy
- Blinking status indicators; motion is slow, low amplitude, additive only

## Success criteria for the founder's first self-test
1. `make up && make seed` then a full walkthrough of every screen against real endpoints with zero mocked responses in the path.
2. Change a rule pack parameter in Ops, approve it, and watch Home, Timeline, and the weekly brief change consistently, with the audit browser explaining every answer.
3. Enter a WorkBook day, mark complete, export a pack, run verify.py, confirm hashes.
4. Ask three scenario questions; every answer carries sources, rule pack version, the disclaimer footer, and at least one is a correct abstention.
5. Run `make attack`; the adversarial suite passes with zero criticals.
