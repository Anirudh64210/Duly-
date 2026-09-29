# Lessons for L-engine

Accepted by the founder on 2026-09-29 (DECISIONS.md D44).

## 2026-09-28-rule-lookup-by-date-and-regime

- What went wrong: None seen, but close. The shipped pack records opt.apply_after_days under two regimes and keeps a closed row for capgap.end_month_day. An engine that looks a rule up by id alone, or ignores the date, reads the wrong row.
- What fixes it: Always go through Rulepack.value(id, on, regime). Try the shipped pack by hand as well as the test pack, because the test packs start every rule on 2000-01-01.
- Evidence: engine/PROGRESS.md, third lesson; rulepacks/PROGRESS.md, requests to L-engine; tests/PROGRESS.md question 3.
