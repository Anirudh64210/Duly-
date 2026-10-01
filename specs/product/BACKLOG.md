# Product backlog

What the founder said after using the app. Each entry keeps the founder's point, then what it asks for. Nothing here is built until the factory is production grade (DECISIONS.md D38).

## 2026-09-29, first use of the F-1 screen

The founder entered their own dates. The arithmetic was right.

| # | What the founder said | What it asks for |
|---|---|---|
| B1 | "Limit minus the unemployment days used" is hard to read and does not say it is the days remaining | Item names say what the number is, in the words a person would use: "Unemployment days remaining". The working stays behind the row |
| B2 | The before-court and after-court display is confusing | One value on the row: the one in force. The other regime's value, and why there are two, sits behind one plain line such as "A rule change is blocked by a court. See what it would change." |
| B3 | With OPT entered, Duly said nothing about STEM OPT: when the window opens, which dates to watch | A "what comes next" view computed from the dates entered: the dates ahead on the person's path, each with its rule and quote. Inside BOUNDARY.md: Duly states the date a window opens and what the official source lists for it. It does not say whether the person can or should apply |
| B4 | What was the point of this stage | The screen must carry its own purpose. A person who enters dates leaves with the dates ahead of them, not only a check on the dates behind |

## From the second review (reviews/phase-2-second.md), not yet fixed

1. Dates that contradict each other get the quiet verdict and no question. Blocking.
2. A reading is marked only after the row is opened.
3. The screen calls 365 the number in the rule.
4. CPT days default to 0 when nothing was entered.
5. The day of an answer is never checked.
6. A filing window shows as open after the filing is recorded.

## Open question for the founder

A student still in their program, with no OPT, STEM or cap-gap entered: quiet verdict, or does Duly ask first?

## 2026-09-29, the founder on scope

"These should apply for all cases all across, not just the one I have outlined. That is the whole point of the product: it understands all the different scenarios and is ready to answer and compute what comes next."

| # | What it asks for | Where things stand |
|---|---|---|
| B5 | Every rule of behaviour holds for every case: confirm and never assume, a question for facts that do not fit, readings marked, the four verdicts, what comes next | The rules of behaviour are general. What the engine can compute is not: it covers F-1 post-completion OPT, STEM OPT, cap-gap, the CPT bar and the grace period. The packs for H-1B, O-1 and EB-1A are empty |
| B6 | What comes next for any stage, not only from OPT to STEM OPT | Written by hand for one step. It must come from the rule packs: each pack declares its stages, the dated windows of each, and the steps that can follow |
| B7 | Facts that do not fit, found in any case | Thirteen checks written by hand for F-1. The general checks (a done event dated after today, an end before its start, a span longer than its rule allows, a gap or an overlap between periods that must follow each other) must run over every dated fact in every pack |

Proposed next, after product round 1 and the desktop window: the path model. Rule packs declare stages and steps as data, each with sourced rules; the engine reads them and holds no scenario of its own. Then the scenarios are filled in pack by pack, each rule found in a primary source, in this order: the rest of F-1 (CPT, pre-completion OPT, program extension, transfer, change of level, travel, the rule in litigation), H-1B, O-1, EB-1A and the immigrant path, dependents.

## Parked by the founder, 2026-09-30

| # | Item | Notes |
|---|---|---|
| B8 | USCIS Case Status API (application tracking) | Parked until the product is better. Path: incorporate Duly in the US; public site with privacy policy and terms (Section 508); developer account at developer.uscis.gov and a team; sandbox app with 5 consecutive days of traffic, 200 and 4xx tested; email Torch developer support for the Developer Portal Affidavit; demo (OAuth client credentials, every response code, keys stored securely); production keys. The call must run from Duly's server (no secrets in the desktop app), so a receipt number passes through the server: founder to decide pass-through with no storage. Ask support first: rate limits, approval time, and whether a consumer app may query on behalf of its users. Until then the tracker is manual ("Status as of <date>") |
| B9 | School profiles, then school partnerships | v1 is generic: students add their school's steps into the standard checklist as Before, Alongside or After a federal step (specs/ui-2/BRIEF.md note 10). Later: sourced profiles of each school's process (the "school" source tag), starting with the schools with the most F-1 students; then partnerships where a school publishes its steps and DSOs get requests in the school's format (FERPA applies to anything a school shares) |
| B10 | Attorney network (v2) | Founder idea, 2026-09-30: immigration attorneys and firms set up on Duly at a discounted price for students; Duly gives them distribution and makes the handoff seamless (case and documents shared only with the student's consent), like BetterHelp for immigration. Design around the bar's referral rules early: lawyers generally cannot share fees for referrals (ABA Model Rule 7.2 and state rules), so the model is a flat listing or subscription, or a qualified lawyer referral service; check with counsel |
