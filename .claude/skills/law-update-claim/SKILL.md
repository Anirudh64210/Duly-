---
name: law-update-claim
description: Use when turning a detected change in the law into an update. Late is acceptable, wrong is not.
---

1. A claim is one sentence plus the exact quote that supports it, the url, and the hash of the saved copy.
2. Only primary sources support a claim: the Federal Register, the point-in-time eCFR, agency pages, court dockets, the school's own page. News and law firm alerts only tell you where to look.
3. State the legal status as it is today, with the date: proposed, final, effective, enjoined, vacated, appealed.
4. State what happened and who it touches. No adjectives, no advice, no prediction.
5. `publish_blockers` must return nothing before an update is shown to anyone.

## Verification

Replay task: write the update for a final rule that a court blocked the day before it took effect.
With this skill: two claims, one for the rule and one for the order, status enjoined, both quotes found in their sources.
Without it: the usual first draft reports the rule as in effect, from the eCFR current text.
