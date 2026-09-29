# Requirements register

Every requirement in the project's own documents and in the founder's decisions, checked against the repository by agents that did not build it. A requirement is met only when a file or a test is named that proves it.

Audited 2026-09-29. 2432 requirements.

| Status | Count |
|---|---|
| Met | 325 |
| Partly built | 491 |
| Not started | 1258 |
| Deferred | 234 |
| Overridden by a decision | 124 |

Of the 2074 that the first version must hold, 325 are met: 16%.

## By kind

| Kind | Met | Partly built | Not started | Share met |
|---|---|---|---|---|
| product | 10 | 39 | 124 | 6% |
| engine | 60 | 60 | 39 | 38% |
| updates | 1 | 36 | 36 | 1% |
| security | 16 | 30 | 115 | 10% |
| privacy | 3 | 21 | 114 | 2% |
| legal | 30 | 67 | 91 | 16% |
| design | 46 | 78 | 102 | 20% |
| factory | 107 | 77 | 36 | 49% |
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
| founder-decisions | 56 | 108 | 106 | 21% |
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
