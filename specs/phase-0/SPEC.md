# Phase 0 SPEC: repo skeleton and gates

Source: duly-plan/10-build-sequence.md row 0, amended by DECISIONS.md rounds 1 and 2 and BOUNDARY.md.

## Goal

An empty but complete Duly stack that boots with one command, and a gate pipeline that is proven to catch violations before any product code exists.

## Done when

1. `make up` boots api, worker, web, ops, Postgres, MinIO, and mailpit, and `make down` stops them cleanly.
2. `make test` passes on the clean skeleton.
3. `make prove-gates` shows, in a scratch copy, that the clean code passes all six gates and that each planted violation makes its gate fail for the expected reason.
4. The founder opens web on 5173 and ops on 5174 and sees a placeholder page in Duly tokens that reads its status from the real api.

## Files

| Path | Contents |
|---|---|
| Makefile | up, down, seed, test, e2e, attack, lane, prove-gates |
| infra/docker-compose.yml | profiles dev, test, e2e, attack |
| infra/Dockerfile.api, Dockerfile.web, Dockerfile.ops | one image per service, same images for local and cloud |
| contracts/ | openapi.yaml (health and version only), engine_output, rulepack, update, workbook_bridge schemas, events.md, emails.md |
| engine/ | package skeleton, injected clock, no rules yet |
| rulepacks/ | schema loader and one empty pack with the five status tags: settled, guidance, litigated, proposed, school |
| api/ | FastAPI app with /health and /version, worker loop, settings validated at boot |
| web/, ops/ | React, TypeScript, Vite; tokens.css with the Duly and WorkBook scopes; one placeholder screen each |
| pipeline/ | LangGraph skeleton for the updates pipeline: stages named, no sources wired |
| assistant/ | boundary classifier and output validator interfaces from BOUNDARY.md, no model wired |
| tools/copy_lint/ | forbidden-phrase scanner, including the Side B word list |
| tools/diff_policy/ | protected-path checker per lane |
| .github/workflows/ci.yml | gates 1 to 6 |
| .claude/ | agents, starter skills, hooks, lanes, LESSONS, per duly-plan/11 |
| loops/ralph.sh | lane runner |
| watch/ | Hermes Agent config for the source watcher, detection and alerts only |
| security/threat-model.md | v1 |
| tests/holdout/ | scaffolding, excluded from agent contexts |
| evals/boundary/ | first paired questions on each side of the line |

## Changes from the original plan

| Original | Now | Why |
|---|---|---|
| Narration service calls Claude with user parameters | Assistant runs on a model we host; Claude is used only on public law text | D13, D23 |
| Rule pack covers F-1 only | Pack layout is per category from the start: f1, h1b, o1, eb1a | D12 |
| Rules have an effective date only | Rules carry a status tag and a regime flag | D1 |
| Home verdict has implicit states | Engine output schema has the four states | D4 |
| Weekly brief from updates@ | Alerts also go from the no-reply address; addresses are config | D22 |
| pnpm | npm workspaces, unless the founder prefers pnpm | pnpm is not installed; one less tool |
| React 18 | React 19 | Current stable release; 18 is no longer the default install |
| Official MinIO image | Chainguard build of MinIO | MinIO no longer publishes its own images |
| make test runs in the same containers as CI | Same scripts, run directly on the machine and in CI | Faster loop; a gates image can come later |
| Compose profiles dev, test, e2e, attack | dev only | The others arrive with the phases that need them (3 and 10) |
| Docker Desktop | colima | Free, light, no licence terms |

## Not in this phase

Any database table, any real rule, any real screen, any source connector, any model download above what the placeholder needs.

## Copy lint scope

Runs on all product strings, prompts, emails, specs, and docs written for this repo. Skips docs/research/notes/, which holds raw research with quoted sources.

## Where the assistant model runs

Local prototype: the Claude API, with the founder's own test data only. v0 on AWS: Claude through Amazon Bedrock, with no data retention. Own servers only after validation. The provider is one configuration value. No model is wired in Phase 0.

## Coverage note

tools/gates/ is left out of line coverage. Those scripts are checked by `make prove-gates`, which runs them against planted violations.

## Result, 2026-09-28

| Done criterion | Result |
|---|---|
| 1. make up | Passes. All seven containers healthy |
| 2. make test | Passes |
| 3. make prove-gates | Passes. 6 of 6 clean, 12 of 12 violations caught |
| 4. Founder opens web and ops | Waiting for the founder |

Not done in this phase: Hermes is not installed (watch/ holds the source list only); the five starter skills have not been replayed; tests/holdout/ is empty.
