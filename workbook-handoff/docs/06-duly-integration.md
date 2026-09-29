# WorkBook inside Duly

## What Duly is (from the founder's brief, September 2026)

Duly is a visa-status app for international students in the US (UK next). Three promises:

1. You will always know. Documents in one place, timelines and deadlines computed from them, and a daily digest of verified updates from primary sources. Trust that the app keeps you posted.
2. Nothing gets lost. Every CPT I-20 version, EAD, receipt notice, I-983, offer letter, sorted by status period and version, encrypted, easy to reach.
3. You are covered. WorkBook keeps the proof of work so an RFE or a DSO check is a click, not a panic.

Plus an assistant that acts as a checklister: bundles the steps for each transition (CPT to OPT, OPT to STEM, STEM to H-1B), cites official sources, flags where schools differ ("confirm with your ISSS"), and keeps a human in the loop before any handoff.

## Positioning (recommended)

- One line: "Your status, in order. Every document, every deadline, every hour of work, kept and ready."
- Lane: a status manager with a trusted assistant. Not an advisor, not a lawyer replacement. Legally safer and more believable.
- Start at admission, not at OPT, to own the full three-to-five-year lifecycle.
- Free tier complete for compliance; charge at the moments that matter (OPT filing, STEM extension, H-1B prep, attorney handoff, WorkBook packs).
- Universities as the channel: a "verified by your school" layer where a DSO publishes the office's procedures into the app.
- UK Graduate Route as the second country with the same engine.

## Market and competition (checked September 2026)

- 1,177,766 international students in the US in 2024/25; 294,253 on OPT (up 21%); 57% in STEM. New enrollments fell 17% in fall 2025 after a 7% drop the prior year. India 363,019, China 265,919.
- TrackMyOPT: OPT calculators, 90-day clock, USCIS case checks, document vault (not end-to-end encrypted), H-1B sponsor database, resume tools. Free, $4.17/mo, $12.50/mo with a 60-minute attorney consult. About 3,000 signups. Beatable on records, trust, and design; its sticky parts are the sponsor database and job tools.
- VisaBuddy: compliance dashboard (unemployment days, travel days, EAD expiry, deadline alerts), forum, Llama chatbot with CFR citations. Free, $3.99/mo.
- Lawfully: USCIS case tracker, 800k registered cases, $2.5M seed (2022). Case status only.
- opt-copilot: an open-source OPT deadline tracker on GitHub. Hobby scale.

Nobody owns the full lifecycle with real record keeping. WorkBook is the moat; "latest news" alone is not.

## Rating (September 2026)

| Dimension | Score |
|---|---|
| Problem urgency | 9/10 |
| Willingness to pay | 5/10 |
| Differentiation | 8/10 |
| Defensibility | 6/10 |
| Market risk | 4/10 (shrinking intake, OPT reform pending; uncertainty also drives demand) |
| Legal and liability risk | 5/10, manageable only with "organize and cite, never advise" |
| Fit with an AI product house | 8/10 |
| Overall | 6.5/10 standalone; 8/10 as a first offering that builds trust and users |

## Integration boundary

WorkBook exposes a local, versioned API (v1) to Duly:

- `GET /case` and `PUT /case` (profile from setup; Duly owns status dates and documents, WorkBook owns duties, sources, hours target)
- `GET /days?from&to` (Day objects with blocks; read-only from Duly)
- `GET /history?since`
- `GET /documents` (index only; blobs stay encrypted and are opened through WorkBook's unlock)
- `POST /exports` (build a pack; returns a job id) and `GET /exports/:id`
- `POST /links` and `DELETE /links/:id`

Shared store: status documents (I-20s, EAD, SEVP report, receipt notices) belong to Duly's vault; work documents (offer letter, EIN letter, I-983, contracts, pay stubs) are shared; both live in the same encrypted document store with the same lock.

Duly's timeline reads WorkBook's weekly hours to show "on track" against the 20-hour line and to explain unemployment days.

Rules Duly must inherit: no screen capture, metadata only, user confirms before anything becomes a record, AI lines stay marked, nothing overwritten, one lock for all documents, local-first with optional end-to-end encrypted backup.

Later: multiple cases per user; supervisor view for STEM OPT evaluations via export links; DSO share via the same links.

## Duly modules (blueprint v1)

1. Vault: documents by status period (Admission, CPT 1, CPT 2, OPT, STEM OPT, Cap-gap, H-1B), typed and versioned; extraction fills dates, user confirms every field.
2. Timeline: derived from documents; program end, OPT window, EAD dates, unemployment days used, STEM eligibility, cap-gap, 30-day grace, travel days; each item shows its source document.
3. Checklists: per transition, from official guidance, each item cited, "confirm with your ISSS" where schools differ; human approval before anything is marked done or sent.
4. Updates: daily pull from primary sources (USCIS, ICE SEVP, Federal Register, NAFSA, the school's ISSS page), classified by relevance to the user's status, "what changed and what it means for your timeline," always linked.
5. Assistant: retrieves from the user's documents plus the verified corpus, always cites, ends with a concrete next action or "ask your DSO"; never says "you are eligible" or "file this."
6. WorkBook.
7. Handoff: one-tap read-only, revocable packet for a DSO or attorney.

Trust architecture: local-first encrypted documents; optional end-to-end encrypted sync with user-held keys; a public verified corpus that never trains on user data; an attorney review layer with visible "reviewed on" dates per checklist; every AI output carries a citation and a not-legal-advice line in the product.

Pricing sketch: Free (vault, timeline, updates, basic checklists); Plus about $5/mo or $39/yr (WorkBook, packs, attorney-reviewed checklists, alerts); attorney consults pay-per-session with revenue share; university license per student per year.
