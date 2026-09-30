# Lessons

The proposal inbox is closed. What agents wrote about their own runs proved unreliable, and none of it was accepted. The orchestrator keeps its own memory from the checks it runs, in `.factory/failures.jsonl`, and a kind of finding seen three times becomes a check, hook or test instead of a written lesson. Old proposals are in `archive/`, and those never committed are in `.factory/archive/`.

## Where accepted lessons go

One file for each lane, `<lane>.md`, and `all-lanes.md` for what every agent should know. `factory-fixed.md` records faults in the factory itself that were fixed; no agent needs to act on those.

The lessons for an agent's lane, and those for every lane, are handed to it at the start of each run as data about the past.
