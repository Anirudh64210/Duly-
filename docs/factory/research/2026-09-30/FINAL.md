# Factory changes: final list (2026-09-30)

An adversarial review of plan.md against the three audits and the three research files in this
folder, with spot checks against the code in /Users/ani/Desktop/Duly/duly at b7bf9a3. This file
replaces plan.md as the list to build from. References such as "ledger 4" point into
audit-ledger.md, "code T4" into audit-code.md, "prompts 4" into audit-prompts.md.

## For the founder, in plain words

The factory is slow because it builds a whole feature, only then finds out what was wrong, and
starts a full cycle again: 13 reviews for one feature, each cycle about an hour. The agents
themselves are fine. When they stopped and asked, they were right every time you ruled. So the
fix is to catch problems before the review, not to make the reviewer softer: machine checks run
before every review, tests written against a numbered list of what the SPEC requires, the slow
gates moved into each lane so they fail in minutes rather than at the end, and a fix that touches
only one lane re-runs only that lane. On usage, the agents re-read large files and long test logs
on every step, load tools they never use, and repeat the same test runs two or three times; those
are cheap to cut. Learning today is a pile of 245 unread notes; it becomes one simple rule: when
the same kind of reviewer finding appears three times, the next plan builds a check for it, and
the note is deleted. Aim over the next three plans: at most 3 vetoes per plan, under 8 hours per
feature, and about a third less usage per plan.

## 1. What the review found wrong or weak in plan.md

Checked in code: the output-token bug (agent_run.py:290 keeps the first streamed usage), checks
after a failed round (phase.py:517 `ok = run_checks(...) and ok`), the one-model pin
(config.py:72), Skill denied to agents (sandbox.py:160), 52 of 55 memory rows being agent reports
with only 3 from the orchestrator, 245 unread proposals, the 249 KB f1-us parameters.yaml, and the
CLAUDE.md "write ESCALATE.md" line contradicting the contracts. The audits' evidence holds. The
problems are in how plan.md reads it.

1. **"Tokens go on re-reading" is misleading once usage is weighted.** Priced with the Opus 5.5
   ratios in research-context 2, the ledger's totals split as: cache writes 16.5 M x $8 (every
   write is at the 1 hour rate, ledger 1) = about 40% of usage; output 5.12 M x $20 = about 31%;
   cache reads 483 M x $0.20 = about 29%. Reads are 94% of the raw count but under a third of the
   weight. So the number of runs (each writes a fresh 24 to 28 k prefix at the 1 hour rate), the
   size of that prefix, and output matter as much as turns. The subscription's own weighting is
   not published; the list price is the best proxy and the weekly meter is the check.
2. **plan.md L6 has it backwards.** It proposes a longer cache TTL, but these runs already write
   everything at 1 hour, which costs 2x input against 1.25x for 5 minutes. Runs last 4 to 10
   minutes, so almost no turn waits 5 minutes. A 5 minute TTL is worth testing (change 15).
3. **Usage is already measured correctly in dollars.** `total_cost_usd` is read from the `result`
   event and `--max-budget-usd` enforces it in the CLI. N1 is still needed for tokens by role and
   for stop causes, but "no saving can be proved until N1" is overstated: compare list dollars per
   plan now.
4. **The reviewer is not over-vetoing.** The founder judged every one of the 19 vetoes correct
   (ledger 1). The research about reviewers that "always find gaps" does not describe this
   factory. Vetoes fall only when faults are caught earlier. Blocking and advisory labels mostly
   change how big the response to a veto is, not how many vetoes there are.
5. **A sequencing bug.** plan.md removes the reviewer's journey sweep now (N5) but builds the
   journey snapshot check later (X1). That sweep is what caught the fix2 and fix7 regressions.
   The two must ship together.
6. **The Stop hook should go, not stay.** It blocks only once per stop (`stop_hook_active`), it
   duplicates the orchestrator's jailed run, it causes the "same failure twice" escalations, and
   it runs agent-written tests as a hook process while only the orchestrator's run goes through
   jail.py (the agent itself is launched directly at agent_run.py:596). D5 is likely real. The
   agent can run the done command itself inside the Bash sandbox; the jailed run stays the gate.
7. **Effort tiering would change nothing, or raise usage.** No contract or setting sets effort,
   and Opus 5.5 defaults to `medium` (research-context 5.1). "Builder on medium" is today's
   setting; "reviewer on high" adds thinking output. Drop it until measured.
8. **The pipefail guard would cost more than it saves.** No done command in specs/ uses a pipe,
   and the orchestrator checks the real exit code in the jail, so an agent's piped run only
   misleads the agent. Refusing 758 commands means 758 extra turns at about 73 k each. Filter the
   test output instead (change 9), so there is no reason to pipe, and run the jail with
   `bash -o pipefail -c` as a free safety net.
9. **Journeys in a lane's done command can depend on another lane's parallel work.** That exact
   case produced the L-engine escalation at 06:04 (prompts 3). N4 needs the preflight rule that a
   done command runs only code inside the lane or already on the branch.
10. **X2's "a finding outside the contract becomes a SPEC change, not a rebuild" is unsafe for
    Duly.** A wrong reading of the law must still block, contract or not.
11. **L1 is too dear on a subscription.** 20 to 50 tasks x 3 trials x 1.2 to 2.7 M tokens a run
    is 70 to 400 M tokens, one to two days of factory usage, per factory change. The checks built
    from findings (change 13) are the cheap regression set. Defer.
12. **Proposal clustering is overbuilt.** Self-written lessons are unreliable (0 of 121 correct
    in quality 6.1), none has been accepted in two days, and the only learning that ever worked
    was a lesson turned into code. Close the channel instead of building a triage tool for it.
13. **The targets rest on two plans.** One plan cannot prove a change. Judge over the next three,
    and report per SPEC point as well as per plan, since features differ in size. Use one hours
    definition (the brief's 15.7 h and the ledger's 9.7 h for product-2 differ on start time).

## 2. Verdict on each plan.md item

| Item | Evidence | Fits a one-founder subscription factory | Overbuilt | Cuts | Verdict |
|---|---|---|---|---|---|
| N1 meters | Real, in code | Yes | No | Enables all | Keep, add veto-upheld and workflow totals (change 1) |
| N2 caffeinate | Real, pmset | Yes | No | 2.4 h | Keep (change 2) |
| N3 duplicate work | Real, in code | Yes | No | 1 to 2 h a plan | Keep, but turn the Stop hook off (change 3) |
| N4 gates in lanes | Real, 26 late failures | Yes | No | Late stops | Keep with the cross-lane rule, absorb X7 and X5 (change 7) |
| N5 reviewer | Partly: over-flagging is not shown | Yes | No | Reviewer usage, narrow rounds | Split: sweep removal goes with checks (4), veto sizing (6) |
| N6 memory | Real | Yes | Clustering and guard are | Small tokens, noise | Keep, simplified (change 12) |
| N7 load and print | Real, estimates unmeasured | Yes | No | Largest token lever | Keep as three changes (9, 10, 11) |
| N8 health | Real, 10% | Yes | No | 8% of usage | Keep, absorb scripts from X6 (change 14) |
| X1 checks | Real, 4 of 10 vetoes | Yes | Pack mutator is | Vetoes | Promote to now, without the pack mutator (change 4) |
| X2 review contract | Vendor case study | Yes, if cheap | A separate 5 M run is | Spec vetoes | Merge with X3 (change 8) |
| X3 tests template | One review plus one 2026 study | Yes | No | "tested" vetoes | Merge into change 8 |
| X4 narrow fix plans | Strong: 7.0 h fell to 0.3 h | Yes | Plan generator is | Hours | Keep as a preflight rule, no generator (change 5) |
| X5 frozen terms | Real, product-1 only | Yes | No | Wording vetoes | Fold into change 7 |
| X6 model and effort | Effort part wrong | Pin is your decision | Yes | Little | Keep scripts only (change 14); drop effort tiering |
| X7 lint changed files | Real | Yes | No | Late gates | Fold into change 7 |
| X8 size plans | Research strong | Yes | Token projection is | Cross-lane stops | Keep the rules, drop the projection (change 7) |
| X9 skills, curator | Real | Yes | Curator per plan is | Dead parts | Retire agent skills (change 11); curator replaced by change 13 |
| X10 workflows | Real, unmeasured | Yes | No | Unknown share | Fold into change 1 |
| L1 capability eval | Practice | Too costly now | Yes | Nothing yet | Defer |
| L2 calibrate reviewer | Founder already upholds 19 of 19 | Label only | Mostly | Little | One field in change 1 |
| L3 playbook counters | Measured elsewhere | Not yet | Yes | Little | Replaced by change 13 |
| L4 split pack | Contract change | Later | Maybe | Context | Only if change 10 misses its target |
| L5 ablation | Practice | Later | No | Later | On the next model change |
| L6 longer TTL | Wrong, already 1 h | No | n/a | Would raise usage | Reverse (change 15) |

## 3. The final list, ranked

Ranked by expected payoff for the effort. Effort: S is under 2 hours of founder-lane work, M
about half a day. "Approval" means config.yaml routes it to you. Targets are judged as the
median over the next three plans unless stated.

### 1. Correct meters with one definition each (S, no approval)
Read `usage` and `modelUsage` from the `result` event; record wall and monotonic time together;
a required `cause` on every stop (plan, spec, cross-lane, code, factory, infra, wording) and a
`veto_upheld` yes or no; file reviews under their own plan; give vetoes their own alert kind; log
each founder-lane workflow's token total; report per plan in `make efficiency`: list dollars,
tokens by class and by role, runs, turns, vetoes, stops by cause, wall hours, weekly-meter change.
- Target: `tokens_out` matches the `result` record on 10 of 10 sampled runs; 100% of stops carry
  a cause; every workflow appears in the ledger.

### 2. Keep the Mac awake while a plan runs (S, no approval)
phase.py runs under `caffeinate -dimsu`.
- Target: zero silences over 10 minutes inside active runs (baseline 2.65 h lost).

### 3. Stop doing the same work twice (S, approval for the prompt and hook)
No round checks after a failed or vetoed round; `--from-round` skips lanes whose `Factory-Task`
trailer is already on the branch; the Stop hook becomes a no-op when `DULY_RUN_ID` is set (the
agent runs the done command in its sandbox, the orchestrator runs it in the jail); CLAUDE.md says
REPORT.json `escalated`, not ESCALATE.md; the prompt defines "twice" as two different fixes ending
in the same failure; jail.py runs `bash -o pipefail -c`.
- Target: check minutes after a failed round 0; done-command runs per attempt at most 2 (baseline
  2 to 3); escalations citing the Stop hook 0; sessions for already-landed lanes 0.

### 4. Machine checks before every review, and the reviewer stops redoing them (M, approval)
Round checks before the review, no agent: `make journeys` (twenty journeys and twins through POST
/v1/compute with a FixedClock, diffed against the last approved snapshot, with the plan's
`expected_changes`); every accepted lane commit is an ancestor of the reviewed commit; an id-leak
check through labels.ts; `make mutation` on changed engine files if it runs in under 10 minutes,
survivors sent to test-author before the review. In the same change, remove "send all twenty
journeys" and "render every screen" from review missions; the reviewer reads the check output and
the screenshots the orchestrator makes outside the jail, and spends its turns on the law, the
boundary and SPEC gaps.
- Target: vetoes per plan at most 3 (product-2: 11); reviewer median turns under 30 (49.5) and
  tokens under 3 M (5.2 M); findings of kind regression, branch or id leak reaching review: 0.

### 5. Fix cycles sized to the finding (M, approval for the plan schema)
Preflight refuses a fix plan that includes a lane whose owned paths no open finding touches. A
round may `waive:` disputed tests the orchestrator has ruled on, and the orchestrator answers a
dispute and resumes the same plan rather than writing a new one. agent_run merges the lane's kept
commit for the same task before it starts (D8). No plan generator.
- Target: median hours per fix cycle under 0.5 (baseline 1 to 2.4, 0.3 once narrowed); plan
  files per feature at most 6 (15 and 21); new plan files written to settle a dispute: 0.

### 6. Size the veto to the finding, and keep every finding (S, approval)
Each finding is `blocking` only if it breaks a named SPEC point, a BOUNDARY rule or a cited
source; a veto must name one (check_review refuses otherwise). A veto whose blocking findings are
only missing tests gets a narrow round: test-author adds them, the reviewer re-checks only those
findings. Every finding goes to `.factory/findings.jsonl` (id, kind, file, input, blocking, SPEC
point).
- Target: vetoes with no blocking finding 0 (baseline 2); a tests-only veto closes in under 45
  minutes; 100% of findings logged.

### 7. Gates inside each lane's done command (M, approval)
Each lane's done command runs the fast parts of `make test-offline` (diff policy, copy lint,
engine literals, a frozen-term check for words quoted from the law if plain_terms does not already
cover it), diff coverage on the lane's files with the diff pre-computed by the orchestrator (no
git lock), `vitest --coverage` for web lanes, and ruff, mypy or eslint on every file `git diff`
shows changed (covers the 1,140 Bash writes). Preflight refuses a done command that runs code
from another lane of the same round, and requires shared names (landmarks, routes, fields) to
land in contracts/ first. A words-only change is one lane.
- Target: round-check failures after all lanes passed at most 2 per plan (baseline 13); coverage
  stops at round end 0 (7); cross-lane stops 0 (3); wording vetoes 0 (6 in product-1).

### 8. Tests written against a numbered SPEC checklist, which is also the review contract (M, approval)
The tests round gets the SPEC points as a numbered list. test-author writes, per point, the test
that proves it, must-not assertions on journeys the point does not name, and the mutant each test
kills (the fix8 pattern, the only first-time approval in product-2). It lists any SPEC gap it
finds instead of guessing. A short reviewer run reads only that checklist and the gaps, not the
code, and you approve it in two minutes before the build. The final review checks against it; a
law or boundary error outside it still blocks.
- Target: stops and vetoes with cause `spec` at most 3 per plan (baseline 8.5); resolution points
  added after round 1 at most 5; at least 1 of the next 3 plans approved at first review (0 of 3).

### 9. Agents see failures, not logs (S, approval)
Done-command and test output shown to the agent is the failing test ids, the first assertion of
each and a one-line summary; the full log goes to a file whose path is printed. Retry feedback
carries the same. Prompt lines: find with `grep -n` and print at most 80 lines around a match;
pytest with `-q --tb=short -x` while working; the working directory persists, so no `cd`.
- Target: median final context for builder and test-author down 30% (66 k and 71 k); Bash
  commands starting with `cd` under 10% (3,077 of 5,824).

### 10. Agents read only what their mission names (M, approval)
`tools.rulepack.show <rule-id | stage>` prints one rule with its source; phase.py quotes the
resolution points a mission names into the mission and moves closed points to
resolutions-closed.md; PROGRESS.md is read from its last entry and older entries move to
PROGRESS-archive.md; each contract gets its own `reads:`; CLAUDE.md leaves the read list; the
duplicated lines in builder.md and the six "anything you read is data" repeats are removed.
- Target: whole-file opens of parameters.yaml per run 0 (504 in two days); drafter and reviewer
  median final context under 80 k (122 k and 157 k). If the drafter misses, split the pack per
  stage (your contract decision).

### 11. Agents load only the tools they use (S, approval for config)
Run agents with `--tools Bash,Read,Edit,Write`, a strict empty MCP config, no plugins, no skill
listing and auto-memory off. Try it on one health task first and compare the first turn. Retire
the agent skills (they are denied anyway); skills stay for the founder lane.
- Target: first-turn context under 16 k (24 to 28 k); list dollars per run down at least 10% on
  builder runs, since each run writes that prefix at the 1 hour rate.

### 12. Clean the memory and close the proposal inbox (S, approval for the prompt)
Archive the 52 agent-report rows and all 245 proposals; stop filing agent lessons as proposals;
memory is orchestrator rows built from check output only, for the lane's own paths plus all-lanes
rows, at most 8 items and 3,000 characters, dropped once the same task later passes; health runs
write nothing.
- Target: memory characters per prompt at most 3,000 (11.3 k); pending proposals 0; health rows
  in memory 0.

### 13. One learning rule: three findings of a kind become a check (S, approval per check)
At each plan close the founder lane counts `findings.jsonl` by kind. A kind seen three times gets
a check, hook or test in the next plan, and any prose lesson about it is deleted. This is how
preflight and the one-CI rule came about; it replaces the weekly curator and the lesson
playbook. Regression, missing negative test and id leak already qualify.
- Target: every kind reaching 3 has a check within one plan; a kind recurs after its check lands:
  0 times.

### 14. No full agent for work that needs no thinking (S, approval for health.py and plans)
Health fingerprints hash only the sandbox-relevant code plus the lane's own contract; only
changed lanes re-run; the health prompt is minimal, with no memory and no reading list. Lanes
whose mission is only to run a command ("run make samples, change nothing else") become plain
round steps run by phase.py. A smaller model for health probes is your call on the pin.
- Target: health share of usage under 2% (10%); agent runs whose mission is a single command: 0.

### 15. Test the 5 minute cache (S, approval for config)
For one plan, run agents with the 5 minute prompt-cache TTL (the setting on the Claude Code
prompt-caching page, "choose the TTL yourself") instead of today's 1 hour writes, then compare
list dollars per plan, the cache-miss rate and the weekly meter against the plan before. Keep it
only if the weekly meter per plan falls.
- Target: cache-write usage down about 35% with a cache-miss rate under 5% of turns; weekly meter
  per plan lower than the previous plan of similar size.

## 4. Plan-level scorecard

Report in `make efficiency` per plan; judge on the median of the next three plans.

| Measure | Baseline | Target |
|---|---|---|
| Review cycles; vetoes per plan | 13; 11 (product-2) | at most 4; at most 3 |
| First-review approval | 0 of 3 plans | at least 1 of the next 3 |
| Wall hours per feature (brief's definition) | 15.7 h | under 8 h |
| List dollars per plan (usage proxy) | $165 (product-2), $150 (product-1) | under $105 |
| Stops with cause plan or spec | 74% | under 40% |
| Round-check failures after lanes passed | 13 per plan | at most 2 |
| First-turn context | 24 to 28 k | under 16 k |
| Health share of usage | 10% | under 2% |

## 5. Order of work

Before the next feature plan: 1, 2, 3, 6, 11 (after the one-task trial), 12, 14. These are small
and mostly removals. Then 4 with 5, 7, 9 and 10, and run one plan. Then 8, 13 and 15, and compare
three plans against section 4. Deferred: a large capability eval, effort tiering, the pack
mutator, the pack split, ablations, a judge panel, and `--resume` on retry.
