date: 2026-09-28
lane: L-web
commit: 07ffcc7
failure: openapi-typescript turns a bare "type: object" into Record<string, never>, so the parser could not be type checked against the generated types, the pattern used in status.ts.
fix: Use the generated paths only for the route name (satisfies keyof paths), mirror the json schema in zod with strictObject, and prove the parser against real engine output.
evidence: web/PROGRESS.md; web/src/lib/api-types.ts, operations.computeF1; web/src/lib/compute.ts.
verification_task: Add a parser for a route whose OpenAPI body is a bare object and show that a malformed response is refused.
seen: 1
curation: stays a lesson. The lasting fix is outside this lane: contracts/openapi.yaml should reference the two json schemas and give the 422 a body shape (request 2 in web/PROGRESS.md).
