# Updates round 1: every saved source is checked again, on a schedule

Read DECISIONS.md D2 and D22, PRINCIPLES.md and BOUNDARY.md first.

## Covers

Register rows: DEC-D02-001, DEC-D02-003, DEC-D02-005, DEC-D02-010, PLAN01-003, WB06-058, IMPL-021, PLAN07-064, PLAN07-065. That is 9 of 1623 requirements. It is the first of three rounds of the updates pillar, which stands at 2 percent: this one keeps what Duly already knows current; the next finds new changes and verifies them (updates-2); the third delivers them, approved by the founder, in the app and by email (updates-3).

## The problem

Every rule was read once, on the day it was sourced. Nothing reads it again. If the law changed today Duly would not know until its rules went stale after 7 days and every verdict became "Can't tell yet".

## What is built

### The source register (L-pipeline)

`watch/register.py` builds one list of every source Duly depends on, from the rule packs: each `source.url`, `snapshot` and `snapshot_sha256`, the rules that rest on it, and its host. Plus the hosts in watch/sources.yaml, which are watched for new documents in updates-2. A source whose host is not a primary host (tools/sources/verify.py) is refused.

### The check (L-pipeline)

`watch/check.py`, run for one source or all:

1. Fetch the url again. Only primary hosts. A timeout, a limit on size, a limit on requests per minute for each host (CourtListener allows 5 a minute without a token, as a lesson records), and a retry with backoff. A source that cannot be reached is reported as unreachable, never as unchanged.
2. Reduce both copies to their text the way tools/sources/verify.py does, and compare. A change only in markup, dates of retrieval or page furniture is not a change: the comparison is of the text that holds the quotes. Record what was compared.
3. For each rule resting on the source: is its quote still in the new text?
4. Write the result to `watch/state/checks.jsonl`, one line per source per check: when, the hash of the new copy, changed or not, and for each rule, quote still found or not. Keep the new copy under `watch/state/copies/` named by its hash.

### What a result does

- Unchanged: the rules resting on the source count as checked on that day. `Rulepack.rules_checked_on` reads the latest check, so the verdict stays current without anyone touching the pack.
- Changed but every quote still found: the source is recorded as changed. The founder is told. The rules stay current.
- A quote no longer found: every rule resting on it is stale at once. The engine treats a stale rule as it treats a missing one: any item using it is null, and the verdict is "Can't tell yet" with the reason `rule_changed:<rule id>`. The founder is alerted, and a task is written to `watch/state/tasks/` for the rule pack drafter to read the new text and propose the change. Nothing in a rule pack is changed by the watcher. A human approves every change to law.
- Unreachable: after three failed checks in a row, the founder is alerted. The rules count as checked on the last day they were checked.

### The schedule

- `make watch-sources` runs the check once for every source.
- A launchd agent on this Mac runs it every 6 hours for the Federal Register, USCIS, ICE and court dockets, and every 24 hours for the eCFR and everything else, reading the interval for each host from watch/sources.yaml. `make watch-install` installs it and `make watch-uninstall` removes it. It runs with no keys and only the network access it needs.
- A scheduled GitHub workflow runs the same check daily, so the check also runs when this Mac is off. It opens an issue when a quote is no longer found. It never commits.

### The Factory window

A panel "Sources": how many sources, when each was last checked, which changed, which are unreachable, which rules are stale. Nothing is hidden when all is well: the last check time is always shown.

## The tests (L-tests)

With a local fake server standing in for the hosts: unchanged, changed markup only, changed text with quotes found, a quote gone, a timeout, an oversized page, a host not on the list, the rate limit, three failures in a row. That a stale rule makes the verdict "Can't tell yet" with the reason named. That the watcher never writes under rulepacks/. That the schedule file names only the check command.

## Done

1. The offline gates and the hidden tests pass.
2. The founder lane runs `make watch-sources` against the real sources and every one of them reports unchanged or with a named reason.
3. The reviewer approves; the auditor re-checks the covered rows.
