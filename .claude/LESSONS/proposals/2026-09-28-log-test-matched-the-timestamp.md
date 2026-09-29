date: 2026-09-28
lane: L-tests
commit: 6712e8b
failure: None seen, but close. The api log test first searched every field of each log record, which includes the timestamp, so a number from the body could match by chance.
fix: Search the message, its template, and its arguments only.
evidence: tests/unit/api/test_compute.py, the helper named logged.
verification_task: Write a test that nothing from a request body is logged, and run it 200 times with bodies that hold short numbers.
seen: 1
curation: stays a lesson.
