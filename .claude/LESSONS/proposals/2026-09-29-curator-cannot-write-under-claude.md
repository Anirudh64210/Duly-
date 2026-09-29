date: 2026-09-29
lane: founder (factory), found by the skill curator's health check
commit: see git log for .claude/lanes/L-factory.yaml
failure: The skill curator's lane was .claude/LESSONS and .claude/skills. Claude Code refuses every write under .claude/ when it runs without prompts, whatever the allow rules say, so the curator could not write a single file. Its first health check passed by chance of wording; the second failed twice.
fix: The curator's lane is now proposals/. A proposal takes effect only when the founder copies it under .claude/. The sandbox now refuses every lane the whole of .claude/.
evidence: run l-factory-cb3b778b60, .factory/runs/l-factory-cb3b778b60/stream.jsonl, "Permission to use Write has been denied"
verification_task: make doctor passes for skill-curator, and a write to .claude/skills/ is refused.
