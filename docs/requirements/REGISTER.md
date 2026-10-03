# Requirements register

Every requirement in the project's own documents and in the founder's decisions, checked against the repository by agents that did not build it. A requirement is met only when a file or a test is named that proves it.

Audited 2026-09-29. 2510 requirements.

| Status | Count |
|---|---|
| Met | 454 |
| Partly built | 489 |
| Not started | 1204 |
| Deferred | 236 |
| Overridden by a decision | 127 |

Of the 2147 that the first version must hold, 454 are met: 21%.

## By kind

| Kind | Met | Partly built | Not started | Share met |
|---|---|---|---|---|
| product | 37 | 44 | 106 | 20% |
| engine | 86 | 63 | 35 | 47% |
| updates | 2 | 35 | 38 | 3% |
| security | 16 | 30 | 117 | 10% |
| privacy | 3 | 22 | 120 | 2% |
| legal | 35 | 68 | 89 | 18% |
| design | 109 | 63 | 61 | 47% |
| factory | 109 | 80 | 37 | 48% |
| testing | 32 | 39 | 49 | 27% |
| ops | 15 | 18 | 60 | 16% |
| email | 1 | 7 | 58 | 2% |
| workbook | 4 | 10 | 409 | 1% |
| desktop | 5 | 10 | 25 | 12% |

## By document

| Part | Met | Partly built | Not started | Share met |
|---|---|---|---|---|
| canvas | 77 | 16 | 34 | 61% |
| design-screens | 42 | 43 | 305 | 11% |
| founder-decisions | 97 | 119 | 118 | 29% |
| gates-factory | 95 | 72 | 38 | 46% |
| plan-core | 46 | 57 | 135 | 19% |
| research-backend-market | 54 | 58 | 78 | 28% |
| research-compliance | 6 | 46 | 82 | 4% |
| security-email-loops | 8 | 35 | 120 | 5% |
| spec-w2 | 11 | 2 | 0 | 85% |
| workbook-handoff | 18 | 41 | 294 | 5% |

## How to use this

- Before writing a SPEC, read the rows for its area in register.json.
- Every SPEC names the requirement ids it covers, under the heading "Covers", and says what share of the whole that is.
- When work lands, the rows it covers are audited again by an agent that did not build it, and this file is built again.
- `uv run python -m tools.requirements.register check` runs in gate 7.
