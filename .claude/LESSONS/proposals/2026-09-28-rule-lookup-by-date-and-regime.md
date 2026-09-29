date: 2026-09-28
lane: L-engine
commit: f64a3c5
failure: None seen, but close. The shipped pack records opt.apply_after_days under two regimes and keeps a closed row for capgap.end_month_day. An engine that looks a rule up by id alone, or ignores the date, reads the wrong row.
fix: Always go through Rulepack.value(id, on, regime). Try the shipped pack by hand as well as the test pack, because the test packs start every rule on 2000-01-01.
evidence: engine/PROGRESS.md, third lesson; rulepacks/PROGRESS.md, requests to L-engine; tests/PROGRESS.md question 3.
verification_task: Compute capgap.ends for a case with a FixedClock before 2025-01-17 and one after, against the shipped pack.
seen: 2 (L-engine, and the request from L-content)
curation: repeats. Drafted as step 8 of add-effective-dated-parameter. Open question for the founder, found in replay: the engine passes today to Rulepack.value, not the date of the event, so a rule that changes on a future date applies to every period from that day on. DECISIONS.md D1 is the ruling the engine lane cited.
