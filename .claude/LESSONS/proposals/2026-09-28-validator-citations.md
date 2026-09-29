date: 2026-09-28
lane: founder (Phase 0)
commit: first commit
failure: The answer validator treated the digits inside a legal citation, such as 8 CFR 214.2(f)(10), as values the engine had not produced, and rejected a correct answer.
fix: Strip citation and form-name shapes before checking numbers. Added a test that a wrong value next to a citation is still caught.
evidence: tests/unit/assistant/test_validator.py
verification_task: Write a number check for answer text that contains citations.
