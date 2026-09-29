# .claude scaffolding spec

Create these in the repo. Frontmatter shown; bodies follow the described scope.

## agents/
- reviewer.md : fresh-context correctness reviewer; scope: logic, security, doctrine violations only; may veto; may not edit code.
- test-author.md : owns tests/; writes and strengthens tests from specs and findings; never weakens assertions; cites the behavior source for each test.
- eval-curator.md : owns evals/; converts L2 bad answers and incidents into eval cases; maintains citation and honesty suites.
- red-team.md : runs security/attack corpus and ZAP nightly; files findings issues with reproductions; fix PRs limited to the finding; proposes new attack strings via its lane.
- skill-curator.md : weekly; turns LESSONS/proposals into skill diffs with verification blocks; replays verification on a scratch worktree; opens the single curation PR; prunes stale skills.
- rulepack-drafter.md : drafts parameter and checklist diffs from approved review-queue items with citations and snapshots; output goes to the attorney gate, never direct to main.

## skills/ (starter set, each with a verification block)
add-effective-dated-parameter, write-clock-injected-property-test, add-rls-table (policy plus matrix test), add-endpoint (router, schema, authz matrix row, schemathesis), narration-answer-shape (validator contract), add-eval-case, compose-e2e-flow, workbook-block-rules, email-template-change (render snapshot plus copy lint), terraform-change (plan review protocol).

## hooks (settings.json semantics)
- PreToolUse Write and Edit: block paths outside the lane ownership file .claude/lanes/<lane>.paths; block the protected set globally for implementation lanes.
- PostToolUse Write and Edit: run ruff and eslint and targeted mypy or tsc on touched files; nonzero blocks.
- Stop: run the lane test command from .claude/lanes/<lane>.test; failure blocks turn end with the failure tail.
- PreToolUse Bash: deny network installs outside the allowlist; deny docker commands that would touch other lanes projects.

## Ralph lane runner (loops/ralph.sh)
while true with iteration cap from env; each iteration: fresh `claude -p "$(cat PROMPT.md)"`; PROMPT.md template sections: mission (one feature), SPEC path, done criteria (executable commands that must pass), forbidden paths reminder, instruction to read progress log first and append after, escalation rule (two identical failures: write ESCALATE.md and exit). Runner exits on cap, ESCALATE.md, or done criteria green.

## lanes/
One file per lane: name, owned paths, test command, review level (high or low), current SPEC pointer.

## LESSONS/
proposals/ inbox plus per-lane verified files; entry shape: date, commit, failure, fix, evidence link, verification task id.
