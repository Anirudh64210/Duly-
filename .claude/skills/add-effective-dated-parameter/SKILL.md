---
name: add-effective-dated-parameter
description: Use when adding or changing a rule in rulepacks/. Covers the source, the status tag, regimes, and effective dates.
---

1. Add the parameter to rulepacks/<category>-us/<version>/parameters.yaml.
2. Required: id, value, unit, status, effective_from, source (citation, https url, checked_on).
3. Pick the status honestly. Regulation text is settled. Agency guidance is guidance. Anything a court is deciding is litigated. Anything not final is proposed. Anything the school decides is school.
4. When a rule changes, close the old row with effective_to and add a new row. Rows for the same id and regime may not overlap.
5. A blocked rule goes under a regime with operative false.
6. Add a line to the pack CHANGELOG.

## Verification

Replay task: change a parameter's value from a given date.
With this skill: the old row is closed, the new row starts the next day, and tests/unit/engine/test_rulepack.py is green.
Without it: the usual first draft edits the value in place or leaves both rows open, and the overlap check fails.
