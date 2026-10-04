# L-security progress

## 2026-10-01, run l-security-41a97d1ab9, attempt 1 (SPEC-W1 point 28)

- Read SPEC-W1, CLAUDE.md, security/threat-model.md, the report schema. No earlier PROGRESS.md.
- desktop/build/entitlements.plist does not exist yet (L-desktop writes it), so whether the
  library-validation entitlement is used is unknown. Recorded it as conditional, with the check
  (`codesign -d --entitlements` in make desktop-verify) that settles it at review.
- Changed security/threat-model.md: three adversary rows (local process on the engine channel,
  now engine.sock instead of a local port; tampered bundled runtime; ad-hoc or self-signed founder
  build) and a "Known gaps in the Step W1 founder build" section (Keychain prompts, the
  library-validation entitlement, no Windows channel).
- Ran the done command (self-signed variant): exit 0. The SPEC point 29 variant (ad-hoc): exit 0.
- Ran `uv run python -m tools.copy_lint.lint`: 7 problems, none under security/ (all in specs/,
  not mine).
- Not built: no new attack strings or semgrep rules (no finding needs them in this round); no
  attack run against a stack (this round's row is the threat model only; the packaged app is
  attacked by L-review after the founder packages it).

## 2026-10-03, run l-security-8d2f7f4d82, attempt 1 (SPEC-W2 point 52, D85)

- Read SPEC-W2 points 13 to 17 and 52, D85, documents-1 sections 3 and the recovery kit, the
  desktop_documents_bridge contract, the report schema.
- Changed security/threat-model.md: four adversary rows (a copy of the data folder without the
  login; changed or swapped stored files; anyone logged in as the student or any process that can
  ask the Keychain for "Duly Safe Storage", accepted under D85 until documents-1; old backups and
  snapshots after a delete) and one line under the Step W1 known gaps (no Touch ID lock, no
  recovery kit, a lost Keychain item means the documents cannot be opened).
- Ran the done command: "copy lint: clean", exit 0.
- Not built: no attack strings or semgrep rules (no finding in this round needs them); no attack
  run on the documents store, because L-desktop's main code for it is not in this tree yet.
