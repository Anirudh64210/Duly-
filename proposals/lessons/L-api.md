# Lessons for L-api

Proposed filing, 2026-09-29. Not in force until the founder accepts it.

## 2026-09-28-mypy-jsonschema-unset

- What went wrong: mypy strict rejects iterating or using "in" on ValidationError.validator_value and ValidationError.instance, which types-jsonschema types as Any | Unset.
- What fixes it: Bind them to a local annotated as Any before use.
- Evidence: api/PROGRESS.md; api/case_f1.py:47, error: Item "Unset" of "Any | Unset" has no attribute "__iter__".
