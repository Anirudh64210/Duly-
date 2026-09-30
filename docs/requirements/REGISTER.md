# Requirements register

Every requirement in the project's own documents and in the founder's decisions, checked against the repository by agents that did not build it. A requirement is met only when a file or a test is named that proves it.

Audited 2026-09-29. 2456 requirements.

| Status | Count |
|---|---|
| Met | 349 |
| Partly built | 482 |
| Not started | 1267 |
| Deferred | 234 |
| Overridden by a decision | 124 |

Of the 2098 that the first version must hold, 349 are met: 17%.

## By kind

| Kind | Met | Partly built | Not started | Share met |
|---|---|---|---|---|
| product | 11 | 39 | 127 | 6% |
| engine | 66 | 54 | 41 | 41% |
| updates | 1 | 36 | 36 | 1% |
| security | 16 | 30 | 116 | 10% |
| privacy | 3 | 21 | 117 | 2% |
| legal | 33 | 66 | 91 | 17% |
| design | 57 | 73 | 102 | 25% |
| factory | 110 | 80 | 36 | 49% |
| testing | 30 | 39 | 49 | 25% |
| ops | 15 | 18 | 60 | 16% |
| email | 1 | 7 | 58 | 2% |
| workbook | 4 | 10 | 409 | 1% |
| desktop | 2 | 9 | 25 | 6% |

## By document

| Part | Met | Partly built | Not started | Share met |
|---|---|---|---|---|
| canvas | 11 | 28 | 88 | 9% |
| design-screens | 32 | 46 | 312 | 8% |
| founder-decisions | 80 | 99 | 115 | 27% |
| gates-factory | 97 | 73 | 39 | 46% |
| plan-core | 42 | 58 | 138 | 18% |
| research-backend-market | 54 | 57 | 79 | 28% |
| research-compliance | 6 | 46 | 82 | 4% |
| security-email-loops | 8 | 35 | 120 | 5% |
| workbook-handoff | 19 | 40 | 294 | 5% |

## How to use this

- Before writing a SPEC, read the rows for its area in register.json.
- Every SPEC names the requirement ids it covers, under the heading "Covers", and says what share of the whole that is.
- When work lands, the rows it covers are audited again by an agent that did not build it, and this file is built again.
- `uv run python -m tools.requirements.register check` runs in gate 7.
