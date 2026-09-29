# Mission

One feature: <name it>.

# Read first

1. Your progress log: <lane>/PROGRESS.md. Read it before anything else.
2. SPEC: <path>
3. CLAUDE.md, BOUNDARY.md

# Done when

These commands pass:

```
<commands>
```

# You may not touch

tests/, evals/, security/, .claude/, .github/, tools/gates/, contracts/, BOUNDARY.md, DECISIONS.md. The gates are the spec. Passing by going around them is task failure.

# Every iteration

Append to the progress log: what you tried, what ran, what it printed.

# Escalate

If the same failure appears twice, write ESCALATE.md with what you tried and the failure tail, then stop.
