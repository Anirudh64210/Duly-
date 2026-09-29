# Phase 0 SPEC: repo skeleton and gates

Source: duly-plan/10-build-sequence.md row 0, amended by DECISIONS.md rounds 1 and 2 and BOUNDARY.md.

## Goal

An empty but complete Duly stack that boots with one command, and a gate pipeline that is proven to catch violations before any product code exists.

## Done when

1. `make up` boots api, worker, web, ops, Postgres, MinIO, mailpit, and the local model service, and `make down` stops them cleanly.
2. `make test` passes on the clean skeleton.
3. `make prove-gates` plants one violation per gate (1 to 6) in a scratch copy and shows that each gate fails on its own violation and on nothing else.
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

## Not in this phase

Any database table, any real rule, any real screen, any source connector, any model download above what the placeholder needs.

## Copy lint scope

Runs on all product strings, prompts, emails, specs, and docs written for this repo. Skips docs/research/notes/, which holds raw research with quoted sources.

## Needs from the founder before the done criteria can be checked

1. A container runtime on this Mac (Docker Desktop or OrbStack). None is installed.
2. A private GitHub repo to push to.
