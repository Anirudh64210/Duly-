# Changes (capgap-1)

For each problem the reviews raised (law, boundary and contract lenses; the same problem raised
by several lenses is answered once and the lenses are named) and each missing item: what was done
and why. "Applied" means the SPEC or matrix now does what the problem asked. "Applied, changed"
means the problem was real but the fix differs. "Not applied" gives the reason, checked against the
saved source where the problem and the row disagreed on the law.

Law points checked in the saved sources for this round (2026-09-30): (f)(5)(vi)(C) "In order to
obtain"; 1004-03 section 2 (cap-gap 90, 17-month total 120), 9.1, 9.1.1 chart, 9.1.4 (start the
date OPT expires; "the employment authorization ends and the grace period begins"), 9.1.7, 9.2.1 to
9.2.3, 9.3.1, 9.3.2; (h)(2)(i)(G) whole; (h)(8)(ii)(F)(5) ("previously counted", about cap-exempt
employment, not on point); (h)(9)(ii)(A) and (B); (f)(17); (f)(5)(iv) bar sentence; (f)(10)(ii)(D)
(absent from the 2026-09-15 text); the 2016 preamble sentences on October 1, travel, abandonment,
footnote 119 and I-9 proof; the 2024 preamble on denial before April 1 and pending on April 1; the
2008 preamble "from notification".

## A. Cross-cutting problems (raised on all or many rows)

| Problem | Lens | Action |
|---|---|---|
| Rows cite ids in neither provision set (cg.guid.11 to 20, cg.ea.5, cg.stem.7, cg.opt.5, cg.sits.3) | law, boundary, contract | Applied, changed. Those ids were defined in the matrix's reconciliation note, which the reviewers did not see. SPEC Appendix A is now one merged register holding every id with file, location and verbatim quote. New ids added: cg.guid.21 to 26, cg.fr24.12, cg.petition.8, cg.pending.2, cg.grace.1b. A check confirms every id a row cites is in the register |
| The two sets reuse ids for different provisions | law, contract | Applied: extraction 2's ids are not used anywhere; its unique provisions carry register ids (for example its cg.end.4 is cg.pending.2) |
| Rows use fields the pack does not declare (cap_basis, i20 dates, still_pending) | contract, boundary | Applied: SPEC 6 declares cap_basis, fiscal_year, filed, receipt, approved_on, outcome_on_from, cos_granted, cos_ended_how, a capgap_i20 record kind, trip.admitted_as, address_change, fact f2_dependent. still_pending is now a reconfirmation (contract C9), not a field |
| Base fixtures (BASE-OPT, H-STD) not given | contract | Applied: matrix.json bases hold them as literal records |
| Verdicts stated without completeness statements | contract | Applied: bases state every list whole; convention says the test clears non-cap-gap reasons, and the engine run on BASE-OPT (probe, 2026-09-30) showed many unrelated reasons, so verdicts are pinned for the cap-gap part |
| Pending or approved status taken on trust | law, boundary, contract | Applied: currency is question 4 of the design; confirmation current.<h> with an engine max age (founder F1); re-asked after the petitioner job ends (g5.14, g6.38) |
| The I-20 treated as closing the legal terms | law, boundary, contract | Applied, changed. The I-20 no longer closes the advanced-degree question, the start condition, or anything a record fact contradicts. It is shown as a document ("as your Form I-20 shows"). For a regular-cap petition with clean record checks and a current status, the stage is dated and the unjudgeable terms (timely, nonfrivolous, part 248) become standing words that USCIS decides them. Reason: SEVP names the I-20 as proof of entitlement (9.2.1), and a failure of those terms reaches the record only as a rejection or denial, which (B) already handles. Keeping a step back on every pending petition would rebuild the wall the user asked to remove. Founder F2 |
| Start day computed and called a match to guidance | law, boundary, contract | Applied: the start is card_end plus 1 as Duly's reading (the card covers through card_end on its own grant), status guidance, reading=true, citing both 9.1 and 9.1.4 wordings. A status-only start is never dated |
| End day handled differently across rows | law, boundary, contract | Applied: one convention (SPEC 2). April 1 and the H-1B start: last covered day is the day before (2024 and 2016 preamble words), reading. Event day ("upon"): unsettled; counts run through the day before; cap_gap.end_day steps back when that day changes an at-or-over result or a work day falls on it |
| rule_end shown as a point date for a pending petition | law, boundary, contract | Applied: cap_gap.rule_end is a bound ("no later than"), with words naming the earlier endings (contract C7) |
| Fiscal year derived from requested_start | boundary | Applied: new field fiscal_year from the selection notice; a start outside it gives cap_gap.start_condition (g6.10b); missing is asked (g6.10c) |
| Rule row keyed to requested_start, not filed_on | contract | Applied: contract C2 rule_as_of; pair g6.09a and g6.09b |
| Conditional end members cannot be expressed (missing outcome_on silently gives April 1) | contract | Applied: contract C1 |
| No way to ask a field when a condition holds | contract | Applied: contract C3 required_when |
| Checks have no way to null items | contract | Applied: contract C4 |
| Stages carry no status, reading or end-day flag | contract | Applied: contract C5 and C6 |
| No construct for a standalone computed date | contract | Applied: contract C7 path.dates |
| category_not_covered:h1b has no construct | contract | Applied: contract C10 path.exits (verified: engine raises it only when case.categories lists h1b) |
| Regime not carried; stale regime not expressible | law, boundary, contract | Applied: contract C8 recheck_on and stale:regime.<id>; every cap-gap stage carries operative; g1.14a and g1.14b |
| Petition not grows_with_time | contract | Applied: pack change; g6.24 |
| Point 19's "every other journey unchanged" now false | contract | Applied: SPEC 3 says so; SPEC 10 lists J12, J13, J14, J19 changes |
| Unemployment in cap-gap computed as settled | law, boundary | Applied: tagged guidance and reading everywhere; a step back only when a limit is reached (g5.02, g5.03b) or the end day decides it (g5.05) |

## B. Row by row

### g1

- g1.01. Work ran past the card in BASE-OPT (boundary, contract): applied, w1 now ends 2026-05-31; verdict pinned from an engine probe (record.ends_before_today). Ambiguous ids (law): applied through the register.
- g1.02. Completeness question said H-1B only (boundary): applied, label covers every petition of any kind. grows_with_time (contract): applied, g6.24.
- g1.03 vs g1.04 inconsistency (law, boundary, contract): applied. Both compute the ordinary grace; the judgement covers only what follows while pending. Checked: a start of 2026-10-01 cannot fall inside a grace ending 2026-07-30 ((h)(9)(ii)(A)/(B)). Twin g1.03b added for a start inside the grace.
- g1.03 words stated a reading as rule and said "F-1 time", "An H-1B petition" (boundary, contract): applied, new words say duration of status and "which Duly reads as the yearly cap".
- g1.04 cap_subject no taken as final; no advanced-degree choice (boundary): applied, changed. cap_subject stays (existing journeys use it) with a clearer label, and cap_basis is asked when yes. "no" still gives no extension, because the regulation's gate is 214(g)(1)(A) and the person answered that the petition is not under the cap.
- g1.05 rule_end shown while cap_subject unsure; no conditional construct (contract): applied, rule_end null until cap_subject yes and cap_basis regular.
- g1.06, g1.07 I-20 closes advanced-degree (law, boundary, contract): applied, it does not (g1.07 stays talk_to_dso).
- g1.07 stale pending, start mismatch, count id, counts from guidance (all lenses): applied (currency confirmation in BASE-CG; start reading; unemployment.opt_card.a1 over the card and cap-gap, tagged).
- g1.08 change_of_status no may hide a consular switch (boundary): applied, label asks about the filing; twin g1.08b with cos_ended_on and consular_only. Pack words with no item (contract): applied, words live in rule capgap.requires_cos.
- g1.09 only change_of_status asked (contract): applied through required_when; outcome asked in g3.11.
- g1.10 two inputs in one row (contract): applied, split g1.10a and g1.10b.
- g1.11 rows unconditioned "settled" rule row (law): applied, the rule-row choice by filed_on is tagged a reading (capgap.rule_row_by_filed_on).
- g1.12 described as a conflict with the rule (boundary, contract) and SITS quote implying a cause (contract): applied, cap_gap.i20_earlier (judgement), both dates quoted with cg.fr24.3, no cause stated. Later-than-bound case split to g1.12b as a conflict.
- g1.13 contradictory facts (still_pending with approved), approval currency, end day, terms closure (all lenses): applied. Currency is a reconfirm of whatever the outcome is; the end day is the H-1B start excluded, reading; terms as in section A. Companion rows g3.02 to g3.04.
- g1.14 said no litigation reason under a changed order (law, boundary, contract): applied, g1.14a raises cap_gap.regime_transition; g1.14b stale regime.

### g2

- g2.01 wrong provision (2016 text governs a 2020 petition) (law, boundary): applied, cites cg.hist.2 and cg.fr24.2; outputs unchanged. Selector grammar note (contract): the existing petition_may_extend_* anchors already encode the if-else; kept.
- g2.02 F-1 end on H-1B start applied outside its source; revocation not checked; items nulled with no reason (law, boundary, contract): applied, changed. The card stage ends at the validity start as a reading with conditional words ("if the approval is withdrawn or revoked, the card dates apply") and a current confirmation; the H-1B start is an upcoming item, not a null. On or after the start, h1b_began_on is asked (required_when with today, C3).
- g2.03 rule_end as the end; receipt day; outcome not asked; guidance conflict (law, boundary, contract): applied. rule_end is a bound; words name the receipt day and quote 9.1.2 and 9.2.2 as conflicting. Card items stand on the card's grant while pending (not nulled), with the petition start as upcoming: nulling them would be the wall and they are true as of today.
- g2.04 dated stage and no_open_items for a future-dated card (law, boundary, contract): applied, now a step back (opt_not_running_at_filing); the I-20 is shown but does not close it.
- g2.05 guidance for the wrong facts; over-caution on work and grace start (law, boundary, contract): applied. Quotes 9.1 (cg.guid.2); "no work" cites the regulation; grace start 2026-05-16 shown, only its end null; twin g2.05b without complete.authorization.
- g2.06 under-specified; no program (contract, boundary): applied, full facts, asks a1.decision, words "the record shows the application pending on the filing day".
- g2.07 work record past card end not handled (contract): applied, twin g6.36.
- g2.08 relied on unstated completeness; no (f)(10)(ii)(D) rule; words near a conclusion (contract): applied. Bases state program, move and others whole; new rule opt.post_completion_ds_end_days (litigated, ds_2012 only, verified absent from the 2026-09-15 text); words state the rule and two dates only.
- g2.09 no pair across the line; filed versus receipt (boundary, contract): applied, g2.08b (filed 2026-07-31), g2.09b (filed 07-30, received 08-03, filing_day_unsettled), g2.09c (receipt missing, asked).
- g2.10 closed row quoted the 2008 text; start from guidance; 14 months; undeclared fields; ends_before_today (law, boundary, contract): applied. The 10-01 row is split into 2008 and 2016 rows; start reading; 14-month reading note; fields declared. The row's record is wholly past with an exit to H-1B, so ends_before_today does not arise once the exit is recorded.
- g2.11 ambiguous facts; grace over-nulled (law, boundary, contract): applied, split g2.11a and g2.11b; grace computed. Also fixed a (J) violation in the draft facts (filed 2024-04-01 for 2024-11-15 was more than 6 months before), now filed 2024-05-20.
- g2.12 impossible facts (law, boundary, contract): applied. g2.12a is the realistic transition (FY2025 petition pending on 2025-01-17); g2.12b keeps the impossible dates and expects a dates conflict under (h)(2)(i)(J).
- g2.13 I-20 cannot resolve the cross-reference; (J) plainly broken; rule_end misleading (law, boundary, contract): applied. (J) conflict first, then start_condition; rule_end a bound; I-20 does not close it.
- g2.14 paraphrase shown as quote; no "not filed yet" answer (law, boundary, contract): applied. New field filed (yes, not_yet, not_sure); verbatim quotes of cg.fr24.6 and (h)(8)(iii)(A)(4); Duly's summary marked a reading; g2.14a to c.

### g3

- g3.01 end conflicts with I-20; no-grace claim; start untagged; counts untagged; missing cap_basis on siblings (all lenses): applied. The I-20 predates the approval and is compared only with the bound as it stood; no-grace rests on capgap.status_ends_on_h1b_start (guidance, reading) with conditional words; start and counts tagged. Every fixture that expects a dated cap-gap now carries cap_basis regular. Twin g3.01b without the I-20.
- g3.02 end stated as fixed while H-1B start unknown (law, boundary, contract): applied, end null and state unknown until h1b_began_on; rule_end shown as the bound.
- g3.04 invented contradiction; future date in fixture; hint not in contract (law, contract): applied. Label defines the field as the day status took effect; today moved to 2026-10-20; standard conflict flow; the hint lives in the question's rule words.
- g3.05 fixture not inlined; conditions not visibly the DSO's; words missed (B) events and travel (law, boundary, contract): applied, BASE-CG literal; standing words; stage words quote (B) whole and carry the travel rule's words. Twin without the I-20 is g1.11.
- g3.06 impossible fixture; after-April count; ends_before_today (law, contract): applied, new fixture (program end 2024-12-13, card 2025-01-15 to 2026-01-14), counts through 2026-03-31 under the end-day convention.
- g3.07 wrong provision; gap start day; two todays; filing outside window (law, boundary, contract): applied. One clock (2027-02-15); filed 2026-11-05 for a start of 2027-05-10 so (J) holds; gap bounds as computed items (C7) with reading; cg.fr24.8 removed.
- g3.08 "any start qualifies" stated as settled; timeliness (law, contract): applied, changed. The row now says (J) holds on the entered dates, so no reading of the broken cross-reference fails. Timeliness remains in the standing words (not a step back) for the reason in section A.
- g3.09 impossible fixture, no today, no i20 issued day (law, contract): applied, new fixture and clock.
- g3.10 over-caution suggestion (boundary): not applied. The stage stays unknown with the end null: the validity start can move by an RFE ((h)(9)(ii)(D)(1)), and 22b says a null end is unknown.
- g3.11 self-contradictory fixture (boundary): applied, the confirmation is removed with the outcome.
- g3.12 staleness not expressible; nulls incomplete (boundary, contract): applied, contract C9; unemployment also nulled.
- g3.13, g3.04 nulled too little (boundary): applied, stage end null as well.
- g3.14 F-1 stages ran to the H-1B start; cap_basis missing (law, boundary, contract): applied, stages end at the October 1 bound; the later span is only the judgement's words.
- Missing coverage for g3 (contract): applied through groups g5 and g6.

### g4

- g4.01 end day treated as covered; 2024 preamble missing; ids (law, boundary, contract): applied, cap_gap.end_day for the work on the denial day; grace words cite the 2008, 2010 (chart and 9.1.4) and 2024 sources; ids fixed (unemployment.opt_card.a1, no grace.h1).
- g4.02 rejected petition dated as settled; work after the end unflagged; conflict with J13's variant (law, boundary, contract): applied, rejected_filing judgement, work.outside_span on w1 (the existing "days outside every span" check; its id is whatever the engine names it, written here as work.outside_span.<w>).
- g4.03 change report dropped; grace source said missing; withdrawal date basis; card link (law, boundary, contract): applied. The change and interruption reports are named nulls under stem_duties; grace words cite the 2016 withdrawal sentence; outcome_on_from records the basis; the cap-gap stage is keyed to the card it extends (SPEC 8.3, g6.29).
- g4.04 work after revocation; outcome_on basis; approval date lost (boundary, contract): applied, work.outside_span; outcome_on_from; approved_on field. g4.04b for a learned-day answer.
- g4.05 no-revival stated as settled; no today (law, boundary): applied, cap_gap.revoked_after_start step back; today 2027-03-01.
- g4.06 contradictory facts; wrong citation (law, boundary, contract): applied. g4.06 follows J14's order (change of status withdrawn before approval); g4.06b is the after-approval case as a step back; cg.petition.4 dropped; cos_ended_how and cos_granted added.
- g4.07 grace judgement omitted (law, boundary): applied.
- g4.08 grace dated with no_open_items; no work; per-topic verdict (law, boundary, contract): applied in part. Work and completeness added; verdict is whole-case; alternates follow point 9. The step back on the grace itself is not applied: (B) terminates "the automatic extension", which never began while the card ran; the 2008 preamble sentence and the 2010 chart both sit in text about the extension (checked: the 2008 sentence follows "an automatic extension of status and employment authorization for F-1 students with pending H-1B petitions"; the chart is headed "Events Impacting the Length of the Cap Gap Extension"). The grace is shown as a reading. Founder F4.
- g4.09 work past April 1; end day; preamble arithmetic (boundary): applied, fixture ends work 2026-03-31; words give the two facts without a computed date.
- g4.10 wrong provisions; timeliness; e2 undefined; rule_end for h2 (law, boundary, contract): applied, filed_after_extension_ended, e2 added, no rule_end for h2; g4.10b quotes (G) whole for the same employer.
- g4.11 over-caution (boundary): not applied beyond labelling rule_end as a bound: the regulation names "the H-1B petition" and no source says which governs.
- g4.12 trigger and partial quote of (G) (law, boundary, contract): applied, (G) quoted whole; "fiscal year" in (G) described as the year of filing and undefined.
- g4.13 prior counting; verdict stated alone (law, boundary): applied, changed. same_as g3.01. The (h)(8)(ii)(F)(5) text (checked) is about cap-exempt employment ceasing, so it does not settle prior counting; a record showing H-1B status actually began under an older petition gets cap_gap.prior_h1b (g6.19). A denied or unused old petition does not.
- g4.10 to g4.13 fixtures not inlined (contract): applied through named bases.

### g5

- g5.01 id not in register; guidance tag (law, boundary): applied, cg.sits.3 is in the register; count tagged guidance and reading; w1 start moved so the card count is 40.
- g5.02 (C) misread; 90 versus more than 90; split stage (law, boundary, contract): applied, changed. Words cite (f)(10)(ii)(E) and (C) as a condition to obtain; day 90 and day 91 both named; the whole stage is unknown (no split construct was added; a split is not needed to be safe).
- g5.03 90 versus 150 mis-framed; conflicts with the pack reading (law, boundary, contract): applied, changed. Checked 1004-03 section 2: it gave a STEM student in cap-gap the STEM total of its day, so the pack's 150 reading follows the guidance's structure. Kept 150, no step back below it; g5.03b reaches 150.
- g5.04 inconsistent tags; third reading (law): applied, one tag; words say every reading stays below. Value corrected to 80.
- g5.05 draft text; wrong facts; wrong legal threshold (law, boundary, contract): applied, rewritten: 88 on the card plus one day, the event day moves 89 to 90 (Duly's flag), and the words state the regulation's "more than 90".
- g5.06 abandonment not raised (boundary): applied, g5.06b raises capgap.trip_while_pending with the purpose question; the stage is nulled when the trip list is not whole.
- g5.07 wrong id; readmission basis; unemployment (law, boundary, contract): applied, trip.admitted_as asked; unemployment nulled; consequence sentence quoted.
- g5.08 dates stand without readmission facts; leave days (law, boundary, contract): applied, admitted_as and cos_granted in the facts; trip-day count follows the existing pack rule with a reading tag; step back on the preamble conditions.
- g5.09 card items after the start; unemployment; readmission (law, boundary, contract): applied, changed. Card items stand (the card's grant) with the petition start as upcoming; admitted_as asked; trip-day count per the pack rule.
- g5.10 future dates; window readings; 274a.12 text saved as printed (law, boundary, contract): applied, clock 2027-02-01; both readings of (f)(11)(i)(C) tested; words say 274a.12(b)(6)(iv) is saved as printed in 2016. g5.10b where both readings fail.
- g5.11 list of null items (law): applied.
- g5.12 overdue report ignored; ids; no record for address change (law, boundary, contract): applied, address_change record, report type, rule f1.address_report_days, needs_you when overdue; g5.12b reported in time.
- g5.13 mixed tags; release-date span (law, boundary, contract): applied, g5.13a (transfer, release date, guidance) and g5.13b (change of level: both days shown).
- g5.14 qualifying work concluded; I-983 (law, boundary, contract): applied, the new job's standing waits on the reconfirmation; g5.14b adds the STEM I-983 as a null under stem_duties.
- g5.15 step_back label; F-2 grace mention; no fact (law, boundary, contract): applied, step_back false; fact f2_dependent; words quote (D) and the 2024 preamble's F-2 mention as agency words.
- g5 rows not self-contained (contract): applied through bases.
- Regime not stated in g5 rows (contract): applied by convention (operative ds_2012 on every cap-gap stage) and asserted in g3.01 and g3.05.

## C. Missing items

| Missing item | Row |
|---|---|
| Filed but not receipted, or waitlisted | g6.01 |
| Filing and receipt on either side of the card end | g6.02 |
| Impossible date order; happened date after today; validity start while pending | g6.03, g6.04, g6.05 |
| Point 23a boundary pair on a card | g6.06, g6.07 |
| Point 23a boundary pair on a program grace | g6.08a, g6.08b |
| Rule-row pair on the filing date across 2025-01-17 | g6.09a, g6.09b (realistic start dates chosen so (J) holds) |
| Fiscal-year edge | g6.10a to c (FY entered, mismatched, missing) |
| Realistic transition petition | g2.12a |
| Requested start outside the selection's fiscal year | g6.10b |
| Pending with a late start, still pending past April 1 | g6.11 |
| Approval after the April 1 end | g6.12 |
| RFE moved the validity dates | g6.13 |
| Approved with the approval day missing | g6.14 |
| Change of status not granted at approval; late approval ((h)(9)(ii)(D)(2)) | g6.15a to c |
| Change of status ended before approval (J14 consular variant) | g4.06 |
| Consular path with H-1B begun by entry | g6.17 |
| Several petitions with mixed outcomes | g4.14 |
| Old denied petition that reaches the card, plus a new one | g4.15 |
| Earlier H-1B status used | g6.19 |
| cap_basis missing; petition employer missing | g6.20, g6.21 |
| Approved with requested and validity start both missing; pending with requested start missing | g6.22, g6.23 |
| Completeness stated before a later petition | g6.24. The type-other twin is covered by g1.03 because the list is now of every petition of any kind |
| Student still enrolled at the H-1B start | g6.26 |
| Pre-completion OPT only | g6.27 |
| STEM I-765 pending under the 180-day rule on the filing day | g6.28 |
| STEM card approved during a running cap-gap | g6.29 |
| STEM filed while approved but not started | g6.30 |
| OPT applied for after the H-1B filing | g6.31 |
| Pending petition with a card past April 1 | g6.32 |
| Zero-length cap-gap | g6.33 |
| Today equal to the April 1 end | g6.34. Today equal to validity start and to outcome_on are covered by g3.01 (last covered day) and g3.02 |
| 14-month window | Not a row of its own: shown as a reading on every cap-gap that passes program end plus 14 months (g2.10, g3.06). A step back here would fire on nearly every cap-gap (card end is at most about 14 months after completion). Founder F6 |
| Unemployment over the limit before filing | g6.35 |
| Work in a status-only cap-gap or after the end | g6.36, g4.02, g4.04, g1.08b |
| Unemployment in a status-only cap-gap | g2.07 (counts over the card only) |
| Petitioner is not the current employer | g6.37 |
| Petitioner job ends before the validity start | g6.38 |
| Motion or appeal after a denial | Not a row: no record field for a motion, and adding one is a founder choice. The grace step back (grace.after_cap_gap_outcome) already covers every denied case, and its rule words say a denial ends the extension with no revival in the saved sources (cg.fr24.7). Founder F9 |
| Withdrawal date known only as the day learned | g4.04b |
| Trips: left pending and returned after approval; returned after the validity start; after April 1 while pending; still abroad | g6.41, g6.42, g6.43, g6.44 |
| Regime change inside a running cap-gap or grace | g1.14a, g6.45 |
| I-20 contents: September 30 end; later than the bound; issued before filing; issued day missing; status only | g6.46, g1.12b, g6.47, g6.48, g6.49. "The DSO says SEVIS does not show it" is g1.11 (list whole, no I-20) |
| Proof of work for Form I-9 | Rule capgap.i9_proof words quote cg.ea.5 as agency words; no row, since it adds no date |
| Reporting in cap-gap: I-983 on a new employer, interruption report, address report | g5.14b, g4.03, g5.12 |
| F-2 after a termination | Covered by category_not_covered:f2 (g5.15); the words quote the 2024 preamble's F-2 mention |
| Fees and proclamations | g6.51 pins that nothing is said |
| Cap-gap after a STEM chain filed in grace | g6.52 |
| Status-affecting fact before filing (other than unemployment) | g6.53 (a job with no authorization before the filing day) |
