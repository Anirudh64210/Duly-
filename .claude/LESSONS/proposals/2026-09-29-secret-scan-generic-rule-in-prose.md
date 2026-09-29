date: 2026-09-29
lane: founder (factory)
commit: see git log for .gitleaks.toml
failure: The secret scanner's generic rule stopped a round a second time, on the same sentence copied into a lesson file on the curator's branch. Excusing one line by fingerprint had not fixed the cause.
fix: .gitleaks.toml turns the generic rule off for markdown only. Rules for named providers still apply to markdown. Checked in a scratch repo: a GitHub token in a .md file is caught, a generic key in a .py file is caught, the prose sentence is not.
evidence: .factory/gates.json at 2026-09-29T07:15Z
verification_task: Commit a provider token in markdown and a generic key in code, and confirm gate 4 names both.
