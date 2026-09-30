# Requirements register

Every requirement in the project's own documents and in the founder's decisions, checked against the repository by agents that did not build it. A requirement is met only when a file or a test is named that proves it.

Audited 2026-09-29. 2461 requirements.

| Status | Count |
|---|---|
| Met | 434 |
| Partly built | 477 |
| Not started | 1190 |
| Deferred | 236 |
| Overridden by a decision | 124 |

Of the 2101 that the first version must hold, 434 are met: 21%.

## By kind

| Kind | Met | Partly built | Not started | Share met |
|---|---|---|---|---|
| product | 36 | 41 | 104 | 20% |
| engine | 72 | 58 | 31 | 45% |
| updates | 1 | 36 | 36 | 1% |
| security | 16 | 30 | 116 | 10% |
| privacy | 3 | 21 | 117 | 2% |
| legal | 35 | 66 | 89 | 18% |
| design | 109 | 63 | 61 | 47% |
| factory | 110 | 79 | 35 | 49% |
| testing | 30 | 39 | 49 | 25% |
| ops | 15 | 18 | 60 | 16% |
| email | 1 | 7 | 58 | 2% |
| workbook | 4 | 10 | 409 | 1% |
| desktop | 2 | 9 | 25 | 6% |

## By document

| Part | Met | Partly built | Not started | Share met |
|---|---|---|---|---|
| canvas | 77 | 16 | 34 | 61% |
| design-screens | 42 | 43 | 305 | 11% |
| founder-decisions | 86 | 110 | 103 | 29% |
| gates-factory | 97 | 72 | 38 | 47% |
| plan-core | 46 | 57 | 135 | 19% |
| research-backend-market | 54 | 57 | 79 | 28% |
| research-compliance | 6 | 46 | 82 | 4% |
| security-email-loops | 8 | 35 | 120 | 5% |
| workbook-handoff | 18 | 41 | 294 | 5% |

## How to use this

- Before writing a SPEC, read the rows for its area in register.json.
- Every SPEC names the requirement ids it covers, under the heading "Covers", and says what share of the whole that is.
- When work lands, the rows it covers are audited again by an agent that did not build it, and this file is built again.
- `uv run python -m tools.requirements.register check` runs in gate 7.
