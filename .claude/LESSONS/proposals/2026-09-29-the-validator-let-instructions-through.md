date: 2026-09-29
lane: founder, found by the audit of the WorkBook handoff
commit: see git log for assistant/boundary.py
failure: The answer validator refused "you should file" and let through "File this form now." and "It is best to file early." It looked for a conclusion with the person as its subject and had no check for an instruction or for advice with no subject. Nothing had tested answers; the eval set held questions only.
fix: The validator refuses any clause that opens with an action, and advice phrased without a subject. The one instruction it lets through is to take the question to the DSO or an attorney. evals/boundary/answers.jsonl holds 31 answers on both sides of the line.
evidence: docs/requirements/parts/workbook-handoff.json, WB06-068 and WB08-031
verification_task: Write an answer that tells a person to file, in five phrasings, and confirm each is refused.
