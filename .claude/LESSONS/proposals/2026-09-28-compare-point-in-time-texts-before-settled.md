date: 2026-09-28
lane: L-content
commit: a167ed7
failure: The SPEC table tagged opt.apply_after_days settled with no regime. The blocked final rule changes it from 60 to 30, in 8 CFR 214.2(f)(11)(i)(B)(2) of the 2026-09-15 text.
fix: Compare paragraph (f) between the saved text before and after the blocked rule, and give every changed value one row under each regime, tagged litigated.
evidence: rulepacks/PROGRESS.md, "Compare the two point-in-time texts before tagging anything settled"; rulepacks/f1-us/v2026.09/sources/ecfr-8cfr214.2-2026-09-15.xml.
verification_task: Remove opt.apply_after_days from a scratch copy of the pack and ask for it to be added as the SPEC table states it (60, settled, no regime).
seen: 2, counting the reader side of the same trap in rule-lookup-by-date-and-regime
curation: repeats. Drafted as step 3 of add-effective-dated-parameter. Replay: both arms wrote two litigated rows, so the new step did not change the outcome; see .claude/skills/add-effective-dated-parameter/REPLAY.md.
