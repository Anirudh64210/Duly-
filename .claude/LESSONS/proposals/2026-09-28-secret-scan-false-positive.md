date: 2026-09-28
lane: founder (factory)
commit: 07ffcc7
failure: Round C stopped at gate 4. The secret scanner flagged a sentence in web/PROGRESS.md, "the route key (satisfies keyof paths)", as an API key. No secret was present.
fix: Added the finding's fingerprint to .gitleaksignore, which excuses that one line in that one commit and nothing else. The orchestrator gained a way to rerun a round's checks without running its agents again.
evidence: .factory/gates.json at 2026-09-29T06:30Z; gitleaks rule generic-api-key
verification_task: Write a progress log that uses the word key beside a code span and confirm gate 4 passes or names the line.
seen: 1
curation: stays a lesson. Replayed on 2026-09-28: gitleaks 8.30.1 in dir mode on a file holding the sentence from web/PROGRESS.md found no leaks, so the finding could not be reproduced on the sentence alone. The excuse in .gitleaksignore is tied to the commit and line, and was left as it is.
