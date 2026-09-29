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
