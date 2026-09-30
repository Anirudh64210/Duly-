# Factory runbook

How the agent factory is run, stopped, checked and repaired. The rules behind it are in PRINCIPLES.md and factory/config.yaml. The audit against the founder's checklist is in docs/factory/CHECKLIST.md.

## Every day

| To do this | Run |
|---|---|
| See what the agents are doing | `make watch` |
| Stop everything now | `make stop`, or the Stop button in the Factory window |
| Allow runs again | `make resume` |
| See what is running, what was spent, whether the record is intact | `make status` |
| Run a plan | `uv run python -m tools.factory.phase specs/<phase>/plan.yaml` |
| Resume a plan after a stop | add `--from-round <name>` |
| Run a round's checks again without its agents | add `--checks-only <name>` |
| Remove worktrees no run holds | `make factory-clean` |

## Before a change to the factory

A change to a contract, a role file, a skill, the sandbox, the runner, or the pinned model:

1. `make golden` and note the result.
2. Make the change on a branch.
3. `make factory-test` and `make test`.
4. `make doctor`. Every agent must pass its health check again, because the check is tied to the exact contract, sandbox and runner it was earned with.
5. `make golden` again. The pass rate must be at or above `gates.golden_pass_rate`.
6. The founder merges.

## What is enforced by what

| Rule | Enforced by |
|---|---|
| An agent writes only in its own worktree, and there only in its lane's paths | The operating system sandbox (seatbelt on macOS, bubblewrap on Linux), set for each run by tools/factory/sandbox.py |
| An agent cannot read the founder's keys | The same sandbox: `denyRead` on the list in sandbox.py |
| The network is closed | The same sandbox: deny by default, with the hosts in the agent's contract allowed |
| An agent cannot move `main` or the phase branch, change git config, or add a git hook | The same sandbox: `denyWrite` on those paths, and a check of protected state after every attempt |
| An agent cannot start another agent | The Agent and Task tools are denied, the network refuses the model's host, and the keys are unreadable |
| An agent's word is not trusted | The orchestrator runs the done command itself, in the jail, and compares the report with what git shows |
| Code an agent wrote runs with no network and no keys | tools/factory/jail.py, for every done command and every check |
| Limits on turns, time, tokens and cost | The agent's contract, enforced by the runner, which ends the process |
| Nothing lands on a protected branch | tools/factory/phase.py refuses a plan whose branch is protected |
| Dependencies, CI, guardrails, skills and contracts need the founder | phase.py holds any such change and does not merge it |

## When the factory cannot finish a task

In this order. Each step is written to the ledger and raises an alert.

1. An attempt is not accepted (the done command fails, the report is refused, a file outside the lane changed). The agent is told why and tries again, up to `max_attempts` in its contract.
2. The same failure appears twice. The run ends as escalated. The worktree and branch are kept.
3. A limit is reached (time, stall, repeated action, tokens, cost). The process is ended, the failure is added to the memory of past failures, and the next attempt is told.
4. The agent itself escalates, with status `escalated` in its report and the reason under disputes or requests.
5. The round stops. Nothing later in the plan runs. The founder is notified.
6. The founder reads the run in the Factory window, decides, and either fixes the SPEC or the factory and resumes with `--from-round`, or parks the task in specs/product/BACKLOG.md.

## Undoing

Every lane lands as one merge commit. To undo one lane:

```
git revert -m 1 <merge commit>
```

The merge commit names its run (`Factory-Run`), its sessions (`Factory-Trace`) and the seal of the ledger at that moment (`Factory-Ledger`).

## Restoring main

Every change to `main` is marked on GitHub with a tag named for the moment it landed, `main-YYYY-MM-DD-HHMMSS`. To see them: `git fetch --tags && git tag --list "main-*"`. To put `main` back to one of them, the founder runs `git push origin +<tag>^{commit}:main` after checking what it holds.

## Talking to Claude from the window

The box "Tell Claude" in the Factory window saves a note and Claude is told at once. Each note shows whether it is sent, in hand, or done, with Claude's reply under it. From a terminal: `uv run python -m tools.factory.control inbox` lists the notes that are waiting.

The panel "The factory's own check" appears when the window itself can see something wrong or stale: a card that says working with no live process, a claim held by a process that ended, a health check out of date, worktrees left over, an alert open for more than six hours. "Needs you" holds only alerts nobody has dealt with; an alert leaves it when the same task later passes or when someone records how it was dealt with.

## The record of actions

`.factory/events.jsonl` is append only. Each line holds the seal of the line before it, so a changed, removed or reordered line shows in `make status`. Each merge pins the seal in the repository's history.

For any merge, the full trace is:

| What | Where |
|---|---|
| Every action, with its time | `.factory/events.jsonl`, lines with that `run_id` |
| The raw stream from the agent, with secrets taken out | `.factory/runs/<run_id>/stream.jsonl` |
| The sandbox settings the run was given | `.factory/runs/<run_id>/settings.json` |
| The session as Claude Code kept it | `~/.claude/projects/`, under the worktree's path, by session id |
| Spans in the OpenTelemetry shape | `.factory/otel/traces.jsonl` |

## Every week

`make weekly` writes docs/factory/reviews/<year>-W<week>.md: every run that failed or escalated, and a sample of those that passed, with five questions for each. The founder reads the traces, answers, and writes what changes. Then `make drift` has the reviewer score an earlier review again, to check the judge against itself.

## Checks scale with the risk of the change

One feature once took fifteen hours: every change, even two sentences of plain words, went
through the full test suite, a pull request and a CI run, a review and an audit. Checks are
now chosen by what a change can break.

| Kind of change | Rounds | Checks |
|---|---|---|
| Words only (plain words, labels, copy) | content or screen, then review | the text gates (plain words, freeze, copy lint, the pack loads) and the reviewer's read. No test suite, no build round |
| Behaviour (engine, api, screen logic) | tests first, build, reconcile, then review and audit | the lane's own tests while it works; the full suite, the hidden tests and the gates once, in the plan's last build round |
| Contract | its own commit, first and alone | schema checks and the tests that read it |
| Factory (tools, runner, gates) | the founder lane, with tests | `make factory-test` and diff coverage on the changed lines before merging |

- A plan reaches the phase branch once, at its last round: one pull request and one CI run per plan (phase.py; a round may still set `checkpoint: true`).
- Heavy checks (`make test-offline`) go in one round of a plan, the last that builds.
- Independent work runs in parallel lanes of the same round, not in plans one after another.
- A reviewer reads everything in one pass and names every finding; a fix plan answers all of them together.
- Before a phase is built, real student journeys are run against its data model, so a gap in the model is found before code is written, not after.
- A plan that changes the pack or the engine regenerates the web samples (`make samples`) in its reconcile round, by a web lane beside the test lane, so the samples drift test never stops a plan.
- Journeys are a gate, not a final exam. Product-2 took 13 reviews and 11 vetoes because wrong
  dates were first found by the reviewer. Every builder that touches engine/, the pack or a view is
  held, in its done command, to the acceptance journeys and to the tests of the points it answers,
  so a wrong date stops that lane within minutes. The reviewer then confirms and reads what tests
  cannot (sources, words, screens); it does not discover dates.
- An area that fails review twice (cap-gap) leaves the plan and gets its own round, designed from a
  full table of cases before any code.
- `make efficiency SINCE=<time>` reports wall time, agent time by lane, CI waits, stops and the time from each stop to the restart, and reviews with vetoes. Every status report carries it.

## A change of behaviour lands in two rounds

Tests written before the code cannot know which older cases the new behaviour will collide with, so a builder held to the whole suite escalates on every such case (product round 1 escalated this way four times). Plan it as:

1. Tests first (test-author): the tests of the new behaviour, in a file of their own. Not expected to pass.
2. Build (builder): held to that file and the gates, not the whole suite. The builder lists the older tests that collide in its report.
3. Reconcile (test-author): held to the whole suite and the hidden tests on the merged code. Each changed test names the settled point that requires it; nothing a point supports is loosened; a failure no point explains is escalated as a possible engine error.
4. The reviewer checks the reconcile diff for exactly that.

## Definition of done, by kind of task

An agent cannot declare itself done. Done is a command in the plan, run by the orchestrator.

| Kind of task | Done when |
|---|---|
| Build (builder) | The lane's tests pass, types and lint are clean, and every number has a source |
| Tests (test-author) | The tests are written, lint clean, and named in the report. In a round where tests come first they are not expected to pass yet |
| Rules (rulepack-drafter) | Every quote is found in its saved source, every value is verbatim or a marked reading, and the pack loads |
| Review (reviewer) | The review and its scores are written, the scores match the schema, and the decision follows from the scores |
| Skills (skill-curator) | Each proposal has a replay with evidence. Never merged by the factory |
| Any plan | Every round's checks pass, the hidden tests pass, and the reviewer approves |

## Reproducing a run

The model is pinned in factory/config.yaml and in each contract, and a run on any other model is refused. Dependencies are pinned by uv.lock and package-lock.json. Each run starts from a recorded commit (`Factory-Base`). A model's output is not repeatable in itself, which is why the checks, and not the agent's words, decide.

## Build only what is needed, seeing the whole

A lane sees its own mission and its own paths, so it solves its slice in full, even when the
whole needs much less. Two things close that gap:

- Every plan has a `goal`. Each lane is told it, and what the lanes beside it in the round are
  doing, before its own part (phase.briefing). Preflight refuses a plan with no goal.
- Every agent asks before building: is it required (which SPEC point, test or finding), does it
  already exist (this repository, the standard library, a locked dependency), and what is the
  smallest change that fits the whole. It reports what it chose not to build. The reviewer names
  overbuilding as a finding: code nothing needs, single-use layers, and anything that repeats
  the standard library or existing code.

The same holds for the founder lane: a SPEC point is written for the whole area, from a full
table of cases, not one review finding at a time.
