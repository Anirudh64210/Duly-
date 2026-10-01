# Factory reliability audit: every failure, escalation and stop, 2026-09-28 to 2026-09-30

Sources: `duly/.factory/events.jsonl` (9,078 rows), `runs/*/settings.json` and `runs/*/stream.jsonl`,
`failures.jsonl`, `tools/factory/{agent_run,sandbox,phase,control,efficiency}.py`, and the audits in
`docs/factory/research/2026-09-30/` (audit-ledger.md sections 2 and 4, FINAL.md). Times are UTC.

The window is three days, but `events.jsonl` starts at 09-29T05:48. Nothing from 09-28 was kept
(`archive/` holds only lesson proposals), so the record covers 09-29T05:48 to 09-30T18:49, 37 hours.

## 1. Totals

| Measure | Count |
|---|---|
| Agent runs started | 307 |
| Ended done | 277 (2 of these passed only on their second attempt inside the run) |
| Ended escalated | 24 |
| Ended failed | 4 |
| Never ended (no final row) | 2: l-web-9f3f0a6051 (09-29T09:13) and l-web-149130e988 (09-29T09:27) |
| Round stops ("round X stopped") | 60, plus 1 manual stop (G1, 09-29T07:18) = 61 |
| Stops outside rounds | 5: 2 tamper alerts, golden tasks at 0%, curator escalation, auditor health probe |
| Waits for approval (by design, not failures) | 2: L-web dependency_added at 09-30T05:37 and 08:56 |

## 2. The 61 round stops by cause

Each stop is counted once, by its root cause. When the founder wrote a `control` verdict, the stop
follows it. Six cause classes were asked for. Two more are needed to account for every stop:
**factory defect**, a bug in the factory's own code or config, and **wording**, where plain text
drifted from the quoted law.

| Cause | Stops | Share | Examples |
|---|---|---|---|
| Plan fault | 22 | 36% | 7 were coverage gates first run after the merge (09-29T14:32, 22:11, 23:06; 09-30T05:17, 07:28, 09:31, 10:00). 5 were stale tests after a resolution (13:46 api placeholders, 15:57, 18:36, 06:55, 11:44). The rest: jail temp dir (13:31), git index written in the jail (05:37), orchestrator-written test wrong (08:31, 09:43), parts unwired (05:51), resolution never built (15:10), held web lane (09:16), spec not committed (G1) |
| Spec gap | 17 | 28% | 66 engine tests contradicted the SPEC (3 stops, 11:12 to 12:22). J08 and J17 (06:45, 07:00). Resolution 14 translation (07:43, 07:57). Wrong points written by the orchestrator: point 15 (08:48), point 22 (12:59), point 24 (12:32). ui-1 had no question copy (14:08, 14:21) |
| Wording (content) | 6 | 10% | product-1 vetoes V4 to V9 (09-29T19:44 to 09-30T02:26): plain texts drifted from their quotes |
| Factory defect | 6 | 10% | gitleaks false positives (06:30, 07:15). Copy lint scanned coverage output (14:37). A CI test needed a Claude login (14:43). The pull request already existed (14:49). Copy lint read a path the jail denies (19:22) |
| Cross-lane | 3 | 5% | engine's done command needed api's parallel work (06:11). Tests and pack were written in parallel and disagreed on ids (06:30). desktop needed web (11:42) |
| Real code error | 3 | 5% | pre-completion card counted as post-completion (veto 17:53). A content change broke pack parsing with RulepackError (01:11). The engine never read trips' left_on and returned_on (07:14) |
| Infra | 1 | 2% | GitHub push refused with Permission denied (publickey) at 14:54. Passed unchanged 5 minutes later |
| Unknown (bring-up) | 3 | 5% | "check reviewer approved fails:" with an empty tail, twice (06:45, 08:25). An L-tests escalation to tests/ESCALATE.md (06:40), the path that CLAUDE.md wrongly names |
| Flake | 0 in rounds | | The SSH push counts as infra. Round C's gitleaks stop (06:30) passed on a rerun 2 min later, and no fix is recorded, so it may also be a flake |

The 24 escalated runs split the same way: 9 spec gap, 8 plan fault, 3 cross-lane, 3 factory
defect (curator lane under .claude, copy lint on a denied path, auditor probe), and 1 real code
error. The founder ruled the agent right in every one he ruled on. Of the 4 failed runs, 2 were
tamper false alarms, 1 was the jail temp dir (plan), and 1 was the budget miscount (factory).

**Reading.** Infra and flake together cause under 10% of stops. The large losses are plan faults
and spec gaps, which FINAL.md changes 4, 5, 7 and 8 target. The infra and flake cases still matter
because each stops the whole factory until the founder looks. All of them can be handled
automatically, and every one of them was handled by hand.

## 3. Infra: each case and what automatic handling would have saved

| Case | Evidence | Cost | Handling that would have saved it | Status |
|---|---|---|---|---|
| Transient SSH refusal on push | 09-29T14:54:39 stop; control 14:59:49, "the same push passed minutes later" | A round stop, 5 min of founder time, and a rerun of the round | **Retry with backoff.** `phase._remote` retries 3 times at 5, 20 and 60 s against a signature list | Built on 09-29 |
| Mac asleep during runs | audit-ledger 2.2: 2.65 h of silence inside active runs (09-29T23:53 to 09-30T02:18, 09-30T10:12 to 11:20). L-desktop escalated at 10:56:38 and its round stop was written at 11:42:07, 46 min later | 2.4 h of product-1's 16 h | **Prevent it.** Run under `caffeinate -dimsu` | Built (change 2) |
| Git index.lock "Operation not permitted" | 09-30T05:37 L-tests, 2 attempts with the same error | 2 attempts, a round stop, founder handling | **Classify, do not retry.** A lock error in the jail is deterministic: the done command wrote git's index. A retry is wasted. Recognising the signature at attempt 1 and stopping with cause=plan would have saved attempt 2 and pointed straight at the fix | Not built |
| mkdtemp "Operation not permitted" | 09-29T13:28 to 13:31 l-tests-a18f378116, 3 of 3 attempts identical, raised retry_storm | 3 attempts and a stop | **Classify, do not retry.** Same kind: a sandbox denial is never transient. Stop after attempt 1 and name it as a jail or plan fault | Not built |
| CI red on a clean checkout | 09-29T14:43; a factory test needed a Claude login | A stop, plus a wait for CI (the ledger counts 1.2 h of CI waiting in product-1) | Retry does not help, since the failure is deterministic. Classifying it (the local gates passed, CI failed, so the environment differs) routes it to factory at once | Fixed in 88ea3b1, by hand |
| Runs that never ended | l-web-9f3f0a6051 and l-web-149130e988 have a start and steps but no done, failed or blocked row. The health sweep was restarted around the tamper alerts | The dashboard and ledger show two runs that never finished, and efficiency cannot count them | **Resume.** At startup, a reaper writes `interrupted` for any run whose process is gone, and the round resumes from its kept work (`--from-round` already skips landed lanes, change 3) | Not built |

## 4. Flakes (passed on rerun with nothing changed)

| Case | Evidence | Root cause | What retry-once would have done |
|---|---|---|---|
| Tamper alert, L-pipeline | 09-29T09:13, run failed: "protected parts of the repository changed: refs/heads/factory-v2". Founder at 10:37: "the founder lane committing to the branch while the health check ran. The check was run again and passed" | A race in the factory. The tamper check compared a branch that another process is allowed to move | Rechecking once, after confirming the ref moved by a founder-lane commit, would have cleared it. Instead the run failed, and the alert waited 84 min for the founder. Now fixed: the check watches protected branches only |
| Tamper alert, L-web | 09-29T09:21, same text | Same race | Same. The alert waited 76 min |
| **Today's auditor health probe** | l-audit-75262d0b25 at 09-30T18:43:59: escalated, "the same failure twice: the done command fails:" with an empty tail. l-audit-6993b67bed at 18:49:17 passed with the same settings.json (the diff shows only the run id) | **Not a real flake.** The failure comes from a fixed bug in the config. Whether it shows up depends on what the model does next. See below | A retry passes, but only by chance. Retry-once plus a flake record would have kept the factory moving. The signature record is what finds the bug |

**Why the auditor probe failed and then passed.** Both runs had their Write tool denied ("Permission to
use Write has been denied because Claude Code is running in don't ask mode") when writing
`docs/requirements/HEALTH.txt`. In the failed run the model accepted the denial on both attempts.
HEALTH.txt was never written, so `test -f docs/requirements/HEALTH.txt && ! test -e engine/probe.txt`
(control.py:87) exited 1. In the passing run the model wrote the file with `echo ok >` through
Bash. The reviewer probe at 18:47 passed the same way.

The cause is in sandbox.py:133. The contract lists only Write for the auditor and the reviewer
(`tools: [Read, Write, ...]`), not Edit, so the settings grant `Write(//…/docs/requirements/**)`
and no `Edit(...)` rule. Across every kept run, Write calls in the Write-only lanes (l-audit,
l-review) succeeded **0 of 9 times**, all denied in don't ask mode. Lanes that hold both rules
succeeded every time outside guarded paths (for example l-web 39 of 39, l-tests 29 of 32, where
the 3 misses are guard-hook refusals). The inference is that Claude Code checks file writes
against Edit rules, so a Write-only grant grants nothing. The fix is to emit `Edit(...)` for every
lane that may write, or to give both roles Edit, and to make the probe check that the Write *tool*
succeeded rather than only that the file exists. A Bash fallback also bypasses the Edit and Write
hooks.

**The empty tail is a second reliability bug.** `failure_digest` falls back to the last four
lines of output, and `test` prints nothing. So the failure text is the empty string, and two empty
strings count as "the same failure twice" (agent_run.py:865). The same empty tail escalated the
curator (l-factory-cb3b778b60, 09-29T10:27) and the two bring-up "reviewer approved" stops. An
empty digest should name the command and its exit code. It should never be the basis for
escalation.

## 5. Agent retries that worked

Two runs failed attempt 1 on a protocol slip and passed attempt 2 inside the same run:
l-tests-e8d3ac30bb (REPORT.json not written after 121 turns and $7.53; the retry took 14 turns and
$0.50) and l-tests-2839a42b3a (REPORT.json left out 2 changed files). This is the existing
in-run retry working as designed. It needs no change beyond counting it.

## 6. What to build (reliability part of factory-2)

1. **Classify every failure at the source, by signature, before deciding to retry.** Add
   `flake` and `interrupted` to `efficiency.CAUSES`, which today holds plan, spec, cross-lane,
   code, factory, infra, wording and unknown, and today every `_stop` defaults to `unknown`
   until the founder names a cause.
   - Transient remote errors (the `phase.TRANSIENT` list): retry with backoff. Already built for
     push, PR and CI calls.
   - Sandbox denials (`Operation not permitted`, `index.lock`, `mkdtemp`, `sandbox_violations`):
     never retry. Stop at attempt 1 with cause=plan or factory. This would have saved 3 attempts
     plus 1 attempt, and 2 stops' diagnosis.
   - Budget exhausted, tamper on a non-protected ref, gate tool errors on generated files
     (coverage, lcov): cause=factory, with no agent retry.
2. **Retry once for health probes, tamper checks and the orchestrator's post-merge checks.** Log a
   pass on the retry as a `flake` with its signature. The second time the same signature appears
   as a flake, file it as a factory defect. On this record that would have cleared 3 of 5
   non-round stops without the founder (both tamper alerts and the auditor probe), and would have
   raised the Write-rule bug as a defect today.
3. **No escalation on an empty failure.** The digest names the command and its exit code, and
   the "same failure twice" rule needs a non-empty digest.
4. **Resume after interruption.** A reaper writes `interrupted` for runs with no live process,
   and the plan resumes from kept work. This covers sleep, a killed runner and a laptop lid.
5. **Fix the Write-only permission rule** (sandbox.py:133) and make the probe assert that the
   Write tool succeeded.
6. **Keep the proven parts:** `_remote` backoff, caffeinate, the idempotent pull request, and
   `--from-round` skipping landed lanes.

For the template: items 1 to 4 are general. They depend only on the event ledger, the jail and
the plan runner, not on Duly, and belong in the templated factory with a per-project signature
table.
