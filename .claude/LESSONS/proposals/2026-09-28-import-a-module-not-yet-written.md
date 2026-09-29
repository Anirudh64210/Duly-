date: 2026-09-28
lane: L-tests
commit: 6712e8b
failure: ruff check reported I001 on a test that imports names from a module the engine lane had not written yet. Ruff sorts the import as third party while the file is absent and as first party once it exists, so the same block cannot be clean in both states.
fix: Import the module from its package (from engine import dates), not names from the module.
evidence: tests/PROGRESS.md, first lesson and the request about pyproject.toml.
verification_task: Write a test file for engine/new_module.py before it exists and keep ruff check clean before and after the module lands.
seen: 1
curation: stays a lesson. The lasting fix is outside this lane: known-first-party under [tool.ruff.lint.isort] in pyproject.toml.
