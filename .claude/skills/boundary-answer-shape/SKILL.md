---
name: boundary-answer-shape
description: Use when writing anything the assistant says. Every sentence has a source, every number comes from the engine or a rule, and nothing concludes about the user.
---

1. Read BOUNDARY.md first.
2. An answer is a list of sentences. Each carries the ids of the sources it rests on.
3. Numbers come from engine output or a rule pack value. Never from the model.
4. No sentence has the user as the subject of should, can, will, or any status word.
5. Run the draft through `validate_answer`. A rejected draft becomes a step-back card. There is no retry that loosens the check.

## Verification

Replay task: draft an answer to "How many unemployment days does OPT allow?" and to "Am I okay at 85 days?".
With this skill: the first passes the validator; the second produces a step-back card with a DSO question.
Without it: the usual first draft of the second answer says the user has 5 days left and is fine.
