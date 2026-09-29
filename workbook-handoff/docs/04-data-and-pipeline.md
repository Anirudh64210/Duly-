# Data model and pipeline

## Event (raw, from a source)

```
Event {
  id            string   stable per source (e.g. github:commit:<sha>)
  source        enum     github | calendar | meet | slack | notion | linear | figma | git-local | manual
  kind          string   commit | pr-opened | pr-merged | meeting | call | message | page-edit | issue-closed | check-in | check-out | note
  at            datetime start (UTC, stored with the user's zone)
  until         datetime optional end (meetings, calls)
  title         string   commit message, meeting title, issue title. No message bodies, no document bodies.
  url           string   deep link back to the source
  people_count  int      attendees or recipients, never names unless the user turns on content
  raw_hash      string   sha256 of the normalized event, for the seal
}
```

Rules: read-only OAuth scopes, metadata only, and the raw event is never mutated. A source can be disconnected; its events stay.

## Block (a timesheet line)

```
Block {
  id            string
  date          date
  start, end    time
  hours         decimal (1 place)
  text          string   "work performed"
  duty_id       string | null
  origin        enum     ai | user | source   (ai = drafted from events; user = typed or edited; source = pure meeting)
  edited        bool
  event_ids     string[] the evidence behind the line
  status        enum     draft | confirmed
}
```

Block building rules (v1):
- Meetings and calls are their own blocks with calendar or Meet times.
- Other events within 45 minutes of each other join one block; the block starts at the first event minus 10 minutes (capped at check-in) and ends at the last event plus 10 minutes (capped at check-out or the next block).
- A block with no events after 45 minutes closes.
- Manual check-in and check-out bound the day when present; otherwise the first and last events do.
- Hours are rounded to 0.1.

## Day

```
Day {
  date          date
  blocks        Block[]
  note          string | null   "Day off", "Sick", "Travel"
  status        enum     open | complete
  completed_at  datetime | null
  root          string | null   Merkle root over block hashes and the note
  anchor        object | null   { method: "opentimestamps", proof: bytes, at }
}
```

## Amendment (never overwrite)

```
Amendment {
  id, at, target (block id | day | case field), before, after, reason (string | null), by: "user"
}
```

History is the ordered list of amendments plus system events (day completed, document opened, export created, link revoked, setting changed).

## Case profile (from setup)

```
Case {
  status        opt | stem | cpt | h1b | o1 | none
  status_from, status_to
  work_type     w2 | c1099 | founder | unpaid
  title, org, start_date
  hours_target  int   20 default for OPT/STEM
  field         sw | ml | ds | rs | biz | ot
  degree        string
  duties        [{ id, text, courses: string[] }]
  sources       [{ source, enabled }]
  privacy       { ai_on_device, read_content }
}
```

Planned: `cases: Case[]` for people with more than one role.

## Documents

Encrypted blobs on disk, one per file, with a sidecar index: name, type (ead, i20, sevp-report, ein, articles, license, offer, i983, bank, other), added_at, version, sha256, include_in_exports (bool), last_opened_at. Names are stored encrypted too so the locked list can only show blurred placeholders.

Lock state: unlocked for N minutes (default 5) after passphrase or biometric; every open is logged when the privacy switch is on.

## Storage

- `~/WorkBook/` is the user's folder. `days/YYYY-MM-DD.md` (human-readable day file), `log.csv` (regenerated), `documents/` (encrypted), `exports/`, `history.jsonl` (append-only).
- The app's own database is SQLite (encrypted with SQLCipher or equivalent), keyed from the OS keychain. The Markdown and CSV are derived views so the user never needs the app to read their record.
- Nothing is synced by default. Optional end-to-end encrypted backup to the user's own Drive, iCloud, or S3 with a passphrase they hold.

## Sealing

- On "Mark day complete": hash every block (canonical JSON), build a Merkle root with the note, store it on the Day, append a History line.
- Optional anchor: submit the root to OpenTimestamps calendar servers (free, no account). Only the 32-byte hash leaves the device. The `.ots` proof is stored alongside and included in exports.
- "Check nothing changed": recompute every hash and root and compare. Amendments are expected and listed; a mismatch on an unamended item is flagged.
- Exports include `manifest.sha256` and a small standalone `verify.py`.

## AI

- Default: on-device (Apple Foundation Models on macOS 26+; Ollama elsewhere).
- Input to the drafter is one block's events (titles, sources, times) plus the duty list. Output is one line, at most 12 words, plus a duty id or null. See `08-prompts.md`.
- Never given: message bodies, document contents, other people's names.
- Cloud (user's own key) only for the monthly narrative, and only if the user turns it on.

## Exports

Pack contents in order: summary page (role, org, dates, weekly hours table), timesheet (date, start, end, hours, work performed, duty, origin), source records (one section per source, event list with links), documents (in the user's chosen order), extras, method note, `manifest.sha256`, `proofs/*.ots`, `verify.py`.

Formats: zip (PDF plus the files), folder (same, unzipped), link (read-only web view of the same pack; access by allow-listed emails or anyone with the link; expiry; revocable).

Options: note AI-drafted entries (default on; this is the method note), hide other people's names (default on), include edit history (default off).

## Sources: v1 scope and notes

| Source | v1 | Notes |
|---|---|---|
| Google Calendar | yes | events.readonly |
| Google Meet | yes | Meet REST API conference records: actual join and leave |
| GitHub | yes | commits, PRs, reviews via user token; local git watcher optional |
| Slack | yes | users.conversations plus search.messages for the user's own messages; optional chat.write to one channel for the daily post |
| Linear, Notion | v1.1 | simple APIs |
| Gmail | no | restricted scopes need Google verification and a security assessment |
| Zoom, Outlook, Teams | later | |
| Figma, Drive activity | later | |

Daily Slack post (optional): after the day is marked complete, post "Tue Oct 6, 6.2 h" plus the entry texts to one channel the user picks. The Slack timestamp becomes third-party corroboration.
