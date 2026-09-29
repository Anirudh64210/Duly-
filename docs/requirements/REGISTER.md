# Requirements register

Every requirement in the project's own documents and in the founder's decisions, checked against the repository by agents that did not build it. A requirement is met only when a file or a test is named that proves it.

Audited 2026-09-29. 1829 requirements.

| Status | Count |
|---|---|
| Met | 254 |
| Partly built | 360 |
| Not started | 1009 |
| Deferred | 163 |
| Overridden by a decision | 43 |

Of the 1623 that the first version must hold, 254 are met: 16%.

## By kind

| Kind | Met | Partly built | Not started | Share met |
|---|---|---|---|---|
| product | 8 | 30 | 71 | 7% |
| engine | 47 | 39 | 33 | 39% |
| updates | 1 | 23 | 20 | 2% |
| security | 16 | 24 | 94 | 12% |
| privacy | 3 | 12 | 76 | 3% |
| legal | 24 | 50 | 60 | 18% |
| design | 36 | 59 | 64 | 23% |
| factory | 76 | 61 | 33 | 45% |
| testing | 25 | 28 | 33 | 29% |
| ops | 11 | 10 | 37 | 19% |
| email | 1 | 6 | 56 | 2% |
| workbook | 4 | 9 | 407 | 1% |
| desktop | 2 | 9 | 25 | 6% |

## By document

| Part | Met | Partly built | Not started | Share met |
|---|---|---|---|---|
| design-screens | 32 | 46 | 312 | 8% |
| founder-decisions | 56 | 108 | 106 | 21% |
| gates-factory | 97 | 73 | 39 | 46% |
| plan-core | 42 | 58 | 138 | 18% |
| security-email-loops | 8 | 35 | 120 | 5% |
| workbook-handoff | 19 | 40 | 294 | 5% |

## How to use this

- Before writing a SPEC, read the rows for its area in register.json.
- Every SPEC names the requirement ids it covers, under the heading "Covers", and says what share of the whole that is.
- When work lands, the rows it covers are audited again by an agent that did not build it, and this file is built again.
- `uv run python -m tools.requirements.register check` runs in gate 7.
