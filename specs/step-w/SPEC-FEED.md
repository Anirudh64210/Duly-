# The rules and news feed: Duly stays current on the device

Status: approved by D90 and D91 (2026-10-01): the recommendations of points 68 to 86 are accepted as
written, except the hardware key (point 83), still open; D90 records point 82 and D91 decides point
77. Amended on 2026-10-03 by D97 (what an update may say, points 35, 38 and 48; a stale or litigated
rule holds only the items it touches, points 30, 33 and 64), D98 (nothing to sign up for: what runs
on this Mac now, what waits, and the 7-day recheck until the feed exists, section 13) and D99 (the
founder's next test, point 66). Revised 2026-10-01 after two reviews (security and legal line;
buildability), see "Review notes" at the end. Written by the founder lane from DECISIONS.md D2, D22,
D29, D65, D79 to D89, BOUNDARY.md, SPEC-W1, SPEC-W2, specs/updates-1/SPEC.md, and three research
passes run on 2026-10-01 and 2026-10-02 UTC (official sources, signing, fit with the code on branch
`step-w`). F-1 only (D89). Builds on SPEC-W1 (the bundled engine over a private socket) and SPEC-W2
(the engine bridge, `GET /v1/updates`, the Updates screen of W2-P7).

Plans in this SPEC are always written FEED-P0a, FEED-P1 and so on; W2's plans are W2-P1 to W2-P12,
and W2's rule-pack codes P1 to P12 are never meant here.

A **pack id** is `<category>-<jurisdiction>` as the pack declares them (`f1-us` for the F-1 pack,
whose `category` is `f1` and `jurisdiction` is `us`). Every feed path and record uses the pack id.

## The goal in one breath

Once a day the installed app downloads one public, signed feed: the newest F-1 rule pack, a daily
record that the sources behind it were watched and showed no change, and the law updates the
founder approved. Main checks every signature and hash, installs the files into userData in one
atomic step, and the engine reads the newest valid pack. A pack stays fresh while the daily record
keeps coming; when a source changes, its row is withheld and the items that rest on its rules
wait (Can't tell yet) until the founder reviews it, while every other item keeps its date (D97,
point 64). An approved update saying the law changed, before a pack carries the change, holds
the items that read the changed rules the same way. Late, never wrong. Nothing from the
student's records is sent: every device downloads the same files. Until the feed's hosting
exists (D98), the founder lane rechecks the sources on this Mac and rebuilds the app at least
every 7 days (section 13).

## Why now

- Rules go stale and nothing refreshes them. The F-1 pack's oldest `checked_on` was 2026-09-28
  when this was written, and
  `engine/verdict.py:13` makes a verdict `cannot_tell` with `rules_stale` when today minus that date
  is more than 7 days. Every F-1 verdict on every installed build turns Can't tell yet on
  **2026-10-06**. No plan in this SPEC can ship before then; point 55 (FEED-PA) is the bridge.
  (2026-10-03: FEED-PA ran on the fetches of 2026-10-02 and 2026-10-03, the pack's oldest
  `checked_on` is now 2026-10-02, and the next cliff is **2026-10-10**. Until the feed exists,
  the recheck repeats at least every 7 days, D98; section 13 says what happens on each date.)
- The law has moved since the pack was reviewed (research, 2026-10-01):
  - D. Mass. docket 74661796: ECF 53, a notice of appeal from the ECF 50 order, filed 2026-09-30;
    ECF 55, First Circuit case 26-2112. No stay of the injunction appears in the listing. The
    pack's SOURCES.md says no appeal was found.
  - eCFR shows a new version of 8 CFR 214.2 dated 2026-09-30. Paragraph (f) is the same, character
    for character, as the 2026-09-15 text; the change is an H-2B paragraph.
  - USCIS policy alert PA-2026-15, "Definition of Day for Purposes of Filing Deadlines" (8 CFR
    1.2), issued 2026-09-23, effective 2026-10-23. The pack has no row for 8 CFR 1.2.
  None of these is acted on here. Each goes through the founder (points 69 to 71).

## What this is not

- Not an app updater. The app binary is not replaced; only rule packs, check records and
  published updates. A Squirrel update of the app stays under SPEC-W1 "Later" (but see point 85).
- Not H-1B, O-1 or EB-1A. Their packs hold no rules; they stay bundled and say their rules are
  coming (D89). The feed's format holds any pack id; only `f1-us` is published.
- Not a model in the app. Models read public law text only, only in the updates pipeline that runs
  in the feed repository (BOUNDARY "Where the assistant runs"), and only from FEED-P9, if approved.
- Not a server that knows students. The feed is static files on GitHub Pages. No account, no
  query string, no category, no identifier is sent (D84). The network still sees the request
  (point 40).
- Not anything that needs an account, a login or a payment to build (D98). The plans, or parts of
  plans, that need one wait until the founder chooses otherwise; the rest runs on this Mac now
  (section 13).

## Decisions this serves

D88 (a signed feed of rule packs and published updates, checked once a day, public GitHub
repository for now, Duly's AWS later, the signing key with the founder), as D90 amends it: founder
keys sign every rule pack and every update, and a CI key signs only the daily check record (point
82). D91 (the daily check on by default once setup has shown the disclosure line, point 77). D89
(F-1 complete first), with D99's test point (point 66). D2 and D22 (primary sources, accuracy over
speed, founder approval is the final pass). D1 and D56 (legal status in plain words, from the
court's own record). D65 (a stale regime makes only the litigated items Can't tell yet), extended
by D97(3): a stale, held, superseded or litigated rule holds only the items it touches (point 64).
D97(2) (an update says what is happening, whether it touches the student's record, and anything
to do as the primary source states it, or "Nothing now"; never a recommendation or reassurance;
points 35 and 38). D98 (every step of the build runs on this Mac; the feed's hosting waits;
section 13). D84 (local-only, open source: no student data leaves the device). CLAUDE.md hard rules:
`publish_blockers` returns nothing before any update is shown; every rule has a primary source and
one of the five tags; conflicting means `cannot_tell`; a verdict never falls back to the quiet
state.

---

## 1. The feed repository

1. **A separate public repository, `duly-feed`, served by GitHub Pages at
   `https://feed.tryduly.co/v1/`.** It holds public law text, Duly's summaries, signed metadata
   and the daily logs. It never holds anything about a student, a device or a download. The custom
   domain (D87's tryduly.co) means the move to Duly's AWS later is a DNS change, not an app update;
   the app trusts the pinned keys, never the host. The domain is verified in the GitHub
   organization settings, so a later Pages change cannot leave a CNAME another account can claim.
   `raw.githubusercontent.com/<owner>/duly-feed/served/` is the fallback mirror (the `served`
   branch, point 2). Repository name, owner and domain: point 76. The repository, the domain
   and its DNS wait until the founder chooses to host the feed (D98, section 13).
   - Checked by (offline, in the jail): `tests/unit/pipeline/test_feed_export.py` runs the export
     over the repo and fails if any file under the export holds student-shaped data: a top-level
     key from `contracts/case.schema.json` (`records` holding `categories` or `time_zone`, `sevis`,
     `confirmations`), or a path under userData, or an email address other than the one feed
     contact address (point 10). The pack's own `path.records` key is not student data and passes.
   - Checked by (founder, FEED-P5, network): `make feed-verify URL=https://feed.tryduly.co/v1/`
     (point 21) and the same command against the raw mirror both pass.
2. **The layout.** Two branches. `main` holds only what the founder merges; `served` holds only
   what is served and the logs, written by the CI and checked by signatures, never read back as
   input to a decision.

   | Branch and path | What it holds | Written by |
   |---|---|---|
   | main `metadata/<n>.root.json` | Every root version, kept forever | founder, offline, by PR |
   | main `metadata/<n>.targets.json` | Hashes of every pack and every update | founder, offline, by PR |
   | main `packs/<pack id>/<ver>/` | parameters.yaml, SOURCES.md, CHANGELOG, as exported | export, founder PR |
   | main `sources/<pack id>/<ver>/` | The saved copies the quotes are found in (never shipped to the app) | export, founder PR |
   | main `updates/<id>.json` | Founder-signed updates only, the source of the update targets | founder PR |
   | main `withdrawn/<id>.json` | Tombstones for withdrawn updates | founder PR |
   | main `watch/register.json` | Every source, its kind, its currency check, the rules on it | export (points 16, 18) |
   | main `watch/sources.yaml` | The news triggers and the named dockets (point 18) | export |
   | main `watch/baselines.json` | The last reviewed version or text hash of each source | CI proposes by PR, founder merges |
   | main `watch/seen.json` | Items the news detector has already reported (point 6) | CI proposes by PR, founder merges |
   | main `review/open.yaml` | Changes waiting for the founder | CI proposes by PR, founder merges |
   | main `tools/` | The export set of point 3 at the commit in `EXPORTED_FROM` | export |
   | main `.github/workflows/` | Copied from Duly's `.github/feed-workflows/` | founder |
   | served `published/metadata/` | Root and targets copied from main; `<n>.checks.json`, `<n>.snapshot.json`, `timestamp.json` | CI key (C-signed files only) |
   | served `published/targets/packs/<pack id>/<ver>/<sha256>.parameters.yaml` | The rule pack | copied from main |
   | served `published/targets/checks/<sha256>.<pack id>.json` | The day's check record (section 4) | CI key |
   | served `published/targets/updates/<sha256>.<id>.json`, `withdrawn/<sha256>.<id>.json` | Approved updates and tombstones | copied from main |
   | served `log/<YYYY-MM-DD>.jsonl` | Each run: every fetch, result and reason | CI |

   Pages deploys from `served/published/`. Only `parameters.yaml` of a pack reaches the app, as
   `desktop/python/bundle.json` already does; the saved sources (about 6.9 MB) stay on main for
   anyone to audit. Drafts never enter the feed repository: an update not yet approved stays in
   Duly's `pipeline/drafts/` (point 15 review note).
   - Checked by: test_feed_export.py (the export over a fixture repo gives exactly the main tree;
     the served tree from `pipeline/feed/build.py` holds only metadata, hash-named targets and
     `log/`).
3. **The tools are Duly's, copied in.** The feed repository runs only code exported from this
   repository at a recorded commit, so anyone can re-run a day's checks and compare the result
   with the signed record. The export set, exactly: `tools/sources/`, `watch/`, `pipeline/feed/`,
   `engine/__init__.py`, `engine/updates.py`, `assistant/__init__.py`, `assistant/boundary.py`,
   `tools/copy_lint/`, `contracts/update.schema.json`, `contracts/feed_check.schema.json`,
   `contracts/feed_target.schema.json`, `contracts/rulepack.schema.json`,
   `contracts/product_settings.yaml`, and `pipeline/models/` only once FEED-P9 is approved. The
   Duly repository stays the place where rule packs are written and tested (L-content,
   `rulepacks/`).
   - Checked by: offline, test_feed_export.py (two exports from the same commit are byte-identical;
     `EXPORTED_FROM` is written; the gate commands of point 8 run inside the exported tree and
     pass). In the feed repository, `EXPORTED_FROM` names a commit reachable from Duly's `main`;
     gate.yml (point 8) re-exports from that commit and fails on any difference under `tools/`.

## 2. The jobs (GitHub Actions in the feed repository)

The workflow files are written by the founder lane in this repository at
`.github/feed-workflows/` (a protected path, so no implementation lane edits them) and copied into
the feed repository by the export. Each workflow only calls tested code (point 53's L-pipeline
modules); no decision is made in YAML. Rules for every workflow:

- `permissions: {}` at the top; each job asks only for what it needs; `pages: write` and
  `id-token: write` only on the deploy job; every action pinned by a 40-hex commit SHA, and every
  `setup-*` tool version pinned with its checksum.
- No `pull_request_target`, `workflow_run` or `issue_comment` trigger. Fork PRs get no secrets.
- No `${{ github.event.* }}` or `${{ steps.*.outputs.* }}` inside a `run:` step; such values pass
  through `env:`. Issue titles and bodies come from FR, RSS and docket text and are never
  interpolated into a shell.
- Python is installed with `uv sync --frozen` from a hash-locked lock file. Logs print no secret.
- `main` is protected: a PR with the founder's review is required, the gates are required checks,
  force push is off, and no actor (Actions included) may bypass. The CI never pushes to `main`; it
  opens PRs with a GitHub App token scoped to pull requests and issues only (point 86), so the
  required checks run on them. The CI pushes only to `served`.
- freshness.yml, publish.yml and the hold job share one concurrency group,
  `cancel-in-progress: false`, so snapshot and timestamp versions never race.

4. **`freshness.yml`, daily, no model.** `cron: '23 11 * * *'` (after the Federal Register's
   morning release) plus a watchdog at `'47 17 * * *'` that exits at once if today's record exists.
   Two jobs:
   - Job `fetch`, environment `fetch` (the CourtListener token, point 79), no signing key,
     `timeout-minutes: 20`, `contents: read`. Runs `watch/fresh.py` over `watch/register.json`
     (section 4): fetches, parses HTML and PDFs, computes the results, and uploads them as a
     results artifact. Runs `watch/report.py`, which writes the issue and PR bodies; a later step
     with the App token opens or updates one founder issue per withheld source (what changed and
     the rules on it) and one PR adding it to `review/open.yaml` with the before and after text,
     and a PR advancing `watch/baselines.json` where a newer version was found equal (point 16).
   - Job `attest`, environment `attest` (main branch only, holding key C), `needs: fetch`,
     `contents: write` on `served` only. A minimal hash-locked environment (python-tuf and its
     locked dependencies only). It runs only `pipeline/feed/attest.py`, which re-validates the
     results artifact against `contracts/feed_check.schema.json`, refuses results for a pack hash
     the founder's targets do not name, signs the check record, `checks.json`, `snapshot.json` and
     `timestamp.json` with C, and pushes them and the day's log to `served` (the push keeps the
     schedule alive, since GitHub turns off schedules after 60 days without activity). A deploy job
     then publishes Pages. This job fetches nothing from the sources and parses no HTML or PDF.
   The split keeps C out of reach of a parser bug or a poisoned package in the fetch job. It does
   not stop a compromised fetch job from producing false results; that is what point 13 bounds.
   - Checked by: `tests/unit/pipeline/test_feed_workflows.py` over planted fixture workflows and
     the real ones: it fails on a missing `permissions: {}`, an action not pinned by a 40-hex SHA,
     a `setup-*` without a pinned version, `pull_request_target`, `workflow_run`, `issue_comment`,
     any `${{ github.event` or `${{ steps.` inside `run:`, `pages: write` or `id-token: write`
     outside the deploy job, a secret outside its environment, a step that prints a secret name, a
     job holding C that runs anything but `pipeline/feed/attest.py` and git, any push to `main`, a
     workflow outside the shared concurrency group.
5. **A failure is never freshness.** A run that does not happen, a key that is missing, a source
   that is down, slow, rate limited, redirected off its host, larger than `watch.max_size_factor`
   times its saved size, empty, or not the right document (the scoped selector of point 16 does
   not match exactly once, or a quote is not found) gives no record for that source, so its rules
   age and go stale after 7 days. Coverage is contiguous or it is nothing: a source counts as
   `unchanged` only when the run covered every day from the end of the last signed record's
   coverage for it to today; any gap gives `unreachable`. The CI cannot make a rule fresh by
   failing.
   - Checked by: `tests/unit/pipeline/test_watch_fresh.py` with a local fake server on localhost
     (allowed by `tools/factory/jail.py:44-46`) and an injected clock and sleep: a 503, a 429, a
     redirect to another host, a page 10 times the saved size, the uscode maintenance page served
     with HTTP 200, the eCFR 406 without compression, a Cloudflare 403, a selector that matches
     twice, a coverage gap of one day; each gives `unreachable`, never `unchanged`. Thresholds are
     read from `contracts/product_settings.yaml` (point 51), never written in the test.
6. **`news-detect.yml`, no model.** Twice on weekdays (`'41 11 * * 1-5'`, `'41 21 * * 1-5'`) and
   daily for dockets (`'41 15 * * *'`), environment `fetch`, no signing key. It runs
   `watch/detect.py` over the triggers of point 18, removes items already in `watch/seen.json` (by
   FR document number, docket entry id, RSS guid), and opens one triage issue per new item with
   its primary-source link, through env values only. An issue is a candidate, never an update.
   Nothing it finds is shown to anyone until it passes section 6. The new seen items go in by a
   CI PR.
   - Checked by: `tests/unit/pipeline/test_watch_detect.py` over saved responses (an FR page with
     2026-18631, the D. Mass. docket entries with ECF 53, a USCIS alerts feed whose dates use a two
     digit year): each new item gives one candidate; a second run with the updated seen store
     gives none.
7. **`build.yml` and `publish.yml`.**
   - `build.yml`, on push to `main` touching `packs/`, `updates/` or `withdrawn/`: runs
     `pipeline/feed/build.py`, which builds the targets that `make feed-sign` will sign, and
     uploads their hashes as an artifact with a GitHub artifact attestation. Nothing is posted as
     issue text.
   - `publish.yml`, on push to `main` touching `metadata/` (a merged founder PR): checks the
     founder's signature against the keys in the current root, checks every target hash, re-runs
     the gates of point 8 over what the targets name, copies root, targets and targets files to
     `served`, signs a new snapshot and timestamp with C, and deploys Pages. The founder's keys
     never touch GitHub.
   - Checked by: test_feed_workflows.py (publish runs only on paths under `metadata/` and only on
     main; build uploads an attested artifact and writes no issue). After the first publish, the
     founder runs `make feed-verify` (FEED-P5, network); in the jail the same client runs against a
     localhost fixture server (point 21).
8. **`gate.yml`, on every PR.** Schema checks for packs, check records and updates; `python -m
   tools.sources.verify` (each quote found in its saved copy, primary hosts only); `python -m
   tools.sources.plain`; `python -m tools.copy_lint.lint` over every text file in the repository;
   `publish_blockers` (with the wording checks of point 35) over every file in `updates/`, which
   must return nothing at all: `not_approved_in_ops` fails the gate, since drafts never enter this
   repository; and the pack release gate: a PR that touches `packs/<pack id>/` fails while
   `review/open.yaml` has an open item for that pack, unless the PR resolves it. The checks are
   `pipeline/feed/gate.py`, so the workflow only calls tested code.
   - Checked by: test_feed_workflows.py (the gate job calls gate.py); `tests/unit/pipeline/
     test_feed_gate.py` (a fixture PR with an open item fails, the resolving PR passes; an update
     with `not_approved_in_ops` fails; an update headline "you must leave by" fails).
9. **`expiry.yml`, weekly, and the hold job.**
   - `expiry.yml` runs `pipeline/feed/expiry.py`, which opens a founder issue 14 days before the
     targets metadata or the root expires (point 75).
   - `hold.yml`, `workflow_dispatch` only, run by the founder from GitHub: signs with C a check
     record that marks every row of the named pack `hold`, and publishes it. It can only make Duly
     more cautious. Expected withdrawal latency: a device sees it at its next check, so within
     `feed.check_every_hours` plus the jitter (about 25 hours) for a device that is online. A
     tombstone for a wrong update still needs an offline T session.
   - The schedules can fail silently (GitHub may skip or disable them, and expiry.yml is a
     schedule too). A dead-man check outside GitHub alerts the founder when the served timestamp is
     older than 36 hours (point 84). The failure is safe, but without the alert every user would
     turn Can't tell yet without warning.
   - Checked by: `tests/unit/pipeline/test_feed_expiry.py` with an injected clock over fixture
     metadata; test_feed_workflows.py (hold.yml has only `workflow_dispatch`); a test in
     test_feed_sign.py that the hold record holds only `hold` rows.
10. **Polite to the servers.** One fixed User-Agent naming Duly and a role contact address for the
    feed (never the founder's personal email); ETag and If-Modified-Since where offered; at least
    10 seconds between requests to www.uscis.gov (its robots.txt asks for it); only the FR
    `/api/v1` (its HTML pages refuse scripts); eCFR `/api/versioner/v1/full/` fetched only when a
    new version date appears, with `Accept-Encoding: gzip`; CourtListener within its published
    limits, with a token (point 79).
    - Checked by: test_watch_fresh.py with an injected sleep and clock (the fake server records the
      headers; the test asserts the requested gaps per host, with no real waiting).

## 3. Signing and keys

11. **The Update Framework's metadata format and client rules,** with only what Duly needs: no
    hashed bins, one delegation, consistent snapshots on (metadata named by version, targets by
    hash; only `timestamp.json` changes in place, so a CDN cache cannot mix two versions). Client
    in main: `tuf-js` (pure TypeScript, verifies with Node's built-in crypto, takes an injected
    fetcher), bundled into main's output so it is inside app.asar (point 52). Tools: `python-tuf`
    in a new `feed` dependency group, never in the `desktop` group. Key type: Ed25519 for the
    founder's passphrase-protected key files (point 75); if the hardware key of point 83 comes
    later, what it supports (Ed25519, or ECDSA P-256 on a PIV key), both verified by tuf-js.
    Founder decision on the dependency, with the fallback: point 74.
    - Checked by: `test_bundle_inputs.py` still resolves the `desktop` group to exactly its six
      packages; `tests/desktop/feed.test.ts` runs the client against committed fixture repositories
      (point 11a).
11a. **The fixture repositories.** `tests/fixtures/feed/make_repos.py` uses python-tuf directly
    (never `pipeline/feed`, which would be a cross-lane import), with deterministic Ed25519 keys and
    a fixed expiry far in the past and far in the future as each case needs. Its output is
    committed under `tests/fixtures/feed/repos/`; vitest reads the committed files and sets the
    clock with `vi.setSystemTime` for the expiry cases. A pytest regenerates the fixtures and
    fails on any difference.
12. **The roles.**

    | Role | Key | Where it lives | Expiry (point 75) | Signs |
    |---|---|---|---|---|
    | root | founder keys A, B and D, threshold 2 of 3 | passphrase-protected key files, all kept offline and brought to a Mac only for a root signing session, each with a backup copy; at least one in another place | 90 days | which keys hold every role |
    | targets | founder key T | a passphrase-protected key file on the founder's Mac, with a backup copy kept offline, used only in a signing session; a hardware key with touch before real students rely on the feed (point 83) | 60 days | every pack and every update; delegates `checks/*` |
    | checks (delegated, terminating) | CI key C | GitHub `attest` environment secret | 2 days | `checks/*` only, nothing else |
    | snapshot, timestamp | CI key C | same | 2 days | which metadata versions are current |

    TUF keys carry no validity window of their own. C is rotated with every root version, and the
    root expires at 90 days, so a root signing session every 90 days rotates C. A device whose
    newest root has expired stops accepting new metadata; its rules then age into Can't tell yet,
    the safe direction.
    The founder keys start as passphrase-protected files, each with a backup copy kept offline
    (the root keys kept offline throughout, point 75): what the founder lane told the founder on
    2026-10-02, when the founder asked what the key was ("I'll start with the free option ...
    Nothing for you to buy now"), with point 83 still open (D90) and no purchase under D98. That
    covers the building and the testing; point 83 is raised again before real students rely on
    the feed. The key ceremony itself waits with the feed's hosting (D98, FEED-P5).
    - Checked by: `tests/unit/pipeline/test_feed_keys.py` (a fresh repository from
      `pipeline/feed/keys.py init` has exactly these roles, thresholds, expiries and delegation
      paths, and a new root version names a new C).
13. **What each key can do if it leaks.**
    - **C.** Can sign a false "no change" record and keep a stale pack looking current, and can
      freeze the feed. Through the snapshot it can also keep serving an older founder targets
      version to devices that have not yet seen the newer one, which withholds a tombstone or a
      corrected pack while forged records keep the old pack fresh. Bound: until C is rotated (at
      most 90 days with the root) or found. It cannot change a rule, publish news or show text
      (point 22). A record is published only on `served`, so re-running the checks shows a forged
      one; with a DNS hijack of feed.tryduly.co a forged record served only to some devices is not
      public, which is why the dead-man check (point 84) also compares the served metadata with
      the `served` branch and with the raw mirror. A public transparency log stays Later.
    - **T.** Can publish a false rule or update to every device. It is never put on GitHub or
      any server. Until point 83, it is a passphrase-protected file on the founder's Mac, so
      malware on that Mac that captures the passphrase could copy it (FEED-T11); on a hardware
      key with touch it could not be copied.
    - **Root keys as files.** Until point 83, malware on the Mac used for a root signing session,
      where two root key files are unlocked, could copy them and take over the feed (FEED-T4,
      FEED-T11).
    - **One root key.** Can do nothing alone (2 of 3).
    - **Two root keys.** Can take over the feed. Until the app has its own update channel (point
      86), a root compromise is recovered only by each user reinstalling a build with a new root.
    - L-security writes these as rows FEED-T1 to FEED-T11 (point 41).
    - Checked by: the FEED-P4 L-security done command, which greps each id.
14. **The signing session, `make feed-sign`, run by the founder on the Mac.**
    - It refuses unless stdin is a TTY, and refuses when run under an agent: any `CLAUDE_*`
      variable set, a working directory under `.claude/worktrees/`, or a factory jail marker. A
      PreToolUse hook (`.claude/hooks/guard_bash.py`) denies agents `feed-sign`, `feed-keys` and
      any path holding key material.
    - It exports the F-1 pack and the founder-approved updates from `pipeline/drafts/`; rebuilds
      the targets; and fails unless the hashes equal the file passed as `--expected`, which the
      founder downloads from the named build.yml run with `gh run download <run id>` after `gh
      attestation verify` (two independent builds of the same commit).
    - It runs `tools.sources.verify`, `tools.sources.plain`, `tools.copy_lint.lint` and
      `publish_blockers` with the wording checks, and refuses on any finding.
    - It shows the full rule diff against the last signed pack: for each parameter and regime
      added, removed or changed, the value, citation, tag, `legal_status` and effective dates
      before and after. The founder confirms each changed rule one by one. It then shows each
      update in full (headline, every text field, legal status, `pack`) and the withdrawn ids.
    - It writes `approval {approved, approved_by, approved_at}` into each update only after the
      founder confirms it; signs `targets.json` with T (the key file's passphrase; one touch
      once T is on a hardware key, point 83); writes it into the feed working
      copy. The founder opens the PR to `main`. The signature on the targets is the proof of
      approval; `approved_by` alone is text anyone could type.
    - Checked by: `tests/unit/pipeline/test_feed_sign.py` with throwaway keys and an injected
      confirmation function: a quote not found, an update with a blocker, an update whose headline
      says "you are safe", a hash that differs from `--expected`, a non-TTY stdin, a `CLAUDE_`
      variable set, a declined rule confirmation; each refuses and signs nothing. A changed value
      in a fixture pack appears in the diff.

## 4. The daily check record and what "no change" means

15. **The record, `checks/<pack id>.json`** (contract `contracts/feed_check.schema.json`, point
    43): `pack_id`, `pack_version`, `pack_sha256` (of the parameters.yaml bytes), `run_at` (UTC),
    `confirmed_on` (the UTC date of the run), `covered_from` (the first day this record covers per
    source), `exported_from`, and `sources[]`, one row per source a parameter or a regime of the
    pack rests on: `url` and `snapshot_sha256` exactly as in the pack, `result` (`unchanged`,
    `changed`, `unreachable`, `hold`), `checks[]` (what was asked and what was last seen, for the
    log and for people auditing), and `rules[]` (the parameter and regime ids on it). The CI signs
    the record only for a pack whose hash the founder's targets name. No field except `result`,
    the dates, `url`, `snapshot_sha256`, `pack_sha256` and `rules[]` ids is ever read by the engine
    or drawn on a screen; the `checks[]` strings are never shown.
    - Checked by: `tests/unit/contracts/test_feed_schemas.py` (fixture records validate; a record
      with no `pack_sha256` or a row with no `snapshot_sha256` is refused); test_feed_sign.py
      (attest refuses results for a pack hash the targets do not name).
16. **Re-reading the saved quote proves nothing.** 84 of the 105 F-1 parameter URLs are pinned eCFR
    point-in-time texts, which never change. "Unchanged" asks whether anything new happened since
    the founder's review, per kind of source:

    | Kind | Unchanged means |
    |---|---|
    | eCFR, pinned date | No eCFR version of the cited section after the baseline in `watch/baselines.json`; or a newer version whose scoped paragraph (for F-1, 8 CFR 214.2(f)), reduced by `tools.sources.verify.plain`, equals the baseline's. The equal case does not move the baseline itself: the CI proposes the new baseline by PR and the founder merges it. A different paragraph is `changed`. |
    | Federal Register document | Same bytes or same `plain()` text, and the FR API lists no correction; and no new FR document cites a CFR part the pack cites in the covered days, unless `review/open.yaml` records the founder's triage of it as no effect on this pack. |
    | Court docket (every litigated regime, district and appellate) | The full docket entry list, fetched fresh from the CourtListener docket-entries API (or PACER), has the same highest entry number and the same last-entry date as the baseline, unnumbered text orders included. RSS is an early trigger only (point 18), never the proof. A new entry is `changed`; a new order, opinion, judgment, injunction, stay or motion for a stay is `hold`; an appellate entry whose type cannot be read is `hold`. |
    | Agency page (Study in the States, USCIS, ICE) | The scoped selector matches exactly once, the `plain()` text of that area is within `watch.text_length_band` of the baseline's length and equals the baseline, and every quote on it is still found. Otherwise `unreachable` or `changed`. Raw page bytes are never compared: they change between fetches. A page marked `unmaintained` in the register (the ICE SEVP site says it "will not be actively managed") is never `unchanged`: its rules age and the founder re-reviews them. |
    | US Code | The section body only, between its heading and the notes, equals the baseline. |
    | PDF | Same bytes; if not, text from both PDFs extracted in the fetch job with one pinned tool (pypdf, point 52) and compared. Never against a text made locally with another extractor. |

    eCFR shows the words, never whether they are in force: it still carries the enjoined
    2026-09-15 text. The status of a litigated rule comes from court records only.
    - Checked by: test_watch_fresh.py over saved responses: the 2026-09-30 eCFR version with the
      same paragraph (f) gives `unchanged` and one baseline proposal; the same with one word
      changed in (f) gives `changed`; the docket with ECF 53 gives `changed`; a planted stay order
      gives `hold`; a planted First Circuit order on 26-2112 gives `hold`; a Study in the States
      page whose bytes differ but whose main text is equal gives `unchanged`; a selector matching
      a banner of a tenth of the baseline's length gives `unreachable`; an `unmaintained` page
      never gives `unchanged`.
17. **The decision per source, then per pack.**

    | Result | What follows |
    |---|---|
    | Unchanged, currency check ran, coverage contiguous | Rules on the source are refreshed by this record |
    | Unreachable, or the currency check could not run | Not refreshed; the rules keep their last date; `watch.miss_issue_after` misses in a row open a founder issue |
    | Changed, quotes still found | Not refreshed; a PR adds the source to `review/open.yaml` with the before and after text; the founder has until the rules go stale to review |
    | Hold (a quote is gone, or a new court order on a watched docket) | All of the above, and the row says `hold`: the app shows Can't tell yet at once for the rules on it (point 33) |
    | An FR final or interim rule citing a part the pack uses, effective within 7 days | `hold` on the rules citing that part until the founder triages it |

    Nothing in the feed or the CI edits a parameters.yaml. A change of law is a new pack version,
    written by L-content, reviewed, and signed by the founder.
    - Checked by: test_watch_fresh.py (one fixture per row); a test that `watch/` and
      `pipeline/feed/` never open a path under `packs/` or `rulepacks/` for writing.
18. **The triggers for news, in order:** the FR API by CFR part (8 CFR 214, 103 and 248; 22 CFR
    41), the eCFR versions list (and 8 CFR 274a through eCFR, since the FR API refuses `274a` as a
    part), the court CM/ECF RSS feeds plus CourtListener docket feeds for every case under a
    litigated tag, the USCIS alerts RSS, the USCIS Policy Manual updates page (watching "Affected
    Sections" for 2 USCIS-PM F, 1 USCIS-PM B and 10 USCIS-PM), the Study in the States and ICE SEVP
    feeds and pages, and the FR term search weekly as a safety net. `watch/sources.yaml` names each
    docket explicitly: D. Mass. 1:26-cv-13799 (CourtListener 74661796), First Circuit 26-2112, and
    any related case the founder adds; a Supreme Court docket is added the day one opens. The FR
    public inspection list is an early warning only, never a source to cite. The State Department
    has no visa news feed and travel.state.gov refuses scripts; visa changes arrive through 22 CFR
    41 in the FR, plus a founder check each week.
    - Checked by: `watch/sources.yaml` lists each trigger with its host and interval; a test that
      every trigger host is in `tools.sources.verify.PRIMARY_HOSTS` (which gains
      `ecf.mad.uscourts.gov` and `ecf.ca1.uscourts.gov` at FEED-P0b, a founder step).

## 5. The desktop updater, in main

19. **The trust anchor.** `desktop/feed/root.json` (the first root, from the key ceremony) and
    `desktop/feed/floor.json` (the targets version and the pack versions this build shipped with)
    live inside app.asar, covered by asar integrity and the code signature. A device never accepts
    targets below the floor or a pack below the bundled one. Both files are founder-only: the
    founder adds `desktop/feed/**` to the protected paths of `.claude/hooks/guard_paths.py`
    (FEED-P0b), and commits a fixture root and floor, marked `"fixture": true`, before FEED-P4; the
    real ones replace them in FEED-P5. `forge.config.ts` `CONTRACTS` gains
    `feed_state.schema.json` and `desktop_feed_bridge.schema.json`.
    - Checked by: forge.test.ts (both files are in the asar; `CONTRACTS` lists the two new
      contracts; the packaged asar resolves `tuf-js`); feed.test.ts (a fixture repository at a
      targets version below the floor is refused; a pack version below the bundled one is
      refused); a FEED-P10 check that the packaged root is not the fixture.
20. **When it checks.** Never before the window is shown and the engine is ready, never blocking
    either, and never before onboarding has shown the disclosure line of point 37 (point 77, D91).
    The first check after a launch, and after a `powerMonitor` resume when the last success is older
    than `feed.check_every_hours`, waits a random `feed.first_check_delay_minutes` (5 to 60). After
    that, checks run every `feed.check_every_hours` at a fixed random phase chosen once per install
    and kept in `state.json`, so checks do not reveal launch or wake times. One check at a time.
    Settings can turn the daily check off (point 37); then no request is made at all.
    A build whose packaged root is the fixture (point 19: every build until FEED-P5, D98) makes
    no feed request at all, its host list empty; it reports `no_feed` and shows neither the
    disclosure nor the switch (points 36 and 37).
    - Checked by: feed.test.ts with fake timers, a fake powerMonitor and an injected random source
      (no request before engine ready or before the disclosure was shown; the first request falls
      inside the delay band; one request per interval at the stored phase; a resume after the
      interval triggers one after a delay; off makes none; a fixture root makes none and reports
      `no_feed`).
21. **The fetch.** The `tuf-js` fetcher (Duly's own, injected) calls `net.fetch` on a dedicated
    session from `session.fromPartition("duly-feed")` (not persisted, no cookies), with
    `cache: "no-store"` and no conditional headers; HTTPS only; `redirect: "error"`; hosts allowed:
    `feed.tryduly.co` and `raw.githubusercontent.com` under the feed path only; no query string.
    The request carries exactly Host, Accept, Accept-Encoding and one constant User-Agent with no
    app, Electron or OS version (`session.setUserAgent(UA, "")` so no Accept-Language is sent); no
    `sec-ch-*`, Origin, Referer, If-None-Match or If-Modified-Since. Every metadata file is capped
    at `feed.max_metadata_bytes`, every target at the length from signed metadata, every request at
    `feed.fetch_timeout_seconds`. tuf-js's default fetcher (make-fetch-happen) is never
    constructed. Every device downloads every pack and every update, so no request reveals the
    student's category. The renderer still never touches the network; guard.ts is unchanged.
    `make feed-verify URL=...` runs the same client logic headless (through
    `desktop/scripts/feed-verify.mjs`) against a live feed (founder only) or a localhost fixture
    server (in the jail).
    - Checked by: feed.test.ts (a redirect, an http URL, a host outside the list, a query string,
      an oversized file, a slow response, each refused before any byte is used; the exact header
      set; no make-fetch-happen construction).
22. **Verify, by the TUF client workflow, plus Duly's rules.** Root chain N to N+1; timestamp
    (version rises, not expired against the time the check started); snapshot; targets; the
    delegated checks role; then each target's length and SHA-256. Duly's rules on top: a `checks/*`
    target is accepted only when it resolves through the `checks` delegated role (a `checks/*`
    target listed directly in targets, signed by T, is refused, although standard TUF accepts it).
    What a file is comes only from the signing role and the path prefix, never from the signed
    `custom.kind`: packs, updates and tombstones only from top-level targets under `packs/`,
    `updates/` and `withdrawn/`; anything from the delegated role is parsed only as a feed_check
    record; any `custom.kind` that disagrees with its role and prefix refuses the whole generation.
    Any failure keeps the current files.
    - Checked by: feed.test.ts over fixture repositories, one per fault: a bad signature on each
      role, a timestamp version that goes back, an expired timestamp, a targets file whose hash
      differs from the snapshot, a check record signed by the targets key in place of C, a C-signed
      `checks/x.json` with `kind: pack`, another with `kind: update`, a pack whose bytes differ from
      its hash, a root rotation followed correctly.
23. **The store, all under `<userData>/feed/`,** never under Resources or engine-root (W1's
    manifest check refuses any extra file there):
    - `metadata/`: the trusted metadata files;
    - `cache/`: downloaded targets, named by hash;
    - `generations/<targets version>-<checks version>/`: one complete, immutable set:
      `rulepacks/f1-us/<ver>/parameters.yaml`, `checks/f1-us.json`, `updates/<id>.json`,
      `withdrawn/<id>.json`, and `FILES.json` (the SHA-256 of every file in the set from the signed
      metadata, and each pack's `min_engine` and `min_app_version` from its target's custom data).
      A pack id with no pack in the feed is not copied; the engine uses the bundled one;
    - `current.json`: the pointer to one generation (contract `feed_state.schema.json`);
    - `state.json`: the last attempt and the last success (UTC instants), the result kind
      (`ok`, `offline`, `refused`, `expired`, `off`, and `no_feed` for a build with the fixture
      root, D98), the per-install check phase, whether the
      disclosure was shown; never a URL with an address or any case value.
    - Checked by: feed.test.ts (the tree after an install; `state.json` validates against the
      contract and holds no field outside it).
24. **Install, atomically.** Build the generation in `<userData>/feed/staging-<random>` on the same
    disk; refuse a pack whose version is below the bundled or the installed one, or whose
    `min_app_version` is above this app; run the bundled engine once in `--check-feed <staging
    dir>` mode (point 31), which loads the packs with this engine's schema and checks every update;
    on success fsync the files, rename the staging folder into `generations/`, write
    `current.json.tmp`, fsync, rename it over `current.json`. Keep the previous generation, delete
    older ones (`feed.keep_generations`). A crash at any step leaves the old pointer valid.
    - Checked by: feed.test.ts with a fake file system that fails at each step in turn: the pointer
      always names a complete generation, and no staging folder survives the next launch.
25. **At each launch**, before the engine starts (as manifest.ts checks the runtime): re-verify,
    with no network, the stored root chain, targets and checks metadata, and re-hash the current
    generation's files against `FILES.json`. tuf-js's `Updater` refuses expired metadata, so this
    check calls `@tufjs/models` `Metadata.verifyDelegate` directly over the stored files and ignores
    expiry: packs do not expire, and freshness decays by the record's own date. On any difference,
    start the engine on the bundled packs alone and schedule a check.
    - Checked by: feed.test.ts (one changed byte in a pack, a removed check record, a swapped
      metadata file: each starts on the bundled packs; an expired but genuine set still starts on
      the feed).
26. **The engine command** gains `--feed <userData>/feed` when the launch check passed, in both
    packaged and repo modes; nothing else in SPEC-W1 point 16 changes (the reduced environment
    stays exact). A new install mid-session needs no restart: the engine reads `current.json` per
    request (point 32), and main tells the page through the feed bridge that the rules changed, so
    the page asks the engine again.
    - Checked by: `desktop/src/paths.test.ts` and `engine.test.ts`, amended by L-desktop in
      FEED-P4 (exact args with and without `--feed`); a desktop test that an install fires one
      `feed.changed` event and no window reload.
27. **Offline.** Nothing breaks. The current generation stays; a failed or offline check writes
    `offline` and tries again at the next interval or on resume; an expired-metadata error while
    offline is recorded, not shown as a fault. A first launch with no network uses the bundled
    pack, which may already be stale: the items that rest on its stale rules wait (point 64)
    and the verdict is Can't tell yet, which is the safe outcome.
    - Checked by: feed.test.ts (a fetcher that throws a network error leaves every file and the
      pointer untouched and writes `offline`).

## 6. Published updates

28. **An update reaches a device only as a founder-signed target.** Each update follows
    `contracts/update.schema.json` (with W2's K5 `article` and `affects`). It is drafted in Duly's
    `pipeline/drafts/` with its `to_do` (point 35, D97), goes through the `law-update-claim` skill
    (primary source, the exact quote found in a saved copy, an independent check, a refutation),
    passes `publish_blockers` with the wording checks with nothing returned, is approved and signed
    in `make feed-sign` (point 14), and only then is copied to the feed repository's `updates/` and
    to Duly's `pipeline/published/`.
    - Checked by: test_feed_sign.py (an update with any blocker, wording ones included, is never in
      a signed targets); test_feed_gate.py (point 8). Assigned to FEED-P3.
29. **The device checks again.** `GET /v1/updates` (SPEC-W2 A2) reads the bundled
    `pipeline/published/*.json` and the current generation's `updates/*.json`, and returns an
    update only if it validates against update.schema.json, `publish_blockers(update) == ()` (which
    includes the wording checks, point 35), and no tombstone names it. The same id in both places:
    the feed copy wins only when its `status_as_of` is later.
    - Checked by: `tests/unit/api/test_feed_routes.py` (an update with `quote_found: false` in the
      feed folder is never returned; one whose `article` says "you must leave" is never returned;
      one with no `to_do` is never returned (point 35, D97); a
      tombstoned one is never returned; a schema-invalid one is never returned and does not stop
      the others).
30. **An update that announces a rule change names the pack that carries it** (`pack: {category,
    min_version, in_force_from}`, point 48). For each such update the engine says whether the pack
    it is computing from carries the change (`in_rules`).
    - The change is in force when `in_force_from` is on or before the person's today, or, with
      `in_force_from` null, when `legal_status` is `effective`, `enjoined`, `stayed`, `vacated` or
      `rescinded`.
    - An update that passes point 29, is in force, and names a `min_version` above the loaded pack
      is a known conflict with the pack's dates. The engine adds verdict reason `rules_superseded`
      and returns `cannot_tell` for that pack (FEED-P8 narrows this to the items the update
      `affects`: under D97(3) only those items wait, and every other item keeps its date). Dates
      are never shown from law an approved update says has changed.
    - The caption "Duly's dates do not use this change yet." is kept only for an update with
      `in_rules: false` that is not yet in force (proposed, or effective later).
    - Checked by: test_feed_routes.py (an update naming v2026.10 against a v2026.09 pack gives
      `in_rules: false`; against v2026.10, `true`) and test_feed_freshness.py (that update in force
      gives `cannot_tell` with `rules_superseded`; with `in_force_from` tomorrow it gives the dates
      and the caption state; a proposed update never supersedes).

## 7. The engine reads the newest valid pack

31. **`--feed <dir>` and `--check-feed <dir>` in api/desktop_main.py.** `--feed` binds the loaders
    to that folder. `--check-feed` loads the given generation with `select_packs` and the update
    checks, prints one plain line, and exits 0 or 1 with no socket and no token. Neither reads the
    network or writes a file.
    - Checked by: test_desktop_main.py (both flags; `--check-feed` over a fixture with a pack that
      fails the schema exits 1; neither writes under the folder).
32. **`select_packs(bundled, feed, today)` in engine/rulepack.py** gives exactly one pack per pack
    id. A feed pack counts only if every file's SHA-256 matches `FILES.json`; it validates against
    the bundled rulepack.schema.json (a pack written for a newer schema falls back); its folder
    equals `<category>-<jurisdiction>/<version>` as the pack declares them (a new check in
    `load_pack` too, which every existing pack passes); and its `min_engine` from `FILES.json` is at
    or below `engine.ENGINE_VERSION` (a new integer constant in `engine/__init__.py`, starting at
    1; the rulepack schema is unchanged). The highest version wins by `version_key()`, a tuple
    `(year, month, patch or 0)`, so v2026.09.10 is after v2026.09.9. The same version in both places
    with different bytes refuses the feed copy (versions are immutable once signed). Never below the
    bundled version. `Rulepack` gains `origin` (`bundled` or `feed`). `load_all` stays for the
    server and the tests. api/local_routes.py replaces its `lru_cache` with a loader keyed on
    `current.json`'s path, size and mtime, so a new generation is read on the next request.
    - Checked by: `tests/unit/engine/test_select_packs.py` (one case per rule above; every pack in
      `rulepacks/` passes the folder check); test_feed_routes.py (a new pointer between two
      requests changes the version reported).
33. **Freshness from the check record.** One function, `Rulepack.rules_current_on`, replaces the
    three places that compute staleness today (engine/verdict.py through engine/f1.py:1692,
    engine/path.py:1350, api/local_routes.py:90). For each parameter and each regime: its
    `source.checked_on`, or the record's `confirmed_on` when that is later and the record's row for
    the same `url` and `snapshot_sha256` is `unchanged`. The pack's date is the earliest of those.
    The record counts only if its `pack_sha256` equals the loaded file's bytes, only if
    `feed.records_refresh` is true (KF9: true from FEED-P0a, since D90 recorded the D88 amendment
    of point 82 on 2026-10-01; set false, records only hold or age), and a `confirmed_on` more
    than `feed.future_tolerance_days` after the person's own today is ignored. A row marked `hold`
    adds the verdict reason `rules_on_hold` for that pack. Regimes now count, so the court regime
    `fixed_admission_2026` can no longer stay fresh by being left out. This is the pack-level
    first step; FEED-P8 follows directly (D97(3), point 64) and narrows `rules_stale`,
    `rules_on_hold` and `rules_superseded` to the items that read the rules concerned.
    `Rulepack.rules_checked_on` keeps its meaning (the oldest date a person reviewed a rule).
    `RULES_STALE_AFTER` stays 7 days.
    - Checked by: `tests/unit/engine/test_feed_freshness.py`, property tests with an injected
      clock: with no record, every journey's output is identical to today's except the new fields
      `scope.rules_current_on`, `scope.rules_stale_from`, `scope.rules_origin`,
      `scope.feed_checked_on` and `rules{}.current_on`; a matching record moves `rules_current_on`
      and nothing else; a record for other bytes, a row marked `changed` or `unreachable`, a date
      past the tolerance, or `feed.records_refresh` false changes nothing; one `hold` row gives
      `cannot_tell` with `rules_on_hold` the same day, with the setting either way; a stale regime
      makes the pack stale.
34. **The engine says what the screen shows.** `scope` gains `rules_current_on` (watched for
    changes through), `rules_stale_from` (the first day the verdict turns Can't tell yet without a
    new record), `rules_origin`, and `feed_checked_on` (the last successful check, from
    `state.json`, as a day in the person's time zone); each `rules{}` entry gains `current_on`.
    `GET /v1/status` reports `origin` and `current_on` per pack through `status_body`, so the server
    and the desktop stay identical.
    - Checked by: test_feed_freshness.py (the fields, and `rules_stale_from` equal to the first day
      the verdict changes when the clock is moved one day at a time); test_desktop_main.py (desktop
      status equals server status on the bundled packs).
35. **`publish_blockers` moves to `engine/updates.py` and gains the wording checks.** (The move and
    the re-export landed with W2-P3 under D95(2); the wording checks below are still FEED-P1's.) The
    module imports only the standard library and `assistant.boundary` (itself standard library
    only), so the bundled engine can run it; the bundle gains `assistant/__init__.py` and
    `assistant/boundary.py` (KF8). The provenance checks move unchanged. `wording_blockers(update)`
    is new and its reasons are appended by `publish_blockers`: over `headline`, `plain`, every
    `article` paragraph and every other text field, it reports second person (the same pattern as
    `tools.sources.plain.SECOND_PERSON`), a conclusion, an instruction in Duly's own voice
    (`assistant.boundary.instructs`), and a modal or status word with the user as the subject
    (`assistant.boundary`'s Side B tests).
    **Anything to do (D97(2)).** An update states anything to do only in its `to_do` (KF6, point
    48): each step says what the primary source states the process requires, attributed to that
    source, and names the claim it rests on (BOUNDARY A5); an empty list is shown as "Nothing now".
    The checks above run over every step as over every other text field, so a step is never an
    instruction in Duly's own voice, a recommendation or a comparison of choices (B4), or
    reassurance (B10). `wording_blockers` also reports an update with no `to_do`
    (`to_do_not_stated`: "Nothing now" is the founder's statement, never read from a missing field)
    and a step whose claim is not a primary source with its quote found (`to_do_<i>_no_source`). The
    copy lint phrase list runs over update text in the gate and in `feed-sign` (points 8, 14), and
    `tools/copy_lint`'s product scope gains `pipeline/published/`, `pipeline/drafts/` and, in the
    feed repository, `updates/`, `README.md`, `SOURCES.md` and `CHANGELOG.md` (a founder edit,
    FEED-P0b). `pipeline/graph.py` re-exports `publish_blockers`, so
    `tests/unit/pipeline/test_graph.py` still imports it from there.
    - Checked by: `tests/unit/engine/test_updates_module.py` (every case of test_graph.py's
      blockers gives the same tuple, since none holds update text, once its GOOD fixture, and
      test_local_routes_w2.py's PASSING, state `to_do: []` (point 54); "you must leave by",
      "you are safe" and "you have plenty of time" each give a wording reason; the second-person
      pattern equals plain.py's; importing engine.updates in a fresh interpreter loads no module
      outside the standard library, `engine` and `assistant.boundary`); for `to_do`: a step
      worded as its source's own listed requirement and naming a primary claim with its quote
      found passes, `to_do: []` passes, no `to_do` gives `to_do_not_stated`, a step naming no
      claim gives `to_do_0_no_source`, and a step that says "it is best to", "there is no rush"
      or "you should" gives a wording reason; paired cases in `evals/boundary` for update text,
      one on each side of the line (L-evals, `add-eval-case`).

## 8. What the screen says

The words are drafts for L-web, held to the copy rules (no long dashes, no emoji, no "I" or
"we", buttons name outcomes, the copy lint list). Every date in them is an engine field from point
34; the screen formats it with `format.ts` and never computes it.

36. **The rules line,** on Plan (W2 G37 and point 24, amended by KF8) and at the top of Updates:

    | State (from the engine and the feed bridge) | Words |
    |---|---|
    | Record current | "Rules reviewed Sep 28. Watched for changes through Oct 3." |
    | Never checked on this Mac | "Rules reviewed Sep 28. Not yet checked for changes on this Mac." |
    | Offline | "Rules watched for changes through Oct 3. Duly checks again when this Mac is online." |
    | A source withheld, not yet stale | "A source behind these rules changed and is being reviewed. Without a new check, dates that rest on it show as Can't tell yet from Oct 11." |
    | On hold | "A source behind these rules changed and is being reviewed. Dates that rest on it show as Can't tell yet until then." |
    | Superseded | "The law behind these rules changed. Dates that rest on the change show as Can't tell yet until Duly's rules include it." |
    | Refused or expired files | "The newest rule files did not pass Duly's checks, so they were not used. Duly keeps the rules it has." |
    | Daily checks off | "Daily checks are off. Rules watched for changes through Oct 3." |
    | No feed in this build (`no_feed`, D98) | "Rules reviewed Oct 2. Without a newer version of Duly, dates show as Can't tell yet from Oct 10." |

    The dates in the table are examples. "Reviewed" is `rules_checked_on`, "watched through" is
    `rules_current_on`, the Can't tell yet day is `rules_stale_from`. Under D97(3) (point 64),
    "dates" in these lines means the dates that rest on the rules named; every other date stays
    shown.
    - Checked by: `tests/web/acceptance/rules-line.test.tsx` (each state from fixture engine
      outputs and bridge states; each date equals its field; the sentence built from
      `rules_current_on` never contains "reviewed"); copy lint.
37. **Settings, a "Rule updates" panel** (W2 point 32): "Check for rule changes once a day", on by
    default (point 77), with one line: "Duly downloads the same public files as every other copy.
    The download shows GitHub and your network this Mac's IP address, the time, and that it uses
    Duly. Nothing from your records is sent." The same line is shown once in onboarding before the
    first check (point 20). Buttons: "Check for changes now", "Turn off daily checks" (or "Turn on
    daily checks"). Turning off says what follows: "Without a check, dates show as Can't tell yet
    from Oct 11." In a build with the fixture root (`no_feed`, every build until FEED-P5, D98) the
    panel shows only the rules line, with no switch and no button, and onboarding shows no
    disclosure: no control that does nothing, and no line about a download that does not happen.
    - Checked by: `tests/web/acceptance/settings-feed.test.tsx` (each button changes the bridge
      state it names; no control that does nothing; the disclosure line is present in Settings and
      in onboarding; with `no_feed`, neither the switch, the buttons nor the disclosure is drawn).
38. **Updates** (W2 point 30, G26): published updates only; each article shows its source line and
    legal status with its date; an update with `in_rules: false` not yet in force carries "Duly's
    dates do not use this change yet."; one in force shows the superseded rules line (point 30). A
    withdrawn update disappears from the list. Each article's For you box (SPEC-W2 point 30)
    says whether the update touches the student's record, naming the field that matched (BOUNDARY
    A4; the page matches `affects` against the engine's `stages[]` on the device, SPEC-W2 G26),
    and anything to do: the update's `to_do` steps, each as the primary source states it with its
    source one tap away (A5), or "Nothing now" when the list is empty (D97). No update recommends
    a choice for the person (B4) or reassures (B10), and the screen adds no step of its own.
    Source links open only through main: `shell.openExternal` on an https URL whose host is in
    `PRIMARY_HOSTS`, and any other URL is refused.
    - Checked by: `tests/web/acceptance/updates.test.tsx` (an update the engine did not return is
      never drawn; the `in_rules` line follows the field; no feed record string is drawn; the
      For you box draws each `to_do` step with its source, or "Nothing now" for an empty list,
      and no other step);
      `tests/desktop/feed-bridge.test.ts` (an http link, a link to another host and a `file:` link
      are refused).
39. **The feed bridge,** `window.duly.feed` (contract `desktop_feed_bridge.schema.json`): `status`
    (enabled, the result kind, whether the disclosure was shown, no dates and no URLs),
    `setEnabled`, `checkNow`, `disclosureShown`, `openSource`, and a `changed` event. Dates reach
    the page only through the engine output.
    - Checked by: `tests/desktop/feed-bridge.test.ts` (a call outside the schema is refused; a call
      from a frame other than the main frame of duly://app is refused).

## 9. Privacy and security

40. **What the app reveals.** GitHub (and later AWS) sees each device's IP address, the time, and
    that it runs Duly, which suggests an international student. So do the DNS resolver, a campus
    or company proxy, and anyone who can see the TLS server name on the network, which shows the
    feed host. Nothing else: no identifier, no category, no query. The README says so in plain
    words before the first build that checks the feed, because D84 promises local-only (point 77).
    When the feed moves to Duly's AWS, it runs with no access logs: CloudFront and S3 logging off,
    no WAF logging, so no Duly server holds device IP addresses (D84).
    - Checked by: FEED-P5's done command greps the README for the paragraph's first sentence;
      feed.test.ts (point 21).
41. **The threat model gains rows FEED-T1 to FEED-T11** (L-security): T1 a poisoned feed
    (signatures, thresholds, consistent snapshots, the floor, Duly's role and prefix rules); T2 a
    leaked CI key (point 13, withholding newer targets included); T3 a leaked targets key; T4
    leaked root keys and recovery by reinstall; T5 rollback and freeze (versions, expiry, the floor,
    the dead-man check); T6 a missed change in the law (the detector's limits, point 42); T7 the
    user's clock (set forward gives Can't tell yet; set back only misleads that one device); T8
    local malware that can write userData (out of scope, as for case.bin); T9 the host and the
    network (availability, network observers, subdomain takeover); T10 the CI supply chain (the
    fetch and attest split, pinned actions, Actions injection); T11 an agent or malware on the
    signing Mac (TTY, agent refusal, hook, the key files' passphrases, and hardware touch once
    point 83 is decided).
    - Checked by: the FEED-P4 L-security done command (one grep per id).
42. **The limit, said plainly.** An automated check is weaker than a person's review. It does not
    see a court order on a docket nobody watches, a guidance page with no version history that
    changes without changing a quote, guidance sent to school officials by broadcast that never
    appears on a page, or a school page. The daily record therefore says "watched for changes",
    never "reviewed", and the founder's review date stays visible beside it (point 36).
    - Checked by: copy lint and the acceptance test of point 36 (both dates shown; "reviewed" never
      in the watched sentence).

## 10. The gap map

**H**: in the code today and reused as it is (named). **C**: in the code today and changed here.
**N**: new.

| # | What the feed needs | Class | Today, or the change |
|---|---|---|---|
| FG1 | Packs ship only inside the app | C | `desktop/python/bundle.json` copies `rulepacks/*/v*/parameters.yaml`; the bundle stays the floor and the fallback (points 19, 25) |
| FG2 | Staleness computed in three places | C | `engine/verdict.py:13`, `engine/path.py:1350`, `api/local_routes.py:90`; one `rules_current_on` (point 33) |
| FG3 | Regime dates left out of staleness | C | `engine/rulepack.py:33` reads parameters only; regimes counted (point 33) |
| FG4 | One pack per category | C | `load_all` globs every version; `path.py:1319` keeps the last, tests keep the first; `select_packs` (point 32) |
| FG5 | Version order | C | Text order puts v2026.09.10 before v2026.09.9; `version_key` (point 32) |
| FG6 | New packs read without a restart | C | `@lru_cache get_packs` at `api/local_routes.py:37`; loader keyed on `current.json` (point 32) |
| FG7 | `publish_blockers` on the device, wording checked | C | In `pipeline/graph.py`, which imports langgraph, and blind to update text; moved to `engine/updates.py` with `wording_blockers` (point 35) |
| FG8 | `GET /v1/updates` | C | Declared in openapi.yaml, built over bundled files by W2-P3 A2; reads the feed too (point 29) |
| FG9 | Update linked to its pack | C | update.schema.json has no `pack`; added (point 48); `in_rules` and `rules_superseded` (point 30) |
| FG10 | Engine arguments | C | `--mode`, `--socket` only (`api/desktop_main.py:101`); `--feed`, `--check-feed` (point 31) |
| FG11 | Scope fields for the rules line | C | `scope.rules_checked_on` only; four fields added (point 34) |
| FG12 | Quote check against the saved copy | H | `tools/sources/verify.py` (`plain`, `value_is_written`, `PRIMARY_HOSTS`, `check_pack`), used by the gates and the detector |
| FG13 | Plain-words check for update text | H | `tools/sources/plain.py` (`problems`, number grounding) |
| FG14 | Watch hosts and intervals | H | `watch/sources.yaml`; triggers and named dockets added (point 18) |
| FG15 | Updates screen | C | W2-P7 (G26) builds it; the rules line, `in_rules` and the feed source (points 36, 38) |
| FG16 | Trust anchor and floor | N | `desktop/feed/root.json`, `floor.json` (point 19) |
| FG17 | Fetch, verify, install, launch check in main | N | `desktop/src/feed*.ts` (points 20 to 27) |
| FG18 | Feed bridge and Settings panel | N | points 37, 39 |
| FG19 | Feed repository, Pages, domain | N | points 1 to 3, FEED-P5 |
| FG20 | Workflows | N | points 4 to 10 |
| FG21 | Keys, roles, signing session | N | points 11 to 14 |
| FG22 | The change detector | N | `watch/register.py`, `watch/fetch.py`, `watch/fresh.py`, `watch/report.py` (section 4); specs/updates-1 designed a register and a check that were never built, and this replaces its "stays current when the quotes are still found" rule (point 78) |
| FG23 | News detection | N | `watch/detect.py` (points 6, 18) |
| FG24 | Holds | N | point 17, the hold job (point 9) and the `rules_on_hold` reason (point 33) |
| FG25 | Withdrawn updates | N | tombstone targets (points 2, 29) |
| FG26 | Threat model rows and README disclosure | N | points 40, 41 |
| FG27 | Per-rule staleness (D65, extended by D97(3): a stale, held, superseded or litigated rule holds only the items it touches) | N | FEED-P8, directly after FEED-P1 (point 64) |

**Counts: 27 rows. 3 reused as they are (FG12 to FG14); 12 changed (FG1 to FG11, FG15); 12 new
(FG16 to FG27).**

## 11. The changes that land first

Contracts land first and alone, in one founder commit (FEED-P0a), after W2-P0 (whose K5 adds
`article` and `affects` to update.schema.json) is committed. Setup follows in a second founder
commit (FEED-P0b). (W2-P0 left K5 out: a0913d8 says "K5 lands with the feed contracts". So K5,
SPEC-W2 point 43, lands first in its own founder commit, alone, and FEED-P0a follows it.)

**Contracts (founder lane, FEED-P0a):**

43. KF1 `contracts/feed_check.schema.json`: the record of point 15.
44. KF2 `contracts/feed_target.schema.json`: the `custom` object on each target in targets
    metadata: `kind` (`pack`, `check`, `update`, `withdrawn`), `pack_id`, `version`,
    `min_app_version`, `min_engine` (integer); a tombstone's `id`, `headline`, `withdrawn_on`,
    `reason`. `kind` is a label for people; the client decides by role and path (point 22).
45. KF3 `contracts/feed_state.schema.json`: `current.json` (generation folder name, targets and
    checks versions, installed_at) and `state.json` (point 23).
46. KF4 `contracts/engine_output.schema.json`: `scope.rules_current_on`, `scope.rules_stale_from`,
    `scope.rules_origin`, `scope.feed_checked_on` (all optional, nullable dates or the two origin
    values), `rules{}.current_on`; the reasons `rules_on_hold` and `rules_superseded` named in the
    verdict's description. No new top-level key (`tests/unit/api/test_compute.py:93` asserts the
    set).
47. KF5 `contracts/openapi.yaml`: `RulepackRef` gains optional `origin` and `current_on`;
    `/v1/updates` says it reads the feed generation as well; each returned entry gains
    `in_rules` (boolean or null).
48. KF6 `contracts/update.schema.json`: optional `pack: {category, min_version, in_force_from}`,
    `in_force_from` a date or null (point 30). Optional `to_do` (D97): a list of steps, each
    `{text, claim}` naming the claim it rests on the way K5's article paragraphs name theirs; an
    empty list is shown as "Nothing now". It is optional in the schema so that every existing
    file still validates; point 35 refuses to publish an update without it. Every other field
    unchanged; `publish_blockers` gains only the wording checks (point 35).
49. KF7 `contracts/desktop_feed_bridge.schema.json` (point 39); `desktop_engine_bridge.schema.json`
    `updates_reply` gains the optional `in_rules` map by update id.
50. KF8 the SPEC amendments:
    - SPEC-W1 point 1 (the routes list gains `/v1/updates` with W2's `/v1/schedule`), point 14
      (the bundle gains `contracts/update.schema.json`, `contracts/feed_check.schema.json`,
      `assistant/__init__.py`, `assistant/boundary.py`; `pipeline/published/*.json` is already
      added by W2 point 47 and is not repeated), point 16 (the optional `--feed <dir>`).
    - SPEC-W2 point 24 and G37 (the Plan line is the rules line of point 36, "Rules reviewed",
      not "Rules checked"), point 30 (the superseded line, and the For you box: whether the
      update touches the record, A4, and its `to_do` steps or "Nothing now", point 38, D97(2)),
      point 32 (the Rule updates panel), point 41 (K3's "No other route changes" now excepts
      A2's `GET /v1/updates` and its feed reading), point 47 (A2 reads the feed).
    - specs/updates-1/SPEC.md: a source whose text changed while every quote is still found is
      withheld for review, not kept current (point 78); its register and check are replaced by
      section 4 of this SPEC.
51. KF9 `contracts/product_settings.yaml`, each a product setting, never a rule, and says so:
    `feed.check_every_hours` (24), `feed.jitter_minutes` (60), `feed.first_check_delay_minutes`
    ([5, 60]), `feed.keep_generations` (2), `feed.future_tolerance_days` (1),
    `feed.fetch_timeout_seconds` (30), `feed.max_metadata_bytes` (1048576), `feed.records_refresh`
    (true: D90 recorded point 82), `watch.max_size_factor` (3), `watch.miss_issue_after` (3),
    `watch.text_length_band` ([0.5, 2.0]).

**Setup (founder lane, FEED-P0b; D90 decided point 74, and point 83 no longer blocks it, since
the founder keys start as key files, point 75):**

52. KF10 dependencies and build:
    - `pyproject.toml`: a `feed` group with python-tuf and pypdf at exact versions;
      `[tool.uv] default-groups = ["dev", "feed"]`, so `uv run` installs it; `"watch"` added to
      `[tool.mypy] packages`, and `watch/__init__.py`; a mypy override for `tuf.*` and `pypdf.*`
      if they ship no types; uv.lock regenerated. The `desktop` Python group is unchanged.
    - `desktop/package.json`: `tuf-js` and `@tufjs/models` as exact runtime dependencies, and how
      main is bundled so they are inside app.asar: recommended, an esbuild step that bundles main
      into `dist/` (a new exact dev dependency), so `leftOut()` stays as it is; package-lock
      regenerated.
    - Makefile targets `feed-keys`, `feed-sign`, `feed-export`, `feed-verify`, each calling a
      `pipeline/feed/*` module or `desktop/scripts/feed-verify.mjs`.
    - `tools/sources/verify.py` `PRIMARY_HOSTS` gains `ecf.mad.uscourts.gov` and
      `ecf.ca1.uscourts.gov` (a founder decision that they are primary).
    - `tools/copy_lint/lint.py` product scope (point 35); `.claude/hooks/guard_bash.py` denies
      `feed-sign`, `feed-keys` and key paths to agents (point 14); `.claude/hooks/guard_paths.py`
      protects `desktop/feed/**` (point 19).
    - The fixture `desktop/feed/root.json` and `floor.json` (point 19).
    - Founder step in the main checkout, outside the jail, before any feed plan runs: `uv sync
      --all-groups && npm ci` (the jail has no network to fetch a new group). The packages come
      from the public registries and need no account (D98).

## 12. Lanes and the paths each owns

Per CLAUDE.md, implementation lanes never edit tests/, evals/, security/, .claude/, .github/,
tools/gates/, contracts/, BOUNDARY.md or DECISIONS.md. No implementation lane owns tools/, so the
feed's code lives in `watch/` and `pipeline/feed/` (L-pipeline).

53. **Who writes what.**

    | Lane | Writes |
    |---|---|
    | founder | contracts/* (FEED-P0a), pyproject.toml, uv.lock, package-lock.json, desktop/package.json (dependencies and the main bundling step), Makefile, `tools/sources/verify.py` hosts, `tools/copy_lint/lint.py` scope, `tools/sources/recheck.py` (point 55), `.claude/hooks/*`, `.github/feed-workflows/*.yml`, `desktop/feed/root.json` and `floor.json`, README.md (the disclosure), DECISIONS.md, the feed repository's settings, Pages, domain, App and secrets |
    | L-tests | `tests/unit/contracts/test_feed_schemas.py`, `tests/unit/engine/test_feed_freshness.py`, `test_select_packs.py`, `test_updates_module.py`, `tests/unit/api/test_feed_routes.py`, `tests/unit/desktop_entry/*` (amended), `tests/unit/pipeline/test_watch_fresh.py`, `test_watch_detect.py`, `test_feed_export.py`, `test_feed_sign.py`, `test_feed_keys.py`, `test_feed_expiry.py`, `test_feed_gate.py`, `test_feed_workflows.py`, `tests/fixtures/feed/*`, `tests/desktop/feed.test.ts`, `feed-bridge.test.ts`, `tests/web/acceptance/rules-line.test.tsx`, `updates.test.tsx`, `settings-feed.test.tsx`; the existing Python tests point 54 names |
    | L-evals | the paired update-text cases in `evals/boundary` (point 35) |
    | L-engine | `engine/__init__.py` (`ENGINE_VERSION`), `engine/rulepack.py`, `engine/updates.py` (new), `engine/verdict.py`, `engine/f1.py`, `engine/path.py` (the staleness callers only) |
    | L-api | `api/desktop_main.py`, `api/local_routes.py` |
    | L-pipeline | `pipeline/graph.py` (the re-export), `pipeline/drafts/*.json`, `pipeline/published/*.json`, `pipeline/feed/` (keys, build, sign, attest, export, gate, expiry), `watch/` (register, fetch, fresh, detect, report, sources.yaml) |
    | L-desktop | `desktop/src/feed.ts`, `feed-fetch.ts`, `feed-install.ts`, `feed-launch.ts` and their tests, `paths.ts`, `engine.ts`, `main.ts`, `preload.ts`, `desktop/forge.config.ts` (the two files in the asar, `CONTRACTS`), `desktop/python/bundle.json`, `desktop/scripts/feed-verify.mjs`, and the amended `desktop/src/paths.test.ts`, `engine.test.ts`, `forge.test.ts`; never `desktop/feed/**` |
    | L-web | the rules line, the Rule updates panel, the onboarding disclosure, Updates' `in_rules` and superseded lines and feed client (W2-P7 files under web/src) |
    | L-content | `rulepacks/f1-us/` (FEED-PA), one version folder per pack id |
    | L-security | `security/threat-model.md` rows FEED-T1 to FEED-T11 (point 41) |
    | L-review, L-audit | `reviews/feed-*.md`, `docs/requirements/` |

54. **Existing tests that change** (never loosened): in L-tests' rounds, the exact route list in
    `test_desktop_main.py:132`; the bundle allowlist and forbidden paths in
    `test_bundle_inputs.py:50-61,186-201` (in FEED-P4's tests-first round, for KF8's bundle
    entries); `test_desktop_main.py:147-166` (desktop status equals server status, through
    `status_body`); in FEED-P1's tests round, `tests/unit/pipeline/test_graph.py`'s GOOD update
    gains `to_do: []`, since an update with no `to_do` now has a blocker (point 35, D97). In the
    same round, `tests/unit/api/test_local_routes_w2.py`'s PASSING update gains `to_do: []` too.
    Its refused copies are made from it, so every assertion there stays exact, and
    `tests/desktop/bridges.test.ts`'s copy of PASSING follows it. In L-desktop's FEED-P4 build
    round: `desktop/src/paths.test.ts:24-86` and `engine.test.ts:223-244` (exact args),
    `forge.test.ts:80` (`CONTRACTS`). Tests that pick a pack with `next(p for p in load_all() if
    p.category == "f1")` stay correct only while the repository holds one version folder per pack
    id; a test fails when there are two (`test_bundle_inputs.py:243` already counts four packs).

**The interfaces the tests call.** L-tests writes against these before the code exists; each part
that touches the world is injected.

| Module | Exports |
|---|---|
| `desktop/src/feed-fetch.ts` | `makeFetcher({netFetch, hosts, timeoutMs, maxMetadataBytes}): BaseFetcher`; `FEED_HEADERS` |
| `desktop/src/feed.ts` | `createFeed({clock, timers, powerMonitor, random, settings, store, runCheck, events}): {start(), stop(), checkNow(), setEnabled(on), status()}`; `runCheck({updaterFor, fetcher, fs, install, clock})` |
| `desktop/src/feed-install.ts` | `installGeneration({fs, runCheckFeed: (dir) => Promise<boolean>, bundled, appVersion, keep, random}, verified): Promise<InstallResult>` |
| `desktop/src/feed-launch.ts` | `launchCheck({fs, root, floor}): Promise<{feedDir: string} \| {feedDir: null, reason}>` |
| `watch/fresh.py` | `run(register, baselines, last_record, fetch, clock, sleep) -> Results` |
| `watch/detect.py` | `detect(sources, seen, fetch, clock) -> list[Candidate]` |
| `watch/report.py` | `issues(results) -> list[Issue]`; `proposals(results) -> list[Proposal]` (pure; the workflow posts them) |
| `pipeline/feed/keys.py` | CLI `init --out DIR` and `rotate-root --repo DIR`; `init(out, signers) -> Repo` |
| `pipeline/feed/sign.py` | `sign(repo, expected: Path, confirm: Callable[[str], bool], signer, env, stdin_is_tty) -> SignResult` |
| `pipeline/feed/attest.py` | `attest(results_path, targets, signer, clock) -> list[Path]` |
| `pipeline/feed/build.py`, `export.py`, `gate.py`, `expiry.py` | `build(repo) -> Hashes`; `export(src, dest, commit)`; `gate(repo, base) -> list[Finding]`; `due(metadata, clock) -> list[Notice]` |

## 13. The plans, in order

Each plan is one factory run: a `goal`, lanes with their paths, tests first, a build held to its
own tests plus the journeys, a reconcile round, a review and an audit (RUNBOOK). Small plans;
FEED-P0a alone. FEED-PA ran on 2026-10-02 and 2026-10-03, outside this order, and repeats as the
interim below until FEED-P5. Done commands name test files, never whole folders, so plans
running side by side do not pick up each other's tests.

**What runs on this Mac now, and what waits (D98).** Nothing in the build needs an account, a
login or a payment. A plan, or the part of one, that needs one waits until the founder chooses
otherwise; the rest goes ahead, in this order, once D100's re-audit finds the repo clean; only
the interim below (the recheck and its freshness plan) runs before it.

| Plan | Runs on this Mac now | Waits (D98) |
|---|---|---|
| FEED-PA (point 55) | All of it, as the interim below | Nothing |
| K5, then FEED-P0a (point 56) | All of it | Nothing |
| FEED-P0b (point 56) | All of it: packages from the public registries, and the fixture root and floor made with throwaway keys | Nothing |
| FEED-P1, then FEED-P8 (points 57, 64) | All of it | Nothing |
| FEED-P2 (point 58) | All of it | Nothing |
| FEED-P3 (point 59) | All of it: a fake server, saved responses, throwaway keys, planted fixture workflows | Nothing |
| FEED-P4 (point 60) | All of it, on the committed fixture repositories and the fixture root | The real root, which comes with FEED-P5 |
| FEED-P6 (point 62) | `watch/detect.py`, `watch/sources.yaml` and their tests, over saved responses | The scheduled job, which runs in the feed repository |
| FEED-P7 (point 63) | All of it, inside W2-P7, with the `no_feed` state (points 20, 36, 37) | The live states, once a feed exists |
| FEED-P5 (point 61) | Nothing | All of it: the `duly-feed` repository, Pages, `feed.tryduly.co` and its DNS, the key ceremony, the CourtListener token, the GitHub App, the dead-man check |
| FEED-P9 (point 65) | Nothing | All of it: a model account, and the founder's approval (point 81) |
| FEED-P10 (point 66) | Nothing | All of it: it tests the live feed |
| The hardware key (point 83) | Nothing: key files stand in (point 75) | A purchase |

**The interim, until FEED-P5 (D98).** No feed exists, so nothing refreshes the rules in an
installed build. The founder lane keeps them current on this Mac, at least every 7 days:

1. Outside the jail, `uv run python -m tools.sources.recheck --fetch rulepacks/f1-us/v2026.09`
   fetches every F-1 source fresh (the public pages, and the CourtListener addresses the recheck
   already reads, with no token).
2. A FEED-PA-style plan: L-content moves `checked_on` only where that fetch backs it (point 55),
   and a reviewer checks it. Moving `checked_on` is L-content's lane: never a founder edit of the
   pack, and never a rebuild alone.
3. `make desktop-python desktop-package desktop-verify`, and the new dated build replaces the
   last one. Builds hold made-up data only until W1's packaged-app review and audit pass (D99),
   and the founder's test at W2-P6 (D99) uses a build from a cycle no more than 7 days old
   (D98).

The recheck and the freshness plan of step 2 are part of the regroup round itself (D98, D100),
so they may run before the re-audit: D100's gate holds the next build plan (W2-P5), not this
freshness work.

A verdict turns Can't tell yet on the eighth day after the pack's oldest `checked_on`
(`engine/verdict.py`: more than 7 days), so each cycle finishes by the seventh. On the two dates
this SPEC has named:

- **2026-10-06.** The cliff this SPEC was written for. FEED-PA moved the repository's pack past
  it (oldest `checked_on` 2026-10-02), so a build made from the repository since 2026-10-02
  keeps its dates that day. A build packaged before FEED-PA (its pack's oldest `checked_on`
  2026-09-28, as in the first 2026-10-01 package) shows Can't tell yet for every F-1 item from
  2026-10-06; it is not used again, and the next rebuild replaces it.
- **2026-10-10.** The repository's pack, and every build made from it since 2026-10-02 (the dated
  2026-10-02 build included), turn Can't tell yet on this day, the eighth after 2026-10-02. The
  founder lane runs the cycle above on 2026-10-08 or 2026-10-09, which moves the next cliff
  about 7 days on; the re-audit does not hold it (above). If the cycle cannot finish by
  2026-10-09, builds show Can't tell yet from 2026-10-10 until it does (late, never wrong), and
  the founder is told plainly which it is.
- After that, the cycle repeats at least every 7 days until FEED-P5 makes the daily record.

55. **FEED-PA, before the feed: the 2026-10-06 cliff (founder, then L-content, then the founder).**
    Done: the fetches of 2026-10-02 and 2026-10-03 (`recheck-2026-10-02.json`,
    `recheck-2026-10-03.json`), plan-feed-pa.yaml and plan-feed-pa-fix.yaml; reviews/feed-pa.md
    approves, and the pack's oldest `checked_on` is 2026-10-02. Until FEED-P5 it repeats as the
    interim above (D98).
    Versions are not immutable until one is signed, and none is, so **v2026.09 is edited in place**
    and no folder is renamed (about 20 files in other lanes pin `v2026.09`).
    - Founder lane, outside the jail (the jail has no network): `tools/sources/recheck.py` fetches
      every F-1 source fresh into `rulepacks/f1-us/v2026.09/sources/` and writes
      `rulepacks/f1-us/v2026.09/recheck-<date>.json`: url, fetched_at, the sha256 of the response,
      the saved path, and for pinned eCFR URLs the versions-list result for the section; for the
      dockets, the full docket entry list.
    - L-content: `checked_on` moves to the recheck date only for a parameter or regime whose
      source has a recheck row dated on or after it, whose fetched bytes either equal
      `snapshot_sha256` or are saved as a new snapshot with the new hash, whose quote is found in
      the fetched copy, and, for a pinned eCFR URL, whose versions-list check shows no newer
      version or a newer one with paragraph (f) equal. Record the appeal (ECF 53, First Circuit
      26-2112) in the regime's history from the court's own docket; record the 2026-09-30 eCFR
      version and that paragraph (f) is unchanged; correct claim 2 of SOURCES.md. The litigated
      regime `fixed_admission_2026` moves only with the founder's sign-off on the docket. Any
      change of tag or `legal_status` is proposed in the REPORT for the founder, never made by the
      lane.
    - L-pipeline, separately: the appeal as an update in `pipeline/drafts/` through
      `law-update-claim`, kept there until the founder approves it (`pipeline/published/` is bundled
      into the app).
    - Done: `bash -c 'uv run python -m tools.sources.verify rulepacks && uv run python -m
      tools.sources.plain rulepacks --require f1 && uv run python -m tools.sources.recheck --check
      rulepacks/f1-us/v2026.09 && uv run python -c "from engine.rulepack import load_all;
      p=next(x for x in load_all() if x.category==\"f1\"); assert
      p.rules_checked_on.isoformat() >= \"2026-10-01\", p.rules_checked_on" && uv run pytest
      tests/unit/engine -q'`. `recheck --check` fails when any moved `checked_on` has no fresh fetch
      on or after it. Each repeat raises the date in the assert to its own fetch day.
    - Founder steps, outside the jail: `make desktop-python desktop-package desktop-verify`,
      install on the Mac, and the next day check that Plan shows dates, not Can't tell yet
      (2026-10-07 for the first run). Each run moves the cliff by one review, about 7 days, not
      for good; until the feed exists, the interim above repeats it (D98).
56. **FEED-P0a, contracts (founder lane, alone).** Points 43 to 51, plus
    `tests/unit/contracts/test_feed_schemas.py` (every new schema passes Draft 2020-12
    `check_schema`; fixture records, states and targets validate; today's engine output for the
    journeys still validates). D90 recorded the D88 amendment (point 82) on 2026-10-01, so
    `feed.records_refresh` is true. It follows K5's own commit (section 11). Done: `bash -c 'uv
    run pytest tests/unit/contracts -q && make gate-7 && uv run pytest tests/unit -q'` and `make
    doctor`. The audit step adds
    register rows for D88 and D89.
    **FEED-P0b, setup (founder lane).** D90 decided point 74; point 83 no longer blocks it, since
    the founder keys start as key files (point 75), and it runs on this Mac now (D98). Point 52.
    Done: `bash -c 'uv run mypy && uv run python -c "import tuf, pypdf" && npm run typecheck -w
    desktop && uv run pytest tests/unit -q'`.
57. **FEED-P1, the engine reads packs and records.** Points 32 (engine part), 33, 34 (engine part),
    35.
    - Round 1, L-tests: test_feed_freshness.py, test_select_packs.py, test_updates_module.py, the
      fixtures, and the `to_do: []` of point 54 in test_graph.py, test_local_routes_w2.py and
      bridges.test.ts. Done: `bash -c 'uv run ruff check tests && uv run ruff format --check
      tests && uv run pytest tests/unit/engine/test_feed_freshness.py
      tests/unit/engine/test_select_packs.py tests/unit/engine/test_updates_module.py --co -q
      >/dev/null'`. L-evals, beside it: the paired update-text cases.
    - Round 2, L-engine. Done: `bash -c 'uv run pytest tests/unit/engine/test_feed_freshness.py
      tests/unit/engine/test_select_packs.py tests/unit/engine/test_updates_module.py
      tests/unit/acceptance/test_journeys.py -q && uv run python -m tools.gates.engine_literals &&
      uv run mypy && uv run ruff check engine && uv run ruff format --check engine'`.
    - Round 3, after L-engine's merge, L-pipeline: the re-export. Done: `bash -c 'uv run pytest
      tests/unit/pipeline/test_graph.py -q && uv run mypy && uv run ruff check pipeline'`.
    - Reconcile (L-tests, whole suite and hidden tests).
58. **FEED-P2, the local routes.** Points 29 to 32 (route part), 34 (status). Runs after W2-P3 (A2)
    and FEED-P1.
    - L-tests: test_feed_routes.py; the amended test_desktop_main.py. Done as FEED-P1's L-tests line
      over those files.
    - L-api. Done: `bash -c 'uv run pytest tests/unit/api/test_feed_routes.py
      tests/unit/desktop_entry tests/unit/acceptance/test_journeys.py -q && uv run mypy && uv run
      ruff check api && uv run ruff format --check api'`.
59. **FEED-P3, the change detector and the signing tools** (may run beside FEED-P1 and FEED-P2).
    Points 2 to 5, 7 to 10, 12 to 17, 28.
    - L-tests: test_watch_fresh.py (fake server and saved responses), test_feed_export.py,
      test_feed_sign.py, test_feed_keys.py, test_feed_expiry.py, test_feed_gate.py,
      test_feed_workflows.py (against planted fixture workflows; the real ones arrive in FEED-P5),
      `tests/fixtures/feed/make_repos.py` and the committed fixture repositories (point 11a).
      Done as FEED-P1's L-tests line over those files.
    - L-pipeline: `watch/register.py`, `fetch.py`, `fresh.py`, `report.py`, `pipeline/feed/keys.py`,
      `build.py`, `sign.py`, `attest.py`, `export.py`, `gate.py`, `expiry.py`. Done: `bash -c 'uv
      run pytest tests/unit/pipeline/test_watch_fresh.py tests/unit/pipeline/test_feed_export.py
      tests/unit/pipeline/test_feed_sign.py tests/unit/pipeline/test_feed_keys.py
      tests/unit/pipeline/test_feed_expiry.py tests/unit/pipeline/test_feed_gate.py
      tests/fixtures/feed -q && uv run mypy && uv run ruff check pipeline watch && uv run ruff
      format --check pipeline watch && uv run python -m tools.copy_lint.lint'`.
60. **FEED-P4, the desktop updater.** Points 19 to 27, 38 (link opening), 39 (main side), 41.
    After FEED-P0b (the fixture root and the bundling step).
    - L-tests: `tests/desktop/feed.test.ts` and `feed-bridge.test.ts` over the committed fixture
      repositories; the test_bundle_inputs.py amendment for KF8. Done: `bash -c 'npx tsc --noEmit
      -p tests/desktop && npx eslint tests/desktop --max-warnings 0 && uv run pytest
      tests/unit/desktop_entry/test_bundle_inputs.py --co -q >/dev/null'`.
    - L-desktop, including the amended paths.test.ts, engine.test.ts and forge.test.ts. Done:
      `bash -c 'npm run typecheck -w desktop && npm test -w desktop && npx eslint desktop
      --max-warnings 0 && npx prettier --check "desktop/**/*.{ts,json}" && uv run python -m
      tools.copy_lint.lint && uv run pytest tests/unit/desktop_entry/test_bundle_inputs.py -q'`.
    - L-security. Done: `bash -c 'for i in 1 2 3 4 5 6 7 8 9 10 11; do grep -qw "FEED-T$i"
      security/threat-model.md || exit 1; done'`.
61. **FEED-P5, the feed goes live (founder lane, outside the jail).** Waits, whole, until the
    founder chooses to host the feed (D98).
    - Keys: `make feed-keys` (A, B and D made offline and stored apart; T as a passphrase-protected
      key file with a backup copy kept offline, until point 83 puts it on a hardware key with
      touch; C made and put in the `attest` environment as one base64 string).
    - GitHub: the repository; the `served` branch; Pages from GitHub Actions; the custom domain
      verified in the organization settings (a TXT record); the DNS CNAME for `feed.tryduly.co` at
      the registrar; Enforce HTTPS; the `fetch` and `attest` environments with a main-only
      deployment rule; the CourtListener account and its token as a `fetch` secret; the GitHub App
      for CI PRs and issues (point 86) and its key as a secret; CODEOWNERS; branch protection on
      `main` with required checks and no bypass.
    - Files: `.github/feed-workflows/*.yml` written and exported; the first root, the first targets
      for the F-1 pack FEED-PA produced (through a PR), the first check record;
      `desktop/feed/root.json` and `floor.json` replace the fixtures; the README paragraph; the
      dead-man check (point 84) set up, as the launchd job on the Mac (an outside monitor needs
      an account, D98).
    - The app rebuilt and reinstalled with the real root.
    - Done: `make feed-verify URL=https://feed.tryduly.co/v1/` and the same against the raw mirror;
      `grep -q "The download shows GitHub and your network" README.md`; `uv run pytest
      tests/unit/pipeline/test_feed_workflows.py -q`; then one full day: `gh run list --workflow
      freshness.yml --event schedule --status success -L 1` shows a run from today, and `make
      feed-verify` shows the checks version went up.
62. **FEED-P6, news detection** (its code and tests run now, over saved responses; the scheduled
    job waits for FEED-P5, D98). Points 6, 18; `review/open.yaml` and the pack
    release gate. L-tests: test_watch_detect.py. L-pipeline: `watch/detect.py`, `sources.yaml`.
    Done as FEED-P3's L-pipeline line with `tests/unit/pipeline/test_watch_detect.py` in place of
    its test list.
63. **FEED-P7, the screens (inside W2-P7, after FEED-P2 and FEED-P4).** Points 36 to 39 (page
    side). W2-P7's plan lists the change to Plan's rules line (built in W2-P6) and the onboarding
    disclosure. L-tests writes rules-line.test.tsx, updates.test.tsx and settings-feed.test.tsx
    first by the `data-landmark` names `rules-line`, `settings-rule-updates`, `update-in-rules`,
    `onboarding-feed-disclosure`; L-web builds; the done commands are W2-P5's. Until FEED-P5 the
    screens show the `no_feed` state (points 20, 36, 37, D98), and the For you box follows
    point 38 (D97).
64. **FEED-P8, per-rule staleness (D65, extended by D97(3)).** Decided by D97 on 2026-10-03, so
    it no longer waits on point 80: it runs directly after FEED-P1, and both run on this Mac
    (D98), so they can land before W2-P6 builds Home and Plan on the verdict. An item that
    reads a stale, held, superseded or litigated rule (`rule_in_litigation`: its rule differs
    under an alternate regime) waits: null, with its reason and the rule named in `waits_on`
    (SPEC-W2-UNKNOWN point 34). Every other item keeps its date, and nothing that waits is ever
    shown as settled; the verdict turns Can't tell yet only when an item computed from the
    student's record reads such a rule, and never reads as no open items while any item waits
    (D4). Until a feed exists, "stale" is per rule, from each rule's own `checked_on`. Stale and
    litigated rules, and the rest of D97(3) (an unknown, an unanswered question or an
    unconfirmed field holding only its items), are SPEC-W2 N8, built in W2-R1 (plan-w2-r1);
    FEED-P8 adds the rules the feed holds or supersedes, on the same per-item hold. L-tests first
    (`tests/unit/engine/test_rule_staleness.py`, with the journeys and the litigated cases), then
    L-engine with FEED-P1's L-engine done command over the new file.
65. **FEED-P9, drafting updates with a model** (only if the founder approves, point 81). A
    `news-draft.yml` job in the feed repository, model client in `pipeline/models` only (added to
    the export set of point 3 then), reading public law text only, with no tools; a check that the
    model job's inputs come only from the primary-source snapshots under `sources/` and the API
    records; draft, quote check by code, an independent check in a fresh context, a refutation; no
    model ever states a date or a number (placeholders filled from the API record, number grounding
    by `plain.py`); the job that calls the model cannot write to the repository; the job that opens
    the PR has no model access. Its own SPEC first.
66. **FEED-P10, integration and the milestone.** `make desktop-package desktop-verify` with the
    feed on; on the packaged app: the packaged root is not the fixture; first launch offline
    (bundled pack), then online after onboarding (install), a tampered generation (bundled), a feed
    with a lower version (refused), the daily check across a sleep and resume; review (L-review
    tries a forged check record, a replayed old timestamp, a redirect to another host, a C-signed
    pack); audit. This was part of the D89 milestone: the founder tests once Home, Plan and
    reminders work on real F-1 dates with the feed live. D99 moved the founder's next test to
    W2-P6 (Home and Plan; reminders follow in W2-P7), since the feed waits under D98. FEED-P10
    waits with FEED-P5 and is the founder's test of the live feed once it is hosted. The founder
    lane checks it live, sends the push notification and the test guide.

## 14. What this does to the share

67. The feed alone does not add rules. It keeps the F-1 rules that exist current, brings approved
    news to the device, and turns the 7-day cliff into a daily, visible process. The F-1 depth of
    D89 (cap-gap, travel, documents) still comes from W2's plans.

## Covers

D88 (as D90 amends it) and D89 (with D99's test point) in full for F-1, and D91, D97(2) and (3)
and D98 for the feed (no register rows yet; FEED-P0a's audit adds them). Register rows:
DEC-D02-001 (runs continuously), DEC-D02-003 (primary sources only), DEC-D02-005 (checked on a set
interval), DEC-D02-006 (quote, independent check, refutation), DEC-D02-007 (citations),
DEC-D02-008 (late rather than wrong), DEC-D02-010 (status changes tracked), DEC-D22-001 (founder
approval is the final pass), DEC-D22-003 (the explanation in the app), DEC-D47-004 (a student sees
the latest verified changes), DEC-D01-001 (status in plain words), PRIN-005 (every rule carries the
date it was checked), PRIN-019 (a confirmed change changes the pack), PRIN-020 (every affected case
computed again), PRIN-021 (the person is told what changed and where), BOUND-005 (which updates
touch the category, and the field), BOUND-044 (models read public law text only), IMPL-021 (the
injunction docket and the circuit cases watched), IMPL-027 (Can't tell yet when stale), IMPL-033
(a primary-source link on each update), PLAN01-003 (watched daily), PLAN01-046 (rule packs with
diff and rollback, in part), UPD-015 (each item opens to its own sources), UPD-017 (matching
computed from case attributes, never generated).

That is 24 of 2461 requirement rows named here; the audit round adds rows for D63 to D89 and
recounts. Of the rows above, 3 are met today (DEC-D02-008, PRIN-005, IMPL-027).

## For the founder

D90 accepted the recommendations of points 68 to 86 as written, except point 83, which stays
open; D90 itself records point 82, and D91 decides point 77. Later decisions amend points 68, 75,
80, 83 and 84 as marked, and D98 holds the parts that need an account (section 13).

68. **Today's cliff.** Without FEED-PA, every F-1 verdict on every build turns Can't tell yet on
    2026-10-06. Recommendation: run FEED-PA now, before FEED-P0a, editing v2026.09 in place, and
    rebuild and reinstall the app after it. Done on 2026-10-02 and 2026-10-03 (point 55); the next
    cliff is 2026-10-10, and until the feed exists the recheck and rebuild repeat at least every
    7 days (D98, section 13).
69. **The appeal.** ECF 53 is a notice of appeal; no stay appears. Recommendation: record it in the
    regime's history and as an update through `law-update-claim` (kept in `pipeline/drafts/`
    until you approve it), leave the regime `enjoined` and `operative: false` unless a court order
    changes that, and decide the wording yourself.
70. **PA-2026-15 (8 CFR 1.2, effective 2026-10-23).** It moves a deadline counted in days that ends
    on a Saturday, Sunday or federal holiday to the next business day, for paper filings. It may
    touch how Duly counts filing windows. Recommendation: L-content saves the alert and 8 CFR 1.2
    as sources in the next pack round; no engine change until you have read both and decided how
    it applies, since filings are mostly online now (FR 2026-16313, mandatory electronic filing,
    is also open).
71. **Other items found.** FR 2026-18631 (proposed; removes the grace period in 8 CFR
    214.1(l)(2); H-1B and others, not F-1; comments close 2026-11-10), FR 2026-16313 (mandatory
    electronic filing, 8 CFR 103; may touch how the I-765 is filed), FR 2026-15726 (visa bond
    program, 22 CFR 41). Recommendation: each goes into `review/open.yaml` for triage; none is
    an F-1 fact yet.
72. **The funding lapse.** The ICE SEVP site says it "will not be actively managed". Recommendation:
    mark it `unmaintained` in the register, so its rules never refresh automatically and age into
    your review; the court and FR triggers still run. Guidance sent to school officials by
    broadcast does not appear on a page at all (point 42).
73. **Every finding above goes through publish_blockers, with the wording checks, before any
    student sees it.** Recommendation: nothing found by research is published by this SPEC.
74. **The dependency.** TUF with `tuf-js` (main) and `python-tuf` (tools), or one founder key over a
    hand-written signed index with Node's built-in `crypto.verify`. The second needs no dependency
    and no change to how main is packaged, but makes key rotation an app update and adds about 200
    lines of security code with no spec behind it. TUF brings tuf-js's dependency tree (about 40
    packages) and needs main bundled with esbuild so they are inside app.asar (point 52).
    Recommendation: TUF, both pinned exactly and read once by the reviewer, main bundled with
    esbuild; the same metadata is read by Rust `tough` later for the shared engine and the phones
    (D78, D82).
75. **Keys and expiry.** Root 2 of 3 founder keys, all offline, expiring at 90 days with C
    rotated each time; targets 60 days with a reminder 14 days before; CI-signed roles 2 days.
    T starts as a passphrase-protected key file on your Mac, and A, B and D as
    passphrase-protected key files, all offline and stored apart, each key with a backup copy
    kept offline, as the founder lane told you on 2026-10-02 ("the free option", nothing to buy
    now); that covers the building and the testing. The hardware key waits on point 83 and is
    raised again before real students rely on the feed. Recommendation: as first written,
    accepted by D90 except the hardware key, which D90 left open with point 83 (this point first
    read "T on a hardware key with touch from the start"). The cost: a root session every 90
    days and a targets session at least every 60 days, or verdicts go Can't tell yet; if you
    lose T, updates stop until root re-delegates; while the keys are files, malware on the Mac
    where one is unlocked could copy it once it captures the passphrase (point 13).
76. **Repository and domain.** Recommendation: a public `duly-feed` repository under the same
    owner as Duly, Pages on `feed.tryduly.co`, the domain verified in the organization. Law text
    is public; Duly's summaries and pack files under a license you choose (recommendation: CC BY
    4.0 for data and summaries, AGPL for the tools, matching D84). Accepted by D90; the
    repository and the domain wait under D98 (FEED-P5).
77. **The first network request (D84).** Recommendation: daily checks on by default, but the first
    check waits until onboarding has shown the disclosure line of point 37; said in the README and
    in Settings in plain words, with the switch to turn them off; with them off, the rules go stale
    after 7 days and the screen says so. The other choice is opt-in, which is more private and
    leaves most users stale. Decided: D91, as recommended.
78. **May an automated "no change" record count toward freshness, and what counts as change?**
    Recommendation: yes, under the per-source rules of point 16, shown as "watched for changes",
    never as "reviewed". A source whose text changed while every quote is still found is withheld
    (not kept current as specs/updates-1 says), so you review it within the 7 days; updates-1 is
    amended by KF8.
79. **Holds and tokens.** May the CI key sign a hold that makes Can't tell yet at once (a quote
    gone, a court order on a watched docket, the hold job)? Recommendation: yes; a hold only makes
    Duly more cautious, and lifting one needs your merge. CourtListener's docket API now needs a
    token: recommendation, a free account token in the feed's `fetch` environment, used only by the
    fetch job. Accepted by D90; the token is an account, so it waits under D98 (FEED-P5).
80. **Per-rule staleness (D65).** Pack-level staleness means one withheld source makes every F-1
    verdict Can't tell yet. Recommendation: build pack-level first (FEED-P1, safe and small), then
    FEED-P8 so that only items resting on the withheld, litigated or superseded rules become Can't
    tell yet. Until FEED-P8, an active appeal docket will withhold often and you review each new
    entry within 7 days. Accepted by D90; then D97(3) (2026-10-03) made per-item holds the rule
    for stale and litigated rules, so FEED-P8 runs directly after FEED-P1 (point 64).
81. **A model in the news pipeline.** Recommendation: not yet. Detection without a model (FEED-P6)
    and updates written by hand through `law-update-claim` first; FEED-P9 with its own SPEC once
    the first weeks show how many items arrive (research estimate, unverified: $10 to $40 a month
    at Opus 5.5 list prices, with Anthropic access through workload identity federation and no
    stored key). Accepted by D90 (not yet); it would also need a paid model account, which waits
    under D98.
82. **D88 says "the signing key stays with the founder".** This SPEC adds a CI-held key whose daily
    records decide whether users see dates or Can't tell yet, with no approval per day.
    Recommendation: amend D88 in DECISIONS.md before FEED-P0a: "Founder keys sign every rule pack
    and every update. A CI key may sign only the daily check record, which can keep reviewed rules
    current or put them on hold, and never changes a rule or shows text." Until it is recorded,
    `feed.records_refresh` is false: records only hold or age. Decided: D90 recorded these words
    on 2026-10-01, so `feed.records_refresh` is true (KF9).
83. **The hardware key.** Still open (D90). Recommendation (it first read "now rather than
    later"; amended for D98, which buys nothing during the build): a YubiKey (or similar) for T
    and for at least one root key, with touch required, before real students rely on the feed.
    Ed25519 if the signer library python-tuf uses supports it on that key; otherwise ECDSA P-256
    on PIV. Until then every founder key is a passphrase-protected key file with a backup copy
    kept offline, the root keys offline throughout (point 75), as the founder lane told you on
    2026-10-02, and a purchase waits under D98 in any case. It no longer blocks FEED-P0b: the
    file keys are Ed25519 (point 11). Moving T, or a root key, to the hardware key later is a new
    root version from a root signing session, which devices follow with no app update. A reminder
    is owed to you: the founder lane raises this point again before the first build that real
    students rely on (the launch of D84), and records the answer in DECISIONS.md.
84. **The dead-man check.** Recommendation: a daily check outside GitHub that alerts you when the
    served timestamp is older than 36 hours and when the served metadata differs from the
    `served` branch or the raw mirror: either a launchd job on your Mac running `make feed-verify`,
    or an external uptime monitor on the timestamp's age. The Mac job is free and compares both;
    the monitor works while the Mac is off. Accepted by D90; under D98, the launchd job on your
    Mac, since an outside monitor needs an account.
85. **The app's own update channel.** Until it exists, a root compromise or a broken feed client is
    fixed only by users reinstalling, and installed devices get no notice. Recommendation: ship the
    app update channel (SPEC-W1 Later) before launch to real users, as its own SPEC.
86. **The CI's GitHub identity.** PRs opened with the built-in token do not run the required
    checks. Recommendation: a GitHub App owned by you, installed only on `duly-feed`, scoped to
    pull requests and issues, whose PRs run the gates and need your merge. Accepted by D90; it
    waits with the feed repository under D98 (FEED-P5).

## Later

The feed's hosting and keys (FEED-P5, then FEED-P10, FEED-P9 if approved, and FEED-P6's scheduled
job), when the founder chooses (D98); the hardware key (point 83). The feed on Duly's own AWS (a DNS
change, with no access logs, point 40); Windows (rename semantics tested there); phones and the Rust
core reading the same metadata with `tough` (D78, D82); H-1B, O-1 and EB-1A packs as their own plans
(D89); school pages (D3, D24); email alerts for approved updates (D22); a public transparency log
for signed metadata; the app's own update channel (SPEC-W1 Later, point 85).

## Review notes

Two reviews on 2026-10-01: security and legal line (25 findings, S1 to S25) and buildability (36
findings, B1 to B36). Every finding was checked against the repository; most are fixed in the
points above. Where a finding was wrong or partly wrong, the SPEC keeps its own choice for the
reason given.

- **S2, which statuses are "in effect".** update.schema.json has no effective date field, so
  "effective date on or before today" could not be computed. KF6 adds `pack.in_force_from`, and
  a null date counts as in force only for `effective`, `enjoined`, `stayed`, `vacated` and
  `rescinded` (point 30).
- **S3, a new `snapshot_sha256` for every moved date.** Pinned eCFR point-in-time URLs and stable
  PDFs return the same bytes when fetched fresh, so a new hash cannot be required. The proof is a
  fresh fetch recorded in `recheck-<date>.json` on or after the date, plus the eCFR versions-list
  check (point 55).
- **S7, every appellate entry is a hold.** Before FEED-P8, a hold makes every F-1 verdict Can't
  tell yet at once, and briefing notices arrive often. Orders, opinions, judgments, stays,
  motions for a stay and entries whose type cannot be read are `hold`; other appellate entries are
  `changed`, which withholds the record and ages the rules (point 16).
- **S1, the copy lint list on the device.** The legal-line checks (second person, conclusion,
  instruction, modal) run on the device through `publish_blockers`. The copy lint phrase list is a
  style list in `tools/`, which is not bundled; it runs in the gate and in `feed-sign` instead.
- **S6, "no network except Pages deploy" for the attest job.** It must also push to the `served`
  branch on GitHub. It still fetches nothing from the sources.
- **S9, the exact disclosure wording.** Kept, with "copy of Duly" shortened to "copy" to avoid
  saying Duly twice in one sentence.
- **S12, ship the app update channel before launch.** Outside this SPEC; raised as point 85.
- **S25, direct Anthropic access.** Not a defect: BOUNDARY allows it for public law text, and
  FEED-P9 reads only that. The export and the input check are added (point 65).
- **B1, a new version folder.** Dropped as the critic suggested: v2026.09 is edited in place.
- **B4, where `min_engine` lives.** The target custom data (KF2), copied into `FILES.json`, with
  `ENGINE_VERSION` in `engine/__init__.py`; the rulepack schema is unchanged.
- **B16, removing `desktop/**` sub-paths from L-desktop's lane file.** The lane file has one glob;
  protection comes from `guard_paths.py` instead (point 19).
- **B24, "Allow GitHub Actions to create pull requests".** Replaced by the GitHub App of point 86,
  since PRs from the built-in token skip the required checks (S6).
- **B35, one grep per id.** Added, with `grep -w`: a plain grep for `FEED-T1` would also match
  `FEED-T10`.
