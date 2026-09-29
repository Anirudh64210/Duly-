# Lessons for L-tests

Proposed filing, 2026-09-29. Not in force until the founder accepts it.

## 2026-09-28-import-a-module-not-yet-written

- What went wrong: ruff check reported I001 on a test that imports names from a module the engine lane had not written yet. Ruff sorts the import as third party while the file is absent and as first party once it exists, so the same block cannot be clean in both states.
- What fixes it: Import the module from its package (from engine import dates), not names from the module.
- Evidence: tests/PROGRESS.md, first lesson and the request about pyproject.toml.

## 2026-09-28-log-test-matched-the-timestamp

- What went wrong: None seen, but close. The api log test first searched every field of each log record, which includes the timestamp, so a number from the body could match by chance.
- What fixes it: Search the message, its template, and its arguments only.
- Evidence: tests/unit/api/test_compute.py, the helper named logged.
