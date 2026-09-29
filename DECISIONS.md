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
