date: 2026-09-28
lane: founder (Phase 0)
commit: first commit
failure: The answer validator treated the digits inside a legal citation, such as 8 CFR 214.2(f)(10), as values the engine had not produced, and rejected a correct answer.
fix: Strip citation and form-name shapes before checking numbers. Added a test that a wrong value next to a citation is still caught.
evidence: tests/unit/assistant/test_validator.py
verification_task: Write a number check for answer text that contains citations.
seen: 1
curation: stays a lesson. Verified on 2026-09-28: tests/unit/assistant/test_validator.py is green, 19 tests, including test_numbers_inside_citations_are_not_values and test_a_wrong_value_next_to_a_citation_is_still_caught.
