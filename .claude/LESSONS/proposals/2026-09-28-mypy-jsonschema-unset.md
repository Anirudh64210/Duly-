date: 2026-09-28
lane: L-api
commit: af14b11
failure: mypy strict rejects iterating or using "in" on ValidationError.validator_value and ValidationError.instance, which types-jsonschema types as Any | Unset.
fix: Bind them to a local annotated as Any before use.
evidence: api/PROGRESS.md; api/case_f1.py:47, error: Item "Unset" of "Any | Unset" has no attribute "__iter__".
verification_task: Write a function that turns a jsonschema ValidationError for "required" into plain words, and pass mypy strict.
seen: 1
curation: stays a lesson. It belongs in add-endpoint when that skill is written in Phase 3.
