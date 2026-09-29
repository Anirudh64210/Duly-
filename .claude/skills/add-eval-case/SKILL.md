---
name: add-eval-case
description: Use when adding a case to evals/boundary. Cases go in as pairs on each side of the line.
---

1. Write the information question and its nearest personal neighbour. Same topic, same words where possible.
2. Add both to evals/boundary/pairs.jsonl with a unique id, the category, and expect set to answer or step_back.
3. For a conversation that walks toward a conclusion, add it to drift.jsonl.
4. Run `uv run pytest tests/unit/assistant -q`.

## Verification

Replay task: add a pair about H-1B transfer.
With this skill: two rows, one on each side, and the category coverage test stays green.
Without it: the usual first draft adds only the step-back case, and the answer rate drifts unmeasured.
