# Lessons

`proposals/` is the inbox. Any lane may add a file there. Nobody approves their own.

Entry shape:

```
date:
lane:
commit:
failure: what happened
fix: what resolved it
evidence: link to the run or the diff
verification_task: the replay that would prove a skill from this
```

Verified lessons move to `<lane>.md` through the weekly curation PR.

## Where accepted lessons go

One file for each lane, `<lane>.md`, and `all-lanes.md` for what every agent should know. `factory-fixed.md` records faults in the factory itself that were fixed; no agent needs to act on those.

The lessons for an agent's lane, and those for every lane, are handed to it at the start of each run as data about the past.
