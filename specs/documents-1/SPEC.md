# Documents round 1: kept on the student's computer, read there, confirmed by the student

Read these first: DECISIONS.md D7, D13, D23, D27, D48 and D54 to D57; PRINCIPLES.md; BOUNDARY.md; security/threat-model.md; specs/product-1/SPEC.md sections 1, 3 and 5; specs/plain-1/SPEC.md section 4; specs/desktop-1/SPEC.md; docs/requirements/canvas-conflicts.md rows 15 to 17.

No lane starts until three things are true:

- Path round 1 is on main. It changes contracts/case.schema.json, which this round changes again.
- Desktop round 1 is on main. The vault needs its main process, app protocol, guard, preload and local token. Today desktop/src holds only about.ts.
- The founder has answered section 18 in DECISIONS.md. Where an answer differs from the recommendation, this SPEC changes first.

In D54 the founder said: "A really big part of Duly is going to be document sorting and secure storing in one place." Today the only document in Duly is a number the person types. It is `documents_count`, the field "Documents added" in web/src/components/CaseForm.tsx. The screen then says "Based on 3 documents you added" when nothing was added. This round puts the documents themselves in place of that number.

What the student sees:

- They drop a file on Documents, and it is encrypted before it is saved.
- Duly reads the file on their computer. It shows each thing it read beside the part of the page it came from.
- The student ticks what is the same as on their document. Only what they tick or type is ever used.
- Their I-20s line up oldest to newest, and every one is kept.
- Where two documents disagree, Duly asks and never decides.
- The lock is the computer's own Touch ID or password, so there is nothing new to remember. There is one thing to keep: a recovery kit, made once.

Every value in this SPEC is a claim to check against the saved source. It is never a fact to copy (PRINCIPLES 1).

## Covers

**Met when this round is done (91 rows):**

- **Scope and decisions:** DEC-D54-001, DEC-D54-003, DEC-D55-001, DEC-D55-002, DEC-D55-003, RMKT-006, RMKT-023, WB06-002, WB06-007, PLAN01-036.
- **Storage and keys:** PLAN03-092, PLAN03-096, IMPL-078, PLAN11-025, PLAN01-015, PLAN05-020, PLAN05-021, WB01-097, WB04-036, WB04-042, WB06-073, WB07-003, PLAN13-011, RCUT-008, WB04-044.
- **The one lock:** PLAN03-052, WB02-033, WB02-034, WB03-098, WB03-100, WB03-103, WB03-104, WB03-111, WB03-117, WB01-093, WB04-038, WB06-035.
- **The Documents screen and History:** PLAN03-053, WB02-004, WB02-035, WB03-105, WB03-106, WB03-107, WB03-112, WB03-115, WB03-118, WB03-119, WB03-121, WB03-122, WB03-123, WB01-095, WB07-018, WB03-095, WB04-040.
- **Versions:** DOCS-005, DOCS-012, DOCS-013, RMKT-005, WB06-041.
- **Reading, confirming and comparing:** WB06-032, WB06-042, WB06-043, DOCS-001.
- **Threats, models and attacks:** RCOMP-061, RCOMP-143, PLAN05-060, PLAN05-009, PLAN05-010, PLAN05-014, PLAN05-015.
- **Copies and rights:** WB01-022, PLAN04-020, WB02-030, WB03-125, WB03-126, WB03-127, WB03-132, WB03-137, WB03-139, WB03-143, WB03-150, WB03-158, WB03-160, WB01-106, WB04-051, WB04-060, WB04-061, WB04-062, IMPL-055, PLAN04-017, PLAN04-056.

**Met with a change the founder approves in section 18 (22 rows):**

- **The lock (F1):** WB01-092, WB03-101, WB03-102, WB04-039, WB07-012.
- **A placeholder where the handoff blurs the name (F11):** WB02-032, WB03-099, WB01-091.
- **The screen (F5, F11):** WB03-108, WB03-109, WB03-110, WB01-094, WB01-096, WB03-120, WB04-037, DOCS-003, DOCS-004.
- **The I-20 chain (F4, F11):** DOCS-006, DOCS-008.
- **Copies (F11):** WB03-136, WB03-156, WB03-159.

Of these rows, 104 are among the 2085 that the first version must hold. Today 325 of those 2085 are met, which is 16 percent. If every row above passes audit, 429 are met, which is 21 percent.

Sections 17 and 18 place 101 more rows. Each one is in a later round, in a round of its own, moved forward here but not finished, or left for the founder to mark as overridden, restated or waiting on counsel. The register keeps no fixed list of the documents area. L-audit writes the list it counts, with the rule it used, in docs/requirements/audits/documents-1.md. It then reports the share of that list met.

That is 113 of 2443 requirements.

## 1. What this round builds, and what waits

| Part | This round | Later | Why it waits |
|---|---|---|---|
| Vault, lock, recovery kit, add, open, remove, History | macOS | Windows, in documents-3 | D7: the prototype comes first on macOS. The words cover both platforms now (section 14) |
| Reading | I-20, EAD card front, I-94 printed from CBP's website, I-797 notice, on macOS | Passport and visa foil (their machine-readable lines, with check digits), more forms, Windows | Each form needs a saved official specimen first. The Windows reader needs a Windows build, and Windows text recognition reports no confidence |
| Confirming, the I-20 chain, comparing, feeding the case | Yes | | |
| A copy for a DSO or attorney | Zip file or folder, saved on the computer | Link, in documents-3 | A link needs accounts, MFA and a server path |
| Encrypted backup to Duly's AWS | Designed in section 12 | documents-2 | It needs accounts, the us-west-2 bucket, a consent screen and a published policy. This round's format and keys already allow it |
| Documents by status period | No | documents-3 | It needs path-1's stages beside each document. A grouping Duly cannot source would be a guess |
| Travel signature period, I-94 checks, completeness against published lists | No | When their rules are sourced | Duly does not have a number the law does not state (D35) |
| Timeline links to documents; WorkBook using this store | No | Timeline round; Phase 8 | Those screens are not built. This store and this lock are the ones WorkBook will use |
| RFE response, AI marking in exports | No | After counsel; D6 is open | BOUNDARY B7; D6 |
| A vault on the web | No, in any round of this design (F9) | | Section 11 |
| Phones | No | Not planned | D7 names macOS and Windows. The cutlines put mobile after validation |

## 2. The founder's part (step 0, first and alone; lanes may not change it)

### Answers

The founder answers section 18 in DECISIONS.md before step 1. The lock (F1) and the recovery kit (F2) shape the keys. If either answer differs from the recommendation, sections 3, 9 and 13 are rewritten before any lane starts.

### Contracts

| File | Change |
|---|---|
| contracts/case_f1.schema.json, contracts/case.schema.json | `documents_count` is removed. Three lists are added. `document_facts`: fact, value, document, kind, field, confirmed_on. `documents`: each confirmed document's id and kind, and for an I-20 its chain id and confirmed date issued. `document_differences`: id, the document and field ids it covers, and a fingerprint of the values, with no values. Every id is random and made on the computer. `confirmations` gain an optional `chosen`: the document, or "typed", that the student chose in answer to a documents question |
| contracts/engine_output.schema.json | `scope` becomes `documents_confirmed`, `dates_typed` and `rules_checked_on`. `documents_count` is gone. Each computed item's inputs gain `origin`: typed, answer, or document with its id, kind and confirmed_on. The output gains `documents`: the I-20 whose dates are used, and each open difference by id |
| contracts/document_forms.schema.json (new) | How a form is described: markers, fields, printed labels, places, date format, pattern, fact key, use, compare flag, case mapping with its basis and source, and where each marker and label was seen in the saved source |
| contracts/reader_output.schema.json (new) | What the reader helper returns: for each page its size, then its lines, each with text, confidence and box |
| contracts/vault_bridge.schema.json (new) | Every call the main window's preload exposes, with inputs and outputs, and the three calls of the recovery kit window. No call returns a key, a path or file bytes. The one exception is the kit window, which shows the recovery key once |
| contracts/vault_format.md (new) | The data folder, the header, the envelope, the file chunks and every key wrap (section 3), with the functions the tests call. documents-2 backs up and restores this format without guessing |
| contracts/openapi.yaml | The local document routes of section 8, and the 422 for document fields without the local token |

### Settings

These are Duly's own choices, not law. They live in contracts/product_settings.yaml, each with `decided_in: specs/documents-1/SPEC.md`. The founder sets the values. The ones below are proposals.

| id | Proposed | Meaning |
|---|---|---|
| vault.lock_after_minutes | 5; choices 1, 5, 15, when I quit | From the handoff |
| vault.max_file_megabytes | 50 | A larger file is refused with one plain line |
| reader.min_line_confidence | 1.0 | Only lines Vision reports as certain are used. The reader check records the confidences measured on the fixture set. The founder lowers this only after reading them, and never to a value at which any fixture gives a wrong field |
| reader.render_dpi | 300 | The resolution at which pages are drawn for reading |
| reader.max_pages | 5 | Pages read per document. The rest are kept but not read |
| reader.max_page_megapixels | 50 | A larger page is not decoded |
| reader.timeout_seconds | 30 | The helper is stopped after this |

### Dependencies (approval required)

- better-sqlite3-multiple-ciphers, used in its SQLCipher 4 scheme with a raw key, built for Electron 44.
- @electron/rebuild, for that native module.
- fflate, for zip files.

Everything else comes with the platform:

- Every cipher, key agreement and hash uses Node's own crypto.
- The keychain is reached through Electron's `safeStorage`.
- The two macOS helpers need only the Xcode Command Line Tools, with no Swift packages.

### Guards, tools and CI

- eslint `no-restricted-imports` allows the SQLCipher binding only under desktop/src/main/.
- tools/gates/engine_literals.py adds engine/documents.py to `CHECKED`.
- tools/sources/forms.py (new) runs in gate 7 as `uv run python -m tools.sources.forms rulepacks`. It checks every form in every forms.yaml:
  - The saved source exists, matches its hash in SOURCES.md, and comes from a host in `PRIMARY_HOSTS`.
  - Every marker and label marked as seen in text is found in the saved copy's text, read the way tools/sources/verify.py reads it.
  - Some markers and labels are marked as seen in an image: a PDF page or a picture, which the tool cannot read. It lists each of these by form and page for the reviewer. The reviewer checks each one beside the saved copy.
  - Every field names its use: a case fact, the chain or the comparison.

  It prints how many it found in text and how many wait for the reviewer. It fails when it finds no form, so a run over nothing cannot pass.
- CBP's I-94 host (i94.cbp.dhs.gov, a claim to check) is added in three places:
  - `PRIMARY_HOSTS` in tools/sources/verify.py;
  - the copy in desktop/src/guard.ts, so desktop-1's test that the two lists are the same still passes;
  - the network list in factory/agents/rulepack-drafter.yaml.
- desktop/vitest.config.ts includes `../tests/desktop/**/*.test.ts`, so the test lane's desktop tests run with `npm test -w desktop`.
- The Makefile builds both helpers in `make desktop`, and adds `make desktop-reader-check` (section 16).
- CI gains a macOS job that builds the reader and runs `make desktop-reader-check` over the fixture set and the attack corpus.

## 3. The vault on the computer (L-desktop)

All vault code lives in desktop/src/main/, the folder beside desktop-1's desktop/src/main.ts. Only this folder imports the SQLCipher binding (CLAUDE.md). The copy lint reads all of desktop/ and lists the word "sealed", so the code calls an encrypted value an envelope.

### Where things are

The data folder is Electron's `app.getPath('userData')`. It is never Documents or Desktop, which cloud sync often uploads.

| What | Where | Encrypted with |
|---|---|---|
| The format version, the vault's public key and the key wraps | header.json | Holds only wrapped keys and public values |
| The record: case facts, the document index, History, the list of saved copies, settings | duly.db | SQLCipher 4, under key D |
| Each document file | files/\<random id\> | Its own file key F: AES-256-GCM, in 1 MiB chunks |
| Names, kinds, fields read, the document side of each confirmation, notes, names in History | Envelopes in duly.db | Encrypted to the vault's public key V |

Duly writes no plaintext temporary file, no page cache and no thumbnail.

### Keys (the recommendation in F1 and F2)

| Key | Made | Kept | Opens |
|---|---|---|---|
| D, the record key: 256 random bits | First launch | Wrapped by `safeStorage` (Keychain on macOS, DPAPI on Windows). A second copy wrapped under K sits in header.json | duly.db |
| K, the vault key: 256 random bits | Setup | Only wrapped: once under U, once under a key derived from R | V's private half, and D's second copy |
| U, the unlock key: 256 random bits | Setup | Development build: wrapped by `safeStorage`. Signed build: a Keychain item that needs user presence | K |
| V, the vault key pair: X25519 | Setup | Public half: header.json. Private half: wrapped under K | Every envelope, and so every file key |
| F: one per file, 256 random bits | When the file is added | In an envelope in the file's row | That file |
| R, the recovery key: 128 random bits | Setup | Only in the student's recovery kit. Duly keeps no copy | K, through HKDF-SHA256 |

- V is a key pair so that adding needs only the public half. The drop zone works while documents are locked, and nothing added can be read without unlocking.
- D opens without unlocking, so Home and the verdict work while documents are locked.
- Unwrapped keys live in main's memory only while unlocked. The screen never holds a key.

**Envelopes.** An envelope holds, in order:

- "DULY" and a version byte;
- an ephemeral X25519 public key;
- a 96-bit nonce;
- the AES-256-GCM ciphertext and its tag.

The key is HKDF-SHA256 over the shared secret, with the purpose and the vault id in its info.

**Wraps.** A wrap is AES-256-GCM with a random nonce. Its additional data names the key wrapped, the key that wraps it and the vault id, so a wrap moved to another place fails.

**Files.** A file begins with a header. Then come its chunks.

- Each chunk's nonce is a random 64-bit file prefix plus a 32-bit chunk counter.
- The document id, the chunk index and a final-chunk flag are bound to each chunk as additional data.
- A chunk reordered, dropped or cut short fails the check, and the file is reported. It never opens with the wrong content.

### Setting up (once)

The first time the student opens Documents or adds a file:

1. One screen: "Your documents are kept on this Mac, encrypted. They open with Touch ID or this Mac's password. Anyone who can log in to this Mac with its password can open them too. Duly reads your documents on this Mac. Nothing is sent anywhere to read them."
2. Main makes K, U, V and R in memory.
3. The recovery kit (below).
4. Once the kit is checked, main writes header.json, and a dropped file is added.

### The recovery kit

The kit is made at setup. Without it, a reset keychain would lose every document, and nothing here waits for the backup.

- It opens in its own window. That window's preload has three calls and nothing else: show the key once, save the kit, and check what the student typed. The main window never receives R.
- The key shows as groups of letters and digits that cannot be mistaken for each other, then a check group, so a typing mistake is caught before it is tried.
- "Save the recovery kit" saves a one-page PDF through the system save dialog. "Print" prints it.
- Setup finishes only after the student types the last two groups back.
- The words: "This kit opens your documents if this Mac's keychain loses Duly's keys, for example after the Mac's password is reset. Only you have it. Duly keeps no copy. If you lose the kit and the keys on this Mac, no one can open your documents, including Duly. Keep it somewhere other than this Mac."
- When the keychain has lost D or U, Duly says: "Duly needs your recovery kit to open your documents on this Mac." The kit opens K. Main then makes U again. If D is lost too, main puts D back into `safeStorage` from its second copy.
- "Make a new recovery kit" (Privacy, while unlocked) wraps K under a new R and deletes the old wrap. The old kit stops working.

### The one lock

- Documents start locked at every launch. One lock covers every document. When WorkBook comes (Phase 8), it uses this store and this lock.
- **Unlocking** asks the operating system, through a helper of its own, desktop/native/macos/duly-unlock:
  - macOS: Touch ID or the Mac's password, through LocalAuthentication (`deviceOwnerAuthentication`).
  - Windows (documents-3): Windows Hello or the PIN, through `UserConsentVerifier`.
  - duly-unlock takes no file and never sees a document. The reader helper (section 4) never asks for Touch ID and never touches the Keychain.
- **Which build holds what.**
  - The development build is unsigned. There, the prompt is a gate kept by Duly's own code, and U comes from `safeStorage`.
  - In the signed build, U sits in a Keychain item made with user presence required, and only duly-unlock reads it. The OS itself then refuses U without Touch ID or the password.
  - The threat model says which build has which.
- **After unlocking.** Main unwraps K, then V's private half, and holds them in memory only.
- **Locking again.** Documents lock again:
  - after the chosen minutes with nothing done in Documents. Each action restarts the time, so the student is never locked out halfway through checking a document;
  - on Lock;
  - when the computer sleeps or its screen locks (`powerMonitor` suspend and lock-screen). "When I quit" still locks on these;
  - on quit.
- **What locking does.**
  - It zeroes K, V's private half and every file key main holds.
  - It stops any reading.
  - It tells the screen to drop every name, field and page image.
  - JavaScript cannot promise that no copy stays in memory, and no sentence says it does.

### What is kept for each document

| Kept | Where | Readable while locked |
|---|---|---|
| id (random), added at, removed at, file id, size, a duplicate key (HMAC-SHA256 of the bytes under a key derived from D) | duly.db row | Yes. No name and no kind |
| F, in an envelope | duly.db row | No |
| The file | files/ | No |
| Original file name, media type from the first bytes, page count, SHA-256 of the file | Envelope | No |
| Kind, and how it was set (recognised and confirmed, or chosen by the student) | Envelope | No |
| The reading: reader and forms versions, the day, the outcome, and why a field is blank | Envelope | No |
| Each field read: id, fact key, text as read, value, line confidences, page, box | Envelope | No |
| Each confirmation: the value, whether the student ticked or typed it, the day | Envelope. The case fact it feeds sits in duly.db with its kind and day | The case fact, yes, so Home works |
| The student's label and note, an I-20's reason for issue, whether it goes in copies (on by default), last opened (only while that switch is on) | Envelope | No |

Nothing is overwritten:

- Each file is a document of its own. A reissued I-20 is added beside the old one.
- A changed field is a new confirmation. The old one stays in the record.
- A newer reader or forms version never replaces a confirmed value. If it reads something different, Duly asks.

### Adding

- Wherever files go in there is a drop zone and an Add button, never one without the other.
- Any file type is accepted, several at once.
- Main takes a path only from two places: its own file dialog, or `webUtils.getPathForFile` on a real drop, called in the preload. It refuses:
  - a path string from the screen;
  - anything that is not a regular file;
  - anything inside the data folder;
  - anything over `vault.max_file_megabytes`.
- A file already in the vault, found by its duplicate key, is not added twice: "This file is already in your documents, added \<date\>."
- Main then, in order:
  1. reads the file into memory;
  2. encrypts it to files/\<id\>.part, syncs it to disk and renames it;
  3. decrypts it back and compares its SHA-256 with the bytes it read;
  4. only then writes the row, its envelopes and the History line, in one transaction;
  5. reads it (section 4) at once if documents are unlocked, or at the next unlock.
- If any step fails, nothing half-added remains: "Duly could not add this file. Nothing was changed." At launch, a .part file or a file with no row is deleted.
- The file the student chose stays where it was. Duly does not move or delete it, and says so once: "Your original is still where it was. Duly keeps its own encrypted copy."

### Opening

- Documents open only while unlocked.
- Main decrypts the file into memory and has the reader helper draw the pages at screen size.
- The screen gets PNG bytes over the bridge and shows them as `data:` images, which the desktop-1 CSP allows.
- Nothing is served through duly://app/, so nothing enters Chromium's cache. No file is written.
- PDFs and images open inside Duly. Any other kind shows: "Duly cannot show this kind of file here. Save a copy to open it in another app."

### Removing, and nothing lost

- **Remove** is a quiet text button, not red.
  - Its confirm is inline: "Remove? Keep / Remove". Keep sits where the cursor was.
  - The document moves to Removed at the bottom of the All tab, still encrypted.
  - Its fields stop feeding the case, and the verdict is computed again.
- **Put back**, in Removed, returns the document to the lists.
- **Delete for good**, in Removed, has its own inline confirm: "Delete for good? Keep / Delete".
  - It deletes F's envelope and the row, then the file, with the database's `secure_delete` pragma on.
  - An SSD may keep old blocks. What makes the file unreadable is the destroyed key.
  - History keeps the line "A document was deleted for good", without the name.
- **Delete everything on this Mac**, in Privacy, asks for Touch ID or the password, then an inline confirm. It deletes files/, duly.db, header.json and both keychain entries. With no account yet, this is all of Duly's data on this computer.
- Duly never removes or deletes a document on its own.

### Checks

- "Check my documents", in Privacy, decrypts every file and compares its SHA-256. Any file that fails is named in plain words, never passed over.
- Before any change to duly.db's layout, the old file is copied, still encrypted, and kept until the change is checked.

### History

History is append-only and lives in duly.db. Names are in envelopes. While documents are locked, lines show without names. A name is the student's label if there is one. Otherwise it is the confirmed kind ("EAD card"), and otherwise the original file name.

| Event | Line |
|---|---|
| Setup | "Recovery kit made" |
| Added | "N documents added" |
| Unlocked | "Documents unlocked" |
| Unlocked with the kit | "Documents unlocked with the recovery kit" |
| Opened (switch on, the default) | "\<name\> opened" |
| Fields confirmed | "Fields checked on \<name\>" |
| Removed / put back | "\<name\> removed" / "\<name\> put back" |
| Deleted for good | "A document was deleted for good" |
| Copy saved | "Copy saved: \<pack name\>" |
| New kit | "New recovery kit made" |

## 4. Reading and sorting on the computer (L-desktop, L-engine, L-content)

### The reader, on each platform

| Platform | Pages to images | Text | Built as |
|---|---|---|---|
| macOS (this round) | PDFKit for PDFs; ImageIO for JPEG, PNG, HEIC, TIFF | Apple's Vision (`VNRecognizeTextRequest`): accurate level, en-US, language correction off | desktop/native/macos/duly-read, a Swift command line tool built with swiftc |
| Windows (documents-3) | `Windows.Data.Pdf`, `Windows.Graphics.Imaging` | `Windows.Media.Ocr`, English | desktop/native/windows/duly-read.exe, C# using only the Windows SDK |

- **Why these engines.** Both run on the computer and come with the operating system. They add no dependency and no model file.
- **No model.** D54 says no document goes to one, and a model's output is not a reading anyone can check.
- **Language correction is off.** It changes letters to make dictionary words, which would change names and IDs.
- **Windows.** `Windows.Media.Ocr` reports no confidence. Before Windows reading is built, documents-3 says what takes the place of rule 3 below.

### How duly-read runs

- One process per request. Bytes arrive on stdin. JSON leaves on stdout, in the shape of reader_output.schema.json. A second mode draws one page as PNG for viewing and for crops.
- It checks the page count and each page's size against the settings before decoding. It is stopped after `reader.timeout_seconds`, and on lock.
- It writes no file, has no network, never touches the Keychain and never asks for Touch ID.
  - Development build: main runs it under a sandbox-exec profile, desktop/native/macos/duly-read.sb, that denies the network and file writes.
  - Signed build: it sits inside the app bundle with the App Sandbox and no network entitlement. Its Info.plist is linked into the binary, so the sandbox applies to a command line tool.
- **Only visible pixels are read.** It draws each page and recognises the text in the image. It never uses a PDF's text layer, form fields, metadata, attachments or scripts. So hidden text and planted metadata cannot become a field.
- Main holds the text it returns only until the engine replies. The text is never written or stored. Only the fields are kept.

### After the text

Recognising, reading fields and parsing dates are pure functions in engine/documents.py. Main calls them through the local routes (section 8). One implementation serves both platforms and meets the engine's gates, and the engine owns every date.

### What is recognised and read in this round (L-content)

A form's markers, labels, places, date format and patterns come from rulepacks/documents-us/v2026.09/forms.yaml, following contracts/document_forms.schema.json.

- Each form is cited to an official specimen or blank form saved under that folder's sources/. SOURCES.md gives its URL, its hash and the day it was checked.
- Each marker and label records where in the saved source it was seen.
- A form with no official specimen found is not read; the student sorts it.

Every field read has a use: a case fact, the chain or the comparison. A field with no use is not read (RCOMP-036), and tools.sources.forms checks this. The fields below are what this round aims for. L-content keeps a field only where the saved specimen prints it, and records every field it drops.

| Kind | Field read | Used for |
|---|---|---|
| I-20 | Family name, given names, date of birth | The comparison |
| | SEVIS ID | The chain and the comparison |
| | Program end date | `program_end_date`, from the I-20 whose dates are used (section 6) |
| | Date issued | The chain's order |
| | Reason for issue, only where the page prints it | The chain's groups |
| EAD card, front | Family name, given names, date of birth | The comparison |
| | Category, as printed | Shown beside the question "Which period is this card for?" |
| | Valid from, card expires | `opt.ead_start` and `opt.ead_end`, or the `stem.` pair, by the period the student picks (section 5) |
| I-94, printed from CBP's I-94 website | Family name, given name, date of birth | The comparison |
| I-797 notice | Family name, given name | The comparison |
| | Form number and notice type, as printed | Which date the notice holds |
| | Received date, only if a saved primary source ties it to the filing date | `opt.i765_filed_date` or `stem.i765_filed_date`, by what the student says the notice is for. Otherwise it is not read, and the student types the date |

- **Case mappings.** Each mapping in forms.yaml records its basis: `printed` (the form's own words name the fact) or `reading` (with its quote). A reading is marked "Duly's reading" wherever it shows (product-1 section 5). Duly never maps an EAD category to a period; the student picks (BOUNDARY B5).
- **Never read:** passport number, A-number, USCIS number, card number, receipt number, I-94 admission number, addresses, money figures, photos, and the I-20's employment and travel signature sections. No rule Duly computes in this round needs them.
- **Kinds the student picks from:** I-20, EAD card, I-94, I-797 notice, passport, visa, I-983 training plan, offer letter, employer letter, pay stub, SEVP portal record, transcript, school letter or email, EIN letter, articles of incorporation, business license, bank statement, contract, invoice, other. This list replaces the one in WB04-037.

### Never guessing

1. A kind is recognised only when every marker of exactly one form is found. If no form or more than one form matches, the document is not sorted, and the student picks the kind. This round takes one document per file.
2. A field is read only from its place beside its printed label, and only when that label is found exactly once. Otherwise the field is blank.
3. Every line a field uses must reach `reader.min_line_confidence`. Vision reports one confidence for each line it reads. Otherwise the field is blank.
4. A date must parse in one way only, in the format the form prints, and must be a real calendar date. A two-digit year is refused. Other formats are never tried in turn.
5. A value must match its pattern in forms.yaml, for example the SEVIS ID's. Otherwise the field is blank.
6. There must be exactly one candidate in the value's place. If the same field is read twice on one document with different results, it is blank.
7. No field is worked out from another field, the file name, the date added, the case or another document.
8. A blank field says why in plain words, and offers "Type it".
9. No model reads, sorts or checks a document, on the computer or anywhere else.

### When reading fails

The file is always kept, encrypted. A failed reading never loses a document, and nothing is sent anywhere to try again.

| What happened | What the student sees |
|---|---|
| A kind Duly does not read (Word file, spreadsheet, zip) | "Kept, encrypted. Duly does not read this kind of file." The student picks the kind |
| Not recognised | "Duly could not tell what this is. What is it?" with the list of kinds. If the student picks a kind Duly reads, Duly tries that form. Whatever it finds still goes through section 5 |
| A field blank | "Duly could not read this clearly." with Type it |
| A PDF with a password | "This PDF has a password, so Duly cannot read it. It is kept as it is." |
| More pages than `reader.max_pages` | The first pages are read, and the screen says how many |
| A page over `reader.max_page_megapixels` | "This page is too large to read. The file is kept." |
| The helper timed out or failed | "Duly could not read this document. It is kept, encrypted." with Try again |
| No reader on this computer (Vision text needs macOS 10.15 or later) | Reading is off and the student types. The screen says why |

## 5. The student confirms every field (L-web, L-desktop)

After reading, Documents opens one calm panel for that document:

- The first page, small, on the left.
- On the right, one row per field. Each row has the field's plain name ("Program end date"), the value as read with dates written out ("May 15, 2027"), and the crop of the page it came from.
- **Two choices on each row.**
  - A tick, "Same as my document", unticked at first.
  - Or "Change", where the student types the value or clears it. The row then says "Typed by you" beside the crop.
  - A row left unticked is not used.
- **The kind is a row too:** "Sorted as: I-20", with the same two choices. Change opens the list of kinds.
- **EAD cards.** One more row asks "Which period is this card for?", as a list: OPT, STEM OPT, Another period.
  - The printed category shows beside it.
  - The student picks; Duly does not.
  - With Another period, the card's dates feed nothing this round, and the card is kept.
- **I-20s.** One more row asks "What was this I-20 issued for?". It is filled in only when the page prints it. The student ticks it, or picks from Initial attendance, CPT, OPT, STEM OPT, Transfer and Another reason.
- **I-797 notices** whose received date is read: "Which application is this notice for?", OPT or STEM OPT, unless the page prints it.
- **At the foot, two buttons.**
  - "Use the checked fields" saves the ticked and typed rows as the student's own statement, with the day.
  - "Later" closes the panel. The row's meta line then adds "Fields not checked yet".
  - There is no badge, no counter and no "check all".
- Unticked rows are kept as read and never used. Only confirmed fields are used anywhere: in the case, the chain, the comparison and a saved copy's index.
- Every input sets spellcheck off, and the app turns spellcheck off, so no word goes to a spelling service.

## 6. The I-20 chain (L-engine, L-web)

**Building the chain.** engine/documents.py builds chains from confirmed fields only. The chain route returns the order, the numbers, the groups and every count; the screen computes none.

- One chain per confirmed SEVIS ID.
- Versions are ordered by confirmed date issued, with v1 the oldest.
- Some I-20s get no number: one with no confirmed date issued, or one with the same date issued as another in its chain. It sits at the end under "Not in order yet", with "Confirm its date issued." or "Two I-20s show the same date issued." Duly never guesses a place.
- Versions are grouped by the confirmed reason for issue. Groups run newest first, and versions within a group run newest first. Each group shows its version count.
- The group holding the newest version is open. Groups open and close on their own.

**Which I-20's dates are used.**

- Only one I-20 feeds the case at a time. With one confirmed I-20, it is that one.
- Two or more I-20s may hold a confirmed program end date. Then the engine raises the question `documents.i20_in_use`. Until it is answered:
  - the verdict is `cannot_tell` with `unconfirmed:documents.i20_in_use`;
  - the items that use the program end date are null.
- The question: "Duly uses the dates on one I-20. Use the one issued Aug 14, 2026?"
  - The one proposed is the newest by confirmed date issued.
  - The buttons are "Use this I-20" and "Choose another I-20", which lists them.
- The answer is the student's own statement, with the day and the document chosen. It opens again when an I-20 with a later confirmed date issued is confirmed, or when the chosen one is removed.

**Each row:**

- A 128px version column with vN.
- A title such as "I-20 · OPT" (the confirmed reason), or "I-20" when there is none, plus the student's own note if they wrote one.
- A meta line, "Issued Aug 14, 2026". Older versions read "Issued Jan 6, 2026 · kept for the record".
- The I-20 whose dates are used carries DATES USED (11px, 700, visa blue) where the canvas has CURRENT (F4).
- An Open action. Every row is in full ink.

**What waits.**

- A travel signature's period waits for its rule to be sourced. Its words are in canvas-conflicts row 16.
- "The copy filed with your I-765" waits for filing records (documents-3).

**Footer**, word for word from canvas-conflicts row 17: "Every version kept, oldest to newest. Stored encrypted on this device."

## 7. Names, dates of birth and SEVIS ID compared (L-engine, L-web)

**What is compared.** engine/documents.py compares family name, given names, date of birth and SEVIS ID across the confirmed documents that show them. It also compares every case fact that more than one source gives (section 8). Nothing else is compared.

**How values are compared:**

| Fact | Rule |
|---|---|
| Names | Unicode NFC, case folded, runs of spaces made one. Accents, hyphens, order and middle names all count as differences |
| Dates | Equal as dates |
| SEVIS ID | Upper case, spaces removed |

**When it runs.** The comparison runs while documents are unlocked, whenever a field is confirmed or changed, or a document is removed or put back.

- The route returns the differences and the number of documents compared.
- Main stores each difference in duly.db: its id, the document and field ids, and a fingerprint of the values (HMAC-SHA256 under a key derived from K).
- The values stay in envelopes. So while documents are locked, the questions and answers stay readable and the verdict stays right.

**Ids:**

- `documents.identity.family_name.differ`, `documents.identity.given_names.differ`, `documents.identity.date_of_birth.differ`, `documents.identity.sevis_id.differ`.
- `documents.fact.<fact>.differ`: two documents give one case fact different values.
- `documents.fact.<fact>.typed_differs`: a typed value differs from a confirmed document.

**The hero at the top of Documents** (canvas-conflicts row 15):

- **No differences.** Eyebrow "NO DIFFERENCES FOUND", title "\<N\> documents compared", line "Names, dates and SEVIS ID were compared across the \<N\> documents you confirmed. No differences found. Checked \<date\>." One tap on "What was compared" lists each fact and its documents.
- **A difference.** Eyebrow "A QUESTION FOR YOU", then "Two of your documents show different family names." Both values follow, each with its document, then the question. With several, the title reads "Your documents differ in \<k\> places", and each follows.
- **Not enough to compare.** "NOTHING TO COMPARE YET" / "Names, dates of birth and SEVIS ID are compared once two documents you confirmed show them."
- **Under every state:** "This compares your documents with each other. It does not check them against government records."
- **When any field is unchecked:** "Fields you have not checked are not compared."

**What an answer does**, as product-1 section 1 says for facts that do not fit:

- While a difference is open, the verdict is `cannot_tell` with the reason `conflict:<id>`.
- The question: "Is this what each document shows?" The buttons: "Yes, they show this" and "No, I will change what Duly read".
- No: the student changes the field. The question closes once the values agree.
- Yes:
  - The answer is recorded as the student's own statement, with the day.
  - The verdict is `talk_to_dso` with the judgement item `<id>` (F6).
  - The screen says "Recorded as what your documents show, on \<date\>. Whether it matters is a question for your DSO."
  - Below it is a drafted email in the student's own voice (D57, plain-1 section 4). It never mentions Duly:

  > Subject: A question about my documents
  >
  > Hello,
  >
  > My I-20 issued on \<Aug 14, 2026\> shows my family name as \<A\>. My EAD card shows it as \<B\>. Could you tell me if this difference needs anything from me?
  >
  > Thank you,
  > [Your name]

- When a value changes, the fingerprint changes and the question opens again (product-1 section 3).

The screen never says which value is right.

## 8. Confirmed fields feed the case (L-engine, L-api, L-desktop, L-web)

**Where the case lives.** On the desktop it lives in duly.db under key D, so Home works while documents are locked. It holds:

- each typed fact;
- each fact from a confirmed field, with its value, document id, kind, field and day;
- the list of confirmed documents;
- the differences and the student's answers.

The case form saves through the bridge.

**Only main says a fact came from a document.**

- On the desktop, the app protocol does not pass a page's body to `/v1/compute/`. Main sends the case from the case store instead. A page that sends `document_facts`, `documents` or `document_differences` changes nothing.
- A page request for `/v1/local/` gets 404 from the app protocol. Only main calls the local routes.

**Values that differ.** Main never chooses. The items that use the fact are null until the student answers (product-1 section 1).

- **Two documents** give one fact different values:
  - This raises the conflict `documents.fact.<fact>.differ`, and the verdict is `cannot_tell`.
  - The question: "Two of your documents show different \<program end dates\>. Which does Duly use?" Each value is listed with its document, then "Use this date".
  - The choice is the student's own statement, with the day. The verdict is then decided on the chosen value, and the others are kept (F6).
- **A typed value and a confirmed document** differ:
  - This raises the conflict `documents.fact.<fact>.typed_differs`. The question is the same, with "Typed by you" as one of the choices.
  - If the student chooses the document's value, the typed value is kept in the record and not used.
  - If the student keeps the typed value, the verdict is `talk_to_dso` with that judgement item. The drafted email states both dates as the student's own facts and asks.
- Duly never picks by recency or by source.

**Where each value came from.**

- Every computed item shows the origin of each input: "From your EAD card, confirmed Sep 29", "Typed by you" or "Your answer, Sep 29".
- On the desktop, while unlocked, the origin opens the document.
- Removing a document removes its facts at once. A fact left with no source is missing, and the verdict says so.

**The scope line.** The engine computes two counts:

- `documents_confirmed`: distinct documents whose confirmed fields are in the case.
- `dates_typed`: dates whose only source is the student's typing.

The lines read:

- With documents: "Based on dates from 2 documents you confirmed and 1 date you typed. Rules checked Sep 28, 2026."
- With none: "Based on 3 dates you typed. No document is attached to them yet. Rules checked Sep 28, 2026."

IMPL-028's third sentence waits for F13.

**The verdict rule stays (F3).** With no confirmed document the verdict is `cannot_tell` with `no_documents`. Its reason line is "No document is attached to these dates yet."

**The typed count is gone:**

- It leaves CaseForm.tsx, caseForm.ts, answers.ts, the samples in web/src/lib/samples, both case contracts, the engine output, engine/verdict.py, engine/f1.py and api/main.py.
- On the web, the heading "Dates from your documents" becomes "Dates you enter".
- A request that still carries `documents_count` is refused by the schema.
- A server without the local token refuses `document_facts`, `documents` and `document_differences` with 422: "Documents are read on your computer. This server does not take them."
- `/v1/status` keeps its empty case, with no documents confirmed.

**Local routes (L-api).** These exist only when `DULY_LOCAL_TOKEN` is set, and return 404 otherwise:

| Route | Takes | Returns |
|---|---|---|
| POST /v1/local/documents/read | The reader output, plus the kind if the student chose one | Kind and fields, each with its value or the reason it is blank |
| POST /v1/local/documents/chain | Confirmed I-20 fields with document ids | Chains: order, numbers, groups, counts |
| POST /v1/local/documents/compare | Confirmed identity fields and document facts | Differences with their ids, and the number of documents compared |

The bodies of these routes are never logged, stored or quoted in an error. `/v1/compute/f1` accepts the document fields only in local mode.

## 9. The Documents screen (L-web)

Layout, type and motion follow the canvas. Behaviour follows the handoff, except where a decision or BOUNDARY.md overrides it (D52, D53). The screen appears when `window.duly.vault` exists. The sidebar lists the screens that exist: Home and Documents.

**Locked:**

- The header "Documents" and one primary "Unlock".
- Each row shows a lock icon, a blurred placeholder and the date it was added.
  - The placeholder is only a shape. No name is in the page while locked, blurred or not.
  - The student sees how many documents there are, but not what they are.
- Home still shows the dates from confirmed documents and the kind of each ("From your EAD card"). Names, files and fields stay locked.
- The drop zone and Add still work.
- Unlock opens a grey row with "Unlock with Touch ID or your Mac password.", the primary Unlock, and "Locks again after 5 minutes."
- Unlocking writes the History line "Documents unlocked" and shows the toast "Unlocked for 5 minutes". Both use the chosen number.
- When the keychain has lost Duly's keys, the row offers "Use my recovery kit" instead.

**Unlocked:**

- The header has Privacy (quiet), Lock, and Add (primary, with a plus icon).
- Under the header sits the static line "Unlocked. Locks after 5 minutes without use." The canvas countdown "locks in 4:32" is dropped, because the canvas laws forbid counters.
- Below that, the hero (section 7).
- Then the tabs, per the canvas: the selected tab in 600 ink with a 2px visa-blue underline, and "I-20 history · 6" with its count from the engine.

| Tab | Kinds |
|---|---|
| All | Every kind. Removed is at the bottom, closed |
| Identity | Passport, visa, I-94 |
| I-20 history | Section 6 |
| Employment | EAD card, I-983, offer letter, employer letter, pay stub, SEVP portal record, contract, invoice, EIN letter, articles of incorporation, business license, bank statement |
| Filings | I-797 notice |
| Saved copies | Copies saved (section 10). The canvas calls this tab "Evidence packs"; copies are never labelled as evidence (IMPL-055) |

Kinds not listed above appear under All only. There are no other filters.

**Rows:**

- The name is a button that opens the document.
- One meta line: the kind and the date added, plus "Fields not checked yet" when that applies.
- Remove is a quiet text button, not red.

**Privacy** is a quiet button that opens a two-column grid:

- "Keep a record of every time a document is opened" (on by default).
- "Lock after".
- "Encrypted on this Mac: Always".
- Under the grid, quiet links: "Make a new recovery kit", "Check my documents", "Delete everything on this Mac".

Three handoff switches are dropped, each for a stated reason (F12):

- "Blur names while locked": names are encrypted, so they can never show while locked.
- "Ask before exporting documents": a copy always needs documents unlocked.
- "Notify me when a document is opened": no one else can open them in this round. It returns with links (documents-3).

**The drop zone** is a dashed box reading "Drop files here, or click to choose" / "Encrypted before it is saved. Any file type." It highlights in the visa-blue tint #E9EEF9 on drag. Green belongs to WorkBook, and the canvas wins on colour.

**Toasts** show one at a time: "Added and encrypted", "N files added and encrypted", "Locked", "Removed", "Put back", "Deleted".

**Accessibility:**

- Targets are at least 44px, including Remove, Keep and Yes.
- Everything is reachable by keyboard, focus is visible, and reduced motion is respected. With motion off, the screen is complete.
- Meta and footer text use the secondary ink #6B6862, which measures 5.18:1 on the ground #F8F7F4. The canvas's tertiary #8A8780 measures 3.35:1, and its faint #B0ACA3 measures less. Both fall below the 4.5:1 floor.

## 10. A copy for a DSO or attorney (L-desktop, L-web)

The flow lives in the Saved copies tab. A copy always needs documents unlocked. Duly sends nothing; the student attaches the copy themselves.

**Step 1, "Exports".** Two cards:

- "Everything: every document you added".
- "Custom: pick documents", with document chips that are all on and toggle off.

A live line shows "\<N\> documents, \<P\> pages". If documents are locked, it adds "Documents are locked, so you will be asked to unlock." The primary button is Preview.

**Step 2, "Preview" (Step 2 of 3), with a back arrow:**

- A box titled "Copies of my documents, \<date\>", with the total page count.
- A numbered list: 1 Index (1 p), then each document with its pages.
- Move up and Move down on each document.
- "Export" is primary and "Change" is secondary, back to step 1.

**Step 3, "Send as" (Step 3 of 3), with a back arrow.** Two cards:

- "Zip file: One file to attach or upload".
- "Folder: Plain files on this Mac".

Then comes the line "The copy is not encrypted. Anyone who has the file can open it." The button reads "Save zip" or "Save folder", with the pack name beside it. The system save dialog chooses where the copy goes.

**On save:**

- The toast "Zip saved" or "Folder saved".
- The History line "Copy saved: \<pack name\>".
- A new entry under "Made before", with the time, the name and Open, which shows the copy in Finder.
- The flow returns to step 1.

**Contents:**

- index.pdf.
- The files as added, byte for byte, named "\<nn\> \<kind\> \<date issued if confirmed\>", never with the student's name.
- manifest.sha256.
- verify.py, which checks the manifest using the Python standard library only.

**The index:**

- The title "Copies of my documents" and the date saved.
- A numbered table with, for each file:
  - the file;
  - the kind;
  - the date issued as confirmed, or "not checked";
  - the date added;
  - the pages;
  - the first 12 characters of the file's fingerprint.
- Its foot: "My own copies, kept for my records. This is not a filing." It never says evidence, USCIS-ready or RFE response (IMPL-055, BOUNDARY B7).
- It holds no verdict, no computed date and no reading.
- Main prints it from a fixed template in an offscreen window whose session refuses every network request.

**What waits: a Link (documents-3).**

- The pack is encrypted on the computer with a new key for each link, and the key sits only in the link's `#` fragment. Browsers do not send the fragment to the server.
- The server holds only ciphertext. Revoking deletes it.
- It needs accounts and MFA.

## 11. What the web app shows (L-web, L-api)

**No vault on the web**, in any round of this design (F9).

- A page that Duly's server sends on every visit could be changed to read a key typed into it.
- The desktop app's code changes only with a signed release.
- This is what keeps "Duly staff can never read it" true.

**The web's Documents page:**

- "Documents" / "Your documents are kept in Duly for Mac, encrypted on that computer. This website does not hold them." / "To add documents, open Duly for Mac."
- The platform words come from one function (section 14). When the Windows build ships, they change in one place.
- With backup on (documents-2), it adds: "An encrypted backup was last made on \<date\>. It opens only in Duly on a computer, with your recovery kit."
- It shows no names, no count and no upload control.

**The web's case form:**

- It has no count of documents, and its heading is "Dates you enter".
- Its scope line and verdict follow section 8. The reason line adds: "Documents are added in Duly for Mac."

**Tests:**

- The web stores no document data in localStorage, sessionStorage or IndexedDB.
- No browser code path sends file bytes: no file input and no FormData outside the desktop-only Documents code.
- The web and the desktop run the same build, and tests mock the bridge.

## 12. The encrypted backup (designed here, built in documents-2)

**What must exist first:**

- Accounts with MFA or passkeys.
- An S3 bucket in us-west-2 (D16), which is the founder's infrastructure.
- Its own consent screen, separate from the terms, with "Turn on backup" and "Not now" of equal weight.
- The government request policy, published before the first backup is stored.
- The counsel answers in F14.
- This round's format.

**Turning it on.** Settings has one switch, "Encrypted backup". It explains: "An encrypted copy of your documents and your record is kept in Duly's cloud, in the US West region. It opens only with your recovery kit, which only you have. Duly cannot open it." It uses the recovery key made at setup, so there is nothing new to write down. The backup then runs after each change.

**The honest words.** These appear when backup is turned on, in Privacy and on the security page: "Duly cannot see your recovery key and cannot make you a new one. If you lose the kit and this computer, no one can open the backup, including Duly. If you lose the kit but can still unlock on this computer, you can make a new kit here."

**What goes up:**

- Each file as it is already encrypted, and each envelope.
- The record's contents, encrypted under a backup key derived from K.
- header.json with K wrapped under R only. The wrap under U, the key D, and anything held by `safeStorage` never go up.
- A manifest of every object with its hash and a sequence number, encrypted under the backup key.

Object names are random, and sizes are padded to fixed steps.

**What Duly's cloud holds:** the account email, the objects, their padded sizes, the upload times, and connection logs for a stated period. The government request policy lists exactly this.

**Restoring.** On a new computer the student signs in, chooses "Restore from backup" and types the recovery key.

- Duly checks the manifest and refuses a sequence lower than the last one it saw.
- It checks each object against the manifest.
- D and U are made new. K and V stay the same.

**Turning it off.** "Turn off and delete the backup" deletes every object.

- Old versions expire within a stated window, and the server reports how many objects it deleted.
- Deleting the account does the same, and wipes the vault on that computer.
- Whether this counts as deletion goes to counsel (F14).

**Why the recovery key and not a passphrase (F8).** The ciphertext sits on a server that could be breached or ordered to hand it over. A passphrase can be guessed offline; 128 random bits cannot. Duly holding a copy of the key is ruled out by D54.

**The server (L-api):**

- PUT, GET and DELETE on `/v1/backup/objects/<id>`, for the signed-in account only.
- It refuses a body that does not begin with the envelope header, and never logs bodies.
- MFA is required to turn backup off and to restore.
- The bucket blocks public access, keeps versions for the stated window, and adds server-side encryption as a second layer. Staff roles cannot read it.

**Tests:**

- A backup of the fixture set records every byte sent, and no planted string appears in it.
- The api refuses a plaintext body.
- No route returns an object to another account.
- A restore drill passes before release.

## 13. Threat model (L-security, into security/threat-model.md)

**Assets.** The row for case identifiers changes:

- A SEVIS ID read from a document stays on this computer, encrypted. It is never sent to the server.
- Passport numbers and A-numbers are never read.
- Document files and names live on this computer, encrypted. With backup on, they are also in Duly's cloud, as ciphertext only.

| Adversary or event | Attack or harm | Answer | Tested by |
|---|---|---|---|
| Stolen computer, off or logged out | Reads the disk | Files, record and header are ciphertext. D and U are in the Keychain, which the OS opens only for the logged-in student. No plaintext is written | No-plaintext test; the smoke run's search |
| Someone who knows the Mac's password | Logs in and unlocks | They can open the documents: the lock is the Mac's own (F1). Said at setup | Web test for the setup words |
| Someone at the logged-in computer, documents locked | Opens Duly | Development build: Touch ID or the password is a gate in Duly's code. Signed build: the OS releases U only after Touch ID or the password. Names and files stay encrypted. Home shows the case dates and the kind of each document behind them | Locked-view test: no name in the page |
| Someone at the computer, documents unlocked | Looks | Auto lock, and lock on sleep and screen lock. A limit, stated as one | Lock timer and event tests |
| A lost keychain entry | The vault cannot open | The recovery kit opens K, and main puts U and D back | Test: delete both entries, recover with R |
| A lost keychain entry and a lost kit | Documents lost for good | Said at setup. Setup checks the kit before it finishes | Setup test |
| Malware running as the student | Reads memory, logs keys, asks `safeStorage` | Out of Duly's reach, and said plainly. In the development build it can also get U through `safeStorage`. The signed build closes that path but not memory | Stated |
| A malicious file | Exploits a decoder | Only duly-read decodes it. It is its own process: sandboxed, with no network, no writes and no Keychain. Limits are checked before decoding, and it is stopped on timeout. Main parses nothing. The screen gets only PNGs that duly-read made | Hostile corpus in the reader check |
| A misleading file | Hidden or planted text, look-alike labels | Only visible pixels are read. The nine rules of section 4 apply. The student confirms against the crop. No model reads any of it | Corpus: no hidden or planted string in any field |
| A document that is itself wrong | A true reading of a wrong date | Duly reads what is printed. The hero says the comparison is between documents, not against government records. Differences become questions | Web test for the line |
| A wrong reading | A wrong date reaches the verdict | Nothing is used until confirmed beside its crop. Dates are written out | Property test; the reader check allows no wrong field |
| A compromised page | Asks for keys, files or paths; claims a fact came from a document | The bridge returns no key, path or file bytes. Paths come only from the dialog or a real drop. Main ignores the page's case on the desktop and refuses `/v1/local/` from the page. The kit has its own window | Bridge-surface test; injection test |
| A crafted file name | Script in the page; a path outside the folder | Names show as text only and are never used in paths. Files are stored under random ids | Test with markup and path parts in a name |
| Other programs on this computer | Call the local engine | Bound to 127.0.0.1 with a per-launch token (desktop-1). The document routes exist only in local mode, and only main calls them. Their bodies are never logged | api tests |
| Leaks through the OS | Temp files, caches, crash dumps, the spelling service, Spotlight, Time Machine | No plaintext temporary file and no page cache. The crash reporter is off, and so is spellcheck. Indexers and backups see only ciphertext. The original stays where the student had it, outside Duly's care | The smoke run's search; settings test |
| A bug that loses data | A document lost | Write, sync, read back and compare before the row. Originals are never touched. duly.db is copied before layout changes. Check my documents | Tests that stop at each step of Adding |
| Duly's cloud breached or ordered to hand over data | Reads the server | This round: the server holds nothing about documents. documents-2: ciphertext and the listed metadata only | api 422 test; documents-2 tests |
| Duly staff | Read the backup | No key ever reaches Duly | documents-2 tests |
| A changed Duly release | Sends keys or files | A limit, stated as one. Signed releases and reviewed changes. The web never handles a document key | Stated |
| A model provider | Receives document content | There is no code path. Desktop code imports no model client and calls no host but 127.0.0.1 | Semgrep rule; the smoke run's requests.json |
| A search of the device at a border | The student is made to unlock | Duly does not advise on this. The lock closes on quit, sleep and screen lock | Stated |
| Saved copies | Plaintext outside the vault | Said at step 3, and written only where the student saves them | Stated |

**Tested invariants.** Invariant 1 changes, and five are added:

1. The server cannot produce a plaintext document. This round it receives none; in documents-2 it receives only ciphertext.
6. No document file, name or field read from a document goes to any host but 127.0.0.1.
7. The reader has no network, never touches the Keychain and writes nothing.
8. Duly writes nothing plaintext from a document to disk, except a copy the student saves.
9. No field is used before the student confirms it.
10. A document is never replaced, and a reading is never erased by a correction.

**The corpus**, under security/corpus/documents/:

- clean/:
  - Synthetic documents drawn from the saved specimens.
  - Invented people only, with every page marked SPECIMEN.
  - truth.json holds each field's true value. PLANTED.txt lists planted strings.
  - Never a real person's document, the founder's included.
- hostile/, at least:
  - hidden white text;
  - text in PDF metadata and form fields;
  - visible instructions addressed to a model;
  - a text layer that differs from the pixels;
  - a PDF with scripts;
  - a SEVIS ID that fails the pattern;
  - two conflicting labels;
  - the markers of two forms in one file;
  - very large pages and many pages;
  - a malformed PDF;
  - a decompression bomb;
  - huge image dimensions;
  - a password-protected PDF;
  - a file named with markup and path parts.

## 14. Words (L-web)

**Privacy sentences live in one file.**

- Every sentence that says where documents are, whether they are encrypted, or what reaches another computer lives in web/src/lib/privacy.ts, with the platform words.
- A test fails when any other string under web/src holds "this Mac", "this PC", "this device", "your computer", "encrypt", "backup" or "recovery".
- The founder reads every sentence in that file.

**Platform words.** Wherever the words name the platform, Windows uses its own. The footer keeps canvas-conflicts row 17's own words, "this device", on both.

| macOS | Windows |
|---|---|
| "Touch ID or your Mac password" | "Windows Hello or your PIN" |
| "this Mac" | "this PC" |
| "Duly for Mac" | "Duly for Windows" |
| "shows the copy in Finder" | "shows the copy in File Explorer" |

**Words never used about documents or the comparison:** valid, verified, authentic, correct, consistent, genuine, proof, proves, match, secure, protected, safe, USCIS-ready, evidence, superseded, current.

- A test beside the code enforces this for the Documents screens.
- A field's name quoted from the form, such as "Valid from" on an EAD card, is exempt.
- "sealed" and "cryptographic" are already in the copy lint, which reads desktop/ too.

**Buttons name outcomes:** Unlock, Lock, Add, Use the checked fields, Use this I-20, Use this date, Save zip, Save folder, Remove, Keep, Put back, Delete.

No long dashes and no emoji.

## 15. Lanes and order

The limit is four agents at once (factory/config.yaml). A change of behaviour lands in two rounds, build then reconcile (docs/factory/RUNBOOK.md).

| Step | Lanes | Builds |
|---|---|---|
| 0 | Founder, alone | Section 2, and the answers to section 18 |
| 1, ground | L-content (rulepack-drafter) | rulepacks/documents-us/v2026.09/forms.yaml, sources/ and SOURCES.md. Each marker and label records where in the saved specimen it appears |
| | L-tests (test-author) | The new tests of section 16, in files of their own. Not expected to pass yet |
| | L-security (red-team) | The threat model section, the hostile corpus, and semgrep rules for desktop/ (no model client; no network client in the vault and reader code) |
| 2, build | L-engine (builder) | engine/documents.py: recognise, read, parse dates, chain, the I-20 question, compare, facts. Also `document_facts`, differences, origins and the scope counts in the engine |
| | L-api (builder) | The local routes, the server refusals, no body logging, `/v1/status` |
| | L-web (builder) | CaseForm without the count, "Dates you enter", the scope line, origins, reason lines, the web-only Documents page and privacy.ts. It also updates its own tests beside the code |
| | L-security (red-team) | The clean fixtures, truth.json and PLANTED.txt. They are drawn from the specimens saved in step 1, with tools already on this Mac or in the repository |
| 3, reconcile | L-tests (test-author) | Every older test that carries `documents_count` or `no_documents`: 25 files under tests/ at this writing, 9 of them hidden. Each changed test names the point of this SPEC that requires it. Nothing a point supports is loosened. A failure no point explains is escalated as a possible engine error |
| 4, vault | L-desktop (builder) | desktop/src/main/vault (section 3), duly-unlock, the kit window, the bridge, and the app protocol's handling of the case and of `/v1/local/`. Tests beside the code for every decision |
| | L-web (builder) | Setup, the kit page, Documents locked and unlocked, rows, Removed, Privacy, toasts. Tests beside the code with the bridge mocked |
| 5, reading and copies | L-desktop (builder) | duly-read and its sandbox profile, reading, opening, and the copy builder (zip, folder, index.pdf, manifest, verify.py) |
| | L-web (builder) | The confirm panel, the chain, the hero, the questions and their drafts, the three export steps |
| After 5 | Founder | `make desktop-reader-check` and the smoke run on this Mac. Recorded helper outputs on the fixture set go into tests/holdout |
| 6, attack | L-security (red-team) | Attacks the branch: plaintext on disk, the lock through the bridge, paths from the page, document fields sent without the token, the hostile corpus, the reader's network |
| 7, review | L-review (reviewer) | See below |
| 8, audit | L-audit (auditor) | Re-audits the covered rows, writes the documents list, and marks the overridden rows the founder approved |

**The review (step 7)** is against this SPEC, PRINCIPLES, BOUNDARY and the threat model. The reviewer:

- checks the reconcile diff as the RUNBOOK says;
- reads forms.yaml beside the saved specimens;
- checks every marker and label that tools.sources.forms lists for the eye;
- reads every new string against BOUNDARY.md and D56;
- looks hardest for a field used before confirmation, a plaintext write, and a sentence that says more than the code proves.

**Checks.** Build rounds are held to their own new test files and the gates. Each builder lists the older tests that collide in its report. From step 3 on, every round's checks are `make test-offline BASE=documents-1` and `uv run pytest tests/holdout -q`.

**Why this order:**

- The form descriptions and the engine's reading are the ground everything else stands on.
- The corpus exists before the reader, so the reader is built against it.
- Tests are written first, from this SPEC and the contracts.
- The desktop and the screen build against contracts and an engine that have already landed.

## 16. The tests (L-tests unless named)

**Engine** (tests/unit/engine/test_documents.py):

- For each form in a description made inside the test:
  - recognised when every marker is present;
  - not recognised with one marker missing;
  - not recognised when two forms match.
- For each never-guessing rule: one input that reads, and one a step away that leaves the field blank, with its reason.
- Dates in the printed format only. A two-digit year and an impossible date are refused.
- The chain: order, numbers, groups and counts. An I-20 with no date issued, and two with the same date, are left unnumbered.
- `documents.i20_in_use`: raised with two I-20s. The one proposed is the newest by date issued. The answer opens again with a later I-20.
- The comparison:
  - Case and spaces do not count as differences; accents, hyphens, order and middle names do.
  - Each id.
  - `talk_to_dso` after Yes.
  - The question opens again when the fingerprint changes.
- Values that differ: two documents; a typed value against a document; the choice recorded.
- `documents_confirmed` and `dates_typed`.
- Properties:
  - An unconfirmed field never reaches the case, the chain or the comparison.
  - While any documents question or difference is open, the verdict is `cannot_tell`.

**API** (tests/unit/api/test_local_documents.py):

- The local routes return 404 without the token. With it, the shapes match the contract.
- A body carrying a planted marker leaves no trace in any log.
- The server refuses the document fields without the token, and refuses `documents_count`.

**Desktop** (tests/desktop/, from contracts/vault_format.md and contracts/vault_bridge.schema.json):

- Envelopes and wraps open with the right key and fail with any other. A wrap moved to another place fails. A chunk reordered, dropped or cut short fails.
- The bridge's exact list of calls. None returns a key, a path or file bytes. A path string from the page is refused.
- The app protocol ignores a page's case on `/v1/compute/` and refuses `/v1/local/`.
- Recovery: with both keychain entries deleted (`safeStorage` mocked), R opens the vault and the record.
- Each lock trigger; the timer restarting on each action; what locking wipes.
- Adding stopped at each step leaves nothing half-added.
- Copies: the zip and the folder hold what the manifest says. verify.py passes on both and fails after one byte changes.

L-desktop and L-web also write tests beside their code for every decision, as desktop-1 does. L-web's tests include:

- no name in the locked page;
- two choices on each confirm row;
- no draft containing "Duly" or a computed date;
- the privacy.ts test;
- the words test.

**The reader check** (tests/reader/test_reader_check.py) is run by `make desktop-reader-check`.

- The target builds duly-read and sets `DULY_READER_REQUIRED=1`, so a missing helper fails the test instead of skipping it.
- It runs duly-read on every clean and hostile file and reads each output with engine/documents.py.
- It writes reading-report.json: for each field, right, wrong or blank.
- It passes only when all of these hold:
  - no field is wrong;
  - no hidden or planted string appears in any field;
  - every hostile file is kept and ends calmly within the timeout;
  - `duly-read --probe-network` fails to connect.
- The share of fields read is reported, not gated.

**Holdout:** hidden forms and cases, and the founder's recorded helper outputs.

## 17. Rows placed outside this round

**documents-2 (the backup, accounts, consent and the security page):** DEC-D54-002, DEC-D16-001, RCOMP-133, RCOMP-052, WB06-036, WB06-074, PLAN04-064, PLAN04-042, RCOMP-055, PLAN05-069, RMKT-024, RCOMP-153, RCOMP-029, RCOMP-030, RCOMP-031, PLAN05-075, IMPL-069, RCOMP-050, RCOMP-049, PLAN05-031.

**documents-3 (Windows, links, status periods, more forms):** DEC-D07-001, PLAN05-022, PLAN03-094, PLAN04-023, PLAN04-024, PLAN04-025, PLAN05-023, PLAN05-044, WB04-063, WB06-072, WB03-151, WB01-103, WB01-104, WB01-105, WB06-026, WB07-022, WB03-152, WB03-153, WB03-154, WB03-155, WB03-116, WB06-006, WB06-040, DOCS-009, RMKT-032.

**Rounds of their own:**

- Timeline: TIME-010, WB06-053, WB06-044. Every computed item already carries its origin (section 8).
- Scenarios: SCEN-015. Checklists: RCOMP-021.
- WorkBook, Phase 8: WB01-122, WB06-028, PLAN04-046, PLAN04-047, PLAN02-049, WB06-024, WB01-123, WB06-027, WB07-031. This round builds the one store and the one lock they share.
- Not planned: RMKT-063, which needs phones (D7).

**Moved forward here, not finished:**

- BOUND-009: documents and copies, not WorkBook days.
- PLAN02-035: documents, not WorkBook events.
- PLAN01-009: keychain, store and exports, not capture.
- PRIN-011: the documents questions only.
- RCOMP-036 and RCOMP-059: the field inventory for documents only.
- RCOMP-054: product words only, not marketing.
- PLAN07-070: document metadata strings only.
- WB07-013: no link yet.
- WB01-089 and WB04-026: the History of documents only.
- IMPL-028: waits for F13.

**For the founder:** the rows named in F7, F8, F9, F12 and F14. Each is to be marked as overridden or restated, or is waiting on counsel.

## 18. For the founder

Each item has a recommendation. No lane starts until the founder has answered in DECISIONS.md.

**F1. The lock.** Should documents open with the computer's own Touch ID or password? Or with a Duly passphrase, as the handoff says, with Touch ID in the signed build?

- Recommendation: the computer's own unlock, with the recovery kit.
- Why: there is nothing new to remember. The common losses are covered: a lost or stolen laptop, and someone glancing at an open screen. A forgotten passphrase is the most common way to lose a vault.
- Against it: anyone who knows the Mac's password can open the documents. In the development build, the prompt is a gate in Duly's code.
- If the answer is the passphrase:
  - U becomes HKDF-SHA256 over two inputs: Argon2id of the passphrase, and a device secret held by `safeStorage`. Argon2id uses the second recommended option of RFC 9106 section 4, checked against the RFC.
  - The unlock row gains a passphrase field.
  - Wrong tries wait longer after a product setting.
  - Touch ID waits for the signed build.
  - If the Node inside Electron 44 has no Argon2id, the founder approves one binding.
- Rows met with a change under the recommendation: WB01-092, WB03-101, WB03-102, WB04-039, WB07-012.

**F2. The recovery kit at setup,** required and typed back. Recommendation: yes. Without it a reset keychain loses every document. The backup later uses the same key.

**F3. Typed dates alone.** Should a case with only typed dates reach any state other than "Can't tell yet"?

- Recommendation: no; keep `no_documents`. On the web this means "Can't tell yet" until documents are confirmed on a computer.
- The other choice is a question: "Did you type these dates from your documents?" Its Yes lets the verdict be decided on typed dates.

**F4. DATES USED in place of CURRENT,** with the question `documents.i20_in_use` (DOCS-006). Recommendation: yes. Duly knows which I-20 the student chose, not which one is in force.

**F5. Removing.** Remove keeps the document under Removed until "Delete for good", and nothing is erased by time. The handoff deleted at once (WB03-110). Recommendation: yes.

**F6. The weight of a difference.** Recommendation: follow product-1 section 1.

- A name, date of birth or SEVIS ID difference the student confirms gives `talk_to_dso` until the documents change.
- A typed value kept over a confirmed document gives `talk_to_dso`.
- A choice between two documents is decided on the chosen value.
- Note: a new SEVIS ID for a new program is common. Under this recommendation it too becomes a question for the DSO, until a sourced rule says which differences are ordinary.

**F7. The assistant and values from documents.** The assistant will run on Bedrock in Duly's AWS account (D23, D27). Once it does, may confirmed dates reach it? Files, names and identifiers never would.

- Recommendation: not yet. No value from a document goes to any model until the founder decides. The privacy sentences change with that decision.
- RCOMP-053 and PLAN05-085 name "our AI provider", which D23 and D27 change. Restate them.
- RMKT-020 is restated in two parts. Documents are kept on the student's computer, and in an encrypted backup only if the student turns it on. Questions to the assistant are processed in Duly's cloud account.
- RCOMP-057 applies only if the answer becomes yes.

**F8. The backup key.** The backup uses the recovery key only, with no passphrase.

- This overrides WB04-045, PLAN13-023 and RCUT-018, which describe a passphrase-locked backup to the user's own Drive, iCloud or S3. D54 names Duly's AWS and a key only the student holds.
- Recommendation: the recovery key only (section 12).

**F9. No vault on the web,** in any round of this design. This overrides PLAN13-010, PLAN13-012 and RCUT-007, which plan a web vault later. Recommendation: yes (section 11).

**F10. Where this round sits.** D48 orders product round 1, the path model, the desktop window, the updates pipeline, then breadth. D54 makes documents core.

- Recommendation: right after desktop-1.
- Updates-1 does not depend on it and may run before or after.

**F11. Handoff and canvas rows met with a change.** Recommendation: approve each.

- WB02-032, WB03-099, WB01-091: a blurred placeholder in place of the blurred name. Names are encrypted, so none is in the page while locked, as WB04-038 says.
- WB03-108, WB01-094: Remove is a quiet text button, not red. The canvas forbids red.
- WB03-109: "Remove? Keep / Remove", because buttons name outcomes (CLAUDE.md).
- WB03-110: Removed comes first (F5). The History line is "\<name\> removed" and the toast "Removed".
- WB01-096: three switches are dropped (section 9).
- WB03-120: the visa-blue tint on drag. Green is WorkBook's.
- WB04-037: the kinds list of section 4 replaces the handoff's.
- DOCS-003: a static lock line and no countdown. The canvas laws forbid counters.
- DOCS-004: "Saved copies" in place of "Evidence packs" (IMPL-055).
- DOCS-006: DATES USED (F4).
- DOCS-008: "kept for the record" without "superseded".
- WB03-136: the locked line shows whenever documents are locked, since a copy always needs an unlock.
- WB03-156: "Save zip" or "Save folder"; no link yet.
- WB03-159: the toasts "Zip saved" and "Folder saved".

**F12. Rows overridden or restated,** for L-audit to mark once the founder agrees. Recommendation: approve.

- Restated as "never as plaintext", since D54's backup carries ciphertext: PLAN05-019, PLAN11-021, PLAN02-036, RCOMP-131.
- Overridden by D54's backup: PLAN04-045.
- No longer apply, since no model reads a document or a field from one (D54, D55, F7): WB06-067, RCOMP-078 (its intake part), RCOMP-079, IMPL-076, RCOMP-139, RCOMP-141.
- By design:
  - WB03-113 and WB03-114 are switches with nothing to switch (section 9).
  - WB01-021 and WB04-041: documents are not plain files in a ~/WorkBook folder. The vault is in the app's data folder, and Save copies gives plain files when the student asks.
- DOCS-010 and DOCS-011 describe the canvas's example person. Restated as the student's own versions, shown as DOCS-005 and DOCS-012 say.

**F13. IMPL-028's third sentence,** "Duly isn't your DSO or a lawyer." BOUNDARY.md lists "lawyer" among the words Duly never uses about itself.

- Recommendation: add the sentence, and record the exception in DECISIONS.md and BOUNDARY.md.
- Why: the sentence says the opposite of the claim BOUNDARY forbids. docs/research/law-liability-design-2026-09.md sets it as the scope line's last sentence.
- Until then the scope line has two sentences, and IMPL-028 stays partly met.

**F14. For counsel,** before documents-2:

- Does reading on the student's own computer need the separate opt-in consent (IMPL-069, RCOMP-029)? This round sends nothing off the computer.
- Is deleting the backup's ciphertext, or destroying its key, deletion under the state laws Duly targets (PLAN12-015, RCOMP-065)?
- Is backup ciphertext personal data?

## Done

1. `make test` and `uv run pytest tests/holdout -q` pass. `uv run python -m tools.copy_lint.lint` is clean, and `uv run python -m tools.requirements.register check` passes.
2. `npm run typecheck -w desktop && npm test -w desktop` pass, with tests/desktop among them. `npm test -w web` and `uv run pytest tests/unit/engine tests/unit/api -q` pass.
3. `grep -rn documents_count contracts engine api web/src` finds nothing.
4. `grep -rEiln "multiple-ciphers|sqlcipher" desktop/src web/src | grep -v "^desktop/src/main/"` finds nothing, and eslint refuses the import anywhere else.
5. `grep -rEin "anthropic|openai|bedrock" desktop/src desktop/native` finds nothing.
6. With `make up`, `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/v1/local/documents/read` prints 404.
7. `uv run python -m tools.sources.forms rulepacks` passes, and the reviewer has checked every marker and label it lists for the eye.
8. `make desktop-reader-check` passes on this Mac and in the macOS CI job.
9. The founder's smoke run:
   1. `make desktop`. Set up, save the kit, and type back its last two groups.
   2. Drop the clean set while locked, unlock with Touch ID, and confirm the fields.
   3. The scope line names the documents. After the I-20 question, the chain shows DATES USED.
   4. Lock. The rows show placeholders and dates only.
   5. The smoke writes requests.json, and every host in it is 127.0.0.1 or duly://app.
   6. After quitting, `grep -rl -f security/corpus/documents/PLANTED.txt` over the data folder and `$TMPDIR` finds nothing.
10. The last checks:
    - L-security reports every attack in section 13 as tried, with its result, and no open finding above low.
    - The reviewer approves, with every rubric line at or above the minimum.
    - L-audit re-checks the 113 rows, writes the documents list, and reports the share met, of the whole and of that list.
