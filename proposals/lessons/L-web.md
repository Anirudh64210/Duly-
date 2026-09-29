# Lessons for L-web

Proposed filing, 2026-09-29. Not in force until the founder accepts it.

## 2026-09-28-openapi-bare-object-types

- What went wrong: openapi-typescript turns a bare "type: object" into Record<string, never>, so the parser could not be type checked against the generated types, the pattern used in status.ts.
- What fixes it: Use the generated paths only for the route name (satisfies keyof paths), mirror the json schema in zod with strictObject, and prove the parser against real engine output.
- Evidence: web/PROGRESS.md; web/src/lib/api-types.ts, operations.computeF1; web/src/lib/compute.ts.
