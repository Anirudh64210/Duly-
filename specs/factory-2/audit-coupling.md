# Audit: where the factory core is tied to Duly

Date: 2026-09-30. Code read: duly-founder at 708d04f (factory batch 1 built: FINAL.md items 1, 2, 3, 6, 11, 12, 14).
Scope: tools/factory/*.py, factory/config.yaml, factory/agents/*.yaml, .claude/agents/*.md, .claude/lanes/*.yaml,
.claude/hooks, .claude/settings.json, tools/diff_policy, tools/gates, dashboard/, Makefile, docs/factory/RUNBOOK.md,
plus the files these load (contracts/factory_*.schema.json, evals/factory/golden.yaml, .github/workflows/ci.yml,
pyproject.toml, .claude/skills).

## Where each item goes

| Code | Destination | Meaning |
|---|---|---|
| **P** | Project profile | One file per project (proposed `factory/project.yaml`) plus the project's own lanes, agents' addenda and golden tasks. The core reads it and holds no project value. |
| **G** | Plug-in gate | A check the project brings. The core only knows "run these named commands, offline or online, in this order". |
| **S** | Stack adapter | Belongs to the language toolchain (python-uv, node-npm), not to Duly. Ships with the template as a small adapter the profile picks. Counts as profile config for the template. |
| **C** | Core fix | Neutral in intent but spelled with Duly's name or hard-coded where config already exists. Fix in the core: rename, or read the existing config key. |
| **D** | Delete | Dead, retired, or duplicated. |

## Summary

- The core has one hard import of the product: `engine.clocks` in 11 factory modules and in the mutation gate. Nothing in the factory can run in another repo until this goes. (C)
- Ten `DULY_*` environment variables, the `duly.*` telemetry keys, the `duly.invalid` commit identity and the `duly-` compose project are naming, not logic. (C)
- The legal domain reaches the core in four places: the citation regex in config.py (CFR, U.S.C., INA, section sign), the reviewer rubric lines fixed in contracts/factory_review.schema.json (`sourced`, `never_assumes`, `inside_the_boundary`), the finding kinds in reviewer.md, and the always-read list in the agent prompt (BOUNDARY.md, PRINCIPLES.md, DECISIONS.md). (P)
- Duly paths are spread across five hard-coded lists that say the same thing in different shapes: diff_policy PROTECTED, sandbox GUARDED, phase NEEDS_FOUNDER, the holdout path, and the Makefile. One profile section can feed all five. (P)
- Config drift: `approval_required`, `gates.diff_coverage_percent`, `gates.engine_diff_coverage_percent` and `network.allow_for_all` in factory/config.yaml are read by no code. The approval list is re-typed as globs in phase.py; the coverage floors are re-typed as 80 and 95 in the gate. Both are reliability faults as well as coupling. (C)
- The gates in tools/gates and Makefile gate-1 to gate-7 are almost all Duly checks. The mechanism (numbered gates, offline subset, prove-gates) is generic; the contents are plug-ins.
- Already generic: the ledger, registry and stop file, the jail, the sandbox walls, health fingerprints, budgets, billing guard, memory, efficiency, weekly, control, preflight, the plan runner, the report and agent schemas, the lane-kind model, and most of the dashboard. See the last section.

## 1. Hard dependency on product code

| File:line | What it assumes | Dest | Fix |
|---|---|---|---|
| tools/factory/agent_run.py:31, budget.py:6, control.py:20, drift.py:14, golden.py:16, health.py:17, ledger.py:13, memory.py:17, phase.py:32, registry.py:15, weekly.py:13 | `from engine.clocks import Clock, SystemClock`: the product's engine package is importable and owns the clock | C | Add `tools/factory/clock.py` (Clock protocol, SystemClock, FixedClock, 30 lines). The dashboard already does this (dashboard/clock.py). |
| tools/gates/mutation.py:22 | same import | C | same |
| pyproject.toml:4, 13-14, 25, 58, 71 | The factory's own deps (pyyaml, jsonschema, diff-cover) and its mypy/coverage settings live in Duly's pyproject; the factory runs inside Duly's venv (sandbox.py:199 `UV_PROJECT_ENVIRONMENT=<repo>/.venv`) | P / S | Template ships the factory as its own package (own pyproject, run with `uv run --project factory` or `uvx`). The project venv is used only for done commands. |
| tools/factory/config.py:68, 96, 122 | The factory's schemas live in the product's `contracts/` folder, which is also a guarded product contract path | C | Move factory_agent, factory_report, factory_review schemas to `factory/schemas/`. |
| contracts/factory_*.schema.json:3 | `$id` `https://duly.local/...` | C | Neutral id. |

## 2. Names and identity

| File:line | What it assumes | Dest |
|---|---|---|
| alerts.py:36 `DULY_NO_NOTIFY`; phase.py:183 `DULY_RETRY_SECONDS`, 256 `DULY_CI_POLL_SECONDS`, 661 `DULY_PLAN`, 698/701 `DULY_AWAKE`, 739 `DULY_CLAUDE_BIN`; agent_run.py:167, 473 `DULY_PLAN`, 563, 704 `DULY_CLAUDE_BIN`; jail.py:62, 84 `DULY_IN_JAIL`; sandbox.py:196-198 `DULY_LANE`, `DULY_RUN_ID`, `DULY_DONE`; tools/gates/diff_coverage.py:49; .claude/hooks/_lane.py:15; .claude/hooks/lane_test.py:4, 23, 33 | Env var prefix is the product name | C: rename to `FACTORY_*` once, core-wide. |
| agent_run.py:536-541, 769-770 | OpenTelemetry attributes `duly.lane`, `duly.task`, `duly.run_id`, ... | C: `factory.*` |
| telemetry.py:98 | `service.name = duly-factory` | P: `project.slug` + `-factory` |
| worktree.py:11, 13, 88 | Commit identity `Duly factory`, `factory@duly.invalid`, `<agent>@agents.duly.invalid` | P: `project.slug` |
| tools/gates/prove.py:24 | `prove@duly.invalid` | P |
| jail.py:79 | tempdir prefix `duly-jail-` | C: `factory-jail-` |
| tools/gates/mutation.py:156 | tempdir prefix `duly-mutation-` | G (moves with the mutation gate) |
| .claude/hooks/guard_bash.py:28 | Compose project must be `duly-<lane>` | P: `project.slug` |
| agent_run.py:958 and phase.py:38 | Commit trailer hard-coded twice as `Claude Opus 5.5`, while the model is pinned in config.yaml:6 | C: one constant, built from `model.pinned` (two copies can disagree after a model change). |
| validate.py:20 | `HEALTH_PROBE_MODELS = ("claude-haiku-4-5-20251001",)`; config.yaml:8 names the same id | C: allowed probe models belong in config.yaml, not code. |
| "founder" as the human role: alerts.py:29, control.py:31/39/150/168, phase.py:39 `NEEDS_FOUNDER`/121/131/141/487, golden.py:75-77/159, efficiency.py:147/242, preflight.py:127, diff_policy/check.py:62/75/102, .claude/hooks/*.py, .claude/lanes/founder.yaml, dashboard/factory_data.py:28 `ORCHESTRATOR = "founder"`, alerts/messages throughout | The human owner is called founder, and the orchestrator's ledger lane is `founder` | C: lane kind and ledger name `owner` (or a `project.human_role` label used only in messages). Keep the concept; drop the word from code paths. |

## 3. The legal domain inside the review and prompt

| File:line | What it assumes | Dest |
|---|---|---|
| tools/factory/config.py:100 `CITED` | A blocking finding may cite `BOUNDARY`, `CFR`, `C.F.R.`, `U.S.C.`, `INA`, `§`, or a URL | P: `review.citation_patterns` (list of regexes). The rule "a blocking finding names a SPEC point or a cited source" stays in core (FINAL.md item 6). |
| config.py:112-139 messages | "SPEC point, BOUNDARY rule or cited source" | P: message built from the profile's citation names. |
| contracts/factory_review.schema.json:23-33 | Rubric lines `correct, sourced, never_assumes, inside_the_boundary, secure, tested` are required by the schema | P: `review.rubric` in profile; the schema requires only `^[a-z_]+$` keys and the core checks the key set equals the profile's list. Core default: `correct, tested, secure`. |
| contracts/factory_review.schema.json:91, 95 | Descriptions mention `id_leak`, `wrong_date`, `BOUNDARY rule` | P (text only) |
| .claude/agents/reviewer.md:15 | "Always look for": conclusion about a person, date from a model, clock, user data to outside model, quiet verdict, Duly's reading shown as law, rule with no primary source | P: project addendum appended to a generic reviewer role. |
| reviewer.md:2 (step 2) | "Check dates and counts by hand against the saved sources" | P |
| reviewer.md:22-30 | Rubric table with Duly lines | P (rubric rows from profile) |
| reviewer.md:35 | Example spec points `BOUNDARY rule 3`, `8 CFR 214.2(f)(10)` | P |
| reviewer.md:37 | Finding kinds incl. `wrong_date`, `wrong_source`, `id_leak`, `boundary` | P: `review.finding_kinds`; core keeps `regression, missing_test, missing_negative_test, wording, overbuilt, spec_gap, other`. |
| agent_run.py:91 (PROMPT) | Every agent reads `CLAUDE.md, PRINCIPLES.md, BOUNDARY.md, DECISIONS.md` | P: `prompt.always_read`. FINAL.md item 10 (read only what the mission names) argues for a short list. |
| agent_run.py:79-80 (PROMPT) | Standard-library hint names Python `datetime, calendar, ...` and TypeScript `Intl, Date, Array` | S: from the stack adapters the profile picks. |
| agent_run.py:113 (PROMPT) | Report schema path `contracts/factory_report.schema.json` | C (moves with the schemas) |
| .claude/agents/builder.md:10-11 | "Every number comes from a rule pack or contracts/product_settings.yaml"; "never assume a fact about a person" | P: builder addendum. Rest of builder.md is generic. |
| .claude/agents/auditor.md:11, 14 | `docs/requirements/register.json`, `DECISIONS.md D47` | P: `audit.register`, `audit.scope_statement`. The auditor method is generic. |
| .claude/agents/red-team.md:9 | Targets: BOUNDARY line, publish without primary source, Ops network list, user data into a model prompt | P: red-team addendum. |
| .claude/agents/eval-curator.md (whole), rulepack-drafter.md (whole) | Duly agents (visa nuance, boundary pairs, eCFR injunction check) | P: project agents, not template agents. |
| .claude/agents/skill-curator.md, factory/agents/skill-curator.yaml | Retired (FINAL.md item 12) | D |
| .claude/agents/test-author.md | Generic apart from "the contracts" | core template agent |

## 4. Paths and lanes

| File:line | What it assumes | Dest |
|---|---|---|
| tools/diff_policy/check.py:18-33 `PROTECTED` | Graders are `tests/**, evals/**, security/**, .claude/**, .github/**, tools/gates/**, tools/copy_lint/**, tools/diff_policy/**, contracts/**, BOUNDARY.md, DECISIONS.md, CLAUDE.md, Makefile, pyproject.toml` | P: `paths.graders`. Core adds `.claude/**, .github/**, factory/**, tools/factory/**` always. |
| tools/factory/sandbox.py:38-57 `GUARDED` | Never-writable: settings, hooks, agents, `.github`, `factory`, `contracts`, `tools`, Makefile, pyproject, package.json, lockfiles, CLAUDE.md, BOUNDARY.md, PRINCIPLES.md, DECISIONS.md, .gitleaks.toml, .lane | P for `contracts`, `BOUNDARY.md`, `PRINCIPLES.md`, `DECISIONS.md`, `.gitleaks.toml`; S for lockfiles; core for the rest. Same list as PROTECTED in another shape: derive both from one profile section. |
| tools/factory/phase.py:39-72 `NEEDS_FOUNDER` | Globs for dependency, CI, guardrail, skill and contract changes, incl. `security/semgrep/*`, `proposals/*`, `.claude/LESSONS/*`, `contracts/*`, `BOUNDARY.md`, `PRINCIPLES.md`, `DECISIONS.md` | P: move into factory/config.yaml `approval_required` as `{reason: [globs]}`; today config.yaml:34-40 lists the same reasons and no code reads it. `proposals/*` and `.claude/LESSONS/*` go (D) once the inbox is closed for good (item 12). |
| agent_run.py:618-620, sandbox.py:126-127 | Hidden tests live at `tests/holdout`, hidden from `implementation` lanes | P: `paths.holdout` (optional). |
| factory/agents/builder.yaml:29-30, test-author.yaml:10, 27-28 | Health probe writes `tests/holdout/probe.txt` / `engine/probe.txt` | P: probe target = "a path the lane does not own", which the core can pick itself from the lane file (then C). |
| auditor.yaml:29-30, reviewer.yaml:28-29, red-team.yaml:27-28, eval-curator.yaml:27-28 | Probe paths `engine/`, `api/`, `assistant/`; homes `docs/requirements/`, `reviews/`, `security/`, `evals/` | same as above |
| factory/agents/*.yaml `lanes:` (builder:5, auditor:5, reviewer:5, test-author:5, red-team:5, eval-curator:5, rulepack-drafter:5, skill-curator:8) | Duly lane names | P |
| factory/agents/rulepack-drafter.yaml:25-29 | Network allowlist `www.ecfr.gov`, `www.uscis.gov`, ... | P (project agent) |
| factory/agents/*.yaml outputs | `reviews/`, `docs/requirements/`, `rulepacks/`, `evals/`, `security/` | P |
| .claude/lanes/L-*.yaml (all 14) | Duly areas: engine, api, narration, pipeline+watch, web, ops, desktop, content (rulepacks+emails), evals, tests, security, review, audit, factory | P: lanes are the profile. The template ships `founder.yaml` (renamed owner), `L-tests`, `L-review`, `L-audit` as examples. |
| .claude/lanes/L-factory.yaml | Owns `proposals/**`, test is copy lint; the proposal inbox is closed | D |
| tools/factory/drift.py:19, 59-65 | Reviewer lane is `L-review` and writes `reviews/REVIEW.json`, `reviews/drift.md` | C: take the lane and home from the reviewer contract (`lanes[0]`, `home_of`). |
| tools/factory/phase.py:419-421, golden.py:39 | Review file at `reviews/REVIEW.json` | C: same, from the reviewer lane's home. |
| tools/factory/phase.py:84-87, validate.py:37, preflight.py:9 | Plans live at `specs/<name>/plan*.yaml` | P: `paths.plans` (default `specs`). |
| golden.py:63, validate.py:46-53 | Golden tasks at `evals/factory/golden.yaml` | P: `paths.golden` (default `factory/golden.yaml`). |
| evals/factory/golden.yaml:7-52 | All three golden tasks are Duly: `is_weekend` in `engine/dates.py`, `add_months` tests, a planted engine fault | P: the template ships three toy tasks against a stub module; each project writes its own. |
| golden.py:79 | Setup PATH `/usr/bin:/bin:/opt/homebrew/bin` | S (macOS Homebrew) |
| phase.py:96-97 | Every plan must end with the `auditor`, which needs a requirements register | P: `audit.required: true/false`. |
| agent_run.py:9-11, log.py:3, phase.py:12 | Usage examples with `L-engine`, `phase-2` | C (docs only) |

## 5. Stack (python-uv and node-npm), not Duly

| File:line | What it assumes | Dest |
|---|---|---|
| sandbox.py:28 | `~/.npmrc` in secrets list | S (harmless to keep in core) |
| sandbox.py:60-69 `SCRATCH` | `.pytest_cache`, `.ruff_cache`, `.mypy_cache`, `.hypothesis`, `.coverage`, `coverage.xml`, `htmlcov`, `.scratch` | S |
| sandbox.py:72-75 `tool_scratch` | `node_modules/.vite`, `.vite-temp`, `.vitest`, `.cache` | S |
| sandbox.py:91, agent_run.py:451, 940 | `node_modules` skipped | S |
| sandbox.py:199-209 | `UV_*` and `npm_config_*` env | S |
| worktree.py:47-49 | Symlinks the main `node_modules` into each worktree | S |
| agent_run.py:239-240 | Failure lines parsed in pytest and vitest shape | S (parser per adapter) |
| agent_run.py:396 | A Bash call is a "test" if it contains `pytest` or `npm test` | S: `stack.test_markers` |
| phase.py:487-492 `_jailed` | Drops `UV_CACHE_DIR`, `UV_OFFLINE`; writable `~/.cache` | S |
| .claude/hooks/lint_touched.py:19-27 | ruff, ruff format, mypy for `.py`; eslint for `.ts/.tsx` | S: per-extension commands from the adapter list. |
| .claude/hooks/guard_bash.py:18-22 | Install patterns for pip, uv, npm, pnpm, yarn, brew, cargo, go | core (already covers many stacks) |
| preflight.py:35 `TOOL` | One-command missions start with make, uv, npm, npx, pnpm, python, pytest, node, bash, sh | core (extend per adapter) |
| .claude/skills/close-a-lane-iteration/SKILL.md | Generic factory skill, examples are ruff, prettier, `engine/dates.py`, `phase-2` | P for the examples; the skill ships in the template. |

## 6. Gates (tools/gates, Makefile, CI)

| File:line | What it assumes | Dest |
|---|---|---|
| Makefile:27-32 gate-1 | ruff, eslint, prettier over `{web,ops,desktop}`, then `tools.copy_lint.lint` (Duly's forbidden words and long dashes) | S for lint; G for copy lint. |
| Makefile:34-36 gate-2 | mypy, `npm run typecheck` | S |
| Makefile:38-39 gate-3 | diff policy | core |
| Makefile:41-46 gate-4 | gitleaks (core), semgrep with `security/semgrep` (Duly rules, e.g. `duly-time-only-through-clocks`), pip-audit, npm audit | core + G + S |
| Makefile:48-50 gate-5 | pytest with coverage, npm test | S |
| Makefile:52-53 gate-6, tools/gates/diff_coverage.py:10-11, 44-46, 56 | 80 overall, 95 on `engine/*`; lcov from `web` and `ops` required, else fail | G, and C: floors must come from config.yaml:26-27, which already hold 80 and 95 and are read by nothing. Floors per path glob in the profile (`coverage.floors: {"*": 80, "engine/*": 95}`); lcov apps from the profile. |
| diff_coverage.py:16, 49 | Excludes `tools/factory/*` inside the jail | C (keep; path changes if the factory becomes its own package) |
| Makefile:55-60 gate-7 | `tools.factory.validate` (core), `tools.requirements.register check` (G), `tools.gates.engine_literals` (G), `tools.sources.verify rulepacks`, `tools.sources.plain rulepacks` (G) | core + G |
| tools/gates/engine_literals.py:1-58 | Checks `engine/f1.py` for numbers without a source; message names rule packs and `contracts/product_settings.yaml` | G (Duly only) |
| tools/gates/mutation.py:26-38, 129-130, 202-209 | Copies `engine, tests, contracts, rulepacks, api, tools, assistant, pipeline, factory, .claude`; runs `tests/unit/engine` and `tests/holdout`; default targets `engine/verdict.py, dates.py, f1.py, rulepack.py, settings.py` | G: the mutation mechanism is reusable; copy set, test command and targets come from the profile (`mutation.copy`, `mutation.tests`, `mutation.targets`). Floor already in config (`mutation_score_min`). |
| tools/gates/prove.py:63-170 `VIOLATIONS` | Plants Duly faults: `api/extra.py`, `web/src/extra.ts` ("You are eligible"), `lane/L-web`, `BOUNDARY.md` ("Duly may answer anything"), semgrep id `duly-time-only-through-clocks`, `engine/verdict.py` quiet verdict, `web/src/lib/status.ts` | G: the prove harness (scratch copy, one violation per gate, expect string) is core; the violation catalogue is a profile file (`factory/prove.yaml`) the project writes, one per plug-in gate. |
| prove.py:205-206 | Gates are `make gate-N` and gate 6 needs gate 5 first | P: `gates:` list in profile with `run`, `offline: bool`, `needs:`. |
| tools/copy_lint/*, tools/sources/*, tools/requirements/register.py:20-33 | Copy lint, source verification, plain-language check, requirement categories (`engine, legal, workbook, desktop, ...`) | G for the first two; the register mechanism is generic (template-worthy), its categories are P. |
| .github/workflows/ci.yml:33-59 | CI runs `make gate-1..7` | P (generated from the profile's gate list) |
| .github/workflows/tag-main.yml | Tag every main change | core template |

## 7. Makefile targets that are product, not factory

| Makefile:line | Target | Dest |
|---|---|---|
| 1, 7-21 | `COMPOSE`, up, down, logs, seed ("Tables arrive in Phase 1") | P (product Makefile) |
| 23-25 | ops-block-demo, `DULY_OPS_IP_ALLOWLIST` | P |
| 74-78 | e2e, attack ("arrives in Phase 3/10") | P |
| 127-146 | desktop, samples, design-shots (`DULY_SHOTS`), desktop-smoke | P |
| 148-149 | register | G |
| 151-156 | lane: makes `../duly-$(NAME)` on branch `lane/<NAME>/work`; a second worktree scheme beside worktree.py (`<repo>-worktrees/<run_id>`) | D (or rewrite to call worktree.create) |
| 111-113 | factory-test: `tests/unit/tools`, `--include "tools/factory/*"` | C (path moves with the package) |
| 80-125 other | watch, stop, resume, status, doctor, factory-clean, factory-metrics, handled, workflow-tokens, efficiency, golden, drift, weekly, mutation | core: move to `factory/Makefile.inc` that the project Makefile includes. Note `efficiency` (108) is missing from `.PHONY` (4-5) and `samples`/`design-shots` too. |
| CLAUDE.md "make test : gates 1 to 6" | there are 7 gates | P (text fix) |

## 8. Config values that are fine as numbers but not wired

These are not Duly-specific but block a clean template because the file claims "numbers live here, not in code".

| config.yaml:line | Key | Read by | Dest |
|---|---|---|---|
| 26-27 | `gates.diff_coverage_percent`, `gates.engine_diff_coverage_percent` | nothing; diff_coverage.py:10-11 hard-codes 80 and 95 | C; the `engine_` key name is Duly (P: per-path floors) |
| 34-40 | `approval_required` | nothing; phase.py:39-72 hard-codes the globs | C |
| 46 | `network.allow_for_all` | nothing | C (wire into sandbox) or D |
| 8 | `model.health_probe` checked against validate.py:20 constant | validate.py | C |
| phase.py:183, 194, 256 | retry waits `5,20,60`, `CI_REGISTER_SECONDS = 600`, CI poll 15 s | env vars and a constant | C: move to `limits` |

## 9. Dashboard

| File:line | What it assumes | Dest |
|---|---|---|
| dashboard/factory_data.py:28 | Orchestrator lane is called `founder` | C (follows the rename in section 2) |
| factory_data.py:394, 581, 591 | Worktrees at `<repo>-worktrees/`; copies paths.worktrees_dir by design, because the dashboard imports nothing from the repo | core; keep in step with paths.py |
| factory_data.py:156-164 | Imports `tools.factory.config` and `health` through `uv run` in the repo | C: path changes if the factory becomes its own package |
| app.py:39, 55-62 | "The founder writes to Claude"; controls call `uv run python -m tools.factory.control` | C |
| dashboard/clock.py:4 | Docstring mentions engine.clocks | C (text) |
| ui.html:6 and body | Title "Factory"; reads snapshot fields only; review rows show whatever rubric keys arrive | already generic |

## 10. RUNBOOK and checklist

| File:line | What it assumes | Dest |
|---|---|---|
| docs/factory/RUNBOOK.md:3 | Rules in PRINCIPLES.md; audit against the founder's checklist | P |
| RUNBOOK.md:55 | Parked work goes to `specs/product/BACKLOG.md` | P |
| RUNBOOK.md:110-121 | Kinds of work named for Duly: engine, api, screen logic, rule pack, `make samples`, engine/pack/view builders | P (a "work types" table in the profile) |
| RUNBOOK.md:135, 146-147 | "possible engine error", rulepack-drafter, "BOUNDARY rule" | P |
| RUNBOOK.md 1-54, 60-100 | Controls, change procedure, walls table, stop handling, ledger seal, learning rule, memory, weekly/drift | core template text |
| docs/factory/CHECKLIST.md | The founder's checklist audit for Duly | P |

## 11. Tests of the factory

tests/unit/tools/test_agent_run.py, test_phase.py, test_factory_core.py, test_dashboard_data.py, test_preflight.py, test_diff_policy.py, test_factory.py, test_briefing.py use Duly lane names and paths (about 295 hits of `L-engine`, `L-web`, `engine/`, `BOUNDARY`, `web/`, `rulepack` across 3,358 lines). For the template these need a fixture project: a temp repo with a toy profile, two lanes and a stub module. test_copy_lint.py, test_engine_literals.py, test_plain*.py and test_requirements.py test plug-in gates and stay with Duly. (C)

## 12. Already generic (keep as the template core)

| Part | Files | Note |
|---|---|---|
| Event ledger with hash seal, append only | tools/factory/ledger.py | only the clock import |
| Run registry, stop file, one run per lane | registry.py, control.py (stop, resume, status, doctor, clean, metrics, handled, notes, workflow) | only clock import and the word founder |
| Jail for done commands and checks | jail.py | seatbelt on macOS, bubblewrap on Linux; env name only |
| Agent sandbox: secrets list, protected git refs, per-lane write allow, network deny | sandbox.py:20-36, 77-160 | lists in section 4 and 5 aside |
| Worktree per run, commit on the lane branch, skip-worktree hide | worktree.py | identity and node_modules aside |
| Agent runner: prompt, turn/time/token/cost limits, repeated-action and stall stops, report check against git, commit trailers, OpenTelemetry | agent_run.py | the prompt lines in section 3 aside |
| Lean start: 4 tools, empty MCP, no plugins, no slash commands (item 11) | agent_run.py:124-145 | generic to any Claude Code project |
| Health checks tied to a fingerprint of contract, sandbox and runner | health.py | probe paths come from agent yaml |
| Subscription-only billing guard | billing.py | Claude Code, not Duly |
| Budgets per task and per day | budget.py | clock import only |
| Memory from orchestrator-written failures, capped | memory.py | generic |
| Plan runner: rounds, steps, lanes, checks, briefing, local or PR merge, CI wait with gh, approval hold, resume from round, caffeinate | phase.py | paths and approval globs aside |
| Preflight of a plan against the repo | preflight.py | generic regexes |
| Meters: efficiency, weekly sample, drift, golden runner | efficiency.py, weekly.py, drift.py, golden.py | lane and path names aside |
| Redaction, log helper, telemetry export | redact.py, log.py, telemetry.py | service name aside |
| Config validation, agent and report schemas | config.py (bar CITED), validate.py (bar the probe list), contracts/factory_agent.schema.json, factory_report.schema.json | move schemas out of contracts/ |
| Review rule: veto exactly when a finding blocks, blocking needs a citation, scores need a blocking finding | config.py:108-147 | rubric and citation patterns from profile |
| Lane model: implementation, guard, founder kinds; owned globs; implementation lanes cannot own graders | tools/diff_policy/check.py:36-80 | PROTECTED list aside |
| Hooks: path guard, install/push guard, lane test on Stop | .claude/hooks/_lane.py, guard_paths.py, guard_bash.py, lane_test.py, .claude/settings.json | lane_test is a candidate for deletion per FINAL.md item 6 of section 1 (it is already a no-op under a factory run) |
| Factory window | dashboard/app.py, factory_data.py, ui.html | reads only `.factory/` and `~/.claude/projects` |
| Numbers file | factory/config.yaml | structure generic; wire the unread keys |
| Generic agents | builder, reviewer, test-author, auditor (roles minus the addenda in section 3) | project addenda appended from the profile |

## Proposed profile shape (for the template step)

```yaml
# factory/project.yaml
project: {slug: duly, human_role: founder}
paths:
  plans: specs
  golden: evals/factory/golden.yaml
  holdout: tests/holdout
  graders: [tests/**, evals/**, security/**, tools/copy_lint/**, contracts/**]
  governance: [CLAUDE.md, BOUNDARY.md, PRINCIPLES.md, DECISIONS.md]   # guarded, need approval
approval_required:            # replaces phase.NEEDS_FOUNDER
  dependency_added: [pyproject.toml, uv.lock, package.json, package-lock.json, "*/package.json"]
  ...
stack: [python-uv, node-npm]  # adapters: env, caches, lint_touched, failure parser, stdlib hint
prompt: {always_read: [CLAUDE.md, BOUNDARY.md]}
review:
  rubric: [correct, sourced, never_assumes, inside_the_boundary, secure, tested]
  finding_kinds_extra: [wrong_date, wrong_source, id_leak, boundary]
  citation_patterns: ['\bBOUNDARY\b', '\b\d+\s+(?:CFR|C\.F\.R\.|U\.S\.C\.)', '\bINA\b', '§']
  addenda: {reviewer: .claude/agents/addenda/reviewer.md, builder: ..., red-team: ...}
audit: {required: true, register: docs/requirements/register.json}
coverage: {floors: {"*": 80, "engine/*": 95}, lcov_apps: [web, ops]}
gates:                        # plug-ins; core runs them in order, offline ones in the jail
  - {name: lint, run: make gate-1, offline: true}
  - {name: copy-lint, run: uv run python -m tools.copy_lint.lint, offline: true}
  - {name: engine-literals, run: uv run python -m tools.gates.engine_literals, offline: true}
  - {name: sources, run: uv run python -m tools.sources.verify rulepacks, offline: true}
mutation: {copy: [engine, tests, contracts, rulepacks], tests: [tests/unit/engine, tests/holdout], targets: [engine/verdict.py, ...]}
```

## Counts (approximate, by table row)

- Core fixes (C): about 22 items, mostly renames plus 5 unread config keys and 1 hard import.
- Profile (P): 41 items across paths, lanes, agents' addenda, review rubric, golden tasks, docs.
- Plug-in gates (G): 8 (copy lint, engine literals, sources verify, sources plain, requirements register, semgrep rules, mutation targets, prove catalogue).
- Stack adapters (S): 13 items for python-uv and node-npm.
- Delete (D): 5 (skill-curator role and contract, L-factory lane, proposals/ and .claude/LESSONS approval globs, Makefile `lane` target).
