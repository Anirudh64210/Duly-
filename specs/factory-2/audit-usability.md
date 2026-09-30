# Audit: how the factory is driven today (usability)

Date 2026-09-30. Code read at duly `afc458c` (batch 1 of FINAL.md merged: items 1, 2, 3, 6, 11,
12, 14). Evidence: `duly/specs/product-2/plan*.yaml` (21 files), `duly/.factory/events.jsonl`
(9,078 lines, 2026-09-29 05:48 to 2026-09-30 18:49 UTC), `duly/docs/factory/RUNBOOK.md`,
`tools/factory/{phase,preflight,control,alerts}.py`, `dashboard/{app.py,factory_data.py,ui.html}`,
and `git log` of `specs/product-2/`. Times below are UTC unless marked local (-0700).

## 1. The loop, end to end

Who does what: the founder decides direction and approves protected changes. Claude, in a
long-running main session, acts for the founder on everything else: it writes the SPEC and
resolutions, writes every plan, launches, watches, rules on escalations and vetoes, records how
each alert was handled, and reports. The factory never drives itself between two plans.

| Stage | What is done today | By hand? | Where |
|---|---|---|---|
| 0. Set up | Two checkouts: `duly-founder` (branch `founder`, Claude's edits) and `duly` (branch `work/<phase>`, where agents start). `make watch` opens the window. A background watcher on `.factory/events.jsonl` alerts is armed, and re-armed after every fire (memory: duly-factory-feedback). | yes, 3 steps | memory, Makefile `watch` |
| 1. SPEC and resolutions | SPEC.md written by Claude; after each review or escalation a numbered point is appended to `resolutions.md` (product-2: points 1 to 26 plus 23a, 24a, 22b, 140 lines; points 15 to 18 each "from the review of fix N"). No template; product-1 names it `SPEC-resolutions.md`, product-2 `resolutions.md`. | yes | `specs/<phase>/` |
| 2. Plan YAML | Written by hand per attempt: branch, spec, merge, goal, rounds, lanes, agent, mission prose, done command in `bash -c '...'`, checks, audit round. A fix is a new file (`plan-fixN.yaml`, `plan-fixNb`...), usually a copy of the last with edits. | yes | `specs/<phase>/plan*.yaml` |
| 3. Commit and bring over | Commit explicit paths in `duly-founder`, merge `founder` into `work/<phase>` in `duly` "only between runs"; `phase.py` refuses a dirty tree ("commit or put away your changes first") and a wrong checkout ("check out X first"). | yes, 2 to 3 steps | phase.py:719-730 |
| 4. Preflight | Runs inside `phase.py` before launch (phase.py:733) and alone via `python -m tools.factory.preflight`. It checks lane ownership, done-command inputs, points named, branches named, goal present. It does not run a done command, so a done command that cannot pass is found only by running the round. | automatic, but refusal means back to 2 | preflight.py |
| 5. Launch | `uv run python -m tools.factory.phase specs/<phase>/plan-fixN.yaml` (no make target), in the background of the Claude session; re-execs under `caffeinate`. | yes | RUNBOOK "Every day" |
| 6. Watch | Factory window (polls every 2 s), `make status`, the background watcher, reading `.factory/L-*.log` and `runs/<id>/stream.jsonl`. | passive, plus manual reads | dashboard, control.py |
| 7. Alerts | macOS banner, 180 characters, title "Factory: <kind>" (alerts.py). The same line goes to the ledger. Nothing reaches a phone. | read by the watcher or a person at the Mac | alerts.py |
| 8. Escalation or veto | Read REPORT.json or `reviews/<phase>-fixN.md`, decide the cause (plan, spec, cross-lane, code, factory), write a resolution point, write a new plan or edit the old, commit, bring over. | yes, the whole diagnosis | section 2 |
| 9. Resume | `--from-round <name>` on the same plan, or launch a new plan file. A lane's kept work is carried by writing "Your work is on lane/L-x/l-x-<id>; bring it in (git merge ...)" into the mission by hand (12 of 133 product-2 lanes). | yes | phase.py:759 |
| 10. Record | `make handled ALERT=<seal> CAUSE=<cause> NOTE="..." [UPHELD=yes|no]`. The seal is the ledger hash; it must be looked up in events.jsonl, since the window does not show it. | yes, per alert | control.py:handled |
| 11. Held lanes | A lane touching a dependency, CI, a guardrail or a prompt is held on its branch ("waiting for the founder"), and the plan goes on without it. Approval is a hand merge or a new plan that brings the branch in. | yes | phase.py:305-317 |
| 12. Merge and milestone | Each round lands on the phase branch through a PR and clean CI (automatic). Merging the phase branch into `main` is "the founder's step". Before telling the founder: rebuild (`make up`), render every screen (`make design-shots`, outside the sandbox), check live, push a notification and a test guide (memory: duly-founder-testing). | yes, 5+ steps | phase.py:777-781 |

### Manual steps, counted

- Per plan launch, clean path: stages 2, 3 (x2 to 3), 5 = about 5 manual steps, plus stage 0 once.
- Per stop (escalation or veto): notice, read the report or review, diagnose, write a resolution
  point, write or copy a plan, commit, bring over to the work checkout, relaunch, record `handled`,
  tell the founder = **10 manual steps**.
- product-2 (plan.yaml at 04:33 to the ui-1 veto at 14:21): **29 round stops** (10 review vetoes,
  14 escalations, 5 check failures), 2 held lanes, **21 plan files, 1,814 lines of YAML**,
  **28 commits to specs/product-2 in 8.5 hours** (21:33 to 06:00 local), **24 `handled`
  records**. At 10 steps per stop that is about 290 manual steps, plus 21 plan launches, for one
  feature. `make efficiency` shows 31 stops overall and 0.4 h from stop to restart: the hand-off
  is fast because Claude does it, so the cost is not waiting on a person, it is the count of
  cycles and the fact that every one needs a live Claude session.

## 2. Frictions, with evidence

**U1. A fix is a new hand-written plan file, mostly copied.** 21 plan files for one feature
(product-1: 14). Of 133 lanes, only 43 distinct done commands; the same reconcile done command
appears 18 times, the same audit done command 18 times, the review done command pattern 18 times,
the checks `make test-offline BASE=product-2` 18 times and `pytest tests/holdout` 19 times. Every
file repeats `branch`, `spec`, `merge`. Round names repeat: reconcile 18, review 18, audit 18,
integrate 11. There is no include, default, or "rerun last plan with these lanes" form.

**U2. Hand-written plans are the largest single source of stops.** Of the 22 product-2 `handled`
notes, at least 8 name a founder-lane plan or spec error: "my done commands wrote git's index in
the jail and passed --coverage twice" (05:38), "its done command needed the api lane's parallel
work" (06:21), "Tests and pack written in parallel disagreed on ids" (06:31), "petition belonging
test wrong (mine)" (09:43), "Cross-lane dependency (mine)" (11:42), "my path error" (12:20),
"My point 24 conflicted with the pack contract ... My test selector wrong" (12:32), "regression
from my point 22" (13:00). Preflight caught none of these: it does not run a done command on the
branch as it stands, check a `-k` selector, or check a new point against contracts.

**U3. The fix cycle is re-planned from zero, not continued.** fix1 alone became plan-fix1,
1b, 1c, 1d, 1e, 1f, 1g, 1h, 1i: nine files and 13 stops between 05:52 and 08:16 before its one
review. Each letter file's header says why ("an integration round after the parallel lanes",
"the last seven journey tests", "trips are counted by their own dates"). The engine lane
escalated 4 times in that window on the same integration round. A plan cannot be amended in
place and resumed; the only resume is `--from-round` on an unchanged file.

**U4. Carrying kept work is manual prose.** 12 missions start "Your work is on
lane/L-tests/l-tests-8a15fee5f8; bring it in (git merge ...)" (plan-fix1i, 7b, 7c). The branch id
is copied from the ledger by hand. FINAL.md item 5 (D8: agent_run merges the kept commit itself)
is not built yet.

**U5. Every plan must end in review and audit, even a one-lane fix.** phase.py:97 refuses a plan
with no audit round unless `audited: false`, which plan-fix1h and 1i use with the comment
"plan-fix1g's review and audit follow". So narrow fixes either carry two extra rounds or a flag
that points at another file.

**U6. Escalation and veto handling is entirely in the Claude session.** The loop only turns while
a Claude session is alive with its watcher armed. The watcher is re-armed by hand after every
fire. Memory records the founder once had to point out an L-api escalation themselves. The last
product-2-era alerts (ui-1 veto at 14:21) got a `handled` note but no restart; at 18:44 an
auditor health probe escalated with the message "the same failure twice: the done command
fails:" and no tail, and it is still the one open alert.

**U7. Recording an alert needs a hash nobody is shown.** `make handled ALERT=<seal>` takes the
ledger `hash`; `snapshot_json` sends alerts to the window without it (factory_data.py:868-876),
so the seal is found by grepping events.jsonl. Before batch 1, cause and "veto upheld" were free
prose: `make efficiency` over product-2 still reports "veto_upheld yes 0, no 0" and "stops: 0"
for the plan although the notes say "Veto correct" and there were 29 stops.

**U8. Held lanes stop nothing, then cause a veto.** A dependency change holds the lane and "the
plan goes on" (phase.py:311). In product-2 L-web was held twice (05:37, 08:56), and the fix3
review then vetoed with "held web lane" as a cause (handled 09:16). No alert kind, window button
or plan field approves a held branch.

**U9. Two checkouts and a clean-tree rule add steps to every change.** Claude edits in
`duly-founder`, agents start from `duly`; every resolution or plan edit is committed, then merged
across "only between runs". phase.py refuses a dirty tree. Memory records one slip (`git commit
-a` swept half-done factory work into a commit) and a rule never to hand-merge an agent's branch
(done twice, undone twice by the founder).

**U10. The launch command is long and undiscoverable.** No make target; the RUNBOOK's command is
`uv run python -m tools.factory.phase specs/<phase>/plan.yaml` with three flags. `--checks-only`
and `--only-round` exist but are not in `make` or the window.

**U11. Alerts are thin.** macOS banner only, 180 characters, no action, no link to the run, no
suggested command. Alert text truncates the cause: "escalated: L-audit auditor: the same failure
twice: the done command fails:" (18:44), and the check failures open with tool noise ("Set
`VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning. | Failure. Coverage is below
95%", ANSI codes from gitleaks). Veto alerts are filed as `eval_drop` with a score dict, not the
blocking finding.

**U12. Reviews are hard to tie to plans.** Every product-2 review row in `.factory/reviews.jsonl`
has task `product-2/review/L-review`, whatever the plan. Review files are named by hand in each
plan's mission and done command; plan-fix1 through 1g all name `reviews/product-2-fix1.md`.

**U13. Milestone steps sit outside the factory.** Product-2 was approved by a reviewer that never
rendered a screen (no Playwright or Electron in the jail); Claude's own `make design-shots` then
showed unstyled screens (memory, 2026-09-30). Rendering, `make up`, the live check, the push
notification and the founder's test guide are all manual.

**U14. The RUNBOOK describes more than the tools do.** It says a "Tell Claude" note means "Claude
is told at once"; nothing in the repository delivers it (the window appends to
`.factory/inbox.jsonl`, and the file has 0 rows: the feature was never used). It says to park a
task in `specs/product/BACKLOG.md`; no command does. It lists `make handled` but not how to find
the seal.

## 3. The Factory window (duly/dashboard)

pywebview native window, one Python bridge (`snapshot`, `agent`, `note`, `stop`, `resume`,
`get_theme`, `set_theme`), polled every 2 seconds (ui.html:1654).

### It can

- Show agents working now and earlier, one card per lane: mission, state, iteration, actions,
  tests run, commits, files changed, tokens in and out, list cost, merged or not.
- Open one lane: Trace (the Claude Code session, last 500 lines), Activity (its ledger lines),
  Progress log, Changes (diff), with follow mode.
- Stop every agent, and resume (the same button flips).
- Show "Needs you": up to 6 open alerts (lane, time, message); an alert leaves when `handled` is
  recorded or the same task later passes.
- Show "The factory's own check": working cards with no process, dead claims, out-of-date health
  checks, broken ledger chain, alerts open over 6 hours, leftover worktrees, failing gates, a stop
  with live processes.
- Show review scores (last 5: mean, lowest, approved or vetoed), agent health (passed, out of
  date, not checked), ledger integrity, gate results of the last run, the last 60 orchestrator
  lines, and per-agent metrics (attempts, cost, minutes).
- Take a note to Claude and show its replies and state.
- Light and dark theme, saved in `.factory/ui.json`.

### It cannot

- Start a plan, pick a plan file, or see which plan file is running. `plan_state` shows only the
  branch and the orchestrator's last line.
- Show plan progress: round N of M, lanes per round, what is left.
- Resume `--from-round`, run `--checks-only` or `--only-round`, or rerun one lane.
- Act on an alert: no "handled" button, no cause or upheld choice, and the seal is not sent to the
  page. Only 6 alerts are shown.
- Show a veto's findings or open the review file; reviews show scores only, with no plan name.
- Show or approve held lanes ("waiting for the founder"); they appear only as an orchestrator line.
- Show an escalation's REPORT.json (what was tried, the dispute, the failure tail) other than the
  one alert line.
- Show earlier runs of a lane: `agents_from_events` keeps only the latest run per lane
  (factory_data.py:451), so the 20 L-tests runs of product-2 are one card with `runs: 20`.
- Show `make efficiency`: hours, stops by cause, vetoes, list dollars per plan, subscription
  share. It shows today's spend against a day cap only.
- Reach the founder away from the Mac: no push, no remote view; alerts are macOS banners.
- Deliver a note to Claude by itself: the note waits in `inbox.jsonl` for a session that happens to
  poll it.
- Stay cheap as the ledger grows: every 2 s it re-reads all of events.jsonl, runs `ps`, three git
  commands per agent worktree, and re-parses transcripts for tokens (factory_data.py:711-760).
- Show current learning: the "Learning" panel counts lessons, proposals and skills
  (factory_data.py:800-802), which batch 1 item 12 archived and item 11 retired for agents.
- Serve another project as is: `find_repo` looks for `.factory`, but health lanes, `.claude/LESSONS`
  paths, review score names (`correct`, `sourced`, `never_assumes`, `inside_the_boundary`) and the
  window title are Duly's.

## 4. What this means for factory-2

1. The unit of work should be a feature run that continues, not a plan file per attempt: amend
   and resume the same run, carry kept work automatically (FINAL item 5, D8), and default the
   repeated rounds (reconcile, checks, review, audit) from a profile rather than copying them.
2. Plans should be generated from the SPEC's numbered points and the lane map, with a dry run
   that executes each done command on the current branch, so U2's eight founder-lane errors are
   caught before launch.
3. Escalations and vetoes need a durable supervisor that does not depend on one Claude session and
   a hand-armed watcher: one queue of decisions with the report, the finding, the suggested
   cause and the command to continue.
4. The window should be the control surface: launch, resume, rerun a lane, approve held lanes,
   record `handled` with cause and upheld, read findings, see plan progress and `make efficiency`,
   with push to the phone.
5. For the template: one command (`factory run <spec>`), one config file for project names
   (paths, gates, score names, lane map), and a RUNBOOK generated from the tools so it cannot
   claim what the tools do not do.
