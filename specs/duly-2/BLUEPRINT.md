# Duly 2: blueprint

Status: draft for the founder, 2026-09-30. Built from the six research files in this folder and five reviews of them (security, ML and AI, design, psychology, systems). Where the research files disagree, this file picks one answer and says why. Internal sources are named by file and section; outside claims carry their URL or say "unverified". Every date shown in an example is the prototype's sample case (OPT, 41 days without work used as of Sep 30) and is illustrative; in the product every date and count comes from the engine.

## 1. The product and its purpose

Duly is a private place for an F-1 student's immigration life, on phone and laptop. It keeps every paper sorted, encrypted and backed up so nothing is lost. It tells the student where they stand, what comes next and by when, and what to do first, with every date computed by code from sourced rules. It keeps them up to date when a rule changes and shows only what changed for them. It tracks their USCIS case and their work (WorkBook). And it carries any question or event, typed or noticed, through to a confirmed outcome: what to do, how, where, when, what to keep in mind, then a check that it happened. Its history becomes the student's record, kept only on their devices.

Why a student opens Duly, in one line each:
1. My papers are safe and in one place, on every device I own.
2. I know where I stand today and the next date that matters.
3. Anything that changes, in my life or in the law, Duly carries to done with me.

## 2. The loop model

### 2.1 Why Duly feels static today
The app has no object that owns "what happens next" (research-loops 0). "Yes, same" and "This happened" save a fact and stop (prototype data.js:997, :1011); the STEM "Yes" shows a strip and stops (research-ui 1). The fix is one building block, the Loop, defined once in contracts/ before any screen is drawn. The research proposed four different state models; this is the one.

### 2.2 Objects
- **Playbook** (public, reviewed, signed, versioned, shipped in the rule bundle): triggers, and a graph of steps. Step kinds: `ask` (writes an event), `compute` (engine items with sources), `explain` (plain words, quote one tap away, D56), `act` (a task, due date from the engine), `resource` (allowlisted link), `stepback` (BOUNDARY card plus DSO draft, D57), `wait`, `close`. No literal numbers: every value is a reference to an engine item or rule id (research-system 4.1). Each step carries a reviewed A or B boundary tag (section 4.3).
- **Loop** (private, one per open matter, lives in the event log): Playbook id and pinned version, trigger, answers so far, the engine items it watches, the next follow-up date.
- **Trigger**: a typed or tapped question; a stale fact; an engine item crossing a line (file-by date 21 days out, no receipt); a document added; a law update that touches the student's facts; a date reached; a DSO reply recorded (research-system 4.1).

### 2.3 States (one statechart, internal names)
| State | Means | Student sees |
|---|---|---|
| open | Created by a trigger | Needs you |
| asking | Waiting on one answer that changes the result (ask only those, research-loops P3) | Needs you |
| planned | Answer given; a plan with what, where, when exists; obligation not yet met | Needs you, or "Planned: report on or before Nov 10" |
| waiting(until date, or event, or person) | Duly has a timer; handed-off to the DSO is waiting(person) | Waiting on [who] until [date] |
| confirming | Date reached or event seen; Duly asks "Did it happen?" | Needs you |
| closed(outcome) | Student confirmed, or an outside fact confirmed it | Done [date] |
| dismissed | Student chose to drop a loop that has no engine-dated obligation | Hidden, in Record |

`reopened` is an event, not a state: it moves a closed loop back to open with a stated reason. "Can't tell yet" is a flag on any state, never a state that hides.

Rules the gate enforces (statecharts are data, so they are checked exhaustively in CI, not sampled; ML review A7):
1. Every non-final state has at least one exit the student can take, and a timer that brings it back if the student does nothing.
2. Every waiting state has a timer and a follow-up question.
3. Every path ends in closed, or dismissed where dismissal is allowed.
4. **Planned is not closed.** A plan calms the mind but does not meet the obligation (psychology review A3). Closed needs the student's typed confirmation or an outside fact (a receipt number, an uploaded notice). A pasted DSO reply or a parsed note never closes a loop by itself.
5. A loop with an engine-dated obligation cannot be dismissed, and "Not now" cannot snooze past the engine's limit date; the picker stops there and shows it.
6. A loop pins its Playbook version. A new version reaches a running loop only through an explicit, tested migration listed in the pack (Temporal treats this as core: https://docs.temporal.io/workflow-definition).
7. No screen shows a threat value (a day count, a passed date, a stale fact) without at least two actions in the same view (psychology review F1; Witte's EPPM predicts avoidance when threat is high and ability is low: https://en.wikipedia.org/wiki/Extended_parallel_process_model).

### 2.4 The follow-up scheduler
Computed on the device from open loops and engine dates (D73). No dated reminder is held on Duly's server.
- **Guaranteed:** reminders tied to an engine date (on or before date minus 3 days, and the day). Back-off, snooze and dismiss never remove them (property test).
- **Budgeted:** check-ins and nudges, within a per-student weekly budget; deadline reminders are never cut, everything else is cut first. Batched into one morning digest (Fitz 2019, Kushlev 2016 as cited in research-psychology 2.5).
- **Back-off:** after three unanswered check-ins Duly stops asking, the count shows "as of [last confirmed]" and turns Can't tell yet. It never goes quiet and never gets louder; it offers the calendar once.
- **Platform limits:** iOS allows 64 pending local notifications per app (Apple forum thread, https://developer.apple.com/forums/thread/811171; test on a device before relying on it), so schedule the nearest ~50 and re-plan on open and on every record change. Android 14 restricts exact alarms, so use inexact windows (research-system 8.2). The calendar file is the dependable fallback and is offered on every commit.
- **Truthful receipts:** reminder words come from the scheduler's real state ("Reminder set on this phone" or "Reminders are off here. Add to calendar"), never from a template (FTC Zoom order: https://www.ftc.gov/business-guidance/blog/2020/11/zooming-zooms-unfair-deceptive-security-practices-more-about-ftc-settlement).
- **Hand-offs come back:** a DSO draft opens waiting(person) with "Did your DSO reply?" after 5 business days (a setting). The student records the reply; the loop resumes.

### 2.5 Feedback
| Kind | Allowed form | Never |
|---|---|---|
| Positive (the receipt) | What changed, what Duly checked, the next date, or "Nothing else needs you for this." Then it folds to one line. "Done. New job at Acme from Nov 20 saved. Count stopped at 61 days." | Praise, "you're fine", "all set", "on track", streaks, points, confetti (D10) |
| Negative | Once, in full, with the path in the same view: "The report day was Nov 10. Today is Nov 12. This is a question for your DSO" plus the draft | "Late", "violation", red alarms, any status conclusion, a standing banner |
| Unknown | "Can't tell yet" plus the one fact that would settle it, as the next step | Silence, or a quiet screen |

Voice: no "I" and no "we". Duly speaks in the third person or in no person ("Next check-in: Oct 30"), added to copy_lint. One stable wording per template; nothing that carries a deadline varies. Deadlines read "on or before", which is not ambiguous about the day itself (GOV.UK style: https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/). Buttons name the outcome: "Save to my record: job ended Oct 31", not "This happened"; "Still at Northwind" closes the check-in with "Confirmed. Next check-in: Oct 30". The receipt stays until dismissed or the next visit, and is announced as a status message (WCAG 4.1.3: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

Evidence behind this, honestly weighted: uncertainty about timing hurts more than known bad news (de Berker 2016, N=45, shocks, by analogy: https://www.nature.com/articles/ncomms10996); a specific plan reduces the pull of an unfinished goal (Masicampo and Baumeister 2011, read through summaries, replication unverified: https://users.wfu.edu/masicaej/MasicampoBaumeister2011JPSP.pdf); the Zeigarnik memory effect did not hold in a 2025 meta-analysis while the urge to resume did (https://www.researchgate.net/publication/393261073_Interruption_recall_and_resumption_a_meta-analysis_of_the_Zeigarnik_and_Ovsiankina_effects). These are design reasons, not promised outcomes. Duly proves its own effect in a study (Phase 2).

### 2.6 Five worked loops

**A. Job ends** (the founder's chain)
1. Open: check-in "Still at Northwind, about 40 hours a week?" then "My job ended"; or Ask "I got laid off"; or WorkBook marks the job ended.
2. Asking: last day of work (picker starts empty, "I'm not sure" one tap away); whether another job is already recorded (from the record). Nothing else changes the dates.
3. One screen, in this order: the fact recorded; report on or before Nov 10, tagged guidance (the regulation gives no number for post-completion OPT; the 10 days comes from Study in the States, rulepacks/PROGRESS.md) with a sourced line on what the report is and who sees it; runway "as of today: 41 used; the limit date is Dec 19"; then the actions.
4. Actions (what, how, where): report (where, with the source); email the DSO (pre-drafted); open the school career office page if the school record has one; "What counts as a job on OPT" (rule shown, never judged); "When you have an offer, add it here: it stops the count".
5. Planned, then waiting(until): reminders on or before Nov 10 minus 3 and the day; a check-in every 14 days "Any new job or offer?"; calendar file offered.
6. Step back where needed: "Does this volunteer role count?" goes to the DSO draft and waiting(person).
7. Confirming: "Report made?" Yes saves the date. A new job added stops the count.
8. Closed: "Done. Report marked made Nov 4. New job at Acme from Nov 20 saved. Count stopped at 61 days." Folds to one line, moves to Record.
9. Reopen: the new job ends, hours fall below the line, or a reporting rule changes the output.
- Never: what follows day 90, or "you will be out of status".

**B. Travel**
1. Open: Plan "Plan a trip", or Ask "going home for Christmas".
2. Asking: leave and return dates; passport and visa fields only if not on file.
3. Answer: trip check lines (VALUE-2 feature 3), each only where its rule is saved: travel signature coverage, card end against return, days away against the five-month line, passport and visa expiry, all as dates.
4. Actions: ask the DSO for a new travel signature (drafted) if it does not cover the return; "Carry these" offline folder preselected; both dates to calendar.
5. Waiting: runway at 21 days before ("Signature requested?") and 2 days before ("Folder on this phone?").
6. Confirming: on the return date, "Back in the US? Confirm your return date."
7. Closed: "Trip saved, Dec 18 to Jan 9, 22 days." Reopen if the return date changes or a new I-20 arrives. Never "you can travel"; re-entry judgements go to the DSO.

**C. STEM OPT filing**
1. Open: runway from the card end date, or Ask "STEM extension". The STEM card on Today ("Decide on or before Oct 15") opens in place; "Yes" goes to planned, not to a strip that stops.
2. Asking: whether the degree's CIP code is on the DHS list (read from the I-20 on the device; the list must be saved as a source first, ANALYSIS.md, removed from the repo on 2026-10-03, D100; in git history at 67bbc33); employer E-Verify status as a fact the student enters; DSO recommendation date when it exists.
3. Answer: "File your I-765 on or before [engine date]", with the limit that sets it marked.
4. Actions in order: complete the I-983 with the employer and add it; get the DSO recommendation; file the I-765; add the receipt number.
5. Waiting: after the receipt, waiting(event) on the decision, with the USCIS line on Today.
6. Closed when the approval notice and new card are added and fields confirmed. Closing opens its children: validation reports and I-983 evaluation dates, each its own small loop.
7. Reopen: employer change (new I-983), or an RFE notice added (hand-off loop to DSO or attorney). Never "eligible", odds, or a date from a rule not saved with its quote.

**D. Address change**
1. Open: Ask "I moved", or Record, address.
2. Asking: new address, move date.
3. Answer today: no date. 8 CFR 214.2(f)(17) is decided (D74) but not yet a saved rule, so Duly says "Tell your school about your new address; your DSO can confirm the deadline" and drafts it.
4. Act: update the record; send the draft. Confirming: "Updated with your school?" with the date.
5. Closed with a receipt. When the rule lands with its quote, the template gains the engine date and open address loops reopen to show it. Never a "10 days" figure before then.

**E. Lost document**
1. Open: Papers "I lost a paper", or Ask "lost my passport".
2. Asking: which paper; inside or outside the US (changes who to contact).
3. Answer: what Duly holds: "A copy saved Mar 3, with its number and dates", usable offline at once. No replacement procedure is in the F-1 pack, so Duly invents none.
4. Actions: open the copy; for an I-20, DSO draft for a reissue; for a card or passport, the official agency page once it is saved and allowlisted, until then the DSO draft; mark the old paper "reported lost" (its dates keep feeding reminders until a replacement is confirmed).
5. Waiting: "Replacement arrived?" every 14 days. Closed when the new paper is added and confirmed; the receipt lists what moved (new number, any date change).

Rule work these loops need first: 8 CFR 214.2(f)(17) and (f)(12)(ii)(A) (D74), document replacement sources, the DHS STEM list, travel signature sources.

### 2.7 Loops Duly needs beyond these five
Crisis and enforcement first: before any template match, a fixed on-device list of phrasings ("ICE came to my door", "SEVIS terminated", "visa revoked", "I can't do this anymore") opens a fixed screen, never generated: the 988 Lifeline (call or text 988, available 24/7: https://988lifeline.org/), the school's international office from the record, and "talk to an immigration attorney now", with no dates and no verdict. Reviewed by a clinician and an attorney. Also a notice-received loop (termination or revocation: save the notice, record the date it arrived, drafts to DSO and attorney, no consequence stated) and a scam-check loop ("someone called saying..." leads to the DSO step-back).

## 3. Information architecture

### 3.1 Four places plus Ask
Material says navigation bars hold "three to five destinations" (https://m3.material.io/components/navigation-bar/guidelines); Apple says tab bars are for navigation, not actions (research-ui 5.2). So Ask is an entry, not a tab.

| Place | Holds |
|---|---|
| **Today** | The four fixed slots (3.2) and Ask |
| **Plan** | Next steps on the time strip; reports owed; **Status** (USCIS cases, receipt, last checked, next check); **WorkBook** (jobs, hours, employer details; every employment change in WorkBook opens the matching loop) |
| **Papers** | Every document, sorted by type; Carry these (offline); document watch; Share; To review (fields read on device awaiting confirmation, D55) |
| **Record** | The footprint (3.4); Your profile (facts, edit in place); **Updates** archive; Export; Situations library |

Laptop: the same four in a sidebar, Ask at the top on Cmd K; Papers and Record become two panes at 1024px and wider. Settings and Feedback sit behind the account mark.

### 3.2 Today: four fixed slots, collapsed
The founder's "no fixed value set" is about predictability, so Today always has the same four slots in the same order, each with an empty state that still says something (design review 3.7):
1. **Where you stand.** One line and one number, as of a date: "On OPT. 41 of 90 days used as of Sep 30." The other numbers are one tap down (decision F6). Tapping opens the source sheet.
2. **What's next.** At most three open loops, one line each, each header delivering its answer and date ("Report the end of your job on or before Nov 10 · guidance"). A collapsed header keeps its source tag when the rule is not settled. Earliest engine date first; overflow reads "2 more, next on Nov 1". A tracked USCIS case always shows one line here.
3. **Your papers.** "14 kept on 2 devices · backed up 9:40 · next to run out: passport, Mar 3, 2027". This is the founder's first purpose, stated as a fact.
4. **What changed.** Only when a published update touches this student ("1 rule change touches your plan: nothing to do now", which opens and then closes). Otherwise "Rules checked Sep 30".

Then **Ask**, and the footer: "Records and dates from your documents, not legal advice."

The end line ("Nothing in Duly needs you before Oct 30.") appears only when no item is Can't tell yet, the rule bundle is current, sync is healthy and reminders are on. Otherwise it names what is unknown ("Not checked since Sep 12: rules"). Property test. Leaving Today: the promise line (to Welcome and Settings), the News list (to Record), answered check-ins, the duplicate footer.

### 3.3 Ask, Situations and What if (the better name for "scenarios")
- **Ask** is the assistant's front door: bottom of Today on the phone, Cmd K on the laptop, and on every card ("Ask about this"). It matches, in order: crisis phrasing; a paper; a date the engine holds; a page; a Situation; a rule in plain words; nothing, which drafts a DSO question. Every question ends somewhere useful; never in a generated paragraph about the student's case.
- **Situations** is the browsable library of loops ("My job ended", "I'm travelling", "I moved", "I lost a paper", "My DSO replied"). Recognition beats recall: an empty text box promises a chatbot, a list shows what Duly can carry. Real situations write to the record ("Something changed").
- **What if** is the sandbox (Try a change, VALUE-2 feature 2): it never writes and never schedules. A band reads "Not saved to your record" the whole time; the only exit that saves is a button naming the outcome. Separating these stops a student saving a pretend job end. Entry points follow D72 (on the cards it touches, plus Your profile, not on Home).

### 3.4 The footprint: Your record
The founder's "digital immigrant footprint" is the append-only event log the record needs anyway, shown as a dated history: facts confirmed, papers and versions, programs, jobs, trips, petitions, reports marked made, loops closed with outcome, rule changes applied ("Rules updated Sep 30: your file-by date did not move"), DSO emails and replies. Filters, search, export, share, reopen. In the product it is called **Your record**: "footprint" describes what students fear (psychology review B5). Limits, because a full history can be used against the student at a border or under a subpoena (CBP may search data "resident upon the device": https://www.cbp.gov/travel/cbp-search-authority/border-search-electronic-devices):
- typed Ask text is never stored and never synced; What if runs are never stored;
- DSO drafts are local-only and purgeable once a loop closes; outcomes stay;
- per-item keys, so any single fact, paper or question can be crypto-shredded;
- a student-set retention period for closed loops; undo is a compensating event within a window;
- counsel reviews this before the record ships.

## 4. The assistant

### 4.1 Who owns what
| Part | Owns | Never |
|---|---|---|
| Engine (deterministic, sourced rules) | Every date, count and verdict | Words about the person beyond its items |
| Loop runner (deterministic) | Which step is next, timers, closure | Values |
| Templates (signed, human-reviewed, typed holes) | Every sentence the student reads | Free text at runtime |
| Router | Which template, paper, page or rule a question maps to | Writing an answer |
| Model (later, optional) | Picking a template id and the next missing slot | Numbers, sentences, conclusions |

Most of the "smart assistant" is not a model: loops open, follow up and close with no model at all (Anthropic: prefer simple workflows over agents where they suffice, https://www.anthropic.com/engineering/building-effective-agents; Rasa CALM keeps business logic deterministic, https://rasa.com/docs/learn/concepts/dialogue-management/).

### 4.2 Where it runs (v1 and later)
- **v1: no generative model at runtime, and no question text or loop state leaves the device.** The router is on the device: synonyms and keywords, one small bundled multilingual embedding model (same on every platform; choice to be benchmarked, unverified), kNN over reviewed paraphrases, calibrated abstention, top three matches as buttons, "none of these" drafts to the DSO. Calibrated scores, not a model's stated confidence, which runs overconfident (https://arxiv.org/abs/2306.13063).
- **Later, if eval data shows need:** Apple Foundation Models on device to pick a template id (about 3B parameters; Apple says it is "not designed for world knowledge or advanced reasoning": https://machinelearning.apple.com/research/apple-foundation-models-2025-updates).
- **Cloud model:** only after a founder ruling, because D27 (Bedrock for v0) and the hard rule (no student data to an outside provider) pull different ways and question text is status information. If ever approved: values scrubbed on device, an unlinkable relay, Bedrock retention mode "none" enforced by SCP on both control-plane and mantle actions (https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html), and only models that allow "none". The live "explain over the rule library" path in research-system 9.1 is deleted: it is runtime legal prose.
- **Pipeline:** a model may draft from public law text only, offline, with human review before the text ships in the signed bundle.

### 4.3 Guardrails
1. **Route first, check the boundary second.** Today assistant/boundary.classify_turn sends "what do I do now?", "when is my deadline?", "where do I report it?" and "I lost my job" to the DSO card (ML review A1), which would rebuild the dead end. Each Playbook step carries a reviewed A or B tag; that tag decides. The regex only escalates judgement questions inside an A route ("does my unpaid role count"). "Doubt" means the router abstained. Contract change to BOUNDARY.md and evals/boundary; a lane cannot make it.
2. Text only from signed templates with typed holes and a per-template allowlist of fact ids; the validator checks each hole is bound to the right fact, not only that a number traces to the engine.
3. A tokenising validator: citation and form ids allowlisted from the pack; spelled-out and relative numbers ("ninety days", "next Tuesday") caught in each supported language.
4. Crisis and enforcement routing before template matching (2.7). No model text on distress screens.
5. No predictive models about a case, ever: no processing-time guesses, approval odds or risk scores.
6. A signed kill switch: any Playbook, template or router model can be revoked within hours through the update channel, falling back to the DSO step-back; a per-card "this looks wrong" files a local report sent only if the student chooses.
7. Resource links only from an allowlist signed into the bundle. Duly never sends a link to sign in, pay or "verify status"; a "Duly will never..." page.

Why this strictly: a company is liable for what its chatbot says (Moffatt v. Air Canada: https://en.wikipedia.org/wiki/Moffatt_v._Air_Canada); the FTC ordered DoNotPay to pay and stop AI lawyer claims (https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires); Stanford found legal AI tools hallucinating on 17% to 33% of queries (https://www.lawnext.com/2024/06/in-redo-of-its-study-stanford-finds-westlaws-ai-hallucinates-at-double-the-rate-of-lexisnexis.html).

### 4.4 Evaluation
- Statecharts: exhaustive verification in CI (2.3); clock-injected property tests across pack versions.
- Router: a hidden held-out set of real-style phrasings (synthetic, multilingual, code-mixed); thresholds set for precision; precision against coverage published per release; pass^k only on the stochastic part (https://sierra.ai/blog/benchmarking-ai-agents).
- Coverage: share of reachable engine output states that have a Playbook step; router abstain rate.
- Boundary: today 82 lines, which bounds a leak rate only below about 3.7% by the rule of three (https://en.wikipedia.org/wiki/Rule_of_three_(statistics)). Target hundreds per Playbook family, plus adversarial and pasted-text injection cases.
- Number and citation validator: zero failures on a dedicated adversarial set.
- Paid DSO or attorney review of every Playbook and template, recorded in the bundle with reviewer and date.
- Counter-metrics so closure is not gamed: reopened within 14 days, asked again within a day, step-back rate.
- People: moderated sessions with 6 to 8 F-1 students on OPT or STEM, synthetic records, before and after the redesign. Measure task success, "what is your next date and action?" (target at least 90%), state anxiety before and after (instrument chosen by a psychologist), checks per week, time to reopen after bad news, and false-closure rate. No A/B tests on deadline copy or bad-news loops.

## 5. Document security and sync

### 5.1 Model
Keys are made on the device; the server holds only ciphertext and wrapped keys; signing in is separate from opening documents; new devices get keys from an enrolled device or the recovery kit. This is how 1Password, Proton Drive, Apple ADP and Signal work (research-security 2). Documents are read on the device (Vision on Apple, ML Kit bundled on Android), pixels only, rules-first classification that abstains rather than guesses; every field is confirmed by the student (D55). Deterministic checks first: passport MRZ check digits (weights 7-3-1 mod 10: https://en.wikipedia.org/wiki/Machine-readable_passport), id formats, cross-document name and date checks. A field that fails a check is never shown as read.

### 5.2 One key schedule (replaces the two in research-security 3.2 and research-system 6.2)
| Key | Purpose | Kept |
|---|---|---|
| K_vault (256-bit) | Root for the student's data | Only wrapped: once per device, once under R |
| DK_dev | Device unlock key | Platform key store with user presence (Keychain "this device only", Android Keystore, StrongBox where present) |
| SK_dev | Device signing key, P-256 so it can live in Secure Enclave, StrongBox or TPM | Hardware where present |
| K_sync, K_backup | Derived from K_vault by HKDF with purpose labels | Never stored |
| SK_vault_sign | Signs the device list, vault header (with epoch number) and checkpoints | Wrapped under K_vault |
| F (per file), K_item (per sensitive fact or question) | Lets one item be crypto-shredded | Wrapped under K_vault |
| R, recovery kit (128-bit) | Opens K_vault when every device is lost | Only in the student's kit |
| K_local (per device) | Local record store so Today works while documents are locked | Never syncs |

Anything stored on the server is wrapped symmetrically under keys derived from K_vault (quantum-safe at 256 bits, no public-key wrap needed). Every envelope header carries an algorithm id and version so post-quantum wraps can come later without a migration.

### 5.3 Devices, recovery, revocation
- **Sign in:** passkeys, no SMS, no passwords on the server (NIST accepts synced passkeys at AAL2, research-security 3.4). Taking over the account yields ciphertext only. No magic-link recovery.
- **Add a device:** the enrolled device approves; QR scan is the primary path (an authenticated out-of-band channel), a short code over a PAKE is the fallback with no camera. The pairing exchange should become hybrid X25519 plus ML-KEM-768 (CryptoKit lists MLKEM768: https://developer.apple.com/documentation/cryptokit/mlkem768; OS versions unverified). The device list is signed; a device not on a signed list never gets K_vault, so a compelled server cannot add a reader.
- **Recovery:** any enrolled device, or the 128-bit kit. Enrolling with the kit alone starts a security delay (proposal 24 hours, founder sets it) with notices to every device, copying Apple's Stolen Device Protection (research-security 3.5). No Duly escrow and no PIN escrow (D54). Plain words: "If you lose your recovery kit and every device, no one can open your documents, including Duly." Second device encouraged at setup; kit checked yearly.
- **Revocation:** removing a device rotates K_vault, K_sync, SK_vault_sign together and publishes a new signed header with a higher epoch; devices refuse writes from old epochs. A test proves a revoked device's saved keys open nothing written after the epoch. What it cannot do (say so): a removed device can still read what it already downloaded.

### 5.4 Sync
Each device writes its own hash-chained log: every event carries the hash of the previous one and the device signature. Devices sign checkpoints and compare them on each sync, so a server that shows the phone and laptop different histories is detected and becomes Can't tell yet plus a loop. The record is a deterministic function of the set of events, not their arrival order (shuffle, fork and rollback property tests). Conflicting facts become a question to the student, never a silent merge. A new device starts from a signed checkpoint, then later events. Uploads are padded to size steps; the remaining timing leak is stated.

### 5.5 Threat model (STRIDE detail in research-security 6)
| Threat | Answer |
|---|---|
| Lost or seized device | Platform data protection; Duly locks on idle and screen lock; app-switcher blur; no Spotlight or Siri indexing; vault excluded from cloud backup |
| Lock screen, roommate, employer, border officer | Notification previews generic by default ("Duly: 1 item today"); push payloads content-free; no widgets showing status by default; secure entry for SEVIS ID and receipt fields; clipboard expiry (OWASP MASVS: https://mas.owasp.org/MASVS/) |
| Calendar exports | Generic titles by default ("Duly item"); detail opt-in with a one-line warning that it goes to the calendar provider; no hosted subscription URL |
| Account takeover | Passkeys; a login alone opens nothing |
| Server breach or insider | Ciphertext only; no standing human access |
| Government demand | Hold almost nothing: email (optional, relay addresses welcome), device list, ciphertext, upload times. One public rule bundle for everyone, fetched without auth, CDN path logs off (CloudFront logs record request paths: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html). Push opt-in. Published request policy and a retention table with numbers. Real precedent: Google gave a Cornell student's data to ICE (https://techcrunch.com/2026/02/10/google-sent-personal-and-financial-information-of-student-journalist-to-ice/) |
| Malicious documents | Parse in a sandboxed, memory-safe reader; render PDFs with scripts off; fuzz every parser (FORCEDENTRY, PDF.js CVE-2024-4367, research-security 5) |
| Supply chain | Lockfiles, SBOM, signed builds, OIDC CI with no static keys, lanes cannot add dependencies |
| Web client served altered code | Web is public library plus account and devices at launch; the record and documents come later, per session approved from a trusted device, after published release hashes (Code Verify: https://engineering.fb.com/2022/03/10/security/code-verify/) |
| Mass-panic or false rule update | TUF with offline root, 2-of-3 threshold signing, staged rollout 1% then 10% then 100%, kill switch, signed rollback; a device holds back a bundle that changes many of a student's verdicts behind "review this update"; bundles carry data only |
| Agent-written crypto | Crypto, pairing, sync and the reader use vetted libraries only (CryptoKit, Tink or libsodium, an audited HPKE), with CODEOWNERS requiring a named human security reviewer; agents hold no signing or cloud credentials |

Not built: travel mode, hidden vaults or duress PINs (concealment at a port of entry may carry legal risk; unverified, counsel question). Duly's border job is the opposite: the right papers offline.

## 6. System architecture by discipline

**Backend.** Everything that knows the student runs on the device: event log, projections, engine, loop runner, scheduler, router. The server is a relay and a library: accounts, device list, encrypted log segments, encrypted blobs, the public signed bundle. `/v1/compute` and `/v1/compute/f1` in contracts/openapi.yaml take a whole case; they never deploy to production (gate), dev and synthetic only. The engine is 3,681 lines of Python (engine/*.py), so it cannot run on a phone as built. Port to Rust with UniFFI for Swift and Kotlin and WebAssembly for web and desktop (https://mozilla.github.io/uniffi-rs/latest/); TypeScript is the fallback. The Python engine stays the oracle: every bundle ships golden vectors and the port must match byte for byte. Move calendars and day-count tables into bundle data first so less logic is ported. Civil-date arithmetic only; "today" in a recorded time zone (decision); device clock checked against signed time, and a wrong clock gives "Can't tell yet: your device date looks wrong".

**Data engineering.** The record is an append-only typed event log with provenance (read from paper, answered, confirmed) and a schema version; facts, papers, timeline, loops and schedule are projections. Old app with new bundle: each bundle declares min engine and runner versions; if the app is too old, "Can't tell yet: update Duly", never silently old rules. Updates pipeline: watch (Federal Register, eCFR point-in-time, CourtListener docket webhooks, agency pages), snapshot to S3 Object Lock, detect, classify, draft from public text, two checks, founder approval, sign (TUF), publish, recompute on the device (research-system 7). Correcting Duly's own error: revoke the bundle version, recompute, open a loop "A date was corrected: was X, now Y, because Z".

**ML and AI.** The on-device router (4.2); the document reader with deterministic validators and stated error bounds (zero errors in n reads bounds the rate only below 3/n); evaluation on the tester's own device with consent, only a right/wrong bit per field leaving; training on synthetic specimens only. Watcher recall: backtest on past F-1 changes (D/S rule, H-1B fee) by replaying eCFR and Federal Register history; publish recall; keep a scheduled human sweep regardless.

**Security.** Section 5, plus: one named human owns the key schedule document; a written protocol spec, a Tamarin or ProVerif model of pairing and revocation, fuzzing of every envelope, event and bundle parser, then an outside crypto audit and pen test, all release gates before sync or backup.

**Cloud.** AWS us-west-2; backups replicated to us-east-2 (decision). Five accounts to start: management, security (logs and tooling), prod, pipeline (the only one that fetches the web), nonprod. No assistant account until a cloud model is approved. Small Multi-AZ RDS Postgres. Rough cost (research-system 15, several prices unverified): about $600 to $950 a month at 1k students, mostly fixed platform; lower without the cloud assistant line.

**Networking.** The app network has no general internet egress; an egress proxy allows only APNs, FCM and SES and logs on the same schema. Push is a content-free wake-up; the device fetches and renders the notice. Library wake-ups use topics or background refresh, not per-device token lists (FCM topics: https://firebase.google.com/docs/cloud-messaging/android/topic-messaging). Oblivious HTTP for any later telemetry or relay (https://www.rfc-editor.org/rfc/rfc9458).

**Observability.** Logs on a fixed field schema with no personal data; CloudWatch masking as a second layer; IP and WAF logs kept 7 days. Correctness targets before uptime: zero wrong dates (any one is an incident); court docket change to Can't tell yet on devices within 24 hours; reminders fired on the planned day (measured on real devices); daily canary restore in production and a pairing test on every release ("my documents never get lost" needs proof). Telemetry in v1: platform crash reports and opt-in counts only; DAP waits for scale and a named non-colluding second operator (https://datatracker.ietf.org/doc/draft-ietf-ppm-dap/). Support: "Send my case to support" encrypts the case to a support key, deleted after 7 days, logged in the record, student's choice only.

**CI and gates.** Existing gates 1 to 6 plus: statechart dead-end gate; copy_lint additions (no "This happened", "Yes, same", "I"/"we", "on track", "all set"; "on or before"; month as a word); end-line property test; scheduler tests with a fixed clock and permission denied; differential engine tests; a recorded-bytes test that plants canary SEVIS IDs, dates, school names and question text and fails if any appears in any outbound traffic (push, email, CDN, crash reports, DNS); fuzzing; CODEOWNERS on crypto paths; `/v1/compute*` not in the production build.

## 7. Risk register (top 15; likelihood and impact 1 to 5, before mitigation)
| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| 1 | Wrong date or count shown | 3 | 5 | Engine only; sourced rules; golden vectors; differential tests; Can't tell yet on doubt |
| 2 | Engine port diverges from the Python oracle | 3 | 5 | Byte-identical golden vectors block release; versions shown with every result |
| 3 | False closure: a loop says done, obligation unmet | 3 | 5 | Planned is not closed; closure needs confirmation or an outside fact; property test |
| 4 | Assistant crosses the legal line | 3 | 5 | No runtime generation in v1; reviewed templates; A/B tags; validator; paid review |
| 5 | Ask dead-ends (boundary floor blocks every question) | 4 | 4 | Route first, boundary second (contract change); abstain to DSO draft, never nothing |
| 6 | False or bad rule published to everyone | 2 | 5 | Threshold signing; staged rollout; kill switch; device-side verdict-swing guard |
| 7 | Court order missed | 3 | 4 | Docket webhooks; 24-hour target; stale regime turns Can't tell yet (D65); one-key freeze |
| 8 | Government demand for account data | 4 | 4 | Hold almost nothing; one public bundle; content-free push; request policy; retention table |
| 9 | Status leaks via lock screen, calendar, clipboard | 4 | 3 | Generic previews and titles by default; tested invariant |
| 10 | Record seized or coerced open | 3 | 4 | No stored question text; crypto-shred per item; retention setting; counsel review |
| 11 | Revocation or sync flaw exposes or forks the record | 2 | 5 | Epoch rotation; hash chain; signed checkpoints; formal model; outside audit |
| 12 | Student loses every device and the kit | 3 | 4 | Second device at setup; yearly kit check; honest words |
| 13 | Reminders not delivered | 4 | 3 | Nearest ~50 scheduled; re-plan on open; calendar fallback; receipts state real scheduler state |
| 14 | Avoidance after bad news; reminder fatigue | 4 | 3 | Threat never without actions; weekly budget; no escalating tone; outcome study |
| 15 | One founder, agent-built code, no second signer | 4 | 4 | Human security reviewer on crypto paths; second release signer; IR firm; on-call; tabletop before first stranger |

## 8. What changes next, and what is built for real

**Phase 0: prototype (days).** In specs/ui-2/prototype: Today as four fixed slots; Ask on Today and Cmd K; Situations list and a separate What if band; loops worked in click-through for job ends, STEM decision, check-in and travel, each reaching a receipt and folding into Record; outcome-named buttons replace "This happened" and "Yes, same"; the end line with its unknown states; Plan holding Status and WorkBook; Record holding Updates archive. This is the founder's test point (a sizeable milestone), with a test guide.

**Phase 1: contracts, alone first.** loop.schema.json (2.3), playbook.schema.json, event envelope and kinds, checkpoint and compatibility fields, the BOUNDARY.md change (route first), D74 rules, copy_lint additions, the statechart gate.

**Phase 2: desktop vertical slice.** Event log replaces the case JSON (Python engine unchanged); loop runner and scheduler; the job-ends loop complete end to end including DSO hand-off and return, close, reopen; then trip, file-by, To review, report owed. Usability sessions with F-1 students before and after.

**Phase 3: engine port spike, then port.** Time-boxed: Rust with UniFFI and WebAssembly vs TypeScript (Pyodide on iOS unverified). Pass: identical golden output, runs on iOS with no JIT, cold start and size targets set by the founder.

**Phase 4: local-only iPhone app.** Papers read on device, record, loops, scheduler; reminder delivery measured on real devices for 30 days.

**Phase 5: pairing and sync.** One key schedule, signed device list, epochs, hash-chained logs; protocol spec and formal model first.

**Phase 6: backup.** Object Lock, government request policy, retention table, counsel sign-off on the consent screen, outside audit and pen test.

**Phase 7: updates publish half.** Whole signed bundle, TUF threshold signing, staged rollout, freeze key, on-device recompute and "What changed".

**Phase 8: on-device router for Ask** with the eval sets in 4.4. **Phase 9:** incident response ready, then the first strangers. **Later, only after decisions:** Android, Windows, web record, any model beyond the router, metrics.

## 9. Decisions for the founder
1. Approve the Loop (2.3) as Duly's one building block, including "Planned is not closed".
2. Approve the BOUNDARY.md contract change: route first, boundary second.
3. v1 with no generative model and no question text leaving the device; this narrows D27 for v1.
4. Names: Ask, Situations, What if, Your record. Approve two separate actions, "Something changed" and "What if".
5. Today as four fixed slots; papers status on Today (overrules research-security's "storage status not on Home").
6. One number on Today with the rest one tap down, or keep the three numbers from round 3.
7. WorkBook under Plan, with employment changes opening loops.
8. How far "find a job: where" goes inside D47 (rule, career office page, E-Verify employer lookup for STEM whose URL is unverified, "add the offer here"; never listings).
9. Footprint limits: no stored Ask text, per-item crypto-shred, retention default; counsel review.
10. Platform order: Apple first (iPhone and Mac), web as public library at launch, then Android and Windows. This changes "macOS first then Windows"; the Apple share of students is unverified.
11. Weekly notification budget, back-off rule, DSO-reply nudge delay.
12. Time zone for "today"; kit-only enrolment delay length; second backup region.
13. Engine port language (Rust recommended, TypeScript fallback).
14. No USCIS relay in v1 (manual check with prompts); apply to the USCIS API and decide when it answers (https://developer.uscis.gov/apis).
15. No dated reminder email (D73); update email to all subscribers with "shown because" on device.
16. Who the second release signer and the human security reviewer are; budget for an outside audit, pen test, paid DSO or attorney review, and the student study.
17. English only in v1, or a budget for reviewed translations (no runtime translation).
18. No travel or concealment features without counsel.
