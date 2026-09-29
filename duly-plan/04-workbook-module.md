# 04 WorkBook Module Plan

Binding source: workbook-handoff/. This file only maps it into the Duly build; on any conflict the handoff wins, and the founder arbitrates.

## Placement
Optional module, exactly as decided. Entry is the intro gate ("Working a job, a contract, or your own thing?"), Set up WorkBook or Not now. Never a default, never nagged. Sidebar item present for everyone; state machine: intro → setup (sources) → live.

## v0 slice
- Manual first: check-in and check-out optional anchors kept (handoff open item 2 resolved for v0 as: keep, optional), typed entries, Mark day complete, amendments with optional reason (open item 3 resolved for v0 as optional), History.
- Sealing per handoff 04: canonical JSON block hashes, day Merkle root with note, history.jsonl, days markdown and log.csv derived views, verify.py in exports; OpenTimestamps anchor behind a setting, default on, only the 32-byte root leaves the device.
- Exports: Everything or Custom, Preview with method note (template verbatim from handoff 08), Zip, Folder, or Link (allow-listed emails or anyone, expiry, revocable). Link packs upload only the built pack to S3 under a per-link key; revoke deletes.
- Sources behind a flag, in this order when enabled: Google Calendar, Google Meet, GitHub, Slack (scopes exactly as the handoff table; Gmail stays out). Event model, block-building rules (45 min join, plus-minus 10 min caps, 0.1 h rounding) implemented verbatim in desktop/main with property tests mirroring the rules.
- AI drafter and duty mapper: on-device only, prompts verbatim from handoff 08, UNCLEAR path honored, star semantics per design rule 5. Monthly narrative deferred.

## Duly integration (handoff 06 boundary, implemented)
- Bridge API v1 as specified; Duly web consumes GET /days summaries and weekly hours for Home and Timeline coverage ("WorkBook recording, N weeks").
- Server sync is opt-in and summary-only: date, hours, entry count, completed flag. Entry texts sync only if the user enables it; document blobs never.
- One shared encrypted document store and one lock, ownership split per handoff; Duly vault UI reads the shared index through the bridge on desktop.
- Web-only users get manual day entry posting the same summary shape to the server; clearly labeled as not source-backed.

## Evidence pack meets Duly exports
The checklist step "Assemble your evidence pack" opens WorkBook Exports with a Duly preset (degree relatedness section from duties, hours table, employer record) so the RFE and STEM reporting packs are one flow, not two products.

## Tests specific to this module
- Golden days: fixture event streams → expected blocks and hours (byte-stable canonical JSON)
- Property: block rules invariants (no overlap, day bounds respected, rounding)
- Seal round trip: complete, amend, check-nothing-changed flags exactly the unamended mismatch and lists amendments
- Export verify: built pack passes its own verify.py in CI
- Copy lint: forbidden words (sealed, cryptographic, AI-generated, success adjectives, legal words) fail the build in module strings and prompts
- Bridge contract tests from workbook_bridge.schema.json

## Later (tracked, not now)
Menu bar popover, daily Slack post, supervisor and DSO links reusing export links, multiple cases, RFE response builder screen, cloud backup with user-held keys, macOS-native rewrite decision (open item 1 stays open; Electron chosen for v0 to share the stack).
