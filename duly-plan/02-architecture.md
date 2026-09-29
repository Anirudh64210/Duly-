# 02 Architecture

## Monorepo
```
duly/
  contracts/            openapi.yaml, engine_output.schema.json, rulepack.schema.json,
                        workbook_bridge.schema.json, events.md, emails.md
  engine/               pure functions, clock injected (clocks, windows, verdict, coverage, impact)
  rulepacks/f1-us/vX/   parameters.yaml, checklists.yaml, sources snapshots, CHANGELOG
  api/                  FastAPI app + worker (auth, cases, timeline, checklists, updates,
                        narration, workbook, documents, consent, feedback, admin, audit, jobs, db)
  web/                  student app (React TS Vite)
  desktop/              Electron: main/ (capture, keychain, sqlcipher, bridge server), preload/, loads web build
  ops/                  admin dashboard (React TS Vite)
  emails/               MJML or react-email templates: weekly brief, update alert, support replies, transactional
  infra/
    docker-compose.yml  profiles dev, test, e2e, attack
    Dockerfile.api Dockerfile.web Dockerfile.ops
    aws/                terraform: vpc, ecs fargate (api, worker), rds, s3, cloudfront, ses, kms, secrets, waf
  security/             threat-model.md, attack corpus, zap config, authz matrix, semgrep rules
  evals/                narration eval sets, citation checker, honesty and abstention suites, promptfoo config
  .claude/              factory (11)
  tests/holdout/        hidden suite (excluded from agent contexts)
```

## Runtime topology
- Local: compose dev profile: api, worker, web 5173, ops 5174, Postgres (migrated, RLS on), MinIO, mailpit, OTel console. Desktop: `pnpm dev` in desktop/ attaches Electron to web dev server; WorkBook bridge serves http://127.0.0.1:47821 locally only.
- AWS: same api and worker images on Fargate behind ALB + WAF; RDS Postgres (encrypted, automated backups, monthly restore rehearsal); S3 for exports staging and web/ops static via CloudFront; SES for mail; KMS CMKs for envelope encryption; Secrets Manager for config; CloudWatch + OTel collector. No Kubernetes; Terraform makes the later move mechanical.

## Data planes (three zones, enforced)
1. Device zone: WorkBook events, blocks, documents blobs and names (SQLCipher, key in OS keychain). Never uploaded. Web fallback stores only manual day summaries server-side, clearly labeled.
2. Encrypted cloud zone: account, case profile, checklist state, updates impacts, workbook day summaries the user chose to sync, feedback. Field-level AES-256-GCM with per-user data keys wrapped by KMS (05).
3. LLM zone: minimized structured parameters and retrieved rule text only; never document contents, never names, never free identifiers. Enforced by a serializer allowlist at the narration boundary, not by convention.

## Request path (unchanged doctrine)
case → engine(case, rulepack@version, now) → deterministic result → optional narration (retrieve pack text → Claude structured output → no-new-facts validator → abstention on failure) → response → append-only audit row (hash chained).

## WorkBook bridge (per handoff 06 boundary)
Electron main exposes the versioned local API: GET/PUT /case, GET /days, GET /history, GET /documents (index), POST /exports, POST/DELETE /links. Duly web (when running inside Electron or on the same machine) reads weekly hours and day summaries through the bridge; the server only ever receives what the user syncs. Ownership split exactly as the handoff states: Duly owns status documents and dates; WorkBook owns duties, sources, hours target; shared encrypted store, one lock.

## Environments
dev (compose) = test (CI containers) = prod (AWS) by image digest. pydantic-settings validates config at boot. Feature flags in a Postgres table. Migrations run in CI and on deploy with lock; every migration reversible.
