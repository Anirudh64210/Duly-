# Duly founder decisions log

Amends duly-plan/ and workbook-handoff/. Where this file conflicts with them, this file wins.

## 2026-09-28, round 1

| # | Topic | Decision | Status |
|---|---|---|---|
| D1 | Law changes in flux (D/S fixed admission rule, 100k H-1B fee, PA-2026-05) | State the rule AND its legal status plainly (proposed, final, effective, enjoined, vacated, appealed), with dates and primary citations. Engine carries regime flags; default is whatever is legally operative today | Decided |
| D2 | Updates and news | A continuous, automated, primary-source pipeline covering student and work immigration law. Accuracy over speed: a wrong update is worse than none; publish late rather than wrong. Neutral, plain, nonpartisan voice; report what happened, never recommend. The handoff is a starting point, not the ceiling | Decided; pipeline design pending approval |
| D3 | School variance (CPT and others) | Per-school policy records, each cited to that school's ISSS page with a snapshot and last-checked date | Decided; rollout order pending |
| D4 | Verdict | Four states: No open items in what you've added / One thing needs you / Talk to your DSO / Can't tell yet (never falls back to green) | Decided |
| D5 | Legal conclusions | Never answer personal legal questions directly. Show the rule, the citation, and a drafted question for the DSO. Reword every legal conclusion in copy | Decided |
| D6 | AI disclosure toggle in exports | Founder is deciding | Open |
| D7 | Platforms | Final copy covers macOS and Windows; build the prototype on macOS first | Decided |
| D8 | Pricing | Not a blocker; parked | Parked |
| D9 | Onboarding split | Duly onboarding owns legal status tagging; WorkBook setup owns work details and context only | Decided |
| D10 | Confetti | Remove. Replace with a quiet, premium completion moment | Decided; spec pending |
| D11 | Breathing glow | Keep, but smaller, slower, lower amplitude; not continuous | Decided; spec pending |
| D12 | Visa coverage | All categories with their nuances: F-1 (CPT, pre-completion OPT, OPT, STEM OPT, cap-gap), H-1B, O-1, EB-1A, and more | Decided; engine depth order pending |
| D13 | Anthropic data | Aim for no user-specific data to Anthropic at all; founder also checking ZDR | Decided in principle; architecture pending approval |
| D14 | Attorney | None retained. Founder asked whether one is needed | Answered in chat; founder to decide |
| D15 | Domain | Not a concern now | Parked |
| D16 | AWS region | US West (us-west-2) | Decided |
| D17 | Ops IP allowlist | Prototype it for the founder to see | Decided |
| D18 | Billing | Stripe confirmed; set up later | Decided |
| D19 | Trademark | Check "Duly" | Preliminary check done; full clearance pending |
| D20 | WorkBook drafting model | Cloud or on-device, undecided | Open |
| D21 | Dev tooling | Allowed: Supermemory, Hermes, LangGraph, LangSmith, n8n and similar, if needed | Decided; selection pending |

## 2026-09-28, round 2

| # | Topic | Decision | Status |
|---|---|---|---|
| D22 | News pipeline (proposal 1) | Approved. Ops approval is the final pass. An approved update goes out two ways: an email alert from the no-reply address, and a deeper explanation in the app | Decided |
| D23 | Assistant (proposal 2, amended) | A live AI assistant that runs on infrastructure we control, so no user data goes to Anthropic. It handles as many nuanced cases as it can with rules and citations. When the user asks for a conclusion about their own case, it steps back and drafts the email to the DSO. The line between the two must be explicit and enforced in code | Decided; line defined in BOUNDARY.md, pending founder review |
| D24 | Schools (proposal 3) | Start with 100 schools | Decided |
| D25 | Hermes Agent | May be used in any role. Goal: a clean, productive, self-improving agentic dev system | Decided |
| D26 | Git | Founder will create a private repo on request | Requested |

## 2026-09-28, round 3

| # | Topic | Decision | Status |
|---|---|---|---|
| D27 | Where the assistant model runs | Local prototype: Claude API. v0 for market validation: AWS with Claude through Bedrock, no data retention, privacy rules met. Own servers only after validation | Decided |
| D28 | Attorney and Anthropic zero retention | After validation: look for attorneys to work with, and Anthropic's zero retention terms | Later |
| D29 | BOUNDARY.md | Approved as written. Founder wants to see what value inside the line looks like | Decided |
| D30 | Container runtime | Docker engine through colima | Done |
| D31 | Repo | git@github.com:Anirudh64210/Duly-.git, private | Done |

## 2026-09-29, round 4

| # | Topic | Decision | Status |
|---|---|---|---|
| D32 | Missing DSO recommendation date | Option C. A date blocks the verdict only while it can still matter. The recommendation date stops blocking once a filing date or an EAD is recorded | Decided |
| D33 | Which day is today | The person's own time zone | Decided |
| D34 | Where Duly's knowledge comes from | PRINCIPLES.md. The exact text of the law, cited as written. The plan and the handoff are starting context only. Confirm, never assume. When Duly does not know it says so or points to the DSO | Decided |
| D35 | Numbers with no source | Agents find the law and source it. If the law does not state it, Duly does not have it | Decided |
| D36 | Curator's first skill changes | Remove no skill yet. Keep the corrections to the stale skill and keep the boundary skill. The curator designs harder replays before anything is removed | Decided |
| D37 | The biggest failure | A wrong answer shown to a person. Added to PRINCIPLES.md | Decided |

## 2026-09-29, round 5

| # | Topic | Decision | Status |
|---|---|---|---|
| D38 | Order of work | The factory is made production grade first, against the founder's 50 item checklist, every item. Infrastructure, then the agent system, then Duly. No product agent runs until then | Decided |
| D39 | First use of the F-1 screen | Arithmetic was right. Wording and the two-regime display were hard to read, and nothing was said about what comes next (STEM OPT). Recorded in specs/product/BACKLOG.md | Recorded |
| D40 | Branch protection on GitHub | Left as it is for now. Raise it again when a finished version is close | Parked |

## 2026-09-29, round 6

| # | Topic | Decision | Status |
|---|---|---|---|
| D41 | A student with no OPT, STEM OPT or cap-gap entered | Duly asks first. No quiet verdict until the person has said there is nothing more to record | Decided |
| D42 | Next work | The product backlog through the factory, then a desktop window (Electron) the founder can test on this Mac. Quality, accuracy and safety first, for the build and for Duly's liability | Decided |
| D43 | Model | If the pinned model's limit is reached, the factory's agents move to claude-opus-5-5 | Decided |
| D44 | The first 22 lessons | All kept. 12 are filed by lane for agents to learn from; 10 are records of faults in the factory that were fixed | Decided |
| D45 | Billing | Agents run on the subscription login only. Paid credits are never used | Decided |
| D46 | Dated tags on main | Every change to main is tagged on GitHub | Decided |
| D47 | What Duly is | A platform where any student logs in, sees where they stand, what comes next, and the latest verified changes in the law, for every case and every category. OPT and STEM OPT were an example. Every SPEC says what share of the whole it covers | Decided |
| D48 | Order of work | Product round 1 finishes. Then the path model, so that the engine holds no scenario of its own. Then the desktop window, showing it. Then the updates pipeline. Then breadth, pack by pack, every rule sourced | Decided by the founder lane under D42; the founder may change it |
| D49 | Changes made in Phase 0 without a decision | React 19 where the plan says 18; npm where it says pnpm; one compose profile where it says four. Recorded here so that the founder can overrule them | For the founder |
| D50 | The requirements register | docs/requirements/ holds every requirement in the project's documents and in these decisions, audited by agents that did not build the work. Every new SPEC names what it covers. The register is audited again when work lands | Decided by the founder lane under D42 |
| D51 | Model | The founder moved to Opus 5.5 on 2026-09-29. The factory's agents are pinned to claude-opus-5-5; every health check is run again before the next plan | Decided |
| D52 | The canvas and the research reports | Received 2026-09-29, kept verbatim in design/canvas/ and docs/research/founder/. The canvas is the source for layout, tokens, motion and structure. Where its copy or behaviour crosses BOUNDARY.md or a later decision, the later rule wins; each such place is listed in docs/requirements/canvas-conflicts.md for the founder | Decided by the founder lane; conflicts for the founder |
| D53 | Canvas words against the boundary | Where the canvas's copy or behaviour crosses BOUNDARY.md or a later decision, the boundary wins. Layout, tokens, motion and structure follow the canvas | Decided by the founder |
| D54 | Documents | "A really big part of Duly is going to be document sorting and secure storing in one place." Documents are a core part of the product, not a later module. The vault lives encrypted on the student's device; the student may turn on an end-to-end encrypted backup to Duly's AWS (us-west-2), locked with a key only the student holds, so Duly staff can never read it, and a lost key loses the backup. Document files never reach a model provider (D13) | Decided by the founder 2026-09-29 |
| D55 | Sorting documents | Duly reads and sorts documents on the device: it recognises the type (I-20, EAD card, I-94, I-797 and the rest) and reads its dates, names and SEVIS ID there, and nothing leaves the device for it. Every field read is shown to the student to confirm before Duly uses it (PRINCIPLES 2) | Decided by the founder 2026-09-29 |
| D56 | Plain words, backed by the law | After testing: quoted law "makes it very big to read and by itself very hard to understand for an average student". Every rule is explained in plain words first, calm and short, in the spirit of the CK approach (relieve the fear, keep it calm), with the exact words, citation and source one tap away. The plain words say what the rule says in general, never a conclusion about the person, so they carry no legal-advice risk, and each is checked against its quote. "Before a court" is replaced by plain words about what a court has done, backed by the court's own order | Decided by the founder 2026-09-29 |
| D57 | The drafted DSO email | The draft is in the student's own voice, a plain default student voice. Duly is not mentioned anywhere in it. It states only the student's own facts and asks; it never states a date Duly computed or a reading as the student's own claim | Decided by the founder 2026-09-29 |
| D58 | The documents lock | For now, documents open with the computer's own unlock (Touch ID or the Mac's password), with a recovery kit made once at setup. The founder will think about a separate Duly passphrase and may change this (specs/documents-1/SPEC.md F1) | Decided for now by the founder 2026-09-29 |
| D59 | Dates typed by hand | "Ask once and verify before trusting, and if even after verification can't strictly confirm, we say can't tell yet." Duly asks whether the typed dates came from the student's documents, has the student check each date against its document, and uses a typed date only when it is checked and nothing contradicts it; otherwise the verdict is cannot_tell (specs/documents-1/SPEC.md section 8, F3) | Decided by the founder 2026-09-29 |
| D60 | The assistant and values from documents | Not yet: no value from a document reaches any model, including the assistant on Duly's own AWS, until the founder decides later. Files, names and identifiers never do (F7) | Decided by the founder 2026-09-29 |
| D61 | Where documents sits in the order | Right after the desktop window: product round 1 and its fixes, the path model, the desktop window, then documents-1; the updates pipeline may go either side (F10) | Decided by the founder 2026-09-29 |
| D62 | The canvas app, first build | The founder: "that shitty ass UI? is that how its going to look like on Duly the app, it better not" and "i want efficiency and accuracy and quality, and sizeable results". The test screen leaves the student's path; the app becomes the approved canvas (specs/design-1/SPEC.md), built with the path model over every program a student has had (specs/path-1/programs.md), inside the desktop window, as one parallel plan (specs/product-2/plan.yaml). design-1 section 17's recommendations F1 to F11, F13 and F14 are adopted by Claude under the founder's instruction to proceed, and the founder may overrule any. F12 is replaced: the D59 checks are built now as questions (documents-1 section 8), so a student who checks their typed dates can reach every verdict before the vault exists | Adopted by Claude 2026-09-30; open to the founder |
| D63 | Cap-gap: what Duly may say (specs/capgap-1 F2) | Yes, with the I-20: when the student holds the DSO's cap-gap Form I-20, the record checks are clean and the petition's status was confirmed recently, Duly shows the cap-gap dates as what that I-20 shows, with standing words that USCIS decides the petition, and may reach no open items. Without the I-20, it steps back to the DSO | Decided 2026-09-30 |
| D64 | Cap-gap: a denial while the card runs (capgap-1 F4) | Keep the card's own dates; the grace after a denial steps back to the DSO, because the sources disagree on when the 60 days start | Decided 2026-09-30 |
| D65 | Cap-gap: a stale regime after 2026-10-02 (capgap-1 F5) | Only cap-gap items and items under the litigated rules become cannot_tell; the rest of the verdict stands | Decided 2026-09-30 |
| D66 | Cap-gap: how old a "still pending" answer may be (capgap-1 F1) | 30 days, a product setting; shown as "as of <date>", then asked again | Decided 2026-09-30 |
| D67 | Health probes on a smaller model | The founder approved (2026-09-30, docs/factory/research/2026-09-30/FINAL.md item 14): health probes, which only test the sandbox walls and write no product code, run on claude-haiku-4-5-20251001 through factory/config.yaml model.health_probe. Every other factory agent stays pinned per D51 | Decided 2026-09-30 |
| D68 | Retired factory parts | Delete the old lessons folder, the proposal inbox, the skill-curator agent, the factory lane, the Stop hook and `make lane`; git keeps the history. Replaces D44 (specs/factory-2) | Decided 2026-09-30 |
| D69 | The factory commits a feature's spec folder | `factory start` and `factory resume` may commit the feature's spec folder and bring it into the work checkout, only when those are the only changes | Decided 2026-09-30 |
| D70 | The factory template | Lives in its own folder and git repository at ~/Desktop/factory-template; Duly is where the factory is improved, the template is exported from it, other projects update with `factory sync` | Decided 2026-09-30 |
| D71 | Factory measures and alerts | Hours per feature are measured by the tool (first agent start to last agent end; product-2 baseline 9.7 h); factory phone alerts are off; changes to factory/project.yaml need the founder, like config.yaml | Decided 2026-09-30 |
| D72 | Try a change: where it starts | On each card the change touches, plus one entry in Your profile; not on Home (specs/ui-2/VALUE-2.md) | Decided 2026-09-30 |
| D73 | Check-in reminders | Computed on the student's device; no record dates held on Duly's server for them | Decided 2026-09-30 |
| D74 | VALUE-2 smaller calls | Add passport, visa and address records with their sourced rules (8 CFR 214.2(f)(17), (f)(12)(ii)(A)) as a contract change that lands first; when a court pauses a rule, For you shows only the date in force; add "From your paper" (the I-20 field beside the date it fed) to the source sheet | Decided 2026-09-30 |
| D75 | The Loop is Duly's single building block | Every question or life event is a loop carried to a confirmed outcome (open, asking, planned, waiting, confirming, closed, dismissed; reopened is an event). Planned is not done: a loop closes only when the student confirms or an outside fact arrives. A loop with a dead end (no way out, no timer, no follow-up) fails the build (specs/duly-2/BLUEPRINT.md) | Decided 2026-09-30 |
| D76 | Ask matches a guide before the boundary tests | BOUNDARY.md "Before the tests: match a guide": common questions get a reviewed guide and a full loop with the student's own dates; the three tests apply beyond the guide's words; no match, or a judgement, still ends in the step back | Decided 2026-09-30 |
| D77 | Ask in v1 has no AI model | v1 Ask matches questions to guides on the device and runs loops exactly. A model for free-text understanding comes later, running on the device or on Duly's own servers (never an outside provider for student data), after it passes evaluation. Narrows D27 | Decided 2026-09-30 |
| D78 | Platforms for the real app | Mac, Windows, Android and iPhone from the start (the prototype stays web). The engine must run on all of them: one shared core (for example compiled to WebAssembly) is the first architecture question. Replaces "macOS first, then Windows" | Decided 2026-09-30 |
| D79 | Ask uses Claude in Duly's own AWS | Ask reasons with Claude through Amazon Bedrock inside Duly's AWS account (no training on the data, no provider retention); the engine still supplies every date and count; BOUNDARY rules apply. Replaces D77's "no model in v1". For prototype testing only, a local helper sends the fictional sample student's record to Claude through the founder's own Claude Code login | Decided 2026-10-01 |
| D80 | Ask in production keeps D79, with the privacy measures added | Claude through Bedrock reasons and writes answers. The reviewers' measures are added: a separate Ask address with logs off, requests not linkable to the account, and crisis and enforcement questions never leave the device. ARCHITECTURE.md section 8's "the model only picks a guide" is overridden | Decided 2026-10-01 |
| D81 | Step W: Duly as an installable desktop app | Approved, with no cloud setup yet: the engine bundled in the app, a private pipe instead of a local port, a packager, hardening, signing for the founder's Mac | Decided 2026-10-01 |
| D82 | Shared engine in Rust | One engine on Mac, Windows, iPhone, Android and web; every release must match the Python reference engine's output exactly | Decided 2026-10-01 |
| D83 | App frameworks | Electron for Mac and Windows; React Native with Expo for iPhone and Android, with native modules for keys, document reading and reminders | Decided 2026-10-01 |
| D84 | Open-source, local-only launch first | Build Duly as a free, open-source (AGPL), local-only app first, with no Duly servers holding student data. Launch it and build a community, then charge for services (encrypted sync and backup, hosted Ask, the attorney network, school editions), never for the core. The README promises this from day one. Keep a contributor agreement for relicensing and trademark "Duly". The repo is checked for secrets and personal data before anything is published. Order: Step W with real data entry and on-device documents; repo readiness; launch; improve; charge | Decided 2026-10-01 |
| D85 | Step W signing and documents | Test builds are signed with a self-made certificate on the founder's Mac until the Apple developer account exists. Real documents are allowed in test builds, protected by the Mac login and keychain key only; the Touch ID lock and recovery kit come with documents-1, and the founder keeps the originals | Decided 2026-10-01 |
| D86 | Ask on the founder's own record | Not in W2. On a real record, Ask uses the on-device guides and the DSO draft until the private Bedrock service exists; only the fictional sample goes through the local helper (D79) | Decided 2026-10-01 |
| D87 | App bundle id | co.tryduly.desktop, from the domain tryduly.co (getduly.dev and getduly.org were taken). Permanent from the first build that stores real data | Decided 2026-10-01 |
| D88 | Rules and news feed | Duly checks a signed feed of rule packs and published updates once a day, so its rules stay current and news reaches the device. For now the feed lives in a public GitHub repository holding public law text and Duly's summaries only, never anything about a student; it moves to Duly's own AWS later. The signing key stays with the founder | Decided 2026-10-01 |
| D89 | F-1 complete first | The first useful version covers every F-1 case properly (OPT, STEM OPT, CPT, cap-gap, travel, documents). H-1B, O-1 and EB-1A say plainly that their rules are coming, and their documents can still be kept; their rule packs follow as their own plans. The founder tests once Home, Plan and reminders work on real F-1 dates with the feed live | Decided 2026-10-01 |
| D90 | D88 amended: the CI key | Founder keys sign every rule pack and every update. A CI key may sign only the daily check record, which can keep reviewed rules current or put them on hold, and never changes a rule or shows text (SPEC-FEED point 82). The other recommendations of SPEC-FEED points 68 to 86 are accepted as written, except the hardware key (point 83), still open | Decided 2026-10-01 |
| D91 | The daily check is on by default | Duly checks the feed once a day once setup has shown one plain line saying so and that nothing about the student is sent; Settings turns it off, and with it off the screen says the rules go stale after 7 days (SPEC-FEED point 77) | Decided 2026-10-01 |
| D92 | Unknown values (SPEC-W2-UNKNOWN) | A date or count is shown only when every value the unknowns could take gives the same one; otherwise that item waits and the one question that settles it is asked, and a gap that changes nothing is never asked (points 55, 56). A "not sure" answer that could change a date makes the verdict Can't tell yet with the DSO named, and opens the DSO-question loop, which carries the DSO's answer back into the record and closes only when the student confirms it (point 57, SPEC-W2 point 19). Lists not stated whole withhold what an unlisted record could change, and onboarding asks "any others?" in the step that adds them (point 58). A trip with no return date is asked, not assumed (point 61). The SPEC's recommendations on points 59, 60 (no ranges yet), 61's list, 63 and 64 are accepted as written | Decided 2026-10-02 |
| D93 | Unranked levels and settings in checks | Made by the founder lane under D92 on 2026-10-02, open to the founder's override. (1) An ordered field may leave choices unranked when no source ranks them (program levels secondary, language training, professional, other); a comparison reaching one is Can't tell yet with the DSO named, never a refused pack and never a rank Duly invents. (2) A check may compare against a product setting, written as a setting; its reason says it rests on Duly's setting, not the law (program.opt_start_not_too_early). SPEC-W2-UNKNOWN point 11 amended | Decided 2026-10-02 |
| D94 | An empty petition start is asked | Made by the founder lane on 2026-10-02 under D92, open to the founder's override. petition.requested_start and petition.validity_start are asked when empty (when_absent ask), as resolutions 23 and 23a decided, not read as none as the SPEC-W2-UNKNOWN point 61 list proposed; an empty start never reads as cannot extend. While it is unanswered, the cap-gap step back is withheld and the verdict is Can't tell yet with the start asked by name (points 32, 33 and 35 supersede 23a's step back on this) |  Decided 2026-10-02 |
| D95 | The W2-P3 review's fixes | Made by the founder lane on 2026-10-03 under D88 and D92, open to the founder's override. (1) The packaged engine answers both new routes exactly as the server does: the bundle gains contracts/schedule.schema.json, contracts/update.schema.json and pipeline/published/*.json (SPEC-W1 point 14), and a test runs the routes from a tree built from the allowlist alone. (2) publish_blockers moves now to engine/updates.py, standard library only, and GET /v1/updates returns a file only if it follows update.schema.json and has no blockers (SPEC-FEED points 29 and 35, the wording checks still with the feed plans). (3) Schedule offsets have Duly's own limits (days 36525, business days 260, months 1200), and a request the engine cannot date (a day with no holiday row, or a date outside the readable dates) is answered with its reason, never a failed body. (4) A date set from a planning item is planning. (5) The prototype's articles stay in pipeline/drafts until the founder approves them | Decided 2026-10-03 |
| D96 | The W2-P4 review's fixes | Made by the founder lane on 2026-10-03 under D85, open to the founder's override. A missing documents index while keys or files remain is refused as index_missing and nothing is deleted: a missing index never means no documents. A version chain stays one line: a second replacer, a multi-file add that replaces, or a chain past 200 versions is bad_replaces. One add takes at most 50 files, the store at most 5000 documents, the index keeps the newest 20000 history lines, each the most one contract answer carries. An empty file is skipped; export never writes inside Duly's own data folder. A planned reminder is shown once across relaunches, the shown ids kept in main's own file. The bundle's pipeline/published/*.json is an optional pattern, since the folder is empty until the founder approves an update (the D95 entry would have broken make desktop-python) | Decided 2026-10-03 |
