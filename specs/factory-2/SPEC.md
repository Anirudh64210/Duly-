# factory-2: SPEC

Date 2026-09-30. Status: final draft for the founder's approval. Replaces the earlier draft of
this file after an adversarial review against audit-coupling.md, audit-reliability.md,
audit-usability.md (this folder), docs/factory/research/2026-09-30/FINAL.md and the code at
708d04f (FINAL batch 1 built: items 1, 2, 3, 6, 11, 12, 14). "FINAL 7" is a FINAL.md item;
"audit U6" a friction in audit-usability.md; "reliability 4" a section of audit-reliability.md.
Ids E, L, U, G, R, M are this SPEC's; tests name the id they prove. Ids kept from the draft
keep their numbers; cut ids are listed in section 6.

The plain-words page for the founder is SUMMARY.md in this folder.

## 0. Rules for this work

- Remove before adding. Each pillar lists what goes.
- The running factory keeps running. A batch lands between plans on the founder branch, with
  `make factory-test`, `make golden`, `make prove-gates` and health passing. The old path stays
  until the new one has run one real plan.
- Duly's day to day wins over generality. A change made only so the core looks neutral, and that
  costs Duly a step, a rename it must live with, or a broken history, is not made.
- Every target in section 2 is read from `make efficiency` (efficiency.py), a test, or a grep.
  A target nothing records is not a target.
- Numbers live in config.yaml or the profile. Every key there is read by code or deleted.
- Items marked (approval) wait for the founder's yes.

## 1. What gets built

### 1.1 Reliability

Evidence: 61 round stops in 37 hours, every one `unknown` until named by hand; infra and flake
were under 10% of stops but each halted the factory (tamper alerts waited 84 and 76 minutes);
3 identical retries of a sandbox denial; 4 escalations on an empty failure digest; 2 runs with no
end row; Write calls in Write-only lanes succeeded 0 of 9 (reliability 1 to 4).

- R6. Write rule fix (first, it is a live bug). sandbox.py emits `Edit(...)` beside every
  `Write(...)` grant; the health probe asserts the Write tool call succeeded, not only that the
  file exists.
- R3. The failure digest is never empty: it always names the command and its exit code. The
  "same failure twice" rule needs a non-empty digest and two different fixes.
- R1. Classify what a machine can recognise, at the source, before any retry decision. A core
  signature table (in code, extended by the profile's `signatures`) recognises: remote errors
  (the `phase.TRANSIENT` list) as `infra`; sandbox denials (`Operation not permitted`,
  `index.lock`, `mkdtemp`, `sandbox_violations`) as `plan`; budget exhaustion, tamper on a
  non-protected ref, gate tool errors on generated files, CI red with local gates green as
  `factory`; a pass on retry as `flake`; a reaped run as `interrupted`. `flake` and
  `interrupted` join `efficiency.CAUSES`. Everything else stays `unknown` until answered (U6);
  the classifier does not guess plan against spec against code, because those need judgement.
  Each stop row carries `cause`, `cause_source: auto | human` and the signature id.
- R2. Retry by class. `infra`: backoff from `limits` (the existing `_remote`, 5, 20, 60 s).
  Health probes, tamper checks and post-merge checks: retry once; a pass is logged `flake` with
  its signature, and the second flake of one signature raises a `factory` alert. Sandbox,
  budget and `factory` causes: never retried; stop at attempt 1 naming the cause. Health and
  golden use the same path (the l-audit probe at 18:44).
- R4. Resume. At every factory start a reaper writes `interrupted` for runs with no live
  process. `factory resume` with no argument resumes the last parked or interrupted plan. Steps
  are idempotent: lanes whose `Factory-Task` trailer is on the branch are skipped (built),
  checks re-run, a REVIEW.json for the reviewed commit is reused, an open PR is found, the CI
  wait resumes.
- R5. No lost work. Every attempt, failed and escalated included, ends with its changes
  committed to its lane branch (a `wip` commit if needed) before the worktree goes. Cleanup never
  deletes a branch holding commits not on the phase branch. `factory doctor` reports ledger
  commits that are on no branch.

Removed: retries of sandbox denials; escalation on an empty digest; hand recovery after sleep
or a killed runner.

### 1.2 Measurement (needed before any other target can be judged)

efficiency.py records today, per plan directory: list dollars, runs, turns, tokens by class and
by role, reviews, vetoes, stops by cause, wall hours (first run start to last run end), and
veto upheld. These small additions make every section 2 target readable:

- M1. First-review approval per plan: the decision of its first reviews.jsonl row.
- M2. Fix-cycle hours: median time from a VETO review row to the plan's next review row.
- M3. agent_run writes `first_context` and `final_context` (input plus cache read plus cache
  write of the first and last assistant turn) to metrics.jsonl; efficiency reports medians of
  context and of turns per role.
- M4. agent_run counts `large_reads`: Read calls with no offset or limit on a file over 50 KB.
- M5. `_stop` records `stage` (lane, checks, review, ci, merge) and `cause_source`; efficiency
  counts checks-stage stops after every lane passed, and auto against human causes.
- M6. Attempt rows carry the R1 signature; efficiency counts attempts after a sandbox denial,
  escalations on an empty digest, and infra or flake stops that reached a person.
- M7. Health share: dollars of `health-*` runs over all dollars in the window.
- M8. Decision rows (U6) carry `asked_at` and `answered_at` and `via: card | cli`.
- L5. Scorecard: at plan close the runner writes `.factory/scorecards/<plan>.json`, the plan's
  efficiency output plus M1 to M8, each measure with the median of the last three plans beside
  its target. `make efficiency` and the dashboard show it. `make weekly` folds into it; drift
  runs only on a model change, with golden (L6).

Wall hours use efficiency.py's one definition. The brief's 15.7 hours for product-2 used another
start time and cannot be recomputed; by this definition product-2 took 9.7 hours
(audit-ledger 1). B3 replays product-1 and product-2 into scorecards as the baselines.

### 1.3 Efficiency (FINAL batch 2, as approved)

Evidence: product-2 took 13 reviews and 11 vetoes, all 19 vetoes upheld, so faults are found late,
not invented (FINAL section 1, item 4); 13 round-check failures after every lane passed, 7 of them
coverage gates first run after the merge; fix cycles of 1 to 2.4 hours falling to 0.3 when
narrowed by hand (FINAL 5).

- E1. Checks before every review (FINAL 4). A `checks` round with no agent runs before each
  review: the profile's `checks.journeys` against the last approved snapshot with the plan's
  `expected_changes`; every accepted lane commit is an ancestor of the reviewed commit; the
  profile's `checks.leak` (Duly: id leak through labels.ts); the mutation gate on changed files
  when it runs in under 10 minutes, survivors going to test-author before the review; the
  profile's `checks.screens` (Duly: `make design-shots`) run by the orchestrator outside the jail.
  In the same change the reviewer role drops "send all twenty journeys" and "render every
  screen" and reads the check output. Sweep removal and checks ship together (FINAL section 1,
  item 5).
- E2. Fix rounds sized to the finding (FINAL 5). A fix round holds only lanes whose owned paths
  an open blocking finding touches; preflight refuses any other lane. A round may `waive:` a
  disputed test that was ruled on. agent_run merges the lane's kept commit for the same task
  before the agent starts (D8), ending the hand-written "Your work is on lane/..." lines.
- E3. Gates inside each lane's done command (FINAL 7): the profile's offline `gates` on the
  lane's files, diff coverage on the lane's files with the diff computed by the orchestrator,
  web coverage for web lanes, and lint and type check on every changed file. Preflight refuses a
  done command that runs another same-round lane's code and requires shared names to land in a
  contract round first. A words-only change is one lane. No `bash -c` pipes in done commands.
- E5. Agents see failures, not logs (FINAL 9). The stack's failure parser prints failing ids,
  the first assertion of each and a one-line summary; the full log goes to a file whose path is
  printed. Prompt: `grep -n` then at most 80 lines around a match; pytest `-q --tb=short -x`
  while working; no `cd`.
- E6. Agents read only what the mission names (FINAL 10). Missions quote the checklist points
  they name; closed points move to `resolutions-closed.md`; PROGRESS.md is read from its last
  entry; each contract carries its own `reads:`; the always-read list is the profile's
  `prompt.always_read`; Duly builds `tools.rulepack.show <rule-id | stage>` (it does not exist
  yet) and names it in `prompt.readers`.
- E7. The 5 minute cache trial (FINAL 15, approved): one plan, kept only if list dollars and the
  weekly meter per plan fall.
- E8. Preflight warns, does not refuse, when a round has more than 5 agents or two lanes of one
  round share a checklist name without a contract round.

Removed: the reviewer's journey sweep and screen rendering; the full-log retry feedback; CLAUDE.md
in every agent's read list; the Stop hook `.claude/hooks/lane_test.py` and its settings.json
entry, together with the Makefile `lane` target, the only path where the hook still ran (it
already exits for the founder lane and for factory runs).

### 1.4 Usability

Evidence: product-2 used 21 plan files and 1,814 hand-typed YAML lines; only 43 of 133 done
commands were distinct and the same review, audit and reconcile rounds were copied 18 times; 29
stops at about 10 manual steps each; at least 8 stops came from plan errors preflight could have
caught; the loop turns only while a Claude session with a hand-armed watcher is alive; recording
an alert needs a hash the window hides; held lanes stop nothing and later cause a veto (audit U1
to U8).

- U1. The SPEC has one shape. Goal in two sentences, a numbered checklist, out of scope, open
  questions. Each point: `N. [area] what must be true. Proof: <journey | test | check>. Source:
  <citation or ->. Covers: <finding kind or ->.` `area` is a lane name. `factory approve
  <feature>` first checks the shape and refuses a point with no area, no proof, or no source
  where the profile's `review.citation_required_areas` lists the area. The founder-lane Claude
  writes the SPEC, as today; no new agent.
- U2. Approval is one event. `factory approve <feature>` (or the window's Approve button, which
  shows the checklist read-only) writes `approved` with the checklist hash. The runner refuses an
  unapproved or since-changed checklist. The test-author's SPEC gaps (E4) come back as open
  questions; an answer is a checklist edit and a re-approval, not a point in a second file.
- E4. Tests against the checklist (FINAL 8). test-author writes, per point, the test that proves
  it, must-not assertions on journeys the point does not name, and the mutant each test kills,
  and lists SPEC gaps instead of guessing. The final review checks against the checklist; a law
  or boundary error outside it still blocks (FINAL section 1, item 10).
- U3. Standard rounds by name, plan drafted from the checklist. A plan may say
  `- use: tests | integrate | checks | review | audit` and the runner fills mission, done command,
  agent and lanes from the profile; `branch`, `spec` and `merge` default from the feature folder.
  `factory start <feature>` drafts `plan.yaml` when none exists: contract round only when two
  areas share a name, tests, one build lane per area quoting that area's points with the lane's
  test plus E3's gates plus the point tests, integrate when more than one build lane ran, checks,
  review, audit when `audit.required`. The draft is a plain file the founder-lane Claude may edit;
  hand-written plans keep working.
- U4. One plan file per feature. `factory fix <feature>` appends a `fix` round built from open
  blocking findings (E2) to the same plan.yaml and resumes from it. No `plan-fixN` copies, no
  `audited: false`: a fix round ends in `checks` and `review` of the named findings; the full
  audit runs once, before merge to main.
- U5. Preflight dry run. Before launch, preflight runs each done command's collection step in the
  jail (the stack's `collect`: `pytest --collect-only`, `vitest list`), checks every `-k` selector
  and test path matches at least one test, and checks new points against contracts. Fixtures
  recreate the audit U2 errors.
- U6. Decision cards instead of a watcher. A run that needs a person parks: the runner writes one
  `decision` row (what happened, the report or blocking finding, the failure digest, the R1
  cause if any, and choices) and exits. Choices: continue with a note (added to the mission),
  waive a disputed test, approve or drop a held lane, stop. Every answer names a cause and, for a
  veto, upheld yes or no, in the same click; the seal is carried, never typed. Answering, from the
  window or `factory answer`, records `handled` and runs `factory resume`. No long-lived watcher;
  the founder-lane session answers through the same command.
- U7. Held lanes are decision cards, and the review round waits for them (audit U8).
- U8. The window acts. Buttons, each calling one CLI verb: Start (an approved feature), Resume,
  Stop, Approve (checklist, held lane, protected change), Answer (decision card). Views added:
  plan progress (round N of M, lanes, checklist points passing), the open decision card with its
  report, the last review's findings, and the scorecard. The Learning panel goes. The 2 second
  poll reads events.jsonl from its last offset instead of whole.
- U9. Alerts name the action: kind (`veto` and `learning` added, `eval_drop` gone), lane, the
  first blocking finding or digest with ANSI and tool noise stripped, and the verb that answers
  it. Optional phone alerts (approval): the profile's `notifier.command` is run with lane, kind
  and run id only, never product text. Off by default.
- U10. One CLI, `factory`: `init, doctor, approve, start, status, resume, answer, fix, stop,
  learn, efficiency, sync`. Make targets are aliases. `factory start` and `factory resume` commit
  the feature's spec folder and bring the founder branch into the work checkout when those are
  the only changes, and refuse otherwise (audit U9) (approval).
- U11. The RUNBOOK is cut to the loop (write SPEC, approve, start, answer cards, approve merge)
  and the command list. A test fails if it names a command or make target that does not exist.
  The unused "Tell Claude" inbox and the BACKLOG line go.

Removed: plan-per-attempt files; resolutions.md; `audited: false`; the hand-armed watcher; the
note inbox; the 6-alert cap; `make handled ALERT=<seal>` as the normal path (kept as fallback).

### 1.5 Learning

Evidence: 245 lesson proposals never read, none accepted; self-written reflections right 0 of 121
times in the one study that measured it (research-quality 6.1); the only learning that ever
worked here was a lesson turned into code (FINAL 13). Batch 1 started `.factory/findings.jsonl`.

- L1. One record of what went wrong: every reviewer finding (built) and every stop with its cause
  and signature is a row in findings.jsonl. Kinds: the core list (`regression, missing_test,
  missing_negative_test, wording, overbuilt, spec_gap, cross_lane, sandbox, flake, other`) plus
  the profile's `review.finding_kinds_extra` (Duly: `wrong_date, wrong_source, id_leak,
  boundary`).
- L2. Three of a kind becomes a check. At plan close `factory learn` counts rows by kind since
  that kind was last covered and prints each kind at 3 or more with its evidence rows. The
  founder-lane Claude adds a checklist point with `Covers: <kind>` to the next feature (a test,
  journey, gate, hook or preflight rule), which the founder approves with the rest of the
  checklist. When that plan passes, the kind is marked covered by that point. A later row of a
  covered kind raises a `learning` alert: the check missed.
- L4. Prose lessons go (approval, supersedes D44): `.claude/LESSONS/`, `proposals/`, the
  skill-curator role and contract, the L-factory lane, the `proposals/*` and `.claude/LESSONS/*`
  approval globs. Git history keeps them. Nothing an agent writes about itself is stored.
- L3 stays as built in batch 1 (failure memory from check output, 8 items, 3,000 characters).

Removed: proposal inbox, curator, agent-written lessons, weekly curator run, weekly drift run,
Learning panel.

### 1.6 Generality (only what the template needs, and nothing Duly pays for)

Evidence: eleven factory modules import Duly's `engine.clocks`; ten `DULY_*` variables; the legal
domain in the citation regex, review rubric, finding kinds and always-read list; five hard-coded
lists of protected paths; four config keys read by nothing (audit-coupling 1 to 8).

- G1. `factory/project.yaml` (approval to change, like config.yaml). It starts in B4 holding only
  the keys new code reads (`gates`, `checks`, `prompt`, `review`, `audit`, `signatures`) and grows
  in B8 to the audit-coupling "Proposed profile shape": `project` (slug, human_role), `paths`,
  `approval_required` as `{reason: [globs]}`, `stack`, `coverage`, `mutation`, `notifier`.
  Validated by config.py on load; `factory doctor` refuses a profile that fails.
- G2. Derived lists. PROTECTED, GUARDED and NEEDS_FOUNDER come from `paths` and
  `approval_required` plus a fixed core set (`.claude/**, .github/**, factory/**,
  tools/factory/**`). A test proves each derived list equals today's constant for Duly, byte for
  byte, before the constant is deleted. Rubric, citation patterns and finding kinds come from
  `review`; the core default rubric is `correct, tested, secure`.
- G3. Gates as a list: `{name, run, offline}` in order. The core runs them (offline ones in the
  jail, and in E3's done commands). The prove harness takes its violation catalogue from the
  path in `paths.prove` (Duly keeps its catalogue as its own file).
- G4. Two stacks, python-uv and node-npm, as data in `tools/factory/stacks.py`: scratch paths,
  env, lint and type command per extension, test markers, failure parser (E5), collect step (U5),
  standard-library hint. A new stack is a new entry.
- G5. Role files are generic; project addenda from `review.addenda` are appended (reviewer,
  builder, red-team, auditor). rulepack-drafter and eval-curator stay Duly agents.
- G6. Core fixes with no behaviour change: `tools/factory/clock.py` replaces `engine.clocks`;
  `FACTORY_*` env names with `DULY_*` read as aliases; `factory.*` telemetry keys; commit
  identity and compose prefix from `project.slug`; schemas move from `contracts/` to
  `factory/schemas/`; the model trailer from `model.pinned`; probe models, retry waits and CI
  poll times into config.yaml; the four unread keys wired or deleted. The ledger's human lane
  keeps its value, read from `project.human_role` (Duly: `founder`; new projects: `owner`), so
  Duly's history is not split.
- G7. The factory's own dependencies (pyyaml, jsonschema, diff-cover) move into a `factory`
  dependency group of the project's pyproject; `factory init` creates a minimal pyproject in a
  project with none. The venv and every command path stay as they are.

Removed: the `engine.clocks` import from the factory; four of the five path lists; unread keys;
Duly names in core files.

## 2. Targets

Judged on the median of the three plans after the batch that serves them (efficiency after B5,
all after B7). "EFF" is recorded by efficiency.py today; "M1" etc. is the addition that records
it (1.2); "test" runs in `make factory-test`; "grep" is the literal search shown.

| Pillar | Measure | Baseline | Target | Read by |
|---|---|---|---|---|
| Efficiency | Vetoes per plan | 11 (product-2) | at most 3 | EFF |
| Efficiency | First-review approval | 0 of 3 plans | at least 1 of the next 3 | M1 |
| Efficiency | Median hours per fix cycle | 1 to 2.4 | under 0.5 | M2 |
| Efficiency | Checks-stage stops after all lanes passed | 13 per plan | at most 2 | M5 |
| Efficiency | Stops with cause `spec` | 8.5 per plan | at most 3 | EFF |
| Efficiency | Reviewer median turns; tokens per run | 49.5; 5.2 M | under 30; under 3 M | M3 |
| Efficiency | Builder, test-author median final context | 66 k, 71 k | 30% lower | M3 |
| Efficiency | Drafter, reviewer median final context | 122 k, 157 k | under 80 k | M3 |
| Efficiency | Whole-file reads of files over 50 KB | 504 in two days | 0 | M4 |
| Efficiency | List dollars per plan | $150 to $165 | under $105 | EFF |
| Efficiency | Wall hours per feature | 9.7 (product-2) | under 5 | EFF |
| Efficiency | Health share of dollars | 10% | under 2% | M7 |
| Reliability | Stops with a cause once answered | 0 of 29 | 100% | EFF |
| Reliability | Wrong auto causes when the 61 recorded stops are replayed | n/a | 0 | test |
| Reliability | Infra and flake stops that reached a person | 5 of 5 | 0 unless the retry also fails | M6 |
| Reliability | Attempts after a sandbox denial; escalations on an empty digest | up to 3; 4 | 0; 0 | M6 |
| Reliability | Runs with no end row; commits on no branch | 2; not measured | 0; 0 | `factory doctor` |
| Reliability | Write tool success in writing lanes | 0 of 9 | 100% | health probe |
| Reliability | Kill mid-agent, mid-merge, mid-CI-wait, mid-review, then resume: landed lanes rerun | not possible | 0 | test |
| Usability | Plan files per feature | 21 | 1 | `ls specs/<feature>` |
| Usability | Plan lines typed by hand per feature | 1,814 | under 150 | `git log -p` on plan.yaml, factory commits excluded |
| Usability | Stops with cause `plan` | at least 8 per plan | at most 1 | EFF |
| Usability | Decisions answered by card or `factory answer` | 0 | 100% | M8 |
| Usability | RUNBOOK commands that do not exist | at least 2 | 0 | test |
| Learning | Kinds at 3 or more with no covering point within one plan | all | 0 | `factory learn` |
| Learning | Rows of a kind after its check landed | not measured | 0 | `factory learn` |
| Learning | Pending proposals; prose lessons in the tree | 245; 22 | 0; 0 | `ls` |
| Learning | Plans with a scorecard | 0 | 100% | `ls .factory/scorecards` |
| Generality | `grep -riE "duly\|engine\.clocks\|BOUNDARY\|rulepack\|CFR"` in tools/factory, dashboard, core role files | dozens | 0 | grep |
| Generality | Derived path lists equal today's for Duly | n/a | equal | test |
| Generality | Example project: init, doctor, one feature to approval with the fake agent | impossible | passes | test |
| Generality | Config and profile keys read by no code | 4 | 0 | test |

Not a target, because nothing can record it: founder actions per stop (the card makes it one
answer by construction), and the weekly subscription meter (no API; read by hand for E7 only).

## 3. The template

The user wants the finished system saved so it can be copied to other projects. Duly stays the
one place the core is built and fixed; the template is exported from it.

- `factory/core.txt` lists the core files by glob: `tools/factory/`, `dashboard/`,
  `factory/schemas/`, the core role files (builder, test-author, reviewer, auditor), the core
  hooks (path guard, install and push guard, lint on touched), `factory/Makefile.inc`, the
  tag-main workflow. Anything not listed is a project file.
- `make factory-template DEST=<dir>` writes into a separate git repository (location: founder
  decision): the core files; `examples/hello/` (a stub module and tests, two lanes, one gate,
  three golden tasks, one journey, a SPEC in the checklist shape, a commented `project.yaml`);
  a fake agent script (`FACTORY_CLAUDE_BIN` pointing at a script that writes fixed files and a
  REPORT.json); and README.md: the loop, the commands, how to add a lane, a gate, a stack, a
  signature and a role addendum, the scorecard fields, and a threat-model section (assets,
  actors, controls, residual risks, as in the draft's THREAT_MODEL list). It then runs the
  example end to end with the fake agent in DEST and fails if that fails.
- `factory init` in a new repository: copies the core from the template, writes a starter
  `factory/project.yaml`, `factory/config.yaml`, owner and example lanes, `.claude/settings.json`
  and hooks, and the Makefile include; refuses to overwrite an existing profile; then runs
  `factory doctor` and health and prints each failure with the command that fixes it. The
  founder (or a Claude session) then edits the profile and lanes by hand.
- `factory sync <template-dir>` updates a project later: copies the files core.txt lists,
  shows the diff, never touches project files, then runs doctor, `make factory-test` and golden.
- Deliberately not in the template: a hash-locked manifest, an upgrade CI check, config
  migrations, a separate core repository Duly must pull from, CI workflows generated from the
  gate list, a hosted or multi-project dashboard, remote runners, Windows, other stacks, a
  model-written plan generator, automatic merge to main.

## 4. Build order

Effort: S under 2 hours of founder-lane work, M about half a day, L about a day. Each batch lands
between plans, passes its tests plus `make factory-test`, golden, prove-gates and health, then its
live check. B4 and B5 are FINAL's approved order (4 with 5, 7, 9, 10, then one plan).

| Batch | Contents | Effort | Tests | Live check |
|---|---|---|---|---|
| B2 Reliability | R6, R3, R1, R2, R4, R5 | M | Sandbox gives Edit to every writing lane; digest never empty; one test per signature; replay of the 61 stops and 24 escalations gives the founder's cause or `unknown`, never a wrong one; reaper marks a killed fake run; kill mid-attempt leaves a wip commit | Health passes for every lane first try; l-audit probe 5 of 5 |
| B3 Measure | M1 to M8, L5 scorecard, L6 | S | product-2 scorecard matches known totals (11 vetoes, 29 stops, 21 plan files); each M field set on a fake run | Founder reads the product-1 and product-2 scorecards, every field filled |
| B4 Lanes catch their own faults | Profile file started (G1 first keys, G3 gate list), E3, E5, E6 incl. `tools.rulepack.show`, E8, Stop hook and `lane` target removed | M | Preflight refuses the 06:04 L-engine cross-lane done command; coverage gate runs in a lane; digest parser per stack | Held for B5's plan |
| B5 Checks before review | E1 with the sweep removal, E2 (D8, `waive:`, lane rule) | M | Checks catch a planted regression, a non-ancestor commit and an id leak; fix round refuses an untouched lane; kept commit merged before start | One real plan: every efficiency target read from its scorecard |
| B6 Checklist and plans | U1, U2, E4, U3, U4, U5, U10 | L | Shape parser refuses malformed points; draft plan for product-2's checklist has its lanes and rounds minus copies; dry run catches the audit U2 selector and path errors; hand plans still run | One feature from checklist to review with one plan file; hand-typed lines counted |
| B7 Decisions and window | U6, U7, U8, U9, U11 | M | Each button calls its verb; answering records handled with cause and resumes; RUNBOOK command test | One feature where every stop is answered by card |
| B8 Learning and trial | L1 stop rows, L2, L4 (approval), E7 | S | Three planted findings of one kind are listed; a covering point marks the kind; a recurrence alerts | Three plans compared on the scorecard against every target |
| B9 Template | G1 full profile, G2, G4, G5, G6, G7, core.txt, `factory-template`, `init`, `sync`, example, README | L | Derived lists equal today's; grep target; old env names still work; example end to end with the fake agent; init on an empty repo | Duly runs one feature after B9 with no visible change; the template repository exists and its example passes |

Why this order: B2 is small and ends the stops that need nobody. B3 makes every later batch
measurable. B4 and B5 are the approved efficiency list and the largest payoff. B6 and B7 remove
the hand work around each stop, and need B2's causes and B5's fix rounds. B8 needs findings from
real plans. B9 extracts only what by then has run on real plans, and waits so the renames land
once.

## 5. Deliberately left out

- A capability eval of 20 to 50 tasks run three times (FINAL L1): 70 to 400 M tokens per change.
- Effort tiering and a per-role model map (FINAL section 1, item 7); the pin is the founder's.
- The pack mutator, the pack split per stage (only if E6 misses), ablations, a judge panel,
  `--resume` on retry, a longer cache TTL.
- Builder-side filtering of reviewer findings: a wrong reading of the law must still block.
- The pipefail refusal of agent commands (the jail already runs `bash -o pipefail -c`).
- Lesson clustering or any store of agent-written lessons.

## 6. What this review cut from the draft, and why

| Draft item | Decision | Reason |
|---|---|---|
| Separate core repository, hash manifest, `upgrade --check` in CI, `--propose`, migrations | Cut; Duly stays the source, template exported (section 3) | Overbuilt for one founder; a CI lock would block urgent fixes in Duly |
| Refuse hand-written plans after B6 (draft decision 3) | Cut | Removes the fallback when the draft plan is wrong; usability cost |
| Full plan generator, `factory plan`, 9 templates | Reduced to named standard rounds plus a draft plan the Claude session may edit (U3) | FINAL 5 said no generator; unproven that generated build missions are good enough |
| Read-only spec-writer agent (U1) | Cut | The founder-lane Claude writes SPECs today; a parser is enough |
| Editing checklist points in the window (U2) | Cut; window shows and approves only | Editing belongs in the file |
| Proposal cards with suggested form and draft done command (L2) | Cut; `factory learn` lists, the checklist carries `Covers:` | FINAL 13 is S; a guessed form is unproven |
| `memory` renamed `failures` (L3) | Cut | Churn with no gain |
| Scorecard fields "caught by check against caught by review", "honest escalations" | Cut | Nothing can record them reliably |
| Auto-classifying plan, spec, cross-lane and code causes; 85% agreement target | Cut to machine-recognisable causes; target is 0 wrong | Those causes need judgement; a wrong auto cause misleads learning |
| Founder actions per stop at most 2; minutes to approve | Dropped as targets | Not recordable; M8 records the decision times |
| "founder" renamed `owner` in the ledger and code | Cut; the value comes from `project.human_role` | Splits Duly's history and breaks efficiency.py and the dashboard filters |
| Factory tests moved to a fixture project; 0 Duly names in them | Cut; one example-project test added | About 3,400 lines rewritten for no Duly benefit |
| Own pyproject and `uv run --project tools/factory` (G7) | Reduced to a dependency group | Changes every command path in the running factory |
| CI workflow generated from the gate list; prove catalogue moved to `factory/prove.yaml` | Cut; catalogue path from the profile | Duly's CI works; one project does not need generation |
| Dashboard snapshot writer on each event | Reduced to reading the ledger from its last offset | Same saving, no new state file |
| Rerun-lane button, earlier runs per lane view | Deferred | Not in the audits' top frictions |
| Generated RUNBOOK | Reduced to a short RUNBOOK and a test that its commands exist | Same guarantee, less machinery |
| `factory new`, `plan`, `spec check`, `health`, `score`, `upgrade` verbs | Folded into `approve`, `start`, `efficiency`, `sync` | Twelve verbs cover the loop |
| Wall hours "SPEC approved to final approval", baseline 15.7 | Replaced by efficiency.py's definition, baseline 9.7 | The draft's definition is not recorded anywhere |
| Generality batch before efficiency (draft B4) | Moved to last (B9); only the profile keys new code needs come early | Renames across 11 modules are risk with no payoff until a second project exists |
| Separate THREAT_MODEL.md, interactive `init` questions | Folded into README; `init` writes starter files | Less to maintain |
