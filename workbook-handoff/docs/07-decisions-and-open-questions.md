# Decisions, rejections, and open questions

## Decided

| Decision | Choice | Why |
|---|---|---|
| Name | WorkBook (parent: Duly) | Founder's call, 2026-09-28 |
| Capture method | Pull from tools; no screenshots or screen recording | Third-party timestamps are credible; screenshots are easy to fake and a privacy liability |
| Data location | Local-first, encrypted, keys in OS keychain | Trust; also avoids Google's server-side restricted-scope assessment |
| Content vs metadata | Metadata only by default | Privacy, smaller attack surface, less to explain to USCIS |
| AI role | Drafter of one-line summaries from cited events; never facts, never argument; marked forever | Misrepresentation is permanent inadmissibility |
| Where AI runs | On device by default; user's own cloud key only for monthly narrative | Privacy, cost, trust |
| Editing | Pencil beside every field, inline, Save and X, bin away from the cursor | Founder feedback across three rounds |
| Record integrity | Amendments with before and after; nothing overwritten; daily hash root; optional OpenTimestamps anchor | Evidence value |
| Navigation | Side panel: Today, Log, Documents, Exports, Your case; History under Log | Founder rejected top tabs as hard to reach |
| Log structure | One row per calendar day, every day present, month sections; details on click | Modeled on Photos (years, months, days) |
| Log filters | One icon, one popover: dates, tools (multi), show; live count; removable chips | Founder rejected always-visible filter rows |
| Documents | Locked by default with blurred names; unlock by passphrase or Touch ID; auto-lock | Founder asked how locked looks; wanted visible but protected |
| Exports | Two choices (Everything, Custom), then Preview, then Zip, Folder, or Link with access control | Three-card version was "confusing" |
| Feedback | Sidebar bottom: Request a tool, Problem, Idea; no records sent | Founder request |
| Tone | Calm record keeping; RFE is one line at the bottom of Exports | Founder: "tone it down" |
| Gmail | Out of v1 | Restricted scopes |
| First sources | Google Calendar, Google Meet, GitHub, Slack | Highest signal, easiest APIs |

## Rejected (do not reintroduce)

- Filters on Documents or Exports pages beyond what the flow needs.
- Subheadings, eyebrow labels, and grey caption text under rows.
- A "Review queue" screen with badges (v1). Replaced by inline confirmation on Today.
- "Sealed" and cryptographic language in the UI. Use "saved with a timestamp" and "check nothing changed."
- A share link offered before a pack is built. The link is a delivery option after Preview.
- Default-selected export month that the user did not choose.
- Delete placed under the pencil's position.
- 24/7 screen capture (screenpipe or Recall style).

## Open

1. Platform for v0: native macOS (Swift, Foundation Models) or Tauri and Rust with Ollama. Founder leans toward macOS first; not final.
2. Manual check-in and check-out: keep as an optional anchor, or derive the day purely from events.
3. Amendments: require a reason always, or make it optional. Prototype makes it optional.
4. RFE response builder: designed in principle (see 05), not yet on a screen.
5. Menu bar popover and daily Slack post: not yet designed in the WorkBook style.
6. Duly's vault and WorkBook's Documents: one store is the plan; confirm the ownership split.
7. Multiple roles per user: schema allows a list; UI not designed.
8. Attorney review of the evidence schema and the method note wording before public release.
